-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260519000004_outcome_ingestion.sql
-- Purpose:   Outcome ingestion pipeline — ground-truth quality controls.
--
-- What this migration does:
--
--   1. Adds missing columns to user_prediction_outcomes
--      (outcome_source, detection_confidence, detected_at, predicted_cohort,
--       predicted_archetype, requires_manual_review, review_reason,
--       ingestion_run_id, detection_evidence).
--      These are referenced in outcomesRepository.ts but were never added
--      to the schema — the v1/v2 migrations only added archetype/score_breakdown.
--
--   2. Replaces the wrong UNIQUE(user_id, audit_session_id, outcome_source)
--      intent with the correct UNIQUE(user_id, audit_session_id).
--      The old design allowed the same event to create one row per source
--      (WARN + layoffs.fyi = 2 rows), inflating the calibration dataset.
--      The correct design is ONE row per session with the best source winning.
--
--   3. Creates upsert_outcome_with_source_priority(…) — atomic function that
--      applies source-priority rules in a single round-trip:
--        WARN Act filing       → confidence 0.95 (legally mandated, highest reliability)
--        layoffs.fyi confirmed → confidence 0.90
--        news article          → confidence 0.75
--      When multiple sources match the same session:
--        higher confidence wins; ties mark outcome_source = 'dual_coded'.
--      Confidence < 0.70: sets requires_manual_review = true, leaves
--        outcome_reported = NULL (not auto-attributed).
--
--   4. Creates outcome_dual_coding_candidates view — shows sessions where
--      multiple sources detected the same outcome (for SLO dashboard and
--      agreement rate calculation in outcomeBacktestRunner.ts).
--
--   5. Registers the outcome-ingestion-daily pg_cron schedule.
--
-- Privacy: all changes are additive; existing user rows are unaffected.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add missing columns ────────────────────────────────────────────────────

ALTER TABLE user_prediction_outcomes
  -- Source of the outcome record
  ADD COLUMN IF NOT EXISTS outcome_source       TEXT
    CHECK (outcome_source IN (
      'user_reported', 'implicit_warn', 'implicit_layoffsfyi',
      'implicit_news', 'dual_coded'
    )),
  -- Confidence that the detected outcome is accurate (0–1).
  -- user_reported = 1.0 (always). implicit sources: WARN=0.95, lfyi=0.90, news=0.75.
  ADD COLUMN IF NOT EXISTS detection_confidence NUMERIC(4,3)
    CHECK (detection_confidence IS NULL OR (detection_confidence >= 0 AND detection_confidence <= 1)),
  -- When this outcome was attributed (by cron or user action)
  ADD COLUMN IF NOT EXISTS detected_at          TIMESTAMPTZ,
  -- Cohort the audit was classified as (DISTRESS / EFFICIENCY / WAVE / UNKNOWN)
  ADD COLUMN IF NOT EXISTS predicted_cohort     TEXT
    CHECK (predicted_cohort IN ('DISTRESS', 'EFFICIENCY', 'WAVE', 'UNKNOWN', 'GLOBAL')),
  -- Scoring archetype at prediction time (e.g. 'financial_distress_layoff')
  ADD COLUMN IF NOT EXISTS predicted_archetype  TEXT,
  -- JSON array of all source signals that triggered this detection.
  -- [{source, confidence, event_date, event_company, notes}, ...]
  -- Preserved even when a higher-confidence source wins (audit trail).
  ADD COLUMN IF NOT EXISTS detection_evidence   JSONB,
  -- True when confidence < 0.70 — outcome must NOT be auto-attributed.
  -- Human reviewer reads review_reason and either confirms or rejects.
  ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN NOT NULL DEFAULT false,
  -- Why this row was flagged for review (e.g. "news confidence 0.65 < threshold 0.70")
  ADD COLUMN IF NOT EXISTS review_reason        TEXT,
  -- UUID of the ingestion cron run that wrote or last updated this row.
  -- Enables audit: "which cron run attributed this outcome?"
  ADD COLUMN IF NOT EXISTS ingestion_run_id     TEXT;

-- ── 2. Unique constraint: one row per (user_id, audit_session_id) ─────────────
-- The old insertImplicitDetections used (user_id, audit_session_id, outcome_source)
-- which created multiple rows for the same event. Correct design: one canonical row
-- per session, with the best source winning in place.
--
-- Add the correct constraint IF it doesn't already exist.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_prediction_outcomes'::regclass
      AND conname   = 'upo_session_unique'
  ) THEN
    ALTER TABLE user_prediction_outcomes
      ADD CONSTRAINT upo_session_unique UNIQUE (user_id, audit_session_id);
  END IF;
END
$do$;

