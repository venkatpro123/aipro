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
  // ── UK ───────────────────────────────────────────────────────────────────
  // Skilled Worker visa (Tier 2 successor): employer must hold Home Office
  // sponsor licence + issue a Certificate of Sponsorship. 60-day grace period
  // after employment ends before leave expires. Salary threshold £38,700
  // general (2024); occupation-specific going rates may differ.
  | 'uk_skilled_worker'
  // ── EU ───────────────────────────────────────────────────────────────────
  // EU Blue Card: high-skill work authorisation. Germany's implementation
  // (§20 AufenthG) is uniquely generous — 6-month job-search extension upon
  // termination. France/NL give 30–90 days. Card is country-specific.
  | 'eu_blue_card'
  // Germany-specific EU Blue Card: explicitly tracks §20 AufenthG 6-month
  // job-search extension. Separate from 'eu_blue_card' so France/NL users
  // do not receive Germany's more generous rules.
  | 'eu_blue_card_germany'
  // ── APAC ─────────────────────────────────────────────────────────────────
  // Australia Temporary Skill Shortage (subclass 482 TSS): 28-day notification
  // window; 60-day to find new sponsor and lodge transfer nomination.
  // Occupation must be on MLTSSL or STSOL. Fair Work Act salary parity required.
  | 'australia_482_tss'
  // Singapore Employment Pass (EP): employer-tied, cancelled upon termination.
  // MOM typically grants a 30-day STVP/Short-Term Visit Pass for transition.
  // New employer must apply for a fresh EP (MOM processing 3–8 weeks).
  | 'singapore_ep'
  // Singapore S Pass: mid-skilled work pass, quota-based (≤15% workforce).
  // 10-day cancellation period — shortest grace window on the platform.
  // Minimum qualifying salary S$3,150/month (2024), rising Sep 2025.
  | 'singapore_s_pass'
  // ── Canada ───────────────────────────────────────────────────────────────
  // LMIA (Labour Market Impact Assessment) work permit: employer-specific.
  // New LMIA at a different employer takes 60–150 days + $1,000 CAD fee.
  // LMIA-exempt pathways exist under CUSMA Annex 1603.D.1 and intracompany.
  // IRCC Bridge Open Work Permit (BOWP) gives 90-day maintained status on
  // permit renewal; does NOT apply on termination from the sponsoring employer.
  | 'canada_lmia_permit'
  // ── Philippines ──────────────────────────────────────────────────────────
  // 9G Alien Employment Permit (AEP): issued by DOLE per employer and per
  // position. A new DOLE AEP application (BFO-DOLE-F-01) is required for
  // each employer change, including mandatory 14-day newspaper publication.
  // Full cycle typically 60–90 days. Anti-dummy law restricts certain roles.
  // 15-day administrative grace for administrative notice purposes.
  | 'philippines_9g_aep'
  // ── Japan ────────────────────────────────────────────────────────────────
  // Japan work visa (Engineer/Specialist in Humanities/International Services,
  // and equivalents under Ministry of Justice criteria). Employer-tied; 30-day
  // grace window typically observed under MHLW guidance before status lapses.
  // New employer must apply for visa status change (在留資格変更許可申請).
  | 'japan_work_visa'
  // ── MENA work authorization ───────────────────────────────────────────────
  // UAE Employment Visa (Mahkoumiyat) is employer-sponsored, ~30 days grace
  // after cancellation. Effectively H1B-equivalent in employer-lock dynamic.
  | 'uae_employment_visa'
  // UAE Golden Visa: 5-10yr self-sponsored, employment-independent → low risk
  | 'uae_golden_visa'
  // Saudi Iqama (work residence permit) — employer-sponsored, 60-day grace
  // post-termination under 2024 Labor Law amendments
  | 'saudi_iqama'
  // Qatar work permit (RP) — employer-sponsored, 30-day grace
  | 'qatar_work_permit'
  // Kuwait work permit (Article 17/18) — employer-sponsored, 90-day grace post-2020 reforms
  | 'kuwait_work_permit'
  // Catch-all for remaining GCC sponsored permits (Bahrain, Oman)
  | 'gcc_sponsored'
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
  /** The resolved visa type — carried through for label derivation without reverse-engineering amplifiers */
  visaType: VisaStatus;
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
  /**
   * Specific options available to the holder — transfer programs, job-seeker
   * passes, open work permits, etc. Displayed as a distinct "options" block
   * in VisaRiskPanel so users know what escape paths exist beyond the risks.
   */
  availableOptions?: string[];
}

