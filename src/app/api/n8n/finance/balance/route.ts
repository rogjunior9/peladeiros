import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Calcular saldo total (Receitas - Despesas)
        // Precisamos somar Transactions ou Payments?
        // Payments são Revenues. mas temos Transactions que podem ser Expenses.
        // O ideal é usar table Transaction se estiver sendo populada.
        // Se Transaction não estiver populada com Payments automaticamente, temos um problema.
        // Atualmente o sistema só cria Payments. Não cria Transactions automaticamente (falta esse link no backend).
        // Mas o MVP financeiro implementado antes exibia "Saldo da Pelada" baseado em (Confirmed * Price) - (Custo). Isso é estimativa.

        // Caixa real = Soma de Payments CONFIRMED - Soma de Despesas (Se houver tabela de despesas).
        // Tabela Transaction tem `type` (INCOME, EXPENSE).

        // Vamos somar Payments Confirmed como Receita Real.
        const paymentsAggregate = await prisma.payment.aggregate({
            where: { status: 'CONFIRMED' },
            _sum: { amount: true }
        });

        const totalRevenue = paymentsAggregate._sum.amount || 0;

        // Despesas (Transactions do tipo EXPENSE com status APPROVED)
        // Se Transaction tiver status. (Adicionado recentemente).
        const expensesAggregate = await prisma.transaction.aggregate({
            where: {
                type: 'EXPENSE',
                status: 'APPROVED'
            },
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
