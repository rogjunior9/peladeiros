import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const gameId = searchParams.get('gameId');

        if (!gameId) {
            return NextResponse.json({ error: "gameId obrigatorio" }, { status: 400 });
        }

        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                confirmations: {
                    include: { user: true }
                },
                payments: {
                    where: { status: 'CONFIRMED' }
                }
            }
        });

        if (!game) {
            return NextResponse.json({ error: "Jogo nao encontrado" }, { status: 404 });
        }

        const paidUserIds = new Set(game.payments.map(p => p.userId));

        // Filtrar devedores: Confirmados, Nao Goleiros, Nao Mensalistas (assumindo que pagam separado), Sem Pagamento
        // User pediu "enviar quem não pagou". Avulsos.

        const debtors = game.confirmations.filter(c => {
            if (c.status !== 'CONFIRMED') return false;
            if (!c.user) return false;
            if (c.user.playerType === 'GOALKEEPER') return false;
            if (c.user.playerType === 'MONTHLY') return false;
            if (c.userId && paidUserIds.has(c.userId)) return false;
            return true;
        });

        if (debtors.length === 0) {
            return NextResponse.json({ message: null, debtorsCount: 0 }); // Ninguem devendo
        }

        let msg = `*⚠️ Pendência de Pagamento - ${game.title}*\n\n`;
        msg += `Os seguintes jogadores ainda não registraram o pagamento:\n\n`;

        debtors.forEach((c) => {
            msg += `• ${c.user?.name || 'Anônimo'} (${c.user?.phone || 'Sem telefone'})\n`;
        });

        const settings = await prisma.notificationSettings.findFirst();
        if (settings?.pixKey) {
            msg += `\nFavor enviar para o Pix: ${settings.pixKey}`;
        }

        return NextResponse.json({ message: msg, debtorsCount: debtors.length });

    } catch (error) {
        return NextResponse.json({ error: "Erro ao gerar lista de devedores" }, { status: 500 });
    }
}
