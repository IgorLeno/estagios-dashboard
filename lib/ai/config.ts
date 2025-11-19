import { GoogleGenerativeAI } from "@google/generative-ai"

/**
 * Model fallback chain for resilience
 * Using gemini-1.5-flash (stable) as primary - NOT experimental versions
 * Free tier quotas: 15 RPM, 1.5K RPD, 1M TPM
 *
 * Background: gemini-2.0-flash-exp quota reduced to ZERO in free tier (Nov 2025)
 * See: https://discuss.ai.google.dev/t/has-gemini-api-completely-stopped-its-free-tier/76543
 */
export const MODEL_FALLBACK_CHAIN = [
  "gemini-1.5-flash", // Primary: Most reliable for free tier
  "gemini-2.0-flash-001", // Secondary: Stable alternative
  "gemini-2.5-pro", // Tertiary: Highest quality (slower, may require billing)
] as const

export type GeminiModelType = (typeof MODEL_FALLBACK_CHAIN)[number]

/**
 * Configuração do modelo Gemini
 */
export const GEMINI_CONFIG = {
  model: "gemini-1.5-flash", // Using stable model, not experimental
  temperature: 0.1, // Baixa para consistência
  maxOutputTokens: 8192,
  topP: 0.95,
  topK: 40,
} as const

/**
 * Configuração de timeout para operações AI
 * Timeout padrão de 30 segundos para parsing de vagas
 */
export const AI_TIMEOUT_CONFIG = {
  /**
   * Timeout em milissegundos para operações de parsing
   * Pode ser sobrescrito via variável de ambiente AI_PARSING_TIMEOUT_MS
   */
  parsingTimeoutMs: Number.parseInt(process.env.AI_PARSING_TIMEOUT_MS || "30000", 10),
} as const

/**
 * Helper para validar e obter API key
 * Centraliza validação de API key para evitar duplicação
 * @throws Error se GOOGLE_API_KEY não estiver configurada ou for inválida
 * @returns API key validada
 */
function getValidatedApiKey(): string {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "GOOGLE_API_KEY not found in environment. " + "Get your key at: https://aistudio.google.com/app/apikey"
    )
  }

  return apiKey
}

/**
 * Cria cliente Gemini configurado
 * @throws Error se GOOGLE_API_KEY não estiver configurada
 */
export function createGeminiClient(): GoogleGenerativeAI {
  const apiKey = getValidatedApiKey()
  return new GoogleGenerativeAI(apiKey)
}

/**
 * Valida que a configuração AI está correta
 * @throws Error se configuração inválida
 */
export function validateAIConfig(): boolean {
  getValidatedApiKey()
  return true
}
