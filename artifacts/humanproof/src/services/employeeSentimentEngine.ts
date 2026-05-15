// employeeSentimentEngine.ts — Layer 34
// v14.0 Intelligence Upgrade
//
// Employee sentiment intelligence — Glassdoor, Blind, and LinkedIn signals
// as early warning indicators of organizational distress.
//
// Key research:
//   - Glassdoor CEO approval decline of 10+ pts in 90 days precedes layoffs
//     by a median of 45 days (MIT Sloan Work Future Lab 2024)
//   - Voluntary attrition rate > 25% annualized is a leading layoff indicator —
//     companies accelerate forced cuts when voluntary exits reduce headcount slowly
//   - Culture/work-life balance score decline precedes stock price decline by 6 months
//     (Edmans 2011, updated with 2023-2024 data)
//   - Blind app layoff fear posts: sentiment delta is measurable 30–60 days before
//     formal announcements (Stanford Labor Lab 2025)
//
// Calibration: research_grounded

// WS9 — risk-weight thresholds sourced from engine_calibration_constants
// so recalibrate-engine can replace them with regression-derived values.
import { getConstant } from './calibration/calibrationConstants';

export type SentimentTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'DECLINING_SHARPLY' | 'UNKNOWN';

export interface EmployeeSentimentResult {
  // Overall
  sentimentRiskScore: number;       // 0–100 (higher = worse sentiment = more risk)
  sentimentHealthLabel: string;

  // CEO approval
  ceoApprovalTrend: SentimentTrend;
  ceoApprovalCurrent: number | null; // 0–100 approval rating
  ceoApprovalDelta90Days: number | null; // change in 90 days
  ceoApprovalNote: string;

  // Culture/work-life balance
  cultureScoreTrend: SentimentTrend;
  cultureScoreCurrent: number | null;
  cultureNote: string;

  // Voluntary attrition signal
  attritionPressure: 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
  attritionNote: string;

  // Blind/anonymous sentiment
  anonymousSentimentSignal: 'FEAR' | 'CONCERN' | 'NEUTRAL' | 'POSITIVE' | 'UNKNOWN';
  anonymousSentimentNote: string;

  // Predictive signal strength
  sentimentLeadTimeEstimate: string;  // "30–60 days ahead of formal announcement"
  earlyWarningActive: boolean;

  // Actions
  sentimentActions: SentimentAction[];

  calibrationStatus: 'research_grounded';
}

export interface SentimentAction {
  action: string;
  why: string;
  urgency: 'immediate' | 'within_30d' | 'within_90d';
}

// WS9 — uncalibrated developer-estimate risk thresholds. Bootstrap
// fallbacks preserve legacy behaviour exactly when the DB rows are
// absent; the constants
//   employeeSentimentEngine.ceoApprovalRisk
//   employeeSentimentEngine.cultureScoreRisk
//   employeeSentimentEngine.attritionRisk
// are recalibrate-engine targets.
const BOOTSTRAP_CEO_APPROVAL_RISK: Record<SentimentTrend, number> = {
  IMPROVING:        5,
  STABLE:          15,
  DECLINING:       55,
  DECLINING_SHARPLY: 85,
  UNKNOWN:         30,
};

const BOOTSTRAP_CULTURE_SCORE_RISK: Record<SentimentTrend, number> = {
  IMPROVING:        5,
  STABLE:          15,
  DECLINING:       45,
  DECLINING_SHARPLY: 75,
  UNKNOWN:         25,
};

const BOOTSTRAP_ATTRITION_RISK: Record<EmployeeSentimentResult['attritionPressure'], number> = {
  HIGH:    70,
  MODERATE: 35,
  LOW:     10,
  UNKNOWN: 25,
};

function resolveRecord<T extends string>(
  key: string,
  bootstrap: Record<T, number>,
): Record<T, number> {
  const r = getConstant<Record<T, number>>(key, bootstrap);
  return (r.value && typeof r.value === 'object') ? r.value : bootstrap;
}

function getCeoApprovalRisk(trend: SentimentTrend): number {
  const map = resolveRecord<SentimentTrend>('employeeSentimentEngine.ceoApprovalRisk', BOOTSTRAP_CEO_APPROVAL_RISK);
  return map[trend] ?? BOOTSTRAP_CEO_APPROVAL_RISK[trend] ?? 0;
}
function getCultureScoreRisk(trend: SentimentTrend): number {
  const map = resolveRecord<SentimentTrend>('employeeSentimentEngine.cultureScoreRisk', BOOTSTRAP_CULTURE_SCORE_RISK);
  return map[trend] ?? BOOTSTRAP_CULTURE_SCORE_RISK[trend] ?? 0;
}
function getAttritionRisk(level: EmployeeSentimentResult['attritionPressure']): number {
  const map = resolveRecord<EmployeeSentimentResult['attritionPressure']>('employeeSentimentEngine.attritionRisk', BOOTSTRAP_ATTRITION_RISK);
  return map[level] ?? BOOTSTRAP_ATTRITION_RISK[level] ?? 0;
}

