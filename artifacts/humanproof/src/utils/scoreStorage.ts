// IMPLEMENTATION-PLAN: Score Drift Tracker - Production Grade
// Phase 1-5: Storage corruption, export, advanced algorithms, predictions

// KEY_REGISTRY — all localStorage keys used by this app
export const KEY_REGISTRY = {
  SCORE_HISTORY: "hp_score_history",
  SKILL_SELECTIONS: "hp_skill_selections",
  SKILL_BREAKDOWN: "hp_skill_breakdown",
  ROADMAP_START: "hp_roadmap_start",
  ROADMAP_START_DATE: "hp_roadmap_start_date",
  ROADMAP_PROGRESS: "hp_roadmap_progress",
  JOURNAL_ENTRIES: "hp_journal_entries",
  QUIZ_PROGRESS: "hp_quiz_progress",
  DIGEST_SUBSCRIBED: "hp_digest_subscribed",
  VISITED: "hp_visited",
  WAITLIST_EMAIL: "hp_waitlist_email",
  HISTORY_WARNED: "hp_history_warned",
  EVER_COMPLETED_JOB: "hp_ever_completed_job",
  EVER_COMPLETED_SKILL: "hp_ever_completed_skill",
  EVER_COMPLETED_HII: "hp_ever_completed_hii",
  DATA_VERSION: "hp_data_version",
  SCORE_GOAL: "hp_score_goal",
};

export interface ScoreEntry {
  score: number;
  plotScore: number;
  source: "job" | "skill" | "human-index";
  timestamp: number;
  dataVersion: string;
  appVersion: string;
}

export interface ScoreGoal {
  targetScore: number;
  targetDate: string;
  source: "job" | "skill" | "human-index";
}

export type Trend = "improving" | "declining" | "stable" | "volatile";

export const DATA_VERSION = "2026-Q1";
const MAX_HISTORY = 200;

const DEDUP_THRESHOLD: Record<string, number> = {
  "human-index": 8,
  job: 4,
  skill: 6,
};

function getPlotScore(rawScore: number, source: string): number {
  return source === "human-index" ? rawScore : 100 - rawScore;
}

function normalizeEntry(e: any): ScoreEntry {
  // v40.0 FIX-C: guard against NaN/string/Infinity corruption. Browser extensions
  // or manual localStorage edits can produce entries with `score: "not_a_number"`
  // or `score: NaN`. Without these guards, downstream arithmetic (EMA, drift
  // detection) silently produces NaN, breaking the velocity badge and trend
  // classification.
  const rawScore = e?.score;
  const safeScore = typeof rawScore === 'number' && isFinite(rawScore)
    ? Math.max(0, Math.min(100, rawScore))
    : 0;
  const rawPlot = e?.plotScore;
  const safePlot = typeof rawPlot === 'number' && isFinite(rawPlot)
    ? Math.max(0, Math.min(100, rawPlot))
    : (e?.source === "human-index" ? safeScore : 100 - safeScore);
  const rawTs = e?.timestamp;
  const safeTs = typeof rawTs === 'number' && isFinite(rawTs) && rawTs > 0
    ? rawTs
    : (() => {
        const parsed = new Date(rawTs).getTime();
        return isNaN(parsed) ? Date.now() : parsed;
      })();
  return {
    score: safeScore,
    plotScore: safePlot,
    source: e?.source || "job",
    timestamp: safeTs,
    dataVersion: e?.dataVersion || "2025.0",
    appVersion: e?.appVersion || "1.0",
  };
}

// PHASE-1: Storage corruption handling
export const getScoreHistory = (): ScoreEntry[] => {
  try {
    const raw = localStorage.getItem(KEY_REGISTRY.SCORE_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("[ScoreStorage] Invalid format, resetting");
      localStorage.removeItem(KEY_REGISTRY.SCORE_HISTORY);
      return [];
    }
    return parsed.map(normalizeEntry);
  } catch (e) {
    console.error("[ScoreStorage] Corruption detected:", e);
    localStorage.removeItem(KEY_REGISTRY.SCORE_HISTORY);
    return [];
  }
};

// PHASE-1: Save with corruption handling
export const saveScore = (
  score: number,
  source: "job" | "skill" | "human-index",
): boolean => {
  const history = getScoreHistory();
  const lastEntry = history
    .filter((e) => e.source === source)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  if (lastEntry && Math.abs(score - lastEntry.score) < DEDUP_THRESHOLD[source])
    return false;

  const entry: ScoreEntry = {
    score,
    plotScore: getPlotScore(score, source),
    source,
    timestamp: Date.now(),
    dataVersion: DATA_VERSION,
    appVersion: "3.0",
  };

  history.push(entry);
  const pruned =
    history.length > MAX_HISTORY ? history.slice(-MAX_HISTORY) : history;

  try {
    localStorage.setItem(KEY_REGISTRY.SCORE_HISTORY, JSON.stringify(pruned));
  } catch (e) {
    console.error("[ScoreStorage] Save failed:", e);
    return false;
  }

  if (source === "job")
    localStorage.setItem(KEY_REGISTRY.EVER_COMPLETED_JOB, "true");
  if (source === "skill")
    localStorage.setItem(KEY_REGISTRY.EVER_COMPLETED_SKILL, "true");
  if (source === "human-index")
    localStorage.setItem(KEY_REGISTRY.EVER_COMPLETED_HII, "true");
  return true;
};

// PHASE-1: Same-source drift detection
export interface DriftResult {
  change: number;
  direction: "up" | "down";
  previousDate: string;
  previousTimestamp: number;
  latest: number;
  previous: number;
  source: string;
}

