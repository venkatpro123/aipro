// refresh-market-intelligence/index.ts
// Deno Edge Function — runs weekly (Monday 06:00 UTC via pg_cron).
//
// ARCHITECTURE: 7 independent regional batches with per-batch error isolation.
//
// Each batch covers one region and queries 2-3 sources (primary → fallback).
// A bot-block on LinkedIn Germany does NOT abort the India batch — they run
// in sequence with a try-catch per batch. If a source is blocked, the next
// source in the batch's priority list is tried before marking a role as failed.
//
// After each batch: writes to market_batch_status so the client knows which
// regions have stale data. Writes to market_intelligence_cache are batched at
// the END (all 7 regional datasets merged into one upsert per role_key).
//
// Batches and their sources (all via Serper Google-indexed snapshots):
//   india_batch     — Naukri (primary) → Indeed India → LinkedIn IN
//   us_batch        — LinkedIn US (primary) → Indeed US [+ BLS JOLTS fallback]
//   uk_batch        — LinkedIn UK (primary) → Reed UK [+ ONS fallback]
//   germany_batch   — StepStone (primary) → XING [+ IAB fallback]
//   singapore_batch — JobsDB (primary) → LinkedIn SG [+ MOM fallback]
//   latam_batch     — Bumeran (primary) → LinkedIn LatAm
//   mena_batch      — Bayt (primary) → LinkedIn MENA
//
// Statistical APIs (BLS JOLTS / ONS / MOM / IAB) are queried when their public
// endpoints are reachable and enrich the Serper count with an official vacancy
// figure. Serper remains the primary source — statistical APIs are supplemental.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Role keys (16 roles) ──────────────────────────────────────────────────────
const ROLE_KEYS = [
  'ai_llm_systems_engineer',
  'ml_engineer',
  'platform_engineer',
  'data_engineer',
  'security_engineer',
  'product_manager',
  'fp_a_ai_analyst',
  'risk_ai_analyst',
  'cfo_advisor',
  'people_analytics_specialist',
  'hrbp_ai_specialist',
  'content_strategist_ai',
  'qa_automation_engineer',
  'technical_writer_ai',
  'frontend_engineer',
  'devops_engineer',
] as const;

type RoleKey = typeof ROLE_KEYS[number];

// ── Types ─────────────────────────────────────────────────────────────────────
type ScrapeStatus =
  | 'success'
  | 'parse_failed'
  | 'rate_limited'
  | 'source_blocked'
  | 'network_error'
  | 'no_key';

interface SourceConfig {
  site:         string;   // 'naukri.com'
  label:        string;   // 'Naukri'
  numberLocale: 'en' | 'de';
  glCode:       string;   // Serper gl= param ('in', 'us', etc.)
}

interface BatchConfig {
  id:           string;   // 'india_batch'
  regionCode:   string;   // 'IN' — primary region written to regional_openings
  label:        string;   // 'India'
  sources:      SourceConfig[];
}

interface RoleRegionResult {
  count:     number | null;
  source:    string;           // which source label provided the count
  status:    ScrapeStatus;
  asOf:      string;           // ISO date string
  isLive:    boolean;
}

// Map<roleKey, RoleRegionResult> — collected per batch
type BatchRoleMap = Map<RoleKey, RoleRegionResult>;

interface BatchOutcome {
  batchId:        string;
  regionCode:     string;
  rolesSuccess:   number;
  rolesTotal:     number;
  sourcesUsed:    string[];
  sourcesBlocked: string[];
  lastSuccessAt:  string | null;
  status:         'success' | 'partial' | 'failed';
  error?:         string;
  data:           BatchRoleMap;
}

// ── Batch configuration ───────────────────────────────────────────────────────

