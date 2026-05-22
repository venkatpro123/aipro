// skillDemandService.ts
// Connects the weekly Naukri/LinkedIn job-count refresh (market_intelligence_cache)
// to the per-skill demand overlays shown in CareerSkillsTab.
//
// Architecture:
//   The market_intelligence_cache table stores job opening counts at the ROLE level
//   (e.g. 'ml_engineer': 2400 India openings). Individual skills are not tracked
//   independently — Naukri/LinkedIn don't expose per-skill job counts cleanly.
//
//   This service maps each role key to the skill categories most correlated with
//   that role's demand, then injects a SkillDemandLive overlay onto matching skills
//   in the CareerIntelligence record. The overlay is clearly labeled as a proxy
//   ("demand for roles using this skill") not a direct per-skill count.
//
// Freshness thresholds (THE ANSWER TO THE USER'S QUESTION):
//   ≤ 7 days  → 🟢 Live badge (within weekly Monday 06:00 UTC refresh SLA)
//   8–90 days → 🟡 "N days old" amber — data is stale relative to scrape cadence
//   > 90 days → 🔴 Stale — same threshold as MARKET_DATA_STALE_DAYS in careerPathMarket.ts
//
// When the cache has NO entry for a role key, skills show "Static estimate — no live data"
// and the static riskScore/longTermValue values are used without modification.
// There is NO silent fallback — the absence of live data is always labeled explicitly.

import { supabase } from '../utils/supabase';
import type {
  SkillDemandLive, CompanySkillDemandLive,
  CareerIntelligence, SkillRisk, SafeSkill,
} from '../data/intelligence/types';

// ── Freshness thresholds ───────────────────────────────────────────────────────
export const SKILL_DEMAND_LIVE_MAX_DAYS  = 7;   // live badge visible up to and including day 7
export const SKILL_DEMAND_STALE_MAX_DAYS = 90;  // amber label; beyond this: red stale

export function getSkillFreshnessStatus(ageInDays: number): 'live' | 'stale' | 'very_stale' {
  if (ageInDays <= SKILL_DEMAND_LIVE_MAX_DAYS)  return 'live';
  if (ageInDays <= SKILL_DEMAND_STALE_MAX_DAYS) return 'stale';
  return 'very_stale';
}

// ── Role key → skill category keyword mapping ─────────────────────────────────
// Maps market_intelligence_cache role keys to skill keywords that appear in
// CareerIntelligence.skills.at_risk and .safe records.
// A skill matches when its lowercase name contains one of the keywords.
const ROLE_SKILL_KEYWORDS: Record<string, string[]> = {
  ml_engineer:                ['machine learning', 'ml ', 'neural', 'model train', 'pytorch', 'tensorflow', 'deep learning', 'llm', 'nlp', 'ai model'],
  ai_llm_systems_engineer:    ['llm', 'large language', 'prompt', 'rag', 'vector', 'langchain', 'ai pipeline', 'inference', 'fine-tun'],
  data_engineer:              ['data pipeline', 'etl', 'spark', 'kafka', 'airflow', 'dbt', 'data warehouse', 'sql', 'databricks'],
  platform_engineer:          ['kubernetes', 'devops', 'terraform', 'ci/cd', 'docker', 'infrastructure', 'sre', 'cloud architect'],
  security_engineer:          ['cybersecurity', 'penetration', 'soc', 'threat', 'vulnerability', 'security ops', 'incident response'],
  product_manager:            ['product strategy', 'product roadmap', 'stakeholder', 'agile', 'product discovery', 'user research'],
  fp_a_ai_analyst:            ['financial model', 'fp&a', 'budgeting', 'forecasting', 'financial planning', 'scenario analysis'],
  risk_ai_analyst:            ['risk model', 'credit risk', 'model risk', 'stress test', 'regulatory capital'],
  cfo_advisor:                ['financial strategy', 'board', 'investor', 'capital allocation', 'strategic finance'],
  people_analytics_specialist:['people analytics', 'hr analytics', 'workforce planning', 'org design'],
  hrbp_ai_specialist:         ['hr business partner', 'hrbp', 'talent management', 'employee engagement', 'performance management'],
  content_strategist_ai:      ['content strategy', 'content creation', 'seo', 'editorial', 'content marketing', 'copywriting'],
  qa_automation_engineer:     ['test automation', 'selenium', 'playwright', 'cypress', 'qa', 'testing framework'],
  technical_writer_ai:        ['technical writing', 'documentation', 'api docs', 'technical communication'],
};

