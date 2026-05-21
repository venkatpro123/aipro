// apiCircuitBreaker.ts
// Circuit breaker for all external APIs.
//
// Covered APIs (13 total):
//   alphavantage         — Alpha Vantage stock data (25/day free tier, localhost dev only)
//   newsapi              — NewsAPI headlines (100/day free tier)
//   serper               — Serper.dev search (paid, fallback only)
//   rss2json             — rss2json.com RSS proxy (shared by breakingNewsPoller + rssNewsConnector)
//   yahoo-finance-us     — Yahoo Finance for US-listed tickers (no suffix / .N / .O) via proxy EF
//   yahoo-finance-global — Yahoo Finance for internationally-listed tickers (.NS, .BO, .L, .SI, .AX, etc.)
//                          Isolated from yahoo-finance-us so a US data-centre outage does not block
//                          BSE/NSE/LSE data acquisition on the same proxy connection path.
//   naukri               — Naukri hiring API via proxy-live-signals EF
//   sec-edgar            — SEC EDGAR direct HTTPS (rate-limited per IP)
//   warn-act             — DOL WARN Act database
//   bse                  — BSE India stock API (direct, no auth, public endpoint)
//   nse-india            — NSE India stock/derivative data
//   london-stock-exchange — LSE stock data (future connector)
//   sgx                  — Singapore Exchange data (future connector)
//
// STATE MACHINE
// ─────────────
//   CLOSED ──(3 consecutive failures)──► OPEN
//   OPEN   ──(5 min timeout expires) ──► HALF_OPEN
//   HALF_OPEN ──(probe succeeds)     ──► CLOSED
//   HALF_OPEN ──(probe fails)        ──► OPEN  (restart timer)
//
// STORAGE ARCHITECTURE
// ────────────────────
//   Hot path (read):  localStorage — zero latency, no network round-trip.
//   State sync (write): Supabase api_circuit_status — cross-session sharing.
//     When user A triggers 3 AV failures, the circuit opens in their localStorage
//     AND is written to Supabase. When user B loads the page, they read Supabase
//     and inherit the already-open circuit instead of burning 3 more API calls.
//
// CACHE LAYER
// ───────────
//   The last successful API response is cached in localStorage per API.
//   When circuit is OPEN: callers receive { data: cachedData, cachedAt, fromCircuitBreaker: true }.
//   The UI labels this as "Cached [N] hours ago" and offers a "Recalculate?" prompt.
//
// PROBE DISCIPLINE
// ────────────────
//   When HALF_OPEN: only ONE probe is allowed. Concurrent callers requesting a
//   probe simultaneously would all fire — this is prevented by a `probeInFlight`
//   flag in localStorage that expires after 30 seconds.

import { supabase } from '../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CircuitApiName =
  | 'alphavantage'
  | 'newsapi'
  | 'serper'
  | 'rss2json'
  | 'yahoo-finance-us'
  | 'yahoo-finance-global'
  | 'naukri'
  | 'sec-edgar'
  | 'warn-act'
  | 'bse'
  | 'nse-india'
  | 'london-stock-exchange'
  | 'sgx'
  // ── Market-specific hiring connectors ─────────────────────────────────────
  // India
  | 'indeed-india'
  | 'linkedin-india'
  // US
  | 'linkedin-us'
  | 'indeed-us'
  | 'glassdoor-jobs'
  // UK
  | 'linkedin-uk'
  | 'indeed-uk'
  | 'reed'
  | 'jobsite'
  // Germany / EU
  | 'linkedin-de'
  | 'stepstone'
  | 'xing'
  // Singapore
  | 'linkedin-sg'
  | 'jobsdb'
  | 'mycareersfuture'
  // Australia
  | 'linkedin-au'
  | 'seek'
  | 'jora'
  // Canada
  | 'linkedin-ca'
  | 'indeed-ca'
  | 'job-bank'
  // LatAm
  | 'linkedin-latam'
  | 'bumeran'
  | 'computrabajo'
  // MENA
  | 'linkedin-mena'
  | 'bayt'
  | 'naukrigulf';

