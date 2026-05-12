// hybridScoringEngine.ts
// CRITICAL: Refactored L1-L5 scoring engine using consensus signals + kill-switches.
// This replaces the static heuristic-dependent original with live-augmented intelligence.

import {
  UserFactors,
  ScoreResult,
  ScoreBreakdown,
  ScoreTier,
  ActionPlanItem,
} from "./layoffScoreEngine";
import {
  consensusEngine,
  ConsensusSignalSet,
} from "../services/consensusEngine";
import { runSwarmLayer } from "../services/swarm/swarmOrchestrator";

// ── Export interfaces ──────────────────────────────────────────────────────

export interface HybridScoreInputs {
  companyName: string;
  roleTitle: string;
  department: string;
  userFactors: UserFactors;
  // Optional: pre-fetched data for optimization
  consensusData?: ConsensusSignalSet;
  swarmReport?: any;
}

// ── Main Calculator ───────────────────────────────────────────────────────

/**
 * calculateHybridLayoffScore
 * Core scoring with live signal integration, conflict detection, and kill-switches.
 *
 * Flow:
 * 1. Resolve company baseline + fetch live signals
 * 2. Run swarm verification (parallel)
 * 3. Consensus engine merges all sources
 * 4. Score each layer using consensus signals (not raw DB)
 * 5. Apply kill-switch overrides for extreme patterns
 * 6. Generate confidence & conflict disclosures
 */
