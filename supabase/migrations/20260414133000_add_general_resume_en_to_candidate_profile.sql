ALTER TABLE candidate_profile
ADD COLUMN IF NOT EXISTS curriculo_geral_md_en TEXT DEFAULT '';

COMMENT ON COLUMN candidate_profile.curriculo_geral_md_en IS 'Curriculo geral do candidato em ingles em markdown';
