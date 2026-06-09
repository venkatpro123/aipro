-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260609000002_layoff_scores_full_result.sql
-- Purpose:   Add full_result JSONB to layoff_scores so the complete
--            HybridResult (actionItems, escapePaths, dimensions, brief, etc.)
--            survives browser refresh, device switch, and session expiry.
--
-- WHY THIS EXISTS
-- ───────────────
-- The existing layoff_scores row stores score + metadata only. The full
-- HybridResult (90+ fields) was stored only in sessionStorage with a 10-min
-- TTL. A browser refresh after 10 minutes — or any new tab/device — forced
-- the user to re-run the entire audit to recover their intelligence.
--
-- With full_result persisted, the app can restore the complete audit state
-- on any authenticated load without requiring a re-audit.
--
-- FIELD
-- ─────
-- full_result: nullable JSONB. Populated for all new audits after this
--              migration. Legacy rows (before this migration) will have
--              full_result = NULL — the app falls back to re-audit prompt
--              gracefully when NULL.
--
-- SIZE
-- ────
-- A typical HybridResult serialises to ~120–180 KB JSON. Supabase JSONB
-- compresses well (typically 40–60 KB on-disk). With RLS scoping every
-- read/write to auth.uid() = user_id, there is no cross-user access risk.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE layoff_scores
  ADD COLUMN IF NOT EXISTS full_result JSONB;

-- Partial index: only index rows that have a full_result (avoids wasting
-- index space on legacy NULL rows). Used by the restore query which always
-- filters WHERE full_result IS NOT NULL.
CREATE INDEX IF NOT EXISTS idx_ls_full_result_user
  ON layoff_scores (user_id, calculated_at DESC)
  WHERE full_result IS NOT NULL;
