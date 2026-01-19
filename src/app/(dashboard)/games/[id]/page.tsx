"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  formatCurrency,
  formatDate,
  getGameTypeLabel,
  getPlayerTypeLabel,
  getConfirmationStatusLabel,
} from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  HelpCircle,
  Edit,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  priceGoalkeeper: number;
  venue: {
    name: string;
    address: string;
    city: string;
  };
  confirmations: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
      image: string;
      playerType: string;
    };
  }>;
}

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";
  const gameId = params.id as string;

  useEffect(() => {
    fetchGame();
  }, [gameId]);

  const fetchGame = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      if (response.ok) {
        const data = await response.json();
        setGame(data);
      } else {
        router.push("/games");
      }
    } catch (error) {
      console.error("Erro ao carregar jogo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmation = async (status: string) => {
    setConfirming(true);
    try {
      const response = await fetch(`/api/games/${gameId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast({
          title: status === "CONFIRMED" ? "Presenca confirmada!" : "Presenca recusada",
          variant: "success",
        });
        fetchGame();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao confirmar presenca",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Pelada excluida!",
          variant: "success",
        });
        router.push("/games");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir pelada",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-green-600">Carregando...</div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  const myConfirmation = game.confirmations.find(
    (c) => c.user?.id === session?.user?.id
  );

  const confirmedPlayers = game.confirmations.filter(
    (c) => c.status === "CONFIRMED"
  );
  const declinedPlayers = game.confirmations.filter(
    (c) => c.status === "DECLINED"
  );
  const pendingPlayers = game.confirmations.filter(
    (c) => c.status === "PENDING"
  );

  const isPast = new Date(game.date) < new Date();
  const isFull = confirmedPlayers.length >= game.maxPlayers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/games">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{game.title}</h1>
            <p className="text-gray-500">{game.venue.name}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex space-x-2">
            <Link href={`/games/${gameId}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir pelada?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acao nao pode ser desfeita. A pelada sera removida permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Game Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informacoes do Jogo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Data</p>
                    <p className="font-medium">{formatDate(game.date)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Horario</p>
                    <p className="font-medium">
                      {game.startTime} - {game.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Local</p>
                    <p className="font-medium">{game.venue.name}</p>
                    <p className="text-sm text-gray-500">
                      {game.venue.address}, {game.venue.city}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Vagas</p>
                    <p className="font-medium">
                      {confirmedPlayers.length}/{game.maxPlayers}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline">{getGameTypeLabel(game.gameType)}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Valor por jogador</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(game.pricePerPlayer)}
                  </p>
                  {game.priceGoalkeeper === 0 && (
                    <p className="text-xs text-gray-500">Goleiros: Gratis</p>
                  )}
                </div>
              </div>

              {game.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Descricao</p>
                    <p className="text-gray-700">{game.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Confirmed Players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Confirmados ({confirmedPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {confirmedPlayers.length > 0 ? (
                <div className="space-y-3">
                  {confirmedPlayers.map((confirmation, index) => (
                    <div
                      key={confirmation.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-green-50"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500 w-6">
                          {index + 1}.
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={confirmation.user?.image} />
                          <AvatarFallback>
                            {confirmation.user?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{confirmation.user?.name}</p>
                          <p className="text-xs text-gray-500">
                            {getPlayerTypeLabel(confirmation.user?.playerType || "CASUAL")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Nenhum jogador confirmado ainda
                </p>
              )}
            </CardContent>
          </Card>

          {/* Declined Players */}
          {declinedPlayers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  Recusados ({declinedPlayers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {declinedPlayers.map((confirmation) => (
                    <div
                      key={confirmation.id}
                      className="flex items-center space-x-3 p-2 rounded-lg bg-red-50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={confirmation.user?.image} />
                        <AvatarFallback>
                          {confirmation.user?.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{confirmation.user?.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Confirmation */}
        <div className="space-y-6">
          {!isPast && (
            <Card>
              <CardHeader>
                <CardTitle>Sua Presenca</CardTitle>
                <CardDescription>Confirme sua participacao</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {myConfirmation ? (
                  <div className="text-center">
                    <Badge
                      variant={
                        myConfirmation.status === "CONFIRMED"
                          ? "success"
                          : myConfirmation.status === "DECLINED"
                          ? "destructive"
                          : "warning"
                      }
                      className="text-lg py-2 px-4"
                    >
                      {getConfirmationStatusLabel(myConfirmation.status)}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-2">
                      Voce pode alterar sua resposta
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-gray-500">
                    Voce ainda nao respondeu
                  </p>
                )}

                <div className="space-y-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={confirming || isFull}
                    onClick={() => handleConfirmation("CONFIRMED")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isFull ? "Lotado" : "Vou Jogar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={confirming}
                    onClick={() => handleConfirmation("DECLINED")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Nao Vou
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Confirmados</span>
                <span className="font-medium text-green-600">
                  {confirmedPlayers.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Recusados</span>
                <span className="font-medium text-red-600">
                  {declinedPlayers.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Pendentes</span>
                <span className="font-medium text-yellow-600">
                  {pendingPlayers.length}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Vagas disponiveis</span>
                <span className="font-medium">
                  {game.maxPlayers - confirmedPlayers.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
