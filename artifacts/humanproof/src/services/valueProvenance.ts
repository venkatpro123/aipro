// valueProvenance.ts
//
// The single contract: every number shown in the dashboard maps to MEASURED,
// MODELED, or ESTIMATED via this function. Centralised so we never have to
// audit each component individually to decide what kind of label to attach.
//
// CONTRACT
// ────────
//   MEASURED  — directly observed data with a timestamped source.
//               (Stock price from Alpha Vantage; SEC filing revenue; WARN Act
//                layoff event; user-reported runway; Naukri live job posting count)
//
//   MODELED   — computed from measured data via a documented formula.
//               (L1 score from stock + revenue + headcount; survival probability
//                from logistic regression; preparedness composite score)
//
//   ESTIMATED — developer approximation or research-derived value without
//               direct empirical validation for THIS specific company/role.
//               (Career path successRate12mPct; salary trajectory params;
//                heuristic industry baselines; uncalibrated_placeholder constants)
//
// USAGE
// ─────
//   const p = getValueProvenance('stock_90d_change', 'alpha-vantage');
//   //=> { kind: 'measured', sourceLabel: 'Alpha Vantage (live)' }
//
//   const p = getValueProvenance('preparedness_financial_pillar');
//   //=> { kind: 'modeled', sourceLabel: 'HumanProof scoring formula' }
//
//   const p = getValueProvenance('career_market_india_openings');
//   //=> { kind: 'estimated', sourceLabel: 'careerPathMarket (Q1 2026 research)' }
//
// Users who discover unlabeled estimates distrust labeled facts — the
// contamination spreads. The fix is to label everything, by default, here.

import type { ProvenanceKind } from '../components/AuditTabs/common/ProvenanceLabel';

// ── Source provider labels ───────────────────────────────────────────────────
// Centralised so renamed providers update everywhere.

export const SOURCE_LABELS: Record<string, string> = {
  // Live data providers (MEASURED)
  'alpha-vantage':    'Alpha Vantage (live API)',
  'alphavantage':     'Alpha Vantage (live API)',
  'yahoo-finance':    'Yahoo Finance (live API)',
  'bse-india':        'BSE India (live API)',
  'nse-india':        'NSE India (live API)',
  'sec-edgar':        'SEC EDGAR (regulatory filing)',
  'warn-act':         'WARN Act (US Dept of Labor)',
  'naukri':           'Naukri.com (live job postings)',
  'serper':           'Serper API (web search)',
  'layoffs-fyi':      'layoffs.fyi (curated database)',
  'newsapi':          'NewsAPI (news articles)',
  'rss2json':         'RSS news feeds',
  'bls':              'BLS JOLTS (US Bureau of Labor Statistics)',
  'glassdoor':        'Glassdoor (employer reviews)',
  'user_reported':    'User-reported (you provided this)',
  'user_input':       'User-reported (you provided this)',

  // DB-cached snapshots (MEASURED but cached — caller should add age)
  'company_intelligence': 'HumanProof company intelligence DB',
  'breaking_news_events': 'Breaking news cache (scraped + verified)',

  // Computed / modeled
  'modeled':            'HumanProof scoring formula',
  'calibrated':         'Calibrated against historical outcomes',
  'logistic_regression':'Logistic regression on outcome data',
  'engine':             'HumanProof engine (model output)',

  // Estimated / heuristic
  'heuristic':          'Industry baseline (Q1 2026 research)',
  'careerPathMarket':   'careerPathMarket (Q1 2026 research baseline)',
  'developer_estimate': 'Developer estimate (uncalibrated)',
  'fallback':           'Heuristic fallback (no live data available)',
  'static':             'Static baseline (not live)',
} as const;

// ── Field provenance registry ────────────────────────────────────────────────
// Every dashboard field is registered here with its default provenance kind.
// When a `source` parameter is passed to getValueProvenance, it may override
// the default (e.g. a stock price is MEASURED when live, ESTIMATED when fallback).

interface FieldProvenance {
  /** Default provenance kind when no source-specific override applies */
  defaultKind: ProvenanceKind;
  /** Maps source strings → provenance kind (overrides default when matched) */
  sourceMap?: Record<string, ProvenanceKind>;
  /** Default source label when no source string is matched */
  defaultSourceLabel?: string;
  /** Short rationale shown in tooltips */
  rationale?: string;
}

