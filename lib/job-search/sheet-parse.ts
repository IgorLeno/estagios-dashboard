import {
  EVENTOS,
  LEGACY,
  MAIN_ENUM_DOMAINS,
  RESULTADO_COBERTURA,
  SUBMIT_MODES,
  isInDomain,
  type MainEnumField,
} from "@/lib/job-search/enums"
import type { ApplicationEvent, CoverageRow, EnumCell, Issue, JobRow, SnapshotIssue } from "@/lib/job-search/types"

// Tab names and headers from job-search `scripts/sheets_client.py` / `methodology/registry.md`.
export const EVENTS_TAB = "Eventos de Candidatura"
export const ALLOWED_TAB = "Valores Permitidos"
export const COVERAGE_TAB = "Cobertura de Fontes"
export const DOSSIERS_TAB = "Dossiers"
export const ARCHIVE_TAB = "Encerradas"
const BACKUP_PREFIX = "backup-"

export const MAIN_COLUMNS = [
  "job_id",
  "empresa",
  "cargo",
  "url",
  "fonte",
  "fonte_descoberta",
  "portal_candidatura",
  "familia_funcao",
  "tipo_programa",
  "proximidade_eq",
  "setor",
  "interesse",
  "application_model",
  "data_primeira_analise",
  "data_ultima_analise",
  "status_analise",
  "status_disponibilidade",
  "motivo_analise",
  "gate_decisivo",
  "status_candidatura",
  "data_candidatura",
  "observacoes",
  "origem_skill",
] as const
export const EVENT_COLUMNS = [
  "job_id",
  "attempt_id",
  "evento",
  "timestamp",
  "submit_mode",
  "fingerprint8",
  "evidencia",
] as const
export const COVERAGE_COLUMNS = ["data_execucao", "fonte", "tier", "familia", "resultado", "observacoes"] as const
export const DOSSIER_COLUMNS = [
  "job_id",
  "captured_at",
  "schema",
  "posting_sha256",
  "dossier_sha256",
  "dossier_json",
  "posting_md",
  "posting_truncated",
] as const

/** Header-indexed view of a tab. Physical column order is never part of the contract. */
export interface Table {
  tab: string
  records: { row: number; get: (name: string) => string }[]
}

/**
 * Locates columns by header (trimmed). Missing or duplicated headers read as empty
 * and are reported; they never shift other columns.
 */
export function readTable(
  tab: string,
  values: string[][],
  columns: readonly string[],
  issues: SnapshotIssue[],
  aliases: Record<string, string> = {}
): Table {
  const header = (values[0] ?? []).map((cell) => String(cell ?? "").trim())
  const index = new Map<string, number>()
  for (const name of columns) {
    let found = header.flatMap((cell, i) => (cell === name ? [i] : []))
    const legacy = aliases[name]
    if (found.length === 0 && legacy) {
      found = header.flatMap((cell, i) => (cell === legacy ? [i] : []))
      if (found.length === 1) {
        issues.push({
          code: "LEGACY_HEADER",
          tab,
          field: name,
          message: `Aba "${tab}": cabeçalho legado "${legacy}" lido como "${name}".`,
        })
      }
    }
    if (found.length === 1) {
      index.set(name, found[0])
    } else if (found.length === 0) {
      issues.push({ code: "HEADER_MISSING", tab, field: name, message: `Aba "${tab}": coluna "${name}" ausente.` })
    } else {
      issues.push({
        code: "HEADER_DUPLICATED",
        tab,
        field: name,
        message: `Aba "${tab}": coluna "${name}" duplicada; ignorada.`,
      })
    }
  }
  const records = values.slice(1).map((cells, i) => ({
    row: i + 2,
    get: (name: string) => {
      const col = index.get(name)
      return col === undefined ? "" : String(cells[col] ?? "")
    },
  }))
  return { tab, records }
}

export function parseEnum<T extends string>(domain: readonly T[], raw: string): EnumCell<T> {
  if (raw === "") return null
  return isInDomain(domain, raw) ? raw : { invalid: raw }
}

export function isInvalid<T extends string>(cell: EnumCell<T>): cell is { invalid: string } {
  return typeof cell === "object" && cell !== null
}

/** Enum value as plain text (invalid values keep their raw text). */
export function enumText<T extends string>(cell: EnumCell<T>): string | null {
  if (cell === null) return null
  return isInvalid(cell) ? cell.invalid : cell
}

/** Accepts `YYYY-MM-DD` (optionally followed by time) and `DD/MM/YYYY`. */
export function parseSheetDate(raw: string): string | null | undefined {
  const text = raw.trim()
  if (text === "") return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text)
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  const [year, month, day] = iso ? [iso[1], iso[2], iso[3]] : br ? [br[3], br[2], br[1]] : []
  if (!year) return undefined
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const valid =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  return valid ? `${year}-${month}-${day}` : undefined
}

const ENUM_LABEL: Record<MainEnumField, string> = {
  familia_funcao: "familia_funcao",
  tipo_programa: "tipo_programa",
  proximidade_eq: "proximidade_eq",
  setor: "setor",
  interesse: "interesse",
  application_model: "application_model",
  status_analise: "status_analise",
  status_disponibilidade: "status_disponibilidade",
  status_candidatura: "status_candidatura",
}
const REQUIRED_ENUMS: MainEnumField[] = ["status_analise", "status_disponibilidade"]
const CLASSIFICATION_AXES: MainEnumField[] = ["familia_funcao", "tipo_programa", "proximidade_eq", "setor", "interesse"]

