// evidenceHierarchy.ts — WS3
//
// Source-tier evidence hierarchy. Replaces the legacy "freshest signal
// wins" reconciliation rule (Audit Issue #7) with a typed authority
// ladder. Reddit RSS can never override SEC filings, regardless of how
// recently each was observed.
//
// The hierarchy is intentionally coarse — six tiers — because finer
// distinctions invite arbitrariness and the empirical evidence for
// finer ordering is weak. Within a tier, freshness wins. Between tiers,
// authority wins.
//
// Tier semantics (highest to lowest):
//
//   REGULATORY
//     Legally-required filings. SEC 10-K/10-Q/8-K, WARN Act notices,
//     statutory annual reports. Penalty for misrepresentation is high;
//     misreporting risk is low. ≥99% reliability.
//
//   OFFICIAL_FILING
//     Company-issued official communications. Press releases on the
//     investor relations site, official LinkedIn company posts, certified
//     SEC EDGAR submissions outside the legal-mandate set. ≥95% reliability.
//
//   MAJOR_PRESS
//     Established business press with named bylines and editorial review:
//     Bloomberg, WSJ, Reuters, FT, ET/Mint (Indian), Nikkei. ≥85% reliability
//     for layoff facts; lower for nuance (severance terms, internal politics).
//
//   AGGREGATED_DATA
//     Verified data aggregators with disclosed methodology: layoffs.fyi,
//     SimilarWeb, Visible Alpha, Glassdoor sentiment averages. ≥70% reliability;
//     systematically biased toward visible/tracked events.
//
//   SOCIAL_AGGREGATE
//     Discussion platforms with implicit aggregation: HN front page,
//     r/cscareerquestions threads with 100+ comments. Useful for sentiment
//     direction; unreliable for specific facts. ≤60% reliability.
//
//   SOCIAL_INDIVIDUAL
//     Individual posts (Reddit comments, Twitter posts, anonymous blind
//     reports). Highest noise floor. ≤30% reliability for unverified facts.
//
// Conflict resolution rule:
//
//   pickAuthoritative(signals) returns the FIRST signal under this priority:
//     1. Highest tier
//     2. Within tier, freshest observation
//     3. If equally fresh, highest declared confidence
//
// What this module does NOT do:
//
//   * Does not validate the source classification — that is the caller's
//     responsibility. A scrape of WSJ.com tagged as SOCIAL_INDIVIDUAL gets
//     SOCIAL_INDIVIDUAL treatment regardless of its actual provenance.
//   * Does not perform fuzzy matching to detect duplicate sources. If the
//     same WARN filing appears via both `warn-act` and `sec-edgar`
//     ingestion paths, both contribute. The caller should dedup upstream.

// ── Public types ────────────────────────────────────────────────────────────

export type SourceTier =
  | 'REGULATORY'
  | 'OFFICIAL_FILING'
  | 'MAJOR_PRESS'
  | 'AGGREGATED_DATA'
  | 'SOCIAL_AGGREGATE'
  | 'SOCIAL_INDIVIDUAL';

const TIER_RANK: Record<SourceTier, number> = {
  REGULATORY: 0,
  OFFICIAL_FILING: 1,
  MAJOR_PRESS: 2,
  AGGREGATED_DATA: 3,
  SOCIAL_AGGREGATE: 4,
  SOCIAL_INDIVIDUAL: 5,
};

/** Lower rank = higher authority. Use for `sort()` comparators. */
export function tierRank(tier: SourceTier): number {
  return TIER_RANK[tier];
}

export interface EvidenceSignal<T = unknown> {
  /** The evidence source class. */
  tier: SourceTier;
  /** Free-form source label for provenance display ("yahoo-finance", "sec-edgar"). */
  sourceName: string;
  /** The signal value (number/string/object — caller-defined). */
  value: T;
  /** ISO timestamp when the underlying evidence was observed/published. */
  observedAt: string;
  /** Optional caller confidence score in [0, 1]. Used as tiebreaker. */
  confidence?: number;
}

