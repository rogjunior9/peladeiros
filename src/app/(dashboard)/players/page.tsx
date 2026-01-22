"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { getPlayerTypeLabel, cn } from "@/lib/utils";
import {
  Search,
  Users,
  Edit,
  UserCog,
  Shield,
  Loader2,
  MessageCircle,
  CalendarDays,
  Check,
  X,
  DollarSign
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  email: string;
  image: string;
  phone: string;
  role: string;
  playerType: string;
  isActive: boolean;
  _count: {
    confirmations: number;
    payments: number;
  };
}

interface UserDetail extends Player {
  document: string;
  createdAt: string;
  confirmations: {
    id: string;
    status: string;
    game: {
      id: string;
      title: string;
      date: string;
      pricePerPlayer: number;
    };
  }[];
  payments: {
    id: string;
    amount: number;
    status: string;
    gameId: string | null;
    referenceMonth: string | null;
    createdAt: string;
  }[];
}

export default function PlayersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  const [playerDetails, setPlayerDetails] = useState<UserDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error("Erro ao carregar jogadores:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/users/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPlayerDetails(data);
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (viewingPlayerId) {
      fetchPlayerDetails(viewingPlayerId);
    } else {
      setPlayerDetails(null);
    }
  }, [viewingPlayerId]);

  const handleManualPayment = async (gameId: string, amount: number) => {
    if (!permissionAdmin || !viewingPlayerId || !playerDetails) return;

    setLoadingDetails(true);
    try {
      const existing = playerDetails.payments.find((p) => p.gameId === gameId);

      let url = "/api/payments";
      let method = "POST";
      let body: any = {
        amount: amount,
        method: "CASH",
        userId: viewingPlayerId,
        gameId: gameId,
        status: "CONFIRMED",
        notes: "Pagamento manual registrado pelo Admin"
      };

      if (existing) {
        url = `/api/payments/${existing.id}`;
        method = "PUT";
        body = { status: "CONFIRMED", notes: body.notes };
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast({ title: "Pagamento Registrado", className: "bg-emerald-600 text-white border-none" });
        await fetchPlayerDetails(viewingPlayerId);
      } else {
        throw new Error("Erro ao registrar");
      }
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao registrar pagamento", variant: "destructive" });
    } finally {
      setLoadingDetails(false);
    }
  };

  const permissionAdmin = session?.user?.role === "ADMIN";

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/users/${editingPlayer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPlayer.name,
          phone: editingPlayer.phone,
          playerType: editingPlayer.playerType,
          role: editingPlayer.role,
          isActive: editingPlayer.isActive,
        }),
      });

      if (response.ok) {
        toast({
          title: "Jogador atualizado!",
          className: "bg-zinc-900 border-accent/20 text-white",
        });
        fetchPlayers();
        setEditingPlayer(null);
      } else {
        throw new Error("Erro ao atualizar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar jogador",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.name?.toLowerCase().includes(search.toLowerCase()) ||
      player.email?.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      filterType === "all" || player.playerType === filterType;
    return matchesSearch && matchesType;
  });

  const getPaymentStatus = (
    gameDate: string,
    gameId: string,
    player: UserDetail,
    participationStatus: string
  ) => {
    if (player.playerType === "GOALKEEPER") {
      return participationStatus === "CONFIRMED" ? "EXEMPT" : "NONE";
    }

    let isPaid = false;

    if (player.playerType === "MONTHLY") {
      const monthStr = gameDate.substring(0, 7); // YYYY-MM
      isPaid = player.payments.some(
        (p) => p.referenceMonth === monthStr && p.status === "CONFIRMED"
      );
    } else {
      isPaid = player.payments.some(
        (p) => p.gameId === gameId && p.status === "CONFIRMED"
      );
    }

    return isPaid ? "PAID" : "PENDING";
  };

  const stats = {
    total: players.length,
    monthly: players.filter((p) => p.playerType === "MONTHLY").length,
    casual: players.filter((p) => p.playerType === "CASUAL").length,
    goalkeeper: players.filter((p) => p.playerType === "GOALKEEPER").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">Jogadores</h1>
          <p className="text-zinc-500 mt-1">Gerencie o elenco da pelada</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total</p>
                <p className="text-3xl font-display font-bold text-white">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-zinc-800" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Mensalistas</p>
                <p className="text-3xl font-display font-bold text-accent">{stats.monthly}</p>
              </div>
              <Badge className="bg-accent/10 text-accent border-accent/20 uppercase tracking-wider text-[10px]">Mensal</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Avulsos</p>
                <p className="text-3xl font-display font-bold text-blue-400">{stats.casual}</p>
              </div>
              <Badge className="bg-blue-900/20 text-blue-400 border-blue-900/30 uppercase tracking-wider text-[10px]">Avulso</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Goleiros</p>
                <p className="text-3xl font-display font-bold text-yellow-500">{stats.goalkeeper}</p>
              </div>
              <Badge className="bg-yellow-900/20 text-yellow-500 border-yellow-900/30 uppercase tracking-wider text-[10px]">Goleiro</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600 focus:border-accent"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-48 bg-zinc-950 border-white/10 text-white">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="MONTHLY">Mensalistas</SelectItem>
            <SelectItem value="CASUAL">Avulsos</SelectItem>
            <SelectItem value="GOALKEEPER">Goleiros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Players List */}
      <Card className="bg-zinc-950 border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-display font-bold text-white uppercase tracking-wide">
            Lista de Jogadores <span className="text-zinc-500 ml-2">({filteredPlayers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-white/5">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className={cn(
                  "flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors rounded-lg -mx-2 my-1",
                  isAdmin && "cursor-pointer"
                )}
                onClick={() => isAdmin && setViewingPlayerId(player.id)}
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12 border border-zinc-800">
                    <AvatarImage src={player.image} />
                    <AvatarFallback className="bg-zinc-900 text-zinc-500 font-bold">
                      {player.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-white uppercase tracking-tight">{player.name || "Sem nome"}</p>
                      {player.role === "ADMIN" && (
                        <Badge variant="outline" className="border-accent/30 text-accent text-[10px] uppercase font-bold px-1.5 py-0 h-5">
                          Admin
                        </Badge>
                      )}
                      {!player.isActive && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    {player.phone ? (
                      <div className="flex items-center text-sm text-zinc-400 mt-1">
                        <MessageCircle className="h-3 w-3 mr-1.5 text-emerald-500" />
                        {player.phone}
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1 block">Sem telefone</span>
                    )}
                    <div className="flex items-center space-x-3 mt-1.5">
                      <Badge variant="outline" className="border-white/10 text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
                        {getPlayerTypeLabel(player.playerType)}
                      </Badge>
                      <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest flex items-center">
                        <CalendarDays className="h-3 w-3 mr-1 text-accent/50" />
                        {player._count.confirmations} presenças
                      </span>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPlayer(player);
                    }}
                    className="text-zinc-600 hover:text-accent hover:bg-accent/10"
                  >
                    <UserCog className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {filteredPlayers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <Users className="h-10 w-10 opacity-10 mb-4" />
                <p className="uppercase tracking-[0.2em] font-light italic">Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!viewingPlayerId} onOpenChange={() => setViewingPlayerId(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-white/5 pb-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16 border-2 border-accent/20">
                <AvatarImage src={playerDetails?.image} />
                <AvatarFallback className="bg-zinc-900 text-zinc-500 text-2xl font-bold">
                  {playerDetails?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-3xl font-display font-bold uppercase tracking-tight text-white">
                  {playerDetails?.name || "Carregando..."}
                </DialogTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className="bg-accent/10 text-accent border-accent/20 uppercase text-[10px] font-bold">
                    {playerDetails ? getPlayerTypeLabel(playerDetails.playerType) : "..."}
                  </Badge>
                  <p className="text-zinc-500 text-sm">{playerDetails?.email}</p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {loadingDetails ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Mapeando histórico...</p>
            </div>
          ) : playerDetails && (
            <div className="py-6 space-y-8">
              {/* Histórico de Jogos */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-accent flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Participação em Peladas (Histórico)
                </h3>

                {(() => {
                  const filteredHistory = playerDetails.confirmations.filter(conf => {
                    const isConfirmed = conf.status === "CONFIRMED";
                    const isPast = new Date(conf.game.date) < new Date();
                    return isConfirmed && isPast;
                  });

                  const itemsPerPage = 5;
                  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
                  const paginatedHistory = filteredHistory.slice(
                    (historyPage - 1) * itemsPerPage,
                    historyPage * itemsPerPage
                  );

                  return (
                    <div className="space-y-3">
                      <div className="bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                              <th className="px-4 py-3 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Data / Jogo</th>
                              <th className="px-4 py-3 text-[10px] uppercase font-bold text-zinc-500 tracking-widest text-center">Status</th>
                              <th className="px-4 py-3 text-[10px] uppercase font-bold text-zinc-500 tracking-widest text-right">Pagamento</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {paginatedHistory.map((conf) => {
                              const payStatus = getPaymentStatus(
                                conf.game.date,
                                conf.game.id,
                                playerDetails,
                                conf.status
                              );
                              return (
                                <tr key={conf.id} className="hover:bg-white/[0.01] transition-colors">
                                  <td className="px-4 py-3">
                                    <Link href={`/games/${conf.game.id}`} className="hover:text-accent transition-colors">
                                      <p className="font-bold text-zinc-200">{conf.game.title}</p>
                                    </Link>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{new Date(conf.game.date).toLocaleDateString("pt-BR")}</p>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge variant="outline" className="text-[9px] uppercase font-bold border-white/10 text-zinc-500">
                                      Jogou
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {payStatus === "PAID" && (
                                      <Badge variant="success" className="uppercase text-[9px] font-bold tracking-widest px-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                        <Check className="h-3 w-3 mr-1" /> Pago
                                      </Badge>
                                    )}
                                    {payStatus === "PENDING" && (
                                      <div className="flex items-center justify-end gap-2">
                                        <Badge variant="destructive" className="uppercase text-[9px] font-bold tracking-widest px-2">
                                          <X className="h-3 w-3 mr-1" /> Pendente
                                        </Badge>
                                        {permissionAdmin && (
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 rounded-full hover:bg-emerald-900/30 text-emerald-500"
                                            title="Confirmar Pagamento Manualmente"
                                            onClick={() => handleManualPayment(conf.game.id, conf.game.pricePerPlayer || 0)}
                                          >
                                            <DollarSign className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                    {payStatus === "EXEMPT" && (
                                      <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase text-[9px] font-bold tracking-widest px-2">
                                        <Shield className="h-3 w-3 mr-1" /> Isento
                                      </Badge>
                                    )}
                                    {payStatus === "NONE" && (
                                      <span className="text-zinc-700 text-xs font-mono">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {filteredHistory.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-zinc-600 italic text-xs">
                                  Nenhuma participação confirmada em jogos passados.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {filteredHistory.length > itemsPerPage && (
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                            Página {historyPage} de {totalPages}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] uppercase border-white/10 text-zinc-400 hover:text-white"
                              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                              disabled={historyPage === 1}
                            >
                              Anterior
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] uppercase border-white/10 text-zinc-400 hover:text-white"
                              onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                              disabled={historyPage === totalPages}
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Histórico Financeiro Direto */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-accent flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Transações Diretas
                </h3>
                <div className="grid gap-3">
                  {playerDetails.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                          {p.referenceMonth ? `Ref: ${p.referenceMonth}` : (p.gameId ? 'Pelada Avulsa' : 'Lançamento Manual')}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-white">R$ {p.amount.toFixed(2)}</p>
                        <Badge variant="outline" className={cn(
                          "text-[9px] uppercase font-bold tracking-widest px-2 h-auto",
                          p.status === 'CONFIRMED' ? 'border-emerald-500/50 text-emerald-500' : 'border-yellow-500/50 text-yellow-500'
                        )}>
                          {p.status === 'CONFIRMED' ? 'Confirmado' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {playerDetails.payments.length === 0 && (
                    <p className="text-center text-zinc-600 italic text-xs py-4">Sem histórico financeiro direto</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Styled Dark */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl uppercase tracking-wide">Configurar Jogador</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Ajustes técnicos e permissões de acesso.
            </DialogDescription>
          </DialogHeader>
          {editingPlayer && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Nome de Guerra</Label>
                <Input
                  value={editingPlayer.name || ""}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, name: e.target.value })
                  }
                  className="bg-zinc-900 border-white/10 text-white h-12 focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">WhatsApp</Label>
                <Input
                  value={editingPlayer.phone || ""}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, phone: e.target.value })
                  }
                  className="bg-zinc-900 border-white/10 text-white h-12 focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Categoria</Label>
                  <Select
                    value={editingPlayer.playerType}
                    onValueChange={(value) =>
                      setEditingPlayer({ ...editingPlayer, playerType: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-white/10 text-white h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                      <SelectItem value="MONTHLY">Mensalista</SelectItem>
                      <SelectItem value="CASUAL">Avulso</SelectItem>
                      <SelectItem value="GOALKEEPER">Goleiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Permissões</Label>
                  <Select
                    value={editingPlayer.role}
                    onValueChange={(value) =>
                      setEditingPlayer({ ...editingPlayer, role: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-white/10 text-white h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                      <SelectItem value="PLAYER">Combatente (Player)</SelectItem>
                      <SelectItem value="ADMIN">Estado Maior (Admin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2 bg-black/20 p-4 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingPlayer.isActive}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      isActive: e.target.checked,
                    })
                  }
                  className="h-5 w-5 bg-zinc-900 border-zinc-700 rounded accent-accent cursor-pointer"
                />
                <div>
                  <Label htmlFor="isActive" className="text-white cursor-pointer select-none font-bold uppercase text-xs">Acesso Autorizado</Label>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Define se o jogador pode realizar login e confirmar presença.</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-6 border-t border-white/5">
            <Button variant="ghost" onClick={() => setEditingPlayer(null)} className="text-zinc-500 hover:text-white uppercase tracking-widest text-[10px] font-bold">
              Abortar
            </Button>
            <Button
              onClick={handleUpdatePlayer}
              disabled={saving}
              className="bg-accent text-black hover:bg-white font-bold uppercase tracking-widest text-[10px] px-8"
            >
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Configurações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
