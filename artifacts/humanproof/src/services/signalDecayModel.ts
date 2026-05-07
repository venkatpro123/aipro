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
 * All half-lives are developer estimates (UNCALIBRATED) chosen to match
 * the typical information shelf-life for each signal type based on financial
 * data reporting cycles and market repricing behaviour.
 */

export type SignalDecayType =
  | 'breaking_news_layoff'   // actual layoff announcements — time-critical
  | 'stock_90d_change'       // market reprices fast; 90d return is rolling anyway
  | 'executive_departure'    // structural signal; impact persists but urgency fades
  | 'hiring_posting_trend'   // job postings change within weeks
  | 'revenue_growth_yoy'     // reported quarterly, changes slowly
  | 'layoff_history_event'   // past event still matters, but historical weight decays
  | 'sector_contagion';      // index-level signals move faster than company-level

// Half-lives in days for each signal type (UNCALIBRATED — developer estimates).
// Rationale:
//   breaking_news_layoff: 3d — market reacts within 24-72 hours; news cycle fades fast
//   stock_90d_change: 7d — rolling window reprices; week-old stock data still relevant
//   executive_departure: 14d — structural but announcement impact fades over 2 weeks
//   hiring_posting_trend: 10d — job boards update weekly; trends shift within 2 weeks
//   revenue_growth_yoy: 90d — quarterly report; a 90-day-old figure is at its stale edge
//   layoff_history_event: 30d — the event itself is permanent; recency weight decays over a month
//   sector_contagion: 21d — index-level signals reprice in ~3 weeks
const HALF_LIVES_IN_DAYS: Record<SignalDecayType, number> = {
  breaking_news_layoff:  3,
  stock_90d_change:      7,
  executive_departure:   14,
  hiring_posting_trend:  10,
  revenue_growth_yoy:    90,
  layoff_history_event:  30,
  sector_contagion:      21,
};

// Minimum weight floors — even very stale signals retain some information
const MIN_WEIGHTS: Record<SignalDecayType, number> = {
  breaking_news_layoff:  0.10,  // very old news still indicates something happened
  stock_90d_change:      0.15,
  executive_departure:   0.20,
  hiring_posting_trend:  0.15,
  revenue_growth_yoy:    0.30,  // annual revenue is still meaningful even if 6mo old
  layoff_history_event:  0.25,  // permanent record — never fully discounted
  sector_contagion:      0.20,
};

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