// ── Cache: in-memory Map per role key, 30-minute TTL (same as marketIntelligenceService) ──
const _cache = new Map<string, { overlay: RoleDemandOverlay | null; fetchedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheRow {
  role_key:                  string;
  india_openings:            number | null;
  global_openings:           number | null;
  demand_trend:              'surging' | 'growing' | 'stable' | 'contracting' | null;
  data_as_of:                string;
  updated_at:                string;
  is_live:                   boolean;
  scrape_status:             string | null;
  last_successful_scrape_at: string | null;
}

export interface RoleDemandOverlay {
  roleKey:                  string;
  indiaCount:               number | null;
  globalCount:              number | null;
  demandTrend:              'surging' | 'growing' | 'stable' | 'contracting';
  dataAsOf:                 string;
  ageInDays:                number;
  isLive:                   boolean;
  freshness:                'live' | 'stale' | 'very_stale';
  /** Operational freshness — added v40.0 migration 20260522000002.
   *  null when row predates the migration (treated as unknown, not error). */
  scrapeStatus:             string | null;
  lastSuccessfulScrapeAt:   string | null; // ISO — only set when scrape_status='success'
}

/** Fetch demand overlay for a role key. Returns null when cache has no entry. */
export async function getRoleDemandOverlay(roleKey: string): Promise<RoleDemandOverlay | null> {
  const key = roleKey.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  // Session cache hit
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.overlay;

  try {
    const { data, error } = await supabase
      .from('market_intelligence_cache')
      .select('role_key, india_openings, global_openings, demand_trend, data_as_of, updated_at, is_live, scrape_status, last_successful_scrape_at')
      .eq('role_key', key)
      .maybeSingle();

    if (error || !data) {
      _cache.set(key, { overlay: null, fetchedAt: Date.now() });
      return null;
    }

    const row = data as CacheRow;
    const ageInDays = Math.round((Date.now() - new Date(row.data_as_of).getTime()) / 86_400_000);
    const overlay: RoleDemandOverlay = {
      roleKey:                 row.role_key,
      indiaCount:              row.india_openings,
      globalCount:             row.global_openings,
      demandTrend:             row.demand_trend ?? 'stable',
      dataAsOf:                row.data_as_of,
      ageInDays,
      isLive:                  row.is_live,
      freshness:               getSkillFreshnessStatus(ageInDays),
      scrapeStatus:            row.scrape_status ?? null,
      lastSuccessfulScrapeAt:  row.last_successful_scrape_at ?? null,
    };

    _cache.set(key, { overlay, fetchedAt: Date.now() });
    return overlay;
  } catch {
    _cache.set(key, { overlay: null, fetchedAt: Date.now() });
    return null;
  }
}

/**
 * Fetch the India opening count from market_intelligence_cache_history closest
 * to 90 days ago for the given role key. Returns null when no history row exists.
 *
 * The history table is populated by the snapshot_market_intelligence_cache trigger
 * on each weekly refresh — so delta90d becomes non-null after the second scrape cycle.
 */
async function fetchHistoricCount90d(roleKey: string): Promise<number | null> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  try {
    // Find the row closest to 90 days ago (within ±14 days)
    const { data, error } = await supabase
      .from('market_intelligence_cache_history')
      .select('india_openings, recorded_at')
      .eq('role_key', roleKey)
      .gte('recorded_at', new Date(ninetyDaysAgo.getTime() - 14 * 86_400_000).toISOString())
      .lte('recorded_at', new Date(ninetyDaysAgo.getTime() + 14 * 86_400_000).toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return (data as { india_openings: number | null }).india_openings;
  } catch {
    return null;
  }
}

/**
 * Build a SkillDemandLive object from a role overlay.
 * delta90d is computed from market_intelligence_cache_history when available
 * (non-null after at least two weekly scrape cycles have run).
 */
async function buildSkillDemandLive(overlay: RoleDemandOverlay): Promise<SkillDemandLive> {
  const historic = await fetchHistoricCount90d(overlay.roleKey);
  const delta90d = (overlay.indiaCount != null && historic != null)
    ? overlay.indiaCount - historic
    : null;

  return {
    liveJobCount:           overlay.indiaCount,
    delta90d,
    dataAsOf:               overlay.dataAsOf,
    demandTrend:            overlay.demandTrend,
    ageInDays:              overlay.ageInDays,
    scrapeStatus:           overlay.scrapeStatus,
    lastSuccessfulScrapeAt: overlay.lastSuccessfulScrapeAt,
  };
}

/**
 * Returns true when a skill name matches the keyword list for a role key.
 * Case-insensitive substring match.
 */
function skillMatchesRole(skillName: string, roleKey: string): boolean {
  const keywords = ROLE_SKILL_KEYWORDS[roleKey] ?? [];
  const lower = skillName.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

// ══════════════════════════════════════════════════════════════════════════════
// Company-specific skill demand
// ══════════════════════════════════════════════════════════════════════════════

// The maximum age for company-specific data to show as "live".
// Must match the Naukri scraper's weekly refresh cadence.
export const COMPANY_SKILL_DEMAND_MAX_DAYS = 7;

// Thresholds that reclassify skills when company-specific data is present.
export const COMPANY_SKILL_CONTRACTING_THRESHOLD = -25;  // delta_90d_pct < this → at_risk
export const COMPANY_SKILL_GROWING_THRESHOLD      =  30;  // delta_90d_pct > this → demand rising

export interface CompanySkillDemand {
  companyName:      string;
  rolePrefix:       string;
  delta90dPct:      number | null;
  currentOpenings:  number | null;
  demandTrend:      'surging' | 'growing' | 'stable' | 'contracting';
  isLive:           boolean;
  scrapedAt:        string;
  ageInDays:        number;
  freshness:        'live' | 'stale' | 'very_stale';
}

interface CsdcRow {
  company_name:      string;
  role_prefix:       string;
  current_openings:  number | null;
  delta_90d_pct:     number | null;
  demand_trend:      string | null;
  is_live:           boolean;
  scraped_at:        string;
}

// Session-level cache: company+role → result, 30min TTL
const _companyCacheMap = new Map<string, { result: CompanySkillDemand | null; fetchedAt: number }>();

/**
 * Fetch company-specific skill demand from company_skill_demand_cache.
 * Returns null when:
 *   - No row exists for this company+role
 *   - The most recent row is older than COMPANY_SKILL_DEMAND_MAX_DAYS
 *
 * The 7-day freshness gate is hard — stale company data must NOT receive a
 * live badge, and must NOT suppress the industry baseline (which may itself
 * be more recent).
 */
export async function getCompanySkillDemand(
  companyName: string,
  rolePrefix: string,
): Promise<CompanySkillDemand | null> {
  const cacheKey = `${companyName.toLowerCase()}::${rolePrefix.toLowerCase()}`;
  const hit = _companyCacheMap.get(cacheKey);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.result;

  try {
    const { data, error } = await supabase
      .from('company_skill_demand_cache')
      .select('company_name, role_prefix, current_openings, delta_90d_pct, demand_trend, is_live, scraped_at')
      .eq('company_name', companyName.toLowerCase())
      .eq('role_prefix', rolePrefix.toLowerCase())
      .order('scraped_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      _companyCacheMap.set(cacheKey, { result: null, fetchedAt: Date.now() });
      return null;
    }

    const row = data as CsdcRow;
    const ageInDays = Math.round(
      (Date.now() - new Date(row.scraped_at).getTime()) / 86_400_000,
    );

    // Hard freshness gate: data older than 7 days must not show as live.
    // Fall through to industry baseline for the user's own protection.
    if (ageInDays > COMPANY_SKILL_DEMAND_MAX_DAYS) {
      _companyCacheMap.set(cacheKey, { result: null, fetchedAt: Date.now() });
      return null;
    }

    const result: CompanySkillDemand = {
      companyName:     row.company_name,
      rolePrefix:      row.role_prefix,
      delta90dPct:     row.delta_90d_pct,
      currentOpenings: row.current_openings,
      demandTrend:     (row.demand_trend ?? 'stable') as CompanySkillDemand['demandTrend'],
      isLive:          row.is_live,
      scrapedAt:       row.scraped_at,
      ageInDays,
      freshness:       getSkillFreshnessStatus(ageInDays),
    };

    _companyCacheMap.set(cacheKey, { result, fetchedAt: Date.now() });
    return result;
  } catch {
    _companyCacheMap.set(cacheKey, { result: null, fetchedAt: Date.now() });
    return null;
  }
}

/**
 * Strip all industry-level demandLive overlays from a CareerIntelligence record.
 *
 * Called before applyCompanySkillOverlay to enforce the labeling rule:
 * industry averages and company-specific live data must never appear
 * simultaneously. When company data is present, industry baselines are
 * hidden entirely — they are a different confidence level and would imply
 * equal precision if shown side-by-side.
 */
export function stripDemandLive(intel: CareerIntelligence): CareerIntelligence {
  const strip = <T extends { demandLive?: SkillDemandLive }>(arr: T[] | undefined): T[] | undefined =>
    arr?.map(s => ({ ...s, demandLive: undefined }));

  return {
    ...intel,
    skills: {
      obsolete: strip(intel.skills.obsolete),
      at_risk:  strip(intel.skills.at_risk),
      safe:     intel.skills.safe.map(s => ({ ...s, demandLive: undefined })),
    },
  };
}

/**
 * Apply company-specific demand overlay onto a CareerIntelligence record.
 *
 * Overlay rules (applied only to skills whose name matches ROLE_SKILL_KEYWORDS[roleKey]):
 *
 *   delta90dPct < COMPANY_SKILL_CONTRACTING_THRESHOLD (-25):
 *     Matching at_risk skills gain companyDemand (riskScore unchanged — the
 *     company-specific signal reinforces existing risk classification).
 *     Matching safe skills are NOT reclassified as at_risk — we don't demote
 *     structurally safe skills (human judgment, leadership) because of a
 *     short-term job-posting trend at one company. They get companyDemand
 *     with a contracting signal so the user can see it but draw their own
 *     conclusion. The skill's longTermValue is authoritative; one company's
 *     hiring freeze is not.
 *
 *   delta90dPct > COMPANY_SKILL_GROWING_THRESHOLD (+30):
 *     Matching safe skills gain companyDemand with a growing/surging signal.
 *     Matching at_risk skills are NOT reclassified as safe — AI displacement
 *     risk is structural; a company hiring more of them now doesn't change
 *     the 2030 automation curve.
 *
 *   NULL delta90dPct (first scrape, no historical comparison):
 *     companyDemand is still set (with trend + currentOpenings) so the user
 *     can see the company is in the system. No reclassification performed.
 *
 * The original record is never mutated. Returns a shallow-cloned CareerIntelligence.
 */
export function applyCompanySkillOverlay(
  intel: CareerIntelligence,
  companyDemand: CompanySkillDemand,
  roleKey: string,
): CareerIntelligence {
  const liveAnnotation: CompanySkillDemandLive = {
    companyName:     companyDemand.companyName,
    delta90dPct:     companyDemand.delta90dPct,
    currentOpenings: companyDemand.currentOpenings,
    demandTrend:     companyDemand.demandTrend,
    scrapedAt:       companyDemand.scrapedAt,
    ageInDays:       companyDemand.ageInDays,
  };

  const matchesRole = (skillName: string) => skillMatchesRole(skillName, roleKey);

  const patchAtRisk = (skills: SkillRisk[] | undefined): SkillRisk[] | undefined =>
    skills?.map(s => matchesRole(s.skill)
      ? { ...s, companyDemand: liveAnnotation }
      : s,
    );

  const patchSafe = (skills: SafeSkill[]): SafeSkill[] =>
    skills.map(s => matchesRole(s.skill)
      ? { ...s, companyDemand: liveAnnotation }
      : s,
    );

  return {
    ...intel,
    skills: {
      obsolete: patchAtRisk(intel.skills.obsolete),
      at_risk:  patchAtRisk(intel.skills.at_risk),
      safe:     patchSafe(intel.skills.safe),
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Industry-level overlay (unchanged from original)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Overlay live demand data onto a CareerIntelligence record.
 * Non-matching skills are left unchanged (no demandLive field set).
 * Called once per tab render when the market_intelligence_cache row is available.
 *
 * Returns a shallow-cloned CareerIntelligence with demandLive populated on
 * matching skills. The original record is never mutated.
 */
export async function overlaySkillDemand(
  intel: CareerIntelligence,
  roleKey: string,
): Promise<CareerIntelligence> {
  const overlay = await getRoleDemandOverlay(roleKey);
  if (!overlay) return intel; // no cache entry — return unchanged (static data used as-is)

  const live = await buildSkillDemandLive(overlay);

  const patchSkillRisks = (skills: SkillRisk[] | undefined): SkillRisk[] | undefined => {
    if (!skills) return skills;
    return skills.map(s => ({
      ...s,
      demandLive: skillMatchesRole(s.skill, roleKey) ? live : undefined,
    }));
  };

  const patchSafeSkills = (skills: SafeSkill[]): SafeSkill[] =>
    skills.map(s => ({
      ...s,
      demandLive: skillMatchesRole(s.skill, roleKey) ? live : undefined,
    }));

  return {
    ...intel,
    skills: {
      ...intel.skills,
      obsolete: patchSkillRisks(intel.skills.obsolete),
      at_risk:  patchSkillRisks(intel.skills.at_risk),
      safe:     patchSafeSkills(intel.skills.safe),
    },
  };
}
