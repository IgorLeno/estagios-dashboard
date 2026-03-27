import type { OpenRouterKeyStatus, OpenRouterKeyValidationStatus } from "@/lib/types"
import {
  decryptOpenRouterApiKey,
  encryptOpenRouterApiKey,
  isOpenRouterKeyEncryptionConfigured,
  maskOpenRouterApiKey,
} from "@/lib/security/openrouter-key-crypto"
import { createClient } from "./server"

type UserOpenRouterKeyRow = {
  user_id: string
  api_key_encrypted: string
  key_last_four: string | null
  validation_status: string | null
  last_validated_at: string | null
  last_validation_error: string | null
  created_at: string
  updated_at: string
}

type UserOpenRouterKeyMetadata = Omit<UserOpenRouterKeyRow, "api_key_encrypted">

function normalizeValidationStatus(status: string | null | undefined): OpenRouterKeyValidationStatus {
  if (status === "valid" || status === "invalid") {
    return status
  }

  return "unknown"
}

function getGlobalOpenRouterApiKey(): string | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  return apiKey ? apiKey : null
}

async function readUserOpenRouterKeyRow(userId: string): Promise<UserOpenRouterKeyRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_openrouter_keys")
    .select(
      "user_id, api_key_encrypted, key_last_four, validation_status, last_validated_at, last_validation_error, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load OpenRouter key settings: ${error.message}`)
  }

  return data as UserOpenRouterKeyRow | null
}

function buildStatusFromMetadata(
  metadata: UserOpenRouterKeyMetadata | null,
  options: {
    effectiveSource: OpenRouterKeyStatus["effectiveSource"]
    hasServerFallback: boolean
    validationStatus?: OpenRouterKeyValidationStatus
    lastValidationError?: string | null
  }
): OpenRouterKeyStatus {
  return {
    hasUserKey: Boolean(metadata),
    keyMask: metadata?.key_last_four ? maskOpenRouterApiKey(metadata.key_last_four) : null,
    validationStatus: options.validationStatus ?? normalizeValidationStatus(metadata?.validation_status),
    lastValidatedAt: metadata?.last_validated_at ?? null,
    lastValidationError: options.lastValidationError ?? metadata?.last_validation_error ?? null,
    updatedAt: metadata?.updated_at ?? null,
    effectiveSource: options.effectiveSource,
    hasServerFallback: options.hasServerFallback,
    canManageUserKey: isOpenRouterKeyEncryptionConfigured(),
  }
}

export async function getUserOpenRouterApiKey(userId: string): Promise<string | null> {
  const row = await readUserOpenRouterKeyRow(userId)

  if (!row) {
    return null
  }

  try {
    return decryptOpenRouterApiKey(row.api_key_encrypted)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to decrypt stored OpenRouter API key: ${message}`)
  }
}

export async function resolveOpenRouterApiKey(userId?: string | null): Promise<{
  apiKey: string
  source: "user" | "global"
}> {
  let userResolutionError: Error | null = null

  if (userId) {
    try {
      const userApiKey = await getUserOpenRouterApiKey(userId)

      if (userApiKey) {
        return {
          apiKey: userApiKey,
          source: "user",
        }
      }
    } catch (error) {
      userResolutionError = error instanceof Error ? error : new Error(String(error))
      console.error("[OpenRouterKeys] Failed to use user-specific OpenRouter key:", userResolutionError.message)
    }
  }

  const globalApiKey = getGlobalOpenRouterApiKey()

  if (globalApiKey) {
    return {
      apiKey: globalApiKey,
      source: "global",
    }
  }

  if (userResolutionError) {
    throw userResolutionError
  }

  throw new Error(
    "OpenRouter API key not configured. Save your personal key in Perfil or set OPENROUTER_API_KEY on the server."
  )
}

export async function getOpenRouterKeyStatus(userId?: string | null): Promise<OpenRouterKeyStatus> {
  const hasServerFallback = Boolean(getGlobalOpenRouterApiKey())

  if (!userId) {
    return buildStatusFromMetadata(null, {
      effectiveSource: hasServerFallback ? "global" : "missing",
      hasServerFallback,
    })
  }

  const row = await readUserOpenRouterKeyRow(userId)

  if (!row) {
    return buildStatusFromMetadata(null, {
      effectiveSource: hasServerFallback ? "global" : "missing",
      hasServerFallback,
    })
  }

  const metadata: UserOpenRouterKeyMetadata = {
    user_id: row.user_id,
    key_last_four: row.key_last_four,
    validation_status: row.validation_status,
    last_validated_at: row.last_validated_at,
    last_validation_error: row.last_validation_error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }

  try {
    await getUserOpenRouterApiKey(userId)

    return buildStatusFromMetadata(metadata, {
      effectiveSource: "user",
      hasServerFallback,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return buildStatusFromMetadata(metadata, {
      effectiveSource: hasServerFallback ? "global" : "missing",
      hasServerFallback,
      validationStatus: "invalid",
      lastValidationError: message,
    })
  }
}

export async function saveUserOpenRouterApiKey(userId: string, apiKey: string): Promise<OpenRouterKeyStatus> {
  if (!isOpenRouterKeyEncryptionConfigured()) {
    throw new Error(
      "OPENROUTER_KEY_ENCRYPTION_SECRET not configured. Set it on the server before saving personal OpenRouter keys."
    )
  }

  const supabase = await createClient()
  const normalizedApiKey = apiKey.trim()
  const payload = {
    user_id: userId,
    api_key_encrypted: encryptOpenRouterApiKey(normalizedApiKey),
    key_last_four: normalizedApiKey.slice(-4),
    validation_status: "valid",
    last_validated_at: new Date().toISOString(),
    last_validation_error: null,
  }

  const { error } = await supabase.from("user_openrouter_keys").upsert(payload, { onConflict: "user_id" })

  if (error) {
    throw new Error(`Failed to save OpenRouter API key: ${error.message}`)
  }

  return getOpenRouterKeyStatus(userId)
}

export async function deleteUserOpenRouterApiKey(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("user_openrouter_keys").delete().eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to delete OpenRouter API key: ${error.message}`)
  }
}
