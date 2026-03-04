import { createHmac } from "crypto";

/**
 * Valida a assinatura de webhooks do PagSeguro
 * 
 * NOTA: A documentação oficial do PagSeguro varia conforme a versão da API.
 * Este é um exemplo baseado na API v4. Ajuste conforme sua implementação real.
 * 
 * Para API v4, o PagSeguro geralmente usa:
 * 1. Headers de autorização Bearer
 * 2. Ou assinatura HMAC com chave secreta
 * 
 * Consulte: https://dev.pagseguro.uol.com.br/reference/webhooks
 */

// Chave secreta para validação de webhooks (deve ser configurada no .env)
const WEBHOOK_SECRET = process.env.PAGSEGURO_WEBHOOK_SECRET || "";

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida se a requisição do webhook é legítima
 * Implementação baseada em múltiplas estratégias de segurança
 */
export function validatePagSeguroWebhook(
  body: string,
  headers: Headers
): WebhookValidationResult {
  // Estratégia 1: Validar Authorization Bearer (se configurado)
  const authHeader = headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // Em produção, valide o token contra o esperado
    // Por enquanto, apenas logamos para análise
    console.log("[Webhook] Bearer token recebido:", token.substring(0, 10) + "...");
  }

  // Estratégia 2: Validar assinatura HMAC (se configurada)
  if (WEBHOOK_SECRET) {
    const signature = headers.get("x-pagseguro-signature") || 
                      headers.get("x-signature");
    
    if (!signature) {
      return {
        valid: false,
        error: "Assinatura do webhook não encontrada"
      };
    }

    const expectedSignature = createHmac("sha256", WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    // Timing-safe comparison
    try {
      const sigBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");
      
      if (sigBuffer.length !== expectedBuffer.length) {
        return {
          valid: false,
          error: "Assinatura inválida"
        };
      }
      
      const isValid = timingSafeEqual(sigBuffer, expectedBuffer);
      
      if (!isValid) {
        return {
          valid: false,
          error: "Assinatura do webhook inválida"
        };
      }
    } catch (e) {
      return {
        valid: false,
        error: "Erro ao validar assinatura"
      };
    }
  }

  // Estratégia 3: Validações básicas do payload
  try {
    const payload = JSON.parse(body);
    
    // Verifica campos obrigatórios
    if (!payload.id || !payload.reference_id) {
      return {
        valid: false,
        error: "Payload inválido: campos obrigatórios ausentes"
      };
    }

    // Valida formato do ID (deve ser um UUID válido ou formato PagSeguro)
    const idPattern = /^[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}$/i;
    if (!idPattern.test(payload.id) && !payload.id.startsWith("ORDE")) {
      console.warn("[Webhook] ID com formato inesperado:", payload.id);
    }

  } catch (e) {
    return {
      valid: false,
      error: "Payload JSON inválido"
    };
  }

  // Estratégia 4: IP Allowlist (opcional - requer configuração)
  // Em produção, considere validar IPs de origem do PagSeguro
  // const allowedIps = process.env.PAGSEGURO_WEBHOOK_IPS?.split(",") || [];
  // const clientIp = headers.get("x-forwarded-for") || headers.get("x-real-ip");
  // if (allowedIps.length > 0 && !allowedIps.includes(clientIp || "")) {
  //   return { valid: false, error: "IP não autorizado" };
  // }

  return { valid: true };
}

/**
 * Comparação de tempo constante para prevenir timing attacks
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * Sanitiza o payload do webhook para logging seguro
 * Remove dados sensíveis antes de logar
 */
export function sanitizeWebhookPayload(payload: any): any {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const sensitiveFields = [
    "tax_id",
    "document",
    "cpf",
    "cnpj",
    "phone",
    "email",
    "card",
    "number",
    "cvv",
    "holder"
  ];

  const sanitized = { ...payload };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "***REDACTED***";
    }
  }

  // Recursivamente sanitiza objetos aninhados
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeWebhookPayload(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Registra webhook no audit log para rastreabilidade
 */
export function logWebhookEvent(
  event: string,
  payload: any,
  result: "success" | "error",
  errorMessage?: string
): void {
  const sanitized = sanitizeWebhookPayload(payload);
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: "webhook",
    event,
    result,
    error: errorMessage,
    payload: sanitized,
  }));
}
