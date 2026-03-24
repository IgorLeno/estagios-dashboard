import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateResumeHTML } from "@/lib/ai/resume-html-template"
import { getCVTemplateForUser } from "@/lib/ai/cv-templates"
import type { ResumeTemplate } from "@/lib/ai/resume-html-template"

/**
 * POST /api/ai/render-resume-html
 *
 * Renders the user's base CV as styled HTML using the selected template.
 * Does NOT call any AI — uses the user's profile from the database.
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

    // Verify vaga exists (access control via RLS)
    const { data: vaga, error } = await supabase.from("vagas_estagio").select("id").eq("id", vagaId).single()

    if (error || !vaga) {
      return NextResponse.json({ success: false, error: "Vaga not found" }, { status: 404 })
    }

    // Build CV from user profile — no AI, no markdown parsing
    const cv = await getCVTemplateForUser(language as "pt" | "en", user?.id)

    // Render styled HTML with the selected template
    const template: ResumeTemplate = (resumeTemplate as ResumeTemplate) ?? "modelo1"
    const html = generateResumeHTML(cv, template)

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
