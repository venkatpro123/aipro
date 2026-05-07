// fetch-bse-data/index.ts
// CORS proxy for BSE India company data.
// Browser cannot call BSE directly due to CORS; this Edge Function
// runs server-side and relays the response.
//
// Deploy: supabase functions deploy fetch-bse-data
// Called by: src/services/dataConnectors/bseProxyConnector.ts

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { scrip_code } = await req.json();

    if (!scrip_code || typeof scrip_code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'scrip_code is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Primary: BSE India API
    const bseUrl = `https://api.bseindia.com/BseIndiaAPI/api/GetCompanyDetails/w?scripCode=${encodeURIComponent(scrip_code)}`;
    const bseRes = await fetch(bseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer':    'https://www.bseindia.com',
        'Accept':     'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!bseRes.ok) {
      throw new Error(`BSE API returned ${bseRes.status}`);
    }

    const data = await bseRes.json();

    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[fetch-bse-data] Error:', err?.message);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'BSE fetch failed', source: 'edge_function_error' }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
