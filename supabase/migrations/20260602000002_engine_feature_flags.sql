-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260602000002_engine_feature_flags.sql
-- Purpose:   WS0 — Server-authoritative feature flag registry for the
--            empirical-trustworthiness transformation.
--
--            Every workstream (WS2–WS8) ships behind its own flag. The flag
--            state determines whether the candidate engine path runs in
--            shadow mode (output captured but not user-facing) or production
--            mode (user-facing). Default state for every WS flag is
--            'shadow' until empirical backtest validation passes.
--
--            The flags table is read once per audit and cached for 60s
--            client-side via featureFlags.ts. Server-side edge functions
--            read on every invocation (no caching) because they may run
--            in cold-start environments.
--
--            Flags are NEVER deleted — superseded flags get
--            mode='deprecated' so historical shadow rows remain
--            interpretable. The active_flags JSONB column on
--            audit_shadow_comparison stores a snapshot at run time.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.engine_feature_flags (
  flag_key            TEXT         PRIMARY KEY,

  -- ── Mode ─────────────────────────────────────────────────────────────────────
  -- off:        candidate path is not executed at all (legacy only).
  -- shadow:     candidate path runs and writes to audit_shadow_comparison
  --             but does NOT affect the user-facing result.
  -- canary:     candidate path is user-facing for users in canary_user_ids
  --             list; shadow for everyone else.
  -- production: candidate path is user-facing for all users.
  -- deprecated: flag is superseded; ignore (kept for historical lineage).
  mode                TEXT         NOT NULL DEFAULT 'off'
    CHECK (mode IN ('off', 'shadow', 'canary', 'production', 'deprecated')),

  -- ── Canary scope (only used when mode = 'canary') ───────────────────────────
  -- Array of user UUIDs receiving the candidate path. Empty = nobody (effectively 'off'
  -- in canary mode). Populated incrementally during canary rollout.
  canary_user_ids     UUID[]       NOT NULL DEFAULT ARRAY[]::UUID[],
  -- Percentage rollout (0-100) — used when canary_user_ids is empty. Hashes
  -- (user_id || flag_key) % 100; deterministic per user.
  canary_pct          SMALLINT     NOT NULL DEFAULT 0
    CHECK (canary_pct BETWEEN 0 AND 100),

  -- ── Metadata ────────────────────────────────────────────────────────────────
  description         TEXT         NOT NULL,
  workstream          TEXT         NOT NULL    -- WS0..WS8
    CHECK (workstream ~ '^WS[0-9]$'),
  -- Acceptance criteria summary for ops dashboard. When all listed criteria
  -- are met (manually verified), the flag is eligible for promotion.
  acceptance_criteria TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Free-form JSON for flag-specific config (e.g. thresholds, sampling rates).
  config              JSONB        NOT NULL DEFAULT '{}'::jsonb,

  -- ── Promotion audit trail ───────────────────────────────────────────────────
  -- Tracks the lifecycle of mode transitions. Each row in
  -- engine_feature_flag_history captures one transition; this column is the
  -- current state's actor + reason.
  last_changed_by     UUID         REFERENCES auth.users(id),
  last_changed_reason TEXT,
  last_changed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Promotion history ──────────────────────────────────────────────────────────
-- Append-only ledger of every mode change. Required for audit compliance
-- ("when did WS3 go to production? who approved it? what backtest data
-- supported the decision?").
CREATE TABLE IF NOT EXISTS public.engine_feature_flag_history (
  id                 BIGSERIAL    PRIMARY KEY,
  flag_key           TEXT         NOT NULL REFERENCES public.engine_feature_flags(flag_key) ON DELETE CASCADE,
  from_mode          TEXT,        -- NULL on initial insert
  to_mode            TEXT         NOT NULL,
  from_canary_pct    SMALLINT,
  to_canary_pct      SMALLINT,
  changed_by         UUID         REFERENCES auth.users(id),
  reason             TEXT,
  backtest_evidence  JSONB,       -- e.g. {"auc_delta": +0.02, "coverage": 0.91, "n_audits": 2400}
  changed_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efh_flag_recent
  ON public.engine_feature_flag_history (flag_key, changed_at DESC);

-- ── Auto-history trigger ──────────────────────────────────────────────────────
-- Every mode change on engine_feature_flags writes a history row automatically.
-- Prevents "I forgot to log the promotion" gaps.
--
-- Split into two triggers because the history write requires the parent row
-- to exist (FK on engine_feature_flag_history.flag_key → engine_feature_flags.flag_key):
--   * BEFORE UPDATE — stamps NEW.last_changed_at (cannot be AFTER).
--   * AFTER INSERT OR UPDATE — writes the history row (the parent is now in place).

-- BEFORE UPDATE: only purpose is bumping last_changed_at when mode/canary_pct change.
CREATE OR REPLACE FUNCTION public.stamp_engine_flag_changed_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (OLD.mode IS DISTINCT FROM NEW.mode OR OLD.canary_pct IS DISTINCT FROM NEW.canary_pct) THEN
    NEW.last_changed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_engine_flag_stamp
  BEFORE UPDATE ON public.engine_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.stamp_engine_flag_changed_at();

-- AFTER INSERT OR UPDATE: writes the history row. By this point the parent
-- row IS in engine_feature_flags so the FK check in engine_feature_flag_history
-- succeeds.
CREATE OR REPLACE FUNCTION public.log_engine_flag_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.engine_feature_flag_history
      (flag_key, from_mode, to_mode, from_canary_pct, to_canary_pct, changed_by, reason)
    VALUES
      (NEW.flag_key, NULL, NEW.mode, NULL, NEW.canary_pct, NEW.last_changed_by, NEW.last_changed_reason);
  ELSIF TG_OP = 'UPDATE'
        AND (OLD.mode IS DISTINCT FROM NEW.mode OR OLD.canary_pct IS DISTINCT FROM NEW.canary_pct) THEN
    INSERT INTO public.engine_feature_flag_history
      (flag_key, from_mode, to_mode, from_canary_pct, to_canary_pct, changed_by, reason)
    VALUES
      (NEW.flag_key, OLD.mode, NEW.mode, OLD.canary_pct, NEW.canary_pct, NEW.last_changed_by, NEW.last_changed_reason);
  END IF;
  RETURN NULL;  -- AFTER triggers ignore the return value
END;
$$;

CREATE OR REPLACE TRIGGER trg_engine_flag_change
  AFTER INSERT OR UPDATE ON public.engine_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.log_engine_flag_change();

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.engine_feature_flags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_feature_flag_history ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read flag state (the audit pipeline needs to
-- evaluate flags at run time on the client). Reading the flag table reveals
-- only mode + canary_pct, which are not sensitive.
CREATE POLICY "eff_read_all_authenticated"
  ON public.engine_feature_flags FOR SELECT
  TO authenticated, anon
  USING (true);

-- Anon users (unauthenticated landing-page audits) also read flags so their
-- audit path is consistent with authenticated users.

-- Only service_role writes — flag promotions are performed via admin tooling
-- with service_role credentials. No user-facing INSERT/UPDATE/DELETE.

-- History is service_role-only readable (operations audit trail).
CREATE POLICY "efh_service_only"
  ON public.engine_feature_flag_history FOR SELECT
  USING (false);  -- effectively service_role only (bypasses RLS)

-- ── Seed the WS flags ──────────────────────────────────────────────────────────
-- Every workstream gets one or more flags. Initial mode = 'shadow' for WS that
-- already have a candidate implementation path; 'off' otherwise.
INSERT INTO public.engine_feature_flags (flag_key, mode, description, workstream, acceptance_criteria) VALUES
  ('ws0_shadow_runner',        'shadow', 'Write audit_shadow_comparison rows for every audit', 'WS0',
   ARRAY['7 consecutive days of shadow rows with zero user-visible delta',
         'Score-delta histogram available in ShadowComparisonPage']),
  ('ws1_otel_spans',           'off',    'Emit per-layer OpenTelemetry spans', 'WS1',
   ARRAY['100% of audits over 24h show 54 spans in Axiom',
         '>=95% of edge functions write to pipeline_runs',
         'Glassdoor failure emits visible error span (not silent)']),
  ('ws2_outcome_calibration',  'off',    'Load D8 + LAYER_CALIBRATION from engine_calibration_metrics', 'WS2',
   ARRAY['>=500 outcomes in user_prediction_outcomes within 30 days',
         'Backtester produces real-outcome AUC per cohort',
         'D8 + LAYER_CALIBRATION loaded from DB at startup']),
  ('ws2_implicit_outcome_ingest', 'off', 'Run implicitOutcomeDetector cron every 6h', 'WS2',
   ARRAY['Dedup confidence threshold >=0.75 enforced',
         '5% sample dual-coded manually for first 3 months']),
  ('ws3_evidence_hierarchy',   'off',    'Source-tier reconciliation (REGULATORY > SOCIAL_INDIVIDUAL)', 'WS3',
   ARRAY['SEC filing + 2h-newer Reddit -> SEC wins',
         'Acquisition target test case differentiated from acquirer']),
  ('ws3_peer_contagion_live',  'off',    'Read live breaking_news_events instead of static cache', 'WS3',
   ARRAY['Peer contagion shows live event within 5min of breaking_news insert']),
  ('ws3_stealth_layoff_detector', 'off', 'Flag LinkedIn headcount >=5% MoM drops with zero rounds', 'WS3',
   ARRAY['LinkedIn weekly snapshot pipeline operational',
         'Test case: 12k->10k over 6mo with no rounds -> stealth_reduction_risk flag']),
  ('ws4_conformal_ci',         'off',    'Replace heuristic Bayesian CI with split-conformal predictor', 'WS4',
   ARRAY['90% CI contains outcome 88-92% over rolling 60d per cohort',
         'Unknown-company confidence empirically pinned <=45%']),
  ('ws4_evidence_presence',    'off',    'Distinguish absence-quorum from positive-quorum in confidence', 'WS4',
   ARRAY['Absence-quorum contributes at 0.3x weight to quorumCoverage',
         'Unknown-company verdict downgraded to grey (not green)']),
  ('ws5_source_independent_swarm', 'off', 'sourceIndependentPanel with n_eff and AUC-weighted agents', 'WS5',
   ARRAY['n_eff >=3.5 average per audit',
         'Outcome-weighted agent weights replace consensus-derived weights',
         'CI lint: every agent declares sourceClass']),
  ('ws6_server_auth_dedup',    'off',    'Server-side scrape dedup via scrape_jobs UNIQUE constraint', 'WS6',
   ARRAY['10k concurrent same-company audits trigger exactly 1 scrape job']),
  ('ws6_request_coalescing',   'off',    'Postgres advisory-lock coalescing for concurrent same-company audits', 'WS6',
   ARRAY['100 concurrent identical audits => 1 pipeline run, 99 subscribers']),
  ('ws6_tier_a_response',      'off',    'Two-stage Tier-A immediate response + async upgrade', 'WS6',
   ARRAY['p95 first-render <=8s under 1000 RPS',
         'Tier-A confidence empirically calibrated per WS4']),
  ('ws6_realtime_fanout',      'off',    'Per-company breaking_news channel multiplexing', 'WS6',
   ARRAY['1k subscribers to one channel, <=2 connections per client',
         'Auto-downgrade to SSE at >500 subscribers']),
  ('ws7_layer_consolidation',  'off',    'Activate merged layers (L14+L33, L6+L45, L7+L24, L15+L36)', 'WS7',
   ARRAY['Layer count <=38',
         'Zero AUC regression vs WS2 baseline',
         'Archetype blending: all 9x4 combinations produce weights in [0.001, 0.5]']),
  ('ws7_server_score_trajectory', 'off', 'Read/write score_trajectory table instead of localStorage', 'WS7',
   ARRAY['Score trajectory readable on fresh device after 3 audits']),
  ('ws8_recalibration_cron',   'off',    'Weekly cron writes new coefficients to engine_calibration_metrics', 'WS8',
   ARRAY['New version produced and consumed weekly without deploy',
         'Synthetic bad-data test: AUC drop >0.05 holds in pending']);

-- ── Comments ───────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.engine_feature_flags IS
  'Server-authoritative flag registry for the v35 empirical-trustworthiness '
  'transformation. Each workstream ships behind one or more flags. Flag mode '
  'gates whether the candidate engine path is shadow-only, canary-scoped, '
  'or production-active. Promoted via service_role with mandatory '
  'backtest_evidence in engine_feature_flag_history.';

COMMENT ON COLUMN public.engine_feature_flags.canary_pct IS
  'Percentage rollout when mode=canary AND canary_user_ids is empty. Uses '
  'hash(user_id || flag_key) % 100 < canary_pct for deterministic assignment.';

COMMENT ON COLUMN public.engine_feature_flag_history.backtest_evidence IS
  'JSON capture of the empirical evidence that justified a mode change. '
  'Typically includes: {auc_delta, coverage_per_cohort, n_audits, p95_score_delta}. '
  'Required for promotion to canary/production; advisory for off->shadow.';
