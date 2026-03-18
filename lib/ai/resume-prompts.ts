import type { JobDetails } from "./types"
import type { CVTemplate } from "./types"
import type { JobProfile } from "./job-profile"

/**
 * System instruction for resume personalization
 *
 * CRITICAL: This system enforces ZERO FABRICATION TOLERANCE
 * Any invented information will cause rejection and regeneration
 */
export const RESUME_SYSTEM_PROMPT = `You are a professional resume writer specializing in ATS (Applicant Tracking System) optimization.

Your role is to personalize resume sections to match job requirements while maintaining complete honesty and accuracy.

⚠️  CRITICAL RULES - ZERO TOLERANCE FOR VIOLATIONS:
1. NEVER fabricate skills, tools, certifications, or experience
2. NEVER add new skills to the skills list (ONLY reorder existing ones)
3. NEVER change project titles or dates (ONLY rewrite descriptions)
4. NEVER invent metrics or achievements not in the original CV
5. ONLY reorder and emphasize existing content - NO invention allowed
6. Use job keywords naturally in rewrites - no keyword stuffing
7. Maintain professional, concise language
8. Return ONLY valid JSON, no markdown code fences

WHAT YOU CAN DO:
✅ Rewrite summary to include job keywords (80-120 words)
✅ Reorder skills within categories by relevance to job
✅ Rewrite project descriptions to emphasize job-relevant aspects

WHAT YOU CANNOT DO:
❌ Add skills/tools not in original skills list
❌ Add certifications not in original certifications list
❌ Change project titles or dates
❌ Invent new projects or experiences
❌ Add metrics/numbers not in original CV
❌ Change contact information

VALIDATION:
Your output will be validated against strict schemas. Any fabricated content will be rejected.
If job requirements ask for skills not in the CV, DO NOT add them - just emphasize related existing skills.`

