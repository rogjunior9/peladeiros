"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, getGameTypeLabel } from "@/lib/utils";
import { Calendar, MapPin, Users, Plus, Clock, Loader2 } from "lucide-react";

interface Game {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  gameType: string;
  maxPlayers: number;
  pricePerPlayer: number;
  venue: {
    name: string;
    address: string;
  };
  _count: {
    confirmations: number;
  };
}

export default function GamesPage() {
  const { data: session } = useSession();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const isAdmin = session?.user?.role === "ADMIN";
  const UPCOMING_PAGE_SIZE = 2;

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch("/api/games", { cache: "no-store" });
      if (response.ok) {
        setGames(await response.json());
      }
    } catch (error) {
      console.error("Erro ao carregar jogos:", error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const upcomingGames = games
    .filter((g) => new Date(g.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastGames = games
    .filter((g) => new Date(g.date) < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalUpcomingPages = Math.max(1, Math.ceil(upcomingGames.length / UPCOMING_PAGE_SIZE));
  const clampedUpcomingPage = Math.min(upcomingPage, totalUpcomingPages);
  const upcomingStartIndex = (clampedUpcomingPage - 1) * UPCOMING_PAGE_SIZE;
  const paginatedUpcomingGames = upcomingGames.slice(upcomingStartIndex, upcomingStartIndex + UPCOMING_PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  const GameCard = ({ game, muted = false }: { game: Game; muted?: boolean }) => (
    <Link href={`/games/${game.id}`}>
      <Card
        className={`bg-zinc-950 border border-white/5 hover:border-accent/30 transition-colors cursor-pointer ${
          muted ? "opacity-75" : ""
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg md:text-xl font-display font-bold text-white uppercase tracking-wide truncate">
                {game.title}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center text-zinc-400 text-xs uppercase tracking-wide font-medium">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-accent shrink-0" />
                <span className="truncate">{game.venue.name}</span>
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-zinc-900 border-white/10 text-zinc-400 uppercase text-[10px] shrink-0">
              {getGameTypeLabel(game.gameType)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md border border-white/5 bg-black/40 p-2.5">
              <p className="text-zinc-600 uppercase tracking-wider">Data</p>
              <p className="text-zinc-200 font-bold mt-1 flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
                {formatDate(game.date)}
              </p>
            </div>
            <div className="rounded-md border border-white/5 bg-black/40 p-2.5">
              <p className="text-zinc-600 uppercase tracking-wider">Horário</p>
              <p className="text-zinc-200 font-bold mt-1 flex items-center justify-start">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
                {game.startTime.slice(0, 5)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center text-zinc-400 text-xs bg-zinc-900/50 px-2.5 py-1.5 rounded-md border border-white/5">
              <Users className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
              <span className="text-white font-mono font-bold">{game._count.confirmations}</span>
              <span className="mx-1">/</span>
              <span>{game.maxPlayers}</span>
            </div>
            <span className="font-display font-bold text-accent text-xl">{formatCurrency(game.pricePerPlayer)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-5 md:space-y-8 pb-8 md:pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-white/5 pb-4 md:pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white uppercase tracking-tight">Peladas</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Gerencie e participe dos jogos</p>
        </div>
        {isAdmin && (
          <Link href="/games/new">
            <Button className="w-full md:w-auto bg-accent hover:bg-accent/90 text-black font-bold uppercase tracking-wider">
              <Plus className="h-4 w-4 mr-2" />
              Nova Pelada
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <div className="overflow-x-auto flex justify-center">
          <TabsList className="bg-zinc-950 border border-white/5 p-1 mb-4 md:mb-6 min-w-max">
            <TabsTrigger
              value="upcoming"
              className="data-[state=active]:bg-accent data-[state=active]:text-black font-display uppercase tracking-wider text-xs px-4 md:px-6"
            >
              Próximas <span className="ml-2 font-mono opacity-60">({upcomingGames.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white font-display uppercase tracking-wider text-xs px-4 md:px-6 text-zinc-500"
            >
              Anteriores <span className="ml-2 font-mono opacity-60">({pastGames.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upcoming" className="mt-0">
          {upcomingGames.length > 0 ? (
            <>
              <div className="grid gap-3 md:gap-5 grid-cols-1 md:grid-cols-2">
                {paginatedUpcomingGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  className="h-9 border-white/10 text-zinc-300 disabled:opacity-40"
                  disabled={clampedUpcomingPage <= 1}
                  onClick={() => setUpcomingPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <span className="text-xs text-zinc-500 uppercase tracking-widest px-2">
                  Página {clampedUpcomingPage} de {totalUpcomingPages}
                </span>
                <Button
                  variant="outline"
                  className="h-9 border-white/10 text-zinc-300 disabled:opacity-40"
                  disabled={clampedUpcomingPage >= totalUpcomingPages}
                  onClick={() => setUpcomingPage((prev) => Math.min(totalUpcomingPages, prev + 1))}
                >
                  Próxima
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center border border-dashed border-white/10 rounded-xl py-14">
              <Calendar className="h-9 w-9 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 uppercase tracking-widest text-sm">Nenhum jogo agendado</p>
              {isAdmin && (
                <Link href="/games/new">
                  <Button variant="link" className="text-accent mt-1">Agendar agora &rarr;</Button>
                </Link>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-0">
          {pastGames.length > 0 ? (
            <div className="grid gap-3 md:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {pastGames.map((game) => (
                <GameCard key={game.id} game={game} muted />
              ))}
            </div>
          ) : (
            <div className="text-center py-14 text-zinc-500 uppercase tracking-widest text-sm">Histórico vazio</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
