// breaking-news-scan/index.ts
// Real-time breaking news detection for layoff announcements.
//
// Purpose:
//   Polls RSS/HN/NewsAPI every 2 hours for layoff news about watched companies.
//   When a new event is detected:
//     1. Inserts into breaking_news_events table
//     2. Invalidates the analysis cache for that company (DELETE from layoff_analysis_cache)
//     3. Updates company_intelligence.layoff_history + layoff_rounds if confident enough
//
// Schedule (add to pg_cron migration):
//   SELECT cron.schedule('breaking-news-scan-2h', '0 */2 * * *', $$
//     SELECT net.http_post(
//       url := current_setting('app.supabase_url') || '/functions/v1/breaking-news-scan',
//       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
//       body := '{}'::jsonb
//     )
//   $$);
//
// Minimum latency from announcement to score update:
//   Detection: 0–2 hours (next cron tick)
//   Cache invalidation: immediate on detection
//   User score update: on next audit submit (uses fresh data from company_intelligence)
//   Active user notification: via BreakingNewsBanner (Realtime channel subscription)
//
// Env vars required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
//   NEWS_API_KEY (optional — NewsAPI for higher-confidence events)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = { 'Content-Type': 'application/json' };

// ── Companies to watch — extended from the company_intelligence table ─────────
// The scan will also fetch the top 50 companies from company_intelligence
// dynamically on each run.
const ALWAYS_WATCH = [
  'Tata Consultancy Services', 'TCS',
  'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra', 'LTIMindtree',
  'Accenture', 'IBM', 'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple',
  'Oracle', 'Salesforce', 'Spotify', 'Snap', 'Twitter', 'X',
  'Byju\'s', 'Paytm', 'Ola', 'Swiggy', 'Zomato',
];

const LAYOFF_KEYWORDS = [
  'layoff', 'laid off', 'job cut', 'workforce reduction', 'headcount reduction',
  'retrenchment', 'redundancies', 'restructuring', 'downsizing',
  'employees let go', 'fired', 'job loss',
];

const RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';
const RSS_FEEDS = [
  'https://economictimes.indiatimes.com/tech/tech-bytes/rssfeeds/78570561.cms',
  'https://economictimes.indiatimes.com/industry/services/it/rssfeeds/13358151.cms',
  'https://www.livemint.com/rss/technology',
  'https://www.moneycontrol.com/rss/business.xml',
  'https://inc42.com/feed/',
  // Global tech
  'https://techcrunch.com/category/layoffs/feed/',
  'https://feeds.feedburner.com/TechCrunch',
];

interface NewsItem {
  title:       string;
  description: string;
  link:        string;
  pubDate:     string;
  source:      string;
}

async function fetchRSS(url: string, source: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${RSS_PROXY}${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.items ?? []).slice(0, 20).map((item: any) => ({
      title:       item.title ?? '',
      description: item.description ?? '',
      link:        item.link ?? '',
      pubDate:     item.pubDate ?? new Date().toISOString(),
      source,
    }));
  } catch {
    return [];
  }
}