/** All APIs tracked by the circuit breaker — used for sync and quota snapshots. */
export const ALL_CIRCUIT_APIS: CircuitApiName[] = [
  'alphavantage', 'newsapi', 'serper', 'rss2json',
  'yahoo-finance-us', 'yahoo-finance-global',
  'naukri', 'sec-edgar', 'warn-act',
  'bse', 'nse-india', 'london-stock-exchange', 'sgx',
  // India hiring
  'indeed-india', 'linkedin-india',
  // US hiring
  'linkedin-us', 'indeed-us', 'glassdoor-jobs',
  // UK hiring
  'linkedin-uk', 'indeed-uk', 'reed', 'jobsite',
  // Germany hiring
  'linkedin-de', 'stepstone', 'xing',
  // Singapore hiring
  'linkedin-sg', 'jobsdb', 'mycareersfuture',
  // Australia hiring
  'linkedin-au', 'seek', 'jora',
  // Canada hiring
  'linkedin-ca', 'indeed-ca', 'job-bank',
  // LatAm hiring
  'linkedin-latam', 'bumeran', 'computrabajo',
  // MENA hiring
  'linkedin-mena', 'bayt', 'naukrigulf',
];

/** Human-readable labels for circuit breaker API names. */
export const CIRCUIT_API_LABELS: Record<CircuitApiName, string> = {
  'alphavantage':           'Alpha Vantage',
  'newsapi':                'NewsAPI',
  'serper':                 'Serper',
  'rss2json':               'RSS Proxy (rss2json)',
  'yahoo-finance-us':       'Yahoo Finance (US)',
  'yahoo-finance-global':   'Yahoo Finance (International)',
  'naukri':                 'Naukri',
  'sec-edgar':              'SEC EDGAR',
  'warn-act':               'WARN Act (DOL)',
  'bse':                    'BSE India',
  'nse-india':              'NSE India',
  'london-stock-exchange':  'London Stock Exchange',
  'sgx':                    'Singapore Exchange (SGX)',
  // India hiring
  'indeed-india':           'Indeed India',
  'linkedin-india':         'LinkedIn India',
  // US hiring
  'linkedin-us':            'LinkedIn US',
  'indeed-us':              'Indeed US',
  'glassdoor-jobs':         'Glassdoor Jobs',
  // UK hiring
  'linkedin-uk':            'LinkedIn UK',
  'indeed-uk':              'Indeed UK',
  'reed':                   'Reed.co.uk',
  'jobsite':                'Jobsite/Totaljobs',
  // Germany hiring
  'linkedin-de':            'LinkedIn Germany',
  'stepstone':              'StepStone DE',
  'xing':                   'Xing Jobs',
  // Singapore hiring
  'linkedin-sg':            'LinkedIn Singapore',
  'jobsdb':                 'JobsDB Singapore',
  'mycareersfuture':        'MyCareersFuture.gov.sg',
  // Australia hiring
  'linkedin-au':            'LinkedIn Australia',
  'seek':                   'SEEK Australia',
  'jora':                   'Jora Australia',
  // Canada hiring
  'linkedin-ca':            'LinkedIn Canada',
  'indeed-ca':              'Indeed Canada',
  'job-bank':               'Job Bank Canada',
  // LatAm hiring
  'linkedin-latam':         'LinkedIn LatAm',
  'bumeran':                'Bumeran',
  'computrabajo':           'Computrabajo',
  // MENA hiring
  'linkedin-mena':          'LinkedIn MENA',
  'bayt':                   'Bayt.com',
  'naukrigulf':             'NaukriGulf',
};

/**
 * Map a stock ticker symbol to the appropriate Yahoo Finance circuit key.
 * International suffixes (.NS/.BO for India, .L for London, .SI for Singapore,
 * .AX for Australia, .HK for Hong Kong, etc.) route to yahoo-finance-global so
 * a US-side Yahoo Finance outage does not block Indian/European/APAC data
 * acquisition that runs on the same Yahoo Finance proxy path.
 */
