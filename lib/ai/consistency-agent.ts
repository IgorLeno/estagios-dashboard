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
3. Never remove entire sections
4. Return ONLY valid JSON matching the input schema
5. Log every change you make in the "corrections" array`

export function buildConsistencyPrompt(draft: CVDraft, jobDescription: string): string {
  const lang = draft.language === "pt" ? "PT-BR" : "EN"

  return `Language: ${lang}
Job description context (for calibration only):
${jobDescription.slice(0, 800)}

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

## RULE 3: Credential Calibration (UNCONDITIONAL)
Scan skills for inflated credential terms. Apply these ALWAYS — do not check role type:
- "Modelagem de dados" → ALWAYS REMOVE from skills
  UNLESS a project description explicitly mentions ER diagrams, schema design, or database modeling.
  (organizing bases ≠ data modeling; pipeline ≠ ER diagram)
- "Governança da informação" → ALWAYS REMOVE from skills.
  Do NOT move to summary. Simply remove.
- "Análise de dados" in "Competências de Processo" → ALWAYS REMOVE
  (too generic, already implied by the entire CV)
- "Visualização de dados" as standalone item → REMOVE if Power BI is already listed
  with descriptors (redundant)

## RULE 4: Certification Order
Reorder the certifications array using this priority (lower index = higher priority):
1. Google Data Analytics
2. Power BI (any certification containing "Power BI")
3. SQL (any certification containing "SQL")
4. Excel (any certification containing "Excel")
5. All other analytics/data certifications
LAST. Deep Learning, Machine Learning, AI, Neural Network certifications

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
