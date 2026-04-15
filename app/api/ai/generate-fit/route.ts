import { NextRequest, NextResponse } from "next/server"
import { ZodError, z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getCandidateProfile } from "@/lib/supabase/candidate-profile"
import { createAIModel, loadUserAIConfig, validateAIConfig, AI_TIMEOUT_CONFIG } from "@/lib/ai/config"
import { withTimeout, TimeoutError } from "@/lib/ai/utils"
import { isValidModelId, DEFAULT_MODEL } from "@/lib/ai/models"

const GenerateFitRequestSchema = z.object({
  vagaId: z.string().uuid(),
  language: z.enum(["pt", "en"]),
  model: z.string().optional(),
})

/**
 * System prompt for fit generation.
 * Unlike the structured-JSON resume-generator, this endpoint requests plain markdown output
 * because the general curriculum is the structural baseline and only 3 sections are adapted.
 */
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

const FIT_SYSTEM_PROMPT = `You are a resume personalization assistant. Your task is to adapt a candidate's general curriculum to a specific job opportunity.

You will receive the candidate's general CV in markdown format and the job details.
You must return the COMPLETE adapted markdown — not just the sections that changed.

ABSOLUTE RULES — ZERO TOLERANCE FOR VIOLATIONS:

PRESERVE EXACTLY (do not change anything in these sections or elements):
- Contact header: name, email, phone, LinkedIn, GitHub, location — preserve character by character
- Education section: all degrees, institutions, dates, and locations
- Certifications section: all entries, exactly as written
- Languages section: all entries, exactly as written
- Section names, section order, and overall markdown structure
- Bold (**text**) and italic (_text_ or *text*) markers that are NOT in the three adaptable sections

WHAT YOU MAY ADAPT (only these three sections):
1. Professional Profile / Perfil Profissional: Rewrite to naturally incorporate the job's keywords and requirements. Keep similar length to the original (same approximate number of sentences).
${PROFESSIONAL_PROFILE_STRUCTURE_INSTRUCTIONS}

${CRITICAL_GAPS_INSTRUCTIONS}

2. Competencies / Competências: Reorder existing categories and existing items by relevance to the job. DO NOT add or remove any items or categories. Keep every item text exactly as written.
${SKILL_PRIORITY_HIERARCHY_INSTRUCTIONS}

3. Projects / Projetos: Rewrite only the description text to emphasize aspects relevant to the job. DO NOT change project titles, periods, or create new projects. Preserve any HTML formatting such as <div style="text-align: justify;">. Preserve bold (**text**) and italic (_text_) markers within project descriptions.
${ORGANIC_KEYWORD_INTEGRATION_INSTRUCTIONS}

${GENUINE_RELEVANCE_FILTER_INSTRUCTIONS}

${CROSS_PROJECT_DEDUPLICATION_INSTRUCTIONS}

ABSOLUTE PROHIBITIONS:
- Never invent skills, tools, metrics, certifications, experiences, or projects not present in the general CV
- Never change contact information, dates, project titles, institutions, or section names
- Never add or remove sections
- Never add or remove items from skill/competency categories
- Never change project titles or periods

${FIT_CONTENT_SELF_REVIEW_INSTRUCTIONS}

OUTPUT FORMAT:
- Return ONLY the complete markdown text of the adapted curriculum
- No preamble, no explanation, no code fences, no trailing text
- The output must follow exactly the same markdown pattern as the input general CV
`

