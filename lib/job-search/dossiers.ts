import { createHash } from "node:crypto"
import { dossierSchema } from "@/lib/job-search/dossier-schema"
import type { Table } from "@/lib/job-search/sheet-parse"
import type { DossierRecord } from "@/lib/job-search/types"

export function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

/**
 * One `Dossiers` row → record, following the reader rules in job-search
 * `methodology/registry.md` (aba "Dossiers"): hash the cell text as-is (never
 * re-serialized JSON), cross-check the columns against the JSON, and check the
 * posting hash when it was not truncated. Any mismatch makes the row invalid;
 * the reader never repairs it.
 */
export function parseDossierRecord(record: Table["records"][number]): DossierRecord {
  const cell = (name: string) => record.get(name)
  const text = cell("dossier_json")
  const errors: string[] = []

  const integrity = text !== "" && sha256Text(text) === cell("dossier_sha256")
  if (!integrity) errors.push("dossier_sha256 não confere com dossier_json")

  const truncatedRaw = cell("posting_truncated")
  const postingTruncated = truncatedRaw === "TRUE" ? true : truncatedRaw === "FALSE" ? false : null
  if (postingTruncated === null) errors.push("posting_truncated deve ser TRUE ou FALSE")
  if (postingTruncated === false && sha256Text(cell("posting_md")) !== cell("posting_sha256")) {
    errors.push("posting_sha256 não confere com posting_md")
  }

  let dossier: DossierRecord["dossier"] = null
  if (integrity) {
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      errors.push("dossier_json não é JSON")
    }
    if (json !== undefined) {
      const parsed = dossierSchema.safeParse(json)
      if (parsed.success) {
        dossier = parsed.data
        for (const field of ["job_id", "captured_at", "schema", "posting_sha256"] as const) {
          if (cell(field) !== dossier[field]) errors.push(`${field} diverge do dossier`)
        }
      } else {
        errors.push(
          ...parsed.error.issues
            .slice(0, 5)
            .map((issue) => `dossier/1: ${issue.path.join(".") || "(raiz)"} ${issue.message}`)
        )
      }
    }
  }

  return {
    job_id: cell("job_id").trim(),
    captured_at: cell("captured_at"),
    schema: cell("schema"),
    posting_sha256: cell("posting_sha256"),
    dossier_sha256: cell("dossier_sha256"),
    posting_md: cell("posting_md"),
    posting_truncated: postingTruncated,
    row: record.row,
    integrity,
    valid: errors.length === 0,
    errors,
    // An invalid row never exposes its content as if it were trustworthy.
    dossier: errors.length === 0 ? dossier : null,
  }
}

export function parseDossiers(table: Table): DossierRecord[] {
  return table.records.filter((record) => record.get("job_id").trim() !== "").map(parseDossierRecord)
}

/** Latest row per job_id: max `captured_at`; on a tie the lowest row (appended later) wins. */
export function latestDossiers(records: DossierRecord[]): Map<string, { latest: DossierRecord; rows: number }> {
  const out = new Map<string, { latest: DossierRecord; rows: number }>()
  for (const record of records) {
    const current = out.get(record.job_id)
    if (!current) {
      out.set(record.job_id, { latest: record, rows: 1 })
      continue
    }
    current.rows += 1
    if (record.captured_at >= current.latest.captured_at) current.latest = record
  }
  return out
}
