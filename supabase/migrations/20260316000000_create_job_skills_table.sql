-- Migration: Create job_skills table for persisted reviewed skills per vaga
-- Description: Stores user-reviewed skills selections for each vaga

CREATE TABLE IF NOT EXISTS job_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES vagas_estagio(id) ON DELETE CASCADE,
  skills JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills(job_id);

CREATE OR REPLACE FUNCTION update_job_skills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_job_skills_updated_at ON job_skills;

CREATE TRIGGER trigger_update_job_skills_updated_at
BEFORE UPDATE ON job_skills
FOR EACH ROW
EXECUTE FUNCTION update_job_skills_updated_at();

ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on job_skills"
ON job_skills
FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON TABLE job_skills IS 'Stores reviewed skills selections for each vaga';
COMMENT ON COLUMN job_skills.job_id IS 'Foreign key to vagas_estagio table';
COMMENT ON COLUMN job_skills.skills IS 'Reviewed job skills payload stored as JSONB';