export const SUMMARY_PROMPT_INSTRUCTIONS = `INSTRUCTIONS - ATS OPTIMIZATION:

1. STRUCTURE (5-part professional profile):
   - Opening: Education level + current status (e.g., "Estudante de Engenharia Química (UNESP) em fase de conclusão")
   - Technical expertise: List 2-3 EXACT skills from "Required Skills" above
   - CALIBRATE TO ROLE LEVEL: For operational internship roles (BI support, data maintenance,
     documentation), lead with OPERATIONAL skills (Excel, Power BI, SQL, relatórios) NOT
     research/ML skills (Deep Learning, neural networks, advanced algorithms).
     The goal is to convey: "organized, reliable, detail-oriented" — not "technically impressive".
   - ⚠️ INTERNSHIP/TRAINEE TONE: If the position is an internship (estágio) or junior role,
     NEVER use "expertise" — use "conhecimento em", "experiência acadêmica com", "vivência em",
     or "prática com" instead. "Expertise" implies senior-level mastery.
   - Domain experience: Connect to job responsibilities using action verbs from list above
   - Key achievements: Quantify 1-2 relevant accomplishments from original summary (if available)
   - Objective: Express interest in company/role using job keywords

2. EXACT TERMINOLOGY MATCHING (CRITICAL FOR ATS):
   - Use EXACT phrases from "Exact Phrases" list (e.g., if job says "Excel Avançado", use "Excel Avançado" not "Excel")
   - Match acronyms EXACTLY as written (e.g., "QHSE" not "qhse" or "Q.H.S.E.")
   - ⚠️ CRITICAL: Use technical terms NATURALLY - mention each term ONCE (max 1-2x total in summary)
   - If job mentions "ISO 17025" repeatedly, you should still mention it ONLY ONCE in summary
   - NO KEYWORD STUFFING - quality over quantity
   - EXCEL LEVEL CONSISTENCY (MANDATORY): Do NOT self-assign an Excel proficiency level
     in the summary unless the exact level term ("Excel Intermediário", "Excel Avançado",
     "Excel Básico") appears literally in the job description.
     * If job says "Excel Avançado" literally → you MAY use "Excel Avançado" in summary.
     * If job says "conhecimento intermediário em Excel" → use descriptive form:
       "Excel (tabelas, fórmulas, organização de bases)" — NO level label.
     * If job says only "Excel" with no level → use descriptive form with specific functions.
     * DEFAULT: When in doubt, use descriptive form. Never invent or infer a level label.
     This prevents contradictions between the summary and the skills section.

3. KEYWORD DENSITY (USE NATURALLY - NO STUFFING):
   - Include 6-8 job keywords naturally distributed across sentences
   - PRIORITIZE keywords from "Required Skills" list
   - Use action verbs from list (e.g., "monitorar", "desenvolver", "implementar")
   - Front-load most important keywords in FIRST SENTENCE (ATS scans top first)
   - ⚠️ CRITICAL: Each keyword should appear MAX 1-2 times in ENTIRE summary (no repetition)
   - Use keywords in context, not forced or stuffed
   - GOVERNANCE TERMS: For BI/Analytics/People Analytics roles, prefer using process
     competency terms when describing skills in sentence 3 — choose from:
     "organização de bases", "validação de dados", "padronização de informações",
     "documentação técnica", "consistência de dados". These are inferred from academic
     project work and are not fabrication. Use where they fit naturally.
   - ⚠️ LANGUAGE RULE: When output language is PT, NEVER use English phrases inside
     parentheses of tool names in the summary.
     ❌ WRONG: "Power BI (dashboards, KPI tracking)"
     ✅ CORRECT: "Power BI (dashboards, acompanhamento de KPIs)"

   TERMINOLOGY TABLE (apply these substitutions when the left-hand term appears):
     | Original | Corrected |
     |---|---|
     | rastreamento de KPIs | acompanhamento de KPIs |
     | KPI tracking | acompanhamento de KPIs |
     | KPI monitoring | monitoramento de KPIs |
     | gestão de projetos (internship) | acompanhamento de projetos |
     | visualizações estratégicas | visualização de indicadores |
     | administração de bases | organização e estruturação de bases |

4. ATS BEST PRACTICES:
   - Write 100-120 words (optimal ATS length - not too short, not too long)
   - Use industry-standard terminology only (no jargon or slang)
   - Avoid generic soft skills like "team player" (focus on technical/measurable skills)
   - Avoid fluff words - every word should add value

5. TRUTHFULNESS (see global rules in System Prompt):
   - FUNCTION-FIRST OBJECTIVE (MANDATORY): The final sentence must express a concrete,
     function-focused objective. Use 2-3 specific activities drawn from the job's
     responsibilities — paraphrase naturally, do not copy verbatim.

     Structure guidance (vary the phrasing — do NOT repeat the same template every time):
     * "Busco contribuir com [activity 1] e [activity 2] em contextos de [domain]."
     * "Busco estágio em [área] para apoiar [activity 1], [activity 2] e [activity 3]."
     * Activities should be concrete and operational (e.g., "organização de bases de dados",
       "elaboração de relatórios", "acompanhamento de indicadores") — not abstract goals.

     ❌ NEVER: "para aplicar habilidades analíticas" (too vague)
     ❌ NEVER: cite company name in objective
     ❌ NEVER: "visualizações estratégicas" → use "visualização de indicadores"
   - PEOPLE ANALYTICS FRAMING (MANDATORY): When job is in People Analytics but
     candidate has no direct People Analytics experience (only BI/data projects):
     ❌ NEVER write: "conhecimento em People Analytics"
     ❌ NEVER write: "experiência em People Analytics"
     ✅ CORRECT: "conhecimento em BI, análise e visualização de dados, com interesse em
        People Analytics"
     ✅ CORRECT: "prática em BI e análise de dados, com interesse na área de People Analytics"

     Rule: "People Analytics" may appear ONCE in the summary (in the objective sentence),
     but the opening sentence must lead with what IS proven: BI, SQL, Python, Excel, dashboards.
     Interest language ("interesse em", "com foco em transição para") is always safer
     than implied expertise ("conhecimento em People Analytics") for roles the candidate
     hasn't worked in directly.
   - PEOPLE ANALYTICS OBJECTIVE (MANDATORY): When job is People Analytics or
     People Analytics + BI, the objective sentence MUST include both:
     ✅ CORRECT: "Busco estágio em People Analytics e BI para apoiar rotinas de..."
     ❌ WRONG:   "Busco estágio em People Analytics para apoiar rotinas de..."
     The "e BI" is mandatory because: (a) it more accurately describes the role scope,
     (b) it strengthens ATS matching for BI-related keywords in the job description,
     (c) it signals broader applicability to related openings.
     Apply this rule whenever job title, tipo_vaga, or responsabilidades mention
     both People Analytics AND BI/Power BI/dashboards/dados.
   - DO NOT name the company inside the resume body — the company name belongs in cover letters,
     not in the CV objective line. Use area/function instead.
     ❌ WRONG: "Busco oportunidade na Aegea Saneamento para..."
     ✅ CORRECT: "Busco estágio em People Analytics e BI para apoiar rotinas de..."
   - ONLY describe work that was actually done — reframe HOW, never WHAT
   - NEVER inject job domain into unrelated project descriptions
   - Keep all original metrics; if none exist, use qualitative descriptors

6. LOCATION AWARENESS (ALWAYS CHECK — MANDATORY):
   - ALWAYS compare job location with candidate location before writing summary.
   - If job city differs from candidate city OR if job city is not in the same metro area:
     * MANDATORY: Add availability statement as the LAST sentence of the summary.
     * Format: "Disponível para atuação presencial e mobilidade para realocação."
     * OR: "Com disponibilidade para atuação presencial em [job city] e mobilidade."
   - If same city: no need to add.
   - DEFAULT BEHAVIOR: When in doubt (cities are different), ALWAYS add the statement.
     It is much better to add unnecessarily than to omit when it is needed.
   - This sentence replaces "período integral" if present — "disponibilidade para
     realocação" is more universally understood and does not raise scheduling doubts.

   ⚠️ NOTE: "período integral" can raise concerns for recruiters when candidate is still
   enrolled in university. Prefer "disponibilidade para atuação presencial e mobilidade"
   as it answers the practical concern without opening a scheduling question.

7. NEW TECHNOLOGY INTEREST:
   - If the job mentions a specific tool the candidate doesn't have in their CV but is clearly
     entry-level or "interest" acceptable (like Databricks, Tableau, dbt, Airflow), add one
     sentence expressing genuine interest.
   - Format: "Interesse em [tool] e em ambientes modernos de [domain]."
   - Maximum 1 tool — don't list multiple "interests" (looks like padding).

EXAMPLE STRUCTURE (Portuguese):
"Estudante de Engenharia Química (UNESP) em fase de conclusão com conhecimento em [EXACT SKILL 1], [EXACT SKILL 2] e [EXACT SKILL 3]. Experiência acadêmica com [ACTION VERB 1] [job duty] e [ACTION VERB 2] [job duty] através de projetos com [tool/method]. Vivência em [technical terms/certifications] para [application area]. Busco estágio em [area/function] para apoiar rotinas de [specific activities from job responsibilities]."

CRITICAL FOR ATS: This summary will be scanned by Applicant Tracking Systems. Exact keyword matches are ESSENTIAL for passing automated screening.

Return JSON format:
{
  "summary": "Your highly ATS-optimized summary here (100-120 words)..."
}`

