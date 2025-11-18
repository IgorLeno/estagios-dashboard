import { createGeminiClient, GEMINI_CONFIG } from './config'
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
 * Parseia descrição de vaga usando Gemini
 */
export async function parseJobWithGemini(
  jobDescription: string
): Promise<{ data: JobDetails; duration: number }> {
  const startTime = Date.now()

  // Criar cliente Gemini
  const genAI = createGeminiClient()
  const model = genAI.getGenerativeModel({
    model: GEMINI_CONFIG.model,
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

  return { data: validated, duration }
}
