// hybridScoringMath.ts
// Runtime-neutral port of artifacts/humanproof/services/hybridScoringEngine.ts.
//
// Why a port rather than a re-export?
//   The frontend file imports from React/Vite-only paths (`../services/...`,
//   `import.meta.env`, etc.) and indirectly pulls in DOM globals via the
//   consensusEngine + swarmOrchestrator dependency tree. The Deno edge runtime
//   has none of that. This module deliberately contains only:
//     • Pure functions over the vendored types in `./scoringTypes.ts`
//     • No I/O, no env reads, no time-of-day dependence beyond `Date.now()`
//   so it can be imported by both edge functions and (eventually) a Node test
//   harness without bundler magic.
//
// Keep numerical behaviour identical to the frontend `calculateHybridLayoffScore`.
// Any divergence here would mean server-side and client-side scores disagree
// for the same consensus inputs, which is the exact problem this module exists
// to prevent.

import {
  ActionPlanItem,
  ConsensusSignalSet,
  HybridScoreInputs,
  ScoreBreakdown,
  ScoreResult,
  ScoreTier,
  UserFactors,
} from './scoringTypes.ts';

// ── Layer calculators ────────────────────────────────────────────────────

function calculateCompanyHealth(consensus: ConsensusSignalSet): number {
  const rev = consensus.revenueGrowth.value;
  const stock = consensus.stockTrend.value;
  const funding = consensus.fundingHealth.value;
  const overstaff = consensus.overstaffing.value;
  const size = consensus.companySize.value;
  return rev * 0.35 + stock * 0.25 + funding * 0.15 + overstaff * 0.15 + size * 0.10;
}

function calculateLayoffHistory(consensus: ConsensusSignalSet): number {
  const recency = consensus.recentLayoffRecency.value;
  const frequency = consensus.layoffFrequency.value;
  const severity = consensus.layoffSeverity.value;
  const contagion = consensus.sectorContagion.value;
  const deptNews = consensus.departmentNews.value;
  // recency convention: 0 = recent, 1 = distant → invert for risk.
  const recentRisk = 1 - recency;
  return recentRisk * 0.30 + frequency * 0.25 + severity * 0.15 + contagion * 0.20 + deptNews * 0.10;
}

function calculateRoleExposure(consensus: ConsensusSignalSet): number {
  const automation = consensus.automationRisk.value;
  const aiMaturity = consensus.aiToolMaturity.value;
  const humanAmp = consensus.humanAmplification.value;
  const protection = 1 - humanAmp;
  return automation * 0.40 + aiMaturity * 0.30 + protection * 0.30;
}

function calculateMarketConditions(consensus: ConsensusSignalSet): number {
  const baseline = consensus.industryBaseline.value;
  const aiAdoption = consensus.aiAdoptionRate.value;
  const growth = consensus.growthOutlook.value;
  const growthMod = growth * 0.18;
  const aiFactor = aiAdoption * 0.15;
  return Math.min(1, baseline + growthMod + aiFactor);
}

function mapTenure(years: number): number {
  if (years < 0.5) return 0.82;
  if (years < 1) return 0.70;
  if (years < 2) return 0.58;
  if (years < 4) return 0.42;
  if (years < 7) return 0.28;
  if (years < 12) return 0.18;
  return 0.12;
}

function calculateEmployeeFactors(userFactors: UserFactors): number {
  const { tenureYears, isUniqueRole, performanceTier, hasRecentPromotion, hasKeyRelationships } =
    userFactors;
  const tenureScore = mapTenure(tenureYears);
  const uniquenessScore = isUniqueRole ? 0.18 : 0.58;
  const perfMap: Record<string, number> = {
    top: 0.10,
    average: 0.48,
    below: 0.82,
    unknown: 0.42,
  };
  const performanceScore = perfMap[performanceTier] ?? 0.48;
  const base = tenureScore * 0.40 + uniquenessScore * 0.32 + performanceScore * 0.28;
  const promotionBonus = hasRecentPromotion ? -0.12 : 0;
  const relationshipBonus = hasKeyRelationships ? -0.10 : 0;
  return Math.max(0.05, Math.min(0.95, base + promotionBonus + relationshipBonus));
}

// ── Tier classifier ──────────────────────────────────────────────────────

