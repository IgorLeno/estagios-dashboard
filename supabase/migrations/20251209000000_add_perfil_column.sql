-- ===================================
-- Migration: Adicionar coluna perfil
-- Data: 2025-12-09
-- Descrição: Adiciona coluna perfil (score de fit 0-5) na tabela vagas_estagio
-- ===================================

-- 1. Adicionar coluna perfil
ALTER TABLE vagas_estagio
ADD COLUMN perfil DECIMAL(3,2) DEFAULT NULL;

-- 2. Adicionar comentário explicativo
COMMENT ON COLUMN vagas_estagio.perfil IS
  'Score de fit entre perfil do candidato e descrição da vaga (0.00 a 5.00)';

-- 3. Adicionar constraint de range (0-5)
ALTER TABLE vagas_estagio
ADD CONSTRAINT perfil_range
CHECK (perfil >= 0 AND perfil <= 5);

-- 4. Criar índice para queries futuras
CREATE INDEX idx_vagas_estagio_perfil
ON vagas_estagio(perfil);