export function stockCircuitKeyForTicker(
  ticker: string | null | undefined,
): 'yahoo-finance-us' | 'yahoo-finance-global' {
  if (!ticker) return 'yahoo-finance-us';
  // Match any recognized international exchange suffix
  if (/\.(NS|BO|L|SI|AX|HK|TO|PA|DE|MC|MI|AS|SW|ST|OL|CO|HE|LS|WA|SA|MX|BA|KS|TW|T)$/i.test(ticker)) {
    return 'yahoo-finance-global';
  }
  return 'yahoo-finance-us';
}
export type CircuitState   = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitStatus {
  state:               CircuitState;
  consecutiveFailures: number;
  openedAt:            number | null;   // unix ms, null if not open
  lastFailureAt:       number | null;
  lastSuccessAt:       number | null;
  probeAllowedAt:      number | null;   // unix ms when HALF_OPEN probe was granted
}

export interface CircuitCallResult<T> {
  data:                T | null;
  fromCircuitBreaker:  boolean;  // true = returned from cache, not live
  cachedAt:            number | null;  // unix ms of last successful fetch
  state:               CircuitState;
  // WS12 — age disclosure for stale-cache returns. When
  // fromCircuitBreaker=true, callers MUST surface dataAgeSeconds in the
  // UI (badge / freshness panel) and the audit pipeline MUST multiply
  // the contributing layer's confidence by freshness_decay(age) so a
  // 7-day-stale Alpha Vantage cache cannot win against a 5-minute-fresh
  // Yahoo signal. Set to null when fromCircuitBreaker=false.
  dataAgeSeconds:      number | null;
  // WS12 — the failure reason that caused the breaker to serve cache.
  // Useful for the SLO dashboard: a sustained `circuit_open` reason for
  // alphavantage means we're paying Alpha Vantage but burning quota
  // through retries — switch to backup provider.
  servedReason:        'fresh' | 'cached_open' | 'cached_failure' | null;
}

// ── Configuration ─────────────────────────────────────────────────────────────

const FAILURE_THRESHOLD = 3;          // consecutive failures before OPEN
const OPEN_DURATION_MS  = 5 * 60_000; // 5 minutes
const PROBE_TTL_MS      = 30_000;     // HALF_OPEN probe lock expiry

const LS_KEY  = (api: CircuitApiName) => `hp_circuit_${api}`;
const CACHE_KEY = (api: CircuitApiName) => `hp_circuit_cache_${api}`;
const PROBE_KEY = (api: CircuitApiName) => `hp_circuit_probe_${api}`;

// ── localStorage state helpers ─────────────────────────────────────────────

