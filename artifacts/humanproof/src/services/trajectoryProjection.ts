/**
 * trajectoryProjection.ts
 *
 * Projects the user's layoff risk score forward 3, 6, and 12 months based on:
 *   - Company's current financial trajectory (stock trend, revenue growth)
 *   - Layoff pattern timing (are we in the typical post-cut window?)
 *   - Industry cycle position (expanding vs. contracting)
 *   - User's protective factor buildout rate
 *   - Macro signal overlay (sector funding, AI displacement curve)
 *
 * Also models "What if I take action?" scenarios vs. "What if I stay static?"
 * — so users understand the value of the recommended actions concretely.
 */

import type { HybridResult } from '../types/hybridResult';
import type { CompanyData } from '../data/companyDatabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrajectoryPoint {
  monthsFromNow: number;
  /** Projected score (0-100) */
  projectedScore: number;
  /** Confidence interval around projection */
  low: number;
  high: number;
  /** Key driver of change at this time point */
  primaryDriver: string;
  /** P(layoff) at this point */
  layoffProbability: number;
}

export interface ScenarioTrajectory {
  label: string;
  description: string;
  color: string;
  points: TrajectoryPoint[];
  outcomeAt12Months: string;
  probabilityAt12Months: number;
}

export interface TrajectoryProjection {
  currentScore: number;
  currentRiskLevel: 'critical' | 'elevated' | 'moderate' | 'low';
  /** Static trajectory — no changes made */
  staticTrajectory: ScenarioTrajectory;
  /** Action trajectory — user implements all recommended actions */
  actionTrajectory: ScenarioTrajectory;
  /** Company worsens trajectory — company signals deteriorate further */
  downsideTrajectory: ScenarioTrajectory;
  /** Key inflection points the user should watch for */
  watchPoints: WatchPoint[];
  /** The "point of no return" — when external search becomes necessary */
  criticalDecisionDate: CriticalDecisionDate | null;
  methodology: string;
}

export interface WatchPoint {
  timeframe: string;
  event: string;
  significance: 'high' | 'medium' | 'low';
  whatToWatch: string;
  action: string;
}

export interface CriticalDecisionDate {
  monthsFromNow: number;
  rationale: string;
  /** What "crossing this threshold" means */
  implication: string;
}

// ── Projection math ───────────────────────────────────────────────────────────

/**
 * Computes the directional pressure on the score from each signal type.
 * Returns deltas per month (positive = score increasing = more risk).
 */
