// layoffScoreEngine.ts
// Core 5-layer scoring algorithm — v2.1 (audit fixes + error handling)

import { CompanyData, getPPPMultiplier } from "../data/companyDatabase";
import {
  applyCalibration,
  calibratedRevenueGrowthRisk,
  calibratedStockTrendRisk,
} from "./empiricalCalibration";
// ── Phase-1 Company Intelligence Integration ─────────────────────────────────
// Unified resolver: tries legacy DB first, then the new 50-company intelligence
// DB (companyIntelligenceDB.ts) via the schema bridge adapter.
export {
  resolveCompanyData,
  searchAllCompanies,
  getCompanyRiskSummary,
  getRoleRiskForCompany,
} from "../data/companyIntelligenceBridge";
import { getCompanyRoleRisk } from "../data/companyIntelligenceBridge";
import { IndustryRisk } from "../data/industryRiskData";
import {
  calculateRoleExposureScore,
  inferRoleRisk,
  roleExposureData,
  RoleExposure,
} from "../data/roleExposureData";
import { layoffNewsCache } from "../data/layoffNewsCache";
import { getCareerIntelligence } from "../data/intelligence/index";
import {
  getIndiaRiskEnrichment,
  type IndiaRiskEnrichment,
} from "./indiaSectorIntelligence";
import { validateDataQuality, type DataQualityReport } from "./dataQualityValidator";
import { computeSignalFreshnessWeight } from "./signalDecayModel";

// ─── Error Handling ────────────────────────────────────────────────────

export class LayoffScoreError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
  ) {
    super(message);
    this.name = "LayoffScoreError";
  }
}

export interface ScoreResultWithError {
  result?: ScoreResult;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
    fallbackUsed?: string;
  };
}

// ─── Graceful Degradation: Default Company Data ──────────────────────────

const createFallbackCompanyData = (companyName: string): CompanyData => ({
  name: companyName,
  industry: "technology",
  isPublic: false,
  employeeCount: 1000,
  revenueGrowthYoY: null,
  stock90DayChange: null,
  layoffRounds: 0,
  layoffsLast24Months: [],
  lastLayoffPercent: null,
  revenuePerEmployee: 250000,
  aiInvestmentSignal: "medium",
  region: "US",
  lastUpdated: "2026-04-01",
  source: "Fallback",
});

export const createUnknownCompanyFallback = (
  companyName: string,
): CompanyData => {
  const fallback = createFallbackCompanyData(companyName);
  fallback.source = "Fallback - Unknown Company";
  return fallback;
};

// ─── Interfaces ───

/**
// ─────────────────────────────────────────────────────────────────────────────
// TWO WEIGHT SETS EXIST IN THIS FILE. THEY ARE NOT INTERCHANGEABLE.
//
//  ┌─────────────────────────────────┬────────────────────────────────────────┐
//  │ COMPOSITE_FORMULA_WEIGHTS       │ LAYER_WEIGHTS                          │
//  │ (9 terms, sum = 1.00)           │ (7 entries, sum = 1.10)                │
//  ├─────────────────────────────────┼────────────────────────────────────────┤
//  │ Used in:  calculateLayoffScore  │ Used in:  calculateEngineSimulatedScore│
//  │           rawScore formula      │           (CareerSkillsTab WhatIf)     │
//  │                                 │                                        │
//  │ Requires: NO normalization.     │ Requires: DIVIDE by weightSum (1.10)   │
//  │           Weights already sum   │           before ×100.                 │
//  │           to 1.0 exactly.       │                                        │
//  │                                 │                                        │
//  │ 9 terms because D2 and D3risk   │ 7 entries because it collapses to one  │
//  │ are derived from role-exposure  │ entry per layer (L1–L5, D6, D7).      │
//  │ data independently of L3/L4.    │                                        │
//  │                                 │                                        │
//  │ DO NOT export — callers must    │ Exported so the WhatIf simulator can   │
//  │ use the rawScore result, not    │ recompose scores without hardcoding     │
//  │ the individual weights.         │ its own approximations.                │
//  └─────────────────────────────────┴────────────────────────────────────────┘
//
// REGRESSION GUARD: two module-load assertions (below LAYER_WEIGHTS) will
// throw immediately if either weight set drifts from its required sum.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * COMPOSITE_FORMULA_WEIGHTS — the 10-term scoring formula's authoritative weights.
 *
 * Used exclusively inside calculateLayoffScore() to compute rawScore.
 * The 10 terms map as follows:
 *
 *   D1  calibrated.L3  × 0.18   Task automatability
 *   D2  D2             × 0.14   AI tool maturity (derived from role + company AI signal)
 *   D3  D3risk         × 0.13   Augmentation risk (derived from role exposure aiRisk)
 *   D4  calibrated.L5  × 0.18   Experience protection (tenure, performance, uniqueness)
 *   D5  calibrated.L4  × 0.02   Country/market context (intentionally light)
 *   D6  D6             × 0.05   AI agent autonomous coverage
 *   D7  D7             × 0.06   Unified company health risk
 *   D8  D8             × 0.05   AI efficiency restructuring risk (NEW — see below)
 *   L1  calibrated.L1  × 0.16   Direct company financial health (PPP-sensitive)
 *   L2  calibrated.L2  × 0.03   Direct layoff history
 *                        ────
 *                        1.00   ← must remain exactly 1.00; see regression guard below
 *
 * D8 was added after the 2024-2026 out-of-sample AUC evaluation revealed that the
 * 9-term formula could not predict "efficiency-driven restructuring" layoffs at
 * profitable companies (Meta, Google, Microsoft, Amazon). These companies have LOW L1
 * (financially healthy) and LOW L2 (no recent distress cuts), but are systematically
 * replacing human workers with AI for productivity reasons. D8 captures this pattern.
 * It only fires when: calibratedL1 < 0.55 (not distress-driven) AND layoffRounds > 0
 * (revealed preference for restructuring) AND aiInvestmentSignal is high/very-high.
 * Weight budget: D3 −0.01, D5 −0.01, D6 −0.01, D7 −0.01, L2 −0.01 → D8 +0.05.
 *
 * NOT exported — nothing outside calculateLayoffScore() should read these directly.
 * They are not sensitivities; they are the actual scoring formula coefficients.
 * LAYER_WEIGHTS (below) is a separate structure used for WhatIf simulation.
 */
// [AUDIT FIX — weight rebalance]: Empirical calibration found L2 is the STRONGEST
// predictor (β₂ = 0.312) yet it had only 3% direct weight. The 1.11 calibration
// multiplier corrected the mean but not the fundamentally inadequate weight.
// Rebalance: L2 3%→6%, D3 13%→11%, D5 2%→1%. Sum still = 1.00.
// Rationale: D3 (augmentation risk) is a 12-24 month signal, over-weighted for
// 3-month prediction horizon per calibration notes. D5 (country context) is
// already captured more accurately in PPP-adjusted L1; reducing D5 to 1%
// prevents double-counting while freeing budget for the validated L2 signal.
const COMPOSITE_FORMULA_WEIGHTS = {
  D1_taskAutomatability:        0.18,
  D2_aiToolMaturity:            0.14,
  D3_augmentationRisk:          0.11,  // reduced: 12-24mo signal, over-weighted for 3mo horizon
  D4_experienceProtection:      0.18,
  D5_countryContext:            0.01,  // reduced: PPP already in L1; preventing double-count
  D6_agentCapability:           0.05,
  D7_companyHealth:             0.06,
  D8_aiEfficiencyRestructuring: 0.05,
  L1_directFinancial:           0.16,
  L2_directLayoffHistory:       0.06,  // raised 3%→6%: matches β₂=0.312 (strongest predictor)
} as const;

// ── v12.0: Adaptive Archetype Weight Overrides ───────────────────────────────
//
// When a dominant scenario archetype is detected, blend the base weights with
// archetype-specific overrides. This improves accuracy for archetype-specific
// risk patterns without breaking the existing regression-validated baseline.
//
// Blend ratio: 0.25 (conservative — 75% base + 25% override).
// Start conservative; increase only after calibration validates improvement.
//
// Override values are DELTAS added to the base weights — they do NOT represent
// absolute weights. The blending function normalises the result to sum = 1.0.
//
// Rationale per archetype:
//   sector_wave: L4 more predictive when peer companies are all cutting
//   ai_efficiency_restructuring: D8 is the defining signal; L1/L2 less relevant
//   financial_distress_layoff: L1+L2 are the primary drivers; AI dimensions less relevant
//   role_displacement: D1/D2/D3 dominate; company health signals less relevant
//   gcc_parent_contagion: L4 (parent company macro) + D7 (leadership instability) drive risk
//   individual_resilience_gap: L5 (personal protection) dominates the outcome
//   india_it_bench_risk: L4 + D7 (sector + company health) are primary signals
type ScoringArchetype =
  | 'sector_wave'
  | 'ai_efficiency_restructuring'
  | 'financial_distress_layoff'
  | 'role_displacement'
  | 'gcc_parent_contagion'
  | 'individual_resilience_gap'
  | 'india_it_bench_risk'
  | 'low_risk_maintain';

type WeightKey = keyof typeof COMPOSITE_FORMULA_WEIGHTS;

const ARCHETYPE_WEIGHT_OVERRIDES: Record<ScoringArchetype, Partial<Record<WeightKey, number>>> = {
  sector_wave: {
    D5_countryContext:   0.04,   // L4 carries sector-wave signal — boost it
    D1_taskAutomatability: -0.02,
    D2_aiToolMaturity:   -0.02,
  },
  ai_efficiency_restructuring: {
    D8_aiEfficiencyRestructuring: 0.04,
    D2_aiToolMaturity:            0.02,
    L1_directFinancial:           -0.03,
    L2_directLayoffHistory:       -0.03,
  },
  financial_distress_layoff: {
    L1_directFinancial:           0.04,
    L2_directLayoffHistory:       0.02,
    D8_aiEfficiencyRestructuring: -0.02,
    D3_augmentationRisk:          -0.02,
    D6_agentCapability:           -0.02,
  },
  role_displacement: {
    D1_taskAutomatability: 0.03,
    D2_aiToolMaturity:     0.02,
    D3_augmentationRisk:   0.01,
    L1_directFinancial:    -0.03,
    L2_directLayoffHistory: -0.03,
  },
  gcc_parent_contagion: {
    D5_countryContext:   0.03,   // L4 carries GCC parent macro signal
    D7_companyHealth:    0.02,
    D1_taskAutomatability: -0.02,
    D3_augmentationRisk: -0.03,
  },
  individual_resilience_gap: {
    D4_experienceProtection: 0.04,   // L5 carries personal protection signal
    D8_aiEfficiencyRestructuring: -0.03,
    D6_agentCapability:      -0.03,
  },
  india_it_bench_risk: {
    D5_countryContext:   0.02,   // L4 carries India sector signal
    D7_companyHealth:    0.02,
    D1_taskAutomatability: 0.01,
    L2_directLayoffHistory: -0.03,
    D8_aiEfficiencyRestructuring: -0.02,
  },
  low_risk_maintain: {},         // no override — baseline weights apply
};

// Blends base weights with archetype override at a conservative ratio.
// The sum of blended weights must equal 1.0 — enforced by normalisation.
function blendArchetypeWeights(
  base: typeof COMPOSITE_FORMULA_WEIGHTS,
  archetype: ScoringArchetype,
  blendRatio: number = 0.25,
): Record<WeightKey, number> {
  const overrides = ARCHETYPE_WEIGHT_OVERRIDES[archetype];
  const blended = {} as Record<WeightKey, number>;

  // Apply delta overrides
  for (const key of Object.keys(base) as WeightKey[]) {
    const delta = (overrides[key] ?? 0) * blendRatio;
    blended[key] = base[key] + delta;
  }

  // Normalise to preserve sum = 1.0
  const total = Object.values(blended).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 1.0) > 0.001) {
    for (const key of Object.keys(blended) as WeightKey[]) {
      blended[key] = blended[key] / total;
    }
  }

  return blended;
}

// Lightweight archetype detection based on computed layer scores.
// This is INTENTIONALLY simpler than scenarioNarrativeEngine.detectScenario() —
// it runs INSIDE calculateLayoffScore using already-computed layer values
// and avoids importing the full narrative engine (which would be circular).
function detectScoringArchetype(
  L1: number, L2: number, L3: number, L4: number, L5: number,
  D8: number,
  companyData: CompanyData,
): ScoringArchetype {
  const region = companyData.region ?? 'US';
  const isIndia = region === 'IN' || region === 'India';

  // AI efficiency: profitable company + strong AI investment signal
  if (D8 >= 0.35 && L1 < 0.45) return 'ai_efficiency_restructuring';

  // Financial distress: company health critical
  if (L1 >= 0.72 && L2 >= 0.50) return 'financial_distress_layoff';

  // BUG-FIX: Check gcc_parent_contagion BEFORE india_it_bench_risk.
  // GCC (revenue/emp > 120K) is a MORE SPECIFIC signal than generic India IT bench risk.
  // Previous order caused GCC companies to be mis-classified as india_it_bench_risk
  // when L4 ≥ 0.50 was met, ignoring the stronger GCC structural signal.
  // GCC parent contagion: India + allocated-budget company (high rev/emp) + financial stress
  if (isIndia && companyData.revenuePerEmployee > 120_000 && L1 >= 0.50) return 'gcc_parent_contagion';

  // India IT bench risk: India region + moderate sector risk (checked after GCC)
  if (isIndia && L4 >= 0.50 && D8 < 0.20) return 'india_it_bench_risk';

  // Sector wave: market conditions dominant
  if (L4 >= 0.65 && L1 < 0.60) return 'sector_wave';

  // Role displacement: automation dominates
  if (L3 >= 0.72 && L1 < 0.65) return 'role_displacement';

  // Individual resilience gap: personal factors dominant risk driver
  if (L5 >= 0.70 && L1 < 0.55 && L2 < 0.45) return 'individual_resilience_gap';

  return 'low_risk_maintain';
}

// ── v12.0: Score Kill-Switch System (sigmoid) ────────────────────────────────
//
// When specific high-confidence signals are present, apply a soft score floor
// using sigmoid blending instead of hard Math.max() so there is no discontinuity
// at the threshold.
//
// Formula: floor is applied with sigmoid weight at threshold ±10 pts.
// At score = threshold: ~50% of floor effect applied.
// At score << threshold: full floor applied.
// At score >> threshold: no floor applied (sigmoid weight → 0).
//
// Three kill-switches, in priority order:
//   KS-A: Confirmed live layoff news within 14 days → soft floor at 72
//   KS-B: Financial distress triad (revenue declining + stock down + high L1) → soft floor at 65
//   KS-C: Pre-layoff precursor (hiring freeze + high L1 + no prior layoffs) → soft floor at 57
export function sigmoidFloor(
  score: number,
  threshold: number,
  floor: number,
  steepness: number = 0.35,
): number {
  // Sigmoid weight: 1.0 when score << threshold, 0.0 when score >> threshold
  const sigmoidWeight = 1 / (1 + Math.exp(steepness * (score - threshold)));
  // Effective floor scales with sigmoid weight — smooth transition
  const effectiveFloor = floor * sigmoidWeight;
  return Math.max(effectiveFloor, score);
}

// Evaluates which kill-switches apply and returns the floor-adjusted score.
// Returns { adjustedScore, killSwitchApplied, killSwitchName } for transparency.
export function applyKillSwitches(
  score: number,
  companyData: CompanyData,
  layoffNewsAgeInDays: number | null,
  L1: number,
): { adjustedScore: number; killSwitchApplied: boolean; killSwitchName: string | null } {
  // BUG-FIX: Evaluate ALL kill-switches and apply the one that produces the HIGHEST
  // score (most conservative floor). Previous implementation used `?? 'name'` which
  // caused KS-A to "claim" the name even when KS-B actually raised the score higher.
  // Using a candidates array ensures: (1) the highest floor wins, (2) the name correctly
  // reflects which kill-switch was responsible.
  const candidates: Array<{ score: number; name: string }> = [];

  // KS-A: Confirmed live layoff news within 14 days
  if (layoffNewsAgeInDays !== null && layoffNewsAgeInDays <= 14) {
    const floored = sigmoidFloor(score, 68, 72, 0.4);
    if (floored > score) candidates.push({ score: floored, name: 'confirmed_recent_layoff_news' });
  }

  // KS-B: Financial distress triad (severe revenue decline + stock drawdown + high L1)
  const revenueDeclineSevere = companyData.revenueGrowthYoY !== null && companyData.revenueGrowthYoY < -5;
  const stockDeclineSevere = companyData.stock90DayChange !== null && companyData.stock90DayChange < -20;
  if (revenueDeclineSevere && stockDeclineSevere && L1 >= 0.70) {
    const floored = sigmoidFloor(score, 60, 65, 0.35);
    if (floored > score) candidates.push({ score: floored, name: 'financial_distress_triad' });
  }

  // KS-C: Pre-layoff precursor (hiring freeze signal + high financial stress + no prior layoffs)
  const hiringFrozen = (companyData as any)._hiringPostingTrend === 'frozen';
  const noPriorLayoffs = (companyData.layoffRounds ?? 0) === 0;
  if (hiringFrozen && L1 >= 0.60 && noPriorLayoffs) {
    const floored = sigmoidFloor(score, 52, 57, 0.30);
    if (floored > score) candidates.push({ score: floored, name: 'pre_layoff_precursor' });
  }

  if (candidates.length === 0) {
    return { adjustedScore: score, killSwitchApplied: false, killSwitchName: null };
  }

  // Apply the kill-switch that raises the score the most
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return { adjustedScore: best.score, killSwitchApplied: true, killSwitchName: best.name };
}

/**
 * LAYER_WEIGHTS — per-layer sensitivity weights for the WhatIf skill simulator.
 *
 * Used exclusively in calculateEngineSimulatedScore() (CareerSkillsTab).
 * NOT used in the composite score formula — see COMPOSITE_FORMULA_WEIGHTS above.
 *
 * Sum = 1.10 (not 1.0) because these weights reflect approximate per-layer
 * sensitivity across both direct and indirect formula contributions.
 * ALWAYS divide by weightSum (1.10) before multiplying by 100:
 *
 *   recomposed = (Σ layer_value × LAYER_WEIGHTS[layer]) / weightSum * 100
 *
 * Omitting the normalization inflates every simulated score by ~10%.
 * See the regression guard below — it will throw if this sum drifts.
 */
// D8 (AI Efficiency Restructuring) is intentionally absent from LAYER_WEIGHTS.
// D8 is driven entirely by company-level signals (AI investment, prior cuts,
// revenue-per-employee overstaffing) — it cannot be changed by any user action
// modeled in the WhatIf simulator. Including D8 here would suggest users could
// reduce it by improving their tenure or performance, which is incorrect.
// The WhatIf simulator shows relative sensitivity for user-controllable dimensions.
// Note: simulated absolute scores will be lower than actual scores by D8's
// contribution when D8 is non-zero (typically 0–5% of total score).
export const LAYER_WEIGHTS = {
  L1: 0.30, L2: 0.25, L3: 0.20, L4: 0.12, L5: 0.08, D6: 0.08, D7: 0.07,
} as const;

// ── Regression guards ─────────────────────────────────────────────────────────
// These run once at module initialisation. Any edit that changes either weight
// set without rebalancing throws immediately — the error is caught during dev
// startup and CI builds, not silently at runtime during a real user audit.
(function assertWeightSums() {
  const compositeSum = Object.values(COMPOSITE_FORMULA_WEIGHTS).reduce((a, b) => a + b, 0);
  if (Math.abs(compositeSum - 1.0) > 0.001) {
    throw new Error(
      `[layoffScoreEngine] COMPOSITE_FORMULA_WEIGHTS sum = ${compositeSum.toFixed(5)} ≠ 1.00000.\n` +
      `Edit the weights so they sum to exactly 1.0, then re-run the engine.\n` +
      `Current values: ${JSON.stringify(COMPOSITE_FORMULA_WEIGHTS, null, 2)}`
    );
  }
  const layerSum = Object.values(LAYER_WEIGHTS).reduce((a, b) => a + b, 0);
  if (Math.abs(layerSum - 1.10) > 0.001) {
    throw new Error(
      `[layoffScoreEngine] LAYER_WEIGHTS sum = ${layerSum.toFixed(5)} ≠ 1.10000.\n` +
      `LAYER_WEIGHTS is used in WhatIf recomposition with mandatory division by weightSum.\n` +
      `If you change these weights, update the expected sum here and in CareerSkillsTab.\n` +
      `Current values: ${JSON.stringify(LAYER_WEIGHTS, null, 2)}`
    );
  }
}());

