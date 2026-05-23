// endOfServiceGratuity.ts — MENA end-of-service gratuity (EOSB) calculator.
//
// PURPOSE: MENA employment law mandates a lump-sum end-of-service benefit paid
// at termination. For a 7-year UAE employee, this represents ~5.5 months of basic
// salary (≈4.1 months total-pay effective after the 0.75 conservatism adjustment)
// — a significant financial buffer that the previous runway calculation IGNORED.
//
// Effective runway for MENA users:
//   savedMonths + gratuityMonths = total cushion before financial distress
//
// EXAMPLE: UAE professional, 7 years tenure, 4 months saved
//   Without gratuity: 4 months runway → tier="critical"
//   With gratuity:    4 + 4.1 = 8.1 months → tier="comfortable"
//   The displayed urgency is fundamentally different.
//
// JURISDICTIONS COVERED:
//   - UAE (Federal Decree-Law No. 33 of 2021, Article 51)
//   - Saudi Arabia (Saudi Labor Law, Article 84)
//   - Qatar (Labour Law No. 14 of 2004, Article 54)
//   - Bahrain (Labour Law for the Private Sector 2012, Article 116)
//   - Oman (Royal Decree 35/2003, Article 39)
//   - Kuwait (Private Sector Labor Law, Article 51)
//
// LABELED: MEASURED — these are codified statutory formulas, not estimates.
// However, individual cases vary by contract type (limited vs unlimited),
// termination reason (resignation vs employer-initiated), and probation status.
// We surface this as a financial buffer estimate, not a legal commitment.

export interface GratuityRegime {
  countryCode: string;        // ISO 3166-1 alpha-2
  countryName: string;
  flagEmoji: string;
  statuteRef: string;         // legal citation for transparency
  /** Days of basic salary accrued per year of service (first tier).
   *  Used as: (tenureYears ≤ firstTierYears ? firstTierDays : firstTierDays for the first N then secondTierDays for the remainder) */
  firstTierDays: number;
  firstTierYears: number;
  /** Days of basic salary accrued per year of service after firstTierYears */
  secondTierDays: number;
  /** Minimum service period to qualify for any gratuity (months) */
  minimumServiceMonths: number;
  /** Cap on total gratuity in years of basic salary (null = no cap) */
  maxCapYears: number | null;
  notes: string;
}

/**
 * GCC + UAE end-of-service gratuity statutes (2024-2025 effective rules).
 * All formulas use BASIC salary (not allowances) per statute, but most users
 * conflate basic + total pay. We use TOTAL salary as the practical buffer estimate
 * with a -25% conservatism adjustment to bridge basic-only statutes vs lived pay.
 */
