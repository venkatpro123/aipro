/**
 * staticDataService.ts
 *
 * Centralized data layer for companies, industry risk, and role exposure.
 * Supabase is the single source of truth. Static TypeScript files are
 * offline fallbacks only.
 *
 * Usage:
 *   // In your app entry point (once):
 *   await preloadStaticData();
 *
 *   // Everywhere else — synchronous, no async/await needed:
 *   const company  = getCompanySync('Google');
 *   const industry = getIndustryRiskSync('Technology');
 *   const role     = getRoleExposureSync('Software Engineer');
 */

import { supabase } from '../../utils/supabase';

// ── Fallback static imports (used when Supabase is unavailable) ───────────────
import {
  companyDatabase,
  type CompanyData,
  type LayoffRound,
} from '../../data/companyDatabase';
import {
  industryRiskData,
  type IndustryRisk,
} from '../../data/industryRiskData';
import {
  roleExposureData,
  inferRoleRisk,
  type RoleExposure,
} from '../../data/roleExposureData';

// ── Cache config ──────────────────────────────────────────────────────────────

const CACHE_KEY     = 'hp_static_data_v2';
const CACHE_TTL_MS  = 2 * 60 * 60 * 1000; // 2 hours — live-first: company list refreshes sooner
const LOAD_TIMEOUT  = 8_000; // 8-second Supabase timeout

// ── In-memory state (populated on preload) ────────────────────────────────────

let _companies:    CompanyData[]               | null = null;
let _industryRisk: Record<string, IndustryRisk>| null = null;
let _roleExposure: Record<string, RoleExposure>| null = null;
let _preloadState: 'idle' | 'loading' | 'done' | 'fallback' = 'idle';

// ── Supabase row → domain types ───────────────────────────────────────────────

interface CompanyRow {
  id:                        string;
  name:                      string;
  ticker:                    string | null;
  is_public:                 boolean;
  industry:                  string;
  region:                    'US'|'EU'|'IN'|'APAC'|'GLOBAL';
  employee_count:            number;
  revenue_growth_yoy:        number | null;
  stock_90d_change:          number | null;
  layoff_rounds:             number;
  last_layoff_percent:       number | null;
  revenue_per_employee:      number;
  ai_investment_signal:      'low'|'medium'|'high'|'very-high';
  data_source:               string;
  last_updated:              string;
  last_funding_round:        string | null;
  months_since_last_funding: number | null;
  ceo_tenure_months:         number | null;
  c_suite_changes_12m:       number | null;
  board_composition_changed: boolean | null;
  glassdoor_trend_direction: 'rising'|'stable'|'falling' | null;
  role_risk_map:             Record<string, number> | null;
}

interface LayoffRoundRow {
  company_id:  string;
  round_date:  string;
  percent_cut: number;
}

interface IndustryRiskRow {
  industry_key:         string;
  baseline_risk:        number;
  ai_adoption_rate:     number;
  growth_outlook:       'growing'|'stable'|'volatile'|'declining';
  avg_layoff_rate_2025: number;
}

interface RoleExposureRow {
  role_title:   string;
  ai_risk:      number;
  layoff_risk:  number;
  demand_trend: 'rising'|'stable'|'falling';
}

function mapCompanyRow(
  row: CompanyRow,
  roundsMap: Map<string, LayoffRound[]>,
): CompanyData {
  const rounds = roundsMap.get(row.id) ?? [];
  return {
    name:                      row.name,
    ticker:                    row.ticker ?? undefined,
    stockTicker:               row.ticker ?? undefined,
    isPublic:                  row.is_public,
    industry:                  row.industry,
    region:                    row.region,
    employeeCount:             row.employee_count,
    revenueGrowthYoY:          row.revenue_growth_yoy,
    stock90DayChange:          row.stock_90d_change,
    layoffsLast24Months:       rounds,
    layoffRounds:              row.layoff_rounds,
    lastLayoffPercent:         row.last_layoff_percent,
    revenuePerEmployee:        row.revenue_per_employee,
    aiInvestmentSignal:        row.ai_investment_signal,
    source:                    row.data_source,
    lastUpdated:               row.last_updated,
    lastFundingRound:          row.last_funding_round ?? undefined,
    monthsSinceLastFunding:    row.months_since_last_funding ?? undefined,
    ceoTenureMonths:           row.ceo_tenure_months ?? undefined,
    cSuiteChanges12m:          row.c_suite_changes_12m ?? undefined,
    boardCompositionChanged:   row.board_composition_changed ?? undefined,
    glassdoorTrendDirection:   row.glassdoor_trend_direction ?? undefined,
    roleRiskMap:               row.role_risk_map ?? undefined,
  };
}

