// signalOrchestrator.ts — P0 of the platform transformation ("the editorial layer")
//
// PURPOSE
// HumanProof produces ~140 engine outputs and ~120 HybridResult fields. The UI
// renders ~50 panels of roughly equal visual weight — a newsroom where the user
// needs an editor. signalCompressionService already deduplicates raw engine
// outputs into 4 grouped verdicts (workforce / financial / market / career) plus
// a tier-sorted `ordered` array. What it does NOT do — and what this module adds —
// is the *editorial* layer that sits one level above:
//
//   1. Profile-relevance RE-RANKING   — a visa clock makes career-readiness the
//      binding constraint; short runway elevates company distress + market demand.
//   2. Global CAP                      — surface the top-N, demote the rest.
//   3. PRIMARY MOVE extraction         — collapse recommendations[] into ONE next
//      action, feasibility-gated by the user's situation.
//   4. NARRATIVE                       — a one-line spine + a structured, fully
//      deterministic ReasoningTrace (LLM phrasing is a later phase; the structure
//      is built here so the spine reads like "one continuously thinking AI").
//
// This module is PURE (no I/O, no Date.now, no random) so the feed is fully
// reproducible for the same inputs. It treats CompressedIntel / CompressedSignal
// as read-only and never sorts them in place.
//
// Non-breaking: it does not modify compressAllSignals or its output. It is wired
// into useDashboardAdaptation as an OPTIONAL `feed` field (see that hook).

import type { HybridResult, ActionPlanItem } from '../../types/hybridResult';
import type { CompanyData } from '../../data/companyDatabase';
import { compressAllSignals } from '../signalCompressionService';
import type { CompressedSignal, CompressedIntel } from '../signalCompressionService';
import { classifyActionCategory, effortHours } from '../actionRankingService';
import { deriveProfileSignals } from '../actionPersonalizationEngine';
import { actionHeadline } from './actionHeadline';
import type { ProfileSignalSummary, UserProfileLike } from '../actionPersonalizationEngine';

// ── Public types ────────────────────────────────────────────────────────────

export interface RankedSignal {
  signal: CompressedSignal;
  /** 0–100 ordering key for the primary surface. */
  relevanceScore: number;
  /** Signed points contributed by profile relevance (already folded into score). */
  profileAdjustment: number;
  /** Human-readable reasons for the adjustment, e.g. "visa-critical → career +18". */
  adjustmentReasons: string[];
}

export interface ReasoningTrace {
  /** What the AI sees (top signal). */
  observation: string;
  /** What it implies. */
  inference: string;
  /** Why it matters to THIS user (profile-aware). */
  relevance: string;
  /** The one-clause posture. */
  conclusion: string;
  /** The single next action. */
  move: string;
  /** Plain-language confidence statement. */
  confidence: string;
}

export interface PrimaryMove {
  action: ActionPlanItem;
  rationale: string;
  /** False when the move is the best available but blocked by the user's situation. */
  feasibleForProfile: boolean;
  /** Verb-first action headline (derived from the action's description), so the
   *  "one move" reads as something to DO, not a diagnosis title. */
  moveLabel: string;
  // ── Rule 1: 4-question card pattern ─────────────────────────────────────────
  /** What signal triggered this recommendation (from top ranked signal headline). */
  whatHappened?: string;
  /** Why the user should act — audience-aware (from actionConsequenceEngine). */
  whyItMatters?: string;
  /** Consequence of inaction (from actionConsequenceEngine). */
  ifYouSkip?: string;
}

export interface OrchestratedFeed {
  /** Top-N ranked signals, relevanceScore DESC. */
  primary: RankedSignal[];
  /** Remaining informative signals, same sort. */
  overflow: RankedSignal[];
  /** The single most important next action, or null when none exist. */
  primaryMove: PrimaryMove | null;
  /** One-line editorial summary — the "narrative spine". */
  spine: string;
  /** Structured reasoning trace for the "thinking AI" surface. */
  trace: ReasoningTrace;
  /** Pass-through of the underlying compressed intel (reuse downstream). */
  intel: CompressedIntel;
  /** Profile signals used for ranking + feasibility (neutral defaults if no profile). */
  profileSignals: ProfileSignalSummary;
  meta: {
    cap: number;
    signalCount: number;
    usedProfile: boolean;
  };
}