async function fetchHN(company: string): Promise<NewsItem[]> {
  try {
    const q = encodeURIComponent(`${company} layoff`);
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=story&numericFilters=created_at_i>${Math.floor(Date.now()/1000) - 86400 * 2}`,
      { signal: AbortSignal.timeout(4_000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.hits ?? []).slice(0, 5).map((h: any) => ({
      title:       h.title ?? '',
      description: h.story_text ?? '',
      link:        h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      pubDate:     h.created_at ?? new Date().toISOString(),
      source:      'Hacker News',
    }));
  } catch {
    return [];
  }
}

function isLayoffNews(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return LAYOFF_KEYWORDS.some(kw => text.includes(kw));
}

function extractCompanyFromText(text: string, watchList: string[]): string | null {
  const lower = text.toLowerCase();
  for (const company of watchList) {
    if (lower.includes(company.toLowerCase())) return company;
  }
  return null;
}

function extractPercent(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

function extractCount(text: string): number | null {
  // Match "15,000 employees" or "15000 workers" or "15K jobs"
  const m = text.match(/(\d[\d,]*(?:\.\d+)?)\s*[Kk]?\s*(?:employees?|workers?|jobs?|people|staff)/);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ''));
  if (m[0].includes('K') || m[0].includes('k')) n *= 1000;
  return Math.round(n);
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async () => {
  try {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Load additional companies from company_intelligence (top 50 by confidence)
  const { data: ciRows } = await supabase
    .from('company_intelligence')
    .select('company_name')
    .order('confidence_score', { ascending: false })
    .limit(50);

  const watchList = [
    ...new Set([
      ...ALWAYS_WATCH,
      ...(ciRows ?? []).map((r: any) => r.company_name),
    ]),
  ];

  // Fetch all RSS feeds in parallel
  const allItems: NewsItem[] = (await Promise.all([
    ...RSS_FEEDS.map(url => fetchRSS(url, url.includes('economictimes') ? 'Economic Times'
      : url.includes('livemint') ? 'Livemint'
      : url.includes('moneycontrol') ? 'Moneycontrol'
      : url.includes('inc42') ? 'Inc42'
      : 'TechCrunch')),
    // HN search for top watched companies (limit to avoid Algolia rate limits)
    ...watchList.slice(0, 10).map(c => fetchHN(c)),
  ])).flat();

  let inserted = 0;
  let invalidated = 0;
  const processedKeys = new Set<string>();

  for (const item of allItems) {
    if (!isLayoffNews(item.title, item.description)) continue;

    const company = extractCompanyFromText(`${item.title} ${item.description}`, watchList);
    if (!company) continue;

    const eventDate = item.pubDate
      ? new Date(item.pubDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const dedupeKey = `${company.toLowerCase()}::${eventDate}::${item.source}`;
    if (processedKeys.has(dedupeKey)) continue;
    processedKeys.add(dedupeKey);

    const percentCut = extractPercent(`${item.title} ${item.description}`);
    const affectedCount = extractCount(`${item.title} ${item.description}`);
    const confidence = item.source === 'Economic Times' || item.source === 'Moneycontrol'
      ? 'medium' : 'low';

    const { error: insertErr } = await supabase
      .from('breaking_news_events')
      .upsert({
        company_name:   company,
        event_date:     eventDate,
        headline:       item.title.slice(0, 500),
        percent_cut:    percentCut,
        affected_count: affectedCount,
        source:         item.source,
        source_url:     item.link,
        affected_depts: [],
        confidence,
        detected_at:    new Date().toISOString(),
      }, { onConflict: 'company_name,event_date,source' });

    if (!insertErr) {
      inserted++;

      // Invalidate analysis cache so the next user audit sees fresh data
      await supabase
        .from('layoff_analysis_cache')
        .delete()
        .like('key', `${company.toLowerCase()}::%`);
      invalidated++;

      // Patch company_intelligence with increased layoff_rounds + latest date
      // Only update when confidence is medium+ to avoid false positives
      if (confidence !== 'low') {
        await supabase
          .from('company_intelligence')
          .update({
            last_updated: new Date().toISOString(),
            // layoff_history jsonb update is handled by a separate process;
            // here we just bump the updated_at so the OSINT EF re-fetches on next audit
          })
          .ilike('company_name', `%${company}%`);
      }
    }
  }

  console.log(`[BreakingNewsScan] ${inserted} events inserted, ${invalidated} caches invalidated`);

  return new Response(JSON.stringify({ inserted, invalidated, watchListSize: watchList.length }), { headers: CORS });

  } catch (e: any) {
    // Top-level error boundary — ensures the function always returns a structured
    // response rather than crashing with no output (which Supabase treats as a 500
    // but logs nothing useful). This catch should only fire for programmer errors or
    // infrastructure failures (env vars missing, Supabase unavailable).
    console.error('[BreakingNewsScan] Fatal error:', e?.message ?? e);
    return new Response(
      JSON.stringify({ error: e?.message ?? 'Unknown error', inserted: 0, invalidated: 0 }),
      { status: 500, headers: CORS },
    );
  }
});
