import { createGeminiClient, GEMINI_CONFIG, MODEL_FALLBACK_CHAIN, GeminiModelType } from './config'
import { buildJobExtractionPrompt, SYSTEM_PROMPT } from './prompts'
import { JobDetails, JobDetailsSchema } from './types'
import { isQuotaError } from './errors'

/**
 * Extrai JSON de resposta do LLM
 * Suporta JSON em code fence ou JSON direto
 */
export function extractJsonFromResponse(response: string): unknown {
  // Tentar extrair de code fence primeiro
  const codeFenceMatch = response.match(/```json\s*\n([\s\S]+?)\n```/)

  if (codeFenceMatch) {
    try {
      return JSON.parse(codeFenceMatch[1])
    } catch (error) {
      throw new Error('Invalid JSON in code fence')
    }
  }

  // Tentar extrair JSON direto
  // Parser-aware extraction that tracks string boundaries
  const jsonStart = response.indexOf('{')
  if (jsonStart !== -1) {
    let braceCount = 0
    let jsonEnd = jsonStart
    let inString = false
    let escapeNext = false
    
    for (let i = jsonStart; i < response.length; i++) {
      const char = response[i]
      
      if (escapeNext) {
        escapeNext = false
        continue
      }
      
      if (char === '\\') {
        escapeNext = true
        continue
      }
      
      if (char === '"') {
        inString = !inString
        continue
      }
      
      // Only count braces when not inside a string
      if (!inString) {
        if (char === '{') braceCount++
        if (char === '}') braceCount--
        if (braceCount === 0) {
          jsonEnd = i + 1
          break
        }
      }
    }
    
    const jsonText = response.slice(jsonStart, jsonEnd)
    try {
      return JSON.parse(jsonText)
    } catch (error) {
      const parseError = error instanceof Error ? error.message : String(error)
      throw new Error(`Invalid JSON format: ${parseError}`)
    }
  }

  throw new Error('No valid JSON found in LLM response')
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
    const usageMetadata =
      response.usageMetadata ||
      (response as any).candidates?.[0]?.usageMetadata ||
      null

    if (usageMetadata) {
      const promptTokenCount = usageMetadata.promptTokenCount || 0
      const candidatesTokenCount = usageMetadata.candidatesTokenCount || 0
      const totalTokenCount =
        usageMetadata.totalTokenCount ||
        promptTokenCount + candidatesTokenCount

      return {
        inputTokens: promptTokenCount,
        outputTokens: candidatesTokenCount,
        totalTokens: totalTokenCount,
      }
    }
  } catch (error) {
    console.warn('[Job Parser] Could not extract token usage:', error)
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
  jobDescription: string
): Promise<{
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

      console.log(
        `[Job Parser] ✅ Success with model: ${modelName} (${duration}ms, ${tokenUsage.totalTokens} tokens)`
      )

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
    `All models exhausted due to quota limits. Last error: ${lastError?.message || 'Unknown'}. ` +
    `Consider upgrading to paid tier: https://ai.google.dev/pricing`
  )
}
