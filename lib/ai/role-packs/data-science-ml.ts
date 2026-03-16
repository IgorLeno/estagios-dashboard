/**
 * ROLE PACK: data_science_ml
 *
 * Applies to: data_science_ml + research_modeling
 *
 * READ ONLY — This file is part of the core pipeline.
 * Do not edit without an explicit architectural decision.
 */

export const DATA_SCIENCE_ML_PACK = {
  id: "data_science_ml" as const,

  description: "Data Science, Machine Learning, and Research roles",

  // ─ Summary framing ─────────────────────────────────────────────────────────
  lead_with: [
    "desenvolvimento de modelos preditivos",
    "pipelines de dados end-to-end em Python",
    "análise exploratória e feature engineering",
    "aprendizado de máquina aplicado a problemas reais",
    "experimentação e validação de hipóteses",
  ],

  // ─ Skills allowed / promoted in this context ─────────────────────────────────
  allowed_skills: [
    "Python", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "Keras", "PyTorch",
    "SQL", "R",
    "Jupyter", "Google Colab",
    "Machine Learning", "Deep Learning", "NLP",
    "Feature Engineering", "Model Validation",
    "Matplotlib", "Seaborn", "Plotly",
    "Git", "Docker",
  ],

  demoted_skills: [
    "Aspen Plus", "MATLAB", "CAD",
  ],

  // ─ Summary blocked concepts ────────────────────────────────────────────────
  blocked_concepts: [
    "preparação de soluções",
    "reagentes",
    "vidrarias",
    "titulação",
    "síntese química como destaque",
  ],

  // ─ Projects: preferred frame ─────────────────────────────────────────────────
  project_frame: "research_modeling" as const,

  // Reframe map for chemistry/engineering projects
  project_reframe_map: {
    "simulação de processos": "modelagem preditiva de processos químicos",
    "aspen plus": "simulação computacional de processos",
    "preparação de soluções": "estruturação de dados experimentais para análise",
    "controle de amostras": "controle de qualidade de dados de entrada no modelo",
  } as Record<string, string>,

  project_outcome_suffixes: [
    "contribuindo para a melhoria do desempenho preditivo do modelo.",
    "demonstrando orientação a resultados e rigor metodológico.",
    "com validação estatística dos resultados obtidos.",
  ],

  // ─ Wording preferences ───────────────────────────────────────────────────────
  prefer_wording: [
    { avoid: "análise de dados", use: "análise exploratória de dados" },
    { avoid: "programa em Python", use: "desenvolve pipelines em Python" },
    { avoid: "usa machine learning", use: "aplica algoritmos de aprendizado de máquina" },
  ],

  tone: "técnico e orientado a resultados" as const,
} as const
