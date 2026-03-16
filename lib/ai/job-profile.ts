/**
 * JOB PROFILE — STRUCTURED JOB CONTEXT
 *
 * Replaces the flat JobContext string with a structured profile that carries:
 * - Role classification (family + mode + seniority)
 * - Domain proof policy
 * - Allowed / preferred / forbidden terminology
 * - Excel label policy
 * - Location statement requirement
 * - Summary topics for the summary section
 *
 * The profile is produced by buildJobProfile() and consumed by:
 * - Evidence Selector (Etapa 3)
 * - Summary / Skills / Projects prompts (Etapa 5)
 * - Normalizers (Etapa 7)
 *
 * Backward compatibility:
 * - legacyContext maps JobProfile back to the old JobContext string
 *   so existing callers of detectJobContext() keep working during the transition.
 */

import type { JobDetails } from "./types"

export type RoleFamily =
  | "people_analytics"
  | "bi_reporting"
  | "data_science_ml"
  | "laboratory_qc"
  | "qhse_quality"
  | "process_engineering"
  | "general"

export type RoleMode =
  | "operational_support"
  | "analytical_reporting"
  | "research_modeling"
  | "quality_control"

export type Seniority = "internship" | "junior" | "pleno"

export type DomainProofPolicy = "strict" | "moderate"

export type RolePackId =
  | "analytics_operational"
  | "data_science_ml"
  | "bi_reporting"
  | "laboratory_qc"
  | "qhse_quality"
  | "process_engineering"
  | "general"

export interface JobProfile {
  role_family: RoleFamily
  role_mode: RoleMode
  seniority: Seniority
  role_pack_id: RolePackId
  domain_proof_policy: DomainProofPolicy
  output_language: "pt-BR" | "en"

  /** Terms the job explicitly uses — prefer these exact labels when present. */
  exact_terms: string[]
  /** Terms to prefer when multiple framings are equally accurate. */
  preferred_terms: string[]
  /** Terms and phrases that must NOT appear in the output. */
  forbidden_terms: string[]

  excel_term_policy: "use_exact_label" | "descriptive" | "basic_only"
  /**
   * Exact Excel label derived from exact_terms when excel_term_policy === "use_exact_label".
   * Stored as a canonical display label (e.g. "Excel Avançado", "Excel Intermediário").
   */
  excel_exact_label?: string

  /**
   * Whether to append a relocation/availability sentence to the summary.
   * True when the job city differs from the candidate's mobility area.
   */
  require_location_statement: boolean

  /**
   * Atomic semantic tags that structure the summary section.
   * Values are snake_case domain tags — NOT prose sentences.
   * Verbalization is the responsibility of the summary prompt builder (Etapa 5).
   * Use string literals (not enums) to keep the taxonomy flexible during evolution.
   */
  summary_topics: {
    /** Domain + execution mode tag */
    domain: string
    /** Primary technical capability tag */
    capability: string
    /** Process discipline or soft differentiator tag */
    discipline: string
  }

  /**
   * Human-readable reasons for classification decisions.
   * Populated only when process.env.NODE_ENV !== "production".
   *
   * Must not be passed to prompt builders, persisted, or sent to the LLM.
   */
  explanations?: string[]

  /**
   * Maps JobProfile back to the legacy JobContext string.
   * Used during the transition period while prompt builders still accept JobContext.
   * Will be removed in Etapa 5 when prompts are rewritten to accept JobProfile directly.
   */
  legacyContext: "laboratory" | "data_science" | "qhse" | "engineering" | "general"
}

const SHORT_TOKEN_WHITELIST = new Set(["bi", "rh", "ml", "etl", "sql", "vba"])

const LAB_KEYWORDS = [
  "preparacao", "solucoes", "amostras", "laboratorio", "reagentes", "titulacao",
  "sintese", "vidrarias", "bpl", "pesagem", "ensaios", "experimental", "analitico",
  "preparation", "solutions", "samples", "laboratory", "reagents", "titration",
  "synthesis", "glassware", "glp", "weighing", "assays",
]

