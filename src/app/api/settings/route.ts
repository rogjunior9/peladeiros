import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const settings = await prisma.notificationSettings.findFirst();
    return NextResponse.json(settings || {});
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
        whatsappGroupId,
        pixKey,
        enableReminder2Days,
        enableReminder1Day,
        enableFinalList,
        enableDebtors
    } = body;

    // Upsert (como só tem 1 linha, findFirst e update ou create)
    const existing = await prisma.notificationSettings.findFirst();

    let result;
    if (existing) {
        result = await prisma.notificationSettings.update({
            where: { id: existing.id },
            data: {
                whatsappGroupId,
                pixKey,
                enableReminder2Days,
                enableReminder1Day,
                enableFinalList,
                enableDebtors
            }
        });
    } else {
        result = await prisma.notificationSettings.create({
            data: {
                whatsappGroupId,
                pixKey,
                enableReminder2Days,
                enableReminder1Day,
                enableFinalList,
                enableDebtors
            }
        });
    }

    return NextResponse.json(result);
}
