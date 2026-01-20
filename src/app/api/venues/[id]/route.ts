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

    const venue = await prisma.venue.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: { name: true },
        },
        games: {
          where: { isActive: true },
          orderBy: { date: "desc" },
          take: 10,
        },
      },
    });

    if (!venue) {
      return NextResponse.json({ error: "Local nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(venue);
  } catch (error) {
    console.error("Erro ao buscar local:", error);
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem editar locais" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      pricePerHour,
      gameType,
      capacity,
      isActive,
      googleMapsLink,
    } = body;

    const venue = await prisma.venue.update({
      where: { id: params.id },
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        phone,
        pricePerHour: (pricePerHour === "" || pricePerHour === null || pricePerHour === undefined) ? null : parseFloat(String(pricePerHour)),
        gameType,
        capacity: (capacity && String(capacity).length > 0) ? parseInt(String(capacity)) : undefined,
        isActive,
        googleMapsLink,
      },
    });

    return NextResponse.json(venue);
  } catch (error) {
    console.error("Erro ao atualizar local:", error);
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem excluir locais" },
        { status: 403 }
      );
    }

    await prisma.venue.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir local:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
