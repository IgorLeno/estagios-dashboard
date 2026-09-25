import { z } from "zod"
import {
  APPLICATION_MODELS,
  CENTRALITY,
  EVIDENCE,
  FAMILIA_FUNCAO,
  HINT_SOURCES,
  INTERESSE,
  JORNADA_CLASSES,
  MODALIDADES,
  NEGATIVES,
  PROXIMIDADE_EQ,
  REQUIREMENT_TYPES,
  RISK_STAGES,
  RISK_STATUS,
  RISK_TYPES,
  SENIORITY,
  SETOR,
  STATUS_ANALISE,
  STATUS_DISPONIBILIDADE,
  STRONG_AMPLIFIERS,
  SUBMIT_MODES,
  TIPO_PROGRAMA,
  UNRESOLVED_VARIABLES,
  WEAK_POSITIVES,
  ZONES,
} from "@/lib/job-search/enums"

// Structural mirror of job-search `scripts/dossier.py` validate() for dossier/1.
// Rule recomputation (zone, interest level, quotes in posting) is job-search's job:
// the dashboard trusts the dossier only through `dossier_sha256`, it never re-derives.

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const nonEmpty = z.string().refine((value) => value.trim() !== "", "obrigatório")
const url = nonEmpty.refine((value) => value.startsWith("http"), "deve ser URL")
const quote = z.object({ evidence: z.string() }).passthrough()

const activity = z
  .object({ text: z.string().optional(), evidencia: z.enum(EVIDENCE), centralidade: z.enum(CENTRALITY) })
  .passthrough()
const requirement = z
  .object({ text: z.string().optional(), tipo: z.enum(REQUIREMENT_TYPES), evidencia: z.enum(EVIDENCE) })
  .passthrough()
const risk = z
  .object({
    type: z.enum(RISK_TYPES),
    status: z.enum(RISK_STATUS),
    consequential: z.boolean(),
    stage: z.enum(RISK_STAGES),
    detail: z.string().optional(),
    resolution: z.string().optional(),
  })
  .passthrough()
  .refine((item) => item.status !== "RESOLVED" || (item.resolution ?? "").trim() !== "", {
    message: "risco resolvido exige resolução",
  })

export const dossierSchema = z
  .object({
    schema: z.literal("dossier/1"),
    job_id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:._-]{0,120}$/),
    captured_at: z.string().regex(TIMESTAMP),
    repo_commit: z.string().regex(/^([0-9a-f]{40})?$/),
    posting_sha256: z.string().regex(/^[0-9a-f]{64}$/),
    identity: z
      .object({
        empresa: nonEmpty,
        cargo: nonEmpty,
        url,
        application_url: url,
        fonte: nonEmpty,
        portal: nonEmpty,
      })
      .passthrough(),
    availability: z
      .object({ status: z.enum(STATUS_DISPONIBILIDADE), checked_at: z.string().regex(TIMESTAMP) })
      .passthrough(),
    location: z
      .object({
        municipio: z.string().nullish(),
        uf: z.string().nullish(),
        modalidade: z.enum(MODALIDADES),
        distancia_km: z.object({ anchor: z.string(), km: z.number(), source: z.string() }).passthrough().nullish(),
        aceita_brasil: z.boolean().nullish(),
        zona: z.enum(ZONES),
        prioritaria: z.boolean(),
        viavel: z.boolean().nullable(),
      })
      .passthrough(),
    jornada: z.object({ literal: z.string(), classe: z.enum(JORNADA_CLASSES) }).passthrough(),
    analysis: z
      .object({
        core_sentence: nonEmpty,
        seniority: z.enum(SENIORITY),
        activities: z.array(activity).min(3).max(6),
        requirements: z.array(requirement).default([]),
        gates: z.unknown(),
        status_analise: z.enum(STATUS_ANALISE),
        gate_decisivo: z.string(),
      })
      .passthrough(),
    classification: z
      .object({
        familia_funcao: z.enum(FAMILIA_FUNCAO),
        tipo_programa: z.enum(TIPO_PROGRAMA),
        proximidade_eq: z.enum(PROXIMIDADE_EQ),
        setor: z.enum(SETOR),
      })
      .passthrough(),
    interest: z
      .object({
        level: z.enum(INTERESSE),
        amplifiers: z.array(z.object({ type: z.enum(STRONG_AMPLIFIERS) }).passthrough()),
        weak_positives: z.array(z.enum(WEAK_POSITIVES)),
        negatives: z.array(z.object({ type: z.enum(NEGATIVES) }).passthrough()),
        compensations: z.array(z.object({ negative: z.string(), compensated_by: z.string() }).passthrough()),
        submit_mode: z.enum(SUBMIT_MODES),
        oportunidade_excepcional: quote.nullish(),
        negatives_observed: z.array(z.object({ type: z.string() }).passthrough()).nullish(),
        unresolved_variable: z.enum(UNRESOLVED_VARIABLES).nullish(),
        candidate_values: z.array(z.string()).nullish(),
        resolution_attempts: z.array(z.string()).nullish(),
      })
      .passthrough(),
    representation_risks: z.array(risk),
    application: z.object({ model_hint: z.enum(APPLICATION_MODELS), hint_source: z.enum(HINT_SOURCES) }).passthrough(),
  })
  // Top-level keys are a closed set in dossier.py (unknown keys are an error).
  .strict()

export type Dossier = z.infer<typeof dossierSchema>
export type Requirement = z.infer<typeof requirement>
