// marketIntelligenceService.ts
// Live market intelligence cache — Supabase-backed, refreshed weekly.
//
// Architecture:
//   getCareerPathMarket() queries this service FIRST before the hardcoded
//   MARKET_DATA constants in careerPathMarket.ts. When Supabase has a fresh
//   record (< MARKET_DATA_STALE_DAYS old), live counts are returned.
//   When Supabase is unavailable or record is stale, the hardcoded baseline
//   is used with the staleness label rendered in the UI.
//
// Refresh path:
//   The 'refresh-market-intelligence' Supabase Edge Function (weekly cron)
//   calls Serper API to get live job counts from Naukri + LinkedIn, then
//   writes to market_intelligence_cache. See MARKET_INTELLIGENCE_SQL below
//   for the full DDL and cron schedule.

import { supabase } from '../utils/supabase';
import type { CareerPathMarket } from './careerPathMarket';
import { MARKET_DATA_STALE_DAYS } from './careerPathMarket';

// ── Row shape from Supabase market_intelligence_cache table ────────────────────
interface MarketCacheRow {
  id:                    string;
  role_key:              string;
  india_openings:        number | null;
  global_openings:       number | null;
  /** Per-region openings + sources (v40.0 — added by migration 20260522000002).
   *  Shape: { IN: { count: 1200, source: 'Naukri', asOf: '2026-05-19', isLive: true, status: 'success' }, ... }
   *  Eliminates the bug where Berlin users had Naukri (India) data injected into
   *  their LLM brief prompt. */
  regional_openings:     Record<string, {
    count:    number | null;
    source:   string;
    asOf?:    string;
    isLive?:  boolean;
    status?:  string;
  }> | null;
  demand_trend:          'surging' | 'growing' | 'stable' | 'contracting' | null;
  top_companies_india:   string[] | null;
  top_companies_global:  string[] | null;
  median_salary_delta:   number | null;
  success_rate_12m:      number | null;
  weeks_to_interview:    number | null;
  hiring_bar:            string | null;
  data_as_of:            string;        // ISO date — when numbers were measured
  source:                string | null;
  is_live:               boolean;       // true = from live API, false = research estimate
  updated_at:            string;        // ISO timestamp — when this row was written
  /** Operational freshness columns — added by migration 20260522000002. */
  scrape_status:              string | null; // 'success'|'parse_failed'|'rate_limited'|'source_blocked'|'network_error'|'no_key'
  last_successful_scrape_at:  string | null; // ISO timestamp — only set on 'success'; null on failure preserves last good time
  consecutive_failures:       number;        // reset to 0 on success
}

// ── Session cache — avoid repeated Supabase calls for same role ──────────────
const sessionCache = new Map<string, { row: MarketCacheRow | null; fetchedAt: number }>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes per session

// ── SQL constant — deploy once to set up the table + cron ─────────────────────
// Run this in the Supabase SQL editor to initialise the infrastructure.
export const MARKET_INTELLIGENCE_SQL = `
-- ═══════════════════════════════════════════════════════════════════
-- market_intelligence_cache — live job opening counts per role
-- Refreshed weekly by the refresh-market-intelligence Edge Function.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS market_intelligence_cache (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key             TEXT NOT NULL UNIQUE,
  india_openings       INTEGER,
  global_openings      INTEGER,
  demand_trend         TEXT CHECK (demand_trend IN ('surging','growing','stable','contracting')),
  top_companies_india  TEXT[],
  top_companies_global TEXT[],
  median_salary_delta  INTEGER,
  success_rate_12m     INTEGER,
  weeks_to_interview   INTEGER,
  hiring_bar           TEXT,
  data_as_of           DATE NOT NULL,
  source               TEXT,
  is_live              BOOLEAN NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mic_role_key    ON market_intelligence_cache (role_key);
CREATE INDEX IF NOT EXISTS idx_mic_updated_at  ON market_intelligence_cache (updated_at DESC);

-- ── Weekly refresh function (called by Edge Function + pg_cron) ────────────
-- The Edge Function 'refresh-market-intelligence' inserts/updates rows here.
-- RLS: allow the service_role (Edge Function) to write; authenticated users
-- can only SELECT.
ALTER TABLE market_intelligence_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_market_cache" ON market_intelligence_cache
  FOR SELECT USING (true);

CREATE POLICY "edge_function_write" ON market_intelligence_cache
  FOR ALL USING (auth.role() = 'service_role');

-- ── pg_cron weekly schedule (requires pg_cron extension) ──────────────────
-- Runs every Monday at 06:00 UTC via Supabase Edge Function invocation.
-- SELECT cron.schedule(
--   'refresh-market-intelligence-weekly',
--   '0 6 * * 1',
--   \$\$ SELECT net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/refresh-market-intelligence',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   ) \$\$
-- );
`;

