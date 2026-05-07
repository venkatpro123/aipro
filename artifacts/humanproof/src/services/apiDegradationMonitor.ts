// apiDegradationMonitor.ts
// Rate-limit and API failure tracking — per-session, per-service.
//
// Problem it solves:
//   When Alpha Vantage (25 req/day), Serper, or NewsAPI (100/day) hit their
//   daily limits, the system silently falls back to heuristics. Without this
//   module, the UI would continue showing "12 live signals" — actively lying.
//
// What this module does:
//   1. Records API failure events by SPECIFIC service (alphavantage, newsapi, serper)
//   2. Tracks per-session request counts per API to warn before quota is exhausted
//   3. Exposes a React-readable degradation signal for the banner component
//   4. Persists to sessionStorage (cleared on page reload — rate limits are daily)
//
// Degradation window:
//   rate_limited events: 24 hours (Alpha Vantage quota resets daily at midnight UTC)
//   transient errors (timeout, network): 10 minutes
//   auth_error: 24 hours

// 'yahoo_finance' tracks calls made via proxy-live-signals (Yahoo Finance, no key required).
// 'alphavantage' is kept for the localhost direct-key fallback path only.
export type ApiService = 'alphavantage' | 'yahoo_finance' | 'newsapi' | 'serper' | 'openrouter' | 'supabase_osint';

export interface DegradationEvent {
  service: ApiService;
  reason: 'rate_limited' | 'timeout' | 'auth_error' | 'network_error';
  timestamp: number;
  detail?: string;
}

// Per-API daily quota thresholds (free tier)
// When session_request_count / DAILY_QUOTA >= WARN_FRACTION, show proactive warning.
export const DAILY_QUOTAS: Partial<Record<ApiService, number>> = {
  alphavantage:  25,  // Alpha Vantage free tier: 25 requests/day (localhost fallback only)
  yahoo_finance: 50,  // Yahoo Finance via proxy — per-user safety rail (no hard cap, but be polite)
  newsapi:       100, // NewsAPI free tier: 100 requests/day
  serper:        100, // Serper free tier varies; 100 is conservative
};
const WARN_FRACTION = 0.80; // warn at 80% of quota (e.g. 20/25 for AV)

const SESSION_KEY    = 'hp_api_degradation';
const COUNTER_KEY    = 'hp_api_request_counts';
const MAX_EVENTS     = 50;
const TRANSIENT_WINDOW_MS  = 10  * 60 * 1000;  // 10 minutes for timeouts/network
const RATE_LIMIT_WINDOW_MS = 24  * 60 * 60 * 1000; // 24 hours for quota events

// ── Record a failure ──────────────────────────────────────────────────────────

export function recordApiDegradation(
  service: ApiService,
  reason: DegradationEvent['reason'],
  detail?: string,
): void {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const events: DegradationEvent[] = raw ? JSON.parse(raw) : [];
    events.push({ service, reason, timestamp: Date.now(), detail });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch { /* storage unavailable */ }
}

// ── Per-session request counter ───────────────────────────────────────────────

/**
 * Increment the session request counter for a service.
 * Call once per outbound API request, before the fetch.
 */
export function incrementRequestCount(service: ApiService): void {
  try {
    const raw = sessionStorage.getItem(COUNTER_KEY);
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    counts[service] = (counts[service] ?? 0) + 1;
    sessionStorage.setItem(COUNTER_KEY, JSON.stringify(counts));
  } catch { /* ignore */ }
}

/**
 * Returns the number of times a service has been called in this browser session.
 */
export function getSessionRequestCount(service: ApiService): number {
  try {
    const raw = sessionStorage.getItem(COUNTER_KEY);
    if (!raw) return 0;
    return (JSON.parse(raw)[service] ?? 0) as number;
  } catch { return 0; }
}

/**
 * Returns true when the session request count has reached or exceeded
 * WARN_FRACTION × daily quota (e.g. 20/25 for Alpha Vantage).
 * Used to show a proactive "approaching quota" warning BEFORE the 429.
 */
export function isApproachingQuota(service: ApiService): boolean {
  const quota = DAILY_QUOTAS[service];
  if (!quota) return false;
  return getSessionRequestCount(service) >= Math.floor(quota * WARN_FRACTION);
}

/**
 * Returns true when the session request count has met or exceeded the daily quota.
 * Use this to skip live API calls and return null immediately rather than burning
 * the last quota slots on a request that will 429.
 */