export interface OrchestrateConfig {
  /** Number of signals on the primary surface. Default 3. */
  cap?: number;
  /**
   * Optional twin influence from careerTwinService.getTwinInfluence().
   * When present: boosts signals matching prioritySignalGroups by +5 relevance,
   * applies careerGroupBoost to career-group signals, and suppresses
   * suppressedActionIds from primaryMove selection.
   * Fully backwards-compatible — existing call sites pass no twinInfluence.
   */
  twinInfluence?: {
    prioritySignalGroups: Array<'workforce' | 'financial' | 'market' | 'career'>;
    suppressedActionIds: string[];
    careerGroupBoost: number;
  };
  /** Feedback boost map from getActionFeedbackBoosts(). 0=suppress, 1.3=elevate. */
  feedbackBoosts?: Map<string, number>;
  /** Phase 1 (Career OS): pattern boosts from career memory (repeated_inaction / plateau). */
  patternBoosts?: { hasInaction?: boolean; hasPlateauPattern?: boolean } | null;
}

const DEFAULT_CAP = 3;

// ── Numeric helpers ───────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Result-level confidence as a 0–100 percent. Prefers the numeric
 * `confidencePercent`; falls back to the categorical `confidence` enum.
 * There is no per-signal confidence, so all signals share this factor.
 */
function resolveConfidencePercent(result: HybridResult): number {
  const pct = (result as { confidencePercent?: unknown }).confidencePercent;
  if (typeof pct === 'number' && Number.isFinite(pct)) return clamp(pct, 0, 100);
  const cat = (result as { confidence?: unknown }).confidence;
  if (cat === 'High') return 85;
  if (cat === 'Medium') return 60;
  if (cat === 'Low') return 40;
  if (typeof cat === 'number' && Number.isFinite(cat)) {
    // Some pipeline paths store confidence as a 0–1 float.
    return cat <= 1 ? clamp(cat * 100, 0, 100) : clamp(cat, 0, 100);
  }
  return 55; // neutral default
}

// ── Relevance scoring ───────────────────────────────────────────────────────

const SOURCE_MULT: Record<CompressedSignal['sourceKind'], number> = {
  live: 1.0,
  db: 0.95,
  heuristic: 0.88,
};

interface ProfileBoost {
  when: (p: ProfileSignalSummary) => boolean;
  group: CompressedSignal['group'] | 'any';
  delta: number;
  label: string;
}

// Boosts are additive within a signal's group, then clamped to ±25. Because a
// Tier-1 signal already carries base ≥ 50, the clamp guarantees a Tier-1 critical
// can never be demoted off the primary surface by profile re-ranking.
const PROFILE_BOOSTS: ProfileBoost[] = [
  { when: p => p.visaUrgency === 'critical', group: 'career',  delta: +18, label: 'visa-critical → career' },
  { when: p => p.visaUrgency === 'elevated', group: 'career',  delta: +10, label: 'visa-elevated → career' },
  { when: p => p.runwayTier === 'critical',  group: 'company', delta: +12, label: 'runway-critical → company' },
  { when: p => p.runwayTier === 'critical',  group: 'market',  delta: +8,  label: 'runway-critical → market' },
  { when: p => p.runwayTier === 'comfortable', group: 'company', delta: -6, label: 'runway-comfortable → company' },
  { when: p => p.familyAnchor,               group: 'company', delta: +6,  label: 'family-anchor → company' },
  { when: p => p.dualIncomeCushion,          group: 'any',     delta: -5,  label: 'dual-income cushion → all' },
  { when: p => p.resilientRepeat,            group: 'career',  delta: -5,  label: 'resilient-repeat → career' },
  { when: p => p.seniorMobilityConstraint,   group: 'market',  delta: +6,  label: 'senior-mobility → market' },
  { when: p => p.equityVestImminent,         group: 'company', delta: +5,  label: 'equity-vest → company' },
];

function computeProfileAdjustment(
  signal: CompressedSignal,
  profile: ProfileSignalSummary,
): { adjustment: number; reasons: string[] } {
  let sum = 0;
  const reasons: string[] = [];
  for (const boost of PROFILE_BOOSTS) {
    if (!boost.when(profile)) continue;
    if (boost.group !== 'any' && boost.group !== signal.group) continue;
    sum += boost.delta;
    reasons.push(`${boost.label} ${boost.delta >= 0 ? '+' : ''}${boost.delta}`);
  }
  return { adjustment: clamp(sum, -25, 25), reasons };
}

