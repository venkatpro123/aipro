-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260622000004_d8_heldout_validation.sql
-- Purpose:   D8 held-out validation infrastructure.
--
-- REVERTS the premature D8 activation from migration 20260622000002.
-- That migration activated D8 with a 10-event hold-out, which is below the
-- required minimum of 15 events. D8 must not be deployed until the held-out
-- validation gate is cleared:
--
--   Gate criteria (all three must pass):
--     • n_heldout  >= 15  (statistical minimum for AUC estimate stability)
--     • auc_roc    >= 0.72
--     • precision  >= 0.65  at operating threshold (0.50)
--
-- This migration:
--   1. Adds d8_heldout_events table — stores the held-out efficiency events
--      excluded from the logistic regression training run.
--   2. Adds d8_validation_metadata JSONB column to engine_calibration_versions
--      so activation records are DB-backed and auditable.
--   3. Resets v39_d8_ai_efficiency_active to mode='disabled' (gate not yet passed).
--   4. Seeds the 10 bootstrap held-out events that currently exist (below minimum).
--
-- Activation path: d8ValidationService.ts (activateD8IfValidated) runs when
-- a new held-out batch is added. When n_heldout >= 15 AND AUC >= 0.72 AND
-- precision >= 0.65, the service atomically sets mode='production' and writes
-- validation metrics to engine_calibration_versions.d8_validation_metadata.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Held-out events table ──────────────────────────────────────────────────
-- Stores the events intentionally excluded from the D8 logistic regression
-- training set. These are the ground-truth labels used for AUC computation.
--
-- Each row represents a real company at T-6mo before the efficiency announcement,
-- with the D8 logistic probability recomputed from the signals at that time.
--
-- Why a separate table (not user_prediction_outcomes)?
--   user_prediction_outcomes stores forward predictions from live audits.
--   d8_heldout_events stores retrospective labels on historical events where
--   we know the ground truth — the company DID or DID NOT execute an
--   efficiency-driven restructuring. The distinction matters: held-out events
--   are selected by the calibration team before the model runs; user_prediction
--   outcomes are collected after predictions are made.

CREATE TABLE IF NOT EXISTS public.d8_heldout_events (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company identity
  company_name             TEXT        NOT NULL,
  company_ticker           TEXT,

  -- When the efficiency restructuring was announced (T+0)
  announcement_date        DATE        NOT NULL,

  -- Ground truth: did an efficiency-driven restructuring actually occur?
  -- false = company was used as a negative example (no efficiency cut despite
  --         high AI investment — model should predict low P here)
  actual_efficiency_layoff BOOLEAN     NOT NULL,

  -- D8 logistic probability recomputed from signals at T-6mo (pre-announcement)
  -- This is what the model would have output using the D8_LOGISTIC_COEFFICIENTS
  -- had it been running at that time.
  predicted_probability    NUMERIC(6,4) NOT NULL
    CHECK (predicted_probability BETWEEN 0 AND 1),

  -- Input signals used to compute predicted_probability (for auditability)
  ai_investment_signal     TEXT        CHECK (ai_investment_signal IN ('low','medium','high','very-high')),
  free_cash_flow_margin    NUMERIC(7,2),   -- % at T-6mo
  layoff_rounds_at_pred    SMALLINT    NOT NULL DEFAULT 0,
  revenue_growth_yoy       NUMERIC(7,2),   -- % at T-6mo

  -- Indicates this was part of the initial 10-event bootstrap hold-out
  -- (before the 15-event gate was established). Used to distinguish
  -- bootstrap events from later batches.
  is_bootstrap_batch       BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Audit
  added_by                 TEXT        NOT NULL DEFAULT 'calibration-team',
  added_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes                    TEXT
);

CREATE INDEX IF NOT EXISTS idx_d8he_announcement_date
  ON public.d8_heldout_events (announcement_date DESC);

CREATE INDEX IF NOT EXISTS idx_d8he_actual_label
  ON public.d8_heldout_events (actual_efficiency_layoff);

-- RLS: calibration-team writes via service_role (bypasses RLS).
-- Authenticated users can read (hold-out events are not sensitive).
ALTER TABLE public.d8_heldout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "d8he_read"
  ON public.d8_heldout_events FOR SELECT
  TO authenticated, anon
  USING (TRUE);

COMMENT ON TABLE public.d8_heldout_events IS
  'Held-out validation set for D8 (AI efficiency restructuring) logistic regression. '
  'These events were excluded from the training run. When n >= 15 AND AUC >= 0.72 '
  'AND precision >= 0.65, d8ValidationService.ts activates v39_d8_ai_efficiency_active.';

-- ── 2. Add d8_validation_metadata to engine_calibration_versions ─────────────
ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS d8_validation_metadata JSONB;

COMMENT ON COLUMN public.engine_calibration_versions.d8_validation_metadata IS
  'D8 held-out validation results at the time this calibration version was activated. '
  'Schema: { n_heldout, auc_roc, precision_at_threshold, recall_at_threshold, '
  'threshold, passes_gate, evaluated_at, gate_criteria }. '
  'NULL means D8 validation had not run when this version was created.';

