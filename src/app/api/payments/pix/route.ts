import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pagseguro } from "@/lib/pagseguro";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { createPixPaymentSchema } from "@/lib/schemas";
import { ZodError } from "zod";

async function handlePost(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar com Zod
    const validationResult = createPixPaymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { amount, gameId, referenceMonth, document } = validationResult.data;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    // Verificar se CPF foi informado ou se usuário tem CPF cadastrado
    const effectiveDocument = document || user.document;
    
    if (!effectiveDocument) {
      return NextResponse.json(
        { error: "CPF é obrigatório para pagamentos PIX" },
        { status: 400 }
      );
    }

    // Validar formato do CPF (11 dígitos)
    if (!/^\d{11}$/.test(effectiveDocument.replace(/\D/g, ""))) {
      return NextResponse.json(
        { error: "CPF inválido. Deve conter 11 dígitos." },
        { status: 400 }
      );
    }

    // Se houver gameId, verificar se jogo existe e está ativo
    if (gameId) {
      const game = await prisma.game.findUnique({
        where: { id: gameId, isActive: true },
      });
      if (!game) {
        return NextResponse.json({ error: "Jogo não encontrado ou cancelado" }, { status: 404 });
      }
    }

    // Verificar se já existe pagamento PENDENTE para este usuário/jogo
    const existingPendingPayment = await prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        gameId: gameId || null,
        status: "PENDING",
        method: "PIX",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
        },
      },
    });

    if (existingPendingPayment && existingPendingPayment.pixCode) {
      // Reutilizar pagamento existente
      return NextResponse.json({
        payment: existingPendingPayment,
        pixCode: existingPendingPayment.pixCode,
        pixQrCode: existingPendingPayment.pixQrCode,
        reused: true,
      });
    }

    // Create payment record first
    const payment = await prisma.payment.create({
      data: {
        amount,
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
        amount,
        description: gameId
          ? `Pagamento pelada - ${payment.id}`
          : `Mensalidade ${referenceMonth} - ${payment.id}`,
        referenceId: payment.id,
        customerName: user.name || "Usuario",
        customerEmail: user.email || "",
        customerDocument: effectiveDocument.replace(/\D/g, ""),
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
    } catch (pagSeguroError: any) {
      // If PagSeguro fails, delete the payment record
      await prisma.payment.delete({ where: { id: payment.id } });
      
      console.error("Erro PagSeguro:", pagSeguroError);
      
      return NextResponse.json(
        { error: "Erro ao gerar PIX. Tente novamente." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Erro ao criar pagamento PIX:", error);
    return NextResponse.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 }
    );
  }
}

// Exportar com rate limiting
export const POST = withRateLimit(handlePost, {
  limiter: rateLimiters.payment,
  keyPrefix: "payment:pix",
  getKey: (req) => `payment:pix:${req.ip || "anonymous"}`,
});