export interface PickResult<T> {
  /** The winning signal, or null when the input list is empty. */
  winner: EvidenceSignal<T> | null;
  /** Signals that were overridden by a higher-authority source. */
  overridden: EvidenceSignal<T>[];
  /** True when a higher-tier signal was preferred over a fresher lower-tier one. */
  tierOverrodeFreshness: boolean;
  /** True when the winner is below MAJOR_PRESS — caller should treat as low-trust. */
  isLowAuthority: boolean;
}

// ── Source → tier registry ──────────────────────────────────────────────────
//
// Default classifier from source name to tier. Callers can override per-signal
// by passing tier explicitly; this map is the fallback when only sourceName is
// known.

const DEFAULT_TIER_BY_SOURCE: Record<string, SourceTier> = {
  // Regulatory
  'sec-edgar':       'REGULATORY',
  'sec-edgar-8k':    'REGULATORY',
  'sec-edgar-10k':   'REGULATORY',
  'sec-edgar-10q':   'REGULATORY',
  'warn-act':        'REGULATORY',
  'warn':            'REGULATORY',
  'bse-filing':      'REGULATORY',
  'nse-filing':      'REGULATORY',
  'rbi-filing':      'REGULATORY',
  'mca-filing':      'REGULATORY',

  // Official filing — company-issued
  'company-press-release':  'OFFICIAL_FILING',
  'investor-relations':     'OFFICIAL_FILING',
  'official-linkedin':      'OFFICIAL_FILING',
  'career-page':            'OFFICIAL_FILING',
  'wikipedia':              'OFFICIAL_FILING',  // editorial review; not regulatory
  'yahoo-finance':          'OFFICIAL_FILING',  // sources from filings
  'alphavantage':           'OFFICIAL_FILING',  // sources from filings
  'bse-india':              'OFFICIAL_FILING',
  'nse-india':              'OFFICIAL_FILING',
  'fmp':                    'OFFICIAL_FILING',

  // Major press
  'bloomberg':       'MAJOR_PRESS',
  'wsj':             'MAJOR_PRESS',
  'reuters':         'MAJOR_PRESS',
  'ft':              'MAJOR_PRESS',
  'economic-times':  'MAJOR_PRESS',
  'mint':            'MAJOR_PRESS',
  'business-standard': 'MAJOR_PRESS',
  'cnbc':            'MAJOR_PRESS',
  'nikkei':          'MAJOR_PRESS',
  'newsapi':         'MAJOR_PRESS',
  'gnews':           'MAJOR_PRESS',
  'google-news-rss': 'MAJOR_PRESS',
  'bing-news-rss':   'MAJOR_PRESS',
  'yahoo-news-rss':  'MAJOR_PRESS',

  // Aggregated data
  'layoffs.fyi':     'AGGREGATED_DATA',
  'layoffsfyi':      'AGGREGATED_DATA',
  'layoffs_fyi':     'AGGREGATED_DATA',
  'glassdoor':       'AGGREGATED_DATA',
  'similarweb':      'AGGREGATED_DATA',
  'crunchbase':      'AGGREGATED_DATA',
  'pitchbook':       'AGGREGATED_DATA',
  'intelligence-db': 'AGGREGATED_DATA',
  'naukri':          'AGGREGATED_DATA',
  'indeed':          'AGGREGATED_DATA',
  'linkedin-jobs':   'AGGREGATED_DATA',
  'serper':          'AGGREGATED_DATA',
  'bls':             'AGGREGATED_DATA',
  'fred':            'AGGREGATED_DATA',

  // Social aggregate
  'hackernews':      'SOCIAL_AGGREGATE',
  'hn':              'SOCIAL_AGGREGATE',
  'reddit-aggregate': 'SOCIAL_AGGREGATE',

  // Social individual
  'reddit':          'SOCIAL_INDIVIDUAL',
  'reddit-flagged':  'SOCIAL_INDIVIDUAL',
  'twitter':         'SOCIAL_INDIVIDUAL',
  'blind':           'SOCIAL_INDIVIDUAL',
  'glassdoor-review': 'SOCIAL_INDIVIDUAL',
};

