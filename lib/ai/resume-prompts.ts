import type { JobDetails } from "./types"
import type { CVTemplate } from "./types"

/**
 * System instruction for resume personalization
 *
 * CRITICAL: This system enforces ZERO FABRICATION TOLERANCE
 * Any invented information will cause rejection and regeneration
 */
export const RESUME_SYSTEM_PROMPT = `You are a professional resume writer specializing in ATS (Applicant Tracking System) optimization.

Your role is to personalize resume sections to match job requirements while maintaining complete honesty and accuracy.

⚠️  CRITICAL RULES - ZERO TOLERANCE FOR VIOLATIONS:
1. NEVER fabricate skills, tools, certifications, or experience
2. NEVER add new skills to the skills list (ONLY reorder existing ones)
3. NEVER change project titles or dates (ONLY rewrite descriptions)
4. NEVER invent metrics or achievements not in the original CV
5. ONLY reorder and emphasize existing content - NO invention allowed
6. Use job keywords naturally in rewrites - no keyword stuffing
7. Maintain professional, concise language
8. Return ONLY valid JSON, no markdown code fences

WHAT YOU CAN DO:
✅ Rewrite summary to include job keywords (80-120 words)
✅ Reorder skills within categories by relevance to job
✅ Rewrite project descriptions to emphasize job-relevant aspects

WHAT YOU CANNOT DO:
❌ Add skills/tools not in original skills list
❌ Add certifications not in original certifications list
❌ Change project titles or dates
❌ Invent new projects or experiences
❌ Add metrics/numbers not in original CV
❌ Change contact information

VALIDATION:
Your output will be validated against strict schemas. Any fabricated content will be rejected.
If job requirements ask for skills not in the CV, DO NOT add them - just emphasize related existing skills.`

/**
 * Build prompt for personalizing professional summary
 */
export function buildSummaryPrompt(jobDetails: JobDetails, originalSummary: string, userSkills: string[]): string {
  const topKeywords = extractTopKeywords(jobDetails, 7)

  // Handle undefined/Indefinido values
  const cargo = jobDetails.cargo && jobDetails.cargo !== "Indefinido" ? jobDetails.cargo : "Position not specified"
  const requisitosObrigatorios =
    jobDetails.requisitos_obrigatorios.length > 0 ? jobDetails.requisitos_obrigatorios.join(", ") : "Not specified"
  const requisitosDesejaveis =
    jobDetails.requisitos_desejaveis.length > 0 ? jobDetails.requisitos_desejaveis.join(", ") : "Not specified"
  const responsabilidades =
    jobDetails.responsabilidades.length > 0 ? jobDetails.responsabilidades.slice(0, 5).join("; ") : "Not specified"

  return `Rewrite the professional summary to target this job opportunity.

JOB DETAILS:
Company: ${jobDetails.empresa}
Position: ${cargo}
Required Skills: ${requisitosObrigatorios}
Desired Skills: ${requisitosDesejaveis}
Responsibilities: ${responsabilidades}

ORIGINAL SUMMARY:
${originalSummary}

USER'S SKILLS:
${userSkills.join(", ")}

TOP KEYWORDS TO INCLUDE:
${topKeywords.length > 0 ? topKeywords.join(", ") : "Use general professional keywords"}

INSTRUCTIONS:
- Write 3-4 sentences (80-120 words)
- If job details are incomplete ("Not specified"), focus on general professional strengths
- Include available keywords naturally (at least 5 if available)
- Emphasize experience matching available job information
- Keep professional, confident tone
- Quantify achievements where possible
- Stay truthful - only mention what's in the original summary or user skills

Return JSON format:
{
  "summary": "Your rewritten summary here..."
}`
}

/**
 * Build prompt for personalizing skills section
 */
export function buildSkillsPrompt(
  jobDetails: JobDetails,
  currentSkills: Array<{ category: string; items: string[] }>,
  projects: Array<{ title: string; description: string[] }>
): string {
  // Handle undefined/empty arrays
  const requisitosObrigatorios =
    jobDetails.requisitos_obrigatorios.length > 0 ? jobDetails.requisitos_obrigatorios.join(", ") : "Not specified"
  const requisitosDesejaveis =
    jobDetails.requisitos_desejaveis.length > 0 ? jobDetails.requisitos_desejaveis.join(", ") : "Not specified"

  // Extract all skill items for validation
  const allSkillItems = currentSkills.flatMap((cat) => cat.items)

  return `⚠️  CRITICAL: REORDER ONLY - DO NOT ADD NEW SKILLS

JOB REQUIRED SKILLS:
${requisitosObrigatorios}

JOB DESIRED SKILLS:
${requisitosDesejaveis}

USER'S CURRENT SKILLS (COMPLETE LIST):
${JSON.stringify(currentSkills, null, 2)}

ALLOWED SKILLS (you MUST use ONLY these exact items):
${allSkillItems.join(", ")}

INSTRUCTIONS - READ CAREFULLY:
1. If job skills are "Not specified", return the EXACT original skill structure
2. Otherwise, reorder skills within each category by relevance to job
3. ❌ FORBIDDEN: Adding new skills (e.g., TensorFlow, Docker, MATLAB, JavaScript)
4. ❌ FORBIDDEN: Changing skill names (must match exactly from allowed list)
5. ✅ ALLOWED: Changing the ORDER of skills within categories
6. ✅ ALLOWED: Moving most relevant skills to the top of their category
7. Keep all original skills (don't remove any)
8. Maintain category structure exactly as provided
9. Use ONLY items from the "ALLOWED SKILLS" list above

VALIDATION CHECK:
Before returning, verify that EVERY skill in your output appears in the "ALLOWED SKILLS" list.
If you find ANY skill not in that list, REMOVE IT immediately.

Return JSON format:
{
  "skills": [
    {
      "category": "Exact category name from input",
      "items": ["Skill1", "Skill2", ...]  // ONLY from ALLOWED SKILLS list
    },
    ...
  ]
}`
}