export const SKILLS_PROMPT_INSTRUCTIONS = `INSTRUCTIONS - ATS OPTIMIZATION:

1. SKILL MATCHING LOGIC (prioritize in this order):
   - EXACT matches: job requires "Excel Avançado" → move to top, use exactly as written
   - Semantic matches: job wants "data analysis" → prioritize Python, SQL, pandas
   - Related skills: job mentions "quality control" → prioritize technical reporting, KPIs
   - General skills: keep but move to end

2. SKILLS BANK USAGE:
   - ADD skills from bank ONLY if job explicitly requires or strongly implies them
   - Maximum 3 skills from bank per category (don't overload)
   - KEEP the bank skill name exactly as stored; do NOT append proficiency suffixes
   - When adding bank skill, place it in appropriate category based on its category field

3. CATEGORY REORDERING:
   - Move most job-relevant category to TOP position
   - Example: QHSE job → move "Soft Skills" (with quality/reporting skills) to position 1
   - Example: ML job → move "Linguagens & Análise de Dados" to position 1
   - Example: Engineering job → move "Ferramentas de Engenharia" to position 1

4. WITHIN-CATEGORY REORDERING AND SELECTION:
   - Put EXACT job matches first in each category
   - Then semantic/related skills
   - REMOVE skills that have zero relevance to this specific job (e.g. specialized lab tools for an analytics job)
   - Keep soft skills category with most relevant items only (max 4-5)
   - MINIMUM: Always keep at least 3 skills total per category kept
   - OPERATIONAL ROLE FILTER: For internship/junior roles in BI, People Analytics, Data Support,
     or Documentation, apply these filters:
     * REMOVE (do not include in any category): Scikit-learn — for BI/People Analytics/
       Data Support operational internship roles, Scikit-learn implies ML focus which
       contradicts the operational profile being presented. ALWAYS remove for these roles,
       even if moving to last position is tempting. Omit entirely.
     * REMOVE: Deep Learning, neural networks, TensorFlow (same reason)
     * DEPRIORITIZE: Typer, GAMESS, MOPAC, CREST, Avogadro, OpenBabel (niche tools)
     * REMOVE: Self-assessed soft skill proficiency levels — NEVER write "Comunicação técnica
       (Avançado)" or "Pensamento analítico (Avançado)"; write just "Comunicação técnica",
       "Pensamento analítico". Soft skills are NEVER rated with proficiency levels.
     * KEEP AND PROMOTE: organização de bases, validação de dados, atualização de bases,
       padronização, Excel (with specific functions), Power BI, SQL,
       relatórios técnicos, documentação técnica
     * REMOVE from "Competências de Processo" for BI/People Analytics/Data Support roles:
       "Análise de dados" — too broad, already implied by the entire CV.
       Replace with more specific operational terms like "Validação de dados" or
       "Atualização de bases de dados" if not already present.
   - LANGUAGE CONSISTENCY: When output language is PT (Portuguese), translate skill
     display terms that are commonly used in Portuguese CVs:
     * "KPI tracking" → "acompanhamento de KPIs"
     * "KPI monitoring" → "monitoramento de KPIs"
     * Keep tool names as-is (Power BI, Excel, Python, SQL — these are proper nouns)
     * Keep certification names as-is (Google Data Analytics, etc.)
   - MAXIMUM: 6-8 items per category (remove excess irrelevant skills)

5. EXACT TERMINOLOGY (CRITICAL FOR ATS):
   - Use EXACT skill names from job (e.g., "Power BI" not "PowerBI")
   - Match tool versions if specified (e.g., "Excel Avançado" not just "Excel")
   - Keep acronyms exact (SQL, VBA, KPI, QHSE)
   - Preserve special characters and spacing

6. ATS BEST PRACTICES:
   - Put 5-7 most relevant skills in top 2 categories (ATS scans top first)
   - Include certifications as skills if job mentions them (e.g., "ISO 17025")
   - Aim for 6-8 most relevant skills per category (remove irrelevant, don't stuff)
   - If job required skill not in CV or bank, DON'T add it (maintain truthfulness)
   - REMOVE entire categories if 0 of their skills are relevant to the job
   - NEVER include specialized engineering tools (CREST, MOPAC, GAMESS, Aspen Plus, OpenBabel, Avogadro)
     in analytics/BI/HR/data roles — they are noise, not signal
   - DEDUPLICATION (MANDATORY — CROSS-CATEGORY):
     After building all categories, scan the ENTIRE skills section (all categories combined)
     for duplicate skill names.
     * If the same skill appears in TWO different categories: keep it ONLY in the most
       relevant category for the job — remove from the less relevant one.
     * Example: "Excel Avançado" in "Visualização & BI" AND in "Linguagens & Análise de Dados"
       → keep ONLY in "Visualização & BI" (more relevant for BI roles), remove from Linguagens.
     * Within same category: keep most descriptive version (existing rule — keep as is).
     * Apply this check AFTER all categories are built, as a final pass.
   - SEMANTIC DEDUPLICATION (MANDATORY — SAME AND CROSS-CATEGORY):
     After exact deduplication, scan for skills that mean the same thing even if worded
     differently. Known redundant pairs — when both appear, KEEP only the first listed:
     * "Relatórios técnicos" vs "Elaboração de Relatórios" → keep "Relatórios técnicos"
     * "Elaboração de relatórios técnicos" vs "Relatórios técnicos" → keep "Relatórios técnicos"
     * "Organização de bases" vs "Organização de bases de dados" → keep longer form
     * "Análise de dados" vs "Análise exploratória de dados" → keep more specific one
     * "Acompanhamento de KPIs" vs "Monitoramento de KPIs" → keep "Acompanhamento de KPIs"
     * "Documentação técnica" vs "Documentação de processos" → keep "Documentação técnica"
     Apply this check as a FINAL pass after all other deduplication.
   - CERTIFICATION ORDER (STRICT): Sort certifications using this priority for
     BI/Analytics/People Analytics/Data Support roles:
     1st: "Google Data Analytics" — broad analytics foundation
     2nd: "Power BI" related certifications — direct tool match
     3rd: "SQL" related certifications — direct tool match
     4th: "Excel" related certifications — direct tool match
     5th: Other analytics/data certifications
     LAST: Deep Learning, ML, AI certifications (unless job explicitly requires)
     
     Apply this sort BEFORE outputting the certifications array.
     If a certification matches multiple levels, use the highest applicable.

7. TRUTHFULNESS (see global rules in System Prompt):
   - ONLY describe work that was actually done — reframe HOW, never WHAT
   - NEVER inject job domain into unrelated project descriptions
   - Keep all original metrics; if none exist, use qualitative descriptors

VALIDATION CHECK (MANDATORY):
Before returning, verify:
1. EVERY skill in your output appears in either ALLOWED SKILLS (CV Skills) OR ALLOWED SKILLS (Bank Skills)
2. No engineering/lab tool appears in a data/analytics/HR/BI/people job output
3. Category count is 2-4 (not all categories needed — only relevant ones)
4. Total skill count across all categories: 8-20 (not all skills, only relevant ones)

If you find ANY skill not in those lists, REMOVE IT immediately. This is NON-NEGOTIABLE.

EXAMPLE TRANSFORMATION (QHSE job):
BEFORE (generic):
[
  { "category": "Linguagens & Análise de Dados", "items": ["Python", "SQL", "R"] },
  { "category": "Soft Skills", "items": ["Relatórios técnicos", "Gestão de projetos"] }
]

AFTER (QHSE-optimized):
[
  {
    "category": "Gestão de Qualidade & QHSE",
    "items": [
      "Excel Avançado (Tabelas Dinâmicas, Macros)", // EXACT match from job
      "Power BI (dashboards, acompanhamento de KPIs)", // EXACT match
      "Relatórios técnicos", // Related to job
      "Acompanhamento de indicadores de qualidade", // Related
      "ISO 17025" // Added from skills bank
    ]
  },
  { "category": "Linguagens & Análise de Dados", "items": ["SQL", "Python", "R"] }
]

OUTPUT FORMAT RULES FOR SOFT SKILLS:
   - If the CV contains soft skills, split them into TWO separate categories:
     1. "Competências de Processo": technical process activities that are transferable.
        For BI/Analytics/People Analytics roles, PRIORITIZE these items (in order):
        ✅ PRIORITY 1 (data operations): "Validação de dados", "Organização de bases de dados",
           "Padronização de informações", "Documentação técnica",
           "Atualização e manutenção de bases"
        ✅ PRIORITY 2 (reporting): "Elaboração de relatórios técnicos",
           "Acompanhamento de KPIs", "Controle de indicadores"
        ✅ PRIORITY 3 (general process): "Acompanhamento de projetos",
           "Organização de atividades"
        ❌ DEPRIORITIZE for BI/Analytics roles (move to last or remove):
           "Controle de não-conformidades" — too industrial/quality-management, not BI
           "Acompanhamento de indicadores de qualidade" — implies manufacturing QA, not data
           "Gestão de processos industriais" — clearly wrong domain

        Select 3-5 items that best match the job. For BI/People Analytics roles, the
        section MUST contain at least 2 items from PRIORITY 1.
     2. "Competências Comportamentais": pure behavioral traits
        (ex: "Pensamento analítico", "Atenção a detalhes", "Comunicação técnica",
        "Resolução de problemas", "Organização")
   - NEVER mix process activities with behavioral traits in the same category
   - "Gestão de projetos" → rename to "Acompanhamento de projetos" (for ALL internship roles, mandatory)
   - "Gestão de projetos (KPIs/qualidade)" → "Acompanhamento de indicadores de qualidade"
   - "Rastreamento de KPIs" → rename to "Acompanhamento de KPIs"
   - "Administração de bases de dados" → rename to "Organização e estruturação de bases de dados"
   - "Visualizações estratégicas" → rename to "Visualização de indicadores"
   - "Controle de não-conformidades" → remove for BI/Analytics/People Analytics outputs unless
     the job is explicitly quality/compliance-focused

Return JSON format:
{
  "skills": [
    {
      "category": "Exact category name (can create new by combining existing skills)",
      "items": ["Skill1", "Skill2", ...]  // ONLY from ALLOWED SKILLS
    },
    ...
  ]
}`

