import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { callGrok, validateGrokConfig, type GrokMessage } from "@/lib/ai/grok-client"
import { loadUserAIConfig } from "@/lib/ai/config"
import { RefineResumeRequestSchema } from "@/lib/ai/types"
import { createClient } from "@/lib/supabase/server"

function buildRefinementMessages(currentResume: string, instructions: string, language: "pt" | "en"): GrokMessage[] {
  const languageLabel = language === "pt" ? "Português" : "English"

  return [
    {
      role: "system",
      content: [
        "You are an expert resume editor. Your job is to apply the user's instructions to produce a genuinely better resume — not just a superficially adjusted one.",
        "",
        "CORE DIRECTIVES:",
        "- The user's instructions are the highest priority. Follow them precisely and completely.",
        "- You have full editorial authority: rewrite, restructure, cut, or reorder any section if it leads to a better result.",
        "- The final resume MUST fit on a single page. Cut ruthlessly to achieve this.",
        "- Do not fabricate experience, dates, certifications, links, or metrics that are not already present in the resume.",
        "",
        "PROJECT SELECTION:",
        "- You do NOT need to include all projects from the current resume.",
        "- Select only the projects that are most relevant and impactful for the target context.",
        "- Prefer projects with measurable outcomes (numbers, scale, frequency, reliability gains, error reductions, automation scope).",
        "- Cut or summarize projects that are generic, weakly connected to the target role, or that push the resume past one page.",
        "",
        "QUALITY STANDARDS FOR PROJECT DESCRIPTIONS:",
        "- Each project bullet must follow the pattern: action + context + measurable impact or concrete result.",
        '- Replace vague phrases ("support to operation", "operational routines", "continuous improvement") with specific, credible language that reflects what the project actually did.',
        "- Avoid keyword stuffing. Each keyword should appear at most once per project and only where it is organically appropriate.",
        "- Prefer authenticity over ATS optimization: a credible description that reads naturally is stronger than a keyword-dense one that sounds artificial.",
        "",
        "OUTPUT RULES:",
        "Return the complete refined resume in markdown only.",
        "Do not wrap the answer in code fences.",
        "Do not add explanations, notes, or commentary before or after the markdown.",
        `The resume is written in ${languageLabel}.`,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `Current resume markdown (${languageLabel}):`,
        currentResume,
        "",
        "Refinement instructions (apply these exactly — they override any default behavior):",
        instructions,
      ].join("\n"),
    },
  ]
}

/**
 * POST /api/ai/refine-resume
 * Refine an existing markdown resume using LLM instructions
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    let body
    try {
      body = await req.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid JSON body",
          },
          { status: 400 }
        )
      }
      throw error
    }

    const validatedInput = RefineResumeRequestSchema.parse(body)
    const { vagaId, language, instructions } = validatedInput

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }

    await validateGrokConfig(user.id)

    const { data: vaga, error: vagaError } = await supabase.from("vagas_estagio").select("*").eq("id", vagaId).single()

    if (vagaError || !vaga) {
      return NextResponse.json(
        {
          success: false,
          error: "Vaga not found",
          details: { vagaId },
        },
        { status: 404 }
      )
    }

    const markdownField = language === "pt" ? "curriculo_text_pt" : "curriculo_text_en"
    const pdfField = language === "pt" ? "arquivo_cv_url_pt" : "arquivo_cv_url_en"
    const currentResume = vaga[markdownField]?.trim()

    if (!currentResume) {
      return NextResponse.json(
        {
          success: false,
          error: `No existing resume found for ${language.toUpperCase()}`,
        },
        { status: 400 }
      )
    }

    const config = await loadUserAIConfig(user.id)
    const response = await callGrok(buildRefinementMessages(currentResume, instructions, language), {
      model: validatedInput.model ?? config.modelo_gemini,
      temperature: config.temperatura,
      max_tokens: 8192,
      top_p: config.top_p ?? 0.9,
    }, { userId: user.id })

    const refinedResume = response.content.trim()

    if (!refinedResume) {
      throw new Error("Empty response from refinement model")
    }

    if (refinedResume.length < Math.ceil(currentResume.length * 0.3)) {
      return NextResponse.json(
        {
          success: false,
          error: "Refined resume response was unexpectedly short and was rejected",
        },
        { status: 502 }
      )
    }

    const { error: updateError } = await supabase
      .from("vagas_estagio")
      .update({
        [markdownField]: refinedResume,
        [pdfField]: null,
      })
      .eq("id", vagaId)

    if (updateError) {
      throw new Error(`Failed to save refined resume: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        curriculo_text: refinedResume,
      },
      metadata: {
        duration: Date.now() - startTime,
        model: validatedInput.model ?? config.modelo_gemini,
        tokenUsage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      },
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`[Refine Resume API] Error (${duration}ms):`, errorMessage)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/refine-resume
 * Health check
 */
export async function GET(): Promise<NextResponse> {
  try {
    await validateGrokConfig()

    return NextResponse.json({
      status: "ok",
      message: "Resume Refiner API is running",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return NextResponse.json(
      {
        status: "error",
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
