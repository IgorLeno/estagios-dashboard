import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockCreateAIModel,
  mockGenerateContent,
  mockLoadUserAIConfig,
  mockGetGenerationConfig,
  mockLoadUserSkillsBank,
  mockCalculateATSScore,
} = vi.hoisted(() => ({
  mockCreateAIModel: vi.fn(),
  mockGenerateContent: vi.fn(),
  mockLoadUserAIConfig: vi.fn(),
  mockGetGenerationConfig: vi.fn(),
  mockLoadUserSkillsBank: vi.fn(),
  mockCalculateATSScore: vi.fn(),
}))

vi.mock("../config", () => ({
  createAIModel: mockCreateAIModel,
  loadUserAIConfig: mockLoadUserAIConfig,
  getGenerationConfig: mockGetGenerationConfig,
}))

vi.mock("../skills-bank", () => ({
  loadUserSkillsBank: mockLoadUserSkillsBank,
}))

vi.mock("../ats-scorer", () => ({
  calculateATSScore: mockCalculateATSScore,
}))

import { getCVTemplate } from "../cv-templates"
import { buildJobProfile } from "../job-profile"
import { buildSummaryPrompt } from "../resume-prompts"
import { generateTailoredResume } from "../resume-generator"
import type { CVDraft } from "../consistency-agent"
import {
  FIXTURE_DATA_SCIENCE_RESEARCH,
  FIXTURE_LABORATORIO_QC,
  FIXTURE_PEOPLE_ANALYTICS_AEGEA,
  FIXTURE_VAGA_AMBIGUA,
} from "./fixtures/job-profile-fixtures"

function makeResponse(text: string) {
  return {
    response: {
      text: () => text,
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        totalTokenCount: 30,
      },
    },
  }
}

function extractDraftFromConsistencyPrompt(prompt: string): CVDraft {
  const match = prompt.match(/COMPLETE CV DRAFT TO AUDIT:\n([\s\S]+?)\n\n\*\*\*\nCONSISTENCY RULES/)

  if (!match) {
    throw new Error("Could not extract draft from consistency prompt")
  }

  return JSON.parse(match[1]) as CVDraft
}

beforeEach(() => {
  process.env.NODE_ENV = "test"

  const baseCv = getCVTemplate("pt")

  mockCreateAIModel.mockReturnValue({
    generateContent: mockGenerateContent,
  })

  mockLoadUserAIConfig.mockResolvedValue({
    modelo_gemini: "test-model",
    temperatura: 0.2,
    max_tokens: 1024,
    top_p: 0.9,
    curriculo_prompt: "",
  })

  mockGetGenerationConfig.mockImplementation((config: { temperatura: number; max_tokens: number; top_p: number }) => ({
    temperature: config.temperatura,
    maxOutputTokens: config.max_tokens,
    topP: config.top_p,
  }))

  mockLoadUserSkillsBank.mockResolvedValue([])
  mockCalculateATSScore.mockReturnValue(87)

  mockGenerateContent.mockImplementation(async (prompt: string) => {
    if (prompt.includes("Rewrite the professional summary")) {
      return makeResponse(JSON.stringify({
        summary:
          "Estudante de Engenharia Química com experiência acadêmica em análise de dados, relatórios técnicos, organização de bases e apoio a rotinas analíticas e operacionais.",
      }))
    }

    if (prompt.includes("CRITICAL: REORDER + SELECT FROM SKILLS BANK")) {
      return makeResponse(JSON.stringify({ skills: baseCv.skills }))
    }

    if (prompt.includes("KEEP TITLES UNCHANGED")) {
      return makeResponse(JSON.stringify({ projects: baseCv.projects }))
    }

    if (prompt.includes("COMPLETE CV DRAFT TO AUDIT")) {
      const draft = extractDraftFromConsistencyPrompt(prompt)
      return makeResponse(JSON.stringify({
        draft,
        report: { issues: [], corrections: [] },
      }))
    }

    throw new Error(`Unexpected prompt received by mock model: ${prompt.slice(0, 120)}`)
  })
})

afterEach(() => {
  vi.clearAllMocks()
  process.env.NODE_ENV = "test"
})

describe("generateTailoredResume — integração com JobProfile", () => {
  it("não lança erro para vaga de People Analytics (FIXTURE_PEOPLE_ANALYTICS_AEGEA)", async () => {
    await expect(generateTailoredResume(FIXTURE_PEOPLE_ANALYTICS_AEGEA, "pt")).resolves.toMatchObject({
      model: "test-model",
      personalizedSections: ["summary", "skills", "projects"],
      atsScore: 87,
    })
  })

  it("não lança erro para vaga de Data Science (FIXTURE_DATA_SCIENCE_RESEARCH)", async () => {
    await expect(generateTailoredResume(FIXTURE_DATA_SCIENCE_RESEARCH, "pt")).resolves.toMatchObject({
      model: "test-model",
      personalizedSections: ["summary", "skills", "projects"],
      atsScore: 87,
    })
  })

  it("não lança erro para vaga de laboratório (FIXTURE_LABORATORIO_QC)", async () => {
    await expect(generateTailoredResume(FIXTURE_LABORATORIO_QC, "pt")).resolves.toMatchObject({
      model: "test-model",
      personalizedSections: ["summary", "skills", "projects"],
      atsScore: 87,
    })
  })

  it("não lança erro para vaga ambígua (FIXTURE_VAGA_AMBIGUA)", async () => {
    await expect(generateTailoredResume(FIXTURE_VAGA_AMBIGUA, "pt")).resolves.toMatchObject({
      model: "test-model",
      personalizedSections: ["summary", "skills", "projects"],
      atsScore: 87,
    })
  })
})

describe("buildProfileBlock — serialização", () => {
  it("inclui forbidden_terms no bloco quando presentes", () => {
    const profile = buildJobProfile(FIXTURE_PEOPLE_ANALYTICS_AEGEA)
    const prompt = buildSummaryPrompt(FIXTURE_PEOPLE_ANALYTICS_AEGEA, "Resumo original", ["SQL"], "pt", profile)

    expect(prompt).toContain("STRUCTURED JOB PROFILE:")
    expect(prompt).toContain("⛔ FORBIDDEN — must NOT appear in output: laboratório, amostras")
  })

  it("inclui excel_exact_label quando policy === use_exact_label", () => {
    const profile = buildJobProfile(FIXTURE_PEOPLE_ANALYTICS_AEGEA)
    const prompt = buildSummaryPrompt(FIXTURE_PEOPLE_ANALYTICS_AEGEA, "Resumo original", ["SQL"], "pt", profile)

    expect(prompt).toContain('Excel label: use exactly "Excel Avançado" — no other form allowed')
  })

  it("inclui mensagem de localização quando require_location_statement === true", () => {
    const profile = buildJobProfile(FIXTURE_PEOPLE_ANALYTICS_AEGEA)
    const prompt = buildSummaryPrompt(FIXTURE_PEOPLE_ANALYTICS_AEGEA, "Resumo original", ["SQL"], "pt", profile)

    expect(prompt).toContain(
      "Location: job city differs from candidate base — MANDATORY: add relocation availability sentence as last sentence of summary"
    )
  })

  it("não inclui linha de localização quando require_location_statement === false", () => {
    const profile = buildJobProfile(FIXTURE_DATA_SCIENCE_RESEARCH)
    const prompt = buildSummaryPrompt(FIXTURE_DATA_SCIENCE_RESEARCH, "Resumo original", ["Python"], "pt", profile)

    expect(profile.require_location_statement).toBe(false)
    expect(prompt).not.toContain("Location:")
  })
})