export const PROJECTS_PROMPT_INSTRUCTIONS = `INSTRUCTIONS - ATS OPTIMIZATION:

1. PROJECT-TO-JOB-DUTY MAPPING:
   - Identify which job responsibilities each project can address
   - Reframe project descriptions to DIRECTLY connect to those duties
   - Example: Lab project → Quality job = emphasize "data validation", "quality control", "standards compliance"
   - Example: Same project → ML job = emphasize "model training", "data pipeline", "predictive analytics"

2. EXACT TERMINOLOGY SUBSTITUTION:
   - Replace generic terms with job-specific keywords
   - Use EXACT phrases from "Exact Phrases" list
   - Use action verbs from "Action Verbs" list
   - Include technical terms from "Technical Terms" list
   - Match acronyms EXACTLY (case-sensitive)

3. DESCRIPTION STRUCTURE (per bullet point):
   - Format: [Past/present action verb in PAST TENSE or NOUN PHRASE] + [specific task] +
     [tool/method] + [outcome/relevance]
   - USE PAST TENSE or NOUN PHRASE — NEVER infinitive verbs:
     ❌ WRONG: "Desenvolver pipeline automatizado..."
     ✅ CORRECT: "Desenvolvimento de pipeline automatizado..." OR "Desenvolveu pipeline..."
     ✅ CORRECT (noun phrase): "Estruturação e padronização de bases de dados para..."
   - Each bullet MUST end with a period (.)
   - AVOID REDUNDANT PHRASES: "análises analíticas", "dados de dados", "resultado de resultados"
     — read each bullet aloud and remove obvious redundancies
   - TARGET LENGTH: 15-25 words per bullet (concise, scannable — not a paragraph)
   - If original description has 3 concepts, split into exactly 3 short bullets — do NOT
     merge everything into one dense run-on bullet

4. KEYWORD DENSITY PER PROJECT:
   - Each project should include 3-5 job keywords
   - Prioritize keywords in FIRST bullet point (ATS scans top first)
   - Repeat critical acronyms naturally (QHSE, KPI, ML, etc.)
   - Front-load most relevant technical terms

5. TRANSFERABLE SKILLS TRANSLATION (critical: describe WHAT was done, reframe HOW it's described):

   ⚠️ CRITICAL RULE: NEVER insert the job's domain (e.g., "People Analytics", "BI corporativo",
   "HR analytics") into a project that is NOT from that domain. This is keyword stuffing and
   will cause immediate rejection by experienced recruiters.

   CORRECT approach — translate project ACTIONS into transferable business language:
   - "Coletou e organizou dados experimentais" → "Estruturou e organizou bases de dados para análise"
   - "Executou validação de modelos moleculares" → "Realizou validação e controle de qualidade de dados"
   - "Gerou relatórios técnicos de simulações" → "Elaborou relatórios analíticos documentando metodologia, fontes e resultados"
   - "Automatizou pipeline de cálculos quânticos" → "Automatizou rotinas de processamento e atualização de dados"
   - "Comparou dados experimentais com bases bibliográficas" → "Realizou checagem de consistência e padronização de informações"

   ALLOWED reframing by job type (always grounded in what was ACTUALLY done):

   If People Analytics/BI/HR role:
   - Emphasize: organização de bases, validação de dados, automação de rotinas, elaboração de
     relatórios, padronização, documentação técnica, controle de qualidade de informação
   - DO NOT write: "People Analytics", "análise de RH", "dados de gestão de pessoas"
   - Use instead: "organização e atualização de bases de dados", "documentação de processos",
     "rotinas de validação e consistência", "apoio analítico à tomada de decisão"

   If Data/ML role:
   - Emphasize: pipeline de dados, automação de processamento, análise exploratória,
     treinamento de modelos, validação de resultados
   - DO NOT write: "pipeline para BI corporativo", "People Analytics pipeline"
   - Use instead: "pipeline automatizado de processamento de dados", "validação de modelos preditivos"

   If QHSE/Quality role:
   - Emphasize: controle de qualidade de dados, validação de conformidade, rastreabilidade,
     relatórios técnicos, padronização de processos
   - DO NOT write: "controle de qualidade industrial" if project was academic
   - Use instead: "controle de qualidade de dados acadêmicos/experimentais", "validação de resultados"

   If Technical/Engineering role:
   - Emphasize: simulação de processos, otimização de parâmetros, análise técnica, modelagem
   - Use domain-specific tools as-is (Aspen Plus, MATLAB, CREST, GAMESS are relevant here)

   RULE: If a connection between project and job area feels forced, describe only the
   PROCESS SKILLS (organizar, validar, automatizar, documentar, padronizar, elaborar relatórios)
   without claiming domain expertise the project doesn't have.
   GOVERNANCE VOCABULARY INFERENCE (authorized inferences — not fabrication):
   When project involves: data collection, organization, processing pipelines, validation →
   you MAY add these descriptors if they are natural consequences of the described activity:
   ✅ "rastreabilidade de dados" (if traceability is implied by the pipeline structure)
   ✅ "padronização de informações" (if standardization is part of processing)
   ✅ "consistência de dados" (if validation routines exist)
   ✅ "documentação de fontes e regras" (if methodology documentation exists)
   ❌ NEVER add: "controle de acessos", "políticas de governança", "gestão de TI"
      (these require explicit professional experience, cannot be inferred from academic work)
   FOR CHEMICAL/SCIENTIFIC PROJECTS in operational BI/Analytics roles — REFRAMING PRINCIPLE:

   For non-lab/non-engineering roles, the first bullet of each project should lead with the
   DATA or PROCESS activity, not the scientific technique. The scientific domain may appear
   as context (e.g., "...dados de simulações físico-químicas...") but should NOT be the
   grammatical subject of the sentence.

   Example: instead of "Modelagem molecular com análise de dados...", write
   "Estruturação e análise de dados experimentais obtidos via simulação molecular..."

   Remaining bullets: use transferable process vocabulary naturally (padronização,
   documentação, validação, rastreabilidade) — do not force a rigid template.

6. ATS BEST PRACTICES:
   - Use industry-standard terminology (no academic jargon)
   - Quantify when possible (%, reduced time, improved accuracy)
   - Match job's language register (formal for corporate, technical for startups)
   - Front-load keywords in first project (ATS weighs earlier content more)
   - Avoid generic verbs like "worked on" - use specific action verbs

7. TRUTHFULNESS (see global rules in System Prompt):
   - ONLY describe work that was actually done — reframe HOW, never WHAT
   - NEVER inject job domain into unrelated project descriptions
   - Keep all original metrics; if none exist, use qualitative descriptors

VALIDATION CHECK (MANDATORY):
Before returning, verify that EVERY project title in your output matches EXACTLY (character-by-character, including dates, parentheses, and capitalization) with the "REQUIRED PROJECT TITLES" list above.

EXAMPLE TRANSFORMATION (People Analytics/BI job — correct approach):

PROJECT: "Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)"

❌ WRONG (keyword stuffing — what the system was doing before):
{
  "title": "Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)",
  "description": [
    "Desenvolver pipeline automatizado em Python para BI e People Analytics, realizando automação da geração de dados termodinâmicos",
    "Elaborar relatórios analíticos com dados processados, gerando insights para cenários de People Analytics e BI",
    "Automatizar fluxos de dados termodinâmicos, suportando análises preditivas em People Analytics"
  ]
}
⚠️ Problem: Forces "People Analytics" and "BI" into a thermodynamics research project. Recruiters detect this immediately.

✅ CORRECT (transferable skills, honest reframing):
{
  "title": "Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)",
  "description": [
    "Estruturação e padronização de bases de dados termodinâmicos para processamento recorrente em Python (Pandas, NumPy).",
    "Implementação de rotinas de validação e controle de consistência para garantir qualidade das informações.",
    "Elaboração de relatórios técnicos com documentação de fontes, regras de processamento e resultados."
  ]
}
✅ Why it works: Uses transferable skills vocabulary (organizar, validar, automatizar, documentar,
padronizar) without falsely claiming the project was about People Analytics. Honest AND ATS-optimized.

EXAMPLE TRANSFORMATION (ML/Data Science job):

✅ CORRECT (ML job — domain IS relevant here):
{
  "title": "Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)",
  "description": [
    "Desenvolver pipeline de dados end-to-end em Python (Pandas, NumPy, Scikit-learn) para automação de feature engineering e treinamento de modelos preditivos de propriedades termodinâmicas",
    "Implementar rotinas automatizadas de validação e controle de qualidade de dados, processando dataset com múltiplos pontos experimentais para análise de consistência",
    "Automatizar geração de relatórios analíticos com visualização de performance de modelos, documentando metodologia e resultados para uso em análises futuras"
  ]
}
✅ Why it works: For a real ML/Data job, ML terminology IS contextually appropriate. The project
genuinely uses ML tools, so the framing is honest.

CRITICAL FOR ATS: These descriptions will be scanned by Applicant Tracking Systems. Exact keyword matches and domain-specific terminology are ESSENTIAL.

Return JSON format:
{
  "projects": [
    {
      "title": "EXACT title from REQUIRED PROJECT TITLES (character-by-character match)",
      "description": [
        "First bullet (front-load keywords)",
        "Second bullet (job-specific terminology)",
        "Third bullet (measurable outcomes)"
      ]
    },
    ...
  ]
}`

