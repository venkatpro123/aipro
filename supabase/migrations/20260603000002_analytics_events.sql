-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260603000002_analytics_events.sql
-- Purpose:   WS1 — Backend consumer table for analyticsService.ts events.
--
--            analyticsService.ts currently buffers events client-side and
--            POSTs them to `/api/v1/analytics/track` — an endpoint that does
--            not exist. Events are dropped on the floor. This migration
--            creates the destination table; the matching ingest edge function
--            (supabase/functions/ingest-analytics) writes here.
--
--            Schema is intentionally permissive (JSONB properties) so the
--            client analytics surface can evolve without coupling to a fixed
--            column set. The trade-off is that aggregation queries pay a
--            JSONB scan cost; we accept this for early observability.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            BIGSERIAL,

  -- Event identity
  event_name    TEXT         NOT NULL,        -- e.g. 'audit.submitted', 'tier.viewed'
  kind          TEXT         NOT NULL         -- 'track' | 'page' | 'identify'
    CHECK (kind IN ('track', 'page', 'identify')),
  user_id       UUID,        -- NULL for anonymous events
  anon_id       TEXT,        -- client-generated anon identifier for joining

  -- Event payload — analyticsService.ts emits arbitrary properties.
  properties    JSONB        NOT NULL DEFAULT '{}'::jsonb,

  -- Source metadata captured server-side
  user_agent    TEXT,
  ip_country    TEXT,        -- derived from request IP (optional)
  audit_session_id UUID,     -- when the event is part of an audit

  -- Timing
  client_ts     TIMESTAMPTZ, -- client-emitted timestamp (may drift)
  received_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (id, received_at)
) PARTITION BY RANGE (received_at);

-- Rolling 3-month partitions. Future months auto-created by the maintenance cron.
CREATE TABLE IF NOT EXISTS public.analytics_events_2026_06
  PARTITION OF public.analytics_events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS public.analytics_events_2026_07
  PARTITION OF public.analytics_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS public.analytics_events_2026_08
  PARTITION OF public.analytics_events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ae_event_recent
  ON public.analytics_events (event_name, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_ae_user_recent
  ON public.analytics_events (user_id, received_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ae_audit_session
  ON public.analytics_events (audit_session_id)
  WHERE audit_session_id IS NOT NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- service_role only — analytics is internal. No user-facing read path.
-- (Default deny; service_role bypasses RLS.)

COMMENT ON TABLE public.analytics_events IS
  'WS1 — Server-side analytics event ledger. Receives events from the '
  'ingest-analytics edge function. Partitioned monthly on received_at. '
  'JSONB properties for flexible client surface evolution. service_role only.';
