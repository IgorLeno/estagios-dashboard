import { getPromptsConfig } from "@/lib/supabase/prompts"
import type { PromptsConfig } from "@/lib/types"
import { callGrok, validateGrokConfig, type GrokMessage } from "./grok-client"

/**
 * AI Model Configuration for Grok 4.1 Fast via OpenRouter
 * Migrated from Gemini 2.5 Flash
 */
export const AI_MODEL_CONFIG = {
  model: "x-ai/grok-4.1-fast",
  temperature: 0.7,
  maxOutputTokens: 4096, // Grok default, can be increased if needed
  topP: 0.9,
} as const

/**
 * Configuração de timeout para operações AI
 * Timeout padrão de 60 segundos para parsing de vagas com análise completa
 */
export const AI_TIMEOUT_CONFIG = {
  /**
   * Timeout em milissegundos para operações de parsing
   * Pode ser sobrescrito via variável de ambiente AI_PARSING_TIMEOUT_MS
   * Default: 60s para acomodar análises longas (7000+ tokens)
   */
  parsingTimeoutMs: Number.parseInt(process.env.AI_PARSING_TIMEOUT_MS || "60000", 10),
} as const

/**
 * Creates an AI model wrapper with Gemini-compatible interface
 * Internally uses Grok 4.1 Fast via OpenRouter
 *
 * @param systemInstruction - System prompt for the model
 * @param generationConfig - Generation parameters (temperature, maxTokens, etc.)
 * @returns Model wrapper with generateContent() method
 */
export function createAIModel(
  systemInstruction?: string,
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
    topP?: number
  }
) {
  const config = {
    temperature: generationConfig?.temperature ?? AI_MODEL_CONFIG.temperature,
    max_tokens: generationConfig?.maxOutputTokens ?? AI_MODEL_CONFIG.maxOutputTokens,
    top_p: generationConfig?.topP ?? AI_MODEL_CONFIG.topP,
  }

  return {
    /**
     * Generate content using Grok (Gemini-compatible interface)
     * @param prompt - User prompt
     * @returns Response with Gemini-like structure
     */
    async generateContent(prompt: string) {
      const messages: GrokMessage[] = []

      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction })
      }

      messages.push({ role: "user", content: prompt })

      const grokResponse = await callGrok(messages, config)

      // Return Gemini-compatible response structure
      return {
        response: {
          text: () => grokResponse.content,
          usageMetadata: {
            promptTokenCount: grokResponse.usage.prompt_tokens,
            candidatesTokenCount: grokResponse.usage.completion_tokens,
            totalTokenCount: grokResponse.usage.total_tokens,
          },
        },
      }
    },
  }
}

/**
 * Creates AI model configured for job analysis
 * Uses Grok 4.1 Fast with analysis-optimized settings
 *
 * @param systemPrompt - Optional system prompt override
 * @throws Error if OPENROUTER_API_KEY not configured
 */
export function createAnalysisModel(systemPrompt?: string) {
  return createAIModel(systemPrompt, {
    temperature: 0.7, // Balanced for analysis
    maxOutputTokens: 4096, // Sufficient for job analysis
    topP: 0.9,
  })
}

/**
 * Valida que a configuração AI está correta
 * @throws Error se configuração inválida
 */
export function validateAIConfig(): boolean {
  validateGrokConfig()
  return true
}

/**
 * Load user-specific AI configuration from Supabase
 * Falls back to default config if user has no custom configuration
 *
 * @param userId - Optional user ID. If not provided, uses global defaults
 * @returns PromptsConfig with user's customizations or defaults
 */
export async function loadUserAIConfig(userId?: string): Promise<PromptsConfig> {
  return await getPromptsConfig(userId)
}

/**
 * Get generation config from PromptsConfig
 * Extracts only the fields needed for AI API
 *
 * NOTE: PromptsConfig still references 'modelo_gemini' for backward compatibility
 * with database schema, but this config is now used for Grok
 */
export function getGenerationConfig(config: PromptsConfig) {
  return {
    temperature: config.temperatura,
    maxOutputTokens: config.max_tokens,
    topP: config.top_p,
  }
}

// Backward compatibility exports
// These are deprecated but kept to avoid breaking existing imports
export const GEMINI_CONFIG = AI_MODEL_CONFIG
export const ANALYSIS_MODEL_CONFIG = {
  model: AI_MODEL_CONFIG.model,
  temperature: AI_MODEL_CONFIG.temperature,
  maxOutputTokens: AI_MODEL_CONFIG.maxOutputTokens,
  topP: AI_MODEL_CONFIG.topP,
}

// Fallback chain no longer needed with Grok (no quota issues)
// Kept for compatibility
export const MODEL_FALLBACK_CHAIN = ["x-ai/grok-4.1-fast"] as const
export type GeminiModelType = (typeof MODEL_FALLBACK_CHAIN)[number]

/**
 * @deprecated Use createAIModel() instead
 * Kept for backward compatibility
 * @throws Error if OPENROUTER_API_KEY not configured
 */
export function createGeminiClient() {
  // Validate API key before creating client
  validateGrokConfig()

  // Return a mock object for compatibility
  return {
    getGenerativeModel: (config: any) => {
      return createAIModel(config.systemInstruction, config.generationConfig)
    },
  }
}
