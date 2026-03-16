/**
 * JOB PROFILE — STRUCTURED JOB CONTEXT
 *
 * Replaces the flat JobContext string with a structured profile that carries:
 * - Role classification (family + mode + seniority)
 * - Domain proof policy
 * - Allowed / preferred / forbidden terminology
 * - Excel label policy
 * - Location statement requirement
 * - Objective anchors for the summary section
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

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * High-level domain of the job.
 * Used to select the correct role pack and evidence filter.
 */
export type RoleFamily =
  | "people_analytics"       // People Analytics, HR Analytics, workforce data
  | "bi_reporting"           // BI, dashboards, data visualization, operational reporting
  | "data_science_ml"        // ML, predictive modeling, research, feature engineering
  | "laboratory_qc"          // Analytical lab, QC lab, GLP/ISO 17025
  | "qhse_quality"           // Quality, HSE, environment, audits, non-conformances
  | "process_engineering"    // Process simulation, Aspen, mass/energy balances
  | "general"                // No dominant domain detected

/**
 * Execution mode within the role family.
 * Drives prompt framing and evidence selection.
 *
 * operational_support    → maintain/update/document existing systems
 * analytical_reporting   → build and deliver analysis/reports
 * research_modeling      → develop models, run experiments, advance methods
 * quality_control        → validate, audit, certify, enforce standards
 */
export type RoleMode =
  | "operational_support"
  | "analytical_reporting"
  | "research_modeling"
  | "quality_control"

export type Seniority = "internship" | "junior" | "pleno"

/**
 * How strictly to enforce domain proof.
 *
 * strict   → Never imply any domain experience not explicitly in allowed evidence.
 *            Applies to people_analytics, laboratory_qc, qhse_quality.
 * moderate → May frame adjacent skills toward the domain if evidence partially supports it.
 *            Applies to bi_reporting, process_engineering.
 */
export type DomainProofPolicy = "strict" | "moderate"

// ─── Role pack IDs ────────────────────────────────────────────────────────────

export type RolePackId =
  | "analytics_operational"  // people_analytics + operational_support
  | "data_science_ml"        // data_science_ml + research_modeling
  | "bi_reporting"           // bi_reporting + analytical_reporting
  | "laboratory_qc"          // laboratory_qc + quality_control
  | "qhse_quality"           // qhse_quality + quality_control
  | "process_engineering"    // process_engineering + research_modeling
  | "general"                // fallback

// ─── Job Profile ─────────────────────────────────────────────────────────────────

/**
 * Structured representation of a job's context.
 * This is the central contract passed through the resume generation pipeline.
 *
 * Produced by: buildJobProfile()
 * Consumed by: Evidence Selector, prompt builders, normalizers
 */
export interface JobProfile {
  // ─ Classification ────────────────────────────────────────────────────────────
  role_family: RoleFamily
  role_mode: RoleMode
  seniority: Seniority
  role_pack_id: RolePackId

  // ─ Policy ────────────────────────────────────────────────────────────────
  domain_proof_policy: DomainProofPolicy

  // ─ Output language ──────────────────────────────────────────────────────────
  output_language: "pt-BR" | "en"

  // ─ Terminology ─────────────────────────────────────────────────────────────
  /** Terms the job explicitly uses — prefer these exact labels when present. */
  exact_terms: string[]
  /** Terms to prefer when multiple framings are equally accurate. */
  preferred_terms: string[]
  /** Terms and phrases that must NOT appear in the output. */
  forbidden_terms: string[]

  // ─ Excel policy ─────────────────────────────────────────────────────────────
  /**
   * How to label Excel in the output.
   *
   * "use_exact_label"  → Job explicitly says "Excel Avançado" — use that exact string.
   * "descriptive"      → Job does not specify level — describe capabilities instead
   *                      (e.g. "Excel com fórmulas avançadas, tabelas dinâmicas e Power Query").
   * "basic_only"       → Job is laboratory/QHSE and does not highlight Excel — use "Excel" only.
   */
  excel_term_policy: "use_exact_label" | "descriptive" | "basic_only"

  // ─ Location statement ──────────────────────────────────────────────────────────
  /**
   * Whether to append a relocation/availability sentence to the summary.
   * True when the job city differs from the candidate's city (Bertioga/SP).
   */
  require_location_statement: boolean

  // ─ Summary anchors ──────────────────────────────────────────────────────────
  /** Three topic anchors the summary must address, in order of importance. */
  objective_anchors: {
    anchor1: string  // Primary: what the candidate brings to this specific role
    anchor2: string  // Secondary: most relevant technical capability
    anchor3: string  // Tertiary: soft skill / complementary differentiator
  }

