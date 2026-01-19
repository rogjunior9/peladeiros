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
    const upcoming = searchParams.get("upcoming") === "true";

    const games = await prisma.game.findMany({
      where: {
        isActive: true,
        ...(upcoming ? { date: { gte: new Date() } } : {}),
      },
      include: {
        venue: true,
        createdBy: {
          select: { name: true, email: true },
        },
        _count: {
          select: {
            confirmations: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
      orderBy: { date: upcoming ? "asc" : "desc" },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error("Erro ao listar jogos:", error);
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
        { error: "Apenas administradores podem criar peladas" },
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
    } = body;

    const game = await prisma.game.create({
      data: {
        title,
        description,
        date: new Date(date),
        startTime,
        endTime,
        gameType,
        maxPlayers: maxPlayers || 22,
        pricePerPlayer: parseFloat(pricePerPlayer),
        priceGoalkeeper: parseFloat(priceGoalkeeper) || 0,
        venueId,
        createdById: session.user.id,
      },
      include: {
        venue: true,
      },
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar jogo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
