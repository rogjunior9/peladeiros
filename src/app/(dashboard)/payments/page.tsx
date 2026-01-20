"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  formatCurrency,
  formatDate,
  getPaymentStatusLabel,
  getPaymentMethodLabel,
  getMonthYear,
  cn,
} from "@/lib/utils";
import {
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  referenceMonth: string;
  notes: string;
  createdAt: string;
  paidAt: string;
  pixCode?: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
    playerType: string;
  };
  game?: {
    id: string;
    title: string;
    date: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  playerType: string;
}

interface GameSimple {
  id: string;
  title: string;
  date: string;
}

export default function PaymentsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<GameSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [formData, setFormData] = useState({
    userId: "",
    gameId: "none",
    amount: "",
    method: "CASH",
    referenceMonth: getMonthYear(),
    notes: "",
    status: "CONFIRMED",
  });

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetchPayments();
    if (isAdmin) {
      fetchUsers();
      fetchGames();
    }
  }, [isAdmin]);

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/payments");
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Erro ao carregar usuarios:", error);
    }
  };

  const fetchGames = async () => {
    try {
      const response = await fetch("/api/games?upcoming=true");
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error("Erro ao carregar jogos:", error);
    }
  };

  const handleCreatePayment = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        gameId: formData.gameId === "none" ? undefined : formData.gameId,
      };

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Pagamento registrado!",
          className: "bg-zinc-900 border-accent/20 text-white",
        });
        fetchPayments();
        setDialogOpen(false);
        setFormData({
          userId: "",
          gameId: "none",
          amount: "",
          method: "CASH",
          referenceMonth: getMonthYear(),
          notes: "",
          status: "CONFIRMED",
        });
      } else {
        throw new Error("Erro ao registrar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao registrar pagamento",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (paymentId: string, status: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast({
          title: "Status atualizado!",
          className: "bg-zinc-900 border-accent/20 text-white",
        });
        fetchPayments();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <CheckCircle className="h-4 w-4 text-accent" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "PIX":
        return <QrCode className="h-3.5 w-3.5" />;
      case "CREDIT_CARD":
        return <CreditCard className="h-3.5 w-3.5" />;
      case "CASH":
        return <Banknote className="h-3.5 w-3.5" />;
      default:
        return <DollarSign className="h-3.5 w-3.5" />;
    }
  };

  const filteredPayments = payments.filter(
    (p) => statusFilter === "all" || p.status === statusFilter
  );

  const stats = {
    total: payments.reduce((acc, p) => (p.status === "CONFIRMED" ? acc + p.amount : acc), 0),
    pending: payments.filter((p) => p.status === "PENDING").length,
    confirmed: payments.filter((p) => p.status === "CONFIRMED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">Finanças</h1>
          <p className="text-zinc-500 mt-1">Gestão de cobranças e pagamentos</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-black font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(197,160,89,0.2)]">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-bold uppercase text-accent tracking-tighter">Registrar Recebimento</DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Lançamento manual de pagamentos (Dinheiro ou Pix Externo).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-[10px] tracking-widest font-bold">Jogador *</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, userId: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-white/10 text-white h-12">
                      <SelectValue placeholder="Selecione o jogador" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-zinc-400 uppercase text-[10px] tracking-widest font-bold">Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="30.00"
                      className="bg-zinc-900 border-white/10 text-white h-12 focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 uppercase text-[10px] tracking-widest font-bold">Pelada (Opcional)</Label>
                    <Select
                      value={formData.gameId}
                      onValueChange={(value) => setFormData({ ...formData, gameId: value })}
                    >
                      <SelectTrigger className="bg-zinc-900 border-white/10 text-white h-12">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="none">Nenhuma (Mensal/Outro)</SelectItem>
                        {games.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {formatDate(g.date)} - {g.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.gameId === "none" && (
                  <div className="space-y-2">
                    <Label className="text-zinc-400 uppercase text-[10px] tracking-widest font-bold">Mes de Referencia</Label>
                    <Input
                      type="month"
                      value={formData.referenceMonth}
                      onChange={(e) =>
                        setFormData({ ...formData, referenceMonth: e.target.value })
                      }
                      className="bg-zinc-900 border-white/10 text-white h-12 focus:border-accent"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-[10px] tracking-widest font-bold">Observacoes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Observacoes opcionais"
                    className="bg-zinc-900 border-white/10 text-white h-12 focus:border-accent"
                  />
                </div>
              </div>
              <DialogFooter className="pt-6">
                <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-zinc-500 hover:text-white uppercase tracking-widest text-xs">
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={saving || !formData.userId || !formData.amount}
                  className="bg-accent hover:bg-white text-black font-bold uppercase tracking-widest"
                >
                  {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Confirmar Recebimento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Saldo Recebido</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">{formatCurrency(stats.total)}</div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Acumulado bruto confirmado</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cobranças Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-yellow-500">{stats.pending}</div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Aguardando confirmação manual ou pix</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sucesso (Total)</CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">{stats.confirmed}</div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Pagamentos validados com sucesso</p>
          </CardContent>
        </Card>
      </div>

      {/* Main List */}
      <Card className="bg-zinc-950 border-white/5 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5">
          <CardTitle className="text-xl font-display font-bold text-white uppercase tracking-tighter">Histórico de Cobranças</CardTitle>
          <div className="flex items-center space-x-3">
            <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest hidden sm:block">Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-black border-white/10 text-white h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="CONFIRMED">Confirmados</SelectItem>
                <SelectItem value="CANCELLED">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border border-white/10 shadow-xl">
                      <AvatarImage src={payment.user?.image} />
                      <AvatarFallback className="bg-zinc-900 text-zinc-500 font-bold">
                        {payment.user?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-white/10">
                      {getStatusIcon(payment.status)}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg group-hover:text-accent transition-colors">{payment.user?.name || "Jogador"}</p>
                    <div className="flex items-center space-x-3 text-xs text-zinc-500 mt-0.5">
                      <div className="flex items-center">
                        <span className="p-1 rounded bg-zinc-900 mr-1.5">{getMethodIcon(payment.method)}</span>
                        <span className="uppercase tracking-widest">{getPaymentMethodLabel(payment.method)}</span>
                      </div>
                      {payment.referenceMonth && (
                        <span className="text-zinc-700">| REF: <span className="text-zinc-400">{payment.referenceMonth}</span></span>
                      )}
                    </div>
                    {payment.game && (
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1.5 flex items-center">
                        <span className="w-1.5 h-1.5 bg-accent/30 rounded-full mr-2" />
                        Pelada: {payment.game.title} ({formatDate(payment.game.date)})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-8">
                  <div className="text-right">
                    <p className="font-mono font-bold text-xl text-white">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-1">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      className={cn(
                        "uppercase text-[10px] font-bold tracking-widest px-2.5 py-0.5 border-none",
                        payment.status === "CONFIRMED" ? "bg-accent/10 text-accent shadow-[0_0_10px_rgba(197,160,89,0.2)]" :
                          payment.status === "PENDING" ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                      )}
                    >
                      {getPaymentStatusLabel(payment.status)}
                    </Badge>

                    {isAdmin && payment.status === "PENDING" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(payment.id, "CONFIRMED")}
                        className="bg-black border border-accent/30 hover:border-accent text-accent hover:text-white h-7 text-[10px] font-bold uppercase tracking-tighter"
                      >
                        Validar Manual
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredPayments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <Plus className="h-10 w-10 opacity-10 mb-4" />
                <p className="uppercase tracking-[0.2em] font-light italic">Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
