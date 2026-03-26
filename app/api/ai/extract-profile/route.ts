import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callGrok, validateGrokConfig, type GrokMessage } from "@/lib/ai/grok-client"
import { DEFAULT_MODEL, isValidModelId } from "@/lib/ai/models"
import { createClient } from "@/lib/supabase/server"
import { getPromptsConfig } from "@/lib/supabase/prompts"
import type { CandidateProfile } from "@/lib/types"

const ExtractProfileRequestSchema = z.object({
  rawText: z.string().min(1).max(50000),
  model: z.string().trim().min(1).optional(),
  mode: z.enum(["substituir", "acrescentar"]).optional(),
  existingProfile: z.record(z.unknown()).optional(),
})

type ExtractedProfileResponse = {
  nome?: string
  email?: string
  telefone?: string
  linkedin?: string
  github?: string
  localizacao?: string
  disponibilidade?: string
  curso?: string
  instituicao?: string
  previsao_conclusao?: string
  idiomas?: Array<{ idioma?: string; nivel?: string }>
  objetivo_pt?: string
  objetivo_en?: string
  habilidades?: Array<{
    category_pt?: string
    category_en?: string
    items_pt?: string[]
    items_en?: string[]
  }>
  projetos?: Array<{
    title_pt?: string
    title_en?: string
    description_pt?: string[]
    description_en?: string[]
  }>
  certificacoes?: Array<string | { title_pt?: string; institution_pt?: string; year?: string }>
}

const SYSTEM_PROMPT = `You are a professional profile data extractor.
Analyze the provided text and extract information to fill a structured profile.
Return ONLY valid JSON matching the schema provided.
Use empty strings or empty arrays for fields not found in the text.
NEVER invent information not present in the original text.`

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildMessages(
  rawText: string,
  mode?: "substituir" | "acrescentar",
  existingProfile?: Record<string, unknown>
): GrokMessage[] {
  const jsonSchema = `{
  "nome": "",
  "email": "",
  "telefone": "",
  "linkedin": "",
  "github": "",
  "localizacao": "",
  "disponibilidade": "",
  "curso": "",
  "instituicao": "",
  "previsao_conclusao": "",
  "idiomas": [{ "idioma": "", "nivel": "" }],
  "objetivo_pt": "",
  "objetivo_en": "",
  "habilidades": [
    {
      "category_pt": "",
      "category_en": "",
      "items_pt": [],
      "items_en": []
    }
  ],
  "projetos": [
    {
      "title_pt": "",
      "title_en": "",
      "description_pt": [],
      "description_en": []
    }
  ],
  "certificacoes": [
    {
      "title_pt": "",
      "institution_pt": "",
      "year": ""
    }
  ]
}`

  if (mode === "acrescentar" && existingProfile) {
    return [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}

MERGE MODE: The user already has a profile. Extract ONLY new information from the text that is NOT already present in the existing profile. For fields that already have values, return empty strings. For arrays (skills, projects, certifications, education, languages), return ONLY new entries not semantically duplicated in the existing data. Use case-insensitive comparison for deduplication.`,
      },
      {
        role: "user",
        content: `EXISTING PROFILE:
${JSON.stringify(existingProfile)}

NEW TEXT TO EXTRACT FROM:
${rawText}

Return JSON with this exact structure (include ONLY new information not already in the existing profile):
${jsonSchema}

For skills: group into logical categories. Do NOT repeat skills already present in the existing profile.
For projects: do NOT repeat projects with similar titles already present.
For certifications: extract title, institution and year separately into the object fields, and do NOT repeat certifications already present.
For scalar fields (nome, email, etc.): return empty string if the existing profile already has a value.`,
      },
    ]
  }

  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Analyze the following text and extract profile information:

${rawText}

Return JSON with this exact structure:
${jsonSchema}

For skills: group into logical categories (e.g. "Ferramentas / Tools", "Programação / Programming").
For projects: if text is in PT, copy title/description to EN fields as fallback.
For certifications: extract title, institution and year separately into the object fields.`,
    },
  ]
}

