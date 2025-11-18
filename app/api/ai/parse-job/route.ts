import { NextRequest, NextResponse } from 'next/server'
import { validateAIConfig, GEMINI_CONFIG } from '@/lib/ai/config'
import { parseJobWithGemini } from '@/lib/ai/job-parser'
import { ParseJobRequestSchema } from '@/lib/ai/types'
import { ZodError } from 'zod'

/**
 * Parse a job description using the Gemini parser and return a structured result.
 *
 * @returns On success: an object with `success: true`, `data` (parsed result), and `metadata` containing `duration` (ms), `model`, and `timestamp`. 
 * On validation failure: HTTP 400 and an object with `success: false`, `error: 'Invalid request data'`, and `details` (validation errors). 
 * On other errors: HTTP 500 and an object with `success: false` and `error` (error message).
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
 * Performs a health and configuration check for the AI parser.
 *
 * Validates the AI configuration and returns a JSON response indicating whether the parser is configured correctly.
 *
 * @returns A JSON response with `{ status, message, model }` when configuration is valid (`status` is `"ok"`), or `{ status: "error", message }` with HTTP status 500 when validation fails. The `model` field contains the configured Gemini model when present.
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