import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get("month"); // YYYY-MM

        if (!month) {
            return NextResponse.json({ error: "Mes obrigatorio" }, { status: 400 });
        }

        // 1. Get all monthly players
        const monthlyPlayers = await prisma.user.findMany({
            where: {
                playerType: "MONTHLY",
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true,
            },
            orderBy: { name: "asc" }
        });

        // 2. Get payments for this month linked to these users
        const payments = await prisma.payment.findMany({
            where: {
                referenceMonth: month,
                status: "CONFIRMED",
                userId: { in: monthlyPlayers.map(p => p.id) }
            }
        });

        // 3. Map status
        const result = monthlyPlayers.map(player => {
            const payment = payments.find(p => p.userId === player.id);
            return {
                user: player,
                status: payment ? "PAID" : "PENDING",
                paymentId: payment?.id,
                paidAt: payment?.paidAt,
                amount: payment?.amount
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Erro ao listar mensalidades:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
        }

        const { userId, month, amount, method } = await request.json();

        if (!userId || !month || !amount) {
            return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
        }

        // Check existing
        const existing = await prisma.payment.findFirst({
            where: { userId, referenceMonth: month, status: "CONFIRMED" }
        });

        if (existing) {
            return NextResponse.json({ error: "Ja pago" }, { status: 400 });
        }

        const payment = await prisma.payment.create({
            data: {
                userId,
                amount: parseFloat(amount),
                method: method || "CASH",
                status: "CONFIRMED",
                referenceMonth: month,
                paidAt: new Date(),
                notes: "Mensalidade lancada manualmente pelo Admin"
            }
        });

        // Trigger Webhook for N8N (Optional, but good for finance sheet)
        // We can add it later if needed.

        return NextResponse.json(payment);
    } catch (error) {
        console.error("Erro ao registrar mensalidade:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
