// fundingStageRiskEngine.ts — Layer 32
// v14.0 Intelligence Upgrade
//
// Expands the existing fundingDryupAgent.ts with stage-specific risk models,
// down-round detection, bridge financing signals, and runway estimation.
//
// Key insight: a Seed company cutting staff is very different from a public
// company cutting staff. The existing fundingDryupAgent checks if funding
// stopped — this engine models the entire funding lifecycle risk curve.
//
// Data sources: Crunchbase 2026, PitchBook 2025, CB Insights layoff analysis,
//               SaaS burn rate benchmarks (Bessemer Venture Partners 2026),
//               Craft Ventures Efficiency Benchmarks 2025.
//
// Calibration: research_grounded

export type FundingStage =
  | 'PRE_SEED'          // idea stage, < $1M raised
  | 'SEED'              // $1M–$5M, finding product-market fit
  | 'SERIES_A'          // $5M–$20M, scaling go-to-market
  | 'SERIES_B'          // $20M–$80M, proving unit economics
  | 'SERIES_C_PLUS'     // $80M+, growth at scale
  | 'LATE_PRIVATE'      // pre-IPO or growth stage, $200M+ raised
  | 'PUBLIC'            // listed on stock exchange
  | 'PE_BACKED'         // private equity owned (different dynamics)
  | 'BOOTSTRAPPED'      // no external funding
  | 'UNKNOWN';

export type FundingHealthSignal =
  | 'HEALTHY'           // recent raise, runway > 18 months
  | 'MONITORING'        // 12–18 months runway, last raise > 12 months ago
  | 'STRESSED'          // 6–12 months runway, bridge financing possible
  | 'CRITICAL'          // < 6 months runway, down-round or bridge imminent
  | 'UNKNOWN';

export interface FundingStageRiskResult {
  fundingStage: FundingStage;
  healthSignal: FundingHealthSignal;
  fundingRiskScore: number;       // 0–100 (higher = more risk from funding signals)
  runwayEstimateMonths: number | null; // estimated months of cash remaining
  layoffProbabilityAt12mo: number;    // 0–1

  // Down-round signals
  downRoundRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  downRoundSignals: string[];

  // Stage-specific context
  stageLabel: string;
  stageRiskContext: string;
  burnRateRisk: 'EXCESSIVE' | 'ELEVATED' | 'MODERATE' | 'EFFICIENT' | 'UNKNOWN';

  // Timeline
  lastFundingMonthsAgo: number | null;
  monthsSinceRaise: 'RECENT' | 'AGING' | 'STALE' | 'UNKNOWN';

  // Actions
  fundingActions: FundingAction[];

  calibrationStatus: 'research_grounded';
}

export interface FundingAction {
  action: string;
  why: string;
  urgency: 'immediate' | 'within_30d' | 'within_90d';
}

// ─── Stage-Level Risk Profiles ────────────────────────────────────────────────
// Source: CB Insights startup failure analysis 2023–2025,
//         Layoffs.fyi stage breakdown (where available)
const STAGE_BASE_RISK: Record<FundingStage, number> = {
  PRE_SEED:       70,  // pre-seed companies fail at 70%+ rate
  SEED:           55,  // seed: product-market fit not proven
  SERIES_A:       40,  // Series A: scaling risk
  SERIES_B:       35,  // Series B: unit economics risk
  SERIES_C_PLUS:  28,  // growth-stage but dilution and burn risk
  LATE_PRIVATE:   20,  // near-IPO, proving metrics
  PUBLIC:         18,  // market-dependent but regulated
  PE_BACKED:      45,  // PE has extraction motivation
  BOOTSTRAPPED:   25,  // no external pressure but limited runway
  UNKNOWN:        40,
};

