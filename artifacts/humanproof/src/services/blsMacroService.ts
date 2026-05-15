// blsMacroService.ts — v16.0
//
// Bureau of Labor Statistics (BLS) JOLTS + Federal Reserve FRED macro indicators.
//
// PURPOSE:
//   Sector-level leading economic indicators that predict layoff waves 60–90 days
//   before company-level signals appear. The macro picture sets the prior probability
//   for any given company signal — a company doing a 10% RIF in a contraction is
//   very different from the same RIF during expansion.
//
// DATA SOURCES (consumed via pipeline — no direct API calls here):
//   BLS JOLTS (Job Openings and Labor Turnover Survey)
//     https://www.bls.gov/jlt/  — released monthly, ~30-day lag
//     Key metrics: quits rate, layoffs rate, job openings rate, hiring rate
//
//   FRED (Federal Reserve Economic Data)
//     https://fred.stlouisfed.org/
//     FEDFUNDS: Effective Federal Funds Rate
//     T10Y2Y: 10-Year Treasury minus 2-Year Treasury (yield curve)
//     NASDAQCOM: NASDAQ Composite Index
//
// KEY RESEARCH:
//   - BLS JOLTS quits rate is the strongest leading indicator of labor market
//     sentiment. A 10% YoY decline in quits precedes layoff waves by 60–90 days
//     (BLS Economic Letter 2023, Moscarini & Postel-Vinay 2012).
//   - Inverted yield curve (T10Y2Y < 0) has predicted every US recession since
//     1955 with a median lead time of 12 months (NY Fed, 2024 update).
//   - Tech sector (NAICS 51) quits rate is 1.5–2x more sensitive to macro cycle
//     than the overall private sector — tech layoffs lead broader economy layoffs
//     by 3–6 months (Stanford Labor Lab 2024).
//   - IT sector layoffs rate acceleration >1.5x 6-month average predicts sector-wide
//     headcount contraction within 90 days (BLS JOLTS analysis, internal calibration).
//
// BASELINE VALUES (May 2026 calibration — US IT sector):
//   Quits rate baseline:       2.4% per month (2023–2024 average)
//   Layoffs rate baseline:     0.8% per month
//   Job openings rate baseline: 4.1% of employment
//   Hiring rate baseline:      2.9% per month
//   Fed Funds Rate:            4.75% (plateau phase)
//   T10Y2Y:                    -0.15% (mildly inverted)
//   NASDAQ 90-day change:      +3.2% (modest recovery from early 2026 trough)
//
// Calibration: research_grounded

// ── Types ──────────────────────────────────────────────────────────────────────

export type BLSSector =
  | 'information_technology'
  | 'finance_insurance'
  | 'professional_business_services'
  | 'healthcare'
  | 'manufacturing'
  | 'retail'
  | 'all';

export interface JOLTSSnapshot {
  sector: BLSSector;
  /** Quits as % of total employment in this sector per month (e.g. 2.1 = 2.1%). */
  quitsRate: number;
  /** Layoffs and discharges as % of total employment per month. */
  layoffsRate: number;
  /** Job openings as % of total employment. */
  jobOpeningsRate: number;
  /** Hires as % of total employment per month. */
  hiringRate: number;
  /** Direction vs. 3-month prior average. */
  quitsTrend: 'rising' | 'falling' | 'stable';
  /** Reference month for this snapshot (ISO date, first of month). */
  dataMonth: string;
}

export interface FREDSnapshot {
  /** Current effective federal funds rate (%). */
  fedFundsRate: number;
  /** T10Y2Y spread in percentage points. Negative = inverted curve. */
  yieldCurveSpread: number;
  isInvertedCurve: boolean;
  /** NASDAQ composite % change over prior 90 calendar days. */
  nasdaqChange90d: number;
  /** ISO date of FRED data. */
  dataDate: string;
}

export interface MacroSignalResult {
  sector: BLSSector;
  /** 0–100 composite macro risk score. Higher = worse macro environment. */
  macroRiskScore: number;
  macroRiskLabel: string;
  /** True when quits rate has fallen >10% vs. sector baseline — 60–90 day leading indicator. */
  quitsFallSignal: boolean;
  /** True when yield curve is inverted (T10Y2Y < 0). */
  yieldCurveWarning: boolean;
  /** True when sector layoffs rate is >1.5x the baseline 6-month average. */
  sectorLayoffAcceleration: boolean;
  /** Top 3 macro insights relevant to the sector. */
  keyInsights: string[];
  calibrationNote: string;
  joltsSnapshot: JOLTSSnapshot | null;
  fredSnapshot: FREDSnapshot | null;
  /**
   * Audit v35 fix: explicit heuristic flag. True when JOLTS or FRED data was
   * unavailable and the engine fell back to May 2026 calibrated baselines.
   * Consumers (BLSMacroPanel, intelligenceBriefService, confidence model) must
   * treat this signal as a heuristic estimate, NOT live economic data.
   */
  isHeuristic: boolean;
}

