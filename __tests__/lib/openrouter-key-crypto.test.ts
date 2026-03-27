import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  decryptOpenRouterApiKey,
  encryptOpenRouterApiKey,
  isOpenRouterKeyEncryptionConfigured,
  maskOpenRouterApiKey,
} from "@/lib/security/openrouter-key-crypto"

describe("openrouter-key-crypto", () => {
  const originalSecret = process.env.OPENROUTER_KEY_ENCRYPTION_SECRET

  beforeEach(() => {
    process.env.OPENROUTER_KEY_ENCRYPTION_SECRET = "test-openrouter-key-encryption-secret"
  })

  afterEach(() => {
    process.env.OPENROUTER_KEY_ENCRYPTION_SECRET = originalSecret
  })

  it("encrypts and decrypts a key round-trip", () => {
    const apiKey = "sk-or-v1-abcdefghijklmnopqrstuvwxyz123456"
    const encrypted = encryptOpenRouterApiKey(apiKey)

    expect(encrypted).not.toContain(apiKey)
    expect(decryptOpenRouterApiKey(encrypted)).toBe(apiKey)
  })

  it("reports whether the encryption secret is configured", () => {
    expect(isOpenRouterKeyEncryptionConfigured()).toBe(true)

    delete process.env.OPENROUTER_KEY_ENCRYPTION_SECRET

    expect(isOpenRouterKeyEncryptionConfigured()).toBe(false)
  })

  it("masks the key for UI display", () => {
    expect(maskOpenRouterApiKey("sk-or-v1-abcdefghijklmnopqrstuvwxyz1234")).toBe("sk-or-••••1234")
  })
})
