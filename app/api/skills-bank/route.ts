import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

/**
 * Zod schema for adding a skill to the bank
 */
const AddSkillSchema = z.object({
  skill: z.string().min(1, "Skill name is required").max(100, "Skill name too long"),
  proficiency: z.enum(["Básico", "Intermediário", "Avançado"], {
    errorMap: () => ({ message: "Invalid proficiency level" }),
  }),
  category: z.enum([
    "Linguagens & Análise de Dados",
    "Ferramentas de Engenharia",
    "Visualização & BI",
    "Soft Skills"
  ], {
    errorMap: () => ({ message: "Invalid category" }),
  }),
})

/**
 * GET /api/skills-bank
 * Load user's skills bank
 *
 * Returns array of skills with proficiency levels
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("user_skills_bank")
      .select("id, skill_name, proficiency, category, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Skills Bank API] Error loading skills:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to client-friendly format
    const skills = (data || []).map((row) => ({
      id: row.id,
      skill: row.skill_name,
      proficiency: row.proficiency,
      category: row.category,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ skills })
  } catch (error) {
    console.error("[Skills Bank API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/skills-bank
 * Add skill to user's bank
 *
 * Body: { skill: string, proficiency: "Básico" | "Intermediário" | "Avançado", category: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validated = AddSkillSchema.parse(body)

    // Insert skill into database
    const { error } = await supabase.from("user_skills_bank").insert({
      user_id: user.id,
      skill_name: validated.skill,
      proficiency: validated.proficiency,
      category: validated.category,
    })

    if (error) {
      // Check for duplicate skill (unique constraint violation)
      if (error.code === "23505") {
        return NextResponse.json({ error: "Skill already exists in your bank" }, { status: 409 })
      }

      console.error("[Skills Bank API] Error adding skill:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(
      `[Skills Bank API] ✅ Added skill: ${validated.skill} (${validated.proficiency}) for user ${user.id}`
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("[Skills Bank API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/skills-bank?id=xxx
 * Remove skill from user's bank
 *
 * Query param: id (skill UUID)
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get skill ID from query params
    const skillId = req.nextUrl.searchParams.get("id")
    if (!skillId) {
      return NextResponse.json({ error: "Missing skill ID" }, { status: 400 })
    }

    // Delete skill (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from("user_skills_bank")
      .delete()
      .eq("id", skillId)
      .eq("user_id", user.id)

    if (error) {
      console.error("[Skills Bank API] Error deleting skill:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Skills Bank API] ✅ Deleted skill ID: ${skillId} for user ${user.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Skills Bank API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