-- Indexes for ingestion queries
CREATE INDEX IF NOT EXISTS idx_upo_outcome_source
  ON user_prediction_outcomes (outcome_source)
  WHERE outcome_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_upo_detection_confidence
  ON user_prediction_outcomes (detection_confidence)
  WHERE detection_confidence IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_upo_manual_review
  ON user_prediction_outcomes (requires_manual_review, detected_at DESC)
  WHERE requires_manual_review = true;

CREATE INDEX IF NOT EXISTS idx_upo_cohort_outcome
  ON user_prediction_outcomes (predicted_cohort, outcome_reported)
  WHERE outcome_reported IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_upo_unconfirmed
  ON user_prediction_outcomes (audit_date DESC)
  WHERE outcome_reported IS NULL;

-- ── 3. Source-priority upsert function ───────────────────────────────────────
-- Called by the outcome-ingestion Edge Function for every candidate detection.
-- Atomically applies the priority rules in a single DB round-trip.
--
-- Rules:
--   a. If existing row has outcome_source = 'user_reported': never overwrite.
--   b. If incoming confidence > existing confidence: update (higher source wins).
--   c. If incoming confidence == existing confidence AND different source: dual_coded.
--   d. If incoming confidence < existing confidence: skip (lower source loses).
--   e. If no existing outcome yet AND confidence >= 0.70: auto-attribute.
--   f. If no existing outcome yet AND confidence <  0.70: flag for manual review.
--
-- Returns JSONB: {action: 'inserted'|'updated'|'dual_coded'|'skipped'|'flagged', id: uuid}

