import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { status, guestName } = body;

    // Check if game exists
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            confirmations: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Jogo nao encontrado" }, { status: 404 });
    }

    // Check for existing confirmation
    const existingConfirmation = await prisma.gameConfirmation.findUnique({
      where: {
        gameId_userId: {
          gameId: params.id,
          userId: session.user.id,
        },
      },
    });

    let targetStatus = status;

    if (status === "CONFIRMED") {
      // Regra de Lista de Espera:
      // Se nao for Mensalista nem Goleiro, E faltar mais de 4h para o jogo -> Lista de Espera
      const playerType = session.user.playerType as string; // Garantir que venha do session callback
      const isPriority = playerType === "MONTHLY" || playerType === "GOALKEEPER";

      // Combinar Data e Hora para o calculo
      const gameDate = new Date(game.date);
      const [hours, minutes] = game.startTime.split(':').map(Number);
      gameDate.setUTCHours(hours, minutes, 0, 0); // Assumindo base UTC para simplificar ou ajustar conforme timezone do projeto
      // Ajuste fino de timezone pode ser necessario dependendo de como foi salvo.
      // Vamos tentar uma aproximacao: se a data do jogo for hoje/amanha.

      const now = new Date();
      // O problema eh que game.date normalmente eh salvo como YYYY-MM-DDT00:00:00.000Z.
      // Se o jogo é dia 20. E sao do Brasil (-3). Date do banco eh dia 20 a meia noite UTC?
      // Vou usar uma logica defensiva: Se faltar mais de 4 horas considerando a hora atual.

      // Criar data do jogo combinada (assumindo que game.date esta correto dia)
      const gameDateTime = new Date(game.date);
      // Ajustar hora
      gameDateTime.setHours(hours, minutes, 0, 0);

      // Se a data calculada ficou no passado (por bug de timezone), ajustar data
      // Mas o melhor eh calcular diferenca em ms
      const msUntilGame = gameDateTime.getTime() - now.getTime();
      const hoursUntilGame = msUntilGame / (1000 * 60 * 60);

      // Se avulso e faltam mais de 4h (e nao eh passado, pra evitar bugs com jogos antigos)
      if (!isPriority && hoursUntilGame > 4) {
        targetStatus = "WAITING_LIST";
      }

      // Se for para CONFIRMAR de fato, checa lotacao
      if (targetStatus === "CONFIRMED" && game._count.confirmations >= game.maxPlayers) {
        // Se ja existe e esta CONFIRMED, nao faz nada (mantem). Se esta mudando, erro.
        if (!existingConfirmation || existingConfirmation.status !== "CONFIRMED") {
          return NextResponse.json({ error: "Jogo lotado" }, { status: 400 });
        }
      }
    }

    let confirmation;

    if (existingConfirmation) {
      confirmation = await prisma.gameConfirmation.update({
        where: { id: existingConfirmation.id },
        data: { status: targetStatus },
        include: {
          user: {
            select: { name: true, email: true, playerType: true },
          },
        },
      });
    } else {
      confirmation = await prisma.gameConfirmation.create({
        data: {
          gameId: params.id,
          userId: session.user.id,
          status: targetStatus,
          isGuest: !!guestName,
          guestName,
        },
        include: {
          user: {
            select: { name: true, email: true, playerType: true },
          },
        },
      });
    }

    return NextResponse.json(confirmation);
  } catch (error) {
    console.error("Erro ao confirmar presenca:", error);
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

    await prisma.gameConfirmation.deleteMany({
      where: {
        gameId: params.id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover confirmacao:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
