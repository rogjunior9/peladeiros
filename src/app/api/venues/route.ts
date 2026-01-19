import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const venues = await prisma.venue.findMany({
      where: { isActive: true },
      include: {
        createdBy: {
          select: { name: true },
        },
        _count: {
          select: { games: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(venues);
  } catch (error) {
    console.error("Erro ao listar locais:", error);
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
        { error: "Apenas administradores podem cadastrar locais" },
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
    } = body;

    const venue = await prisma.venue.create({
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        phone,
        pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        gameType,
        capacity: capacity || 22,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar local:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
