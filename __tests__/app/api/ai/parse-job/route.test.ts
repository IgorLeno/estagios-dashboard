import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST, GET } from "@/app/api/ai/parse-job/route"
import { NextRequest } from "next/server"

// Mock das dependências
vi.mock("@/lib/ai/config", () => ({
  validateAIConfig: vi.fn(),
  GEMINI_CONFIG: { model: "gemini-2.5-flash" },
  AI_TIMEOUT_CONFIG: { parsingTimeoutMs: 30000 },
}))

vi.mock("@/lib/ai/job-parser", () => ({
  parseJobWithAnalysis: vi.fn(),
}))

vi.mock("@/lib/ai/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  consumeRequest: vi.fn(),
  consumeTokens: vi.fn(),
  RATE_LIMIT_CONFIG: {
    maxRequestsPerMin: 10,
    maxTokensPerDay: 1000000,
  },
}))

vi.mock("@/lib/ai/utils", () => {
  // Define TimeoutError inside the mock
  class TimeoutError extends Error {
    timeoutMs: number
    constructor(message: string, timeoutMs: number) {
      super(message)
      this.name = "TimeoutError"
      this.timeoutMs = timeoutMs
    }
  }

  return {
    withTimeout: vi.fn((promise) => promise),
    TimeoutError,
  }
})

import { validateAIConfig } from "@/lib/ai/config"
import { parseJobWithAnalysis } from "@/lib/ai/job-parser"
import { checkRateLimit, consumeRequest, consumeTokens } from "@/lib/ai/rate-limiter"
import { withTimeout, TimeoutError } from "@/lib/ai/utils"

describe("POST /api/ai/parse-job", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should parse valid job description and return 200", async () => {
    // Mock successful response
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: { requests: 9, tokens: 999000 },
      resetTime: { requests: Date.now() + 60000, tokens: Date.now() + 86400000 },
      limit: { requests: 10, tokens: 1000000 },
    })

    vi.mocked(parseJobWithAnalysis).mockResolvedValue({
      data: {
        empresa: "Test Corp",
        cargo: "Software Engineer",
        local: "São Paulo",
        modalidade: "Híbrido" as const,
        tipo_vaga: "Júnior" as const,
        requisitos_obrigatorios: ["JavaScript", "React"],
        requisitos_desejaveis: ["TypeScript"],
        responsabilidades: ["Develop features"],
        beneficios: ["Health insurance"],
        salario: "R$ 5.000",
        idioma_vaga: "pt" as const,
      },
      analise: "# Análise da Vaga\n\nConteúdo da análise...",
      duration: 2500,
      model: "gemini-2.5-flash",
      tokenUsage: { inputTokens: 500, outputTokens: 300, totalTokens: 800 },
    })

    const request = new NextRequest("http://localhost:3000/api/ai/parse-job", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "A".repeat(50), // Valid minimum length
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.empresa).toBe("Test Corp")
    expect(data.metadata.tokenUsage.totalTokens).toBe(800)
  })

  it("should return 429 when rate limit is exceeded", async () => {
    const now = Date.now()
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: { requests: 0, tokens: 999000 },
      resetTime: { requests: now + 30000, tokens: now + 86400000 },
      limit: { requests: 10, tokens: 1000000 },
    })

    const request = new NextRequest("http://localhost:3000/api/ai/parse-job", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "A".repeat(50),
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.error).toContain("limit")
    expect(data.retryAfter).toBeGreaterThan(0)
  })

  it("should return 504 when parsing times out", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: { requests: 9, tokens: 999000 },
      resetTime: { requests: Date.now() + 60000, tokens: Date.now() + 86400000 },
      limit: { requests: 10, tokens: 1000000 },
    })

    // Mock timeout error
    const timeoutError = new TimeoutError("Timeout", 30000)
    vi.mocked(withTimeout).mockRejectedValue(timeoutError)

    const request = new NextRequest("http://localhost:3000/api/ai/parse-job", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "A".repeat(50),
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(504)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Request timeout")
  })

  it("should return 500 for malformed JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/ai/parse-job", {
      method: "POST",
      body: "invalid json",
    })

    const response = await POST(request)
    const data = await response.json()

    // Malformed JSON causes SyntaxError, which is caught as generic error
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Internal server error")
  })

  it("should return 400 for validation errors (short description)", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: { requests: 9, tokens: 999000 },
      resetTime: { requests: Date.now() + 60000, tokens: Date.now() + 86400000 },
      limit: { requests: 10, tokens: 1000000 },
    })

    const request = new NextRequest("http://localhost:3000/api/ai/parse-job", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "Too short", // Less than 50 chars
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain("Invalid request data")
  })

  it("should return 500 when Gemini API fails", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: { requests: 9, tokens: 999000 },
      resetTime: { requests: Date.now() + 60000, tokens: Date.now() + 86400000 },
      limit: { requests: 10, tokens: 1000000 },
    })

    // Mock API failure
    const apiError = new Error("Gemini API unavailable")
    vi.mocked(parseJobWithAnalysis).mockRejectedValue(apiError)
    vi.mocked(withTimeout).mockRejectedValue(apiError)

    const request = new NextRequest("http://localhost:3000/api/ai/parse-job", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "A".repeat(50),
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Internal server error")
  })

  it("should consume request and tokens on success", async () => {
    vi.mocked(checkRateLimit)
      .mockResolvedValueOnce({
        allowed: true,
        remaining: { requests: 9, tokens: 999000 },
        resetTime: { requests: Date.now() + 60000, tokens: Date.now() + 86400000 },
        limit: { requests: 10, tokens: 1000000 },
      })
      .mockResolvedValueOnce({
        allowed: true,
        remaining: { requests: 8, tokens: 998850 },
        resetTime: { requests: Date.now() + 60000, tokens: Date.now() + 86400000 },
        limit: { requests: 10, tokens: 1000000 },
      })

    const parsedData = {
      data: {
        empresa: "Test",
        cargo: "Dev",
        local: "SP",
        modalidade: "Remoto" as const,
        tipo_vaga: "Estágio" as const,
        requisitos_obrigatorios: [],
        requisitos_desejaveis: [],
        responsabilidades: [],
        beneficios: [],
        salario: null,
        idioma_vaga: "pt" as const,
      },
      analise: "# Análise\n\nConteúdo...",
      duration: 1000,
      model: "gemini-2.5-flash",
      tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    }

    vi.mocked(parseJobWithAnalysis).mockResolvedValue(parsedData)
    vi.mocked(withTimeout).mockResolvedValue(parsedData)

    const request = new NextRequest("http://localhost:3000/api/ai/parse-job", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "A".repeat(50),
      }),
    })

    await POST(request)

    expect(consumeRequest).toHaveBeenCalled()
    expect(consumeTokens).toHaveBeenCalledWith(expect.any(String), 150)
  })
})

describe("GET /api/ai/parse-job", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return health check status when config is valid", async () => {
    vi.mocked(validateAIConfig).mockReturnValue(true)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe("ok")
    expect(data.model).toBe("gemini-2.5-flash")
  })

  it("should return 500 when config is invalid", async () => {
    vi.mocked(validateAIConfig).mockImplementation(() => {
      throw new Error("Configuration error")
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.status).toBe("error")
  })
})
