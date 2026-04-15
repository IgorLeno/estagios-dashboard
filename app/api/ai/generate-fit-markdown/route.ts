import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getCandidateProfile } from "@/lib/supabase/candidate-profile"
import { callGrok, validateGrokConfig } from "@/lib/ai/grok-client"
import { loadUserAIConfig } from "@/lib/ai/config"
import { DEFAULT_MODEL, isValidModelId } from "@/lib/ai/models"
import type { FitToneOptions } from "@/lib/ai/types"

// ─── Request schema ───────────────────────────────────────────────────────────

const GenerateFitMarkdownSchema = z.object({
  jobDescription: z.string().min(20, "Job description too short").max(50000),
  jobAnalysisData: z
    .object({
      empresa: z.string().optional(),
      cargo: z.string().optional(),
      local: z.string().optional(),
      modalidade: z.string().optional(),
      tipo_vaga: z.string().optional(),
      requisitos_obrigatorios: z.array(z.string()).optional(),
      requisitos_desejaveis: z.array(z.string()).optional(),
      responsabilidades: z.array(z.string()).optional(),
      idioma_vaga: z.string().optional(),
    })
    .nullable()
    .optional(),
  language: z.enum(["pt", "en"]).default("pt"),
  toneOptions: z
    .object({
      estilo: z
        .enum(["padrao", "tecnico_formal", "executivo", "conversacional", "personalizado_estilo"])
        .default("padrao"),
      estilo_customizado: z.string().optional(),
      foco: z.enum(["padrao", "keywords", "resultados", "competencias", "personalizado_foco"]).default("padrao"),
      foco_customizado: z.string().optional(),
      enfase: z.enum(["padrao", "academica", "pratica", "lideranca", "personalizado_enfase"]).default("padrao"),
      enfase_customizado: z.string().optional(),
    })
    .optional(),
  model: z.string().optional(),
})

// ─── Tone instructions builder ────────────────────────────────────────────────

function buildToneInstructions(toneOptions: FitToneOptions): string {
  const instructions: string[] = []

  // Estilo de Escrita
  if (toneOptions.estilo === "tecnico_formal") {
    instructions.push(
      "Use linguagem técnica e formal, com alta densidade de terminologia especializada e termos precisos do setor"
    )
  } else if (toneOptions.estilo === "executivo") {
    instructions.push(
      "Use linguagem orientada a negócios e impacto, concisa e focada em resultados e valor gerado"
    )
  } else if (toneOptions.estilo === "conversacional") {
    instructions.push(
      "Use linguagem fluida e acessível, natural e sem jargões desnecessários — adequado para recrutadores não técnicos"
    )
  } else if (toneOptions.estilo === "personalizado_estilo" && toneOptions.estilo_customizado?.trim()) {
    instructions.push(toneOptions.estilo_customizado.trim())
  }

  // Foco de Conteúdo
  if (toneOptions.foco === "keywords") {
    instructions.push(
      "Integre palavras-chave da vaga de forma orgânica nas seções relevantes, sem colar expressões como sufixos de frases completas"
    )
  } else if (toneOptions.foco === "resultados") {
    instructions.push("Priorize descrições que evidenciem resultados concretos e métricas quantitativas")
  } else if (toneOptions.foco === "competencias") {
    instructions.push("Coloque as competências técnicas mais relevantes para a vaga em destaque em todas as seções")
  } else if (toneOptions.foco === "personalizado_foco" && toneOptions.foco_customizado?.trim()) {
    instructions.push(toneOptions.foco_customizado.trim())
  }

  // Ênfase de Carreira
  if (toneOptions.enfase === "academica") {
    instructions.push("Destaque formação, pesquisas e projetos acadêmicos como diferenciais")
  } else if (toneOptions.enfase === "pratica") {
    instructions.push("Destaque aplicações práticas, projetos reais e resultados de implementação")
  } else if (toneOptions.enfase === "lideranca") {
    instructions.push("Destaque iniciativas próprias, autonomia e capacidade de liderança de projetos")
  } else if (toneOptions.enfase === "personalizado_enfase" && toneOptions.enfase_customizado?.trim()) {
    instructions.push(toneOptions.enfase_customizado.trim())
  }

  if (instructions.length === 0) return ""
  return "\n\nADDITIONAL TONE REQUIREMENTS (apply to all generated sections):\n" + instructions.map((i) => `- ${i}`).join("\n")
}

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

// [FIX-v3] F1 — negrito apenas em métricas e resultados concretos
const BOLD_METRICS_COMPACT = `REGRA DE NEGRITO (OBRIGATÓRIO):
Use negrito APENAS em números, métricas e resultados concretos (R², MRD, MAD, contagens).
NUNCA em expressões adaptadas da vaga — isso sinaliza ao recrutador que o texto foi modificado.
❌ **consolidando relatórios gerenciais** / **elaborando apresentações estratégicas** / **análise de dados de produtividade**
✅ **R² = 0,997** / **MRD = 1,93%** / **MAD = 40,06 kJ/mol** / **29.000 moléculas**`

