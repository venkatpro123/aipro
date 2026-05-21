// liveQuorumSpec.ts
// Live signal quorum specification for the Stage C wait loop.
//
// The v32 audit pipeline blocks score finalization until each signal CLASS
// reaches its minimum source count. This is "evidence-based readiness" — the
// opposite of v31's time-based 8s budget where the audit fired regardless of
// what had landed.
//
// Each class has:
//   * min     — minimum count of distinct sources that must produce a signal
//   * sources — the source keys that count toward quorum
//   * allowAbsenceAfter — when set, "no evidence found across all sources after
//                          this much time" is itself quorum (e.g. layoffs class:
//                          finding zero layoff articles is a meaningful signal).
//
// Private companies relax the financial class to min=0 (no public stock data).
// v40.1: regime-specific quorum specs correctly scope the layoffs source list
// to the regulatory instruments that actually exist in each jurisdiction.
// Key corrections:
//   german_gmbh        — WARN Act does not exist in Germany; SEC EDGAR is US only.
//                        Bundesanzeiger + Handelsregister exist but are not
//                        real-time scrapers — workforce class excludes yahoo-fte.
//   uk_private_ltd     — WARN Act is US-specific; SEC EDGAR is US-only.
//                        Companies House filing exists but is annual (9-month lag).
//   india_unlisted_pvt — SEC EDGAR is US-only; BSE/NSE sources irrelevant for
//                        private companies (no exchange listing). WARN Act US-only.

import type { PrivateCompanyRegime } from './companyEntityResolver';

export type SignalClass = 'workforce' | 'layoffs' | 'financial' | 'hiring';

export interface QuorumClassSpec {
  min: number;
  sources: string[];
  /**
   * When the engine has searched ALL sources in this class for at least
   * `allowAbsenceAfterMs` and found zero positive signals, treat the class
   * as quorum-reached with "no evidence". Useful for layoffs/news where
   * absence is a real signal (vs. an inconclusive timeout).
   */
  allowAbsenceAfterMs?: number;
}

export interface QuorumSpec {
  workforce: QuorumClassSpec;
  layoffs:   QuorumClassSpec;
  financial: QuorumClassSpec;
  hiring:    QuorumClassSpec;
}

export const DEFAULT_QUORUM_SPEC: QuorumSpec = {
  workforce: {
    min: 2,
    sources: ['wikipedia', 'yahoo-fte', 'linkedin', 'career-page', 'intelligence-db'],
  },
  layoffs: {
    min: 2,
    sources: ['rss-news', 'sec-edgar', 'warn-act', 'breaking-news-db', 'reddit-flagged', 'india-press'],
    // After 20s of searching, "no layoff evidence found" counts as quorum.
    allowAbsenceAfterMs: 20_000,
  },
  financial: {
    min: 1,
    sources: ['yahoo', 'alphavantage', 'bse', 'nse', 'fmp'],
  },
  hiring: {
    min: 1,
    sources: ['naukri', 'indeed', 'linkedin-jobs', 'career-jobcount', 'serper'],
  },
};

/** Relaxed spec for known-private companies — financial class has no public source. */
export const PRIVATE_COMPANY_QUORUM_SPEC: QuorumSpec = {
  ...DEFAULT_QUORUM_SPEC,
  financial: { min: 0, sources: [] },
};

/**
 * German GmbH quorum spec.
 *
 * Corrections vs DEFAULT_QUORUM_SPEC:
 *   financial: min=0 — no public ticker, no stock-exchange financial disclosure.
 *   layoffs: 'warn-act' REMOVED — The US WARN Act does not exist in Germany.
 *            German law (Betriebsverfassungsgesetz §111-113) requires internal
 *            works-council consultation but NO public advance-notice filing.
 *            'sec-edgar' REMOVED — US-only corporate filing system.
 *   workforce: 'yahoo-fte' REMOVED — requires a valid stock ticker.
 */
export const GERMAN_GMBH_QUORUM_SPEC: QuorumSpec = {
  workforce: {
    min: 2,
    sources: ['wikipedia', 'linkedin', 'career-page', 'intelligence-db'],
  },
  layoffs: {
    min: 2,
    sources: ['rss-news', 'breaking-news-db', 'reddit-flagged'],
    allowAbsenceAfterMs: 20_000,
  },
  financial: { min: 0, sources: [] },
  hiring: DEFAULT_QUORUM_SPEC.hiring,
};

/**
 * UK private Ltd quorum spec.
 *
 * Corrections vs DEFAULT_QUORUM_SPEC:
 *   financial: min=0 — no public stock exchange listing.
 *   layoffs: 'warn-act' REMOVED — UK equivalent (TULRCA s.188) requires
 *            collective redundancy consultation but no public advance-notice
 *            filing comparable to the US WARN Act.
 *            'sec-edgar' REMOVED — US-only.
 *   workforce: 'yahoo-fte' REMOVED — requires a valid stock ticker.
 */
export const UK_PRIVATE_LTD_QUORUM_SPEC: QuorumSpec = {
  workforce: {
    min: 2,
    sources: ['wikipedia', 'linkedin', 'career-page', 'intelligence-db'],
  },
  layoffs: {
    min: 2,
    sources: ['rss-news', 'breaking-news-db', 'reddit-flagged'],
    allowAbsenceAfterMs: 20_000,
  },
  financial: { min: 0, sources: [] },
  hiring: DEFAULT_QUORUM_SPEC.hiring,
};

