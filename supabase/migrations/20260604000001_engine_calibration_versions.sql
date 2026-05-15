-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260604000001_engine_calibration_versions.sql
-- Purpose:   WS2 + WS8 — Versioned regression coefficient storage.
--
--            The legacy engine hardcodes:
--              * LAYER_CALIBRATION { L1..L5 multipliers }
--              * D8_LOGISTIC_COEFFICIENTS
--              * CALIBRATED_REVENUE_THRESHOLDS
--              * CALIBRATED_STOCK_THRESHOLDS
--              * CALIBRATED_FCF_THRESHOLDS
--            Updates require a code change + redeploy. The WS8 recalibration
--            cron writes new coefficients here weekly, gated by drift checks.
--            The audit pipeline reads the latest 'active' version at startup
--            (cached for 30 min) and falls back to bootstrap constants if no
--            row exists.
--
--            Each row is a complete coefficient snapshot. We never UPDATE
--            existing rows — instead we INSERT a new version and mark the
--            previous one as 'superseded'. This preserves the full audit
--            trail and makes rollback trivial: flip the new row to
--            'superseded' and the previous 'active' row resumes.
--
--            Status lifecycle:
--              pending    -> drift check failed; held for ops review
--              active     -> currently in use by the engine
--              superseded -> previously active, retained for rollback
--              rejected   -> manually rejected; never used
--
--            INVARIANT: at most one row with status='active' per cohort_scope.
--            Enforced via partial unique index below.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.engine_calibration_versions (
  id                  BIGSERIAL    PRIMARY KEY,
  version             TEXT         NOT NULL,    -- e.g. 'v35.2026-07-15'

  -- ── Scope ───────────────────────────────────────────────────────────────────
  -- cohort_scope='GLOBAL' applies to all audits unless a more specific scope
  -- ('INDIA_IT', 'US_BIG_TECH', 'EU_FINANCE', ...) matches. The audit
  -- pipeline resolves the most-specific active scope at lookup time.
  cohort_scope        TEXT         NOT NULL DEFAULT 'GLOBAL',
  status              TEXT         NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'superseded', 'rejected')),

  -- ── Layer multipliers (replaces LAYER_CALIBRATION constant) ────────────────
  l1_multiplier       NUMERIC(6,4) NOT NULL,
  l2_multiplier       NUMERIC(6,4) NOT NULL,
  l3_multiplier       NUMERIC(6,4) NOT NULL,
  l4_multiplier       NUMERIC(6,4) NOT NULL,
  l5_multiplier       NUMERIC(6,4) NOT NULL,

  -- ── D8 logistic coefficients (replaces D8_LOGISTIC_COEFFICIENTS) ──────────
  -- Logistic regression: P(efficiency_layoff) = sigmoid(beta0 + beta_L1×L1 + ...)
  d8_beta0            NUMERIC(8,4) NOT NULL,
  d8_beta_l1          NUMERIC(8,4) NOT NULL,
  d8_beta_l2          NUMERIC(8,4) NOT NULL,
  d8_beta_ai_signal   NUMERIC(8,4) NOT NULL,
  d8_beta_layoff_rounds NUMERIC(8,4) NOT NULL,

  -- ── Calibrated threshold tables (JSONB to allow shape evolution) ──────────
  -- Each is an array of { threshold: number, risk: number } points used by
  -- piecewise-linear lookups in empiricalCalibration.ts.
  revenue_growth_thresholds JSONB  NOT NULL,
  stock_trend_thresholds    JSONB  NOT NULL,
  fcf_margin_thresholds     JSONB  NOT NULL,

  -- ── Quality metrics ─────────────────────────────────────────────────────────
  -- All values are AUC-ROC against the held-out outcome set.
  auc_distress        NUMERIC(4,3),
  auc_efficiency      NUMERIC(4,3),
  auc_wave            NUMERIC(4,3),
  auc_combined        NUMERIC(4,3),
  brier_combined      NUMERIC(5,4),   -- lower is better

  -- ── Coverage metrics ────────────────────────────────────────────────────────
  -- Empirical coverage of nominal 90/80/50% CIs over the validation window.
  -- e.g. coverage_at_90 = 0.88 means our nominal-90% CIs contained the
  -- outcome 88% of the time on the held-out set.
  coverage_at_90      NUMERIC(4,3),
  coverage_at_80      NUMERIC(4,3),
  coverage_at_50      NUMERIC(4,3),

  -- ── Provenance ──────────────────────────────────────────────────────────────
  n_events_total      INTEGER      NOT NULL,
  n_events_distress   INTEGER      NOT NULL DEFAULT 0,
  n_events_efficiency INTEGER      NOT NULL DEFAULT 0,
  n_events_wave       INTEGER      NOT NULL DEFAULT 0,
  outcome_source_breakdown JSONB,         -- e.g. {"user_reported": 240, "implicit_warn": 180, ...}
  training_window_start DATE,
  training_window_end   DATE,

  -- ── Drift detection ─────────────────────────────────────────────────────────
  prior_version_id    BIGINT       REFERENCES public.engine_calibration_versions(id),
  -- Set when status='pending' due to drift. Human-readable summary of why
  -- the version was held back ("AUC for EFFICIENCY cohort dropped from
  -- 0.78 to 0.71 vs prior_version_id=42").
  drift_reason        TEXT,

  -- ── Audit ──────────────────────────────────────────────────────────────────
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by          TEXT         NOT NULL DEFAULT 'recalibrate-engine',
  activated_at        TIMESTAMPTZ,
  activated_by        UUID         REFERENCES auth.users(id),
  activation_reason   TEXT,

  UNIQUE (version, cohort_scope)
);

-- INVARIANT: at most one active per (cohort_scope).
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecv_active_per_scope
  ON public.engine_calibration_versions (cohort_scope)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_ecv_scope_status
  ON public.engine_calibration_versions (cohort_scope, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ecv_pending
  ON public.engine_calibration_versions (created_at DESC)
  WHERE status = 'pending';

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.engine_calibration_versions ENABLE ROW LEVEL SECURITY;

-- The audit pipeline (running as authenticated/anon user) reads the active
-- coefficients on every cold start. Coefficient values are not sensitive;
-- exposing them is acceptable and unavoidable given the pipeline runs
-- client-side.
CREATE POLICY "ecv_read_active"
  ON public.engine_calibration_versions FOR SELECT
  TO authenticated, anon
  USING (status IN ('active', 'superseded'));

-- service_role writes (recalibration cron + ops promotions). No
-- user-facing INSERT / UPDATE.

COMMENT ON TABLE public.engine_calibration_versions IS
  'WS2/WS8 — Versioned regression coefficients for the audit engine. '
  'Replaces the hardcoded LAYER_CALIBRATION / D8_LOGISTIC_COEFFICIENTS '
  'constants in empiricalCalibration.ts. New versions written weekly by '
  'recalibrate-engine cron, gated by drift checks. At most one active per '
  'cohort_scope, enforced by uq_ecv_active_per_scope.';

COMMENT ON COLUMN public.engine_calibration_versions.cohort_scope IS
  'Calibration scope. GLOBAL is the default; cohort-specific scopes (INDIA_IT, '
  'US_BIG_TECH, EU_FINANCE) override GLOBAL when the audit company matches. '
  'The audit pipeline resolves most-specific-active at lookup time.';

COMMENT ON COLUMN public.engine_calibration_versions.coverage_at_90 IS
  'Empirical coverage of the nominal-90% CI on the held-out outcome set. '
  'Healthy range: 0.88-0.92. <0.85 indicates the CI is over-confident and '
  'must be widened in WS4 conformal prediction step.';
