// workforceVelocityEngine.ts — WS7 Layer Consolidation
//
// Unifies two previously-separate intelligence layers:
//
//   L15  headcountVelocityEngine   — contractor mix, FTE delta, job posting velocity
//   L36  glassdoorVelocityEngine   — employee sentiment trend, review volume velocity
//
// Audit Issue #10 identified these as redundant: both layers read overlapping
// upstream sources (LinkedIn headcount + scraped career/Glassdoor signals) and
// the audit pipeline ran them sequentially, doubling latency. More importantly,
// both produced their own "workforce direction" verdict, which the UI then
// rendered as two separate panels — confusing rather than informative.
//
// The unified engine emits a single `WorkforceVelocityResult` consumed by a
// merged UI panel. The legacy engines are KEPT EXPORTED for backward
// compatibility (existing UI panels remain wired) until shadow validation
// confirms the unified output matches their combined signals on a held-out
// test set. After validation the legacy panels can be deleted in a follow-up
// PR; the engines themselves will follow.
//
// Flag: `ws7_layer_consolidation`. When off, callers should continue to
// import the legacy engines individually.

import {
  computeHeadcountVelocity,
  type HeadcountVelocityResult,
  type HeadcountVelocityInput,
} from './headcountVelocityEngine';
import {
  computeGlassdoorVelocity,
  type GlassdoorVelocityResult,
  type GlassdoorDataPoint,
} from './glassdoorVelocityEngine';
import { evaluateFlagSync } from '../config/featureFlags';

// ── Unified types ───────────────────────────────────────────────────────────

export type WorkforceDirection = 'EXPANDING' | 'STABLE' | 'TRIMMING' | 'CONTRACTING' | 'PURGING' | 'UNKNOWN';

export interface WorkforceVelocityResult {
  /** Composite 0–100 score: weighted blend of headcount and sentiment risks. */
  workforceRiskScore: number;
  /** Single plain-language direction verdict for the merged UI panel. */
  direction: WorkforceDirection;
  /** ≤120 char headline used as the panel title. */
  headline: string;

  /** Headcount sub-result for backwards compatibility / drilldown. */
  headcount: HeadcountVelocityResult;
  /** Glassdoor sentiment sub-result. */
  sentiment: GlassdoorVelocityResult;

  /** Cross-signal contradiction flag: e.g. headcount declining + sentiment improving. */
  hasInternalConflict: boolean;
  conflictNote: string | null;

  /** Provenance — which underlying engines contributed. */
  contributingEngines: Array<'headcountVelocity' | 'glassdoorVelocity'>;
  /** Set when ws7_layer_consolidation is off and this is a pass-through. */
  isPassthrough: boolean;
}

export interface WorkforceVelocityInputs {
  headcount: HeadcountVelocityInput;
  /** Monthly Glassdoor data points (oldest to newest). ≥2 required for signal. */
  sentimentHistory: GlassdoorDataPoint[];
}

// ── Direction classification ───────────────────────────────────────────────

function classifyDirection(headcountScore: number, sentimentScore: number): WorkforceDirection {
  // Both 0-100, higher = more risk. The unified direction reflects the
  // dominant signal because two moderate signals on different dimensions
  // are usually less informative than one strong signal on either.
  const dominant = Math.max(headcountScore, sentimentScore);
  if (dominant >= 80) return 'PURGING';
  if (dominant >= 60) return 'CONTRACTING';
  if (dominant >= 40) return 'TRIMMING';
  if (dominant >= 20) return 'STABLE';
  return 'EXPANDING';
}