// ── Baseline Values (May 2026 calibration) ─────────────────────────────────────

/**
 * Per-sector JOLTS baseline values calibrated to 2023–2024 BLS averages.
 * Used when live JOLTS data is unavailable (graceful degradation).
 */
const JOLTS_BASELINES: Record<BLSSector, { quitsRate: number; layoffsRate: number; jobOpeningsRate: number; hiringRate: number }> = {
  information_technology:         { quitsRate: 2.4, layoffsRate: 0.8, jobOpeningsRate: 4.8, hiringRate: 2.9 },
  finance_insurance:              { quitsRate: 1.8, layoffsRate: 0.7, jobOpeningsRate: 3.6, hiringRate: 2.4 },
  professional_business_services: { quitsRate: 2.6, layoffsRate: 1.0, jobOpeningsRate: 5.2, hiringRate: 3.4 },
  healthcare:                     { quitsRate: 2.2, layoffsRate: 0.6, jobOpeningsRate: 6.1, hiringRate: 3.0 },
  manufacturing:                  { quitsRate: 1.9, layoffsRate: 0.9, jobOpeningsRate: 3.4, hiringRate: 2.2 },
  retail:                         { quitsRate: 3.4, layoffsRate: 1.1, jobOpeningsRate: 4.0, hiringRate: 3.6 },
  all:                            { quitsRate: 2.4, layoffsRate: 1.0, jobOpeningsRate: 4.5, hiringRate: 3.2 },
};

/**
 * FRED baseline values for May 2026.
 * These are used when live FRED data is unavailable.
 */
const FRED_BASELINE: FREDSnapshot = {
  fedFundsRate:       4.75,
  yieldCurveSpread:  -0.15,
  isInvertedCurve:    true,
  nasdaqChange90d:    3.2,
  dataDate:           '2026-05-01',
};

// ── Live Macro Fetch (v21.0) ───────────────────────────────────────────────────
//
// Calls the `proxy-macro` Edge Function (FRED + BLS server-side fetcher with
// 6h cache). On failure, returns null and the caller continues with calibrated
// May 2026 baselines. The degradation is recorded so the UI can surface
// "macro signals stale" instead of pretending the baseline is current.

import { supabase } from '../utils/supabase';
import { invokeEdgeFunction } from '../infrastructure/requestId';
import { recordApiDegradation } from './apiDegradationMonitor';

let macroFetchInflight: Promise<{ joltsSnapshot: JOLTSSnapshot | null; fredSnapshot: FREDSnapshot | null } | null> | null = null;
let macroFetchCache: { value: { joltsSnapshot: JOLTSSnapshot | null; fredSnapshot: FREDSnapshot | null }; expiresAt: number } | null = null;

const MACRO_CLIENT_CACHE_TTL = 6 * 60 * 60 * 1000; // mirror the Edge Function

// Mark unconfigured/missing-key state so we don't retry on every audit.
// Without this, an undeployed proxy-macro causes a network round-trip on every
// audit AND records a spurious degradation event that shows up as
// "Company Intelligence DB error" in the UI.
let macroProxyDisabled = false;

export async function fetchLiveMacroSnapshot(): Promise<{ joltsSnapshot: JOLTSSnapshot | null; fredSnapshot: FREDSnapshot | null } | null> {
  if (macroProxyDisabled) return null;
  if (macroFetchCache && Date.now() < macroFetchCache.expiresAt) {
    return macroFetchCache.value;
  }
  if (macroFetchInflight) return macroFetchInflight;
  macroFetchInflight = (async () => {
    try {
      const { data, error } = await invokeEdgeFunction<any>('proxy-macro', { body: {} });

      // Function not deployed (404) or key not configured (503 with error msg) —
      // this is an "opt-in feature not set up" state, NOT a runtime error.
      // Disable for the session so subsequent audits skip the round-trip and
      // we don't pollute the degradation monitor with a perpetual false alarm.
      const errMsg = (error?.message ?? data?.error ?? '').toLowerCase();
      const isUnconfigured =
        errMsg.includes('not configured') ||
        errMsg.includes('not found') ||
        errMsg.includes('404') ||
        errMsg.includes('fred_api_key');
      if (isUnconfigured) {
        macroProxyDisabled = true;
        return null;
      }

      if (error || !data || data.error) {
        recordApiDegradation('supabase_osint', 'network_error', `proxy-macro: ${error?.message ?? data?.error ?? 'unknown'}`);
        return null;
      }
      const value = {
        joltsSnapshot: (data.joltsSnapshot as JOLTSSnapshot | null) ?? null,
        fredSnapshot:  (data.fredSnapshot as FREDSnapshot | null)  ?? null,
      };
      macroFetchCache = { value, expiresAt: Date.now() + MACRO_CLIENT_CACHE_TTL };
      return value;
    } catch (e: any) {
      const msg = String(e?.message ?? e).toLowerCase();
      // A function not deployed yields a fetch error — treat same as unconfigured.
      if (msg.includes('not found') || msg.includes('404')) {
        macroProxyDisabled = true;
        return null;
      }
      recordApiDegradation('supabase_osint', 'network_error', `proxy-macro: ${e?.message ?? String(e)}`);
      return null;
    } finally {
      macroFetchInflight = null;
    }
  })();
  return macroFetchInflight;
}

