"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  formatCurrency,
  formatDate,
  formatMonthYear,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  cn,
} from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  QrCode,
  CreditCard,
  Banknote,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  referenceMonth: string | null;
  createdAt: string;
  paidAt: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  game?: {
    title: string;
    date: string;
  } | null;
}

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  category?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  date: string;
  createdBy?: {
    name: string | null;
  };
}

interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

type LaunchItem = {
  id: string;
  kind: "PAYMENT" | "TRANSACTION";
  flow: "INCOME" | "EXPENSE";
  status: string;
  amount: number;
  date: string;
  title: string;
  subtitle: string;
  meta: string;
};

const expenseCategories = [
  "Aluguel da quadra",
  "Bola/colete/material",
  "Água/bebidas",
  "Premiação",
  "Taxas",
  "Outros",
];

const incomeCategories = [
  "Ajuste de caixa",
  "Patrocínio",
  "Outros",
];

export default function FinancePage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category: "",
    date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })(),
  });

  const isAdmin = session?.user?.role === "ADMIN";

  const fetchFinanceData = async () => {
    try {
      const response = await fetch("/api/finance/overview", { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar financeiro");

      const data = await response.json();
      setPayments(data.payments || []);
      setTransactions(data.transactions || []);
      setSummary(data.summary || { totalIncome: 0, totalExpenses: 0, balance: 0 });
    } catch (error) {
      console.error("Erro ao carregar financeiro:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const getPaymentMethodIcon = (method: string) => {
    if (method === "PIX") return <QrCode className="h-5 w-5" />;
    if (method === "CREDIT_CARD") return <CreditCard className="h-5 w-5" />;
    return <Banknote className="h-5 w-5" />;
  };

  const getPaymentStatusIcon = (status: string) => {
    if (status === "CONFIRMED") return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    if (status === "PENDING") return <Clock className="h-4 w-4 text-amber-400" />;
    return <XCircle className="h-4 w-4 text-rose-400" />;
  };

  const getTransactionStatusLabel = (status: string) => {
    if (status === "APPROVED") return "Aprovado";
    if (status === "REJECTED") return "Rejeitado";
    return "Pendente";
  };

  const launches = useMemo<LaunchItem[]>(() => {
    const paymentLaunches: LaunchItem[] = payments.map((payment) => ({
      id: `payment-${payment.id}`,
      kind: "PAYMENT",
      flow: "INCOME",
      status: payment.status,
      amount: payment.amount,
      date: payment.paidAt || payment.createdAt,
      title: payment.user?.name || payment.user?.email || "Jogador",
      subtitle: getPaymentMethodLabel(payment.method),
      meta: payment.game?.title || (payment.referenceMonth ? `Mensalidade ${formatMonthYear(payment.referenceMonth)}` : "Sem referência"),
    }));

    const transactionLaunches: LaunchItem[] = transactions.map((transaction) => ({
      id: `transaction-${transaction.id}`,
      kind: "TRANSACTION",
      flow: transaction.type,
      status: "APPROVED",
      amount: transaction.amount,
      date: transaction.date,
      title: transaction.description,
      subtitle: transaction.category || "Lançamento operacional",
      meta: transaction.createdBy?.name ? `Por ${transaction.createdBy.name}` : "Registro manual",
    }));

    return [...paymentLaunches, ...transactionLaunches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [payments, transactions]);

  const visibleLaunches = useMemo(
    () => (isAdmin ? launches : launches.filter((item) => !(item.kind === "PAYMENT" && item.status === "PENDING"))),
    [isAdmin, launches]
  );

  const launchTabs = isAdmin
    ? (["all", "income", "expense", "pending"] as const)
    : (["all", "income", "expense"] as const);

  const handleCreateTransaction = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: transactionType,
          amount: Number(formData.amount),
          description: formData.description,
          category: formData.category || undefined,
          date: formData.date ? new Date(`${formData.date}T12:00:00`).toISOString() : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Erro ao registrar lançamento");

      toast({
        title: "Lançamento registrado",
        variant: "success",
      });

      setDialogOpen(false);
      setFormData({
        amount: "",
        description: "",
        category: "",
        date: (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })(),
      });

      await fetchFinanceData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao registrar lançamento",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-8 pb-8 md:pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-white/5 pb-4 md:pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white uppercase tracking-tight">Financeiro</h1>
          <p className="text-sm md:text-base text-zinc-500 mt-1">Dashboard financeiro consolidado de pagamentos e caixa</p>
        </div>

        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto bg-accent hover:bg-accent/90 text-black font-bold uppercase tracking-widest">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-bold uppercase text-accent">Novo Lançamento</DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Registre gastos da pelada (quadra, compras) ou ajustes de entrada.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={transactionType === "EXPENSE" ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      transactionType === "EXPENSE"
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "border-zinc-700 text-zinc-300"
                    )}
                    onClick={() => setTransactionType("EXPENSE")}
                  >
                    <ArrowDownCircle className="h-4 w-4 mr-2" /> Saída
                  </Button>
                  <Button
                    type="button"
                    variant={transactionType === "INCOME" ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      transactionType === "INCOME"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-zinc-700 text-zinc-300"
                    )}
                    onClick={() => setTransactionType("INCOME")}
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" /> Entrada
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-zinc-400 uppercase text-[10px] tracking-widest">Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      className="bg-black border-zinc-800 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-400 uppercase text-[10px] tracking-widest">Data</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                      className="bg-black border-zinc-800 text-white [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-zinc-400 uppercase text-[10px] tracking-widest">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-black border-zinc-800 text-white">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                      {(transactionType === "EXPENSE" ? expenseCategories : incomeCategories).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-zinc-400 uppercase text-[10px] tracking-widest">Descrição</Label>
                  <Textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="bg-black border-zinc-800 text-white resize-none"
                    placeholder="Ex: Pagamento da quadra de terça"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-zinc-400">
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateTransaction}
                  disabled={saving || !formData.amount || !formData.description}
                  className="bg-accent text-black hover:bg-accent/90"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-3">
        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Entradas Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl md:text-3xl font-display font-bold text-emerald-400">
              {formatCurrency(summary.totalIncome)}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Pagamentos confirmados + entradas</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Saídas Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl md:text-3xl font-display font-bold text-rose-400">
              {formatCurrency(summary.totalExpenses)}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Custos operacionais</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Saldo em Caixa</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className={cn("text-2xl md:text-3xl font-display font-bold", summary.balance >= 0 ? "text-white" : "text-rose-500")}>
              {formatCurrency(summary.balance)}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Patrimônio líquido disponível</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-950 border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-zinc-950/50">
          <CardTitle className="text-xl font-display font-bold text-white uppercase tracking-tighter">Lançamentos</CardTitle>
          <CardDescription className="text-zinc-500">Pagamentos + movimentações operacionais da pelada.</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full">
            <div className="px-3 md:px-6 py-3 md:py-4 bg-zinc-950/30 border-b border-white/5 overflow-x-auto">
              <TabsList className="bg-black border border-white/5 min-w-max">
                <TabsTrigger value="all" className="uppercase text-[10px] tracking-widest font-bold">Todos</TabsTrigger>
                <TabsTrigger value="income" className="uppercase text-[10px] tracking-widest font-bold">Entradas</TabsTrigger>
                <TabsTrigger value="expense" className="uppercase text-[10px] tracking-widest font-bold">Saídas</TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="pending" className="uppercase text-[10px] tracking-widest font-bold">Pendentes</TabsTrigger>
                )}
              </TabsList>
            </div>

            {launchTabs.map((tab) => (
              <TabsContent key={tab} value={tab} className="m-0">
                <div className="divide-y divide-white/5">
                  {visibleLaunches
                    .filter((item) => {
                      if (tab === "all") return true;
                      if (tab === "income") return item.flow === "INCOME";
                      if (tab === "expense") return item.flow === "EXPENSE";
                      if (tab === "pending") return item.kind === "PAYMENT" && item.status === "PENDING";
                      return true;
                    })
                    .map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between p-3 md:p-6 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start md:items-center gap-3 md:space-x-4">
                          <div className={cn(
                            "p-2.5 md:p-3 rounded-xl border shrink-0",
                            item.flow === "INCOME"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          )}>
                            {item.kind === "PAYMENT" ? getPaymentMethodIcon(item.subtitle === "PIX" ? "PIX" : item.subtitle === "Cartão de Crédito" ? "CREDIT_CARD" : "CASH") : (item.flow === "INCOME" ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />)}
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-white text-lg leading-tight">{item.title}</p>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                              <Badge variant="outline" className="border-white/10 text-zinc-500 uppercase text-[10px] font-bold tracking-widest px-2">
                                {item.kind === "PAYMENT" ? item.subtitle : (item.flow === "INCOME" ? "Entrada" : "Saída")}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-zinc-400 uppercase tracking-wide mt-1 break-words">{item.meta}</p>
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{formatDate(item.date)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            {item.kind === "PAYMENT"
                              ? getPaymentStatusIcon(item.status)
                              : (item.status === "APPROVED" ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : item.status === "REJECTED" ? <XCircle className="h-4 w-4 text-rose-400" /> : <Clock className="h-4 w-4 text-amber-400" />)}
                            <Badge variant="outline" className="border-white/10 text-zinc-300 uppercase text-[9px] md:text-[10px] tracking-widest">
                              {item.kind === "PAYMENT" ? getPaymentStatusLabel(item.status) : getTransactionStatusLabel(item.status)}
                            </Badge>
                          </div>

                          <p className={cn(
                            "font-mono font-bold text-lg md:text-2xl whitespace-nowrap",
                            item.flow === "INCOME" ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {item.flow === "INCOME" ? "+" : "-"}{formatCurrency(item.amount)}
                          </p>
                        </div>
                      </div>
                    ))}

                  {visibleLaunches.filter((item) => {
                    if (tab === "all") return true;
                    if (tab === "income") return item.flow === "INCOME";
                    if (tab === "expense") return item.flow === "EXPENSE";
                    if (tab === "pending") return item.kind === "PAYMENT" && item.status === "PENDING";
                    return true;
                  }).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                      <DollarSign className="h-10 w-10 opacity-10 mb-4" />
                      <p className="uppercase tracking-[0.2em] font-light italic">Nenhum lançamento encontrado</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
