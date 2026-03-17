import { afterEach, describe, expect, it } from "vitest"

import { buildJobProfile } from "../job-profile"
import type { JobDetails } from "../types"
import {
  FIXTURE_BI_OPERACIONAL,
  FIXTURE_DATA_SCIENCE_RESEARCH,
  FIXTURE_LABORATORIO_QC,
  FIXTURE_PEOPLE_ANALYTICS_AEGEA,
  FIXTURE_QHSE,
  FIXTURE_VAGA_AMBIGUA,
} from "./fixtures/job-profile-fixtures"

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

afterEach(() => {
  process.env.NODE_ENV = "test"
})

describe("buildJobProfile()", () => {
  it("classifica People Analytics operacional com Excel exato e relocation para outra cidade", () => {
    const profile = buildJobProfile(FIXTURE_PEOPLE_ANALYTICS_AEGEA)

    expect(profile.role_family).toBe("people_analytics")
    expect(profile.role_mode).toBe("operational_support")
    expect(profile.domain_proof_policy).toBe("strict")
    expect(profile.seniority).toBe("internship")
    expect(profile.require_location_statement).toBe(true)
    expect(profile.excel_term_policy).toBe("use_exact_label")
    expect(profile.excel_exact_label).toBe("Excel Avançado")
    expect(profile.summary_topics).toEqual({
      domain: "people_analytics_operational",
      capability: "data_validation_excel_sql_powerbi",
      discipline: "documentation_standardization",
    })
    expect(profile.exact_terms).toContain("Excel Avançado")
    expect("summary_anchors" in profile).toBe(false)
    expect("objective_anchors" in profile).toBe(false)
  })

  it("mantém BI operacional como vaga local sem statement de realocação para São Paulo", () => {
    const profile = buildJobProfile(FIXTURE_BI_OPERACIONAL)

    expect(profile.role_family).toBe("bi_reporting")
    expect(profile.role_mode).toBe("operational_support")
    expect(profile.require_location_statement).toBe(false)
  })

  it("classifica vagas de ML como research_modeling e ignora statement em vagas remotas", () => {
    const profile = buildJobProfile(FIXTURE_DATA_SCIENCE_RESEARCH)

    expect(profile.role_family).toBe("data_science_ml")
    expect(profile.role_mode).toBe("research_modeling")
    expect(profile.domain_proof_policy).toBe("moderate")
    expect(profile.require_location_statement).toBe(false)
  })

  it("classifica laboratório analítico como quality_control e reconhece Cubatão como cidade do candidato", () => {
    const profile = buildJobProfile(FIXTURE_LABORATORIO_QC)

    expect(profile.role_family).toBe("laboratory_qc")
    expect(profile.role_mode).toBe("quality_control")
    expect(profile.domain_proof_policy).toBe("strict")
    expect(profile.require_location_statement).toBe(false)
  })
})

describe("scoreWithBoundary() — prevenção de false positives", () => {
  it("não classifica vaga com 'habilidade' como laboratório", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário Administrativo",
        requisitos_obrigatorios: ["habilidade analítica", "organização"],
      })
    )

    expect(profile.role_family).not.toBe("laboratory_qc")
  })

  it("não classifica vaga com 'html' como data_science_ml por causa de 'ml'", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário Frontend",
        requisitos_obrigatorios: ["HTML", "CSS", "JavaScript"],
        responsabilidades: ["manutenção de páginas internas"],
      })
    )

    expect(profile.role_family).not.toBe("data_science_ml")
  })

  it("não classifica vaga com 'abrir chamado de suporte' como bi_reporting por causa de 'bi'", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de Suporte",
        requisitos_obrigatorios: ["abrir chamado de suporte", "atendimento interno"],
        responsabilidades: ["manter inventário de equipamentos"],
      })
    )

    expect(profile.role_family).not.toBe("bi_reporting")
  })

  it("não classifica como people_analytics vaga sem evidência de RH, mesmo com Power BI", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de BI",
        requisitos_obrigatorios: ["Power BI", "dashboard", "SQL"],
        responsabilidades: ["atualização de dashboards", "documentação técnica"],
      })
    )

    expect(profile.role_family).toBe("bi_reporting")
  })
})

