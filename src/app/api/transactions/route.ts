import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { createTransactionSchema, transactionQuerySchema } from "@/lib/schemas";

async function handleGet(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Validar query params
    const queryResult = transactionQuerySchema.safeParse({
      type: searchParams.get("type"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { type, startDate, endDate } = queryResult.data;

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(type ? { type } : {}),
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

async function handlePost(request: NextRequest) {
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
    
    // Validar com Zod
    const validationResult = createTransactionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { type, amount, description, category, date, gameId } = validationResult.data;

    // Executar em transação
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          type,
          amount,
          description,
          category,
          date: date ? new Date(date) : new Date(),
          createdById: session.user.id,
          gameId,
        },
        include: {
          createdBy: {
            select: { name: true },
          },
        },
      });

      return created;
    });

    // Audit log (fora da transação para não bloquear)
    await createAuditLog(
      session.user.id,
      "CREATE",
      "TRANSACTION",
      transaction.id,
      { type, amount, description, category, date }
    );

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar transacao:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Exportar com rate limiting
export const GET = withRateLimit(handleGet, {
  limiter: rateLimiters.api,
  keyPrefix: "transactions:list",
});

export const POST = withRateLimit(handlePost, {
  limiter: rateLimiters.api,
  keyPrefix: "transactions:create",
});
