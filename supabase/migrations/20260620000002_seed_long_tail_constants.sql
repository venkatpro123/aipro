-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260620000002_seed_long_tail_constants.sql
-- Purpose:   WS9 fan-out — seed the long-tail uncalibrated constants
--            that the peer/sentiment/headcount engines now read via
--            getConstant().
--
--            These constants are uncalibrated_placeholder entries
--            (provenance taxonomy from 20260615000001). They mirror the
--            bootstrap fallback values in the engine code exactly, so
--            inserting them does NOT change runtime behaviour today —
--            their purpose is to make the values visible to:
--              * v_uncalibrated_exposure (so we can measure how many
--                audits depend on them)
--              * recalibrate-engine (so it can target them for
--                regression replacement)
--              * ops dashboards (visibility into "which scoring math
--                is still hand-tuned")
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.engine_calibration_constants
  (key, value, provenance, rationale, created_by)
VALUES
  -- peerContagionEngine
  (
    'peerContagionEngine.contributionWeights',
    '{"direct_competitor": 1.0, "adjacent_market": 0.65, "same_sector_large_cap": 0.5, "same_sector_mid_cap": 0.35}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — peerContagionEngine.ts:77 contribution weights by peer-relationship type. Mirrors the in-code BOOTSTRAP_PEER_CONTRIBUTION_WEIGHT exactly. WS9 fan-out.',
    'WS9-fanout'
  ),
  (
    'peerContagionEngine.recencyDecayBands',
    '[[14, 1.0], [30, 0.9], [60, 0.7], [90, 0.5], [180, 0.25]]'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — peerContagionEngine.ts:85 recency decay bands (max-days, weight). Mirrors BOOTSTRAP_RECENCY_DECAY exactly. WS9 fan-out.',
    'WS9-fanout'
  ),
  -- employeeSentimentEngine
  (
    'employeeSentimentEngine.ceoApprovalRisk',
    '{"IMPROVING": 5, "STABLE": 15, "DECLINING": 55, "DECLINING_SHARPLY": 85, "UNKNOWN": 30}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — employeeSentimentEngine.ts:62 CEO approval trend → risk score. Mirrors BOOTSTRAP_CEO_APPROVAL_RISK exactly.',
    'WS9-fanout'
  ),
  (
    'employeeSentimentEngine.cultureScoreRisk',
    '{"IMPROVING": 5, "STABLE": 15, "DECLINING": 45, "DECLINING_SHARPLY": 75, "UNKNOWN": 25}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — employeeSentimentEngine.ts:70 culture-score trend → risk score. Mirrors BOOTSTRAP_CULTURE_SCORE_RISK exactly.',
    'WS9-fanout'
  ),
  (
    'employeeSentimentEngine.attritionRisk',
    '{"HIGH": 70, "MODERATE": 35, "LOW": 10, "UNKNOWN": 25}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — employeeSentimentEngine.ts:78 attrition pressure → risk score. Mirrors BOOTSTRAP_ATTRITION_RISK exactly.',
    'WS9-fanout'
  ),
  -- headcountConsensus
  (
    'headcountConsensus.countMultipliers',
    '{"singleSource": 0.8, "twoSourceAgree": 1.0, "twoSourceDisagree": 0.7, "threePlusAllAgree": 1.0, "threePlusNoneRejected": 0.95, "threePlusOneRejected": 0.9, "threePlusMultiRejected": 0.75}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — headcountConsensus.ts:213 count×agreement multiplier table. Mirrors BOOTSTRAP_COUNT_MULTIPLIERS exactly. Drives confidence on consensus headcounts; misconfigured values would inflate L1 confidence on weakly-corroborated company sizes.',
    'WS9-fanout'
  ),
  -- layoffScoreEngine fallback floor (referenced in WS9 refactor batch 1)
  (
    'layoffScoreEngine.sectorFloor.fallbackSource',
    '0.15'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — layoffScoreEngine.ts:1493 fallback-source epistemic floor. The 0.25 unknownData floor is already in 20260615000001; this is its sibling for when the source IS the fallback shape but the dataset is technically available.',
    'WS9-fanout'
  )
ON CONFLICT (key, cohort_scope) WHERE status = 'active' DO NOTHING;

COMMENT ON TABLE public.engine_calibration_constants IS
  'WS9 — long-tail scalar constants. Seeded by 20260615000001_calibration_provenance.sql '
  '(initial 25 rows) and 20260620000002_seed_long_tail_constants.sql (WS9 fan-out: '
  'peer/sentiment/headcount/fallback-floor). Every row carries provenance; '
  'uncalibrated_placeholder rows are the recalibrate-engine work queue.';
