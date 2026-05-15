-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260620000004_seed_remaining_engines_constants.sql
-- Purpose:   WS9 fan-out completion — seed the calibration constants for
--            the 6 remaining score-affecting engines that were refactored
--            in this batch.
--
--            Engines covered:
--              * signalDecayModel        — 7 halfLives + 7 minWeights (record-shaped)
--              * visaRiskEngine          — 6 score amplifiers
--              * managerRiskEngine       — departureUplift record (5 entries)
--              * internalMobilityEngine  — sizeViabilityBase record (3 entries)
--              * whatIfSimulatorService  — dimensionFeasibility record (7 entries)
--              * roleDisplacementAgent   — fallbackKeywordTable record (38 entries)
--
--            Each row preserves the legacy in-code bootstrap value exactly.
--            recalibrate-engine will replace uncalibrated_placeholder rows
--            with regression-derived values as outcome data accumulates.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.engine_calibration_constants (key, value, provenance, rationale, created_by) VALUES
  -- ── signalDecayModel (2 record-shaped constants) ──────────────────────────
  (
    'signalDecayModel.halfLives',
    '{"breaking_news_layoff":3,"stock_90d_change":7,"executive_departure":14,"hiring_posting_trend":10,"revenue_growth_yoy":90,"layoff_history_event":30,"sector_contagion":21}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — signalDecayModel.ts:37 half-lives in days per signal type. Mirrors BOOTSTRAP_HALF_LIVES exactly. Drives exponential decay of stale signals.',
    'WS9-fanout-2'
  ),
  (
    'signalDecayModel.minWeights',
    '{"breaking_news_layoff":0.10,"stock_90d_change":0.15,"executive_departure":0.20,"hiring_posting_trend":0.15,"revenue_growth_yoy":0.30,"layoff_history_event":0.25,"sector_contagion":0.20}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — signalDecayModel.ts:48 minimum weight floors. Mirrors BOOTSTRAP_MIN_WEIGHTS exactly. Even very stale signals retain this much information.',
    'WS9-fanout-2'
  ),

  -- ── visaRiskEngine (6 amplifiers) ─────────────────────────────────────────
  ('visaRiskEngine.amplifier.gcLockIn',       '1.40'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — visaRiskEngine.ts:180. Green card in progress without AC21 portability.', 'WS9-fanout-2'),
  ('visaRiskEngine.amplifier.gcPortable',     '1.05'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — visaRiskEngine.ts:183. GC in progress + AC21 portability applies.', 'WS9-fanout-2'),
  ('visaRiskEngine.amplifier.h1bL1HighRisk',  '1.35'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — visaRiskEngine.ts:186. H1B/L1 holder at elevated risk (>=60 score).', 'WS9-fanout-2'),
  ('visaRiskEngine.amplifier.tn',             '1.25'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — visaRiskEngine.ts:189. TN status (no grace period).', 'WS9-fanout-2'),
  ('visaRiskEngine.amplifier.moderateRisk',   '1.20'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — visaRiskEngine.ts:192. Non-TN/H1B/L1 visa holder at moderate risk.', 'WS9-fanout-2'),
  ('visaRiskEngine.amplifier.baseline',       '1.10'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — visaRiskEngine.ts:195. Baseline visa-holder amplifier.', 'WS9-fanout-2'),

  -- ── managerRiskEngine (record-shaped uplift map) ──────────────────────────
  (
    'managerRiskEngine.departureUplift',
    '{"none":0.00,"unknown":0.05,"recent_voluntary":0.10,"recent_forced":0.28,"recent_layoff":0.35}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — managerRiskEngine.ts:72 base probability uplifts by departure type. Mirrors BOOTSTRAP_DEPARTURE_PROBABILITY_UPLIFT.',
    'WS9-fanout-2'
  ),

  -- ── internalMobilityEngine (record-shaped size viability base) ────────────
  (
    'internalMobilityEngine.sizeViabilityBase',
    '{"mid":45,"large":65,"mega":78}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — internalMobilityEngine.ts base score by company-size tier. Mirrors BOOTSTRAP_SIZE_VIABILITY.',
    'WS9-fanout-2'
  ),

  -- ── whatIfSimulatorService (record-shaped feasibility map) ────────────────
  (
    'whatIfSimulatorService.dimensionFeasibility',
    '{"L1":{"score":30,"timeLabel":"12–18 months (company switch required)"},"L2":{"score":35,"timeLabel":"12–24 months (company switch + track record)"},"L3":{"score":60,"timeLabel":"3–6 months (skill building + AI adoption)"},"L4":{"score":25,"timeLabel":"12+ months (industry change)"},"L5":{"score":75,"timeLabel":"1–3 months (performance + relationships)"},"D6":{"score":65,"timeLabel":"2–4 months (AI tool adoption)"},"D7":{"score":35,"timeLabel":"12–18 months (company or role change)"}}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — whatIfSimulatorService.ts:92 user-achievable score uplift per dimension. Mirrors BOOTSTRAP_DIMENSION_FEASIBILITY.',
    'WS9-fanout-2'
  ),

  -- ── roleDisplacementAgent (record-shaped fallback keyword table) ──────────
  (
    'roleDisplacementAgent.fallbackKeywordTable',
    '{"data entry":0.97,"cashier":0.90,"telemarketer":0.88,"bookkeeper":0.85,"translator":0.82,"customer service":0.75,"paralegal":0.72,"content writer":0.72,"copywriter":0.68,"accountant":0.74,"financial analyst":0.58,"analyst":0.52,"recruiter":0.65,"hr ":0.58,"auditor":0.62,"marketing":0.55,"sales":0.48,"software engineer":0.32,"developer":0.35,"programmer":0.30,"data scientist":0.38,"ml engineer":0.28,"ai engineer":0.18,"product manager":0.30,"designer":0.42,"ux ":0.38,"architect":0.22,"manager":0.35,"director":0.28,"executive":0.20,"nurse":0.12,"doctor":0.10,"therapist":0.08,"teacher":0.18,"researcher":0.35,"scientist":0.30,"default":0.45}'::jsonb,
    'uncalibrated_placeholder',
    'UNCALIBRATED — roleDisplacementAgent.ts:25 fallback keyword → displacement-risk table. Mirrors BOOTSTRAP_ROLE_DISPLACEMENT_FALLBACK. Oxford-derived + WEF 2025 update; used only when getCareerIntelligence() returns no record.',
    'WS9-fanout-2'
  )
ON CONFLICT (key, cohort_scope) WHERE status = 'active' DO NOTHING;

COMMENT ON TABLE public.engine_calibration_constants IS
  'WS9 — long-tail scalar + record-shaped constants. Seeded across:'
  '20260615000001 (initial 25, some superseded), '
  '20260620000002 (peer/sentiment/headcount fan-out), '
  '20260620000003 (corrected layoffScoreEngine band keys), '
  '20260620000004 (signalDecay/visa/manager/internalMobility/whatIf/'
  'roleDisplacement fan-out). 11 rows marked uncalibrated_placeholder are '
  'recalibrate-engine work-queue items.';
