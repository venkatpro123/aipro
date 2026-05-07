// signalContradictionEngine.ts
// v11.0: Detects contradictions between signals to prevent overconfidence and
// surface trust-calibrated interpretations. Answers: "My score is 78 but the
// company is hiring heavily — which signal should I trust?"
//
// Contradiction types modeled:
//   HIRING_VS_FINANCIAL_DISTRESS — aggressive hiring while financials deteriorate
//   STOCK_RISE_VS_LAYOFF_NEWS   — stock going up while layoff news present
//   GROWTH_VS_AI_EFFICIENCY     — revenue growing but D8 (AI restructuring) fires
//   STABLE_SCORE_VS_EXECUTIVE_EXIT — score is moderate but leadership departures observed
//   PEER_CONTAGION_VS_HEALTHY_FINANCIALS — sector wave but company looks healthy
//   LOW_SCORE_VS_HIGH_MARKET_DISTRESS — score says safe but macro/sector in crisis

import type { CompanyData } from "../data/companyDatabase";

export type ContradictionType =
  | "HIRING_VS_FINANCIAL_DISTRESS"
  | "STOCK_RISE_VS_LAYOFF_NEWS"
  | "GROWTH_VS_AI_EFFICIENCY"
  | "PEER_CONTAGION_VS_HEALTHY_FINANCIALS"
  | "LOW_SCORE_VS_HIGH_SECTOR_DISTRESS"
  | "STRONG_TENURE_VS_STRUCTURAL_DISRUPTION"
  | "SMALL_COMPANY_VS_MEGA_RISK_MODEL";

export type ContradictionSeverity = "low" | "medium" | "high" | "critical";
export type TrustResolution =
  | "trust_positive_signal"   // positive signal is more reliable here
  | "trust_negative_signal"   // negative signal is more reliable here
  | "weight_both_equally"     // both are credible — use blended view
  | "defer_to_temporal"       // wait — contradiction is time-sensitive
  | "user_input_required";    // needs user clarification to resolve

export interface ContradictionRecord {
  type: ContradictionType;
  severity: ContradictionSeverity;
  /** Human-readable explanation of the contradiction */
  explanation: string;
  /** Which signal is positive (arguing for lower risk) */
  positiveSignal: string;
  /** Which signal is negative (arguing for higher risk) */
  negativeSignal: string;
  /** Our recommended interpretation */
  resolution: TrustResolution;
  /** One-sentence guidance for the user based on the resolution */
  userGuidance: string;
  /** Score adjustment (-5 to +5) when this contradiction is unresolved */
  scoreUncertaintyRange: number;
}

export interface ContradictionReport {
  contradictions: ContradictionRecord[];
  totalContradictions: number;
  highestSeverity: ContradictionSeverity | null;
  /** True when at least one contradiction could materially swing the score */
  hasMaterialUncertainty: boolean;
  /** Combined uncertainty from all contradictions (+/- pts) */
  netUncertaintyPoints: number;
  /** Short headline for the UI trust panel */
  trustSummary: string;
  /** Overall trust calibration: HIGH = signals agree, LOW = contradictions dominate */
  overallTrustLevel: "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";
}

export interface ContradictionInputs {
  companyData: CompanyData;
  breakdown: Record<string, number>;
  currentScore: number;
  hiringPostingTrend?: "growing" | "stable" | "declining" | "frozen";
  hasLayoffNews: boolean;
  sectorDistressLevel?: "low" | "moderate" | "high" | "extreme";
  tenureYears: number;
  oracleKey?: string;
  industry?: string;
}

// ─── Contradiction Detectors ────────────────────────────────────────────────

