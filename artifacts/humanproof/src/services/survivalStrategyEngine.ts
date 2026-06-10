// survivalStrategyEngine.ts — AI Career Defense: Survival Strategy (Rule #5)
//
// "If my role declines, what do I do?" Every user gets Plan A/B/C/D — a defense
// ladder with explicit activation triggers, so they know not just what to do but
// WHEN. Pure derivation composing engine results already on the HybridResult
// (strategySynthesis, roleAdjacency, escapePaths, emergencyResponse,
// careerContingencyPlan) + the moat report. Falls back gracefully when a given
// engine result is absent.

import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';
import type { CareerMoatReport } from './careerMoatEngine';

export type ConfidenceKind = 'measured' | 'modeled' | 'estimated';

/** Structurally identical to DefenseCommandChain's CommandChain — passed straight through. */
export interface DefenseCommand {
  threat: string;
  impact: string;
  probability?: string;
  timeline: string;
  defense: string;
  outcome: string;
  confidence: number;
  confidenceKind: ConfidenceKind;
}

export interface SurvivalPlan {
  tier: 'A' | 'B' | 'C' | 'D';
  name: string;
  /** When this plan activates. */
  trigger: string;
  /** One-sentence thesis. */
  thesis: string;
  steps: string[];
  timelineLabel: string;
  successProbability: number;     // 0–100
  confidenceKind: ConfidenceKind;
  command: DefenseCommand;
}

export interface SurvivalStrategy {
  plans: SurvivalPlan[];
  /** Which plan the user's current situation calls for right now. */
  activeTier: 'A' | 'B' | 'C' | 'D';
  /** Plain-English escalation ladder. */
  escalationNarrative: string;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));

