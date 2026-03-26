import { beforeEach, describe, expect, it, vi } from "vitest"
import { generateProfile } from "@/lib/ai/profile-generator"
import type { JobDetails } from "@/lib/ai/types"

const { mockCallGrok } = vi.hoisted(() => ({
  mockCallGrok: vi.fn(),
}))

vi.mock("@/lib/ai/grok-client", () => ({
  callGrok: mockCallGrok,
}))

vi.mock("@/lib/ai/config", () => ({
  loadUserAIConfig: vi.fn(async () => ({
    modelo_gemini: "x-ai/grok-4.1-fast",
    temperatura: 0.7,
  })),
  getGenerationConfig: vi.fn(() => ({
    temperature: 0.7,
  })),
}))

vi.mock("@/lib/ai/cv-templates", () => ({
  getCVTemplateForUser: vi.fn(async () => ({
    language: "pt",
    header: {
      name: "Igor Fernandes",
      title: "Engenheiro Químico",
      email: "igor@example.com",
      phone: "",
      location: "Santos, SP",
      links: [],
    },
    summary:
      "Engenheiro Químico em formação com experiência em análise de dados, dashboards operacionais e organização de bases para monitoramento de indicadores.",
    experience: [],
    education: [
      {
        degree: "Engenharia Química",
        institution: "UNESP",
        period: "2021-2026",
        location: "Araraquara",
      },
    ],
    languages: [],
    certifications: [
      { title: "Power BI Impressionador", institution: "Hashtag", year: "2023" },
    ],
    skills: [
      {
        category: "Dados",
        items: ["Excel", "Power BI", "SQL"],
      },
    ],
    projects: [
      {
        title: "Dashboard de Análise de Processos",
        description: ["Construção de indicadores e visualização de dados para acompanhamento semanal."],
      },
    ],
  })),
}))

const jobDetails: JobDetails = {
  empresa: "Saipem",
  cargo: "Estagiário QHSE",
  local: "Guarujá",
  modalidade: "Híbrido",
  tipo_vaga: "Estágio",
  requisitos_obrigatorios: ["Excel", "Power BI"],
  requisitos_desejaveis: ["SQL"],
  responsabilidades: ["Monitorar indicadores", "Documentar processos"],
  beneficios: [],
  salario: "R$ 1.800,00",
  idioma_vaga: "pt",
  etapa: "Indefinido",
  status: "Pendente",
}

describe("generateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("includes skills, projects and education context in the prompt", async () => {
    mockCallGrok.mockResolvedValueOnce({
      content: JSON.stringify({
        profileText:
          "Estudante de Engenharia Química com prática em Excel, Power BI e SQL para organização de bases e acompanhamento de indicadores. Em projeto acadêmico, construí dashboard de análise de processos e documentei fluxos para monitoramento recorrente. Minha formação na UNESP reforça a base técnica para atuar com qualidade, documentação e melhoria contínua. Busco estágio para apoiar indicadores, relatórios e rotinas operacionais com atenção a detalhes.",
      }),
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    })

    await generateProfile(jobDetails, "pt", undefined, "user-1")

    const messages = mockCallGrok.mock.calls[0]?.[0]
    const prompt = messages?.[1]?.content as string

    expect(prompt).toContain("Excel, Power BI, SQL")
    expect(prompt).toContain("Dashboard de Análise de Processos")
    expect(prompt).toContain("Engenharia Química — UNESP")
  })

  it("rejects outputs shorter than 60 words", async () => {
    mockCallGrok.mockResolvedValueOnce({
      content: JSON.stringify({
        profileText: "Resumo curto demais para passar no validador de palavras mínimo exigido.",
      }),
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    })

    await expect(generateProfile(jobDetails, "pt")).rejects.toThrow("Profile too short")
  })
})
