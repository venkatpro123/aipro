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
//
// GDPR data minimization (EU users):
//   monthly_expenses_usd and savings_months_runway are NEVER sent to Supabase
//   when isFinancialDataLocal() returns true (EU user, no cloud financial consent).
//   These fields are stored in localStorage via gdprService.setLocalFinancialData().
//   — Location expansion: metro_area (structured slug), city_tier (India)
//   — computeFinancialRunway() helper

import { supabase } from '../utils/supabase';
import { isFinancialDataLocal, setLocalFinancialData } from './gdprService';

export type SalaryBand = '<50k' | '50-100k' | '100-150k' | '150-250k' | '250k+';
export type VisaStatus =
  // No visa constraint
  | 'citizen'
  | 'permanent_resident'
  // US
  | 'h1b'
  | 'l1'
  | 'opt_stem'
  | 'opt'            // legacy alias — kept for backward compat with stored profiles
  | 'tn'
  // UK
  | 'uk_skilled_worker'
  // EU
  | 'eu_blue_card'
  | 'eu_blue_card_germany'  // Germany-specific §20 AufenthG 6-month job-search extension
  // APAC
  | 'singapore_ep'
  | 'singapore_s_pass'
  | 'australia_482_tss'
  | 'philippines_9g_aep'
  | 'japan_work_visa'
  // Canada
  | 'canada_lmia_permit'
  // MENA
  | 'uae_employment_visa'
  | 'uae_golden_visa'
  | 'saudi_iqama'
  | 'qatar_work_permit'
  | 'kuwait_work_permit'
  | 'gcc_sponsored'
  // Generic / legacy
  | 'other_work_auth'
  | 'other'          // legacy alias
  | 'not_applicable'
  | 'na';            // legacy alias
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

  // ── Performance self-assessment (v40.1) ──────────────────────────────────
  /**
   * Self-reported performance tier — feeds D4 (weight 0.18) in the scoring engine.
   * Persisted here so the LayoffInputForm pre-populates from the last audit rather
   * than defaulting to "average" every session.
   * analyzePerformanceCredibility() in layoffScoreEngine.ts may downgrade 'top'
   * to 'average' when contradicting signals are detected (no promotion in 3+ years,
   * no key relationships, etc.) — the engine-effective tier may differ from this value.
   */
  performanceTier?: 'top' | 'average' | 'below' | 'unknown' | null;

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

  // ── v40.0 global currency ────────────────────────────────────────────────
  /** ISO 4217 currency code for the user's local market (e.g. 'SGD', 'PHP', 'GBP').
   *  Auto-detected from metro+visaStatus if not explicitly set; defaults to 'USD'. */
  localCurrencyCode?: string | null;
  /** Monthly salary in the user's local currency (raw, before USD conversion).
   *  Stored so the UI can show "SGD 8,500/mo = ~$6,340 USD" without re-prompting. */
  localMonthlySalaryRaw?: number | null;

  // ── v40.0 first-audit tracking ────────────────────────────────────────────
  /** ISO timestamp when the user completed their first audit. Null = never seen.
   *  Stored in DB so incognito / new-device sessions don't re-show the wizard. */
  firstAuditCompletedAt?: string | null;

  // ── v40.0 knowledge type ──────────────────────────────────────────────────
  /** Sub-classification of critical_knowledge uniqueness depth.
   *  Drives differentiated inaction scenario narratives.
   *  Only meaningful when uniquenessDepth === 'critical_knowledge'. */
  uniquenessKnowledgeType?: UniquenessKnowledgeType | null;

  // ── v40.0 citizenship region ──────────────────────────────────────────────
  /**
   * Citizenship / passport region — separate from visa status.
   * EU citizens on non-EU work visas have 27-country fallback mobility
   * that reduces visa dependency score, caps risk at MODERATE, and lowers
   * the score amplifier in visaRiskEngine. Null = not provided (treated as 'other').
   */
  citizenshipRegion?: 'eu' | 'us_citizen' | 'uk_citizen' | 'au_citizen' | 'ca_citizen' | 'other' | null;

  // ── Phase 4: Career Twin ──────────────────────────────────────────────────
  /** Primary career goal set during onboarding — drives recommendation framing */
  primaryGoal?: string | null;
}

