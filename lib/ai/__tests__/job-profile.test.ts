import { buildJobProfile } from "../job-profile"
import type { JobDetails } from "../types"

function makeJobDetails(overrides: Partial<JobDetails>): JobDetails {
  return {
    empresa: "Empresa Confidencial",
    cargo: "Indefinido",
    local: "Indefinido",
    modalidade: "Presencial",
    tipo_vaga: "Estágio",
    requisitos_obrigatorios: [],
    requisitos_desejaveis: [],
    responsabilidades: [],
    beneficios: [],
    salario: "Indefinido",
    idioma_vaga: "pt",
    etapa: "Indefinido",
    status: "Pendente",
    ...overrides,
  }
}

describe("buildJobProfile()", () => {
  it("classifica People Analytics operacional com Excel exato e relocation para outra cidade", () => {
    const vagaPeopleAnalytics = makeJobDetails({
      cargo: "Estagiário de People Analytics",
      tipo_vaga: "Estágio",
      local: "Rio de Janeiro/RJ",
      modalidade: "Presencial",
      idioma_vaga: "pt",
      requisitos_obrigatorios: [
        "Excel Avançado",
        "Power BI",
        "gestão de pessoas",
        "people analytics",
        "turnover",
        "headcount",
      ],
      requisitos_desejaveis: ["SQL", "Power Query"],
      responsabilidades: [
        "atualização de bases de dados",
        "validação de indicadores de RH",
        "documentação de processos",
      ],
      beneficios: [],
    })

    const profile = buildJobProfile(vagaPeopleAnalytics)

    expect(profile.role_family).toBe("people_analytics")
    expect(profile.role_mode).toBe("operational_support")
    expect(profile.domain_proof_policy).toBe("strict")
    expect(profile.seniority).toBe("internship")
    expect(profile.require_location_statement).toBe(true)
    expect(profile.excel_term_policy).toBe("use_exact_label")
    expect(profile.excel_exact_label).toBe("excel avançado")
    expect(profile.summary_anchors).toEqual({
      primary: "estudante com interesse em People Analytics e operações de RH",
      secondary: "organização e validação de bases de dados com Excel, SQL e Power BI",
      tertiary: "pensamento analítico e atenção a detalhes na documentação de processos",
    })
    expect("objective_anchors" in profile).toBe(false)
  })

  it("mantém BI operacional como vaga local sem statement de realocação para São Paulo", () => {
    const vagaBIOperacional = makeJobDetails({
      cargo: "Estagiário de BI",
      tipo_vaga: "Estágio",
      local: "São Paulo/SP",
      modalidade: "Híbrido",
      idioma_vaga: "pt",
      requisitos_obrigatorios: ["Power BI", "SQL", "dashboard", "relatório", "indicadores"],
      requisitos_desejaveis: ["Python"],
      responsabilidades: [
        "manutenção de dashboards",
        "atualização de relatórios",
        "suporte a indicadores operacionais",
      ],
      beneficios: [],
    })

    const profile = buildJobProfile(vagaBIOperacional)

    expect(profile.role_family).toBe("bi_reporting")
    expect(profile.role_mode).toBe("operational_support")
    expect(profile.require_location_statement).toBe(false)
  })

  it("classifica vagas de ML como research_modeling e ignora statement em vagas remotas", () => {
    const vagaMLResearch = makeJobDetails({
      cargo: "Estagiário de Data Science",
      tipo_vaga: "Estágio",
      local: "Remoto",
      modalidade: "Remoto",
      idioma_vaga: "pt",
      requisitos_obrigatorios: [
        "Python",
        "machine learning",
        "scikit-learn",
        "modelo preditivo",
        "feature engineering",
      ],
      requisitos_desejaveis: ["deep learning", "pytorch", "pesquisa aplicada"],
      responsabilidades: [
        "treinamento de modelos",
        "análise exploratória",
        "validação de hipóteses",
      ],
      beneficios: [],
    })

    const profile = buildJobProfile(vagaMLResearch)

    expect(profile.role_family).toBe("data_science_ml")
    expect(profile.role_mode).toBe("research_modeling")
    expect(profile.domain_proof_policy).toBe("moderate")
    expect(profile.require_location_statement).toBe(false)
  })

  it("classifica laboratório analítico como quality_control e reconhece Cubatão como cidade do candidato", () => {
    const vagaLab = makeJobDetails({
      cargo: "Estagiário de Laboratório Analítico",
      tipo_vaga: "Estágio",
      local: "Cubatão/SP",
      modalidade: "Presencial",
      idioma_vaga: "pt",
      requisitos_obrigatorios: [
        "preparação de soluções",
        "amostras",
        "titulação",
        "laboratório",
        "BPL",
      ],
      requisitos_desejaveis: ["ISO 17025", "auditoria", "não-conformidades"],
      responsabilidades: [
        "controle de amostras",
        "ensaios analíticos",
        "organização laboratorial",
      ],
      beneficios: [],
    })

    const profile = buildJobProfile(vagaLab)

    expect(profile.role_family).toBe("laboratory_qc")
    expect(profile.role_mode).toBe("quality_control")
    expect(profile.domain_proof_policy).toBe("strict")
    expect(profile.require_location_statement).toBe(false)
  })
})
