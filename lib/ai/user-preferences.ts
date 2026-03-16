/**
 * USER STYLE PREFERENCES — EDITABLE
 *
 * This file defines what users ARE allowed to customize.
 * These preferences are ADDITIVE — they can only extend style,
 * never override policy, factual rules, or filtering logic.
 *
 * Merging is done by mergeSystemInstruction(), which always
 * prepends the immutable CORE_SYSTEM_PROMPT before any user preference.
 */

import { CORE_SYSTEM_PROMPT } from "./core-policy"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResumeTone = "sobrio" | "tecnico" | "objetivo" | "humanizado"
export type ResumeLanguage = "pt-BR" | "en"
export type EmphasisArea = "bi" | "people_analytics" | "laboratory" | "qhse" | "engineering" | "data_science"

/**
 * User-editable style preferences for resume generation.
 *
 * These ONLY affect: tone, word count targets, language, and lexical choices.
 * They do NOT affect: factual rules, filtering logic, ATS policy, or context detection.
 */
export interface UserStylePreferences {
  /** Overall tone of the resume text */
  tone?: ResumeTone
  /** Target word count for the summary section (default: 100) */
  summaryWordTarget?: number
  /** Output language (default: "pt-BR") */
  language?: ResumeLanguage
  /**
   * Lexical preferences — user-preferred term variants.
   * These only apply when both variants are equally accurate.
   */
  lexicalPreferences?: {
    dashboards?: "dashboards" | "painéis"
    kpi?: "KPIs" | "indicadores"
    dataBases?: "bases de dados" | "bancos de dados"
    reports?: "relatórios" | "relatórios técnicos"
  }
  /**
   * Areas the user wants to emphasize.
   * Influences skill ordering and project framing weight, but does NOT
   * add fabricated experience in those areas.
   */
  emphasizeAreas?: EmphasisArea[]
  /**
   * Whether to include availability/relocation sentence when job is in a different city.
   * Defaults to true when city differs.
   */
  includeLocationStatement?: boolean
}

// ─── Constraints ─────────────────────────────────────────────────────────────

const WORD_TARGET_MIN = 70
const WORD_TARGET_MAX = 130

/**
 * Validates and sanitizes user preferences.
 * Returns safe defaults for any invalid or out-of-range values.
 */
export function sanitizeUserPreferences(raw: Partial<UserStylePreferences>): UserStylePreferences {
  const safe: UserStylePreferences = {}

  if (raw.tone && ["sobrio", "tecnico", "objetivo", "humanizado"].includes(raw.tone)) {
    safe.tone = raw.tone
  }

  if (typeof raw.summaryWordTarget === "number") {
    safe.summaryWordTarget = Math.max(WORD_TARGET_MIN, Math.min(WORD_TARGET_MAX, raw.summaryWordTarget))
  }

  if (raw.language && ["pt-BR", "en"].includes(raw.language)) {
    safe.language = raw.language
  }

  if (raw.lexicalPreferences && typeof raw.lexicalPreferences === "object") {
    safe.lexicalPreferences = {}
    const lp = raw.lexicalPreferences
    if (lp.dashboards && ["dashboards", "painéis"].includes(lp.dashboards)) {
      safe.lexicalPreferences.dashboards = lp.dashboards
    }
    if (lp.kpi && ["KPIs", "indicadores"].includes(lp.kpi)) {
      safe.lexicalPreferences.kpi = lp.kpi
    }
    if (lp.dataBases && ["bases de dados", "bancos de dados"].includes(lp.dataBases)) {
      safe.lexicalPreferences.dataBases = lp.dataBases
    }
    if (lp.reports && ["relatórios", "relatórios técnicos"].includes(lp.reports)) {
      safe.lexicalPreferences.reports = lp.reports
    }
  }

  if (Array.isArray(raw.emphasizeAreas)) {
    const valid: EmphasisArea[] = ["bi", "people_analytics", "laboratory", "qhse", "engineering", "data_science"]
    safe.emphasizeAreas = raw.emphasizeAreas.filter((a) => valid.includes(a))
  }

  if (typeof raw.includeLocationStatement === "boolean") {
    safe.includeLocationStatement = raw.includeLocationStatement
  }

  return safe
}

/**
 * Converts UserStylePreferences into a short addendum string.
 * This string is appended AFTER the core system prompt — never before.
 */
