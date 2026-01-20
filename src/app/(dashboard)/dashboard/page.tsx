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
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

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
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-1">Visão geral do sistema Peladeiros</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Data de Hoje</p>
          <p className="text-white font-mono">{new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Next Game Shortcut */}
      {data?.upcomingGames && data.upcomingGames.length > 0 && (
        (() => {
          const nextGame = data.upcomingGames[0];
          const diffTime = new Date(nextGame.date).getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 3 && diffTime > -1000 * 60 * 60 * 4) {
            return (
              <Card className="bg-gradient-to-r from-accent/10 to-transparent border-accent/20 relative overflow-hidden group hover:border-accent/40 transition-all">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-10 -mt-10" />
                <CardHeader className="pb-2 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center text-accent text-xl font-display uppercase tracking-wider">
                        <Trophy className="mr-2 h-5 w-5" />
                        Próxima Pelada
                      </CardTitle>
                      <CardDescription className="text-zinc-300 font-medium mt-1 text-lg">
                        {nextGame.title} - <span className="text-white font-bold">{diffDays <= 0 ? "HOJE!" : diffDays === 1 ? "AMANHÃ" : `Em ${diffDays} dias`}</span>
                      </CardDescription>
                    </div>
                    <Badge className="bg-accent text-black font-bold uppercase tracking-wider border-none text-sm px-3 py-1">
                      {nextGame.startTime}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="flex items-center justify-between mt-4">
                    <div className="space-y-1">
                      <p className="text-sm text-zinc-400 flex items-center">
                        <span className="font-bold text-zinc-500 uppercase text-xs mr-2 tracking-widest">Local</span> {nextGame.venue?.name}
                      </p>
                      <p className="text-sm text-zinc-400">
                        <span className="font-bold text-zinc-500 uppercase text-xs mr-2 tracking-widest">Vagas</span> <span className="text-white font-mono">{nextGame._count?.confirmations || 0} / {nextGame.maxPlayers}</span>
                      </p>
                    </div>
                    <Link href={`/games/${nextGame.id}`}>
                      <Button className="bg-accent hover:bg-accent/90 text-black font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(197,160,89,0.2)]">
                        Confirmar Presença
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()
      )}

      {/* Stats Cards - Black Minimalist */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Total de Jogadores
            </CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">{data?.totalPlayers || 0}</div>
            <p className="text-xs text-zinc-500 mt-1">
              <span className="text-zinc-300">{data?.monthlyPlayers || 0}</span> mensalistas • <span className="text-zinc-300">{data?.casualPlayers || 0}</span> avulsos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Receita do Mês
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-emerald-400">
              {formatCurrency(data?.monthlyIncome || 0)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Despesas: {formatCurrency(data?.monthlyExpenses || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Pagamentos Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-yellow-500">
              {data?.pendingPayments || 0}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Próxima Pelada
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">
              {data?.confirmedForNextGame || 0}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Confirmados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two columns layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Games */}
        <Card className="bg-zinc-950 border-white/5">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-lg font-display font-bold text-white uppercase tracking-wide">Próximos Jogos</CardTitle>
              <CardDescription>Calendário de eventos</CardDescription>
            </div>
            <Link href="/games">
              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {data?.upcomingGames && data.upcomingGames.length > 0 ? (
                data.upcomingGames.slice(0, 5).map((game: any) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 bg-black border border-white/5 rounded-lg hover:border-accent/30 transition-all group"
                  >
                    <div>
                      <p className="font-bold text-zinc-200 group-hover:text-white transition-colors">{game.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-white/10 text-zinc-500 text-[10px] uppercase">
                          {getGameTypeLabel(game.gameType)}
                        </Badge>
                        <p className="text-xs text-zinc-500">
                          {formatDate(game.date)} - {game.startTime}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white font-mono">
                        <span className="text-accent">{game._count?.confirmations || 0}</span>/{game.maxPlayers}
                      </p>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">confirmados</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-zinc-600 py-8 italic">
                  Nenhuma pelada agendada
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="bg-zinc-950 border-white/5">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-lg font-display font-bold text-white uppercase tracking-wide">Últimos Pagamentos</CardTitle>
              <CardDescription>Fluxo de caixa recente</CardDescription>
            </div>
            <Link href="/payments">
              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {data?.recentPayments && data.recentPayments.length > 0 ? (
                data.recentPayments.slice(0, 5).map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-black border border-white/5 rounded-lg hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center space-x-4">
                      {payment.status === "CONFIRMED" || payment.status === "PAID" ? (
                        <div className="h-8 w-8 rounded-full bg-emerald-900/20 text-emerald-500 flex items-center justify-center border border-emerald-900/30">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      ) : payment.status === "PENDING" ? (
                        <div className="h-8 w-8 rounded-full bg-yellow-900/20 text-yellow-500 flex items-center justify-center border border-yellow-900/30">
                          <Clock className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center border border-red-900/30">
                          <XCircle className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-zinc-300 text-sm">
                          {payment.user?.name || "Usuário"}
                        </p>
                        <p className="text-xs text-zinc-600 uppercase">{payment.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white font-mono">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-zinc-600 py-8 italic">
                  Nenhum pagamento recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-zinc-900 to-black border-white/5">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href="/games/new">
              <Button className="bg-accent text-black hover:bg-white font-bold uppercase tracking-wider h-12">
                <Calendar className="mr-2 h-4 w-4" />
                Criar Pelada
              </Button>
            </Link>
            <Link href="/players">
              <Button variant="outline" className="border-white/10 text-zinc-400 hover:text-white hover:border-white/20 h-12 uppercase tracking-wider text-xs">
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Jogadores
              </Button>
            </Link>
            <Link href="/finance">
              <Button variant="outline" className="border-white/10 text-zinc-400 hover:text-white hover:border-white/20 h-12 uppercase tracking-wider text-xs">
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
