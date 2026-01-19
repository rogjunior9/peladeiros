import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pagseguro } from "@/lib/pagseguro";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, gameId, referenceMonth, document } = body;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    // Create payment record first
    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        method: "PIX",
        status: "PENDING",
        userId: session.user.id,
        gameId,
        referenceMonth,
      },
    });

    try {
      // Create PIX payment via PagSeguro
      const pixPayment = await pagseguro.createPixPayment({
        amount: parseFloat(amount),
        description: gameId
          ? `Pagamento pelada - ${payment.id}`
          : `Mensalidade ${referenceMonth} - ${payment.id}`,
        referenceId: payment.id,
        customerName: user.name || "Usuario",
        customerEmail: user.email || "",
        customerDocument: document,
      });

      // Update payment with external IDs and PIX data
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: pixPayment.id,
          externalCode: pixPayment.referenceId,
          pixCode: pixPayment.pixCode,
          pixQrCode: pixPayment.pixQrCode,
        },
      });

      return NextResponse.json({
        payment: updatedPayment,
        pixCode: pixPayment.pixCode,
        pixQrCode: pixPayment.pixQrCode,
      });
    } catch (pagSeguroError) {
      // If PagSeguro fails, delete the payment record
      await prisma.payment.delete({ where: { id: payment.id } });
      throw pagSeguroError;
    }
  } catch (error) {
    console.error("Erro ao criar pagamento PIX:", error);
    return NextResponse.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 }
    );
  }
}
