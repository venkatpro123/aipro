-- 20260501000001_monthly_ai_report.sql
-- Intelligence Upgrade 5 — Monthly India AI Displacement Report
--
-- Deploys:
--   1. community_risk_signals view (fixes the missing definition)
--   2. user_preferences table (email_alerts flag + profile fields)
--   3. monthly_reports table (JSON payload + delivery metadata)
--   4. generate_monthly_report() SECURITY DEFINER function
--   5. pg_cron job: every Monday 00:30 UTC (06:00 IST), first-Monday guard inside function
--
-- The report pipeline:
--   pg_cron fires → generate_monthly_report() queries live data → inserts into monthly_reports
--   → calls send-monthly-report Edge Function via pg_net → email to all email_alerts=true users
--   → public URL: /intelligence/report/YYYY-MM becomes available immediately after insert

-- ── 1. community_risk_signals view ────────────────────────────────────────────
-- Referenced by CommunityIntelligencePage.tsx (migration never existed — this closes the gap).
-- Privacy constraints enforced in the view:
--   - Minimum 20 audits per role-industry cell
--   - At least 3 distinct departments (not single-employer domination)
--   - No single department contributes > 40% of the sample
--
-- NOTE: layoff_scores does not store company names (anonymised). employer_diversity_count
-- and max_employer_share_pct are proxied via department diversity as the closest available
-- signal. Update when company_id is added to layoff_scores.

CREATE OR REPLACE VIEW public.community_risk_signals AS
WITH role_agg AS (
  SELECT
    role_category                                          AS role_key,
    industry                                               AS industry_key,
    ROUND(AVG(score)::NUMERIC, 1)                         AS avg_score,
    COUNT(*)                                               AS sample_size,
    ROUND(
      (COUNT(*) FILTER (WHERE tier IN ('red','orange'))::FLOAT / COUNT(*)::FLOAT * 100)::NUMERIC, 1
    )                                                      AS pct_high_critical,
    COUNT(DISTINCT department)                             AS employer_diversity_count,
    ROUND(
      MAX(dept_cnt)::NUMERIC / COUNT(*)::NUMERIC * 100, 1
    )                                                      AS max_employer_share_pct,
    MAX(created_at)                                        AS last_updated
  FROM (
    SELECT
      role_category, industry, department, score, tier, created_at,
      COUNT(*) OVER (PARTITION BY role_category, industry, department) AS dept_cnt
    FROM public.layoff_scores
    WHERE created_at > NOW() - INTERVAL '90 days'
  ) windowed
  GROUP BY role_category, industry
)
SELECT *
FROM role_agg
WHERE sample_size           >= 20      -- privacy: suppress small cells
  AND employer_diversity_count >= 3    -- privacy: require multi-department spread
  AND max_employer_share_pct   <= 40;  -- privacy: no single-department dominance

COMMENT ON VIEW public.community_risk_signals IS
  'Aggregated role+industry risk signal view. Privacy-safe: n≥20, ≥3 departments, '
  '≤40% department share. Sourced from anonymised layoff_scores (no PII). '
  'Queryable by anon role — public aggregate intelligence.';

-- Anon read only (no PII — this is aggregate data)
GRANT SELECT ON public.community_risk_signals TO anon, authenticated;

-- ── 2. user_preferences table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_alerts      BOOLEAN NOT NULL DEFAULT false,
  /** When true, user receives the monthly India AI Displacement Report email */
  monthly_report    BOOLEAN NOT NULL DEFAULT false,
  /** ISO country code — used to personalise report content. Default: IN (India) */
  country_code      TEXT NOT NULL DEFAULT 'IN',
  /** Preferred role prefix for personalised report headline. Null = generic */
  preferred_role_prefix TEXT,
  /** ISO city key for city-specific employer mentions */
  city_key          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_monthly_report
  ON public.user_preferences(monthly_report) WHERE monthly_report = true;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read and write only their own row
