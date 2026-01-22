"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch("/api/games");
      if (response.ok) {
        setGames(await response.json());
      }
    } catch (error) {
      console.error("Erro ao carregar jogos:", error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingGames = games
    .filter((g) => new Date(g.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastGames = games
    .filter((g) => new Date(g.date) < new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  const GameCard = ({ game }: { game: Game }) => (
    <Link href={`/games/${game.id}`}>
      <Card className="bg-zinc-950 border border-white/5 hover:border-accent/40 transition-all cursor-pointer group h-[340px] flex flex-col justify-between overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-50">
          <div className="h-16 w-16 bg-accent/5 rounded-full blur-xl" />
        </div>
        <CardHeader className="pb-3 relative space-y-2 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-zinc-900/50 border-white/10 text-zinc-500 uppercase text-[10px] tracking-wider mb-2">
                {getGameTypeLabel(game.gameType)}
              </Badge>
              <CardTitle className="text-2xl font-display font-bold text-white uppercase tracking-wide group-hover:text-accent transition-colors leading-tight">
                {game.title}
              </CardTitle>
              <CardDescription className="flex items-center text-zinc-400 text-xs uppercase tracking-wider font-medium">
                <MapPin className="h-3.5 w-3.5 mr-2 text-accent" />
                {game.venue.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="z-10 bg-gradient-to-t from-black/80 to-transparent pt-0 pb-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between py-4 border-t border-white/5">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-zinc-600 font-bold tracking-widest">Data</span>
                <div className="flex items-center text-zinc-300 font-bold">
                  <Calendar className="h-4 w-4 mr-2 text-zinc-500" />
                  {formatDate(game.date)}
                </div>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] uppercase text-zinc-600 font-bold tracking-widest">Horário</span>
                <div className="flex items-center justify-end text-zinc-300 font-bold">
                  <Clock className="h-4 w-4 mr-2 text-zinc-500" />
                  {game.startTime.slice(0, 5)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center text-zinc-500 text-sm bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5">
                <Users className="h-4 w-4 mr-2 text-users" />
                <span className="text-white font-mono font-bold">{game._count.confirmations}</span>
                <span className="mx-1">/</span>
                <span className="text-zinc-500">{game.maxPlayers}</span>
              </div>
              <span className="font-display font-bold text-accent text-2xl">
                {formatCurrency(game.pricePerPlayer)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">Peladas</h1>
          <p className="text-zinc-500 mt-1">Gerencie e participe dos jogos</p>
        </div>
        {isAdmin && (
          <Link href="/games/new">
            <Button className="bg-accent hover:bg-white text-black font-bold uppercase tracking-wider">
              <Plus className="h-4 w-4 mr-2" />
              Nova Pelada
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="bg-zinc-950 border border-white/5 p-1 mb-6">
          <TabsTrigger
            value="upcoming"
            className="data-[state=active]:bg-accent data-[state=active]:text-black font-display uppercase tracking-wider text-xs px-6"
          >
            Próximas <span className="ml-2 font-mono opacity-60">({upcomingGames.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white font-display uppercase tracking-wider text-xs px-6 text-zinc-500"
          >
            Anteriores <span className="ml-2 font-mono opacity-60">({pastGames.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcomingGames.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
              {upcomingGames.slice(0, 3).map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="text-center border border-dashed border-white/10 rounded-xl py-16">
              <Calendar className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 uppercase tracking-widest text-sm">Nenhum jogo agendado</p>
              {isAdmin && (
                <Link href="/games/new">
                  <Button variant="link" className="text-accent mt-2">Agendar agora &rarr;</Button>
                </Link>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {pastGames.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-70">
              {pastGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-500 uppercase tracking-widest text-sm">
              Histórico vazio
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
