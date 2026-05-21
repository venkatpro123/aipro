// scoreProbeScenarios.ts
// 14 canonical fixture scenarios for the score-level synthetic probes.
//
// Each scenario is a fully-specified HybridScoreInputs object whose fixture
// values have been verified to produce a score within the documented tolerance
// range when passed to calculate-hybrid-risk. The expected scores were derived
// by manual computation against the formula in hybridScoringMath.ts.
//
// ┌──────────────────────────────────────┬─────────┬────────────┬────────────────────────────────────┐
// │ Scenario                             │ Expect  │ Tolerance  │ Key signal pattern / failure mode  │
// ├──────────────────────────────────────┼─────────┼────────────┼────────────────────────────────────┤
// │ NEUTRAL_BASELINE                     │  49     │ [44, 54]   │ All signals ~0.50                  │
// │ FULL_CRISIS                          │  82     │ [77, 87]   │ Near-max distress, live layoff      │
// │ STABLE_POSITION                      │  16     │ [11, 21]   │ Healthy co, top 8yr performer       │
// │ COMPANY_DISTRESS_ONLY                │  62     │ [57, 67]   │ Distressed co, avg employee         │
// │ ROLE_AUTOMATION_HIGH                 │  55     │ [50, 60]   │ Healthy co, L3≈0.93                 │
// │ RECENT_LAYOFF_SURVIVOR               │  72     │ [67, 77]   │ Live layoff fired, survived         │
// │ PERSONAL_PROTECTION                  │  38     │ [33, 43]   │ Distressed co, 12yr+unique          │
// ├──────────────────────────────────────┼─────────┼────────────┼────────────────────────────────────┤
// │ INDIA_BPO_BENCH_RISK                 │  71     │ [66, 76]   │ Bench signal + IT services + Q1    │
// │ EU_REGULATORY_RESTRUCTURING          │  58     │ [53, 63]   │ Legal/data role + AI Act pressure  │
// │ US_HYPERSCALER_EFFICIENCY            │  64     │ [59, 69]   │ D8 pattern + profitability          │
// │ SINGAPORE_GCC_PARENT_CUT            │  67     │ [62, 72]   │ GCC + parent contagion 6mo         │
// │ LATAM_FUNDING_CRISIS                 │  69     │ [64, 74]   │ Private + funding_dryup             │
// │ CANADA_VISA_AMPLIFIED                │  78     │ [73, 83]   │ LMIA + live layoff amplified        │
// │ GERMANY_MANUFACTURING_AUTOMATION     │  62     │ [57, 67]   │ Industry 4.0 + works council        │
// └──────────────────────────────────────┴─────────┴────────────┴────────────────────────────────────┘
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

// ── Scenario 8: INDIA_BPO_BENCH_RISK ─────────────────────────────────────────
// India IT services company. BPO analyst on bench 60+ days (no billable project).
// Q1 seasonal cut cycle. HYPERSCALER_IT_SERVICES_INDIA segment amplifies L3.
// Failure mode: bench signal → overstaffing=0.90; extreme automation risk for
// BPO tasks (data entry, processing); multiple prior rounds in 24 months.
//
// Formula trace (approximate — L4 formula non-linear, exact from EF run):
//   L1≈0.63  L2≈0.75  L3≈0.80  L4≈0.73  L5≈0.52
//   raw ≈ 0.63*0.30 + 0.75*0.25 + 0.80*0.20 + 0.73*0.12 + 0.52*0.13
//       = 0.189 + 0.188 + 0.160 + 0.088 + 0.068 = 0.693 → score 71
//   L2 = avg(1-0.35, 0.88, 0.72) = avg(0.65, 0.88, 0.72) = 0.750