const PEOPLE_ANALYTICS_KEYWORDS = [
  "people analytics", "rh", "recursos humanos", "headcount", "workforce",
  "turnover", "absentee", "absenteismo", "hrbp", "people data", "hr data",
  "people operations", "gestao de pessoas",
]

const HR_EVIDENCE_KEYWORDS = [
  "people analytics", "recursos humanos", "headcount", "workforce",
  "turnover", "absenteismo", "hrbp", "people data", "hr data", "gestao de pessoas",
]

const BI_REPORTING_KEYWORDS = [
  "power bi", "tableau", "dashboard", "paineis", "relatorio", "reporting",
  "indicadores", "kpi", "visualizacao", "bi", "business intelligence",
  "data visualization", "looker",
]

const DATA_SCIENCE_ML_KEYWORDS = [
  "machine learning", "ml", "deep learning", "neural network", "scikit learn",
  "tensorflow", "keras", "modelo preditivo", "predictive model", "feature engineering",
  "algoritmo", "algorithm", "treinamento de modelo", "model training", "nlp",
  "computer vision", "pytorch",
]

const DATA_OPERATIONAL_KEYWORDS = [
  "python", "sql", "pandas", "numpy", "pipeline", "etl", "dados", "data",
  "databricks", "dbt", "big data", "data engineer", "analytics",
]

const QHSE_KEYWORDS = [
  "qualidade", "qhse", "hse", "iso", "nao conformidades", "auditoria",
  "seguranca", "meio ambiente", "saude ocupacional", "higiene", "compliance",
  "quality", "audit", "safety", "environment", "occupational health",
  "non conformance", "standards",
]

const ENGINEERING_KEYWORDS = [
  "processo", "simulacao", "modelagem", "aspen", "cad", "otimizacao",
  "eficiencia", "process", "simulation", "modeling", "optimization",
  "plant", "planta", "equipamento", "equipment",
]

const RESEARCH_SIGNALS = [
  "machine learning", "modelo preditivo", "predictive model", "feature engineering",
  "pesquisa", "research", "treinamento de modelo", "model training",
  "algoritmo", "algorithm", "deep learning", "nlp",
]

const OPERATIONAL_SIGNALS = [
  "atualizacao", "manutencao", "suporte", "support", "operacoes", "operations",
  "validacao", "validation", "padronizacao", "documentacao", "documentation",
  "atualizar", "organizar", "manter",
]

const QC_SIGNALS = [
  "auditoria", "audit", "nao conformidade", "non conformance", "conformidade",
  "compliance", "certificacao", "certification",
]

const KNOWN_EXACT_LABELS = [
  "Excel Avançado", "Advanced Excel", "Excel Intermediário",
  "Excel com VBA", "Excel with VBA",
  "Power BI", "Tableau", "Power Query",
  "SQL", "Python", "VBA", "Aspen Plus", "MATLAB",
  "ISO 17025", "ISO 9001", "ISO 14001", "OHSAS 18001",
  "People Analytics", "HR Analytics", "Business Intelligence",
]

const EXCEL_CANONICAL = [
  "Excel Avançado", "Advanced Excel", "Excel Intermediário",
  "Excel com VBA", "Excel with VBA",
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bpowerbi\b/g, "power bi")
    .replace(/\bpower-bi\b/g, "power bi")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function scoreWithBoundary(text: string, keywords: string[]): number {
  return keywords.filter((kw) => {
    const normalized = normalizeText(kw)
    if (SHORT_TOKEN_WHITELIST.has(normalized)) {
      const regex = new RegExp(`(?<![a-z0-9])${escapeRegExp(normalized)}(?![a-z0-9])`)
      return regex.test(text)
    }
    return text.includes(normalized)
  }).length
}

function extractExactTerms(originalText: string): string[] {
  const normalizedOriginal = normalizeText(originalText)
  const exactTerms = KNOWN_EXACT_LABELS.filter((label) =>
    normalizedOriginal.includes(normalizeText(label))
  )
  return [...new Set(exactTerms)]
}

