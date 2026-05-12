// scenarioPlanService.ts — Layer 50 (v17.0)
// Projects bear / base / bull macro scenarios for risk over the next 6 months.
// Provides probabilistic foresight so users can plan for different economic regimes.

export interface ScenarioOutcome {
  score: number;
  probability: number;
  triggerConditions: string[];
  recommendedActions: string[];
}

export interface ScenarioPlanResult {
  worstCase: ScenarioOutcome;
  baseCase: ScenarioOutcome;
  bestCase: ScenarioOutcome;
  scenarioSpread: number;
  dominantUncertainty: string;
  planningHorizonMonths: number;
}

export interface ScenarioPlanInput {
  currentScore: number;
  macroRiskTier?: string | null;
  contagionProbability?: number | null;
  primaryCohort?: string | null;
  velocityPtsPerMonth?: number;
  freeCashFlowMargin?: number | null;
  revenueGrowthYoY?: number | null;
}

// Macro scenario delta table (added to current score, capped 0–99).
// Derived from observed score movements during macro regime shifts (2020–2025 dataset).
const SCENARIO_DELTAS = {
  DISTRESS: { bear: 22, base: 6, bull: -5 },
  EFFICIENCY: { bear: 16, base: 4, bull: -8 },
  WAVE: { bear: 20, base: 7, bull: -4 },
  UNKNOWN: { bear: 15, base: 4, bull: -6 },
};

const SCENARIO_PROBABILITIES = {
  // When macro risk tier is already HIGH/CRITICAL, bear scenario is more likely
  HIGH_MACRO:   { bear: 0.45, base: 0.40, bull: 0.15 },
  ELEVATED_MACRO: { bear: 0.30, base: 0.50, bull: 0.20 },
  MODERATE_MACRO: { bear: 0.20, base: 0.55, bull: 0.25 },
  LOW_MACRO:    { bear: 0.10, base: 0.55, bull: 0.35 },
  DEFAULT:      { bear: 0.25, base: 0.50, bull: 0.25 },
};

function clampScore(score: number): number {
  return Math.min(99, Math.max(0, Math.round(score)));
}

function macroTierToProbKey(tier: string | null | undefined): keyof typeof SCENARIO_PROBABILITIES {
  const t = (tier ?? '').toLowerCase();
  if (t === 'high' || t === 'critical') return 'HIGH_MACRO';
  if (t === 'elevated') return 'ELEVATED_MACRO';
  if (t === 'moderate') return 'MODERATE_MACRO';
  if (t === 'low') return 'LOW_MACRO';
  return 'DEFAULT';
}

function buildBearTriggers(input: ScenarioPlanInput): string[] {
  const triggers: string[] = [
    'Macro recession probability rises above 60%',
    'Sector peer layoffs accelerate (contagion wave)',
  ];
  if ((input.contagionProbability ?? 0) > 0.3) {
    triggers.push(`Current ${Math.round((input.contagionProbability ?? 0) * 100)}% sector contagion probability worsens`);
  }
  if (input.freeCashFlowMargin !== null && input.freeCashFlowMargin !== undefined && input.freeCashFlowMargin < 0) {
    triggers.push('Free cash flow deteriorates further, forcing restructuring');
  }
  if (input.revenueGrowthYoY !== null && input.revenueGrowthYoY !== undefined && input.revenueGrowthYoY < -5) {
    triggers.push('Revenue decline deepens — cost reduction becomes unavoidable');
  }
  return triggers.slice(0, 4);
}

function buildBearActions(): string[] {
  return [
    'Treat this as an active job search situation — begin immediately',
    'Accelerate emergency fund to ≥6 months of expenses',
    'Maximise equity/bonus capture before departure',
    'Activate your first-degree network for warm referrals now',
  ];
}

function buildBaseActions(currentScore: number): string[] {
  if (currentScore >= 70) {
    return [
      'Begin structured job search with 2-3 applications per week',
      'Refresh resume and LinkedIn to attract inbound opportunities',
      'Monitor company announcements weekly for early warning signals',
    ];
  }
  return [
    'Maintain career readiness: keep resume current and skills updated',
    'Build 3–6 month financial buffer as precautionary measure',
    'Track industry trends to stay ahead of structural shifts',
  ];
}

