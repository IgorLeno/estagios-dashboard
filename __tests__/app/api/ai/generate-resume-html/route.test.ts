import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/ai/generate-resume-html/route"
import type { CVTemplate } from "@/lib/ai/types"

const { mockGenerateTailoredResume, mockGenerateResumeHTML, mockParseJobWithGemini } = vi.hoisted(() => ({
  mockGenerateTailoredResume: vi.fn(),
  mockGenerateResumeHTML: vi.fn((cv: CVTemplate) => `<html><body>${cv.header.name}</body></html>`),
  mockParseJobWithGemini: vi.fn(async () => ({
    data: {
      empresa: "Test Company",
      cargo: "Test Position",
      local: "Test Location",
      modalidade: "Híbrido" as const,
      tipo_vaga: "Estágio" as const,
      requisitos_obrigatorios: ["Requirement 1"],
      requisitos_desejaveis: ["Nice to have 1"],
      responsabilidades: ["Responsibility 1"],
      beneficios: ["Benefit 1"],
      salario: null,
      idioma_vaga: "pt" as const,
    },
    duration: 1000,
    model: "x-ai/grok-4.1-fast",
  })),
}))

vi.mock("@/lib/ai/resume-generator", () => ({
  InsufficientProfileError: class InsufficientProfileError extends Error {},
  generateTailoredResume: mockGenerateTailoredResume,
}))

vi.mock("@/lib/ai/resume-html-template", () => ({
  generateResumeHTML: mockGenerateResumeHTML,
}))

vi.mock("@/lib/ai/job-parser", () => ({
  parseJobWithGemini: mockParseJobWithGemini,
}))

vi.mock("@/lib/ai/config", () => ({
  validateAIConfig: vi.fn(() => true),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "test-user-id" } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

function createValidCV(): CVTemplate {
  return {
    language: "pt",
    header: {
      name: "Igor Leno de Souza Fernandes",
      title: "Estagiario de BI",
      email: "igor@example.com",
      phone: "(11) 99999-9999",
      location: "Sao Paulo/SP",
      links: [{ label: "LinkedIn", url: "linkedin.com/in/igorfernandes" }],
    },
    experience: [],
    education: [{ degree: "Graduacao", institution: "Universidade", period: "2021-2026", location: "SP" }],
    languages: [{ language: "Portugues", proficiency: "Nativo" }],
    certifications: [{ title: "Google Data Analytics", institution: "Coursera", year: "2024" }],
    summary:
      "Estudante em fase final da graduacao com foco em analise de dados aplicada a processos e suporte operacional. Tenho pratica com Excel, SQL, Power BI e organizacao de bases para acompanhamento de indicadores e elaboracao de relatorios. Em projetos autorais e academicos, automatizei rotinas em Python, padronizei registros e documentei etapas para garantir consistencia e rastreabilidade. Busco estagio em BI para apoiar manutencao de bases, analises recorrentes e visualizacao objetiva de indicadores.",
    skills: [
      { category: "Analise de Dados", items: ["Excel", "SQL", "Power BI", "Python"] },
      { category: "Processos", items: ["Validacao de dados", "Documentacao tecnica"] },
    ],
    projects: [
      {
        title: "Projeto de BI",
        description: [
          "Estruturei bases e indicadores para acompanhamento semanal de desempenho em dashboards internos.",
          "Automatizei consolidacao de dados com Python e SQL, melhorando consistencia e rastreabilidade do fluxo.",
        ],
      },
    ],
  }
}

describe("POST /api/ai/generate-resume-html", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 422 with preflight details for invalid generated cv", async () => {
    const invalidCV = createValidCV()
    invalidCV.summary = "Muito curto."
    invalidCV.skills = Array.from({ length: 7 }, (_, index) => ({
      category: `Categoria ${index + 1}`,
      items: ["Item 1", "Item 2", "Item 3", "Item 4"],
    }))

    mockGenerateTailoredResume.mockResolvedValue({
      cv: invalidCV,
      duration: 5000,
      model: "x-ai/grok-4.1-fast",
      tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      personalizedSections: ["summary", "skills", "projects"],
    })

    const req = new NextRequest("http://localhost:3000/api/ai/generate-resume-html", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "Test job description with more than 50 characters to pass validation",
        language: "pt",
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error).toContain("CV preflight failed")
    expect(data.details.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("40 palavras"),
        expect.stringContaining("6 categorias"),
        expect.stringContaining("24 itens"),
      ])
    )
    expect(mockGenerateResumeHTML).not.toHaveBeenCalled()
  })

  it("returns html for a valid generated cv", async () => {
    mockGenerateTailoredResume.mockResolvedValue({
      cv: createValidCV(),
      duration: 5000,
      model: "x-ai/grok-4.1-fast",
      tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      personalizedSections: ["summary", "skills", "projects"],
    })

    const req = new NextRequest("http://localhost:3000/api/ai/generate-resume-html", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "Test job description with more than 50 characters to pass validation",
        language: "pt",
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.html).toContain("Igor Leno de Souza Fernandes")
    expect(mockGenerateResumeHTML).toHaveBeenCalled()
  })
})
