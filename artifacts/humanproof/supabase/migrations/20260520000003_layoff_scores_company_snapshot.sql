-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260520000003_layoff_scores_company_snapshot.sql
-- Purpose:   Add company_snapshot JSONB to layoff_scores.
--
-- WHY THIS EXISTS
-- ───────────────
-- The delta attribution feature (scoreDeltaService.ts:explainDimensionDelta)
-- explains WHY a score changed by comparing the company signals at two audit
-- times. Without the snapshot, it can only report that the score changed —
-- "Score increased 6 points" with no driver is not actionable.
--
-- The localStorage path (recordScore) already stores companySnapshot per
-- audit. The layoff_scores DB table is the server-side equivalent for users
-- who audit from multiple devices or clear their browser storage.
--
-- REQUIRED FIELDS FOR ATTRIBUTION
-- ────────────────────────────────
-- stock90DayChange   — drives L1 driver text (stock risk comparison)
-- revenueGrowthYoY   — drives L1 driver text (revenue trend comparison)
-- layoffRounds       — drives L2 driver text (new event detection)
-- lastLayoffPercent  — drives L2 driver text (workforce cut percentage)
-- lastLayoffDate     — drives L2 recency weight (e^(-daysAgo/30))
-- aiInvestmentSignal — drives L3 driver text (AI amplification factor delta)
--
-- SHAPE
-- ─────
-- JSONB, nullable. Not all audits will have live data for every field.
-- Missing fields cause graceful fallback to generic driver text in
-- explainDimensionDelta() — not an error.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE layoff_scores
  ADD COLUMN IF NOT EXISTS company_snapshot JSONB;

-- Index for future analytics queries like:
--   "show all audits where stock90DayChange worsened since last audit"
-- GIN index on JSONB enables key-path queries without a full table scan.
CREATE INDEX IF NOT EXISTS ls_company_snapshot_idx
  ON layoff_scores USING GIN (company_snapshot)
  WHERE company_snapshot IS NOT NULL;
