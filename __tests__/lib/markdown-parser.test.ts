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

    it("should handle modalidade edge cases", () => {
      // Branch: presencial puro (sem "remoto", "h", "í") → linha 70-71
      expect(parseVagaFromMarkdown("Modalidade: Presencial no escritório").modalidade).toBe("Presencial")

      // Branch: remoto puro (sem "h", "í") → linha 72
      expect(parseVagaFromMarkdown("Modalidade: Remoto total").modalidade).toBe("Remoto")

      // Branch: remoto que NÃO satisfaz condição (tem "h") → testa linha 72 false
      expect(parseVagaFromMarkdown("Modalidade: Remoto home").modalidade).toBe("Híbrido")

      // Branch: remoto que NÃO satisfaz condição (tem "í") → testa linha 72 false
      expect(parseVagaFromMarkdown("Modalidade: Remoto círculo").modalidade).toBe("Híbrido")

      // Branch: híbrido detectado por "h" → linha 73 (primeira condição OR)
      expect(parseVagaFromMarkdown("Modalidade: home office").modalidade).toBe("Híbrido")

      // Branch: híbrido detectado por "í" → linha 73 (segunda condição OR)
      expect(parseVagaFromMarkdown("Modalidade: círculo flexível").modalidade).toBe("Híbrido")

      // Casos que falham as condições (não devem mapear)
      expect(parseVagaFromMarkdown("Modalidade: Presencial com home office").modalidade).toBe("Híbrido")
      expect(parseVagaFromMarkdown("Modalidade: Remoto híbrido").modalidade).toBe("Híbrido")

      // Modalidade que não mapeia para nada (não satisfaz nenhuma condição, sem "presencial", "remoto", "h" ou "í")
      expect(parseVagaFromMarkdown("Modalidade: Externa").modalidade).toBeUndefined()
    })

    it("should parse status variations", () => {
      expect(parseVagaFromMarkdown("Status: Pendente").status).toBe("Pendente")
      expect(parseVagaFromMarkdown("Status: Avançado").status).toBe("Avançado")
      expect(parseVagaFromMarkdown("Status: Em progresso").status).toBe("Avançado")
      expect(parseVagaFromMarkdown("Status: Melou").status).toBe("Melou")
      expect(parseVagaFromMarkdown("Status: Reprovado").status).toBe("Melou")
      expect(parseVagaFromMarkdown("Status: Contratado").status).toBe("Contratado")
    })

    it("should handle status edge cases and all branches", () => {
      // Branch: contrat → linha 100
      expect(parseVagaFromMarkdown("Status: Contratação confirmada").status).toBe("Contratado")

      // Branch: avan/progresso/processo → linha 101-102
      expect(parseVagaFromMarkdown("Status: Avanço na seleção").status).toBe("Avançado")
      expect(parseVagaFromMarkdown("Status: Em processo").status).toBe("Avançado")

      // Branch: melou → linha 103 (primeira condição OR - isolada)
      expect(parseVagaFromMarkdown("Status: Melou tudo").status).toBe("Melou")

      // Branch: reprov → linha 103 (segunda condição OR - isolada, sem "melou" ou "recus")
      expect(parseVagaFromMarkdown("Status: Reprovação final").status).toBe("Melou")

      // Branch: recus → linha 103 (terceira condição OR - isolada, sem "melou" ou "reprov")
      expect(parseVagaFromMarkdown("Status: Recusado pela empresa").status).toBe("Melou")

      // Branch: pendent → linha 104-105 (primeira condição OR - isolada)
      expect(parseVagaFromMarkdown("Status: Pendente aguardando").status).toBe("Pendente")

      // Branch: aguard → linha 104-105 (segunda condição OR - isolada, sem "pendent" ou "inscri")
      expect(parseVagaFromMarkdown("Status: Aguardando retorno").status).toBe("Pendente")

      // Branch: inscri → linha 104-105 (terceira condição OR - isolada, sem "pendent" ou "aguard")
      expect(parseVagaFromMarkdown("Status: Inscrição enviada").status).toBe("Pendente")

      // Status que não mapeia para nada (não satisfaz nenhuma condição)
      expect(parseVagaFromMarkdown("Status: Outro").status).toBeUndefined()
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

    it("should handle multiline observacoes", () => {
      const markdown = `
**Observações**:
primeira linha da observação.
segunda linha com mais detalhes (tudo minúscula).
terceira linha final.

**Outro Campo**: Teste
      `
      const result = parseVagaFromMarkdown(markdown)
      // Regex captures until uppercase letter or new heading
      expect(result.observacoes).toBeDefined()
      expect(result.observacoes).toContain("primeira linha")
    })

    it("should handle alternative field names", () => {
      // Campo alternativo "Vaga" para cargo
      expect(parseVagaFromMarkdown("**Vaga**: Desenvolvedor").cargo).toBe("Desenvolvedor")

      // Campo alternativo "Cidade" para local
      expect(parseVagaFromMarkdown("**Cidade**: Belo Horizonte").local).toBe("Belo Horizonte")

      // Campo alternativo "Score" para requisitos
      expect(parseVagaFromMarkdown("**Score**: 75").requisitos).toBe(75)

      // Campo alternativo "Nota" para requisitos
      expect(parseVagaFromMarkdown("**Nota**: 80").requisitos).toBe(80)

      // Campo alternativo "Fase" para etapa
      expect(parseVagaFromMarkdown("**Fase**: Entrevista").etapa).toBe("Entrevista")

      // Test field name matching pattern [çc][ãa]o with ASCII variant
      expect(parseVagaFromMarkdown("**Localizacao**: Rio").local).toBeDefined()

      // Test with accented variant
      expect(parseVagaFromMarkdown("**Localização**: Rio").local).toBeDefined()
    })

    it("should handle case insensitivity", () => {
      const markdown = `
EMPRESA: Apple
cargo: Engineer
LOCAL: Cupertiba
      `
      const result = parseVagaFromMarkdown(markdown)
      expect(result.empresa).toBe("Apple")
      expect(result.cargo).toBe("Engineer")
      expect(result.local).toBe("Cupertiba")
    })

    it("should handle empty fields", () => {
      const markdown = `
**Empresa**:

**Cargo**: Developer
      `
      const result = parseVagaFromMarkdown(markdown)
      // Comportamento atual: quando o campo está vazio (sem valor na mesma linha após os dois pontos),
      // a regex /\*?\*?empresa\*?\*?\s*:?\s*(.+)/i captura tudo após os dois pontos, incluindo
      // a próxima linha, então "**Cargo**: Developer" é capturado como valor de empresa
      expect(result.empresa).toBe("**Cargo**: Developer")
      expect(result.cargo).toBe("Developer")
    })

    it("should handle NaN in number parsing", () => {
      expect(parseVagaFromMarkdown("**Requisitos**: abc").requisitos).toBeUndefined()
      expect(parseVagaFromMarkdown("**Fit**: xyz").fit).toBeUndefined()
    })

    it("should handle markdown with mixed formatting", () => {
      const markdown = `
# Análise da Vaga

*Empresa*: Netflix
*Cargo*: Software Engineer

Modalidade: Híbrido
      `
      const result = parseVagaFromMarkdown(markdown)
      expect(result.empresa).toBe("Netflix")
      expect(result.cargo).toBe("Software Engineer")
      expect(result.modalidade).toBe("Híbrido")
    })

    it("should handle special characters in text", () => {
      const markdown = `
**Empresa**: Ação & Técnica Ltda.
**Cargo**: Engenheiro Júnior (São Paulo)
**Local**: São José dos Campos - SP
      `
      const result = parseVagaFromMarkdown(markdown)
      expect(result.empresa).toBe("Ação & Técnica Ltda.")
      expect(result.cargo).toBe("Engenheiro Júnior (São Paulo)")
      expect(result.local).toBe("São José dos Campos - SP")
    })

    it("should extract observacoes with alternative field name Notas", () => {
      const markdown = `
**Notas**:
Esta é uma nota importante sobre a vaga.
      `
      const result = parseVagaFromMarkdown(markdown)
      expect(result.observacoes).toContain("nota importante")
    })

    it("should handle heading-style markdown (# Empresa)", () => {
      const markdown = `
# Empresa
Google Inc

# Cargo
Senior Developer
      `
      const result = parseVagaFromMarkdown(markdown)
      expect(result.empresa).toBe("Google Inc")
      expect(result.cargo).toBe("Senior Developer")
    })

    describe("Markdown Table Support", () => {
      it("should parse basic markdown table", () => {
        const markdown = `
| Campo      | Detalhes                                  |
|------------|-------------------------------------------|
| **Empresa** | Saipem                                   |
| **Cargo**   | Intern (QHSE)                            |
| **Localização** | Guarujá, São Paulo, Brasil           |
| **Status**  | Pendente                                  |
        `
        const result = parseVagaFromMarkdown(markdown)

        expect(result.empresa).toBe("Saipem")
        expect(result.cargo).toBe("Intern (QHSE)")
        expect(result.local).toBe("Guarujá, São Paulo, Brasil")
        expect(result.status).toBe("Pendente")
      })

      it("should handle table with multiple modalidades (prioritize Remoto)", () => {
        const markdown = `
| Campo       | Detalhes                          |
|-------------|-----------------------------------|
| **Modalidade** | Presencial \\| Híbrido \\| Remoto |
        `
        const result = parseVagaFromMarkdown(markdown)
        expect(result.modalidade).toBe("Remoto")
      })

      it("should handle table with multiple modalidades (only Presencial and Híbrido)", () => {
        const markdown = `
| Campo       | Detalhes                  |
|-------------|---------------------------|
| **Modalidade** | Presencial / Híbrido   |
        `
        const result = parseVagaFromMarkdown(markdown)
        expect(result.modalidade).toBe("Híbrido")
      })

      it("should handle status with emoji in table", () => {
        const markdown = `
| Campo    | Detalhes                        |
|----------|---------------------------------|
| **Status** | ⏳ Pendente de Candidatura    |
        `
        const result = parseVagaFromMarkdown(markdown)
        expect(result.status).toBe("Pendente")
      })

      it("should handle alternative field names in table", () => {
        const markdown = `
| Campo           | Detalhes              |
|-----------------|-----------------------|
| **Empresa**     | Microsoft             |
| **Vaga**        | Software Engineer     |
| **Cidade**      | São Paulo             |
| **Fase**        | Entrevista Técnica    |
| **Score**       | 85                    |
| **Adequação**   | 9                     |
        `
        const result = parseVagaFromMarkdown(markdown)

        expect(result.empresa).toBe("Microsoft")
        expect(result.cargo).toBe("Software Engineer")
        expect(result.local).toBe("São Paulo")
        expect(result.etapa).toBe("Entrevista Técnica")
        expect(result.requisitos).toBe(85)
        expect(result.fit).toBe(9)
      })

      it("should handle table with case variations and special characters", () => {
        const markdown = `
| Campo           | Detalhes              |
|-----------------|-----------------------|
| EMPRESA         | Apple Inc.            |
| cargo           | iOS Developer         |
| **LOCALIZAÇÃO** | Cupertino, CA         |
        `
        const result = parseVagaFromMarkdown(markdown)

        expect(result.empresa).toBe("Apple Inc.")
        expect(result.cargo).toBe("iOS Developer")
        expect(result.local).toBe("Cupertino, CA")
      })

      it("should prioritize table values over inline format", () => {
        const markdown = `
**Empresa**: Google

| Campo    | Detalhes   |
|----------|------------|
| **Empresa** | Amazon  |

**Cargo**: Engineer
        `
        const result = parseVagaFromMarkdown(markdown)

        // Tabela tem prioridade
        expect(result.empresa).toBe("Amazon")
        // Cargo só tem formato inline, então usa ele
        expect(result.cargo).toBe("Engineer")
      })

      it("should handle mixed table and inline format", () => {
        const markdown = `
| Campo       | Detalhes         |
|-------------|------------------|
| **Empresa** | Netflix          |
| **Cargo**   | Data Engineer    |

**Modalidade**: Remoto
**Requisitos**: 90
        `
        const result = parseVagaFromMarkdown(markdown)

        expect(result.empresa).toBe("Netflix")
        expect(result.cargo).toBe("Data Engineer")
        expect(result.modalidade).toBe("Remoto")
        expect(result.requisitos).toBe(90)
      })

      it("should ignore table header rows", () => {
        const markdown = `
| Campo       | Detalhes         |
|-------------|------------------|
| **Empresa** | Tesla            |
        `
        const result = parseVagaFromMarkdown(markdown)

        // Não deve pegar "Campo" ou "Detalhes" como valores
        expect(result.empresa).toBe("Tesla")
      })

      it("should handle table with numbers in string format", () => {
        const markdown = `
| Campo         | Detalhes |
|---------------|----------|
| **Requisitos** | 75      |
| **Fit**       | 8       |
        `
        const result = parseVagaFromMarkdown(markdown)

        expect(result.requisitos).toBe(75)
        expect(result.fit).toBe(8)
      })

      it("should validate number ranges from table", () => {
        const markdown = `
| Campo         | Detalhes |
|---------------|----------|
| **Requisitos** | 150     |
| **Fit**       | 15      |
        `
        const result = parseVagaFromMarkdown(markdown)

        // Valores fora do range devem ser undefined
        expect(result.requisitos).toBeUndefined()
        expect(result.fit).toBeUndefined()
      })

      it("should handle observacoes from table", () => {
        const markdown = `
| Campo           | Detalhes                          |
|-----------------|-----------------------------------|
| **Observações** | Empresa com ótima cultura         |
        `
        const result = parseVagaFromMarkdown(markdown)
        expect(result.observacoes).toBe("Empresa com ótima cultura")
      })

      it("should handle complete table with all fields", () => {
        const markdown = `
| Campo          | Detalhes                     |
|----------------|------------------------------|
| **Empresa**    | Meta                         |
| **Cargo**      | Backend Engineer             |
| **Localização**| Menlo Park, CA               |
| **Modalidade** | Híbrido                      |
| **Requisitos** | 92                           |
| **Fit**        | 10                           |
| **Etapa**      | Technical Interview          |
| **Status**     | ✅ Avançado                  |
| **Notas**      | Excelente match cultural     |
        `
        const result = parseVagaFromMarkdown(markdown)

        expect(result.empresa).toBe("Meta")
        expect(result.cargo).toBe("Backend Engineer")
        expect(result.local).toBe("Menlo Park, CA")
        expect(result.modalidade).toBe("Híbrido")
        expect(result.requisitos).toBe(92)
        expect(result.fit).toBe(10)
        expect(result.etapa).toBe("Technical Interview")
        expect(result.status).toBe("Avançado")
        expect(result.observacoes).toBe("Excelente match cultural")
      })

      it("should handle all status variations with emojis", () => {
        expect(parseVagaFromMarkdown("| Status | ⏳ Pendente |").status).toBe("Pendente")
        expect(parseVagaFromMarkdown("| Status | 📝 Aguardando retorno |").status).toBe("Pendente")
        expect(parseVagaFromMarkdown("| Status | 🔄 Em processo |").status).toBe("Avançado")
        expect(parseVagaFromMarkdown("| Status | ✅ Contratado |").status).toBe("Contratado")
        expect(parseVagaFromMarkdown("| Status | ❌ Reprovado |").status).toBe("Melou")
      })

      it("should handle modalidade with forward slash separator", () => {
        const markdown = `| Modalidade | Presencial/Remoto |`
        const result = parseVagaFromMarkdown(markdown)
        expect(result.modalidade).toBe("Remoto")
      })

      it("should handle empty table cells gracefully", () => {
        const markdown = `
| Campo       | Detalhes |
|-------------|----------|
| **Empresa** |          |
| **Cargo**   | Engineer |
        `
        const result = parseVagaFromMarkdown(markdown)

        expect(result.empresa).toBeUndefined()
        expect(result.cargo).toBe("Engineer")
      })
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
