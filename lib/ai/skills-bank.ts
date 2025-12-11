import { createClient } from "@/lib/supabase/server"

/**
 * Skills Bank Entry Interface
 * Represents a skill with proficiency level in user's skills bank
 */
export interface SkillsBankEntry {
  id: string
  user_id: string
  skill: string
  proficiency: "Básico" | "Intermediário" | "Avançado"
  category: "Linguagens & Análise de Dados" | "Ferramentas de Engenharia" | "Visualização & BI" | "Soft Skills"
  created_at: string
}

/**
 * Simplified Skills Bank Item (for generator use)
 */
export interface SkillsBankItem {
  skill: string
  proficiency: string
  category: string
}

/**
 * Load user's skills bank from Supabase
 *
 * @param userId - Optional user ID (uses auth session if not provided)
 * @returns Array of skills bank entries
 */
export async function loadUserSkillsBank(userId?: string): Promise<SkillsBankItem[]> {
  try {
    const supabase = await createClient()

    // Get user ID from session if not provided
    let effectiveUserId = userId
    if (!effectiveUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      effectiveUserId = user?.id
    }

    if (!effectiveUserId) {
      console.log("[Skills Bank] No user ID, returning empty bank")
      return []
    }

    const { data, error } = await supabase
      .from("user_skills_bank")
      .select("skill_name, proficiency, category")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Skills Bank] Error loading skills:", error)
      return []
    }

    return (data || []).map((row) => ({
      skill: row.skill_name,
      proficiency: row.proficiency,
      category: row.category,
    }))
  } catch (error) {
    console.error("[Skills Bank] Unexpected error:", error)
    return []
  }
}

/**
 * Add skill to user's skills bank
 *
 * @param skill - Skill name
 * @param proficiency - Proficiency level
 * @param category - Skill category
 * @param userId - Optional user ID (uses auth session if not provided)
 * @returns Success status with optional error message
 */
export async function addSkillToBank(
  skill: string,
  proficiency: SkillsBankEntry["proficiency"],
  category: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    let effectiveUserId = userId
    if (!effectiveUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      effectiveUserId = user?.id
    }

    if (!effectiveUserId) {
      return { success: false, error: "User not authenticated" }
    }

    const { error } = await supabase.from("user_skills_bank").insert({
      user_id: effectiveUserId,
      skill_name: skill,
      proficiency: proficiency,
      category,
    })

    if (error) {
      // Duplicate skill error (unique constraint violation)
      if (error.code === "23505") {
        return { success: false, error: "Skill already exists in your bank" }
      }
      return { success: false, error: error.message }
    }

    console.log(`[Skills Bank] Added skill: ${skill} (${proficiency})`)
    return { success: true }
  } catch (error) {
    console.error("[Skills Bank] Error adding skill:", error)
    return { success: false, error: "Unexpected error occurred" }
  }
}

/**
 * Remove skill from user's skills bank
 *
 * @param skillId - UUID of skill to remove
 * @param userId - Optional user ID (uses auth session if not provided)
 * @returns Success status with optional error message
 */
export async function removeSkillFromBank(
  skillId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    let effectiveUserId = userId
    if (!effectiveUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      effectiveUserId = user?.id
    }

    if (!effectiveUserId) {
      return { success: false, error: "User not authenticated" }
    }

    const { error } = await supabase
      .from("user_skills_bank")
      .delete()
      .eq("id", skillId)
      .eq("user_id", effectiveUserId) // Ensure user can only delete their own skills

    if (error) {
      return { success: false, error: error.message }
    }

    console.log(`[Skills Bank] Removed skill ID: ${skillId}`)
    return { success: true }
  } catch (error) {
    console.error("[Skills Bank] Error removing skill:", error)
    return { success: false, error: "Unexpected error occurred" }
  }
}

/**
 * Update skill in user's skills bank
 *
 * @param skillId - UUID of skill to update
 * @param updates - Fields to update (proficiency and/or category)
 * @param userId - Optional user ID (uses auth session if not provided)
 * @returns Success status with optional error message
 */
export async function updateSkillInBank(
  skillId: string,
  updates: {
    proficiency?: SkillsBankEntry["proficiency"]
    category?: string
  },
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    let effectiveUserId = userId
    if (!effectiveUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      effectiveUserId = user?.id
    }

    if (!effectiveUserId) {
      return { success: false, error: "User not authenticated" }
    }

    const updateData: Record<string, unknown> = {}
    if (updates.proficiency) updateData.proficiency = updates.proficiency
    if (updates.category) updateData.category = updates.category

    const { error } = await supabase
      .from("user_skills_bank")
      .update(updateData)
      .eq("id", skillId)
      .eq("user_id", effectiveUserId)

    if (error) {
      return { success: false, error: error.message }
    }

    console.log(`[Skills Bank] Updated skill ID: ${skillId}`)
    return { success: true }
  } catch (error) {
    console.error("[Skills Bank] Error updating skill:", error)
    return { success: false, error: "Unexpected error occurred" }
  }
}

/**
 * Get all available skills from bank (for suggestions/autocomplete)
 * Returns global default skills (user_id = NULL) that can be suggested to users
 *
 * @returns Array of suggested skill names
 */
export async function getGlobalSkillsSuggestions(): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("user_skills_bank")
      .select("skill_name")
      .is("user_id", null)
      .order("skill_name")

    if (error) {
      console.error("[Skills Bank] Error loading global suggestions:", error)
      return []
    }

    return (data || []).map((row) => row.skill_name)
  } catch (error) {
    console.error("[Skills Bank] Error loading suggestions:", error)
    return []
  }
}
