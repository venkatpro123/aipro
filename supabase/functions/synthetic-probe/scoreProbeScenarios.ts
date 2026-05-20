// scoreProbeScenarios.ts
// 7 canonical fixture scenarios for the score-level synthetic probes.
//
// Each scenario is a fully-specified HybridScoreInputs object whose fixture
// values have been verified to produce a score within the documented tolerance
// range when passed to calculate-hybrid-risk. The expected scores were derived
// by manual computation against the formula in hybridScoringMath.ts.
//
// ┌──────────────────────────────┬─────────┬────────────┬──────────────────────────────┐
// │ Scenario                     │ Expect  │ Tolerance  │ Key signal pattern           │
// ├──────────────────────────────┼─────────┼────────────┼──────────────────────────────┤
// │ NEUTRAL_BASELINE             │  49     │ [44, 54]   │ All signals ~0.50            │
// │ FULL_CRISIS                  │  82     │ [77, 87]   │ Near-max distress, live layoff│
// │ STABLE_POSITION              │  16     │ [11, 21]   │ Healthy co, top 8yr performer│
// │ COMPANY_DISTRESS_ONLY        │  62     │ [57, 67]   │ Distressed co, avg employee  │
// │ ROLE_AUTOMATION_HIGH         │  55     │ [50, 60]   │ Healthy co, L3≈0.93          │
// │ RECENT_LAYOFF_SURVIVOR       │  72     │ [67, 77]   │ Live layoff fired, survived  │
// │ PERSONAL_PROTECTION          │  38     │ [33, 43]   │ Distressed co, 12yr+unique   │
// └──────────────────────────────┴─────────┴────────────┴──────────────────────────────┘
//
// How to update expected scores:
//   1. Modify the fixture values below.
//   2. Compute the new expected score manually using the formulas in
//      hybridScoringMath.ts (or run the EF locally against the new inputs).
//   3. Update expectedScore, toleranceLow, toleranceHigh here.
//   4. Update the corresponding row in synthetic_probe_scenarios DB table
//      (migration 20260622000005 seeds the initial values).
//
// Signal value convention: higher value = higher risk (consistent with the
// scoring formula in hybridScoringMath.ts). Exceptions noted per field:
//   - recentLayoffRecency: 0 = very recent layoffs (HIGH risk), 1 = none (LOW risk)
//   - humanAmplification: 0 = role is fully automated (HIGH risk), 1 = protected

import type { HybridScoreInputs, ResolvedSignal } from '../_shared/scoringTypes.ts';

export interface ScenarioSpec {
  name: string;
  description: string;
  /** Midpoint for display — the exact score the fixture produces. */
  expectedScore: number;
  toleranceLow: number;
  toleranceHigh: number;
  inputs: HybridScoreInputs;
}

// ── Helper: build a clean ResolvedSignal with no conflicts ───────────────────
// Probes use only the `value` field for scoring; CI, conflicts, etc. are
// set to safe defaults so the fixture doesn't accidentally trip kill-switches
// via conflict penalties.
function sig(
  value: number,
  primarySource: ResolvedSignal['primarySource'] = 'db',
): ResolvedSignal {
  return {
    value,
    confidence: 0.85,
    confidenceInterval: {
      low:  Math.max(0, value - 0.04),
      high: Math.min(1, value + 0.04),
    },
    sourcesUsed: ['synthetic-probe'],
    stalenessDays: 0,
    hasConflict: false,
    conflicts: [],
    primarySource,
    dominantWeight: 1.0,
  };
}

// ── Shared freshness report — zero-age, no conflicts ─────────────────────────
const FRESH_REPORT = {
  oldestSignalAge:      0,
  avgSignalAge:         0,
  percentLive:          1.0,
  percentHeuristic:     0,
  totalSignalCount:     16,
  liveSignalCount:      16,
  heuristicSignalCount: 0,
} as const;

// ── Scenario 1: NEUTRAL_BASELINE ─────────────────────────────────────────────
// All signals near 0.45–0.55. No kill-switches fire.
// Computed score: 49. Formula trace:
//   L1=0.455  L2=0.500  L3=0.500  L4=0.540  L5=0.520
//   raw = 0.455*0.30 + 0.50*0.25 + 0.50*0.20 + 0.540*0.12 + 0.52*0.13
//       = 0.1365 + 0.125 + 0.100 + 0.0648 + 0.0676 = 0.494 → score 49

