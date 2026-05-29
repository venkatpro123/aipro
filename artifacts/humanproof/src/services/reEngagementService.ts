// reEngagementService.ts — Wave 4.3 Re-Engagement Loops
//
// Evaluates re-engagement triggers on every dashboard open.
// Returns the appropriate banner content for the user's situation.
//
// Trigger types:
//   day_7   — 7 days since first audit: "Here's what changed this week"
//   day_30  — 30 days: "30-day check-in. Ready to see if your score changed?"
//   day_90  — 90 days: "Your profile is 90 days old. Refresh it to sharpen confidence"
//   score_drift — multiple signals changed since last audit
//   industry_signal — sector-level risk change detected
//
// Delivery: In-app banner (IntelligenceUpdateBanner) on next dashboard open.
// Future: Push notifications via Web Push API (Wave 9.1).
//
// Note: Industry signals and breaking news are handled by continuousIntelligenceService.
// This service focuses on time-based triggers and profile-staleness nudges.

import { LAST_AUDIT_KEY, LAST_COMPANY_KEY } from './continuousIntelligenceService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReEngagementTriggerType =
  | 'day_7'
  | 'day_30'
  | 'day_90'
  | 'score_drift'
  | 'profile_stale'
  | 'none';

export interface ReEngagementTrigger {
  type: ReEngagementTriggerType;
  headline: string;
  subtext: string;
  ctaLabel: string;
  urgency: 'high' | 'medium' | 'low';
  daysSince: number;
}

// ── localStorage key for last-shown trigger ───────────────────────────────────
// Prevent same trigger from showing more than once per week

const LS_LAST_TRIGGER_KEY = 'hp.reengagement.lastShown';
const TRIGGER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function shouldShowTrigger(type: ReEngagementTriggerType): boolean {
  try {
    const raw = localStorage.getItem(LS_LAST_TRIGGER_KEY);
    if (!raw) return true;
    const { shownType, shownAt } = JSON.parse(raw);
    if (shownType === type && Date.now() - shownAt < TRIGGER_COOLDOWN_MS) return false;
    return true;
  } catch { return true; }
}

function markTriggerShown(type: ReEngagementTriggerType): void {
  try {
    localStorage.setItem(
      LS_LAST_TRIGGER_KEY,
      JSON.stringify({ shownType: type, shownAt: Date.now() }),
    );
  } catch {}
}

// ── Main evaluation ───────────────────────────────────────────────────────────

/**
 * Evaluate which re-engagement trigger, if any, should fire on this dashboard open.
 * Returns `null` if no trigger is appropriate (first visit, or too soon since last trigger).
 */
export function evaluateReEngagementTrigger(
  companyName?: string,
  currentScore?: number,
): ReEngagementTrigger | null {
  try {
    const tsRaw = localStorage.getItem(LAST_AUDIT_KEY);
    const lastCompany = localStorage.getItem(LAST_COMPANY_KEY);
    if (!tsRaw) return null; // First-ever audit — no re-engagement yet

    const ms = Date.now() - Number(tsRaw);
    const daysSince = Math.floor(ms / (1000 * 60 * 60 * 24));

    // Day 0-6: too soon for any re-engagement nudge
    if (daysSince < 7) return null;

    // Day 90+: profile staleness
    if (daysSince >= 90) {
      const type: ReEngagementTriggerType = 'day_90';
      if (!shouldShowTrigger(type)) return null;
      markTriggerShown(type);
      return {
        type,
        headline: 'Your profile is 90 days old',
        subtext: 'Refreshing it sharpens confidence accuracy by ~25%. Takes 60 seconds.',
        ctaLabel: 'Refresh my profile →',
        urgency: 'medium',
        daysSince,
      };
    }

    // Day 30–89: monthly check-in
    if (daysSince >= 30) {
      const type: ReEngagementTriggerType = 'day_30';
      if (!shouldShowTrigger(type)) return null;
      markTriggerShown(type);
      const co = lastCompany ? ` for ${lastCompany}` : '';
      return {
        type,
        headline: '30-day check-in',
        subtext: `Your score${co} was ${currentScore ?? '?'}. Market signals shift monthly — re-analyze to stay current.`,
        ctaLabel: 'Re-analyze now — 45 sec →',
        urgency: 'medium',
        daysSince,
      };
    }

    // Day 7–29: weekly digest
    {
      const type: ReEngagementTriggerType = 'day_7';
      if (!shouldShowTrigger(type)) return null;
      markTriggerShown(type);
      const co = lastCompany ? ` for ${lastCompany}` : '';
      return {
        type,
        headline: `${daysSince} days since your last audit`,
        subtext: `Market signals${co} may have shifted. A 30-second re-analysis keeps your score current.`,
        ctaLabel: 'Check for changes →',
        urgency: 'low',
        daysSince,
      };
    }
  } catch {
    return null;
  }
}

/**
 * Clear re-engagement state — call after a fresh audit completes.
 * Prevents the user from being nudged immediately after they just audited.
 */
export function clearReEngagementState(): void {
  try {
    localStorage.removeItem(LS_LAST_TRIGGER_KEY);
  } catch {}
}
