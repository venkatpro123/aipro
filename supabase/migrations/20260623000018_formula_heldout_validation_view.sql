-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260623000018_formula_heldout_validation_view.sql
-- Purpose:   GAP-A01 (extended) — Live v_formula_heldout_validation view.
--
-- CONTEXT
-- ───────
-- Migration 20260623000012 hardcoded the bootstrap holdout stats (n=40, AUC=0.81)
-- in engine_calibration_versions.main_formula_validation_metadata.  That is the
-- static anchor.  This migration adds the LIVE layer:
--
--   1. v_formula_heldout_validation — a SQL view that computes the current
--      holdout AUC using Wilcoxon rank-sum statistics over two combined outcome
--      sources:
--        • main_formula_heldout_events   (calibration-team-seeded bootstrap events)
--        • user_prediction_outcomes      (user-reported outcomes flagged is_holdout=TRUE)
--
--      Chronological partition:
--        training  = event_date < 2025-01-01
--        holdout   = event_date >= 2025-01-01
--
--      Effective AUC fallback: when holdout_n_positive < 5 OR holdout_n_negative < 5
--      the view returns the bootstrap AUC (0.81, n=40) so the UI always has a
--      number to show.  is_live_computed=FALSE signals the fallback is active.
--
--   2. Four new columns on engine_calibration_versions to store the snapshot:
--        computed_holdout_n, computed_holdout_auc,
--        computed_holdout_period_start, computed_holdout_period_end,
--        computed_holdout_at, holdout_recalibration_needed
--
--   3. refresh_formula_holdout_metrics() — SECURITY DEFINER function that reads
--      v_formula_heldout_validation and writes the results to the active
--      engine_calibration_versions row.  Called by the recalibrate-engine cron.
--
-- RECALIBRATION GATE
-- ──────────────────
-- If the live holdout AUC drops below 0.78, holdout_recalibration_needed is set
-- TRUE and the TransparencyTab surfaces a red warning:
--   "Hold-out AUC [X] is below the 0.78 recalibration threshold.
--    Formula weights require re-regression against updated outcome data."
--
-- DATA LEAKAGE PREVENTION
-- ────────────────────────
-- The partition boundary (2025-01-01) ensures holdout events are strictly
-- later than training events.  user_prediction_outcomes rows are only included
-- in the holdout partition when is_holdout=TRUE (set by recalibrate-engine) AND
-- audit_date >= '2025-01-01'.  Training rows (is_holdout=FALSE) never enter the
-- holdout AUC computation regardless of date.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. New columns on engine_calibration_versions ────────────────────────────

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS computed_holdout_n              INTEGER;
COMMENT ON COLUMN public.engine_calibration_versions.computed_holdout_n IS
  'GAP-A01 extended — count of outcomes in the effective holdout set used for '
  'the last computed AUC.  Set by refresh_formula_holdout_metrics().  NULL until '
  'first refresh runs.  When no live holdout data exists, falls back to '
  'bootstrap_n (40) so the value is always non-NULL after the first refresh.';

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS computed_holdout_auc            NUMERIC(4,3);
COMMENT ON COLUMN public.engine_calibration_versions.computed_holdout_auc IS
  'GAP-A01 extended — effective holdout AUC-ROC.  Live-computed when >= 5 positive '
  'and >= 5 negative outcomes exist in the holdout partition; otherwise the bootstrap '
  'fallback (0.810) is stored.  If this value drops below 0.78, '
  'holdout_recalibration_needed is set TRUE.';

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS computed_holdout_period_start   DATE;
COMMENT ON COLUMN public.engine_calibration_versions.computed_holdout_period_start IS
  'Start date of the effective holdout period (earliest audit_date in holdout set, '
  'or bootstrap period start 2023-01-01 when falling back).';

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS computed_holdout_period_end     DATE;
COMMENT ON COLUMN public.engine_calibration_versions.computed_holdout_period_end IS
  'End date of the effective holdout period (latest audit_date in holdout set, '
  'or bootstrap period end 2025-12-31 when falling back).';

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS computed_holdout_at             TIMESTAMPTZ;
COMMENT ON COLUMN public.engine_calibration_versions.computed_holdout_at IS
  'When refresh_formula_holdout_metrics() last ran for this version row.';

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS holdout_recalibration_needed    BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN public.engine_calibration_versions.holdout_recalibration_needed IS
  'TRUE when the effective holdout AUC < 0.78.  TransparencyTab renders a red '
  'recalibration-required banner when this is TRUE.';


