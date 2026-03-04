import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pagseguro } from "@/lib/pagseguro";

/**
 * Cron job para expirar pagamentos PIX pendentes
 * Deve ser chamado periodicamente (ex: a cada 1 hora)
 * 
 * Configuração recomendada no Vercel Cron ou similar:
 * 0 * * * * (toda hora)
 */

// Tempo de expiração do PIX em horas (PagSeguro padrão: 24h)
const PIX_EXPIRATION_HOURS = 24;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Proteção por secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Verificar também por query param para compatibilidade
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    
    if (key !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    const expirationThreshold = new Date(now.getTime() - PIX_EXPIRATION_HOURS * 60 * 60 * 1000);

    // Buscar pagamentos PIX pendentes que expiraram
    const expiredPayments = await prisma.payment.findMany({
      where: {
        method: "PIX",
        status: "PENDING",
        createdAt: {
          lt: expirationThreshold,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        game: {
          select: { id: true, title: true },
        },
      },
    });

    const results = {
      processed: 0,
      cancelled: 0,
      confirmed: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const payment of expiredPayments) {
      try {
        // Tentar verificar status no PagSeguro antes de cancelar
        // (pode ter sido pago mas webhook não chegou)
        let finalStatus = "CANCELLED";
        let pagseguroStatus = null;

        if (payment.externalId) {
          try {
            const psStatus = await pagseguro.getPaymentStatus(payment.externalId);
            pagseguroStatus = psStatus.status;
            
            // Se já foi pago no PagSeguro, atualizar para confirmado
            if (psStatus.status === "CONFIRMED") {
              finalStatus = "CONFIRMED";
              console.log(`[Expire PIX] Pagamento ${payment.id} está CONFIRMADO no PagSeguro, atualizando...`);
            }
          } catch (e) {
            // Ignorar erro ao consultar PagSeguro, assumir expirado
            console.warn(`[Expire PIX] Erro ao consultar status no PagSeguro para ${payment.id}:`, e);
          }
        }

        // Atualizar pagamento em transação
        await prisma.$transaction(async (tx) => {
          // Atualizar status do pagamento
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: finalStatus as any,
              paidAt: finalStatus === "CONFIRMED" ? new Date() : null,
            },
          });

          // Se foi cancelado, criar notificação para o usuário
          if (finalStatus === "CANCELLED") {
            await tx.notification.create({
              data: {
                userId: payment.userId,
                title: "Pagamento PIX Expirado",
                message: `Seu PIX de R$ ${payment.amount.toFixed(2)} expirou. Gere um novo para confirmar sua vaga.`,
                type: "WARNING",
                link: payment.gameId ? `/games/${payment.gameId}` : "/payments",
              },
            });

            // Se tinha confirmação associada, mover para lista de espera ou remover
            const confirmation = await tx.gameConfirmation.findFirst({
              where: {
                userId: payment.userId,
                gameId: payment.gameId || undefined,
                status: "CONFIRMED",
              },
            });

            if (confirmation) {
              await tx.gameConfirmation.update({
                where: { id: confirmation.id },
                data: { status: "WAITING_LIST" },
              });
            }
          } else if (finalStatus === "CONFIRMED") {
            // Notificar que foi confirmado
            await tx.notification.create({
              data: {
                userId: payment.userId,
                title: "Pagamento Confirmado",
                message: `Seu PIX de R$ ${payment.amount.toFixed(2)} foi confirmado!`,
                type: "SUCCESS",
                link: payment.gameId ? `/games/${payment.gameId}` : "/payments",
              },
            });
          }
        });

        results.processed++;
        if (finalStatus === "CANCELLED") {
          results.cancelled++;
        } else if (finalStatus === "CONFIRMED") {
          results.confirmed++;
        }
        
        results.details.push({
          paymentId: payment.id,
          user: payment.user?.name,
          amount: payment.amount,
          oldStatus: "PENDING",
          newStatus: finalStatus,
          pagseguroStatus,
        });

      } catch (error) {
        console.error(`[Expire PIX] Erro ao processar pagamento ${payment.id}:`, error);
        results.errors++;
        results.details.push({
          paymentId: payment.id,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    // Log do resultado
    console.log("[Expire PIX Job] Resultado:", results);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });

  } catch (error) {
    console.error("[Expire PIX Job] Erro geral:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar expiração de PIX" },
      { status: 500 }
    );
  }
}
