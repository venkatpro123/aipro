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

/**
 * Bucketed market segment for latency telemetry.
 *
 * Distinct from PrivateCompanyRegime — captures both the jurisdiction AND whether
 * the company is publicly listed (which determines financial-source availability).
 *
 * Mapping logic (quorumCeilingForRegime also uses this):
 *   null regime → company is public OR we couldn't detect → 'us_public' (safest ceiling)
 *   german_gmbh        → 'germany_private'
 *   uk_private_ltd     → 'uk_private'
 *   india_unlisted_pvt → 'india_private'
 *   apac_private       → 'singapore'  (umbrella for SEA/APAC private)
 *   eu_other_private   → 'eu_private'
 *   us_private         → 'us_private'
 *
 * When the company is known-public from ENTITIES graph and has a region:
 *   region='IN' + listed → 'india_listed'
 *   region='GB'          → 'uk_public'
 *   etc. (set by the pipeline after resolution, defaults to 'us_public')
 */
export type MarketSegment =
  | 'us_public'
  | 'us_private'
  | 'uk_public'
  | 'uk_private'
  | 'germany_private'
  | 'india_listed'
  | 'india_private'
  | 'singapore'
  | 'eu_private'
  | 'unknown';

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
  /**
   * Human-readable explanation of why certain signal classes are structurally
   * unavailable for this regime (e.g. legal disclosure requirements). Surfaced
   * in LiveSignalStatusBanner so users understand that the score is working
   * correctly — the absence of financial signals is expected, not a failure.
   */
  structuralNote?: string;
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
  structuralNote: 'Private company — stock-exchange financial signals are unavailable. Score reflects role risk, sector headwinds, workforce trends, and news signals.',
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
  structuralNote: 'Private company (Germany GmbH) — financial signals are unavailable by law. German law does not require real-time financial disclosure for GmbH companies. Score reflects role risk, sector headwinds, and news signals only.',
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
  structuralNote: 'Private company (UK Ltd) — financial signals are unavailable by law. UK private companies are not required to publish real-time financial data. Score reflects role risk, sector headwinds, and news signals only.',
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
  structuralNote: 'Private company (India unlisted) — financial signals are unavailable. Unlisted Indian companies have no NSE/BSE exchange listing and are not required to publish real-time financial data. Score reflects role risk, sector headwinds, and news signals only.',
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

/**
 * Regime-aware quorum ceiling.
 *
 * Rationale per market:
 *   null (public/unknown) — 45s: Yahoo Finance + SEC EDGAR + WARN Act are all possible.
 *                           The full budget is warranted when financial quorum can fire.
 *   us_private            — 20s: WARN Act exists for ≥100-employee US employers.
 *                           One filing scan justifies a modest budget.
 *   german_gmbh           — 15s: Only 3 layoff sources (rss-news, breaking-news-db,
 *                           reddit-flagged) + 3 workforce sources. All exhaust within 8s.
 *                           The full 45s ceiling is pure waste; users see no progress.
 *   uk_private_ltd        — 15s: Same source shape as german_gmbh. WARN Act absent,
 *                           Companies House filing lag is annual, not real-time.
 *   india_unlisted_pvt    — 18s: Has india-press (4th layoff source) which takes
 *                           slightly longer than RSS, justifying 3s extra margin.
 *   apac_private          — 15s: ACRA/ASIC provide registry data but no real-time
 *                           filing stream. LinkedIn + career-page are fast.
 *   eu_other_private      — 15s: National registries (Infogreffe, Handelsregister)
 *                           are batch-updated, not real-time. Same source shape.
 */
export function quorumCeilingForRegime(regime: PrivateCompanyRegime | null): number {
  switch (regime) {
    case 'german_gmbh':        return 15_000;
    case 'uk_private_ltd':     return 15_000;
    case 'india_unlisted_pvt': return 18_000;
    case 'us_private':         return 20_000;
    case 'apac_private':       return 15_000;
    case 'eu_other_private':   return 15_000;
    default:                   return 45_000;  // public or undetected — keep full budget
  }
}

/**
 * Map a private-company regime (or public company) to a MarketSegment bucket.
 * The caller sets isPublicListed=true when the company is known-listed (has exchange ticker).
 * The region string (ISO-2 or region key from CompanyData) refines the public-company bucket.
 */
export function marketSegmentForRegime(
  regime: PrivateCompanyRegime | null,
  region?: string | null,
  isPublicListed?: boolean,
): MarketSegment {
  if (regime === 'german_gmbh')        return 'germany_private';
  if (regime === 'uk_private_ltd')     return 'uk_private';
  if (regime === 'india_unlisted_pvt') return 'india_private';
  if (regime === 'us_private')         return 'us_private';
  if (regime === 'apac_private')       return 'singapore';
  if (regime === 'eu_other_private')   return 'eu_private';

  // null regime → public or undetected
  if (!region) return isPublicListed ? 'us_public' : 'unknown';
  const r = region.toUpperCase();
  if (r === 'IN')                          return isPublicListed ? 'india_listed' : 'india_private';
  if (r === 'GB' || r === 'UK')            return isPublicListed ? 'uk_public' : 'uk_private';
  if (r === 'DE' || r === 'GERMANY')       return 'germany_private';
  if (r === 'SG' || r === 'SINGAPORE')     return 'singapore';
  return isPublicListed ? 'us_public' : 'unknown';
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
  /**
   * Propagated from QuorumSpec.structuralNote. Present when the spec explains
   * why certain signal classes are structurally unavailable (e.g. private company
   * legal disclosure rules). Surfaced in LiveSignalStatusBanner.
   */
  structuralNote?: string;
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

  return { reached: allSatisfied, perClass, elapsedMs, structuralNote: spec.structuralNote };
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
