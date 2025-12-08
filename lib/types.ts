export interface VagaEstagio {
  id: string
  created_at: string
  updated_at: string
  data_inscricao: string
  empresa: string
  cargo: string
  local: string
  modalidade: "Presencial" | "Híbrido" | "Remoto"
  /**
   * Fit de Requisitos - Avaliação estrelar 0-5
   * - Range válido: 0.0 a 5.0
   * - Incrementos: 0.5
   * - Valores percentuais (0-100) são automaticamente convertidos via normalizeRatingForSave()
   * - Exemplo: 85% → 4.5 estrelas
   */
  requisitos?: number
  /**
   * Fit de Perfil - Avaliação estrelar 0-5
   * - Range válido: 0.0 a 5.0
   * - Incrementos: 0.5
   * - Valores em escala 0-10 ou 0-100 são automaticamente convertidos via normalizeRatingForSave()
   * - Exemplo: 8/10 → 4.0 estrelas
   */
  perfil?: number
  etapa?: string
  status: "Pendente" | "Avançado" | "Melou" | "Contratado"
  observacoes?: string
  arquivo_analise_url?: string
  /** @deprecated Legacy field - use arquivo_cv_url_pt or arquivo_cv_url_en instead */
  arquivo_cv_url?: string
  arquivo_cv_url_pt?: string // URL do currículo PDF em Português (base64 data URL)
  arquivo_cv_url_en?: string // URL do currículo PDF em Inglês (base64 data URL)
  is_test_data?: boolean // Flag to identify E2E test data (true = test, false = production)
}

export interface MetaDiaria {
  id: string
  created_at: string
  data: string
  meta: number
}

/**
 * @deprecated Configuração de horários customizáveis foi removida.
 * O sistema agora usa horário fixo de meia-noite (00:00) como início do dia.
 * Esta interface é mantida apenas para compatibilidade com o banco de dados.
 */
export interface Configuracao {
  id: string
  created_at: string
  updated_at: string
  /** @deprecated Não mais utilizado. O dia sempre começa à meia-noite (00:00). */
  hora_inicio: string
  /** @deprecated Não mais utilizado. O dia sempre termina às 23:59. */
  hora_termino: string
}

export interface HistoricoResumo {
  data: string
  meta: number
  candidaturas: number
}

export interface StatusResumo {
  status: string
  numero: number
  vagas: VagaEstagio[]
}

export interface LocalResumo {
  local: string
  numero: number
  vagas: VagaEstagio[]
}

/**
 * Configuração de Prompts para LLM (Gemini)
 * Permite personalização dos prompts usados no Job Parser e Resume Generator
 */
export interface PromptsConfig {
  id: string
  user_id?: string // Optional for non-authenticated usage
  created_at: string
  updated_at: string

  // Modelo e Configurações
  modelo_gemini: string // e.g., "gemini-2.5-flash"
  temperatura: number // 0.0 - 1.0
  max_tokens: number // Max output tokens
  top_p?: number // Optional: 0.0 - 1.0
  top_k?: number // Optional: 1 - 40

  // Prompts Editáveis
  dossie_prompt: string // Perfil completo do candidato para análise de fit
  analise_prompt: string // Prompt para análise de compatibilidade vaga/candidato
  curriculo_prompt: string // Prompt para personalização do currículo
}

/**
 * Valores padrão para PromptsConfig
 * Usados quando o usuário não tem configuração customizada
 */
export const DEFAULT_PROMPTS_CONFIG: Omit<PromptsConfig, "id" | "user_id" | "created_at" | "updated_at"> = {
  modelo_gemini: "gemini-2.5-flash",
  temperatura: 0.3,
  max_tokens: 4096,
  top_p: 0.95,
  top_k: 40,

  dossie_prompt: `Você é um analisador de compatibilidade entre candidatos e vagas de emprego.

PERFIL DO CANDIDATO:
- Nome: Igor Leno de Souza Fernandes
- Formação: Engenharia Química (UNESP) - Conclusão prevista: 12/2026
- Localização: Bertioga/SP
- Principais Habilidades: Excel Avançado, Python, SQL, Power BI, Aspen Plus
- Experiência: Pesquisa acadêmica em Machine Learning aplicado a processos químicos
- Certificações: Deep Learning (Coursera), Power BI, SQL, Google Data Analytics
- Idiomas: Inglês Avançado
- Interesses: QHSE (Qualidade, Saúde, Segurança, Meio Ambiente), Controle Técnico, Análise de Dados

OBJETIVO:
Analisar vagas de estágio/emprego e calcular fit (0-5 estrelas) entre o candidato e a vaga.

CRITÉRIOS DE FIT:
✅ 5.0 estrelas: Match perfeito (90%+ dos requisitos atendidos)
✅ 4.0-4.5 estrelas: Muito bom (70-89% dos requisitos)
✅ 3.0-3.5 estrelas: Bom (50-69% dos requisitos)
✅ 2.0-2.5 estrelas: Razoável (30-49% dos requisitos)
✅ 0.5-1.5 estrelas: Baixo (0-29% dos requisitos)`,

  analise_prompt: `Analise a compatibilidade entre o candidato e a vaga fornecida.

VAGA:
{job_description}

INSTRUÇÕES:
1. Extraia os requisitos obrigatórios e desejáveis da vaga
2. Compare com o perfil do candidato (do dossiê)
3. Calcule o fit de requisitos (0-5 estrelas)
4. Calcule o fit de perfil (0-5 estrelas)
5. Identifique pontos fortes e fracos
6. Gere recomendações de preparação

FORMATO DE SAÍDA (JSON):
{
  "requisitos_fit": 4.5,
  "perfil_fit": 4.0,
  "pontos_fortes": ["Excel Avançado", "Python"],
  "pontos_fracos": ["Falta experiência industrial"],
  "recomendacoes": ["Enfatizar projetos acadêmicos", "Destacar certificações"]
}`,

  curriculo_prompt: `⚠️ REGRAS CRÍTICAS - ZERO TOLERÂNCIA PARA VIOLAÇÕES:

1. NUNCA invente habilidades, ferramentas, certificações ou experiências
2. NUNCA adicione novas habilidades à lista (APENAS reordene as existentes)
3. NUNCA mude títulos ou datas de projetos (APENAS reescreva descrições)
4. NUNCA invente métricas ou conquistas não presentes no CV original
5. APENAS reordene e enfatize conteúdo existente - SEM invenção

O QUE VOCÊ PODE FAZER:
✅ Reescrever resumo para incluir palavras-chave da vaga (80-120 palavras)
✅ Reordenar habilidades dentro de categorias por relevância à vaga
✅ Reescrever descrições de projetos para enfatizar aspectos relevantes à vaga

O QUE VOCÊ NÃO PODE FAZER:
❌ Adicionar habilidades/ferramentas não presentes na lista original
❌ Adicionar certificações não presentes na lista original
❌ Mudar títulos ou datas de projetos
❌ Inventar novos projetos ou experiências
❌ Adicionar métricas/números não presentes no CV original
❌ Mudar informações de contato

VALIDAÇÃO:
Seu output será validado contra schemas rigorosos. Qualquer conteúdo inventado será rejeitado.
Se os requisitos da vaga pedirem habilidades não presentes no CV, NÃO as adicione - apenas enfatize habilidades relacionadas existentes.`,
}