/**
 * Serializa JobProfile para bloco de texto injetado nos prompts.
 * Traduz campos estruturados em instruções diretas para o LLM.
 */
function buildProfileBlock(profile: JobProfile, section?: "summary" | "skills" | "projects"): string {
  const lines: string[] = []

  lines.push(`Role family: ${profile.role_family} | Mode: ${profile.role_mode} | Seniority: ${profile.seniority}`)
  lines.push(`Domain proof policy: ${profile.domain_proof_policy}`)

  if (profile.exact_terms.length > 0) {
    lines.push(`Exact terms to use (copy verbatim): ${profile.exact_terms.join(", ")}`)
  }

  if (profile.preferred_terms.length > 0) {
    lines.push(`Preferred terms (use these over alternatives): ${profile.preferred_terms.join(", ")}`)
  }

  if (profile.forbidden_terms.length > 0) {
    lines.push(`⛔ FORBIDDEN — must NOT appear in output: ${profile.forbidden_terms.join(", ")}`)
  }

  if (profile.excel_term_policy === "use_exact_label" && profile.excel_exact_label) {
    lines.push(`Excel label: use exactly "${profile.excel_exact_label}" — no other form allowed`)
  } else if (profile.excel_term_policy === "descriptive") {
    lines.push(`Excel label: use descriptive form only (e.g. "Excel (tabelas, fórmulas, Power Query)") — do NOT self-assign a proficiency level`)
  } else if (profile.excel_term_policy === "basic_only") {
    lines.push(`Excel label: plain "Excel" only — no level suffix`)
  }

  if (profile.require_location_statement) {
    lines.push(
      "Location: job city differs from candidate base — MANDATORY: add relocation availability sentence as last sentence of summary"
    )
  }

  // Section-specific domain hints
  const hints =
    section === "summary" ? profile.summary_structure_hints
    : section === "skills" ? profile.skill_reordering_hints
    : section === "projects" ? profile.project_reframing_hints
    : undefined

  if (hints && hints.length > 0) {
    lines.push("")
    lines.push("DOMAIN-SPECIFIC GUIDANCE:")
    hints.forEach((hint, i) => lines.push(`${i + 1}. ${hint}`))
  }

  return lines.join("\n")
}

