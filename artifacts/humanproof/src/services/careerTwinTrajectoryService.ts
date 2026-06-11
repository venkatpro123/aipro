// careerTwinTrajectoryService.ts — Career OS: the living Twin model
//
// Rule #3: "Current Career Twin is mostly a score. That is not a twin."
//
// This turns the Twin from a single risk number into a living digital model of
// EIGHT trajectories — each with a current value, a direction, a 6-month
// projection, and the causal drivers moving it (Rule #5). It is a PURE function
// over an existing HybridResult + profile + the twin's audit-score history; it
// adds no new intelligence layer, it composes the engines already in the result.
//
// The Twin becomes the central intelligence object: every trajectory references
// signals other engines already produced, unified into one evolving picture.

import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';

export type TrajectoryKey =
  | 'layoff_probability'
  | 'ai_displacement'
  | 'career_momentum'
  | 'salary'
  | 'promotion'
  | 'market_demand'
  | 'skill_growth'
  | 'financial_resilience';

export interface CareerTrajectory {
  key: TrajectoryKey;
  label: string;
  icon: string;
  /** 0–100 in the trajectory's native sense (for risk keys, higher = worse). */
  currentValue: number;
  direction: 'rising' | 'falling' | 'stable';
  /** Human momentum phrase, e.g. "+2.1 pts/mo", "accelerating", "demand rising". */
  momentumLabel: string;
  /** 0–100 projected value ~6 months out at the current rate. */
  projection6mo: number;
  /** true = higher value is worse (risk trajectory); false = higher is better. */
  isRisk: boolean;
  /** Health interpretation accounting for isRisk. */
  status: 'strong' | 'fair' | 'weak';
  /** Causal drivers — why this trajectory is where it is / moving as it is. */
  drivers: string[];
  /** Provenance (Rule 17): 'modeled' when a real engine backs it, 'estimated' on fallback. */
  confidenceKind: 'measured' | 'modeled' | 'estimated';
}

