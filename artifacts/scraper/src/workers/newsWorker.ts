// newsWorker.ts
// Polls Google News RSS for company-targeted layoff headlines, then uses
// Crawl4AI to extract structured event data from each article body.
//
// Pipeline:
//   1. Fetch Google News RSS for `<company> layoff OR restructuring OR job cut`
//   2. Parse RSS items (title + link + pubDate) — no proxy, no key
//   3. For each candidate, spawn Crawl4AI subprocess to extract article body
//   4. Detect negation ("denies layoffs") → skip if found
//   5. Persist confirmed events to breaking_news_events at Tier 3 confidence

import { getSupabase } from '../lib/supabaseClient.js';
import { dedupeKey, quickHash } from '../lib/dedupe.js';
import { runCrawl4AI } from '../sources/crawl4aiClient.js';
import type { JobPayload, JobResult } from '../lib/types.js';

const NEGATION_PHRASES = [
  'denies layoff', 'deny layoff', 'no layoff', 'no plans to lay',
  'rules out layoff', 'refutes layoff', 'rumour', 'rumor',
  'not laying off', 'not cutting',
];

const LAYOFF_KEYWORDS = [
  'layoff', 'laid off', 'lays off', 'workforce reduction',
  'reduction in force', 'restructuring', 'job cut',
];

function buildGoogleNewsUrl(company: string): string {
  const q = `${company} layoff OR restructuring OR job cut OR workforce reduction`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)
                ?? block.match(/<title>([\s\S]*?)<\/title>/i))?.[1]?.trim() ?? '';
    const link    = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? '';
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() ?? '';
    if (title && link) items.push({ title, link, pubDate });
  }
  return items.slice(0, 10);
}

function isNegated(text: string): boolean {
  const lower = text.toLowerCase();
  return NEGATION_PHRASES.some(p => lower.includes(p));
}

function mentionsLayoff(text: string): boolean {
  const lower = text.toLowerCase();
  return LAYOFF_KEYWORDS.some(p => lower.includes(p));
}

function extractPercentCut(text: string): number | null {
  // Look for "X% of (employees|staff|workforce|headcount)"
  const m = text.match(/(\d+(?:\.\d+)?)\s*%\s*(of)?\s*(its|the)?\s*(employees|staff|workforce|headcount|workers|workforce)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return n > 0 && n <= 80 ? n : null;
}

function extractAffectedCount(text: string): number | null {
  const m = text.match(/(\d[\d,]*)\s*(employees|staff|workers|jobs|people)/i);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ''), 10);
  return n > 0 && n < 1_000_000 ? n : null;
}

export async function newsWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  if (!company) return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName required' };

  // 1. RSS
  let items: RssItem[] = [];
  try {
    const res = await fetch(buildGoogleNewsUrl(company), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, errorKind: 'network_error', errorMessage: `Google News ${res.status}` };
    items = parseRss(await res.text());
  } catch (err: any) {
    return { ok: false, errorKind: 'timeout', errorMessage: err?.message ?? 'rss fetch failed' };
  }

  if (items.length === 0) return { ok: true, summary: 'no Google News items', rowsWritten: 0 };

  // 2. Filter to titles that mention the company AND a layoff keyword, exclude negations
  const lowerCompany = company.toLowerCase();
  const candidates = items.filter(it => {
    const text = `${it.title}`.toLowerCase();
    return text.includes(lowerCompany) && mentionsLayoff(text) && !isNegated(text);
  });

  if (candidates.length === 0) {
    return { ok: true, summary: `0/${items.length} items survive title filter`, rowsWritten: 0 };
  }

  // 3. For each candidate, run Crawl4AI to extract the article body. Cap at
  //    3 extractions per job to keep wall-time + chromium memory under control.
  const rows: any[] = [];
  for (const it of candidates.slice(0, 3)) {
    const extracted = await runCrawl4AI({
      url:  it.link,
      mode: 'article',
      // No schema → free-form text extraction; we parse signals below.
    }, 25_000);

    const fullText = (extracted.rawText ?? '') + ' ' + (it.title ?? '');
    if (!extracted.ok || !mentionsLayoff(fullText)) continue;
    if (isNegated(fullText)) continue;

    const percentCut    = extractPercentCut(fullText);
    const affectedCount = extractAffectedCount(fullText);
    const eventDate     = it.pubDate ? new Date(it.pubDate).toISOString().slice(0, 10)
                                     : new Date().toISOString().slice(0, 10);

    rows.push({
      company_name:   company,
      event_date:     eventDate,
      headline:       it.title.slice(0, 500),
      percent_cut:    percentCut,
      affected_count: affectedCount,
      confidence:     'medium' as const,
      source:         'Google News',
      source_url:     it.link,
      industry:       null,
      region:         null,
    });
  }

  if (rows.length === 0) {
    return { ok: true, summary: `${candidates.length} candidates, none survived body extraction`, rowsWritten: 0 };
  }

  const sb = getSupabase();
  const { error, data } = await sb
    .from('breaking_news_events')
    .upsert(rows, { onConflict: 'company_name,event_date,source', ignoreDuplicates: true })
    .select('id');

  if (error) return { ok: false, errorKind: 'parse_error', errorMessage: error.message };

  payload.dedupeKey = dedupeKey({
    company, source: 'google_news',
    date: new Date().toISOString().slice(0, 10),
    contentHash: quickHash(rows.map(r => r.source_url).join('|')),
  });

  return {
    ok: true,
    summary: `${rows.length} news events (${data?.length ?? 0} new)`,
    rowsWritten: data?.length ?? 0,
  };
}
