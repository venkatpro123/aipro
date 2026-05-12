// headcountVelocityEngine.ts — Layer 36
// v14.0 Intelligence Upgrade
//
// Models contractor vs. FTE ratio trends and total headcount velocity as
// early warning signals for layoffs.
//
// Key insights:
//   - Companies increase contractor/contingent workforce BEFORE cutting FTEs.
//     When contractor ratio > 30% and that ratio is declining, FTE cuts follow
//     within 45–90 days (Staffing Industry Analysts 2024).
//   - LinkedIn headcount changes (publicly available): -5% in 6 months is a
//     significant signal; -10% in 3 months = imminent wave.
//   - Job posting velocity (30-day trend) is the most responsive signal —
//     leading by 30–45 days vs. actual headcount changes.
//   - Hiring-to-attrition imbalance: when hiring rate < voluntary attrition rate,
//     net headcount is declining even without announced layoffs.
//
// Calibration: research_grounded (Staffing Industry Analysts 2024, LinkedIn Workforce)

export type HeadcountTrend = 'GROWING' | 'STABLE' | 'DECLINING' | 'DECLINING_SHARPLY' | 'UNKNOWN';
export type PostingVelocity = 'ACCELERATING' | 'STABLE' | 'DECELERATING' | 'FROZEN' | 'UNKNOWN';

export interface HeadcountVelocityResult {
  // Overall
  headcountRiskScore: number;        // 0–100 (higher = more headcount contraction risk)
  headcountRiskLabel: string;

  // Headcount trend
  headcountTrend: HeadcountTrend;
  headcountChange6MonthPct: number | null;  // % change in last 6 months
  headcountNote: string;

  // Contractor signals
  contractorRatioRisk: 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
  contractorRatioPct: number | null;    // % of workforce that is contractors
  contractorTrend: 'INCREASING' | 'STABLE' | 'DECREASING' | 'UNKNOWN';
  contractorNote: string;

  // Job posting velocity
  postingVelocity: PostingVelocity;
  postingVelocityNote: string;
  postingCountCurrent: number | null;
  postingCountMonthAgo: number | null;

  // Hiring vs attrition balance
  netHeadcountMomentum: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'UNKNOWN';
  netHeadcountNote: string;

  // Forward signal
  earlyWarningSignals: string[];
  estimatedLayoffLeadTimeDays: number | null;

  // Actions
  headcountActions: HeadcountAction[];

  calibrationStatus: 'research_grounded';
}

export interface HeadcountAction {
  action: string;
  why: string;
  urgency: 'immediate' | 'within_30d' | 'within_90d';
}

function classifyHeadcountTrend(change6MonthPct: number | null): { trend: HeadcountTrend; note: string } {
  if (change6MonthPct === null) return { trend: 'UNKNOWN', note: 'Headcount change data not available.' };
  if (change6MonthPct >= 5)  return { trend: 'GROWING',          note: `Headcount grew ${change6MonthPct}% in 6 months — expansion phase, low layoff risk.` };
  if (change6MonthPct >= 0)  return { trend: 'STABLE',           note: `Headcount stable (+${change6MonthPct}% in 6 months) — no significant contraction signal.` };
  if (change6MonthPct >= -5) return { trend: 'DECLINING',        note: `Headcount declined ${Math.abs(change6MonthPct)}% in 6 months — early contraction signal. May reflect voluntary attrition not being backfilled.` };
  if (change6MonthPct >= -10) return { trend: 'DECLINING',       note: `Headcount declined ${Math.abs(change6MonthPct)}% in 6 months — significant contraction. Likely combination of attrition + some role eliminations.` };
  return {
    trend: 'DECLINING_SHARPLY',
    note: `Headcount declined ${Math.abs(change6MonthPct)}% in 6 months — sharp contraction. This magnitude typically indicates active restructuring, not just attrition.`,
  };
}

function classifyContractorRisk(
  ratioPct: number | null,
  trend: HeadcountVelocityResult['contractorTrend'],
): { risk: HeadcountVelocityResult['contractorRatioRisk']; note: string } {
  if (ratioPct === null) return { risk: 'UNKNOWN', note: 'Contractor ratio data not available.' };

  // High ratio + declining = contractors already being cut, FTEs next
  if (ratioPct > 30 && trend === 'DECREASING') {
    return {
      risk: 'HIGH',
      note: `${ratioPct}% contractor ratio declining — Staffing Industry Analysts 2024: when contractor ratio > 30% and declining, FTE cuts follow within 45–90 days.`,
    };
  }
  if (ratioPct > 30 && trend !== 'DECREASING') {
    return {
      risk: 'MODERATE',
      note: `${ratioPct}% contractor ratio — high but stable. Monitor for signs of contractor reduction, which would signal FTE cuts are next.`,
    };
  }
  if (ratioPct > 15 && trend === 'DECREASING') {
    return {
      risk: 'MODERATE',
      note: `${ratioPct}% contractor ratio declining — contractors going first, FTEs may follow if decline continues.`,
    };
  }
  return { risk: 'LOW', note: `${ratioPct}% contractor ratio — within normal range.` };
}

