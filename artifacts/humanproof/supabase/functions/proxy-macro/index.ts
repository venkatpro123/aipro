// proxy-macro/index.ts
// Supabase Edge Function — server-side FRED + BLS macro data fetcher.
//
// Called by blsMacroService.ts fetchLiveMacroSnapshot().
// Previously this EF was never deployed — blsMacroService always fell back to
// May 2026 hardcoded baselines. This deployment enables live macro signals.
//
// Response shape:
//   { joltsSnapshot: JOLTSSnapshot | null, fredSnapshot: FREDSnapshot | null }
//
// Caching: 6 hours server-side (FRED and BLS update monthly; 6h is safe)
//
// Env vars required:
//   FRED_API_KEY — obtain free key at https://fred.stlouisfed.org/docs/api/api_key.html
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
//
// Deploy: supabase functions deploy proxy-macro

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });

// v40 hardening: require Supabase JWT before serving macro data. The cache
// is shared across users so the EF can be cheap, but anonymous callers
// could still burn FRED_API_KEY quota on cold-cache runs and stuff our
// bls_macro_snapshots table with no audit trail.
async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401);
  }
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'Invalid or expired token' }, 401);
  } catch {
    return json({ error: 'Auth check failed' }, 401);
  }
  return null;
}

// ── In-memory 6-hour cache (survives within a single Deno isolate lifetime) ───
let cache: { value: MacroResult; expiresAt: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000;

interface MacroResult {
  joltsSnapshot: JOLTSSnapshot | null;
  fredSnapshot:  FREDSnapshot  | null;
  fetchedAt:     string;
  source:        'fred_api' | 'bls_api' | 'partial' | 'baseline';
}

interface JOLTSSnapshot {
  sector: string;
  quitsRate: number;
  layoffsRate: number;
  jobOpeningsRate: number;
  hiringRate: number;
  quitsTrend: 'rising' | 'falling' | 'stable';
  dataMonth: string;
}

interface FREDSnapshot {
  fedFundsRate: number;
  yieldCurveSpread: number;
  isInvertedCurve: boolean;
  nasdaqChange90d: number;
  dataDate: string;
}

// May 2026 calibrated baselines — used as fallback when APIs are unavailable
const BASELINE_FRED: FREDSnapshot = {
  fedFundsRate:      4.75,
  yieldCurveSpread:  -0.15,
  isInvertedCurve:   true,
  nasdaqChange90d:   3.2,
  dataDate:          '2026-05-01',
};

const BASELINE_JOLTS: JOLTSSnapshot = {
  sector:          'information_technology',
  quitsRate:       2.4,
  layoffsRate:     0.8,
  jobOpeningsRate: 4.1,
  hiringRate:      2.9,
  quitsTrend:      'stable',
  dataMonth:       '2026-04-01',
};

// ── FRED API helpers ──────────────────────────────────────────────────────────

async function fetchFREDSeries(series: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const obs = data?.observations?.[0]?.value;
    if (!obs || obs === '.') return null;
    return parseFloat(obs);
  } catch {
    return null;
  }
}

async function fetchFREDSnapshot(apiKey: string): Promise<FREDSnapshot | null> {
  const [fedFunds, t10y2y, nasdaq] = await Promise.all([
    fetchFREDSeries('FEDFUNDS',   apiKey),
    fetchFREDSeries('T10Y2Y',     apiKey),
    fetchFREDSeries('NASDAQCOM',  apiKey),
  ]);

  if (fedFunds === null && t10y2y === null && nasdaq === null) return null;

  // NASDAQ 90-day change: need two data points. Use single observation as proxy.
  // For a production deployment, use the FRED series/observations endpoint with
  // observation_start set to 90 days ago and compute delta client-side.
  const yieldSpread = t10y2y ?? BASELINE_FRED.yieldCurveSpread;
  return {
    fedFundsRate:     fedFunds    ?? BASELINE_FRED.fedFundsRate,
    yieldCurveSpread: yieldSpread,
    isInvertedCurve:  yieldSpread < 0,
    nasdaqChange90d:  BASELINE_FRED.nasdaqChange90d, // baseline until we have 2-point NASDAQ
    dataDate:         new Date().toISOString().slice(0, 10),
  };
}

// ── BLS JOLTS API helper ───────────────────────────────────────────────────────
// BLS Public Data API v2: https://www.bls.gov/developers/api_signature_v2.htm
// Series IDs for IT sector (NAICS 51):
//   JTS510000000000000QUR — Quits, Information sector
//   JTS510000000000000LDR — Layoffs & Discharges, Information sector
//   JTS510000000000000JOR — Job Openings, Information sector
//   JTS510000000000000HIR — Hires, Information sector

