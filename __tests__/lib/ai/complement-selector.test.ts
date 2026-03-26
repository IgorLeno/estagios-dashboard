import { beforeEach, describe, expect, it, vi } from "vitest"
import { selectComplements } from "@/lib/ai/complement-selector"
import type { JobDetails } from "@/lib/ai/types"

const { mockCallGrok } = vi.hoisted(() => ({
  mockCallGrok: vi.fn(),
}))

vi.mock("@/lib/ai/grok-client", () => ({
  callGrok: mockCallGrok,
}))

vi.mock("@/lib/ai/config", () => ({
  loadUserAIConfig: vi.fn(async () => ({
    modelo_gemini: "x-ai/grok-4.1-fast",
    temperatura: 0.5,
  })),
  getGenerationConfig: vi.fn(() => ({
    temperature: 0.5,
  })),
}))

vi.mock("@/lib/ai/cv-templates", () => ({
  getCVTemplateForUser: vi.fn(async () => ({
    language: "pt",
    header: {
      name: "Igor Fernandes",
      title: "Engenheiro Químico",
      email: "igor@example.com",
      phone: "",
      location: "Santos, SP",
      links: [],
    },
    summary: "Resumo base",
    experience: [],
    education: [],
    languages: [],
    certifications: [
      { title: "Power BI Impressionador", institution: "Hashtag", year: "2023" },
      { title: "Deep Learning Specialization", institution: "Coursera", year: "2024" },
    ],
    skills: [
      { category: "Dados", items: ["Excel", "Power BI", "SQL"] },
      { category: "Qualidade", items: ["ISO 9001:2015", "Documentação"] },
    ],
    projects: [
      { title: "Dashboard de Análise de Processos", description: ["Projeto de indicadores"] },
      { title: "Simulação de Reator Químico", description: ["Projeto técnico"] },
    ],
  })),
}))

vi.mock("@/lib/ai/skills-bank", () => ({
  loadUserSkillsBank: vi.fn(async () => [
    { skill: "Excel Avançado", category: "Dados" },
    { skill: "Power BI", category: "Dados" },
  ]),
}))

const jobDetails: JobDetails = {
  empresa: "Saipem",
  cargo: "Estagiário QHSE",
  local: "Guarujá",
  modalidade: "Híbrido",
  tipo_vaga: "Estágio",
  requisitos_obrigatorios: ["Excel", "Power BI"],
  requisitos_desejaveis: ["SQL"],
  responsabilidades: ["Monitorar indicadores", "Documentar processos"],
  beneficios: [],
  salario: "R$ 1.800,00",
  idioma_vaga: "pt",
  etapa: "Indefinido",
  status: "Pendente",
}

describe("selectComplements", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("includes profile text, projects and skills bank in the selection prompt", async () => {
    mockCallGrok.mockResolvedValueOnce({
      content: JSON.stringify({
        skills: [
          { category: "Dados", items: ["Excel", "Power BI"], selected: true },
          { category: "Qualidade", items: ["ISO 9001:2015"], selected: false },
        ],
        projects: [
          { title: "Dashboard de Análise de Processos", selected: true, reason: "Alinha com indicadores." },
          { title: "Simulação de Reator Químico", selected: false, reason: "Menos aderente." },
        ],
        certifications: [
          { title: "Power BI Impressionador", selected: true, reason: "Diretamente relevante." },
          { title: "Deep Learning Specialization", selected: false, reason: "Pouco aderente." },
        ],
      }),
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    })

    await selectComplements(
      "Perfil profissional aprovado na aba fit.",
      jobDetails,
      "pt",
      undefined,
      "user-1"
    )

    const messages = mockCallGrok.mock.calls[0]?.[0]
    const prompt = messages?.[1]?.content as string

    expect(prompt).toContain("Perfil profissional aprovado na aba fit.")
    expect(prompt).toContain("Dashboard de Análise de Processos")
    expect(prompt).toContain("Excel Avançado")
  })

  it("truncates selections that exceed fixed project limits instead of throwing", async () => {
    mockCallGrok.mockResolvedValueOnce({
      content: JSON.stringify({
        skills: [{ category: "Dados", items: ["Excel"], selected: true }],
        projects: [
          { title: "Projeto 1", selected: true, reason: "A" },
          { title: "Projeto 2", selected: true, reason: "B" },
          { title: "Projeto 3", selected: true, reason: "C" },
          { title: "Projeto 4", selected: true, reason: "D" },
        ],
        certifications: [{ title: "Power BI Impressionador", selected: true, reason: "Direta." }],
      }),
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    })

    const result = await selectComplements("Perfil profissional aprovado na aba fit.", jobDetails, "pt")

    // Should truncate to MAX_PROJECTS (3), not throw
    const selectedProjects = result.selection.projects.filter((p) => p.selected)
    expect(selectedProjects.length).toBeLessThanOrEqual(3)
    // The 4th project should have been deselected
    expect(result.selection.projects[3].selected).toBe(false)
  })
})
