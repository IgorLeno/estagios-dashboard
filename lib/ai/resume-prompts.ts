import type { JobDetails } from "./types"
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
5. NEVER add, remove, rename, or reorder resume sections from the general resume
6. NEVER change contact information, education, institutions, certifications, project periods, or project order
7. Preserve the general resume markdown pattern and project formatting conventions, including divs with style="text-align: justify;" when present
8. ONLY reorder and emphasize existing content - NO invention allowed
9. Use job keywords naturally in rewrites - no keyword stuffing
10. Maintain professional, concise language
11. Return ONLY valid JSON, no markdown code fences

WHAT YOU CAN DO:
✅ Rewrite summary to include job keywords (60-70 words, 3-4 sentences)
✅ Reorder existing skill categories and skill items by relevance to job
✅ Rewrite project descriptions to emphasize job-relevant aspects without changing titles or periods

WHAT YOU CANNOT DO:
❌ Add skills/tools not in original skills list
❌ Remove skills/tools from original skills list
❌ Add certifications not in original certifications list
❌ Add, remove, rename, or reorder sections
❌ Change project titles or dates
❌ Omit projects received as input
❌ Invent new projects or experiences
❌ Add metrics/numbers not in original CV
❌ Change contact information

VALIDATION:
Your output will be validated against strict schemas. Any fabricated content will be rejected.
If job requirements ask for skills not in the CV, DO NOT add them - just emphasize related existing skills.`

// [FIX-v2] Corrige perfis que ignoravam gaps obrigatórios de curso, localização ou prática, tornando o gap explícito sem inventar experiência.
const CRITICAL_GAPS_INSTRUCTIONS = `TRATAMENTO DE GAPS CRÍTICOS (OBRIGATÓRIO):
Identifique os requisitos obrigatórios da vaga que o candidato NÃO atende
plenamente. Para cada gap:

TIPO 1 — Curso diferente do exigido:
  Se a vaga exige "Cursando Química" e o candidato cursa "Engenharia Química":
  Mencione explicitamente no perfil a equivalência da base técnica.
  Exemplo: "...com base sólida em química analítica, físico-química e
  termodinâmica equivalente ao currículo de bacharelado em Química."
  NÃO ignore o gap esperando que o recrutador não perceba.

TIPO 2 — Localização diferente da exigida:
  Se o candidato tem disponibilidade de mobilidade nos dados do perfil:
  Declare explicitamente no perfil.
  Exemplo: "...disponível para estágio presencial em Campinas/região."
  Se não há dados de mobilidade: não mencione localização.

TIPO 3 — Experiência prática ausente:
  Se a vaga exige prática de laboratório e o candidato tem apenas teoria:
  NÃO invente experiência prática. Redirecione para a equivalência teórica.
  Exemplo: ao invés de "experiência em titulação", use "formação teórica
  em química analítica com domínio de fundamentos de titulação e
  espectrofotometria."

Regra absoluta: nunca ignore gaps obrigatórios. Endereçá-los proativamente
demonstra autoconhecimento e aumenta a credibilidade do candidato.`

// [FIX-v2] Corrige perfis genéricos, forçando uma estrutura que responde por que o candidato é relevante para a vaga específica.
const PROFESSIONAL_PROFILE_STRUCTURE_INSTRUCTIONS = `ESTRUTURA DO PERFIL PROFISSIONAL:
O perfil deve responder à pergunta implícita do recrutador:
"Por que este candidato é relevante para ESTA vaga?"

Estrutura em 3 partes (máximo 5 linhas no total):

PARTE 1 — Quem é (1 frase):
Formação + previsão de conclusão + especialização relevante para a vaga.
Se há gap de curso ou localização: trate aqui com linguagem de equivalência.

PARTE 2 — O que já fez de relevante (1-2 frases):
Experiências ou projetos com CONEXÃO GENUÍNA à vaga.
Inclua métricas concretas se disponíveis.
Não mencione experiências sem conexão real com a vaga.

