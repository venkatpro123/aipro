-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260602000001_audit_shadow_comparison.sql
-- Purpose:   WS0 — Shadow-Mode Harness foundation.
--
--            Strict backward-compatibility policy requires running BOTH the
--            legacy engine and the candidate (transformation-target) engine
--            for every audit during the transformation period, storing both
--            outputs side-by-side, and only flipping the candidate to default
--            after empirical backtest validation.
--
--            This table is the shadow ledger: every audit emits one row with
--            the inputs and both engine outputs. Engineers analyse it via the
--            ShadowComparisonPage to verify (a) candidate produces sensible
--            score deltas (no en-masse tier migrations), (b) confidence
--            distributions align with expectations, and (c) per-cohort
--            calibration AUC has not regressed.
--
--            Critically, rows are written even when all candidate flags are
--            OFF — the legacy engine is duplicated into both columns so we
--            have a baseline distribution before any candidate features
--            ship. This is intentional: it gives us a 7-day "delta should be
--            zero" sanity check before any candidate behaviour is enabled.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.audit_shadow_comparison (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ────────────────────────────────────────────────────────────────
  -- Caller user (NULL for system / load-test runs). RLS forbids cross-user reads.
  user_id                 UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Stable hash of (company_canonical, role, department, country) — enables
  -- grouping shadow runs for the same effective audit across users.
  audit_fingerprint       TEXT         NOT NULL,
  audit_session_id        UUID,

  -- ── Inputs ──────────────────────────────────────────────────────────────────
  company_name            TEXT         NOT NULL,
  company_canonical       TEXT,        -- post-resolver canonical (null if resolver failed)
  role_title              TEXT,
  department              TEXT,
  country                 TEXT,
  -- Full AuditInputs payload as opaque JSON for replay / debugging.
  inputs                  JSONB        NOT NULL,

  -- ── Engine outputs ──────────────────────────────────────────────────────────
  -- Two full HybridResult payloads. Stored as JSONB so schema can evolve without
  -- migrating the ledger. JSONB also allows efficient field-level queries.
  legacy_result           JSONB        NOT NULL,
  candidate_result        JSONB        NOT NULL,

  -- ── Pre-computed deltas (for fast querying without parsing JSONB) ──────────
  -- Pre-computed at write time. Updates require running a one-time recompute
  -- migration if the meaning of these columns changes.
  legacy_score            SMALLINT     CHECK (legacy_score BETWEEN 0 AND 100),
  candidate_score         SMALLINT     CHECK (candidate_score BETWEEN 0 AND 100),
  score_delta             SMALLINT,    -- candidate_score - legacy_score (can be negative)
  legacy_confidence_pct   SMALLINT     CHECK (legacy_confidence_pct BETWEEN 0 AND 100),
  candidate_confidence_pct SMALLINT    CHECK (candidate_confidence_pct BETWEEN 0 AND 100),
  confidence_delta_pct    SMALLINT,
  legacy_tier             TEXT,        -- LOW / MODERATE / HIGH / CRITICAL
  candidate_tier          TEXT,
  tier_migrated           BOOLEAN      GENERATED ALWAYS AS (legacy_tier IS DISTINCT FROM candidate_tier) STORED,

  -- ── Flag state captured at run time ─────────────────────────────────────────
  -- Snapshot of which candidate flags were active for this run. Enables
  -- "what would the score have been if WS3 were also enabled?" analysis when
  -- replaying inputs through the engine.
  active_flags            JSONB        NOT NULL DEFAULT '{}'::jsonb,
  legacy_engine_version   TEXT         NOT NULL,    -- e.g. "v34.0"
  candidate_engine_version TEXT        NOT NULL,    -- e.g. "v34.0+ws3+ws4"

  -- ── Cohort + archetype for stratified analysis ─────────────────────────────
  -- These are populated from the LEGACY result so the shadow analysis can
  -- be sliced by the SAME cohort/archetype assignment regardless of whether
  -- the candidate would have classified differently. The candidate's cohort
  -- assignment is recoverable from candidate_result.
  cohort                  TEXT,        -- DISTRESS / EFFICIENCY / WAVE / UNKNOWN
  archetype               TEXT,        -- ai_efficiency_restructuring / sector_wave / ...

  -- ── Timing ─────────────────────────────────────────────────────────────────
  legacy_duration_ms      INTEGER,
  candidate_duration_ms   INTEGER,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
-- Hot path 1: recent shadow runs for admin dashboard (last 7 days, all users).
CREATE INDEX IF NOT EXISTS idx_asc_recent
  ON public.audit_shadow_comparison (created_at DESC);

-- Hot path 2: per-user shadow runs (for user-scoped RLS reads).
CREATE INDEX IF NOT EXISTS idx_asc_user_recent
  ON public.audit_shadow_comparison (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Hot path 3: tier migrations — admin "did candidate flip a tier?" query.
CREATE INDEX IF NOT EXISTS idx_asc_tier_migrations
  ON public.audit_shadow_comparison (created_at DESC)
  WHERE tier_migrated = TRUE;

-- Hot path 4: per-cohort calibration analysis (group by cohort, aggregate deltas).
CREATE INDEX IF NOT EXISTS idx_asc_cohort
  ON public.audit_shadow_comparison (cohort, created_at DESC)
  WHERE cohort IS NOT NULL;

-- Hot path 5: large-delta investigation — find audits where candidate diverges
-- materially from legacy. Partial index keeps it cheap.
CREATE INDEX IF NOT EXISTS idx_asc_large_delta
  ON public.audit_shadow_comparison (score_delta, created_at DESC)
  WHERE ABS(score_delta) >= 10;

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_shadow_comparison ENABLE ROW LEVEL SECURITY;

-- Users see only their own shadow rows (mostly for "show me my legacy vs new
-- score" diagnostic on demand).
CREATE POLICY "asc_own_rows_select"
  ON public.audit_shadow_comparison FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT is restricted to authenticated users for their own audits. System
-- runs (user_id = NULL) go through service_role which bypasses RLS.
CREATE POLICY "asc_own_rows_insert"
  ON public.audit_shadow_comparison FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- No UPDATE — shadow rows are immutable. The audit is what it was at run time.
-- No DELETE — preserves the analysis dataset.

-- ── Comments ───────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.audit_shadow_comparison IS
  'Shadow-mode ledger for the v35 empirical-trustworthiness transformation. '
  'Each row pairs the legacy and candidate engine outputs for a single audit. '
  'Powers the ShadowComparisonPage admin dashboard and gates per-workstream '
  'flag flips. Rows are immutable; do not UPDATE or DELETE.';

COMMENT ON COLUMN public.audit_shadow_comparison.audit_fingerprint IS
  'sha256(company_canonical|role|department|country) — groups shadow runs '
  'for the same effective audit. Used to detect within-fingerprint variance.';

COMMENT ON COLUMN public.audit_shadow_comparison.tier_migrated IS
  'TRUE when candidate would have placed the user in a different risk tier '
  'than legacy. Generated column for index efficiency.';

COMMENT ON COLUMN public.audit_shadow_comparison.active_flags IS
  'Snapshot of engine_feature_flags state captured at run time. Enables '
  'reconstructing which candidate workstreams were active for this row.';
