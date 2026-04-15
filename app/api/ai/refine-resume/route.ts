import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { callGrok, validateGrokConfig, type GrokMessage } from "@/lib/ai/grok-client"
import { loadUserAIConfig } from "@/lib/ai/config"
import { RefineResumeRequestSchema } from "@/lib/ai/types"
import { createClient } from "@/lib/supabase/server"
import { getCandidateProfile } from "@/lib/supabase/candidate-profile"

// ─── Modal mode schema (no vagaId — direct fitMarkdown) ──────────────────────

const RefineModalSchema = z.object({
  fitMarkdown: z.string().min(50),
  language: z.enum(["pt", "en"]),
  instructions: z.string().min(10),
  model: z.string().optional(),
})

type ResumeLanguage = "pt" | "en"

function resolveResumeLanguage(vagaLanguage: unknown, fallback: ResumeLanguage): ResumeLanguage {
  return vagaLanguage === "en" || vagaLanguage === "pt" ? vagaLanguage : fallback
}

function formatList(label: string, values: unknown): string {
  return Array.isArray(values) && values.length > 0 ? `${label}: ${values.join("; ")}` : `${label}: Not specified`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildJobContext(vaga: Record<string, any>): string {
  return [
    `Company: ${vaga.empresa || "Not specified"}`,
    `Position: ${vaga.cargo || "Not specified"}`,
    `Location: ${vaga.local || "Not specified"}`,
    `Work mode: ${vaga.modalidade || "Not specified"}`,
    `Job level: ${vaga.tipo_vaga || "Not specified"}`,
    `Job language: ${vaga.idioma_vaga || "pt"}`,
    formatList("Required skills", vaga.requisitos_obrigatorios),
    formatList("Desired skills", vaga.requisitos_desejaveis),
    formatList("Responsibilities", vaga.responsabilidades),
  ].join("\n")
}

function buildRefinementMessages(
  currentResume: string,
  generalResume: string,
  instructions: string,
  language: ResumeLanguage,
  jobContext: string
): GrokMessage[] {
  const languageLabel = language === "pt" ? "Português" : "English"

  return [
    {
      role: "system",
      content: [
        "You are an expert resume editor for tailored resumes.",
        "",
        "STRUCTURAL SOURCE OF TRUTH:",
        "- The GENERAL RESUME BASE is the mandatory structural baseline.",
        "- Keep EXACTLY the same markdown pattern, section structure, and section order from the general resume.",
        "- Do not add, remove, rename, or reorder sections.",
        "- Do not change the contact line: keep name, email, phone, LinkedIn, GitHub, and location exactly as they appear in the general resume.",
        "- Do not split, wrap, rewrite, or reformat the phone number.",
        "- Do not change education, institutions, dates, languages, certifications, project titles, or project periods.",
        '- Preserve project HTML formatting from the general resume, including divs with style="text-align: justify;" when present.',
        "- Preserve bold markdown (**text**) for project titles and skill category names.",
        "- Preserve italic markdown (_text_ or *text*) for project periods.",
        "",
        "ALLOWED CHANGES ONLY:",
        "- Profile/summary: rewrite to incorporate relevant job keywords while keeping similar length.",
        "- Skills: reorder existing items inside existing categories by relevance to the job. Do not add or remove skill items.",
        "- Projects: rewrite descriptions to emphasize job-relevant aspects. Do not alter titles, periods, or create projects.",
        "- User refinement instructions apply only inside these allowed changes.",
        "",
        "ABSOLUTE PROHIBITIONS:",
        "- Never fabricate skills, tools, metrics, certifications, experience, institutions, dates, links, or achievements.",
        "- Never add new sections.",
        "- Never change contact information.",
        "- Never change the visual layout or markdown pattern from the general resume.",
        "- If the user's instruction conflicts with these restrictions, preserve the general resume structure and facts.",
        "",
        "OUTPUT RULES:",
        "Return the complete refined resume in valid markdown only.",
        "Follow exactly the same output pattern as the general resume base.",
        "Do not wrap the answer in code fences.",
        "Do not add explanations, notes, or commentary before or after the markdown.",
        `The resume is written in ${languageLabel}.`,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `GENERAL RESUME BASE MARKDOWN (${languageLabel}) - structural source of truth:`,
        generalResume,
        "",
        `CURRENT TAILORED RESUME MARKDOWN (${languageLabel}) - starting draft:`,
        currentResume,
        "",
        "JOB CONTEXT:",
        jobContext,
        "",
        "REFINEMENT INSTRUCTIONS (apply only within the allowed changes above):",
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

    // Detect mode: modal (fitMarkdown provided, no vagaId) vs. DB mode
    const isModalMode = typeof (body as Record<string, unknown>).fitMarkdown === "string" && !(body as Record<string, unknown>).vagaId

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

    // ── Modal mode: refine fitMarkdown directly (no DB read/write) ────────────
    if (isModalMode) {
      const { fitMarkdown, language, instructions, model } = RefineModalSchema.parse(body)

      const profile = await getCandidateProfile(user.id)
      const generalResume =
        language === "en"
          ? profile.curriculo_geral_md_en?.trim() || profile.curriculo_geral_md?.trim()
          : profile.curriculo_geral_md?.trim()

      const config = await loadUserAIConfig(user.id)
      const jobContext = "Context: Modal fit refinement — no saved job record available."

      const messages = buildRefinementMessages(
        fitMarkdown,
        generalResume ?? fitMarkdown, // fall back to fitMarkdown if no general resume
        instructions,
        language,
        jobContext
      )

      const response = await callGrok(messages, {
        model: model ?? config.modelo_gemini,
        temperature: config.temperatura,
        max_tokens: 8192,
        top_p: config.top_p ?? 0.9,
      }, { userId: user.id })

      const refinedMarkdown = response.content.trim()

      if (!refinedMarkdown || refinedMarkdown.length < Math.ceil(fitMarkdown.length * 0.3)) {
        return NextResponse.json(
          { success: false, error: "Refined content was unexpectedly short and was rejected" },
          { status: 502 }
        )
      }

      return NextResponse.json({
        success: true,
        data: { markdown: refinedMarkdown },
        metadata: {
          duration: Date.now() - startTime,
          model: model ?? config.modelo_gemini,
        },
      })
    }

    // ── DB mode: existing behavior ────────────────────────────────────────────
    const validatedInput = RefineResumeRequestSchema.parse(body)
    const { vagaId, language, instructions } = validatedInput

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

    const effectiveLanguage = resolveResumeLanguage(vaga.idioma_vaga, language)
    const markdownField = effectiveLanguage === "pt" ? "curriculo_text_pt" : "curriculo_text_en"
    const pdfField = effectiveLanguage === "pt" ? "arquivo_cv_url_pt" : "arquivo_cv_url_en"
    const currentResume = vaga[markdownField]?.trim()

    if (!currentResume) {
      return NextResponse.json(
        {
          success: false,
          error: `No existing resume found for ${effectiveLanguage.toUpperCase()}`,
        },
        { status: 400 }
      )
    }

    const profile = await getCandidateProfile(user.id)
    const generalResume =
      effectiveLanguage === "en"
        ? profile.curriculo_geral_md_en?.trim() || profile.curriculo_geral_md?.trim()
        : profile.curriculo_geral_md?.trim()

    if (!generalResume) {
      return NextResponse.json(
        {
          success: false,
          error: `No general resume found for ${effectiveLanguage.toUpperCase()}`,
        },
        { status: 400 }
      )
    }

    const config = await loadUserAIConfig(user.id)
    const response = await callGrok(
      buildRefinementMessages(currentResume, generalResume, instructions, effectiveLanguage, buildJobContext(vaga)),
      {
        model: validatedInput.model ?? config.modelo_gemini,
        temperature: config.temperatura,
        max_tokens: 8192,
        top_p: config.top_p ?? 0.9,
      },
      { userId: user.id }
    )

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
