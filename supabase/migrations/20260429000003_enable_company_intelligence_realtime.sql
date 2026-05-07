-- Migration: Enable Supabase Realtime on company_intelligence
--
-- WHY
-- ───
-- Browser clients subscribe to postgres_changes on this table so they can
-- receive a push notification when the weekly pipeline writes updated signals
-- (new layoff event, stock movement, hiring freeze). The toast fires in
-- useCompanySignalSubscription.ts and offers an in-place "Recalculate" action.
--
-- REQUIREMENTS
-- ────────────
-- 1. REPLICA IDENTITY FULL — required for row-level filter subscriptions.
--    Without it, Supabase Realtime cannot match the filter `company_name=eq.X`
--    on UPDATE events because the old row values are not available.
-- 2. supabase_realtime publication — the table must be added to the publication
--    before the Realtime server will stream changes.
--
-- SAFETY
-- ──────
-- Idempotent: DO block checks pg_publication_tables before ALTER PUBLICATION.
-- REPLICA IDENTITY FULL is safe for a table of this size (~500 companies).
-- No RLS changes needed — existing public SELECT policy already covers Realtime.

ALTER TABLE public.company_intelligence REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname   = 'supabase_realtime'
    AND    tablename = 'company_intelligence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_intelligence;
  END IF;
END;
$$;

COMMENT ON TABLE public.company_intelligence IS
  'Per-company grounding data for layoff risk assessment. '
  'REPLICA IDENTITY FULL set so Supabase Realtime can deliver row-level UPDATE '
  'events to browser clients watching a specific company_name.';
