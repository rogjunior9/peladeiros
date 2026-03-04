import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { createVenueSchema } from "@/lib/schemas";

async function handleGet(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const venues = await prisma.venue.findMany({
      where: { isActive: true },
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

async function handlePost(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem criar locais" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validar com Zod
    const validationResult = createVenueSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const {
      name,
      address,
      googleMapsLink,
      city,
      state,
      zipCode,
      phone,
      pricePerHour,
      gameType,
      capacity,
    } = validationResult.data;

    const venue = await prisma.venue.create({
      data: {
        name,
        address,
        googleMapsLink,
        city,
        state,
        zipCode,
        phone,
        pricePerHour,
        gameType,
        capacity,
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

// Exportar com rate limiting
export const GET = withRateLimit(handleGet, {
  limiter: rateLimiters.api,
  keyPrefix: "venues:list",
});

export const POST = withRateLimit(handlePost, {
  limiter: rateLimiters.api,
  keyPrefix: "venues:create",
});
