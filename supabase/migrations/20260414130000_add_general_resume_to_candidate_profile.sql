-- Migration: Add general resume markdown to candidate profile
-- Description: Stores the user's base/general resume markdown for profile-level resume workflows.

ALTER TABLE candidate_profile
ADD COLUMN IF NOT EXISTS curriculo_geral_md TEXT DEFAULT '';

COMMENT ON COLUMN candidate_profile.curriculo_geral_md IS 'Currículo geral do candidato em markdown, usado como base para currículos personalizados por vaga';
