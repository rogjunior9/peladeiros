"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, CalendarDays, Wallet, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserStatus {
  id: string;
  name: string;
  email: string;
  playerType: string;
  image: string | null;
  payments: Array<{
    id: string;
    status: string;
    amount: number;
    paidAt: string | null;
  }>;
}

const getMonthOptions = () => {
  const options = [];
  const today = new Date();
  for (let i = -12; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("pt-BR", { month: "long", year: "numeric" });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options.reverse();
};

export function MonthlyChargePanel() {
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyFeeAmount, setMonthlyFeeAmount] = useState(60);
  const [savingManualByUserId, setSavingManualByUserId] = useState<string | null>(null);
  const [generatingUserChargeByUserId, setGeneratingUserChargeByUserId] = useState<string | null>(null);
  const [cpfDialogOpen, setCpfDialogOpen] = useState(false);
  const [cpfValue, setCpfValue] = useState("");
  const [cpfSaving, setCpfSaving] = useState(false);
  const [pendingChargeUser, setPendingChargeUser] = useState<UserStatus | null>(null);
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixView, setPixView] = useState<{ name: string; amount: number; pixCode: string; pixQrCode?: string | null; phone?: string | null } | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/monthly-status?month=${selectedMonth}`);
      if (res.ok) setUsers(await res.json());
    } catch {
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data?.monthlyFee === "number" && data.monthlyFee > 0) {
          setMonthlyFeeAmount(data.monthlyFee);
        }
      } catch {
        // ignore
      }
    };
    loadSettings();
  }, []);

  const updateUserType = async (userId: string, newType: string) => {
    setUsers((currentUsers) => currentUsers.map((u) => (u.id === userId ? { ...u, playerType: newType } : u)));
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerType: newType }),
      });
      if (!res.ok) throw new Error();
      await loadData();
    } catch {
      toast({ title: "Erro ao atualizar tipo", variant: "destructive" });
      loadData();
    }
  };

  const handleGenerateValues = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/finance/monthly-charge", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao gerar");
      toast({ title: "Cobranças geradas", description: `Enviado para ${data.messagesSent} mensalistas.`, variant: "success" });
      await loadData();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao gerar", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleManualMarkPaid = async (userId: string) => {
    setSavingManualByUserId(userId);
    try {
      const response = await fetch("/api/finance/monthly-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, month: selectedMonth, amount: monthlyFeeAmount, method: "CASH" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Falha ao registrar pagamento manual");
      toast({ title: "Mensalidade confirmada", variant: "success" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao marcar como pago", variant: "destructive" });
    } finally {
      setSavingManualByUserId(null);
    }
  };

  const generateUserCharge = async (user: UserStatus, canPromptCpf = true) => {
    setGeneratingUserChargeByUserId(user.id);
    try {
      const response = await fetch("/api/finance/monthly-charge-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, month: selectedMonth }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Falha ao gerar cobrança");

      const pixCode = typeof data?.payment?.pixCode === "string" ? data.payment.pixCode : "";
      const pixQrCode = typeof data?.payment?.pixQrCode === "string" ? data.payment.pixQrCode : "";
      const amount = typeof data?.payment?.amount === "number" ? data.payment.amount : monthlyFeeAmount;
      const phone = typeof data?.user?.phone === "string" ? data.user.phone : null;
      if (pixCode) {
        setPixView({ name: user.name, amount, pixCode, pixQrCode, phone });
        setPixDialogOpen(true);
      }
      toast({ title: "Cobrança gerada", description: `PIX pendente criado para ${user.name}.`, variant: "success" });
      await loadData();
    } catch (error: any) {
      const message = error.message || "Falha ao gerar cobrança";
      if (canPromptCpf && /cpf/i.test(message)) {
        setPendingChargeUser(user);
        setCpfValue("");
        setCpfDialogOpen(true);
        return;
      }
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setGeneratingUserChargeByUserId(null);
    }
  };

  const handleSaveCpfAndRetry = async () => {
    if (!pendingChargeUser) return;
    const digits = cpfValue.replace(/\D/g, "");
    if (digits.length !== 11) {
      toast({ title: "CPF inválido", description: "Informe um CPF com 11 dígitos.", variant: "destructive" });
      return;
    }

    setCpfSaving(true);
    try {
      const response = await fetch(`/api/users/${pendingChargeUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: digits }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Falha ao salvar CPF");

      setCpfDialogOpen(false);
      await loadData();
      await generateUserCharge(pendingChargeUser, false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar CPF", variant: "destructive" });
    } finally {
      setCpfSaving(false);
    }
  };

  const copyPixCode = async () => {
    if (!pixView?.pixCode) return;
    try {
      await navigator.clipboard.writeText(pixView.pixCode);
      toast({ title: "PIX copiado", variant: "success" });
    } catch {
      toast({ title: "Erro ao copiar PIX", variant: "destructive" });
    }
  };

  const openWhatsAppWithPix = () => {
    const rawPhone = pixView?.phone || "";
    const digits = rawPhone.replace(/\D/g, "");
    if (!digits) {
      toast({ title: "Jogador sem telefone cadastrado", variant: "destructive" });
      return;
    }

    const brPhone = digits.startsWith("55") ? digits : `55${digits}`;
    const value = (pixView?.amount || 0).toFixed(2).replace(".", ",");
    const message = [
      `Olá, ${pixView?.name || "jogador"}!`,
      `Segue sua cobrança mensal: R$ ${value}.`,
      "",
      "Chave/Pagamento PIX (copia e cola):",
      pixView?.pixCode || "",
      "",
      "Assim que pagar, me envia o comprovante por favor.",
    ].join("\n");

    const url = `https://wa.me/${brPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const getStatusBadge = (user: UserStatus) => {
    if (user.playerType === "GOALKEEPER") {
      return <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/50">Isento</Badge>;
    }
    const payment = user.payments[0];
    if (!payment) return <Badge variant="outline" className="text-slate-600 border-zinc-800">Não Gerado</Badge>;
    if (payment.status === "CONFIRMED") return <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/50">Pago</Badge>;
    if (payment.status === "PENDING") return <Badge className="bg-amber-500/15 text-accent border border-amber-500/50">Pendente</Badge>;
    return <Badge variant="secondary">{payment.status}</Badge>;
  };

  const monthlyUsers = users.filter((u) => u.playerType === "MONTHLY");
  const pendingMonthlyUsers = monthlyUsers.filter((u) => !u.payments[0] || u.payments[0].status !== "CONFIRMED");
  const monthlyCount = monthlyUsers.length;
  const pendingCount = pendingMonthlyUsers.length;
  const monthOptions = getMonthOptions();

  const renderRows = (list: UserStatus[]) => (
    <div className="overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader className="bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-sm">
          <TableRow className="border-zinc-800/50 hover:bg-transparent">
            <TableHead className="text-zinc-400 pl-6">Jogador</TableHead>
            <TableHead className="text-zinc-400">Tipo</TableHead>
            <TableHead className="text-zinc-400">Status Mês</TableHead>
            <TableHead className="text-zinc-400 text-right pr-6">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((user) => {
            const payment = user.payments[0];
            const isMonthly = user.playerType === "MONTHLY";
            const isPaid = payment?.status === "CONFIRMED";
            return (
              <TableRow key={user.id} className="border-zinc-800/30 hover:bg-zinc-900/40 transition-colors">
                <TableCell className="font-medium flex items-center gap-3 pl-6">
                  <Avatar className="h-9 w-9 border border-zinc-800">
                    <AvatarImage src={user.image || ""} />
                    <AvatarFallback className="bg-zinc-900 text-accent">{user.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-zinc-200">{user.name}</span>
                </TableCell>
                <TableCell>
                  <Select value={user.playerType || "CASUAL"} onValueChange={(v) => updateUserType(user.id, v)}>
                    <SelectTrigger className={`w-[130px] h-8 border-zinc-800 text-xs ${user.playerType === "MONTHLY" ? "bg-amber-950/20 text-accent border-amber-900/50" : user.playerType === "GOALKEEPER" ? "bg-indigo-950/20 text-indigo-400 border-indigo-900/50" : "bg-zinc-900 text-zinc-400"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      <SelectItem value="MONTHLY" className="text-accent">Mensalista</SelectItem>
                      <SelectItem value="CASUAL">Avulso</SelectItem>
                      <SelectItem value="GOALKEEPER" className="text-indigo-400">Goleiro</SelectItem>
                      <SelectItem value="GUEST">Convidado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{getStatusBadge(user)}</TableCell>
                <TableCell className="pr-6">
                  {isMonthly ? (
                    <div className="flex justify-end gap-2">
                      {!isPaid && (
                        <>
                          <Button size="sm" variant="outline" className="h-8 border-amber-900 text-amber-400 text-xs uppercase tracking-wider" disabled={savingManualByUserId === user.id} onClick={() => handleManualMarkPaid(user.id)}>
                            {savingManualByUserId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Marcar Pago"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 border-blue-900 text-blue-400 text-xs uppercase tracking-wider" disabled={generatingUserChargeByUserId === user.id} onClick={() => generateUserCharge(user, true)}>
                            {generatingUserChargeByUserId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Gerar Cobrança"}
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-right text-[10px] uppercase tracking-widest text-slate-600">-</div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className="bg-zinc-950 border border-white/5 ring-1 ring-accent/20">
      <CardHeader className="bg-accent/5 border-b border-white/5 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-white font-display uppercase tracking-wide text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-accent" /> Gestão de Mensalidades
            </CardTitle>
            <CardDescription className="text-zinc-500">Gerencie pagamentos e status dos mensalistas.</CardDescription>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800/50">
            <div className="px-2 text-zinc-500"><CalendarDays className="h-4 w-4" /></div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] border-0 bg-transparent text-zinc-200 focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-h-[300px]">
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <span className="text-zinc-500 text-sm">Carregando dados financeiros...</span>
          </div>
        ) : (
          <Tabs defaultValue="monthly" className="w-full">
            <div className="px-3 md:px-6 py-3 border-b border-zinc-900/60 bg-zinc-950/80 overflow-x-auto">
              <TabsList className="bg-zinc-900/70 border border-zinc-800">
                <TabsTrigger value="monthly" className="uppercase text-[10px] tracking-widest font-bold">Mensalistas</TabsTrigger>
                <TabsTrigger value="pending" className="uppercase text-[10px] tracking-widest font-bold">Pendentes</TabsTrigger>
                <TabsTrigger value="all" className="uppercase text-[10px] tracking-widest font-bold">Todos</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="monthly" className="m-0">{renderRows(monthlyUsers)}</TabsContent>
            <TabsContent value="pending" className="m-0">{renderRows(pendingMonthlyUsers)}</TabsContent>
            <TabsContent value="all" className="m-0">{renderRows(users)}</TabsContent>
          </Tabs>
        )}

        <div className="bg-zinc-900/50 p-4 border-t border-zinc-900 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <div className="text-sm text-zinc-500 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/5 border border-amber-500/10 rounded-md">
              <span className="font-bold text-accent">{monthlyCount}</span>
              <span className="text-accent/70 text-xs uppercase tracking-wide">Mensalistas</span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/5 border border-red-500/10 rounded-md">
                <span className="font-bold text-red-500">{pendingCount}</span>
                <span className="text-red-500/70 text-xs uppercase tracking-wide">Pendentes</span>
              </div>
            )}
          </div>

          <Button onClick={handleGenerateValues} disabled={generating || loading || pendingCount === 0} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-zinc-950 font-semibold">
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando</> : <><RefreshCw className="mr-2 h-4 w-4" /> Gerar Cobranças</>}
          </Button>
        </div>
      </CardContent>

      <Dialog open={cpfDialogOpen} onOpenChange={setCpfDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">CPF obrigatório</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Para gerar cobrança no PagSeguro, informe o CPF de {pendingChargeUser?.name || "jogador"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500">CPF (11 dígitos)</label>
            <Input value={cpfValue} onChange={(e) => setCpfValue(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="00000000000" className="bg-zinc-900 border-zinc-800 text-white" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCpfDialogOpen(false)} className="hover:bg-zinc-800">Cancelar</Button>
            <Button onClick={handleSaveCpfAndRetry} disabled={cpfSaving} className="bg-accent hover:bg-accent/90 text-zinc-950">
              {cpfSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar e Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pixDialogOpen} onOpenChange={setPixDialogOpen}>
        <DialogContent className="max-w-xl bg-zinc-950 border-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">PIX gerado</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {pixView?.name ? `Cobrança criada para ${pixView.name}.` : "Cobrança criada com sucesso."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Valor</div>
            <div className="text-xl font-bold text-accent">R$ {(pixView?.amount || 0).toFixed(2).replace(".", ",")}</div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 pt-2">PIX copia e cola</div>
            <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs break-all text-zinc-300">
              {pixView?.pixCode || "Código PIX não disponível"}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPixDialogOpen(false)} className="hover:bg-zinc-800">
              Fechar
            </Button>
            {pixView?.pixQrCode ? (
              <Button
                variant="outline"
                onClick={() => window.open(pixView.pixQrCode || "", "_blank")}
                className="border-blue-900 text-blue-400"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir QR
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={openWhatsAppWithPix}
              disabled={!pixView?.phone}
              className="border-emerald-900 text-emerald-400 disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar WhatsApp
            </Button>
            <Button onClick={copyPixCode} className="bg-accent hover:bg-accent/90 text-zinc-950">
              <Copy className="h-4 w-4 mr-2" />
              Copiar PIX
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
