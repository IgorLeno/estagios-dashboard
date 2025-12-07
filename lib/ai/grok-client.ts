/**
 * Grok AI Client via OpenRouter
 * Provides a simple interface to call Grok 4.1 Fast model
 */

export interface GrokMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface GrokOptions {
  temperature?: number
  max_tokens?: number
  top_p?: number
}

export interface GrokResponse {
  content: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Validates that OpenRouter API key is configured
 * @throws Error if OPENROUTER_API_KEY not configured
 */
function getValidatedApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OPENROUTER_API_KEY not found in environment. " + "Get your key at: https://openrouter.ai/keys")
  }

  return apiKey
}

/**
 * Call Grok 4.1 Fast via OpenRouter API
 * @param messages - Array of messages (system, user, assistant)
 * @param options - Optional generation parameters
 * @returns Response content and token usage
 * @throws Error if API call fails
 */
export async function callGrok(messages: GrokMessage[], options?: GrokOptions): Promise<GrokResponse> {
  const apiKey = getValidatedApiKey()

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://estagios-dashboard.vercel.app",
      "X-Title": "Estágios Dashboard",
    },
    body: JSON.stringify({
      model: "x-ai/grok-4.1-fast",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
      top_p: options?.top_p ?? 0.9,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Grok API Error (${response.status})`

    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error?.message || errorMessage
    } catch {
      errorMessage = `${errorMessage}: ${errorText}`
    }

    throw new Error(errorMessage)
  }

  const data = await response.json()

  // OpenRouter returns OpenAI-compatible format
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("No content in Grok response")
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
export function validateGrokConfig(): boolean {
  getValidatedApiKey()
  return true
}
