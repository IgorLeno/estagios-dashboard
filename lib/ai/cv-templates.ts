import type { CVTemplate } from "./types"

/**
 * Portuguese CV Template
 * Base template for Brazilian Portuguese resumes
 */
export const CV_TEMPLATE_PT: CVTemplate = {
  language: "pt",

  header: {
    name: "Igor Fernandes",
    title: "Engenheiro Químico | Pesquisador em Machine Learning e Processos Químicos",
    email: "igor.fernandes@example.com",
    phone: "+55 (13) 99999-9999",
    location: "Santos, São Paulo, Brasil",
    links: [
      { label: "LinkedIn", url: "https://linkedin.com/in/igorfernandes" },
      { label: "GitHub", url: "https://github.com/igorfernandes" },
      { label: "Lattes", url: "http://lattes.cnpq.br/1234567890" },
    ],
  },

  summary:
    "Engenheiro Químico com sólida formação em processos industriais e crescente especialização em Machine Learning aplicado à engenharia. Experiência em pesquisa científica com foco em simulação de processos, análise de dados e otimização de sistemas químicos. Habilidade em Python, desenvolvimento de modelos preditivos e automação de processos. Busco oportunidades para aplicar conhecimentos técnicos em projetos inovadores que integrem engenharia química e ciência de dados.",

  experience: [
    {
      title: "Pesquisador de Iniciação Científica",
      company: "Universidade Federal de São Paulo (UNIFESP)",
      period: "Mar 2023 - Presente",
      location: "Santos, SP",
      description: [
        "Desenvolvimento de modelos de Machine Learning para predição de propriedades termodinâmicas de sistemas químicos",
        "Análise de grandes volumes de dados experimentais utilizando Python (pandas, scikit-learn, TensorFlow)",
        "Simulação de processos químicos em Python e validação experimental",
        "Elaboração de artigos científicos e apresentação de resultados em congressos",
      ],
    },
  ],

  education: [
    {
      degree: "Bacharelado em Engenharia Química",
      institution: "Universidade Federal de São Paulo (UNIFESP)",
      period: "2021 - 2025 (Previsão)",
      location: "Santos, SP",
    },
  ],

  skills: [
    {
      category: "Linguagens de Programação",
      items: ["Python", "MATLAB", "SQL", "JavaScript"],
    },
    {
      category: "Machine Learning & Data Science",
      items: ["scikit-learn", "TensorFlow", "PyTorch", "pandas", "NumPy", "Matplotlib", "Seaborn"],
    },
    {
      category: "Engenharia Química",
      items: ["ASPEN Plus", "HYSYS", "ChemCAD", "Termodinâmica", "Fenômenos de Transporte", "Reatores Químicos"],
    },
    {
      category: "Ferramentas & Tecnologias",
      items: ["Git", "Docker", "Jupyter Notebook", "VS Code", "Linux"],
    },
    {
      category: "Soft Skills",
      items: ["Resolução de Problemas", "Trabalho em Equipe", "Comunicação Técnica", "Pesquisa Científica"],
    },
  ],

  projects: [
    {
      title: "Predição de Propriedades Termodinâmicas com ML",
      description: [
        "Desenvolvimento de modelo de regressão para prever viscosidade de misturas químicas usando Random Forest e redes neurais",
        "Redução de erro de predição em 35% comparado a modelos clássicos",
        "Dataset com 5000+ pontos experimentais processados e analisados em Python",
      ],
    },
    {
      title: "Simulação de Reator Químico em Python",
      description: [
        "Implementação de modelo cinético para reator de polimerização em Python",
        "Validação experimental com erro médio < 5%",
        "Automação de análise de sensibilidade paramétrica",
      ],
    },
    {
      title: "Dashboard de Análise de Processos",
      description: [
        "Desenvolvimento de aplicação web para visualização de dados de processo químico usando Python (Streamlit)",
        "Interface interativa para análise de tendências e detecção de anomalias",
        "Integração com banco de dados SQL para histórico de dados",
      ],
    },
  ],

  languages: [
    { language: "Português", proficiency: "Nativo" },
    { language: "Inglês", proficiency: "Avançado (Leitura/Escrita: Fluente, Conversação: Intermediário)" },
    { language: "Espanhol", proficiency: "Intermediário" },
  ],

  certifications: [
    "Python para Data Science - Coursera (2023)",
    "Machine Learning Specialization - Stanford Online (2024)",
    "Segurança em Processos Químicos - UNIFESP (2023)",
  ],
}

