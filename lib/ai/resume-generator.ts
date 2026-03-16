import { createGeminiClient, loadUserAIConfig, getGenerationConfig } from "./config"
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
import { loadUserSkillsBank } from "./skills-bank" // NEW: Skills Bank
import { calculateATSScore } from "./ats-scorer" // NEW: ATS Scorer
import { detectJobContext, getContextDescription } from "./job-context-detector" // NEW: Job Context Detection
import type { JobDetails, CVTemplate, PersonalizedSections, TokenUsage } from "./types"

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
 * Returns true if `returnedSkill` is an authorized rename of any skill in `allowedSkills`.
 * An authorized rename is a skill that:
 * 1. Shares significant word overlap with an original skill (>= 1 meaningful word in common)
 * 2. Is in the same semantic domain (operational/process skills)
 *
 * This allows the LLM to follow prompt renaming instructions without being blocked
 * by the anti-fabrication validator.
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
    "de",
    "e",
    "a",
    "o",
    "em",
    "com",
    "para",
    "por",
    "da",
    "do",
    "das",
    "dos",
    "na",
    "no",
    "nas",
    "nos",
    "um",
    "uma",
  ])

  const OPERATIONAL_KEYWORDS = new Set([
    // Gestão e acompanhamento
    "acompanhamento",
    "administracao",
    "coordenacao",
    "gestao",
    "monitoramento",
    "organizacao",
    "rastreamento",
    "tracking",

    // Dados e BI
    "analise",
    "analytics",
    "bases",
    "bi",
    "consistencia",
    "dados",
    "documentacao",
    "estrutura",
    "estruturacao",
    "governanca",
    "indicadores",
    "informacoes",
    "kpi",
    "kpis",
    "padronizacao",
    "rastreabilidade",
    "relatorio",
    "relatorios",
    "reporting",
    "validacao",
    "visualizacao",

    // Processo e qualidade
    "controle",
    "elaboracao",
    "melhoria",
    "processo",
    "processos",
    "projetos",
    "qualidade",
    "quality",

    // Comportamentais
    "analitico",
    "atencao",
    "comunicacao",
    "detalhes",
    "pensamento",
    "proatividade",
    "resolucao",
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
  skillsBank: Array<{ skill: string; proficiency?: string; category: string }>, // NEW: Skills Bank
  model: any,
  language: "pt" | "en",
  jobContext: string,
  approvedSkills?: string[]
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

  const allowedBankSkills = skillsBank.map((s) => s.skill)

  // Combined allowed skills
  const allowedSkills = [...originalSkills, ...allowedBankSkills]

  // Skills aprovadas manualmente pelo usuário na aba de revisão
  // São confiáveis por definição — o usuário as curou
  if (approvedSkills && approvedSkills.length > 0) {
    allowedSkills.push(...approvedSkills)
  }

  // Get returned skills
  const returnedSkills = validated.skills.flatMap((cat) => cat.items)

  // Check for fabrication (allow authorized renames only)
  const fabricatedSkills = returnedSkills.filter((skill) => {
    const baseSkill = skill.replace(/\s*\([^)]+\)$/, "")

    // Exact match
    const isExactMatch = allowedSkills.some(
      (allowed) =>
        allowed === skill ||
        allowed === baseSkill ||
        allowed.startsWith(baseSkill)
    )
    if (isExactMatch) return false

    // Authorized rename (new: allows prompt-instructed renames)
    if (isAuthorizedRename(skill, allowedSkills)) return false

    // Neither exact match nor authorized rename -> fabricated
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
  genAI: ReturnType<typeof createGeminiClient>,
  modelName: string,
  baseGenerationConfig: ReturnType<typeof getGenerationConfig>
): Promise<{ draft: CVDraft; report: { issues: string[]; corrections: string[] }; tokenUsage: TokenUsage }> {
  const consistencyModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      ...baseGenerationConfig,
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
    systemInstruction: CONSISTENCY_SYSTEM_PROMPT,
  })

  const jobDescriptionContext = JSON.stringify(jobDetails, null, 2)
  const prompt = buildConsistencyPrompt(draft, jobDescriptionContext)

  const result = await consistencyModel.generateContent(prompt)
  const response = result.response
  const text = response.text()

  console.log(`[ConsistencyAgent] Raw response length: ${text.length} chars`)

  const jsonData = extractJsonFromResponse(text)
  console.log("[ConsistencyAgent] JSON extraction successful")

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
 * Generate tailored resume from job details
 * Personalizes 3 sections in parallel using LLM
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
  const generationConfig = getGenerationConfig(config)
  const model = genAI.getGenerativeModel({
    model: config.modelo_gemini,
    generationConfig,
    systemInstruction: config.curriculo_prompt,
  })

  // STEP 2: Personalize 3 sections in parallel (pass jobContext to all)
  const [summaryResult, skillsResult, projectsResult] = await Promise.all([
    personalizeSummary(jobDetails, baseCv, model, language, jobContext),
    personalizeSkills(jobDetails, baseCv, skillsBank, model, language, jobContext, approvedSkills), // Pass skillsBank + jobContext
    personalizeProjects(jobDetails, baseCv, model, language, jobContext),
  ])

  const uncorrectedDraft: CVDraft = {
    summary: summaryResult.summary,
    skills: skillsResult.skills,
    projects: projectsResult.projects,
    certifications: baseCv.certifications,
    language,
  }

  let finalDraft = uncorrectedDraft
  let consistencyTokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

  try {
    const consistencyResult = await runConsistencyAgent(
      uncorrectedDraft,
      jobDetails,
      genAI,
      config.modelo_gemini,
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

  // Merge personalized sections into CV
  const personalizedCv: CVTemplate = {
    ...baseCv,
    summary: finalDraft.summary,
    skills: finalDraft.skills,
    projects: finalDraft.projects,
    certifications: finalDraft.certifications ?? baseCv.certifications,
  }

  // Calculate ATS compatibility score (NEW)
  const atsScore = calculateATSScore(personalizedCv, jobDetails)

  // Aggregate token usage
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
    atsScore, // NEW
  }
}
