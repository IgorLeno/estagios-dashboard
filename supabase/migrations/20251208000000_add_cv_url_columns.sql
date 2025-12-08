-- Migration: Add CV URL columns for multilingual resume support
-- Date: 2025-12-08
-- Description: Adds fields to store URLs of personalized resumes in Portuguese and English
--
-- Problem: PGRST204 error when saving vagas with generated CVs
-- Solution: Add arquivo_cv_url_pt and arquivo_cv_url_en columns to vagas_estagio table
--
-- Note: arquivo_cv_url is kept as legacy field for backward compatibility

-- Add new columns for multilingual CV URLs
ALTER TABLE vagas_estagio
ADD COLUMN IF NOT EXISTS arquivo_cv_url_pt TEXT,
ADD COLUMN IF NOT EXISTS arquivo_cv_url_en TEXT;

-- Add documentation comments
COMMENT ON COLUMN vagas_estagio.arquivo_cv_url_pt IS 'URL do currículo personalizado em português (formato PDF, base64 data URL)';
COMMENT ON COLUMN vagas_estagio.arquivo_cv_url_en IS 'URL do currículo personalizado em inglês (formato PDF, base64 data URL)';
