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

function normalizeOptionalString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

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
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (!hasAdminAccess(session.user)) {
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

    const zipCodeDigits = zipCode ? String(zipCode).replace(/\D/g, "") : "";
    const phoneDigits = phone ? String(phone).replace(/\D/g, "") : "";

    const venue = await prisma.venue.update({
      where: { id: params.id },
      data: {
        name: normalizeOptionalString(name) ?? undefined,
        address: normalizeOptionalString(address) ?? undefined,
        city: normalizeOptionalString(city) ?? undefined,
        state: normalizeOptionalString(state) ?? undefined,
        zipCode: zipCodeDigits || null,
        phone: phoneDigits || null,
        pricePerHour: (pricePerHour === "" || pricePerHour === null || pricePerHour === undefined) ? null : parseFloat(String(pricePerHour)),
        gameType,
        capacity: (capacity && String(capacity).length > 0) ? parseInt(String(capacity)) : undefined,
        isActive,
        googleMapsLink: normalizeOptionalString(googleMapsLink),
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
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (!hasAdminAccess(session.user)) {
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
