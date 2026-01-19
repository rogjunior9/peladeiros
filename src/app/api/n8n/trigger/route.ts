import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const settings = await prisma.notificationSettings.findFirst();

        const now = new Date();
        const actions = [];

        // Buscar jogos futuros (próximos 3 dias)
        // E jogos passados (ontem) para cobranca
        const games = await prisma.game.findMany({
            where: {
                date: {
                    gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Ontem
                    lte: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000) // +3 dias
                },
                isActive: true
            }
        });

        for (const game of games) {
            const [h, m] = game.startTime.split(':').map(Number);
            const gameTime = new Date(game.date);
            gameTime.setHours(h, m, 0, 0);

            const msUntil = gameTime.getTime() - now.getTime();
            const hoursUntil = msUntil / 3600000;
            const daysUntil = hoursUntil / 24;

            actions.push({
                gameId: game.id,
                gameTitle: game.title,
                daysUntil: daysUntil,
                hoursUntil: hoursUntil,
                startTime: game.startTime,
                // Flags para o N8N filtrar facil
                is2DaysBefore: daysUntil >= 1.5 && daysUntil <= 2.5,
                is1DayBefore: daysUntil >= 0.5 && daysUntil <= 1.5,
                isToday: daysUntil >= -0.5 && daysUntil < 0.5,
                isFinishedYesterday: daysUntil >= -1.5 && daysUntil < -0.5
            });
        }

        return NextResponse.json({
            settings: settings || {},
            games: actions
        });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar triggers" }, { status: 500 });
    }
}