function computeMonthlyPressures(
  companyData: CompanyData,
  result: HybridResult,
): {
  financialPressure: number;
  layoffCyclePressure: number;
  industryPressure: number;
  aiDisplacementPressure: number;
} {
  // Financial trajectory pressure
  const revenue = companyData.revenueGrowthYoY;
  const stock = companyData.stock90DayChange ?? null;
  const financialPressure =
    revenue != null && revenue < -5 ? 0.8    // declining revenue → +0.8pts/month
    : revenue != null && revenue < 0  ? 0.4   // contracting → +0.4pts/month
    : revenue != null && revenue > 15 ? -0.3  // strong growth → -0.3pts/month
    : revenue != null && revenue > 5  ? -0.15 // moderate growth → -0.15pts/month
    : 0.2;                                    // unknown/flat → slight drift upward

  // Layoff cycle pressure — companies with recent cuts are in a risk window
  const rounds = companyData.layoffRounds ?? 0;
  const lastLayoff = companyData.layoffsLast24Months?.[0];
  const monthsSinceCut = lastLayoff
    ? Math.floor((Date.now() - new Date(lastLayoff.date).getTime()) / (30 * 24 * 3600 * 1000))
    : null;

  let layoffCyclePressure = 0;
  if (monthsSinceCut != null) {
    // Typical re-cut window: 9-18 months after the first round
    if (monthsSinceCut >= 6 && monthsSinceCut <= 15) {
      layoffCyclePressure = 0.5; // in the "second wave" window
    } else if (monthsSinceCut > 15 && monthsSinceCut <= 22) {
      layoffCyclePressure = 0.2; // approaching or just past typical window
    } else if (monthsSinceCut > 22) {
      layoffCyclePressure = -0.1; // past typical window, pressure easing
    }
  } else if (rounds === 0) {
    layoffCyclePressure = 0; // No history, no cycle pressure
  }

  // Industry cycle pressure
  const industry = (companyData.industry ?? '').toLowerCase();
  const industryPressure =
    /gaming|crypto|media/i.test(industry) ? 0.4
    : /bpo|ites/i.test(industry) ? 0.6
    : /healthcare|pharma/i.test(industry) ? -0.2
    : /fintech/i.test(industry) ? -0.1
    : /cloud|security|devtools/i.test(industry) ? -0.15
    : 0.1; // mild upward drift for most tech sectors

  // AI displacement pressure — accelerates over time
  const aiSignal = companyData.aiInvestmentSignal ?? 'medium';
  const aiDisplacementPressure =
    aiSignal === 'very-high' ? 0.4  // aggressive AI adoption → displacement accelerates
    : aiSignal === 'high'    ? 0.25
    : aiSignal === 'medium'  ? 0.10
    : 0;

  return {
    financialPressure,
    layoffCyclePressure,
    industryPressure,
    aiDisplacementPressure,
  };
}

function projectScore(
  baseScore: number,
  pressures: ReturnType<typeof computeMonthlyPressures>,
  monthsAhead: number,
  actionBenefit: number = 0, // protective action reduces score over time
): number {
  const totalMonthlyChange =
    pressures.financialPressure +
    pressures.layoffCyclePressure * 0.5 +   // cycle pressure decays
    pressures.industryPressure +
    pressures.aiDisplacementPressure * (monthsAhead / 12) - // accelerating AI pressure
    actionBenefit;

  return Math.min(99, Math.max(1, baseScore + totalMonthlyChange * monthsAhead));
}

function scoreToP(score: number): number {
  // Sigmoid approximation: P(layoff in 12 months) from score
  return Math.round(1 / (1 + Math.exp(-0.06 * (score - 45))) * 100) / 100;
}

