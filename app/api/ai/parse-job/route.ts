import { NextRequest, NextResponse } from 'next/server'
import { validateAIConfig, GEMINI_CONFIG } from '@/lib/ai/config'
import { parseJobWithGemini, AllModelsFailedError } from '@/lib/ai/job-parser'
import { ParseJobRequestSchema } from '@/lib/ai/types'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/ai/rate-limiter'
import { ZodError } from 'zod'

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
      const forwardedFor = request.headers.get('x-forwarded-for')
      const realIp = request.headers.get('x-real-ip')
      
      if (forwardedFor) {
        // Split on commas and take first non-empty trimmed value (leftmost = actual client)
        const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0)
        identifier = ips[0] || realIp || `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      } else if (realIp) {
        identifier = realIp
      } else {
        // Generate unique per-request identifier to avoid grouping unrelated clients
        identifier = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        console.warn('[AI Parser] Could not determine client IP, using per-request identifier')
      }
    }

    // Check rate limit
    const { allowed, remaining, resetTime } = checkRateLimit(identifier)

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(resetTime / 1000)),
          }
        }
      )
    }

    // Validar configuração
    validateAIConfig()

    // Parse e validar body
    const body = await request.json()
    const { jobDescription } = ParseJobRequestSchema.parse(body)

    console.log('[AI Parser] Starting job parsing...')

    // Chamar serviço de parsing com timeout protection
    const TIMEOUT_MS = 30000 // 30 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout: parsing took longer than 30 seconds'))
      }, TIMEOUT_MS)
    })

    const { data, duration, model } = await Promise.race([
      parseJobWithGemini(jobDescription),
      timeoutPromise,
    ])

    console.log(`[AI Parser] Parsing completed in ${duration}ms with model: ${model}`)

    // Retornar sucesso com rate limit headers
    return NextResponse.json(
      {
        success: true,
        data,
        metadata: {
          duration,
          model,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.floor(resetTime / 1000)),
        }
      }
    )
  } catch (error) {
    console.error('[AI Parser] Error:', error)

    // Erro de validação Zod
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    // Erro genérico - sanitize error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isTimeout = errorMessage.includes('timeout')
    
    console.error('[AI Parser] Error details:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: isTimeout ? 'Request timeout' : 'Internal server error',
      },
      { status: isTimeout ? 504 : 500 }
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
      status: 'ok',
      message: 'AI Parser configured correctly',
      model: GEMINI_CONFIG.model,
    })
  } catch (error) {
    // Log detailed error server-side but return generic message to client
    console.error('[AI Parser] Configuration error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Configuration error',
      },
      { status: 500 }
    )
  }
}
