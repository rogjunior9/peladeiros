import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pagseguro } from "@/lib/pagseguro";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { status, guestName } = body;

    // Check if game exists
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            confirmations: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Jogo nao encontrado" }, { status: 404 });
    }

    // Check for existing confirmation
    const existingConfirmation = await prisma.gameConfirmation.findUnique({
      where: {
        gameId_userId: {
          gameId: params.id,
          userId: session.user.id,
        },
      },
    });

    let targetStatus = status;

    if (status === "CONFIRMED") {
      // Regra de Lista de Espera:
      // Se nao for Mensalista nem Goleiro, E faltar mais de 4h para o jogo -> Lista de Espera
      const playerType = session.user.playerType as string; // Garantir que venha do session callback
      const isPriority = playerType === "MONTHLY" || playerType === "GOALKEEPER";

      // Combinar Data e Hora para o calculo
      const gameDate = new Date(game.date);
      const [hours, minutes] = game.startTime.split(':').map(Number);
      gameDate.setUTCHours(hours, minutes, 0, 0);

      const now = new Date();
      // Criar data do jogo combinada (assumindo que game.date esta correto dia)
      const gameDateTime = new Date(game.date);
      // Ajustar hora
      gameDateTime.setHours(hours, minutes, 0, 0);

      const msUntilGame = gameDateTime.getTime() - now.getTime();
      const hoursUntilGame = msUntilGame / (1000 * 60 * 60);

      // Se avulso e faltam mais de 4h (e nao eh passado, pra evitar bugs com jogos antigos)
      if (!isPriority && hoursUntilGame > 4) {
        targetStatus = "WAITING_LIST";
      }

      // Se for para CONFIRMAR de fato, checa lotacao
      if (targetStatus === "CONFIRMED" && game._count.confirmations >= game.maxPlayers) {
        // Se ja existe e esta CONFIRMED, nao faz nada (mantem). Se esta mudando, erro.
        if (!existingConfirmation || existingConfirmation.status !== "CONFIRMED") {
          return NextResponse.json({ error: "Jogo lotado" }, { status: 400 });
        }
      }
    }

    let confirmation;

    if (existingConfirmation) {
      confirmation = await prisma.gameConfirmation.update({
        where: { id: existingConfirmation.id },
        data: { status: targetStatus },
        include: {
          user: {
            select: { name: true, email: true, playerType: true, phone: true, document: true },
          },
        },
      });
    } else {
      confirmation = await prisma.gameConfirmation.create({
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

    // Trigger Automação de Cobrança Instantânea (Avulso Confirmado)
    if (confirmation.status === "CONFIRMED" && confirmation.user && (!confirmation.user.playerType || confirmation.user.playerType === "CASUAL")) {
      try {
        const settings = await prisma.notificationSettings.findFirst();

        if (settings && process.env.N8N_WEBHOOK_URL) {

          let pixData = { pixCode: "", pixQrCode: "", creditLink: "", creditAmount: 0 };
          // Preferencia: CPF do User > CPF Padrão (Admin)
          const cpf = confirmation.user.document || settings.defaultCpf;
          const creditFee = settings.creditCardFee || 5.0;
          const creditAmount = game.pricePerPlayer * (1 + (creditFee / 100));
          pixData.creditAmount = creditAmount;

          // Gerar PagSeguro se tiver CPF

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
              // 1. Pix
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
                  userId: confirmation.userId!, // userId existe pois checamos confirmation.user
                  gameId: game.id,
                  amount: game.pricePerPlayer,
                  method: "PIX",
                  status: "PENDING",
                  externalId: paymentRes.id,
                  externalCode: paymentRes.referenceId,
                  pixCode: paymentRes.pixCode,
                  pixQrCode: paymentRes.pixQrCode
                },
                include: { user: true, game: true } // consistency
              });

            } catch (err) {
              console.error("Erro PagSeguro Create", err);
            }
          }

          if (paymentToUse) {
            pixData.pixCode = paymentToUse.pixCode || "";
            pixData.pixQrCode = paymentToUse.pixQrCode || "";
          }

          // 2. Credit Link (Always generate link as it is stateless? Or reuse? Link expires, so maybe generate new is fine or check if we store link. We dont store link in DB currently only pixCode. So let's generate link fresh or skip if we want to be strict. Let's keep link generation for now as fallback).
          // Actually, if we are reusing payment, we might want to just show the existing info.

          if (cpf && !existingPayment) {
            // Only generate link if we created a new payment flow, or just always generate? 
            // Let's always try to generate credit link if we have CPF, it doesn't hurt DB.
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
            } catch (e) { console.error("Erro Link", e); }
          }


          const webhookUrl = process.env.N8N_WEBHOOK_URL.replace(/\/webhook\/saldo$/, "") + "/webhook/financial-events";

          fetch(webhookUrl, {
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
          }).catch(err => console.error("Erro webhook N8N", err));
        }
      } catch (e) {
        console.error("Erro ao disparar cobranca", e);
      }
    }

    return NextResponse.json(confirmation);
  } catch (error) {
    console.error("Erro ao confirmar presenca:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    // 1. Cancel pending payments
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        gameId: params.id,
        userId: session.user.id,
        status: "PENDING"
      }
    });

    if (pendingPayment) {
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: { status: "CANCELLED" }
      });
    }

    // 2. Remove confirmation
    await prisma.gameConfirmation.deleteMany({
      where: {
        gameId: params.id,
        userId: session.user.id,
      },
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
