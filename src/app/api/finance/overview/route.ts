import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/supabase-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const isAdmin = await hasAdminAccess(session.user);

    const [payments, transactions] = await Promise.all([
      prisma.payment.findMany({
        where: {
          ...(isAdmin ? {} : { status: "CONFIRMED" }),
          OR: [{ gameId: null }, { game: { isActive: true } }],
        },
        include: {
          user: {
            select: { name: true, email: true },
          },
          game: {
            select: { title: true, date: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.transaction.findMany({
        orderBy: { date: "desc" },
        include: {
          createdBy: {
            select: { name: true },
          },
        },
      }),
    ]);

    const totalPayments = payments
      .filter((payment) => payment.status === "CONFIRMED")
      .reduce((acc, payment) => acc + payment.amount, 0);

    const totalIncome = transactions
      .filter((transaction) => transaction.type === "INCOME")
      .reduce((acc, transaction) => acc + transaction.amount, 0);

    const totalExpenses = transactions
      .filter((transaction) => transaction.type === "EXPENSE")
      .reduce((acc, transaction) => acc + transaction.amount, 0);

    return NextResponse.json({
      payments,
      transactions,
      summary: {
        totalIncome: totalPayments + totalIncome,
        totalExpenses,
        balance: totalPayments + totalIncome - totalExpenses,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar overview financeiro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
