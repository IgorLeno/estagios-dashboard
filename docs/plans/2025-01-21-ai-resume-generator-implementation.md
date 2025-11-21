# AI Resume Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build AI-powered resume personalization that tailors CV content to job descriptions using Gemini 2.5 Flash and exports professional PDFs via Puppeteer.

**Architecture:** LLM personalizes 3 CV sections (Summary, Skills, Projects) in parallel, merges into HTML template matching original CV design, renders to PDF with Puppeteer. Integrates with existing AI job parser infrastructure.

**Tech Stack:** Gemini 2.5 Flash, Puppeteer, Zod validation, TypeScript, Next.js API routes, React components with Radix UI

---

## Prerequisites

**Environment:**
- Working directory: `.worktrees/ai-resume-generator`
- Branch: `feature/ai-resume-generator`
- Dependencies: `@google/generative-ai`, `zod` (existing), `puppeteer` (to install)

**Context Documents:**
- Design: `docs/plans/2025-01-21-tailored-resume-generator-design.md`
- Existing AI: `lib/ai/job-parser.ts`, `lib/ai/types.ts`, `lib/ai/config.ts`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Puppeteer**

```bash
cd /home/igor/Projetos/estagios-dash/estagios-dashboard/.worktrees/ai-resume-generator
pnpm add puppeteer
```

Expected output: `+ puppeteer 21.x.x`

**Step 2: Install Puppeteer types**

```bash
pnpm add -D @types/puppeteer
```

Expected output: `+ @types/puppeteer 7.x.x`

**Step 3: Verify installation**

```bash
pnpm list puppeteer
```

Expected: Shows puppeteer version

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add puppeteer for PDF generation"
```

---

## Task 2: Create CV Template Types

**Files:**
- Modify: `lib/ai/types.ts` (add to end of file)

**Step 1: Add CV template interface**

Add to `lib/ai/types.ts` after existing types:

```typescript
/**
 * CV Template Structure
 * Represents full CV content with personalizable sections
 */
export interface CVTemplate {
  language: "pt" | "en"

  // Static sections (never modified by LLM)
  header: {
    name: string
    title: string
    email: string
    phone: string
    location: string
    links: Array<{ label: string; url: string }>
  }

  experience: Array<{
    title: string
    company: string
    period: string
    location: string
    description: string[]
  }>

  education: Array<{
    degree: string
    institution: string
    period: string
    location: string
  }>

  languages: Array<{
    language: string
    proficiency: string
  }>

  certifications: string[]

  // Personalizable sections (LLM-modified)
  summary: string

  skills: Array<{
    category: string
    items: string[]
  }>

  projects: Array<{
    title: string
    description: string[]
  }>
}

/**
 * Personalized CV sections returned by LLM
 */
export interface PersonalizedSections {
  summary: string
  skills: Array<{
    category: string
    items: string[]
  }>
  projects: Array<{
    title: string
    description: string[]
  }>
}

/**
 * Schema for validating personalized sections from LLM
 */
export const PersonalizedSectionsSchema = z.object({
  summary: z.string().min(50, "Summary too short").max(500, "Summary too long"),
  skills: z.array(
    z.object({
      category: z.string().min(1),
      items: z.array(z.string().min(1)),
    })
  ),
  projects: z.array(
    z.object({
      title: z.string().min(1),
      description: z.array(z.string().min(1)),
    })
  ),
})

/**
 * Request schema for resume generation API
 */
export const GenerateResumeRequestSchema = z.object({
  vagaId: z.string().uuid().optional(),
  jobDescription: z.string().min(50).max(50000).optional(),
  language: z.enum(["pt", "en"]),
}).refine(
  (data) => data.vagaId || data.jobDescription,
  "Either vagaId or jobDescription must be provided"
)

export type GenerateResumeRequest = z.infer<typeof GenerateResumeRequestSchema>

/**
 * Response schema for resume generation API (success)
 */
export const GenerateResumeResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    pdfBase64: z.string(),
    filename: z.string(),
    atsScore: z.number().min(0).max(100).optional(),
  }),
  metadata: z.object({
    duration: z.number(),
    model: z.string(),
    tokenUsage: z.object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      totalTokens: z.number(),
    }),
    personalizedSections: z.array(z.string()),
  }),
})

export type GenerateResumeResponse = z.infer<typeof GenerateResumeResponseSchema>

/**
 * Response schema for resume generation API (error)
 */
export const GenerateResumeErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
})

export type GenerateResumeErrorResponse = z.infer<typeof GenerateResumeErrorResponseSchema>
```

**Step 2: Commit**

```bash
git add lib/ai/types.ts
git commit -m "types: add CV template and resume generation types"
```

---

## Task 3: Create CV Templates (PT)

**Files:**
- Create: `lib/ai/cv-templates.ts`

**Step 1: Create file with Portuguese CV template**

Create `lib/ai/cv-templates.ts`:

```typescript
import type { CVTemplate } from "./types"

/**
 * Portuguese CV Template
 * Based on cv-igor-fernandes-modelo-pt.docx
 */
export const CV_TEMPLATE_PT: CVTemplate = {
  language: "pt",

  header: {
    name: "Igor Fernandes",
    title: "Engenheiro Químico",
    email: "igorfernandes.dev@gmail.com",
    phone: "+55 (13) 99999-9999",
    location: "Santos, SP - Brasil",
    links: [
      { label: "LinkedIn", url: "linkedin.com/in/igor-fernandes" },
      { label: "GitHub", url: "github.com/igorfernandes" },
      { label: "Portfolio", url: "igorfernandes.dev" },
    ],
  },

  summary:
    "Engenheiro Químico com experiência em processos industriais, análise de dados e desenvolvimento de soluções tecnológicas. Forte conhecimento em Python, otimização de processos e análise estatística. Busco oportunidades para aplicar habilidades técnicas em projetos desafiadores.",

  experience: [
    {
      title: "Engenheiro de Processos",
      company: "Empresa Exemplo",
      period: "Jan 2023 - Dez 2024",
      location: "Santos, SP",
      description: [
        "Otimização de processos químicos resultando em redução de 15% nos custos operacionais",
        "Desenvolvimento de dashboards em Python para monitoramento de KPIs de produção",
        "Análise estatística de dados de processo usando pandas e matplotlib",
      ],
    },
    {
      title: "Estagiário de Engenharia",
      company: "Outra Empresa",
      period: "Jun 2021 - Dez 2022",
      location: "Guarujá, SP",
      description: [
        "Suporte em projetos de melhoria contínua e controle de qualidade",
        "Coleta e análise de dados de processo",
        "Elaboração de relatórios técnicos",
      ],
    },
  ],

  education: [
    {
      degree: "Bacharelado em Engenharia Química",
      institution: "Universidade Federal de São Paulo (UNIFESP)",
      period: "2018 - 2023",
      location: "Santos, SP",
    },
  ],

  skills: [
    {
      category: "Linguagens de Programação",
      items: ["Python", "JavaScript", "SQL"],
    },
    {
      category: "Frameworks e Bibliotecas",
      items: ["Pandas", "NumPy", "Matplotlib", "React", "Next.js"],
    },
    {
      category: "Ferramentas",
      items: ["Git", "Docker", "Excel", "Power BI"],
    },
    {
      category: "Competências Técnicas",
      items: ["Análise de Dados", "Otimização de Processos", "Controle de Qualidade", "Estatística"],
    },
  ],

  projects: [
    {
      title: "Sistema de Análise de KPIs Industriais",
      description: [
        "Desenvolvimento de dashboard interativo para monitoramento de indicadores de processo",
        "Implementação de algoritmos de detecção de anomalias em dados de sensores",
        "Redução de 30% no tempo de identificação de problemas operacionais",
      ],
    },
    {
      title: "Otimização de Processo de Destilação",
      description: [
        "Modelagem matemática de coluna de destilação usando Python",
        "Análise de sensibilidade de parâmetros operacionais",
        "Proposta de melhorias resultando em 12% de aumento de eficiência energética",
      ],
    },
    {
      title: "Dashboard de Monitoramento de Estágios",
      description: [
        "Aplicação web para gerenciar candidaturas de estágio usando Next.js e TypeScript",
        "Integração com Supabase para armazenamento de dados",
        "Sistema de parsing de vagas com IA usando Gemini",
      ],
    },
  ],

  languages: [
    {
      language: "Português",
      proficiency: "Nativo",
    },
    {
      language: "Inglês",
      proficiency: "Avançado (TOEFL iBT 95)",
    },
    {
      language: "Espanhol",
      proficiency: "Intermediário",
    },
  ],

  certifications: [
    "Certificação em Python para Data Science - DataCamp (2023)",
    "Lean Six Sigma Yellow Belt - IASSC (2022)",
    "Git e GitHub Essentials - Udemy (2021)",
  ],
}

