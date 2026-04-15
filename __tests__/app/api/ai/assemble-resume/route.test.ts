import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST, extractHeaderAndEducation } from "@/app/api/ai/assemble-resume/route"
import { NextRequest } from "next/server"

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/ai/pdf-generator", () => ({
  generatePDFFromHTML: vi.fn(() => Promise.resolve(Buffer.from("PDF_MOCK_CONTENT"))),
}))

vi.mock("@/lib/ai/markdown-converter", () => ({
  renderMarkdownResumeToHtml: vi.fn((md: string) =>
    Promise.resolve(`<html><body>${md}</body></html>`)
  ),
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

const MOCK_GENERAL_CV_PT = `# JOÃO SILVA

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
Desenvolvimento de pipeline automatizado.
</div>

## CERTIFICAÇÕES

**Google Data Analytics** — Coursera (2023)`

vi.mock("@/lib/supabase/candidate-profile", () => ({
  getCandidateProfile: vi.fn(() =>
    Promise.resolve({
      curriculo_geral_md: MOCK_GENERAL_CV_PT,
      curriculo_geral_md_en: "",
    })
  ),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/ai/assemble-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const FIT_MARKDOWN = `## PERFIL PROFISSIONAL

Profissional orientado a dados com forte experiência em SQL.

## COMPETÊNCIAS

**Análise de Dados**: Python, SQL

**Idiomas**: Inglês Avançado

## PROJETOS RELEVANTES

**Pipeline de Dados** _(2023)_
<div style="text-align: justify;">
Pipeline com foco em qualidade de dados.
</div>

## CERTIFICAÇÕES

**Google Data Analytics** — Coursera (2023)`

// ─── Unit tests for extractHeaderAndEducation ─────────────────────────────────

describe("extractHeaderAndEducation", () => {
  it("extracts everything before PERFIL PROFISSIONAL in PT", () => {
    const result = extractHeaderAndEducation(MOCK_GENERAL_CV_PT, "pt")
    expect(result).toContain("JOÃO SILVA")
    expect(result).toContain("FORMAÇÃO ACADÊMICA")
    expect(result).not.toContain("PERFIL PROFISSIONAL")
    expect(result).not.toContain("COMPETÊNCIAS")
    expect(result).not.toContain("PROJETOS RELEVANTES")
    expect(result).not.toContain("CERTIFICAÇÕES")
  })

  it("extracts everything before PROFESSIONAL PROFILE in EN", () => {
    const enMarkdown = `# JOÃO SILVA

email@example.com

## EDUCATION

**B.S. in Computer Science**

## PROFESSIONAL PROFILE

Experienced data engineer.

## COMPETENCIES

**Data Analysis**: SQL`

    const result = extractHeaderAndEducation(enMarkdown, "en")
    expect(result).toContain("EDUCATION")
    expect(result).not.toContain("PROFESSIONAL PROFILE")
    expect(result).not.toContain("COMPETENCIES")
  })

  it("returns full markdown when no adaptable section is found", () => {
    const onlyHeader = "# JOÃO SILVA\n\nemail@example.com"
    const result = extractHeaderAndEducation(onlyHeader, "pt")
    expect(result).toBe(onlyHeader)
  })

  it("handles markdown with all 4 adaptable sections — finds the earliest one", () => {
    const md = `# Header

## COMPETÊNCIAS

items

## PERFIL PROFISSIONAL

profile`

    // COMPETÊNCIAS comes before PERFIL, so cut should be at COMPETÊNCIAS
    const result = extractHeaderAndEducation(md, "pt")
    expect(result).toContain("Header")
    expect(result).not.toContain("COMPETÊNCIAS")
    expect(result).not.toContain("PERFIL PROFISSIONAL")
  })
})

// ─── Integration tests for POST ───────────────────────────────────────────────

describe("POST /api/ai/assemble-resume", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/ai/assemble-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when fitMarkdown is too short", async () => {
    const req = makeRequest({ fitMarkdown: "short", language: "pt" })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it("assembles and returns markdown + pdfBase64 for valid request", async () => {
    const req = makeRequest({
      fitMarkdown: FIT_MARKDOWN,
      language: "pt",
      jobAnalysisData: { empresa: "Acme Corp", cargo: "Engenheiro de Dados" },
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.markdown).toContain("JOÃO SILVA") // header extracted from general CV
    expect(body.data.markdown).toContain("FORMAÇÃO ACADÊMICA") // education preserved
    expect(body.data.markdown).toContain("PERFIL PROFISSIONAL") // from fitMarkdown
    expect(body.data.markdown).toContain("Profissional orientado a dados") // from fitMarkdown
    expect(body.data.pdfBase64).toBeTruthy()
    expect(body.data.filename).toContain("pt")
  })

  it("the assembled markdown preserves the 4 fit sections intact", async () => {
    const req = makeRequest({
      fitMarkdown: FIT_MARKDOWN,
      language: "pt",
    })

    const res = await POST(req)
    const body = await res.json()

    const md: string = body.data.markdown
    expect(md).toContain("## PERFIL PROFISSIONAL")
    expect(md).toContain("## COMPETÊNCIAS")
    expect(md).toContain("## PROJETOS RELEVANTES")
    expect(md).toContain("## CERTIFICAÇÕES")
  })

  it("includes html in response", async () => {
    const req = makeRequest({
      fitMarkdown: FIT_MARKDOWN,
      language: "pt",
    })

    const res = await POST(req)
    const body = await res.json()

    expect(body.data.html).toBeTruthy()
    expect(body.data.html).toContain("<html>")
  })
})
