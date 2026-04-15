/**
 * JOB PROFILE — STRUCTURED JOB CONTEXT
 *
 * Carries all domain-specific configuration for resume generation:
 * - Role classification (family + mode + seniority)
 * - Domain proof policy
 * - Allowed / preferred / forbidden terminology
 * - Excel label policy
 * - Location statement requirement
 * - Summary topics for the summary section
 * - Domain-specific hints for skills, projects, and summary sections
 *
 * The profile is produced by buildJobProfile() and consumed by:
 * - Evidence Selector (Etapa 3)
 * - Summary / Skills / Projects prompts via buildProfileBlock()
 * - Normalizers (Etapa 7)
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
   * Domain-specific hints for skill category ordering and selection.
   * Consumed by buildProfileBlock() and rendered into the skills prompt.
   */
  skill_reordering_hints: string[]

  /**
   * Domain-specific hints for project description reframing.
   * Consumed by buildProfileBlock() and rendered into the projects prompt.
   */
  project_reframing_hints: string[]

  /**
   * Domain-specific hints for summary structure and emphasis.
   * Consumed by buildProfileBlock() and rendered into the summary prompt.
   */
  summary_structure_hints: string[]

  /**
   * Human-readable reasons for classification decisions.
   * Populated only when process.env.NODE_ENV !== "production".
   *
   * Must not be passed to prompt builders, persisted, or sent to the LLM.
   */
  explanations?: string[]
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

function buildSkillReorderingHints(family: RoleFamily, mode: RoleMode): string[] {
  if (family === "laboratory_qc") {
    return [
      "Within each existing category, move laboratory-related items toward the start when they are already present",
      "Within each existing category, move quality/norms items toward the start when they are already present",
      "Move programming and data science items toward the end when weakly related; do not remove them",
      "Do not add lab skills, proficiency indicators, categories, or renamed skill labels",
    ]
  }
  if (family === "people_analytics" || (family === "bi_reporting" && mode === "operational_support")) {
    return [
      "Within existing categories, move BI/analytics items such as Power BI, Excel, SQL, validation, bases, standardization, documentation, and KPIs toward the start when already present",
      "Move ML, neural network, and specialized engineering tool items toward the end when weakly related; do not remove them",
      "Do not split soft-skill categories or create process/behavioral categories",
      "Do not rename skills such as 'Gestão de projetos'; keep labels exactly as provided",
    ]
  }
  if (family === "data_science_ml") {
    return [
      "Within existing categories, move Python, SQL, ML, data pipeline, and analysis items toward the start when already present",
      "Within existing categories, move visualization items toward the start when already present",
      "Move lab-only items toward the end when weakly related; do not remove them",
    ]
  }
  if (family === "bi_reporting" && mode === "analytical_reporting") {
    return [
      "Within existing categories, move Power BI, Tableau, SQL, Excel, and reporting items toward the start when already present",
      "Within existing categories, position Python/pandas as reporting support, not ML, when already present",
      "Move lab and engineering tool items toward the end when weakly related; do not remove them",
    ]
  }
  if (family === "qhse_quality") {
    return [
      "Within existing categories, move Excel, Power BI, KPIs, technical reports, ISO standards, and non-conformance control toward the start when already present",
      "Move programming items toward the end unless the job requires quality automation; do not remove them",
    ]
  }
  if (family === "process_engineering") {
    return [
      "Within existing categories, move Aspen Plus, MATLAB, CAD, process simulation, and engineering analysis items toward the start when already present",
      "Within existing categories, move mass/energy balance, process optimization, and efficiency analysis items toward the start when already present",
      "Move generic office skills and unrelated data tools toward the end unless explicitly required; do not remove them",
    ]
  }
  return [
    "Within each existing category, place exact job matches first",
    "KEEP a balanced mix of technical, analytical, and operational skills",
    "Move skills with no direct relationship to requirements toward the end; do not remove them",
  ]
}

// [FIX-v2] Corrige reframing artificial de projetos adicionando regras globais contra sufixação, conexão falsa e repetição de keywords.
const PROJECT_REFRAMING_FIX_V2_HINTS = [
  "NUNCA adicione keywords da vaga como sufixo de frases — reescreva a frase de dentro para fora integrando o contexto organicamente",
  "Antes de conectar o projeto à vaga, verifique se a conexão é técnica ou metodológica (genuína) e não apenas terminológica (mesmas palavras, contextos diferentes) — conexões falsas prejudicam a credibilidade",
  "Cada expressão adaptada da vaga deve aparecer em no máximo 1 projeto — mantenha registro mental das expressões já utilizadas ao longo dos projetos",
]

