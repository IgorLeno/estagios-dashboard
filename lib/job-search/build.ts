import {
  EVIDENCE,
  EVENTOS,
  LEGACY,
  MAIN_ENUM_DOMAINS,
  RESULTADO_COBERTURA,
  type Evidence,
} from "@/lib/job-search/enums"
import type { Requirement } from "@/lib/job-search/dossier-schema"
import { latestDossiers, parseDossiers } from "@/lib/job-search/dossiers"
import {
  ALLOWED_TAB,
  ARCHIVE_TAB,
  COVERAGE_COLUMNS,
  COVERAGE_TAB,
  DOSSIER_COLUMNS,
  DOSSIERS_TAB,
  EVENT_COLUMNS,
  EVENTS_TAB,
  MAIN_COLUMNS,
  enumText,
  findMainTab,
  parseCoverage,
  parseEvents,
  parseJobRows,
  readTable,
} from "@/lib/job-search/sheet-parse"
import type {
  AnalysisLevel,
  ApplicationEvent,
  Divergence,
  DossierRecord,
  Issue,
  JobRow,
  JobSearchData,
  JobView,
  RawSnapshot,
  SnapshotIssue,
} from "@/lib/job-search/types"

// Sheet columns that job-search writeset.py cross-checks against the dossier.
const CROSS_CHECK: { field: keyof JobRow; read: (d: NonNullable<DossierRecord["dossier"]>) => string }[] = [
  { field: "status_analise", read: (d) => d.analysis.status_analise },
  { field: "familia_funcao", read: (d) => d.classification.familia_funcao },
  { field: "tipo_programa", read: (d) => d.classification.tipo_programa },
  { field: "proximidade_eq", read: (d) => d.classification.proximidade_eq },
  { field: "setor", read: (d) => d.classification.setor },
  { field: "interesse", read: (d) => d.interest.level },
]
const CLASSIFICATION_AXES = ["familia_funcao", "tipo_programa", "proximidade_eq", "setor"] as const
const SUBMIT_OUTCOMES = new Set(["SUBMITTED", "SUBMIT_UNCERTAIN", "CLOSED"])

/**
 * An attempt is uncertain when its last submit-related event is SUBMIT_INTENT with no
 * outcome after it (registry.md: equals ENVIO INCERTO) or SUBMIT_UNCERTAIN.
 */
export function hasUncertainSubmit(events: ApplicationEvent[]): boolean {
  const lastByAttempt = new Map<string, string>()
  for (const event of events) {
    const kind = enumText(event.evento)
    if (kind === "SUBMIT_INTENT" || (kind !== null && SUBMIT_OUTCOMES.has(kind))) {
      lastByAttempt.set(event.attempt_id, kind)
    }
  }
  return [...lastByAttempt.values()].some((kind) => kind === "SUBMIT_INTENT" || kind === "SUBMIT_UNCERTAIN")
}

function groupRequirements(requirements: Requirement[]): Record<Evidence, Requirement[]> {
  const groups = Object.fromEntries(EVIDENCE.map((evidence) => [evidence, [] as Requirement[]])) as Record<
    Evidence,
    Requirement[]
  >
  for (const requirement of requirements) groups[requirement.evidencia].push(requirement)
  return groups
}

export function buildJobView(
  job: JobRow,
  dossierEntry: { latest: DossierRecord; rows: number } | undefined,
  events: ApplicationEvent[]
): JobView {
  const issues: Issue[] = [...job.issues]
  const record = dossierEntry?.latest ?? null
  const dossier = record?.dossier ?? null

  const divergences: Divergence[] = []
  if (dossier) {
    for (const { field, read } of CROSS_CHECK) {
      const sheet = enumText(job[field] as never) ?? ""
      const expected = read(dossier)
      if (sheet !== expected) divergences.push({ field, sheet, dossier: expected })
    }
  }
  for (const divergence of divergences) {
    issues.push({
      code: "SHEET_DOSSIER_DIVERGENCE",
      field: divergence.field,
      value: divergence.sheet,
      message: `${divergence.field}: Sheet "${divergence.sheet || "(vazio)"}" × dossier "${divergence.dossier}".`,
    })
  }

  let analysis: AnalysisLevel
  if (record && !record.valid) {
    analysis = "INVALID"
    issues.push({ code: "DOSSIER_INVALID", message: `Dossier ilegível: ${record.errors.join("; ")}.` })
  } else if (dossier) {
    const truncated = record?.posting_truncated === true
    if (truncated) issues.push({ code: "DOSSIER_POSTING_TRUNCATED", message: "Publicação truncada na Sheet." })
    analysis = truncated || divergences.length > 0 ? "PARTIAL" : "FULL"
  } else {
    const classified = CLASSIFICATION_AXES.some((field) => {
      const value = job[field]
      return typeof value === "string" && value !== LEGACY
    })
    analysis = classified ? "PARTIAL" : "NONE"
  }

  if (!record && job.status_analise === "SELECIONADA") {
    issues.push({ code: "SELECTED_WITHOUT_DOSSIER", message: "Vaga SELECIONADA sem dossier." })
  }

  const sortedEvents = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.row - b.row)
  for (const event of sortedEvents) {
    if (event.evento === null || typeof event.evento === "object") {
      issues.push({
        code: "EVENT_INVALID",
        field: "evento",
        value: enumText(event.evento) ?? "",
        message: `Evento fora do domínio na linha ${event.row} de "${EVENTS_TAB}".`,
      })
    }
  }
  const uncertainSubmit = job.status_candidatura === "ENVIO INCERTO" || hasUncertainSubmit(events)
  if (uncertainSubmit) {
    issues.push({ code: "UNCERTAIN_SUBMIT", message: "Envio incerto: bloqueia nova tentativa até reconciliação." })
  }

  return {
    job,
    dossier: record,
    dossierRows: dossierEntry?.rows ?? 0,
    events: sortedEvents,
    analysis,
    actionable: job.status_disponibilidade === "ABERTA",
    uncertainSubmit,
    requirementsByEvidence: dossier ? groupRequirements(dossier.analysis.requirements) : null,
    zona: dossier?.location.zona ?? null,
    uf: dossier?.location.uf ?? null,
    modalidade: dossier?.location.modalidade ?? null,
    divergences,
    issues,
  }
}