function buildFitPrompt(
  baseMarkdown: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vaga: Record<string, any>,
  language: "pt" | "en"
): string {
  const langLabel = language === "pt" ? "Português (pt-BR)" : "English"

  const jobLines = [
    `Empresa: ${vaga.empresa || "N/A"}`,
    `Cargo: ${vaga.cargo || "N/A"}`,
    `Local: ${vaga.local || "N/A"}`,
    `Modalidade: ${vaga.modalidade || "N/A"}`,
    `Tipo: ${vaga.tipo_vaga || "N/A"}`,
    vaga.salario ? `Salário: ${vaga.salario}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const requisitos =
    Array.isArray(vaga.requisitos_obrigatorios) && vaga.requisitos_obrigatorios.length > 0
      ? `\nRequisitos Obrigatórios:\n${(vaga.requisitos_obrigatorios as string[]).map((r) => `- ${r}`).join("\n")}`
      : ""

  const desejaveis =
    Array.isArray(vaga.requisitos_desejaveis) && vaga.requisitos_desejaveis.length > 0
      ? `\nRequisitos Desejáveis:\n${(vaga.requisitos_desejaveis as string[]).map((r) => `- ${r}`).join("\n")}`
      : ""

  const responsabilidades =
    Array.isArray(vaga.responsabilidades) && vaga.responsabilidades.length > 0
      ? `\nResponsabilidades:\n${(vaga.responsabilidades as string[]).map((r) => `- ${r}`).join("\n")}`
      : ""

  return [
    `OUTPUT LANGUAGE: ${langLabel}`,
    "",
    "JOB DETAILS:",
    jobLines,
    requisitos,
    desejaveis,
    responsabilidades,
    "",
    "GENERAL CURRICULUM (mandatory structural base — adapt only the three sections specified in the rules):",
    baseMarkdown,
    "",
    "Return the complete adapted curriculum in markdown. Follow all rules above exactly.",
  ].join("\n")
}

/**
 * POST /api/ai/generate-fit
 *
 * Adapts the candidate's general curriculum to a specific job in a single LLM call.
 * Only three sections are modified: Professional Profile, Competencies, and Projects.
 * All other sections are preserved verbatim.
 *
 * Saves the result to curriculo_text_pt or curriculo_text_en and invalidates the PDF.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
    }

    const { vagaId, language, model } = GenerateFitRequestSchema.parse(body)

    console.log(`[Generate Fit API] Request: vaga ${vagaId}, language: ${language}`)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id

    await validateAIConfig(userId)

    // Load vaga
    const { data: vaga, error: vagaError } = await supabase
      .from("vagas_estagio")
      .select("*")
      .eq("id", vagaId)
      .single()

    if (vagaError || !vaga) {
      return NextResponse.json({ success: false, error: "Vaga not found" }, { status: 404 })
    }

    // Load candidate profile for the general curriculum markdown
    const candidateProfile = await getCandidateProfile(userId)

    // Choose the base resume markdown according to the requested language
    const baseMarkdown =
      language === "en"
        ? candidateProfile.curriculo_geral_md_en?.trim() || candidateProfile.curriculo_geral_md?.trim()
        : candidateProfile.curriculo_geral_md?.trim()

    if (!baseMarkdown) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Currículo geral não encontrado. Configure seu perfil em Configurações > Perfil antes de gerar o fit.",
        },
        { status: 400 }
      )
    }

    // Load user AI config and resolve model
    const config = await loadUserAIConfig(userId)
    const resolvedModel =
      model ??
      (config.modelo_gemini && isValidModelId(config.modelo_gemini) ? config.modelo_gemini : DEFAULT_MODEL)

    const aiModel = createAIModel(
      FIT_SYSTEM_PROMPT,
      {
        temperature: config.temperatura,
        maxOutputTokens: Math.max(config.max_tokens, 4096),
        topP: config.top_p,
        model: resolvedModel,
      },
      { userId }
    )

    const prompt = buildFitPrompt(baseMarkdown, vaga, language)

    const timeoutSeconds = Math.floor(AI_TIMEOUT_CONFIG.resumeGenerationTimeoutMs / 1000)
    const result = await withTimeout(
      aiModel.generateContent(prompt),
      AI_TIMEOUT_CONFIG.resumeGenerationTimeoutMs,
      `Fit generation exceeded ${timeoutSeconds}s timeout`
    )

    const markdown = result.response.text().trim()

    if (!markdown || markdown.length < 100) {
      throw new Error("LLM returned empty or insufficient markdown for the fit curriculum")
    }

    // Save to database and invalidate the existing PDF
    const markdownField = language === "pt" ? "curriculo_text_pt" : "curriculo_text_en"
    const pdfField = language === "pt" ? "arquivo_cv_url_pt" : "arquivo_cv_url_en"

    const { error: updateError } = await supabase
      .from("vagas_estagio")
      .update({
        [markdownField]: markdown,
        [pdfField]: null,
      })
      .eq("id", vagaId)

    if (updateError) {
      throw new Error(`Failed to save fit curriculum: ${updateError.message}`)
    }

    const duration = Date.now() - startTime
    console.log(
      `[Generate Fit API] ✅ Fit saved (${duration}ms, ${language.toUpperCase()}, model: ${resolvedModel})`
    )

    return NextResponse.json({
      success: true,
      data: { markdown, language },
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Generate Fit API] ❌ Error (${duration}ms):`, errorMessage)

    if (error instanceof TimeoutError) {
      return NextResponse.json({ success: false, error: (error as TimeoutError).message }, { status: 504 })
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
