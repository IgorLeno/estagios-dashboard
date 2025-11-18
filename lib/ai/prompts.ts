/**
 * Configuração de sanitização para prevenir prompt injection
 */
const MAX_DESCRIPTION_LENGTH = 10000 // Limite de caracteres para prevenir token-stuffing

/**
 * Sanitiza descrição de vaga para prevenir prompt injection
 * @param jobDescription - Descrição original da vaga
 * @returns Descrição sanitizada e truncada
 */
function sanitizeJobDescription(jobDescription: string): string {
  // Truncar para limite máximo
  let sanitized = jobDescription.slice(0, MAX_DESCRIPTION_LENGTH)
  
  // Remover delimitadores de instrução comuns antes de processar tokens
  // Code fences (```+ e ~~~+)
  sanitized = sanitized.replace(/```+/g, '[REDACTED_INSTRUCTION]')
  sanitized = sanitized.replace(/~~~+/g, '[REDACTED_INSTRUCTION]')
  
  // Delimitadores de prompt de instrução
  sanitized = sanitized.replace(/###+/g, '[REDACTED_INSTRUCTION]')
  sanitized = sanitized.replace(/\[INST\]/gi, '[REDACTED_INSTRUCTION]')
  sanitized = sanitized.replace(/\[\/INST\]/gi, '[REDACTED_INSTRUCTION]')
  sanitized = sanitized.replace(/<\|im_start\|>/gi, '[REDACTED_INSTRUCTION]')
  sanitized = sanitized.replace(/<\|im_end\|>/gi, '[REDACTED_INSTRUCTION]')
  
  // Outros marcadores de instrução entre colchetes
  sanitized = sanitized.replace(/\[(SYSTEM|USER|ASSISTANT|INSTRUCTION|PROMPT)\]/gi, '[REDACTED_INSTRUCTION]')
  sanitized = sanitized.replace(/\[\/(SYSTEM|USER|ASSISTANT|INSTRUCTION|PROMPT)\]/gi, '[REDACTED_INSTRUCTION]')
  
  // Neutralize instruction tokens: match at line start or after non-word characters (case-insensitive)
  // Pattern matches tokens at start of line or after non-alphanumeric/underscore characters
  const instructionPatterns = /(^|[^A-Za-z0-9_])(ignore|forget|skip|do not|don't|system|assistant|user):/gim
  sanitized = sanitized.replace(instructionPatterns, (match, prefix, token) => {
    // Replace token and colon with placeholder, preserve prefix if present
    return prefix + '[REDACTED_INSTRUCTION]'
  })
  
  return sanitized.trim()
}

/**
 * Prompt para extrair dados estruturados de descrições de vagas
 */
export function buildJobExtractionPrompt(jobDescription: string): string {
  // Sanitizar e delimitar conteúdo do usuário
  const sanitizedDescription = sanitizeJobDescription(jobDescription)
  
  return `
Você é um especialista em análise de vagas de emprego com mais de 10 anos de experiência.

Sua tarefa é extrair dados estruturados da descrição de vaga abaixo.

-----BEGIN JOB DESCRIPTION-----
${sanitizedDescription}
-----END JOB DESCRIPTION-----

CAMPOS A EXTRAIR:

1. **Empresa:** Nome completo da empresa
2. **Cargo:** Título exato da vaga
3. **Local:** Cidade, Estado, País OU "Remoto" se trabalho remoto
4. **Modalidade:** EXATAMENTE um dos valores: "Presencial" | "Híbrido" | "Remoto"
5. **Tipo da Vaga:** EXATAMENTE um dos valores: "Estágio" | "Júnior" | "Pleno" | "Sênior"
6. **Requisitos Obrigatórios:** Array de habilidades, experiências ou formação obrigatórias
7. **Requisitos Desejáveis:** Array de qualificações nice-to-have
8. **Responsabilidades:** Array de principais atividades do cargo
9. **Benefícios:** Array de benefícios oferecidos (vale refeição, plano de saúde, etc)
10. **Salário:** Faixa salarial como string OU null se não mencionado
11. **Idioma da Vaga:** "pt" se a vaga está em português, "en" se em inglês

REGRAS CRÍTICAS:
- Extraia EXATAMENTE como escrito na descrição original
- Se uma informação não estiver presente, use [] (array vazio) ou null
- Os campos modalidade e tipo_vaga DEVEM usar EXATAMENTE um dos valores permitidos
- Preserve palavras-chave originais (importante para ATS - Applicant Tracking Systems)
- Não invente informações - se não está na descrição, deixe vazio

FORMATO DE SAÍDA:

Retorne APENAS um objeto JSON válido dentro de um code fence, seguindo este formato exato:

\`\`\`json
{
  "empresa": "Nome da Empresa",
  "cargo": "Título da Vaga",
  "local": "Cidade, Estado",
  "modalidade": "Presencial" | "Híbrido" | "Remoto",
  "tipo_vaga": "Estágio" | "Júnior" | "Pleno" | "Sênior",
  "requisitos_obrigatorios": ["skill1", "skill2"],
  "requisitos_desejaveis": ["skill1", "skill2"],
  "responsabilidades": ["atividade1", "atividade2"],
  "beneficios": ["beneficio1", "beneficio2"],
  "salario": "R$ 2000-3000" | null,
  "idioma_vaga": "pt" | "en"
}
\`\`\`

Retorne SOMENTE o JSON. Não adicione explicações antes ou depois.
`.trim()
}

/**
 * System prompt que define o papel do agente
 */
export const SYSTEM_PROMPT = `
Você é um Senior Job Posting Analyst especializado em extrair dados estruturados de descrições de vagas.

Você processou mais de 10.000 vagas do LinkedIn, Indeed, Gupy e sites de empresas.

Você identifica com 100% de precisão:
- Informações da empresa e cargo
- Requisitos obrigatórios vs desejáveis
- Responsabilidades e benefícios
- Modalidade de trabalho (presencial/híbrido/remoto)
- Nível de senioridade

Você sempre retorna JSON válido dentro de code fence markdown.
`.trim()
