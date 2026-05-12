// dataFreshnessChecker.ts
// Utility for checking data staleness across the HumanProof system
// Implements critical audit recommendations for data freshness warnings

export interface DataFreshnessAssessment {
  lastUpdated: string;
  ageInDays: number;
  stalenessWarning: string | null;
  accuracyImpact: "Low" | "Medium" | "High" | "Critical";
  isStale: boolean;
  needsUpdate: boolean;
}

// v15.0 — Compact freshness class used by the per-signal dot indicators in
// the Analysis tab driver list and Intelligence tab signal panels.
//   fresh: <14d  (green dot)
//   mid:   <30d  (amber dot)
//   stale: >=30d (red  dot)
export type SignalFreshnessClass = 'fresh' | 'mid' | 'stale';

export function classifySignalFreshness(ageInDays: number): SignalFreshnessClass {
  if (ageInDays < 14) return 'fresh';
  if (ageInDays < 30) return 'mid';
  return 'stale';
}

export function classifySignalFreshnessFromDate(
  lastUpdated: string | undefined | null,
  nowMs: number = Date.now(),
): SignalFreshnessClass | null {
  if (!lastUpdated) return null;
  const t = new Date(lastUpdated).getTime();
  if (isNaN(t)) return null;
  const ageInDays = Math.max(0, Math.floor((nowMs - t) / 86_400_000));
  return classifySignalFreshness(ageInDays);
}

/**
 * Calculates how stale data is and provides appropriate warnings
 * @param lastUpdatedDate - Date when data was last updated
 * @returns DataFreshnessAssessment with warnings and accuracy impact
 */
export const assessDataFreshness = (
  lastUpdatedDate: string,
): DataFreshnessAssessment => {
  const now = new Date();
  const dataDate = new Date(lastUpdatedDate);
  const ageInDays = Math.floor(
    (now.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  let stalenessWarning: string | null = null;
  let accuracyImpact: "Low" | "Medium" | "High" | "Critical" = "Low";
  let isStale = false;
  let needsUpdate = false;

  if (ageInDays > 180) {
    stalenessWarning = `⚠️ CRITICAL DATA STALENESS: Information is ${ageInDays} days old (${Math.floor(ageInDays / 30)} months). Financial metrics, layoff risk scores, and market conditions may be completely inaccurate. This assessment should not be used for career decisions.`;
    accuracyImpact = "Critical";
    isStale = true;
    needsUpdate = true;
  } else if (ageInDays > 90) {
    stalenessWarning = `🔴 HIGH STALENESS RISK: Data is ${ageInDays} days old (${Math.floor(ageInDays / 30)} months). Market conditions, company financials, and industry trends may have changed significantly. Use this assessment with extreme caution.`;
    accuracyImpact = "High";
    isStale = true;
    needsUpdate = true;
  } else if (ageInDays > 30) {
    stalenessWarning = `🟡 MODERATE STALENESS: Data is ${ageInDays} days old. Recent company announcements, layoffs, financial changes, or market developments may not be reflected in this assessment.`;
    accuracyImpact = "Medium";
    isStale = true;
    needsUpdate = true;
  } else if (ageInDays > 14) {
    stalenessWarning = `ℹ️ Data is ${ageInDays} days old. Check for recent company news, earnings reports, or industry developments that might affect your risk level.`;
    accuracyImpact = "Low";
    isStale = true;
    needsUpdate = false;
  } else if (ageInDays > 7) {
    stalenessWarning = `Data is ${ageInDays} days old. Consider recent company news and market changes.`;
    accuracyImpact = "Low";
    isStale = false;
    needsUpdate = false;
  }

  return {
    lastUpdated: lastUpdatedDate,
    ageInDays,
    stalenessWarning,
    accuracyImpact,
    isStale,
    needsUpdate,
  };
};

/**
 * Gets a human-readable description of data freshness
 */
export const getDataFreshnessLabel = (ageInDays: number): string => {
  if (ageInDays === 0) return "Real-time";
  if (ageInDays === 1) return "1 day old";
  if (ageInDays < 7) return `${ageInDays} days old`;
  if (ageInDays < 30) return `${Math.floor(ageInDays / 7)} weeks old`;
  if (ageInDays < 365) return `${Math.floor(ageInDays / 30)} months old`;
  return `${Math.floor(ageInDays / 365)} years old`;
};

/**
 * Gets color coding for data freshness visualization
 */
export const getDataFreshnessColor = (ageInDays: number): string => {
  if (ageInDays <= 7) return "#10b981"; // green
  if (ageInDays <= 30) return "#f59e0b"; // amber
  if (ageInDays <= 90) return "#ef4444"; // red
  return "#7c2d12"; // dark red
};

/**
 * Checks if data is too stale for reliable predictions
 */
export const isDataTooStaleForPredictions = (ageInDays: number): boolean => {
  return ageInDays > 90; // 3 months
};

/**
 * Gets recommended refresh frequency based on data type
 */
export const getRecommendedRefreshFrequency = (
  dataType: "stock" | "layoffs" | "revenue" | "news",
): number => {
  switch (dataType) {
    case "stock":
      return 1; // daily
    case "news":
      return 1; // daily
    case "layoffs":
      return 7; // weekly
    case "revenue":
      return 90; // quarterly
    default:
      return 30; // monthly
  }
};
