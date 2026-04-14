import { NextRequest, NextResponse } from "next/server"
import { getCVTemplateForUser } from "@/lib/ai/cv-templates"
import { generateResumeHTML } from "@/lib/ai/resume-html-template"
import { htmlToMarkdown } from "@/lib/ai/markdown-converter"
import { createClient } from "@/lib/supabase/server"
import { getCandidateProfile, saveCandidateProfile } from "@/lib/supabase/candidate-profile"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}))
    const language = body.language === "en" ? "en" : "pt"
    const resumeTemplate = body.resumeTemplate === "modelo2" ? "modelo2" : "modelo1"

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const profile = await getCandidateProfile(user.id)
    const cv = await getCVTemplateForUser(language, user.id)
    const markdown = htmlToMarkdown(generateResumeHTML(cv, resumeTemplate))

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
        curriculo_geral_md: markdown,
        habilidades: profile.habilidades,
        projetos: profile.projetos,
        certificacoes: profile.certificacoes,
      },
      user.id
    )

    return NextResponse.json({ success: true, data: { markdown } })
  } catch (error) {
    console.error("[generate-general-resume] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate general resume" },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: "ok", message: "General resume generator is ready" })
}
