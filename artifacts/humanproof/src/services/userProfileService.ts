// userProfileService.ts — v16.0
// Read/write helpers for the user_profiles table.
// Supabase RLS gates rows to auth.uid(); these helpers transparently no-op
// when the user is unauthenticated so callers don't need to special-case.
//
// v16.0 additions:
//   — Financial runway fields: monthly salary (USD + INR), expenses, runway,
//     equity vesting, dependents, dual-income household
//   — Career history: prior job changes, prior layoff survived, industry years
//   — Skills: self_rated_skills, target_skills
//   — Location expansion: metro_area (structured slug), city_tier (India)
//   — computeFinancialRunway() helper

import { supabase } from '../utils/supabase';

export type SalaryBand = '<50k' | '50-100k' | '100-150k' | '150-250k' | '250k+';
export type VisaStatus = 'citizen' | 'permanent_resident' | 'h1b' | 'l1' | 'opt' | 'other' | 'na';
export type CityTier = 'tier1' | 'tier2' | 'tier3';

// INR → USD conversion rate used for savings-runway normalisation.
// Clients can override this if they store a more recent rate elsewhere.
export const INR_TO_USD_RATE = 83;

export interface UserProfile {
  // ── Core (v15 fields — unchanged) ────────────────────────────────────────
  userId: string;
  salaryBand: SalaryBand | null;
  visaStatus: VisaStatus | null;
  metro: string | null;
  tenureYears: number | null;
  lastConfirmedAt: string | null;
  updatedAt: string | null;

  // ── Location & job market (v16) ──────────────────────────────────────────
  /** Structured metro slug, e.g. 'san_francisco', 'bangalore', 'new_york' */
  metroArea?: string | null;
  /** Tier classification used for Indian cities only */
  cityTier?: CityTier | null;

  // ── Financial situation (v16) ────────────────────────────────────────────
  /** Monthly gross salary in USD (convert INR client-side using INR_TO_USD_RATE) */
  monthlySalaryUsd?: number | null;
  /** Monthly gross salary in INR (raw; kept alongside USD for display) */
  monthlySalaryInr?: number | null;
  /** Monthly living expenses in USD */
  monthlyExpensesUsd?: number | null;
  /**
   * Months of savings runway.
   * Self-reported, or computed via computeFinancialRunway() when not provided.
   */
  savingsMonthsRunway?: number | null;
  /** Whether the user has unvested equity — creates a retention anchor */
  hasEquityVesting?: boolean | null;
  /** Months until the next significant vest cliff */
  equityVestMonths?: number | null;

  // ── Career history (v16) ─────────────────────────────────────────────────
  /** Total number of employer changes across entire career */
  priorJobChanges?: number | null;
  /** Has been laid off before and successfully landed a new role */
  priorLayoffSurvived?: boolean | null;
  /** Total years in this industry (vs. tenure at current company) */
  industryYears?: number | null;

  // ── Family / financial obligations (v16) ─────────────────────────────────
  /** Supports children, parents, or other dependents */
  hasDependents?: boolean | null;
  /** Spouse / partner is also employed — provides financial cushion */
  dualIncomeHousehold?: boolean | null;

  // ── Skills (v16) ─────────────────────────────────────────────────────────
  /** User-reported current skill list */
  selfRatedSkills?: string[] | null;
  /** Skills the user is actively working on acquiring */
  targetSkills?: string[] | null;

  // ── Role identity (v36) ──────────────────────────────────────────────────
  /** Free-text job title entered by user — resolves to canonicalKey for seniority/action dispatch */
  jobTitle?: string | null;
  /** Major industry sector key — 10-bucket classification (technology, finance, healthcare…) */
  industryKey?: string | null;
  /** Total years of professional experience across all employers */
  yearsExperience?: number | null;
}

const REPROMPT_AFTER_DAYS = 90;

