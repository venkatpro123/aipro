// naukriConnector.ts
// Naukri/LinkedIn job posting trend proxy — role demand signal.
//
// Live path:  proxy-live-signals Supabase Edge Function (Serper API key held server-side).
//             The browser NEVER holds the Serper key. Calling Serper directly from
//             the browser exposed the key in the JS bundle (v6.0 audit finding).
//
// Fallback:   ROLE_DEMAND_BASE static priors (Q1 2026 manual review) — labeled
//             as heuristic so the UI never presents them as live job-market data.

import { supabase } from '../../utils/supabase';
import {
  recordApiDegradation,
  isRateLimitError,
  incrementRequestCount,
  isQuotaExhausted,
} from '../apiDegradationMonitor';

export interface RoleDemandSignal {
  roleTitle: string;
  company: string;
  estimatedOpenings: number | null;
  /** Breakdown: openings found on Naukri specifically. Null when not live. */
  naukriOpenings: number | null;
  /** Breakdown: openings found on LinkedIn specifically. Null when not live. */
  linkedinOpenings: number | null;
  demandTrend: 'rising' | 'stable' | 'falling';
  hiringFreezeScore: number;
  source: 'Naukri Heuristic' | 'Serper API';
  /**
   * true  — values came from a real-time Serper API call (server-side).
   * false — ROLE_DEMAND_BASE static prior (Q1 2026 manual review, not refreshed per-request).
   * UI must show "heuristic" qualifier when false.
   */
  isLive: boolean;
  /** Disclosure text for tooltip when isLive = false. */
  disclosure: string;
  fetchedAt: string;
}

// ── Static priors — last manual review: Q1 2026 ──────────────────────────────
// IMPORTANT: these are NOT live data. Update by cross-checking Naukri snapshots,
// LinkedIn role-trend reports, and StackOverflow developer survey trends.
export const ROLE_DEMAND_BASE: Record<string, { trend: 'rising' | 'stable' | 'falling'; freezeScore: number }> = {
  'ai engineer':           { trend: 'rising',  freezeScore: 0.05 },
  'ml engineer':           { trend: 'rising',  freezeScore: 0.05 },
  'data scientist':        { trend: 'stable',  freezeScore: 0.20 },
  'cloud engineer':        { trend: 'rising',  freezeScore: 0.10 },
  'devops':                { trend: 'rising',  freezeScore: 0.10 },
  'cybersecurity':         { trend: 'rising',  freezeScore: 0.08 },
  'software engineer':     { trend: 'stable',  freezeScore: 0.25 },
  'frontend developer':    { trend: 'stable',  freezeScore: 0.30 },
  'backend developer':     { trend: 'stable',  freezeScore: 0.28 },
  'product manager':       { trend: 'stable',  freezeScore: 0.35 },
  'data analyst':          { trend: 'falling', freezeScore: 0.45 },
  'business analyst':      { trend: 'falling', freezeScore: 0.48 },
  'qa engineer':           { trend: 'falling', freezeScore: 0.55 },
  'recruiter':             { trend: 'falling', freezeScore: 0.60 },
  'content writer':        { trend: 'falling', freezeScore: 0.70 },
  'customer service':      { trend: 'falling', freezeScore: 0.65 },
  'data entry':            { trend: 'falling', freezeScore: 0.85 },
  'technical writer':      { trend: 'falling', freezeScore: 0.60 },
  'marketing coordinator': { trend: 'falling', freezeScore: 0.55 },
};

export function matchRole(roleTitle: string): { trend: 'rising' | 'stable' | 'falling'; freezeScore: number } {
  const lower = roleTitle.toLowerCase();
  for (const [key, val] of Object.entries(ROLE_DEMAND_BASE)) {
    if (lower.includes(key)) return val;
  }
  return { trend: 'stable', freezeScore: 0.35 };
}

