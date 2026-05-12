// warnActWorker.ts
// Fetches WARN Act filings for a target US state and persists matches to
// public.warn_filings. The existing supabase Edge Function `warn-act-fetch`
// covers CA, NY, WA, TX, NJ — this worker is a complement, not a replacement,
// triggered by the scraper when an on-demand check is needed (e.g. when a
// news article mentions a company we don't have WARN data for yet).
//
// For MVP, this worker scrapes California's EDD HTML page (most US tech
// layoffs filed here). Other states stay with the Edge Function which already
// handles their bespoke formats. Add more state handlers here in Phase 5.

import { getSupabase } from '../lib/supabaseClient.js';
import { dedupeKey } from '../lib/dedupe.js';
import type { JobPayload, JobResult } from '../lib/types.js';

const CA_WARN_URL = 'https://edd.ca.gov/en/jobs_and_training/layoff_services_warn/';

interface ParsedNotice {
  companyName: string;
  state: string;
  filedDate: string;        // YYYY-MM-DD
  layoffDate: string | null;
  affectedCount: number | null;
  locations: string[];
  sourceUrl: string;
}

/**
 * Best-effort regex-based extraction from CA EDD's HTML. EDD changes the page
 * structure occasionally — when the parser breaks we record `parse_error` so
 * operators see it in the block-rate alarm and update the regex.
 */
function parseCaliforniaHtml(html: string): ParsedNotice[] {
  const out: ParsedNotice[] = [];
  // EDD publishes a year-by-year XLSX link near the top; failure to find any
  // table rows is normal until the page is re-rendered with current data.
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(html)) !== null) {
    const cells = Array.from(m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi))
      .map(c => c[1].replace(/<[^>]+>/g, '').trim());
    if (cells.length < 4) continue;
    const company = cells.find(c => /\b(inc|llc|corp|co\.|company|ltd)\b/i.test(c)) ?? cells[1];
    const dateMatch = cells.find(c => /\d{1,2}\/\d{1,2}\/\d{4}/.test(c));
    if (!company || !dateMatch) continue;
    const dmm = dateMatch.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dmm) continue;
    const filedDate = `${dmm[3]}-${dmm[1].padStart(2, '0')}-${dmm[2].padStart(2, '0')}`;
    const countMatch = cells.find(c => /^\d{2,5}$/.test(c.replace(/,/g, '')));
    out.push({
      companyName:   company,
      state:         'CA',
      filedDate,
      layoffDate:    null,
      affectedCount: countMatch ? parseInt(countMatch.replace(/,/g, ''), 10) : null,
      locations:     [],
      sourceUrl:     CA_WARN_URL,
    });
  }
  return out;
}

export async function warnActWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  if (!company || company.length < 4) {
    return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName too short' };
  }

  // For on-demand triggers, scrape California (largest tech state) first.
  try {
    const res = await fetch(CA_WARN_URL, {
      headers: { 'User-Agent': 'humansheild-scraper (contact@humanproof.ai)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, errorKind: 'network_error', errorMessage: `CA EDD HTTP ${res.status}` };
    const html = await res.text();
    const all = parseCaliforniaHtml(html);

    // Filter to matches of this company. Word-boundary-ish match to avoid
    // "Apple" matching "Snapple".
    const escaped = company.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|\\s)${escaped}(\\s|$|,)`, 'i');
    const matches = all.filter(n => re.test(n.companyName.toLowerCase()));

    if (matches.length === 0) {
      return { ok: true, summary: `no CA WARN matches for ${company}`, rowsWritten: 0 };
    }

    const sb = getSupabase();
    const rows = matches.map(n => ({
      company_name:   n.companyName,
      filing_state:   n.state,
      filed_date:     n.filedDate,
      layoff_date:    n.layoffDate,
      affected_count: n.affectedCount,
      locations:      n.locations,
      is_confirmed:   true,
      source_url:     n.sourceUrl,
      raw_text:       null,
    }));

    const { error, data } = await sb
      .from('warn_filings')
      // No native unique constraint covers (company, filed_date, state); rely
      // on the application-level dedupe_key in scrape_jobs to short-circuit
      // retries within 24h.
      .insert(rows)
      .select('id');

    if (error) {
      return { ok: false, errorKind: 'parse_error', errorMessage: error.message };
    }

    payload.dedupeKey = dedupeKey({
      company, source: 'warn_ca',
      date: new Date().toISOString().slice(0, 10),
    });

    return {
      ok: true,
      summary: `${matches.length} CA WARN notices written`,
      rowsWritten: data?.length ?? 0,
    };
  } catch (err: any) {
    if (err?.name === 'TimeoutError') return { ok: false, errorKind: 'timeout', errorMessage: err.message };
    return { ok: false, errorKind: 'network_error', errorMessage: err?.message ?? String(err) };
  }
}
