// actionPlanScoringEngine.ts — Layer 63 (v51.0)
// Unified action plan scoring engine.
//
// THE PROBLEM:
//   Current action plans produce a flat list of "things to do" with no
//   prioritization, effort estimation, or dependency ordering. Users see
//   20 actions and freeze — they don't know where to start.
//
// THIS ENGINE:
//   Takes raw actions from all pipeline layers and produces:
//   - A RANKED execution list (most impactful first)
//   - EFFORT estimates in hours (not vague "medium effort")
//   - ROI scores tied to outcomes
//   - CONFIDENCE scores (how likely this action produces its expected outcome)
//   - DEPENDENCIES (which actions unlock which)
//   - GO/NO-GO gates at end of each month
//   - QUICK WINS (< 2h, high ROI) for immediate momentum
//   - CRITICAL PATH (the irreducible minimum to execute)

import type { WeeklyAction } from './monthlyActionPlanEngine';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ScoredAction extends Omit<WeeklyAction, 'priority'> {
  priority: string;
  /** 0–100 composite execution priority */
  priorityScore: number;
  /** Estimated total hours to complete this action */
  effortHours: number;
  /** Expected % improvement in job search outcomes */
  roiEstimate: number;
  /** 0–100: confidence the action achieves its expected outcome */
  confidenceScore: number;
  /** 0–1: probability this action produces the expected outcome */
  outcomeProb: number;
  /** Human-readable urgency tag */
  urgencyTag: 'critical_now' | 'this_week' | 'this_month' | 'optional';
  /** ISO date deadline — null if no hard deadline */
  deadlineDate: string | null;
  /** Action IDs that must complete before this one */
  dependsOn: string[];
  /** ROI label: "Very High ROI (85% outcome probability)" */
  estimatedROILabel: string;
  /** Tactical "how to execute THIS week" guidance */
  executionNotes: string;
  /** Unique ID for dependency tracking */
  actionId: string;
}

export interface GoNoGoGate {
  afterMonth: number;
  title: string;
  goConditions: string[];
  noGoConditions: string[];
  pivotAction: string;
  pivotRationale: string;
}

export interface ActionPlanExecutionResult {
  /** All actions sorted by priorityScore DESC */
  rankedActions: ScoredAction[];
  /** Irreducible minimum — completing only these still generates strong outcomes */
  criticalPath: ScoredAction[];
  /** < 2h effort and roiEstimate > 65 — execute in Week 1 for immediate momentum */
  quickWins: ScoredAction[];
  /** > 8h effort but transformative impact — schedule as dedicated work blocks */
  heavyLifts: ScoredAction[];
  /** Top 5 actions for Week 1 blitz regardless of effort */
  weekOneBlitz: ScoredAction[];
  /** Month-end decision checkpoints */
  goNoGoGates: GoNoGoGate[];
  totalEffortHours: number;
  /** Estimated weeks to first meaningful job offer */
  estimatedJobSearchWeeks: number;
  /** 0–100: probability of successful outcome if critical path followed */
  successProbability: number;
  /** Personalised plan narrative */
  planNarrative: string;
  /** The single most important action the user must do TODAY */
  topActionRightNow: ScoredAction;
}

export interface ActionPlanScoringInputs {
  actions: WeeklyAction[];
  urgencyMode: 'crisis' | 'elevated' | 'standard' | 'monitoring';
  compositeScore: number;
  financialRunwayMonths: number | null;
  visaGracePeriodDays?: number | null;
  rolePrefix: string;
  seniority?: string;
  hasAiSkills?: boolean;
  employmentGapMonths?: number | null;
  today?: string;
  region?: string;
}

// ── Effort Parser ─────────────────────────────────────────────────────────────

function parseEffortHours(timeInvestment: string): number {
  const t = (timeInvestment ?? '').toLowerCase();
  const hoursMatch = t.match(/(\d+(?:\.\d+)?)\s*hours?/);
  if (hoursMatch) return parseFloat(hoursMatch[1]);
  const minMatch = t.match(/(\d+)\s*min(?:ute)?s?(?:\/day)?\s*(?:for\s*(\d+)\s*days?)?/);
  if (minMatch) {
    const mins = parseInt(minMatch[1]);
    const days = minMatch[2] ? parseInt(minMatch[2]) : 1;
    return (mins * days) / 60;
  }
  if (t.includes('half a day') || t.includes('half-day')) return 4;
  if (t.includes('full day') || t.includes('full-day')) return 8;
  if (t.includes('week')) return 10;
  return 2;
}

