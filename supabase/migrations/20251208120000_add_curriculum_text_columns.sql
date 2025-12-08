-- Migration: Add curriculum text columns for markdown preview
-- Date: 2025-12-08
-- Description: Adds fields to store markdown text of personalized resumes
--
-- Problem: Preview do currículo gerado não está sendo salvo ao clicar em "Salvar Vaga"
-- Solution: Add curriculo_text_pt and curriculo_text_en columns to vagas_estagio table
--
-- These fields store the editable markdown preview, allowing users to:
-- 1. Generate curriculum preview (markdown)
-- 2. Edit the markdown before generating PDF
-- 3. Save the vaga with the preview text persisted
-- 4. View the preview in vaga details page even if PDF wasn't generated

-- Add columns for curriculum markdown text
ALTER TABLE vagas_estagio
ADD COLUMN IF NOT EXISTS curriculo_text_pt TEXT,
ADD COLUMN IF NOT EXISTS curriculo_text_en TEXT;

-- Add documentation comments
COMMENT ON COLUMN vagas_estagio.curriculo_text_pt IS 'Texto markdown do currículo personalizado em português (preview editável)';
COMMENT ON COLUMN vagas_estagio.curriculo_text_en IS 'Texto markdown do currículo personalizado em inglês (preview editável)';
