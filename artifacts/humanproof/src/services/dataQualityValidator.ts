// dataQualityValidator.ts
// Per-field confidence scoring and intelligent fallback calibration.
//
// Problem it solves:
//   The scoring engine used 0.5 as a universal fallback for every null field,
//   regardless of industry, region, or company type. A private Indian startup
//   with null revenue gets the same L1 treatment as a public US company with null
//   stock — even though those nulls have completely different risk implications.
//
// What this module provides:
//   1. DataQualityReport: per-field confidence scores (0–1) for a CompanyData record
//   2. IntelligentFallbacks: industry/region-calibrated fallback values that replace
//      the flat 0.5 defaults — a healthcare company with null revenue gets a different
//      fallback than a crypto startup
//   3. AccuracyMetrics: overall data completeness and expected score variance

import type { CompanyData } from '../data/companyDatabase';
import type { IndustryRisk } from '../data/industryRiskData';
import { getAllIndustryRisk } from './db/staticDataService';

export interface FieldConfidence {
  field:      string;
  hasValue:   boolean;
  confidence: number;   // 0–1: how much to trust this field for scoring
  source:     'live' | 'database' | 'fallback' | 'missing';
  note?:      string;
}

export interface DataQualityReport {
  overallConfidence:  number;   // 0–1: weighted average across critical fields
  completeness:       number;   // 0–1: fraction of critical fields present
  fields:             FieldConfidence[];
  expectedScoreVariance: number; // ±pts — how much score might shift with live data
  reliabilityTier:    'A' | 'B' | 'C' | 'D';
  // Tier A: 90%+ fields present, live source → ±3 pts variance
  // Tier B: 70–90% fields present, DB source → ±6 pts variance
  // Tier C: 50–70% fields present, partial DB → ±10 pts variance
  // Tier D: <50% fields present, fallback used → ±18 pts variance
  missingCriticalFields: string[];
  suggestedActions:      string[];
}

export interface IntelligentFallbacks {
  revenueGrowthYoY:    number;
  stock90DayChange:    number | null;
  revenuePerEmployee:  number;
  layoffRounds:        number;
  lastLayoffPercent:   number | null;
  employeeCount:       number;
  aiInvestmentSignal:  CompanyData['aiInvestmentSignal'];
}

// ── Field weight table (how much each field matters to the final score) ─────
const FIELD_WEIGHTS: Record<string, number> = {
  revenueGrowthYoY:   0.35,  // L1 primary — highest weight
  stock90DayChange:   0.25,  // L1 secondary
  employeeCount:      0.15,  // L1 overstaffing
  layoffRounds:       0.20,  // L2 primary
  layoffsLast24Months: 0.20, // L2 recency
  lastLayoffPercent:  0.15,  // L2 severity
  revenuePerEmployee: 0.15,  // L1 overstaffing ratio
  aiInvestmentSignal: 0.10,  // D2/D6
};

// ── Industry-calibrated fallback revenue growth rates ───────────────────────
// When a company has null revenue, use the industry median rather than 0.5
const INDUSTRY_REVENUE_FALLBACK: Record<string, number> = {
  'Technology':         8,
  'IT Services':        5,
  'SaaS':               15,
  'Enterprise Software':8,
  'AI Research':        80,
  'Cybersecurity':      18,
  'FinTech':            20,
  'Banking':            6,
  'Healthcare':         8,
  'Biotech':            10,
  'Manufacturing':      3,
  'Energy':             2,
  'Retail':             2,
  'Media':              -5,
  'EdTech':             5,
  'E-commerce':         8,
  'Gaming':             -2,
  'BPO':                1,
  'Logistics':          4,
  'Automotive':         4,
  'Telecom':            3,
  'Conglomerate':       6,
  'default':            5,
};