export const calculateHybridLayoffScore = async (
  inputs: HybridScoreInputs,
): Promise<ScoreResult> => {
  const {
    companyName,
    roleTitle,
    department,
    userFactors,
    consensusData,
    swarmReport,
  } = inputs;

  // ── STEP 1: FETCH CONSENSUS (if not pre-provided) ───────────────────────
  let consensus: ConsensusSignalSet | null = consensusData || null;
  if (!consensus) {
    // This would trigger live API calls — in production, do this server-side
    throw new Error(
      "Consensus data must be pre-fetched; use calculateHybridLayoffScoreServer",
    );
  }

  // ── STEP 2: SCORE EACH LAYER using consensus signals ─────────────────────

  // L1: Company Health
  const L1 = calculateCompanyHealth_V2(consensus);

  // L2: Layoff History
  const L2 = calculateLayoffHistory_V2(consensus, department);

  // L3: Role Exposure
  const L3 = await calculateRoleExposure_V2(roleTitle, department, consensus);

  // L4: Market Conditions
  const L4 = calculateMarketConditions_V2(consensus);

  // L5: Employee Factors (unchanged — user input only)
  const L5 = calculateEmployeeFactors(userFactors);

  // ── STEP 3: WEIGHTED AVERAGE (with kill-switch overrides) ────────────────
  let rawScore = L1 * 0.3 + L2 * 0.25 + L3 * 0.2 + L4 * 0.12 + L5 * 0.13;

  // ── STEP 4: KILL-SWITCH OVERRIDES (non-linear interventions) ─────────────

  const overrides: string[] = [];

  // Kill-switch A: Confirmed live layoff event
  // CONVENTION: recentLayoffRecency.value is 0 (recent) → 1 (distant). See
  // ConsensusSignalSet definition. The previous comparison used `> 0.8`, which
  // fired when the most recent layoff was *distant* — the exact opposite of the
  // intended "layoff confirmed within 14 days" semantics. The override was
  // therefore (a) silent on real recent events and (b) firing on companies with
  // clean recent histories, polluting their scores. Compare against the low end.
  if (
    consensus.recentLayoffRecency.value < 0.2 &&
    consensus.recentLayoffRecency.primarySource === "live"
  ) {
    // Layoff news confirmed within ~14 days — elevate regardless of other factors
    rawScore = Math.max(rawScore, 0.7);
    overrides.push("Live layoff confirmed: overriding to Elevated+ risk");
  }

  // Kill-switch B: Financial distress pattern
  if (
    consensus.revenueGrowth.value < 0.75 &&
    consensus.stockTrend.value > 0.7 &&
    consensus.fundingHealth.value > 0.6
  ) {
    // Revenue declining AND stock down AND cash pressure
    rawScore = Math.max(rawScore, 0.65);
    overrides.push("Financial distress triad: revenue↓ stock↓ cash↓");
  }

  // Kill-switch C: Pre-layoff precursor (financial stress + hiring freeze, no layoffs yet)
  // "No layoffs yet" means the most recent layoff is *distant* (recency.value
  // close to 1) AND frequency is low. The previous code compared recency to
  // `< 0.3`, which is "very recent" — the inverse of what the comment claims —
  // so this branch fired on companies that had *just* laid people off, where
  // the heavier kill-switch A should already be active. Compare against the
  // distant end of the scale.
  // (Note: `revenueGrowth.value < 0.7` keeps original semantics — that signal
  // uses 1 = declining, so `< 0.7` is "growth is reasonable", which combined
  // with funding stress is the precursor pattern. Left as-is intentionally.)
  if (
    consensus.revenueGrowth.value < 0.7 &&
    consensus.fundingHealth.value > 0.5 &&
    consensus.recentLayoffRecency.value > 0.7 &&
    consensus.layoffFrequency.value < 0.3
  ) {
    // High financial stress but no actual layoffs yet — suspicious
    rawScore = Math.max(rawScore, 0.55); // elevated baseline
    overrides.push(
      "Pre-layoff precursor: financial stress + hiring freeze + clean history",
    );
  }

  // Kill-switch D: Severe conflict between DB and live
  if (
    consensus.conflictLevel === "critical" ||
    consensus.conflictLevel === "high"
  ) {
    // Disagreement indicates system uncertainty — widen confidence, don't hide
    // (score stays the same but confidence drops)
    overrides.push(
      `Signal conflict (${consensus.conflictLevel}): ${consensus.allConflicts.length} discrepancies detected`,
    );
  }

  const finalScore = Math.round(Math.max(0, Math.min(1, rawScore)) * 100);

  // ── STEP 5: CONFIDENCE from consensus quality ────────────────────────────
  const confidencePercent = Math.round(consensus.overallConfidence * 100);

  // ── STEP 6: CONFIDENCE INTERVAL (based on consensus CI + overrides) ───────
  // Base interval from consensus (typically ±8–15 pts)
  const baseRange =
    consensus.revenueGrowth.confidenceInterval.high -
    consensus.revenueGrowth.confidenceInterval.low;
  const conflictPenalty = consensus.allConflicts.length * 5; // +5pts per conflict
  const overridePenalty = overrides.length * 3;
  const totalRange = Math.min(
    35,
    Math.max(8, baseRange * 100 + conflictPenalty + overridePenalty),
  );

  const confidenceInterval = {
    low: Math.max(0, finalScore - Math.round(totalRange / 2)),
    high: Math.min(100, finalScore + Math.round(totalRange / 2)),
    range: Math.round(totalRange),
    isEstimate:
      consensus.conflictLevel !== "none" ||
      consensus.freshnessReport.percentLive < 0.5,
  };

  // ── STEP 7: DATA FRESHNESS REPORT ───────────────────────────────────────
  const dataFreshness = {
    lastUpdated: new Date().toISOString(),
    ageInDays: consensus.freshnessReport.oldestSignalAge,
    stalenessWarning: generateStalenessWarning(consensus.freshnessReport),
    accuracyImpact:
      consensus.freshnessReport.avgSignalAge > 30
        ? "High"
        : consensus.freshnessReport.avgSignalAge > 14
          ? "Medium"
          : ("Low" as const),
  };

  // ── STEP 8: SIGNAL QUALITY (exposed to UI) ──────────────────────────────
  // Use the authoritative counts emitted by the consensus engine instead of
  // multiplying a percentage by a magic 17. The old approximation drifted
  // every time a signal was added or removed from `ConsensusSignalSet`, and
  // surfaced fractional rounding artefacts to the UI ("9 live signals" when
  // only 8 actually were live).
  //
  // missingDataFallbacks lists the human-readable names of every consensus
  // signal that resolved without a live source. UI uses this to disclose
  // which inputs are heuristic / cached so a 22%-confidence score doesn't
  // look the same as a 22%-confidence score where every signal was live.
  const signalsByLabel: Array<[string, { primarySource: "live" | "db" | "hybrid" }]> = [
    ["Revenue growth", consensus.revenueGrowth],
    ["Stock trend (90d)", consensus.stockTrend],
    ["Funding health", consensus.fundingHealth],
    ["Overstaffing ratio", consensus.overstaffing],
    ["Company size", consensus.companySize],
    ["Recent layoff recency", consensus.recentLayoffRecency],
    ["Layoff frequency", consensus.layoffFrequency],
    ["Layoff severity", consensus.layoffSeverity],
    ["Sector contagion", consensus.sectorContagion],
    ["Department-specific news", consensus.departmentNews],
    ["Task automatability", consensus.automationRisk],
    ["AI tool maturity", consensus.aiToolMaturity],
    ["Human amplification", consensus.humanAmplification],
    ["Industry baseline", consensus.industryBaseline],
    ["AI adoption rate", consensus.aiAdoptionRate],
    ["Growth outlook", consensus.growthOutlook],
    ["Average tenure", consensus.averageTenure],
  ];
  const missingDataFallbacks: string[] = signalsByLabel
    .filter(([, sig]) => sig.primarySource !== "live")
    .map(([label]) => label);

  const signalQuality = {
    hasConflicts: consensus.conflictLevel !== "none",
    // Use full SignalConflict objects for detailed disclosure
    conflictingSignals: consensus.allConflicts,
    missingDataFallbacks,
    liveSignals: consensus.freshnessReport.liveSignalCount,
    heuristicSignals: consensus.freshnessReport.heuristicSignalCount,
  };

  // ── STEP 9: ACTIONABLE RECOMMENDATIONS ──────────────────────────────────
  const breakdown: ScoreBreakdown = { L1, L2, L3, L4, L5 };
  const recommendations = generateRecommendations_V2(
    breakdown,
    consensus,
    overrides,
  );

  // ── STEP 10: TIER & DISCLAIMER ───────────────────────────────────────────
  const tier = getScoreTier(finalScore);
  const disclaimer =
    consensus.conflictLevel === "critical"
      ? "WARNING: Major signal conflicts detected. Treat this assessment as preliminary and verify with additional sources."
      : "This is a risk estimation based on the latest available signals. It is not a prediction or guarantee.";

  return {
    score: finalScore,
    confidenceInterval,
    confidencePercent,
    tier,
    breakdown,
    confidence:
      confidencePercent >= 70
        ? "High"
        : confidencePercent >= 45
          ? "Medium"
          : ("Low" as const),
    calculatedAt: new Date().toISOString(),
    nextUpdateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    disclaimer,
    dataFreshness,
    signalQuality,
    recommendations,
    // NEW fields for transparency:
    consensusSnapshot: {
      primarySource:
        consensus.freshnessReport.percentLive > 0.5 ? "live" : "db",
      signalSources: consensus.revenueGrowth.sourcesUsed,
      conflictCount: consensus.allConflicts.length,
      overridesApplied: overrides,
      overallFreshness: consensus.freshnessReport.avgSignalAge,
    },
  };
};

