import type { CVTemplate } from "./types"

/**
 * ============================================
 * FIXED SECTIONS - DO NOT MODIFY
 * ============================================
 * These sections MUST remain exactly as shown in saipem-cv-igor_fernandes.pdf
 * LLM personalization is FORBIDDEN for these fields
 */

/**
 * Portuguese CV Template
 * Based on saipem-cv-igor_fernandes.pdf (EXACT match)
 */
export const CV_TEMPLATE_PT: CVTemplate = {
  language: "pt",

  // FIXED: Never modify header
  header: {
    name: "IGOR LENO DE SOUZA FERNANDES",
    title: "", // Not used in original template
    email: "igorleno.fernandes@gmail.com",
    phone: "+55 (13) 98157-4198",
    location: "Bertioga/SP (CEP: 11260-342)",
    links: [{ label: "LinkedIn", url: "linkedin.com/in/igor-leno-de-souza-fernandes" }],
  },

  // PERSONALIZABLE: LLM can rewrite this section (80-120 words)
  summary:
    "Estudante de Engenharia Química (UNESP) em fase de conclusão, com forte perfil analítico e interesse direcionado para as áreas de Qualidade, Gestão Ambiental (QHSE) e Controle Técnico. Possuo experiência acadêmica em pesquisa, modelagem de processos e análise de dados, com domínio de ferramentas de gestão (Excel Avançado, MS Office) e análise (Python, SQL) para administração de bases de dados, monitoramento de indicadores e elaboração de relatórios técnicos. Disponível para estágio em período integral com início imediato e mobilidade para realocação.",

  // FIXED: Never modify experience section
  experience: [],

  // FIXED: Never modify education
  education: [
    {
      degree: "Bacharelado em Engenharia Química",
      institution: 'Universidade Estadual Paulista "Júlio de Mesquita Filho" (UNESP)',
      period: "Previsão de conclusão: Dezembro/2026",
      location: "",
    },
  ],

  // PERSONALIZABLE: LLM can reorder items within categories (NEVER add new skills)
  skills: [
    {
      category: "Química Analítica & Laboratório",
      items: [
        "Preparação de soluções e reagentes",
        "Titulações volumétricas",
        "Síntese química",
        "Controle de amostras",
        "Organização de laboratório",
        "Boas Práticas de Laboratório (BPL)",
      ],
    },
    {
      category: "Linguagens & Análise de Dados",
      items: ["Python (Pandas, NumPy, Scikit-learn)", "SQL", "R", "VBA"],
    },
    {
      category: "Ferramentas de Engenharia",
      items: ["Aspen Plus", "MOPAC", "CREST", "Avogadro"],
    },
    {
      category: "Visualização & BI",
      items: [
        "Power BI (dashboards, KPI tracking)",
        "Excel Avançado (Tabelas Dinâmicas, Macros, Power Query)",
      ],
    },
    {
      category: "Soft Skills",
      items: [
        "Relatórios técnicos",
        "Gestão de projetos (KPIs/qualidade)",
        "Comunicação técnica",
        "Controle de não-conformidades",
      ],
    },
  ],

  // PERSONALIZABLE: LLM can rewrite descriptions (NEVER change titles or dates)
  projects: [
    {
      title: "Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)",
      description: [
        "Desenvolvimento de pipeline em Python para automação da geração e controle de dados, resultando no treinamento de modelos e elaboração de relatórios analíticos.",
      ],
    },
    {
      title: "Modelagem do Equilíbrio Líquido-Vapor para Produção de Biodiesel (2022-2023)",
      description: [
        "Análise da eficiência de processos industriais (foco ambiental) por meio de modelagem molecular e simulação físico-química para otimização de performance.",
      ],
    },
  ],

  // FIXED: Never modify languages
  languages: [{ language: "Inglês Avançado", proficiency: "Leitura, Escrita e Conversação" }],

  // FIXED: Never modify certifications
  certifications: [
    "Deep Learning Specialization - (Coursera, 2024)",
    "Power BI Impressionador - (Hashtag Treinamentos, 2023)",
    "SQL Impressionador - (Hashtag Treinamentos, 2023)",
    "Google Data Analytics - (Coursera, 2023)",
  ],
}

