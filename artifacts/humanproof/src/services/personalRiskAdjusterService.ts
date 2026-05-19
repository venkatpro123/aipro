// personalRiskAdjusterService.ts — Layer 55 (v35.0)
//
// Applies a signed personal-circumstance adjustment to the composite score after
// all 54 pipeline steps and kill-switches have already run.
//
// The core formula (D1–D8, L1–L2) only sees company + role data.  Five layers
// (15 Manager, 17 Visa, 25 Network, 30 Skill Portfolio, 38 Career Velocity) are
// computed post-hoc but NEVER previously fed back into the score.  This creates
// a structural accuracy gap: two employees at the same company and role receive
// identical scores even when one is H1B with a skill gap and the other is a
// citizen with a strong network and accelerating career.
//
// Modifier range: −10 to +10 pts (positive = more risk, negative = protection).
// Only applied when |rawModifier| ≥ 1 to avoid noise-level adjustments.
//
// CALIBRATION STATUS: developer_estimate — awaiting regression on
// user_prediction_outcomes once ≥500 career-twin submissions are collected.

import type { VisaRiskResult } from './visaRiskEngine';
import type { ManagerRiskResult } from './managerRiskEngine';
import type { NetworkLeverageResult } from './networkLeverageEngine';
import type { SkillPortfolioFitResult } from './skillPortfolioFitEngine';
import type { CareerVelocityResult } from './careerVelocityEngine';

// ── Public types ──────────────────────────────────────────────────────────────

export interface PersonalRiskModifierInput {
  baseScore: number;
  visaRisk?: VisaRiskResult | null;
  managerRisk?: ManagerRiskResult | null;
  networkLeverage?: NetworkLeverageResult | null;
  skillPortfolioFit?: SkillPortfolioFitResult | null;
  careerVelocity?: CareerVelocityResult | null;
}

export interface PersonalRiskModifierComponents {
  /** 0 to +4: OPT_STEM=+4, H1B/L1=+3, TN=+1, citizen=0 */
  visaComponent: number;
  /** 0 to +3: recent_layoff=+3, forced=+2, voluntary=+1, none=0 */
  managerComponent: number;
  /** −2 to +2: high skill fit protects (negative), low skill fit adds risk */
  skillComponent: number;
  /** −2 to +2: strong network protects (negative), weak network adds risk */
  networkComponent: number;
  /** −2 to +2: accelerating career protects (negative), declining adds risk */
  velocityComponent: number;
}

export interface PersonalRiskModifier {
  /** Post-adjustment score, clamped [1, 99] */
  adjustedScore: number;
  /** Signed delta applied, clamped [−10, +10] */
  rawModifier: number;
  components: PersonalRiskModifierComponents;
  /** One sentence per component that fired, suitable for UI rendering */
  transparencyLines: string[];
  calibrationStatus: 'developer_estimate';
  /**
   * Visa-specific urgency amplifier — separate from rawModifier because it
   * does not change the risk score; it compresses all action deadlines.
   *
   * Values match visaRiskEngine scoreAmplifier:
   *   gcLockIn:       1.40  (+40% urgency)
   *   h1bL1HighRisk:  1.35  (+35% urgency)
   *   tn:             1.25  (+25% urgency)
   *   moderateVisa:   1.20  (+20% urgency)
   *   baseline:       1.10  (+10% urgency)
   *   citizen/PR:     1.00  (no amplification)
   *
   * Undefined when visa status is citizen, PR, or not applicable.
   * Used by PersonalRiskModifierPanel to render the explicit urgency chip
   * and by deriveFinancialProfile to multiply into urgencyMultiplier.
   */
  visaUrgencyAmplifier?: number;
  /** Human-readable visa status label for the urgency chip, e.g. "H1B/L1", "TN", "GC Lock-in". */
  visaStatusLabel?: string;
  /** Grace period in days for the active visa — surfaced in the urgency chip. */
  visaGracePeriodDays?: number;
}

// ── Component computations ────────────────────────────────────────────────────

