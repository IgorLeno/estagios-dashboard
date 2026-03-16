import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { JobSkillReview } from "@/lib/ai/types"

const JobSkillReviewSchema = z.object({
  originalName: z.string().min(1),
  displayName: z.string().min(1),
  mode: z.enum(["use", "skip", "rename"]),
  inBank: z.boolean(),
  category: z.string().optional(),
})

const SaveJobSkillsSchema = z.object({
  skills: z.array(JobSkillReviewSchema),
})

async function getAuthorizedVagaId(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      supabase,
      errorResponse: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    }
  }

  const { data: vaga, error } = await supabase
    .from("vagas_estagio")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !vaga) {
    return {
      supabase,
      errorResponse: NextResponse.json({ success: false, error: "Vaga not found" }, { status: 404 }),
    }
  }

  return { supabase, errorResponse: null }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 })
    }

    const { supabase, errorResponse } = await getAuthorizedVagaId(id)
    if (errorResponse) return errorResponse

    const { data, error } = await supabase.from("job_skills").select("skills").eq("job_id", id).maybeSingle()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      skills: ((data?.skills as JobSkillReview[] | null) ?? []),
    })
  } catch (error) {
    console.error("[GET /api/vagas/[id]/skills] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch job skills",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 })
    }

    const { supabase, errorResponse } = await getAuthorizedVagaId(id)
    if (errorResponse) return errorResponse

    const body = await request.json()
    const { skills } = SaveJobSkillsSchema.parse(body)

    const { data, error } = await supabase
      .from("job_skills")
      .upsert(
        {
          job_id: id,
          skills,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id" }
      )
      .select("skills")
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      skills: (data.skills as JobSkillReview[]) ?? [],
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request data" }, { status: 400 })
    }

    console.error("[POST /api/vagas/[id]/skills] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save job skills",
      },
      { status: 500 }
    )
  }
}