const FIELD_PROVENANCE: Record<string, FieldProvenance> = {
  // ── Top-level score outputs (always MODELED) ──────────────────────────────
  'total_risk_score':       { defaultKind: 'modeled', defaultSourceLabel: 'HumanProof scoring formula (L1–L5 + D2–D8)' },
  'confidence_percent':     { defaultKind: 'modeled', defaultSourceLabel: 'Confidence model (data quality + freshness + cohort fit)' },
  'confidence_interval':    { defaultKind: 'modeled', defaultSourceLabel: 'Conformal prediction (per-cohort calibration)' },
  'survival_probability':   { defaultKind: 'modeled', defaultSourceLabel: 'Logistic regression on 200-event outcome cohort' },
  'risk_score_l1':          { defaultKind: 'modeled', defaultSourceLabel: 'L1 formula: stock + revenue + headcount calibration' },
  'risk_score_l2':          { defaultKind: 'modeled', defaultSourceLabel: 'L2 formula: layoff rounds + recency + size' },
  'risk_score_l3':          { defaultKind: 'modeled', defaultSourceLabel: 'L3 formula: task automatability + hiring trend' },
  'risk_score_l4':          { defaultKind: 'modeled', defaultSourceLabel: 'L4 formula: industry + sector contagion' },
  'risk_score_l5':          { defaultKind: 'modeled', defaultSourceLabel: 'L5 formula: regional + macro adjustments' },

  // ── Raw financial signals (MEASURED when live, ESTIMATED when fallback) ──
  'stock_90d_change': {
    defaultKind: 'estimated',
    sourceMap: {
      'alpha-vantage':  'measured', 'alphavantage':   'measured',
      'yahoo-finance':  'measured', 'bse-india':      'measured',
      'nse-india':      'measured', 'heuristic':      'estimated',
      'fallback':       'estimated', 'static':         'estimated',
    },
  },
  'revenue_growth_yoy': {
    defaultKind: 'estimated',
    sourceMap: {
      'sec-edgar':     'measured', 'alpha-vantage':  'measured',
      'yahoo-finance': 'measured', 'bse-india':      'measured',
      'heuristic':     'estimated', 'fallback':       'estimated',
    },
  },
  'employee_count': {
    defaultKind: 'estimated',
    sourceMap: {
      'sec-edgar':     'measured', 'yahoo-finance':  'measured',
      'company_intelligence': 'measured', 'scraping':       'measured',
      'heuristic':     'estimated', 'fallback':       'estimated',
    },
  },
  'revenue_per_employee': {
    defaultKind: 'modeled',
    defaultSourceLabel: 'Computed: revenue ÷ headcount (both MEASURED)',
  },

  // ── Layoff history (MEASURED when from verified source) ──────────────────
  'layoff_rounds': {
    defaultKind: 'measured',
    sourceMap: {
      'warn-act':     'measured', 'layoffs-fyi':  'measured',
      'sec-edgar':    'measured', 'newsapi':      'measured',
      'heuristic':    'estimated',
    },
    defaultSourceLabel: 'Layoff events database (WARN + layoffs.fyi + news)',
  },
  'last_layoff_percent':    { defaultKind: 'measured', defaultSourceLabel: 'Layoff event record (verified source)' },
  'warn_filings':           { defaultKind: 'measured', defaultSourceLabel: 'WARN Act (US Dept of Labor regulatory database)' },

  // ── Hiring / market signals ──────────────────────────────────────────────
  'hiring_freeze_score': {
    defaultKind: 'estimated',
    sourceMap: { 'naukri': 'measured', 'serper': 'measured', 'heuristic': 'estimated' },
  },
  'india_openings_count': {
    defaultKind: 'estimated',
    defaultSourceLabel: 'careerPathMarket (Q1 2026 research baseline, ±30% quarterly drift)',
  },
  'success_rate_12m_pct': {
    defaultKind: 'estimated',
    defaultSourceLabel: 'careerPathMarket (Q1 2026 research; career-twin transition data n=200)',
  },
  'weeks_to_first_interview': {
    defaultKind: 'estimated',
    defaultSourceLabel: 'careerPathMarket (research estimate, not measured per-user)',
  },
  'hiring_bar_text': {
    defaultKind: 'estimated',
    defaultSourceLabel: 'careerPathMarket (qualitative research baseline)',
  },
  'median_salary_delta_pct': {
    defaultKind: 'estimated',
    defaultSourceLabel: 'careerPathMarket (median observed transition salary delta)',
  },

  // ── User-provided financial inputs (MEASURED — user is the ground truth) ─
  'financial_runway_months': { defaultKind: 'measured', defaultSourceLabel: 'User-reported (your savings / monthly expenses)' },
  'monthly_burn_rate':       { defaultKind: 'measured', defaultSourceLabel: 'User-reported financial profile' },
  'emergency_fund_months':   { defaultKind: 'measured', defaultSourceLabel: 'User-reported (you provided this)' },
  'salary_band':             { defaultKind: 'measured', defaultSourceLabel: 'User-reported salary band' },
  'tenure_years':            { defaultKind: 'measured', defaultSourceLabel: 'User-reported tenure' },

  // ── Preparedness pillar scores (MODELED — formula composites) ───────────
  'preparedness_overall':    { defaultKind: 'modeled', defaultSourceLabel: 'Preparedness formula (5 pillars × documented weights)' },
  'preparedness_financial':  { defaultKind: 'modeled', defaultSourceLabel: 'Financial pillar: min(100, months/8 × 100)' },
  'preparedness_market':     { defaultKind: 'modeled', defaultSourceLabel: 'Market pillar: networkStrength × leverage × liquidity' },
  'preparedness_skills':     { defaultKind: 'modeled', defaultSourceLabel: 'Skills pillar: (1 − atRiskLTV/totalLTV) × 100' },
  'preparedness_clarity':    { defaultKind: 'modeled', defaultSourceLabel: 'Clarity pillar: goal + prior changes + resilience' },
  'preparedness_operational':{ defaultKind: 'modeled', defaultSourceLabel: 'Resume pillar: updatedFactor + bullets + ATS' },

  // ── Contingency path probabilities (MODELED or ESTIMATED — depends on source) ─
  'contingency_stay_feasibility': {
    defaultKind: 'estimated',
    defaultSourceLabel: 'Developer-estimated formula (no empirical "kept job" outcome dataset)',
  },
  'contingency_negotiate_feasibility': {
    defaultKind: 'estimated',
    defaultSourceLabel: 'Developer-estimated formula (negotiation outcomes not tracked in calibration)',
  },
  'contingency_transition_feasibility': {
    defaultKind: 'estimated',
    sourceMap: { 'market_successRate': 'modeled', 'portability_matrix': 'modeled', 'estimated': 'estimated' },
    defaultSourceLabel: 'Transition feasibility (blends market research + formula)',
  },
  'path_confidence_pct':     { defaultKind: 'estimated', defaultSourceLabel: 'Path-confidence formula (uncalibrated_placeholder)' },

  // ── Negotiation outputs (MODELED) ─────────────────────────────────────────
  'negotiation_leverage_score': { defaultKind: 'modeled', defaultSourceLabel: 'Leverage formula: market + runway + tenure + performance' },

  // ── Conformal CI (MODELED — calibrated on empirical outcomes) ────────────
  'conformal_ci_lower':      { defaultKind: 'modeled', defaultSourceLabel: 'Conformal prediction (per-cohort empirical calibration)' },
  'conformal_ci_upper':      { defaultKind: 'modeled', defaultSourceLabel: 'Conformal prediction (per-cohort empirical calibration)' },

  // ── Score trajectory (MEASURED when from history; MODELED when projected) ─
  'score_velocity_pts_per_month': {
    defaultKind: 'estimated',
    sourceMap: { 'history': 'measured', 'signal_model': 'modeled', 'heuristic': 'estimated' },
  },
  'days_to_critical_date':   { defaultKind: 'modeled', defaultSourceLabel: 'Projection: current score + velocity → 70-pt threshold' },

  // ── Industry / sector (typically ESTIMATED unless BLS live) ──────────────
  'industry_risk_score': {
    defaultKind: 'estimated',
    sourceMap: { 'bls': 'measured', 'heuristic': 'estimated' },
  },
  'sector_contagion_probability': { defaultKind: 'modeled', defaultSourceLabel: 'Sector contagion formula (peer layoffs + decay)' },
  'sector_peer_count': {
    defaultKind: 'measured',
    sourceMap: { 'breaking_news_events': 'measured', 'layoffs-fyi': 'measured', 'heuristic': 'estimated' },
  },

  // ── Macroeconomic ────────────────────────────────────────────────────────
  'macro_unemployment_rate':{ defaultKind: 'measured', defaultSourceLabel: 'BLS (US Bureau of Labor Statistics)' },
  'macro_layoffs_rate':     { defaultKind: 'measured', defaultSourceLabel: 'BLS JOLTS' },

  // ── Calibration meta (MEASURED — engineering metric) ─────────────────────
  'calibration_n_events':   { defaultKind: 'measured', defaultSourceLabel: 'Outcome dataset count (verified)' },
  'calibration_auc_roc':    { defaultKind: 'measured', defaultSourceLabel: 'Hold-out validation metric' },
  'calibration_coverage_pct': { defaultKind: 'measured', defaultSourceLabel: 'Fraction of formula weight that is regression-derived' },
};

