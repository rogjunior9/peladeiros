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
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(type ? { type: type as any } : {}),
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Erro ao listar transacoes:", error);
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem lancar transacoes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, amount, description, category, date } = body;

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        description,
        category,
        date: date ? new Date(date) : new Date(),
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar transacao:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