function readStatus(api: CircuitApiName): CircuitStatus {
  const defaults: CircuitStatus = {
    state: 'CLOSED',
    consecutiveFailures: 0,
    openedAt:     null,
    lastFailureAt: null,
    lastSuccessAt: null,
    probeAllowedAt: null,
  };
  try {
    const raw = localStorage.getItem(LS_KEY(api));
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function writeStatus(api: CircuitApiName, status: CircuitStatus): void {
  try { localStorage.setItem(LS_KEY(api), JSON.stringify(status)); }
  catch { /* localStorage unavailable — state is in-memory for this call */ }
}

function readCache<T>(api: CircuitApiName): { data: T; cachedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(api));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache<T>(api: CircuitApiName, data: T): void {
  try {
    localStorage.setItem(CACHE_KEY(api), JSON.stringify({ data, cachedAt: Date.now() }));
  } catch { /* ignore */ }
}

// ── Probe lock (prevents concurrent HALF_OPEN probes) ─────────────────────

function claimProbe(api: CircuitApiName): boolean {
  try {
    const raw = localStorage.getItem(PROBE_KEY(api));
    if (raw) {
      const { claimedAt } = JSON.parse(raw);
      if (Date.now() - claimedAt < PROBE_TTL_MS) return false; // probe already in flight
    }
    localStorage.setItem(PROBE_KEY(api), JSON.stringify({ claimedAt: Date.now() }));
    return true;
  } catch { return true; /* fail-open for probe lock */ }
}

function releaseProbe(api: CircuitApiName): void {
  try { localStorage.removeItem(PROBE_KEY(api)); } catch { /* ignore */ }
}

// ── Supabase sync (async, fire-and-forget) ─────────────────────────────────

function syncToSupabase(api: CircuitApiName, status: CircuitStatus): void {
  if (!supabase) return;
  // Fire-and-forget: sync failures must NEVER block the caller
  supabase
    .from('api_circuit_status')
    .upsert(
      {
        api_name:             api,
        state:                status.state,
        consecutive_failures: status.consecutiveFailures,
        last_failure_at:      status.lastFailureAt ? new Date(status.lastFailureAt).toISOString() : null,
        last_success_at:      status.lastSuccessAt ? new Date(status.lastSuccessAt).toISOString() : null,
        opened_at:            status.openedAt ? new Date(status.openedAt).toISOString() : null,
        probe_allowed_at:     status.probeAllowedAt ? new Date(status.probeAllowedAt).toISOString() : null,
      },
      { onConflict: 'api_name' },
    )
    .then(() => {}, () => {}); // ignore sync failures — second arg is the rejection handler
}

/**
 * On page load: fetch circuit state from Supabase and merge with localStorage.
 * Takes the more pessimistic state (OPEN > HALF_OPEN > CLOSED).
 * Call this once at app startup — not on every API call.
 */
export async function syncCircuitStateFromSupabase(): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from('api_circuit_status')
      .select('api_name, state, consecutive_failures, last_failure_at, last_success_at, opened_at, probe_allowed_at')
      .in('api_name', ALL_CIRCUIT_APIS);

    if (!data) return;

    const SEVERITY: Record<CircuitState, number> = { OPEN: 2, HALF_OPEN: 1, CLOSED: 0 };

    for (const row of data) {
      const api = row.api_name as CircuitApiName;
      const local = readStatus(api);
      const remoteState = row.state as CircuitState;

      // Merge: take the more pessimistic (higher severity) state
      const merged: CircuitStatus = {
        state: SEVERITY[remoteState] > SEVERITY[local.state] ? remoteState : local.state,
        consecutiveFailures: Math.max(local.consecutiveFailures, row.consecutive_failures ?? 0),
        openedAt:      row.opened_at ? new Date(row.opened_at).getTime() : local.openedAt,
        lastFailureAt: row.last_failure_at ? new Date(row.last_failure_at).getTime() : local.lastFailureAt,
        lastSuccessAt: row.last_success_at ? new Date(row.last_success_at).getTime() : local.lastSuccessAt,
        probeAllowedAt: row.probe_allowed_at ? new Date(row.probe_allowed_at).getTime() : local.probeAllowedAt,
      };

      writeStatus(api, merged);
    }
  } catch { /* non-fatal — local state is sufficient */ }
}

// ── Core state machine ─────────────────────────────────────────────────────

/**
 * Compute the effective state accounting for the OPEN→HALF_OPEN timeout.
 * The persisted state may be OPEN but if 5 minutes have elapsed it is
 * effectively HALF_OPEN — update the persisted state lazily here.
 */
function effectiveStatus(api: CircuitApiName): CircuitStatus {
  const s = readStatus(api);
  if (s.state === 'OPEN' && s.openedAt !== null) {
    if (Date.now() - s.openedAt >= OPEN_DURATION_MS) {
      // Timeout expired — transition to HALF_OPEN
      const updated: CircuitStatus = { ...s, state: 'HALF_OPEN', probeAllowedAt: Date.now() };
      writeStatus(api, updated);
      syncToSupabase(api, updated);
      return updated;
    }
  }
  return s;
}

/**
 * Returns true if a live API call is allowed.
 *   CLOSED    → always allowed
 *   OPEN      → never allowed (use cached data)
 *   HALF_OPEN → allowed only if this caller wins the probe lock
 */
