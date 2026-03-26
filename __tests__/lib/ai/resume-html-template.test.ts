import { describe, expect, it } from "vitest"
import { generateResumeHTML } from "@/lib/ai/resume-html-template"
import type { CVTemplate } from "@/lib/ai/types"

function createCV(): CVTemplate {
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
    ],
  }
}

describe("generateResumeHTML", () => {
  it("preserves modelo1 shared helper output", () => {
    const html = generateResumeHTML(createCV(), "modelo1")

    expect(html).toContain('<div class="contact"><p>')
    // modelo1 now uses <span class="contact-item"> with CSS ::after separator
    expect(html).toContain('<span class="contact-item">')
    expect(html).toContain('contact-item:not(:last-child)::after')
    expect(html).toContain('<p class="cert-list"><strong>Google Data Analytics</strong> — Coursera, 2024 |')
    // Projects now render as prose <p> with <strong>Title</strong> (no colon)
    expect(html).toContain("<strong>Dashboard de Indicadores</strong>")
    expect(html).toContain('class="project-item"')
    expect(html).not.toContain('class="project-bullets"')
    expect(html).not.toContain('<ul class="cert-list">')
  })

  it("renders modelo2 contact items, nested project bullets and certification list", () => {
    const html = generateResumeHTML(createCV(), "modelo2")

    expect(html).toContain('<span class="contact-item"><a href="https://linkedin.com/in/igorfernandes"')
    expect(html).toContain('class="project-item"')
    expect(html).toContain('class="project-title">Dashboard de Indicadores</strong>')
    expect(html).toContain('class="project-bullets"')
    expect(html).toContain('<ul class="cert-list">')
    expect(html).toContain("<li><strong>Google Data Analytics</strong> — Coursera, 2024</li>")
    expect(html).toContain(".contact-item:not(:last-child)::after")
    expect(html).toContain(".project-item::before")
  })

  it("deduplicates skill items within a category", () => {
    const cv = createCV()
    cv.summary = "Resumo sem skills mencionadas para isolar teste."
    cv.skills = [
      {
        category: "Ferramentas",
        items: ["Ferramenta A (detalhes)", "Ferramenta B", "Ferramenta A", "Ferramenta B (extras)"],
      },
    ]
    const html = generateResumeHTML(cv, "modelo1")
    // "Ferramenta A" and "Ferramenta A (detalhes)" share the base — first wins
    const aMatches = html.match(/Ferramenta A/g) || []
    expect(aMatches.length).toBe(1)
    // "Ferramenta B" and "Ferramenta B (extras)" share the base — first wins
    const bMatches = html.match(/Ferramenta B/g) || []
    expect(bMatches.length).toBe(1)
  })

  it("renders single language as p instead of ul", () => {
    const cv = createCV()
    const html = generateResumeHTML(cv, "modelo1")
    expect(html).toContain("<p>Portugues: Nativo.</p>")
    expect(html).not.toContain("<li>Portugues:")
  })

  it("keeps html rendering pure and leaves preflight to callers", () => {
    const cv = createCV()
    cv.summary = "Resumo curto demais."

    expect(() => generateResumeHTML(cv, "modelo2")).not.toThrow()
  })
})