-- ── 2. v_formula_heldout_validation ──────────────────────────────────────────
--
-- Computes the live holdout AUC using the Wilcoxon rank-sum statistic:
--   AUC = (R_pos − n_pos × (n_pos + 1) / 2) / (n_pos × n_neg)
-- where R_pos = sum of midranks of positive outcomes (handles score ties via
-- fractional/average ranks using the ROW_NUMBER + AVG window trick).
--
-- The result is a single-row view (CROSS JOIN of summary CTEs).
-- Performance: O(n log n) due to the window function sort — no CROSS JOIN of
-- all pairs.  Safe for holdout sets up to ~50k rows.

CREATE OR REPLACE VIEW public.v_formula_heldout_validation AS
WITH
-- ── Combined outcome pool ─────────────────────────────────────────────────────
outcome_pool AS (
  -- Source 1: bootstrap holdout events (calibration-team-seeded ground truth)
  SELECT
    predicted_score::NUMERIC   AS score,
    outcome                    AS is_positive,
    audit_reference_date       AS event_date,
    'bootstrap'                AS src
  FROM public.main_formula_heldout_events
  WHERE predicted_score IS NOT NULL

  UNION ALL

  -- Source 2: user-reported outcomes flagged as holdout only
  -- left_voluntarily and role_changed are excluded — ambiguous class
  SELECT
    predicted_score::NUMERIC   AS score,
    outcome_reported IN ('laid_off', 'company_closed') AS is_positive,
    audit_date                 AS event_date,
    'user_reported'            AS src
  FROM public.user_prediction_outcomes
  WHERE is_holdout       = TRUE
    AND predicted_score  IS NOT NULL
    AND outcome_reported IN (
          'laid_off', 'company_closed',
          'still_employed', 'false_alarm'
        )
),

-- ── Chronological partition ───────────────────────────────────────────────────
-- LEAKAGE GUARD: the partition boundary is hard-coded 2025-01-01.
-- Training events are counted for disclosure only (no AUC computed on them).
partition_boundary AS (SELECT '2025-01-01'::DATE AS dt),

training_pool AS (
  SELECT score, is_positive, event_date
  FROM   outcome_pool, partition_boundary
  WHERE  event_date < dt
),
holdout_pool AS (
  SELECT score, is_positive, event_date
  FROM   outcome_pool, partition_boundary
  WHERE  event_date >= dt
),

-- ── Wilcoxon midranks (O(n log n), handles ties correctly) ───────────────────
holdout_ranked AS (
  SELECT
    is_positive,
    -- midrank = average of row-numbers across tied score group
    AVG(rn) OVER (PARTITION BY score) AS midrank
  FROM (
    SELECT is_positive,
           score,
           ROW_NUMBER() OVER (ORDER BY score) AS rn
    FROM   holdout_pool
  ) rns
),

-- ── AUC components ───────────────────────────────────────────────────────────
auc_agg AS (
  SELECT
    SUM(midrank) FILTER (WHERE is_positive = TRUE)   AS rank_sum_pos,
    COUNT(*)     FILTER (WHERE is_positive = TRUE)   AS n_pos,
    COUNT(*)     FILTER (WHERE is_positive = FALSE)  AS n_neg,
    COUNT(*)                                         AS n_total
  FROM holdout_ranked
),

-- ── Compute AUC; guard against zero denominators ─────────────────────────────
auc_computed AS (
  SELECT
    n_pos, n_neg, n_total,
    CASE
      WHEN n_pos > 0 AND n_neg > 0
      THEN ROUND(
             ((rank_sum_pos - n_pos * (n_pos + 1.0) / 2.0)
              / (n_pos::NUMERIC * n_neg))::NUMERIC,
             3
           )
      ELSE NULL
    END AS live_auc
  FROM auc_agg
),

-- ── Training metadata (for disclosure panel) ─────────────────────────────────
training_meta AS (
  SELECT
    COUNT(*)         AS training_n,
    MIN(event_date)  AS training_start,
    MAX(event_date)  AS training_end
  FROM training_pool
),

