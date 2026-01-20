import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(request: Request) {
    // Opcional: Proteger via CRON_SECRET se configurado
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // Permitir por enquanto para testes manuais
    }

    try {
        const now = new Date();
        // Janela de busca: Jogos que comecam nas proximas 5 horas.
        // Ex: Se roda as 14h, pega jogos ate as 19h.
        // Se o jogo eh as 18h (4h de diferenca), ele entra.
        const lookaheadHours = 5;
        const futureLimit = new Date(now.getTime() + lookaheadHours * 60 * 60 * 1000);

        // Buscar jogos ativos hoje/futuros
        const games = await prisma.game.findMany({
            where: {
                isActive: true,
                date: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)), // A partir de hoje
                    lte: futureLimit
                },
            },
            include: {
                venue: true,
                confirmations: {
                    include: { user: true },
                    orderBy: { createdAt: "asc" }, // FIFO
                },
            },
        });

        const processedGames = [];

        for (const game of games) {
            // Combinar Data e Hora
            const [h, m] = game.startTime.split(':').map(Number);
            const gameDateTime = new Date(game.date);
            gameDateTime.setHours(h, m, 0, 0);

            // Calcular tempo restante em horas
            const msUntilGame = gameDateTime.getTime() - now.getTime();
            const hoursUntilGame = msUntilGame / (1000 * 60 * 60);

            // Regra: "faltando 4 horas" (ou menos). Vamos dar uma margem de segurança (entre 0 e 4.5h)
            // Se ja passou, nao processa (hours < 0).
            if (hoursUntilGame > 0 && hoursUntilGame <= 4.5) {

                // Contar confirmados atuais
                const confirmedCount = game.confirmations.filter(c => c.status === "CONFIRMED").length;
                const waitingList = game.confirmations.filter(c => c.status === "WAITING_LIST");

                // Vagas disponiveis
                const vacancies = game.maxPlayers - confirmedCount;

                if (vacancies > 0 && waitingList.length > 0) {
                    // Promover os primeiros N da fila
                    const toPromote = waitingList.slice(0, vacancies);

                    const promotedNames = [];

                    for (const conf of toPromote) {
                        // Atualizar status no banco
                        await prisma.gameConfirmation.update({
                            where: { id: conf.id },
                            data: { status: "CONFIRMED" },
                        });
                        promotedNames.push({
                            name: conf.user?.name || conf.guestName || "Convidado",
                            phone: conf.user?.phone || ""
                        });
                    }

                    const result = {
                        gameId: game.id,
                        gameTitle: game.title,
                        gameTime: `${formatDate(game.date)} ${game.startTime}`,
                        promotedCount: toPromote.length,
                        promotedUsers: promotedNames,
                    };

                    processedGames.push(result);

                    // Disparar Webhook N8N
                    // Utiliza a variável N8N_WEBHOOK_URL definida no .env
                    if (process.env.N8N_WEBHOOK_URL) {
                        try {
                            // Tenta enviar. Nao falha o processo se o webhook falhar.
                            await fetch(process.env.N8N_WEBHOOK_URL, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    // Se necessario, adicione Authorization aqui. O usuario passou um JWT 'eyJ...', entao pode ser Bearer.
                                    // 'Authorization': `Bearer ${process.env.N8N_API_KEY}`
                                },
                                body: JSON.stringify({
                                    event: "waiting_list_promotion",
                                    ...result
                                })
                            });
                        } catch (err) {
                            console.error("Erro ao chamar N8N webhook:", err);
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            processed: processedGames.length,
            details: processedGames
        });

    } catch (error) {
        console.error("Erro no cron job:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Helper duplicado pois nao posso importar de utils.ts (client-side filters as vezes falham no server se tiver dependencies de UI, mas utils.ts parece safe. 
// Para garantir, copiei formatDate simples.)
function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR");
}
