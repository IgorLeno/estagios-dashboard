import { createAIModel, loadUserAIConfig, getGenerationConfig } from "./config"
import {
  buildConsistencyPrompt,
  CONSISTENCY_SYSTEM_PROMPT,
  ConsistencyAgentResultSchema,
  type CVDraft,
} from "./consistency-agent"
import { buildSummaryPrompt, buildSkillsPrompt, buildProjectsPrompt } from "./resume-prompts"
import { getCVTemplate } from "./cv-templates"
import { PersonalizedSectionsSchema } from "./types"
import { extractJsonFromResponse } from "./job-parser"
import { loadUserSkillsBank } from "./skills-bank"
import { calculateATSScore } from "./ats-scorer"
import { buildJobProfile } from "./job-profile"
import { mergeSystemInstruction } from "./user-preferences"
import type { JobProfile } from "./job-profile"
import type { JobDetails, CVTemplate, PersonalizedSections, TokenUsage } from "./types"

/**
 * Personalize CV summary section using LLM
 */
async function personalizeSummary(
  jobDetails: JobDetails,
  cv: CVTemplate,
  model: ReturnType<typeof createAIModel>,
  language: "pt" | "en",
  jobProfile: JobProfile
): Promise<{ summary: string; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const allSkills = cv.skills.flatMap((group) => group.items)
  const prompt = buildSummaryPrompt(jobDetails, cv.summary, allSkills, language, jobProfile)

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
 * Returns true if `returnedSkill` is an authorized rename of any skill in `allowedSkills`.
 * An authorized rename is a skill that:
 * 1. Shares significant word overlap with an original skill (>= 1 meaningful word in common)
 * 2. Is in the same semantic domain (operational/process skills)
 */
function isAuthorizedRename(returnedSkill: string, allowedSkills: string[]): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s*\([^)]+\)/g, "")
      .trim()

  const STOPWORDS = new Set([
    "de", "e", "a", "o", "em", "com", "para", "por",
    "da", "do", "das", "dos", "na", "no", "nas", "nos", "um", "uma",
  ])

  const OPERATIONAL_KEYWORDS = new Set([
    "acompanhamento", "administracao", "coordenacao", "gestao", "monitoramento",
    "organizacao", "rastreamento", "tracking",
    "analise", "analytics", "bases", "bi", "consistencia", "dados", "documentacao",
    "estrutura", "estruturacao", "governanca", "indicadores", "informacoes", "kpi",
    "kpis", "padronizacao", "rastreabilidade", "relatorio", "relatorios", "reporting",
    "validacao", "visualizacao",
    "controle", "elaboracao", "melhoria", "processo", "processos", "projetos",
    "qualidade", "quality",
    "analitico", "atencao", "comunicacao", "detalhes", "pensamento", "proatividade", "resolucao",
  ])

  const meaningfulWords = (s: string) =>
    normalize(s)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))

  const returnedWords = meaningfulWords(returnedSkill)
  const isOperationalSkill = (words: string[]) => words.some((word) => OPERATIONAL_KEYWORDS.has(word))

  return allowedSkills.some((allowed) => {
    const allowedWords = meaningfulWords(allowed)
    const overlap = returnedWords.filter((w) =>
      allowedWords.some((a) => a.includes(w) || w.includes(a))
    )
    return overlap.length >= 1 && isOperationalSkill(returnedWords) && isOperationalSkill(allowedWords)
  })
}

/**
 * Personalize CV skills section using LLM
 */
