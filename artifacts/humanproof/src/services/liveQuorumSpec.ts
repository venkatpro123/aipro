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
