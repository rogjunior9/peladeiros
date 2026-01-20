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

  const upcomingGames = games.filter((g) => new Date(g.date) >= new Date());
  const pastGames = games.filter((g) => new Date(g.date) < new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  const GameCard = ({ game }: { game: Game }) => (
    <Link href={`/games/${game.id}`}>
      <Card className="bg-zinc-950 border border-white/5 hover:border-accent/40 transition-all cursor-pointer group h-full flex flex-col justify-between">
        <CardHeader className="pb-3 relative space-y-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-display font-bold text-white uppercase tracking-wide group-hover:text-accent transition-colors">
                {game.title}
              </CardTitle>
              <CardDescription className="flex items-center text-zinc-500 text-xs uppercase tracking-wider">
                <MapPin className="h-3 w-3 mr-1 text-accent" />
                {game.venue.name}
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-white/10 text-zinc-500 uppercase text-[10px] whitespace-nowrap">
              {getGameTypeLabel(game.gameType)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-t border-b border-white/5">
              <div className="flex items-center text-zinc-400 text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(game.date)}
              </div>
              <div className="flex items-center text-zinc-400 text-sm">
                <Clock className="h-4 w-4 mr-2" />
                {game.startTime.slice(0, 5)}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2">
              <div className="flex items-center text-zinc-500 text-sm">
                <Users className="h-4 w-4 mr-2" />
                <span className="text-white font-mono">{game._count.confirmations}</span>/{game.maxPlayers}
              </div>
              <span className="font-display font-bold text-accent text-lg">
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingGames.map((game) => (
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
