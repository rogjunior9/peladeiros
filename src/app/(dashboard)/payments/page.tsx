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
      const response = await fetch("/api/games?upcoming=true"); // Busca jogos recentes/futuros
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
      // Prepara o payload, removendo gameId se for "none"
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
          variant: "success",
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
          variant: "success",
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
        return <CheckCircle className="h-4 w-4 text-green-500" />;
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
        return <QrCode className="h-4 w-4" />;
      case "CREDIT_CARD":
        return <CreditCard className="h-4 w-4" />;
      case "CASH":
        return <Banknote className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-green-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagamentos</h1>
          <p className="text-gray-500">Gerencie os pagamentos da pelada</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Pagamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Pagamento em Dinheiro</DialogTitle>
                <DialogDescription>
                  Registre um pagamento feito em dinheiro
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Jogador *</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, userId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o jogador" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="30.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pelada (Opcional)</Label>
                    <Select
                      value={formData.gameId}
                      onValueChange={(value) => setFormData({ ...formData, gameId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
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

                <div className="space-y-2">
                  <Label>Mes de Referencia</Label>
                  <Input
                    type="month"
                    value={formData.referenceMonth}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceMonth: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observacoes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Observacoes opcionais"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={saving || !formData.userId || !formData.amount}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? "Salvando..." : "Registrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Recebido</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.total)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Confirmados</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Label>Filtrar por status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="CONFIRMED">Confirmados</SelectItem>
                <SelectItem value="CANCELLED">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Historico de Pagamentos ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={payment.user?.image} />
                    <AvatarFallback>
                      {payment.user?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{payment.user?.name || "Usuario"}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      {getMethodIcon(payment.method)}
                      <span>{getPaymentMethodLabel(payment.method)}</span>
                      {payment.referenceMonth && (
                        <span>- Ref: {payment.referenceMonth}</span>
                      )}
                    </div>
                    {payment.game && (
                      <p className="text-xs text-gray-400">
                        Pelada: {payment.game.title}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(payment.status)}
                    <Badge
                      variant={
                        payment.status === "CONFIRMED"
                          ? "success"
                          : payment.status === "PENDING"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {getPaymentStatusLabel(payment.status)}
                    </Badge>
                  </div>
                  {isAdmin && payment.status === "PENDING" && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(payment.id, "CONFIRMED")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Confirmar
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredPayments.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Nenhum pagamento encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
