import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const gameId = searchParams.get("gameId");
    const month = searchParams.get("month");

    const payments = await prisma.payment.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(userId ? { userId } : {}),
        ...(gameId ? { gameId } : {}),
        ...(month ? { referenceMonth: month } : {}),
        OR: [
          { gameId: null },
          { game: { isActive: true } }
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, playerType: true },
        },
        game: {
          select: { id: true, title: true, date: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Erro ao listar pagamentos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      amount,
      method,
      userId,
      gameId,
      referenceMonth,
      notes,
      status: paymentStatus,
    } = body;

    // Only admin can create CASH payments with CONFIRMED status
    if (method === "CASH" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem registrar pagamentos em dinheiro" },
        { status: 403 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        method,
        status: method === "CASH" && session.user.role === "ADMIN" ? (paymentStatus || "CONFIRMED") : "PENDING",
        userId: userId || session.user.id,
        gameId,
        referenceMonth,
        notes,
        paidAt: method === "CASH" && paymentStatus === "CONFIRMED" ? new Date() : null,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