// ─── DB column names for the SELECT projection ───────────────────────────────
const V16_SELECT_COLUMNS = [
  'user_id',
  'salary_band',
  'visa_status',
  'metro',
  'tenure_years',
  'last_confirmed_at',
  'updated_at',
  // v16 additions
  'metro_area',
  'city_tier',
  'monthly_salary_usd',
  'monthly_salary_inr',
  'monthly_expenses_usd',
  'savings_months_runway',
  'has_equity_vesting',
  'equity_vest_months',
  'prior_job_changes',
  'prior_layoff_survived',
  'industry_years',
  'has_dependents',
  'dual_income_household',
  'self_rated_skills',
  'target_skills',
  // v36 role identity
  'job_title',
  'industry_key',
  'years_experience',
].join(', ');

// ─── Row mapper ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfile(data: Record<string, any>): UserProfile {
  return {
    // v15 core
    userId: data.user_id,
    salaryBand: data.salary_band ?? null,
    visaStatus: data.visa_status ?? null,
    metro: data.metro ?? null,
    tenureYears: data.tenure_years != null ? Number(data.tenure_years) : null,
    lastConfirmedAt: data.last_confirmed_at ?? null,
    updatedAt: data.updated_at ?? null,
    // v16 location
    metroArea: data.metro_area ?? null,
    cityTier: (data.city_tier as CityTier) ?? null,
    // v16 financial
    monthlySalaryUsd: data.monthly_salary_usd != null ? Number(data.monthly_salary_usd) : null,
    monthlySalaryInr: data.monthly_salary_inr != null ? Number(data.monthly_salary_inr) : null,
    monthlyExpensesUsd: data.monthly_expenses_usd != null ? Number(data.monthly_expenses_usd) : null,
    savingsMonthsRunway: data.savings_months_runway != null ? Number(data.savings_months_runway) : null,
    hasEquityVesting: data.has_equity_vesting ?? null,
    equityVestMonths: data.equity_vest_months != null ? Number(data.equity_vest_months) : null,
    // v16 career
    priorJobChanges: data.prior_job_changes != null ? Number(data.prior_job_changes) : null,
    priorLayoffSurvived: data.prior_layoff_survived ?? null,
    industryYears: data.industry_years != null ? Number(data.industry_years) : null,
    // v16 obligations
    hasDependents: data.has_dependents ?? null,
    dualIncomeHousehold: data.dual_income_household ?? null,
    // v16 skills
    selfRatedSkills: data.self_rated_skills ?? null,
    targetSkills: data.target_skills ?? null,
    // v36 role identity
    jobTitle: data.job_title ?? null,
    industryKey: data.industry_key ?? null,
    yearsExperience: data.years_experience != null ? Number(data.years_experience) : null,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchUserProfile(): Promise<UserProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select(V16_SELECT_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToProfile(data);
}

export async function upsertUserProfile(
  patch: Partial<Omit<UserProfile, 'userId' | 'updatedAt' | 'lastConfirmedAt'>> & { confirm?: boolean },
): Promise<UserProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return null;

  const row: Record<string, unknown> = { user_id: userId };

  // ── v15 core fields ──────────────────────────────────────────────────────
  if (patch.salaryBand      !== undefined) row.salary_band    = patch.salaryBand;
  if (patch.visaStatus      !== undefined) row.visa_status    = patch.visaStatus;
  if (patch.metro           !== undefined) row.metro          = patch.metro;
  if (patch.tenureYears     !== undefined) row.tenure_years   = patch.tenureYears;
  if (patch.confirm)                       row.last_confirmed_at = new Date().toISOString();

  // ── v16 location ─────────────────────────────────────────────────────────
  if (patch.metroArea       !== undefined) row.metro_area     = patch.metroArea;
  if (patch.cityTier        !== undefined) row.city_tier      = patch.cityTier;

  // ── v16 financial ─────────────────────────────────────────────────────────
  if (patch.monthlySalaryUsd    !== undefined) row.monthly_salary_usd    = patch.monthlySalaryUsd;
  if (patch.monthlySalaryInr    !== undefined) row.monthly_salary_inr    = patch.monthlySalaryInr;
  if (patch.monthlyExpensesUsd  !== undefined) row.monthly_expenses_usd  = patch.monthlyExpensesUsd;
  if (patch.savingsMonthsRunway !== undefined) row.savings_months_runway = patch.savingsMonthsRunway;
  if (patch.hasEquityVesting    !== undefined) row.has_equity_vesting    = patch.hasEquityVesting;
  if (patch.equityVestMonths    !== undefined) row.equity_vest_months    = patch.equityVestMonths;

  // ── v16 career ───────────────────────────────────────────────────────────
  if (patch.priorJobChanges     !== undefined) row.prior_job_changes     = patch.priorJobChanges;
  if (patch.priorLayoffSurvived !== undefined) row.prior_layoff_survived = patch.priorLayoffSurvived;
  if (patch.industryYears       !== undefined) row.industry_years        = patch.industryYears;

  // ── v16 obligations ──────────────────────────────────────────────────────
  if (patch.hasDependents       !== undefined) row.has_dependents        = patch.hasDependents;
  if (patch.dualIncomeHousehold !== undefined) row.dual_income_household = patch.dualIncomeHousehold;

  // ── v16 skills ───────────────────────────────────────────────────────────
  if (patch.selfRatedSkills     !== undefined) row.self_rated_skills     = patch.selfRatedSkills;
  if (patch.targetSkills        !== undefined) row.target_skills         = patch.targetSkills;

  // ── v36 role identity ────────────────────────────────────────────────────
  if (patch.jobTitle            !== undefined) row.job_title             = patch.jobTitle;
  if (patch.industryKey         !== undefined) row.industry_key          = patch.industryKey;
  if (patch.yearsExperience     !== undefined) row.years_experience      = patch.yearsExperience;

  const { error } = await supabase
    .from('user_profiles')
    .upsert(row, { onConflict: 'user_id' });

  if (error) return null;
  return fetchUserProfile();
}