function scoreSignal(
  signal: CompressedSignal,
  profile: ProfileSignalSummary,
  confFactor: number,
): RankedSignal {
  // A signal with no attempt + no severity carries no information — force to 0
  // so it lands in overflow regardless of profile.
  const informative = !(signal.verdict === 'unknown' && signal.severity === 0);

  const tierBase = (6 - signal.tier) * 10;            // tier1=50 … tier5=10
  const sevComp = clamp(signal.severity, 0, 100) * 0.5; // 0..50
  const base = tierBase + sevComp;                     // 0..100
  const sourceMult = SOURCE_MULT[signal.sourceKind] ?? 0.88;
  const confAdj = base * sourceMult * confFactor;

  const { adjustment, reasons } = computeProfileAdjustment(signal, profile);
  const raw = informative ? confAdj + adjustment : 0;

  return {
    signal,
    relevanceScore: clamp(Math.round(raw), 0, 100),
    profileAdjustment: informative ? adjustment : 0,
    adjustmentReasons: informative ? reasons : [],
  };
}

function compareRanked(a: RankedSignal, b: RankedSignal): number {
  if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
  // Tie-break: lower tier first, then higher severity.
  if (a.signal.tier !== b.signal.tier) return a.signal.tier - b.signal.tier;
  return b.signal.severity - a.signal.severity;
}

function rankSignals(
  intel: CompressedIntel,
  profile: ProfileSignalSummary,
  confFactor: number,
): RankedSignal[] {
  // Copy before sorting — never mutate the shared intel.ordered array.
  const ranked = intel.ordered.map(s => scoreSignal(s, profile, confFactor));
  return ranked.sort(compareRanked);
}

function isAlwaysVisibleTier1(rs: RankedSignal): boolean {
  // Tier 1 is mission-critical and "always visible" per the CompressionTier
  // contract — but only when it carries actual information (a 0-score unknown
  // signal should never be force-surfaced).
  return rs.signal.tier === 1 && rs.relevanceScore > 0;
}

/**
 * Split the ranked list into the capped primary surface + overflow, guaranteeing
 * that informative Tier-1 signals stay on the primary surface — UP TO `cap`. (When
 * the number of informative Tier-1 signals exceeds `cap`, only `cap` of them fit;
 * the rest necessarily remain in overflow. This is unavoidable and correct.)
 *
 * Profile re-ranking can legitimately push a Tier-1 below several severity-heavy
 * lower-tier signals (severity dominates the score, by design). The cap cut must
 * not then drop a mission-critical signal off-screen, so any Tier-1 that lands in
 * overflow is promoted by bumping the lowest-scored NON-Tier-1 signal out of
 * primary. Primary is then re-sorted so ordering stays relevance-driven.
 *
 * Invariant: `primary ∪ overflow` is always an exact permutation of the input
 * (no signal is lost or duplicated), and `primary.length === min(cap, input.length)`.
 */
function splitPrimaryOverflow(
  ranked: RankedSignal[],
  cap: number,
): { primary: RankedSignal[]; overflow: RankedSignal[] } {
  const primary = ranked.slice(0, cap);
  const overflow = ranked.slice(cap);

  for (let i = 0; i < overflow.length; i++) {
    if (!isAlwaysVisibleTier1(overflow[i])) continue;
    // Find the lowest-scored non-Tier-1 in primary to bump (primary is score-sorted
    // DESC, so scan from the tail).
    let bumpIdx = -1;
    for (let j = primary.length - 1; j >= 0; j--) {
      if (primary[j].signal.tier !== 1) { bumpIdx = j; break; }
    }
    if (bumpIdx === -1) break; // primary is already all Tier-1 — nothing to bump
    const bumped = primary[bumpIdx];
    primary[bumpIdx] = overflow[i];
    overflow[i] = bumped;
  }

  primary.sort(compareRanked);
  overflow.sort(compareRanked);
  return { primary, overflow };
}

// ── Primary-move extraction ───────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<ActionPlanItem['priority'], number> = {
  Critical: 300,
  High: 200,
  Medium: 100,
  Low: 0,
};

