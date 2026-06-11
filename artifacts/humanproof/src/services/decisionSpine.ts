// decisionSpine.ts — Phase 1 (Rules conformance): the Decision Spine.
//
// Rules 1/4/5/13: every screen must answer "what is the highest-impact action
// right now?" in the 4-question frame (what happened / why it matters / do this /
// what happens if I don't). This service selects THE one next-best action for
// each tool surface from that tool's own engines, ranked by impact × urgency ÷
// effort — so users are guided, never dumped a report.
//
// Pure derivations over the existing HybridResult + already-built engines.
// Every frame carries provenance (Rule 17). Adapters return null when no audit
// or no engine data exists — surfaces simply hide the bar (no fake confidence).

import type { HybridResult, ActionPlanItem } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';
import { extractEvidence } from './evidenceTokens';
import { rankActions, effortHours, formatEffortBadge } from './actionRankingService';
import { injectActionConsequences } from './actionConsequenceEngine';
import { computeCareerMoats } from './careerMoatEngine';
import { computeSurvivalStrategy } from './survivalStrategyEngine';
import { computeHirability } from './hirabilityEngine';
import {
  computeResumeIntelligence,
  computeLinkedInIntelligence,
  computeInterviewReadiness,
  computePortfolioStrength,
  computeNetworkActivation,
} from './readinessDiagnostics';

export type ConfidenceKind = 'measured' | 'modeled' | 'estimated';

export interface DecisionFrame {
  /** Q1 — What happened? One sentence of situation, with the user's numbers. */
  whatHappened: string;
  /** Q2 — Why does it matter? */
  whyItMatters: string;
  /** Q3 — What should I do? The single action. */
  doThis: { label: string; detail: string; actionId: string };
  /** Q4 — What happens if I don't? */
  ifYouSkip: string;
  impactLabel?: string;
  effortLabel?: string;
  timelineLabel?: string;
  confidence: number;            // 0–100
  confidenceKind: ConfidenceKind;
  /** Which engine selected this action (transparency). */
  source: string;
  /** Rule 12 honesty gate: 'generic' when the audit carried no user-specific evidence. */
  personalizationLevel: 'personalized' | 'generic';
}

export type SpineTool = 'layoff-defense' | 'ai-defense' | 'readiness' | 'strategy' | 'action-plan';

const confidenceFor = (kind: ConfidenceKind): number =>
  kind === 'measured' ? 80 : kind === 'modeled' ? 70 : 58;

// ── Generic: frame from any ActionPlanItem ─────────────────────────────────────

function frameFromAction(action: ActionPlanItem, hr: HybridResult, source: string): DecisionFrame {
  const score = Math.round(hr.total ?? 0);
  const [withConsequence] = injectActionConsequences([action], hr);
  const kind: ConfidenceKind =
    withConsequence.impactConfidenceSource === 'MEASURED' ? 'measured'
    : withConsequence.impactConfidenceSource === 'MODELED' ? 'modeled' : 'estimated';
  return {
    whatHappened: `Your risk score is ${score}/100 (${hr.tier?.label ?? 'assessed'}) — this is the highest-leverage move it surfaced.`,
    whyItMatters: withConsequence.whyItMatters ?? action.description ?? '',
    doThis: {
      label: action.title,
      detail: action.description ?? '',
      actionId: action.id ?? action.title,
    },
    ifYouSkip: withConsequence.consequence
      ?? `This risk factor compounds unaddressed — expect the score to drift upward from ${score}.`,
    impactLabel: action.riskReductionPct ? `−${action.riskReductionPct}% risk` : undefined,
    effortLabel: action.effortBadge ?? formatEffortBadge(effortHours(action)),
    timelineLabel: action.deadline,
    confidence: confidenceFor(kind),
    confidenceKind: kind,
    source,
    personalizationLevel: 'personalized', // overwritten centrally by nextBestActionFor
  };
}

