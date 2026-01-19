import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playerType = searchParams.get("playerType");
    const isActive = searchParams.get("isActive");

    const users = await prisma.user.findMany({
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
        _count: {
          select: {
            confirmations: true,
            payments: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erro ao listar usuarios:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
