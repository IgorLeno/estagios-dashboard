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
 * Create a Gemini client configured with the environment API key.
 *
 * @param modelOverride - Optional model identifier to select a specific Gemini model (accepted but not currently used)
 * @returns A GoogleGenerativeAI client initialized with the configured API key
 * @throws Error if `GOOGLE_API_KEY` is not set in the environment
 */
export function createGeminiClient(modelOverride?: GeminiModelType): GoogleGenerativeAI {
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
 * Ensures the required AI configuration is present.
 *
 * @returns `true` if the AI configuration is valid.
 * @throws Error If `GOOGLE_API_KEY` is not set; the error message advises adding it (e.g., in `.env.local`) and includes a URL to obtain a key.
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