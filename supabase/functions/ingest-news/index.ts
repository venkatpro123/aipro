// ingest-news/index.ts — v22.0
//
// Central server-side breaking-news ingestor. Replaces the browser RSS poller
// as the authoritative source for `breaking_news_events`.
//
// LATENCY BUDGET
// ──────────────
// pg_cron fires every 10 minutes → this function runs.
// Per-source timeout: 5s. Per-LLM-call timeout: 6s. Hard cap 50 LLM calls per
// run so total cost is bounded (~$1-3/mo on Gemini Flash).
//
// IDEMPOTENCY
// ───────────
// `breaking_news_events` has `UNIQUE (company_name, event_date, source)`. We
// INSERT ... ON CONFLICT DO NOTHING. Re-runs are safe.
//
// FAILURE MODES
// ─────────────
// Per-source: timeout / 5xx / parse error → log + skip + circuit-record. We
// never throw out of the top-level handler; the cron must always see 200 to
// avoid pg_cron retry storms.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { parseRssXml, type ParsedFeedItem } from "../_shared/rssParse.ts";
import { canonicaliseCompanyName } from "../_shared/companyAliases.ts";
// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from "../_shared/otel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

// ── Market-specific news source registry ─────────────────────────────────────
//
// DESIGN: Organised by source_market (the geographic focus of the publication,
// NOT the region of the affected company). Every run fetches ALL sources so
// detection latency is bounded by the 10-minute cron period, not by how quickly
// US sources re-publish non-US news.
//
// LATENCY IMPROVEMENT: Before this registry, UK/SG/DE/IN news was only detected
// when US-focused sources (TechCrunch, HN) picked it up — 6-12 hour lag.
// Now each market is covered by its own specialist publications → 2-3 hour lag.
//
// source_market is also written to breaking_news_events so the BreakingNewsCard
// can label "Source: TechInAsia · APAC" instead of just a bare URL.
//
// RSS NOTES:
//   - Bloomberg has no public RSS; Bloomberg Tech URL returns 404 — skip.
//   - ChannelNewsAsia: the /business RSS endpoint requires correct format param.
//   - Handelsblatt: paywall content; RSS items still carry company names in titles.
//   - All feeds are fetched with a 5-second timeout; failures are logged + skipped.

interface Source {
  name: string;
  url: string;
  /** ISO-2 country code or region key for the source_market DB column */
  source_market: string;
  type: "rss" | "reddit_json";
  /** Source-confidence floor. Reddit defaults to low; SEC/WARN press get medium-or-high upstream. */
  baseConfidence: "high" | "medium" | "low";
  /** Legacy region field — used for regionMap resolution when LLM extraction returns 'other' */
  region: "US" | "IN" | "EU" | "GLOBAL" | "SG" | "CA" | "LATAM";
}

// ── Global sources — fetched every run regardless of market ──────────────────
const GLOBAL_SOURCES: Source[] = [
  { name: "Layoffs FYI",                    url: "https://layoffs.fyi/feed",                                          source_market: "GLOBAL", region: "GLOBAL", type: "rss",         baseConfidence: "high"   },
  { name: "Hacker News",                    url: "https://hnrss.org/frontpage",                                       source_market: "US",     region: "US",     type: "rss",         baseConfidence: "low"    },
  { name: "Reddit r/layoffs",               url: "https://www.reddit.com/r/layoffs/new.json?limit=50",               source_market: "US",     region: "US",     type: "reddit_json", baseConfidence: "low"    },
  { name: "Reddit r/cscareerquestions",     url: "https://www.reddit.com/r/cscareerquestions/new.json?limit=50",     source_market: "US",     region: "US",     type: "reddit_json", baseConfidence: "low"    },
];

