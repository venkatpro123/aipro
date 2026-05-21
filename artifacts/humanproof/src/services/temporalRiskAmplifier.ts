// temporalRiskAmplifier.ts
// Adds time-dimension intelligence to the layoff risk score.
//
// The current scoring engine produces a "right now" risk snapshot, but layoffs
// cluster heavily around predictable calendar events:
//   - Q1 (Jan–Mar): Post-bonus season, budget resets, "new year" restructurings
//   - Post-earnings (Oct–Nov for Q3 releases, Jan–Feb for Q4): Guidance misses trigger cuts
//   - India IT: Q4 (Jan–Mar) bench resets; Q2 (Jul–Sep) offshore demand cycle
//   - Pre-fiscal-year-end: Budget freeze + headcount justification season
//
// This engine answers: "Is your risk elevated RIGHT NOW due to calendar factors?"
// and provides a 12-month risk calendar showing the user's peak risk windows.
//
// DESIGN: Pure deterministic — zero API calls. All timing is derived from
// referenceDate + companyData + region. Fully reproducible for a given date.

import type { CompanyData } from '../data/companyDatabase';
import {
  getEmploymentProtectionRegime,
  computeEffectiveProtectionDays,
  isLargeLayoff,
  type EmploymentProtectionRegime,
} from '../data/employmentProtectionLaw';

// ─── Employment Protection Index ─────────────────────────────────────────────
//
// Encodes employment law strength per jurisdiction as a scalar 0–1.
// Used to compute the adjusted displacement timeline:
//   adjusted_timeline = base_timeline × (1 + PROTECTION_INDEX × 0.6)
//
// Derivation:
//   0.10 (US)  — at-will. No mandatory notice; WARN Act applies only to very
//                large cuts (50+). Effective protection: 0–14 days.
//   0.35 (SG)  — Employment Act. 1–4 weeks notice by tenure. No mass-layoff advance
//                notice. MOM retrenchment guidelines are advisory, not statutory.
//   0.40 (CA)  — Provincial Employment Standards. 1–8 weeks (Ontario/BC). Group
//                termination notice (CLC §212): 8–16 weeks for 50+ workers.
//   0.45 (UK)  — ERA 1996 + TULRCA 1992. Statutory redundancy pay; 30–45 day
//                collective consultation; 1 week/year notice (max 12 weeks).
//   0.45 (AU)  — Fair Work Act. Redundancy pay 4–16 weeks; notice 1–4 weeks.
//   0.55 (IN)  — IDA 1947. Chapter V-B government permission (100+ workers).
//                Workmen: 3 months notice + retrenchment compensation. Managerial
//                employees governed by contract (typically 1–3 months).
//   0.65 (NL)  — Wwz. UWV permission required before dismissal notice; 1–4 months
//                statutory notice. Transitievergoeding mandatory.
//   0.75 (DE)  — KSchG + BetrVG. Betriebsrat consultation required on EVERY
//                termination. Mass dismissals: BA notification (30-day wait) +
//                Sozialplan. Notice: 4 weeks → 7 months (§622 BGB).
//   0.80 (FR)  — Code du Travail. PSE mandatory for 10+ redundancies (50+employee
//                companies). DREETS validation (4 months) or collective agreement
//                (2 months). Préavis 1–3 months.
//
// Extension formula: extensionPct = PROTECTION_INDEX × 60
//   Germany (0.75): 0.75 × 60 = 45% timeline extension vs at-will baseline
//   France  (0.80): 0.80 × 60 = 48% timeline extension
//   UK      (0.45): 0.45 × 60 = 27% timeline extension
//   Singapore(0.35):0.35 × 60 = 21% timeline extension
//   US      (0.10): 0.10 × 60 =  6% (near-zero; WARN Act only for large sites)
//
// LABELED: ESTIMATED — calibrated against documented labor law provisions.
// Individual outcomes vary by collective agreement, tenure, company size, and
// sector-specific regulations.