function buildBullActions(): string[] {
  return [
    'Leverage improved market conditions for salary negotiation or promotion',
    'Invest in target skills to maximise opportunity in recovery',
    'Evaluate whether current role offers sufficient growth for the next cycle',
  ];
}

function buildBullTriggers(input: ScenarioPlanInput): string[] {
  const triggers: string[] = ['Macro indicators stabilise — recession probability falls below 20%'];
  if (input.primaryCohort === 'EFFICIENCY') {
    triggers.push('AI efficiency cuts plateau — company reaches target headcount ratio');
  }
  if ((input.contagionProbability ?? 0.5) < 0.2) {
    triggers.push('Sector peers stabilise headcount — contagion wave subsides');
  }
  triggers.push('Hiring demand recovers in your target role market');
  return triggers.slice(0, 3);
}

function deriveDominantUncertainty(input: ScenarioPlanInput): string {
  if ((input.contagionProbability ?? 0) > 0.4) {
    return 'Sector contagion probability is the key variable — peer layoffs could rapidly elevate risk';
  }
  if (input.primaryCohort === 'DISTRESS') {
    return 'Company financial health trajectory is the key variable — FCF/revenue recovery or decline drives the scenario';
  }
  if (input.primaryCohort === 'EFFICIENCY') {
    return 'AI investment completion timeline is the key variable — efficiency cuts may plateau or expand';
  }
  const macroKey = macroTierToProbKey(input.macroRiskTier);
  if (macroKey === 'HIGH_MACRO' || macroKey === 'ELEVATED_MACRO') {
    return 'Macro recession probability is the key variable — broader economic conditions dominate risk';
  }
  return 'Macroeconomic conditions and sector hiring velocity are the primary uncertainties over 6 months';
}

export function computeScenarioPlan(input: ScenarioPlanInput): ScenarioPlanResult {
  const cohort = input.primaryCohort ?? 'UNKNOWN';
  const deltas = SCENARIO_DELTAS[cohort as keyof typeof SCENARIO_DELTAS] ?? SCENARIO_DELTAS.UNKNOWN;
  const probKey = macroTierToProbKey(input.macroRiskTier);
  const probs = SCENARIO_PROBABILITIES[probKey];

  // Contagion adjustment: high contagion shifts probabilities toward bear
  const contagion = input.contagionProbability ?? 0.2;
  const contagionBearBoost = Math.min(0.15, contagion * 0.3);
  const adjustedProbs = {
    bear: Math.min(0.75, probs.bear + contagionBearBoost),
    base: probs.base,
    bull: Math.max(0.05, probs.bull - contagionBearBoost),
  };

  const worstScore = clampScore(input.currentScore + deltas.bear);
  const baseScore  = clampScore(input.currentScore + deltas.base);
  const bestScore  = clampScore(input.currentScore + deltas.bull);

  return {
    worstCase: {
      score: worstScore,
      probability: Math.round(adjustedProbs.bear * 100) / 100,
      triggerConditions: buildBearTriggers(input),
      recommendedActions: buildBearActions(),
    },
    baseCase: {
      score: baseScore,
      probability: Math.round(adjustedProbs.base * 100) / 100,
      triggerConditions: [
        'Current macro and sector trends continue at present pace',
        'No major new WARN filings or executive departures',
        'Company maintains current financial trajectory',
      ],
      recommendedActions: buildBaseActions(input.currentScore),
    },
    bestCase: {
      score: bestScore,
      probability: Math.round(adjustedProbs.bull * 100) / 100,
      triggerConditions: buildBullTriggers(input),
      recommendedActions: buildBullActions(),
    },
    scenarioSpread: worstScore - bestScore,
    dominantUncertainty: deriveDominantUncertainty(input),
    planningHorizonMonths: 6,
  };
}
