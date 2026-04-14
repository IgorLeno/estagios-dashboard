import { z } from "zod"
import type { ConsistencyReport } from "./types"

/**
 * Consistency Agent
 *
 * Receives the complete draft CV (summary + skills + projects) and applies
 * cross-section validation and corrections to ensure internal coherence.
 *
 * This agent runs AFTER the 3 parallel prompts complete, as a final pass.
 * It does NOT rewrite content - it only resolves contradictions.
 */

export interface CVDraft {
  summary: string
  skills: Array<{ category: string; items: string[] }>
  projects: Array<{ title: string; description: string[] }>
  certifications?: string[]
  language: "pt" | "en"
}

export interface ConsistencyAgentResult {
  draft: CVDraft
  report: ConsistencyReport
}

const SkillGroupSchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string().min(1)),
})

const ProjectSchema = z.object({
  title: z.string().min(1),
  description: z.array(z.string().min(1)),
})

export const CVDraftSchema = z.object({
  summary: z.string().min(1),
  skills: z.array(SkillGroupSchema),
  projects: z.array(ProjectSchema),
  certifications: z.array(z.string().min(1)).optional(),
  language: z.enum(["pt", "en"]),
})

export const ConsistencyReportSchema = z.object({
  issues: z.array(z.string()),
  corrections: z.array(z.string()),
})

export const ConsistencyAgentResultSchema = z.object({
  draft: CVDraftSchema,
  report: ConsistencyReportSchema,
})

export const CONSISTENCY_SYSTEM_PROMPT = `You are a resume consistency auditor.
You receive a complete CV draft and fix ONLY internal contradictions.
You do NOT improve content, change style, or optimize for ATS.
Your sole job: make the document internally coherent.

RULES:
1. Never add new content - only modify existing content
2. Never change project titles or dates
3. Never remove sections, skill categories, skill items, projects, or certifications
4. Return ONLY valid JSON matching the input schema
5. Log every change you make in the "corrections" array`

export function buildConsistencyPrompt(draft: CVDraft, jobDescription: string): string {
  const lang = draft.language === "pt" ? "PT-BR" : "EN"

  return `Language: ${lang}
Job description context (for calibration only):
${jobDescription}

***
COMPLETE CV DRAFT TO AUDIT:
${JSON.stringify(draft, null, 2)}

***
CONSISTENCY RULES - apply ALL of these in a single pass:

## RULE 1: Excel Level Consistency (DETERMINISTIC)
Scan summary + skills for Excel level mentions.
Collect all Excel level terms found:
- "Excel Avançado", "Excel intermediário", "Excel Básico", "Excel (tabelas...)" etc.
If ANY level disagreement exists (e.g. summary says "intermediário" but skills says "Avançado"):
  a) REMOVE all level labels ("Avançado", "Intermediário", "Básico") from ALL mentions
  b) Replace with descriptive form EVERYWHERE:
     "Excel (Tabelas Dinâmicas, Macros, Power Query)"
  c) This is UNCONDITIONAL — do NOT pick the "most common" level, always use descriptive form
  d) Apply in BOTH summary AND skills sections

## RULE 2: Language Consistency in PT documents
If language is PT, scan the summary for English phrases inside parentheses.
Known violations to fix:
- "KPI tracking" -> "acompanhamento de KPIs"
- "KPI monitoring" -> "monitoramento de KPIs"
- "dashboards, KPI tracking" -> "dashboards, acompanhamento de KPIs"
Fix ALL English descriptors inside parentheses in the summary.
Tool names (Power BI, Excel, SQL, Python) are proper nouns - keep as-is.

## RULE 3: Inventory Preservation
Do not remove, add, rename, translate, deduplicate, or reorder skill categories or skill items.
Do not remove, add, rename, translate, deduplicate, or reorder certifications.
If a skill looks inflated or weakly relevant, leave it unchanged and mention the concern in "issues".

## RULE 4: Certification Preservation
Keep the certifications array exactly as received.
Do not sort certifications.
Do not remove certifications.
Do not add certifications.

## RULE 5: Summary naturalness - remove constructed phrases
In the summary, if you find phrases that sound artificial, apply these replacements:
- "alinhada a rotinas de BI e governança da informação" ->
  "em projetos acadêmicos de análise de dados"
- "para apoio à tomada de decisão estratégica" ->
  "para suporte analítico"
- "resultados otimizados" -> "resultados obtidos"
- "Vivência em organização de laboratório" -> REMOVE entirely (unless job is laboratory/engineering)
- "aplicáveis à validação de dados, padronização de dados" ->
  "em validação e padronização de dados"
- "em alinhamento a diretrizes de governança" -> REMOVE entirely
- "com vivência laboratorial aplicável a" -> REMOVE entirely (unless job is laboratory/engineering)
These specific replacements only - do not paraphrase freely.

## RULE 6: Cross-section term consistency
Pick the most common form of each term across sections and standardize:
- "Padronização de dados" vs "Padronização de informações" -> pick one, apply everywhere
- "Relatórios técnicos" vs "Elaboração de relatórios técnicos" -> "Relatórios técnicos"
- "Organização de bases" vs "Organização de bases de dados" -> longer form
- "Validação de dados" vs "Validação de informações" -> "Validação de dados"

## RULE 7: Project first-bullet reframe (NON-LAB CONTEXTS ONLY)
For each project, inspect ONLY the FIRST bullet of its description array.
If the first bullet's grammatical subject is a chemical/scientific technique
(e.g. "modelagem molecular", "simulações físico-químicas", "síntese orgânica",
"espectroscopia", "cromatografia", "termodinâmica") AND the job context is NOT
laboratory or engineering:
  a) REWRITE that first bullet so the grammatical subject is the DATA activity
     (e.g. "Análise de dados de simulações moleculares" instead of
     "Modelagem molecular com análise de dados")
  b) NEVER touch project TITLES — only descriptions
  c) Only rewrite the FIRST bullet of each project, leave other bullets unchanged
  d) If uncertain whether a term is chemical/scientific → do NOT alter (conservative default)
  e) Keep the same information — only change what leads the sentence

***
Return JSON:
{
  "draft": {
    "summary": "...",
    "skills": [...],
    "projects": [...],
    "certifications": [...],
    "language": "${draft.language}"
  },
  "report": {
    "issues": ["list of contradictions found"],
    "corrections": ["list of changes made, one per item"]
  }
}`
}

