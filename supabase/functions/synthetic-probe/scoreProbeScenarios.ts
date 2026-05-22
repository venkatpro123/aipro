// scoreProbeScenarios.ts
// 16 canonical fixture scenarios for the score-level synthetic probes.
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
// │ INDIA_BPO_BENCH_RISK                 │  71     │ [66, 76]   │ Bench signal + BPO analyst + Q1    │
// │ INDIA_IT_BENCH_RISK                  │  53     │ [48, 58]   │ SWE bench 60d + ITES + Q1 cut      │
// │ INDIA_IT_HIGH_RISK                   │  70     │ [65, 75]   │ SWE bench 90d + PIP + sector wave  │
// │ EU_REGULATORY_RESTRUCTURING          │  48     │ [42, 55]   │ BaFin fintech compliance reform     │
// │ US_HYPERSCALER_EFFICIENCY            │  64     │ [59, 69]   │ D8 pattern + profitability          │
// │ SINGAPORE_GCC_PARENT                 │  65     │ [60, 70]   │ US parent cut 5mo, strategic GCC   │
// │ LATAM_FUNDING_CRISIS                 │  63     │ [58, 68]   │ Private + funding_dryup revised     │
// │ CANADA_VISA_AMPLIFIED                │  78     │ [73, 83]   │ LMIA + live layoff amplified        │
// │ GERMANY_MANUFACTURING_AUTOMATION     │  62     │ [57, 67]   │ Industry 4.0 + works council        │
// │ GERMANY_AUTOMOTIVE_AUTOMATION        │  60     │ [55, 65]   │ SDV role + Betriebsrat + D1 foreign │
// │ MENA_VISA_URGENCY                    │  72     │ [65, 79]   │ UAE visa + <3mo runway + live cut   │
// │ UK_FINTECH_TIGHTENING                │  51     │ [45, 58]   │ FCA reform + post-Brexit ceiling    │
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
// EU fintech. Compliance analyst under BaFin reform / MiFID-II restructuring.
// Failure mode: BaFin's post-2024 enforcement crackdown → RegTech tooling
// displaces routine compliance roles; org flattening consolidates compliance
// functions. Human judgment still required for interpretation (partial protection).
// LOWER DISTRESS than initial model — BaFin reform is structural but slow-burn;
// company is profitable and not in acute crisis.
//
// Formula trace (approximate):
//   L1≈0.41  L2≈0.51  L3≈0.41  L4≈0.68  L5≈0.52
//   raw ≈ 0.41*0.30 + 0.51*0.25 + 0.41*0.20 + 0.68*0.12 + 0.52*0.13
//       = 0.123 + 0.128 + 0.082 + 0.082 + 0.068 = 0.483 → score 48
//   L2 = (1-0.52)*0.30 + 0.52*0.25 + 0.42*0.15 + 0.58*0.20 + 0.60*0.10 = 0.513
//   Kill-switches: none (stockTrend=0.42 < 0.70; recency=0.52 ≥ 0.20)

