"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { Loader } from "@/components/ui/loader";

interface Venue {
    id: string;
    name: string;
    gameType: string;
    capacity: number;
}

export default function EditGamePage() {
    const router = useRouter();
    const params = useParams();
    const gameId = params.id as string;
    const { data: session } = useSession();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
        fetchData();
    }, [session, router, gameId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch venues
            const venuesRes = await fetch("/api/venues");
            const venuesData = await venuesRes.json();
            setVenues(venuesData);

            // Fetch game details
            const gameRes = await fetch(`/api/games/${gameId}`);
            if (!gameRes.ok) {
                throw new Error("Jogo não encontrado");
            }
            const game = await gameRes.json();

            // Format date for input (YYYY-MM-DD)
            const gameDate = new Date(game.date).toISOString().split('T')[0];

            setFormData({
                title: game.title,
                description: game.description || "",
                date: gameDate,
                startTime: game.startTime,
                endTime: game.endTime,
                gameType: game.gameType,
                maxPlayers: game.maxPlayers.toString(),
                pricePerPlayer: game.pricePerPlayer.toString(),
                priceGoalkeeper: game.priceGoalkeeper.toString(),
                billingType: game.billingType,
                venueId: game.venueId,
            });
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message || "Erro ao carregar dados",
                variant: "destructive",
            });
            router.push("/games");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch(`/api/games/${gameId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast({
                    title: "Pelada atualizada!",
                    description: "As alterações foram salvas com sucesso.",
                    variant: "success",
                });
                router.push(`/games/${gameId}`);
            } else {
                const error = await response.json();
                throw new Error(error.error);
            }
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message || "Erro ao salvar alterações",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
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

    if (loading) return <Loader text="Carregando dados da pelada..." />;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <Link href={`/games/${gameId}`}>
                        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight">Editar Pelada</h1>
                        <p className="text-zinc-500 font-medium">Ajuste os detalhes do evento #{gameId.slice(-4)}</p>
                    </div>
                </div>
            </div>

            <Card className="bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/0 via-accent to-accent/0 opacity-50" />
                <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-xl text-white font-display uppercase tracking-widest">Informações Gerais</CardTitle>
                    <CardDescription className="text-zinc-500">Atualize os campos necessários abaixo</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-3 md:col-span-2">
                                <Label htmlFor="title" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Título do Evento</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => handleChange("title", e.target.value)}
                                    placeholder="Ex: Pelada dos Amigos"
                                    className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4"
                                    required
                                />
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="venueId" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Local da Pelada</Label>
                                <Select
                                    value={formData.venueId}
                                    onValueChange={(value) => handleChange("venueId", value)}
                                    required
                                >
                                    <SelectTrigger className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4">
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
                                <Label htmlFor="gameType" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Tipo de Jogo</Label>
                                <Select
                                    value={formData.gameType}
                                    onValueChange={(value) => handleChange("gameType", value)}
                                    required
                                >
                                    <SelectTrigger className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4">
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
                                <Label htmlFor="date" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Data</Label>
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
                                    <Label htmlFor="startTime" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Início</Label>
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
                                    <Label htmlFor="endTime" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Fim</Label>
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
                                <Label htmlFor="maxPlayers" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Vagas de Linha</Label>
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
                                <Label htmlFor="billingType" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Tipo de Cobrança</Label>
                                <Select
                                    value={formData.billingType}
                                    onValueChange={(value) => handleChange("billingType", value)}
                                    required
                                >
                                    <SelectTrigger className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white px-4">
                                        <SelectValue placeholder="Selecione o faturamento" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                                        <SelectItem value="SINGLE">Avulso</SelectItem>
                                        <SelectItem value="MONTHLY">Mensal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="pricePerPlayer" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Valor Linha (R$)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                                    <Input
                                        id="pricePerPlayer"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.pricePerPlayer}
                                        onChange={(e) => handleChange("pricePerPlayer", e.target.value)}
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
                                        className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 h-12 text-white pl-12 pr-4 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 md:col-span-2">
                                <Label htmlFor="description" className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest ml-1">Sobre o Jogo</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                    placeholder="Instruções adicionais, regras do local, etc..."
                                    className="bg-black/50 border-zinc-800 focus:border-accent/50 focus:ring-accent/20 min-h-[100px] text-white p-4"
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
                            <p className="text-zinc-500 text-xs">
                                Campos marcados com * são obrigatórios.
                            </p>
                            <div className="flex gap-3 w-full md:w-auto">
                                <Link href={`/games/${gameId}`} className="flex-1 md:flex-none">
                                    <Button variant="outline" type="button" className="w-full border-zinc-800 text-zinc-400 hover:bg-white/5 uppercase tracking-widest text-xs font-bold h-12">
                                        Cancelar
                                    </Button>
                                </Link>
                                <Button
                                    type="submit"
                                    className="flex-1 md:flex-none bg-accent hover:bg-accent/90 text-black uppercase tracking-widest text-xs font-black h-12 px-8 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Salvar Alterações
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
