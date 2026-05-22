-- Migration: 20260623000006_l1_null_sector_baseline.sql
--
-- Documents the L1 null-data guard fix: sector baseline replaces neutral 0.50
-- when both primary L1 financial signals are absent for a public company.
--
-- THE BUG:
--   calculateCompanyHealthScore(companyData) only receives companyData, not
--   industryData. When both revenueGrowthYoY=null AND stock90DayChange=null
--   for a public company, the function was driven entirely by:
--     fundingRisk = 0.30 (fixed for all public companies), weight=0.15
--   Producing L1 ≈ 0.30 — below neutral — regardless of industry sector.
--
--   Additionally, _syntheticRiskScore (the L3 blending adjustment, used when
--   no DB-sourced companyRiskScore is available) started from s=0.50 neutral,
--   making the L3 modifier = globalL3 × (0.82 + 0.50 × 0.36) = globalL3 × 1.00
--   — perfectly neutral even for high-risk sectors.
--
-- THE FIX (calculateLayoffScore, after L1 computation):
--   Detect: companyData.isPublic === true AND revenueGrowthYoY == null
--           AND stock90DayChange == null
--   Override: L1 = industryData.baselineRisk (sector average)
--   Tag: (companyData as any)._l1EstimatedFromSector = true for TransparencyTab
--   Output: l1EstimatedFromSector: true, l1SectorBaseline: number on ScoreResult
--
--   For _syntheticRiskScore: s = industryData?.baselineRisk ?? 0.50
--   (sector baseline when available; neutral 0.50 fallback when industryData absent)
--
-- PRIVATE COMPANIES EXCLUDED:
--   Private companies already get a funding-recency proxy for the stock slot
--   (monthsSinceLastFunding → 0.22–0.75 on a calibrated scale). This is
--   structurally meaningful signal, not an absence. The fix applies only to
--   public companies where stock IS a primary signal and is absent.
--
-- TRANSPARENCY:
--   TransparencyTab EffectiveWeightsPanel shows:
--     - Amber "ESTIMATED" banner when l1EstimatedFromSector=true
--     - "L1 ESTIMATED" badge on the L1 row in the weights table
--   analyzeSignalQuality missingDataFallbacks updated:
--     "⚠ L1 ESTIMATED — both stock and revenue signals absent.
--      L1 uses industry sector baseline (sector baseline: N%) rather than
--      company-specific financials. Score may be ±8 pts from true value."
--
-- QUANTIFIED IMPACT (public company, null revenue + null stock, tech sector):
--   Before: L1 = 0.30 (fundingRisk-only, company-agnostic), _syntheticRiskScore = 0.50
--   After:  L1 = industryData.baselineRisk (e.g. 0.55 for tech), _syntheticRiskScore = 0.55
--   At L1 weight 0.16: score change = (0.55 - 0.30) × 0.16 × 100 = +4.0 pts
--   _syntheticRiskScore change: L3 modifier goes from ×1.00 to ×(0.82 + 0.55×0.36) = ×1.018
--   L3 effect (weight 0.18): ~+0.3 pts for average globalL3 = 0.45

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
  'L1_null_sector_baseline_override',
  0.16,
  'regression_derived',
  'L1 (direct financial health, formula weight 0.16) uses sector baseline '
  '(industryData.baselineRisk) when both primary signals are absent for public '
  'companies (revenueGrowthYoY=null AND stock90DayChange=null). '
  'Private companies excluded — funding-recency proxy is structurally meaningful '
  'signal, not absence. Sector baseline is more honest than the prior behaviour '
  '(fundingRisk=0.30 for all public companies). Disclosed via ESTIMATED badge in '
  'TransparencyTab EffectiveWeightsPanel and in missingDataFallbacks. '
  '_syntheticRiskScore (L3 blending adjustment) also starts from sector baseline '
  'when available, replacing the prior neutral 0.50.',
  '2026-06-23',
  'Before: L1 ≈ 0.30 for all null-signal public companies (fundingRisk fixed). '
  'After:  L1 = industryData.baselineRisk (e.g. 0.55 for tech). '
  'Score impact at L1 weight 0.16: up to +4.0 pts for high-risk sectors. '
  '_syntheticRiskScore impact (L3 modifier): ≤+0.5 pts at sector baseline 0.55. '
  'l1EstimatedFromSector + l1SectorBaseline added to ScoreResult for UI disclosure.',
  now(),
  now()
)
ON CONFLICT (dimension_key)
DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = now();
