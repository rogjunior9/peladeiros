import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pagseguro } from "@/lib/pagseguro";

function monthToLabel(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, (monthNum || 1) - 1, 1);
  return date.toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const month = typeof body?.month === "string" ? body.month : "";

    if (!userId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }

    const [settings, user] = await Promise.all([
      prisma.notificationSettings.findFirst(),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          document: true,
          playerType: true,
          isActive: true,
        },
      }),
    ]);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Jogador nao encontrado" }, { status: 404 });
    }

    if (user.playerType !== "MONTHLY") {
      return NextResponse.json({ error: "Jogador nao e mensalista" }, { status: 400 });
    }

    const monthlyFee = settings?.monthlyFee || 60;
    const cpf = user.document || settings?.defaultCpf;
    if (!cpf || !/^\d{11}$/.test(cpf.replace(/\D/g, ""))) {
      return NextResponse.json({ error: "CPF do jogador (ou CPF padrao) e obrigatorio" }, { status: 400 });
    }

    const existing = await prisma.payment.findFirst({
      where: { userId, referenceMonth: month },
      orderBy: { createdAt: "desc" },
    });

    if (existing?.status === "CONFIRMED") {
      return NextResponse.json({ error: "Mensalidade ja confirmada neste mes" }, { status: 400 });
    }

    let paymentId = existing?.id;
    if (!existing) {
      const created = await prisma.payment.create({
        data: {
          userId,
          referenceMonth: month,
          amount: monthlyFee,
          method: "PIX",
          status: "PENDING",
          notes: "Cobranca mensal gerada individualmente pelo admin",
        },
      });
      paymentId = created.id;
    } else {
      await prisma.payment.update({
        where: { id: existing.id },
        data: {
          amount: monthlyFee,
          method: "PIX",
          status: "PENDING",
          notes: "Cobranca mensal atualizada pelo admin",
        },
      });
    }

    const description = `Mensalidade ${monthToLabel(month)}`;
    const pixRes = await pagseguro.createPixPayment({
      amount: monthlyFee,
      description,
      referenceId: paymentId!,
      customerName: user.name || "Mensalista",
      customerEmail: user.email || "admin@peladeiros.com",
      customerDocument: cpf.replace(/\D/g, ""),
    });

    const payment = await prisma.payment.update({
      where: { id: paymentId! },
      data: {
        method: "PIX",
        status: "PENDING",
        externalId: pixRes.id,
        externalCode: pixRes.referenceId,
        pixCode: pixRes.pixCode,
        pixQrCode: pixRes.pixQrCode,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        referenceMonth: true,
        pixCode: true,
        pixQrCode: true,
      },
    });

    return NextResponse.json({
      payment,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar cobranca mensal individual:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
