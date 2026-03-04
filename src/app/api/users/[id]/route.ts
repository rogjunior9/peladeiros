import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { updateUserSchema } from "@/lib/schemas";

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
    if (session.user.role !== "ADMIN" && session.user.id !== params.id) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    return NextResponse.json(user);
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
    const isAdmin = session.user.role === "ADMIN";

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

// Exportar com rate limiting
const getHandler = (req: NextRequest, ctx: { params: { id: string } }) => handleGet(req, ctx);
const putHandler = (req: NextRequest, ctx: { params: { id: string } }) => handlePut(req, ctx);

export const GET = withRateLimit(getHandler, {
  limiter: rateLimiters.api,
  keyPrefix: "users:get",
});

export const PUT = withRateLimit(putHandler, {
  limiter: rateLimiters.api,
  keyPrefix: "users:update",
  getKey: (req) => `users:update:${req.ip || "anonymous"}`,
});