export function isCallAllowed(api: CircuitApiName): boolean {
  const s = effectiveStatus(api);
  if (s.state === 'CLOSED') return true;
  if (s.state === 'OPEN')   return false;
  // HALF_OPEN: try to claim the probe slot
  return claimProbe(api);
}

/**
 * Record a successful API call.
 * Transitions: HALF_OPEN → CLOSED, resets consecutive failure counter.
 * Also caches the successful response for use when circuit is OPEN.
 */
export function recordSuccess<T>(api: CircuitApiName, responseData?: T): void {
  const s = effectiveStatus(api);
  releaseProbe(api);
  const updated: CircuitStatus = {
    ...s,
    state: 'CLOSED',
    consecutiveFailures: 0,
    lastSuccessAt: Date.now(),
    openedAt: null,
    probeAllowedAt: null,
  };
  writeStatus(api, updated);
  syncToSupabase(api, updated);
  if (responseData !== undefined) writeCache(api, responseData);
}

/**
 * Record a failed API call.
 * Transitions: after FAILURE_THRESHOLD consecutive failures, CLOSED → OPEN.
 *              HALF_OPEN → OPEN (probe failed, restart timer).
 */
export function recordFailure(api: CircuitApiName, error?: string): void {
  const s = effectiveStatus(api);
  releaseProbe(api);
  const failures = s.consecutiveFailures + 1;
  const shouldOpen = failures >= FAILURE_THRESHOLD || s.state === 'HALF_OPEN';

  const updated: CircuitStatus = {
    ...s,
    consecutiveFailures: failures,
    lastFailureAt: Date.now(),
    state:    shouldOpen ? 'OPEN' : 'CLOSED',
    openedAt: shouldOpen ? Date.now() : s.openedAt,
    probeAllowedAt: null,
  };

  writeStatus(api, updated);
  syncToSupabase(api, updated);

  if (shouldOpen) {
    console.warn(
      `[CircuitBreaker] ${api} circuit OPENED after ${failures} consecutive failure(s).` +
      (error ? ` Last error: ${error}` : '') +
      ` Will retry probe in ${OPEN_DURATION_MS / 60_000} min.`,
    );
  }
}

/**
 * Return cached data from the last successful call.
 * Includes the cachedAt timestamp so callers can display "Cached N hours ago."
 */
export function getCachedResponse<T>(api: CircuitApiName): { data: T; cachedAt: number } | null {
  return readCache<T>(api);
}

/**
 * Full status snapshot — for UI display and debugging.
 */
export interface CircuitSnapshot {
  api:                 CircuitApiName;
  state:               CircuitState;
  consecutiveFailures: number;
  openedAt:            number | null;
  lastFailureAt:       number | null;
  lastSuccessAt:       number | null;
  /** How many ms until the OPEN circuit permits a probe (0 if already HALF_OPEN or CLOSED) */
  msUntilProbe:        number;
  /** Whether a cached response is available for fallback */
  hasCachedData:       boolean;
  /** Age of cached data in ms (null if no cache) */
  cachedDataAgeMs:     number | null;
  /** Human-readable age label e.g. "2 hours ago" */
  cachedAgeLabel:      string | null;
}

function ageLabel(ms: number): string {
  const mins  = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  >= 1) return `${days} day${days  !== 1 ? 's' : ''} ago`;
  if (hours >= 1) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (mins  >= 1) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  return 'just now';
}

export function getCircuitSnapshot(api: CircuitApiName): CircuitSnapshot {
  const s     = effectiveStatus(api);
  const cache = readCache<unknown>(api);
  const now   = Date.now();

  const msUntilProbe =
    s.state === 'OPEN' && s.openedAt !== null
      ? Math.max(0, OPEN_DURATION_MS - (now - s.openedAt))
      : 0;

  const cachedDataAgeMs = cache ? now - cache.cachedAt : null;

  return {
    api,
    state:               s.state,
    consecutiveFailures: s.consecutiveFailures,
    openedAt:            s.openedAt,
    lastFailureAt:       s.lastFailureAt,
    lastSuccessAt:       s.lastSuccessAt,
    msUntilProbe,
    hasCachedData:       cache !== null,
    cachedDataAgeMs,
    cachedAgeLabel:      cachedDataAgeMs !== null ? ageLabel(cachedDataAgeMs) : null,
  };
}