/**
 * WS12 — Canonicalise a raw source name. Lowercases, trims, replaces
 * underscores and whitespace with hyphens, strips leading/trailing
 * non-alphanumerics. This catches the audit's "yahoo_finance vs
 * yahoo-finance vs Yahoo! Finance" cross-tier bug — all three normalise
 * to `yahoo-finance`.
 *
 * Used by classifySourceToTier and by liveQuorumSpec's distinct-source
 * check (WS11) so quorum can't be satisfied by counting the same source
 * under two spellings.
 *
 * Keep in sync with the source_aliases DB table (20260618000001) — that
 * table is the runtime override mechanism for sources whose vendor
 * spelling changes mid-flight; this function is the always-on fallback.
 */
export function normalizeSourceName(rawSource: string): string {
  return rawSource
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')        // 'yahoo finance', 'yahoo_finance' → 'yahoo-finance'
    .replace(/[^a-z0-9.-]+/g, '')   // 'Yahoo! Finance' → 'yahoofinance' (after the previous step)
    .replace(/^[-]+|[-]+$/g, '');   // strip stray edges
}

/**
 * Classify a source name to its default tier. Unknown sources default to
 * SOCIAL_INDIVIDUAL — the safest fallback (forces upstream callers to
 * declare the tier explicitly for any new source).
 *
 * WS12 — uses normalizeSourceName so 'yahoo_finance' and 'yahoo-finance'
 * resolve to the same tier instead of one falling through to
 * SOCIAL_INDIVIDUAL via string-equality miss.
 */
export function classifySourceToTier(sourceName: string): SourceTier {
  // Try the normalised form first (the new contract), then fall back to
  // the legacy lowercase-trim path for any DEFAULT_TIER_BY_SOURCE key
  // that already uses hyphens (most do, but a handful like 'yahoo-fte'
  // would round-trip identically).
  const normalised = normalizeSourceName(sourceName);
  const legacyKey = sourceName.toLowerCase().trim();
  return (
    DEFAULT_TIER_BY_SOURCE[normalised] ??
    DEFAULT_TIER_BY_SOURCE[legacyKey] ??
    'SOCIAL_INDIVIDUAL'
  );
}

// ── Comparators ─────────────────────────────────────────────────────────────

/**
 * Comparator implementing the authority hierarchy:
 *   1. tier rank (lower = better)
 *   2. observedAt (newer = better)
 *   3. confidence (higher = better)
 *
 * Use with Array.prototype.sort to surface the most-authoritative signal first.
 */
