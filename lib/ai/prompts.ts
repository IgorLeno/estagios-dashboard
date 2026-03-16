import { sanitizeUserInput } from "./prompt-utils"

/**
 * Prompt para extrair dados estruturados de descrições de vagas
 */
export function buildJobExtractionPrompt(jobDescription: string): string {
  // Sanitizar e delimitar conteúdo do usuário
  const sanitizedDescription = sanitizeUserInput(jobDescription)

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
- Se uma informação não estiver presente:
  * Strings (empresa, cargo, local): use "" (string vazia)
  * Arrays: use [] (array vazio)
  * Salário: use null
  * Modalidade: use "Presencial" como padrão se não especificado
  * Tipo da Vaga: use "Estágio" como padrão se não especificado
  * Idioma: use "pt" como padrão
- Os campos modalidade e tipo_vaga DEVEM usar EXATAMENTE um dos valores permitidos
- Preserve palavras-chave originais (importante para ATS - Applicant Tracking Systems)
- Não invente informações - se não está na descrição, use os valores padrão acima

FORMATO DE SAÍDA:

Retorne APENAS um objeto JSON válido dentro de um code fence, seguindo este formato exato:

\`\`\`json
{
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