export function computeSurvivalStrategy(
  hr: HybridResult,
  profile: UserProfile | null,
  moat: CareerMoatReport,
): SurvivalStrategy {
  const anyHr = hr as any;
  const risk = hr.total ?? 50;
  const runway = profile?.savingsMonthsRunway ?? anyHr.userFinancialRunway?.runwayMonths ?? hr.financialRunwayMonths ?? null;
  const roiMoat = moat.highestRoiMoat;
  const financialMoat = moat.moats.find(m => m.key === 'financial')?.score ?? 40;

  const strategy = anyHr.strategySynthesis;
  const adjacency = anyHr.roleAdjacency;
  const escape = anyHr.escapePaths;
  const peerWave = anyHr.peerContagion?.waveIntensity;

  // ── Plan A — Primary Defense (stay & strengthen) ─────────────────────────────
  const topAction = strategy?.topPriorityAction?.title ?? 'Strengthen your highest-leverage internal signal';
  const planASuccess = clamp(86 - risk * 0.45);
  const planA: SurvivalPlan = {
    tier: 'A', name: 'Primary Defense — Stay & Fortify',
    trigger: 'Active now. Your default while employed and risk is below critical.',
    thesis: 'Compound your moats in place — the lowest-disruption way to lower risk.',
    steps: [
      topAction,
      `Build your ${roiMoat.label.replace(' Moat', '').toLowerCase()} moat: ${roiMoat.howToBuild}`,
      'Adopt one AI workflow in your real work and document the measured time saved.',
    ],
    timelineLabel: '0–3 months',
    successProbability: planASuccess,
    confidenceKind: strategy ? 'modeled' : 'estimated',
    command: {
      threat: 'Gradual erosion — AI commoditises routine tasks faster than roles disappear outright.',
      impact: `Current risk ${risk}/100; doing nothing lets exposure drift upward.`,
      probability: `${planASuccess}% of similar profiles reduce risk by staying and strengthening when company health is adequate.`,
      timeline: '0–3 months to first measurable drop',
      defense: `${topAction}; build your ${roiMoat.label.replace(' Moat', '').toLowerCase()} moat.`,
      outcome: 'Lower risk without the disruption of a move — buys time and optionality.',
      confidence: clamp(planASuccess), confidenceKind: strategy ? 'modeled' : 'estimated',
    },
  };

  // ── Plan B — Adjacent Pivot ──────────────────────────────────────────────────
  const adj = adjacency?.adjacentRoles?.[0];
  const adjStrength: string = adj?.adjacencyStrength ?? 'moderate';
  const planBSuccess = clamp((adjStrength === 'strong' ? 72 : adjStrength === 'moderate' ? 58 : 44) + ((adj?.marketDemandScore ?? 50) - 50) * 0.2);
  const targetLabel = adj?.targetRoleLabel ?? 'an adjacent, lower-exposure role';
  const planB: SurvivalPlan = {
    tier: 'B', name: 'Adjacent Pivot — Shift, Don’t Restart',
    trigger: `Activate if your role's AI exposure or risk keeps rising for 2+ months, or a Plan A plateau sets in.`,
    thesis: `Move to ${targetLabel} — keeps most of your value while cutting exposure.`,
    steps: [
      adj?.skillBridgeRequired?.length ? `Add bridge skills: ${adj.skillBridgeRequired.slice(0, 3).join(', ')}.` : 'Identify the 2–3 bridge skills the target role requires.',
      `Build one portfolio artifact aimed at ${targetLabel}.`,
      'Run 3 informational interviews in the target role to validate fit and warm referrals.',
    ],
    timelineLabel: adj?.timeToQualifiedWeeks ? `~${adj.timeToQualifiedWeeks} weeks to job-ready` : '2–4 months',
    successProbability: planBSuccess,
    confidenceKind: adjacency ? 'modeled' : 'estimated',
    command: {
      threat: 'Your specific role faces sustained, rising AI/market pressure.',
      impact: adj?.scoreReduction ? `Pivoting to ${targetLabel} cuts risk ~${Math.round(adj.scoreReduction)} pts.` : `${targetLabel} carries materially lower exposure than your current role.`,
      probability: `${planBSuccess}% — adjacency strength: ${adjStrength}.`,
      timeline: adj?.timeToQualifiedWeeks ? `~${adj.timeToQualifiedWeeks} weeks to qualified` : '2–4 months',
      defense: `Bridge into ${targetLabel} with targeted skills + one portfolio artifact.`,
      outcome: 'Most of your experience transfers; you reset exposure without restarting your career.',
      confidence: planBSuccess, confidenceKind: adjacency ? 'modeled' : 'estimated',
    },
  };

  // ── Plan C — Escape / Reinvention ────────────────────────────────────────────
  const move = escape?.biggestLeverageMove ?? escape?.paths?.[0];
  const escConf: string = move?.confidenceInEstimate ?? 'Medium';
  const planCSuccess = clamp(escConf === 'High' ? 70 : escConf === 'Low' ? 46 : 58);
  const planC: SurvivalPlan = {
    tier: 'C', name: 'Escape / Reinvention — Change the Board',
    trigger: 'Activate if company risk spikes, a sector layoff wave hits, or Plan B is blocked.',
    thesis: move?.headline ?? 'Make the single biggest structural move available to reset your risk profile.',
    steps: (move?.steps?.slice(0, 3).map((s: any) => `${s.action} (${s.timeframe})`)) ?? [
      'Identify 5 target companies with strong fundamentals and low layoff history.',
      'Apply through warm referrals where possible; customise the first two lines per role.',
      'Negotiate from employed status to maximise leverage.',
    ],
    timelineLabel: move?.timeToImpact ?? '3–6 months',
    successProbability: planCSuccess,
    confidenceKind: escape ? 'modeled' : 'estimated',
    command: {
      threat: peerWave && peerWave !== 'NONE' ? `Active sector wave (${peerWave}) could force a reactive search.` : 'Company-specific or sector risk has become structural, not cyclical.',
      impact: move?.estimatedScoreDrop ? `This move drops risk ~${Math.round(move.estimatedScoreDrop)} pts — the largest single lever available.` : 'The largest structural risk reduction available to you.',
      probability: `${planCSuccess}% — estimate confidence: ${escConf}.`,
      timeline: move?.timeToImpact ?? '3–6 months',
      defense: move?.headline ?? 'Move to a materially safer employer/role profile.',
      outcome: move?.targetProfile ?? 'A fundamentally lower-risk position and a reset exposure profile.',
      confidence: planCSuccess, confidenceKind: escape ? 'modeled' : 'estimated',
    },
  };

  // ── Plan D — Emergency ───────────────────────────────────────────────────────
  const planDSuccess = clamp(40 + financialMoat * 0.45);
  const planD: SurvivalPlan = {
    tier: 'D', name: 'Emergency — Survive the Hit',
    trigger: 'Activate on a layoff announcement, sudden role elimination, or a manager signalling exit.',
    thesis: 'Protect income and dignity in the first 72 hours; convert shock into a controlled search.',
    steps: [
      'Do NOT sign severance on day one — request 48 hours and consult an employment attorney.',
      runway != null && runway < 4 ? `Trigger your runway plan immediately — ${Number(runway).toFixed(0)} months is thin; cut burn 15–20% this week.` : 'Activate your emergency budget; map fixed vs. discretionary spend.',
      'Notify your 5 strongest contacts within 72 hours; ask for intros, not sympathy.',
    ],
    timelineLabel: 'First 72 hours, then weekly',
    successProbability: planDSuccess,
    confidenceKind: 'modeled',
    command: {
      threat: 'Abrupt job loss — the highest-stress, lowest-leverage moment in a career.',
      impact: runway != null ? `~${Number(runway).toFixed(0)} months of runway sets your decision window.` : 'Runway unknown — establish it before you need it.',
      probability: `${planDSuccess}% controlled-landing odds, driven mostly by your financial buffer.`,
      timeline: 'First 72 hours decide the next 6 months',
      defense: 'Delay severance, protect runway, activate network — in that order.',
      outcome: 'A negotiated exit and a controlled search instead of a panic scramble.',
      confidence: planDSuccess, confidenceKind: 'modeled',
    },
  };

  // ── Active tier + escalation narrative ────────────────────────────────────────
  const overall: string | undefined = strategy?.overallStrategy;
  const activeTier: SurvivalStrategy['activeTier'] =
    risk >= 80 || overall === 'EMERGENCY_EXIT' ? 'C' :
    risk >= 65 || overall === 'ACCELERATE_EXIT' ? 'B' :
    'A';

  const escalationNarrative =
    `You are operating on Plan ${activeTier} today. ` +
    `Hold Plan A while employed and risk stays manageable; escalate to Plan B if pressure on your role persists for two months; ` +
    `move to Plan C if company or sector risk turns structural; and keep Plan D ready so a sudden hit never catches you flat-footed.`;

  return { plans: [planA, planB, planC, planD], activeTier, escalationNarrative };
}