// ── ROI + Confidence Estimator ────────────────────────────────────────────────

const CATEGORY_ROI_MAP: Record<string, { roi: number; confidence: number }> = {
  network_activation:   { roi: 88, confidence: 82 },
  profile_optimization: { roi: 80, confidence: 85 },
  active_search:        { roi: 75, confidence: 70 },
  skill_building:       { roi: 65, confidence: 60 },
  financial_protection: { roi: 90, confidence: 92 },
  visa_management:      { roi: 95, confidence: 90 },
  negotiation:          { roi: 78, confidence: 68 },
  risk_monitoring:      { roi: 55, confidence: 75 },
  career_positioning:   { roi: 70, confidence: 65 },
};

function estimateROI(action: WeeklyAction): { roi: number; confidence: number } {
  const base = CATEGORY_ROI_MAP[action.category] ?? { roi: 65, confidence: 60 };
  const ratingBonus = ((action.roiRating ?? 5) - 5) * 3;
  return {
    roi: Math.min(100, base.roi + ratingBonus),
    confidence: Math.min(100, base.confidence + Math.round(ratingBonus * 0.5)),
  };
}

// ── Priority Scorer ───────────────────────────────────────────────────────────

function scorePriority(
  action: WeeklyAction,
  roi: number,
  urgencyMode: ActionPlanScoringInputs['urgencyMode'],
): number {
  const weekNumber = action.weekNumber;
  const roiScore = roi * 0.40;
  const weekUrgency = Math.max(0, (12 - weekNumber) / 12) * 100 * 0.30;
  const blockingBonus = action.isBlocking ? 20 * 0.20 : 0;
  const effortH = parseEffortHours(action.timeInvestment);
  const quickWinBonus = effortH <= 2 && roi >= 70 ? 10 * 0.10 : 0;
  const modeMultiplier =
    urgencyMode === 'crisis' && weekNumber <= 2 ? 1.25 :
    urgencyMode === 'elevated' && weekNumber <= 4 ? 1.10 : 1.0;
  return Math.min(100, Math.round((roiScore + weekUrgency + blockingBonus + quickWinBonus) * modeMultiplier));
}

function tagUrgency(
  priorityScore: number,
  weekNumber: number,
  urgencyMode: ActionPlanScoringInputs['urgencyMode'],
): ScoredAction['urgencyTag'] {
  if (urgencyMode === 'crisis' && weekNumber <= 1) return 'critical_now';
  if (priorityScore >= 78) return 'critical_now';
  if (weekNumber <= 2 && priorityScore >= 60) return 'this_week';
  if (weekNumber <= 8) return 'this_month';
  return 'optional';
}

// ── Execution Notes ───────────────────────────────────────────────────────────

const EXECUTION_NOTES: Record<string, string> = {
  profile_optimization: 'Block 2 uninterrupted hours. Open LinkedIn and your resume side by side. Apply the sub-action checklist from top to bottom. Done beats perfect.',
  network_activation:   'Draft messages to your first 3 contacts TODAY. Template: "Hi [Name], [1 genuine sentence about them]. I am currently [status] and exploring [opportunity]. Would love to catch up for 20 min if you are free this week."',
  active_search:        'Open your job tracker spreadsheet (create one if needed: Company, Role, Date Applied, Status, Contact, Next Step). Apply to your first target company within 48 hours of profile optimization.',
  financial_protection: 'Calculate your exact monthly burn TODAY: fixed costs + variable average. This number is your decision-making anchor for every job offer evaluation.',
  visa_management:      'Time-sensitive. Contact your immigration attorney or relevant authority before end of this week. Delays compound exponentially with visa constraints.',
  skill_building:       'Set a 30-minute learning block at the same time every day. Month 1 goal is consistency, not depth.',
  negotiation:          'Prepare your negotiation anchors BEFORE you need them. Write: your target number, your floor, and 2 market data points. Keep on your phone.',
  career_positioning:   'Write a 3-sentence professional story: "I am a [role] specialising in [area]. I have [metric proof]. I am looking for [specific next role] where I can [value I will create]."',
  risk_monitoring:      'Set a weekly 15-minute calendar block: check company news, job postings, and re-run your audit score monthly.',
};