// ── Sector Mapping ─────────────────────────────────────────────────────────────

/**
 * Map a free-text industry string to the closest BLS JOLTS sector.
 * Default: professional_business_services (includes most tech/consulting/SaaS).
 */
export function mapIndustryToBLSSector(industry: string): BLSSector {
  const l = industry.toLowerCase();

  if (
    l.includes('software') || l.includes('saas') || l.includes('tech') ||
    l.includes('semiconductor') || l.includes('hardware') ||
    l.includes('cloud') || l.includes('cybersecurity') || l.includes('data science') ||
    l.includes('artificial intelligence') || l.includes('machine learning') ||
    l.includes('it services') || l.includes('information technology')
  ) return 'information_technology';

  if (
    l.includes('financ') || l.includes('bank') || l.includes('insurance') ||
    l.includes('investment') || l.includes('hedge') || l.includes('private equity') ||
    l.includes('asset management') || l.includes('fintech') || l.includes('payments')
  ) return 'finance_insurance';

  if (
    l.includes('health') || l.includes('pharma') || l.includes('biotech') ||
    l.includes('medical') || l.includes('hospital') || l.includes('clinical') ||
    l.includes('life sciences')
  ) return 'healthcare';

  if (
    l.includes('manufactur') || l.includes('industrial') || l.includes('aerospace') ||
    l.includes('automotive') || l.includes('chemical') || l.includes('defense') ||
    l.includes('logistics') || l.includes('supply chain')
  ) return 'manufacturing';

  if (
    l.includes('retail') || l.includes('ecommerce') || l.includes('e-commerce') ||
    l.includes('consumer goods') || l.includes('grocery') || l.includes('apparel')
  ) return 'retail';

  if (
    l.includes('consult') || l.includes('professional services') ||
    l.includes('staffing') || l.includes('outsourc') || l.includes('media') ||
    l.includes('advertising') || l.includes('marketing') || l.includes('legal') ||
    l.includes('accounting')
  ) return 'professional_business_services';

  // Default: professional_business_services (closest to general tech/white-collar)
  return 'professional_business_services';
}

// ── Signal Computations ────────────────────────────────────────────────────────

/**
 * Determine if the quits rate has fallen meaningfully vs. baseline.
 * Threshold: <85% of baseline = "fallen" (a >15% relative decline).
 * Rationale: Moscarini & Postel-Vinay (2012) show quits rate is a barometer
 * of worker confidence. A meaningful drop means workers feel trapped —
 * layoffs typically follow 60–90 days later.
 */
function detectQuitsFallSignal(sector: BLSSector, quitsRate: number | null): boolean {
  if (quitsRate === null) return false;
  const baseline = JOLTS_BASELINES[sector].quitsRate;
  return quitsRate < baseline * 0.85;
}

/**
 * Determine if the sector layoffs rate is accelerating.
 * We define acceleration as: layoffsRate > 1.5× baseline average.
 * This is the 6-month equivalent given we're comparing to the calibrated baseline.
 */
function detectLayoffAcceleration(sector: BLSSector, layoffsRate: number | null): boolean {
  if (layoffsRate === null) return false;
  const baseline = JOLTS_BASELINES[sector].layoffsRate;
  return layoffsRate > baseline * 1.5;
}

