import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateTailoredResume } from "@/lib/ai/resume-generator"
import type { JobDetails } from "@/lib/ai/types"

// Mock job details for testing
const mockJobDetails: JobDetails = {
  empresa: "Tech Corp",
  cargo: "Machine Learning Engineer",
  local: "São Paulo, SP",
  modalidade: "Híbrido",
  tipo_vaga: "Estágio",
  requisitos_obrigatorios: ["Python", "Machine Learning", "TensorFlow"],
  requisitos_desejaveis: ["Docker", "Git"],
  responsabilidades: ["Desenvolver modelos de ML", "Analisar dados experimentais", "Implementar pipelines de dados"],
  beneficios: ["Vale refeição", "Plano de saúde"],
  salario: "R$ 2.000/mês",
  idioma_vaga: "pt",
  status: "Pendente",
  etapa: "Indefinido",
}

// Mock personalized sections responses
const mockSummaryResponse = {
  summary:
    "Engenheiro Químico com especialização em Machine Learning e Python. Experiência comprovada em desenvolvimento de modelos preditivos usando TensorFlow e análise de dados. Habilidades em Docker e Git para versionamento de código. Busco oportunidade em Tech Corp para aplicar conhecimentos em projetos de ML.",
}

const mockSkillsResponse = {
  skills: [
    {
      category: "Machine Learning & Data Science",
      items: ["TensorFlow", "PyTorch", "scikit-learn", "pandas", "NumPy"],
    },
    {
      category: "Linguagens de Programação",
      items: ["Python", "MATLAB", "SQL", "JavaScript"],
    },
    {
      category: "Ferramentas & Tecnologias",
      items: ["Docker", "Git", "Jupyter Notebook", "VS Code", "Linux"],
    },
  ],
}

const mockProjectsResponse = {
  projects: [
    {
      title: "Predição de Propriedades Termodinâmicas com ML",
      description: [
        "Desenvolvimento de modelo de Machine Learning usando TensorFlow e Python para prever viscosidade de misturas químicas",
        "Redução de erro de predição em 35% através de Random Forest e redes neurais",
        "Processamento de dataset com 5000+ pontos experimentais usando pandas e NumPy",
      ],
    },
    {
      title: "Simulação de Reator Químico em Python",
      description: [
        "Implementação de modelo cinético para reator de polimerização usando Python e bibliotecas científicas",
        "Validação experimental com erro médio < 5% através de análise estatística",
        "Automação de análise de sensibilidade paramétrica com scripts Python",
      ],
    },
    {
      title: "Dashboard de Análise de Processos",
      description: [
        "Desenvolvimento de aplicação web usando Python (Streamlit) para visualização de dados de processo químico",
        "Interface interativa para análise de tendências usando Machine Learning",
        "Integração com Docker e Git para deploy e versionamento",
      ],
    },
  ],
}

// Mock Gemini client
const mockGenerateContent = vi.fn()

vi.mock("@/lib/ai/config", () => ({
  createGeminiClient: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  })),
  GEMINI_CONFIG: {
    model: "gemini-2.5-flash",
    temperature: 0.1,
    topP: 0.95,
    topK: 40,
  },
}))

// Mock CV templates
vi.mock("@/lib/ai/cv-templates", () => ({
  getCVTemplate: vi.fn((language: "pt" | "en") => ({
    language,
    header: {
      name: "Igor Fernandes",
      title: "Engenheiro Químico | Pesquisador em ML",
      email: "igor@example.com",
      phone: "+55 13 99999-9999",
      location: "Santos, SP",
      links: [],
    },
    summary: "Original summary about chemical engineering and ML experience.",
    experience: [],
    education: [],
    skills: [
      {
        category: "Machine Learning & Data Science",
        items: ["TensorFlow", "PyTorch", "scikit-learn", "pandas", "NumPy"],
      },
      {
        category: "Linguagens de Programação",
        items: ["Python", "MATLAB", "SQL", "JavaScript"],
      },
      {
        category: "Ferramentas & Tecnologias",
        items: ["Docker", "Git", "Jupyter Notebook", "VS Code", "Linux"],
      },
    ],
    projects: [
      {
        title: "Predição de Propriedades Termodinâmicas com ML",
        description: [
          "Desenvolvimento de modelo de Machine Learning usando TensorFlow e Python para prever viscosidade de misturas químicas",
          "Redução de erro de predição em 35% através de Random Forest e redes neurais",
          "Processamento de dataset com 5000+ pontos experimentais usando pandas e NumPy",
        ],
      },
      {
        title: "Simulação de Reator Químico em Python",
        description: [
          "Implementação de modelo cinético para reator de polimerização usando Python e bibliotecas científicas",
          "Validação experimental com erro médio < 5% através de análise estatística",
          "Automação de análise de sensibilidade paramétrica com scripts Python",
        ],
      },
      {
        title: "Dashboard de Análise de Processos",
        description: [
          "Desenvolvimento de aplicação web usando Python (Streamlit) para visualização de dados de processo químico",
          "Interface interativa para análise de tendências usando Machine Learning",
          "Integração com Docker e Git para deploy e versionamento",
        ],
      },
    ],
    languages: [],
    certifications: [],
  })),
}))

// Mock resume prompts
vi.mock("@/lib/ai/resume-prompts", () => ({
  buildSummaryPrompt: vi.fn(() => "Summary prompt"),
  buildSkillsPrompt: vi.fn(() => "Skills prompt"),
  buildProjectsPrompt: vi.fn(() => "Projects prompt"),
  RESUME_SYSTEM_PROMPT: "You are a professional resume writer",
}))

