import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  createGeminiClient,
  validateAIConfig,
  GEMINI_CONFIG,
  MODEL_FALLBACK_CHAIN,
  loadUserAIConfig,
  getGenerationConfig,
} from "@/lib/ai/config"
import type { PromptsConfig } from "@/lib/types"

// Mock Supabase prompts module
vi.mock("@/lib/supabase/prompts", () => ({
  getPromptsConfig: vi.fn(),
}))

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

  describe("loadUserAIConfig", () => {
    it("should load user config from Supabase", async () => {
      const mockConfig: PromptsConfig = {
        id: "test-id",
        user_id: "test-user",
        modelo_gemini: "x-ai/grok-4.1-fast",
        temperatura: 0.8,
        max_tokens: 2048,
        top_p: 0.95,
        top_k: undefined,
        dossie_prompt: "Test dossie",
        analise_prompt: "Test analise",
        curriculo_prompt: "Test curriculo",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { getPromptsConfig } = await import("@/lib/supabase/prompts")
      vi.mocked(getPromptsConfig).mockResolvedValue(mockConfig)

      const result = await loadUserAIConfig("test-user")

      expect(result).toEqual(mockConfig)
      expect(getPromptsConfig).toHaveBeenCalledWith("test-user")
    })

    it("should load global defaults when userId not provided", async () => {
      const mockGlobalConfig: PromptsConfig = {
        id: "global-id",
        user_id: null,
        modelo_gemini: "x-ai/grok-4.1-fast",
        temperatura: 0.7,
        max_tokens: 4096,
        top_p: 0.9,
        top_k: undefined,
        dossie_prompt: "Global dossie",
        analise_prompt: "Global analise",
        curriculo_prompt: "Global curriculo",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { getPromptsConfig } = await import("@/lib/supabase/prompts")
      vi.mocked(getPromptsConfig).mockResolvedValue(mockGlobalConfig)

      const result = await loadUserAIConfig()

      expect(result).toEqual(mockGlobalConfig)
      expect(getPromptsConfig).toHaveBeenCalledWith(undefined)
    })
  })

  describe("getGenerationConfig", () => {
    it("should extract generation parameters from PromptsConfig", () => {
      const config: PromptsConfig = {
        id: "test-id",
        user_id: "test-user",
        modelo_gemini: "x-ai/grok-4.1-fast",
        temperatura: 0.8,
        max_tokens: 2048,
        top_p: 0.95,
        top_k: 40,
        dossie_prompt: "Test dossie",
        analise_prompt: "Test analise",
        curriculo_prompt: "Test curriculo",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const result = getGenerationConfig(config)

      expect(result).toEqual({
        temperature: 0.8,
        maxOutputTokens: 2048,
        topP: 0.95,
      })
    })

    it("should handle undefined top_p", () => {
      const config: PromptsConfig = {
        id: "test-id",
        user_id: "test-user",
        modelo_gemini: "x-ai/grok-4.1-fast",
        temperatura: 0.7,
        max_tokens: 4096,
        top_p: undefined,
        top_k: undefined,
        dossie_prompt: "Test",
        analise_prompt: "Test",
        curriculo_prompt: "Test",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const result = getGenerationConfig(config)

      expect(result).toEqual({
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: undefined,
      })
    })
  })
})