  // ─ Backward compatibility ────────────────────────────────────────────────────────
  /**
   * Maps JobProfile back to the legacy JobContext string.
   * Used during the transition period while prompt builders still accept JobContext.
   * Will be removed in Etapa 5 when prompts are rewritten to accept JobProfile directly.
   */
  legacyContext: "laboratory" | "data_science" | "qhse" | "engineering" | "general"
}

// ─── Keyword sets for detection ───────────────────────────────────────────────────────

const LAB_KEYWORDS = [
  "preparação", "soluções", "amostras", "laboratório", "reagentes", "titulação",
  "síntese", "vidrarias", "bpl", "pesagem", "ensaios", "experimental", "analítico",
  "preparation", "solutions", "samples", "laboratory", "reagents", "titration",
  "synthesis", "glassware", "glp", "weighing", "assays",
]

const PEOPLE_ANALYTICS_KEYWORDS = [
  "people analytics", "rh", "recursos humanos", "headcount", "workforce",
  "turnover", "absentee", "absenteismo", "hrbp", "people data", "hr data",
  "people operations", "gestão de pessoas",
]

const BI_REPORTING_KEYWORDS = [
  "power bi", "tableau", "dashboard", "painéis", "relatório", "reporting",
  "indicadores", "kpi", "visualização", "bi", "business intelligence",
  "data visualization", "looker",
]

const DATA_SCIENCE_ML_KEYWORDS = [
  "machine learning", "ml", "deep learning", "neural network", "scikit-learn",
  "tensorflow", "keras", "modelo preditivo", "predictive model", "feature engineering",
  "algoritmo", "algorithm", "treinamento de modelo", "model training", "nlp",
  "computer vision", "pytorch",
]

const DATA_OPERATIONAL_KEYWORDS = [
  "python", "sql", "pandas", "numpy", "pipeline", "etl", "dados", "data",
  "databricks", "dbt", "big data", "data engineer", "analytics",
]

const QHSE_KEYWORDS = [
  "qualidade", "qhse", "hse", "iso", "não-conformidades", "auditoria",
  "segurança", "meio ambiente", "saúde ocupacional", "higiene", "compliance",
  "quality", "audit", "safety", "environment", "occupational health",
  "non-conformance", "standards",
]

const ENGINEERING_KEYWORDS = [
  "processo", "simulação", "modelagem", "aspen", "cad", "otimização",
  "eficiência", "process", "simulation", "modeling", "optimization",
  "plant", "planta", "equipamento", "equipment",
]

const EXCEL_AVANCADO_LABELS = [
  "excel avançado", "advanced excel", "excel intermediário",
  "excel with vba", "excel com vba",
]

// ─── Helpers ────────────────────────────────────────────────────────────────────

function score(text: string, keywords: string[]): number {
  return keywords.filter((kw) => text.includes(kw.toLowerCase())).length
}

function extractExactTerms(text: string): string[] {
  const KNOWN_EXACT_LABELS = [
    "excel avançado", "advanced excel", "power bi", "tableau", "power query",
    "sql", "python", "r", "vba", "aspen plus", "aspen", "matlab",
    "iso 17025", "iso 9001", "iso 14001", "ohsas 18001",
    "people analytics", "hr analytics", "business intelligence",
  ]
  return KNOWN_EXACT_LABELS.filter((label) => text.includes(label.toLowerCase()))
}

function detectSeniority(jobDetails: JobDetails): Seniority {
  const text = (jobDetails.cargo ?? "").toLowerCase()
  const tipo = jobDetails.tipo_vaga ?? "Estaégio"
  if (tipo === "Estágio" || text.includes("estágio") || text.includes("estagiario") || text.includes("intern")) {
    return "internship"
  }
  if (tipo === "Jrúnior" || text.includes("júnior") || text.includes("junior") || text.includes("jr")) {
    return "junior"
  }
  return "pleno"
}

function detectExcelPolicy(
  text: string,
  roleFamily: RoleFamily
): JobProfile["excel_term_policy"] {
  const hasExactLabel = EXCEL_AVANCADO_LABELS.some((label) => text.includes(label))
  if (hasExactLabel) return "use_exact_label"
  if (roleFamily === "laboratory_qc" || roleFamily === "qhse_quality") return "basic_only"
  return "descriptive"
}