// ── Industry-calibrated fallback revenue per employee (INR for India, USD for others)
const INDUSTRY_RPE_FALLBACK: Record<string, { IN: number; US: number; EU: number; APAC: number; GLOBAL: number }> = {
  'Technology':         { IN: 55000,  US: 380000, EU: 300000, APAC: 200000, GLOBAL: 280000 },
  'IT Services':        { IN: 35000,  US: 200000, EU: 180000, APAC: 120000, GLOBAL: 150000 },
  'SaaS':               { IN: 75000,  US: 400000, EU: 320000, APAC: 220000, GLOBAL: 300000 },
  'Healthcare':         { IN: 65000,  US: 500000, EU: 350000, APAC: 200000, GLOBAL: 350000 },
  'Banking':            { IN: 45000,  US: 450000, EU: 380000, APAC: 280000, GLOBAL: 350000 },
  'Manufacturing':      { IN: 28000,  US: 280000, EU: 240000, APAC: 180000, GLOBAL: 220000 },
  'BPO':                { IN: 18000,  US: 120000, EU: 110000, APAC: 80000,  GLOBAL: 100000 },
  'Retail':             { IN: 20000,  US: 200000, EU: 180000, APAC: 120000, GLOBAL: 160000 },
  'FinTech':            { IN: 60000,  US: 480000, EU: 350000, APAC: 250000, GLOBAL: 320000 },
  'EdTech':             { IN: 18000,  US: 280000, EU: 220000, APAC: 150000, GLOBAL: 180000 },
  'Logistics':          { IN: 20000,  US: 180000, EU: 160000, APAC: 120000, GLOBAL: 150000 },
  'default':            { IN: 35000,  US: 300000, EU: 250000, APAC: 180000, GLOBAL: 220000 },
};

// ── Source reliability scores ─────────────────────────────────────────────
const SOURCE_CONFIDENCE: Record<string, number> = {
  // Live scraped sources (highest confidence — real-time observations)
  'yahoo-finance':              0.95,  // Yahoo Finance chart API — scraped, no key
  'Yahoo Finance':              0.95,
  'AlphaVantage':               0.93,  // Alpha Vantage API — key-gated fallback
  'alphavantage':               0.93,
  'bse-india':                  0.88,  // BSE India API — no key
  'nse-india':                  0.88,  // NSE India API — no key
  'NSE':                        0.90,
  'BSE':                        0.88,
  'SEC EDGAR':                  0.95,  // Regulatory — highest confidence for US layoff data
  'WARN Act':                   0.95,  // Regulatory — legally required filing
  'Naukri+Indeed+LinkedIn':     0.82,  // Direct job board scraping — live
  'Serper API':                 0.82,  // Serper API fallback
  'Google News':                0.78,
  'Bing News':                  0.76,
  'Reddit':                     0.55,  // Reddit — useful but lower confidence
  // Database sources
  'Live OSINT Database':        0.90,
  'Seeded Intelligence DB':     0.68,  // Seeded DB — accurate at seed time, may be stale
  'company_intelligence:exact': 0.70,
  'company_intelligence:fuzzy': 0.60,
  'Nasdaq':                     0.92,
  'NYSE':                       0.92,
  'Crunchbase + Layoffs.fyi':   0.82,
  'Crunchbase':                 0.78,
  'Layoffs.fyi':                0.85,
  'Supabase Intelligence':      0.72,
  'CompanyIntelligenceDB':      0.70,
  'NASSCOM':                    0.75,
  // Fallback sources (lowest confidence)
  'Fallback - Unknown Company': 0.10,
  'Fallback':                   0.20,
  'User Input':                 0.45,
  'default':                    0.60,
};

function getSourceConfidence(source: string | undefined): number {
  if (!source) return 0.35;
  for (const [key, val] of Object.entries(SOURCE_CONFIDENCE)) {
    if (source.includes(key)) return val;
  }
  return SOURCE_CONFIDENCE.default;
}

// ── Main validator ────────────────────────────────────────────────────────