PARTE 3 — Diferenciais (1-2 frases):
Skills técnicas que a vaga valoriza + diferenciais que outros candidatos
típicos desta vaga provavelmente não têm.

Evite frases genéricas como "profissional dedicado", "capacidade de
trabalho em equipe" ou "perfil analítico" sem evidência concreta.`

// [FIX-v2] Corrige ordenação fraca de competências, definindo prioridade objetiva para categorias e itens sem adicionar habilidades.
const SKILL_PRIORITY_HIERARCHY_INSTRUCTIONS = `HIERARQUIA DE PRIORIZAÇÃO DE COMPETÊNCIAS (OBRIGATÓRIO):

ORDENAÇÃO DE CATEGORIAS:
1ª posição: categoria que contém as ferramentas citadas EXPLICITAMENTE nos
  requisitos ou diferenciais da vaga (ex: se a vaga lista "Excel e Power BI",
  a categoria Análise de Dados vai primeiro)
2ª posição: categoria mais relacionada às responsabilidades listadas
Última posição: SEMPRE a categoria de Idiomas/Languages,
  independentemente de qualquer relevância

ORDENAÇÃO DENTRO DE CADA CATEGORIA:
1º: itens citados literalmente na vaga
2º: itens relacionados às responsabilidades
3º: demais itens

NUNCA altere quais itens existem — apenas reordene os existentes.`

// [FIX-v2] Corrige sufixação artificial de keywords em projetos, exigindo integração orgânica dentro da narrativa.
const ORGANIC_KEYWORD_INTEGRATION_INSTRUCTIONS = `INTEGRAÇÃO ORGÂNICA DE KEYWORDS (OBRIGATÓRIO):
Integre as palavras-chave da vaga NA narrativa existente, reescrevendo frases
de dentro para fora. NUNCA adicione expressões da vaga como sufixo ao final de
frases já completas.

Teste de validade: a frase faz sentido lida isoladamente, sem o contexto da vaga?
Se sim, a integração foi bem-feita.
Se não, reescreva a frase desde o início.

❌ ERRADO — keyword colada como sufixo:
"...atingindo R² = 0,997, ideal para digitalização de rotinas analíticas em laboratórios."
"...apresentando resultados no congresso para suporte a planos de ação em processos industriais."

✅ CERTO — keyword integrada à narrativa:
"...atingindo R² = 0,997 em critérios automáticos de qualidade, validando a abordagem
de delta-learning para correção de erros sistemáticos em larga escala."
"...apresentando análise comparativa de 5 métodos preditivos com desvios quantificados
(MRD = 1,93%), metodologia transferível para validação de processos analíticos."`

// [FIX-v2] Corrige conexões forçadas entre projetos e vagas, exigindo aderência técnica ou metodológica real.
const GENUINE_RELEVANCE_FILTER_INSTRUCTIONS = `FILTRO DE RELEVÂNCIA GENUÍNA (OBRIGATÓRIO):
Antes de conectar um projeto à vaga, avalie: existe conexão técnica ou
metodológica real entre o que foi feito no projeto e o que a vaga exige?

CONEXÃO GENUÍNA = mesma metodologia, mesma área técnica, ou mesma categoria
de problema (ex: projeto de equilíbrio líquido-vapor → vaga de tratamento de
água → conexão real via termodinâmica de sistemas aquosos).

CONEXÃO FALSA = mesmas palavras, contextos completamente diferentes
(ex: pipeline de ML para moléculas orgânicas → "ideal para análise de
dados operacionais de fábrica").

Se a conexão for falsa: descreva o projeto pelo seu valor metodológico real,
sem forçar o contexto da vaga.
Um projeto honesto com conexão fraca é melhor que uma conexão forçada que
não resistiria a uma pergunta técnica na entrevista.

❌ ERRADO:
Projeto de ML para 29.000 moléculas orgânicas descrito como
"ideal para atualização de dashboards operacionais de produção"

✅ CERTO:
"...sistema automatizado que processa dados de 29.000+ moléculas,
demonstrando capacidade de estruturar pipelines de dados em larga escala
com validação automática de qualidade (R² = 0,997)."`