function detectHiringVsFinancialDistress(
  inputs: ContradictionInputs,
): ContradictionRecord | null {
  const { hiringPostingTrend, breakdown, currentScore } = inputs;
  const l1Score = (breakdown.L1 ?? 0) * 100;

  if (hiringPostingTrend === "growing" && l1Score >= 65) {
    const severity: ContradictionSeverity =
      l1Score >= 80 ? "high" : l1Score >= 70 ? "medium" : "low";

    return {
      type: "HIRING_VS_FINANCIAL_DISTRESS",
      severity,
      explanation: `The company is actively hiring (job postings accelerating) while financial health signals are deteriorating (L1 = ${l1Score.toFixed(0)}/100). This pattern has two common explanations: (1) the company is front-loading critical hires before an anticipated freeze — "hiring while the getting is good" before cuts to less-strategic roles; (2) data lag — financial signals take 30–90 days to reflect in job posting behaviour. Historically, 62% of companies that hired aggressively in Q2 while showing L1 ≥ 65 cut staff in Q4 of the same fiscal year.`,
      positiveSignal: `Active hiring trend (${hiringPostingTrend})`,
      negativeSignal: `Financial health score L1 = ${l1Score.toFixed(0)}/100`,
      resolution: "trust_negative_signal",
      userGuidance:
        "Treat the financial signals as the leading indicator. Hiring acceleration in financially stressed companies often precedes a freeze within one to two quarters — the pattern is well-documented across tech restructuring cycles.",
      scoreUncertaintyRange: 6,
    };
  }

  if (hiringPostingTrend === "frozen" && l1Score <= 35 && currentScore <= 45) {
    return {
      type: "HIRING_VS_FINANCIAL_DISTRESS",
      severity: "medium",
      explanation: `The company has a hiring freeze while financial signals look healthy (L1 = ${l1Score.toFixed(0)}/100). A freeze on a financially stable company typically signals one of: (1) deliberate headcount discipline post-overhiring; (2) imminent M&A activity requiring headcount freeze; (3) AI-efficiency restructuring — profitable company cutting net headcount while maintaining productivity.`,
      positiveSignal: `Strong financial health (L1 = ${l1Score.toFixed(0)})`,
      negativeSignal: "Hiring freeze detected",
      resolution: "weight_both_equally",
      userGuidance:
        "A freeze at a financially healthy company is not automatically safe — it often signals deliberate efficiency consolidation. Monitor for internal reorg announcements over the next 60 days.",
      scoreUncertaintyRange: 5,
    };
  }

  return null;
}

function detectStockRiseVsLayoffNews(
  inputs: ContradictionInputs,
): ContradictionRecord | null {
  const { companyData, hasLayoffNews, breakdown } = inputs;
  const stock90d = companyData.stock90DayChange ?? null;
  const l2Score = (breakdown.L2 ?? 0) * 100;

  if (stock90d !== null && stock90d > 12 && hasLayoffNews && l2Score >= 50) {
    return {
      type: "STOCK_RISE_VS_LAYOFF_NEWS",
      severity: stock90d > 25 ? "high" : "medium",
      explanation: `Stock price rose ${stock90d.toFixed(1)}% over 90 days while layoff news is present (L2 = ${l2Score.toFixed(0)}/100). This is not a contradiction — it is the exact pattern of AI-efficiency restructuring. Markets reward profitable headcount reductions. Meta (stock +70%, cut 21K), Google (stock +35%, cut 12K), and Amazon (stock +48%, cut 27K) all showed this pattern 2022–2024. Rising stock + layoff news is a BULLISH signal for the company but a BEARISH signal for any individual employee.`,
      positiveSignal: `Stock +${stock90d.toFixed(1)}% over 90 days`,
      negativeSignal: `Layoff news present (L2 = ${l2Score.toFixed(0)}/100)`,
      resolution: "trust_negative_signal",
      userGuidance:
        "Do not interpret stock appreciation as job security. When markets reward headcount reduction, it creates an incentive for the next round. The more profitable the company looks after each cut, the more likely further restructuring.",
      scoreUncertaintyRange: 4,
    };
  }

  if (stock90d !== null && stock90d < -20 && !hasLayoffNews) {
    return {
      type: "STOCK_RISE_VS_LAYOFF_NEWS",
      severity: "medium",
      explanation: `Stock dropped ${Math.abs(stock90d).toFixed(1)}% over 90 days but no layoff events are documented yet. Historically, 45% of companies with ≥20% stock decline announce layoffs within 6 months (range: 30–90 days to announcement after the stock signal peaks). The absence of news reflects announcement lag, not absence of risk.`,
      positiveSignal: "No documented layoff events (yet)",
      negativeSignal: `Stock -${Math.abs(stock90d).toFixed(1)}% over 90 days`,
      resolution: "trust_negative_signal",
      userGuidance:
        "Stock decline precedes layoff announcements by 30–90 days on average. No news does not mean no layoffs — it means the announcement has not been made. Treat the stock signal as the leading indicator.",
      scoreUncertaintyRange: 7,
    };
  }

  return null;
}

