import { describe, it, expect } from "vitest"
import { mapJobDetailsToFormData } from "@/lib/utils/ai-mapper"
import type { JobDetails } from "@/lib/ai/types"

describe("AI Mapper with Analysis", () => {
  const jobDetails: JobDetails = {
    empresa: "Tech Corp",
    cargo: "Developer",
    local: "São Paulo",
    modalidade: "Remoto",
    tipo_vaga: "Estágio",
    requisitos_obrigatorios: ["React", "TypeScript"],
    requisitos_desejaveis: ["Node.js"],
    responsabilidades: ["Desenvolver features"],
    beneficios: ["VR", "VT"],
    salario: "R$ 2000",
    idioma_vaga: "pt",
  }

  const analiseMarkdown = "# Análise\n\n## 🏢 Sobre a Empresa\nInfo..."

  it("should map analysis to observacoes when provided", () => {
    const result = mapJobDetailsToFormData(jobDetails, analiseMarkdown)

    expect(result.observacoes).toBe(analiseMarkdown)
  })

  it("should fallback to buildObservacoes when no analysis provided", () => {
    const result = mapJobDetailsToFormData(jobDetails)

    expect(result.observacoes).toContain("**Requisitos Obrigatórios:**")
    expect(result.observacoes).toContain("React")
  })
})
