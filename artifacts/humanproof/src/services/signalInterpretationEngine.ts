// signalInterpretationEngine.ts — Phase 2: The Monitor That Watches
// Pure deterministic function — no LLM, no network, no async.
// High-frequency render path: called once per feed item on every render.

import type { MonitoringFeedItem } from '../types/careerOS';
import type { HybridResult } from '../types/hybridResult';

export function interpretSignal(
  item: MonitoringFeedItem,
  hr: HybridResult | null,
): string {
  const total = hr?.total ?? null;
  const userCompany = (hr as any)?.companyName ?? (hr as any)?.company ?? null;
  const peerContagion = (hr as any)?.peerContagion ?? null;
  const cohort = (hr as any)?.cohortClassification ?? null;

  // Normalize to lowercase for comparison
  const itemDetail = (item.detail ?? '').toLowerCase().trim();
  const userCoLower = (userCompany ?? '').toLowerCase().trim();

  // 1. This IS the user's company — highest urgency
  if (userCoLower && itemDetail && itemDetail.includes(userCoLower)) {
    return 'This is YOUR company — review your Layoff Defense action plan immediately.';
  }

  // 2. Critical severity event in the feed
  if (item.severity === 'CRITICAL') {
    if (total !== null && total >= 60) {
      return 'A critical signal in your sector — your risk is already elevated. Re-audit now to recalibrate.';
    }
    return 'A critical sector event. Monitor closely; sector contagion can spread within 4–8 weeks.';
  }

  // 3. Peer/sector event with context from peerContagion score
  if (item.category === 'company' || item.category === 'market') {
    const contagionScore = typeof peerContagion?.contagionRisk === 'number'
      ? peerContagion.contagionRisk
      : null;

    if (total !== null && total >= 60) {
      const cohortLabel = cohort ? ` for ${cohort}` : '';
      return `Sector contagion${cohortLabel} raises your estimated risk. Run a fresh audit to recalibrate.`;
    }

    if (total !== null && total < 40) {
      if (contagionScore !== null && contagionScore < 0.3) {
        return "You're currently low risk and contagion is weak. Keep monitoring over the next 2–4 weeks.";
      }
      return "You're currently low risk. Sector layoffs historically take 2–4 months to spread — stay alert.";
    }

    if (contagionScore !== null && contagionScore > 0.6) {
      return 'Contagion risk is high for your sector. Complete your top action item before the end of the week.';
    }
  }

  // 4. Hiring signal — opportunity window
  if (item.category === 'market' && item.headline.toLowerCase().includes('hir')) {
    return 'Companies are hiring in your space — this is your opportunity window. Update your profile now.';
  }

  // 5. Role-specific signal
  if (item.category === 'role') {
    if (total !== null && total >= 50) {
      return 'A role-level signal detected — your position may be directly affected. Check your protection plan.';
    }
    return 'A role-level signal detected. Your current score accounts for this trend.';
  }

  // 6. Personal signal
  if (item.category === 'personal') {
    return 'This is a personal alert — direct action recommended. See your action plan for next steps.';
  }

  // 7. Fallback
  return 'Industry signal detected. Your current score accounts for this sector trend.';
}
