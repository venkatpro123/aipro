// useDashboardAdaptation.ts — v34.0 UX redesign
//
// Returns the adaptation profile for the current audit. Drives:
//   • which tab to land on (urgency-aware default)
//   • whether to render the Emergency Mode banner
//   • the priority order of blocks inside each tab
//   • whether to surface First-Audit Welcome coachmarks
//
// Pure derivation from HybridResult + a small localStorage hit for first-audit
// detection. SSR-safe.

import { useMemo } from 'react';
import type { HybridResult } from '../types/hybridResult';
import type { CompanyData } from '../data/companyDatabase';
import type { UserProfile } from '../services/userProfileService';
import { markFirstAuditCompleted } from '../services/userProfileService';
import { compressAllSignals, type CompressedIntel } from '../services/signalCompressionService';
import { deriveProfileSignals } from '../services/actionPersonalizationEngine';
import { orchestrateFromIntel, type OrchestratedFeed } from '../services/orchestration/signalOrchestrator';

export type DashboardMode =
  | 'emergency'      // score ≥ 75 OR active WARN — surface action plan first
  | 'elevated'       // score 55–74 — show summary but flag protection
  | 'monitoring'     // score 35–54 — calm scan, growth-oriented
  | 'stable'         // score < 35 — emphasise build/grow content
  | 'low-confidence';// confidence < 45% — surface transparency

export type TabKey = 'summary' | 'company' | 'protection' | 'actions' | 'intel' | 'transparency';

/** V4 navigation — 3 primary tabs only. */
export type TabKeyV4 = 'risk' | 'actions' | 'explore';

/**
 * v39.0 F2 — Panel keys SummaryTab can reorder based on mode.
 * Each key matches a render block inside SummaryTab.
 */
export type SummaryPanelKey =
  | 'emergencyCallout'
  | 'scoreHero'
  | 'immediateActions'
  | 'topDrivers'
  | 'horizonStrip'
  | 'companyPulse'
  | 'personalRisk';

export interface AdaptationProfile {
  /** High-level UX mode driving most adaptations. */
  mode: DashboardMode;
  /** Which tab to land on by default. */
  defaultTab: TabKey;
  /** Whether to render the global Emergency Mode banner. */
  showEmergencyBanner: boolean;
  /** Whether to render the first-audit welcome coachmarks. */
  showFirstAuditWelcome: boolean;
  /** Whether confidence is low enough to surface transparency upfront. */
  showLowConfidenceCallout: boolean;
  /** Compressed intelligence — passed through for downstream re-use. */
  intel: CompressedIntel;
  /**
   * v39.0 F2 — Mode-specific panel render order for SummaryTab.
   *
   * Emergency mode    → callout + immediate actions first, drivers and pulse follow.
   * Elevated mode     → score hero first, then drivers + immediate actions.
   * Monitoring mode   → score hero + drivers (calmer order, build/grow content emphasised).
   * Stable mode       → score hero + horizon strip + pulse (long-view emphasis).
   * Low-confidence    → score hero + personal risk + drivers (transparency upfront).
   *
   * SummaryTab renders panels in this order. Keys absent from the array render last
   * (legacy fallback) so adding new panels doesn't break the layout.
   */
  summaryPanelOrder: SummaryPanelKey[];
  /**
   * P0 transformation — the orchestrated editorial feed (ranked + capped signals,
   * primary move, narrative spine + reasoning trace). Optional + non-breaking:
   * existing consumers that don't read it compile unchanged. Built from the same
   * `intel`/profile the hook already derives, so no extra compression pass.
   */
  feed?: OrchestratedFeed;
}

const FIRST_AUDIT_KEY = 'hp.v34.firstAuditSeen';

/**
 * Hybrid first-audit detection:
 * 1. Check localStorage (fast, no async).
 * 2. Fall back to UserProfile.firstAuditCompletedAt (backend, cross-device).
 * Returns true = "already seen" (don't show welcome again).
 */
function readFirstAuditSeen(profile?: UserProfile | null): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.localStorage.getItem(FIRST_AUDIT_KEY) === '1') return true;
  } catch {
    // localStorage unavailable
  }
  // If backend profile says the user has completed a first audit on another
  // device, cache it in localStorage and suppress the wizard.
  if (profile?.firstAuditCompletedAt) {
    try {
      window.localStorage.setItem(FIRST_AUDIT_KEY, '1');
    } catch { /* swallow */ }
    return true;
  }
  return false;
}

export function pickDefaultTabV4(mode: DashboardMode): TabKeyV4 {
  switch (mode) {
    case 'emergency':      return 'actions';
    case 'low-confidence': return 'explore';
    default:               return 'risk';
  }
}

export interface AdaptationProfileV4 extends Omit<AdaptationProfile, 'defaultTab'> {
  defaultTab: TabKeyV4;
}

export function useDashboardAdaptationV4(
  result: HybridResult,
  companyData?: CompanyData,
  profile?: UserProfile | null,
): AdaptationProfileV4 {
  return useMemo(() => {
    const intel = compressAllSignals(result, companyData);
    const mode  = pickMode(result, intel);
    const defaultTab = pickDefaultTabV4(mode);
    const confPct = result.confidencePercent ?? Math.round((Number(result.confidence ?? 0.5)) * 100);
    const seenBefore = readFirstAuditSeen(profile);
    const profileSignals = deriveProfileSignals(profile, result.total);
    const feed = orchestrateFromIntel(result, intel, profileSignals);

    return {
      mode,
      defaultTab,
      showEmergencyBanner: mode === 'emergency',
      showFirstAuditWelcome: !seenBefore,
      showLowConfidenceCallout: confPct < 50,
      intel,
      summaryPanelOrder: pickSummaryPanelOrder(mode),
      feed,
    };
  }, [result, companyData, profile]);
}

