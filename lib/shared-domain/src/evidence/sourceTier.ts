// sourceTier.ts — DEBT-4 (shared evidence-tier classification)
//
// Mirrors artifacts/humanproof/src/services/evidenceHierarchy.ts so edge
// functions can apply the same tier-based reconciliation rules without
// duplicating the source registry.
//
// PURE: no I/O. Safe in Deno + browser.

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

export function tierRank(tier: SourceTier): number {
  return TIER_RANK[tier];
}

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

  // Official filing
  'company-press-release': 'OFFICIAL_FILING',
  'investor-relations':    'OFFICIAL_FILING',
  'official-linkedin':     'OFFICIAL_FILING',
  'career-page':           'OFFICIAL_FILING',
  'wikipedia':             'OFFICIAL_FILING',
  'yahoo-finance':         'OFFICIAL_FILING',
  'alphavantage':          'OFFICIAL_FILING',

  // Major press
  'bloomberg':       'MAJOR_PRESS',
  'wsj':             'MAJOR_PRESS',
  'reuters':         'MAJOR_PRESS',
  'ft':              'MAJOR_PRESS',
  'economic-times':  'MAJOR_PRESS',
  'mint':            'MAJOR_PRESS',
  'business-standard': 'MAJOR_PRESS',
  'cnbc':            'MAJOR_PRESS',
  'newsapi':         'MAJOR_PRESS',
  'gnews':           'MAJOR_PRESS',

  // Aggregated data
  'layoffs.fyi':     'AGGREGATED_DATA',
  'layoffs_fyi':     'AGGREGATED_DATA',
  'glassdoor':       'AGGREGATED_DATA',
  'crunchbase':      'AGGREGATED_DATA',
  'intelligence-db': 'AGGREGATED_DATA',
  'naukri':          'AGGREGATED_DATA',
  'indeed':          'AGGREGATED_DATA',
  'bls':             'AGGREGATED_DATA',
  'fred':            'AGGREGATED_DATA',

  // Social
  'hackernews':       'SOCIAL_AGGREGATE',
  'reddit-aggregate': 'SOCIAL_AGGREGATE',
  'reddit':           'SOCIAL_INDIVIDUAL',
  'twitter':          'SOCIAL_INDIVIDUAL',
  'blind':            'SOCIAL_INDIVIDUAL',
};

export function classifySourceToTier(sourceName: string): SourceTier {
  const key = sourceName.toLowerCase().trim();
  return DEFAULT_TIER_BY_SOURCE[key] ?? 'SOCIAL_INDIVIDUAL';
}

/**
 * Returns true when allowing `candidate` to override `incumbent` would
 * violate the authority hierarchy (>1 tier weaker).
 */
export function shouldVetoOverride(incumbent: SourceTier, candidate: SourceTier): boolean {
  return TIER_RANK[candidate] > TIER_RANK[incumbent] + 1;
}
