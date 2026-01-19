import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pagseguro } from "@/lib/pagseguro";

export const maxDuration = 60; // Increase timeout (Vercel/Next specific, may not work everywhere)

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const settings = await prisma.notificationSettings.findFirst();
        if (!settings?.monthlyFee || !settings.pixKey) {
            return NextResponse.json({ error: "Valor mensal ou Pix nao configurado" }, { status: 400 });
        }

        // Buscar Mensalistas Ativos
        const monthlyPlayers = await prisma.user.findMany({
            where: {
                playerType: "MONTHLY",
                isActive: true
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                document: true
            }
        });

        if (monthlyPlayers.length === 0) {
            return NextResponse.json({ message: "Nenhum mensalista encontrado" });
        }

        const monthName = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const playersPayload = [];
        let successCount = 0;

        // Processar Pagamentos
        for (const player of monthlyPlayers) {
            let pixCode = "";
            let pixQrCode = "";

            const cpf = player.document || settings.defaultCpf;

            if (cpf) {
                try {
                    // TODO: Verificar se ja existe pagamento para este mes para evitar duplicidade

                    const paymentRes = await pagseguro.createPixPayment({
                        amount: settings.monthlyFee,
                        description: `Mensalidade ${monthName}`,
                        referenceId: `MONTHLY-${new Date().toISOString().slice(0, 7)}-USER-${player.id}`,
                        customerName: player.name || "Mensalista",
                        customerEmail: player.email || "admin@peladeiros.com",
                        customerDocument: cpf
                    });

                    await prisma.payment.create({
                        data: {
                            userId: player.id,
                            amount: settings.monthlyFee,
                            method: "PIX",
                            status: "PENDING",
                            referenceMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
                            externalId: paymentRes.id,
                            externalCode: paymentRes.referenceId,
                            pixCode: paymentRes.pixCode,
                            pixQrCode: paymentRes.pixQrCode
                        }
                    });

                    pixCode = paymentRes.pixCode || "";
                    pixQrCode = paymentRes.pixQrCode || "";
                    successCount++;

                } catch (err) {
                    console.error(`Erro ao gerar pix para ${player.name}`, err);
                }
            }

            playersPayload.push({
                name: player.name,
                phone: player.phone,
                pixCode,
                pixQrCode
            });
        }

        if (process.env.N8N_WEBHOOK_URL) {
            const webhookUrl = process.env.N8N_WEBHOOK_URL.replace(/\/webhook\/saldo$/, "") + "/webhook/financial-events";

            // Dispara evento para o N8N processar o envio em massa
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'charge_monthly',
                    amount: settings.monthlyFee,
                    pixKey: settings.pixKey,
                    month: monthName,
                    players: playersPayload
                })
            });
        }

        return NextResponse.json({ success: true, count: monthlyPlayers.length, generated: successCount });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao processar cobranca" }, { status: 500 });
    }
}
