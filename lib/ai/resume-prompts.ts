import type { JobDetails } from "./types"
import type { CVTemplate } from "./types"
import type { JobContext } from "./job-context-detector"
import {
  getSummaryContextInstructions,
  getSkillsContextInstructions,
  getProjectsContextInstructions,
} from "./context-specific-instructions"

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

/**
 * Build prompt for personalizing professional summary
 */
export function buildSummaryPrompt(
  jobDetails: JobDetails,
  originalSummary: string,
  userSkills: string[],
  language: "pt" | "en",
  jobContext: JobContext
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

  // Get context-specific instructions
  const contextInstructions = getSummaryContextInstructions(jobContext, language)

  return `${languageInstruction}

${contextInstructions}

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

INSTRUCTIONS - ATS OPTIMIZATION:

1. STRUCTURE (5-part professional profile):
   - Opening: Education level + current status (e.g., "Estudante de Engenharia Química (UNESP) em fase de conclusão")
   - Technical expertise: List 2-3 EXACT skills from "Required Skills" above
   - Domain experience: Connect to job responsibilities using action verbs from list above
   - Key achievements: Quantify 1-2 relevant accomplishments from original summary (if available)
   - Objective: Express interest in company/role using job keywords

2. EXACT TERMINOLOGY MATCHING (CRITICAL FOR ATS):
   - Use EXACT phrases from "Exact Phrases" list (e.g., if job says "Excel Avançado", use "Excel Avançado" not "Excel")
   - Match acronyms EXACTLY as written (e.g., "QHSE" not "qhse" or "Q.H.S.E.")
   - ⚠️ CRITICAL: Use technical terms NATURALLY - mention each term ONCE (max 1-2x total in summary)
   - If job mentions "ISO 17025" repeatedly, you should still mention it ONLY ONCE in summary
   - NO KEYWORD STUFFING - quality over quantity

3. KEYWORD DENSITY (USE NATURALLY - NO STUFFING):
   - Include 6-8 job keywords naturally distributed across sentences
   - PRIORITIZE keywords from "Required Skills" list
   - Use action verbs from list (e.g., "monitorar", "desenvolver", "implementar")
   - Front-load most important keywords in FIRST SENTENCE (ATS scans top first)
   - ⚠️ CRITICAL: Each keyword should appear MAX 1-2 times in ENTIRE summary (no repetition)
   - Use keywords in context, not forced or stuffed

4. ATS BEST PRACTICES:
   - Write 100-120 words (optimal ATS length - not too short, not too long)
   - Use industry-standard terminology only (no jargon or slang)
   - Avoid generic soft skills like "team player" (focus on technical/measurable skills)
   - Avoid fluff words - every word should add value

5. TRUTHFULNESS (ZERO FABRICATION TOLERANCE):
   - ONLY mention skills that appear in "USER'S SKILLS" list above
   - ONLY quantify achievements that appear in "ORIGINAL SUMMARY"
   - If original summary has no metrics, use qualitative descriptors instead
   - DO NOT invent experience, certifications, or tools not in original

EXAMPLE STRUCTURE (Portuguese):
"Estudante de Engenharia Química (UNESP) em fase de conclusão com expertise em [EXACT SKILL 1], [EXACT SKILL 2] e [EXACT SKILL 3]. Experiência comprovada em [ACTION VERB 1] [job duty] e [ACTION VERB 2] [job duty] através de projetos acadêmicos com [tool/method]. Domínio de [technical terms/certifications] para [application area]. Busco oportunidade na [company] para aplicar conhecimentos em [job area]."

CRITICAL FOR ATS: This summary will be scanned by Applicant Tracking Systems. Exact keyword matches are ESSENTIAL for passing automated screening.

Return JSON format:
{
  "summary": "Your highly ATS-optimized summary here (100-120 words)..."
}`
}

/**
 * Build prompt for personalizing skills section with Skills Bank integration
 */
