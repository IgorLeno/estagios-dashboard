import { describe, expect, it } from "vitest"
import { validateCVTemplate } from "@/lib/ai/resume-preflight"
import type { CVTemplate } from "@/lib/ai/types"

function createValidCV(): CVTemplate {
  return {
    language: "pt",
    header: {
      name: "Igor Leno de Souza Fernandes",
      title: "Estagiario de BI",
      email: "igor@example.com",
      phone: "(11) 99999-9999",
      location: "Sao Paulo/SP",
      links: [
        { label: "LinkedIn", url: "linkedin.com/in/igorfernandes" },
        { label: "GitHub", url: "github.com/igorfernandes" },
      ],
    },
    experience: [],
    education: [
      {
        degree: "Engenharia Quimica",
        institution: "UNESP",
        period: "2021-2026",
        location: "Araraquara/SP",
      },
    ],
    languages: [{ language: "Portugues", proficiency: "Nativo" }],
    certifications: [
      { title: "Google Data Analytics", institution: "Coursera", year: "2024" },
      { title: "Power BI", institution: "Data School", year: "2024" },
    ],
    summary:
      "Estudante de Engenharia Quimica na reta final da graduacao, com foco em analise de dados aplicada a processos e suporte operacional. Tenho pratica com Excel, SQL, Power BI e organizacao de bases para acompanhamento de indicadores e elaboracao de relatorios. Em projetos autorais e academicos, estruturei dados, automatizei rotinas em Python e documentei etapas para garantir consistencia e rastreabilidade. Busco atuar em estagio de BI para apoiar analises, manutencao de bases e visualizacao de indicadores.",
    skills: [
      { category: "Analise de Dados", items: ["Excel", "SQL", "Python", "Power BI"] },
      { category: "Processos", items: ["Validacao de dados", "Documentacao tecnica", "KPIs"] },
    ],
    projects: [
      {
        title: "Dashboard de Indicadores",
        description: [
          "Estruturei bases operacionais e modelei indicadores para acompanhamento semanal de desempenho em Power BI.",
          "Automatizei a consolidacao dos dados com SQL e Python, reduzindo retrabalho manual e melhorando a rastreabilidade.",
        ],
      },
      {
        title: "Pipeline de Dados",
        description: [
          "Organizei dados experimentais para analise recorrente, com padronizacao de campos e revisao de consistencia.",
          "Documentei regras, fontes e etapas do fluxo para facilitar manutencao e reaproveitamento do processo.",
        ],
      },
    ],
  }
}

describe("validateCVTemplate", () => {
  it("accepts a cv that fits the new hard limits", () => {
    const result = validateCVTemplate(createValidCV())

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it("blocks summary, skills and project bullet overflows", () => {
    const cv = createValidCV()
    cv.summary = "Resumo curto demais para passar."
    cv.skills = Array.from({ length: 7 }, (_, index) => ({
      category: `Categoria ${index + 1}`,
      items: ["Item 1", "Item 2", "Item 3", "Item 4"],
    }))
    cv.projects[0].description = [
      "Bullet 1.",
      "Bullet 2.",
      "Bullet 3.",
      "Bullet 4.",
    ]

    const result = validateCVTemplate(cv)

    expect(result.valid).toBe(false)
    expect(result.errors.join("\n")).toContain("Resumo deve ter pelo menos 40 palavras")
    expect(result.errors.join("\n")).toContain("6 categorias")
    expect(result.errors.join("\n")).toContain("24 itens")
    expect(result.warnings.join("\n")).toContain('Projeto "Dashboard de Indicadores" tem mais de 3 elementos em description[]')
  })

  it("returns warnings for soft limit breaches without blocking generation", () => {
    const cv = createValidCV()
    cv.summary =
      "Estudante de Engenharia Quimica com foco em analise de dados, Excel, SQL e Power BI para suporte operacional. Tenho pratica com organizacao de bases, acompanhamento de indicadores e documentacao tecnica. Em projetos academicos, automatizei rotinas em Python e revisei consistencia de informacoes. Busco atuar em estagio de BI para apoiar relatorios e manutencao de bases."
    cv.skills = [{ category: "Analise de Dados", items: ["Excel", "SQL", "Python", "Power BI"] }]
    cv.certifications = [
      { title: "Cert 1", institution: "Inst", year: "2021" },
      { title: "Cert 2", institution: "Inst", year: "2021" },
      { title: "Cert 3", institution: "Inst", year: "2021" },
      { title: "Cert 4", institution: "Inst", year: "2021" },
      { title: "Cert 5", institution: "Inst", year: "2021" },
      { title: "Cert 6", institution: "Inst", year: "2021" },
    ]
    cv.projects = [
      ...cv.projects,
      {
        title: "Projeto Extra 1",
        description: ["Mapeei dados para consolidacao.", "Documentei o processo para replicacao."],
      },
      {
        title: "Projeto Extra 2",
        description: ["Atualizei bases para acompanhamento.", "Revisei qualidade e integridade do fluxo."],
      },
      {
        title: "Projeto Extra 3",
        description: [
          "Este bullet foi escrito de forma propositalmente longa para ultrapassar o limite de trezentos caracteres e validar o warning esperado no preflight. O texto precisa ser extenso o suficiente para que a funcao de validacao identifique a violacao e emita o aviso correspondente ao usuario antes da geracao do PDF.",
          "Mantive a documentacao e a padronizacao das regras de atualizacao.",
        ],
      },
    ]

    const result = validateCVTemplate(cv)

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings.join("\n")).toContain("Resumo abaixo do ideal de 60 palavras")
    expect(result.warnings.join("\n")).toContain("menos de 2 categorias")
    expect(result.warnings.join("\n")).toContain("Certificações acima do recomendado de 5 itens")
    expect(result.warnings.join("\n")).toContain("Projetos acima do recomendado de 4 itens")
    expect(result.warnings.join("\n")).toContain("excede 300 caracteres")
  })
})