function detectSeniority(jobDetails: JobDetails): Seniority {
  const cargo = normalizeText(jobDetails.cargo ?? "")
  const tipo = normalizeText(jobDetails.tipo_vaga ?? "")

  const isInternship =
    tipo.includes("estagio") ||
    tipo.includes("estagiario") ||
    tipo.includes("intern") ||
    cargo.includes("estagio") ||
    cargo.includes("estagiario") ||
    cargo.includes("intern")

  const isJunior =
    tipo.includes("junior") ||
    cargo.includes("junior") ||
    /(?<![a-z0-9])jr(?![a-z0-9])/.test(cargo) ||
    /(?<![a-z0-9])jr(?![a-z0-9])/.test(tipo)

  if (isInternship) return "internship"
  if (isJunior) return "junior"
  return "pleno"
}

function detectExcel(
  exactTerms: string[],
  roleFamily: RoleFamily
): {
  policy: JobProfile["excel_term_policy"]
  exactLabel: string | undefined
} {
  const found = exactTerms.find((term) =>
    EXCEL_CANONICAL.some((canonical) => normalizeText(term) === normalizeText(canonical))
  )

  if (found) return { policy: "use_exact_label", exactLabel: found }
  if (roleFamily === "laboratory_qc" || roleFamily === "qhse_quality") {
    return { policy: "basic_only", exactLabel: undefined }
  }
  return { policy: "descriptive", exactLabel: undefined }
}

function detectLocationStatement(jobDetails: JobDetails): boolean {
  /**
   * POLITICA DE LOCALIZACAO — DECISAO DE PRODUTO
   *
   * A frase de mobilidade e incluida quando a vaga esta em cidade
   * fora da mobilidade habitual do candidato (base: Bertioga/SP).
   *
   * Cidades consideradas dentro da mobilidade (sem frase necessaria):
   * - bertioga, santos, guaruja, cubatao, sao paulo
   *
   * NOTA: Sao Paulo capital esta nesta lista por decisao explicita —
   * o candidato considera Sao Paulo dentro da sua mobilidade habitual.
   * Para alterar, remover "sao paulo" de CANDIDATE_CITIES_NORMALIZED.
   *
   * Vagas remotas ou sem local definido: nunca incluir a frase.
   */
  const CANDIDATE_CITIES_NORMALIZED = [
    "bertioga",
    "santos",
    "guaruja",
    "cubatao",
    "sao paulo",
  ]

  const normalizedJobCity = normalizeText(jobDetails.local ?? "")
  const normalizedModalidade = normalizeText(jobDetails.modalidade ?? "")

  if (
    !normalizedJobCity ||
    normalizedJobCity === "indefinido" ||
    normalizedJobCity.startsWith("remoto") ||
    normalizedModalidade === "remoto"
  ) {
    return false
  }

  if (
    CANDIDATE_CITIES_NORMALIZED.some(
      (city) =>
        normalizedJobCity === city ||
        normalizedJobCity.startsWith(`${city} `) ||
        normalizedJobCity.startsWith(`${city}/`)
    )
  ) {
    return false
  }

  return true
}

function buildForbiddenTerms(family: RoleFamily, mode: RoleMode): string[] {
  if (family === "people_analytics" || (family === "bi_reporting" && mode === "operational_support")) {
    return [
      "laboratório", "amostras", "reagentes", "síntese química",
      "aspen plus", "aspen", "titulação",
      "deep learning como destaque", "redes neurais como destaque",
      "expertise",
    ]
  }
  if (family === "laboratory_qc") {
    return [
      "machine learning", "pipeline de dados", "deep learning",
      "feature engineering", "modelo preditivo",
    ]
  }
  if (family === "qhse_quality") {
    return ["machine learning", "deep learning", "feature engineering"]
  }
  return []
}

function buildPreferredTerms(family: RoleFamily, mode: RoleMode): string[] {
  if (family === "people_analytics" || (family === "bi_reporting" && mode === "operational_support")) {
    return [
      "organização de bases de dados",
      "validação de dados",
      "padronização de informações",
      "documentação técnica",
      "acompanhamento de KPIs",
      "elaboração de relatórios",
      "consistência de dados",
    ]
  }
  if (family === "data_science_ml") {
    return [
      "pipeline de dados", "modelo preditivo", "aprendizado de máquina",
      "feature engineering", "análise exploratória",
    ]
  }
  if (family === "laboratory_qc") {
    return [
      "preparação de soluções", "controle de amostras", "boas práticas de laboratório",
      "validação analítica", "rastreabilidade",
    ]
  }
  return []
}