function buildHeadline(direction: WorkforceDirection, h: HeadcountVelocityResult, s: GlassdoorVelocityResult): string {
  switch (direction) {
    case 'PURGING':
      return 'Workforce in rapid contraction with sentiment collapse';
    case 'CONTRACTING':
      return `Workforce contracting (${h.headcountTrend.toLowerCase()}, CEO approval ${s.ceoApprovalRiskTier.toLowerCase()})`;
    case 'TRIMMING':
      return 'Workforce showing measurable retrenchment signals';
    case 'STABLE':
      return 'Workforce stable across headcount and sentiment dimensions';
    case 'EXPANDING':
      return 'Workforce expanding; no contraction signal';
    case 'UNKNOWN':
      return 'Insufficient workforce data to classify';
  }
}

// ── Conflict detection ──────────────────────────────────────────────────────

function detectInternalConflict(
  h: HeadcountVelocityResult,
  s: GlassdoorVelocityResult,
): { has: boolean; note: string | null } {
  // Headcount falling but CEO approval rising (velocity > 0 = improving) —
  // usually means a culture-fit purge: low-performers being managed out and
  // remaining cohort more satisfied. Worth surfacing because L2 history
  // typically wouldn't capture this.
  const headcountFalling = h.headcountTrend === 'DECLINING' || h.headcountTrend === 'DECLINING_SHARPLY';
  const sentimentRising = (s.ceoApprovalVelocity ?? 0) > 0.5;
  if (headcountFalling && sentimentRising) {
    return {
      has: true,
      note:
        'Headcount falling while CEO approval is rising. Pattern is consistent with managed exits ' +
        '(performance-driven contraction) rather than a financial-distress wave.',
    };
  }

  // Headcount stable but sentiment crashing — leading indicator. Often
  // precedes announced rounds by 60-90 days.
  const sentimentCrashing =
    s.ceoApprovalRiskTier === 'HIGH' || s.ceoApprovalRiskTier === 'CRITICAL';
  const headcountStable = h.headcountTrend === 'STABLE';
  if (headcountStable && sentimentCrashing) {
    return {
      has: true,
      note:
        'Sentiment crashing while headcount is flat. Sentiment typically leads ' +
        'headcount changes by 60–90 days; treat as elevated near-term risk.',
    };
  }

  return { has: false, note: null };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Unified workforce velocity computation. When `ws7_layer_consolidation` is
 * off, returns a `passthrough` result that wraps the legacy outputs without
 * blending — so legacy UI panels keep displaying their independent verdicts.
 */
export function computeWorkforceVelocity(inputs: WorkforceVelocityInputs): WorkforceVelocityResult {
  const headcount = computeHeadcountVelocity(inputs.headcount);
  const sentiment = computeGlassdoorVelocity(inputs.sentimentHistory);

  const flag = evaluateFlagSync('ws7_layer_consolidation');
  const consolidate = flag.isActive || flag.isShadow;

  if (!consolidate) {
    // Passthrough: return both sub-results but do NOT compute a unified
    // verdict. The UI continues to render the two legacy panels.
    return {
      workforceRiskScore: Math.round((headcount.headcountRiskScore + sentiment.sentimentRiskScore) / 2),
      direction: 'UNKNOWN',
      headline: 'Workforce signals (legacy split view)',
      headcount,
      sentiment,
      hasInternalConflict: false,
      conflictNote: null,
      contributingEngines: ['headcountVelocity', 'glassdoorVelocity'],
      isPassthrough: true,
    };
  }

  // Consolidated path. Weighted blend: headcount carries more weight than
  // sentiment because headcount changes are revealed preferences while
  // sentiment can be culture-cohort dependent.
  const blended = Math.round(headcount.headcountRiskScore * 0.65 + sentiment.sentimentRiskScore * 0.35);
  const direction = classifyDirection(headcount.headcountRiskScore, sentiment.sentimentRiskScore);
  const conflict = detectInternalConflict(headcount, sentiment);

  return {
    workforceRiskScore: blended,
    direction,
    headline: buildHeadline(direction, headcount, sentiment),
    headcount,
    sentiment,
    hasInternalConflict: conflict.has,
    conflictNote: conflict.note,
    contributingEngines: ['headcountVelocity', 'glassdoorVelocity'],
    isPassthrough: false,
  };
}
