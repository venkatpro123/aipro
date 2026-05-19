-- company_skill_demand_cache
--
-- Stores Naukri/LinkedIn job-opening counts per company × role_prefix,
-- updated each time the naukriConnector gets a live response.
--
-- Purpose: power the company-specific skill demand overlay in CareerSkillsTab.
-- When a company has been scraped within the last 7 days, skills for the matching
-- role are annotated with company-specific demand signals rather than industry
-- averages — the two confidence levels must never be mixed.
--
-- Delta computation:
--   prev_openings  = the count recorded before the most recent upsert
--                    (used to compute delta_90d_pct on the client without a
--                    separate history table; updated only when the row is
--                    > 30 days old, giving a 30–90 day comparison window)
--   delta_90d_pct  = (current_openings - prev_openings) / NULLIF(prev_openings,0) * 100
--                    Positive = demand growing. Negative = demand contracting.
--                    NULL when prev_openings is not yet available (first scrape).
--
-- Thresholds (enforced in applyCompanySkillOverlay, not in DB):
--   delta_90d_pct < -25 → skills matching this role prefix become at_risk
--   delta_90d_pct > +30 → safe skills matching this role prefix get "demand rising" badge

CREATE TABLE IF NOT EXISTS company_skill_demand_cache (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name       text        NOT NULL,
  role_prefix        text        NOT NULL,
  current_openings   integer,
  prev_openings      integer,
  delta_90d_pct      numeric(7, 2),
  demand_trend       text        CHECK (demand_trend IN ('surging', 'growing', 'stable', 'contracting')),
  naukri_openings    integer,
  linkedin_openings  integer,
  is_live            boolean     NOT NULL DEFAULT false,
  scraped_at         timestamptz NOT NULL DEFAULT now(),
  -- updated_prev_at: timestamp when prev_openings was last rotated
  -- used to decide whether to rotate current→prev on next write
  updated_prev_at    timestamptz,

  CONSTRAINT uq_csdc_company_role UNIQUE (company_name, role_prefix)
);

-- Fast lookup: company + role, most-recent row first
CREATE INDEX idx_csdc_lookup
  ON company_skill_demand_cache (company_name, role_prefix, scraped_at DESC);

-- Fast freshness filter (7-day window queries)
CREATE INDEX idx_csdc_scraped_at
  ON company_skill_demand_cache (scraped_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE company_skill_demand_cache ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (for the frontend overlay)
CREATE POLICY csdc_read
  ON company_skill_demand_cache FOR SELECT
  TO authenticated
  USING (true);

-- Only the service role may write (naukriConnector writes via service key)
-- Client-side writes go through the upsert_company_skill_demand RPC below
CREATE POLICY csdc_insert_service
  ON company_skill_demand_cache FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY csdc_update_service
  ON company_skill_demand_cache FOR UPDATE
  TO service_role
  USING (true);

-- ── Upsert RPC ────────────────────────────────────────────────────────────────
-- Called by the frontend (via supabase.rpc) after naukriConnector gets a live
-- response. SECURITY DEFINER so it can write regardless of the user's role.
--
-- Delta rotation logic:
--   1. If no existing row → insert with current_openings only (prev_openings NULL).
--   2. If existing row updated_prev_at is > 30 days ago (or NULL) AND current_openings
--      has changed → rotate: prev_openings = old current_openings, update_prev_at = now().
--   3. Otherwise → update current_openings + metadata without rotating prev.
--
-- Returns the final delta_90d_pct for the caller to record.
CREATE OR REPLACE FUNCTION upsert_company_skill_demand(
  p_company_name      text,
  p_role_prefix       text,
  p_current_openings  integer,
  p_demand_trend      text,
  p_naukri_openings   integer,
  p_linkedin_openings integer,
  p_is_live           boolean
)
RETURNS numeric   -- the computed delta_90d_pct (null on first write)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing   company_skill_demand_cache%ROWTYPE;
  v_prev       integer := NULL;
  v_delta      numeric := NULL;
  v_prev_at    timestamptz := NULL;
  v_rotate     boolean := false;
BEGIN
  -- 1. Read existing row
  SELECT * INTO v_existing
  FROM company_skill_demand_cache
  WHERE company_name = p_company_name
    AND role_prefix  = p_role_prefix;

  IF FOUND THEN
    -- 2. Decide whether to rotate prev_openings
    v_rotate := (
      v_existing.updated_prev_at IS NULL
      OR v_existing.updated_prev_at < now() - interval '30 days'
    ) AND (
      v_existing.current_openings IS DISTINCT FROM p_current_openings
    );

    IF v_rotate THEN
      v_prev    := v_existing.current_openings;
      v_prev_at := now();
    ELSE
      v_prev    := v_existing.prev_openings;
      v_prev_at := v_existing.updated_prev_at;
    END IF;

    -- 3. Compute delta
    IF v_prev IS NOT NULL AND v_prev <> 0 AND p_current_openings IS NOT NULL THEN
      v_delta := round(
        (p_current_openings::numeric - v_prev::numeric) / v_prev::numeric * 100,
        2
      );
    END IF;

    UPDATE company_skill_demand_cache SET
      current_openings  = p_current_openings,
      prev_openings     = v_prev,
      delta_90d_pct     = v_delta,
      demand_trend      = p_demand_trend,
      naukri_openings   = p_naukri_openings,
      linkedin_openings = p_linkedin_openings,
      is_live           = p_is_live,
      scraped_at        = now(),
      updated_prev_at   = v_prev_at
    WHERE company_name = p_company_name
      AND role_prefix  = p_role_prefix;

  ELSE
    -- 4. First write — no delta yet
    INSERT INTO company_skill_demand_cache (
      company_name, role_prefix,
      current_openings, prev_openings, delta_90d_pct,
      demand_trend, naukri_openings, linkedin_openings,
      is_live, scraped_at, updated_prev_at
    ) VALUES (
      p_company_name, p_role_prefix,
      p_current_openings, NULL, NULL,
      p_demand_trend, p_naukri_openings, p_linkedin_openings,
      p_is_live, now(), NULL
    );
  END IF;

  RETURN v_delta;
END;
$$;

COMMENT ON TABLE company_skill_demand_cache IS
  'Per-company × role_prefix Naukri/LinkedIn opening counts. Powers the company-specific skill demand overlay. Never mix with market_intelligence_cache (role-level industry averages) in the same UI badge.';

COMMENT ON FUNCTION upsert_company_skill_demand IS
  'Atomic upsert for company_skill_demand_cache with 30-day prev rotation. Called by naukriConnector after every successful live scrape.';