/**
 * English CV Template
 * Based on cv-igor-fernandes-modelo-en.docx
 */
export const CV_TEMPLATE_EN: CVTemplate = {
  language: "en",

  header: {
    name: "Igor Fernandes",
    title: "Chemical Engineer",
    email: "igorfernandes.dev@gmail.com",
    phone: "+55 (13) 99999-9999",
    location: "Santos, SP - Brazil",
    links: [
      { label: "LinkedIn", url: "linkedin.com/in/igor-fernandes" },
      { label: "GitHub", url: "github.com/igorfernandes" },
      { label: "Portfolio", url: "igorfernandes.dev" },
    ],
  },

  summary:
    "Chemical Engineer with experience in industrial processes, data analysis, and technology solutions development. Strong knowledge in Python, process optimization, and statistical analysis. Seeking opportunities to apply technical skills in challenging projects.",

  experience: [
    {
      title: "Process Engineer",
      company: "Example Company",
      period: "Jan 2023 - Dec 2024",
      location: "Santos, SP",
      description: [
        "Chemical process optimization resulting in 15% reduction in operational costs",
        "Development of Python dashboards for production KPI monitoring",
        "Statistical analysis of process data using pandas and matplotlib",
      ],
    },
    {
      title: "Engineering Intern",
      company: "Another Company",
      period: "Jun 2021 - Dec 2022",
      location: "Guarujá, SP",
      description: [
        "Support in continuous improvement and quality control projects",
        "Process data collection and analysis",
        "Technical report preparation",
      ],
    },
  ],

  education: [
    {
      degree: "Bachelor's Degree in Chemical Engineering",
      institution: "Federal University of São Paulo (UNIFESP)",
      period: "2018 - 2023",
      location: "Santos, SP",
    },
  ],

  skills: [
    {
      category: "Programming Languages",
      items: ["Python", "JavaScript", "SQL"],
    },
    {
      category: "Frameworks & Libraries",
      items: ["Pandas", "NumPy", "Matplotlib", "React", "Next.js"],
    },
    {
      category: "Tools",
      items: ["Git", "Docker", "Excel", "Power BI"],
    },
    {
      category: "Technical Skills",
      items: ["Data Analysis", "Process Optimization", "Quality Control", "Statistics"],
    },
  ],

  projects: [
    {
      title: "Industrial KPI Analysis System",
      description: [
        "Interactive dashboard development for process indicator monitoring",
        "Implementation of anomaly detection algorithms in sensor data",
        "30% reduction in operational problem identification time",
      ],
    },
    {
      title: "Distillation Process Optimization",
      description: [
        "Mathematical modeling of distillation column using Python",
        "Sensitivity analysis of operational parameters",
        "Improvement proposals resulting in 12% energy efficiency increase",
      ],
    },
    {
      title: "Internship Monitoring Dashboard",
      description: [
        "Web application for managing internship applications using Next.js and TypeScript",
        "Supabase integration for data storage",
        "AI-powered job parsing system using Gemini",
      ],
    },
  ],

  languages: [
    {
      language: "Portuguese",
      proficiency: "Native",
    },
    {
      language: "English",
      proficiency: "Advanced (TOEFL iBT 95)",
    },
    {
      language: "Spanish",
      proficiency: "Intermediate",
    },
  ],

  certifications: [
    "Python for Data Science Certification - DataCamp (2023)",
    "Lean Six Sigma Yellow Belt - IASSC (2022)",
    "Git and GitHub Essentials - Udemy (2021)",
  ],
}

/**
 * Get CV template by language
 */
export function getCVTemplate(language: "pt" | "en"): CVTemplate {
  return language === "pt" ? CV_TEMPLATE_PT : CV_TEMPLATE_EN
}
```

**Step 2: Commit**

```bash
git add lib/ai/cv-templates.ts
git commit -m "feat: add PT and EN CV templates"
```

---

## Task 4: Create Resume Prompts

**Files:**
- Create: `lib/ai/resume-prompts.ts`

**Step 1: Create prompt templates file**

Create `lib/ai/resume-prompts.ts`:

```typescript
import type { JobDetails } from "./types"
import type { CVTemplate } from "./types"

/**
 * System instruction for resume personalization
 */
export const RESUME_SYSTEM_PROMPT = `You are a professional resume writer specializing in ATS (Applicant Tracking System) optimization.

Your role is to personalize resume sections to match job requirements while maintaining complete honesty and accuracy.

CRITICAL RULES:
1. NEVER fabricate skills, experience, or achievements
2. ONLY add skills if the candidate's projects/experience genuinely demonstrate them
3. Reorder and emphasize existing content, don't invent new content
4. Use job keywords naturally - no keyword stuffing
5. Maintain professional, concise language
6. Return ONLY valid JSON, no markdown code fences

Your output will be validated against strict schemas. Follow the format exactly.`

/**
 * Build prompt for personalizing professional summary
 */
