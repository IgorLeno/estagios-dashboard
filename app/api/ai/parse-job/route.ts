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
    const identifier = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown'

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

    // Chamar serviço de parsing
    const { data, duration, model } = await parseJobWithGemini(jobDescription)

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

    // Erro genérico
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
      status: 'ok',
      message: 'AI Parser configured correctly',
      model: GEMINI_CONFIG.model,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Configuration error',
      },
      { status: 500 }
    )
  }
}
