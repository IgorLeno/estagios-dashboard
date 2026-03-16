import type { JobDetails } from "../../types"

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

export const FIXTURE_PEOPLE_ANALYTICS_AEGEA = makeJobDetails({
  empresa: "Aegea",
  cargo: "Estagiário de People Analytics",
  local: "Rio de Janeiro/RJ",
  modalidade: "Presencial",
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
})

export const FIXTURE_BI_OPERACIONAL = makeJobDetails({
  cargo: "Estagiário de BI",
  local: "São Paulo/SP",
  modalidade: "Híbrido",
  requisitos_obrigatorios: ["Power BI", "SQL", "dashboard", "relatório", "indicadores"],
  requisitos_desejaveis: ["Python", "ETL"],
  responsabilidades: [
    "manutenção de dashboards",
    "atualização de relatórios",
    "suporte a indicadores operacionais",
  ],
})

export const FIXTURE_DATA_SCIENCE_RESEARCH = makeJobDetails({
  cargo: "Estagiário de Data Science",
  local: "Remoto",
  modalidade: "Remoto",
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
})

export const FIXTURE_LABORATORIO_QC = makeJobDetails({
  cargo: "Estagiário de Laboratório Analítico",
  local: "Cubatão/SP",
  modalidade: "Presencial",
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
})

export const FIXTURE_QHSE = makeJobDetails({
  cargo: "Estagiário de QHSE",
  local: "Santos/SP",
  modalidade: "Presencial",
  requisitos_obrigatorios: [
    "qualidade",
    "QHSE",
    "ISO 14001",
    "auditoria",
    "não-conformidades",
  ],
  requisitos_desejaveis: ["Power BI", "Excel"],
  responsabilidades: [
    "acompanhamento de indicadores",
    "controle de conformidade",
    "apoio a auditorias internas",
  ],
})

export const FIXTURE_VAGA_AMBIGUA = makeJobDetails({
  cargo: "Estagiário Analista",
  local: "Campinas/SP",
  modalidade: "Híbrido",
  requisitos_obrigatorios: ["Python", "Excel", "Análise de dados"],
  responsabilidades: ["organização de bases", "geração de relatórios simples"],
})
