import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callGrok } from "@/lib/ai/grok-client"
import { getGenerationConfig, loadUserAIConfig, validateAIConfig } from "@/lib/ai/config"
import { TimeoutError, withTimeout } from "@/lib/ai/utils"
import { buildCoverLetterPromptPayload, normalizeCoverLetterText } from "@/lib/ai/cover-letter"
import { createClient } from "@/lib/supabase/server"

const CoverLetterRequestSchema = z.object({
  language: z.enum(["pt", "en"]),
  model: z.string().optional(),
  resumeContent: z.string().min(1),
  candidateData: z.object({
    nome: z.string().min(1),
    email: z.string().optional(),
    telefone: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    location: z.string().optional(),
    educationSummary: z.string().optional(),
    experienceSummary: z.string().optional(),
  }),
  jobData: z.object({
    empresa: z.string().min(1),
    cargo: z.string().min(1),
    descricao: z.string().optional().nullable(),
    requisitosObrigatorios: z.array(z.string()).optional(),
    requisitosDesejaveis: z.array(z.string()).optional(),
    responsabilidades: z.array(z.string()).optional(),
  }),
})

const COVER_LETTER_TIMEOUT_MS = 30_000

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    validateAIConfig()

    const body = await request.json()
    const payload = CoverLetterRequestSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const promptsConfig = await loadUserAIConfig(user?.id)
    const generationConfig = getGenerationConfig(promptsConfig)
    const { systemPrompt, userPrompt } = buildCoverLetterPromptPayload({
      candidate: payload.candidateData,
      job: payload.jobData,
      resumeContent: payload.resumeContent,
      language: payload.language,
    })

    const result = await withTimeout(
      callGrok(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          model: payload.model || promptsConfig.modelo_gemini,
          temperature: Math.min(Math.max(generationConfig.temperature, 0.2), 0.8),
          max_tokens: Math.min(generationConfig.maxOutputTokens, 1400),
          top_p: generationConfig.topP ?? 0.9,
        }
      ),
      COVER_LETTER_TIMEOUT_MS,
      "Erro ao gerar carta. Tente novamente."
    )

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        letter: normalizeCoverLetterText(result.content),
      },
      metadata: {
        duration,
        model: payload.model || promptsConfig.modelo_gemini,
        usage: result.usage,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error("[generate-cover-letter] Error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos para gerar carta.",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof TimeoutError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          metadata: { duration },
        },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao gerar carta. Tente novamente.",
        metadata: { duration },
      },
      { status: 500 }
    )
  }
}
