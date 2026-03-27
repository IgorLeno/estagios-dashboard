import {
  createGeminiClient,
  GEMINI_CONFIG,
  MODEL_FALLBACK_CHAIN,
  loadUserAIConfig,
  getGenerationConfig,
} from "./config"
import { buildJobExtractionPrompt, SYSTEM_PROMPT } from "./prompts"
import { JobDetails, JobDetailsSchema, JobAnalysisResponseSchema } from "./types"
import { isQuotaError } from "./errors"
import { buildJobAnalysisPrompt, ANALYSIS_SYSTEM_PROMPT } from "./analysis-prompts"
import { validateAnalysisMarkdown } from "./validation"
import { getCandidateProfile } from "@/lib/supabase/candidate-profile"
import { buildDossieFromProfile } from "./dossie-builder"
import { buildModelAttemptList, isRetryableModelError, isValidModelId } from "./models"

export const JOB_PARSER_SYSTEM_PROMPT = SYSTEM_PROMPT

/**
 * Repairs common JSON syntax errors from LLM responses
 * Specifically handles unescaped newlines and quotes in string values
 */
function repairJsonString(jsonStr: string): string {
  // Check if already valid before attempting repair
  try {
    JSON.parse(jsonStr)
    // Already valid - no repair needed
    return jsonStr
  } catch (parseError) {
    // Invalid - needs repair
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError)
    console.log(`[Job Parser] JSON parse error: ${errorMsg}`)
    console.log("[Job Parser] Attempting to repair JSON syntax errors...")
  }

  // Simplified approach: Use regex to find and fix string values
  // This handles the most common LLM errors: unescaped newlines in JSON strings
  let repaired = jsonStr

  // Replace literal newlines within string values with escaped newlines
  // Pattern: Matches content between quotes that contains newlines
  repaired = repaired.replace(/"([^"\\]*(?:\\.[^"\\]*)*?)"/gs, (match, content) => {
    // Escape any literal newlines, carriage returns, tabs
    const escaped = content.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")

    return `"${escaped}"`
  })

  console.log("[Job Parser] JSON repair completed")
  return repaired
}

/**
 * Detects if JSON appears to be truncated
 * Checks for incomplete structures that indicate early termination
 */
function isJsonTruncated(jsonStr: string): boolean {
  const trimmed = jsonStr.trim()

  // Missing closing braces entirely
  if (!trimmed.endsWith("}") && !trimmed.endsWith("]")) {
    return true
  }

  // Count braces to detect imbalance
  let braceCount = 0
  let bracketCount = 0
  let inString = false
  let escapeNext = false

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === "\\") {
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === "{") braceCount++
      if (char === "}") braceCount--
      if (char === "[") bracketCount++
      if (char === "]") bracketCount--
    }
  }

  return braceCount !== 0 || bracketCount !== 0
}

/**
 * Attempts to salvage partial JSON by finding the last complete structure
 */
function salvagePartialJson(jsonStr: string): unknown | null {
  console.warn("[Job Parser] ⚠️  Attempting to salvage truncated JSON")

  // Try to find the last complete object or array
  let braceCount = 0
  let lastCompleteIndex = -1
  let inString = false
  let escapeNext = false

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === "\\") {
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === "{") braceCount++
      if (char === "}") {
        braceCount--
        if (braceCount === 0) {
          lastCompleteIndex = i
        }
      }
    }
  }

  if (lastCompleteIndex > 0) {
    const salvaged = jsonStr.substring(0, lastCompleteIndex + 1)
    try {
      const result = JSON.parse(salvaged)
      console.log("[Job Parser] ✅ Successfully salvaged partial JSON")
      return result
    } catch {
      // Couldn't salvage
    }
  }

  return null
}

/**
 * Extrai JSON de resposta do LLM
 * Suporta JSON em code fence ou JSON direto
 * Includes truncation detection and salvage attempts
 */
