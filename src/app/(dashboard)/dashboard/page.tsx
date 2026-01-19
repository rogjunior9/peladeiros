"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, getGameTypeLabel } from "@/lib/utils";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  totalPlayers: number;
  monthlyPlayers: number;
  casualPlayers: number;
  goalkeepers: number;
  upcomingGames: any[];
  recentPayments: any[];
  monthlyIncome: number;
  monthlyExpenses: number;
  pendingPayments: number;
  confirmedForNextGame: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Visao geral da sua pelada</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total de Jogadores
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalPlayers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {data?.monthlyPlayers || 0} mensalistas, {data?.casualPlayers || 0} avulsos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Receita do Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.monthlyIncome || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Despesas: {formatCurrency(data?.monthlyExpenses || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pagamentos Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {data?.pendingPayments || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Aguardando confirmacao
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Proxima Pelada
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.confirmedForNextGame || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Jogadores confirmados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two columns layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Games */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Proximas Peladas</CardTitle>
              <CardDescription>Jogos agendados</CardDescription>
            </div>
            <Link href="/games">
              <Button variant="ghost" size="sm">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.upcomingGames && data.upcomingGames.length > 0 ? (
                data.upcomingGames.slice(0, 5).map((game: any) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{game.title}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(game.date)} - {game.startTime}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {getGameTypeLabel(game.gameType)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {game._count?.confirmations || 0}/{game.maxPlayers}
                      </p>
                      <p className="text-xs text-gray-500">confirmados</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma pelada agendada
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pagamentos Recentes</CardTitle>
              <CardDescription>Ultimas transacoes</CardDescription>
            </div>
            <Link href="/payments">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentPayments && data.recentPayments.length > 0 ? (
                data.recentPayments.slice(0, 5).map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {payment.status === "CONFIRMED" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : payment.status === "PENDING" ? (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.user?.name || "Usuario"}
                        </p>
                        <p className="text-sm text-gray-500">{payment.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Nenhum pagamento recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acoes Rapidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href="/games/new">
              <Button className="bg-green-600 hover:bg-green-700">
                <Calendar className="mr-2 h-4 w-4" />
                Criar Pelada
              </Button>
            </Link>
            <Link href="/players">
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Jogadores
              </Button>
            </Link>
            <Link href="/finance">
              <Button variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                Ver Financeiro
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