// ── Market-specific sources ───────────────────────────────────────────────────
const MARKET_NEWS_SOURCES: Record<string, Source[]> = {

  US: [
    { name: "TechCrunch Layoffs",            url: "https://techcrunch.com/tag/layoffs/feed/",                          source_market: "US",     region: "US",     type: "rss", baseConfidence: "medium" },
    { name: "Wired Layoffs",                  url: "https://www.wired.com/feed/tag/layoffs/rss",                        source_market: "US",     region: "US",     type: "rss", baseConfidence: "medium" },
    { name: "The Information Tech",           url: "https://www.theinformation.com/feed",                               source_market: "US",     region: "US",     type: "rss", baseConfidence: "medium" },
    { name: "Business Insider Tech",          url: "https://www.businessinsider.com/rss",                               source_market: "US",     region: "US",     type: "rss", baseConfidence: "low"    },
  ],

  UK: [
    { name: "The Register",                   url: "https://www.theregister.com/headlines.rss",                         source_market: "UK",     region: "EU",     type: "rss", baseConfidence: "medium" },
    { name: "Tech.eu",                        url: "https://tech.eu/feed/",                                             source_market: "UK",     region: "EU",     type: "rss", baseConfidence: "medium" },
    { name: "City A.M. Tech",                 url: "https://www.cityam.com/feed/",                                      source_market: "UK",     region: "EU",     type: "rss", baseConfidence: "medium" },
    { name: "Sifted.eu",                      url: "https://sifted.eu/articles/feed/",                                  source_market: "UK",     region: "EU",     type: "rss", baseConfidence: "medium" },
    { name: "Computer Weekly",                url: "https://www.computerweekly.com/rss/latest-news.xml",                source_market: "UK",     region: "EU",     type: "rss", baseConfidence: "medium" },
  ],

  DE: [
    { name: "Handelsblatt",                   url: "https://www.handelsblatt.com/rss/nachrichten.rss",                  source_market: "DE",     region: "EU",     type: "rss", baseConfidence: "medium" },
    { name: "Gründerszene",                   url: "https://www.gruenderszene.de/feed",                                  source_market: "DE",     region: "EU",     type: "rss", baseConfidence: "medium" },
    { name: "t3n Magazin",                    url: "https://t3n.de/rss.xml",                                            source_market: "DE",     region: "EU",     type: "rss", baseConfidence: "medium" },
  ],

  FR: [
    { name: "Usine Digitale",                 url: "https://www.usine-digitale.fr/rss/all.xml",                         source_market: "FR",     region: "EU",     type: "rss", baseConfidence: "medium" },
    { name: "Maddyness",                      url: "https://www.maddyness.com/feed/",                                   source_market: "FR",     region: "EU",     type: "rss", baseConfidence: "medium" },
  ],

  SG: [
    { name: "TechInAsia",                     url: "https://www.techinasia.com/feed",                                   source_market: "SG",     region: "SG",     type: "rss", baseConfidence: "medium" },
    { name: "e27.co",                         url: "https://e27.co/feed/",                                              source_market: "SG",     region: "SG",     type: "rss", baseConfidence: "medium" },
    { name: "DealStreetAsia",                 url: "https://www.dealstreetasia.com/feed/",                              source_market: "SG",     region: "SG",     type: "rss", baseConfidence: "medium" },
    { name: "ChannelNewsAsia Business",       url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511", source_market: "SG", region: "SG", type: "rss", baseConfidence: "medium" },
    { name: "KrASIA",                         url: "https://kr.asia/feed",                                              source_market: "SG",     region: "SG",     type: "rss", baseConfidence: "medium" },
  ],

  IN: [
    { name: "Inc42",                          url: "https://inc42.com/feed/",                                           source_market: "IN",     region: "IN",     type: "rss", baseConfidence: "medium" },
    { name: "Entrackr",                       url: "https://entrackr.com/feed/",                                        source_market: "IN",     region: "IN",     type: "rss", baseConfidence: "medium" },
    { name: "YourStory",                      url: "https://yourstory.com/feed",                                        source_market: "IN",     region: "IN",     type: "rss", baseConfidence: "medium" },
    { name: "NDTV Profit Business",           url: "https://www.ndtvprofit.com/feed",                                   source_market: "IN",     region: "IN",     type: "rss", baseConfidence: "medium" },
    // Retained from v22 — high signal-to-noise for India IT sector
    { name: "Moneycontrol Business",          url: "https://www.moneycontrol.com/rss/business.xml",                    source_market: "IN",     region: "IN",     type: "rss", baseConfidence: "medium" },
    { name: "ET Markets",                     url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", source_market: "IN", region: "IN",   type: "rss", baseConfidence: "medium" },
    { name: "The Hindu Business",             url: "https://www.thehindu.com/business/feeder/default.rss",              source_market: "IN",     region: "IN",     type: "rss", baseConfidence: "medium" },
  ],

  LATAM: [
    { name: "Contxto",                        url: "https://contxto.com/en/feed/",                                      source_market: "LATAM",  region: "LATAM",  type: "rss", baseConfidence: "medium" },
    { name: "Bloomberg Línea",                url: "https://www.bloomberglinea.com/rss/",                               source_market: "LATAM",  region: "LATAM",  type: "rss", baseConfidence: "medium" },
  ],

  CA: [
    { name: "BetaKit",                        url: "https://betakit.com/feed/",                                         source_market: "CA",     region: "CA",     type: "rss", baseConfidence: "medium" },
    { name: "The Logic Canada",               url: "https://thelogic.co/feed/",                                         source_market: "CA",     region: "CA",     type: "rss", baseConfidence: "medium" },
  ],
};

// Flat list for the pipeline: global + all regional markets, deduped by URL
const SOURCES: Source[] = (() => {
  const seen = new Set<string>();
  const flat: Source[] = [];
  for (const src of [...GLOBAL_SOURCES, ...Object.values(MARKET_NEWS_SOURCES).flat()]) {
    if (!seen.has(src.url)) { seen.add(src.url); flat.push(src); }
  }
  return flat;
})();

// ── Pre-filter — keyword + capitalized-token gate ─────────────────────────────
// Mirrors breakingNewsPoller.ts:59-64. The capitalized token requirement
// excludes generic discussions ("layoffs are bad") and demands at least one
// proper-noun candidate (a company name or person name).
const LAYOFF_KEYWORDS = [
  "layoff", "lay off", "laid off", "job cut", "retrench",
  "reduce workforce", "workforce reduction", "headcount cut", "headcount reduction",
  "job loss", "redundancy", "downsizing", "restructur", "firing employees",
  "cut jobs", "eliminate jobs", "eliminate positions",
];
const CAPITALIZED_TOKEN_RE = /\b[A-Z][A-Za-z0-9&.]{2,}\b/;

function passesPreFilter(text: string): boolean {
  const lower = text.toLowerCase();
  const hasKw = LAYOFF_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasKw) return false;
  return CAPITALIZED_TOKEN_RE.test(text);
}

// ── Reddit JSON shape ──────────────────────────────────────────────────────────
interface RedditPost {
  data: { title: string; selftext: string; url: string; created_utc: number; permalink: string };
}

async function fetchSource(src: Source): Promise<ParsedFeedItem[]> {
  try {
    const res = await fetch(src.url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "humanproof-ingest-news/22.0" },
    });
    if (!res.ok) throw new Error(`${src.name} ${res.status}`);

    if (src.type === "reddit_json") {
      const body = (await res.json()) as { data?: { children?: RedditPost[] } };
      const posts = body.data?.children ?? [];
      return posts.slice(0, 30).map((p): ParsedFeedItem => ({
        title: String(p.data?.title ?? ""),
        link: `https://www.reddit.com${p.data?.permalink ?? ""}`,
        description: String(p.data?.selftext ?? "").slice(0, 500),
        pubDate: p.data?.created_utc
          ? new Date(p.data.created_utc * 1000).toISOString()
          : new Date().toISOString(),
      }));
    }

    const text = await res.text();
    return parseRssXml(text, 30);
  } catch (e) {
    console.warn(`[ingest-news] ${src.name} failed:`, (e as Error).message);
    return [];
  }
}

