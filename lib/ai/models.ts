/**
 * AI Model Configuration — Single Source of Truth
 *
 * All model references across the app should import from here.
 * This prevents drift between dialog dropdowns, API calls, and validation.
 */

export const SUPPORTED_MODELS = [
  "x-ai/grok-4.1-fast",
  "openrouter/hunter-alpha",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-5.4-nano",
  "mistralai/mistral-small-2603",
] as const

export type SupportedModel = (typeof SUPPORTED_MODELS)[number]

export const DEFAULT_MODEL: SupportedModel = "x-ai/grok-4.1-fast"

/**
 * Validates a model ID for use with OpenRouter.
 *
 * Two-tier validation:
 * 1. Exact match against the known allowlist → always valid
 * 2. Format check (provider/name) → valid for user-configured models
 *
 * Rejects empty strings, single-segment IDs, and IDs with empty segments.
 */
export function isValidModelId(modelId: string): boolean {
  if (SUPPORTED_MODELS.includes(modelId as SupportedModel)) return true

  const parts = modelId.split("/")
  return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0
}
