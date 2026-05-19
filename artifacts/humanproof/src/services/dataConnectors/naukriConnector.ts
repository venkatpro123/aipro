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
import { invokeEdgeFunction } from '../../infrastructure/requestId';
import {
  recordApiDegradation,
  isRateLimitError,
  incrementRequestCount,
  isQuotaExhausted,
} from '../apiDegradationMonitor';
import {
  isCallAllowed,
  recordSuccess as circuitSuccess,
  recordFailure as circuitFailure,
  getCachedResponse,
} from '../apiCircuitBreaker';
import { readCache, writeCache } from '../apiResponseCache';

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
  source: 'Naukri Heuristic' | 'Serper API' | 'Naukri+Indeed+LinkedIn (scraped)';
  /**
   * true  — values came from a real-time Serper API call (server-side).
   * false — ROLE_DEMAND_BASE static prior (Q1 2026 manual review, not refreshed per-request).
   * UI must show "heuristic" qualifier when false.
   */
  isLive: boolean;
  /** Disclosure text for tooltip when isLive = false. */
  disclosure: string;
  fetchedAt: string;
  /** True when data is from the static Q1 2026 baseline (not live) */
  _stale?: boolean;
  /** Reason code for falling back to static baseline */
  _fallbackReason?: 'serper_unavailable' | 'serper_quota_exceeded' | 'serper_error';
  /** ISO date of the static baseline snapshot */
  _baselineDate?: string;
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
function heuristicSignal(
  roleTitle: string,
  company: string,
  fallbackReason: RoleDemandSignal['_fallbackReason'] = 'serper_unavailable',
): RoleDemandSignal {
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
      'Static heuristic baseline (Q1 2026 review). Live hiring signals use direct Naukri/Indeed/LinkedIn ' +
      'scraping (no API key required). This fallback activates only when all scraped sources return zero results.',
    fetchedAt:      new Date().toISOString(),
    _stale:         true,
    _fallbackReason: fallbackReason,
    _baselineDate:  '2026-01-01',
  };
}

