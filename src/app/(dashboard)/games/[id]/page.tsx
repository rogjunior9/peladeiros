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
  Trophy, // Icone mais "esporte/premio"
  Zap,
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

// Tipos (mantidos)
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
  recurrenceId?: string | null;
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
        setGame(await response.json());
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
      const isRemoval = status === "REMOVE";
      const response = await fetch(`/api/games/${gameId}/confirm`, {
        method: isRemoval ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: isRemoval ? undefined : JSON.stringify({ status }),
      });

      if (response.ok) {
        toast({
          title: isRemoval ? "PRESENÇA CANCELADA" : (status === "CONFIRMED" ? "PRESENÇA CONFIRMADA" : "AUSÊNCIA INFORMADA"),
          description: isRemoval ? "Sua vaga foi liberada." : (status === "CONFIRMED" ? "Prepare-se para o jogo!" : "Esperamos você na próxima."),
          className: "bg-zinc-900 border-accent/20 text-white",
        });
        fetchGame();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: "ERRO",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmation = async (status: string) => {
    if (status === "CONFIRMED") {
      // Check for 3-day restriction
      if (game) {
        const gameDate = new Date(game.date);
        gameDate.setHours(0, 0, 0, 0); // Normalize game date

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today

        const diffTime = gameDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 3) {
          toast({
            title: "AGUARDE",
            description: "A confirmação só é liberada 3 dias antes do jogo.",
            variant: "warning",
          });
          return;
        }
      }

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

  const handleDelete = async (deleteSeries = false, deleteFuture = false) => {
    try {
      const query = deleteSeries
        ? `?deleteSeries=true&deleteFuture=${deleteFuture}`
        : "";
      await fetch(`/api/games/${gameId}${query}`, { method: "DELETE" });
      router.push("/games");
    } catch (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (!game) return null;

  const myConfirmation = game.confirmations.find(c => c.user?.id === session?.user?.id);
  const confirmedPlayers = game.confirmations.filter(c => c.status === "CONFIRMED");
  const waitingPlayers = game.confirmations.filter(c => c.status === "WAITING_LIST");
  const isPast = new Date(game.date) < new Date();
  const isFull = confirmedPlayers.length >= game.maxPlayers;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-accent/30 selection:text-accent-foreground pb-24">

      {/* Background Decor - Sutil Glow Dourado */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="container max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-700 space-y-10">

        {/* Header Hero */}
        <div className="flex flex-col gap-6 border-b border-white/5 pb-8">
          <div className="flex justify-between items-start">
            <Link href="/games">
              <Button variant="ghost" className="text-zinc-500 hover:text-white hover:bg-white/5 -ml-4 uppercase tracking-widest text-xs">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
            </Link>

            {isAdmin && (
              <div className="flex gap-2">
                <Link href={`/games/${gameId}/edit`}>
                  <Button variant="outline" size="sm" className="border-white/10 bg-black hover:bg-white/5 text-zinc-400">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="bg-red-950/20 text-red-500 hover:bg-red-950/40 border border-red-900/20">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display font-medium text-xl">EXCLUIR JOGO?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {game.recurrenceId
                          ? "Este jogo faz parte de uma sequência recorrente. Como deseja prosseguir?"
                          : "Esta ação não pode ser desfeita."
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 mt-0">Cancelar</AlertDialogCancel>

                      {game.recurrenceId ? (
                        <>
                          <AlertDialogAction onClick={() => handleDelete(false)} className="bg-red-900/50 hover:bg-red-900 text-white">
                            Apenas este
                          </AlertDialogAction>
                          <AlertDialogAction onClick={() => handleDelete(true, true)} className="bg-red-600 text-white">
                            Este e futuros
                          </AlertDialogAction>
                        </>
                      ) : (
                        <AlertDialogAction onClick={() => handleDelete()} className="bg-red-600">Excluir</AlertDialogAction>
                      )}
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          <div>
            <span className="text-accent font-display uppercase tracking-widest text-sm mb-2 block">
              Detalhes do Evento
            </span>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-white uppercase leading-tight tracking-tight mb-4">
              {game.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-zinc-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <span className="uppercase tracking-wide text-sm">{game.venue.name}</span>
              </div>
              <div className="w-1 h-1 bg-zinc-700 rounded-full" />
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <span className="uppercase tracking-wide text-sm">{formatDate(game.date)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Col: Info & Details Cards */}
          <div className="lg:col-span-2 space-y-8">

            {/* Info Grid - Cards estilo 'Feature' */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <div className="bg-[#080808] border border-white/5 p-6 rounded-xl flex flex-col items-center justify-center text-center gap-3 hover:border-accent/30 transition-all duration-300 group">
                <Clock className="h-6 w-6 text-zinc-500 group-hover:text-accent transition-colors" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Início</p>
                  <p className="text-xl font-display font-bold text-white">{game.startTime.slice(0, 5)}</p>
                </div>
              </div>

              <div className="bg-[#080808] border border-white/5 p-6 rounded-xl flex flex-col items-center justify-center text-center gap-3 hover:border-accent/30 transition-all duration-300 group">
                <DollarSign className="h-6 w-6 text-zinc-500 group-hover:text-accent transition-colors" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Valor</p>
                  <p className="text-xl font-display font-bold text-white">{formatCurrency(game.pricePerPlayer)}</p>
                </div>
              </div>

              <div className="bg-[#080808] border border-white/5 p-6 rounded-xl flex flex-col items-center justify-center text-center gap-3 hover:border-accent/30 transition-all duration-300 group">
                <Users className="h-6 w-6 text-zinc-500 group-hover:text-accent transition-colors" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Vagas</p>
                  <p className="text-xl font-display font-bold text-white"><span className="text-accent">{confirmedPlayers.length}</span>/{game.maxPlayers}</p>
                </div>
              </div>

              <div className="bg-[#080808] border border-white/5 p-6 rounded-xl flex flex-col items-center justify-center text-center gap-3 hover:border-accent/30 transition-all duration-300 group">
                <Trophy className="h-6 w-6 text-zinc-500 group-hover:text-accent transition-colors" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Nível</p>
                  <p className="text-xl font-display font-bold text-white">PELADA</p>
                </div>
              </div>
            </div>

            {/* Player List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-white uppercase flex items-center gap-2">
                  <span className="w-1 h-6 bg-accent block rounded-full" />
                  Confirmados
                </h3>
                <Badge variant="outline" className="border-zinc-800 text-zinc-400 uppercase tracking-widest">
                  {confirmedPlayers.length} Jogadores
                </Badge>
              </div>

              <div className="bg-[#080808] border border-white/5 rounded-2xl overflow-hidden">
                {confirmedPlayers.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {confirmedPlayers.map((c, i) => (
                      <div key={c.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-zinc-600 font-display font-bold text-lg w-6">{String(i + 1).padStart(2, '0')}</span>
                          <Avatar className="h-10 w-10 border border-zinc-800">
                            <AvatarImage src={c.user?.image} />
                            <AvatarFallback className="bg-zinc-900 text-zinc-500 font-bold">{c.user?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-white text-sm">{c.user?.name}</p>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">{getPlayerTypeLabel(c.user?.playerType)}</p>
                          </div>
                        </div>

                        {c.status === "CONFIRMED" && (
                          <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(197,160,89,0.5)]" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-zinc-500">
                    Nenhum jogador confirmado ainda.
                  </div>
                )}
              </div>
            </div>

            {/* Waiting List */}
            {waitingPlayers.length > 0 && (
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-display font-bold text-zinc-400 uppercase">Lista de Espera</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {waitingPlayers.map((c, i) => (
                    <div key={c.id} className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg flex items-center gap-3">
                      <span className="text-accent font-display">{i + 1}.</span>
                      <span className="text-zinc-300 text-sm">{c.user?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Action Sticky */}
          <div className="space-y-8">

            {!isPast && (
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 sticky top-8 shadow-2xl shadow-black/50">
                <div className="text-center mb-8">
                  <Zap className="h-12 w-12 text-accent mx-auto mb-4" />
                  <h3 className="text-2xl font-display font-bold text-white uppercase mb-2">Garanta sua Vaga</h3>
                  <p className="text-zinc-500 text-sm">Confirme sua presença agora e receba o código PIX automaticamente.</p>
                </div>

                {myConfirmation && myConfirmation.status !== 'DECLINED' ? (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border flex items-center justify-center gap-3 ${myConfirmation.status === 'CONFIRMED'
                      ? 'bg-accent/10 border-accent/20 text-accent'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}>
                      {myConfirmation.status === 'CONFIRMED' ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      <span className="font-display font-bold uppercase tracking-wider">{getConfirmationStatusLabel(myConfirmation.status)}</span>
                    </div>

                    <Button
                      onClick={() => executeConfirmation("REMOVE")}
                      disabled={confirming || (myConfirmation.status === 'CONFIRMED' && !isAdmin)}
                      variant="outline"
                      className="w-full h-12 border-zinc-800 bg-transparent text-zinc-400 hover:text-white hover:border-white/20 uppercase tracking-widest font-display text-sm disabled:opacity-50"
                      title={myConfirmation.status === 'CONFIRMED' && !isAdmin ? "Apenas administradores podem cancelar presenças confirmadas" : ""}
                    >
                      {myConfirmation.status === 'CONFIRMED' && !isAdmin ? "Fale com Admin" : "Cancelar Presença"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myConfirmation?.status === 'DECLINED' && (
                      <div className="p-4 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-400 flex items-center justify-center gap-3 mb-2">
                        <Clock className="h-5 w-5" />
                        <span className="font-display font-bold uppercase tracking-wider">{getConfirmationStatusLabel('DECLINED')}</span>
                      </div>
                    )}
                    <Button
                      onClick={() => handleConfirmation("CONFIRMED")}
                      disabled={confirming || (isFull && !isAdmin)} // Admin can override full
                      className="w-full h-14 bg-accent hover:bg-accent/90 text-black font-display font-bold text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(197,160,89,0.2)] hover:shadow-[0_0_30px_rgba(197,160,89,0.4)] transition-all transform hover:-translate-y-1"
                    >
                      {confirming ? <Loader2 className="animate-spin" /> : (isFull ? "Entrar na Espera" : "Confirmar Presença")}
                    </Button>

                    <Button
                      onClick={() => executeConfirmation("DECLINED")}
                      disabled={confirming}
                      className="w-full h-12 bg-transparent border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 uppercase tracking-widest font-display text-xs"
                    >
                      Não poderei ir
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Admin Panel */}
            {isAdmin && (
              <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-6">
                <h4 className="text-sm font-display font-bold text-zinc-500 uppercase mb-4">Financeiro Admin</h4>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex justify-between">
                    <span>Total Confirmados</span>
                    <span className="text-white">{confirmedPlayers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Arrecadação Prevista</span>
                    <span className="text-accent font-bold">
                      {formatCurrency(confirmedPlayers.reduce((acc, c) => {
                        const price = c.user?.playerType === "GOALKEEPER"
                          ? (game.priceGoalkeeper || 0)
                          : game.pricePerPlayer;
                        return acc + price;
                      }, 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <CpfDialog
        open={showCpfDialog}
        onOpenChange={setShowCpfDialog}
        onSave={handleSaveCpf}
      />
    </div>
  );
}
