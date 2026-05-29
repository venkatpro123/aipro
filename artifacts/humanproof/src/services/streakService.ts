// streakService.ts — Wave 4.4 Streak & Momentum System
//
// Tracks consecutive weeks where the user completed ≥1 action.
// Storage: localStorage key 'hp.streak.weeks' → { weeks: string[], updatedAt: number }
//
// Week format: ISO 8601 — "2026-W22"
//
// Functions:
//   recordStreakActivity()  — call when any action is completed; idempotent
//   getStreakInfo()         — current streak length, longest, isAtRisk
//
// "At risk" = no action completed in the current ISO week yet.

// ── ISO week helper ───────────────────────────────────────────────────────────

function getISOWeek(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

function getPreviousISOWeek(week: string): string {
  const [year, w] = week.split('-W').map(Number);
  if (w === 1) {
    // Last week of previous year (ISO week 52 or 53)
    const lastDay = new Date(Date.UTC(year - 1, 11, 28));
    return getISOWeek(lastDay);
  }
  const targetWeekNum = w - 1;
  // Reconstruct a date in the previous week
  const jan4 = new Date(Date.UTC(year, 0, 4)); // Jan 4 is always in week 1
  const jan4Day = jan4.getUTCDay() || 7;
  jan4.setUTCDate(jan4.getUTCDate() - jan4Day + 1); // Monday of week 1
  jan4.setUTCDate(jan4.getUTCDate() + (targetWeekNum - 1) * 7);
  return getISOWeek(jan4);
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STREAK_KEY = 'hp.streak.weeks';
const MAX_WEEKS_STORED = 52; // keep up to 1 year of history

interface StreakStorage {
  weeks: string[];     // sorted ascending ISO week strings
  updatedAt: number;
}

function loadStreakStorage(): StreakStorage {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { weeks: [], updatedAt: 0 };
    return JSON.parse(raw) as StreakStorage;
  } catch {
    return { weeks: [], updatedAt: 0 };
  }
}

function saveStreakStorage(data: StreakStorage): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch { /* quota */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface StreakInfo {
  currentStreak: number;     // consecutive weeks with ≥1 action completed
  longestStreak: number;
  lastActiveWeek: string;    // ISO week of last activity
  isAtRisk: boolean;         // no action this week yet
  totalWeeksActive: number;
}

/**
 * Record that the user completed an action this week.
 * Idempotent — calling multiple times in the same week is safe.
 */
export function recordStreakActivity(): void {
  const currentWeek = getISOWeek();
  const data = loadStreakStorage();
  const weekSet = new Set(data.weeks);

  if (weekSet.has(currentWeek)) return; // already recorded this week

  weekSet.add(currentWeek);
  const sorted = Array.from(weekSet).sort();

  // Trim to MAX_WEEKS_STORED
  const trimmed = sorted.slice(-MAX_WEEKS_STORED);
  saveStreakStorage({ weeks: trimmed, updatedAt: Date.now() });
}

/**
 * Get the current streak metrics.
 * Returns `{ currentStreak: 0, ... }` when no activity has been recorded.
 */
export function getStreakInfo(): StreakInfo {
  const data = loadStreakStorage();
  const weeks = data.weeks;

  if (weeks.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveWeek: '', isAtRisk: true, totalWeeksActive: 0 };
  }

  const currentWeek = getISOWeek();
  const weekSet = new Set(weeks);
  const lastActiveWeek = weeks[weeks.length - 1];
  const isAtRisk = !weekSet.has(currentWeek);

  // Compute current streak — walking backwards from the most recent active week
  let streak = 0;
  let checkWeek = isAtRisk
    ? currentWeek  // if no activity this week, streak is 0 unless last week was active
    : currentWeek;

  // Start from the current or last active week and walk backwards
  let w = weekSet.has(currentWeek) ? currentWeek : lastActiveWeek;
  while (weekSet.has(w)) {
    streak++;
    w = getPreviousISOWeek(w);
  }

  // Compute longest streak
  let maxStreak = 0;
  let runStreak = 0;
  let prevWeek: string | null = null;
  for (const week of weeks) {
    if (prevWeek === null || week === getPreviousISOWeek(week) || prevWeek === getPreviousISOWeek(week)) {
      // This is rough — proper longest streak would need full adjacency check
      // For now just track max of current run
      runStreak++;
    } else {
      runStreak = 1;
    }
    maxStreak = Math.max(maxStreak, runStreak);
    prevWeek = week;
  }

  // Recompute longest streak properly
  maxStreak = computeLongestStreak(weeks);

  return {
    currentStreak: streak,
    longestStreak: maxStreak,
    lastActiveWeek,
    isAtRisk,
    totalWeeksActive: weeks.length,
  };
}

function computeLongestStreak(weeks: string[]): number {
  if (weeks.length === 0) return 0;
  let max = 1;
  let run = 1;
  for (let i = 1; i < weeks.length; i++) {
    const expectedPrev = getPreviousISOWeek(weeks[i]);
    if (weeks[i - 1] === expectedPrev) {
      run++;
      max = Math.max(max, run);
    } else {
      run = 1;
    }
  }
  return max;
}
