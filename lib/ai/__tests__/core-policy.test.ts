/**
 * Contract tests for core-policy and user-preferences.
 *
 * These tests exist to enforce three invariants:
 * 1. mergeSystemInstruction() always starts with CORE_SYSTEM_PROMPT.
 * 2. Legacy curriculo_prompt strings (containing policy markers) produce empty preferences.
 * 3. summaryWordTarget is clamped to [70, 130].
 *
 * Run with: npx jest lib/ai/__tests__/core-policy.test.ts
 */

import { CORE_SYSTEM_PROMPT } from "../core-policy"
import {
  mergeSystemInstruction,
  parseUserStylePrompt,
  sanitizeUserPreferences,
  SUMMARY_WORD_TARGET_MIN,
  SUMMARY_WORD_TARGET_MAX,
} from "../user-preferences"

describe("CORE_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof CORE_SYSTEM_PROMPT).toBe("string")
    expect(CORE_SYSTEM_PROMPT.length).toBeGreaterThan(100)
  })

  it("contains hard rule markers", () => {
    expect(CORE_SYSTEM_PROMPT).toContain("Never invent")
    expect(CORE_SYSTEM_PROMPT).toContain("PRIORITY ORDER")
    expect(CORE_SYSTEM_PROMPT).toContain("HARD RULES")
  })
})

describe("mergeSystemInstruction()", () => {
  it("always starts with CORE_SYSTEM_PROMPT regardless of user input", () => {
    const cases = [
      null,
      undefined,
      "",
      JSON.stringify({ tone: "objetivo" }),
      "some free-form text",
      "ZERO TOLER\u00c2NCIA para fabrica\u00e7\u00e3o",
    ]
    for (const input of cases) {
      const result = mergeSystemInstruction(input as any)
      expect(result.startsWith(CORE_SYSTEM_PROMPT)).toBe(true)
    }
  })

  it("appends style addendum after core prompt when valid preferences given", () => {
    const prefs = JSON.stringify({ tone: "tecnico", summaryWordTarget: 90 })
    const result = mergeSystemInstruction(prefs)
    expect(result.startsWith(CORE_SYSTEM_PROMPT)).toBe(true)
    expect(result.length).toBeGreaterThan(CORE_SYSTEM_PROMPT.length)
    expect(result).toContain("TONE PREFERENCE")
    expect(result).toContain("90 words")
  })

  it("returns exactly CORE_SYSTEM_PROMPT when no user preferences provided", () => {
    expect(mergeSystemInstruction(null)).toBe(CORE_SYSTEM_PROMPT)
    expect(mergeSystemInstruction(undefined)).toBe(CORE_SYSTEM_PROMPT)
    expect(mergeSystemInstruction("")).toBe(CORE_SYSTEM_PROMPT)
  })
})

describe("parseUserStylePrompt() — legacy detection", () => {
  const legacyInputs = [
    "ZERO TOLER\u00c2NCIA PARA VIOLA\u00c7\u00d5ES",
    "NUNCA invente habilidades",
    "CRITICAL RULES — do not fabricate",
    "REGRAS CR\u00cdTICAS de gera\u00e7\u00e3o",
    "Never fabricate experience",
  ]

  for (const input of legacyInputs) {
    it(`returns {} for legacy prompt containing: "${input.slice(0, 40)}"`, () => {
      const result = parseUserStylePrompt(input)
      expect(result).toEqual({})
    })
  }

  it("returns {} for empty input", () => {
    expect(parseUserStylePrompt(null)).toEqual({})
    expect(parseUserStylePrompt(undefined)).toEqual({})
    expect(parseUserStylePrompt("")).toEqual({})
  })

  it("parses valid JSON preferences", () => {
    const input = JSON.stringify({ tone: "objetivo", summaryWordTarget: 100 })
    const result = parseUserStylePrompt(input)
    expect(result.tone).toBe("objetivo")
    expect(result.summaryWordTarget).toBe(100)
  })

  it("returns {} for non-JSON, non-legacy free-form text", () => {
    const result = parseUserStylePrompt("Escreva de forma direta e objetiva.")
    expect(result).toEqual({})
  })
})

describe("sanitizeUserPreferences() — summaryWordTarget clamp", () => {
  it("clamps below minimum to SUMMARY_WORD_TARGET_MIN", () => {
    const result = sanitizeUserPreferences({ summaryWordTarget: 10 })
    expect(result.summaryWordTarget).toBe(SUMMARY_WORD_TARGET_MIN)
  })

  it("clamps above maximum to SUMMARY_WORD_TARGET_MAX", () => {
    const result = sanitizeUserPreferences({ summaryWordTarget: 999 })
    expect(result.summaryWordTarget).toBe(SUMMARY_WORD_TARGET_MAX)
  })

  it("keeps values within range as-is", () => {
    expect(sanitizeUserPreferences({ summaryWordTarget: 70 }).summaryWordTarget).toBe(70)
    expect(sanitizeUserPreferences({ summaryWordTarget: 100 }).summaryWordTarget).toBe(100)
    expect(sanitizeUserPreferences({ summaryWordTarget: 130 }).summaryWordTarget).toBe(130)
  })

  it("rejects invalid tone values and returns empty preferences", () => {
    const result = sanitizeUserPreferences({ tone: "agressivo" as any })
    expect(result.tone).toBeUndefined()
  })

  it("accepts all valid tones", () => {
    for (const tone of ["sobrio", "tecnico", "objetivo", "humanizado"] as const) {
      expect(sanitizeUserPreferences({ tone }).tone).toBe(tone)
    }
  })
})