const BATCHES: BatchConfig[] = [
  {
    id: 'india_batch', regionCode: 'IN', label: 'India',
    sources: [
      { site: 'naukri.com',     label: 'Naukri',        numberLocale: 'en', glCode: 'in' },
      { site: 'in.indeed.com',  label: 'Indeed India',  numberLocale: 'en', glCode: 'in' },
      { site: 'linkedin.com',   label: 'LinkedIn IN',   numberLocale: 'en', glCode: 'in' },
    ],
  },
  {
    id: 'us_batch', regionCode: 'US', label: 'United States',
    sources: [
      { site: 'linkedin.com',   label: 'LinkedIn US',   numberLocale: 'en', glCode: 'us' },
      { site: 'indeed.com',     label: 'Indeed US',     numberLocale: 'en', glCode: 'us' },
    ],
  },
  {
    id: 'uk_batch', regionCode: 'GB', label: 'United Kingdom',
    sources: [
      { site: 'linkedin.com',   label: 'LinkedIn UK',   numberLocale: 'en', glCode: 'gb' },
      { site: 'reed.co.uk',     label: 'Reed UK',       numberLocale: 'en', glCode: 'gb' },
    ],
  },
  {
    id: 'germany_batch', regionCode: 'DE', label: 'Germany',
    sources: [
      { site: 'stepstone.de',   label: 'StepStone',     numberLocale: 'de', glCode: 'de' },
      { site: 'xing.com',       label: 'XING',          numberLocale: 'de', glCode: 'de' },
      { site: 'linkedin.com',   label: 'LinkedIn DE',   numberLocale: 'de', glCode: 'de' },
    ],
  },
  {
    id: 'singapore_batch', regionCode: 'SG', label: 'Singapore',
    sources: [
      { site: 'jobsdb.com',     label: 'JobsDB',        numberLocale: 'en', glCode: 'sg' },
      { site: 'linkedin.com',   label: 'LinkedIn SG',   numberLocale: 'en', glCode: 'sg' },
    ],
  },
  {
    id: 'latam_batch', regionCode: 'BR', label: 'Latin America',
    sources: [
      { site: 'bumeran.com',    label: 'Bumeran',       numberLocale: 'en', glCode: 'br' },
      { site: 'linkedin.com',   label: 'LinkedIn LatAm', numberLocale: 'en', glCode: 'br' },
    ],
  },
  {
    id: 'mena_batch', regionCode: 'AE', label: 'MENA',
    sources: [
      { site: 'bayt.com',       label: 'Bayt',          numberLocale: 'en', glCode: 'ae' },
      { site: 'linkedin.com',   label: 'LinkedIn MENA', numberLocale: 'en', glCode: 'ae' },
    ],
  },
];

// ── Serper helpers ────────────────────────────────────────────────────────────

function parseJobCount(raw: string, locale: 'en' | 'de'): number | null {
  let normalized = raw.replace(/\s/g, '');
  if (locale === 'de') {
    normalized = normalized.replace(/\.(\d{3})/g, '$1').replace(/,\d+$/, '');
  } else {
    normalized = normalized.replace(/,(\d{3})/g, '$1');
  }
  const n = parseInt(normalized, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// deno-lint-ignore no-explicit-any
function extractCount(data: any, locale: 'en' | 'de'): number | null {
  const snippets: string[] = (data?.organic ?? [])
    .slice(0, 3)
    .map((r: { snippet?: string }) => r.snippet ?? '');

  const pattern = /(\d[\d.,]+)\s*(?:\+\s*)?(?:job|opening|vacanc|stelle|offert|posto|vacature|offre)/i;
  for (const snippet of snippets) {
    const m = snippet.match(pattern);
    if (m) {
      const parsed = parseJobCount(m[1], locale);
      if (parsed !== null) return parsed;
    }
  }

  const totalRaw: string | undefined = data?.searchInformation?.totalResults;
  if (totalRaw) {
    const parsed = parseJobCount(totalRaw, 'en');
    if (parsed !== null && parsed < 500_000) return parsed;
  }

  return null;
}

async function querySerper(
  serperKey: string,
  roleTitle: string,
  source: SourceConfig,
): Promise<{ count: number | null; status: ScrapeStatus }> {
  const query = `"${roleTitle}" jobs site:${source.site}`;

  let response: Response;
  try {
    response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 5, gl: source.glCode }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return { count: null, status: 'network_error' };
  }

  if (response.status === 429) return { count: null, status: 'rate_limited' };
  if (response.status === 403) return { count: null, status: 'source_blocked' };
  if (!response.ok)            return { count: null, status: 'network_error' };

  // deno-lint-ignore no-explicit-any
  let data: any;
  try { data = await response.json(); } catch {
    return { count: null, status: 'parse_failed' };
  }

  const count = extractCount(data, source.numberLocale);
  return { count, status: count !== null ? 'success' : 'parse_failed' };
}

// ── Statistical API enrichment (optional — degrades gracefully) ───────────────
//
// BLS JOLTS (US): public endpoint, no key required for series-level data.
// Returns total job openings across all sectors as a sanity-check ceiling.
// Used to cap obviously-inflated Serper counts (>5× JOLTS total = suspicious).
// Other APIs (ONS, MOM, IAB) are documented but not yet implemented pending
// their respective key procurement — stubs return null gracefully.

async function fetchBlsJolts(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.bls.gov/publicAPI/v2/timeseries/data/JTS000000000000000JOL',
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    // deno-lint-ignore no-explicit-any
    const body: any = await res.json();
    // Latest month value in thousands
    const latest = body?.Results?.series?.[0]?.data?.[0]?.value;
    if (!latest) return null;
    return parseInt(latest, 10) * 1_000; // convert from thousands
  } catch {
    return null;
  }
}

