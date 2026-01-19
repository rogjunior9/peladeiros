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
import { Search, Users, Edit } from "lucide-react";

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
          variant: "success",
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-green-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jogadores</h1>
        <p className="text-gray-500">Gerencie os jogadores da pelada</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Mensalistas</p>
                <p className="text-2xl font-bold text-green-600">{stats.monthly}</p>
              </div>
              <Badge variant="success">MONTHLY</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avulsos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.casual}</p>
              </div>
              <Badge variant="info">CASUAL</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Goleiros</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.goalkeeper}</p>
              </div>
              <Badge variant="warning">GOALKEEPER</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar jogadores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="MONTHLY">Mensalistas</SelectItem>
                <SelectItem value="CASUAL">Avulsos</SelectItem>
                <SelectItem value="GOALKEEPER">Goleiros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Players List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Jogadores ({filteredPlayers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-white"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={player.image} />
                    <AvatarFallback>
                      {player.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{player.name || "Sem nome"}</p>
                      {player.role === "ADMIN" && (
                        <Badge variant="success" className="text-xs">
                          Admin
                        </Badge>
                      )}
                      {!player.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{player.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">
                        {getPlayerTypeLabel(player.playerType)}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {player._count.confirmations} participacoes
                      </span>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingPlayer(player)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {filteredPlayers.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Nenhum jogador encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Jogador</DialogTitle>
            <DialogDescription>
              Atualize as informacoes do jogador
            </DialogDescription>
          </DialogHeader>
          {editingPlayer && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingPlayer.name || ""}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editingPlayer.phone || ""}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Jogador</Label>
                <Select
                  value={editingPlayer.playerType}
                  onValueChange={(value) =>
                    setEditingPlayer({ ...editingPlayer, playerType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Mensalista</SelectItem>
                    <SelectItem value="CASUAL">Avulso</SelectItem>
                    <SelectItem value="GOALKEEPER">Goleiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Funcao</Label>
                <Select
                  value={editingPlayer.role}
                  onValueChange={(value) =>
                    setEditingPlayer({ ...editingPlayer, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAYER">Jogador</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
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
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive">Ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlayer(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePlayer}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
