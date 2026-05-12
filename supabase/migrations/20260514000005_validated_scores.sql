-- 20260514000005_validated_scores.sql
--
-- Creates the validated_scores table referenced by:
--   1. analyze-signals/index.ts  — upserts per-role dimension scores
--   2. 20260514000004 trigger     — marks rows stale on confirmed layoff event
--
-- The table was always assumed to exist (analyze-signals has been deployed for
-- several versions) but no CREATE TABLE migration was ever written. This caused
-- two production failures:
--   a) analyze-signals returned HTTP 500 "relation does not exist" on every call
--   b) the invalidate_scores_on_layoff_event trigger failed with the same error,
--      preventing breaking_news_events INSERTs from completing on some Postgres
--      versions (trigger body error inside AFTER trigger re-raises in PostgreSQL 14+)

CREATE TABLE IF NOT EXISTS public.validated_scores (
  -- Natural key: one row per role (company + role title combined by the caller)
  role_key          TEXT        PRIMARY KEY,

  -- Six HumanProof dimension scores (0–100 scale, decimal precision)
  d1                NUMERIC(5, 2),   -- Routine Automation Potential
  d2                NUMERIC(5, 2),   -- Industry Disruption Velocity
  d3                NUMERIC(5, 2),   -- Augmentation Synergy
  d4                NUMERIC(5, 2),   -- Human-in-the-loop Necessity
  d5                NUMERIC(5, 2),   -- Regional Economic Resilience
  d6                NUMERIC(5, 2),   -- Skill Obsolescence Rate

  -- Composite score (3–97, per HumanProof scoring contract)
  final_score       INTEGER     CHECK (final_score BETWEEN 0 AND 100),

  -- Model self-reported confidence (0–100)
  confidence_pct    INTEGER     CHECK (confidence_pct BETWEEN 0 AND 100),

  -- Temporal fields
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Which live_signals sources fed into this score
  sources_used      TEXT[]      NOT NULL DEFAULT '{}',

  -- Audit timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
-- Primary cache-validity check: fetch scores by role ordered by validity
-- NOTE: no partial predicate — NOW() is STABLE (not IMMUTABLE) so PostgreSQL
-- rejects it in partial index WHERE clauses. Queries filter valid_until at
-- runtime; the index on (role_key, valid_until) still makes those fast.
CREATE INDEX IF NOT EXISTS idx_validated_scores_valid
  ON public.validated_scores (role_key, valid_until DESC);

-- Trigger invalidation support: prefix scan by company name prefix
-- (role_key format: "<company_name>|<role_title>")
CREATE INDEX IF NOT EXISTS idx_validated_scores_role_key_prefix
  ON public.validated_scores (role_key text_pattern_ops);

-- ── Auto-update trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_validated_scores_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_validated_scores_updated_at
  BEFORE UPDATE ON public.validated_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_validated_scores_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.validated_scores ENABLE ROW LEVEL SECURITY;

-- Public read: scores are aggregate intelligence, no PII
CREATE POLICY "validated_scores_public_read"
  ON public.validated_scores FOR SELECT
  USING (true);

-- Authenticated users can upsert their own role scores (analyze-signals calls
-- this with the user's JWT so the INSERT is made as the authenticated role)
CREATE POLICY "validated_scores_authenticated_upsert"
  ON public.validated_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "validated_scores_authenticated_update"
  ON public.validated_scores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- service_role bypass for the invalidation trigger and pipeline scripts
-- (service_role bypasses RLS by default — no explicit policy needed)

COMMENT ON TABLE public.validated_scores IS
  'Per-role HumanProof dimension scores (D1-D6) and composite final_score, '
  'computed by analyze-signals via Google Gemma. Scores have a 30-day validity '
  'window; the valid_until column is set to NOW() by the '
  'invalidate_scores_on_layoff_event trigger when a confirmed layoff event '
  'arrives, forcing re-computation on the next user request. '
  'Created by audit fix BUG-4: this table was missing from all migrations.';
