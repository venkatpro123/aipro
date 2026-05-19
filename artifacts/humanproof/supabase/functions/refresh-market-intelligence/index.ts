// refresh-market-intelligence/index.ts
// Supabase Edge Function — weekly market intelligence refresh.
//
// Schedule: every Monday 06:00 UTC (pg_cron — see migration 20260101000002)
// Env vars required:
//   SUPABASE_URL              — set automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — set automatically by Supabase
//   SERPER_API_KEY            — set in Supabase dashboard > Edge Functions > Secrets
//
// Deploy: supabase functions deploy refresh-market-intelligence

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Role catalogue — one entry per career path in careerPathMarket.ts ────────
interface RoleMeta {
  roleKey:    string;
  nauk:       string;   // Naukri search query fragment
  linkedin:   string;   // LinkedIn search query fragment
  globalTerm: string;   // LinkedIn global search term
}

const ROLES: RoleMeta[] = [
  { roleKey: 'ai_llm_systems_engineer',    nauk: '"LLM engineer" OR "AI systems engineer"',        linkedin: 'LLM Engineer',              globalTerm: 'LLM Systems Engineer' },
  { roleKey: 'ml_engineer',               nauk: '"machine learning engineer" OR "ML engineer"',    linkedin: 'Machine Learning Engineer', globalTerm: 'Machine Learning Engineer' },
  { roleKey: 'platform_engineer',         nauk: '"platform engineer" OR "SRE" OR "infra engineer"', linkedin: 'Platform Engineer',         globalTerm: 'Platform Engineer' },
  { roleKey: 'data_engineer',             nauk: '"data engineer" OR "ETL engineer"',               linkedin: 'Data Engineer',             globalTerm: 'Data Engineer' },
  { roleKey: 'security_engineer',         nauk: '"security engineer" OR "cybersecurity engineer"', linkedin: 'Security Engineer',         globalTerm: 'Security Engineer' },
  { roleKey: 'product_manager',           nauk: '"product manager" OR "PM" site:naukri.com',       linkedin: 'Product Manager',           globalTerm: 'Product Manager' },
  { roleKey: 'fp_a_ai_analyst',           nauk: '"FP&A analyst" OR "financial planning analyst"',  linkedin: 'FP&A Analyst',              globalTerm: 'FP&A Analyst' },
  { roleKey: 'risk_ai_analyst',           nauk: '"risk analyst" OR "model risk" OR "AI risk"',     linkedin: 'Risk Analyst',              globalTerm: 'AI Risk Analyst' },
  { roleKey: 'cfo_advisor',               nauk: '"CFO" OR "chief financial officer" OR "VP finance"', linkedin: 'CFO',                    globalTerm: 'Chief Financial Officer' },
  { roleKey: 'people_analytics_specialist', nauk: '"people analytics" OR "HR analytics"',          linkedin: 'People Analytics Specialist', globalTerm: 'People Analytics' },
  { roleKey: 'hrbp_ai_specialist',        nauk: '"HR business partner" OR "HRBP" AI',              linkedin: 'HR Business Partner',       globalTerm: 'HRBP AI Specialist' },
  { roleKey: 'content_strategist_ai',     nauk: '"content strategist" OR "content manager"',       linkedin: 'Content Strategist',        globalTerm: 'AI Content Strategist' },
  { roleKey: 'qa_automation_engineer',    nauk: '"QA automation" OR "SDET" OR "test engineer"',    linkedin: 'QA Automation Engineer',    globalTerm: 'QA Automation Engineer' },
  { roleKey: 'technical_writer_ai',       nauk: '"technical writer" OR "tech writer"',             linkedin: 'Technical Writer',          globalTerm: 'Technical Writer AI' },
];

// ── Demand trend from opening count history ───────────────────────────────────
function inferTrend(
  current: number | null,
  previous: number | null,
): 'surging' | 'growing' | 'stable' | 'contracting' | null {
  if (current == null || previous == null || previous === 0) return null;
  const delta = (current - previous) / previous;
  if (delta >  0.20) return 'surging';
  if (delta >  0.05) return 'growing';
  if (delta > -0.05) return 'stable';
  return 'contracting';
}

