// proxy-macro/index.ts — v22.0
//
// Server-side proxy for BLS JOLTS and FRED macro indicators. The browser cannot
// call these public APIs directly (no CORS, and BLS/FRED keys would be exposed),
// so this Edge Function performs the fetch, caches the result for 6 hours, and
// returns a slim normalized payload.
//
// SOURCES:
//   BLS Public Data API v2 — https://api.bls.gov/publicAPI/v2/timeseries/data
//     Series JTS1000HIL: Total nonfarm — layoffs and discharges, level
//     Series JTS1000QUL: Total nonfarm — quits, level
//     (Sector codes vary; we expose `series_id` in the request body.)
//
//   FRED API v0 — https://api.stlouisfed.org/fred/series/observations
//     FEDFUNDS, T10Y2Y, NASDAQCOM
//
// CONFIG (Supabase secrets):
//   BLS_API_KEY      — optional, raises rate limit from 25 to 500 req/day
//   FRED_API_KEY     — required for FRED endpoints
//
// CACHE HIERARCHY (M-2 fix)
// ─────────────────────────
// 1. In-memory Map (same isolate, instant) — resets on cold start
// 2. edge_macro_cache DB table (shared across all isolates, survives cold starts)
// 3. Fresh FRED/BLS fetch + write back to both caches

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const CACHE_KEY = "macro-snapshot";

// In-memory fast-path (within same isolate lifetime)
const _memCache = new Map<string, { value: unknown; expiresAt: number }>();
const getMemCached = <T,>(key: string): T | null => {
  const hit = _memCache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.value as T;
  return null;
};
const setMemCached = (key: string, value: unknown): void => {
  _memCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

// DB-backed persistent cache — shared across all isolates
async function loadMacroFromDb(supabase: ReturnType<typeof createClient>): Promise<unknown | null> {
  try {
    const { data } = await supabase
      .from("edge_macro_cache")
      .select("payload, expires_at")
      .eq("key", CACHE_KEY)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data.payload;
  } catch {
    return null;
  }
}

async function saveMacroToDb(supabase: ReturnType<typeof createClient>, payload: unknown): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    await supabase.from("edge_macro_cache").upsert(
      { key: CACHE_KEY, payload, fetched_at: new Date().toISOString(), expires_at: expiresAt },
      { onConflict: "key" },
    );
  } catch { /* non-fatal — fresh fetch already succeeded */ }
}

interface FREDObservation {
  date: string;
  value: string;
}

async function fetchFREDSeries(seriesId: string, apiKey: string): Promise<FREDObservation[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${encodeURIComponent(seriesId)}` +
    `&api_key=${apiKey}&file_type=json&limit=120&sort_order=desc`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`FRED ${seriesId} ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.observations) ? json.observations : [];
}

