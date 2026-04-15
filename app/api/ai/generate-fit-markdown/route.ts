import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getCandidateProfile } from "@/lib/supabase/candidate-profile"
import { callGrok, validateGrokConfig } from "@/lib/ai/grok-client"
import { loadUserAIConfig } from "@/lib/ai/config"
import { DEFAULT_MODEL, isValidModelId } from "@/lib/ai/models"
import type { FitToneOptions } from "@/lib/ai/types"

// ─── Request schema ───────────────────────────────────────────────────────────

const GenerateFitMarkdownSchema = z.object({
  jobDescription: z.string().min(20, "Job description too short").max(50000),
  jobAnalysisData: z
    .object({
      empresa: z.string().optional(),
      cargo: z.string().optional(),
      local: z.string().optional(),
      modalidade: z.string().optional(),
      tipo_vaga: z.string().optional(),
      requisitos_obrigatorios: z.array(z.string()).optional(),
      requisitos_desejaveis: z.array(z.string()).optional(),
      responsabilidades: z.array(z.string()).optional(),
      idioma_vaga: z.string().optional(),
    })
    .nullable()
    .optional(),
  language: z.enum(["pt", "en"]).default("pt"),
  toneOptions: z
    .object({
      estilo: z
        .enum(["padrao", "tecnico_formal", "executivo", "conversacional", "personalizado_estilo"])
        .default("padrao"),
      estilo_customizado: z.string().optional(),
      foco: z.enum(["padrao", "keywords", "resultados", "competencias", "personalizado_foco"]).default("padrao"),
      foco_customizado: z.string().optional(),
      enfase: z.enum(["padrao", "academica", "pratica", "lideranca", "personalizado_enfase"]).default("padrao"),
      enfase_customizado: z.string().optional(),
    })
    .optional(),
  model: z.string().optional(),
})

// ─── Tone instructions builder ────────────────────────────────────────────────

