/**
 * visaRiskEngine.ts — v12.0
 *
 * Work authorization dependency risk analysis.
 *
 * For H1B, L1, OPT, and similar visa holders, a layoff is not just income
 * loss — it triggers a legal grace period clock before the worker must either
 * find a new sponsor, change status, or depart. This is a binary catastrophic
 * risk that the company-level score cannot model.
 *
 * Key legal grounding (US-focused):
 *   - H1B: 60-day grace period (codified by USCIS in 2017, 8 CFR 214.1(l)(2))
 *   - L1: 60-day grace period (same rule)
 *   - OPT STEM: 60-day grace period; cap-gap extension possible
 *   - AC21 portability: I-485 pending >180 days allows employer change
 *
 * India-to-US segment is a large portion of this platform's user base
 * (confirmed by presence of Naukri connector and India-specific intelligence).
 * This layer is high-value for that segment and zero-cost for citizens.
 *
 * UNCALIBRATED — score amplifiers are developer estimates.
 * Calibration method: collect outcomes from H1B holders who were laid off
 * and track actual time-to-new-sponsorship vs. grace period utilisation.
 */

export type VisaStatus =
  | 'citizen'
  | 'permanent_resident'
  | 'h1b'
  | 'l1'
  | 'opt_stem'
  | 'tn'
  | 'other_work_auth'
  | 'not_applicable';

// WS9 — score-amplifier values sourced from engine_calibration_constants
// so the recalibrate cron can replace these developer estimates with
// regression-derived values once visa-cohort outcomes accumulate.
import { getConstant } from './calibration/calibrationConstants';

export interface VisaRiskInputs {
  visaStatus: VisaStatus;
  /** Months until current visa expires (0 = already expired, undefined = unknown) */
  visaExpiryMonths?: number;
  /** Months since I-485 (green card application) was filed */
  greenCardStageMonths?: number;
  /** True if I-485 has been pending >180 days (AC21 portability applies) */
  hasPortabilityEligibility?: boolean;
  /** Company name — for sponsor-specificity calculations */
  sponsoringCompany: string;
  /** User's region (for non-US visa models) */
  region: string;
  /** Current overall risk score — determines whether visa risk amplifies to CRITICAL */
  currentScore: number;
}

export type VisaRiskLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface VisaRiskResult {
  overallVisaRisk: VisaRiskLevel;
  /** How dependent on THIS employer for legal status (0–100) */
  dependencyScore: number;
  /** Legal grace period after layoff in days */
  gracePeriodDays: number;
  /** Realistic window to find a new sponsoring employer (months) */
  transferWindowMonths: number;
  /** Whether AC21 portability applies (neutralizes GC lock-in) */
  portabilityProtected: boolean;
  /** Score multiplier — applied to the raw risk score */
  scoreAmplifier: number;
  /** Rationale for the amplifier value */
  amplifierRationale: string;
  /** Key risks in priority order */
  keyRisks: string[];
  /** Immediate action steps */
  immediateActions: string[];
  /** Whether to show visa risk UI panel at all */
  shouldDisplay: boolean;
}

// ── Legal constants (USCIS-grounded, 2024) ───────────────────────────────────
const GRACE_PERIOD_DAYS: Partial<Record<VisaStatus, number>> = {
  h1b:        60,
  l1:         60,
  opt_stem:   60,
  tn:         0,   // TN is status-based; termination = immediate status loss
  other_work_auth: 60,   // conservative estimate
};

const TRANSFER_WINDOW_MONTHS: Partial<Record<VisaStatus, number>> = {
  h1b:        2.0,  // 60 days / 2 months — very tight
  l1:         2.0,
  opt_stem:   2.0,
  tn:         0.5,  // TN: need new employer letter + border crossing
  other_work_auth: 1.5,
};

