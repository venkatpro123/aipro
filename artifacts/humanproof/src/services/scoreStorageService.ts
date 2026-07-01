// scoreStorageService.ts
// Layoff-specific score persistence with typed history and drift detection.
// localStorage is the primary local store; Supabase is the source of truth.

import { ScoreResult, ScoreBreakdown } from './layoffScoreEngine';
import type { HybridResult } from '../types/hybridResult';
import { syncSingleScoreEntry } from './auditSyncService';

const STORAGE_KEY = 'hp_layoff_score_history';

export interface ScoreHistoryEntry {
  id: string;
  score: number;
  tier: string;
  tierColor: string;
  companyName: string;
  roleTitle: string;
  department: string;
  breakdown: ScoreBreakdown;
  confidence: string;
  timestamp: string;
  dataQuality?: 'live' | 'partial' | 'fallback'; // from live OSINT or fallback defaults
}

export interface DriftResult {
  drift: number;
  direction: 'increased' | 'decreased';
  from: number;
  to: number;
  fromDate: string;
  daysSince: number;
}

export const saveLayoffScore = (
  scoreResult: ScoreResult | HybridResult,
  companyName: string,
  roleTitle: string,
  department: string = '',
  dataQuality: 'live' | 'partial' | 'fallback' = 'live'
): ScoreHistoryEntry => {
  const scoreValue = (scoreResult as any).score ?? (scoreResult as any).total ?? 0;
  const entry: ScoreHistoryEntry = {
    id: crypto.randomUUID(),
    score: scoreValue,
    tier: scoreResult.tier.label,
    tierColor: scoreResult.tier.color,
    companyName,
    roleTitle,
    department,
    breakdown: scoreResult.breakdown,
    confidence: scoreResult.confidence,
    timestamp: new Date().toISOString(),
    dataQuality,
  };

  const history = getLayoffScoreHistory();
  history.push(entry);

  // Keep last 50 entries
  while (history.length > 50) history.shift();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

  // Background sync to Supabase score_history (non-blocking, queued if offline)
  void syncSingleScoreEntry({
    score:       scoreValue,
    plotScore:   100 - scoreValue, // layoff score: plotScore = inverted risk
    source:      'job',
    timestamp:   new Date(entry.timestamp).getTime(),
    dataVersion: '2026-Q2',
    appVersion:  '3.0',
  });

  return entry;
};

export const getLayoffScoreHistory = (): ScoreHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate entries have required fields
    return parsed.filter(
      (e: any) =>
        typeof e.id === 'string' &&
        typeof e.score === 'number' &&
        typeof e.timestamp === 'string'
    );
  } catch {
    return [];
  }
};

export const clearLayoffScoreHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Merge cloud audit session entries into hp_layoff_score_history.
 * Deduplication key: companyName + roleTitle + score (same audit = same values).
 * Cloud entries are authoritative; local entries fill any gaps not in the cloud.
 */
export const mergeLayoffHistoryFromCloud = (cloudEntries: ScoreHistoryEntry[]): void => {
  const local = getLayoffScoreHistory();

  // Build a map keyed by dedup signature; cloud wins on collision
  const seen = new Map<string, ScoreHistoryEntry>();
  const sig = (e: ScoreHistoryEntry) =>
    `${e.companyName.toLowerCase()}|${e.roleTitle.toLowerCase()}|${e.score}`;

  for (const e of local) seen.set(sig(e), e);
  for (const e of cloudEntries) seen.set(sig(e), e); // cloud overwrites local

  const merged = Array.from(seen.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* quota */ }
};

// BUG-08 FIX: accept companyName + roleTitle so we only compare same job/company
export const detectScoreDrift = (companyName?: string, roleTitle?: string): DriftResult | null => {
  const history = getLayoffScoreHistory();

  // Filter to the same company+role when context is provided
  const relevant = companyName && roleTitle
    ? history.filter(e =>
        e.companyName.toLowerCase() === companyName.toLowerCase() &&
        e.roleTitle.toLowerCase() === roleTitle.toLowerCase()
      )
    : history;

  if (relevant.length < 2) return null;

  const latest   = relevant[relevant.length - 1];
  const previous = relevant[relevant.length - 2];
  const drift    = latest.score - previous.score;

  if (Math.abs(drift) < 5) return null;

  return {
    drift,
    direction: drift > 0 ? 'increased' : 'decreased',
    from: previous.score,
    to: latest.score,
    fromDate: previous.timestamp,
    daysSince: Math.round(
      (new Date().getTime() - new Date(previous.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    ),
  };
};

// Get the most recent score for a specific company
export const getLatestScoreForCompany = (companyName: string): ScoreHistoryEntry | null => {
  const history = getLayoffScoreHistory();
  const filtered = history.filter(e => e.companyName.toLowerCase() === companyName.toLowerCase());
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
};
