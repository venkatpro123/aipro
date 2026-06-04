-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260613000002_synthetic_probe_cron.sql
-- Purpose:   Register the 5-minute synthetic-probe cron.
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT public._v35_register_cron(
  'v35_synthetic_probe',
  '*/5 * * * *',
  $cmd$SELECT net.http_post(url:=current_setting('app.supabase_functions_url',true)||'/synthetic-probe',headers:=jsonb_build_object('Authorization','Bearer '||current_setting('app.supabase_service_role_key',true),'Content-Type','application/json'),body:='{}'::jsonb);$cmd$
);
