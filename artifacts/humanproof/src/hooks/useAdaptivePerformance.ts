// useAdaptivePerformance.ts — Wave 9.4
//
// Detects slow connections and low-end devices to reduce animation overhead
// and skip expensive visual effects. Consumers can use the returned flags to
// conditionally skip motion effects, shorten durations, or show simpler UI.
//
// Priority: prefers-reduced-motion always wins (accessibility law).
// Secondary: Network Information API (slow-2g / 2g = degraded).
// Tertiary: navigator.hardwareConcurrency < 4 (low-end device proxy).
//
// The result is memoised — it never changes after initial detection.
// No polling, no event listeners, no side effects.

import { useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdaptivePerformanceFlags {
  /** User has requested reduced motion — honour ALL animations */
  prefersReducedMotion: boolean;
  /** Network is too slow for asset-heavy flows (2g / slow-2g) */
  isSlowConnection: boolean;
  /** Device likely low-end (< 4 cores proxy) */
  isLowEndDevice: boolean;
  /** Combined: skip globe animation, shorten durations, simplify loading states */
  isLowPerformance: boolean;
  /**
   * Suggested animation duration multiplier.
   * • 0   — skip all animations (reducedMotion)
   * • 0.5 — half speed (slow connection or low device)
   * • 1.0 — normal
   */
  durationMultiplier: 0 | 0.5 | 1.0;
}

// ── Network Information API (non-standard — feature-detect) ───────────────────

type NetworkEffectiveType = 'slow-2g' | '2g' | '3g' | '4g';
interface NetworkInformation {
  effectiveType?: NetworkEffectiveType;
  downlink?: number;
  saveData?: boolean;
}

function detectSlowConnection(): boolean {
  try {
    const conn = (navigator as unknown as { connection?: NetworkInformation }).connection;
    if (!conn) return false;
    if (conn.saveData === true) return true;
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true;
    if (conn.downlink != null && conn.downlink < 0.5) return true;
    return false;
  } catch {
    return false;
  }
}

function detectLowEndDevice(): boolean {
  try {
    const cores = navigator.hardwareConcurrency ?? 4;
    return cores < 4;
  } catch {
    return false;
  }
}

function detectReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAdaptivePerformance(): AdaptivePerformanceFlags {
  return useMemo<AdaptivePerformanceFlags>(() => {
    const prefersReducedMotion = detectReducedMotion();
    const isSlowConnection     = detectSlowConnection();
    const isLowEndDevice       = detectLowEndDevice();
    const isLowPerformance     = prefersReducedMotion || isSlowConnection || isLowEndDevice;

    const durationMultiplier: 0 | 0.5 | 1.0 =
      prefersReducedMotion ? 0 :
      (isSlowConnection || isLowEndDevice) ? 0.5 :
      1.0;

    return {
      prefersReducedMotion,
      isSlowConnection,
      isLowEndDevice,
      isLowPerformance,
      durationMultiplier,
    };
  }, []); // Stable — only runs once per mount, intentional
}

// ── Utility: scale a duration by multiplier ───────────────────────────────────

export function scaleDuration(baseDurationS: number, multiplier: number): number {
  if (multiplier === 0) return 0;
  return baseDurationS * multiplier;
}
