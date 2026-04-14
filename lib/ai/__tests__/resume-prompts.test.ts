import { describe, expect, it } from "vitest"
import { buildSkillsPrompt, buildSummaryPrompt, buildProjectsPrompt } from "../resume-prompts"
import { buildJobProfile } from "../job-profile"
import { getCVTemplate } from "../cv-templates"
import {
  FIXTURE_PEOPLE_ANALYTICS_AEGEA,
  FIXTURE_DATA_SCIENCE_RESEARCH,
  FIXTURE_LABORATORIO_QC,
} from "./fixtures/job-profile-fixtures"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSkillsPromptForFixture(
  fixture: typeof FIXTURE_PEOPLE_ANALYTICS_AEGEA,
  language: "pt" | "en" = "pt",
  approvedSkills?: string[]
) {
  const cv = getCVTemplate(language)
  const profile = buildJobProfile(fixture)
  return buildSkillsPrompt(
    fixture,
    cv.skills,
    cv.projects,
    language,
    profile,
    approvedSkills
  )
}

function buildSummaryPromptForFixture(
  fixture: typeof FIXTURE_PEOPLE_ANALYTICS_AEGEA,
  language: "pt" | "en" = "pt"
) {
  const cv = getCVTemplate(language)
  const profile = buildJobProfile(fixture)
  const allSkills = cv.skills.flatMap((g) => g.items)
  return buildSummaryPrompt(fixture, cv.summary, allSkills, language, profile)
}

function buildProjectsPromptForFixture(
  fixture: typeof FIXTURE_PEOPLE_ANALYTICS_AEGEA,
  language: "pt" | "en" = "pt"
) {
  const cv = getCVTemplate(language)
  const profile = buildJobProfile(fixture)
  return buildProjectsPrompt(fixture, cv.projects, language, profile)
}

// ─── approvedSkills integration ───────────────────────────────────────────────

describe("buildSkillsPrompt — approvedSkills", () => {
  it("includes approved skills as context only when provided", () => {
    const prompt = buildSkillsPromptForFixture(FIXTURE_PEOPLE_ANALYTICS_AEGEA, "pt", [
      "Gestão de Pessoas",
      "SAP SuccessFactors",
    ])

    expect(prompt).toContain("USER-APPROVED SKILLS (context only; do not add unless already present in USER'S CV SKILLS):")
    expect(prompt).toContain("Gestão de Pessoas, SAP SuccessFactors")
    expect(prompt).not.toContain("User-Approved Skills: Gestão de Pessoas, SAP SuccessFactors")
  })

  it("does not include User-Approved Skills line when approvedSkills is empty", () => {
    const prompt = buildSkillsPromptForFixture(FIXTURE_PEOPLE_ANALYTICS_AEGEA, "pt", [])

    expect(prompt).not.toContain("USER-APPROVED SKILLS (context only")
  })

  it("does not include User-Approved Skills line when approvedSkills is undefined", () => {
    const prompt = buildSkillsPromptForFixture(FIXTURE_PEOPLE_ANALYTICS_AEGEA, "pt")

    expect(prompt).not.toContain("USER-APPROVED SKILLS (context only")
  })
})

describe("buildSkillsPrompt — source restrictions", () => {
  it("does not mention legacy skills bank instructions", () => {
    const prompt = buildSkillsPromptForFixture(FIXTURE_PEOPLE_ANALYTICS_AEGEA)

    expect(prompt).not.toContain("SKILLS BANK")
    expect(prompt).toContain("PROFILE SKILLS")
  })
})

// ─── No legacy context in prompts ─────────────────────────────────────────────

