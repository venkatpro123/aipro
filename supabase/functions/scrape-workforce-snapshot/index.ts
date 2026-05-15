// scrape-workforce-snapshot/index.ts — WS3
//
// Weekly cron that populates workforce_snapshots. Without this function,
// stealthLayoffDetector has no data and its 6-month velocity view is empty.
//
// Data sources (in priority order):
//
//   1. company_intelligence.employee_count — read directly from the
//      intelligence DB. This is the most reliable cross-company source
//      since the workforce_metrics + company_intelligence pipelines
//      already write it. The cron simply takes a weekly snapshot.
//
//   2. Wikipedia API — the existing scrapingHubConnector path already
//      extracts headcount from Wikipedia infoboxes. We mirror the same
//      logic here so this cron is self-contained and runs in Deno.
//
//   3. (Future) LinkedIn employee count — gated behind a manual feed
//      because LinkedIn aggressively blocks bots. Left as a documented
//      stub; ops can backfill via the API client when they have a
//      sanctioned data source.
//
// Each successful read writes a row into workforce_snapshots keyed on
// (company_canonical_name, source, observed_week). UNIQUE constraint
// makes re-runs in the same week idempotent.
//
// Triggering:
//   * Scheduled by the v35 cron migration (Mondays 02:00 UTC,
//     ahead of recalibrate-engine and coverage-audit).
//   * Manually invokable POST { companies: ['Meta', 'TCS'] } for
//     targeted backfill.
//
// Scope cap:
//   * Each run processes at most MAX_COMPANIES_PER_RUN companies.
//   * The cron migration provides a follow-up scheduling primitive so
//     the entire intelligence DB can be covered across rolling weeks.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun, corsHeaders } from '../_shared/otel.ts';

const MAX_COMPANIES_PER_RUN = 200;

interface CompanyIntelligenceRow {
  company_name: string;
  employee_count: number | null;
  region: string | null;
}

