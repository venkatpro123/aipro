// masterIntelligenceEngine.ts — Single source of truth for all displayed intelligence
// CORE RULE: Every score, range, forecast, and narrative derives from this engine.
// No component may independently re-derive D-scores or compute risk percentages.

import type { ScoreResult } from './riskFormula';
import { riskToSurvival } from './riskFormula';

export interface MasterIntelligence {
  // ── 5 sub-scores (0–100) ────────────────────────────────────────────────
  exposureScore:     number;  // D1×0.55 + D2×0.45  (higher = more exposed)
  protectionScore:   number;  // 100 − weighted shield  (higher = better protected)
  adaptabilityScore: number;  // experience-driven flexibility  (higher = more adaptable)
  marketStrength:    number;  // 100 − D5  (higher = stronger local market)
  confidenceScore:   number;  // data quality + seeded signal  (0–100)

  // ── Composite ────────────────────────────────────────────────────────────
  totalRisk:    number;  // mirrors ScoreResult.total
  survivalPct:  number;  // riskToSurvival(totalRisk)

  // ── Uncertainty ranges ───────────────────────────────────────────────────
  survivalRange:    [number, number];   // [lo, hi] survival %
  riskRange:        [number, number];   // [lo, hi] risk score
  exposureRange:    [number, number];
  protectionRange:  [number, number];
  confidenceMargin: number;            // ±N pts, derived from dataQuality

  // ── Forecast realism ─────────────────────────────────────────────────────
  forecastWindow:       string;
  forecastConfidence:   'High' | 'Moderate' | 'Low' | 'Speculative';
  forecastAssumptions:  string[];
  alternativeScenario:  string;
}

// ─── Range helper ────────────────────────────────────────────────────────────
export function formatRange(lo: number, hi: number, suffix = '%'): string {
  return `${Math.round(lo)}–${Math.round(hi)}${suffix}`;
}

export function formatYearRange(y1: number, y2: number): string {
  return `${y1}–${y2}`;
}

function clampRange(value: number, margin: number): [number, number] {
  return [
    Math.max(1,  Math.round(value - margin)),
    Math.min(99, Math.round(value + margin)),
  ];
}

// ─── Confidence margin from data quality ─────────────────────────────────────
function deriveMargin(result: ScoreResult): number {
  if (result.dataQuality === 'DQ_FULL'    && result.isSeeded) return 4;
  if (result.dataQuality === 'DQ_PARTIAL' || result.confidence === 'MODERATE') return 7;
  return 12;
}

// ─── Sub-score derivation ────────────────────────────────────────────────────
function dim(result: ScoreResult, key: string): number {
  return result.dimensions.find(d => d.key === key)?.score ?? 50;
}

function computeExposure(result: ScoreResult): number {
  const d1 = dim(result, 'D1');
  const d2 = dim(result, 'D2');
  return Math.round(d1 * 0.55 + d2 * 0.45);
}

function computeProtection(result: ScoreResult): number {
  const d3 = dim(result, 'D3');
  const d4 = dim(result, 'D4');
  const d6 = dim(result, 'D6');
  // Lower D3/D4/D6 risk score = stronger shield → higher protectionScore
  const shieldRisk = d3 * 0.50 + d4 * 0.35 + d6 * 0.15;
  return Math.round(Math.max(0, Math.min(100, 100 - shieldRisk)));
}

function computeAdaptability(result: ScoreResult, experience: string): number {
  const d4 = dim(result, 'D4');
  // D4 measures experience shield risk (high D4 = experience doesn't help much)
  // Adaptability = inverse of D4 risk, with experience bonus
  const expBonus = experience === '15+' || experience === '20+' ? 12
    : experience === '10-15' || experience === '10-20' ? 8
    : experience === '5-10' ? 4
    : 0;
  return Math.round(Math.max(0, Math.min(100, (100 - d4) + expBonus)));
}