export function buildSummaryPrompt(jobDetails: JobDetails, originalSummary: string, userSkills: string[]): string {
  const topKeywords = extractTopKeywords(jobDetails, 7)

  return `Rewrite the professional summary to target this job opportunity.

JOB DETAILS:
Company: ${jobDetails.empresa}
Position: ${jobDetails.cargo}
Required Skills: ${jobDetails.requisitos_obrigatorios.join(", ")}
Desired Skills: ${jobDetails.requisitos_desejaveis.join(", ")}
Responsibilities: ${jobDetails.responsabilidades.slice(0, 5).join("; ")}

ORIGINAL SUMMARY:
${originalSummary}

USER'S SKILLS:
${userSkills.join(", ")}

TOP KEYWORDS TO INCLUDE:
${topKeywords.join(", ")}

INSTRUCTIONS:
- Write 3-4 sentences (80-120 words)
- Include top keywords naturally (at least 5 of them)
- Emphasize experience matching job requirements
- Keep professional, confident tone
- Quantify achievements where possible
- Stay truthful - only mention what's in the original summary or user skills

Return JSON format:
{
  "summary": "Your rewritten summary here..."
}`
}

/**
 * Build prompt for personalizing skills section
 */
export function buildSkillsPrompt(
  jobDetails: JobDetails,
  currentSkills: Array<{ category: string; items: string[] }>,
  projects: Array<{ title: string; description: string[] }>
): string {
  const jobSkills = [...jobDetails.requisitos_obrigatorios, ...jobDetails.requisitos_desejaveis]

  return `Reorder and enhance the skills list to match this job opportunity.

JOB REQUIRED SKILLS:
${jobDetails.requisitos_obrigatorios.join(", ")}

JOB DESIRED SKILLS:
${jobDetails.requisitos_desejaveis.join(", ")}

USER'S CURRENT SKILLS:
${JSON.stringify(currentSkills, null, 2)}

USER'S PROJECTS (as evidence):
${projects.map((p) => `- ${p.title}: ${p.description.join("; ")}`).join("\n")}

INSTRUCTIONS:
- Reorder skills within each category by relevance to job
- Add job-required skills ONLY if projects demonstrate them
- Use project descriptions as evidence for skill claims
- Keep all original skills (don't remove any)
- Maintain category structure (Programming Languages, Frameworks, Tools, etc.)
- If adding a skill, ensure there's clear evidence in projects

Return JSON format:
{
  "skills": [
    {
      "category": "Programming Languages",
      "items": ["Python", "JavaScript", ...]
    },
    ...
  ]
}`
}

/**
 * Build prompt for personalizing projects section
 */
export function buildProjectsPrompt(
  jobDetails: JobDetails,
  currentProjects: Array<{ title: string; description: string[] }>
): string {
  const jobKeywords = extractTopKeywords(jobDetails, 10)

  return `Rewrite project descriptions to emphasize relevance to this job opportunity.

JOB DETAILS:
Position: ${jobDetails.cargo}
Responsibilities: ${jobDetails.responsabilidades.slice(0, 5).join("; ")}
Required Skills: ${jobDetails.requisitos_obrigatorios.join(", ")}

CURRENT PROJECTS:
${JSON.stringify(currentProjects, null, 2)}

JOB KEYWORDS TO EMPHASIZE:
${jobKeywords.join(", ")}

INSTRUCTIONS:
- Keep ALL projects (don't remove any)
- Keep project titles unchanged
- Rewrite descriptions (2-3 bullet points each) to highlight job-relevant aspects
- Use job keywords naturally in descriptions
- Emphasize technologies/methodologies matching job requirements
- Focus on outcomes and impact
- Stay truthful - only reframe existing work, don't invent new projects

Return JSON format:
{
  "projects": [
    {
      "title": "Original Project Title",
      "description": [
        "Rewritten bullet point 1",
        "Rewritten bullet point 2",
        "Rewritten bullet point 3"
      ]
    },
    ...
  ]
}`
}

/**
 * Extract top keywords from job details
 */
function extractTopKeywords(jobDetails: JobDetails, limit: number): string[] {
  const keywords = new Set<string>()

  // Add from cargo (job title)
  jobDetails.cargo.split(/[\s,]+/).forEach((word) => {
    if (word.length > 3) keywords.add(word)
  })

  // Add from requisitos
  jobDetails.requisitos_obrigatorios.forEach((req) => {
    req.split(/[\s,]+/).forEach((word) => {
      if (word.length > 3) keywords.add(word)
    })
  })

  // Add from responsabilidades
  jobDetails.responsabilidades.slice(0, 3).forEach((resp) => {
    resp.split(/[\s,]+/).forEach((word) => {
      if (word.length > 3) keywords.add(word)
    })
  })

  return Array.from(keywords).slice(0, limit)
}
```

**Step 2: Commit**

```bash
git add lib/ai/resume-prompts.ts
git commit -m "feat: add LLM prompts for resume personalization"
```

---

## Task 5: Create HTML/CSS Template

**Files:**
- Create: `lib/ai/resume-html-template.ts`

**Step 1: Create HTML template generator**

Create `lib/ai/resume-html-template.ts`:

```typescript
import type { CVTemplate } from "./types"

/**
 * Generate HTML content from CV template
 * Matches styling from saipem-cv-igor_fernandes.pdf
 */