export function extractJsonFromResponse(response: string): unknown {
  // Log response size for debugging
  console.log(`[Job Parser] Response length: ${response.length} characters`)

  // Tentar extrair de code fence primeiro
  const codeFenceMatch = response.match(/```json\s*\n([\s\S]+?)\n```/)

  if (codeFenceMatch) {
    const jsonStr = codeFenceMatch[1]

    // Check for truncation
    if (isJsonTruncated(jsonStr)) {
      console.error("[Job Parser] ❌ JSON in code fence appears truncated")
      console.error("Last 200 chars:", jsonStr.substring(jsonStr.length - 200))

      // Try to salvage
      const salvaged = salvagePartialJson(jsonStr)
      if (salvaged) {
        return salvaged
      }

      throw new Error("JSON truncated (incomplete structure from LLM). Output may have exceeded token limit.")
    }

    try {
      return JSON.parse(jsonStr)
    } catch (error) {
      // Log the problematic JSON for debugging
      const snippet = jsonStr.substring(0, 500)
      console.error("[Job Parser] Failed to parse JSON from code fence:")
      console.error("First 500 chars:", snippet)
      console.error("Last 200 chars:", jsonStr.substring(jsonStr.length - 200))

      // Try to repair JSON syntax errors (unescaped newlines, quotes, etc.)
      try {
        const repaired = repairJsonString(jsonStr)
        const result = JSON.parse(repaired)
        console.log("[Job Parser] ✅ Successfully repaired and parsed JSON")
        return result
      } catch {
        console.error("[Job Parser] Repair also failed")

        // Try salvage as last resort
        const salvaged = salvagePartialJson(jsonStr)
        if (salvaged) {
          return salvaged
        }

        const errorMsg = error instanceof Error ? error.message : String(error)
        throw new Error(`Invalid JSON in code fence: ${errorMsg}`)
      }
    }
  }

  // Tentar extrair JSON direto
  // Parser-aware extraction that tracks string boundaries
  const jsonStart = response.indexOf("{")
  if (jsonStart !== -1) {
    let braceCount = 0
    let jsonEnd = jsonStart
    let inString = false
    let escapeNext = false
    let foundComplete = false

    for (let i = jsonStart; i < response.length; i++) {
      const char = response[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === "\\") {
        escapeNext = true
        continue
      }

      if (char === '"') {
        inString = !inString
        continue
      }

      // Only count braces when not inside a string
      if (!inString) {
        if (char === "{") braceCount++
        if (char === "}") braceCount--
        if (braceCount === 0) {
          jsonEnd = i + 1
          foundComplete = true
          break
        }
      }
    }

    // If we didn't find a complete JSON, it's truncated
    if (!foundComplete && braceCount > 0) {
      console.error("[Job Parser] ❌ JSON appears truncated (unclosed braces)")
      console.error("Last 200 chars:", response.substring(response.length - 200))

      const salvaged = salvagePartialJson(response.substring(jsonStart))
      if (salvaged) {
        return salvaged
      }

      throw new Error("JSON truncated (incomplete structure from LLM). Output may have exceeded token limit.")
    }

    const jsonText = response.slice(jsonStart, jsonEnd)
    try {
      return JSON.parse(jsonText)
    } catch (error) {
      // Try to repair JSON syntax errors
      try {
        const repaired = repairJsonString(jsonText)
        const result = JSON.parse(repaired)
        console.log("[Job Parser] ✅ Successfully repaired and parsed direct JSON")
        return result
      } catch {
        const parseError = error instanceof Error ? error.message : String(error)
        throw new Error(`Invalid JSON format: ${parseError}`)
      }
    }
  }

  throw new Error("No valid JSON found in LLM response")
}

/**
 * Extrai informações de uso de tokens da resposta do Gemini
 */
type GeminiLikeUsageMetadata = {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
}

type GeminiLikeResponse = {
  usageMetadata?: GeminiLikeUsageMetadata
  candidates?: Array<{
    usageMetadata?: GeminiLikeUsageMetadata
  }>
}