export function isQuotaExhausted(service: ApiService): boolean {
  const quota = DAILY_QUOTAS[service];
  if (!quota) return false;
  return getSessionRequestCount(service) >= quota;
}

// ── Read current degradation state ───────────────────────────────────────────

export interface DegradationState {
  isDegraded: boolean;
  affectedServices: ApiService[];
  rateLimited: ApiService[];
  lastEventAge: number | null;
  summary: string | null;
  /** Details per service: which are rate-limited, which are transient errors */
  perService: Partial<Record<ApiService, { rateLimited: boolean; transient: boolean }>>;
  /** Proactive quota warnings: services at ≥80% of daily limit */
  approachingQuota: ApiService[];
  /** Sessions request counts */
  sessionCounts: Partial<Record<ApiService, number>>;
}

const serviceLabels: Record<ApiService, string> = {
  alphavantage:   'Alpha Vantage (stock data, localhost fallback)',
  yahoo_finance:  'Stock proxy (Yahoo Finance via Edge Function)',
  newsapi:        'NewsAPI (layoff news, 100/day free)',
  serper:         'Serper (hiring data)',
  openrouter:     'Multi-model LLM',
  supabase_osint: 'Company Intelligence DB',
};

export function getDegradationState(): DegradationState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const events: DegradationEvent[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();

    // Apply appropriate window per error type
    const recent = events.filter(e => {
      const window = (e.reason === 'rate_limited' || e.reason === 'auth_error')
        ? RATE_LIMIT_WINDOW_MS
        : TRANSIENT_WINDOW_MS;
      return now - e.timestamp < window;
    });

    // Proactive quota warnings
    const approachingQuota = (Object.keys(DAILY_QUOTAS) as ApiService[])
      .filter(s => isApproachingQuota(s) && !isQuotaExhausted(s));
    const exhausted = (Object.keys(DAILY_QUOTAS) as ApiService[])
      .filter(s => isQuotaExhausted(s));

    // Session counts
    const countsRaw = sessionStorage.getItem(COUNTER_KEY);
    const sessionCounts: Partial<Record<ApiService, number>> = countsRaw ? JSON.parse(countsRaw) : {};

    if (recent.length === 0 && approachingQuota.length === 0 && exhausted.length === 0) {
      return { isDegraded: false, affectedServices: [], rateLimited: [], lastEventAge: null, summary: null, perService: {}, approachingQuota, sessionCounts };
    }

    const affectedServices = [...new Set(recent.map(e => e.service))];
    const rateLimited = [...new Set([
      ...recent.filter(e => e.reason === 'rate_limited').map(e => e.service),
      ...exhausted,
    ])];
    const lastEventAge = recent.length > 0 ? now - Math.max(...recent.map(e => e.timestamp)) : null;

    const perService: DegradationState['perService'] = {};
    for (const svc of affectedServices) {
      const svcEvents = recent.filter(e => e.service === svc);
      perService[svc] = {
        rateLimited: svcEvents.some(e => e.reason === 'rate_limited'),
        transient:   svcEvents.some(e => e.reason === 'timeout' || e.reason === 'network_error'),
      };
    }

    // Build summary message
    const rateLimitedLabels = rateLimited.map(s => serviceLabels[s]);
    const approachingLabels = approachingQuota.map(s => {
      const count = getSessionRequestCount(s);
      const quota = DAILY_QUOTAS[s]!;
      return `${serviceLabels[s].split(' ')[0]} (${count}/${quota})`;
    });

    let summary: string | null = null;
    if (rateLimited.length > 0) {
      summary = `Daily limit hit: ${rateLimitedLabels.join(', ')}. Score uses heuristic fallback — no live data for these sources until quota resets at midnight UTC.`;
    } else if (affectedServices.length > 0) {
      summary = `Live data errors: ${affectedServices.map(s => serviceLabels[s]).join(', ')}. Retrying will use cached data.`;
    }
    if (approachingLabels.length > 0) {
      const warn = `Approaching quota: ${approachingLabels.join(', ')}.`;
      summary = summary ? `${summary} ${warn}` : warn;
    }

    return { isDegraded: true, affectedServices, rateLimited, lastEventAge, summary, perService, approachingQuota, sessionCounts };
  } catch {
    return { isDegraded: false, affectedServices: [], rateLimited: [], lastEventAge: null, summary: null, perService: {}, approachingQuota: [], sessionCounts: {} };
  }
}

export function clearDegradationHistory(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  const msg = String(error?.message ?? error ?? '').toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('quota') || msg.includes('rate_limited');
}
