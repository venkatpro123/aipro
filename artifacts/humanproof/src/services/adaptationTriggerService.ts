// adaptationTriggerService.ts — Phase 4 (R8 Adaptation Engine)
//
// Pure function — no DB writes, no network calls.
// Detects situations that warrant a recommendation update WITHOUT requiring
// a full re-audit. Four trigger types:
//
//   score_stale      — audit > 30 days old
//   action_completed — top action is already done ("measure the impact")
//   signal_changed   — breaking news matches user's own company
//   peer_surge       — peer layoff surge detected in live monitoring feed
//
// Used in CareerOSHome to show adaptation banners in real time.

import type { HybridResult } from '../types/hybridResult';
import type { MonitoringFeedItem } from '../types/careerOS';

export type AdaptationTriggerType = 'signal_changed' | 'action_completed' | 'score_stale' | 'peer_surge';

export interface AdaptationTrigger {
  type: AdaptationTriggerType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommendedAction: string; // title of the highest-ranked action to re-evaluate
  ctaLabel: string;          // button text
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function topActionTitle(hr: HybridResult): string {
  return hr.actionItems?.[0]?.title
    ?? (hr as any).recommendations?.[0]?.title
    ?? 'your top action';
}

export function detectAdaptationTriggers(
  hr: HybridResult,
  completedActionIds: string[],
  lastAuditDate: string | null,
  liveSignals: MonitoringFeedItem[],
): AdaptationTrigger[] {
  const triggers: AdaptationTrigger[] = [];
  const topAction = topActionTitle(hr);
  const companyName = (hr as any).companyName ?? null;
  const industry = (hr as any).industry ?? null;

  // ── 1. Score staleness ───────────────────────────────────────────────────
  if (lastAuditDate) {
    const ageMs = Date.now() - new Date(lastAuditDate).getTime();
    if (ageMs > THIRTY_DAYS_MS) {
      const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      triggers.push({
        type: 'score_stale',
        severity: 'warning',
        message: `Your audit is ${days} days old. Market conditions and company signals have likely shifted.`,
        recommendedAction: topAction,
        ctaLabel: 'Re-run audit',
      });
    }
  }

  // ── 2. Top action already completed ─────────────────────────────────────
  const topActionItem = hr.actionItems?.[0] ?? (hr as any).recommendations?.[0];
  if (topActionItem && completedActionIds.includes(topActionItem.id)) {
    triggers.push({
      type: 'action_completed',
      severity: 'info',
      message: `You completed "${topActionItem.title}". Re-run your audit to measure the actual impact on your risk score.`,
      recommendedAction: topActionItem.title,
      ctaLabel: 'Measure impact',
    });
  }

  // ── 3. Breaking news matches user's company ──────────────────────────────
  if (companyName) {
    const companyLower = companyName.toLowerCase();
    const companySignal = liveSignals.find(s =>
      s.headline?.toLowerCase().includes(companyLower) ||
      s.detail?.toLowerCase().includes(companyLower),
    );
    if (companySignal) {
      triggers.push({
        type: 'signal_changed',
        severity: 'critical',
        message: `Breaking: "${companySignal.headline}" — this directly affects your risk score. Re-audit now for an updated assessment.`,
        recommendedAction: topAction,
        ctaLabel: 'Update risk score',
      });
    }
  }

  // ── 4. Peer layoff surge in user's industry ──────────────────────────────
  const highSeverityPeerSignals = liveSignals.filter(s =>
    s.severity === 'HIGH' || s.severity === 'CRITICAL',
  );
  if (highSeverityPeerSignals.length >= 2) {
    const sectorMatch = industry
      ? highSeverityPeerSignals.some(s =>
          s.headline?.toLowerCase().includes(industry.toLowerCase()),
        )
      : false;
    if (sectorMatch || highSeverityPeerSignals.length >= 3) {
      triggers.push({
        type: 'peer_surge',
        severity: 'warning',
        message: `${highSeverityPeerSignals.length} high-severity signals detected in your industry. Sector contagion can shift your risk score within days.`,
        recommendedAction: topAction,
        ctaLabel: 'Re-assess risk',
      });
    }
  }

  // Return at most 2 triggers (highest severity first) to avoid banner overload
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  return triggers
    .sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2))
    .slice(0, 2);
}
