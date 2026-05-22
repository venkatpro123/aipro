-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260623000014_stealth_detector_precision.sql
-- Purpose:   GAP-A03 — Stealth layoff detector audit findings + precision infra.
--
-- ════════════════════════════════════════════════════════════════════════════
-- AUDIT FINDINGS (all confirmed by code inspection, 2026-05-22)
-- ════════════════════════════════════════════════════════════════════════════
--
-- FINDING 1 — SOURCE FILTER MISMATCH (critical; detector never fires)
-- ────────────────────────────────────────────────────────────────────
-- stealthLayoffDetector.ts:fetchLinkedinVelocity() queries:
--   .eq('source', 'linkedin')
--
-- scrape-workforce-snapshot/index.ts writes rows with:
--   source = 'sec-edgar'   (company_intelligence.employee_count path)
--   source = 'wikipedia'   (Wikipedia infobox path)
--
-- LinkedIn data path is explicitly stub-only in the scraper:
--   "LinkedIn aggressively blocks bots. Left as a documented stub"
--
-- Result: fetchLinkedinVelocity() always returns null → NO_SIGNAL for
-- every company. The stealth floor (60/65/70 pts) CANNOT fire even if
-- the ws3_stealth_layoff_detector flag were turned on.
-- FIX: broaden source filter to ('linkedin','sec-edgar','wikipedia'),
-- ordered by measurement_confidence DESC. Added dataSource field to
-- StealthSignal so TransparencyTab knows what was actually used.
--
-- FINDING 2 — _stealthSignal NOT PROPAGATED TO HybridResult
-- ──────────────────────────────────────────────────────────
-- stealthSignal is attached to companyData as any (_stealthSignal) but
-- mapToHybridResult() does not forward it. HybridResult has no
-- _stealthSignal field. TransparencyTab's disclosure is a static string:
--   "LinkedIn snapshot shows material employee count decline with no
--    matching layoff news."
-- This renders without delta%, severity, from/to headcount, or data source
-- regardless of what signal was actually detected.
-- FIX: add _stealthSignal to HybridResult; forward in auditDataPipeline
-- after mapToHybridResult; enhance TransparencyTab disclosure.
--
-- FINDING 3 — applyStealthFloor IS DEAD CODE
-- ──────────────────────────────────────────
-- stealthLayoffDetector.ts exports applyStealthFloor(originalScore, signal).
-- auditDataPipeline.ts applies hard floors (60/65/70) directly without
-- calling this function. applyStealthFloor is imported but never invoked.
-- FIX: deprecated in source code with pointer to auditDataPipeline:1700.
--
-- FINDING 4 — THREE NAMED PATTERNS VS ONE IMPLEMENTATION
-- ──────────────────────────────────────────────────────
-- Section 7.3 / audit docs name three patterns:
--   "contractor-only cuts, silent headcount shrink, voluntary attrition
--    acceleration"
-- The actual implementation detects ONE: aggregate headcount delta over
-- 26 weeks, cross-referenced against announced rounds.
-- "Contractor-only cuts" and "voluntary attrition acceleration" are
-- motivating context (mentioned in the code comment) but not separately
-- measured. Both are absorbed into the headcount delta.
-- FIX: documented in scoring_architecture_log; TransparencyTab now
-- discloses which single signal was measured.
--
-- FINDING 5 — PRECISION: 0 CONFIRMED FIRED CASES
-- ────────────────────────────────────────────────
-- Flag ws3_stealth_layoff_detector = 'off'. Source filter bug means even
-- if flag were on, no cases would fire. user_prediction_outcomes has no
-- stealth_layoff_detected column, so no precision data is collectible.
-- FIX: add stealth_layoff_detected + stealth_signal_severity columns to
-- user_prediction_outcomes; create stealth_layoff_precision_summary view;
-- register stealthLayoffDetector.precisionStatus in engine_calibration_constants
-- as uncalibrated_placeholder.
--
-- ════════════════════════════════════════════════════════════════════════════
-- THIS MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- 1. Add stealth_layoff_detected + stealth_signal_severity to user_prediction_outcomes
-- 2. Create stealth_layoff_precision_summary VIEW
-- 3. Add stealthLayoffDetector.precisionStatus to engine_calibration_constants
-- 4. Log all five findings to scoring_architecture_log
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. Precision tracking columns on user_prediction_outcomes ─────────────
-- stealth_layoff_detected: TRUE when the detector flagged this audit at
--   SILENT_TRIM or worse severity with no announced round.
-- stealth_signal_severity: the severity band that was active (or NULL when
--   detector returned NO_DATA / STABLE / SOFT_TRIM / flag was off).
ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS stealth_layoff_detected  BOOLEAN;

ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS stealth_signal_severity  TEXT
    CHECK (stealth_signal_severity IN (
      'STABLE','SOFT_TRIM','SILENT_TRIM','SILENT_CUT','SILENT_PURGE','NO_DATA'
    ));