const VISA_RE = /sponsor|visa|h-?1b|opt|green ?card|permanent residen/i;
// Word-boundaried where ambiguous: bare "course" previously matched innocuous
// phrases like "crash course correction", wrongly deferring a fast move for
// runway-critical users. Require an explicit learning context instead.
const LONG_BET_RE = /reskill|upskill|certification|certificate|\bdegree\b|bootcamp|master'?s|coursework|online course|night school/i;

function isLongBet(rec: ActionPlanItem): boolean {
  if (typeof rec.learningWeeks?.w8 === 'number' && rec.learningWeeks.w8 > 8) return true;
  if (rec.sequencePhase === 'quarter1') return true;
  const text = `${rec.title ?? ''} ${rec.description ?? ''}`;
  return LONG_BET_RE.test(text);
}

function moveScore(rec: ActionPlanItem, profile: ProfileSignalSummary): number {
  let s = (PRIORITY_WEIGHT[rec.priority] ?? 0) + (rec.riskReductionPct ?? 0);
  if (profile.visaUrgency !== 'none') {
    const text = `${rec.title ?? ''} ${rec.description ?? ''}`;
    if (VISA_RE.test(text)) s += 50;
  }
  return s;
}

// Some recommendations are SYSTEM/META transparency notices (e.g. an API-injected
// "System Override Applied · The engine detected exceptional patterns: Signal
// conflict…"). They carry priority 'Critical' but are NOT user actions — they
// belong in the Transparency tab. They must never become the "one move" or an
// action card, so we filter them out everywhere actions are derived.
const META_REC_RE = /system override|override applied|engine detected|signal conflict|exceptional pattern|discrepanc|kill[- ]?switch/i;
export function isActionableRecommendation(r: ActionPlanItem | null | undefined): boolean {
  if (!r || typeof r.title !== 'string') return false;
  const id = String((r as any).id ?? '').toLowerCase();
  if (id.startsWith('system') || id.includes('override') || id.includes('notice') || id.includes('meta')) return false;
  if (META_REC_RE.test(`${r.title} ${r.description ?? ''}`)) return false;
  return true;
}

export function pickPrimaryMove(
  recommendations: ActionPlanItem[] | undefined,
  profile: ProfileSignalSummary,
  feedbackBoosts?: Map<string, number>,
  patternBoosts?: { hasInaction?: boolean; hasPlateauPattern?: boolean } | null,
): PrimaryMove | null {
  let recs = (recommendations ?? []).filter(isActionableRecommendation);

  // Apply feedback suppression: drop actions with boost = 0 (2+ thumbs-down)
  if (feedbackBoosts?.size) {
    recs = recs.filter(r => {
      const boost = feedbackBoosts.get(r.id ?? r.title ?? '');
      return boost === undefined || boost > 0;
    });
  }

  if (recs.length === 0) return null;

  const runwayCritical = profile.runwayTier === 'critical';

  // Phase 1 (Career OS): career-memory pattern multiplier — mirrors the logic in
  // rankActions(). Repeated inaction → elevate quick wins the user can actually
  // finish; score plateau → elevate skills/network moves that break stagnation.
  const patternMult = (r: ActionPlanItem): number => {
    if (patternBoosts?.hasInaction && effortHours(r) <= 16) return 1.15;
    if (patternBoosts?.hasPlateauPattern) {
      const cat = classifyActionCategory(r);
      if (cat === 'skills' || cat === 'network') return 1.10;
    }
    return 1.0;
  };

  // Rank by score DESC, multiplied by feedback + pattern boosts where applicable.
  const scoreWithBoost = (r: ActionPlanItem) => {
    const base = moveScore(r, profile);
    const boost = feedbackBoosts?.get(r.id ?? r.title ?? '') ?? 1.0;
    return base * boost * patternMult(r);
  };
  const ranked = [...recs].sort((a, b) => scoreWithBoost(b) - scoreWithBoost(a));

  if (runwayCritical) {
    // Feasibility gate: with critical runway, the user can't afford a long bet.
    // Prefer the highest-scoring NON-long-bet move.
    const fast = ranked.find(r => !isLongBet(r));
    if (fast) {
      return {
        action: fast,
        rationale: 'Prioritised a fast-payoff move — your runway is critical, so slow reskilling bets are deferred.',
        feasibleForProfile: true,
        moveLabel: actionHeadline(fast),
      };
    }
    // Everything is a long bet — keep the top one but flag infeasibility honestly.
    return {
      action: ranked[0],
      rationale: 'No fast-payoff action available — every recommended move needs runway you may not have. Treat this as the direction, not this week’s task.',
      feasibleForProfile: false,
      moveLabel: actionHeadline(ranked[0]),
    };
  }

  const top = ranked[0];
  const visaTilt = profile.visaUrgency !== 'none' && VISA_RE.test(`${top.title} ${top.description ?? ''}`);
  return {
    action: top,
    rationale: visaTilt
      ? 'Highest-impact move, prioritised because your work authorisation adds a timing clock on any job change.'
      : 'Highest-impact move by risk reduction and urgency.',
    feasibleForProfile: true,
    moveLabel: actionHeadline(top),
  };
}