function adaptToCandidateProfile(payload: ExtractedProfileResponse): Partial<CandidateProfile> {
  const data: Partial<CandidateProfile> = {}

  const nome = cleanString(payload.nome)
  const email = cleanString(payload.email)
  const telefone = cleanString(payload.telefone)
  const linkedin = cleanString(payload.linkedin)
  const github = cleanString(payload.github)
  const localizacao = cleanString(payload.localizacao)
  const disponibilidade = cleanString(payload.disponibilidade)
  const objetivoPt = cleanString(payload.objetivo_pt)
  const objetivoEn = cleanString(payload.objetivo_en)
  const curso = cleanString(payload.curso)
  const instituicao = cleanString(payload.instituicao)
  const previsaoConclusao = cleanString(payload.previsao_conclusao)

  if (nome) data.nome = nome
  if (email) data.email = email
  if (telefone) data.telefone = telefone
  if (linkedin) data.linkedin = linkedin
  if (github) data.github = github
  if (localizacao) {
    data.localizacao_pt = localizacao
    data.localizacao_en = localizacao
  }
  if (disponibilidade) data.disponibilidade = disponibilidade
  if (objetivoPt) data.objetivo_pt = objetivoPt
  if (objetivoEn) data.objetivo_en = objetivoEn

  if (curso || instituicao || previsaoConclusao) {
    data.educacao = [
      {
        degree_pt: curso,
        degree_en: curso || undefined,
        institution_pt: instituicao,
        institution_en: instituicao || undefined,
        period_pt: previsaoConclusao,
        period_en: previsaoConclusao || undefined,
      },
    ]
  }

  const idiomas = Array.isArray(payload.idiomas)
    ? payload.idiomas
        .map((idioma) => {
          const nomeIdioma = cleanString(idioma?.idioma)
          const nivel = cleanString(idioma?.nivel)

          if (!nomeIdioma && !nivel) return null

          return {
            language_pt: nomeIdioma,
            language_en: nomeIdioma || undefined,
            proficiency_pt: nivel,
            proficiency_en: nivel || undefined,
          }
        })
        .filter((idioma): idioma is NonNullable<typeof idioma> => Boolean(idioma))
    : []

  if (idiomas.length > 0) {
    data.idiomas = idiomas
  }

  const habilidades = Array.isArray(payload.habilidades)
    ? payload.habilidades
        .map((habilidade) => {
          const categoryPt = cleanString(habilidade?.category_pt)
          const categoryEn = cleanString(habilidade?.category_en)
          const itemsPt = cleanStringArray(habilidade?.items_pt)
          const itemsEn = cleanStringArray(habilidade?.items_en)

          if (!categoryPt && !categoryEn && itemsPt.length === 0 && itemsEn.length === 0) {
            return null
          }

          return {
            category_pt: categoryPt,
            category_en: categoryEn || undefined,
            items_pt: itemsPt,
            items_en: itemsEn.length > 0 ? itemsEn : undefined,
          }
        })
        .filter((habilidade): habilidade is NonNullable<typeof habilidade> => Boolean(habilidade))
    : []

  if (habilidades.length > 0) {
    data.habilidades = habilidades
  }

  const projetos = Array.isArray(payload.projetos)
    ? payload.projetos
        .map((projeto) => {
          const titlePt = cleanString(projeto?.title_pt)
          const titleEn = cleanString(projeto?.title_en)
          const descriptionPt = cleanStringArray(projeto?.description_pt)
          const descriptionEn = cleanStringArray(projeto?.description_en)

          if (!titlePt && !titleEn && descriptionPt.length === 0 && descriptionEn.length === 0) {
            return null
          }

          return {
            title_pt: titlePt,
            title_en: titleEn || titlePt || undefined,
            description_pt: descriptionPt,
            description_en: descriptionEn.length > 0 ? descriptionEn : descriptionPt,
          }
        })
        .filter((projeto): projeto is NonNullable<typeof projeto> => Boolean(projeto))
    : []

  if (projetos.length > 0) {
    data.projetos = projetos
  }

  const certificacoes = Array.isArray(payload.certificacoes)
    ? payload.certificacoes
        .map((cert) => {
          if (typeof cert === "string") {
            const trimmed = cert.trim()
            return trimmed ? { title_pt: trimmed } : null
          }
          const titlePt = cleanString(cert?.title_pt)
          if (!titlePt) return null
          return {
            title_pt: titlePt,
            institution_pt: cleanString(cert?.institution_pt) || undefined,
            year: cleanString(cert?.year) || undefined,
          }
        })
        .filter((cert): cert is NonNullable<typeof cert> => Boolean(cert))
    : []

  if (certificacoes.length > 0) {
    data.certificacoes = certificacoes
  }

  return data
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    validateGrokConfig()

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
      }
      throw error
    }

    const { rawText, model, mode, existingProfile } = ExtractProfileRequestSchema.parse(body)
    const config = await getPromptsConfig(user.id)
    const requestedModel = model ?? config.modelo_gemini
    const resolvedModel = requestedModel && isValidModelId(requestedModel) ? requestedModel : DEFAULT_MODEL
    const response = await callGrok(buildMessages(rawText, mode, existingProfile), {
      model: resolvedModel,
      temperature: 0.1,
      max_tokens: Math.min(config.max_tokens, 4000),
      top_p: config.top_p ?? 0.9,
    })

    let parsed: ExtractedProfileResponse
    try {
      parsed = JSON.parse(response.content.trim()) as ExtractedProfileResponse
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON from model" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: adaptToCandidateProfile(parsed),
      metadata: {
        model: resolvedModel,
        tokenUsage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      },
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request data" }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : String(error)
    console.error("[Extract Profile API] Error:", message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
