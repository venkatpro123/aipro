-- 20260430000001_bracket_alert_response_protocol.sql
--
-- Fix 9 (v7.0): bracket_algorithm_alerts → automated GitHub Issue creation.
--
-- Problem: bracket_algorithm_alerts view fires when override_rate_pct > 20%
-- with sample_size > 30. Without a response protocol, monitoring has no value.
--
-- Solution: add a pg_cron scheduled job (or Supabase cron edge function hook)
-- that calls a GitHub-issue-creation Edge Function whenever a new alert row
-- appears. A developer must review within 7 days and either adjust the bracket
-- threshold or close with explanation.
--
-- Architecture:
--   1. bracket_alert_log table — persists alerts that have been dispatched so
--      we don't re-fire for the same (work_type_key, original_bracket) pair.
--   2. create_bracket_alert_issue() function — checks bracket_algorithm_alerts
--      view for rows not yet in the log, inserts them, and calls the
--      `gh-issue-creator` Edge Function via net.http_post.
--   3. A pg_cron job fires create_bracket_alert_issue() every 6 hours.
--
-- GitHub issue format (created by Edge Function `gh-issue-creator`):
--   Title: "Seniority bracket calibration needed: [work_type_key] [original_bracket]
--           shows [override_rate_pct]% override rate (n=[sample_size])"
--   Body: override breakdown, most_common_override_target, current bracket condition,
--         link to Supabase bracket_algorithm_alerts view query.
--   Labels: ["bracket-calibration", "auto-generated"]
--   Assignees: configured via BRACKET_ALERT_ASSIGNEE env var in Edge Function.
--
-- The 7-day SLA is enforced by the issue label "bracket-calibration" — a separate
-- GitHub Action can close/escalate stale issues after 7 days.

-- ── 1. Persistent alert log ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS internal.bracket_alert_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_type_key   text NOT NULL,
  original_bracket text NOT NULL,
  override_rate_pct numeric(5,2) NOT NULL,
  sample_size     integer NOT NULL,
  most_common_override text,
  github_issue_number integer,      -- populated once the issue is created
  dispatched_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolution_note text,
  UNIQUE (work_type_key, original_bracket, dispatched_at)
);

COMMENT ON TABLE internal.bracket_alert_log IS
  'Persistent log of bracket_algorithm_alerts dispatched to GitHub. '
  'One row per (work_type_key, original_bracket) per calendar day. '
  'Prevents duplicate issue creation for the same alert within 24 hours.';

-- Log is append-only from the application layer.
REVOKE DELETE ON internal.bracket_alert_log FROM authenticated, anon;
REVOKE UPDATE ON internal.bracket_alert_log FROM authenticated, anon;
-- service_role can insert new alerts and update github_issue_number/resolved_at.

-- ── 2. Alert dispatch function ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION internal.create_bracket_alert_issues()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert RECORD;
  v_payload jsonb;
  v_edge_url text;
BEGIN
  -- Edge Function URL — populated from vault.secrets or env at deploy time.
  -- Local dev: skip dispatch when URL is not configured.
  v_edge_url := current_setting('app.bracket_alert_edge_url', true);
  IF v_edge_url IS NULL OR v_edge_url = '' THEN
    RAISE NOTICE '[BracketAlerts] app.bracket_alert_edge_url not set — skipping dispatch';
    RETURN;
  END IF;

  -- Check bracket_algorithm_alerts view for rows not yet dispatched today.
  FOR v_alert IN
    SELECT a.*
    FROM   internal.bracket_algorithm_alerts a
    WHERE  NOT EXISTS (
      SELECT 1 FROM internal.bracket_alert_log l
      WHERE  l.work_type_key   = a.work_type_key
      AND    l.original_bracket = a.original_bracket
      AND    l.dispatched_at::date = current_date
    )
  LOOP
    -- Insert the log entry first (prevents duplicate dispatch on re-run).
    INSERT INTO internal.bracket_alert_log
      (work_type_key, original_bracket, override_rate_pct, sample_size, most_common_override)
    VALUES
      (v_alert.work_type_key, v_alert.original_bracket,
       v_alert.override_rate_pct, v_alert.sample_size,
       v_alert.most_common_override_target)
    ON CONFLICT (work_type_key, original_bracket, dispatched_at) DO NOTHING;

    -- Build payload for the gh-issue-creator Edge Function.
    v_payload := jsonb_build_object(
      'title',
        format(
          'Seniority bracket calibration needed: %s %s shows %s%% override rate (n=%s)',
          v_alert.work_type_key,
          v_alert.original_bracket,
          v_alert.override_rate_pct::text,
          v_alert.sample_size::text
        ),
      'body',
        format(
          E'## Bracket Algorithm Alert\n\n'
          '**Work type:** `%s`\n'
          '**Original bracket:** `%s`\n'
          '**Override rate:** %s%% (threshold: 20%%)\n'
          '**Sample size:** %s\n'
          '**Most common override target:** `%s`\n\n'
          '## Required action\n\n'
          'Review `deriveSeniorityBracket()` in `LayoffInputForm.tsx` for the '
          '`%s` + `%s` condition. Either:\n'
          '1. Adjust the bracket derivation threshold, OR\n'
          '2. Close this issue with an explanation of why the override rate is expected.\n\n'
          '**SLA: 7 days from issue creation.**\n\n'
          '---\n'
          '_Auto-generated by `internal.create_bracket_alert_issues()` on %s._',
          v_alert.work_type_key,
          v_alert.original_bracket,
          v_alert.override_rate_pct::text,
          v_alert.sample_size::text,
          COALESCE(v_alert.most_common_override_target, 'unknown'),
          v_alert.work_type_key,
          v_alert.original_bracket,
          current_timestamp::text
        ),
      'labels',     jsonb_build_array('bracket-calibration', 'auto-generated'),
      'work_type_key',   v_alert.work_type_key,
      'original_bracket', v_alert.original_bracket
    );

    -- Call the Edge Function asynchronously via pg_net (non-blocking).
    PERFORM net.http_post(
      url     := v_edge_url,
      body    := v_payload,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
      )
    );

    RAISE NOTICE '[BracketAlerts] Dispatched alert for %/%',
      v_alert.work_type_key, v_alert.original_bracket;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION internal.create_bracket_alert_issues IS
  'Checks bracket_algorithm_alerts for new rows exceeding the 20%/n>30 threshold '
  'and dispatches a GitHub issue via the gh-issue-creator Edge Function. '
  'Idempotent — will not re-dispatch the same (work_type_key, original_bracket) '
  'more than once per calendar day.';

REVOKE EXECUTE ON FUNCTION internal.create_bracket_alert_issues FROM PUBLIC, anon, authenticated;

-- ── 3. Schedule via pg_cron (every 6 hours) ──────────────────────────────────

-- pg_cron is enabled on Supabase Pro+. On free tier, call this function from
-- a GitHub Actions cron workflow instead:
--   cron: "0 */6 * * *"
--   run: supabase functions invoke create-bracket-alerts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'bracket-alert-check',       -- job name
      '0 */6 * * *',               -- every 6 hours
      'CALL internal.create_bracket_alert_issues()'
    );
    RAISE NOTICE '[BracketAlerts] pg_cron job scheduled (every 6h)';
  ELSE
    RAISE NOTICE '[BracketAlerts] pg_cron not available — schedule via GitHub Actions cron instead';
  END IF;
END $$;

-- ── Verification ─────────────────────────────────────────────────────────────
-- SELECT * FROM internal.bracket_alert_log ORDER BY dispatched_at DESC LIMIT 10;
-- SELECT internal.create_bracket_alert_issues();  -- manual test run
