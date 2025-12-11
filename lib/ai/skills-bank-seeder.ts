/**
 * Skills Bank Seeder
 * Populates user_skills_bank from candidate profile via LLM extraction
 */

import { createClient } from "@/lib/supabase/server"
import { extractSkillsFromProfile, validateExtractedSkills } from "./skills-extractor"
import type { ExtractedSkills } from "./skills-extractor"

/**
 * Skill row for database insertion
 */
interface SkillBankRow {
  user_id: string
  skill_name: string
  category: string
  proficiency: string
  // NOTE: frequency and description are extracted but not currently stored in DB
  // Consider adding these columns to user_skills_bank for richer skill profiles
}

/**
 * Result of seeding operation
 */
export interface SeedResult {
  success: boolean
  skills_count: number
  errors?: string[]
  categories_summary?: {
    programming_and_data: number
    engineering_tools: number
    visualization_and_bi: number
    soft_skills: number
  }
}

/**
 * Category mapping: extraction categories → database categories
 */
const CATEGORY_MAP: Record<keyof ExtractedSkills, string> = {
  programming_and_data: "Linguagens & Análise de Dados",
  engineering_tools: "Ferramentas de Engenharia",
  visualization_and_bi: "Visualização & BI",
  soft_skills: "Soft Skills",
}

/**
 * Populate user_skills_bank from candidate profile text
 * Replaces all existing skills for the user
 *
 * @param userId - User ID to populate skills for
 * @param profileText - Candidate's resume/profile text (dossiê, CV, etc.)
 * @returns Result with success status, count, and optional errors
 */
export async function seedSkillsBankFromProfile(userId: string, profileText: string): Promise<SeedResult> {
  try {
    console.log(`[Skills Seeder] Starting seed for user ${userId}`)

    // 1. Extract skills via LLM
    console.log("[Skills Seeder] Extracting skills from profile...")
    const extractedSkills = await extractSkillsFromProfile(profileText)

    // 2. Additional validation
    validateExtractedSkills(extractedSkills)

    // 3. Convert to database format
    const skillRows: SkillBankRow[] = []

    for (const [extractionCategory, dbCategory] of Object.entries(CATEGORY_MAP)) {
      const skills = extractedSkills[extractionCategory as keyof ExtractedSkills]

      for (const skill of skills) {
        skillRows.push({
          user_id: userId,
          skill_name: skill.skill_name,
          category: dbCategory,
          proficiency: skill.proficiency,
          // NOTE: frequency and description not stored in current schema
        })
      }
    }

    console.log(`[Skills Seeder] Prepared ${skillRows.length} skills for insertion`)

    // 4. Delete existing skills (replace mode)
    const supabase = await createClient()

    const { error: deleteError } = await supabase.from("user_skills_bank").delete().eq("user_id", userId)

    if (deleteError) {
      console.error("[Skills Seeder] Error deleting existing skills:", deleteError)
      throw new Error(`Failed to clear existing skills: ${deleteError.message}`)
    }

    console.log("[Skills Seeder] Cleared existing skills")

    // 5. Bulk insert new skills
    const { data, error: insertError } = await supabase.from("user_skills_bank").insert(skillRows).select()

    if (insertError) {
      console.error("[Skills Seeder] Error inserting skills:", insertError)
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

    console.log(`[Skills Seeder] ✅ Successfully inserted ${data.length} skills`)

    // 6. Build summary
    const summary = {
      programming_and_data: extractedSkills.programming_and_data.length,
      engineering_tools: extractedSkills.engineering_tools.length,
      visualization_and_bi: extractedSkills.visualization_and_bi.length,
      soft_skills: extractedSkills.soft_skills.length,
    }

    return {
      success: true,
      skills_count: data.length,
      categories_summary: summary,
    }
  } catch (error) {
    console.error("[Skills Seeder] Error:", error)
    return {
      success: false,
      skills_count: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}

/**
 * Merge skills from profile (incremental update)
 * Adds only new skills, skips duplicates, preserves existing skills
 *
 * @param userId - User ID to update skills for
 * @param profileText - Candidate's resume/profile text
 * @returns Counts of added, updated, and skipped skills
 */
export async function mergeSkillsFromProfile(
  userId: string,
  profileText: string
): Promise<{ added: number; updated: number; skipped: number; errors?: string[] }> {
  try {
    console.log(`[Skills Seeder] Starting merge for user ${userId}`)

    // 1. Extract skills via LLM
    const extractedSkills = await extractSkillsFromProfile(profileText)
    validateExtractedSkills(extractedSkills)

    // 2. Fetch existing skills
    const supabase = await createClient()

    const { data: existingSkills, error: fetchError } = await supabase
      .from("user_skills_bank")
      .select("skill_name")
      .eq("user_id", userId)

    if (fetchError) {
      throw new Error(`Failed to fetch existing skills: ${fetchError.message}`)
    }

    // Build set of existing skill names (case-insensitive)
    const existingNames = new Set((existingSkills || []).map((s) => s.skill_name.toLowerCase()))

    console.log(`[Skills Seeder] Found ${existingNames.size} existing skills`)

    // 3. Identify new skills to add
    const newSkills: SkillBankRow[] = []

    for (const [extractionCategory, dbCategory] of Object.entries(CATEGORY_MAP)) {
      const skills = extractedSkills[extractionCategory as keyof ExtractedSkills]

      for (const skill of skills) {
        // Only add if not already exists (case-insensitive check)
        if (!existingNames.has(skill.skill_name.toLowerCase())) {
          newSkills.push({
            user_id: userId,
            skill_name: skill.skill_name,
            category: dbCategory,
            proficiency: skill.proficiency,
          })
        }
      }
    }

    console.log(`[Skills Seeder] Identified ${newSkills.length} new skills to add`)

    // 4. Insert new skills
    let added = 0

    if (newSkills.length > 0) {
      const { data, error: insertError } = await supabase.from("user_skills_bank").insert(newSkills).select()

      if (insertError) {
        throw new Error(`Failed to insert new skills: ${insertError.message}`)
      }

      added = data.length
      console.log(`[Skills Seeder] ✅ Added ${added} new skills`)
    } else {
      console.log("[Skills Seeder] No new skills to add")
    }

    const totalExtracted =
      extractedSkills.programming_and_data.length +
      extractedSkills.engineering_tools.length +
      extractedSkills.visualization_and_bi.length +
      extractedSkills.soft_skills.length

    const skipped = totalExtracted - added

    return {
      added,
      updated: 0, // No updates in merge mode (only adds)
      skipped,
    }
  } catch (error) {
    console.error("[Skills Seeder] Merge error:", error)
    return {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}