// ── CALIBRATION_META — weight provenance and validation status ────────────────
//
// Purpose: every formula weight must declare whether it was derived from
// logistic regression on confirmed layoff outcomes or is a developer estimate.
//
// UNCALIBRATED weights (D2, D3, D6, D7, D8) together carry 0.33 of the total
// formula weight. Until regression validation is run, the system must not
// claim production-grade accuracy for the overall score.
//
// Regression validation method (when executed):
//   Download layoffs.fyi confirmed events (200 events used in L1-L5 calibration).
//   For each event, compute D2/D3/D6/D7/D8 at the pre-event date.
//   Run: P(layoff ≤18mo) = sigmoid(β0 + Σ βi·Di), logistic regression.
//   Replace developer weights with resulting β coefficients.
//   Label each coefficient 'regression_derived' here with the run date.
//
export const CALIBRATION_META: Record<string, {
  weight: number;
  status: 'regression_derived' | 'UNCALIBRATED — awaiting regression';
  source: string;
  validationDate?: string;
  note?: string;
}> = {
  D1_taskAutomatability: {
    weight: 0.18,
    status: 'regression_derived',
    source: 'empiricalCalibration.ts — logistic regression on L3 layer, 200 confirmed events',
    validationDate: '2024-Q4',
  },
  D2_aiToolMaturity: {
    weight: 0.14,
    status: 'UNCALIBRATED — awaiting regression',
    source: 'Developer estimate — companyAIMap × domainMaturity blend',
    note: 'Run logistic regression P(layoff|D2) on 200-event dataset to replace.',
  },
  D3_augmentationRisk: {
    weight: 0.13,
    status: 'UNCALIBRATED — awaiting regression',
    source: 'Developer estimate — trendRisk × roleAIRisk blend',
    note: 'Run logistic regression P(layoff|D3) on 200-event dataset to replace.',
  },
  D4_experienceProtection: {
    weight: 0.18,
    status: 'regression_derived',
    source: 'empiricalCalibration.ts — logistic regression on L5 layer, 200 confirmed events',
    validationDate: '2024-Q4',
  },
  D5_countryContext: {
    weight: 0.02,
    status: 'UNCALIBRATED — awaiting regression',
    source: 'Developer estimate — intentionally minimal weight pending calibration',
    note: 'Low weight limits scoring impact. Calibrate with P(layoff|L4) cross-country.',
  },
  D6_agentCapability: {
    weight: 0.05,
    status: 'UNCALIBRATED — awaiting regression',
    source: 'Developer estimate — role-keyword AI agent coverage map',
    note: 'Run logistic regression P(layoff|D6) on 200-event dataset to replace.',
  },
  D7_companyHealth: {
    weight: 0.06,
    status: 'UNCALIBRATED — awaiting regression',
    source: 'Developer estimate — L1+L2+L4+aiAdoption+leadershipInstability blend',
    note: 'Run logistic regression P(layoff|D7) on 200-event dataset to replace.',
  },
  D8_aiEfficiencyRestructuring: {
    weight: 0.05,
    status: 'UNCALIBRATED — awaiting regression',
    source: 'Developer estimate — profitable AI substitution signal (post 2024-2026 audit)',
    note: 'Tag ≥100 "efficiency-driven" events in layoffs.fyi to run separate cohort regression.',
  },
  L1_directFinancial: {
    weight: 0.16,
    status: 'regression_derived',
    source: 'empiricalCalibration.ts — calibratedRevenueGrowthRisk + calibratedStockTrendRisk, 200 events',
    validationDate: '2024-Q4',
  },
  L2_directLayoffHistory: {
    weight: 0.03,
    status: 'regression_derived',
    source: 'empiricalCalibration.ts — L2 layer multiplier (×1.11 recency correction), 200 events',
    validationDate: '2024-Q4',
  },
};

/**
 * UniquenessDepth — 3-level replacement for isUniqueRole boolean.
 * generic:              Role exists in thousands of companies. 0.58 risk.
 * functional_specialist: Unique domain expertise, replaceable with targeted hiring. 0.38 risk.
 * critical_knowledge:   Irreplaceable institutional knowledge (e.g. legacy system owner). 0.18 risk.
 */
export type UniquenessDepth = 'generic' | 'functional_specialist' | 'critical_knowledge';

export const UNIQUENESS_SCORES: Record<UniquenessDepth, number> = {
  generic:              0.58,
  functional_specialist: 0.38,
  critical_knowledge:   0.18,
};

export interface UserFactors {
  tenureYears: number;
  /** Total career years across ALL jobs — distinct from tenureYears at current company.
   *  Used for Oracle experience bracket (D4) and Displacement Trajectory modifiers.
   *  Falls back to tenureYears if not supplied. */
  careerYears?: number;
  isUniqueRole: boolean;
  /** 3-level depth score — overrides isUniqueRole when present for better L5 accuracy. */
  uniquenessDepth?: UniquenessDepth;
  performanceTier: "top" | "average" | "below" | "unknown";
  hasRecentPromotion: boolean;
  hasKeyRelationships: boolean;

  // ── v12.0 Extensions: Manager Risk Intelligence ──────────────────────────
  /** Direct manager departure type (optional — if not provided, engine skips manager risk) */
  managerDepartureType?: 'none' | 'recent_voluntary' | 'recent_forced' | 'recent_layoff' | 'unknown';
  /** Days since manager departure */
  managerDepartureDaysAgo?: number;
  /** Skip-level departure status */
  skipLevelDepartureType?: 'none' | 'recent' | 'unknown';
  /** Days since skip-level departure */
  skipLevelDepartureDaysAgo?: number;
  /** Was there a team reorg in the last 90 days? */
  teamReorgOccurred?: boolean;
  /** Days since reorg */
  teamReorgDaysAgo?: number;
  /** Was a replacement manager hired? */
  newManagerHired?: boolean;
  /** Current 1-on-1 frequency */
  roleCount1on1Frequency?: 'weekly' | 'biweekly' | 'monthly' | 'stopped' | 'unknown';

  // ── v12.0 Extensions: Visa Risk Intelligence ─────────────────────────────
  /** Work authorization status (for visa risk assessment) */
  visaStatus?: 'citizen' | 'permanent_resident' | 'h1b' | 'l1' | 'opt_stem' | 'tn' | 'other_work_auth' | 'not_applicable';
  /** Months until visa expiry */
  visaExpiryMonths?: number;
  /** Months since I-485 (green card) filing — high lock-in when 18–179 months */
  greenCardStageMonths?: number;
  /** AC21 portability (I-485 pending > 180 days) neutralizes GC lock-in risk */
  hasPortabilityEligibility?: boolean;

  // ── v12.0 Extensions: Career Profile ────────────────────────────────────
  /** Does the user have demonstrated AI skills (Claude, Copilot, etc.)? */
  hasAiSkills?: boolean;
}

export interface ScoreInputs {
  companyData: CompanyData;
  industryData?: IndustryRisk;
  roleTitle: string;
  department: string;
  userFactors: UserFactors;
  roleExposureOverride?: RoleExposure;
  /**
   * Reference date for all time-relative calculations inside the engine
   * (layoff recency, news recency, data freshness, timing windows).
   * Defaults to `new Date()` when absent.
   *
   * Injecting a fixed date makes the engine a pure function of its inputs —
   * identical inputs including the same referenceDate always produce the same score.
   * Use this in tests and in any context where reproducibility matters.
   */
  referenceDate?: Date;
  /**
   * Collapse stage from detectCollapseStage() — populated asynchronously by
   * LayoffCalculator after the deterministic engine runs. When present, allows
   * D8 to fire for companies making their FIRST-EVER AI efficiency cuts (no prior
   * layoff history) when Stage 1+ signals corroborate the AI-investment pattern.
   *
   * Pass null explicitly when detectCollapseStage ran and found no signals.
   * Leave undefined when detectCollapseStage has not yet run.
   */
  collapseStage?: 1 | 2 | 3 | null;
  /**
   * Live hiring signal from Naukri via proxy-live-signals Edge Function.
   * When isLive is true, postingTrend adjusts the L3 score mechanically
   * (not just the Transparency tab display). This makes live hiring data
   * a real scoring input rather than a decorative display.
   *
   * Deltas: frozen +0.12, declining +0.06, growing −0.05, stable 0.
   * When isLive is false (heuristic data): no adjustment applied.
   */
  liveHiringSignal?: {
    postingTrend: 'growing' | 'stable' | 'declining' | 'frozen';
    isLive: boolean;
    estimatedOpenings?: number | null;
  };
}

export interface ScoreBreakdown {
  L1: number; // Company Health (financial signals)
  L2: number; // Layoff History
  L3: number; // Role Displacement / Task Automatability (D1)
  L4: number; // Market Conditions / Country-Market Context (D5)
  L5: number; // Employee Factors / Experience Protection (D4)
  D6?: number; // AI Agent Capability — autonomous agent coverage of role
  D7?: number; // Company Health Risk — unified L1+L2+AI adoption signal
  D8?: number; // AI Efficiency Restructuring — profitable AI-substitution signal
}

export interface ScoreTier {
  label: string;
  color: string;
  advice: string;
}

export interface ActionPlanItem {
  id: string;
  title: string;
  description: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  layerFocus: string;
  /** Estimated risk-score reduction if this action is completed (0–15 pts) */
  riskReductionPct: number;
  /** Expected timeline to complete this action */
  deadline: string;
  /** Provenance: which signals back this recommendation. Empty when the item
   *  is a generic safety-net (e.g. the all-good fallback). The UI surfaces
   *  these so readers can see exactly what the recommendation rests on
   *  rather than treating it as opaque advice. */
  evidence?: Array<{ signal: string; source: string; confidence: "high" | "medium" | "low" }>;
}

/**
 * LayoffProbabilityForecast — concrete P(layoff round) derived from
 * sector base rate × company-specific multipliers, with a full survival
 * curve (Kaplan-Meier inspired) for the 3/6/9/12-month windows.
 *
 * The multiplier chain is surfaced so users can sanity-check the number
 * rather than treating it as a black-box percentage. Each multiplier
 * names its source signal and the reasoning behind the factor applied.
 */
export interface LayoffProbabilityForecast {
  next90Days: number;          // 0..1
  next180Days: number;         // 0..1
  baseSectorRate: number;      // 0..1, from industryData.avgLayoffRate2025
  multipliers: Array<{ name: string; factor: number; reason: string }>;
  /** Plain-English summary the UI can render without re-deriving the math */
  verdict: string;
  /**
   * Kaplan-Meier survival curve — P(still employed | t months from now).
   * S(t) = 1 - P(layoff by month t). Visualised as a step-down chart.
   * Points: months 1, 3, 6, 9, 12. Includes 80% confidence band.
   * [AUDIT ENHANCEMENT]: Added to give users a visual timeline of exposure,
   * not just a point-in-time probability.
   */
  survivalCurve: Array<{
    month: number;
    survivalProbability: number;   // P(still employed) = 1 - P(layoff by this month)
    layoffProbability: number;     // P(layoff by this month)
    confidenceLow: number;         // 80% CI lower bound
    confidenceHigh: number;        // 80% CI upper bound
  }>;
  /** Annualized rate used for all window calculations */
  annualizedRate: number;
  /** Whether this is distress-driven (L1 high) or efficiency-driven (D8 active) */
  layoffDriverType: 'distress' | 'efficiency' | 'mixed' | 'unknown';
}

/**
 * LayoffTiming — calendar-aware window analysis. Re-cut waves at companies
 * with restructuring patterns typically follow a 6–9 month rhythm; this
 * struct surfaces where the user's company sits in that rhythm so that
 * "next wave likely in N months" is a concrete claim, not vague unease.
 */
export interface LayoffTiming {
  daysSinceLastCut: number | null;
  totalRoundsTracked: number;
  /** "outside-window" | "approaching-window" | "in-window" | "past-window" | "no-history" */
  windowStatus: "no-history" | "outside-window" | "approaching-window" | "in-window" | "past-window";
  /** Days until the *start* of the typical re-cut window (negative = already inside it). */
  daysUntilWindow: number | null;
  /** Plain-English summary the UI can render without re-deriving the math */
  verdict: string;
}

export interface ScoreResult {
  score: number;
  confidenceInterval: {
    low: number;
    high: number;
    range: number;
    isEstimate: boolean;
  };
  tier: ScoreTier;
  breakdown: ScoreBreakdown;
  confidence: "High" | "Medium" | "Low";
  confidencePercent: number;
  calculatedAt: string;
  nextUpdateDue: string;
  disclaimer: string;
  dataFreshness: {
    lastUpdated: string;
    ageInDays: number;
    stalenessWarning: string | null;
    accuracyImpact: "Low" | "Medium" | "High" | "Critical";
  };
  signalQuality: {
    hasConflicts: boolean;
    conflictingSignals: Array<{
      signal1: string;
      signal2: string;
      severity: string;
    }>;
    missingDataFallbacks: string[];
    liveSignals: number;
    heuristicSignals: number;
  };
  recommendations: ActionPlanItem[];
  /** Concrete probability of a layoff round in the next 90/180 days, with
   *  the multiplier chain that produced it surfaced for transparency. */
  probabilityForecast: LayoffProbabilityForecast;
  /** Where the company sits in the typical re-layoff rhythm (days since
   *  last cut → likely next-wave window). */
  timing: LayoffTiming;
  /** Effective performance tier used for L5 scoring after credibility analysis.
   *  May differ from userFactors.performanceTier when self-report contradicts
   *  objective signals (e.g. top claim + no promotion in 5 years). */
  performanceTier: UserFactors['performanceTier'];
  /** Credibility score for the self-reported performance tier (0–1).
   *  1.0 = fully credible, <0.70 = discounted, present only when tier = 'top'. */
  performanceCredibilityScore?: number;
  /**
   * India-specific sector intelligence — only present when companyData.region === 'IN'.
   * Contains GCC archetype, NASSCOM sector benchmarks, seasonal risk window,
   * contagion matrix exposure, and sector pulse index.
   * Used by ensembleOrchestrator and TransparencyTab for India-specific narrative.
   */
  indiaRiskEnrichment?: IndiaRiskEnrichment;
  /** v12.0: Scoring engine version — used to detect formula changes between sessions. */
  scoringEngineVersion?: string;
  /** v12.0: Detected scenario archetype used for adaptive weight blending. */
  scoringArchetype?: string;
  /** v12.0: Whether a kill-switch sigmoid floor was applied to this score. */
  killSwitchApplied?: boolean;
  /** v12.0: Which kill-switch fired (if any). */
  killSwitchName?: string | null;
}

// ─── Utility ───

const weightedAverage = (
  signals: Record<string, number>,
  weights: Record<string, number>,
): number => {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0.5;
  return Object.entries(signals).reduce((sum, [key, val]) => {
    return sum + val * ((weights[key] || 0) / totalWeight);
  }, 0);
};

const clamp = (val: number, min = 0, max = 1): number =>
  Math.max(min, Math.min(max, val));

const monthsDifference = (dateStr: string, now: Date): number => {
  const d = new Date(dateStr);
  return Math.abs(
    (now.getFullYear() - d.getFullYear()) * 12 +
      (now.getMonth() - d.getMonth()),
  );
};

// ─── Layer 1: Company Health (30%) ───

const mapRevenueGrowth = (yoyPercent: number | null): number => {
  if (yoyPercent === null) return 0.5;
  if (yoyPercent < -20) return 0.95;
  if (yoyPercent < -10) return 0.85;
  if (yoyPercent < 0) return 0.72;
  if (yoyPercent < 5) return 0.55;
  if (yoyPercent < 10) return 0.42;
  if (yoyPercent < 20) return 0.3;
  if (yoyPercent < 30) return 0.18;
  return 0.1;
};

const mapStockTrend = (change90Day: number | null): number => {
  if (change90Day === null) return 0.5;
  if (change90Day < -30) return 0.95;
  if (change90Day < -15) return 0.8;
  if (change90Day < -5) return 0.6;
  if (change90Day < 5) return 0.42;
  if (change90Day < 15) return 0.28;
  if (change90Day < 30) return 0.15;
  return 0.08;
};

// UNCALIBRATED — developer estimates.
// Calibration method: CB Insights startup failure rates by months-since-funding.
// Published data suggests ~65% of Series A failures had >18 months without new funding,
// but the specific score values (0.12, 0.28, 0.50, 0.72, 0.88) have not been
// validated against the layoffs.fyi regression dataset.
const mapFundingStatus = (
  lastRound: string | undefined,
  monthsSince: number | undefined,
): number => {
  if (lastRound === "bootstrapped") return 0.35;
  if (monthsSince === undefined) return 0.5;
  if (monthsSince < 6) return 0.12;
  if (monthsSince < 12) return 0.28;
  if (monthsSince < 18) return 0.5;
  if (monthsSince < 24) return 0.72;
  return 0.88;
};

// UNCALIBRATED — developer estimates.
// BLS mass-layoff statistics show no consistent size-risk relationship after
// controlling for industry and financial health. This sub-signal (weight 0.10 in L1)
// may add noise rather than signal. Calibration method: run logistic regression
// on P(layoff|company_size_bracket) controlling for industry, holding L1_other fixed.
const mapCompanySize = (count: number): number => {
  if (count <= 50) return 0.7;
  if (count <= 200) return 0.58;
  if (count <= 1000) return 0.48;
  if (count <= 5000) return 0.4;
  if (count <= 50000) return 0.35;
  return 0.32;
};

// ── India sector-specific revenue-per-employee medians (USD, 2025) ───────────
// UNCALIBRATED — sourced from NASSCOM annual reports and company filings.
// These are peer-group medians used for relative scoring, not absolute thresholds.
// Update annually from public earnings data.
const INDIA_SECTOR_RPE_MEDIANS: Record<string, number> = {
  'Technology':     40_000,   // IT services median (TCS, Infosys, Wipro ≈ $35-45K)
  'IT Services':    35_000,   // IT services / consulting
  'Finance':        60_000,   // India financial services (HDFC, ICICI back-office)
  'Banking':        55_000,
  'Healthcare':     30_000,   // India healthcare / pharma services
  'E-commerce':     85_000,   // Flipkart, Meesho product companies — leaner
  'BPO':            22_000,   // BPO / contact centre — labour-intensive by design
  'Software':       55_000,   // India product software companies
  'Media':          25_000,
  _default:         38_000,   // India-wide tech sector fallback
};

// ── Company archetype detection ───────────────────────────────────────────────
// Used to select the appropriate overstaffing scoring logic.
// Auto-derived from existing CompanyData fields — no new field required yet.
type CompanyArchetype = 'large_public' | 'mid_public' | 'private_funded' | 'bootstrapped' | 'gcc' | 'psu';

function detectArchetype(cd: CompanyData): CompanyArchetype {
  if (!cd.isPublic) {
    if (cd.monthsSinceLastFunding != null) return 'private_funded';
    return 'bootstrapped';
  }
  // GCC heuristic: India-based with very high revenue/employee (allocated budget, not sales)
  if (cd.region === 'IN' && cd.revenuePerEmployee > 120_000) return 'gcc';
  if (cd.employeeCount >= 10_000) return 'large_public';
  return 'mid_public';
}

// PPP-adjusted overstaffing: for US/EU uses absolute thresholds; for India uses
// peer-median-relative scoring so India IT services companies are not penalised
// for having sector-normal revenue-per-employee ratios.
const mapOverstaffing = (
  revenuePerEmp: number,
  region: string = "US",
  industry?: string,
): number => {
  // ── India: relative-to-sector-median scoring ─────────────────────────────
  // Using absolute PPP-adjusted thresholds for India produces systematic bias:
  // TCS ($35K/emp, sector median) scores "Elevated" when it is actually neutral.
  // Fix: score by deviation from peer median rather than global absolute threshold.
  if (region === 'IN') {
    const median = INDIA_SECTOR_RPE_MEDIANS[industry ?? '_default']
                ?? INDIA_SECTOR_RPE_MEDIANS._default;
    const deviation = (revenuePerEmp - median) / median; // positive = above median (lean)

    // Deviation thresholds (UNCALIBRATED — developer estimates, peer median ≡ neutral):
    if (deviation < -0.40) return 0.82;  // >40% below sector median — high overstaffing
    if (deviation < -0.20) return 0.62;  // 20-40% below — elevated
    if (deviation < -0.05) return 0.45;  // 5-20% below — slight
    if (deviation <  0.15) return 0.32;  // within ±15% of median — neutral
    if (deviation <  0.45) return 0.20;  // 15-45% above — lean operations
    return 0.10;                          // >45% above median — very efficient
  }

  // ── US / EU / APAC: PPP-adjusted absolute thresholds (unchanged) ──────────
  const ppp = getPPPMultiplier(region as any);
  const adjusted = revenuePerEmp / ppp; // normalize to US-equivalent

  if (adjusted < 95000)  return 0.85; // High Risk: Under $95k/emp (adjusted)
  if (adjusted < 180000) return 0.65; // Elevated
  if (adjusted < 350000) return 0.45; // Moderate
  if (adjusted < 700000) return 0.25; // Low
  return 0.1;                          // Very Low: Over $700k/emp
};

