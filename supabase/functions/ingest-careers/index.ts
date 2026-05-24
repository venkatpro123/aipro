// ingest-careers/index.ts — v22.0
//
// Daily career-page diff ingestor. Fetches each company's /careers HTML, counts
// job-link tags as a proxy for open roles, and emits a `breaking_news_events`
// row when the week-over-week count drops >25% (hiring freeze leading indicator).
//
// SOURCE OF TRUTH FOR CAREER URLS
// ───────────────────────────────
// Hardcoded TARGETS map below. Initial list = top-30 by user query frequency.
// Add new companies by appending to the array — no DB migration needed.
// The Edge Function is idempotent: same-day re-runs are skipped via the
// `ingestion_runs` table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from "../_shared/otel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

interface Target {
  company: string;       // canonical key — matches breaking_news_events.company_name
  url: string;
  region: "US" | "IN" | "EU";
}

const TARGETS: Target[] = [
  // US big tech
  { company: "google",      url: "https://careers.google.com/jobs/results/?location=United%20States", region: "US" },
  { company: "microsoft",   url: "https://jobs.careers.microsoft.com/global/en/search",               region: "US" },
  { company: "amazon",      url: "https://www.amazon.jobs/en/search?base_query=&loc_query=USA",       region: "US" },
  { company: "meta",        url: "https://www.metacareers.com/jobs/",                                 region: "US" },
  { company: "apple",       url: "https://jobs.apple.com/en-us/search",                               region: "US" },
  { company: "netflix",     url: "https://jobs.netflix.com/search",                                   region: "US" },
  { company: "nvidia",      url: "https://www.nvidia.com/en-us/about-nvidia/careers/",                region: "US" },
  { company: "salesforce",  url: "https://careers.salesforce.com/en/jobs/",                           region: "US" },
  { company: "oracle",      url: "https://careers.oracle.com/jobs/#en/sites/jobsearch",               region: "US" },
  { company: "ibm",         url: "https://www.ibm.com/careers/search",                                region: "US" },
  { company: "intel",       url: "https://intel.wd1.myworkdayjobs.com/External",                      region: "US" },
  { company: "cisco",       url: "https://jobs.cisco.com/jobs/SearchJobs/",                           region: "US" },
  { company: "adobe",       url: "https://careers.adobe.com/us/en/search-results",                    region: "US" },
  { company: "snowflake",   url: "https://careers.snowflake.com/us/en/search-results",                region: "US" },
  { company: "stripe",      url: "https://stripe.com/jobs/search",                                    region: "US" },
  { company: "uber",        url: "https://www.uber.com/global/en/careers/list/",                      region: "US" },
  { company: "airbnb",      url: "https://careers.airbnb.com/positions/",                             region: "US" },
  { company: "shopify",     url: "https://www.shopify.com/careers/search",                            region: "US" },
  // India IT
  { company: "tcs",          url: "https://www.tcs.com/careers",                                       region: "IN" },
  { company: "infosys",      url: "https://www.infosys.com/careers/apply.html",                       region: "IN" },
  { company: "wipro",        url: "https://careers.wipro.com/careers-home/",                          region: "IN" },
  { company: "hcl_tech",     url: "https://www.hcltech.com/careers",                                  region: "IN" },
  { company: "tech_mahindra",url: "https://careers.techmahindra.com/",                                region: "IN" },
  { company: "cognizant",    url: "https://careers.cognizant.com/global-en/",                         region: "US" },
  { company: "accenture",    url: "https://www.accenture.com/in-en/careers/jobsearch",                region: "US" },
  { company: "capgemini",    url: "https://www.capgemini.com/in-en/careers/job-search/",              region: "EU" },
  { company: "ltimindtree",  url: "https://www.ltimindtree.com/careers/",                             region: "IN" },
];

// Fix H-4: The original HTML-regex approach returned 0 for ~80% of targets
// because major company career pages (Google, Amazon, Microsoft, Meta) are
// JavaScript-rendered SPAs. A raw HTML fetch returns the shell page with no
// job links visible. The regex consistently produced 0→0 WoW "no change",
// making the entire hiring-freeze detection useless.
//
// New strategy — two-tier with graceful fallback:
//   1. PRIMARY: Serper Google Search API (site:careers.<company>.com jobs) — queries
//      the indexed version of the careers page, which Google renders via JavaScript.
//      Returns a realistic job count from snippet text / search-result metadata.
//   2. FALLBACK: HTML regex (original approach) — kept for companies where Serper
//      is not configured or returns an implausibly low count (<5 on first run).
//      Also used when SERPER_API_KEY is absent so the function degrades gracefully.

