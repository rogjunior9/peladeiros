import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";

interface CpfDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (cpf: string) => Promise<void>;
}

export function CpfDialog({ open, onOpenChange, onSave }: CpfDialogProps) {
    const [cpf, setCpf] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (cpf.length < 11) {
            setError("CPF inválido");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await onSave(cpf);
            // Sucesso fecha dialog via pai
        } catch (e) {
            setError("Erro ao salvar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        CPF Obrigatório
                    </DialogTitle>
                    <DialogDescription>
                        Para gerar a cobrança automática (Pix/Crédito) via PagBank, precisamos do seu CPF. Isso será solicitado apenas uma vez.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="000.000.000-00"
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Salvando..." : "Salvar e Confirmar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
