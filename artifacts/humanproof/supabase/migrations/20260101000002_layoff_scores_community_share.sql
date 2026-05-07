-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000002_layoff_scores_community_share.sql
-- Purpose:   Ensure layoff_scores table exists; add allow_community_share;
--            create community_risk_signals view; add peer_benchmarks table;
--            add refresh_peer_benchmarks() function.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. layoff_scores — create if not exists ───────────────────────────────
CREATE TABLE IF NOT EXISTS layoff_scores (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name          TEXT        NOT NULL,
  role_title            TEXT        NOT NULL,
  department            TEXT,
  score                 INTEGER     NOT NULL,
  tier                  TEXT,
  tier_color            TEXT,
  confidence            TEXT,
  breakdown             JSONB,
  models_used           TEXT[],
  data_quality          TEXT,
  role_key              TEXT,
  industry_key          TEXT,
  allow_community_share BOOLEAN     NOT NULL DEFAULT false,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Add allow_community_share if table existed without it ─────────────
ALTER TABLE layoff_scores
  ADD COLUMN IF NOT EXISTS allow_community_share BOOLEAN NOT NULL DEFAULT false;

-- ── 3. Add role_key / industry_key if missing (used by community view) ───
ALTER TABLE layoff_scores
  ADD COLUMN IF NOT EXISTS role_key     TEXT;
ALTER TABLE layoff_scores
  ADD COLUMN IF NOT EXISTS industry_key TEXT;

-- ── 4. Indexes ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ls_user_id
  ON layoff_scores (user_id);

CREATE INDEX IF NOT EXISTS idx_ls_calculated_at
  ON layoff_scores (calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ls_community
  ON layoff_scores (allow_community_share, created_at DESC)
  WHERE allow_community_share = true;

-- ── 5. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE layoff_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_scores" ON layoff_scores
  FOR ALL USING (auth.uid() = user_id);

-- ── 6. community_risk_signals view ───────────────────────────────────────
CREATE OR REPLACE VIEW community_risk_signals AS
SELECT
  role_key,
  industry_key,
  ROUND(AVG(score)::numeric, 1)         AS avg_score,
  COUNT(*)                               AS sample_size,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE score >= 65) / COUNT(*),
    1
  )                                      AS pct_high_critical,
  MAX(created_at)                        AS last_updated
FROM layoff_scores
WHERE allow_community_share = true
  AND created_at > NOW() - INTERVAL '90 days'
GROUP BY role_key, industry_key
HAVING COUNT(*) >= 5;

GRANT SELECT ON community_risk_signals TO anon, authenticated;

-- ── 7. peer_benchmarks table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS peer_benchmarks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key     TEXT        NOT NULL UNIQUE,
  p10          NUMERIC(5,1),
  p25          NUMERIC(5,1),
  p50          NUMERIC(5,1),
  p75          NUMERIC(5,1),
  p90          NUMERIC(5,1),
  sample_size  INTEGER     NOT NULL DEFAULT 0,
  data_as_of   DATE        NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pb_role_key ON peer_benchmarks (role_key);

ALTER TABLE peer_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_peer_benchmarks" ON peer_benchmarks
  FOR SELECT USING (true);

CREATE POLICY "service_write_peer_benchmarks" ON peer_benchmarks
  FOR ALL USING (auth.role() = 'service_role');

-- ── 8. refresh_peer_benchmarks() ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_peer_benchmarks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO peer_benchmarks (role_key, p10, p25, p50, p75, p90, sample_size, data_as_of, updated_at)
  SELECT
    role_key,
    ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p10,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p25,
    ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p50,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p75,
    ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p90,
    COUNT(*)::INTEGER                                                        AS sample_size,
    CURRENT_DATE                                                             AS data_as_of,
    NOW()                                                                    AS updated_at
  FROM layoff_scores
  WHERE allow_community_share = true
    AND created_at > NOW() - INTERVAL '90 days'
  GROUP BY role_key
  HAVING COUNT(*) >= 100
  ON CONFLICT (role_key) DO UPDATE SET
    p10         = EXCLUDED.p10,
    p25         = EXCLUDED.p25,
    p50         = EXCLUDED.p50,
    p75         = EXCLUDED.p75,
    p90         = EXCLUDED.p90,
    sample_size = EXCLUDED.sample_size,
    data_as_of  = EXCLUDED.data_as_of,
    updated_at  = EXCLUDED.updated_at;
END;
$$;