/**
 * India unlisted private company quorum spec.
 *
 * Corrections vs DEFAULT_QUORUM_SPEC:
 *   financial: min=0 — no NSE/BSE listing, no public exchange financial disclosure.
 *              Sources 'yahoo', 'alphavantage', 'bse', 'nse', 'fmp' all require
 *              an exchange ticker — none applies to private Indian companies.
 *   layoffs: 'warn-act' REMOVED — US-only. India has no equivalent mandatory
 *            public advance-notice regime (Industrial Disputes Act §25-O requires
 *            government permission for large layoffs but no public filing).
 *            'sec-edgar' REMOVED — US-only.
 *            'india-press' KEPT — Indian business press (Economic Times, Mint)
 *            is a valid layoff signal source.
 *   workforce: 'yahoo-fte' REMOVED — requires ticker.
 */
export const INDIA_UNLISTED_QUORUM_SPEC: QuorumSpec = {
  workforce: {
    min: 2,
    sources: ['wikipedia', 'linkedin', 'career-page', 'intelligence-db'],
  },
  layoffs: {
    min: 2,
    sources: ['rss-news', 'breaking-news-db', 'reddit-flagged', 'india-press'],
    allowAbsenceAfterMs: 20_000,
  },
  financial: { min: 0, sources: [] },
  hiring: DEFAULT_QUORUM_SPEC.hiring,
};

/**
 * Select the correct quorum spec for a detected private-company regime.
 *
 * Falls back to PRIVATE_COMPANY_QUORUM_SPEC for us_private/apac_private/
 * eu_other_private (where the DEFAULT minus financial-class is the right shape).
 * Returns DEFAULT_QUORUM_SPEC for null regime (unknown company or public company).
 */
export function quorumSpecForRegime(regime: PrivateCompanyRegime | null): QuorumSpec {
  switch (regime) {
    case 'german_gmbh':        return GERMAN_GMBH_QUORUM_SPEC;
    case 'uk_private_ltd':     return UK_PRIVATE_LTD_QUORUM_SPEC;
    case 'india_unlisted_pvt': return INDIA_UNLISTED_QUORUM_SPEC;
    case 'us_private':
    case 'apac_private':
    case 'eu_other_private':   return PRIVATE_COMPANY_QUORUM_SPEC;
    default:                   return DEFAULT_QUORUM_SPEC;
  }
}

export interface QuorumClassStatus {
  signalClass: SignalClass;
  sourcesReached: string[];
  sourcesPending: string[];
  /** True when min is met OR absence-quorum has been reached. */
  satisfied: boolean;
  /** True when satisfied via absence-quorum (vs. positive evidence). */
  satisfiedByAbsence: boolean;
}

export interface QuorumStatus {
  /** True when every class is satisfied. */
  reached: boolean;
  perClass: Record<SignalClass, QuorumClassStatus>;
  /** Wall-clock ms since the quorum wait started. */
  elapsedMs: number;
}

/**
 * Compute current quorum status given which sources have produced positive
 * evidence so far. `positiveSources` is a per-class set of source keys.
 *
 * For absence-quorum: caller passes `exhaustedSources` per-class — sources
 * that have completed (succeeded OR terminally failed) without producing
 * positive evidence. A class is satisfied-by-absence when
 *   * `allowAbsenceAfterMs` has elapsed, AND
 *   * every spec source is in `exhaustedSources`, AND
 *   * positiveSources is empty.
 */
export function evaluateQuorum(
  spec: QuorumSpec,
  positiveSources: Record<SignalClass, Set<string>>,
  exhaustedSources: Record<SignalClass, Set<string>>,
  elapsedMs: number,
): QuorumStatus {
  const perClass: Record<SignalClass, QuorumClassStatus> = {} as any;
  let allSatisfied = true;

  for (const signalClass of ['workforce', 'layoffs', 'financial', 'hiring'] as SignalClass[]) {
    const classSpec = spec[signalClass];
    const positives = positiveSources[signalClass] ?? new Set<string>();
    const exhausted = exhaustedSources[signalClass] ?? new Set<string>();

    const reachedCount = positives.size;
    const pending = classSpec.sources.filter(s => !positives.has(s) && !exhausted.has(s));

    let satisfied = reachedCount >= classSpec.min;
    let satisfiedByAbsence = false;

    if (!satisfied && classSpec.min === 0) {
      // Min=0 (e.g. private company financial): always satisfied.
      satisfied = true;
    }

    if (!satisfied && classSpec.allowAbsenceAfterMs != null) {
      const exhaustedAll = classSpec.sources.every(s => exhausted.has(s));
      if (exhaustedAll && positives.size === 0 && elapsedMs >= classSpec.allowAbsenceAfterMs) {
        satisfied = true;
        satisfiedByAbsence = true;
      }
    }

    if (!satisfied) allSatisfied = false;

    perClass[signalClass] = {
      signalClass,
      sourcesReached: Array.from(positives),
      sourcesPending: pending,
      satisfied,
      satisfiedByAbsence,
    };
  }

  return { reached: allSatisfied, perClass, elapsedMs };
}

/**
 * Sources that map onto scrape_jobs.job_type. The orchestrator uses this map
 * to translate worker completions into quorum source updates.
 */
export const JOB_TYPE_TO_QUORUM_SOURCE: Record<string, { signalClass: SignalClass; source: string }> = {
  careerPageScrape: { signalClass: 'workforce', source: 'career-page' },
  linkedinJobs:     { signalClass: 'hiring',    source: 'linkedin-jobs' },
  newsExtract:      { signalClass: 'layoffs',   source: 'rss-news' },
  secEdgarPoll:     { signalClass: 'layoffs',   source: 'sec-edgar' },
  layoffTracker:    { signalClass: 'layoffs',   source: 'breaking-news-db' },
  warnActFetch:     { signalClass: 'layoffs',   source: 'warn-act' },
  redditMentions:   { signalClass: 'layoffs',   source: 'reddit-flagged' },
  glassdoorScrape:  { signalClass: 'workforce', source: 'linkedin' }, // proxy
};
