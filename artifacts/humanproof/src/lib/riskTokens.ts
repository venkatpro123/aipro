// riskTokens.ts — v40.0
// Centralized risk color and label tokens. Replaces scattered
// `score >= 75 ? '#dc2626'` duplicates across 6+ component files.

export const RISK_COLORS = {
  critical: '#dc2626',  // score ≥ 75
  high:     '#f97316',  // score 55–74
  moderate: '#f59e0b',  // score 35–54
  low:      '#10b981',  // score < 35
  cyan:     '#00d4e0',  // active/accent
} as const;

export function riskColor(score: number): string {
  if (score >= 75) return RISK_COLORS.critical;
  if (score >= 55) return RISK_COLORS.high;
  if (score >= 35) return RISK_COLORS.moderate;
  return RISK_COLORS.low;
}

export function riskLabel(score: number): string {
  if (score >= 75) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 35) return 'MODERATE';
  return 'LOW';
}

export function riskGradient(score: number): string {
  const c = riskColor(score);
  // Stay within the color family: bold tint at top-left fading to a very light
  // tint at bottom-right. Avoids the near-black rgba(9,12,20,0.95) end stop that
  // produced a dark overlay masking the score hero card background.
  return `linear-gradient(135deg, ${c}30 0%, ${c}08 100%)`;
}
