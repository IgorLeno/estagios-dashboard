import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/ai/select-complements/route"

vi.mock("@/lib/ai/complement-selector", () => ({
  selectComplements: vi.fn(),
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

import { selectComplements } from "@/lib/ai/complement-selector"

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

describe("POST /api/ai/select-complements", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 200 when complement selection succeeds", async () => {
    vi.mocked(selectComplements).mockResolvedValue({
      selection: {
        skills: [{ category: "Dados", items: ["React"], selected: true }],
        projects: [{ title: "Projeto 1", selected: true, reason: "Aderente" }],
        certifications: [{ title: "Certificação 1", selected: false, reason: "Pouco aderente" }],
      },
      model: "openrouter/hunter-alpha",
      tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    })

    const request = new NextRequest("http://localhost:3000/api/ai/select-complements", {
      method: "POST",
      body: JSON.stringify({
        profileText: "Perfil válido com conteúdo suficiente para acionar a seleção de complementos.",
        jobAnalysis: validJobAnalysis,
        language: "pt",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.skills[0].items).toContain("React")
    expect(data.metadata).toEqual({
      model: "openrouter/hunter-alpha",
      tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    })
  })

  it("returns 400 for invalid request data", async () => {
    const request = new NextRequest("http://localhost:3000/api/ai/select-complements", {
      method: "POST",
      body: JSON.stringify({
        profileText: "curto",
        language: "pt",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Invalid request data")
  })

  it("returns 502 when the provider returns an empty complements response", async () => {
    vi.mocked(selectComplements).mockRejectedValue(
      new Error("No content in Grok response [model: x-ai/grok-4.1-fast]")
    )

    const request = new NextRequest("http://localhost:3000/api/ai/select-complements", {
      method: "POST",
      body: JSON.stringify({
        profileText: "Perfil válido com conteúdo suficiente para acionar a seleção de complementos.",
        jobAnalysis: validJobAnalysis,
        language: "pt",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data).toEqual({
      success: false,
      error: "AI provider returned an empty complements response. Try again or switch model.",
    })
  })
})
