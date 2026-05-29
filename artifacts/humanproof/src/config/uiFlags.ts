// uiFlags.ts — P1
//
// Lightweight, client-side, PRESENTATIONAL UI flags. This is deliberately
// separate from `config/featureFlags.ts` (the DB-backed, async-primed engine
// flag system used by the audit pipeline): the dashboard-shell choice is purely
// cosmetic, per-device, and needs no server round-trip, canary bucketing, or
// per-audit freeze semantics. Coupling it to the engine-flag taxonomy would add
// needless async + DB dependency to a render-time decision.
//
// Resolution order for the dashboard variant:
//   1. localStorage 'hp.ui.dashboard' = 'v3' | 'v4'  (manual QA + instant rollback)
//   2. build-time env VITE_DASHBOARD_V4 = '1'         (opt-in rollout)
//   3. default 'v3'                                   (current production)

export type DashboardVariant = 'v3' | 'v4';

const DASHBOARD_LS_KEY = 'hp.ui.dashboard';

export function getDashboardVariant(): DashboardVariant {
  // 1. Per-device override — wins in any build so QA / support can flip live.
  if (typeof window !== 'undefined') {
    try {
      const v = window.localStorage.getItem(DASHBOARD_LS_KEY);
      if (v === 'v3' || v === 'v4') return v;
    } catch {
      /* localStorage unavailable — fall through */
    }
  }
  // 2. Build-time opt-in.
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (env?.VITE_DASHBOARD_V4 === '1') return 'v4';
  } catch {
    /* import.meta unavailable — fall through */
  }
  // 3. Safe default.
  return 'v3';
}

/** Imperative override (e.g. a dev toggle). Persists to localStorage. */
export function setDashboardVariant(variant: DashboardVariant): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DASHBOARD_LS_KEY, variant);
  } catch {
    /* swallow */
  }
}
