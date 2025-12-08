-- Migration: Add separate fields for PT and EN curriculum PDFs
-- Date: 2025-12-08
-- Description: Allows saving both Portuguese and English curriculum versions separately

-- Add new columns for language-specific curriculum PDFs
ALTER TABLE vagas_estagio
  ADD COLUMN IF NOT EXISTS arquivo_cv_url_pt TEXT,
  ADD COLUMN IF NOT EXISTS arquivo_cv_url_en TEXT;

-- Add comment for documentation
COMMENT ON COLUMN vagas_estagio.arquivo_cv_url_pt IS 'URL do currículo PDF em Português (base64 data URL)';
COMMENT ON COLUMN vagas_estagio.arquivo_cv_url_en IS 'URL do currículo PDF em Inglês (base64 data URL)';
COMMENT ON COLUMN vagas_estagio.arquivo_cv_url IS 'URL do currículo PDF (legacy field, pode conter PT ou EN)';

-- Migration rollback (if needed):
-- ALTER TABLE vagas_estagio DROP COLUMN IF EXISTS arquivo_cv_url_pt;
-- ALTER TABLE vagas_estagio DROP COLUMN IF EXISTS arquivo_cv_url_en;