// ── Serper search → opening count ────────────────────────────────────────────
async function fetchOpeningCount(
  serperKey: string,
  query: string,
): Promise<number | null> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });
    if (!res.ok) return null;

    const data = await res.json();

    // Try organic snippet first: "12,345 jobs", "12,345 openings"
    const snippets: string[] = (data?.organic ?? [])
      .slice(0, 3)
      .map((r: { snippet?: string }) => r?.snippet ?? '');

    for (const snippet of snippets) {
      const m = snippet.match(/(\d[\d,]+)\s+(?:jobs?|openings?|positions?|vacancies)/i);
      if (m) return parseInt(m[1].replace(/,/g, ''), 10);
    }

    // Fall back to answerBox / knowledgeGraph numbers
    const abText = data?.answerBox?.answer ?? data?.answerBox?.snippet ?? '';
    const abMatch = abText.match(/(\d[\d,]+)/);
    if (abMatch) return parseInt(abMatch[1].replace(/,/g, ''), 10);

    return null;
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  // v40 hardening: pg_cron-only endpoint. Reject any caller that does not
  // present the service-role bearer. Previously open — anyone could spam
  // it to fan out Serper queries (paid) and bulk-write role market rows.
  {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const provided = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    const okLen = serviceRoleKey.length > 0 && provided.length === serviceRoleKey.length;
    let match = okLen;
    if (okLen) {
      for (let i = 0; i < provided.length; i++) {
        if (provided.charCodeAt(i) !== serviceRoleKey.charCodeAt(i)) match = false;
      }
    }
    if (!match) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const startMs = Date.now();
  let dryRun = false;
  let triggeredBy = 'manual';
  try {
    const body = await req.json().catch(() => ({}));
    dryRun      = body?.dryRun === true;
    // Detect invocation source: pg_cron sends no body; manual/CI callers may pass triggered_by
    triggeredBy = body?.triggered_by
      ?? (req.headers.get('x-triggered-by') ?? null)
      ?? (Object.keys(body).length === 0 ? 'pg_cron' : 'manual');
  } catch { /* ignore */ }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const serperKey     = Deno.env.get('SERPER_API_KEY') ?? null;
  const alertWebhook  = Deno.env.get('ALERT_WEBHOOK_URL') ?? null; // optional Slack/Discord webhook

  const today = new Date().toISOString().slice(0, 10);
  const results: { roleKey: string; indiaOpenings: number | null; globalOpenings: number | null; isLive: boolean }[] = [];
  const errorDetails: { role_key: string; error_message: string }[] = [];
  let errorCount = 0;
  let nullCount  = 0;

  // Fetch previous openings for trend inference
  const { data: prevRows } = await supabase
    .from('market_intelligence_cache')
    .select('role_key, india_openings, global_openings');
  const prev = new Map<string, { india: number | null; global: number | null }>(
    (prevRows ?? []).map((r: { role_key: string; india_openings: number | null; global_openings: number | null }) => [
      r.role_key,
      { india: r.india_openings, global: r.global_openings },
    ]),
  );

  // Process each role with per-role error isolation.
  // A Naukri scraper failure for role 3 must NOT abort roles 4-14.
  // Each role is wrapped in its own try/catch; errors are collected and
  // written to pipeline_health_log at the end of the run.
  for (const role of ROLES) {
    let indiaOpenings:  number | null = null;
    let globalOpenings: number | null = null;
    let isLive = false;

    try {
      if (serperKey) {
        const indiaQuery  = `${role.nauk} jobs India site:naukri.com`;
        const globalQuery = `"${role.globalTerm}" jobs site:linkedin.com/jobs`;

        // Both queries run in parallel; fetchOpeningCount never throws (it catches internally)
        // but wrapping in allSettled provides a second defence layer.
        const [indiaResult, globalResult] = await Promise.allSettled([
          fetchOpeningCount(serperKey, indiaQuery),
          fetchOpeningCount(serperKey, globalQuery),
        ]);
        indiaOpenings  = indiaResult.status  === 'fulfilled' ? indiaResult.value  : null;
        globalOpenings = globalResult.status === 'fulfilled' ? globalResult.value : null;
        isLive = indiaOpenings != null || globalOpenings != null;
      }

      const prevEntry   = prev.get(role.roleKey);
      const demandTrend = inferTrend(indiaOpenings, prevEntry?.india ?? null);

      results.push({ roleKey: role.roleKey, indiaOpenings, globalOpenings, isLive });
      if (!isLive) nullCount++;

      if (!dryRun) {
        const { error } = await supabase
          .from('market_intelligence_cache')
          .upsert(
            {
              role_key:        role.roleKey,
              india_openings:  indiaOpenings,
              global_openings: globalOpenings,
              demand_trend:    demandTrend,
              data_as_of:      today,
              source:          isLive ? 'Serper/Naukri+LinkedIn weekly refresh' : 'Baseline estimate',
              is_live:         isLive,
              updated_at:      new Date().toISOString(),
            },
            { onConflict: 'role_key' },
          );
        if (error) {
          // Upsert failure: log but do not abort remaining roles
          console.error(`[refresh-market-intelligence] Upsert failed for ${role.roleKey}:`, error.message);
          errorCount++;
          errorDetails.push({ role_key: role.roleKey, error_message: `DB upsert: ${error.message}` });
        }
      }
    } catch (roleErr: any) {
      // Per-role error: log and continue. Other roles are unaffected.
      const msg = roleErr?.message ?? String(roleErr);
      console.error(`[refresh-market-intelligence] Role ${role.roleKey} failed:`, msg);
      errorCount++;
      errorDetails.push({ role_key: role.roleKey, error_message: msg });
      nullCount++;
      results.push({ roleKey: role.roleKey, indiaOpenings: null, globalOpenings: null, isLive: false });
    }
  }

  const durationMs = Date.now() - startMs;
  const liveCount  = results.filter(r => r.isLive).length;
  const nullRatePct = ROLES.length > 0 ? Math.round((nullCount / ROLES.length) * 100) : 0;
  const isDegraded  = nullRatePct > 50 || errorCount > 0;

  // ── Write health log ──────────────────────────────────────────────────────
  // Persisted to pipeline_health_log table so operators can query degradation
  // without reading raw Edge Function logs. Also used by get_pipeline_health().
  if (!dryRun) {
    await supabase.from('pipeline_health_log').insert({
      pipeline:         'refresh-market-intelligence',
      run_at:           new Date().toISOString(),
      duration_ms:      durationMs,
      total_roles:      ROLES.length,
      live_count:       liveCount,
      null_count:       nullCount,
      error_count:      errorCount,
      error_details:    errorDetails.length > 0 ? errorDetails : null,
      serper_available: serperKey != null,
      triggered_by:     triggeredBy,
      notes:            isDegraded
        ? `Degraded: ${nullRatePct}% null, ${errorCount} errors`
        : `OK: ${liveCount}/${ROLES.length} live`,
    }).then(({ error }) => {
      if (error) console.warn('[refresh-market-intelligence] Health log insert failed:', error.message);
    });
  }

  // ── Alert webhook — fires when run is degraded ────────────────────────────
  // Set ALERT_WEBHOOK_URL env var to a Slack/Discord incoming webhook URL.
  // Payload is a plain-text message suitable for both platforms.
  // Detection latency: seconds after run completes (not hours of log-reading).
  if (isDegraded && alertWebhook && !dryRun) {
    const alertBody = {
      text: [
        `⚠️ *refresh-market-intelligence* degraded run`,
        `  • ${liveCount}/${ROLES.length} roles had live data (${nullRatePct}% null)`,
        `  • ${errorCount} role-level error(s)`,
        errorDetails.length > 0
          ? `  • Errors: ${errorDetails.map(e => e.role_key).join(', ')}`
          : null,
        `  • Duration: ${durationMs}ms`,
        `  • Serper available: ${serperKey != null}`,
        `\nQuery \`SELECT * FROM last_pipeline_runs\` for details.`,
      ].filter(Boolean).join('\n'),
    };
    await fetch(alertWebhook, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(alertBody),
      signal:  AbortSignal.timeout(5_000),
    }).catch(e => console.warn('[refresh-market-intelligence] Alert webhook failed:', e.message));
  }

  return new Response(
    JSON.stringify({
      refreshed:       results.length,
      dryRun,
      liveCount,
      nullCount,
      errorCount,
      nullRatePct,
      isDegraded,
      durationMs,
      serperAvailable: serperKey != null,
      results:         dryRun ? results : undefined,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