export interface CareerTwinModel {
  trajectories: CareerTrajectory[];
  overallDirection: 'improving' | 'stable' | 'deteriorating';
  /** "Your Twin is strengthening on 5 of 8 trajectories." */
  headline: string;
  /** Count of trajectories whose status is 'weak' — the active fronts to defend. */
  weakCount: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Status accounting for whether the trajectory is a risk (higher worse) or opportunity. */
function statusFor(value: number, isRisk: boolean): CareerTrajectory['status'] {
  const good = isRisk ? value <= 35 : value >= 65;
  const bad = isRisk ? value >= 65 : value <= 35;
  return good ? 'strong' : bad ? 'weak' : 'fair';
}

/** Project a value forward 6 months given a signed per-month delta, clamped. */
function project(value: number, perMonth: number): number {
  return clamp(value + perMonth * 6);
}

export function computeCareerTrajectories(
  hr: HybridResult,
  profile: UserProfile | null,
  scoreHistory: Array<{ date: string; score: number }> = [],
): CareerTwinModel {
  const anyHr = hr as any;
  // Built without confidenceKind; stamped in one place after the array is complete.
  const trajectories: Array<Omit<CareerTrajectory, 'confidenceKind'> & { confidenceKind?: CareerTrajectory['confidenceKind'] }> = [];

  // Shared trend signal from the score-trajectory engine (risk pts/month).
  const velPtsPerMonth: number = anyHr.scoreTrajectory?.velocityPtsPerMonth ?? 0;
  const riskDir: 'rising' | 'falling' | 'stable' =
    velPtsPerMonth > 0.5 ? 'rising' : velPtsPerMonth < -0.5 ? 'falling' : 'stable';

  // ── 1. Layoff probability ───────────────────────────────────────────────────
  {
    const p12 = anyHr.precisionSurvival?.probability12m ?? anyHr.survivalProbability?.probability12m ?? null;
    const value = p12 != null ? clamp(p12 * 100) : clamp(hr.total ?? 50);
    const topRisk = anyHr.precisionSurvival?.topRiskFactor?.label
      ?? anyHr.survivalProbability?.topRiskFactor?.label
      ?? null;
    const drivers: string[] = [];
    if (topRisk) drivers.push(`Largest driver: ${topRisk}.`);
    if (riskDir === 'rising') drivers.push(`Risk rising ~${velPtsPerMonth.toFixed(1)} pts/month at current trajectory.`);
    else if (riskDir === 'falling') drivers.push(`Risk easing ~${Math.abs(velPtsPerMonth).toFixed(1)} pts/month — your actions are landing.`);
    else drivers.push('Holding steady — no significant directional change this cycle.');
    trajectories.push({
      key: 'layoff_probability', label: 'Layoff Probability', icon: '🛡️',
      currentValue: value, direction: riskDir,
      momentumLabel: velPtsPerMonth === 0 ? 'stable' : `${velPtsPerMonth > 0 ? '+' : ''}${velPtsPerMonth.toFixed(1)} pts/mo`,
      projection6mo: project(value, velPtsPerMonth),
      isRisk: true, status: statusFor(value, true), drivers,
    });
  }

  // ── 2. AI displacement ──────────────────────────────────────────────────────
  {
    const d1 = (hr.dimensions?.find(d => d.key === 'D1')?.score)
      ?? (anyHr.aiExposureIndex != null ? anyHr.aiExposureIndex * 100 : null)
      ?? (hr.breakdown?.L3 != null ? hr.breakdown.L3 * 100 : 45);
    const value = clamp(d1);
    const stack = anyHr.techStackObsolescence;
    const drivers: string[] = [];
    if (stack?.primaryStackStatus && stack.primaryStackStatus !== 'CURRENT') {
      drivers.push(`Primary tech stack status: ${stack.primaryStackStatus}.`);
    }
    drivers.push(value >= 60
      ? 'AI tooling is actively automating tasks in your role category.'
      : value >= 40
        ? 'Partial automation pressure — augmentable, not yet displacing.'
        : 'Low automation exposure for your role at present.');
    // AI exposure drifts upward structurally; rate scales with current exposure.
    const aiDrift = value >= 60 ? 1.2 : value >= 40 ? 0.6 : 0.2;
    trajectories.push({
      key: 'ai_displacement', label: 'AI Displacement Exposure', icon: '🤖',
      currentValue: value, direction: aiDrift >= 0.6 ? 'rising' : 'stable',
      momentumLabel: aiDrift >= 1.2 ? 'accelerating' : aiDrift >= 0.6 ? 'rising' : 'stable',
      projection6mo: project(value, aiDrift), isRisk: true,
      status: statusFor(value, true), drivers,
    });
  }

  // ── 3. Career momentum ──────────────────────────────────────────────────────
  {
    // careerVelocity.velocityScore is a RISK score (higher = slower). Invert it.
    const velScore = anyHr.careerVelocity?.velocityScore;
    const traj: string | undefined = anyHr.careerVelocity?.trajectory;
    const value = velScore != null ? clamp(100 - velScore) : clamp(100 - (hr.total ?? 50));
    const dir: CareerTrajectory['direction'] =
      traj === 'ACCELERATING' ? 'rising' : traj === 'DECLINING' || traj === 'PLATEAUED' ? 'falling' : 'stable';
    const drivers: string[] = [];
    if (traj && traj !== 'UNKNOWN') drivers.push(`Velocity engine reads your trajectory as ${traj.toLowerCase()}.`);
    drivers.push(value >= 65
      ? 'Strong forward motion — visible progress and advancement signals.'
      : value >= 40 ? 'Steady but not accelerating — watch for plateau.'
      : 'Stalled momentum — no recent advancement signals detected.');
    const perMonth = dir === 'rising' ? 1.0 : dir === 'falling' ? -1.0 : 0;
    trajectories.push({
      key: 'career_momentum', label: 'Career Momentum', icon: '🚀',
      currentValue: value, direction: dir,
      momentumLabel: traj && traj !== 'UNKNOWN' ? traj.toLowerCase() : 'steady',
      projection6mo: project(value, perMonth), isRisk: false,
      status: statusFor(value, false), drivers,
    });
  }

  // ── 4. Salary positioning ───────────────────────────────────────────────────
  {
    const comp = anyHr.compensationRisk;
    const pos: string | undefined = comp?.payPosition;
    const deltaPct: number | null = comp?.marketDeltaPct ?? null;
    // Map pay position to a 0–100 "earning power" value.
    const posValue: Record<string, number> = {
      HIGHLY_ABOVE_MARKET: 88, ABOVE_MARKET: 74, AT_MARKET: 58,
      BELOW_MARKET: 40, HIGHLY_BELOW_MARKET: 24, UNKNOWN: 55,
    };
    const value = clamp(posValue[pos ?? 'UNKNOWN'] ?? 55);
    const drivers: string[] = [];
    if (deltaPct != null) drivers.push(`You are ${deltaPct >= 0 ? '+' : ''}${Math.round(deltaPct)}% vs. market median for your role.`);
    if (pos === 'HIGHLY_ABOVE_MARKET') drivers.push('Premium pay is leverage now but a cost-cut target in downturns.');
    else if (pos === 'BELOW_MARKET' || pos === 'HIGHLY_BELOW_MARKET') drivers.push('Underpaid — strong basis for a raise or a market move.');
    else drivers.push('Compensation broadly in line with market.');
    trajectories.push({
      key: 'salary', label: 'Earning Power', icon: '💰',
      currentValue: value, direction: 'stable',
      momentumLabel: deltaPct != null ? `${deltaPct >= 0 ? '+' : ''}${Math.round(deltaPct)}% vs market` : 'at market',
      projection6mo: value, isRisk: false,
      status: statusFor(value, false), drivers,
    });
  }

  // ── 5. Promotion readiness ──────────────────────────────────────────────────
  {
    const mob = anyHr.internalMobility?.viabilityScore;
    const traj: string | undefined = anyHr.careerVelocity?.trajectory;
    const base = mob != null ? clamp(mob) : 45;
    // Accelerating momentum lifts promotion odds; plateau/decline drags them.
    const adj = traj === 'ACCELERATING' ? 8 : traj === 'DECLINING' || traj === 'PLATEAUED' ? -8 : 0;
    const value = clamp(base + adj);
    const drivers: string[] = [];
    if (mob != null) drivers.push(`Internal mobility viability scored ${Math.round(mob)}/100.`);
    drivers.push(value >= 60
      ? 'Well positioned for internal advancement — make the case now.'
      : value >= 40 ? 'Moderate promotion odds — close one visible gap to lift them.'
      : 'Low internal advancement odds — external moves may pay off faster.');
    trajectories.push({
      key: 'promotion', label: 'Promotion Readiness', icon: '📈',
      currentValue: value, direction: adj > 0 ? 'rising' : adj < 0 ? 'falling' : 'stable',
      momentumLabel: adj > 0 ? 'improving' : adj < 0 ? 'softening' : 'steady',
      projection6mo: project(value, adj / 6), isRisk: false,
      status: statusFor(value, false), drivers,
    });
  }

  // ── 6. Market demand ────────────────────────────────────────────────────────
  {
    const md = anyHr.roleMarketDemand;
    const idx: number | null = md?.demandIndex ?? null;
    const trend: string | undefined = md?.demandTrend;
    const value = idx != null ? clamp(idx) : clamp(100 - (hr.breakdown?.L4 != null ? hr.breakdown.L4 * 100 : 50));
    const dir: CareerTrajectory['direction'] =
      trend === 'surging' || trend === 'rising' ? 'rising'
      : trend === 'declining' || trend === 'falling' ? 'falling' : 'stable';
    const perMonth = trend === 'surging' ? 1.5 : trend === 'rising' ? 0.8 : trend === 'declining' ? -0.8 : trend === 'falling' ? -1.5 : 0;
    const drivers: string[] = [];
    if (trend) drivers.push(`Hiring demand for your role is ${trend}.`);
    drivers.push(value >= 65 ? 'Healthy market — multiple landing options if you move.'
      : value >= 40 ? 'Adequate demand but competitive — differentiate to stand out.'
      : 'Thin market — fewer roles than normal; build optionality before you need it.');
    trajectories.push({
      key: 'market_demand', label: 'Market Demand', icon: '🌐',
      currentValue: value, direction: dir,
      momentumLabel: trend ?? 'stable',
      projection6mo: project(value, perMonth), isRisk: false,
      status: statusFor(value, false), drivers,
    });
  }

  // ── 7. Skill growth ─────────────────────────────────────────────────────────
  {
    const fit = anyHr.skillPortfolioFit?.fitScore;
    const value = fit != null ? clamp(fit) : 50;
    const targetCount = profile?.targetSkills?.length ?? 0;
    const drivers: string[] = [];
    if (fit != null) drivers.push(`Skill-market fit scored ${Math.round(fit)}/100 for your role category.`);
    if (targetCount > 0) drivers.push(`${targetCount} target skill${targetCount > 1 ? 's' : ''} in progress — actively closing the gap.`);
    else drivers.push('No target skills set — add them so the Twin can track your growth.');
    // Active upskilling implies a gentle upward drift.
    const perMonth = targetCount > 0 ? 0.8 : 0;
    trajectories.push({
      key: 'skill_growth', label: 'Skill Growth', icon: '🧠',
      currentValue: value, direction: perMonth > 0 ? 'rising' : 'stable',
      momentumLabel: targetCount > 0 ? 'actively growing' : 'flat',
      projection6mo: project(value, perMonth), isRisk: false,
      status: statusFor(value, false), drivers,
    });
  }

  // ── 8. Financial resilience ─────────────────────────────────────────────────
  {
    const runway = profile?.savingsMonthsRunway
      ?? anyHr.userFinancialRunway?.runwayMonths
      ?? anyHr.financialRunwayMonths
      ?? null;
    // 12+ months runway = full resilience; scale linearly below.
    const value = runway != null ? clamp((runway / 12) * 100) : 45;
    const drivers: string[] = [];
    if (runway != null) drivers.push(`~${Number(runway).toFixed(1)} months of financial runway.`);
    else drivers.push('Runway unknown — add savings/expenses so the Twin can model your buffer.');
    drivers.push(value >= 65 ? 'Strong buffer — you can negotiate from strength and walk away from bad offers.'
      : value >= 35 ? 'Moderate buffer — building toward 6+ months sharply increases leverage.'
      : 'Thin buffer — financial pressure narrows your options under stress.');
    const debt = profile?.monthlyDebtObligationsUsd;
    if (debt != null && debt > 0) drivers.push('Monthly debt obligations shorten your effective runway.');
    trajectories.push({
      key: 'financial_resilience', label: 'Financial Resilience', icon: '🏦',
      currentValue: value, direction: 'stable',
      momentumLabel: runway != null ? `${Number(runway).toFixed(0)} mo runway` : 'unknown',
      projection6mo: value, isRisk: false,
      status: statusFor(value, false), drivers,
    });
  }

  // ── Provenance (Rule 17): modeled when a real engine backs the trajectory; ─────
  //    estimated when it fell back to a default. Stamped here so every push above
  //    stays terse and the rule is applied in one auditable place.
  const runwayKnown = profile?.savingsMonthsRunway != null
    || anyHr.userFinancialRunway?.runwayMonths != null || hr.financialRunwayMonths != null;
  const SOURCE_PRESENT: Record<TrajectoryKey, boolean> = {
    layoff_probability:   !!(anyHr.precisionSurvival || anyHr.survivalProbability || anyHr.scoreTrajectory),
    ai_displacement:      hr.dimensions?.some(d => d.key === 'D1') || anyHr.aiExposureIndex != null,
    career_momentum:      !!anyHr.careerVelocity,
    salary:               !!anyHr.compensationRisk,
    promotion:            !!anyHr.internalMobility,
    market_demand:        !!anyHr.roleMarketDemand,
    skill_growth:         !!anyHr.skillPortfolioFit,
    financial_resilience: runwayKnown,
  };
  const finalTrajectories: CareerTrajectory[] = trajectories.map(t => ({
    ...t,
    confidenceKind: t.key === 'financial_resilience' && profile?.savingsMonthsRunway != null
      ? 'measured' // user-provided runway
      : SOURCE_PRESENT[t.key] ? 'modeled' : 'estimated',
  }));

  // ── Overall synthesis ─────────────────────────────────────────────────────────
  const strongCount = finalTrajectories.filter(t => t.status === 'strong').length;
  const weakCount = finalTrajectories.filter(t => t.status === 'weak').length;

  // Improving when more trajectories point favorably than unfavorably.
  const favorable = finalTrajectories.filter(t =>
    (t.isRisk && t.direction === 'falling') || (!t.isRisk && t.direction === 'rising'),
  ).length;
  const unfavorable = finalTrajectories.filter(t =>
    (t.isRisk && t.direction === 'rising') || (!t.isRisk && t.direction === 'falling'),
  ).length;
  const overallDirection: CareerTwinModel['overallDirection'] =
    favorable - unfavorable >= 2 ? 'improving'
    : unfavorable - favorable >= 2 ? 'deteriorating' : 'stable';

  const headline =
    `Your Twin is ${overallDirection === 'improving' ? 'strengthening' : overallDirection === 'deteriorating' ? 'under pressure' : 'holding'} — ` +
    `${strongCount} of 8 trajectories strong${weakCount > 0 ? `, ${weakCount} need defending` : ''}.`;

  return { trajectories: finalTrajectories, overallDirection, headline, weakCount };
}
