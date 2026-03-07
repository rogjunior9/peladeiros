import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/supabase-auth";
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

function monthToLabel(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, (monthNum || 1) - 1, 1);
  return date.toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user || !(await hasAdminAccess(session.user))) {
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

    type ExistingPayment = Awaited<ReturnType<typeof prisma.payment.findFirst>>;
    let existing: ExistingPayment = null;
    try {
      existing = await prisma.payment.findFirst({
        where: { userId, referenceMonth: month },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("Erro ao buscar pagamento mensal existente:", error);
      return NextResponse.json({ error: "Falha ao buscar pagamento existente" }, { status: 500 });
    }

    if (existing?.status === "CONFIRMED") {
      return NextResponse.json({ error: "Mensalidade ja confirmada neste mes" }, { status: 400 });
    }

    if (existing?.status === "PENDING" && (existing.pixCode || existing.pixQrCode)) {
      return NextResponse.json({
        payment: {
          id: existing.id,
          amount: existing.amount,
          status: existing.status,
          referenceMonth: existing.referenceMonth,
          pixCode: existing.pixCode,
          pixQrCode: existing.pixQrCode,
        },
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
        reused: true,
      });
    }

    let paymentId = existing?.id;
    try {
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
          select: { id: true },
        });
        paymentId = created.id;
      } else {
        const updated = await prisma.payment.update({
          where: { id: existing.id },
          data: {
            amount: monthlyFee,
            method: "PIX",
            status: "PENDING",
            notes: "Cobranca mensal atualizada pelo admin",
          },
          select: { id: true },
        });
        paymentId = updated.id;
      }
    } catch (error) {
      console.error("Erro ao preparar pagamento mensal:", error);
      return NextResponse.json({ error: "Falha ao preparar pagamento mensal" }, { status: 500 });
    }

    if (!paymentId) {
      return NextResponse.json({ error: "Nao foi possivel definir o pagamento" }, { status: 500 });
    }

    const description = `Mensalidade ${monthToLabel(month)}`;
    let pixRes;
    try {
      pixRes = await pagseguro.createPixPayment({
        amount: monthlyFee,
        description,
        referenceId: paymentId,
        customerName: user.name || "Mensalista",
        customerEmail: user.email || "admin@peladeiros.com",
        customerDocument: cpf.replace(/\D/g, ""),
      });
    } catch (error: any) {
      const message = String(error?.message || "");
      return NextResponse.json(
        { error: `Falha ao gerar cobrança no PagSeguro: ${message || "erro desconhecido"}` },
        { status: 502 }
      );
    }

    let payment;
    try {
      payment = await prisma.payment.update({
        where: { id: paymentId },
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
    } catch (error) {
      console.error("Erro ao salvar dados PIX no pagamento mensal:", error);
      return NextResponse.json({ error: "Falha ao salvar dados da cobranca" }, { status: 500 });
    }

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
