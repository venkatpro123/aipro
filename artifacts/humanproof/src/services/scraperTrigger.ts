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
// R11 fix: dedup window reduced from 5 min → 60 s. Previously a silent first-trigger
// failure (FLY_SCRAPER_URL not set, 503, network stall) blocked any retry for 5 minutes.
// 60 seconds is still enough to absorb double-clicks and rapid identical re-submits
// while letting the user try again quickly when something went wrong.
const DEDUP_WINDOW_MS = 60 * 1000;

interface TriggerLogEntry {
  company: string;
  t: number;
  /** When non-null, this trigger is still in-flight and has no confirmed success.
   *  A subsequent retry within the window may bypass dedup if the in-flight trigger
   *  has not made progress for `STALE_INFLIGHT_MS`. */
  inflight?: boolean;
}

/** An in-flight trigger that hasn't checked in for this long is treated as failed,
 *  so the next user submit is allowed to proceed even within the dedup window. */
const STALE_INFLIGHT_MS = 15 * 1000;

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

/** Internal helper — removes the trigger entry for `company` so a subsequent
 *  submit is not deduped. Called on EF error and on inflight timeout. */
function clearTriggerRecord(company: string): void {
  const lower = company.toLowerCase();
  const log = readTriggerLog().filter(e => e.company.toLowerCase() !== lower);
  writeTriggerLog(log);
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
  return log.some(e => {
    if (e.company.toLowerCase() !== lower) return false;
    const age = now - e.t;
    // Within the dedup window normally — but if the entry is marked inflight
    // and hasn't progressed past STALE_INFLIGHT_MS, treat it as failed so the
    // user can retry rather than waiting out the full window.
    if (e.inflight && age >= STALE_INFLIGHT_MS) return false;
    return age < DEDUP_WINDOW_MS;
  });
}

function recordTrigger(company: string, inflight = false): void {
  const log = readTriggerLog();
  const now = Date.now();
  // Drop entries older than 24h and any prior entry for this company
  const lower = company.toLowerCase();
  const fresh = log
    .filter(e => (now - e.t) < 24 * 60 * 60 * 1000)
    .filter(e => e.company.toLowerCase() !== lower);
  fresh.unshift({ company, t: now, inflight });
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
 * Trigger the scraper-enqueue EF for a company. Optionally passes `priority` so
 * the EF marks the resulting BullMQ jobs as `audit_blocking` (faster retries,
 * queue-jump priority). The function NEVER throws — it captures errors and
 * returns them in the result, so an audit cannot fail because of a scraper trigger.
 */
export async function triggerScraperForCompany(
  companyName: string,
  opts?: { priority?: 'background' | 'audit_blocking' },
): Promise<TriggerResult> {
  const company = (companyName ?? '').trim();
  if (company.length < 2 || company.length > 200) {
    return { state: 'invalid', message: `companyName length ${company.length} out of bounds` };
  }

  if (recentlyTriggered(company)) {
    return { state: 'deduped', message: `triggered within last ${Math.round(DEDUP_WINDOW_MS / 1000)} s` };
  }

  // Record BEFORE the network call so a concurrent submit short-circuits too.
  // Mark inflight so a stalled call doesn't block retries past STALE_INFLIGHT_MS.
  recordTrigger(company, true);

  try {
    const { data, error } = await supabase.functions.invoke('scraper-enqueue', {
      body: { companies: [company], priority: opts?.priority ?? 'background' },
    });
    if (error) {
      // Roll back the trigger record so the user can retry sooner
      clearTriggerRecord(company);
      return { state: 'error', message: error.message };
    }
    // Promote inflight → confirmed so dedup window applies fully (60s).
    recordTrigger(company, false);
    return {
      state: 'queued',
      jobsBuilt: typeof data?.jobsBuilt === 'number' ? data.jobsBuilt : undefined,
      message: data?.message,
    };
  } catch (err: any) {
    // EF unreachable — non-fatal. Roll back trigger record.
    clearTriggerRecord(company);
    return { state: 'error', message: err?.message ?? 'scraper-enqueue unreachable' };
  }
}

// ── v32: bounded live-quorum waiter ──────────────────────────────────────────
// Replaces v31's awaitScrapeReadiness. The audit pipeline blocks on this until
// every signal class in the quorum spec is satisfied (or the hard ceiling fires).
// Unlike v31, the wait is up to 45s, polls queued/running/terminal states
// (requires workers to call logJobQueued/logJobRunning), and emits per-stage
// progress events for the UI.

import {
  DEFAULT_QUORUM_SPEC,
  PRIVATE_COMPANY_QUORUM_SPEC,
  JOB_TYPE_TO_QUORUM_SOURCE,
  evaluateQuorum,
  type QuorumSpec,
  type QuorumStatus,
  type SignalClass,
} from './liveQuorumSpec';
import { isPrivateCompany } from './companyEntityResolver';

export interface AwaitLiveQuorumOptions {
  /** Hard ceiling — default 45s as agreed in plan. */
  ceilingMs?: number;
  /** Polling interval — default 500ms (fast enough for 6-stage UI). */
  pollIntervalMs?: number;
  /** ISO timestamp lower bound. Default: 5 minutes ago (catches recently-enqueued jobs). */
  since?: string;
  /** Override the default quorum spec (tests / debugging). */
  spec?: QuorumSpec;
  /** Per-poll callback for UI progress streaming. */
  onProgress?: (status: QuorumStatus) => void;
  /** Per-source positive-evidence injector. Called by the orchestrator after
   *  inline live signals (Yahoo, Wikipedia, RSS) land, so the quorum logic
   *  doesn't depend solely on scrape_jobs writes. Returns the union of
   *  positive sources observed outside the scrape_jobs path. */
  externalPositiveSources?: () => Record<SignalClass, Set<string>>;
  /** Company name — used by escalateRetry when quorum stalls past the
   *  escalation threshold (default 50% of ceiling). When provided, the
   *  helper re-fires scraper-enqueue with audit_blocking priority so any
   *  stalled BullMQ jobs get a second attempt and any newly-discovered
   *  failed/blocked sources are re-enqueued. */
  escalateAtMs?: number;
}

export interface AwaitLiveQuorumResult {
  status: QuorumStatus;
  /** True when ceiling hit before quorum. */
  timedOut: boolean;
  /** True when ALL classes are satisfied (status.reached). */
  reached: boolean;
  /** Total wait time. */
  waitedMs: number;
}

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'blocked']);
const POSITIVE_STATUSES = new Set(['succeeded']);

