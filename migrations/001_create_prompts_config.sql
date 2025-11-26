-- Migration: Create prompts_config table
-- Description: Stores user-customizable prompts for AI features (Job Parser, Resume Generator)
-- Author: Claude Code
-- Date: 2025-01-26

-- Create table
CREATE TABLE IF NOT EXISTS prompts_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Modelo e Configurações
  modelo_gemini TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  temperatura FLOAT NOT NULL DEFAULT 0.3 CHECK (temperatura >= 0.0 AND temperatura <= 1.0),
  max_tokens INTEGER NOT NULL DEFAULT 4096 CHECK (max_tokens > 0 AND max_tokens <= 32768),
  top_p FLOAT DEFAULT 0.95 CHECK (top_p IS NULL OR (top_p >= 0.0 AND top_p <= 1.0)),
  top_k INTEGER DEFAULT 40 CHECK (top_k IS NULL OR (top_k >= 1 AND top_k <= 100)),

  -- Prompts Editáveis
  dossie_prompt TEXT NOT NULL,
  analise_prompt TEXT NOT NULL,
  curriculo_prompt TEXT NOT NULL
);

-- Create index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_prompts_config_user_id ON prompts_config(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_prompts_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prompts_config_updated_at
  BEFORE UPDATE ON prompts_config
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_config_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE prompts_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view own prompts config
CREATE POLICY "Users can view own prompts config"
  ON prompts_config
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can insert own prompts config
CREATE POLICY "Users can insert own prompts config"
  ON prompts_config
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can update own prompts config
CREATE POLICY "Users can update own prompts config"
  ON prompts_config
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can delete own prompts config
CREATE POLICY "Users can delete own prompts config"
  ON prompts_config
  FOR DELETE
  USING (auth.uid() = user_id);

-- Insert default configuration for non-authenticated users (user_id = NULL)
INSERT INTO prompts_config (
  user_id,
  modelo_gemini,
  temperatura,
  max_tokens,
  top_p,
  top_k,
  dossie_prompt,
  analise_prompt,
  curriculo_prompt
) VALUES (
  NULL, -- Global default config
  'gemini-2.5-flash',
  0.3,
  4096,
  0.95,
  40,
  'Você é um analisador de compatibilidade entre candidatos e vagas de emprego.

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
✅ 0.5-1.5 estrelas: Baixo (0-29% dos requisitos)',
  'Analise a compatibilidade entre o candidato e a vaga fornecida.

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
}',
  '⚠️ REGRAS CRÍTICAS - ZERO TOLERÂNCIA PARA VIOLAÇÕES:

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
Se os requisitos da vaga pedirem habilidades não presentes no CV, NÃO as adicione - apenas enfatize habilidades relacionadas existentes.'
) ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE prompts_config IS 'User-customizable prompts for AI features (Job Parser, Resume Generator)';
COMMENT ON COLUMN prompts_config.user_id IS 'User ID from auth.users. NULL = default global config';
COMMENT ON COLUMN prompts_config.modelo_gemini IS 'Gemini model name (e.g., gemini-2.5-flash, gemini-2.5-pro)';
COMMENT ON COLUMN prompts_config.temperatura IS 'Temperature for LLM generation (0.0 = deterministic, 1.0 = creative)';
COMMENT ON COLUMN prompts_config.max_tokens IS 'Maximum output tokens per LLM request';
COMMENT ON COLUMN prompts_config.dossie_prompt IS 'Candidate profile prompt for fit analysis';
COMMENT ON COLUMN prompts_config.analise_prompt IS 'Job analysis prompt for compatibility calculation';
COMMENT ON COLUMN prompts_config.curriculo_prompt IS 'Resume personalization prompt';
