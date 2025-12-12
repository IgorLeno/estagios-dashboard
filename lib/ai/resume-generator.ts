import { createGeminiClient, loadUserAIConfig, getGenerationConfig } from "./config"
import { buildSummaryPrompt, buildSkillsPrompt, buildProjectsPrompt } from "./resume-prompts"
import { getCVTemplate } from "./cv-templates"
import { PersonalizedSectionsSchema } from "./types"
import { extractJsonFromResponse } from "./job-parser"
import { loadUserSkillsBank } from "./skills-bank" // NEW: Skills Bank
import { calculateATSScore } from "./ats-scorer" // NEW: ATS Scorer
import { detectJobContext, getContextDescription } from "./job-context-detector" // NEW: Job Context Detection
import type { JobDetails, CVTemplate, PersonalizedSections } from "./types"

/**
 * Personalize CV summary section using LLM
 */
async function personalizeSummary(
  jobDetails: JobDetails,
  cv: CVTemplate,
  model: any,
  language: "pt" | "en",
  jobContext: string
): Promise<{ summary: string; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const allSkills = cv.skills.flatMap((group) => group.items)
  const prompt = buildSummaryPrompt(jobDetails, cv.summary, allSkills, language, jobContext as any)

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
  skillsBank: Array<{ skill: string; proficiency: string; category: string }>, // NEW: Skills Bank
  model: any,
  language: "pt" | "en",
  jobContext: string
): Promise<{ skills: PersonalizedSections["skills"]; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  // Pass skillsBank to prompt builder
  const prompt = buildSkillsPrompt(jobDetails, cv.skills, skillsBank, cv.projects, language, jobContext as any)

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const jsonData = extractJsonFromResponse(text)
  const validated = PersonalizedSectionsSchema.pick({ skills: true }).parse(jsonData)

  // CRITICAL VALIDATION: Check for fabricated skills (CV + Skills Bank)
  const originalSkills = cv.skills.flatMap((cat) => cat.items)

  // Build allowed skills bank items (with proficiency indicators)
  const allowedBankSkills = skillsBank.map((s) =>
    s.proficiency === "Expert" ? s.skill : `${s.skill} (${s.proficiency})`
  )

  // Combined allowed skills
  const allowedSkills = [...originalSkills, ...allowedBankSkills]

  // Get returned skills
  const returnedSkills = validated.skills.flatMap((cat) => cat.items)

  // Check for fabrication (allow proficiency suffixes)
  const fabricatedSkills = returnedSkills.filter((skill) => {
    // Remove proficiency suffix for comparison
    const baseSkill = skill.replace(/\s*\([^)]+\)$/, "")

    // Check if skill is in allowed list (exact match or base match)
    return !allowedSkills.some(
      (allowed) =>
        allowed === skill || // Exact match
        allowed === baseSkill || // Base match
        allowed.startsWith(baseSkill) // Starts with base skill
    )
  })

  if (fabricatedSkills.length > 0) {
    console.error("[Resume Generator] ❌ FABRICATED SKILLS DETECTED:", fabricatedSkills)
    console.error("[Resume Generator] Allowed skills (CV):", originalSkills)
    console.error("[Resume Generator] Allowed skills (Bank):", allowedBankSkills)
    throw new Error(
      `LLM fabricated skills not in CV or Skills Bank: ${fabricatedSkills.join(", ")}. ` +
        `Only these skills are allowed: ${allowedSkills.join(", ")}`
    )
  }

  const duration = Date.now() - startTime
  const tokenUsage = extractTokenUsage(response)

  console.log(
    `[Resume Generator] ✅ Skills personalized (${returnedSkills.length} skills, ${skillsBank.length} from bank available)`
  )

  return { skills: validated.skills, duration, tokenUsage }
}

/**
 * Personalize CV projects section using LLM
 */
async function personalizeProjects(
  jobDetails: JobDetails,
  cv: CVTemplate,
  model: any,
  language: "pt" | "en",
  jobContext: string
): Promise<{ projects: PersonalizedSections["projects"]; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const prompt = buildProjectsPrompt(jobDetails, cv.projects, language, jobContext as any)

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
  language: "pt" | "en",
  userId?: string
): Promise<{
  cv: CVTemplate
  duration: number
  model: string
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  personalizedSections: string[]
  atsScore?: number // NEW: ATS compatibility score
}> {
  const startTime = Date.now()

  console.log(`[Resume Generator] Starting personalization (${language})`)

  // STEP 1: Detect job context FIRST (NEW)
  const jobContext = detectJobContext(jobDetails)
  const contextDesc = getContextDescription(jobContext)
  console.log(`[Resume Generator] 🎯 Detected context: ${jobContext} - ${contextDesc}`)

  // Load user AI config
  const config = await loadUserAIConfig(userId)
  console.log(`[Resume Generator] Loaded AI config for user: ${userId || "global"}`)

  // Load user skills bank (NEW)
  const skillsBank = await loadUserSkillsBank(userId)
  console.log(`[Resume Generator] Loaded ${skillsBank.length} skills from bank`)

  // Load CV template
  const baseCv = getCVTemplate(language)

  // Create Gemini model with user config
  const genAI = createGeminiClient()
  const model = genAI.getGenerativeModel({
    model: config.modelo_gemini,
    generationConfig: getGenerationConfig(config),
    systemInstruction: config.curriculo_prompt,
  })

  // STEP 2: Personalize 3 sections in parallel (pass jobContext to all)
  const [summaryResult, skillsResult, projectsResult] = await Promise.all([
    personalizeSummary(jobDetails, baseCv, model, language, jobContext),
    personalizeSkills(jobDetails, baseCv, skillsBank, model, language, jobContext), // Pass skillsBank + jobContext
    personalizeProjects(jobDetails, baseCv, model, language, jobContext),
  ])

  // Merge personalized sections into CV
  const personalizedCv: CVTemplate = {
    ...baseCv,
    summary: summaryResult.summary,
    skills: skillsResult.skills,
    projects: projectsResult.projects,
  }

  // Calculate ATS compatibility score (NEW)
  const atsScore = calculateATSScore(personalizedCv, jobDetails)

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

  console.log(
    `[Resume Generator] ✅ Personalization complete (${duration}ms, ${totalTokenUsage.totalTokens} tokens, ATS score: ${atsScore}%)`
  )

  return {
    cv: personalizedCv,
    duration,
    model: config.modelo_gemini,
    tokenUsage: totalTokenUsage,
    personalizedSections: ["summary", "skills", "projects"],
    atsScore, // NEW
  }
}