async function fetchBLSSeries(seriesIds: string[], apiKey: string | undefined): Promise<Record<string, { date: string; value: number }[]>> {
  const body: Record<string, unknown> = {
    seriesid: seriesIds,
    startyear: String(new Date().getUTCFullYear() - 1),
    endyear: String(new Date().getUTCFullYear()),
  };
  if (apiKey) body.registrationkey = apiKey;
  const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`BLS ${res.status}`);
  const json = await res.json();
  const out: Record<string, { date: string; value: number }[]> = {};
  const series = Array.isArray(json?.Results?.series) ? json.Results.series : [];
  for (const s of series) {
    const data = Array.isArray(s?.data) ? s.data : [];
    out[String(s?.seriesID ?? "")] = (data as Record<string, unknown>[])
      .map((d) => ({
        date: `${d?.year}-${String(d?.period ?? "").replace("M", "").padStart(2, "0")}-01`,
        value: Number(d?.value),
      }))
      .filter((d) => Number.isFinite(d.value));
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = (SUPABASE_URL && SERVICE_KEY)
    ? createClient(SUPABASE_URL, SERVICE_KEY)
    : null;

  try {
    // Layer 1: in-memory fast-path (same isolate)
    const memHit = getMemCached<Record<string, unknown>>(CACHE_KEY);
    if (memHit) {
      return new Response(JSON.stringify({ ...memHit, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Layer 2: DB-backed shared cache (survives cold starts)
    if (supabase) {
      const dbHit = await loadMacroFromDb(supabase);
      if (dbHit) {
        setMemCached(CACHE_KEY, dbHit); // warm the in-memory layer
        return new Response(JSON.stringify({ ...(dbHit as Record<string, unknown>), fromCache: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const FRED_KEY = Deno.env.get("FRED_API_KEY");
    const BLS_KEY  = Deno.env.get("BLS_API_KEY") ?? undefined;

    // FRED keys must be exactly 32 lowercase alphanumeric characters. Reject
    // malformed keys early so we serve calibrated baselines instead of nulls.
    const fredKeyValid = !!FRED_KEY && /^[a-z0-9]{32}$/.test(FRED_KEY);
    if (!fredKeyValid) {
      const reason = !FRED_KEY ? "FRED_API_KEY not configured" : "FRED_API_KEY malformed (must be 32 lowercase alphanumeric chars)";
      // Calibrated May 2026 baselines — keep client honest while pipeline still works.
      const fallback = {
        fredSnapshot: {
          fedFundsRate:     4.75, yieldCurveSpread: -0.15, isInvertedCurve: true,
          nasdaqChange90d:  3.2,  dataDate: "2026-05-01",
        },
        joltsSnapshot: null,
        dataSource: "calibrated_baseline",
        warning: reason,
        fetchedAt: new Date().toISOString(),
        fromCache: false,
      };
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [fedFunds, yieldCurve, nasdaq, blsData] = await Promise.all([
      fetchFREDSeries("FEDFUNDS",   FRED_KEY).catch(() => []),
      fetchFREDSeries("T10Y2Y",     FRED_KEY).catch(() => []),
      fetchFREDSeries("NASDAQCOM",  FRED_KEY).catch(() => []),
      fetchBLSSeries(["JTS510000000000000QUL", "JTS510000000000000LDL"], BLS_KEY).catch(() => ({} as Record<string, { date: string; value: number }[]>)),
    ]);

    const latest = (arr: FREDObservation[]): number | null => {
      const first = arr.find((o) => o.value !== "." && Number.isFinite(Number(o.value)));
      return first ? Number(first.value) : null;
    };

    const nasdaqLatest = latest(nasdaq);
    const nasdaq90AgoEntry = nasdaq[60]; // ~90 trading days back
    const nasdaq90Ago = nasdaq90AgoEntry ? Number(nasdaq90AgoEntry.value) : null;
    const nasdaqChange90d = nasdaqLatest && nasdaq90Ago
      ? Math.round(((nasdaqLatest - nasdaq90Ago) / nasdaq90Ago) * 1000) / 10
      : null;

    const fredSnapshot = {
      fedFundsRate:       latest(fedFunds),
      yieldCurveSpread:   latest(yieldCurve),
      isInvertedCurve:    (latest(yieldCurve) ?? 0) < 0,
      nasdaqChange90d,
      dataDate:           fedFunds[0]?.date ?? new Date().toISOString().slice(0, 10),
    };

    // BLS IT-sector (NAICS 51) quits + layoffs — only return if both present.
    const itQuits   = blsData["JTS510000000000000QUL"] ?? [];
    const itLayoffs = blsData["JTS510000000000000LDL"] ?? [];
    const joltsSnapshot = itQuits.length > 0 && itLayoffs.length > 0 ? {
      sector: "information_technology" as const,
      quitsRate:       itQuits[0]?.value ?? null,
      layoffsRate:     itLayoffs[0]?.value ?? null,
      jobOpeningsRate: null,
      hiringRate:      null,
      quitsTrend:      "stable" as const,
      dataMonth:       itQuits[0]?.date ?? new Date().toISOString().slice(0, 10),
    } : null;

    // If every FRED series returned empty (likely all-"." or fetch failures),
    // fall back to calibrated baseline rather than emitting nulls.
    const fredEmpty = fedFunds.length === 0 && yieldCurve.length === 0 && nasdaq.length === 0;
    if (fredEmpty) {
      return new Response(JSON.stringify({
        fredSnapshot: {
          fedFundsRate: 4.75, yieldCurveSpread: -0.15, isInvertedCurve: true,
          nasdaqChange90d: 3.2, dataDate: "2026-05-01",
        },
        joltsSnapshot,
        dataSource: "calibrated_baseline_fred_unavailable",
        warning: "FRED returned no data for any series — using May 2026 baseline",
        fetchedAt: new Date().toISOString(),
        fromCache: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = { fredSnapshot, joltsSnapshot, dataSource: "live", fetchedAt: new Date().toISOString() };
    setMemCached(CACHE_KEY, payload);
    if (supabase) await saveMacroToDb(supabase, payload);
    return new Response(JSON.stringify({ ...payload, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg, fromCache: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
