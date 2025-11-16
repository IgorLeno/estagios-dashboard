-- Migration: Add is_test_data column to separate test data from production
-- Date: 2025-11-16
-- Execute this in Supabase SQL Editor

-- =============================================================================
-- STEP 1: Add is_test_data column
-- =============================================================================

-- Add boolean column to mark test data (default: false = production data)
ALTER TABLE vagas_estagio
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN vagas_estagio.is_test_data IS
'Flag to identify data created by E2E tests. true = test data, false = production data';

-- =============================================================================
-- STEP 2: Create index for filtering performance
-- =============================================================================

-- Create index to improve query performance when filtering test data
CREATE INDEX IF NOT EXISTS idx_vagas_estagio_is_test_data
ON vagas_estagio(is_test_data);

-- =============================================================================
-- STEP 3: Mark existing test data
-- =============================================================================

-- Mark vagas with test patterns in observacoes field
UPDATE vagas_estagio
SET is_test_data = true
WHERE observacoes LIKE '%Vaga de teste E2E%'
   OR observacoes LIKE '%[E2E-TEST]%'
   OR observacoes LIKE '%[TEST]%'
   OR empresa LIKE '%[E2E-TEST]%'
   OR empresa LIKE '%[TEST]%';

-- =============================================================================
-- STEP 4: Verification queries
-- =============================================================================

-- Count total test vagas after marking
SELECT COUNT(*) as total_test_vagas
FROM vagas_estagio
WHERE is_test_data = true;

-- List some test vagas to verify
SELECT id, empresa, cargo, observacoes, is_test_data
FROM vagas_estagio
WHERE is_test_data = true
LIMIT 10;

-- Count production vagas (should be your real data)
SELECT COUNT(*) as total_production_vagas
FROM vagas_estagio
WHERE is_test_data = false;

-- =============================================================================
-- STEP 5: (Optional) Update RLS policies
-- =============================================================================

-- Note: RLS policies are kept simple. Filtering is done in application code.
-- If you have existing RLS policies, they will continue to work.
-- No changes needed to RLS for basic implementation.

-- To manually filter test data in production via RLS (optional):
-- DROP POLICY IF EXISTS "Enable read access for all users" ON vagas_estagio;
--
-- CREATE POLICY "Enable read access for production data" ON vagas_estagio
-- FOR SELECT
-- USING (is_test_data = false);

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================

-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_vagas_estagio_is_test_data;
-- ALTER TABLE vagas_estagio DROP COLUMN IF EXISTS is_test_data;
