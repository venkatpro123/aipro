// yahooFinanceConnector.ts
// Browser-side Yahoo Finance connector — routes through the proxy-live-signals
// Edge Function which calls Yahoo Finance server-side (avoiding CORS).
//
// Yahoo Finance endpoints used (no API key, no rate limits):
//   /v8/finance/chart/{TICKER}?interval=1d&range=90d    — price history
//   /v10/finance/quoteSummary/{TICKER}?modules=...      — financials, profile
//
// This is the PRIMARY stock data source. Alpha Vantage (25/day) is a fallback
// only for when Yahoo Finance returns empty data (rare, usually private tickers).
//
// Direct browser→Yahoo Finance fetch is blocked by CORS. The EF proxy handles
// the server-side call and returns the parsed result.

import { supabase } from '../../utils/supabase';
// WS11 — request-id propagation via invokeEdgeFunction wrapper.
import { invokeEdgeFunction } from '../../infrastructure/requestId';

export interface YahooStockData {
  ticker:            string;
  price90DayChange:  number | null;
  revenueGrowthYoY:  number | null;
  marketCap:         number | null;
  peRatio:           number | null;
  /** Full-time employee count from Yahoo Finance assetProfile */
  employeeCount:     number | null;
  source:            'yahoo-finance';
  fetchedAt:         string;
}

// In-session cache keyed by ticker — Yahoo Finance data is valid for 10 min
const _cache = new Map<string, { data: YahooStockData; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * fetchYahooStockViaProxy — fetches live Yahoo Finance data through the
 * proxy-live-signals Edge Function (no CORS, no API key, no rate limit).
 *
 * Returns null if the EF is unavailable or Yahoo Finance returns no data
 * (e.g. private companies, delisted tickers).
 */
export async function fetchYahooStockViaProxy(
  ticker: string,
  companyName?: string,
): Promise<YahooStockData | null> {
  if (!ticker) return null;

  const cacheKey = ticker.toUpperCase();
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const { data: proxyResult, error } = await invokeEdgeFunction<any>('proxy-live-signals', {
      body: { action: 'stock', ticker, companyName: companyName ?? ticker },
    });

    if (error) throw new Error(`EF error: ${error.message}`);
    const sd = proxyResult?.stockData;
    if (!sd || sd.price90DayChange === undefined) return null;

    const result: YahooStockData = {
      ticker,
      price90DayChange: sd.price90DayChange ?? null,
      revenueGrowthYoY: sd.revenueGrowthYoY ?? null,
      marketCap:        sd.marketCap ?? null,
      peRatio:          sd.peRatio   ?? null,
      employeeCount:    typeof sd.employeeCount === 'number' && sd.employeeCount > 0
                          ? sd.employeeCount : null,
      source:           'yahoo-finance',
      fetchedAt:        new Date().toISOString(),
    };

    _cache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
  } catch (e: any) {
    console.warn(`[YahooFinance] fetchYahooStockViaProxy failed for ${ticker}:`, e.message);
    return null;
  }
}

/** Clear the in-session cache (e.g. when a circuit breaker reset occurs). */
export function clearYahooFinanceCache(): void {
  _cache.clear();
}
