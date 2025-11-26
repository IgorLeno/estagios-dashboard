import { describe, it, expect, vi } from "vitest"
import { extractJsonFromResponse, parseJobWithAnalysis } from "@/lib/ai/job-parser"

describe("extractJsonFromResponse", () => {
  it("should extract JSON from code fence", () => {
    const response = '```json\n{"empresa": "Test Corp"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: "Test Corp" })
  })

  it("should extract JSON without code fence", () => {
    const response = '{"empresa": "Test Corp"}'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: "Test Corp" })
  })

  it("should extract JSON with extra text before", () => {
    const response = 'Here is the data:\n```json\n{"empresa": "Test"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: "Test" })
  })

  it("should extract JSON with extra text after", () => {
    const response = '```json\n{"empresa": "Test"}\n```\nHope this helps!'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: "Test" })
  })

  it("should throw if no JSON found", () => {
    const response = "No JSON here at all"
    expect(() => extractJsonFromResponse(response)).toThrow("No valid JSON found in LLM response")
  })

  it("should throw if JSON is invalid", () => {
    const response = "```json\n{invalid json}\n```"
    expect(() => extractJsonFromResponse(response)).toThrow()
  })

  it("should handle responses with multiple JSON blocks", () => {
    const response = '```json\n{"first": "block"}\n```\nSome text\n```json\n{"second": "block"}\n```'
    // Deve retornar o primeiro bloco JSON encontrado
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ first: "block" })
  })

  it("should handle nested or mixed fence types", () => {
    const response = 'Here is some text with ```code``` inside\n```json\n{"data": "value"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ data: "value" })
  })

  it("should handle JSON with different language tags in fence", () => {
    const response = '```javascript\n{"test": "data"}\n```'
    // Como o código procura especificamente por ```json, deve tentar extrair JSON direto
    // O JSON direto deve ser encontrado mesmo sem a tag json
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ test: "data" })
  })

  it("should handle very large JSON payload", () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => `item-${i}`)
    const largeJson = JSON.stringify({ items: largeArray })
    const response = `\`\`\`json\n${largeJson}\n\`\`\``

    const startTime = Date.now()
    const result = extractJsonFromResponse(response)
    const duration = Date.now() - startTime

    expect(result).toBeDefined()
    expect(Array.isArray((result as { items: string[] }).items)).toBe(true)
    expect((result as { items: string[] }).items.length).toBe(1000)
    // Deve processar em tempo razoável (< 1 segundo)
    expect(duration).toBeLessThan(1000)
  })

  it("should handle JSON blocks with extra whitespace", () => {
    const response = '   ```json   \n   {"test": "data"}   \n   ```   '
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ test: "data" })
  })

  it("should return undefined or throw for empty string input", () => {
    expect(() => extractJsonFromResponse("")).toThrow("No valid JSON found in LLM response")
  })

  it("should return undefined or throw for whitespace-only input", () => {
    expect(() => extractJsonFromResponse("   \n\t  ")).toThrow("No valid JSON found in LLM response")
  })

  it("should handle malformed code fence (missing closing triple backticks)", () => {
    const response = '```json\n{"test": "data"}'
    // Should attempt to parse JSON directly when fence is incomplete
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ test: "data" })
  })

  it("should handle JSON containing unicode/special characters", () => {
    const response = '```json\n{"empresa": "São Paulo", "cargo": "Desenvolvedor", "emoji": "🚀"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({
      empresa: "São Paulo",
      cargo: "Desenvolvedor",
      emoji: "🚀",
    })
  })

  it("should repair JSON with literal newlines in strings", () => {
    // Simulate LLM output with unescaped newlines
    const response = `\`\`\`json
{
  "text": "Line 1
Line 2
Line 3"
}
\`\`\``
    const result = extractJsonFromResponse(response)
    // After repair and parsing, the result should have actual newlines (not escaped)
    expect(result).toEqual({
      text: "Line 1\nLine 2\nLine 3",
    })
  })

  it("should handle JSON with escaped sequences correctly", () => {
    // Ensure repair doesn't break already-escaped content
    const response = `\`\`\`json
{
  "path": "C:\\\\Users\\\\file.txt",
  "text": "Line 1\\nLine 2"
}
\`\`\``
    const result = extractJsonFromResponse(response)
    expect(result.path).toContain("\\")
    expect(result.text).toContain("\n")
  })

  it("should repair JSON with both newlines and quotes", () => {
    // Real-world scenario: markdown analysis with unescaped content
    const response = `\`\`\`json
{
  "analise": "# Title
Text with quotes."
}
\`\`\``
    const result = extractJsonFromResponse(response)
    // After parsing, should have actual newlines
    expect(result.analise).toContain("\n")
    expect(result.analise).toContain("# Title")
  })

  it("should handle already valid JSON without modification", () => {
    const response = `\`\`\`json
{
  "text": "Already\\nEscaped\\nProperly",
  "quote": "With \\"quotes\\""
}
\`\`\``
    const result = extractJsonFromResponse(response)
    // After parsing, escaped sequences become actual characters
    expect(result).toEqual({
      text: "Already\nEscaped\nProperly",
      quote: 'With "quotes"',
    })
  })
})

// Mock the Gemini API
vi.mock("@/lib/ai/config", () => ({
  createAnalysisModel: vi.fn(() => ({
    generateContent: vi.fn(async () => ({
      response: {
        text: () => {
          const analysisMarkdown = `# Análise da Vaga - Dev @ Tech Corp

## 🏢 Sobre a Empresa
Tech Corp é uma empresa de tecnologia moderna focada em React.

## 💡 Oportunidades para se Destacar
Sua experiência com React é um diferencial importante.

## 🎯 Fit Técnico e Cultural
Score: 4/5 estrelas. Excelente match técnico.

## 🗣️ Preparação para Entrevista
1. Pergunte sobre arquitetura do projeto
2. Entenda o processo de code review`

          return `\`\`\`json
{
  "structured_data": {
    "empresa": "Tech Corp",
    "cargo": "Dev",
    "local": "SP",
    "modalidade": "Remoto",
    "tipo_vaga": "Estágio",
    "requisitos_obrigatorios": ["React"],
    "requisitos_desejaveis": [],
    "responsabilidades": ["Code"],
    "beneficios": [],
    "salario": null,
    "idioma_vaga": "pt"
  },
  "analise_markdown": ${JSON.stringify(analysisMarkdown)}
}
\`\`\``
        },
        usageMetadata: {
          promptTokenCount: 500,
          candidatesTokenCount: 1500,
          totalTokenCount: 2000,
        },
      },
    })),
  })),
  ANALYSIS_MODEL_CONFIG: { model: "gemini-2.0-flash-exp" },
}))

vi.mock("@/lib/ai/user-profile", () => ({
  USER_PROFILE: {
    skills: ["React"],
    experience: ["Project X"],
    education: "CS",
    goals: "Get internship",
  },
}))

describe("parseJobWithAnalysis", () => {
  it("should parse job and generate analysis", async () => {
    const jobDescription = "Vaga de Dev React na Tech Corp"

    const result = await parseJobWithAnalysis(jobDescription)

    expect(result.data.empresa).toBe("Tech Corp")
    expect(result.analise).toContain("## 🏢 Sobre a Empresa")
    expect(result.model).toBe("gemini-2.0-flash-exp")
    expect(result.duration).toBeGreaterThan(0)
    expect(result.tokenUsage.totalTokens).toBe(2000)
  })
})
