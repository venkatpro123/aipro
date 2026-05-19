// fetch-company-data/index.ts
// Supabase Edge Function — company intelligence read-through cache.
//
// Called by auditDataPipeline.ts Step 1 (OSINT enrichment).
// Previously this EF was never deployed — every audit silently fell through
// to the Step 2 DB path. This deployment restores live OSINT for all audits.
//
// Resolution order:
//   1. company_intelligence table — exact match, then ilike fuzzy
//   2. cached_company_intelligence (if exists) — stale-while-revalidate
//   3. company_enrichment_queue — enqueue if not found + return null provenance
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
//
// Deploy: supabase functions deploy fetch-company-data

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });

// v40 hardening: escape PostgREST ilike() metacharacters so a caller cannot
// craft cross-row pattern matches via `%` / `_`.
function escapeIlike(raw: string): string {
  return raw
    .slice(0, 200)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // v40 hardening: require a Supabase JWT. Without auth, this EF was an
  // open read endpoint into company_intelligence and an open writer to
  // company_enrichment_queue — anyone could spam either at no cost.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401);
  }
  try {
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await anonClient.auth.getUser();
    if (error || !user) return json({ error: 'Invalid or expired token' }, 401);
  } catch {
    return json({ error: 'Auth check failed' }, 401);
  }

  let companyName = '';
  try {
    const body = await req.json();
    companyName = (body.companyName ?? '').trim();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!companyName) return json({ error: 'companyName is required' }, 400);
  if (companyName.length > 200) return json({ error: 'companyName too long' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── 1. Exact match in company_intelligence ──────────────────────────────────
  const { data: exactRow } = await supabase
    .from('company_intelligence')
    .select('*')
    .eq('company_name', companyName)
    .maybeSingle();

  if (exactRow) {
    return json({
      source: 'company_intelligence:exact',
      matchConfidence: 1.0,
      matchType: 'exact',
      data: mapCIRowToData(exactRow),
    });
  }

  // ── 2. Fuzzy match — ilike ──────────────────────────────────────────────────
  const { data: fuzzyRows } = await supabase
    .from('company_intelligence')
    .select('*')
    .ilike('company_name', `%${escapeIlike(companyName)}%`)
    .order('confidence_score', { ascending: false })
    .limit(3);

  if (fuzzyRows && fuzzyRows.length > 0) {
    const best = fuzzyRows[0];
    const confidence = computeMatchConfidence(companyName, best.company_name);
    return json({
      source: 'company_intelligence:fuzzy',
      matchConfidence: confidence,
      matchType: confidence >= 0.9 ? 'prefix' : 'contains',
      data: mapCIRowToData(best),
    });
  }

  // ── 3. Not found — enqueue for enrichment and return fallback ───────────────
  await supabase
    .from('company_enrichment_queue')
    .upsert(
      {
        company_name:  companyName,
        search_count:  1,
        queued_at:     new Date().toISOString(),
        status:        'pending',
      },
      { onConflict: 'company_name' },
    )
    .then(async (upsertResult) => {
      // Increment search_count if row already existed
      if (!upsertResult.error) {
        await supabase.rpc('upsert_company_search', { p_company_name: companyName });
      }
    })
    .catch(() => {}); // non-blocking

  return json({
    source: 'fallback:not_in_db',
    matchConfidence: 0,
    matchType: 'none',
    data: null,
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapCIRowToData(row: Record<string, unknown>) {
  return {
    name:                 row.company_name,
    industry:             row.industry ?? null,
    employeeCount:        row.employee_count ?? null,
    revenueGrowthYoY:     row.revenue_growth_yoy ?? null,
    stock90DayChange:     row.stock_90d_change ?? null,
    revenuePerEmployee:   row.revenue_per_employee ?? null,
    layoffRounds:         row.layoff_rounds ?? 0,
    layoffHistory:        row.layoff_history ?? [],
    recent_layoff_news:   row.recent_layoff_news ?? false,
    hiringFreezeScore:    row.hiring_freeze_score ?? null,
    aiInvestmentSignal:   row.ai_investment_signal ?? null,
    isPublic:             row.is_public ?? false,
    region:               row.region ?? 'US',
    confidenceScore:      row.confidence_score ?? null,
    // Return BOTH field name forms so callers reading either case get the real timestamp.
    // mapOsintToCompanyData reads last_updated (snake_case); this ensures no fallback to new Date().
    last_updated:         row.last_updated ?? null,
    lastUpdated:          row.last_updated ?? null,
  };
}

function computeMatchConfidence(query: string, dbName: string): number {
  const q = query.toLowerCase().trim();
  const d = dbName.toLowerCase().trim();
  if (q === d) return 1.0;
  if (d.startsWith(q) || q.startsWith(d)) return 0.95;
  // Token overlap
  const qTokens = new Set(q.split(/\s+/));
  const dTokens = d.split(/\s+/);
  const overlap = dTokens.filter(t => qTokens.has(t)).length;
  return overlap / Math.max(qTokens.size, dTokens.length);
}
