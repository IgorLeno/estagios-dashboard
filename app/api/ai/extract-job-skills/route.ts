import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callGrok, validateGrokConfig, type GrokMessage } from "@/lib/ai/grok-client"
import { createClient } from "@/lib/supabase/server"
import { getCandidateProfile } from "@/lib/supabase/candidate-profile"
import type { ExtractJobSkillsErrorResponse, ExtractJobSkillsResponse, JobSkillReview } from "@/lib/ai/types"

const ExtractJobSkillsRequestSchema = z
  .object({
    vagaId: z.string().uuid().optional(),
    jobDescription: z.string().min(50).max(50000).optional(),
    cargo: z.string().optional(),
    empresa: z.string().optional(),
  })
  .refine((data) => data.vagaId || data.jobDescription, "Either vagaId or jobDescription must be provided")

type JobRow = {
  cargo: string | null
  empresa: string | null
  descricao: unknown
  requisitos: unknown
}

type ProfileSkillRow = {
  skill_name: string
  category: string
}

type GrokSkillsPayload = {
  skills: string[]
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function stringifyJobField(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join(" ")
  }

  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""

  return String(value)
}

function parseSkillsFromGrok(content: string): string[] {
  const trimmed = content.trim()

  try {
    const parsed = JSON.parse(trimmed) as Partial<GrokSkillsPayload>
    if (Array.isArray(parsed.skills)) {
      return parsed.skills.filter((skill): skill is string => typeof skill === "string")
    }
  } catch {
    // Fall through to regex extraction below
  }

  const arrayMatch = trimmed.match(/\[(?:\s*"[^"]*"\s*(?:,\s*"[^"]*"\s*)*)\]/s)
  if (arrayMatch) {
    try {
      const parsedArray = JSON.parse(arrayMatch[0]) as unknown
      if (Array.isArray(parsedArray)) {
        return parsedArray.filter((skill): skill is string => typeof skill === "string")
      }
    } catch {
      // Fall through to error below
    }
  }

  throw new Error(`Invalid JSON from LLM: ${trimmed.slice(0, 300)}`)
}

function getProfileSkillsIndex(skills: ProfileSkillRow[]) {
  return new Map(skills.map((skill) => [normalizeForMatch(skill.skill_name), skill] as const))
}

export async function POST(req: NextRequest): Promise<NextResponse<ExtractJobSkillsResponse | ExtractJobSkillsErrorResponse>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await validateGrokConfig(user.id)

    let body: unknown
    try {
      body = await req.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
      }
      throw error
    }

    const { vagaId, jobDescription, cargo, empresa } = ExtractJobSkillsRequestSchema.parse(body)

    let vaga: JobRow | null = null

    if (vagaId) {
      const { data: vagaData, error: vagaError } = await supabase
        .from("vagas_estagio")
        .select("cargo, empresa, descricao, requisitos")
        .eq("id", vagaId)
        .eq("user_id", user.id)
        .single()

      vaga = vagaData as JobRow | null

      if (vagaError || !vaga) {
        return NextResponse.json({ success: false, error: "Vaga not found" }, { status: 404 })
      }
    } else {
      vaga = {
        cargo: cargo ?? null,
        empresa: empresa ?? null,
        descricao: jobDescription ?? "",
        requisitos: "",
      }
    }

    const candidateProfile = await getCandidateProfile(user.id)
    const profileSkills = candidateProfile.habilidades.flatMap((group) => {
      const category = group.category_pt?.trim() || group.category_en?.trim() || "Sem categoria"
      const items = [...group.items_pt, ...(group.items_en ?? [])]

      return items
        .map((skill) => skill.trim())
        .filter(Boolean)
        .map((skill) => ({
          skill_name: skill,
          category,
        }))
    })

    const jobDescriptionText = `${stringifyJobField(vaga.descricao)} ${stringifyJobField(vaga.requisitos)}`.trim()

    const messages: GrokMessage[] = [
      {
        role: "system",
        content: "Você é um extrator de habilidades de descrições de vagas. Retorne SOMENTE JSON válido, sem markdown, sem explicações.",
      },
      {
        role: "user",
        content: `Extraia TODAS as habilidades técnicas, ferramentas e competências exigidas na
descrição de vaga abaixo. Inclua ferramentas de software, linguagens, metodologias,
competências comportamentais relevantes ao cargo.

Retorne EXATAMENTE neste formato JSON:
{ "skills": ["habilidade 1", "habilidade 2", ...] }

Descrição da vaga (${vaga.cargo || ""} — ${vaga.empresa || ""}):
${jobDescriptionText}`,
      },
    ]

    let grokContent: string
    try {
      const grokResponse = await callGrok(messages, {
        temperature: 0.1,
        max_tokens: 1200,
      }, { userId: user.id })
      grokContent = grokResponse.content
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`LLM extraction failed: ${message}`)
    }

    const extractedSkills = parseSkillsFromGrok(grokContent)

    const profileIndex = getProfileSkillsIndex(profileSkills)

    const seen = new Set<string>()
    const skills: JobSkillReview[] = extractedSkills
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0)
      .filter((skill) => {
        const normalized = normalizeForMatch(skill)
        if (seen.has(normalized)) return false
        seen.add(normalized)
        return true
      })
      .map((skill) => {
        const matchedSkill = profileIndex.get(normalizeForMatch(skill))

        if (matchedSkill) {
          return {
            originalName: skill,
            displayName: matchedSkill.skill_name,
            mode: "use",
            inProfile: true,
            category: matchedSkill.category,
          }
        }

        return {
          originalName: skill,
          displayName: skill,
          mode: "skip",
          inProfile: false,
        }
      })

    return NextResponse.json({
      success: true,
      skills,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request data" }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : String(error)
    console.error("[Extract Job Skills API] Error:", message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
