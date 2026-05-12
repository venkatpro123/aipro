// layoffTrackerWorker.ts
// Polls layoff-tracker aggregator JSON datasets (layoffs.fyi mirrors,
// trueup.io, layoffstracker.com). Writes confirmed events to
// breaking_news_events at Tier 4 authority — the compose worker will upgrade
// confidence when other sources corroborate.
//
// Multi-mirror strategy: the same dataset is hosted in several places. We try
// them in priority order and stop on the first success. Mirrors typically lag
// each other by hours/days, so we use the freshest available.

import { getSupabase } from '../lib/supabaseClient.js';
import { dedupeKey, quickHash } from '../lib/dedupe.js';
import type { JobPayload, JobResult } from '../lib/types.js';

// Mirror URLs in priority order. Anything that can be GET'd as JSON works.
const LAYOFFS_MIRRORS = [
  // Roger Lee's layoffs.fyi exports CSV; trueup mirrors it as JSON
  'https://layoffs.fyi/layoffs.json',
  // Community-maintained GitHub dataset
  'https://raw.githubusercontent.com/gcba/layoffs/main/data/layoffs.json',
  // Fallback: trueup aggregator
  'https://www.trueup.io/api/layoffs.json',
];

interface LayoffRecord {
  company: string;
  laidOff: number | null;
  percentCut: number | null;
  date: string;        // ISO YYYY-MM-DD
  industry: string;
  country: string;
  sourceUrl: string;
}

async function fetchMirror(url: string): Promise<LayoffRecord[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const raw: any = await res.json();
    if (!Array.isArray(raw)) return [];
    return raw.map((r: any): LayoffRecord => ({
      company:    String(r.Company ?? r.company ?? '').trim(),
      laidOff:    typeof r.Laid_Off_Count === 'number' ? r.Laid_Off_Count
                : typeof r.laid_off === 'number' ? r.laid_off : null,
      percentCut: r.Percentage ? parseFloat(String(r.Percentage)) : null,
      date:       String(r.Date ?? r.date ?? '').slice(0, 10),
      industry:   String(r.Industry ?? r.industry ?? 'Unknown'),
      country:    String(r.Country ?? r.country ?? 'Unknown'),
      sourceUrl:  String(r.Source ?? r.source_url ?? url),
    })).filter(r => r.company && r.date);
  } catch {
    return [];
  }
}

export async function layoffTrackerWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  if (!company) return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName required' };

  // Try mirrors in order, stop on first non-empty
  let records: LayoffRecord[] = [];
  let sourceMirror: string | null = null;
  for (const url of LAYOFFS_MIRRORS) {
    const r = await fetchMirror(url);
    if (r.length > 0) {
      records = r;
      sourceMirror = url;
      break;
    }
  }

  if (records.length === 0) {
    return { ok: false, errorKind: 'network_error', errorMessage: 'all mirrors unreachable or empty' };
  }

  // Word-boundary-ish match to avoid "AI" matching every company
  const lower = company.toLowerCase();
  const matches = records.filter(r => {
    const c = r.company.toLowerCase();
    if (c === lower) return true;
    if (lower.length >= 4 && c.includes(lower)) return true;
    if (c.length >= 4 && lower.includes(c)) return true;
    return false;
  });

  if (matches.length === 0) {
    return { ok: true, summary: `no layoff-tracker matches for ${company} (source=${sourceMirror})`, rowsWritten: 0 };
  }

  // Filter to last 180 days to keep breaking_news_events relevant
  const cutoff = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10);
  const recent = matches.filter(m => m.date >= cutoff);

  if (recent.length === 0) {
    return { ok: true, summary: `${matches.length} historical matches; none in 180d`, rowsWritten: 0 };
  }

  const sb = getSupabase();
  const rows = recent.map(r => ({
    company_name:   company,
    event_date:     r.date,
    headline:       `Layoff reported: ${r.laidOff ?? '?'} affected at ${company} (${r.industry})`,
    percent_cut:    r.percentCut,
    affected_count: r.laidOff,
    confidence:     'medium' as const,                  // tracker aggregator authority
    source:         'layoffs.fyi (mirror)',
    source_url:     r.sourceUrl,
    industry:       r.industry,
    region:         r.country ?? 'Unknown',
  }));

  const { error, data } = await sb
    .from('breaking_news_events')
    .upsert(rows, { onConflict: 'company_name,event_date,source', ignoreDuplicates: true })
    .select('id');

  if (error) return { ok: false, errorKind: 'parse_error', errorMessage: error.message };

  payload.dedupeKey = dedupeKey({
    company, source: 'layoff_tracker',
    date: new Date().toISOString().slice(0, 10),
    contentHash: quickHash(recent.map(r => r.date).join('|')),
  });

  return {
    ok: true,
    summary: `${recent.length} recent layoff events (${data?.length ?? 0} new)`,
    rowsWritten: data?.length ?? 0,
  };
}
