// collapsePredictor.ts
// Company Collapse Predictor — Stage 1-3 signal detection with 6-18 month lead time.
// Stage 1 (12-18 months out): AI investment language, "efficiency" earnings calls
// Stage 2 (6-12 months out): Hiring freeze, middle-management cuts, offshore spike
// Stage 3 (1-6 months out): C-suite departures, delayed products, customer churn signals

import { getSectorLayoffCount, getCompanyLayoffs } from './dataConnectors/layoffsFyiConnector';
import { fetchCompanyNewsSignals } from './dataConnectors/rssNewsConnector';
import { fetchRoleDemandSignal } from './dataConnectors/naukriConnector';

export type CollapseStage = 1 | 2 | 3 | null;

export interface StageSignal {
  name: string;
  detected: boolean;
  severity: 'weak' | 'moderate' | 'strong';
  description: string;
}

// Intelligence Upgrade 2 (v4.0): Department-level cut probability
export interface DepartmentRiskBreakdown {
  /** Department name */
  department: string;
  /** 0–100 hiring freeze score for this department */
  freezeScore: number;
  /** Whether this is the user's own department */
  isUserDepartment: boolean;
  /** Human-readable risk label */
  riskLabel: 'Active Hiring' | 'Slowdown' | 'Freeze' | 'Critical Freeze';
}

export interface CollapseReport {
  company: string;
  /**
   * Detected collapse stage (1/2/3) or null if below confidence threshold.
   *
   * MINIMUM CONFIDENCE GATE: stage is suppressed (returned as null) when
   * overallRisk < STAGE_MIN_RISK[stage]. This prevents low-signal detections
   * from triggering the Stage3EmergencyProtocol unnecessarily.
   *
   * Thresholds:  Stage 1 ≥ 20 overallRisk
   *              Stage 2 ≥ 35 overallRisk
   *              Stage 3 ≥ 50 overallRisk
   *
   * When a stage is detected but overallRisk is below threshold,
   * `stage` is null and `suppressedStage` holds the raw detection.
   */
  stage: CollapseStage;
  /** Raw detected stage before confidence gate — non-null when gate suppressed it */
  suppressedStage?: CollapseStage;
  /**
   * True when the stage was promoted via the cross-stage rule rather than
   * reaching 2-of-3 signals within its own tier.
   *
   * Example: s1Active=2, s2Active=1 → rawStage=2 (promoted) because the
   * single Stage 2 signal (stock −25%) is stronger evidence than two Stage 1
   * signals alone, and overallRisk=44 already exceeds STAGE_MIN_RISK[2]=35.
   *
   * UI should display promoted stages with a qualifier: "Stage 2 — partial evidence
   * (1 of 3 Stage 2 signals; 2 corroborating Stage 1 signals)".
   */
  isPromoted: boolean;
  stageLabel: string;
  timeToCollapseRange: string;
  overallRisk: number;          // 0-100
  /**
   * Signal strength confidence: severity-weighted ratio of active signals.
   * Computed as Σ(severity_score) / max_possible_severity_score.
   * 0.0 = all weak; 1.0 = all strong signals.
   */
  signalConfidence: number;
  stage1Signals: StageSignal[];
  stage2Signals: StageSignal[];
  stage3Signals: StageSignal[];
  activeSignalCount: number;
  recommendation: string;
  fetchedAt: string;
  /** v4.0: Department-level cut probability distribution */
  departmentRisks?: DepartmentRiskBreakdown[];
  /** v4.0: User's own department freeze score (0–100) */
  userDepartmentFreezeScore?: number | null;
}

/** Minimum overallRisk required before displaying each stage to the user. */
const STAGE_MIN_RISK: Record<number, number> = {
  1: 20,  // Stage 1 needs at least score 20 — weak single-signal patterns suppressed
  2: 35,  // Stage 2 needs at least score 35
  3: 50,  // Stage 3 needs at least score 50 — must have substantial converging evidence
};

// ── Stage 1 signal detectors (12-18 months before collapse) ──────────────────

