import { NextRequest, NextResponse } from 'next/server'
import { validateAIConfig, GEMINI_CONFIG } from '@/lib/ai/config'
import { parseJobWithGemini } from '@/lib/ai/job-parser'
import { ParseJobRequestSchema } from '@/lib/ai/types'
import { ZodError } from 'zod'

/**
 * POST /api/ai/parse-job
 * Parseia descrição de vaga usando Gemini
 */
export async function POST(request: NextRequest) {
  try {
    // Validar configuração
    validateAIConfig()

    // Parse e validar body
    const body = await request.json()
    const { jobDescription } = ParseJobRequestSchema.parse(body)

    console.log('[AI Parser] Starting job parsing...')

    // Chamar serviço de parsing
    const { data, duration, model } = await parseJobWithGemini(jobDescription)

    console.log(`[AI Parser] Parsing completed in ${duration}ms with model: ${model}`)

    // Retornar sucesso
    return NextResponse.json({
      success: true,
      data,
      metadata: {
        duration,
        model,
        timestamp: new Date().toISOString(),
      },
    })
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
