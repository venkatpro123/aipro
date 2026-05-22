// refresh-market-intelligence/index.ts
// Deno Edge Function — runs weekly (Monday 06:00 UTC via pg_cron).
//
// Queries Serper (Google Search) for job counts across 16 role x 7 region
// combinations. Serper hits Google indexed snapshots — not LinkedIn/Naukri
// servers directly — so behavioral fingerprinting cannot fire.
//
// Writes per-role rows to market_intelligence_cache with:
//   scrape_status          — 'success' | 'parse_failed' | 'rate_limited' |
//                            'source_blocked' | 'network_error' | 'no_key'
//   last_successful_scrape_at — updated ONLY on success (preserves last known
//                               good timestamp when a refresh attempt fails)
//   regional_openings      — JSONB with per-region counts + source metadata
//
// UI consequence: SkillFreshnessLabel can now distinguish
//   "updated 3 days ago (scheduled)" from
//   "last successful refresh: 14 days ago (source blocked by anti-bot)"

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Role keys ────────────────────────────────────────────────────────────────
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

// ── Region config ─────────────────────────────────────────────────────────────
interface RegionConfig {
  code: string;
  label: string;
  site: string;
  countLabel: string;
  numberLocale: 'en' | 'de' | 'eu';
}

const REGIONS: RegionConfig[] = [
  { code: 'IN', label: 'India',     site: 'naukri.com',   countLabel: 'Naukri',    numberLocale: 'en' },
  { code: 'US', label: 'US',        site: 'indeed.com',   countLabel: 'Indeed US', numberLocale: 'en' },
  { code: 'GB', label: 'UK',        site: 'reed.co.uk',   countLabel: 'Reed UK',   numberLocale: 'en' },
  { code: 'DE', label: 'Germany',   site: 'stepstone.de', countLabel: 'StepStone', numberLocale: 'de' },
  { code: 'SG', label: 'Singapore', site: 'jobsdb.com',   countLabel: 'JobsDB',    numberLocale: 'en' },
  { code: 'AU', label: 'Australia', site: 'seek.com.au',  countLabel: 'SEEK',      numberLocale: 'en' },
  { code: 'CA', label: 'Canada',    site: 'ca.indeed.com',countLabel: 'Indeed CA', numberLocale: 'en' },
];

// ── Scrape status type ────────────────────────────────────────────────────────
type ScrapeStatus =
  | 'success'
  | 'parse_failed'
  | 'rate_limited'
  | 'source_blocked'
  | 'network_error'
  | 'no_key';

// ── Number parsing — handles EN (1,200) and DE (1.200) formats ───────────────
function parseJobCount(raw: string, locale: 'en' | 'de' | 'eu'): number | null {
  let normalized = raw.replace(/\s/g, '');
  if (locale === 'de' || locale === 'eu') {
    normalized = normalized.replace(/\.(\d{3})/g, '$1').replace(/,\d+$/, '');
  } else {
    normalized = normalized.replace(/,(\d{3})/g, '$1');
  }
  const n = parseInt(normalized, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Extract job count from Serper response ────────────────────────────────────
// deno-lint-ignore no-explicit-any
function extractCount(serperData: any, locale: 'en' | 'de' | 'eu'): number | null {
  const snippets: string[] = (serperData?.organic ?? [])
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

  const totalRaw: string | undefined = serperData?.searchInformation?.totalResults;
  if (totalRaw) {
    const parsed = parseJobCount(totalRaw, 'en');
    if (parsed !== null && parsed < 500_000) return parsed;
  }

  return null;
}

// ── Query Serper for one role x region ───────────────────────────────────────
interface SerperResult {
  count: number | null;
  status: ScrapeStatus;
}

async function querySerper(
  serperKey: string,
  roleTitle: string,
  region: RegionConfig,
): Promise<SerperResult> {
  const query = `"${roleTitle}" jobs site:${region.site}`;

  let response: Response;
  try {
    response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 5, gl: region.code.toLowerCase() }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return { count: null, status: 'network_error' };
  }

  if (response.status === 429) return { count: null, status: 'rate_limited' };
  if (response.status === 403) return { count: null, status: 'source_blocked' };
  if (!response.ok)            return { count: null, status: 'network_error' };

  let data: unknown;
  try { data = await response.json(); } catch {
    return { count: null, status: 'parse_failed' };
  }

  const count = extractCount(data, region.numberLocale);
  return { count, status: count !== null ? 'success' : 'parse_failed' };
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
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

  let totalQueries = 0;
  let successCount = 0;
  let failureCount = 0;
  const summary: Record<string, Record<string, ScrapeStatus>> = {};

  for (const roleKey of ROLE_KEYS) {
    const roleTitle = roleKey.replace(/_/g, ' ');
    summary[roleKey] = {};

    const regionalOpenings: Record<string, {
      count: number | null; source: string; asOf: string; isLive: boolean; status: ScrapeStatus;
    }> = {};

    let indiaOpenings:  number | null = null;
    let globalOpenings: number | null = null;
    let anySuccess = false;
    let overallStatus: ScrapeStatus = serperKey ? 'parse_failed' : 'no_key';

    for (const region of REGIONS) {
      let result: SerperResult;
      if (!serperKey) {
        result = { count: null, status: 'no_key' };
      } else {
        result = await querySerper(serperKey, roleTitle, region);
        await sleep(600);
      }

      totalQueries++;
      summary[roleKey][region.code] = result.status;

      if (result.status === 'success') {
        successCount++;
        anySuccess = true;
        overallStatus = 'success';
      } else {
        failureCount++;
        if (overallStatus !== 'success') {
          if (result.status === 'source_blocked') overallStatus = 'source_blocked';
          else if (result.status === 'rate_limited' && overallStatus !== 'source_blocked') overallStatus = 'rate_limited';
          else if (result.status === 'network_error' && overallStatus === 'parse_failed') overallStatus = 'network_error';
        }
      }

      regionalOpenings[region.code] = {
        count:  result.count,
        source: region.countLabel,
        asOf:   dateAsOf,
        isLive: result.status === 'success',
        status: result.status,
      };

      if (region.code === 'IN') indiaOpenings = result.count;
    }

    const nonIndiaCounts = REGIONS
      .filter(r => r.code !== 'IN')
      .map(r => regionalOpenings[r.code]?.count)
      .filter((n): n is number => n !== null);
    if (nonIndiaCounts.length > 0) {
      globalOpenings = nonIndiaCounts.reduce((a, b) => a + b, 0);
    }

    // deno-lint-ignore no-explicit-any
    const payload: Record<string, any> = {
      role_key:          roleKey,
      india_openings:    indiaOpenings,
      global_openings:   globalOpenings,
      regional_openings: regionalOpenings,
      data_as_of:        dateAsOf,
      source:            anySuccess
        ? `Serper/${REGIONS.map(r => r.countLabel).join('+')} weekly refresh`
        : `Weekly refresh — ${overallStatus}`,
      is_live:           anySuccess,
      scrape_status:     overallStatus,
      updated_at:        nowIso,
    };

    if (anySuccess) {
      payload.last_successful_scrape_at = nowIso;
    }

    const { error } = await supabase
      .from('market_intelligence_cache')
      .upsert(payload, { onConflict: 'role_key' });

    if (error) {
      console.error(`[refresh-market-intelligence] Upsert failed for ${roleKey}:`, error.message);
    }
  }

  return new Response(JSON.stringify({
    refreshed: ROLE_KEYS.length,
    regions:   REGIONS.length,
    totalQueries,
    successCount,
    failureCount,
    summary,
  }), { headers: { 'Content-Type': 'application/json' } });
});
