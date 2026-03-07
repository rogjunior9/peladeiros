import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/supabase-auth";
import { prisma } from "@/lib/prisma";

function hasAdminAccess(user: { role?: string | null; email?: string | null }) {
  if (user?.role === "ADMIN") return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (!hasAdminAccess(session.user)) {
      return NextResponse.json(
        { error: "Apenas administradores podem editar participantes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const userId = body?.userId ? String(body.userId) : "";
    const guestName = body?.guestName ? String(body.guestName).trim() : "";
    const guestPlayerType = body?.guestPlayerType === "GOALKEEPER" ? "GOALKEEPER" : "CASUAL";
    const status = body?.status ? String(body.status) : "CONFIRMED";

    if (!userId && !guestName) {
      return NextResponse.json({ error: "Informe userId ou guestName" }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!game) {
      return NextResponse.json({ error: "Jogo nao encontrado" }, { status: 404 });
    }

    let confirmation;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Usuário nao encontrado" }, { status: 404 });
      }

      confirmation = await prisma.gameConfirmation.upsert({
        where: {
          gameId_userId: {
            gameId: params.id,
            userId,
          },
        },
        update: { status: status as any, isGuest: false, guestName: null },
        create: {
          gameId: params.id,
          userId,
          status: status as any,
        },
      });
    } else {
      confirmation = await prisma.gameConfirmation.create({
        data: {
          gameId: params.id,
          userId: null,
          status: status as any,
          isGuest: true,
          guestName,
        },
      });

      // Novo comportamento: convidado vira jogador avulso no banco
      const casualUser = await prisma.user.create({
        data: {
          name: guestName,
          role: "PLAYER",
          playerType: guestPlayerType,
          isActive: true,
        },
      });

      confirmation = await prisma.gameConfirmation.update({
        where: { id: confirmation.id },
        data: {
          userId: casualUser.id,
          isGuest: false,
          guestName: null,
          status: "CONFIRMED",
        },
      });
    }

    return NextResponse.json(confirmation);
  } catch (error) {
    console.error("Erro ao atualizar participantes:", error);
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
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (!hasAdminAccess(session.user)) {
      return NextResponse.json(
        { error: "Apenas administradores podem editar participantes" },
        { status: 403 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const userId = searchParams.get("userId");
    const confirmationId = searchParams.get("confirmationId");
    if (!userId && !confirmationId) {
      return NextResponse.json({ error: "userId ou confirmationId é obrigatório" }, { status: 400 });
    }

    if (confirmationId) {
      await prisma.gameConfirmation.deleteMany({
        where: {
          id: confirmationId,
          gameId: params.id,
        },
      });
    } else {
      await prisma.gameConfirmation.deleteMany({
        where: {
          gameId: params.id,
          userId: userId!,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover participante:", error);
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
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (!hasAdminAccess(session.user)) {
      return NextResponse.json(
        { error: "Apenas administradores podem editar participantes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const confirmationId = body?.confirmationId ? String(body.confirmationId) : "";
    const userId = body?.userId ? String(body.userId) : "";

    if (!confirmationId || !userId) {
      return NextResponse.json({ error: "confirmationId e userId são obrigatórios" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const guestConfirmation = await tx.gameConfirmation.findFirst({
        where: {
          id: confirmationId,
          gameId: params.id,
          isGuest: true,
        },
      });

      if (!guestConfirmation) {
        throw new Error("Convidado não encontrado");
      }

      const existingUserConfirmation = await tx.gameConfirmation.findUnique({
        where: {
          gameId_userId: {
            gameId: params.id,
            userId,
          },
        },
      });

      if (existingUserConfirmation) {
        const updated = await tx.gameConfirmation.update({
          where: { id: existingUserConfirmation.id },
          data: { status: "CONFIRMED" },
        });

        await tx.gameConfirmation.delete({
          where: { id: guestConfirmation.id },
        });

        return updated;
      }

      return tx.gameConfirmation.update({
        where: { id: guestConfirmation.id },
        data: {
          userId,
          isGuest: false,
          guestName: null,
          status: "CONFIRMED",
        },
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "Convidado não encontrado") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("Erro ao vincular convidado:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
