-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000010_market_intelligence_cache_history.sql
-- Purpose:   Historical snapshots of market_intelligence_cache to enable
--            delta_90d (90-day job-count change) computation in the Career
--            Skills tab. Without this table, skillDemandService.ts always
--            returns delta90d: null.
--
-- Flow:
--   1. refresh-market-intelligence Edge Function writes to market_intelligence_cache
--   2. A trigger (below) copies each upsert into this history table with a timestamp
--   3. skillDemandService.ts computes delta90d by comparing the current count
--      against the row closest to 90 days ago in this table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS market_intelligence_cache_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key        TEXT        NOT NULL,
  india_openings  INTEGER,
  global_openings INTEGER,
  demand_trend    TEXT        CHECK (demand_trend IN ('surging','growing','stable','contracting')),
  data_as_of      DATE        NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mich_role_key    ON market_intelligence_cache_history (role_key);
CREATE INDEX IF NOT EXISTS idx_mich_recorded_at ON market_intelligence_cache_history (recorded_at DESC);
-- Composite index for the delta90d query: role + date range
CREATE INDEX IF NOT EXISTS idx_mich_role_date   ON market_intelligence_cache_history (role_key, recorded_at DESC);

ALTER TABLE market_intelligence_cache_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_mic_history" ON market_intelligence_cache_history
  FOR SELECT USING (true);

CREATE POLICY "service_write_mic_history" ON market_intelligence_cache_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── Trigger: snapshot market_intelligence_cache on each upsert ───────────────
-- Fires after every INSERT or UPDATE on market_intelligence_cache so that
-- each weekly refresh creates a history row automatically.
CREATE OR REPLACE FUNCTION snapshot_market_intelligence_cache()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO market_intelligence_cache_history
    (role_key, india_openings, global_openings, demand_trend, data_as_of, recorded_at)
  VALUES
    (NEW.role_key, NEW.india_openings, NEW.global_openings, NEW.demand_trend,
     NEW.data_as_of, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_mic ON market_intelligence_cache;

CREATE TRIGGER trg_snapshot_mic
AFTER INSERT OR UPDATE ON market_intelligence_cache
FOR EACH ROW EXECUTE FUNCTION snapshot_market_intelligence_cache();