// ── localStorage cache helpers ────────────────────────────────────────────────

interface CachePayload {
  companies:    CompanyData[];
  industryRisk: Record<string, IndustryRisk>;
  roleExposure: Record<string, RoleExposure>;
  timestamp:    number;
}

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload: Omit<CachePayload, 'timestamp'>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, timestamp: Date.now() }));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

export function invalidateStaticDataCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
  _companies    = null;
  _industryRisk = null;
  _roleExposure = null;
  _preloadState = 'idle';
}

// ── Core preloader ────────────────────────────────────────────────────────────

/**
 * preloadStaticData — loads companies, industry risk, and role exposure from
 * Supabase (or localStorage cache) into memory. Must be called once at app
 * startup. After it returns, all sync getters work instantly.
 *
 * On failure: silently falls back to the bundled TypeScript arrays.
 */
export async function preloadStaticData(): Promise<void> {
  if (_preloadState === 'done' || _preloadState === 'loading') return;
  _preloadState = 'loading';

  // 1. Try localStorage cache
  const cached = readCache();
  if (cached) {
    _companies    = cached.companies;
    _industryRisk = cached.industryRisk;
    _roleExposure = cached.roleExposure;
    _preloadState = 'done';
    console.debug(`[staticData] loaded ${_companies.length} companies from localStorage cache.`);
    return;
  }

  // 2. Try Supabase with timeout
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase timeout')), LOAD_TIMEOUT)
    );

    // BUG-08: Promise.allSettled — a slow role_exposure_data table scan must not
    // abort the companies + industry_risk_data queries that seed core scoring.
    const fetchAll = async () => {
      const [cS, rS, iS, reS] = await Promise.allSettled([
        supabase.from('companies').select('*'),
        supabase.from('company_layoff_rounds').select('company_id, round_date, percent_cut'),
        supabase.from('industry_risk_data').select('*'),
        supabase.from('role_exposure_data').select('*'),
      ]);
      const EMPTY = { data: null as null, error: new Error('query_rejected') };
      const companiesRes = cS.status  === 'fulfilled' ? cS.value  : EMPTY;
      const roundsRes    = rS.status  === 'fulfilled' ? rS.value  : EMPTY;
      const industryRes  = iS.status  === 'fulfilled' ? iS.value  : EMPTY;
      const roleRes      = reS.status === 'fulfilled' ? reS.value : EMPTY;
      return { companiesRes, roundsRes, industryRes, roleRes };
    };

    const { companiesRes, roundsRes, industryRes, roleRes } =
      await Promise.race([fetchAll(), timeout]);

    // Check for fetch errors
    if (companiesRes.error || industryRes.error || roleRes.error) {
      throw new Error(
        companiesRes.error?.message
          ?? industryRes.error?.message
          ?? roleRes.error?.message
          ?? 'fetch error'
      );
    }

    const companyRows = (companiesRes.data ?? []) as CompanyRow[];
    const roundRows   = (roundsRes.data ?? []) as LayoffRoundRow[];

    // Table empty? Means seed hasn't run yet — fall through to static fallback
    if (companyRows.length === 0) {
      console.warn('[staticData] companies table empty — using bundled static data. Run scripts/seed_static_data.ts to populate.');
      _preloadState = 'fallback';
      _useFallback();
      return;
    }

    // Build rounds lookup: company_id → LayoffRound[]
    const roundsMap = new Map<string, LayoffRound[]>();
    for (const r of roundRows) {
      if (!roundsMap.has(r.company_id)) roundsMap.set(r.company_id, []);
      roundsMap.get(r.company_id)!.push({ date: r.round_date, percentCut: r.percent_cut });
    }

    _companies = companyRows.map(r => mapCompanyRow(r, roundsMap));

    _industryRisk = {};
    for (const r of (industryRes.data ?? []) as IndustryRiskRow[]) {
      _industryRisk[r.industry_key] = {
        baselineRisk:      r.baseline_risk,
        aiAdoptionRate:    r.ai_adoption_rate,
        growthOutlook:     r.growth_outlook,
        avgLayoffRate2025: r.avg_layoff_rate_2025,
      };
    }

    _roleExposure = {};
    for (const r of (roleRes.data ?? []) as RoleExposureRow[]) {
      _roleExposure[r.role_title] = {
        aiRisk:      r.ai_risk,
        layoffRisk:  r.layoff_risk,
        demandTrend: r.demand_trend,
      };
    }

    // Merge in any roles missing from DB that are present in static data
    for (const [title, exposure] of Object.entries(roleExposureData)) {
      if (!(_roleExposure[title])) _roleExposure[title] = exposure;
    }

    // Merge in any industries missing from DB
    for (const [key, risk] of Object.entries(industryRiskData)) {
      if (!(_industryRisk[key])) _industryRisk[key] = risk;
    }

    writeCache({ companies: _companies, industryRisk: _industryRisk, roleExposure: _roleExposure });
    _preloadState = 'done';
    console.debug(
      `[staticData] loaded ${_companies.length} companies, ` +
      `${Object.keys(_industryRisk).length} industries, ` +
      `${Object.keys(_roleExposure).length} roles from Supabase.`
    );

  } catch (err) {
    console.warn('[staticData] Supabase preload failed — using bundled static data.', err);
    _preloadState = 'fallback';
    _useFallback();
  }
}

