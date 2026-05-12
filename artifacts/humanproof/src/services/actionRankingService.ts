// actionRankingService.ts — v15.0
// Re-ranks personalized actions by (impact ÷ effort) × profile multipliers.
// Existing actionPersonalizationEngine.ts owns the action POOL (what is in the
// list); this module owns the ORDERING (which goes first for THIS user).

import type { ActionPlanItem } from '../types/hybridResult';
import type { UserProfile, SalaryBand, VisaStatus } from './userProfileService';

// Weeks-to-proficiency proxy when an action lacks learningWeeks. Tuned so a
// quick action (8h-track, w8≈2 weeks) ranks above a 12-week curriculum at
// equal impact. Conservative default for unmapped actions.
const DEFAULT_EFFORT_WEEKS = 6;

const PRIORITY_BASE: Record<ActionPlanItem['priority'], number> = {
  Critical: 1.4,
  High: 1.2,
  Medium: 1.0,
  Low: 0.85,
};

// Salary multipliers reflect runway and severance asymmetry. Higher salary =
// more cushion = less urgency to complete defensive actions immediately.
// Lower salary = thinner margin = elevate cash-protective actions.
const SALARY_MULTIPLIER: Record<SalaryBand, number> = {
  '<50k':     1.20,
  '50-100k':  1.10,
  '100-150k': 1.00,
  '150-250k': 0.95,
  '250k+':    0.90,
};

// Visa multipliers. H1B/L1/OPT have hard clocks tied to job loss → defensive
// actions are time-critical. Citizens/PRs have geographic flexibility but no
// 60-day filing deadline pressure.
const VISA_MULTIPLIER: Record<VisaStatus, number> = {
  citizen:            1.00,
  permanent_resident: 1.05,
  h1b:                1.30,
  l1:                 1.30,
  opt:                1.40,
  other:              1.10,
  na:                 1.00,
};

// Tenure multiplier: short tenure = severance is small, internal mobility weak
// → external moves get a boost. Long tenure = institutional knowledge moat
// → internal-mobility / negotiation actions get a boost (separate effect, not
// modeled here yet — captured by leaving long tenure neutral).
function tenureMultiplier(years: number | null | undefined): number {
  if (years == null) return 1.0;
  if (years < 1)  return 1.20;
  if (years < 3)  return 1.10;
  if (years < 7)  return 1.00;
  return 0.95;
}

// Convert ActionPlanItem.learningWeeks into an effort-hours estimate. Falls
// back to the DEFAULT_EFFORT_WEEKS proxy when the action does not carry a
// learning-weeks block. The chosen track is the median 8h/week schedule.
function effortHours(action: Partial<ActionPlanItem>): number {
  const lw = action.learningWeeks;
  if (lw && typeof lw.w8 === 'number' && lw.w8 > 0) {
    return lw.w8 * 8;
  }
  return DEFAULT_EFFORT_WEEKS * 8;
}

export interface RankingContext {
  hasDependents?: boolean | null;
  runwaySituation?: string | null;
  careerConfidenceScore?: number | null;
}

export interface RankingScore {
  action: Partial<ActionPlanItem>;
  rankScore: number;
  rationale: string;
}

// Dependents multiplier: users supporting dependents face higher financial
// pressure from job loss → elevate income-protective actions by 15%.
function dependentsMultiplier(hasDependents: boolean | null | undefined): number {
  return hasDependents === true ? 1.15 : 1.0;
}

// Runway multiplier: users with critically short financial runway must act
// faster — elevate all defensive actions to match the compressed timeline.
function runwayMultiplier(situation: string | null | undefined): number {
  const s = (situation ?? '').toLowerCase();
  if (s === 'critical') return 1.35;
  if (s === 'tight')    return 1.15;
  return 1.0;
}

// Career confidence multiplier: low-confidence users benefit most from
// concrete preparation and admin actions (resume, LinkedIn, mock interviews).
function confidenceMultiplier(score: number | null | undefined): number {
  if (score == null) return 1.0;
  return score < 40 ? 1.20 : 1.0;
}

export function rankActions(
  actions: Array<Partial<ActionPlanItem>>,
  profile: UserProfile | null,
  context?: RankingContext | null,
): RankingScore[] {
  const salaryMult   = profile?.salaryBand ? SALARY_MULTIPLIER[profile.salaryBand] : 1.0;
  const visaMult     = profile?.visaStatus  ? VISA_MULTIPLIER[profile.visaStatus]  : 1.0;
  const tenureMult   = tenureMultiplier(profile?.tenureYears ?? null);
  const depMult      = dependentsMultiplier(context?.hasDependents ?? profile?.hasDependents);
  const runwayMult   = runwayMultiplier(context?.runwaySituation);
  const confMult     = confidenceMultiplier(context?.careerConfidenceScore);

  return actions
    .map((action) => {
      const impact = action.riskReductionPct ?? 5;
      const effort = effortHours(action);
      const priorityMult = action.priority ? PRIORITY_BASE[action.priority] : 1.0;
      const profileMult = salaryMult * visaMult * tenureMult * depMult * runwayMult * confMult;

      // Score = priority-weighted impact density × profile multiplier
      const rankScore = (impact * priorityMult * profileMult) / Math.max(1, effort);

      const contextParts: string[] = [];
      if (depMult !== 1.0)    contextParts.push(`deps=${depMult.toFixed(2)}`);
      if (runwayMult !== 1.0) contextParts.push(`runway=${runwayMult.toFixed(2)}`);
      if (confMult !== 1.0)   contextParts.push(`conf=${confMult.toFixed(2)}`);

      const rationale =
        `priority=${(priorityMult).toFixed(2)} · ` +
        `salary=${salaryMult.toFixed(2)} · ` +
        `visa=${visaMult.toFixed(2)} · ` +
        `tenure=${tenureMult.toFixed(2)}` +
        (contextParts.length ? ' · ' + contextParts.join(' · ') : '') +
        ` · impact=${impact}% · effort=${Math.round(effort)}h`;

      return { action, rankScore, rationale };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

// Convenience for callers that only need the re-sorted action list.
export function rankAndUnwrap(
  actions: Array<Partial<ActionPlanItem>>,
  profile: UserProfile | null,
  context?: RankingContext | null,
): Array<Partial<ActionPlanItem>> {
  return rankActions(actions, profile, context).map((r) => r.action);
}
