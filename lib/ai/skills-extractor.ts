/**
 * Skills Extractor
 * Extracts structured skills from candidate profile using Grok LLM
 */

import { callGrok } from "./grok-client"
import { SKILLS_EXTRACTION_SYSTEM_PROMPT, generateSkillsExtractionPrompt } from "./skills-extractor-prompt"
import { z } from "zod"

/**
 * Schema for extracted skill
 */
const ExtractedSkillSchema = z.object({
  skill_name: z.string().min(1, "Skill name cannot be empty"),
  proficiency: z.enum(["Básico", "Intermediário", "Avançado"]),
  frequency: z.enum(["Raro", "Ocasional", "Frequente"]),
  description: z.string().min(1, "Description cannot be empty"),
})

export type ExtractedSkill = z.infer<typeof ExtractedSkillSchema>

/**
 * Schema for all extracted skills (4 categories)
 */
const ExtractedSkillsSchema = z.object({
  programming_and_data: z.array(ExtractedSkillSchema),
  engineering_tools: z.array(ExtractedSkillSchema),
  visualization_and_bi: z.array(ExtractedSkillSchema),
  soft_skills: z.array(ExtractedSkillSchema),
})

export type ExtractedSkills = z.infer<typeof ExtractedSkillsSchema>

/**
 * Extract structured skills from candidate profile using Grok LLM
 *
 * @param profileText - Candidate's resume/profile text (dossiê, CV, etc.)
 * @returns Structured skills organized by category
 * @throws Error if LLM fails, returns invalid JSON, or validation fails
 */
export async function extractSkillsFromProfile(profileText: string): Promise<ExtractedSkills> {
  console.log("[Skills Extractor] Starting extraction from profile...")

  // Input validation
  if (!profileText || profileText.trim().length < 50) {
    throw new Error("Profile text too short (minimum 50 characters)")
  }

  // Generate prompt
  const userPrompt = generateSkillsExtractionPrompt(profileText)

  console.log(`[Skills Extractor] Profile length: ${profileText.length} chars`)

  // Call Grok 4.1 Fast via OpenRouter
  const response = await callGrok(
    [
      {
        role: "system",
        content: SKILLS_EXTRACTION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    {
      temperature: 0.3, // Low temperature for structured output
      max_tokens: 2500, // Enough for comprehensive skill lists
      top_p: 0.9,
    }
  )

  console.log(
    `[Skills Extractor] LLM response received (${response.usage.total_tokens} tokens: ${response.usage.prompt_tokens} in, ${response.usage.completion_tokens} out)`
  )

  // Extract JSON from response (may be wrapped in markdown code fences)
  const extractedSkills = extractJsonFromResponse(response.content)

  // Validate schema
  const validatedSkills = ExtractedSkillsSchema.parse(extractedSkills)

  // Log summary
  const totalSkills =
    validatedSkills.programming_and_data.length +
    validatedSkills.engineering_tools.length +
    validatedSkills.visualization_and_bi.length +
    validatedSkills.soft_skills.length

  console.log(`[Skills Extractor] ✅ Extracted ${totalSkills} skills:`)
  console.log(`  - Programming & Data: ${validatedSkills.programming_and_data.length}`)
  console.log(`  - Engineering Tools: ${validatedSkills.engineering_tools.length}`)
  console.log(`  - Visualization & BI: ${validatedSkills.visualization_and_bi.length}`)
  console.log(`  - Soft Skills: ${validatedSkills.soft_skills.length}`)

  return validatedSkills
}

/**
 * Extract JSON from LLM response (handles markdown code fences)
 * @param responseText - Raw LLM response
 * @returns Parsed JSON object
 * @throws Error if no valid JSON found
 */
function extractJsonFromResponse(responseText: string): unknown {
  // Try to extract JSON from markdown code fences
  const markdownJsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)

  if (markdownJsonMatch) {
    try {
      return JSON.parse(markdownJsonMatch[1])
    } catch (error) {
      throw new Error(`Failed to parse JSON from markdown: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Try to find JSON object directly (no code fences)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (error) {
      throw new Error(`Failed to parse JSON from response: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // No JSON found
  throw new Error("LLM response does not contain valid JSON. Response preview: " + responseText.substring(0, 200))
}

/**
 * Validate extracted skills structure (called after schema validation)
 * Performs additional business logic checks
 *
 * @param skills - Validated extracted skills
 * @throws Error if business rules violated
 */
export function validateExtractedSkills(skills: ExtractedSkills): void {
  const allCategories: Array<keyof ExtractedSkills> = [
    "programming_and_data",
    "engineering_tools",
    "visualization_and_bi",
    "soft_skills",
  ]

  for (const category of allCategories) {
    const categorySkills = skills[category]

    // Check for duplicate skill names within category
    const skillNames = categorySkills.map((s) => s.skill_name.toLowerCase())
    const uniqueNames = new Set(skillNames)

    if (skillNames.length !== uniqueNames.size) {
      throw new Error(`Duplicate skill names found in category: ${category}`)
    }

    // Check for empty descriptions
    for (const skill of categorySkills) {
      if (skill.description.trim().length < 10) {
        throw new Error(`Skill "${skill.skill_name}" has description too short (min 10 chars)`)
      }
    }
  }

  // Check total skills count (should extract at least 5 skills)
  const totalSkills = allCategories.reduce((sum, cat) => sum + skills[cat].length, 0)

  if (totalSkills < 5) {
    throw new Error(`Extracted only ${totalSkills} skills (minimum 5 expected). Profile may be too short or lack detail.`)
  }

  console.log(`[Skills Extractor] ✅ Validation passed (${totalSkills} skills)`)
}
