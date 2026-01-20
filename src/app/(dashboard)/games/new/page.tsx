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
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { Loader } from "@/components/ui/loader";

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
  const [fetchingVenues, setFetchingVenues] = useState(true);
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
    isRecurring: false,
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
      setFetchingVenues(true);
      const response = await fetch("/api/venues");
      if (response.ok) {
        const data = await response.json();
        setVenues(data);
      }
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
    } finally {
      setFetchingVenues(false);
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

  const handleChange = (field: string, value: any) => {
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

  if (fetchingVenues) return <Loader text="Carregando locais..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/games">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight">Nova Pelada</h1>
            <p className="text-zinc-500 font-medium">Configure um novo evento para o grupo</p>
          </div>
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/0 via-accent to-accent/0 opacity-50" />
        <CardHeader className="border-b border-white/5 bg-white/[0.02]">
          <CardTitle className="text-xl text-white font-display uppercase tracking-widest">Informações da Pelada</CardTitle>
          <CardDescription className="text-zinc-500">Configuração básica e recorrência</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Recorrência */}
            <div className="bg-accent/5 p-6 rounded-2xl border border-accent/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-1">
                <Label htmlFor="isRecurring" className="text-accent font-bold text-lg flex items-center cursor-pointer">
                  Repetir semanalmente?
                </Label>
                <p className="text-xs text-zinc-500 max-w-md">
                  Se ativado, o sistema criará 26 jogos (6 meses) automaticamente, mantendo o mesmo dia da semana e horário.
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => handleChange("isRecurring", e.target.checked)}
                  className="h-8 w-8 bg-black border-zinc-800 rounded-lg accent-accent cursor-pointer transition-all hover:scale-105"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="title" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Título do Evento *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Ex: Pelada de Quinta"
                  className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="venueId" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Local *</Label>
                <Select
                  value={formData.venueId}
                  onValueChange={(value) => handleChange("venueId", value)}
                  required
                >
                  <SelectTrigger className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4 text-left">
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="gameType" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Tipo de Jogo *</Label>
                <Select
                  value={formData.gameType}
                  onValueChange={(value) => handleChange("gameType", value)}
                  required
                >
                  <SelectTrigger className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4 text-left">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectItem value="SYNTHETIC_GRASS">Grama Sintética</SelectItem>
                    <SelectItem value="FUTSAL">Futsal</SelectItem>
                    <SelectItem value="FOOTBALL">Futebol</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="date" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4 block w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="startTime" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Início *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange("startTime", e.target.value)}
                    className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="endTime" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Fim *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange("endTime", e.target.value)}
                    className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="maxPlayers" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Máximo de Jogadores *</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min="2"
                  value={formData.maxPlayers}
                  onChange={(e) => handleChange("maxPlayers", e.target.value)}
                  className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="billingType" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Faturamento *</Label>
                <Select
                  value={formData.billingType}
                  onValueChange={(value) => handleChange("billingType", value)}
                  required
                >
                  <SelectTrigger className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4 text-left">
                    <SelectValue placeholder="Selecione o faturamento" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectItem value="SINGLE">Avulso</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="pricePerPlayer" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Valor por Jogador (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                  <Input
                    id="pricePerPlayer"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pricePerPlayer}
                    onChange={(e) => handleChange("pricePerPlayer", e.target.value)}
                    placeholder="0.00"
                    className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white pl-12 pr-4 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="priceGoalkeeper" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Valor Goleiro (R$)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                  <Input
                    id="priceGoalkeeper"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.priceGoalkeeper}
                    onChange={(e) => handleChange("priceGoalkeeper", e.target.value)}
                    placeholder="0.00"
                    className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white pl-12 pr-4 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="description" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Informações Adicionais</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Instruções para os jogadores..."
                  className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 min-h-[100px] text-white p-4"
                  rows={4}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
              <p className="text-zinc-500 text-xs">
                * Campos obrigatórios. A cobrança é gerada automaticamente no ato da confirmação.
              </p>
              <div className="flex gap-3 w-full md:w-auto">
                <Link href="/games" className="flex-1 md:flex-none">
                  <Button variant="outline" type="button" className="w-full border-zinc-800 text-zinc-400 hover:bg-white/5 uppercase tracking-widest text-xs font-bold h-12">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 md:flex-none bg-accent hover:bg-accent/90 text-black uppercase tracking-widest text-xs font-black h-12 px-8 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Pelada
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

