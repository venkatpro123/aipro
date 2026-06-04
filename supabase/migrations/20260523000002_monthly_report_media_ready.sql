-- 20260523000002_monthly_report_media_ready.sql
--
-- Fixes four gaps in the monthly India AI Displacement Report pipeline:
--
--   GAP-1  generate_monthly_report() omits pct_high_critical from community_risk_signals
--          in top_risk_roles and most_improved sections — headline stat unavailable.
--
--   GAP-2  Career transitions query uses wrong column names: transition_months (does not
--          exist) and created_at (does not exist on career_transitions). Correct names
--          are timeline_months and submitted_at.
--
--   GAP-3  Section 5 queries public.prediction_outcomes which was never created.
--          user_prediction_outcomes (created in 20260514000002) is a different table
--          (per-user predictions, not aggregated accuracy ledger). This migration creates
--          prediction_outcomes as a calibration accuracy ledger and rewrites the query.
--
--   GAP-4  No media-ready headline or structured press payload. Adds:
--            v_headline   — publishable stat string (e.g. "HumanProof data: 73% of QA
--                           Engineers in IT Services scored High or Critical risk in May 2026")
--            v_media_ready — JSONB sub-object with headline, subheadline, key_stats[],
--                            press_bullets[], attribution, report_url.
--          Both are added to the monthly_reports payload and to the pg_net body so
--          send-monthly-report can surface the headline in the email subject line.

-- ── 1. prediction_outcomes calibration ledger ──────────────────────────────────
-- Engine-level accuracy tracking (not per-user). Populated by the calibration
-- pipeline when actual outcomes become known (layoffs confirmed / not confirmed).
-- Distinct from user_prediction_outcomes which stores per-user 30/90/180-day prompts.

CREATE TABLE IF NOT EXISTS public.prediction_outcomes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Human-readable key, e.g. "wipro:software_engineer"
  company_role    TEXT          NOT NULL,
  -- Score the swarm consensus produced at prediction time (0–100)
  swarm_score     NUMERIC(5,2)  CHECK (swarm_score BETWEEN 0 AND 100),
  -- Score the deterministic engine produced at prediction time (0–100)
  engine_score    NUMERIC(5,2)  CHECK (engine_score BETWEEN 0 AND 100),
  -- Ground-truth outcome: 1.0 = layoff confirmed, 0.0 = no layoff, fractional = partial
  actual_outcome  NUMERIC(4,3)  CHECK (actual_outcome BETWEEN 0 AND 1),
  -- Accuracy: 1 - |normalised_prediction - actual_outcome| (higher = more accurate)
  accuracy_score  NUMERIC(6,4)  CHECK (accuracy_score BETWEEN 0 AND 1),
  -- Outcome source: 'news_confirmed' | 'user_reported' | 'sec_filing' | 'manual'
  outcome_source  TEXT          NOT NULL DEFAULT 'news_confirmed'
                  CHECK (outcome_source IN ('news_confirmed','user_reported','sec_filing','manual')),
  recorded_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  prediction_date DATE          NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_recorded_at
  ON public.prediction_outcomes(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_outcomes_company_role
  ON public.prediction_outcomes(company_role);

ALTER TABLE public.prediction_outcomes ENABLE ROW LEVEL SECURITY;

-- Public SELECT — aggregate accuracy data, no PII
CREATE POLICY "prediction_outcomes_public_read"
  ON public.prediction_outcomes FOR SELECT USING (true);

-- Only service_role writes (calibration pipeline runs via SECURITY DEFINER or service key)
REVOKE INSERT, UPDATE, DELETE ON public.prediction_outcomes FROM anon, authenticated;

COMMENT ON TABLE public.prediction_outcomes IS
  'Engine-level prediction accuracy ledger. One row per company-role prediction whose '
  'ground truth is known. Populated by the calibration pipeline. '
  'Distinct from user_prediction_outcomes (per-user 30/90/180-day prompts).';

-- ── 2. Rebuild generate_monthly_report() with all fixes ────────────────────────

CREATE OR REPLACE FUNCTION public.generate_monthly_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today          DATE        := current_date;
  v_year_month     TEXT        := TO_CHAR(v_today, 'YYYY-MM');
  v_month_display  TEXT        := TO_CHAR(v_today, 'FMMonth YYYY');
  v_prior_cutoff   TIMESTAMPTZ := NOW() - INTERVAL '30 days';
  v_month_start    TIMESTAMPTZ := DATE_TRUNC('month', NOW());

  -- Report sections
  v_top_risk           JSONB;
  v_most_improved      JSONB;
  v_company_changes    JSONB;
  v_transition_story   JSONB;
  v_prediction_updates JSONB;
  v_metadata           JSONB;
  v_headline           TEXT;
  v_media_ready        JSONB;
  v_payload            JSONB;

  -- Headline extraction helpers
  v_top_role_key          TEXT;
  v_top_role_industry     TEXT;
  v_top_role_pct          NUMERIC;
  v_avg_change_30d        NUMERIC;

  v_edge_url      TEXT;
  v_total_audits  BIGINT;
  v_opt_in_users  BIGINT;
BEGIN

  -- ── First-Monday guard ────────────────────────────────────────────────────
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
  -- FIX GAP-1: pct_high_critical added from community_risk_signals view.
  SELECT jsonb_agg(row_to_json(t))
  INTO v_top_risk
  FROM (
    SELECT
      crs.role_key,
      crs.industry_key                          AS industry,
      crs.avg_score,
      crs.pct_high_critical,
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
  -- FIX GAP-1: pct_high_critical added.
  SELECT jsonb_agg(row_to_json(t))
  INTO v_most_improved
  FROM (
    SELECT
      crs.role_key,
      crs.industry_key                          AS industry,
      crs.avg_score,
      crs.pct_high_critical,
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
    WHERE COALESCE(prev.avg_score, crs.avg_score) > crs.avg_score
    ORDER BY improvement DESC
    LIMIT 5
  ) t;

  -- ── Section 3: Companies with most significant collapse stage changes ────
  SELECT jsonb_agg(row_to_json(t))
  INTO v_company_changes
  FROM (
    SELECT
      company_name,
      industry,
      overall_risk_score                        AS risk_score,
      last_updated                              AS change_date,
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
  -- FIX GAP-2: timeline_months (not transition_months), submitted_at (not created_at).
  SELECT row_to_json(t)::JSONB
  INTO v_transition_story
  FROM (
    SELECT
      from_role,
      to_role,
      salary_change_pct,
      timeline_months                          AS transition_months,
      TO_CHAR(submitted_at, 'FMMonth YYYY')   AS transition_period
    FROM public.career_transitions
    WHERE verified = true
      AND submitted_at >= v_month_start - INTERVAL '90 days'
    ORDER BY submitted_at DESC
    LIMIT 1
  ) t;

  -- ── Section 5: Prediction ledger updates this month ──────────────────────
  -- FIX GAP-3: queries prediction_outcomes (newly created above), not the
  -- missing table referenced in the original function.
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
    'report_version',          '2.0',
    'generated_at',            NOW()::TEXT,
    'year_month',              v_year_month
  );

  -- ── Section 7: Media-ready headline (FIX GAP-4) ─────────────────────────
  -- Extract the top-ranked role's pct_high_critical for the publishable headline.
  SELECT
    (elem->>'role_key'),
    (elem->>'industry'),
    (elem->>'pct_high_critical')::NUMERIC
  INTO v_top_role_key, v_top_role_industry, v_top_role_pct
  FROM jsonb_array_elements(COALESCE(v_top_risk, '[]'::JSONB)) AS elem
  LIMIT 1;

  -- Average change across the top-risk roles for the subheadline stat
  SELECT ROUND(AVG((elem->>'change_vs_30d')::NUMERIC), 1)
  INTO v_avg_change_30d
  FROM jsonb_array_elements(COALESCE(v_top_risk, '[]'::JSONB)) AS elem
  WHERE (elem->>'change_vs_30d') IS NOT NULL
    AND (elem->>'change_vs_30d')::NUMERIC <> 0;

  -- Publishable headline: "HumanProof data: X% of Role in Industry scored High or Critical risk in Month YYYY"
  IF v_top_role_key IS NOT NULL AND v_top_role_pct IS NOT NULL THEN
    v_headline :=
      'HumanProof data: ' ||
      v_top_role_pct::INT::TEXT || '% of ' ||
      INITCAP(REPLACE(v_top_role_key, '_', ' ')) ||
      ' in India ' || v_top_role_industry ||
      ' scored High or Critical risk in ' || v_month_display;
  ELSE
    v_headline :=
      'HumanProof India AI Displacement Intelligence — ' || v_month_display;
  END IF;

  -- Structured press payload
  v_media_ready := jsonb_build_object(
    'headline',      v_headline,
    'subheadline',
      'HumanProof analysis of ' || v_total_audits::TEXT ||
      ' India tech audits — ' || v_month_display,
    'key_stats',
      COALESCE(
        (SELECT jsonb_agg(stat_row)
         FROM (
           SELECT jsonb_build_object(
             'stat',   (elem->>'pct_high_critical') || '%',
             'label',  'of ' || INITCAP(REPLACE(elem->>'role_key','_',' ')) ||
                       ' at High/Critical risk (' || (elem->>'industry') || ')',
             'n',      (elem->>'sample_size')::INT,
             'source', 'HumanProof community signals'
           ) AS stat_row
           FROM jsonb_array_elements(COALESCE(v_top_risk, '[]'::JSONB)) AS elem
           WHERE (elem->>'pct_high_critical') IS NOT NULL
           LIMIT 3
         ) stats
        ),
        '[]'::JSONB
      ) || jsonb_build_array(
        jsonb_build_object(
          'stat',   v_total_audits::TEXT,
          'label',  'total audits analysed this month',
          'source', 'HumanProof platform'
        )
      ),
    'press_bullets',
      COALESCE(
        (SELECT jsonb_agg(b ORDER BY idx)
         FROM (
           SELECT 1 AS idx, jsonb_build_object('order',1,'text',
             'HumanProof data: ' ||
             COALESCE(
               (SELECT (e->>'pct_high_critical')
                FROM jsonb_array_elements(COALESCE(v_top_risk,'[]'::JSONB)) AS e
                WHERE (e->>'pct_high_critical') IS NOT NULL
                LIMIT 1),
               'N/A'
             ) || '% risk in top role in ' || v_month_display || '.') AS b
           UNION ALL
           SELECT 2, jsonb_build_object('order',2,'text',
             CASE WHEN jsonb_array_length(COALESCE(v_most_improved,'[]'::JSONB)) > 0
               THEN 'Most improved roles saw score reductions in ' || v_month_display || '.'
               ELSE 'Risk scores for top roles remained elevated vs prior period.'
             END) AS b
           UNION ALL
           SELECT 3, jsonb_build_object('order',3,'text',
             jsonb_array_length(COALESCE(v_company_changes,'[]'::JSONB))::TEXT ||
             ' companies flagged with elevated risk signals in ' || v_month_display || '.') AS b
         ) bullets(idx, b)
        ),
        '[]'::JSONB
      ),
    'attribution',
      'Source: HumanProof AI displacement risk intelligence platform. '
      'Based on anonymised community audit data (minimum n=20 per role-industry cell). '
      'Not investment or employment advice.',
    'generated_at', NOW()::TEXT
  );

  -- ── Assemble payload ─────────────────────────────────────────────────────
  v_payload := jsonb_build_object(
    'generated_at',        NOW()::TEXT,
    'year_month',          v_year_month,
    'headline',            v_headline,
    'top_risk_roles',      COALESCE(v_top_risk,          '[]'::JSONB),
    'most_improved',       COALESCE(v_most_improved,     '[]'::JSONB),
    'company_changes',     COALESCE(v_company_changes,   '[]'::JSONB),
    'transition_story',    COALESCE(v_transition_story,  'null'::JSONB),
    'prediction_updates',  COALESCE(v_prediction_updates,'[]'::JSONB),
    'media_ready',         v_media_ready,
    'metadata',            v_metadata
  );

  -- ── Persist the report ───────────────────────────────────────────────────
  INSERT INTO public.monthly_reports (year_month, payload, triggered_by)
  VALUES (v_year_month, v_payload, 'pg_cron')
  ON CONFLICT (year_month) DO NOTHING;

  RAISE NOTICE '[MonthlyReport] Report % inserted. Headline: %', v_year_month, v_headline;

  -- ── Call send-monthly-report Edge Function via pg_net ────────────────────
  v_edge_url := current_setting('app.send_monthly_report_url', true);
  IF v_edge_url IS NOT NULL AND v_edge_url <> '' THEN
    PERFORM net.http_post(
      url     := v_edge_url,
      body    := jsonb_build_object(
                   'year_month',  v_year_month,
                   'payload',     v_payload,
                   'headline',    v_headline,
                   'media_ready', v_media_ready
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
  'v2.0 — adds pct_high_critical, publishable headline, and media_ready JSONB sub-object. '
  'Fixes career_transitions column names (timeline_months / submitted_at) and '
  'prediction_outcomes table reference. '
  'Fires automatically via pg_cron every Monday at 00:30 UTC (06:00 IST); '
  'first-Monday guard skips non-first Mondays. '
  'Idempotent — safe to re-run on crash recovery.';

-- ── Verification ──────────────────────────────────────────────────────────────
-- SELECT * FROM public.prediction_outcomes LIMIT 5;
-- SELECT payload->>'headline' AS headline FROM public.monthly_reports ORDER BY year_month DESC LIMIT 3;
-- SELECT payload->'media_ready'->'key_stats' FROM public.monthly_reports ORDER BY year_month DESC LIMIT 1;
-- SELECT generate_monthly_report();  -- manual trigger (first-Monday guard will fire on non-first Mondays)