/**
 * Block until live signal quorum reaches the spec, or the ceiling fires.
 *
 * Polls `scrape_jobs` for the company at `pollIntervalMs` cadence. Combines
 * scrape_jobs evidence with any `externalPositiveSources` (Yahoo Finance,
 * Wikipedia, NewsAPI — these resolve in the inline live promise and don't
 * write scrape_jobs rows). Calls `onProgress` every poll so the UI can render
 * per-stage status in real time.
 *
 * Always resolves — never throws.
 */
export async function awaitLiveQuorum(
  companyName: string,
  opts: AwaitLiveQuorumOptions = {},
): Promise<AwaitLiveQuorumResult> {
  const ceilingMs       = opts.ceilingMs ?? 45_000;
  const pollIntervalMs  = Math.max(250, opts.pollIntervalMs ?? 500);
  const since           = opts.since ?? new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const spec            = opts.spec ?? (isPrivateCompany(companyName) ? PRIVATE_COMPANY_QUORUM_SPEC : DEFAULT_QUORUM_SPEC);
  const escalateAtMs    = opts.escalateAtMs ?? Math.floor(ceilingMs * 0.5);
  const startedAt       = Date.now();

  const emptyMap = (): Record<SignalClass, Set<string>> => ({
    workforce: new Set(), layoffs: new Set(), financial: new Set(), hiring: new Set(),
  });

  let lastStatus: QuorumStatus = evaluateQuorum(spec, emptyMap(), emptyMap(), 0);
  // v32.1: active retry escalation — when quorum stalls past escalateAtMs and at
  // least one class has exhausted sources without satisfaction, re-fire the
  // scraper-enqueue EF with audit_blocking priority. This gives BullMQ a second
  // attempt at any failed/blocked workers and triggers re-discovery of slugs that
  // may have been missed on the first pass. We fire AT MOST ONCE per quorum wait.
  let escalationFired = false;

  while (true) {
    const elapsedMs = Date.now() - startedAt;

    // ── Pull current scrape_jobs snapshot ─────────────────────────────────
    const positives = opts.externalPositiveSources?.() ?? emptyMap();
    const exhausted = emptyMap();

    try {
      const { data } = await supabase
        .from('scrape_jobs')
        .select('job_type, status')
        .eq('company_name', companyName)
        .gte('enqueued_at', since);

      if (Array.isArray(data)) {
        for (const row of data as Array<{ job_type: string; status: string }>) {
          const mapping = JOB_TYPE_TO_QUORUM_SOURCE[row.job_type];
          if (!mapping) continue;
          const cls = mapping.signalClass;
          const src = mapping.source;
          if (POSITIVE_STATUSES.has(row.status)) {
            positives[cls].add(src);
          } else if (TERMINAL_STATUSES.has(row.status)) {
            // succeeded already handled above; remaining terminal = failed|blocked
            exhausted[cls].add(src);
          }
        }
      }
    } catch {
      // Tolerate transient DB errors; keep polling.
    }

    lastStatus = evaluateQuorum(spec, positives, exhausted, elapsedMs);
    opts.onProgress?.(lastStatus);

    if (lastStatus.reached) {
      return {
        status:   lastStatus,
        timedOut: false,
        reached:  true,
        waitedMs: elapsedMs,
      };
    }

    if (elapsedMs >= ceilingMs) {
      return {
        status:   lastStatus,
        timedOut: true,
        reached:  false,
        waitedMs: elapsedMs,
      };
    }

    // v32.1: escalate retries once at the half-budget mark. Only fires when at
    // least one class has exhausted sources without reaching min — the typical
    // failure mode (LinkedIn captcha + Glassdoor 403 + slow Crawl4AI) is exactly
    // what a re-trigger can repair via BullMQ's 5-attempt 3s-backoff retry config.
    if (!escalationFired && elapsedMs >= escalateAtMs) {
      const anyExhausted = (Object.values(exhausted) as Set<string>[]).some(s => s.size > 0);
      const anyUnsatisfied = Object.values(lastStatus.perClass).some(c => !c.satisfied);
      if (anyExhausted && anyUnsatisfied) {
        escalationFired = true;
        // Fire-and-forget — never block the quorum poll itself. The dedup window
        // in triggerScraperForCompany was tightened to 60s in v31; we side-step
        // it here by calling supabase.functions.invoke directly. The EF handles
        // dedupe at the BullMQ level so a recently-attempted job won't double-fire.
        supabase.functions.invoke('scraper-enqueue', {
          body: { companies: [companyName], priority: 'audit_blocking' },
        }).catch(() => { /* best-effort; quorum wait continues regardless */ });
      }
    }

    await new Promise(r => setTimeout(r, pollIntervalMs));
  }
}

