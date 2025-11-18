import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Model fallback chain for resilience
 * Using gemini-1.5-flash (stable) as primary - NOT experimental versions
 * Free tier quotas: 15 RPM, 1.5K RPD, 1M TPM
 *
 * Background: gemini-2.0-flash-exp quota reduced to ZERO in free tier (Nov 2025)
 * See: https://discuss.ai.google.dev/t/has-gemini-api-completely-stopped-its-free-tier/76543
 */
export const MODEL_FALLBACK_CHAIN = [
  'gemini-1.5-flash',      // Primary: Most reliable for free tier
  'gemini-2.0-flash-001',  // Secondary: Stable alternative
  'gemini-2.5-pro',        // Tertiary: Highest quality (slower, may require billing)
] as const

export type GeminiModelType = typeof MODEL_FALLBACK_CHAIN[number]

/**
 * Configuração do modelo Gemini
 */
export const GEMINI_CONFIG = {
  model: 'gemini-1.5-flash', // Using stable model, not experimental
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

  // Validate key format without exposing it
  if (apiKey.length < 20) {
    throw new Error('GOOGLE_API_KEY appears invalid (too short)')
  }

  return new GoogleGenerativeAI(apiKey)
}

/**
 * Valida que a configuração AI está correta
 * @throws Error se configuração inválida
 */
export function validateAIConfig(): boolean {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error(
      'GOOGLE_API_KEY not found. Configure in .env.local\n' +
      'Get your key at: https://aistudio.google.com/app/apikey'
    )
  }

  // Validate key format without exposing it
  if (apiKey.length < 20) {
    throw new Error('GOOGLE_API_KEY appears invalid (too short)')
  }

  return true
}
