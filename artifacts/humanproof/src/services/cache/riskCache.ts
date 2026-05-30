// riskCache.ts
// Client-side cache for Skill Risk Assessment results.
// Uses localStorage with a 24-hour TTL.

const TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Cache key version. Bump whenever the scoring formula changes so users with a
// warm 24h cache get freshly-computed scores instead of stale ones.
// v3: experience-shield fix (D4/D6 now honour 10-20/20+ brackets).
const CACHE_VERSION = 'v3';

export const getCachedRisk = (params: { roleKey: string; industry: string; country: string; experience: string }): any | null => {
  const key = `hp_risk_${CACHE_VERSION}_${params.industry}_${params.roleKey}_${params.experience}_${params.country}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < TTL_MS) return data;
      localStorage.removeItem(key); // Cleanup expired
    }
  } catch {
    // Silently ignore: localStorage may be unavailable (private browsing, quota exceeded).
  }
  return null;
};

export const setCachedRisk = (params: { roleKey: string; industry: string; country: string; experience: string }, data: any): void => {
  const key = `hp_risk_${CACHE_VERSION}_${params.industry}_${params.roleKey}_${params.experience}_${params.country}`;
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Silently ignore: localStorage quota may be exceeded.
  }
};
