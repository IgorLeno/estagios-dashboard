import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/ai/generate-profile/route"

vi.mock("@/lib/ai/profile-generator", () => ({
  generateProfile: vi.fn(),
}))

vi.mock("@/lib/ai/config", () => ({
  validateAIConfig: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "test-user-id" } },
        error: null,
      })),
    },
  })),
}))

import { generateProfile } from "@/lib/ai/profile-generator"

const validJobAnalysis = {
  empresa: "Tech Corp",
  cargo: "Dev",
  local: "São Paulo",
  modalidade: "Remoto" as const,
  tipo_vaga: "Estágio" as const,
  requisitos_obrigatorios: ["React"],
  requisitos_desejaveis: [],
  responsabilidades: ["Desenvolver features"],
  beneficios: [],
  salario: "Indefinido",
  idioma_vaga: "pt" as const,
  etapa: "Indefinido",
  status: "Pendente" as const,
}

describe("POST /api/ai/generate-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 200 when profile generation succeeds", async () => {
    vi.mocked(generateProfile).mockResolvedValue({
      profileText: "Perfil válido com conteúdo suficiente para o teste de rota.",
      model: "openrouter/hunter-alpha",
      tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    })

    const request = new NextRequest("http://localhost:3000/api/ai/generate-profile", {
      method: "POST",
      body: JSON.stringify({
        jobAnalysis: validJobAnalysis,
        language: "pt",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.profileText).toContain("Perfil válido")
    expect(data.metadata).toEqual({
      model: "openrouter/hunter-alpha",
      tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    })
  })

  it("returns 400 when jobAnalysis is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/ai/generate-profile", {
      method: "POST",
      body: JSON.stringify({
        language: "pt",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Invalid request data")
  })

  it("returns 502 when the provider returns an empty profile response", async () => {
    vi.mocked(generateProfile).mockRejectedValue(
      new Error("No content in Grok response [model: x-ai/grok-4.1-fast]")
    )

    const request = new NextRequest("http://localhost:3000/api/ai/generate-profile", {
      method: "POST",
      body: JSON.stringify({
        jobAnalysis: validJobAnalysis,
        language: "pt",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data).toEqual({
      success: false,
      error: "AI provider returned an empty profile response. Try again or switch model.",
    })
  })
})
