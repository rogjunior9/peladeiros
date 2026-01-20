import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Calcular saldo total (Receitas - Despesas)

        // 1. Receitas de Pagamentos Individuais (CONFIRMED)
        const paymentsAggregate = await prisma.payment.aggregate({
            where: { status: 'CONFIRMED' },
            _sum: { amount: true }
        });
        const totalPayments = paymentsAggregate._sum.amount || 0;

        // 2. Receitas Manuais (Transactions INCOME)
        const manualIncomeAggregate = await prisma.transaction.aggregate({
            where: { type: 'INCOME' },
            _sum: { amount: true }
        });
        const totalManualIncome = manualIncomeAggregate._sum.amount || 0;

        const totalRevenue = totalPayments + totalManualIncome;

        // 3. Despesas (Transactions EXPENSE)
        const expensesAggregate = await prisma.transaction.aggregate({
            where: { type: 'EXPENSE' },
            _sum: { amount: true }
        });

        const totalExpenses = expensesAggregate._sum.amount || 0;

        const balance = totalRevenue - totalExpenses;

        const msg = `*💰 Caixa da Pelada*\n\n` +
            `*Entradas:* ${formatCurrency(totalRevenue)}\n` +
            `*Saídas:* ${formatCurrency(totalExpenses)}\n` +
            `----------------\n` +
            `*Saldo:* ${formatCurrency(balance)}`;

        return NextResponse.json({ message: msg, balance });

    } catch (error) {
        return NextResponse.json({ error: "Erro ao calcular saldo" }, { status: 500 });
    }
}
