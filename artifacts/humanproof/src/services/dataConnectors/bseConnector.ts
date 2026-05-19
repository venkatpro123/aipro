// bseConnector.ts
// BSE India API connector — free, official BSE data for listed Indian companies.
// Endpoint: https://api.bseindia.com/BseIndiaAPI/api/
// No API key required for basic company financials (public endpoint).

export interface BSECompanyData {
  scripCode: string;
  companyName: string;
  marketCap: number | null;       // in crores INR
  revenueYoY: number | null;      // % change year-over-year
  stock52wHigh: number | null;
  stock52wLow: number | null;
  /**
   * 90-day stock change in % — BSE's quote endpoint does not expose a true
   * 90-day return, so this is null unless we have an actual price series.
   * The previous implementation extrapolated from 52-week range position and
   * called the result `stock90DayChange`, which mislabeled a different metric.
   */
  stock90DayChange: number | null;
  /** Position vs upper-quartile of 52-week range (-1..1). Different signal — kept
   *  separately so downstream code can use it without it being mistaken for a
   *  90-day return. */
  stock52wRangePosition: number | null;
  peRatio: number | null;
  isPublic: true;
  source: 'BSE India';
  fetchedAt: string;
}

import { readCache, writeCache } from '../apiResponseCache';

const BSE_BASE = 'https://api.bseindia.com/BseIndiaAPI/api';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min in-process; Supabase layer holds 4h TTL

const cache = new Map<string, { data: BSECompanyData; ts: number }>(); // in-process hot-path only

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

export async function fetchBSECompanyData(
  scripCode: string,
): Promise<BSECompanyData | null> {
  const inProcess = cache.get(scripCode);
  if (inProcess && Date.now() - inProcess.ts < CACHE_TTL_MS) return inProcess.data;

  const shared = await readCache<BSECompanyData>('bse', `scrip|${scripCode}`);
  if (shared) {
    cache.set(scripCode, { data: shared.payload, ts: Date.now() });
    return { ...shared.payload, _cacheAgeLabel: shared.cacheAgeLabel, _cachedAt: shared.cachedAt } as BSECompanyData;
  }

  try {
    // BSE quote endpoint (public, no auth)
    const quoteRes = await fetchWithTimeout(
      `${BSE_BASE}/ComHeader/w?quotetype=EQ&scripcode=${scripCode}`,
    );
    if (!quoteRes.ok) return null;
    const quote = await quoteRes.json();

    const data: BSECompanyData = {
      scripCode,
      companyName: quote.CompanyName ?? '',
      marketCap: quote.MKTCAP ? parseFloat(quote.MKTCAP) : null,
      revenueYoY: null, // requires separate earnings call
      stock52wHigh: quote['52WeekHigh'] ? parseFloat(quote['52WeekHigh']) : null,
      stock52wLow: quote['52WeekLow'] ? parseFloat(quote['52WeekLow']) : null,
      // True 90-day change is not in this BSE response — leave null so the
      // scoring engine can decide whether to back-fill from another source.
      stock90DayChange: null,
      stock52wRangePosition: derive52wRangePosition(
        quote.CurrRate,
        quote['52WeekLow'],
        quote['52WeekHigh'],
      ),
      peRatio: quote.PE ? parseFloat(quote.PE) : null,
      isPublic: true,
      source: 'BSE India',
      fetchedAt: new Date().toISOString(),
    };

    cache.set(scripCode, { data, ts: Date.now() });
    writeCache('bse', `scrip|${scripCode}`, data);
    return data;
  } catch {
    return null;
  }
}

// Lookup BSE scrip code by company name (approximate match via BSE search)
export async function findBSEScripCode(companyName: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `${BSE_BASE}/InstantSearch/w?val=${encodeURIComponent(companyName)}`,
    );
    if (!res.ok) return null;
    const results = await res.json();
    const match = results?.Table?.[0];
    return match?.SCRIP_CD ? String(match.SCRIP_CD) : null;
  } catch {
    return null;
  }
}

// Where the current price sits inside the 52-week range, normalised to [-1, +1]
// (-1 = at 52w low, 0 = midpoint, +1 = at 52w high). This is *not* a 90-day
// return — exposing it under that name was misleading callers.
function derive52wRangePosition(
  current: string | undefined,
  low52w: string | undefined,
  high52w: string | undefined,
): number | null {
  if (!current || !low52w || !high52w) return null;
  const cur = parseFloat(current);
  const lo = parseFloat(low52w);
  const hi = parseFloat(high52w);
  if (!Number.isFinite(cur) || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (hi <= lo) return null;
  const mid = (hi + lo) / 2;
  const halfRange = (hi - lo) / 2;
  return Math.max(-1, Math.min(1, (cur - mid) / halfRange));
}
