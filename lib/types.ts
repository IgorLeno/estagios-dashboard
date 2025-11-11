export interface VagaEstagio {
  id: string
  created_at: string
  updated_at: string
  data_inscricao: string
  empresa: string
  cargo: string
  local: string
  modalidade: "Presencial" | "Híbrido" | "Remoto"
  requisitos?: string
  fit?: number
  etapa?: string
  status: string
  observacoes?: string
  arquivo_analise_url?: string
  arquivo_cv_url?: string
}

export interface MetaDiaria {
  id: string
  created_at: string
  data: string
  meta: number
}

export interface Configuracao {
  id: string
  created_at: string
  updated_at: string
  hora_inicio: string
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