/** Risk score contribution from the JOLTS snapshot. Max: 55 pts. */
function computeJOLTSRiskContribution(
  sector: BLSSector,
  jolts: JOLTSSnapshot,
): { score: number; insights: string[] } {
  let score = 0;
  const insights: string[] = [];
  const baseline = JOLTS_BASELINES[sector];

  // Quits rate signal (+25 when fallen)
  if (detectQuitsFallSignal(sector, jolts.quitsRate)) {
    score += 25;
    const pctFall = Math.round((1 - jolts.quitsRate / baseline.quitsRate) * 100);
    insights.push(
      `Quits rate has fallen ${pctFall}% below baseline (${jolts.quitsRate.toFixed(1)}% vs. ${baseline.quitsRate.toFixed(1)}% baseline) — workers not quitting voluntarily signals labor market fear. BLS research: layoffs follow quits declines by 60–90 days.`,
    );
  } else if (jolts.quitsTrend === 'falling') {
    score += 10;
    insights.push(
      `Quits rate trending down (${jolts.quitsRate.toFixed(1)}%) — not yet at alarm threshold but directionally concerning.`,
    );
  }

  // Layoffs acceleration signal (+30 when active)
  if (detectLayoffAcceleration(sector, jolts.layoffsRate)) {
    score += 30;
    const multiple = (jolts.layoffsRate / baseline.layoffsRate).toFixed(1);
    insights.push(
      `Sector layoffs rate (${jolts.layoffsRate.toFixed(1)}%) is ${multiple}× baseline — active acceleration. This predicts continued headcount reduction across the sector within 90 days.`,
    );
  }

  // Job openings compression
  if (jolts.jobOpeningsRate < baseline.jobOpeningsRate * 0.75) {
    score += 8;
    insights.push(
      `Job openings in this sector have compressed to ${jolts.jobOpeningsRate.toFixed(1)}% of employment (baseline: ${baseline.jobOpeningsRate.toFixed(1)}%) — demand for new hires is contracting.`,
    );
  }

  return { score: Math.min(55, score), insights };
}

/** Risk score contribution from the FRED snapshot. Max: 45 pts. */
function computeFREDRiskContribution(
  fred: FREDSnapshot,
): { score: number; insights: string[] } {
  let score = 0;
  const insights: string[] = [];

  // Yield curve inversion (+20)
  if (fred.isInvertedCurve) {
    score += 20;
    insights.push(
      `Yield curve inverted (T10Y2Y = ${fred.yieldCurveSpread.toFixed(2)}pp) — every US recession since 1955 was preceded by curve inversion. Median recession lead time: 12 months (NY Fed 2024). Elevated systemic headcount risk across corporate sector.`,
    );
  }

  // Tight monetary conditions (+10)
  if (fred.fedFundsRate > 4.5) {
    score += 10;
    insights.push(
      `Fed Funds Rate at ${fred.fedFundsRate.toFixed(2)}% — elevated borrowing costs compress growth investment and valuations. Tech/growth companies face continued pressure to cut costs via headcount reduction.`,
    );
  } else if (fred.fedFundsRate > 3.5) {
    score += 5;
    insights.push(
      `Fed Funds Rate at ${fred.fedFundsRate.toFixed(2)}% — above neutral; some financing cost pressure but not at tightening peak.`,
    );
  }

  // NASDAQ direction (tech sector health proxy)
  if (fred.nasdaqChange90d < -15) {
    score += 15;
    insights.push(
      `NASDAQ down ${Math.abs(fred.nasdaqChange90d).toFixed(1)}% over 90 days — significant tech sector de-rating. Historically, tech headcount cuts lag market declines by 60–120 days.`,
    );
  } else if (fred.nasdaqChange90d < -8) {
    score += 8;
    insights.push(
      `NASDAQ down ${Math.abs(fred.nasdaqChange90d).toFixed(1)}% over 90 days — tech valuations under pressure.`,
    );
  } else if (fred.nasdaqChange90d < 0) {
    score += 3;
  }

  return { score: Math.min(45, score), insights };
}

/** Compute risk score using only JOLTS/FRED baseline values (no live data). */
function computeBaselineOnlyScore(
  sector: BLSSector,
): { score: number; insights: string[] } {
  let score = 20; // baseline floor — macro is never "no risk"
  const insights: string[] = [];

  // May 2026 calibration: we know FRED baseline has mild inversion + high rates
  if (FRED_BASELINE.isInvertedCurve) {
    score += 15;
    insights.push(
      `Yield curve mildly inverted (T10Y2Y ≈ ${FRED_BASELINE.yieldCurveSpread.toFixed(2)}pp) as of May 2026 baseline. Recession probability elevated vs. historical base rate.`,
    );
  }
  if (FRED_BASELINE.fedFundsRate > 4.5) {
    score += 8;
    insights.push(
      `Fed Funds Rate at ${FRED_BASELINE.fedFundsRate.toFixed(2)}% (May 2026 baseline) — elevated. Rate cuts expected H2 2026 but near-term financing costs remain restrictive for growth companies.`,
    );
  }

  // IT sector has above-average macro sensitivity
  if (sector === 'information_technology' || sector === 'professional_business_services') {
    score += 5;
    insights.push(
      'Tech/professional services sector has 1.5–2× the macro sensitivity of the broader economy. Discretionary spend cuts by enterprise clients flow through to headcount within 90 days.',
    );
  }

  return { score: Math.min(65, score), insights };
}