// [FIX-v3] Regra de negrito e sustentabilidade em entrevista para todos os projetos
const PROJECT_REFRAMING_FIX_V3_HINTS = [
  "Use negrito APENAS em números, métricas e resultados concretos (R², MRD, MAD, contagens) — NUNCA em expressões adaptadas da vaga como **relatórios gerenciais**, **apresentações estratégicas** ou **análise de dados de produtividade**",
  "Aplique o teste de sustentabilidade: o candidato consegue detalhar com exemplo concreto de projeto acadêmico? Se não, reformule — nunca eleve projeto científico ao nível de experiência operacional profissional (OEE, planos de ação, apresentações estratégicas corporativas)",
]

function buildProjectReframingHints(family: RoleFamily, mode: RoleMode): string[] {
  if (family === "laboratory_qc") {
    return [
      "Rewrite projects to emphasize QUALITY CONTROL and GOOD LABORATORY PRACTICES, not code or algorithms",
      "For programming/data projects: reframe as 'systematic methodology for data quality control and traceability'",
      "For chemistry projects: emphasize molecular modeling, physicochemical analysis, process optimization",
      "Each bullet should highlight: quality control, data validation, traceability, lab organization, standards compliance",
      "RESULTS: Always end the last bullet with a concrete metric or scope descriptor extracted from the project data (count, percentage, volume, dataset size). Never fabricate — only use what is present in the project description.",
      ...PROJECT_REFRAMING_FIX_V2_HINTS,
      ...PROJECT_REFRAMING_FIX_V3_HINTS,
    ]
  }
  if (family === "people_analytics" || (family === "bi_reporting" && mode === "operational_support")) {
    return [
      "Reframe scientific/chemical work into data process language",
      "'molecular modeling' → 'structuring and analyzing physicochemical property data'",
      "'equilibrium simulation' → 'organizing and validating simulation results'",
      "'process efficiency analysis' → 'comparing and standardizing process data'",
      "Each bullet MUST end with a data/process outcome: '...ensuring result consistency and traceability'",
      "PRIORITIZE: structuring databases, standardization, validation, source documentation, technical reporting",
      "AVOID as primary emphasis: Machine Learning, feature engineering, hyperparameters",
      "RESULTS: Always end the last bullet with a concrete metric or scope descriptor extracted from the project data (count, percentage, volume, dataset size). Never fabricate — only use what is present in the project description.",
      ...PROJECT_REFRAMING_FIX_V2_HINTS,
      ...PROJECT_REFRAMING_FIX_V3_HINTS,
    ]
  }
  if (family === "data_science_ml") {
    return [
      "For data/computing projects: emphasize 'end-to-end data pipeline', 'ML', 'feature engineering', 'model training'",
      "For engineering projects: emphasize 'predictive modeling', 'computational simulation'",
      "Mention libraries (Pandas, NumPy, Scikit-learn) when used",
      "RESULTS: Always end the last bullet with a concrete metric or scope descriptor extracted from the project data (count, percentage, volume, dataset size). Never fabricate — only use what is present in the project description.",
      ...PROJECT_REFRAMING_FIX_V2_HINTS,
      ...PROJECT_REFRAMING_FIX_V3_HINTS,
    ]
  }
  if (family === "qhse_quality") {
    return [
      "For data projects: reframe as 'data quality control system', 'KPI monitoring', 'Power BI dashboards'",
      "For engineering projects: emphasize 'environmental efficiency analysis', 'compliance with technical standards'",
      "RESULTS: Always end the last bullet with a concrete metric or scope descriptor extracted from the project data (count, percentage, volume, dataset size). Never fabricate — only use what is present in the project description.",
      ...PROJECT_REFRAMING_FIX_V2_HINTS,
      ...PROJECT_REFRAMING_FIX_V3_HINTS,
    ]
  }
  if (family === "process_engineering") {
    return [
      "Emphasize simulation, modeling, process optimization",
      "Mention engineering tools: Aspen Plus, MATLAB, CAD",
      "RESULTS: Always end the last bullet with a concrete metric or scope descriptor extracted from the project data (count, percentage, volume, dataset size). Never fabricate — only use what is present in the project description.",
      ...PROJECT_REFRAMING_FIX_V2_HINTS,
      ...PROJECT_REFRAMING_FIX_V3_HINTS,
    ]
  }
  return [
    "Balance technical and practical aspects",
    "Emphasize aspects most relevant to job requirements",
    "RESULTS: Always end the last bullet with a concrete metric or scope descriptor extracted from the project data (count, percentage, volume, dataset size). Never fabricate — only use what is present in the project description.",
    ...PROJECT_REFRAMING_FIX_V2_HINTS,
  ]
}