// [FIX-v2] Corrige repetição de expressões adaptadas entre projetos e perfil, preservando impacto e variedade textual.
const CROSS_PROJECT_DEDUPLICATION_INSTRUCTIONS = `DEDUPLICAÇÃO CROSS-PROJETO (OBRIGATÓRIO):
Cada expressão adaptada da vaga deve aparecer em NO MÁXIMO UM projeto.
Se uma keyword foi usada em um projeto, não repita nos outros — use
sinônimos ou reformule para cobrir o mesmo tema de ângulo diferente.

❌ ERRADO:
Projeto 1: "...elaborando relatórios e apresentações com indicadores..."
Projeto 4: "...elaborando relatórios gerenciais e apresentações estratégicas..."

✅ CERTO:
Projeto 1: "...estruturando relatório técnico com indicadores comparativos..."
Projeto 4: "...desenvolvendo apresentações de diagnóstico para identificação
de problemas e proposição de soluções."

Adicionalmente: se uma expressão foi usada no Perfil Profissional, evite
repeti-la nos projetos. A redundância enfraquece o impacto de cada seção.`

// [FIX-v2] Corrige retornos abaixo da meta por falta de revisão interna antes da resposta final.
const FIT_CONTENT_SELF_REVIEW_INSTRUCTIONS = `AUTOAVALIAÇÃO ANTES DE RETORNAR (OBRIGATÓRIO):
Antes de retornar o output final, verifique internamente:

[ ] Alguma frase termina com uma expressão claramente retirada da vaga e
    colada como sufixo?
[ ] Algum projeto conecta o candidato à vaga de forma que não resistiria
    a uma pergunta técnica na entrevista?
[ ] A mesma expressão adaptada aparece em mais de uma seção?
[ ] Algum requisito obrigatório da vaga que o candidato não atende foi
    simplesmente ignorado?
[ ] As competências mais relevantes para a vaga estão nas primeiras
    posições?
[ ] Métricas e resultados concretos dos projetos originais foram
    preservados?

Se qualquer item estiver marcado como problema, corrija antes de retornar.`

export const SUMMARY_PROMPT_INSTRUCTIONS = `INSTRUCTIONS - ATS OPTIMIZATION:

1. STRUCTURE (mandatory concise professional profile):
   - O perfil profissional deve ter NO MÁXIMO 5 linhas quando renderizado em fonte Arial 10.5pt, coluna de ~500px de largura.
   - Na prática isso corresponde a NO MÁXIMO 60-70 palavras e 3-4 frases.
   - Se o texto gerado ultrapassar 4 frases, cortar a última frase inteira.
   - Proibido usar frases longas com múltiplas subordinadas — preferir frases diretas e objetivas de até 20 palavras cada.
   - NÃO gerar resumo genérico como "Busco estágio" ou frase de 1 linha.
   - Escrever como parágrafo contínuo com 3-4 frases.
   - Frase 1: formação atual + momento (e.g., "Estudante de Engenharia Química (UNESP) em fase de conclusão")
   - Frase 2: 2 a 4 competências aderentes à vaga específica, usando termos exatos quando possível
   - Frase 3: 1 evidência prática (projeto, resultado ou metodologia) ligada à vaga
   - Frase 4: objetivo funcional específico alinhado à vaga, apenas se houver espaço sem ultrapassar os limites acima
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

${PROFESSIONAL_PROFILE_STRUCTURE_INSTRUCTIONS}

${CRITICAL_GAPS_INSTRUCTIONS}

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

3.5. INTRA-SUMMARY DEDUPLICATION (MANDATORY):
   After drafting the full summary, scan the entire text for repeated expressions.
   The following phrases may appear AT MOST ONCE across the entire summary:
   - "organização de bases de dados" (or any variant: "organizar bases", "estruturação de bases")
   - "elaboração de relatórios técnicos" (or any variant: "relatórios técnicos", "relatórios")
   - "validação de dados" (or any variant: "validação", "checagem de consistência")
   - "documentação técnica" (or any variant: "documentação")
   - "padronização de informações" (or any variant: "padronização")
   If any of these appears more than once across the 3-4 sentences: remove the duplicate
   and replace with a distinct descriptor from this list:
   "rastreabilidade de dados", "consistência de informações", "digitalização de rotinas analíticas",
   "estruturação de fluxos", "construção de indicadores", "apoio à operação e qualidade".
   This check is MANDATORY before returning the summary.

4. ATS BEST PRACTICES:
   - Write 60-70 words and keep the text within 3-4 direct sentences
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

${FIT_CONTENT_SELF_REVIEW_INSTRUCTIONS}

Return JSON format:
{
  "summary": "Your highly ATS-optimized summary here (100-120 words)..."
}`

