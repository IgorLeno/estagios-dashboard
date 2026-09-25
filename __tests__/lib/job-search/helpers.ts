import fixture from "@/lib/job-search/fixtures/snapshot.json"
import { DOSSIER_COLUMNS } from "@/lib/job-search/sheet-parse"
import type { RawSnapshot } from "@/lib/job-search/types"

/** Deep copy of the generated fixture so tests can mutate it freely. */
export function fixtureSnapshot(): RawSnapshot {
  return JSON.parse(JSON.stringify(fixture)) as RawSnapshot
}

export type DossierColumn = (typeof DOSSIER_COLUMNS)[number]

/** Dossiers-tab row of the fixture for `jobId` (latest occurrence), as a column map. */
export function fixtureDossierRow(jobId: string): Record<DossierColumn, string> {
  const [header, ...rows] = fixtureSnapshot().tabs["Dossiers"]
  const row = rows.filter((cells) => cells[header.indexOf("job_id")] === jobId).at(-1)
  if (!row) throw new Error(`fixture has no dossier for ${jobId}`)
  return Object.fromEntries(DOSSIER_COLUMNS.map((name) => [name, row[header.indexOf(name)]])) as Record<
    DossierColumn,
    string
  >
}

export function dossierTab(...rows: Record<DossierColumn, string>[]): string[][] {
  return [[...DOSSIER_COLUMNS], ...rows.map((row) => DOSSIER_COLUMNS.map((name) => row[name]))]
}
