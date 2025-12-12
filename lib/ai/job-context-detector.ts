import type { JobDetails } from "./types"

/**
 * Job context types for resume personalization
 * Used to apply domain-specific reframing strategies
 */
export type JobContext = "laboratory" | "data_science" | "qhse" | "engineering" | "general"

/**
 * Keyword sets for each job context
 * Used for scoring and automatic context detection
 */
const CONTEXT_KEYWORDS = {
  laboratory: {
    keywords: [
      "preparação",
      "soluções",
      "amostras",
      "análises",
      "laboratório",
      "reagentes",
      "titulação",
      "síntese",
      "vidrarias",
      "controle de amostras",
      "boas práticas",
      "bpl",
      "pesagem",
      "ensaios",
      "experimental",
      "analítico",
      "preparation",
      "solutions",
      "samples",
      "analyses",
      "laboratory",
      "reagents",
      "titration",
      "synthesis",
      "glassware",
      "sample control",
      "good practices",
      "glp",
      "weighing",
      "assays",
    ],
    weight: 1.2, // Higher weight due to specificity
  },

  data_science: {
    keywords: [
      "python",
      "sql",
      "pipeline",
      "machine learning",
      "ml",
      "dados",
      "modelo",
      "preditivo",
      "algoritmo",
      "data science",
      "scikit-learn",
      "pandas",
      "numpy",
      "tensorflow",
      "keras",
      "deep learning",
      "neural network",
      "data",
      "model",
      "predictive",
      "algorithm",
      "data analysis",
      "data engineer",
      "etl",
      "big data",
    ],
    weight: 1.0,
  },

  qhse: {
    keywords: [
      "qualidade",
      "qhse",
      "hse",
      "iso",
      "controle",
      "não-conformidades",
      "auditoria",
      "segurança",
      "meio ambiente",
      "saúde",
      "ocupacional",
      "higiene",
      "kpi",
      "indicadores",
      "quality",
      "audit",
      "safety",
      "environment",
      "health",
      "occupational",
      "hygiene",
      "non-conformance",
      "compliance",
      "standards",
    ],
    weight: 1.1,
  },

  engineering: {
    keywords: [
      "processo",
      "simulação",
      "modelagem",
      "aspen",
      "cad",
      "projeto",
      "técnico",
      "engenharia",
      "otimização",
      "eficiência",
      "performance",
      "process",
      "simulation",
      "modeling",
      "design",
      "technical",
      "engineering",
      "optimization",
      "efficiency",
      "planta",
      "plant",
      "equipamento",
      "equipment",
    ],
    weight: 1.0,
  },
} as const

/**
 * Detect job context from job details
 * Uses keyword scoring to determine the most relevant domain
 *
 * @param jobDetails - Job description details
 * @returns Detected job context type
 *
 * @example
 * const jobDetails = {
 *   cargo: "Estagiário de Laboratório",
 *   requisitos_obrigatorios: ["Preparação de soluções", "ISO 17025"],
 *   responsabilidades: ["Realizar análises químicas", "Controlar amostras"]
 * }
 * const context = detectJobContext(jobDetails) // Returns "laboratory"
 */
export function detectJobContext(jobDetails: JobDetails): JobContext {
  // Combine all relevant text for analysis
  const allText = [
    jobDetails.cargo || "",
    ...(jobDetails.requisitos_obrigatorios || []),
    ...(jobDetails.requisitos_desejaveis || []),
    ...(jobDetails.responsabilidades || []),
  ]
    .join(" ")
    .toLowerCase()

  // Calculate scores for each context
  const scores: Record<string, number> = {}

  for (const [context, config] of Object.entries(CONTEXT_KEYWORDS)) {
    const keywords = config.keywords as readonly string[]
    const matches = keywords.filter((keyword: string) => allText.includes(keyword.toLowerCase()))
    scores[context] = matches.length * config.weight

    console.log(
      `[Job Context Detector] ${context}: ${scores[context].toFixed(1)} (${matches.length} matches)`
    )
  }

  // Find context with highest score
  const detectedContext = Object.entries(scores).reduce((max, [context, score]) =>
    score > max.score ? { context, score } : max
  , { context: "general", score: 0 })

  // Return detected context (fallback to "general" if no matches)
  const finalContext = (detectedContext.score > 0
    ? detectedContext.context
    : "general") as JobContext

  console.log(`[Job Context Detector] ✅ Detected context: ${finalContext}`)

  return finalContext
}

/**
 * Get human-readable description of job context
 * @param context - Job context type
 * @returns Description string
 */
export function getContextDescription(context: JobContext): string {
  const descriptions: Record<JobContext, string> = {
    laboratory: "Laboratory/Analytical Chemistry position",
    data_science: "Data Science/Machine Learning position",
    qhse: "Quality/Health/Safety/Environment position",
    engineering: "Engineering/Technical position",
    general: "General position (no specific domain detected)",
  }
  return descriptions[context]
}
