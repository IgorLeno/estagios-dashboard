import {
  createGeminiClient,
  GEMINI_CONFIG,
  MODEL_FALLBACK_CHAIN,
  GeminiModelType,
  createAnalysisModel,
  ANALYSIS_MODEL_CONFIG,
} from "./config"
import { buildJobExtractionPrompt, SYSTEM_PROMPT } from "./prompts"
import { JobDetails, JobDetailsSchema, JobAnalysisResponseSchema } from "./types"
import { isQuotaError } from "./errors"
import { buildJobAnalysisPrompt, ANALYSIS_SYSTEM_PROMPT } from "./analysis-prompts"
import { USER_PROFILE } from "./user-profile"
import { validateAnalysisMarkdown } from "./validation"

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

      // Try salvage on parse error too
      const salvaged = salvagePartialJson(jsonStr)
      if (salvaged) {
        return salvaged
      }

      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new Error(`Invalid JSON in code fence: ${errorMsg}`)
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
      const parseError = error instanceof Error ? error.message : String(error)
      throw new Error(`Invalid JSON format: ${parseError}`)
    }
  }

  throw new Error("No valid JSON found in LLM response")
}

/**
 * Extrai informações de uso de tokens da resposta do Gemini
 */
function extractTokenUsage(response: any): {
  inputTokens: number
  outputTokens: number
  totalTokens: number
} {
  try {
    // A resposta do Gemini pode ter usageMetadata em diferentes lugares
    const usageMetadata = response.usageMetadata || (response as any).candidates?.[0]?.usageMetadata || null

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
export async function parseJobWithGemini(jobDescription: string): Promise<{
  data: JobDetails
  duration: number
  model: string
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
}> {
  const startTime = Date.now()

  let lastError: Error | null = null

  // Criar cliente Gemini uma única vez (fora do loop)
  const genAI = createGeminiClient()

  // Try each model in fallback chain
  for (const modelName of MODEL_FALLBACK_CHAIN) {
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
 * @param timeoutMs - Timeout in milliseconds (default: 90000ms / 90 seconds)
 * @returns Structured data, analysis markdown, duration, model, and token usage
 */
export async function parseJobWithAnalysis(
  jobDescription: string,
  timeoutMs: number = 90000
): Promise<{
  data: JobDetails
  analise: string
  duration: number
  model: string
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
}> {
  const startTime = Date.now()
  const MAX_RETRIES = 2

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[Job Parser] Starting analysis with model: ${ANALYSIS_MODEL_CONFIG.model} (attempt ${attempt}/${MAX_RETRIES})`
      )

      // Create analysis model
      const model = createAnalysisModel()

      // Build prompt with user profile
      const prompt = buildJobAnalysisPrompt(jobDescription, USER_PROFILE)

      // Call Gemini with timeout protection
      const result = await Promise.race([model.generateContent(prompt), createTimeoutPromise(timeoutMs)])

      const response = result.response
      const text = response.text()

      // Log response size for debugging
      console.log(`[Job Parser] Gemini response: ${text.length} characters`)

      // Extract token usage
      const tokenUsage = extractTokenUsage(response)

      // Extract JSON (includes truncation detection)
      const jsonData = extractJsonFromResponse(text)

      // Validate with Zod
      const validated = JobAnalysisResponseSchema.parse(jsonData)

      // Validate analysis markdown
      if (!validateAnalysisMarkdown(validated.analise_markdown)) {
        console.warn("[Job Parser] Analysis validation failed, using fallback")
        // Fallback to basic observations if analysis is invalid
        const fallbackAnalise = buildObservacoes(validated.structured_data)
        validated.analise_markdown = fallbackAnalise
      }

      const duration = Date.now() - startTime

      console.log(
        `[Job Parser] ✅ Analysis complete: ${ANALYSIS_MODEL_CONFIG.model} (${duration}ms, ${tokenUsage.totalTokens} tokens)`
      )

      return {
        data: validated.structured_data,
        analise: validated.analise_markdown,
        duration,
        model: ANALYSIS_MODEL_CONFIG.model,
        tokenUsage,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check if this is a truncation error - retry once
      const isTruncationError =
        errorMessage.includes("truncated") || errorMessage.includes("incomplete") || errorMessage.includes("timeout")

      if (isTruncationError && attempt < MAX_RETRIES) {
        console.warn(`[Job Parser] ⚠️  Truncation/timeout error on attempt ${attempt}, retrying...`)
        continue
      }

      console.error(`[Job Parser] ❌ Analysis error (attempt ${attempt}):`, errorMessage)
      throw error
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error("Unexpected error: retry loop completed without result")
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
