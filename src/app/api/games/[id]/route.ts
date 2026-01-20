import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Jogo nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(game);
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

    if (session.user.role !== "ADMIN") {
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
      isActive,
    } = body;

    const game = await prisma.game.update({
      where: { id: params.id },
      data: {
        title,
        description,
        date: date ? new Date(date) : undefined,
        startTime,
        endTime,
        gameType,
        maxPlayers,
        pricePerPlayer: pricePerPlayer ? parseFloat(pricePerPlayer) : undefined,
        priceGoalkeeper: priceGoalkeeper !== undefined ? parseFloat(priceGoalkeeper) : undefined,
        venueId,
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

    if (session.user.role !== "ADMIN") {
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