function _useFallback() {
  _companies    = [...companyDatabase];
  _industryRisk = { ...industryRiskData };
  _roleExposure = { ...roleExposureData };
}

// ── Synchronous getters ────────────────────────────────────────────────────────
// These are the drop-in replacements for the static data accessors.
// They use the in-memory cache populated by preloadStaticData().
// If called before preload, they fall back to the static arrays (safe but slower).

export function getCompanySync(name: string): CompanyData | null {
  const db = _companies ?? companyDatabase;
  if (!name) return null;
  const q = name.toLowerCase().trim();
  return db.find(c =>
    c.name.toLowerCase() === q ||
    (c.ticker && c.ticker.toLowerCase() === q) ||
    (c.stockTicker && c.stockTicker.toLowerCase() === q)
  ) ?? null;
}

export function lookupCompaniesSync(query: string): CompanyData[] {
  const db = _companies ?? companyDatabase;
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  return db
    .filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.ticker && c.ticker.toLowerCase() === q)
    )
    .slice(0, 8);
}

export function getAllCompanies(): CompanyData[] {
  return _companies ?? companyDatabase;
}

export function getIndustryRiskSync(industryKey: string): IndustryRisk | null {
  const map = _industryRisk ?? industryRiskData;
  return map[industryKey] ?? null;
}

export function getAllIndustryRisk(): Record<string, IndustryRisk> {
  return _industryRisk ?? industryRiskData;
}

export function getRoleExposureSync(roleTitle: string): RoleExposure {
  const map = _roleExposure ?? roleExposureData;
  if (!roleTitle) return { aiRisk: 0.40, layoffRisk: 0.40, demandTrend: 'stable' };
  return map[roleTitle] ?? inferRoleRisk(roleTitle);
}

export function getAllRoleExposure(): Record<string, RoleExposure> {
  return _roleExposure ?? roleExposureData;
}

/** Returns the load state — useful for showing a loading indicator */
export function getPreloadState(): typeof _preloadState {
  return _preloadState;
}

/** True once preload has finished (done OR fallback) */
export function isStaticDataReady(): boolean {
  return _preloadState === 'done' || _preloadState === 'fallback';
}

// ── Async refresh ─────────────────────────────────────────────────────────────

/**
 * refreshStaticData — force-refresh from Supabase, bypassing the cache.
 * Call this after the admin updates company data in Supabase Dashboard.
 */
export async function refreshStaticData(): Promise<void> {
  invalidateStaticDataCache();
  await preloadStaticData();
}