// ── Narrative (deterministic) ─────────────────────────────────────────────────

const VERDICT_INFERENCE: Record<CompressedSignal['verdict'], string> = {
  critical:           'signals point to near-term cuts',
  distressed:         'company stability is clearly softening',
  softening:          'early-warning indicators are turning',
  stable:             'conditions look steady for now',
  healthy:            'fundamentals look strong',
  'stable-confirmed': 'we checked the distress signals and none fired',
  'data-unavailable': 'we could not confirm live data this run',
  unknown:            'we have no signal on this yet',
};

function dominantRelevance(profile: ProfileSignalSummary): string {
  if (profile.visaUrgency === 'critical') return 'Your work authorisation puts a hard clock on any move — timing is the binding constraint.';
  if (profile.runwayTier === 'critical')  return 'With limited runway you can’t wait out a downturn — speed matters more than optionality.';
  if (profile.familyAnchor)               return 'As the household anchor, stability of income is weighted heavily here.';
  if (profile.visaUrgency === 'elevated') return 'Your visa status adds a timing consideration to any transition.';
  return 'This reflects your general market posture.';
}

function buildTrace(
  topSignal: CompressedSignal | undefined,
  primaryMove: PrimaryMove | null,
  confPct: number,
  intel: CompressedIntel,
  profile: ProfileSignalSummary,
): ReasoningTrace {
  const VERDICT_LABEL: Record<string, string> = {
    critical: 'critical', distressed: 'distressed', softening: 'weakening',
    stable: 'stable', healthy: 'healthy', 'stable-confirmed': 'confirmed stable',
    'data-unavailable': 'data unavailable', unknown: 'unknown',
  };
  const leadChip = topSignal?.chips?.[0];
  const chipNote = leadChip
    ? ` (${leadChip.label}: ${leadChip.value}${leadChip.label === 'Ready' || leadChip.label === 'Confident' || leadChip.label === 'Resilient' ? '/100' : ''})`
    : '';
  const observation = topSignal
    ? `${topSignal.headline} — ${VERDICT_LABEL[topSignal.verdict] ?? topSignal.verdict}${chipNote}`
    : 'No distress signals surfaced.';

  const inference = topSignal
    ? VERDICT_INFERENCE[topSignal.verdict] ?? 'the picture is mixed'
    : 'nothing urgent is showing in the data';

  const relevance = dominantRelevance(profile);

  const topSeverity = topSignal?.severity ?? 0;
  const conclusion = intel.hasTier1Critical
    ? 'Act now.'
    : topSeverity >= 35
      ? 'Prepare actively.'
      : 'Monitor calmly.';

  const move = primaryMove?.moveLabel ?? 'Keep your materials current and your network warm.';

  const sourceKind = intel.ordered[0]?.sourceKind ?? 'heuristic';
  const confidence = `Confidence: ${Math.round(confPct)}% (${sourceKind})`;

  return { observation, inference, relevance, conclusion, move, confidence };
}

function renderSpine(trace: ReasoningTrace): string {
  return `${trace.observation} — ${trace.inference}. ${trace.conclusion} Next: ${trace.move}`;
}

// ── Public entry points ───────────────────────────────────────────────────────

/**
 * Build an OrchestratedFeed from an already-compressed intel object. Use this
 * from React hooks that already called compressAllSignals, to avoid a second
 * compression pass over the same inputs.
 */
