import type { JobDetails } from "./types"
import type { CVTemplate } from "./types"

/**
 * System instruction for resume personalization
 */
export const RESUME_SYSTEM_PROMPT = `You are a professional resume writer specializing in ATS (Applicant Tracking System) optimization.

Your role is to personalize resume sections to match job requirements while maintaining complete honesty and accuracy.

CRITICAL RULES:
1. NEVER fabricate skills, experience, or achievements
2. ONLY add skills if the candidate's projects/experience genuinely demonstrate them
3. Reorder and emphasize existing content, don't invent new content
4. Use job keywords naturally - no keyword stuffing
5. Maintain professional, concise language
6. Return ONLY valid JSON, no markdown code fences

Your output will be validated against strict schemas. Follow the format exactly.`

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

  return `Reorder and enhance the skills list to match this job opportunity.

JOB REQUIRED SKILLS:
${requisitosObrigatorios}

JOB DESIRED SKILLS:
${requisitosDesejaveis}

USER'S CURRENT SKILLS:
${JSON.stringify(currentSkills, null, 2)}

USER'S PROJECTS (as evidence):
${projects.map((p) => `- ${p.title}: ${p.description.join("; ")}`).join("\n")}

INSTRUCTIONS:
- If job skills are "Not specified", keep original skill order
- Otherwise, reorder skills within each category by relevance to job
- Add job-required skills ONLY if projects demonstrate them
- Use project descriptions as evidence for skill claims
- Keep all original skills (don't remove any)
- Maintain category structure (Programming Languages, Frameworks, Tools, etc.)
- If adding a skill, ensure there's clear evidence in projects

Return JSON format:
{
  "skills": [
    {
      "category": "Programming Languages",
      "items": ["Python", "JavaScript", ...]
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

  return `Rewrite project descriptions to emphasize relevance to this job opportunity.

JOB DETAILS:
Position: ${cargo}
Responsibilities: ${responsabilidades}
Required Skills: ${requisitosObrigatorios}

CURRENT PROJECTS:
${JSON.stringify(currentProjects, null, 2)}

JOB KEYWORDS TO EMPHASIZE:
${jobKeywords.length > 0 ? jobKeywords.join(", ") : "Use general professional keywords"}

INSTRUCTIONS:
- Keep ALL projects (don't remove any)
- Keep project titles unchanged
- If job details are incomplete ("Not specified"), write general professional descriptions
- Otherwise, rewrite descriptions (2-3 bullet points each) to highlight job-relevant aspects
- Use available job keywords naturally in descriptions
- Emphasize technologies/methodologies matching available job requirements
- Focus on outcomes and impact
- Stay truthful - only reframe existing work, don't invent new projects

Return JSON format:
{
  "projects": [
    {
      "title": "Original Project Title",
      "description": [
        "Rewritten bullet point 1",
        "Rewritten bullet point 2",
        "Rewritten bullet point 3"
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
