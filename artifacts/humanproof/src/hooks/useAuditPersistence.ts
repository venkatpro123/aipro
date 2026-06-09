// useAuditPersistence.ts
//
// Restores the most recent audit result from Supabase (layoff_scores.full_result)
// whenever the authenticated user has no result loaded in LayoffContext.
//
// Trigger order (fastest → most durable):
//   1. sessionStorage hp_last_score_session — already handled inside
//      LayoffCalculator on its own mount effect (covers same-tab refresh).
//   2. THIS hook — reads layoff_scores from DB on authenticated app load.
//      Fires from App.tsx so it runs even when the user navigates to /os
//      directly (e.g. via bookmark) without passing through /terminal.
//
// The hook is intentionally read-only and side-effect-free beyond dispatching
// to LayoffContext. It never triggers a re-audit.

import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useLayoff } from '../context/LayoffContext';

const SESSION_KEY = 'hp_last_score_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — matches LayoffCalculator

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

export function useAuditPersistence(userId: string | null | undefined): void {
  const { state, dispatch } = useLayoff();
  const didRestore = useRef(false);

  useEffect(() => {
    // Only run once per mount, only when authenticated, and only when there
    // is no result already loaded (e.g. if the user just completed an audit).
    if (didRestore.current) return;
    if (!userId) return;
    if (state.hasCompletedAssessment || state.scoreResult !== null) return;

    didRestore.current = true;

    (async () => {
      // ── Step 1: Try sessionStorage first (zero network cost) ──────────────
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
        return; // sessionStorage hit — no DB call needed
      }

      // ── Step 2: Fetch most recent row with full_result from DB ─────────────
      try {
        const { data, error } = await supabase
          .from('layoff_scores')
          .select('full_result, company_name, role_title, department, calculated_at, score, tier')
          .eq('user_id', userId)
          .not('full_result', 'is', null)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('[useAuditPersistence] DB fetch failed:', error.message);
          return;
        }

        if (!data?.full_result) return;

        // Sanity-check: full_result must have a numeric score field before we
        // dispatch it, so a corrupted/partial JSONB row doesn't reset the UI.
        const fr = data.full_result as Record<string, unknown>;
        const score = (fr as any)?.total ?? (fr as any)?.score;
        if (typeof score !== 'number' || !isFinite(score)) return;

        // Restore to LayoffContext
        dispatch({ type: 'SET_SCORE_RESULT', payload: fr as any });
        dispatch({
          type: 'SET_INPUTS',
          payload: {
            companyName: data.company_name ?? null,
            roleTitle: data.role_title ?? null,
            department: data.department ?? null,
          },
        });

        // Backfill sessionStorage so same-tab refreshes don't hit DB again
        writeSession({
          result: fr,
          companyName: data.company_name ?? null,
          roleTitle: data.role_title ?? null,
          ts: Date.now(),
        });
      } catch (e) {
        console.warn('[useAuditPersistence] Unexpected error:', e);
      }
    })();

  // userId changes (login/logout) should re-evaluate. state.hasCompletedAssessment
  // is intentionally excluded — we only care about its value at first mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
