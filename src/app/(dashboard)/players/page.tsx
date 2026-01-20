"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
import { getPlayerTypeLabel } from "@/lib/utils";
import { Search, Users, Edit, UserCog, Shield, Loader2 } from "lucide-react";

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

export default function PlayersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);

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
              <Badge className="bg-blue-900/20 text-blue-400 border-blue-900/30 uppercase tracking-wider text-[10px]">Casual</Badge>
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
              <Badge className="bg-yellow-900/20 text-yellow-500 border-yellow-900/30 uppercase tracking-wider text-[10px]">Gol</Badge>
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
                className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors rounded-lg -mx-2 my-1"
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
                      <p className="font-bold text-white">{player.name || "Sem nome"}</p>
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
                    <p className="text-sm text-zinc-500">{player.email}</p>
                    <div className="flex items-center space-x-3 mt-1.5">
                      <Badge variant="outline" className="border-white/10 text-zinc-400 text-[10px] uppercase tracking-wider font-normal">
                        {getPlayerTypeLabel(player.playerType)}
                      </Badge>
                      <span className="text-xs text-zinc-600 flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {player._count.confirmations} jogos
                      </span>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingPlayer(player)}
                    className="text-zinc-600 hover:text-white hover:bg-white/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {filteredPlayers.length === 0 && (
              <p className="text-center text-zinc-600 py-12 italic uppercase text-sm tracking-widest">
                Nenhum jogador encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog - Styled Dark */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl uppercase tracking-wide">Editar Jogador</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Atualize as informações do perfil
            </DialogDescription>
          </DialogHeader>
          {editingPlayer && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Nome</Label>
                <Input
                  value={editingPlayer.name || ""}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, name: e.target.value })
                  }
                  className="bg-zinc-900 border-white/10 text-white focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Telefone</Label>
                <Input
                  value={editingPlayer.phone || ""}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, phone: e.target.value })
                  }
                  className="bg-zinc-900 border-white/10 text-white focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Tipo de Jogador</Label>
                  <Select
                    value={editingPlayer.playerType}
                    onValueChange={(value) =>
                      setEditingPlayer({ ...editingPlayer, playerType: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
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
                  <Label className="text-zinc-400">Função</Label>
                  <Select
                    value={editingPlayer.role}
                    onValueChange={(value) =>
                      setEditingPlayer({ ...editingPlayer, role: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                      <SelectItem value="PLAYER">Jogador</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
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
                  className="h-4 w-4 bg-zinc-900 border-zinc-700 rounded accent-accent"
                />
                <Label htmlFor="isActive" className="text-white cursor-pointer select-none">Usuário Ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlayer(null)} className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5">
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePlayer}
              disabled={saving}
              className="bg-accent text-black hover:bg-white font-bold"
            >
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