export function orchestrateFromIntel(
  result: HybridResult,
  intel: CompressedIntel,
  profileSignals: ProfileSignalSummary,
  config?: OrchestrateConfig,
): OrchestratedFeed {
  const cap = Math.max(1, config?.cap ?? DEFAULT_CAP);
  const confPct = resolveConfidencePercent(result);
  const confFactor = clamp(confPct / 100, 0.4, 1);
  const twin = config?.twinInfluence;

  let ranked = rankSignals(intel, profileSignals, confFactor);

  // Apply twin influence: boost priority groups + careerGroupBoost
  if (twin && (twin.prioritySignalGroups.length > 0 || twin.careerGroupBoost !== 1.0)) {
    ranked = ranked.map(rs => {
      let delta = 0;
      const group = rs.signal.group as string;
      if (twin.prioritySignalGroups.includes(group as 'workforce' | 'financial' | 'market' | 'career')) {
        delta += 5;
      }
      if (group === 'career' && twin.careerGroupBoost !== 1.0) {
        delta += Math.round((twin.careerGroupBoost - 1.0) * rs.relevanceScore);
      }
      if (delta === 0) return rs;
      return {
        ...rs,
        relevanceScore: clamp(rs.relevanceScore + delta, 0, 100),
        adjustmentReasons: [...rs.adjustmentReasons, `twin: +${delta} (goal alignment)`],
      };
    });
    // Re-sort after twin adjustments
    ranked = [...ranked].sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  const { primary, overflow } = splitPrimaryOverflow(ranked, cap);

  // Filter suppressed action IDs from recommendation pool before picking primaryMove
  const filteredRecommendations = twin?.suppressedActionIds.length
    ? (result.recommendations ?? []).filter(r => !twin!.suppressedActionIds.includes(r.id ?? ''))
    : result.recommendations;

  const primaryMove = pickPrimaryMove(filteredRecommendations, profileSignals, config?.feedbackBoosts, config?.patternBoosts);
  const trace = buildTrace(primary[0]?.signal, primaryMove, confPct, intel, profileSignals);
  const spine = renderSpine(trace);

  // Enrich primaryMove with 4-question card data (Rule 1)
  const enrichedMove: PrimaryMove | null = primaryMove ? {
    ...primaryMove,
    whatHappened: primary[0]?.signal.headline ?? trace.observation,
    whyItMatters: primaryMove.action.whyItMatters ?? primaryMove.rationale,
    ifYouSkip: primaryMove.action.consequence ?? `Inaction allows this risk factor to compound — ${primaryMove.action.deadline ? `act by ${primaryMove.action.deadline}` : 'act this week'}.`,
  } : null;

  return {
    primary,
    overflow,
    primaryMove: enrichedMove,
    spine,
    trace,
    intel,
    profileSignals,
    meta: {
      cap,
      signalCount: ranked.length,
      usedProfile: profileSignals.flags.length > 0,
    },
  };
}

/**
 * Full orchestration entry point. Compresses signals, derives profile signals,
 * and produces the editorial feed. Pure over (result, companyData, profile).
 */
export function orchestrate(
  result: HybridResult,
  companyData?: CompanyData,
  profile?: UserProfileLike | null,
  config?: OrchestrateConfig,
): OrchestratedFeed {
  const intel = compressAllSignals(result, companyData);
  const profileSignals = deriveProfileSignals(profile, result.total);
  const feed = orchestrateFromIntel(result, intel, profileSignals, config);
  const finalFeed = { ...feed, meta: { ...feed.meta, usedProfile: profile != null } };
  _notifyListeners(finalFeed);
  return finalFeed;
}

// ── OrchestratorBus — pub/sub for reactive signal → recommendation updates ──
// Phase 2 (R11, R13): Components subscribe here to update their state when a
// new signal fires without requiring a full page refresh or re-audit.
//
// Module-level singleton — zero React state. Components subscribe in useEffect
// and return the unsubscribe function for cleanup.

type OrchestratorListener = (feed: OrchestratedFeed) => void;
const _listeners = new Set<OrchestratorListener>();

function _notifyListeners(feed: OrchestratedFeed): void {
  _listeners.forEach(fn => {
    try { fn(feed); } catch { /* never let a subscriber crash orchestration */ }
  });
}

/**
 * Subscribe to orchestrated feed updates.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * @example
 * useEffect(() => subscribeToOrchestrator(feed => setFeed(feed)), []);
 */
export function subscribeToOrchestrator(fn: OrchestratorListener): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}
