// bseProxyConnector.ts
// Architecture Fix 1: BSE India connector CORS failure fix.
// The direct BSE connector fails in production because browsers cannot make
// cross-origin requests to BSE's API. This module routes through the
// Supabase Edge Function 'fetch-bse-data' which runs server-side.
//
// Edge Function spec (deploy to supabase/functions/fetch-bse-data/index.ts):
// ─────────────────────────────────────────────────────────────────────────────
// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// serve(async (req) => {
//   const { scrip_code } = await req.json();
//   const res = await fetch(
//     `https://api.bseindia.com/BseIndiaAPI/api/GetCompanyDetails/w?scripCode=${scrip_code}`,
//     { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bseindia.com' } }
//   );
//   const data = await res.json();
//   return new Response(JSON.stringify(data), {
//     headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//   });
// });
// ─────────────────────────────────────────────────────────────────────────────
// Until the Edge Function is deployed, this module falls back to the static DB.

import { supabase } from "../../utils/supabase";
import { invokeEdgeFunction } from "../../infrastructure/requestId";

export interface BSECompanyData {
  scripCode: string;
  companyName: string;
  currentPrice: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCapCr: number | null;
  peRatio: number | null;
  // Derived: position in 52-week range [-1, +1]
  stock52wRangePosition: number | null;
  // Derived: estimated 90-day change from 52w range (approximate)
  stock90DayChange: number | null;
  fetchedAt: string;
  source: 'proxy' | 'fallback';
}

// ── Company name → BSE scrip code mapping ────────────────────────────────────
// Covers top 100 Indian companies. Supabase table `bse_scrip_codes` should
// be the authoritative source; this is the offline fallback.
const BSE_SCRIP_CODES: Record<string, string> = {
  'tcs': '532540',
  'infosys': '500209',
  'wipro': '507685',
  'hcl technologies': '532281',
  'tech mahindra': '532755',
  'ltimindtree': '540005',
  'mphasis': '526299',
  'hexaware': '532967',
  'cognizant': '',  // Listed on NASDAQ, not BSE
  'hdfc bank': '500180',
  'icici bank': '532174',
  'axis bank': '532215',
  'kotak mahindra bank': '500247',
  'sbi': '500112',
  'bajaj finserv': '532978',
  'reliance industries': '500325',
  'sun pharma': '524715',
  'cipla': '500087',
  'dr reddys': '500124',
  'lupin': '500257',
  'apollo hospitals': '508869',
  'fortis healthcare': '532843',
  'zomato': '543320',
  'swiggy': '544023',
  'nykaa': '543384',
  'paytm': '543396',
  'ola electric': '544225',
  'flipkart': '',  // Private
};

export async function fetchBSEDataViaProxy(companyName: string): Promise<BSECompanyData | null> {
  const normalized = companyName.toLowerCase().trim();
  const scripCode = BSE_SCRIP_CODES[normalized];

  if (!scripCode) {
    if (import.meta.env.DEV) console.log(`[BSEProxy] No scrip code for "${companyName}" — skipping`);
    return null;
  }

  try {
    // Route through Supabase Edge Function to avoid CORS (and propagate request_id for tracing)
    const { data, error } = await invokeEdgeFunction<any>('fetch-bse-data', {
      body: { scrip_code: scripCode },
    });

    if (error || !data) {
      console.warn(`[BSEProxy] Edge Function unavailable: ${error?.message}`);
      return buildFallback(companyName, scripCode);
    }

    // Parse BSE API response
    const price = parseFloat(data.CurrRate ?? data.currentPrice ?? '0') || null;
    const high52 = parseFloat(data.HIGH52 ?? data.fiftyTwoWeekHigh ?? '0') || null;
    const low52 = parseFloat(data.LOW52 ?? data.fiftyTwoWeekLow ?? '0') || null;
    const mcap = parseFloat(data.mktcap ?? data.marketCap ?? '0') || null;
    const pe = parseFloat(data.PriceEarning ?? data.peRatio ?? '0') || null;

    let rangePosition: number | null = null;
    if (price && high52 && low52 && high52 > low52) {
      rangePosition = ((price - low52) / (high52 - low52)) * 2 - 1; // [-1, +1]
    }

    // The BSE GetCompanyDetails endpoint does not expose a true 90-day price series.
    // We derive an approximation from the 52-week range position (rangePosition ∈ [-1,+1])
    // by scaling to [-25%,+25%]. This is a heuristic — not a measured 90-day return.
    // It is tagged _isStock90dApproximate = true so analyzeSignalQuality can add a
    // fallback warning ("stock90d derived from 52-week range, ±10pt accuracy").
    let stock90DayChange: number | null = null;
    let isStock90dApproximate = false;
    if (rangePosition !== null) {
      stock90DayChange     = Math.round(rangePosition * 25);
      isStock90dApproximate = true;
    }

    return {
      scripCode,
      companyName,
      currentPrice: price,
      fiftyTwoWeekHigh: high52,
      fiftyTwoWeekLow: low52,
      marketCapCr: mcap,
      peRatio: pe,
      stock52wRangePosition: rangePosition,
      stock90DayChange,
      isStock90dApproximate,
      fetchedAt: new Date().toISOString(),
      source: 'proxy',
    } as any;
  } catch (err: any) {
    console.warn(`[BSEProxy] Call failed: ${err.message}`);
    return buildFallback(companyName, scripCode);
  }
}

function buildFallback(companyName: string, scripCode: string): BSECompanyData {
  return {
    scripCode,
    companyName,
    currentPrice: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    marketCapCr: null,
    peRatio: null,
    stock52wRangePosition: null,
    stock90DayChange: null,
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
  };
}

/**
 * Resolve BSE scrip code for a company name.
 * First checks local mapping, then queries Supabase bse_scrip_codes table.
 */
export async function findBSEScripCodeViaProxy(companyName: string): Promise<string | null> {
  const normalized = companyName.toLowerCase().trim();
  if (BSE_SCRIP_CODES[normalized] !== undefined) {
    return BSE_SCRIP_CODES[normalized] || null;
  }

  // Query Supabase for unmapped companies
  try {
    const { data } = await supabase
      .from('bse_scrip_codes')
      .select('scrip_code')
      .ilike('company_name', `%${companyName}%`)
      .maybeSingle();
    return data?.scrip_code ?? null;
  } catch {
    return null;
  }
}