export const GRATUITY_REGIMES: Record<string, GratuityRegime> = {
  AE: {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    flagEmoji: '🇦🇪',
    statuteRef: 'Federal Decree-Law No. 33 of 2021, Article 51',
    firstTierDays: 21,    // 21 days per year for first 5 years
    firstTierYears: 5,
    secondTierDays: 30,   // 30 days per year thereafter
    minimumServiceMonths: 12,  // 1 year minimum for entitlement
    maxCapYears: 2,        // total cap: 2 years' basic salary
    notes: 'UAE: 21 days/yr for first 5 years, 30 days/yr thereafter. Capped at 2 years of basic salary. Resignation before 5 years = 1/3 (1-3yr) or 2/3 (3-5yr) of accrued gratuity. Free zones (DIFC/ADGM) have separate Employees Workplace Savings (EWS) schemes.',
  },
  SA: {
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    flagEmoji: '🇸🇦',
    statuteRef: 'Saudi Labor Law (Royal Decree M/51), Article 84',
    firstTierDays: 15,     // 0.5 month = 15 days per year for first 5 years
    firstTierYears: 5,
    secondTierDays: 30,    // 1 month = 30 days per year thereafter
    minimumServiceMonths: 24,  // 2 years minimum for full entitlement
    maxCapYears: null,
    notes: 'Saudi: half-month (15 days) per year for first 5 years, full month (30 days) per year thereafter. Resignation: 1/3 (2-5yr), 2/3 (5-10yr), full (10+yr). No cap on total.',
  },
  QA: {
    countryCode: 'QA',
    countryName: 'Qatar',
    flagEmoji: '🇶🇦',
    statuteRef: 'Qatar Labour Law No. 14 of 2004, Article 54',
    firstTierDays: 21,     // 3 weeks = 21 days per year, all years
    firstTierYears: 100,   // no tier change — flat rate throughout
    secondTierDays: 21,
    minimumServiceMonths: 12,
    maxCapYears: null,
    notes: 'Qatar: 3 weeks per year of service, flat rate (no tier breakpoint). Capped at the equivalent of 3 years total under some collective agreements.',
  },
  BH: {
    countryCode: 'BH',
    countryName: 'Bahrain',
    flagEmoji: '🇧🇭',
    statuteRef: 'Bahrain Labour Law 2012, Article 116',
    firstTierDays: 15,     // 15 days per year for first 3 years
    firstTierYears: 3,
    secondTierDays: 30,    // 1 month per year thereafter
    minimumServiceMonths: 3,   // 3 months minimum
    maxCapYears: null,
    notes: 'Bahrain: 15 days/yr for first 3 years, 30 days/yr thereafter. Available to expatriates (Bahrainis covered by GOSI social insurance).',
  },
  OM: {
    countryCode: 'OM',
    countryName: 'Oman',
    flagEmoji: '🇴🇲',
    statuteRef: 'Oman Labour Law (Royal Decree 35/2003), Article 39',
    firstTierDays: 15,     // 15 days per year for first 3 years
    firstTierYears: 3,
    secondTierDays: 30,    // 1 month per year thereafter
    minimumServiceMonths: 12,
    maxCapYears: null,
    notes: 'Oman: 15 days/yr for first 3 years, 30 days/yr thereafter. Total capped at the equivalent of 3 years basic salary in some interpretations.',
  },
  KW: {
    countryCode: 'KW',
    countryName: 'Kuwait',
    flagEmoji: '🇰🇼',
    statuteRef: 'Kuwait Private Sector Labor Law No. 6 of 2010, Article 51',
    firstTierDays: 15,     // 15 days/yr for first 5 years
    firstTierYears: 5,
    secondTierDays: 30,    // 1 month/yr thereafter
    minimumServiceMonths: 6,
    maxCapYears: 1.5,       // cap at 1.5 years of basic salary
    notes: 'Kuwait: 15 days/yr for first 5 years, 30 days/yr thereafter, capped at 1.5 years total basic salary.',
  },
};

export interface GratuityCalculation {
  countryCode: string;
  countryName: string;
  statuteRef: string;
  tenureYears: number;
  /** Total days of basic salary accrued */
  totalDaysAccrued: number;
  /** Equivalent months of basic salary (totalDays / 30) */
  gratuityMonthsBasic: number;
  /** Practical buffer estimate: gratuityMonthsBasic × 0.75 to account for basic-vs-total pay gap.
   *  Users perceive "1 month" as their gross pay; statute formulas use basic only,
   *  which is typically 60–80% of gross. 0.75 is the midpoint adjustment. */
  effectiveBufferMonths: number;
  /** Cap applied? */
  cappedByStatute: boolean;
  /** Disclosure text for the runway narrative */
  disclosureText: string;
  notes: string;
  labeledAs: 'MEASURED';
}

/** Resolve a country code to its gratuity regime (returns null if not MENA-covered). */
export function resolveGratuityRegime(countryCode: string | null | undefined): GratuityRegime | null {
  if (!countryCode) return null;
  return GRATUITY_REGIMES[countryCode.toUpperCase().trim()] ?? null;
}

/**
 * Compute end-of-service gratuity for a tenure + country combination.
 * Returns null when the country has no statutory gratuity regime
 * (e.g., US, UK, India — these use different severance models).
 */
