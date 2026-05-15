// serverAuthoritativeScrapeDedup.ts — WS6
//
// Server-authoritative deduplication for scraper triggers. Addresses
// Audit Issue #15: the legacy `scraperTrigger.ts` dedups in localStorage —
// at 10k concurrent users hitting the same company on a news day, each
// browser independently believes "no dedup needed" and 10k scraper jobs
// fire simultaneously, bot-blocking every data source within seconds.
//
// This module DOES NOT replace `scraperTrigger.ts`. It adds a server-side
// pre-check that the trigger calls under the `ws6_server_auth_dedup` flag:
//
//   1. Compute a deterministic dedupe_key for the scrape attempt.
//   2. Query `scrape_jobs` for any row with the same dedupe_key and
//      status in ('queued', 'running').
//   3. If found: report `dedupedAgainstServerRow` and SKIP the enqueue.
//      The audit pipeline still runs against whatever data is already
//      available; the in-flight scrape job will eventually deliver
//      fresh signals.
//   4. If not found: proceed with the normal scraper-enqueue path. The
//      UNIQUE (dedupe_key) constraint on scrape_jobs is the final
//      safety net against duplicate inserts.
//
// Effect at scale: 10k concurrent users for one company produce ONE
// in-flight scrape job. 9999 of them get `dedupedAgainstServerRow:true`
// and skip the network round-trip.

import { supabase } from '../utils/supabase';
import { evaluateFlagSync } from '../config/featureFlags';

// ── Types ───────────────────────────────────────────────────────────────────

export type ScrapeJobType =
  | 'careerPageScrape'
  | 'linkedinJobs'
  | 'newsExtract'
  | 'secEdgarPoll'
  | 'layoffTracker'
  | 'warnActFetch'
  | 'redditMentions'
  | 'githubActivity'
  | 'glassdoorScrape'
  | 'signalCompose';

export interface DedupCheckInput {
  companyCanonical: string;
  jobType: ScrapeJobType;
  /** Window granularity for the dedupe key. Same company + same job_type
   *  within this window collapses to one job. Default 600s (10 min). */
  windowSeconds?: number;
}

export interface DedupCheckResult {
  dedupeKey: string;
  shouldEnqueue: boolean;
  existingRow:
    | null
    | {
        id: string | number;
        status: string;
        enqueued_at: string;
      };
  reason: string;
}

// ── Key computation ─────────────────────────────────────────────────────────

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Deterministic dedupe key. Same (canonical, jobType, window) always produces
 * the same hex. Window is the floor of (timestamp / windowSeconds) so all
 * triggers within a window produce identical keys.
 *
 * NOTE: this MUST match the dedupe_key format the scraper-enqueue edge
 * function uses on its own server-side path. The migration enforces
 * UNIQUE on dedupe_key — if formats diverge, dedup silently fails.
 */
export async function computeDedupeKey(input: DedupCheckInput): Promise<string> {
  const window = Math.floor(Date.now() / 1000 / (input.windowSeconds ?? 600));
  const payload = `${norm(input.companyCanonical)}|${input.jobType}|${window}`;
  const data = new TextEncoder().encode(payload);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Check ───────────────────────────────────────────────────────────────────

export async function checkServerAuthoritativeDedup(input: DedupCheckInput): Promise<DedupCheckResult> {
  const dedupeKey = await computeDedupeKey(input);

  const flag = evaluateFlagSync('ws6_server_auth_dedup');
  if (!flag.isActive && !flag.isShadow) {
    // Flag off — caller continues with the legacy localStorage path.
    return {
      dedupeKey,
      shouldEnqueue: true,
      existingRow: null,
      reason: 'ws6 flag off; legacy client dedup applies',
    };
  }

  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('id, status, enqueued_at')
    .eq('dedupe_key', dedupeKey)
    .in('status', ['queued', 'running'])
    .order('enqueued_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // On error: behave permissively (allow enqueue). The UNIQUE constraint
    // on scrape_jobs.dedupe_key is the final safety net.
    return {
      dedupeKey,
      shouldEnqueue: true,
      existingRow: null,
      reason: `dedup check failed (${error.message}); proceeding via UNIQUE constraint fallback`,
    };
  }

  if (data) {
    return {
      dedupeKey,
      shouldEnqueue: false,
      existingRow: data as { id: string | number; status: string; enqueued_at: string },
      reason: `existing in-flight job for same dedupe_key (status=${data.status})`,
    };
  }

  return {
    dedupeKey,
    shouldEnqueue: true,
    existingRow: null,
    reason: 'no in-flight job for this dedupe_key; safe to enqueue',
  };
}

/**
 * Convenience wrapper used by the audit pipeline at scrape-trigger time.
 * Returns a final decision after consulting both the WS6 server check
 * and the legacy localStorage dedup. Server WINS when both disagree.
 */
export async function resolveScrapeEnqueueDecision(
  input: DedupCheckInput,
  legacyDecision: { shouldEnqueue: boolean; reason: string },
): Promise<DedupCheckResult> {
  const server = await checkServerAuthoritativeDedup(input);
  if (!server.shouldEnqueue) return server;

  if (!legacyDecision.shouldEnqueue) {
    return {
      dedupeKey: server.dedupeKey,
      shouldEnqueue: false,
      existingRow: null,
      reason: `legacy client dedup blocked: ${legacyDecision.reason}`,
    };
  }

  return server;
}