function buildToneInstructions(toneOptions: FitToneOptions): string {
  const instructions: string[] = []

  // Estilo de Escrita
  if (toneOptions.estilo === "tecnico_formal") {
    instructions.push(
      "Use linguagem técnica e formal, com alta densidade de terminologia especializada e termos precisos do setor"
    )
  } else if (toneOptions.estilo === "executivo") {
    instructions.push(
      "Use linguagem orientada a negócios e impacto, concisa e focada em resultados e valor gerado"
    )
  } else if (toneOptions.estilo === "conversacional") {
    instructions.push(
      "Use linguagem fluida e acessível, natural e sem jargões desnecessários — adequado para recrutadores não técnicos"
    )
  } else if (toneOptions.estilo === "personalizado_estilo" && toneOptions.estilo_customizado?.trim()) {
    instructions.push(toneOptions.estilo_customizado.trim())
  }

  // Foco de Conteúdo
  if (toneOptions.foco === "keywords") {
    instructions.push(
      "Maximize o uso de palavras-chave presentes na descrição da vaga, incluindo nas seções de perfil e competências"
    )
  } else if (toneOptions.foco === "resultados") {
    instructions.push("Priorize descrições que evidenciem resultados concretos e métricas quantitativas")
  } else if (toneOptions.foco === "competencias") {
    instructions.push("Coloque as competências técnicas mais relevantes para a vaga em destaque em todas as seções")
  } else if (toneOptions.foco === "personalizado_foco" && toneOptions.foco_customizado?.trim()) {
    instructions.push(toneOptions.foco_customizado.trim())
  }

  // Ênfase de Carreira
  if (toneOptions.enfase === "academica") {
    instructions.push("Destaque formação, pesquisas e projetos acadêmicos como diferenciais")
  } else if (toneOptions.enfase === "pratica") {
    instructions.push("Destaque aplicações práticas, projetos reais e resultados de implementação")
  } else if (toneOptions.enfase === "lideranca") {
    instructions.push("Destaque iniciativas próprias, autonomia e capacidade de liderança de projetos")
  } else if (toneOptions.enfase === "personalizado_enfase" && toneOptions.enfase_customizado?.trim()) {
    instructions.push(toneOptions.enfase_customizado.trim())
  }

  if (instructions.length === 0) return ""
  return "\n\nADDITIONAL TONE REQUIREMENTS (apply to all generated sections):\n" + instructions.map((i) => `- ${i}`).join("\n")
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(language: "pt" | "en"): string {
  const isPt = language === "pt"

  const sectionNames = isPt
    ? "## PERFIL PROFISSIONAL, ## COMPETÊNCIAS, ## PROJETOS RELEVANTES, ## CERTIFICAÇÕES"
    : "## PROFESSIONAL PROFILE, ## COMPETENCIES, ## RELEVANT PROJECTS, ## CERTIFICATIONS"

  const profileSection = isPt ? "PERFIL PROFISSIONAL" : "PROFESSIONAL PROFILE"
  const competenciesSection = isPt ? "COMPETÊNCIAS" : "COMPETENCIES"
  const projectsSection = isPt ? "PROJETOS RELEVANTES" : "RELEVANT PROJECTS"
  const certificationsSection = isPt ? "CERTIFICAÇÕES" : "CERTIFICATIONS"
  const languagesCategory = isPt ? "Idiomas" : "Languages"

  return `You are a resume personalization assistant. Your task is to generate 4 personalized sections of a resume adapted to a specific job opportunity.

You will receive the candidate's general CV in markdown format and the job details.
Return ONLY the 4 sections listed below, adapted to the job. Do NOT include header, contact info, or education section.

SECTIONS TO GENERATE (in this exact order): ${sectionNames}

RULES FOR EACH SECTION:

1. ## ${profileSection}:
   - Rewrite the profile from the general CV to naturally incorporate the job's keywords and requirements
   - Keep similar length to the original (same approximate number of sentences)

2. ## ${competenciesSection}:
   - Reorder items WITHIN existing categories by relevance to the job
   - The LAST category MUST ALWAYS be ${languagesCategory}
   - Do NOT add or remove any items or categories
   - Keep every item text exactly as written in the general CV

3. ## ${projectsSection}:
   - Rewrite only the description text to emphasize aspects relevant to the job
   - Maintain project titles, periods, and any divs with style="text-align: justify;"
   - Do NOT create new projects
   - Preserve bold (**text**) and italic (_text_) markers within descriptions

4. ## ${certificationsSection}:
   - Keep all entries exactly as written in the general CV
   - Only reorder by relevance to the job

ABSOLUTE PROHIBITIONS:
- Never invent skills, tools, metrics, certifications, experiences, or projects not present in the general CV
- Never change project titles or periods
- Never add or remove items from skill/competency categories

OUTPUT FORMAT:
- Return ONLY the 4 sections in markdown
- Start directly with ## ${profileSection}
- No preamble, no explanation, no code fences, no trailing text`
}

function buildUserPrompt(
  baseMarkdown: string,
  jobDescription: string,
  jobAnalysisData: Record<string, unknown> | null | undefined,
  language: "pt" | "en",
  toneInstructions: string
): string {
  const langLabel = language === "pt" ? "Português (pt-BR)" : "English"

  const jobLines: string[] = [`OUTPUT LANGUAGE: ${langLabel}`, "", "JOB DESCRIPTION:", jobDescription]

  if (jobAnalysisData) {
    const structured: string[] = []
    if (jobAnalysisData.empresa) structured.push(`Company: ${jobAnalysisData.empresa}`)
    if (jobAnalysisData.cargo) structured.push(`Position: ${jobAnalysisData.cargo}`)
    if (jobAnalysisData.local) structured.push(`Location: ${jobAnalysisData.local}`)
    if (jobAnalysisData.modalidade) structured.push(`Work mode: ${jobAnalysisData.modalidade}`)
    if (jobAnalysisData.tipo_vaga) structured.push(`Job level: ${jobAnalysisData.tipo_vaga}`)

    const req = jobAnalysisData.requisitos_obrigatorios
    if (Array.isArray(req) && req.length > 0) {
      structured.push(`Required skills: ${(req as string[]).join("; ")}`)
    }
    const des = jobAnalysisData.requisitos_desejaveis
    if (Array.isArray(des) && des.length > 0) {
      structured.push(`Desired skills: ${(des as string[]).join("; ")}`)
    }
    const resp = jobAnalysisData.responsabilidades
    if (Array.isArray(resp) && resp.length > 0) {
      structured.push(`Responsibilities: ${(resp as string[]).join("; ")}`)
    }

    if (structured.length > 0) {
      jobLines.push("", "STRUCTURED JOB DATA:", ...structured)
    }
  }

  if (toneInstructions) {
    jobLines.push(toneInstructions)
  }

  jobLines.push(
    "",
    "GENERAL CURRICULUM (structural base — use only what exists here, do not invent):",
    baseMarkdown,
    "",
    "Generate the 4 sections now. Follow all rules exactly."
  )

  return jobLines.join("\n")
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/generate-fit-markdown
 *
 * Generates 4 personalized CV sections (Profile, Competencies, Projects, Certifications)
 * adapted to a job description, with optional tone customization.
 * Does NOT require a saved vagaId — designed for the "Add Vaga" modal flow.
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

    const { jobDescription, jobAnalysisData, language, toneOptions, model } =
      GenerateFitMarkdownSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id

    await validateGrokConfig(userId)

    const candidateProfile = await getCandidateProfile(userId)

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

    const config = await loadUserAIConfig(userId)
    const resolvedModel =
      model ??
      (config.modelo_gemini && isValidModelId(config.modelo_gemini) ? config.modelo_gemini : DEFAULT_MODEL)

    const toneInstructions = toneOptions ? buildToneInstructions(toneOptions as FitToneOptions) : ""

    const response = await callGrok(
      [
        { role: "system", content: buildSystemPrompt(language) },
        {
          role: "user",
          content: buildUserPrompt(
            baseMarkdown,
            jobDescription,
            jobAnalysisData as Record<string, unknown> | null | undefined,
            language,
            toneInstructions
          ),
        },
      ],
      {
        model: resolvedModel,
        temperature: config.temperatura ?? 0.7,
        max_tokens: Math.max(config.max_tokens ?? 4096, 4096),
        top_p: config.top_p ?? 0.9,
      },
      { userId }
    )

    const markdown = response.content.trim()

    if (!markdown || markdown.length < 100) {
      throw new Error("LLM returned empty or insufficient markdown for the fit sections")
    }

    const duration = Date.now() - startTime
    console.log(`[generate-fit-markdown] ✅ Done (${duration}ms, ${language}, model: ${resolvedModel})`)

    return NextResponse.json({
      success: true,
      data: { markdown },
      metadata: {
        duration,
        model: resolvedModel,
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
    console.error(`[generate-fit-markdown] ❌ Error (${duration}ms):`, errorMessage)

    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request data", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
