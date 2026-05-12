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

export function computePersonalizedTimeline(input: PersonalizedTimelineInput): PersonalizedTimelineResult {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const {
    currentScore,
    runwayMonths,
    runwaySituation,
    jobSearchRunwayWeeks,
    velocityPtsPerMonth = 0,
    warnEffectiveDate,
  } = input;

  const candidateBuffers: { weeks: number; source: string; isDeadline: boolean }[] = [];

  // Buffer 1: Financial runway (how long can user afford to not have income)
  if (runwayMonths !== null && runwayMonths > 0) {
    const runwayBufferWeeks = Math.max(0, runwayMonths * 4.33 - jobSearchRunwayWeeks);
    candidateBuffers.push({ weeks: runwayBufferWeeks, source: 'financial runway', isDeadline: false });
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

  // Critical buffer = minimum of all constraints
  const binding = candidateBuffers.length > 0
    ? candidateBuffers.reduce((min, c) => c.weeks < min.weeks ? c : min)
    : null;

  const bufferWeeks = binding?.weeks ?? 26; // default 6-month buffer when no constraints

  const criticalByDate = bufferWeeks <= 52 ? addWeeks(today, bufferWeeks) : null;

  // Urgency category
  let urgencyCategory: UrgencyCategory;
  if (bufferWeeks <= 2) urgencyCategory = 'IMMEDIATE';
  else if (bufferWeeks <= 8) urgencyCategory = 'WEEKS';
  else if (bufferWeeks <= 24) urgencyCategory = 'MONTHS';
  else urgencyCategory = 'COMFORTABLE';

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

  if (runwayMonths !== null && runwayMonths <= 3) {
    milestones.push({
      date: addWeeks(today, 1),
      action: 'Activate emergency financial protocols: extend runway immediately',
      rationale: `Only ${runwayMonths} months of financial runway — critical urgency.`,
      isDeadline: true,
    });
  }

  milestones.sort((a, b) => a.date.localeCompare(b.date));

  // Narrative
  const runwayNarrative = runwayMonths === null
    ? 'Complete your financial profile to get a personalized timeline.'
    : runwayMonths <= 3
      ? `Your ${runwayMonths}-month runway is critically short — immediate action required before you exhaust reserves.`
      : `Your ${runwayMonths}-month runway gives you until ${formatHumanDate(addWeeks(today, Math.round(runwayMonths * 4.33)))} before financial pressure forces a decision.`;

  const marketTimingNote = `This ${input.jobSearchRunwayWeeks}-week job search estimate reflects current market demand for your role. ` +
    `Starting your search ${Math.max(1, Math.round(jobSearchRunwayWeeks / 4))} months early maximises offer quality.`;

  return {
    criticalByDate,
    bufferWeeks,
    urgencyCategory,
    milestones,
    runwayNarrative,
    marketTimingNote,
  };
}