// ── Back-compat shim for v31 callers (LiveScraperGate, tests) ────────────────
// The v31 API stays callable; new code should use awaitLiveQuorum.

export interface ScrapeReadinessOptions {
  budgetMs?: number;
  awaitFor?: string[];
  minRequired?: number;
  pollIntervalMs?: number;
  since?: string;
}

export interface ScrapeReadinessResult {
  ready: boolean;
  completed: string[];
  pending: string[];
  waitedMs: number;
  timedOut: boolean;
}

export async function awaitScrapeReadiness(
  companyName: string,
  opts: ScrapeReadinessOptions = {},
): Promise<ScrapeReadinessResult> {
  const budgetMs       = opts.budgetMs ?? 8_000;
  const pollIntervalMs = Math.max(250, opts.pollIntervalMs ?? 500);
  const awaitFor       = opts.awaitFor ?? ['careerPageScrape', 'newsExtract', 'redditMentions', 'layoffTracker'];
  const minRequired    = Math.min(opts.minRequired ?? 2, awaitFor.length || 1);
  const since          = opts.since ?? new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const startedAt      = Date.now();

  const terminalSet = new Set(['succeeded', 'failed', 'blocked']);
  const wanted = new Set(awaitFor);
  let lastSnapshot: { completed: string[]; pending: string[] } = { completed: [], pending: [...awaitFor] };

  while (Date.now() - startedAt < budgetMs) {
    try {
      const { data } = await supabase
        .from('scrape_jobs')
        .select('job_type, status')
        .eq('company_name', companyName)
        .gte('enqueued_at', since);

      if (Array.isArray(data) && data.length > 0) {
        const completedTypes = new Set<string>();
        for (const row of data as Array<{ job_type: string; status: string }>) {
          if (!wanted.has(row.job_type)) continue;
          if (terminalSet.has(row.status)) completedTypes.add(row.job_type);
        }
        lastSnapshot = {
          completed: Array.from(completedTypes),
          pending:   awaitFor.filter(j => !completedTypes.has(j)),
        };
        if (completedTypes.size >= minRequired) {
          return {
            ready: true,
            completed: lastSnapshot.completed,
            pending:   lastSnapshot.pending,
            waitedMs:  Date.now() - startedAt,
            timedOut:  false,
          };
        }
      }
    } catch { /* tolerate transient DB errors */ }

    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  return {
    ready: false,
    completed: lastSnapshot.completed,
    pending:   lastSnapshot.pending,
    waitedMs:  Date.now() - startedAt,
    timedOut:  true,
  };
}
