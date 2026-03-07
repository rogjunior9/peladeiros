import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function hasAdminAccess(user: { role?: string | null; email?: string | null }) {
  if (user?.role === "ADMIN") return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (!hasAdminAccess(session.user)) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const body = await request.json();
    const sourceUserId = params.id;
    const targetUserId = body?.targetUserId ? String(body.targetUserId) : "";

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId é obrigatório" }, { status: 400 });
    }
    if (sourceUserId === targetUserId) {
      return NextResponse.json({ error: "Origem e destino não podem ser iguais" }, { status: 400 });
    }

    const [sourceUser, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: sourceUserId } }),
      prisma.user.findUnique({ where: { id: targetUserId } }),
    ]);

    if (!sourceUser || !targetUser) {
      return NextResponse.json({ error: "Usuário de origem/destino não encontrado" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let movedConfirmations = 0;
      let mergedConfirmations = 0;
      let movedPayments = 0;
      let mergedPayments = 0;

      const sourceConfirmations = await tx.gameConfirmation.findMany({
        where: { userId: sourceUserId },
      });

      for (const sourceConf of sourceConfirmations) {
        const existingTargetConf = await tx.gameConfirmation.findUnique({
          where: {
            gameId_userId: {
              gameId: sourceConf.gameId,
              userId: targetUserId,
            },
          },
        });

        if (!existingTargetConf) {
          await tx.gameConfirmation.update({
            where: { id: sourceConf.id },
            data: { userId: targetUserId, isGuest: false, guestName: null },
          });
          movedConfirmations++;
        } else {
          const shouldUpgradeStatus =
            existingTargetConf.status !== "CONFIRMED" && sourceConf.status === "CONFIRMED";

          if (shouldUpgradeStatus) {
            await tx.gameConfirmation.update({
              where: { id: existingTargetConf.id },
              data: { status: "CONFIRMED" },
            });
          }

          await tx.gameConfirmation.delete({ where: { id: sourceConf.id } });
          mergedConfirmations++;
        }
      }

      const sourcePayments = await tx.payment.findMany({
        where: { userId: sourceUserId },
        orderBy: { createdAt: "asc" },
      });

      for (const sourcePayment of sourcePayments) {
        const duplicateWhere: any = sourcePayment.gameId
          ? { gameId: sourcePayment.gameId }
          : sourcePayment.referenceMonth
            ? { referenceMonth: sourcePayment.referenceMonth, gameId: null }
            : null;

        const existingTargetPayment = duplicateWhere
          ? await tx.payment.findFirst({
              where: {
                userId: targetUserId,
                ...duplicateWhere,
              },
            })
          : null;

        if (!existingTargetPayment) {
          await tx.payment.update({
            where: { id: sourcePayment.id },
            data: { userId: targetUserId },
          });
          movedPayments++;
        } else {
          const nextStatus =
            existingTargetPayment.status === "CONFIRMED" || sourcePayment.status === "CONFIRMED"
              ? "CONFIRMED"
              : existingTargetPayment.status;

          await tx.payment.update({
            where: { id: existingTargetPayment.id },
            data: {
              status: nextStatus,
              paidAt:
                nextStatus === "CONFIRMED"
                  ? existingTargetPayment.paidAt || sourcePayment.paidAt || new Date()
                  : existingTargetPayment.paidAt,
              notes: [existingTargetPayment.notes, sourcePayment.notes]
                .filter(Boolean)
                .join(" | ")
                .slice(0, 500),
            },
          });

          await tx.payment.delete({ where: { id: sourcePayment.id } });
          mergedPayments++;
        }
      }

      await tx.user.update({
        where: { id: sourceUserId },
        data: {
          isActive: false,
          email: null,
          phone: null,
          image: null,
          name: `${sourceUser.name || "Jogador"} (vinculado)`,
        },
      });

      return {
        movedConfirmations,
        mergedConfirmations,
        movedPayments,
        mergedPayments,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Erro ao vincular histórico de usuário:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

