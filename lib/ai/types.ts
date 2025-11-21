import { z } from "zod"

/**
 * Schema de validação para dados extraídos de vagas
 * Compatível com ParsedVagaData do markdown-parser.ts
 *
 * IMPORTANT: Accepts null from LLM and transforms to safe defaults
 * - String fields: null → empty string ""
 * - Enum fields: null → default value (Presencial, Estágio, pt)
 * - Arrays: null → empty array []
 */
export const JobDetailsSchema = z.object({
  empresa: z.string().nullable().transform(v => v ?? ""),
  cargo: z.string().nullable().transform(v => v ?? ""),
  local: z.string().nullable().transform(v => v ?? ""),
  modalidade: z.enum(["Presencial", "Híbrido", "Remoto"]).nullable().transform(v => v ?? "Presencial"),
  tipo_vaga: z.enum(["Estágio", "Júnior", "Pleno", "Sênior"]).nullable().transform(v => v ?? "Estágio"),
  requisitos_obrigatorios: z.array(z.string().min(1)).nullable().transform(v => v ?? []).default([]),
  requisitos_desejaveis: z.array(z.string().min(1)).nullable().transform(v => v ?? []).default([]),
  responsabilidades: z.array(z.string().min(1)).nullable().transform(v => v ?? []).default([]),
  beneficios: z.array(z.string().min(1)).nullable().transform(v => v ?? []).default([]),
  salario: z.string().max(100, "Salary information too long").nullable().optional(),
  idioma_vaga: z.enum(["pt", "en"]).nullable().transform(v => v ?? "pt"),
  // ParsedVagaData compatibility fields (optional)
  requisitos_score: z.number().min(0).max(5).nullable().optional(),
  fit: z.number().min(0).max(5).nullable().optional(),
  etapa: z.string().nullable().optional(),
  status: z.enum(["Pendente", "Avançado", "Melou", "Contratado"]).nullable().optional(),
  observacoes: z.string().nullable().optional(),
})

export type JobDetails = z.infer<typeof JobDetailsSchema>

/**
 * Schema de validação para input da API
 */
export const ParseJobRequestSchema = z.object({
  jobDescription: z
    .string()
    .min(50, "Job description too short (minimum 50 characters)")
    .max(50000, "Job description too long (maximum 50,000 characters)"),
})

export type ParseJobRequest = z.infer<typeof ParseJobRequestSchema>

/**
 * Schema de validação para token usage metrics
 */
export const TokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
})

export type TokenUsage = z.infer<typeof TokenUsageSchema>

/**
 * Schema de validação para resposta de sucesso da API
 */
export const ParseJobResponseSchema = z.object({
  success: z.literal(true),
  data: JobDetailsSchema,
  metadata: z.object({
    duration: z.number(),
    model: z.string(),
    tokenUsage: TokenUsageSchema,
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
  details: z
    .union([
      z.object({
        issues: z.array(
          z.object({
            path: z.array(z.union([z.string(), z.number()])),
            message: z.string(),
          })
        ),
      }),
      z.record(z.unknown()),
      z.string(),
    ])
    .optional(),
})

export type ParseJobErrorResponse = z.infer<typeof ParseJobErrorResponseSchema>

/**
 * Schema for complete job analysis response (structured data + markdown)
 */
export const JobAnalysisResponseSchema = z.object({
  structured_data: JobDetailsSchema,
  analise_markdown: z.string().min(1, "Analysis markdown is required"),
})

export type JobAnalysisResponse = z.infer<typeof JobAnalysisResponseSchema>