export function computeVisaRisk(inputs: VisaRiskInputs): VisaRiskResult {
  const {
    visaStatus,
    visaExpiryMonths,
    greenCardStageMonths,
    hasPortabilityEligibility,
    sponsoringCompany,
    region,
    currentScore,
  } = inputs;

  // Citizens and PRs: no visa risk whatsoever
  if (
    visaStatus === 'citizen' ||
    visaStatus === 'permanent_resident' ||
    visaStatus === 'not_applicable'
  ) {
    return noRisk();
  }

  // Non-US regions with no H1B analog: minimal visa risk
  if (!['US', 'United States'].includes(region) && visaStatus !== 'h1b' && visaStatus !== 'l1') {
    return noRisk();
  }

  const gracePeriodDays = GRACE_PERIOD_DAYS[visaStatus] ?? 60;
  const transferWindowMonths = TRANSFER_WINDOW_MONTHS[visaStatus] ?? 2.0;
  const portabilityProtected = !!(hasPortabilityEligibility || (greenCardStageMonths != null && greenCardStageMonths > 180));

  // Dependency score: how locked in are you to this employer for legal status?
  let dependencyScore = 60; // base for any work-auth dependent visa

  // Green card lock-in: most extreme dependency
  const isGcInProgress = greenCardStageMonths != null && greenCardStageMonths >= 18;
  const isGcLockIn = isGcInProgress && !portabilityProtected;
  if (isGcLockIn) {
    dependencyScore = 92; // GC in progress without portability = max lock-in
  } else if (isGcInProgress && portabilityProtected) {
    dependencyScore = 45; // GC in progress but portable = moderate
  } else if (visaStatus === 'h1b' || visaStatus === 'l1') {
    dependencyScore = 68;
  } else if (visaStatus === 'opt_stem') {
    dependencyScore = 62;
  } else if (visaStatus === 'tn') {
    dependencyScore = 75; // TN requires employer sponsorship AND border crossing for transfer
  }

  // Visa expiry proximity increases risk
  if (visaExpiryMonths !== undefined) {
    if (visaExpiryMonths <= 3) dependencyScore = Math.min(100, dependencyScore + 15);
    else if (visaExpiryMonths <= 6) dependencyScore = Math.min(100, dependencyScore + 8);
  }

  // Determine overall risk level
  let overallVisaRisk: VisaRiskLevel;
  if (isGcLockIn && currentScore >= 55) {
    overallVisaRisk = 'CRITICAL';
  } else if (isGcLockIn) {
    overallVisaRisk = 'HIGH';
  } else if (currentScore >= 65 && (visaStatus === 'h1b' || visaStatus === 'l1')) {
    overallVisaRisk = 'CRITICAL';
  } else if (currentScore >= 50 && (visaStatus === 'h1b' || visaStatus === 'l1')) {
    overallVisaRisk = 'HIGH';
  } else if (currentScore >= 40) {
    overallVisaRisk = 'MODERATE';
  } else {
    overallVisaRisk = 'LOW';
  }

  if (visaStatus === 'tn') {
    // BUG-FIX: TN has no grace period — status ends immediately on termination.
    // Amplify ALL risk levels, not just 'LOW'. Previous code only caught 'LOW'.
    const tnAmplification: Record<VisaRiskLevel, VisaRiskLevel> = {
      NONE:     'MODERATE',  // Citizens don't reach this branch; TN baseline = MODERATE
      LOW:      'MODERATE',
      MODERATE: 'HIGH',
      HIGH:     'CRITICAL',
      CRITICAL: 'CRITICAL',
    };
    overallVisaRisk = tnAmplification[overallVisaRisk];
  }

  // WS9 — score-amplifier values sourced from engine_calibration_constants.
  // Bootstrap fallbacks preserve legacy 1.40 / 1.05 / 1.35 / 1.25 / 1.20 / 1.10.
  let scoreAmplifier: number;
  let amplifierRationale: string;

  if (isGcLockIn) {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.gcLockIn', 1.40).value as number;
    amplifierRationale = `Green card application in progress (${greenCardStageMonths}mo) without AC21 portability. A layoff would reset the GC process and require re-filing at a new employer, adding 18–36 months of additional wait time.`;
  } else if (portabilityProtected && isGcInProgress) {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.gcPortable', 1.05).value as number;
    amplifierRationale = `GC in progress but AC21 portability applies (>180 days pending). Can transfer employer without restarting the GC process.`;
  } else if (currentScore >= 60 && (visaStatus === 'h1b' || visaStatus === 'l1')) {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.h1bL1HighRisk', 1.35).value as number;
    amplifierRationale = `H1B/L1 holder at elevated risk score (${currentScore}/100). A 60-day grace period is insufficient for most job searches in this market.`;
  } else if (visaStatus === 'tn') {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.tn', 1.25).value as number;
    amplifierRationale = 'TN status has no grace period — status ends immediately on termination. Transfer requires border crossing which adds logistical risk.';
  } else if (currentScore >= 45) {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.moderateRisk', 1.20).value as number;
    amplifierRationale = `${visaStatus.toUpperCase()} holder with moderate-to-elevated risk. The 60-day clock adds urgency that citizens/PRs don't face.`;
  } else {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.baseline', 1.10).value as number;
    amplifierRationale = `${visaStatus.toUpperCase()} work authorization adds an employment-law constraint that increases the cost of a layoff vs. a citizen.`;
  }

  // Key risks
  const keyRisks: string[] = [];
  if (gracePeriodDays <= 60) {
    keyRisks.push(`Only ${gracePeriodDays}-day grace period after termination — job search + offer + H1B transfer takes 4–8 weeks minimum`);
  }
  if (isGcLockIn) {
    keyRisks.push(`GC application would restart at new employer — potential 18–36 month delay to priority date`);
  }
  if (visaExpiryMonths !== undefined && visaExpiryMonths <= 6) {
    keyRisks.push(`Visa expires in ${visaExpiryMonths} months — new employer must file H1B transfer before expiry`);
  }
  if (visaStatus === 'tn') {
    keyRisks.push('TN requires border re-crossing for each employer change — 1–3 day process that must succeed');
  }
  if (!portabilityProtected && isGcInProgress) {
    keyRisks.push('GC portability (AC21) not yet available — less than 180 days since I-485 filing');
  }

  // Immediate actions
  const immediateActions: string[] = [];
  if (overallVisaRisk === 'CRITICAL' || overallVisaRisk === 'HIGH') {
    immediateActions.push('Build an external pipeline NOW — your 60-day clock means offers must be in hand before any announcement');
    immediateActions.push('Consult an immigration attorney about your AC21 portability status and grace period rights');
    if (isGcLockIn) {
      immediateActions.push('Ask your attorney about GC priority date preservation options at alternative sponsors');
    }
  }
  if (overallVisaRisk === 'MODERATE') {
    immediateActions.push('Begin passive job search (update LinkedIn, connect with 2–3 H1B-friendly employers)');
    immediateActions.push(`General guidance: grace periods run approximately ${gracePeriodDays} days from last day of employment — verify the exact figure for your visa category with an immigration attorney`);
  }

  return {
    overallVisaRisk,
    dependencyScore,
    gracePeriodDays,
    transferWindowMonths,
    portabilityProtected,
    scoreAmplifier,
    amplifierRationale,
    keyRisks,
    immediateActions,
    shouldDisplay: overallVisaRisk !== 'NONE' && overallVisaRisk !== 'LOW',
  };
}

function noRisk(): VisaRiskResult {
  return {
    overallVisaRisk: 'NONE',
    dependencyScore: 0,
    gracePeriodDays: 0,
    transferWindowMonths: 0,
    portabilityProtected: false,
    scoreAmplifier: 1.0,
    amplifierRationale: 'No work authorization dependency — citizen or permanent resident.',
    keyRisks: [],
    immediateActions: [],
    shouldDisplay: false,
  };
}