/** Heuristic fallback — always available, never live. */
function heuristicSignal(roleTitle: string, company: string): RoleDemandSignal {
  const base = matchRole(roleTitle);
  return {
    roleTitle,
    company,
    estimatedOpenings: null,
    naukriOpenings:    null,
    linkedinOpenings:  null,
    demandTrend:       base.trend,
    hiringFreezeScore: base.freezeScore,
    source:            'Naukri Heuristic',
    isLive:            false,
    disclosure:
      'Static heuristic baseline (Q1 2026 review). Hiring data is not refreshed per-request. ' +
      'Configure SERPER_API_KEY in Supabase Edge Function secrets to enable live Naukri/LinkedIn job counts.',
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchRoleDemandSignal(
  roleTitle: string,
  company: string,
): Promise<RoleDemandSignal> {
  // ── Primary: Serper via proxy-live-signals Edge Function (key server-side) ─
  // Quota guard: skip if this session has already exhausted the Serper daily limit.
  if (isQuotaExhausted('serper')) {
    return {
      ...heuristicSignal(roleTitle, company),
      disclosure: 'Serper daily quota exhausted this session. Hiring data is a heuristic baseline until quota resets.',
    };
  }

  try {
    incrementRequestCount('serper');
    const { data, error } = await supabase.functions.invoke('proxy-live-signals', {
      body: { action: 'hiring', roleTitle, companyName: company },
    });

    if (!error && data?.hiringData?.isLive) {
      const h = data.hiringData;
      // Check if the Edge Function itself detected a Serper rate-limit
      if (h.serperRateLimited) {
        recordApiDegradation('serper', 'rate_limited', 'Serper 429 from proxy-live-signals');
        return heuristicSignal(roleTitle, company);
      }
      return {
        roleTitle,
        company,
        estimatedOpenings: h.estimatedOpenings ?? null,
        naukriOpenings:    h.naukriOpenings   ?? null,
        linkedinOpenings:  h.linkedinOpenings ?? null,
        demandTrend:       h.demandTrend,
        hiringFreezeScore: h.hiringFreezeScore,
        source:            'Serper API',
        isLive:            true,
        disclosure:        '',
        fetchedAt:         h.fetchedAt ?? new Date().toISOString(),
      };
    }

    if (error) {
      if (isRateLimitError(error)) {
        recordApiDegradation('serper', 'rate_limited', error.message);
      } else {
        recordApiDegradation('serper', 'network_error', error.message);
      }
    }
    if (data?.errors?.length) {
      console.info('[NaukriConnector] Edge Function:', data.errors.join('; '));
    }
  } catch (e: any) {
    if (isRateLimitError(e)) {
      recordApiDegradation('serper', 'rate_limited', e?.message);
    } else {
      recordApiDegradation('serper', 'network_error', e?.message);
    }
    console.info('[NaukriConnector] Edge Function unavailable:', e?.message);
  }

  // ── Localhost-only fallback: call Serper directly using VITE_SERPER_KEY ────
  // This path only runs when:
  //   1. The Edge Function call above failed (e.g. local dev without Supabase running)
  //   2. The origin is strictly localhost or 127.0.0.1 (not a deployed domain)
  // In production, the Edge Function always succeeds, so this block is never reached.
  const isLocalhost = typeof window !== 'undefined'
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const devSerperKey = typeof import.meta !== 'undefined'
    ? (import.meta as any).env?.VITE_SERPER_KEY as string | undefined
    : undefined;

  if (isLocalhost && devSerperKey) {
    try {
      const [naukriRes, linkedinRes] = await Promise.all([
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': devSerperKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `"${roleTitle}" jobs ${company} site:naukri.com`, num: 10 }),
          signal: AbortSignal.timeout(5000),
        }),
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': devSerperKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `"${roleTitle}" jobs ${company} site:linkedin.com/jobs`, num: 10 }),
          signal: AbortSignal.timeout(5000),
        }),
      ]);

      const parseCount = async (res: Response): Promise<number | null> => {
        if (!res.ok) return null;
        const d = await res.json();
        const snippets: string[] = (d?.organic ?? []).slice(0, 3).map((r: any) => r?.snippet ?? '');
        for (const s of snippets) {
          const m = s.match(/(\d[\d,]+)\s+(?:jobs?|openings?|positions?)/i);
          if (m) return parseInt(m[1].replace(/,/g, ''), 10);
        }
        return (d?.organic ?? []).filter((r: any) =>
          /jobs?|openings?|hiring|career/i.test(r.title ?? ''),
        ).length || null;
      };

      const naukriCount   = await parseCount(naukriRes);
      const linkedinCount = await parseCount(linkedinRes);
      const total = (naukriCount ?? 0) + (linkedinCount ?? 0);

      return {
        roleTitle,
        company,
        estimatedOpenings: total > 0 ? total : null,
        naukriOpenings:    naukriCount,
        linkedinOpenings:  linkedinCount,
        demandTrend:       total > 10 ? 'rising' : total > 3 ? 'stable' : 'falling',
        hiringFreezeScore: total === 0 ? 0.85 : total < 3 ? 0.60 : total < 8 ? 0.35 : 0.15,
        source:            'Serper API',
        isLive:            true,
        disclosure:        '',
        fetchedAt:         new Date().toISOString(),
      };
    } catch (e: any) {
      if (isRateLimitError(e)) {
        recordApiDegradation('serper', 'rate_limited', `Direct Serper 429: ${e?.message}`);
      }
      /* fall through to heuristic */
    }
  }

  return heuristicSignal(roleTitle, company);
}

// ── Hiring freeze detection from job-posting delta ───────────────────────────
export function detectHiringFreeze(
  currentOpenings: number | null,
  previousOpenings: number | null,
): { frozen: boolean; severity: 'none' | 'partial' | 'full' } {
  if (currentOpenings === null || previousOpenings === null) {
    return { frozen: false, severity: 'none' };
  }
  const delta = previousOpenings === 0 ? -1 : (currentOpenings - previousOpenings) / previousOpenings;
  if (delta < -0.6) return { frozen: true, severity: 'full' };
  if (delta < -0.35) return { frozen: true, severity: 'partial' };
  return { frozen: false, severity: 'none' };
}