// Returns true when the modal should re-prompt for confirmation.
// First-visit (no row yet) returns true. Stale row (>90d) returns true.
export function shouldRepromptProfile(profile: UserProfile | null): boolean {
  if (!profile) return true;
  if (!profile.lastConfirmedAt) return true;
  const ageMs = Date.now() - new Date(profile.lastConfirmedAt).getTime();
  return ageMs > REPROMPT_AFTER_DAYS * 86_400_000;
}

// ─── Financial runway helper ──────────────────────────────────────────────────
/**
 * Derives `savings_months_runway` from salary + expenses when the user has not
 * self-reported it directly.
 *
 * Computation:
 *   The caller is expected to know total liquid savings separately
 *   (we don't store that PII). This helper instead estimates runway from the
 *   expense-coverage perspective:
 *
 *   If the user has provided `savingsMonthsRunway` explicitly, return it as-is.
 *   Otherwise, if we have `monthlySalaryUsd` (or can convert from INR) and
 *   `monthlyExpensesUsd`, we return an *indicative* runway assuming the user
 *   has saved 6 months of net income as a heuristic baseline.
 *
 *   This is intentionally conservative — the value will be overridden in the
 *   ProfileSetupModal once the user reports their actual savings.
 *
 * Returns null when there is insufficient data to make any estimate.
 */
export function computeFinancialRunway(profile: UserProfile): number | null {
  // If directly reported, return immediately.
  if (profile.savingsMonthsRunway != null) return profile.savingsMonthsRunway;

  // Resolve monthly salary in USD.
  let salaryUsd: number | null = profile.monthlySalaryUsd ?? null;
  if (salaryUsd == null && profile.monthlySalaryInr != null) {
    salaryUsd = profile.monthlySalaryInr / INR_TO_USD_RATE;
  }

  const expensesUsd = profile.monthlyExpensesUsd ?? null;

  // Need both data points for any calculation.
  if (salaryUsd == null || expensesUsd == null || expensesUsd <= 0) return null;

  // Conservative baseline: assume 6 months of net savings (salary − expenses).
  const estimatedSavings = Math.max(0, salaryUsd - expensesUsd) * 6;
  const runway = estimatedSavings / expensesUsd;

  // Round to 1 decimal; return null if the result is implausibly small (<0.1)
  return runway >= 0.1 ? Math.round(runway * 10) / 10 : null;
}