function classifyPostingVelocity(
  current: number | null,
  monthAgo: number | null,
): { velocity: PostingVelocity; note: string } {
  if (current === null || monthAgo === null) {
    return { velocity: 'UNKNOWN', note: 'Job posting data not available.' };
  }
  if (monthAgo === 0) return { velocity: 'UNKNOWN', note: 'Prior month posting count is zero — data may be incomplete.' };

  const change = ((current - monthAgo) / monthAgo) * 100;

  if (current === 0) return {
    velocity: 'FROZEN',
    note: `Job postings have dropped to zero — complete hiring freeze signal. This is the last pre-layoff stage before formal announcements.`,
  };
  if (change >= 15) return { velocity: 'ACCELERATING', note: `Job postings up ${Math.round(change)}% vs. last month — hiring accelerating, low layoff risk.` };
  if (change >= -10) return { velocity: 'STABLE',      note: `Job postings stable (${change.toFixed(0)}% vs. last month).` };
  if (change >= -40) return {
    velocity: 'DECELERATING',
    note: `Job postings down ${Math.abs(Math.round(change))}% vs. last month — hiring deceleration. Often precedes layoffs by 30–45 days.`,
  };
  return {
    velocity: 'FROZEN',
    note: `Job postings collapsed ${Math.abs(Math.round(change))}% vs. last month — effective hiring freeze. Strong 30–45 day layoff precursor.`,
  };
}

function buildEarlyWarningSignals(
  headcountTrend: HeadcountTrend,
  contractorRisk: HeadcountVelocityResult['contractorRatioRisk'],
  postingVelocity: PostingVelocity,
): { signals: string[]; leadTimeDays: number | null } {
  const signals: string[] = [];
  let maxLeadTime: number | null = null;

  if (headcountTrend === 'DECLINING_SHARPLY') {
    signals.push('Sharp headcount decline (-10%+ in 6mo) — active restructuring underway');
    maxLeadTime = maxLeadTime === null ? 30 : Math.min(maxLeadTime, 30);
  }
  if (contractorRisk === 'HIGH') {
    signals.push('Contractor ratio declining from high levels — FTE cuts follow contractors by 45–90 days');
    maxLeadTime = maxLeadTime === null ? 67 : Math.min(maxLeadTime, 67);
  }
  if (postingVelocity === 'FROZEN') {
    signals.push('Job postings frozen — hiring stopped completely, 30–45 day layoff precursor');
    maxLeadTime = maxLeadTime === null ? 37 : Math.min(maxLeadTime, 37);
  }
  if (postingVelocity === 'DECELERATING') {
    signals.push('Job posting deceleration — hiring slowing, 30–45 day early warning');
    maxLeadTime = maxLeadTime === null ? 42 : Math.min(maxLeadTime, 42);
  }

  return { signals, leadTimeDays: maxLeadTime };
}

