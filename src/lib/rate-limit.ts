import { NextRequest, NextResponse } from "next/server";
import { RateLimiterRes, RateLimiterAbstract } from "rate-limiter-flexible";

// Store em memória (para produção, use Redis)
const memoryStore = new Map<string, { points: number; resetTime: number }>();

// Rate Limiter simples em memória para desenvolvimento
// Em produção, substituir por RedisStore
class MemoryRateLimiter {
  private points: number;
  private duration: number;

  constructor(points: number, duration: number) {
    this.points = points;
    this.duration = duration;
  }

  async consume(key: string, pointsToConsume = 1): Promise<RateLimiterRes> {
    const now = Date.now();
    const resetTime = now + this.duration * 1000;
    
    const existing = memoryStore.get(key);
    
    if (!existing || now > existing.resetTime) {
      // Novo período
      memoryStore.set(key, { 
        points: this.points - pointsToConsume, 
        resetTime 
      });
      return new RateLimiterRes(this.points - pointsToConsume, resetTime);
    }
    
    if (existing.points <= 0) {
      throw new RateLimiterRes(existing.points, existing.resetTime);
    }
    
    const newPoints = existing.points - pointsToConsume;
    memoryStore.set(key, { ...existing, points: newPoints });
    
    return new RateLimiterRes(newPoints, existing.resetTime);
  }
}

// Limiters específicos por tipo de operação
export const rateLimiters = {
  // Auth: 5 tentativas por minuto
  auth: new MemoryRateLimiter(5, 60),
  
  // Pagamentos: 10 requisições por minuto
  payment: new MemoryRateLimiter(10, 60),
  
  // API geral: 100 requisições por minuto
  api: new MemoryRateLimiter(100, 60),
  
  // Webhooks: 1000 requisições por minuto (recebe de serviços externos)
  webhook: new MemoryRateLimiter(1000, 60),
  
  // Confirmações de jogo: 20 por minuto
  confirmation: new MemoryRateLimiter(20, 60),
};

// Limpa entradas expiradas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  Array.from(memoryStore.entries()).forEach(([key, value]) => {
    if (now > value.resetTime) {
      memoryStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  limiter: MemoryRateLimiter;
  keyPrefix?: string;
  getKey?: (req: NextRequest) => string;
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; limit: number; remaining: number; reset: number } | null> {
  try {
    const key = config.getKey 
      ? config.getKey(req)
      : `${config.keyPrefix || "api"}:${req.ip || "anonymous"}`;
    
    const res = await config.limiter.consume(key);
    
    return {
      success: true,
      limit: 100, // Default limit
      remaining: 0,
      reset: Math.ceil(res.msBeforeNext / 1000),
    };
  } catch (rejRes: any) {
    if (rejRes instanceof RateLimiterRes || rejRes.msBeforeNext) {
      return {
        success: false,
        limit: rejRes.totalPoints || 0,
        remaining: 0,
        reset: Math.ceil((rejRes.msBeforeNext || 60000) / 1000),
      };
    }
    throw rejRes;
  }
}

// Middleware factory para rotas API
export function withRateLimit(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (req: NextRequest, ...args: any[]) => {
    const result = await rateLimit(req, config);
    
    if (!result) {
      return NextResponse.json(
        { error: "Erro interno no rate limiting" },
        { status: 500 }
      );
    }
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Muitas requisições. Tente novamente em breve.",
          retryAfter: result.reset 
        },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.reset),
            "Retry-After": String(result.reset),
          }
        }
      );
    }
    
    const response = await handler(req, ...args);
    
    // Adiciona headers de rate limit na resposta
    if (response.headers) {
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Reset", String(result.reset));
    }
    
    return response;
  };
}