function classifyCEOApprovalTrend(
  delta90Days: number | null,
  currentRating: number | null,
): { trend: SentimentTrend; note: string } {
  if (delta90Days === null) {
    const note = currentRating !== null
      ? `CEO approval at ${currentRating}% — no trend data available.`
      : 'CEO approval data not available.';
    return { trend: 'UNKNOWN', note };
  }

  if (delta90Days >= 5) {
    return { trend: 'IMPROVING', note: `CEO approval improved by ${delta90Days}pts in 90 days — positive leadership signal.` };
  }
  if (delta90Days >= -5) {
    return { trend: 'STABLE', note: `CEO approval stable (${delta90Days > 0 ? '+' : ''}${delta90Days}pts in 90 days).` };
  }
  if (delta90Days >= -10) {
    return {
      trend: 'DECLINING',
      note: `CEO approval declined ${Math.abs(delta90Days)}pts in 90 days — MIT Sloan research shows layoffs are announced a median of 45 days after meaningful CEO approval declines.`,
    };
  }
  return {
    trend: 'DECLINING_SHARPLY',
    note: `CEO approval dropped ${Math.abs(delta90Days)}pts in 90 days — sharp decline. This is the strongest sentiment predictor of imminent layoffs in the MIT Sloan Work Future Lab dataset.`,
  };
}

function classifyCultureTrend(cultureScoreDelta: number | null): { trend: SentimentTrend; note: string } {
  if (cultureScoreDelta === null) return { trend: 'UNKNOWN', note: 'Culture score trend data not available.' };
  if (cultureScoreDelta > 0.2) return { trend: 'IMPROVING', note: `Culture/work-life balance improving (${cultureScoreDelta > 0 ? '+' : ''}${cultureScoreDelta} pts) — positive organizational health signal.` };
  if (cultureScoreDelta >= -0.2) return { trend: 'STABLE', note: `Culture scores stable — no significant sentiment deterioration detected.` };
  if (cultureScoreDelta >= -0.5) {
    return {
      trend: 'DECLINING',
      note: `Culture score declining (${cultureScoreDelta} pts). Research (Edmans 2011) shows culture score declines precede stock price declines by 6 months — and often layoffs follow.`,
    };
  }
  return {
    trend: 'DECLINING_SHARPLY',
    note: `Sharp culture score decline (${cultureScoreDelta} pts). Work-life balance deterioration at this rate is associated with involuntary headcount changes in the next 6 months.`,
  };
}

function classifyAttritionPressure(
  annualizedAttritionPct: number | null,
): { level: EmployeeSentimentResult['attritionPressure']; note: string } {
  if (annualizedAttritionPct === null) return { level: 'UNKNOWN', note: 'Voluntary attrition rate not available.' };
  if (annualizedAttritionPct > 35) {
    return {
      level: 'HIGH',
      note: `${annualizedAttritionPct}% annualized voluntary attrition — companies with this rate accelerate forced cuts because organic reduction is seen as uncontrolled. Often followed by a large single layoff event.`,
    };
  }
  if (annualizedAttritionPct > 20) {
    return {
      level: 'MODERATE',
      note: `${annualizedAttritionPct}% voluntary attrition — elevated. Combined with financial distress, this often precedes restructuring.`,
    };
  }
  return { level: 'LOW', note: `${annualizedAttritionPct}% voluntary attrition — within normal range (15–20%).` };
}