export function buildSkillsPrompt(
  jobDetails: JobDetails,
  currentSkills: Array<{ category: string; items: string[] }>,
  skillsBank: Array<{ skill: string; proficiency: string; category: string }>, // NEW: Skills Bank
  projects: Array<{ title: string; description: string[] }>,
  language: "pt" | "en",
  jobContext: JobContext
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

  // Build allowed skills bank items (with proficiency indicators)
  const bankSkillItems = skillsBank.map((s) =>
    s.proficiency === "Expert" ? s.skill : `${s.skill} (${s.proficiency})`
  )

  // Combined allowed skills
  const allAllowedSkills = [...cvSkillItems, ...bankSkillItems]

  const languageInstruction =
    language === "pt"
      ? "⚠️ OBRIGATÓRIO: Mantenha os nomes das categorias e habilidades EXATAMENTE como estão (podem estar em português ou inglês). NÃO traduza nomes de ferramentas, software ou tecnologias."
      : "⚠️ MANDATORY: Keep category and skill names EXACTLY as they are (they may be in Portuguese or English). DO NOT translate tool, software, or technology names."

  // Get context-specific instructions
  const contextInstructions = getSkillsContextInstructions(jobContext, language)

  return `${languageInstruction}

${contextInstructions}

⚠️  CRITICAL: REORDER + SELECT FROM SKILLS BANK (ATS OPTIMIZATION)

JOB REQUIRED SKILLS (PRIORITIZE THESE):
${requisitosObrigatorios}

JOB DESIRED SKILLS (secondary priority):
${requisitosDesejaveis}

USER'S CV SKILLS (always included):
${JSON.stringify(currentSkills, null, 2)}

USER'S SKILLS BANK (can add if job-relevant):
${JSON.stringify(skillsBank, null, 2)}

ALLOWED SKILLS (you MUST use ONLY these exact items):
CV Skills: ${cvSkillItems.join(", ")}
Bank Skills: ${bankSkillItems.join(", ")}

EXACT PHRASES TO MATCH (from job):
${atsKeywords.exact_phrases.length > 0 ? atsKeywords.exact_phrases.join(", ") : "None extracted"}

INSTRUCTIONS - ATS OPTIMIZATION:

1. SKILL MATCHING LOGIC (prioritize in this order):
   - EXACT matches: job requires "Excel Avançado" → move to top, use exactly as written
   - Semantic matches: job wants "data analysis" → prioritize Python, SQL, pandas
   - Related skills: job mentions "quality control" → prioritize technical reporting, KPIs
   - General skills: keep but move to end

2. SKILLS BANK USAGE:
   - ADD skills from bank ONLY if job explicitly requires or strongly implies them
   - ALWAYS add with proficiency indicator if not "Expert":
     * Example: "Docker (Familiar)", "ISO 17025 (Learning)", "TensorFlow (Proficient)"
   - Maximum 3 skills from bank per category (don't overload)
   - Prioritize higher proficiency levels: "Proficient" > "Familiar" > "Learning"
   - When adding bank skill, place it in appropriate category based on its category field

3. CATEGORY REORDERING:
   - Move most job-relevant category to TOP position
   - Example: QHSE job → move "Soft Skills" (with quality/reporting skills) to position 1
   - Example: ML job → move "Linguagens & Análise de Dados" to position 1
   - Example: Engineering job → move "Ferramentas de Engenharia" to position 1

4. WITHIN-CATEGORY REORDERING:
   - Put EXACT job matches first in each category
   - Then semantic/related skills
   - Then general skills
   - Keep all original CV skills (don't remove, just reorder)

5. EXACT TERMINOLOGY (CRITICAL FOR ATS):
   - Use EXACT skill names from job (e.g., "Power BI" not "PowerBI")
   - Match tool versions if specified (e.g., "Excel Avançado" not just "Excel")
   - Keep acronyms exact (SQL, VBA, KPI, QHSE)
   - Preserve special characters and spacing

6. ATS BEST PRACTICES:
   - Put 5-7 most relevant skills in top 2 categories (ATS scans top first)
   - Include certifications as skills if job mentions them (e.g., "ISO 17025 (Familiar)")
   - Avoid skill stuffing (max 6-8 items per category)
   - If job required skill not in CV or bank, DON'T add it (maintain truthfulness)

VALIDATION CHECK (MANDATORY):
Before returning, verify that EVERY skill in your output appears in either:
- ALLOWED SKILLS (CV Skills) list, OR
- ALLOWED SKILLS (Bank Skills) list

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
      "Power BI (dashboards, KPI tracking)", // EXACT match
      "Relatórios técnicos", // Related to job
      "Gestão de projetos (KPIs/qualidade)", // Related
      "ISO 17025 (Familiar)" // Added from skills bank
    ]
  },
  { "category": "Linguagens & Análise de Dados", "items": ["SQL", "Python", "R"] }
]

Return JSON format:
{
  "skills": [
    {
      "category": "Exact category name (can create new by combining existing skills)",
      "items": ["Skill1", "Skill2 (Proficiency)", ...]  // ONLY from ALLOWED SKILLS
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
  currentProjects: Array<{ title: string; description: string[] }>,
  language: "pt" | "en",
  jobContext: JobContext
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

  // Get context-specific instructions
  const contextInstructions = getProjectsContextInstructions(jobContext, language)

  return `${languageInstruction}

${contextInstructions}

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

INSTRUCTIONS - ATS OPTIMIZATION:

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
   - Format: [Action verb] + [Technical task] + [Tool/methodology] + [Measurable outcome/relevance]
   - Example: "Implementar sistema de controle de qualidade usando Python e SQL para monitoramento de KPIs (5000+ registros)"
   - Example: "Desenvolver pipeline de Machine Learning com Random Forest para predição de propriedades, alcançando 35% de redução no erro"

4. KEYWORD DENSITY PER PROJECT:
   - Each project should include 3-5 job keywords
   - Prioritize keywords in FIRST bullet point (ATS scans top first)
   - Repeat critical acronyms naturally (QHSE, KPI, ML, etc.)
   - Front-load most relevant technical terms

5. DOMAIN-SPECIFIC REFRAMING (critical for same project, different jobs):

   If QHSE/Quality role:
   - Emphasize: quality control, data validation, compliance, standards (ISO, OSHA), reporting, KPIs
   - Tools to highlight: Excel, Power BI, SQL (for quality metrics)
   - Outcomes: improved accuracy, reduced errors, enhanced traceability, compliance achieved

   If Data/ML role:
   - Emphasize: model development, data pipeline, algorithm optimization, prediction accuracy
   - Tools to highlight: Python, ML libraries (Scikit-learn, TensorFlow), databases
   - Outcomes: improved model performance, automated workflows, data insights, accuracy gains

   If Technical/Engineering role:
   - Emphasize: process optimization, simulation, technical analysis, design
   - Tools to highlight: Engineering software (Aspen Plus, MATLAB), simulation tools
   - Outcomes: efficiency gains, cost reduction, performance improvement, technical validation

6. ATS BEST PRACTICES:
   - Use industry-standard terminology (no academic jargon)
   - Quantify when possible (%, reduced time, improved accuracy)
   - Match job's language register (formal for corporate, technical for startups)
   - Front-load keywords in first project (ATS weighs earlier content more)
   - Avoid generic verbs like "worked on" - use specific action verbs

7. TRUTHFULNESS (ZERO FABRICATION TOLERANCE):
   - ONLY reframe HOW you describe the work, not WHAT was done
   - Keep all metrics/numbers from original descriptions (don't inflate)
   - Don't invent tools not actually used
   - Stay within project scope (don't exaggerate impact)
   - If original has no metrics, use qualitative descriptors instead

VALIDATION CHECK (MANDATORY):
Before returning, verify that EVERY project title in your output matches EXACTLY (character-by-character, including dates, parentheses, and capitalization) with the "REQUIRED PROJECT TITLES" list above.

EXAMPLE TRANSFORMATION (Same project, different jobs):

PROJECT: "Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)"

QHSE Job (Quality focus):
{
  "title": "Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)",
  "description": [
    "Implementar sistema de controle de qualidade de dados usando Python e SQL para monitoramento automatizado de KPIs e validação de conformidade de registros termodinâmicos (5000+ pontos de dados)",
    "Desenvolver dashboards em Power BI para rastreamento de indicadores de qualidade, identificando não-conformidades e gerando relatórios técnicos para análise de performance",
    "Executar validação de dados segundo padrões técnicos, reduzindo erros de registro em 35% através de controles automatizados e análise estatística"
  ]
}

ML Job (Algorithm focus):
{
  "title": "Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)",
  "description": [
    "Desenvolver pipeline de dados end-to-end em Python (Pandas, NumPy, Scikit-learn) para automação de feature engineering e treinamento de modelos preditivos de propriedades termodinâmicas",
    "Implementar algoritmos de Machine Learning (Random Forest, Neural Networks) para predição de viscosidade, alcançando 35% de redução no erro através de otimização de hiperparâmetros",
    "Automatizar geração de relatórios analíticos e visualização de performance de modelos, processando dataset com 5000+ pontos experimentais para análise de tendências"
  ]
}

Notice: SAME project, COMPLETELY different emphasis based on job type!

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
  const hasKnownKeyword = technicalKeywords.some((keyword) =>
    word.toLowerCase().includes(keyword)
  )

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
  const titleCaseMatches =
    allText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || []
  exact_phrases.push(...titleCaseMatches)

  // Add known multi-word tools/technologies
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
    if (allText.toLowerCase().includes(phrase.toLowerCase())) {
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
  const allKeywords = [
    ...atsKeywords.technical_terms,
    ...atsKeywords.required_skills,
    ...atsKeywords.acronyms,
  ]
  return Array.from(new Set(allKeywords)).slice(0, limit)
}
