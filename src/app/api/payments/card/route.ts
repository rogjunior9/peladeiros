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
    const { amount, gameId, referenceMonth, document, cardToken, installments } = body;

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
        method: "CREDIT_CARD",
        status: "PENDING",
        userId: session.user.id,
        gameId,
        referenceMonth,
      },
    });

    try {
      // Create Card payment via PagSeguro
      const cardPayment = await pagseguro.createCardPayment({
        amount: parseFloat(amount),
        description: gameId
          ? `Pagamento pelada - ${payment.id}`
          : `Mensalidade ${referenceMonth} - ${payment.id}`,
        referenceId: payment.id,
        customerName: user.name || "Usuario",
        customerEmail: user.email || "",
        customerDocument: document,
        cardToken,
        installments: installments || 1,
      });

      // Update payment with external IDs
      const status = cardPayment.status === "CONFIRMED" ? "CONFIRMED" : "PENDING";
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: cardPayment.id,
          externalCode: cardPayment.referenceId,
          status: status as any,
          paidAt: status === "CONFIRMED" ? new Date() : null,
        },
      });

      return NextResponse.json({
        payment: updatedPayment,
        status: cardPayment.status,
      });
    } catch (pagSeguroError) {
      // If PagSeguro fails, mark payment as cancelled
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED" },
      });
      throw pagSeguroError;
    }
  } catch (error) {
    console.error("Erro ao criar pagamento cartao:", error);
    return NextResponse.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 }
    );
  }
}
