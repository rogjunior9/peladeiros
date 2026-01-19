import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        const users = await prisma.user.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                playerType: true,
                document: true,
                image: true,
                payments: {
                    where: { referenceMonth: currentMonth },
                    select: { id: true, status: true, amount: true, paidAt: true, pixCode: true }
                }
            }
        });

        // Sort: MONTHLY > GOALKEEPER > CASUAL
        const sorted = users.sort((a, b) => {
            const order: Record<string, number> = { "MONTHLY": 1, "GOALKEEPER": 2, "CASUAL": 3, "GUEST": 4 };
            const typeA = (a.playerType || "CASUAL");
            const typeB = (b.playerType || "CASUAL");
            return (order[typeA] || 99) - (order[typeB] || 99);
        });

        return NextResponse.json(sorted);
    } catch (error) {
        console.error("Error fetching status:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