const STAGE_LAYOFF_PROBABILITY: Record<FundingStage, number> = {
  PRE_SEED:       0.55,
  SEED:           0.40,
  SERIES_A:       0.28,
  SERIES_B:       0.22,
  SERIES_C_PLUS:  0.18,
  LATE_PRIVATE:   0.14,
  PUBLIC:         0.10,
  PE_BACKED:      0.35,  // PE restructuring is common
  BOOTSTRAPPED:   0.18,
  UNKNOWN:        0.25,
};

const STAGE_LABELS: Record<FundingStage, string> = {
  PRE_SEED:       'Pre-seed stage — idea / early development, no institutional funding',
  SEED:           'Seed stage — product-market fit search, short runways common',
  SERIES_A:       'Series A — go-to-market scaling, execution risk elevated',
  SERIES_B:       'Series B — unit economics validation, $20M–$80M raised',
  SERIES_C_PLUS:  'Series C+ — growth stage, significant capital deployed',
  LATE_PRIVATE:   'Late-stage private — pre-IPO or growth unicorn',
  PUBLIC:         'Public company — subject to quarterly earnings pressure',
  PE_BACKED:      'Private equity backed — cost extraction and EBITDA focus',
  BOOTSTRAPPED:   'Bootstrapped — profitable but limited capital buffer',
  UNKNOWN:        'Funding stage unknown',
};

const STAGE_RISK_CONTEXT: Record<FundingStage, string> = {
  PRE_SEED:       'Pre-seed companies have a 70%+ failure rate within 5 years. Cash runway is the primary risk — when it runs out, cuts are immediate.',
  SEED:           'Seed-stage companies average 18 months runway. 40%+ fail to raise a Series A, resulting in rapid wind-down.',
  SERIES_A:       'Series A companies face "second valley of death" if they cannot prove product-market fit. Pivots often involve headcount restructuring.',
  SERIES_B:       'Series B companies must prove unit economics. If CAC/LTV ratios deteriorate, cuts to sales and G&A come within 60–90 days of a board review.',
  SERIES_C_PLUS:  'Growth-stage companies under pressure to hit metrics for Series D or IPO readiness often cut non-core functions.',
  LATE_PRIVATE:   'Late-stage privates often over-hired in 2020-2022 and are now right-sizing. Efficiency cuts (AI substitution) are common.',
  PUBLIC:         'Public companies face quarterly earnings pressure. Revenue misses immediately translate to cost reduction mandates.',
  PE_BACKED:      'PE ownership drives a distinct pattern: 15-30% headcount reduction is the median in the first 18 months as EBITDA is maximized.',
  BOOTSTRAPPED:   'Bootstrapped companies cut faster when revenue drops — no external capital buffer. Layoffs are correlated with revenue decline.',
  UNKNOWN:        'Funding stage unknown — using sector base rates as proxy.',
};

// ─── Runway Estimation Heuristics ────────────────────────────────────────────
// Based on public burn rate benchmarks by stage (Bessemer VP, 2026)
// These are estimates from publicly available signals
const STAGE_TYPICAL_RUNWAY_MONTHS: Record<FundingStage, [number, number]> = {
  PRE_SEED:       [6,  12],
  SEED:           [12, 18],
  SERIES_A:       [18, 24],
  SERIES_B:       [18, 30],
  SERIES_C_PLUS:  [24, 36],
  LATE_PRIVATE:   [24, 48],
  PUBLIC:         [36, 120],
  PE_BACKED:      [18, 36],
  BOOTSTRAPPED:   [12, 60],
  UNKNOWN:        [12, 24],
};

function estimateRunway(
  stage: FundingStage,
  monthsSinceLastRaise: number | null,
): number | null {
  if (monthsSinceLastRaise === null) return null;
  const [min, max] = STAGE_TYPICAL_RUNWAY_MONTHS[stage];
  const typicalRunway = (min + max) / 2;
  const remainingEstimate = typicalRunway - monthsSinceLastRaise;
  return Math.max(0, Math.round(remainingEstimate));
}

