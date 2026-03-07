import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pagseguro } from "@/lib/pagseguro";

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

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (!(await hasAdminAccess(session.user))) {
      return NextResponse.json(
        { error: "Apenas administradores podem gerar invoice" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const gameId = typeof body?.gameId === "string" ? body.gameId : "";
    const amount = Number(body?.amount || 0);

    if (!userId || !gameId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const [user, game, settings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, document: true },
      }),
      prisma.game.findUnique({
        where: { id: gameId },
        select: { id: true, title: true, isActive: true },
      }),
      prisma.notificationSettings.findFirst({
        select: { defaultCpf: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Jogador não encontrado" }, { status: 404 });
    }

    if (!game || !game.isActive) {
      return NextResponse.json({ error: "Pelada não encontrada ou inativa" }, { status: 404 });
    }

    const customerDocument = user.document || settings?.defaultCpf;
    if (!customerDocument || !/^\d{11}$/.test(customerDocument.replace(/\D/g, ""))) {
      return NextResponse.json(
        { error: "CPF do jogador (ou CPF padrão) é obrigatório para gerar invoice no PagSeguro" },
        { status: 400 }
      );
    }

    const pendingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        gameId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    const payment = pendingPayment
      ? await prisma.payment.update({
          where: { id: pendingPayment.id },
          data: {
            amount,
            method: "PIX",
            notes: "Invoice PagSeguro gerado pelo admin",
          },
        })
      : await prisma.payment.create({
          data: {
            userId,
            gameId,
            amount,
            method: "PIX",
            status: "PENDING",
            notes: "Invoice PagSeguro gerado pelo admin",
          },
        });

    const invoiceUrl = await pagseguro.createPaymentLink({
      amount,
      description: `Pelada ${game.title} - ${payment.id}`,
      referenceId: payment.id,
      customerName: user.name || "Jogador",
      customerEmail: user.email || "admin@peladeiros.com",
      customerDocument,
    });

    if (!invoiceUrl) {
      return NextResponse.json({ error: "Não foi possível gerar o invoice no PagSeguro" }, { status: 502 });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalCode: invoiceUrl,
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      invoiceUrl,
    });
  } catch (error) {
    console.error("Erro ao gerar invoice:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