export function computeGratuity(
  countryCode: string | null | undefined,
  tenureYears: number,
): GratuityCalculation | null {
  const regime = resolveGratuityRegime(countryCode);
  if (!regime) return null;

  // Service minimum not met → no gratuity
  if (tenureYears * 12 < regime.minimumServiceMonths) {
    return {
      countryCode: regime.countryCode,
      countryName: regime.countryName,
      statuteRef: regime.statuteRef,
      tenureYears,
      totalDaysAccrued: 0,
      gratuityMonthsBasic: 0,
      effectiveBufferMonths: 0,
      cappedByStatute: false,
      disclosureText: `Below minimum service period (${regime.minimumServiceMonths} months required in ${regime.countryName}) — no gratuity accrued yet.`,
      notes: regime.notes,
      labeledAs: 'MEASURED',
    };
  }

  // Tiered calculation
  let totalDays: number;
  if (tenureYears <= regime.firstTierYears) {
    totalDays = tenureYears * regime.firstTierDays;
  } else {
    const firstTierTotal = regime.firstTierYears * regime.firstTierDays;
    const remainingYears = tenureYears - regime.firstTierYears;
    totalDays = firstTierTotal + (remainingYears * regime.secondTierDays);
  }

  // Apply statutory cap if any
  const capDays = regime.maxCapYears != null ? regime.maxCapYears * 365 : Infinity;
  const cappedByStatute = totalDays > capDays;
  const cappedDays = Math.min(totalDays, capDays);

  // Convert days of basic salary → months of basic salary
  const gratuityMonthsBasic = cappedDays / 30;

  // Practical buffer estimate (basic salary is typically 60–80% of gross pay).
  // The 0.75 factor converts statute-derived basic-pay months into total-pay-equivalent
  // months — what the user actually perceives as runway buffer.
  const effectiveBufferMonths = Math.round(gratuityMonthsBasic * 0.75 * 10) / 10;

  const tierLabel = tenureYears <= regime.firstTierYears
    ? `${regime.firstTierDays} days/yr × ${tenureYears} yr`
    : `${regime.firstTierDays} days/yr × ${regime.firstTierYears} yr + ${regime.secondTierDays} days/yr × ${(tenureYears - regime.firstTierYears).toFixed(1)} yr`;

  const disclosureText = cappedByStatute
    ? `${regime.flagEmoji} ${regime.countryName} end-of-service gratuity: ${tierLabel} = ${totalDays.toFixed(0)} days (capped at ${capDays} days = ${regime.maxCapYears} years basic salary). Effective buffer ≈ ${effectiveBufferMonths.toFixed(1)} months of total pay.`
    : `${regime.flagEmoji} ${regime.countryName} end-of-service gratuity: ${tierLabel} = ${totalDays.toFixed(0)} days of basic salary ≈ ${gratuityMonthsBasic.toFixed(1)} months basic / ${effectiveBufferMonths.toFixed(1)} months total-pay equivalent.`;

  return {
    countryCode: regime.countryCode,
    countryName: regime.countryName,
    statuteRef: regime.statuteRef,
    tenureYears,
    totalDaysAccrued: Math.round(cappedDays),
    gratuityMonthsBasic: Math.round(gratuityMonthsBasic * 10) / 10,
    effectiveBufferMonths,
    cappedByStatute,
    disclosureText,
    notes: regime.notes,
    labeledAs: 'MEASURED',
  };
}

/** Helper: returns just the effective buffer months (0 when no MENA regime applies). */
export function computeGratuityMonths(
  countryCode: string | null | undefined,
  tenureYears: number,
): number {
  return computeGratuity(countryCode, tenureYears)?.effectiveBufferMonths ?? 0;
}

/**
 * Derive the ISO-3166-1 alpha-2 country code from a user's visa status.
 * Returns null when the visa type is non-MENA, ambiguous (gcc_sponsored), or absent.
 *
 * Use this to resolve the gratuity country for expatriates whose employer's
 * registered region (companyData.region) differs from the country where they
 * actually work and have accrued statutory end-of-service entitlements.
 *
 * Example: an Indian engineer on a UAE employment visa working at a Bangalore-
 * headquartered company would get companyData.region='IN' (no gratuity) unless
 * we check visaStatus first and see 'uae_employment_visa' → 'AE'.
 */
export function resolveGratuityCountryFromVisa(
  visaStatus: string | null | undefined,
): string | null {
  if (!visaStatus) return null;
  switch (visaStatus) {
    case 'uae_employment_visa':
    case 'uae_golden_visa':
      return 'AE';
    case 'saudi_iqama':
      return 'SA';
    case 'qatar_work_permit':
      return 'QA';
    case 'kuwait_work_permit':
      return 'KW';
    // gcc_sponsored: country ambiguous — fall back to companyData.region
    default:
      return null;
  }
}
