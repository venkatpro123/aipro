// useIntelligencePulse.ts — Layer 2 "Intelligence Presence"
//
// Drives a single analytical scan-line across the hero cards so the platform
// feels ALIVE after the audit — "the AI is still reasoning over this signal."
//
// A module-level round-robin scheduler guarantees only ONE card pulses at a
// time (anti-distraction): a 5s tick advances through every mounted subscriber,
// so with 3 hero cards each pulses ~every 15s — steady, never simultaneous.
// Disabled entirely under prefers-reduced-motion.

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

type Listener = () => void;

const TICK_MS = 5000;       // advance one subscriber every 5s
const PULSE_MS = 1600;      // must match the .intel-scan sweep keyframe

const listeners: Listener[] = [];
let cursor = -1;
let timer: ReturnType<typeof setInterval> | null = null;

function ensureTimer() {
  if (timer || typeof window === 'undefined') return;
  timer = setInterval(() => {
    if (listeners.length === 0) return;
    cursor = (cursor + 1) % listeners.length;
    listeners[cursor]?.();
  }, TICK_MS);
}

function stopTimerIfIdle() {
  if (listeners.length === 0 && timer) {
    clearInterval(timer);
    timer = null;
    cursor = -1;
  }
}

/**
 * Returns whether THIS card should currently render its scan-line. Apply the
 * `is-scanning` class when true (the card root must carry `.intel-scan`).
 */
export function useIntelligencePulse(enabled = true): boolean {
  const reduce = useReducedMotion();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!enabled || reduce) return;
    let releaseTimer: ReturnType<typeof setTimeout> | null = null;

    const fire = () => {
      setScanning(true);
      releaseTimer = setTimeout(() => setScanning(false), PULSE_MS);
    };

    listeners.push(fire);
    ensureTimer();

    return () => {
      const i = listeners.indexOf(fire);
      if (i >= 0) listeners.splice(i, 1);
      if (releaseTimer) clearTimeout(releaseTimer);
      stopTimerIfIdle();
    };
  }, [enabled, reduce]);

  return scanning;
}

export default useIntelligencePulse;
