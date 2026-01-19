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

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, playerType: true },
        },
        game: {
          select: { id: true, title: true, date: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Pagamento nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Erro ao buscar pagamento:", error);
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
        { error: "Apenas administradores podem atualizar pagamentos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, notes } = body;

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: {
        status,
        notes,
        paidAt: status === "CONFIRMED" ? new Date() : undefined,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Erro ao atualizar pagamento:", error);
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
        { error: "Apenas administradores podem excluir pagamentos" },
        { status: 403 }
      );
    }

    await prisma.payment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
