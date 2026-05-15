-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260621000002_canonical_view_search_haystack.sql
-- Purpose:   v35.1.3-patch — Adds a `search_haystack` column to
--            v_company_canonical so autocomplete can match short forms.
--
--            Problem found post-deploy of 20260621000001: when the canonical
--            name is "Tata Consultancy Services", a user typing "TCS" finds
--            nothing because neither the canonical name nor the raw_company_name
--            ("Tata Consultancy Services (India Giant)") contains "TCS".
--
--            Fix: aggregate every raw company_name that folds into a canonical
--            row into a pipe-delimited `search_haystack` string. The
--            autocomplete query becomes:
--               WHERE company_name ILIKE '%q%' OR search_haystack ILIKE '%q%'
--            which catches "TCS", "ORCL", "AWS", etc.
--
--            Column shape changes (added `search_haystack`), so the view must
--            be dropped and recreated — `CREATE OR REPLACE VIEW` rejects
--            column-shape changes.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.v_company_canonical CASCADE;

CREATE VIEW public.v_company_canonical AS
WITH labeled AS (
  SELECT
    ci.*,
    COALESCE(
      (SELECT m.canonical_name
       FROM public.company_canonical_aliases m
       WHERE ci.company_name ~* m.match_pattern
         AND (m.exclude_pattern IS NULL OR ci.company_name !~* m.exclude_pattern)
       ORDER BY m.priority DESC, length(m.match_pattern) DESC
       LIMIT 1),
      ci.company_name
    ) AS canonical_name
  FROM public.company_intelligence ci
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY canonical_name
      ORDER BY
        CASE WHEN workforce_count >= 1000 THEN 0 ELSE 1 END,
        last_updated DESC NULLS LAST,
        confidence_score DESC NULLS LAST,
        workforce_count DESC NULLS LAST
    ) AS canonical_rank,
    COUNT(*) OVER (PARTITION BY canonical_name) AS n_duplicates
  FROM labeled
),
aggregated_aliases AS (
  -- Pipe-delimited list of every raw company_name folded into this canonical.
  -- The autocomplete ILIKE runs against this string so "TCS" matches even
  -- when the canonical display name is "Tata Consultancy Services".
  SELECT
    canonical_name,
    string_agg(DISTINCT company_name, ' | ') AS search_haystack
  FROM labeled
  GROUP BY canonical_name
)
SELECT
  r.id,
  r.canonical_name                AS company_name,
  r.company_name                  AS raw_company_name,
  r.industry,
  r.workforce_count,
  r.company_size,
  r.stage,
  r.financial_signals,
  r.layoff_history,
  r.hiring_signals,
  r.ai_exposure_index,
  r.market_risk_score,
  r.company_risk_score,
  r.confidence_score,
  r.role_risk_map,
  r.archetype,
  r.data_source,
  (r.financial_signals->>'ticker') AS stock_ticker,
  r.github_org,
  r.open_jobs_count,
  r.last_updated,
  r.n_duplicates,
  a.search_haystack,
  r.created_at,
  r.updated_at
FROM ranked r
JOIN aggregated_aliases a ON r.canonical_name = a.canonical_name
WHERE r.canonical_rank = 1;

COMMENT ON VIEW public.v_company_canonical IS
  'v35.1.3-patch — Autocomplete dedup view with search_haystack. Returns one '
  'row per canonical entity; search_haystack aggregates every raw alias so '
  'short-form queries (TCS, ORCL, AWS) hit the canonical row.';
