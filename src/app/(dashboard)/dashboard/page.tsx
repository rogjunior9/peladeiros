"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, getGameTypeLabel } from "@/lib/utils";
import {
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  ArrowRight,
  Trophy,
  Activity,
  Wallet,
  Loader2,
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
  totalGames: number;
  upcomingGamesCount: number;
  pastGamesCount: number;
  confirmedPaymentsCount: number;
  confirmedPaymentsTotal: number;
  totalConfirmedAttendances: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
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

  const monthlyBalance = useMemo(() => {
    if (!data) return 0;
    return (data.monthlyIncome || 0) - (data.monthlyExpenses || 0);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  const numbers = [
    { label: "Jogadores", value: data?.totalPlayers || 0, icon: Users, tone: "text-white" },
    { label: "Peladas", value: data?.totalGames || 0, icon: Calendar, tone: "text-white" },
    { label: "Próximas", value: data?.upcomingGamesCount || 0, icon: Trophy, tone: "text-accent" },
    { label: "Pag. Pendentes", value: data?.pendingPayments || 0, icon: Clock, tone: "text-amber-400" },
    { label: "Pag. Confirmados", value: data?.confirmedPaymentsCount || 0, icon: CheckCircle, tone: "text-emerald-400" },
    { label: "Presenças", value: data?.totalConfirmedAttendances || 0, icon: Activity, tone: "text-white" },
  ];

  return (
    <div className="space-y-5 md:space-y-8 pb-8 md:pb-10">
      <div className="border-b border-white/5 pb-4 md:pb-6">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white uppercase tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 mt-1 text-sm md:text-base">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {numbers.map((item) => (
          <Card key={item.label} className="bg-zinc-950 border-white/5">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start justify-between">
                <p className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">{item.label}</p>
                <item.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-zinc-700" />
              </div>
              <p className={`mt-2 text-xl md:text-2xl font-display font-bold ${item.tone}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-3">
        <Card className="bg-zinc-950 border-white/5">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Receita do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl md:text-3xl font-display font-bold text-emerald-400">{formatCurrency(data?.monthlyIncome || 0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Despesas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl md:text-3xl font-display font-bold text-rose-400">{formatCurrency(data?.monthlyExpenses || 0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Saldo do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl md:text-3xl font-display font-bold ${monthlyBalance >= 0 ? "text-accent" : "text-rose-400"}`}>
              {formatCurrency(monthlyBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {data?.upcomingGames?.[0] && (
        <Card className="bg-zinc-950 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base font-display font-bold text-white uppercase tracking-wide">Próxima Pelada</CardTitle>
            <CardDescription className="text-zinc-500">Atalho rápido para confirmação</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-white font-bold text-lg leading-tight">{data.upcomingGames[0].title}</p>
              <p className="text-xs text-zinc-400 uppercase tracking-wide mt-1">
                {formatDate(data.upcomingGames[0].date)} • {data.upcomingGames[0].startTime} • {data.upcomingGames[0].venue?.name}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Confirmados: <span className="text-accent font-bold">{data.upcomingGames[0]._count?.confirmations || 0}</span>/{data.upcomingGames[0].maxPlayers}
              </p>
            </div>
            <Link href={`/games/${data.upcomingGames[0].id}`}>
              <Button className="w-full md:w-auto bg-accent hover:bg-accent/90 text-black font-bold uppercase tracking-widest">
                Ver Pelada
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <Card className="bg-zinc-950 border-white/5">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-base font-display font-bold text-white uppercase tracking-wide">Próximas Peladas</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-2">
              {data?.upcomingGames?.length ? (
                data.upcomingGames.slice(0, 5).map((game: any) => (
                  <Link key={game.id} href={`/games/${game.id}`} className="block">
                    <div className="rounded-lg border border-white/5 bg-black/40 p-3 hover:border-accent/30 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-bold truncate">{game.title}</p>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mt-0.5">
                            {formatDate(game.date)} • {game.startTime}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-white/10 text-zinc-400 text-[10px] uppercase">
                          {getGameTypeLabel(game.gameType)}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-zinc-600 text-sm italic">Nenhuma pelada agendada</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-base font-display font-bold text-white uppercase tracking-wide">Últimos Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-2">
              {data?.recentPayments?.length ? (
                data.recentPayments.slice(0, 5).map((payment: any) => (
                  <div key={payment.id} className="rounded-lg border border-white/5 bg-black/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white font-bold truncate">{payment.user?.name || "Usuário"}</p>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wide mt-0.5">
                          {payment.method} • {formatDate(payment.createdAt)}
                        </p>
                      </div>
                      <p className="font-mono font-bold text-emerald-400 whitespace-nowrap">{formatCurrency(payment.amount)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 text-sm italic">Nenhum pagamento recente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-950 border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link href="/games/new">
              <Button className="w-full bg-accent text-black hover:bg-accent/90 font-bold uppercase tracking-wider h-11">
                <Calendar className="mr-2 h-4 w-4" />
                Criar Pelada
              </Button>
            </Link>
            <Link href="/players">
              <Button variant="outline" className="w-full border-white/10 text-zinc-300 hover:text-white hover:border-white/20 h-11 uppercase tracking-wider text-xs">
                <Users className="mr-2 h-4 w-4" />
                Jogadores
              </Button>
            </Link>
            <Link href="/finance">
              <Button variant="outline" className="w-full border-white/10 text-zinc-300 hover:text-white hover:border-white/20 h-11 uppercase tracking-wider text-xs">
                <Wallet className="mr-2 h-4 w-4" />
                Financeiro
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-950 border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Resumo Geral</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-400">
          <p>
            Mensalistas: <span className="text-accent">{data?.monthlyPlayers || 0}</span> • Avulsos: <span className="text-blue-400">{data?.casualPlayers || 0}</span> • Goleiros: <span className="text-yellow-400">{data?.goalkeepers || 0}</span>
          </p>
          <p className="mt-1">
            Receita confirmada histórica: <span className="text-emerald-400 font-bold">{formatCurrency(data?.confirmedPaymentsTotal || 0)}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
