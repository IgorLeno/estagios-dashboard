import { NextRequest, NextResponse } from "next/server"
import { ZodError, z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getCandidateProfile } from "@/lib/supabase/candidate-profile"
import { createAIModel, loadUserAIConfig, validateAIConfig, AI_TIMEOUT_CONFIG } from "@/lib/ai/config"
import { withTimeout, TimeoutError } from "@/lib/ai/utils"
import { isValidModelId, DEFAULT_MODEL } from "@/lib/ai/models"

const GenerateFitRequestSchema = z.object({
  vagaId: z.string().uuid(),
  language: z.enum(["pt", "en"]),
  model: z.string().optional(),
})

/**
 * System prompt for fit generation.
 * Unlike the structured-JSON resume-generator, this endpoint requests plain markdown output
 * because the general curriculum is the structural baseline and only 3 sections are adapted.
 */
const FIT_SYSTEM_PROMPT = `You are a resume personalization assistant. Your task is to adapt a candidate's general curriculum to a specific job opportunity.

You will receive the candidate's general CV in markdown format and the job details.
You must return the COMPLETE adapted markdown — not just the sections that changed.

ABSOLUTE RULES — ZERO TOLERANCE FOR VIOLATIONS:

PRESERVE EXACTLY (do not change anything in these sections or elements):
- Contact header: name, email, phone, LinkedIn, GitHub, location — preserve character by character
- Education section: all degrees, institutions, dates, and locations
- Certifications section: all entries, exactly as written
- Languages section: all entries, exactly as written
- Section names, section order, and overall markdown structure
- Bold (**text**) and italic (_text_ or *text*) markers that are NOT in the three adaptable sections

WHAT YOU MAY ADAPT (only these three sections):
1. Professional Profile / Perfil Profissional: Rewrite to naturally incorporate the job's keywords and requirements. Keep similar length to the original (same approximate number of sentences).
2. Competencies / Competências: Reorder items WITHIN existing categories by relevance to the job. DO NOT add or remove any items or categories. Keep every item text exactly as written.
3. Projects / Projetos: Rewrite only the description text to emphasize aspects relevant to the job. DO NOT change project titles, periods, or create new projects. Preserve any HTML formatting such as <div style="text-align: justify;">. Preserve bold (**text**) and italic (_text_) markers within project descriptions.

ABSOLUTE PROHIBITIONS:
- Never invent skills, tools, metrics, certifications, experiences, or projects not present in the general CV
- Never change contact information, dates, project titles, institutions, or section names
- Never add or remove sections
- Never add or remove items from skill/competency categories
- Never change project titles or periods

OUTPUT FORMAT:
- Return ONLY the complete markdown text of the adapted curriculum
- No preamble, no explanation, no code fences, no trailing text
- The output must follow exactly the same markdown pattern as the input general CV
`

