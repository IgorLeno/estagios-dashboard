import { createGeminiClient, GEMINI_CONFIG } from "./config"
import { buildSummaryPrompt, buildSkillsPrompt, buildProjectsPrompt, RESUME_SYSTEM_PROMPT } from "./resume-prompts"
import { getCVTemplate } from "./cv-templates"
import { PersonalizedSectionsSchema } from "./types"
import { extractJsonFromResponse } from "./job-parser"
import type { JobDetails, CVTemplate, PersonalizedSections } from "./types"

/**
 * Personalize CV summary section using LLM
 */
async function personalizeSummary(
  jobDetails: JobDetails,
  cv: CVTemplate,
  model: any
): Promise<{ summary: string; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const allSkills = cv.skills.flatMap((group) => group.items)
  const prompt = buildSummaryPrompt(jobDetails, cv.summary, allSkills)

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const jsonData = extractJsonFromResponse(text)
  const validated = PersonalizedSectionsSchema.pick({ summary: true }).parse(jsonData)

  const duration = Date.now() - startTime
  const tokenUsage = extractTokenUsage(response)

  return { summary: validated.summary, duration, tokenUsage }
}

/**
 * Personalize CV skills section using LLM
 */
async function personalizeSkills(
  jobDetails: JobDetails,
  cv: CVTemplate,
  model: any
): Promise<{ skills: PersonalizedSections["skills"]; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const prompt = buildSkillsPrompt(jobDetails, cv.skills, cv.projects)

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const jsonData = extractJsonFromResponse(text)
  const validated = PersonalizedSectionsSchema.pick({ skills: true }).parse(jsonData)

  // CRITICAL VALIDATION: Check for fabricated skills
  const originalSkills = cv.skills.flatMap((cat) => cat.items)
  const returnedSkills = validated.skills.flatMap((cat) => cat.items)

  const fabricatedSkills = returnedSkills.filter((skill) => !originalSkills.includes(skill))

  if (fabricatedSkills.length > 0) {
    console.error("[Resume Generator] ❌ FABRICATED SKILLS DETECTED:", fabricatedSkills)
    throw new Error(
      `LLM fabricated skills not in original CV: ${fabricatedSkills.join(", ")}. ` +
        `Only these skills are allowed: ${originalSkills.join(", ")}`
    )
  }

  const duration = Date.now() - startTime
  const tokenUsage = extractTokenUsage(response)

  return { skills: validated.skills, duration, tokenUsage }
}

/**
 * Personalize CV projects section using LLM
 */
async function personalizeProjects(
  jobDetails: JobDetails,
  cv: CVTemplate,
  model: any
): Promise<{ projects: PersonalizedSections["projects"]; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const prompt = buildProjectsPrompt(jobDetails, cv.projects)

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const jsonData = extractJsonFromResponse(text)
  const validated = PersonalizedSectionsSchema.pick({ projects: true }).parse(jsonData)

  // CRITICAL VALIDATION: Check for changed project titles
  const originalTitles = cv.projects.map((p) => p.title)
  const returnedTitles = validated.projects.map((p) => p.title)

  const changedTitles = returnedTitles.filter((title) => !originalTitles.includes(title))

  if (changedTitles.length > 0) {
    console.error("[Resume Generator] ❌ PROJECT TITLES CHANGED:", changedTitles)
    throw new Error(
      `LLM changed project titles. Changed: ${changedTitles.join(", ")}. ` +
        `Required titles: ${originalTitles.join(", ")}`
    )
  }

  // Check for missing projects
  if (validated.projects.length !== cv.projects.length) {
    console.error(
      `[Resume Generator] ❌ PROJECT COUNT MISMATCH: Expected ${cv.projects.length}, got ${validated.projects.length}`
    )
    throw new Error(`LLM removed projects. Must include all ${cv.projects.length} projects.`)
  }

  const duration = Date.now() - startTime
  const tokenUsage = extractTokenUsage(response)

  return { projects: validated.projects, duration, tokenUsage }
}

/**
 * Extract token usage from Gemini response
 */
function extractTokenUsage(response: any): {
  inputTokens: number
  outputTokens: number
  totalTokens: number
} {
  try {
    const usageMetadata = response.usageMetadata || response.candidates?.[0]?.usageMetadata || null

    if (usageMetadata) {
      return {
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      }
    }
  } catch (error) {
    console.warn("[Resume Generator] Could not extract token usage:", error)
  }

  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
}

/**
 * Generate tailored resume from job details
 * Personalizes 3 sections in parallel using LLM
 */
export async function generateTailoredResume(
  jobDetails: JobDetails,
  language: "pt" | "en"
): Promise<{
  cv: CVTemplate
  duration: number
  model: string
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  personalizedSections: string[]
}> {
  const startTime = Date.now()

  console.log(`[Resume Generator] Starting personalization (${language})`)

  // Load CV template
  const baseCv = getCVTemplate(language)

  // Create Gemini model
  const genAI = createGeminiClient()
  const model = genAI.getGenerativeModel({
    model: GEMINI_CONFIG.model,
    generationConfig: {
      temperature: 0.3, // Slightly higher for creativity
      maxOutputTokens: 4096,
      topP: GEMINI_CONFIG.topP,
      topK: GEMINI_CONFIG.topK,
    },
    systemInstruction: RESUME_SYSTEM_PROMPT,
  })

  // Personalize 3 sections in parallel
  const [summaryResult, skillsResult, projectsResult] = await Promise.all([
    personalizeSummary(jobDetails, baseCv, model),
    personalizeSkills(jobDetails, baseCv, model),
    personalizeProjects(jobDetails, baseCv, model),
  ])

  // Merge personalized sections into CV
  const personalizedCv: CVTemplate = {
    ...baseCv,
    summary: summaryResult.summary,
    skills: skillsResult.skills,
    projects: projectsResult.projects,
  }

  // Aggregate token usage
  const totalTokenUsage = {
    inputTokens:
      summaryResult.tokenUsage.inputTokens +
      skillsResult.tokenUsage.inputTokens +
      projectsResult.tokenUsage.inputTokens,
    outputTokens:
      summaryResult.tokenUsage.outputTokens +
      skillsResult.tokenUsage.outputTokens +
      projectsResult.tokenUsage.outputTokens,
    totalTokens:
      summaryResult.tokenUsage.totalTokens +
      skillsResult.tokenUsage.totalTokens +
      projectsResult.tokenUsage.totalTokens,
  }

  const duration = Date.now() - startTime

  console.log(`[Resume Generator] ✅ Personalization complete (${duration}ms, ${totalTokenUsage.totalTokens} tokens)`)

  return {
    cv: personalizedCv,
    duration,
    model: GEMINI_CONFIG.model,
    tokenUsage: totalTokenUsage,
    personalizedSections: ["summary", "skills", "projects"],
  }
}
