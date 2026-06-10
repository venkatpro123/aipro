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

/**
 * Phase 3 stub: returns calibrated simulation multipliers once ≥ 50 outcomes
 * exist. Until then returns null and the simulator keeps its hardcoded defaults.
 */
export async function getCohortSimulationFactors(): Promise<Record<string, Record<string, number>> | null> {
  const { count } = await supabase
    .from('action_completions')
    .select('id', { count: 'exact', head: true })
    .not('thumbs_up', 'is', null);
  if ((count ?? 0) < 50) return null;
  return null; // Phase 3: full calibration deferred
}
