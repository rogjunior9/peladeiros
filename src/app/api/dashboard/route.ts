import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get player counts
    const [totalPlayers, monthlyPlayers, casualPlayers, goalkeepers] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true, playerType: "MONTHLY" } }),
      prisma.user.count({ where: { isActive: true, playerType: "CASUAL" } }),
      prisma.user.count({ where: { isActive: true, playerType: "GOALKEEPER" } }),
    ]);

    // Get upcoming games
    const upcomingGames = await prisma.game.findMany({
      where: {
        date: { gte: now },
        isActive: true,
      },
      include: {
        venue: true,
        _count: {
          select: {
            confirmations: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
      orderBy: { date: "asc" },
      take: 5,
    });

    // Get recent payments
    const recentPayments = await prisma.payment.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get monthly financial data
    const [monthlyIncomeResult, monthlyExpensesResult] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: "CONFIRMED",
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: "EXPENSE",
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    // Get pending payments count
    const pendingPayments = await prisma.payment.count({
      where: { status: "PENDING" },
    });

    // Get confirmed players for next game
    const nextGame = upcomingGames[0];
    let confirmedForNextGame = 0;
    if (nextGame) {
      confirmedForNextGame = await prisma.gameConfirmation.count({
        where: {
          gameId: nextGame.id,
          status: "CONFIRMED",
        },
      });
    }

    return NextResponse.json({
      totalPlayers,
      monthlyPlayers,
      casualPlayers,
      goalkeepers,
      upcomingGames,
      recentPayments,
      monthlyIncome: monthlyIncomeResult._sum.amount || 0,
      monthlyExpenses: monthlyExpensesResult._sum.amount || 0,
      pendingPayments,
      confirmedForNextGame,
    });
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
