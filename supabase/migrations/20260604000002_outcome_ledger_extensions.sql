-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260604000002_outcome_ledger_extensions.sql
-- Purpose:   WS2 — Extend user_prediction_outcomes for implicit-detection-first
--            calibration data strategy.
--
--            user_prediction_outcomes currently assumes every outcome row is
--            user-reported (via the 30/90/180-day prompts). The
--            implicitOutcomeDetector module is built but unwired; activating
--            it requires distinguishing:
--              * user_reported       — user confirmed via prompt
--              * implicit_warn       — detected via WARN Act filing match
--              * implicit_layoffsfyi — detected via layoffs.fyi event match
--              * implicit_news       — detected via curated news cache match
--              * dual_coded          — both user-reported AND implicit detection agreed
--
--            We also need per-row detection_confidence so the
--            calibrationBacktester can filter to confidence>=0.75 when
--            building the training set.
--
--            New rows: implicit detections inserted by the
--            outcomeIngestionPipeline cron with outcome_reported populated
--            (laid_off / company_closed / etc.) and outcome_source set to
--            the appropriate implicit_* value. user_id is set to the audit
--            owner so RLS still scopes reads.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Add new columns ────────────────────────────────────────────────────────────
ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS outcome_source TEXT
    CHECK (outcome_source IN (
      'user_reported',
      'implicit_warn',
      'implicit_layoffsfyi',
      'implicit_news',
      'dual_coded'
    ));

ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS detection_confidence NUMERIC(4,3)
    CHECK (detection_confidence BETWEEN 0 AND 1);

ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ;

-- Reference to the matched layoff event (WARN / layoffs.fyi / news cache).
-- JSONB rather than FK so we can store partial matches with provenance.
ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS detection_evidence JSONB;

-- The cohort and predicted scoring archetype at audit time. Captured here so
-- backtest analysis can stratify outcomes by (predicted_score, cohort) without
-- having to re-resolve the historical company state.
ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS predicted_cohort TEXT;

ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS predicted_archetype TEXT;

-- ── Backfill existing rows ─────────────────────────────────────────────────────
-- Existing rows have outcome_reported set (from user prompts) and no
-- detection metadata. Default them to user_reported with confidence=1.0.
UPDATE public.user_prediction_outcomes
SET outcome_source = 'user_reported',
    detection_confidence = 1.000,
    detected_at = COALESCE(updated_at, created_at)
WHERE outcome_source IS NULL
  AND outcome_reported IS NOT NULL;

-- ── Indexes for the backtest hot path ──────────────────────────────────────────
-- Backtester reads "all confirmed outcomes with detection_confidence>=0.75
-- in the training window".
CREATE INDEX IF NOT EXISTS idx_upo_backtest_set
  ON public.user_prediction_outcomes (audit_date)
  WHERE outcome_reported IS NOT NULL
    AND detection_confidence >= 0.75;

-- Per-cohort backtest queries.
CREATE INDEX IF NOT EXISTS idx_upo_cohort
  ON public.user_prediction_outcomes (predicted_cohort, audit_date)
  WHERE outcome_reported IS NOT NULL;

-- Outcome-source breakdown queries (e.g. "what % of outcomes came from
-- implicit detection vs user reports last quarter").
CREATE INDEX IF NOT EXISTS idx_upo_source_date
  ON public.user_prediction_outcomes (outcome_source, detected_at DESC);

-- ── Outcome ingestion deduplication ────────────────────────────────────────────
-- The outcomeIngestionPipeline runs every 6h. We must not insert a duplicate
-- implicit detection if a previous run already found and inserted the same
-- outcome for the same audit. Enforce this with a partial unique constraint:
-- (user_id, audit_session_id, outcome_source) when outcome_source is not
-- user_reported (user reports can supersede; implicits cannot duplicate).
CREATE UNIQUE INDEX IF NOT EXISTS uq_upo_implicit_dedup
  ON public.user_prediction_outcomes (user_id, audit_session_id, outcome_source)
  WHERE outcome_source IN ('implicit_warn', 'implicit_layoffsfyi', 'implicit_news')
    AND audit_session_id IS NOT NULL;

-- ── Dual-coding helper view ────────────────────────────────────────────────────
-- Surfaces audits where BOTH user and implicit detection produced an outcome.
-- The outcomeIngestionPipeline uses this to upgrade outcome_source to
-- 'dual_coded' and confidence to 1.0 when implicit + user agree, and to
-- flag disagreement for manual review.
CREATE OR REPLACE VIEW public.outcome_dual_coding_candidates AS
SELECT
  ur.id                AS user_row_id,
  im.id                AS implicit_row_id,
  ur.user_id,
  ur.audit_session_id,
  ur.company_name,
  ur.outcome_reported  AS user_outcome,
  im.outcome_reported  AS implicit_outcome,
  ur.outcome_date      AS user_date,
  im.detected_at       AS implicit_date,
  im.outcome_source    AS implicit_source,
  im.detection_confidence,
  (ur.outcome_reported = im.outcome_reported) AS agree
FROM public.user_prediction_outcomes ur
JOIN public.user_prediction_outcomes im
  ON ur.user_id = im.user_id
 AND ur.audit_session_id = im.audit_session_id
 AND ur.audit_session_id IS NOT NULL
WHERE ur.outcome_source = 'user_reported'
  AND im.outcome_source IN ('implicit_warn', 'implicit_layoffsfyi', 'implicit_news');

-- ── Comments ───────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.user_prediction_outcomes.outcome_source IS
  'How the outcome was learned. user_reported = explicit user response; '
  'implicit_* = auto-detected via layoff event matching; dual_coded = both '
  'agreed. Detector confidence threshold: implicit rows enter calibration '
  'training set only when detection_confidence >= 0.75.';

COMMENT ON COLUMN public.user_prediction_outcomes.detection_evidence IS
  'JSONB capture of the matched event. Schema: { source, match_score, '
  'event_url, event_date, percent_cut?, headcount_affected? }.';

COMMENT ON COLUMN public.user_prediction_outcomes.predicted_cohort IS
  'Cohort classification at audit time (DISTRESS / EFFICIENCY / WAVE / '
  'UNKNOWN). Captured so backtest queries can stratify without re-running '
  'cohort classifier against current data.';

COMMENT ON VIEW public.outcome_dual_coding_candidates IS
  'WS2 — Surfaces audits where both user and implicit detection produced an '
  'outcome. The ingestion pipeline reads this view to promote agreeing rows '
  'to dual_coded (confidence=1.0) and to flag disagreements for manual review.';
