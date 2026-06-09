// useAuditPersistence.ts
//
// Restores the most recent audit result from Supabase whenever the
// authenticated user has no result loaded in LayoffContext.
//
// Restore priority (fastest → most durable):
//   1. sessionStorage hp_last_score_session — covers same-tab / same-session refresh.
//   2. layoff_scores.full_result (JSONB) — full HybridResult for all new audits.
//   3. Reconstructed minimal result from score+breakdown+tier — covers pre-migration
//      rows where full_result is NULL. Gives users their score back without re-auditing.
//
// Rule: NEVER trigger a re-audit. Read-only beyond dispatching to LayoffContext.

import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useLayoff } from '../context/LayoffContext';
import type { HybridResult } from '../types/hybridResult';

const SESSION_KEY = 'hp_last_score_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RestoredSession {
  result: Record<string, unknown>;
  companyName: string | null;
  roleTitle: string | null;
  dataQuality?: string;
  ts: number;
}

function readSession(): RestoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: RestoredSession = JSON.parse(raw);
    if (!parsed?.result || !parsed?.ts) return null;
    if (Date.now() - parsed.ts > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(data: RestoredSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch { /* storage unavailable */ }
}

// Map a confidence string to a numeric percentage for display.
function confidenceToPercent(confidence: string | null): number {
  const c = (confidence ?? '').toLowerCase();
  if (c === 'high')   return 82;
  if (c === 'medium') return 64;
  if (c === 'low')    return 42;
  return 60; // unknown → neutral
}

// Reconstruct a minimal HybridResult from the columns that have always existed
// in layoff_scores (pre full_result migration). Enough for CareerOSHome to
// render the health score, 4-dim bars, and tier badge. Intelligence panels
// (scoreSensitivity, escapePaths, etc.) will show their graceful-empty states.
function reconstructMinimalResult(row: {
  score: number;
  tier: string;
  tier_color: string;
  confidence: string | null;
  breakdown: Record<string, number> | null;
  calculated_at: string;
}): HybridResult {
  const breakdown = row.breakdown ?? { L1: 0.5, L2: 0.5, L3: 0.5, L4: 0.5, L5: 0.5 };
  const confidencePct = confidenceToPercent(row.confidence);
  return {
    total: row.score,
    tier: {
      label: row.tier ?? 'Unknown',
      color: row.tier_color ?? 'neutral',
      advice: 'Run a new audit to get full personalized intelligence.',
    },
    breakdown: breakdown as any,
    confidence: (row.confidence ?? 'Medium') as any,
    confidencePercent: confidencePct,
    confidenceInterval: {
      low: Math.max(0, row.score - 10),
      high: Math.min(100, row.score + 10),
      range: 20,
      isEstimate: true,
    },
    calculatedAt: row.calculated_at,
    signalQuality: { liveSignals: 0, heuristicSignals: 0, dbSignals: 1 },
    // Intelligence panels handle undefined gracefully — they show empty/fallback states.
    scoreSensitivity: undefined,
    scenarioPlan: undefined,
    escapePaths: undefined,
    scoreDelta: null,
    // Mark as partial restore so components can optionally surface "re-audit for full intel"
    _isPartialRestore: true,
  } as unknown as HybridResult;
}

export function useAuditPersistence(userId: string | null | undefined): void {
  const { state, dispatch } = useLayoff();
  const didRestore = useRef(false);

  useEffect(() => {
    // Run once per authenticated session; skip if a result is already loaded.
    if (didRestore.current) return;
    if (!userId) return;
    if (state.hasCompletedAssessment || state.scoreResult !== null) return;

    didRestore.current = true;

    (async () => {
      // ── Step 1: sessionStorage (zero network cost, covers tab refresh) ──────
      const session = readSession();
      if (session?.result) {
        dispatch({ type: 'SET_SCORE_RESULT', payload: session.result as any });
        dispatch({
          type: 'SET_INPUTS',
          payload: {
            companyName: session.companyName ?? null,
            roleTitle: session.roleTitle ?? null,
          },
        });
        return;
      }

      // ── Step 2: Supabase DB — fetch most recent row regardless of full_result ─
      // We no longer filter WHERE full_result IS NOT NULL. This ensures we can
      // restore pre-migration rows via the reconstruction fallback (Step 2b).
      try {
        const { data, error } = await supabase
          .from('layoff_scores')
          .select('full_result, company_name, role_title, department, calculated_at, score, tier, tier_color, confidence, breakdown')
          .eq('user_id', userId)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('[useAuditPersistence] DB fetch failed:', error.message);
          return;
        }

        if (!data) return; // no prior audits for this user

        // ── Step 2a: Full restore from full_result JSONB ──────────────────────
        if (data.full_result) {
          const fr = data.full_result as Record<string, unknown>;
          const score = (fr as any)?.total ?? (fr as any)?.score;
          if (typeof score !== 'number' || !isFinite(score)) {
            console.warn('[useAuditPersistence] full_result has invalid score, skipping');
            return;
          }

          dispatch({ type: 'SET_SCORE_RESULT', payload: fr as any });
          dispatch({
            type: 'SET_INPUTS',
            payload: {
              companyName: data.company_name ?? null,
              roleTitle: data.role_title ?? null,
              department: data.department ?? null,
            },
          });

          writeSession({
            result: fr,
            companyName: data.company_name ?? null,
            roleTitle: data.role_title ?? null,
            ts: Date.now(),
          });
          try { localStorage.setItem('hp_has_prior_audit', '1'); } catch { /* ignore */ }
          return;
        }

        // ── Step 2b: Partial restore from legacy row (full_result = NULL) ─────
        // Reconstruct a minimal HybridResult from the columns that exist on all
        // rows. The user gets their score back on the Career OS without re-auditing.
        // Components that need full intelligence (scoreSensitivity, escapePaths)
        // will show their graceful fallback states and prompt for a re-audit.
        if (typeof data.score === 'number' && isFinite(data.score)) {
          const minimal = reconstructMinimalResult({
            score: data.score,
            tier: data.tier ?? 'Unknown',
            tier_color: (data as any).tier_color ?? 'neutral',
            confidence: data.confidence ?? null,
            breakdown: (data.breakdown as Record<string, number>) ?? null,
            calculated_at: data.calculated_at ?? new Date().toISOString(),
          });

          dispatch({ type: 'SET_SCORE_RESULT', payload: minimal as any });
          dispatch({
            type: 'SET_INPUTS',
            payload: {
              companyName: data.company_name ?? null,
              roleTitle: data.role_title ?? null,
              department: data.department ?? null,
            },
          });

          // Write to sessionStorage so same-tab refreshes don't hit DB again.
          writeSession({
            result: minimal as unknown as Record<string, unknown>,
            companyName: data.company_name ?? null,
            roleTitle: data.role_title ?? null,
            ts: Date.now(),
          });
          try { localStorage.setItem('hp_has_prior_audit', '1'); } catch { /* ignore */ }
        }
      } catch (e) {
        console.warn('[useAuditPersistence] Unexpected error:', e);
      }
    })();

  // userId changes (login/logout) should re-evaluate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