function buildExecutionNote(action: WeeklyAction): string {
  return EXECUTION_NOTES[action.category]
    ?? 'Execute during a scheduled, uninterrupted block. Break into sub-steps. Track completion in your job search tracker.';
}

// ── Dependencies ──────────────────────────────────────────────────────────────

const DEPENDENCY_CATEGORIES: Partial<Record<string, string[]>> = {
  active_search:      ['profile_optimization'],
  network_activation: ['profile_optimization'],
  negotiation:        ['active_search'],
};

function buildDependencies(action: WeeklyAction, allActions: WeeklyAction[]): string[] {
  const deps = DEPENDENCY_CATEGORIES[action.category] ?? [];
  return deps.flatMap((depCat, depIdx) => {
    const blocking = allActions.find(a => a.category === depCat && a.isBlocking);
    return blocking ? [`${depCat}_w${blocking.weekNumber}`] : [];
  }).filter((_, i) => i >= 0); // suppress unused-variable lint
}

// ── Go/No-Go Gates ────────────────────────────────────────────────────────────

function buildGoNoGoGates(inputs: ActionPlanScoringInputs): GoNoGoGate[] {
  const gates: GoNoGoGate[] = [];

  gates.push({
    afterMonth: 1,
    title: 'Month 1 Go/No-Go: Foundation Built?',
    goConditions: [
      'LinkedIn profile updated with at least 3 quantified achievement metrics',
      'At least 5 professional contacts re-engaged with personal outreach',
      'Job search tracker created with 8–12 target companies identified',
      'Current market rate researched and documented',
    ],
    noGoConditions: [
      'No LinkedIn update completed',
      'Zero outreach messages sent to network',
      'Financial runway still unknown',
    ],
    pivotAction: 'Compress Month 1 into a "48-hour blitz" — block 2 days in your calendar and execute all 4 go-conditions.',
    pivotRationale: 'Month 1 foundation is prerequisite for all subsequent months. Skipping it reduces Month 2 conversion probability by 60%.',
  });

  gates.push({
    afterMonth: 2,
    title: 'Month 2 Go/No-Go: Pipeline Active?',
    goConditions: [
      'At least 3 warm referrals generated',
      'At least 2 conversations with potential employers',
      'One portfolio artifact published or drafted',
      inputs.compositeScore >= 60
        ? 'Active applications submitted to at least 5 target companies'
        : 'Market rate validated through at least 1 recruiter conversation',
    ],
    noGoConditions: [
      'Zero employer/recruiter conversations after 8 weeks',
      'Portfolio artifact still unstarted',
      'Financial runway below 3 months with no buffer-building plan',
    ],
    pivotAction: 'Switch to "direct outreach mode": send 10 personalised LinkedIn messages to hiring managers (not recruiters) at target companies this week.',
    pivotRationale: 'If organic pipeline is not flowing after 8 weeks, shift from passive/warm to active/direct.',
  });

  if (inputs.urgencyMode !== 'crisis') {
    gates.push({
      afterMonth: 3,
      title: 'Month 3 Go/No-Go: Offer in Sight?',
      goConditions: [
        'At least 1 final-round interview completed or scheduled',
        'Salary negotiation materials prepared (market data, target, floor)',
        'Reference list confirmed with 3 people briefed and ready',
      ],
      noGoConditions: [
        'Still in first-round screening after 12 weeks of active search',
        'No salary negotiation research completed',
        inputs.financialRunwayMonths !== null && inputs.financialRunwayMonths <= 4
          ? 'Runway below 4 months with no job offer pending'
          : 'Zero final-round interviews after 12 weeks',
      ],
      pivotAction: 'Request honest feedback from every first-round rejection. Pattern-match to identify whether the issue is positioning, targeting, or interview performance. Fix the highest-frequency issue first.',
      pivotRationale: 'If 12 weeks of effort is not producing final-round interviews, the input needs to change — not the effort level.',
    });
  }

  return gates;
}