function buildSummaryStructureHints(family: RoleFamily, mode: RoleMode, seniority: Seniority): string[] {
  const internshipTone = seniority === "internship"
    ? "Use 'conhecimento em', 'experiência acadêmica com', 'prática com' — NEVER 'expertise'"
    : ""

  // [FIX-v3] F3 — calibração de vocabulário por família de vaga (aplicado a todos os perfis)
  const vocabularyCalibrationHint = family === "laboratory_qc"
    ? "VOCABULARY: lab/chemistry nature — FORBIDDEN in profile: relatórios gerenciais, apresentações estratégicas, indicadores de performance produtiva, OEE, gestão de processos"
    : family === "people_analytics" || family === "bi_reporting"
    ? "VOCABULARY: data/reporting nature — avoid heavy scientific/computational language as the main emphasis; lead with operational data skills"
    : family === "qhse_quality" || family === "process_engineering"
    ? "VOCABULARY: operational/industrial nature — describe scientific projects by their transferable analytical value, not as operational industrial experience"
    : "VOCABULARY: match profile language to the job's primary nature; describe scientific projects by transferable value, not by the job's specific vocabulary"

  if (family === "laboratory_qc") {
    return [
      "Sentence 1: Education + interest in laboratory activities",
      "Sentence 2: Practical lab skills (solution preparation, analytical techniques, sample control)",
      "Sentence 3: Quality standards (ISO 17025 mentioned MAX 1x) + laboratory organization",
      "Sentence 4: Objective aligned to company function",
      "MINIMIZE: programming skills, data science tools — only mention if job explicitly requires",
      "MAXIMIZE: practical lab experience from academic courses (Analytical Chemistry, Physical Chemistry)",
      internshipTone,
      vocabularyCalibrationHint,
    ].filter(Boolean)
  }
  if (family === "people_analytics" || (family === "bi_reporting" && mode === "operational_support")) {
    return [
      "Sentence 1: Education + interest in data organization/analysis (lead with BI, SQL, Python, Excel)",
      "Sentence 2: Operational tools (Excel with specific functions, Power BI, SQL)",
      "Sentence 3: Process competencies (validation, standardization, documentation, traceability)",
      "Sentence 4: Function-focused objective: 'Busco estágio em [area] para apoiar rotinas de...'",
      "NEVER claim 'expertise' or 'knowledge in People Analytics' without direct experience — use 'interest in' instead",
      "If People Analytics job: include 'e BI' in objective for broader ATS matching",
      "NEVER name the company in the objective — use area/function instead",
      internshipTone,
      vocabularyCalibrationHint,
    ].filter(Boolean)
  }
  if (family === "data_science_ml") {
    return [
      "Sentence 1: Education + interest in data/ML",
      "Sentence 2: Technical skills (Python, SQL, ML libraries)",
      "Sentence 3: Project experience (pipelines, models, analysis)",
      "Sentence 4: Objective at company",
      internshipTone,
      vocabularyCalibrationHint,
    ].filter(Boolean)
  }
  if (family === "qhse_quality") {
    return [
      "Sentence 1: Education + interest in QHSE",
      "Sentence 2: Management skills (Excel, Power BI, KPIs)",
      "Sentence 3: Standards and quality control knowledge",
      "Sentence 4: Objective at company",
      internshipTone,
      vocabularyCalibrationHint,
    ].filter(Boolean)
  }
  if (family === "process_engineering") {
    return [
      "Sentence 1: Education + interest in processes/engineering",
      "Sentence 2: Technical tools (Aspen, simulation, MATLAB)",
      "Sentence 3: Project experience/optimization",
      "Sentence 4: Objective at company",
      internshipTone,
      vocabularyCalibrationHint,
    ].filter(Boolean)
  }
  return [
    "Use balanced approach: mention skills most relevant to job requirements",
    "Avoid over-specialization in one domain",
    "Keep profile generalist and adaptable",
    internshipTone,
    vocabularyCalibrationHint,
  ].filter(Boolean)
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
  const skill_reordering_hints = buildSkillReorderingHints(role_family, role_mode)
  const project_reframing_hints = buildProjectReframingHints(role_family, role_mode)
  const summary_structure_hints = buildSummaryStructureHints(role_family, role_mode, seniority)

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
    skill_reordering_hints,
    project_reframing_hints,
    summary_structure_hints,
    ...(process.env.NODE_ENV !== "production" ? { explanations } : {}),
  }

  console.log(
    `[JobProfile] family=${role_family} mode=${role_mode} seniority=${seniority} pack=${role_pack_id} policy=${domain_proof_policy}`
  )

  return profile
}
