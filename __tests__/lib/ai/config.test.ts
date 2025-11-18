import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createGeminiClient, validateAIConfig, GEMINI_CONFIG, MODEL_FALLBACK_CHAIN } from '@/lib/ai/config'

describe('AI Config', () => {
  let originalApiKey: string | undefined

  beforeEach(() => {
    originalApiKey = process.env.GOOGLE_API_KEY
  })

  afterEach(() => {
    process.env.GOOGLE_API_KEY = originalApiKey
  })

  describe('createGeminiClient', () => {
    it('should throw if GOOGLE_API_KEY is missing', () => {
      delete process.env.GOOGLE_API_KEY
      expect(() => createGeminiClient()).toThrow(expect.stringContaining('GOOGLE_API_KEY'))
    })

    it('should throw if GOOGLE_API_KEY is too short', () => {
      process.env.GOOGLE_API_KEY = 'short'
      expect(() => createGeminiClient()).toThrow(expect.stringContaining('invalid'))
    })

    it('should create client if GOOGLE_API_KEY exists', () => {
      process.env.GOOGLE_API_KEY = 'valid-api-key-at-least-20-chars-long'
      const client = createGeminiClient()
      expect(client).toBeDefined()
    })

    it('should create client with model override parameter', () => {
      process.env.GOOGLE_API_KEY = 'valid-api-key-at-least-20-chars-long'
      const client = createGeminiClient('gemini-1.5-flash')
      expect(client).toBeDefined()
      // Verificar que o cliente expõe métodos esperados
      expect(typeof client.getGenerativeModel).toBe('function')
    })

    it('should expose expected properties and methods on created client', () => {
      process.env.GOOGLE_API_KEY = 'valid-api-key-at-least-20-chars-long'
      const client = createGeminiClient()
      expect(client).toBeDefined()
      expect(typeof client.getGenerativeModel).toBe('function')
    })
  })

  describe('validateAIConfig', () => {
    it('should throw if GOOGLE_API_KEY is too short', () => {
      process.env.GOOGLE_API_KEY = 'short'
      expect(() => validateAIConfig()).toThrow(expect.stringContaining('invalid'))
    })

    it('should return true if GOOGLE_API_KEY exists', () => {
      process.env.GOOGLE_API_KEY = 'valid-api-key-at-least-20-chars-long'
      expect(validateAIConfig()).toBe(true)
    })

    it('should throw if GOOGLE_API_KEY is missing', () => {
      delete process.env.GOOGLE_API_KEY
      expect(() => validateAIConfig()).toThrow(expect.stringContaining('GOOGLE_API_KEY'))
    })
  })

  describe('MODEL_FALLBACK_CHAIN', () => {
    it('should be an array', () => {
      expect(Array.isArray(MODEL_FALLBACK_CHAIN)).toBe(true)
    })

    it('should have expected length', () => {
      expect(MODEL_FALLBACK_CHAIN.length).toBeGreaterThan(0)
    })

    it('should contain expected model entries', () => {
      expect(MODEL_FALLBACK_CHAIN).toContain('gemini-1.5-flash')
    })

    it('should have all entries as strings', () => {
      MODEL_FALLBACK_CHAIN.forEach(model => {
        expect(typeof model).toBe('string')
      })
    })
  })

  describe('GEMINI_CONFIG', () => {
    it('should have correct model name', () => {
      expect(GEMINI_CONFIG.model).toBe('gemini-1.5-flash')
    })

    it('should have low temperature for consistency', () => {
      expect(GEMINI_CONFIG.temperature).toBe(0.1)
    })
  })
})
