import { z } from 'zod'

/**
 * Schema de validação para dados extraídos de vagas
 * Compatível com ParsedVagaData do markdown-parser.ts
 */
export const JobDetailsSchema = z.object({
  empresa: z.string().min(1, 'Empresa é obrigatória'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  local: z.string().min(1, 'Local é obrigatório'),
  modalidade: z.enum(['Presencial', 'Híbrido', 'Remoto']),
  tipo_vaga: z.enum(['Estágio', 'Júnior', 'Pleno', 'Sênior']),
  requisitos_obrigatorios: z.array(z.string()),
  requisitos_desejaveis: z.array(z.string()),
  responsabilidades: z.array(z.string()),
  beneficios: z.array(z.string()),
  salario: z.string().nullable(),
  idioma_vaga: z.enum(['pt', 'en']),
})

export type JobDetails = z.infer<typeof JobDetailsSchema>

/**
 * Schema de validação para input da API
 */
export const ParseJobRequestSchema = z.object({
  jobDescription: z.string().min(50, 'Descrição da vaga deve ter ao menos 50 caracteres'),
})

export type ParseJobRequest = z.infer<typeof ParseJobRequestSchema>

/**
 * Resposta da API (success)
 */
export interface ParseJobResponse {
  success: true
  data: JobDetails
  metadata: {
    duration: number
    model: string
    timestamp: string
  }
}

/**
 * Resposta da API (error)
 */
export interface ParseJobErrorResponse {
  success: false
  error: string
  details?: unknown
}