export function compareEvidence<T>(a: EvidenceSignal<T>, b: EvidenceSignal<T>): number {
  const tier = TIER_RANK[a.tier] - TIER_RANK[b.tier];
  if (tier !== 0) return tier;
  const aMs = Date.parse(a.observedAt);
  const bMs = Date.parse(b.observedAt);
  const fresh = (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
  if (fresh !== 0) return fresh;
  const conf = (b.confidence ?? 0.5) - (a.confidence ?? 0.5);
  return conf;
}

// ── Pick winner ─────────────────────────────────────────────────────────────

/**
 * Adversarial test cases (encoded in
 * __tests__/unit/evidenceHierarchy.test.ts when WS3 lands):
 *
 *   Case A: SEC 10-Q (REGULATORY, 5d old) vs Reddit "TCS laying off 15K"
 *           (SOCIAL_INDIVIDUAL, 2h old). Expected: SEC wins. Reddit
 *           goes into `overridden`. `tierOverrodeFreshness` = true.
 *
 *   Case B: Two Reuters articles, one 6h old, one 1h old, both MAJOR_PRESS.
 *           Expected: the 1h article wins. `tierOverrodeFreshness` = false.
 *
 *   Case C: WSJ (MAJOR_PRESS, 3d old) vs layoffs.fyi (AGGREGATED_DATA, 1h old).
 *           Expected: WSJ wins. `tierOverrodeFreshness` = true.
 *
 *   Case D: empty list. Expected: { winner: null, overridden: [], ... }.
 *
 *   Case E: SOCIAL_INDIVIDUAL only. Expected: winner is the freshest, but
 *           `isLowAuthority` = true. Caller should treat as advisory only.
 */
export function pickAuthoritative<T>(signals: ReadonlyArray<EvidenceSignal<T>>): PickResult<T> {
  if (!signals || signals.length === 0) {
    return { winner: null, overridden: [], tierOverrodeFreshness: false, isLowAuthority: false };
  }

  const sorted = [...signals].sort(compareEvidence);
  const winner = sorted[0];
  const losers = sorted.slice(1);

  // Determine if tier overrode freshness: there is at least one loser
  // observed AFTER the winner but at a LOWER tier.
  const winnerMs = Date.parse(winner.observedAt);
  let tierOverrodeFreshness = false;
  for (const loser of losers) {
    const loserMs = Date.parse(loser.observedAt);
    if (
      TIER_RANK[loser.tier] > TIER_RANK[winner.tier] &&
      Number.isFinite(loserMs) &&
      Number.isFinite(winnerMs) &&
      loserMs > winnerMs
    ) {
      tierOverrodeFreshness = true;
      break;
    }
  }

  return {
    winner,
    overridden: losers,
    tierOverrodeFreshness,
    isLowAuthority: TIER_RANK[winner.tier] >= TIER_RANK.AGGREGATED_DATA,
  };
}

// ── Veto logic ──────────────────────────────────────────────────────────────

/**
 * Hard veto rule: returns true when allowing `candidate` to override
 * `incumbent` would violate the authority hierarchy.
 *
 * Used by liveDataService.reconcileCompanySignals when a live-scraped
 * value contests an existing DB value. If the live value is LOWER tier
 * than the DB value, the DB value is retained regardless of freshness.
 *
 * Threshold: a candidate must be within 1 tier of the incumbent OR
 * higher to override. AGGREGATED_DATA can override SOCIAL_AGGREGATE but
 * not REGULATORY.
 */
export function shouldVetoOverride(incumbent: SourceTier, candidate: SourceTier): boolean {
  const incumbentRank = TIER_RANK[incumbent];
  const candidateRank = TIER_RANK[candidate];
  // candidate weaker by 2+ tiers → veto
  return candidateRank > incumbentRank + 1;
}

// ── Provenance helper ──────────────────────────────────────────────────────

/**
 * Build a provenance summary string for inclusion in HybridResult signal
 * quality reports. Format: "winner: SEC (REGULATORY, 5d old); overridden:
 * Reddit (SOCIAL_INDIVIDUAL, 2h old) — tier overrode freshness".
 */
export function summarizeProvenance<T>(result: PickResult<T>): string {
  if (!result.winner) return 'no evidence';
  const age = ageLabel(result.winner.observedAt);
  let s = `winner: ${result.winner.sourceName} (${result.winner.tier}, ${age})`;
  if (result.overridden.length > 0) {
    const o = result.overridden
      .slice(0, 3)
      .map((l) => `${l.sourceName} (${l.tier}, ${ageLabel(l.observedAt)})`)
      .join(', ');
    s += `; overridden: ${o}`;
    if (result.tierOverrodeFreshness) {
      s += ' — tier overrode freshness';
    }
  }
  if (result.isLowAuthority) {
    s += ' — LOW AUTHORITY';
  }
  return s;
}

function ageLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return 'unknown age';
  const dMs = Date.now() - ms;
  const m = Math.round(dMs / 60_000);
  if (m < 60) return `${m}m old`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h old`;
  const d = Math.round(h / 24);
  return `${d}d old`;
}
