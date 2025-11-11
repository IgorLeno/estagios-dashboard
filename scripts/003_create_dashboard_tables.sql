-- Criar tabela de vagas de estágio (inscrições que você fez)
CREATE TABLE IF NOT EXISTS vagas_estagio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_inscricao DATE NOT NULL DEFAULT CURRENT_DATE,
  empresa TEXT NOT NULL,
  cargo TEXT NOT NULL,
  local TEXT NOT NULL,
  modalidade TEXT NOT NULL, -- Presencial, Híbrido, Remoto
  requisitos TEXT,
  fit INTEGER CHECK (fit >= 0 AND fit <= 100), -- 0-100%
  etapa TEXT, -- Ex: Inscrição, Triagem, Entrevista
  status TEXT NOT NULL, -- Ex: Aguardando, Em processo, Aprovado, Reprovado
  observacoes TEXT,
  arquivo_analise_url TEXT, -- URL do arquivo .md de análise
  arquivo_cv_url TEXT -- URL do arquivo PDF/DOCX do CV
);

-- Criar tabela de metas diárias
CREATE TABLE IF NOT EXISTS metas_diarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data DATE NOT NULL UNIQUE,
  meta INTEGER NOT NULL DEFAULT 0
);

-- Criar tabela de configurações
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hora_inicio TIME NOT NULL DEFAULT '09:00:00',
  hora_termino TIME NOT NULL DEFAULT '18:00:00'
);

-- Inserir configuração padrão
INSERT INTO configuracoes (hora_inicio, hora_termino)
VALUES ('09:00:00', '18:00:00')
ON CONFLICT DO NOTHING;

-- RLS policies para acesso público (já que é seu dashboard pessoal)
ALTER TABLE vagas_estagio ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para acesso total (dashboard pessoal)
CREATE POLICY "Permitir acesso total a vagas_estagio" ON vagas_estagio
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total a metas_diarias" ON metas_diarias
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total a configuracoes" ON configuracoes
  FOR ALL USING (true) WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vagas_estagio_data ON vagas_estagio(data_inscricao);
CREATE INDEX IF NOT EXISTS idx_vagas_estagio_status ON vagas_estagio(status);
CREATE INDEX IF NOT EXISTS idx_vagas_estagio_empresa ON vagas_estagio(empresa);
CREATE INDEX IF NOT EXISTS idx_metas_diarias_data ON metas_diarias(data);