// ── Layer Calculators (using consensus) ────────────────────────────────────

function calculateCompanyHealth_V2(consensus: ConsensusSignalSet): number {
  // Use consensus values (already weighted by freshness)
  const rev = consensus.revenueGrowth.value; // 0–1 (1 = declining)
  const stock = consensus.stockTrend.value; // 0–1 (1 = downtrend)
  const funding = consensus.fundingHealth.value; // 0–1 (1 = cash-strapped)
  const overstaff = consensus.overstaffing.value; // 0–1 (1 = overstaffed)
  const size = consensus.companySize.value; // 0–1 (1 = large/bureaucratic)

  // Weighted — but with live override kill-switch applied later
  return (
    rev * 0.35 + stock * 0.25 + funding * 0.15 + overstaff * 0.15 + size * 0.1
  );
}

function calculateLayoffHistory_V2(
  consensus: ConsensusSignalSet,
  department?: string,
): number {
  const recency = consensus.recentLayoffRecency.value; // 0 = recent, 1 = distant
  const frequency = consensus.layoffFrequency.value;
  const severity = consensus.layoffSeverity.value;
  const contagion = consensus.sectorContagion.value;
  const deptNews = consensus.departmentNews.value;

  // Recency inverse: value 0 (recent) → high risk; value 1 (distant) → low risk
  // Transform: highRisk = 1 - recency
  const recentRisk = 1 - recency;

  return (
    recentRisk * 0.3 +
    frequency * 0.25 +
    severity * 0.15 +
    contagion * 0.2 +
    deptNews * 0.1
  );
}

