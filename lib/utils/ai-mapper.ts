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
  fit: string
  etapa: string
  status: "Pendente" | "Avançado" | "Melou" | "Contratado"
  observacoes: string
  arquivo_analise_url: string
  arquivo_cv_url: string
}

/**
 * Maps AI API response (JobDetails) to form data structure
 */
export function mapJobDetailsToFormData(apiData: JobDetails): Partial<FormData> {
  return {
    empresa: apiData.empresa,
    cargo: apiData.cargo,
    local: apiData.local,
    modalidade: apiData.modalidade,
    requisitos: apiData.requisitos_score?.toString() || "",
    fit: apiData.fit?.toString() || "",
    etapa: apiData.etapa || "",
    status: apiData.status || "Pendente",
    observacoes: buildObservacoes(apiData),
  }
}

/**
 * Builds formatted observations text from job detail arrays
 */
export function buildObservacoes(data: JobDetails): string {
  const sections: string[] = []

  if (data.requisitos_obrigatorios.length > 0) {
    sections.push(
      "**Requisitos Obrigatórios:**\n" +
        data.requisitos_obrigatorios.map((r) => `- ${r}`).join("\n")
    )
  }

  if (data.requisitos_desejaveis.length > 0) {
    sections.push(
      "**Requisitos Desejáveis:**\n" +
        data.requisitos_desejaveis.map((r) => `- ${r}`).join("\n")
    )
  }

  if (data.responsabilidades.length > 0) {
    sections.push(
      "**Responsabilidades:**\n" +
        data.responsabilidades.map((r) => `- ${r}`).join("\n")
    )
  }

  if (data.beneficios.length > 0) {
    sections.push(
      "**Benefícios:**\n" + data.beneficios.map((r) => `- ${r}`).join("\n")
    )
  }

  return sections.join("\n\n")
}
