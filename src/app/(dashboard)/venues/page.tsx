"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, getGameTypeLabel } from "@/lib/utils";
import { MapPin, Plus, Edit, Trash2, Users, Calendar } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  pricePerHour: number;
  gameType: string;
  capacity: number;
  isActive: boolean;
  _count: {
    games: number;
  };
}

const emptyVenue = {
  name: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  pricePerHour: "",
  gameType: "SYNTHETIC_GRASS",
  capacity: "22",
};

export default function VenuesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [formData, setFormData] = useState(emptyVenue);
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const response = await fetch("/api/venues");
      if (response.ok) {
        const data = await response.json();
        setVenues(data);
      }
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (venue?: Venue) => {
    if (venue) {
      setEditingVenue(venue);
      setFormData({
        name: venue.name,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        zipCode: venue.zipCode || "",
        phone: venue.phone || "",
        pricePerHour: venue.pricePerHour?.toString() || "",
        gameType: venue.gameType,
        capacity: venue.capacity.toString(),
      });
    } else {
      setEditingVenue(null);
      setFormData(emptyVenue);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const url = editingVenue
        ? `/api/venues/${editingVenue.id}`
        : "/api/venues";
      const method = editingVenue ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: editingVenue ? "Local atualizado!" : "Local criado!",
          variant: "success",
        });
        fetchVenues();
        setDialogOpen(false);
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar local",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este local?")) return;

    try {
      const response = await fetch(`/api/venues/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Local excluido!",
          variant: "success",
        });
        fetchVenues();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir local",
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

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          Apenas administradores podem gerenciar locais
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locais</h1>
          <p className="text-gray-500">Gerencie os locais das peladas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Local
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingVenue ? "Editar Local" : "Novo Local"}
              </DialogTitle>
              <DialogDescription>
                Preencha as informacoes do local
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Nome do local"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Jogo *</Label>
                  <Select
                    value={formData.gameType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gameType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SYNTHETIC_GRASS">
                        Grama Sintetica
                      </SelectItem>
                      <SelectItem value="FUTSAL">Futsal</SelectItem>
                      <SelectItem value="FOOTBALL">Futebol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereco *</Label>
                <Input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Rua, numero"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) =>
                      setFormData({ ...formData, zipCode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preco/Hora (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pricePerHour}
                    onChange={(e) =>
                      setFormData({ ...formData, pricePerHour: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacidade</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Venues List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <Card key={venue.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{venue.name}</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {venue.city}, {venue.state}
                  </CardDescription>
                </div>
                <Badge variant="outline">{getGameTypeLabel(venue.gameType)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>{venue.address}</p>
                {venue.phone && <p>Tel: {venue.phone}</p>}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {venue.capacity}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {venue._count.games} jogos
                  </span>
                </div>
                {venue.pricePerHour && (
                  <span className="font-medium text-green-600">
                    {formatCurrency(venue.pricePerHour)}/h
                  </span>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDialog(venue)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(venue.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {venues.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">Nenhum local cadastrado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
