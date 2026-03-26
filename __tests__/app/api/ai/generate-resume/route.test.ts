import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST, GET } from "@/app/api/ai/generate-resume/route"
import { NextRequest } from "next/server"

// Mock dependencies
vi.mock("@/lib/ai/resume-generator", () => ({
  InsufficientProfileError: class InsufficientProfileError extends Error {},
  generateTailoredResume: vi.fn(async () => ({
    cv: {
      language: "pt",
      header: {
        name: "Test",
        title: "Estagiario de BI",
        email: "test@example.com",
        phone: "(11) 99999-9999",
        location: "Sao Paulo/SP",
        links: [{ label: "LinkedIn", url: "linkedin.com/in/test" }],
      },
      summary:
        "Estudante em fase final da graduacao com foco em analise de dados aplicada a rotinas operacionais e suporte a indicadores. Tenho pratica com Excel, SQL, Power BI e organizacao de bases para acompanhamento de relatorios e consistencia das informacoes. Em projetos academicos e autorais, automatizei rotinas em Python, documentei etapas e estruturei dados para analise recorrente. Busco estagio em BI para apoiar manutencao de bases, visualizacao de indicadores e elaboracao de relatorios.",
      experience: [],
      education: [{ degree: "Graduacao", institution: "Universidade", period: "2021-2026", location: "SP" }],
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
      languages: [{ language: "Portugues", proficiency: "Nativo" }],
      certifications: [],
    },
    duration: 5000,
    model: "x-ai/grok-4.1-fast",
    tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    personalizedSections: ["summary", "skills", "projects"],
  })),
}))

vi.mock("@/lib/ai/pdf-generator", () => ({
  generateResumePDF: vi.fn(async () => Buffer.from("fake-pdf-content")),
  generateResumeFilename: vi.fn(() => "cv-test.pdf"),
}))

vi.mock("@/lib/ai/config", () => ({
  validateAIConfig: vi.fn(() => true),
}))

vi.mock("@/lib/ai/resume-html-template", () => ({
  generateResumeHTML: vi.fn((cv) => `<html><body>HTML for ${cv.header.name}</body></html>`),
}))

vi.mock("@/lib/ai/markdown-converter", () => ({
  htmlToMarkdown: vi.fn((html) => `# Markdown\n\nConverted from: ${html.substring(0, 20)}...`),
}))

vi.mock("@/lib/ai/job-parser", () => ({
  parseJobWithGemini: vi.fn(async () => ({
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

describe("POST /api/ai/generate-resume", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 400 for invalid request (missing both vagaId and jobDescription)", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ language: "pt" }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it("should return 200 for valid job description request", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/generate-resume", {
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
    expect(data.data.pdfBase64).toBeDefined()
    expect(data.metadata.personalizedSections).toEqual(["summary", "skills", "projects"])
  })

  it("should pass model override to downstream functions", async () => {
    const { parseJobWithGemini } = await import("@/lib/ai/job-parser")
    const { generateTailoredResume } = await import("@/lib/ai/resume-generator")

    const req = new NextRequest("http://localhost:3000/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "Test job description with more than 50 characters to pass validation",
        language: "en",
        model: "openai/gpt-5.4-nano",
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    expect(parseJobWithGemini).toHaveBeenCalledWith(
      expect.any(String),
      "openai/gpt-5.4-nano"
    )
    expect(generateTailoredResume).toHaveBeenCalledWith({
      jobDetails: expect.any(Object),
      language: "en",
      userId: "test-user-id",
      approvedSkills: undefined,
      model: "openai/gpt-5.4-nano",
      selectedProjectTitles: undefined,
      profileText: undefined,
      selectedCertifications: undefined,
    })
  })

  it("should work without model (backward compatibility)", async () => {
    const { parseJobWithGemini } = await import("@/lib/ai/job-parser")
    const { generateTailoredResume } = await import("@/lib/ai/resume-generator")

    const req = new NextRequest("http://localhost:3000/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "Test job description with more than 50 characters to pass validation",
        language: "pt",
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    expect(parseJobWithGemini).toHaveBeenCalledWith(
      expect.any(String),
      undefined
    )
    expect(generateTailoredResume).toHaveBeenCalledWith({
      jobDetails: expect.any(Object),
      language: "pt",
      userId: "test-user-id",
      approvedSkills: undefined,
      model: undefined,
      selectedProjectTitles: undefined,
      profileText: undefined,
      selectedCertifications: undefined,
    })
  })
})

describe("GET /api/ai/generate-resume", () => {
  it("should return health check status", async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe("ok")
    expect(data.message).toContain("Resume Generator")
  })
})
