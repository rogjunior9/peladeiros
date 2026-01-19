"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Edit,
  Trash2,
  Shield,
  Loader2,
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
import { CpfDialog } from "@/components/CpfDialog";

// Tipos
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
    pricePerHour?: number;
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
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showCpfDialog, setShowCpfDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const isAdmin = session?.user?.role === "ADMIN";
  const gameId = params.id as string;

  useEffect(() => {
    fetchGame();
    if (session?.user?.id) fetchUserProfile();
  }, [gameId, session?.user?.id]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`/api/users/${session?.user?.id}`);
      if (res.ok) setUserProfile(await res.json());
    } catch (e) { }
  };

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

  const executeConfirmation = async (status: string) => {
    setConfirming(true);
    try {
      const response = await fetch(`/api/games/${gameId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast({
          title: status === "CONFIRMED" ? "Presença confirmada! ⚽" : "Ausência informada",
          description: status === "CONFIRMED" ? "Bom jogo!" : "Fica pra próxima.",
          className: status === "CONFIRMED" ? "bg-emerald-600 text-white border-none" : "bg-slate-800 text-white border-slate-700",
        });
        fetchGame();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmation = async (status: string) => {
    if (status === "CONFIRMED") {
      const hasCpf = userProfile?.document || (session?.user as any)?.document;
      if (!hasCpf) {
        setShowCpfDialog(true);
        return;
      }
    }
    await executeConfirmation(status);
  };

  const handleSaveCpf = async (cpf: string) => {
    const res = await fetch(`/api/users/${session?.user?.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: cpf })
    });
    if (!res.ok) throw new Error("Erro ao salvar CPF");

    setUserProfile({ ...userProfile, document: cpf });
    await update({ ...session, user: { ...session?.user, document: cpf } });
    setShowCpfDialog(false);
    await executeConfirmation("CONFIRMED");
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/games");
      }
    } catch (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!game) return null;

  const myConfirmation = game.confirmations.find(c => c.user?.id === session?.user?.id);
  const confirmedPlayers = game.confirmations.filter(c => c.status === "CONFIRMED");
  const waitingPlayers = game.confirmations.filter(c => c.status === "WAITING_LIST");
  const declinedPlayers = game.confirmations.filter(c => c.status === "DECLINED");
  const isPast = new Date(game.date) < new Date();
  const isFull = confirmedPlayers.length >= game.maxPlayers;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">

      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-900/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="container max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24 md:pb-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/games">
              <Button variant="ghost" className="h-10 w-10 p-0 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                {game.title}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                <MapPin className="h-3 w-3" /> {game.venue.name}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-2 self-end md:self-auto">
              <Link href={`/games/${gameId}/edit`}>
                <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white">
                  <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Jogo?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">Essa ação é irreversível.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN: DETAILS & LISTS */}
          <div className="lg:col-span-2 space-y-6">

            {/* Game Info Card */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3 w-3" /> Data</div>
                  <div className="text-lg font-semibold text-slate-200">{formatDate(game.date)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1"><Clock className="h-3 w-3" /> Horário</div>
                  <div className="text-lg font-semibold text-slate-200">{game.startTime.slice(0, 5)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1"><DollarSign className="h-3 w-3" /> Valor</div>
                  <div className="text-lg font-semibold text-emerald-400">{formatCurrency(game.pricePerPlayer)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1"><Users className="h-3 w-3" /> Vagas</div>
                  <div className="text-lg font-semibold text-slate-200">{confirmedPlayers.length}/{game.maxPlayers}</div>
                </div>
              </div>

              {game.description && (
                <div className="mt-6 pt-6 border-t border-slate-800/50 relative z-10">
                  <p className="text-slate-400 text-sm leading-relaxed">{game.description}</p>
                </div>
              )}
            </div>

            {/* Lists Container */}
            <div className="space-y-6">
              {confirmedPlayers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Confirmados ({confirmedPlayers.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {confirmedPlayers.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 bg-slate-900 border border-slate-800/50 p-3 rounded-xl hover:bg-slate-800 transition-colors">
                        <div className="h-6 w-6 rounded-full bg-emerald-900/50 text-emerald-500 flex items-center justify-center text-xs font-bold border border-emerald-900">
                          {i + 1}
                        </div>
                        <Avatar className="h-10 w-10 border border-slate-700">
                          <AvatarImage src={c.user?.image} />
                          <AvatarFallback className="bg-slate-800 text-slate-400">{c.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-slate-200 text-sm">{c.user?.name}</div>
                          <div className="text-xs text-slate-500">{getPlayerTypeLabel(c.user?.playerType)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {waitingPlayers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Lista de Espera
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {waitingPlayers.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 bg-slate-900 border border-yellow-900/20 p-3 rounded-xl opacity-75">
                        <span className="text-xs text-yellow-600 font-mono w-6 text-center">{i + 1}.</span>
                        <Avatar className="h-8 w-8 grayscale opacity-70">
                          <AvatarImage src={c.user?.image} />
                          <AvatarFallback>{c.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-slate-300">{c.user?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ACTION & STATS */}
          <div className="space-y-6">

            {/* User Action Card */}
            {!isPast && (
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-6">
                <h3 className="text-lg font-bold text-white mb-1">Sua Presença</h3>
                <p className="text-xs text-slate-500 mb-6">Confirme sua participação no jogo.</p>

                {myConfirmation ? (
                  <div className="text-center py-4 bg-slate-900 rounded-xl border border-slate-800 mb-4">
                    <p className="text-sm text-slate-400 mb-2">Status atual</p>
                    <Badge variant={myConfirmation.status === 'CONFIRMED' ? 'success' : 'default'} className="text-md px-3 py-1">
                      {getConfirmationStatusLabel(myConfirmation.status)}
                    </Badge>
                  </div>
                ) : (
                  <div className="text-center py-4 mb-4">
                    <span className="inline-block h-3 w-3 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
                    <span className="text-sm text-emerald-400 font-medium">Inscrições Abertas</span>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-12 text-md shadow-lg shadow-emerald-900/20"
                    onClick={() => handleConfirmation("CONFIRMED")}
                    disabled={confirming || (isFull && !myConfirmation)}
                  >
                    {confirming ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                    {isFull ? "Lista de Espera" : "Vou Jogar"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-slate-800 bg-transparent text-slate-400 hover:text-white hover:bg-slate-800 h-12"
                    onClick={() => executeConfirmation("DECLINED")}
                    disabled={confirming}
                  >
                    <XCircle className="mr-2 h-5 w-5" />
                    Não Vou
                  </Button>
                </div>

                {!myConfirmation && session?.user?.role !== "ADMIN" && (
                  <p className="text-xs text-slate-600 text-center mt-4">
                    Ao confirmar, você concorda com a cobrança automática.
                  </p>
                )}
              </div>
            )}

            {/* Admin Finance Stats */}
            {isAdmin && (
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center"><DollarSign className="h-4 w-4 mr-1" /> Resumo Financeiro</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Arrecadação</span>
                    <span className="text-emerald-400">{formatCurrency(confirmedPlayers.length * game.pricePerPlayer)}</span>
                  </div>
                  {game.venue.pricePerHour && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Custo Campo</span>
                      <span className="text-red-400">-{formatCurrency((parseInt(game.endTime.split(':')[0]) - parseInt(game.startTime.split(':')[0])) * (game.venue.pricePerHour || 0))}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-800 my-2 pt-2 flex justify-between font-bold text-white">
                    <span>Lucro</span>
                    <span>{formatCurrency((confirmedPlayers.length * game.pricePerPlayer) - ((parseInt(game.endTime.split(':')[0]) - parseInt(game.startTime.split(':')[0])) * (game.venue.pricePerHour || 0)))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Cpf Dialog */}
      <CpfDialog
        open={showCpfDialog}
        onOpenChange={setShowCpfDialog}
        onSave={handleSaveCpf}
      />
    </div>
  );
}
