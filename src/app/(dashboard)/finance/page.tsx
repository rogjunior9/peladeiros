"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency, formatDate, getMonthYear, cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
  Loader2,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  createdBy: {
    name: string;
  };
}

interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export default function FinancePage() {
  const { data: session } = useSession();
  const { toast } = useToast();
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

  useEffect(() => {
    fetchTransactions();
    fetchPaymentsSummary();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Erro ao carregar transacoes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentsSummary = async () => {
    try {
      const paymentsRes = await fetch("/api/payments?status=CONFIRMED");
      const payments = paymentsRes.ok ? await paymentsRes.json() : [];

      const transactionsRes = await fetch("/api/transactions");
      const transactionsData = transactionsRes.ok ? await transactionsRes.json() : [];

      const totalPayments = payments.reduce(
        (acc: number, p: any) => acc + p.amount,
        0
      );

      const totalIncome = transactionsData
        .filter((t: Transaction) => t.type === "INCOME")
        .reduce((acc: number, t: Transaction) => acc + t.amount, 0);

      const totalExpenses = transactionsData
        .filter((t: Transaction) => t.type === "EXPENSE")
        .reduce((acc: number, t: Transaction) => acc + t.amount, 0);

      setSummary({
        totalIncome: totalPayments + totalIncome,
        totalExpenses,
        balance: totalPayments + totalIncome - totalExpenses,
      });
    } catch (error) {
      console.error("Erro ao calcular resumo:", error);
    }
  };

  const handleCreateTransaction = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: formData.date ? new Date(`${formData.date}T12:00:00`).toISOString() : undefined,
          type: transactionType,
        }),
      });

      if (response.ok) {
        toast({
          title: "Transação registrada!",
          className: "bg-zinc-900 border-accent/20 text-white",
        });
        fetchTransactions();
        fetchPaymentsSummary();
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
      } else {
        throw new Error("Erro ao registrar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao registrar transação",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta transação?")) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Transação excluída!",
          className: "bg-zinc-900 border-accent/20 text-white",
        });
        fetchTransactions();
        fetchPaymentsSummary();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir transação",
        variant: "destructive",
      });
    }
  };

  const expenseCategories = [
    "Aluguel do campo",
    "Manutenção",
    "Materiais esportivos",
    "Água/Bebidas",
    "Premiação",
    "Outros",
  ];

  const incomeCategories = [
    "Mensalidade",
    "Diária avulso",
    "Patrocínio",
    "Outros",
  ];

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
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">Financeiro</h1>
          <p className="text-zinc-500 mt-1">Controle de caixa, lucros e despesas</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-black font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(197,160,89,0.2)]">
                <Plus className="h-4 w-4 mr-2" />
                Nova Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-bold uppercase text-accent tracking-tighter">Registrar Lançamento</DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Registre uma entrada ou saída no caixa do grupo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-[10px] tracking-widest font-bold">Tipo de Operação</Label>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={transactionType === "INCOME" ? "default" : "outline"}
                      className={cn(
                        "flex-1 h-12 uppercase tracking-widest font-bold text-xs transition-all",
                        transactionType === "INCOME"
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white border-none"
                          : "border-white/10 text-zinc-500 hover:text-emerald-500"
                      )}
                      onClick={() => setTransactionType("INCOME")}
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Entrada
                    </Button>
                    <Button
                      type="button"
                      variant={transactionType === "EXPENSE" ? "default" : "outline"}
                      className={cn(
                        "flex-1 h-12 uppercase tracking-widest font-bold text-xs transition-all",
                        transactionType === "EXPENSE"
                          ? "bg-rose-500 hover:bg-rose-600 text-white border-none"
                          : "border-white/10 text-zinc-500 hover:text-rose-500"
                      )}
                      onClick={() => setTransactionType("EXPENSE")}
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Saída
                    </Button>
                  </div>
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
                      placeholder="0.00"
                      className="bg-zinc-900 border-white/10 text-white h-12 focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 uppercase text-[10px] tracking-widest font-bold">Data *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="bg-zinc-900 border-white/10 text-white h-12 focus:border-accent [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-[10px] tracking-widest font-bold">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-white/10 text-white h-12">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {(transactionType === "EXPENSE"
                        ? expenseCategories
                        : incomeCategories
                      ).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-[10px] tracking-widest font-bold">Descrição *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Ex: Aluguel do mês de Janeiro"
                    rows={3}
                    className="bg-zinc-900 border-white/10 text-white focus:border-accent resize-none p-4"
                  />
                </div>
              </div>
              <DialogFooter className="pt-6">
                <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-zinc-500 hover:text-white uppercase tracking-widest text-xs">
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateTransaction}
                  disabled={saving || !formData.amount || !formData.description}
                  className={cn(
                    "text-black font-bold uppercase tracking-widest min-w-[140px]",
                    transactionType === "EXPENSE" ? "bg-rose-500 hover:bg-white" : "bg-accent hover:bg-white"
                  )}
                >
                  {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Salvar Lançamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Entradas Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-emerald-400">
              {formatCurrency(summary.totalIncome)}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Lançamentos + Pagamentos</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Saídas Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-rose-400">
              {formatCurrency(summary.totalExpenses)}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Custo operacional acumulado</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Saldo em Caixa</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-display font-bold",
              summary.balance >= 0 ? "text-white" : "text-rose-500"
            )}>
              {formatCurrency(summary.balance)}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Patrimônio líquido disponível</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="bg-zinc-950 border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-zinc-950/50">
          <CardTitle className="text-xl font-display font-bold text-white uppercase tracking-tighter">Histórico de Transações</CardTitle>
          <CardDescription className="text-zinc-500">Listagem detalhada de todos os lançamentos manuais.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full">
            <div className="px-6 py-4 bg-zinc-950/30 border-b border-white/5">
              <TabsList className="bg-black border border-white/5">
                <TabsTrigger value="all" className="uppercase text-[10px] tracking-widest font-bold">Todas</TabsTrigger>
                <TabsTrigger value="INCOME" className="uppercase text-[10px] tracking-widest font-bold">Entradas</TabsTrigger>
                <TabsTrigger value="EXPENSE" className="uppercase text-[10px] tracking-widest font-bold">Saídas</TabsTrigger>
              </TabsList>
            </div>

            {["all", "INCOME", "EXPENSE"].map((tab) => (
              <TabsContent key={tab} value={tab} className="m-0">
                <div className="divide-y divide-white/5">
                  {transactions
                    .filter((t) => tab === "all" || t.type === tab)
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className={cn(
                              "p-3 rounded-xl border transition-all",
                              transaction.type === "INCOME"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                            )}
                          >
                            {transaction.type === "INCOME" ? (
                              <ArrowUpCircle className="h-5 w-5" />
                            ) : (
                              <ArrowDownCircle className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white text-lg group-hover:text-accent transition-colors">{transaction.description}</p>
                            <div className="flex items-center space-x-3 text-xs text-zinc-500 mt-0.5">
                              {transaction.category && (
                                <Badge variant="outline" className="border-white/10 text-zinc-500 uppercase text-[10px] font-bold tracking-widest px-2">{transaction.category}</Badge>
                              )}
                              <span className="text-zinc-700">|</span>
                              <span className="uppercase tracking-widest">{formatDate(transaction.date)}</span>
                              <span className="text-zinc-700">|</span>
                              <span className="text-[10px]">Por: {transaction.createdBy?.name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-8">
                          <p
                            className={cn(
                              "font-mono font-bold text-xl",
                              transaction.type === "INCOME"
                                ? "text-emerald-400"
                                : "text-rose-400"
                            )}
                          >
                            {transaction.type === "INCOME" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </p>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-600 hover:text-rose-500 transition-colors"
                              onClick={() => handleDelete(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                  {transactions.filter((t) => tab === "all" || t.type === tab)
                    .length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                        <TrendingUp className="h-10 w-10 opacity-10 mb-4" />
                        <p className="uppercase tracking-[0.2em] font-light italic">Nenhuma transação encontrada</p>
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