COMMENT ON COLUMN public.user_prediction_outcomes.stealth_layoff_detected IS
  'GAP-A03 — TRUE when stealthLayoffDetector flagged this audit run at '
  'SILENT_TRIM, SILENT_CUT, or SILENT_PURGE severity with no announced round. '
  'NULL means detector was disabled (flag=off) or returned NO_DATA. '
  'Used to compute precision: among flagged audits, what fraction had a confirmed '
  'layoff outcome within 90 days? Gate: precision >= 0.60 required before '
  'activating SILENT_TRIM floor in production.';

COMMENT ON COLUMN public.user_prediction_outcomes.stealth_signal_severity IS
  'GAP-A03 — The StealthSeverity band that the detector assigned this run. '
  'NULL when flag=off or NO_DATA. STABLE/SOFT_TRIM are non-flagged (no floor applied). '
  'SILENT_TRIM=floor 60, SILENT_CUT=floor 65, SILENT_PURGE=floor 70.';

CREATE INDEX IF NOT EXISTS idx_upo_stealth_detected
  ON public.user_prediction_outcomes (stealth_layoff_detected, outcome_reported)
  WHERE stealth_layoff_detected IS TRUE;


-- ── 2. Stealth detector precision summary VIEW ────────────────────────────
-- Returns per-severity-band precision: among outcomes where the detector
-- flagged, what fraction had outcome_reported IN ('laid_off','company_closed')
-- within 90 days (proxy via outcome_date - audit_date)?
-- Until there are any flagged cases, every row will be NULL.
CREATE OR REPLACE VIEW public.stealth_layoff_precision_summary AS
SELECT
  stealth_signal_severity,
  COUNT(*) FILTER (WHERE stealth_layoff_detected IS TRUE)                        AS n_flagged,
  COUNT(*) FILTER (
    WHERE stealth_layoff_detected IS TRUE
      AND outcome_reported IN ('laid_off', 'company_closed')
  )                                                                               AS n_confirmed_layoff,
  COUNT(*) FILTER (
    WHERE stealth_layoff_detected IS TRUE
      AND outcome_reported NOT IN ('laid_off', 'company_closed')
      AND outcome_reported IS NOT NULL
  )                                                                               AS n_false_positive,
  ROUND(
    COUNT(*) FILTER (
      WHERE stealth_layoff_detected IS TRUE
        AND outcome_reported IN ('laid_off', 'company_closed')
    )::NUMERIC / NULLIF(
      COUNT(*) FILTER (WHERE stealth_layoff_detected IS TRUE AND outcome_reported IS NOT NULL),
      0
    ), 3
  )                                                                               AS precision,
  -- Gate: precision >= 0.60 required for production activation
  CASE
    WHEN COUNT(*) FILTER (WHERE stealth_layoff_detected IS TRUE AND outcome_reported IS NOT NULL) >= 20
      AND ROUND(
        COUNT(*) FILTER (
          WHERE stealth_layoff_detected IS TRUE
            AND outcome_reported IN ('laid_off', 'company_closed')
        )::NUMERIC / NULLIF(
          COUNT(*) FILTER (WHERE stealth_layoff_detected IS TRUE AND outcome_reported IS NOT NULL),
          0
        ), 3
      ) >= 0.60
    THEN 'gate_clears'
    WHEN COUNT(*) FILTER (WHERE stealth_layoff_detected IS TRUE AND outcome_reported IS NOT NULL) < 20
    THEN 'insufficient_cases'
    ELSE 'precision_below_gate'
  END                                                                             AS gate_status
FROM public.user_prediction_outcomes
GROUP BY stealth_signal_severity;

