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

    // Check if game is full (only for confirmations)
    if (status === "CONFIRMED" && game._count.confirmations >= game.maxPlayers) {
      return NextResponse.json(
        { error: "Jogo lotado" },
        { status: 400 }
      );
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

    let confirmation;

    if (existingConfirmation) {
      // Update existing confirmation
      confirmation = await prisma.gameConfirmation.update({
        where: { id: existingConfirmation.id },
        data: { status },
        include: {
          user: {
            select: { name: true, email: true, playerType: true },
          },
        },
      });
    } else {
      // Create new confirmation
      confirmation = await prisma.gameConfirmation.create({
        data: {
          gameId: params.id,
          userId: session.user.id,
          status,
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