export function generateResumeHTML(cv: CVTemplate): string {
  return `<!DOCTYPE html>
<html lang="${cv.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cv.header.name} - CV</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #333;
      background: white;
    }

    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }

    .header h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 5px;
      color: #000;
    }

    .header .title {
      font-size: 14pt;
      color: #555;
      margin-bottom: 10px;
    }

    .header .contact {
      font-size: 10pt;
      color: #666;
      margin-bottom: 5px;
    }

    .header .links {
      font-size: 10pt;
      color: #0066cc;
    }

    .header .links a {
      color: #0066cc;
      text-decoration: none;
      margin: 0 8px;
    }

    /* Section */
    .section {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ccc;
    }

    /* Summary */
    .summary {
      text-align: justify;
      margin-bottom: 12px;
    }

    /* Experience */
    .experience-item {
      margin-bottom: 12px;
    }

    .experience-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .experience-title {
      font-weight: bold;
      font-size: 11pt;
    }

    .experience-company {
      font-size: 11pt;
      color: #555;
    }

    .experience-period {
      font-size: 10pt;
      color: #777;
      font-style: italic;
    }

    .experience-location {
      font-size: 10pt;
      color: #777;
    }

    .experience-description {
      margin-left: 15px;
      margin-top: 4px;
    }

    .experience-description li {
      margin-bottom: 3px;
    }

    /* Education */
    .education-item {
      margin-bottom: 8px;
    }

    .education-degree {
      font-weight: bold;
    }

    .education-institution {
      color: #555;
    }

    .education-period {
      font-size: 10pt;
      color: #777;
      font-style: italic;
    }

    /* Skills */
    .skills-category {
      margin-bottom: 8px;
    }

    .skills-category-name {
      font-weight: bold;
      margin-bottom: 2px;
    }

    .skills-items {
      margin-left: 15px;
    }

    /* Projects */
    .project-item {
      margin-bottom: 10px;
    }

    .project-title {
      font-weight: bold;
      margin-bottom: 3px;
    }

    .project-description {
      margin-left: 15px;
    }

    .project-description li {
      margin-bottom: 2px;
    }

    /* Languages & Certifications */
    .language-item,
    .certification-item {
      margin-bottom: 4px;
      margin-left: 15px;
    }

    /* Print optimization */
    @media print {
      body {
        width: 210mm;
        height: 297mm;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${cv.header.name}</h1>
      <div class="title">${cv.header.title}</div>
      <div class="contact">
        ${cv.header.email} | ${cv.header.phone} | ${cv.header.location}
      </div>
      <div class="links">
        ${cv.header.links.map((link) => `<a href="${link.url}">${link.label}</a>`).join(" | ")}
      </div>
    </div>

    <!-- Professional Summary -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Resumo Profissional" : "Professional Summary"}</h2>
      <p class="summary">${cv.summary}</p>
    </div>

    <!-- Experience -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Experiência Profissional" : "Professional Experience"}</h2>
      ${cv.experience
        .map(
          (exp) => `
        <div class="experience-item">
          <div class="experience-header">
            <div>
              <div class="experience-title">${exp.title}</div>
              <div class="experience-company">${exp.company}</div>
            </div>
            <div style="text-align: right;">
              <div class="experience-period">${exp.period}</div>
              <div class="experience-location">${exp.location}</div>
            </div>
          </div>
          <ul class="experience-description">
            ${exp.description.map((item) => `<li>${item}</li>`).join("\n")}
          </ul>
        </div>
      `
        )
        .join("\n")}
    </div>

    <!-- Education -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Formação Acadêmica" : "Education"}</h2>
      ${cv.education
        .map(
          (edu) => `
        <div class="education-item">
          <div class="education-degree">${edu.degree}</div>
          <div class="education-institution">${edu.institution}</div>
          <div class="education-period">${edu.period} | ${edu.location}</div>
        </div>
      `
        )
        .join("\n")}
    </div>

    <!-- Skills & Tools -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Habilidades e Ferramentas" : "Skills & Tools"}</h2>
      ${cv.skills
        .map(
          (skillGroup) => `
        <div class="skills-category">
          <div class="skills-category-name">${skillGroup.category}:</div>
          <div class="skills-items">${skillGroup.items.join(", ")}</div>
        </div>
      `
        )
        .join("\n")}
    </div>

    <!-- Research Projects -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Projetos de Pesquisa" : "Research Projects"}</h2>
      ${cv.projects
        .map(
          (project) => `
        <div class="project-item">
          <div class="project-title">${project.title}</div>
          <ul class="project-description">
            ${project.description.map((item) => `<li>${item}</li>`).join("\n")}
          </ul>
        </div>
      `
        )
        .join("\n")}
    </div>

    <!-- Languages -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Idiomas" : "Languages"}</h2>
      ${cv.languages.map((lang) => `<div class="language-item">${lang.language}: ${lang.proficiency}</div>`).join("\n")}
    </div>

    <!-- Certifications -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Certificações" : "Certifications"}</h2>
      ${cv.certifications.map((cert) => `<div class="certification-item">• ${cert}</div>`).join("\n")}
    </div>
  </div>
</body>
</html>`
}
```

**Step 2: Commit**

```bash
git add lib/ai/resume-html-template.ts
git commit -m "feat: add HTML/CSS template for resume PDF generation"
```

---

## Task 6: Create Resume Generator Core Logic

**Files:**
- Create: `lib/ai/resume-generator.ts`

**Step 1: Write the resume generator logic**

Create `lib/ai/resume-generator.ts`:

```typescript
import { createGeminiClient, GEMINI_CONFIG } from "./config"
import {
  buildSummaryPrompt,
  buildSkillsPrompt,
  buildProjectsPrompt,
  RESUME_SYSTEM_PROMPT,
} from "./resume-prompts"
import { getCVTemplate } from "./cv-templates"
import { PersonalizedSectionsSchema } from "./types"
import { extractJsonFromResponse } from "./job-parser"
import type { JobDetails, CVTemplate, PersonalizedSections } from "./types"

/**
 * Personalize CV summary section using LLM
 */
async function personalizeSummary(
  jobDetails: JobDetails,
  cv: CVTemplate,
  model: any
): Promise<{ summary: string; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const allSkills = cv.skills.flatMap((group) => group.items)
  const prompt = buildSummaryPrompt(jobDetails, cv.summary, allSkills)

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const jsonData = extractJsonFromResponse(text)
  const validated = PersonalizedSectionsSchema.pick({ summary: true }).parse(jsonData)

  const duration = Date.now() - startTime
  const tokenUsage = extractTokenUsage(response)

  return { summary: validated.summary, duration, tokenUsage }
}

/**
 * Personalize CV skills section using LLM
 */
async function personalizeSkills(
  jobDetails: JobDetails,
  cv: CVTemplate,
  model: any
): Promise<{ skills: PersonalizedSections["skills"]; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const prompt = buildSkillsPrompt(jobDetails, cv.skills, cv.projects)

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const jsonData = extractJsonFromResponse(text)
  const validated = PersonalizedSectionsSchema.pick({ skills: true }).parse(jsonData)

  const duration = Date.now() - startTime
  const tokenUsage = extractTokenUsage(response)

  return { skills: validated.skills, duration, tokenUsage }
}

/**
 * Personalize CV projects section using LLM
 */
async function personalizeProjects(
  jobDetails: JobDetails,
  cv: CVTemplate,
  model: any
): Promise<{ projects: PersonalizedSections["projects"]; duration: number; tokenUsage: any }> {
  const startTime = Date.now()

  const prompt = buildProjectsPrompt(jobDetails, cv.projects)

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const jsonData = extractJsonFromResponse(text)
  const validated = PersonalizedSectionsSchema.pick({ projects: true }).parse(jsonData)

  const duration = Date.now() - startTime
  const tokenUsage = extractTokenUsage(response)

  return { projects: validated.projects, duration, tokenUsage }
}

/**
 * Extract token usage from Gemini response
 */
function extractTokenUsage(response: any): {
  inputTokens: number
  outputTokens: number
  totalTokens: number
} {
  try {
    const usageMetadata = response.usageMetadata || response.candidates?.[0]?.usageMetadata || null

    if (usageMetadata) {
      return {
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      }
    }
  } catch (error) {
    console.warn("[Resume Generator] Could not extract token usage:", error)
  }

  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
}

/**
 * Generate tailored resume from job details
 * Personalizes 3 sections in parallel using LLM
 */
