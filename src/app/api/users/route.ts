import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { userQuerySchema } from "@/lib/schemas";

export const dynamic = 'force-dynamic';

async function handleGet(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Validar query params
    const queryResult = userQuerySchema.safeParse({
      playerType: searchParams.get("playerType"),
      isActive: searchParams.get("isActive"),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { playerType, isActive } = queryResult.data;

    const now = new Date();

    const usersData = await prisma.user.findMany({
      where: {
        ...(playerType ? { playerType } : {}),
        ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
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
              },
              isActive: true
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

// Exportar com rate limiting
export const GET = withRateLimit(handleGet, {
  limiter: rateLimiters.api,
  keyPrefix: "users:list",
});
