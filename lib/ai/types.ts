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
  requisitos_obrigatorios: z.array(z.string().min(1, 'Requisito não pode ser vazio')).min(1, 'Pelo menos um requisito obrigatório é necessário'),
  requisitos_desejaveis: z.array(z.string().min(1, 'Requisito não pode ser vazio')).min(1, 'Pelo menos um requisito desejável é necessário'),
  responsabilidades: z.array(z.string().min(1, 'Responsabilidade não pode ser vazia')).min(1, 'Pelo menos uma responsabilidade é necessária'),
  beneficios: z.array(z.string().min(1, 'Benefício não pode ser vazio')).min(1, 'Pelo menos um benefício é necessário'),
  salario: z.string().regex(/^[R$]?\s*\d+[\d.,\s-]*$|^[\d.,\s-]+$/, 'Formato de salário inválido').nullable(),
  idioma_vaga: z.enum(['pt', 'en']),
  // ParsedVagaData compatibility fields (optional)
  requisitos_score: z.number().min(0).max(5).optional(),
  fit: z.number().min(0).max(5).optional(),
  etapa: z.string().optional(),
  status: z.enum(['Pendente', 'Avançado', 'Melou', 'Contratado']).optional(),
  observacoes: z.string().optional(),
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
 * Schema de validação para resposta de sucesso da API
 */
export const ParseJobResponseSchema = z.object({
  success: z.literal(true),
  data: JobDetailsSchema,
  metadata: z.object({
    duration: z.number(),
    model: z.string(),
    timestamp: z.string(),
  }),
})

export type ParseJobResponse = z.infer<typeof ParseJobResponseSchema>

/**
 * Schema de validação para resposta de erro da API
 */
export const ParseJobErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
})

export type ParseJobErrorResponse = z.infer<typeof ParseJobErrorResponseSchema>