describe("tie-break people_analytics vs bi_reporting", () => {
  it("atribui bi_reporting quando há Power BI + dashboard mas não há evidência de RH", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de BI",
        requisitos_obrigatorios: ["Power BI", "dashboard", "SQL", "indicadores"],
        responsabilidades: ["manutenção de relatórios", "suporte a indicadores operacionais"],
      })
    )

    expect(profile.role_family).toBe("bi_reporting")
  })

  it("atribui people_analytics quando há Power BI + turnover + headcount + gestão de pessoas", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de Analytics",
        requisitos_obrigatorios: ["Power BI", "turnover", "headcount", "gestão de pessoas"],
        responsabilidades: ["documentação de indicadores de RH", "validação de bases"],
      })
    )

    expect(profile.role_family).toBe("people_analytics")
  })

  it("atribui bi_reporting quando há Power BI + SQL + ETL sem nenhum sinal de RH", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de Dados Operacionais",
        requisitos_obrigatorios: ["Power BI", "SQL", "ETL", "dashboard"],
        responsabilidades: ["atualização de painéis", "manutenção de bases"],
      })
    )

    expect(profile.role_family).toBe("bi_reporting")
  })
})

describe("data_science_ml vs bi_reporting operacional", () => {
  it("atribui bi_reporting para vaga com Python + SQL + ETL + manutenção, sem sinais de ML", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de Dados",
        requisitos_obrigatorios: ["Python", "SQL", "ETL", "Power BI"],
        responsabilidades: ["manutenção de pipelines", "atualização de dashboards"],
      })
    )

    expect(profile.role_family).toBe("bi_reporting")
    expect(profile.role_mode).toBe("operational_support")
  })

  it("atribui data_science_ml para vaga com Python + machine learning + modelo preditivo", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de Data Science",
        requisitos_obrigatorios: ["Python", "machine learning", "modelo preditivo"],
        requisitos_desejaveis: ["feature engineering", "scikit-learn"],
        responsabilidades: ["treinamento de modelos", "pesquisa aplicada"],
      })
    )

    expect(profile.role_family).toBe("data_science_ml")
    expect(profile.role_mode).toBe("research_modeling")
  })
})

describe("excel policy e exact_terms", () => {
  it("retorna use_exact_label e exactLabel='Excel Intermediário' para vaga com 'Excel Intermediário'", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de BI",
        requisitos_obrigatorios: ["Excel Intermediário", "Power BI", "SQL"],
      })
    )

    expect(profile.excel_term_policy).toBe("use_exact_label")
    expect(profile.excel_exact_label).toBe("Excel Intermediário")
  })

  it("excel_exact_label deve estar presente em exact_terms com label canônico (com acento)", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de BI",
        requisitos_obrigatorios: ["Excel Avançado", "dashboard"],
      })
    )

    expect(profile.exact_terms).toContain("Excel Avançado")
    expect(profile.excel_exact_label).toBe("Excel Avançado")
  })

  it("retorna basic_only para vaga laboratorial sem label de Excel explícito", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de Laboratório",
        requisitos_obrigatorios: ["amostras", "BPL", "laboratório"],
      })
    )

    expect(profile.role_family).toBe("laboratory_qc")
    expect(profile.excel_term_policy).toBe("basic_only")
    expect(profile.excel_exact_label).toBeUndefined()
  })

  it("retorna descriptive para vaga de BI sem label de Excel explícito", () => {
    const profile = buildJobProfile(
      makeJobDetails({
        cargo: "Estagiário de BI",
        requisitos_obrigatorios: ["Power BI", "dashboard", "SQL"],
      })
    )

    expect(profile.role_family).toBe("bi_reporting")
    expect(profile.excel_term_policy).toBe("descriptive")
    expect(profile.excel_exact_label).toBeUndefined()
  })
})

