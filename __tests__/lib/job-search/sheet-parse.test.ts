// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  MAIN_COLUMNS,
  findMainTab,
  parseCoverage,
  parseJobRows,
  parseSheetDate,
  readTable,
} from "@/lib/job-search/sheet-parse"
import type { SnapshotIssue } from "@/lib/job-search/types"

function mainTable(header: string[], rows: string[][]) {
  const issues: SnapshotIssue[] = []
  const table = readTable("Registro", [header, ...rows], MAIN_COLUMNS, issues, { familia_funcao: "trilha" })
  return { jobs: parseJobRows(table, false), issues }
}

describe("readTable / parseJobRows", () => {
  it("locates columns by header regardless of physical order", () => {
    const header = ["status_analise", "empresa", "job_id", "status_disponibilidade"]
    const { jobs } = mainTable(header, [["SELECIONADA", "Empresa X", "j-1", "ABERTA"]])
    expect(jobs[0]).toMatchObject({
      job_id: "j-1",
      empresa: "Empresa X",
      status_analise: "SELECIONADA",
      status_disponibilidade: "ABERTA",
    })
  })

  it("reads the legacy `trilha` header as familia_funcao and reports it", () => {
    const { jobs, issues } = mainTable(["job_id", "trilha", "status_analise"], [["j-1", "DADOS_BI", "DESCARTADA"]])
    expect(jobs[0].familia_funcao).toBe("DADOS_BI")
    expect(issues).toContainEqual(expect.objectContaining({ code: "LEGACY_HEADER", field: "familia_funcao" }))
    expect(issues).not.toContainEqual(expect.objectContaining({ code: "HEADER_MISSING", field: "familia_funcao" }))
  })

  it("keeps enum values outside the domain as invalid instead of coercing them", () => {
    const { jobs } = mainTable(
      ["job_id", "status_analise", "status_disponibilidade", "status_candidatura", "interesse"],
      [["j-1", "SELECIONADA", "aberta", "NãO INICIADA", "MUITO_ALTO"]]
    )
    expect(jobs[0].status_disponibilidade).toEqual({ invalid: "aberta" })
    expect(jobs[0].status_candidatura).toEqual({ invalid: "NãO INICIADA" })
    expect(jobs[0].interesse).toBe("MUITO_ALTO")
    expect(jobs[0].issues.filter((issue) => issue.code === "ENUM_INVALID").map((issue) => issue.field)).toEqual([
      "status_disponibilidade",
      "status_candidatura",
    ])
  })

  it("reports empty required enums, missing and duplicated headers without shifting columns", () => {
    const { jobs, issues } = mainTable(
      ["job_id", "empresa", "empresa", "status_analise"],
      [
        ["j-1", "A", "B", ""],
        ["", "sem id", "", "SELECIONADA"],
      ]
    )
    expect(jobs).toHaveLength(1)
    expect(jobs[0].empresa).toBe("")
    expect(jobs[0].issues.map((issue) => issue.code)).toContain("REQUIRED_EMPTY")
    expect(issues).toContainEqual(expect.objectContaining({ code: "HEADER_DUPLICATED", field: "empresa" }))
    expect(issues).toContainEqual(expect.objectContaining({ code: "HEADER_MISSING", field: "cargo" }))
  })

  it("normalizes dates and flags unparseable ones", () => {
    const { jobs } = mainTable(
      ["job_id", "status_analise", "status_disponibilidade", "data_primeira_analise", "data_candidatura"],
      [["j-1", "SELECIONADA", "ABERTA", "25/09/2026", "ontem"]]
    )
    expect(jobs[0].data_primeira_analise).toBe("2026-09-25")
    expect(jobs[0].data_candidatura).toBeNull()
    expect(jobs[0].issues).toContainEqual(expect.objectContaining({ code: "DATE_INVALID", field: "data_candidatura" }))
  })
})

describe("parseSheetDate", () => {
  it.each([
    ["2026-09-25", "2026-09-25"],
    ["2026-09-25T10:00:00Z", "2026-09-25"],
    ["25/09/2026", "2026-09-25"],
    ["", null],
    ["2026-02-30", undefined],
    ["set/2026", undefined],
  ])("%s → %s", (raw, expected) => {
    expect(parseSheetDate(raw)).toBe(expected)
  })
})

describe("parseCoverage", () => {
  it("parses rows by header with enum fallback", () => {
    const issues: SnapshotIssue[] = []
    const table = readTable(
      "Cobertura de Fontes",
      [
        ["fonte", "resultado", "data_execucao", "tier", "familia", "observacoes"],
        ["LinkedIn", "OK", "2026-09-24", "Tier A", "Agregador", ""],
        ["Gupy", "Bloqueado", "2026-09-24", "Tier B", "ATS", ""],
      ],
      ["data_execucao", "fonte", "tier", "familia", "resultado", "observacoes"],
      issues
    )
    expect(parseCoverage(table).map((row) => row.resultado)).toEqual(["OK", { invalid: "Bloqueado" }])
    expect(issues).toEqual([])
  })
})

describe("findMainTab", () => {
  const header = [["job_id", "status_analise"]]

  it("ignores auxiliary, archive and backup tabs", () => {
    expect(
      findMainTab({ Registro: header, Encerradas: header, "backup-v1-2026": header, Dossiers: [["job_id"]] }).tab
    ).toBe("Registro")
  })

  it("reports ambiguity and absence", () => {
    expect(findMainTab({ A: header, B: header }).issue?.code).toBe("MAIN_TAB_AMBIGUOUS")
    expect(findMainTab({ A: [["job_id"]] }).issue?.code).toBe("MAIN_TAB_NOT_FOUND")
  })
})
