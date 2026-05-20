-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260519000005_prediction_ledger.sql
-- Purpose:   Forward prediction log — converts collapse detection into a
--            continuously growing public evidence trail.
--
-- DESIGN INTENT
-- ─────────────
-- The accuracy compounding effect of the collapse detection system only works
-- if predictions are logged BEFORE outcomes materialise. This table is the
-- tamper-evident record that proves predictions were made on a given date,
-- not retrofitted after the fact.
--
-- Every row in this table represents one forward prediction:
--   "On <prediction_date>, we detected <predicted_stage> signals at <company>
--    and logged this prediction with status='monitoring'. We did not know
--    the outcome when this row was written."
--
-- When an outcome is later confirmed (layoff announced):
--   UPDATE prediction_ledger SET status='confirmed_accurate', outcome_date=...
--   WHERE company_name=... AND status='monitoring';
--
-- The is_retroactive flag is always false when written by the cron. It exists
-- only so that any manually inserted rows (e.g. for backfill research) can be
-- clearly distinguished from the continuously running system.
--
-- ACCURACY MEASUREMENT
-- ────────────────────
-- SELECT
--   predicted_stage,
--   COUNT(*) AS total,
--   COUNT(*) FILTER (WHERE status = 'confirmed_accurate') AS confirmed,
--   ROUND(
--     COUNT(*) FILTER (WHERE status = 'confirmed_accurate')::NUMERIC
--     / NULLIF(COUNT(*), 0) * 100, 1
--   ) AS accuracy_pct
-- FROM prediction_ledger
-- WHERE is_retroactive = false
--   AND prediction_date < CURRENT_DATE - INTERVAL '180 days'  -- past maturity
-- GROUP BY predicted_stage;
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prediction_ledger (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      TEXT        NOT NULL,
  industry          TEXT        NOT NULL DEFAULT 'unknown',
  region            TEXT,
  -- Prediction
  prediction_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  predicted_stage   SMALLINT    NOT NULL CHECK (predicted_stage IN (1, 2, 3)),
  predicted_signals TEXT[]      NOT NULL,    -- names of active signals at prediction time
  overall_risk      SMALLINT,               -- 0–100 severity-weighted risk score
  signal_confidence NUMERIC(4,3),           -- 0–1 severity-weighted confidence
  is_promoted       BOOLEAN     NOT NULL DEFAULT false,
  -- Status lifecycle: monitoring → confirmed_accurate | confirmed_inaccurate | expired
  status            TEXT        NOT NULL DEFAULT 'monitoring'
    CHECK (status IN ('monitoring', 'confirmed_accurate', 'confirmed_inaccurate', 'expired')),
  -- Forward prediction provenance
  is_retroactive    BOOLEAN     NOT NULL DEFAULT false,
  -- Who wrote this row
  predicted_by_run_id TEXT,                 -- cron run UUID from predict-collapse-weekly
  predicted_by_source TEXT DEFAULT 'predict-collapse-weekly',
  -- Outcome (populated when status changes from monitoring)
  outcome_date      DATE,
  outcome_source    TEXT,                   -- 'warn_act' | 'layoffs_fyi' | 'news' | 'user_reported'
  outcome_notes     TEXT,
  -- Signal snapshot at prediction time (full CollapseReport JSON for auditability)
  signal_snapshot   JSONB,
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One prediction per company per day. Weekly cron + 7-day lookback prevents
  -- redundant entries; daily uniqueness prevents duplicate runs from same day.
  UNIQUE (company_name, prediction_date)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary read path: all active monitoring predictions
CREATE INDEX IF NOT EXISTS pl_status_date_idx
  ON prediction_ledger (status, prediction_date DESC)
  WHERE status = 'monitoring';

-- Accuracy measurement query: mature predictions by stage
CREATE INDEX IF NOT EXISTS pl_stage_date_idx
  ON prediction_ledger (predicted_stage, prediction_date DESC)
  WHERE is_retroactive = false;

-- Company lookup for "has this company been predicted recently?"
CREATE INDEX IF NOT EXISTS pl_company_date_idx
  ON prediction_ledger (LOWER(company_name), prediction_date DESC);

-- Outcome confirmation path
CREATE INDEX IF NOT EXISTS pl_outcome_idx
  ON prediction_ledger (outcome_date DESC)
  WHERE outcome_date IS NOT NULL;

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_pl_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER prediction_ledger_updated_at
  BEFORE UPDATE ON prediction_ledger
  FOR EACH ROW EXECUTE FUNCTION set_pl_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE prediction_ledger ENABLE ROW LEVEL SECURITY;

-- Public read: prediction ledger is a public evidence trail by design.
-- Users can verify that predictions were made before outcomes were known.
CREATE POLICY "pl_public_read"
  ON prediction_ledger FOR SELECT
  USING (true);

-- Only service_role (cron / Edge Function) can write.
CREATE POLICY "pl_service_write"
  ON prediction_ledger FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Accuracy view ─────────────────────────────────────────────────────────────
-- Materialized-style view for the public-facing accuracy dashboard.
-- Filters to non-retroactive predictions older than 180 days (past maturity window).
CREATE OR REPLACE VIEW prediction_ledger_accuracy AS
SELECT
  predicted_stage,
  COUNT(*)                                                              AS total_predictions,
  COUNT(*) FILTER (WHERE status = 'confirmed_accurate')                AS confirmed_accurate,
  COUNT(*) FILTER (WHERE status = 'confirmed_inaccurate')              AS confirmed_inaccurate,
  COUNT(*) FILTER (WHERE status = 'monitoring')                        AS still_monitoring,
  COUNT(*) FILTER (WHERE status = 'expired')                           AS expired,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'confirmed_accurate')::NUMERIC
    / NULLIF(
        COUNT(*) FILTER (WHERE status IN ('confirmed_accurate', 'confirmed_inaccurate')),
        0
    ) * 100,
    1
  )                                                                     AS accuracy_pct,
  ROUND(AVG(overall_risk), 1)                                          AS avg_overall_risk,
  MIN(prediction_date)                                                  AS earliest_prediction,
  MAX(prediction_date)                                                  AS latest_prediction
FROM prediction_ledger
WHERE is_retroactive = false
  AND prediction_date < CURRENT_DATE - INTERVAL '180 days'
GROUP BY predicted_stage
ORDER BY predicted_stage;

-- ── pg_cron: predict-collapse-weekly ─────────────────────────────────────────
-- Runs at 08:00 UTC Monday — two hours after refresh-market-intelligence (06:00)
-- so the company_intelligence data refreshed by that job is available.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('predict-collapse-weekly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'predict-collapse-weekly');

    PERFORM cron.schedule(
      'predict-collapse-weekly',
      '0 8 * * 1',
      $job$SELECT net.http_post(
        url     := current_setting('app.supabase_url') || '/functions/v1/predict-collapse-weekly',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
          'Content-Type',  'application/json'
        ),
        body    := '{}'::jsonb
      )$job$
    );
    RAISE NOTICE 'predict-collapse-weekly scheduled at 08:00 UTC Monday.';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — predict-collapse-weekly not scheduled.';
  END IF;
END
$do$;
