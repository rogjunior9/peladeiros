// PagSeguro Integration Module
// Documentation: https://dev.pagseguro.uol.com.br/reference/api-v4

const PAGSEGURO_API_URL = process.env.PAGSEGURO_SANDBOX === "true"
  ? "https://sandbox.api.pagseguro.com"
  : "https://api.pagseguro.com";

interface PagSeguroConfig {
  email: string;
  token: string;
}

interface CreatePixPaymentParams {
  amount: number;
  description: string;
  referenceId: string;
  customerName: string;
  customerEmail: string;
  customerDocument: string; // CPF
  expirationDate?: Date;
}

interface CreateCardPaymentParams {
  amount: number;
  description: string;
  referenceId: string;
  customerName: string;
  customerEmail: string;
  customerDocument: string;
  cardToken: string;
  installments: number;
}

interface PaymentResponse {
  id: string;
  referenceId: string;
  status: string;
  pixCode?: string;
  pixQrCode?: string;
  createdAt: string;
}

export class PagSeguroService {
  private email: string;
  private token: string;

  constructor(config?: PagSeguroConfig) {
    this.email = config?.email || process.env.PAGSEGURO_EMAIL || "";
    this.token = config?.token || process.env.PAGSEGURO_TOKEN || "";
  }

  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: any
  ): Promise<any> {
    const response = await fetch(`${PAGSEGURO_API_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `PagSeguro API Error: ${response.status} - ${JSON.stringify(error)}`
      );
    }

    return response.json();
  }

  // Create PIX payment
  async createPixPayment(params: CreatePixPaymentParams): Promise<PaymentResponse> {
    const expirationDate = params.expirationDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const payload = {
      reference_id: params.referenceId,
      description: params.description,
      amount: {
        value: Math.round(params.amount * 100), // Convert to cents
        currency: "BRL",
      },
      payment_method: {
        type: "PIX",
        pix: {
          expires_at: expirationDate.toISOString(),
        },
      },
      customer: {
        name: params.customerName,
        email: params.customerEmail,
        tax_id: params.customerDocument.replace(/\D/g, ""),
      },
      notification_urls: [process.env.PAGSEGURO_NOTIFICATION_URL],
    };

    const response = await this.makeRequest("/orders", "POST", payload);

    // Extract PIX data from response
    const pixCharge = response.qr_codes?.[0];

    return {
      id: response.id,
      referenceId: response.reference_id,
      status: this.mapStatus(response.charges?.[0]?.status || "PENDING"),
      pixCode: pixCharge?.text,
      pixQrCode: pixCharge?.links?.find((l: any) => l.rel === "QRCODE")?.href,
      createdAt: response.created_at,
    };
  }

  // Create Credit Card payment
  async createCardPayment(params: CreateCardPaymentParams): Promise<PaymentResponse> {
    const payload = {
      reference_id: params.referenceId,
      description: params.description,
      amount: {
        value: Math.round(params.amount * 100), // Convert to cents
        currency: "BRL",
      },
      payment_method: {
        type: "CREDIT_CARD",
        installments: params.installments,
        capture: true,
        card: {
          encrypted: params.cardToken,
        },
      },
      customer: {
        name: params.customerName,
        email: params.customerEmail,
        tax_id: params.customerDocument.replace(/\D/g, ""),
      },
      notification_urls: [process.env.PAGSEGURO_NOTIFICATION_URL],
    };

    const response = await this.makeRequest("/orders", "POST", payload);

    return {
      id: response.id,
      referenceId: response.reference_id,
      status: this.mapStatus(response.charges?.[0]?.status || "PENDING"),
      createdAt: response.created_at,
    };
  }

  // Get payment status
  async getPaymentStatus(orderId: string): Promise<PaymentResponse> {
    const response = await this.makeRequest(`/orders/${orderId}`);

    const charge = response.charges?.[0];
    const pixCharge = response.qr_codes?.[0];

    return {
      id: response.id,
      referenceId: response.reference_id,
      status: this.mapStatus(charge?.status || "PENDING"),
      pixCode: pixCharge?.text,
      pixQrCode: pixCharge?.links?.find((l: any) => l.rel === "QRCODE")?.href,
      createdAt: response.created_at,
    };
  }

  // Map PagSeguro status to our status
  private mapStatus(pagseguroStatus: string): string {
    const statusMap: Record<string, string> = {
      AUTHORIZED: "PENDING",
      PAID: "CONFIRMED",
      AVAILABLE: "CONFIRMED",
      IN_ANALYSIS: "PENDING",
      DECLINED: "CANCELLED",
      CANCELED: "CANCELLED",
      REFUNDED: "REFUNDED",
    };

    return statusMap[pagseguroStatus] || "PENDING";
  }

  async createPaymentLink(params: CreatePixPaymentParams): Promise<string | null> {
    const payload = {
      reference_id: params.referenceId,
      description: params.description,
      amount: {
        value: Math.round(params.amount * 100),
        currency: "BRL",
      },
      customer: {
        name: params.customerName,
        email: params.customerEmail,
        tax_id: params.customerDocument.replace(/\D/g, ""),
      },
      notification_urls: [process.env.PAGSEGURO_NOTIFICATION_URL],
    };

    try {
      const response = await this.makeRequest("/orders", "POST", payload);
      const payLink = response.links?.find((l: any) => l.rel === "pay" || l.rel === "PAY")?.href;
      return payLink || null;
    } catch (e) {
      console.error("Erro ao gerar link de pagamento", e);
      return null; // Fail gracefully
    }
  }

  // Process webhook notification
  async processNotification(notificationCode: string): Promise<{
    orderId: string;
    status: string;
    referenceId: string;
  }> {
    const response = await this.makeRequest(
      `/orders?reference_id=${notificationCode}`
    );

    const order = response.orders?.[0];

    if (!order) {
      throw new Error("Order not found");
    }

    return {
      orderId: order.id,
      status: this.mapStatus(order.charges?.[0]?.status || "PENDING"),
      referenceId: order.reference_id,
    };
  }
}

export const pagseguro = new PagSeguroService();