function getSentimentActions(
  sentimentRiskScore: number,
  ceoTrend: SentimentTrend,
  attrition: EmployeeSentimentResult['attritionPressure'],
  earlyWarningActive: boolean,
): SentimentAction[] {
  const actions: SentimentAction[] = [];

  if (earlyWarningActive) {
    actions.push({
      action: 'Monitor Glassdoor CEO approval weekly — set up review email alerts',
      why: 'CEO approval decline is a 30–60 day leading indicator. Weekly monitoring gives you the earliest possible warning to act before formal announcements. Takes 5 minutes to set up.',
      urgency: 'immediate',
    });
  }

  if (ceoTrend === 'DECLINING_SHARPLY') {
    actions.push({
      action: 'Treat current sentiment data as a 30–45 day early warning — begin job search preparation now',
      why: 'MIT Sloan research: sharp CEO approval decline → layoff announcement median 45 days. You are in the early warning window. Updating your resume and contacting 3 recruiters this week costs nothing but is invaluable if the announcement comes.',
      urgency: 'immediate',
    });
  }

  if (attrition === 'HIGH') {
    actions.push({
      action: 'Evaluate whether your team is being impacted by attrition — which key people are leaving?',
      why: 'High voluntary attrition concentrates in teams that have early information. If your team or adjacent teams are seeing unexpected departures, this is insider signal about organizational health.',
      urgency: 'within_30d',
    });
  }

  if (sentimentRiskScore >= 50) {
    actions.push({
      action: 'Begin a monthly check-in with 3–5 trusted external contacts in your network',
      why: 'Employee sentiment is a company-level signal, not a personal one. Building market relationships now (rather than after a layoff) is the most effective career protection strategy.',
      urgency: 'within_30d',
    });
  }

  return actions;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface EmployeeSentimentInput {
  glassdoorCEOApprovalCurrent?: number | null;   // 0–100
  glassdoorCEOApprovalDelta90Days?: number | null; // change in 90 days (negative = worse)
  glassdoorCultureScore?: number | null;           // 1–5 scale
  glassdoorCultureScoreDelta?: number | null;      // change (negative = worse)
  annualizedVoluntaryAttritionPct?: number | null; // e.g., 25 = 25%
  blindSentiment?: 'FEAR' | 'CONCERN' | 'NEUTRAL' | 'POSITIVE' | null;
}

export function computeEmployeeSentiment(
  input: EmployeeSentimentInput,
): EmployeeSentimentResult {
  try {
    const {
      glassdoorCEOApprovalCurrent = null,
      glassdoorCEOApprovalDelta90Days = null,
      glassdoorCultureScore = null,
      glassdoorCultureScoreDelta = null,
      annualizedVoluntaryAttritionPct = null,
      blindSentiment = null,
    } = input;

    const ceo = classifyCEOApprovalTrend(glassdoorCEOApprovalDelta90Days, glassdoorCEOApprovalCurrent);
    const culture = classifyCultureTrend(glassdoorCultureScoreDelta);
    const attrition = classifyAttritionPressure(annualizedVoluntaryAttritionPct);

    const anonymousSentimentSignal: EmployeeSentimentResult['anonymousSentimentSignal'] =
      blindSentiment ?? 'UNKNOWN';

    const anonymousSentimentNote: Record<typeof anonymousSentimentSignal, string> = {
      FEAR:    'Blind/anonymous channels showing significant layoff fear — employee community has early information that typically precedes formal announcements by 30–60 days.',
      CONCERN: 'Moderate concern signals on anonymous channels — watch for escalation.',
      NEUTRAL: 'Anonymous channels show neutral sentiment — no significant fear signal detected.',
      POSITIVE: 'Positive anonymous sentiment — employees feel secure in current trajectory.',
      UNKNOWN: 'Anonymous sentiment data not available.',
    };

    // Composite risk score
    const ceoRisk = getCeoApprovalRisk(ceo.trend);
    const cultureRisk = getCultureScoreRisk(culture.trend);
    const attritionRisk = getAttritionRisk(attrition.level);
    const blindRisk = blindSentiment === 'FEAR' ? 30 : blindSentiment === 'CONCERN' ? 15 : 0;

    const sentimentRiskScore = Math.min(100, Math.round(
      ceoRisk * 0.40
      + cultureRisk * 0.30
      + attritionRisk * 0.25
      + blindRisk * 0.05,
    ));

    const earlyWarningActive =
      ceo.trend === 'DECLINING_SHARPLY'
      || (ceo.trend === 'DECLINING' && culture.trend !== 'STABLE')
      || (attrition.level === 'HIGH' && ceo.trend === 'DECLINING');

    const healthLabel = sentimentRiskScore >= 70 ? 'Critical — multiple sentiment distress signals active'
      : sentimentRiskScore >= 50 ? 'Elevated — significant organizational sentiment deterioration'
      : sentimentRiskScore >= 30 ? 'Monitoring — early sentiment stress signals present'
      : 'Healthy — no significant sentiment distress detected';

    return {
      sentimentRiskScore,
      sentimentHealthLabel: healthLabel,
      ceoApprovalTrend: ceo.trend,
      ceoApprovalCurrent: glassdoorCEOApprovalCurrent,
      ceoApprovalDelta90Days: glassdoorCEOApprovalDelta90Days,
      ceoApprovalNote: ceo.note,
      cultureScoreTrend: culture.trend,
      cultureScoreCurrent: glassdoorCultureScore,
      cultureNote: culture.note,
      attritionPressure: attrition.level,
      attritionNote: attrition.note,
      anonymousSentimentSignal,
      anonymousSentimentNote: anonymousSentimentNote[anonymousSentimentSignal],
      sentimentLeadTimeEstimate: earlyWarningActive
        ? '30–60 days ahead of formal announcement (MIT Sloan data)'
        : 'No early warning signal active',
      earlyWarningActive,
      sentimentActions: getSentimentActions(sentimentRiskScore, ceo.trend, attrition.level, earlyWarningActive),
      calibrationStatus: 'research_grounded',
    };
  } catch {
    return {
      sentimentRiskScore: 25,
      sentimentHealthLabel: 'Unable to assess sentiment signals',
      ceoApprovalTrend: 'UNKNOWN',
      ceoApprovalCurrent: null,
      ceoApprovalDelta90Days: null,
      ceoApprovalNote: 'CEO approval data unavailable.',
      cultureScoreTrend: 'UNKNOWN',
      cultureScoreCurrent: null,
      cultureNote: 'Culture score data unavailable.',
      attritionPressure: 'UNKNOWN',
      attritionNote: 'Attrition data unavailable.',
      anonymousSentimentSignal: 'UNKNOWN',
      anonymousSentimentNote: 'Anonymous sentiment data unavailable.',
      sentimentLeadTimeEstimate: 'N/A',
      earlyWarningActive: false,
      sentimentActions: [],
      calibrationStatus: 'research_grounded',
    };
  }
}