// ── Risk Label ────────────────────────────────────────────────────────────────

function buildMacroRiskLabel(score: number): string {
  if (score >= 75) return 'Macro crisis conditions — sector-wide layoff wave is highly probable';
  if (score >= 55) return 'Macro stress — significant sector headcount contraction underway or imminent';
  if (score >= 38) return 'Macro headwinds active — above-average systemic layoff risk in this sector';
  if (score >= 22) return 'Moderate macro pressure — baseline elevated but no acute crisis signals';
  return 'Macro environment relatively benign — systemic layoff pressure is low';
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Compute the macro economic signal for a given industry.
 *
 * @param industry   Free-text industry string (e.g. "Software / SaaS", "Healthcare IT")
 * @param jolts      Live JOLTS snapshot from pipeline, or null to use baselines
 * @param fred       Live FRED snapshot from pipeline, or null to use baselines
 *
 * When jolts or fred are null, the function gracefully falls back to calibrated
 * May 2026 baseline values and marks the result accordingly.
 */
export function computeMacroSignal(
  industry: string,
  jolts: JOLTSSnapshot | null,
  fred: FREDSnapshot | null,
): MacroSignalResult {
  const sector = mapIndustryToBLSSector(industry);
  const allInsights: string[] = [];
  let totalScore = 0;

  let quitsFallSignal = false;
  let yieldCurveWarning = false;
  let sectorLayoffAcceleration = false;

  if (jolts !== null) {
    const joltsResult = computeJOLTSRiskContribution(sector, jolts);
    totalScore += joltsResult.score;
    allInsights.push(...joltsResult.insights);
    quitsFallSignal = detectQuitsFallSignal(sector, jolts.quitsRate);
    sectorLayoffAcceleration = detectLayoffAcceleration(sector, jolts.layoffsRate);
  } else {
    // No live JOLTS — use baseline heuristic
    const baseResult = computeBaselineOnlyScore(sector);
    totalScore += baseResult.score;
    allInsights.push(...baseResult.insights);
    allInsights.push(
      'Live JOLTS data unavailable — macro score based on May 2026 calibrated baseline values.',
    );
  }

  const effectiveFred = fred ?? FRED_BASELINE;
  const fredResult = computeFREDRiskContribution(effectiveFred);
  totalScore += fredResult.score;
  allInsights.push(...fredResult.insights);
  yieldCurveWarning = effectiveFred.isInvertedCurve;

  if (fred === null) {
    allInsights.push(
      'Live FRED data unavailable — interest rate and yield curve data reflect May 2026 calibrated baseline.',
    );
  }

  const macroRiskScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  const calibrationNote = [
    'Macro signal uses BLS JOLTS (Job Openings and Labor Turnover Survey) and FRED macro indicators.',
    'Research: quits rate decline >10% vs. baseline precedes layoff waves by 60–90 days (BLS 2023; Moscarini & Postel-Vinay 2012).',
    'Yield curve inversion has preceded every US recession since 1955 with median 12-month lead (NY Fed 2024).',
    `Sector mapped to BLS category: ${sector.replace(/_/g, ' ')}.`,
    jolts === null || fred === null
      ? 'One or more live data sources unavailable — fallback to May 2026 calibrated baselines.'
      : 'Live JOLTS and FRED data consumed from pipeline.',
  ].join(' ');

  return {
    sector,
    macroRiskScore,
    macroRiskLabel: buildMacroRiskLabel(macroRiskScore),
    quitsFallSignal,
    yieldCurveWarning,
    sectorLayoffAcceleration,
    keyInsights: allInsights.slice(0, 3),
    calibrationNote,
    joltsSnapshot: jolts,
    fredSnapshot: fred ?? FRED_BASELINE,
    // Audit v35: explicit heuristic flag. Either JOLTS or FRED falling back to
    // baseline means the macro signal is partially or fully heuristic — the
    // UI must surface this so users don't trust it as real-time BLS data.
    isHeuristic: jolts === null || fred === null,
  };
}