async function fetchJOLTSSnapshot(): Promise<JOLTSSnapshot | null> {
  try {
    const seriesIds = [
      'JTS510000000000000QUR',  // Quits rate, Information
      'JTS510000000000000LDR',  // Layoffs rate, Information
      'JTS510000000000000JOR',  // Job openings rate, Information
      'JTS510000000000000HIR',  // Hires rate, Information
    ];

    const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  AbortSignal.timeout(6_000),
      body: JSON.stringify({
        seriesid:  seriesIds,
        startyear: String(new Date().getFullYear() - 1),
        endyear:   String(new Date().getFullYear()),
      }),
    });

    if (!res.ok) return null;
    const body = await res.json();
    if (body.status !== 'REQUEST_SUCCEEDED') return null;

    const getValue = (seriesId: string): number | null => {
      const series = (body.Results?.series ?? []).find((s: any) => s.seriesID === seriesId);
      const latest = series?.data?.[0]?.value;
      return latest ? parseFloat(latest) : null;
    };

    const quits    = getValue(seriesIds[0]);
    const layoffs  = getValue(seriesIds[1]);
    const openings = getValue(seriesIds[2]);
    const hires    = getValue(seriesIds[3]);

    if (quits === null) return null;

    // Compute quits trend: compare to 3-month-prior entry
    const qSeries = (body.Results?.series ?? []).find((s: any) => s.seriesID === seriesIds[0]);
    const qData: Array<{ value: string }> = qSeries?.data ?? [];
    const prior3mo = qData[3] ? parseFloat(qData[3].value) : null;
    const quitsTrend: 'rising' | 'falling' | 'stable' = prior3mo === null ? 'stable'
      : quits > prior3mo * 1.05 ? 'rising'
      : quits < prior3mo * 0.95 ? 'falling'
      : 'stable';

    const dataMonth = qSeries?.data?.[0]
      ? `${qSeries.data[0].year}-${String(qSeries.data[0].period.replace('M', '')).padStart(2, '0')}-01`
      : new Date().toISOString().slice(0, 7) + '-01';

    return {
      sector:          'information_technology',
      quitsRate:       quits,
      layoffsRate:     layoffs  ?? BASELINE_JOLTS.layoffsRate,
      jobOpeningsRate: openings ?? BASELINE_JOLTS.jobOpeningsRate,
      hiringRate:      hires    ?? BASELINE_JOLTS.hiringRate,
      quitsTrend,
      dataMonth,
    };
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authFail = await requireAuth(req);
  if (authFail) return authFail;

  // Serve from in-memory cache if still fresh
  if (cache && Date.now() < cache.expiresAt) {
    return json(cache.value);
  }

  const fredApiKey = Deno.env.get('FRED_API_KEY');
  if (!fredApiKey) {
    return json({ error: 'FRED_API_KEY not configured', joltsSnapshot: null, fredSnapshot: null }, 503);
  }

  const [joltsSnapshot, fredSnapshot] = await Promise.all([
    fetchJOLTSSnapshot(),
    fetchFREDSnapshot(fredApiKey),
  ]);

  const result: MacroResult = {
    joltsSnapshot: joltsSnapshot ?? BASELINE_JOLTS,
    fredSnapshot:  fredSnapshot  ?? BASELINE_FRED,
    fetchedAt:     new Date().toISOString(),
    source: joltsSnapshot && fredSnapshot ? 'fred_api'
      : joltsSnapshot || fredSnapshot ? 'partial'
      : 'baseline',
  };

  cache = { value: result, expiresAt: Date.now() + CACHE_TTL };

  // Persist the live snapshot to bls_macro_snapshots for the DB pre-pass in auditDataPipeline.
  // Fire-and-forget — don't block the response on this write.
  if (joltsSnapshot) {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await supabase.from('bls_macro_snapshots').upsert({
        sector:            joltsSnapshot.sector,
        data_month:        joltsSnapshot.dataMonth,
        quits_rate:        joltsSnapshot.quitsRate,
        layoffs_rate:      joltsSnapshot.layoffsRate,
        job_openings_rate: joltsSnapshot.jobOpeningsRate,
        hiring_rate:       joltsSnapshot.hiringRate,
        fed_funds_rate:    result.fredSnapshot?.fedFundsRate ?? null,
        yield_curve_spread:result.fredSnapshot?.yieldCurveSpread ?? null,
        nasdaq_change_90d: result.fredSnapshot?.nasdaqChange90d ?? null,
        source:            result.source,
        fetched_at:        result.fetchedAt,
      }, { onConflict: 'sector,data_month' });
    } catch { /* non-blocking — DB write failure does not fail the macro fetch */ }
  }

  return json(result);
});