function buildSummaryTopics(
  family: RoleFamily,
  mode: RoleMode
): JobProfile["summary_topics"] {
  if (family === "people_analytics" && mode === "operational_support") {
    return {
      domain: "people_analytics_operational",
      capability: "data_validation_excel_sql_powerbi",
      discipline: "documentation_standardization",
    }
  }
  if (family === "bi_reporting" && mode === "analytical_reporting") {
    return {
      domain: "bi_reporting_analytical",
      capability: "dashboard_reporting_powerbi_sql",
      discipline: "insight_communication",
    }
  }
  if (family === "bi_reporting" && mode === "operational_support") {
    return {
      domain: "bi_reporting_operational",
      capability: "base_maintenance_excel_powerbi",
      discipline: "data_consistency_standardization",
    }
  }
  if (family === "data_science_ml") {
    return {
      domain: "data_science_ml_research",
      capability: "predictive_modeling_python_sklearn",
      discipline: "statistical_rigor_experimentation",
    }
  }
  if (family === "laboratory_qc") {
    return {
      domain: "laboratory_qc_quality_control",
      capability: "sample_control_analytical_techniques",
      discipline: "lab_best_practices_traceability",
    }
  }
  if (family === "qhse_quality") {
    return {
      domain: "qhse_quality_control",
      capability: "kpi_tracking_nonconformance_powerbi",
      discipline: "iso_standards_continuous_improvement",
    }
  }
  if (family === "process_engineering") {
    return {
      domain: "process_engineering_modeling",
      capability: "process_simulation_aspen_python",
      discipline: "mass_energy_balance_technical_rigor",
    }
  }
  return {
    domain: "general_analytical",
    capability: "data_analysis_python_visualization",
    discipline: "fast_learning_process_orientation",
  }
}

function resolveLegacyContext(
  family: RoleFamily
): JobProfile["legacyContext"] {
  if (family === "laboratory_qc") return "laboratory"
  if (family === "data_science_ml" || family === "people_analytics" || family === "bi_reporting") return "data_science"
  if (family === "qhse_quality") return "qhse"
  if (family === "process_engineering") return "engineering"
  return "general"
}