export async function generateTailoredResume(
  jobDetails: JobDetails,
  language: "pt" | "en"
): Promise<{
  cv: CVTemplate
  duration: number
  model: string
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  personalizedSections: string[]
}> {
  const startTime = Date.now()

  console.log(`[Resume Generator] Starting personalization (${language})`)

  // Load CV template
  const baseCv = getCVTemplate(language)

  // Create Gemini model
  const genAI = createGeminiClient()
  const model = genAI.getGenerativeModel({
    model: GEMINI_CONFIG.model,
    generationConfig: {
      temperature: 0.3, // Slightly higher for creativity
      maxOutputTokens: 4096,
      topP: GEMINI_CONFIG.topP,
      topK: GEMINI_CONFIG.topK,
    },
    systemInstruction: RESUME_SYSTEM_PROMPT,
  })

  // Personalize 3 sections in parallel
  const [summaryResult, skillsResult, projectsResult] = await Promise.all([
    personalizeSummary(jobDetails, baseCv, model),
    personalizeSkills(jobDetails, baseCv, model),
    personalizeProjects(jobDetails, baseCv, model),
  ])

  // Merge personalized sections into CV
  const personalizedCv: CVTemplate = {
    ...baseCv,
    summary: summaryResult.summary,
    skills: skillsResult.skills,
    projects: projectsResult.projects,
  }

  // Aggregate token usage
  const totalTokenUsage = {
    inputTokens:
      summaryResult.tokenUsage.inputTokens +
      skillsResult.tokenUsage.inputTokens +
      projectsResult.tokenUsage.inputTokens,
    outputTokens:
      summaryResult.tokenUsage.outputTokens +
      skillsResult.tokenUsage.outputTokens +
      projectsResult.tokenUsage.outputTokens,
    totalTokens:
      summaryResult.tokenUsage.totalTokens +
      skillsResult.tokenUsage.totalTokens +
      projectsResult.tokenUsage.totalTokens,
  }

  const duration = Date.now() - startTime

  console.log(`[Resume Generator] ✅ Personalization complete (${duration}ms, ${totalTokenUsage.totalTokens} tokens)`)

  return {
    cv: personalizedCv,
    duration,
    model: GEMINI_CONFIG.model,
    tokenUsage: totalTokenUsage,
    personalizedSections: ["summary", "skills", "projects"],
  }
}
```

**Step 2: Commit**

```bash
git add lib/ai/resume-generator.ts
git commit -m "feat: add resume personalization core logic"
```

---

## Task 7: Create PDF Generation Utility

**Files:**
- Create: `lib/ai/pdf-generator.ts`

**Step 1: Write PDF generation logic**

Create `lib/ai/pdf-generator.ts`:

```typescript
import puppeteer from "puppeteer"
import { generateResumeHTML } from "./resume-html-template"
import type { CVTemplate } from "./types"

/**
 * Generate PDF from CV template using Puppeteer
 */
export async function generateResumePDF(cv: CVTemplate): Promise<Buffer> {
  console.log("[PDF Generator] Launching Puppeteer...")

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Vercel compatibility
    ],
  })

  try {
    const page = await browser.newPage()

    // Generate HTML content
    const htmlContent = generateResumeHTML(cv)

    // Set content and wait for rendering
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
    })

    console.log("[PDF Generator] Rendering PDF...")

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "20mm",
        right: "20mm",
      },
    })

    console.log("[PDF Generator] ✅ PDF generated successfully")

    return pdf
  } finally {
    await browser.close()
  }
}

/**
 * Generate filename for resume PDF
 */
export function generateResumeFilename(empresa: string, language: "pt" | "en"): string {
  // Sanitize empresa name (remove special chars, spaces)
  const sanitized = empresa
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  const langSuffix = language === "pt" ? "pt" : "en"

  return `cv-igor-fernandes-${sanitized}-${langSuffix}.pdf`
}
```

**Step 2: Commit**

```bash
git add lib/ai/pdf-generator.ts
git commit -m "feat: add Puppeteer PDF generation utility"
```

---

## Task 8: Create API Endpoint

**Files:**
- Create: `app/api/ai/generate-resume/route.ts`

**Step 1: Write API route handler**

Create `app/api/ai/generate-resume/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTailoredResume } from "@/lib/ai/resume-generator"
import { generateResumePDF, generateResumeFilename } from "@/lib/ai/pdf-generator"
import {
  GenerateResumeRequestSchema,
  GenerateResumeResponse,
  GenerateResumeErrorResponse,
  JobDetailsSchema,
} from "@/lib/ai/types"
import { parseJobWithGemini } from "@/lib/ai/job-parser"
import { validateAIConfig } from "@/lib/ai/config"

/**
 * POST /api/ai/generate-resume
 * Generate tailored resume from vaga or job description
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Validate AI config
    validateAIConfig()

    // Parse request body
    const body = await req.json()
    const validatedInput = GenerateResumeRequestSchema.parse(body)

    const { vagaId, jobDescription, language } = validatedInput

    console.log(`[Resume API] Request: ${vagaId ? `vaga ${vagaId}` : "job description"}, language: ${language}`)

    // Get job details
    let jobDetails

    if (vagaId) {
      // Fetch from database
      const supabase = await createClient()
      const { data: vaga, error } = await supabase.from("vagas_estagio").select("*").eq("id", vagaId).single()

      if (error || !vaga) {
        const errorResponse: GenerateResumeErrorResponse = {
          success: false,
          error: "Vaga not found",
          details: { vagaId },
        }
        return NextResponse.json(errorResponse, { status: 404 })
      }

      // Map vaga to JobDetails
      jobDetails = JobDetailsSchema.parse({
        empresa: vaga.empresa || "",
        cargo: vaga.cargo || "",
        local: vaga.local || "",
        modalidade: vaga.modalidade || "Presencial",
        tipo_vaga: vaga.tipo_vaga || "Estágio",
        requisitos_obrigatorios: vaga.requisitos_obrigatorios || [],
        requisitos_desejaveis: vaga.requisitos_desejaveis || [],
        responsabilidades: vaga.responsabilidades || [],
        beneficios: vaga.beneficios || [],
        salario: vaga.salario,
        idioma_vaga: vaga.idioma_vaga || "pt",
      })
    } else if (jobDescription) {
      // Parse from description
      const parseResult = await parseJobWithGemini(jobDescription)
      jobDetails = parseResult.data
    } else {
      throw new Error("Either vagaId or jobDescription is required")
    }

    // Generate tailored resume
    const resumeResult = await generateTailoredResume(jobDetails, language)

    // Generate PDF
    const pdfBuffer = await generateResumePDF(resumeResult.cv)

    // Convert to base64
    const pdfBase64 = pdfBuffer.toString("base64")

    // Generate filename
    const filename = generateResumeFilename(jobDetails.empresa, language)

    const totalDuration = Date.now() - startTime

    // Return success response
    const successResponse: GenerateResumeResponse = {
      success: true,
      data: {
        pdfBase64,
        filename,
      },
      metadata: {
        duration: totalDuration,
        model: resumeResult.model,
        tokenUsage: resumeResult.tokenUsage,
        personalizedSections: resumeResult.personalizedSections,
      },
    }

    console.log(`[Resume API] ✅ Success (${totalDuration}ms)`)

    return NextResponse.json(successResponse)
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`[Resume API] ❌ Error (${duration}ms):`, errorMessage)

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      const errorResponse: GenerateResumeErrorResponse = {
        success: false,
        error: "Invalid request data",
        details: error,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Handle timeout
    if (duration > 60000) {
      const errorResponse: GenerateResumeErrorResponse = {
        success: false,
        error: "Resume generation timed out (>60s)",
      }
      return NextResponse.json(errorResponse, { status: 504 })
    }

    // Generic error
    const errorResponse: GenerateResumeErrorResponse = {
      success: false,
      error: errorMessage,
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * GET /api/ai/generate-resume
 * Health check
 */
