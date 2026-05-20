// calibrationSegments.ts
//
// Three-dimension segment classification and fallback chain for the
// calibration engine. Implements the segmentation required for India market
// accuracy — a 50,000-person Indian IT services firm has structurally
// different layoff dynamics from a 300-person US fintech.
//
// Dimensions (per product spec):
//   region:  US | EU | INDIA | APAC | LATAM
//   industry: TECH | HEALTHCARE | FINANCE | INDUSTRIAL | SERVICES
//   size:    SMALL (<1K) | MEDIUM (1K–10K) | LARGE (>10K)
//
// Segment key format: "{REGION}__{INDUSTRY}__{SIZE}"
// Examples:
//   "INDIA__TECH__LARGE"   — 50K-person Indian IT services firm
//   "US__TECH__SMALL"      — 300-person US fintech
//   "EU__FINANCE__MEDIUM"  — 5K-person European bank
//   "ANY__TECH__ANY"       — cross-region tech pooled estimate
//
// Fallback chain:
//   Most specific (all 3 dimensions) → drop size → drop industry → region only
//   → industry+size → industry only → size only → GLOBAL
//
// The loader uses this chain with the 80-outcome minimum: if a segment has
// fewer than MIN_SEGMENT_OUTCOMES verified outcomes in user_prediction_outcomes,
// its DB-backed row is skipped and the next-less-specific segment is tried.
// The in-memory SEGMENT_CALIBRATIONS bootstrap is always available.

export type SegmentRegion   = 'US' | 'EU' | 'INDIA' | 'APAC' | 'LATAM' | 'ANY';
export type SegmentIndustry = 'TECH' | 'HEALTHCARE' | 'FINANCE' | 'INDUSTRIAL' | 'SERVICES' | 'ANY';
export type SegmentSize     = 'SMALL' | 'MEDIUM' | 'LARGE' | 'ANY';

/** Minimum verified outcomes a segment must have before its DB row is used. */
export const MIN_SEGMENT_OUTCOMES = 80;

export function buildSegmentKey(
  region: SegmentRegion,
  industry: SegmentIndustry,
  size: SegmentSize,
): string {
  return `${region}__${industry}__${size}`;
}

export function classifyRegionForSegment(region: string | null | undefined): SegmentRegion {
  if (!region) return 'ANY';
  const r = region.toUpperCase().trim();
  if (r === 'US' || r === 'NA' || r === 'UNITED STATES') return 'US';
  if (r === 'IN' || r === 'INDIA')                         return 'INDIA';
  if (r === 'EU' || r === 'UK' || r === 'DE' || r === 'FR' || r === 'NL' || r === 'SE' || r === 'EUROPE') return 'EU';
  if (r === 'APAC' || r === 'SG' || r === 'AU' || r === 'JP' || r === 'HK') return 'APAC';
  if (r === 'BR' || r === 'MX' || r === 'CO' || r === 'AR' || r === 'LATAM') return 'LATAM';
  return 'ANY';
}

export function classifyIndustryForSegment(industry: string | null | undefined): SegmentIndustry {
  if (!industry) return 'ANY';
  const i = industry.toLowerCase();
  // Healthcare first — avoid matching "health tech" as TECH
  if (/health|medical|pharma|biotech|nursing|hospital|clinical/.test(i)) return 'HEALTHCARE';
  if (/tech|software|saas|it_serv|gaming|cloud|ai\b|ml\b|data|fintech|semiconductor/.test(i)) return 'TECH';
  if (/financ|banking|insurance|investment|capital|audit|accounting|wealth/.test(i)) return 'FINANCE';
  if (/manufactur|industrial|energy|oil|gas|mining|construc|utilities|aerospace|auto|chemical/.test(i)) return 'INDUSTRIAL';
  if (/service|consult|bpo|retail|media|edu|gov|hr|legal|logis|transport|hospitality|telecom/.test(i)) return 'SERVICES';
  return 'ANY';
}

/** Maps headcount to the three size tiers specified in the product requirement. */
export function classifySizeForSegment(headcount: number | null | undefined): SegmentSize {
  if (headcount == null || headcount <= 0) return 'ANY';
  if (headcount < 1_000)                   return 'SMALL';
  if (headcount <= 10_000)                 return 'MEDIUM';
  return 'LARGE';
}

/**
 * Build the ordered fallback chain for a given (region, industry, size) triple.
 * Returns segment keys from most-specific to least-specific.
 * The caller should try each key in order and stop at the first that:
 *   (a) has a DB row with n_events_total >= MIN_SEGMENT_OUTCOMES, OR
 *   (b) has a non-bootstrap in-memory entry in SEGMENT_CALIBRATIONS.
 *
 * The chain does NOT include 'GLOBAL' — the caller falls through to the
 * existing CohortScope resolution (INDIA_IT → US_BIG_TECH → GLOBAL).
 */
export function buildSegmentFallbackChain(
  region: SegmentRegion,
  industry: SegmentIndustry,
  size: SegmentSize,
): string[] {
  const r = region   !== 'ANY' ? region   : null;
  const i = industry !== 'ANY' ? industry : null;
  const s = size     !== 'ANY' ? size     : null;

  const candidates: string[] = [];

  // Level 0 — all three dimensions
  if (r && i && s) candidates.push(buildSegmentKey(r, i, s));
  // Level 1 — drop size
  if (r && i)      candidates.push(buildSegmentKey(r, i, 'ANY'));
  // Level 2 — drop industry
  if (r && s)      candidates.push(buildSegmentKey(r, 'ANY', s));
  // Level 3 — region only
  if (r)           candidates.push(buildSegmentKey(r, 'ANY', 'ANY'));
  // Level 4 — industry + size (cross-region)
  if (i && s)      candidates.push(buildSegmentKey('ANY', i, s));
  // Level 5 — industry only
  if (i)           candidates.push(buildSegmentKey('ANY', i, 'ANY'));
  // Level 6 — size only
  if (s)           candidates.push(buildSegmentKey('ANY', 'ANY', s));

  // Deduplicate while preserving order (shouldn't happen but defensive)
  return [...new Set(candidates)];
}

/** Parse a stored segment key back into its three dimensions. */
export function parseSegmentKey(key: string): {
  region: SegmentRegion;
  industry: SegmentIndustry;
  size: SegmentSize;
} | null {
  const parts = key.split('__');
  if (parts.length !== 3) return null;
  return {
    region:   parts[0] as SegmentRegion,
    industry: parts[1] as SegmentIndustry,
    size:     parts[2] as SegmentSize,
  };
}

/** Human-readable label for Transparency Tab display. */
export function segmentKeyToLabel(key: string): string {
  const parsed = parseSegmentKey(key);
  if (!parsed) return key;
  const r = parsed.region   === 'ANY' ? 'Global'   : parsed.region;
  const i = parsed.industry === 'ANY' ? 'All sectors' : parsed.industry.charAt(0) + parsed.industry.slice(1).toLowerCase();
  const s = parsed.size     === 'ANY' ? 'all sizes'
    : parsed.size === 'SMALL'  ? '<1K employees'
    : parsed.size === 'MEDIUM' ? '1K–10K employees'
    : '>10K employees';
  return `${r} · ${i} · ${s}`;
}