describe("detectSeniority()", () => {
  it("detecta 'Júnior' no cargo", () => {
    const profile = buildJobProfile(makeJobDetails({ cargo: "Analista Júnior de Dados", tipo_vaga: "Pleno" }))
    expect(profile.seniority).toBe("junior")
  })

  it("detecta 'JR' no cargo (boundary — não pega 'vjr' ou 'jr3')", () => {
    const juniorProfile = buildJobProfile(makeJobDetails({ cargo: "Analista JR de Dados", tipo_vaga: "Pleno" }))
    const falsePositiveProfile = buildJobProfile(makeJobDetails({ cargo: "Analista vjr3 de Dados", tipo_vaga: "Pleno" }))

    expect(juniorProfile.seniority).toBe("junior")
    expect(falsePositiveProfile.seniority).toBe("pleno")
  })

  it("detecta 'junior' sem acento no tipo_vaga", () => {
    const profile = buildJobProfile(makeJobDetails({ cargo: "Analista de Dados", tipo_vaga: "Junior" as JobDetails["tipo_vaga"] }))
    expect(profile.seniority).toBe("junior")
  })

  it("detecta 'Estagiário' no tipo_vaga", () => {
    const profile = buildJobProfile(makeJobDetails({ cargo: "Analista de Dados", tipo_vaga: "Estagiário" as JobDetails["tipo_vaga"] }))
    expect(profile.seniority).toBe("internship")
  })

  it("detecta 'Estágio' no tipo_vaga", () => {
    const profile = buildJobProfile(makeJobDetails({ cargo: "Analista de Dados", tipo_vaga: "Estágio" }))
    expect(profile.seniority).toBe("internship")
  })

  it("detecta 'intern' no cargo em inglês", () => {
    const profile = buildJobProfile(makeJobDetails({ cargo: "Data Intern", tipo_vaga: "Pleno" }))
    expect(profile.seniority).toBe("internship")
  })

  it("retorna 'pleno' para cargo sem indicadores de seniority", () => {
    const profile = buildJobProfile(makeJobDetails({ cargo: "Analista de Dados", tipo_vaga: "Pleno" }))
    expect(profile.seniority).toBe("pleno")
  })
})

describe("detectLocationStatement() — política de mobilidade declarada", () => {
  it("retorna false para 'São Paulo/SP'  — São Paulo está dentro da mobilidade do candidato", () => {
    expect(buildJobProfile(makeJobDetails({ local: "São Paulo/SP" })).require_location_statement).toBe(false)
  })

  it("retorna false para 'São Paulo - Capital'", () => {
    expect(buildJobProfile(makeJobDetails({ local: "São Paulo - Capital" })).require_location_statement).toBe(false)
  })

  it("retorna false para 'Cubatão/SP'", () => {
    expect(buildJobProfile(makeJobDetails({ local: "Cubatão/SP" })).require_location_statement).toBe(false)
  })

  it("retorna false para 'Bertioga/SP'", () => {
    expect(buildJobProfile(makeJobDetails({ local: "Bertioga/SP" })).require_location_statement).toBe(false)
  })

  it("retorna false para 'Santos/SP'", () => {
    expect(buildJobProfile(makeJobDetails({ local: "Santos/SP" })).require_location_statement).toBe(false)
  })

  it("retorna false para 'Remoto'", () => {
    expect(buildJobProfile(makeJobDetails({ local: "Remoto" })).require_location_statement).toBe(false)
  })

  it("retorna false para 'remoto' lowercase", () => {
    expect(buildJobProfile(makeJobDetails({ local: "remoto" })).require_location_statement).toBe(false)
  })

  it("retorna false para local vazio ou 'Indefinido'", () => {
    expect(buildJobProfile(makeJobDetails({ local: "" })).require_location_statement).toBe(false)
    expect(buildJobProfile(makeJobDetails({ local: "Indefinido" })).require_location_statement).toBe(false)
  })

  it("retorna true para 'Rio de Janeiro/RJ'", () => {
    expect(buildJobProfile(makeJobDetails({ local: "Rio de Janeiro/RJ" })).require_location_statement).toBe(true)
  })

  it("retorna true para 'Campinas/SP'  — Campinas não está na lista de mobilidade", () => {
    expect(buildJobProfile(makeJobDetails({ local: "Campinas/SP" })).require_location_statement).toBe(true)
  })

  it("retorna true para 'Belo Horizonte/MG'", () => {
    expect(buildJobProfile(makeJobDetails({ local: "Belo Horizonte/MG" })).require_location_statement).toBe(true)
  })
})