export const EMPLOYMENT_PROTECTION_INDEX: Record<string, number> = {
  // At-will baseline
  US:  0.10,
  // Moderate protection
  SG:  0.35,
  CA:  0.40,
  UK:  0.45,
  GB:  0.45,  // alias for UK
  AU:  0.45,
  // Stronger protection
  IN:  0.55,
  NL:  0.65,
  // High protection (EU continental)
  DE:  0.75,
  AT:  0.72,  // Austria: similar Handelsregister regime to Germany
  SE:  0.70,  // Sweden: LAS strict LIFO + MBL union negotiation
  CH:  0.68,  // Switzerland: similar to Germany, cantonal variation
  BE:  0.72,  // Belgium: C4/C3 dismissal docs, strong collective agreements
  NO:  0.68,  // Norway: strong union agreements
  DK:  0.62,  // Denmark: Flexicurity — easier to fire, generous welfare
  FI:  0.65,  // Finland: Co-operation Act consultation
  ES:  0.62,  // Spain: ERE procedure (30-day consultation)
  IT:  0.68,  // Italy: CIGS temporary layoff mechanism
  PT:  0.60,
  PL:  0.58,
  // Very high (France)
  FR:  0.80,
  // MENA / APAC
  AE:  0.30,  // UAE: Employment Visa — 30-day grace period post-termination
  JP:  0.65,  // Japan: lifetime employment culture; de-facto very hard to dismiss
  KR:  0.62,  // South Korea: LBA consultation required for mass redundancy
  CN:  0.58,  // China: Labor Contract Law — significant severance requirements
  SG_EP: 0.35, // Singapore EP/S-Pass — same as SG for computation
  // LatAm
  BR:  0.55,  // Brazil: CLT — 30–90 day notice, FGTS fund
  MX:  0.52,  // Mexico: LFT — 3 months + 20 days/year severance
  CO:  0.48,
  AR:  0.52,
  // Default for unknown jurisdictions
  DEFAULT: 0.35,  // conservative mid-point (moderate protection)
};

