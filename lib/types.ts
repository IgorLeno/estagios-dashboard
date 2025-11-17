export interface VagaEstagio {
  id: string
  created_at: string
  updated_at: string
  data_inscricao: string
  empresa: string
  cargo: string
  local: string
  modalidade: "Presencial" | "Híbrido" | "Remoto"
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
  arquivo_cv_url?: string
  is_test_data?: boolean // Flag to identify E2E test data (true = test, false = production)
}

export interface MetaDiaria {
  id: string
  created_at: string
  data: string
  meta: number
}

/**
 * @deprecated Configuração de horários customizáveis foi removida.
 * O sistema agora usa horário fixo de meia-noite (00:00) como início do dia.
 * Esta interface é mantida apenas para compatibilidade com o banco de dados.
 */
export interface Configuracao {
  id: string
  created_at: string
  updated_at: string
  /** @deprecated Não mais utilizado. O dia sempre começa à meia-noite (00:00). */
  hora_inicio: string
  /** @deprecated Não mais utilizado. O dia sempre termina às 23:59. */
  hora_termino: string
}

export interface HistoricoResumo {
  data: string
  meta: number
  candidaturas: number
}

export interface StatusResumo {
  status: string
  numero: number
  vagas: VagaEstagio[]
}

export interface LocalResumo {
  local: string
  numero: number
  vagas: VagaEstagio[]
}
