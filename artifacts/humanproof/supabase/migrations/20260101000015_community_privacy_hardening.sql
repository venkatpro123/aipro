-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000015_community_privacy_hardening.sql
-- Purpose:   Harden the community_risk_signals view to prevent employer-specific
--            information from being inferred from small or employer-concentrated
--            aggregate groups.
--
-- Privacy failures in the original view (HAVING COUNT(*) >= 5):
--
--   1. k-anonymity threshold too low (n=5 vs industry standard n=20).
--      At n=5, the standard error of the mean score is ~±SD/√5 ≈ ±6 pts
--      for a typical SD of 14 pts — barely better than showing the raw score.
--      At n=20, SE ≈ ±3.1 pts, providing meaningful anonymisation.
--
--   2. No employer diversity requirement.
--      If 3 of 5 records come from TCS, the "aggregate" is functionally
--      TCS's score distribution. A TCS employee who opted in knows their
--      colleagues opted in too, and can infer the aggregate is employer-specific.
--
--   3. No employer-dominance cap.
--      A single employer contributing > 50% of records means the aggregate
--      asymptotically converges to that employer's true score as n grows.
--      Even at n=20, one employer with 15 records dominates the signal.
--
-- Fixes applied:
--   - Minimum n raised to 20 (industry standard for k-anonymity in aggregate stats)
--   - Minimum distinct employers: 3 (employer diversity requirement)
--   - Maximum single-employer share: 40% (dominance cap)
--   - employer_diversity_count exposed as a transparency metric in the view
--
-- Note on the COMMUNITY_SIGNALS hardcoded data in CommunityIntelligencePage.tsx:
--   The page currently uses research estimates, not live view data. When the
--   transition to live data occurs, these constraints will govern what appears.
--   The hardcoded data was already labeled "research estimate" — no change needed
--   there. The view protects the future real-data state.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Drop and rebuild community_risk_signals with hardened privacy controls ──
DROP VIEW IF EXISTS community_risk_signals;

CREATE VIEW community_risk_signals AS
WITH
  -- Step 1: Count per (role, industry, employer) to measure employer concentration
  employer_counts AS (
    SELECT
      role_key,
      industry_key,
      company_name,
      COUNT(*) AS employer_record_count
    FROM layoff_scores
    WHERE allow_community_share = true
      AND created_at > NOW() - INTERVAL '90 days'
      AND role_key IS NOT NULL
      AND industry_key IS NOT NULL
    GROUP BY role_key, industry_key, company_name
  ),

  -- Step 2: Group-level statistics needed for both filters and output
  group_stats AS (
    SELECT
      ls.role_key,
      ls.industry_key,
      COUNT(*)                                              AS total_count,
      COUNT(DISTINCT ls.company_name)                       AS distinct_employers,
      MAX(ec.employer_record_count)                         AS max_single_employer_count,
      ROUND(AVG(ls.score)::numeric, 1)                      AS avg_score,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE ls.score >= 65) / COUNT(*), 1
      )                                                     AS pct_high_critical,
      MAX(ls.created_at)                                    AS last_updated
    FROM layoff_scores ls
    JOIN employer_counts ec
      ON  ec.role_key     = ls.role_key
      AND ec.industry_key = ls.industry_key
      AND ec.company_name = ls.company_name
    WHERE ls.allow_community_share = true
      AND ls.created_at > NOW() - INTERVAL '90 days'
      AND ls.role_key IS NOT NULL
      AND ls.industry_key IS NOT NULL
    GROUP BY ls.role_key, ls.industry_key
  )

-- Step 3: Apply all three privacy filters before exposing data
SELECT
  role_key,
  industry_key,
  avg_score,
  total_count                                               AS sample_size,
  pct_high_critical,
  distinct_employers                                        AS employer_diversity_count,
  ROUND(100.0 * max_single_employer_count / total_count, 1) AS max_employer_share_pct,
  last_updated
FROM group_stats
WHERE
  -- Privacy filter 1: k-anonymity — minimum 20 opted-in audits per group
  total_count >= 20

  -- Privacy filter 2: employer diversity — at least 3 different employers
  AND distinct_employers >= 3

  -- Privacy filter 3: dominance cap — no single employer > 40% of records
  -- Prevents one large company from effectively "owning" an aggregate cell.
  -- Example: if TCS contributes 15/20 records, max_single_employer_count/total=75%
  -- which fails this filter.
  AND (max_single_employer_count::numeric / total_count) <= 0.40;

GRANT SELECT ON community_risk_signals TO anon, authenticated;

-- ── Verification: confirm the constraints with a comment ──────────────────
-- Readable summary of privacy policy enforced by this view:
--   n >= 20:             k-anonymity floor (industry standard for aggregate health data)
--   distinct >= 3:       employer diversity (prevents employer-specific inference)
--   max_share <= 40%:    dominance cap (no single employer > 40% of a cell)
--
-- Impact on data availability:
--   With ~0 real opted-in audits today (all data is hardcoded estimates),
--   these constraints produce zero rows from the live table — correct behaviour.
--   The CommunityIntelligencePage continues showing research estimates until
--   real data accumulates. The view enforces constraints on the real data state.
--
-- Maximum single-employer share analysis:
--   At n=20, employer A can have at most 8 records (40%) before the group is
--   suppressed. With 3 required employers, the minimum distribution is:
--     employer A: 8 records (40%)
--     employer B: 6 records (30%)
--     employer C: 6 records (30%)
--   The standard error at n=20 with realistic SD≈14: SE = 14/√20 ≈ ±3.1 pts.
--   This is sufficient to prevent individual score attribution.