const NEUTRAL_BASELINE: ScenarioSpec = {
  name: 'NEUTRAL_BASELINE',
  description: 'All signals at 0.45–0.55, 3-year tenure, average performer.',
  expectedScore: 49,
  toleranceLow:  44,
  toleranceHigh: 54,
  inputs: {
    companyName: 'SyntheticCo-Neutral',
    roleTitle:   'Software Engineer',
    department:  'Engineering',
    userFactors: {
      tenureYears:        3,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.45),
      stockTrend:           sig(0.45),
      fundingHealth:        sig(0.45),
      overstaffing:         sig(0.45),
      companySize:          sig(0.50),
      recentLayoffRecency:  sig(0.50),
      layoffFrequency:      sig(0.50),
      layoffSeverity:       sig(0.50),
      sectorContagion:      sig(0.50),
      departmentNews:       sig(0.50),
      automationRisk:       sig(0.50),
      aiToolMaturity:       sig(0.50),
      humanAmplification:   sig(0.50),
      industryBaseline:     sig(0.40),
      aiAdoptionRate:       sig(0.45),
      growthOutlook:        sig(0.40),
      averageTenure:        sig(0.50),
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 2: FULL_CRISIS ───────────────────────────────────────────────────
// Near-maximum distress across all layers. Live-confirmed recent layoff.
// Kill-switch A fires (recency=0.05, primarySource='live') but rawScore > 0.70
// so the floor doesn't change anything.
// Computed score: 82. Formula trace:
//   L1=0.630  L2=0.985  L3=0.885  L4=1.000  L5=0.640
//   raw = 0.189 + 0.246 + 0.177 + 0.120 + 0.083 = 0.815 → score 82

const FULL_CRISIS: ScenarioSpec = {
  name: 'FULL_CRISIS',
  description: 'Near-maximum distress: live layoff confirmed, high automation, heavy financial stress.',
  expectedScore: 82,
  toleranceLow:  77,
  toleranceHigh: 87,
  inputs: {
    companyName: 'SyntheticCo-Crisis',
    roleTitle:   'Software Engineer',
    department:  'Engineering',
    userFactors: {
      tenureYears:        0.5,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.05),
      stockTrend:           sig(0.95),
      fundingHealth:        sig(0.95),
      overstaffing:         sig(0.95),
      companySize:          sig(0.90),
      recentLayoffRecency:  sig(0.05, 'live'), // very recent — kill-switch A
      layoffFrequency:      sig(1.00),
      layoffSeverity:       sig(1.00),
      sectorContagion:      sig(1.00),
      departmentNews:       sig(1.00),
      automationRisk:       sig(0.90),
      aiToolMaturity:       sig(0.85),
      humanAmplification:   sig(0.10),
      industryBaseline:     sig(0.80),
      aiAdoptionRate:       sig(0.85),
      growthOutlook:        sig(0.85),
      averageTenure:        sig(0.90),
      overallConfidence:    0.90,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport: {
        ...FRESH_REPORT,
        percentLive:     1.0,
        liveSignalCount: 16,
      },
    },
  },
};

// ── Scenario 3: STABLE_POSITION ──────────────────────────────────────────────
// Healthy company (low distress signals), unique top-performer at 8yr tenure.
// No kill-switches fire.
// Computed score: 16. Formula trace:
//   L1=0.158  L2=0.110  L3=0.200  L4=0.170  L5=0.186
//   raw = 0.047 + 0.028 + 0.040 + 0.020 + 0.024 = 0.159 → score 16

const STABLE_POSITION: ScenarioSpec = {
  name: 'STABLE_POSITION',
  description: 'Healthy growing company, minimal layoffs, unique top-performer with 8yr tenure.',
  expectedScore: 16,
  toleranceLow:  11,
  toleranceHigh: 21,
  inputs: {
    companyName: 'SyntheticCo-Stable',
    roleTitle:   'Principal Engineer',
    department:  'Engineering',
    userFactors: {
      tenureYears:        8,
      isUniqueRole:       true,
      performanceTier:    'top',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.15),
      stockTrend:           sig(0.18),
      fundingHealth:        sig(0.12),
      overstaffing:         sig(0.15),
      companySize:          sig(0.20),
      recentLayoffRecency:  sig(0.90),  // 0.90 = very distant layoffs (LOW risk)
      layoffFrequency:      sig(0.12),
      layoffSeverity:       sig(0.08),
      sectorContagion:      sig(0.15),
      departmentNews:       sig(0.08),
      automationRisk:       sig(0.20),
      aiToolMaturity:       sig(0.15),
      humanAmplification:   sig(0.75),
      industryBaseline:     sig(0.12),
      aiAdoptionRate:       sig(0.15),
      growthOutlook:        sig(0.15),
      averageTenure:        sig(0.10),
      overallConfidence:    0.90,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 4: COMPANY_DISTRESS_ONLY ────────────────────────────────────────
// Distressed company (high L1/L2) but average employee.
// Kill-switch B avoided: fundingHealth=0.55 < 0.60 threshold.
// Kill-switch A avoided: recentLayoffRecency=0.30 > 0.20.
// Computed score: 62. Formula trace:
//   L1=0.578  L2=0.728  L3=0.500  L4=0.833  L5=0.520
//   raw = 0.173 + 0.182 + 0.100 + 0.100 + 0.068 = 0.623 → score 62

const COMPANY_DISTRESS_ONLY: ScenarioSpec = {
  name: 'COMPANY_DISTRESS_ONLY',
  description: 'Distressed company (no kill-switch), average employee with no personal protection.',
  expectedScore: 62,
  toleranceLow:  57,
  toleranceHigh: 67,
  inputs: {
    companyName: 'SyntheticCo-Distressed',
    roleTitle:   'Software Engineer',
    department:  'Engineering',
    userFactors: {
      tenureYears:        3,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.25),
      stockTrend:           sig(0.85),
      fundingHealth:        sig(0.55), // below 0.60 → kill-switch B doesn't fire
      overstaffing:         sig(0.80),
      companySize:          sig(0.75),
      recentLayoffRecency:  sig(0.30), // above 0.20 → kill-switch A doesn't fire
      layoffFrequency:      sig(0.75),
      layoffSeverity:       sig(0.70),
      sectorContagion:      sig(0.75),
      departmentNews:       sig(0.75),
      automationRisk:       sig(0.50),
      aiToolMaturity:       sig(0.50),
      humanAmplification:   sig(0.50),
      industryBaseline:     sig(0.75),
      aiAdoptionRate:       sig(0.25),
      growthOutlook:        sig(0.25),
      averageTenure:        sig(0.50),
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 5: ROLE_AUTOMATION_HIGH ─────────────────────────────────────────
// Moderate company risk but extremely high automation exposure (L3≈0.93).
// No kill-switches fire.
// Computed score: 55. Formula trace:
//   L1=0.363  L2=0.338  L3=0.926  L4=0.878  L5=0.520
//   raw = 0.109 + 0.084 + 0.185 + 0.105 + 0.068 = 0.551 → score 55

const ROLE_AUTOMATION_HIGH: ScenarioSpec = {
  name: 'ROLE_AUTOMATION_HIGH',
  description: 'Moderate company risk plus very high automation exposure (L3≈0.93).',
  expectedScore: 55,
  toleranceLow:  50,
  toleranceHigh: 60,
  inputs: {
    companyName: 'SyntheticCo-AutomationRisk',
    roleTitle:   'Data Entry Specialist',
    department:  'Operations',
    userFactors: {
      tenureYears:        3,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.30),
      stockTrend:           sig(0.40),
      fundingHealth:        sig(0.35),
      overstaffing:         sig(0.40),
      companySize:          sig(0.45),
      recentLayoffRecency:  sig(0.65),
      layoffFrequency:      sig(0.35),
      layoffSeverity:       sig(0.30),
      sectorContagion:      sig(0.35),
      departmentNews:       sig(0.30),
      automationRisk:       sig(0.95),  // max automation exposure
      aiToolMaturity:       sig(0.90),
      humanAmplification:   sig(0.08),  // very low human amplification
      industryBaseline:     sig(0.65),
      aiAdoptionRate:       sig(0.80),
      growthOutlook:        sig(0.60),
      averageTenure:        sig(0.40),
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 6: RECENT_LAYOFF_SURVIVOR ───────────────────────────────────────
// Live layoff just fired (recency=0.05, source='live'). Employee survived but
// company remains in distress. Kill-switch A fires but rawScore already > 0.70.
// Kill-switch B also fires but doesn't change the score.
// Computed score: 72. Formula trace:
//   L1=0.565  L2=0.895  L3=0.685  L4=1.000  L5=0.520
//   raw = 0.170 + 0.224 + 0.137 + 0.120 + 0.068 = 0.719 → max(0.719, 0.70) → score 72

const RECENT_LAYOFF_SURVIVOR: ScenarioSpec = {
  name: 'RECENT_LAYOFF_SURVIVOR',
  description: 'Live layoff just fired; distressed company; employee survived round.',
  expectedScore: 72,
  toleranceLow:  67,
  toleranceHigh: 77,
  inputs: {
    companyName: 'SyntheticCo-PostLayoff',
    roleTitle:   'Software Engineer',
    department:  'Engineering',
    userFactors: {
      tenureYears:        3,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.20),
      stockTrend:           sig(0.85),
      fundingHealth:        sig(0.75), // > 0.60 — but stockTrend also > 0.70, kill-switch B fires; score already > 0.65
      overstaffing:         sig(0.70),
      companySize:          sig(0.65),
      recentLayoffRecency:  sig(0.05, 'live'), // very recent, live — kill-switch A
      layoffFrequency:      sig(0.85),
      layoffSeverity:       sig(0.85),
      sectorContagion:      sig(0.90),
      departmentNews:       sig(0.90),
      automationRisk:       sig(0.70),
      aiToolMaturity:       sig(0.65),
      humanAmplification:   sig(0.30),
      industryBaseline:     sig(0.80),
      aiAdoptionRate:       sig(0.80),
      growthOutlook:        sig(0.75),
      averageTenure:        sig(0.60),
      overallConfidence:    0.88,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport: {
        ...FRESH_REPORT,
        percentLive:     1.0,
        liveSignalCount: 16,
      },
    },
  },
};

// ── Scenario 7: PERSONAL_PROTECTION ──────────────────────────────────────────
// Distressed company but maximum personal protection signals:
//   12+ year tenure → mapTenure(12) = 0.18
//   unique role → uniquenessScore 0.18
//   top performer → perfScore 0.10
//   recent promotion bonus (-0.12) + key relationships bonus (-0.10)
//   → L5 base = 0.072 + 0.058 + 0.028 - 0.12 - 0.10 = -0.062 → clamped to 0.05
// No kill-switches fire (stockTrend=0.65 not > 0.70).
// Computed score: 38. Formula trace:
//   L1=0.473  L2=0.508  L3=0.170  L4=0.575  L5=0.050
//   raw = 0.142 + 0.127 + 0.034 + 0.069 + 0.007 = 0.379 → score 38

const PERSONAL_PROTECTION: ScenarioSpec = {
  name: 'PERSONAL_PROTECTION',
  description: 'Distressed company but 12yr+ tenure, unique role, top performer, recent promo.',
  expectedScore: 38,
  toleranceLow:  33,
  toleranceHigh: 43,
  inputs: {
    companyName: 'SyntheticCo-PersonalShield',
    roleTitle:   'Distinguished Engineer',
    department:  'Engineering',
    userFactors: {
      tenureYears:        12,
      isUniqueRole:       true,
      performanceTier:    'top',
      hasRecentPromotion: true,
      hasKeyRelationships:true,
    },
    consensusData: {
      revenueGrowth:        sig(0.25),
      stockTrend:           sig(0.65), // below 0.70 → kill-switch B doesn't fire
      fundingHealth:        sig(0.60),
      overstaffing:         sig(0.55),
      companySize:          sig(0.50),
      recentLayoffRecency:  sig(0.55),
      layoffFrequency:      sig(0.55),
      layoffSeverity:       sig(0.50),
      sectorContagion:      sig(0.55),
      departmentNews:       sig(0.50),
      automationRisk:       sig(0.20),
      aiToolMaturity:       sig(0.15),
      humanAmplification:   sig(0.85), // high human amplification = protected
      industryBaseline:     sig(0.45),
      aiAdoptionRate:       sig(0.35),
      growthOutlook:        sig(0.40),
      averageTenure:        sig(0.10),
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Exports ───────────────────────────────────────────────────────────────────

export const SCORE_PROBE_SCENARIOS: ScenarioSpec[] = [
  NEUTRAL_BASELINE,
  FULL_CRISIS,
  STABLE_POSITION,
  COMPANY_DISTRESS_ONLY,
  ROLE_AUTOMATION_HIGH,
  RECENT_LAYOFF_SURVIVOR,
  PERSONAL_PROTECTION,
];