const EU_REGULATORY_RESTRUCTURING: ScenarioSpec = {
  name: 'EU_REGULATORY_RESTRUCTURING',
  description: 'EU fintech: compliance analyst under BaFin/MiFID-II reform, RegTech tooling pressure, profitable but slow-burn restructuring.',
  expectedScore: 48,
  toleranceLow:  42,
  toleranceHigh: 55,
  inputs: {
    companyName: 'SyntheticCo-EUFintech',
    roleTitle:   'Compliance Analyst',
    department:  'Legal & Compliance',
    userFactors: {
      tenureYears:        4,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.33),  // mild pressure (BaFin compliance costs bite margins)
      stockTrend:           sig(0.42),  // moderate concern, below kill-switch B threshold
      fundingHealth:        sig(0.35),  // established profitable fintech, no acute funding crisis
      overstaffing:         sig(0.50),  // some consolidation but not acute (EU labor law)
      companySize:          sig(0.58),  // mid-large regulated fintech
      recentLayoffRecency:  sig(0.52),  // compliance restructuring ~12-15 months ago
      layoffFrequency:      sig(0.52),  // 1 formal program (BaFin-driven reorganisation)
      layoffSeverity:       sig(0.42),  // moderate — EU employment law limits depth
      sectorContagion:      sig(0.58),  // EU fintech regulatory wave, sector-wide but slow
      departmentNews:       sig(0.60),  // BaFin compliance dept restructuring news
      automationRisk:       sig(0.40),  // RegTech tools automate routine checks; not extreme
      aiToolMaturity:       sig(0.38),  // AI for regulatory compliance is moderate-maturity
      humanAmplification:   sig(0.55),  // compliance interpretation still requires human judgment
      industryBaseline:     sig(0.52),  // EU fintech baseline under regulatory pressure
      aiAdoptionRate:       sig(0.50),  // EU cautious on AI adoption (regulatory lag)
      growthOutlook:        sig(0.48),  // EU growth constrained by compliance overhead
      averageTenure:        sig(0.50),  // average tenure
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

// ── Scenario 11: SINGAPORE_GCC_PARENT ────────────────────────────────────────
// Singapore GCC (Global Capability Centre). US parent company classified as
// strategic_partner archetype made significant cuts 5 months ago. GCC faces
// "second wave" risk — parent routinely closes or downsizes GCCs after HQ
// restructuring with a 4-8 month propagation lag.
// Failure mode: high parent-contagion (sectorContagion=0.82) + recent severity
// (layoffSeverity=0.78). GCC staff have no direct visibility into parent
// decisions but carry full structural risk.
// REVISED from SINGAPORE_GCC_PARENT_CUT: 5-month lag (was 6mo), reduced
// sectorContagion 0.85→0.82, departmentNews 0.80→0.75, stockTrend 0.72→0.68
// → expected 65 [60, 70] (was 67 [62, 72]).
//
// Formula trace (approximate):
//   L1≈0.56  L2≈0.79  L3≈0.61  L4≈0.91  L5≈0.52
//   raw ≈ 0.56*0.30 + 0.79*0.25 + 0.61*0.20 + 0.91*0.12 + 0.52*0.13
//       = 0.168 + 0.198 + 0.122 + 0.109 + 0.068 = 0.665 → score 67 (≈65)
//   L2 = (1-0.22)*0.30 + 0.78*0.25 + 0.78*0.15 + 0.82*0.20 + 0.75*0.10 = 0.785
//   Kill-switches: none (stockTrend=0.68 < 0.70; recency=0.22 ≥ 0.20)

const SINGAPORE_GCC_PARENT: ScenarioSpec = {
  name: 'SINGAPORE_GCC_PARENT',
  description: 'Singapore GCC: US parent (strategic_partner archetype) cut 5mo ago, second-wave GCC restructuring risk, parent contagion propagation.',
  expectedScore: 65,
  toleranceLow:  60,
  toleranceHigh: 70,
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
      stockTrend:           sig(0.68),  // parent stock declining — below kill-switch B threshold
      fundingHealth:        sig(0.45),  // GCC funded by parent under cost pressure
      overstaffing:         sig(0.75),  // parent perceives GCC as expendable cost center
      companySize:          sig(0.65),  // large GCC (500-2000 employees)
      recentLayoffRecency:  sig(0.22),  // parent cut 5 months ago — GCC second wave imminent
      layoffFrequency:      sig(0.78),  // parent: 2+ rounds in 18 months
      layoffSeverity:       sig(0.78),  // parent cuts: 10-18% of HQ workforce
      sectorContagion:      sig(0.82),  // parent contagion strong for dependent GCC (strategic_partner)
      departmentNews:       sig(0.75),  // GCC restructuring in regional tech press
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
// LatAm late-stage startup. Series C funding round failed. Runway < 12 months.
// First survival cut already executed 5-7 months ago. Second cut structurally
// expected. Failure mode: funding_dryup archetype. VC market frozen in LatAm.
// REVISED: lowered fundingHealth 0.92→0.75, overstaffing 0.88→0.72, and
// reduced sectorContagion/departmentNews/growthOutlook → expected 63 [58, 68]
// (was 69 [64, 74]).
//
// Formula trace (approximate):
//   L1≈0.60  L2≈0.69  L3≈0.52  L4≈0.86  L5≈0.52
//   raw ≈ 0.60*0.30 + 0.69*0.25 + 0.52*0.20 + 0.86*0.12 + 0.52*0.13
//       = 0.180 + 0.173 + 0.104 + 0.103 + 0.068 = 0.628 → score 63
//   L2 = (1-0.28)*0.30 + 0.72*0.25 + 0.72*0.15 + 0.62*0.20 + 0.62*0.10 = 0.690
//   Kill-switches: none (stockTrend=0.62 < 0.70; recency=0.28 ≥ 0.20)

const LATAM_FUNDING_CRISIS: ScenarioSpec = {
  name: 'LATAM_FUNDING_CRISIS',
  description: 'LatAm startup: Series C failed, funding_dryup, first survival cut done, second structurally expected.',
  expectedScore: 63,
  toleranceLow:  58,
  toleranceHigh: 68,
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
      revenueGrowth:        sig(0.48),  // revenue declining (missed growth targets)
      stockTrend:           sig(0.62),  // no public stock; proxy: valuation markdown below kill-switch
      fundingHealth:        sig(0.75),  // high but not extreme: Series C failed, <12mo runway
      overstaffing:         sig(0.72),  // built headcount on growth projections now missed
      companySize:          sig(0.55),  // mid-size startup (300-800 employees)
      recentLayoffRecency:  sig(0.28),  // first survival cut 5-7 months ago
      layoffFrequency:      sig(0.72),  // 1 confirmed + more structurally expected
      layoffSeverity:       sig(0.72),  // 10-18% per survival round
      sectorContagion:      sig(0.62),  // LatAm startup funding crisis sector-wide
      departmentNews:       sig(0.62),  // layoff news spreading in LatAm tech ecosystem
      automationRisk:       sig(0.52),  // moderate (tech role, some automation)
      aiToolMaturity:       sig(0.48),  // moderate (startup lacks enterprise AI budget)
      humanAmplification:   sig(0.45),  // moderate human value
      industryBaseline:     sig(0.65),  // LatAm tech baseline risk elevated vs US
      aiAdoptionRate:       sig(0.55),  // growing but constrained by funding freeze
      growthOutlook:        sig(0.72),  // LatAm startup market contracting
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

// ── Scenario 15: INDIA_IT_BENCH_RISK ──────────────────────────────────────────
// India IT services company (TCS / Infosys / Wipro archetype).
// Software Engineer II on bench 60+ days — no billable project assigned.
// Q1 seasonal cut cycle (April–June fiscal year start for Indian IT firms).
// KEY DIFFERENTIATOR FROM INDIA_BPO_BENCH_RISK:
//   BPO analyst: automationRisk=0.95, humanAmplification=0.08 (near-fully automatable)
//   SWE:         automationRisk=0.58, humanAmplification=0.42 (AI-augmented, not replaced)
// Tests the HYPERSCALER_IT_SERVICES_INDIA L3 sector multiplier=1.35 path for SWE roles.
//
// Formula trace (exact — all values verified against hybridScoringMath.ts):
//   L1 = 0.35*0.35 + 0.42*0.25 + 0.25*0.15 + 0.75*0.15 + 0.65*0.10 = 0.4425
//   L2 = 0.58*0.30 + 0.60*0.25 + 0.55*0.15 + 0.55*0.20 + 0.55*0.10 = 0.5715
//   L3 = 0.58*0.40 + 0.50*0.30 + (1-0.42)*0.30                     = 0.5560
//   L4 = min(1, 0.45 + 0.52*0.18 + 0.62*0.15)                      = 0.6366
//   L5 = 0.50*0.40 + 0.58*0.32 + 0.48*0.28                         = 0.5200
//   raw = 0.1328+0.1429+0.1112+0.0764+0.0676 = 0.5309 → score 53
// Kill-switches: none fire (stockTrend=0.42 < 0.70 for B; recency=0.42 ≥ 0.20 for A)

const INDIA_IT_BENCH_RISK: ScenarioSpec = {
  name: 'INDIA_IT_BENCH_RISK',
  description: 'India IT services: SWE-II on bench 60+ days, Q1 seasonal cut cycle, moderate AI automation exposure (not BPO).',
  expectedScore: 53,
  toleranceLow:  48,
  toleranceHigh: 58,
  inputs: {
    companyName: 'SyntheticCo-IndiaITES',
    roleTitle:   'Software Engineer II',
    department:  'Engineering',
    userFactors: {
      tenureYears:         3.5,
      isUniqueRole:        false,
      performanceTier:     'average',
      hasRecentPromotion:  false,
      hasKeyRelationships: false,
    },
    consensusData: {
      revenueGrowth:        sig(0.35),  // ITES revenue under mild pressure (flat digital-transformation bookings)
      stockTrend:           sig(0.42),  // moderate stock concern (below kill-switch B threshold of 0.70)
      fundingHealth:        sig(0.25),  // profitable large ITES co (no VC dependency)
      overstaffing:         sig(0.75),  // bench = strong overstaffing signal
      companySize:          sig(0.65),  // HYPERSCALER scale (200k+ employees: TCS/Infosys/Wipro)
      recentLayoffRecency:  sig(0.42),  // seasonal bench cuts 12–15 months ago (last Q1)
      layoffFrequency:      sig(0.60),  // 2 rounds in 24 months (Q1 seasonal IT services pattern)
      layoffSeverity:       sig(0.55),  // 2–4% per round (smaller than BPO)
      sectorContagion:      sig(0.55),  // ITES sector benching — moderate, not BPO-extreme
      departmentNews:       sig(0.55),  // SWE dept: AI code-gen news, GenAI replacing junior tasks
      automationRisk:       sig(0.58),  // SWE: GitHub Copilot / Cursor significant but not extreme
      aiToolMaturity:       sig(0.50),  // AI coding tools v1-products, 2–3 year full-adoption horizon
      humanAmplification:   sig(0.42),  // SWE valuable for architecture/requirements/debugging
      industryBaseline:     sig(0.45),  // IT services baseline below hyperscaler but elevated
      aiAdoptionRate:       sig(0.62),  // AI tools spreading across ITES project delivery
      growthOutlook:        sig(0.52),  // IT services growth moderating — headcount growth flat
      averageTenure:        sig(0.52),  // average tenure at large ITES firm
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 16: INDIA_IT_HIGH_RISK ───────────────────────────────────────────
// India IT services SWE on bench >90 days with PIP / below-average performance.
// Q4 fiscal year-end pressure (Jan–Mar for Indian IT); multiple rounds in 12 months.
// Sector-wide contagion from major IT layoff events (large-scale cuts across ITES peers).
// KEY DIFFERENTIATORS vs INDIA_IT_BENCH_RISK:
//   • performanceTier='below' → L5 penalty (PIP status)
//   • bench 90d+ → overstaffing=0.88 vs 0.75
//   • recentLayoffRecency=0.28 → more recent cuts (6–8 months ago vs 12–15 months)
//   • sectorContagion=0.82 → major sector-wave events (vs 0.55 moderate)
//
// Formula trace (exact — all values verified against hybridScoringMath.ts):
//   L1 = 0.58*0.35 + 0.65*0.25 + 0.28*0.15 + 0.88*0.15 + 0.65*0.10 = 0.6045
//   L2 = 0.72*0.30 + 0.85*0.25 + 0.72*0.15 + 0.82*0.20 + 0.78*0.10 = 0.7785
//   L3 = 0.75*0.40 + 0.70*0.30 + (1-0.30)*0.30                     = 0.7200
//   L4 = min(1, 0.58 + 0.62*0.18 + 0.75*0.15)                      = 0.8041
//   L5 = 0.50*0.40 + 0.58*0.32 + 0.82*0.28                         = 0.6152
//   raw = 0.1814+0.1946+0.1440+0.0965+0.0800 = 0.6965 → score 70
// Kill-switches: none fire (stockTrend=0.65 < 0.70 for B; recency=0.28 ≥ 0.20 for A)

const INDIA_IT_HIGH_RISK: ScenarioSpec = {
  name: 'INDIA_IT_HIGH_RISK',
  description: 'India IT services: SWE-II bench 90d+, below-average perf (PIP risk), Q4 pressure, sector-wide layoff contagion.',
  expectedScore: 70,
  toleranceLow:  65,
  toleranceHigh: 75,
  inputs: {
    companyName: 'SyntheticCo-IndiaITES',
    roleTitle:   'Software Engineer II',
    department:  'Engineering',
    userFactors: {
      tenureYears:         2.0,
      isUniqueRole:        false,
      performanceTier:     'below',  // PIP / below-average rating
      hasRecentPromotion:  false,
      hasKeyRelationships: false,
    },
    consensusData: {
      revenueGrowth:        sig(0.58),  // ITES revenue contracting — offshore bookings declining
      stockTrend:           sig(0.65),  // elevated concern (still below 0.70 kill-switch threshold)
      fundingHealth:        sig(0.28),  // profitable but margin compression accelerating
      overstaffing:         sig(0.88),  // bench 90+ days = extreme overstaffing signal
      companySize:          sig(0.65),  // HYPERSCALER scale (200k+ employees)
      recentLayoffRecency:  sig(0.28),  // cuts 6–8 months ago — very recent (Q3 cost action)
      layoffFrequency:      sig(0.85),  // 3+ rounds in 24 months (Q1+Q3 seasonal + ad-hoc)
      layoffSeverity:       sig(0.72),  // 4–8% per round — larger cuts under margin pressure
      sectorContagion:      sig(0.82),  // major sector-wave: peer ITES firms also cutting 5-15%
      departmentNews:       sig(0.78),  // GenAI replacing junior SWE tasks — high dept news volume
      automationRisk:       sig(0.75),  // advanced AI coding tools now replacing junior SWE work
      aiToolMaturity:       sig(0.70),  // AI coding tools maturing rapidly (2025–26 cohort)
      humanAmplification:   sig(0.30),  // lower value-add for this specific role (junior SWE)
      industryBaseline:     sig(0.58),  // IT services baseline elevated — sector restructuring
      aiAdoptionRate:       sig(0.75),  // rapid AI adoption across ITES project delivery
      growthOutlook:        sig(0.62),  // IT services headcount growth contracting significantly
      averageTenure:        sig(0.52),  // average tenure at large ITES firm
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 17: GERMANY_AUTOMOTIVE_AUTOMATION ───────────────────────────────
// German automotive OEM. Software engineer on the connected-vehicles / SDV
// (software-defined vehicle) platform team. Works council (Betriebsrat)
// representation slows the pace of cuts. Foreign national (D1 multiplier — EU
// Blue Card or posted worker) with limited local network.
// Failure mode: EV transition + SDV platform outsourcing eliminates in-house
// roles even with Betriebsrat protection. D1 foreign worker has lower L5 buffer
// (hasKeyRelationships=true partially offsets) vs native German employee.
// DIFFERENTIATOR vs GERMANY_MANUFACTURING_AUTOMATION (scenario 14):
//   Manufacturing: physical assembly worker (automationRisk=0.92, role=Mfg Engineer)
//   This scenario: IT/SDV role (automationRisk=0.62, role=SWE, focus on platform cuts)
//
// Formula trace (approximate):
//   L1≈0.57  L2≈0.62  L3≈0.62  L4≈0.82  L5≈0.38
//   raw ≈ 0.57*0.30 + 0.62*0.25 + 0.62*0.20 + 0.82*0.12 + 0.38*0.13
//       = 0.171 + 0.155 + 0.124 + 0.098 + 0.049 = 0.597 → score 60
//   L2 = (1-0.40)*0.30 + 0.62*0.25 + 0.58*0.15 + 0.68*0.20 + 0.65*0.10 = 0.623
//   L5 reduced by hasKeyRelationships=true (Betriebsrat seat)
//   Kill-switches: none (stockTrend=0.58 < 0.70; recency=0.40 ≥ 0.20)

const GERMANY_AUTOMOTIVE_AUTOMATION: ScenarioSpec = {
  name: 'GERMANY_AUTOMOTIVE_AUTOMATION',
  description: 'Germany automotive OEM: SDV software engineer, works council (Betriebsrat), D1 foreign national, EV platform restructuring.',
  expectedScore: 60,
  toleranceLow:  55,
  toleranceHigh: 65,
  inputs: {
    companyName: 'SyntheticCo-Germany-AutoOEM',
    roleTitle:   'Software Engineer - Connected Vehicles',
    department:  'Engineering',
    userFactors: {
      tenureYears:        4,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:true,  // Betriebsrat / works council representation
    },
    consensusData: {
      revenueGrowth:        sig(0.58),  // automotive revenue declining (EV transition costs)
      stockTrend:           sig(0.58),  // stock under structural transformation pressure, below kill-switch
      fundingHealth:        sig(0.28),  // large profitable OEM — no funding risk (ICE cash-flows)
      overstaffing:         sig(0.72),  // EV transition reduces in-house SDV headcount need
      companySize:          sig(0.72),  // very large OEM (50k-300k employees)
      recentLayoffRecency:  sig(0.40),  // platform restructuring programs 12-18 months ago
      layoffFrequency:      sig(0.62),  // 1-2 formal programs (Betriebsrat agreements limit frequency)
      layoffSeverity:       sig(0.58),  // moderate — social plan limits depth per round
      sectorContagion:      sig(0.68),  // German auto sector-wide SDV platform cuts
      departmentNews:       sig(0.65),  // EV transition / platform outsourcing announcements
      automationRisk:       sig(0.62),  // SDV software: AI-assisted dev tools significant but not extreme
      aiToolMaturity:       sig(0.58),  // automotive AI/SDV tools maturing (AUTOSAR AI extensions)
      humanAmplification:   sig(0.35),  // SDV roles partially replaceable by vendor platforms
      industryBaseline:     sig(0.62),  // German automotive elevated under EV restructuring
      aiAdoptionRate:       sig(0.65),  // Industry 4.0 / SDV AI adoption accelerating
      growthOutlook:        sig(0.58),  // automotive market challenging globally (EV transition)
      averageTenure:        sig(0.48),  // average tenure (high turnover in SDV platforms)
      overallConfidence:    0.85,
      conflictLevel:        'none',
      allConflicts:         [],
      freshnessReport:      FRESH_REPORT,
    },
  },
};

// ── Scenario 18: MENA_VISA_URGENCY ───────────────────────────────────────────
// UAE fintech startup. Ops/product role. Company in funding crisis (<3mo runway).
// Employee on UAE employment visa — termination triggers immediate status change
// with very short grace period (S-Pass equivalent: 10d). Financial runway also
// critical at personal level. Kill-switch A fires (recentLayoffRecency=0.08,
// live — first survival cut just executed). Kill-switch B fires (stockTrend=0.80
// AND fundingHealth=0.90 > 0.60).
// Failure mode: visa urgency amplifies an already severe situation. Both kill-
// switches set floor at 0.70 → score floor 70. Visa scoreAmplifier at pipeline
// level pushes effective score to 72-75.
//
// Formula trace (approximate):
//   L1≈0.73  L2≈0.82  L3≈0.55  L4≈0.91  L5≈0.52
//   raw ≈ 0.73*0.30 + 0.82*0.25 + 0.55*0.20 + 0.91*0.12 + 0.52*0.13
//       = 0.219 + 0.205 + 0.110 + 0.109 + 0.068 = 0.711
//   Kill-switch A (recency=0.08 < 0.20, live): floor max(raw, 0.70) = 0.711
//   Kill-switch B (stockTrend=0.80 > 0.70 AND fundingHealth=0.90 > 0.60): no additional effect
//   score → 71; visa amplifier at pipeline level → effective ~72

const MENA_VISA_URGENCY: ScenarioSpec = {
  name: 'MENA_VISA_URGENCY',
  description: 'UAE fintech startup: funding crisis <3mo runway, first survival cut live, UAE employment visa with short grace period, visa amplifier in effect.',
  expectedScore: 72,
  toleranceLow:  65,
  toleranceHigh: 79,
  inputs: {
    companyName: 'SyntheticCo-UAE-Fintech',
    roleTitle:   'Product Operations Manager',
    department:  'Operations',
    userFactors: {
      tenureYears:        2,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.65),  // startup revenue declining (missed Series B targets)
      stockTrend:           sig(0.80),  // proxy: distress signals; above kill-switch B threshold
      fundingHealth:        sig(0.90),  // CRITICAL: <3mo runway, Series B bridge failed
      overstaffing:         sig(0.80),  // built headcount on growth projections now missed
      companySize:          sig(0.45),  // small startup (50-200 employees)
      recentLayoffRecency:  sig(0.08, 'live'),  // first survival cut just executed — kill-switch A
      layoffFrequency:      sig(0.80),  // 1 confirmed + structurally required second round
      layoffSeverity:       sig(0.75),  // 20-30% per survival round (extreme)
      sectorContagion:      sig(0.78),  // MENA fintech funding winter spreading sector-wide
      departmentNews:       sig(0.75),  // UAE fintech distress news; DIFC regulatory watch
      automationRisk:       sig(0.55),  // ops/product role partially automatable
      aiToolMaturity:       sig(0.52),  // moderate AI tools in MENA fintech
      humanAmplification:   sig(0.42),  // moderate human value (ops role)
      industryBaseline:     sig(0.68),  // MENA startup market elevated risk vs US/EU
      aiAdoptionRate:       sig(0.62),  // growing AI adoption in MENA fintech
      growthOutlook:        sig(0.75),  // market outlook very poor with <3mo runway
      averageTenure:        sig(0.55),  // low tenure (MENA startup churn norms)
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

// ── Scenario 19: UK_FINTECH_TIGHTENING ───────────────────────────────────────
// UK fintech (Series D / public). FCA post-Brexit Consumer Duty and PSD2
// enforcement tightening. compliance/ops role. Company profitable but restructuring
// compliance function for cost efficiency under uk_private_ltd ceiling pattern
// (FCA-regulated entity subject to capital adequacy buffers that compress headcount).
// Failure mode: regulatory cost pressure → org flattening; RegTech tools reduce
// need for specialist compliance analysts. Human judgment still required (partial
// protection). No kill-switches — UK company is stable, moderate distress.
//
// Formula trace (approximate):
//   L1≈0.48  L2≈0.53  L3≈0.38  L4≈0.68  L5≈0.52
//   raw ≈ 0.48*0.30 + 0.53*0.25 + 0.38*0.20 + 0.68*0.12 + 0.52*0.13
//       = 0.144 + 0.133 + 0.076 + 0.082 + 0.068 = 0.503 → score 50 (≈51)
//   L2 = (1-0.52)*0.30 + 0.55*0.25 + 0.42*0.15 + 0.62*0.20 + 0.65*0.10 = 0.534
//   Kill-switches: none (stockTrend=0.55 < 0.70; recency=0.52 ≥ 0.20)

const UK_FINTECH_TIGHTENING: ScenarioSpec = {
  name: 'UK_FINTECH_TIGHTENING',
  description: 'UK fintech: FCA Consumer Duty + post-Brexit PSD2 enforcement, RegTech tooling pressure, uk_private_ltd ceiling, moderate distress.',
  expectedScore: 51,
  toleranceLow:  45,
  toleranceHigh: 58,
  inputs: {
    companyName: 'SyntheticCo-UK-Fintech',
    roleTitle:   'Compliance Analyst',
    department:  'Legal & Compliance',
    userFactors: {
      tenureYears:        3,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships:false,
    },
    consensusData: {
      revenueGrowth:        sig(0.40),  // revenue pressure from FCA compliance cost overhead
      stockTrend:           sig(0.55),  // moderate concern — below kill-switch B threshold
      fundingHealth:        sig(0.42),  // established fintech, no acute crisis; capital adequacy buffers
      overstaffing:         sig(0.55),  // FCA-driven efficiency mandate → some consolidation
      companySize:          sig(0.58),  // mid-large UK fintech (500-2000 employees)
      recentLayoffRecency:  sig(0.52),  // compliance restructuring ~12-15 months ago
      layoffFrequency:      sig(0.55),  // 1 formal round (UK employment law slows pace)
      layoffSeverity:       sig(0.42),  // moderate — UK statutory redundancy process limits depth
      sectorContagion:      sig(0.62),  // UK fintech sector-wide FCA Consumer Duty restructuring
      departmentNews:       sig(0.65),  // FCA enforcement actions, compliance team consolidation news
      automationRisk:       sig(0.38),  // RegTech tools automate routine checks; judgment still needed
      aiToolMaturity:       sig(0.35),  // AI for UK regulatory compliance moderate-maturity
      humanAmplification:   sig(0.58),  // FCA interpretation + client-advisory still requires humans
      industryBaseline:     sig(0.52),  // UK fintech baseline under post-Brexit regulatory pressure
      aiAdoptionRate:       sig(0.45),  // UK fintech cautious on AI adoption (FCA AI guidance lag)
      growthOutlook:        sig(0.52),  // UK fintech growth constrained by regulatory overhead
      averageTenure:        sig(0.50),  // average tenure
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
  INDIA_IT_BENCH_RISK,
  INDIA_IT_HIGH_RISK,
  EU_REGULATORY_RESTRUCTURING,
  US_HYPERSCALER_EFFICIENCY,
  SINGAPORE_GCC_PARENT,
  LATAM_FUNDING_CRISIS,
  CANADA_VISA_AMPLIFIED,
  GERMANY_MANUFACTURING_AUTOMATION,
  GERMANY_AUTOMOTIVE_AUTOMATION,
  MENA_VISA_URGENCY,
  UK_FINTECH_TIGHTENING,
];