describe("prompts — no legacy context instructions", () => {
  const LEGACY_MARKERS = [
    "CONTEXTO LABORATORIAL",
    "CONTEXTO DATA SCIENCE",
    "CONTEXTO DE QHSE",
    "CONTEXTO DE ENGENHARIA",
    "LABORATORY CONTEXT DETECTED",
    "DATA SCIENCE CONTEXT DETECTED",
    "QHSE CONTEXT DETECTED",
    "CONTEXTO GERAL",
  ]

  it("buildSkillsPrompt does not contain legacy context markers", () => {
    for (const fixture of [FIXTURE_PEOPLE_ANALYTICS_AEGEA, FIXTURE_DATA_SCIENCE_RESEARCH, FIXTURE_LABORATORIO_QC]) {
      const prompt = buildSkillsPromptForFixture(fixture)
      for (const marker of LEGACY_MARKERS) {
        expect(prompt).not.toContain(marker)
      }
    }
  })

  it("buildSummaryPrompt does not contain legacy context markers", () => {
    for (const fixture of [FIXTURE_PEOPLE_ANALYTICS_AEGEA, FIXTURE_DATA_SCIENCE_RESEARCH, FIXTURE_LABORATORIO_QC]) {
      const prompt = buildSummaryPromptForFixture(fixture)
      for (const marker of LEGACY_MARKERS) {
        expect(prompt).not.toContain(marker)
      }
    }
  })

  it("buildProjectsPrompt does not contain legacy context markers", () => {
    for (const fixture of [FIXTURE_PEOPLE_ANALYTICS_AEGEA, FIXTURE_DATA_SCIENCE_RESEARCH, FIXTURE_LABORATORIO_QC]) {
      const prompt = buildProjectsPromptForFixture(fixture)
      for (const marker of LEGACY_MARKERS) {
        expect(prompt).not.toContain(marker)
      }
    }
  })
})

// ─── Domain hints in profile block ────────────────────────────────────────────

describe("prompts — domain-specific hints from JobProfile", () => {
  it("skills prompt includes skill_reordering_hints for people_analytics", () => {
    const prompt = buildSkillsPromptForFixture(FIXTURE_PEOPLE_ANALYTICS_AEGEA)

    expect(prompt).toContain("DOMAIN-SPECIFIC GUIDANCE:")
    expect(prompt).toContain("move BI/analytics items")
  })

  it("skills prompt includes skill_reordering_hints for laboratory", () => {
    const prompt = buildSkillsPromptForFixture(FIXTURE_LABORATORIO_QC)

    expect(prompt).toContain("DOMAIN-SPECIFIC GUIDANCE:")
    expect(prompt).toContain("Química Analítica & Laboratório")
  })

  it("summary prompt includes summary_structure_hints for people_analytics", () => {
    const prompt = buildSummaryPromptForFixture(FIXTURE_PEOPLE_ANALYTICS_AEGEA)

    expect(prompt).toContain("DOMAIN-SPECIFIC GUIDANCE:")
    expect(prompt).toContain("Function-focused objective")
  })

  it("projects prompt includes project_reframing_hints for laboratory", () => {
    const prompt = buildProjectsPromptForFixture(FIXTURE_LABORATORIO_QC)

    expect(prompt).toContain("DOMAIN-SPECIFIC GUIDANCE:")
    expect(prompt).toContain("QUALITY CONTROL")
  })

  it("summary prompt for data_science includes ML-related hints", () => {
    const prompt = buildSummaryPromptForFixture(FIXTURE_DATA_SCIENCE_RESEARCH)

    expect(prompt).toContain("DOMAIN-SPECIFIC GUIDANCE:")
    expect(prompt).toContain("data/ML")
  })
})

// ─── Profile block always present ─────────────────────────────────────────────

describe("prompts — STRUCTURED JOB PROFILE always present", () => {
  it("skills prompt contains STRUCTURED JOB PROFILE section", () => {
    const prompt = buildSkillsPromptForFixture(FIXTURE_PEOPLE_ANALYTICS_AEGEA)
    expect(prompt).toContain("STRUCTURED JOB PROFILE:")
    expect(prompt).toContain("Role family:")
  })

  it("summary prompt contains STRUCTURED JOB PROFILE section", () => {
    const prompt = buildSummaryPromptForFixture(FIXTURE_PEOPLE_ANALYTICS_AEGEA)
    expect(prompt).toContain("STRUCTURED JOB PROFILE:")
    expect(prompt).toContain("Role family:")
  })

  it("projects prompt contains STRUCTURED JOB PROFILE section", () => {
    const prompt = buildProjectsPromptForFixture(FIXTURE_PEOPLE_ANALYTICS_AEGEA)
    expect(prompt).toContain("STRUCTURED JOB PROFILE:")
    expect(prompt).toContain("Role family:")
  })
})
