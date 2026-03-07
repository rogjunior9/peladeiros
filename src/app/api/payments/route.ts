import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { createPaymentSchema, paymentQuerySchema } from "@/lib/schemas";
import { ZodError } from "zod";

async function hasAdminAccess(user: { id?: string | null; role?: string | null; email?: string | null }) {
  if (user?.role === "ADMIN") return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (user?.email && adminEmails.includes(user.email.toLowerCase())) return true;

  // Fallback robusto: confere role direto no banco por id e email
  if (user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, email: true },
    });
    if (dbUser?.role === "ADMIN") return true;
    if (dbUser?.email && adminEmails.includes(dbUser.email.toLowerCase())) return true;
  }

  if (user?.email) {
    const dbUserByEmail = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true },
    });
    if (dbUserByEmail?.role === "ADMIN") return true;
  }

  return false;
}

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

    const isAdmin = await hasAdminAccess(session.user);
    const effectiveUserId = isAdmin ? userId : undefined;

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
    const isAdmin = await hasAdminAccess(session.user);

    if (method === "CASH" && !isAdmin) {
      return NextResponse.json(
        { error: "Apenas administradores podem registrar pagamentos em dinheiro" },
        { status: 403 }
      );
    }

    // Se não for admin, só pode criar pagamento para si mesmo
    const effectiveUserId = !isAdmin
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

    const targetStatus = method === "CASH" && isAdmin ? (paymentStatus || "CONFIRMED") : "PENDING";
    const targetPaidAt = targetStatus === "CONFIRMED" ? new Date() : null;

    // Coerência: para o mesmo jogador+jogo (ou mesmo mês de referência), atualizar registro existente
    // em vez de criar duplicado com status conflitante.
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: effectiveUserId,
        ...(gameId
          ? { gameId }
          : referenceMonth
            ? { referenceMonth, gameId: null }
            : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPayment) {
      const payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount,
          method,
          status: targetStatus,
          notes,
          paidAt: targetPaidAt,
        },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });

      return NextResponse.json(payment);
    }

    const payment = await prisma.payment.create({
      data: {
        amount,
        method,
        status: targetStatus,
        userId: effectiveUserId,
        gameId,
        referenceMonth,
        notes,
        paidAt: targetPaidAt,
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
