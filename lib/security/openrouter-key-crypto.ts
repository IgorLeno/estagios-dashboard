import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ENCRYPTION_VERSION = "v1"
const IV_LENGTH_BYTES = 12

function getEncryptionSecret(): string {
  const secret = process.env.OPENROUTER_KEY_ENCRYPTION_SECRET?.trim()

  if (!secret) {
    throw new Error(
      "OPENROUTER_KEY_ENCRYPTION_SECRET not configured. It is required to store personal OpenRouter keys."
    )
  }

  return secret
}

function getEncryptionKey(): Buffer {
  return createHash("sha256").update(getEncryptionSecret()).digest()
}

export function isOpenRouterKeyEncryptionConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_KEY_ENCRYPTION_SECRET?.trim())
}

export function encryptOpenRouterApiKey(apiKey: string): string {
  const normalizedKey = apiKey.trim()

  if (!normalizedKey) {
    throw new Error("OpenRouter API key cannot be empty")
  }

  const iv = randomBytes(IV_LENGTH_BYTES)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(normalizedKey, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":")
}

export function decryptOpenRouterApiKey(payload: string): string {
  const [version, ivEncoded, authTagEncoded, encryptedEncoded] = payload.split(":")

  if (version !== ENCRYPTION_VERSION || !ivEncoded || !authTagEncoded || !encryptedEncoded) {
    throw new Error("Stored OpenRouter API key has an unsupported encryption format")
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivEncoded, "base64url"))
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64url"))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8")

  if (!decrypted.trim()) {
    throw new Error("Stored OpenRouter API key decrypted to an empty value")
  }

  return decrypted
}

export function maskOpenRouterApiKey(apiKey: string): string {
  const normalizedKey = apiKey.trim()
  const suffix = normalizedKey.slice(-4) || "????"

  return `sk-or-••••${suffix}`
}
