/**
 * ROLE PACK: analytics_operational
 *
 * Applies to: people_analytics + operational_support
 * Also used as fallback for: bi_reporting + operational_support
 *
 * READ ONLY — This file is part of the core pipeline.
 * Do not edit without an explicit architectural decision.
 */

export const ANALYTICS_OPERATIONAL_PACK = {
  id: "analytics_operational" as const,

  description: "People Analytics / HR Analytics / BI Operational Support roles",

  /**
   * Semantic governance flags consumed by the Evidence Selector (Etapa 3).
   * These replace string-list governance for code-facing logic while keeping
   * prompt-facing compatibility until Etapa 5.
   */
  governance: {
    blockConcepts: {
      labAnalogy: true,
      mlAsPrimaryPitch: true,
      seniorityInflation: true,
    },
    promoteConcepts: {
      dataValidation: true,
      documentation: true,
      baseOrganization: true,
      kpiTracking: true,
    },
  } as const,

  // ─ Summary framing ─────────────────────────────────────────────────────────
  lead_with: [
    "organização e validação de bases de dados",
    "estruturação e padronização de informações",
    "acompanhamento de indicadores e KPIs",
    "elaboração de relatórios e dashboards",
    "documentação técnica de processos de dados",
  ],

  // ─ Skills allowed in this context ────────────────────────────────────────────
  allowed_skills: [
    "Excel", "Excel Avançado", "Power Query", "Power BI", "SQL",
    "Python", "Pandas", "NumPy",
    "Tableau", "Looker",
    "Google Sheets", "Google Data Studio",
    "Comunicação", "Atenção a detalhes", "Organização",
  ],

  demoted_skills: [
    "Aspen Plus", "MATLAB", "CAD",
    "Scikit-learn", "TensorFlow", "Keras", "PyTorch",
    "Deep Learning", "Machine Learning",
    "R", "VBA",
  ],

  // ─ Summary blocked concepts ────────────────────────────────────────────────
  blocked_concepts: [
    "laboratório",
    "amostras",
    "reagentes",
    "síntese química",
    "titulação",
    "aspen plus",
    "deep learning como destaque",
    "redes neurais como destaque",
    "analogia laboratório → BI",
    "especialista",
    "expertise em",
  ],

  // ─ Projects: preferred frame ─────────────────────────────────────────────────
  project_frame: "operational_support" as const,

  // Reframe map for scientific/technical projects
  project_reframe_map: {
    "modelagem molecular": "estruturação e análise de dados de propriedades físico-químicas",
    "simulação de equilíbrio": "organização e validação de resultados de simulação",
    "análise de eficiência de processos": "comparação e padronização de dados de processo",
    "otimização ambiental": "organização de indicadores de desempenho ambiental",
    "pipeline de dados": "estruturação e padronização de bases de dados",
    "machine learning": "análise exploratória e estruturação de dados para tomada de decisão",
  } as Record<string, string>,

  // Each project bullet must end with one of these outcomes
  project_outcome_suffixes: [
    "para suporte à tomada de decisão técnica.",
    "garantindo consistência e rastreabilidade dos resultados.",
    "com documentação estruturada de fontes, metodologia e resultados.",
    "apoiando o acompanhamento de indicadores operacionais.",
  ],

  // ─ Wording preferences ───────────────────────────────────────────────────────
  prefer_wording: [
    { avoid: "rastreamento de KPIs", use: "acompanhamento de KPIs" },
    { avoid: "gestão de projetos", use: "acompanhamento de projetos" },
    { avoid: "visualizações estratégicas", use: "visualização de indicadores" },
    { avoid: "administração de bases", use: "organização e estruturação de bases" },
    { avoid: "People Analytics specialist", use: "análise de dados de RH" },
  ],

  tone: "operacional e processual" as const,
} as const
