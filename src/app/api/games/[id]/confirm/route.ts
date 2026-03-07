import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pagseguro } from "@/lib/pagseguro";
import { rateLimiters, withRateLimit } from "@/lib/rate-limit";
import { confirmGameSchema } from "@/lib/schemas";
import { ConfirmationStatus } from "@prisma/client";

const MAX_GOALKEEPERS = Number(process.env.MAX_GOALKEEPERS_PER_GAME || "4");

async function handlePost(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar com Zod
    const validationResult = confirmGameSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { status, guestName } = validationResult.data;

    // Executar em transação para evitar race conditions
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar jogo com lock
      const game = await tx.game.findUnique({
        where: { id: params.id },
        include: {
          confirmations: {
            where: { status: "CONFIRMED" },
          },
        },
      });

      if (!game) {
        throw new Error("Jogo nao encontrado");
      }

      // 2. Buscar confirmação existente
      const existingConfirmation = await tx.gameConfirmation.findUnique({
        where: {
          gameId_userId: {
            gameId: params.id,
            userId: session.user.id,
          },
        },
      });

      let targetStatus = status;

      if (status === "CONFIRMED") {
        // Regra de Lista de Espera
        const playerType = session.user.playerType as string;
        const isPriority = playerType === "MONTHLY" || playerType === "GOALKEEPER";

        // Combinar Data e Hora para o calculo
        const [hours, minutes] = game.startTime.split(':').map(Number);
        const gameDateTime = new Date(game.date);
        gameDateTime.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const msUntilGame = gameDateTime.getTime() - now.getTime();
        const hoursUntilGame = msUntilGame / (1000 * 60 * 60);

        // Se avulso e faltam mais de 4h (e nao eh passado)
        if (!isPriority && hoursUntilGame > 4) {
          targetStatus = "WAITING_LIST";
        }

        // Se for para CONFIRMAR de fato, checa lotacao por tipo
        if (targetStatus === "CONFIRMED") {
          const isGoalkeeper = playerType === "GOALKEEPER";

          if (isGoalkeeper) {
            const confirmedGoalkeepers = await tx.gameConfirmation.count({
              where: {
                gameId: params.id,
                status: "CONFIRMED",
                user: { playerType: "GOALKEEPER" },
              },
            });

            if (confirmedGoalkeepers >= MAX_GOALKEEPERS) {
              if (!existingConfirmation || existingConfirmation.status !== "CONFIRMED") {
                throw new Error("Limite de goleiros atingido");
              }
            }
          } else {
            const confirmedLinePlayers = await tx.gameConfirmation.count({
              where: {
                gameId: params.id,
                status: "CONFIRMED",
                user: {
                  OR: [
                    { playerType: "MONTHLY" },
                    { playerType: "CASUAL" },
                  ],
                },
              },
            });

            if (confirmedLinePlayers >= game.maxPlayers) {
              if (!existingConfirmation || existingConfirmation.status !== "CONFIRMED") {
                throw new Error("Jogo lotado");
              }
            }
          }
        }
      }

      let confirmation;

      if (existingConfirmation) {
        confirmation = await tx.gameConfirmation.update({
          where: { id: existingConfirmation.id },
          data: { status: targetStatus },
          include: {
            user: {
              select: { name: true, email: true, playerType: true, phone: true, document: true },
            },
          },
        });
      } else {
        confirmation = await tx.gameConfirmation.create({
          data: {
            gameId: params.id,
            userId: session.user.id,
            status: targetStatus,
            isGuest: !!guestName,
            guestName,
          },
          include: {
            user: {
              select: { name: true, email: true, playerType: true, phone: true, document: true },
            },
          },
        });
      }

      return { confirmation, game, targetStatus };
    }, {
      isolationLevel: "Serializable", // Previne race conditions
      maxWait: 5000,
      timeout: 10000,
    });

    const { confirmation, game, targetStatus } = result;

    // Trigger Automação de Cobrança Instantânea (Avulso Confirmado)
    // Executar fora da transação para não bloquear
    if (confirmation.status === "CONFIRMED" && confirmation.user && 
        (!confirmation.user.playerType || confirmation.user.playerType === "CASUAL")) {
      
      // Fire and forget - não esperar para não atrasar a resposta
      processPaymentAutomation(confirmation, game).catch(err => {
        console.error("Erro na automação de pagamento:", err);
      });
    }

    return NextResponse.json(confirmation);

  } catch (error: any) {
    console.error("Erro ao confirmar presenca:", error);
    
    if (error.message === "Jogo nao encontrado") {
      return NextResponse.json({ error: "Jogo nao encontrado" }, { status: 404 });
    }
    
    if (error.message === "Jogo lotado") {
      return NextResponse.json({ error: "Jogo lotado" }, { status: 400 });
    }

    if (error.message === "Limite de goleiros atingido") {
      return NextResponse.json({ error: "Limite de goleiros atingido" }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Função separada para automação de pagamento
async function processPaymentAutomation(
  confirmation: any,
  game: any
) {
  try {
    const settings = await prisma.notificationSettings.findFirst();

    if (!settings || !process.env.N8N_WEBHOOK_URL) {
      return;
    }

    let pixData = { pixCode: "", pixQrCode: "", creditLink: "", creditAmount: 0 };
    const cpf = confirmation.user.document || settings.defaultCpf;
    const creditFee = settings.creditCardFee || 5.0;
    const creditAmount = game.pricePerPlayer * (1 + (creditFee / 100));
    pixData.creditAmount = creditAmount;

    // Reuse existing PENDING payment if any
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: confirmation.userId!,
        gameId: game.id,
        status: "PENDING"
      }
    });

    let paymentToUse = existingPayment;

    // Only create new if none exists
    if (!existingPayment && cpf) {
      try {
        const paymentRes = await pagseguro.createPixPayment({
          amount: game.pricePerPlayer,
          description: `Pelada ${game.title}`,
          referenceId: `GAME-${game.id}-USER-${confirmation.userId}-${Date.now()}`,
          customerName: confirmation.user!.name || "Jogador",
          customerEmail: confirmation.user!.email || settings.pixKey || "admin@peladeiros.com",
          customerDocument: cpf
        });

        paymentToUse = await prisma.payment.create({
          data: {
            userId: confirmation.userId!,
            gameId: game.id,
            amount: game.pricePerPlayer,
            method: "PIX",
            status: "PENDING",
            externalId: paymentRes.id,
            externalCode: paymentRes.referenceId,
            pixCode: paymentRes.pixCode,
            pixQrCode: paymentRes.pixQrCode
          },
          include: { user: true, game: true }
        });
      } catch (err) {
        console.error("Erro PagSeguro Create", err);
      }
    }

    if (paymentToUse) {
      pixData.pixCode = paymentToUse.pixCode || "";
      pixData.pixQrCode = paymentToUse.pixQrCode || "";
    }

    // Generate credit link
    if (cpf && !existingPayment) {
      try {
        const link = await pagseguro.createPaymentLink({
          amount: creditAmount,
          description: `Pelada ${game.title} (Credito)`,
          referenceId: `CREDIT-${game.id}-USER-${confirmation.userId}-${Date.now()}`,
          customerName: confirmation.user!.name || "Jogador",
          customerEmail: confirmation.user!.email || "admin@peladeiros.com",
          customerDocument: cpf
        });
        if (link) pixData.creditLink = link;
      } catch (e) { 
        console.error("Erro Link", e); 
      }
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL.replace(/\/webhook\/saldo$/, "") + "/webhook/financial-events";

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'charge_casual',
        user: {
          name: confirmation.user.name,
          phone: confirmation.user.phone,
          email: confirmation.user.email
        },
        game: {
          title: game.title,
          date: game.date,
          startTime: game.startTime,
          price: game.pricePerPlayer
        },
        pixKey: settings.pixKey,
        pixCode: pixData.pixCode,
        pixQrCode: pixData.pixQrCode,
        creditLink: pixData.creditLink,
        creditAmount: pixData.creditAmount.toFixed(2),
        hasPixGenerated: !!pixData.pixCode
      })
    });
  } catch (e) {
    console.error("Erro ao disparar cobranca", e);
  }
}

async function handleDelete(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Cancel pending payments
      const pendingPayment = await tx.payment.findFirst({
        where: {
          gameId: params.id,
          userId: session.user.id,
          status: "PENDING"
        }
      });

      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: { status: "CANCELLED" }
        });
      }

      // 2. Remove confirmation
      await tx.gameConfirmation.deleteMany({
        where: {
          gameId: params.id,
          userId: session.user.id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover confirmacao:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Exportar com rate limiting
export const POST = withRateLimit(handlePost, {
  limiter: rateLimiters.confirmation,
  keyPrefix: "game:confirm",
  getKey: (req) => `game:confirm:${req.ip || "anonymous"}`,
});

export const DELETE = withRateLimit(handleDelete, {
  limiter: rateLimiters.confirmation,
  keyPrefix: "game:unconfirm",
  getKey: (req) => `game:unconfirm:${req.ip || "anonymous"}`,
});
