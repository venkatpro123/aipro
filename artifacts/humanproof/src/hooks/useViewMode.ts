// useViewMode.ts
//
// Persists the user's chosen dashboard experience:
//   'guidance'  — default for new users, 5-section advisor view
//   'analysis'  — 4-tab middle layer (why + what + what next)
//   'beast'     — full 6-tab intelligence command center
//
// Design decisions:
//   • localStorage only — no server round-trip needed for a UI preference.
//   • Key 'hp.ui.viewmode' follows the existing hp.ui.* naming convention.
//   • New users (key absent) default to 'guidance'.
//   • Migration: stored 'intelligence' (old value) treated as 'beast'.
//   • storage event listener keeps two open tabs in sync.
//   • SSR-safe: typeof window guard in the state initializer.

import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'guidance' | 'analysis' | 'beast';

const LS_KEY = 'hp.ui.viewmode';

function readMode(): ViewMode {
  try {
    // Always lock to analysis mode — guidance and beast are hidden
    return 'analysis';
  } catch {
    return 'analysis';
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
} {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => readMode());

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    writeMode(mode);
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        const v = e.newValue;
        if (v === 'beast' || v === 'intelligence') setViewModeState('beast');
        else if (v === 'analysis') setViewModeState('analysis');
        else setViewModeState('guidance');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { viewMode, setViewMode };
}