export function validateDataQuality(companyData: CompanyData): DataQualityReport {
  const srcConf = getSourceConfidence(companyData.source);
  const isFallback = (companyData.source ?? '').toLowerCase().includes('fallback');

  const fields: FieldConfidence[] = [
    {
      field: 'revenueGrowthYoY',
      hasValue: companyData.revenueGrowthYoY != null,
      confidence: companyData.revenueGrowthYoY != null ? srcConf : 0,
      source: companyData.revenueGrowthYoY != null ? (srcConf > 0.85 ? 'live' : 'database') : 'missing',
      note: companyData.revenueGrowthYoY == null
        ? 'Revenue growth unavailable — L1 weight redistributed to remaining signals'
        : undefined,
    },
    {
      field: 'stock90DayChange',
      hasValue: companyData.stock90DayChange != null,
      confidence: companyData.isPublic
        ? (companyData.stock90DayChange != null ? srcConf : 0)
        : 0.7,  // private companies structurally have no stock — not a gap
      source: !companyData.isPublic ? 'fallback'
        : companyData.stock90DayChange != null ? (srcConf > 0.85 ? 'live' : 'database')
        : 'missing',
      note: companyData.isPublic && companyData.stock90DayChange == null
        ? 'Public company stock data missing — may be approximated from BSE 52-week range'
        : undefined,
    },
    {
      field: 'employeeCount',
      hasValue: companyData.employeeCount > 0,
      confidence: companyData.employeeCount > 0 ? Math.min(0.90, srcConf + 0.05) : 0.2,
      source: companyData.employeeCount > 0 ? 'database' : 'fallback',
    },
    {
      field: 'layoffsLast24Months',
      hasValue: companyData.layoffsLast24Months.length > 0,
      confidence: companyData.layoffsLast24Months.length > 0 ? 0.88 : 0.55,
      // Absence of layoff history is informative (company hasn't cut) — not truly missing
      source: companyData.layoffsLast24Months.length > 0 ? 'database' : 'database',
      note: companyData.layoffsLast24Months.length === 0
        ? 'No layoffs on record — could be clean history or data gap; layoffs.fyi availability affects confidence'
        : undefined,
    },
    {
      field: 'layoffRounds',
      hasValue: companyData.layoffRounds >= 0,
      confidence: 0.85,
      source: 'database',
    },
    {
      field: 'lastLayoffPercent',
      hasValue: companyData.lastLayoffPercent != null,
      confidence: companyData.lastLayoffPercent != null ? 0.82 : 0.40,
      source: companyData.lastLayoffPercent != null ? 'database' : 'fallback',
    },
    {
      field: 'revenuePerEmployee',
      hasValue: companyData.revenuePerEmployee > 0,
      confidence: companyData.revenuePerEmployee > 0 ? Math.min(0.85, srcConf) : 0.3,
      source: companyData.revenuePerEmployee > 0 ? 'database' : 'fallback',
    },
    {
      field: 'aiInvestmentSignal',
      hasValue: true,
      confidence: companyData.aiInvestmentSignal !== 'medium' ? 0.75 : 0.50,
      // 'medium' is the default — low confidence it's accurate vs just a default
      source: 'database',
      note: companyData.aiInvestmentSignal === 'medium'
        ? 'Default value — live OSINT would provide a more precise signal'
        : undefined,
    },
  ];

  const criticalFields = ['revenueGrowthYoY', 'stock90DayChange', 'employeeCount', 'layoffsLast24Months'];
  const presentCritical = criticalFields.filter(f =>
    fields.find(fld => fld.field === f)?.hasValue,
  );
  const completeness = presentCritical.length / criticalFields.length;

  // Weighted overall confidence
  let totalWeight = 0;
  let weightedConf = 0;
  for (const fld of fields) {
    const w = FIELD_WEIGHTS[fld.field] ?? 0.1;
    totalWeight += w;
    weightedConf += fld.confidence * w;
  }
  const overallConfidence = totalWeight > 0 ? weightedConf / totalWeight : 0.3;

  // Reliability tier — accounts for unknown/startup companies separately.
  // A private startup with scraping-based live news + hiring signals should NOT be Tier D
  // just because it lacks stock data (structurally absent for private cos, not a gap).
  let tier: DataQualityReport['reliabilityTier'];
  let expectedVariance: number;
  const hasLiveSignals = Boolean(
    (companyData as any)._informativeLiveSignals > 0 ||
    (companyData as any)._liveDataCoverage?.genuineApiSignals > 0,
  );
  if (isFallback && !hasLiveSignals) {
    tier = 'D'; expectedVariance = 18;  // Unknown company, no live signals
  } else if (isFallback && hasLiveSignals) {
    tier = 'C'; expectedVariance = 12;  // Unknown company but live news/hiring signals present
  } else if (overallConfidence < 0.25) {
    tier = 'D'; expectedVariance = 18;
  } else if (overallConfidence < 0.50 || completeness < 0.50) {
    tier = 'C'; expectedVariance = 10;
  } else if (overallConfidence < 0.72 || completeness < 0.75) {
    tier = 'B'; expectedVariance = 6;
  } else {
    tier = 'A'; expectedVariance = 3;
  }

  const missingCritical = fields
    .filter(f => !f.hasValue && FIELD_WEIGHTS[f.field] >= 0.15)
    .map(f => f.field);

  const suggestedActions: string[] = [];
  if (missingCritical.includes('revenueGrowthYoY')) {
    suggestedActions.push(
      companyData.isPublic
        ? 'Revenue growth missing — configure Yahoo Finance or Alpha Vantage in proxy-live-signals for live quarterly data'
        : 'Private company: revenue growth unavailable publicly — L1 weight redistributed to funding age and employee efficiency',
    );
  }
  if (missingCritical.includes('stock90DayChange') && companyData.isPublic) {
    suggestedActions.push('Stock 90-day return missing — Yahoo Finance scraping is the primary source (no API key needed); check proxy-live-signals EF deployment');
  }
  if (isFallback) {
    suggestedActions.push(
      hasLiveSignals
        ? `Company not in database — score uses live scraped signals (news/hiring) + industry baselines. Variance ±${expectedVariance} pts.`
        : `Company not in database and no live signals obtained — score is sector/role estimate only. Variance ±${expectedVariance} pts. Try re-running to trigger fresh scraping.`,
    );
  } else if (completeness < 0.75) {
    suggestedActions.push(`${Math.round(completeness * 100)}% of critical fields present — score variance is ±${expectedVariance} pts`);
  }

  return {
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    completeness: Math.round(completeness * 100) / 100,
    fields,
    expectedScoreVariance: expectedVariance,
    reliabilityTier: tier,
    missingCriticalFields: missingCritical,
    suggestedActions,
  };
}

