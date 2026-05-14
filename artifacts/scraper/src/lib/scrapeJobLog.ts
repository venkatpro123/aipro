// scrapeJobLog.ts
// Persists per-job execution records to the public.scrape_jobs table. The audit
// pipeline's awaitLiveQuorum poller depends on three writes per job:
//   1. logJobQueued  — INSERT (status='queued') the moment the job is enqueued
//   2. logJobRunning — UPDATE to status='running' when a worker picks it up
//   3. logJobResult  — UPSERT to terminal status when the job finishes
//
// Without (1) and (2) the quorum poller has to wait until completion to see
// any progress, which defeats the staged-UI redesign. The schema's status check
// constraint already allows 'queued' and 'running'.

import { getSupabase } from './supabaseClient.js';
import type { JobPayload, JobResult } from './types.js';

export type JobPriority = 'background' | 'audit_blocking';

export interface ScrapeJobInsert {
  job_type:       string;
  company_name:   string | null;
  target_url:     string | null;
  status:         'queued' | 'running' | 'succeeded' | 'failed' | 'blocked' | 'duplicate';
  error_kind:     string | null;
  duration_ms:    number | null;
  enqueued_at?:   string | null;
  started_at?:    string | null;
  finished_at:    string | null;
  priority?:      JobPriority;
  result_summary: Record<string, unknown> | null;
  dedupe_key:     string | null;
}

/**
 * Insert a `queued` row at enqueue time. The audit pipeline polls scrape_jobs
 * while waiting for live quorum and needs to see queue depth before workers
 * even pick the job up. Skips silently on DB failure.
 *
 * NOTE: dedupe_key MUST be present — without it we cannot reconcile the queued
 * row with the later running/terminal update. Callers should compute the
 * dedupe key BEFORE enqueueing; previously workers computed it at completion.
 */
export async function logJobQueued(
  payload: JobPayload,
  priority: JobPriority = 'background',
): Promise<void> {
  if (!payload.dedupeKey) {
    // Defensive: without a dedupe key the queued row would orphan, so we skip.
    // Workers that don't pre-compute dedupe keys still get the terminal write.
    return;
  }
  const sb = getSupabase();
  const row: ScrapeJobInsert = {
    job_type:     payload.type,
    company_name: payload.companyName,
    target_url:   payload.targetUrl ?? null,
    status:       'queued',
    error_kind:   null,
    duration_ms:  null,
    enqueued_at:  new Date().toISOString(),
    started_at:   null,
    finished_at:  null,
    priority,
    result_summary: null,
    dedupe_key:   payload.dedupeKey,
  };
  try {
    // ignoreDuplicates: a re-enqueue of the same dedupe key (BullMQ retry) must
    // NOT overwrite an existing running/terminal row.
    const { error } = await sb
      .from('scrape_jobs')
      .upsert(row, { onConflict: 'dedupe_key', ignoreDuplicates: true });
    if (error) console.warn('[scrapeJobLog] queued insert failed:', error.message);
  } catch (err: any) {
    console.warn('[scrapeJobLog] queued write threw:', err?.message);
  }
}

/**
 * Promote the queued row to `running` when a worker picks the job up. Records
 * `started_at` so the orchestrator can distinguish stuck jobs from queued ones.
 */
export async function logJobRunning(payload: JobPayload): Promise<void> {
  if (!payload.dedupeKey) return;
  const sb = getSupabase();
  try {
    const { error } = await sb
      .from('scrape_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('dedupe_key', payload.dedupeKey);
    if (error) console.warn('[scrapeJobLog] running update failed:', error.message);
  } catch (err: any) {
    console.warn('[scrapeJobLog] running update threw:', err?.message);
  }
}

/**
 * Insert/upsert the terminal row. When a queued row already exists for this
 * dedupe_key, this UPSERT promotes it; otherwise it inserts fresh (back-compat
 * for workers that never called logJobQueued).
 */
export async function logJobResult(
  payload: JobPayload,
  result: JobResult,
  startedAt: number,
  priority: JobPriority = 'background',
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
    priority,
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
