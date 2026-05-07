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