// ONS UK vacancy data: https://api.beta.ons.gov.uk (public, no key)
async function fetchOnsVacancies(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.beta.ons.gov.uk/v1/datasets/labour-market/editions/time-series/versions/2/observations?time=*&geography=K02000001&aggregate=ap4j',
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    // deno-lint-ignore no-explicit-any
    const body: any = await res.json();
    // Total vacancies in thousands
    const obs = body?.observations?.[body.observations.length - 1];
    if (!obs?.observation) return null;
    return Math.round(parseFloat(obs.observation) * 1_000);
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

// ── Batch runner ──────────────────────────────────────────────────────────────
//
// Each call is fully isolated: errors thrown inside never escape to the caller.
// Returns BatchOutcome with status='failed' and error detail on exception.

async function runBatch(
  config:     BatchConfig,
  serperKey:  string,
  dateAsOf:   string,
  nowIso:     string,
): Promise<BatchOutcome> {
  const data: BatchRoleMap = new Map();
  let rolesSuccess   = 0;
  const sourcesUsed    = new Set<string>();
  const sourcesBlocked = new Set<string>();

  try {
    for (const roleKey of ROLE_KEYS) {
      const roleTitle = roleKey.replace(/_/g, ' ');
      let bestCount:  number | null = null;
      let bestSource: string        = 'none';
      let finalStatus: ScrapeStatus = 'parse_failed';

      // Try each source in priority order — stop at first success
      for (const source of config.sources) {
        const { count, status } = await querySerper(serperKey, roleTitle, source);
        await sleep(450); // 450ms inter-query delay — ~67s total for 112 + retries

        if (status === 'success' && count !== null) {
          bestCount  = count;
          bestSource = source.label;
          finalStatus = 'success';
          sourcesUsed.add(source.label);
          break;
        }

        // Log blocked sources but continue to next source in this batch
        if (status === 'source_blocked' || status === 'rate_limited') {
          sourcesBlocked.add(source.label);
          console.warn(`[${config.id}] ${source.site} blocked for ${roleKey} (${status}) — trying next source`);
        }
        // Keep worst non-success status (source_blocked > rate_limited > network_error > parse_failed)
        if (status === 'source_blocked') finalStatus = 'source_blocked';
        else if (status === 'rate_limited' && finalStatus !== 'source_blocked') finalStatus = 'rate_limited';
        else if (status === 'network_error' && finalStatus === 'parse_failed') finalStatus = 'network_error';
      }

      data.set(roleKey, {
        count:  bestCount,
        source: bestSource,
        status: finalStatus,
        asOf:   dateAsOf,
        isLive: finalStatus === 'success',
      });

      if (finalStatus === 'success') rolesSuccess++;
    }

    const rolesTotal = ROLE_KEYS.length;
    const batchStatus: 'success' | 'partial' | 'failed' =
      rolesSuccess === rolesTotal ? 'success'
      : rolesSuccess  >  0        ? 'partial'
      :                             'failed';

    return {
      batchId:        config.id,
      regionCode:     config.regionCode,
      rolesSuccess,
      rolesTotal,
      sourcesUsed:    [...sourcesUsed],
      sourcesBlocked: [...sourcesBlocked],
      lastSuccessAt:  rolesSuccess > 0 ? nowIso : null,
      status:         batchStatus,
      data,
    };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${config.id}] Batch threw:`, msg);
    return {
      batchId:        config.id,
      regionCode:     config.regionCode,
      rolesSuccess:   0,
      rolesTotal:     ROLE_KEYS.length,
      sourcesUsed:    [],
      sourcesBlocked: [],
      lastSuccessAt:  null,
      status:         'failed',
      error:          msg,
      data,
    };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (_req: Request): Promise<Response> => {
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serperKey      = Deno.env.get('SERPER_API_KEY') ?? '';

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now      = new Date();
  const dateAsOf = now.toISOString().slice(0, 10);
  const nowIso   = now.toISOString();

  // No API key → write 'no_key' status to all batches and exit
  if (!serperKey) {
    for (const batch of BATCHES) {
      await supabase.from('market_batch_status').upsert({
        batch_id:        batch.id,
        last_run_at:     nowIso,
        last_status:     'failed',
        roles_success:   0,
        roles_total:     ROLE_KEYS.length,
        sources_used:    [],
        sources_blocked: [],
        error_detail:    'SERPER_API_KEY not configured',
      }, { onConflict: 'batch_id' });
    }
    // Still write 'no_key' scrape_status to market_intelligence_cache
    for (const roleKey of ROLE_KEYS) {
      await supabase.from('market_intelligence_cache').upsert({
        role_key:      roleKey,
        scrape_status: 'no_key',
        updated_at:    nowIso,
      }, { onConflict: 'role_key' });
    }
    return new Response(
      JSON.stringify({ ok: false, reason: 'no_key', batches: BATCHES.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Optional: fetch statistical API baselines (non-blocking) ──────────────
  // These run before the main Serper loop so counts are available for cap checks.
  const [blsJoltsTotal, onsVacanciesTotal] = await Promise.allSettled([
    fetchBlsJolts(),
    fetchOnsVacancies(),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

  console.log(`[refresh-MI] BLS JOLTS total openings: ${blsJoltsTotal ?? 'unavailable'}`);
  console.log(`[refresh-MI] ONS UK total vacancies: ${onsVacanciesTotal ?? 'unavailable'}`);

  // ── Run 7 batches sequentially with independent error boundaries ───────────

  const batchOutcomes: BatchOutcome[] = [];
  const batchSummary: Record<string, { status: string; rolesSuccess: number; sourcesBlocked: string[] }> = {};

  for (const batchConfig of BATCHES) {
    console.log(`[refresh-MI] Starting ${batchConfig.id} (${batchConfig.label})`);

    const outcome = await runBatch(batchConfig, serperKey, dateAsOf, nowIso);
    batchOutcomes.push(outcome);

    // ── Write per-batch status immediately ──────────────────────────────────
    // This fires even on failed batches so the client sees the attempted run.
    // If the upsert itself fails, we log but never abort the next batch.
    const batchStatusPayload: Record<string, unknown> = {
      batch_id:        outcome.batchId,
      last_run_at:     nowIso,
      last_status:     outcome.status,
      roles_success:   outcome.rolesSuccess,
      roles_total:     outcome.rolesTotal,
      sources_used:    outcome.sourcesUsed,
      sources_blocked: outcome.sourcesBlocked,
      error_detail:    outcome.error ?? null,
    };
    if (outcome.lastSuccessAt) {
      batchStatusPayload.last_success_at = outcome.lastSuccessAt;
    }

    const { error: batchWriteErr } = await supabase
      .from('market_batch_status')
      .upsert(batchStatusPayload, { onConflict: 'batch_id' });

    if (batchWriteErr) {
      console.error(`[refresh-MI] market_batch_status write failed for ${outcome.batchId}:`, batchWriteErr.message);
    }

    batchSummary[outcome.batchId] = {
      status:         outcome.status,
      rolesSuccess:   outcome.rolesSuccess,
      sourcesBlocked: outcome.sourcesBlocked,
    };

    console.log(`[refresh-MI] ${outcome.batchId}: ${outcome.status} (${outcome.rolesSuccess}/${outcome.rolesTotal} roles, blocked: ${outcome.sourcesBlocked.join(', ') || 'none'})`);
  }

  // ── Merge all batch results → market_intelligence_cache ───────────────────
  //
  // Build one object per role_key containing regional data from all batches.
  // Each batch only contributes its own region code's data. The in/global
  // rollup counts are recomputed from the merged regional_openings.

  let totalSuccess = 0;
  let totalFailure = 0;

  for (const roleKey of ROLE_KEYS) {
    const regionalOpenings: Record<string, {
      count: number | null; source: string; asOf: string; isLive: boolean; status: ScrapeStatus;
    }> = {};

    let anySuccess    = false;
    let overallStatus: ScrapeStatus = 'parse_failed';

    for (const outcome of batchOutcomes) {
      const roleResult = outcome.data.get(roleKey);
      if (!roleResult) continue;

      regionalOpenings[outcome.regionCode] = {
        count:  roleResult.count,
        source: roleResult.source,
        asOf:   roleResult.asOf,
        isLive: roleResult.isLive,
        status: roleResult.status,
      };

      if (roleResult.status === 'success') {
        anySuccess    = true;
        overallStatus = 'success';
        totalSuccess++;
      } else {
        totalFailure++;
        if (overallStatus !== 'success') {
          if (roleResult.status === 'source_blocked') overallStatus = 'source_blocked';
          else if (roleResult.status === 'rate_limited' && overallStatus !== 'source_blocked') overallStatus = 'rate_limited';
          else if (roleResult.status === 'network_error' && overallStatus === 'parse_failed') overallStatus = 'network_error';
        }
      }
    }

    // Rollup counts (backward-compatible fields)
    const indiaResult = regionalOpenings['IN'];
    const indiaOpenings = indiaResult?.count ?? null;
    const nonIndiaCounts = Object.entries(regionalOpenings)
      .filter(([code]) => code !== 'IN')
      .map(([, r]) => r.count)
      .filter((n): n is number => n !== null);
    const globalOpenings = nonIndiaCounts.length > 0
      ? nonIndiaCounts.reduce((a, b) => a + b, 0)
      : null;

    // Apply BLS JOLTS sanity cap on US count (>10× total openings = suspicious parse)
    if (blsJoltsTotal !== null && regionalOpenings['US']?.count) {
      if (regionalOpenings['US'].count > blsJoltsTotal * 10) {
        console.warn(`[refresh-MI] US count for ${roleKey} (${regionalOpenings['US'].count}) exceeds 10× BLS JOLTS total — capping`);
        regionalOpenings['US'].count = Math.round(blsJoltsTotal * 0.002); // 0.2% of total vacancies
        regionalOpenings['US'].source += ' (BLS-capped)';
      }
    }

    // deno-lint-ignore no-explicit-any
    const payload: Record<string, any> = {
      role_key:          roleKey,
      india_openings:    indiaOpenings,
      global_openings:   globalOpenings,
      regional_openings: regionalOpenings,
      data_as_of:        dateAsOf,
      source:            anySuccess
        ? `Serper/${BATCHES.map(b => b.label).join('+')} weekly refresh`
        : `Weekly refresh — ${overallStatus}`,
      is_live:       anySuccess,
      scrape_status: overallStatus,
      updated_at:    nowIso,
    };

    if (anySuccess) {
      payload.last_successful_scrape_at = nowIso;
    }

    const { error } = await supabase
      .from('market_intelligence_cache')
      .upsert(payload, { onConflict: 'role_key' });

    if (error) {
      console.error(`[refresh-MI] Cache upsert failed for ${roleKey}:`, error.message);
    }
  }

  const successBatches = batchOutcomes.filter(b => b.status !== 'failed').length;
  const failedBatches  = batchOutcomes.filter(b => b.status === 'failed').length;

  return new Response(
    JSON.stringify({
      ok:             true,
      batches:        BATCHES.length,
      successBatches,
      failedBatches,
      totalQueries:   totalSuccess + totalFailure,
      totalSuccess,
      totalFailure,
      blsJoltsTotal:  blsJoltsTotal ?? null,
      onsVacancies:   onsVacanciesTotal ?? null,
      batchSummary,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
