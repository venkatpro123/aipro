// personalizedTimelineService.ts — Layer 49 (v17.0)
// Generates a personalized "you need to act by" date and milestone plan by
// crossing financial runway × risk trajectory × role market demand × WARN deadline.

export interface TimelineMilestone {
  date: string;
  action: string;
  rationale: string;
  isDeadline: boolean;
}

export type UrgencyCategory = 'IMMEDIATE' | 'WEEKS' | 'MONTHS' | 'COMFORTABLE';

export interface PersonalizedTimelineResult {
  criticalByDate: string | null;
  bufferWeeks: number;
  urgencyCategory: UrgencyCategory;
  milestones: TimelineMilestone[];
  runwayNarrative: string;
  marketTimingNote: string;
}

export interface PersonalizedTimelineInput {
  currentScore: number;
  runwayMonths: number | null;
  runwaySituation: string | null;
  jobSearchRunwayWeeks: number;
  velocityPtsPerMonth?: number;
  warnEffectiveDate?: string | null;
  today?: string;

  // ── v48.0 personalization signals ──────────────────────────────────────────
  /** Post-layoff visa grace period in days (e.g., 60 for H-1B, 30 for Singapore EP) */
  visaGracePeriodDays?: number | null;
  /** Days until next equity vesting cliff or scheduled vest */
  daysToNextVest?: number | null;
  /** USD value of the upcoming vest event (influences hold-vs-exit decision) */
  nextVestValueUsd?: number | null;
  /** Family dependents flag — amplifies urgency tier and emergency fund target */
  hasDependents?: boolean;
  /** ISO-3166-1 alpha-2 region code for regional market timing notes */
  region?: string;
  /** Seniority level — affects buffer calculation and narrative framing */
  seniority?: 'junior' | 'mid' | 'senior' | 'staff' | 'exec';
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addWeeks(dateStr: string, weeks: number): string {
  return addDays(dateStr, Math.round(weeks * 7));
}

function formatHumanDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function weeksUntilScore80(currentScore: number, velocityPtsPerMonth: number): number | null {
  if (velocityPtsPerMonth <= 0 || currentScore >= 80) return null;
  const ptsNeeded = 80 - currentScore;
  const monthsNeeded = ptsNeeded / velocityPtsPerMonth;
  return Math.round(monthsNeeded * 4.33);
}

/** Regional market timing notes for major hiring markets */
const REGIONAL_MARKET_NOTES: Record<string, string> = {
  IN:  'Indian hiring markets peak in Jan–Mar and Jul–Sep. Avoid Q4 (Oct–Dec) for major job launches when budgets are frozen.',
  US:  'US hiring peaks Jan–Mar (new budgets) and Sep–Oct (Q4 pushes). Avoid Nov–Dec (holiday freeze) for active searches.',
  UK:  'UK market peaks Sep–Nov and Jan–Feb. Budget freeze common Jun–Jul and Dec.',
  SG:  'Singapore peaks Jan–Apr post-Chinese New Year and Aug–Sep. Government hiring surges mid-year.',
  AU:  'Australia peaks Feb–May (post-summer) and Aug–Oct. Financial year starts Jul — new budgets release headcount.',
  DE:  'German market peaks Sep–Nov and Jan–Mar. Summer (Jul–Aug) sees significantly reduced activity.',
  CA:  'Canadian market peaks Jan–Mar (post-holidays) and Sep–Oct. Summer and Dec–Jan slow considerably.',
  AE:  'UAE peaks Sep–Jan (post-summer, pre-Ramadan). Ramadan and summer are significantly slower.',
};

export function computePersonalizedTimeline(input: PersonalizedTimelineInput): PersonalizedTimelineResult {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const {
    currentScore,
    runwayMonths,
    runwaySituation,
    jobSearchRunwayWeeks,
    velocityPtsPerMonth = 0,
    warnEffectiveDate,
    visaGracePeriodDays,
    daysToNextVest,
    nextVestValueUsd,
    hasDependents,
    region,
    seniority,
  } = input;

  const candidateBuffers: { weeks: number; source: string; isDeadline: boolean }[] = [];

  // Buffer 1: Financial runway (how long can user afford to not have income)
  if (runwayMonths !== null && runwayMonths > 0) {
    // Dependents increase minimum comfortable runway to 5 months (vs 3)
    const minRunway = hasDependents ? 5 : 3;
    const runwayBufferWeeks = Math.max(0, (runwayMonths - minRunway) * 4.33);
    if (runwayBufferWeeks > 0) {
      candidateBuffers.push({ weeks: runwayBufferWeeks, source: 'financial runway', isDeadline: false });
    }
  }

  // Buffer 2: Risk trajectory (how quickly score is approaching 80)
  if (velocityPtsPerMonth > 0.5) {
    const scoreBufferWeeks = weeksUntilScore80(currentScore, velocityPtsPerMonth);
    if (scoreBufferWeeks !== null) {
      candidateBuffers.push({ weeks: scoreBufferWeeks, source: 'risk trajectory', isDeadline: false });
    }
  }

  // Buffer 3: WARN Act deadline (hard deadline — legally confirmed)
  if (warnEffectiveDate) {
    const effectiveMs = new Date(warnEffectiveDate).getTime();
    const todayMs = new Date(today).getTime();
    const daysUntil = Math.floor((effectiveMs - todayMs) / (1000 * 60 * 60 * 24));
    const warnWeeks = Math.max(0, Math.round(daysUntil / 7) - jobSearchRunwayWeeks);
    candidateBuffers.push({ weeks: warnWeeks, source: 'WARN Act effective date', isDeadline: true });
  }

  // Buffer 4: Visa grace period (hard legal constraint — compresses search window)
  if (visaGracePeriodDays != null && visaGracePeriodDays > 0) {
    // Effective search window = grace period minus lead time for offer negotiation (2 weeks)
    const visaSearchWeeks = Math.max(0, Math.round(visaGracePeriodDays / 7) - 2);
    if (visaSearchWeeks < jobSearchRunwayWeeks) {
      // Visa window is tighter than normal search — this is a binding constraint
      candidateBuffers.push({
        weeks: visaSearchWeeks,
        source: `visa grace period (${visaGracePeriodDays}d post-layoff)`,
        isDeadline: true,
      });
    }
  }

  // Buffer 5: Equity vesting deadline (creates hold-then-exit window)
  // If vest > $10K and within 90 days, add a milestone but don't reduce buffer (it's an opportunity, not a constraint)
  const hasSignificantUpcomingVest =
    daysToNextVest != null && daysToNextVest > 0 && daysToNextVest <= 90 &&
    (nextVestValueUsd ?? 0) >= 10_000;

  // Critical buffer = minimum of all constraints
  const binding = candidateBuffers.length > 0
    ? candidateBuffers.reduce((min, c) => c.weeks < min.weeks ? c : min)
    : null;

  const bufferWeeks = binding?.weeks ?? 26; // default 6-month buffer when no constraints

  const criticalByDate = bufferWeeks <= 52 ? addWeeks(today, bufferWeeks) : null;

  // Urgency category (hasDependents bumps one tier)
  let urgencyCategory: UrgencyCategory;
  if (bufferWeeks <= 2) urgencyCategory = 'IMMEDIATE';
  else if (bufferWeeks <= 8) urgencyCategory = 'WEEKS';
  else if (bufferWeeks <= 24) urgencyCategory = 'MONTHS';
  else urgencyCategory = 'COMFORTABLE';

  // Bump urgency if dependents and not already IMMEDIATE
  if (hasDependents && urgencyCategory === 'COMFORTABLE') urgencyCategory = 'MONTHS';
  else if (hasDependents && urgencyCategory === 'MONTHS') urgencyCategory = 'WEEKS';

  // Build milestones
  const milestones: TimelineMilestone[] = [];

  if (currentScore >= 60) {
    milestones.push({
      date: addWeeks(today, 1),
      action: 'Begin discreet networking and LinkedIn profile update',
      rationale: `Risk score ${currentScore}/100 warrants immediate passive job preparation.`,
      isDeadline: false,
    });
  }

  if (bufferWeeks > 4) {
    milestones.push({
      date: addWeeks(today, Math.min(4, bufferWeeks - 2)),
      action: 'Launch active job search and outreach to target companies',
      rationale: `Start search ${jobSearchRunwayWeeks} weeks before you need an offer to allow buffer.`,
      isDeadline: false,
    });
  }

  if (criticalByDate) {
    milestones.push({
      date: criticalByDate,
      action: `Commit to career transition decision by ${formatHumanDate(criticalByDate)}`,
      rationale: binding ? `Constrained by ${binding.source}.` : 'Recommended action deadline.',
      isDeadline: true,
    });
  }

  if (runwayMonths !== null && runwayMonths <= (hasDependents ? 4 : 3)) {
    milestones.push({
      date: addWeeks(today, 1),
      action: 'Activate emergency financial protocols: extend runway immediately',
      rationale: `Only ${runwayMonths} months of financial runway${hasDependents ? ' with dependents' : ''} — critical urgency.`,
      isDeadline: true,
    });
  }

  // Equity vest milestone
  if (hasSignificantUpcomingVest && daysToNextVest != null) {
    milestones.push({
      date: addDays(today, daysToNextVest),
      action: `Equity vest milestone (~$${(nextVestValueUsd ?? 0).toLocaleString()}) — ideal exit timing after this date`,
      rationale: `Preserving this vest maximises total compensation in a job transition. Negotiate new start date or sign-on bonus to cover any cliff.`,
      isDeadline: false,
    });
  }

  // Visa deadline milestone
  if (visaGracePeriodDays != null && visaGracePeriodDays <= 60) {
    milestones.push({
      date: addWeeks(today, 1),
      action: 'Start visa-sponsor-specific job search immediately (compressed grace window)',
      rationale: `${visaGracePeriodDays}-day grace period means your effective search window is ~${Math.max(1, Math.round(visaGracePeriodDays / 7) - 2)} weeks after layoff — not enough to search reactively.`,
      isDeadline: true,
    });
  }

  milestones.sort((a, b) => a.date.localeCompare(b.date));

  // Narrative
  const dependentsNote = hasDependents ? ' With dependents, we recommend building to 5+ months of reserves.' : '';
  const runwayNarrative = runwayMonths === null
    ? 'Complete your financial profile to get a personalized timeline.'
    : runwayMonths <= (hasDependents ? 4 : 3)
      ? `Your ${runwayMonths}-month runway is critically short${hasDependents ? ' for a household with dependents' : ''} — immediate action required before you exhaust reserves.${dependentsNote}`
      : `Your ${runwayMonths}-month runway gives you until ${formatHumanDate(addWeeks(today, Math.round(runwayMonths * 4.33)))} before financial pressure forces a decision.${dependentsNote}`;

  // Regional market timing note
  const regionCode = (region ?? '').toUpperCase().slice(0, 2);
  const regionalNote = REGIONAL_MARKET_NOTES[regionCode] ?? '';
  const marketTimingNote = `This ${input.jobSearchRunwayWeeks}-week job search estimate reflects current market demand for your role. ` +
    `Starting your search ${Math.max(1, Math.round(jobSearchRunwayWeeks / 4))} months early maximises offer quality.` +
    (regionalNote ? ` ${regionalNote}` : '');

  return {
    criticalByDate,
    bufferWeeks,
    urgencyCategory,
    milestones,
    runwayNarrative,
    marketTimingNote,
  };
}