/**
 * Convenience wrapper: execute fn() with circuit breaker protection.
 *
 * Usage:
 *   const { data, fromCircuitBreaker, cachedAt } = await withCircuitBreaker(
 *     'alphavantage',
 *     () => fetchAlphaVantageOverview(ticker, key),
 *   );
 *   if (fromCircuitBreaker) showCachedLabel(cachedAt);
 */
export async function withCircuitBreaker<T>(
  api: CircuitApiName,
  fn: () => Promise<T | null>,
): Promise<CircuitCallResult<T>> {
  const snap = getCircuitSnapshot(api);

  if (!isCallAllowed(api)) {
    // Circuit is OPEN — return cached data if available
    const cache = getCachedResponse<T>(api);
    const cachedAt = cache?.cachedAt ?? null;
    return {
      data:               cache?.data ?? null,
      fromCircuitBreaker: true,
      cachedAt,
      state:              snap.state,
      // WS12 — quantify the staleness so downstream layers can decay
      // confidence proportionally and the UI can show an age badge.
      dataAgeSeconds:     cachedAt ? Math.floor((Date.now() - cachedAt) / 1000) : null,
      servedReason:       'cached_open',
    };
  }

  try {
    const result = await fn();
    if (result !== null) recordSuccess(api, result);
    // null result (e.g. no data for this ticker) is not a failure
    return {
      data: result,
      fromCircuitBreaker: false,
      cachedAt: null,
      state: 'CLOSED',
      dataAgeSeconds: null,
      servedReason: 'fresh',
    };
  } catch (err: any) {
    recordFailure(api, err?.message ?? String(err));
    // On failure: return cached data as fallback
    const cache = getCachedResponse<T>(api);
    const cachedAt = cache?.cachedAt ?? null;
    return {
      data:               cache?.data ?? null,
      fromCircuitBreaker: true,
      cachedAt,
      state:              getCircuitSnapshot(api).state,
      // WS12 — same disclosure on the failure-fallback path. Callers
      // distinguish 'cached_open' (we never tried this call — breaker
      // already open) from 'cached_failure' (we tried, it failed, this
      // is the cached fallback). Different cohorts for SLO views.
      dataAgeSeconds:     cachedAt ? Math.floor((Date.now() - cachedAt) / 1000) : null,
      servedReason:       'cached_failure',
    };
  }
}

export interface ApiQuotaStatus {
  state: CircuitState;
  consecutiveFailures: number;
  msUntilProbe: number;
  hasCachedData: boolean;
  cachedAgeLabel: string | null;
}

/**
 * Returns the current circuit state for all tracked APIs.
 * Used by LayoffCalculator to show a banner when any circuit is OPEN.
 */
export function getApiQuotaStatus(): Record<CircuitApiName, ApiQuotaStatus> {
  const apis: CircuitApiName[] = ALL_CIRCUIT_APIS;
  const result = {} as Record<CircuitApiName, ApiQuotaStatus>;
  for (const api of apis) {
    const snap = getCircuitSnapshot(api);
    result[api] = {
      state:               snap.state,
      consecutiveFailures: snap.consecutiveFailures,
      msUntilProbe:        snap.msUntilProbe,
      hasCachedData:       snap.hasCachedData,
      cachedAgeLabel:      snap.cachedAgeLabel,
    };
  }
  return result;
}

/**
 * Reset a circuit to CLOSED (admin use / testing only).
 */
export function resetCircuit(api: CircuitApiName): void {
  const reset: CircuitStatus = {
    state: 'CLOSED',
    consecutiveFailures: 0,
    openedAt: null,
    lastFailureAt: null,
    lastSuccessAt: null,
    probeAllowedAt: null,
  };
  writeStatus(api, reset);
  releaseProbe(api);
  syncToSupabase(api, reset);
}