// [FIX-v3] F2 — sustentabilidade em entrevista
const SUSTAINABILITY_COMPACT = `TESTE DE SUSTENTABILIDADE (OBRIGATÓRIO):
Aplique o teste: o candidato consegue detalhar com exemplo concreto de projeto acadêmico?
Se não, reformule para o nível que consegue defender.
Nunca eleve projeto científico ao nível de experiência operacional profissional
(OEE, planos de ação, apresentações estratégicas corporativas).`

// [FIX-v3] F3 — calibração de vocabulário por família de vaga
const VOCABULARY_CALIBRATION_COMPACT = `CALIBRAÇÃO DE VOCABULÁRIO POR FAMÍLIA DE VAGA (OBRIGATÓRIO):
Identifique a natureza da vaga: laboratorial/química, operacional/industrial ou dados/análise.
Para vagas híbridas: perfil segue vocabulário da natureza PRIMÁRIA, projetos descrevem valor
transferível compatível com a natureza SECUNDÁRIA.
NUNCA use vocabulário de gestão/estratégia em vaga laboratorial.
NUNCA use linguagem científica pesada como destaque em vaga operacional.
Projetos de pesquisa científica: descreva pelo valor transferível honesto, não pelo vocabulário da vaga.`

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
[ ] Algum negrito foi usado em expressão adaptada da vaga em vez
    de em métrica ou resultado concreto?
[ ] Alguma afirmação do perfil não resistiria a "onde exatamente
    você fez isso?" numa entrevista?
[ ] Algum projeto descreve valor transferível como se fosse
    experiência operacional profissional direta?
[ ] O vocabulário do perfil está calibrado para a natureza da
    vaga (laboratorial, operacional ou dados)?
[ ] Se a vaga é híbrida: o perfil segue a natureza primária e
    os projetos o valor transferível compatível com a secundária?

Se qualquer item estiver marcado como problema, corrija antes de retornar.`

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(language: "pt" | "en"): string {
  const isPt = language === "pt"

  const sectionNames = isPt
    ? "## PERFIL PROFISSIONAL, ## COMPETÊNCIAS, ## PROJETOS RELEVANTES, ## CERTIFICAÇÕES"
    : "## PROFESSIONAL PROFILE, ## COMPETENCIES, ## RELEVANT PROJECTS, ## CERTIFICATIONS"

  const profileSection = isPt ? "PERFIL PROFISSIONAL" : "PROFESSIONAL PROFILE"
  const competenciesSection = isPt ? "COMPETÊNCIAS" : "COMPETENCIES"
  const projectsSection = isPt ? "PROJETOS RELEVANTES" : "RELEVANT PROJECTS"
  const certificationsSection = isPt ? "CERTIFICAÇÕES" : "CERTIFICATIONS"
  const languagesCategory = isPt ? "Idiomas" : "Languages"

  return `You are a resume personalization assistant. Your task is to generate 4 personalized sections of a resume adapted to a specific job opportunity.

You will receive the candidate's general CV in markdown format and the job details.
Return ONLY the 4 sections listed below, adapted to the job. Do NOT include header, contact info, or education section.

SECTIONS TO GENERATE (in this exact order): ${sectionNames}

RULES FOR EACH SECTION:

1. ## ${profileSection}:
   - Rewrite the profile from the general CV to naturally incorporate the job's keywords and requirements
   - Keep similar length to the original (same approximate number of sentences)

${VOCABULARY_CALIBRATION_COMPACT}

${PROFESSIONAL_PROFILE_STRUCTURE_INSTRUCTIONS}

${CRITICAL_GAPS_INSTRUCTIONS}

${SUSTAINABILITY_COMPACT}

2. ## ${competenciesSection}:
   - Reorder existing categories and existing items by relevance to the job
   - The LAST category MUST ALWAYS be ${languagesCategory}
   - Do NOT add or remove any items or categories
   - Keep every item text exactly as written in the general CV

${SKILL_PRIORITY_HIERARCHY_INSTRUCTIONS}

3. ## ${projectsSection}:
   - Rewrite only the description text to emphasize aspects relevant to the job
   - Maintain project titles, periods, and any divs with style="text-align: justify;"
   - Do NOT create new projects
   - Preserve bold (**text**) and italic (_text_) markers within descriptions

${BOLD_METRICS_COMPACT}

${ORGANIC_KEYWORD_INTEGRATION_INSTRUCTIONS}

${GENUINE_RELEVANCE_FILTER_INSTRUCTIONS}

${SUSTAINABILITY_COMPACT}