/**
 * Lightweight local consistency validator.
 *
 * Checks the 3 most deterministic consistency rules in TypeScript
 * to decide whether the full LLM consistency agent is needed.
 *
 * Returns { needsLLM: true, issues: [...] } if any check fails,
 * or { needsLLM: false, issues: [] } if draft is already consistent.
 */
export function localConsistencyCheck(draft: CVDraft): { needsLLM: boolean; issues: string[] } {
  const issues: string[] = []

  // --- RULE 1: Excel level consistency ---
  // Collect all Excel level mentions from summary + skills
  const EXCEL_LEVELS = /excel\s+(avan[cç]ado|intermedi[aá]rio|b[aá]sico)/gi
  const summaryLevels = [...draft.summary.matchAll(EXCEL_LEVELS)].map((m) => m[1].toLowerCase())
  const skillsText = draft.skills.flatMap((cat) => cat.items).join(" ")
  const skillsLevels = [...skillsText.matchAll(EXCEL_LEVELS)].map((m) => m[1].toLowerCase())
  const allLevels = [...summaryLevels, ...skillsLevels]

  if (allLevels.length >= 2) {
    const uniqueLevels = new Set(allLevels)
    if (uniqueLevels.size > 1) {
      issues.push(`Excel level mismatch: found ${[...uniqueLevels].join(", ")} across sections`)
    }
  }

  // --- RULE 2: Language consistency (PT documents) ---
  if (draft.language === "pt") {
    // Check for English phrases in parentheses (excluding tool names)
    const TOOL_NAMES = new Set(["power bi", "excel", "sql", "python", "pandas", "numpy", "scikit-learn", "power query"])
    const parenContent = [...draft.summary.matchAll(/\(([^)]+)\)/g)].map((m) => m[1])
    for (const content of parenContent) {
      const words = content.toLowerCase().split(/[,;]\s*/).map((w) => w.trim())
      for (const word of words) {
        if (TOOL_NAMES.has(word)) continue
        // Check for known English phrases that should be in PT
        if (/\bkpi\s+tracking\b/i.test(word) || /\bkpi\s+monitoring\b/i.test(word)) {
          issues.push(`English phrase in PT summary parentheses: "${word}"`)
        }
      }
    }
  }

  // --- RULE 3: Credential calibration ---
  const allSkillItems = draft.skills.flatMap((cat) => cat.items).map((s) => s.toLowerCase())
  const processCategory = draft.skills.find((cat) =>
    cat.category.toLowerCase().includes("processo") || cat.category.toLowerCase().includes("process")
  )

  const FORBIDDEN_SKILLS: Array<{ pattern: RegExp; label: string; categoryFilter?: string }> = [
    { pattern: /^governan[cç]a\s+(da\s+)?informa[cç][aã]o$/i, label: "Governança da informação" },
    { pattern: /^an[aá]lise\s+de\s+dados$/i, label: "Análise de dados (in process skills)", categoryFilter: "processo" },
  ]

  for (const forbidden of FORBIDDEN_SKILLS) {
    const checkItems = forbidden.categoryFilter && processCategory
      ? processCategory.items
      : draft.skills.flatMap((cat) => cat.items)
    if (checkItems.some((item) => forbidden.pattern.test(item))) {
      issues.push(`Forbidden skill found: ${forbidden.label}`)
    }
  }

  // Check "Modelagem de dados" — only allowed if projects mention ER/schema/database modeling
  if (allSkillItems.some((s) => /modelagem\s+de\s+dados/i.test(s))) {
    const projectText = draft.projects.flatMap((p) => p.description).join(" ").toLowerCase()
    const hasEREvidence = /\b(er\s+diagram|schema\s+design|database\s+model)/i.test(projectText)
    if (!hasEREvidence) {
      issues.push('Forbidden skill found: "Modelagem de dados" without ER/schema evidence in projects')
    }
  }

  // Check "Visualização de dados" redundancy with Power BI
  const hasPowerBIWithDescriptors = allSkillItems.some(
    (s) => s.includes("power bi") && s.includes("(")
  )
  if (hasPowerBIWithDescriptors && allSkillItems.some((s) => /^visualiza[cç][aã]o\s+de\s+dados$/i.test(s))) {
    issues.push('"Visualização de dados" is redundant with Power BI (already has descriptors)')
  }

  return { needsLLM: issues.length > 0, issues }
}