/**
 * English CV Template
 * Base template for international English resumes
 */
export const CV_TEMPLATE_EN: CVTemplate = {
  language: "en",

  header: {
    name: "Igor Fernandes",
    title: "Chemical Engineer | Machine Learning & Chemical Process Researcher",
    email: "igor.fernandes@example.com",
    phone: "+55 (13) 99999-9999",
    location: "Santos, São Paulo, Brazil",
    links: [
      { label: "LinkedIn", url: "https://linkedin.com/in/igorfernandes" },
      { label: "GitHub", url: "https://github.com/igorfernandes" },
      { label: "Research Profile", url: "http://lattes.cnpq.br/1234567890" },
    ],
  },

  summary:
    "Chemical Engineer with strong foundation in industrial processes and growing specialization in Machine Learning applied to engineering. Research experience focused on process simulation, data analysis, and chemical systems optimization. Proficient in Python, predictive modeling, and process automation. Seeking opportunities to apply technical knowledge in innovative projects that integrate chemical engineering and data science.",

  experience: [
    {
      title: "Undergraduate Research Assistant",
      company: "Federal University of São Paulo (UNIFESP)",
      period: "Mar 2023 - Present",
      location: "Santos, SP, Brazil",
      description: [
        "Developed Machine Learning models for predicting thermodynamic properties of chemical systems",
        "Analyzed large experimental datasets using Python (pandas, scikit-learn, TensorFlow)",
        "Performed chemical process simulations in Python with experimental validation",
        "Authored scientific papers and presented results at conferences",
      ],
    },
  ],

  education: [
    {
      degree: "Bachelor of Science in Chemical Engineering",
      institution: "Federal University of São Paulo (UNIFESP)",
      period: "2021 - 2025 (Expected)",
      location: "Santos, SP, Brazil",
    },
  ],

  skills: [
    {
      category: "Programming Languages",
      items: ["Python", "MATLAB", "SQL", "JavaScript"],
    },
    {
      category: "Machine Learning & Data Science",
      items: ["scikit-learn", "TensorFlow", "PyTorch", "pandas", "NumPy", "Matplotlib", "Seaborn"],
    },
    {
      category: "Chemical Engineering",
      items: ["ASPEN Plus", "HYSYS", "ChemCAD", "Thermodynamics", "Transport Phenomena", "Chemical Reactors"],
    },
    {
      category: "Tools & Technologies",
      items: ["Git", "Docker", "Jupyter Notebook", "VS Code", "Linux"],
    },
    {
      category: "Soft Skills",
      items: ["Problem Solving", "Teamwork", "Technical Communication", "Scientific Research"],
    },
  ],

  projects: [
    {
      title: "Thermodynamic Property Prediction with ML",
      description: [
        "Developed regression model to predict viscosity of chemical mixtures using Random Forest and neural networks",
        "Achieved 35% reduction in prediction error compared to classical models",
        "Processed and analyzed dataset with 5000+ experimental data points in Python",
      ],
    },
    {
      title: "Chemical Reactor Simulation in Python",
      description: [
        "Implemented kinetic model for polymerization reactor in Python",
        "Experimental validation with average error < 5%",
        "Automated parametric sensitivity analysis",
      ],
    },
    {
      title: "Process Analysis Dashboard",
      description: [
        "Built web application for chemical process data visualization using Python (Streamlit)",
        "Interactive interface for trend analysis and anomaly detection",
        "SQL database integration for historical data tracking",
      ],
    },
  ],

  languages: [
    { language: "Portuguese", proficiency: "Native" },
    { language: "English", proficiency: "Advanced (Reading/Writing: Fluent, Speaking: Intermediate)" },
    { language: "Spanish", proficiency: "Intermediate" },
  ],

  certifications: [
    "Python for Data Science - Coursera (2023)",
    "Machine Learning Specialization - Stanford Online (2024)",
    "Chemical Process Safety - UNIFESP (2023)",
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
