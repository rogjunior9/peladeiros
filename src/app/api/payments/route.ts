import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { createPaymentSchema, paymentQuerySchema } from "@/lib/schemas";
import { ZodError } from "zod";

async function handleGet(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Validar query params
    const queryResult = paymentQuerySchema.safeParse({
      status: searchParams.get("status"),
      userId: searchParams.get("userId"),
      gameId: searchParams.get("gameId"),
      month: searchParams.get("month"),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { status, userId, gameId, month } = queryResult.data;

    // Se não for admin, só pode ver seus próprios pagamentos
    const effectiveUserId = session.user.role !== "ADMIN" ? session.user.id : userId;

    const payments = await prisma.payment.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(effectiveUserId ? { userId: effectiveUserId } : {}),
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

async function handlePost(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar com Zod
    const validationResult = createPaymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { amount, method, userId, gameId, referenceMonth, notes, status: paymentStatus } = validationResult.data;

    // Only admin can create CASH payments with CONFIRMED status
    if (method === "CASH" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem registrar pagamentos em dinheiro" },
        { status: 403 }
      );
    }

    // Se não for admin, só pode criar pagamento para si mesmo
    const effectiveUserId = session.user.role !== "ADMIN" 
      ? session.user.id 
      : (userId || session.user.id);

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Se houver gameId, verificar se jogo existe
    if (gameId) {
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });
      if (!game) {
        return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
      }
    }

    const payment = await prisma.payment.create({
      data: {
        amount,
        method,
        status: method === "CASH" && session.user.role === "ADMIN" ? (paymentStatus || "CONFIRMED") : "PENDING",
        userId: effectiveUserId,
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

// Exportar com rate limiting
export const GET = withRateLimit(handleGet, {
  limiter: rateLimiters.api,
  keyPrefix: "payments:list",
});

export const POST = withRateLimit(handlePost, {
  limiter: rateLimiters.payment,
  keyPrefix: "payments:create",
});
