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

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro ao buscar usuario:", error);
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

    const body = await request.json();
    const { name, phone, document, role, playerType, isActive } = body;

    // Only admin can change role and playerType
    if ((role || playerType !== undefined) && session.user.role !== "ADMIN") {
      // User can only update their own profile
      if (params.id !== session.user.id) {
        return NextResponse.json(
          { error: "Sem permissao para editar este usuario" },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};

    // User can update their own name, phone, document, and playerType
    if (params.id === session.user.id || session.user.role === "ADMIN") {
      if (name) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (document !== undefined) updateData.document = document;
      if (playerType !== undefined) updateData.playerType = playerType;
    }

    // Only admin can update these fields
    if (session.user.role === "ADMIN") {
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    const user = await prisma.user.update({
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

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro ao atualizar usuario:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