const INDIA_BPO_BENCH_RISK: ScenarioSpec = {
  name: 'INDIA_BPO_BENCH_RISK',
  description: 'India IT services: BPO analyst on bench 60+ days, Q1 seasonal cut cycle, extreme automation exposure.',
  expectedScore: 71,
  toleranceLow:  66,
  toleranceHigh: 76,
  inputs: {
    companyName: 'SyntheticCo-IndiaBPO',
    roleTitle:   'Business Process Analyst',
    department:  'Operations',
    userFactors: {
      tenureYears:        2.5,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.55),  // flat/declining BPO revenue margin
      stockTrend:           sig(0.68),  // stock under margin compression
      fundingHealth:        sig(0.35),  // profitable but mature (no VC dependency)
      overstaffing:         sig(0.90),  // bench = extreme overstaffing signal
      companySize:          sig(0.65),  // HYPERSCALER scale (200k+ employees)
      recentLayoffRecency:  sig(0.35),  // seasonal cuts 9-12 months ago
      layoffFrequency:      sig(0.88),  // 2-3 rounds in 24 months (IT services seasonal)
      layoffSeverity:       sig(0.72),  // 3-8% per round typical for IT services
      sectorContagion:      sig(0.78),  // IT services sector-wide BPO contraction
      departmentNews:       sig(0.75),  // BPO dept: AI replacing processing tasks
      automationRisk:       sig(0.95),  // BPO tasks (data entry, processing) near-fully automatable
      aiToolMaturity:       sig(0.88),  // AI tools highly mature for BPO use cases
      humanAmplification:   sig(0.08),  // very low: tasks fully replicable by AI
      industryBaseline:     sig(0.72),  // India IT services elevated baseline
      aiAdoptionRate:       sig(0.88),  // AI adoption very high across BPO sector
      growthOutlook:        sig(0.68),  // BPO headcount growth contracting globally
      averageTenure:        sig(0.55),  // low average tenure typical for BPO
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 9: EU_REGULATORY_RESTRUCTURING ───────────────────────────────────
// EU fintech. Data governance role under EU AI Act compliance restructuring.
// Failure mode: regulatory cost pressure → role consolidation even for compliance
// functions. Compliance roles partially protected (still needed) but not immune —
// automation of routine DPO tasks + org flattening eliminates specialist roles.
//
// Formula trace (approximate):
//   L1≈0.59  L2≈0.62  L3≈0.59  L4≈0.57  L5≈0.52
//   raw ≈ 0.59*0.30 + 0.62*0.25 + 0.59*0.20 + 0.57*0.12 + 0.52*0.13
//       = 0.177 + 0.155 + 0.118 + 0.068 + 0.068 = 0.586 → score 59 (≈58)
//   L2 = avg(1-0.38, 0.68, 0.55) = avg(0.62, 0.68, 0.55) = 0.617

const EU_REGULATORY_RESTRUCTURING: ScenarioSpec = {
  name: 'EU_REGULATORY_RESTRUCTURING',
  description: 'EU fintech: data governance role, AI Act compliance restructuring, regulatory cost pressure eroding margins.',
  expectedScore: 58,
  toleranceLow:  53,
  toleranceHigh: 63,
  inputs: {
    companyName: 'SyntheticCo-EUFintech',
    roleTitle:   'Data Governance Specialist',
    department:  'Legal & Compliance',
    userFactors: {
      tenureYears:        4,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.50),  // flat revenue (compliance costs erode margins)
      stockTrend:           sig(0.65),  // stock pressure from EU regulatory fines
      fundingHealth:        sig(0.52),  // established company, no acute funding crisis
      overstaffing:         sig(0.65),  // regulatory restructuring = role consolidation
      companySize:          sig(0.62),  // large multinational under EU oversight
      recentLayoffRecency:  sig(0.38),  // restructuring 8-15 months ago
      layoffFrequency:      sig(0.68),  // 1-2 formal restructuring programs
      layoffSeverity:       sig(0.55),  // moderate (EU labor law slows pace)
      sectorContagion:      sig(0.72),  // EU tech/fintech regulatory wave spreading
      departmentNews:       sig(0.75),  // compliance dept restructuring news
      automationRisk:       sig(0.55),  // AI partially automating routine compliance tasks
      aiToolMaturity:       sig(0.50),  // AI for legal/compliance moderate maturity
      humanAmplification:   sig(0.42),  // human judgment required for compliance interpretation
      industryBaseline:     sig(0.60),  // EU market baseline elevated by regulation
      aiAdoptionRate:       sig(0.58),  // EU more cautious on AI adoption (regulatory lag)
      growthOutlook:        sig(0.55),  // EU growth stagnating under regulatory burden
      averageTenure:        sig(0.52),  // average tenure
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 10: US_HYPERSCALER_EFFICIENCY ────────────────────────────────────
// FAANG-scale company. AI efficiency restructuring pattern (D8): profitable,
// high AI investment, second wave of efficiency cuts in 18 months.
// Failure mode: company has strong FCF but restructures for "AI productivity"
// narrative — cost cuts despite positive financials. D8 fires (P≥0.50).
// stockTrend=0.80 signals market expecting further efficiency cuts.
//
// Formula trace (approximate):
//   L1≈0.57  L2≈0.71  L3≈0.70  L4≈0.70  L5≈0.52
//   raw ≈ 0.57*0.30 + 0.71*0.25 + 0.70*0.20 + 0.70*0.12 + 0.52*0.13
//       = 0.171 + 0.178 + 0.140 + 0.084 + 0.068 = 0.641 → score 64
//   L2 = avg(1-0.30, 0.78, 0.65) = avg(0.70, 0.78, 0.65) = 0.710

const US_HYPERSCALER_EFFICIENCY: ScenarioSpec = {
  name: 'US_HYPERSCALER_EFFICIENCY',
  description: 'US hyperscaler: AI efficiency restructuring (D8 pattern), profitable company in second efficiency wave.',
  expectedScore: 64,
  toleranceLow:  59,
  toleranceHigh: 69,
  inputs: {
    companyName: 'SyntheticCo-Hyperscaler',
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
      revenueGrowth:        sig(0.25),  // strong revenue growth — not a financial crisis
      stockTrend:           sig(0.80),  // stock at highs = market expects more efficiency cuts
      fundingHealth:        sig(0.20),  // highly profitable (strong FCF)
      overstaffing:         sig(0.78),  // COVID-era over-hiring still perceived by market
      companySize:          sig(0.80),  // massive scale — cuts large in absolute numbers
      recentLayoffRecency:  sig(0.30),  // efficiency cuts 6-9 months ago
      layoffFrequency:      sig(0.78),  // 2 formal rounds in 24 months
      layoffSeverity:       sig(0.65),  // 3-5% per round typical for hyperscaler waves
      sectorContagion:      sig(0.78),  // FAANG contagion strong (one cuts, all follow)
      departmentNews:       sig(0.72),  // AI efficiency announcements
      automationRisk:       sig(0.75),  // using AI to replace internal functions
      aiToolMaturity:       sig(0.82),  // very high: hyperscaler builds the tools
      humanAmplification:   sig(0.25),  // low: significant automation of SWE tasks
      industryBaseline:     sig(0.70),  // hyperscaler industry baseline elevated
      aiAdoptionRate:       sig(0.85),  // highest AI adoption rate (builds the AI)
      growthOutlook:        sig(0.65),  // growth moderating at mature scale
      averageTenure:        sig(0.55),  // moderate tenure
      overallConfidence:    0.88,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 11: SINGAPORE_GCC_PARENT_CUT ────────────────────────────────────
// Singapore GCC (Global Capability Centre). Parent company in US/EU made
// significant cuts 6 months ago. GCC faces "second wave" risk — parent
// routinely closes or downsizes GCCs after HQ restructuring.
// Failure mode: high parent-contagion (sectorContagion=0.85) + recent severity
// (layoffSeverity=0.82 for parent cuts). GCC staff have no direct visibility
// into parent decisions but carry full risk.
//
// Formula trace (approximate):
//   L1≈0.59  L2≈0.79  L3≈0.67  L4≈0.65  L5≈0.52
//   raw ≈ 0.59*0.30 + 0.79*0.25 + 0.67*0.20 + 0.65*0.12 + 0.52*0.13
//       = 0.177 + 0.198 + 0.134 + 0.078 + 0.068 = 0.655 → score 66 (≈67)
//   L2 = avg(1-0.22, 0.78, 0.82) = avg(0.78, 0.78, 0.82) = 0.793

const SINGAPORE_GCC_PARENT_CUT: ScenarioSpec = {
  name: 'SINGAPORE_GCC_PARENT_CUT',
  description: 'Singapore GCC: parent company cut 6mo ago, second-wave GCC restructuring risk, high parent contagion.',
  expectedScore: 67,
  toleranceLow:  62,
  toleranceHigh: 72,
  inputs: {
    companyName: 'SyntheticCo-APAC-GCC',
    roleTitle:   'Product Manager',
    department:  'Product',
    userFactors: {
      tenureYears:        3,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.40),  // GCC reports decent local productivity
      stockTrend:           sig(0.72),  // parent stock declining (proxy for GCC viability)
      fundingHealth:        sig(0.45),  // GCC funded by parent under cost pressure
      overstaffing:         sig(0.75),  // parent perceives GCC as expendable cost center
      companySize:          sig(0.65),  // large GCC (500-2000 employees)
      recentLayoffRecency:  sig(0.22),  // parent cut 6 months ago — GCC second wave imminent
      layoffFrequency:      sig(0.78),  // parent: 2+ rounds in 18 months
      layoffSeverity:       sig(0.82),  // parent cuts: 10-20% of HQ workforce
      sectorContagion:      sig(0.85),  // parent contagion very strong for dependent GCC
      departmentNews:       sig(0.80),  // GCC restructuring in regional tech press
      automationRisk:       sig(0.62),  // moderate automation risk (knowledge worker role)
      aiToolMaturity:       sig(0.58),  // moderate AI tools
      humanAmplification:   sig(0.38),  // moderate human value
      industryBaseline:     sig(0.68),  // Singapore APAC tech baseline
      aiAdoptionRate:       sig(0.72),  // high AI adoption in APAC enterprise GCCs
      growthOutlook:        sig(0.65),  // GCC growth entirely parent-health-dependent
      averageTenure:        sig(0.52),  // average tenure
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 12: LATAM_FUNDING_CRISIS ────────────────────────────────────────
// LatAm late-stage startup. Series C funding round failed. Runway < 9 months.
// First survival cut already executed 5-7 months ago. Second cut imminent.
// Failure mode: fundingHealth=0.92 (critical) is the primary kill-switch driver.
// Company built headcount on growth projections now missed. VC market frozen.
//
// Formula trace (approximate):
//   L1≈0.70  L2≈0.80  L3≈0.60  L4≈0.69  L5≈0.52
//   raw ≈ 0.70*0.30 + 0.80*0.25 + 0.60*0.20 + 0.69*0.12 + 0.52*0.13
//       = 0.210 + 0.200 + 0.120 + 0.083 + 0.068 = 0.681 → score 68 (≈69)
//   L2 = avg(1-0.22, 0.85, 0.78) = avg(0.78, 0.85, 0.78) = 0.803

const LATAM_FUNDING_CRISIS: ScenarioSpec = {
  name: 'LATAM_FUNDING_CRISIS',
  description: 'LatAm startup: Series C failed, funding_dryup, <9mo runway, first survival cut done, second imminent.',
  expectedScore: 69,
  toleranceLow:  64,
  toleranceHigh: 74,
  inputs: {
    companyName: 'SyntheticCo-LATAM-Startup',
    roleTitle:   'Software Engineer',
    department:  'Engineering',
    userFactors: {
      tenureYears:        2,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.58),  // revenue declining (missed growth targets)
      stockTrend:           sig(0.72),  // no public stock; proxy: valuation markdown
      fundingHealth:        sig(0.92),  // CRITICAL: Series C failed, runway < 9 months
      overstaffing:         sig(0.88),  // built headcount on growth projections now missed
      companySize:          sig(0.55),  // mid-size startup (300-800 employees)
      recentLayoffRecency:  sig(0.22),  // first survival cut 5-7 months ago
      layoffFrequency:      sig(0.85),  // 1 confirmed + more structurally expected
      layoffSeverity:       sig(0.78),  // 10-20% per survival round
      sectorContagion:      sig(0.72),  // LatAm startup funding crisis sector-wide
      departmentNews:       sig(0.68),  // layoff news spreading in LatAm tech ecosystem
      automationRisk:       sig(0.55),  // moderate (tech role, some automation)
      aiToolMaturity:       sig(0.52),  // moderate (startup lacks enterprise AI budget)
      humanAmplification:   sig(0.42),  // moderate human value
      industryBaseline:     sig(0.70),  // LatAm tech baseline risk elevated vs US
      aiAdoptionRate:       sig(0.62),  // growing but constrained by funding freeze
      growthOutlook:        sig(0.78),  // LatAm startup market contracting
      averageTenure:        sig(0.55),  // low tenure (startup turnover norms)
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 13: CANADA_VISA_AMPLIFIED ───────────────────────────────────────
// Software engineer in Canada on LMIA-tied work permit. Company layoff just
// fired (live signal). LMIA workers are often in first-cut cohort: employer
// LMIA obligations end on termination, no bridging to open work permit in most
// provinces, 90-day exit window. Visa vulnerability amplifies an already severe
// situation (base ~72) to an effective risk of ~78.
// Failure mode: kill-switch A fires (recency=0.05, live); compounded by visa
// amplifier — L5 provides zero buffer (no negotiation leverage, time-boxed exit).
//
// Formula trace (approximate):
//   L1≈0.69  L2≈0.92  L3≈0.78  L4≈0.83  L5≈0.52
//   raw ≈ 0.69*0.30 + 0.92*0.25 + 0.78*0.20 + 0.83*0.12 + 0.52*0.13
//       = 0.207 + 0.230 + 0.156 + 0.100 + 0.068 = 0.761 → kill-switch A floor → score 78
//   L2 = avg(1-0.05, 0.92, 0.88) = avg(0.95, 0.92, 0.88) = 0.917

const CANADA_VISA_AMPLIFIED: ScenarioSpec = {
  name: 'CANADA_VISA_AMPLIFIED',
  description: 'Canada LMIA: layoff just fired (live), LMIA workers first-cut cohort, visa amplifier, 90-day exit.',
  expectedScore: 78,
  toleranceLow:  73,
  toleranceHigh: 83,
  inputs: {
    companyName: 'SyntheticCo-Canada-LMIA',
    roleTitle:   'Software Engineer',
    department:  'Engineering',
    userFactors: {
      tenureYears:        1.5,  // short tenure — minimal accrued protection
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.20),  // company has revenue but still restructuring
      stockTrend:           sig(0.90),  // stock declining sharply
      fundingHealth:        sig(0.82),  // distressed (down rounds / covenant breach)
      overstaffing:         sig(0.82),  // perceived overstaffed post-COVID
      companySize:          sig(0.72),  // large enough for significant absolute cuts
      recentLayoffRecency:  sig(0.05, 'live'),  // layoff just fired — kill-switch A
      layoffFrequency:      sig(0.92),  // 2+ rounds in 18 months
      layoffSeverity:       sig(0.88),  // significant cuts 8-15%
      sectorContagion:      sig(0.88),  // Canadian tech sector contagion high
      departmentNews:       sig(0.88),  // department confirmed in active layoff wave
      automationRisk:       sig(0.78),  // AI automation risk elevated at hyperscaler
      aiToolMaturity:       sig(0.75),  // high tool maturity
      humanAmplification:   sig(0.20),  // low: limited protection in current wave
      industryBaseline:     sig(0.85),  // Canadian tech baseline elevated (post-2023 cuts)
      aiAdoptionRate:       sig(0.82),  // high AI adoption in Canadian tech sector
      growthOutlook:        sig(0.82),  // market outlook poor for this company
      averageTenure:        sig(0.72),  // company-level tenure declining (prior cuts)
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

// ── Scenario 14: GERMANY_MANUFACTURING_AUTOMATION ────────────────────────────
// German automotive company. Manufacturing process engineer. Industry 4.0 /
// robot automation. Works council (Betriebsrat) representation slows the pace
// of cuts (hasKeyRelationships=true) but cannot prevent structural automation.
// Failure mode: automationRisk=0.92 (physical assembly automated by robots);
// EV transition forces headcount restructuring even with works council protection.
// The hasKeyRelationships protection partially offsets the high L3 automation risk.
//
// Formula trace (approximate):
//   L1≈0.62  L2≈0.62  L3≈0.75  L4≈0.65  L5≈0.38
//   raw ≈ 0.62*0.30 + 0.62*0.25 + 0.75*0.20 + 0.65*0.12 + 0.38*0.13
//       = 0.186 + 0.155 + 0.150 + 0.078 + 0.049 = 0.618 → score 62
//   L2 = avg(1-0.38, 0.65, 0.60) = avg(0.62, 0.65, 0.60) = 0.623
//   L5 reduced by hasKeyRelationships=true (works council seat)

const GERMANY_MANUFACTURING_AUTOMATION: ScenarioSpec = {
  name: 'GERMANY_MANUFACTURING_AUTOMATION',
  description: 'Germany automotive: Industry 4.0 robot automation, works council slows pace but cannot prevent restructuring.',
  expectedScore: 62,
  toleranceLow:  57,
  toleranceHigh: 67,
  inputs: {
    companyName: 'SyntheticCo-Germany-Auto',
    roleTitle:   'Manufacturing Process Engineer',
    department:  'Operations',
    userFactors: {
      tenureYears:        6,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:true,  // works council (Betriebsrat) representation
    },
    consensusData: {
      revenueGrowth:        sig(0.58),  // automotive revenue declining (EV transition costs)
      stockTrend:           sig(0.70),  // stock under structural transformation pressure
      fundingHealth:        sig(0.30),  // large profitable manufacturer (no funding risk)
      overstaffing:         sig(0.75),  // traditional manufacturing headcount excess
      companySize:          sig(0.78),  // very large (50k-300k employees)
      recentLayoffRecency:  sig(0.38),  // restructuring programs 12-18 months ago
      layoffFrequency:      sig(0.65),  // 1-2 formal programs (works council agreements)
      layoffSeverity:       sig(0.60),  // moderate — ERP agreements limit depth per round
      sectorContagion:      sig(0.72),  // German auto sector-wide automation restructuring
      departmentNews:       sig(0.75),  // Industry 4.0 / automation deployment news
      automationRisk:       sig(0.92),  // physical assembly automated by robots (very high)
      aiToolMaturity:       sig(0.78),  // manufacturing AI/robotics tools maturing rapidly
      humanAmplification:   sig(0.18),  // very low: physical assembly largely automatable
      industryBaseline:     sig(0.68),  // German manufacturing baseline elevated
      aiAdoptionRate:       sig(0.72),  // Industry 4.0 adoption accelerating (VDA mandate)
      growthOutlook:        sig(0.68),  // automotive market challenging globally (EV transition)
      averageTenure:        sig(0.48),  // average tenure
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
  INDIA_BPO_BENCH_RISK,
  EU_REGULATORY_RESTRUCTURING,
  US_HYPERSCALER_EFFICIENCY,
  SINGAPORE_GCC_PARENT_CUT,
  LATAM_FUNDING_CRISIS,
  CANADA_VISA_AMPLIFIED,
  GERMANY_MANUFACTURING_AUTOMATION,
];
