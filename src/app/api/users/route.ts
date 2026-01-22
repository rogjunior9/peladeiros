import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playerType = searchParams.get("playerType");
    const isActive = searchParams.get("isActive");

    const now = new Date();

    const usersData = await prisma.user.findMany({
      where: {
        ...(playerType ? { playerType: playerType as any } : {}),
        ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      },
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
        // Fetch confirmed past games to count presences correctly
        confirmations: {
          where: {
            status: "CONFIRMED",
            game: {
              date: {
                lt: now
              }
            }
          },
          select: { id: true }
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Map to maintain interface compatibility
    const users = usersData.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      role: user.role,
      playerType: user.playerType,
      isActive: user.isActive,
      createdAt: user.createdAt,
      _count: {
        confirmations: user.confirmations.length,
        payments: user._count.payments
      }
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erro ao listar usuarios:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
