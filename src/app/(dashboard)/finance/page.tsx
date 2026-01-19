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
import { formatCurrency, formatDate, getMonthYear } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
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
    date: new Date().toISOString().split("T")[0],
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
      // Get confirmed payments (income)
      const paymentsRes = await fetch("/api/payments?status=CONFIRMED");
      const payments = paymentsRes.ok ? await paymentsRes.json() : [];

      // Get transactions
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
          type: transactionType,
        }),
      });

      if (response.ok) {
        toast({
          title: "Transacao registrada!",
          variant: "success",
        });
        fetchTransactions();
        fetchPaymentsSummary();
        setDialogOpen(false);
        setFormData({
          amount: "",
          description: "",
          category: "",
          date: new Date().toISOString().split("T")[0],
        });
      } else {
        throw new Error("Erro ao registrar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao registrar transacao",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta transacao?")) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Transacao excluida!",
          variant: "success",
        });
        fetchTransactions();
        fetchPaymentsSummary();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir transacao",
        variant: "destructive",
      });
    }
  };

  const expenseCategories = [
    "Aluguel do campo",
    "Manutencao",
    "Materiais esportivos",
    "Agua/Bebidas",
    "Premiacao",
    "Outros",
  ];

  const incomeCategories = [
    "Mensalidade",
    "Diaria avulso",
    "Patrocinio",
    "Outros",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-green-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500">Controle de entradas e saidas</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Transacao
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Transacao</DialogTitle>
                <DialogDescription>
                  Registre uma entrada ou saida
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={transactionType === "INCOME" ? "default" : "outline"}
                      className={transactionType === "INCOME" ? "bg-green-600" : ""}
                      onClick={() => setTransactionType("INCOME")}
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Entrada
                    </Button>
                    <Button
                      type="button"
                      variant={transactionType === "EXPENSE" ? "default" : "outline"}
                      className={transactionType === "EXPENSE" ? "bg-red-600" : ""}
                      onClick={() => setTransactionType("EXPENSE")}
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Saida
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="100.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label>Descricao *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descreva a transacao..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateTransaction}
                  disabled={saving || !formData.amount || !formData.description}
                  className={
                    transactionType === "EXPENSE"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }
                >
                  {saving ? "Salvando..." : "Registrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Saidas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalExpenses)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Saldo</p>
                <p
                  className={`text-2xl font-bold ${
                    summary.balance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.balance)}
                </p>
              </div>
              <DollarSign
                className={`h-8 w-8 ${
                  summary.balance >= 0 ? "text-green-500" : "text-red-500"
                }`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Historico de Transacoes</CardTitle>
          <CardDescription>
            Entradas e saidas registradas manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="INCOME">Entradas</TabsTrigger>
              <TabsTrigger value="EXPENSE">Saidas</TabsTrigger>
            </TabsList>

            {["all", "INCOME", "EXPENSE"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4">
                <div className="space-y-4">
                  {transactions
                    .filter((t) => tab === "all" || t.type === tab)
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className={`p-2 rounded-full ${
                              transaction.type === "INCOME"
                                ? "bg-green-100"
                                : "bg-red-100"
                            }`}
                          >
                            {transaction.type === "INCOME" ? (
                              <ArrowUpCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowDownCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              {transaction.category && (
                                <Badge variant="outline">{transaction.category}</Badge>
                              )}
                              <span>{formatDate(transaction.date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <p
                            className={`font-bold text-lg ${
                              transaction.type === "INCOME"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {transaction.type === "INCOME" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </p>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
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
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma transacao encontrada
                    </p>
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
