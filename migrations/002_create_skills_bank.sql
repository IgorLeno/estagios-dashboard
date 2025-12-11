-- Migration 002: Create user_skills_bank table
-- Purpose: Store user-managed inventory of additional skills with proficiency levels
-- Run: supabase db push

-- Create user_skills_bank table
CREATE TABLE IF NOT EXISTS user_skills_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- ✅ NOT NULL adicionado
  skill_name TEXT NOT NULL,
  proficiency TEXT NOT NULL CHECK (
    proficiency IN ('Básico', 'Intermediário', 'Avançado')
  ),
  category TEXT NOT NULL CHECK (
    category IN (
      'Linguagens & Análise de Dados',
      'Ferramentas de Engenharia',
      'Visualização & BI',
      'Soft Skills'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- ✅ NOT NULL adicionado
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- ✅ NOT NULL adicionado

  -- Prevent duplicate skills per user
  CONSTRAINT unique_user_skill UNIQUE(user_id, skill_name)  -- ✅ Nome da constraint adicionado
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_skills_bank_user_id ON user_skills_bank(user_id);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_skills_bank_category ON user_skills_bank(category);

-- Enable Row Level Security
ALTER TABLE user_skills_bank ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view only their own skills
CREATE POLICY "Users can view own skills"
  ON user_skills_bank FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert only their own skills
CREATE POLICY "Users can insert own skills"
  ON user_skills_bank FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update only their own skills
CREATE POLICY "Users can update own skills"
  ON user_skills_bank FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);  -- ✅ WITH CHECK adicionado

-- RLS Policy: Users can delete only their own skills
CREATE POLICY "Users can delete own skills"
  ON user_skills_bank FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_skills_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on row update
DROP TRIGGER IF EXISTS update_skills_bank_timestamp ON user_skills_bank;
CREATE TRIGGER update_skills_bank_timestamp
  BEFORE UPDATE ON user_skills_bank
  FOR EACH ROW
  EXECUTE FUNCTION update_skills_bank_updated_at();

-- Table and column comments
COMMENT ON TABLE user_skills_bank IS 'User-managed inventory of additional skills with proficiency levels for ATS-optimized resume generation';
COMMENT ON COLUMN user_skills_bank.skill_name IS 'Name of the skill (e.g., Docker, ISO 17025, TensorFlow)';
COMMENT ON COLUMN user_skills_bank.proficiency IS 'User proficiency level: Básico | Intermediário | Avançado';
COMMENT ON COLUMN user_skills_bank.category IS 'Skill category: Linguagens & Análise de Dados | Ferramentas de Engenharia | Visualização & BI | Soft Skills';