function extractTokenUsage(response: GeminiLikeResponse): {
  inputTokens: number
  outputTokens: number
  totalTokens: number
} {
  try {
    // A resposta do Gemini pode ter usageMetadata em diferentes lugares
    const usageMetadata = response.usageMetadata || response.candidates?.[0]?.usageMetadata || null

    if (usageMetadata) {
      const promptTokenCount = usageMetadata.promptTokenCount || 0
      const candidatesTokenCount = usageMetadata.candidatesTokenCount || 0
      const totalTokenCount = usageMetadata.totalTokenCount || promptTokenCount + candidatesTokenCount

      return {
        inputTokens: promptTokenCount,
        outputTokens: candidatesTokenCount,
        totalTokens: totalTokenCount,
      }
    }
  } catch (error) {
    console.warn("[Job Parser] Could not extract token usage:", error)
  }

  // Fallback: estimativa baseada em caracteres (aproximação)
  // Gemini usa ~4 caracteres por token em média
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  }
}

/**
 * Parseia descrição de vaga usando Gemini com fallback automático
 * Tenta modelos em ordem até conseguir sucesso ou esgotar opções
 */
export async function parseJobWithGemini(
  jobDescription: string,
  model?: string,
  userId?: string
): Promise<{
  data: JobDetails
  duration: number
  model: string
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
}> {
  const startTime = Date.now()

  let lastError: Error | null = null

  // Criar cliente Gemini uma única vez (fora do loop)
  const genAI = createGeminiClient(userId)

  const modelsToTry = buildModelAttemptList([model, ...MODEL_FALLBACK_CHAIN])

  // Try each model in fallback chain
  for (const modelName of modelsToTry) {
    try {
      console.log(`[Job Parser] Attempting with model: ${modelName}`)

      // Obter modelo específico usando o cliente reutilizado
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: GEMINI_CONFIG.temperature,
          maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
          topP: GEMINI_CONFIG.topP,
          topK: GEMINI_CONFIG.topK,
        },
        systemInstruction: SYSTEM_PROMPT,
      })

      // Montar prompt
      const prompt = buildJobExtractionPrompt(jobDescription)

      // Chamar Gemini
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      // Extrair token usage
      const tokenUsage = extractTokenUsage(response)

      // Extrair JSON
      const jsonData = extractJsonFromResponse(text)

      // Validar com Zod
      const validated = JobDetailsSchema.parse(jsonData)

      const duration = Date.now() - startTime

      console.log(`[Job Parser] ✅ Success with model: ${modelName} (${duration}ms, ${tokenUsage.totalTokens} tokens)`)

      return { data: validated, duration, model: modelName, tokenUsage }
    } catch (error: unknown) {
      // Check if this is a quota error
      if (isQuotaError(error)) {
        console.warn(`[Job Parser] ⚠️  Model ${modelName} quota exceeded, trying fallback...`)
        lastError = error instanceof Error ? error : new Error(String(error))
        continue
      }

      // Other errors are critical - throw immediately
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[Job Parser] ❌ Critical error with model ${modelName}:`, errorMessage)
      throw error
    }
  }

  // All models failed due to quota
  throw new Error(
    `All models exhausted due to quota limits. Last error: ${lastError?.message || "Unknown"}. ` +
      `Consider upgrading to paid tier: https://ai.google.dev/pricing`
  )
}