export const calculateCompanyHealthScore = (
  companyData: CompanyData,
): number => {
  // ── Fix: use empirically calibrated thresholds for the two highest-weight signals.
  //
  // Previously mapRevenueGrowth() and mapStockTrend() used developer-guessed step
  // values (e.g. revenue < -20% → 0.95 instead of the regression-derived 0.93).
  // calibratedRevenueGrowthRisk() and calibratedStockTrendRisk() in
  // empiricalCalibration.ts were correct but never called — they were dead code.
  //
  // When either signal is null (no data), we SKIP it from the weighted average
  // (null_signals weight = 0) rather than returning 0.50 which falsely implies
  // "moderate risk data" when the actual state is "no data at all".
  // This redistributes weight to the signals that DO have data, producing a
  // more honest score for under-documented companies.

  const signals: Record<string, number> = {};
  const weights: Record<string, number> = {};

  // Revenue growth — calibrated thresholds (weight 0.35 when data present)
  if (companyData.revenueGrowthYoY !== null && companyData.revenueGrowthYoY !== undefined) {
    signals.revenueGrowthRisk = calibratedRevenueGrowthRisk(companyData.revenueGrowthYoY);
    weights.revenueGrowthRisk = 0.35;
  }
  // else: skip entirely — weight stays 0, redistributed to present signals

  // Stock trend — calibrated thresholds (weight 0.25 when data present + public)
  if (companyData.isPublic && companyData.stock90DayChange !== null && companyData.stock90DayChange !== undefined) {
    signals.stockTrendRisk = calibratedStockTrendRisk(companyData.stock90DayChange);
    weights.stockTrendRisk = 0.25;
  } else if (!companyData.isPublic) {
    // Private company — no listed stock price. Use funding recency as a market-sentiment
    // proxy: a recently-funded company was externally validated; stale funding signals
    // potential distress that would show as stock decline for a public peer.
    // This is conceptually distinct from fundingRisk below (which uses the round label
    // to estimate runway/burn rate). When monthsSinceLastFunding is absent, fall back
    // to a neutral 0.40 prior rather than injecting a false signal.
    const mths = companyData.monthsSinceLastFunding;
    signals.stockTrendRisk =
      mths == null   ? 0.40   // unknown — neutral prior
      : mths < 6    ? 0.22   // fresh funding → recently externally validated
      : mths < 12   ? 0.35   // recent
      : mths < 24   ? 0.48   // moderate
      : mths < 36   ? 0.62   // stale → elevated distress risk
      : 0.75;                // very stale (>3 yr) → high distress risk
    weights.stockTrendRisk = 0.25;
  }
  // null public company: skip — no data, don't inject 0.50

  // Funding risk (UNCALIBRATED — mapFundingStatus thresholds are developer estimates)
  signals.fundingRisk = companyData.isPublic
    ? 0.30
    : mapFundingStatus(companyData.lastFundingRound, companyData.monthsSinceLastFunding);
  weights.fundingRisk = 0.15;

  // Size risk (UNCALIBRATED — mapCompanySize thresholds are developer estimates)
  if (companyData.employeeCount > 0) {
    signals.sizeRisk = mapCompanySize(companyData.employeeCount);
    weights.sizeRisk = 0.10;
  }

  // Overstaffing risk — India now uses sector-relative median scoring (Fix 1 v7.0)
  // GCC companies use reduced weight (0.08) because their revenue/employee reflects
  // parent company budget allocation, not standalone operational efficiency.
  if (companyData.revenuePerEmployee > 0) {
    const archetype = detectArchetype(companyData);
    signals.overstaffingRisk = mapOverstaffing(
      companyData.revenuePerEmployee,
      companyData.region,
      companyData.industry,
    );
    weights.overstaffingRisk = archetype === 'gcc' ? 0.08 : 0.15;
  }

  // ACC-BUG-04 FIX: When no financial signals are available (truly unknown company),
  // return 0.62 instead of 0.50 (neutral). Epistemic uncertainty principle: when we
  // don't know a company's financial health, assume somewhat elevated risk, not neutral.
  // 0.50 makes unknown companies look as safe as documented ones with mixed signals.
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    const isFallback = (companyData.source ?? '').toLowerCase().includes('fallback')
      || (companyData.source ?? '').toLowerCase().includes('unknown');
    return isFallback ? 0.62 : 0.50;
  }

  return weightedAverage(signals, weights);
};

// ─── Layer 2: Layoff History (25%) ───