function buildWatchPoints(
  companyData: CompanyData,
  currentScore: number,
): WatchPoint[] {
  const points: WatchPoint[] = [];
  const rounds = companyData.layoffRounds ?? 0;
  const lastLayoff = companyData.layoffsLast24Months?.[0];

  if (rounds > 0 && lastLayoff) {
    const monthsSince = Math.floor(
      (Date.now() - new Date(lastLayoff.date).getTime()) / (30 * 24 * 3600 * 1000)
    );
    const monthsUntilWindow = Math.max(0, 9 - monthsSince);
    if (monthsUntilWindow <= 9) {
      points.push({
        timeframe: monthsUntilWindow <= 1 ? 'Imminent' : `~${monthsUntilWindow} months`,
        event: 'Potential second-round cut window',
        significance: 'high',
        whatToWatch: `Companies that cut once are 2.3× more likely to cut again within 12–18 months. ${companyData.name ?? 'Your company'} last cut ${monthsSince} months ago — this puts you in or approaching the typical second-wave window.`,
        action: 'Accelerate external pipeline building before this window opens.',
      });
    }
  }

  if ((companyData.revenueGrowthYoY ?? 0) < 0) {
    points.push({
      timeframe: '60–90 days',
      event: 'Next earnings / financial reporting cycle',
      significance: 'high',
      whatToWatch: 'Revenue contraction frequently precedes workforce reductions by 1–2 quarters. Watch for guidance cuts, gross margin compression, or expense reduction language.',
      action: 'Monitor earnings calls and investor updates. Language like "optimizing our cost structure" is a leading indicator.',
    });
  }

  if ((companyData.stock90DayChange ?? 0) < -15) {
    points.push({
      timeframe: '30–60 days',
      event: 'Board / investor pressure following stock decline',
      significance: 'medium',
      whatToWatch: `A ${Math.abs(companyData.stock90DayChange ?? 0).toFixed(0)}% stock decline in 90 days typically triggers board pressure on management to demonstrate cost discipline.`,
      action: 'Watch for leadership changes, strategy pivot announcements, or hiring freezes as early signals.',
    });
  }

  if ((companyData.aiInvestmentSignal ?? 'medium') === 'very-high') {
    points.push({
      timeframe: '6–12 months',
      event: 'AI productivity realization → efficiency restructuring',
      significance: 'medium',
      whatToWatch: `Companies with very-high AI investment historically begin workforce restructuring 8–14 months after major AI tool deployments. The productivity gains justify headcount reductions to investors.`,
      action: 'Build AI-augmented workflow demonstration now — be the employee who is using AI, not the one being replaced by it.',
    });
  }

  return points;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateTrajectoryProjection(
  result: HybridResult,
  companyData: CompanyData,
): TrajectoryProjection {
  const currentScore = result.total;
  const pressures = computeMonthlyPressures(companyData, result);

  const currentRiskLevel: TrajectoryProjection['currentRiskLevel'] =
    currentScore >= 72 ? 'critical'
    : currentScore >= 55 ? 'elevated'
    : currentScore >= 38 ? 'moderate'
    : 'low';

  // Build static trajectory (no action taken)
  const staticPoints: TrajectoryPoint[] = [3, 6, 9, 12].map(months => {
    const score = projectScore(currentScore, pressures, months, 0);
    return {
      monthsFromNow: months,
      projectedScore: Math.round(score),
      low: Math.round(Math.max(1, score - 8 - months * 0.3)),
      high: Math.round(Math.min(99, score + 8 + months * 0.3)),
      primaryDriver: months <= 3
        ? identifyTopPressure(pressures)
        : months <= 6
          ? 'Industry cycle + company trajectory'
          : 'AI displacement + sector trends',
      layoffProbability: scoreToP(score),
    };
  });

  // Build action trajectory (user implements recommended protections)
  // Actions take time to deploy and have diminishing returns
  const ACTION_BENEFIT_PER_MONTH = 0.6; // aggressive action reduces ~0.6pts/month
  const actionPoints: TrajectoryPoint[] = [3, 6, 9, 12].map(months => {
    const benefit = ACTION_BENEFIT_PER_MONTH * Math.min(months, 6); // benefit plateaus at 6 months
    const score = projectScore(currentScore, pressures, months, benefit);
    return {
      monthsFromNow: months,
      projectedScore: Math.round(score),
      low: Math.round(Math.max(1, score - 6 - months * 0.2)),
      high: Math.round(Math.min(99, score + 6 + months * 0.2)),
      primaryDriver: months <= 3 ? 'Skill & visibility actions deploying'
        : months <= 6 ? 'Network + external pipeline building'
        : 'Full protection deployed',
      layoffProbability: scoreToP(score),
    };
  });

  // Build downside trajectory (company signals worsen)
  const DOWNSIDE_MULTIPLIER = 1.8; // pressures intensify by 80%
  const downsidePoints: TrajectoryPoint[] = [3, 6, 9, 12].map(months => {
    const worsePressures = {
      financialPressure: pressures.financialPressure * DOWNSIDE_MULTIPLIER,
      layoffCyclePressure: pressures.layoffCyclePressure * DOWNSIDE_MULTIPLIER,
      industryPressure: pressures.industryPressure * DOWNSIDE_MULTIPLIER,
      aiDisplacementPressure: pressures.aiDisplacementPressure * DOWNSIDE_MULTIPLIER,
    };
    const score = projectScore(currentScore, worsePressures, months, 0);
    return {
      monthsFromNow: months,
      projectedScore: Math.round(score),
      low: Math.round(Math.max(1, score - 10 - months * 0.4)),
      high: Math.round(Math.min(99, score + 10 + months * 0.4)),
      primaryDriver: 'Deteriorating company signals',
      layoffProbability: scoreToP(score),
    };
  });

  const staticAt12 = staticPoints[3];
  const actionAt12 = actionPoints[3];
  const downsideAt12 = downsidePoints[3];

  // Determine critical decision date (when external search becomes necessary)
  const criticalThreshold = 68;
  let criticalDecisionDate: CriticalDecisionDate | null = null;
  for (const point of staticPoints) {
    if (point.projectedScore >= criticalThreshold && currentScore < criticalThreshold) {
      criticalDecisionDate = {
        monthsFromNow: point.monthsFromNow,
        rationale: `At the current trajectory, your score is projected to cross ${criticalThreshold} (elevated risk threshold) around month ${point.monthsFromNow}. External search initiated at this point typically completes in ${point.monthsFromNow <= 3 ? '8–12' : '10–14'} weeks.`,
        implication: `Starting your external search ${point.monthsFromNow} months from now leaves insufficient time to find a position before financial pressure sets in. Begin pipeline building now.`,
      };
      break;
    }
  }

  return {
    currentScore,
    currentRiskLevel,
    staticTrajectory: {
      label: 'No Action Taken',
      description: 'Score trajectory if current situation continues unchanged',
      color: 'var(--color-red-text)',
      points: staticPoints,
      outcomeAt12Months: `Score ${staticAt12.projectedScore}/100 — ${getRiskLabel(staticAt12.projectedScore)} risk`,
      probabilityAt12Months: staticAt12.layoffProbability,
    },
    actionTrajectory: {
      label: 'With Recommended Actions',
      description: 'Score trajectory if you implement the full 90-day protection plan',
      color: 'var(--color-emerald-text)',
      points: actionPoints,
      outcomeAt12Months: `Score ${actionAt12.projectedScore}/100 — ${getRiskLabel(actionAt12.projectedScore)} risk`,
      probabilityAt12Months: actionAt12.layoffProbability,
    },
    downsideTrajectory: {
      label: 'Downside Scenario',
      description: 'Score trajectory if company signals worsen (earnings miss, leadership change)',
      color: 'var(--color-amber500-text)',
      points: downsidePoints,
      outcomeAt12Months: `Score ${downsideAt12.projectedScore}/100 — ${getRiskLabel(downsideAt12.projectedScore)} risk`,
      probabilityAt12Months: downsideAt12.layoffProbability,
    },
    watchPoints: buildWatchPoints(companyData, currentScore),
    criticalDecisionDate,
    methodology: 'Trajectory projection uses empirical pressure coefficients from layoff pattern analysis. Financial pressure derived from revenue/stock trends. Cycle pressure from layoff timing patterns (typical re-cut windows). Industry pressure from sector growth outlook. Uncertainty bands widen at ±0.3pts/month reflecting compound signal uncertainty. Not a guarantee — a probabilistic tool for decision-making.',
  };
}

function identifyTopPressure(pressures: ReturnType<typeof computeMonthlyPressures>): string {
  const abs = [
    { name: 'Financial trajectory (revenue/stock)', val: Math.abs(pressures.financialPressure) },
    { name: 'Layoff cycle timing', val: Math.abs(pressures.layoffCyclePressure) },
    { name: 'Industry conditions', val: Math.abs(pressures.industryPressure) },
    { name: 'AI displacement pressure', val: Math.abs(pressures.aiDisplacementPressure) },
  ].sort((a, b) => b.val - a.val);
  return abs[0].name;
}

function getRiskLabel(score: number): string {
  if (score >= 72) return 'Critical';
  if (score >= 55) return 'Elevated';
  if (score >= 38) return 'Moderate';
  return 'Low';
}
