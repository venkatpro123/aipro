-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260606000002_engine_drift_alerts.sql
-- Purpose:   WS8 — Engine drift alert ledger.
--
--            The recalibrate-engine cron writes a new row to
--            engine_calibration_versions weekly. Before promoting a
--            candidate version to status='active' the cron checks for
--            drift: if rolling-60-day AUC drops >0.05 below the prior
--            published version (or if coverage for any cohort diverges
--            from nominal by >10 percentage points), the new version is
--            held in status='pending' and an alert row is written here.
--
--            Ops review this table and either:
--              * approve the pending version (changes status to 'active'
--                via the CalibrationPanel UI)
--              * reject (changes status to 'rejected', annotates the
--                alert row with a reason)
--
--            This is the human-in-the-loop gate that prevents a bad-data
--            week from silently shipping degraded model weights.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.engine_drift_alerts (
  id                      BIGSERIAL    PRIMARY KEY,

  -- Subject of the alert
  version_id              BIGINT       REFERENCES public.engine_calibration_versions(id) ON DELETE CASCADE,
  cohort_scope            TEXT         NOT NULL,

  -- Drift specifics
  alert_kind              TEXT         NOT NULL
    CHECK (alert_kind IN (
      'auc_regression',           -- AUC dropped >0.05 vs prior
      'coverage_divergence',      -- empirical coverage diverged from nominal >10pp
      'sample_size_collapse',     -- n_events dropped >50% vs prior version
      'cohort_distribution_shift' -- outcome class balance shifted materially
    )),
  prior_version_id        BIGINT       REFERENCES public.engine_calibration_versions(id),
  metric_name             TEXT         NOT NULL,       -- e.g. 'auc_combined', 'coverage_at_90'
  prior_value             NUMERIC(8,4),
  candidate_value         NUMERIC(8,4),
  delta                   NUMERIC(8,4) GENERATED ALWAYS AS (candidate_value - prior_value) STORED,
  threshold_violated      NUMERIC(8,4),                -- the threshold that was crossed

  -- Diagnostic payload
  detail                  JSONB,

  -- Lifecycle
  status                  TEXT         NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved_approved', 'resolved_rejected', 'auto_resolved')),
  acknowledged_at         TIMESTAMPTZ,
  acknowledged_by         UUID         REFERENCES auth.users(id),
  resolution_note         TEXT,
  resolved_at             TIMESTAMPTZ,

  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eda_status_recent
  ON public.engine_drift_alerts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eda_version
  ON public.engine_drift_alerts (version_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.engine_drift_alerts ENABLE ROW LEVEL SECURITY;
-- service_role only (ops table). No user-facing policy.

COMMENT ON TABLE public.engine_drift_alerts IS
  'WS8 — Engine recalibration drift alerts. Each row captures one threshold '
  'breach detected during the weekly recalibrate-engine cron. Ops review via '
  'CalibrationPanel admin UI to approve / reject pending versions. The '
  'human-in-the-loop gate that prevents bad-data weeks from shipping.';
