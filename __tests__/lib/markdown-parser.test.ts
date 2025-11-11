import { describe, it, expect } from "vitest"
import { parseVagaFromMarkdown, isMarkdownFile, sanitizeMarkdown } from "@/lib/markdown-parser"

describe("markdown-parser", () => {
  describe("parseVagaFromMarkdown", () => {
    it("should parse empresa from markdown", () => {
      const markdown = "**Empresa**: Google"
      const result = parseVagaFromMarkdown(markdown)
      expect(result.empresa).toBe("Google")
    })

    it("should parse all fields from complete markdown", () => {
      const markdown = `
**Empresa**: Microsoft
**Cargo**: Engenheiro Químico Jr
**Local**: São Paulo, SP
**Modalidade**: Híbrido
**Requisitos**: 85
**Fit**: 9
**Etapa**: Inscrição
**Status**: Pendente

**Observações**:
Empresa com ótima reputação e benefícios excelentes.
      `
      const result = parseVagaFromMarkdown(markdown)

      expect(result.empresa).toBe("Microsoft")
      expect(result.cargo).toBe("Engenheiro Químico Jr")
      expect(result.local).toBe("São Paulo, SP")
      expect(result.modalidade).toBe("Híbrido")
      expect(result.requisitos).toBe(85)
      expect(result.fit).toBe(9)
      expect(result.etapa).toBe("Inscrição")
      expect(result.status).toBe("Pendente")
      expect(result.observacoes).toContain("ótima reputação")
    })

    it("should parse modalidade variations", () => {
      expect(parseVagaFromMarkdown("Modalidade: Presencial").modalidade).toBe("Presencial")
      expect(parseVagaFromMarkdown("Modalidade: Remoto").modalidade).toBe("Remoto")
      expect(parseVagaFromMarkdown("Modalidade: Híbrido").modalidade).toBe("Híbrido")
    })

    it("should parse status variations", () => {
      expect(parseVagaFromMarkdown("Status: Pendente").status).toBe("Pendente")
      expect(parseVagaFromMarkdown("Status: Avançado").status).toBe("Avançado")
      expect(parseVagaFromMarkdown("Status: Em progresso").status).toBe("Avançado")
      expect(parseVagaFromMarkdown("Status: Melou").status).toBe("Melou")
      expect(parseVagaFromMarkdown("Status: Reprovado").status).toBe("Melou")
      expect(parseVagaFromMarkdown("Status: Contratado").status).toBe("Contratado")
    })

    it("should validate requisitos range (0-100)", () => {
      expect(parseVagaFromMarkdown("Requisitos: 50").requisitos).toBe(50)
      expect(parseVagaFromMarkdown("Requisitos: 0").requisitos).toBe(0)
      expect(parseVagaFromMarkdown("Requisitos: 100").requisitos).toBe(100)
      expect(parseVagaFromMarkdown("Requisitos: 150").requisitos).toBeUndefined()
      expect(parseVagaFromMarkdown("Requisitos: -10").requisitos).toBeUndefined()
    })

    it("should validate fit range (0-10)", () => {
      expect(parseVagaFromMarkdown("Fit: 5").fit).toBe(5)
      expect(parseVagaFromMarkdown("Fit: 0").fit).toBe(0)
      expect(parseVagaFromMarkdown("Fit: 10").fit).toBe(10)
      expect(parseVagaFromMarkdown("Fit: 15").fit).toBeUndefined()
      expect(parseVagaFromMarkdown("Fit: -1").fit).toBeUndefined()
    })

    it("should handle alternative formats", () => {
      const markdown = `
# Análise da Vaga

Empresa: Amazon

Cargo: Estágio em Engenharia

Score: 90

Fit: 8
      `
      const result = parseVagaFromMarkdown(markdown)

      expect(result.empresa).toBe("Amazon")
      expect(result.cargo).toBe("Estágio em Engenharia")
      expect(result.requisitos).toBe(90)
      expect(result.fit).toBe(8)
    })

    it("should return empty object for invalid markdown", () => {
      const result = parseVagaFromMarkdown("Random text without fields")
      expect(Object.keys(result).length).toBe(0)
    })
  })

  describe("isMarkdownFile", () => {
    it("should identify .md files", () => {
      expect(isMarkdownFile("analise.md")).toBe(true)
      expect(isMarkdownFile("ANALISE.MD")).toBe(true)
      expect(isMarkdownFile("documento.txt")).toBe(false)
      expect(isMarkdownFile("arquivo.pdf")).toBe(false)
    })
  })

  describe("sanitizeMarkdown", () => {
    it("should normalize line endings", () => {
      const markdown = "Line 1\r\nLine 2\r\nLine 3"
      const result = sanitizeMarkdown(markdown)
      expect(result).toBe("Line 1\nLine 2\nLine 3")
    })

    it("should remove excessive line breaks", () => {
      const markdown = "Paragraph 1\n\n\n\nParagraph 2"
      const result = sanitizeMarkdown(markdown)
      expect(result).toBe("Paragraph 1\n\nParagraph 2")
    })

    it("should trim whitespace", () => {
      const markdown = "  \n  Content  \n  "
      const result = sanitizeMarkdown(markdown)
      expect(result).toBe("Content")
    })
  })
})
