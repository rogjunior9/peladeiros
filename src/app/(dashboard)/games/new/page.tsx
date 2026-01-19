"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Venue {
  id: string;
  name: string;
  gameType: string;
  capacity: number;
}

export default function NewGamePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    gameType: "",
    maxPlayers: "22",
    pricePerPlayer: "",
    priceGoalkeeper: "0",
    billingType: "SINGLE",
    venueId: "",
  });

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") {
      router.push("/games");
      return;
    }
    fetchVenues();
  }, [session, router]);

  const fetchVenues = async () => {
    try {
      const response = await fetch("/api/venues");
      if (response.ok) {
        const data = await response.json();
        setVenues(data);
      }
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Pelada criada!",
          description: "A pelada foi criada com sucesso.",
          variant: "success",
        });
        router.push("/games");
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pelada",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-fill game type based on venue selection
    if (field === "venueId") {
      const selectedVenue = venues.find((v) => v.id === value);
      if (selectedVenue) {
        setFormData((prev) => ({
          ...prev,
          venueId: value,
          gameType: selectedVenue.gameType,
          maxPlayers: selectedVenue.capacity.toString(),
        }));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/games">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Pelada</h1>
          <p className="text-gray-500">Crie uma nova pelada</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacoes da Pelada</CardTitle>
          <CardDescription>Preencha os dados do jogo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Ex: Pelada de Quinta"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venueId">Local *</Label>
                <Select
                  value={formData.venueId}
                  onValueChange={(value) => handleChange("venueId", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gameType">Tipo de Jogo *</Label>
                <Select
                  value={formData.gameType}
                  onValueChange={(value) => handleChange("gameType", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SYNTHETIC_GRASS">Grama Sintetica</SelectItem>
                    <SelectItem value="FUTSAL">Futsal</SelectItem>
                    <SelectItem value="FOOTBALL">Futebol</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Hora Inicio *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange("startTime", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Hora Fim *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleChange("endTime", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPlayers">Maximo de Jogadores *</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min="2"
                  value={formData.maxPlayers}
                  onChange={(e) => handleChange("maxPlayers", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerPlayer">Preco por Jogador (R$) *</Label>
                <Input
                  id="pricePerPlayer"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pricePerPlayer}
                  onChange={(e) => handleChange("pricePerPlayer", e.target.value)}
                  placeholder="30.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceGoalkeeper">Preco Goleiro (R$)</Label>
                <Input
                  id="priceGoalkeeper"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.priceGoalkeeper}
                  onChange={(e) => handleChange("priceGoalkeeper", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingType">Tipo de Faturamento *</Label>
                <Select
                  value={formData.billingType}
                  onValueChange={(value) => handleChange("billingType", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o faturamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Avulso</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Detalhes adicionais sobre a pelada..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/games">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? "Criando..." : "Criar Pelada"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
