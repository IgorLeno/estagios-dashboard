import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { validateAIConfig, GEMINI_CONFIG, AI_TIMEOUT_CONFIG } from "@/lib/ai/config"
import { parseJobWithAnalysis } from "@/lib/ai/job-parser"
import { ParseJobRequestSchema } from "@/lib/ai/types"
import { checkRateLimit, consumeRequest, consumeTokens, RATE_LIMIT_CONFIG } from "@/lib/ai/rate-limiter"
import { withTimeout, TimeoutError } from "@/lib/ai/utils"
import { ZodError } from "zod"

/**
 * POST /api/ai/parse-job
 * Parseia descrição de vaga usando Gemini
 */
export async function POST(request: NextRequest) {
  try {
    // Get client identifier (IP address)
    // Prefer server-observed connection IP when available
    // Only trust x-forwarded-for/x-real-ip when behind a trusted proxy
    // Generate unique fallback per request to avoid grouping unrelated clients
    let identifier: string

    // Try to get IP from request (Next.js may provide this in some deployments)
    const requestIp = (request as unknown as { ip?: string }).ip

    if (requestIp) {
      identifier = requestIp
    } else {
      // Fallback to headers (only when behind trusted proxy)
      // In production behind a proxy (e.g., Vercel), these headers are typically set
      const forwardedFor = request.headers.get("x-forwarded-for")
      const realIp = request.headers.get("x-real-ip")

      if (forwardedFor) {
        // Split on commas and take first non-empty trimmed value (leftmost = actual client)
        const ips = forwardedFor
          .split(",")
          .map((ip) => ip.trim())
          .filter((ip) => ip.length > 0)
        identifier = ips[0] || realIp || `req-${randomUUID()}`
      } else if (realIp) {
        identifier = realIp
      } else {
        // Generate unique per-request identifier to avoid grouping unrelated clients
        identifier = `req-${randomUUID()}`
        console.warn("[AI Parser] Could not determine client IP, using per-request identifier")
      }
    }

    // Verificar rate limits (requests e tokens)
    const rateLimitCheck = await checkRateLimit(identifier)

    if (!rateLimitCheck.allowed) {
      // Determinar qual limite foi excedido e calcular retry-after
      const now = Date.now()
      const requestRetryAfter = Math.max(0, Math.ceil((rateLimitCheck.resetTime.requests - now) / 1000))
      const tokenRetryAfter = Math.max(0, Math.ceil((rateLimitCheck.resetTime.tokens - now) / 1000))
      const retryAfter = Math.max(requestRetryAfter, tokenRetryAfter)

      // Determinar mensagem de erro específica
      const isRequestLimit = rateLimitCheck.remaining.requests === 0
      const isTokenLimit = rateLimitCheck.remaining.tokens === 0
      let errorMessage = "Rate limit exceeded"
      if (isRequestLimit && isTokenLimit) {
        errorMessage = "Request and token limits exceeded"
      } else if (isRequestLimit) {
        errorMessage = `Request rate limit exceeded (${RATE_LIMIT_CONFIG.maxRequestsPerMin} requests/minute)`
      } else if (isTokenLimit) {
        errorMessage = "Daily token limit exceeded (1M tokens/day)"
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          limits: {
            requests: {
              remaining: rateLimitCheck.remaining.requests,
              limit: rateLimitCheck.limit.requests,
              resetAt: new Date(rateLimitCheck.resetTime.requests).toISOString(),
            },
            tokens: {
              remaining: rateLimitCheck.remaining.tokens,
              limit: rateLimitCheck.limit.tokens,
              resetAt: new Date(rateLimitCheck.resetTime.tokens).toISOString(),
            },
          },
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit-Requests": String(rateLimitCheck.limit.requests),
            "X-RateLimit-Remaining-Requests": String(rateLimitCheck.remaining.requests),
            "X-RateLimit-Reset-Requests": String(Math.floor(rateLimitCheck.resetTime.requests / 1000)),
            "X-RateLimit-Limit-Tokens": String(rateLimitCheck.limit.tokens),
            "X-RateLimit-Remaining-Tokens": String(rateLimitCheck.remaining.tokens),
            "X-RateLimit-Reset-Tokens": String(Math.floor(rateLimitCheck.resetTime.tokens / 1000)),
          },
        }
      )
    }

    // Consumir um request do budget
    await consumeRequest(identifier)

    // Validar configuração
    validateAIConfig()

    // Parse e validar body
    const body = await request.json()
    const { jobDescription } = ParseJobRequestSchema.parse(body)

    console.log("[AI Parser] Starting job parsing...")

    // Chamar serviço de análise com timeout protection
    const { data, analise, duration, model, tokenUsage } = await withTimeout(
      parseJobWithAnalysis(jobDescription),
      AI_TIMEOUT_CONFIG.parsingTimeoutMs,
      `Analysis took longer than ${AI_TIMEOUT_CONFIG.parsingTimeoutMs}ms`
    )

    console.log(
      `[AI Parser] Parsing completed in ${duration}ms with model: ${model} (${tokenUsage.totalTokens} tokens)`
    )

    // Consumir tokens do budget
    await consumeTokens(identifier, tokenUsage.totalTokens)

    // Verificar limites atualizados para headers de resposta
    const updatedLimits = await checkRateLimit(identifier)

    // Retornar sucesso com rate limit headers atualizados
    return NextResponse.json(
      {
        success: true,
        data,
        analise, // Include analysis markdown
        metadata: {
          duration,
          model,
          tokenUsage,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          "X-RateLimit-Limit-Requests": String(updatedLimits.limit.requests),
          "X-RateLimit-Remaining-Requests": String(updatedLimits.remaining.requests),
          "X-RateLimit-Reset-Requests": String(Math.floor(updatedLimits.resetTime.requests / 1000)),
          "X-RateLimit-Limit-Tokens": String(updatedLimits.limit.tokens),
          "X-RateLimit-Remaining-Tokens": String(updatedLimits.remaining.tokens),
          "X-RateLimit-Reset-Tokens": String(Math.floor(updatedLimits.resetTime.tokens / 1000)),
        },
      }
    )
  } catch (error) {
    // Erro de timeout - log claro e retornar 504
    if (error instanceof TimeoutError) {
      console.error(`[AI Parser] Timeout: Parsing exceeded ${error.timeoutMs}ms limit`)
      return NextResponse.json(
        {
          success: false,
          error: "Request timeout",
          message: `Parsing operation timed out after ${error.timeoutMs}ms`,
        },
        { status: 504 }
      )
    }

    // Erro de validação Zod
    if (error instanceof ZodError) {
      console.error("[AI Parser] Validation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    // Erro genérico - sanitize error messages
    console.error("[AI Parser] Error:", error instanceof Error ? error.message : String(error))

    // In development, return detailed error information
    const isDevelopment = process.env.NODE_ENV === "development"

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        ...(isDevelopment && {
          debug: {
            type: error?.constructor?.name,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
          },
        }),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/parse-job
 * Health check endpoint
 */
export async function GET() {
  try {
    validateAIConfig()
    return NextResponse.json({
      status: "ok",
      message: "AI Parser configured correctly",
      model: GEMINI_CONFIG.model,
    })
  } catch (error) {
    // Log detailed error server-side but return generic message to client
    console.error("[AI Parser] Configuration error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Configuration error",
      },
      { status: 500 }
    )
  }
}