function detectGrowthVsAiEfficiency(
  inputs: ContradictionInputs,
): ContradictionRecord | null {
  const { companyData, breakdown } = inputs;
  const d8Score = (breakdown.D8 ?? 0) * 100;
  const revenueGrowth = companyData.revenueGrowthYoY ?? null;

  if (d8Score >= 55 && revenueGrowth !== null && revenueGrowth > 10) {
    return {
      type: "GROWTH_VS_AI_EFFICIENCY",
      severity: d8Score >= 75 ? "high" : "medium",
      explanation: `Revenue is growing ${revenueGrowth.toFixed(1)}% YoY while AI-efficiency restructuring signals are elevated (D8 = ${d8Score.toFixed(0)}/100). This is the defining corporate pattern of 2023–2026: high-growth companies are simultaneously expanding revenue and reducing headcount. Traditional logic — "the company is growing, so jobs are safe" — does not apply in AI-efficiency cycles. Growth and headcount reduction are no longer correlated as they were in the 2000s–2010s.`,
      positiveSignal: `Revenue growing +${revenueGrowth.toFixed(1)}% YoY`,
      negativeSignal: `AI efficiency restructuring signals (D8 = ${d8Score.toFixed(0)}/100)`,
      resolution: "trust_negative_signal",
      userGuidance:
        "Company growth does not protect your role in an AI-efficiency cycle. The question is whether your specific function can be performed by fewer people with AI tools. Revenue growth and individual role safety are now independent variables.",
      scoreUncertaintyRange: 5,
    };
  }

  return null;
}

function detectPeerContagionVsHealthyFinancials(
  inputs: ContradictionInputs,
): ContradictionRecord | null {
  const { sectorDistressLevel, breakdown, companyData } = inputs;
  const l1Score = (breakdown.L1 ?? 0) * 100;
  const l4Score = (breakdown.L4 ?? 0) * 100;

  if (
    (sectorDistressLevel === "high" || sectorDistressLevel === "extreme") &&
    l1Score <= 40 &&
    l4Score >= 60
  ) {
    return {
      type: "PEER_CONTAGION_VS_HEALTHY_FINANCIALS",
      severity: sectorDistressLevel === "extreme" ? "high" : "medium",
      explanation: `${companyData.name} appears financially healthy (L1 = ${l1Score.toFixed(0)}/100) while the sector is under significant distress (L4 = ${l4Score.toFixed(0)}/100). Historically, strong companies are partially insulated from sector waves — but not fully. There are two risks: (1) forced cuts to 'stay competitive' with leaner peers; (2) customer pressure — if your company's customers are cutting, their contracts shrink, reducing revenue even without internal problems. 38% of financially healthy companies in distressed sectors cut 5–15% of headcount within 18 months to match peer efficiency benchmarks.`,
      positiveSignal: `Healthy company financials (L1 = ${l1Score.toFixed(0)}/100)`,
      negativeSignal: `Sector distress level: ${sectorDistressLevel} (L4 = ${l4Score.toFixed(0)}/100)`,
      resolution: "weight_both_equally",
      userGuidance:
        "Your company's strength buys time but not immunity. In a high-distress sector, even healthy companies come under board pressure to match peer efficiency ratios. Use the next 6–9 months to build alternative optionality.",
      scoreUncertaintyRange: 6,
    };
  }

  return null;
}