// ── Core query function ────────────────────────────────────────────────────────

/**
 * Fetch a market intelligence record from Supabase cache.
 * Returns null when: table unavailable, role not found, or record stale.
 *
 * Callers should merge the returned partial data over the hardcoded baseline
 * from careerPathMarket.ts — the cache row only overrides fields that are
 * explicitly set (non-null).
 */
export async function getCachedMarketIntelligence(
  roleKey: string,
): Promise<Partial<CareerPathMarket> | null> {
  const cacheKey = roleKey.toLowerCase().trim();

  // Session cache hit
  const hit = sessionCache.get(cacheKey);
  if (hit && Date.now() - hit.fetchedAt < SESSION_TTL_MS) {
    return hit.row ? rowToPartialMarket(hit.row) : null;
  }

  try {
    const { data, error } = await supabase
      .from('market_intelligence_cache')
      .select('*')
      .eq('role_key', cacheKey)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      sessionCache.set(cacheKey, { row: null, fetchedAt: Date.now() });
      return null;
    }

    const row = data as MarketCacheRow;

    // Respect the same 90-day staleness threshold used in careerPathMarket.ts
    const ageDays = Math.round(
      (Date.now() - new Date(row.data_as_of).getTime()) / 86400000
    );
    if (ageDays > MARKET_DATA_STALE_DAYS) {
      console.info(
        `[MarketIntelligence] Cache hit for "${roleKey}" but stale (${ageDays}d). ` +
        `Falling through to hardcoded baseline.`
      );
      sessionCache.set(cacheKey, { row: null, fetchedAt: Date.now() });
      return null;
    }

    sessionCache.set(cacheKey, { row, fetchedAt: Date.now() });
    return rowToPartialMarket(row);
  } catch (err) {
    console.warn('[MarketIntelligence] Supabase query failed:', err);
    return null;
  }
}

/**
 * Write a refreshed market intelligence record to the Supabase cache.
 * Called by the 'refresh-market-intelligence' Edge Function.
 */
export async function writeMarketIntelligenceCache(
  roleKey: string,
  data: Omit<MarketCacheRow, 'id' | 'updated_at'>,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('market_intelligence_cache')
      .upsert(
        { ...data, role_key: roleKey, updated_at: new Date().toISOString() },
        { onConflict: 'role_key' }
      );
    if (error) throw error;
    // Invalidate session cache so next read gets fresh data
    sessionCache.delete(roleKey.toLowerCase().trim());
  } catch (err) {
    console.error('[MarketIntelligence] Write failed:', err);
  }
}

/**
 * Map a Supabase row to the CareerPathMarket partial shape.
 * Only non-null fields are included — callers merge this over the hardcoded baseline.
 */
