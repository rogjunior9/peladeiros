import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const settings = await prisma.notificationSettings.findFirst();
        if (!settings?.monthlyFee || !settings.pixKey) {
            return NextResponse.json({ error: "Valor mensal ou Pix nao configurado" }, { status: 400 });
        }

        // Buscar Mensalistas Ativos
        const monthlyPlayers = await prisma.user.findMany({
            where: {
                playerType: "MONTHLY",
                isActive: true
            },
            select: {
                name: true,
                phone: true,
                email: true
            }
        });

        if (monthlyPlayers.length === 0) {
            return NextResponse.json({ message: "Nenhum mensalista encontrado" });
        }

        if (process.env.N8N_WEBHOOK_URL) {
            const webhookUrl = process.env.N8N_WEBHOOK_URL.replace(/\/webhook\/saldo$/, "") + "/webhook/financial-events";

            // Dispara evento para o N8N processar o envio em massa
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'charge_monthly',
                    amount: settings.monthlyFee,
                    pixKey: settings.pixKey,
                    month: new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
                    players: monthlyPlayers
                })
            });
        }

        return NextResponse.json({ success: true, count: monthlyPlayers.length });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao processar cobranca" }, { status: 500 });
    }
}