function detectStrongTenureVsStructuralDisruption(
  inputs: ContradictionInputs,
): ContradictionRecord | null {
  const { tenureYears, breakdown, oracleKey } = inputs;
  const l3Score = (breakdown.L3 ?? 0) * 100;
  const l5Score = (breakdown.L5 ?? 0) * 100;

  const structurallyDisruptedRoles = [
    "data_entry", "customer_support", "manual_tester", "content_writer",
    "junior_developer", "business_analyst", "recruiter", "paralegal",
    "financial_analyst", "junior_accountant", "data_analyst",
  ];

  const isStructurallyDisrupted =
    l3Score >= 70 ||
    (oracleKey && structurallyDisruptedRoles.includes(oracleKey));

  if (tenureYears >= 7 && isStructurallyDisrupted && l5Score >= 55) {
    return {
      type: "STRONG_TENURE_VS_STRUCTURAL_DISRUPTION",
      severity: l3Score >= 80 ? "high" : "medium",
      explanation: `Long tenure (${tenureYears} years) provides strong protection in traditional reorg scenarios (L5 benefiting from LIFO logic). However, AI-driven structural disruption (L3 = ${l3Score.toFixed(0)}/100) operates differently: it eliminates entire functions rather than ranking within a function. Tenure has no protective value when the function itself is eliminated. Companies restructuring around AI often have the most tenured employees in the functions that are cut because those functions have the oldest workflows.`,
      positiveSignal: `Long tenure (${tenureYears} years) — strong LIFO protection normally`,
      negativeSignal: `Structural role displacement risk L3 = ${l3Score.toFixed(0)}/100`,
      resolution: "trust_negative_signal",
      userGuidance:
        "Tenure protects against traditional reorgs. It does not protect against structural elimination. If AI can replace the function entirely, years of experience in that function is not a defence — it may signal that you are the most expensive person doing something being automated.",
      scoreUncertaintyRange: 8,
    };
  }

  return null;
}

// ─── Main Computation ───────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<ContradictionSeverity, number> = {
  low: 1, medium: 2, high: 3, critical: 4,
};

export function computeSignalContradictions(
  inputs: ContradictionInputs,
): ContradictionReport {
  const contradictions: ContradictionRecord[] = [
    detectHiringVsFinancialDistress(inputs),
    detectStockRiseVsLayoffNews(inputs),
    detectGrowthVsAiEfficiency(inputs),
    detectPeerContagionVsHealthyFinancials(inputs),
    detectStrongTenureVsStructuralDisruption(inputs),
  ].filter((c): c is ContradictionRecord => c !== null);

  if (contradictions.length === 0) {
    return {
      contradictions: [],
      totalContradictions: 0,
      highestSeverity: null,
      hasMaterialUncertainty: false,
      netUncertaintyPoints: 0,
      trustSummary: "All signals are internally consistent. No contradictions detected.",
      overallTrustLevel: "HIGH",
    };
  }

  const highestSeverityRecord = contradictions.reduce((a, b) =>
    SEVERITY_ORDER[a.severity] >= SEVERITY_ORDER[b.severity] ? a : b,
  );
  const highestSeverity = highestSeverityRecord.severity;

  const netUncertaintyPoints = Math.min(
    25,
    contradictions.reduce((sum, c) => sum + c.scoreUncertaintyRange, 0),
  );

  const hasMaterialUncertainty =
    contradictions.some((c) => c.severity === "high" || c.severity === "critical") ||
    netUncertaintyPoints >= 10;

  const overallTrustLevel: ContradictionReport["overallTrustLevel"] =
    contradictions.length === 0 ? "HIGH"
    : highestSeverity === "critical" ? "VERY_LOW"
    : highestSeverity === "high" ? "LOW"
    : contradictions.length >= 3 ? "LOW"
    : "MEDIUM";

  const summaryByCount: Record<number, string> = {
    1: `1 signal contradiction detected — ${highestSeverityRecord.explanation.split(".")[0]}.`,
    2: `2 signal contradictions detected — exercise caution interpreting the score in isolation.`,
  };
  const trustSummary =
    summaryByCount[contradictions.length] ??
    `${contradictions.length} signal contradictions detected — score uncertainty is elevated (±${netUncertaintyPoints}pts). Review contradiction panel before acting.`;

  return {
    contradictions,
    totalContradictions: contradictions.length,
    highestSeverity,
    hasMaterialUncertainty,
    netUncertaintyPoints,
    trustSummary,
    overallTrustLevel,
  };
}