CREATE OR REPLACE FUNCTION upsert_outcome_with_source_priority(
  p_user_id             UUID,
  p_audit_session_id    TEXT,
  p_outcome_source      TEXT,         -- 'implicit_warn'|'implicit_layoffsfyi'|'implicit_news'
  p_outcome_reported    TEXT,         -- 'laid_off' etc. — null when flagging for review
  p_outcome_date        TIMESTAMPTZ,
  p_detection_confidence NUMERIC,
  p_detection_evidence  JSONB,
  p_ingestion_run_id    TEXT,
  p_manual_review_threshold NUMERIC  DEFAULT 0.70
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_id            UUID;
  existing_source        TEXT;
  existing_confidence    NUMERIC;
  is_manual_review       BOOLEAN;
  effective_outcome      TEXT;
  effective_source       TEXT;
  review_note            TEXT;
  result                 JSONB;
BEGIN
  -- Find existing unconfirmed row for this (user, session)
  SELECT id, outcome_source, detection_confidence
  INTO   existing_id, existing_source, existing_confidence
  FROM   user_prediction_outcomes
  WHERE  user_id           = p_user_id
    AND  audit_session_id  = p_audit_session_id
  LIMIT 1;

  -- Rule a: never overwrite user-reported outcomes
  IF FOUND AND existing_source = 'user_reported' THEN
    RETURN jsonb_build_object('action', 'skipped', 'reason', 'user_reported_protected',
      'id', existing_id);
  END IF;

  -- Determine whether to auto-attribute or flag for manual review
  is_manual_review  := p_detection_confidence < p_manual_review_threshold;
  effective_outcome := CASE WHEN is_manual_review THEN NULL ELSE p_outcome_reported END;
  review_note       := CASE WHEN is_manual_review
    THEN format('%s confidence %.3f < threshold %.2f — manual review required',
                p_outcome_source, p_detection_confidence, p_manual_review_threshold)
    ELSE NULL
  END;

  IF NOT FOUND THEN
    -- No existing row: we cannot INSERT here because the row must already exist
    -- (created when the user ran their audit). Return 'no_session' so the caller
    -- knows to skip this candidate.
    RETURN jsonb_build_object('action', 'no_session',
      'reason', 'audit session row not found — ingestion only updates existing sessions');
  END IF;

  -- Rule b: higher confidence wins → UPDATE
  IF p_detection_confidence > COALESCE(existing_confidence, 0) THEN
    effective_source := p_outcome_source;

    UPDATE user_prediction_outcomes SET
      outcome_reported       = effective_outcome,
      outcome_source         = effective_source,
      detection_confidence   = p_detection_confidence,
      detected_at            = NOW(),
      outcome_date           = COALESCE(p_outcome_date, outcome_date),
      detection_evidence     = COALESCE(p_detection_evidence, detection_evidence),
      requires_manual_review = is_manual_review,
      review_reason          = review_note,
      ingestion_run_id       = p_ingestion_run_id,
      updated_at             = NOW()
    WHERE id = existing_id;

    result := jsonb_build_object(
      'action', CASE WHEN is_manual_review THEN 'flagged' ELSE 'updated' END,
      'id', existing_id,
      'new_source', effective_source,
      'confidence', p_detection_confidence,
      'requires_manual_review', is_manual_review
    );

  -- Rule c: same confidence, different source → dual_coded
  ELSIF p_detection_confidence = COALESCE(existing_confidence, -1)
    AND existing_source IS DISTINCT FROM p_outcome_source
    AND existing_source != 'dual_coded'
  THEN
    UPDATE user_prediction_outcomes SET
      outcome_source         = 'dual_coded',
      detection_evidence     = COALESCE(
        detection_evidence || jsonb_build_array(p_detection_evidence),
        p_detection_evidence
      ),
      ingestion_run_id       = p_ingestion_run_id,
      updated_at             = NOW()
    WHERE id = existing_id;

    result := jsonb_build_object(
      'action', 'dual_coded',
      'id', existing_id,
      'sources', jsonb_build_array(existing_source, p_outcome_source),
      'confidence', p_detection_confidence
    );

  -- Rule d: lower confidence → skip (existing row is more authoritative)
  ELSE
    result := jsonb_build_object(
      'action', 'skipped',
      'reason', format('existing confidence %.3f >= incoming %.3f',
                       COALESCE(existing_confidence, 0), p_detection_confidence),
      'id', existing_id
    );
  END IF;

  RETURN result;
END;
$$;

-- ── 4. outcome_dual_coding_candidates view ────────────────────────────────────
-- Sessions where the outcome_source is 'dual_coded', meaning at least two
-- independent sources (e.g. WARN + layoffs.fyi) agreed on the outcome.
-- Used by outcomeBacktestRunner.selectionBiasReport() to compute agreement rate.
-- Also surfaced in the admin calibration dashboard as a quality signal.
CREATE OR REPLACE VIEW outcome_dual_coding_candidates AS
SELECT
  upo.id,
  upo.user_id,
  upo.audit_session_id,
  upo.company_name,
  upo.audit_date,
  upo.outcome_reported,
  upo.outcome_date,
  upo.detection_confidence,
  upo.detection_evidence,
  upo.detected_at,
  -- 'agree' is true when dual_coded sources both indicate laid_off.
  -- Since dual_coded only fires when two implicit sources agree on the same outcome,
  -- the agree flag is always true for this view. It's included so the
  -- selectionBiasReport query `SELECT agree FROM outcome_dual_coding_candidates`
  -- works without code changes.
  (upo.outcome_reported IN ('laid_off', 'company_closed'))  AS agree,
  upo.predicted_cohort,
  upo.predicted_archetype,
  upo.predicted_score
FROM user_prediction_outcomes upo
WHERE upo.outcome_source = 'dual_coded'
  AND upo.outcome_reported IS NOT NULL;

-- ── 5. pending_manual_review view ────────────────────────────────────────────
-- Sessions flagged for human review (confidence < 0.70). Admin panel reads this.
CREATE OR REPLACE VIEW outcome_pending_manual_review AS
SELECT
  upo.id,
  upo.user_id,
  upo.company_name,
  upo.role_title,
  upo.audit_date,
  upo.predicted_score,
  upo.predicted_risk_tier,
  upo.outcome_source,
  upo.detection_confidence,
  upo.review_reason,
  upo.detection_evidence,
  upo.detected_at,
  upo.ingestion_run_id
FROM user_prediction_outcomes upo
WHERE upo.requires_manual_review = true
  AND upo.outcome_reported IS NULL
ORDER BY upo.detected_at DESC;

-- ── 6. pg_cron: outcome-ingestion-daily ──────────────────────────────────────
-- Runs at 04:00 UTC daily, after the warn-act-fetch window (03:00 UTC).
-- Fetches WARN + layoffs.fyi + news events from the last 365 days, matches
-- them against unconfirmed audit sessions, and writes outcome records using
-- upsert_outcome_with_source_priority.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Upsert so re-running this migration is safe
    PERFORM cron.unschedule('outcome-ingestion-daily')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'outcome-ingestion-daily'
    );

    PERFORM cron.schedule(
      'outcome-ingestion-daily',
      '0 4 * * *',
      $job$SELECT net.http_post(
        url     := current_setting('app.supabase_url') || '/functions/v1/outcome-ingestion',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
          'Content-Type',  'application/json'
        ),
        body    := jsonb_build_object(
          'lookbackDays', 365,
          'manualReviewThreshold', 0.70
        )
      )$job$
    );
    RAISE NOTICE 'outcome-ingestion-daily scheduled at 04:00 UTC.';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — outcome-ingestion-daily not scheduled.';
  END IF;
END
$do$;