function computeVisaComponent(visa: VisaRiskResult | null | undefined): number {
  if (!visa) return 0;
  const dep = visa.dependencyScore ?? 0;
  if (dep < 0.4) return 0;
  const risk = visa.overallVisaRisk;
  if (risk === 'CRITICAL') return 4;  // OPT-STEM level
  if (risk === 'HIGH') return 3;      // H1B / L1 level
  if (risk === 'MODERATE') return 1;  // TN / J1 level
  return dep >= 0.7 ? 2 : 0;
}

function visaTransparencyLine(
  component: number,
  visa: VisaRiskResult | null | undefined,
  visaStatusLabel: string,
): string | null {
  if (component === 0) return null;
  const graceDays = visa?.gracePeriodDays ?? 60;
  const amp = visa?.scoreAmplifier ?? 1.0;
  const pct = Math.round((amp - 1.0) * 100);

  if (component >= 4) {
    // GC lock-in: the immigration constraint is the primary risk, not just urgency
    return `${visaStatusLabel} status: ${graceDays > 0 ? `${graceDays}-day` : 'no'} grace period — immigration timeline is the critical constraint. Urgency +${pct}%.`;
  }
  if (component >= 3) {
    // H1B/L1 at elevated score — spec-exact message
    return `Your ${visaStatusLabel} status increases effective urgency by ${pct}%. Timeline reflects your ${graceDays}-day grace period constraint.`;
  }
  if (component >= 1) {
    return `Your ${visaStatusLabel} status increases effective urgency by ${pct}%. ${graceDays > 0 ? `${graceDays}-day grace period applies after layoff.` : 'Status ends immediately on termination.'}`;
  }
  return `Work-authorization dependency (${visaStatusLabel}) adds urgency to defensive planning.`;
}

function computeManagerComponent(manager: ManagerRiskResult | null | undefined): number {
  if (!manager) return 0;
  const pattern = (manager.patternType ?? '').toLowerCase();
  if (pattern === 'exodus_signal' || pattern === 'recent_layoff' || pattern === 'forced_out') return 3;
  if (pattern === 'forced' || pattern === 'performance_managed') return 2;
  if (pattern === 'recent_voluntary' || pattern === 'voluntary') return 1;
  return 0;
}

function managerTransparencyLine(component: number, manager: ManagerRiskResult | null | undefined): string | null {
  if (component === 0) return null;
  if (component >= 3) return `Manager departure pattern (${manager?.patternType ?? 'exodus signal'}) is a leading indicator — typically precedes team restructuring by 4–8 weeks.`;
  if (component >= 2) return `Recent manager departure adds near-term instability — new leadership often reshapes team composition.`;
  return `Manager change detected — monitor closely for role re-scoping signals.`;
}

function computeSkillComponent(skill: SkillPortfolioFitResult | null | undefined): number {
  const fit = skill?.fitScore ?? null;
  if (fit === null) return 0;
  if (fit >= 75) return -2;
  if (fit >= 50) return 0;
  if (fit >= 30) return 1;
  return 2;
}

function skillTransparencyLine(component: number, skill: SkillPortfolioFitResult | null | undefined): string | null {
  if (component === 0) return null;
  const fit = skill?.fitScore ?? 0;
  if (component < 0) return `Skill portfolio fit ${fit}/100 — strong market alignment reduces replacement risk.`;
  if (component >= 2) return `Skill portfolio fit ${fit}/100 — low alignment with current market demand increases displacement exposure.`;
  return `Skill portfolio fit ${fit}/100 — moderate gaps; close 1–2 high-demand skills to improve protection.`;
}

function computeNetworkComponent(network: NetworkLeverageResult | null | undefined): number {
  const score = network?.networkScore ?? null;
  const tier = (network?.networkTier ?? '').toUpperCase();
  if (tier === 'POWERFUL' || tier === 'SOLID') return -2;
  if (tier === 'MINIMAL' || tier === 'SPARSE') return 2;
  if (score === null) return 0;
  if (score >= 70) return -2;
  if (score >= 50) return 0;
  if (score < 30) return 2;
  return 1;
}

function networkTransparencyLine(component: number, network: NetworkLeverageResult | null | undefined): string | null {
  if (component === 0) return null;
  const tier = network?.networkTier ?? null;
  if (component < 0) return `Network tier ${tier ?? 'strong'}: warm referral channels significantly shorten job search if needed.`;
  if (component >= 2) return `Limited professional network (tier: ${tier ?? 'minimal'}) — 80% of roles are filled before posting; activate connections now.`;
  return `Moderate network coverage — prioritize building 3–5 warm relationships in target companies.`;
}