export type UniquenessKnowledgeType =
  | 'system_specific'       // legacy system / migration-deadline moat
  | 'client_relationship'   // personal client trust — portable to next employer
  | 'process_institutional' // undocumented tribal process memory
  | 'domain_expert'         // regulatory / deep-domain specialist
  | 'leadership_capital';   // organizational authority — mobile, follows person

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
  // v40.0 global currency
  'local_currency_code',
  'local_monthly_salary_raw',
  // v40.0 first-audit tracking
  'first_audit_completed_at',
  // v40.0 knowledge type
  'uniqueness_knowledge_type',
  // v40.0 citizenship region
  'citizenship_region',
  // v40.1 performance tier
  'performance_tier',
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
    // v40.0 global currency
    localCurrencyCode: data.local_currency_code ?? null,
    localMonthlySalaryRaw: data.local_monthly_salary_raw != null ? Number(data.local_monthly_salary_raw) : null,
    // v40.0 first-audit tracking
    firstAuditCompletedAt: data.first_audit_completed_at ?? null,
    // v40.0 knowledge type
    uniquenessKnowledgeType: (data.uniqueness_knowledge_type as UniquenessKnowledgeType) ?? null,
    // v40.0 citizenship region
    citizenshipRegion: data.citizenship_region ?? null,
    // v40.1 performance tier
    performanceTier: data.performance_tier ?? null,
    // Phase 4: Career Twin
    primaryGoal: data.primary_goal ?? null,
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
  // GDPR data minimization: monthly_expenses_usd and savings_months_runway are
  // localStorage-only for EU users who haven't consented to cloud financial storage.
  // Salary (monthly_salary_usd/inr) is always stored — needed for salary delta.
  if (patch.monthlySalaryUsd    !== undefined) row.monthly_salary_usd    = patch.monthlySalaryUsd;
  if (patch.monthlySalaryInr    !== undefined) row.monthly_salary_inr    = patch.monthlySalaryInr;
  if (patch.hasEquityVesting    !== undefined) row.has_equity_vesting    = patch.hasEquityVesting;
  if (patch.equityVestMonths    !== undefined) row.equity_vest_months    = patch.equityVestMonths;

  if (isFinancialDataLocal()) {
    // EU user without cloud financial consent — route to localStorage only.
    setLocalFinancialData({
      monthlyExpensesUsd:  patch.monthlyExpensesUsd,
      savingsMonthsRunway: patch.savingsMonthsRunway,
    });
  } else {
    if (patch.monthlyExpensesUsd  !== undefined) row.monthly_expenses_usd  = patch.monthlyExpensesUsd;
    if (patch.savingsMonthsRunway !== undefined) row.savings_months_runway = patch.savingsMonthsRunway;
  }

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

  // ── v40.0 global currency ────────────────────────────────────────────────
  if (patch.localCurrencyCode         !== undefined) row.local_currency_code         = patch.localCurrencyCode;
  if (patch.localMonthlySalaryRaw     !== undefined) row.local_monthly_salary_raw    = patch.localMonthlySalaryRaw;

  // ── v40.0 knowledge type ─────────────────────────────────────────────────
  if (patch.uniquenessKnowledgeType   !== undefined) row.uniqueness_knowledge_type   = patch.uniquenessKnowledgeType;

  // ── v40.0 citizenship region ─────────────────────────────────────────────
  if (patch.citizenshipRegion         !== undefined) row.citizenship_region          = patch.citizenshipRegion;

  // ── v40.1 performance tier ───────────────────────────────────────────────
  if (patch.performanceTier           !== undefined) row.performance_tier            = patch.performanceTier;

  // ── Phase 4: Career Twin ─────────────────────────────────────────────────
  if (patch.primaryGoal               !== undefined) row.primary_goal               = patch.primaryGoal;

  const { error } = await supabase
    .from('user_profiles')
    .upsert(row, { onConflict: 'user_id' });

  if (error) return null;
  return fetchUserProfile();
}

// v40.0 — Write first-audit completion timestamp to user_profiles.
// Uses UPDATE (not UPSERT) to avoid creating incomplete rows for users who
// haven't set up a profile yet. If no row exists, the UPDATE affects 0 rows
// and silently no-ops — correct, because localStorage handles the same-device
// case and the DB update is only needed for cross-device/incognito coverage.
export async function markFirstAuditCompleted(): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;
    await supabase
      .from('user_profiles')
      .update({ first_audit_completed_at: new Date().toISOString() })
      .eq('user_id', userId);
    // Note: if no profile row exists yet, the UPDATE touches 0 rows (not an error).
    // The user will be prompted for a full profile on their next login, at which
    // point markFirstAuditCompleted() will be called again and the UPDATE will land.
  } catch {
    // Non-fatal — localStorage cache still covers same-device repeat-session detection.
  }
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