/** Resolve the protection index for a region code. Falls back gracefully. */
function resolveProtectionIndex(normRegion: string): number {
  return EMPLOYMENT_PROTECTION_INDEX[normRegion]
    ?? EMPLOYMENT_PROTECTION_INDEX.DEFAULT;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export type RiskWindow =
  | 'earnings_pre_announcement'
  | 'post_earnings_guidance_miss'
  | 'q1_budget_reset'
  | 'annual_review_cycle'
  | 'india_q4_bench_reset'
  | 'india_q2_offshore_demand'
  | 'post_bonus_season'
  | 'fiscal_year_end'
  | 'none';

export interface MonthlyRiskEntry {
  month: number;            // 1–12
  monthLabel: string;       // "Jan 2027"
  baseAmplifier: number;    // 1.0 = no amplification; 1.2 = +20% on current score
  activeWindows: RiskWindow[];
  primaryReason: string | null;
}

/** Employment protection legal timeline — how long after announcement until last day.
 *  This is a DISTINCT concept from the risk calendar (which shows when announcement
 *  is most likely). Together they give: announcement timing + legal runway = full picture.
 *
 *  LABELED: ESTIMATED — derived from published labor law. Individual cases vary by
 *  collective agreement, tenure, and specific company size. */
export interface LegalTimelineResult {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  regime: string;
  governanceBody: string;
  /** Is this computed as a large layoff (collective rules apply)? */
  isLargeLayoff: boolean;
  /** Estimated days from layoff announcement to last working day */
  estimatedProtectionDays: { min: number; max: number };
  /** Extra days vs US at-will baseline — the "effective time advantage" */
  extensionVsUSBaselineDays: { min: number; max: number };
  isGovernmentApprovalRequired: boolean;
  hasMandatorySocialPlan: boolean;
  labeledAs: 'MEASURED' | 'MODELED' | 'ESTIMATED';
  /** Timeline components (notice, consultation, government process) */
  components: Array<{
    label: string;
    daysMin: number;
    daysMax: number;
    isOptional: boolean;
    triggerNote?: string;
  }>;
  protectionSummary: string;
  disclosureNarrative: string;
  workerActions: string[];
}

/** Employment protection buffer — how much legal protection strength extends the
 *  displacement timeline vs the at-will (US) baseline.
 *
 *  Formula: adjusted_timeline = base_timeline × (1 + protectionIndex × 0.6)
 *  Extension percentage: protectionIndex × 60 (e.g. Germany 0.75 → 45%)
 *
 *  LABELED: ESTIMATED — computed from EMPLOYMENT_PROTECTION_INDEX which is
 *  calibrated against published labor law provisions. */
export interface ProtectionBufferResult {
  /** ISO country code resolved for this computation */
  countryCode: string;
  /** Protection index 0–1 (0=at-will, 1=maximum protection) */
  protectionIndex: number;
  /** Percentage by which legal protection extends the displacement timeline
   *  vs the at-will (US) baseline: protectionIndex × 60 */
  timelineExtensionPct: number;
  /** Multiplier applied to base_timeline: 1 + protectionIndex × 0.6 */
  timelineMultiplier: number;
  /** Concise user-facing narrative for the Transparency Tab / OverviewTab */
  protectionNarrative: string;
  /** True when extension is material (>10%) and warrants UI surface */
  isMateriallyProtected: boolean;
  readonly labeledAs: 'ESTIMATED';
}

export interface TemporalRiskResult {
  currentAmplifier: number;         // today's temporal amplifier (1.0 = flat)
  amplifiedScore: number;           // score × currentAmplifier, capped at 99
  activeWindowsToday: RiskWindow[];
  currentWindowReason: string | null;
  peakRiskMonth: string;            // e.g. "October 2026"
  peakAmplifier: number;            // highest amplifier across next 12 months
  riskCalendar: MonthlyRiskEntry[]; // next 12 months, ordered
  nextDangerWindow: {
    windowType: RiskWindow;
    startsInDays: number;
    label: string;
  } | null;
  safeWindows: string[];            // months with amplifier < 1.0 (best time to negotiate)
  confidenceNote: string | null;
  /** Country-specific employment protection legal timeline.
   *  Present when companyData.region maps to a known jurisdiction.
   *  Absent for unknown regions or US (which is the at-will baseline).
   *  LABELED: ESTIMATED — varies by collective agreement, tenure, company size. */
  legalTimeline?: LegalTimelineResult;
  /** Employment protection buffer — extends displacement timeline by protection strength.
   *  Always present. Extension is near-zero for US (at-will) and up to 48% for France. */
  protectionBuffer: ProtectionBufferResult;
}

// ─── Earnings calendar for major public companies ─────────────────────────────
// Months when quarterly earnings are typically reported (0-indexed).
// These are when guidance misses trigger immediate workforce cuts.

const EARNINGS_MONTHS: Record<string, number[]> = {
  // US Tech (fiscal year = calendar year, report ~6 weeks after Q end)
  'google':     [1, 4, 7, 10],   // Feb, May, Aug, Nov
  'alphabet':   [1, 4, 7, 10],
  'microsoft':  [1, 4, 7, 10],
  'amazon':     [1, 4, 7, 10],
  'meta':       [1, 4, 7, 10],
  'apple':      [1, 4, 7, 10],
  'netflix':    [0, 3, 6, 9],    // Jan, Apr, Jul, Oct
  'salesforce': [2, 5, 8, 11],   // Mar, Jun, Sep, Dec (FY ends Jan)
  'oracle':     [2, 5, 8, 11],

  // India IT (fiscal year = Apr–Mar, report quarterly after each quarter end)
  'infosys':    [3, 6, 9, 0],    // Apr, Jul, Oct, Jan
  'tcs':        [3, 6, 9, 0],
  'wipro':      [3, 6, 9, 0],
  'hcl':        [3, 6, 9, 0],
  'tech mahindra': [3, 6, 9, 0],
  'ltimindtree':   [3, 6, 9, 0],
};

// ─── Seasonal risk patterns ───────────────────────────────────────────────────

interface SeasonalPattern {
  months: number[];         // 0-indexed months (0=Jan, 11=Dec)
  amplifier: number;        // risk multiplier during these months
  window: RiskWindow;
  label: string;
}

const GLOBAL_SEASONAL_PATTERNS: SeasonalPattern[] = [
  {
    months: [0, 1, 2],      // Jan–Mar
    amplifier: 1.18,
    window: 'q1_budget_reset',
    label: 'Q1 budget reset — companies execute workforce plans set in November board meetings',
  },
  {
    months: [0, 1],         // Jan–Feb
    amplifier: 1.12,
    window: 'post_bonus_season',
    label: 'Post-bonus departure window — companies cut after bonus vesting to avoid paying out',
  },
  {
    months: [9, 10],        // Oct–Nov
    amplifier: 1.10,
    window: 'annual_review_cycle',
    label: 'Annual performance review cycle — rating-driven exits accelerate in Q4',
  },
  {
    months: [11],            // Dec
    amplifier: 0.82,
    window: 'none',
    label: 'Holiday hiring freeze — few layoffs announced in December (reputational cost)',
  },
];

const INDIA_SEASONAL_PATTERNS: SeasonalPattern[] = [
  {
    months: [0, 1, 2],      // Jan–Mar (India Q4 = Jan–Mar)
    amplifier: 1.22,
    window: 'india_q4_bench_reset',
    label: 'India IT Q4 (Jan–Mar) — bench review, project completions, and margin pressure peak before fiscal year close',
  },
  {
    months: [6, 7, 8],      // Jul–Sep (India Q2)
    amplifier: 1.08,
    window: 'india_q2_offshore_demand',
    label: 'India Q2 offshore demand cycle — US client budget resets flow to India in Q3, but misses hit GCC headcount by Sep',
  },
  {
    months: [3],             // Apr
    amplifier: 0.78,
    window: 'none',
    label: 'India fiscal new year (April) — fresh headcount approvals, lowest layoff probability',
  },
];

// ─── Employment protection buffer computation ────────────────────────────────

function computeProtectionBuffer(normRegion: string): ProtectionBufferResult {
  const protectionIndex = resolveProtectionIndex(normRegion);
  const timelineExtensionPct = Math.round(protectionIndex * 60);      // 0.75 → 45
  const timelineMultiplier   = Math.round((1 + protectionIndex * 0.6) * 100) / 100; // 1.45

  // US baseline index is 0.10 → 6% extension (near-zero)
  // Any country above 0.20 has material protection worth surfacing
  const isMateriallyProtected = protectionIndex > 0.20;

  // Build the user-facing narrative
  let protectionNarrative: string;
  const countryName = getCountryNameForRegion(normRegion);

  if (protectionIndex <= 0.12) {
    protectionNarrative =
      `${countryName} employment law provides minimal advance protection ` +
      `(${timelineExtensionPct}% above at-will baseline). ` +
      `Treat announcement and last day as close together unless your contract specifies otherwise.`;
  } else if (protectionIndex <= 0.45) {
    protectionNarrative =
      `Legal protection buffer: ${countryName} employment law extends your effective ` +
      `timeline by ~${timelineExtensionPct}% vs the at-will baseline. ` +
      `Statutory notice + consultation gives you measurable preparation runway after any announcement.`;
  } else {
    protectionNarrative =
      `Legal protection buffer: ${countryName} employment law extends your effective ` +
      `timeline by ~${timelineExtensionPct}% vs the global at-will baseline. ` +
      `Strong procedural protections (consultation, government approval, social plan obligations) ` +
      `mean announcement and last day are separated by months — use this window actively.`;
  }

  return {
    countryCode:           normRegion,
    protectionIndex,
    timelineExtensionPct,
    timelineMultiplier,
    protectionNarrative,
    isMateriallyProtected,
    labeledAs:             'ESTIMATED',
  };
}

function getCountryNameForRegion(normRegion: string): string {
  const NAMES: Record<string, string> = {
    US: 'US (at-will)', GB: 'UK', DE: 'Germany', FR: 'France',
    NL: 'Netherlands', IN: 'India', SG: 'Singapore', CA: 'Canada',
    AU: 'Australia', JP: 'Japan', AE: 'UAE', SE: 'Sweden', IT: 'Italy',
    ES: 'Spain', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria',
    NO: 'Norway', DK: 'Denmark', FI: 'Finland', BR: 'Brazil', MX: 'Mexico',
    KR: 'South Korea', CN: 'China', PL: 'Poland', PT: 'Portugal', IE: 'Ireland',
  };
  return NAMES[normRegion] ?? normRegion;
}

// ─── Legal timeline computation ──────────────────────────────────────────────
//
// Computes the employment protection window for the user's country.
// This answers "after announcement, how long before my last day?" — completely
// separate from the risk calendar which answers "when is announcement risk highest?"
//
// Example — same risk score, fundamentally different actual timelines:
//   US SWE (Amazon):  announcement → 0-60 days (WARN Act) → last day
//   DE SWE (SAP):     announcement → 90-180 days (Betriebsrat + Sozialplan) → last day
//   → German worker has effectively 60-80% more time to prepare.

function computeLegalTimeline(
  companyData: CompanyData,
  normRegion: string,
): LegalTimelineResult | undefined {
  // Use the region field as the country code (already ISO 2-letter for most records)
  const countryCode = normRegion;
  const regime = getEmploymentProtectionRegime(countryCode);
  if (!regime) return undefined;

  const largeCut = isLargeLayoff(regime, companyData.employeeCount);
  const protectionDays = computeEffectiveProtectionDays(regime, companyData.employeeCount);

  // Build component list: always-on components + large-cut additional components (if applicable)
  const components = [
    ...regime.smallCutComponents.map(c => ({
      label: c.label,
      daysMin: c.daysMin,
      daysMax: c.daysMax,
      isOptional: c.isOptional,
      triggerNote: c.triggerNote,
    })),
    ...(largeCut ? regime.largeCutAdditionalComponents.map(c => ({
      label: c.label,
      daysMin: c.daysMin,
      daysMax: c.daysMax,
      isOptional: c.isOptional,
      triggerNote: c.triggerNote,
    })) : []),
  ];

  return {
    countryCode: regime.countryCode,
    countryName: regime.countryName,
    flagEmoji: regime.flagEmoji,
    regime: regime.regime,
    governanceBody: regime.governanceBody,
    isLargeLayoff: largeCut,
    estimatedProtectionDays: protectionDays,
    extensionVsUSBaselineDays: regime.extensionVsUSBaselineDays,
    isGovernmentApprovalRequired: regime.isGovernmentApprovalRequired,
    hasMandatorySocialPlan: regime.hasMandatorySocialPlan,
    labeledAs: regime.labeledAs,
    components,
    protectionSummary: regime.protectionSummary,
    disclosureNarrative: regime.disclosureNarrative,
    workerActions: regime.workerActions,
  };
}

// ─── Main computation ─────────────────────────────────────────────────────────

export interface TemporalAmplifierInputs {
  currentScore: number;
  companyData: CompanyData;
  region: string;
  referenceDate?: Date;     // defaults to today; injectable for testing
}

export function computeTemporalRisk(inputs: TemporalAmplifierInputs): TemporalRiskResult {
  const ref = inputs.referenceDate ?? new Date();
  const currentMonth = ref.getMonth();           // 0-indexed
  const currentDay = ref.getDate();

  const companyNameLower = inputs.companyData.name.toLowerCase();
  const normRegion = inputs.region.trim().toUpperCase();
  const isIndia = normRegion === 'IN' || normRegion === 'INDIA';
  const isPublic = inputs.companyData.isPublic;

  // ── Build 12-month risk calendar ─────────────────────────────────────────
  const riskCalendar: MonthlyRiskEntry[] = [];
  for (let i = 0; i < 12; i++) {
    const calMonth = (currentMonth + i) % 12;
    const calYear = ref.getFullYear() + Math.floor((currentMonth + i) / 12);
    const entry = buildMonthEntry(
      calMonth,
      calYear,
      companyNameLower,
      isIndia,
      isPublic,
      inputs.companyData,
    );
    riskCalendar.push(entry);
  }

  // ── Today's amplifier ─────────────────────────────────────────────────────
  const todayEntry = riskCalendar[0]; // first entry = current month
  let currentAmplifier = todayEntry.baseAmplifier;

  // Additional day-of-month signal: first 2 weeks of month have higher execution risk
  // because layoff announcements are scheduled for Monday mornings, first weeks
  if (currentDay <= 14 && currentAmplifier > 1.0) {
    currentAmplifier = Math.min(1.35, currentAmplifier * 1.08);
  }

  const amplifiedScore = Math.min(99, Math.round(inputs.currentScore * currentAmplifier));

  // ── Find peak risk month ──────────────────────────────────────────────────
  const peakEntry = [...riskCalendar].sort((a, b) => b.baseAmplifier - a.baseAmplifier)[0];
  const peakRiskMonth = peakEntry.monthLabel;
  const peakAmplifier = peakEntry.baseAmplifier;

  // ── Next danger window ─────────────────────────────────────────────────────
  const nextDanger = findNextDangerWindow(riskCalendar, ref, currentAmplifier);

  // ── Safe windows (best months to negotiate, not be cut) ──────────────────
  const safeWindows = riskCalendar
    .filter(e => e.baseAmplifier < 0.92)
    .map(e => e.monthLabel);

  // ── Current window reason ─────────────────────────────────────────────────
  const currentWindowReason = todayEntry.primaryReason;
  const activeWindowsToday = todayEntry.activeWindows;

  // Legal timeline: country-specific employment protection window.
  // Uses the region already passed in (ISO country code like 'DE', 'FR', 'GB').
  const legalTimeline = computeLegalTimeline(inputs.companyData, normRegion);

  // Protection buffer: EMPLOYMENT_PROTECTION_INDEX × 0.6 → timeline extension.
  // Always computed (US gets 6%, France gets 48%). Used in OverviewTab panel.
  const protectionBuffer = computeProtectionBuffer(normRegion);

  return {
    currentAmplifier: Math.round(currentAmplifier * 100) / 100,
    amplifiedScore,
    activeWindowsToday,
    currentWindowReason,
    peakRiskMonth,
    peakAmplifier: Math.round(peakAmplifier * 100) / 100,
    riskCalendar,
    nextDangerWindow: nextDanger,
    safeWindows,
    confidenceNote: buildConfidenceNote(isPublic, companyNameLower),
    legalTimeline,
    protectionBuffer,
  };
}

// ─── Month entry builder ──────────────────────────────────────────────────────

function buildMonthEntry(
  month: number,
  year: number,
  companyName: string,
  isIndia: boolean,
  isPublic: boolean,
  companyData: CompanyData,
): MonthlyRiskEntry {
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  let amplifier = 1.0;
  const activeWindows: RiskWindow[] = [];
  const reasons: string[] = [];

  // ── Global seasonal patterns ──────────────────────────────────────────────
  for (const pattern of GLOBAL_SEASONAL_PATTERNS) {
    if (pattern.months.includes(month)) {
      amplifier = Math.max(amplifier, pattern.amplifier);
      if (pattern.window !== 'none') activeWindows.push(pattern.window);
      if (pattern.amplifier !== 1.0) reasons.push(pattern.label);
    }
  }

  // ── India-specific patterns ───────────────────────────────────────────────
  if (isIndia) {
    for (const pattern of INDIA_SEASONAL_PATTERNS) {
      if (pattern.months.includes(month)) {
        amplifier = Math.max(amplifier, pattern.amplifier);
        if (pattern.window !== 'none') activeWindows.push(pattern.window);
        if (pattern.amplifier !== 1.0) reasons.push(pattern.label);
      }
    }
  }

  // ── Earnings-season amplification for public companies ────────────────────
  if (isPublic) {
    const earningsMonths = lookupEarningsMonths(companyName);
    // Earnings are announced in month M; the pre-announcement risk peaks in M-1
    // (layoffs often pre-empt earnings to show cost discipline)
    const preEarningsMonths = earningsMonths.map(m => (m - 1 + 12) % 12);
    if (preEarningsMonths.includes(month)) {
      const earningsAmp = 1.15;
      amplifier = Math.max(amplifier, earningsAmp);
      activeWindows.push('earnings_pre_announcement');
      reasons.push(`Pre-earnings restructuring window — companies frequently announce layoffs before earnings calls to signal cost discipline`);
    }
    if (earningsMonths.includes(month)) {
      // Post-earnings guidance miss window — if guidance is missed, cuts happen fast
      const postEarningsAmp = 1.08;
      amplifier = Math.max(amplifier, postEarningsAmp);
      activeWindows.push('post_earnings_guidance_miss');
      reasons.push(`Earnings release month — guidance misses trigger immediate workforce actions`);
    }
  }

  // ── Fiscal year-end cutoff (company-specific) ─────────────────────────────
  // Skip December (month 11) for calendar-year companies: the holiday dampener (0.82)
  // is correct — companies do NOT execute cuts in December despite it being fiscal
  // year-end. Restructuring decisions made in Oct/Nov are executed in January.
  // India FY end (March, month 2) is already covered by india_q4_bench_reset; do not
  // double-amplify unless the result would be higher than the India pattern.
  const fiscalYearEnd = getFiscalYearEndMonth(companyName, isIndia);
  const isDecemberFYEnd = fiscalYearEnd === 11 && month === 11;
  if (month === fiscalYearEnd && !isDecemberFYEnd) {
    amplifier = Math.max(amplifier, 1.12);
    activeWindows.push('fiscal_year_end');
    reasons.push(`Fiscal year-end — headcount justification deadlines accelerate restructuring decisions`);
  }

  // ── Apply decay: if multiple high-risk factors layer, cap at 1.35 ─────────
  amplifier = Math.min(1.35, amplifier);

  return {
    month: month + 1,       // 1-indexed for UI
    monthLabel,
    baseAmplifier: Math.round(amplifier * 100) / 100,
    activeWindows: [...new Set(activeWindows)],
    primaryReason: reasons.length > 0 ? reasons[0] : null,
  };
}

// ─── Next danger window ───────────────────────────────────────────────────────

function findNextDangerWindow(
  calendar: MonthlyRiskEntry[],
  referenceDate: Date,
  currentAmplifier: number,
): TemporalRiskResult['nextDangerWindow'] {
  // Skip current month if we're already in a danger window
  const startIdx = currentAmplifier >= 1.10 ? 1 : 0;

  for (let i = startIdx; i < calendar.length; i++) {
    const entry = calendar[i];
    if (entry.baseAmplifier >= 1.10) {
      const daysUntil = i === 0 ? 0 : computeDaysUntilMonth(referenceDate, i);
      const topWindow = entry.activeWindows[0] ?? 'q1_budget_reset';
      return {
        windowType: topWindow,
        startsInDays: daysUntil,
        label: entry.primaryReason ?? WINDOW_LABELS[topWindow] ?? 'Seasonal risk window',
      };
    }
  }
  return null;
}

function computeDaysUntilMonth(referenceDate: Date, monthsAhead: number): number {
  const target = new Date(referenceDate);
  target.setMonth(target.getMonth() + monthsAhead, 1); // first of that month
  return Math.round((target.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

function lookupEarningsMonths(companyName: string): number[] {
  const lower = companyName.toLowerCase();
  for (const [key, months] of Object.entries(EARNINGS_MONTHS)) {
    if (lower.includes(key)) return months;
  }
  // Generic public company: assume calendar-year quarterly reporter (Feb, May, Aug, Nov)
  return [1, 4, 7, 10];
}

function getFiscalYearEndMonth(companyName: string, isIndia: boolean): number {
  if (isIndia) return 2; // India FY ends March (month 2, 0-indexed)
  const lower = companyName.toLowerCase();
  if (lower.includes('salesforce') || lower.includes('oracle')) return 0; // Jan FY end
  if (lower.includes('microsoft') || lower.includes('adobe')) return 5;   // Jun FY end
  return 11; // Dec (calendar year) — most common for US tech
}

function buildConfidenceNote(isPublic: boolean, companyName: string): string | null {
  if (!isPublic) {
    return 'Temporal amplifiers are based on industry seasonal patterns only — earnings calendar unavailable for private companies.';
  }
  const knownCompany = Object.keys(EARNINGS_MONTHS).some(k => companyName.includes(k));
  if (!knownCompany) {
    return 'Exact earnings dates not in database — using generic quarterly reporter schedule (Feb/May/Aug/Nov). Verify your company\'s actual earnings calendar.';
  }
  return null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WINDOW_LABELS: Record<RiskWindow, string> = {
  earnings_pre_announcement: 'Pre-earnings restructuring window',
  post_earnings_guidance_miss: 'Post-earnings guidance miss risk',
  q1_budget_reset: 'Q1 budget reset — new fiscal year workforce actions',
  annual_review_cycle: 'Annual review cycle — performance exits accelerate',
  india_q4_bench_reset: 'India IT Q4 bench reset (Jan–Mar)',
  india_q2_offshore_demand: 'India Q2 offshore demand shift (Jul–Sep)',
  post_bonus_season: 'Post-bonus departure window',
  fiscal_year_end: 'Fiscal year-end restructuring',
  none: '',
};
