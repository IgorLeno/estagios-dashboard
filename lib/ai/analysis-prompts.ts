// lib/ai/analysis-prompts.ts

/**
 * Max description length for prompt injection prevention
 */
const MAX_DESCRIPTION_LENGTH = 10000

/**
 * Sanitizes job description to prevent prompt injection
 */
function sanitizeJobDescription(jobDescription: string): string {
  let sanitized = jobDescription.slice(0, MAX_DESCRIPTION_LENGTH)

  // Remove code fences
  sanitized = sanitized.replace(/```+/g, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/~~~+/g, "[REDACTED_INSTRUCTION]")

  // Remove instruction delimiters
  sanitized = sanitized.replace(/###+/g, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/\[INST\]/gi, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/\[\/INST\]/gi, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/<\|im_start\|>/gi, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/<\|im_end\|>/gi, "[REDACTED_INSTRUCTION]")

  // Remove instruction tokens at line start
  const instructionPatterns = /(^|[^A-Za-z0-9_])(ignore|forget|skip|do not|don't|system|assistant|user):/gim
  sanitized = sanitized.replace(instructionPatterns, (match, prefix) => {
    return prefix + "[REDACTED_INSTRUCTION]"
  })

  return sanitized.trim()
}

/**
 * Builds prompt for job analysis generation
 * @param jobDescription - Job description text
 * @param dossiePrompt - Complete candidate profile from config.dossie_prompt
 */
export function buildJobAnalysisPrompt(jobDescription: string, dossiePrompt: string): string {
  const sanitizedDescription = sanitizeJobDescription(jobDescription)

  return `
Você é um Career Coach Specialist com 15 anos de experiência ajudando candidatos a se prepararem para processos seletivos.

ENTRADA:
1. Descrição da Vaga:
-----BEGIN JOB DESCRIPTION-----
${sanitizedDescription}
-----END JOB DESCRIPTION-----

2. Perfil do Candidato:
${dossiePrompt}

TAREFA:
1. Extraia dados estruturados (empresa, cargo, local, modalidade, etc.) - JSON
2. Busque informações atualizadas sobre a empresa (cultura, valores, notícias recentes, LinkedIn, Glassdoor)
3. Gere análise detalhada em Markdown seguindo estrutura exata abaixo

ESTRUTURA DA ANÁLISE (markdown):

# Análise da Vaga - [Cargo] @ [Empresa]

## 🏢 Sobre a Empresa
[Contexto da empresa baseado em fontes externas: setor, tamanho, cultura, valores]
[Pontos interessantes do LinkedIn, Glassdoor, site oficial, notícias recentes]
[Use busca Google para encontrar informações reais e atualizadas]

## 💡 Oportunidades para se Destacar
[Como o perfil do candidato pode agregar valor específico para esta vaga]
[Diferenciais técnicos e culturais alinhados com requisitos]
[Áreas onde candidato pode brilhar e se destacar dos demais]

## 🎯 Fit Técnico e Cultural
[Análise detalhada de alinhamento com requisitos obrigatórios]
[Score de fit de requisitos (requisitos_score: 0-5 estrelas) baseado em match técnico]
[Score de fit de perfil (fit: 0-5 estrelas) baseado em alinhamento cultural e soft skills]
[Gaps identificados e sugestões práticas para endereçar antes da entrevista]

**CÁLCULO DOS SCORES (0-5 estrelas):**
- **requisitos_score**: Avalie match técnico do candidato com requisitos obrigatórios da vaga
  * 5.0 = Match perfeito (90-100% dos requisitos obrigatórios)
  * 4.0-4.5 = Match muito bom (70-89% dos requisitos)
  * 3.0-3.5 = Match médio (50-69% dos requisitos)
  * 2.0-2.5 = Match baixo (30-49% dos requisitos)
  * 0.0-1.5 = Match muito baixo (<30% dos requisitos)

- **fit**: Avalie fit de perfil/cultural do candidato com a vaga e empresa
  * 5.0 = Fit perfeito (experiência, objetivos e cultura altamente alinhados)
  * 4.0-4.5 = Fit muito bom (alinhamento forte com pequenos gaps)
  * 3.0-3.5 = Fit médio (alinhamento razoável com gaps moderados)
  * 2.0-2.5 = Fit baixo (alinhamento fraco)
  * 0.0-1.5 = Fit muito baixo (desalinhamento significativo)

## 🗣️ Preparação para Entrevista
[3-5 perguntas inteligentes para fazer ao recrutador/gestor]
[Tópicos técnicos para estudar antes da entrevista]
[Red flags ou pontos de atenção identificados na vaga]

## 📋 Requisitos e Responsabilidades
**Requisitos Obrigatórios:**
- [lista de requisitos obrigatórios extraídos da vaga]

**Requisitos Desejáveis:**
- [lista de requisitos desejáveis extraídos da vaga]

**Responsabilidades:**
- [lista de responsabilidades extraídas da vaga]

FORMATO DE SAÍDA JSON:

Retorne APENAS um objeto JSON válido dentro de code fence markdown:

\`\`\`json
{
  "structured_data": {
    "empresa": "Nome da Empresa" ou "",
    "cargo": "Título da Vaga" ou "",
    "local": "Cidade, Estado" ou "",
    "modalidade": "Presencial" | "Híbrido" | "Remoto",
    "tipo_vaga": "Estágio" | "Júnior" | "Pleno" | "Sênior",
    "requisitos_obrigatorios": ["skill1", "skill2"] ou [],
    "requisitos_desejaveis": ["skill1", "skill2"] ou [],
    "responsabilidades": ["atividade1", "atividade2"] ou [],
    "beneficios": ["beneficio1", "beneficio2"] ou [],
    "salario": "R$ 2000-3000" ou null,
    "idioma_vaga": "pt" | "en",
    "requisitos_score": 4.5,
    "fit": 4.0,
    "etapa": "Indefinido",
    "status": "Pendente"
  },
  "analise_markdown": "# Análise da Vaga - [Cargo] @ [Empresa]\\n\\n## 🏢 Sobre a Empresa\\n..."
}
\`\`\`

FORMATO FINAL:
NÃO retorne o markdown formatado separadamente.
Toda a análise markdown deve estar dentro do campo "analise_markdown" como string única.

🚨 CRÍTICO - ESCAPE DE CARACTERES ESPECIAIS 🚨:

OBRIGATÓRIO para o campo "analise_markdown":
1. SUBSTITUIR todas quebras de linha por \\n (backslash + n)
   ❌ ERRADO: "texto\n" (newline literal)
   ✅ CORRETO: "texto\\n"

2. ESCAPAR todas aspas duplas com backslash
   ❌ ERRADO: "texto com "aspas""
   ✅ CORRETO: "texto com \\"aspas\\""

3. ESCAPAR todas barras invertidas
   ❌ ERRADO: "caminho\arquivo"
   ✅ CORRETO: "caminho\\arquivo"

4. O JSON DEVE SER 100% VÁLIDO quando testado com JSON.parse()

Exemplo COMPLETO correto:
"analise_markdown": "# Análise da Vaga\\n\\n## 🏢 Sobre a Empresa\\nTexto com \\"aspas\\" e quebras de linha."

⚠️  SE O JSON NÃO FOR VÁLIDO, A RESPOSTA SERÁ REJEITADA.

IMPORTANTE:
- Use busca Google para encontrar informações reais sobre a empresa
- A análise deve ser personalizada com base no perfil do candidato
- Seja específico e prático nas recomendações
- **OBRIGATÓRIO: Calcule requisitos_score e fit com base nas escalas acima**
- Justifique os scores de fit na seção "🎯 Fit Técnico e Cultural" com exemplos concretos
- Se informações estiverem faltando na descrição:
  * Strings (empresa, cargo, local): use "" (string vazia)
  * Arrays: use [] (array vazio)
  * Salário: use null
  * requisitos_score e fit: SEMPRE calcule baseado nas escalas (NUNCA null)
  * Modalidade: use "Presencial" como padrão
  * Tipo da Vaga: use "Estágio" como padrão
  * Idioma: use "pt" como padrão
  * etapa: use "Indefinido" como padrão
  * status: use "Pendente" como padrão
- Retorne SOMENTE o JSON, sem texto antes ou depois
`.trim()
}

/**
 * System prompt for analysis generation
 */
export const ANALYSIS_SYSTEM_PROMPT = `
Você é um Senior Career Coach e Job Posting Analyst com 15 anos de experiência.

Você processou mais de 10.000 vagas e ajudou centenas de candidatos a se prepararem para entrevistas.

Você identifica com precisão:
- Informações sobre empresa e cultura (usando busca externa quando necessário)
- Requisitos obrigatórios vs desejáveis
- Oportunidades para candidato se destacar
- Fit técnico e cultural com justificativas
- Estratégias de preparação para entrevista

Você sempre:
- Usa busca Google para encontrar dados reais sobre empresas
- Personaliza análise com base no perfil do candidato
- Retorna JSON válido dentro de code fence markdown
- Fornece insights acionáveis e práticos
`.trim()