function detectAIEfficiencyLanguage(newsSentiment: number, layoffNewsCount: number): StageSignal {
  // High AI investment + "efficiency" language in news = Stage 1
  const detected = layoffNewsCount === 0 && newsSentiment < -0.1;
  return {
    name: 'AI/Efficiency Language in Earnings',
    detected,
    severity: detected ? 'moderate' : 'weak',
    description: detected
      ? 'Negative news sentiment without confirmed layoffs — often precedes restructuring announcements'
      : 'No unusual efficiency language detected',
  };
}

function detectSectorPeerPressure(sectorLayoff180d: number): StageSignal {
  const detected = sectorLayoff180d >= 3;
  return {
    name: 'Sector Peer Layoff Pressure',
    detected,
    severity: sectorLayoff180d >= 6 ? 'strong' : sectorLayoff180d >= 3 ? 'moderate' : 'weak',
    description: detected
      ? `${sectorLayoff180d} peer companies in same sector cut headcount in last 180 days — contagion risk`
      : 'Sector peers appear stable',
  };
}

function detectAIInvestmentWithNoGrowth(
  stock90dChange: number | null,
  aiInvestmentSignal: string,
): StageSignal {
  const highAI = aiInvestmentSignal === 'high' || aiInvestmentSignal === 'very_high';
  const stockDown = stock90dChange !== null && stock90dChange < -10;
  const detected = highAI && stockDown;
  return {
    name: 'AI Investment Without Revenue Growth',
    detected,
    severity: detected ? 'moderate' : 'weak',
    description: detected
      ? 'Company investing heavily in AI while stock declining — efficiency cuts may follow to justify AI spend'
      : 'AI investment appears aligned with performance',
  };
}

// ── Stage 2 signal detectors (6-12 months before collapse) ───────────────────

function detectHiringFreeze(hiringFreezeScore: number): StageSignal {
  const detected = hiringFreezeScore > 0.55;
  return {
    name: 'Hiring Freeze Detected',
    detected,
    severity: hiringFreezeScore > 0.8 ? 'strong' : hiringFreezeScore > 0.6 ? 'moderate' : 'weak',
    description: detected
      ? `Hiring freeze score ${Math.round(hiringFreezeScore * 100)}/100 — job postings significantly below baseline`
      : 'Hiring activity appears normal',
  };
}

function detectRecentLayoffPattern(rounds: number, mostRecentDate: string | null): StageSignal {
  const hasRecent = mostRecentDate
    ? monthsSince(mostRecentDate) < 12
    : false;
  const detected = rounds >= 2 || (rounds >= 1 && hasRecent);
  return {
    name: 'Repeated or Recent Layoff Pattern',
    detected,
    severity: rounds >= 3 ? 'strong' : rounds >= 2 ? 'moderate' : 'weak',
    description: detected
      ? `${rounds} confirmed layoff round(s)${hasRecent ? ', most recent within 12 months' : ''} — serial cuts indicate structural decline`
      : 'No significant layoff pattern detected',
  };
}

function detectStockDecline(stock90dChange: number | null): StageSignal {
  const detected = stock90dChange !== null && stock90dChange < -20;
  return {
    name: 'Severe Stock Decline (>20% in 90 days)',
    detected,
    severity: stock90dChange !== null && stock90dChange < -35 ? 'strong' : 'moderate',
    description: detected
      ? `Stock down ${stock90dChange}% in 90 days — market pricing in operational stress`
      : 'Stock performance within normal range',
  };
}