/** Rows of the main tab (or `Encerradas`). Rows without `job_id` are skipped. */
export function parseJobRows(table: Table, archived: boolean): JobRow[] {
  const out: JobRow[] = []
  for (const record of table.records) {
    const jobId = record.get("job_id").trim()
    if (jobId === "") continue
    const issues: Issue[] = []

    const enums = {} as Record<MainEnumField, EnumCell<string>>
    for (const field of Object.keys(MAIN_ENUM_DOMAINS) as MainEnumField[]) {
      const cell = parseEnum(MAIN_ENUM_DOMAINS[field] as readonly string[], record.get(field))
      enums[field] = cell
      if (isInvalid(cell)) {
        issues.push({
          code: "ENUM_INVALID",
          field,
          value: cell.invalid,
          message: `${ENUM_LABEL[field]} fora do domínio: "${cell.invalid}".`,
        })
      } else if (cell === null && REQUIRED_ENUMS.includes(field)) {
        issues.push({ code: "REQUIRED_EMPTY", field, message: `${ENUM_LABEL[field]} vazio.` })
      }
    }
    if (CLASSIFICATION_AXES.some((field) => enums[field] === LEGACY)) {
      issues.push({ code: "NOT_CLASSIFIED", message: "Classificação funcional pendente (NAO_CLASSIFICADO)." })
    }

    const date = (field: string) => {
      const parsed = parseSheetDate(record.get(field))
      if (parsed === undefined) {
        issues.push({ code: "DATE_INVALID", field, value: record.get(field), message: `${field} não é data.` })
        return null
      }
      return parsed
    }

    out.push({
      ...(enums as JobRow),
      job_id: jobId,
      empresa: record.get("empresa").trim(),
      cargo: record.get("cargo").trim(),
      url: record.get("url").trim(),
      fonte: record.get("fonte").trim(),
      fonte_descoberta: record.get("fonte_descoberta").trim(),
      portal_candidatura: record.get("portal_candidatura").trim(),
      data_primeira_analise: date("data_primeira_analise"),
      data_ultima_analise: date("data_ultima_analise"),
      data_candidatura: date("data_candidatura"),
      motivo_analise: record.get("motivo_analise"),
      gate_decisivo: record.get("gate_decisivo"),
      observacoes: record.get("observacoes"),
      origem_skill: record.get("origem_skill"),
      archived,
      row: record.row,
      issues,
    })
  }
  return out
}

export function parseEvents(table: Table): ApplicationEvent[] {
  return table.records
    .filter((record) => record.get("job_id").trim() !== "")
    .map((record) => ({
      job_id: record.get("job_id").trim(),
      attempt_id: record.get("attempt_id").trim(),
      evento: parseEnum(EVENTOS, record.get("evento").trim()),
      timestamp: record.get("timestamp").trim(),
      submit_mode: parseEnum(SUBMIT_MODES, record.get("submit_mode").trim()),
      fingerprint8: record.get("fingerprint8").trim(),
      evidencia: record.get("evidencia").trim(),
      row: record.row,
    }))
}

export function parseCoverage(table: Table): CoverageRow[] {
  return table.records
    .filter((record) => record.get("fonte").trim() !== "" || record.get("data_execucao").trim() !== "")
    .map((record) => ({
      data_execucao: parseSheetDate(record.get("data_execucao")) ?? null,
      fonte: record.get("fonte").trim(),
      tier: record.get("tier").trim(),
      familia: record.get("familia").trim(),
      resultado: parseEnum(RESULTADO_COBERTURA, record.get("resultado").trim()),
      observacoes: record.get("observacoes"),
      row: record.row,
    }))
}

/**
 * Main tab = the only tab (not backup, archive or auxiliary) whose header has both
 * `job_id` and `status_analise` — same rule as job-search `find_main_tab`.
 */
export function findMainTab(tabs: Record<string, string[][]>): { tab: string | null; issue?: SnapshotIssue } {
  const auxiliary = new Set([EVENTS_TAB, ALLOWED_TAB, COVERAGE_TAB, DOSSIERS_TAB, ARCHIVE_TAB])
  const candidates = Object.entries(tabs)
    .filter(([title]) => !title.startsWith(BACKUP_PREFIX) && !auxiliary.has(title))
    .filter(([, values]) => {
      const header = new Set((values[0] ?? []).map((cell) => String(cell ?? "").trim()))
      return header.has("job_id") && header.has("status_analise")
    })
    .map(([title]) => title)
  if (candidates.length === 1) return { tab: candidates[0] }
  return candidates.length === 0
    ? { tab: null, issue: { code: "MAIN_TAB_NOT_FOUND", message: "Aba principal do registro não encontrada." } }
    : {
        tab: null,
        issue: {
          code: "MAIN_TAB_AMBIGUOUS",
          message: `Mais de uma aba principal candidata: ${candidates.join(", ")}.`,
        },
      }
}
