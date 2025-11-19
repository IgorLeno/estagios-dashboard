import { describe, it, expect, beforeEach } from "vitest"
import {
  checkRateLimit,
  consumeRequest,
  consumeTokens,
  cleanupExpiredEntries,
  RATE_LIMIT_CONFIG,
} from "@/lib/ai/rate-limiter"

describe("Rate Limiter", () => {
  beforeEach(async () => {
    // Limpar entradas para garantir testes isolados
    await cleanupExpiredEntries()
  })

  describe("checkRateLimit", () => {
    it("should allow requests within the limit", async () => {
      const identifier = "test-user-1"
      const result = await checkRateLimit(identifier)

      expect(result.allowed).toBe(true)
      expect(result.remaining.requests).toBe(RATE_LIMIT_CONFIG.maxRequestsPerMin)
      expect(result.remaining.tokens).toBe(RATE_LIMIT_CONFIG.maxTokensPerDay)
      expect(result.limit.requests).toBe(RATE_LIMIT_CONFIG.maxRequestsPerMin)
      expect(result.limit.tokens).toBe(RATE_LIMIT_CONFIG.maxTokensPerDay)
    })

    it("should block requests exceeding the limit", async () => {
      const identifier = "test-user-2"

      // Consumir todos os requests disponíveis
      for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequestsPerMin; i++) {
        await consumeRequest(identifier)
      }

      const result = await checkRateLimit(identifier)

      expect(result.allowed).toBe(false)
      expect(result.remaining.requests).toBe(0)
    })

    it("should track token usage correctly", async () => {
      const identifier = "test-user-3"
      const tokensToConsume = 1000

      await consumeTokens(identifier, tokensToConsume)
      const result = await checkRateLimit(identifier)

      expect(result.remaining.tokens).toBe(RATE_LIMIT_CONFIG.maxTokensPerDay - tokensToConsume)
    })

    it("should isolate different users", async () => {
      const user1 = "test-user-4"
      const user2 = "test-user-5"

      // Consumir requests do user1
      for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequestsPerMin; i++) {
        await consumeRequest(user1)
      }

      // Verificar que user1 está bloqueado mas user2 não
      const result1 = await checkRateLimit(user1)
      const result2 = await checkRateLimit(user2)

      expect(result1.allowed).toBe(false)
      expect(result2.allowed).toBe(true)
      expect(result1.remaining.requests).toBe(0)
      expect(result2.remaining.requests).toBe(RATE_LIMIT_CONFIG.maxRequestsPerMin)
    })

    it("should handle invalid identifier gracefully", async () => {
      const result = await checkRateLimit("")

      expect(result.allowed).toBe(false)
      expect(result.remaining.requests).toBe(0)
      expect(result.remaining.tokens).toBe(0)
    })

    it("should block when token limit is exceeded", async () => {
      const identifier = "test-user-6"
      const tokensToConsume = RATE_LIMIT_CONFIG.maxTokensPerDay + 1

      await consumeTokens(identifier, tokensToConsume)
      const result = await checkRateLimit(identifier)

      expect(result.allowed).toBe(false)
      expect(result.remaining.tokens).toBeLessThanOrEqual(0)
    })
  })

  describe("consumeRequest", () => {
    it("should increment request count", async () => {
      const identifier = "test-user-7"

      const initialCheck = await checkRateLimit(identifier)
      await consumeRequest(identifier)
      const afterCheck = await checkRateLimit(identifier)

      expect(afterCheck.remaining.requests).toBe(initialCheck.remaining.requests - 1)
    })

    it("should track multiple requests correctly", async () => {
      const identifier = "test-user-8"
      const requestsToConsume = 3

      for (let i = 0; i < requestsToConsume; i++) {
        await consumeRequest(identifier)
      }

      const result = await checkRateLimit(identifier)
      expect(result.remaining.requests).toBe(RATE_LIMIT_CONFIG.maxRequestsPerMin - requestsToConsume)
    })
  })

  describe("consumeTokens", () => {
    it("should increment token count", async () => {
      const identifier = "test-user-9"
      const tokensToConsume = 500

      const initialCheck = await checkRateLimit(identifier)
      await consumeTokens(identifier, tokensToConsume)
      const afterCheck = await checkRateLimit(identifier)

      expect(afterCheck.remaining.tokens).toBe(initialCheck.remaining.tokens - tokensToConsume)
    })

    it("should track multiple token consumptions", async () => {
      const identifier = "test-user-10"
      const tokens1 = 300
      const tokens2 = 200

      await consumeTokens(identifier, tokens1)
      await consumeTokens(identifier, tokens2)

      const result = await checkRateLimit(identifier)
      expect(result.remaining.tokens).toBe(RATE_LIMIT_CONFIG.maxTokensPerDay - tokens1 - tokens2)
    })
  })

  describe("resetTime", () => {
    it("should provide valid reset timestamps", async () => {
      const identifier = "test-user-11"
      const result = await checkRateLimit(identifier)

      const now = Date.now()

      // Request reset should be within next minute
      expect(result.resetTime.requests).toBeGreaterThan(now)
      expect(result.resetTime.requests).toBeLessThanOrEqual(now + 60000)

      // Token reset should be in the future (next day)
      expect(result.resetTime.tokens).toBeGreaterThan(now)
    })
  })
})
