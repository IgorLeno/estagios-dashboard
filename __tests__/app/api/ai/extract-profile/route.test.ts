import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/ai/extract-profile/route"

vi.mock("@/lib/ai/grok-client", () => ({
  callGrok: vi.fn(),
  validateGrokConfig: vi.fn(),
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

vi.mock("@/lib/supabase/prompts", () => ({
  getPromptsConfig: vi.fn(async () => ({
    id: "config-id",
    created_at: "2026-03-18T00:00:00.000Z",
    updated_at: "2026-03-18T00:00:00.000Z",
    modelo_gemini: "x-ai/grok-4.1-fast",
    temperatura: 0.3,
    max_tokens: 4096,
    top_p: 0.95,
    top_k: 40,
    dossie_prompt: "",
    analise_prompt: "",
    curriculo_prompt: "",
  })),
}))

import { callGrok } from "@/lib/ai/grok-client"

describe("POST /api/ai/extract-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("adapts extracted fields to Partial<CandidateProfile>", async () => {
    vi.mocked(callGrok).mockResolvedValue({
      content: JSON.stringify({
        nome: "Maria Silva",
        email: "maria@example.com",
        telefone: "+55 11 99999-9999",
        linkedin: "linkedin.com/in/maria",
        github: "github.com/maria",
        localizacao: "São Paulo/SP",
        disponibilidade: "Imediata",
        curso: "Ciência da Computação",
        instituicao: "USP",
        previsao_conclusao: "Dez/2026",
        idiomas: [{ idioma: "Inglês", nivel: "Avançado" }],
        objetivo_pt: "Atuar com desenvolvimento de software.",
        objetivo_en: "",
        habilidades: [
          {
            category_pt: "Programação",
            category_en: "Programming",
            items_pt: ["TypeScript", "React"],
            items_en: ["TypeScript", "React"],
          },
        ],
        projetos: [
          {
            title_pt: "Painel de Estágios",
            title_en: "",
            description_pt: ["Construí dashboard em Next.js."],
            description_en: [],
          },
        ],
        certificacoes: ["AWS Cloud Practitioner"],
      }),
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
    })

    const request = new NextRequest("http://localhost:3000/api/ai/extract-profile", {
      method: "POST",
      body: JSON.stringify({
        rawText: "Perfil completo da candidata com experiências, curso e certificações.",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.nome).toBe("Maria Silva")
    expect(data.data.localizacao_pt).toBe("São Paulo/SP")
    expect(data.data.localizacao_en).toBe("São Paulo/SP")
    expect(data.data.educacao).toEqual([
      {
        degree_pt: "Ciência da Computação",
        degree_en: "Ciência da Computação",
        institution_pt: "USP",
        institution_en: "USP",
        period_pt: "Dez/2026",
        period_en: "Dez/2026",
      },
    ])
    expect(data.data.idiomas).toEqual([
      {
        language_pt: "Inglês",
        language_en: "Inglês",
        proficiency_pt: "Avançado",
        proficiency_en: "Avançado",
      },
    ])
    expect(data.data.projetos[0].title_en).toBe("Painel de Estágios")
    expect(data.data.projetos[0].description_en).toEqual(["Construí dashboard em Next.js."])
    expect(data.data.certificacoes).toEqual([
      { text_pt: "AWS Cloud Practitioner", text_en: "AWS Cloud Practitioner" },
    ])
  })

  it('returns 500 with "Invalid JSON from model" when parsing fails', async () => {
    vi.mocked(callGrok).mockResolvedValue({
      content: "not-json",
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    })

    const request = new NextRequest("http://localhost:3000/api/ai/extract-profile", {
      method: "POST",
      body: JSON.stringify({
        rawText: "Texto livre de perfil",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: "Invalid JSON from model",
    })
  })
})
