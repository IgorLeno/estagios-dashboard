import { describe, it, expect } from "vitest"
import { mapJobDetailsToFormData, buildObservacoes } from "@/lib/utils/ai-mapper"
import type { JobDetails } from "@/lib/ai/types"

describe("mapJobDetailsToFormData", () => {
  it("should map basic fields correctly", () => {
    const apiData: JobDetails = {
      empresa: "Google",
      cargo: "Software Engineer",
      local: "São Paulo, SP",
      modalidade: "Híbrido",
      tipo_vaga: "Júnior",
      requisitos_obrigatorios: ["React", "TypeScript"],
      requisitos_desejaveis: ["Node.js"],
      responsabilidades: ["Develop features"],
      beneficios: ["Health insurance"],
      salario: "R$ 5000",
      idioma_vaga: "pt",
      requisitos_score: 4.5,
      fit: 3.5,
      etapa: "Inscrição",
      status: "Pendente",
    }

    const result = mapJobDetailsToFormData(apiData)

    expect(result.empresa).toBe("Google")
    expect(result.cargo).toBe("Software Engineer")
    expect(result.local).toBe("São Paulo, SP")
    expect(result.modalidade).toBe("Híbrido")
    expect(result.requisitos).toBe("4.5")
    expect(result.fit).toBe("3.5")
    expect(result.etapa).toBe("Inscrição")
    expect(result.status).toBe("Pendente")
  })

  it("should handle missing optional fields", () => {
    const apiData: JobDetails = {
      empresa: "Startup",
      cargo: "Developer",
      local: "Remote",
      modalidade: "Remoto",
      tipo_vaga: "Estágio",
      requisitos_obrigatorios: [],
      requisitos_desejaveis: [],
      responsabilidades: [],
      beneficios: [],
      salario: "Indefinido",
      idioma_vaga: "pt",
      status: "Pendente",
      etapa: "Indefinido",
    }

    const result = mapJobDetailsToFormData(apiData)

    expect(result.requisitos).toBe("")
    expect(result.fit).toBe("")
    expect(result.etapa).toBe("")
    expect(result.status).toBe("Pendente")
    expect(result.observacoes).toBe("")
  })
})

describe("buildObservacoes", () => {
  it("should build formatted observations from arrays", () => {
    const apiData: JobDetails = {
      empresa: "Company",
      cargo: "Role",
      local: "Location",
      modalidade: "Presencial",
      tipo_vaga: "Estágio",
      requisitos_obrigatorios: ["React", "TypeScript"],
      requisitos_desejaveis: ["GraphQL"],
      responsabilidades: ["Code", "Review"],
      beneficios: ["VR", "VT"],
      salario: "Indefinido",
      idioma_vaga: "pt",
      status: "Pendente",
      etapa: "Indefinido",
    }

    const result = buildObservacoes(apiData)

    expect(result).toContain("**Requisitos Obrigatórios:**")
    expect(result).toContain("- React")
    expect(result).toContain("- TypeScript")
    expect(result).toContain("**Requisitos Desejáveis:**")
    expect(result).toContain("- GraphQL")
    expect(result).toContain("**Responsabilidades:**")
    expect(result).toContain("- Code")
    expect(result).toContain("**Benefícios:**")
    expect(result).toContain("- VR")
  })

  it("should return empty string for empty arrays", () => {
    const apiData: JobDetails = {
      empresa: "Company",
      cargo: "Role",
      local: "Location",
      modalidade: "Presencial",
      tipo_vaga: "Estágio",
      requisitos_obrigatorios: [],
      requisitos_desejaveis: [],
      responsabilidades: [],
      beneficios: [],
      salario: "Indefinido",
      idioma_vaga: "pt",
      status: "Pendente",
      etapa: "Indefinido",
    }

    const result = buildObservacoes(apiData)

    expect(result).toBe("")
  })
})