function buildFitPrompt(
  baseMarkdown: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vaga: Record<string, any>,
  language: "pt" | "en"
): string {
  const langLabel = language === "pt" ? "Português (pt-BR)" : "English"

  const jobLines = [
    `Empresa: ${vaga.empresa || "N/A"}`,
    `Cargo: ${vaga.cargo || "N/A"}`,
    `Local: ${vaga.local || "N/A"}`,
    `Modalidade: ${vaga.modalidade || "N/A"}`,
    `Tipo: ${vaga.tipo_vaga || "N/A"}`,
    vaga.salario ? `Salário: ${vaga.salario}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const requisitos =
    Array.isArray(vaga.requisitos_obrigatorios) && vaga.requisitos_obrigatorios.length > 0
      ? `\nRequisitos Obrigatórios:\n${(vaga.requisitos_obrigatorios as string[]).map((r) => `- ${r}`).join("\n")}`
      : ""

  const desejaveis =
    Array.isArray(vaga.requisitos_desejaveis) && vaga.requisitos_desejaveis.length > 0
      ? `\nRequisitos Desejáveis:\n${(vaga.requisitos_desejaveis as string[]).map((r) => `- ${r}`).join("\n")}`
      : ""

  const responsabilidades =
    Array.isArray(vaga.responsabilidades) && vaga.responsabilidades.length > 0
      ? `\nResponsabilidades:\n${(vaga.responsabilidades as string[]).map((r) => `- ${r}`).join("\n")}`
      : ""

  return [
    `OUTPUT LANGUAGE: ${langLabel}`,
    "",
    "JOB DETAILS:",
    jobLines,
    requisitos,
    desejaveis,
    responsabilidades,
    "",
    "GENERAL CURRICULUM (mandatory structural base — adapt only the three sections specified in the rules):",
    baseMarkdown,
    "",
    "Return the complete adapted curriculum in markdown. Follow all rules above exactly.",
  ].join("\n")
}

/**
 * POST /api/ai/generate-fit
 *
 * Adapts the candidate's general curriculum to a specific job in a single LLM call.
 * Only three sections are modified: Professional Profile, Competencies, and Projects.
 * All other sections are preserved verbatim.
 *
 * Saves the result to curriculo_text_pt or curriculo_text_en and invalidates the PDF.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
    }

    const { vagaId, language, model } = GenerateFitRequestSchema.parse(body)

    console.log(`[Generate Fit API] Request: vaga ${vagaId}, language: ${language}`)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id

    await validateAIConfig(userId)

    // Load vaga
    const { data: vaga, error: vagaError } = await supabase
      .from("vagas_estagio")
      .select("*")
      .eq("id", vagaId)
      .single()

    if (vagaError || !vaga) {
      return NextResponse.json({ success: false, error: "Vaga not found" }, { status: 404 })
    }

    // Load candidate profile for the general curriculum markdown
    const candidateProfile = await getCandidateProfile(userId)

    // Choose the base resume markdown according to the requested language
    const baseMarkdown =
      language === "en"
        ? candidateProfile.curriculo_geral_md_en?.trim() || candidateProfile.curriculo_geral_md?.trim()
        : candidateProfile.curriculo_geral_md?.trim()

    if (!baseMarkdown) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Currículo geral não encontrado. Configure seu perfil em Configurações > Perfil antes de gerar o fit.",
        },
        { status: 400 }
      )
    }

    // Load user AI config and resolve model
    const config = await loadUserAIConfig(userId)
    const resolvedModel =
      model ??
      (config.modelo_gemini && isValidModelId(config.modelo_gemini) ? config.modelo_gemini : DEFAULT_MODEL)

    const aiModel = createAIModel(
      FIT_SYSTEM_PROMPT,
      {
        temperature: config.temperatura,
        maxOutputTokens: Math.max(config.max_tokens, 4096),
        topP: config.top_p,
        model: resolvedModel,
      },
      { userId }
    )

    const prompt = buildFitPrompt(baseMarkdown, vaga, language)

    const timeoutSeconds = Math.floor(AI_TIMEOUT_CONFIG.resumeGenerationTimeoutMs / 1000)
    const result = await withTimeout(
      aiModel.generateContent(prompt),
      AI_TIMEOUT_CONFIG.resumeGenerationTimeoutMs,
      `Fit generation exceeded ${timeoutSeconds}s timeout`
    )

    const markdown = result.response.text().trim()

    if (!markdown || markdown.length < 100) {
      throw new Error("LLM returned empty or insufficient markdown for the fit curriculum")
    }

    // Save to database and invalidate the existing PDF
    const markdownField = language === "pt" ? "curriculo_text_pt" : "curriculo_text_en"
    const pdfField = language === "pt" ? "arquivo_cv_url_pt" : "arquivo_cv_url_en"

    const { error: updateError } = await supabase
      .from("vagas_estagio")
      .update({
        [markdownField]: markdown,
        [pdfField]: null,
      })
      .eq("id", vagaId)

    if (updateError) {
      throw new Error(`Failed to save fit curriculum: ${updateError.message}`)
    }

    const duration = Date.now() - startTime
    console.log(
      `[Generate Fit API] ✅ Fit saved (${duration}ms, ${language.toUpperCase()}, model: ${resolvedModel})`
    )

    return NextResponse.json({
      success: true,
      data: { markdown, language },
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Generate Fit API] ❌ Error (${duration}ms):`, errorMessage)

    if (error instanceof TimeoutError) {
      return NextResponse.json({ success: false, error: (error as TimeoutError).message }, { status: 504 })
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