export const getScoreDrift = (): DriftResult | null => {
  const history = getScoreHistory();
  if (history.length < 2) return null;

  // Get last entry of ANY source, then find previous of SAME source
  const latest = history[history.length - 1];
  const sameSourceHistory = history
    .filter((e) => e.source === latest.source)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (sameSourceHistory.length < 2) return null;
  const previous = sameSourceHistory[1];

  const change = Math.abs(latest.plotScore - previous.plotScore);
  const baseThreshold = DEDUP_THRESHOLD[latest.source] || 5;
  const ageHours = (Date.now() - previous.timestamp) / 3600000;
  const timeMultiplier = ageHours < 24 ? 0.75 : ageHours > 168 ? 1.25 : 1.0;
  const threshold = baseThreshold * timeMultiplier;

  if (change < threshold) return null;

  return {
    change,
    direction: latest.plotScore > previous.plotScore ? "up" : "down",
    previousDate: new Date(previous.timestamp).toLocaleDateString(),
    previousTimestamp: previous.timestamp,
    latest: latest.score,
    previous: previous.score,
    source: latest.source,
  };
};

// PHASE-4: Advanced Algorithms

// Exponential Moving Average
export const calculateEMA = (
  history: ScoreEntry[],
  source: string,
  period: number = 3,
): number | null => {
  const scores = history
    .filter((e) => e.source === source)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((e) => e.plotScore);
  if (scores.length < 2) return null;

  const multiplier = 2 / (period + 1);
  let ema = scores[0];
  for (let i = 1; i < scores.length; i++) {
    ema = (scores[i] - ema) * multiplier + ema;
  }
  return Math.round(ema);
};

// Z-Score Anomaly Detection
export const detectAnomaly = (
  history: ScoreEntry[],
  source: string,
): boolean => {
  const scores = history
    .filter((e) => e.source === source)
    .map((e) => e.plotScore);
  if (scores.length < 5) return false;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const std = Math.sqrt(
    scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length,
  );
  if (std === 0) return false;

  const latestZ = Math.abs((scores[scores.length - 1] - mean) / std);
  return latestZ > 2;
};

// Trend Classification
export const classifyTrend = (history: ScoreEntry[], source: string): Trend => {
  const scores = history
    .filter((e) => e.source === source)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((e) => e.plotScore);
  if (scores.length < 3) return "stable";

  const diffs = [scores[1] - scores[0], scores[2] - scores[1]];
  const avgDiff = (diffs[0] + diffs[1]) / 2;

  if (Math.abs(avgDiff) < 3) return "stable";
  if (diffs[0] * diffs[1] < 0) return "volatile";
  return avgDiff > 0 ? "improving" : "declining";
};

// Simple Linear Regression Prediction
export const predictNextScore = (
  history: ScoreEntry[],
  source: string,
): number | null => {
  const scores = history
    .filter((e) => e.source === source)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((e) => e.plotScore);
  if (scores.length < 3) return null;

  const n = scores.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = scores.reduce((a, b) => a + b, 0) / n;

  const numerator = x.reduce(
    (acc, xi, i) => acc + (xi - xMean) * (scores[i] - yMean),
    0,
  );
  const denominator = x.reduce((acc, xi) => acc + Math.pow(xi - xMean, 2), 0);

  if (denominator === 0) return scores[scores.length - 1];
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  return Math.min(100, Math.max(0, Math.round(slope * n + intercept)));
};

// PHASE-5: Goal Tracking
export const getScoreGoal = (): ScoreGoal | null => {
  try {
    const raw = localStorage.getItem(KEY_REGISTRY.SCORE_GOAL);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setScoreGoal = (goal: ScoreGoal): void => {
  localStorage.setItem(KEY_REGISTRY.SCORE_GOAL, JSON.stringify(goal));
};

export const calculateGoalProgress = (
  goal: ScoreGoal,
  history: ScoreEntry[],
): number => {
  const sourceHistory = history
    .filter((e) => e.source === goal.source)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (sourceHistory.length === 0) return 0;

  const current = sourceHistory[sourceHistory.length - 1].plotScore;
  const start = sourceHistory[0].plotScore;
  const target = goal.targetScore;

  if (target === start) return 100;
  const progress = ((current - start) / (target - start)) * 100;
  return Math.min(100, Math.max(0, progress));
};

// PHASE-1: Export Functions
export const exportHistoryJSON = (): void => {
  const history = getScoreHistory();
  const data = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    entryCount: history.length,
    entries: history.map((e) => ({
      date: new Date(e.timestamp).toISOString(),
      source: e.source,
      rawScore: e.score,
      plotScore: e.plotScore,
      dataVersion: e.dataVersion,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `humanproof-history-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportHistoryCSV = (): void => {
  const history = getScoreHistory();
  const headers = ["Date", "Source", "Raw Score", "Plot Score", "Data Version"];
  const rows = history.map((e) => [
    new Date(e.timestamp).toISOString(),
    e.source,
    e.score,
    e.plotScore,
    e.dataVersion,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `humanproof-history-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Utility exports
export const getHistoryBySource = (source: string): ScoreEntry[] =>
  getScoreHistory().filter((e) => e.source === source);
export const getScoreHistory_raw = getScoreHistory;
export const getEverCompletedFlags = () => ({
  job: localStorage.getItem(KEY_REGISTRY.EVER_COMPLETED_JOB) === "true",
  skill: localStorage.getItem(KEY_REGISTRY.EVER_COMPLETED_SKILL) === "true",
  hii: localStorage.getItem(KEY_REGISTRY.EVER_COMPLETED_HII) === "true",
});
export const hasLegacyVersionEntries = (): boolean =>
  getScoreHistory().some((e) => e.dataVersion !== DATA_VERSION);
