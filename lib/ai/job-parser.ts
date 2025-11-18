import { createGeminiClient, GEMINI_CONFIG, MODEL_FALLBACK_CHAIN, GeminiModelType } from './config'
import { buildJobExtractionPrompt, SYSTEM_PROMPT } from './prompts'
import { JobDetails, JobDetailsSchema } from './types'

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
  const jsonMatch = response.match(/\{[\s\S]+\}/)

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
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

  // Try each model in fallback chain
  for (const modelName of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`[Job Parser] Attempting with model: ${modelName}`)

      // Criar cliente Gemini
      const genAI = createGeminiClient()
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

    } catch (error: any) {
      // If quota exceeded (429), try next model
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.warn(`[Job Parser] ⚠️  Model ${modelName} quota exceeded, trying fallback...`)
        lastError = error
        continue
      }

      // Other errors are critical - throw immediately
      console.error(`[Job Parser] ❌ Critical error with model ${modelName}:`, error.message)
      throw error
    }
  }

  // All models failed due to quota
  throw new Error(
    `All models exhausted due to quota limits. Last error: ${lastError?.message || 'Unknown'}. ` +
    `Consider upgrading to paid tier: https://ai.google.dev/pricing`
  )
}