// Rank the audit's own action list for THIS user and frame the winner.
function topRankedActionFrame(hr: HybridResult, profile: UserProfile | null, source: string): DecisionFrame | null {
  const actions = (hr.actionItems ?? hr.recommendations ?? []) as ActionPlanItem[];
  if (!actions.length) return null;
  const ranked = rankActions(actions, profile, null, null);
  const top = ranked[0]?.action as ActionPlanItem | undefined;
  return top ? frameFromAction(top, hr, source) : null;
}

// ── Per-tool adapters ──────────────────────────────────────────────────────────

export function layoffDefenseNextAction(hr: HybridResult, profile: UserProfile | null): DecisionFrame | null {
  // Defense = the audit's own ranked priority actions; strategy risk as the skip cost.
  const frame = topRankedActionFrame(hr, profile, 'Defense Priority Ranking');
  if (!frame) return null;
  const synth = (hr as any).strategySynthesis;
  if (synth?.singleBiggestRisk) frame.ifYouSkip = synth.singleBiggestRisk;
  return frame;
}

export function strategyNextAction(hr: HybridResult, _profile: UserProfile | null): DecisionFrame | null {
  const synth = (hr as any).strategySynthesis;
  const top = synth?.topPriorityAction;
  if (!top) return null;
  return {
    whatHappened: `Strategy verdict: ${String(synth.overallStrategy ?? '').replace(/_/g, ' ').toLowerCase()} — safety window ~${synth.estimatedSafetyWindowDays ?? 90} days.`,
    whyItMatters: top.rationale,
    doThis: { label: top.title, detail: top.description, actionId: top.id ?? top.title },
    ifYouSkip: synth.singleBiggestRisk ?? 'The window narrows — acting later costs leverage.',
    impactLabel: `ROI ${top.roiScore}/100`,
    effortLabel: top.isUrgent ? 'Urgent' : undefined,
    timelineLabel: top.timeHorizon,
    confidence: 70,
    confidenceKind: 'modeled',
    source: 'Strategy Synthesis',
    personalizationLevel: 'personalized',
  };
}

export function aiDefenseNextAction(hr: HybridResult, profile: UserProfile | null): DecisionFrame | null {
  if (hr.total == null) return null;
  const moat = computeCareerMoats(hr, profile);

  // High overall risk → the survival ladder's active plan leads; otherwise the
  // highest-ROI moat is the best durable defense investment.
  if ((hr.total ?? 0) >= 70) {
    const survival = computeSurvivalStrategy(hr, profile, moat);
    const active = survival.plans.find(p => p.tier === survival.activeTier) ?? survival.plans[0];
    if (active) {
      return {
        whatHappened: active.command.threat,
        whyItMatters: active.command.impact,
        doThis: { label: `Plan ${active.tier}: ${active.steps[0]}`, detail: active.thesis, actionId: `survival_${active.tier}` },
        ifYouSkip: `You face the next escalation without Plan ${active.tier} in motion — ${active.command.outcome.toLowerCase()}`,
        impactLabel: `${active.successProbability}% success`,
        timelineLabel: active.timelineLabel,
        confidence: active.command.confidence,
        confidenceKind: active.confidenceKind,
        source: `Survival Strategy · Plan ${active.tier}`,
        personalizationLevel: 'personalized',
      };
    }
  }

  const roi = moat.highestRoiMoat;
  return {
    whatHappened: `Your ${roi.label.toLowerCase()} is your weakest high-leverage flank (${roi.score}/100) — overall moat strength ${moat.overallMoatStrength}/100 (${moat.strengthLabel}).`,
    whyItMatters: roi.protects,
    doThis: { label: `Build your ${roi.label.toLowerCase()}`, detail: roi.howToBuild, actionId: `moat_${roi.key}` },
    ifYouSkip: `This stays your most exploitable gap as AI pressure compounds — the rest of your defenses are capped by it.`,
    impactLabel: `ROI ${roi.roiScore}`,
    timelineLabel: roi.buildSpeed === 'fast' ? 'Weeks' : roi.buildSpeed === 'medium' ? '1–3 months' : '3–6 months',
    confidence: confidenceFor(roi.confidenceKind),
    confidenceKind: roi.confidenceKind,
    source: 'Career Moat Intelligence',
    personalizationLevel: 'personalized',
  };
}

