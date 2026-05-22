-- Migration: 20260623000008_d5_display_removed.sql
--
-- Documents the Option B decision for D5_countryContext (BUG-01 follow-up).
--
-- DECISION: Remove D5 from formula display entirely.
--
-- Prior fix (migration 20260623000001 / git 3311eef) set D5_countryContext = 0.00
-- in every formula weight map and added architecture comments. The remaining
-- problem was that D5/L4 was still rendered as a table row in TransparencyTab
-- (showing 0% formula weight / 0% effective share) and as a dimension card in
-- RiskBreakdownTab (via the L4 entry in hybridResultMapper). A 0-weight row
-- in the formula table has zero information value and misleads users into
-- thinking a dimension is broken or placeholder.
--
-- FILES CHANGED
-- ─────────────
-- TransparencyTab.tsx:
--   - L4 removed from HYBRID_FORMULA_WEIGHTS_DISPLAY (was: L4: 0.00)
--   - L4 removed from LAYER_DISPLAY_NAMES
--   - L4 removed from layers array ['L1','L2','L3','L5'] (was L4 between L3/L5)
--   - L4 removed from segMultiplierKey
--   - Footer text: replaced "Market Conditions shows 0%" explanation with
--     "Country context is encoded in D1 (18%) and L1 (16%) — not a separate
--     formula dimension." (22 words, one sentence)
--   - Architecture comment block simplified to 8 lines (was 12)
--
-- hybridResultMapper.ts:
--   - L4 removed from the dimensions array built in mapToHybridResult().
--     RiskBreakdownTab receives result.dimensions without an L4 entry, so
--     no L4 score card is rendered. L4 remains in result.breakdown for
--     the engine's internal computation.
--
-- RiskBreakdownTab.tsx:
--   - L4 entry removed from L_DIMENSIONS (was "Industry Risk / Industry &
--     Market Headwinds" with weight=0.00)
--   - D5 entry removed from D_DIMENSIONS (was "Country Exposure / Country AI
--     Adoption Exposure" with weight=0.00)
--   - isOracle check updated: ['D1','D2','D3','D4'] (was ['D1','D2','D3','D4','D5'])
--   - Segment calibration multiplier strip: 'l4' removed from the displayed
--     keys (['l1','l2','l3','l5']) — L4 multiplier has no formula effect.
--
-- WHAT UNCHANGED
-- ──────────────
-- - COMPOSITE_FORMULA_WEIGHTS.D5_countryContext = 0.00 (engine, no change)
-- - result.breakdown.L4 still computed and stored (engine path unchanged)
-- - D1 country multiplier (getD1RegionMultiplier) unchanged
-- - L1 PPP thresholds unchanged
-- - calibration_provenance row from 20260623000001 unchanged
-- - Archetype indirect D5 effect (blendArchetypeWeights) unchanged
-- - getEffectiveFormulaWeights() returns D5_countryContext: 0.00 (unchanged)
--
-- WHY OPTION B OVER OPTION A (implement D5 at 0.03)
-- ──────────────────────────────────────────────────
-- Option A would require: (a) COUNTRY_RISK_COMPOSITE data for 40+ ISO codes
-- sourced from World Bank × tech-sector health × regulatory stability, and
-- (b) n ≥ 500 country-stratified layoff outcome events for regression
-- validation. The existing architecture note in layoffScoreEngine.ts
-- explicitly requires this gate before D5 becomes non-zero. Without it,
-- a 0.03 weight would be fake precision. Option B is the honest path.

INSERT INTO scoring_architecture_log (
  dimension_key,
  formula_weight,
  status,
  source_description,
  validation_date,
  notes,
  created_at,
  updated_at
) VALUES (
  'D5_countryContext_display_removed',
  0.00,
  'regression_derived',
  'D5_countryContext (formula weight 0.00) removed from all UI formula displays. '
  'Country context enters the composite score via two factored channels: '
  '(1) D1 channel (weight 0.18) — computeD1CountryMultiplier() applies '
  'jurisdiction-specific enterprise AI deployment rates; '
  '(2) L1 channel (weight 0.16) — getPPPMultiplier() adjusts financial '
  'distress thresholds for purchasing-power differences. '
  'A standalone D5 dimension will be added only when n ≥ 500 country-stratified '
  'layoff outcomes are available for regression validation.',
  '2026-06-23',
  'Files changed: TransparencyTab.tsx (L4 row removed, footer updated), '
  'hybridResultMapper.ts (L4 removed from dimensions array), '
  'RiskBreakdownTab.tsx (L4/D5 removed from DIMENSION_CONFIG, isOracle, seg strip). '
  'Option B chosen over Option A (D5 at 0.03) — no regression data available. '
  'result.breakdown.L4 still computed internally; only display suppressed.',
  NOW(),
  NOW()
)
ON CONFLICT (dimension_key) DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = NOW();
