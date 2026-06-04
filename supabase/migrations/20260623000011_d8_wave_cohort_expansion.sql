-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260623000011_d8_wave_cohort_expansion.sql
-- Purpose:   D8 multi-cohort expansion — WAVE cohort gate infrastructure.
--
-- BACKGROUND
-- ──────────
-- D8 (AI efficiency restructuring) was activated globally (mode='production')
-- in migration 20260622000006 after the GLOBAL held-out gate cleared:
--   n=15, AUC=0.889, precision=0.923 at threshold=0.50.
--
-- The GLOBAL cohort captures companies where AI efficiency is the DIRECT cause
-- of restructuring. The WAVE cohort (sector_wave archetype) is a HARDER pattern:
-- companies that cut because their SECTOR is cutting, not because of direct AI
-- efficiency optimization. The WAVE signal is noisier:
--   - Contagion can produce layoffs without efficiency intent
--   - Profitable wave companies may cut for purely competitive reasons
--   - The D8 logistic coefficients were trained on EFFICIENCY events; their
--     applicability to WAVE-classified companies is an empirical question
--
-- SECTION 11.5 GATE
-- ─────────────────
-- D8 expansion to the WAVE cohort requires a stricter evidence bar than GLOBAL:
--   n ≥ 100  (vs n ≥ 15 for GLOBAL — WAVE pattern has higher false-positive risk)
--   AUC ≥ 0.72
--   precision ≥ 0.65 at threshold 0.50
-- The higher n requirement guards against the noisier WAVE signal producing
-- an artificially inflated AUC on a small positive-biased sample.
--
-- ACTIVATION PATH
-- ───────────────
-- 1. Calibration team adds WAVE-scope events to d8_heldout_events
--    (cohort_scope = 'WAVE')
-- 2. `check_d8_wave_expansion()` is called (manually or via recalibrate-engine EF)
-- 3. When n ≥ 100 AND AUC ≥ 0.72 AND precision ≥ 0.65:
--    flag moves to mode='shadow' for 14-day synthetic probe observation
-- 4. After 14 days with no CRITICAL probe alerts on WAVE_EFFICIENCY_HYBRID:
--    flag moves to mode='production' (ops promotion)
--
-- THIS MIGRATION
-- ──────────────
-- 1. Add cohort_scope column to d8_heldout_events (GLOBAL/WAVE/INDIA_IT/etc.)
-- 2. Create d8_heldout_validation VIEW with wave_cohort_event_count
-- 3. Create check_d8_wave_expansion() PL/pgSQL function
-- 4. Insert v40_d8_wave_cohort_active flag (mode='off')
-- 5. Upsert WAVE_EFFICIENCY_HYBRID into synthetic_probe_scenarios
-- 6. Log to scoring_architecture_log + engine_calibration_versions
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. Add cohort_scope to d8_heldout_events ─────────────────────────────────
-- Existing bootstrap rows are GLOBAL cohort events (trained against the global
-- efficiency logistic model). WAVE events must be explicitly tagged.
ALTER TABLE public.d8_heldout_events
  ADD COLUMN IF NOT EXISTS cohort_scope TEXT NOT NULL DEFAULT 'GLOBAL'
    CHECK (cohort_scope IN ('GLOBAL', 'WAVE', 'INDIA_IT', 'US_BIG_TECH', 'EU_FINANCE', 'APAC'));

COMMENT ON COLUMN public.d8_heldout_events.cohort_scope IS
  'Which cohort these held-out events belong to. GLOBAL = global efficiency model (n≥15 gate). '
  'WAVE = sector_wave archetype expansion (n≥100 gate — stricter due to noisier signal). '
  'Other scopes reserved for future regional/sector expansions.';

CREATE INDEX IF NOT EXISTS idx_d8he_cohort_scope
  ON public.d8_heldout_events (cohort_scope);


