// types.ts
// Shared types used across the scraper service.

export type JobType =
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

export type SourceAuthority = 1.0 | 0.75 | 0.55 | 0.35 | 0.20;

export type JobPriority = 'background' | 'audit_blocking';

export interface JobPayload {
  type: JobType;
  companyName: string;
  ticker?: string;
  cik?: string;
  targetUrl?: string;
  /** sha256(company|source|date|content_hash) — BullMQ rejects duplicates within 24h */
  dedupeKey?: string;
  /**
   * 'background'     — cron-driven poll. Default 3 attempts, 60s exponential backoff.
   * 'audit_blocking' — user-triggered, audit pipeline is actively waiting for this.
   *                    5 attempts, 3s exponential backoff. BullMQ priority=1.
   */
  priority?: JobPriority;
  metadata?: Record<string, unknown>;
}

export interface JobResult {
  ok: boolean;
  /** Short description of what got persisted (e.g. "wrote 2 reddit mentions") */
  summary?: string;
  /** Specific failure category — fed into scrape_jobs.error_kind */
  errorKind?: 'timeout' | 'parse_error' | 'network_error' | 'auth_error'
    | '429' | 'captcha' | 'not_found' | 'rate_limited' | 'none';
  errorMessage?: string;
  /** Rows written, for /stats endpoint. */
  rowsWritten?: number;
}

export interface ScraperEvent {
  /** Stable key: company + event_type + event_date — used for dedup and Meili docId. */
  id: string;
  companyName: string;
  eventType: 'layoff' | 'hiring_freeze' | 'hiring_surge' | 'exec_departure'
    | 'restructuring' | 'financial_stress' | 'unknown';
  /** ISO date of the event (not the fetch time) */
  eventDate: string;
  headline: string;
  percentCut: number | null;
  affectedCount: number | null;
  /** 0.0–1.0; compose step caps single-source events at 0.20–0.55 by authority tier */
  confidence: number;
  sources: { name: string; authority: SourceAuthority; url?: string }[];
  industry?: string;
  region?: string;
}
