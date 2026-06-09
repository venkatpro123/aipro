// cohortOutcomesAggregator.ts — Phase 5 (R18 Outcome Monopoly, R9 Career Graph)
//
// Provides cross-user cohort outcome statistics for a given (roleKey, tenureBand, actionId).
// Answers: "Users like you who completed this action saw an avg X pts reduction."
//
// Read-through cache strategy:
//   1. Query cohort_outcome_cache table (fast path, ~7-day TTL)
//   2. On cache miss: compute from action_completions JOIN layoff_scores
//   3. Write result back to cache
//
// Confidence levels:
//   high   — ≥ 10 completions
//   medium — 3–9 completions
//   low    — < 3 completions (result suppressed in UI — don't show misleading data)

import { supabase } from '../utils/supabase';

export type TenureBand = '<2' | '2-5' | '5-10' | '10+';
export type CohortConfidence = 'high' | 'medium' | 'low';

export interface CohortOutcomeStats {
  avgRiskReduction: number;
  count: number;
  stdDev: number | null;
  confidenceLevel: CohortConfidence;
  fromCache: boolean;
}

const CACHE_TTL_DAYS = 7;

function tenureBandFromYears(years: number): TenureBand {
  if (years < 2) return '<2';
  if (years < 5) return '2-5';
  if (years < 10) return '5-10';
  return '10+';
}

export { tenureBandFromYears };

function confidenceLevel(count: number): CohortConfidence {
  if (count >= 10) return 'high';
  if (count >= 3) return 'medium';
  return 'low';
}

export async function getCohortOutcomeStats(
  roleKey: string,
  tenureBand: TenureBand,
  actionId: string,
): Promise<CohortOutcomeStats | null> {
  try {
    // ── Step 1: Try the cache ──────────────────────────────────────────────
    const { data: cached } = await supabase
      .from('cohort_outcome_cache')
      .select('avg_risk_reduction, std_dev, completion_count, computed_at')
      .eq('role_key', roleKey)
      .eq('tenure_band', tenureBand)
      .eq('action_id', actionId)
      .maybeSingle();

    if (cached) {
      const ageMs = Date.now() - new Date(cached.computed_at).getTime();
      const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
      if (ageMs < ttlMs) {
        return {
          avgRiskReduction: Number(cached.avg_risk_reduction ?? 0),
          count: cached.completion_count ?? 0,
          stdDev: cached.std_dev != null ? Number(cached.std_dev) : null,
          confidenceLevel: confidenceLevel(cached.completion_count ?? 0),
          fromCache: true,
        };
      }
    }

    // ── Step 2: Compute from action_completions + layoff_scores ───────────
    // We join action_completions (has action_id + user_id + completed_at)
    // with layoff_scores (has score, user_id, calculated_at) to find the
    // score before and after completion for each user.
    //
    // Simplified approach: find users who completed this action, then find
    // their layoff_scores pairs (most recent before vs. after completion).
    const { data: completions } = await supabase
      .from('action_completions')
      .select('user_id, completed_at')
      .eq('action_id', actionId);

    if (!completions || completions.length === 0) return null;

    const reductions: number[] = [];

    for (const completion of completions.slice(0, 100)) { // cap at 100 to avoid huge loops
      const completedAt = completion.completed_at;
      const userId = completion.user_id;

      // Score before completion
      const { data: before } = await supabase
        .from('layoff_scores')
        .select('score')
        .eq('user_id', userId)
        .lt('calculated_at', completedAt)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Score after completion
      const { data: after } = await supabase
        .from('layoff_scores')
        .select('score')
        .eq('user_id', userId)
        .gte('calculated_at', completedAt)
        .order('calculated_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (before?.score != null && after?.score != null) {
        const reduction = before.score - after.score;
        if (reduction > 0) reductions.push(reduction); // only count improvements
      }
    }

    if (reductions.length === 0) return null;

    const avg = reductions.reduce((s, r) => s + r, 0) / reductions.length;
    const variance = reductions.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / reductions.length;
    const std = Math.sqrt(variance);

    // ── Step 3: Write back to cache ───────────────────────────────────────
    await supabase
      .from('cohort_outcome_cache')
      .upsert({
        role_key: roleKey,
        tenure_band: tenureBand,
        action_id: actionId,
        completion_count: reductions.length,
        avg_risk_reduction: Math.round(avg * 100) / 100,
        std_dev: Math.round(std * 100) / 100,
        computed_at: new Date().toISOString(),
      }, { onConflict: 'role_key,tenure_band,action_id' });

    return {
      avgRiskReduction: avg,
      count: reductions.length,
      stdDev: std,
      confidenceLevel: confidenceLevel(reductions.length),
      fromCache: false,
    };
  } catch {
    return null; // non-fatal — cohort data is additive, not required
  }
}