function getScoreTier(score: number): ScoreTier {
  if (score >= 75) {
    return {
      label: 'High risk',
      color: 'red',
      advice: 'Immediate action required — external job search this week.',
    };
  }
  if (score >= 55) {
    return {
      label: 'Elevated risk',
      color: 'orange',
      advice: 'Stay alert — strengthen internal position and external network.',
    };
  }
  if (score >= 35) {
    return {
      label: 'Moderate risk',
      color: 'amber',
      advice: 'Monitor closely — preparation is wise.',
    };
  }
  if (score >= 15) {
    return {
      label: 'Low risk',
      color: 'green',
      advice: 'Relatively stable — keep growing skills.',
    };
  }
  return {
    label: 'Very low risk',
    color: 'teal',
    advice: 'Strong position — focus on career growth.',
  };
}

function generateStalenessWarning(avgAge: number): string | null {
  if (avgAge > 180) {
    return `CRITICAL: Average signal age is ${avgAge}d. Data may be completely inaccurate.`;
  }
  if (avgAge > 90) {
    return `HIGH RISK: Signals are ${avgAge}d old on average. Market conditions may have changed.`;
  }
  if (avgAge > 30) {
    return `MODERATE RISK: Signals are ${avgAge}d old. Recent developments may be missing.`;
  }
  if (avgAge > 7) {
    return `Signals are ${avgAge}d old — acceptable but could be fresher.`;
  }
  return null;
}

function generateRecommendations(
  breakdown: ScoreBreakdown,
  consensus: ConsensusSignalSet,
  overrides: string[],
): ActionPlanItem[] {
  const plans: ActionPlanItem[] = [];
  const { L1, L2, L3, L4, L5 } = breakdown;

  if (L1 > 0.7 && L2 > 0.6 && consensus.recentLayoffRecency.primarySource === 'live') {
    plans.push({
      id: 'critical-live-confirmed',
      title: 'Active Layoff Event Detected',
      description:
        'Live news confirms recent layoffs at your company combined with weak financial health. ' +
        'Begin immediate external job search. Target 5 applications this week and activate all network contacts.',
      priority: 'Critical',
      layerFocus: 'Live Confirmed Layoffs + Financial Stress',
      riskReductionPct: 0,
      deadline: '7 days',
    });
    return plans;
  }

  if (L1 > 0.6) {
    plans.push({
      id: 'l1-high',
      title: 'Company Financials Under Pressure',
      description: `Financial signals show elevated risk (L1: ${Math.round(L1 * 100)}/100). Secure emergency fund (3–6 months) and update resume.`,
      priority: L1 > 0.75 ? 'Critical' : 'High',
      layerFocus: 'Company Health',
      riskReductionPct: 0,
      deadline: L1 > 0.75 ? '7 days' : '14 days',
    });
  }

  if (L2 > 0.6) {
    const layoffSource =
      consensus.recentLayoffRecency.primarySource === 'live'
        ? 'recent news confirms'
        : 'historical pattern shows';
    plans.push({
      id: 'l2-high',
      title: 'Company Has History of Workforce Reductions',
      description: `${layoffSource} elevated layoff risk (L2: ${Math.round(L2 * 100)}/100). Prepare for possible cuts — reduce discretionary spending, monitor internal communications.`,
      priority: 'High',
      layerFocus: 'Layoff History',
      riskReductionPct: 0,
      deadline: '14 days',
    });
  }

  if (L3 > 0.5) {
    plans.push({
      id: 'l3-high',
      title: 'Role Exposed to Automation',
      description: `Your role has high automation exposure (${Math.round(consensus.automationRisk.value * 100)}%). Focus on AI-augmented skills and strategic oversight tasks.`,
      priority: 'Medium',
      layerFocus: 'Role Exposure',
      riskReductionPct: 8,
      deadline: '30 days',
    });
  }

  if (L4 > 0.5) {
    plans.push({
      id: 'l4-high',
      title: 'Industry Headwinds',
      description:
        'Sector conditions are difficult. Monitor competitor layoffs and explore adjacent industries where your skills transfer.',
      priority: 'Medium',
      layerFocus: 'Market Conditions',
      riskReductionPct: 3,
      deadline: '60 days',
    });
  }

  if (L5 > 0.5) {
    plans.push({
      id: 'l5-high',
      title: 'Internal Position Vulnerable',
      description:
        'Personal role risk is elevated. Schedule 1:1s with manager, document achievements, clarify strategic importance.',
      priority: 'Medium',
      layerFocus: 'Employee Factors',
      riskReductionPct: 10,
      deadline: '30 days',
    });
  }

  if (overrides.length > 0) {
    plans.push({
      id: 'system-override-notice',
      title: 'System Override Applied',
      description: `The engine detected exceptional patterns: ${overrides.join('; ')}. Treat this assessment as high-priority.`,
      priority: 'Critical',
      layerFocus: 'System Alert',
      riskReductionPct: 0,
      deadline: 'Immediate',
    });
  }

  if (plans.length === 0) {
    plans.push({
      id: 'all-good',
      title: 'Position Currently Stable',
      description:
        'All risk dimensions are low. Continue skill development and maintain network. Reassess quarterly.',
      priority: 'Low',
      layerFocus: 'General',
      riskReductionPct: 2,
      deadline: '90 days',
    });
  }

  return plans;
}

