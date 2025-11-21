import { describe, it, expect } from "vitest"
import { generateResumeFilename } from "@/lib/ai/pdf-generator"

describe("generateResumeFilename", () => {
  it("should generate filename with sanitized company name", () => {
    const filename = generateResumeFilename("Saipem Brasil", "pt")
    expect(filename).toBe("cv-igor-fernandes-saipem-brasil-pt.pdf")
  })

  it("should handle special characters", () => {
    const filename = generateResumeFilename("Company & Co. Ltd.", "en")
    expect(filename).toBe("cv-igor-fernandes-company-co-ltd-en.pdf")
  })

  it("should handle multiple spaces", () => {
    const filename = generateResumeFilename("Big   Company   Name", "pt")
    expect(filename).toBe("cv-igor-fernandes-big-company-name-pt.pdf")
  })

  it("should include language suffix", () => {
    const filenamePt = generateResumeFilename("Test", "pt")
    const filenameEn = generateResumeFilename("Test", "en")

    expect(filenamePt).toContain("-pt.pdf")
    expect(filenameEn).toContain("-en.pdf")
  })
})
