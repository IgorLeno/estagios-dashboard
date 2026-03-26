import { describe, it, expect } from "vitest"
import { isValidModelId, SUPPORTED_MODELS, DEFAULT_MODEL } from "@/lib/ai/models"

describe("isValidModelId", () => {
  it("should accept all models in the allowlist", () => {
    for (const model of SUPPORTED_MODELS) {
      expect(isValidModelId(model)).toBe(true)
    }
  })

  it("should accept the default model", () => {
    expect(isValidModelId(DEFAULT_MODEL)).toBe(true)
  })

  it("should accept valid provider/name format not in allowlist", () => {
    expect(isValidModelId("anthropic/claude-3.5-sonnet")).toBe(true)
  })

  it("should accept models with colons (free tier suffix)", () => {
    expect(isValidModelId("nvidia/nemotron-3-super-120b-a12b:free")).toBe(true)
  })

  it("should reject model ID without slash", () => {
    expect(isValidModelId("gemini-2.5-flash")).toBe(false)
  })

  it("should reject empty string", () => {
    expect(isValidModelId("")).toBe(false)
  })

  it("should reject slash with empty provider", () => {
    expect(isValidModelId("/grok-4.1-fast")).toBe(false)
  })

  it("should reject slash with empty name", () => {
    expect(isValidModelId("x-ai/")).toBe(false)
  })

  it("should reject bare slash", () => {
    expect(isValidModelId("/")).toBe(false)
  })
})

describe("SUPPORTED_MODELS", () => {
  it("should contain at least one model", () => {
    expect(SUPPORTED_MODELS.length).toBeGreaterThan(0)
  })

  it("should have DEFAULT_MODEL as first entry", () => {
    expect(SUPPORTED_MODELS[0]).toBe(DEFAULT_MODEL)
  })
})
