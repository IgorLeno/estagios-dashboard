/**
 * Grok AI Client via OpenRouter
 * Provides a simple interface to call Grok 4.1 Fast model
 */

import { resolveOpenRouterApiKey } from "@/lib/supabase/openrouter-keys"
import { DEFAULT_MODEL, isValidModelId } from "./models"

export interface GrokMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface GrokOptions {
  temperature?: number
  max_tokens?: number
  top_p?: number
  model?: string
}

export interface GrokResponse {
  content: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface GrokAuthContext {
  userId?: string | null
}

function extractContentString(content: unknown): string {
  if (typeof content === "string") {
    return content.trim()
  }

  if (!Array.isArray(content)) {
    return ""
  }

  return content
    .map((part) => {
      if (typeof part === "string") return part
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text
      }
      return ""
    })
    .join("")
    .trim()
}

async function getValidatedApiKey(userId?: string | null): Promise<string> {
  const { apiKey } = await resolveOpenRouterApiKey(userId)
  return apiKey
}

function buildOpenRouterHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://estagios-dashboard.vercel.app",
    "X-Title": "Estagios Dashboard",
  }
}

async function extractOpenRouterErrorMessage(response: Response, fallback: string): Promise<string> {
  const errorText = await response.text()

  try {
    const errorJson = JSON.parse(errorText)

    if (typeof errorJson?.error?.message === "string" && errorJson.error.message.trim()) {
      return errorJson.error.message.trim()
    }
  } catch {
    // Use fallback below
  }

  return errorText?.trim() ? `${fallback}: ${errorText}` : fallback
}

export async function validateUserSuppliedOpenRouterApiKey(apiKey: string): Promise<void> {
  const normalizedApiKey = apiKey.trim()

  if (!normalizedApiKey) {
    throw new Error("OpenRouter API key cannot be empty")
  }

  const response = await fetch("https://openrouter.ai/api/v1/key", {
    method: "GET",
    headers: buildOpenRouterHeaders(normalizedApiKey),
  })

  if (!response.ok) {
    const fallbackMessage =
      response.status === 401 || response.status === 403
        ? "OpenRouter rejected this API key. Verify the key and try again."
        : `Unable to validate OpenRouter API key (${response.status})`

    throw new Error(await extractOpenRouterErrorMessage(response, fallbackMessage))
  }
}

/**
 * Call Grok 4.1 Fast via OpenRouter API
 * @param messages - Array of messages (system, user, assistant)
 * @param options - Optional generation parameters
 * @returns Response content and token usage
 * @throws Error if API call fails
 */
export async function callGrok(
  messages: GrokMessage[],
  options?: GrokOptions,
  authContext?: GrokAuthContext
): Promise<GrokResponse> {
  const apiKey = await getValidatedApiKey(authContext?.userId)

  let model = options?.model ?? DEFAULT_MODEL
  if (!isValidModelId(model)) {
    console.warn(`[grok-client] Invalid model ID "${model}", falling back to ${DEFAULT_MODEL}`)
    model = DEFAULT_MODEL
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: buildOpenRouterHeaders(apiKey), /*
      "X-Title": "Estágios Dashboard",
    },
    */
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
      top_p: options?.top_p ?? 0.9,
    }),
  })

  if (!response.ok) {
    let errorMessage = `Grok API Error (${response.status}) [model: ${model}]`
    errorMessage = `${await extractOpenRouterErrorMessage(response, errorMessage)} [model: ${model}]`

    throw new Error(errorMessage)
  }

  const data = await response.json()

  // OpenRouter returns OpenAI-compatible format
  const content = extractContentString(data.choices?.[0]?.message?.content)

  if (!content) {
    throw new Error(`No content in Grok response [model: ${model}]`)
  }

  return {
    content,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    },
  }
}

/**
 * Validates that the Grok client is properly configured
 * @throws Error if configuration invalid
 */
export async function validateGrokConfig(userId?: string | null): Promise<boolean> {
  await getValidatedApiKey(userId)
  return true
}
