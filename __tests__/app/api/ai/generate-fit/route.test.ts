import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/ai/generate-fit/route"
import { NextRequest } from "next/server"

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGenerateContent = vi.fn()

vi.mock("@/lib/ai/config", () => ({
  validateAIConfig: vi.fn(() => Promise.resolve(true)),
  createAIModel: vi.fn(() => ({
    generateContent: mockGenerateContent,
  })),
  loadUserAIConfig: vi.fn(() =>
    Promise.resolve({
      modelo_gemini: "x-ai/grok-4.1-fast",
      temperatura: 0.3,
      max_tokens: 4096,
      top_p: 0.95,
    })
  ),
  AI_TIMEOUT_CONFIG: {
    resumeGenerationTimeoutMs: 110000,
  },
}))

vi.mock("@/lib/ai/utils", () => ({
  withTimeout: vi.fn((promise: Promise<unknown>) => promise),
  TimeoutError: class TimeoutError extends Error {
    timeoutMs: number
    constructor(message: string, timeoutMs = 0) {
      super(message)
      this.name = "TimeoutError"
      this.timeoutMs = timeoutMs
    }
  },
}))

vi.mock("@/lib/ai/models", () => ({
  isValidModelId: vi.fn(() => true),
  DEFAULT_MODEL: "x-ai/grok-4.1-fast",
}))

const mockSupabaseSingle = vi.fn()
const mockSupabaseUpdate = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-123" } } })),
      },
      from: vi.fn((table: string) => {
        if (table === "vagas_estagio") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockSupabaseSingle,
              })),
            })),
            update: vi.fn(() => ({
              eq: mockSupabaseUpdate,
            })),
          }
        }
        return {}
      }),
    })
  ),
}))

vi.mock("@/lib/supabase/candidate-profile", () => ({
  getCandidateProfile: vi.fn(() =>
    Promise.resolve({
      curriculo_geral_md: "# João Silva\n\n## Perfil Profissional\n\nProfissional com foco em dados.\n\n## Competências\n\n**Análise de Dados**: SQL, Python\n\n## Projetos\n\n**Projeto A** _(2023)_\n\nDesenvolvimento de dashboards.",
      curriculo_geral_md_en: "",
    })
  ),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/ai/generate-fit", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

const MOCK_VAGA = {
  id: "00000000-0000-0000-0000-000000000001",
  empresa: "Tech Corp",
  cargo: "Analista de BI",
  local: "São Paulo",
  modalidade: "Remoto",
  tipo_vaga: "Estágio",
  requisitos_obrigatorios: ["SQL", "Power BI"],
  requisitos_desejaveis: [],
  responsabilidades: ["Criar dashboards"],
  salario: null,
  idioma_vaga: "pt",
}

const MOCK_FIT_MARKDOWN = "# João Silva\n\n## Perfil Profissional\n\nProfissional com foco em BI e dashboards.\n\n## Competências\n\n**Análise de Dados**: Power BI, SQL, Python\n\n## Projetos\n\n**Projeto A** _(2023)_\n\nDashboards de indicadores."

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/ai/generate-fit", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabaseSingle.mockResolvedValue({ data: MOCK_VAGA, error: null })
    mockSupabaseUpdate.mockResolvedValue({ error: null })
    mockGenerateContent.mockResolvedValue({
      response: { text: () => MOCK_FIT_MARKDOWN },
    })
  })

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/ai/generate-fit", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it("returns 400 for missing required fields", async () => {
    const req = makeRequest({ language: "pt" }) // vagaId missing

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it("returns 404 when vaga is not found", async () => {
    mockSupabaseSingle.mockResolvedValue({ data: null, error: { message: "Not found" } })

    const req = makeRequest({ vagaId: "00000000-0000-0000-0000-000000000001", language: "pt" })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/vaga not found/i)
  })

  it("returns 400 when candidate has no general curriculum", async () => {
    const { getCandidateProfile } = await import("@/lib/supabase/candidate-profile")
    vi.mocked(getCandidateProfile).mockResolvedValueOnce({
      curriculo_geral_md: "",
      curriculo_geral_md_en: "",
    } as never)

    const req = makeRequest({ vagaId: "00000000-0000-0000-0000-000000000001", language: "pt" })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/currículo geral/i)
  })

  it("returns success with markdown when LLM generates fit", async () => {
    const req = makeRequest({ vagaId: "00000000-0000-0000-0000-000000000001", language: "pt" })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.markdown).toBe(MOCK_FIT_MARKDOWN)
    expect(body.data.language).toBe("pt")
  })

  it("falls back to curriculo_geral_md when EN markdown is empty", async () => {
    const req = makeRequest({ vagaId: "00000000-0000-0000-0000-000000000001", language: "en" })
    const res = await POST(req)

    // Should succeed using the PT fallback general curriculum
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})
