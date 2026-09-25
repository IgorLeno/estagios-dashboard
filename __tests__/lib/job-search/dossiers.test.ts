// @vitest-environment node
import { describe, expect, it } from "vitest"
import { latestDossiers, parseDossiers, sha256Text } from "@/lib/job-search/dossiers"
import { DOSSIER_COLUMNS, readTable } from "@/lib/job-search/sheet-parse"
import { dossierTab, fixtureDossierRow, type DossierColumn } from "./helpers"

function parse(...rows: Record<DossierColumn, string>[]) {
  return parseDossiers(readTable("Dossiers", dossierTab(...rows), DOSSIER_COLUMNS, []))
}

/** Replace the JSON cell and recompute its hash, as a well-formed but different row would be. */
function withJson(row: Record<DossierColumn, string>, json: unknown): Record<DossierColumn, string> {
  const text = JSON.stringify(json)
  return { ...row, dossier_json: text, dossier_sha256: sha256Text(text) }
}

describe("parseDossierRecord", () => {
  const good = fixtureDossierRow("fake-1001")

  it("accepts the job-search fixture row", () => {
    const [record] = parse(good)
    expect(record.valid).toBe(true)
    expect(record.integrity).toBe(true)
    expect(record.posting_truncated).toBe(false)
    expect(record.dossier?.job_id).toBe("fake-1001")
  })

  it("rejects a sha256 mismatch", () => {
    const [record] = parse({ ...good, dossier_sha256: "f".repeat(64) })
    expect(record.integrity).toBe(false)
    expect(record.valid).toBe(false)
    expect(record.dossier).toBeNull()
  })

  it("hashes the cell text as-is, never re-serialized JSON", () => {
    const reformatted = JSON.stringify(JSON.parse(good.dossier_json), null, 2)
    const [record] = parse({ ...good, dossier_json: reformatted })
    expect(record.integrity).toBe(false)
  })

  it("rejects columns that disagree with the JSON", () => {
    const [record] = parse({ ...good, captured_at: "2026-01-01T00:00:00Z" })
    expect(record.valid).toBe(false)
    expect(record.errors).toContain("captured_at diverge do dossier")
  })

  it("checks the posting hash only when the posting was not truncated", () => {
    expect(parse({ ...good, posting_md: good.posting_md + "x" })[0].errors).toContain(
      "posting_sha256 não confere com posting_md"
    )
    const truncated = fixtureDossierRow("fake-1002")
    expect(truncated.posting_truncated).toBe("TRUE")
    expect(parse(truncated)[0].valid).toBe(true)
    expect(parse({ ...good, posting_truncated: "true" })[0].errors).toContain(
      "posting_truncated deve ser TRUE ou FALSE"
    )
  })

  it("validates the dossier/1 schema, including the closed top-level key set", () => {
    const json = JSON.parse(good.dossier_json)
    const extra = parse(withJson(good, { ...json, extra: 1 }))[0]
    expect(extra.integrity).toBe(true)
    expect(extra.valid).toBe(false)

    const missing = { ...json }
    delete missing.analysis
    expect(parse(withJson(good, missing))[0].valid).toBe(false)

    const badEnum = { ...json, availability: { ...json.availability, status: "aberta" } }
    expect(parse(withJson(good, badEnum))[0].errors.join()).toContain("availability.status")

    expect(parse({ ...good, dossier_json: "{", dossier_sha256: sha256Text("{") })[0].errors).toContain(
      "dossier_json não é JSON"
    )
  })
})

describe("latestDossiers", () => {
  it("picks the max captured_at per job and, on a tie, the lower row", () => {
    const older = fixtureDossierRow("fake-1001")
    const records = parse(older, { ...older, posting_md: older.posting_md }, fixtureDossierRow("fake-1003"))
    const latest = latestDossiers(records)
    expect(latest.get("fake-1001")).toMatchObject({ rows: 2, latest: { row: 3 } })
    expect(latest.get("fake-1003")?.rows).toBe(1)
  })
})