${CROSS_PROJECT_DEDUPLICATION_INSTRUCTIONS}

4. ## ${certificationsSection}:
   - Keep all entries exactly as written in the general CV
   - Only reorder by relevance to the job

ABSOLUTE PROHIBITIONS:
- Never invent skills, tools, metrics, certifications, experiences, or projects not present in the general CV
- Never change project titles or periods
- Never add or remove items from skill/competency categories

${FIT_CONTENT_SELF_REVIEW_INSTRUCTIONS}

OUTPUT FORMAT:
- Return ONLY the 4 sections in markdown
- Start directly with ## ${profileSection}
- No preamble, no explanation, no code fences, no trailing text`
}

function buildUserPrompt(
  baseMarkdown: string,
  jobDescription: string,
  jobAnalysisData: Record<string, unknown> | null | undefined,
  language: "pt" | "en",
  toneInstructions: string
): string {
  const langLabel = language === "pt" ? "Português (pt-BR)" : "English"

  const jobLines: string[] = [`OUTPUT LANGUAGE: ${langLabel}`, "", "JOB DESCRIPTION:", jobDescription]

  if (jobAnalysisData) {
    const structured: string[] = []
    if (jobAnalysisData.empresa) structured.push(`Company: ${jobAnalysisData.empresa}`)
    if (jobAnalysisData.cargo) structured.push(`Position: ${jobAnalysisData.cargo}`)
    if (jobAnalysisData.local) structured.push(`Location: ${jobAnalysisData.local}`)
    if (jobAnalysisData.modalidade) structured.push(`Work mode: ${jobAnalysisData.modalidade}`)
    if (jobAnalysisData.tipo_vaga) structured.push(`Job level: ${jobAnalysisData.tipo_vaga}`)

    const req = jobAnalysisData.requisitos_obrigatorios
    if (Array.isArray(req) && req.length > 0) {
      structured.push(`Required skills: ${(req as string[]).join("; ")}`)
    }
    const des = jobAnalysisData.requisitos_desejaveis
    if (Array.isArray(des) && des.length > 0) {
      structured.push(`Desired skills: ${(des as string[]).join("; ")}`)
    }
    const resp = jobAnalysisData.responsabilidades
    if (Array.isArray(resp) && resp.length > 0) {
      structured.push(`Responsibilities: ${(resp as string[]).join("; ")}`)
    }

    if (structured.length > 0) {
      jobLines.push("", "STRUCTURED JOB DATA:", ...structured)
    }
  }

  if (toneInstructions) {
    jobLines.push(toneInstructions)
  }

  jobLines.push(
    "",
    "GENERAL CURRICULUM (structural base — use only what exists here, do not invent):",
    baseMarkdown,
    "",
    "Generate the 4 sections now. Follow all rules exactly."
  )

  return jobLines.join("\n")
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/generate-fit-markdown
 *
 * Generates 4 personalized CV sections (Profile, Competencies, Projects, Certifications)
 * adapted to a job description, with optional tone customization.
 * Does NOT require a saved vagaId — designed for the "Add Vaga" modal flow.
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

    const { jobDescription, jobAnalysisData, language, toneOptions, model } =
      GenerateFitMarkdownSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id

    await validateGrokConfig(userId)

    const candidateProfile = await getCandidateProfile(userId)

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

    const config = await loadUserAIConfig(userId)
    const resolvedModel =
      model ??
      (config.modelo_gemini && isValidModelId(config.modelo_gemini) ? config.modelo_gemini : DEFAULT_MODEL)

    const toneInstructions = toneOptions ? buildToneInstructions(toneOptions as FitToneOptions) : ""

    const response = await callGrok(
      [
        { role: "system", content: buildSystemPrompt(language) },
        {
          role: "user",
          content: buildUserPrompt(
            baseMarkdown,
            jobDescription,
            jobAnalysisData as Record<string, unknown> | null | undefined,
            language,
            toneInstructions
          ),
        },
      ],
      {
        model: resolvedModel,
        temperature: config.temperatura ?? 0.7,
        max_tokens: Math.max(config.max_tokens ?? 4096, 4096),
        top_p: config.top_p ?? 0.9,
      },
      { userId }
    )

    const markdown = response.content.trim()

    if (!markdown || markdown.length < 100) {
      throw new Error("LLM returned empty or insufficient markdown for the fit sections")
    }

    const duration = Date.now() - startTime
    console.log(`[generate-fit-markdown] ✅ Done (${duration}ms, ${language}, model: ${resolvedModel})`)

    return NextResponse.json({
      success: true,
      data: { markdown },
      metadata: {
        duration,
        model: resolvedModel,
        tokenUsage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      },
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[generate-fit-markdown] ❌ Error (${duration}ms):`, errorMessage)

    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request data", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
