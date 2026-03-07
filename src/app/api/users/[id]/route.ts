import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { updateUserSchema } from "@/lib/schemas";

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
      select: { role: true },
    });
    return dbUser?.role === "ADMIN";
  }

  return false;
}

async function handleGet(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        document: true,
        role: true,
        playerType: true,
        isActive: true,
        createdAt: true,
        confirmations: {
          where: {
            game: { isActive: true }
          },
          include: {
            game: {
              select: { id: true, title: true, date: true, pricePerPlayer: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    // Se não for admin, só pode ver próprio perfil
    if (!(await hasAdminAccess(session.user)) && session.user.id !== params.id) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const canViewDocument = session.user.id === params.id;
    return NextResponse.json({
      ...user,
      document: canViewDocument ? user.document : null,
    });
  } catch (error) {
    console.error("Erro ao buscar usuario:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

async function handlePut(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar com Zod
    const validationResult = updateUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, phone, document, role, playerType, isActive } = validationResult.data;

    // Verificar permissões
    const isSelf = params.id === session.user.id;
    const isAdmin = await hasAdminAccess(session.user);

    // Only admin can change role and playerType
    if ((role || playerType !== undefined) && !isAdmin && !isSelf) {
      return NextResponse.json(
        { error: "Sem permissao para editar este usuario" },
        { status: 403 }
      );
    }

    // Construir objeto de update
    const updateData: any = {};

    // User can update their own name, phone, document, and playerType
    if (isSelf || isAdmin) {
      if (name) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (document !== undefined) updateData.document = document.replace(/\D/g, "");
      if (playerType !== undefined) updateData.playerType = playerType;
    }

    // Only admin can update these fields
    if (isAdmin) {
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    // Executar update em transação
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: params.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          playerType: true,
          isActive: true,
        },
      });

      return updated;
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro ao atualizar usuario:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

async function handleDelete(
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
        { error: "Apenas administradores podem excluir jogadores" },
        { status: 403 }
      );
    }

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Nao e permitido excluir o proprio usuario logado" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    const ownership = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        _count: {
          select: {
            createdGames: true,
            createdVenues: true,
            transactions: true,
          },
        },
      },
    });

    if (
      (ownership?._count.createdGames || 0) > 0 ||
      (ownership?._count.createdVenues || 0) > 0 ||
      (ownership?._count.transactions || 0) > 0
    ) {
      return NextResponse.json(
        { error: "Usuario possui registros administrativos criados. Reatribua antes de excluir." },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const [confirmations, payments, sessions, accounts, notifications, auditLogs] = await Promise.all([
        tx.gameConfirmation.deleteMany({ where: { userId: params.id } }),
        tx.payment.deleteMany({ where: { userId: params.id } }),
        tx.session.deleteMany({ where: { userId: params.id } }),
        tx.account.deleteMany({ where: { userId: params.id } }),
        tx.notification.deleteMany({ where: { userId: params.id } }),
        tx.auditLog.deleteMany({ where: { userId: params.id } }),
      ]);

      await tx.user.delete({
        where: { id: params.id },
      });

      return {
        deletedUserId: params.id,
        deletedUserName: targetUser.name || "Sem nome",
        removed: {
          confirmations: confirmations.count,
          payments: payments.count,
          sessions: sessions.count,
          accounts: accounts.count,
          notifications: notifications.count,
          auditLogs: auditLogs.count,
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao excluir usuario:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Exportar com rate limiting
const getHandler = (req: NextRequest, ctx: { params: { id: string } }) => handleGet(req, ctx);
const putHandler = (req: NextRequest, ctx: { params: { id: string } }) => handlePut(req, ctx);
const deleteHandler = (req: NextRequest, ctx: { params: { id: string } }) => handleDelete(req, ctx);

export const GET = withRateLimit(getHandler, {
  limiter: rateLimiters.api,
  keyPrefix: "users:get",
});

export const PUT = withRateLimit(putHandler, {
  limiter: rateLimiters.api,
  keyPrefix: "users:update",
  getKey: (req) => `users:update:${req.ip || "anonymous"}`,
});

export const DELETE = withRateLimit(deleteHandler, {
  limiter: rateLimiters.api,
  keyPrefix: "users:delete",
  getKey: (req) => `users:delete:${req.ip || "anonymous"}`,
});