/**
 * Build prompt for personalizing projects section
 */
export function buildProjectsPrompt(
  jobDetails: JobDetails,
  currentProjects: Array<{ title: string; description: string[] }>
): string {
  const jobKeywords = extractTopKeywords(jobDetails, 10)

  // Handle undefined/Indefinido values
  const cargo = jobDetails.cargo && jobDetails.cargo !== "Indefinido" ? jobDetails.cargo : "Position not specified"
  const responsabilidades =
    jobDetails.responsabilidades.length > 0 ? jobDetails.responsabilidades.slice(0, 5).join("; ") : "Not specified"
  const requisitosObrigatorios =
    jobDetails.requisitos_obrigatorios.length > 0 ? jobDetails.requisitos_obrigatorios.join(", ") : "Not specified"

  // Extract exact project titles for validation
  const projectTitles = currentProjects.map((p) => p.title)

  return `⚠️  CRITICAL: KEEP TITLES AND DATES UNCHANGED - REWRITE DESCRIPTIONS ONLY

JOB DETAILS:
Position: ${cargo}
Responsibilities: ${responsabilidades}
Required Skills: ${requisitosObrigatorios}

CURRENT PROJECTS (with exact titles you MUST preserve):
${JSON.stringify(currentProjects, null, 2)}

REQUIRED PROJECT TITLES (copy these EXACTLY):
${projectTitles.map((t, i) => `${i + 1}. "${t}"`).join("\n")}

JOB KEYWORDS TO EMPHASIZE:
${jobKeywords.length > 0 ? jobKeywords.join(", ") : "Use general professional keywords"}

INSTRUCTIONS - READ CAREFULLY:
1. Keep ALL projects (don't remove any)
2. ❌ FORBIDDEN: Changing project titles (must copy EXACTLY from "REQUIRED PROJECT TITLES")
3. ❌ FORBIDDEN: Changing dates in titles (e.g., keep "(2023-2025)" exactly)
4. ❌ FORBIDDEN: Adding new projects or inventing metrics
5. ✅ ALLOWED: Rewriting descriptions (2-3 bullet points each)
6. If job details are incomplete ("Not specified"), write general professional descriptions
7. Otherwise, rewrite descriptions to highlight job-relevant aspects
8. Use available job keywords naturally in descriptions
9. Emphasize technologies/methodologies matching available job requirements
10. Focus on outcomes and impact
11. Stay truthful - only reframe existing work, don't invent achievements

VALIDATION CHECK:
Before returning, verify that EVERY project title in your output matches EXACTLY (character-by-character, including dates and parentheses) with the "REQUIRED PROJECT TITLES" list above.

Return JSON format:
{
  "projects": [
    {
      "title": "EXACT title from REQUIRED PROJECT TITLES (with dates)",
      "description": [
        "Rewritten bullet point emphasizing job-relevant aspects",
        "Another rewritten point with job keywords",
        "Third point focusing on relevant outcomes"
      ]
    },
    ...
  ]
}`
}

/**
 * Extract top keywords from job details
 * Handles "Indefinido" and empty values gracefully
 */
function extractTopKeywords(jobDetails: JobDetails, limit: number): string[] {
  const keywords = new Set<string>()

  // Add from cargo (job title) - skip if Indefinido
  if (jobDetails.cargo && jobDetails.cargo !== "Indefinido") {
    jobDetails.cargo.split(/[\s,]+/).forEach((word) => {
      if (word.length > 3) keywords.add(word)
    })
  }

  // Add from requisitos
  jobDetails.requisitos_obrigatorios.forEach((req) => {
    req.split(/[\s,]+/).forEach((word) => {
      if (word.length > 3) keywords.add(word)
    })
  })

  // Add from responsabilidades
  jobDetails.responsabilidades.slice(0, 3).forEach((resp) => {
    resp.split(/[\s,]+/).forEach((word) => {
      if (word.length > 3) keywords.add(word)
    })
  })

  return Array.from(keywords).slice(0, limit)
}
