// userOutcomeLearningService.ts — Phase 2 (Career OS)
// Reads per-user action outcome data from action_completions and derives:
//   1. getDimensionSuccessMap() — per-dimension success rates for ranking
//   2. getCohortSimulationFactors() — calibrated simulation multipliers (Phase 3 stub)
//
// Dimension key extraction: action_id may be 'D1' or 'D1_linkedin_ai_project'.
// The first segment (split on '_') is the canonical dimension key.

import { supabase } from '../utils/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DimensionSuccessStats {
  dim: string;
  successRate: number;   // 0–1
  totalOutcomes: number;
  positiveOutcomes: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractDim(actionId: string): string {
  return actionId.split('_')[0];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns per-dimension success rates for the authenticated user.
 * Rate = positiveOutcomes / totalOutcomes per dimension key (D1, L1, etc.).
 * Returns empty object if fewer than 3 total outcomes (insufficient data).
 *
 * Multiplier range when fed into rankActions:
 *   rate=0.00 → 0.70× (user never saw results in this dim)
 *   rate=0.50 → 1.00× (neutral, matches default)
 *   rate=1.00 → 1.30× (user consistently sees results in this dim)
 */
export async function getDimensionSuccessMap(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('action_completions')
    .select('action_id, thumbs_up')
    .eq('user_id', userId)
    .not('thumbs_up', 'is', null);

  if (error || !data || data.length < 3) return {};

  const byDim: Record<string, { pos: number; total: number }> = {};
  for (const row of data as { action_id: string; thumbs_up: boolean }[]) {
    const dim = extractDim(row.action_id);
    if (!byDim[dim]) byDim[dim] = { pos: 0, total: 0 };
    byDim[dim].total++;
    if (row.thumbs_up) byDim[dim].pos++;
  }

  const result: Record<string, number> = {};
  for (const [dim, stats] of Object.entries(byDim)) {
    if (stats.total >= 1) {
      result[dim] = Math.round((stats.pos / stats.total) * 100) / 100;
    }
  }
  return result;
}

/**
 * Returns per-dimension success stats (richer than the rate map).
 * Used by the ActionOutcomeTracker insights panel.
 */
export async function getDimensionSuccessStats(userId: string): Promise<DimensionSuccessStats[]> {
  const rates = await getDimensionSuccessMap(userId);
  const { data } = await supabase
    .from('action_completions')
    .select('action_id, thumbs_up')
    .eq('user_id', userId)
    .not('thumbs_up', 'is', null);

  const byDim: Record<string, { pos: number; total: number }> = {};
  for (const row of (data ?? []) as { action_id: string; thumbs_up: boolean }[]) {
    const dim = extractDim(row.action_id);
    if (!byDim[dim]) byDim[dim] = { pos: 0, total: 0 };
    byDim[dim].total++;
    if (row.thumbs_up) byDim[dim].pos++;
  }

  return Object.entries(rates).map(([dim, rate]) => ({
    dim,
    successRate: rate,
    totalOutcomes: byDim[dim]?.total ?? 0,
    positiveOutcomes: byDim[dim]?.pos ?? 0,
  })).sort((a, b) => b.successRate - a.successRate);
}

// Which recorded outcome types count as a "success" for each simulator decision.
const DECISION_OUTCOME_MAP: Record<string, string[]> = {
  switch:     ['job_change', 'offer_received'],
  relocate:   ['job_change'],
  consulting: ['job_change', 'offer_received'],
  manager:    ['promotion'],
  'ai-role':  ['skill_certified', 'job_change'],
  upskill:    ['skill_certified'],
  stay:       ['layoff_avoided', 'negotiation_win', 'salary_increase'],
};

/**
 * Phase 4 (Rule 18): calibrated per-decision simulation factors from REAL recorded
 * outcomes. Returns null until ≥ 50 outcome events exist (so the simulator stays
 * honestly ESTIMATED on thin data); once gated, returns a factor per decision that
 * has ≥ 3 supporting outcomes — careerSimulationEngine treats presence as MODELED.
 * Community-level when the data is shared; falls back to the user's own otherwise.
 */
export async function getCohortSimulationFactors(): Promise<Record<string, Record<string, number>> | null> {
  try {
    const { data, count } = await supabase
      .from('career_outcome_events')
      .select('event_type', { count: 'exact' })
      .limit(2000);
    if ((count ?? 0) < 50) return null;

    const byType: Record<string, number> = {};
    for (const r of (data ?? []) as { event_type: string }[]) {
      byType[r.event_type] = (byType[r.event_type] ?? 0) + 1;
    }

    const total = count ?? 0;
    const factors: Record<string, Record<string, number>> = {};
    for (const [decision, types] of Object.entries(DECISION_OUTCOME_MAP)) {
      const supporting = types.reduce((s, t) => s + (byType[t] ?? 0), 0);
      if (supporting >= 3) {
        factors[decision] = { supportingOutcomes: supporting, successRate: Math.round((supporting / total) * 100) / 100 };
      }
    }
    return Object.keys(factors).length > 0 ? factors : null;
  } catch {
    return null;
  }
}