export function buildJobProfile(jobDetails: JobDetails): JobProfile {
  const rawText = [
    jobDetails.cargo ?? "",
    ...(jobDetails.requisitos_obrigatorios ?? []),
    ...(jobDetails.requisitos_desejaveis ?? []),
    ...(jobDetails.responsabilidades ?? []),
  ].join(" ")

  const allText = normalizeText(rawText)
  const explanations: string[] = []

  const labScore = scoreWithBoundary(allText, LAB_KEYWORDS) * 1.2
  const peopleAnalyticsScore = scoreWithBoundary(allText, PEOPLE_ANALYTICS_KEYWORDS) * 1.3
  const biReportingScore = scoreWithBoundary(allText, BI_REPORTING_KEYWORDS) * 1.0
  const dsMLScore = scoreWithBoundary(allText, DATA_SCIENCE_ML_KEYWORDS) * 1.1
  const dsOperationalScore = scoreWithBoundary(allText, DATA_OPERATIONAL_KEYWORDS) * 0.8
  const qhseScore = scoreWithBoundary(allText, QHSE_KEYWORDS) * 1.1
  const engineeringScore = scoreWithBoundary(allText, ENGINEERING_KEYWORDS) * 1.0

  const hasHREvidence =
    scoreWithBoundary(allText, HR_EVIDENCE_KEYWORDS) > 0 ||
    /(?<![a-z0-9])rh(?![a-z0-9])/.test(allText)

  const hasResearchSignals = scoreWithBoundary(allText, RESEARCH_SIGNALS) >= 2

  const effectivePeopleAnalyticsScore = hasHREvidence ? peopleAnalyticsScore : 0
  const effectiveDSMLScore = hasResearchSignals ? dsMLScore : dsMLScore * 0.4
  const effectiveBIScore = !hasResearchSignals
    ? biReportingScore + dsOperationalScore * 0.5
    : biReportingScore

  explanations.push(
    `scored people_analytics=${effectivePeopleAnalyticsScore.toFixed(1)} (hasHREvidence=${hasHREvidence})`
  )
  explanations.push(
    `scored bi_reporting=${effectiveBIScore.toFixed(1)}, data_science_ml=${effectiveDSMLScore.toFixed(1)} (hasResearchSignals=${hasResearchSignals})`
  )
  explanations.push(
    `scored laboratory_qc=${labScore.toFixed(1)}, qhse=${qhseScore.toFixed(1)}, engineering=${engineeringScore.toFixed(1)}`
  )

  let role_family: RoleFamily = "general"
  let highScore = 0

  const candidates: [RoleFamily, number][] = [
    ["people_analytics", effectivePeopleAnalyticsScore],
    ["laboratory_qc", labScore],
    ["qhse_quality", qhseScore],
    ["bi_reporting", effectiveBIScore],
    ["data_science_ml", effectiveDSMLScore],
    ["process_engineering", engineeringScore],
  ]

  for (const [family, score] of candidates) {
    if (score > highScore) {
      highScore = score
      role_family = family
    }
  }

  let role_mode: RoleMode
  if (role_family === "laboratory_qc" || role_family === "qhse_quality") {
    role_mode = scoreWithBoundary(allText, QC_SIGNALS) > 0 ? "quality_control" : "operational_support"
  } else if (hasResearchSignals) {
    role_mode = "research_modeling"
  } else if (scoreWithBoundary(allText, OPERATIONAL_SIGNALS) >= 2) {
    role_mode = "operational_support"
  } else if (role_family === "bi_reporting") {
    role_mode = "analytical_reporting"
  } else {
    role_mode = "operational_support"
  }

  let role_pack_id: RolePackId
  if (role_family === "people_analytics") {
    role_pack_id = "analytics_operational"
  } else if (role_family === "data_science_ml") {
    role_pack_id = "data_science_ml"
  } else if (role_family === "bi_reporting") {
    role_pack_id = "bi_reporting"
  } else if (role_family === "laboratory_qc") {
    role_pack_id = "laboratory_qc"
  } else if (role_family === "qhse_quality") {
    role_pack_id = "qhse_quality"
  } else if (role_family === "process_engineering") {
    role_pack_id = "process_engineering"
  } else {
    role_pack_id = "general"
  }

  const domain_proof_policy: DomainProofPolicy =
    role_family === "people_analytics" ||
    role_family === "laboratory_qc" ||
    role_family === "qhse_quality"
      ? "strict"
      : "moderate"

  const seniority = detectSeniority(jobDetails)
  const exact_terms = extractExactTerms(rawText)
  const preferred_terms = buildPreferredTerms(role_family, role_mode)
  const forbidden_terms = buildForbiddenTerms(role_family, role_mode)
  const { policy: excel_term_policy, exactLabel: excel_exact_label } = detectExcel(exact_terms, role_family)
  const require_location_statement = detectLocationStatement(jobDetails)
  const summary_topics = buildSummaryTopics(role_family, role_mode)
  const legacyContext = resolveLegacyContext(role_family)

  explanations.push(`resolved role_family=${role_family} (highScore=${highScore.toFixed(1)})`)
  explanations.push(`resolved role_mode=${role_mode}`)
  explanations.push(`resolved seniority=${seniority}`)
  explanations.push(`require_location_statement=${require_location_statement}`)

  const profile: JobProfile = {
    role_family,
    role_mode,
    seniority,
    role_pack_id,
    domain_proof_policy,
    output_language: jobDetails.idioma_vaga === "en" ? "en" : "pt-BR",
    exact_terms,
    preferred_terms,
    forbidden_terms,
    excel_term_policy,
    excel_exact_label,
    require_location_statement,
    summary_topics,
    legacyContext,
    ...(process.env.NODE_ENV !== "production" ? { explanations } : {}),
  }

  console.log(
    `[JobProfile] family=${role_family} mode=${role_mode} seniority=${seniority} pack=${role_pack_id} policy=${domain_proof_policy}`
  )

  return profile
}