export function markFirstAuditSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIRST_AUDIT_KEY, '1');
  } catch {
    /* swallow */
  }
  // Fire-and-forget to backend so cross-device/incognito sessions are covered.
  markFirstAuditCompleted().catch(() => { /* non-fatal */ });
}

function pickMode(result: HybridResult, intel: CompressedIntel): DashboardMode {
  const score = result.total;
  const confPct = result.confidencePercent ?? Math.round((Number(result.confidence ?? 0.5)) * 100);
  const r = result as any;

  // Emergency always wins — must be evaluated before confidence gates so that
  // a low-confidence read at high score still surfaces the emergency callout.
  if (score >= 75 || r.warnSignal?.hasActiveWARN === true || intel.hasTier1Critical) {
    return 'emergency';
  }
  // Low-confidence is conditional per tier — never overrides emergency.
  if (score >= 60) return confPct < 45 ? 'low-confidence' : 'elevated';
  if (score >= 40) return confPct < 45 ? 'low-confidence' : 'monitoring';
  return confPct < 45 ? 'low-confidence' : 'stable';
}

function pickDefaultTab(mode: DashboardMode): TabKey {
  switch (mode) {
    case 'emergency':       return 'actions';
    case 'low-confidence':  return 'intel';
    case 'elevated':        return 'summary';
    case 'monitoring':      return 'summary';
    case 'stable':          return 'protection';
  }
}

/**
 * v39.0 F2 — Mode-specific SummaryTab panel order.
 *
 * The default v34.0 layout was scoreHero → topDrivers → companyPulse →
 * immediateActions → horizon → personalRisk regardless of urgency. Now
 * emergency mode leads with the callout and immediate actions; monitoring
 * mode keeps the calmer score-first layout.
 */
function pickSummaryPanelOrder(mode: DashboardMode): SummaryPanelKey[] {
  switch (mode) {
    case 'emergency':
      // Urgency-first: callout above the score so the user sees the alert
      // before they have a chance to interpret a number.
      return ['emergencyCallout', 'immediateActions', 'scoreHero', 'topDrivers', 'companyPulse', 'personalRisk', 'horizonStrip'];
    case 'low-confidence':
      // Transparency-first: lead with score + personal-risk drivers, defer
      // pulse (which is most affected by data quality issues).
      return ['scoreHero', 'personalRisk', 'topDrivers', 'horizonStrip', 'companyPulse', 'immediateActions'];
    case 'elevated':
      // Standard order with immediate-actions promoted ahead of pulse.
      return ['scoreHero', 'topDrivers', 'immediateActions', 'horizonStrip', 'companyPulse', 'personalRisk'];
    case 'monitoring':
      // Calmer scan: score → drivers → horizon → pulse → actions/personal.
      return ['scoreHero', 'topDrivers', 'horizonStrip', 'companyPulse', 'immediateActions', 'personalRisk'];
    case 'stable':
      // Build/grow emphasis: score → horizon (forward outlook) → pulse, then
      // actions and personal risk modulators.
      return ['scoreHero', 'horizonStrip', 'companyPulse', 'topDrivers', 'immediateActions', 'personalRisk'];
  }
}

export function useDashboardAdaptation(
  result: HybridResult,
  companyData?: CompanyData,
  profile?: UserProfile | null,
): AdaptationProfile {
  return useMemo(() => {
    const intel = compressAllSignals(result, companyData);
    const mode  = pickMode(result, intel);
    const defaultTab = pickDefaultTab(mode);
    const confPct = result.confidencePercent ?? Math.round((Number(result.confidence ?? 0.5)) * 100);
    const seenBefore = readFirstAuditSeen(profile);
    const profileSignals = deriveProfileSignals(profile, result.total);
    const feed = orchestrateFromIntel(result, intel, profileSignals);

    return {
      mode,
      defaultTab,
      showEmergencyBanner: mode === 'emergency',
      showFirstAuditWelcome: !seenBefore,
      showLowConfidenceCallout: confPct < 50,
      intel,
      summaryPanelOrder: pickSummaryPanelOrder(mode),
      feed,
    };
  }, [result, companyData, profile]);
}

// ── Tier ordering helpers ────────────────────────────────────────────────────

/**
 * Given a list of block items with optional tier + severity, return them sorted
 * for "decision-driven" ordering (lower tier first, higher severity first
 * within the same tier). Items with no tier render at the end.
 */
export interface OrderableBlock<T = unknown> {
  tier?: number;
  severity?: number;
  payload: T;
}

export function orderBlocksByPriority<T>(blocks: Array<OrderableBlock<T>>): Array<OrderableBlock<T>> {
  return [...blocks].sort((a, b) => {
    const at = a.tier ?? 99;
    const bt = b.tier ?? 99;
    if (at !== bt) return at - bt;
    const as = a.severity ?? 0;
    const bs = b.severity ?? 0;
    return bs - as;
  });
}