// ── Intelligent fallbacks ─────────────────────────────────────────────────

/**
 * Compute industry/region-calibrated fallback values for a company.
 * These replace the flat 0.5 default used when fields are null.
 *
 * A healthcare company with null revenue should NOT get the same L1 treatment
 * as a startup in distress — healthcare has a low layoff rate even without data.
 */
export function computeIntelligentFallbacks(
  companyData: CompanyData,
  industryData?: IndustryRisk,
): IntelligentFallbacks {
  const industry = companyData.industry ?? 'default';
  const region   = companyData.region   ?? 'GLOBAL';

  // Revenue growth fallback: use industry median
  const revFallback = INDUSTRY_REVENUE_FALLBACK[industry] ?? INDUSTRY_REVENUE_FALLBACK.default;

  // RPE fallback: use industry × region calibrated value
  const rpeTable = INDUSTRY_RPE_FALLBACK[industry] ?? INDUSTRY_RPE_FALLBACK.default;
  const rpeFallback = rpeTable[region] ?? rpeTable.GLOBAL;

  // Stock fallback for public companies: derive from industryData baseline
  // If the industry is volatile/declining → assume moderate negative pressure
  let stockFallback: number | null = null;
  if (companyData.isPublic && industryData) {
    if (industryData.growthOutlook === 'declining') stockFallback = -12;
    else if (industryData.growthOutlook === 'volatile') stockFallback = -5;
    else if (industryData.growthOutlook === 'growing') stockFallback = 8;
    else stockFallback = 2; // stable
  }

  // AI investment signal: default from industry adoption rate
  let aiSignal: CompanyData['aiInvestmentSignal'] = 'medium';
  if (industryData) {
    if (industryData.aiAdoptionRate >= 0.85) aiSignal = 'very-high';
    else if (industryData.aiAdoptionRate >= 0.65) aiSignal = 'high';
    else if (industryData.aiAdoptionRate < 0.30) aiSignal = 'low';
  }

  // Layoff fallback: use industry average rate to estimate rounds
  const avgLayoffRate = industryData?.avgLayoffRate2025 ?? 0.04;
  const impliedRounds = avgLayoffRate > 0.10 ? 1 : 0;

  return {
    revenueGrowthYoY:   revFallback,
    stock90DayChange:   stockFallback,
    revenuePerEmployee: companyData.revenuePerEmployee > 0 ? companyData.revenuePerEmployee : rpeFallback,
    layoffRounds:       companyData.layoffRounds,
    lastLayoffPercent:  companyData.lastLayoffPercent ?? (impliedRounds > 0 ? 5 : null),
    employeeCount:      companyData.employeeCount > 0 ? companyData.employeeCount : 1000,
    aiInvestmentSignal: companyData.aiInvestmentSignal !== 'medium'
      ? companyData.aiInvestmentSignal
      : aiSignal,
  };
}

