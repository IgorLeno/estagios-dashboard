import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/ai/generate-fit-markdown/route"
import { callGrok } from "@/lib/ai/grok-client"
import { NextRequest } from "next/server"

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/ai/grok-client", () => ({
  callGrok: vi.fn(),
  validateGrokConfig: vi.fn(() => Promise.resolve(true)),
}))

vi.mock("@/lib/ai/config", () => ({
  loadUserAIConfig: vi.fn(() =>
    Promise.resolve({
      modelo_gemini: "x-ai/grok-4.1-fast",
      temperatura: 0.7,
      max_tokens: 4096,
      top_p: 0.9,
    })
  ),
}))

vi.mock("@/lib/ai/models", () => ({
  isValidModelId: vi.fn(() => true),
  DEFAULT_MODEL: "x-ai/grok-4.1-fast",
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-123" } } })),
      },
    })
  ),
}))

const MOCK_GENERAL_CV = `# JOÃO SILVA

**Engenheiro de Dados**

email@example.com | +55 (11) 99999-9999

---

## FORMAÇÃO ACADÊMICA

**Bacharelado em Ciência da Computação** | USP
_Conclusão: 2024_

---

## PERFIL PROFISSIONAL

Profissional com foco em dados e análise.

## COMPETÊNCIAS

**Análise de Dados**: SQL, Python

**Idiomas**: Inglês Avançado

## PROJETOS RELEVANTES

**Pipeline de Dados** _(2023)_
<div style="text-align: justify;">
Desenvolvimento de pipeline automatizado em Python.
</div>

## CERTIFICAÇÕES

**Google Data Analytics** — Coursera (2023)`

vi.mock("@/lib/supabase/candidate-profile", () => ({
  getCandidateProfile: vi.fn(() =>
    Promise.resolve({
      curriculo_geral_md: MOCK_GENERAL_CV,
      curriculo_geral_md_en: "",
    })
  ),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/ai/generate-fit-markdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const MOCK_FIT_SECTIONS = `## PERFIL PROFISSIONAL

Profissional orientado a dados com experiência em SQL e Python para análise de grandes volumes.

## COMPETÊNCIAS

**Análise de Dados**: Python, SQL

**Idiomas**: Inglês Avançado

## PROJETOS RELEVANTES

**Pipeline de Dados** _(2023)_
<div style="text-align: justify;">
Desenvolvimento de pipeline automatizado em Python com foco em qualidade de dados.
</div>

## CERTIFICAÇÕES

**Google Data Analytics** — Coursera (2023)`

const mockCallGrok = vi.mocked(callGrok)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/ai/generate-fit-markdown", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCallGrok.mockResolvedValue({
      content: MOCK_FIT_SECTIONS,
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
    })
  })

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/ai/generate-fit-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when jobDescription is too short", async () => {
    const req = makeRequest({ jobDescription: "too short" })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it("returns fit sections for valid request", async () => {
    const req = makeRequest({
      jobDescription:
        "Vaga para engenheiro de dados com experiência em SQL e Python para análise de dados em grande escala.",
      language: "pt",
      toneOptions: {
        estilo: "padrao",
        foco: "padrao",
        enfase: "padrao",
      },
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.markdown).toBe(MOCK_FIT_SECTIONS)
    expect(body.metadata.model).toBeDefined()
  })

  it("includes tone instructions when non-default options are set", async () => {
    const req = makeRequest({
      jobDescription:
        "Vaga para engenheiro de dados com experiência em SQL e Python para análise de dados em grande escala.",
      language: "pt",
      toneOptions: {
        estilo: "tecnico_formal",
        foco: "keywords",
        enfase: "padrao",
      },
    })

    await POST(req)

    expect(mockCallGrok).toHaveBeenCalledOnce()
    const [messages] = mockCallGrok.mock.calls[0]
    const userMessage = (messages as Array<{ role: string; content: string }>).find((m) => m.role === "user")

    expect(userMessage?.content).toContain("ADDITIONAL TONE REQUIREMENTS")
    expect(userMessage?.content).toContain("linguagem técnica e formal")
    expect(userMessage?.content).toContain("palavras-chave")
  })

  it("does not include tone instructions when all options are padrao", async () => {
    const req = makeRequest({
      jobDescription:
        "Vaga para engenheiro de dados com experiência em SQL e Python para análise de dados em grande escala.",
      language: "pt",
      toneOptions: {
        estilo: "padrao",
        foco: "padrao",
        enfase: "padrao",
      },
    })

    await POST(req)

    const [messages] = mockCallGrok.mock.calls[0]
    const userMessage = (messages as Array<{ role: string; content: string }>).find((m) => m.role === "user")
    expect(userMessage?.content).not.toContain("ADDITIONAL TONE REQUIREMENTS")
  })

  it("uses personalizado_estilo text when estilo is personalizado_estilo", async () => {
    const req = makeRequest({
      jobDescription:
        "Vaga para engenheiro de dados com experiência em SQL e Python para análise de dados em grande escala.",
      language: "pt",
      toneOptions: {
        estilo: "personalizado_estilo",
        estilo_customizado: "Use tom inspiracional e motivador",
        foco: "padrao",
        enfase: "padrao",
      },
    })

    await POST(req)

    const [messages] = mockCallGrok.mock.calls[0]
    const userMessage = (messages as Array<{ role: string; content: string }>).find((m) => m.role === "user")
    expect(userMessage?.content).toContain("Use tom inspiracional e motivador")
  })

  it("returns 500 when LLM returns content that is too short", async () => {
    mockCallGrok.mockResolvedValue({
      content: "short",
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    })

    const req = makeRequest({
      jobDescription:
        "Vaga para engenheiro de dados com experiência em SQL e Python para análise de dados em grande escala.",
      language: "pt",
    })

    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
  })

  it("uses EN section names in system prompt when language is en", async () => {
    const req = makeRequest({
      jobDescription:
        "Data engineering position requiring SQL and Python experience for large-scale data analysis workflows.",
      language: "en",
    })

    await POST(req)

    const [messages] = mockCallGrok.mock.calls[0]
    const systemMessage = (messages as Array<{ role: string; content: string }>).find((m) => m.role === "system")
    expect(systemMessage?.content).toContain("## PROFESSIONAL PROFILE")
    expect(systemMessage?.content).toContain("## COMPETENCIES")
  })
})