// ── Main entry ────────────────────────────────────────────────────────────

/**
 * calculateHybridScore — pure scoring math used by both the React app and the
 * `calculate-hybrid-risk` edge function. Inputs must include a fully-resolved
 * `ConsensusSignalSet` (this module performs no I/O); orchestration of the
 * upstream consensus pipeline is the caller's responsibility.
 *
 * Numerical behaviour mirrors `calculateHybridLayoffScore` in
 * artifacts/humanproof/services/hybridScoringEngine.ts. Drift between the two
 * is a correctness bug — server-side and client-side scores must agree for
 * the same consensus input.
 */
export function calculateHybridScore(inputs: HybridScoreInputs): ScoreResult {
  const {
    userFactors,
    consensusData: consensus,
    provenance,
    reconciliationSummary,
    missingDataFallbacks,
    degradedSignalClasses,
    hardFailures,
    confidenceCap,
    confidenceCapsApplied,
  } = inputs;

  const L1 = calculateCompanyHealth(consensus);
  const L2 = calculateLayoffHistory(consensus);
  const L3 = calculateRoleExposure(consensus);
  const L4 = calculateMarketConditions(consensus);
  const L5 = calculateEmployeeFactors(userFactors);

  let rawScore = L1 * 0.30 + L2 * 0.25 + L3 * 0.20 + L4 * 0.12 + L5 * 0.13;

  const overrides: string[] = [];

  // Kill-switch A: confirmed live layoff event (recency value < 0.2 = recent).
  if (
    consensus.recentLayoffRecency.value < 0.2 &&
    consensus.recentLayoffRecency.primarySource === 'live'
  ) {
    rawScore = Math.max(rawScore, 0.7);
    overrides.push('Live layoff confirmed: overriding to Elevated+ risk');
  }

  // Kill-switch B: financial distress triad.
  if (
    consensus.revenueGrowth.value < 0.75 &&
    consensus.stockTrend.value > 0.7 &&
    consensus.fundingHealth.value > 0.6
  ) {
    rawScore = Math.max(rawScore, 0.65);
    overrides.push('Financial distress triad: revenue↓ stock↓ cash↓');
  }

  // Kill-switch C: pre-layoff precursor — established company under financial stress with no
  // recent layoffs (quiet-before-the-storm pattern). The floor layoffFrequency > 0.05 guards
  // against growth-stage startups that satisfy funding/revenue thresholds by design (burn rate
  // is normal, zero layoff history is expected — they shouldn't fire this kill-switch).
  if (
    consensus.revenueGrowth.value < 0.7 &&
    consensus.fundingHealth.value > 0.5 &&
    consensus.recentLayoffRecency.value > 0.7 &&
    consensus.layoffFrequency.value > 0.05 &&
    consensus.layoffFrequency.value < 0.3
  ) {
    rawScore = Math.max(rawScore, 0.55);
    overrides.push('Pre-layoff precursor: financial stress + no recent layoffs (stealth risk)');
  }

  // Kill-switch D: severe DB-vs-live conflict — confidence widens but score unchanged.
  if (consensus.conflictLevel === 'critical' || consensus.conflictLevel === 'high') {
    overrides.push(
      `Signal conflict (${consensus.conflictLevel}): ${consensus.allConflicts.length} discrepancies detected`,
    );
  }

  const finalScore = Math.round(Math.max(0, Math.min(1, rawScore)) * 100);
  const uncappedConfidencePercent = Math.round(consensus.overallConfidence * 100);
  const cappedConfidencePercent =
    confidenceCap != null
      ? Math.min(uncappedConfidencePercent, Math.round(confidenceCap * 100))
      : uncappedConfidencePercent;

  const baseRange =
    consensus.revenueGrowth.confidenceInterval.high -
    consensus.revenueGrowth.confidenceInterval.low;
  const conflictPenalty = consensus.allConflicts.length * 5;
  const overridePenalty = overrides.length * 3;
  const capPenalty = confidenceCap != null && uncappedConfidencePercent > cappedConfidencePercent ? 6 : 0;
  const failurePenalty = (hardFailures?.length ?? 0) * 4;
  const totalRange = Math.min(
    40,
    Math.max(8, baseRange * 100 + conflictPenalty + overridePenalty + capPenalty + failurePenalty),
  );

  // Clamp CI bounds first, then derive range from the clamped values so that
  // a score of 5 with half-range 20 correctly reports [0, 25] range=25, not
  // the pre-clamp totalRange=40 which is misleadingly wide for boundary scores.
  const ciLow  = Math.max(0,   finalScore - Math.round(totalRange / 2));
  const ciHigh = Math.min(100, finalScore + Math.round(totalRange / 2));
  const confidenceInterval = {
    low:  ciLow,
    high: ciHigh,
    range: ciHigh - ciLow,
    isEstimate:
      consensus.conflictLevel !== 'none' || consensus.freshnessReport.percentLive < 0.5,
  };

  const avgAge = consensus.freshnessReport.avgSignalAge;
  const dataFreshness = {
    lastUpdated: new Date().toISOString(),
    ageInDays: consensus.freshnessReport.oldestSignalAge,
    stalenessWarning: generateStalenessWarning(avgAge),
    accuracyImpact: (avgAge > 90 ? 'Critical' : avgAge > 30 ? 'High' : avgAge > 14 ? 'Medium' : 'Low') as
      | 'Low'
      | 'Medium'
      | 'High'
      | 'Critical',
  };

  const signalQuality = {
    hasConflicts: consensus.conflictLevel !== 'none',
    conflictingSignals: consensus.allConflicts,
    missingDataFallbacks: missingDataFallbacks ?? ([] as string[]),
    liveSignals: consensus.freshnessReport.liveSignalCount,
    heuristicSignals: consensus.freshnessReport.heuristicSignalCount,
    degradedSignalClasses,
    hardFailures,
    confidenceCapsApplied,
  };

  const breakdown: ScoreBreakdown = { L1, L2, L3, L4, L5 };
  const recommendations = generateRecommendations(breakdown, consensus, overrides);

  const tier = getScoreTier(finalScore);
  const disclaimer =
    (hardFailures?.length ?? 0) > 0
      ? 'WARNING: Critical live-signal failures forced fallback behavior. Treat this assessment as a constrained estimate.'
      : consensus.conflictLevel === 'critical'
      ? 'WARNING: Major signal conflicts detected. Treat this assessment as preliminary and verify with additional sources.'
      : 'This is a risk estimation based on the latest available signals. It is not a prediction or guarantee.';

  const uniqueSources = provenance
    ? Array.from(
        new Set(
          Object.values(provenance)
            .map((signal) => signal.sourceName)
            .filter((sourceName) => typeof sourceName === 'string' && sourceName.length > 0),
        ),
      )
    : consensus.revenueGrowth.sourcesUsed;

  return {
    score: finalScore,
    confidenceInterval,
    confidencePercent: cappedConfidencePercent,
    tier,
    breakdown,
    confidence:
      cappedConfidencePercent >= 70 ? 'High' : cappedConfidencePercent >= 45 ? 'Medium' : 'Low',
    calculatedAt: new Date().toISOString(),
    nextUpdateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    disclaimer,
    dataFreshness,
    signalQuality,
    recommendations,
    consensusSnapshot: {
      primarySource: consensus.freshnessReport.percentLive > 0.5 ? 'live' : 'db',
      signalSources: uniqueSources,
      conflictCount: consensus.allConflicts.length,
      overridesApplied: overrides,
      overallFreshness: consensus.freshnessReport.avgSignalAge,
      authoritativeSignals: provenance,
      reconciliationSummary,
    },
  };
}
