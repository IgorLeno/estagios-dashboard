import { describe, it, expect } from "vitest"
import { validateAnalysisMarkdown } from "@/lib/ai/validation"

describe("Analysis Validation", () => {
  const validAnalysis = `
# Análise da Vaga - Dev @ Empresa

## 🏢 Sobre a Empresa
Empresa de tecnologia com 500+ funcionários.

## 💡 Oportunidades para se Destacar
Suas habilidades em React são um diferencial.

## 🎯 Fit Técnico e Cultural
Score: 4/5 estrelas baseado em match de 80% dos requisitos.

## 🗣️ Preparação para Entrevista
1. Quais são os principais desafios técnicos?
2. Como funciona o processo de code review?
  `.trim()

  it("should validate complete analysis", () => {
    expect(validateAnalysisMarkdown(validAnalysis)).toBe(true)
  })

  it("should reject too short analysis", () => {
    const tooShort = "# Análise\n\nMuito curta"
    expect(validateAnalysisMarkdown(tooShort)).toBe(false)
  })

  it("should reject too long analysis", () => {
    const tooLong = "# Análise\n\n" + "a".repeat(15000)
    expect(validateAnalysisMarkdown(tooLong)).toBe(false)
  })

  it("should reject analysis missing required sections", () => {
    const missing = `
# Análise da Vaga

## 🏢 Sobre a Empresa
Info

## 💡 Oportunidades
Info
    `.trim()

    expect(validateAnalysisMarkdown(missing)).toBe(false)
  })

  it("should accept analysis with all sections", () => {
    const complete = `
# Análise

## 🏢 Sobre a Empresa
Lorem ipsum dolor sit amet

## 💡 Oportunidades para se Destacar
Lorem ipsum dolor sit amet

## 🎯 Fit Técnico e Cultural
Lorem ipsum dolor sit amet

## 🗣️ Preparação para Entrevista
Lorem ipsum dolor sit amet

## 📋 Extra
Lorem ipsum dolor sit amet
    `.trim()

    expect(validateAnalysisMarkdown(complete)).toBe(true)
  })
})
