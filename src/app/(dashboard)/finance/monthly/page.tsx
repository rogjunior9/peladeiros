"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, DollarSign, Check, X, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface MonthlyStatus {
    user: {
        id: string;
        name: string;
        email: string;
        image: string;
        phone: string;
    };
    status: "PAID" | "PENDING";
    paymentId?: string;
    paidAt?: string;
    amount?: number;
}

export default function MonthlyFeesPage() {
    const { data: session } = useSession();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
    const [fees, setFees] = useState<MonthlyStatus[]>([]);
    const [payingUser, setPayingUser] = useState<MonthlyStatus | null>(null);
    const [amount, setAmount] = useState("60.00");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchFees();
    }, [selectedMonth]);

    const fetchFees = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/finance/monthly-fees?month=${selectedMonth}`);
            if (res.ok) {
                const data = await res.json();
                setFees(data);
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao carregar mensalidades", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!payingUser) return;
        setProcessing(true);
        try {
            const res = await fetch("/api/finance/monthly-fees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: payingUser.user.id,
                    month: selectedMonth,
                    amount,
                    method: "CASH" // Default to CASH/MANUAL for now
                })
            });

            if (res.ok) {
                toast({ title: "Pagamento Registrado!", className: "bg-emerald-600 text-white border-none" });
                setPayingUser(null);
                fetchFees();
            } else {
                const err = await res.json();
                throw new Error(err.error);
            }
        } catch (e: any) {
            toast({ title: "Erro", description: e.message || "Falha ao registrar", variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return {
            value: format(d, "yyyy-MM"),
            label: format(d, "MMMM yyyy", { locale: ptBR }),
        };
    });

    const stats = {
        total: fees.length,
        paid: fees.filter(f => f.status === "PAID").length,
        pending: fees.filter(f => f.status === "PENDING").length,
        revenue: fees.reduce((acc, curr) => acc + (curr.amount || 0), 0)
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row items-end justify-between border-b border-white/5 pb-6 gap-4">
                <div>
                    <h1 className="text-4xl font-display font-bold text-white uppercase tracking-tight">Mensalidades</h1>
                    <p className="text-zinc-500 mt-1">Controle de pagamento dos mensalistas</p>
                </div>

                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[200px] bg-zinc-950 border-white/10 text-white font-display uppercase tracking-wider">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                        {months.map(m => (
                            <SelectItem key={m.value} value={m.value} className="capitalize">
                                {m.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-zinc-950 border-white/5">
                    <CardContent className="pt-6">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Esperados</p>
                        <p className="text-2xl font-display font-bold text-white">{stats.total}</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-white/5">
                    <CardContent className="pt-6">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pagos</p>
                        <p className="text-2xl font-display font-bold text-emerald-500">{stats.paid}</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-white/5">
                    <CardContent className="pt-6">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pendentes</p>
                        <p className="text-2xl font-display font-bold text-red-500">{stats.pending}</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-white/5">
                    <CardContent className="pt-6">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Receita (Mês)</p>
                        <p className="text-2xl font-display font-bold text-accent">R$ {stats.revenue.toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            <Card className="bg-zinc-950 border border-white/5">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="animate-spin text-accent h-8 w-8" />
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {fees.map((item) => (
                                <div key={item.user.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 border border-zinc-800">
                                            <AvatarImage src={item.user.image} />
                                            <AvatarFallback className="bg-zinc-900 text-zinc-500 font-bold">
                                                {item.user.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-white uppercase tracking-tight">{item.user.name}</p>
                                            <p className="text-xs text-zinc-500">{item.user.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {item.status === "PAID" ? (
                                            <div className="text-right">
                                                <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 uppercase tracking-widest text-[10px] h-6 px-3">
                                                    Pago
                                                </Badge>
                                                <p className="text-[10px] text-zinc-600 mt-1 uppercase">
                                                    {new Date(item.paidAt!).toLocaleDateString('pt-BR')} • R$ {item.amount?.toFixed(2)}
                                                </p>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 uppercase tracking-widest text-[10px]"
                                                onClick={() => {
                                                    setPayingUser(item);
                                                    setAmount("60.00"); // Default fee, could come from settings
                                                }}
                                            >
                                                Pagar Manual
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {fees.length === 0 && (
                                <div className="text-center py-10 text-zinc-500 uppercase tracking-widest text-xs">
                                    Nenhum mensalista ativo encontrado.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment Dialog */}
            <Dialog open={!!payingUser} onOpenChange={() => setPayingUser(null)}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display font-bold uppercase tracking-wide">Confirmar Pagamento</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Registrar pagamento de mensalidade para <span className="text-white font-bold">{payingUser?.user.name}</span> referente a <span className="text-white font-bold">{selectedMonth}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold text-zinc-500 tracking-widest">Valor (R$)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <Input
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-9 bg-zinc-900 border-white/10 text-white h-12 text-lg font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPayingUser(null)} className="text-zinc-500 hover:text-white uppercase tracking-widest text-xs">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handlePayment}
                            disabled={processing}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest text-xs px-6"
                        >
                            {processing ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirmar Recebimento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