function detectLocationStatement(jobDetails: JobDetails): boolean {
  const CANDIDATE_CITIES = ["bertioga", "santos", "guarujá", "cubatão", "são paulo", "sao paulo", "sp"]
  const jobCity = (jobDetails.local ?? "").toLowerCase()
  // If job location is blank or explicitly remote, no statement needed
  if (!jobCity || jobCity === "indefinido" || jobDetails.modalidade === "Remoto") return false
  // If any candidate city matches the job city, no statement needed
  if (CANDIDATE_CITIES.some((city) => jobCity.includes(city))) return false
  return true
}

function buildForbiddenTerms(family: RoleFamily, mode: RoleMode): string[] {
  if (family === "people_analytics" || (family === "bi_reporting" && mode === "operational_support")) {
    return [
      "laboratório", "amostras", "reagentes", "síntese química",
      "aspen plus", "aspen", "titulação",
      "deep learning como destaque", "redes neurais como destaque",
      "expertise", // too senior for internship
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

function buildObjectiveAnchors(
  family: RoleFamily,
  mode: RoleMode,
  seniority: Seniority
): JobProfile["objective_anchors"] {
  const seniorityLabel = seniority === "internship" ? "estudante" : seniority === "junior" ? "recém-formado" : "profissional"

  if (family === "people_analytics" && mode === "operational_support") {
    return {
      anchor1: `${seniorityLabel} com interesse em People Analytics e operações de RH`,
      anchor2: "organização e validação de bases de dados com Excel, SQL e Power BI",
      anchor3: "pensamento analítico e atenção a detalhes na documentação de processos",
    }
  }
  if (family === "bi_reporting" && mode === "analytical_reporting") {
    return {
      anchor1: `${seniorityLabel} com interesse em Business Intelligence e visualização de dados`,
      anchor2: "desenvolvimento de dashboards e relatórios com Power BI e SQL",
      anchor3: "capacidade analítica e comunicação de insights para tomada de decisão",
    }
  }
  if (family === "bi_reporting" && mode === "operational_support") {
    return {
      anchor1: `${seniorityLabel} com interesse em suporte operacional a dados e relatórios`,
      anchor2: "manutenção e atualização de bases, dashboards e indicadores com Excel e Power BI",
      anchor3: "organização, padronização e consistência de informações",
    }
  }
  if (family === "data_science_ml") {
    return {
      anchor1: `${seniorityLabel} com interesse em Ciência de Dados e Aprendizado de Máquina`,
      anchor2: "desenvolvimento de modelos preditivos e pipelines em Python e SQL",
      anchor3: "pensamento estatístico e orientação a resultados mensuráveis",
    }
  }
  if (family === "laboratory_qc") {
    return {
      anchor1: `${seniorityLabel} com interesse em laboratório analítico e controle de qualidade`,
      anchor2: "preparação de soluções, controle de amostras e técnicas analíticas",
      anchor3: "organização laboratorial e atenção a normas e boas práticas",
    }
  }
  if (family === "qhse_quality") {
    return {
      anchor1: `${seniorityLabel} com interesse em Qualidade, Saúde, Segurança e Meio Ambiente`,
      anchor2: "acompanhamento de KPIs, controle de não-conformidades e Excel/Power BI",
      anchor3: "interesse em normas ISO e melhoria contínua de processos",
    }
  }
  if (family === "process_engineering") {
    return {
      anchor1: `${seniorityLabel} com interesse em engenharia de processos e simulação`,
      anchor2: "simulação e modelagem de processos com Aspen Plus e Python",
      anchor3: "orientação técnica e rigor nos balanços de massa e energia",
    }
  }
  // general
  return {
    anchor1: `${seniorityLabel} com perfil analítico e interesse naárea de atuação da vaga`,
    anchor2: "habilidades técnicas em análise de dados, Python e ferramentas de visualização",
    anchor3: "capacidade de aprendizado rápido e trabalho com dados e processos",
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

// ─── Main builder ───────────────────────────────────────────────────────────────────

/**
 * Builds a structured JobProfile from raw job details.
 *
 * Detection strategy:
 * 1. Score each domain with its keyword set.
 * 2. Resolve the dominant role_family.
 * 3. Determine role_mode by detecting operational vs research signals.
 * 4. Derive all remaining fields from family + mode + job text.
 *
 * @param jobDetails - Parsed job data from the database
 * @returns Fully populated JobProfile
 */
export function buildJobProfile(jobDetails: JobDetails): JobProfile {
  const allText = [
    jobDetails.cargo ?? "",
    ...(jobDetails.requisitos_obrigatorios ?? []),
    ...(jobDetails.requisitos_desejaveis ?? []),
    ...(jobDetails.responsabilidades ?? []),
  ]
    .join(" ")
    .toLowerCase()

  // ─ Score each domain ─────────────────────────────────────────────────────────
  const labScore = score(allText, LAB_KEYWORDS) * 1.2
  const peopleAnalyticsScore = score(allText, PEOPLE_ANALYTICS_KEYWORDS) * 1.3
  const biReportingScore = score(allText, BI_REPORTING_KEYWORDS) * 1.0
  const dsMLScore = score(allText, DATA_SCIENCE_ML_KEYWORDS) * 1.1
  const dsOperationalScore = score(allText, DATA_OPERATIONAL_KEYWORDS) * 0.8
  const qhseScore = score(allText, QHSE_KEYWORDS) * 1.1
  const engineeringScore = score(allText, ENGINEERING_KEYWORDS) * 1.0

  // ─ Resolve role family ───────────────────────────────────────────────────────────
  let role_family: RoleFamily = "general"
  let highScore = 0

  const candidates: [RoleFamily, number][] = [
    ["laboratory_qc", labScore],
    ["people_analytics", peopleAnalyticsScore],
    ["bi_reporting", biReportingScore],
    ["data_science_ml", dsMLScore],
    ["qhse_quality", qhseScore],
    ["process_engineering", engineeringScore],
  ]

  for (const [family, s] of candidates) {
    if (s > highScore) {
      highScore = s
      role_family = family
    }
  }

  // ─ Resolve role mode ───────────────────────────────────────────────────────────
  const RESEARCH_SIGNALS = [
    "machine learning", "modelo preditivo", "predictive model", "feature engineering",
    "pesquisa", "research", "treinamento de modelo", "model training",
    "algoritmo", "algorithm", "deep learning", "nlp",
  ]
  const OPERATIONAL_SIGNALS = [
    "atualização", "manutenção", "suporte", "support", "operações", "operations",
    "validação", "validation", "padronização", "documentação", "documentation",
    "atualizar", "organizar", "manter",
  ]
  const QC_SIGNALS = [
    "auditoria", "audit", "não-conformidade", "non-conformance", "conformidade",
    "compliance", "certificação", "certification",
  ]

  let role_mode: RoleMode
  if (role_family === "laboratory_qc" || role_family === "qhse_quality") {
    role_mode = score(allText, QC_SIGNALS) > 0 ? "quality_control" : "operational_support"
  } else if (score(allText, RESEARCH_SIGNALS) >= 2) {
    role_mode = "research_modeling"
  } else if (score(allText, OPERATIONAL_SIGNALS) >= 2) {
    role_mode = "operational_support"
  } else if (role_family === "bi_reporting") {
    role_mode = "analytical_reporting"
  } else {
    role_mode = "operational_support"
  }

  // ─ Resolve role pack ID ─────────────────────────────────────────────────────────
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

  // ─ Resolve domain proof policy ─────────────────────────────────────────────────────
  const domain_proof_policy: DomainProofPolicy =
    role_family === "people_analytics" ||
    role_family === "laboratory_qc" ||
    role_family === "qhse_quality"
      ? "strict"
      : "moderate"

  // ─ Seniority ────────────────────────────────────────────────────────────────────
  const seniority = detectSeniority(jobDetails)

  // ─ Exact terms (from job description) ─────────────────────────────────────────────
  const exact_terms = extractExactTerms(allText)

  // ─ Preferred + forbidden terms ────────────────────────────────────────────────────
  const preferred_terms = buildPreferredTerms(role_family, role_mode)
  const forbidden_terms = buildForbiddenTerms(role_family, role_mode)

  // ─ Excel policy ────────────────────────────────────────────────────────────────────
  const excel_term_policy = detectExcelPolicy(allText, role_family)

  // ─ Location statement ───────────────────────────────────────────────────────────
  const require_location_statement = detectLocationStatement(jobDetails)

  // ─ Objective anchors ───────────────────────────────────────────────────────────
  const objective_anchors = buildObjectiveAnchors(role_family, role_mode, seniority)

  // ─ Legacy context mapping ─────────────────────────────────────────────────────────
  const legacyContext = resolveLegacyContext(role_family)

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
    require_location_statement,
    objective_anchors,
    legacyContext,
  }

  console.log(
    `[JobProfile] 🎯 family=${role_family} mode=${role_mode} seniority=${seniority} pack=${role_pack_id} policy=${domain_proof_policy}`
  )

  return profile
}
