"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, Shield, Hand, User, MessageCircle, MapPin } from "lucide-react";
import { cn, getPlayerTypeLabel } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

export function LoginOnboarding() {
    const { data: session, update } = useSession();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        playerType: "",
        name: "",
        phone: "",
        neighborhood: "", // Used only for WhatsApp message
    });

    const [systemSettings, setSystemSettings] = useState<any>(null);

    useEffect(() => {
        // Open if user is logged in but has no phone set up (proxy for first login/incomplete profile)
        if (session?.user && !session.user.phone) {
            setFormData(prev => ({ ...prev, name: session.user.name || "" }));
            setOpen(true);
            fetchSettings();
        }
    }, [session]);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                setSystemSettings(data);
            }
        } catch (e) {
            console.error("Erro ao carregar configurações", e);
        }
    };

    const maskPhone = (value: string) => {
        return value
            .replace(/\D/g, "")
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .replace(/(-\d{4})\d+?$/, "$1");
    };

    const handleNext = async () => {
        if (step === 1 && !formData.playerType) {
            toast({ title: "Selecione uma opção", variant: "destructive" });
            return;
        }
        if (step === 2) {
            if (!formData.name || !formData.phone || formData.phone.length < 14) {
                toast({ title: "Preencha seus dados corretamente", description: "Nome e Telefone são obrigatórios", variant: "destructive" });
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const rawPhone = formData.phone.replace(/\D/g, "");

            const response = await fetch(`/api/users/${session?.user?.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    phone: rawPhone,
                    playerType: formData.playerType,
                }),
            });

            if (response.ok) {
                await update(); // Update session
                setOpen(false);
                toast({
                    title: "Bem-vindo ao Peladeiros!",
                    description: "Seu cadastro foi concluído com sucesso.",
                    className: "bg-green-600 border-none text-white"
                });
            } else {
                throw new Error("Erro ao salvar");
            }
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível salvar seus dados.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const openWhatsApp = () => {
        const text = `Oi, ainda nao estou no grupo, sou ${formData.name} e moro ${formData.neighborhood || "em ..."}`;
        window.open(`https://wa.me/5531982568466?text=${encodeURIComponent(text)}`, "_blank");
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl [&>button]:hidden max-h-[85vh] overflow-y-auto">
                <div className="space-y-1">
                    {step === 1 && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-display uppercase tracking-wide text-center">
                                    Bem-vindo ao <span className="text-accent">Peladeiros</span>
                                </DialogTitle>
                                <DialogDescription className="text-center text-zinc-400">
                                    Para começarmos, qual será sua modalidade principal?
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 mt-4 md:grid-cols-3">
                                {[
                                    {
                                        id: "CASUAL",
                                        label: "Avulso",
                                        price: "R$ 20,00",
                                        desc: "Paga apenas por jogo que participar.",
                                        icon: User
                                    },
                                    {
                                        id: "MONTHLY",
                                        label: "Mensalista",
                                        price: systemSettings?.monthlyFee ? `R$ ${systemSettings.monthlyFee.toFixed(2).replace(".", ",")}` : "R$ 60,00",
                                        desc: "Valor fixo mensal. Garante vaga (sujeito a confirmação).",
                                        icon: Shield
                                    },
                                    {
                                        id: "GOALKEEPER",
                                        label: "Goleiro",
                                        price: "Grátis",
                                        desc: "Isento de pagamento. Fundamental para o jogo!",
                                        icon: Hand
                                    }
                                ].map((type) => (
                                    <div
                                        key={type.id}
                                        onClick={() => setFormData({ ...formData, playerType: type.id })}
                                        className={cn(
                                            "cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-105",
                                            formData.playerType === type.id
                                                ? "border-accent bg-accent/10"
                                                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                                        )}
                                    >
                                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-white/10">
                                            <type.icon className={cn("h-5 w-5", formData.playerType === type.id ? "text-accent" : "text-zinc-500")} />
                                        </div>
                                        <h3 className="font-display font-bold uppercase">{type.label}</h3>
                                        <p className="text-accent font-bold text-sm mt-1">{type.price}</p>
                                        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{type.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 mt-4 text-center">
                                <p className="text-sm text-blue-200">
                                    <span className="font-bold uppercase text-xs tracking-wider block mb-1">Regra de Ouro</span>
                                    Usamos coletes azul e vermelho. Mantenha sempre a cordialidade e o respeito em campo.
                                </p>
                            </div>

                            <Button onClick={handleNext} disabled={!formData.playerType} className="w-full mt-4 bg-accent text-black hover:bg-white font-bold uppercase tracking-widest">
                                Continuar
                            </Button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-display uppercase tracking-wide">
                                    Identificação
                                </DialogTitle>
                                <DialogDescription className="text-zinc-400">
                                    Precisamos de alguns dados para identificar você no grupo e nas listas.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Seu Nome Completo</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-zinc-900 border-zinc-800 focus:border-accent"
                                        placeholder="Como você gostaria de ser chamado?"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Celular (WhatsApp)</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                                        className="bg-zinc-900 border-zinc-800 focus:border-accent"
                                        placeholder="(31) 99999-9999"
                                        maxLength={15}
                                    />
                                    <p className="text-[10px] text-zinc-500">
                                        Importante: Use o número que está (ou entrará) no grupo do WhatsApp.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Bairro (Opcional)</Label>
                                    <Input
                                        value={formData.neighborhood}
                                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                                        className="bg-zinc-900 border-zinc-800 focus:border-accent"
                                        placeholder="Para facilitar caronas e identificação"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-zinc-700 hover:bg-zinc-800 hover:text-white">
                                    Voltar
                                </Button>
                                <Button onClick={handleNext} className="flex-1 bg-accent text-black hover:bg-white font-bold uppercase tracking-widest">
                                    Próximo
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-display uppercase tracking-wide">
                                    Grupo do WhatsApp
                                </DialogTitle>
                                <DialogDescription className="text-zinc-400">
                                    A comunicação oficial acontece por lá. Você já está no grupo?
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col gap-4 mt-6">
                                <Button
                                    onClick={handleFinish}
                                    disabled={loading}
                                    className="h-14 bg-emerald-600/20 border border-emerald-600 text-emerald-500 hover:bg-emerald-600 hover:text-white text-lg font-bold uppercase tracking-wide"
                                >
                                    {loading ? <CheckCircle className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                                    Sim, já estou no grupo
                                </Button>

                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800"></span></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-950 px-2 text-zinc-500">Ou</span></div>
                                </div>

                                <div className="text-center space-y-4">
                                    <p className="text-sm text-zinc-400">
                                        Se ainda não está, avise um administrador para ser adicionado.
                                    </p>
                                    <Button
                                        onClick={openWhatsApp}
                                        variant="outline"
                                        className="w-full border-zinc-700 hover:bg-green-600 hover:border-green-600 hover:text-white transition-colors"
                                    >
                                        <MessageCircle className="mr-2 h-5 w-5" />
                                        Enviar mensagem no WhatsApp
                                    </Button>
                                    <Button
                                        onClick={handleFinish}
                                        disabled={loading}
                                        variant="ghost"
                                        className="w-full text-zinc-500 hover:text-white text-xs uppercase"
                                    >
                                        Continuar mesmo assim
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