function rowToPartialMarket(row: MarketCacheRow): Partial<CareerPathMarket> {
  // Build a dataSource label that conveys freshness AND failure cause to the UI.
  // SkillFreshnessLabel reads scrape_status directly from RoleDemandOverlay; this
  // label is used in the LLM brief prompt and the intelligence panel subtitle.
  let dataSource: string;
  if (row.scrape_status === 'source_blocked') {
    const lastOk = row.last_successful_scrape_at
      ? `last successful: ${row.last_successful_scrape_at.slice(0, 10)}`
      : 'no successful refresh on record';
    dataSource = `Source blocked by anti-bot protection (${lastOk})`;
  } else if (row.scrape_status === 'rate_limited') {
    const lastOk = row.last_successful_scrape_at
      ? `last successful: ${row.last_successful_scrape_at.slice(0, 10)}`
      : 'no successful refresh on record';
    dataSource = `Rate limited — serving previous data (${lastOk})`;
  } else if (row.scrape_status === 'no_key') {
    dataSource = `Research estimate — ${row.source ?? 'cached (no Serper key configured)'}`;
  } else if (row.is_live) {
    dataSource = `Live (weekly Serper refresh) — ${row.source ?? 'job boards'}`;
  } else {
    dataSource = `Research estimate — ${row.source ?? 'cached'}`;
  }

  const partial: Partial<CareerPathMarket> = {
    dataAsOf:   row.data_as_of,
    dataSource,
  };

  if (row.india_openings   != null) partial.indiaOpenings       = row.india_openings;
  if (row.global_openings  != null) partial.globalOpenings      = row.global_openings;
  if (row.regional_openings != null) partial.regionalOpenings   = row.regional_openings;
  if (row.demand_trend     != null) partial.demandTrend         = row.demand_trend;
  if (row.top_companies_india  != null) partial.topHiringCompaniesIndia  = row.top_companies_india;
  if (row.top_companies_global != null) partial.topHiringCompaniesGlobal = row.top_companies_global;
  if (row.median_salary_delta  != null) partial.medianSalaryDeltaPct     = row.median_salary_delta;
  if (row.success_rate_12m     != null) partial.successRate12mPct        = row.success_rate_12m;
  if (row.weeks_to_interview   != null) partial.weeksToFirstInterview    = row.weeks_to_interview;
  if (row.hiring_bar           != null) partial.hiringBar                = row.hiring_bar;

  return partial;
}

// ── Edge Function spec (for reference — deploy as Deno function) ─────────────
// File: supabase/functions/refresh-market-intelligence/index.ts
//
// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
//
// const ROLE_KEYS = [
//   'ai_llm_systems_engineer', 'ml_engineer', 'platform_engineer',
//   'data_engineer', 'security_engineer', 'product_manager',
//   'fp_a_ai_analyst', 'risk_ai_analyst', 'cfo_advisor',
//   'people_analytics_specialist', 'hrbp_ai_specialist',
//   'content_strategist_ai', 'qa_automation_engineer', 'technical_writer_ai',
// ];
//
// serve(async () => {
//   const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
//   const serperKey = Deno.env.get('SERPER_API_KEY');
//
//   for (const roleKey of ROLE_KEYS) {
//     try {
//       // Build Naukri search query from role key
//       const roleTitle = roleKey.replace(/_/g, ' ');
//       const query = `"${roleTitle}" jobs India site:naukri.com`;
//       let indiaOpenings: number | null = null;
//       let isLive = false;
//
//       if (serperKey) {
//         const res = await fetch('https://google.serper.dev/search', {
//           method: 'POST',
//           headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
//           body: JSON.stringify({ q: query, num: 10 }),
//         });
//         if (res.ok) {
//           const data = await res.json();
//           // Extract job count from organic result snippets
//           const countMatch = data?.organic?.[0]?.snippet?.match(/(\d[\d,]+)\s+(?:jobs?|openings?)/i);
//           if (countMatch) {
//             indiaOpenings = parseInt(countMatch[1].replace(/,/g, ''), 10);
//             isLive = true;
//           }
//         }
//       }
//
//       await supabase.from('market_intelligence_cache').upsert({
//         role_key: roleKey,
//         india_openings: indiaOpenings,
//         data_as_of: new Date().toISOString().slice(0, 10),
//         source: isLive ? 'Serper/Naukri weekly refresh' : 'Baseline estimate',
//         is_live: isLive,
//         updated_at: new Date().toISOString(),
//       }, { onConflict: 'role_key' });
//     } catch (err) {
//       console.error(`[refresh-market-intelligence] Failed for ${roleKey}:`, err);
//     }
//   }
//
//   return new Response(JSON.stringify({ refreshed: ROLE_KEYS.length }), {
//     headers: { 'Content-Type': 'application/json' },
//   });
// });
