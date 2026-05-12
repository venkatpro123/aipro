// scrapeJobLog.ts
// Persists per-job execution records to the public.scrape_jobs table. Used by
// every worker on completion and failure. Provides the data for the /stats
// endpoint and the block-rate alarm.

import { getSupabase } from './supabaseClient.js';
import type { JobPayload, JobResult } from './types.js';

export interface ScrapeJobInsert {
  job_type:       string;
  company_name:   string | null;
  target_url:     string | null;
  status:         'queued' | 'running' | 'succeeded' | 'failed' | 'blocked' | 'duplicate';
  error_kind:     string | null;
  duration_ms:    number | null;
  finished_at:    string | null;
  result_summary: Record<string, unknown> | null;
  dedupe_key:     string | null;
}

/**
 * Insert a final scrape_jobs row. Skips silently on DB failure — the worker
 * shouldn't crash on telemetry failure.
 */
export async function logJobResult(
  payload: JobPayload,
  result: JobResult,
  startedAt: number,
): Promise<void> {
  const sb = getSupabase();
  const row: ScrapeJobInsert = {
    job_type:     payload.type,
    company_name: payload.companyName,
    target_url:   payload.targetUrl ?? null,
    status:       result.ok ? 'succeeded' : (result.errorKind === '429' || result.errorKind === 'captcha' ? 'blocked' : 'failed'),
    error_kind:   result.errorKind ?? null,
    duration_ms:  Date.now() - startedAt,
    finished_at:  new Date().toISOString(),
    result_summary: {
      summary:     result.summary ?? null,
      rowsWritten: result.rowsWritten ?? 0,
      errorMessage: result.errorMessage ?? null,
    },
    dedupe_key:   payload.dedupeKey ?? null,
  };

  try {
    // Use upsert on dedupe_key so a retried job updates the prior row in place.
    const { error } = payload.dedupeKey
      ? await sb.from('scrape_jobs').upsert(row, { onConflict: 'dedupe_key' })
      : await sb.from('scrape_jobs').insert(row);
    if (error) console.warn('[scrapeJobLog] insert failed:', error.message);
  } catch (err: any) {
    console.warn('[scrapeJobLog] write threw:', err?.message);
  }
}

/**
 * Mark a company as scraped in tracked_companies.last_scraped_at so the
 * due_for_scrape view rotates it out of the next batch.
 */
export async function markCompanyScraped(companyName: string): Promise<void> {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('tracked_companies')
      .update({ last_scraped_at: new Date().toISOString() })
      .eq('company_name', companyName);
    if (error) console.warn('[scrapeJobLog] markCompanyScraped failed:', error.message);
  } catch (err: any) {
    console.warn('[scrapeJobLog] markCompanyScraped threw:', err?.message);
  }
}