export function readinessNextAction(hr: HybridResult, profile: UserProfile | null): DecisionFrame | null {
  if (hr.total == null) return null;
  const report = computeHirability(hr, profile);
  const bottleneck = report.bottlenecks[0];
  if (!bottleneck) return null;

  // When the bottleneck maps to a diagnostic tab, use that tab's top improvement
  // (it carries impact/effort/rationale); otherwise the component's own move.
  const diag =
    bottleneck.key === 'resume' ? computeResumeIntelligence(hr, profile)
    : bottleneck.key === 'linkedin' ? computeLinkedInIntelligence(hr, profile)
    : bottleneck.key === 'interview' ? computeInterviewReadiness(hr, profile)
    : bottleneck.key === 'portfolio' || bottleneck.key === 'market_fit' ? computePortfolioStrength(hr, profile)
    : bottleneck.key === 'network' ? computeNetworkActivation(hr, profile)
    : null;
  const top = diag?.improvements?.[0];

  return {
    whatHappened: `Hirability ${report.hirabilityScore}/100 (${report.verdict}) — ${bottleneck.label.toLowerCase()} is your biggest bottleneck at ${bottleneck.score}/100.`,
    whyItMatters: top?.rationale
      ?? `Your weakest component caps every other gain — interview probability holds near ${report.interviewProbability}% until it moves.`,
    doThis: {
      label: top?.action ?? bottleneck.improvement,
      detail: diag?.headline ?? bottleneck.improvement,
      actionId: `readiness_${bottleneck.key}`,
    },
    ifYouSkip: top?.ifYouSkip
      ?? `Interview probability stays ~${report.interviewProbability}% and offer probability ~${report.offerProbability}% — the bottleneck doesn't fix itself.`,
    impactLabel: top ? `+${top.impactPct} pts` : undefined,
    effortLabel: top?.effort ? `${top.effort} effort` : undefined,
    confidence: confidenceFor(bottleneck.confidenceKind),
    confidenceKind: bottleneck.confidenceKind,
    source: 'Hirability Engine',
    personalizationLevel: 'personalized',
  };
}

export function actionPlanNextAction(hr: HybridResult, profile: UserProfile | null): DecisionFrame | null {
  return topRankedActionFrame(hr, profile, 'Personalized Action Ranking');
}

// ── Dispatch ───────────────────────────────────────────────────────────────────

export function nextBestActionFor(tool: SpineTool, hr: HybridResult | null, profile: UserProfile | null): DecisionFrame | null {
  if (!hr || hr.total == null) return null;
  let frame: DecisionFrame | null = null;
  try {
    switch (tool) {
      case 'layoff-defense': frame = layoffDefenseNextAction(hr, profile); break;
      case 'ai-defense':     frame = aiDefenseNextAction(hr, profile); break;
      case 'readiness':      frame = readinessNextAction(hr, profile); break;
      case 'strategy':       frame = strategyNextAction(hr, profile) ?? topRankedActionFrame(hr, profile, 'Strategy Synthesis'); break;
      case 'action-plan':    frame = actionPlanNextAction(hr, profile); break;
    }
  } catch {
    return null; // an engine threw on partial data — hide the bar rather than crash the tool
  }
  if (frame) {
    // Rule 12 honesty gate: if the audit produced no user-specific evidence, the
    // advice can only be generic — say so rather than implying it's tailored.
    frame.personalizationLevel = extractEvidence(hr, profile).hasAny ? 'personalized' : 'generic';
  }
  return frame;
}
