import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pagseguro } from "@/lib/pagseguro";

// Webhook endpoint for PagSeguro notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // PagSeguro sends notification with charges array
    const charge = body.charges?.[0];
    const referenceId = body.reference_id;

    if (!charge || !referenceId) {
      return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
    }

    // Map PagSeguro status to our status
    const statusMap: Record<string, string> = {
      AUTHORIZED: "PENDING",
      PAID: "CONFIRMED",
      AVAILABLE: "CONFIRMED",
      IN_ANALYSIS: "PENDING",
      DECLINED: "CANCELLED",
      CANCELED: "CANCELLED",
      REFUNDED: "REFUNDED",
    };

    const newStatus = statusMap[charge.status] || "PENDING";

    // Find and update the payment
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: referenceId },
          { externalCode: referenceId },
          { externalId: body.id },
        ],
      },
    });

    if (!payment) {
      console.error("Payment not found for reference:", referenceId);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus as any,
        externalId: body.id,
        paidAt: newStatus === "CONFIRMED" ? new Date() : payment.paidAt,
      },
    });

    console.log(`Payment ${payment.id} updated to status: ${newStatus}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao processar webhook PagSeguro:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

// PagSeguro may also use GET to verify webhook endpoint
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
