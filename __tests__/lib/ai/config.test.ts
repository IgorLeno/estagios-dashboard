import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { createGeminiClient, validateAIConfig, GEMINI_CONFIG, MODEL_FALLBACK_CHAIN } from "@/lib/ai/config"

describe("AI Config", () => {
  let originalApiKey: string | undefined

  beforeEach(() => {
    originalApiKey = process.env.OPENROUTER_API_KEY
  })

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalApiKey
  })

  describe("createGeminiClient", () => {
    it("should throw if OPENROUTER_API_KEY is missing", () => {
      delete process.env.OPENROUTER_API_KEY
      expect(() => createGeminiClient()).toThrow()
    })

    it("should throw if OPENROUTER_API_KEY is empty string", () => {
      process.env.OPENROUTER_API_KEY = "   "
      expect(() => createGeminiClient()).toThrow()
    })

    it("should create client if OPENROUTER_API_KEY exists", () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-valid-api-key-at-least-20-chars-long"
      const client = createGeminiClient()
      expect(client).toBeDefined()
    })

    it("should expose getGenerativeModel method on created client", () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-valid-api-key-at-least-20-chars-long"
      const client = createGeminiClient()
      expect(client).toBeDefined()
      // Verificar que o cliente expõe métodos esperados
      expect(typeof client.getGenerativeModel).toBe("function")
    })

    it("should expose expected properties and methods on created client", () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-valid-api-key-at-least-20-chars-long"
      const client = createGeminiClient()
      expect(client).toBeDefined()
      expect(typeof client.getGenerativeModel).toBe("function")
    })
  })

  describe("validateAIConfig", () => {
    it("should throw if OPENROUTER_API_KEY is empty string", () => {
      process.env.OPENROUTER_API_KEY = ""
      expect(() => validateAIConfig()).toThrow()
    })

    it("should return true if OPENROUTER_API_KEY exists", () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-valid-api-key-at-least-20-chars-long"
      expect(validateAIConfig()).toBe(true)
    })

    it("should throw if OPENROUTER_API_KEY is missing", () => {
      delete process.env.OPENROUTER_API_KEY
      expect(() => validateAIConfig()).toThrow()
    })
  })

  describe("MODEL_FALLBACK_CHAIN", () => {
    it("should be an array", () => {
      expect(Array.isArray(MODEL_FALLBACK_CHAIN)).toBe(true)
    })

    it("should have expected length", () => {
      expect(MODEL_FALLBACK_CHAIN.length).toBeGreaterThan(0)
    })

    it("should contain Grok model (migrated from Gemini)", () => {
      expect(MODEL_FALLBACK_CHAIN).toContain("x-ai/grok-4.1-fast")
    })

    it("should have all entries as strings", () => {
      MODEL_FALLBACK_CHAIN.forEach((model) => {
        expect(typeof model).toBe("string")
      })
    })
  })

  describe("GEMINI_CONFIG (now using Grok)", () => {
    it("should have Grok model name", () => {
      expect(GEMINI_CONFIG.model).toBe("x-ai/grok-4.1-fast")
    })

    it("should have balanced temperature for Grok", () => {
      expect(GEMINI_CONFIG.temperature).toBe(0.7)
    })
  })
})
