// roleIntelligenceClient.ts — v38.0 Phase 1
// DB-backed role intelligence with static fallback.
//
// Design:
//   * Static TS files remain the baseline (always works, fast first-render)
//   * DB rows override static data when present (admin-driven freshness)
//   * 30-min in-memory cache TTL
//   * Edge-function-ready (low-latency reads via REST)
//
// Tables consumed (from migration 20260516000002_role_intelligence_schema.sql):
//   - roles, role_aliases, role_actions, role_compensation_bands,
//     role_negotiation_scripts, role_automation_timeline,
//     role_portability_edges, role_seniority_benchmarks,
//     cross_industry_transitions
//
// Public API:
//   - getRoleOverride(roleKey) → partial override for a single role
//   - getAllAliasOverrides() → batched alias → canonical key map
//   - refreshRoleIntelligenceCache() → force refresh
//   - getRoleIntelligenceCacheStatus() → diagnostic

import { supabase } from "../utils/supabase";

// ─── Types mirror DB schema ───────────────────────────────────────────────────

export interface DbRoleRow {
  role_key: string;
  display_name: string;
  role_family: string;
  industry: string;
  category: string | null;
  is_active: boolean;
}

export interface DbRoleAlias {
  alias: string;
  role_key: string;
  display_role: string | null;
  confidence: number;
}

export interface DbRoleAction {
  role_key: string;
  action_pool: Record<string, Record<string, unknown[]>>;
  data_quarter: string;
  data_source: string | null;
}

export interface DbCompensationBand {
  role_key: string;
  region: string;
  exp_band: string;
  base_low_usd: number | null;
  base_high_usd: number | null;
  total_low_usd: number | null;
  total_high_usd: number | null;
  base_low_inr_lakhs: number | null;
  base_high_inr_lakhs: number | null;
  bonus_pct_typical: number | null;
  equity_significant: boolean;
}

export interface DbNegotiationScript {
  role_key: string;
  strong_opener: string;
  leverage_context: string;
  counters_script: string;
  walk_away_line: string;
  primary_leverage_axis: string | null;
  leverage_score: number | null;
}

export interface DbAutomationTimeline {
  role_key: string;
  augmentation_probability: number;
  displacement_2026: number;
  displacement_2028: number;
  displacement_2030: number;
  displacement_2032: number;
  top_tasks_at_risk: string[];
  human_essential_tasks: string[];
  automation_drivers: string[];
  impact_timeline: 'short' | 'medium' | 'long';
  risk_tier: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low';
}

export interface DbDemandOverride {
  role_key: string;
  region: string;
  demand_index: number;
  demand_trend: string;
  job_openings_trend: string;
  salary_trend: string;
  ai_substitution_risk: number | null;
  time_to_fill_days: number | null;
  yoy_job_openings_change: number | null;
  top_hiring_locations: string[] | null;
  data_quarter: string;
  data_source: string | null;
  calibration_note: string | null;
}

export interface RoleOverride {
  role?: DbRoleRow;
  actions?: DbRoleAction;
  compensation?: DbCompensationBand[];
  negotiation?: DbNegotiationScript;
  automation?: DbAutomationTimeline;
  /** v39.0 A1: demand overrides keyed by region. 'global' is the default fallback. */
  demand?: Record<string, DbDemandOverride>;
}

// ─── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

interface CacheBucket {
  roleOverrides: Map<string, RoleOverride>;
  aliasMap: Map<string, { canonicalKey: string; displayRole: string }>;
  lastFetchedAt: number;
  available: boolean; // DB reachable in last attempt
}

const _cache: CacheBucket = {
  roleOverrides: new Map(),
  aliasMap: new Map(),
  lastFetchedAt: 0,
  available: false,
};

let _refreshInFlight: Promise<void> | null = null;

// ─── DB fetch (single batched call) ───────────────────────────────────────────

