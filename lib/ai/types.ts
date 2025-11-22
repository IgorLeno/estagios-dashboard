import { z } from "zod"

/**
 * Schema de validação para dados extraídos de vagas
 * Compatível com ParsedVagaData do markdown-parser.ts
 *
 * IMPORTANT: Only "empresa" is required. All other fields are optional in INPUT.
 * - empresa: Required, min 1 character
 * - String fields: null/undefined/missing → "Indefinido"
 * - Enum fields: null/undefined/missing → default value (Presencial, Estágio, pt)
 * - Arrays: null/undefined/missing → empty array []
 * - OUTPUT always has non-null values (via .default() + .transform())
 */
export const JobDetailsSchema = z.object({
  empresa: z
    .string()
    .min(1, "Empresa é obrigatória")
    .nullable()
    .transform((v) => v ?? ""),
  cargo: z
    .string()
    .nullable()
    .default("Indefinido")
    .transform((v) => (v === null ? "Indefinido" : v)),
  local: z
    .string()
    .nullable()
    .default("Indefinido")
    .transform((v) => (v === null ? "Indefinido" : v)),
  modalidade: z
    .enum(["Presencial", "Híbrido", "Remoto"])
    .nullable()
    .default("Presencial")
    .transform((v) => (v === null ? "Presencial" : v)),
  tipo_vaga: z
    .enum(["Estágio", "Júnior", "Pleno", "Sênior"])
    .nullable()
    .default("Estágio")
    .transform((v) => (v === null ? "Estágio" : v)),
  requisitos_obrigatorios: z
    .array(z.string().min(1, "Item não pode ser vazio"))
    .nullable()
    .default([])
    .transform((v) => v ?? []),
  requisitos_desejaveis: z
    .array(z.string().min(1, "Item não pode ser vazio"))
    .nullable()
    .default([])
    .transform((v) => v ?? []),
  responsabilidades: z
    .array(z.string().min(1, "Item não pode ser vazio"))
    .nullable()
    .default([])
    .transform((v) => v ?? []),
  beneficios: z
    .array(z.string().min(1, "Item não pode ser vazio"))
    .nullable()
    .default([])
    .transform((v) => v ?? []),
  salario: z
    .string()
    .nullable()
    .default("Indefinido")
    .transform((v) => (v === null ? "Indefinido" : v)),
  idioma_vaga: z
    .enum(["pt", "en"])
    .nullable()
    .default("pt")
    .transform((v) => (v === null ? "pt" : v)),
  // ParsedVagaData compatibility fields (optional)
  requisitos_score: z.number().min(0).max(5).nullable().optional(),
  fit: z.number().min(0).max(5).nullable().optional(),
  etapa: z
    .string()
    .nullable()
    .default("Indefinido")
    .transform((v) => (v === null ? "Indefinido" : v)),
  status: z
    .enum(["Pendente", "Avançado", "Melou", "Contratado"])
    .nullable()
    .default("Pendente")
    .transform((v) => (v === null ? "Pendente" : v)),
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

/**
 * CV Template Structure
 * Represents full CV content with personalizable sections
 */
export interface CVTemplate {
  language: "pt" | "en"

  // Static sections (never modified by LLM)
  header: {
    name: string
    title: string
    email: string
    phone: string
    location: string
    links: Array<{ label: string; url: string }>
  }

  experience: Array<{
    title: string
    company: string
    period: string
    location: string
    description: string[]
  }>

  education: Array<{
    degree: string
    institution: string
    period: string
    location: string
  }>

  languages: Array<{
    language: string
    proficiency: string
  }>

  certifications: string[]

  // Personalizable sections (LLM-modified)
  summary: string

  skills: Array<{
    category: string
    items: string[]
  }>

  projects: Array<{
    title: string
    description: string[]
  }>
}

/**
 * Personalized CV sections returned by LLM
 */
export interface PersonalizedSections {
  summary: string
  skills: Array<{
    category: string
    items: string[]
  }>
  projects: Array<{
    title: string
    description: string[]
  }>
}

/**
 * Schema for validating personalized sections from LLM
 */
export const PersonalizedSectionsSchema = z.object({
  summary: z.string().min(50, "Summary too short").max(1000, "Summary too long"),
  skills: z.array(
    z.object({
      category: z.string().min(1),
      items: z.array(z.string().min(1)),
    })
  ),
  projects: z.array(
    z.object({
      title: z.string().min(1),
      description: z.array(z.string().min(1)),
    })
  ),
})

/**
 * Request schema for resume generation API
 */
export const GenerateResumeRequestSchema = z
  .object({
    vagaId: z.string().uuid().optional(),
    jobDescription: z.string().min(50).max(50000).optional(),
    language: z.enum(["pt", "en"]),
  })
  .refine((data) => data.vagaId || data.jobDescription, "Either vagaId or jobDescription must be provided")

export type GenerateResumeRequest = z.infer<typeof GenerateResumeRequestSchema>

/**
 * Response schema for resume generation API (success)
 */
export const GenerateResumeResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    pdfBase64: z.string(),
    filename: z.string(),
    atsScore: z.number().min(0).max(100).optional(),
  }),
  metadata: z.object({
    duration: z.number(),
    model: z.string(),
    tokenUsage: z.object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      totalTokens: z.number(),
    }),
    personalizedSections: z.array(z.string()),
  }),
})

export type GenerateResumeResponse = z.infer<typeof GenerateResumeResponseSchema>

/**
 * Response schema for resume generation API (error)
 */
export const GenerateResumeErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
})

export type GenerateResumeErrorResponse = z.infer<typeof GenerateResumeErrorResponseSchema>
