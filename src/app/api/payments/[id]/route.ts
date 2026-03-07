import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function hasAdminAccess(user: { id?: string | null; role?: string | null; email?: string | null }) {
  if (user?.role === "ADMIN") return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (user?.email && adminEmails.includes(user.email.toLowerCase())) return true;

  if (user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, email: true },
    });
    if (dbUser?.role === "ADMIN") return true;
    if (dbUser?.email && adminEmails.includes(dbUser.email.toLowerCase())) return true;
  }

  if (user?.email) {
    const dbUserByEmail = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true },
    });
    if (dbUserByEmail?.role === "ADMIN") return true;
  }

  return false;
}

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

    if (!(await hasAdminAccess(session.user))) {
      return NextResponse.json(
        { error: "Apenas administradores podem atualizar pagamentos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, notes } = body;

    const existingPayment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        method: true,
        externalId: true,
        externalCode: true,
        pixCode: true,
        pixQrCode: true,
      },
    });

    if (!existingPayment) {
      return NextResponse.json({ error: "Pagamento nao encontrado" }, { status: 404 });
    }

    const isGatewayPayment =
      existingPayment.method !== "CASH" ||
      !!existingPayment.externalId ||
      !!existingPayment.externalCode ||
      !!existingPayment.pixCode ||
      !!existingPayment.pixQrCode;

    const isRevertingConfirmed =
      existingPayment.status === "CONFIRMED" && status && status !== "CONFIRMED";

    // Regra de segurança solicitada: só desfaz pagamento manual.
    if (isRevertingConfirmed && isGatewayPayment) {
      return NextResponse.json(
        { error: "Nao e permitido desfazer pagamento automatico do gateway" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: {
        status,
        notes,
        paidAt: status === "CONFIRMED" ? new Date() : null,
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

    if (!(await hasAdminAccess(session.user))) {
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
