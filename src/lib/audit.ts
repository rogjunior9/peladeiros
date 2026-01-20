import { prisma } from "@/lib/prisma";

export async function createAuditLog(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    details: any
) {
    try {
        // 1. Save to DB
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                details: JSON.stringify(details),
            },
        });

        // 2. Send N8N Webhook (if configured)
        const webhookUrl = process.env.N8N_WEBHOOK_URL
            ? `${process.env.N8N_WEBHOOK_URL}/webhook/peladeiros-audit`
            : null;

        if (webhookUrl) {
            // Fire and forget
            fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
                },
                body: JSON.stringify({
                    userId,
                    action,
                    entity,
                    entityId,
                    details,
                    timestamp: new Date().toISOString()
                })
            }).catch(err => console.error("Failed to send audit webhook", err));
        }
    } catch (e) {
        console.error("Error creating audit log", e);
        // Don't throw, we don't want to break the main flow if logging fails
    }
}