// Normalize a role title to the snake_case key used in company_skill_demand_cache.
// Must produce the same keys as workTypeKey in the audit pipeline so reads and
// writes resolve to the same row.
function normalizeRolePrefix(roleTitle: string): string {
  return roleTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Map a RoleDemandSignal demand trend to the enum stored in the DB.
function normalizeTrend(
  trend: 'rising' | 'stable' | 'falling' | string,
  estimatedOpenings: number | null,
): 'surging' | 'growing' | 'stable' | 'contracting' {
  if (trend === 'rising') {
    return (estimatedOpenings != null && estimatedOpenings > 50) ? 'surging' : 'growing';
  }
  if (trend === 'falling') return 'contracting';
  return 'stable';
}

/**
 * Persist a live Naukri/LinkedIn result to company_skill_demand_cache.
 * Fire-and-forget — errors are logged but never surface to the caller.
 * The RPC handles delta computation and prev_openings rotation atomically.
 */
function persistCompanySkillDemand(signal: RoleDemandSignal): void {
  if (!signal.isLive) return;

  const rolePrefix = normalizeRolePrefix(signal.roleTitle);
  const companyName = signal.company.toLowerCase().replace(/\s+/g, '_');
  const trend = normalizeTrend(signal.demandTrend, signal.estimatedOpenings);

  void supabase.rpc('upsert_company_skill_demand', {
    p_company_name:      companyName,
    p_role_prefix:       rolePrefix,
    p_current_openings:  signal.estimatedOpenings,
    p_demand_trend:      trend,
    p_naukri_openings:   signal.naukriOpenings,
    p_linkedin_openings: signal.linkedinOpenings,
    p_is_live:           signal.isLive,
  }).then(({ error }) => {
    if (error) console.info('[NaukriConnector] company_skill_demand_cache write failed:', error.message);
  });
}

export async function fetchRoleDemandSignal(
  roleTitle: string,
  company: string,
): Promise<RoleDemandSignal> {
  // ── Primary: Direct scraping via proxy-live-signals EF (no API key needed) ─
  // The EF tries Naukri+Indeed+LinkedIn direct scraping first; Serper is its fallback.
  // We do NOT pre-increment the Serper counter — we only count it when the EF
  // actually used Serper (scrapeSource === 'serper'). Pre-incrementing was inflating
  // the Serper quota counter on every audit even when direct scraping succeeded.
  if (isQuotaExhausted('serper')) {
    return {
      ...heuristicSignal(roleTitle, company, 'serper_quota_exceeded'),
      disclosure: 'Serper daily quota exhausted this session. Primary: Naukri+Indeed+LinkedIn direct scraping (no key).',
    };
  }

  // Shared cross-user Supabase cache (4h TTL).
  // Hiring data for TCS changes slowly — there's no value in 30 users each
  // firing a Naukri scrape in the same afternoon. The first result serves all.
  const naukriCacheKey = `naukri|${roleTitle.toLowerCase().trim()}|${company.toLowerCase().trim()}`;
  const sharedNaukri = await readCache<RoleDemandSignal>('naukri', naukriCacheKey);
  if (sharedNaukri) {
    const cached = sharedNaukri.payload;
    return {
      ...cached,
      disclosure: cached.disclosure
        ? `${cached.disclosure} (shared cache: ${sharedNaukri.cacheAgeLabel})`
        : `Shared cache: hiring data ${sharedNaukri.cacheAgeLabel}.`,
    };
  }

  // Circuit breaker gate for Naukri/hiring EF — OPEN means the proxy has
  // been unavailable; serve cached signal with disclosure.
  if (!isCallAllowed('naukri')) {
    const cached = getCachedResponse<RoleDemandSignal>('naukri');
    if (cached?.data) {
      const ageHours = Math.round((Date.now() - cached.cachedAt) / 3_600_000);
      return {
        ...cached.data,
        disclosure: `Naukri circuit breaker open — serving cached hiring data from ${ageHours > 0 ? `${ageHours} hour${ageHours !== 1 ? 's' : ''} ago` : 'earlier this session'}. Not live.`,
        _stale: true,
      };
    }
    return heuristicSignal(roleTitle, company, 'serper_unavailable');
  }

  try {
    const { data, error } = await invokeEdgeFunction<any>('proxy-live-signals', {
      body: { action: 'hiring', roleTitle, companyName: company },
    });

    if (!error && data?.hiringData?.isLive) {
      const h = data.hiringData;
      // Only track Serper quota when the EF actually USED Serper as fallback.
      // Direct scraping (Naukri+Indeed+LinkedIn) has no quota to track.
      if (h.scrapeSource === 'serper') {
        incrementRequestCount('serper');
      }
      // Check if the Edge Function itself detected a Serper rate-limit
      if (h.serperRateLimited) {
        recordApiDegradation('serper', 'rate_limited', 'Serper 429 from proxy-live-signals');
        return heuristicSignal(roleTitle, company, 'serper_quota_exceeded');
      }
      // scrapeSource tells us which path delivered the data:
      //   naukri+linkedin+indeed = scraped (no API key)
      //   serper                 = Serper API fallback
      // scrapeSource: 'scraped' = Naukri+Indeed+LinkedIn direct scraping (no API key)
      //               'serper'  = Serper paid API fallback
      const liveSource = h.scrapeSource === 'scraped'
        ? 'Naukri+Indeed+LinkedIn (scraped)' as const
        : 'Serper API' as const;
      const liveResult: RoleDemandSignal = {
        roleTitle,
        company,
        estimatedOpenings: h.estimatedOpenings ?? null,
        naukriOpenings:    h.naukriOpenings   ?? null,
        linkedinOpenings:  h.linkedinOpenings ?? null,
        demandTrend:       h.demandTrend,
        hiringFreezeScore: h.hiringFreezeScore,
        source:            liveSource,
        isLive:            true,
        disclosure:        h.scrapeSource === 'scraped'
          ? ''
          : 'Hiring data from Serper API (paid fallback). Primary path: Naukri+Indeed+LinkedIn direct scraping.',
        fetchedAt:         h.fetchedAt ?? new Date().toISOString(),
      };
      // Persist to company_skill_demand_cache so CareerSkillsTab can overlay
      // company-specific demand badges. Fire-and-forget — never blocks the caller.
      persistCompanySkillDemand(liveResult);
      // Write to shared cross-user cache so subsequent audits of the same
      // role+company don't each burn an EF invocation within the 4h TTL window.
      writeCache('naukri', naukriCacheKey, liveResult);
      circuitSuccess('naukri', liveResult);
      return liveResult;
    }

    if (error) {
      if (isRateLimitError(error)) {
        recordApiDegradation('serper', 'rate_limited', error.message);
      } else {
        recordApiDegradation('serper', 'network_error', error.message);
      }
      circuitFailure('naukri', error.message);
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
    circuitFailure('naukri', e?.message ?? 'unknown');
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

  if (isLocalhost && devSerperKey && isCallAllowed('serper')) {
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

      const devResult: RoleDemandSignal = {
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
      persistCompanySkillDemand(devResult);
      circuitSuccess('serper', devResult);
      return devResult;
    } catch (e: any) {
      if (isRateLimitError(e)) {
        recordApiDegradation('serper', 'rate_limited', `Direct Serper 429: ${e?.message}`);
        circuitFailure('serper', `rate_limited: ${e?.message}`);
      } else {
        circuitFailure('serper', e?.message ?? 'unknown');
      }
      /* fall through to heuristic */
    }
  }

  return heuristicSignal(roleTitle, company, 'serper_error');
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