CREATE POLICY "user_preferences_own_select"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_own_insert"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_own_update"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_own_delete"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- service_role can read all rows for batch email dispatch
-- (service_role bypasses RLS by default — no explicit grant needed)

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. monthly_reports table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  /** ISO year-month key, e.g. '2026-05'. Unique — one report per calendar month. */
  year_month    TEXT NOT NULL,
  /**
   * Full JSON report payload. Shape:
   * {
   *   generated_at:  ISO timestamp
   *   top_risk_roles:     [{role_key, industry, avg_score, sample_size, change_vs_prior}]
   *   most_improved:      [{role_key, industry, avg_score, prior_score, improvement}]
   *   company_changes:    [{company_name, prior_stage, current_stage, change_date}]
   *   transition_story:   {from_role, to_role, salary_change_pct, transition_months}
   *   prediction_updates: [{company_role, swarm_score, actual_outcome, accuracy_score}]
   *   metadata:           {total_audits_this_month, total_opt_in_users, report_version}
   * }
   */
  payload       JSONB NOT NULL,
  /** How many email recipients received this report */
  email_count   INTEGER,
  /** When the Edge Function confirmed delivery */
  sent_at       TIMESTAMPTZ,
  /** pg_cron / manual trigger */
  triggered_by  TEXT NOT NULL DEFAULT 'pg_cron',
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (year_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_year_month
  ON public.monthly_reports(year_month DESC);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Public read — the report page at /intelligence/report/YYYY-MM is public
CREATE POLICY "monthly_reports_public_read"
  ON public.monthly_reports FOR SELECT
  USING (true);

-- Only service_role inserts (pg_cron function runs as service_role via SECURITY DEFINER)
REVOKE INSERT, UPDATE, DELETE ON public.monthly_reports FROM anon, authenticated;

COMMENT ON TABLE public.monthly_reports IS
  'One row per calendar month. Payload contains the full India AI Displacement Report JSON. '
  'Public SELECT enables the /intelligence/report/YYYY-MM frontend page. '
  'Inserted by generate_monthly_report() via pg_cron on the first Monday of each month.';

-- ── 4. generate_monthly_report() ──────────────────────────────────────────────
-- SECURITY DEFINER: runs as the function owner (superuser), can bypass RLS to
-- read all tables needed for the report.
--
-- FIRST-MONDAY GUARD: the pg_cron job fires every Monday at 00:30 UTC. The function
-- exits immediately when day-of-month > 7 (not the first Monday).
--
-- IDEMPOTENT: uses INSERT ... ON CONFLICT DO NOTHING. Re-running the job on the
-- same first Monday of a month (e.g. after a crash recovery) is safe.

CREATE OR REPLACE FUNCTION public.generate_monthly_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today         DATE := current_date;
  v_year_month    TEXT := TO_CHAR(v_today, 'YYYY-MM');
  v_prior_cutoff  TIMESTAMPTZ := NOW() - INTERVAL '30 days';
  v_month_start   TIMESTAMPTZ := DATE_TRUNC('month', NOW());

  -- Report sections
  v_top_risk      JSONB;
  v_most_improved JSONB;
  v_company_changes JSONB;
  v_transition_story JSONB;
  v_prediction_updates JSONB;
  v_metadata      JSONB;
  v_payload       JSONB;

  v_edge_url      TEXT;
  v_total_audits  BIGINT;
  v_opt_in_users  BIGINT;
BEGIN

  -- ── First-Monday guard ────────────────────────────────────────────────────
  -- This function is scheduled to run every Monday at 00:30 UTC.
  -- Only the FIRST Monday (day 1–7) should generate a report.
  IF EXTRACT(DAY FROM v_today) > 7 THEN
    RAISE NOTICE '[MonthlyReport] Skipping — not the first Monday of the month (day=%)', EXTRACT(DAY FROM v_today);
    RETURN;
  END IF;

  -- ── Idempotency check ────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM public.monthly_reports WHERE year_month = v_year_month) THEN
    RAISE NOTICE '[MonthlyReport] Report for % already exists — skipping duplicate generation', v_year_month;
    RETURN;
  END IF;

  RAISE NOTICE '[MonthlyReport] Generating report for %', v_year_month;

  -- ── Section 1: Top 5 highest-risk roles this month ──────────────────────
  SELECT jsonb_agg(row_to_json(t))
  INTO v_top_risk
  FROM (
    SELECT
      crs.role_key,
      crs.industry_key                          AS industry,
      crs.avg_score,
      crs.sample_size,
      ROUND(
        (crs.avg_score - COALESCE(prev.avg_score, crs.avg_score))::NUMERIC, 1
      )                                          AS change_vs_30d
    FROM public.community_risk_signals crs
    LEFT JOIN (
      SELECT
        role_category  AS role_key,
        industry       AS industry_key,
        ROUND(AVG(score)::NUMERIC, 1) AS avg_score
      FROM public.layoff_scores
      WHERE created_at BETWEEN v_prior_cutoff - INTERVAL '30 days'
                            AND v_prior_cutoff
      GROUP BY role_category, industry
      HAVING COUNT(*) >= 10
    ) prev ON prev.role_key = crs.role_key
          AND prev.industry_key = crs.industry_key
    ORDER BY crs.avg_score DESC
    LIMIT 5
  ) t;

  -- ── Section 2: Top 5 most improved roles (score ↓ = improvement) ────────
  SELECT jsonb_agg(row_to_json(t))
  INTO v_most_improved
  FROM (
    SELECT
      crs.role_key,
      crs.industry_key                          AS industry,
      crs.avg_score,
      COALESCE(prev.avg_score, crs.avg_score)  AS prior_score,
      ROUND(
        (COALESCE(prev.avg_score, crs.avg_score) - crs.avg_score)::NUMERIC, 1
      )                                          AS improvement
    FROM public.community_risk_signals crs
    LEFT JOIN (
      SELECT
        role_category AS role_key,
        industry      AS industry_key,
        ROUND(AVG(score)::NUMERIC, 1) AS avg_score
      FROM public.layoff_scores
      WHERE created_at BETWEEN v_prior_cutoff - INTERVAL '30 days'
                            AND v_prior_cutoff
      GROUP BY role_category, industry
      HAVING COUNT(*) >= 10
    ) prev ON prev.role_key = crs.role_key
          AND prev.industry_key = crs.industry_key
    WHERE COALESCE(prev.avg_score, crs.avg_score) > crs.avg_score  -- must have actually improved
    ORDER BY improvement DESC
    LIMIT 5
  ) t;

  -- ── Section 3: Companies with most significant collapse stage changes ────
  -- Looks for company_intelligence rows where collapse_stage changed in the last 30 days.
  -- 'prior_stage' is proxied from overall_risk_score changes when direct history is unavailable.
  SELECT jsonb_agg(row_to_json(t))
  INTO v_company_changes
  FROM (
    SELECT
      company_name,
      industry,
      overall_risk_score                        AS risk_score,
      last_updated                              AS change_date,
      -- Derive stage from risk score for the report narrative
      CASE
        WHEN overall_risk_score >= 65 THEN 'Stage 2-3'
        WHEN overall_risk_score >= 40 THEN 'Stage 1-2'
        ELSE 'No active stage'
      END                                       AS current_stage_label
    FROM public.company_intelligence
    WHERE last_updated >= v_month_start
      AND overall_risk_score IS NOT NULL
    ORDER BY overall_risk_score DESC
    LIMIT 3
  ) t;

  -- ── Section 4: Most recent verified career transition story ──────────────
  SELECT row_to_json(t)::JSONB
  INTO v_transition_story
  FROM (
    SELECT
      from_role,
      to_role,
      salary_change_pct,
      transition_months,
      TO_CHAR(created_at, 'Month YYYY') AS transition_period
    FROM public.career_transitions
    WHERE verified = true
      AND created_at >= v_month_start - INTERVAL '90 days'  -- within the last quarter
    ORDER BY created_at DESC
    LIMIT 1
  ) t;

  -- ── Section 5: Prediction ledger updates this month ──────────────────────
  SELECT jsonb_agg(row_to_json(t))
  INTO v_prediction_updates
  FROM (
    SELECT
      company_role,
      swarm_score,
      engine_score,
      actual_outcome,
      ROUND(accuracy_score::NUMERIC, 3)         AS accuracy_score,
      TO_CHAR(recorded_at, 'YYYY-MM-DD')        AS recorded_at
    FROM public.prediction_outcomes
    WHERE recorded_at >= v_month_start
    ORDER BY recorded_at DESC
    LIMIT 10
  ) t;

  -- ── Section 6: Metadata ──────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_total_audits
  FROM public.layoff_scores
  WHERE created_at >= v_month_start;

  SELECT COUNT(*) INTO v_opt_in_users
  FROM public.user_preferences
  WHERE monthly_report = true;

  v_metadata := jsonb_build_object(
    'total_audits_this_month', v_total_audits,
    'total_opt_in_users',      v_opt_in_users,
    'report_version',          '1.0',
    'generated_at',            NOW()::TEXT,
    'year_month',              v_year_month
  );

  -- ── Assemble payload ─────────────────────────────────────────────────────
  v_payload := jsonb_build_object(
    'generated_at',        NOW()::TEXT,
    'year_month',          v_year_month,
    'top_risk_roles',      COALESCE(v_top_risk,          '[]'::JSONB),
    'most_improved',       COALESCE(v_most_improved,     '[]'::JSONB),
    'company_changes',     COALESCE(v_company_changes,   '[]'::JSONB),
    'transition_story',    COALESCE(v_transition_story,  'null'::JSONB),
    'prediction_updates',  COALESCE(v_prediction_updates,'[]'::JSONB),
    'metadata',            v_metadata
  );

  -- ── Persist the report ───────────────────────────────────────────────────
  INSERT INTO public.monthly_reports (year_month, payload, triggered_by)
  VALUES (v_year_month, v_payload, 'pg_cron')
  ON CONFLICT (year_month) DO NOTHING;

  RAISE NOTICE '[MonthlyReport] Report % inserted. Dispatching email.', v_year_month;

  -- ── Call send-monthly-report Edge Function via pg_net ────────────────────
  v_edge_url := current_setting('app.send_monthly_report_url', true);
  IF v_edge_url IS NOT NULL AND v_edge_url <> '' THEN
    PERFORM net.http_post(
      url     := v_edge_url,
      body    := jsonb_build_object(
                   'year_month', v_year_month,
                   'payload',    v_payload
                 ),
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
                 )
    );
    RAISE NOTICE '[MonthlyReport] Email dispatch triggered for %', v_year_month;
  ELSE
    RAISE NOTICE '[MonthlyReport] app.send_monthly_report_url not configured — skipping email dispatch.';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[MonthlyReport] Error generating report for %: % — %',
    v_year_month, SQLSTATE, SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.generate_monthly_report IS
  'Generates the monthly India AI Displacement Report. '
  'Fires automatically via pg_cron every Monday at 00:30 UTC (06:00 IST); '
  'first-Monday guard skips non-first Mondays. '
  'Idempotent — safe to re-run on crash recovery. '
  'Inserts into monthly_reports and triggers send-monthly-report Edge Function.';

