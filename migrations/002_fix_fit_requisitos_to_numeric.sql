-- Fix fit and requisitos fields to accept decimal values (0-5 in 0.5 intervals)
-- Migration: 002_fix_fit_requisitos_to_numeric
-- Date: 2025-01-19

-- ============================================
-- DROP CONSTRAINTS
-- ============================================

-- Remove existing check constraints
ALTER TABLE vagas_estagio DROP CONSTRAINT IF EXISTS vagas_estagio_requisitos_check;
ALTER TABLE vagas_estagio DROP CONSTRAINT IF EXISTS vagas_estagio_fit_check;

-- ============================================
-- ALTER COLUMN TYPES
-- ============================================

-- Change requisitos to NUMERIC(3,1) (0-5 with 0.5 increments)
-- Convert existing data: 100 → 5.0, 80 → 4.0, 0 → 0.0
-- Handles NULL, empty strings, and invalid values
ALTER TABLE vagas_estagio
  ALTER COLUMN requisitos TYPE NUMERIC(3,1)
  USING CASE
    WHEN requisitos IS NULL THEN NULL
    WHEN NULLIF(requisitos::TEXT, '') IS NULL THEN NULL
    WHEN requisitos::NUMERIC > 5 THEN ROUND((requisitos::NUMERIC / 100.0) * 5.0 * 2) / 2 -- Scale 0-100 → 0-5
    ELSE ROUND(requisitos::NUMERIC * 2) / 2 -- Already in 0-5 scale
  END;

-- Change fit to NUMERIC(3,1) (0-5 with 0.5 increments)
-- Convert existing data: 10 → 5.0, 8 → 4.0, 0 → 0.0
-- Handles NULL, empty strings, and invalid values
ALTER TABLE vagas_estagio
  ALTER COLUMN fit TYPE NUMERIC(3,1)
  USING CASE
    WHEN fit IS NULL THEN NULL
    WHEN NULLIF(fit::TEXT, '') IS NULL THEN NULL
    WHEN fit::NUMERIC > 5 THEN ROUND((fit::NUMERIC / 10.0) * 5.0 * 2) / 2 -- Scale 0-10 → 0-5
    ELSE ROUND(fit::NUMERIC * 2) / 2 -- Already in 0-5 scale
  END;

-- ============================================
-- ADD NEW CONSTRAINTS (0-5 range)
-- ============================================

ALTER TABLE vagas_estagio
  ADD CONSTRAINT vagas_estagio_requisitos_check
    CHECK (requisitos IS NULL OR (requisitos >= 0 AND requisitos <= 5));

ALTER TABLE vagas_estagio
  ADD CONSTRAINT vagas_estagio_fit_check
    CHECK (fit IS NULL OR (fit >= 0 AND fit <= 5));

-- ============================================
-- VALIDATION
-- ============================================

-- Show updated column types
DO $$
BEGIN
  RAISE NOTICE '✓ Migration completed successfully';
  RAISE NOTICE '  - requisitos: INTEGER (0-100) → NUMERIC(3,1) (0-5)';
  RAISE NOTICE '  - fit: INTEGER (0-10) → NUMERIC(3,1) (0-5)';
  RAISE NOTICE '  - Valid values: 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0';
END $$;
