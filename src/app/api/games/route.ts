import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { createGameSchema, gameQuerySchema } from "@/lib/schemas";
import { addDays } from "date-fns";

function normalizeGameInput(raw: any) {
  const maxPlayersRaw = raw?.maxPlayers;
  const pricePerPlayerRaw = raw?.pricePerPlayer;
  const priceGoalkeeperRaw = raw?.priceGoalkeeper;

  return {
    ...raw,
    title: raw?.title?.trim?.(),
    description: raw?.description?.trim?.() || undefined,
    date: raw?.date?.trim?.(),
    startTime: raw?.startTime?.trim?.(),
    endTime: raw?.endTime?.trim?.(),
    maxPlayers:
      maxPlayersRaw === "" || maxPlayersRaw === null || maxPlayersRaw === undefined
        ? undefined
        : Number(maxPlayersRaw),
    pricePerPlayer:
      pricePerPlayerRaw === "" || pricePerPlayerRaw === null || pricePerPlayerRaw === undefined
        ? undefined
        : Number(pricePerPlayerRaw),
    priceGoalkeeper:
      priceGoalkeeperRaw === "" || priceGoalkeeperRaw === null || priceGoalkeeperRaw === undefined
        ? undefined
        : Number(priceGoalkeeperRaw),
    isRecurring: Boolean(raw?.isRecurring),
  };
}

async function handleGet(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Validar query params
    const queryResult = gameQuerySchema.safeParse({
      upcoming: searchParams.get("upcoming") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { upcoming } = queryResult.data;

    const games = await prisma.game.findMany({
      where: {
        isActive: true,
        ...(upcoming === "true" ? { date: { gte: new Date() } } : {}),
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
      orderBy: { date: upcoming === "true" ? "asc" : "desc" },
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

async function handlePost(request: NextRequest) {
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
    const normalizedBody = normalizeGameInput(body);
    
    // Validar com Zod
    const validationResult = createGameSchema.safeParse(normalizedBody);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validationResult.error.errors },
        { status: 400 }
      );
    }

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
    } = validationResult.data;

    // Verificar se venue existe
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return NextResponse.json(
        { error: "Local de jogo não encontrado" },
        { status: 404 }
      );
    }

    // Helper para criar data corretamente (meio-dia UTC para evitar problemas de timezone)
    const getFixedDate = (dateString: string) => {
      const [year, month, day] = dateString.split('-').map(Number);
      // Criar data UTC ao meio-dia para evitar problemas de timezone
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    };

    const createdGames: any[] = [];
    const recurrenceId = isRecurring ? crypto.randomUUID() : null;
    const iterations = isRecurring ? 26 : 1; // 26 weeks = 6 months

    // Executar criações em transação
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < iterations; i++) {
        const baseDate = getFixedDate(date);
        const gameDate = addDays(baseDate, i * 7);

        // Check collision - usar apenas a parte da data (ignorar hora)
        const nextDay = addDays(gameDate, 1);
        
        const collision = await tx.game.findFirst({
          where: {
            venueId,
            isActive: true,
            date: {
              gte: gameDate,
              lt: nextDay,
            },
          }
        });

        if (collision) {
          console.log(`[Game Create] Colisão detectada para data ${gameDate.toISOString()}, pulando...`);
          continue;
        }

        const game = await tx.game.create({
          data: {
            title,
            description,
            date: gameDate,
            startTime,
            endTime,
            gameType,
            maxPlayers,
            pricePerPlayer,
            priceGoalkeeper,
            billingType,
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
    }, {
      isolationLevel: "Serializable",
    });

    if (createdGames.length === 0) {
      return NextResponse.json(
        { error: "Não foi possível criar nenhum jogo. Verifique se já existem jogos nas datas selecionadas." },
        { status: 409 }
      );
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

// Exportar com rate limiting
export const GET = withRateLimit(handleGet, {
  limiter: rateLimiters.api,
  keyPrefix: "games:list",
});

export const POST = withRateLimit(handlePost, {
  limiter: rateLimiters.api,
  keyPrefix: "games:create",
});
