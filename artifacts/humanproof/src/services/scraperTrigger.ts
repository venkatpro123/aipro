// scraperTrigger.ts
// Fire-and-forget bridge from the audit submit flow to the scraper-enqueue
// Edge Function. Without this, the BullMQ-backed scraper only runs on its
// 10-minute pg_cron schedule for 15 pre-seeded companies — so every audit of
// a long-tail company gets none of the new deep-scrape data (Reddit, GitHub,
// Glassdoor, career-page diffs, LinkedIn job counts, Crawl4AI news bodies).
//
// Design:
//   - Fire-and-forget: never blocks the audit. The audit pipeline still runs
//     synchronously against whatever is already in Supabase; if the scraper
//     produces new rows during/after the audit, the RealtimeSignalToast
//     surfaces them.
//   - 5-minute client-side dedup via localStorage. Repeated submits for the
//     same company inside the window short-circuit so we don't enqueue
//     duplicate jobs (BullMQ would dedupe most of them anyway via job IDs,
//     but client-side avoids the round-trip too).
//   - Sanitizes input. Refuses empty / very-short / very-long strings — the
//     EF would reject them too but failing client-side is cheaper.

import { supabase } from '../utils/supabase';

const TRIGGER_LS_KEY  = 'hp_scraper_triggers';
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface TriggerLogEntry {
  company: string;
  t: number;
}

function readTriggerLog(): TriggerLogEntry[] {
  try {
    const raw = localStorage.getItem(TRIGGER_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e): e is TriggerLogEntry =>
      typeof e?.company === 'string' && typeof e?.t === 'number'
    ) : [];
  } catch {
    return [];
  }
}

function writeTriggerLog(log: TriggerLogEntry[]): void {
  try {
    // Cap at 100 entries — anything older than 24h gets pruned anyway
    localStorage.setItem(TRIGGER_LS_KEY, JSON.stringify(log.slice(0, 100)));
  } catch {
    /* quota exceeded — non-fatal */
  }
}

function recentlyTriggered(company: string): boolean {
  const log = readTriggerLog();
  const now = Date.now();
  const lower = company.toLowerCase();
  return log.some(e =>
    e.company.toLowerCase() === lower && (now - e.t) < DEDUP_WINDOW_MS
  );
}

function recordTrigger(company: string): void {
  const log = readTriggerLog();
  const now = Date.now();
  // Drop entries older than 24h and any prior entry for this company
  const lower = company.toLowerCase();
  const fresh = log
    .filter(e => (now - e.t) < 24 * 60 * 60 * 1000)
    .filter(e => e.company.toLowerCase() !== lower);
  fresh.unshift({ company, t: now });
  writeTriggerLog(fresh);
}

export interface TriggerResult {
  /** 'queued' = sent to EF, 'deduped' = skipped (within 5-min window), 'invalid' = bad input, 'error' = EF call failed. */
  state: 'queued' | 'deduped' | 'invalid' | 'error';
  /** When 'queued', the number of jobs the EF built; null otherwise. */
  jobsBuilt?: number;
  message?: string;
}

export interface ScrapeProgress {
  total: number;
  completed: number;
  isDone: boolean;
}

/** How recent a scrape must be before we skip the live gate (30 minutes). */
export const FRESH_WINDOW_MS = 30 * 60 * 1000;

/**
 * Returns true if this company was successfully scraped within the last 30 min.
 * When true, the LiveScraperGate is skipped and the audit runs immediately.
 * Falls back to false on any error (shows gate rather than skips it).
 */
export async function checkDataFreshness(companyName: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - FRESH_WINDOW_MS).toISOString();
    const { data } = await supabase
      .from('scrape_jobs')
      .select('id')
      .eq('company_name', companyName)
      .eq('status', 'succeeded')
      .gte('finished_at', since)
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Poll the scrape_jobs table to find how many jobs enqueued after `since` for
 * this company have completed (succeeded or failed). Used by LiveScraperGate
 * to show real progress rather than a purely time-based animation.
 */
export async function pollScrapeProgress(
  companyName: string,
  since: string,
): Promise<ScrapeProgress> {
  try {
    const { data } = await supabase
      .from('scrape_jobs')
      .select('status')
      .eq('company_name', companyName)
      .gte('enqueued_at', since);

    if (!data || data.length === 0) {
      return { total: 0, completed: 0, isDone: false };
    }
    const total     = data.length;
    const completed = data.filter(j =>
      j.status === 'succeeded' || j.status === 'failed' || j.status === 'blocked',
    ).length;
    return { total, completed, isDone: total > 0 && completed >= total };
  } catch {
    return { total: 0, completed: 0, isDone: false };
  }
}

/**
 * Fire-and-forget trigger. Returns a Promise so callers can `await` if they
 * want the result, but the audit flow never does — it just calls this and
 * keeps going.
 *
 * The function intentionally NEVER throws — it captures errors and returns
 * them in the result. The audit must never fail because of a scraper trigger.
 */
export async function triggerScraperForCompany(companyName: string): Promise<TriggerResult> {
  const company = (companyName ?? '').trim();
  if (company.length < 2 || company.length > 200) {
    return { state: 'invalid', message: `companyName length ${company.length} out of bounds` };
  }

  if (recentlyTriggered(company)) {
    return { state: 'deduped', message: `triggered within last ${DEDUP_WINDOW_MS / 60_000} min` };
  }

  // Record BEFORE the network call so a concurrent submit short-circuits too
  recordTrigger(company);

  try {
    const { data, error } = await supabase.functions.invoke('scraper-enqueue', {
      body: { companies: [company] },
    });
    if (error) {
      // Roll back the trigger record so the user can retry sooner
      const log = readTriggerLog().filter(e => e.company.toLowerCase() !== company.toLowerCase());
      writeTriggerLog(log);
      return { state: 'error', message: error.message };
    }
    return {
      state: 'queued',
      jobsBuilt: typeof data?.jobsBuilt === 'number' ? data.jobsBuilt : undefined,
      message: data?.message,
    };
  } catch (err: any) {
    // EF unreachable — non-fatal. Roll back trigger record.
    const log = readTriggerLog().filter(e => e.company.toLowerCase() !== company.toLowerCase());
    writeTriggerLog(log);
    return { state: 'error', message: err?.message ?? 'scraper-enqueue unreachable' };
  }
}