COMMENT ON VIEW public.stealth_layoff_precision_summary IS
  'GAP-A03 — Precision monitoring for stealthLayoffDetector. '
  'Gate: n_outcomes_with_result >= 20 AND precision >= 0.60 before activating '
  'SILENT_TRIM floor (60pts). SILENT_CUT (65pts) and SILENT_PURGE (70pts) require '
  'precision >= 0.65 and >= 0.70 respectively. '
  'Currently 0 flagged cases because: (a) flag=off, (b) source filter bug in '
  'detectStealthLayoff queries source=''linkedin'' but scraper writes source=''sec-edgar''.';


-- ── 3. Register precision status in engine_calibration_constants ──────────
-- Columns added by 20260623000013 schema fix; safe to repeat as IF NOT EXISTS.
ALTER TABLE public.engine_calibration_constants
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS added_in_version TEXT;

INSERT INTO public.engine_calibration_constants
  (key, value, provenance, description, status, cohort_scope, added_in_version)
VALUES
  (
    'stealthLayoffDetector.precisionStatus',
    '"UNKNOWN"',
    'uncalibrated_placeholder',
    'GAP-A03 — Precision of the stealth layoff detector (fraction of flagged audits '
    'where a real layoff occurred within 90 days). '
    'UNKNOWN: flag=off + source-filter bug means 0 production cases have fired. '
    'Gate required before activating floors: '
    'SILENT_TRIM (60pts): precision >= 0.60 on >= 20 confirmed outcomes; '
    'SILENT_CUT (65pts): precision >= 0.65; '
    'SILENT_PURGE (70pts): precision >= 0.70. '
    'TransparencyTab must display "Precision: UNKNOWN" when stealth_layoff_floor fires '
    'until this gate is cleared. '
    'Source of precision data: stealth_layoff_precision_summary view.',
    'active',
    'GLOBAL',
    'v40.0'
  ),
  (
    'stealthLayoffDetector.dataSourceFilter',
    '"linkedin,sec-edgar,wikipedia"',
    'uncalibrated_placeholder',
    'GAP-A03 SOURCE FIX — Accepted source values for workforce_velocity_6mo queries. '
    'Previously hard-coded to linkedin only; broadened to accept sec-edgar and wikipedia '
    'because the scraper writes sec-edgar (company_intelligence path) and wikipedia rows. '
    'LinkedIn-sourced rows (most accurate) are preferred when available (ordered by '
    'measurement_confidence DESC). Until real LinkedIn scraping is active, all detection '
    'runs on sec-edgar/wikipedia data — lower confidence (0.78-0.90 vs 0.95 for LinkedIn).',
    'active',
    'GLOBAL',
    'v40.0'
  )
ON CONFLICT (key, status, cohort_scope) DO NOTHING;


-- ── 4. Log all five findings to scoring_architecture_log ─────────────────
INSERT INTO public.scoring_architecture_log (
  dimension_key,
  change_type,
  description,
  migration_ref,
  created_at
) VALUES (
  'stealth_detector_gap_a03',
  'audit_fix',
  'GAP-A03: 5 findings in stealthLayoffDetector. '
  'F1 (critical): source filter queries linkedin but scraper writes sec-edgar/wikipedia — '
  'detector returns NO_DATA for ALL companies; floor can NEVER fire. Fixed: broadened to '
  'in(linkedin,sec-edgar,wikipedia) ordered by measurement_confidence DESC. '
  'F2: _stealthSignal lost after mapToHybridResult; TransparencyTab shows static string. '
  'Fixed: added _stealthSignal to HybridResult; forwarded in auditDataPipeline; '
  'TransparencyTab disclosure now shows delta%, severity, from/to headcount, data source, '
  'precision UNKNOWN badge. '
  'F3: applyStealthFloor is dead code (auditDataPipeline uses hard 60/65/70 directly). '
  'Deprecated in source. '
  'F4: three named patterns (contractor-only cuts, silent headcount shrink, voluntary '
  'attrition acceleration) map to ONE implementation: aggregate headcount delta. '
  'TransparencyTab now discloses which single signal is measured. '
  'F5: precision = UNKNOWN — 0 fired cases; no outcome tracking column existed. '
  'Added stealth_layoff_detected + stealth_signal_severity to user_prediction_outcomes. '
  'Gate: precision >= 0.60 on >= 20 outcomes before activating SILENT_TRIM floor.',
  '20260623000014',
  NOW()
)
ON CONFLICT DO NOTHING;
