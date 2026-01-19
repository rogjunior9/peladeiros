"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, getGameTypeLabel } from "@/lib/utils";
import { Calendar, MapPin, Users, Plus, Clock } from "lucide-react";

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
        const data = await response.json();
        setGames(data);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-green-600">Carregando...</div>
      </div>
    );
  }

  const GameCard = ({ game }: { game: Game }) => (
    <Link href={`/games/${game.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{game.title}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                {game.venue.name}
              </CardDescription>
            </div>
            <Badge variant="outline">{getGameTypeLabel(game.gameType)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              {formatDate(game.date)}
            </div>
            <div className="flex items-center text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              {game.startTime} - {game.endTime}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                {game._count.confirmations}/{game.maxPlayers} confirmados
              </div>
              <span className="font-semibold text-green-600">
                {formatCurrency(game.pricePerPlayer)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Peladas</h1>
          <p className="text-gray-500">Gerencie seus jogos</p>
        </div>
        {isAdmin && (
          <Link href="/games/new">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Pelada
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Proximas ({upcomingGames.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Anteriores ({pastGames.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingGames.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Nenhuma pelada agendada</p>
                {isAdmin && (
                  <Link href="/games/new">
                    <Button className="mt-4 bg-green-600 hover:bg-green-700">
                      Criar primeira pelada
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {pastGames.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Nenhuma pelada realizada</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
