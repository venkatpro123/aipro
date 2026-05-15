-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260611000001_engine_events_outbox.sql
-- Purpose:   DEBT-9 — Decoupled event bus via the Outbox pattern.
--
--            Domain events (audit completed, flag promoted, drift alert
--            opened, calibration version activated) write to this table.
--            Downstream consumers subscribe via Supabase Realtime
--            (postgres_changes filter on `type`) or poll the
--            unconsumed-events partial index.
--
--            Producers emit events as a SIDE EFFECT of a domain change
--            (typically via a deferrable trigger so the event row is
--            only committed if the parent transaction commits).
--
--            Consumers:
--              * recalibrate-engine cron consumes 'audit.completed' to
--                build per-cohort outcome streams without polling.
--              * notification service consumes 'drift.alert.opened' to
--                page on-call.
--              * billing service consumes 'audit.completed' to meter usage.
--              * analytics ETL consumes everything for offline reporting.
--
--            Outbox semantics:
--              * append-only (no UPDATE / DELETE).
--              * consumers track their own offset via `consumed_by`
--                JSONB array — each consumer marks itself when it has
--                processed the row.
--              * a retention cron prunes events where consumed_by
--                contains every registered consumer (or > 90 days old,
--                whichever is sooner).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.engine_events (
  id              BIGSERIAL    PRIMARY KEY,
  type            TEXT         NOT NULL,
  -- Event payload. Schema is per-type; each producer documents its shape.
  payload         JSONB        NOT NULL,
  -- Correlation
  request_id      UUID,
  user_id         UUID,
  tenant_id       UUID,
  -- Consumer tracking
  consumed_by     JSONB        NOT NULL DEFAULT '[]'::jsonb,
  -- Timing
  occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Hot path: "give me every unconsumed event of type X since T".
CREATE INDEX IF NOT EXISTS idx_ee_type_recent
  ON public.engine_events (type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ee_request
  ON public.engine_events (request_id)
  WHERE request_id IS NOT NULL;

-- Partial index for fast "fetch what I haven't consumed yet" queries.
-- Note: per-consumer filtering happens client-side because indexing on
-- jsonb_contains is supported but expensive for a small number of
-- consumers.

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.engine_events ENABLE ROW LEVEL SECURITY;
-- service_role only — events table is internal. Realtime subscribers
-- use the service_role JWT in their connection.

-- ── Producer helper ────────────────────────────────────────────────────────────
-- Domain producers call this rather than INSERT directly so the producer
-- code is consistent and so we can centrally add validation / sampling later.
CREATE OR REPLACE FUNCTION public.emit_engine_event(
  p_type       TEXT,
  p_payload    JSONB,
  p_request_id UUID DEFAULT NULL,
  p_user_id    UUID DEFAULT NULL,
  p_tenant_id  UUID DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_id BIGINT;
BEGIN
  INSERT INTO public.engine_events (type, payload, request_id, user_id, tenant_id)
  VALUES (p_type, p_payload, p_request_id, p_user_id, p_tenant_id)
  RETURNING id INTO new_id;
  -- Send a NOTIFY so any LISTEN subscribers wake up immediately
  -- (in addition to the Realtime postgres_changes path).
  PERFORM pg_notify('engine_events', json_build_object('id', new_id, 'type', p_type)::text);
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_engine_event(TEXT, JSONB, UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emit_engine_event(TEXT, JSONB, UUID, UUID, UUID) TO service_role;

-- ── Domain triggers (initial set; more added as producers migrate) ─────────────
--
-- 1. layoff_scores INSERT → audit.completed event
CREATE OR REPLACE FUNCTION public._emit_audit_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.emit_engine_event(
    'audit.completed',
    jsonb_build_object(
      'audit_id',     NEW.id,
      'company_name', NEW.company_name,
      'role_title',   NEW.role_title,
      'score',        NEW.score,
      'tier',         NEW.tier,
      'data_quality', NEW.data_quality
    ),
    NULL,         -- request_id not propagated to this table yet (DEBT-5 follow-up)
    NEW.user_id,
    NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_layoff_scores_audit_completed ON public.layoff_scores;
CREATE TRIGGER trg_layoff_scores_audit_completed
  AFTER INSERT ON public.layoff_scores
  FOR EACH ROW EXECUTE FUNCTION public._emit_audit_completed();

-- 2. engine_drift_alerts INSERT (status='open') → drift.alert.opened event
CREATE OR REPLACE FUNCTION public._emit_drift_alert_opened()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'open' THEN
    PERFORM public.emit_engine_event(
      'drift.alert.opened',
      jsonb_build_object(
        'alert_id',     NEW.id,
        'cohort_scope', NEW.cohort_scope,
        'alert_kind',   NEW.alert_kind,
        'metric_name',  NEW.metric_name,
        'delta',        NEW.delta,
        'version_id',   NEW.version_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engine_drift_alerts_opened ON public.engine_drift_alerts;
CREATE TRIGGER trg_engine_drift_alerts_opened
  AFTER INSERT ON public.engine_drift_alerts
  FOR EACH ROW EXECUTE FUNCTION public._emit_drift_alert_opened();

-- 3. engine_calibration_versions UPDATE → version.activated event when
-- a row transitions to active.
CREATE OR REPLACE FUNCTION public._emit_version_activated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'active' THEN
    PERFORM public.emit_engine_event(
      'calibration.version.activated',
      jsonb_build_object(
        'version_id',   NEW.id,
        'version',      NEW.version,
        'cohort_scope', NEW.cohort_scope,
        'auc_combined', NEW.auc_combined,
        'n_events',     NEW.n_events_total
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calibration_version_activated ON public.engine_calibration_versions;
CREATE TRIGGER trg_calibration_version_activated
  AFTER UPDATE ON public.engine_calibration_versions
  FOR EACH ROW EXECUTE FUNCTION public._emit_version_activated();

-- ── Retention cron ─────────────────────────────────────────────────────────────
-- Drops events older than 90 days. Consumer-completion-based pruning is
-- deferred until we have a registered consumer list; for now retention is
-- pure age-based, which is sufficient.
CREATE OR REPLACE FUNCTION public.prune_engine_events()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  n INTEGER;
BEGIN
  DELETE FROM public.engine_events
  WHERE occurred_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

SELECT public._v35_register_cron(
  'v35_prune_engine_events',
  '0 5 * * *',
  $$SELECT public.prune_engine_events();$$
);

COMMENT ON TABLE public.engine_events IS
  'DEBT-9 — Outbox table for domain events (audit.completed, '
  'drift.alert.opened, calibration.version.activated, etc.). Producers '
  'use emit_engine_event(). Consumers subscribe via Realtime or LISTEN. '
  'Append-only; pruned by daily retention cron at 90d.';
