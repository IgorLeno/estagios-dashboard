import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createGeminiClient, validateAIConfig, GEMINI_CONFIG } from '@/lib/ai/config'

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
      expect(() => createGeminiClient()).toThrow('GOOGLE_API_KEY not found')
    })

    it('should throw if GOOGLE_API_KEY is too short', () => {
      process.env.GOOGLE_API_KEY = 'short'
      expect(() => createGeminiClient()).toThrow('GOOGLE_API_KEY appears invalid (too short)')
    })

    it('should create client if GOOGLE_API_KEY exists', () => {
      process.env.GOOGLE_API_KEY = 'valid-api-key-at-least-20-chars-long'
      const client = createGeminiClient()
      expect(client).toBeDefined()
    })
  })

  describe('validateAIConfig', () => {
    it('should throw if GOOGLE_API_KEY is too short', () => {
      process.env.GOOGLE_API_KEY = 'short'
      expect(() => validateAIConfig()).toThrow('GOOGLE_API_KEY appears invalid (too short)')
    })

    it('should return true if GOOGLE_API_KEY exists', () => {
      process.env.GOOGLE_API_KEY = 'valid-api-key-at-least-20-chars-long'
      expect(validateAIConfig()).toBe(true)
    })

    it('should throw if GOOGLE_API_KEY is missing', () => {
      delete process.env.GOOGLE_API_KEY
      expect(() => validateAIConfig()).toThrow()
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
