// summaryReveal.ts — orchestrator-gated progressive disclosure for the Summary tab
//
// PROBLEM
// SummaryTab renders ~20 top-level blocks at roughly equal weight. The
// orchestrator (signalOrchestrator) already ranks signals into a capped
// `primary` set and picks a single move, but almost nothing on the Summary
// consumes that ranking — every panel renders whenever its data merely exists.
// A first-time user with 3–5 minutes faces a newsroom, not an editor.
//
// SOLUTION
// A PURE, deterministic classifier that buckets each *evidence* block (the
// supporting cards below the lead surface) into one of three states:
//
//   • evidenceInline — the block's signal is in the orchestrator's primary set
//     (cap 3) OR it crossed a materiality threshold → render it inline, open.
//   • deep           — material enough to keep reachable, but not now → folded
//     into the single "Full breakdown" disclosure at the bottom.
//   • hidden         — suppressed entirely for this mode (e.g. upside framing in
//     an emergency) or its base guard is unmet.
//
// "Lead" blocks (spine, score hero, confidence, the one move, momentum close) are
// NOT classified here — they always render. This module only decides the fate of
// the supporting evidence.
//
// No I/O, no Date.now, no random — fully reproducible and unit-testable.

import type { OrchestratedFeed } from '../../../services/orchestration/signalOrchestrator';
import type { DashboardMode } from '../../../hooks/useDashboardAdaptation';

/** The evidence blocks whose disclosure is orchestrator-gated. */
export type SummaryBlockKey =
  | 'companyPulse'
  | 'opportunity'
  | 'personalRisk'
  | 'timeToSafety'
  | 'inactionCost'
  | 'missingData';

/** Signal grouping emitted by signalCompressionService (CompressedSignal.group). */
export type SignalGroup = 'company' | 'career' | 'market' | 'meta';

/**
 * Already-computed facts the caller reads off the result. Kept as a flat,
 * primitive struct (not the raw HybridResult) so the classifier stays pure and
 * trivially testable.
 */
export interface SummaryRevealFacts {
  mode: DashboardMode;
  score: number;
  /** A confirmed WARN Act filing — forces the company verdict open. */
  hasActiveWARN: boolean;
  /** personalRiskModifier.rawModifier != null (panel's base guard). */
  personalModifierPresent: boolean;
  /** |personalRiskModifier.rawModifier| >= 0.5 — a material score adjustment. */
  personalModifierMaterial: boolean;
  /** sixMonthInactionConsequence present (card's base guard). */
  hasInactionConsequence: boolean;
  /** scoreSufficient && score > 35 && scoreSensitivity present (strip's base guard). */
  timeToSafetyEligible: boolean;
}

export interface SummaryRevealResult {
  /** Render inline, open — the signal is material right now. */
  evidenceInline: Set<SummaryBlockKey>;
  /** Folded into the single "Full breakdown" disclosure. */
  deep: Set<SummaryBlockKey>;
  /** Suppressed entirely (mode-hidden or base guard unmet). */
  hidden: Set<SummaryBlockKey>;
}

/** The set of signal groups the orchestrator ranked into the primary surface. */
export function derivePrimaryGroups(feed: OrchestratedFeed | undefined): Set<SignalGroup> {
  const groups = new Set<SignalGroup>();
  if (!feed || !Array.isArray(feed.primary)) return groups;
  for (const ranked of feed.primary) {
    const g = ranked?.signal?.group;
    if (g) groups.add(g as SignalGroup);
  }
  return groups;
}

/**
 * Classify the Summary's evidence blocks. The rule everywhere is the union of
 * the orchestrator's ranking (group ∈ primary) AND the block's existing
 * materiality threshold — so nothing that today's guards treat as significant
 * is ever silently folded.
 */
export function classifySummaryReveal(
  feed: OrchestratedFeed | undefined,
  facts: SummaryRevealFacts,
): SummaryRevealResult {
  const groups = derivePrimaryGroups(feed);
  const evidenceInline = new Set<SummaryBlockKey>();
  const deep = new Set<SummaryBlockKey>();
  const hidden = new Set<SummaryBlockKey>();

  const { mode } = facts;
  // Crisis modes are the ones where time-pressure framing (window, cost of
  // waiting) is signal rather than noise.
  const isCrisis = mode === 'emergency' || mode === 'elevated';

  // ── Company pulse (workforce + financial, group 'company') ─────────────────
  // Always has content. Inline when the company is a ranked primary signal, a
  // legal WARN filing is active, or we're in emergency mode. Otherwise folded.
  if (groups.has('company') || facts.hasActiveWARN || mode === 'emergency') {
    evidenceInline.add('companyPulse');
  } else {
    deep.add('companyPulse');
  }

  // ── Opportunity intelligence (group 'market') ──────────────────────────────
  // Base guard: score < 75. Hidden in emergency — no upside framing while the
  // building is on fire. Inline when the market is a ranked primary signal.
  if (facts.score >= 75 || mode === 'emergency') {
    hidden.add('opportunity');
  } else if (groups.has('market')) {
    evidenceInline.add('opportunity');
  } else {
    deep.add('opportunity');
  }

  // ── Personal risk modifier (group 'career') ────────────────────────────────
  // Base guard: modifier present. Inline when the adjustment is material OR the
  // career signal is ranked primary. Sub-threshold, non-primary → folded.
  if (!facts.personalModifierPresent) {
    hidden.add('personalRisk');
  } else if (facts.personalModifierMaterial || groups.has('career')) {
    evidenceInline.add('personalRisk');
  } else {
    deep.add('personalRisk');
  }

  // ── Time-to-safety strip ───────────────────────────────────────────────────
  // Base guard handled by caller (timeToSafetyEligible). The week-by-week
  // projection matters when the clock is ticking → inline only in crisis modes.
  if (!facts.timeToSafetyEligible) {
    hidden.add('timeToSafety');
  } else if (isCrisis) {
    evidenceInline.add('timeToSafety');
  } else {
    deep.add('timeToSafety');
  }

  // ── Cost-of-waiting (loss aversion) ────────────────────────────────────────
  // Base guard: consequence present. Inline only in crisis modes; for a
  // low-risk user the loss-aversion framing is noise → folded.
  if (!facts.hasInactionConsequence) {
    hidden.add('inactionCost');
  } else if (isCrisis) {
    evidenceInline.add('inactionCost');
  } else {
    deep.add('inactionCost');
  }

  // ── Missing data ───────────────────────────────────────────────────────────
  // Always folded into the single disclosure (the card self-gates to nothing
  // when < 2 meaningful gaps exist).
  deep.add('missingData');

  return { evidenceInline, deep, hidden };
}