export async function GET(): Promise<NextResponse> {
  try {
    validateAIConfig()

    return NextResponse.json({
      status: "ok",
      message: "Resume Generator API is running",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return NextResponse.json(
      {
        status: "error",
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add app/api/ai/generate-resume/route.ts
git commit -m "feat: add resume generation API endpoint"
```

---

## Task 9: Test API Endpoint Manually

**Files:**
- None (testing only)

**Step 1: Start dev server**

```bash
pnpm dev
```

Expected: Server running on http://localhost:3000

**Step 2: Test health check**

```bash
curl http://localhost:3000/api/ai/generate-resume
```

Expected output:
```json
{"status":"ok","message":"Resume Generator API is running"}
```

**Step 3: Test with job description (create test file)**

Create `test-resume-api.sh`:

```bash
#!/bin/bash

curl -X POST http://localhost:3000/api/ai/generate-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Estágio em Engenharia Química na Saipem. Requisitos: Engenharia Química, conhecimento em processos industriais, Python, análise de dados. Responsabilidades: Suporte em projetos de QHSE, monitoramento de indicadores, análise de dados.",
    "language": "pt"
  }' | jq '.metadata'
```

Expected: JSON response with `success: true`, `pdfBase64`, and `metadata`

**Step 4: Stop dev server**

Press Ctrl+C

**Step 5: Commit test script**

```bash
git add test-resume-api.sh
git commit -m "test: add manual API test script"
```

---

## Task 10: Create Frontend Button Component

**Files:**
- Create: `components/resume-generator-button.tsx`

**Step 1: Create reusable button component**

Create `components/resume-generator-button.tsx`:

```typescript
"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ResumeGeneratorDialog } from "./resume-generator-dialog"

interface ResumeGeneratorButtonProps {
  vagaId?: string
  jobDescription?: string
  variant?: "default" | "outline" | "ghost"
  className?: string
}

export function ResumeGeneratorButton({
  vagaId,
  jobDescription,
  variant = "default",
  className,
}: ResumeGeneratorButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Disable if neither vagaId nor jobDescription provided
  const isDisabled = !vagaId && !jobDescription

  return (
    <>
      <Button variant={variant} onClick={() => setIsDialogOpen(true)} disabled={isDisabled} className={className}>
        Generate Tailored Resume
      </Button>

      <ResumeGeneratorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        vagaId={vagaId}
        jobDescription={jobDescription}
      />
    </>
  )
}
```

**Step 2: Commit**

```bash
git add components/resume-generator-button.tsx
git commit -m "feat: add resume generator button component"
```

---

## Task 11: Create Frontend Dialog Component

**Files:**
- Create: `components/resume-generator-dialog.tsx`

**Step 1: Create dialog component with language selection**

Create `components/resume-generator-dialog.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, Download, FileText } from "lucide-react"
import { toast } from "sonner"
import type { GenerateResumeResponse, GenerateResumeErrorResponse } from "@/lib/ai/types"

interface ResumeGeneratorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vagaId?: string
  jobDescription?: string
}

type DialogState = "idle" | "loading" | "success" | "error"

export function ResumeGeneratorDialog({ open, onOpenChange, vagaId, jobDescription }: ResumeGeneratorDialogProps) {
  const [language, setLanguage] = useState<"pt" | "en">("pt")
  const [state, setState] = useState<DialogState>("idle")
  const [pdfData, setPdfData] = useState<{ base64: string; filename: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [metadata, setMetadata] = useState<any>(null)

  const handleGenerate = async () => {
    setState("loading")
    setErrorMessage("")
    setPdfData(null)

    try {
      const response = await fetch("/api/ai/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vagaId,
          jobDescription,
          language,
        }),
      })

      const result: GenerateResumeResponse | GenerateResumeErrorResponse = await response.json()

      if (result.success) {
        setPdfData({
          base64: result.data.pdfBase64,
          filename: result.data.filename,
        })
        setMetadata(result.metadata)
        setState("success")
        toast.success("Resume generated successfully!")
      } else {
        setErrorMessage(result.error)
        setState("error")
        toast.error(`Generation failed: ${result.error}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      setErrorMessage(message)
      setState("error")
      toast.error(`Network error: ${message}`)
    }
  }

  const handleDownload = () => {
    if (!pdfData) return

    // Convert base64 to blob
    const byteCharacters = atob(pdfData.base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: "application/pdf" })

    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = pdfData.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`Downloaded: ${pdfData.filename}`)
  }

  const handleReset = () => {
    setState("idle")
    setPdfData(null)
    setErrorMessage("")
    setMetadata(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Tailored Resume</DialogTitle>
          <DialogDescription>
            AI will personalize your CV to match the job requirements. Select language and generate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Language Selection */}
          {state === "idle" && (
            <>
              <div className="space-y-2">
                <Label>Resume Language</Label>
                <RadioGroup value={language} onValueChange={(value) => setLanguage(value as "pt" | "en")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pt" id="lang-pt" />
                    <Label htmlFor="lang-pt" className="font-normal cursor-pointer">
                      Portuguese (PT)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="en" id="lang-en" />
                    <Label htmlFor="lang-en" className="font-normal cursor-pointer">
                      English (EN)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button onClick={handleGenerate} className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Generate Resume
              </Button>
            </>
          )}

          {/* Loading State */}
          {state === "loading" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating tailored resume...</p>
              <p className="text-xs text-muted-foreground">This may take 5-10 seconds</p>
            </div>
          )}

          {/* Success State */}
          {state === "success" && pdfData && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">✅ Resume generated successfully!</p>
                {metadata && (
                  <div className="mt-2 text-xs text-green-700">
                    <p>Duration: {(metadata.duration / 1000).toFixed(1)}s</p>
                    <p>Tokens: {metadata.tokenUsage.totalTokens}</p>
                    <p>Personalized: {metadata.personalizedSections.join(", ")}</p>
                  </div>
                )}
              </div>

              <Button onClick={handleDownload} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>

              <Button onClick={handleReset} variant="outline" className="w-full">
                Generate Another
              </Button>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">❌ Generation failed</p>
                <p className="mt-1 text-xs text-red-700">{errorMessage}</p>
              </div>

              <Button onClick={handleReset} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add components/resume-generator-dialog.tsx
git commit -m "feat: add resume generator dialog with language selection"
```

---

## Task 12: Integrate into Test AI Page

**Files:**
- Modify: `app/test-ai/page.tsx`

**Step 1: Read current test AI page**

```bash
cat app/test-ai/page.tsx | head -50
```

**Step 2: Add ResumeGeneratorButton after successful parse**

Find the section that displays parse results and add the button:

```typescript
// Add import at top
import { ResumeGeneratorButton } from "@/components/resume-generator-button"

// In the JSX, after showing parse results:
{parseResult && (
  <div className="mt-4">
    <ResumeGeneratorButton
      jobDescription={jobDescription}
      className="w-full"
    />
  </div>
)}
```

**Step 3: Commit**

```bash
git add app/test-ai/page.tsx
git commit -m "feat: integrate resume generator into test AI page"
```

---

## Task 13: Write Unit Tests for Resume Generator

**Files:**
- Create: `__tests__/lib/ai/resume-generator.test.ts`

**Step 1: Create test file**

Create `__tests__/lib/ai/resume-generator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateTailoredResume } from "@/lib/ai/resume-generator"
import type { JobDetails } from "@/lib/ai/types"

// Mock dependencies
vi.mock("@/lib/ai/config", () => ({
  createGeminiClient: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(async () => ({
        response: {
          text: () =>
            JSON.stringify({
              summary: "Personalized summary with keywords",
              skills: [{ category: "Programming", items: ["Python", "JavaScript"] }],
              projects: [{ title: "Test Project", description: ["Personalized description"] }],
            }),
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
          },
        },
      })),
    })),
  })),
  GEMINI_CONFIG: {
    model: "gemini-2.5-flash",
    temperature: 0.3,
    maxOutputTokens: 4096,
    topP: 0.95,
    topK: 40,
  },
}))

vi.mock("@/lib/ai/cv-templates", () => ({
  getCVTemplate: vi.fn(() => ({
    language: "pt",
    header: { name: "Test User", title: "Engineer", email: "test@test.com", phone: "", location: "", links: [] },
    summary: "Original summary",
    experience: [],
    education: [],
    skills: [{ category: "Programming", items: ["Python"] }],
    projects: [{ title: "Project 1", description: ["Original description"] }],
    languages: [],
    certifications: [],
  })),
}))

describe("generateTailoredResume", () => {
  const mockJobDetails: JobDetails = {
    empresa: "Test Company",
    cargo: "Software Engineer",
    local: "Remote",
    modalidade: "Remoto",
    tipo_vaga: "Júnior",
    requisitos_obrigatorios: ["Python", "JavaScript"],
    requisitos_desejaveis: ["React"],
    responsabilidades: ["Develop features", "Write tests"],
    beneficios: ["Health insurance"],
    salario: null,
    idioma_vaga: "pt",
  }

  it("should generate tailored resume with personalized sections", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    expect(result.cv).toBeDefined()
    expect(result.cv.summary).toContain("Personalized")
    expect(result.cv.skills).toHaveLength(1)
    expect(result.cv.projects).toHaveLength(1)
    expect(result.personalizedSections).toEqual(["summary", "skills", "projects"])
  })

  it("should return metadata with duration and token usage", async () => {
    const result = await generateTailoredResume(mockJobDetails, "pt")

    expect(result.duration).toBeGreaterThan(0)
    expect(result.model).toBe("gemini-2.5-flash")
    expect(result.tokenUsage.totalTokens).toBeGreaterThan(0)
  })

  it("should support English language", async () => {
    const result = await generateTailoredResume(mockJobDetails, "en")

    expect(result.cv.language).toBe("pt") // Mock returns PT
  })
})
```

**Step 2: Run tests**

```bash
pnpm test -- resume-generator
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add __tests__/lib/ai/resume-generator.test.ts
git commit -m "test: add unit tests for resume generator"
```

---

## Task 14: Write Unit Tests for PDF Generator

**Files:**
- Create: `__tests__/lib/ai/pdf-generator.test.ts`

**Step 1: Create test file**

Create `__tests__/lib/ai/pdf-generator.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { generateResumeFilename } from "@/lib/ai/pdf-generator"

describe("generateResumeFilename", () => {
  it("should generate filename with sanitized company name", () => {
    const filename = generateResumeFilename("Saipem Brasil", "pt")
    expect(filename).toBe("cv-igor-fernandes-saipem-brasil-pt.pdf")
  })

  it("should handle special characters", () => {
    const filename = generateResumeFilename("Company & Co. Ltd.", "en")
    expect(filename).toBe("cv-igor-fernandes-company-co-ltd-en.pdf")
  })

  it("should handle multiple spaces", () => {
    const filename = generateResumeFilename("Big   Company   Name", "pt")
    expect(filename).toBe("cv-igor-fernandes-big-company-name-pt.pdf")
  })

  it("should include language suffix", () => {
    const filenamePt = generateResumeFilename("Test", "pt")
    const filenameEn = generateResumeFilename("Test", "en")

    expect(filenamePt).toContain("-pt.pdf")
    expect(filenameEn).toContain("-en.pdf")
  })
})
```

**Step 2: Run tests**

```bash
pnpm test -- pdf-generator
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add __tests__/lib/ai/pdf-generator.test.ts
git commit -m "test: add unit tests for PDF generator utilities"
```

---

## Task 15: Write Integration Tests for API

**Files:**
- Create: `__tests__/app/api/ai/generate-resume/route.test.ts`

**Step 1: Create API test file**

Create `__tests__/app/api/ai/generate-resume/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST, GET } from "@/app/api/ai/generate-resume/route"
import { NextRequest } from "next/server"

// Mock dependencies
vi.mock("@/lib/ai/resume-generator", () => ({
  generateTailoredResume: vi.fn(async () => ({
    cv: {
      language: "pt",
      header: { name: "Test", title: "", email: "", phone: "", location: "", links: [] },
      summary: "Personalized",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      languages: [],
      certifications: [],
    },
    duration: 5000,
    model: "gemini-2.5-flash",
    tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    personalizedSections: ["summary", "skills", "projects"],
  })),
}))

vi.mock("@/lib/ai/pdf-generator", () => ({
  generateResumePDF: vi.fn(async () => Buffer.from("fake-pdf-content")),
  generateResumeFilename: vi.fn(() => "cv-test.pdf"),
}))

vi.mock("@/lib/ai/config", () => ({
  validateAIConfig: vi.fn(() => true),
}))

describe("POST /api/ai/generate-resume", () => {
  it("should return 400 for invalid request (missing both vagaId and jobDescription)", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ language: "pt" }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it("should return 200 for valid job description request", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({
        jobDescription: "Test job description with more than 50 characters to pass validation",
        language: "pt",
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.pdfBase64).toBeDefined()
    expect(data.metadata.personalizedSections).toEqual(["summary", "skills", "projects"])
  })
})

describe("GET /api/ai/generate-resume", () => {
  it("should return health check status", async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe("ok")
    expect(data.message).toContain("Resume Generator")
  })
})
```

**Step 2: Run tests**

```bash
pnpm test -- generate-resume/route
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add __tests__/app/api/ai/generate-resume/route.test.ts
git commit -m "test: add integration tests for resume API endpoint"
```

---

## Task 16: Update Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add resume generator section to CLAUDE.md**

Add after the "AI Job Parser" section:

```markdown
## AI Resume Generator

**Status:** ✅ Implemented
**Design Document:** `docs/plans/2025-01-21-tailored-resume-generator-design.md`
**Implementation Plan:** `docs/plans/2025-01-21-ai-resume-generator-implementation.md`

### Overview

The AI Resume Generator personalizes CV content to match job descriptions using Gemini 2.5 Flash. It tailors three sections—Professional Summary, Skills & Tools, and Research Projects—while maintaining exact formatting from CV templates.

**What it does:**

- Personalizes CV summary with job keywords
- Reorders skills by relevance to job requirements
- Rewrites project descriptions to emphasize job-relevant work
- Generates professional PDF matching original CV design
- Supports Portuguese and English

**What it doesn't do:**

- Fabricate skills or experience (moderate smart enhancement only)
- Store resumes in database (future phase)
- Calculate ATS scores (future phase)

### Architecture

**Components:**

1. **CV Templates** (`lib/ai/cv-templates.ts`) - PT/EN CV content as TypeScript objects
2. **Resume Generator** (`lib/ai/resume-generator.ts`) - LLM personalization logic
3. **Resume Prompts** (`lib/ai/resume-prompts.ts`) - LLM prompt templates
4. **PDF Generator** (`lib/ai/pdf-generator.ts`) - Puppeteer PDF rendering
5. **HTML Template** (`lib/ai/resume-html-template.ts`) - HTML/CSS matching CV design
6. **API Endpoint** (`app/api/ai/generate-resume/route.ts`) - REST API
7. **Frontend Components** - `ResumeGeneratorButton`, `ResumeGeneratorDialog`

### API Endpoints

#### POST /api/ai/generate-resume

Generate tailored resume from vaga or job description.

**Request:**

\`\`\`typescript
{
  vagaId?: string           // Option 1: From existing vaga
  jobDescription?: string   // Option 2: From raw text
  language: "pt" | "en"     // Required
}
\`\`\`

**Response (success):**

\`\`\`typescript
{
  success: true,
  data: {
    pdfBase64: string,        // Base64-encoded PDF
    filename: string,         // e.g., "cv-igor-fernandes-saipem-pt.pdf"
  },
  metadata: {
    duration: number,         // milliseconds
    model: string,            // "gemini-2.5-flash"
    tokenUsage: { ... },
    personalizedSections: ["summary", "skills", "projects"]
  }
}
\`\`\`

#### GET /api/ai/generate-resume

Health check endpoint.

### Usage Patterns

#### Client-side (React component)

\`\`\`typescript
import { ResumeGeneratorButton } from "@/components/resume-generator-button"

// In component
<ResumeGeneratorButton vagaId={vaga.id} />
// or
<ResumeGeneratorButton jobDescription={description} />
\`\`\`

#### API call (fetch)

\`\`\`typescript
const response = await fetch("/api/ai/generate-resume", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    vagaId: "uuid-here",
    language: "pt",
  }),
})

const result = await response.json()
if (result.success) {
  // Download PDF from result.data.pdfBase64
}
\`\`\`

### Configuration

**Model:** `gemini-2.5-flash` (same as job parser)
**Temperature:** `0.3` (slightly higher for creativity)
**Timeout:** 60 seconds
**Token Limit:** 4096 per section

### Personalization Strategy

**Moderate Smart Enhancement:**

- Summary: Include top 5-7 job keywords, 80-120 words
- Skills: Reorder by relevance, add ONLY if projects demonstrate them
- Projects: Rewrite descriptions to emphasize job-relevant aspects
- **No fabrication:** All claims must be backed by existing CV content

### Integration Points

1. **Test AI Page** (`app/test-ai/page.tsx`) - Generate after parsing job
2. **Vaga Details Page** (future) - Generate for any existing vaga

### Testing

**Unit Tests:**

- `__tests__/lib/ai/resume-generator.test.ts` - Core logic
- `__tests__/lib/ai/pdf-generator.test.ts` - PDF utilities
- `__tests__/app/api/ai/generate-resume/route.test.ts` - API endpoint

**Manual Testing:**

\`\`\`bash
# Start dev server
pnpm dev

# Test health check
curl http://localhost:3000/api/ai/generate-resume

# Test generation (see test-resume-api.sh)
./test-resume-api.sh
\`\`\`

### Troubleshooting

**Puppeteer errors on Vercel:**

- Ensure `--no-sandbox` and `--disable-setuid-sandbox` args are set
- Check Vercel function timeout (60s limit)

**PDF not matching CV design:**

- Verify HTML template matches `saipem-cv-igor_fernandes.pdf`
- Check inline CSS styles
- Test with `page.pdf({ printBackground: true })`

**LLM fabricating skills:**

- Review prompts in `resume-prompts.ts`
- Ensure "ONLY if projects demonstrate" constraint is clear
- Lower temperature if needed

### Future Enhancements

**Phase 2: ATS Scoring**

- Calculate keyword match percentage
- Highlight missing keywords
- Suggest improvements

**Phase 3: Resume Storage**

- Save generated PDFs to Supabase Storage
- Link to `vagas_estagio` table
- Version history

**Phase 4: Custom Templates**

- Allow users to upload custom CV templates
- Template editor UI
- Multi-template support
\`\`\`

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add AI Resume Generator section to CLAUDE.md"
```

---

## Task 17: Run Full Test Suite

**Files:**
- None (testing only)

**Step 1: Run all tests**

```bash
pnpm test -- --run
```

Expected: New tests pass, baseline failures remain

**Step 2: Check for new failures**

If new failures appear, investigate and fix them.

**Step 3: Run build**

```bash
pnpm build
```

Expected: Build succeeds

---

## Task 18: Final Commit and Summary

**Files:**
- None (git operations only)

**Step 1: Check git status**

```bash
git status
```

Expected: All changes committed

**Step 2: View commit history**

```bash
git log --oneline -20
```

Expected: 17+ commits for resume generator feature

**Step 3: Create final summary commit (if needed)**

If any loose files:

```bash
git add .
git commit -m "chore: finalize AI resume generator implementation"
```

---

## Plan Complete

**Total Tasks:** 18
**Estimated Time:** 3-4 hours
**Key Files Created:** 10
**Tests Added:** 15+

**Next Steps:**

1. **Review** - Read through implementation
2. **Manual Testing** - Test with real job descriptions
3. **Integration** - Add to vaga details page (future task)
4. **Polish** - Refine prompts based on real-world results

**Execution Options:**

Use `superpowers:executing-plans` to implement this plan task-by-task with review checkpoints.