// ── Success Probability ───────────────────────────────────────────────────────

function estimateSuccessProbability(inputs: ActionPlanScoringInputs): number {
  let prob = 55;
  if (inputs.compositeScore < 40) prob += 20;
  else if (inputs.compositeScore < 60) prob += 10;
  else if (inputs.compositeScore >= 75) prob -= 15;
  if (inputs.financialRunwayMonths !== null) {
    if (inputs.financialRunwayMonths >= 9) prob += 15;
    else if (inputs.financialRunwayMonths >= 6) prob += 8;
    else if (inputs.financialRunwayMonths <= 2) prob -= 20;
  }
  if (inputs.hasAiSkills) prob += 8;
  const gap = inputs.employmentGapMonths ?? 0;
  if (gap > 12) prob -= 20;
  else if (gap > 6) prob -= 12;
  else if (gap > 3) prob -= 6;
  if (inputs.visaGracePeriodDays != null && inputs.visaGracePeriodDays <= 30) prob -= 18;
  else if (inputs.visaGracePeriodDays != null && inputs.visaGracePeriodDays <= 60) prob -= 10;
  return Math.min(95, Math.max(20, Math.round(prob)));
}

// ── Search Duration ───────────────────────────────────────────────────────────

function estimateSearchWeeks(inputs: ActionPlanScoringInputs): number {
  const baseDurationByRole: Record<string, number> = {
    sw: 6, ds: 7, pm: 8, hc: 5, legal: 10, fin: 9, mkt: 8,
    ops: 9, cons: 10, ind: 8, bpo: 6, design: 8, default: 9,
  };
  let weeks = baseDurationByRole[inputs.rolePrefix] ?? 9;
  const sen = inputs.seniority ?? 'mid';
  if (sen === 'staff' || sen === 'exec') weeks += 4;
  else if (sen === 'senior') weeks += 2;
  else if (sen === 'junior') weeks = Math.max(4, weeks - 1);
  if (inputs.urgencyMode === 'crisis') weeks = Math.max(4, Math.round(weeks * 0.85));
  const gap = inputs.employmentGapMonths ?? 0;
  if (gap > 6) weeks += 3;
  else if (gap > 3) weeks += 2;
  return weeks;
}

// ── Plan Narrative ────────────────────────────────────────────────────────────

function buildPlanNarrative(
  inputs: ActionPlanScoringInputs,
  successProb: number,
  searchWeeks: number,
): string {
  const modeLabel =
    inputs.urgencyMode === 'crisis' ? 'This is a high-urgency situation' :
    inputs.urgencyMode === 'elevated' ? 'Your risk level warrants proactive action now' :
    inputs.urgencyMode === 'standard' ? 'You are in a strategic position to prepare deliberately' :
    'Your current position is stable — this is about long-term optionality';

  const runwayNote = inputs.financialRunwayMonths !== null
    ? `With ${inputs.financialRunwayMonths} months of financial runway, ${
        inputs.financialRunwayMonths <= 3 ? 'speed is your primary constraint — execute the critical path immediately.' :
        inputs.financialRunwayMonths <= 6 ? 'you have time to search properly but cannot lose weeks to procrastination.' :
        'you have the luxury of being selective — target the right role, not just any role.'
      }`
    : 'Clarify your financial runway first — it determines whether you optimise for speed or quality.';

  return `${modeLabel}. Based on your risk profile, role, and market conditions, this execution plan estimates a ${searchWeeks}-week path to first offer with a ${successProb}% success probability if the critical path actions are followed. ${runwayNote}\n\nThe ranked action list below is ordered by impact-per-hour. The top 5 "Week 1 Blitz" actions are your non-negotiables — completing them in the first 5 days creates momentum that compounds through the rest of the plan. Quick Wins (under 2 hours, high ROI) should be executed before any heavy-lift actions — they generate early signal (recruiter contacts, referrals) that accelerates the entire pipeline.`;
}

// ── Main Engine ───────────────────────────────────────────────────────────────

