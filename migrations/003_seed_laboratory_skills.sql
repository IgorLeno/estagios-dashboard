-- Migration: Add laboratory skills to Skills Bank
-- Date: 2025-12-11
-- Purpose: Add essential laboratory skills for chemistry/analytical jobs

-- NOTE: This migration uses auth.uid() which requires being run in authenticated context
-- For manual seeding, replace auth.uid() with specific user_id UUID

-- Insert laboratory skills for current authenticated user
-- Category: "Laboratório" (new category for lab-specific skills)

INSERT INTO user_skills_bank (user_id, skill_name, category, proficiency, created_at)
VALUES
  -- Core laboratory skills
  (auth.uid(), 'Preparação de soluções e reagentes', 'Laboratório', 'intermediário', now()),
  (auth.uid(), 'Titulações volumétricas', 'Laboratório', 'intermediário', now()),
  (auth.uid(), 'Síntese química', 'Laboratório', 'básico', now()),
  (auth.uid(), 'Controle de amostras', 'Laboratório', 'intermediário', now()),
  (auth.uid(), 'Organização de laboratório', 'Laboratório', 'intermediário', now()),
  (auth.uid(), 'Boas Práticas de Laboratório (BPL)', 'Laboratório', 'intermediário', now()),

  -- Quality standards and controls
  (auth.uid(), 'ISO 17025', 'Gestão de Qualidade', 'básico', now()),
  (auth.uid(), 'Controle de qualidade laboratorial', 'Gestão de Qualidade', 'intermediário', now()),
  (auth.uid(), 'Higiene ocupacional', 'Gestão de Qualidade', 'básico', now()),
  (auth.uid(), 'Meio ambiente (gestão de resíduos)', 'Gestão de Qualidade', 'intermediário', now()),

  -- Analytical techniques
  (auth.uid(), 'Química analítica qualitativa', 'Laboratório', 'intermediário', now()),
  (auth.uid(), 'Química analítica quantitativa', 'Laboratório', 'intermediário', now()),
  (auth.uid(), 'Físico-química experimental', 'Laboratório', 'intermediário', now()),
  (auth.uid(), 'Química orgânica experimental', 'Laboratório', 'básico', now())

ON CONFLICT (user_id, skill_name)
DO UPDATE SET
  category = EXCLUDED.category,
  proficiency = EXCLUDED.proficiency,
  updated_at = now();

-- Verify insertion
SELECT
  category,
  COUNT(*) as skills_count
FROM user_skills_bank
WHERE user_id = auth.uid()
GROUP BY category
ORDER BY category;
