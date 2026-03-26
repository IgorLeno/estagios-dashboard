import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ResumeTemplate } from "@/lib/ai/resume-html-template"
import { renderMarkdownResumeToHtml } from "@/lib/ai/markdown-converter"

/**
 * POST /api/ai/render-resume-html
 *
 * Renders the saved tailored resume markdown as styled HTML using the selected template.
 * Does NOT call any AI and does NOT rebuild the CV from the base user profile.
 *
 * Request body:
 * {
 *   vagaId: string,
 *   language: "pt" | "en",
 *   resumeTemplate?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: { html: string }
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { vagaId, language, resumeTemplate } = body

    if (!vagaId || !language) {
      return NextResponse.json({ success: false, error: "vagaId and language are required" }, { status: 400 })
    }

    if (language !== "pt" && language !== "en") {
      return NextResponse.json({ success: false, error: "language must be 'pt' or 'en'" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Verify vaga exists (access control via RLS) and load the saved tailored resume.
    const { data: vaga, error } = await supabase
      .from("vagas_estagio")
      .select("id, curriculo_text_pt, curriculo_text_en")
      .eq("id", vagaId)
      .single()

    if (error || !vaga) {
      return NextResponse.json({ success: false, error: "Vaga not found" }, { status: 404 })
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const template: ResumeTemplate = (resumeTemplate as ResumeTemplate) ?? "modelo1"
    const markdownField = language === "pt" ? "curriculo_text_pt" : "curriculo_text_en"
    const savedMarkdown = vaga[markdownField]?.trim()

    if (!savedMarkdown) {
      return NextResponse.json(
        { success: false, error: `No saved resume markdown found for ${language.toUpperCase()}` },
        { status: 400 }
      )
    }

    const html = await renderMarkdownResumeToHtml(savedMarkdown, template, language)

    console.log(`[render-resume-html] ✅ HTML rendered (template=${template}, language=${language})`)

    return NextResponse.json({ success: true, data: { html } })
  } catch (error) {
    console.error("[render-resume-html] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to render HTML" },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: "ok", message: "Resume HTML renderer is ready" })
}
