/**
 * Validation utilities for AI-generated analysis
 */

const MIN_ANALYSIS_LENGTH = 200
const MAX_ANALYSIS_LENGTH = 10000

const REQUIRED_SECTIONS = [
  /## 🏢 Sobre a Empresa/,
  /## 💡 Oportunidades para se Destacar/,
  /## 🎯 Fit Técnico e Cultural/,
  /## 🗣️ Preparação para Entrevista/,
]

/**
 * Validates that analysis markdown meets quality requirements
 * @param markdown - Analysis markdown to validate
 * @returns true if valid, false otherwise
 */
export function validateAnalysisMarkdown(markdown: string): boolean {
  // Check length constraints
  if (markdown.length < MIN_ANALYSIS_LENGTH || markdown.length > MAX_ANALYSIS_LENGTH) {
    return false
  }

  // Check all required sections are present
  return REQUIRED_SECTIONS.every((regex) => regex.test(markdown))
}