/** Compares the Sheet's `Valores Permitidos` columns with the mirrored domains. */
function allowedValuesDrift(values: string[][] | undefined): SnapshotIssue[] {
  if (!values || values.length === 0) return []
  const expected: Record<string, readonly string[]> = {
    ...MAIN_ENUM_DOMAINS,
    evento: EVENTOS,
    resultado_cobertura: RESULTADO_COBERTURA,
  }
  const header = values[0].map((cell) => String(cell ?? "").trim())
  const out: SnapshotIssue[] = []
  header.forEach((name, col) => {
    const domain = expected[name]
    if (!domain) return
    const sheet = values
      .slice(1)
      .map((row) => String(row[col] ?? ""))
      .filter((value) => value !== "")
    const same = sheet.length === domain.length && sheet.every((value) => domain.includes(value))
    if (!same) {
      out.push({
        code: "ALLOWED_VALUES_DRIFT",
        tab: ALLOWED_TAB,
        field: name,
        message: `"${ALLOWED_TAB}": domínio de "${name}" diverge do contrato do job-search.`,
      })
    }
  })
  return out
}

export function buildJobSearchData(
  raw: RawSnapshot,
  source: JobSearchData["source"],
  fetchedAt: string
): JobSearchData {
  const issues: SnapshotIssue[] = []
  const { tab: mainTab, issue } = findMainTab(raw.tabs)
  if (issue) issues.push(issue)

  const tabOrEmpty = (title: string, required: boolean) => {
    const values = raw.tabs[title]
    if (values) return values
    if (required) issues.push({ code: "TAB_MISSING", tab: title, message: `Aba "${title}" ausente.` })
    return null
  }

  const jobs: JobRow[] = []
  if (mainTab) {
    jobs.push(
      ...parseJobRows(readTable(mainTab, raw.tabs[mainTab], MAIN_COLUMNS, issues, { familia_funcao: "trilha" }), false)
    )
  }
  const archive = tabOrEmpty(ARCHIVE_TAB, false)
  if (archive) {
    jobs.push(
      ...parseJobRows(readTable(ARCHIVE_TAB, archive, MAIN_COLUMNS, issues, { familia_funcao: "trilha" }), true)
    )
  }

  const eventValues = tabOrEmpty(EVENTS_TAB, true)
  const events = eventValues ? parseEvents(readTable(EVENTS_TAB, eventValues, EVENT_COLUMNS, issues)) : []
  const coverageValues = tabOrEmpty(COVERAGE_TAB, true)
  const coverage = coverageValues
    ? parseCoverage(readTable(COVERAGE_TAB, coverageValues, COVERAGE_COLUMNS, issues))
    : []
  const dossierValues = tabOrEmpty(DOSSIERS_TAB, false)
  const dossierRecords = dossierValues
    ? parseDossiers(readTable(DOSSIERS_TAB, dossierValues, DOSSIER_COLUMNS, issues))
    : []
  issues.push(...allowedValuesDrift(raw.tabs[ALLOWED_TAB]))

  // A job_id appearing twice (inside a tab or in main + archive): first row wins, later ones are flagged.
  const seen = new Set<string>()
  const uniqueJobs: JobRow[] = []
  for (const job of jobs) {
    if (seen.has(job.job_id)) {
      const first = uniqueJobs.find((item) => item.job_id === job.job_id)
      first?.issues.push({
        code: "DUPLICATE_JOB_ID",
        message: `job_id repetido (linha ${job.row}${job.archived ? ` de "${ARCHIVE_TAB}"` : ""}).`,
      })
      continue
    }
    seen.add(job.job_id)
    uniqueJobs.push(job)
  }

  const latest = latestDossiers(dossierRecords)
  const eventsByJob = new Map<string, ApplicationEvent[]>()
  for (const event of events) {
    const list = eventsByJob.get(event.job_id) ?? []
    list.push(event)
    eventsByJob.set(event.job_id, list)
  }

  const views = uniqueJobs.map((job) => buildJobView(job, latest.get(job.job_id), eventsByJob.get(job.job_id) ?? []))

  const orphanDossiers = [...latest.entries()].filter(([jobId]) => !seen.has(jobId)).map(([, entry]) => entry.latest)
  for (const record of orphanDossiers) {
    issues.push({
      code: "ORPHAN_DOSSIER",
      tab: DOSSIERS_TAB,
      message: `Dossier de "${record.job_id}" sem linha no registro.`,
    })
  }
  for (const jobId of eventsByJob.keys()) {
    if (!seen.has(jobId)) {
      issues.push({ code: "ORPHAN_EVENT", tab: EVENTS_TAB, message: `Eventos de "${jobId}" sem linha no registro.` })
    }
  }

  return {
    source,
    fetchedAt,
    mainTab,
    dossiersTabPresent: dossierValues !== null,
    views,
    coverage,
    orphanDossiers,
    issues,
  }
}
