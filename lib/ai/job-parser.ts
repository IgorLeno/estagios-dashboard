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
  // Try to find JSON object boundaries more carefully
  const jsonStart = response.indexOf('{')
  if (jsonStart !== -1) {
    let braceCount = 0
    let jsonEnd = jsonStart
    for (let i = jsonStart; i < response.length; i++) {
      if (response[i] === '{') braceCount++
      if (response[i] === '}') braceCount--
      if (braceCount === 0) {
        jsonEnd = i + 1
        break
      }
    }
    const jsonText = response.slice(jsonStart, jsonEnd)
    try {
      return JSON.parse(jsonText)
    } catch (error) {
      throw new Error('Invalid JSON format')
    }
  }

  throw new Error('No valid JSON found in LLM response')
}

/**
 * Parseia descrição de vaga usando Gemini com fallback automático
 * Tenta modelos em ordem até conseguir sucesso ou esgotar opções
 */
export async function parseJobWithGemini(
  jobDescription: string
): Promise<{ data: JobDetails; duration: number; model: string }> {
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

      // Extrair JSON
      const jsonData = extractJsonFromResponse(text)

      // Validar com Zod
      const validated = JobDetailsSchema.parse(jsonData)

      const duration = Date.now() - startTime

      console.log(`[Job Parser] ✅ Success with model: ${modelName} (${duration}ms)`)

      return { data: validated, duration, model: modelName }

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
