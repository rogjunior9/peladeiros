import { NextRequest, NextResponse } from 'next/server';

// Central webhook URL from .env (e.g., https://n8n.rogeriojunior.com.br/webhook/peladeiros)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL?.replace(/\/+$/, '') || '';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        if (!N8N_WEBHOOK_URL) {
            return NextResponse.json({ error: 'N8N_WEBHOOK_URL not configured' }, { status: 500 });
        }
        const targetUrl = `${N8N_WEBHOOK_URL}/webhook/peladeiros`;
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // n8n API key for authenticated webhook (if required)
                ...(N8N_API_KEY && { Authorization: `Bearer ${N8N_API_KEY}` }),
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Error forwarding to n8n webhook:', error);
        return NextResponse.json({ error: 'Failed to forward message' }, { status: 500 });
    }
}

export async function GET() {
    // Simple health check for the proxy endpoint
    return NextResponse.json({ message: 'n8n message proxy is alive' });
}