export const SKILLS_PROMPT_INSTRUCTIONS = `INSTRUCTIONS - SKILL REORDERING ONLY:

1. STRUCTURAL PRESERVATION:
   - Keep every existing skill category exactly as provided.
   - Do not create, remove, rename, split, or merge categories.
   - Keep every existing skill item exactly as provided.
   - Do not add, remove, rename, translate, deduplicate, or rewrite skill items.
   - Do not add User-Approved Skills to the output; they are contextual signals only unless already present in the provided categories.

2. ALLOWED CHANGE:
   - Reorder existing categories and existing items by relevance to the job.
   - If an item is weakly related to the job, keep it in the same category and move it to the end within that category.

${SKILL_PRIORITY_HIERARCHY_INSTRUCTIONS}

3. EXACTNESS:
   - Copy category names character-by-character from USER'S CV SKILLS.
   - Copy skill names character-by-character from ALLOWED SKILLS.
   - Preserve punctuation, accents, capitalization, parenthetical text, and tool names.
   - Never infer proficiency labels, levels, or new tool variants.

4. VALIDATION CHECK:
   Before returning, verify:
   - Every input category appears once in the output.
   - Every input skill item appears once in the same category.
   - No output skill item is absent from ALLOWED SKILLS.
   - No category or item was renamed, translated, added, or removed.

${FIT_CONTENT_SELF_REVIEW_INSTRUCTIONS}

Return JSON format:
{
  "skills": [
    {
      "category": "Exact existing category name",
      "items": ["Same existing items, reordered only within this category"]
    },
    ...
  ]
}`

