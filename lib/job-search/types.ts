import type {
  Evento,
  Evidence,
  MainEnumField,
  MainEnumValue,
  ResultadoCobertura,
  SubmitMode,
} from "@/lib/job-search/enums"
import type { Dossier, Requirement } from "@/lib/job-search/dossier-schema"

/** Raw values per tab title, exactly as the Sheets API returns them (row 0 = header). */
export interface RawSnapshot {
  tabs: Record<string, string[][]>
}

/** Empty cell → null; value outside the domain → `{ invalid }` (never coerced). */
export type EnumCell<T extends string> = T | { invalid: string } | null

export type IssueCode =
  | "ENUM_INVALID"
  | "REQUIRED_EMPTY"
  | "DATE_INVALID"
  | "DUPLICATE_JOB_ID"
  | "NOT_CLASSIFIED"
  | "SELECTED_WITHOUT_DOSSIER"
  | "DOSSIER_INVALID"
  | "DOSSIER_POSTING_TRUNCATED"
  | "SHEET_DOSSIER_DIVERGENCE"
  | "UNCERTAIN_SUBMIT"
  | "EVENT_INVALID"

export interface Issue {
  code: IssueCode
  message: string
  field?: string
  value?: string
}

export type SnapshotIssueCode =
  | "MAIN_TAB_NOT_FOUND"
  | "MAIN_TAB_AMBIGUOUS"
  | "TAB_MISSING"
  | "HEADER_MISSING"
  | "HEADER_DUPLICATED"
  | "LEGACY_HEADER"
  | "ALLOWED_VALUES_DRIFT"
  | "ORPHAN_DOSSIER"
  | "ORPHAN_EVENT"

export interface SnapshotIssue {
  code: SnapshotIssueCode
  message: string
  tab?: string
  field?: string
}

export type JobEnums = { [F in MainEnumField]: EnumCell<MainEnumValue<F>> }

export interface JobRow extends JobEnums {
  job_id: string
  empresa: string
  cargo: string
  url: string
  fonte: string
  fonte_descoberta: string
  portal_candidatura: string
  /** YYYY-MM-DD or null (empty or unparseable; unparseable also yields an issue). */
  data_primeira_analise: string | null
  data_ultima_analise: string | null
  data_candidatura: string | null
  motivo_analise: string
  gate_decisivo: string
  observacoes: string
  origem_skill: string
  /** Row came from the `Encerradas` archive tab. */
  archived: boolean
  /** 1-based row number in its tab (header = 1). */
  row: number
  issues: Issue[]
}

export interface ApplicationEvent {
  job_id: string
  attempt_id: string
  evento: EnumCell<Evento>
  timestamp: string
  submit_mode: EnumCell<SubmitMode>
  fingerprint8: string
  evidencia: string
  row: number
}

export interface CoverageRow {
  /** YYYY-MM-DD or null. */
  data_execucao: string | null
  fonte: string
  tier: string
  familia: string
  resultado: EnumCell<ResultadoCobertura>
  observacoes: string
  row: number
}

export interface DossierRecord {
  job_id: string
  captured_at: string
  schema: string
  posting_sha256: string
  dossier_sha256: string
  posting_md: string
  posting_truncated: boolean | null
  row: number
  /** sha256(dossier_json cell text) matches `dossier_sha256`. */
  integrity: boolean
  /** Integrity, JSON, dossier/1 schema and column cross-checks all pass. */
  valid: boolean
  errors: string[]
  dossier: Dossier | null
}

export type AnalysisLevel = "FULL" | "PARTIAL" | "NONE" | "INVALID"

export interface Divergence {
  field: string
  sheet: string
  dossier: string
}

export interface JobView {
  job: JobRow
  /** Latest `Dossiers` row for this job (max captured_at, ties → lowest row). */
  dossier: DossierRecord | null
  dossierRows: number
  events: ApplicationEvent[]
  analysis: AnalysisLevel
  actionable: boolean
  uncertainSubmit: boolean
  requirementsByEvidence: Record<Evidence, Requirement[]> | null
  zona: string | null
  uf: string | null
  modalidade: string | null
  divergences: Divergence[]
  issues: Issue[]
}

export interface JobSearchData {
  source: "fixture" | "sheets"
  fetchedAt: string
  mainTab: string | null
  dossiersTabPresent: boolean
  views: JobView[]
  coverage: CoverageRow[]
  orphanDossiers: DossierRecord[]
  issues: SnapshotIssue[]
}
