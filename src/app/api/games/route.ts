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
      billingType,
      isRecurring,
    } = body;

    // Helper to fix date timezone (force 12:00 UTC)
    const getFixedDate = (dateString: string) => new Date(`${dateString}T12:00:00Z`);

    const createdGames = [];
    const recurrenceId = isRecurring ? crypto.randomUUID() : null;
    const iterations = isRecurring ? 26 : 1; // 26 weeks = 6 months

    for (let i = 0; i < iterations; i++) {
      const gameDate = getFixedDate(date);
      gameDate.setDate(gameDate.getDate() + (i * 7));

      // Check collision
      const collision = await prisma.game.findFirst({
        where: {
          venueId,
          isActive: true,
          date: gameDate, // Precise match as we norm to 12:00 UTC
        }
      });

      if (collision) continue;

      const game = await prisma.game.create({
        data: {
          title,
          description,
          date: gameDate,
          startTime,
          endTime,
          gameType,
          maxPlayers: maxPlayers ? parseInt(String(maxPlayers)) : 22,
          pricePerPlayer: pricePerPlayer ? parseFloat(String(pricePerPlayer)) : 0,
          priceGoalkeeper: priceGoalkeeper ? parseFloat(String(priceGoalkeeper)) : 0,
          billingType: billingType || "SINGLE",
          venueId,
          createdById: session.user.id,
          recurrenceId,
        },
        include: {
          venue: true,
        },
      });
      createdGames.push(game);
    }

    // Return the first created game
    return NextResponse.json(createdGames[0], { status: 201 });
  } catch (error) {
    console.error("Erro ao criar jogo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
