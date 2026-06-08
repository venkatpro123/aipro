// useRoleSignalPoller.ts — Phase 2
// Polls for role market demand changes by comparing current HybridResult
// D1/D2 dimensions against a cached baseline. Emits delta if >5 pts change.

import { useEffect, useRef, useState } from 'react';
import { useLayoff } from '../context/LayoffContext';
import type { HybridResult } from '../types/hybridResult';

export interface RoleSignalDelta {
  dimension: 'D1' | 'D2';
  label: string;
  previousScore: number;
  currentScore: number;
  delta: number;
  direction: 'increased' | 'decreased';
  detectedAt: string;
}

const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const DELTA_THRESHOLD = 5;
const LS_BASELINE_KEY = 'hp.role.signal.baseline';

function loadBaseline(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_BASELINE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveBaseline(scores: Record<string, number>): void {
  try { localStorage.setItem(LS_BASELINE_KEY, JSON.stringify(scores)); } catch { /* quota */ }
}

export function useRoleSignalPoller(): { deltas: RoleSignalDelta[] } {
  const { state } = useLayoff();
  const [deltas, setDeltas] = useState<RoleSignalDelta[]>([]);
  const lastPollRef = useRef<number>(0);

  useEffect(() => {
    if (!state.scoreResult) return;
    const now = Date.now();
    if (now - lastPollRef.current < POLL_INTERVAL_MS) return;
    lastPollRef.current = now;

    const hr = state.scoreResult as HybridResult;
    const dims = hr.dimensions ?? [];

    const currentScores: Record<string, number> = {
      D1: dims.find(d => d.key === 'D1')?.score ?? 0,
      D2: dims.find(d => d.key === 'D2')?.score ?? 0,
    };

    const baseline = loadBaseline();
    const newDeltas: RoleSignalDelta[] = [];

    for (const [dim, current] of Object.entries(currentScores)) {
      const prev = baseline[dim];
      if (prev == null) continue;
      const delta = current - prev;
      if (Math.abs(delta) >= DELTA_THRESHOLD) {
        newDeltas.push({
          dimension: dim as 'D1' | 'D2',
          label: dim === 'D1' ? 'AI Displacement' : 'Skills Obsolescence',
          previousScore: prev,
          currentScore: current,
          delta,
          direction: delta > 0 ? 'increased' : 'decreased',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Update baseline to current
    saveBaseline(currentScores);
    if (newDeltas.length > 0) setDeltas(newDeltas);
  }, [state.scoreResult]);

  return { deltas };
}
