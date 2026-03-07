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
      return NextResponse.json({ error: "Apenas administradores podem gerar PIX" }, { status: 403 });
    }

    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const gameId = typeof body?.gameId === "string" ? body.gameId : "";
    const amount = Number(body?.amount || 0);

    if (!userId || !gameId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }

    const [user, game, settings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          document: true,
        },
      }),
      prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          title: true,
          isActive: true,
          date: true,
        },
      }),
      prisma.notificationSettings.findFirst({
        select: { defaultCpf: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Jogador nao encontrado" }, { status: 404 });
    }

    if (!game || !game.isActive) {
      return NextResponse.json({ error: "Pelada nao encontrada ou inativa" }, { status: 404 });
    }

    const customerDocument = (user.document || settings?.defaultCpf || "").replace(/\D/g, "");
    if (!/^\d{11}$/.test(customerDocument)) {
      return NextResponse.json(
        { error: "CPF do jogador (ou CPF padrao) e obrigatorio para gerar PIX" },
        { status: 400 }
      );
    }

    const existingPending = await prisma.payment.findFirst({
      where: {
        userId,
        gameId,
        status: "PENDING",
        method: "PIX",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending?.pixCode) {
      return NextResponse.json({
        payment: {
          id: existingPending.id,
          amount: existingPending.amount,
          status: existingPending.status,
          pixCode: existingPending.pixCode,
          pixQrCode: existingPending.pixQrCode,
        },
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
        reused: true,
      });
    }

    const payment = existingPending
      ? await prisma.payment.update({
          where: { id: existingPending.id },
          data: {
            amount,
            method: "PIX",
            status: "PENDING",
            notes: "PIX gerado pelo admin para cobranca da pelada",
          },
        })
      : await prisma.payment.create({
          data: {
            userId,
            gameId,
            amount,
            method: "PIX",
            status: "PENDING",
            notes: "PIX gerado pelo admin para cobranca da pelada",
          },
        });

    let pixRes;
    try {
      pixRes = await pagseguro.createPixPayment({
        amount,
        description: `Pelada ${game.title} - ${payment.id}`,
        referenceId: payment.id,
        customerName: user.name || "Jogador",
        customerEmail: user.email || "admin@peladeiros.com",
        customerDocument,
      });
    } catch (error: any) {
      const message = String(error?.message || "");
      return NextResponse.json(
        { error: `Falha ao gerar cobrança no PagSeguro: ${message || "erro desconhecido"}` },
        { status: 502 }
      );
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalId: pixRes.id,
        externalCode: pixRes.referenceId,
        pixCode: pixRes.pixCode,
        pixQrCode: pixRes.pixQrCode,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        pixCode: true,
        pixQrCode: true,
      },
    });

    return NextResponse.json({
      payment: updated,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PIX admin:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