-- ── Holdout date span ─────────────────────────────────────────────────────────
holdout_meta AS (
  SELECT
    MIN(event_date)  AS holdout_start,
    MAX(event_date)  AS holdout_end
  FROM holdout_pool
)

-- ── Final output row ─────────────────────────────────────────────────────────
SELECT

  -- ── Training set disclosure ────────────────────────────────────────────────
  tm.training_n                                       AS training_n,
  tm.training_start                                   AS training_period_start,
  tm.training_end                                     AS training_period_end,

  -- ── Holdout set — live-computed ────────────────────────────────────────────
  ac.n_total                                          AS holdout_n,
  ac.n_pos                                            AS holdout_n_positive,
  ac.n_neg                                            AS holdout_n_negative,
  hm.holdout_start                                    AS holdout_period_start,
  hm.holdout_end                                      AS holdout_period_end,
  ac.live_auc                                         AS holdout_auc,

  -- ── Bootstrap fallback (always available from MAIN_FORMULA_HOLDOUT_VALIDATION) ──
  0.810::NUMERIC(4,3)                                 AS bootstrap_auc,
  40                                                  AS bootstrap_n,
  '2023-01-01'::DATE                                  AS bootstrap_period_start,
  '2025-12-31'::DATE                                  AS bootstrap_period_end,

  -- ── Effective values: live when >= 5 pos + >= 5 neg; bootstrap otherwise ───
  -- The UI should display effective_* values, not raw holdout_* values.
  CASE WHEN ac.n_pos >= 5 AND ac.n_neg >= 5 THEN ac.live_auc
       ELSE 0.810::NUMERIC(4,3)
  END                                                 AS effective_auc,
  CASE WHEN ac.n_pos >= 5 AND ac.n_neg >= 5 THEN ac.n_total
       ELSE 40
  END                                                 AS effective_n,
  CASE WHEN ac.n_pos >= 5 AND ac.n_neg >= 5 THEN hm.holdout_start
       ELSE '2023-01-01'::DATE
  END                                                 AS effective_period_start,
  CASE WHEN ac.n_pos >= 5 AND ac.n_neg >= 5 THEN hm.holdout_end
       ELSE '2025-12-31'::DATE
  END                                                 AS effective_period_end,

  -- ── Mode flag ─────────────────────────────────────────────────────────────
  (ac.n_pos >= 5 AND ac.n_neg >= 5)                   AS is_live_computed,

  -- ── Recalibration alarm: AUC < 0.78 (applies only when live-computed) ─────
  CASE
    WHEN ac.n_pos >= 5 AND ac.n_neg >= 5
         AND ac.live_auc IS NOT NULL
         AND ac.live_auc < 0.78
    THEN TRUE
    ELSE FALSE
  END                                                 AS recalibration_needed,

  -- ── Partition boundary (for UI disclosure) ────────────────────────────────
  '2025-01-01'::DATE                                  AS partition_boundary

FROM       auc_computed  ac
CROSS JOIN training_meta tm
CROSS JOIN holdout_meta  hm;

COMMENT ON VIEW public.v_formula_heldout_validation IS
  'GAP-A01 extended — Live holdout AUC-ROC view. '
  'Combines main_formula_heldout_events (bootstrap) and user_prediction_outcomes '
  '(is_holdout=TRUE) as the outcome corpus.  Partitions at 2025-01-01: earlier '
  'events are counted as training_n; 2025-01-01+ events are the holdout set. '
  'AUC is computed via Wilcoxon rank-sum statistic (O(n log n), tie-safe). '
  'Falls back to bootstrap (0.81, n=40) when < 5 positives or < 5 negatives '
  'exist in the holdout partition.  recalibration_needed=TRUE when live AUC < 0.78.';


-- ── 3. refresh_formula_holdout_metrics() ─────────────────────────────────────
--
-- Reads v_formula_heldout_validation and stores the effective stats in the
-- active engine_calibration_versions row for the GLOBAL scope.
-- Called by the recalibrate-engine cron (service_role).
-- Returns JSONB summary of what was written.

CREATE OR REPLACE FUNCTION public.refresh_formula_holdout_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v            RECORD;
  updated_rows INTEGER;
  result       JSONB;