-- ── 2. d8_heldout_validation VIEW ────────────────────────────────────────────
-- Ops dashboard and check_d8_wave_expansion() read this view to monitor gate
-- progress. The view surface area matters: wave_cohort_event_count is the
-- field referenced in the Section 11.5 spec.
CREATE OR REPLACE VIEW public.d8_heldout_validation AS
SELECT
  cohort_scope,
  COUNT(*)                                              AS event_count,
  COUNT(*) FILTER (WHERE actual_efficiency_layoff)      AS positive_count,
  COUNT(*) FILTER (WHERE NOT actual_efficiency_layoff)  AS negative_count,
  -- Required minimum n for each cohort
  CASE
    WHEN cohort_scope = 'GLOBAL'   THEN 15
    WHEN cohort_scope = 'WAVE'     THEN 100
    ELSE 15
  END                                                   AS n_required,
  -- Is the n gate satisfied?
  CASE
    WHEN cohort_scope = 'GLOBAL'   THEN COUNT(*) >= 15
    WHEN cohort_scope = 'WAVE'     THEN COUNT(*) >= 100
    ELSE COUNT(*) >= 15
  END                                                   AS n_gate_passes,
  -- How many more events are needed?
  GREATEST(0,
    CASE
      WHEN cohort_scope = 'GLOBAL'   THEN 15
      WHEN cohort_scope = 'WAVE'     THEN 100
      ELSE 15
    END - COUNT(*)::INTEGER
  )                                                     AS events_still_needed,
  MIN(announcement_date)                                AS earliest_event,
  MAX(announcement_date)                                AS latest_event,
  MAX(added_at)                                         AS last_event_added_at
FROM public.d8_heldout_events
GROUP BY cohort_scope;

-- Convenience alias: surfaces `wave_cohort_event_count` directly as a scalar
-- for monitoring queries:
--   SELECT wave_cohort_event_count FROM d8_wave_event_count;
CREATE OR REPLACE VIEW public.d8_wave_event_count AS
SELECT
  COUNT(*)                                             AS wave_cohort_event_count,
  COUNT(*) FILTER (WHERE actual_efficiency_layoff)     AS wave_positive_count,
  COUNT(*) FILTER (WHERE NOT actual_efficiency_layoff) AS wave_negative_count,
  100                                                  AS wave_n_required,
  COUNT(*) >= 100                                      AS wave_n_gate_passes,
  GREATEST(0, 100 - COUNT(*)::INTEGER)                 AS wave_events_still_needed,
  MAX(added_at)                                        AS last_wave_event_added_at
FROM public.d8_heldout_events
WHERE cohort_scope = 'WAVE';


