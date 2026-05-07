-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000003_pg_cron_schedules.sql
-- Purpose:   Register pg_cron weekly jobs (skips silently if extension absent).
--
-- To activate schedules after enabling pg_cron + pg_net extensions:
--   1. Dashboard → Database → Extensions → enable pg_cron and pg_net
--   2. Run in SQL editor:
--        ALTER DATABASE postgres SET app.supabase_url = 'https://ysenimczeasmaeojzlkt.supabase.co';
--        ALTER DATABASE postgres SET app.service_role_key = '<service role key>';
--   3. Re-push this migration or run SELECT cron.schedule(...) manually.
-- ═══════════════════════════════════════════════════════════════════════════

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    PERFORM cron.schedule(
      'refresh-market-intelligence-weekly',
      '0 6 * * 1',
      'SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/refresh-market-intelligence'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.service_role_key''), ''Content-Type'', ''application/json''), body := ''{}''::jsonb)'
    );

    PERFORM cron.schedule(
      'refresh-peer-benchmarks-weekly',
      '0 7 * * 1',
      'SELECT refresh_peer_benchmarks()'
    );

    -- ── Breaking news scan — every 2 hours ─────────────────────────────────
    -- Scans RSS/HN for layoff announcements for watched companies.
    -- When a new event is detected, invalidates analysis cache so the next
    -- user audit sees fresh data incorporating the breaking event.
    -- Maximum detection latency: 2 hours from announcement to cache invalidation.
    PERFORM cron.schedule(
      'breaking-news-scan-2h',
      '0 */2 * * *',
      'SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/breaking-news-scan'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.service_role_key''), ''Content-Type'', ''application/json''), body := ''{}''::jsonb)'
    );

    -- ── Expire old breaking news events and analysis cache ─────────────────
    PERFORM cron.schedule(
      'expire-breaking-news-daily',
      '0 3 * * *',
      'SELECT expire_breaking_news_events(); SELECT expire_analysis_cache();'
    );

    RAISE NOTICE 'pg_cron schedules registered.';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — skipping. Enable in Dashboard → Database → Extensions, then re-run.';
  END IF;
END
$do$;
