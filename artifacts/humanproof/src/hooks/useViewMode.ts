// useViewMode.ts
//
// Persists the user's chosen dashboard experience: 'guidance' (compressed,
// expert-advisor voice — default for new users) or 'intelligence' (the full
// 6-tab deep-analysis experience for users who want complete visibility).
//
// Design decisions:
//   • localStorage only — no server round-trip needed for a UI preference.
//   • Key 'hp.ui.viewmode' follows the existing hp.ui.* naming convention.
//   • New users (key absent) default to 'guidance' — clarity before complexity.
//   • Returning users who previously chose 'intelligence' land there again.
//   • storage event listener keeps two open tabs in sync (same pattern as the
//     hp.v34.firstAuditSeen cross-tab sync in LayoffAuditDashboardV3).
//   • SSR-safe: typeof window guard in the state initializer.

import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'guidance' | 'intelligence';

const LS_KEY = 'hp.ui.viewmode';

function readMode(): ViewMode {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    if (stored === 'intelligence') return 'intelligence';
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
    setViewMode(viewMode === 'guidance' ? 'intelligence' : 'guidance');
  }, [viewMode, setViewMode]);

  // Cross-tab sync: when the user changes the mode in another tab, reflect it here.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LS_KEY && (e.newValue === 'guidance' || e.newValue === 'intelligence')) {
        setViewModeState(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { viewMode, setViewMode, toggleViewMode };
}