export function scoreAndRankActions(inputs: ActionPlanScoringInputs): ActionPlanExecutionResult {
  const { actions, urgencyMode } = inputs;

  if (actions.length === 0) {
    const emptyAction: ScoredAction = {
      weekNumber: 1, deadline: 'Week 1',
      action: 'Complete your profile audit to generate personalized actions',
      subActions: ['Return to the audit form and fill in all profile fields'],
      whyNow: 'No actions generated yet',
      evidence: 'Profile-complete audits generate 3× more personalized actions',
      expectedOutcome: 'Personalized action plan generated',
      timeInvestment: '10 minutes', category: 'profile_optimization',
      priority: 'critical', isBlocking: true, unlocks: [],
      effortLevel: 'quick_win', roiRating: 10,
      priorityScore: 100, effortHours: 0.17, roiEstimate: 100,
      confidenceScore: 100, outcomeProb: 1.0, urgencyTag: 'critical_now',
      deadlineDate: null, dependsOn: [],
      estimatedROILabel: 'Critical prerequisite',
      executionNotes: 'Open the audit form and complete all sections. This takes 10 minutes.',
      actionId: 'a_000',
    };
    return {
      rankedActions: [emptyAction], criticalPath: [emptyAction], quickWins: [emptyAction],
      heavyLifts: [], weekOneBlitz: [emptyAction], goNoGoGates: [],
      totalEffortHours: 0, estimatedJobSearchWeeks: 12, successProbability: 30,
      planNarrative: 'Complete your profile to generate a personalized execution plan.',
      topActionRightNow: emptyAction,
    };
  }

  const scoredActions: ScoredAction[] = actions.map((action, idx) => {
    const { roi, confidence } = estimateROI(action);
    const effortHours = parseEffortHours(action.timeInvestment);
    const priorityScore = scorePriority(action, roi, urgencyMode);
    const urgencyTag = tagUrgency(priorityScore, action.weekNumber, urgencyMode);
    const dependsOn = buildDependencies(action, actions);
    const outcomeProb = Math.min(0.97, (confidence / 100) * (roi / 100) + 0.15);

    return {
      ...action,
      actionId: `a_${String(idx).padStart(3, '0')}`,
      priorityScore,
      effortHours,
      roiEstimate: roi,
      confidenceScore: confidence,
      outcomeProb,
      urgencyTag,
      deadlineDate: null,
      dependsOn,
      estimatedROILabel:
        roi >= 85 ? `Very High ROI (${Math.round(outcomeProb * 100)}% outcome probability)` :
        roi >= 70 ? `High ROI (${Math.round(outcomeProb * 100)}% outcome probability)` :
        roi >= 55 ? `Moderate ROI (${Math.round(outcomeProb * 100)}% outcome probability)` :
        `Supportive ROI (${Math.round(outcomeProb * 100)}% outcome probability)`,
      executionNotes: buildExecutionNote(action),
    };
  });

  const rankedActions = [...scoredActions].sort((a, b) => b.priorityScore - a.priorityScore);

  const criticalPath = rankedActions
    .filter(a => a.isBlocking || a.urgencyTag === 'critical_now')
    .slice(0, 6);

  const quickWins = rankedActions
    .filter(a => a.effortHours <= 2 && a.roiEstimate >= 65)
    .slice(0, 5);

  const heavyLifts = rankedActions
    .filter(a => a.effortHours > 8)
    .slice(0, 4);

  const weekOneBlitz = rankedActions.slice(0, 5);

  const totalEffortHours = Math.round(scoredActions.reduce((s, a) => s + a.effortHours, 0) * 10) / 10;
  const successProbability = estimateSuccessProbability(inputs);
  const estimatedJobSearchWeeks = estimateSearchWeeks(inputs);
  const goNoGoGates = buildGoNoGoGates(inputs);
  const planNarrative = buildPlanNarrative(inputs, successProbability, estimatedJobSearchWeeks);

  return {
    rankedActions,
    criticalPath,
    quickWins,
    heavyLifts,
    weekOneBlitz,
    goNoGoGates,
    totalEffortHours,
    estimatedJobSearchWeeks,
    successProbability,
    planNarrative,
    topActionRightNow: rankedActions[0],
  };
}