-- ── 3. check_d8_wave_expansion() function ────────────────────────────────────
-- Called by: recalibrate-engine EF (WS8 weekly cron) and manually by ops.
-- Idempotent: safe to call multiple times.
--
-- Returns a single row with validation metrics and the action taken.
-- Logic:
--   a. Count WAVE events. If < 100: return early, gate fails.
--   b. Compute AUC via Wilcoxon-Mann-Whitney concordant pair count.
--   c. Compute precision/recall at threshold 0.50.
--   d. If AUC ≥ 0.72 AND precision ≥ 0.65:
--      - If flag is 'off':    set to 'shadow' (14-day observation period begins)
--      - If flag is 'shadow': check shadow_started_at. After 14 days, log
--        readiness note (ops must manually promote to 'production' after
--        reviewing WAVE_EFFICIENCY_HYBRID probe results — migration cannot
--        auto-promote because it has no context on probe alert history)
--      - If flag is 'canary'/'production': no action (idempotent)
--   e. Record validation metrics in engine_calibration_versions for WAVE scope.
--
-- SECURITY DEFINER: runs as function owner (service role) so it can UPDATE
-- engine_feature_flags without requiring the caller to be authenticated with
-- service role themselves. The calling EF already holds service role.
CREATE OR REPLACE FUNCTION public.check_d8_wave_expansion()
RETURNS TABLE (
  wave_event_count        INTEGER,
  wave_positive_count     INTEGER,
  wave_negative_count     INTEGER,
  auc_roc                 NUMERIC(6,4),
  precision_at_threshold  NUMERIC(6,4),
  recall_at_threshold     NUMERIC(6,4),
  gate_passes             BOOLEAN,
  gate_failure_reason     TEXT,
  action_taken            TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_n          INTEGER;
  v_n_pos      INTEGER;
  v_n_neg      INTEGER;
  v_concordant INTEGER;
  v_tp         INTEGER;
  v_fp         INTEGER;
  v_fn         INTEGER;
  v_auc        NUMERIC(6,4);
  v_prec       NUMERIC(6,4);
  v_rec        NUMERIC(6,4);
  v_gate       BOOLEAN := FALSE;
  v_reason     TEXT    := '';
  v_action     TEXT    := 'none';
  v_flag_mode  TEXT;
  v_flag_changed_at TIMESTAMPTZ;
BEGIN
  -- ── a. Count WAVE events ─────────────────────────────────────────────────────
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE actual_efficiency_layoff)::INTEGER,
    COUNT(*) FILTER (WHERE NOT actual_efficiency_layoff)::INTEGER
  INTO v_n, v_n_pos, v_n_neg
  FROM public.d8_heldout_events
  WHERE cohort_scope = 'WAVE';

  IF v_n < 100 THEN
    RETURN QUERY SELECT
      v_n, v_n_pos, v_n_neg,
      NULL::NUMERIC(6,4), NULL::NUMERIC(6,4), NULL::NUMERIC(6,4),
      FALSE,
      format('n_wave=%s < 100 minimum; add %s more WAVE events before gate is evaluated',
             v_n, 100 - v_n),
      'none'::TEXT;
    RETURN;
  END IF;

  -- ── b. AUC via Wilcoxon-Mann-Whitney concordant pairs ────────────────────────
  -- AUC = (# pairs where positive P > negative P) / (n_pos × n_neg)
  SELECT COUNT(*)::INTEGER INTO v_concordant
  FROM   public.d8_heldout_events pos
  JOIN   public.d8_heldout_events neg ON TRUE
  WHERE  pos.cohort_scope = 'WAVE' AND pos.actual_efficiency_layoff = TRUE
    AND  neg.cohort_scope = 'WAVE' AND neg.actual_efficiency_layoff = FALSE
    AND  pos.predicted_probability > neg.predicted_probability;

  v_auc := CASE WHEN v_n_pos > 0 AND v_n_neg > 0
                THEN ROUND(v_concordant::NUMERIC / (v_n_pos * v_n_neg), 4)
                ELSE 0
           END;

  -- ── c. Precision/recall at threshold 0.50 ───────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE actual_efficiency_layoff = TRUE  AND predicted_probability >= 0.50)::INTEGER,
    COUNT(*) FILTER (WHERE actual_efficiency_layoff = FALSE AND predicted_probability >= 0.50)::INTEGER,
    COUNT(*) FILTER (WHERE actual_efficiency_layoff = TRUE  AND predicted_probability <  0.50)::INTEGER
  INTO v_tp, v_fp, v_fn
  FROM public.d8_heldout_events
  WHERE cohort_scope = 'WAVE';

  v_prec := CASE WHEN v_tp + v_fp > 0
                 THEN ROUND(v_tp::NUMERIC / (v_tp + v_fp), 4)
                 ELSE 0
            END;
  v_rec  := CASE WHEN v_tp + v_fn > 0
                 THEN ROUND(v_tp::NUMERIC / (v_tp + v_fn), 4)
                 ELSE 0
            END;

  -- ── d. Gate evaluation ───────────────────────────────────────────────────────
  v_gate := v_auc >= 0.72 AND v_prec >= 0.65;

  IF NOT v_gate THEN
    v_reason := format(
      'Gate fails: AUC=%.4f %s (≥0.72), precision=%.4f %s (≥0.65)',
      v_auc,  CASE WHEN v_auc  >= 0.72 THEN '✓' ELSE '✗' END,
      v_prec, CASE WHEN v_prec >= 0.65 THEN '✓' ELSE '✗' END
    );
    RETURN QUERY SELECT v_n, v_n_pos, v_n_neg, v_auc, v_prec, v_rec,
                        FALSE, v_reason, 'none'::TEXT;
    RETURN;
  END IF;

  -- Gate passes — determine action based on current flag mode
  SELECT mode, last_changed_at INTO v_flag_mode, v_flag_changed_at
  FROM public.engine_feature_flags
  WHERE flag_key = 'v40_d8_wave_cohort_active';

  IF v_flag_mode IS NULL THEN
    -- Flag not yet seeded (shouldn't happen after this migration)
    v_reason := 'Flag v40_d8_wave_cohort_active not found in engine_feature_flags';
    v_action := 'error_flag_missing';
  ELSIF v_flag_mode = 'off' THEN
    -- First passage: move to shadow for 14-day probe observation
    UPDATE public.engine_feature_flags SET
      mode                = 'shadow',
      last_changed_reason = format(
        'WAVE cohort gate cleared: n_wave=%s (≥100), AUC=%.4f (≥0.72), precision=%.4f (≥0.65), '
        'recall=%.4f. Moved to shadow mode. Monitor WAVE_EFFICIENCY_HYBRID synthetic probe '
        'for 14 days (until %s). Promote to production manually after confirming no CRITICAL '
        'probe alerts. Activated by check_d8_wave_expansion() at %s.',
        v_n, v_auc, v_prec, v_rec,
        (NOW() + INTERVAL '14 days')::DATE,
        NOW()
      ),
      last_changed_at = NOW()
    WHERE flag_key = 'v40_d8_wave_cohort_active';

    v_action := format(
      'flag set to shadow — 14-day observation until %s',
      (NOW() + INTERVAL '14 days')::DATE
    );
  ELSIF v_flag_mode = 'shadow' THEN
    DECLARE
      v_days_in_shadow NUMERIC;
    BEGIN
      v_days_in_shadow := EXTRACT(EPOCH FROM NOW() - v_flag_changed_at) / 86400;
      IF v_days_in_shadow >= 14 THEN
        v_action := format(
          'shadow period complete (%.1f days). '
          'Gate still passes: AUC=%.4f, precision=%.4f. '
          'Review WAVE_EFFICIENCY_HYBRID probe results and promote to production manually.',
          v_days_in_shadow, v_auc, v_prec
        );
      ELSE
        v_action := format(
          'flag already in shadow (%.1f / 14.0 days elapsed) — no change',
          v_days_in_shadow
        );
      END IF;
    END;
  ELSE
    -- canary, production, deprecated — already activated or superseded; idempotent
    v_action := format('flag already in %s mode — idempotent check', v_flag_mode);
  END IF;

  v_reason := format(
    'Gate passes: n=%s ≥ 100, AUC=%.4f ≥ 0.72, precision=%.4f ≥ 0.65, recall=%.4f',
    v_n, v_auc, v_prec, v_rec
  );

  -- ── e. Record in engine_calibration_versions for WAVE scope ─────────────────
  -- Upsert: if a 'pending' WAVE row exists, update it; otherwise insert new.
  INSERT INTO public.engine_calibration_versions (
    version,
    cohort_scope,
    status,
    l1_multiplier, l2_multiplier, l3_multiplier, l4_multiplier, l5_multiplier,
    d8_beta0, d8_beta_l1, d8_beta_l2, d8_beta_ai_signal, d8_beta_layoff_rounds,
    revenue_growth_thresholds, stock_trend_thresholds, fcf_margin_thresholds,
    n_events_total,
    d8_validation_metadata,
    created_at
  )
  SELECT
    format('wave-v40.%s', TO_CHAR(NOW(), 'YYYY-MM-DD')),
    'WAVE',
    'active',
    -- Inherit GLOBAL multipliers (WAVE uses same calibration constants)
    l1_multiplier, l2_multiplier, l3_multiplier, l4_multiplier, l5_multiplier,
    d8_beta0, d8_beta_l1, d8_beta_l2, d8_beta_ai_signal, d8_beta_layoff_rounds,
    revenue_growth_thresholds, stock_trend_thresholds, fcf_margin_thresholds,
    n_events_total,
    jsonb_build_object(
      'n_heldout',               v_n,
      'n_positive',              v_n_pos,
      'n_negative',              v_n_neg,
      'auc_roc',                 v_auc,
      'precision_at_threshold',  v_prec,
      'recall_at_threshold',     v_rec,
      'threshold',               0.50,
      'passes_gate',             v_gate,
      'gate_failure_reason',     NULL,
      'gate_criteria', jsonb_build_object(
        'n_heldout_min',  100,
        'auc_roc_min',    0.72,
        'precision_min',  0.65,
        'note',           'WAVE cohort requires n≥100 (vs n≥15 for GLOBAL) due to noisier sector-wave signal'
      ),
      'evaluated_at',            NOW(),
      'evaluated_by',            'check_d8_wave_expansion()',
      'activation_action',       v_action
    ),
    NOW()
  FROM public.engine_calibration_versions
  WHERE cohort_scope = 'GLOBAL' AND status = 'active'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_n, v_n_pos, v_n_neg, v_auc, v_prec, v_rec,
                      v_gate, v_reason, v_action;
END;
$$;

COMMENT ON FUNCTION public.check_d8_wave_expansion() IS
  'Evaluate the D8 WAVE cohort expansion gate (Section 11.5). '
  'Requires n≥100 WAVE events in d8_heldout_events. When AUC≥0.72 AND precision≥0.65: '
  'moves v40_d8_wave_cohort_active from off→shadow for 14-day probe observation. '
  'Called by recalibrate-engine EF weekly and manually by ops.';

-- Grant execute to service role (called by EFs) but not anonymous users
REVOKE EXECUTE ON FUNCTION public.check_d8_wave_expansion() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_d8_wave_expansion() TO service_role;


-- ── 4. Insert v40_d8_wave_cohort_active flag ─────────────────────────────────
INSERT INTO public.engine_feature_flags (
  flag_key,
  mode,
  canary_user_ids,
  canary_pct,
  description,
  workstream,
  acceptance_criteria,
  config,
  last_changed_reason,
  last_changed_at,
  created_at
)
VALUES (
  'v40_d8_wave_cohort_active',
  'off',
  ARRAY[]::UUID[],
  0,
  'D8 (AI efficiency restructuring) dimension applied to WAVE cohort '
  '(sector_wave archetype). OFF until 100-event held-out validation gate '
  'passes in d8_heldout_events (cohort_scope=WAVE) with AUC≥0.72, '
  'precision≥0.65. Activation path: check_d8_wave_expansion() → shadow → '
  '14-day WAVE_EFFICIENCY_HYBRID probe observation → ops promotes to production.',
  'WS8',
  ARRAY[
    'n_wave_heldout ≥ 100 in d8_heldout_events WHERE cohort_scope=WAVE',
    'AUC-ROC ≥ 0.72 on WAVE held-out set (Wilcoxon-Mann-Whitney)',
    'precision ≥ 0.65 at threshold 0.50 on WAVE held-out set',
    'WAVE_EFFICIENCY_HYBRID synthetic probe passes for ≥ 14 consecutive days (no CRITICAL alerts)',
    'Ops sign-off after reviewing 14-day shadow probe results'
  ],
  jsonb_build_object(
    'threshold',          0.50,
    'n_required',         100,
    'auc_required',       0.72,
    'precision_required', 0.65,
    'shadow_days_required', 14,
    'probe_scenario_id',  'WAVE_EFFICIENCY_HYBRID',
    'note', 'Expansion of D8 from GLOBAL cohort to WAVE/sector_wave archetype. '
            'WAVE pattern is noisier than EFFICIENCY — requires 100 events vs 15 for GLOBAL.'
  ),
  'Initial state: gate not yet evaluated. Add WAVE-scope events to d8_heldout_events '
  'then call check_d8_wave_expansion() to trigger gate evaluation.',
  NOW(),
  NOW()
)
ON CONFLICT (flag_key) DO NOTHING;


-- ── 5. Upsert WAVE_EFFICIENCY_HYBRID into synthetic_probe_scenarios ───────────
-- This probe specifically tests the combined D8+L2+D2 path that fires when
-- a software engineer is at a profitable, high-AI-investment company that is
-- in a sector experiencing a layoff wave. Expected: 62–72 (midpoint 67).
--
-- Formula path breakdown:
--   D2 (AI signals):     0.14 × ~0.80 = 0.112  (high AI maturity + adoption)
--   D8 (efficiency):     0.09 × ~0.70 = 0.063  (P≥0.70 for high AI + profitable + 1 sector round)
--   L2 (sector layoffs): 0.06 × ~0.82 = 0.049  (wave: many recent cuts in sector)
--   L1 (company fin):    0.16 × ~0.52 = 0.083  (company healthy; low funding risk pulls this down)
--   D1 (role):           0.18 × ~0.48 = 0.086  (software engineer — moderate displacement)
--   D3 (contagion):      0.09 × ~0.67 = 0.060  (sector wave + dept news)
--   D4 (tenure):         0.18 × ~0.50 = 0.090  (3y tenure — moderate protection)
--   D6/D7:               ~0.04         = 0.040
--   Raw ≈ 0.583 → ~58, pushed to 62–72 by wave-specific multipliers
INSERT INTO public.synthetic_probe_scenarios (
  scenario_name,
  description,
  expected_score,
  tolerance_low,
  tolerance_high,
  bias_threshold_pts,
  market_segment,
  created_at
)
VALUES (
  'WAVE_EFFICIENCY_HYBRID',
  'D8 wave cohort expansion probe — sector_wave archetype hybrid efficiency scenario',
  67,   -- midpoint
  62,   -- tolerance_low  (expectedMin)
  72,   -- tolerance_high (expectedMax)
  10,   -- bias_threshold_pts: alert if consistent >10pt directional drift
  'sector_wave_tech_global',
  NOW()
)
ON CONFLICT (scenario_name) DO UPDATE SET
  expected_score    = EXCLUDED.expected_score,
  tolerance_low     = EXCLUDED.tolerance_low,
  tolerance_high    = EXCLUDED.tolerance_high,
  market_segment    = EXCLUDED.market_segment;


-- ── 6a. Log to scoring_architecture_log ──────────────────────────────────────
INSERT INTO public.scoring_architecture_log (
  dimension_key,
  formula_weight,
  status,
  source_description,
  validation_date,
  notes,
  created_at,
  updated_at
)
VALUES (
  'v40_d8_wave_cohort_expansion',
  0.09,   -- D8 weight — same as GLOBAL; the expansion does not change the weight
  'gated',
  'D8 (AI efficiency restructuring) dimension expansion to the WAVE cohort '
  '(sector_wave archetype). Section 11.5 gate: n≥100 WAVE held-out events, '
  'AUC≥0.72, precision≥0.65 at threshold 0.50. '
  'Activation flow: check_d8_wave_expansion() → shadow mode → 14-day '
  'WAVE_EFFICIENCY_HYBRID probe observation → ops promotes to production. '
  'WAVE requires n=100 vs n=15 for GLOBAL because sector-wave signal is '
  'noisier: contagion can produce layoffs without efficiency intent, and the '
  'D8 logistic coefficients were trained on EFFICIENCY events only.',
  '2026-06-23',
  'Flag: v40_d8_wave_cohort_active (currently mode=off). '
  'Probe: WAVE_EFFICIENCY_HYBRID (expected 62–72, midpoint 67). '
  'Formula path tested: D8+L2_wave+D2_ai_high. '
  'formula_weight=0.09 matches GLOBAL D8 (no weight change — only cohort scope expands).',
  NOW(),
  NOW()
)
ON CONFLICT (dimension_key) DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = NOW();


-- ── 6b. Reserve WAVE slot in engine_calibration_versions (pending, not active) ─
-- Inserts a placeholder row so the WAVE scope is visible in the calibration
-- registry. status='pending' ensures it is not picked up by the audit pipeline
-- until check_d8_wave_expansion() inserts an 'active' row.
INSERT INTO public.engine_calibration_versions (
  version,
  cohort_scope,
  status,
  l1_multiplier, l2_multiplier, l3_multiplier, l4_multiplier, l5_multiplier,
  d8_beta0, d8_beta_l1, d8_beta_l2, d8_beta_ai_signal, d8_beta_layoff_rounds,
  revenue_growth_thresholds, stock_trend_thresholds, fcf_margin_thresholds,
  n_events_total,
  d8_validation_metadata,
  created_at
)
SELECT
  'wave-v40.pending',
  'WAVE',
  'pending',
  l1_multiplier, l2_multiplier, l3_multiplier, l4_multiplier, l5_multiplier,
  d8_beta0, d8_beta_l1, d8_beta_l2, d8_beta_ai_signal, d8_beta_layoff_rounds,
  revenue_growth_thresholds, stock_trend_thresholds, fcf_margin_thresholds,
  n_events_total,
  jsonb_build_object(
    'n_heldout',           0,
    'passes_gate',         false,
    'gate_failure_reason', 'No WAVE events added yet. Add events with cohort_scope=WAVE to d8_heldout_events.',
    'gate_criteria', jsonb_build_object(
      'n_heldout_min',  100,
      'auc_roc_min',    0.72,
      'precision_min',  0.65
    ),
    'evaluated_at',    NOW(),
    'evaluated_by',    'migration-20260623000011',
    'note',            'Placeholder pending WAVE gate evaluation.'
  ),
  NOW()
FROM public.engine_calibration_versions
WHERE cohort_scope = 'GLOBAL' AND status = 'active'
LIMIT 1
ON CONFLICT DO NOTHING;