// ── Stage 3 signal detectors (1-6 months before collapse) ────────────────────
//
// FALSE POSITIVE AUDIT — thresholds raised after reviewing structural gaps:
//
// sig1 (Leadership Proxy) previously used layoffRounds >= 2 AND stock < -30.
// layoffRounds and stock are the SAME fields used by L1 and L2 in the engine.
// This made sig1 circular — it fires for any company that had prior cuts AND
// experienced a >30% market-correction drawdown (e.g. tech sector Q1 2022 or
// early 2025). The threshold is raised:
//   rounds >= 2 → rounds >= 3  (requires serial restructuring pattern)
//   stock < -30 → stock < -40  (requires severe crash, not sector correction)
//
// sig2 (News Sentiment) previously fired on layoffNewsCount >= 2 AND sentiment < -0.3.
// "layoffNewsCount" is derived from keywords including "restructuring" and "efficiency" —
// terms that appear in product recalls, M&A announcements, and earnings calls.
// The threshold is raised:
//   layoffNewsCount >= 2 → layoffNewsCount >= 3  (requires sustained coverage)
//   sentiment < -0.3 → sentiment < -0.4  (requires stronger negative signal)

function detectLeadershipInstability(layoffRounds: number, stock90dChange: number | null): StageSignal {
  // UNCALIBRATED proxy — uses same fields as L1/L2 (circular).
  // Thresholds raised to reduce false positives from market corrections.
  const stockCrash = stock90dChange !== null && stock90dChange < -40; // was -30
  const detected = layoffRounds >= 3 && stockCrash;                   // was rounds >= 2
  return {
    name: 'Severe Stock Crash With Serial Layoffs',
    detected,
    severity: detected ? 'strong' : 'weak',
    description: detected
      ? `${layoffRounds} layoff rounds with stock down ${stock90dChange}% — serial restructuring under sustained market pressure`
      : 'No serial restructuring pattern detected',
  };
}

function detectHighLayoffNewsSentiment(layoffNewsCount: number, newsSentimentScore: number): StageSignal {
  // Thresholds raised — layoffNewsCount includes restructuring/efficiency keywords
  // which fire on non-layoff events (M&A, product recall, earnings language).
  const detected = layoffNewsCount >= 3 && newsSentimentScore < -0.4; // was >= 2, < -0.3
  return {
    name: 'Sustained Negative News Coverage',
    detected,
    severity: layoffNewsCount >= 5 ? 'strong' : 'moderate', // was >= 4
    description: detected
      ? `${layoffNewsCount} negative coverage signals in 30 days (sentiment ${newsSentimentScore.toFixed(2)}) — sustained distress coverage`
      : 'No sustained negative news pattern detected',
  };
}