/**
 * Apply intelligent fallbacks to a CompanyData record, filling null fields
 * with industry-calibrated values. Returns the patched record and a log of
 * which fields were filled.
 *
 * Called by calculateCompanyHealthScore when fields are null, replacing the
 * flat 0.5 default that ignores industry context entirely.
 */
export function applyIntelligentFallbacks(
  companyData: CompanyData,
): { patched: CompanyData; filledFields: string[]; fallbacksUsed: boolean } {
  const industry = companyData.industry ?? 'Technology';
  const industryMap = getAllIndustryRisk();
  const industryData = industryMap[industry] ??
    Object.values(industryMap).find((_, i) => i === 0);

  const fallbacks = computeIntelligentFallbacks(companyData, industryData);
  const patched = { ...companyData };
  const filled: string[] = [];

  if (patched.revenueGrowthYoY == null) {
    patched.revenueGrowthYoY = fallbacks.revenueGrowthYoY;
    filled.push(`revenueGrowthYoY→${fallbacks.revenueGrowthYoY}% (${industry} median)`);
  }
  if (patched.stock90DayChange == null && patched.isPublic && fallbacks.stock90DayChange != null) {
    patched.stock90DayChange = fallbacks.stock90DayChange;
    filled.push(`stock90DayChange→${fallbacks.stock90DayChange}% (industry outlook proxy)`);
  }
  if (patched.revenuePerEmployee <= 0) {
    patched.revenuePerEmployee = fallbacks.revenuePerEmployee;
    filled.push(`revenuePerEmployee→${fallbacks.revenuePerEmployee} (${industry}/${patched.region} median)`);
  }
  if (patched.employeeCount <= 0) {
    patched.employeeCount = fallbacks.employeeCount;
    filled.push('employeeCount→1000 (default)');
  }

  return {
    patched,
    filledFields: filled,
    fallbacksUsed: filled.length > 0,
  };
}

// ── Accuracy metrics for monitoring ─────────────────────────────────────────

export interface AccuracyMetrics {
  dataRichnessScore:  number;   // 0–100: how data-rich this audit is
  signalCoverage:     string;   // human-readable summary
  confidenceBand:     { low: number; high: number };  // expected true score range
  recommendedActions: string[];
}

export function computeAccuracyMetrics(
  score: number,
  report: DataQualityReport,
): AccuracyMetrics {
  const richness = Math.round(
    report.overallConfidence * 60 +
    report.completeness      * 40,
  );

  const band = {
    low:  Math.max(0,   score - report.expectedScoreVariance),
    high: Math.min(100, score + report.expectedScoreVariance),
  };

  const tier = report.reliabilityTier;
  const signalCoverage =
    tier === 'A' ? `High confidence (Tier A) — all critical signals present`
    : tier === 'B' ? `Good confidence (Tier B) — most signals present, ±${report.expectedScoreVariance} pts variance`
    : tier === 'C' ? `Moderate confidence (Tier C) — partial data, ±${report.expectedScoreVariance} pts variance`
    : `Low confidence (Tier D) — significant data gaps, ±${report.expectedScoreVariance} pts variance`;

  return {
    dataRichnessScore: richness,
    signalCoverage,
    confidenceBand: band,
    recommendedActions: report.suggestedActions,
  };
}
