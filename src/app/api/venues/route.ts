import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { createVenueSchema } from "@/lib/schemas";

function hasAdminAccess(user: { role?: string | null; email?: string | null }) {
  if (user?.role === "ADMIN") return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

function normalizeVenueInput(raw: any) {
  const zipCodeDigits = raw?.zipCode ? String(raw.zipCode).replace(/\D/g, "") : "";
  const phoneDigits = raw?.phone ? String(raw.phone).replace(/\D/g, "") : "";
  const priceRaw = raw?.pricePerHour;
  const capacityRaw = raw?.capacity;

  return {
    ...raw,
    name: raw?.name?.trim?.(),
    address: raw?.address?.trim?.(),
    city: raw?.city?.trim?.(),
    state: raw?.state?.trim?.(),
    googleMapsLink: raw?.googleMapsLink?.trim?.() || undefined,
    zipCode: zipCodeDigits || undefined,
    phone: phoneDigits || undefined,
    pricePerHour:
      priceRaw === "" || priceRaw === null || priceRaw === undefined
        ? undefined
        : Number(priceRaw),
    capacity:
      capacityRaw === "" || capacityRaw === null || capacityRaw === undefined
        ? undefined
        : Number(capacityRaw),
  };
}

async function handleGet(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const venues = await prisma.venue.findMany({
      where: { isActive: true },
      include: {
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

async function handlePost(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (!hasAdminAccess(session.user)) {
      return NextResponse.json(
        { error: "Apenas administradores podem criar locais" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const normalizedBody = normalizeVenueInput(body);
    
    // Validar com Zod
    const validationResult = createVenueSchema.safeParse(normalizedBody);
    
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
