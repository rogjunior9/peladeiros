import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pagseguro } from "@/lib/pagseguro";
import { validatePagSeguroWebhook, logWebhookEvent } from "@/lib/webhook-validator";
import { pagseguroWebhookSchema } from "@/lib/schemas";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { ZodError } from "zod";

// Webhook endpoint for PagSeguro notifications
async function handlePost(request: NextRequest) {
  const bodyText = await request.text();
  
  try {
    // 1. Validar assinatura/autenticidade do webhook
    const validation = validatePagSeguroWebhook(bodyText, request.headers);
    
    if (!validation.valid) {
      logWebhookEvent("pagseguro.notification", { body: bodyText.substring(0, 200) }, "error", validation.error);
      return NextResponse.json(
        { error: validation.error || "Webhook inválido" },
        { status: 401 }
      );
    }

    // 2. Parse e validação do payload
    const body = JSON.parse(bodyText);
    
    try {
      pagseguroWebhookSchema.parse(body);
    } catch (zodError) {
      if (zodError instanceof ZodError) {
        logWebhookEvent("pagseguro.notification", body, "error", "Schema validation failed");
        return NextResponse.json(
          { error: "Payload inválido", details: zodError.errors },
          { status: 400 }
        );
      }
      throw zodError;
    }

    // PagSeguro sends notification with charges array
    const charge = body.charges?.[0];
    const referenceId = body.reference_id;

    if (!charge || !referenceId) {
      logWebhookEvent("pagseguro.notification", body, "error", "Missing charge or reference_id");
      return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
    }

    // Map PagSeguro status to our status
    const statusMap: Record<string, string> = {
      AUTHORIZED: "PENDING",
      PAID: "CONFIRMED",
      AVAILABLE: "CONFIRMED",
      IN_ANALYSIS: "PENDING",
      DECLINED: "CANCELLED",
      CANCELED: "CANCELLED",
      REFUNDED: "REFUNDED",
    };

    const newStatus = statusMap[charge.status];
    
    if (!newStatus) {
      logWebhookEvent("pagseguro.notification", body, "error", `Unknown status: ${charge.status}`);
      return NextResponse.json(
        { error: `Status desconhecido: ${charge.status}` },
        { status: 400 }
      );
    }

    // 3. Processar em transação atômica
    const result = await prisma.$transaction(async (tx) => {
      // Find payment with lock
      const payment = await tx.payment.findFirst({
        where: {
          OR: [
            { id: referenceId },
            { externalCode: referenceId },
            { externalId: body.id },
          ],
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          game: { select: { id: true, title: true } },
        },
      });

      if (!payment) {
        throw new Error(`Payment not found for reference: ${referenceId}`);
      }

      // Prevent processing if already in final state
      if (["CONFIRMED", "REFUNDED"].includes(payment.status) && newStatus === "CANCELLED") {
        console.warn(`[Webhook] Ignorando cancelamento de pagamento já finalizado: ${payment.id}`);
        return { skipped: true, paymentId: payment.id, reason: "Already finalized" };
      }

      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus as any,
          externalId: body.id,
          paidAt: newStatus === "CONFIRMED" ? new Date() : payment.paidAt,
        },
      });

      // Se confirmado, criar notificação para o usuário
      if (newStatus === "CONFIRMED") {
        await tx.notification.create({
          data: {
            userId: payment.userId,
            title: "Pagamento Confirmado",
            message: `Seu pagamento de R$ ${payment.amount.toFixed(2)} foi confirmado.`,
            type: "SUCCESS",
            link: payment.gameId ? `/games/${payment.gameId}` : "/payments",
          },
        });
      }

      return { 
        success: true, 
        paymentId: payment.id, 
        status: newStatus,
        user: payment.user,
        game: payment.game,
      };
    }, {
      isolationLevel: "Serializable", // Maior isolamento para evitar race conditions
    });

    if ("skipped" in result && result.skipped) {
      logWebhookEvent("pagseguro.notification", body, "error", result.reason);
      return NextResponse.json({ success: false, warning: result.reason });
    }

    logWebhookEvent("pagseguro.notification", body, "success");
    console.log(`[Webhook] Payment ${result.paymentId} updated to status: ${result.status}`);

    return NextResponse.json({ 
      success: true, 
      paymentId: result.paymentId,
      status: result.status 
    });

  } catch (error: any) {
    console.error("Erro ao processar webhook PagSeguro:", error);
    logWebhookEvent("pagseguro.notification", { body: bodyText.substring(0, 500) }, "error", error.message);
    
    // Não retornar erro 500 para o PagSeguro retry excessivo
    // Retornar 200 mesmo em erro para evitar reenvios (a menos que seja erro de validação)
    if (error.message?.includes("Payment not found")) {
      return NextResponse.json(
        { error: "Payment not found", retry: false },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno", retry: true },
      { status: 500 }
    );
  }
}

// PagSeguro may also use GET to verify webhook endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}

// Export POST com rate limiting
export const POST = withRateLimit(handlePost, {
  limiter: rateLimiters.webhook,
  keyPrefix: "webhook:pagseguro",
});