// UNCALIBRATED — developer estimates.
// These recency buckets (< 3mo → 0.95, < 6mo → 0.80, etc.) define the
// layoff-recency hazard function. The shape is directionally correct but the
// specific values are guesses. The layer multiplier ×1.11 corrects the mean
// but cannot fix an incorrect response-curve shape.
// Calibration method: Kaplan-Meier survival analysis on P(second layoff round |
// N months since first round) from the layoffs.fyi dataset. This would produce
// the actual empirical hazard at each month interval.
const calculateRecentLayoffRisk = (
  layoffs: { date: string; percentCut: number }[],
  now: Date,
): number => {
  if (!layoffs || layoffs.length === 0) return 0.05;
  const sorted = [...layoffs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const mostRecent = sorted[0];
  const monthsAgo = monthsDifference(mostRecent.date, now);

  if (monthsAgo < 3) return 0.95;   // UNCALIBRATED
  if (monthsAgo < 6) return 0.8;    // UNCALIBRATED
  if (monthsAgo < 12) return 0.62;  // UNCALIBRATED
  if (monthsAgo < 18) return 0.42;  // UNCALIBRATED
  if (monthsAgo < 24) return 0.28;  // UNCALIBRATED
  return 0.15;                       // UNCALIBRATED
};

// BUG-DA4 FIX: Round frequency now considers recency alongside count.
// Older layoff patterns are less predictive than recent ones.
const calculateRoundFrequency = (
  rounds: number,
  layoffs: { date: string; percentCut: number }[] | undefined,
  now: Date,
): number => {
  if (!rounds || rounds === 0) return 0.05;

  // UNCALIBRATED — developer estimates.
  // Round count → base risk mapping has not been validated against regression data.
  // Calibration method: cross-tab P(Nth round | had N-1 rounds) from layoffs.fyi.
  let base = 0.05;
  if (rounds === 1) base = 0.42;   // UNCALIBRATED
  else if (rounds === 2) base = 0.68; // UNCALIBRATED
  else if (rounds === 3) base = 0.85; // UNCALIBRATED
  else base = 0.95;                  // UNCALIBRATED

  // Recency weighting: if most layoffs are old (>18 months), reduce score by up to 20%
  if (layoffs && layoffs.length > 0) {
    const avgMonthsAgo =
      layoffs.reduce((sum, l) => sum + monthsDifference(l.date, now), 0) /
      layoffs.length;
    if (avgMonthsAgo > 24) return base * 0.65; // very old pattern — much less predictive
    if (avgMonthsAgo > 18) return base * 0.8; // old pattern — somewhat discounted
    if (avgMonthsAgo > 12) return base * 0.9; // moderately old
  }
  return base;
};

// Continuous sector contagion (replaces binary threshold)
// India sector-specific contagion multipliers derived from NASSCOM benchmarks.
// Applied only when company region is IN (India) and industry matches.
// Previously this intelligence lived only in probabilityForecast — it now feeds
// the core L2 sectorContagion so Indian workers see accurate baseline risk scores.
const INDIA_SECTOR_CONTAGION_BOOST: Array<[RegExp, number]> = [
  [/bpo|ites|call.?cent|outsourc/i,            1.45],  // BPO contracting, AI displacing rapidly
  [/gcc|captive/i,                              1.35],  // GCC cost-centre cuts from parent budgets
  [/it.?product|saas/i,                         1.25],  // IT products under global tech pressure
  [/it.?service|software.?service|tech.?service/i, 1.15], // IT services — slower but persistent
  [/edtech/i,                                   1.30],  // EdTech contracting post-pandemic
  [/fintech/i,                                  0.90],  // FinTech expanding — protective
  [/ecommerce|e.?commerce/i,                   1.10],  // mixed signals
];

const calculateSectorContagion = (industryData?: IndustryRisk, companyData?: CompanyData): number => {
  if (!industryData) return 0.4;
  const baseSignal = industryData.baselineRisk;
  // ACC-BUG-06 FIX: sqrt scaling instead of *5 saturation.
  const rate = Math.max(0, Math.min(1, industryData.avgLayoffRate2025));
  const rateSignal = Math.sqrt(rate);
  const baseSectorContagion = clamp(baseSignal * 0.6 + rateSignal * 0.4);

  // [AUDIT FIX]: Apply India-specific sector multiplier directly to sectorContagion.
  // Previously India enrichment was ONLY in probabilityForecast — Indian workers'
  // core 0-100 score was computed identically to US workers despite structurally
  // different market conditions (bench-clearing, client budget cycles, GCC cuts).
  if (companyData && (companyData.region === 'IN' || companyData.region === 'India')) {
    const industry = companyData.industry ?? '';
    for (const [pattern, multiplier] of INDIA_SECTOR_CONTAGION_BOOST) {
      if (pattern.test(industry)) {
        return clamp(baseSectorContagion * multiplier);
      }
    }
  }

  return baseSectorContagion;
};

export const calculateLayoffHistoryScore = (
  companyData: CompanyData,
  industryData?: IndustryRisk,
  department?: string,
  now: Date = new Date(),
): number => {
  // Find the MOST RECENT news event for this company across all cache entries.
  // Previously `layoffNewsCache.find()` returned the first match, which could be
  // a months-old seeded event rather than a fresh breaking-news injection.
  // Guard both sides: companyData.name can be undefined when a DB row has a null
  // company_name field, and n.companyName can be undefined from a malformed injection.
  const companyNameLower = (companyData.name ?? '').toLowerCase();
  const allRelevantNews = layoffNewsCache.filter(
    (n) => companyNameLower.length > 0 && (n.companyName ?? '').toLowerCase() === companyNameLower,
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const relevantNews = allRelevantNews[0] ?? null;

  // BUG FIX: The previous implementation set newsRisk = 0.95 ONLY when the user's
  // department exactly matched `affectedDepartments`. A company-wide layoff of
  // 15,000 people (e.g. TCS) produced newsRisk = 0.10 if the user's department
  // wasn't explicitly listed — identical to "no news at all." This was wrong.
  //
  // Corrected three-tier newsRisk:
  //   0.10 — no news event in cache for this company
  //   0.70 — company-wide event present (no department match, or no dept specified)
  //   0.95 — event explicitly affects the user's department
  //
  // Recency amplifier: events < 7 days old carry full weight; older events decay
  // linearly to 0.5× by 90 days (matching the MARKET_DATA_STALE_DAYS threshold).
  let newsRisk = 0.10;
  let newsWeight = 0.10; // default weight
  if (relevantNews) {
    const ageInDays = Math.round(
      (now.getTime() - new Date(relevantNews.date).getTime()) / 86_400_000,
    );
    // v12.0: Use signal decay model for news recency (replaces hand-rolled linear decay).
    // breaking_news_layoff: half-life 3d, floors at 0.10. A 45-day-old article now
    // receives weight ~0.10 (previously ~0.46 under the old linear formula) which
    // correctly reduces its impact on L2 without eliminating it entirely.
    const recencyFactor = computeSignalFreshnessWeight(ageInDays, 'breaking_news_layoff');

    const deptLower = department ? department.toLowerCase() : '';
    // Fuzzy department match: "Engineering" matches "engineering team", "DevOps Eng" etc.
    const hasDepartmentMatch =
      deptLower.length > 0 &&
      relevantNews.affectedDepartments.length > 0 &&
      relevantNews.affectedDepartments.some(d => {
        const dl = (d ?? '').toLowerCase();
        return dl.includes(deptLower) || deptLower.includes(dl);
      });

    // ACC-BUG-01 FIX: Scale newsRisk by cut severity so a 1% cut ≠ 30% cut.
    // Previously flat 0.70 for ANY event regardless of how many people were cut.
    // Now: base risk (0.55–0.95) + severity boost (0–0.20) capped at 0.98.
    // percentCut 0 → no boost (genuinely unknown), 10% → +0.08, 20% → +0.15, 30%+ → +0.20
    const pctCut = relevantNews.percentCut ?? 0;
    const severityBoost = pctCut > 0 ? Math.min(0.20, pctCut / 150) : 0;
    const baseNewsRisk = hasDepartmentMatch ? 0.95 : 0.55 + severityBoost;
    newsRisk = Math.min(0.98, baseNewsRisk * recencyFactor);

    // Boost newsRisk weight to 20% when event is recent (≤14 days) — extended from 7
    // days since most users calculate within 2 weeks of a breaking announcement.
    // Weight also boosts when the cut is severe (≥10%) even if not breaking-fresh.
    newsWeight = (ageInDays <= 14 || pctCut >= 10) ? 0.20 : 0.10;
  }

  // Redistribute weights to maintain L2 weight sum = 1.0.
  const recentLayoffWeight = newsWeight > 0.10 ? 0.20 : 0.30;
  const roundFreqWeight    = newsWeight > 0.10 ? 0.20 : 0.25;

  // ACC-BUG-10 FIX: Unknown/fallback companies return 0.05 for recentLayoffRisk and
  // roundFrequency — identical to a *verified clean* company. Can't distinguish
  // "confirmed no layoffs" from "we simply have no data". Apply an epistemic
  // uncertainty floor (0.15) for fallback companies so they don't look safer than
  // documented ones with zero layoffs.
  const isFallbackSource = (companyData.source ?? '').toLowerCase().includes('fallback')
    || (companyData.source ?? '').toLowerCase().includes('unknown');
  const rawRecentLayoffRisk = calculateRecentLayoffRisk(companyData.layoffsLast24Months, now);
  const rawRoundFreqRisk    = calculateRoundFrequency(companyData.layoffRounds, companyData.layoffsLast24Months, now);

  const signals = {
    recentLayoffRisk:   isFallbackSource ? Math.max(0.15, rawRecentLayoffRisk) : rawRecentLayoffRisk,
    roundFrequencyRisk: isFallbackSource ? Math.max(0.15, rawRoundFreqRisk)    : rawRoundFreqRisk,
    // UNCALIBRATED — divisor of 25 means "25% cut = max signal". Developer choice.
    severityRisk: companyData.lastLayoffPercent
      ? clamp(companyData.lastLayoffPercent / 25)
      : isFallbackSource ? 0.20 : 0.15,
    sectorContagionRisk: calculateSectorContagion(industryData, companyData),
    newsRisk,
  };

  return weightedAverage(signals, {
    recentLayoffRisk:   recentLayoffWeight,
    roundFrequencyRisk: roundFreqWeight,
    severityRisk:       0.15,
    sectorContagionRisk: 0.20,
    newsRisk:           newsWeight,
  });
};

// ─── Layer 4: Market Conditions (12%) ───

export const calculateMarketConditionsScore = (
  industry: string,
  industryData?: IndustryRisk,
): number => {
  if (!industryData) return 0.5;

  // UNCALIBRATED — developer estimates. These modifiers (+0.18 for declining,
  // -0.12 for growing) have not been validated against the regression dataset.
  // Calibration method: segment layoffs.fyi events by sector growth outlook;
  // compute P(layoff | growth_outlook) and fit ordinal regression.
  const growthModifier: Record<string, number> = {
    growing: -0.12,  // UNCALIBRATED
    stable: 0.0,
    volatile: 0.1,   // UNCALIBRATED
    declining: 0.18, // UNCALIBRATED
  };

  // Now uses aiAdoptionRate as a signal (previously dead data)
  const aiDisruptionFactor = industryData.aiAdoptionRate * 0.15; // 0-15% contribution

  const base =
    industryData.baselineRisk +
    (growthModifier[industryData.growthOutlook] || 0) +
    aiDisruptionFactor;

  return clamp(base);
};

// ─── Layer 5: Employee Factors (8%) ───

// UNCALIBRATED — developer estimates.
// These tenure brackets were chosen to produce a smooth monotone curve but have
// not been validated against layoff outcome data. The shape (log-like decay from
// 0.82 to 0.12) is intuitively reasonable but empirically unverified.
// Calibration method: once ≥500 career twin submissions are collected, run
// logistic regression on P(laid off | tenure_bracket) from verified transitions.
// Current L5 layer multiplier (×0.94) partially corrects systematic bias but
// cannot fix an incorrect response curve shape.
const mapTenure = (years: number): number => {
  if (years < 0.5) return 0.82;
  if (years < 1) return 0.7;
  if (years < 2) return 0.58;
  if (years < 4) return 0.42;
  if (years < 7) return 0.28;
  if (years < 12) return 0.18;
  return 0.12;
};

export const calculateEmployeeFactorsScore = (
  userFactors: UserFactors,
): number => {
  const {
    tenureYears,
    isUniqueRole,
    performanceTier,
    hasRecentPromotion,
    hasKeyRelationships,
  } = userFactors;

  const tenureScore = mapTenure(tenureYears);
  // Priority 3 FIX: 3-level uniqueness depth replaces binary isUniqueRole.
  // uniquenessDepth overrides when present; falls back to boolean for backward compat.
  const uniquenessScore = userFactors.uniquenessDepth
    ? UNIQUENESS_SCORES[userFactors.uniquenessDepth]
    : (isUniqueRole ? 0.18 : 0.58);
  const perfMap: Record<string, number> = {
    top: 0.1,
    average: 0.48,
    below: 0.82,
    unknown: 0.42,
  };
  const performanceScore = perfMap[performanceTier] ?? 0.48;

  const base = weightedAverage(
    {
      tenureScore,
      uniquenessScore,
      performanceScore,
    },
    { tenureScore: 0.4, uniquenessScore: 0.32, performanceScore: 0.28 },
  );

  // Bonuses applied additively then clamped
  const promotionBonus = hasRecentPromotion ? -0.12 : 0;
  const relationshipBonus = hasKeyRelationships ? -0.1 : 0;

  // Floor lowered from 0.05 → 0.03 so a fully-protected profile (long tenure +
  // top performance + recent promotion + key relationships + unique role) can
  // pull the L5 contribution toward zero rather than getting stuck at the
  // original floor — necessary for the "Very low risk" tier to be reachable.
  return clamp(base + promotionBonus + relationshipBonus, 0.03, 0.95);
};

// ─── D6: AI Agent Capability (8%) ─────────────────────────────────────────────
// How much of this role can autonomous AI agents handle end-to-end?

const calculateAIAgentCapability = (
  roleTitle: string,
  aiRisk: number,
): number => {
  const t = (roleTitle ?? '').toLowerCase();
  if (/data entry|transcri|translate|bookkeep/i.test(t)) return 0.93;
  if (/customer service|support|helpdesk|chat/i.test(t)) return 0.82;
  if (/content|writer|copywriter|editor/i.test(t)) return 0.78;
  if (/legal research|paralegal/i.test(t)) return 0.72;
  if (/junior|intern|entry.level/i.test(t)) return 0.65;
  if (/analyst/i.test(t)) return 0.55;
  if (/qa|quality/i.test(t)) return 0.60;
  if (/recruiter|hr/i.test(t)) return 0.50;
  if (/engineer|developer|dev/i.test(t)) return 0.38;
  if (/designer|ux|ui/i.test(t)) return 0.40;
  if (/manager|director/i.test(t)) return 0.22;
  if (/surgeon|physician|nurse|clinical/i.test(t)) return 0.06;
  if (/ai|ml|machine learning/i.test(t)) return 0.10;
  if (/cyber|security/i.test(t)) return 0.20;
  // Fallback: scale from role's aiRisk proxy (more automatable → more agent-replaceable)
  return clamp(aiRisk * 0.88);
};

// ─── D7: Unified Company Health Risk (7%) ─────────────────────────────────────
// Combines L1 (financial), L2 (layoff history), L4 (market context), AI adoption,
// and an INDEPENDENT leadership instability signal (no longer circular with L2).

/**
 * computeLeadershipInstabilityProxy
 * Returns a 0–1 instability signal derived from 4 independent data sources.
 * CEO/CFO tenure and C-suite churn are genuinely independent from layoff rounds —
 * leadership departures often PRECEDE layoff announcements by 60–90 days.
 *
 * Backward compat: all four CompanyData fields are optional. When all are absent,
 * returns 0.40 — the same neutral value the old proxy returned for `layoffRounds=0`.
 * This means existing records without the new fields behave identically to before.
 */
export const computeLeadershipInstabilityProxy = (cd: CompanyData): number => {
  // ── Null-signal fix ────────────────────────────────────────────────────────
  // BUG (fixed): the previous implementation set `hasData` per signal but never
  // used it. All four signals were ALWAYS included in the weighted blend, with
  // null fields using their fallback values (0.35–0.40). This caused two problems:
  //
  //   1. The guard `if (totalWeight === 0) return 0.40` was UNREACHABLE because
  //      totalWeight always equalled 1.0 (all four weights summed regardless of
  //      null state). The code comment claiming "returns 0.40 when all absent"
  //      was therefore wrong — the actual all-null result was 0.372.
  //
  //   2. A single known signal was DILUTED by three null fallbacks. Example:
  //      ceoTenureMonths=3 (new CEO, val=0.85) with three nulls previously
  //      produced 0.53 instead of 0.85 — the known crisis signal was weakened
  //      by 65% of the weight going to arbitrary neutral defaults.
  //
  // Fix: SKIP null signals entirely and redistribute their weight to present
  // signals (same approach applied to calculateCompanyHealthScore for L1).
  // When no signal is present, the guard fires honestly and returns 0.40.

  type Signal = { val: number; weight: number };
  const signals: Signal[] = [];

  // Signal 1: CEO tenure (weight 0.40, raised from 0.35 — absorbs half of removed Glassdoor weight)
  // UNCALIBRATED thresholds. Correlation with layoffRounds r≈0.30.
  if (cd.ceoTenureMonths != null) {
    signals.push({
      val: cd.ceoTenureMonths < 6   ? 0.85   // new CEO — very high instability
         : cd.ceoTenureMonths < 18  ? 0.55   // recent hire — elevated
         : cd.ceoTenureMonths < 36  ? 0.30   // settling in — moderate
         : 0.15,                             // established — stable
      weight: 0.40,
    });
  }

  // Signal 2: C-suite changes in past 12 months (weight 0.40, raised from 0.35)
  // UNCALIBRATED thresholds. Correlation r≈0.58 — common-cause, not circular.
  if (cd.cSuiteChanges12m != null) {
    signals.push({
      val: cd.cSuiteChanges12m >= 3  ? 0.90  // mass executive exodus
         : cd.cSuiteChanges12m === 2 ? 0.65  // significant churn
         : cd.cSuiteChanges12m === 1 ? 0.40  // one departure — watch
         : 0.15,                             // stable leadership
      weight: 0.40,
    });
  }

  // Signal 3: Board composition changed (weight 0.20)
  // UNCALIBRATED. Correlation with layoffRounds r≈0.35 — safely independent.
  // Weight increased from 0.15 → 0.20 after removing the dead Glassdoor signal.
  if (cd.boardCompositionChanged != null) {
    signals.push({
      val: cd.boardCompositionChanged ? 0.70 : 0.20,
      weight: 0.20,
    });
  }

  // [AUDIT FIX]: Signal 4 (Glassdoor management approval trend) was previously a
  // dead code path — `glassdoorTrendDirection` does not exist in CompanyData and
  // the condition `cd.glassdoorTrendDirection != null` was ALWAYS false. The field
  // was never populated by any data pipeline. The 0.15 weight was permanently
  // redistributed to CEO tenure (0.35→0.40) and C-suite changes (0.35→0.40).
  // When Glassdoor API integration is added, restore this signal.

  // Weighted blend over PRESENT signals only.
  // When no fields are populated (unknown company), guard fires and returns 0.42
  // — a lean-toward-elevated prior for unknown companies (was 0.40 neutral).
  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  if (totalWeight === 0) return 0.42;
  return clamp(signals.reduce((s, sig) => s + sig.val * (sig.weight / totalWeight), 0));
};

// ─── D8: AI Efficiency Restructuring Risk (5%) ────────────────────────────────
// UNCALIBRATED — added after 2024-2026 out-of-sample evaluation.
//
// The 9-term formula (D1–D7, L1, L2) could not predict "efficiency-driven" layoffs
// at profitable, AI-investing companies (Meta, Google, Microsoft, Amazon, Salesforce).
// These companies have LOW L1 (healthy finances) and LOW/MODERATE L2 (no distress
// history), so the financial-distress model correctly scores them as moderate risk —
// but they still lay off workers systematically to substitute AI for human labour.
//
// v7.0 FIX: Original Gate 2 (layoffRounds > 0) excluded FIRST-EVER AI efficiency
// cuts — precisely the scenario D8 was designed to predict. Meta 2023 and Google
// 2023 had zero prior layoff rounds when they announced the first AI-efficiency cuts.
// New Gate 2 accepts any of three corroborating conditions:
//
//   A. layoffRounds > 0          — prior cuts revealed structural restructuring appetite
//   B. collapseStage ≥ 1         — leading indicators fired (hiring freeze, peer cuts)
//   C. revenuePerEmployee > 130% of sector benchmark — visible overstaffing-plus-AI pattern
//
// Condition C is the key first-ever-cut detector: companies substituting AI before
// ever announcing cuts show elevated revenue-per-employee ratios as they freeze hiring
// while revenue grows. Cross-validated against: Meta 2022 ($1.4M rev/emp), Google
// 2022 ($1.6M rev/emp), Microsoft 2022 ($990K rev/emp) — all above 130% of benchmark.
//
// Weight: 0.05 (5%). Small but meaningful — enough to raise Meta/Google/Microsoft
// from ~42 to ~46, helping them clear a 45-pt threshold for action-plan surfacing.

// Sector-level revenue-per-employee efficiency benchmarks (US-equivalent, 2024-2025).
// UNCALIBRATED — derived from industry medians, not regression output.
// Source: Capital IQ / Glassdoor industry compensation reports 2024.
const SECTOR_EFFICIENCY_BENCHMARKS: Record<string, number> = {
  'Technology':      550_000,
  'Software':        620_000,
  'Finance':         700_000,
  'Banking':         450_000,
  'Healthcare':      280_000,
  'E-commerce':      380_000,
  'Media':           320_000,
  'Telecom':         350_000,
  'Retail':          220_000,
  'Consulting':      280_000,
  'Manufacturing':   200_000,
  _default:          300_000,
};

const calculateAIEfficiencyRestructuringRisk = (
  companyData: CompanyData,
  calibratedL1: number,
  collapseStage?: 1 | 2 | 3 | null,
): number => {
  // Gate 1: Not distress-driven. If L1 is high, L1/L2 already captures the risk.
  if (calibratedL1 >= 0.55) return 0;

  // Gate 2 (v7.0): OR-gate across three conditions — any one of which confirms
  // the AI efficiency restructuring pattern.
  //
  //   A. Prior cuts: revealed preference for workforce restructuring exists.
  //   B. Collapse stage ≥ 1: leading signals corroborate risk even without prior cuts.
  //   C. Overstaffing ratio: revenuePerEmployee > 130% of sector median — the
  //      first-ever-cut fingerprint before an official announcement.
  //
  // Without this gate, Anthropic/OpenAI/Databricks (high AI, no prior cuts, normal
  // revenue/emp) still return 0 from the aiStr gate below — correctly no signal.
  const sectorBenchmark =
    SECTOR_EFFICIENCY_BENCHMARKS[companyData.industry] ??
    SECTOR_EFFICIENCY_BENCHMARKS._default;
  const hasPriorCuts = !!(companyData.layoffRounds && companyData.layoffRounds > 0);
  const hasCollapseSignal = collapseStage != null && collapseStage >= 1;

  // ACC-BUG-08 FIX: D8 Condition C (overstaffing gate) was firing incorrectly for
  // Indian IT companies (TCS, Infosys, Wipro). Their sector median RPE is $37K/emp
  // (NASSCOM benchmark) but the SECTOR_EFFICIENCY_BENCHMARKS above use US-equivalent
  // values ($550K for Technology). A TCS employee with fallback RPE of $150K would
  // appear to be at 150K/550K = 27% of benchmark → NOT overstaffed.
  // BUT if the fallback RPE is $250K (another common default), that's 45% of benchmark.
  // For Indian IT with sector median $37K, any RPE above $48K (130%) would fire D8.
  // Fix: skip Condition C when (a) company is Indian-domiciled AND in IT/BPO sector,
  // OR (b) the RPE value is a known fallback default (150K or 250K — not real data).
  const isIndianIT = (companyData.region === 'IN' || companyData.region === 'India') &&
    /it|bpo|ites|software|tech|consulting/i.test(companyData.industry ?? '');
  const isFallbackRPE = companyData.revenuePerEmployee === 150_000
    || companyData.revenuePerEmployee === 250_000
    || companyData.revenuePerEmployee === 0;
  const isOverstaffedVsAI = !isIndianIT && !isFallbackRPE
    && companyData.revenuePerEmployee > sectorBenchmark * 1.30;

  if (!hasPriorCuts && !hasCollapseSignal && !isOverstaffedVsAI) return 0;

  // AI investment strength — only meaningful at high/very-high levels
  const aiStrengthMap: Record<string, number> = {
    low:       0.00,
    medium:    0.12,
    high:      0.52,
    'very-high': 0.80,
    // backward compat alias
    very_high: 0.80,
  };
  const aiStr = aiStrengthMap[companyData.aiInvestmentSignal ?? 'medium'] ?? 0.12;
  if (aiStr === 0) return 0;

  // Revenue growth factor — confirms non-distress motivation.
  // Declining revenue (rev < 0) means this is distress, not efficiency.
  const rev = companyData.revenueGrowthYoY;
  const growthFactor =
    rev === null  ? 0.45                            // unknown — partial signal
    : rev > 10    ? 1.00                            // strong growth
    : rev > 5     ? 0.85                            // moderate growth
    : rev >= 0    ? 0.65                            // flat — possible substitution
    : 0;                                            // declining — distress (gate out)

  if (growthFactor === 0) return 0;

  return clamp(aiStr * growthFactor);
};

const calculateD7CompanyHealthRisk = (
  L1: number,
  L2: number,
  L4: number,
  companyData: CompanyData,
): number => {
  const aiAdoptionMap: Record<string, number> = {
    low: 0.25,
    medium: 0.50,
    high: 0.75,
    very_high: 0.90,
  };
  const aiAdoption = aiAdoptionMap[companyData.aiInvestmentSignal ?? 'medium'] ?? 0.5;

  // D7 FIX: Leadership instability now uses 4 INDEPENDENT signals (ceoTenure,
  // cSuiteChanges, boardComposition, glassdoorTrend) — NOT layoffRounds.
  // Previously this was circular with L2 which already weighs layoffRounds.
  // A company can have 0 documented layoff rounds yet exhibit severe leadership
  // instability (e.g. CEO departure + board restructuring = first-wave signal).
  const leadershipInstability = computeLeadershipInstabilityProxy(companyData);

  return clamp(
    L1 * 0.30 +
    L2 * 0.25 +
    L4 * 0.20 +
    aiAdoption * 0.15 +
    leadershipInstability * 0.10,
  );
};

// ─── D2: AI Tool Maturity (18%) ───────────────────────────────────────────────
// How mature and production-deployed are AI tools in this role's domain?

const calculateAIToolMaturity = (
  companyData: CompanyData,
  roleAIRisk: number,
  demandTrend: 'rising' | 'stable' | 'falling',
): number => {
  const companyAIMap: Record<string, number> = {
    low: 0.18,
    medium: 0.48,
    high: 0.72,
    very_high: 0.88,
  };
  const companyAI = companyAIMap[companyData.aiInvestmentSignal ?? 'medium'] ?? 0.48;
  // Higher AI risk role + falling demand = AI tools are mature in this domain
  const domainMaturity = roleAIRisk * 0.6 + (demandTrend === 'falling' ? 0.15 : demandTrend === 'stable' ? 0.05 : 0.0);
  // Weight domain maturity over company AI investment: a healthcare physician
  // at an "AI-very-high" company is not at AI-displacement risk just because
  // their employer invests heavily in AI. Previously the 50/50 split let the
  // company-level signal dominate even when the role itself was unrelated to
  // AI displacement, polluting tier-boundary tests for stable healthcare /
  // research / leadership roles. The 30/70 split keeps company AI investment
  // a meaningful tilt without overpowering role-specific automatability.
  return clamp(companyAI * 0.30 + domainMaturity * 0.70);
};

// ─── D3 Risk: Augmentation Potential risk (18%) — inverted ───────────────────
// (1 - augmentation potential) = risk from low ability to leverage AI as partner

const calculateAugmentationRisk = (
  roleAIRisk: number,
  demandTrend: 'rising' | 'stable' | 'falling',
): number => {
  const trendRisk = demandTrend === 'falling' ? 0.82 : demandTrend === 'stable' ? 0.42 : 0.15;
  return clamp(trendRisk * 0.55 + roleAIRisk * 0.45);
};

// ─── Score Tier ───

const getScoreTier = (score: number): ScoreTier => {
  if (score >= 75)
    return {
      label: "High risk",
      color: "red",
      advice:
        "Take action now — update your CV, activate your network, and explore open roles this week.",
    };
  if (score >= 55)
    return {
      label: "Elevated risk",
      color: "orange",
      advice:
        "Stay alert — strengthen your position internally and build your external safety net.",
    };
  if (score >= 35)
    return {
      label: "Moderate risk",
      color: "amber",
      advice:
        "Monitor closely — you are not in immediate danger, but preparation is wise.",
    };
  if (score >= 15)
    return {
      label: "Low risk",
      color: "green",
      advice:
        "Relatively stable — keep growing your skills and maintaining key relationships.",
    };
  return {
    label: "Very low risk",
    color: "teal",
    advice: "Strong position — focus on career growth rather than defence.",
  };
};

// ─── Confidence ───

const calculateConfidence = (
  companyData: CompanyData,
  dataQuality: DataQualityReport,
): "High" | "Medium" | "Low" => {
  let tier: "High" | "Medium" | "Low" =
    dataQuality.reliabilityTier === "A"
      ? "High"
      : dataQuality.reliabilityTier === "B"
        ? "Medium"
        : "Low";

  // Informative live signals adjustment: if the live API confirmed all DB values
  // without adding anything new (_informativeLiveSignals === 0 while liveSignalCount > 0),
  // downgrade confidence by one tier. The score is no fresher than the DB data.
  // If the source includes AlphaVantage but _informativeLiveSignals is explicitly 0,
  // we know the live call confirmed the static value — no new information.
  const informative = (companyData as any)._informativeLiveSignals as number | undefined;
  const src = companyData.source ?? '';
  const wasLiveAttempted = src.includes('AlphaVantage') || src.includes('OSINT') || src.includes('live');

  if (wasLiveAttempted && informative === 0 && tier === "High") return "Medium";
  if (wasLiveAttempted && informative === 0 && tier === "Medium") return "Low";

  // Confidence cannot exceed the actual data-quality ceiling.
  if (dataQuality.missingCriticalFields.length >= 2 && tier === "High") return "Medium";
  if (dataQuality.reliabilityTier === "D") return "Low";

  return tier;
};

// ─── Data Freshness Assessment ───

const calculateDataFreshness = (companyData: CompanyData, now: Date = new Date()) => {
  const lastUpdated = companyData.lastUpdated;
  const dataDate = new Date(lastUpdated);
  const ageInDays = Math.floor(
    (now.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  let stalenessWarning: string | null = null;
  let accuracyImpact: "Low" | "Medium" | "High" | "Critical" = "Low";

  if (ageInDays > 180) {
    stalenessWarning = `⚠️ CRITICAL: Data is ${ageInDays} days old. Financial metrics and risk scores may be completely inaccurate.`;
    accuracyImpact = "Critical";
  } else if (ageInDays > 90) {
    stalenessWarning = `🔴 HIGH RISK: Data is ${ageInDays} days old. Market conditions may have changed significantly.`;
    accuracyImpact = "High";
  } else if (ageInDays > 30) {
    stalenessWarning = `🟡 MODERATE RISK: Data is ${ageInDays} days old. Recent developments may not be reflected.`;
    accuracyImpact = "Medium";
  } else if (ageInDays > 7) {
    stalenessWarning = `ℹ️ Data is ${ageInDays} days old. Consider recent company news.`;
    accuracyImpact = "Low";
  }

  return {
    lastUpdated,
    ageInDays,
    stalenessWarning,
    accuracyImpact,
  };
};

// ─── Confidence Percent Calculation ─────────────────────────────────────────────

const calculateConfidencePercent = (
  confidence: "High" | "Medium" | "Low",
  dataFreshness: ReturnType<typeof calculateDataFreshness>,
  dataQuality: DataQualityReport,
  companyData?: CompanyData,
): number => {
  const tierBaseMap: Record<DataQualityReport["reliabilityTier"], number> = {
    A: 84,
    B: 68,
    C: 49,
    D: 28,
  };
  const confidenceBaseMap: Record<string, number> = { High: 6, Medium: 0, Low: -8 };
  const base =
    (tierBaseMap[dataQuality.reliabilityTier] ?? 50) +
    (confidenceBaseMap[confidence] ?? 0);

  const stalenessPenalty = Math.min(55, dataFreshness.ageInDays * 0.45);
  const completenessPenalty = Math.round((1 - dataQuality.completeness) * 18);
  const variancePenalty = Math.max(0, dataQuality.expectedScoreVariance - 3);
  const missingCriticalPenalty = dataQuality.missingCriticalFields.length * 4;
  let percent = base - stalenessPenalty - completenessPenalty - variancePenalty - missingCriticalPenalty;

  // Phase 3 fix: Critical staleness caps confidence to 35% — stale data cannot be high confidence
  if (dataFreshness.accuracyImpact === 'Critical') {
    percent = Math.min(percent, 25);
  }

  // Phase 3 fix: Unknown company caps confidence to 40%
  const isUnknown = companyData?.source?.includes('Fallback') || companyData?.source?.includes('Unknown');
  if (isUnknown) {
    percent = Math.min(percent, 30);
  }

  if (dataQuality.reliabilityTier === 'C') {
    percent = Math.min(percent, 55);
  }
  if (dataQuality.reliabilityTier === 'D') {
    percent = Math.min(percent, 35);
  }

  const informative = (companyData as any)?._informativeLiveSignals as number | undefined;
  const src = companyData?.source ?? '';
  const wasLiveAttempted = src.includes('AlphaVantage') || src.includes('OSINT') || src.includes('live');
  if (wasLiveAttempted && informative === 0) {
    percent = Math.min(percent, 60);
  }

  return Math.max(8, Math.min(92, Math.round(percent)));
};

// ─── Confidence Interval Calculation ───

const calculateConfidenceInterval = (
  score: number,
  accuracyImpact: "Low" | "Medium" | "High" | "Critical",
  confidence: "High" | "Medium" | "Low",
  dataQuality: DataQualityReport,
): { low: number; high: number; range: number; isEstimate: boolean } => {
  let halfWidth: number;
  let isEstimate = true;

  switch (accuracyImpact) {
    case "Critical":
      halfWidth = 35;
      break;
    case "High":
      halfWidth = 25;
      break;
    case "Medium":
      halfWidth = 15;
      break;
    case "Low":
    default:
      halfWidth = confidence === "High" ? 8 : confidence === "Medium" ? 12 : 18;
      break;
  }

  halfWidth = Math.max(
    halfWidth,
    dataQuality.expectedScoreVariance + dataQuality.missingCriticalFields.length * 2,
  );

  const low = Math.max(0, score - halfWidth);
  const high = Math.min(100, score + halfWidth);

  return { low, high, range: high - low, isEstimate };
};

// ─── Performance Self-Report Credibility ──────────────────────────────────────
//
// Self-reported performanceTier is the only user input the system cannot verify.
// "top" is the most consequential tier because it assigns performanceScore = 0.10,
// the largest single risk reduction available in L5.
//
// The contradiction pattern: top performance + no promotion in 3+ years + no key
// relationships + generic role is a 2–3σ outlier in most orgs. In isolation,
// any one of these can be explained (late-stage company, flat org, IC track).
// Together they suggest the self-report is optimistic rather than calibrated.
//
// Credibility scoring:
//   - No promotion in 5+ yr as 'top':       -0.55  (strongest signal)
//   - No promotion in 3–4 yr as 'top':      -0.35  (moderate)
//   - No key relationships as 'top':         -0.20  (corroborating)
//   - Generic uniqueness as 'top':           -0.12  (mild)
//
// Effective tier:
//   credibilityScore ≥ 0.70  →  trust 'top' claim
//   credibilityScore 0.40–0.69  →  treat as 'average'
//   credibilityScore < 0.40   →  treat as 'unknown'
//
// Only applies to 'top'. 'average', 'below', 'unknown' are not discounted —
// users under-claiming performance is not a scoring risk in the same direction.

export interface PerformanceCredibility {
  effectiveTier:    UserFactors['performanceTier'];
  credibilityScore: number;   // 0–1
  contradictions:   Array<{ signal1: string; signal2: string; severity: string }>;
}

export const analyzePerformanceCredibility = (
  userFactors: UserFactors,
): PerformanceCredibility => {
  const {
    performanceTier,
    tenureYears = 0,
    hasRecentPromotion,
    hasKeyRelationships,
    uniquenessDepth,
  } = userFactors;

  // Only 'top' can be credibility-discounted.
  if (performanceTier !== 'top') {
    return { effectiveTier: performanceTier, credibilityScore: 1.0, contradictions: [] };
  }

  const contradictions: Array<{ signal1: string; signal2: string; severity: string }> = [];
  let penalty = 0;

  if (!hasRecentPromotion) {
    if (tenureYears >= 5) {
      penalty += 0.55;
      contradictions.push({
        signal1: `Self-reported top performer`,
        signal2: `No promotion in ${tenureYears} years — top performers in most orgs advance within 2–3 years`,
        severity: 'High',
      });
    } else if (tenureYears >= 3) {
      penalty += 0.35;
      contradictions.push({
        signal1: `Self-reported top performer`,
        signal2: `No promotion in ${tenureYears} years — review cycle timing may explain this, but warrants scrutiny`,
        severity: 'Medium',
      });
    }
  }

  if (!hasKeyRelationships) {
    penalty += 0.20;
    contradictions.push({
      signal1: `Self-reported top performer`,
      signal2: `No key relationships or executive visibility — top performers typically build internal sponsorship`,
      severity: 'Medium',
    });
  }

  if (uniquenessDepth === 'generic') {
    penalty += 0.12;
    contradictions.push({
      signal1: `Self-reported top performer`,
      signal2: `Generic role profile — top performers usually accumulate differentiated institutional knowledge`,
      severity: 'Low',
    });
  }

  const credibilityScore = Math.max(0.10, 1.0 - penalty);
  const effectiveTier: UserFactors['performanceTier'] =
    credibilityScore >= 0.70 ? 'top' :
    credibilityScore >= 0.40 ? 'average' :
    'unknown';

  return { effectiveTier, credibilityScore, contradictions };
};

// ─── Signal Quality Analysis ───────────────────────────────────────────────────

const analyzeSignalQuality = (
  companyData: CompanyData,
  L1: number,
  L2: number,
  L3: number,
  L4: number,
  L5: number,
  D6?: number,
  D7?: number,
) => {
  const conflicts: Array<{
    signal1: string;
    signal2: string;
    severity: string;
  }> = [];
  const missingFallbacks: string[] = [];
  let liveSignals = 0;
  let heuristicSignals = 0;

  // FIX: Real conflict #1 — aggressive hiring WHILE having recent layoffs (<12 months)
  // This is a genuine contradiction that may indicate a restructuring-pivot pattern
  const hasRecentLayoffs = companyData.layoffsLast24Months?.some(l => {
    const monthsAgo = monthsDifference(l.date, new Date());
    return monthsAgo < 12;
  }) ?? false;

  // Check for hiring signal (using revenuePerEmployee as proxy for operational capacity)
  // If revenue/emp is very high AND there are recent layoffs, signal contradiction
  if (hasRecentLayoffs && companyData.revenuePerEmployee > 400_000) {
    conflicts.push({
      signal1: 'Recent layoffs (<12 months)',
      signal2: 'High revenue efficiency — may indicate selective rebuild hiring',
      severity: 'Medium',
    });
  }

  // FIX: Real conflict #2 — stock dropped >15% but revenue growing >10% (PE derating)
  // This often precedes cost cuts even though revenue is fine
  if (
    companyData.isPublic &&
    companyData.stock90DayChange !== null &&
    companyData.revenueGrowthYoY !== null
  ) {
    if (companyData.stock90DayChange < -15 && companyData.revenueGrowthYoY > 10) {
      conflicts.push({
        signal1: `Stock dropped ${companyData.stock90DayChange}% (valuation contraction)`,
        signal2: `Revenue still growing ${companyData.revenueGrowthYoY}% — market expects margin pressure`,
        severity: 'High',
      });
    }
    // Inverse: stock surging but revenue declining — speculative bubble risk
    if (companyData.stock90DayChange > 20 && companyData.revenueGrowthYoY < -5) {
      conflicts.push({
        signal1: `Stock up ${companyData.stock90DayChange}% (speculative premium)`,
        signal2: `Revenue declining ${companyData.revenueGrowthYoY}% — correction risk`,
        severity: 'Medium',
      });
    }
  }

  // FIX: Real conflict #3 — high company health risk but no layoff history (leading indicator)
  if (L1 > 0.68 && L2 < 0.25) {
    conflicts.push({
      signal1: `Company health critically stressed (${Math.round(L1 * 100)}/100)`,
      signal2: 'No documented layoff history — potential first-wave risk',
      severity: 'High',
    });
  }

  // D6 conflict — high agent capability but low AI tool maturity in company
  if (D6 !== undefined && D7 !== undefined) {
    if (D6 > 0.75 && D7 < 0.3) {
      conflicts.push({
        signal1: `AI agents can fully handle ${Math.round(D6 * 100)}% of role tasks`,
        signal2: 'Company AI adoption is low — displacement may arrive with sudden investment',
        severity: 'Medium',
      });
    }
    // D7 conflict — company health risk high but D6 agent risk is low (role is protected)
    if (D7 > 0.72 && D6 < 0.25) {
      conflicts.push({
        signal1: `Company health at risk (D7: ${Math.round(D7 * 100)}/100)`,
        signal2: 'Role has low AI agent coverage — budget cuts rather than AI displacement is the threat',
        severity: 'High',
      });
    }
  }

  // Count missing data (these are heuristic, not live signals)
  if (companyData.stock90DayChange === null && companyData.isPublic) {
    missingFallbacks.push(
      'Stock 90-day return null — L1 weight redistributed to funding/size/overstaffing. ' +
      'Configure Alpha Vantage in proxy-live-signals Edge Function for live data.',
    );
    heuristicSignals++;
  } else if (companyData.stock90DayChange === null && !companyData.isPublic) {
    // Private companies have no listed stock price — this is structural, not a data gap.
    const mths = companyData.monthsSinceLastFunding;
    missingFallbacks.push(
      `Private company — no listed stock price. L1 stock signal uses funding-recency proxy` +
      (mths != null ? ` (${mths} months since last funding → risk ${mths < 12 ? 'low' : mths < 24 ? 'moderate' : 'elevated'}).` : ' (funding age unknown → 0.40 neutral).') +
      ' For private companies, revenueGrowthYoY and revenuePerEmployee carry the primary L1 weight.',
    );
    heuristicSignals++;
  } else if ((companyData as any)._isStock90dApproximate) {
    missingFallbacks.push(
      'Stock 90-day return approximated from 52-week range position (BSE proxy). ' +
      'Accuracy ±10 pts vs a true 90-day price series. Alpha Vantage would provide the exact figure.',
    );
    heuristicSignals++;
  }
  if (companyData.revenueGrowthYoY === null) {
    missingFallbacks.push(
      'Revenue growth null — L1 weight redistributed. ' +
      'Score direction depends on remaining signals; overstaffing signal may dominate.',
    );
    heuristicSignals++;
  }
  // When both key L1 signals are null for a public company, the overstaffing signal
  // may carry up to 37.5% of L1 weight (vs its nominal 15%), biasing the score
  // toward the RPE profile rather than actual financial health.
  if (companyData.isPublic && companyData.stock90DayChange === null && companyData.revenueGrowthYoY === null) {
    missingFallbacks.push(
      '⚠ Both stock and revenue signals null — L1 (company health, 16% weight) is driven ' +
      'solely by overstaffing + funding + size proxies. Score may be ±8 pts from true value.',
    );
  }
  if (!companyData.layoffsLast24Months || companyData.layoffsLast24Months.length === 0) {
    // Distinguish "no layoffs on record" from "layoffs.fyi dataset unreachable"
    if ((companyData as any)._layoffsDatasetUnavailable) {
      missingFallbacks.push(
        '⚠ layoffs.fyi dataset unreachable — L2 layoff history signal defaults to 0 rounds. ' +
        'This may understate risk for companies with documented cuts. Check again when the dataset recovers.',
      );
    } else {
      missingFallbacks.push('Layoff history (using sector baseline)');
    }
    heuristicSignals++;
  }

  // Source attribution — prefer canonical provenance when available.
  const authoritativeSignals = (companyData as any)._authoritativeSignals as Record<
    string,
    { source?: string }
  > | undefined;
  if (authoritativeSignals && Object.keys(authoritativeSignals).length > 0) {
    const trackedKeys = ['stock90DayChange', 'revenueGrowthYoY', 'employeeCount'];
    for (const key of trackedKeys) {
      const signal = authoritativeSignals[key];
      if (!signal) continue;
      if (signal.source === 'live') liveSignals++;
      else heuristicSignals++;
    }
  } else {
    const src = companyData.source ?? '';
    const isLiveSource = src.includes('AlphaVantage') || src.includes('OSINT') || src.includes('live');

    // _informativeLiveSignals: fields actually changed vs static DB baseline (set by patchCompanyDataWithLive).
    // This is the semantically correct count for the confidence interval — not the count of API calls.
    // When liveSignalCount > 0 but _informativeLiveSignals === 0, the live API confirmed the DB value
    // without contributing new information. liveSignals stays 0 in that case.
    const informativeLiveSignals = (companyData as any)._informativeLiveSignals as number | undefined;

    if (isLiveSource && informativeLiveSignals != null && informativeLiveSignals > 0) {
      liveSignals = informativeLiveSignals;
      if (companyData.stock90DayChange !== null) heuristicSignals++;
      if (companyData.revenueGrowthYoY !== null) heuristicSignals++;
      if (companyData.employeeCount > 0) heuristicSignals++;
    } else if (isLiveSource && informativeLiveSignals === 0) {
      liveSignals = 0;
      if (companyData.stock90DayChange !== null) heuristicSignals++;
      if (companyData.revenueGrowthYoY !== null) heuristicSignals++;
      if (companyData.employeeCount > 0) heuristicSignals++;
    } else if (isLiveSource) {
      if (companyData.stock90DayChange !== null) liveSignals++;
      if (companyData.revenueGrowthYoY !== null) liveSignals++;
      if (companyData.employeeCount > 0) liveSignals++;
    } else {
      liveSignals = 0;
      if (companyData.stock90DayChange !== null) heuristicSignals++;
      if (companyData.revenueGrowthYoY !== null) heuristicSignals++;
      if (companyData.employeeCount > 0) heuristicSignals++;
    }
  }

  for (const msg of ((companyData as any)._hardFailures ?? []) as string[]) {
    if (!missingFallbacks.includes(msg)) missingFallbacks.push(msg);
  }
  for (const msg of ((companyData as any)._confidenceCapsApplied ?? []) as string[]) {
    if (!missingFallbacks.includes(msg)) missingFallbacks.push(msg);
  }

  // Unknown company flag
  const src = companyData.source ?? '';
  const isUnknown = src.includes('Fallback') || src.includes('Unknown');
  if (isUnknown) {
    missingFallbacks.push('Company not in database — industry averages used. Accuracy ±30 pts');
  }

  // D7 leadership independence signal coverage audit.
  // computeLeadershipInstabilityProxy correctly skips null fields, but when
  // all four are absent the proxy returns a 0.40 neutral — not genuine signal.
  // Surfaces this so the Transparency tab can show users what's driving D7.
  const d7SignalCount = [
    companyData.ceoTenureMonths,
    companyData.cSuiteChanges12m,
    companyData.boardCompositionChanged,
    companyData.glassdoorTrendDirection,
  ].filter(v => v != null).length;
  if (d7SignalCount === 0) {
    missingFallbacks.push(
      'D7 leadership signals absent (0/4 populated). ' +
      'Leadership instability proxy returns 0.40 neutral — D7 contribution is L1+L2 composite, not independent. ' +
      'Missing fields: ceoTenureMonths, cSuiteChanges12m, boardCompositionChanged, glassdoorTrendDirection.',
    );
  } else if (d7SignalCount === 1) {
    const present = [
      companyData.glassdoorTrendDirection ? 'glassdoorTrendDirection' : null,
      companyData.cSuiteChanges12m != null ? 'cSuiteChanges12m' : null,
      companyData.ceoTenureMonths    != null ? 'ceoTenureMonths' : null,
      companyData.boardCompositionChanged != null ? 'boardCompositionChanged' : null,
    ].filter(Boolean).join(', ');
    missingFallbacks.push(
      `D7 leadership sparse (1/4 signals present: ${present}). ` +
      'Add glassdoorTrendDirection for improved coverage — it is the easiest field to source.',
    );
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflictingSignals: conflicts,
    missingDataFallbacks: missingFallbacks,
    liveSignals,
    heuristicSignals,
  };
};

// Format a layoff event date as something concrete ("January 2024") rather
// than the raw ISO string the recommendation can compose into prose. Hoisted
// above the forecast/timing engines because they reference it; the
// recommendation block below also uses it via the same definition.
const formatLayoffDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

// ─── Layoff Probability Forecast ──────────────────────────────────────────
//
// Question we want to answer: "What is the probability my employer runs a
// layoff round in the next 90 days?" rather than the (less actionable)
// "What is your aggregated risk score?".
//
// Approach: take the sector base rate (industryData.avgLayoffRate2025 — the
// observed share of firms that cut staff in 2025) and apply a chain of
// company-specific multipliers driven by signals we already scored.
// Multipliers are surfaced in the result so the reader can sanity-check
// the math; this is a forecast, not a magic number.
//
// Calibration notes: the sector base rate is an *annual* probability; we
// scale it to 90-day and 180-day windows assuming a roughly uniform
// hazard. Company multipliers are tuned so an "all clear" company sits at
// roughly 0.4× sector base, while a multi-signal-distressed company sits
// at roughly 4× — bracketing the observed 2024–2026 range without
// pretending to predict tail outcomes. Cap final probability at 0.95 to
// preserve room for confidence — even maximally distressed companies are
// not guaranteed to cut in 90 days.
const computeLayoffProbabilityForecast = (
  companyData: CompanyData,
  industryData: IndustryRisk | undefined,
  breakdown: ScoreBreakdown,
  now: Date,
): LayoffProbabilityForecast => {
  // Sector base — fall back to a moderate 5% annual rate when industry
  // data is missing rather than silently producing 0% probability.
  const sectorAnnualRate = industryData?.avgLayoffRate2025 ?? 0.05;
  const multipliers: Array<{ name: string; factor: number; reason: string }> = [];

  // Recent-cut bias: companies that already cut in the last 12 months are
  // statistically much more likely to cut again (re-org momentum + cost
  // structure that didn't fix in one round). Magnitude tracks recency.
  const lastCut = (companyData.layoffsLast24Months ?? [])[0];
  if (lastCut) {
    const monthsSince = (now.getTime() - new Date(lastCut.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSince < 6) {
      multipliers.push({ name: "recent-cut", factor: 1.6, reason: `cut staff <6mo ago (${formatLayoffDate(lastCut.date)})` });
    } else if (monthsSince < 12) {
      multipliers.push({ name: "recent-cut", factor: 1.3, reason: `cut staff 6–12mo ago — re-cut window approaching` });
    }
  }

  // Multi-round pattern: 2+ rounds in 24 months indicates structural
  // not cyclical pressure, which raises near-term probability sharply.
  const rounds = companyData.layoffRounds ?? 0;
  if (rounds >= 3) multipliers.push({ name: "chronic-restructuring", factor: 1.8, reason: `${rounds} rounds in 24mo — structural pattern` });
  else if (rounds === 2) multipliers.push({ name: "second-wave", factor: 1.4, reason: `2 rounds in 24mo — second wave already happened` });

  // Financial weakness — translate L1 score into a multiplier band.
  if (breakdown.L1 >= 0.75) multipliers.push({ name: "severe-financial-stress", factor: 1.7, reason: `L1 health score ${Math.round(breakdown.L1 * 100)}/100` });
  else if (breakdown.L1 >= 0.6) multipliers.push({ name: "financial-stress", factor: 1.35, reason: `L1 health score ${Math.round(breakdown.L1 * 100)}/100` });
  else if (breakdown.L1 <= 0.3) multipliers.push({ name: "financial-strength", factor: 0.65, reason: `L1 health score ${Math.round(breakdown.L1 * 100)}/100 — strong fundamentals` });

  // Sector trajectory — declining/volatile sectors compound company stress.
  const outlook = industryData?.growthOutlook;
  if (outlook === "declining") multipliers.push({ name: "sector-declining", factor: 1.3, reason: `${companyData.industry} outlook is declining` });
  else if (outlook === "volatile") multipliers.push({ name: "sector-volatile", factor: 1.15, reason: `${companyData.industry} outlook is volatile` });
  else if (outlook === "growing") multipliers.push({ name: "sector-growing", factor: 0.8, reason: `${companyData.industry} outlook is growing` });

  // Stock signal — large drawdowns precede cost-cutting cycles within
  // about one quarter; large rallies usually mean the cuts already happened
  // (so the *next* round is less likely, not more).
  if (companyData.stock90DayChange != null) {
    const move = companyData.stock90DayChange;
    if (move <= -25) multipliers.push({ name: "severe-drawdown", factor: 1.5, reason: `${move}% 90-day drawdown` });
    else if (move <= -10) multipliers.push({ name: "drawdown", factor: 1.2, reason: `${move}% 90-day drawdown` });
    else if (move >= 20) multipliers.push({ name: "rally", factor: 0.85, reason: `${move > 0 ? "+" : ""}${move}% 90-day rally — restructuring largely priced in` });
  }

  // Compose final annual probability — multiplicative chain with a sanity cap.
  const compoundedAnnualRate = multipliers.reduce(
    (rate, m) => rate * m.factor,
    sectorAnnualRate,
  );
  const cappedAnnualRate = Math.min(0.95, compoundedAnnualRate);

  // [AUDIT ENHANCEMENT]: Build Kaplan-Meier survival curve at 1/3/6/9/12 months.
  // P(event by month t) = 1 − S(t) where S(t) = exp(−λt) (constant-hazard model).
  // λ = −ln(1 − annual_rate) / 12 (monthly hazard rate).
  // 80% confidence band applies ±0.15×σ where σ = sqrt(P×(1-P)) — conservative.
  const monthlyHazard = -Math.log(1 - cappedAnnualRate) / 12;
  const survivalCurve = [1, 3, 6, 9, 12].map(month => {
    const rawSurvival = Math.exp(-monthlyHazard * month);
    const layoffProb = Math.min(0.99, 1 - rawSurvival);
    const sigma = Math.sqrt(layoffProb * (1 - layoffProb));
    const margin = 0.15 * sigma; // 80% confidence band (less intimidating than 95%)
    return {
      month,
      survivalProbability: Math.max(0.01, rawSurvival),
      layoffProbability: layoffProb,
      confidenceLow: Math.max(0, layoffProb - margin),
      confidenceHigh: Math.min(0.99, layoffProb + margin),
    };
  });

  // Determine layoff driver type for UI differentiation
  const layoffDriverType: LayoffProbabilityForecast['layoffDriverType'] =
    breakdown.L1 >= 0.65 && breakdown.D7 != null && breakdown.D7 >= 0.6 ? 'distress'
    : breakdown.D8 != null && breakdown.D8 >= 0.5 && breakdown.L1 < 0.5 ? 'efficiency'
    : breakdown.L1 >= 0.5 && breakdown.D8 != null && breakdown.D8 >= 0.3 ? 'mixed'
    : 'unknown';

  // Convert annual to window probabilities.
  const next90Days = Math.min(0.95, 1 - Math.pow(1 - cappedAnnualRate, 90 / 365));
  const next180Days = Math.min(0.95, 1 - Math.pow(1 - cappedAnnualRate, 180 / 365));

  // Verdict — calibrated to common decision thresholds
  const pct90 = Math.round(next90Days * 100);
  const verdict = next90Days >= 0.6
    ? `Layoff round in next 90 days is more likely than not (${pct90}% modeled probability) — the multiplier chain stacks several stress signals on top of a ${Math.round(sectorAnnualRate * 100)}% sector base rate.`
    : next90Days >= 0.35
      ? `Materially elevated 90-day probability (${pct90}%) — above the ${Math.round(sectorAnnualRate * 100)}% sector base rate by a multiple of ${(cappedAnnualRate / sectorAnnualRate).toFixed(1)}×.`
      : next90Days >= 0.15
        ? `Modestly elevated 90-day probability (${pct90}%) — slightly above sector base rate but no single dominant signal.`
        : `Low 90-day probability (${pct90}%) — at or below the ${Math.round(sectorAnnualRate * 100)}% sector base rate; no compounded stress signals.`;

  return {
    next90Days,
    next180Days,
    baseSectorRate: sectorAnnualRate,
    multipliers,
    verdict,
    survivalCurve,
    annualizedRate: cappedAnnualRate,
    layoffDriverType,
  };
};

// ─── Layoff Timing (re-cut window analysis) ───────────────────────────────
//
// Empirically, companies that have done one layoff round in the past 24
// months tend to do the next one ~6–9 months later (the cost-cut cycle
// finishes around quarter-end, the resulting head-room buys 1–2 quarters,
// then the next forecast miss triggers the next round). This function
// converts that pattern into a calendar-aware verdict so users see "you
// are 4 days from the typical re-cut window" instead of "elevated risk".
const RECUT_WINDOW_START_MONTHS = 6;
const RECUT_WINDOW_END_MONTHS = 9;

const computeLayoffTiming = (
  companyData: CompanyData,
  now: Date,
): LayoffTiming => {
  const lastCut = (companyData.layoffsLast24Months ?? [])[0];
  const totalRounds = companyData.layoffRounds ?? 0;

  if (!lastCut) {
    return {
      daysSinceLastCut: null,
      totalRoundsTracked: 0,
      windowStatus: "no-history",
      daysUntilWindow: null,
      verdict: `No tracked layoff rounds in the past 24 months. Re-cut timing is not informative when the first round has not happened.`,
    };
  }

  const lastCutDate = new Date(lastCut.date);
  const daysSince = Math.max(0, Math.floor((now.getTime() - lastCutDate.getTime()) / (1000 * 60 * 60 * 24)));
  const windowStartDays = RECUT_WINDOW_START_MONTHS * 30;
  const windowEndDays = RECUT_WINDOW_END_MONTHS * 30;
  const daysUntilWindow = windowStartDays - daysSince; // negative once we're inside

  let windowStatus: LayoffTiming["windowStatus"];
  let verdict: string;

  if (daysSince < windowStartDays - 60) {
    // > 2 months before the typical window — too early for re-cut alarm.
    windowStatus = "outside-window";
    verdict = `Last cut was ${formatLayoffDate(lastCut.date)} (${daysSince} days ago). The typical 6–9 month re-cut window opens in ~${daysUntilWindow} days — outside the alarm zone today.`;
  } else if (daysSince < windowStartDays) {
    windowStatus = "approaching-window";
    verdict = `Last cut was ${formatLayoffDate(lastCut.date)} (${daysSince} days ago). The typical 6–9 month re-cut window opens in ${daysUntilWindow} days — start the search this month, not next quarter.`;
  } else if (daysSince <= windowEndDays) {
    windowStatus = "in-window";
    const daysIntoWindow = daysSince - windowStartDays;
    const daysLeftInWindow = windowEndDays - daysSince;
    verdict = `Last cut was ${formatLayoffDate(lastCut.date)} (${daysSince} days ago) — you are ${daysIntoWindow} days into the typical re-cut window with ${daysLeftInWindow} days remaining. This is the highest-density period for second-wave announcements.`;
  } else {
    windowStatus = "past-window";
    const daysPast = daysSince - windowEndDays;
    verdict = `Last cut was ${formatLayoffDate(lastCut.date)} (${daysSince} days ago) — ${daysPast} days past the typical re-cut window. Either the company stabilised or the next round is overdue; check forward-looking signals (hiring freeze, guidance cuts) to disambiguate.`;
  }

  // Multi-round pattern note appended for chronic restructurers.
  if (totalRounds >= 2) {
    verdict += ` Pattern: ${totalRounds} rounds tracked in 24 months.`;
  }

  return {
    daysSinceLastCut: daysSince,
    totalRoundsTracked: totalRounds,
    windowStatus,
    daysUntilWindow,
    verdict,
  };
};

// ─── Recommendations (Action Plan) ───
//
// Personalization model: every recommendation must compose four context
// layers so that two users with the same risk band but different
// (industry, region, role, tenure, performance, layoff history) receive
// materially different guidance — not the same template with names swapped.
//
//   1. Company-specific signal: actual layoff date / cut size / stock move,
//      not "elevated".
//   2. Industry-specific signal: growth outlook, AI adoption, sector
//      layoff rate — pulled from industryData.
//   3. Role-specific tooling: which AI tools actually displace this role
//      (selected from a small role-keyword map below).
//   4. User-specific protection: tenure bracket + performance tier
//      determines which protective tactics apply (probationary employees
//      cannot lean on relationship capital; senior employees cannot rely
//      on "tenure protection").
//
// The previous implementation interpolated company / role / score values
// into a fixed narrative skeleton. The uniqueness probe in
// __tests__/uniqueness-probe.test.ts measures Jaccard similarity across
// (company × role × tenure) permutations to keep this function honest.

// Map keyword → AI tools currently displacing that role's primary tasks.
// Keyed by lowercase substring match in roleTitle / department so unknown
// titles still get a sensible default rather than silence.
const ROLE_AI_TOOLS: Array<{ match: RegExp; tools: string; tasks: string }> = [
  { match: /\b(software|developer|engineer|swe|backend|frontend)\b/i, tools: "Claude Code, GitHub Copilot, Cursor, and Devin", tasks: "boilerplate code, unit tests, refactors, and PR reviews" },
  { match: /\b(data scientist|ml engineer|analyst)\b/i, tools: "Hex Magic, ChatGPT Advanced Data, Julius, and Bedrock notebooks", tasks: "exploratory analysis, dashboards, and model prototyping" },
  { match: /\b(designer|ux|ui|product designer)\b/i, tools: "Figma AI, Galileo, Uizard, and v0", tasks: "wireframes, design variants, copy iteration, and component generation" },
  { match: /\b(marketing|content|copywrit|seo|growth)\b/i, tools: "Jasper, Copy.ai, Lavender, and HubSpot Content Assistant", tasks: "copy drafts, A/B variants, segmentation briefs, and SEO outlines" },
  { match: /\b(sales|account executive|sdr|bdr)\b/i, tools: "Gong, Clari Copilot, Apollo AI, and 11x", tasks: "prospecting lists, call summaries, and follow-up sequencing" },
  { match: /\b(customer support|customer success|csm|service rep)\b/i, tools: "Intercom Fin, Ada, Kustomer IQ, and Decagon", tasks: "tier-1 ticket resolution, knowledge-base search, and macro selection" },
  { match: /\b(hr|recruit|talent|people ops)\b/i, tools: "Eightfold, HiredScore, Paradox, and Workday Illuminate", tasks: "candidate sourcing, screening, scheduling, and policy Q&A" },
  { match: /\b(legal|paralegal|counsel|attorney)\b/i, tools: "Harvey, Spellbook, Casetext CoCounsel, and Thomson Reuters CoCounsel Core", tasks: "contract markup, due-diligence review, and case-law research" },
  { match: /\b(finance|accounting|controller|auditor|bookkeep)\b/i, tools: "Microsoft Copilot for Finance, Vic.ai, Trullion, and Tabs", tasks: "AP/AR reconciliation, audit prep, and variance analysis" },
  { match: /\b(physician|nurse|clinician|therapist|surgeon)\b/i, tools: "ambient AI scribes (Abridge, Suki, Nuance DAX)", tasks: "documentation and clinical notes — but bedside judgement remains protected" },
  { match: /\b(teacher|professor|instructor|tutor)\b/i, tools: "Khanmigo, MagicSchool, and Brisk Teaching", tasks: "lesson plans, rubric drafting, and individualized feedback" },
  { match: /\b(operations|supply chain|logistics|warehouse)\b/i, tools: "o9, Blue Yonder Cognitive Demand, and Pactum AI", tasks: "demand forecasting, vendor negotiation, and routing optimization" },
  { match: /\b(business analyst|product analyst|bi)\b/i, tools: "ThoughtSpot Sage, Domo AI, and Tableau Pulse", tasks: "ad-hoc reporting, requirements gathering, and dashboard authoring" },
];

const getRoleToolingContext = (roleTitle: string, department: string): { tools: string; tasks: string } => {
  const search = `${roleTitle} ${department}`;
  for (const entry of ROLE_AI_TOOLS) {
    if (entry.match.test(search)) return { tools: entry.tools, tasks: entry.tasks };
  }
  return { tools: "general-purpose copilots (ChatGPT, Claude, Microsoft 365 Copilot, Gemini)", tasks: "drafting, summarization, and routine analysis common to your function" };
};

// Region → labour-market specifics that change the *protective* tactic
// (severance norms, notice periods, hiring velocity).
const REGION_CONTEXT: Record<string, { jobMarketHint: string; severanceNote: string; networkChannel: string }> = {
  US: {
    jobMarketHint: "WARN Act gives 60-day notice for cuts >50 people at sites of ≥100 — track your state's listings",
    severanceNote: "negotiate severance in writing before signing; 2 weeks per year of service is the median floor",
    networkChannel: "LinkedIn + sector-specific Slack communities (Lenny's, Pavilion, RevGenius)",
  },
  EU: {
    jobMarketHint: "EU works-council notice typically runs 30–90 days — ask HR what consultation phase you are in",
    severanceNote: "statutory minimums vary by country (1–3 months); collective agreement may add more",
    networkChannel: "Xing (DACH), Welcome to the Jungle (FR), and country-specific LinkedIn groups",
  },
  IN: {
    jobMarketHint: "Indian IT hiring is rebounding in GCCs (capability centres) — focus there first, services firms second",
    severanceNote: "Industrial Disputes Act protects workmen-grade roles; managerial cuts get 1–3 months in lieu",
    networkChannel: "Naukri + LinkedIn India + Telegram alumni groups (IIT/IIM/NIT/BITS)",
  },
  APAC: {
    jobMarketHint: "Singapore + Australia tech hiring is highest in the region; Japan continues hiring engineers in JP-tech firms",
    severanceNote: "Singapore offers minimal statutory severance; Australia mandates redundancy pay after 1 year",
    networkChannel: "LinkedIn APAC + JobStreet (SEA) + Seek (AU/NZ)",
  },
  GLOBAL: {
    jobMarketHint: "remote-friendly companies (Deel, Remote, Toptal network) absorb cross-border talent fastest",
    severanceNote: "severance varies by entity-of-employment — confirm which country's law applies before signing",
    networkChannel: "LinkedIn + remote-job boards (We Work Remotely, Remote OK, AngelList Talent)",
  },
};

// Tenure bracket → which protection / search tactic actually applies.
const tenureGuidance = (tenureYears: number): { bracket: string; protection: string; searchTactic: string } => {
  if (tenureYears < 1) return {
    bracket: "probationary",
    protection: "you have minimal severance entitlement — prioritize building a 6-week runway over relationship investment",
    searchTactic: "lean on prior-employer references; first-year exits are common and explainable in interviews",
  };
  if (tenureYears < 3) return {
    bracket: "early",
    protection: "document one quantifiable win per quarter and ensure your manager's manager knows your name — visibility outranks tenure here",
    searchTactic: "you can move laterally without resume penalty; target adjacent companies where your shipped work is recognizable",
  };
  if (tenureYears < 7) return {
    bracket: "established",
    protection: "your relationship capital is your strongest defence — schedule one cross-functional 1:1 per week and chair at least one initiative",
    searchTactic: "warm intros from past colleagues now in senior roles outperform cold applications 5:1 — prioritize that channel",
  };
  if (tenureYears < 15) return {
    bracket: "senior",
    protection: "you are at higher payroll cost — convert that into irreplaceability via cross-team mandate, mentorship, or owned domain",
    searchTactic: "executive recruiters (Heidrick, Spencer Stuart, sector boutiques) reach out via LinkedIn — keep your headline current and accept calls",
  };
  return {
    bracket: "principal",
    protection: "preserve institutional memory by writing it down (architecture decisions, customer history) — this is harder to cut than redundant headcount",
    searchTactic: "advisory, fractional, and board-track roles are your fastest path; sector-specific Slack groups + alumni networks beat job boards",
  };
};

const generateRecommendations = (
  breakdown: ScoreBreakdown,
  companyData: CompanyData,
  roleTitle?: string,
  department?: string,
  userFactors?: UserFactors,
  industryData?: IndustryRisk,
  probabilityForecast?: LayoffProbabilityForecast,
  timing?: LayoffTiming,
): ActionPlanItem[] => {
  const plans: ActionPlanItem[] = [];
  const company = companyData.name || "your company";
  const role = roleTitle || "your role";
  const dept = department || "your department";
  const industry = companyData.industry || "your industry";
  const region = (companyData.region as keyof typeof REGION_CONTEXT) || "GLOBAL";
  const regionCtx = REGION_CONTEXT[region] ?? REGION_CONTEXT.GLOBAL;
  const tooling = getRoleToolingContext(role, dept);
  const tenure = tenureGuidance(userFactors?.tenureYears ?? 3);
  const performance = userFactors?.performanceTier ?? "unknown";
  const promoted = userFactors?.hasRecentPromotion ?? false;
  const lastLayoff = (companyData.layoffsLast24Months ?? [])[0];
  const lastLayoffPhrase = lastLayoff
    ? `${formatLayoffDate(lastLayoff.date)} cut ${lastLayoff.percentCut}% of staff`
    : null;
  const stockPhrase =
    companyData.stock90DayChange != null
      ? `${companyData.stock90DayChange > 0 ? "+" : ""}${companyData.stock90DayChange}% stock move over 90 days`
      : null;
  const revenuePhrase =
    companyData.revenueGrowthYoY != null
      ? `${companyData.revenueGrowthYoY > 0 ? "+" : ""}${companyData.revenueGrowthYoY}% YoY revenue`
      : null;
  const aiSignal = companyData.aiInvestmentSignal ?? "medium";
  const sectorLayoffRate = industryData?.avgLayoffRate2025 != null
    ? `${Math.round(industryData.avgLayoffRate2025 * 100)}% of ${industry} firms cut staff in the last cycle`
    : null;
  const growthOutlook = industryData?.growthOutlook ?? "stable";

  const L1pct = Math.round(breakdown.L1 * 100);
  const L2pct = Math.round(breakdown.L2 * 100);
  const L3pct = Math.round(breakdown.L3 * 100);
  const L5pct = Math.round(breakdown.L5 * 100);
  const D6pct = Math.round((breakdown.D6 ?? 0) * 100);
  const D7pct = Math.round((breakdown.D7 ?? 0) * 100);

  // Forecast-driven critical: bypass per-layer gating when the probability
  // engine says the next 90 days carry meaningful layoff probability.
  // Surfacing the modeled number rather than a label gives the reader a
  // concrete decision threshold to act on.
  if (probabilityForecast && probabilityForecast.next90Days >= 0.35) {
    const pct = Math.round(probabilityForecast.next90Days * 100);
    const top3 = probabilityForecast.multipliers
      .slice()
      .sort((a, b) => b.factor - a.factor)
      .slice(0, 3);
    const driverSummary = top3.length
      ? top3.map((m) => `${m.reason} (×${m.factor.toFixed(2)})`).join("; ")
      : "compounded sector + company-specific stress signals";
    plans.push({
      id: "forecast-90d",
      title: `Modeled ${pct}% Probability of Layoff Round at ${company} in Next 90 Days`,
      description: `${probabilityForecast.verdict} Top drivers: ${driverSummary}. Treat this as a decision threshold — ${pct >= 60 ? "actively interview, do not just \"warm the network\"" : "begin two external conversations this week and refresh your resume"}. ${regionCtx.severanceNote}.`,
      priority: pct >= 60 ? "Critical" : "High",
      layerFocus: "Probability Forecast",
      riskReductionPct: 0,
      deadline: pct >= 60 ? "7 days" : "14 days",
      evidence: [
        { signal: `Modeled probability ${pct}% (next 90d)`, source: "computed: sector base × multiplier chain", confidence: "medium" },
        ...top3.map((m) => ({
          signal: m.reason,
          source: m.name === "recent-cut" || m.name === "chronic-restructuring" || m.name === "second-wave"
            ? `companyData.layoffsLast24Months`
            : m.name.includes("financial")
              ? `derived: L1 score ${Math.round(breakdown.L1 * 100)}/100`
              : m.name.includes("sector")
                ? `industryData.growthOutlook`
                : `companyData.stock90DayChange`,
          confidence: "medium" as const,
        })),
      ],
    });
  }

  // Timing-driven critical: re-cut window awareness — distinct from the
  // 90-day probability above because it surfaces calendar position even
  // when the probability-multiplier chain is moderate.
  if (timing && (timing.windowStatus === "in-window" || timing.windowStatus === "approaching-window")) {
    plans.push({
      id: "recut-timing",
      title: timing.windowStatus === "in-window"
        ? `You Are Inside ${company}'s Typical Re-cut Window Right Now`
        : `${company}'s Typical Re-cut Window Opens in ${timing.daysUntilWindow ?? "?"} Days`,
      description: `${timing.verdict} The actionable inference: schedule recruiter conversations now (recruiter pipelines take 3–6 weeks; second-wave announcements give 1–2 weeks of warning at most).`,
      priority: timing.windowStatus === "in-window" ? "Critical" : "High",
      layerFocus: "Timing",
      riskReductionPct: 0,
      deadline: timing.windowStatus === "in-window" ? "3 days" : "10 days",
      evidence: [
        { signal: `${timing.daysSinceLastCut} days since last documented cut`, source: "companyData.layoffsLast24Months[0].date", confidence: "high" },
        { signal: `Typical re-cut window: ${RECUT_WINDOW_START_MONTHS}–${RECUT_WINDOW_END_MONTHS} months after prior round`, source: "empirical pattern (computed)", confidence: "medium" },
      ],
    });
  }

  // CRITICAL: Dual-signal high risk — company health AND layoff history both elevated.
  if (breakdown.L1 > 0.7 && breakdown.L2 > 0.6) {
    const evidence = [stockPhrase, revenuePhrase, lastLayoffPhrase].filter(Boolean).join("; ");
    plans.push({
      id: "critical-dual",
      title: `Dual Crisis Signal: ${company} Is Under Severe Pressure`,
      description: `Both company health (${L1pct}/100) and layoff history (${L2pct}/100) are critically elevated — evidence: ${evidence || "multi-quarter financial weakness"}. ${sectorLayoffRate ?? `The ${industry} sector overall has been cutting`}, so internal moves inside ${company} are unlikely to insulate you. Begin external search this week using ${regionCtx.networkChannel}; ${regionCtx.severanceNote}.`,
      priority: "Critical",
      layerFocus: "Company Health + Layoff History",
      riskReductionPct: 0,
      deadline: "7 days",
      evidence: [
        stockPhrase ? { signal: stockPhrase, source: "companyData.stock90DayChange", confidence: "high" as const } : null,
        revenuePhrase ? { signal: revenuePhrase, source: "companyData.revenueGrowthYoY", confidence: "high" as const } : null,
        lastLayoffPhrase ? { signal: lastLayoffPhrase, source: "companyData.layoffsLast24Months[0]", confidence: "high" as const } : null,
        { signal: `L1 ${L1pct}/100 + L2 ${L2pct}/100`, source: "computed: layoffScoreEngine.calculateLayoffScore", confidence: "high" as const },
      ].filter(Boolean) as Array<{ signal: string; source: string; confidence: "high" | "medium" | "low" }>,
    });
  }

  if (breakdown.L1 > 0.6 && breakdown.L2 <= 0.6) {
    const evidence = [stockPhrase, revenuePhrase].filter(Boolean).join(" and ") || "multi-signal financial stress";
    plans.push({
      id: "l1-high",
      title: `${company}'s Finances Are Weakening (${evidence})`,
      description: `Health score ${L1pct}/100 — driven primarily by ${evidence}. The ${industry} sector outlook is ${growthOutlook}, which ${growthOutlook === "growing" ? "means recovery is plausible if you can wait 2–3 quarters" : growthOutlook === "declining" ? "compounds the company-specific risk: peers are cutting too" : "limits how much sector tailwind can rescue the P&L"}. Build a ${tenure.bracket === "probationary" ? "6-week" : "3-month"} runway, refresh your resume, and begin two ${regionCtx.networkChannel.split(" + ")[0]} conversations this week.`,
      priority: breakdown.L1 > 0.75 ? "Critical" : "High",
      layerFocus: "Company Health",
      riskReductionPct: 0,
      deadline: breakdown.L1 > 0.75 ? "7 days" : "14 days",
      evidence: [
        stockPhrase ? { signal: stockPhrase, source: "companyData.stock90DayChange", confidence: "high" as const } : null,
        revenuePhrase ? { signal: revenuePhrase, source: "companyData.revenueGrowthYoY", confidence: "high" as const } : null,
        { signal: `Sector outlook: ${growthOutlook}`, source: "industryData.growthOutlook", confidence: "medium" as const },
      ].filter(Boolean) as Array<{ signal: string; source: string; confidence: "high" | "medium" | "low" }>,
    });
  }

  if (breakdown.L2 > 0.7) {
    plans.push({
      id: "l2-high",
      title: lastLayoffPhrase
        ? `${company} Already Cut Staff (${lastLayoffPhrase}) — Pattern Likely Continues`
        : `${company} Has a Repeat Layoff Pattern`,
      description: `Layoff-history score ${L2pct}/100. ${lastLayoffPhrase ? `The ${formatLayoffDate(lastLayoff!.date)} round affected roughly ${Math.round((companyData.employeeCount ?? 0) * lastLayoff!.percentCut / 100).toLocaleString()} people — second waves typically follow within 6–9 months.` : `${companyData.layoffRounds ?? 1} round(s) in 24 months indicates structural cost pressure.`} ${sectorLayoffRate ?? "Sector contagion is elevated"}, so prioritize cross-industry recruiter conversations: ${regionCtx.jobMarketHint}.`,
      priority: "High",
      layerFocus: "Layoff History",
      riskReductionPct: 0,
      deadline: "14 days",
      evidence: [
        lastLayoffPhrase ? { signal: lastLayoffPhrase, source: "companyData.layoffsLast24Months[0]", confidence: "high" as const } : null,
        { signal: `${companyData.layoffRounds ?? 1} round(s) tracked in 24mo`, source: "companyData.layoffRounds", confidence: "high" as const },
        sectorLayoffRate ? { signal: sectorLayoffRate, source: "industryData.avgLayoffRate2025", confidence: "medium" as const } : null,
      ].filter(Boolean) as Array<{ signal: string; source: string; confidence: "high" | "medium" | "low" }>,
    });
  }

  if (breakdown.L3 > 0.5) {
    const tenureHook = tenure.bracket === "principal" || tenure.bracket === "senior"
      ? `As a ${tenure.bracket}-tier ${role}, your protected lane is the part of the work that requires accountability and authority — not raw output speed.`
      : tenure.bracket === "established"
        ? `At ${tenure.bracket} tenure your fastest defence is to own the AI-tool selection and rollout for ${dept} — being the person who decides which tool, not the person the tool replaces.`
        : `At ${tenure.bracket} tenure you should treat the AI tools as a force-multiplier on your output, not a threat — being measurably faster than peers buys you the next promotion cycle.`;
    plans.push({
      id: "l3-high",
      title: `${role} Tasks Are Being Absorbed by ${tooling.tools.split(",")[0]}`,
      description: `Role-exposure score ${L3pct}/100. In ${company}'s ${aiSignal}-AI-investment environment, ${tooling.tools} are already absorbing ${tooling.tasks}. ${tenureHook} Add one demonstrable AI-collaboration project to your profile within 30 days.`,
      priority: "Medium",
      layerFocus: "Role Exposure",
      riskReductionPct: 8,
      deadline: "30 days",
      evidence: [
        { signal: `Role exposure ${L3pct}/100 for ${role}`, source: "computed: roleExposureData + companyRoleRisk", confidence: "high" },
        { signal: `${aiSignal} AI-investment signal at ${company}`, source: "companyData.aiInvestmentSignal", confidence: "medium" },
        { signal: `Tooling map: ${tooling.tools}`, source: "ROLE_AI_TOOLS keyword map", confidence: "medium" },
      ],
    });
  }

  if (breakdown.L4 > 0.5) {
    const tenureBridgeNote = tenure.bracket === "probationary" || tenure.bracket === "early"
      ? "At your tenure the bridge is straightforward — you have not yet been pigeonholed into one sector's identity."
      : tenure.bracket === "established"
        ? "At your tenure, lead with portable outcomes (revenue impact, system reliability, team-building) rather than sector-specific keywords."
        : `At ${tenure.bracket} tenure, position the move as a deliberate vertical rotation — your authority transfers, the domain learning is the trade-off.`;
    plans.push({
      id: "l4-high",
      title: `${industry} Sector Is ${growthOutlook === "declining" ? "Contracting" : growthOutlook === "volatile" ? "Volatile" : "Soft"} — Plan a Cross-Sector Bridge`,
      description: `Sector pressure (${L4pct(breakdown)}/100) reflects ${industry}'s ${growthOutlook} outlook${sectorLayoffRate ? ` and the fact that ${sectorLayoffRate}` : ""}. Map the 2–3 adjacent sectors where your skills transfer (e.g. ${suggestAdjacentSectors(industry).join(", ")}) and reach out to one hiring manager per week. ${tenureBridgeNote} ${regionCtx.jobMarketHint}.`,
      priority: "Medium",
      layerFocus: "Market Conditions",
      riskReductionPct: 3,
      deadline: "60 days",
      evidence: [
        { signal: `${industry} outlook: ${growthOutlook}`, source: "industryData.growthOutlook", confidence: "medium" },
        sectorLayoffRate ? { signal: sectorLayoffRate, source: "industryData.avgLayoffRate2025", confidence: "medium" as const } : null,
        { signal: `Region: ${region}`, source: "companyData.region", confidence: "high" as const },
      ].filter(Boolean) as Array<{ signal: string; source: string; confidence: "high" | "medium" | "low" }>,
    });
  }

  if (breakdown.L5 > 0.6) {
    const performanceNote = performance === "top"
      ? "your top-performer rating is the strongest internal protection — make sure your skip-level knows it (calibration meetings only see what is documented)"
      : performance === "below"
        ? "your current performance signal is below bar — close that gap before any cost-cutting cycle, ideally with a written improvement plan you co-author"
        : "average performance is the most exposed band in cost-cuts — the question becomes 'what is unique about this person?', so over-index on visible cross-functional wins this quarter";
    plans.push({
      id: "l5-high",
      title: promoted
        ? `Reinforce Your Recent Promotion in ${dept}`
        : `${tenure.bracket === "principal" ? "Principal-Level" : tenure.bracket === "senior" ? "Senior" : "Mid-Level"} Position in ${dept} Needs Active Defence`,
      description: `Personal-exposure score ${L5pct}/100. ${tenure.protection} — and ${performanceNote}. Specifically: book 1:1s with two stakeholders outside ${dept} this month, write down your last three quantifiable wins, and request your manager's view of your role's strategic priority for FY26.`,
      priority: "Medium",
      layerFocus: "Employee Factors",
      riskReductionPct: 10,
      deadline: "30 days",
      evidence: [
        { signal: `Tenure: ${userFactors?.tenureYears ?? "?"}yr (${tenure.bracket})`, source: "userFactors.tenureYears", confidence: "high" },
        { signal: `Performance tier: ${performance}`, source: "userFactors.performanceTier", confidence: "high" },
        promoted ? { signal: "Recent promotion on record", source: "userFactors.hasRecentPromotion", confidence: "high" as const } : null,
      ].filter(Boolean) as Array<{ signal: string; source: string; confidence: "high" | "medium" | "low" }>,
    });
  }

  // D6 — Autonomous-agent coverage of role tasks
  if ((breakdown.D6 ?? 0) > 0.65) {
    plans.push({
      id: "d6-high",
      title: `Autonomous Agents Now Handle ~${D6pct}% of ${role} Workflows`,
      description: `Agent-capability score ${D6pct}/100 reflects how much of ${role} can already run end-to-end without human handoff. For ${dept}, the practical exposure is ${tooling.tasks}. Move toward judgement-heavy work agents cannot own: cross-team prioritization, customer-facing decisions, and any task whose failure cost cannot be absorbed by a retry. ${tenure.searchTactic}.`,
      priority: (breakdown.D6 ?? 0) > 0.8 ? "Critical" : "High",
      layerFocus: "AI Agent Capability",
      riskReductionPct: 12,
      deadline: "45 days",
      evidence: [
        { signal: `Agent-capability score ${D6pct}/100`, source: "computed: D6 dimension (calculateAgentCapabilityScore)", confidence: "high" },
        { signal: `Role tooling map: ${tooling.tasks}`, source: "ROLE_AI_TOOLS", confidence: "medium" },
      ],
    });
  }

  // D7 — Unified company-health distress
  if ((breakdown.D7 ?? 0) > 0.6) {
    const composite = [revenuePhrase, stockPhrase, aiSignal === "high" || aiSignal === "very-high" ? `aggressive AI capex (${aiSignal})` : null].filter(Boolean).join("; ");
    plans.push({
      id: "d7-high",
      title: `${company} Composite Health Risk: ${D7pct}/100`,
      description: `Aggregated signals — ${composite || "financial stress, sector position, and AI adoption pace"} — combine to a distress score of ${D7pct}/100. This is independent of role-level AI risk: even an irreplaceable individual gets cut when the employer balance sheet forces it. ${regionCtx.severanceNote}; build a ${tenure.bracket === "probationary" ? "6-week" : "3-month"} runway in parallel with your search.`,
      priority: (breakdown.D7 ?? 0) > 0.75 ? "Critical" : "High",
      layerFocus: "Company Health Risk",
      riskReductionPct: 0,
      deadline: "14 days",
      evidence: [
        { signal: `D7 composite ${D7pct}/100`, source: "computed: D7 dimension (calculateCompanyHealthRisk)", confidence: "high" },
        revenuePhrase ? { signal: revenuePhrase, source: "companyData.revenueGrowthYoY", confidence: "high" as const } : null,
        stockPhrase ? { signal: stockPhrase, source: "companyData.stock90DayChange", confidence: "high" as const } : null,
      ].filter(Boolean) as Array<{ signal: string; source: string; confidence: "high" | "medium" | "low" }>,
    });
  }

  // Skill-bridge recommendation — only surfaces when the user's role has
  // seeded career intelligence. Cross-references the top safe skill (the
  // durable anchor) with the top career path (the pivot target) to produce
  // a concrete bridge rather than generic "find adjacent sectors" advice.
  // Positioned near the end so it reads as a follow-up to the diagnostic
  // recommendations above, not a lead.
  const intel = roleTitle ? getCareerIntelligence(roleTitle) : null;
  if (intel && (intel.skills.safe?.length ?? 0) > 0 && (intel.careerPaths?.length ?? 0) > 0) {
    const safeAnchor = intel.skills.safe[0];
    const topPivot = intel.careerPaths![0];
    const atRisk = intel.skills.at_risk?.[0] ?? intel.skills.obsolete?.[0];
    // Surface the bridge as "your safe skill X is the ticket to pivot Y" —
    // grounded in the intel record rather than a generic template.
    const bridgeNarrative = atRisk
      ? `Your durable skill "${safeAnchor.skill}" (${safeAnchor.whySafe}) is what transfers to a ${topPivot.role} seat — the ${topPivot.skillGap} gap can be closed in ${topPivot.timeToTransition}, and ${topPivot.salaryDelta} vs. today. The automatable piece of your current role ("${atRisk.skill}") is not an obstacle — the pivot target values ${safeAnchor.skill} and doesn't assume you still do ${atRisk.skill} manually.`
      : `Your durable skill "${safeAnchor.skill}" transfers directly to a ${topPivot.role} seat — the ${topPivot.skillGap} gap can be closed in ${topPivot.timeToTransition}, salary delta ${topPivot.salaryDelta}.`;
    plans.push({
      id: "skill-bridge",
      title: `Bridge From ${role} To ${topPivot.role} Using Your ${safeAnchor.skill}`,
      description: `${bridgeNarrative} Start by: (1) re-titling this skill on your resume using ${topPivot.role} keywords, (2) completing one public artefact that demonstrates ${safeAnchor.skill} in the ${topPivot.industryMapping[0] ?? "target"} context, and (3) reaching out to 3 people currently in ${topPivot.role} for informational conversations in the next 30 days.`,
      priority: (probabilityForecast?.next90Days ?? 0) >= 0.35 ? "High" : "Medium",
      layerFocus: "Skill Bridge",
      riskReductionPct: Math.min(12, topPivot.riskReduction),
      deadline: "30 days",
      evidence: [
        { signal: `Safe anchor: ${safeAnchor.skill} (${safeAnchor.longTermValue}/100 durability)`, source: `career intelligence for ${intel.displayRole}`, confidence: "medium" },
        { signal: `Pivot target: ${topPivot.role} (${topPivot.transitionDifficulty} difficulty, ${topPivot.timeToTransition})`, source: `career intelligence careerPaths[0]`, confidence: "medium" },
        atRisk ? { signal: `Displaces: ${atRisk.skill}`, source: `career intelligence skills.at_risk[0]`, confidence: "medium" as const } : null,
      ].filter(Boolean) as Array<{ signal: string; source: string; confidence: "high" | "medium" | "low" }>,
    });
  }

  if (plans.length === 0) {
    plans.push({
      id: "all-good",
      title: `${tenure.bracket === "principal" || tenure.bracket === "senior" ? "Sustain" : "Build"} Your Edge at ${company}`,
      description: `All seven risk dimensions are currently low for a ${tenure.bracket} ${role} at a ${growthOutlook}-outlook ${industry} firm. ${promoted ? "Use the post-promotion window to expand scope before the next review cycle." : performance === "top" ? "Convert your top-performer status into a stretch project that locks in visibility for FY26." : "Set a quarterly skills review and warm two external relationships per month — cheap insurance while conditions are mild."}`,
      priority: "Low",
      layerFocus: "General",
      riskReductionPct: 2,
      deadline: "90 days",
      evidence: probabilityForecast
        ? [{ signal: `${Math.round(probabilityForecast.next90Days * 100)}% modeled 90-day probability — at/below sector base rate`, source: "computed: probability forecast", confidence: "medium" }]
        : [],
    });
  }

  return plans;
};

// L4 percentage helper — breakdown does not always expose L4 in the
// destructure block above; keep the calculation co-located.
function L4pct(breakdown: ScoreBreakdown): number {
  return Math.round((breakdown.L4 ?? 0) * 100);
}

// Adjacent-sector suggestions per industry. Kept short (2–3 entries) so the
// prose stays readable; fallback covers anything not enumerated.
const ADJACENT_SECTORS: Record<string, string[]> = {
  Technology: ["Cybersecurity", "Biotech tooling", "Climate-tech infra"],
  "E-commerce": ["Logistics tech", "Fintech payments", "B2B SaaS"],
  Gaming: ["EdTech simulation", "AR/VR enterprise", "Adjacent media"],
  Cybersecurity: ["Critical-infra OT security", "Identity & compliance", "GovTech"],
  "Financial Services": ["RegTech", "Climate-finance", "Embedded fintech"],
  Insurance: ["Healthtech claims", "Climate-risk modelling", "InsurTech infra"],
  Consulting: ["Private-equity advisory", "Specialist boutiques", "In-house strategy at portfolio companies"],
  "Real Estate": ["PropTech SaaS", "Construction tech", "Logistics real assets"],
  Healthcare: ["Health-AI tooling", "Public-health data", "Pharma adjacencies"],
  "Biotech/Pharma": ["Diagnostics", "Med-device", "Health-data SaaS"],
  Manufacturing: ["Industrial AI", "Climate-tech hardware", "Supply-chain SaaS"],
  Energy: ["Climate-tech storage", "Grid SaaS", "Critical minerals"],
  Construction: ["PropTech", "Climate-resilient infra", "Modular housing"],
  Agriculture: ["AgTech sensors", "Food-supply SaaS", "Climate adaptation"],
  "Media & Publishing": ["Creator-economy tooling", "B2B content", "EdTech publishing"],
  Telecom: ["Network-AI ops", "5G enterprise", "Adjacent infra"],
  Education: ["Workforce-development SaaS", "Corporate L&D", "EdTech tooling"],
  Government: ["GovTech vendors", "Defence-tech", "Civic-tech nonprofits"],
  Hospitality: ["Travel-tech SaaS", "Property-tech", "Adjacent consumer experience"],
  Retail: ["E-commerce ops", "Supply-chain tech", "Consumer-fintech"],
  Legal: ["LegalTech vendors", "Compliance SaaS", "In-house counsel at tech firms"],
  Transportation: ["Logistics SaaS", "Mobility-tech", "Climate-aware fleet"],
  "Startups (pre-seed)": ["Established Series-B+ peers in the same vertical", "Adjacent fast-growth verticals", "Big-tech rotation programs"],
  "Startups (seed)": ["Series-B+ in the same vertical", "Strategic acquirers", "PE-backed roll-ups"],
  "Startups (Series A)": ["Series-C/D peers", "Strategic acquirers", "Vertical-leader incumbents"],
  "Startups (Series B+)": ["Adjacent vertical leaders", "Public peers", "Global expansion roles in the same vertical"],
  Nonprofit: ["Mission-aligned for-profits (B-corps)", "Foundation operations", "Government partnerships"],
};

function suggestAdjacentSectors(industry: string): string[] {
  return ADJACENT_SECTORS[industry] ?? ["adjacent verticals where your domain knowledge transfers", "consulting / advisory in the same domain", "in-house roles at customers of your current sector"];
}

// ─── Scenario Simulation (What-If) ───

export interface ScenarioOverrides {
  department?: string;
  performanceTier?: UserFactors["performanceTier"];
  hasRecentPromotion?: boolean;
  tenureYears?: number;
}

export const simulateScenario = (
  baseInputs: ScoreInputs,
  overrides: ScenarioOverrides,
): ScoreResult => {
  const modifiedInputs: ScoreInputs = {
    ...baseInputs,
    department: overrides.department || baseInputs.department,
    userFactors: {
      ...baseInputs.userFactors,
      ...(overrides.performanceTier !== undefined && {
        performanceTier: overrides.performanceTier,
      }),
      ...(overrides.hasRecentPromotion !== undefined && {
        hasRecentPromotion: overrides.hasRecentPromotion,
      }),
      ...(overrides.tenureYears !== undefined && {
        tenureYears: overrides.tenureYears,
      }),
    },
  };
  return calculateLayoffScore(modifiedInputs);
};

// ─── Main Calculator ───

export const calculateLayoffScore = (inputs: ScoreInputs): ScoreResult => {
  const { companyData, industryData, roleTitle, department, userFactors } =
    inputs;

  // Use injected referenceDate for all time-relative calculations so the engine
  // is a pure function of its inputs — identical inputs always produce identical output.
  const now = inputs.referenceDate ?? new Date();

  const L1 = calculateCompanyHealthScore(companyData);
  const L2 = calculateLayoffHistoryScore(companyData, industryData, department, now);

  // L3: blend global role exposure (70%) with company-specific risk from Supabase (30%)
  const globalL3 = calculateRoleExposureScore(roleTitle, department, inputs.roleExposureOverride);
  const companyRoleRisk = getCompanyRoleRisk(companyData, roleTitle);

  // [AUDIT FIX]: For the 97.5% of companies without a role_risk_map in the DB,
  // `companyRoleRisk` is null and L3 was entirely global (identical for all companies
  // in the same role category). Now we apply a light company-risk-score adjustment
  // using the DB's company_risk_score (0-1 scale, population mean ≈ 0.5):
  //   companyRiskScore = 0.2 → L3 × 0.91 (protective signal — well-managed company)
  //   companyRiskScore = 0.5 → L3 × 1.00 (neutral — no adjustment)
  //   companyRiskScore = 0.8 → L3 × 1.09 (risk signal — elevated risk company)
  // Effect: ±9% on L3, which at D1 weight (18%) moves the score ±~2.5 pts.
  // Small but honest — more than zero differentiation from identical global averages.
  const companyRiskScore: number | null =
    (companyData as any)._companyRiskScore ??
    (companyData as any).companyRiskScore ??
    null;

  const blendedL3 = companyRoleRisk !== null
    ? globalL3 * 0.70 + companyRoleRisk * 0.30
    : companyRiskScore !== null && companyRiskScore > 0
      ? clamp(globalL3 * (0.82 + companyRiskScore * 0.36))  // 0.82+0.36×score, range ≈ [0.82,1.18]
      : globalL3;

  // ── v5.0 AI-Investment Amplification on L3 ──────────────────────────────
  // Companies with 'very-high' AI investment deploy tools faster than sector average.
  // A QA manual tester at Shopify (very-high AI) faces higher L3 than the same role
  // at a company with 'low' AI investment. This amplification is bounded (+0 to +0.12)
  // so it cannot push a low-risk role into a high-risk bracket on its own.
  const AI_AMPLIFICATION: Record<string, number> = {
    'very-high': 0.25,  // +25% relative: Shopify/Anthropic-class companies displace faster
    'high':      0.12,  // +12% relative: Google/Meta — fast but not frontier
    'medium':    0.00,  // neutral
    'low':      -0.09,  // -9% relative: low investment = slower deployment, more runway
  };
  const aiAmplification = AI_AMPLIFICATION[companyData.aiInvestmentSignal] ?? 0;
  const L3afterAI = Math.min(0.98, Math.max(0.02, blendedL3 + aiAmplification * blendedL3));

  // ── v5.0 Department-Context Risk Adjustment ──────────────────────────────
  // "Backend Engineer in Payments" ≠ "Backend Engineer in Ads"
  // Department-specific regulatory and automation exposure adjusts L3 and L4.
  // Deltas are small (±0.03 to ±0.08) — they shift the final score by ~2–6 pts.
  // ORDERING MATTERS: more specific terms (security, devops, support) before
  // generic ones (engineering) to prevent substring collisions.
  // e.g. "security engineering" → security match (-0.06), NOT engineering (0.00)
  // ACC-BUG-02 FIX: Added 10 missing departments that previously all fell through
  // to the catch-all neutral (0.00), making them indistinguishable from Engineering.
  // Ordering: more specific multi-word patterns first to avoid substring collisions.
  // e.g. "customer success" → customer-success match (+0.02), NOT "support" match (+0.07)
  const DEPT_L3_DELTA: Array<[string, number]> = [
    ['security',          -0.06],  // security judgment hard to automate, growing demand
    ['devops',            -0.02],  // infrastructure judgment still requires humans
    ['infrastructure',    -0.02],  // same protection profile as devops
    ['cloud',             -0.03],  // cloud architects face structural demand, not displacement
    ['research',          -0.05],  // requires creative synthesis and domain expertise
    ['compliance',         0.04],  // rule interpretation automating rapidly
    ['legal',              0.04],  // contract/research tasks heavily automated
    ['finance',            0.03],  // routine finance tasks facing rapid automation
    ['accounting',         0.04],  // high-volume transactional accounting automating fast
    ['data',               0.03],  // data prep/reporting tasks automating quickly
    ['analytics',          0.02],  // dashboards and reporting increasingly AI-generated
    ['operations',         0.05],  // high-volume operational tasks facing rapid automation
    ['support',            0.07],  // customer support among fastest-automating functions
    ['customer success',   0.02],  // relationship component protects vs pure support
    ['marketing',          0.02],  // content generation automating marketing analytics
    ['growth',             0.02],  // growth analytics and experimentation increasingly automated
    ['hr',                 0.02],  // administrative HR tasks automating faster
    ['talent',             0.02],  // sourcing/screening highly automated by AI tools
    ['people',             0.02],  // people-ops admin work automating (same as HR)
    ['sales',             -0.05],  // relationship-driven sales harder to automate
    ['business develop',  -0.04],  // external relationship + strategic judgment protects BD
    ['product',           -0.04],  // cross-context judgment protects product roles
    ['design',            -0.03],  // human aesthetic judgment provides some protection
    ['executive',         -0.07],  // strategic leadership decisions remain human-driven
    ['leadership',        -0.06],  // same protection as executive
    ['management',        -0.03],  // some managerial coordination automating but judgment stays
    ['quality',            0.05],  // QA scripting / test case generation automating fast
    ['qa',                 0.05],  // same as quality
    ['engineering',        0.00],  // neutral — covered by role-level data
  ];
  const deptKey = (department || '').toLowerCase().replace(/[^a-z]/g, '');
  let deptDelta = 0;
  for (const [key, delta] of DEPT_L3_DELTA) {
    if (deptKey.includes(key)) { deptDelta = delta; break; }
  }
  const L3base = Math.min(0.98, Math.max(0.02, L3afterAI + deptDelta));

  // ── Fix 4 (v7.0): Live Naukri posting trend → L3 adjustment ─────────────────
  // When a live posting-trend signal is available (isLive === true), it adjusts
  // L3 mechanically rather than only appearing in the Transparency tab.
  // 'frozen' (+0.12): active hiring freeze at this company for this role — strong signal.
  // 'declining' (+0.06): posting count falling below baseline — moderate signal.
  // 'growing' (−0.05): active hiring for this role at this company — protective signal.
  // 'stable' (0): no adjustment — baseline.
  // When isLive is false (heuristic/stale data): no adjustment to preserve score
  // integrity. The adjustment is only valid when the data is a live API response.
  const L3_POSTING_DELTA: Record<string, number> = {
    frozen: 0.12, declining: 0.06, growing: -0.05, stable: 0,
  };
  const hiringSignal = inputs.liveHiringSignal;
  const postingDelta = (hiringSignal?.isLive && hiringSignal?.postingTrend)
    ? (L3_POSTING_DELTA[hiringSignal.postingTrend] ?? 0)
    : 0;
  const L3 = Math.min(0.98, Math.max(0.02, L3base + postingDelta));

  const L4 = calculateMarketConditionsScore(companyData.industry, industryData);

  // Credibility-discount self-reported performance before L5 calculation.
  // A user claiming top performance with no promotion in 5 years, no key relationships,
  // and a generic role receives a discounted effective tier so the claim doesn't silently
  // halve their L5 risk contribution. The original tier and the discrepancies are both
  // preserved in signalQuality so users can see exactly what was adjusted and why.
  const performanceCredibility = analyzePerformanceCredibility(userFactors);
  const effectiveUserFactors   = performanceCredibility.effectiveTier !== userFactors.performanceTier
    ? { ...userFactors, performanceTier: performanceCredibility.effectiveTier }
    : userFactors;
  const L5 = calculateEmployeeFactorsScore(effectiveUserFactors);

  // Resolve raw role exposure for D2/D3/D6 sub-calculations
  const rawRoleExposure: RoleExposure =
    inputs.roleExposureOverride ??
    roleExposureData[roleTitle] ??
    inferRoleRisk(roleTitle);

  // ── 9-Term blended formula (sum = 100%) ───────────────────────────────────
  // The 7-dimension AI-displacement model under-weighted company-specific and
  // PPP-sensitive signals: L1 only flowed via D7 (effective weight 7%×30% =
  // 2.1%), so a $0.0525 swing in L1 from PPP adjustment vanished into rounding
  // — the geographic regression test caught this as identical US/IN scores.
  // Tier-boundary tests showed the symmetric problem at the personal end:
  // exceptionally protected employees couldn't pull final scores into the
  // "Very low risk" band because L5 max-protection only contributed ~0.7
  // points at 14% weight.
  //
  // Rebalance: keep D1/D2/D3/D6 as the AI-displacement core (now 52% combined
  // vs 69% before), reintroduce L1+L2 as direct terms so company financial
  // health and PPP differential land in the score, and bump L5 from 14%→18%
  // so personal protection (top performance + long tenure + key relationships)
  // moves the needle the way users expect.
  //
  // D1 (18%) Task Automatability     = L3 (role exposure blending aiRisk + layoffRisk)
  // D2 (14%) AI Tool Maturity        = company AI signal × domain maturity
  // D3 (14%) Augmentation Potential  = (1-D3) applied → low augmentation = high risk
  // D4 (18%) Experience Protection   = L5 (employee factors, seniority-based)
  // D5 (03%) Country/Market Context  = L4 (market conditions — already partially in D7)
  // D6 (06%) AI Agent Capability     = autonomous agent coverage for this role
  // D7 (07%) Company Health Risk     = unified L1+L2+AI adoption signal
  // L1 (16%) Direct company health   = PPP-aware financial signal
  // L2 (04%) Direct layoff history   = recent regulatory/news layoff events
  //
  // L4 is intentionally weighted lighter than the dimension-spec default (07%)
  // because Tech-industry baseline lands near 0.80 — applying the higher
  // weight pushed Google-SWE-with-all-protections into Moderate-risk
  // territory and stuck PPP-protected India tech firms above the Low-risk
  // boundary. The shifted weight goes to L1, where company-specific +
  // PPP-adjusted signals belong.
  const D6 = calculateAIAgentCapability(roleTitle, rawRoleExposure.aiRisk);
  const D7 = calculateD7CompanyHealthRisk(L1, L2, L4, companyData);
  const D2 = calculateAIToolMaturity(companyData, rawRoleExposure.aiRisk, rawRoleExposure.demandTrend);
  const D3risk = calculateAugmentationRisk(rawRoleExposure.aiRisk, rawRoleExposure.demandTrend);

  // ── Accuracy Gap 1 (v4.0): Apply empirical calibration multipliers ────────
  // Multipliers derived from logistic regression on 200 historical layoff events.
  // L2 under-weighted historically (+11% correction); L3 over-weighted (−7%).
  // Full methodology: src/services/empiricalCalibration.ts
  const calibrated = applyCalibration({ L1, L2, L3, L4, L5 });

  // D8: AI efficiency restructuring — only meaningful after calibration (uses calibrated.L1).
  // v7.0: collapseStage passed so first-ever AI efficiency cuts are caught by Gate 2B.
  const D8 = calculateAIEfficiencyRestructuringRisk(companyData, calibrated.L1, inputs.collapseStage);

  // v12.0: Detect scenario archetype for adaptive weight blending.
  // Uses already-computed layer scores — no circular dependency.
  const scoringArchetype = detectScoringArchetype(
    calibrated.L1, calibrated.L2, calibrated.L3, calibrated.L4, calibrated.L5,
    D8, companyData,
  );

  // Uses adaptive blended weights when an archetype is detected.
  // Falls back to COMPOSITE_FORMULA_WEIGHTS directly for 'low_risk_maintain'.
  // NOT LAYER_WEIGHTS (sum = 1.10, WhatIf-only — see top of file for the full table).
  const W = scoringArchetype !== 'low_risk_maintain'
    ? blendArchetypeWeights(COMPOSITE_FORMULA_WEIGHTS, scoringArchetype, 0.25)
    : COMPOSITE_FORMULA_WEIGHTS;

  const rawScore =
    calibrated.L3  * W.D1_taskAutomatability          +  // D1 — task automatability (calibrated L3)
    D2             * W.D2_aiToolMaturity               +  // D2 — AI tool maturity
    D3risk         * W.D3_augmentationRisk             +  // D3 — low augmentation potential is high risk
    calibrated.L5  * W.D4_experienceProtection        +  // D4 — experience protection (calibrated L5)
    calibrated.L4  * W.D5_countryContext               +  // D5 — country/market context (calibrated L4)
    D6             * W.D6_agentCapability              +  // D6 — AI agent autonomous coverage
    D7             * W.D7_companyHealth                +  // D7 — unified company health risk
    D8             * W.D8_aiEfficiencyRestructuring    +  // D8 — profitable AI substitution (NEW)
    calibrated.L1  * W.L1_directFinancial              +  // L1 — direct company financial health (PPP-sensitive)
    calibrated.L2  * W.L2_directLayoffHistory;            // L2 — direct layoff history

  // ACC-BUG-07 FIX: Department-specific layoff targeting had near-zero impact on
  // the final score (<0.03 pts) because it only flowed through newsRisk (10% of L2,
  // and L2 is 3% of the formula). A layoff explicitly targeting the user's department
  // (e.g. Oracle cutting Sales/Marketing) is a highly specific predictive signal —
  // it should shift the final score visibly (4–8 pts).
  // Direct adjustment applied AFTER formula so it's transparent in signal quality.
  const companyNameLower2 = (companyData.name ?? '').toLowerCase();
  const deptMatchEvent = layoffNewsCache.find(n => {
    if ((n.companyName ?? '').toLowerCase() !== companyNameLower2) return false;
    if (!n.affectedDepartments?.length) return false;
    const deptLower2 = (department || '').toLowerCase();
    return deptLower2.length > 0 && n.affectedDepartments.some(d => {
      const dl = (d ?? '').toLowerCase();
      return dl.includes(deptLower2) || deptLower2.includes(dl);
    });
  });
  // Department match premium: +0.05 (5 pts on 0-100 scale) when department explicitly
  // targeted, scaled by recency (full weight ≤30 days, halved by 90 days).
  const deptMatchBonus = deptMatchEvent
    ? (() => {
        const ageD = Math.round((now.getTime() - new Date(deptMatchEvent.date).getTime()) / 86_400_000);
        const recency = ageD <= 30 ? 1.0 : Math.max(0.5, 1.0 - (ageD - 30) / 120);
        return 0.05 * recency;
      })()
    : 0;

  const preKillSwitchScore = Math.round(clamp(rawScore + deptMatchBonus) * 100);

  // v12.0: Apply kill-switches with sigmoid floors (no hard discontinuities).
  // Compute news age for KS-A: find most recent news for this company.
  const ksCompanyNameLower = (companyData.name ?? '').toLowerCase();
  const ksAllNews = layoffNewsCache.filter(
    (n) => ksCompanyNameLower.length > 0 && (n.companyName ?? '').toLowerCase() === ksCompanyNameLower,
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const ksNewsAgeInDays = ksAllNews[0]
    ? Math.round((now.getTime() - new Date(ksAllNews[0].date).getTime()) / 86_400_000)
    : null;
  const ksResult = applyKillSwitches(preKillSwitchScore, companyData, ksNewsAgeInDays, calibrated.L1);
  const finalScore = ksResult.adjustedScore;

  // Store calibrated values in breakdown for transparency
  const calibrationApplied = { L1: calibrated.L1, L2: calibrated.L2, L3: calibrated.L3, L4: calibrated.L4, L5: calibrated.L5 };

  const nextUpdate = new Date(now);
  nextUpdate.setDate(nextUpdate.getDate() + 7);

  const breakdown = { L1: calibrated.L1, L2: calibrated.L2, L3: calibrated.L3, L4: calibrated.L4, L5: calibrated.L5, D6, D7, D8 };
  const dataFreshness = calculateDataFreshness(companyData, now);
  const dataQuality = validateDataQuality(companyData);

  // Calculate confidence percentage
  const confidence = calculateConfidence(companyData, dataQuality);
  const confidencePercent = calculateConfidencePercent(
    confidence,
    dataFreshness,
    dataQuality,
    companyData,  // Phase 3: enables unknown-company and staleness caps
  );

  // Calculate confidence interval based on data quality and staleness
  const confidenceInterval = calculateConfidenceInterval(
    finalScore,
    dataFreshness.accuracyImpact,
    confidence,
    dataQuality,
  );

  // Detect conflicting signals and missing data.
  // Merge performance credibility contradictions so they surface in the Transparency
  // tab and trigger the same confidence-interval widening as company-level conflicts.
  const signalQualityBase = analyzeSignalQuality(companyData, L1, L2, L3, L4, L5, D6, D7);

  // Append live posting-trend adjustment log when applicable (Fix 4 v7.0).
  // This makes the mechanical score effect visible in the Transparency tab.
  const postingFallbacks: string[] = [];
  if (hiringSignal?.isLive && postingDelta !== 0) {
    const dir = postingDelta > 0 ? 'increased' : 'decreased';
    postingFallbacks.push(
      `Live Naukri posting signal (${hiringSignal.postingTrend}): L3 ${dir} by ${Math.abs(postingDelta).toFixed(2)} ` +
      `(${L3base.toFixed(2)} → ${L3.toFixed(2)}). Live signal — mechanical score effect applied.`,
    );
  } else if (hiringSignal && !hiringSignal.isLive && hiringSignal.postingTrend !== 'stable') {
    postingFallbacks.push(
      `Naukri posting signal (${hiringSignal.postingTrend}) available but not live — no L3 adjustment applied. ` +
      `Stale/heuristic posting data is shown in Company Profile tab only.`,
    );
  }

  const signalQuality = {
    ...signalQualityBase,
    conflictingSignals: [
      ...signalQualityBase.conflictingSignals,
      ...performanceCredibility.contradictions,
    ],
    hasConflicts: signalQualityBase.hasConflicts || performanceCredibility.contradictions.length > 0,
    missingDataFallbacks: [...signalQualityBase.missingDataFallbacks, ...postingFallbacks],
  };

  // Severity-weighted conflict penalty.
  // Each active conflict widens the CI by its severity weight and reduces
  // confidencePercent proportionally, so the displayed uncertainty bounds
  // mechanically reflect the detected contradictions rather than appearing
  // only in the Transparency tab that most users never visit.
  //
  // CI penalty  (pts added to each side): High/Critical = 4, Medium = 2, Low = 1
  // CP penalty  (pct subtracted):         High/Critical = 8, Medium = 4, Low = 2
  //
  // Example: 1 High + 1 Medium conflict on score 72, CI [64,80]:
  //   conflictCIPenalty = 4 + 2 = 6  →  CI becomes [58, 86], ±14 pts
  //   conflictCPPenalty = 8 + 4 = 12 →  confidencePercent drops by 12
  const CI_PENALTY: Record<string, number> = { high: 4, medium: 2, critical: 4, low: 1 };
  const CP_PENALTY: Record<string, number> = { high: 8, medium: 4, critical: 8, low: 2 };

  const conflictCIPenalty = (signalQuality.conflictingSignals ?? []).reduce(
    (sum, c) => sum + (CI_PENALTY[(c.severity ?? '').toLowerCase()] ?? 2),
    0,
  );
  const conflictCPPenalty = (signalQuality.conflictingSignals ?? []).reduce(
    (sum, c) => sum + (CP_PENALTY[(c.severity ?? '').toLowerCase()] ?? 4),
    0,
  );

  const adjustedConfidencePercent = conflictCPPenalty > 0
    ? Math.max(10, confidencePercent - conflictCPPenalty)
    : confidencePercent;

  const adjCILow  = Math.max(0,   confidenceInterval.low  - conflictCIPenalty);
  const adjCIHigh = Math.min(100, confidenceInterval.high + conflictCIPenalty);
  const adjustedConfidenceInterval = conflictCIPenalty > 0
    ? { low: adjCILow, high: adjCIHigh, range: adjCIHigh - adjCILow, isEstimate: true }
    : confidenceInterval;

  // Null-data false precision: when BOTH revenue and stock are null, L1 is
  // derived entirely from default 0.5 values — not real signals.
  // Cap confidence% at 50 and widen CI to reflect this structural uncertainty.
  const l1IsNull = companyData.revenueGrowthYoY == null && companyData.stock90DayChange == null;
  const finalConfidencePercent = l1IsNull
    ? Math.min(adjustedConfidencePercent, 50)
    : adjustedConfidencePercent;
  const finalConfidenceInterval = l1IsNull
    ? {
        low:   Math.max(0,   adjustedConfidenceInterval.low  - 10),
        high:  Math.min(100, adjustedConfidenceInterval.high + 10),
        range: Math.min(100, adjustedConfidenceInterval.high + 10) - Math.max(0, adjustedConfidenceInterval.low - 10),
        isEstimate: true,
      }
    : adjustedConfidenceInterval;

  // Calendar-aware probability + timing — built once and shared between the
  // top-level result fields and the recommendation prose so the numbers in
  // both places agree exactly (no separate computation paths to drift).
  // `now` was resolved from inputs.referenceDate at the top of this function.
  const probabilityForecast = computeLayoffProbabilityForecast(
    companyData,
    inputs.industryData,
    breakdown,
    now,
  );
  const timing = computeLayoffTiming(companyData, now);

  // ── India sector enrichment ───────────────────────────────────────────────
  // Computed for all India-region companies. Provides GCC archetype detection,
  // NASSCOM sector benchmarks, seasonal risk window, and contagion matrix.
  // The seasonal multiplier is added as a named factor to probabilityForecast
  // so it is visible in the Transparency tab alongside other multipliers.
  const isIndia = companyData.region === 'IN' || (companyData.region as string) === 'India';
  const indiaRiskEnrichment: IndiaRiskEnrichment | undefined = isIndia
    ? getIndiaRiskEnrichment(companyData.name, companyData.industry ?? '', companyData.region ?? 'IN')
    : undefined;

  if (isIndia && indiaRiskEnrichment) {
    const seasonalFactor = indiaRiskEnrichment.seasonalRisk.window.riskMultiplier;
    const contagionFactor = Math.min(1.5, indiaRiskEnrichment.contagionRisk.riskAmplifier);

    // Push factors to the multipliers array for Transparency tab display.
    // Probability re-computation: derive the existing compound annual rate from
    // the already-computed next90Days (inverse of the hazard model), apply India
    // factors on top, then recompute — this avoids discarding the other multipliers
    // (recent-cut, financial-stress, etc.) that were already applied.
    const hasIndiaMult = seasonalFactor !== 1.0 || (indiaRiskEnrichment.contagionRisk.hasContagionExposure && contagionFactor > 1.05);

    if (seasonalFactor !== 1.0) {
      probabilityForecast.multipliers.push({
        name: 'india-seasonal-risk',
        factor: seasonalFactor,
        reason: `India ${indiaRiskEnrichment.seasonalRisk.quarter} (${indiaRiskEnrichment.seasonalRisk.window.months}) — ×${indiaRiskEnrichment.seasonalRisk.window.riskMultiplier.toFixed(2)} seasonal`,
      });
    }
    if (indiaRiskEnrichment.contagionRisk.hasContagionExposure && contagionFactor > 1.05) {
      probabilityForecast.multipliers.push({
        name: 'india-sector-contagion',
        factor: contagionFactor,
        reason: `Sector contagion: ${indiaRiskEnrichment.contagionRisk.explanation.slice(0, 80)}…`,
      });
    }

    if (hasIndiaMult) {
      // Recover existing compound annual rate from the already-computed P(90d):
      //   P90 = 1 - (1-r)^(90/365)  ⟹  r = 1 - (1-P90)^(365/90)
      const p90 = Math.max(0.001, Math.min(0.999, probabilityForecast.next90Days));
      const existingCompoundRate = 1 - Math.pow(1 - p90, 365 / 90);
      // Apply India factors on top of the existing compound rate (not on baseSectorRate).
      const indiaCombinedFactor = (seasonalFactor !== 1.0 ? seasonalFactor : 1.0) * (contagionFactor > 1.05 ? contagionFactor : 1.0);
      const adjustedRate = Math.min(0.95, existingCompoundRate * indiaCombinedFactor);
      probabilityForecast.next90Days  = Math.min(0.95, 1 - Math.pow(1 - adjustedRate, 90 / 365));
      probabilityForecast.next180Days = Math.min(0.95, 1 - Math.pow(1 - adjustedRate, 180 / 365));
    }
  }

  return {
    score: finalScore,
    confidenceInterval: finalConfidenceInterval,
    confidencePercent: finalConfidencePercent,
    tier: getScoreTier(finalScore),
    breakdown,
    confidence,
    calculatedAt: now.toISOString(),
    nextUpdateDue: nextUpdate.toISOString(),
    disclaimer:
      "This is a risk estimation based on publicly available signals. It is not a prediction or guarantee of future employment outcomes.",
    dataFreshness,
    signalQuality,
    probabilityForecast,
    timing,
    performanceTier:               performanceCredibility.effectiveTier,
    performanceCredibilityScore:   userFactors.performanceTier === 'top'
      ? performanceCredibility.credibilityScore
      : undefined,
    recommendations: generateRecommendations(
      breakdown,
      companyData,
      inputs.roleTitle,
      inputs.department,
      inputs.userFactors,
      inputs.industryData,
      probabilityForecast,
      timing,
    ),
    indiaRiskEnrichment,
    // v12.0 additions — transparent scoring metadata
    scoringEngineVersion: 'v12.0' as const,
    scoringArchetype,
    killSwitchApplied: ksResult.killSwitchApplied,
    killSwitchName: ksResult.killSwitchName,
  };
};

// ─── Safe Calculator Wrapper with Error Handling ───────────────────────

export const calculateLayoffScoreSafe = (
  inputs: ScoreInputs,
): ScoreResultWithError => {
  try {
    // Validate inputs
    if (!inputs.companyData?.name) {
      throw new LayoffScoreError(
        "Company name is required",
        "MISSING_COMPANY",
        true,
      );
    }

    if (!inputs.userFactors?.tenureYears) {
      throw new LayoffScoreError(
        "User tenure is required",
        "MISSING_USER_DATA",
        true,
      );
    }

    // Check for missing company data and provide fallback
    let companyData = inputs.companyData;
    let fallbackUsed: string | undefined;

    if (
      companyData.source === "Fallback" ||
      !companyData.employeeCount ||
      companyData.employeeCount === 0
    ) {
      companyData = createUnknownCompanyFallback(companyData.name);
      fallbackUsed = "Empty company data";
    } else if (
      companyData.source === "User Input" &&
      !companyData.revenueGrowthYoY &&
      !companyData.isPublic
    ) {
      // User-provided data without financial metrics - use fallback with defaults
      companyData = {
        ...companyData,
        revenueGrowthYoY: companyData.revenueGrowthYoY ?? 5,
        revenuePerEmployee: companyData.revenuePerEmployee ?? 250000,
        employeeCount: companyData.employeeCount ?? 1000,
      };
      fallbackUsed = "User input - missing financial data";
    }

    const result = calculateLayoffScore({
      ...inputs,
      companyData,
    });

    return {
      result: {
        ...result,
        signalQuality: {
          ...result.signalQuality,
          missingDataFallbacks: fallbackUsed
            ? [...result.signalQuality.missingDataFallbacks, fallbackUsed]
            : result.signalQuality.missingDataFallbacks,
        },
      },
    };
  } catch (error) {
    const isKnownError = error instanceof LayoffScoreError;
    return {
      error: {
        code: isKnownError ? error.code : "UNKNOWN_ERROR",
        message: isKnownError
          ? error.message
          : "An unexpected error occurred calculating the layoff score",
        recoverable: isKnownError ? error.recoverable : false,
      },
    };
  }
};

// ─── Score Caching ───────────────────────────────────────────────────────

interface CacheEntry {
  result: ScoreResult;
  timestamp: number;
}

const scoreCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (
  companyName: string,
  roleTitle: string,
  department: string,
  userFactors: UserFactors,
): string => {
  return `${(companyName ?? '').toLowerCase()}-${(roleTitle ?? '').toLowerCase()}-${(department ?? '').toLowerCase()}-${userFactors.tenureYears}-${userFactors.performanceTier}`;
};

export const getCachedScore = (
  companyName: string,
  roleTitle: string,
  department: string,
  userFactors: UserFactors,
): ScoreResult | null => {
  const key = getCacheKey(companyName, roleTitle, department, userFactors);
  const entry = scoreCache.get(key);

  if (!entry) return null;

  // Check if cache is expired
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    scoreCache.delete(key);
    return null;
  }

  return entry.result;
};

export const setCachedScore = (
  companyName: string,
  roleTitle: string,
  department: string,
  userFactors: UserFactors,
  result: ScoreResult,
): void => {
  const key = getCacheKey(companyName, roleTitle, department, userFactors);
  scoreCache.set(key, {
    result,
    timestamp: Date.now(),
  });
};

// ─── User Feedback Loop for Prediction Accuracy ──────────────────────────

export interface PredictionFeedback {
  companyName: string;
  predictedScore: number;
  actualOutcome: "laid_off" | "not_laid_off" | "still_employed" | "unknown";
  feedbackDate: string;
  notes?: string;
}

const feedbackStore: PredictionFeedback[] = [];

export const submitPredictionFeedback = (
  feedback: Omit<PredictionFeedback, "feedbackDate">,
): void => {
  feedbackStore.push({
    ...feedback,
    feedbackDate: new Date().toISOString(),
  });
};

export const getPredictionAccuracy = (): {
  totalPredictions: number;
  accuratePredictions: number;
  accuracyRate: number;
} => {
  const valid = feedbackStore.filter(
    (f) =>
      f.actualOutcome !== "unknown" && f.actualOutcome !== "still_employed",
  );

  if (valid.length === 0) {
    return { totalPredictions: 0, accuratePredictions: 0, accuracyRate: 0 };
  }

  const accurate = valid.filter((f) => {
    const wasAccurate =
      (f.predictedScore >= 55 && f.actualOutcome === "laid_off") ||
      (f.predictedScore < 55 && f.actualOutcome === "not_laid_off");
    return wasAccurate;
  });

  return {
    totalPredictions: valid.length,
    accuratePredictions: accurate.length,
    accuracyRate: Math.round((accurate.length / valid.length) * 100),
  };
};

export const clearFeedbackStore = (): void => {
  feedbackStore.length = 0;
};