/**
 * English CV Template
 * Based on saipem-cv-igor_fernandes.pdf (EXACT match)
 */
export const CV_TEMPLATE_EN: CVTemplate = {
  language: "en",

  // FIXED: Never modify header
  header: {
    name: "IGOR LENO DE SOUZA FERNANDES",
    title: "", // Not used in original template
    email: "igorleno.fernandes@gmail.com",
    phone: "+55 (13) 98157-4198",
    location: "Bertioga/SP (ZIP: 11260-342)",
    links: [{ label: "LinkedIn", url: "linkedin.com/in/igor-leno-de-souza-fernandes" }],
  },

  // PERSONALIZABLE: LLM can rewrite this section (80-120 words)
  summary:
    "Chemical Engineering student (UNESP) nearing completion, with a strong analytical profile and keen interest in Quality, Environmental Management (QHSE), and Technical Control. I have academic experience in research, process modeling, and data analysis, with proficiency in management tools (Advanced Excel, MS Office) and analysis tools (Python, SQL) for database administration, indicator monitoring, and technical report preparation. Seeking an initial internship opportunity to apply my knowledge and actively contribute to Quality Control projects, records monitoring, and improvement plans. Available for full-time internship with immediate start and willing to relocate.",

  // FIXED: Never modify experience section
  experience: [],

  // FIXED: Never modify education
  education: [
    {
      degree: "B.S. in Chemical Engineering",
      institution: 'São Paulo State University "Júlio de Mesquita Filho" (UNESP)',
      period: "Expected graduation: 12/2026",
      location: "",
    },
  ],

  // PERSONALIZABLE: LLM can reorder items within categories (NEVER add new skills)
  skills: [
    {
      category: "Analytical Chemistry & Laboratory",
      items: [
        "Solution and reagent preparation",
        "Volumetric titrations",
        "Chemical synthesis",
        "Sample control",
        "Laboratory organization",
        "Good Laboratory Practices (GLP)",
      ],
    },
    {
      category: "Languages & Data Analysis",
      items: ["Python (Pandas, NumPy, Scikit-learn)", "SQL", "R", "VBA"],
    },
    {
      category: "Engineering Tools",
      items: ["Aspen Plus", "MOPAC", "CREST", "Avogadro"],
    },
    {
      category: "Visualization & BI",
      items: [
        "Power BI (dashboards, KPI tracking)",
        "Advanced Excel (Pivot Tables, Macros, Power Query)",
      ],
    },
    {
      category: "Soft Skills",
      items: [
        "Technical reporting",
        "Project management (KPIs/Quality)",
        "Technical communication",
        "Non-conformance control",
      ],
    },
  ],

  // PERSONALIZABLE: LLM can rewrite descriptions (NEVER change titles or dates)
  projects: [
    {
      title: "Automated Thermodynamic Data Pipeline for Machine Learning (2023-2025)",
      description: [
        "Developed a Python pipeline to automate data generation and control, resulting in model training and analytical report preparation",
      ],
    },
    {
      title: "Liquid-Vapor Equilibrium Modeling for Biodiesel Production (2022-2023)",
      description: [
        "Analysis of industrial process efficiency (environmental focus) through molecular modeling and physicochemical simulation for performance optimization",
      ],
    },
  ],

  // FIXED: Never modify languages
  languages: [{ language: "Advanced English", proficiency: "Reading, Writing, and Speaking" }],

  // FIXED: Never modify certifications
  certifications: [
    "Deep Learning Specialization (Coursera, 2024)",
    "Power BI Impressionador 1.0 (Hashtag Treinamentos, 2023)",
    "SQL Impressionador (Hashtag Treinamentos, 2023)",
    "Google Data Analytics (Coursera, 2023)",
  ],
}

/**
 * Helper function to get CV template by language
 * @param language - Target language (pt or en)
 * @returns CV template for the specified language
 */
export function getCVTemplate(language: "pt" | "en"): CVTemplate {
  return language === "pt" ? CV_TEMPLATE_PT : CV_TEMPLATE_EN
}
