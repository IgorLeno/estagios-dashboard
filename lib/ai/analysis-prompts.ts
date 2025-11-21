// lib/ai/analysis-prompts.ts
import type { UserProfile } from "./user-profile"

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
 */
export function buildJobAnalysisPrompt(jobDescription: string, userProfile: UserProfile): string {
  const sanitizedDescription = sanitizeJobDescription(jobDescription)

  return `
Você é um Career Coach Specialist com 15 anos de experiência ajudando candidatos a se prepararem para processos seletivos.

ENTRADA:
1. Descrição da Vaga:
-----BEGIN JOB DESCRIPTION-----
${sanitizedDescription}
-----END JOB DESCRIPTION-----

2. Perfil do Candidato:
- Habilidades: ${userProfile.skills.join(", ")}
- Experiência: ${userProfile.experience.join("; ")}
- Formação: ${userProfile.education}
- Objetivos: ${userProfile.goals}

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
[Score de fit justificado (0-5 estrelas) com base em match de skills]
[Gaps identificados e sugestões práticas para endereçar antes da entrevista]

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
    "idioma_vaga": "pt" | "en"
  },
  "analise_markdown": "# Análise da Vaga - [Cargo] @ [Empresa]\\n\\n## 🏢 Sobre a Empresa\\n..."
}
\`\`\`

FORMATO FINAL:
NÃO retorne o markdown formatado separadamente.
Toda a análise markdown deve estar dentro do campo "analise_markdown" como string única.

CRÍTICO - ESCAPE DE CARACTERES ESPECIAIS:
- Use \\n para quebras de linha (não newlines literais)
- Escape aspas duplas como \\"
- Escape barras invertidas como \\\\
- O JSON deve ser VÁLIDO quando parseado por JSON.parse()
- Exemplo correto: "analise_markdown": "# Título\\n\\nTexto com \\"aspas\\""

IMPORTANTE:
- Use busca Google para encontrar informações reais sobre a empresa
- A análise deve ser personalizada com base no perfil do candidato
- Seja específico e prático nas recomendações
- Justifique o score de fit com exemplos concretos
- Se informações estiverem faltando na descrição:
  * Strings (empresa, cargo, local): use "" (string vazia)
  * Arrays: use [] (array vazio)
  * Salário: use null
  * Modalidade: use "Presencial" como padrão
  * Tipo da Vaga: use "Estágio" como padrão
  * Idioma: use "pt" como padrão
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
