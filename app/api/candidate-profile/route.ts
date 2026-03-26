import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getCandidateProfile,
  saveCandidateProfile,
  resetCandidateProfile,
} from "@/lib/supabase/candidate-profile"

/**
 * GET /api/candidate-profile
 * Returns candidate profile (empty if none exists)
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const profile = await getCandidateProfile(user?.id)

    return NextResponse.json({
      success: true,
      data: profile,
      isReadOnly: !user,
    })
  } catch (error) {
    console.error("Error fetching candidate profile:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/candidate-profile
 * Save or update candidate profile (requires auth)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (!body.nome && body.nome !== "") {
      return NextResponse.json(
        { success: false, error: "Missing required field: nome" },
        { status: 400 }
      )
    }

    await saveCandidateProfile(
      {
        user_id: user.id,
        nome: body.nome ?? "",
        email: body.email ?? "",
        telefone: body.telefone ?? "",
        linkedin: body.linkedin ?? "",
        github: body.github ?? "",
        localizacao_pt: body.localizacao_pt ?? "",
        localizacao_en: body.localizacao_en ?? "",
        disponibilidade: body.disponibilidade ?? "",
        educacao: body.educacao ?? [],
        idiomas: body.idiomas ?? [],
        objetivo_pt: body.objetivo_pt ?? "",
        objetivo_en: body.objetivo_en ?? "",
        tagline_pt: body.tagline_pt ?? "",
        tagline_en: body.tagline_en ?? "",
        habilidades: body.habilidades ?? [],
        projetos: body.projetos ?? [],
        certificacoes: body.certificacoes ?? [],
      },
      user.id
    )

    const updatedProfile = await getCandidateProfile(user.id)

    return NextResponse.json({ success: true, data: updatedProfile })
  } catch (error) {
    console.error("Error saving candidate profile:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/candidate-profile
 * Reset candidate profile (requires auth)
 */
export async function DELETE() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await resetCandidateProfile(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error resetting candidate profile:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
