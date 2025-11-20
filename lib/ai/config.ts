import { GoogleGenerativeAI } from "@google/generative-ai"

/**
 * Model fallback chain for resilience
 * Using gemini-2.5-flash (stable, newest flash model) as primary
 * Free tier quotas: 15 RPM, 1.5K RPD, 1M TPM
 *
 * Note: gemini-1.5-flash does NOT exist - Gemini 1.5 series only has Pro models
 * Flash models start from 2.0 series onwards
 */
export const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash", // Primary: Newest stable flash model for free tier
  "gemini-2.0-flash-001", // Secondary: Older stable flash alternative
  "gemini-2.5-pro", // Tertiary: Highest quality (slower, may require billing)
] as const

export type GeminiModelType = (typeof MODEL_FALLBACK_CHAIN)[number]

/**
 * Configuração do modelo Gemini
 */
export const GEMINI_CONFIG = {
  model: "gemini-2.5-flash", // Using newest stable flash model
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

/**
 * Configuração específica para modelo de análise
 * Note: Google Search grounding requires @google/genai SDK (not @google/generative-ai)
 * TODO: Migrate to @google/genai to enable external company research
 */
export const ANALYSIS_MODEL_CONFIG = {
  model: "gemini-2.0-flash-exp", // Experimental model for analysis
  temperature: 0.1,
  maxOutputTokens: 8192,
  topP: 0.95,
  topK: 40,
} as const

/**
 * Creates Gemini model configured for job analysis
 * @throws Error if GOOGLE_API_KEY not configured
 */
export function createAnalysisModel() {
  const genAI = createGeminiClient()

  return genAI.getGenerativeModel({
    model: ANALYSIS_MODEL_CONFIG.model,
    generationConfig: {
      temperature: ANALYSIS_MODEL_CONFIG.temperature,
      maxOutputTokens: ANALYSIS_MODEL_CONFIG.maxOutputTokens,
      topP: ANALYSIS_MODEL_CONFIG.topP,
      topK: ANALYSIS_MODEL_CONFIG.topK,
    },
    // Note: tools with googleSearch requires @google/genai SDK
    // Current implementation uses @google/generative-ai (legacy)
  })
}
