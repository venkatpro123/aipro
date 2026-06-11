// actionRankingService.ts — v15.1 (Phase 5: cohort outcome multiplier)
// Re-ranks personalized actions by (impact ÷ effort) × profile multipliers.
// Phase 5 adds an optional cohortBoosts map: actions with positive cohort outcomes
// are ranked higher; actions with ≥3 "not helpful" signals are demoted.
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

// Visa multipliers: employer-tied work visas add a hard grace-period clock on
// job loss → defensive/visa-focused actions are elevated. Values are ordered
// by urgency. GC lock-in is handled at the engine level (visaRiskEngine.ts);
// this multiplier only affects action RANKING, not the risk score itself.
const VISA_MULTIPLIER: Record<VisaStatus, number> = {
  // No constraint
  citizen:              1.00,
  permanent_resident:   1.05,
  not_applicable:       1.00,
  na:                   1.00,  // legacy alias
  // US
  h1b:                  1.30,
  l1:                   1.30,
  opt_stem:             1.40,  // 60-day clock + cap-gap complexity
  opt:                  1.40,  // legacy alias
  tn:                   1.35,  // no grace period — immediate status loss
  // UK
  uk_skilled_worker:    1.30,  // 60-day grace + sponsor licence gate; employer constraint
  // EU
  eu_blue_card:         1.12,  // Germany's 6-month buffer reduces urgency significantly
  eu_blue_card_germany: 1.10,  // Explicit Germany §20 AufenthG — most protective globally
  // APAC
  singapore_s_pass:     1.25,  // 10-day cancellation — tightest grace; quota-based
  singapore_ep:         1.20,  // 30-day STVP + MOM processing; Job Seeker Pass option
  australia_482_tss:    1.35,  // 28-day notification + sponsor must transfer; high urgency
  philippines_9g_aep:   1.15,  // per-employer AEP; DOLE publication adds 14+ days
  japan_work_visa:      1.20,  // 30-day grace + MOJ status-change 1–3 months
  // Canada
  canada_lmia_permit:   1.25,  // LMIA process slow but CUSMA/EE/BOWP escape paths exist
  // MENA — employer-tied sponsored visas
  uae_employment_visa:  1.30,  // 30-day grace; 2022 reform transfers available some sectors
  saudi_iqama:          1.35,  // 60-day grace + Nitaqat friction (highest in GCC); employer permission
  qatar_work_permit:    1.25,  // 30-day grace + MoL approval
  kuwait_work_permit:   1.20,  // 90-day grace (longest GCC) — eases slightly
  gcc_sponsored:        1.22,  // Bahrain/Oman conservative baseline
  // UAE Golden Visa: employment-independent residency — low urgency
  uae_golden_visa:      1.05,
  // Generic
  other_work_auth:      1.15,
  other:                1.10,  // legacy alias
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

// Wave 8.2: Seniority-differentiated action category weights.
// Junior → resume + skills first; principal → network + negotiate first.
// Category is inferred from the action title via keyword matching.
export type ActionCategory = 'resume' | 'skills' | 'network' | 'negotiate' | 'other';

const SENIORITY_ACTION_WEIGHTS: Record<string, Record<ActionCategory, number>> = {
  junior:      { resume: 2.0, skills: 1.8, network: 1.2, negotiate: 0.5, other: 1.0 },
  mid:         { resume: 1.5, skills: 1.5, network: 1.5, negotiate: 1.0, other: 1.0 },
  senior:      { resume: 1.0, skills: 1.2, network: 2.0, negotiate: 1.5, other: 1.0 },
  staff_plus:  { resume: 0.7, skills: 0.8, network: 2.5, negotiate: 2.0, other: 1.0 },
  principal:   { resume: 0.5, skills: 0.5, network: 3.0, negotiate: 2.5, other: 1.0 },
};

export function classifyActionCategory(action: Partial<ActionPlanItem>): ActionCategory {
  const t = ((action.title ?? '') + ' ' + (action.description ?? '')).toLowerCase();
  if (/resume|linkedin|portfolio|cv\b|profile updat/.test(t)) return 'resume';
  if (/certif|course|learn|skill|train|bootcamp|aws|gcp|azure|cloud|ai\b|ml\b/.test(t)) return 'skills';
  if (/network|connect|outreach|recruiter|referral|coffee chat|1:1|reach out/.test(t)) return 'network';
  if (/negotiat|equity|retention|retain|bonus|comp|salary|raise|offer/.test(t)) return 'negotiate';
  return 'other';
}

function deriveSeniorityTier(tenureYears: number | null | undefined): string {
  if (tenureYears == null) return 'mid';
  if (tenureYears <= 2)  return 'junior';
  if (tenureYears <= 5)  return 'mid';
  if (tenureYears <= 10) return 'senior';
  if (tenureYears <= 15) return 'staff_plus';
  return 'principal';
}

function seniorityMultiplier(action: Partial<ActionPlanItem>, tenureYears: number | null | undefined): number {
  const tier = deriveSeniorityTier(tenureYears);
  const weights = SENIORITY_ACTION_WEIGHTS[tier] ?? SENIORITY_ACTION_WEIGHTS.mid;
  const category = classifyActionCategory(action);
  return weights[category];
}

// Convert ActionPlanItem.learningWeeks into an effort-hours estimate. Falls
// back to the DEFAULT_EFFORT_WEEKS proxy when the action does not carry a
// learning-weeks block. The chosen track is the median 8h/week schedule.
export function effortHours(action: Partial<ActionPlanItem>): number {
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
  /** Phase 1 (Career OS): boosts derived from career memory patterns. */
  patternBoosts?: { hasInaction?: boolean; hasPlateauPattern?: boolean } | null;
  /** Phase 2 (Career OS): per-user outcome success rates by dimension key (D1, L1…).
   *  rate=0→0.70×, rate=0.5→1.00×, rate=1.0→1.30×. Loaded from getDimensionSuccessMap(). */
  userSuccessRates?: Record<string, number> | null;
}

// Phase 5: cohort boost map — preloaded async by callers via loadCohortBoosts().
// Key = action id or title (same as ActionPlanItem.id). Value = cohort multiplier.
export type CohortBoostMap = Map<string, number>;

/**
 * Compute a ranking multiplier from cohort outcome stats.
 * Positive avg reduction → 1.1–1.35 boost; negative/neutral stays 1.0.
 * Actions with ≥3 "not helpful" cohort signals get a 0.7 demotion.
 */
export function cohortMultiplier(avgRiskReduction: number | null | undefined, negativeSignals = 0): number {
  if (negativeSignals >= 3) return 0.70;
  if (avgRiskReduction == null || avgRiskReduction <= 0) return 1.0;
  // Soft cap: a 20pt avg reduction gives max 1.35× boost
  return Math.min(1.35, 1.0 + Math.max(0, avgRiskReduction) / 100);
}

/**
 * Phase 5: async pre-fetch of cohort boosts for a set of action IDs.
 * Returns a map actionId → cohortMultiplier for all actions with N ≥ 5 data.
 * Non-blocking — returns empty map on failure.
 */
type TenureBand = '<2' | '2-5' | '5-10' | '10+';
const TENURE_BAND_VALUES: TenureBand[] = ['<2', '2-5', '5-10', '10+'];
function toTenureBand(s: string): TenureBand {
  return (TENURE_BAND_VALUES as string[]).includes(s) ? (s as TenureBand) : '<2';
}

export async function loadCohortBoosts(
  roleKey: string,
  tenureBand: string,
  actionIds: string[],
): Promise<CohortBoostMap> {
  const { getCohortOutcomeStats } = await import('./cohortOutcomesAggregator');
  const safeBand = toTenureBand(tenureBand);
  const map: CohortBoostMap = new Map();
  await Promise.all(
    actionIds.slice(0, 10).map(async (id) => {
      try {
        const stats = await getCohortOutcomeStats(roleKey, safeBand, id);
        if (stats && stats.count >= 5) {
          map.set(id, cohortMultiplier(stats.avgRiskReduction));
        }
      } catch { /* non-fatal */ }
    }),
  );
  return map;
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
  cohortBoosts?: CohortBoostMap | null,
): RankingScore[] {
  const salaryMult   = profile?.salaryBand ? SALARY_MULTIPLIER[profile.salaryBand] : 1.0;
  const visaMult     = profile?.visaStatus  ? VISA_MULTIPLIER[profile.visaStatus]  : 1.0;
  const tenureMult   = tenureMultiplier(profile?.tenureYears ?? null);
  const depMult      = dependentsMultiplier(context?.hasDependents ?? profile?.hasDependents);
  const runwayMult   = runwayMultiplier(context?.runwaySituation);
  const confMult     = confidenceMultiplier(context?.careerConfidenceScore);

  // Phase 1 (Career OS): pattern-derived boosts from career memory
  const hasInaction = context?.patternBoosts?.hasInaction ?? false;
  const hasPlateau  = context?.patternBoosts?.hasPlateauPattern ?? false;

  return actions
    .map((action) => {
      const impact = action.riskReductionPct ?? 5;
      const effort = effortHours(action);
      const priorityMult = action.priority ? PRIORITY_BASE[action.priority] : 1.0;
      const seniorityMult = seniorityMultiplier(action, profile?.tenureYears ?? null);
      // Phase 5: cohort outcome boost — actions proven to help users like this one rank higher
      const cohortMult = cohortBoosts?.get(action.id ?? action.title ?? '') ?? 1.0;
      // Phase 1 (Career OS): memory pattern boost — repeated inaction → elevate quick wins;
      // plateau → elevate skills/network actions to break stagnation
      let patternMult = 1.0;
      if (hasInaction && effort <= 16) {
        patternMult = 1.15; // quick action (<= 2-day) gets urgency boost
      } else if (hasPlateau) {
        const cat = classifyActionCategory(action);
        if (cat === 'skills' || cat === 'network') patternMult = 1.10;
      }
      // Phase 2 (Career OS): per-user success rate multiplier — actions that worked for
      // THIS user in their strongest dimension rank higher; weak dims rank lower.
      const dimKey = (action.id ?? '').split('_')[0];
      const userRate = dimKey ? (context?.userSuccessRates?.[dimKey] ?? null) : null;
      const userSuccessMult = userRate != null
        ? Math.min(1.30, Math.max(0.70, 0.70 + userRate * 0.60))
        : 1.0;
      const profileMult = salaryMult * visaMult * tenureMult * depMult * runwayMult * confMult * seniorityMult * cohortMult * patternMult * userSuccessMult;

      // Score = priority-weighted impact density × profile multiplier
      const rankScore = (impact * priorityMult * profileMult) / Math.max(1, effort);

      const contextParts: string[] = [];
      if (depMult !== 1.0)          contextParts.push(`deps=${depMult.toFixed(2)}`);
      if (runwayMult !== 1.0)       contextParts.push(`runway=${runwayMult.toFixed(2)}`);
      if (confMult !== 1.0)         contextParts.push(`conf=${confMult.toFixed(2)}`);
      if (seniorityMult !== 1.0)    contextParts.push(`seniority=${seniorityMult.toFixed(2)}`);
      if (cohortMult !== 1.0)       contextParts.push(`cohort=${cohortMult.toFixed(2)}`);
      if (patternMult !== 1.0)      contextParts.push(`pattern=${patternMult.toFixed(2)}`);
      if (userSuccessMult !== 1.0)  contextParts.push(`userRate=${userSuccessMult.toFixed(2)}`);

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
  cohortBoosts?: CohortBoostMap | null,
): Array<Partial<ActionPlanItem>> {
  return rankActions(actions, profile, context, cohortBoosts).map((r) => r.action);
}

/**
 * ROI for a single action: riskReductionPct ÷ estimated_hours.
 * Higher is better — a 15% risk reduction that takes 8h beats a 10% reduction
 * that takes 40h. Uses the w8 track as the canonical effort estimate (median
 * weekly commitment); w8 × 8 gives total hours.
 */
export function computeActionROI(action: Partial<ActionPlanItem>): number {
  const impact = action.riskReductionPct ?? 0;
  const effort = effortHours(action);
  return impact > 0 && effort > 0 ? impact / effort : 0;
}

/**
 * Sort actions by ROI within each dependency phase, tagging the top-ROI action
 * in each phase with `_topRoiInPhase = true`.
 *
 * Phase assignment is injected via `phaseAssigner` so this service does not
 * import from component files (ActionDependencyGraph.tsx → assignPhase).
 *
 * Output order:
 *   Phase 1 items (sorted by ROI desc), Phase 2 items (ROI desc), Phase 3 items (ROI desc)
 *   — completed items are handled by the caller (they stay pinned to the bottom).
 *
 * Why per-phase rather than global?
 *   A Phase 3 "nice to have" action with very high ROI should not jump ahead
 *   of Phase 1 "must do first" actions that have unlocked prerequisites.
 *   ROI only drives ordering WITHIN the phase the action belongs to.
 */
export function sortByROIWithinPhases(
  pending: ActionPlanItem[],
  phaseAssigner: (item: ActionPlanItem) => 0 | 1 | 2 | 3,
): Array<ActionPlanItem & { _topRoiInPhase?: boolean }> {
  const byPhase = new Map<0 | 1 | 2 | 3, ActionPlanItem[]>([
    [0, []], [1, []], [2, []], [3, []],
  ]);

  for (const item of pending) {
    byPhase.get(phaseAssigner(item))!.push(item);
  }

  const result: Array<ActionPlanItem & { _topRoiInPhase?: boolean }> = [];

  // Phase 0 items come first and are never reordered by ROI (typically one item).
  for (const phase of [0, 1, 2, 3] as const) {
    const items = byPhase.get(phase)!;
    if (items.length === 0) continue;

    const ranked = items
      .map(item => ({ item, roi: computeActionROI(item) }))
      .sort((a, b) => b.roi - a.roi);

    ranked.forEach(({ item, roi }, idx) => {
      result.push({
        ...item,
        // Only badge when there are ≥2 actions in the phase and the top item
        // has meaningful ROI (> 0). A single-item phase gets no badge —
        // "highest of one" is not a useful signal.
        _topRoiInPhase: idx === 0 && roi > 0 && ranked.length >= 2,
      });
    });
  }

  return result;
}

// ── Phase 3 / P5: Behavioral re-ranking ───────────────────────────────────────
// Applied as a second pass AFTER the main rankActions() call, once
// behavioralPersonalization is available (layer 60 in the pipeline).
// Takes the already-ranked action items (with rankScore stamped on them) and
// adjusts the scores by trajectory/compensation/risk-tolerance multipliers,
// then re-sorts. Pure function, no I/O.

export interface BehavioralRankProfile {
  trajectory: 'ascending' | 'plateauing' | 'declining' | 'resetting' | 'early';
  compensationPosition: 'significantly_under' | 'under_market' | 'at_market' | 'above_market' | 'significantly_above' | 'unknown';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  suppressedActionIds?: string[];
}

const TRAJECTORY_MULT: Record<string, Partial<Record<ActionCategory, number>>> = {
  declining:  { skills: 1.30, network: 1.30, resume: 1.20, negotiate: 0.90 },
  plateauing: { skills: 1.10, network: 1.10 },
  ascending:  { negotiate: 1.15, network: 1.10 },
};

const COMP_MULT: Record<string, Partial<Record<ActionCategory, number>>> = {
  significantly_under: { negotiate: 1.25 },
  under_market:        { negotiate: 1.10 },
};

const RISK_MULT: Record<string, Partial<Record<ActionCategory, number>>> = {
  aggressive:   { resume: 0.80, skills: 1.15, network: 1.20 },
  conservative: { resume: 1.15, skills: 1.05 },
};

function behavioralCategoryMult(category: ActionCategory, bp: BehavioralRankProfile): number {
  const t = TRAJECTORY_MULT[bp.trajectory]?.[category] ?? 1.0;
  const c = COMP_MULT[bp.compensationPosition]?.[category] ?? 1.0;
  const r = RISK_MULT[bp.riskTolerance]?.[category] ?? 1.0;
  return t * c * r;
}

export function applyBehavioralRerank<T extends { rankScore?: number; id?: string; title?: string } & Record<string, unknown>>(
  items: T[],
  bp: BehavioralRankProfile,
): T[] {
  const suppressed = new Set(bp.suppressedActionIds ?? []);
  return items
    .map(item => {
      // Suppress actions completed/suppressed by twin influence
      if (item.id && suppressed.has(item.id as string)) {
        return { ...item, rankScore: 0 };
      }
      const category = classifyActionCategory(item as Partial<ActionPlanItem>);
      const mult = behavioralCategoryMult(category, bp);
      return { ...item, rankScore: ((item.rankScore as number) ?? 1) * mult };
    })
    .sort((a, b) => ((b.rankScore as number) ?? 0) - ((a.rankScore as number) ?? 0));
}

/** GAP F: convert raw effort-hours estimate to a human-readable badge */
export function formatEffortBadge(hours: number): string {
  if (hours <= 0.5) return '15 min';
  if (hours <= 1) return '30 min';
  if (hours <= 2) return '1–2h';
  if (hours <= 8) return `${Math.round(hours)}h`;
  if (hours <= 40) return `${Math.round(hours / 8)}d`;
  const weeks = Math.round(hours / 40);
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
}

/** GAP F: compute effort badge from an ActionPlanItem's learningWeeks field */
export function computeActionEffortBadge(action: Partial<ActionPlanItem>): string {
  return formatEffortBadge(effortHours(action));
}