function computeMarketStrength(result: ScoreResult): number {
  const d5 = dim(result, 'D5');
  return Math.round(Math.max(0, Math.min(100, 100 - d5)));
}

function computeConfidenceScore(result: ScoreResult): number {
  const base = result.isSeeded ? 75 : 45;
  const dqBonus = result.dataQuality === 'DQ_FULL' ? 15 : result.dataQuality === 'DQ_PARTIAL' ? 5 : 0;
  const contentBonus = result.content_confidence ? Math.round((result.content_confidence - 50) * 0.2) : 0;
  return Math.min(95, Math.max(20, base + dqBonus + contentBonus));
}

// ─── Forecast metadata ────────────────────────────────────────────────────────
function deriveForecastMetadata(score: number, experience: string): {
  forecastWindow: string;
  forecastConfidence: 'High' | 'Moderate' | 'Low' | 'Speculative';
  forecastAssumptions: string[];
  alternativeScenario: string;
} {
  const currentYear = 2026;
  const isSenior = experience === '10-20' || experience === '20+' || experience === '10-15' || experience === '15+';

  if (score >= 70) {
    return {
      forecastWindow: `${currentYear}–${currentYear + 3}`,
      forecastConfidence: 'Low',
      forecastAssumptions: [
        'AI adoption in your sector continues at its current trajectory',
        'No major regulatory intervention slows enterprise AI deployment',
        'Your role\'s task structure remains similar to today',
        'Hiring market follows current AI investment trends',
      ],
      alternativeScenario: 'If regulatory AI pauses emerge or your company freezes automation investment, your runway extends by 18–24 months beyond these estimates.',
    };
  }

  if (score >= 45) {
    return {
      forecastWindow: `${currentYear}–${currentYear + 5}`,
      forecastConfidence: 'Moderate',
      forecastAssumptions: [
        'Role remains primarily human-executed for the next 2–4 years',
        'AI augments rather than replaces your highest-value work',
        'Skill augmentation remains your primary protection lever',
        isSenior ? 'Your experience provides a meaningful buffer against displacement' : 'Upskilling pace matches AI capability growth',
      ],
      alternativeScenario: 'If AI capabilities plateau at current levels for 2+ years (possible given energy constraints), your risk growth slows significantly and the 5-year window extends to 7–8 years.',
    };
  }

  return {
    forecastWindow: `${currentYear}–${currentYear + 8}`,
    forecastConfidence: 'High',
    forecastAssumptions: [
      'Specialized human judgment remains economically valued in your field',
      'Your network and relationship capital continues to compound',
      'Physical, creative, or contextual complexity maintains demand',
      'AI tools amplify your output rather than replacing your role',
    ],
    alternativeScenario: 'If agentic AI systems reach human-level reasoning by 2028–2030 (AGI scenario), even currently protected roles face structural review — but your adaptability score suggests you would transition successfully.',
  };
}

// ─── Main builder ────────────────────────────────────────────────────────────
export function buildMasterIntelligence(
  result: ScoreResult,
  _country: string,
  experience: string,
): MasterIntelligence {
  const totalRisk   = result.total;
  const survivalPct = riskToSurvival(totalRisk);
  const margin      = deriveMargin(result);

  const exposureScore     = computeExposure(result);
  const protectionScore   = computeProtection(result);
  const adaptabilityScore = computeAdaptability(result, experience);
  const marketStrength    = computeMarketStrength(result);
  const confidenceScore   = computeConfidenceScore(result);

  const forecast = deriveForecastMetadata(totalRisk, experience);

  return {
    exposureScore,
    protectionScore,
    adaptabilityScore,
    marketStrength,
    confidenceScore,

    totalRisk,
    survivalPct,

    survivalRange:   clampRange(survivalPct,  margin),
    riskRange:       clampRange(totalRisk,    margin),
    exposureRange:   clampRange(exposureScore, margin + 2),
    protectionRange: clampRange(protectionScore, margin + 2),
    confidenceMargin: margin,

    ...forecast,
  };
}
