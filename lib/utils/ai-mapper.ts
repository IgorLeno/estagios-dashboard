import type { JobDetails } from "@/lib/ai/types"

/**
 * Form data structure matching AddVagaDialog state
 */
export interface FormData {
  empresa: string
  cargo: string
  local: string
  modalidade: "Presencial" | "Híbrido" | "Remoto"
  requisitos: string
  perfil: string
  etapa: string
  status: "Pendente" | "Avançado" | "Melou" | "Contratado"
  observacoes: string
  arquivo_analise_url: string
  arquivo_cv_url: string
}

/**
 * Maps AI API response (JobDetails) to form data structure
 * @param apiData - Structured job details from AI
 * @param analiseMarkdown - Optional analysis markdown (if not provided, builds from data)
 */
export function mapJobDetailsToFormData(apiData: JobDetails, analiseMarkdown?: string): Partial<FormData> {
  // Log incoming data for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("[ai-mapper] Mapping API data to form:", {
      requisitos_score: apiData.requisitos_score,
      fit: apiData.fit,
    })
  }

  return {
    empresa: apiData.empresa,
    cargo: apiData.cargo,
    local: apiData.local,
    modalidade: apiData.modalidade,
    requisitos:
      apiData.requisitos_score !== undefined && apiData.requisitos_score !== null
        ? apiData.requisitos_score.toString()
        : "",
    perfil: apiData.fit !== undefined && apiData.fit !== null ? apiData.fit.toString() : "",
    etapa: apiData.etapa && apiData.etapa !== "Indefinido" ? apiData.etapa : "",
    status: apiData.status || "Pendente",
    observacoes: analiseMarkdown || buildObservacoes(apiData),
  }
}

/**
 * Builds formatted observations text from job detail arrays
 */
export function buildObservacoes(data: JobDetails): string {
  const sections: string[] = []

  if (data.requisitos_obrigatorios.length > 0) {
    sections.push("**Requisitos Obrigatórios:**\n" + data.requisitos_obrigatorios.map((r) => `- ${r}`).join("\n"))
  }

  if (data.requisitos_desejaveis.length > 0) {
    sections.push("**Requisitos Desejáveis:**\n" + data.requisitos_desejaveis.map((r) => `- ${r}`).join("\n"))
  }

  if (data.responsabilidades.length > 0) {
    sections.push("**Responsabilidades:**\n" + data.responsabilidades.map((r) => `- ${r}`).join("\n"))
  }

  if (data.beneficios.length > 0) {
    sections.push("**Benefícios:**\n" + data.beneficios.map((r) => `- ${r}`).join("\n"))
  }

  return sections.join("\n\n")
}
