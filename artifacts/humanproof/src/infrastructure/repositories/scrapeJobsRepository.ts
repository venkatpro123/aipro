// scrapeJobsRepository.ts — DEBT-3
//
// All access to scrape_jobs + audit_coalesce_runs. Powers the
// freshness gate, server-authoritative dedup, request coalescing, and
// the LiveScraperGate UI's progress polling.

import { BaseRepository } from './baseRepository';

export type ScrapeJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked' | 'duplicate';

export interface ScrapeJobRow {
  id: number;
  job_type: string;
  company_name: string;
  status: ScrapeJobStatus;
  dedupe_key: string;
  enqueued_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  queue_time_ms: number | null;
  error_kind: string | null;
  /** Origin of the job: user_triggered | cron_refresh | background_enrichment */
  source: string;
  priority: string;
}

export class ScrapeJobsRepository extends BaseRepository {
  constructor() {
    super({ serviceName: 'scrape-jobs-repository' });
  }

  /** Returns true if the company was successfully scraped within freshWindowMs. */
  async isFresh(opts: { companyName: string; freshWindowMs: number }): Promise<boolean> {
    const since = new Date(Date.now() - opts.freshWindowMs).toISOString();
    const rows = (await this.runQuery<{ id: number }[]>('isFresh', async () => {
      const res = await this.client
        .from('scrape_jobs')
        .select('id')
        .eq('company_name', opts.companyName)
        .eq('status', 'succeeded')
        .gte('finished_at', since)
        .limit(1);
      return res as { data: { id: number }[] | null; error: { code?: string; message: string } | null };
    })) ?? [];
    return rows.length > 0;
  }

  /** Find an in-flight job with the same dedupe_key. */
  async findInflightByDedupeKey(dedupeKey: string): Promise<ScrapeJobRow | null> {
    return this.runQuery<ScrapeJobRow>('findInflightByDedupeKey', async () => {
      const res = await this.client
        .from('scrape_jobs')
        .select('id,job_type,company_name,status,dedupe_key,enqueued_at,started_at,finished_at,duration_ms,queue_time_ms,error_kind,source,priority')
        .eq('dedupe_key', dedupeKey)
        .in('status', ['queued', 'running'])
        // user_triggered jobs sorted first; within same source, newest first
        .order('priority', { ascending: true })
        .order('enqueued_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return res as { data: ScrapeJobRow | null; error: { code?: string; message: string } | null };
    });
  }

  /**
   * Count succeeded + failed jobs for a company enqueued after `since`.
   * Used by LiveScraperGate to drive a progress bar without polling
   * the full row list.
   */
  async countTerminalSince(opts: { companyName: string; since: string }): Promise<{ done: number; total: number }> {
    const result = await this.runQueryWithCount<{ status: ScrapeJobStatus }>('countTerminalSince', async () => {
      const res = await this.client
        .from('scrape_jobs')
        .select('status', { count: 'exact' })
        .eq('company_name', opts.companyName)
        .gte('enqueued_at', opts.since);
      return res as { data: { status: ScrapeJobStatus }[] | null; count: number | null; error: { code?: string; message: string } | null };
    });
    const terminal = result.rows.filter((r) => r.status === 'succeeded' || r.status === 'failed' || r.status === 'blocked').length;
    return { done: terminal, total: result.count };
  }
}

let _instance: ScrapeJobsRepository | null = null;
export function scrapeJobsRepo(): ScrapeJobsRepository {
  if (!_instance) _instance = new ScrapeJobsRepository();
  return _instance;
}
export function __resetScrapeJobsRepoForTesting(): void {
  _instance = null;
}