async function fetchAllRoleIntelligence(): Promise<void> {
  if (!supabase) {
    _cache.available = false;
    _cache.lastFetchedAt = Date.now();
    return;
  }

  try {
    const [
      { data: roles, error: rolesErr },
      { data: aliases, error: aliasErr },
      { data: actions, error: actionsErr },
      { data: comp, error: compErr },
      { data: nego, error: negoErr },
      { data: automation, error: autoErr },
      { data: demand, error: demandErr },
    ] = await Promise.all([
      supabase.from('roles').select('*').eq('is_active', true),
      supabase.from('role_aliases').select('*'),
      supabase.from('role_actions').select('*'),
      supabase.from('role_compensation_bands').select('*'),
      supabase.from('role_negotiation_scripts').select('*'),
      supabase.from('role_automation_timeline').select('*'),
      // v39.0 A1: pull demand overrides into the unified cache
      supabase.from('role_demand_overrides').select('*').eq('is_active', true),
    ]);

    // If any fundamental query failed, mark unavailable but don't crash
    if (rolesErr || aliasErr) {
      _cache.available = false;
      _cache.lastFetchedAt = Date.now();
      return;
    }

    // Build alias map
    _cache.aliasMap.clear();
    (aliases ?? []).forEach((a: DbRoleAlias) => {
      _cache.aliasMap.set(a.alias.toLowerCase().trim(), {
        canonicalKey: a.role_key,
        displayRole: a.display_role ?? a.role_key,
      });
    });

    // Build role override map indexed by role_key
    _cache.roleOverrides.clear();
    (roles ?? []).forEach((r: DbRoleRow) => {
      _cache.roleOverrides.set(r.role_key, { role: r });
    });

    if (!actionsErr) {
      (actions ?? []).forEach((a: DbRoleAction) => {
        const existing = _cache.roleOverrides.get(a.role_key) ?? {};
        _cache.roleOverrides.set(a.role_key, { ...existing, actions: a });
      });
    }
    if (!compErr) {
      const byRole = new Map<string, DbCompensationBand[]>();
      (comp ?? []).forEach((c: DbCompensationBand) => {
        const arr = byRole.get(c.role_key) ?? [];
        arr.push(c);
        byRole.set(c.role_key, arr);
      });
      byRole.forEach((bands, key) => {
        const existing = _cache.roleOverrides.get(key) ?? {};
        _cache.roleOverrides.set(key, { ...existing, compensation: bands });
      });
    }
    if (!negoErr) {
      (nego ?? []).forEach((n: DbNegotiationScript) => {
        const existing = _cache.roleOverrides.get(n.role_key) ?? {};
        _cache.roleOverrides.set(n.role_key, { ...existing, negotiation: n });
      });
    }
    if (!autoErr) {
      (automation ?? []).forEach((a: DbAutomationTimeline) => {
        const existing = _cache.roleOverrides.get(a.role_key) ?? {};
        _cache.roleOverrides.set(a.role_key, { ...existing, automation: a });
      });
    }
    // v39.0 A1: ingest demand overrides keyed by region
    if (!demandErr) {
      const byRole = new Map<string, Record<string, DbDemandOverride>>();
      (demand ?? []).forEach((d: DbDemandOverride) => {
        const regionMap = byRole.get(d.role_key) ?? {};
        regionMap[d.region] = d;
        byRole.set(d.role_key, regionMap);
      });
      byRole.forEach((regionMap, key) => {
        const existing = _cache.roleOverrides.get(key) ?? {};
        _cache.roleOverrides.set(key, { ...existing, demand: regionMap });
      });
    }

    _cache.available = true;
    _cache.lastFetchedAt = Date.now();
  } catch (e) {
    console.warn('[roleIntelligenceClient] DB fetch failed; falling back to static data', e);
    _cache.available = false;
    _cache.lastFetchedAt = Date.now();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Idempotent: fetches role intelligence from DB and populates cache.
 * Safe to call multiple times — concurrent calls share the same promise.
 * Returns when cache is populated (or DB found unreachable).
 */
export async function ensureRoleIntelligenceLoaded(): Promise<void> {
  const cacheAge = Date.now() - _cache.lastFetchedAt;
  if (_cache.lastFetchedAt > 0 && cacheAge < CACHE_TTL_MS) {
    return; // cache hit
  }
  if (_refreshInFlight) {
    return _refreshInFlight;
  }
  _refreshInFlight = fetchAllRoleIntelligence().finally(() => {
    _refreshInFlight = null;
  });
  return _refreshInFlight;
}

/** Returns the DB override for a role key, or null if no override exists. */
export function getRoleOverride(roleKey: string): RoleOverride | null {
  return _cache.roleOverrides.get(roleKey) ?? null;
}

/** Returns the full alias map (alias → {canonicalKey, displayRole}). */
export function getAllAliasOverrides(): Map<string, { canonicalKey: string; displayRole: string }> {
  return _cache.aliasMap;
}

/** Force-refresh the cache (bypasses TTL). */
export async function refreshRoleIntelligenceCache(): Promise<void> {
  _cache.lastFetchedAt = 0;
  await ensureRoleIntelligenceLoaded();
}

/** Diagnostic status. */
export function getRoleIntelligenceCacheStatus(): {
  available: boolean;
  lastFetchedAt: number;
  roleCount: number;
  aliasCount: number;
  cacheAgeMs: number;
} {
  return {
    available: _cache.available,
    lastFetchedAt: _cache.lastFetchedAt,
    roleCount: _cache.roleOverrides.size,
    aliasCount: _cache.aliasMap.size,
    cacheAgeMs: _cache.lastFetchedAt > 0 ? Date.now() - _cache.lastFetchedAt : -1,
  };
}

/** Backwards-compat alias for callers that don't care about full payload. */
export function isDbRoleIntelligenceAvailable(): boolean {
  return _cache.available;
}