async function personalizeSkills(
  jobDetails: JobDetails,
  cv: CVTemplate,
  skillsBank: Array<{ skill: string; proficiency?: string; category: string }>,
  model: ReturnType<typeof createAIModel>,
  language: "pt" | "en",
  jobProfile: JobProfile,
  approvedSkills?: string[]
): Promise<{ skills: PersonalizedSections["skills"]; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const prompt = buildSkillsPrompt(jobDetails, cv.skills, skillsBank, cv.projects, language, jobProfile, approvedSkills)

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const jsonData = extractJsonFromResponse(text)
  const validated = PersonalizedSectionsSchema.pick({ skills: true }).parse(jsonData)

  // CRITICAL VALIDATION: Check for fabricated skills (CV + Skills Bank)
  const originalSkills = cv.skills.flatMap((cat) => cat.items)
  const allowedBankSkills = skillsBank.map((s) => s.skill)
  const allowedSkills = [...originalSkills, ...allowedBankSkills]

  if (approvedSkills && approvedSkills.length > 0) {
    allowedSkills.push(...approvedSkills)
  }

  const returnedSkills = validated.skills.flatMap((cat) => cat.items)

  const fabricatedSkills = returnedSkills.filter((skill) => {
    const baseSkill = skill.replace(/\s*\([^)]+\)$/, "")
    const isExactMatch = allowedSkills.some(
      (allowed) => allowed === skill || allowed === baseSkill || allowed.startsWith(baseSkill)
    )
    if (isExactMatch) return false
    if (isAuthorizedRename(skill, allowedSkills)) return false
    return true
  })

  if (fabricatedSkills.length > 0) {
    if (approvedSkills && approvedSkills.length > 0) {
      console.warn(
        "[Resume Generator] ⚠️ Skills não reconhecidas, mas approvedSkills presente — permitindo:",
        fabricatedSkills
      )
    } else {
      console.error("[Resume Generator] ❌ FABRICATED SKILLS DETECTED:", fabricatedSkills)
      console.error("[Resume Generator] Allowed skills (CV):", originalSkills)
      console.error("[Resume Generator] Allowed skills (Bank):", allowedBankSkills)
      throw new Error(
        `LLM fabricated skills not in CV or Skills Bank: ${fabricatedSkills.join(", ")}. ` +
          `Only these skills are allowed: ${allowedSkills.join(", ")}`
      )
    }
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
  model: ReturnType<typeof createAIModel>,
  language: "pt" | "en",
  jobProfile: JobProfile
): Promise<{ projects: PersonalizedSections["projects"]; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const prompt = buildProjectsPrompt(jobDetails, cv.projects, language, jobProfile)

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
 * Extract token usage from AI response
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

function validateConsistencyDraft(originalDraft: CVDraft, correctedDraft: CVDraft): void {
  const originalTitles = originalDraft.projects.map((project) => project.title)
  const correctedTitles = correctedDraft.projects.map((project) => project.title)

  if (correctedTitles.length !== originalTitles.length) {
    throw new Error(
      `Consistency agent changed project count. Expected ${originalTitles.length}, got ${correctedTitles.length}.`
    )
  }

  const changedTitles = correctedTitles.filter((title) => !originalTitles.includes(title))
  if (changedTitles.length > 0) {
    throw new Error(`Consistency agent changed project titles: ${changedTitles.join(", ")}`)
  }
}

async function runConsistencyAgent(
  draft: CVDraft,
  jobDetails: JobDetails,
  systemInstruction: string,
  generationConfig: ReturnType<typeof getGenerationConfig>
): Promise<{ draft: CVDraft; report: { issues: string[]; corrections: string[] }; tokenUsage: TokenUsage }> {
  // Consistency agent uses its own dedicated system prompt (not the user preferences)
  const consistencyModel = createAIModel(CONSISTENCY_SYSTEM_PROMPT, {
    ...generationConfig,
    temperature: 0.1,
    maxOutputTokens: 4096,
  })

  const jobDescriptionContext = JSON.stringify(jobDetails, null, 2)
  const prompt = buildConsistencyPrompt(draft, jobDescriptionContext)

  const result = await consistencyModel.generateContent(prompt)
  const response = result.response
  const text = response.text()

  if (process.env.NODE_ENV === "development") {
    console.log(`[ConsistencyAgent] Raw response length: ${text.length} chars`)
  }

  const jsonData = extractJsonFromResponse(text)

  if (process.env.NODE_ENV === "development") {
    console.log("[ConsistencyAgent] JSON extraction successful")
  }

  const parsed = ConsistencyAgentResultSchema.parse(jsonData)

  const correctedDraft: CVDraft = {
    ...parsed.draft,
    certifications: parsed.draft.certifications ?? draft.certifications,
  }

  validateConsistencyDraft(draft, correctedDraft)

  return {
    draft: correctedDraft,
    report: parsed.report,
    tokenUsage: extractTokenUsage(response),
  }
}

/**
 * Generate tailored resume from job details.
 * Personalizes 3 sections in parallel using LLM, then runs consistency agent.
 *
 * GOVERNANCE:
 * - systemInstruction is always built via mergeSystemInstruction()
 * - CORE_SYSTEM_PROMPT is always prepended and cannot be overridden by user config
 * - User's curriculo_prompt is treated as style preferences only (additive)
 */
export async function generateTailoredResume(
  jobDetails: JobDetails,
  language: "pt" | "en",
  userId?: string,
  approvedSkills?: string[]
): Promise<{
  cv: CVTemplate
  duration: number
  model: string
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  personalizedSections: string[]
  atsScore?: number
}> {
  const startTime = Date.now()

  console.log(`[Resume Generator] Starting personalization (${language})`)

  // STEP 1: Build structured job profile
  const jobProfile = buildJobProfile(jobDetails)
  if (process.env.NODE_ENV !== "production" && jobProfile.explanations) {
    console.log("[Resume Generator] 🔍 Profile explanations:", jobProfile.explanations)
  }

  // STEP 2: Load user config
  const config = await loadUserAIConfig(userId)
  console.log(`[Resume Generator] Loaded AI config for user: ${userId || "global"}`)

  // STEP 3: Build system instruction
  // GOVERNANCE: CORE_SYSTEM_PROMPT is always prepended.
  // config.curriculo_prompt is treated as additive style preferences only.
  const systemInstruction = mergeSystemInstruction(config.curriculo_prompt)
  console.log(`[Resume Generator] 🔐 System instruction built (core policy + user style preferences)`)

  // STEP 4: Load skills bank and CV template
  const skillsBank = await loadUserSkillsBank(userId)
  console.log(`[Resume Generator] Loaded ${skillsBank.length} skills from bank`)

  const baseCv = getCVTemplate(language)

  // STEP 5: Create model with merged system instruction
  const generationConfig = getGenerationConfig(config)
  const model = createAIModel(systemInstruction, generationConfig)

  // STEP 6: Personalize 3 sections in parallel
  const [summaryResult, skillsResult, projectsResult] = await Promise.all([
    personalizeSummary(jobDetails, baseCv, model, language, jobProfile),
    personalizeSkills(jobDetails, baseCv, skillsBank, model, language, jobProfile, approvedSkills),
    personalizeProjects(jobDetails, baseCv, model, language, jobProfile),
  ])

  const uncorrectedDraft: CVDraft = {
    summary: summaryResult.summary,
    skills: skillsResult.skills,
    projects: projectsResult.projects,
    certifications: baseCv.certifications,
    language,
  }

  // STEP 7: Run consistency agent
  let finalDraft = uncorrectedDraft
  let consistencyTokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

  try {
    const consistencyResult = await runConsistencyAgent(
      uncorrectedDraft,
      jobDetails,
      systemInstruction,
      generationConfig
    )

    finalDraft = consistencyResult.draft
    consistencyTokenUsage = consistencyResult.tokenUsage

    if (process.env.NODE_ENV === "development") {
      console.log("[ConsistencyAgent] Issues found:", consistencyResult.report.issues)
      console.log("[ConsistencyAgent] Corrections applied:", consistencyResult.report.corrections)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorType = errorMsg.includes("Unexpected end of JSON")
      ? "TRUNCATION"
      : errorMsg.includes("Expected") || errorMsg.includes("parse")
        ? "VALIDATION"
        : "OTHER"
    console.warn(
      `[ConsistencyAgent] ❌ Failed (${errorType}), using uncorrected draft:`,
      errorMsg
    )
  }

  // STEP 8: Merge into final CV
  const personalizedCv: CVTemplate = {
    ...baseCv,
    summary: finalDraft.summary,
    skills: finalDraft.skills,
    projects: finalDraft.projects,
    certifications: finalDraft.certifications ?? baseCv.certifications,
  }

  // STEP 9: Calculate ATS score
  const atsScore = calculateATSScore(personalizedCv, jobDetails)

  // STEP 10: Aggregate token usage
  const totalTokenUsage = {
    inputTokens:
      summaryResult.tokenUsage.inputTokens +
      skillsResult.tokenUsage.inputTokens +
      projectsResult.tokenUsage.inputTokens +
      consistencyTokenUsage.inputTokens,
    outputTokens:
      summaryResult.tokenUsage.outputTokens +
      skillsResult.tokenUsage.outputTokens +
      projectsResult.tokenUsage.outputTokens +
      consistencyTokenUsage.outputTokens,
    totalTokens:
      summaryResult.tokenUsage.totalTokens +
      skillsResult.tokenUsage.totalTokens +
      projectsResult.tokenUsage.totalTokens +
      consistencyTokenUsage.totalTokens,
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
    atsScore,
  }
}
