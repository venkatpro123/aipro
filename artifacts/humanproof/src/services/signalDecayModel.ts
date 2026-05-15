/**
 * signalDecayModel.ts — v12.0
 *
 * Per-signal freshness weight decay curves.
 *
 * Different signal types have different time-sensitivity characteristics.
 * A 3-day-old breaking news event is nearly as actionable as a 0-day event.
 * A 45-day-old stock signal has largely been repriced by the market.
 * A 90-day-old revenue figure is still valid (reports quarterly).
 *
 * Formula: weight = max(minWeight, exp(-ln(2) / halfLife × ageInDays))
 * This is the standard exponential decay with half-life parameterisation.
 *
 * Half-lives + minimum weights are developer estimates. WS9 routes them
 * through engine_calibration_constants:
 *   signalDecayModel.halfLives.<signalType>   — exponential decay constant
 *   signalDecayModel.minWeights.<signalType>  — floor below which decay stops
 * Bootstrap fallbacks preserve legacy behaviour when DB rows are absent.
 */

// WS9 — half-lives + min weights routed through DB.
import { getConstant } from './calibration/calibrationConstants';

export type SignalDecayType =
  | 'breaking_news_layoff'   // actual layoff announcements — time-critical
  | 'stock_90d_change'       // market reprices fast; 90d return is rolling anyway
  | 'executive_departure'    // structural signal; impact persists but urgency fades
  | 'hiring_posting_trend'   // job postings change within weeks
  | 'revenue_growth_yoy'     // reported quarterly, changes slowly
  | 'layoff_history_event'   // past event still matters, but historical weight decays
  | 'sector_contagion';      // index-level signals move faster than company-level

// Half-lives in days for each signal type. Bootstrap fallbacks preserve
// legacy behaviour; DB override key: signalDecayModel.halfLives.<type>.
const BOOTSTRAP_HALF_LIVES: Record<SignalDecayType, number> = {
  breaking_news_layoff:  3,
  stock_90d_change:      7,
  executive_departure:   14,
  hiring_posting_trend:  10,
  revenue_growth_yoy:    90,
  layoff_history_event:  30,
  sector_contagion:      21,
};

// Minimum weight floors — even very stale signals retain some information.
const BOOTSTRAP_MIN_WEIGHTS: Record<SignalDecayType, number> = {
  breaking_news_layoff:  0.10,
  stock_90d_change:      0.15,
  executive_departure:   0.20,
  hiring_posting_trend:  0.15,
  revenue_growth_yoy:    0.30,
  layoff_history_event:  0.25,
  sector_contagion:      0.20,
};

// WS9 — record-shaped DB overrides. Single getConstant lookup returns
// the whole map; shallow-merge with bootstrap so partial DB overrides
// (e.g. ops adjusts only breaking_news_layoff) still work.
function resolveDecayMap(
  key: string,
  bootstrap: Record<SignalDecayType, number>,
): Record<SignalDecayType, number> {
  const r = getConstant<Record<SignalDecayType, number>>(key, bootstrap);
  return (r.value && typeof r.value === 'object')
    ? { ...bootstrap, ...r.value }
    : bootstrap;
}

const HALF_LIVES_IN_DAYS: Record<SignalDecayType, number> =
  resolveDecayMap('signalDecayModel.halfLives', BOOTSTRAP_HALF_LIVES);

const MIN_WEIGHTS: Record<SignalDecayType, number> =
  resolveDecayMap('signalDecayModel.minWeights', BOOTSTRAP_MIN_WEIGHTS);

/**
 * Returns a freshness weight in [minWeight, 1.0] for a signal that is
 * `ageInDays` old. Weight = 1.0 for a brand-new signal (age = 0).
 * Weight = 0.5 at the half-life. Weight floors at minWeight.
 *
 * @param ageInDays - How many days since the signal was observed/published
 * @param signalType - Which decay curve to apply
 * @returns Freshness weight (0–1)
 */
export function computeSignalFreshnessWeight(
  ageInDays: number,
  signalType: SignalDecayType,
): number {
  if (ageInDays <= 0) return 1.0;

  const halfLife = HALF_LIVES_IN_DAYS[signalType];
  const minWeight = MIN_WEIGHTS[signalType];

  // Exponential decay: weight = exp(-ln(2) / halfLife × ageInDays)
  const decayRate = Math.LN2 / halfLife;
  const weight = Math.exp(-decayRate * ageInDays);

  return Math.max(minWeight, Math.min(1.0, weight));
}

/**
 * Convenience: compute freshness weight from an ISO date string and a reference date.
 * Handles invalid dates gracefully (returns 0.5 neutral weight).
 */
export function computeSignalFreshnessWeightFromDate(
  dateStr: string,
  signalType: SignalDecayType,
  referenceDate: Date = new Date(),
): number {
  const signalDate = new Date(dateStr);
  if (isNaN(signalDate.getTime())) return 0.5;
  const ageInDays = Math.max(0, (referenceDate.getTime() - signalDate.getTime()) / 86_400_000);
  return computeSignalFreshnessWeight(ageInDays, signalType);
}