// ── LLM extraction call (Phase 2 — populated below) ───────────────────────────
interface LlmExtraction {
  isLayoff: boolean;
  companyName: string | null;
  aliases: string[];
  percentCut: number | null;
  affectedCount: number | null;
  confidence: "high" | "medium" | "low";
  region: "US" | "IN" | "EU" | "other";
  eventDate: string | null;
  industry: string | null;
}

async function extractWithLlm(
  supabaseUrl: string,
  serviceKey: string,
  headline: string,
  snippet: string,
): Promise<LlmExtraction | null> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/llm-analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        mode: "news_entity_extraction",
        headline,
        snippet: snippet.slice(0, 500),
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.extraction) return null;
    return json.extraction as LlmExtraction;
  } catch (e) {
    console.warn("[ingest-news] LLM extraction failed:", (e as Error).message);
    return null;
  }
}

// ── Main ingest pipeline ──────────────────────────────────────────────────────
Deno.serve((req) =>
  withRun('ingest-news', req, async (_run) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_KEY) {
    // 503 (not 200/500) so pg_cron records the run as failed and surfaces the
    // misconfiguration in cron.job_run_details instead of silently looping.
    return new Response(
      JSON.stringify({ ok: false, error: "missing_env", missing: [!SUPABASE_URL && "SUPABASE_URL", !SERVICE_KEY && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean) }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Idempotency guard — short-circuit if last successful run < 8min ago.
  // Uses single-row `ingestion_runs` table created by the v22 migration.
  try {
    const { data: lastRun } = await supabase
      .from("ingestion_runs")
      .select("last_run_at")
      .eq("kind", "ingest-news")
      .maybeSingle();
    if (lastRun?.last_run_at) {
      const ageMs = Date.now() - new Date(lastRun.last_run_at).getTime();
      if (ageMs < 8 * 60 * 1000) {
        return new Response(JSON.stringify({ ok: true, skipped: "too_soon", ageMs }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch { /* table missing on first deploy — fall through */ }

  // ── Fetch all sources in parallel ──────────────────────────────────────────
  const results = await Promise.allSettled(SOURCES.map((s) => fetchSource(s).then((items) => ({ src: s, items }))));
  const allItems: { src: Source; item: ParsedFeedItem }[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const item of r.value.items) {
        allItems.push({ src: r.value.src, item });
      }
    }
  }

  // ── Pre-filter ─────────────────────────────────────────────────────────────
  const candidates = allItems.filter(({ item }) =>
    passesPreFilter(`${item.title} ${item.description.slice(0, 200)}`),
  );

  // ── LLM extraction (hard cap 50 calls per run, PARALLEL batches of 8) ────────
  // Fix H-2: the previous sequential for-loop ran 50 × ~2s = 100s, approaching
  // the 150s edge-function timeout. When it timed out, the ingestion_runs
  // timestamp was never written, so the next pg_cron tick immediately re-ran the
  // full pipeline — doubling cost and hitting LLM rate limits.
  // Processing in batches of 8 with Promise.allSettled caps wall-clock time to
  // ceil(50/8) × 2s ≈ 14s while staying well within the timeout budget.
  const MAX_LLM_CALLS = 50;
  const BATCH_SIZE = 8;
  const slice = candidates.slice(0, MAX_LLM_CALLS);

  type InsertRow = {
    company_name: string; event_date: string; headline: string;
    percent_cut: number | null; affected_count: number | null;
    confidence: "high" | "medium" | "low";
    source: string; source_url: string; region: string;
    industry: string | null;
    /** Geographic focus of the source publication — populated from Source.source_market.
     *  Enables BreakingNewsCard to label "Source: TechInAsia · APAC". */
    source_market: string;
  };
  const inserts: InsertRow[] = [];

  const rank = (c: "high" | "medium" | "low") => c === "high" ? 3 : c === "medium" ? 2 : 1;
  const regionMap: Record<string, string> = { US: "US", IN: "IN", EU: "EU" };

  let llmCalls = 0;
  let layoffsFound = 0;

  for (let batchStart = 0; batchStart < slice.length; batchStart += BATCH_SIZE) {
    const batch = slice.slice(batchStart, batchStart + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ src, item }) =>
        extractWithLlm(SUPABASE_URL, SERVICE_KEY, item.title, item.description)
          .then((extraction) => ({ src, item, extraction }))
      ),
    );

    for (const result of results) {
      llmCalls += 1;
      if (result.status === "rejected") {
        console.warn("[ingest-news] LLM batch item rejected:", result.reason);
        continue;
      }
      const { src, item, extraction } = result.value;
      if (!extraction || !extraction.isLayoff || extraction.confidence === "low") continue;
      if (!extraction.companyName || extraction.companyName.length < 2) continue;

      const canonical = canonicaliseCompanyName(extraction.companyName);
      if (!canonical) continue;

      const eventDate = extraction.eventDate
        ?? (item.pubDate && Number.isFinite(new Date(item.pubDate).getTime())
            ? new Date(item.pubDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10));

      const flooredConfidence = rank(extraction.confidence) <= rank(src.baseConfidence)
        ? extraction.confidence
        : src.baseConfidence;

      const resolvedRegion =
        regionMap[extraction.region] ??
        (src.region === "GLOBAL" ? "GLOBAL" : src.region);

      inserts.push({
        company_name: canonical,
        event_date: eventDate,
        headline: item.title.slice(0, 500),
        percent_cut: extraction.percentCut,
        affected_count: extraction.affectedCount,
        confidence: flooredConfidence,
        source: src.name,
        source_url: item.link,
        region: resolvedRegion,
        industry: extraction.industry ?? null,
        source_market: src.source_market,
      });
      layoffsFound += 1;
    }
  }

  // ── Insert (ON CONFLICT DO NOTHING via the unique constraint) ──────────────
  let inserted = 0;
  if (inserts.length > 0) {
    const { data, error } = await supabase
      .from("breaking_news_events")
      .upsert(inserts, { onConflict: "company_name,event_date,source", ignoreDuplicates: true })
      .select("id");
    if (!error && data) inserted = data.length;
    if (error) console.warn("[ingest-news] insert failed:", error.message);
  }

  // Record run timestamp for idempotency
  try {
    await supabase
      .from("ingestion_runs")
      .upsert({ kind: "ingest-news", last_run_at: new Date().toISOString() }, { onConflict: "kind" });
  } catch { /* non-fatal */ }

  // Breakdown of sources fetched per market (for observability)
  const sourcesByMarket: Record<string, number> = {};
  for (const src of SOURCES) {
    sourcesByMarket[src.source_market] = (sourcesByMarket[src.source_market] ?? 0) + 1;
  }

  return new Response(JSON.stringify({
    ok: true,
    sources_checked: SOURCES.length,
    sources_by_market: sourcesByMarket,
    items_fetched: allItems.length,
    candidates_after_prefilter: candidates.length,
    llm_calls: llmCalls,
    llm_cap_hit: candidates.length > MAX_LLM_CALLS,
    layoffs_confirmed: layoffsFound,
    rows_inserted: inserted,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  }));