// ── Legal constants — US / UK / EU / APAC / Canada / Philippines / MENA ──────
const GRACE_PERIOD_DAYS: Partial<Record<VisaStatus, number>> = {
  // US
  h1b:        60,
  l1:         60,
  opt_stem:   60,
  tn:         0,   // TN is status-based; termination = immediate status loss
  other_work_auth: 60,   // conservative estimate
  // UK — UKVI 2024 guidance: leave typically expires with the sponsorship end date;
  // 60-day transition period is the standard Home Office practice for role changes.
  uk_skilled_worker: 60,
  // EU — Germany §20 AufenthG: 6-month (180-day) job-search period.
  // Other EU countries: 30–90 days. We encode Germany's maximum (most users
  // referencing EU Blue Card are Germany-based; other countries produce lower urgency anyway).
  eu_blue_card: 180,
  eu_blue_card_germany: 180, // Explicit Germany type — same §20 AufenthG 6-month buffer
  // APAC
  australia_482_tss:  28,   // DIBP: 28-day notification obligation; 60 days to find new sponsor
  singapore_ep:       30,   // MOM: STVP/special pass typically 30 days on EP cancellation
  singapore_s_pass:   10,   // MOM: 10-day cancellation — shortest grace window globally
  canada_lmia_permit: 90,   // IRCC maintained-status bridge on permit renewal; on termination,
                             // remaining permit validity applies — 90-day is a conservative floor
  philippines_9g_aep: 15,   // DOLE administrative grace for notice; no right to work elsewhere
  japan_work_visa:    30,   // MHLW guidance: ~30-day window before visa status lapses
  // MENA — labour ministry guidance 2024-2025
  uae_employment_visa: 30,   // UAE Labour Law 2021: 30-day grace after cancellation
  uae_golden_visa:     1825, // 5 years — Golden Visa is residency, not employer-tied
  saudi_iqama:         60,   // Saudi Labor Law 2024 amendments: 60-day grace
  qatar_work_permit:   30,   // Qatar Labour Law: 30-day grace
  kuwait_work_permit:  90,   // Kuwait post-2020 reforms: 90-day grace before mandatory departure
  gcc_sponsored:       30,   // Bahrain/Oman conservative baseline
};

