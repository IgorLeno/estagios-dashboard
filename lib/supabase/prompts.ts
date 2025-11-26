import { createClient } from "./server"
import type { PromptsConfig } from "@/lib/types"
import { DEFAULT_PROMPTS_CONFIG } from "@/lib/types"

/**
 * Get prompts configuration for current user
 * Falls back to default config if user has no custom configuration
 */
export async function getPromptsConfig(userId?: string): Promise<PromptsConfig> {
  const supabase = await createClient()

  // Try to fetch user-specific config
  if (userId) {
    const { data, error } = await supabase
      .from("prompts_config")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("[Prompts] Error fetching user config:", error)
      // Fall through to default config
    } else if (data) {
      return data as PromptsConfig
    }
  }

  // Fallback: Fetch global default config (user_id = NULL)
  const { data: defaultData, error: defaultError } = await supabase
    .from("prompts_config")
    .select("*")
    .is("user_id", null)
    .maybeSingle()

  if (defaultError) {
    console.error("[Prompts] Error fetching default config:", defaultError)
    // Return hardcoded defaults as last resort
    return {
      id: "default",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...DEFAULT_PROMPTS_CONFIG,
    }
  }

  if (defaultData) {
    return defaultData as PromptsConfig
  }

  // Last resort: Return hardcoded defaults
  return {
    id: "default",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...DEFAULT_PROMPTS_CONFIG,
  }
}

/**
 * Save or update prompts configuration for user
 * Creates new config if doesn't exist, updates if it does
 */
export async function savePromptsConfig(
  config: Omit<PromptsConfig, "id" | "created_at" | "updated_at">,
  userId?: string
): Promise<PromptsConfig> {
  const supabase = await createClient()

  // Check if user already has a config
  const { data: existingConfig } = await supabase
    .from("prompts_config")
    .select("id")
    .eq("user_id", userId || null)
    .maybeSingle()

  if (existingConfig) {
    // Update existing config
    const { data, error } = await supabase
      .from("prompts_config")
      .update({
        modelo_gemini: config.modelo_gemini,
        temperatura: config.temperatura,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        top_k: config.top_k,
        dossie_prompt: config.dossie_prompt,
        analise_prompt: config.analise_prompt,
        curriculo_prompt: config.curriculo_prompt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingConfig.id)
      .select()
      .single()

    if (error) {
      console.error("[Prompts] Error updating config:", error)
      throw new Error(`Failed to update prompts config: ${error.message}`)
    }

    return data as PromptsConfig
  } else {
    // Insert new config
    const { data, error } = await supabase
      .from("prompts_config")
      .insert({
        user_id: userId || null,
        modelo_gemini: config.modelo_gemini,
        temperatura: config.temperatura,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        top_k: config.top_k,
        dossie_prompt: config.dossie_prompt,
        analise_prompt: config.analise_prompt,
        curriculo_prompt: config.curriculo_prompt,
      })
      .select()
      .single()

    if (error) {
      console.error("[Prompts] Error inserting config:", error)
      throw new Error(`Failed to save prompts config: ${error.message}`)
    }

    return data as PromptsConfig
  }
}

/**
 * Reset prompts configuration to defaults for user
 * Deletes user's custom config, forcing fallback to global defaults
 */
export async function resetPromptsConfig(userId?: string): Promise<void> {
  if (!userId) {
    console.warn("[Prompts] Cannot reset global default config")
    return
  }

  const supabase = await createClient()

  const { error } = await supabase.from("prompts_config").delete().eq("user_id", userId)

  if (error) {
    console.error("[Prompts] Error resetting config:", error)
    throw new Error(`Failed to reset prompts config: ${error.message}`)
  }

  console.log(`[Prompts] ✅ Config reset for user ${userId}`)
}

/**
 * Get default prompts configuration (for reference/UI)
 * Returns the hardcoded defaults without database access
 */
export function getDefaultPromptsConfig(): Omit<PromptsConfig, "id" | "user_id" | "created_at" | "updated_at"> {
  return { ...DEFAULT_PROMPTS_CONFIG }
}