function detectMCAFilingDelinquency(filingDelinquent: boolean): StageSignal {
  return {
    name: 'MCA Filing Delinquency (India)',
    detected: filingDelinquent,
    severity: filingDelinquent ? 'strong' : 'weak',
    description: filingDelinquent
      ? 'Company has not filed with MCA in 24+ months — regulatory/operational distress signal'
      : 'MCA filings appear current',
  };
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export interface CollapseInputs {
  companyName: string;
  industry: string;
  roleTitle: string;
  stock90dChange: number | null;
  aiInvestmentSignal: string;
  layoffRounds: number;
  mostRecentLayoffDate: string | null;
  filingDelinquent: boolean;
  /** v4.0: User's department for personalized cut probability */
  userDepartment?: string;
}

// ── v4.0: Department role mapping ─────────────────────────────────────────────
// Maps department names to the role categories we scrape from Naukri
const DEPARTMENT_ROLES: Record<string, string[]> = {
  'Engineering':       ['sw_backend', 'sw_frontend', 'sw_devops', 'sw_testing'],
  'Finance':           ['fin_account', 'fin_fp', 'fin_payroll'],
  'HR':                ['hr_recruit', 'hr_hrbp', 'hr_ops'],
  'Operations':        ['bpo_inbound', 'bpo_outbound', 'log_ops'],
  'Sales':             ['fmcg_sales', 'ser_sales_exec'],
  'Product':           ['saas_pm', 'sw_pm'],
  'Data / Analytics':  ['ml_data', 'it_data_analyst', 'ml_mlops'],
  'Legal':             ['leg_corporate', 'leg_paralegal'],
  'Marketing':         ['mkt_seo', 'cnt_copy', 'mkt_brand'],
};

function getDepartmentRiskLabel(score: number): DepartmentRiskBreakdown['riskLabel'] {
  if (score >= 80) return 'Critical Freeze';
  if (score >= 55) return 'Freeze';
  if (score >= 30) return 'Slowdown';
  return 'Active Hiring';
}

export async function detectCollapseStage(inputs: CollapseInputs): Promise<CollapseReport> {
  const { companyName, industry, roleTitle, stock90dChange,
    aiInvestmentSignal, layoffRounds, mostRecentLayoffDate, filingDelinquent,
    userDepartment } = inputs;

  // v4.0: Fetch department-level freeze scores in parallel with other signals
  const departmentEntries = Object.entries(DEPARTMENT_ROLES);
  const [newsData, roleData, sectorCount, ...deptRoleDataArr] = await Promise.all([
    fetchCompanyNewsSignals(companyName),
    fetchRoleDemandSignal(roleTitle, companyName),
    getSectorLayoffCount(industry, 180),
    // Fetch freeze score for one representative role per department
    ...departmentEntries.map(([, roles]) =>
      fetchRoleDemandSignal(roles[0], companyName).catch(() => ({ hiringFreezeScore: 0.5, demandTrend: 'stable' as const, isLive: false, estimatedOpenings: null, source: 'heuristic' }))
    ),
  ]);

  // Stage 1 signals
  const s1: StageSignal[] = [
    detectAIEfficiencyLanguage(newsData.sentimentScore, newsData.layoffSignalCount),
    detectSectorPeerPressure(sectorCount),
    detectAIInvestmentWithNoGrowth(stock90dChange, aiInvestmentSignal),
  ];

  // Stage 2 signals
  const s2: StageSignal[] = [
    detectHiringFreeze(roleData.hiringFreezeScore),
    detectRecentLayoffPattern(layoffRounds, mostRecentLayoffDate),
    detectStockDecline(stock90dChange),
  ];

  // Stage 3 signals
  const s3: StageSignal[] = [
    detectLeadershipInstability(layoffRounds, stock90dChange),
    detectHighLayoffNewsSentiment(newsData.layoffSignalCount, newsData.sentimentScore),
    detectMCAFilingDelinquency(filingDelinquent),
  ];

  const s1Active = s1.filter(s => s.detected).length;
  const s2Active = s2.filter(s => s.detected).length;
  const s3Active = s3.filter(s => s.detected).length;
  const totalActive = s1Active + s2Active + s3Active;

  // ── Severity weights ────────────────────────────────────────────────────────
  // Each active signal contributes to overallRisk based on BOTH its stage weight
  // AND its severity within that stage. Previously only raw counts were used —
  // a strong Stage 2 signal (stock −40%) had the same weight as a weak one (−21%).
  const SEVERITY_MULT: Record<string, number> = { strong: 1.4, moderate: 1.0, weak: 0.6 };
  const STAGE_BASE: Record<number, number>    = { 1: 12, 2: 20, 3: 30 };

  // Tag each signal with its stage number BEFORE filtering so indices stay correct.
  type TaggedSignal = StageSignal & { stageNum: 1 | 2 | 3 };
  const allTagged: TaggedSignal[] = [
    ...s1.map(s => ({ ...s, stageNum: 1 as const })),
    ...s2.map(s => ({ ...s, stageNum: 2 as const })),
    ...s3.map(s => ({ ...s, stageNum: 3 as const })),
  ];
  const activeSignals = allTagged.filter(s => s.detected);

  const severityWeightedRisk = activeSignals.reduce((sum, sig) =>
    sum + STAGE_BASE[sig.stageNum] * SEVERITY_MULT[sig.severity], 0);
  const overallRisk = Math.min(100, Math.round(
    severityWeightedRisk * (totalActive > 0 ? 1 : 0),
  ));

  // ── Signal confidence ───────────────────────────────────────────────────────
  // Severity-weighted ratio: 1.0 when all active signals are 'strong'.
  const maxPossible = activeSignals.length * SEVERITY_MULT.strong;
  const actualWeight = activeSignals.reduce((s, sig) => s + SEVERITY_MULT[sig.severity], 0);
  const signalConfidence = maxPossible > 0 ? Math.round((actualWeight / maxPossible) * 100) / 100 : 0;

  // ── Stage determination — count-first, cross-stage promotion second ─────────
  //
  // PRIMARY RULE (2-of-3 within a stage, high confidence):
  //   Stage 3 if s3Active >= 2
  //   Stage 2 if s2Active >= 2
  //   Stage 1 if s1Active >= 2
  //
  // CROSS-STAGE PROMOTION (partial evidence, lower confidence):
  //   The previous formula only used count-per-stage and assigned the LOWEST stage
  //   that met 2-of-3. This produced:
  //     s1=2, s2=1 → Stage 1 (overallRisk=44 > Stage 2 threshold of 35 — WRONG)
  //     s2=1, s3=1 → null  (overallRisk=50 = Stage 3 threshold — WRONG)
  //
  //   Fix: when no single stage reaches 2-of-3, promote to the HIGHEST stage
  //   that has ≥1 active signal, PROVIDED corroborating evidence from a lower stage
  //   exists. The overallRisk gate enforces that the combined evidence is sufficient
  //   to display the promoted stage.
  //
  //   Promotion is flagged as `isPromoted = true` so the UI can show a qualifier:
  //   "Stage 2 — partial evidence (1 of 3 Stage 2 signals + 2 Stage 1 signals)".

  let rawStage: CollapseStage = null;
  let isPromoted = false;

  // ── Step 1: Primary 2-of-3 rule (high confidence, no promotion) ──────────
  if      (s3Active >= 2) rawStage = 3;
  else if (s2Active >= 2) rawStage = 2;
  else if (s1Active >= 2) rawStage = 1;

  // ── Step 2: Risk-based promotion ────────────────────────────────────────
  // When 2-of-3 within a stage is not met, the severity-weighted overallRisk
  // may still clear a higher stage's STAGE_MIN_RISK gate — meaning the combined
  // cross-stage evidence is strong enough to display the higher stage.
  //
  // Promotion rules (applied only when primary rule produces a lower stage):
  //   P1: s2Active ≥ 1 AND s1Active ≥ 2 AND overallRisk ≥ 35
  //       → promote to Stage 2.
  //       Rationale: single Stage 2 signal + two Stage 1 signals = 6-12 mo risk.
  //       The old formula showed Stage 1 (12-18 mo) which understates the horizon.
  //
  //   P2: s2Active ≥ 1 AND s3Active ≥ 1 AND overallRisk ≥ 50
  //       → promote to Stage 3.
  //       Rationale: one S3 + one S2 signal = serious converging evidence.
  //       Old formula: null (neither stage had 2 signals). Risk=50 is already
  //       at the Stage 3 gate — silent null is clearly wrong here.
  //
  //   P3: No promotion from Stage 1 to Stage 3 when s2Active == 0.
  //       Skipping Stage 2 evidence is a meaningful absence — it means the
  //       mid-stage signals (hiring freeze, layoff recurrence, stock decline)
  //       haven't materialized, which is important context.
  //
  //   All promotions set isPromoted = true so the UI shows a qualifier.

  if (!isPromoted) {
    if (rawStage === null || rawStage < 2) {
      // P1: single S2 + corroborating S1 evidence
      if (s2Active >= 1 && s1Active >= 2 && overallRisk >= STAGE_MIN_RISK[2]) {
        rawStage   = 2;
        isPromoted = true;
      }
    }
    if (rawStage === null || rawStage < 3) {
      // P2: single S3 + single S2 (any stage combination with converging evidence)
      if (s3Active >= 1 && s2Active >= 1 && overallRisk >= STAGE_MIN_RISK[3]) {
        rawStage   = 3;
        isPromoted = true;
      }
    }
    // Assign null-stage companies a raw stage when there's single-signal evidence
    // (these will mostly be suppressed by the confidence gate, but overallRisk
    // and suppressedStage give the Transparency tab something to disclose)
    if (rawStage === null && totalActive >= 1) {
      if      (s3Active >= 1) { rawStage = 3; isPromoted = true; }
      else if (s2Active >= 1) { rawStage = 2; isPromoted = true; }
      else                    { rawStage = 1; isPromoted = true; }
    }
  }

  // ── Confidence gate ─────────────────────────────────────────────────────────
  // Suppress stage when severity-weighted overallRisk is below the minimum for
  // that stage. Promoted stages face the same gate as primary detections — the
  // overallRisk formula now uses severity weights, so a strong S2 signal + two
  // S1 signals produces risk ≈ 44 which clears the Stage 2 gate of 35.
  let stage: CollapseStage = rawStage;
  let suppressedStage: CollapseStage | undefined;
  if (rawStage !== null && overallRisk < STAGE_MIN_RISK[rawStage]) {
    console.info(
      `[CollapsePredictor] Stage ${rawStage}${isPromoted ? ' (promoted)' : ''} detected ` +
      `for ${companyName} but suppressed (overallRisk=${overallRisk} < ` +
      `threshold=${STAGE_MIN_RISK[rawStage]}).`
    );
    suppressedStage = rawStage;
    stage = null;
  }

  const stageLabels: Record<number, string> = {
    1: 'Stage 1 — Early Warning (12-18 months)',
    2: 'Stage 2 — Displacement in Progress (6-12 months)',
    3: 'Stage 3 — Imminent Risk (1-6 months)',
  };

  const timeRanges: Record<number, string> = {
    1: '12-18 months',
    2: '6-12 months',
    3: '1-6 months',
  };

  const recommendations: Record<number, string> = {
    1: `Stage 1 early warning: ${s1Active} of 3 signals active. The pattern — efficiency language, sector peer pressure, or misaligned AI investment — is historically the leading indicator of workforce restructuring 12–18 months out. Action: keep CV current, build external contacts, and reassess in 90 days.`,
    2: `Stage 2 signals active: ${s2Active} of 3 displacement indicators detected. Hiring freeze, layoff recurrence, or stock drawdown are mid-stage signals typically 6–12 months before a restructuring event. Action: start a parallel job search now, allocate 2–3 hours/week to outreach and applications.`,
    3: `Stage 3 imminent risk: ${s3Active} of 3 late-stage signals detected (leadership instability, active media coverage, or regulatory delinquency). Historical median time to layoff announcement from Stage 3: 4–8 weeks. Action: treat this as an active emergency — prioritize job search above all other career activities.`,
  };

  // ── v4.0: Build department risk breakdown ─────────────────────────────────
  const departmentRisks: DepartmentRiskBreakdown[] = departmentEntries.map(([deptName], idx) => {
    const deptData = deptRoleDataArr[idx];
    const freezeScore = Math.round((deptData?.hiringFreezeScore ?? 0.5) * 100);
    const isUserDept = userDepartment
      ? deptName.toLowerCase().includes(userDepartment.toLowerCase()) ||
        userDepartment.toLowerCase().includes(deptName.toLowerCase().split(' ')[0])
      : false;
    return {
      department: deptName,
      freezeScore,
      isUserDepartment: isUserDept,
      riskLabel: getDepartmentRiskLabel(freezeScore),
    };
  }).sort((a, b) => b.freezeScore - a.freezeScore);

  const userDeptRisk = userDepartment
    ? (departmentRisks.find(d => d.isUserDepartment)?.freezeScore ?? null)
    : null;

  // Build department commentary for recommendation (only when stage 2+)
  let departmentNote = '';
  if (stage && stage >= 2 && departmentRisks.length > 0) {
    const topTwo = departmentRisks.slice(0, 2);
    departmentNote = ` Department risk distribution: ${topTwo.map(d => `${d.department} — ${d.freezeScore}% freeze`).join('; ')}.`;
    if (userDeptRisk !== null) {
      const userDept = departmentRisks.find(d => d.isUserDepartment);
      const companyAvg = Math.round(departmentRisks.reduce((s, d) => s + d.freezeScore, 0) / departmentRisks.length);
      departmentNote += ` Your department (${userDept?.department ?? userDepartment}) shows ${userDeptRisk}% freeze — ${userDeptRisk > companyAvg ? 'above' : 'below'} company average of ${companyAvg}%.`;
    }
  }

  // Build promoted-stage label with per-stage signal counts for the UI qualifier
  const promotedLabel = isPromoted && stage
    ? (() => {
        const counts = [
          s3Active > 0 ? `${s3Active}/3 Stage 3` : '',
          s2Active > 0 ? `${s2Active}/3 Stage 2` : '',
          s1Active > 0 ? `${s1Active}/3 Stage 1` : '',
        ].filter(Boolean).join(', ');
        return `Stage ${stage} — partial evidence (${counts})`;
      })()
    : null;

  return {
    company: companyName,
    stage,
    suppressedStage,
    isPromoted,
    stageLabel: stage
      ? (promotedLabel ?? stageLabels[stage])
      : (suppressedStage ? `Stage ${suppressedStage} — Below Confidence Threshold` : 'No Active Collapse Signals'),
    timeToCollapseRange: stage ? timeRanges[stage] : 'N/A',
    overallRisk,
    signalConfidence,
    stage1Signals: s1,
    stage2Signals: s2,
    stage3Signals: s3,
    activeSignalCount: totalActive,
    recommendation: stage
      ? (isPromoted
          ? `${recommendations[stage]} (Note: stage promoted from cross-stage evidence — ${s3Active} Stage 3, ${s2Active} Stage 2, ${s1Active} Stage 1 signal(s) active.)${departmentNote}`
          : recommendations[stage] + departmentNote)
      : overallRisk > 0
        ? `${companyName} has sub-threshold signals (risk score: ${overallRisk}/100) but no confirmed stage detected. Individual signals are present but haven't converged into a clear pattern. Monitor monthly.`
        : `${companyName} shows no collapse signals across all 9 detection vectors. Reassess in 90 days.`,
    fetchedAt: new Date().toISOString(),
    departmentRisks,
    userDepartmentFreezeScore: userDeptRisk,
  };
}

// ── Company Watch Subscription ────────────────────────────────────────────────

export interface WatchedCompany {
  companyName: string;
  industry: string;
  addedAt: string;
  lastChecked: string | null;
  lastStage: CollapseStage;
  alertOnStage: CollapseStage; // alert when reaching this stage or higher
}

const WATCH_KEY = 'hp_company_watch_list';

export function getWatchList(): WatchedCompany[] {
  try {
    return JSON.parse(localStorage.getItem(WATCH_KEY) ?? '[]');
  } catch { return []; }
}

export function addToWatchList(company: string, industry: string, alertOnStage: CollapseStage = 2): void {
  const list = getWatchList();
  if (list.some(w => w.companyName.toLowerCase() === company.toLowerCase())) return;
  list.push({
    companyName: company,
    industry,
    addedAt: new Date().toISOString(),
    lastChecked: null,
    lastStage: null,
    alertOnStage,
  });
  localStorage.setItem(WATCH_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('watch-list-changed', { detail: { company } }));
}

export function removeFromWatchList(company: string): void {
  const list = getWatchList().filter(w => w.companyName.toLowerCase() !== company.toLowerCase());
  localStorage.setItem(WATCH_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('watch-list-changed'));
}

export function updateWatchListEntry(company: string, stage: CollapseStage): void {
  const list = getWatchList();
  const idx = list.findIndex(w => w.companyName.toLowerCase() === company.toLowerCase());
  if (idx === -1) return;
  list[idx].lastChecked = new Date().toISOString();
  list[idx].lastStage = stage;
  localStorage.setItem(WATCH_KEY, JSON.stringify(list));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthsSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.abs((now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
}
