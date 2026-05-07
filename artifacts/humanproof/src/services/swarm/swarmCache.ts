// swarmCache.ts
// 2-hour TTL caching layer for SwarmReport.
// TTL reduced from 24h — swarm signals (stock, news sentiment, layoff velocity) are
// volatile enough that a same-day re-run should re-fire the 30 agents.
// Cache key: swarm_cache::{company}::{role}::{department}

import { SwarmReport } from './swarmTypes';

const SWARM_CACHE_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours (was 24h)

const makeKey = (company: string, role: string, department: string): string =>
  `swarm_cache::${company.toLowerCase()}::${role.toLowerCase()}::${department.toLowerCase()}`;

export const getSwarmCache = (
  company: string,
  role: string,
  department: string
): SwarmReport | null => {
  try {
    const raw = localStorage.getItem(makeKey(company, role, department));
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < SWARM_CACHE_TTL_MS) {
      console.log('[SwarmCache] HIT:', makeKey(company, role, department));
      return data as SwarmReport;
    }
    // Expired
    localStorage.removeItem(makeKey(company, role, department));
    return null;
  } catch {
    return null;
  }
};

export const setSwarmCache = (
  company: string,
  role: string,
  department: string,
  report: SwarmReport
): void => {
  try {
    localStorage.setItem(
      makeKey(company, role, department),
      JSON.stringify({ data: report, timestamp: Date.now() })
    );
    console.log('[SwarmCache] SET:', makeKey(company, role, department));
  } catch {
    // localStorage quota exceeded — skip silently
  }
};

export const clearSwarmCache = (
  company?: string,
  role?: string,
  department?: string
): void => {
  if (company && role && department) {
    localStorage.removeItem(makeKey(company, role, department));
    return;
  }
  // Clear all swarm cache entries
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('swarm_cache::')) keysToDelete.push(key);
  }
  keysToDelete.forEach(k => localStorage.removeItem(k));
  console.log(`[SwarmCache] Cleared ${keysToDelete.length} entries`);
};