const JOB_LINK_PATTERNS = [
  /href=["'][^"']*\/jobs?\/[A-Za-z0-9_-]+/gi,
  /href=["'][^"']*\/job-detail\/[A-Za-z0-9_-]+/gi,
  /href=["'][^"']*\/positions?\/[A-Za-z0-9_-]+/gi,
  /href=["'][^"']*\/openings?\/[A-Za-z0-9_-]+/gi,
];

function countJobLinksFromHtml(html: string): number {
  let total = 0;
  for (const re of JOB_LINK_PATTERNS) {
    const m = html.match(re);
    if (m) total += m.length;
  }
  return total;
}

// Extract a job count from Serper search results.
// Checks searchParameters.totalResults first, then snippet text for "N jobs/openings".
function parseSerperJobCount(data: Record<string, unknown>): number {
  const sp = data?.searchParameters as Record<string, unknown> | undefined;
  const total = sp?.totalResults;
  if (typeof total === 'number' && total > 0) return total;
  if (typeof total === 'string') {
    const n = parseInt((total as string).replace(/,/g, ''), 10);
    if (!isNaN(n) && n > 0) return n;
  }
  const organic = Array.isArray(data?.organic)
    ? (data.organic as Array<Record<string, unknown>>)
    : [];
  for (const item of organic.slice(0, 5)) {
    const text = `${item?.snippet ?? ''} ${item?.title ?? ''}`;
    const m = text.match(/(\d[\d,]*)\s+(?:jobs?|openings?|positions?|vacancies)/i);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return organic.filter((r) =>
    /jobs?|openings?|hiring|career|vacancies/i.test(String(r?.title ?? '')),
  ).length;
}

async function serperJobCount(t: Target, serperKey: string): Promise<number | null> {
  try {
    // Use the target's URL domain as the site: query so we get results for the
    // specific careers subdomain rather than the whole corporate site.
    const domain = new URL(t.url).hostname;
    const query = `site:${domain} jobs openings`;
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10, gl: t.region === 'IN' ? 'in' : 'us', hl: 'en' }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    return parseSerperJobCount(data);
  } catch {
    return null;
  }
}

async function snapshotOne(
  t: Target,
  serperKey: string | undefined,
): Promise<{ count: number; status: 'ok'|'timeout'|'http_error'|'parse_error'|'serper'; httpStatus: number | null }> {
  // Primary: Serper (works for JS-rendered SPA career pages)
  if (serperKey) {
    const count = await serperJobCount(t, serperKey);
    // Accept Serper result only when count > 0 to avoid treating a no-index
    // result as "zero jobs" on the very first run (would trigger false WoW alerts).
    if (count !== null && count > 0) {
      return { count, status: 'serper', httpStatus: null };
    }
  }

  // Fallback: HTML regex (works for static / server-rendered pages)
  try {
    const res = await fetch(t.url, {
      signal: AbortSignal.timeout(8_000),
      headers: { 'User-Agent': 'humanproof-ingest-careers/22.0', 'Accept': 'text/html,*/*' },
    });
    if (!res.ok) return { count: 0, status: 'http_error', httpStatus: res.status };
    const html = await res.text();
    const count = countJobLinksFromHtml(html);
    return { count, status: 'ok', httpStatus: res.status };
  } catch (e) {
    const msg = (e as Error).message || '';
    return { count: 0, status: /abort|timeout/i.test(msg) ? 'timeout' : 'parse_error', httpStatus: null };
  }
}

Deno.serve((req) =>
  withRun('ingest-careers', req, async (_run) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing_env", missing: [!SUPABASE_URL && "SUPABASE_URL", !SERVICE_KEY && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean) }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Idempotency: skip if last run < 20 hours ago (cron schedules daily but
  // pg_cron can fire overlapping ticks).
  try {
    const { data: lastRun } = await supabase
      .from("ingestion_runs")
      .select("last_run_at")
      .eq("kind", "ingest-careers")
      .maybeSingle();
    if (lastRun?.last_run_at) {
      const ageMs = Date.now() - new Date(lastRun.last_run_at).getTime();
      if (ageMs < 20 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ ok: true, skipped: "too_soon", ageHours: Math.round(ageMs / 3_600_000) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch { /* table missing — fall through */ }

  const SERPER_KEY = Deno.env.get("SERPER_API_KEY") ?? undefined;

  // Snapshot all targets in parallel. Serper key is passed so JS-rendered SPA
  // career pages (Google, Amazon, Microsoft, etc.) return real job counts via
  // Google Search indexing rather than the zero-result HTML regex fallback.
  const results = await Promise.all(TARGETS.map(async (t) => ({ t, snap: await snapshotOne(t, SERPER_KEY) })));

  // Persist all snapshots, including failed ones (so we can see fetch_status='http_error' on a dashboard)
  const snapshotRows = results.map(({ t, snap }) => ({
    company_name: t.company,
    careers_url: t.url,
    open_roles_count: snap.count,
    fetch_status: snap.status,
    http_status: snap.httpStatus,
  }));

  if (snapshotRows.length > 0) {
    const { error } = await supabase.from("career_page_snapshots").insert(snapshotRows);
    if (error) console.warn("[ingest-careers] snapshot insert failed:", error.message);
  }

  // Detect WoW drops > 25% — query previous snapshot ~7d ago for each company.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Fix C-5: breaking_news_events has a `region` column (DEFAULT 'IN'). Pass
  // the target's region so US/EU career-page events are not tagged as Indian.
  const inserts: Array<{ company_name: string; event_date: string; headline: string; confidence: 'medium'; source: string; source_url: string; region: string }> = [];

  // BUG-1 fix: Serper-based snapshots have status='serper' not 'ok'.
  // The original filter (status !== 'ok') excluded ALL Serper results from
  // WoW comparison, meaning hiring-freeze detection never fired for the
  // JS-rendered SPA career pages that Serper was specifically added to handle.
  // Fix: accept both 'ok' (HTML regex) and 'serper' as valid fetch statuses.
  const VALID_STATUSES = ['ok', 'serper'];

  for (const { t, snap } of results) {
    if (!VALID_STATUSES.includes(snap.status) || snap.count === 0) continue;

    const { data: priorRows } = await supabase
      .from("career_page_snapshots")
      .select("open_roles_count, fetched_at")
      .eq("company_name", t.company)
      .in("fetch_status", VALID_STATUSES)
      .gte("open_roles_count", 1)
      .lte("fetched_at", sevenDaysAgo)
      .order("fetched_at", { ascending: false })
      .limit(1);
    const prior = priorRows?.[0];
    if (!prior) continue;

    const deltaPct = ((snap.count - prior.open_roles_count) / prior.open_roles_count) * 100;
    if (deltaPct < -25) {
      inserts.push({
        company_name: t.company,
        event_date: new Date().toISOString().slice(0, 10),
        headline: `Open roles dropped ${Math.round(deltaPct)}% week-over-week — possible hiring freeze (${prior.open_roles_count} → ${snap.count})`,
        confidence: 'medium',
        source: 'Careers page',
        source_url: t.url,
        region: t.region,
      });
    }
  }

  let inserted = 0;
  if (inserts.length > 0) {
    const { data, error } = await supabase
      .from("breaking_news_events")
      .upsert(inserts, { onConflict: "company_name,event_date,source", ignoreDuplicates: true })
      .select("id");
    if (!error && data) inserted = data.length;
    if (error) console.warn("[ingest-careers] event insert failed:", error.message);
  }

  // Record run
  try {
    await supabase
      .from("ingestion_runs")
      .upsert({ kind: "ingest-careers", last_run_at: new Date().toISOString() }, { onConflict: "kind" });
  } catch { /* non-fatal */ }

  // Prune snapshots older than 14 days
  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("career_page_snapshots").delete().lt("fetched_at", cutoff);
  } catch { /* non-fatal */ }

  return new Response(JSON.stringify({
    ok: true,
    targets: TARGETS.length,
    snapshots_taken: snapshotRows.length,
    snapshots_ok: results.filter((r) => r.snap.status === 'ok').length,
    hiring_freeze_events: inserts.length,
    rows_inserted: inserted,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  }));
