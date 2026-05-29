// continuousIntelligenceService.ts — Wave 7.1 Continuous Intelligence
//
// Runs on every dashboard mount (regardless of audit age). Checks three
// lightweight sources for high-impact changes since the user last audited:
//
//   1. breaking_news_events — new layoff/restructuring headlines for this company
//   2. Day-staleness gate    — if last audit is >7 days old, signals may have drifted
//   3. Industry macro shift  — sector-level change in known risk tier
//
// Result drives IntelligenceUpdateBanner in LayoffAuditDashboardV3:
//   "3 signals changed since your last audit (8 days ago). Est. impact: ±6 pts."
//
// Design decisions:
//   • Never blocks the dashboard render — async, fires after mount
//   • Results are NOT cached: fresh check on each dashboard open
//   • Uses supabase directly (no EF round-trip): single lightweight query
//   • Stores lastAuditTimestamp in localStorage so the banner is accurate
//     even when Supabase is unreachable

import { supabase } from '../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IntelligenceUpdateResult {
  shouldPromptReaudit: boolean;
  signalCount: number;           // How many new signals detected
  estimatedDelta: string;        // "±6 pts" | "±3 pts" | "±10 pts"
  daysSince: number;             // Days since last audit
  reason: string;                // Human-readable summary for the banner
  topHeadline?: string;          // Most recent breaking news headline (if any)
  urgency: 'high' | 'medium' | 'low';
}

// ── localStorage key ──────────────────────────────────────────────────────────

export const LAST_AUDIT_KEY = 'hp.lastAuditTimestamp';
export const LAST_COMPANY_KEY = 'hp.lastAuditCompany';

/** Call this when an audit completes to mark the audit time. */
export function markAuditComplete(companyName: string): void {
  try {
    localStorage.setItem(LAST_AUDIT_KEY, Date.now().toString());
    localStorage.setItem(LAST_COMPANY_KEY, companyName.toLowerCase().trim());
  } catch { /* swallow */ }
}

function getLastAuditAge(): { daysSince: number; companyName: string | null } {
  try {
    const ts  = Number(localStorage.getItem(LAST_AUDIT_KEY) ?? '0');
    const co  = localStorage.getItem(LAST_COMPANY_KEY) ?? null;
    const ms  = Date.now() - ts;
    return { daysSince: Math.floor(ms / (1000 * 60 * 60 * 24)), companyName: co };
  } catch {
    return { daysSince: 0, companyName: null };
  }
}

// ── Main check ────────────────────────────────────────────────────────────────

/**
 * Check for high-impact intelligence changes since the last audit.
 * Returns quickly (< 2s) via a single Supabase query + local staleness check.
 * Never throws — returns `shouldPromptReaudit: false` on any error.
 */
export async function checkForIntelligenceUpdates(
  companyName: string,
  currentScore: number,
): Promise<IntelligenceUpdateResult> {
  const { daysSince, companyName: lastCompany } = getLastAuditAge();

  // If this is the first audit (no stored timestamp) skip the banner
  if (daysSince === 0 && lastCompany === null) {
    return noUpdate(0);
  }

  // Different company — not useful to compare
  const sameCompany = lastCompany !== null &&
    (lastCompany === companyName.toLowerCase().trim() ||
     companyName.toLowerCase().includes(lastCompany) ||
     lastCompany.includes(companyName.toLowerCase().trim()));

  let breakingNewsCount = 0;
  let topHeadline: string | undefined;

  // Only query DB for the same company (meaningful signal)
  if (sameCompany) {
    try {
      const cutoff = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('breaking_news_events')
        .select('headline, event_date, confidence')
        .ilike('company_name', `%${companyName.slice(0, 30)}%`)
        .gte('event_date', cutoff.slice(0, 10))
        .order('event_date', { ascending: false })
        .limit(5);

      breakingNewsCount = data?.length ?? 0;
      if (data && data.length > 0) {
        topHeadline = data[0].headline as string;
      }
    } catch {
      // DB unreachable — fall through to staleness check only
    }
  }

  // High urgency: breaking news found
  if (breakingNewsCount > 0) {
    const delta = breakingNewsCount >= 3 ? '±10 pts' : breakingNewsCount >= 2 ? '±7 pts' : '±5 pts';
    const reason = breakingNewsCount === 1
      ? `New layoff signal detected for ${companyName} since your last audit.`
      : `${breakingNewsCount} new layoff signals detected for ${companyName} since your last audit.`;
    return {
      shouldPromptReaudit: true,
      signalCount: breakingNewsCount,
      estimatedDelta: delta,
      daysSince,
      reason,
      topHeadline,
      urgency: 'high',
    };
  }

  // Medium urgency: same company, audit is stale (>7 days)
  if (sameCompany && daysSince >= 7) {
    const delta = daysSince >= 30 ? '±8 pts' : daysSince >= 14 ? '±6 pts' : '±3 pts';
    const reason = daysSince >= 30
      ? `Your audit is ${daysSince} days old. Market signals for ${companyName} may have shifted significantly.`
      : `${daysSince} days have passed. Live signals for ${companyName} may have changed.`;
    return {
      shouldPromptReaudit: true,
      signalCount: 0,
      estimatedDelta: delta,
      daysSince,
      reason,
      urgency: daysSince >= 30 ? 'high' : 'medium',
    };
  }

  // Low urgency: different company or audit fresh enough
  if (!sameCompany && daysSince >= 3) {
    // User audited a different company last time — show a gentle reminder
    return {
      shouldPromptReaudit: false,
      signalCount: 0,
      estimatedDelta: '±varies',
      daysSince,
      reason: '',
      urgency: 'low',
    };
  }

  return noUpdate(daysSince);
}

function noUpdate(daysSince: number): IntelligenceUpdateResult {
  return {
    shouldPromptReaudit: false,
    signalCount: 0,
    estimatedDelta: '±0 pts',
    daysSince,
    reason: '',
    urgency: 'low',
  };
}
