/**
 * Builds a Portuguese prompt that instructs an analyst to extract structured job-posting data from a provided job description.
 *
 * @param jobDescription - The job description text to embed in the prompt.
 * @returns The prompt text (in Portuguese) that directs extraction into a fixed JSON schema and enforces output rules, including producing a single JSON object inside a code fence with the fields: "empresa", "cargo", "local", "modalidade", "tipo_vaga", "requisitos_obrigatorios", "requisitos_desejaveis", "responsabilidades", "beneficios", "salario", and "idioma_vaga".
 */
export function buildJobExtractionPrompt(jobDescription: string): string {
  return `
Você é um especialista em análise de vagas de emprego com mais de 10 anos de experiência.

Sua tarefa é extrair dados estruturados da descrição de vaga abaixo.

DESCRIÇÃO DA VAGA:
${jobDescription}

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