function computeVelocityComponent(velocity: CareerVelocityResult | null | undefined): number {
  const traj = (velocity?.trajectory ?? '').toUpperCase();
  if (traj === 'ACCELERATING') return -2;
  if (traj === 'PLATEAUED') return 1;
  if (traj === 'DECLINING') return 2;
  return 0;
}

function velocityTransparencyLine(component: number, velocity: CareerVelocityResult | null | undefined): string | null {
  if (component === 0) return null;
  const traj = velocity?.trajectory ?? 'unknown';
  if (component < 0) return `Career trajectory: ${traj} — accelerating careers are significantly harder to displace.`;
  if (component >= 2) return `Career trajectory: ${traj} — declining velocity increases vulnerability; a visible win in the next 30 days is high-priority.`;
  return `Career trajectory: ${traj} — plateau risk detected; take on a high-visibility project to reset momentum.`;
}

// ── Visa urgency label derivation ────────────────────────────────────────────
// Maps the scoreAmplifier value back to a human-readable status label.
// This avoids storing the raw visaStatus string in the output and keeps the
// label consistent with how the amplifier was assigned.
function deriveVisaStatusLabel(visa: VisaRiskResult | null | undefined): string {
  if (!visa || visa.scoreAmplifier <= 1.0) return '';
  const amp = visa.scoreAmplifier;
  if (amp >= 1.38) return 'GC Lock-in (no AC21)';  // gcLockIn: 1.40
  if (amp >= 1.30) return 'H1B/L1';                 // h1bL1HighRisk: 1.35
  if (amp >= 1.22) return 'TN';                     // tn: 1.25
  if (amp >= 1.15) return 'work visa';               // moderateVisa: 1.20
  return 'work authorization';                       // baseline: 1.10
}

// ── Main export ───────────────────────────────────────────────────────────────

export function computePersonalRiskModifier(
  input: PersonalRiskModifierInput,
): PersonalRiskModifier {
  const { baseScore, visaRisk, managerRisk, networkLeverage, skillPortfolioFit, careerVelocity } = input;

  const visaComponent     = computeVisaComponent(visaRisk);
  const managerComponent  = computeManagerComponent(managerRisk);
  const skillComponent    = computeSkillComponent(skillPortfolioFit);
  const networkComponent  = computeNetworkComponent(networkLeverage);
  const velocityComponent = computeVelocityComponent(careerVelocity);

  const rawSum = visaComponent + managerComponent + skillComponent + networkComponent + velocityComponent;
  const rawModifier = Math.max(-10, Math.min(10, rawSum));

  const adjustedScore = Math.max(1, Math.min(99, Math.round(baseScore + rawModifier)));

  // Visa urgency amplifier — separate from rawModifier (affects deadlines, not score)
  const visaStatusLabel = deriveVisaStatusLabel(visaRisk);
  const visaUrgencyAmplifier = (visaRisk && visaRisk.scoreAmplifier > 1.0)
    ? visaRisk.scoreAmplifier
    : undefined;
  const visaGracePeriodDays = (visaRisk && visaRisk.gracePeriodDays > 0)
    ? visaRisk.gracePeriodDays
    : undefined;

  const transparencyLines: string[] = [
    visaTransparencyLine(visaComponent, visaRisk, visaStatusLabel || 'work authorization'),
    managerTransparencyLine(managerComponent, managerRisk),
    skillTransparencyLine(skillComponent, skillPortfolioFit),
    networkTransparencyLine(networkComponent, networkLeverage),
    velocityTransparencyLine(velocityComponent, careerVelocity),
  ].filter((l): l is string => l !== null);

  return {
    adjustedScore,
    rawModifier,
    components: { visaComponent, managerComponent, skillComponent, networkComponent, velocityComponent },
    transparencyLines,
    calibrationStatus: 'developer_estimate',
    visaUrgencyAmplifier,
    visaStatusLabel: visaStatusLabel || undefined,
    visaGracePeriodDays,
  };
}
