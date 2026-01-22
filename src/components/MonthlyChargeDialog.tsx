import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, RefreshCw, Check, CalendarDays, Wallet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface UserStatus {
    id: string;
    name: string;
    email: string;
    playerType: string;
    document: string | null;
    image: string | null;
    payments: Array<{
        id: string;
        status: string;
        amount: number;
        paidAt: string | null;
    }>;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    // 12 months back, 3 ahead
    for (let i = -12; i <= 3; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const value = d.toISOString().slice(0, 7);
        const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options.reverse(); // Newest first
};

export function MonthlyChargeDialog({ open, onOpenChange }: Props) {
    const [users, setUsers] = useState<UserStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const { toast } = useToast();

    // Reset to current month when opening
    useEffect(() => {
        if (open) {
            // Optional: reset month or keep last selection? 
            // Keeping last selection is better UX usually, but let's default to current if empty
            if (!selectedMonth) setSelectedMonth(new Date().toISOString().slice(0, 7));
            loadData();
        }
    }, [open, selectedMonth]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/finance/monthly-status?month=${selectedMonth}`);
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Erro ao carregar dados", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const updateUserType = async (userId: string, newType: string) => {
        // Optimistic Update
        setUsers(users.map(u => u.id === userId ? { ...u, playerType: newType } : u));

        try {
            await fetch(`/api/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerType: newType })
            });
        } catch (e) {
            toast({ title: "Erro ao atualizar tipo", variant: "destructive" });
            loadData(); // Revert
        }
    };

    const handleGenerateValues = async () => {
        setGenerating(true);
        try {
            const res = await fetch("/api/finance/monthly-charge", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast({
                    title: "Cobranças Geradas!",
                    description: `Enviado para ${data.messagesSent} mensalistas via N8N.`,
                    variant: "success"
                });
                loadData(); // Refresh to show pending status
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            toast({ title: "Erro", description: e.message || "Falha ao gerar", variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const formatCPF = (cpf: string | null) => {
        if (!cpf) return "-";
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    };

    const getStatusBadge = (user: UserStatus) => {
        if (user.playerType === 'GOALKEEPER') {
            return <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-500/20">Isento</Badge>;
        }

        const payment = user.payments[0];
        if (!payment) return <Badge variant="outline" className="text-slate-600 border-slate-800">Não Gerado</Badge>;
        if (payment.status === "PAID") return <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/25">Pago</Badge>;
        if (payment.status === "PENDING") return <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/50 hover:bg-amber-500/25">Pendente</Badge>;
        return <Badge variant="secondary">{payment.status}</Badge>;
    };

    const monthlyCount = users.filter(u => u.playerType === 'MONTHLY').length;
    const pendingCount = users.filter(u => u.playerType === 'MONTHLY' && !u.payments[0]).length;

    const monthOptions = getMonthOptions();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-slate-950 border-slate-900 text-slate-100 shadow-2xl shadow-black">
                <DialogHeader className="pb-4 border-b border-slate-900">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-100">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <Wallet className="h-5 w-5 text-amber-500" />
                                </div>
                                <span>Gestão de Mensalidades</span>
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 mt-1 ml-11">
                                Gerencie pagamentos e status dos mensalistas.
                            </DialogDescription>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/50">
                            <div className="px-2 text-slate-500">
                                <CalendarDays className="h-4 w-4" />
                            </div>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="w-[180px] border-0 bg-transparent text-slate-200 focus:ring-0 focus:ring-offset-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 max-h-[300px]">
                                    {monthOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="focus:bg-slate-800 focus:text-slate-100 cursor-pointer">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[300px] bg-slate-950/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                            <span className="text-slate-500 text-sm">Carregando dados financeiros...</span>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
                                <TableRow className="border-slate-800/50 hover:bg-transparent">
                                    <TableHead className="text-slate-400 pl-6">Jogador</TableHead>
                                    <TableHead className="text-slate-400">CPF</TableHead>
                                    <TableHead className="text-slate-400">Tipo</TableHead>
                                    <TableHead className="text-slate-400">Status Mês</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="border-slate-800/30 hover:bg-slate-900/40 transition-colors">
                                        <TableCell className="font-medium flex items-center gap-3 pl-6">
                                            <Avatar className="h-9 w-9 border border-slate-800">
                                                <AvatarImage src={user.image || ""} />
                                                <AvatarFallback className="bg-slate-900 text-amber-500">{user.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-slate-200">{user.name}</span>
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-mono text-xs">
                                            {formatCPF(user.document)}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={user.playerType || "CASUAL"}
                                                onValueChange={(v) => updateUserType(user.id, v)}
                                            >
                                                <SelectTrigger className={`w-[130px] h-8 border-slate-800 text-xs transition-colors ${user.playerType === 'MONTHLY' ? 'bg-amber-950/20 text-amber-500 border-amber-900/50' :
                                                        user.playerType === 'GOALKEEPER' ? 'bg-indigo-950/20 text-indigo-400 border-indigo-900/50' :
                                                            'bg-slate-900 text-slate-400'
                                                    }`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                                    <SelectItem value="MONTHLY" className="text-amber-500 focus:text-amber-400 focus:bg-amber-950/20">Mensalista</SelectItem>
                                                    <SelectItem value="CASUAL">Avulso</SelectItem>
                                                    <SelectItem value="GOALKEEPER" className="text-indigo-400 focus:text-indigo-300 focus:bg-indigo-950/20">Goleiro</SelectItem>
                                                    <SelectItem value="GUEST">Convidado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(user)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <DialogFooter className="bg-slate-900/50 p-4 border-t border-slate-900 flex justify-between items-center sm:justify-between">
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/5 border border-amber-500/10 rounded-md">
                            <span className="font-bold text-amber-500">{monthlyCount}</span>
                            <span className="text-amber-500/70 text-xs uppercase tracking-wide">Mensalistas</span>
                        </div>
                        {pendingCount > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/5 border border-red-500/10 rounded-md">
                                <span className="font-bold text-red-500">{pendingCount}</span>
                                <span className="text-red-500/70 text-xs uppercase tracking-wide">Pendentes</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-slate-800 hover:text-slate-200">Fechar</Button>
                        <Button
                            onClick={handleGenerateValues}
                            disabled={generating || loading || pendingCount === 0}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-lg shadow-amber-900/20 disabled:opacity-50 disabled:shadow-none"
                        >
                            {generating ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando</>
                            ) : (
                                <><RefreshCw className="mr-2 h-4 w-4" /> Gerar Cobranças</>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
