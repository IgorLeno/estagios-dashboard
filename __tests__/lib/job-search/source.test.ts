// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { dataSource, getJobSearchData } from "@/lib/job-search/source"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("dataSource", () => {
  it("reads the real Sheet only on explicit opt-in", () => {
    expect(dataSource({})).toBe("fixture")
    expect(dataSource({ JOB_SEARCH_DATA_SOURCE: "fixture" })).toBe("fixture")
    expect(dataSource({ JOB_SEARCH_DATA_SOURCE: "Sheets" })).toBe("fixture")
    expect(dataSource({ JOB_SEARCH_DATA_SOURCE: "sheets" })).toBe("sheets")
  })
})

describe("getJobSearchData", () => {
  it("serves the fixture without network access by default", async () => {
    vi.stubEnv("JOB_SEARCH_DATA_SOURCE", "")
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const data = await getJobSearchData()
    expect(data.source).toBe("fixture")
    expect(data.views).toHaveLength(9)
    expect(fetchSpy).not.toHaveBeenCalled()
    // Server Component props must survive JSON serialization unchanged.
    expect(JSON.parse(JSON.stringify(data))).toEqual(data)
  })
})
