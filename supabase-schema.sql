-- Schema SQL para Supabase - Dashboard de Estágios
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- TABELAS
-- ============================================

-- Tabela de vagas de estágio
CREATE TABLE IF NOT EXISTS vagas_estagio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Dados principais
  data_inscricao DATE NOT NULL,
  empresa TEXT NOT NULL,
  cargo TEXT NOT NULL,
  local TEXT NOT NULL,
  modalidade TEXT NOT NULL CHECK (modalidade IN ('Presencial', 'Híbrido', 'Remoto')),

  -- Score e fit (escala 0-5 com incrementos de 0.5)
  requisitos NUMERIC(3,1) CHECK (requisitos >= 0 AND requisitos <= 5), -- Fit de Requisitos 0-5 (0.0, 0.5, 1.0, ..., 5.0)
  fit NUMERIC(3,1) CHECK (fit >= 0 AND fit <= 5), -- Fit Geral 0-5 (0.0, 0.5, 1.0, ..., 5.0)

  -- Acompanhamento
  etapa TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Avançado', 'Melou', 'Contratado')),
  observacoes TEXT,

  -- Arquivos
  arquivo_analise_url TEXT, -- URL do arquivo .md de análise
  arquivo_cv_url TEXT -- URL do currículo PDF/DOCX
);

-- Tabela de metas diárias
CREATE TABLE IF NOT EXISTS metas_diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data DATE UNIQUE NOT NULL,
  meta INTEGER NOT NULL DEFAULT 0 CHECK (meta >= 0)
);

-- Tabela de configurações
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Horário de trabalho (usado para determinar "dia" das inscrições)
  hora_inicio TIME DEFAULT '06:00:00',
  hora_termino TIME DEFAULT '05:59:00'
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vagas_data_inscricao ON vagas_estagio(data_inscricao DESC);
CREATE INDEX IF NOT EXISTS idx_vagas_empresa ON vagas_estagio(empresa);
CREATE INDEX IF NOT EXISTS idx_vagas_status ON vagas_estagio(status);
CREATE INDEX IF NOT EXISTS idx_vagas_modalidade ON vagas_estagio(modalidade);
CREATE INDEX IF NOT EXISTS idx_vagas_local ON vagas_estagio(local);
CREATE INDEX IF NOT EXISTS idx_metas_data ON metas_diarias(data DESC);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vagas_estagio_updated_at ON vagas_estagio;
CREATE TRIGGER update_vagas_estagio_updated_at
  BEFORE UPDATE ON vagas_estagio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON configuracoes;
CREATE TRIGGER update_configuracoes_updated_at
  BEFORE UPDATE ON configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Dashboard é público (acesso por link), então permitir tudo

ALTER TABLE vagas_estagio ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para acesso público
CREATE POLICY "Permitir acesso público completo" ON vagas_estagio
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso público completo" ON metas_diarias
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso público completo" ON configuracoes
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STORAGE BUCKET PARA ARQUIVOS
-- ============================================
-- Execute via interface do Supabase Storage:
-- 1. Criar bucket "analises" (público)
-- 2. Criar bucket "curriculos" (público)
-- 3. Configurar políticas de storage para permitir upload/download público

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Inserir configuração padrão se não existir
INSERT INTO configuracoes (hora_inicio, hora_termino)
SELECT '06:00:00', '05:59:00'
WHERE NOT EXISTS (SELECT 1 FROM configuracoes LIMIT 1);
