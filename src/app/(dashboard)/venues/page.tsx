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
import { Loader } from "@/components/ui/loader";
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
  googleMapsLink?: string | null;
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
  googleMapsLink: "",
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
        googleMapsLink: venue.googleMapsLink || "",
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
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader />
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

              <div className="space-y-2">
                <Label>Link do Google Maps</Label>
                <Input
                  value={formData.googleMapsLink}
                  onChange={(e) =>
                    setFormData({ ...formData, googleMapsLink: e.target.value })
                  }
                  placeholder="https://maps.app.goo.gl/..."
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
            <CardContent className="space-y-4">
              <a
                href={venue.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.address}, ${venue.city} - ${venue.state}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block group relative aspect-video w-full overflow-hidden rounded-md bg-muted"
              >
                <img
                  src={`https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`}
                  alt={venue.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span className="text-xs font-medium">Abrir no Maps</span>
                </div>
              </a>

              <div className="space-y-1">
                <p className="text-sm font-medium text-white">{venue.name}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{venue.address}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center" title="Capacidade">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    {venue.capacity}
                  </span>
                  <span className="flex items-center" title="Jogos realizados">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {venue._count.games}
                  </span>
                </div>
                {venue.pricePerHour && (
                  <span className="text-sm font-bold text-green-500">
                    {formatCurrency(venue.pricePerHour)}/h
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => handleOpenDialog(venue)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-400 hover:bg-red-950/20"
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
    </div >
  );
}