/**
 * Build prompt for personalizing professional summary
 */
export function buildSummaryPrompt(
  jobDetails: JobDetails,
  originalSummary: string,
  userSkills: string[],
  language: "pt" | "en",
  jobProfile: JobProfile
): string {
  // Extract ATS keywords (6 types)
  const atsKeywords = extractATSKeywords(jobDetails)

  // Handle undefined/Indefinido values
  const cargo = jobDetails.cargo && jobDetails.cargo !== "Indefinido" ? jobDetails.cargo : "Position not specified"
  const requisitosObrigatorios =
    jobDetails.requisitos_obrigatorios.length > 0 ? jobDetails.requisitos_obrigatorios.join(", ") : "Not specified"
  const requisitosDesejaveis =
    jobDetails.requisitos_desejaveis.length > 0 ? jobDetails.requisitos_desejaveis.join(", ") : "Not specified"
  const responsabilidades =
    jobDetails.responsabilidades.length > 0 ? jobDetails.responsabilidades.slice(0, 5).join("; ") : "Not specified"

  const languageInstruction =
    language === "pt"
      ? "⚠️ OBRIGATÓRIO: TODO o conteúdo DEVE estar em PORTUGUÊS BRASILEIRO. Não use palavras em inglês, traduza tudo."
      : "⚠️ MANDATORY: ALL content MUST be in ENGLISH. Do not use Portuguese words, translate everything."

  const profileBlock = buildProfileBlock(jobProfile, "summary")

  return `${languageInstruction}

Rewrite the professional summary to be HIGHLY OPTIMIZED FOR ATS (Applicant Tracking Systems).

JOB DETAILS:
Company: ${jobDetails.empresa}
Position: ${cargo}
Required Skills: ${requisitosObrigatorios}
Desired Skills: ${requisitosDesejaveis}
Responsibilities: ${responsabilidades}

ORIGINAL SUMMARY:
${originalSummary}

USER'S SKILLS (you can ONLY mention skills from this list):
${userSkills.join(", ")}

ATS KEYWORDS EXTRACTED FROM JOB:
Technical Terms (repeated in job): ${atsKeywords.technical_terms.slice(0, 5).join(", ")}
Required Skills (PRIORITIZE these): ${atsKeywords.required_skills.slice(0, 3).join(", ")}
Action Verbs (use these verbs): ${atsKeywords.action_verbs.slice(0, 3).join(", ")}
Certifications/Standards: ${atsKeywords.certifications.join(", ")}
Exact Phrases (use EXACTLY as written): ${atsKeywords.exact_phrases.join(", ")}
Acronyms (match EXACTLY): ${atsKeywords.acronyms.join(", ")}

STRUCTURED JOB PROFILE:
${profileBlock}

${SUMMARY_PROMPT_INSTRUCTIONS}`
}

/**
 * Build prompt for personalizing skills section with Skills Bank integration
 */
