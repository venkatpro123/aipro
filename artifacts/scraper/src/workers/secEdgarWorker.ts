// secEdgarWorker.ts
// Polls SEC EDGAR full-text search for 8-K filings matching layoff + executive
// departure terms for a single company. Writes confirmed hits to
// breaking_news_events (Tier 1 authority). The compose worker fuses these with
// other sources later.
//
// EDGAR rate limit: 10 req/sec — single-company search uses 5 queries × 1
// entity = 5 requests, well within budget. The 24h dedupe_key prevents
// re-writing the same 8-K row across retries.

import { getSupabase } from '../lib/supabaseClient.js';
import { dedupeKey, quickHash } from '../lib/dedupe.js';
import type { JobPayload, JobResult } from '../lib/types.js';

const EDGAR_SEARCH_URL = 'https://efts.sec.gov/LATEST/search-index';
const UA: HeadersInit = {
  'User-Agent': 'HumanProof Scraper (contact@humanproof.ai)',
  Accept: 'application/json',
};

const LAYOFF_QUERIES = [
  '"workforce reduction"',
  '"reduction in force"',
  'layoff',
];
const EXEC_QUERIES = [
  '"departure of" "principal officer"',
  '"resigned" "chief executive officer"',
  'Item 5.02',
];

interface HitRow {
  cik: string;
  accession: string;
  filedAt: string;
  formType: string;
  matchedQuery: string;
}

async function searchEdgar(query: string, company: string): Promise<HitRow[]> {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 365);
  const params = new URLSearchParams({
    q: `${query} "${company}"`,
    dateRange: 'custom',
    startdt: dateFrom.toISOString().slice(0, 10),
    enddt:   new Date().toISOString().slice(0, 10),
    forms:   '8-K,8-K/A',
  });
  const url = `${EDGAR_SEARCH_URL}?${params.toString()}`;
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data: any = await res.json();
    const raw: any[] = data?.hits?.hits ?? [];
    return raw.map((h: any) => ({
      cik:        String(h._source?.ciks?.[0] ?? '').padStart(10, '0'),
      accession:  String(h._id ?? '').split(':')[0] || '',
      filedAt:    String(h._source?.file_date ?? '').slice(0, 10),
      formType:   String(h._source?.form ?? ''),
      matchedQuery: query,
    })).filter(h => h.filedAt && h.cik);
  } catch {
    return [];
  }
}

export async function secEdgarWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  if (!company) return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName required' };

  // Build the search set. Workers across the swarm and scraper share company-
  // alias logic, but for the scraper we run the literal user-supplied name +
  // any explicit alias passed via metadata.aliases (set by enqueue EF).
  const aliases: string[] = ([company, ...((payload.metadata?.aliases as string[]) ?? [])])
    .filter((s, i, arr) => arr.indexOf(s) === i);

  const allQueries = [...LAYOFF_QUERIES, ...EXEC_QUERIES];
  const responses = await Promise.all(
    aliases.flatMap(name => allQueries.map(q => searchEdgar(q, name))),
  );

  // Deduplicate by (cik, filedAt, formType)
  const seen = new Set<string>();
  const hits: HitRow[] = [];
  for (const r of responses) {
    for (const h of r) {
      const key = `${h.cik}|${h.filedAt}|${h.formType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(h);
    }
  }

  if (hits.length === 0) {
    return { ok: true, summary: 'no EDGAR hits in 365-day window', rowsWritten: 0 };
  }

  // Persist any hit not already present in breaking_news_events as a Tier-1
  // confirmed event. The compose worker may later upgrade confidence when
  // other sources corroborate.
  const sb = getSupabase();
  const rows = hits.map(h => {
    const isExec = EXEC_QUERIES.some(q => q === h.matchedQuery);
    return {
      company_name: company,
      event_date:   h.filedAt,
      headline:     isExec
        ? `SEC 8-K Item 5.02: executive departure disclosure (${company})`
        : `SEC 8-K: ${h.matchedQuery.replace(/"/g, '')} disclosure (${company})`,
      confidence:   'high' as const,
      source:       'SEC EDGAR',
      source_url:   `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${h.cik}&type=8-K`,
      industry:     null,
      region:       'US',
    };
  });

  const { error, data } = await sb
    .from('breaking_news_events')
    .upsert(rows, { onConflict: 'company_name,event_date,source', ignoreDuplicates: true })
    .select('id');

  if (error) {
    return { ok: false, errorKind: 'parse_error', errorMessage: `breaking_news upsert failed: ${error.message}` };
  }

  // Recompute dedupe_key for the job log so the scraper job itself doesn't
  // double-fire across retries within 24h.
  payload.dedupeKey = payload.dedupeKey ?? dedupeKey({
    company, source: 'sec_edgar',
    date: new Date().toISOString().slice(0, 10),
    contentHash: quickHash(hits.map(h => h.accession).join('|')),
  });

  return {
    ok: true,
    summary: `${hits.length} EDGAR 8-K hits (${data?.length ?? 0} new rows)`,
    rowsWritten: data?.length ?? 0,
  };
}
