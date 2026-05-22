// marketBatchStatusService.ts
//
// Client-side service for reading per-regional-batch freshness from
// market_batch_status. Used by TakeActionTab to show an amber notice
// when the user's region has stale market intelligence data.
//
// ── Freshness contract ────────────────────────────────────────────────────────
// The weekly refresh runs Monday 06:00 UTC. If it fails for a region, the
// previous successful scrape date is preserved in last_success_at. When
// last_success_at < NOW() - 14 days, the batch is considered stale and the
// UI surfaces a notice: "Market data for UK Data Engineering: last updated 18
// days ago. Opening counts may not reflect current demand."
//
// ── Caching ───────────────────────────────────────────────────────────────────
// Batch status is cached in memory for 60 minutes per region code.
// At 10,000 daily audits across 7 regions, this reduces market_batch_status
// SELECT queries from ~10,000 to ~7 per hour (one per region per cache window).

import { supabase } from '../utils/supabase';

// ── Region → batch mapping ────────────────────────────────────────────────────
// Covers all known region codes in companyData.region. Unmapped codes fall
// back to 'us_batch' (broadest market data, safest default).

const REGION_TO_BATCH: Record<string, string> = {
  // India
  IN: 'india_batch',
  // United States + English-language markets that use US batch
  US: 'us_batch',
  CA: 'us_batch',
  AU: 'us_batch',
  NZ: 'us_batch',
  // United Kingdom
  GB: 'uk_batch',
  IE: 'uk_batch',
  // Germany / DACH
  DE: 'germany_batch',
  AT: 'germany_batch',
  CH: 'germany_batch',
  // Singapore
  SG: 'singapore_batch',
  MY: 'singapore_batch',  // Malaysia: closest market data
  // Latin America
  BR: 'latam_batch',
  MX: 'latam_batch',
  AR: 'latam_batch',
  CO: 'latam_batch',
  CL: 'latam_batch',
  PE: 'latam_batch',
  // MENA
  AE: 'mena_batch',
  SA: 'mena_batch',
  QA: 'mena_batch',
  EG: 'mena_batch',
  KW: 'mena_batch',
  BH: 'mena_batch',
  OM: 'mena_batch',
  // Philippines: closest to SG batch
  PH: 'singapore_batch',
  // South-East Asia
  ID: 'singapore_batch',
  TH: 'singapore_batch',
  VN: 'singapore_batch',
  // East Asia
  JP: 'singapore_batch',
  KR: 'singapore_batch',
  HK: 'singapore_batch',
  TW: 'singapore_batch',
  // Europe (non-DACH) → UK batch (English-language job boards overlap)
  FR: 'uk_batch',
  NL: 'uk_batch',
  SE: 'uk_batch',
  NO: 'uk_batch',
  DK: 'uk_batch',
  FI: 'uk_batch',
  PL: 'uk_batch',
  ES: 'uk_batch',
  IT: 'uk_batch',
  PT: 'uk_batch',
};

const STALE_DAYS = 14;

export interface MarketBatchStatus {
  batchId:        string;
  regionCode:     string;
  regionLabel:    string;
  lastRunAt:      string | null;
  lastSuccessAt:  string | null;
  lastStatus:     'success' | 'partial' | 'failed' | null;
  rolesSuccess:   number;
  rolesTotal:     number;
  sourcesBlocked: string[];
  ageInDays:      number | null;     // days since last_success_at; null if never succeeded
  isStale:        boolean;           // true when ageInDays > STALE_DAYS
  staleThresholdDays: number;
}

// ── In-memory cache with 60-minute TTL ───────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1_000; // 60 minutes

interface CacheEntry {
  status:    MarketBatchStatus | null;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>(); // keyed by batchId

// ── Service function ──────────────────────────────────────────────────────────

/**
 * Returns the freshness status for the regional batch that covers the given
 * ISO-3166 region code (e.g. 'IN', 'GB', 'DE'). Returns null if the batch
 * row does not exist (e.g. before the first weekly refresh run).
 *
 * Results are cached in memory for 60 minutes — safe to call on every tab
 * render without causing excess Supabase SELECT load.
 *
 * Never throws — network/DB errors return null (no warning shown = safe).
 */
export async function getMarketBatchStatus(
  regionCode: string | null | undefined,
): Promise<MarketBatchStatus | null> {
  if (!regionCode) return null;

  const batchId = REGION_TO_BATCH[regionCode.toUpperCase()] ?? 'us_batch';

  // Cache hit
  const cached = cache.get(batchId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.status;
  }

  try {
    const { data, error } = await supabase
      .from('market_batch_status')
      .select('batch_id, region_codes, region_label, last_run_at, last_success_at, last_status, roles_success, roles_total, sources_blocked, stale_threshold_days')
      .eq('batch_id', batchId)
      .maybeSingle();

    if (error || !data) {
      cache.set(batchId, { status: null, fetchedAt: Date.now() });
      return null;
    }

    const ageInDays = data.last_success_at
      ? Math.floor((Date.now() - new Date(data.last_success_at).getTime()) / 86_400_000)
      : null;

    const threshold = data.stale_threshold_days ?? STALE_DAYS;

    const status: MarketBatchStatus = {
      batchId:        data.batch_id,
      regionCode:     (data.region_codes ?? [])[0] ?? regionCode,
      regionLabel:    data.region_label ?? batchId,
      lastRunAt:      data.last_run_at ?? null,
      lastSuccessAt:  data.last_success_at ?? null,
      lastStatus:     data.last_status ?? null,
      rolesSuccess:   data.roles_success ?? 0,
      rolesTotal:     data.roles_total ?? 0,
      sourcesBlocked: data.sources_blocked ?? [],
      ageInDays,
      isStale:        ageInDays !== null ? ageInDays > threshold : false,
      staleThresholdDays: threshold,
    };

    cache.set(batchId, { status, fetchedAt: Date.now() });
    return status;

  } catch {
    // Non-fatal: fresh market data check should never surface to the user as an error.
    cache.set(batchId, { status: null, fetchedAt: Date.now() });
    return null;
  }
}

/** Invalidate cached status for a batch (e.g., after a manual refresh). */
export function invalidateMarketBatchCache(batchId?: string): void {
  if (batchId) {
    cache.delete(batchId);
  } else {
    cache.clear();
  }
}
