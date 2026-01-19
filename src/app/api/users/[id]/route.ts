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
        role: true,
        playerType: true,
        isActive: true,
        createdAt: true,
        confirmations: {
          include: {
            game: {
              select: { title: true, date: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
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
    const { name, phone, role, playerType, isActive } = body;

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

    // User can update their own name and phone
    if (params.id === session.user.id || session.user.role === "ADMIN") {
      if (name) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
    }

    // Only admin can update these fields
    if (session.user.role === "ADMIN") {
      if (role) updateData.role = role;
      if (playerType) updateData.playerType = playerType;
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