export function buildSkillsPrompt(
  jobDetails: JobDetails,
  currentSkills: Array<{ category: string; items: string[] }>,
  skillsBank: Array<{ skill: string; proficiency?: string; category: string }>, // NEW: Skills Bank
  projects: Array<{ title: string; description: string[] }>,
  language: "pt" | "en",
  jobProfile: JobProfile,
  approvedSkills?: string[]
): string {
  // Extract ATS keywords
  const atsKeywords = extractATSKeywords(jobDetails)

  // Handle undefined/empty arrays
  const requisitosObrigatorios =
    jobDetails.requisitos_obrigatorios.length > 0 ? jobDetails.requisitos_obrigatorios.join(", ") : "Not specified"
  const requisitosDesejaveis =
    jobDetails.requisitos_desejaveis.length > 0 ? jobDetails.requisitos_desejaveis.join(", ") : "Not specified"

  // Extract all skill items from CV
  const cvSkillItems = currentSkills.flatMap((cat) => cat.items)

  const bankSkillItems = skillsBank.map((s) => s.skill)

  // Compute certification order at prompt-build time (more reliable than asking LLM to sort)
  // Broader match: capture any certification/course category regardless of exact name
  const CERT_CATEGORY_KEYWORDS = ["certif", "curso", "course", "formação", "training", "qualificaç"]
  const cvCertifications = currentSkills
    .filter((cat) =>
      CERT_CATEGORY_KEYWORDS.some((keyword) => cat.category.toLowerCase().includes(keyword))
    )
    .flatMap((cat) => cat.items)

  const certRankOrder = ["google data analytics", "power bi", "sql", "excel"]

  const sortedCerts = [...cvCertifications].sort((a, b) => {
    const rankA = certRankOrder.findIndex((keyword) => a.toLowerCase().includes(keyword))
    const rankB = certRankOrder.findIndex((keyword) => b.toLowerCase().includes(keyword))
    const effectiveRankA = rankA === -1 ? certRankOrder.length : rankA
    const effectiveRankB = rankB === -1 ? certRankOrder.length : rankB
    return effectiveRankA - effectiveRankB
  })

  const certOrderInstruction =
    sortedCerts.length > 0
      ? `\nCERTIFICATIONS MUST BE IN THIS EXACT ORDER (pre-computed, do not reorder):\n${sortedCerts.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`
      : ""

  const languageInstruction =
    language === "pt"
      ? "⚠️ OBRIGATÓRIO: Mantenha os nomes das categorias e habilidades EXATAMENTE como estão (podem estar em português ou inglês). NÃO traduza nomes de ferramentas, software ou tecnologias."
      : "⚠️ MANDATORY: Keep tool, software, and technology names EXACTLY as they are. You may translate non-tool descriptive skill labels to natural English when needed."

  const bankLanguageNote =
    language === "en"
      ? `\nNOTE: Skills bank items may be in Portuguese. Translate them naturally to English when including in the CV. Example: "Documentação técnica" → "Technical documentation".\n`
      : ""

  const profileBlock = buildProfileBlock(jobProfile, "skills")

  return `${languageInstruction}

⚠️  CRITICAL: REORDER + SELECT FROM SKILLS BANK (ATS OPTIMIZATION)

JOB REQUIRED SKILLS (PRIORITIZE THESE):
${requisitosObrigatorios}

JOB DESIRED SKILLS (secondary priority):
${requisitosDesejaveis}

USER'S CV SKILLS (always included):
${JSON.stringify(currentSkills, null, 2)}

${bankLanguageNote}

USER'S SKILLS BANK (can add if job-relevant):
${JSON.stringify(skillsBank, null, 2)}

ALLOWED SKILLS (you MUST use ONLY these exact items):
CV Skills: ${cvSkillItems.join(", ")}
Bank Skills: ${bankSkillItems.join(", ")}${approvedSkills && approvedSkills.length > 0 ? `\nUser-Approved Skills: ${approvedSkills.join(", ")}` : ""}

EXACT PHRASES TO MATCH (from job):
${atsKeywords.exact_phrases.length > 0 ? atsKeywords.exact_phrases.join(", ") : "None extracted"}

STRUCTURED JOB PROFILE:
${profileBlock}

${certOrderInstruction}

${SKILLS_PROMPT_INSTRUCTIONS}`
}

/**
 * Build prompt for personalizing projects section
 */
export function buildProjectsPrompt(
  jobDetails: JobDetails,
  currentProjects: Array<{ title: string; description: string[] }>,
  language: "pt" | "en",
  jobProfile: JobProfile
): string {
  const jobKeywords = extractTopKeywords(jobDetails, 10)

  // Handle undefined/Indefinido values
  const cargo = jobDetails.cargo && jobDetails.cargo !== "Indefinido" ? jobDetails.cargo : "Position not specified"
  const responsabilidades =
    jobDetails.responsabilidades.length > 0 ? jobDetails.responsabilidades.slice(0, 5).join("; ") : "Not specified"
  const requisitosObrigatorios =
    jobDetails.requisitos_obrigatorios.length > 0 ? jobDetails.requisitos_obrigatorios.join(", ") : "Not specified"

  // Extract exact project titles for validation
  const projectTitles = currentProjects.map((p) => p.title)

  const languageInstruction =
    language === "pt"
      ? "⚠️ OBRIGATÓRIO: As DESCRIÇÕES dos projetos DEVEM estar em PORTUGUÊS BRASILEIRO. Mantenha os títulos EXATAMENTE como estão (não traduza datas ou nomes técnicos nos títulos)."
      : "⚠️ MANDATORY: Project DESCRIPTIONS MUST be in ENGLISH. Keep titles EXACTLY as they are (do not translate dates or technical names in titles)."

  // Extract ATS keywords (6 types)
  const atsKeywords = extractATSKeywords(jobDetails)

  const profileBlock = buildProfileBlock(jobProfile, "projects")

  return `${languageInstruction}

⚠️  CRITICAL: KEEP TITLES UNCHANGED - REWRITE DESCRIPTIONS FOR ATS OPTIMIZATION

JOB DETAILS:
Company: ${jobDetails.empresa}
Position: ${cargo}
Responsibilities: ${responsabilidades}
Required Skills: ${requisitosObrigatorios}
Job Type/Area: ${jobDetails.tipo_vaga || "Not specified"}

CURRENT PROJECTS (with exact titles you MUST preserve):
${JSON.stringify(currentProjects, null, 2)}

REQUIRED PROJECT TITLES (copy these EXACTLY, character-by-character):
${projectTitles.map((t, i) => `${i + 1}. "${t}"`).join("\n")}

ATS KEYWORDS EXTRACTED FROM JOB:
Technical Terms: ${atsKeywords.technical_terms.slice(0, 5).join(", ")}
Required Skills: ${atsKeywords.required_skills.slice(0, 3).join(", ")}
Action Verbs (use in descriptions): ${atsKeywords.action_verbs.slice(0, 3).join(", ")}
Certifications/Standards: ${atsKeywords.certifications.join(", ")}
Exact Phrases (use EXACTLY): ${atsKeywords.exact_phrases.join(", ")}
Acronyms (match EXACTLY): ${atsKeywords.acronyms.join(", ")}

STRUCTURED JOB PROFILE:
${profileBlock}

${PROJECTS_PROMPT_INSTRUCTIONS}`
}

/**
 * ATS Keywords Interface
 * Represents extracted keywords from job description for ATS optimization
 */
export interface ATSKeywords {
  technical_terms: string[] // Repeated technical terms (2+ occurrences)
  required_skills: string[] // From requisitos_obrigatorios
  action_verbs: string[] // Job duty verbs (desenvolver, implementar, etc.)
  certifications: string[] // Standards (ISO 17025, OSHA, etc.)
  exact_phrases: string[] // Multi-word critical terms
  acronyms: string[] // 2-5 letter acronyms (QHSE, KPI, SQL)
}

/**
 * Predefined action verbs for keyword extraction
 * Both Portuguese and English variants
 */
