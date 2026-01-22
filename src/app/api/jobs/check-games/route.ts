import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    // Simple protection
    // In production, use a strong env var like CRON_SECRET
    if (key !== "peladeiros_cron_secret") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        // Find games that happened in the past (based on date) but might need verification
        // Since we don't have a 'status' field yet (migration pending),
        // we just look for games in the recent past (e.g., last 24h) that are active
        const startWindow = new Date(twoHoursAgo.getTime() - 24 * 60 * 60 * 1000);

        const games = await prisma.game.findMany({
            where: {
                date: {
                    gt: startWindow,
                    lt: twoHoursAgo
                },
                isActive: true,
            },
            include: {
                payments: {
                    where: { status: "CONFIRMED" },
                    include: { user: true }
                },
                confirmations: {
                    where: { status: "CONFIRMED" }
                }
            }
        });

        const results = games.map(game => {
            // Logic: If game ended > 2 hours ago, we suggest verification
            // Here we provide the list of "confirmed" payments that might need refund if canceled
            const payersToRefund = game.payments
                .filter(p => p.user.playerType !== "MONTHLY" && p.user.playerType !== "GOALKEEPER")
                .map(p => ({
                    name: p.user.name,
                    amount: p.amount,
                    phone: p.user.phone
                }));

            return {
                gameId: game.id,
                title: game.title,
                date: game.date,
                totalPayers: payersToRefund.length,
                payersToRefund,
                needsVerification: true,
                // This is where N8N would pick up the ID and send the message
                // Message: "A pelada '{title}' aconteceu? Responda SIM ou NAO."
            };
        });

        return NextResponse.json({
            checkedAt: new Date(),
            gamesFound: results.length,
            games: results
        });

    } catch (error) {
        console.error("Cron Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