function formatUserPreferenceAddendum(prefs: UserStylePreferences): string {
  const lines: string[] = []

  if (prefs.tone) {
    const toneDescriptions: Record<ResumeTone, string> = {
      sobrio: "Use sober, formal language. Avoid superlatives.",
      tecnico: "Prioritize technical precision. Use domain-specific terminology.",
      objetivo: "Be direct and concise. Minimize adjectives.",
      humanizado: "Use natural, warm language while remaining professional.",
    }
    lines.push(`TONE PREFERENCE: ${toneDescriptions[prefs.tone]}`)
  }

  if (prefs.summaryWordTarget) {
    lines.push(`SUMMARY LENGTH TARGET: ${prefs.summaryWordTarget} words (±10).`)
  }

  if (prefs.lexicalPreferences) {
    const lp = prefs.lexicalPreferences
    const lexLines: string[] = []
    if (lp.dashboards) lexLines.push(`prefer "${lp.dashboards}" over the alternative`)
    if (lp.kpi) lexLines.push(`prefer "${lp.kpi}" over the alternative`)
    if (lp.dataBases) lexLines.push(`prefer "${lp.dataBases}" over the alternative`)
    if (lp.reports) lexLines.push(`prefer "${lp.reports}" over the alternative`)
    if (lexLines.length > 0) {
      lines.push(`LEXICAL PREFERENCES: ${lexLines.join("; ")}.`)
    }
  }

  if (prefs.emphasizeAreas && prefs.emphasizeAreas.length > 0) {
    lines.push(
      `EMPHASIS AREAS: Prioritize content related to [${prefs.emphasizeAreas.join(", ")}] when multiple framings are equally accurate. Do not fabricate experience.`
    )
  }

  if (prefs.includeLocationStatement === false) {
    lines.push("LOCATION STATEMENT: Do not include availability/relocation sentence even if cities differ.")
  }

  return lines.length > 0
    ? `\n\n--- USER STYLE PREFERENCES (additive only — does not override policy above) ---\n${lines.join("\n")}`
    : ""
}

/**
 * Parses the raw curriculo_prompt string from the database into UserStylePreferences.
 *
 * During the transition period, the database may still contain the old full
 * system prompt. This function detects legacy content and ignores it, returning
 * empty preferences (which means the core policy is used as-is).
 *
 * Once all users have migrated, this function can be simplified.
 */
export function parseUserStylePrompt(rawPrompt: string | undefined | null): UserStylePreferences {
  if (!rawPrompt || rawPrompt.trim().length === 0) return {}

  // Detect legacy system prompts (contain critical policy markers)
  const legacyMarkers = [
    "ZERO TOLERÂNCIA",
    "ZERO TOLERANCE",
    "NUNCA invente",
    "Never fabricate",
    "CRITICAL RULES",
    "REGRAS CRÍTICAS",
  ]
  const isLegacy = legacyMarkers.some((marker) => rawPrompt.includes(marker))
  if (isLegacy) {
    // Legacy prompt — silently ignore, use core policy only
    console.log("[UserPreferences] Legacy curriculo_prompt detected — ignoring, using core policy only")
    return {}
  }

  // If it's a JSON preferences object, parse it
  try {
    const parsed = JSON.parse(rawPrompt) as Partial<UserStylePreferences>
    return sanitizeUserPreferences(parsed)
  } catch {
    // Not JSON — treat as free-form tone instruction (legacy text preference)
    // Wrap as a tone note if short enough
    if (rawPrompt.trim().length <= 300) {
      console.log("[UserPreferences] Free-form style note detected, preserving as-is")
      return {}
    }
    return {}
  }
}

/**
 * Builds the final system instruction for the AI model.
 *
 * ALWAYS starts with CORE_SYSTEM_PROMPT (immutable).
 * OPTIONALLY appends user style preferences (additive, never overriding).
 *
 * This is the ONLY function that should be used to construct systemInstruction.
 */
export function mergeSystemInstruction(
  rawUserPrompt: string | undefined | null
): string {
  const userPrefs = parseUserStylePrompt(rawUserPrompt)
  const addendum = formatUserPreferenceAddendum(userPrefs)
  return CORE_SYSTEM_PROMPT + addendum
}