const ACTION_VERBS = [
  // Portuguese
  "desenvolver",
  "implementar",
  "analisar",
  "gerenciar",
  "coordenar",
  "monitorar",
  "avaliar",
  "elaborar",
  "executar",
  "validar",
  "controlar",
  "otimizar",
  "planejar",
  "criar",
  "realizar",
  "aplicar",
  "garantir",
  "preparar",
  "organizar",
  "atender",
  // English
  "develop",
  "implement",
  "analyze",
  "manage",
  "coordinate",
  "monitor",
  "evaluate",
  "create",
  "execute",
  "validate",
  "control",
  "optimize",
  "plan",
  "apply",
  "ensure",
  "prepare",
  "organize",
  "maintain",
]

/**
 * Check if a word is a technical term
 * Technical indicators: capital letters, numbers, hyphens, dots, or known technical keywords
 */
function isTechnicalTerm(word: string): boolean {
  // Must be at least 2 characters
  if (word.length < 2) return false

  // Check for technical patterns
  const hasTechnicalPattern = /[A-Z0-9]|[-.]/.test(word)

  // Check for known technical keywords (case-insensitive)
  const technicalKeywords = [
    "python",
    "sql",
    "excel",
    "power",
    "aspen",
    "iso",
    "osha",
    "qhse",
    "kpi",
    "api",
    "ml",
    "ai",
    "bi",
    "vba",
    "erp",
    "crm",
  ]
  const hasKnownKeyword = technicalKeywords.some((keyword) => word.toLowerCase().includes(keyword))

  return hasTechnicalPattern || hasKnownKeyword
}

/**
 * Extract ATS keywords from job description
 * Extracts 6 types of keywords for comprehensive ATS optimization
 *
 * @param jobDetails - Job description details
 * @returns ATSKeywords with 6 categories of extracted keywords
 */
export function extractATSKeywords(jobDetails: JobDetails): ATSKeywords {
  // Combine all text for frequency analysis
  const allText = [
    jobDetails.cargo || "",
    ...(jobDetails.requisitos_obrigatorios || []),
    ...(jobDetails.requisitos_desejaveis || []),
    ...(jobDetails.responsabilidades || []),
  ].join(" ")

  // 1. TECHNICAL TERMS (repeated 2+ times with technical patterns)
  const frequencyMap = new Map<string, number>()
  allText.split(/\s+/).forEach((word) => {
    const cleaned = word.replace(/[.,;:()]/g, "") // Remove punctuation
    if (cleaned.length >= 2) {
      const lower = cleaned.toLowerCase()
      frequencyMap.set(lower, (frequencyMap.get(lower) || 0) + 1)
    }
  })

  const technical_terms = Array.from(frequencyMap.entries())
    .filter(([term, count]) => count >= 2 && isTechnicalTerm(term))
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, 10)
    .map(([term]) => term)

  // 2. REQUIRED SKILLS (from requisitos_obrigatorios)
  const required_skills = (jobDetails.requisitos_obrigatorios || [])
    .map((req) => req.trim())
    .filter((req) => req.length > 0 && req !== "Indefinido")
    .slice(0, 7) // Top 7 most critical

  // 3. ACTION VERBS (from responsabilidades)
  const action_verbs_set = new Set<string>()
  ;(jobDetails.responsabilidades || []).forEach((resp) => {
    const words = resp.toLowerCase().split(/\s+/)
    words.forEach((word) => {
      if (ACTION_VERBS.includes(word)) {
        action_verbs_set.add(word)
      }
    })
  })
  const action_verbs = Array.from(action_verbs_set).slice(0, 5)

  // 4. CERTIFICATIONS & STANDARDS
  const certifications: string[] = []
  const CERT_PATTERNS = [
    /ISO\s*\d+/gi, // ISO 9001, ISO 17025
    /OSHA|QHSE|HSE/gi, // Safety standards
    /\b[A-Z]{2,6}\s*\d+\b/g, // General cert patterns (NBR 14001)
    /certificaç[ãa]o\s+[\w\s]+/gi, // "Certificação em..."
    /certification\s+[\w\s]+/gi, // "Certification in..."
  ]

  CERT_PATTERNS.forEach((pattern) => {
    const matches = allText.match(pattern) || []
    certifications.push(...matches.map((m) => m.trim()))
  })

  // Deduplicate and limit
  const uniqueCertifications = Array.from(new Set(certifications)).slice(0, 5)

  // 5. EXACT PHRASES (multi-word critical terms)
  const exact_phrases: string[] = []

  // Extract quoted phrases
  const quotedMatches = allText.match(/"([^"]+)"/g) || []
  exact_phrases.push(...quotedMatches.map((m) => m.replace(/"/g, "").trim()))

  // Extract Title Case phrases (potential tool/product names)
  const titleCaseMatches = allText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || []
  exact_phrases.push(...titleCaseMatches)

  // Add known multi-word tools/technologies — ONLY when full phrase is literally present
  const KNOWN_PHRASES = [
    "Excel Avançado",
    "Power BI",
    "Aspen Plus",
    "Machine Learning",
    "Data Science",
    "Quality Control",
    "Controle de Qualidade",
  ]
  KNOWN_PHRASES.forEach((phrase) => {
    // Require the FULL phrase to appear literally (not just one word from it)
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
    const regex = new RegExp(`\\b${escapedPhrase}\\b`, "i")
    if (regex.test(allText)) {
      exact_phrases.push(phrase)
    }
  })

  // Deduplicate and limit
  const uniquePhrases = Array.from(new Set(exact_phrases)).slice(0, 5)

  // 6. ACRONYMS (2-5 capital letters)
  const acronymMatches = allText.match(/\b[A-Z]{2,5}\b/g) || []
  const STATE_CODES = ["NA", "SP", "RJ", "MG", "BA", "RS", "PR", "SC", "PE", "CE"]
  const acronyms = Array.from(new Set(acronymMatches))
    .filter((acronym) => !STATE_CODES.includes(acronym))
    .slice(0, 8)

  return {
    technical_terms,
    required_skills,
    action_verbs,
    certifications: uniqueCertifications,
    exact_phrases: uniquePhrases,
    acronyms,
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use extractATSKeywords() instead
 */
function extractTopKeywords(jobDetails: JobDetails, limit: number): string[] {
  const atsKeywords = extractATSKeywords(jobDetails)
  // Combine all keywords for backward compatibility
  const allKeywords = [...atsKeywords.technical_terms, ...atsKeywords.required_skills, ...atsKeywords.acronyms]
  return Array.from(new Set(allKeywords)).slice(0, limit)
}