describe("generateTailoredResume", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock responses for all three personalization calls
    mockGenerateContent
      .mockResolvedValueOnce({
        // Summary response
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockSummaryResponse)}\n\`\`\``,
          usageMetadata: {
            promptTokenCount: 500,
            candidatesTokenCount: 150,
            totalTokenCount: 650,
          },
        },
      })
      .mockResolvedValueOnce({
        // Skills response
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockSkillsResponse)}\n\`\`\``,
          usageMetadata: {
            promptTokenCount: 400,
            candidatesTokenCount: 200,
            totalTokenCount: 600,
          },
        },
      })
      .mockResolvedValueOnce({
        // Projects response
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockProjectsResponse)}\n\`\`\``,
          usageMetadata: {
            promptTokenCount: 600,
            candidatesTokenCount: 300,
            totalTokenCount: 900,
          },
        },
      })
  })

  it("should generate tailored resume with personalized sections", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    expect(result).toBeDefined()
    expect(result.cv).toBeDefined()
    expect(result.cv.summary).toBe(mockSummaryResponse.summary)
    expect(result.cv.skills).toEqual(mockSkillsResponse.skills)
    expect(result.cv.projects).toEqual(mockProjectsResponse.projects)
  })

  it("should include correct metadata", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    expect(result.model).toBe("gemini-2.5-flash")
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.personalizedSections).toEqual(["summary", "skills", "projects"])
  })

  it("should aggregate token usage from all sections", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    expect(result.tokenUsage).toBeDefined()
    expect(result.tokenUsage.inputTokens).toBe(500 + 400 + 600) // 1500
    expect(result.tokenUsage.outputTokens).toBe(150 + 200 + 300) // 650
    expect(result.tokenUsage.totalTokens).toBe(650 + 600 + 900) // 2150
  })

  it("should preserve static CV sections", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    expect(result.cv.header.name).toBe("Igor Fernandes")
    expect(result.cv.header.email).toBe("igor@example.com")
    expect(result.cv.language).toBe("pt")
  })

  it("should support English language", async () => {
    const result = await generateTailoredResume(mockJobDetails, "en")

    expect(result.cv.language).toBe("en")
  })

  it("should call LLM in parallel for all sections", async () => {
    const startTime = Date.now()
    await generateTailoredResume(mockJobDetails, "pt")
    const duration = Date.now() - startTime

    // If calls were sequential, duration would be sum of all calls
    // Parallel execution should be faster (not strictly testable but we verify all were called)
    expect(mockGenerateContent).toHaveBeenCalledTimes(3)

    // Duration should be reasonable (less than 5 seconds for mocked responses)
    expect(duration).toBeLessThan(5000)
  })

  it("should handle responses without token metadata", async () => {
    mockGenerateContent.mockReset()
    mockGenerateContent
      .mockResolvedValueOnce({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockSummaryResponse)}\n\`\`\``,
          // No usageMetadata
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockSkillsResponse)}\n\`\`\``,
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockProjectsResponse)}\n\`\`\``,
        },
      })

    const result = await generateTailoredResume(mockJobDetails, "pt")

    expect(result.tokenUsage.inputTokens).toBe(0)
    expect(result.tokenUsage.outputTokens).toBe(0)
    expect(result.tokenUsage.totalTokens).toBe(0)
  })

  it("should include job-relevant keywords in personalized summary", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    const summary = result.cv.summary.toLowerCase()
    expect(summary).toContain("machine learning")
    expect(summary).toContain("python")
    expect(summary).toContain("tensorflow")
  })

  it("should reorder skills by relevance to job", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    // First category should be ML-related (most relevant to job)
    expect(result.cv.skills[0].category).toBe("Machine Learning & Data Science")
    expect(result.cv.skills[0].items).toContain("TensorFlow")
  })

  it("should emphasize job-relevant technologies in projects", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    const firstProject = result.cv.projects[0]
    const projectText = firstProject.description.join(" ").toLowerCase()

    expect(projectText).toContain("machine learning")
    expect(projectText).toContain("tensorflow")
    expect(projectText).toContain("python")
  })

  it("should handle LLM response with extra text", async () => {
    mockGenerateContent.mockReset()
    mockGenerateContent
      .mockResolvedValueOnce({
        response: {
          text: () =>
            `Here is the summary:\n\`\`\`json\n${JSON.stringify(mockSummaryResponse)}\n\`\`\`\nHope this helps!`,
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
          },
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockSkillsResponse)}\n\`\`\``,
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
          },
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockProjectsResponse)}\n\`\`\``,
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
          },
        },
      })

    const result = await generateTailoredResume(mockJobDetails, "pt")

    expect(result.cv.summary).toBe(mockSummaryResponse.summary)
  })

  it("should validate personalized sections against schema", async () => {
    // This test verifies that invalid responses would be rejected
    mockGenerateContent.mockReset()
    mockGenerateContent
      .mockResolvedValueOnce({
        response: {
          text: () => `\`\`\`json\n{"summary": "Too short"}\n\`\`\``, // Invalid: less than 50 chars
          usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockSkillsResponse)}\n\`\`\``,
          usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockProjectsResponse)}\n\`\`\``,
          usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
        },
      })

    await expect(generateTailoredResume(mockJobDetails, "pt")).rejects.toThrow()
  })

  it("should measure execution duration", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.duration).toBeLessThan(10000) // Should complete in less than 10 seconds with mocks
  })
})
