import { NextRequest, NextResponse } from "next/server"
import { callGrok, validateGrokConfig, type GrokMessage } from "@/lib/ai/grok-client"
import { loadUserAIConfig } from "@/lib/ai/config"
import { createClient } from "@/lib/supabase/server"
import { getCandidateProfile, saveCandidateProfile } from "@/lib/supabase/candidate-profile"

function buildRefinementMessages(currentResume: string, instructions: string, language: "pt" | "en"): GrokMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are an expert resume editor refining a candidate's general/base resume.",
        "Follow the user's instructions precisely, but do not fabricate experience, dates, certifications, links, metrics, education, or skills.",
        "Keep the resume in clean markdown and preserve the same concise structure and formatting style unless the user explicitly asks otherwise.",
        `Keep the complete resume in ${language === "en" ? "English" : "Portuguese"}.`,
        "Return only the complete refined markdown. Do not wrap it in code fences and do not add commentary.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "Current general resume markdown:",
        currentResume,
        "",
        "Refinement instructions:",
        instructions,
      ].join("\n"),
    },
  ]
}

function stripMarkdownFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const instructions = typeof body.instructions === "string" ? body.instructions.trim() : ""
    const language = body.language === "en" ? "en" : "pt"

    if (instructions.length < 10) {
      return NextResponse.json({ success: false, error: "instructions must be at least 10 characters" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await validateGrokConfig(user.id)

    const profile = await getCandidateProfile(user.id)
    const currentResume =
      language === "en"
        ? profile.curriculo_geral_md_en?.trim()
        : profile.curriculo_geral_md?.trim()

    if (!currentResume) {
      return NextResponse.json({ success: false, error: "No general resume found" }, { status: 400 })
    }

    const config = await loadUserAIConfig(user.id)
    const response = await callGrok(
      buildRefinementMessages(currentResume, instructions, language),
      {
        model: typeof body.model === "string" ? body.model : config.modelo_gemini,
        temperature: config.temperatura,
        max_tokens: 8192,
        top_p: config.top_p ?? 0.9,
      },
      { userId: user.id }
    )

    const refinedResume = stripMarkdownFence(response.content)
    const nextPtResume = language === "pt" ? refinedResume : (profile.curriculo_geral_md ?? "")
    const nextEnResume = language === "en" ? refinedResume : (profile.curriculo_geral_md_en ?? "")

    if (refinedResume.length < Math.ceil(currentResume.length * 0.3)) {
      return NextResponse.json(
        { success: false, error: "Refined resume response was unexpectedly short and was rejected" },
        { status: 502 }
      )
    }

    await saveCandidateProfile(
      {
        user_id: user.id,
        nome: profile.nome,
        email: profile.email,
        telefone: profile.telefone,
        linkedin: profile.linkedin,
        github: profile.github,
        localizacao_pt: profile.localizacao_pt,
        localizacao_en: profile.localizacao_en,
        disponibilidade: profile.disponibilidade,
        educacao: profile.educacao,
        idiomas: profile.idiomas,
        objetivo_pt: profile.objetivo_pt,
        objetivo_en: profile.objetivo_en,
        tagline_pt: profile.tagline_pt,
        tagline_en: profile.tagline_en,
        curriculo_geral_md: nextPtResume,
        curriculo_geral_md_en: nextEnResume,
        habilidades: profile.habilidades,
        projetos: profile.projetos,
        certificacoes: profile.certificacoes,
      },
      user.id
    )

    return NextResponse.json({
      success: true,
      data: {
        curriculo_geral_md: nextPtResume,
        curriculo_geral_md_en: nextEnResume,
      },
      metadata: {
        model: typeof body.model === "string" ? body.model : config.modelo_gemini,
        tokenUsage: response.usage,
      },
    })
  } catch (error) {
    console.error("[refine-general-resume] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to refine general resume" },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: "ok", message: "General resume refiner is ready" })
}