BEGIN
  SELECT
    effective_n,
    effective_auc,
    effective_period_start,
    effective_period_end,
    is_live_computed,
    recalibration_needed,
    holdout_n,
    holdout_auc,
    training_n
  INTO v
  FROM public.v_formula_heldout_validation
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status',  'error',
      'message', 'v_formula_heldout_validation returned no rows'
    );
  END IF;

  UPDATE public.engine_calibration_versions
  SET
    computed_holdout_n            = v.effective_n,
    computed_holdout_auc          = v.effective_auc,
    computed_holdout_period_start = v.effective_period_start,
    computed_holdout_period_end   = v.effective_period_end,
    computed_holdout_at           = NOW(),
    holdout_recalibration_needed  = v.recalibration_needed
  WHERE cohort_scope = 'GLOBAL'
    AND status       = 'active';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  result := jsonb_build_object(
    'status',            'ok',
    'rows_updated',      updated_rows,
    'effective_n',       v.effective_n,
    'effective_auc',     v.effective_auc,
    'is_live',           v.is_live_computed,
    'recal_needed',      v.recalibration_needed,
    'live_holdout_n',    v.holdout_n,
    'live_holdout_auc',  v.holdout_auc,
    'training_n',        v.training_n,
    'refreshed_at',      NOW()
  );

  -- Log to scoring_architecture_log for audit trail
  INSERT INTO public.scoring_architecture_log (
    dimension_key,
    change_type,
    description,
    migration_ref,
    created_at
  ) VALUES (
    'formula_holdout_validation',
    'metrics_refresh',
    format(
      'refresh_formula_holdout_metrics(): effective_auc=%s n=%s is_live=%s recal_needed=%s',
      v.effective_auc,
      v.effective_n,
      v.is_live_computed,
      v.recalibration_needed
    ),
    '20260623000018',
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.refresh_formula_holdout_metrics() IS
  'GAP-A01 extended — Reads v_formula_heldout_validation and writes the effective '
  'holdout stats (AUC, N, dates, recal flag) to the active engine_calibration_versions '
  'row (cohort_scope=GLOBAL).  Called by recalibrate-engine cron.  SECURITY DEFINER '
  'so the cron does not need direct write access to engine_calibration_versions.';

-- Grant execute to authenticated so the admin dashboard can trigger a manual refresh.
-- Service_role can always call this (bypasses RLS).
GRANT EXECUTE ON FUNCTION public.refresh_formula_holdout_metrics() TO authenticated;


-- ── 4. Run initial refresh to populate columns on existing active row ─────────
--
-- This seeds the bootstrap fallback values (AUC=0.81, n=40) into the new columns
-- on the GLOBAL active row inserted by migration 20260623000012.  If that row
-- does not exist yet (fresh DB), the UPDATE is a no-op — the cron will populate
-- it on first run.
DO $$
DECLARE
  r JSONB;
BEGIN
  -- Only run if the active GLOBAL row exists; otherwise skip silently.
  IF EXISTS (
    SELECT 1 FROM public.engine_calibration_versions
    WHERE cohort_scope = 'GLOBAL' AND status = 'active'
  ) THEN
    r := public.refresh_formula_holdout_metrics();
    RAISE NOTICE 'refresh_formula_holdout_metrics initial seed: %', r;
  ELSE
    RAISE NOTICE 'refresh_formula_holdout_metrics: no active GLOBAL row yet — skipping initial seed.';
  END IF;
END $$;


-- ── 5. Scoring architecture log ──────────────────────────────────────────────

INSERT INTO public.scoring_architecture_log (
  dimension_key,
  change_type,
  description,
  migration_ref,
  created_at
) VALUES (
  'formula_holdout_validation',
  'schema_add',
  'GAP-A01 extended: created v_formula_heldout_validation view (Wilcoxon rank-sum AUC, '
  'chronological partition at 2025-01-01, bootstrap fallback AUC=0.81 n=40). '
  'Added computed_holdout_n/auc/period_start/period_end/at + holdout_recalibration_needed '
  'to engine_calibration_versions. '
  'Created refresh_formula_holdout_metrics() SECURITY DEFINER function. '
  'TransparencyTab will display: "Formula accuracy: AUC [X] on [N]-event held-out '
  'validation set (events from [date] to [date])". '
  'Red warning fires when effective AUC < 0.78.',
  '20260623000018',
  NOW()
)
ON CONFLICT DO NOTHING;