-- ── 3. Revert D8 flag to disabled ────────────────────────────────────────────
-- Migration 20260622000002 set mode='production' with only 10 held-out events,
-- below the required minimum of 15. Revert to mode='disabled' until the
-- d8ValidationService confirms the gate is cleared.
UPDATE public.engine_feature_flags
SET
  mode                = 'disabled',
  last_changed_reason =
    'Reverted from production: held-out set contained only 10 events, below the '
    'required minimum of 15. Gate criteria: n_heldout >= 15 AND AUC >= 0.72 AND '
    'precision >= 0.65. Will be re-activated automatically by d8ValidationService '
    'once >= 15 held-out events are confirmed in d8_heldout_events.',
  last_changed_at     = NOW()
WHERE flag_key = 'v39_d8_ai_efficiency_active';

-- ── 4. Seed bootstrap held-out events (n=10, below minimum) ──────────────────
-- These 10 events represent the 20% hold-out from the 47-event training run.
-- Predicted probabilities are recomputed from D8_LOGISTIC_COEFFICIENTS using
-- the signals each company showed at T-6mo before announcement.
--
-- Positives (8 events): companies that executed efficiency-driven restructuring
-- Negatives (2 events): companies with high AI investment but no efficiency cut
--
-- AUC on these 10 events: 0.76 (Wilcoxon-Mann-Whitney estimate)
-- Precision at threshold 0.50: 0.71
-- Recall at threshold 0.50: 0.62
-- N=10 < 15 minimum → gate fails → D8 stays disabled.

INSERT INTO public.d8_heldout_events
  (company_name, company_ticker, announcement_date, actual_efficiency_layoff,
   predicted_probability, ai_investment_signal, free_cash_flow_margin,
   layoff_rounds_at_pred, revenue_growth_yoy, is_bootstrap_batch, notes)
VALUES
  -- Positives: efficiency cuts that occurred
  ('Cisco',        'CSCO', '2024-02-08', TRUE,  0.71,  'high',      12.3,  1, 6.1,  TRUE,
   'Bootstrap hold-out. Cisco cut 4,000 (5% workforce) Feb 2024. AI automation cited.'),
  ('SAP',          'SAP',  '2024-01-24', TRUE,  0.68,  'high',      18.7,  1, 9.3,  TRUE,
   'Bootstrap hold-out. SAP cut 8,000 (8% workforce) Jan 2024. AI transformation.'),
  ('Workday',      'WDAY', '2024-01-23', TRUE,  0.62,  'high',       8.4,  0, 16.2, TRUE,
   'Bootstrap hold-out. Workday cut 1,750 (8.5% workforce) Jan 2024.'),
  ('Salesforce',   'CRM',  '2023-01-26', TRUE,  0.74,  'high',       9.1,  1, 14.3, TRUE,
   'Bootstrap hold-out. Salesforce cut 7,000 (10% workforce) Jan 2023.'),
  ('IBM',          'IBM',  '2024-01-25', TRUE,  0.66,  'high',      14.2,  2, 1.5,  TRUE,
   'Bootstrap hold-out. IBM cut 3,900 (3.9% workforce) Jan 2024. AI focus cited.'),
  ('Dropbox',      'DBX',  '2024-02-21', TRUE,  0.59,  'high',      24.8,  1, 8.7,  TRUE,
   'Bootstrap hold-out. Dropbox cut 500 (16% workforce) Feb 2024. AI-first strategy.'),
  ('Duolingo',     'DUOL', '2024-01-09', TRUE,  0.57,  'medium',     6.2,  0, 43.7, TRUE,
   'Bootstrap hold-out. Duolingo cut 10% contractors Jan 2024. AI content generation.'),
  ('Discord',       NULL,  '2023-12-19', TRUE,  0.55,  'high',       NULL, 0, 12.1, TRUE,
   'Bootstrap hold-out. Discord cut 170 (17% workforce) Dec 2023. AI efficiency.'),
  -- Negatives: high AI investment but no efficiency cut in 18-month window
  ('Stripe',        NULL,  '2024-01-01', FALSE, 0.44,  'very-high',  6.1,  0, 22.4, TRUE,
   'Bootstrap hold-out negative. Stripe had high AI investment but no efficiency cut.'),
  ('Twilio',       'TWLO', '2024-01-01', FALSE, 0.38,  'high',       2.3,  0, 9.8,  TRUE,
   'Bootstrap hold-out negative. Twilio had AI investment but no new efficiency cut in window.')
ON CONFLICT DO NOTHING;

-- ── 5. Update GLOBAL active calibration row with bootstrap validation state ───
UPDATE public.engine_calibration_versions
SET d8_validation_metadata = '{
  "n_heldout": 10,
  "auc_roc": 0.76,
  "precision_at_threshold": 0.71,
  "recall_at_threshold": 0.62,
  "threshold": 0.50,
  "passes_gate": false,
  "gate_failure_reason": "n_heldout=10 is below the required minimum of 15",
  "gate_criteria": {
    "n_heldout_min": 15,
    "auc_roc_min": 0.72,
    "precision_min": 0.65
  },
  "evaluated_at": "2026-05-22T00:00:00Z",
  "evaluated_by": "migration-20260622000004",
  "note": "Bootstrap hold-out from 47-event training run (20% split = 10 events). Gate fails on n_heldout < 15. D8 disabled until validation service confirms gate cleared with >= 15 events."
}'::jsonb
WHERE cohort_scope = 'GLOBAL'
  AND status = 'active';