const TRANSFER_WINDOW_MONTHS: Partial<Record<VisaStatus, number>> = {
  // US
  h1b:        2.0,  // 60 days / 2 months — very tight
  l1:         2.0,
  opt_stem:   2.0,
  tn:         0.5,  // TN: need new employer letter + border crossing
  other_work_auth: 1.5,
  // UK — 60-day grace; sponsor licence check + CoS issuance is the real bottleneck
  uk_skilled_worker: 2.0,
  // EU — Germany: 6-month realistic window (register with Agentur, claim ALG1, search);
  // shorter in other EU countries but Germany is the benchmark for EU Blue Card
  eu_blue_card: 6.0,
  eu_blue_card_germany: 6.0, // Explicit Germany — same 6-month §20 AufenthG buffer
  // APAC
  australia_482_tss:  2.0,   // 60 days to find SBS + lodge transfer nomination
  singapore_ep:       1.5,   // 30-day STVP + MOM processing 3–8 weeks
  singapore_s_pass:   0.5,   // 10-day window — barely enough for formal applications
  canada_lmia_permit: 4.0,   // LMIA processing 60–150 days at new employer
  philippines_9g_aep: 2.5,   // DOLE 14-day publication + processing = ~60–90 days
  japan_work_visa:    1.5,   // 30-day grace + MOJ status-change processing 1–2 months
  // MENA — transfer requires new sponsor + ministry approval + medical
  uae_employment_visa: 1.0,   // 30 days legally, NOC + new offer process is real bottleneck
  uae_golden_visa:     12.0,  // 5–10yr residency = effectively no transfer pressure
  saudi_iqama:         2.0,   // 60 days + Nitaqat/Saudization quota factor at new sponsor
  qatar_work_permit:   1.0,
  kuwait_work_permit:  3.0,   // 90 days + ministry approval per Article 18 transfer
  gcc_sponsored:       1.0,
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

  // Route all globally-typed visa statuses through the full dependency scoring.
  // Prior code dropped non-US/MENA users to noRisk() even when the visa type
  // itself carries employer-lock risk (UK Skilled Worker, Singapore EP, etc.).
  // Now: if the visaStatus is any explicit global type, route through regardless
  // of the region string — the type assertion is authoritative.
  const isMenaVisa = visaStatus === 'uae_employment_visa'
    || visaStatus === 'uae_golden_visa'
    || visaStatus === 'saudi_iqama'
    || visaStatus === 'qatar_work_permit'
    || visaStatus === 'kuwait_work_permit'
    || visaStatus === 'gcc_sponsored';
  const isGlobalExplicitVisa = visaStatus === 'uk_skilled_worker'
    || visaStatus === 'eu_blue_card'
    || visaStatus === 'eu_blue_card_germany'
    || visaStatus === 'australia_482_tss'
    || visaStatus === 'singapore_ep'
    || visaStatus === 'singapore_s_pass'
    || visaStatus === 'canada_lmia_permit'
    || visaStatus === 'philippines_9g_aep'
    || visaStatus === 'japan_work_visa';
  const isUsRegion = ['US', 'United States'].includes(region);
  const isMenaRegion = ['AE', 'UAE', 'SA', 'Saudi Arabia', 'QA', 'Qatar', 'BH', 'OM', 'KW', 'Kuwait'].includes(region);
  if (!isUsRegion && !isMenaRegion && !isMenaVisa && !isGlobalExplicitVisa
      && visaStatus !== 'h1b' && visaStatus !== 'l1') {
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
  } else if (visaStatus === 'uae_employment_visa') {
    // UAE Employment Visa: employer cancels → 30 days grace, must secure new sponsor.
    // Structurally similar to H1B but with NO equivalent of H1B portability.
    // NOC (No Objection Certificate) from old employer is the bottleneck.
    dependencyScore = 78;
  } else if (visaStatus === 'saudi_iqama') {
    // Saudi Iqama: 60-day grace under 2024 Labor Law amendments.
    // Nitaqat (Saudization quota) at new sponsor adds friction for foreign hires.
    dependencyScore = 72;
  } else if (visaStatus === 'qatar_work_permit') {
    // Qatar: 30-day grace, kafala system reforms eased transfers but real friction remains.
    dependencyScore = 80;
  } else if (visaStatus === 'kuwait_work_permit') {
    // Kuwait: 90-day grace (longest in GCC post-2020 reforms) but ministry approval
    // under Article 17/18 + 1-year wait for some transfer types adds real friction.
    dependencyScore = 74;
  } else if (visaStatus === 'gcc_sponsored') {
    // Bahrain/Oman/Kuwait: conservative baseline — varies by emirate/region
    dependencyScore = 75;
  } else if (visaStatus === 'uae_golden_visa') {
    // Golden Visa: 5–10yr residency NOT tied to employer. Holder can switch jobs freely.
    // Effectively a PR-like status for visa risk purposes.
    dependencyScore = 15;
  } else if (visaStatus === 'uk_skilled_worker') {
    // Home Office-licensed sponsor required; Certificate of Sponsorship per employer.
    // 60-day grace, but CoS quota at new employer and salary threshold compliance
    // (£38,700 general / SOC going rate) create meaningful friction.
    dependencyScore = 72;
  } else if (visaStatus === 'eu_blue_card') {
    // Germany §20 AufenthG: 6-month job-search period dramatically reduces employer
    // lock-in vs. all other work visas. ALG1 unemployment benefit + Ausländerbehörde
    // job-seeker permit available. Other EU: lower dependency still (shorter period
    // but continent-wide network). Lowest dependency of any explicit work visa type.
    dependencyScore = 50;
  } else if (visaStatus === 'eu_blue_card_germany') {
    // Explicit Germany Blue Card: §20 AufenthG 6-month buffer + ALG1 entitlement.
    // Fractionally lower than generic eu_blue_card because Germany's framework
    // is explicitly encoded here (no ambiguity about country-specific rules).
    dependencyScore = 45;
  } else if (visaStatus === 'australia_482_tss') {
    // Standard Business Sponsor (SBS) transfer required within 60 days. Occupation
    // must remain on MLTSSL/STSOL. Broader sponsor pool than H1B market.
    dependencyScore = 68;
  } else if (visaStatus === 'singapore_ep') {
    // EP cancelled upon termination; new employer must apply fresh with MOM (3–8 weeks).
    // MOM processing + Fair Consideration Framework advertising = real time pressure.
    dependencyScore = 72;
  } else if (visaStatus === 'singapore_s_pass') {
    // 10-day cancellation — shortest grace window on the platform. Quota-based:
    // new employer must have open S Pass quota slots. Near-H1B dependency level.
    dependencyScore = 88;
  } else if (visaStatus === 'canada_lmia_permit') {
    // LMIA is employer-specific; new employer must obtain separate LMIA (60–150 days).
    // LMIA-exempt pathways (CUSMA, intracompany) exist but apply to a narrow set.
    dependencyScore = 65;
  } else if (visaStatus === 'philippines_9g_aep') {
    // AEP is per employer AND per position. No transfer mechanism — new DOLE application
    // required for each employer change with mandatory 14-day publication period.
    dependencyScore = 82;
  } else if (visaStatus === 'japan_work_visa') {
    // Japan Engineer/Specialist: employer-tied status. Status change (在留資格変更)
    // requires MOJ approval (1–3 months). 30-day observed grace window.
    // Finding a Japanese employer + navigating MOJ process creates real friction.
    dependencyScore = 70;
  }

  // Visa expiry proximity increases risk
  if (visaExpiryMonths !== undefined) {
    if (visaExpiryMonths <= 3) dependencyScore = Math.min(100, dependencyScore + 15);
    else if (visaExpiryMonths <= 6) dependencyScore = Math.min(100, dependencyScore + 8);
  }

  // Determine overall risk level
  let overallVisaRisk: VisaRiskLevel;
  const isMenaSponsoredVisa = visaStatus === 'uae_employment_visa'
    || visaStatus === 'saudi_iqama'
    || visaStatus === 'qatar_work_permit'
    || visaStatus === 'kuwait_work_permit'
    || visaStatus === 'gcc_sponsored';

  if (isGcLockIn && currentScore >= 55) {
    overallVisaRisk = 'CRITICAL';
  } else if (isGcLockIn) {
    overallVisaRisk = 'HIGH';
  } else if (currentScore >= 65 && (visaStatus === 'h1b' || visaStatus === 'l1' || isMenaSponsoredVisa)) {
    overallVisaRisk = 'CRITICAL';
  } else if (currentScore >= 50 && (visaStatus === 'h1b' || visaStatus === 'l1' || isMenaSponsoredVisa)) {
    overallVisaRisk = 'HIGH';
  } else if (visaStatus === 'uae_golden_visa') {
    // Golden Visa is essentially residency-independent of employer
    overallVisaRisk = currentScore >= 55 ? 'LOW' : 'NONE';
  // ── Global visa types ──────────────────────────────────────────────────────
  } else if (visaStatus === 'singapore_s_pass') {
    // 10-day cancellation = most dangerous grace window; elevate one tier vs. EP
    overallVisaRisk = currentScore >= 50 ? 'CRITICAL' : 'HIGH';
  } else if (currentScore >= 65 && (visaStatus === 'uk_skilled_worker' || visaStatus === 'singapore_ep'
      || visaStatus === 'australia_482_tss' || visaStatus === 'philippines_9g_aep'
      || visaStatus === 'japan_work_visa')) {
    overallVisaRisk = 'CRITICAL';
  } else if (currentScore >= 50 && (visaStatus === 'uk_skilled_worker' || visaStatus === 'singapore_ep'
      || visaStatus === 'australia_482_tss' || visaStatus === 'philippines_9g_aep'
      || visaStatus === 'japan_work_visa')) {
    overallVisaRisk = 'HIGH';
  } else if (currentScore >= 55 && visaStatus === 'canada_lmia_permit') {
    // LMIA transfer is slow (60–150 days) but Canada has more escape pathways
    // (Express Entry, PNP) — cap at HIGH rather than CRITICAL
    overallVisaRisk = 'HIGH';
  } else if (visaStatus === 'eu_blue_card' || visaStatus === 'eu_blue_card_germany') {
    // Germany's 6-month buffer makes CRITICAL classification rarely appropriate
    overallVisaRisk = currentScore >= 70 ? 'MODERATE' : 'LOW';
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
  } else if (currentScore >= 55 && isMenaSponsoredVisa) {
    // Per-visa amplifiers (spec): UAE 1.30, Saudi 1.35 (Nitaqat friction highest),
    // Qatar 1.28, Kuwait 1.25 (longest grace period in GCC eases urgency slightly).
    if (visaStatus === 'uae_employment_visa') {
      scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.uaeEmploymentVisa', 1.30).value as number;
      amplifierRationale = `UAE Employment Visa holder at elevated risk (${currentScore}/100). 30-day grace post-cancellation + NOC bottleneck at current employer makes a job search outside the grace clock structurally difficult.`;
    } else if (visaStatus === 'saudi_iqama') {
      scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.saudiIqama', 1.35).value as number;
      amplifierRationale = `Saudi Iqama holder at elevated risk (${currentScore}/100). 60-day grace + Nitaqat (Saudization) quota at the next sponsor creates the highest structural friction in the GCC. Many sponsors lack open foreign-hire slots for non-Saudi candidates in green/platinum Nitaqat tiers.`;
    } else if (visaStatus === 'qatar_work_permit') {
      scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.qatarWorkPermit', 1.28).value as number;
      amplifierRationale = `Qatar work permit holder at elevated risk (${currentScore}/100). 30-day grace + Ministry of Labour approval required for transfer. Post-kafala reforms eased this but ministry processing (5-10 business days) remains a real constraint.`;
    } else if (visaStatus === 'kuwait_work_permit') {
      scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.kuwaitWorkPermit', 1.25).value as number;
      amplifierRationale = `Kuwait work permit holder at elevated risk (${currentScore}/100). 90-day grace (longest in GCC) eases urgency slightly, but Article 17/18 transfer requires ministry approval + 1-year wait for some transfer categories.`;
    } else {
      scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.gccSponsored', 1.22).value as number;
      amplifierRationale = `GCC sponsored visa holder at elevated risk (${currentScore}/100). 30-day grace period + new sponsor formalities apply.`;
    }
  } else if (visaStatus === 'tn') {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.tn', 1.25).value as number;
    amplifierRationale = 'TN status has no grace period — status ends immediately on termination. Transfer requires border crossing which adds logistical risk.';
  // ── Global visa amplifiers ─────────────────────────────────────────────────
  } else if (currentScore >= 50 && visaStatus === 'singapore_s_pass') {
    // 10-day cancellation is the tightest grace window on the platform.
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.singaporeSPass', 1.25).value as number;
    amplifierRationale = `Singapore S Pass holder at elevated risk (${currentScore}/100). 10-day cancellation period — the tightest grace window of any work visa type. Offers and quota verification at the new employer must precede any risk materialisation.`;
  } else if (currentScore >= 50 && visaStatus === 'uk_skilled_worker') {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.ukSkilledWorker', 1.30).value as number;
    amplifierRationale = `UK Skilled Worker visa holder at elevated risk (${currentScore}/100). 60-day grace period; new employer must hold a Home Office sponsor licence and issue a Certificate of Sponsorship before the clock expires.`;
  } else if (currentScore >= 50 && visaStatus === 'singapore_ep') {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.singaporeEp', 1.20).value as number;
    amplifierRationale = `Singapore Employment Pass holder at elevated risk (${currentScore}/100). EP cancelled upon termination; 30-day STVP window + MOM processing for a new EP (3–8 weeks) creates a compressed search timeline. Job Seeker Pass (up to 6 months) available for eligible professionals.`;
  } else if (currentScore >= 50 && visaStatus === 'australia_482_tss') {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.australia482Tss', 1.35).value as number;
    amplifierRationale = `Australian 482 TSS visa holder at elevated risk (${currentScore}/100). 28-day notification obligation to DIBP; sponsor must transfer or holder must depart/change status. New Standard Business Sponsor and nomination transfer required.`;
  } else if (currentScore >= 50 && visaStatus === 'philippines_9g_aep') {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.philippines9gAep', 1.15).value as number;
    amplifierRationale = `Philippines 9G AEP holder at elevated risk (${currentScore}/100). AEP is employer-specific; new DOLE application with mandatory 14-day publication period required. Full cycle: 60–90 days.`;
  } else if (currentScore >= 45 && visaStatus === 'canada_lmia_permit') {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.canadaLmiaPermit', 1.25).value as number;
    amplifierRationale = `Canadian LMIA work permit holder at elevated risk (${currentScore}/100). New LMIA at a different employer takes 60–150 days and costs $1,000 CAD. 90-day Bridge OWP available in some renewal scenarios. Check CUSMA/LMIA-exempt eligibility and Express Entry CRS score immediately.`;
  } else if (visaStatus === 'eu_blue_card_germany') {
    // Explicit Germany Blue Card: §20 AufenthG 6-month buffer is the most protective of any work visa.
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.euBlueCardGermany', 1.10).value as number;
    amplifierRationale = `Germany EU Blue Card holder — §20 AufenthG provides a 6-month job-search extension on termination. Register with Bundesagentur für Arbeit immediately to claim ALG1 and obtain the Aufenthaltserlaubnis zur Arbeitssuche.`;
  } else if (visaStatus === 'eu_blue_card') {
    // Generic EU Blue Card (non-Germany): 6-month buffer for Germany users, shorter elsewhere.
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.euBlueCard', 1.15).value as number;
    amplifierRationale = `EU Blue Card holder — Germany's §20 AufenthG 6-month job-search period significantly reduces urgency vs. other work visas. If you are in Germany, select EU Blue Card (Germany) for the precise §20 AufenthG guidance.`;
  } else if (currentScore >= 50 && visaStatus === 'japan_work_visa') {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.japanWorkVisa', 1.20).value as number;
    amplifierRationale = `Japan work visa holder at elevated risk (${currentScore}/100). Visa status is employer-tied; status change application (在留資格変更許可申請) requires 1–3 months Ministry of Justice processing. 30-day observed grace window.`;
  } else if (currentScore >= 45) {
    scoreAmplifier = getConstant<number>('visaRiskEngine.amplifier.moderateRisk', 1.20).value as number;
    amplifierRationale = `${visaStatus.toUpperCase()} holder with moderate-to-elevated risk. The grace-period clock adds urgency that citizens/PRs don't face.`;
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
  if (visaStatus === 'uae_employment_visa') {
    keyRisks.push('UAE: 30-day grace period after visa cancellation — NOC (No Objection Certificate) from current employer is the bottleneck for transferring to a new sponsor');
    keyRisks.push('UAE labour ban risk: employers can request a 6-month ban if you leave before contract completion (less common since 2016 reforms but still possible)');
  }
  if (visaStatus === 'saudi_iqama') {
    keyRisks.push('Saudi Nitaqat: new sponsor must have an open foreign-hire quota (Nitaqat color) — Saudi-owned firms in green/platinum tiers are the most accessible employers');
    keyRisks.push('Iqama cancellation triggers a 60-day grace period under 2024 Labor Law; exit re-entry visa may be required if grace expires');
  }
  if (visaStatus === 'qatar_work_permit') {
    keyRisks.push('Qatar: 30-day grace period; kafala reforms (2020) allow employer changes but ministry approval and new employment contract are required');
  }
  if (visaStatus === 'kuwait_work_permit') {
    keyRisks.push('Kuwait: 90-day grace period (longest in GCC) but Article 17 (private sector) ↔ Article 18 (governmental) transfers require ministry approval');
    keyRisks.push('Some Kuwait visa categories impose a 1-year wait between sponsors after transfer rejection — verify your Article type before resigning');
  }
  if (visaStatus === 'uk_skilled_worker') {
    keyRisks.push('UK: new employer must hold a valid Home Office Skilled Worker sponsor licence — check the public register on gov.uk/check-if-organisation-can-sponsor-workers before applying');
    keyRisks.push('UK salary threshold: new role must meet £38,700 general minimum (2024) OR the occupation-specific SOC going rate — whichever is higher');
    keyRisks.push('60-day grace period after employment ends; Certificate of Sponsorship must be issued and submitted to UKVI before this expires');
  }
  if (visaStatus === 'eu_blue_card') {
    keyRisks.push('EU Blue Card is country-specific — a German Blue Card does NOT automatically transfer to France, Netherlands, or any other EU state');
    keyRisks.push('Germany §20 AufenthG: 6-month job-search period with job-seeker residence permit (Aufenthaltserlaubnis zur Arbeitssuche) — must register with Bundesagentur für Arbeit to activate');
    keyRisks.push('New role must meet minimum salary threshold (€45,300 general / €35,100 shortage occupations for 2024); salary below threshold disqualifies Blue Card renewal');
  }
  if (visaStatus === 'australia_482_tss') {
    keyRisks.push('Australia: 60 days from end of employment to find a new approved Standard Business Sponsor, lodge a nomination, and transfer the visa stream');
    keyRisks.push('New occupation must appear on MLTSSL (Medium and Long-term Strategic Skills List) or STSOL for 482 TSS subclass continuation');
    keyRisks.push('Fair Work Act obligation: new sponsor must pay market salary rate (MSAR) — underpaying relative to Australian workers is a visa compliance risk');
  }
  if (visaStatus === 'singapore_ep') {
    keyRisks.push('Singapore EP cancelled upon termination; MOM typically grants a 30-day STVP (Short-Term Visit Pass) to settle affairs — this is not guaranteed and must be requested');
    keyRisks.push('New employer must file a fresh EP application with MOM — processing 3–8 weeks; Fair Consideration Framework advertising obligation may add delay at larger employers');
    keyRisks.push('EP minimum salary: S$5,000/month general, S$5,500 for financial services sector (2024); new role must meet the applicable threshold');
  }
  if (visaStatus === 'singapore_s_pass') {
    keyRisks.push('Singapore S Pass: 10-day cancellation period — the shortest grace window of any work visa tracked by this platform; treat any risk signal as requiring pre-emptive action');
    keyRisks.push('S Pass is quota-based: new employer may have exhausted their 15%-of-workforce quota cap — verify before accepting offer, as MOM will reject if quota is exceeded');
    keyRisks.push('Minimum qualifying salary: S$3,150/month (2024), rising to S$3,300 from Sep 2025; salary compliance required at each employer change');
  }
  if (visaStatus === 'canada_lmia_permit') {
    keyRisks.push('Canada LMIA is employer-specific; new LMIA at a different employer typically takes 60–150 days and costs the employer $1,000 CAD — many employers refuse LMIA-dependent candidates');
    keyRisks.push('LMIA-exempt pathways: CUSMA (Annex 1603.D.1) covers professionals, engineers, accountants, and others — verify eligibility before assuming a long LMIA wait is required');
    keyRisks.push('Express Entry: if your CRS score is competitive (check monthly draw cutoffs at ircc.canada.ca), filing an EOI now may be faster than repeating LMIA cycles');
  }
  if (visaStatus === 'philippines_9g_aep') {
    keyRisks.push('Philippines 9G AEP is employer-specific and position-specific — cannot legally work for any other employer without a new DOLE-issued AEP, even temporarily');
    keyRisks.push('New AEP application requires 14-day newspaper publication (DOLE requirement) plus processing; full cycle typically 60–90 days — plan accordingly');
    keyRisks.push('Anti-Dummy Law (RA 7042): certain industries are reserved for Filipino nationals (retail trade, mass media, advertising agency management) — confirm your role category is not restricted');
  }
  if (visaStatus === 'eu_blue_card_germany') {
    keyRisks.push('Germany EU Blue Card is country-specific — does NOT transfer to France, Netherlands, or any other EU state automatically');
    keyRisks.push('§20 AufenthG 6-month job-search extension: must apply at Ausländerbehörde before current permit expires and register with Bundesagentur für Arbeit to activate ALG1 entitlement');
    keyRisks.push('New role must meet EU Blue Card salary threshold (€45,300 general / €35,100 shortage occupations for 2024); falling below disqualifies Blue Card renewal at new employer');
    keyRisks.push('Within first 2 years on Blue Card, employer changes require Ausländerbehörde notification within 3 months of start — non-compliance risks permit revocation');
  }
  if (visaStatus === 'japan_work_visa') {
    keyRisks.push('Japan work visa status is employer-tied (在留資格): employment ends → status lapses after ~30 days unless a change-of-status application is filed');
    keyRisks.push('Status change application (在留資格変更許可申請) at new employer requires Ministry of Justice approval — processing typically 1–3 months; work cannot legally begin until approved');
    keyRisks.push('Certificate of Eligibility (在留資格認定証明書) from new employer is required for status transfer; delay at employer HR is the primary bottleneck');
    keyRisks.push('Highly Skilled Professional (HSP) points-based system available if score ≥70 — converts employer-tied to more flexible status; check MHLW calculator if qualified');
  }

  // Immediate actions
  const immediateActions: string[] = [];
  if (overallVisaRisk === 'CRITICAL' || overallVisaRisk === 'HIGH') {
    if (visaStatus === 'uae_employment_visa') {
      immediateActions.push('UAE: secure new offer + NOC BEFORE the 30-day grace clock starts. NOC takes 1–3 weeks at large employers — start the conversation now');
      immediateActions.push('Identify free-zone employers (DIFC/ADGM/DMCC) where visa transfers are typically faster than mainland LLC sponsors');
      immediateActions.push('Calculate end-of-service gratuity payable: 21 days/yr for first 5 years + 30 days/yr thereafter — this is your effective financial buffer');
    } else if (visaStatus === 'saudi_iqama') {
      immediateActions.push('Saudi: confirm next sponsor has open Nitaqat quota for your role/nationality before signing');
      immediateActions.push('Request Iqama transfer (نقل كفالة) in writing — process takes 5–15 days through Absher');
      immediateActions.push('Verify end-of-service gratuity: 0.5 month/yr for first 5 years + 1 month/yr thereafter is your financial buffer');
    } else if (visaStatus === 'qatar_work_permit') {
      immediateActions.push('Qatar: secure new offer + Ministry of Labour approval for transfer (typically 5–10 business days post-reform)');
      immediateActions.push('End-of-service gratuity: 3 weeks per year of service — quantify the financial buffer');
    } else if (visaStatus === 'kuwait_work_permit') {
      immediateActions.push('Kuwait: 90-day grace gives more breathing room than UAE/Qatar — use it deliberately for offer + ministry approval');
      immediateActions.push('Verify your Article 17 (private) vs 18 (gov/quasi-gov) classification — affects which sponsors you can transfer to');
      immediateActions.push('End-of-service gratuity: 15 days/yr first 5yr + 30 days/yr thereafter, capped at 1.5yr basic salary — significant buffer at 7+ years');
    } else if (visaStatus === 'uk_skilled_worker') {
      immediateActions.push('UK: check the Home Office sponsor licence register (gov.uk/check-if-organisation-can-sponsor-workers) before applying to any employer — unlicensed sponsors cannot issue a CoS');
      immediateActions.push('Calculate your statutory redundancy pay (1 week/yr service, max 20 weeks) + notice pay — this financial buffer runs alongside the 60-day grace period');
      immediateActions.push('Identify employers who have recently sponsored Skilled Worker visas — active HR familiarity makes the CoS process 2–4× faster than first-time sponsors');
    } else if (visaStatus === 'eu_blue_card') {
      immediateActions.push('EU/Germany: register with Bundesagentur für Arbeit immediately — this activates ALG1 (Arbeitslosengeld I) unemployment benefit claim, typically €60–70% of prior net salary');
      immediateActions.push('Apply for Aufenthaltserlaubnis zur Arbeitssuche (§20 AufenthG job-seeker permit) at your local Auslaenderbehörde — valid up to 6 months; activates Germany\'s 180-day buffer');
      immediateActions.push('Target employers in the same Bundesland initially — changing employer within the first 2 years on a German Blue Card requires ABH notification within 3 months');
    } else if (visaStatus === 'eu_blue_card_germany') {
      immediateActions.push('Germany §20 AufenthG: register with Bundesagentur für Arbeit on the day of termination notice — this activates ALG1 (Arbeitslosengeld I) at ~60–70% of prior net salary for up to 12 months');
      immediateActions.push('Apply for Aufenthaltserlaubnis zur Arbeitssuche at your local Ausländerbehörde — provides up to 6 months to search, well before the §20 clock expires; bring Kündigung letter + proof of job search registration');
      immediateActions.push('Salary threshold check: new role must meet EU Blue Card minimum (€45,300/€35,100 for shortage occupations) — confirm with the new employer\'s HR before signing, as a below-threshold role prevents Blue Card renewal');
      immediateActions.push('If within first 2 years of Blue Card: file ABH notification of employer change within 3 months of new employment start to avoid permit compliance risk');
    } else if (visaStatus === 'australia_482_tss') {
      immediateActions.push('Australia: notify Department of Home Affairs of employment change within 28 days — use ImmiAccount; failure to notify is a visa compliance risk');
      immediateActions.push('Check Fair Work Ombudsman\'s register of approved Standard Business Sponsors actively recruiting for your ANZSCO occupation code');
      immediateActions.push('If MLTSSL-listed and eligible, consider subclass 186/189 pathways — permanent residence removes sponsor dependency entirely');
    } else if (visaStatus === 'singapore_ep') {
      immediateActions.push('Singapore: request a transitional STVP (Short-Term Visit Pass) from MOM immediately upon termination — standard practice, usually approved within 1 business day online');
      immediateActions.push('Begin EP applications through target employers now; GTS (global-HQ employers) track faster and have EP approval pre-authorisation at MOM');
      immediateActions.push('If search extends beyond 30 days, apply for Long-Term Visit Pass or job-seeker EntrePass to maintain legal stay while applications are in progress');
    } else if (visaStatus === 'singapore_s_pass') {
      immediateActions.push('URGENT: 10-day S Pass cancellation is the platform\'s shortest grace window — treat any elevated risk signal as requiring immediate pre-emptive job search, not reactive');
      immediateActions.push('Request STVP from MOM on Day 1 of notice — provides 30 days to settle affairs and submit formal EP/S Pass applications at new employers');
      immediateActions.push('Verify new employer\'s S Pass quota headroom BEFORE accepting an offer — ask HR explicitly; MOM will reject the application if the employer is at quota cap');
    } else if (visaStatus === 'canada_lmia_permit') {
      immediateActions.push('Canada: check CUSMA/LMIA-exempt eligibility first (no $1,000 fee, faster) — many tech, finance, professional, and managerial roles qualify under Annex 1603.D.1');
      immediateActions.push('Check your Express Entry CRS score at ircc.canada.ca — provincial draws (ONP, BCPNP) often have lower thresholds than federal Express Entry draws; a PR pathway eliminates LMIA dependency');
      immediateActions.push('Bridge Open Work Permit (BOWP): if your permit expired and an extension/change is pending with IRCC, maintained status gives up to 90 days — verify your current status in IRCC account');
    } else if (visaStatus === 'philippines_9g_aep') {
      immediateActions.push('Philippines: secure a new employer offer BEFORE current AEP lapses — there is no legal mechanism to work at a different employer without a new DOLE-issued AEP');
      immediateActions.push('File new DOLE AEP application (BFO-DOLE-F-01) immediately with target employer; allow 60–90 days for publication + DOLE processing + Bureau of Immigration endorsement');
      immediateActions.push('Verify the role category is not restricted by the Anti-Dummy Law (RA 7042) before committing to the employer — retail, mass media, and advertising management are reserved categories');
    } else if (visaStatus === 'japan_work_visa') {
      immediateActions.push('Japan: secure a new employer willing to sponsor your status change (在留資格変更) — file the 在留資格変更許可申請 at the Regional Immigration Services Bureau before your current status lapses (~30 days)');
      immediateActions.push('Request a Certificate of Eligibility (在留資格認定証明書) from the new employer\'s HR early — delays in issuing CoE are the primary cause of status gap; you cannot legally work until the new status is approved');
      immediateActions.push('Check if you qualify for Highly Skilled Professional (HSP) status — if your points score is ≥70 (MHLW calculator at moj.go.jp), HSP provides significantly more employer flexibility than a standard work visa');
      immediateActions.push('Maintain Residence Card validity — carry it at all times and report address changes to local municipal office within 14 days to avoid compliance issues during transition');
    } else {
      immediateActions.push('Build an external pipeline NOW — your grace-period clock means offers must be in hand before any announcement');
      immediateActions.push('Consult an immigration attorney about your portability status and exact grace period rights for your visa category');
    }
    if (isGcLockIn) {
      immediateActions.push('Ask your attorney about GC priority date preservation options at alternative sponsors');
    }
  }
  if (overallVisaRisk === 'MODERATE') {
    if (isMenaSponsoredVisa) {
      immediateActions.push('Begin passive search at free-zone / multinational employers — these offer the fastest visa transfer process');
      immediateActions.push(`General guidance: ${gracePeriodDays}-day grace period after visa cancellation. Verify exact rules with your HR / a labour law specialist`);
    } else if (isGlobalExplicitVisa) {
      immediateActions.push(`Begin passive job search targeted at licensed/approved sponsors in your visa category — ${gracePeriodDays > 0 ? `${gracePeriodDays}-day grace applies` : 'no automatic grace period'}`);
      immediateActions.push('Verify exact grace period rules and sponsor-transfer process with an immigration solicitor / registered migration agent in your jurisdiction');
    } else {
      immediateActions.push('Begin passive job search (update LinkedIn, connect with 2–3 H1B-friendly employers)');
      immediateActions.push(`General guidance: grace periods run approximately ${gracePeriodDays} days from last day of employment — verify the exact figure for your visa category with an immigration attorney`);
    }
  }

  // Available options — escape paths and transition programs per visa type
  const availableOptions: string[] = [];
  if (visaStatus === 'singapore_ep') {
    availableOptions.push('Job Seeker Pass (Personalised Employment Pass): eligible EP holders earning ≥S$22,500/month can apply for a 6-month job-search pass — verify eligibility at mom.gov.sg/passes-and-permits/personalised-employment-pass before EP is cancelled');
    availableOptions.push('EntrePass: if considering entrepreneurship in Singapore, EntrePass allows stay while incorporating and demonstrating business traction');
  }
  if (visaStatus === 'uae_employment_visa') {
    availableOptions.push('2022 UAE Labour Law transfers: employer NOC requirement removed for most private sector roles under Federal Decree-Law No. 33 of 2021 — confirm with MOHRE whether your sector/contract type qualifies before assuming NOC is mandatory');
    availableOptions.push('Freelance/Remote Worker Visa: UAE Virtual Working Programme allows self-employment or remote work for foreign employers — viable bridge while seeking a new sponsored role');
  }
  if (visaStatus === 'eu_blue_card_germany') {
    availableOptions.push('§20 AufenthG 6-month job-search extension: register with Bundesagentur für Arbeit + apply at Ausländerbehörde for job-seeker permit — provides up to 6 months of authorised job-search residence');
    availableOptions.push('ALG1 unemployment benefit: if you paid into the German social insurance system, Arbeitslosengeld I is claimable at ~60–70% of prior net salary for up to 12 months — apply at your local Agentur für Arbeit');
  }
  if (visaStatus === 'eu_blue_card') {
    availableOptions.push('Germany §20 AufenthG: if you are in Germany, a 6-month job-search extension is available — apply at Ausländerbehörde; consider selecting EU Blue Card (Germany) for full guidance');
    availableOptions.push('EU long-term residence: after 5 years of Blue Card residence, EU LTR status provides employer-independent residence across EU member states');
  }
  if (visaStatus === 'canada_lmia_permit') {
    availableOptions.push('90-day Bridge Open Work Permit (BOWP): if your permit expired and you have an extension/change-of-status application pending with IRCC, maintained status gives up to 90 days — verify in your IRCC account immediately');
    availableOptions.push('LMIA-exempt transfer: CUSMA Annex 1603.D.1 covers professionals, engineers, accountants, and others — no $1,000 CAD fee and significantly faster processing than standard LMIA');
    availableOptions.push('Express Entry / PNP pathway: if your CRS score is competitive, a PR invitation eliminates LMIA dependency permanently — check monthly draw cutoffs at ircc.canada.ca');
  }
  if (visaStatus === 'japan_work_visa') {
    availableOptions.push('Highly Skilled Professional (HSP) points: if score ≥70 on MHLW calculator, HSP status grants significantly more employer flexibility and a faster PR pathway (1–3 years vs. 10 years standard)');
    availableOptions.push('Specified Skilled Worker (特定技能): if your field is in shortage sectors (manufacturing, construction, hospitality), SSW status offers broader employer options than standard work visa');
  }
  if (visaStatus === 'australia_482_tss') {
    availableOptions.push('Sponsor must transfer or the holder must depart — DIBP requires notification within 28 days of employment end; 60-day window to find new Standard Business Sponsor');
    availableOptions.push('Subclass 186 (ENS)/189 pathway: if your occupation is MLTSSL-listed and employer-sponsored 3 years are complete, apply for PR to remove sponsor dependency permanently');
  }
  if (visaStatus === 'uk_skilled_worker') {
    availableOptions.push('Employer must be a licensed UK Sponsor — check the public register at gov.uk/check-if-organisation-can-sponsor-workers before applying; unlicensed employers cannot issue a Certificate of Sponsorship');
    availableOptions.push('Indefinite Leave to Remain (ILR): after 5 years on Skilled Worker, ILR application removes employer constraint entirely — check your qualifying date now');
  }
  if (visaStatus === 'saudi_iqama') {
    availableOptions.push('نقل كفالة (Iqama transfer): under 2024 Labor Law, some employer permission requirements were eased — verify your contract type via Absher; newer contracts (2021+) have different transfer rules than older sponsored arrangements');
  }

  return {
    overallVisaRisk,
    visaType: visaStatus,
    dependencyScore,
    gracePeriodDays,
    transferWindowMonths,
    portabilityProtected,
    scoreAmplifier,
    amplifierRationale,
    keyRisks,
    immediateActions,
    availableOptions: availableOptions.length > 0 ? availableOptions : undefined,
    shouldDisplay: overallVisaRisk !== 'NONE' && overallVisaRisk !== 'LOW',
  };
}

function noRisk(): VisaRiskResult {
  return {
    overallVisaRisk: 'NONE',
    visaType: 'not_applicable',
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
