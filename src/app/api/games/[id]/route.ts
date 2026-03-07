import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function hasAdminAccess(user: { id?: string | null; role?: string | null; email?: string | null }) {
  if (user?.role === "ADMIN") return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (user?.email && adminEmails.includes(user.email.toLowerCase())) return true;

  if (user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, email: true },
    });
    if (dbUser?.role === "ADMIN") return true;
    if (dbUser?.email && adminEmails.includes(dbUser.email.toLowerCase())) return true;
  }

  return false;
}

function parseOptionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseGameDateForDb(dateValue?: string) {
  if (!dateValue) return undefined;
  const [year, month, day] = String(dateValue).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        venue: true,
        createdBy: {
          select: { name: true, email: true },
        },
        confirmations: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, playerType: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        payments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, playerType: true },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Jogo nao encontrado" }, { status: 404 });
    }

    const referenceMonth = game.date.toISOString().slice(0, 7);
    const userIdsInGame = game.confirmations
      .map((confirmation) => confirmation.user?.id)
      .filter(Boolean) as string[];

    const monthlyPayments = userIdsInGame.length > 0
      ? await prisma.payment.findMany({
          where: {
            userId: { in: userIdsInGame },
            referenceMonth,
            status: "CONFIRMED",
          },
          select: { userId: true },
        })
      : [];

    const monthlyPaidUserIds = Array.from(new Set(monthlyPayments.map((payment) => payment.userId)));

    return NextResponse.json({
      ...game,
      monthlyPaidUserIds,
      referenceMonth,
    });
  } catch (error) {
    console.error("Erro ao buscar jogo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (!(await hasAdminAccess(session.user))) {
      return NextResponse.json(
        { error: "Apenas administradores podem editar peladas" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      gameType,
      maxPlayers,
      pricePerPlayer,
      priceGoalkeeper,
      venueId,
      billingType,
      isActive,
    } = body;

    const game = await prisma.game.update({
      where: { id: params.id },
      data: {
        title: title?.trim?.(),
        description: description?.trim?.() || undefined,
        date: parseGameDateForDb(date),
        startTime: startTime?.trim?.(),
        endTime: endTime?.trim?.(),
        gameType: gameType || undefined,
        maxPlayers: parseOptionalNumber(maxPlayers),
        pricePerPlayer: parseOptionalNumber(pricePerPlayer),
        priceGoalkeeper: parseOptionalNumber(priceGoalkeeper),
        venueId: venueId || undefined,
        billingType: billingType || undefined,
        isActive,
      },
      include: {
        venue: true,
      },
    });

    return NextResponse.json(game);
  } catch (error) {
    console.error("Erro ao atualizar jogo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (!(await hasAdminAccess(session.user))) {
      return NextResponse.json(
        { error: "Apenas administradores podem excluir peladas" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deleteSeries = searchParams.get("deleteSeries") === "true";
    const deleteFuture = searchParams.get("deleteFuture") === "true";

    const game = await prisma.game.findUnique({
      where: { id: params.id },
      select: { recurrenceId: true, date: true }
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (deleteSeries && game.recurrenceId) {
      // Delete multiple
      await prisma.game.updateMany({
        where: {
          recurrenceId: game.recurrenceId,
          isActive: true,
          ...(deleteFuture ? { date: { gte: game.date } } : {}) // If deleteFuture, only >= this date. Else all.
        },
        data: { isActive: false }
      });
    } else {
      // Delete single
      await prisma.game.update({
        where: { id: params.id },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir jogo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
