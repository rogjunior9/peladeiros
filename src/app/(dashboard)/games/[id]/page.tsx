"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
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
  Copy,
  ExternalLink,
  MessageCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CpfDialog } from "@/components/CpfDialog";

const MAX_GOALKEEPERS = 4;

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
    isGuest?: boolean;
    guestName?: string | null;
    user?: {
      id: string;
      name: string;
      email: string;
      image: string;
      playerType: string;
    } | null;
  }>;
  payments: Array<{
    id: string;
    userId: string;
    status: string;
    amount: number;
    method: string;
  }>;
  monthlyPaidUserIds?: string[];
  referenceMonth?: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  playerType: string;
  isActive: boolean;
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
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPlayerType, setGuestPlayerType] = useState<"CASUAL" | "GOALKEEPER">("CASUAL");
  const [monthlyFeeAmount, setMonthlyFeeAmount] = useState(60);
  const [adminSaving, setAdminSaving] = useState(false);
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [chargePhone, setChargePhone] = useState("");
  const [chargeLoading, setChargeLoading] = useState(false);
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [generatedPix, setGeneratedPix] = useState<{
    userName: string;
    amount: number;
    pixCode: string;
    pixQrCode?: string | null;
    phone?: string | null;
  } | null>(null);
  const [selectedChargeParticipant, setSelectedChargeParticipant] = useState<{
    userId: string;
    userName: string;
    playerType: string;
    amount: number;
  } | null>(null);

  const isAdmin = session?.user?.role === "ADMIN";
  const gameId = params.id as string;

  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch(`/api/users/${session?.user?.id}`);
      if (res.ok) setUserProfile(await res.json());
    } catch (e) { }
  }, [session?.user?.id]);

  const fetchGame = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`, { cache: "no-store" });
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
  }, [gameId, router]);

  useEffect(() => {
    fetchGame();
    fetchUserProfile();
  }, [fetchGame, fetchUserProfile]);

  const fetchAdminUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await fetch("/api/users?isActive=true");
      if (response.ok) {
        setAdminUsers(await response.json());
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data?.monthlyFee === "number" && data.monthlyFee > 0) {
          setMonthlyFeeAmount(data.monthlyFee);
        }
      } catch (error) {
        console.error("Erro ao carregar configuração de mensalidade:", error);
      }
    };
    fetchSettings();
  }, [isAdmin]);

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

  const getPaymentForUser = useCallback((userId: string) => {
    if (!game) return null;
    const userPayments = game.payments.filter((payment) => payment.userId === userId);
    if (userPayments.length === 0) return null;

    const confirmedPayment = userPayments.find((payment) => payment.status === "CONFIRMED");
    if (confirmedPayment) return confirmedPayment;

    return userPayments[0];
  }, [game]);

  const isMonthlyPaidForGame = useCallback((userId: string, playerType?: string) => {
    if (!game || playerType !== "MONTHLY") return false;
    return (game.monthlyPaidUserIds || []).includes(userId);
  }, [game]);

  const handleAdminAddParticipant = async () => {
    if (!selectedUserId) return;
    setAdminSaving(true);
    try {
      const response = await fetch(`/api/games/${gameId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, status: "CONFIRMED" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao adicionar participante");
      }
      toast({ title: "Participante adicionado", variant: "success" });
      setSelectedUserId("");
      await fetchGame();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminAddGuest = async () => {
    if (!guestName.trim()) return;
    setAdminSaving(true);
    try {
      const response = await fetch(`/api/games/${gameId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guestName.trim(),
          guestPlayerType,
          status: "CONFIRMED",
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao adicionar convidado");
      }
      toast({ title: "Convidado adicionado", variant: "success" });
      setGuestName("");
      setGuestPlayerType("CASUAL");
      await fetchGame();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminRemoveParticipant = async (userId: string) => {
    setAdminSaving(true);
    try {
      const response = await fetch(`/api/games/${gameId}/participants?userId=${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao remover participante");
      }
      toast({ title: "Participação removida", variant: "success" });
      await fetchGame();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminMarkPaid = async (userId: string, playerType: string) => {
    if (!game) return;
    const amount = playerType === "GOALKEEPER" ? (game.priceGoalkeeper || 0) : game.pricePerPlayer;
    const currentPayment = getPaymentForUser(userId);
    const isMonthly = playerType === "MONTHLY";

    setAdminSaving(true);
    try {
      if (isMonthly) {
        const response = await fetch("/api/finance/monthly-fees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            month: game.referenceMonth || game.date.slice(0, 7),
            amount: monthlyFeeAmount,
            method: "CASH",
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Falha ao registrar mensalidade");
        }

        toast({
          title: "Mensalidade confirmada",
          description: "As peladas do mês para esse jogador serão consideradas pagas.",
          variant: "success",
        });
        await fetchGame();
        return;
      }

      if (currentPayment) {
        const response = await fetch(`/api/payments/${currentPayment.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "CONFIRMED",
            notes: "Pagamento manual confirmado pelo admin",
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Falha ao atualizar pagamento");
        }
      } else {
        const response = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            gameId: game.id,
            amount,
            method: "CASH",
            status: "CONFIRMED",
            notes: "Pagamento manual registrado pelo admin",
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Falha ao registrar pagamento");
        }
      }

      toast({ title: "Pagamento confirmado", variant: "success" });
      await fetchGame();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminUndoManualPayment = async (paymentId: string) => {
    setAdminSaving(true);
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PENDING",
          notes: "Pagamento manual desfeito pelo admin",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Falha ao desfazer pagamento");
      }

      toast({ title: "Pagamento desfeito", variant: "success" });
      await fetchGame();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setAdminSaving(false);
    }
  };

  const normalizePhoneForWhatsApp = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("55")) return digits;
    return `55${digits}`;
  };

  const openChargeDialog = (userId: string, userName: string, playerType: string) => {
    if (!game) return;
    const user = adminUsers.find((u) => u.id === userId);
    setChargePhone(user?.phone || "");
    setSelectedChargeParticipant({
      userId,
      userName,
      playerType,
      amount: playerType === "GOALKEEPER" ? (game.priceGoalkeeper || 0) : game.pricePerPlayer,
    });
    setChargeDialogOpen(true);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedChargeParticipant || !game) return;
    setChargeLoading(true);
    try {
      const response = await fetch("/api/payments/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedChargeParticipant.userId,
          gameId: game.id,
          amount: selectedChargeParticipant.amount,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Falha ao gerar invoice");
      }

      if (data?.invoiceUrl) {
        window.open(data.invoiceUrl, "_blank", "noopener,noreferrer");
      }

      toast({
        title: "Invoice gerado",
        description: "Link do PagSeguro aberto em nova aba.",
        variant: "success",
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setChargeLoading(false);
    }
  };

  const handleGeneratePixCharge = async () => {
    if (!selectedChargeParticipant || !game) return;
    setChargeLoading(true);
    try {
      const response = await fetch("/api/payments/pix-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedChargeParticipant.userId,
          gameId: game.id,
          amount: selectedChargeParticipant.amount,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Falha ao gerar PIX");
      }

      const pixCode = typeof data?.payment?.pixCode === "string" ? data.payment.pixCode : "";
      if (!pixCode) {
        throw new Error("PIX gerado sem codigo de copia e cola");
      }

      const pixQrCode = typeof data?.payment?.pixQrCode === "string" ? data.payment.pixQrCode : "";
      const phone = typeof data?.user?.phone === "string" ? data.user.phone : chargePhone;
      const amount = typeof data?.payment?.amount === "number" ? data.payment.amount : selectedChargeParticipant.amount;

      setGeneratedPix({
        userName: selectedChargeParticipant.userName,
        amount,
        pixCode,
        pixQrCode,
        phone,
      });
      setPixDialogOpen(true);

      toast({
        title: data?.reused ? "PIX pendente reutilizado" : "PIX gerado",
        description: `Cobrança pronta para ${selectedChargeParticipant.userName}.`,
        variant: "success",
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao gerar PIX", variant: "destructive" });
    } finally {
      setChargeLoading(false);
    }
  };

  const handleCopyGeneratedPix = async () => {
    if (!generatedPix?.pixCode) return;
    try {
      await navigator.clipboard.writeText(generatedPix.pixCode);
      toast({ title: "PIX copiado", variant: "success" });
    } catch {
      toast({ title: "Erro ao copiar PIX", variant: "destructive" });
    }
  };

  const handleSendGeneratedPixWhatsApp = () => {
    if (!generatedPix || !game) return;
    const normalizedPhone = normalizePhoneForWhatsApp(generatedPix.phone || "");
    if (!normalizedPhone) {
      toast({ title: "Jogador sem telefone cadastrado", variant: "destructive" });
      return;
    }

    const amount = generatedPix.amount.toFixed(2).replace(".", ",");
    const date = formatDate(game.date);
    const message = [
      `Fala, ${generatedPix.userName}! Tudo bem?`,
      `Sua cobrança da pelada ${game.title} (${date}) é de R$ ${amount}.`,
      "",
      "PIX copia e cola:",
      generatedPix.pixCode,
      "",
      "Depois me envia o comprovante, por favor.",
    ].join("\n");

    window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const handleOpenWhatsAppCharge = () => {
    if (!selectedChargeParticipant || !game) return;

    const playerName = selectedChargeParticipant.userName;
    const amount = selectedChargeParticipant.amount.toFixed(2).replace(".", ",");
    const date = formatDate(game.date);
    const message =
      `Fala, ${playerName}! Tudo bem?%0A` +
      `Sua cobrança da pelada ${game.title} (${date}) é de R$ ${amount}.%0A` +
      `Faz o PIX para contato@rogeriojunior.com.br e me envia o comprovante.`;

    const normalizedPhone = normalizePhoneForWhatsApp(chargePhone);
    const whatsappUrl = normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setChargeDialogOpen(false);
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
  const confirmedGoalkeepers = confirmedPlayers.filter(c => c.user?.playerType === "GOALKEEPER");
  const confirmedLinePlayers = confirmedPlayers.filter(c => c.user?.playerType !== "GOALKEEPER");
  const waitingPlayers = game.confirmations.filter(c => c.status === "WAITING_LIST");
  const isPast = new Date(game.date) < new Date();
  const isGoalkeeperUser = session?.user?.playerType === "GOALKEEPER";
  const isFull = isGoalkeeperUser
    ? confirmedGoalkeepers.length >= MAX_GOALKEEPERS
    : confirmedLinePlayers.length >= game.maxPlayers;
  const availableUsers = adminUsers.filter(
    (user) => !confirmedPlayers.some((confirmation) => confirmation.user?.id === user.id)
  );
  const paidTotal = confirmedPlayers.reduce((acc, confirmation) => {
    if (!confirmation.user?.id) return acc;
    const isGoalkeeper = confirmation.user.playerType === "GOALKEEPER";
    const goalkeeperAmount = game.priceGoalkeeper || 0;
    if (isGoalkeeper && goalkeeperAmount <= 0) return acc;
    if (confirmation.user.playerType === "MONTHLY") return acc;
    const payment = getPaymentForUser(confirmation.user.id);
    if (payment?.status === "CONFIRMED") {
      const defaultAmount = isGoalkeeper ? goalkeeperAmount : game.pricePerPlayer;
      return acc + (typeof payment.amount === "number" && payment.amount > 0 ? payment.amount : defaultAmount);
    }
    return acc;
  }, 0);

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
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Vagas Linha</p>
                  <p className="text-xl font-display font-bold text-white"><span className="text-accent">{confirmedLinePlayers.length}</span>/{game.maxPlayers}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Goleiros {confirmedGoalkeepers.length}/{MAX_GOALKEEPERS}</p>
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
                    {confirmedPlayers.length} Confirmados
                  </Badge>
                </div>

              {isAdmin && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Adicionar participante manualmente</p>
                  <div className="flex flex-col md:flex-row gap-2 mb-3">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="h-10 bg-black border border-zinc-800 rounded-md px-3 text-sm text-white flex-1"
                    >
                      <option value="">Selecione um jogador</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({getPlayerTypeLabel(user.playerType)})
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAdminAddParticipant}
                      disabled={!selectedUserId || adminSaving}
                      className="h-10 bg-accent text-black hover:bg-accent/90 uppercase tracking-wider"
                    >
                      Adicionar
                    </Button>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Nome do jogador não cadastrado"
                      className="h-10 bg-black border border-zinc-800 rounded-md px-3 text-sm text-white flex-1"
                    />
                    <select
                      value={guestPlayerType}
                      onChange={(e) => setGuestPlayerType(e.target.value as "CASUAL" | "GOALKEEPER")}
                      className="h-10 bg-black border border-zinc-800 rounded-md px-3 text-sm text-white"
                    >
                      <option value="CASUAL">Avulso</option>
                      <option value="GOALKEEPER">Goleiro</option>
                    </select>
                    <Button
                      onClick={handleAdminAddGuest}
                      disabled={!guestName.trim() || adminSaving}
                      variant="outline"
                      className="h-10 border-zinc-700 text-zinc-300 uppercase tracking-wider"
                    >
                      Adicionar avulso
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">
                    O avulso será criado no banco e poderá ser vinculado na aba Jogadores.
                  </p>
                </div>
              )}

              <div className="bg-[#080808] border border-white/5 rounded-2xl overflow-hidden">
                {confirmedPlayers.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {confirmedPlayers.map((c, i) => (
                      <div key={c.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-zinc-600 font-display font-bold text-lg w-6">{String(i + 1).padStart(2, '0')}</span>
                          <Avatar className="h-10 w-10 border border-zinc-800">
                            <AvatarImage src={c.user?.image} />
                            <AvatarFallback className="bg-zinc-900 text-zinc-500 font-bold">
                              {(c.user?.name || c.guestName || "?")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-white text-sm">{c.user?.name || c.guestName}</p>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">
                              {c.user?.playerType ? getPlayerTypeLabel(c.user.playerType) : "Convidado"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAdmin && c.user && (
                            <>
                              {c.user.playerType === "GOALKEEPER" && (game.priceGoalkeeper || 0) <= 0 ? (
                                <Badge className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/40 uppercase text-[10px]">
                                  Isento
                                </Badge>
                              ) : c.user.playerType === "MONTHLY" ? (
                                <>
                                  {isMonthlyPaidForGame(c.user.id, c.user.playerType) ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 uppercase text-[10px]">
                                      Mensalidade Paga
                                    </Badge>
                                  ) : (
                                    <>
                                      <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/40 uppercase text-[10px]">
                                        Mensalidade Pendente
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-zinc-700 text-zinc-300 text-xs uppercase tracking-wider"
                                        disabled={adminSaving}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAdminMarkPaid(c.user!.id, c.user!.playerType);
                                        }}
                                      >
                                        Registrar Mensalidade
                                      </Button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  {(() => {
                                    const payment = getPaymentForUser(c.user!.id);
                                    const isManualConfirmed = payment?.status === "CONFIRMED" && payment?.method === "CASH";
                                    const isConfirmed = payment?.status === "CONFIRMED";
                                    if (isConfirmed) {
                                      return (
                                        <>
                                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 uppercase text-[10px]">
                                            Pago
                                          </Badge>
                                          {isManualConfirmed && payment?.id && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8 border-amber-900 text-amber-400 text-xs uppercase tracking-wider"
                                              disabled={adminSaving}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAdminUndoManualPayment(payment.id);
                                              }}
                                            >
                                              Desfazer Pago
                                            </Button>
                                          )}
                                        </>
                                      );
                                    }

                                    return (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-zinc-700 text-zinc-300 text-xs uppercase tracking-wider"
                                        disabled={adminSaving}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAdminMarkPaid(c.user!.id, c.user!.playerType || "CASUAL");
                                        }}
                                      >
                                        Marcar Pago
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-blue-900 text-blue-400 text-xs uppercase tracking-wider"
                                        disabled={adminSaving}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openChargeDialog(
                                            c.user!.id,
                                            c.user!.name || "Jogador",
                                            c.user!.playerType || "CASUAL"
                                          );
                                        }}
                                      >
                                        Gerar Cobrança
                                      </Button>
                                    </>
                                    );
                                  })()}
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-red-900 text-red-400 text-xs uppercase tracking-wider"
                                disabled={adminSaving}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdminRemoveParticipant(c.user!.id);
                                }}
                              >
                                Remover
                              </Button>
                            </>
                          )}
                          {c.status === "CONFIRMED" && (
                            <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(197,160,89,0.5)]" />
                          )}
                        </div>
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
                    <span>Arrecadação Avulsa Prevista</span>
                    <span className="text-accent font-bold">
                      {formatCurrency(confirmedPlayers.reduce((acc, c) => {
                        const user = c.user;
                        if (!user?.id) return acc;
                        if (user.playerType === "GOALKEEPER") {
                          return acc + ((game.priceGoalkeeper || 0) > 0 ? (game.priceGoalkeeper || 0) : 0);
                        }
                        if (user.playerType === "MONTHLY") return acc;
                        return acc + game.pricePerPlayer;
                      }, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Arrecadação Avulsa Confirmada</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(paidTotal)}</span>
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

      <Dialog open={chargeDialogOpen} onOpenChange={setChargeDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wide">Gerar Cobrança</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Escolha como deseja cobrar {selectedChargeParticipant?.userName || "o jogador"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              Valor: <span className="text-white font-bold">{formatCurrency(selectedChargeParticipant?.amount || 0)}</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">WhatsApp (com DDD)</label>
              <input
                value={chargePhone}
                onChange={(e) => setChargePhone(e.target.value)}
                placeholder="11999999999"
                className="h-10 w-full bg-black border border-zinc-800 rounded-md px-3 text-sm text-white"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-emerald-900 text-emerald-400"
              onClick={handleGeneratePixCharge}
              disabled={chargeLoading}
            >
              {chargeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Gerar PIX
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto border-zinc-700 text-zinc-300"
              onClick={handleOpenWhatsAppCharge}
              disabled={chargeLoading}
            >
              Mensagem WhatsApp PIX
            </Button>
            <Button
              className="w-full sm:w-auto bg-accent text-black hover:bg-accent/90"
              onClick={handleGenerateInvoice}
              disabled={chargeLoading}
            >
              {chargeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Invoice PagSeguro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pixDialogOpen} onOpenChange={setPixDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wide">PIX da Cobrança</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Código pronto para {generatedPix?.userName || "jogador"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              Valor: <span className="text-white font-bold">{formatCurrency(generatedPix?.amount || 0)}</span>
            </div>
            <div className="rounded-md border border-zinc-800 bg-black p-3 text-xs break-all text-zinc-300">
              {generatedPix?.pixCode || "Código PIX não disponível"}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
            {generatedPix?.pixQrCode ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto border-zinc-700 text-zinc-300"
                onClick={() => window.open(generatedPix.pixQrCode || "", "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir QR
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="w-full sm:w-auto border-emerald-900 text-emerald-400"
              onClick={handleSendGeneratedPixWhatsApp}
              disabled={!generatedPix?.phone}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar WhatsApp
            </Button>
            <Button className="w-full sm:w-auto bg-accent text-black hover:bg-accent/90" onClick={handleCopyGeneratedPix}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar PIX
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
