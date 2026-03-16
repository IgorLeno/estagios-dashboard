/**
 * Tests for user-preferences.ts
 *
 * Run with: npx jest lib/ai/__tests__/user-preferences.test.ts
 */

import {
  mergeSystemInstruction,
  parseUserStylePrompt,
  sanitizeUserPreferences,
  SUMMARY_WORD_TARGET_MIN,
  SUMMARY_WORD_TARGET_MAX,
} from "../user-preferences"
import { CORE_SYSTEM_PROMPT } from "../core-policy"

// ─── mergeSystemInstruction ────────────────────────────────────────────────────────

describe("mergeSystemInstruction", () => {
  it("always starts with CORE_SYSTEM_PROMPT", () => {
    const result = mergeSystemInstruction(null)
    expect(result.startsWith(CORE_SYSTEM_PROMPT)).toBe(true)
  })

  it("starts with CORE_SYSTEM_PROMPT even when valid JSON prefs are provided", () => {
    const prefs = JSON.stringify({ tone: "tecnico", summaryWordTarget: 100 })
    const result = mergeSystemInstruction(prefs)
    expect(result.startsWith(CORE_SYSTEM_PROMPT)).toBe(true)
  })

  it("starts with CORE_SYSTEM_PROMPT even when legacy prompt is provided", () => {
    const legacy = "REGRAS CRÍTICAS: NUNCA invente habilidades."
    const result = mergeSystemInstruction(legacy)
    expect(result.startsWith(CORE_SYSTEM_PROMPT)).toBe(true)
  })

  it("returns exactly CORE_SYSTEM_PROMPT when input is null", () => {
    const result = mergeSystemInstruction(null)
    expect(result).toBe(CORE_SYSTEM_PROMPT)
  })

  it("returns exactly CORE_SYSTEM_PROMPT when input is empty string", () => {
    const result = mergeSystemInstruction("")
    expect(result).toBe(CORE_SYSTEM_PROMPT)
  })

  it("appends style addendum after core prompt when valid prefs provided", () => {
    const prefs = JSON.stringify({ tone: "objetivo" })
    const result = mergeSystemInstruction(prefs)
    expect(result.length).toBeGreaterThan(CORE_SYSTEM_PROMPT.length)
    expect(result).toContain("USER STYLE PREFERENCES")
  })
})

// ─── parseUserStylePrompt — legacy detection ───────────────────────────────────────

describe("parseUserStylePrompt — legacy detection", () => {
  const legacyCases = [
    "ZERO TOLERÂNCIA PARA VIOLAÇÕES",
    "ZERO TOLERANCE for fabrication",
    "NUNCA invente habilidades, ferramentas",
    "Never fabricate skills",
    "CRITICAL RULES — strictly follow:",
    "REGRAS CRÍTICAS — não invenção:",
  ]

  legacyCases.forEach((legacy) => {
    it(`returns {} for legacy marker: "${legacy.slice(0, 40)}..."`, () => {
      const result = parseUserStylePrompt(legacy)
      expect(result).toEqual({})
    })
  })

  it("returns {} for the actual DEFAULT_PROMPTS_CONFIG.curriculo_prompt", () => {
    const defaultLegacyPrompt = `⚠️ REGRAS CRÍTICAS - ZERO TOLERÂNCIA PARA VIOLAÇÕES:\n\n1. NUNCA invente habilidades`
    const result = parseUserStylePrompt(defaultLegacyPrompt)
    expect(result).toEqual({})
  })
})

// ─── parseUserStylePrompt — free-form text ─────────────────────────────────────────

describe("parseUserStylePrompt — free-form text", () => {
  it("returns {} for short free-form text (not JSON, not legacy)", () => {
    const result = parseUserStylePrompt("Use a more formal tone please.")
    expect(result).toEqual({})
  })

  it("returns {} for longer free-form text that is not a legacy prompt", () => {
    const result = parseUserStylePrompt(
      "Please write in a more technical style and keep the summary under 100 words. Focus on data analysis."
    )
    expect(result).toEqual({})
  })
})

// ─── parseUserStylePrompt — valid JSON ────────────────────────────────────────────

describe("parseUserStylePrompt — valid JSON", () => {
  it("parses valid JSON preferences correctly", () => {
    const prefs = JSON.stringify({ tone: "tecnico", summaryWordTarget: 90 })
    const result = parseUserStylePrompt(prefs)
    expect(result.tone).toBe("tecnico")
    expect(result.summaryWordTarget).toBe(90)
  })

  it("sanitizes invalid tone value from JSON", () => {
    const prefs = JSON.stringify({ tone: "agressivo" })
    const result = parseUserStylePrompt(prefs)
    expect(result.tone).toBeUndefined()
  })

  it("sanitizes invalid emphasizeArea from JSON", () => {
    const prefs = JSON.stringify({ emphasizeAreas: ["bi", "hacking", "people_analytics"] })
    const result = parseUserStylePrompt(prefs)
    expect(result.emphasizeAreas).toEqual(["bi", "people_analytics"])
  })
})

// ─── sanitizeUserPreferences — summaryWordTarget clamp ────────────────────────────

describe("sanitizeUserPreferences — summaryWordTarget clamp", () => {
  it("clamps value below minimum to MIN", () => {
    const result = sanitizeUserPreferences({ summaryWordTarget: 10 })
    expect(result.summaryWordTarget).toBe(SUMMARY_WORD_TARGET_MIN)
  })

  it("clamps value above maximum to MAX", () => {
    const result = sanitizeUserPreferences({ summaryWordTarget: 999 })
    expect(result.summaryWordTarget).toBe(SUMMARY_WORD_TARGET_MAX)
  })

  it("preserves value within valid range", () => {
    const result = sanitizeUserPreferences({ summaryWordTarget: 100 })
    expect(result.summaryWordTarget).toBe(100)
  })

  it("preserves MIN boundary value", () => {
    const result = sanitizeUserPreferences({ summaryWordTarget: SUMMARY_WORD_TARGET_MIN })
    expect(result.summaryWordTarget).toBe(SUMMARY_WORD_TARGET_MIN)
  })

  it("preserves MAX boundary value", () => {
    const result = sanitizeUserPreferences({ summaryWordTarget: SUMMARY_WORD_TARGET_MAX })
    expect(result.summaryWordTarget).toBe(SUMMARY_WORD_TARGET_MAX)
  })
})
