// scoreChangeDetectionService.ts — Phase 4 (Career OS)
//
// Detects a meaningful change in the risk score between the current audit and
// the previous one, and attributes the change to the breakdown dimension that
// moved the most. This is the causal layer behind the alert center: it answers
// not just "your score changed" but "your score changed BECAUSE of X."
//
// Previous score is read from career_twin_state.audit_score_history (written by
// careerTwinService on every audit). Breakdown-level attribution requires the
// previous HybridResult, which the caller supplies when available (the history
// row only stores the composite score).

import { supabase } from '../utils/supabase';
import type { HybridResult } from '../types/hybridResult';

export interface ScoreChangeEvent {
  delta: number;                 // current.total - previous.total (signed)
  direction: 'up' | 'down';      // up = risk increased (worse)
  primaryCause: string;          // "AI role displacement risk increased"
  causalDimension: string;       // "L3"
  causalEvidence: string;        // plain-English supporting detail
  changeType: 'significant' | 'minor'; // significant = |delta| > 5
  prevScore: number;
  currentScore: number;
}

const DIM_LABELS: Record<string, string> = {
  L1: 'Company financial vulnerability',
  L2: 'Layoff & instability history',
  L3: 'AI role displacement risk',
  L4: 'Industry headwinds',
  L5: 'Regional market conditions',
};

type HistEntry = { date: string; score: number; company?: string; role?: string };

/**
 * Read the most recent PRIOR score from the twin's audit history.
 * Returns null when there is no prior audit (first run) or no session.
 */
export async function getPreviousAuditScore(): Promise<{ score: number; date: string } | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data } = await supabase
      .from('career_twin_state')
      .select('audit_score_history')
      .eq('user_id', session.user.id)
      .maybeSingle();
    const history = ((data as Record<string, unknown>)?.audit_score_history as HistEntry[]) ?? [];
    if (history.length < 2) return null;
    // Last entry is the current audit; second-to-last is the previous one.
    const prev = history[history.length - 2];
    return { score: prev.score, date: prev.date };
  } catch {
    return null;
  }
}

/**
 * Pure attribution: given current and previous breakdowns, find the dimension
 * that moved most in the same direction as the overall score change.
 */
function attributeChange(
  current: HybridResult,
  previous: HybridResult | null,
  scoreDelta: number,
): { dimension: string; label: string; evidence: string } {
  const fallback = {
    dimension: 'overall',
    label: 'Overall risk profile',
    evidence: 'Multiple factors shifted together since your last audit.',
  };
  if (!previous) return fallback;

  const cur = current.breakdown;
  const prv = previous.breakdown;
  if (!cur || !prv) return fallback;

  const keys: Array<keyof typeof cur> = ['L1', 'L2', 'L3', 'L4', 'L5'];
  let bestKey: string | null = null;
  let bestMove = 0;
  for (const k of keys) {
    const move = (cur[k] ?? 0) - (prv[k] ?? 0); // signed, 0–1 scale
    // The dimension that moved most in the SAME direction as the score is the driver.
    if (Math.sign(move) === Math.sign(scoreDelta) && Math.abs(move) > Math.abs(bestMove)) {
      bestMove = move;
      bestKey = k;
    }
  }
  if (!bestKey) return fallback;

  const label = DIM_LABELS[bestKey] ?? bestKey;
  const movePts = Math.round(Math.abs(bestMove) * 100);
  const verb = scoreDelta > 0 ? 'increased' : 'eased';
  return {
    dimension: bestKey,
    label,
    evidence: `${label} ${verb} by ${movePts} points — the largest single driver of this change.`,
  };
}

/**
 * Compare the current audit against the previous one and produce a causal
 * change event, or null when there is no prior score to compare against.
 *
 * `previousResult` is optional: pass the prior HybridResult for breakdown-level
 * attribution; without it, attribution falls back to "overall risk profile."
 */
export function detectScoreChange(
  current: HybridResult,
  previousScore: number | null,
  previousResult?: HybridResult | null,
): ScoreChangeEvent | null {
  if (previousScore == null) return null;
  const currentScore = current.total ?? 0;
  const delta = currentScore - previousScore;
  if (delta === 0) return null;

  const attribution = attributeChange(current, previousResult ?? null, delta);
  const direction: 'up' | 'down' = delta > 0 ? 'up' : 'down';
  const verb = direction === 'up' ? 'increased' : 'decreased';

  return {
    delta,
    direction,
    primaryCause: attribution.dimension === 'overall'
      ? `Your risk score ${verb} ${Math.abs(Math.round(delta))} points`
      : `${attribution.label} ${direction === 'up' ? 'increased' : 'eased'}`,
    causalDimension: attribution.dimension,
    causalEvidence: attribution.evidence,
    changeType: Math.abs(delta) > 5 ? 'significant' : 'minor',
    prevScore: previousScore,
    currentScore,
  };
}