function classifyHealthSignal(runwayMonths: number | null, monthsSinceRaise: number | null): FundingHealthSignal {
  if (runwayMonths === null) return 'UNKNOWN';
  if (runwayMonths > 18) return 'HEALTHY';
  if (runwayMonths > 12) return (monthsSinceRaise ?? 0) > 12 ? 'MONITORING' : 'HEALTHY';
  if (runwayMonths > 6)  return 'STRESSED';
  return 'CRITICAL';
}

function assessDownRound(
  stage: FundingStage,
  monthsSinceRaise: number | null,
  revenueGrowthYoY: number | null,
): { risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'; signals: string[] } {
  const signals: string[] = [];
  let riskCount = 0;

  if ((monthsSinceRaise ?? 0) > 24) {
    signals.push('No raise in 24+ months — typical raise cycles are 12-18 months');
    riskCount++;
  }
  if ((monthsSinceRaise ?? 0) > 18) {
    signals.push('18+ months since last raise — bridge round or down-round likely if not profitable');
    riskCount++;
  }
  if (revenueGrowthYoY !== null && revenueGrowthYoY < 0) {
    signals.push('Negative revenue growth — will face valuation haircut at next raise');
    riskCount++;
  }
  if (revenueGrowthYoY !== null && revenueGrowthYoY < 20 && ['SERIES_B', 'SERIES_C_PLUS'].includes(stage)) {
    signals.push(`${revenueGrowthYoY}% growth below the 40%+ expected at ${stage} — valuation pressure likely`);
    riskCount++;
  }

  if (stage === 'UNKNOWN' || stage === 'PUBLIC') {
    return { risk: 'NONE', signals: [] };
  }

  return {
    risk: riskCount >= 3 ? 'HIGH' : riskCount >= 2 ? 'MEDIUM' : riskCount >= 1 ? 'LOW' : 'NONE',
    signals,
  };
}