interface SnapshotRow {
  company_canonical_name: string;
  observed_week: string;
  source: 'wikipedia' | 'yahoo-fte' | 'sec-edgar' | 'linkedin' | 'career-page' | 'naukri-listed' | 'manual';
  employee_count: number;
  measurement_confidence: number;
  observed_at: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** ISO date anchored to the Monday of the observation week (UTC). */
function mondayOfThisWeek(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const dow = d.getUTCDay(); // 0 = Sun
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function isPlausibleHeadcount(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 10 && n <= 5_000_000;
}

function canonicalName(name: string): string {
  return name.trim();
}

// ── Wikipedia fetch ─────────────────────────────────────────────────────────

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

async function fetchWikipediaHeadcount(companyName: string): Promise<number | null> {
  try {
    const url = new URL(WIKI_API);
    url.searchParams.set('action', 'query');
    url.searchParams.set('prop', 'revisions');
    url.searchParams.set('rvprop', 'content');
    url.searchParams.set('rvslots', 'main');
    url.searchParams.set('format', 'json');
    url.searchParams.set('titles', companyName);
    url.searchParams.set('formatversion', '2');
    url.searchParams.set('redirects', '1');

    const res = await fetch(url, {
      headers: { 'User-Agent': 'HumanProof-WorkforceSnapshot/1.0 (contact@humanproof.ai)' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const page = body?.query?.pages?.[0];
    const content: string | undefined = page?.revisions?.[0]?.slots?.main?.content;
    if (!content) return null;

    // Template-aware regex: matches `| num_employees = X` AND `| employees = X`
    // forms with optional {{formatnum:...}} / approximate / range / unit suffixes.
    const patterns: RegExp[] = [
      /\|\s*(?:num_)?employees\s*=\s*(?:\{\{\s*formatnum\s*:\s*)?(~?\s*)?(\d[\d,]*)/i,
      /\|\s*staff\s*=\s*(?:\{\{\s*formatnum\s*:\s*)?(~?\s*)?(\d[\d,]*)/i,
    ];
    for (const re of patterns) {
      const m = content.match(re);
      if (m && m[2]) {
        const cleaned = m[2].replace(/,/g, '').trim();
        const n = parseInt(cleaned, 10);
        if (isPlausibleHeadcount(n)) return n;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── DB snapshot ─────────────────────────────────────────────────────────────

async function fetchEligibleCompanies(
  supabase: ReturnType<typeof createClient>,
  filterNames: string[] | undefined,
): Promise<CompanyIntelligenceRow[]> {
  let q = supabase
    .from('company_intelligence')
    .select('company_name,employee_count,region')
    .order('company_name', { ascending: true })
    .limit(MAX_COMPANIES_PER_RUN);
  if (filterNames && filterNames.length > 0) {
    q = q.in('company_name', filterNames);
  }
  const { data, error } = await q;
  if (error) throw new Error(`company_intelligence fetch failed: ${error.message}`);
  return (data ?? []) as CompanyIntelligenceRow[];
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve((req) =>
  withRun('scrape-workforce-snapshot', req, async (run) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    let filterCompanies: string[] | undefined;
    let preferWikipedia = false;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (Array.isArray(body?.companies)) filterCompanies = body.companies as string[];
        if (typeof body?.preferWikipedia === 'boolean') preferWikipedia = body.preferWikipedia;
      } catch {
        // body is optional
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const week = mondayOfThisWeek();
    const observedAt = new Date().toISOString();
    const companies = await fetchEligibleCompanies(supabase, filterCompanies);
    run.setItemsIn(companies.length);

    const snapshots: SnapshotRow[] = [];
    const wikipediaAttempts: Array<{ company: string; result: 'hit' | 'miss' }> = [];

    for (const c of companies) {
      const name = canonicalName(c.company_name);
      if (!name) continue;

      // Source 1: company_intelligence (always preferred if plausible).
      if (!preferWikipedia && isPlausibleHeadcount(c.employee_count)) {
        snapshots.push({
          company_canonical_name: name,
          observed_week: week,
          source: 'sec-edgar', // company_intelligence pipeline ultimately backs to SEC for public cos
          employee_count: c.employee_count!,
          measurement_confidence: 0.90,
          observed_at: observedAt,
        });
        continue;
      }

      // Source 2: Wikipedia (slower; used as backup or when explicitly preferred).
      const wikiCount = await fetchWikipediaHeadcount(name);
      if (wikiCount != null) {
        snapshots.push({
          company_canonical_name: name,
          observed_week: week,
          source: 'wikipedia',
          employee_count: wikiCount,
          measurement_confidence: 0.78,
          observed_at: observedAt,
        });
        wikipediaAttempts.push({ company: name, result: 'hit' });
      } else {
        wikipediaAttempts.push({ company: name, result: 'miss' });
      }
    }

    run.addMeta('wiki_hits', wikipediaAttempts.filter((w) => w.result === 'hit').length);
    run.addMeta('wiki_misses', wikipediaAttempts.filter((w) => w.result === 'miss').length);

    if (snapshots.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, observed_week: week, written: 0, scanned: companies.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Upsert via the UNIQUE (company_canonical_name, source, observed_week)
    // constraint — re-running within the same week is a no-op.
    const { error, count } = await supabase
      .from('workforce_snapshots')
      .upsert(snapshots, {
        onConflict: 'company_canonical_name,source,observed_week',
        ignoreDuplicates: true,
        count: 'exact',
      });
    if (error) {
      run.recordFallback({
        layerId: 'workforce_snapshots_upsert',
        reason: 'exception',
        errorMessage: error.message,
      });
      throw new Error(`workforce_snapshots upsert failed: ${error.message}`);
    }

    run.setItemsOut(count ?? snapshots.length);

    return new Response(
      JSON.stringify({
        ok: true,
        observed_week: week,
        scanned: companies.length,
        written: count ?? snapshots.length,
        wiki_hits: wikipediaAttempts.filter((w) => w.result === 'hit').length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }),
);