async function calculateRoleExposure_V2(
  roleTitle: string,
  department: string,
  consensus: ConsensusSignalSet,
): Promise<number> {
  // Use consensus automation + AI tool maturity + human amplification
  const automation = consensus.automationRisk.value; // 0 = safe, 1 = high automatability
  const aiMaturity = consensus.aiToolMaturity.value; // 0 = immature tools, 1 = mature
  const humanAmp = consensus.humanAmplification.value; // 0 = high amp (safe), 1 = low amp (risky)

  // L3 score: automation (40%) + aiMaturity (30%) + (1 - humanAmp) (30%)
  // Human amplification is protective: low value = high protection → invert
  const protection = 1 - humanAmp;
  return automation * 0.4 + aiMaturity * 0.3 + protection * 0.3;
}

function calculateMarketConditions_V2(consensus: ConsensusSignalSet): number {
  const baseline = consensus.industryBaseline.value; // industry baseline risk
  const aiAdoption = consensus.aiAdoptionRate.value; // 0 = slow adoption, 1 = rapid
  const growth = consensus.growthOutlook.value; // 0 = growing, 1 = declining

  // Growth modifier: declining adds +0.18, stable +0, volatile +0.1, growing -0.12 (from original)
  const growthMod = growth * 0.18; // if growth=1 (declining) → +0.18; 0 (growing) → 0

  // AI disruption factor: aiAdoption * 0.15  (from original)
  const aiFactor = aiAdoption * 0.15;

  return Math.min(1, baseline + growthMod + aiFactor);
}

