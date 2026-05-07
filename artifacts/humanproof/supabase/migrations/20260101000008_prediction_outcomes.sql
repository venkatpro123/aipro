-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000008_prediction_outcomes.sql
-- Purpose:   Swarm learning store — records actual layoff outcomes vs. predictions.
--            Table may already exist from earlier migrations; this migration
--            ensures all required columns and indexes are present.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prediction_outcomes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_role    TEXT        NOT NULL,
  swarm_score     NUMERIC(5,1),
  engine_score    NUMERIC(5,1),
  actual_outcome  TEXT        NOT NULL,
  accuracy_score  NUMERIC(4,3),
  predicted_at    TIMESTAMPTZ,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns if table existed without them
ALTER TABLE prediction_outcomes ADD COLUMN IF NOT EXISTS swarm_score    NUMERIC(5,1);
ALTER TABLE prediction_outcomes ADD COLUMN IF NOT EXISTS engine_score   NUMERIC(5,1);
ALTER TABLE prediction_outcomes ADD COLUMN IF NOT EXISTS accuracy_score NUMERIC(4,3);
ALTER TABLE prediction_outcomes ADD COLUMN IF NOT EXISTS predicted_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_po_company_role ON prediction_outcomes (company_role);
CREATE INDEX IF NOT EXISTS idx_po_recorded_at  ON prediction_outcomes (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_accuracy     ON prediction_outcomes (accuracy_score DESC);

ALTER TABLE prediction_outcomes ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies safely (they may already exist)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prediction_outcomes' AND policyname = 'service_insert_outcomes'
  ) THEN
    EXECUTE 'CREATE POLICY "service_insert_outcomes" ON prediction_outcomes FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prediction_outcomes' AND policyname = 'read_prediction_outcomes'
  ) THEN
    EXECUTE 'CREATE POLICY "read_prediction_outcomes" ON prediction_outcomes FOR SELECT USING (true)';
  END IF;
END
$do$;