function getHeadcountActions(
  headcountRiskScore: number,
  headcountTrend: HeadcountTrend,
  contractorRisk: HeadcountVelocityResult['contractorRatioRisk'],
  postingVelocity: PostingVelocity,
): HeadcountAction[] {
  const actions: HeadcountAction[] = [];

  if (postingVelocity === 'FROZEN' || contractorRisk === 'HIGH') {
    actions.push({
      action: 'Check LinkedIn for your company\'s headcount trend this week — publicly available on the company page',
      why: `${postingVelocity === 'FROZEN' ? 'Frozen job postings' : 'Contractor cuts'} are the strongest pre-layoff signals available. Confirming with LinkedIn headcount data takes 5 minutes and verifies whether the pattern is accelerating.`,
      urgency: 'immediate',
    });
  }

  if (headcountTrend === 'DECLINING_SHARPLY' || headcountTrend === 'DECLINING') {
    actions.push({
      action: 'Identify which teams or roles are growing vs. shrinking within your company',
      why: 'Not all parts of a company shrink at the same rate. Teams working on AI, core product, or revenue generation are often growing even when overall headcount declines. Repositioning toward growth teams within your company is the highest-value move.',
      urgency: 'within_30d',
    });
  }

  if (headcountRiskScore >= 50) {
    actions.push({
      action: 'Build your personal pipeline of 5+ target companies with growing headcount in your function',
      why: 'Identifying and tracking companies where your role is actively growing — using LinkedIn headcount data — gives you a pre-vetted target list before you need to use it.',
      urgency: 'within_30d',
    });
  }

  return actions;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface HeadcountVelocityInput {
  headcountChange6MonthPct?: number | null;  // % change (negative = decline)
  contractorRatioPct?: number | null;         // % of workforce that are contractors
  contractorTrend?: HeadcountVelocityResult['contractorTrend'];
  jobPostingCurrentMonth?: number | null;     // # of open postings this month
  jobPostingLastMonth?: number | null;        // # of open postings last month
  hiringRateAnnualized?: number | null;       // % of workforce hired per year
  voluntaryAttritionPct?: number | null;      // % voluntary attrition per year
}

export function computeHeadcountVelocity(
  input: HeadcountVelocityInput,
): HeadcountVelocityResult {
  try {
    const {
      headcountChange6MonthPct = null,
      contractorRatioPct = null,
      contractorTrend = 'UNKNOWN',
      jobPostingCurrentMonth = null,
      jobPostingLastMonth = null,
      hiringRateAnnualized = null,
      voluntaryAttritionPct = null,
    } = input;

    const headcountClassification = classifyHeadcountTrend(headcountChange6MonthPct);
    const contractorClassification = classifyContractorRisk(contractorRatioPct, contractorTrend);
    const postingClassification = classifyPostingVelocity(jobPostingCurrentMonth, jobPostingLastMonth);

    // Net headcount momentum
    let netMomentum: HeadcountVelocityResult['netHeadcountMomentum'] = 'UNKNOWN';
    let netNote = 'Hiring vs. attrition balance data not available.';
    if (hiringRateAnnualized !== null && voluntaryAttritionPct !== null) {
      const net = hiringRateAnnualized - voluntaryAttritionPct;
      if (net > 5)       { netMomentum = 'POSITIVE'; netNote = `Net +${net.toFixed(1)}% annualized headcount growth (hiring > attrition).`; }
      else if (net >= 0) { netMomentum = 'NEUTRAL';  netNote = `Roughly balanced hiring and attrition (net ${net.toFixed(1)}%).`; }
      else               { netMomentum = 'NEGATIVE'; netNote = `Net ${net.toFixed(1)}% annualized headcount decline — attrition exceeds hiring. Silent headcount reduction underway.`; }
    }

    // Risk score
    const headcountTrendRisk: Record<HeadcountTrend, number> = {
      GROWING: 5, STABLE: 20, DECLINING: 55, DECLINING_SHARPLY: 85, UNKNOWN: 30,
    };
    const contractorRiskScore: Record<HeadcountVelocityResult['contractorRatioRisk'], number> = {
      HIGH: 70, MODERATE: 40, LOW: 10, UNKNOWN: 25,
    };
    const postingRiskScore: Record<PostingVelocity, number> = {
      ACCELERATING: 5, STABLE: 20, DECELERATING: 60, FROZEN: 90, UNKNOWN: 30,
    };

    const headcountRiskScore = Math.min(100, Math.round(
      headcountTrendRisk[headcountClassification.trend] * 0.40
      + contractorRiskScore[contractorClassification.risk] * 0.30
      + postingRiskScore[postingClassification.velocity] * 0.30,
    ));

    const { signals, leadTimeDays } = buildEarlyWarningSignals(
      headcountClassification.trend,
      contractorClassification.risk,
      postingClassification.velocity,
    );

    const riskLabel = headcountRiskScore >= 70 ? 'Critical — multiple headcount contraction signals active'
      : headcountRiskScore >= 50 ? 'Elevated — significant headcount decline indicators'
      : headcountRiskScore >= 30 ? 'Monitoring — early headcount stress signals'
      : 'Stable — no significant headcount contraction detected';

    return {
      headcountRiskScore,
      headcountRiskLabel: riskLabel,
      headcountTrend: headcountClassification.trend,
      headcountChange6MonthPct,
      headcountNote: headcountClassification.note,
      contractorRatioRisk: contractorClassification.risk,
      contractorRatioPct,
      contractorTrend,
      contractorNote: contractorClassification.note,
      postingVelocity: postingClassification.velocity,
      postingVelocityNote: postingClassification.note,
      postingCountCurrent: jobPostingCurrentMonth,
      postingCountMonthAgo: jobPostingLastMonth,
      netHeadcountMomentum: netMomentum,
      netHeadcountNote: netNote,
      earlyWarningSignals: signals,
      estimatedLayoffLeadTimeDays: leadTimeDays,
      headcountActions: getHeadcountActions(headcountRiskScore, headcountClassification.trend, contractorClassification.risk, postingClassification.velocity),
      calibrationStatus: 'research_grounded',
    };
  } catch {
    return {
      headcountRiskScore: 30,
      headcountRiskLabel: 'Unable to assess headcount signals',
      headcountTrend: 'UNKNOWN',
      headcountChange6MonthPct: null,
      headcountNote: 'Headcount data unavailable.',
      contractorRatioRisk: 'UNKNOWN',
      contractorRatioPct: null,
      contractorTrend: 'UNKNOWN',
      contractorNote: 'Contractor data unavailable.',
      postingVelocity: 'UNKNOWN',
      postingVelocityNote: 'Posting data unavailable.',
      postingCountCurrent: null,
      postingCountMonthAgo: null,
      netHeadcountMomentum: 'UNKNOWN',
      netHeadcountNote: 'Hiring/attrition data unavailable.',
      earlyWarningSignals: [],
      estimatedLayoffLeadTimeDays: null,
      headcountActions: [],
      calibrationStatus: 'research_grounded',
    };
  }
}
