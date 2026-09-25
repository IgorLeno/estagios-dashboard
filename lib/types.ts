export interface VagaEstagio {
  id: string
  created_at: string
  updated_at: string
  data_inscricao: string
  empresa: string
  cargo: string
  local: string
  modalidade: "Presencial" | "Híbrido" | "Remoto"
  tipo_vaga?: "Estágio" | "Júnior" | "Pleno" | "Sênior"
  requisitos_obrigatorios?: string[]
  requisitos_desejaveis?: string[]
  responsabilidades?: string[]
  beneficios?: string[]
  salario?: string
  idioma_vaga?: "pt" | "en"
  /**
   * Fit de Requisitos - Avaliação estrelar 0-5
   * - Range válido: 0.0 a 5.0
   * - Incrementos: 0.5
   * - Valores percentuais (0-100) são automaticamente convertidos via normalizeRatingForSave()
   * - Exemplo: 85% → 4.5 estrelas
   */
  requisitos?: number
  /**
   * Fit de Perfil - Avaliação estrelar 0-5
   * - Range válido: 0.0 a 5.0
   * - Incrementos: 0.5
   * - Valores em escala 0-10 ou 0-100 são automaticamente convertidos via normalizeRatingForSave()
   * - Exemplo: 8/10 → 4.0 estrelas
   */
  perfil?: number
  etapa?: string
  status: "Pendente" | "Avançado" | "Melou" | "Contratado"
  observacoes?: string
  arquivo_analise_url?: string
}

export interface HistoricoResumo {
  data: string
  meta: number
  candidaturas: number
}
