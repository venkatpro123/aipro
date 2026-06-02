// useViewMode.ts
//
// Persists the user's chosen dashboard experience: 'guidance' (default for new
// users — compressed, decision-oriented 5-section advisor) or 'beast' (full
// 6-tab intelligence command center for power users).
//
// Design decisions:
//   • localStorage only — no server round-trip needed for a UI preference.
//   • Key 'hp.ui.viewmode' follows the existing hp.ui.* naming convention.
//   • New users (key absent) default to 'guidance' — clarity before complexity.
//   • Returning users who previously chose 'beast' land there again.
//   • Migration: stored 'intelligence' (old value) treated as 'beast'.
//   • storage event listener keeps two open tabs in sync.
//   • SSR-safe: typeof window guard in the state initializer.

import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'guidance' | 'beast';

const LS_KEY = 'hp.ui.viewmode';

function readMode(): ViewMode {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    // Migrate old 'intelligence' value → 'beast'
    if (stored === 'beast' || stored === 'intelligence') return 'beast';
    // 'guidance' or anything absent/unrecognised → guidance (safe default)
    return 'guidance';
  } catch {
    return 'guidance';
  }
}

function writeMode(mode: ViewMode): void {
  try {
    localStorage.setItem(LS_KEY, mode);
  } catch { /* quota or SSR — silently ignore */ }
}

export function useViewMode(): {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
} {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => readMode());

  // Persist whenever the mode changes.
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    writeMode(mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(viewMode === 'guidance' ? 'beast' : 'guidance');
  }, [viewMode, setViewMode]);

  // Cross-tab sync: when the user changes the mode in another tab, reflect it here.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        const v = e.newValue;
        if (v === 'beast' || v === 'intelligence') setViewModeState('beast');
        else if (v === 'guidance') setViewModeState('guidance');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { viewMode, setViewMode, toggleViewMode };
}
