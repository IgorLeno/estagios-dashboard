import { describe, it, expect, vi } from "vitest"
import { POST, GET } from "@/app/api/ai/generate-resume/route"
import { NextRequest } from "next/server"

// Mock dependencies
vi.mock("@/lib/ai/resume-generator", () => ({
  generateTailoredResume: vi.fn(async () => ({
    cv: {
      language: "pt",
      header: { name: "Test", title: "", email: "", phone: "", location: "", links: [] },
      summary: "Personalized",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      languages: [],
      certifications: [],
    },
    duration: 5000,
    model: "gemini-2.5-flash",
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
  createGeminiClient: vi.fn(() => ({
    // Mock Gemini client if needed
  })),
  GEMINI_CONFIG: {
    model: "gemini-2.5-flash",
    temperature: 0.3,
    maxOutputTokens: 4096,
  },
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
    model: "gemini-2.5-flash",
  })),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
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
})

describe("GET /api/ai/generate-resume", () => {
  it("should return health check status", async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe("ok")
    expect(data.message).toContain("Resume Generator")
  })
})
