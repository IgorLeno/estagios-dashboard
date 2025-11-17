import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Configuração do modelo Gemini
 */
export const GEMINI_CONFIG = {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.1, // Baixa para consistência
  maxOutputTokens: 8192,
  topP: 0.95,
  topK: 40,
} as const

/**
 * Cria cliente Gemini configurado
 * @throws Error se GOOGLE_API_KEY não estiver configurada
 */
export function createGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error(
      'GOOGLE_API_KEY not found in environment. ' +
      'Get your key at: https://aistudio.google.com/app/apikey'
    )
  }

  return new GoogleGenerativeAI(apiKey)
}

/**
 * Valida que a configuração AI está correta
 * @throws Error se configuração inválida
 */
export function validateAIConfig(): boolean {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error(
      'GOOGLE_API_KEY not found. Configure in .env.local\n' +
      'Get your key at: https://aistudio.google.com/app/apikey'
    )
  }
  return true
}