// ── Public API ────────────────────────────────────────────────────────────────

export interface ValueProvenance {
  /** MEASURED | MODELED | ESTIMATED */
  kind: ProvenanceKind;
  /** Human-readable source attribution shown in tooltip */
  sourceLabel: string;
  /** Original field key (for telemetry / debugging) */
  field: string;
  /** Original source string passed in (for telemetry / debugging) */
  source?: string;
}

/**
 * Returns the provenance contract for a displayed value.
 *
 * @param field   Stable field identifier (e.g. 'stock_90d_change', 'preparedness_overall')
 * @param source  Optional source string (e.g. 'alpha-vantage', 'heuristic', 'modeled')
 *
 * Resolution order:
 *   1. If `field` is in the registry AND `source` matches a sourceMap entry → use that kind.
 *   2. Otherwise use the field's defaultKind.
 *   3. If field is not in the registry: default to ESTIMATED + warning label.
 *      (Better to over-label than to silently treat an unknown value as fact.)
 */
export function getValueProvenance(
  field: string,
  source?: string | null,
): ValueProvenance {
  const entry = FIELD_PROVENANCE[field];

  if (!entry) {
    // Unknown field — default to ESTIMATED. This is intentionally conservative:
    // it's better to over-label than to silently show a number as fact.
    return {
      kind: 'estimated',
      sourceLabel: source
        ? (SOURCE_LABELS[source] ?? source)
        : `Unknown source for field "${field}" — defaulted to ESTIMATED`,
      field,
      source: source ?? undefined,
    };
  }

  // Source-specific override
  if (source && entry.sourceMap?.[source]) {
    return {
      kind: entry.sourceMap[source],
      sourceLabel: SOURCE_LABELS[source] ?? source,
      field,
      source,
    };
  }

  return {
    kind: entry.defaultKind,
    sourceLabel: source
      ? (SOURCE_LABELS[source] ?? entry.defaultSourceLabel ?? source)
      : (entry.defaultSourceLabel ?? SOURCE_LABELS[entry.defaultKind] ?? entry.defaultKind),
    field,
    source: source ?? undefined,
  };
}

/**
 * Bulk version — get provenance for multiple fields at once.
 * Useful in components that render several numbers from the same source bundle.
 */
export function getValueProvenances(
  entries: Array<{ field: string; source?: string | null }>,
): ValueProvenance[] {
  return entries.map(e => getValueProvenance(e.field, e.source));
}

/**
 * Returns true when a field is registered. Useful for development/test
 * assertions that no UI component is displaying an un-registered number.
 */
export function isFieldRegistered(field: string): boolean {
  return field in FIELD_PROVENANCE;
}

/**
 * Test-only: list every registered field. Used by registry-coverage tests
 * that verify dashboards don't show numbers from fields the registry doesn't know.
 */
export function listRegisteredFields(): string[] {
  return Object.keys(FIELD_PROVENANCE);
}
