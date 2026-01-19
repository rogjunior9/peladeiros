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
        monthlyFee,
        creditCardFee,
        defaultCpf,
        enableReminder2Days,
        enableReminder1Day,
        enableFinalList,
        enableDebtors
    } = body;

    const existing = await prisma.notificationSettings.findFirst();

    let result;
    const data = {
        whatsappGroupId,
        pixKey,
        monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 60.0,
        creditCardFee: creditCardFee ? parseFloat(creditCardFee) : 5.0,
        defaultCpf,
        enableReminder2Days,
        enableReminder1Day,
        enableFinalList,
        enableDebtors
    };

    if (existing) {
        result = await prisma.notificationSettings.update({
            where: { id: existing.id },
            data
        });
    } else {
        result = await prisma.notificationSettings.create({
            data
        });
    }

    return NextResponse.json(result);
}
