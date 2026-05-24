// edgeFunctionRegistry.ts
// Centralized registry of all deployed Edge Functions.
//
// Solves the silent-fallback problem: when a required EF is not deployed,
// auditDataPipeline.ts previously caught the 404 silently and fell through to
// the legacy path with no visible indication. With this registry:
//   1. The pipeline calls checkEdgeFunctionHealth() at boot (once per session).
//   2. Any missing EF is surfaced in evaluationSnapshot.engineFailures.
//   3. The dashboard can show "Live OSINT: unavailable (EF not deployed)" instead
//      of silently showing heuristic values labeled as live.
//
// Registry is authoritative — add an entry here when deploying a new EF.

import { supabase } from '../utils/supabase';
import { invokeEdgeFunction } from '../infrastructure/requestId';

export interface EFRegistryEntry {
  /** Supabase function name (matches supabase/functions/<name>/index.ts) */
  name: string;
  /** Human-readable description for error messages */
  label: string;
  /** Pipeline impact when missing */
  impact: 'critical' | 'high' | 'medium' | 'low';
  /** Which pipeline feature degrades when this EF is absent */
  degradesFeature: string;
}

export const EF_REGISTRY: EFRegistryEntry[] = [
  {
    name:            'fetch-company-data',
    label:           'Company OSINT (live DB lookup)',
    impact:          'critical',
    degradesFeature: 'Step 1 live OSINT — falls back to Step 2 DB lookup',
  },
  {
    name:            'calculate-hybrid-risk',
    label:           'Hybrid Consensus Scorer',
    impact:          'critical',
    degradesFeature: 'Hybrid scoring — falls back to legacy calculateLayoffScore()',
  },
  {
    name:            'proxy-macro',
    label:           'BLS/FRED Macro Proxy',
    impact:          'high',
    degradesFeature: 'Step 40 BLS macro signals — falls back to May 2026 baselines',
  },
  {
    name:            'proxy-live-signals',
    label:           'Yahoo Finance + RSS News Proxy',
    impact:          'high',
    degradesFeature: 'Live stock + news signals — falls back to heuristics',
  },
  {
    name:            'warn-act-fetch',
    label:           'WARN Act Filing Fetcher',
    impact:          'high',
    degradesFeature: 'Steps 39/43/44 WARN/Glassdoor/Exec signals — falls back to DB cache',
  },
  {
    name:            'breaking-news-scan',
    label:           'Breaking News Scanner',
    impact:          'medium',
    degradesFeature: 'Intra-day layoff detection — no real-time alerts',
  },
  {
    name:            'refresh-market-intelligence',
    label:           'Market Intelligence Refresher',
    impact:          'medium',
    degradesFeature: 'Weekly role-market data refresh — cache becomes stale',
  },
  {
    name:            'multi-model-analyze',
    label:           'Multi-Model LLM Proxy',
    impact:          'low',
    degradesFeature: 'Ensemble LLM scoring — falls back to single-model',
  },
  {
    name:            'api-displacement-scores',
    label:           'Public API (B2B)',
    impact:          'low',
    degradesFeature: 'External API product — not required for internal audit',
  },
  {
    name:            'fetch-bse-data',
    label:           'BSE India Data Proxy',
    impact:          'low',
    degradesFeature: 'BSE India stock data for Indian companies',
  },
];

export interface EFHealthResult {
  name:    string;
  status:  'ok' | 'missing' | 'error' | 'unknown';
  impact:  EFRegistryEntry['impact'];
  label:   string;
  degradesFeature: string;
  checkedAt: number;
}

// Session-level cache — health is checked once per page load, not per audit.
// A 5-minute TTL prevents redundant network calls while keeping the status fresh.
let healthCache: { results: EFHealthResult[]; expiresAt: number } | null = null;
const HEALTH_TTL_MS = 5 * 60 * 1000;

/**
 * Probe each registered EF with a lightweight OPTIONS request.
 * Returns health results for all EFs; never throws.
 *
 * Call this once at pipeline init, not on every audit step.
 */
export async function checkEdgeFunctionHealth(
  names?: string[], // subset to check; defaults to all
): Promise<EFHealthResult[]> {
  if (healthCache && Date.now() < healthCache.expiresAt) {
    const filtered = names
      ? healthCache.results.filter(r => names.includes(r.name))
      : healthCache.results;
    return filtered;
  }

  const targets = names
    ? EF_REGISTRY.filter(e => names.includes(e.name))
    : EF_REGISTRY;

  // BUG-08: Promise.allSettled — each entry's async function already catches its own
  // errors, so rejection is impossible in practice. allSettled makes the isolation
  // contract explicit: one hung EF health-check cannot abort the rest.
  const settled = await Promise.allSettled(
    targets.map(async (entry): Promise<EFHealthResult> => {
      const base: Omit<EFHealthResult, 'status'> = {
        name:            entry.name,
        impact:          entry.impact,
        label:           entry.label,
        degradesFeature: entry.degradesFeature,
        checkedAt:       Date.now(),
      };

      try {
        // Use supabase.functions.invoke with a minimal body — if the EF is not
        // deployed, Supabase returns a FunctionsHttpError with status 404.
        // We use a short timeout so this doesn't block audits.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3_000);

        const { error } = await invokeEdgeFunction(entry.name, {
          body: { _healthCheck: true },
        });

        clearTimeout(timeout);

        if (!error) return { ...base, status: 'ok' };

        const msg = (error as any)?.message ?? '';
        const status404 = msg.includes('404') || msg.toLowerCase().includes('not found');
        return { ...base, status: status404 ? 'missing' : 'error' };
      } catch {
        return { ...base, status: 'unknown' };
      }
    }),
  );
  // Inner async functions always return EFHealthResult (catch → 'unknown'), so every
  // settled result should be fulfilled. The rejected branch is a defence-in-depth fallback.
  const results: EFHealthResult[] = settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : { name: targets[i]?.name ?? 'unknown', impact: targets[i]?.impact ?? 'low',
          label: targets[i]?.label ?? 'Unknown EF', degradesFeature: targets[i]?.degradesFeature ?? '',
          checkedAt: Date.now(), status: 'unknown' as const },
  );

  // Cache only when checking all EFs (partial check result shouldn't pollute full cache)
  if (!names) {
    healthCache = { results, expiresAt: Date.now() + HEALTH_TTL_MS };
  }

  return results;
}

/**
 * Returns a compact summary for evaluationSnapshot.engineFailures.
 * Only includes EFs that are missing or erroring.
 */
export function getEFDegradationWarnings(
  results: EFHealthResult[],
): Array<{ engine: string; error: string }> {
  return results
    .filter(r => r.status === 'missing' || r.status === 'error')
    .map(r => ({
      engine: `ef:${r.name}`,
      error:  `${r.label} is ${r.status} — ${r.degradesFeature}`,
    }));
}

/** Convenience: returns true if any critical EF is missing. */
export function hasCriticalEFMissing(results: EFHealthResult[]): boolean {
  return results.some(r => r.impact === 'critical' && r.status === 'missing');
}
