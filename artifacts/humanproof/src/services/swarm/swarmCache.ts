// swarmCache.ts
// 24-hour TTL caching layer for SwarmReport.
// Cache key: swarm_cache::{company}::{role}::{department}
//
// Why 24 hours:
//   30 parallel agent calls are the primary cost driver at scale. Market
//   conditions for a given company rarely change faster than daily; a 24h
//   result is accurate enough for another session that day. The cache is
//   intentionally broken by invalidateSwarmForCompany() when a breaking news
//   event fires for the company — stale swarm signals after a major
//   announcement would produce systematically wrong scores.
//
// Invalidation contract:
//   invalidateSwarmForCompany(companyName) clears ALL cache entries for that
//   company across every (role, department) pair. Called by layoffNewsCache
//   when injectLayoffEvent() fires, which is the canonical breaking-news
//   injection point for both realtime and polling transports.

import { SwarmReport } from './swarmTypes';

const SWARM_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

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

/**
 * Invalidate all swarm cache entries for a company, regardless of role or
 * department. Called when a breaking news event is detected for the company.
 *
 * A 24-hour cached swarm result becomes systematically wrong the moment a
 * major announcement (layoff round, leadership exit, acquisition) changes
 * the company's signal profile. This ensures the next audit re-fires the
 * 30 agents against fresh data rather than serving stale pre-announcement
 * signals for up to 24 hours.
 */
export const invalidateSwarmForCompany = (companyName: string): void => {
  if (!companyName?.trim()) return;
  const prefix = `swarm_cache::${companyName.toLowerCase()}::`;
  const keysToDelete: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) keysToDelete.push(key);
    }
    keysToDelete.forEach(k => {
      localStorage.removeItem(k);
      console.info(`[SwarmCache] Invalidated by breaking news: ${k}`);
    });
  } catch {
    // localStorage unavailable (SSR, private browsing quota) — no-op
  }
};