export const PROJECTS_PROMPT_INSTRUCTIONS = `INSTRUCTIONS - PROJECT DESCRIPTION REWRITE ONLY:

1. PROJECT INVENTORY PRESERVATION:
   - Return every project you received in CURRENT PROJECTS.
   - Do not omit projects.
   - Do not add projects.
   - Do not reorder projects.
   - Copy each title exactly from REQUIRED PROJECT TITLES.
   - Do not change project periods or dates.

2. ALLOWED CHANGE:
   - Rewrite only the description text to emphasize job-relevant aspects.
   - Keep the description grounded in the original project facts.
   - Use transferable wording when useful, but never claim direct domain experience that the project does not prove.
   - Never inject the job's domain into an unrelated project.

${ORGANIC_KEYWORD_INTEGRATION_INSTRUCTIONS}

${GENUINE_RELEVANCE_FILTER_INSTRUCTIONS}

${CROSS_PROJECT_DEDUPLICATION_INSTRUCTIONS}

3. DESCRIPTION FORMAT:
   - The "description" field must remain an array with exactly 1 string.
   - Use one concise prose paragraph, no bullet points.
   - Prefer 2 direct sentences.
   - Preserve concrete numbers and metrics already present in the original project.
   - Never fabricate numbers, tools, results, responsibilities, or business impact.

4. MARKDOWN/HTML FORMAT COMPATIBILITY:
   - The final markdown renderer expects project titles and periods to remain separate from descriptions.
   - Do not include title or period text inside the description.
   - If the source resume uses project descriptions inside divs with style="text-align: justify;", preserve that convention in the final markdown flow.

5. VALIDATION CHECK:
   Before returning, verify:
   - Every required project title appears exactly once.
   - Project order matches CURRENT PROJECTS.
   - No project title, period, or date was changed.
   - No project was added or removed.
   - No unsupported fact was invented.

${FIT_CONTENT_SELF_REVIEW_INSTRUCTIONS}

Return JSON format:
{
  "projects": [
    {
      "title": "EXACT title from REQUIRED PROJECT TITLES",
      "description": [
        "Single concise prose paragraph with rewritten description only."
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
 * Build prompt for personalizing skills section
 */
export function buildSkillsPrompt(
  jobDetails: JobDetails,
  currentSkills: Array<{ category: string; items: string[] }>,
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

  const languageInstruction =
    language === "pt"
      ? "⚠️ OBRIGATÓRIO: Mantenha os nomes das categorias e habilidades EXATAMENTE como estão (podem estar em português ou inglês). NÃO traduza nomes de ferramentas, software ou tecnologias."
      : "⚠️ MANDATORY: Keep every category and skill name EXACTLY as provided. Do not translate, rename, add, or remove anything."

  const profileBlock = buildProfileBlock(jobProfile, "skills")
  const approvedSkillsSection =
    approvedSkills && approvedSkills.length > 0
      ? `\nUSER-APPROVED SKILLS (context only; do not add unless already present in USER'S CV SKILLS):\n${approvedSkills.join(", ")}\n`
      : ""

  return `${languageInstruction}

⚠️  CRITICAL: REORDER EXISTING PROFILE SKILLS ONLY (NO ADDITIONS OR REMOVALS)

JOB REQUIRED SKILLS (PRIORITIZE THESE):
${requisitosObrigatorios}

JOB DESIRED SKILLS (secondary priority):
${requisitosDesejaveis}

USER'S CV SKILLS (always included):
${JSON.stringify(currentSkills, null, 2)}

${approvedSkillsSection}

ALLOWED SKILLS (you MUST use ONLY these exact profile items, all exactly once):
Profile Skills: ${cvSkillItems.join(", ")}

EXACT PHRASES TO MATCH (from job):
${atsKeywords.exact_phrases.length > 0 ? atsKeywords.exact_phrases.join(", ") : "None extracted"}

STRUCTURED JOB PROFILE:
${profileBlock}

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

  const descriptionFormatInstruction =
    language === "pt"
      ? '=== IMPORTANTE: FORMATO OBRIGATÓRIO DOS PROJETOS ===\nReescreva TODOS os projetos recebidos, sem selecionar, omitir, adicionar ou reordenar projetos. Cada descrição deve ser texto corrido em parágrafo único, sem bullet points. Frase 1: o que foi feito + tecnologia/método principal. Frase 2: resultado mensurável ou impacto concreto (se disponível). Se não houver resultado mensurável, a frase 2 pode mencionar o contexto/finalidade do projeto. NUNCA usar 3 frases se 2 forem suficientes. Projetos acadêmicos com muitos dados: mencionar NO MÁXIMO 1 resultado quantitativo. O campo "description" continua sendo array com EXATAMENTE 1 elemento.'
      : '=== IMPORTANT: REQUIRED PROJECT FORMAT ===\nRewrite EVERY project received. Do not select, omit, add, or reorder projects. Each description must be continuous prose in a single paragraph, no bullet points. Sentence 1: what was done + the main technology/method. Sentence 2: measurable result or concrete impact if available; otherwise, use the project context/purpose. NEVER use 3 sentences if 2 are enough. For academic projects with many data points, mention AT MOST 1 quantitative result. The "description" field must remain an array with EXACTLY 1 element.'

  // Extract ATS keywords (6 types)
  const atsKeywords = extractATSKeywords(jobDetails)

  const profileBlock = buildProfileBlock(jobProfile, "projects")

  return `${languageInstruction}

⚠️  CRITICAL: KEEP TITLES UNCHANGED - REWRITE DESCRIPTIONS FOR ATS OPTIMIZATION

${descriptionFormatInstruction}

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
