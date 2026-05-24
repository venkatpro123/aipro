// naukriConnector.ts
// Naukri/LinkedIn job posting trend proxy — role demand signal.
//
// Live path:  proxy-live-signals Supabase Edge Function — direct market-specific
//             job board scraping (Naukri, Indeed, LinkedIn, Reed, SEEK, etc.).
//             No API keys required. The EF runs server-side, bypassing CORS.
//
// Fallback:   ROLE_DEMAND_BASE static priors (Q1 2026 manual review) — labeled
//             as heuristic so the UI never presents them as live job-market data.

import { supabase } from '../../utils/supabase';
import { invokeEdgeFunction } from '../../infrastructure/requestId';
import {
  recordApiDegradation,
  isRateLimitError,
} from '../apiDegradationMonitor';
import {
  isCallAllowed,
  recordSuccess as circuitSuccess,
  recordFailure as circuitFailure,
  getCachedResponse,
  type CircuitApiName,
} from '../apiCircuitBreaker';
import { readCache, writeCache } from '../apiResponseCache';
import {
  resolveHiringMarket,
  MARKET_HIRING_CONNECTORS,
  type HiringMarket,
} from '../hiringSignalAnalyzer';

export interface RoleDemandSignal {
  roleTitle: string;
  company: string;
  estimatedOpenings: number | null;
  /** Breakdown: openings found on Naukri/NaukriGulf specifically. Null when not live. */
  naukriOpenings: number | null;
  /** Breakdown: openings found on LinkedIn specifically. Null when not live. */
  linkedinOpenings: number | null;
  demandTrend: 'rising' | 'stable' | 'falling';
  hiringFreezeScore: number;
  /** Live source label — market-specific when a market connector was used. */
  source: string;
  /**
   * true  — values came from a real-time market-appropriate job board scrape.
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
  _fallbackReason?: 'scraper_unavailable' | 'scraper_empty' | 'scraper_error';
  /** ISO date of the static baseline snapshot */
  _baselineDate?: string;
  /** Which geographic market's connectors were used. */
  _market?: HiringMarket;
  /** Per-connector scrape outcomes — passed to client for circuit tracking. */
  _connectorResults?: Record<string, { openings: number | null; failed: boolean }>;
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
  fallbackReason: RoleDemandSignal['_fallbackReason'] = 'scraper_unavailable',
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
      'job-board scraping via the proxy Edge Function (no API keys required). ' +
      'This fallback activates only when all scraped sources return zero results.',
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
  region?: string,
): Promise<RoleDemandSignal> {
  const market = resolveHiringMarket(region);
  const marketConnectors = MARKET_HIRING_CONNECTORS[market];

  // ── Primary: Direct scraping via proxy-live-signals EF (no API keys needed) ─
  // The EF runs market-appropriate job board scrapers (Naukri, Indeed, LinkedIn,
  // Reed, SEEK, StepStone, Bayt, etc.) — all free, no paid APIs.

  // Shared cross-user Supabase cache (4h TTL). Market-scoped key so a Singapore
  // result never poisons an India cache for the same role+company.
  const cacheKey = `hiring|${market}|${roleTitle.toLowerCase().trim()}|${company.toLowerCase().trim()}`;
  const sharedCached = await readCache<RoleDemandSignal>('naukri', cacheKey);
  if (sharedCached) {
    const cached = sharedCached.payload;
    return {
      ...cached,
      disclosure: cached.disclosure
        ? `${cached.disclosure} (shared cache: ${sharedCached.cacheAgeLabel})`
        : `Shared cache: hiring data ${sharedCached.cacheAgeLabel}.`,
    };
  }

  // Circuit breaker gate — 'naukri' represents the proxy-live-signals EF health
  // (not just Naukri India). If the EF is OPEN, serve cached signal.
  if (!isCallAllowed('naukri')) {
    const cached = getCachedResponse<RoleDemandSignal>('naukri');
    if (cached?.data) {
      const ageHours = Math.round((Date.now() - cached.cachedAt) / 3_600_000);
      return {
        ...cached.data,
        disclosure: `Hiring proxy circuit open — serving cached data from ${ageHours > 0 ? `${ageHours}h ago` : 'earlier this session'}. Not live.`,
        _stale: true,
      };
    }
    return heuristicSignal(roleTitle, company, 'scraper_unavailable');
  }

  // Build skipConnectors: connector IDs whose client-side circuits are OPEN.
  // The EF receives this list and skips those job boards without burning timeouts.
  const skipConnectors = marketConnectors
    .filter(c => !isCallAllowed(c.id as CircuitApiName))
    .map(c => c.id);

  try {
    const { data, error } = await invokeEdgeFunction<any>('proxy-live-signals', {
      body: {
        action:          'hiring',
        roleTitle,
        companyName:     company,
        market,
        skipConnectors,
      },
    });

    if (!error && data?.hiringData?.isLive) {
      const h = data.hiringData;

      // Update per-connector circuits from EF response.
      const connectorResults: Record<string, { openings: number | null; failed: boolean }> =
        data.connectorResults ?? {};
      for (const [connId, outcome] of Object.entries(connectorResults)) {
        const circuitId = connId as CircuitApiName;
        if ((outcome as any).failed) {
          circuitFailure(circuitId, `scrape returned null for ${connId}`);
        } else if ((outcome as any).openings !== null) {
          circuitSuccess(circuitId, (outcome as any).openings);
        }
      }

      const liveResult: RoleDemandSignal = {
        roleTitle,
        company,
        estimatedOpenings: h.estimatedOpenings ?? null,
        naukriOpenings:    h.naukriOpenings   ?? null,
        linkedinOpenings:  h.linkedinOpenings ?? null,
        demandTrend:       h.demandTrend,
        hiringFreezeScore: h.hiringFreezeScore,
        source:            h.source ?? `${market} job boards (scraped)`,
        isLive:            true,
        disclosure:        '',
        fetchedAt:         h.fetchedAt ?? new Date().toISOString(),
        _market:           market,
        _connectorResults: connectorResults,
      };

      persistCompanySkillDemand(liveResult);
      writeCache('naukri', cacheKey, liveResult);
      circuitSuccess('naukri', liveResult);
      return liveResult;
    }

    if (!error && data !== null) {
      // EF responded 200 but hiringData is null (all scrapers returned nothing).
      // This is NOT an EF failure — the EF itself is reachable. Reset the failure
      // counter so transient scrape-zero results don't drift the circuit toward OPEN.
      circuitSuccess('naukri');
      if (data?.errors?.length) {
        console.info('[NaukriConnector] Edge Function scrape empty:', data.errors.join('; '));
      }
    } else if (error) {
      const msg = error.message ?? String(error);
      // 401 = user session expired or not logged in — not a scraper availability problem.
      // Don't record it as a circuit failure; just fall through to heuristic.
      if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('Invalid or expired token')) {
        console.info('[NaukriConnector] Auth error — session may have expired. Not tripping circuit.');
      } else if (isRateLimitError(error)) {
        recordApiDegradation('supabase_osint', 'rate_limited', msg);
        circuitFailure('naukri', msg);
      } else {
        recordApiDegradation('supabase_osint', 'network_error', msg);
        circuitFailure('naukri', msg);
      }
    }
  } catch (e: any) {
    const msg = e?.message ?? 'unknown';
    if (isRateLimitError(e)) {
      recordApiDegradation('supabase_osint', 'rate_limited', msg);
    } else {
      recordApiDegradation('supabase_osint', 'network_error', msg);
    }
    circuitFailure('naukri', msg);
    console.info('[NaukriConnector] Edge Function unavailable:', msg);
  }

  return heuristicSignal(roleTitle, company, 'scraper_error');
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
