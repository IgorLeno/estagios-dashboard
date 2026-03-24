/**
 * CANDIDATE DATA — Legacy hardcoded candidate content
 *
 * @deprecated Use loadCandidateData() from candidate-profile-adapter.ts instead.
 * This file is kept for backward compatibility with tests and deprecated getCVTemplate().
 * New code should load candidate data from the candidate_profile Supabase table.
 */
import type { Certification } from "./types"

export interface CandidateData {
  identity: {
    name: string
    email: string
    phone: string
    location_pt: string
    location_en: string
    links: Array<{ label: string; url: string }>
  }
  education: Array<{
    degree_pt: string
    degree_en: string
    institution_pt: string
    institution_en: string
    period_pt: string
    period_en: string
    location: string
  }>
  skills: Array<{
    category_pt: string
    category_en: string
    items_pt: string[]
    items_en: string[]
  }>
  projects: Array<{
    title_pt: string
    title_en: string
    description_pt: string[]
    description_en: string[]
  }>
  languages: Array<{
    language_pt: string
    language_en: string
    proficiency_pt: string
    proficiency_en: string
  }>
  certifications_pt: Certification[]
  certifications_en: Certification[]
  summary_pt: string
  summary_en: string
}

/** @deprecated Use loadCandidateData() from candidate-profile-adapter.ts instead */
export const CANDIDATE: CandidateData = {
  identity: {
    name: "IGOR LENO DE SOUZA FERNANDES",
    email: "igorleno.fernandes@gmail.com",
    phone: "+55 (13) 98157-4198",
    location_pt: "Bertioga/SP (CEP: 11260-342)",
    location_en: "Bertioga/SP (ZIP: 11260-342)",
    links: [{ label: "LinkedIn", url: "linkedin.com/in/igor-leno-de-souza-fernandes" }],
  },

  education: [
    {
      degree_pt: "Bacharelado em Engenharia Química",
      degree_en: "B.S. in Chemical Engineering",
      institution_pt: 'Universidade Estadual Paulista "Júlio de Mesquita Filho" (UNESP)',
      institution_en: 'São Paulo State University "Júlio de Mesquita Filho" (UNESP)',
      period_pt: "Previsão de conclusão: Dezembro/2026",
      period_en: "Expected graduation: 12/2026",
      location: "",
    },
  ],

  skills: [
    {
      category_pt: "Química Analítica & Laboratório",
      category_en: "Analytical Chemistry & Laboratory",
      items_pt: [
        "Preparação de soluções e reagentes",
        "Titulações volumétricas",
        "Síntese química",
        "Controle de amostras",
        "Organização de laboratório",
        "Boas Práticas de Laboratório (BPL)",
      ],
      items_en: [
        "Solution and reagent preparation",
        "Volumetric titrations",
        "Chemical synthesis",
        "Sample control",
        "Laboratory organization",
        "Good Laboratory Practices (GLP)",
      ],
    },
    {
      category_pt: "Linguagens & Análise de Dados",
      category_en: "Languages & Data Analysis",
      items_pt: ["Python (Pandas, NumPy, Scikit-learn)", "SQL", "R", "VBA"],
      items_en: ["Python (Pandas, NumPy, Scikit-learn)", "SQL", "R", "VBA"],
    },
    {
      category_pt: "Ferramentas de Engenharia",
      category_en: "Engineering Tools",
      items_pt: ["Aspen Plus", "MOPAC", "CREST", "Avogadro"],
      items_en: ["Aspen Plus", "MOPAC", "CREST", "Avogadro"],
    },
    {
      category_pt: "Visualização & BI",
      category_en: "Visualization & BI",
      items_pt: [
        "Power BI (dashboards, KPI tracking)",
        "Excel Avançado (Tabelas Dinâmicas, Macros, Power Query)",
      ],
      items_en: [
        "Power BI (dashboards, KPI tracking)",
        "Advanced Excel (Pivot Tables, Macros, Power Query)",
      ],
    },
    {
      category_pt: "Soft Skills",
      category_en: "Soft Skills",
      items_pt: [
        "Relatórios técnicos",
        "Gestão de projetos (KPIs/qualidade)",
        "Comunicação técnica",
        "Controle de não-conformidades",
      ],
      items_en: [
        "Technical reporting",
        "Project management (KPIs/Quality)",
        "Technical communication",
        "Non-conformance control",
      ],
    },
  ],

  projects: [
    {
      title_pt: "Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)",
      title_en: "Automated Thermodynamic Data Pipeline for Machine Learning (2023-2025)",
      description_pt: [
        "Desenvolvimento de pipeline em Python para automação da geração e controle de dados, resultando no treinamento de modelos e elaboração de relatórios analíticos.",
      ],
      description_en: [
        "Developed a Python pipeline to automate data generation and control, resulting in model training and analytical report preparation",
      ],
    },
    {
      title_pt: "Modelagem do Equilíbrio Líquido-Vapor para Produção de Biodiesel (2022-2023)",
      title_en: "Liquid-Vapor Equilibrium Modeling for Biodiesel Production (2022-2023)",
      description_pt: [
        "Análise da eficiência de processos industriais (foco ambiental) por meio de modelagem molecular e simulação físico-química para otimização de performance.",
      ],
      description_en: [
        "Analysis of industrial process efficiency (environmental focus) through molecular modeling and physicochemical simulation for performance optimization",
      ],
    },
  ],

  languages: [
    {
      language_pt: "Inglês Avançado",
      language_en: "Advanced English",
      proficiency_pt: "Leitura, Escrita e Conversação",
      proficiency_en: "Reading, Writing, and Speaking",
    },
  ],

  certifications_pt: [
    { title: "Deep Learning Specialization", institution: "Coursera", year: "2024" },
    { title: "Power BI Impressionador", institution: "Hashtag Treinamentos", year: "2023" },
    { title: "SQL Impressionador", institution: "Hashtag Treinamentos", year: "2023" },
    { title: "Google Data Analytics", institution: "Coursera", year: "2023" },
  ],
  certifications_en: [
    { title: "Deep Learning Specialization", institution: "Coursera", year: "2024" },
    { title: "Power BI Impressionador 1.0", institution: "Hashtag Treinamentos", year: "2023" },
    { title: "SQL Impressionador", institution: "Hashtag Treinamentos", year: "2023" },
    { title: "Google Data Analytics", institution: "Coursera", year: "2023" },
  ],

  summary_pt:
    "Estudante de Engenharia Química (UNESP) em fase de conclusão, com forte perfil analítico e interesse direcionado para as áreas de Qualidade, Gestão Ambiental (QHSE) e Controle Técnico. Possuo experiência acadêmica em pesquisa, modelagem de processos e análise de dados, com domínio de ferramentas de gestão (Excel Avançado, MS Office) e análise (Python, SQL) para administração de bases de dados, monitoramento de indicadores e elaboração de relatórios técnicos. Disponível para estágio em período integral com início imediato e mobilidade para realocação.",

  summary_en:
    "Chemical Engineering student (UNESP) nearing completion, with a strong analytical profile and keen interest in Quality, Environmental Management (QHSE), and Technical Control. I have academic experience in research, process modeling, and data analysis, with proficiency in management tools (Advanced Excel, MS Office) and analysis tools (Python, SQL) for database administration, indicator monitoring, and technical report preparation. Seeking an initial internship opportunity to apply my knowledge and actively contribute to Quality Control projects, records monitoring, and improvement plans. Available for full-time internship with immediate start and willing to relocate.",
}
