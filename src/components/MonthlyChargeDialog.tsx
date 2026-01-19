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
import { Loader2, RefreshCw, Check, AlertCircle } from "lucide-react";
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

export function MonthlyChargeDialog({ open, onOpenChange }: Props) {
    const [users, setUsers] = useState<UserStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/finance/monthly-status");
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
        const payment = user.payments[0];
        if (!payment) return <Badge variant="outline" className="text-slate-500 border-slate-700">Não Gerado</Badge>;
        if (payment.status === "PAID") return <Badge className="bg-emerald-600">Pago</Badge>;
        if (payment.status === "PENDING") return <Badge className="bg-yellow-600">Pendente</Badge>;
        return <Badge variant="secondary">{payment.status}</Badge>;
    };

    const monthlyCount = users.filter(u => u.playerType === 'MONTHLY').length;
    const pendingCount = users.filter(u => u.playerType === 'MONTHLY' && !u.payments[0]).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-emerald-500" />
                        Gestão de Mensalidades
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Gerencie quem paga mensalidade e acompanhe o status deste mês.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-md border-slate-800">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-950 sticky top-0 z-10">
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="text-slate-400">Jogador</TableHead>
                                    <TableHead className="text-slate-400">CPF</TableHead>
                                    <TableHead className="text-slate-400">Tipo</TableHead>
                                    <TableHead className="text-slate-400">Status Mês</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="border-slate-800 hover:bg-slate-800/50">
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.image || ""} />
                                                <AvatarFallback className="bg-slate-700">{user.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            {user.name}
                                        </TableCell>
                                        <TableCell className="text-slate-400 font-mono text-xs">
                                            {formatCPF(user.document)}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={user.playerType || "CASUAL"}
                                                onValueChange={(v) => updateUserType(user.id, v)}
                                            >
                                                <SelectTrigger className="w-[130px] h-8 bg-slate-900 border-slate-700 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                                    <SelectItem value="MONTHLY">Mensalista</SelectItem>
                                                    <SelectItem value="CASUAL">Avulso</SelectItem>
                                                    <SelectItem value="GOALKEEPER">Goleiro</SelectItem>
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

                <DialogFooter className="bg-slate-950 p-4 -mx-6 -mb-6 rounded-b-lg border-t border-slate-800 flex justify-between items-center sm:justify-between">
                    <div className="text-sm text-slate-400">
                        <span className="font-bold text-emerald-400">{monthlyCount}</span> Mensalistas •
                        <span className="font-bold text-yellow-400 ml-2">{pendingCount}</span> Sem Cobrança
                    </div>

                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
                        <Button
                            onClick={handleGenerateValues}
                            disabled={generating || loading || pendingCount === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {generating ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                            ) : (
                                <><Check className="mr-2 h-4 w-4" /> Gerar Cobranças</>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