describe("explanations[] — restrito a não-produção", () => {
  it("popula explanations quando NODE_ENV !== 'production'", () => {
    process.env.NODE_ENV = "test"

    const profile = buildJobProfile(makeJobDetails({ cargo: "Estagiário de BI", requisitos_obrigatorios: ["Power BI", "dashboard"] }))

    expect(profile.explanations).toBeDefined()
    expect(profile.explanations?.length).toBeGreaterThan(0)
  })

  it("não popula explanations quando NODE_ENV === 'production'", () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = "production"

    const profile = buildJobProfile(makeJobDetails({ cargo: "Estagiário de BI" }))

    expect(profile.explanations).toBeUndefined()
    process.env.NODE_ENV = original
  })
})

describe("fixtures reais — smoke tests", () => {
  it("FIXTURE_PEOPLE_ANALYTICS_AEGEA → people_analytics + operational_support + strict", () => {
    const profile = buildJobProfile(FIXTURE_PEOPLE_ANALYTICS_AEGEA)

    expect(profile.role_family).toBe("people_analytics")
    expect(profile.role_mode).toBe("operational_support")
    expect(profile.domain_proof_policy).toBe("strict")
  })

  it("FIXTURE_BI_OPERACIONAL → bi_reporting + operational_support", () => {
    const profile = buildJobProfile(FIXTURE_BI_OPERACIONAL)

    expect(profile.role_family).toBe("bi_reporting")
    expect(profile.role_mode).toBe("operational_support")
  })

  it("FIXTURE_DATA_SCIENCE_RESEARCH → data_science_ml + research_modeling + moderate", () => {
    const profile = buildJobProfile(FIXTURE_DATA_SCIENCE_RESEARCH)

    expect(profile.role_family).toBe("data_science_ml")
    expect(profile.role_mode).toBe("research_modeling")
    expect(profile.domain_proof_policy).toBe("moderate")
  })

  it("FIXTURE_LABORATORIO_QC → laboratory_qc + quality_control + strict", () => {
    const profile = buildJobProfile(FIXTURE_LABORATORIO_QC)

    expect(profile.role_family).toBe("laboratory_qc")
    expect(profile.role_mode).toBe("quality_control")
    expect(profile.domain_proof_policy).toBe("strict")
  })

  it("FIXTURE_QHSE → qhse_quality + quality_control + strict", () => {
    const profile = buildJobProfile(FIXTURE_QHSE)

    expect(profile.role_family).toBe("qhse_quality")
    expect(profile.role_mode).toBe("quality_control")
    expect(profile.domain_proof_policy).toBe("strict")
  })

  it("FIXTURE_VAGA_AMBIGUA → bi_reporting ou general, nunca data_science_ml", () => {
    const profile = buildJobProfile(FIXTURE_VAGA_AMBIGUA)

    expect(["bi_reporting", "general"]).toContain(profile.role_family)
    expect(profile.role_family).not.toBe("data_science_ml")
  })
})