function calculateEmployeeFactors(userFactors: UserFactors): number {
  // Original implementation preserved — user input only
  const {
    tenureYears,
    isUniqueRole,
    performanceTier,
    hasRecentPromotion,
    hasKeyRelationships,
  } = userFactors;

  const tenureScore = mapTenure(tenureYears);
  const uniquenessScore = isUniqueRole ? 0.18 : 0.58;
  const perfMap: Record<string, number> = {
    top: 0.1,
    average: 0.48,
    below: 0.82,
    unknown: 0.42,
  };
  const performanceScore = perfMap[performanceTier] ?? 0.48;

  const base =
    tenureScore * 0.4 + uniquenessScore * 0.32 + performanceScore * 0.28;
  const promotionBonus = hasRecentPromotion ? -0.12 : 0;
  const relationshipBonus = hasKeyRelationships ? -0.1 : 0;

  return Math.max(
    0.05,
    Math.min(0.95, base + promotionBonus + relationshipBonus),
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateStalenessWarning(freshness: any): string | null {
  const avgAge = freshness.avgSignalAge;
  if (avgAge > 180)
    return `⚠️ CRITICAL: Average signal age is ${avgAge}d. Data may be completely inaccurate.`;
  if (avgAge > 90)
    return `🔴 HIGH RISK: Signals are ${avgAge}d old on average. Market conditions may have changed.`;
  if (avgAge > 30)
    return `🟡 MODERATE RISK: Signals are ${avgAge}d old. Recent developments may be missing.`;
  if (avgAge > 7)
    return `ℹ️ Signals are ${avgAge}d old — acceptable but could be fresher.`;
  return null;
}

function generateRecommendations_V2(
  breakdown: ScoreBreakdown,
  consensus: ConsensusSignalSet,
  overrides: string[],
): ActionPlanItem[] {
  const plans: ActionPlanItem[] = [];
  const { L1, L2, L3, L4, L5 } = breakdown;

  // Critical: Dual crisis with live confirmation
  if (
    L1 > 0.7 &&
    L2 > 0.6 &&
    consensus.recentLayoffRecency.primarySource === "live"
  ) {
    plans.push({
      id: "critical-live-confirmed",
      title: "Active Layoff Event Detected",
      description: `Live news confirms recent layoffs at your company combined with weak financial health. Begin immediate external job search. Target 5 applications this week and activate all network contacts.`,
      priority: "Critical",
      layerFocus: "Live Confirmed Layoffs + Financial Stress",
      riskReductionPct: 0,
      deadline: "7 days",
    });
    return plans; // priority 1, return early
  }

  if (L1 > 0.6) {
    plans.push({
      id: "l1-high",
      title: "Company Financials Under Pressure",
      description: `Financial signals show elevated risk (L1: ${Math.round(L1 * 100)}/100). Secure emergency fund (3–6 months) and update resume.`,
      priority: L1 > 0.75 ? "Critical" : "High",
      layerFocus: "Company Health",
      riskReductionPct: 0,
      deadline: L1 > 0.75 ? "7 days" : "14 days",
    });
  }

  if (L2 > 0.6) {
    const layoffSource =
      consensus.recentLayoffRecency.primarySource === "live"
        ? "recent news confirms"
        : "historical pattern shows";
    plans.push({
      id: "l2-high",
      title: "Company Has History of Workforce Reductions",
      description: `${layoffSource} elevated layoff risk (L2: ${Math.round(L2 * 100)}/100). Prepare for possible cuts — reduce discretionary spending, monitor internal communications.`,
      priority: "High",
      layerFocus: "Layoff History",
      riskReductionPct: 0,
      deadline: "14 days",
    });
  }

  if (L3 > 0.5) {
    plans.push({
      id: "l3-high",
      title: "Role Exposed to Automation",
      description: `Your role has high automation exposure (${Math.round(consensus.automationRisk.value * 100)}%). Focus on AI-augmented skills and strategic oversight tasks.`,
      priority: "Medium",
      layerFocus: "Role Exposure",
      riskReductionPct: 8,
      deadline: "30 days",
    });
  }

  if (L4 > 0.5) {
    plans.push({
      id: "l4-high",
      title: "Industry Headwinds",
      description: `Sector conditions are difficult. Monitor competitor layoffs and explore adjacent industries where your skills transfer.`,
      priority: "Medium",
      layerFocus: "Market Conditions",
      riskReductionPct: 3,
      deadline: "60 days",
    });
  }

  if (L5 > 0.5) {
    plans.push({
      id: "l5-high",
      title: "Internal Position Vulnerable",
      description: `Personal role risk is elevated. Schedule 1:1s with manager, document achievements, clarify strategic importance.`,
      priority: "Medium",
      layerFocus: "Employee Factors",
      riskReductionPct: 10,
      deadline: "30 days",
    });
  }

  if (overrides.length > 0) {
    plans.push({
      id: "system-override-notice",
      title: "System Override Applied",
      description: `The engine detected exceptional patterns: ${overrides.join("; ")}. Treat this assessment as high-priority.`,
      priority: "Critical",
      layerFocus: "System Alert",
      riskReductionPct: 0,
      deadline: "Immediate",
    });
  }

  if (plans.length === 0) {
    plans.push({
      id: "all-good",
      title: "Position Currently Stable",
      description:
        "All risk dimensions are low. Continue skill development and maintain network. Reassess quarterly.",
      priority: "Low",
      layerFocus: "General",
      riskReductionPct: 2,
      deadline: "90 days",
    });
  }

  return plans;
}

// ── Tier & Utils ───────────────────────────────────────────────────────────

function getScoreTier(score: number): ScoreTier {
  if (score >= 75)
    return {
      label: "High risk",
      color: "red",
      advice: "Immediate action required — external job search this week.",
    };
  if (score >= 55)
    return {
      label: "Elevated risk",
      color: "orange",
      advice: "Stay alert — strengthen internal position and external network.",
    };
  if (score >= 35)
    return {
      label: "Moderate risk",
      color: "amber",
      advice: "Monitor closely — preparation is wise.",
    };
  if (score >= 15)
    return {
      label: "Low risk",
      color: "green",
      advice: "Relatively stable — keep growing skills.",
    };
  return {
    label: "Very low risk",
    color: "teal",
    advice: "Strong position — focus on career growth.",
  };
}

function mapTenure(years: number): number {
  if (years < 0.5) return 0.82;
  if (years < 1) return 0.7;
  if (years < 2) return 0.58;
  if (years < 4) return 0.42;
  if (years < 7) return 0.28;
  if (years < 12) return 0.18;
  return 0.12;
}
