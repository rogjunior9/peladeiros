import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

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
                venue: true,
                confirmations: {
                    include: { user: true },
                    orderBy: { createdAt: 'asc' } // Ordem de chegada
                },
                payments: {
                    where: { status: 'CONFIRMED' }
                }
            }
        });

        if (!game) {
            return NextResponse.json({ error: "Jogo nao encontrado" }, { status: 404 });
        }

        const settings = await prisma.notificationSettings.findFirst();

        // Construir Mensagem
        let msg = `*${game.title} - ${game.venue.name}*\n`;
        msg += `*${game.startTime}h às ${game.endTime}h*\n`;

        // Customizacao ou padrao
        if (game.description) {
            msg += `*• ${game.description}*\n`;
        } else {
            msg += `*• Colete 🔴🔵*\n`;
        }

        msg += `• *Só coloque o nome na lista ao ter certeza que dará pra você ir.*\n`;
        msg += `• *Quem não tiver certeza, coloca o nome na Lista de espera*\n`;

        if (settings?.pixKey) {
            msg += `• *Pix ${settings.pixKey}*\n`;
        }

        msg += `• *Valor: ${game.pricePerPlayer} reais*\n\n`;

        msg += `*Lista de Presença*✅\n\n`;

        // Separar Linha e Goleiro
        const confirmed = game.confirmations.filter(c => c.status === 'CONFIRMED');
        const linha = confirmed.filter(c => c.user && c.user.playerType !== 'GOALKEEPER');
        const goleiros = confirmed.filter(c => c.user && c.user.playerType === 'GOALKEEPER');
        const espera = game.confirmations.filter(c => c.status === 'WAITING_LIST');

        // Mapear pagamentos para acesso rapido: userId -> bool
        const paidUsers = new Set(game.payments.map(p => p.userId));

        // Listar Linha
        // O user quer lista numerada fixa até X?
        // Ele colocou "1- Lukinha... 24- ".
        // Vou listar os confirmados e se sobrar espaço preencher com vazio até dar uns 20? 
        // Melhor listar só quem tá e se quiser preencher, o user pede.
        // O exemplo tinha vazios. Vou colocar até 24.

        for (let i = 0; i < 24; i++) {
            if (i < linha.length) {
                const c = linha[i];
                const isPaid = c.userId ? paidUsers.has(c.userId) : false;
                const check = isPaid ? ' ✅' : '';
                // Se for mensalista, as vezes não tem pagamento LINKADO ao jogo, mas tem mensalidade.
                // Vou marcar mensalistas como pagos? Não, melhor deixar sem check se nao tiver pagamento linkado.
                // Exceto se o user.playerType == MONTHLY, talvez nao deva cobrar aqui.
                // Mas o user pediu "quem nao pagou".
                // Vou deixar o check apenas se tiver Payment linkado ao game.

                msg += `${i + 1}- ${c.user?.name || c.guestName || 'Anônimo'}${check}\n`;
            } else {
                msg += `${i + 1}-\n`;
            }
        }

        msg += `\nGoleiros🥅\n`;
        for (let i = 0; i < 4; i++) {
            if (i < goleiros.length) {
                const c = goleiros[i];
                msg += `${i + 1}- ${c.user?.name || c.guestName || 'Goleiro'}\n`;
            } else {
                msg += `${i + 1}-\n`;
            }
        }

        if (espera.length > 0) {
            msg += `\nLista de espera (avulsos)\n`;
            espera.forEach((c, i) => {
                msg += `${i + 1}- ${c.user?.name || c.guestName || 'Anônimo'}\n`;
            });
        }

        return NextResponse.json({ message: msg });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao gerar mensagem" }, { status: 500 });
    }
}