function getFundingActions(
  healthSignal: FundingHealthSignal,
  stage: FundingStage,
  runwayMonths: number | null,
): FundingAction[] {
  const actions: FundingAction[] = [];

  if (healthSignal === 'CRITICAL' || (runwayMonths !== null && runwayMonths < 6)) {
    actions.push({
      action: 'Treat this as an emergency — begin active job search immediately',
      why: `With an estimated ${runwayMonths ?? '< 6'} months of company runway, there is a high probability of layoffs or wind-down within the next quarter. Don't wait for an official announcement.`,
      urgency: 'immediate',
    });
  }

  if (healthSignal === 'STRESSED') {
    actions.push({
      action: 'Begin passive job market exploration now — not urgently, but consistently',
      why: 'Stressed runway (6–12 months) means any revenue miss or failed fundraise could accelerate cuts. Starting your market exploration gives you 60–90 days of lead time.',
      urgency: 'within_30d',
    });
  }

  if (stage === 'PE_BACKED') {
    actions.push({
      action: 'Map your function to EBITDA contribution within 30 days',
      why: 'PE firms optimize for EBITDA. Functions that cannot demonstrate a clear contribution to profitability within 6-12 months of acquisition are typically restructured first.',
      urgency: 'within_30d',
    });
  }

  actions.push({
    action: 'Track the company\'s next funding round or earnings call timeline',
    why: 'Funding events are inflection points. A successful raise = temporary safety; a failed raise or earnings miss = immediate cost-cutting. Knowing when these events occur gives you 30–60 days of intelligence.',
    urgency: 'within_90d',
  });

  return actions;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface FundingStageRiskInput {
  fundingStage?: FundingStage;
  monthsSinceLastRaise?: number;   // how many months since the most recent round
  revenueGrowthYoY?: number | null;
  hasHiringFreeze?: boolean;
  hasBridgeRound?: boolean;        // bridge financing = distress signal
}

export function computeFundingStageRisk(
  input: FundingStageRiskInput,
): FundingStageRiskResult {
  try {
    const {
      fundingStage = 'UNKNOWN',
      monthsSinceLastRaise = null,
      revenueGrowthYoY = null,
      hasHiringFreeze = false,
      hasBridgeRound = false,
    } = input;

    const runwayEstimate = estimateRunway(fundingStage, monthsSinceLastRaise);
    const healthSignal = hasBridgeRound ? 'CRITICAL'
      : classifyHealthSignal(runwayEstimate, monthsSinceLastRaise);

    const { risk: downRoundRisk, signals: downRoundSignals } = assessDownRound(
      fundingStage, monthsSinceLastRaise, revenueGrowthYoY,
    );

    // Risk score: base stage risk + health signal modifier
    const healthModifier: Record<FundingHealthSignal, number> = {
      HEALTHY:    -15,
      MONITORING:  0,
      STRESSED:   +20,
      CRITICAL:   +40,
      UNKNOWN:     0,
    };
    const downRoundModifier: Record<typeof downRoundRisk, number> = {
      HIGH: +20, MEDIUM: +10, LOW: +5, NONE: 0,
    };
    const bridgeBonus = hasBridgeRound ? 25 : 0;
    const freezeBonus = hasHiringFreeze ? 10 : 0;

    const fundingRiskScore = Math.min(100, Math.max(0,
      STAGE_BASE_RISK[fundingStage]
      + healthModifier[healthSignal]
      + downRoundModifier[downRoundRisk]
      + bridgeBonus
      + freezeBonus,
    ));

    const monthsSinceRaiseLabel: FundingStageRiskResult['monthsSinceRaise'] =
      monthsSinceLastRaise === null ? 'UNKNOWN'
      : monthsSinceLastRaise <= 12 ? 'RECENT'
      : monthsSinceLastRaise <= 20 ? 'AGING'
      : 'STALE';

    return {
      fundingStage,
      healthSignal,
      fundingRiskScore,
      runwayEstimateMonths: runwayEstimate,
      layoffProbabilityAt12mo: STAGE_LAYOFF_PROBABILITY[fundingStage],
      downRoundRisk,
      downRoundSignals,
      stageLabel: STAGE_LABELS[fundingStage],
      stageRiskContext: STAGE_RISK_CONTEXT[fundingStage],
      burnRateRisk: hasBridgeRound ? 'EXCESSIVE'
        : healthSignal === 'CRITICAL' ? 'EXCESSIVE'
        : healthSignal === 'STRESSED' ? 'ELEVATED'
        : healthSignal === 'MONITORING' ? 'MODERATE'
        : 'UNKNOWN',
      lastFundingMonthsAgo: monthsSinceLastRaise,
      monthsSinceRaise: monthsSinceRaiseLabel,
      fundingActions: getFundingActions(healthSignal, fundingStage, runwayEstimate),
      calibrationStatus: 'research_grounded',
    };
  } catch {
    // Use the input's fundingStage if available so PUBLIC companies (risk=18,
    // prob=0.10) don't incorrectly fall back to UNKNOWN defaults (35, 0.20).
    const safeStage: FundingStage =
      input?.fundingStage != null && STAGE_BASE_RISK[input.fundingStage as FundingStage] != null
        ? (input.fundingStage as FundingStage)
        : 'UNKNOWN';
    return {
      fundingStage: safeStage,
      healthSignal: 'UNKNOWN',
      fundingRiskScore: STAGE_BASE_RISK[safeStage],
      runwayEstimateMonths: null,
      layoffProbabilityAt12mo: STAGE_LAYOFF_PROBABILITY[safeStage],
      downRoundRisk: 'NONE',
      downRoundSignals: [],
      stageLabel: STAGE_LABELS[safeStage],
      stageRiskContext: STAGE_RISK_CONTEXT[safeStage],
      burnRateRisk: 'UNKNOWN',
      lastFundingMonthsAgo: null,
      monthsSinceRaise: 'UNKNOWN',
      fundingActions: [],
      calibrationStatus: 'research_grounded',
    };
  }
}