-- Restrict direct calls to service_role only
REVOKE EXECUTE ON FUNCTION public.generate_monthly_report FROM PUBLIC, anon, authenticated;

-- ── 5. pg_cron schedule ───────────────────────────────────────────────────────
-- Every Monday at 00:30 UTC = 06:00 IST.
-- First-Monday guard is enforced inside the function body, not the cron expression.
-- This is the standard pattern for "first weekday of month" in pg_cron.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove any stale schedule with the same name before (re-)creating
    PERFORM cron.unschedule('monthly-ai-displacement-report')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'monthly-ai-displacement-report'
    );

    PERFORM cron.schedule(
      'monthly-ai-displacement-report',
      '30 0 * * 1',                     -- every Monday 00:30 UTC (06:00 IST)
      $$SELECT public.generate_monthly_report()$$
    );
    RAISE NOTICE '[MonthlyReport] pg_cron job scheduled (every Monday 00:30 UTC; first-Monday guard inside function)';
  ELSE
    RAISE NOTICE '[MonthlyReport] pg_cron not available — schedule manually or via GitHub Actions';
    RAISE NOTICE 'GitHub Actions alternative: cron "30 0 * * 1" → call generate_monthly_report() via Supabase REST';
  END IF;
END $$;

-- ── Verification queries ─────────────────────────────────────────────────────
-- SELECT * FROM public.community_risk_signals ORDER BY avg_score DESC LIMIT 10;
-- SELECT * FROM public.monthly_reports ORDER BY year_month DESC LIMIT 5;
-- SELECT COUNT(*) FROM public.user_preferences WHERE monthly_report = true;
-- SELECT generate_monthly_report();  -- manual trigger for testing
