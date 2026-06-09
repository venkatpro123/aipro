// trustLabels.ts — Rule 17: canonical trust-label derivation used on every intelligence surface.
// One function resolves source + confidence + sampleSize → a display-ready label.
// Import this wherever you render a score, benchmark, or recommendation.

export type TrustTier = 'MEASURED' | 'MODELED' | 'ESTIMATED';
export type TrustWarningLevel = 'none' | 'low_data' | 'no_data';

export interface TrustLabel {
  tier: TrustTier;
  sourceName: string;
  warningLevel: TrustWarningLevel;
  warningText: string | null;
  sampleSize: number | null;
  summary: string;
}

// Known source → tier. Keys are normalised (lowercase, spaces/hyphens → _).
const SOURCE_TIERS: Record<string, TrustTier> = {
  sec_8k: 'MEASURED',      sec_10q: 'MEASURED',       bls: 'MEASURED',
  warn_act: 'MEASURED',    glassdoor: 'MEASURED',      naukri: 'MEASURED',
  linkedin: 'MEASURED',    yahoo_finance: 'MEASURED',  finnhub: 'MEASURED',
  company_filing: 'MEASURED', wikipedia: 'MEASURED',   crunchbase: 'MEASURED',
  heuristic_model: 'MODELED', ml_model: 'MODELED',     cohort_model: 'MODELED',
  regression: 'MODELED',   statistical_model: 'MODELED', calibrated_model: 'MODELED',
  peer_benchmark: 'MODELED',
  heuristic: 'ESTIMATED',  default: 'ESTIMATED',       fallback: 'ESTIMATED',
  unknown: 'ESTIMATED',
};

const PRETTY_NAMES: Record<string, string> = {
  sec_8k: 'SEC 8-K',  sec_10q: 'SEC 10-Q',  bls: 'BLS', warn_act: 'WARN Act',
  glassdoor: 'Glassdoor',  naukri: 'Naukri',  linkedin: 'LinkedIn',
  yahoo_finance: 'Yahoo Finance',  finnhub: 'Finnhub',
  company_filing: 'Company Filing',  wikipedia: 'Wikipedia',  crunchbase: 'Crunchbase',
  heuristic_model: 'Statistical model',  ml_model: 'ML model',  cohort_model: 'Cohort model',
  regression: 'Regression model',  statistical_model: 'Statistical model',
  calibrated_model: 'Calibrated model',  peer_benchmark: 'Peer benchmark',
  heuristic: 'Heuristic',
};

export function getTrustLabel(
  source: string | null | undefined,
  confidence: number | null | undefined,
  sampleSize: number | null | undefined,
): TrustLabel {
  const raw = (source ?? 'unknown').toLowerCase().replace(/[\s\-]+/g, '_');

  let tier: TrustTier;
  if (SOURCE_TIERS[raw]) {
    tier = SOURCE_TIERS[raw];
  } else if (confidence != null) {
    tier = confidence >= 70 ? 'MEASURED' : confidence >= 45 ? 'MODELED' : 'ESTIMATED';
  } else {
    tier = 'ESTIMATED';
  }
  // Hard floor: very low confidence always downgrades to ESTIMATED
  if (confidence != null && confidence < 30) tier = 'ESTIMATED';

  // Warning level
  let warningLevel: TrustWarningLevel = 'none';
  let warningText: string | null = null;
  const n = sampleSize != null && sampleSize >= 5 ? sampleSize : null;

  if (sampleSize != null && sampleSize < 5) {
    warningLevel = 'low_data';
    warningText = `${sampleSize} data point${sampleSize === 1 ? '' : 's'} — directional only`;
  } else if (confidence != null && confidence < 35) {
    warningLevel = 'low_data';
    warningText = `Low confidence (${Math.round(confidence)}%) — limited signals`;
  } else if (raw === 'unknown') {
    warningLevel = 'no_data';
    warningText = 'Source unknown — treat as estimate';
  }

  const prettySource = PRETTY_NAMES[raw] ?? (source ?? '');
  const parts = [
    prettySource || null,
    confidence != null ? `${Math.round(confidence)}%` : null,
    n != null ? `N=${n}` : null,
  ].filter(Boolean) as string[];
  const sourceName = parts.join(' · ') || 'model';
  const summary = `${tier}${sourceName ? ` · ${sourceName}` : ''}${warningText ? ` · ⚠ ${warningText}` : ''}`;

  return { tier, sourceName, warningLevel, warningText, sampleSize: n, summary };
}

/** Quick tier-only lookup — for callers that just need a colour. */
export function quickTier(confidence: number | null | undefined): TrustTier {
  if (confidence == null) return 'ESTIMATED';
  if (confidence >= 70) return 'MEASURED';
  if (confidence >= 45) return 'MODELED';
  return 'ESTIMATED';
}

/** True when there is enough evidence to surface this data point to a user. */
export function meetsMinimumEvidence(
  confidence: number | null | undefined,
  sampleSize: number | null | undefined,
  minimumN = 5,
): boolean {
  if (sampleSize != null && sampleSize < minimumN) return false;
  if (confidence != null && confidence < 25) return false;
  return true;
}
