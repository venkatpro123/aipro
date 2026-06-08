// refresh-nse-bse-stock/index.ts — PHASE 1 (scheduled)
//
// Keeps live stock prices fresh for India NSE/BSE-listed companies in
// verified_company_intelligence. Scheduled by pg_cron every 3 hours during
// NSE market hours (see migration 20260531000001_nse_bse_stock_refresh_cron.sql).
//
// Behaviour (mirrors scripts/refresh-nse-bse-stock.mjs, ported to Deno):
//   • Ticker normalization at FETCH TIME only — never mutates the ticker column.
//     Appends .NS / .BO and applies a small wrong-root correction map.
//   • INR safety net — a genuine NSE/BSE listing quotes in INR. Any normalized
//     symbol that resolves to a non-INR security matched the WRONG company and
//     is rejected (no write), preventing garbage like bare-ITC→$18.15 mismatches.
//   • stock_price + stock_90d_change refreshed every run (live data).
//   • market_cap_usd filled ONLY where currently NULL/0 — hand-curated 2026
//     market caps are preserved.
//   • Bounded concurrency keeps the run inside the edge-function time budget.
//
// Triggering:
//   * Scheduled by the cron migration (45 3,6,9 * * 1-5 UTC ≈ 09:15/12:15/15:15 IST).
//   * Manually: POST { onlyMissing?: boolean, limit?: number, dryRun?: boolean }.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun, corsHeaders } from '../_shared/otel.ts';

// Spot FX (USD per 1 unit). INR is the only rate that matters for NSE/BSE.
const FX_TO_USD: Record<string, number> = { USD: 1.0, INR: 1 / 84.5, GBP: 1.27, EUR: 1.09, SGD: 0.745 };
function toUSD(amount: number | null, currency: string | null): number | null {
  if (amount == null) return null;
  return amount * (FX_TO_USD[currency ?? 'USD'] ?? 1);
}

// Stored ticker → real NSE/BSE root symbol. Only cases where the stored ticker
// is NOT the exchange symbol; the INR check still guards each one.
const SYMBOL_CORRECTIONS: Record<string, string> = {
  RIL: 'RELIANCE', BAJAJAUT: 'BAJAJ-AUTO', MM: 'M&M',
  ZOMATO: 'ETERNAL', ICICILOMBARD: 'ICICIGI', COFGF: 'COFORGE',
  BRLSF: 'BSOFT', MPHLF: 'MPHASIS', TECHNO: 'TECHNOE',
  NUCLEUSFIN: 'NUCLEUS', UNICOMMERCE: 'UNIECOM', ZEN: 'ZENTEC',
  TAKESOL: 'TAKE', E2ENETS: 'E2E',
};

function toYahooSymbol(ticker: string, exchange: string | null): string | null {
  if (!ticker) return null;
  const t = ticker.trim();
  if (t.includes('.')) return t;                 // already suffixed (TCS.NS, PEL.NS…)
  const root = SYMBOL_CORRECTIONS[t] ?? t;
  if (exchange === 'NSE') return root + '.NS';
  if (exchange === 'BSE') return root + '.BO';
  return root;
}

interface Quote { currency: string | null; priceRaw: number | null; priceUSD: number | null; marketCapUSD: number | null; change90d: number | null; }

async function fetchChart(symbol: string): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=90d`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!r.ok) return null;
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const currency = meta.currency ?? null;
    const priceRaw = meta.regularMarketPrice ?? null;
    const mcRaw = meta.marketCap ?? null;
    const closes = (j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((v: number | null) => v != null);
    const change90d = closes.length >= 2
      ? +(((closes[closes.length - 1] - closes[0]) / closes[0]) * 100).toFixed(2)
      : null;
    return {
      currency,
      priceRaw,
      priceUSD: priceRaw != null ? +(toUSD(priceRaw, currency) as number).toFixed(4) : null,
      marketCapUSD: mcRaw != null ? Math.round(toUSD(mcRaw, currency) as number) : null,
      change90d,
    };
  } catch { return null; }
}

interface Company { canonical_name: string; ticker: string; exchange: string | null; market_cap_usd: number | null; data_quality_tier: string | null; }

// Bounded-concurrency map — keeps the run inside the EF time budget while
// avoiding hammering Yahoo from a single IP.
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function processCompany(
  supabase: SupabaseClient,
  co: Company,
  dryRun: boolean,
): Promise<'updated' | 'rejected' | 'nodata'> {
  const symbol = toYahooSymbol(co.ticker, co.exchange);
  if (!symbol) return 'nodata';
  const q = await fetchChart(symbol);
  if (!q || q.priceRaw == null) return 'nodata';
  if (q.currency !== 'INR') return 'rejected';        // wrong-security match → skip

  const updates: Record<string, unknown> = {
    stock_price: q.priceUSD,
    stock_90d_change: q.change90d,
    financials_source: 'yahoo_finance_scrape',
    financials_verified_at: new Date().toISOString(),
    financials_confidence: 0.85,
  };
  const mktCapMissing = co.market_cap_usd == null || Number(co.market_cap_usd) === 0;
  if (mktCapMissing && q.marketCapUSD != null) updates.market_cap_usd = q.marketCapUSD;
  if (co.data_quality_tier === 'heuristic') updates.data_quality_tier = 'seed';

  if (dryRun) return 'updated';

  const { error } = await supabase
    .from('verified_company_intelligence')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('canonical_name', co.canonical_name);
  return error ? 'nodata' : 'updated';
}

Deno.serve((req) =>
  withRun('refresh-nse-bse-stock', req, async (run) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    let onlyMissing = false;
    let limit: number | null = null;
    let dryRun = false;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (typeof body?.onlyMissing === 'boolean') onlyMissing = body.onlyMissing;
        if (typeof body?.limit === 'number') limit = body.limit;
        if (typeof body?.dryRun === 'boolean') dryRun = body.dryRun;
      } catch { /* body optional */ }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    let query = supabase
      .from('verified_company_intelligence')
      .select('canonical_name,ticker,exchange,market_cap_usd,data_quality_tier')
      .eq('country_code', 'IN')
      .eq('is_public', true)
      .not('ticker', 'is', null)
      .in('exchange', ['NSE', 'BSE'])
      .order('market_cap_usd', { ascending: false, nullsFirst: false });
    if (onlyMissing) query = query.is('stock_price', null);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw new Error(`vci fetch failed: ${error.message}`);
    const companies = (data ?? []) as Company[];
    run.setItemsIn(companies.length);

    const outcomes = await pool(companies, 6, (co) => processCompany(supabase, co, dryRun));

    const updated = outcomes.filter((o) => o === 'updated').length;
    const rejected = outcomes.filter((o) => o === 'rejected').length;
    const nodata = outcomes.filter((o) => o === 'nodata').length;
    run.setItemsOut(updated);
    run.addMeta('updated', updated).addMeta('rejected_non_inr', rejected).addMeta('no_data', nodata).addMeta('dry_run', dryRun);

    return new Response(
      JSON.stringify({ ok: true, scanned: companies.length, updated, rejected_non_inr: rejected, no_data: nodata, dry_run: dryRun }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }),
);