/**
 * Helper to create a promise that rejects after a timeout
 */
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Gemini API timeout after ${timeoutMs}ms`)), timeoutMs)
  })
}

/**
 * Parses job description and generates comprehensive analysis using Gemini
 * Includes timeout protection and retry logic for truncation errors
 * @param jobDescription - Job description text
 * @param userId - Optional user ID to load personalized config
 * @param timeoutMs - Timeout in milliseconds (default: 90000ms / 90 seconds)
 * @returns Structured data, analysis markdown, duration, model, and token usage
 */
export async function parseJobWithAnalysis(
  jobDescription: string,
  userId?: string,
  timeoutMs: number = 90000,
  model?: string
): Promise<{
  data: JobDetails
  analise: string
  duration: number
  model: string
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
}> {
  const startTime = Date.now()
  const MAX_RETRIES = 2

  const config = await loadUserAIConfig(userId)
  const requestedModel = model && isValidModelId(model) ? model : undefined
  const configuredModel = isValidModelId(config.modelo_gemini) ? config.modelo_gemini : undefined
  const modelsToTry = buildModelAttemptList([requestedModel, configuredModel, ...MODEL_FALLBACK_CHAIN])
  const generationConfig = getGenerationConfig(config)
  const genAI = createGeminiClient(userId)
  const candidateProfile = await getCandidateProfile(userId)
  const dynamicDossie = buildDossieFromProfile(candidateProfile)
  const isProfileEmpty = candidateProfile.id === "empty" || !candidateProfile.nome
  const dossie = isProfileEmpty && config.dossie_prompt ? config.dossie_prompt : dynamicDossie
  const prompt = buildJobAnalysisPrompt(jobDescription, dossie)
  let lastError: Error | null = null

  console.log(`[Job Parser] Loaded AI config for user: ${userId || "global"}`)

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Job Parser] Starting analysis with model: ${modelName} (attempt ${attempt}/${MAX_RETRIES})`)

        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig,
          systemInstruction: ANALYSIS_SYSTEM_PROMPT,
        })

        const result = await Promise.race([model.generateContent(prompt), createTimeoutPromise(timeoutMs)])
        const response = result.response
        const text = response.text()

        console.log(`[Job Parser] LLM response: ${text.length} characters`)

        const tokenUsage = extractTokenUsage(response)
        const jsonData = extractJsonFromResponse(text)
        const validated = JobAnalysisResponseSchema.parse(jsonData)

        if (!validateAnalysisMarkdown(validated.analise_markdown)) {
          console.warn("[Job Parser] Analysis validation failed, using fallback")
          validated.analise_markdown = buildObservacoes(validated.structured_data)
        }

        const duration = Date.now() - startTime

        console.log(`[Job Parser] ✅ Analysis complete: ${modelName} (${duration}ms, ${tokenUsage.totalTokens} tokens)`)

        return {
          data: validated.structured_data,
          analise: validated.analise_markdown,
          duration,
          model: modelName,
          tokenUsage,
        }
      } catch (error: unknown) {
        const normalizedError = error instanceof Error ? error : new Error(String(error))
        const retryable = isRetryableModelError(normalizedError) || isQuotaError(normalizedError)
        const hasFallbackModel = modelName !== modelsToTry[modelsToTry.length - 1]

        lastError = normalizedError

        if (retryable && attempt < MAX_RETRIES) {
          console.warn(
            `[Job Parser] ⚠️  Model ${modelName} failed on attempt ${attempt}, retrying same model: ${normalizedError.message}`
          )
          continue
        }

        if (retryable && hasFallbackModel) {
          console.warn(
            `[Job Parser] ⚠️  Model ${modelName} exhausted retries, falling back: ${normalizedError.message}`
          )
          break
        }

        console.error(
          `[Job Parser] ❌ Analysis error with model ${modelName} (attempt ${attempt}):`,
          normalizedError.message
        )
        throw normalizedError
      }
    }
  }

  throw lastError ?? new Error("Analysis failed for all candidate models")
}

/**
 * Helper: builds fallback observations from structured data
 */
function buildObservacoes(data: JobDetails): string {
  const sections: string[] = []

  if (data.requisitos_obrigatorios.length > 0) {
    sections.push("**Requisitos Obrigatórios:**\n" + data.requisitos_obrigatorios.map((r) => `- ${r}`).join("\n"))
  }

  if (data.requisitos_desejaveis.length > 0) {
    sections.push("**Requisitos Desejáveis:**\n" + data.requisitos_desejaveis.map((r) => `- ${r}`).join("\n"))
  }

  if (data.responsabilidades.length > 0) {
    sections.push("**Responsabilidades:**\n" + data.responsabilidades.map((r) => `- ${r}`).join("\n"))
  }

  if (data.beneficios.length > 0) {
    sections.push("**Benefícios:**\n" + data.beneficios.map((r) => `- ${r}`).join("\n"))
  }

  return sections.join("\n\n")
}
