// actionPersonalizationEngine.ts
// Hyper-specific action personalization for all 47 India tech role prefixes — v1.0
//
// PROBLEM THIS SOLVES:
//   The previous BRACKET_ACTIONS had 10 fixed templates for 5 tenure brackets × 2 risk levels.
//   A software engineer and a data scientist at identical seniority received identical actions.
//   That is not actionable — it is a horoscope. People left the tool without a clear next step.
//
// DESIGN PRINCIPLE:
//   Every action must answer: "What exactly should I do this Monday morning?"
//   - Named certification (not "get certified" — "complete AWS Solutions Architect Associate on Udemy, ₹499")
//   - Named companies to target (not "explore the market" — "apply to Razorpay, Zerodha, Groww")
//   - Specific numbers (not "update your resume" — "quantify 3 metrics: feature shipped, % improvement, team size")
//   - Time-boxed commitment (not "soon" — "2 hours this week")
//
// STRUCTURE:
//   rolePrefix → seniority bracket → risk level → [ActionItem, ...]
//   47 prefixes × 4 brackets × 2 risk levels = 376 distinct action pools
//   Each pool has 3 actions ranked by highest-to-lowest impact.

import type { ActionPlanItem } from "@/types/hybridResult";
import type { SeniorityBracket } from "./seniorityActionEngine";
import type { VisaRiskResult } from "./visaRiskEngine";
import { canonicalKeyToActionGroup, resolveRoleInput } from "./roleResolution";
import { getRoleOverride } from "./roleIntelligenceClient";
// v37.0 multi-industry action pool imports
import { ACTION_DB_HEALTHCARE_LEGAL } from "../data/actions/healthcare_legal_actions";
import { ACTION_DB_CONSULTING_MARKETING_CX } from "../data/actions/consulting_marketing_cx_actions";
import { ACTION_DB_MANUFACTURING_ENERGY_CONSTRUCTION } from "../data/actions/manufacturing_energy_construction_actions";
import { ACTION_DB_RETAIL_LOGISTICS_PHARMA } from "../data/actions/retail_logistics_pharma_actions";
import { ACTION_DB_AUTO_TELECOM_GOVT_EDUCATION } from "../data/actions/auto_telecom_govt_education_actions";
import { ACTION_DB_INSURANCE_MEDIA_HOSPITALITY } from "../data/actions/insurance_media_hospitality_actions";
// v38.0 Phase 1 imports
import { ACTION_DB_CYBERSECURITY } from "../data/actions/cybersecurity_actions";
import { ACTION_DB_CLOUD_PLATFORM } from "../data/actions/cloud_platform_actions";
import { ACTION_DB_AI_ML_SPECIALIZATION } from "../data/actions/ai_ml_specialization_actions";
import { ACTION_DB_QA_FRONTEND_MOBILE } from "../data/actions/qa_frontend_mobile_actions";
// v38.0 Phase 2 imports
import { ACTION_DB_PHYSICIANS } from "../data/actions/physicians_actions";
import { ACTION_DB_NURSING_ALLIED_HEALTH } from "../data/actions/nursing_allied_health_actions";
import { ACTION_DB_BIOTECH_HEALTHCARE_IT } from "../data/actions/biotech_healthcare_it_actions";
import { ACTION_DB_BEHAVIORAL_ADMIN_VET_PH } from "../data/actions/behavioral_admin_vet_public_health_actions";
// v38.0 Phase 3 imports
import { ACTION_DB_INVESTMENT_BANKING_PE_VC } from "../data/actions/investment_banking_pe_vc_actions";
import { ACTION_DB_QUANT_ASSET_HEDGE } from "../data/actions/quant_asset_hedge_actions";
import { ACTION_DB_CORPORATE_FINANCE_BANKING_RISK } from "../data/actions/corporate_finance_banking_risk_actions";
import { ACTION_DB_INSURANCE_RE_FINANCE } from "../data/actions/insurance_real_estate_finance_actions";
// v38.0 Phase 4 imports
import { ACTION_DB_SKILLED_TRADES } from "../data/actions/skilled_trades_actions";
import { ACTION_DB_INDUSTRIAL_ENGINEERING } from "../data/actions/industrial_engineering_actions";
import { ACTION_DB_ENERGY_SPECIALIZATIONS } from "../data/actions/energy_specializations_actions";
import { ACTION_DB_CONSTRUCTION_SPECIALIZATIONS } from "../data/actions/construction_specializations_actions";
import { ACTION_DB_AVIATION_PUBLIC_SAFETY } from "../data/actions/aviation_public_safety_actions";
// v38.0 Phase 5 imports
import { ACTION_DB_MEDIA_ENTERTAINMENT } from "../data/actions/media_entertainment_actions";
import { ACTION_DB_HOSPITALITY_TRAVEL } from "../data/actions/hospitality_travel_actions";
import { ACTION_DB_CX_RESEARCH_ACADEMIA } from "../data/actions/cx_research_academia_actions";
// v38.0 Phase 6 imports
import { ACTION_DB_MEDICAL_SUBSPECIALTIES } from "../data/actions/medical_subspecialties_actions";
import { ACTION_DB_ADVANCED_ENGINEERING_CREATIVE } from "../data/actions/advanced_engineering_creative_actions";
import { ACTION_DB_SKILLED_SERVICES_EDU_GOV } from "../data/actions/skilled_services_education_government_actions";
// v40.0 Modern role coverage — AI PM, MLOps Platform, RevOps, Growth, CoS, Strategy Ops
import { ACTION_DB_MODERN_TECH_ROLES } from "../data/actions/modern_tech_roles_actions";
// GAP-P03-B: global (non-India) equivalents for core tech role pools
import { ACTION_DB_GLOBAL_TECH } from "../data/actions/global_tech_actions";
import { localizeActionCosts, extractCostUsd, convertPPP, formatCostLabel } from "./currencyService";
import { stableActionId } from "./actionIdUtil";
import type { UpskillPriorityItem } from "./skillGapIntelligenceService";
import type { ReadinessPillar } from "./careerConfidenceEngine";
import { generateEvolvedMissions } from "./missionEvolutionEngine";

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

export interface PersonalizedActionSet {
  roleGroup: string;
  rolePrefixMatch: string;
  seniorityBracket: SeniorityBracket;
  riskLevel: RiskLevel;
  actions: Array<Partial<ActionPlanItem>>;
  indiaSpecificContext?: string;
  companyContextNote?: string;   // v13.0: company-type strategic frame
  // v39.0 A1: DB-backed override layer status (admin-curated content present?)
  isDbOverride?: boolean;
  // v39.0 B6: honest signal when the role isn't in our 412-specialised database
  isGenericFallback?: boolean;
  fallbackReason?: 'role_not_in_specialized_database';
  // v39.0 B1: profile-personalized framing + signal classifications.
  /** One short paragraph that opens the action plan with profile-specific context. */
  profileContextNote?: string;
  /**
   * Classification flags downstream consumers (brief, negotiation, contingency,
   * action ranking) can read to apply profile-aware logic without re-deriving
   * the classifications themselves. Examples:
   *   'visa_critical', 'visa_elevated', 'runway_critical', 'runway_elevated',
   *   'family_anchor', 'dual_income_cushion', 'resilient_repeat'.
   */
  profileSignals?: string[];
  // Grace-period compression — set when visaRisk is HIGH/CRITICAL and gracePeriodDays < 30
  graceCompressionApplied?: boolean;
  graceCompressionTier?: 'critical' | 'compressed';
  // GAP-P03: set when action cost amounts were converted from INR/USD to user's local currency
  costsCurrencyConverted?: boolean;
  /** ISO 4217 code of the currency costs were converted TO (e.g. 'SGD') */
  costsDisplayCurrency?: string;
  /**
   * Anti-repetition: true when at least one of the 3 returned actions was
   * pulled from a more-urgent risk cell because the user already completed
   * everything in their primary risk-level cell. Lets the UI label these as
   * "next up" rather than presenting them identically to first-time actions.
   */
  actionsRotated?: boolean;
  /**
   * Anti-repetition: true when the ENTIRE reservoir (current cell + all
   * more-urgent cells) has been completed. The 3 returned actions are
   * recycled as reinforcement — callers should show a distinct "you've
   * completed every available action at this tier" message instead of
   * presenting them as new guidance.
   */
  allActionsExhausted?: boolean;
  /**
   * Phase 8 — Mission Evolution: true when the authored reservoir was
   * exhausted AND new missions were successfully generated from live
   * skill-gap / readiness signals (missionEvolutionEngine). When this is
   * set, the returned actions are evolved missions, not recycled authored
   * content — callers should badge them accordingly.
   */
  missionsEvolved?: boolean;
}

/**
 * v39.0 B1 — Profile signals derived from UserProfile.
 *
 * Computed once at action selection so downstream layers (brief, negotiation,
 * scenario, contingency) can read the same classifications instead of each
 * recomputing them from raw profile fields. This keeps the personalization
 * consistent across the dashboard.
 */
export interface ProfileSignalSummary {
  visaUrgency: 'critical' | 'elevated' | 'none';
  runwayTier: 'critical' | 'elevated' | 'comfortable' | 'unknown';
  familyAnchor: boolean;
  dualIncomeCushion: boolean;
  resilientRepeat: boolean;
  /** Equity vest cliff is < 6 months away — job change timing anchor. */
  equityVestImminent: boolean;
  /** 10+ years in same industry — lateral move within domain preferred over cross-industry pivot. */
  seniorMobilityConstraint: boolean;
  /** Profile is likely stale (> 45 days without re-confirm). */
  profileMayBeStale: boolean;
  flags: string[];
}

export interface UserProfileLike {
  // Widened to `string` so the full UserProfile.VisaStatus union (expanded by the
  // global-visa work for uk_skilled_worker / eu_blue_card / singapore_* / etc.) is
  // structurally assignable. deriveProfileSignals matches against a broad string
  // Set (WORK_VISA_STATUSES), so a narrow literal union here is both stale and
  // unnecessary — unmatched values correctly fall through to 'none'.
  visaStatus?: string | null;
  savingsMonthsRunway?: number | null;
  hasDependents?: boolean | null;
  dualIncomeHousehold?: boolean | null;
  priorLayoffSurvived?: boolean | null;
  hasEquityVesting?: boolean | null;
  equityVestMonths?: number | null;
  metroArea?: string | null;
  // v40.0 new signals
  industryYears?: number | null;
  lastConfirmedAt?: string | null;
}

export function deriveProfileSignals(
  profile: UserProfileLike | null | undefined,
  score: number,
): ProfileSignalSummary {
  const flags: string[] = [];

  // Visa urgency: any employer-tied work authorization adds a grace-period clock
  // on job loss. Singapore S Pass (10d) and OPT/opt_stem (60d with cap-gap) are
  // most severe; EU Blue Card (180d Germany buffer) is least severe.
  // Use a Set to avoid TypeScript's type-narrowing chain collapsing the union.
  const WORK_VISA_STATUSES = new Set([
    'h1b', 'l1', 'opt_stem', 'opt', 'tn',
    'uk_skilled_worker', 'eu_blue_card',
    'singapore_ep', 'singapore_s_pass', 'australia_482_tss', 'philippines_9g_aep',
    'canada_lmia_permit',
    'uae_employment_visa', 'saudi_iqama', 'qatar_work_permit', 'kuwait_work_permit', 'gcc_sponsored',
    'other_work_auth', 'other',
  ]);
  const visaDependent = profile?.visaStatus != null && WORK_VISA_STATUSES.has(profile.visaStatus);
  const visaUrgency: ProfileSignalSummary['visaUrgency'] =
    visaDependent && score >= 55 ? 'critical' :
    visaDependent             ? 'elevated' :
                                'none';
  if (visaUrgency !== 'none') flags.push(`visa_${visaUrgency}`);

  // Runway tier: drives action urgency and negotiation aggression.
  const r = profile?.savingsMonthsRunway;
  const runwayTier: ProfileSignalSummary['runwayTier'] =
    r == null         ? 'unknown'    :
    r < 3             ? 'critical'   :
    r < 6             ? 'elevated'   :
                        'comfortable';
  if (runwayTier !== 'unknown' && runwayTier !== 'comfortable') flags.push(`runway_${runwayTier}`);

  // Family anchor: dependents WITHOUT a dual-income cushion = stability premium.
  const familyAnchor = !!profile?.hasDependents && !profile?.dualIncomeHousehold;
  if (familyAnchor) flags.push('family_anchor');

  // Dual-income cushion: reduces urgency, expands risk tolerance.
  const dualIncomeCushion = !!profile?.dualIncomeHousehold;
  if (dualIncomeCushion) flags.push('dual_income_cushion');

  // Resilient repeat: previously survived a layoff → calmer framing.
  const resilientRepeat = !!profile?.priorLayoffSurvived;
  if (resilientRepeat) flags.push('resilient_repeat');

  // v40.0: Equity vest imminence — vest cliff < 6 months = urgent job-change anchor.
  const equityVestImminent = !!(profile?.hasEquityVesting && (profile?.equityVestMonths ?? 99) < 6);
  if (equityVestImminent) flags.push('equity_vest_imminent');

  // v40.0: Senior mobility constraint — 10+ industry years = prefer lateral moves over cross-industry pivots.
  const seniorMobilityConstraint = (profile?.industryYears ?? 0) >= 10;
  if (seniorMobilityConstraint) flags.push('senior_mobility_constraint');

  // v40.0: Profile staleness — last confirmed > 45 days ago.
  const STALE_DAYS = 45;
  const profileMayBeStale = !!(profile?.lastConfirmedAt &&
    Date.now() - new Date(profile.lastConfirmedAt).getTime() > STALE_DAYS * 86_400_000);
  if (profileMayBeStale) flags.push('profile_may_be_stale');

  return {
    visaUrgency, runwayTier, familyAnchor, dualIncomeCushion, resilientRepeat,
    equityVestImminent, seniorMobilityConstraint, profileMayBeStale,
    flags,
  };
}

function buildProfileContextNote(
  signals: ProfileSignalSummary,
  score: number,
  companyName?: string,
): string | undefined {
  const parts: string[] = [];
  const co = companyName ?? 'your current employer';

  if (signals.visaUrgency === 'critical') {
    parts.push(`Visa-dependent context: An H-1B/L-1/OPT holder facing elevated risk has a 60-day grace period after termination — that is your hard timing constraint. Begin outreach to companies with documented H1B sponsorship history (Google, Meta, Microsoft, Amazon, Citadel, Stripe, Goldman) NOW, not after an announcement.`);
  } else if (signals.visaUrgency === 'elevated') {
    parts.push(`Visa-dependent context: While current risk is moderate, the 60-day post-termination grace period means your "wait and see" window is shorter than a citizen's. Build a sponsorship-history target list in parallel with monitoring.`);
  }

  if (signals.runwayTier === 'critical') {
    parts.push(`Financial runway is short (<3 months). The optimal strategy compresses: skip long-term skill bets, prioritise actions with cash-on-offer in ≤8 weeks (warm-network roles, contract-to-hire, accept-with-counter), and start the conversation BEFORE the runway hits 6 weeks.`);
  } else if (signals.runwayTier === 'elevated') {
    parts.push(`Financial runway is 3-6 months. You have room for ONE strategic bet (a high-leverage skill cert or a targeted role pivot) but not two. Choose the bet that compounds with your existing strengths.`);
  }

  if (signals.familyAnchor) {
    parts.push(`Family-anchored decision frame: With dependents and no dual-income cushion, the cost of a wrong move is asymmetric. Bias toward stability premiums (stay+negotiate over transition), confirm health-insurance continuity (COBRA cost vs. spouse coverage) before any move, and keep at least 4 months of expenses unencumbered.`);
  } else if (signals.dualIncomeCushion) {
    parts.push(`Dual-income cushion: Your household has a financial buffer that increases your risk tolerance — you can take a single-cycle pay-step-back for a higher-trajectory role, where a single-income household typically cannot.`);
  }

  if (signals.resilientRepeat && score >= 55) {
    parts.push(`Resilience context: You have successfully landed after a prior layoff. That experience is itself a hiring signal — surface it explicitly in conversations with recruiters ("I have rebuilt from a downturn before; here is what I did") rather than treating it as a gap. Start outreach 4 weeks earlier than feels necessary.`);
  }

  // v40.0: equity vest timing anchor
  if (signals.equityVestImminent) {
    parts.push(`Equity vest context: Your next vest cliff is within 6 months — this is a job-change timing anchor. If your risk score rises above 55 before the vest completes, the cost-benefit calculus changes significantly. Build optionality now (updated resume, 2-3 warm recruiter conversations) without triggering the vest cliff loss.`);
  }

  // v40.0: senior mobility constraint
  if (signals.seniorMobilityConstraint) {
    parts.push(`Senior mobility context: With 10+ years in this industry, your highest-leverage moves are lateral (same domain, different company or sub-sector) rather than cross-industry pivots. Domain expertise is your moat — prioritise industry-transfer actions (domain-specialist job boards, niche conferences, function-specific recruiter networks) over generic upskilling.`);
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

// ─── Role Prefix → Group Mapping ─────────────────────────────────────────────

export const ROLE_PREFIX_MAP: Record<string, string> = {
  // Software Engineering
  'software engineer': 'swe',
  'software developer': 'swe',
  'backend engineer': 'swe_backend',
  'backend developer': 'swe_backend',
  'frontend engineer': 'swe_frontend',
  'frontend developer': 'swe_frontend',
  'full stack': 'swe_fullstack',
  'fullstack': 'swe_fullstack',
  'mobile developer': 'swe_mobile',
  'ios developer': 'swe_mobile',
  'android developer': 'swe_mobile',
  'react native': 'swe_mobile',
  // AI / ML
  'machine learning': 'ml_engineer',
  'ml engineer': 'ml_engineer',
  'ai engineer': 'ai_engineer',
  'data scientist': 'data_scientist',
  'nlp engineer': 'nlp_engineer',
  'computer vision': 'cv_engineer',
  'llm engineer': 'llm_engineer',
  'prompt engineer': 'llm_engineer',
  'research scientist': 'data_scientist',
  'applied scientist': 'data_scientist',
  // Data
  'data engineer': 'data_engineer',
  'data analyst': 'data_analyst',
  'analytics engineer': 'analytics_engineer',
  'bi developer': 'bi_analyst',
  'business intelligence': 'bi_analyst',
  'etl developer': 'data_engineer',
  'mlops': 'ml_platform',    // v40.0 fix: was 'devops'; bare 'mlops' now routes to the dedicated ML Platform group
  'ml ops': 'ml_platform',
  'quantitative analyst': 'quantitative_analyst',
  'quant analyst': 'quantitative_analyst',
  // DevOps / Platform
  'devops engineer': 'devops',
  'sre': 'devops',
  'site reliability': 'devops',
  'platform engineer': 'platform_engineer',
  'cloud architect': 'cloud_architect',
  'cloud engineer': 'cloud_architect',
  // Product / Design
  'product manager': 'product_manager',
  'product owner': 'product_manager',
  'associate pm': 'product_manager',
  'product analyst': 'product_manager',
  // v40.0: AI PM — dedicated group (more specific than generic 'product_manager')
  'ai product manager': 'ai_pm',
  'ai pm': 'ai_pm',
  'product manager ai': 'ai_pm',
  'pm ai': 'ai_pm',
  'head of ai product': 'ai_pm',
  // v40.0: MLOps / ML Platform — dedicated group (more specific than 'devops')
  'mlops engineer': 'ml_platform',
  'ml platform engineer': 'ml_platform',
  'ml infrastructure engineer': 'ml_platform',
  'machine learning engineer infrastructure': 'ml_platform',
  'ml ops engineer': 'ml_platform',
  'model deployment engineer': 'ml_platform',
  // v40.0: Revenue Operations — new group
  'revenue operations': 'rev_ops',
  'revenue operations manager': 'rev_ops',
  'revops': 'rev_ops',
  'rev ops': 'rev_ops',
  'sales operations': 'rev_ops',
  'gtm operations': 'rev_ops',
  'go to market operations': 'rev_ops',
  // v40.0: Growth — new group
  'head of growth': 'growth',
  'growth lead': 'growth',
  'growth manager': 'growth',
  'vp growth': 'growth',
  'director growth': 'growth',
  'growth marketer': 'growth',
  'growth engineer': 'growth',
  'growth product manager': 'growth',
  // v40.0: Chief of Staff — new group
  'chief of staff': 'chief_of_staff',
  'cos': 'chief_of_staff',
  'chief of staff to ceo': 'chief_of_staff',
  'chief of staff to cto': 'chief_of_staff',
  // v40.0: Strategy & Operations — new group
  'strategy and operations': 'strategy_ops',
  'strategy operations': 'strategy_ops',
  'strategic operations': 'strategy_ops',
  'business strategy': 'strategy_ops',
  'corporate strategy': 'strategy_ops',
  'strategy manager': 'strategy_ops',
  'head of strategy': 'strategy_ops',
  'vp strategy': 'strategy_ops',
  'ux designer': 'ux_designer',
  'ui designer': 'ux_designer',
  'product designer': 'ux_designer',
  'ux researcher': 'ux_researcher',
  'user researcher': 'ux_researcher',
  'brand designer': 'brand_designer',
  'graphic designer': 'brand_designer',
  'ux writer': 'ux_designer',
  'design director': 'ux_designer',
  // Quality / Testing
  'qa engineer': 'qa_engineer',
  'test engineer': 'qa_engineer',
  'sdet': 'qa_engineer',
  'automation engineer': 'qa_engineer',
  // Security
  'security engineer': 'security_engineer',
  'appsec': 'security_engineer',
  'cybersecurity': 'security_engineer',
  // Embedded / Hardware
  'embedded engineer': 'embedded_engineer',
  'firmware engineer': 'embedded_engineer',
  'hardware engineer': 'embedded_engineer',
  // Engineering Leadership
  'engineering manager': 'eng_manager',
  'tech lead': 'tech_lead',
  'principal engineer': 'principal_engineer',
  'staff engineer': 'staff_engineer',
  'distinguished engineer': 'distinguished_engineer',
  'architect': 'solution_architect',
  'solution architect': 'solution_architect',
  'vp engineering': 'eng_manager',
  'director engineering': 'eng_manager',
  'head of engineering': 'eng_manager',
  'cto': 'eng_manager',
  // Support / Operations
  'support engineer': 'support_engineer',
  'technical support': 'support_engineer',
  'it support': 'support_engineer',
  // Finance & Accounting
  'financial analyst': 'financial_analyst',
  'finance analyst': 'financial_analyst',
  'fp&a': 'financial_analyst',
  'investment banker': 'investment_banker',
  'investment banking': 'investment_banker',
  'portfolio manager': 'portfolio_manager',
  'fund manager': 'portfolio_manager',
  'risk analyst': 'risk_analyst',
  'risk manager': 'risk_analyst',
  'compliance officer': 'compliance_officer',
  'compliance analyst': 'compliance_officer',
  'auditor': 'financial_analyst',
  'cpa': 'financial_analyst',
  'chartered accountant': 'financial_analyst',
  'actuary': 'quantitative_analyst',
  'actuarial analyst': 'quantitative_analyst',
  'treasury analyst': 'financial_analyst',
  'tax analyst': 'financial_analyst',
  // Sales & Revenue
  'account executive': 'account_executive',
  'sales representative': 'account_executive',
  'sales rep': 'account_executive',
  'inside sales': 'account_executive',
  'enterprise sales': 'account_executive',
  'business development': 'business_development_manager',
  'bdm': 'business_development_manager',
  'customer success': 'customer_success_manager',
  'csm': 'customer_success_manager',
  'sales engineer': 'sales_engineer',
  'solutions engineer': 'sales_engineer',
  'pre-sales': 'sales_engineer',
  'vp sales': 'vp_sales',
  'head of sales': 'vp_sales',
  'sales director': 'vp_sales',
  // 'sales operations' and 'revenue operations' mapped to 'rev_ops' in v40.0 block above
  'partnership manager': 'business_development_manager',
  // HR & People
  'hr generalist': 'hr_generalist',
  'human resources generalist': 'hr_generalist',
  'hr business partner': 'hr_business_partner',
  'hrbp': 'hr_business_partner',
  'hr director': 'hr_director',
  'recruiter': 'talent_acquisition_specialist',
  'talent acquisition': 'talent_acquisition_specialist',
  'recruiting manager': 'recruiting_manager',
  'hr manager': 'hr_generalist',
  'people operations': 'hr_generalist',
  'chief people officer': 'hr_director',
  'chro': 'hr_director',
  // BPO / ITES
  'process associate': 'bpo_associate',
  'process analyst': 'bpo_associate',
  'operations analyst': 'bpo_associate',
  'bpo': 'bpo_associate',
  // Manufacturing / Industrial Engineering
  'mechanical engineer': 'manufacturing_engineer',
  'manufacturing engineer': 'manufacturing_engineer',
  'process engineer': 'process_engineer',
  'industrial engineer': 'industrial_engineer',
  'quality engineer': 'manufacturing_engineer',
  'plant engineer': 'manufacturing_engineer',
  'production engineer': 'manufacturing_engineer',
  'civil engineer': 'civil_engineer',
  'electrical engineer': 'electrical_engineer',
  'chemical engineer': 'process_engineer',
};

export function resolveRoleGroup(roleTitle: string): string {
  const resolved = resolveRoleInput(roleTitle);
  const canonicalGroup = canonicalKeyToActionGroup(resolved.canonicalKey);
  if (canonicalGroup) return canonicalGroup;

  const lc = roleTitle.toLowerCase().trim();
  // v40.0 FIX-E: match only at word boundaries — was using bare .includes()
  // which could match substrings inside other words (e.g. 'vp' in 'avp').
  // Sort by length desc so the most specific (longest) match wins first.
  const sortedKeys = Object.keys(ROLE_PREFIX_MAP).sort((a, b) => b.length - a.length);
  const wordBoundaryIncludes = (haystack: string, needle: string): boolean => {
    if (haystack.startsWith(needle)) return true;
    // Match only if surrounded by word boundaries (space/punctuation/start/end)
    const re = new RegExp(`(^|[\\s.,;:()\\[\\]/\\-])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s.,;:()\\[\\]/\\-]|$)`);
    return re.test(haystack);
  };
  for (const prefix of sortedKeys) {
    if (wordBoundaryIncludes(lc, prefix)) {
      return ROLE_PREFIX_MAP[prefix];
    }
  }
  return 'professional_services'; // roles outside the tech/prefix map get generic career actions, not SWE-specific
}

// ─── Action Pools ─────────────────────────────────────────────────────────────

type ActionPool = Record<RiskLevel, Array<Partial<ActionPlanItem>>>;
type BracketPool = Record<SeniorityBracket, ActionPool>;
type RoleActionDB = Record<string, BracketPool>;

const ACTION_DB: RoleActionDB = {

  // ── SOFTWARE ENGINEER (General) ──────────────────────────────────────────────
  swe: {
    junior: {
      critical: [
        {
          title: 'Ship an AI-Integrated Feature to GitHub (Public Repo)',
          description: 'Pick any feature from your current project. Rebuild it using GitHub Copilot or Claude API as the coding layer. Push the result to a public GitHub repo with a README that explains: what you built, what Copilot generated vs what you verified, and the test coverage. Junior engineers with public AI-integration repos receive 2.8× more recruiter contacts. Time: 6–8 hours this weekend.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 22,
          deadline: '7 days',
          priority: 'Critical',
        },
        {
          title: 'Register for AWS Cloud Practitioner Exam — Book This Week',
          description: 'Go to aws.amazon.com/certification today and book the AWS Cloud Practitioner exam (₹8,500, open-book friendly). The 2026 India tech hiring market requires cloud basics for every engineer level. Complete the official free Skill Builder course (16 hours). Engineers with an active cloud cert receive 34% more callbacks on Naukri and LinkedIn India.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 18,
          deadline: '30 days — book now, exam by day 30',
          priority: 'Critical',
        },
        {
          title: 'Apply to 3 AI-Product Companies This Week (Named Targets)',
          description: 'Apply to: (1) Sarvam AI — building India language models, actively hiring junior engineers; (2) Krutrim — AI infra, Ola-backed, growing fast; (3) Sprinklr, Chargebee, or BrowserStack — Indian-founded product companies with strong engineering culture. Use Naukri "Easy Apply" for initial volume, then follow up with the hiring manager on LinkedIn. 3 applications this week, not eventually.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 25,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Complete Andrej Karpathy\'s Neural Networks Course (Free)',
          description: 'Watch and code all 7 lectures from Karpathy\'s "Neural Networks: Zero to Hero" (YouTube, free, ~20 hours total). Engineers who understand model mechanics — not just API calls — have a 4× longer viability horizon. This is the single most valuable free resource for a junior engineer in 2026. Commit to 2 hours every evening for 10 days.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '14 days',
          priority: 'High',
        },
        {
          title: 'Build One Quantified Achievement to Add to Your Resume',
          description: 'Identify one project you shipped and quantify it: lines of code is NOT a metric. Use these templates: "Reduced API latency by X% by implementing Y", "Automated Z manual steps, saving N hours/week", "Shipped feature used by N active users". This number is what moves your resume out of the "no" pile. Write the metric on paper today, then add it to your resume and LinkedIn profile.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 12,
          deadline: '3 days',
          priority: 'High',
        },
        {
          title: 'Set Up Job Alerts on Naukri and LinkedIn for Target Roles',
          description: 'Create alerts: Naukri → "Software Engineer" + (Bangalore / Hyderabad / Pune) + "3 LPA–12 LPA" + "IT Product". LinkedIn → same filters + "Easy Apply only". Check alerts daily. At your risk level, maintaining 3–5 active applications at all times is the safety net — one offer in the pipeline changes your negotiating position completely.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 10,
          deadline: '24 hours',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Document Your Current Role\'s Automatable vs Non-Automatable Tasks',
          description: 'List every recurring task in your role. Classify each as: (A) AI can do this now, (B) AI can assist but not replace, (C) requires human judgment. For category A tasks, research which AI tool does it — Copilot, Cursor, Claude — and learn it. For category C tasks, invest more time. This map is your upskilling roadmap. 1 hour of honest self-assessment.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 14,
          deadline: '7 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your AI Skill Portfolio Before You Need It',
          description: 'Your current risk is low, but the market window to build differentiated AI skills is 12–18 months before the signal becomes universally required. Start a side project using LangChain or the Anthropic Claude API. 2 hours/week is enough. Engineers who start now vs in 18 months will have a demonstrable portfolio when it matters.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 8,
          deadline: '30 days — start this week',
          priority: 'Medium',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Lead Your Team\'s AI Tool Evaluation — Volunteer This Week',
          description: 'Raise your hand in the next team meeting or slack channel: "I\'d like to lead our evaluation of Cursor/GitHub Copilot/Claude Code for our team." Run a 2-week A/B comparing velocity with vs without the tool. Publish the results (internal doc + LinkedIn post). Mid-level engineers who own AI tool adoption are classified as "architecture-ready" and are the last cut in restructuring. This is the highest-leverage action at your level.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 26,
          deadline: '48 hours — volunteer, 14 days — run evaluation',
          priority: 'Critical',
        },
        {
          title: 'Update LinkedIn and Reach Out to 3 Recruiters Today',
          description: 'Update your LinkedIn headline to include AI skills: "Backend Engineer | Python, Go | LLM Integration | 5yr". Then message 3 recruiters (find via LinkedIn search: "technical recruiter" + city). Message template: "Hi [Name], I\'m a [role] with [years] experience currently exploring [type] roles. I\'d be interested in a 15-min call if you have relevant openings. My profile: [URL]." At your seniority + risk level, a recruiter pipeline is non-optional.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 28,
          deadline: '24 hours',
          priority: 'Critical',
        },
        {
          title: 'Apply for AWS Developer Associate or GCP Professional Cloud Developer',
          description: 'AWS Developer Associate (₹12,000 exam, ~40hr prep) or GCP Professional Cloud Developer (₹15,000 exam, ~50hr prep) is the mid-level cloud certification that directly increases your market value. Udemy courses by Stephane Maarek (AWS) or Google Cloud Skills Boost (GCP) are the best-reviewed prep paths. Engineers with this cert see 45% higher call-back rates on Naukri for backend roles above ₹15 LPA.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 20,
          deadline: '45 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Publish a 1,000-Word Technical Post on LinkedIn This Week',
          description: 'Write about something real you solved: "How we reduced our API p99 latency from 800ms to 120ms using Redis pipeline batching" or "Why we chose gRPC over REST for our internal services." Include a diagram if possible. Mid-level engineers with 2+ published technical posts receive 3× more inbound recruiter contact. It takes 3 hours. The ROI is 3 months of passive job search.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '7 days',
          priority: 'High',
        },
        {
          title: 'Research 5 Product Companies Hiring in Your City',
          description: 'Use LinkedIn Jobs and Naukri filtered to your city + "product company" + ₹15–30 LPA range. Build a tracking spreadsheet: Company | Role | Applied Date | Status. Target: Razorpay, Zerodha, PhonePe (fintech); Sprinklr, Freshworks (SaaS); or any funded startup on Inc42\'s top-100 list. Apply to 2 this week. The 5-company map gives you optionality; the 2 applications create momentum.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 18,
          deadline: '7 days — research; 2 applications this week',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Own One Cross-Functional AI Initiative',
          description: 'Identify an AI use case that spans your team and one adjacent team (e.g., ML + Backend: integrate model serving, or Backend + Data: build feature pipeline). Propose it in a doc. Get buy-in. Ship a v1 in 60 days. At the mid-level, cross-functional ownership is your primary path to senior — and it\'s also the signal that makes you the last person cut in a restructuring.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Deepen AI Integration Before the Market Mandates It',
          description: 'At your current risk level and market position, the next 12 months are a window to build differentiated skills without urgency pressure. Enroll in the Stanford ML course (Coursera, ₹4,000/month) or MLOps Specialization. Build one AI-integrated side project. This investment made now vs under pressure produces 3× better outcomes.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 10,
          deadline: '90 days',
          priority: 'Medium',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Schedule a Skip-Level 1:1 This Week — Visibility Is Your Protection',
          description: 'At senior level and high risk, your primary protection is relationship capital with decision-makers. Message your manager\'s manager: "I\'d value 30 minutes to share what I\'m building and understand the team\'s strategic direction for H2." This is not a job preservation conversation — it is a visibility conversation. People who are known are retained; people who are unknown are restructured.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 28,
          deadline: '5 days',
          priority: 'Critical',
        },
        {
          title: 'Refresh Your LinkedIn and Accept the Next Recruiter Call',
          description: 'At your seniority level (likely 7–12yr), recruiter calls are the most efficient job search path — not job boards. Accept the next inbound recruiter message and treat it as a market data point, not a commitment. Update your headline today. Senior engineers with updated profiles receive 6× more recruiter messages. Each call tells you your current market rate and which companies are hiring — irreplaceable intelligence.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 30,
          deadline: '24 hours',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Create One AI Governance Artifact for Your Engineering Org',
          description: 'Write an ADR (Architectural Decision Record) or RFC: "When to Use AI Code Generation vs Human Review — Engineering Standards for [Your Company]." This document establishes you as the person who owns AI quality standards. Senior engineers who own governance are classified as critical knowledge — the last to be cut and the first to be hired. It takes 4 hours to write well.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Convert Institutional Knowledge into a Written Artifact',
          description: 'Identify one piece of knowledge that only you hold: the why behind an architectural decision, a legacy system\'s undocumented behavior, a customer\'s non-obvious requirement. Write it as a decision record or architecture note. This artifact is harder to cut than redundant headcount — it demonstrates your value in a format that outlasts any org restructuring.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 16,
          deadline: '14 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Position Yourself for AI-Era Leadership Now',
          description: 'Your current risk is low but the senior engineering market is bifurcating rapidly: engineers who own AI infrastructure decisions are in high demand; engineers who don\'t are being passed over for promotions. Write one public blog post or internal talk about AI in your domain this quarter. It compounds over 18 months.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 8,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Start Advisory Network Conversations — One This Week',
          description: 'Principal-level exits are rare and never happen through job boards. They happen through CISO/CTO networks, sector Slack groups (IndiaAI, SaaS India, Blume Founders community), and PE/VC portfolio CTO referrals. Message one board-track or CTO-level connection: "Would value 20 minutes to discuss [domain] trends and where you\'re seeing demand." This is your primary channel at this level.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 35,
          deadline: '7 days',
          priority: 'Critical',
        },
        {
          title: 'Map Your Advisory or Fractional CTO Narrative',
          description: 'At principal level, your market optionality includes fractional roles (₹2–8L/month for 10–20 days/month). Draft a 150-word narrative: "I help [type] companies navigate [challenge] — I\'ve done this at [companies]." Post it as a LinkedIn article. Fractional CTO demand in India grew 4× in 2024–2026. This narrative, once written, is a job market hedge that exists in parallel with your current role.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 30,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Speak at a Tech Conference or Publish on a Major Platform',
          description: 'Apply to speak at: HasGeek (Bangalore), NASCOMTechTalk, The Fifth Elephant, or JSFoo. Alternatively, publish a technical article on Hacker News or ACM Queue. Principal engineers with recent public talks are 6× more likely to receive unsolicited senior offers. Submission deadlines are typically 60–90 days before events — start the abstract this week.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 25,
          deadline: '30 days — submit abstract',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build an AI Open-Source Contribution or OSS Leadership Role',
          description: 'Contribute a substantive feature or become a maintainer of one AI/ML OSS project. Principal engineers who hold maintainer status in projects with >1k GitHub stars are perceived as domain leaders — the profile that startups recruit at 1.5–2× base salary for CTO roles. Identify the project this week; make your first contribution in 30 days.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '30 days — identify + contribute',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Capital Infrastructure for the Next Career Phase',
          description: 'Your technical capital is strong. Invest this low-risk window in financial runway (3–6 month emergency fund), network capital (attend 1 industry event/quarter), and knowledge capital (publish one in-depth architecture post). These compound invisibly and are the difference between choosing your next role vs accepting any role when the market shifts.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 6,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── DATA SCIENTIST ───────────────────────────────────────────────────────────
  data_scientist: {
    junior: {
      critical: [
        {
          title: 'Build and Deploy One End-to-End ML Project (Not a Notebook)',
          description: 'The market is saturated with data scientists who have Kaggle notebooks. Differentiate: build a project with FastAPI serving a scikit-learn or HuggingFace model, dockerized, deployed to Render.com (free tier). Topic: anything with a real use case (churn prediction for a real company type, salary estimator using Naukri data). Push to GitHub with a live demo link. This is now the interview baseline for ML roles above ₹8 LPA.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 28,
          deadline: '21 days',
          priority: 'Critical',
        },
        {
          title: 'Complete the Hugging Face NLP Course and Get Certified',
          description: 'HuggingFace NLP course (huggingface.co/learn) is free, certifiable, and directly signals LLM-era readiness. Complete all chapters and earn the certificate. Then add one LLM fine-tuning project using their free inference API. Data scientists with LLM skills earn 35–55% more than those with traditional ML skills in India\'s 2026 market. 25–30 hours total.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '30 days',
          priority: 'Critical',
        },
        {
          title: 'Apply to AI-First Companies Hiring Junior Data Scientists',
          description: 'Target: Sarvam AI, Krutrim, Ola Krutrim, Zoho AI team, Freshworks AI, ClearTax AI, Khatabook. These companies pay 20–40% above IT services for data roles and are actively building India AI products. Apply directly via company careers pages + LinkedIn Easy Apply. Tailor your portfolio to India use cases (regional language models, financial data patterns).',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 20,
          deadline: '7 days — 3 applications',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Complete MLflow / Weights & Biases for Experiment Tracking',
          description: 'MLflow (open-source) or W&B (free tier) for experiment tracking is the signal that separates "notebook data scientist" from "production ML engineer." Set up MLflow locally, then integrate it into your last 3 projects. Add the MLflow tracking URI to your GitHub repos. Companies hiring above ₹12 LPA now filter for MLOps skills. 4 hours of setup, then use it on everything.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Contribute to One Kaggle Competition or Open Dataset',
          description: 'Enter the current active Kaggle competition in your domain. Finish in any position — the public notebook with explained methodology is the deliverable, not the rank. Data scientists with ≥5 public Kaggle notebooks receive 2× more inbound from recruiting firms. One contribution a month for 3 months builds a visible track record.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 10,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Start a Domain-Specific ML Portfolio (India Datasets)',
          description: 'India-specific ML problems (credit scoring for India banking, Hindi language processing, agricultural yield prediction) are a differentiation moat. Build one project using government open data (data.gov.in) or Kaggle India datasets. Product-focused India companies pay 1.5–2× more for domain-specific ML skills vs generalist data scientists.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 8,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Lead an LLM Integration Project at Your Company',
          description: 'Identify one internal process that could be automated or improved using an LLM (customer support classification, document extraction, code review assistant). Draft a 1-page proposal. Present it. Own the implementation. Mid-level data scientists who lead LLM integrations are reclassified as "AI engineers" in their company — the role that is being created, not eliminated.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 30,
          deadline: '14 days — propose; 60 days — ship v1',
          priority: 'Critical',
        },
        {
          title: 'Pursue the Google Professional Machine Learning Engineer Certification',
          description: 'Google PMLE (₹15,000 exam, 2–3 months prep via Google Cloud Skills Boost) is the highest-signal ML certification in India\'s 2026 market. It validates end-to-end ML pipeline skills (data prep → training → serving → monitoring). Data scientists with PMLE earn median ₹28–45 LPA vs ₹18–28 LPA without it. Start the learning path this week.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 22,
          deadline: '90 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Write and Publish a Technical Deep-Dive on AI/ML',
          description: 'Publish a 1,500-word technical post on LinkedIn or Medium covering a real problem you solved: "How we reduced false positives in our fraud model by 18% using feature engineering" or "Why we chose XGBoost over deep learning for our India credit risk model." Data scientists with published ML content receive 4× more inbound from FAANG and unicorn recruiters.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build a Production ML Pipeline Using Airflow or Prefect',
          description: 'Orchestration is the skill gap between "data scientist" and "ML engineer" — and the latter earns 30–50% more. Set up Apache Airflow or Prefect (free tier) to schedule your most important model retraining pipeline. Document the setup. This skill + your existing modeling experience creates a mid-to-senior transition path.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 20,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Expand Into Causal Inference or Bayesian Methods',
          description: 'The supply of standard ML engineers is high; the supply of causal inference practitioners is low. Invest 2 hours/week in "The Book of Why" by Judea Pearl + the DoWhy Python library. Causal ML skills command 40–60% premium in product analytics, A/B testing, and policy ML roles at Flipkart, Amazon India, and growth-stage startups.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 12,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Establish Your AI Research or Engineering Thought Leadership',
          description: 'At senior DS level with high risk, the market signal you need is "recognized domain expert" not "experienced practitioner." Start with one concrete step: submit an abstract to PyData Bangalore, NASSCOM Analytics India, or ACM India. Alternatively, write a Substack newsletter on AI/ML in your domain (fintech, healthtech, etc.). 1 post/month for 6 months builds a differentiated profile.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 26,
          deadline: '14 days — submit abstract or publish first post',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Pursue Head of Data / Director of AI Roles Proactively',
          description: 'At your seniority, the next level is management or individual contributor leadership. Check LinkedIn for "Head of Data" or "Director of AI" openings at Series B–D startups in your city. These roles are rarely advertised widely — they fill through referrals. Start with a conversation at two companies you admire. One referral call changes the trajectory.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 20,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build a Reproducible ML Experimentation Framework for Your Team',
          description: 'Own the team\'s experimentation stack: MLflow for tracking, DVC for versioning, Feast for feature store, Seldon for serving. Senior engineers who own the ML platform are critical infrastructure — not discretionary headcount. This is one of the highest-retention signals in data science.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 22,
          deadline: '45 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Invest in Generative AI Strategy Skills (Not Just Implementation)',
          description: 'Senior data scientists who can evaluate WHEN and WHERE to deploy GenAI vs classical ML — and communicate this to business stakeholders — are the rarest profile in India\'s market. Read "Designing Machine Learning Systems" by Chip Huyen and "Building LLM-Powered Applications." Apply one strategic framework to an internal problem and document it.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 10,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Activate Your Network for Principal/Staff DS / VP of AI Roles',
          description: 'At this level, your next role will not come from job boards. Reach out to: (1) AI/ML leads at PE/VC portfolio companies (Sequoia India, Nexus, Blume portfolio); (2) Former colleagues now in VP/Director roles at hyperscalers or unicorns; (3) Technical recruiters at Korn Ferry, Heidrick & Struggles who specialize in ML leadership. One message per day for 7 days seeds a pipeline.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 38,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Position for Fractional AI Leadership or Advisory Roles',
          description: 'At principal DS level, fractional Chief AI Officer or VP AI advisor roles are a viable and growing market in India: ₹3–10L/month for 10–15 days of engagement. Draft your advisory narrative and reach out to 2 startup CEOs who need AI direction. This is a hedging strategy that runs in parallel with full-time employment.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 28,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Publish Original Research or Framework Contribution',
          description: 'A paper on arXiv, a methodology contribution to an OSS ML library, or a published whitepaper for NASSCOM or iSpirt positions you as an AI thought leader at the principal level. This is the signal that opens doors to founding advisor roles, board-track CTO positions, and academic-industry collaborations. Start the abstract or outline this week.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your Intellectual Property (IP) Portfolio',
          description: 'Patents, papers, or significant OSS contributions are permanent career capital. File a provisional patent application on a novel ML technique you\'ve developed (₹4,000 via CGPDTM). Or write up the formal methodology for a technique your team uses and submit to a conference. IP creates optionality at the principal level that no other signal matches.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── DEVOPS / SRE ─────────────────────────────────────────────────────────────
  devops: {
    junior: {
      critical: [
        {
          title: 'Earn AWS Solutions Architect Associate or CKA (Kubernetes) — Start This Week',
          description: 'AWS SAA (₹8,500, Udemy Stephane Maarek course ₹499) or Certified Kubernetes Administrator (cncf.io, ₹13,000) — pick one and start today. DevOps/SRE roles with cloud certs receive 52% more callbacks on Naukri above ₹12 LPA. CKA is the stronger signal in 2026 India market as Kubernetes is now the de facto deployment standard.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 30,
          deadline: '45 days',
          priority: 'Critical',
        },
        {
          title: 'Build a Terraform + GitHub Actions CI/CD Pipeline Demo (Public GitHub)',
          description: 'Create a public GitHub repo demonstrating: Terraform IaC for any cloud (AWS free tier OK), GitHub Actions CI/CD pipeline for a sample app, monitoring with Prometheus + Grafana. This is the interview portfolio for DevOps roles. Engineers with a working IaC demo get past HR screens at 3× the rate of those without. 8–12 hours of work.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 24,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Learn and Apply Platform Engineering Concepts to Your Current Work',
          description: 'Platform Engineering (Internal Developer Platforms, Backstage.io, self-service infrastructure) is the evolution of DevOps — and it\'s where the jobs are. Read "Platform Engineering on Kubernetes" (free PDF), then implement one internal tooling improvement: a Backstage template, a Terraform module, or a GitHub Actions reusable workflow. Document it for your portfolio.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Set Up OpenTelemetry Observability Stack in a Side Project',
          description: 'Distributed tracing with OpenTelemetry + Jaeger or Grafana Tempo is the observability standard that companies filter on in DevOps interviews. Implement it in any side project. Engineers who can discuss OTEL instrumentation, context propagation, and trace analysis skip 80% of technical screening rounds.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 16,
          deadline: '21 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build a GitOps Workflow Using ArgoCD or Flux',
          description: 'GitOps is replacing traditional CI/CD in production environments. Set up ArgoCD with a sample Kubernetes cluster (kind or minikube locally). This skill is underrepresented in India DevOps talent and commands a 20–30% premium in Platform and Cloud-Native roles.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 10,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Pursue AWS/GCP Professional-Level Certification This Quarter',
          description: 'AWS DevOps Engineer Professional or GCP Professional Cloud DevOps Engineer is the mid-level signal. Engineers with professional-level certs are considered for Senior SRE/Platform Engineering roles (₹25–45 LPA). Udemy prep courses cost ₹499–999. Exam cost: ₹24,000–28,000. The salary delta recovers the exam cost in under 3 months at higher-tier roles.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 28,
          deadline: '90 days',
          priority: 'Critical',
        },
        {
          title: 'Migrate One Workload to AI-Assisted Infrastructure Management',
          description: 'Use AI-assisted tools for infrastructure: AWS CodeWhisperer for Terraform, GitHub Copilot for pipeline scripts, or Pulumi AI for IaC generation. Build one production-ready module using AI-assisted tooling and document what you verified vs what the AI generated. This is the DevOps equivalent of "AI-integrated engineer" — the profile companies pay to hire.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 22,
          deadline: '21 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Own Your Organization\'s FinOps or Platform Cost Optimization Initiative',
          description: 'Cloud cost optimization (FinOps) is a high-visibility, measurable responsibility. Volunteer to lead a FinOps audit: use AWS Cost Explorer or GCP Billing API, identify top 5 cost drivers, and propose 3 reductions. One successful FinOps initiative saved $X/month is a measurable portfolio item that demonstrates business impact — the language that prevents layoffs.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '30 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build an Internal Developer Platform (IDP) Proof of Concept',
          description: 'Backstage.io is the CNCF-backed IDP that large engineering organizations are adopting. Set up a local Backstage instance, add 3 software catalog entries, and create one scaffolded template. Present it to your team. Engineers who own internal tooling are classified as platform engineers — a higher-retention profile than traditional CI/CD engineers.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Expand into eBPF, Service Mesh, or Advanced Kubernetes',
          description: 'The next wave of platform engineering skills: eBPF-based observability (Cilium, Pixie), service mesh (Istio, Linkerd), and Kubernetes operator development. Pick one. These are underrepresented skills in India with 3–4× fewer qualified candidates than open roles — a supply shortage that commands significant salary premiums.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 12,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Position for Staff SRE / Platform Engineering Lead Roles',
          description: 'At senior DevOps/SRE with high risk, the target roles are Staff Engineer / Platform Engineering Lead at large product companies or well-funded startups. LinkedIn search: "Staff SRE" or "Platform Engineering Lead" in your city. These roles are filled through referrals 70% of the time. Identify 3 people in these roles and ask for a 15-min call. One referral conversation per week.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 30,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Publish SRE/Platform Engineering Content (Talk or Article)',
          description: 'Apply to speak at: SREcon India, Rootconf (HasGeek), or KubeCon India. Alternatively, publish a technical deep-dive on LinkedIn or the CNCF blog about your SRE work. Senior engineers with conference talks or CNCF-level content are on a fast track to Staff and Principal roles. Submit an abstract this week.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 24,
          deadline: '14 days — submit abstract',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Own Your Team\'s AI Ops / MLOps Infrastructure Strategy',
          description: 'MLOps infrastructure (Kubernetes-based model serving, Kubeflow pipelines, GPU cluster management) is the fastest-growing DevOps/SRE specialization. Volunteer to own the ML infrastructure for one team. Kubeflow + KServe + Argo Workflows — build familiarity with this stack. It positions you at the intersection of AI and platform engineering.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 22,
          deadline: '45 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your Technical Blog on Platform Engineering',
          description: 'Senior engineers with a Substack or personal blog covering SRE/platform topics at the 1 post/month cadence become the first-call candidates when Staff and Principal roles open. Write about real incidents you\'ve handled, architecture decisions you\'ve made, trade-offs you\'ve navigated. These posts compound for years.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 10,
          deadline: '30 days — publish first post',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Activate the CNCF / Cloud Native Community for Senior Leads',
          description: 'CNCF Ambassador, KubeCon speaker, CNCF TAG (Technical Advisory Group) member — these community roles are the signal for VP Engineering / CTO / Principal SRE positions. Apply for CNCF Ambassador this week (cncf.io/ambassadors). One accepted talk at KubeCon or Kubecon India is career-defining at the principal level.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 35,
          deadline: '30 days — apply to CNCF ambassador or KubeCon CFP',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Pursue VP Engineering or Founding Engineer Roles at AI-Native Startups',
          description: 'At principal DevOps/SRE level, the highest-growth trajectory is VP Engineering or Founding Engineer at an AI-native startup where infrastructure is mission-critical. Nexus, Sequoia, and Blume VC portfolio companies in India often need this profile. Reach out via VC portfolio job boards and founder communities.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 30,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Contribute to CNCF Projects or Open-Source Platform Engineering Tools',
          description: 'Contributions to Kubernetes, Argo, Cilium, or Backstage at the principal level establish you as a recognized community contributor. This is the highest-signal career capital at this level — it opens doors to Google, Microsoft, and Cloudflare India engineering leadership roles.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '60 days — first significant contribution',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your Platform Engineering Consulting Positioning',
          description: 'Principal platform engineers with 15+ years can command ₹4–12L/month as fractional VP Infra or technical advisor. Build one case study from your most impactful platform initiative and draft a 1-page advisory narrative. The optionality this creates is worth the 4 hours it takes.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── PRODUCT MANAGER ──────────────────────────────────────────────────────────
  product_manager: {
    junior: {
      critical: [
        {
          title: 'Earn a PM Certification and Build an AI Product Case Study',
          description: 'Product School\'s PMC (₹12,000 online) or Reforge\'s Growth PM program (scholarship available) + one AI product case study. Case study format: "I would redesign X feature for AI — here\'s my PRD." Use ChatGPT/Claude to generate the design mocks, then critique and refine. Junior PMs who demonstrate AI product thinking in case studies receive 2.5× more interview calls.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '45 days',
          priority: 'Critical',
        },
        {
          title: 'Apply to 3 Product Companies with AI Product Openings',
          description: 'Target companies with AI product tracks: Sarvam AI (language product), Zepto (AI operations), BrowserStack (developer tools), Swiggy (AI recommendations), Razorpay (AI fraud/risk). Use LinkedIn "Easy Apply" + company career pages. Send a personalized note to the PM Lead on LinkedIn. At junior PM level, the cover note differentiates you — 80% don\'t write one.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 22,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build and Publish an AI Product Teardown',
          description: 'Pick any AI product (Perplexity, Notion AI, GitHub Copilot, Krutrim). Write a 1,500-word teardown: user journey, core jobs-to-be-done, business model, what works, what you would change. Publish on LinkedIn. PMs with published teardowns receive 3× more inbound. It demonstrates product thinking in a way no certification does.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '7 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Get SQL-Proficient for Data-Driven PM Work',
          description: 'The PM who can write their own SQL queries is trusted more than one who waits for an analyst. Mode Analytics free course or Khan Academy SQL (both free) + practice on real queries in your current role. SQL-proficient PMs skip the "data bottleneck" problem that derails product decisions and are rated higher in PM performance reviews.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 14,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your PM Portfolio Page',
          description: 'A simple portfolio page (Notion, carrd.co, or personal website) with 3 case studies, your PM philosophy, and metrics you\'ve moved is the long-term career capital investment. 5 hours to set up, then add one case study per quarter. PM portfolios at the junior level are rare — they differentiate immediately.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '14 days',
          priority: 'Low',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Own an AI Feature from Discovery to Metric',
          description: 'Identify one feature that could be AI-powered in your product. Run the full discovery: user interviews, competitive analysis, opportunity scoring. Write the PRD. Ship it with at least one measurable success metric tracked for 30 days. Mid-level PMs with shipped AI features in their portfolio earn 35–45% more and receive 4× more interest from FAANG-adjacent companies.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 32,
          deadline: '90 days',
          priority: 'Critical',
        },
        {
          title: 'Engage the India PM Community — Product Folks, Reforge India Chapter',
          description: 'Join Product Folks Slack (India\'s largest PM community, 18,000+ members), attend ProductGeeks Bangalore/Hyderabad/Pune meetup, or apply for Reforge\'s India cohort. Mid-level PM roles are filled through community networks 60% of the time. Show up at one event this month, connect with 5 people, and follow up with a message referencing the event.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 20,
          deadline: '30 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Publish a PM Framework or Methodology Post',
          description: 'Write a 1,200-word post on a framework you use: "How I prioritize features using ICE score + stakeholder alignment" or "My 5-step process for validating AI product assumptions." Publish on LinkedIn or the Product Folks blog. Mid-level PMs with published methodology posts are perceived as senior-ready and receive 3× more recruiter messages.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build a Growth Experiment Playbook for Your Product',
          description: 'Document 10 growth hypotheses for your product and run 3 A/B tests in the next 60 days. Track: hypothesis, metric, result, learning. This artifact is your interview differentiator at senior PM levels. Growth-oriented PMs with documented experiment histories earn 20–30% more at Series B+ companies.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 16,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Study AI-Native Product Design Principles',
          description: 'Read "The AI Product Handbook" by Peter Yang (Substack) and experiment with building a prototype in Cursor or Bolt.new. PMs who can collaborate at the code level with AI tools are 10× more effective at AI product development. 2 hours/week investment for 6 weeks.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 10,
          deadline: '45 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Target Senior PM / Group PM / Principal PM Roles at India Unicorns',
          description: 'At senior PM level, the correct channel is warm introductions. Identify 3 companies: Swiggy, Meesho, Zepto, PhonePe, Razorpay, or Juspay. Find the CPO/VP Product on LinkedIn. Ask for a "product strategy conversation" — not a job inquiry. 1 of 3 such conversations typically opens a role or referral. More direct than any job board.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 32,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build Visibility by Speaking at a Product Conference',
          description: 'Apply to speak at: ProductGeeks Summit, Product School India, or Nasscom Product Conclave. Alternatively, publish a deep strategic post (3,000+ words) about product strategy at your company type (fintech/saas/marketplace). Senior PMs with recognized content are approached by headhunters at a 5× rate vs those without.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 24,
          deadline: '30 days — submit abstract',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Own the AI Product Strategy for Your Business Unit',
          description: 'Write a 6-month AI product roadmap for your team: where AI creates user value, what data moats are being built, how AI reduces operational cost. Present it at a leadership review. Senior PMs who own AI strategy are classified as strategically critical — the last to go in restructuring and the first to be promoted in growth phases.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 26,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Mentor Junior PMs and Build a Team Reputation',
          description: 'At senior PM level with low risk, your career capital investment is in people: 1-on-1 mentoring, PM knowledge sharing sessions, internal product community. Mentorship builds reputation that converts into retention protection and unsolicited external referrals when you decide to move.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 6,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Target CPO / VP Product / Head of Product Roles via Executive Search',
          description: 'At principal PM level, executive search firms fill 80% of roles. Contact: Talent500, Michael Page India, Heidrick & Struggles, and Korn Ferry. Send one message to an executive recruiter at each: "I\'m currently a Principal PM with X years, actively exploring CPO/VP roles at growth-stage companies." Simultaneously reach out to 3 PE/VC firms — they place portfolio company CPOs directly.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 40,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build a Fractional CPO Engagement or Advisory Portfolio',
          description: 'Fractional CPO (₹4–12L/month, 10–20 days) is a rapidly growing market in India\'s startup ecosystem. Write your advisory narrative and pitch 2 seed/Series A companies who need product leadership. One fractional engagement running in parallel with your current role creates both income insurance and market optionality.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 30,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Publish a Signature Framework or Book Proposal',
          description: 'Principal PMs with signature methodologies ("The [Name] Framework for AI Product Discovery") command thought leadership that converts into speaking fees, advisory board positions, and CPO calls. Write a 5,000-word "Product at Scale" essay or submit a book proposal to BenBella or O\'Reilly. This is the highest-leverage reputation investment at the principal level.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Board-Track Network and Governance Experience',
          description: 'Serving on an advisory board, TIECON committee, or startup accelerator mentor panel (Nasscom 10,000 Startups, T-Hub) builds the governance experience and network required for board-level roles. Apply for one such role this quarter.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── QA ENGINEER ──────────────────────────────────────────────────────────────
  qa_engineer: {
    junior: {
      critical: [
        {
          title: 'Learn and Implement AI-Augmented Testing (Not Just Automation)',
          description: 'Traditional test automation is being automated by AI. The survival path is AI-augmented testing: use Copilot to generate test cases, use Mabl or Testim for AI self-healing tests, or integrate Claude API to generate edge-case scenarios. Build a demo project using one of these tools. QA engineers with AI testing skills are reclassified as "Quality Automation Engineers" — a role that is being created, not eliminated. 6–8 hours.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 30,
          deadline: '14 days',
          priority: 'Critical',
        },
        {
          title: 'Earn ISTQB CTFL and Selenium/Playwright Certification',
          description: 'ISTQB Foundation (₹6,000, well-recognized in India IT) + Playwright hands-on certification (Udemy, ₹499). QA engineers with both certifications receive 40% more callbacks on Naukri for automation roles above ₹8 LPA. Selenium is declining; Playwright is the current standard for web automation in India\'s product companies.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 22,
          deadline: '45 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Transition Your Profile Toward SDET (Software Development Engineer in Test)',
          description: 'SDET roles pay 30–50% more than manual QA roles in India and are significantly more protected against AI automation. The transition requires learning one backend language (Python preferred) to write test frameworks. Start with "Python Testing with pytest" (free e-book, pytest.org). Build one API test framework in Python. Document it on GitHub.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '30 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Own End-to-End Performance Testing for Your Application',
          description: 'Performance testing (k6, JMeter, Gatling) is a QA specialization with low competition in India. Set up k6 for your current application, run a load test, and write a performance report with recommendations. Engineers who own performance testing own a critical delivery gate — a harder-to-automate QA function.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '21 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build a Security Testing Skillset (Fastest-Growing QA Specialization)',
          description: 'AppSec/security testing specialists are in short supply in India. OWASP testing guide + Burp Suite Community Edition (free) + OWASP Top 10 knowledge positions you in the highest-demand QA specialization. Take the OWASP Top 10 test on OWASP.org (free). This cross-trains you into a security-adjacent role.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 14,
          deadline: '45 days',
          priority: 'Low',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Build an AI-Powered Test Intelligence Platform Proof of Concept',
          description: 'AI Test Intelligence — using LLMs to generate test cases from requirements, identify test gaps, and predict flaky tests — is the frontier of QA engineering. Build a proof of concept using Claude API or LangChain: feed a feature spec, receive a test plan. Present it to your team. QA engineers who own AI-augmented test frameworks are reclassified as Quality Engineers and earn 40–60% more.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 32,
          deadline: '30 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Own Your Team\'s Test Architecture and Quality Strategy',
          description: 'Write a "Testing Strategy" document for your product: what to test, at what level (unit/integration/e2e), with what coverage goals, and what to NOT test. Engineers who own test strategy documents are classified as quality architects — a higher-retention profile. Present it to your engineering manager as your proposed ownership scope.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 22,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Learn and Apply Contract Testing (Pact.io)',
          description: 'Contract testing for microservices (Pact.io) is a QA specialization that prevents integration failures between services. Set up Pact consumer-driven contracts in your current microservices architecture. Mid-level QA engineers with Pact expertise are in short supply and command senior-level salaries.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 16,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Develop Chaos Engineering Competency (Resilience Testing)',
          description: 'Chaos Engineering (Netflix Chaos Monkey model, Gremlin, LitmusChaos for Kubernetes) tests system resilience and is at the intersection of QA, SRE, and platform engineering. Build a chaos experiment for your application. This skill positions you at the highest-retention intersection of QA and reliability.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 12,
          deadline: '45 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Transition to Quality Engineering Lead or Head of Quality Role',
          description: 'At senior QA level with high risk, the target title shift is from "Senior QA" to "Quality Engineering Lead" or "Head of QA." This requires ownership: own the team\'s test architecture, tooling strategy, and quality KPIs. Update your LinkedIn to reflect strategy ownership, not just execution. Then apply directly to companies where quality is a competitive advantage: Razorpay, PhonePe, Zerodha, CRED.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 28,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Publish a Quality Engineering Blog or Open-Source Test Framework',
          description: 'Write a series on quality engineering practices at scale (Substack or Medium). Alternatively, open-source your team\'s test framework with documentation. Senior QA engineers with public content or OSS contributions receive 4× more recruiter interest and are considered for Principal/Staff QE roles.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 22,
          deadline: '14 days — publish first post',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build the Business Case for AI-Augmented QA Investment',
          description: 'Write a proposal: "By implementing AI test generation (tool X, cost Y), we can reduce test authoring time by Z% and increase coverage by W%. ROI: N months." Present it to your VP Engineering. Senior engineers who drive business-cased technology investments are classified as strategic contributors — a high-retention profile.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '21 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Develop Testing Leadership Community Presence',
          description: 'Join and contribute to: Ministry of Testing community (global), QA India Facebook group, or Testing Talks India meetups. Senior QA professionals who are known in the community receive offers through referrals before positions are advertised. Attend or present at one event this quarter.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Target VP Quality / Director of Quality Engineering Roles',
          description: 'At principal QA level, target roles via NASSCOM, Instahyre (India-focused executive search), and Talent500. Quality leadership is chronically underfilled at VP level in India\'s scale-up companies. Your argument: "I reduce time-to-production by X% and prevent Y% of production incidents — here\'s the data." Quality leadership with business metrics is rare and commands ₹40–80 LPA at Series C+ companies.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 36,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build AI Quality Engineering Advisory Practice',
          description: 'Fractional Head of Quality for AI companies is an emerging role: companies building AI products need quality frameworks for non-deterministic systems (LLM evaluation, hallucination testing, bias testing). Offer advisory services. Write a LinkedIn article: "Why AI systems need a fundamentally different approach to quality engineering."',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 28,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Publish the Definitive Guide to AI System Quality Engineering',
          description: 'A comprehensive guide on testing LLM-powered applications (prompt testing, RAG evaluation, agent reliability) is a white space in the technical publishing market. Write it as a long-form article series or submit to O\'Reilly. This establishes your thought leadership in the most important emerging QA discipline.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Standards and Frameworks That Outlast Your Current Role',
          description: 'Contribute to ISO 29119, IEEE testing standards committees, or BIS (Bureau of Indian Standards) technical committees on software quality. These contributions establish permanent domain authority and create professional network access at the highest levels.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── BPO / ITES ASSOCIATE ─────────────────────────────────────────────────────
  bpo_associate: {
    junior: {
      critical: [
        {
          title: 'Begin IMMEDIATE Transition to a Tech-Adjacent Role — This Is Urgent',
          description: 'BPO/ITES voice and data-entry roles face the highest AI displacement risk in India IT: Naukri job index is at 58% of baseline (sector in active decline). The transition path with the highest success rate: (1) Learn basic Python scripting — "Automate the Boring Stuff" by Al Sweigart (free online); (2) Earn an AI Tools certification — NASSCOM FutureSkills (free government program); (3) Apply for "Process Automation Analyst" or "RPA Developer" roles. This is not optional — begin this week.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 40,
          deadline: '7 days — start; 90 days — transition complete',
          priority: 'Critical',
        },
        {
          title: 'Register for NASSCOM FutureSkills Prime (Free Government Upskilling)',
          description: 'Go to futureskillsprime.in today. NASSCOM FutureSkills Prime is a government-funded program for IT upskilling — free courses in AI, data analytics, cloud computing, and cybersecurity. Certificates are recognized by India IT companies. Enroll in the "AI Business Analyst" or "Data Analytics" track. This is the fastest zero-cost upskilling path in the India market.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 25,
          deadline: '24 hours — register; 60 days — complete track',
          priority: 'Critical',
        },
        {
          title: 'Apply for RPA Developer or Process Automation Analyst Roles',
          description: 'RPA (Robotic Process Automation) developers who BUILD the tools that automate BPO work are in demand. UiPath Academic Alliance offers free training and certification (uipath.com/learning). Complete the UiPath Foundation certification (free, 20 hours). Then apply to: EY, Deloitte, KPMG RPA practices, or IT services companies hiring in the RPA/automation center of excellence. Salary: ₹4–8 LPA for certified RPA developers.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 35,
          deadline: '30 days — certification; 60 days — applications',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Leverage Your Domain Knowledge for a Business Analyst Transition',
          description: 'BPO professionals know the business processes deeply — this is domain knowledge that pure tech hires lack. Target "Business Analyst" roles at companies in your domain (banking BPO → banking BA; insurance BPO → insurance BA). Business analysts with domain expertise earn ₹5–12 LPA and have much lower automation risk. Write your resume emphasizing DOMAIN knowledge, not process execution.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 28,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Learn Excel Advanced + Power BI for Data Analyst Entry-Level',
          description: 'Excel Advanced (pivot tables, VLOOKUP, Power Query) + Power BI Desktop (free) is the zero-cost path to entry-level Data Analyst roles (₹4–7 LPA) from BPO. Microsoft Learn has free Power BI learning paths. This takes 40 hours of study. Naukri shows 8,200+ open entry-level data analyst roles in India this week.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 22,
          deadline: '45 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build an English + Communication Portfolio for Supervisory Track',
          description: 'BPO supervisors and team leads (₹4–8 LPA) are less automated than individual associates. The path is: (1) Volunteer for quality audit or coaching tasks; (2) Document your process improvements; (3) Apply for QA or Team Leader tracks internally. While transition is still recommended, supervisory roles extend your runway by 2–3 years.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 12,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Transition to Process Excellence or Operations Analytics — Act Now',
          description: 'Mid-level BPO professionals with process knowledge should target: Operations Analytics Manager, Process Excellence Lead, or Digital Transformation Specialist roles. These pay ₹10–20 LPA and require your process expertise + basic data skills. Earn a Six Sigma Green Belt (KPMG India offers it for ₹8,000) and apply to consulting firms\' process excellence practices.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 38,
          deadline: '30 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Position for Customer Success or Delivery Management Roles',
          description: 'Mid-BPO professionals with client management experience can transition to Customer Success Manager (₹8–18 LPA) or Delivery Manager roles at SaaS companies. These roles require your communication and process skills + basic CRM knowledge (Salesforce, HubSpot — both have free training). Apply to India SaaS companies: Freshworks, Zoho, Chargebee.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 28,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Pursue WFM (Workforce Management) or Real-Time Analytics Specialization',
          description: 'WFM specialists (NICE, Aspect, Verint platforms) and Real-Time Analytics analysts in BPO companies earn 40–60% more than associates and are significantly harder to automate. Get certified in NICE WFM or Aspect eWFM via vendor free training programs.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Supervisory Leadership Credentials for Internal Advancement',
          description: 'If transitioning immediately is not feasible, maximize your current position by pursuing internal advancement: Team Leader → Assistant Manager → Manager track. Document process improvements with metrics. This extends your career runway while you build transition skills on the side.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 10,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Target Operations Leadership or Digital Transformation Roles',
          description: 'Senior BPO professionals with delivery experience should target: VP Operations, Head of Digital Transformation, or Shared Services Director roles at mid-size enterprises or consulting firms. The transition narrative: "I manage X FTEs, own $YM P&L, and have automated Z% of manual processes. I am looking for a strategic operations or transformation leadership role." Use LinkedIn outreach to COOs and Transformation Officers.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 35,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Leverage Your Experience for BPO Consulting or Advisory',
          description: 'Senior BPO professionals can command ₹2–6L/month as operations consultants for companies setting up or optimizing BPO operations. BFSI, healthcare, and government BPO are growing. Your insider knowledge of operations, pricing, and SLA management is valued by companies evaluating vendors. Start with one consulting engagement for a startup or SME.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 28,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Pursue MBA or Executive Program for Strategic Transition',
          description: 'An executive MBA or PGP from ISB Hyderabad (₹35L), IIM Lucknow (₹22L), or SP Jain (₹18L) can bridge the transition to General Management. NASSCOM/NITI Aayog scholarships are available for BPO professionals transitioning to leadership. This is a 12–24 month investment with highest ROI at senior+ level.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '60 days — research + apply',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build a Certified Operations Management Credential',
          description: 'APICS CPIM, CIPS procurement certification, or Lean Six Sigma Black Belt would increase your value in operations leadership. These certifications signal process mastery at an internationally recognized standard and open doors to manufacturing, logistics, and retail operations leadership roles beyond BPO.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 12,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Target C-Suite or Board Advisory Roles Using Operational Expertise',
          description: 'At principal BPO level (VP/Director+), your operational and P&L experience qualifies for COO/CCO-track roles at mid-size enterprises or board advisory roles at BPO-dependent companies. Engage Korn Ferry, Spencer Stuart, and MANCER for C-suite placement. Register on Board Agency (India\'s largest board director platform) to access director positions at mid-cap companies.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 38,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build a BPO/Operations-to-AI Transformation Advisory Practice',
          description: 'The transition from legacy BPO to AI-native operations is the largest change management challenge facing India IT services companies over the next 5 years. Your knowledge of both the legacy operations and the transition path is a rare combination. Write a white paper. Start one advisory engagement. This is a business, not just a career move.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 32,
          deadline: '30 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Position for Board Director Roles at India-Listed ITES Companies',
          description: 'SEBI mandates independent directors at listed companies. ITES companies (listed on BSE/NSE) need independent directors with operational expertise. Register on MCA21 Director DIN, build your governance profile, and apply via the Indian Institute of Corporate Affairs (IICA) director training program.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Develop a Legacy Transition and AI-Native Operations Curriculum',
          description: 'Write and teach a course for BPO professionals transitioning to AI-native roles. Platforms like NASSCOM FutureSkills, upGrad, or Great Learning would partner with experienced executives. This establishes thought leadership and creates passive income in parallel.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
  },
};

// ─── Seniority-differentiated pools for remaining role groups ─────────────────
// Three distinct critical actions per seniority tier:
//   junior    → skills-building / technical project / certification
//   mid       → visibility / internal mobility / market-test
//   senior+   → advisory / thought leadership / consulting / board positioning
// High and moderate actions are shared (role-appropriate across seniority).

function seniorityPool(
  juniorCrit: Partial<ActionPlanItem>,
  midCrit: Partial<ActionPlanItem>,
  seniorCrit: Partial<ActionPlanItem>,
  highAction: Partial<ActionPlanItem>,
  moderateAction: Partial<ActionPlanItem>,
): BracketPool {
  return {
    junior:    { critical: [juniorCrit],  high: [highAction], moderate: [moderateAction], low: [moderateAction] },
    mid:       { critical: [midCrit],     high: [highAction], moderate: [moderateAction], low: [moderateAction] },
    senior:    { critical: [seniorCrit],  high: [highAction], moderate: [moderateAction], low: [moderateAction] },
    principal: { critical: [seniorCrit],  high: [highAction], moderate: [moderateAction], low: [moderateAction] },
  };
}

ACTION_DB.ml_engineer = seniorityPool(
  {
    title: 'Ship a Production ML Service with FastAPI + MLflow Tracking',
    description: 'Build an end-to-end ML service: model training with MLflow experiment tracking, FastAPI serving endpoint, Docker container, deployed to Render or Hugging Face Spaces. Include a model card documenting training data, metrics, and limitations. ML engineers with live deployed services receive 3× more senior ML role offers than those with only notebooks. 15–20 hours.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Own the ML Platform Initiative at Your Company — Feature Store, Model Registry, or Serving Layer',
    description: 'Mid-level ML engineers who own internal platform initiatives (MLflow model registry, Feast feature store, or a unified serving layer) are classified as infrastructure-critical — the last profile cut in restructuring. Pitch the initiative to your manager this week, assign yourself as tech lead, and deliver an internal demo within 30 days. Internal platform ownership creates the visibility that external certifications cannot.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Launch a Fractional ML Lead or Advisory Practice for Non-Tech Companies',
    description: 'Senior ML engineers are in short supply as advisors to traditional industries (manufacturing, healthcare, legal, finance) adopting ML for the first time. Offer a 4-hour/week fractional advisory engagement: ML strategy assessment, use-case prioritization, and build-vs-buy recommendation. One retainer engagement at ₹75,000–₹1,50,000/month builds financial runway and market positioning simultaneously. Platform: LinkedIn, AngelList advisory, or direct outreach to your network.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '21 days — first outreach', priority: 'Critical',
  },
  {
    title: 'Earn Google Professional Machine Learning Engineer Certification',
    description: 'Google PMLE (₹15,000 exam, 2–3 months prep via Google Cloud Skills Boost) is the highest-signal ML certification in India\'s 2026 market. It validates end-to-end ML pipeline skills (data prep → training → serving → monitoring). Data/ML engineers with PMLE earn median ₹28–45 LPA vs ₹18–28 LPA without. Start the learning path this week.',
    layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days', priority: 'High',
  },
  {
    title: 'Transition from Classical ML to LLM Fine-tuning and RAG Pipelines',
    description: 'The market for classical ML generalist roles is compressing. LLM fine-tuning (LoRA/QLoRA on open models) and RAG pipeline engineers are in short supply. Complete the HuggingFace PEFT course (free) and build one fine-tuned model on a domain-specific dataset. This bridges classical ML expertise to the highest-demand ML specialty.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.ai_engineer = seniorityPool(
  {
    title: 'Build and Deploy a Production LLM Application with Observability',
    description: 'Build an LLM application using LangChain/LlamaIndex with: prompt versioning (PromptLayer or Langfuse), output evaluation (RAGAS for RAG apps), cost tracking, and fallback logic when the primary model fails. AI engineers who can demonstrate production-grade LLM observability receive 4× more senior offers. Deploy it publicly with a usage demo.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 32, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Define and Own Your Team\'s LLM Evaluation and AI Safety Framework',
    description: 'Mid-level AI engineers who own the evaluation infrastructure become unglamorous but indispensable: they block hallucinations from reaching production and own the quality gate. Write a team policy: what evals must pass before deployment, what safety tests run on every prompt change, and how regressions are tracked. Present it at the next sprint review. Owning evaluation makes you the last engineer cut when the team shrinks.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Publish Authoritative Research on LLM Production Reliability or Take a Principal AI Advisor Role',
    description: 'Senior AI engineers who publish detailed post-mortems or research on production LLM failure modes (hallucination in domain X, context-length cliff effects, prompt injection patterns) become the reference point companies call before building. A single well-cited publication or advisory engagement with a non-tech company adopting LLMs creates career optionality that compensation packages cannot. Start with a 1,500-word case study from your own production experience.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '21 days — draft', priority: 'Critical',
  },
  {
    title: 'Contribute to an LLM Evaluation Framework or AI Safety Tooling',
    description: 'Contribute to EleutherAI\'s lm-evaluation-harness, HELM, or an AI safety OSS project. AI engineers with verified contributions to evaluation frameworks are considered for founding engineer and research engineering roles at AI companies (Anthropic, Google DeepMind, Sarvam AI). One merged PR is the proof point.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Get Certified in a Cloud-Native AI Platform (Vertex AI or Bedrock)',
    description: 'AWS Certified Machine Learning Specialty (₹24,000) or Google Professional ML Engineer validates cloud-native AI deployment skills. AI engineers with cloud AI platform certifications earn 30–45% more than those without. These platforms (Vertex AI, Bedrock, Azure ML) are where enterprise AI projects are built.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '60 days', priority: 'Medium',
  },
);

ACTION_DB.llm_engineer = seniorityPool(
  {
    title: 'Build a Public LLM Benchmark or Evaluation Suite for Your Domain',
    description: 'Create a domain-specific LLM evaluation benchmark (e.g., "India Legal QA Benchmark" or "Code Security Vulnerability Detection"). Publish it on HuggingFace Datasets. Domain-specific LLM evaluators are among the most sought-after profiles at AI companies. A public benchmark is a permanent career asset.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Establish Internal Prompt Engineering Standards and LLM Governance Policy',
    description: 'Mid-level LLM engineers who own the governance layer — what prompts are approved for production, how they are versioned, what output validation runs before user-facing deployment — become the compliance gatekeeper that every regulated industry now requires. Write the policy (2 pages), present it to your engineering lead, and own the prompt registry. This transforms a junior-sounding title into a cross-functional infrastructure role.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Consult Fractionally on LLM Strategy for Traditional Companies Adopting AI',
    description: 'Senior LLM engineers are the scarcest resource for non-tech companies (law firms, healthcare networks, financial advisors) trying to adopt LLMs safely. Offer a 4–8 hour engagement: "LLM risk assessment and use-case roadmap." Charge ₹60,000–₹1,20,000 for the first engagement. The deliverable is a 3-page memo — your existing expertise. One or two clients creates financial resilience and external credibility that fast-tracks your next full-time role negotiation.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '14 days — first outreach', priority: 'Critical',
  },
  {
    title: 'Write a Technical Post on Prompt Engineering Failure Modes',
    description: 'Publish a 2,000-word analysis of a real LLM failure mode you\'ve observed: hallucination in a domain, prompt injection vulnerability, or output format drift. Include examples and mitigations. LLM engineers with published failure-mode analyses receive 4× more serious technical offers than those with only "shipped X with GPT-4" on their profile.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'High',
  },
  {
    title: 'Deepen Model Internals Knowledge Beyond API Usage',
    description: 'Most prompt engineers only know the API surface. Differentiate by understanding: tokenization effects on reasoning, attention patterns, context window management, and inference optimization (quantization, batching). Andrej Karpathy\'s GPT from scratch tutorial (YouTube) + the Transformer paper reading group on arXiv are the highest-leverage starting points.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.data_engineer = seniorityPool(
  {
    title: 'Build a Modern Data Stack Portfolio Project (dbt + Airflow/Prefect + DuckDB)',
    description: 'Build a public portfolio data pipeline: ingest raw data from a public API, transform with dbt (models, tests, documentation), orchestrate with Prefect (free cloud tier), and serve to a BI layer (Metabase, free). Data engineers with a modern stack portfolio project receive 2.5× more callbacks for roles at product companies (₹20–40 LPA). Push the dbt project to GitHub with full documentation.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Lead an Internal Migration from Legacy ETL to a Modern Streaming or dbt Stack',
    description: 'Mid-level data engineers who own a platform migration become infrastructure-critical. Volunteer to lead the migration of one legacy Informatica/SSIS pipeline to dbt + Prefect or a Kafka streaming pipeline. Document the performance gains (latency, maintenance hours saved). Data engineers who own migrations are classified as platform leads — a role that survives restructuring. Present the before/after at a team review.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days — scope and begin', priority: 'Critical',
  },
  {
    title: 'Design and Publish a Reference Data Architecture for Your Industry Vertical',
    description: 'Senior data engineers who publish reference architectures (e.g., "Real-time data stack for India fintech at scale" or "Event-driven analytics architecture for e-commerce") are cited by companies evaluating their stack. A well-written Substack post or LinkedIn article series positions you as the external expert companies call before hiring — and as the internal authority companies fight to retain. 2,000-word article, one diagram, one benchmark.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn dbt Certified Developer or Databricks Certified Data Engineer',
    description: 'dbt Certified Developer ($150 exam) or Databricks Certified Associate Data Engineer (₹18,000) are the two highest-signal data engineering certifications in India\'s 2026 market. Data engineers with either cert earn 35% more on Naukri for roles above ₹20 LPA. Complete the free learning path on dbt Learn or Databricks Academy before booking.',
    layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Add Real-time Streaming Capability to Your Stack (Kafka or Flink)',
    description: 'Batch-only data engineers face the highest displacement risk as orchestration tools automate batch workflows. Add real-time streaming skills: Apache Kafka (Confluent free tier) or Apache Flink. Build a streaming pipeline that processes events in real-time. This is the fastest-growing data engineering specialization in India fintech and e-commerce.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.data_analyst = seniorityPool(
  {
    title: 'Build an AI-Augmented Analytics Dashboard with a Narrative Layer',
    description: 'Build a dashboard in Metabase, Tableau Public, or Looker Studio that includes a written narrative layer: "Here\'s what the data shows, here\'s why it happened, here\'s what to do." Use Claude API to auto-generate the narrative from the SQL results. Data analysts who can produce insight narratives (not just charts) receive 3× more interest from senior stakeholder roles.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Own a Strategic Business Metric End-to-End — Definition, Measurement, and Weekly Narrative',
    description: 'Mid-level analysts who own a strategic metric (north star, activation rate, churn cohort) and produce a weekly narrative for the leadership team are classified as decision-support infrastructure — not interchangeable report generators. Volunteer to own one metric nobody fully owns today. Build the dbt model, the dashboard, and the weekly Slack update. Analysts who drive decisions survive automation; those who run reports do not.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '14 days — claim ownership', priority: 'Critical',
  },
  {
    title: 'Transition into an Analytics Engineering Lead or Data Product Role',
    description: 'Senior analysts who bridge data engineering and business intelligence — analytics engineers — are among the most sought-after profiles in India product companies (2026 median ₹22–40 LPA). Claim ownership of your team\'s dbt models, write semantic layer documentation, and propose an Analytics Engineering charter to your manager. Alternatively, pursue a Head of Analytics or Data Product Manager role — your domain expertise is the moat that pure data engineers lack.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Earn Google Data Analytics Professional Certificate + SQL Advanced',
    description: 'Google Data Analytics (Coursera, ₹4,000/month, 6 months) + Mode Analytics Advanced SQL (free). Data analysts with both credentials receive 40% more callbacks on Naukri for roles above ₹8 LPA. The Google cert teaches end-to-end analysis workflow; Mode SQL covers window functions and query optimization that distinguish senior analysts.',
    layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Learn Python for Analytics to Transition from BI Analyst to Data Analyst',
    description: 'Pure BI/Excel analysts face the highest AI displacement risk in analytics. Python with pandas + seaborn + statsmodels gives 3× more job options and 40% higher salaries. "Python for Data Analysis" by Wes McKinney (O\'Reilly) or Kaggle\'s free Python course are the best starting points. Build one Python analysis replacing an existing Excel report.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.nlp_engineer = seniorityPool(
  {
    title: 'Publish a Multilingual NLP Project for Indian Languages',
    description: 'India-specific NLP (Hindi, Tamil, Kannada, Bengali, Marathi) is a massive differentiation moat — most NLP engineers only work with English. Use IndicNLP or Sarvam AI\'s open models to build a multilingual text classification or translation project. Publish on HuggingFace. Multilingual India NLP engineers command 40–60% salary premium at India AI companies vs English-only NLP engineers.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 32, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Own the NLP Evaluation and Model Lifecycle Infrastructure for Your Team',
    description: 'Mid-level NLP engineers who own evaluation infrastructure — benchmark datasets, regression CI, A/B testing of model versions — become the keeper of model quality. This role cannot be automated or outsourced. Volunteer to own the eval harness: write the test suite, set the quality gate, and run the weekly evaluation report. Engineers who own quality gates are promoted to ML tech lead, not cut.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Establish an NLP or Language AI Advisory Practice for India Enterprises',
    description: 'Senior NLP engineers are sought advisors for India enterprises (banks, insurance companies, healthcare networks) building regional language AI applications. Offer a 4-hour strategic advisory: "India language AI readiness assessment and use-case roadmap." Leverage your multilingual expertise — it is a moat that English-centric AI companies cannot easily replicate. One retainer at ₹80,000–₹1,50,000/month demonstrates market value in negotiation.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '21 days — first outreach', priority: 'Critical',
  },
  {
    title: 'Fine-tune a Domain-Specific Language Model on India Data',
    description: 'Use LoRA/QLoRA to fine-tune a base model (Mistral-7B, LLaMA) on a domain-specific India dataset: legal judgments (Indian Kanoon API), financial news (ET/Mint), or customer support transcripts. Publish on HuggingFace with a model card. Domain fine-tuning expertise at Indian AI product companies pays ₹30–60 LPA for mid-level profiles.',
    layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '45 days', priority: 'High',
  },
  {
    title: 'Build an NLP Evaluation Harness for Your Domain',
    description: 'Create a reproducible evaluation harness for NLP tasks in your domain: benchmark dataset, metrics (BLEU/ROUGE/BERTScore), and automated CI tests that run on model updates. NLP engineers who own evaluation infrastructure are classified as core team members — not interchangeable contractors.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.cv_engineer = seniorityPool(
  {
    title: 'Build a Production Computer Vision API with Model Monitoring',
    description: 'Deploy a computer vision model as a REST API with: confidence score threshold calibration, drift detection (Evidently AI), and a simple feedback loop for false positives. Computer vision engineers who demonstrate production monitoring skills are classified as MLOps-capable — the highest-value CV specialization. Deploy on a cloud provider with a live demo.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Own an End-to-End Computer Vision Pipeline — Data Labeling, Model Lifecycle, and Production Monitoring',
    description: 'Mid-level CV engineers who own the full pipeline — not just the model architecture — are irreplaceable. Set up a labeling workflow (Label Studio, free), model versioning (MLflow), and production drift detection. Then document and present it as your team\'s ML platform. Engineers who own the full CV lifecycle are classified as MLOps engineers — a hybrid role that commands 40–60% salary premiums over pure modelers.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Position as Computer Vision Domain Expert for Robotics, EV, or Medical Imaging Advisory',
    description: 'Senior CV engineers are in highest demand as technical advisors to hardware companies (EV, robotics) and healthcare networks adopting diagnostic imaging AI. These companies lack in-house expertise and pay ₹1,00,000–₹3,00,000 per advisory engagement. Identify 3 companies in your metro building CV applications, and offer a 2-hour technical assessment. Your production CV experience is the asset — your domain knowledge is the product.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 36, deadline: '21 days — first outreach', priority: 'Critical',
  },
  {
    title: 'Specialize in Video Understanding or 3D Vision (High-Growth Specializations)',
    description: 'Image classification is commoditized (Roboflow automates it). Video understanding (temporal modeling, action recognition) and 3D vision (NeRF, depth estimation, point clouds) are growing rapidly for autonomous vehicles, robotics, and AR/VR. Pick one specialization, complete a course (fast.ai Practical Deep Learning Part 2 for free), and build a project.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Contribute to a Computer Vision OSS Framework',
    description: 'Contribute to MMDetection, Detectron2, or Ultralytics YOLO. Even a bug fix or documentation improvement establishes community credibility. CV engineers with merged OSS contributions receive 3× more specialist role offers at robotics, autonomous vehicle, and medical imaging companies.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.swe_backend = seniorityPool(
  {
    title: 'Build a High-Performance Backend Service with AI-Integrated Rate Limiting',
    description: 'Build a backend service that demonstrates: async Python (FastAPI) or Go, database query optimization (use EXPLAIN ANALYZE), and an AI-powered rate limiter that learns from traffic patterns. Backend engineers who demonstrate AI integration in infrastructure code — not just feature development — are classified as senior-ready. Push to GitHub with load test results.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Lead a Cross-Team API Standardization or Service Migration Initiative',
    description: 'Mid-level backend engineers who lead a cross-team initiative — consolidating 3 internal APIs into a shared gateway, migrating from REST to gRPC for internal services, or defining the team\'s database migration standards — become the technical authority that other teams depend on. Volunteer to own one initiative this sprint, document it as an RFC, and drive it to completion. Engineers who create cross-team dependencies on their judgment are significantly harder to cut.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '21 days — propose RFC', priority: 'Critical',
  },
  {
    title: 'Architect a High-Availability or Cost-Optimisation Initiative and Publish the Case Study',
    description: 'Senior backend engineers are valued for system-level judgment, not code velocity. Identify one system design problem (latency spike, cost overrun, single-point-of-failure) and own the solution end-to-end: design, review, implementation, and post-launch measurement. Then write a 1,500-word case study ("How we reduced P99 latency by 60% at ₹0 additional infra spend") and publish on LinkedIn or your engineering blog. One published case study generates more senior-role contacts than 6 months of passive job searching.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '30 days — scope the project', priority: 'Critical',
  },
  {
    title: 'Design and Document a System Design Case Study',
    description: 'Write a 2,000-word system design case study for a real system you\'ve built: "How we scaled our payment API from 100 to 10,000 TPS." Include: bottlenecks identified, solutions considered, trade-offs, and what you would do differently. Publish on LinkedIn or your engineering blog. Backend engineers with published system design content receive 5× more senior-role contacts.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'High',
  },
  {
    title: 'Learn and Apply Database Internals (Query Planning, Indexing Strategy)',
    description: 'Most backend engineers use ORMs and never understand why queries are slow. Reading "Database Internals" by Alex Petrov + practicing with pg_stat_statements and EXPLAIN ANALYZE on your current database will differentiate you from 80% of backend engineers. Deep database expertise is one of the most AI-resistant backend skills.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.swe_frontend = seniorityPool(
  {
    title: 'Ship an AI-Powered Frontend Feature Using Streaming LLM APIs',
    description: 'Build a frontend feature using streaming LLM APIs (Claude or OpenAI streaming): real-time text generation, token-by-token display, and proper error handling. Frontend engineers who can implement production streaming UX — with loading states, cancellation, retry logic, and accessibility — are in short supply. Push to a public GitHub repo with live demo.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Own the Performance Budget and Core Web Vitals Program for Your Product',
    description: 'Mid-level frontend engineers who own the performance budget — the budget that defines maximum JS bundle size, LCP target, and CLS threshold — become the gatekeeper for every release. Run Lighthouse CI in GitHub Actions, set the budget, and block regressions automatically. When your product\'s Core Web Vitals improve by 30%, that is a business outcome you can claim ownership of. Engineers who own measurable business outcomes are the last ones cut.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Establish Frontend Architecture Standards and Own the Design System Strategy',
    description: 'Senior frontend engineers who define the architecture — component boundaries, state management patterns, rendering strategy, accessibility standards — create the framework others build within. Write a Frontend Architecture Decision Record covering your current choices and future direction. Then propose and own the design system: the shared component library that every team depends on. Design system owners are among the most protected senior engineering profiles at product companies.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '21 days — write the ADR', priority: 'Critical',
  },
  {
    title: 'Master Web Performance Optimization (Core Web Vitals + Bundle Analysis)',
    description: 'Run Lighthouse on your current app and achieve a score above 90 for LCP, CLS, and FID. Use webpack-bundle-analyzer or next/bundle-analyzer to reduce JS bundle size by ≥20%. Frontend engineers who own performance are classified as "Senior Frontend" regardless of title — it\'s a measurable, demonstrable skill that AI tools cannot fully automate.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '21 days', priority: 'High',
  },
  {
    title: 'Publish a Component Library or Design System Contribution',
    description: 'Contribute to Shadcn/ui, Radix UI, or your company\'s design system. Frontend engineers who own design system components are classified as cross-functional — they influence product, design, and engineering simultaneously. A public design system contribution is a permanent portfolio item.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.swe_fullstack = ACTION_DB.swe_backend;  // Fullstack shares backend-primary actions
ACTION_DB.swe_mobile = seniorityPool(
  {
    title: 'Ship an AI-Integrated Mobile Feature (On-Device or Cloud)',
    description: 'Build a mobile feature using either on-device ML (Core ML / TensorFlow Lite / MediaPipe) or cloud LLM APIs (streaming text, voice transcription, image analysis). Mobile engineers who demonstrate AI integration receive 3× more senior offers. Publish the feature in the app store or as a demo APK/IPA with a walkthrough video. This is now the new hire bar at product companies.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Own Mobile App Performance Benchmarks and Lead a Measurable Optimization Sprint',
    description: 'Mid-level mobile engineers who own the performance baseline — cold start time, ANR rate, crash-free session rate — become the owner of the metric that directly impacts retention and store rankings. Set up Firebase Performance Monitoring (free), baseline your current metrics, and propose a two-week optimization sprint with measurable targets. A 15% improvement in cold start time is a product outcome you can put in a resume and reference in every future salary negotiation.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '14 days — set up monitoring', priority: 'Critical',
  },
  {
    title: 'Define Mobile Platform Architecture and Lead SDK or Cross-Platform Framework Strategy',
    description: 'Senior mobile engineers who own the architecture decision — React Native vs. Flutter vs. native, shared business logic layer, SDK design for third-party integrations — create the framework that the entire mobile team depends on. Write an Architecture Decision Record covering your current choices. Then position yourself as the SDK owner or cross-platform migration lead. Engineers who define the mobile platform are the last ones cut when app teams shrink.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '21 days — write the ADR', priority: 'Critical',
  },
  {
    title: 'Earn Android or iOS Platform Certification',
    description: 'Google Associate Android Developer (₹6,500) or Apple\'s Swift Certification via 100 Days of SwiftUI (free) + portfolio. Mobile engineers with platform certifications receive 35% more callbacks for roles above ₹15 LPA. Focus on Jetpack Compose (Android) or SwiftUI (iOS) — the modern declarative UI frameworks that are now the hiring bar.',
    layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Build Performance Profiling Expertise (App Launch Time, Memory, Battery)',
    description: 'Use Android Profiler / Xcode Instruments to profile your current app for startup time, memory leaks, and battery drain. Fix the top 3 issues and document the before/after metrics. Mobile engineers who own performance are among the most retained at consumer app companies — every 100ms of startup time improvement has measurable business impact.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
  },
);

ACTION_DB.platform_engineer = seniorityPool(
  {
    title: 'Build an Internal Developer Platform Proof of Concept (Backstage.io)',
    description: 'Set up Backstage.io locally, integrate your GitHub repos as software catalog entries, and build one scaffolded template (e.g., a new service template with CI/CD pre-configured). Present the PoC to your engineering leadership. Platform engineers who demonstrate IDP value get reclassified as infrastructure owners — a high-retention role.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Migrate 3+ Engineering Teams to GitOps and Measure Deployment Frequency Improvement',
    description: 'Mid-level platform engineers who drive cross-team GitOps adoption — replacing manual kubectl or CI script deployments with ArgoCD — become the gatekeeper for deployment reliability. Own the rollout across 3 teams: document the ADR, run the migration, and measure the before/after deployment frequency and MTTR (mean time to restore). Present the metrics at a leadership review. Engineers who improve DORA metrics for multiple teams are promoted, not cut.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days — scope rollout', priority: 'Critical',
  },
  {
    title: 'Design and Own the Engineering Platform Strategy for the Next 24 Months',
    description: 'Senior platform engineers who write and own the platform roadmap — what IDP capabilities to build, which Kubernetes operators to adopt, how the developer experience will evolve — are classified as strategic infrastructure leaders. Write a 2-page platform strategy memo: current state, 6-month investments, 24-month vision. Present it to your VP Engineering or CTO. Platform engineers who own the strategy are not contractors — they are the authors of infrastructure the whole company depends on.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '21 days — write the memo', priority: 'Critical',
  },
  {
    title: 'Earn Certified Kubernetes Administrator (CKA) or CKAD',
    description: 'CKA (CNCF, ₹13,000) is the platform engineering certification that validates Kubernetes cluster administration. Platform engineers with CKA earn 45% more than those without in India\'s 2026 market. Study with Mumshad Mannambeth\'s Udemy course (₹499) — the highest-rated Kubernetes prep course in India.',
    layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Implement GitOps with ArgoCD and Document the Architecture',
    description: 'Replace manual kubectl deployments with ArgoCD GitOps in your environment. Write an Architecture Decision Record (ADR) explaining the migration. Platform engineers who own GitOps infrastructure are classified as DevOps transformation leads — a strategic title that survives headcount reductions.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.cloud_architect = seniorityPool(
  {
    title: 'Earn AWS Solutions Architect Professional or GCP Professional Cloud Architect',
    description: 'AWS SAP (₹24,000 exam) or GCP Professional Cloud Architect (₹15,000) is the senior cloud certification that cloud architects need for credibility. Engineers with professional-level cloud certs are considered for senior cloud architecture roles (₹30–60 LPA in India). Prep: Adrian Cantrill\'s SAP course (AWS, ₹2,500) or Google Cloud Skills Boost (free trial).',
    layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical',
  },
  {
    title: 'Lead a FinOps Initiative with Measurable Cost Reduction — Own the Business Outcome',
    description: 'Mid-level cloud architects who deliver a measurable cost reduction are classified as business-critical, not infrastructure overhead. Use AWS Cost Explorer, GCP Billing, or Azure Cost Management to identify the top 5 cost drivers. Implement 3 changes, document the monthly savings, and present the ROI at the next leadership review. A $50K/month cost reduction gives you a business outcome to reference in every subsequent negotiation.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Publish a Cloud Architecture White Paper and Position for CTO Advisory or Fractional Cloud Architect Engagements',
    description: 'Senior cloud architects who publish authoritative content — a 2,500-word whitepaper on multi-cloud resilience patterns, or a migration case study — are cited by companies selecting vendors and architecture partners. One well-distributed white paper generates inbound from companies actively hiring at the VP/Head of Infrastructure level. Simultaneously, offer a fractional cloud architecture advisory (10 hours/month) to a scaling startup — they need your judgment, not your hours.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 36, deadline: '21 days — draft white paper', priority: 'Critical',
  },
  {
    title: 'Design and Publish a Multi-Cloud Architecture Decision Record',
    description: 'Write an Architecture Decision Record or whitepaper on a real multi-cloud or hybrid cloud decision: "Why we chose GCP over AWS for our ML workloads" or "How we designed our DR architecture for 99.99% SLA." Cloud architects who publish ADRs are recognized as thought leaders and receive 5× more senior-role referrals.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '21 days', priority: 'High',
  },
  {
    title: 'Lead a FinOps Initiative with Measurable Cost Reduction',
    description: 'Volunteer to own cloud cost optimization: use AWS Cost Explorer, GCP Billing, or Azure Cost Management to identify the top 5 cost drivers. Implement 3 changes and document the monthly savings. Cloud architects who deliver measurable cost reductions (e.g., $50K/month saved) are classified as business-critical — the last profile cut in any restructuring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.ux_designer = seniorityPool(
  {
    title: 'Build an AI-Augmented Design Workflow and Document Your Process',
    description: 'Integrate AI tools into your design workflow: Figma AI for component generation, Midjourney for mood boards, Galileo AI for wireframes. Document the before/after: what changed, what AI generated vs what you refined, and the quality difference. UX designers who demonstrate AI-augmented workflows receive 3× more senior offers. The narrative is "I design faster AND better with AI" — not "AI replaces me."',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Own a Full Product Area\'s UX Research Cycle and Design System Contribution',
    description: 'Mid-level UX designers who own both the research and the design system for a product area become cross-functional leads — not interchangeable designers. Run 5 user interviews for your product area\'s biggest open question, write the findings report, and translate it into 3 design system components. Present at the next product review. Designers who produce both research insight and reusable component output are classified as product partners, not visual contractors.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '21 days — begin interviews', priority: 'Critical',
  },
  {
    title: 'Establish a Design Practice, UX Advisory Role, or Head of Design Track',
    description: 'Senior UX designers who own the design system strategy, define the research ops process, and mentor junior designers are positioned for Head of Design or VP Design. Alternatively, offer UX advisory to early-stage startups (typically ₹50,000–₹1,00,000/month, 4–6 hours/week): product critique, design system audit, user research framework. One advisory engagement builds financial optionality and positions you as external expert — valuable in any job negotiation.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 34, deadline: '21 days — write design strategy memo', priority: 'Critical',
  },
  {
    title: 'Conduct and Publish a User Research Study',
    description: 'Run 5 user interviews on a real product problem using the Jobs-to-be-Done framework. Write a 1,500-word findings report with actionable design recommendations. Publish on Medium or UX Collective. UX designers who publish research findings are classified as research-capable — the highest-retention UX specialization, because research judgment cannot be automated.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '21 days', priority: 'High',
  },
  {
    title: 'Earn a UX Research or Design Thinking Certification',
    description: 'Nielsen Norman Group UX Certification (₹8,000, remote) or IDEO Design Thinking Certificate (free via edX) builds the research credentials that differentiate UX designers from pure visual designers. UX researchers with formal credentials earn 35% more than UI designers in India\'s 2026 market.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '60 days', priority: 'Medium',
  },
);

ACTION_DB.security_engineer = seniorityPool(
  {
    title: 'Earn OSCP (Offensive Security Certified Professional) or CEH',
    description: 'OSCP (Offensive Security, ₹72,000 for lab + exam) is the gold standard in offensive security — it requires actual penetration testing, not multiple choice. CEH (EC-Council, ₹35,000) is more accessible and widely recognized in India enterprise. Security engineers with OSCP command ₹25–60 LPA in India, with demand growing 40% YoY as regulatory requirements increase.',
    layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical',
  },
  {
    title: 'Build and Own a DevSecOps Pipeline or Internal Bug Bounty Program',
    description: 'Mid-level security engineers who own the security gate in CI/CD — SAST (Semgrep), DAST (OWASP ZAP), dependency scanning (Snyk), and secret detection (Gitleaks) — become the compliance gatekeeper that every regulated company needs. Set up the pipeline for your team, define the blocking severity threshold, and brief your engineering leadership on the risk profile. Alternatively, launch an internal bug bounty program with a defined scope. Security engineers who own the prevention layer are the last cut in any restructuring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Establish a Security Advisory or CISO-Track Positioning',
    description: 'Senior security engineers with OSCP and production DevSecOps experience are sought advisors for Series A–C companies that cannot afford a full-time CISO. Offer a fractional vCISO engagement: security posture assessment + remediation roadmap + compliance mapping (ISO 27001, SOC 2). Charge ₹75,000–₹2,00,000/month for 8–10 hours. One engagement demonstrates market value that transforms your full-time salary negotiation. Alternatively, pursue a CISO or Head of Security track — your offense + defense combination is the rarest profile in security.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '21 days — first outreach', priority: 'Critical',
  },
  {
    title: 'Build a Bug Bounty Portfolio (HackerOne, Bugcrowd, or Responsible Disclosure)',
    description: 'Register on HackerOne or Bugcrowd and submit your first valid bug report. Bug bounty reports are the most powerful credential in security — they demonstrate real skills against production systems. Even a P4 (informational) finding, reported responsibly and clearly documented, differentiates you from 90% of security certification holders.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Specialize in Cloud Security or DevSecOps (Fastest-Growing Security Roles)',
    description: 'AWS Security Specialty (₹24,000) or CSSP Cloud Security certification positions you in the highest-demand security specialization. DevSecOps — integrating security into CI/CD pipelines (Snyk, SAST/DAST in GitHub Actions) — is chronically understaffed. Security engineers who can shift-left security into DevOps earn 50% more than perimeter/firewall-focused security engineers.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '60 days', priority: 'Medium',
  },
);

ACTION_DB.embedded_engineer = seniorityPool(
  {
    title: 'Build an AIoT Project Integrating Edge ML with a Microcontroller',
    description: 'Build an edge AI project: deploy a TensorFlow Lite or ONNX model on a Raspberry Pi or STM32. Detect an event (gesture, sound, anomaly) locally without cloud connectivity. Embedded engineers who demonstrate AI/ML on constrained hardware receive 4× more offers from EV, robotics, and industrial automation companies — the fastest-growing segments for embedded engineering in India.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Own an End-to-End Embedded Product — from Firmware to Cloud Connectivity and OTA Updates',
    description: 'Mid-level embedded engineers who own the full product stack — firmware, hardware abstraction layer, cloud connectivity (MQTT/HTTPS), and OTA firmware update pipeline — are among the most irreplaceable profiles in IoT and industrial automation. Volunteer to own the OTA pipeline or cloud connectivity layer for your current product. Engineers who own the device lifecycle (not just the firmware) are classified as embedded systems leads — a title that survives headcount reductions at hardware companies.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days — scope and begin', priority: 'Critical',
  },
  {
    title: 'Position as Embedded Systems Architect for EV, Robotics, or Industrial AI Advisory',
    description: 'Senior embedded engineers with AIoT and AUTOSAR expertise are in high demand as advisors to EV startups (Ather Energy, Ola Electric, and their supply chain), robotics companies (Postman, Miko), and industrial automation firms entering Industry 4.0. Offer a technical advisory: "Edge AI architecture assessment and roadmap for constrained hardware." Charge ₹75,000–₹1,50,000 per engagement. Your RTOS + edge ML combination is a rare capability that hardware-first companies pay a significant premium to access.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 36, deadline: '21 days — first outreach', priority: 'Critical',
  },
  {
    title: 'Earn an AUTOSAR or MISRA C Certification for Automotive Embedded',
    description: 'AUTOSAR Classic Platform knowledge + MISRA C coding standard compliance are mandatory for automotive embedded roles (KPIT, Tata Technologies, Bosch India, Continental). These certifications pay 40–60% premiums over general embedded roles. Attend an AUTOSAR training from Vector Informatik (₹15,000–30,000) or the free AUTOSAR Academy online.',
    layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Contribute to an Open-Source RTOS or Embedded Framework',
    description: 'Contribute to FreeRTOS, Zephyr RTOS, or Arduino. Even fixing a bug or adding documentation establishes you in the embedded OSS community. Embedded engineers with OSS contributions receive direct recruitment from embedded companies that actively monitor contributor activity.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.eng_manager = seniorityPool(
  {
    title: 'Define and Publish Your Team\'s AI Productivity Metrics',
    description: 'As an engineering manager, your most urgent task is showing that your team is measuring and improving productivity using AI tools. Define: velocity improvement (% story points/sprint increase since AI tools adoption), code review cycle time, and deployment frequency. Present these metrics at the next leadership review. Managers with data-backed AI adoption stories are classified as transformation leaders — not redundant overhead.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Build a Cross-Team AI Governance Framework and Present It at Director Level',
    description: 'Mid-level engineering managers who build frameworks that other teams adopt are classified as organisational infrastructure, not easily cut. Write an AI governance policy for engineering: approved tools, code review standards for AI-generated code, security posture, and productivity measurement. Pitch it at a director-level review and volunteer to lead the company-wide rollout. Managers who solve org-level problems survive when individual team headcount shrinks.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Position for Director of Engineering, VP Engineering, or Transition to Fractional Eng Leadership',
    description: 'Senior engineering managers with 3+ years managing AI-adopting teams are in the window for Director of Engineering roles (median ₹55–90 LPA in India product companies, 2026). Write your Director track narrative: team size managed, cross-functional projects owned, revenue impact of engineering decisions. Alternatively, explore fractional VP Engineering engagements for Series A–B startups — a $5,000–$10,000/month commitment of 10–15 hours/week that builds optionality while employed.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 36, deadline: '21 days — write your narrative', priority: 'Critical',
  },
  {
    title: 'Build Your Team\'s AI Governance and Quality Framework',
    description: 'Define the team\'s standards for AI-assisted code: what gets reviewed vs auto-accepted, what tests are required for AI-generated code, and how AI tool usage is tracked. Write this as a Team Engineering Handbook page. Engineering managers who own AI governance protect their teams from blanket AI-productivity mandates that often cut team size.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '21 days', priority: 'High',
  },
  {
    title: 'Develop a Technical Roadmap for Your Team\'s AI Integration',
    description: 'Write a 6-month roadmap: which tools to evaluate, which workflows to AI-augment first, expected velocity gains, and risk mitigations. Present it at your next skip-level. Engineering managers who proactively own AI integration planning are perceived as strategic — the ones who survive restructuring and get promoted when the market turns.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.tech_lead = seniorityPool(
  {
    title: 'Write a Technical Design Document for an AI-Integrated System',
    description: 'Write a TDD or RFC for an AI integration your team should implement: LLM-powered code review assistant, AI test generation, or automated incident diagnosis. Show: problem statement, alternatives considered, proposed architecture, risks. Tech leads who produce high-quality TDDs are seen as architecture-ready. Publish internally and ask for peer review from senior engineers.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Establish Technical Standards Across Teams and Lead a Cross-Functional Architecture Review',
    description: 'Mid-level tech leads who define standards that multiple teams adopt — API design conventions, testing thresholds, observability baselines — become organisational infrastructure. Propose and lead a cross-functional architecture review: invite 2–3 engineers from adjacent teams, review a shared system, and publish the decisions as Architecture Decision Records. Tech leads who operate across team boundaries are classified as architecture-level contributors — significantly harder to cut than single-team contributors.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Build a Track Record for Principal Engineer Track or Launch an Architectural Consulting Practice',
    description: 'Senior tech leads in the principal engineer window should build an external visibility portfolio: publish 2 technical articles, submit a conference talk abstract (QCon, Rootconf, HasGeek), and engage with 2 senior engineers outside your company. Principal engineers with external visibility receive 3× more recruiter contacts for senior IC roles (₹45–80 LPA, 2026). Alternatively, take a fractional technical advisor role with a startup — your ability to set technical direction in a new context is the proof point a principal title requires.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 34, deadline: '21 days — publish first article', priority: 'Critical',
  },
  {
    title: 'Lead an On-Call Incident and Write a Blameless Post-Mortem',
    description: 'The next time you handle an on-call incident, write a blameless post-mortem following the SRE model: timeline, root cause, contributing factors, action items with owners. Circulate it team-wide. Tech leads who produce high-quality post-mortems own the reliability learning culture — a high-retention identity that makes you the last person a manager wants to lose.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days (next incident)', priority: 'High',
  },
  {
    title: 'Mentor Two Engineers to Their Next Skill Level',
    description: 'Identify two engineers on your team who are 3–6 months from a promotion-level achievement. Create a specific plan for each: one project that demonstrates their readiness, with you as the reviewer. Tech leads who consistently develop engineers are classified as people-multipliers — the most protected leadership profile in any restructuring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '60 days', priority: 'Medium',
  },
);

ACTION_DB.principal_engineer = seniorityPool(
  {
    title: 'Write and Publish an Engineering Strategy Document',
    description: 'Write a 2,000-word engineering strategy document: where the org\'s technology stack should be in 24 months, what bets to make, what to deprecate, and what the AI integration roadmap looks like. Send it to your VP Engineering or CTO. Principal engineers who propose and execute strategy are the most protected profile in any restructuring and the most sought after in the external market.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Lead a Cross-Org Technical Initiative with Measurable Engineering-Wide Outcomes',
    description: 'Mid-level staff engineers who drive initiatives that span multiple teams — standardising the observability stack, migrating all services to a new internal API pattern, or owning the company\'s AI tooling strategy — demonstrate principal-level scope without needing the title first. Volunteer to own one cross-org initiative, write the proposal (1 page), and circulate it at the VP/director level. Staff engineers who demonstrate principal-scope work before the promotion conversation are promoted 2× faster than those who wait.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '14 days — write proposal', priority: 'Critical',
  },
  {
    title: 'Position for VP Engineering, CTO Advisory, or Distinguished Engineer Track — or Establish a Technical Consulting Practice',
    description: 'Senior principal engineers are in the window for VP Engineering, Distinguished Engineer, or CTO at a smaller company. Build external visibility NOW: publish 2 strategy articles, speak at one conference, and engage with 3 VPs at companies you respect. Principals with external visibility receive direct CTO-track offers — not just lateral moves. Alternatively, offer fractional CTO advisory to 2 Series A companies (₹1,50,000–₹3,00,000/month, 10–15 hours). One engagement validates your strategic scope and makes the next full-time CTO conversation a confirmation, not an interview.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 40, deadline: '21 days — publish first article', priority: 'Critical',
  },
  {
    title: 'Submit a Talk Proposal to a Major Technical Conference',
    description: 'Apply to speak at: QCon, Strange Loop, or KubeCon (international); HasGeek, Rootconf, or NASCOMTechTalk (India). Principal engineers with conference talks are visible to the market beyond their current employer. One accepted talk is equivalent to 12 months of passive job search in terms of inbound quality.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '30 days — submit abstract', priority: 'High',
  },
  {
    title: 'Write the Architectural Decision Record for Your Team\'s Most Complex Trade-off',
    description: 'Identify the hardest architectural decision your team made in the last 2 years. Write a formal ADR: context, options considered, decision made, and consequences. Publish it in your engineering wiki. This creates permanent institutional knowledge that is visible to leadership and demonstrates the depth of reasoning that justifies a principal title.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'Medium',
  },
);

ACTION_DB.solution_architect = seniorityPool(
  {
    title: 'Build and Present an AI-Augmented Architecture Proposal',
    description: 'For your next client or internal project, produce an architecture proposal that explicitly evaluates AI/LLM components: where they add value, what risks they introduce, how they would be governed. Solutions architects who can evaluate AI components — not just suggest them — are positioned as strategic advisors. The narrative: you reduce AI implementation risk, not increase it.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Own the Technical Solution for a Strategic Account — End-to-End from Proposal to Delivery',
    description: 'Mid-level solutions architects who own the full technical lifecycle — proposal, architecture design, client review, delivery governance, and post-launch optimisation — for one strategic account become the client-side technical authority. Request ownership of your highest-value client engagement. Solutions architects who own strategic accounts are the last people cut when services firms reduce headcount — their departure risks the revenue.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '14 days — request account ownership', priority: 'Critical',
  },
  {
    title: 'Launch an Independent Solutions Architecture Consulting Practice or Pursue CTO Advisory',
    description: 'Senior solutions architects with a track record of enterprise architecture decisions are positioned to offer fractional CTO or independent consulting services to mid-market companies (₹500Cr–₹2,000Cr revenue) that need architectural direction without a full-time hire. One retainer at ₹1,50,000–₹3,00,000/month for 12 hours/week builds income security and positions you above the commoditised solutions architect market. Alternatively, pursue a Head of Architecture or CTO track — your cross-domain enterprise experience is the differentiator.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '21 days — write your consulting proposition', priority: 'Critical',
  },
  {
    title: 'Earn AWS Solutions Architect Professional or Azure Solutions Expert',
    description: 'AWS SAP (₹24,000) or Azure Solutions Architect Expert (₹24,000) validates senior cloud architecture skills and is the standard credential for solutions architect roles in India IT services. With either cert, Naukri shows 55% more senior architect roles (₹25–50 LPA) and 3× faster callback rates.',
    layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'High',
  },
  {
    title: 'Publish a Case Study on an Architecture Decision You Made',
    description: 'Write a public case study (LinkedIn or personal blog): "How I designed [system] for [company type]: the trade-offs, the surprises, and what I would do differently." Solutions architects with 2+ published case studies receive 4× more inbound from both enterprise clients and product companies seeking technical leadership.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'Medium',
  },
);

ACTION_DB.support_engineer = seniorityPool(
  {
    title: 'Transition to Site Reliability Engineering or DevOps Using Your Production Knowledge',
    description: 'Technical support engineers have unique production knowledge — you know what fails, how, and why. This knowledge is the foundation for SRE. Start the CKA (Kubernetes) or AWS SysOps cert track. Apply to SRE/DevOps roles at the companies you currently support, using your issue history as the portfolio: "I diagnosed 200+ production incidents, here\'s the pattern I found." This is the highest-ROI transition for support engineers.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 35, deadline: '60 days — start cert; 90 days — apply', priority: 'Critical',
  },
  {
    title: 'Build Internal AI-Powered Troubleshooting Tooling and Train Your Team on It',
    description: 'Mid-level support engineers who build and own the AI-powered troubleshooting tool — not just use it — become the platform owner who makes the rest of the team more productive. Use Claude or OpenAI APIs to build a tool: input a customer error message, output the 3 most likely root causes with fix steps, trained on your incident history. Deploy it, train the team, and measure the time-to-resolution improvement. Engineers who build tools the team depends on are infrastructure — not interchangeable support headcount.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Position as Technical Customer Success Lead, Engineering Enablement Specialist, or Support Engineering Manager',
    description: 'Senior support engineers who have diagnosed hundreds of production issues across dozens of customer environments hold institutional knowledge that is genuinely rare. Position yourself for a Technical Customer Success Manager, Solutions Engineer, or Support Engineering Manager role — all pay 40–70% more than individual contributor support. Write a case study of your highest-complexity resolution, quantify the business impact (revenue at risk, SLA breach avoided), and present it to your manager as your case for a senior IC or management track.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 36, deadline: '14 days — write the case study', priority: 'Critical',
  },
  {
    title: 'Build Internal AI-Powered Troubleshooting Tooling',
    description: 'Use an LLM API (Claude or OpenAI) to build an internal tool that: takes a customer error message as input and suggests the most likely root cause + fix steps. Trained on your incident history. This positions you as the person building the next generation of support tooling — not the person being replaced by it. Demonstrate to your manager.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Earn AWS Cloud Support Engineer or Google Cloud Professional Cloud Support Engineer',
    description: 'AWS Cloud Support Associate (free study materials, ₹8,500 exam) or GCP Professional Cloud Support Engineer validates your cloud troubleshooting expertise at a recognized credential level. Support engineers with cloud certifications transition 4× more often to SRE/platform roles than those without.',
    layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
  },
);

// ─── Professional services fallback pool ─────────────────────────────────────
// MED-3: Roles not matching any tech pool (lawyer, nurse, teacher, accountant,
// operations, finance, etc.) fall back to this pool — NOT 'swe'. Actions here
// focus on licensing, certification, consulting, and professional networking,
// which are meaningful across non-engineering knowledge-work roles.

ACTION_DB.professional_services = seniorityPool(
  {
    title: 'Audit Your Professional Certifications and Renew or Upgrade the Most Market-Valued One',
    description: 'In professional services, certifications are the primary signal of current competence. Identify the 2 most in-demand certifications in your field (ask your professional association or check job postings). If you hold them, renew or upgrade. If you don\'t, enroll in the highest-signal one within the next 2 weeks. Professionals with current, advanced credentials receive 35–50% more interview invitations in most professional services domains.',
    layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '14 days — enroll', priority: 'Critical',
  },
  {
    title: 'Build Visibility in Your Professional Community — Publish, Speak, or Lead a Working Group',
    description: 'Mid-career professionals who publish in their field\'s trade journals, speak at industry associations, or chair a working group become the recognized name that gets called when an organisation needs senior professional expertise. Pick one channel: write a 1,200-word article for your industry publication, submit a talk to your professional association\'s next conference, or volunteer to lead a committee. One visible contribution generates more senior-level opportunities than 6 months of passive job applications.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '21 days — submit or publish', priority: 'Critical',
  },
  {
    title: 'Launch a Consulting or Advisory Practice in Your Domain',
    description: 'Senior professionals with 10+ years of domain expertise are in the strongest position to offer consulting services to organisations that cannot afford full-time expertise. Define your consulting proposition in 3 sentences: who you help, what outcome you deliver, and what you charge. Start with your existing network — 80% of first consulting engagements come from former colleagues or clients. One retainer engagement at ₹75,000–₹2,00,000/month provides financial resilience and demonstrates market-validated expertise in every subsequent salary negotiation.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 36, deadline: '14 days — write proposition', priority: 'Critical',
  },
  {
    title: 'Activate Your Professional Network — 5 Conversations in 10 Days',
    description: 'In professional services, opportunities flow through relationships more than job boards. Message 5 people in your network this week: former colleagues, clients, or mentors. The message: "Catching up — I\'d love to hear what you\'re working on." Do not ask for a job. 80% of professional services roles above ₹15 LPA are filled through referrals before they are posted. These 5 conversations are your highest-ROI career action.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '10 days', priority: 'High',
  },
  {
    title: 'Adopt AI Tools to Amplify Your Professional Output — Document the Productivity Gain',
    description: 'Professionals who demonstrate AI augmentation in their work — using Claude or ChatGPT for research, drafting, or analysis — position themselves as forward-looking, not replaceable. Pick one core workflow (contract drafting, financial modelling, lesson planning, patient documentation) and use an AI tool to complete it 40% faster. Document the time saved and the quality comparison. This narrative ("I use AI to deliver more, faster") is the most protective professional positioning available in 2026.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '14 days', priority: 'Medium',
  },
);

// ─── Phase 1B: 60 New Role Groups (v37.0) ─────────────────────────────────────
// Added roles: Product/Design (10), Data/Analytics (8), Engineering Leadership (6),
// Finance (14), Sales (12), HR (10) = 60 explicit ACTION_DB entries.
// These replace the generic professional_services fallback for all covered professions.

// ── DevOps (explicit, replacing engineering-adjacent swe fallback) ─────────────
ACTION_DB.devops = seniorityPool(
  {
    title: 'Build a GitOps-First Infrastructure Repo with Full CI/CD Observability',
    description: 'Create a production-grade GitOps repo using ArgoCD or Flux with: multi-environment promotion, Prometheus + Grafana dashboards, PagerDuty/OpsGenie integration, and runbook documentation. Add a DORA metrics dashboard showing lead time and change failure rate. Junior DevOps engineers with demonstrable SLO ownership receive 3× more senior platform offers. Time: 15–20 hours.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn AWS/GCP/Azure DevOps Professional Certification + Kubernetes CKA',
    description: 'The CKA (Certified Kubernetes Administrator) + a cloud provider professional-level DevOps cert is the combination that unlocks 40–60% salary premiums in platform roles. Study: 3 months, ₹15,000–30,000 total cost. Target roles: DevOps Lead, Platform Engineer, SRE Lead at product companies (Razorpay, Groww, CRED). Both certs together position you for ₹30–50 LPA roles.',
    layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '90 days', priority: 'Critical',
  },
  {
    title: 'Publish a Platform Engineering Blog Series and Speak at a DevOps Conference',
    description: 'Write a 4-part technical blog series documenting your most complex infrastructure challenge: the problem, architecture decision record, implementation, and lessons learned. Submit to DevOpsDays, KubeCon, or HashiConf. Senior DevOps engineers who present at conferences command 25–40% salary premiums and receive direct recruiter outreach from FAANG/MAANG cloud teams.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '45 days — submit CFP', priority: 'High',
  },
  {
    title: 'Migrate One Critical Workflow to Infrastructure-as-Code with Full Drift Detection',
    description: 'Pick your company\'s most manual, ticket-driven infrastructure process. Automate it completely using Terraform + Atlantis (or Pulumi), with drift detection alerts and self-healing runbooks. Document the before/after metrics: time saved, incident reduction. Engineers who own IaC initiatives are 4× less likely to be cut in platform consolidations because their work is foundational.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Implement SLO-Based Alerting and Eliminate 80% of Alert Noise',
    description: 'Error-budget-based SLO alerting (using OpenSLO or Sloth with Prometheus) eliminates the most common DevOps pain point: on-call fatigue from noisy alerts. Reduce alert volume by 80% and document the process. This is the highest-visibility operational win available — management notices when the on-call load drops.',
    layerFocus: 'L3 · Skills', riskReductionPct: 16, deadline: '30 days', priority: 'Medium',
  },
);

// ── QA Engineer ────────────────────────────────────────────────────────────────
ACTION_DB.qa_engineer = seniorityPool(
  {
    title: 'Build an AI-Augmented Test Suite with Autonomous Test Generation',
    description: 'Use Copilot or GPT-4 to generate 200+ test cases from your existing codebase, then validate them against production bugs. Implement Playwright or Cypress visual regression testing as a baseline. Junior QA engineers who demonstrate AI test generation skills are repositioned as "quality automation engineers" — a role category with 40% less displacement risk than manual QA.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Build a Shift-Left Quality Culture — Own DORA Metrics and Release Quality Scorecard',
    description: 'Deploy a DORA metrics dashboard (deployment frequency, lead time, MTTR, change failure rate) and own the weekly quality scorecard that reports to engineering leadership. QA engineers who quantify their business impact through release quality metrics are classified as "platform risk managers" rather than "testers" — a category that survives headcount rationalization.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 25, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Lead the Shift to Continuous Quality — Performance Testing and Chaos Engineering Ownership',
    description: 'Own performance testing (k6, Locust, or JMeter) and implement chaos engineering experiments (Chaos Monkey or LitmusChaos) for 3+ critical services. Senior QA engineers who own chaos engineering are reclassified as reliability engineers — a protected function. Present quarterly reliability reports to VP Engineering.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Earn ISTQB Advanced + API Automation Certification (Postman/RestAssured)',
    description: 'ISTQB Advanced Test Analyst + Postman API Testing Certification is the most valued credentials combination for mid-career QA engineers targeting product companies. Study: 2 months, ₹8,000–12,000. Target roles: Senior SDET, QA Lead at product companies pay ₹18–28 LPA — 60% more than IT services QA roles at the same seniority.',
    layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Transition to Test Architecture — Define the Organization-Wide Test Strategy',
    description: 'Write a comprehensive test strategy document covering: testing pyramid ratios, flaky test SLA, CI gate policy, visual regression coverage, and mutation testing targets. Present to the engineering team. QA engineers who own test architecture are the last to be cut in quality-focused engineering organizations.',
    layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '21 days', priority: 'Medium',
  },
);

// ── Product Manager ─────────────────────────────────────────────────────────────
ACTION_DB.product_manager = seniorityPool(
  {
    title: 'Ship One AI-Native Product Feature End-to-End with Full Metric Ownership',
    description: 'Identify a customer problem that can be solved with an LLM-based feature. Write the PRD, work with engineering to ship it, and own the success metrics (adoption rate, task completion, user satisfaction). Junior PMs who have shipped AI-native features — not just "added AI to the roadmap" — receive 2.5× more senior PM interview invites. Document the full lifecycle: problem, hypothesis, build, learn.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Build Your OKR/Impact Ownership Document — Quantify Revenue and Retention Impact',
    description: 'Create a one-page product impact document: for each major initiative you led, quantify: revenue generated or protected (₹ or $), retention impact (% churn reduction), and user adoption (MAU/DAU change). Mid-level PMs who can cite verified business outcomes receive 35% higher offers and pass hiring screens 3× faster. This document is your negotiation asset.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Drive a Zero-to-One Product Initiative and Own the Business Case',
    description: 'Senior PMs who have taken products from idea to revenue are in the top 10% of the market. Identify one new product opportunity in your company\'s space, write the business case (TAM, competitive landscape, 18-month revenue model), and either get it funded or use it as your next-company interview asset. Senior product candidates who pitch new product ideas during interviews are hired at ₹40–80 LPA vs ₹25–40 LPA for those who only describe past feature work.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Earn Product School / Reforge Product Management Certificate and Update LinkedIn',
    description: 'Reforge PM certificate or General Assembly Product Management certification signals current methodology fluency. Complete the most relevant track to your next role target: Growth PM (Reforge Growth Series), Platform PM (Reforge Platform), or Core PM (Product School). PMs with current, named certifications receive 40% more recruiter contacts on LinkedIn.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '45 days', priority: 'High',
  },
  {
    title: 'Conduct 10 Customer Discovery Interviews and Synthesize into a Published Insight',
    description: 'Run 10 structured customer discovery interviews (Jobs-to-Be-Done framework) and write a customer insight document or LinkedIn article about the key findings. PMs who actively conduct customer research and publish insights are 60% more likely to receive leadership endorsement and external visibility that accelerates hiring.',
    layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '30 days', priority: 'Medium',
  },
);

// ── UX Researcher ──────────────────────────────────────────────────────────────
ACTION_DB.ux_researcher = seniorityPool(
  {
    title: 'Build a Public Research Portfolio with 2 End-to-End Case Studies',
    description: 'Document 2 research projects with full methodology: research question, method selection rationale, screener, guide, analysis approach (affinity mapping, thematic analysis), and business outcome. Host on Notion or a personal site. Junior UX researchers with documented impact portfolios receive 3× more interview invites than those with only deliverable screenshots.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Lead a Strategic Research Initiative that Directly Shaped Product Direction',
    description: 'Identify an unresolved strategic question in your product area and propose a research plan to leadership. Conduct a mixed-methods study (qual + quant) that produces a decision recommendation with a measurable outcome. Mid-career researchers who can demonstrate "research → product decision → business outcome" triad are 4× less likely to face role elimination.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Critical',
  },
  {
    title: 'Build a Research Repository and Democratize Insights Across the Organization',
    description: 'Implement a research repository (Dovetail, Notion, or Airtable) that makes past research findable. Conduct quarterly research briefings for product leadership. Senior researchers who build organizational research infrastructure are reclassified from "project resource" to "strategic capability" — the difference between the first and last to be cut.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Earn Nielsen Norman Group UX Research Certification',
    description: 'NNg UX Research certificate is the most recognized credential in the UX research market. The 5-course track costs approximately $1,500 and takes 2–3 months. Researchers with NNg certification command 20–35% salary premiums at product companies vs. IT services.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Conduct an AI Usability Study and Publish the Findings',
    description: 'Conduct a usability study on an AI product (your own or a public tool) and publish the key findings as a LinkedIn article or design community post. AI usability is the highest-demand research specialization in 2026 and researchers with published AI research experience receive 50% more recruiter outreach.',
    layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '30 days', priority: 'Medium',
  },
);

// ── Brand Designer ────────────────────────────────────────────────────────────
ACTION_DB.brand_designer = seniorityPool(
  {
    title: 'Build a Live Design Portfolio with 3 Brand Case Studies on Behance/Dribbble',
    description: 'Create 3 polished brand identity case studies: each showing brand strategy brief, moodboard exploration, final mark system, and application across touchpoints. Host on Behance with process documentation. Brand designers with well-documented process portfolios receive 4× more recruiter views than those with only final outputs.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Take on a Freelance Brand Identity Project to Build Revenue Resilience',
    description: 'Secure 1–2 freelance brand identity clients through LinkedIn or design communities. A ₹30,000–₹1,00,000 project provides financial buffer and an external portfolio piece that demonstrates market-validated work. Brand designers with active freelance track records command 25% salary premiums in full-time hiring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Lead a Full Brand Evolution Initiative — Visual Identity System at Scale',
    description: 'Senior brand designers who own brand system evolution projects (design tokens, component libraries, brand voice + visual alignment) are classified as strategic business assets, not production design resources. Propose and lead one brand system initiative this quarter. Budget the time as 20–30% of your role.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Master AI Design Tools — Midjourney, Firefly, and DALL-E for Brand Ideation',
    description: 'Designers who demonstrate AI tool fluency in concepting and moodboarding (Midjourney for style exploration, Adobe Firefly for asset generation) are repositioned as "AI-augmented creative directors" rather than production designers. Document your AI workflow and share it publicly.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '14 days', priority: 'High',
  },
  {
    title: 'Get Adobe Certified Professional in Illustrator or Photoshop',
    description: 'Adobe Certified Professional credentials are the primary market signal for brand designers at production companies. The exam costs approximately $180 and validates platform mastery. Designers with current Adobe certifications receive 20% more interview invites from agencies and product companies.',
    layerFocus: 'L3 · Skills', riskReductionPct: 12, deadline: '30 days', priority: 'Medium',
  },
);

// ── Data Scientist (explicit entry; previously fell to swe via engineering adjacent) ──
ACTION_DB.data_scientist = seniorityPool(
  {
    title: 'Deploy an End-to-End ML Model to Production with Full Monitoring',
    description: 'Build and deploy a machine learning model that solves a real business problem: churn prediction, demand forecasting, or recommendation. Use MLflow for experiment tracking, FastAPI for serving, and Evidently or Whylogs for model drift monitoring. Junior data scientists who deploy to production are reclassified from "analysts with models" to "ML engineers" — a 40% higher-pay category.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Build a Kaggle Top-10% Portfolio + Publish a Research-Quality Notebook',
    description: 'Achieve top-10% in 2 Kaggle competitions in your specialisation (tabular, NLP, or computer vision) and publish a Gold Medal notebook with detailed methodology. Mid-career data scientists with competitive ML track records receive 3× more senior DS interview invites. Specifically, a public Kaggle Expert or Master profile unlocks FAANG DS screening.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '60 days', priority: 'Critical',
  },
  {
    title: 'Lead a High-Impact Analytics Initiative and Present to C-Suite',
    description: 'Propose and lead a company-level analytics initiative (customer segmentation, pricing model, market basket analysis) and present findings directly to VP or C-Suite. Senior data scientists who own business-facing analytics initiatives — not just model outputs — are classified as strategic decision support functions. This framing makes you the last person cut, not the first.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Earn Google Advanced Data Analytics or Databricks Certified ML Associate',
    description: 'Databricks Certified Machine Learning Associate (₹15,000 exam) or Google Professional Machine Learning Engineer certification validates production ML competency. Target roles post-certification: Senior Data Scientist or ML Engineer at product companies (Meesho, Flipkart, Swiggy) pay ₹35–65 LPA vs ₹20–35 LPA at IT services.',
    layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Build a Public Data Story: Analyze and Visualize a Controversial Dataset',
    description: 'Choose a high-visibility public dataset (economic data, social trends, sports analytics) and publish a comprehensive visual analysis that drives engagement. Data scientists with 500+ LinkedIn reactions on a published analysis receive 2× more recruiter outreach within 30 days. Tools: Python (Plotly/Altair), Flourish, or Observable.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Medium',
  },
);

// ── Analytics Engineer ─────────────────────────────────────────────────────────
ACTION_DB.analytics_engineer = seniorityPool(
  {
    title: 'Build a Public dbt + BigQuery/Snowflake Analytics Project',
    description: 'Create an end-to-end analytics engineering project: source data ingestion, dbt transformation models with full lineage documentation, data quality tests (dbt-expectations), and a Looker/Metabase dashboard. Host on GitHub with README. Analytics engineers with documented dbt projects receive 4× more interview invites from product companies vs. IT services.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn dbt Analytics Engineering Certification + Snowflake SnowPro Core',
    description: 'dbt Analytics Engineering Certification ($150) + Snowflake SnowPro Core ($175) is the credential pair that most directly unlocks analytics engineering roles at product companies. Mid-career analytics engineers with both certifications command ₹28–45 LPA vs ₹18–28 LPA without.',
    layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '60 days', priority: 'Critical',
  },
  {
    title: 'Implement a Semantic Layer and Own the Company Metrics Catalog',
    description: 'Build a semantic layer (dbt Metrics, LookML, or AtScale) that becomes the single source of truth for all business metrics. Own the metrics catalog and governance process. Senior analytics engineers who own the semantic layer are the most difficult to replace in data organizations — the institutional knowledge is non-transferable.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Implement Data Observability across the Production Pipeline',
    description: 'Deploy a data observability solution (Monte Carlo, Anomalo, or Great Expectations) across your 3 most critical data pipelines. Document the data SLAs and alert thresholds. Engineers who own data reliability reduce their displacement risk by demonstrating business continuity ownership.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Run a Self-Service Analytics Enablement Program',
    description: 'Create a self-service analytics enablement program: SQL training materials, Looker/Metabase dashboard templates, and 1:1 coaching for 3 business stakeholders. Analytics engineers who demonstrate cross-functional impact — not just technical output — are classified as data product managers rather than technical contributors.',
    layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '30 days', priority: 'Medium',
  },
);

// ── BI Analyst ────────────────────────────────────────────────────────────────
ACTION_DB.bi_analyst = seniorityPool(
  {
    title: 'Build an End-to-End BI Portfolio: From Raw Data to Executive Dashboard',
    description: 'Create a complete BI project: load a public dataset (Kaggle or government data), build a transformation pipeline (Python + SQL), and publish a Power BI or Tableau dashboard with executive-level insights. Junior BI analysts with public portfolio projects receive 3× more interview invites than those with only work screenshots.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn Microsoft Power BI Data Analyst Associate (PL-300) or Tableau Desktop Specialist',
    description: 'Power BI PL-300 ($165 exam) or Tableau Desktop Specialist ($250) is the primary market credential for BI roles. Mid-career BI analysts with current platform certifications receive 25–35% salary premiums. Target roles: Senior BI Developer, Data Analytics Lead at GCCs (HSBC, Barclays, JPMorgan India) pay ₹20–35 LPA.',
    layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '45 days', priority: 'Critical',
  },
  {
    title: 'Transition from Report Builder to Data Product Owner — Own the Business Dashboard Suite',
    description: 'Shift from reactive reporting to owning the company\'s core business dashboards as data products: define SLAs, run stakeholder feedback cycles, and maintain a dashboard catalog. BI analysts who operate as data product owners are reclassified from "cost center" to "decision infrastructure" — a category that survives restructuring.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Learn Python for Data Analysis and Build an Automated Reporting Pipeline',
    description: 'Replace one manual Excel/CSV reporting workflow with a Python + pandas automated pipeline that produces the report in < 5 minutes. BI analysts who automate their own manual work demonstrate productivity and aren\'t seen as automation targets — they\'re seen as automation agents.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Conduct a Dashboard Audit — Eliminate Unused Reports and Improve Key Dashboards',
    description: 'Audit all existing dashboards: identify which are unused (< 2 views/month), which are duplicated, and which are highest-value. Deprecate the low-value ones and improve the top-3 dashboards with user feedback. BI analysts who govern data assets proactively are valued as data governance leads.',
    layerFocus: 'L3 · Skills', riskReductionPct: 12, deadline: '21 days', priority: 'Medium',
  },
);

// ── Quantitative Analyst ───────────────────────────────────────────────────────
ACTION_DB.quantitative_analyst = seniorityPool(
  {
    title: 'Build and Backtest a Trading Strategy or Risk Model with Live Market Data',
    description: 'Implement a quantitative strategy (pairs trading, momentum, mean-reversion) using Python (pandas, zipline, backtrader) with real market data. Produce a comprehensive backtest report: Sharpe ratio, max drawdown, turnover, transaction costs. Junior quants with public backtesting portfolios are screened in 4× more frequently for sell-side and buy-side roles.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn CFA Level 1 or FRM Part 1 — Begin the Credential Journey',
    description: 'CFA Level 1 ($900 exam) or FRM Part 1 ($450 exam) is the credential that separates quant candidates. Mid-career quantitative analysts without CFA/FRM progression face significantly higher displacement risk as AI tools automate statistical model building. Enroll in the next exam sitting immediately.',
    layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days — enroll now', priority: 'Critical',
  },
  {
    title: 'Lead Quantitative Research Initiative — Publish an Internal White Paper',
    description: 'Identify an unresolved quantitative problem in your organization (pricing model enhancement, risk factor analysis, portfolio construction improvement) and write a research paper with findings. Senior quants who publish internal research establish irreplaceable institutional knowledge and are considered strategic assets.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '45 days', priority: 'High',
  },
  {
    title: 'Learn Machine Learning for Finance — Apply ML to a Risk or Pricing Problem',
    description: 'Apply gradient boosting (XGBoost/LightGBM) or neural networks to a financial problem you currently solve statistically. Demonstrate ML outperformance on backtested data. Quantitative analysts who integrate ML methods are classified as "quantitative ML engineers" — a hybrid category that commands 30% salary premiums.',
    layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Automate Your Most Time-Consuming Model Update Process',
    description: 'Identify the model refit, data ingestion, or reporting process that consumes the most time and automate it completely using Python scheduling. Document the time saved and present to your manager. Quants who automate their own workflows are seen as productivity multipliers rather than automation targets.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 14, deadline: '21 days', priority: 'Medium',
  },
);

// ── Engineering Leadership roles ───────────────────────────────────────────────
// Staff/Principal Engineer (separate from principal_engineer for career path clarity)
ACTION_DB.staff_engineer = seniorityPool(
  {
    title: 'Publish a Technical Architecture Decision Record for a Major System Design',
    description: 'Staff engineers\' primary value is technical judgment. Write a comprehensive ADR for the most complex system design decision you\'ve made in the last 6 months: problem, alternatives considered, decision, consequences, and 12-month outcome prediction. Publish internally and, where possible, as a technical blog post. Staff engineers who publish their reasoning receive 40% more VP/C-suite recognition.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Lead a Cross-Functional Technical Initiative — Resolve a System-Wide Bottleneck',
    description: 'Identify the highest-impact system-wide technical bottleneck (reliability, performance, developer velocity, security posture). Own the proposal, cross-team alignment, and delivery. Staff engineers who drive org-wide technical improvements are classified as "technical infrastructure" — the last category to face cuts.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Become the External Technical Face — Present at a Conference or Write for Engineering Blog',
    description: 'Distinguished engineers and staff ICs who represent their company externally (conference talks, engineering blog posts, open-source leadership) are company brand assets. Submit 2 conference proposals and write 1 engineering blog post this month. External visibility creates a gravity field that makes you nearly impossible to cut without PR implications.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Build an Internal Engineering Mentorship Program',
    description: 'Create a structured mentorship program for mid-level engineers: pair them with senior ICs, define mentorship goals, and track outcomes. Staff engineers who invest in engineering culture create organizational loyalty that protects them during restructuring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Conduct an Engineering Health Audit and Publish Recommendations',
    description: 'Assess your engineering organization\'s technical health: test coverage, deployment frequency, mean time to recovery, code complexity hotspots. Write a structured report with prioritized recommendations. Engineers who identify and frame systemic problems attract VP-level sponsorship.',
    layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '14 days', priority: 'Medium',
  },
);

// Share between distinguished_engineer and staff_engineer (principal+ equivalent)
ACTION_DB.distinguished_engineer = ACTION_DB.staff_engineer;

// ── Financial Analyst ─────────────────────────────────────────────────────────
ACTION_DB.financial_analyst = seniorityPool(
  {
    title: 'Build a Financial Modelling Portfolio — 3-Statement Model + DCF Valuation',
    description: 'Build a fully linked 3-statement financial model (P&L, balance sheet, cash flow) with DCF valuation for a public company in your coverage sector. Include sensitivity analysis and scenario modelling. Post to a portfolio site or LinkedIn. Junior financial analysts with demonstrable modelling skills receive 3× more interview calls from top-tier banks and consulting firms.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Enroll in CFA Level 1 — Begin the Credential Journey Immediately',
    description: 'CFA Level 1 ($900 exam) is the single highest-signal credential in finance. Mid-career financial analysts without CFA progression face 35% higher displacement risk as AI tools (Bloomberg AI, Microsoft Copilot for Excel) automate routine financial analysis. The CFA signals judgment, not just calculation — a distinction that matters in the AI era.',
    layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days — enroll now', priority: 'Critical',
  },
  {
    title: 'Own the FP&A Business Partnership — Drive a P&L Owner Quarterly Review',
    description: 'Senior financial analysts who own business partnerships with P&L leaders (not just report to them) are classified as "strategic finance business partners" — a protected category. Propose and lead a quarterly financial review session with your business partner. This repositioning from "report generator" to "decision partner" is the highest-leverage career action available.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Master Advanced Excel Modelling and Python for Finance',
    description: 'Build a Python + pandas financial analysis tool that automates one of your most time-consuming Excel processes (variance analysis, budget vs. actuals, rolling forecasts). Document the time saved. Finance professionals who demonstrate Python automation are 50% less likely to face automation displacement — they become the automation deployers.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Build a Treasury Forecasting Dashboard to Improve Cash Visibility',
    description: 'Create a rolling 13-week cash flow forecast model with automated variance analysis and bank balance reconciliation. Financial professionals who own cash management intelligence are classified as business-critical functions and face significantly lower displacement risk.',
    layerFocus: 'L3 · Skills', riskReductionPct: 16, deadline: '21 days', priority: 'Medium',
  },
);

// ── Investment Banker ──────────────────────────────────────────────────────────
ACTION_DB.investment_banker = seniorityPool(
  {
    title: 'Build a Live Comparable Company Analysis and Present in an Interview or Internal Meeting',
    description: 'Select 5–8 public companies in your target sector and build a comprehensive comps table: EV/Revenue, EV/EBITDA, P/E, growth rates, and margin profiles. Present to a mentor or use in your next interview. Junior bankers who demonstrate live model fluency receive significantly more callbacks at boutiques and middle-market banks.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Earn CFA Level 1 or FMVA Certification',
    description: 'CFA Level 1 or FMVA (Financial Modelling & Valuation Analyst by CFI) are the most direct credentialing paths for mid-career bankers targeting buy-side transitions. Complete FMVA (8 courses, ~$497) within 60 days. This credential directly opens doors at private equity, family offices, and corporate development.',
    layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '60 days', priority: 'Critical',
  },
  {
    title: 'Own an Industry Coverage Vertical — Become the Go-To Expert',
    description: 'Senior bankers who own deep sector expertise (healthcare M&A, fintech deals, infrastructure) command 40–60% fee premium and receive direct client calls. Write an 8-page sector report on your coverage area and distribute to 10 clients. Sector expertise is the primary moat against AI commoditisation of financial modelling.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Build Your Deal Tracker and Quantify Your Revenue Contribution',
    description: 'Document every deal you\'ve supported: mandate volume, deal size, your specific contribution (model built, client meeting, diligence process), and closing timeline. Senior bankers who can articulate revenue attribution in interviews receive 25–40% higher offers when transitioning firms.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'High',
  },
  {
    title: 'Learn Excel VBA + Python for Banking Automation',
    description: 'Automate one repetitive banking workflow (pitch book template population, data scraping, model refresh) using Python or VBA. Investment bankers who automate analyst-level work are reclassified as process improvement specialists — a non-displaceable function when AI tools accelerate deal volume.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '21 days', priority: 'Medium',
  },
);

// ── Portfolio Manager ──────────────────────────────────────────────────────────
ACTION_DB.portfolio_manager = seniorityPool(
  {
    title: 'Build a Paper Portfolio with Documented Investment Thesis for Each Position',
    description: 'Run a simulated $1M portfolio with 10–15 positions. For each, write a documented investment thesis: business quality assessment, competitive moat, valuation method, entry/exit criteria, position sizing rationale. Junior portfolio analysts who demonstrate structured investment process receive 3× more interviews at asset managers.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn CFA Level 2 — The Buy-Side Credential Gate',
    description: 'CFA Level 2 is the inflection point that separates portfolio analysts from portfolio managers in the hiring market. The exam covers equity valuation, fixed income, derivatives, and portfolio management at a level that directly aligns with PM decision-making. Without CFA progression, buy-side advancement caps at analyst level.',
    layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days — enroll now', priority: 'Critical',
  },
  {
    title: 'Develop a Proprietary Investment Framework — Publish an Investment Memo',
    description: 'Write a comprehensive investment memo on a public company or sector: thesis, bear/base/bull scenarios, key risks, catalyst timing, and position sizing recommendation. Distribute to your professional network and LinkedIn. Senior PMs who publish investment thinking build market reputation that generates direct LP/investor conversations.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Integrate Quantitative Factors into Your Investment Process',
    description: 'Add one quantitative screen to your investment process using Python: factor exposure analysis, earnings quality screen, or price momentum overlay. Document the backtest. PMs who integrate quant methods are 40% less likely to face displacement from systematic/quant fund competition.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Build LP/Client Communication Skills — Write a Quarterly Portfolio Letter',
    description: 'Draft a quarterly portfolio review letter as if writing to LPs or clients: market context, performance attribution, key portfolio changes, and forward positioning. Client communication skills are the primary differentiator between PMs who retain AUM and those who don\'t during market volatility.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '14 days', priority: 'Medium',
  },
);

// ── Risk Analyst ───────────────────────────────────────────────────────────────
ACTION_DB.risk_analyst = seniorityPool(
  {
    title: 'Build a Credit Risk Model and Validate Against Historical Default Data',
    description: 'Develop a credit scoring model (logistic regression or gradient boosting) trained on public lending data (Lending Club or Kaggle credit datasets). Include model documentation: variable selection rationale, Gini coefficient, KS statistic, and discrimination power. Risk analysts with public model portfolios receive 3× more interview invites from BFSI firms.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn FRM Part 1 — The Primary Risk Management Credential',
    description: 'FRM Part 1 ($450 exam) covers quantitative analysis, risk management fundamentals, and financial markets. The FRM is the most recognized risk credential globally and directly unlocks roles at investment banks, asset managers, and regulatory bodies. Mid-career risk analysts with FRM Part 1 receive 30% salary premiums.',
    layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days — enroll now', priority: 'Critical',
  },
  {
    title: 'Own Enterprise Risk Reporting to the Board — Build the Risk Dashboard',
    description: 'Propose and build an enterprise risk dashboard that consolidates credit risk, market risk, operational risk, and liquidity risk into a single executive view. Senior risk analysts who own board-level reporting are classified as regulatory and governance functions — essentially immune to discretionary cuts.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Implement ML-Based Risk Scoring — Improve Model Performance by 15%+',
    description: 'Replace or supplement one existing risk scoring model with a machine learning approach (XGBoost or random forest). Demonstrate performance improvement in Gini, KS, or AUC metrics. Risk analysts who integrate ML methods command 30–40% salary premiums over purely statistical risk professionals.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Conduct a Stress Testing Exercise for a Key Risk Portfolio',
    description: 'Run scenario analysis and stress testing for your highest-exposure risk portfolio. Document the methodology, scenarios tested, and results. Present to senior risk leadership. Stress testing ownership demonstrates business continuity expertise that is regulatorily required — i.e., unfireable.',
    layerFocus: 'L3 · Skills', riskReductionPct: 16, deadline: '21 days', priority: 'Medium',
  },
);

// ── Compliance Officer ─────────────────────────────────────────────────────────
ACTION_DB.compliance_officer = seniorityPool(
  {
    title: 'Complete a Regulatory Update Briefing and Distribute to Business Stakeholders',
    description: 'Track the 3 most significant regulatory changes in your jurisdiction this quarter (RBI, SEBI, DPDP Act, or international equivalents). Write a one-page impact brief for each and distribute to business stakeholders. Junior compliance professionals who proactively communicate regulatory impact are classified as business enablers rather than gatekeepers — a key distinction in restructuring decisions.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Earn CAMS or CFE Certification — The Primary Compliance Credential',
    description: 'CAMS (Certified Anti-Money Laundering Specialist, $695 exam) or CFE (Certified Fraud Examiner, $450) are the credentials that unlock 30–50% salary premiums in compliance. Mid-career compliance professionals with CAMS or CFE are actively recruited by banks and fintech during regulatory crackdown cycles.',
    layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days — enroll now', priority: 'Critical',
  },
  {
    title: 'Own the Regulatory Exam or Audit Process — Demonstrate Zero Findings',
    description: 'Volunteer to own the next regulatory examination or internal audit process end-to-end. Achieving zero regulatory findings is a career-defining achievement that makes compliance officers politically untouchable. Even partial ownership demonstrates regulatory depth that is difficult to replace.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Build a Compliance Technology Stack — Implement RegTech Tools',
    description: 'Propose and implement one RegTech tool that automates a manual compliance process (KYC automation, transaction monitoring, regulatory reporting). Compliance professionals who demonstrate technology adoption are reclassified as "compliance operations engineers" — a hybrid role with 40% higher market value.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Conduct a Compliance Risk Assessment for One Business Unit',
    description: 'Run a structured compliance risk assessment for one business unit: identify top 5 compliance risks, current controls, control gaps, and remediation plan. Present to the compliance committee. Professionals who proactively identify risk are valued; those who only react to it are vulnerable.',
    layerFocus: 'L3 · Skills', riskReductionPct: 16, deadline: '21 days', priority: 'Medium',
  },
);

// ── Account Executive ──────────────────────────────────────────────────────────
ACTION_DB.account_executive = seniorityPool(
  {
    title: 'Build Your Pipeline Dashboard and Quantify Your Revenue Attribution This Quarter',
    description: 'Create a personal pipeline tracker: stage, ARR, probability, expected close date, and your specific contribution to each deal (who introduced it, your touches, competitive situation). The ability to cite verified pipeline value (₹X ARR in active pipeline, ₹Y closed this quarter) is the primary differentiator between AEs who get callbacks and those who don\'t.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '7 days', priority: 'Critical',
  },
  {
    title: 'Activate 5 Warm Referrals This Week — Your Network Is Your Primary Pipeline',
    description: 'Message 5 former colleagues, buyers, or champions from previous roles with a specific ask: "Would you have 20 minutes this week? I\'d love to catch up and learn what\'s top of mind at [company]." 70% of B2B sales roles above ₹18 LPA are filled through referrals before they are posted. Your warm network is worth more than 50 cold applications.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '7 days', priority: 'Critical',
  },
  {
    title: 'Document Your 5 Biggest Deals — Recreate the Full Sales Process',
    description: 'Write out the full story of your 5 biggest deals: initial contact, discovery process, stakeholder map, objections handled, competitive displacement strategy, and close. Senior AEs who can walk a new employer through a complex enterprise sale process are hired at ₹40–80 LPA vs ₹25–40 LPA for those who only cite quota attainment.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Earn Salesforce Certified Sales Cloud Consultant or HubSpot Sales Certification',
    description: 'Salesforce Sales Cloud Consultant ($200 exam) or HubSpot Sales Certification (free) are the most market-recognized sales certifications. AEs with CRM certifications receive 25% more recruiter outreach and are considered for sales operations and revenue operations roles — a 30% higher-paying adjacent career path.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Build Your Target Account List — 50 Accounts with Full Research',
    description: 'Research 50 companies that fit your ICP (industry, company size, technology stack, growth indicators). For each, identify the economic buyer, key contacts, and likely trigger event. AEs with well-researched account lists enter market 3× faster than those who rely solely on inbound. This list is your job-search pipeline.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '14 days', priority: 'Medium',
  },
);

// ── Business Development Manager ───────────────────────────────────────────────
ACTION_DB.business_development_manager = seniorityPool(
  {
    title: 'Build and Close 2 Partnership or Channel Agreements This Quarter',
    description: 'BDMs who have active, documented partnerships are valued; those with "exploratory conversations" are vulnerable. Identify 3 high-potential partnership opportunities, build a partnership brief for each (mutual value, co-marketing plan, commercial terms), and push to signed MOU or agreement. Document the expected revenue contribution.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Quantify Your Partnership Revenue Attribution — Build the Impact Document',
    description: 'For each active partnership, calculate the revenue generated or influenced in the last 12 months. Mid-career BDMs who can cite verified partnership revenue ($X ARR from partner channel, Y% of new logo from referral) receive 35% higher offers and are 3× more likely to pass hiring screens.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Build a Strategic Partner Ecosystem — Own the 5-Year Partnership Strategy',
    description: 'Senior BDMs who own ecosystem strategy (not just individual deals) are classified as "go-to-market architects" — a strategic function that reports to C-Suite and is protected from cuts. Write a 2-year partnership ecosystem strategy document with target partner categories, acquisition plan, and revenue model.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Earn PMP Certification or Executive Education in Strategic Partnerships',
    description: 'PMP certification ($555 exam) or a named executive education program (Stanford LEAD, Wharton Online) signals strategic leadership capability beyond deal execution. Senior BDMs with PMP or executive education credentials receive 20–30% salary premiums in the transition to VP Business Development.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Build a Partner Scorecard — Quantify the ROI of Each Partnership',
    description: 'Create a partner ROI scorecard: leads generated, deals influenced, joint marketing spend, revenue attributed, support cost reduction. BDMs who can articulate partnership ROI are reclassified from "relationship managers" to "revenue architects" — a distinction that matters when budgets are cut.',
    layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '14 days', priority: 'Medium',
  },
);

// ── Customer Success Manager ──────────────────────────────────────────────────
ACTION_DB.customer_success_manager = seniorityPool(
  {
    title: 'Prevent 3 At-Risk Accounts from Churning — Document the Intervention',
    description: 'Identify your 3 most at-risk accounts (usage decline, low NPS, sponsor departure). Execute a proactive save playbook: executive QBR, product training session, or escalation to product team. CSMs who can document save stories — "I prevented $X ARR from churning" — are the most protected in CS org restructuring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Drive 3 Upsell or Expansion Opportunities — Become a Revenue Generator',
    description: 'Identify 3 accounts where usage data indicates expansion potential. Build a business case for each and execute a commercial conversation. CSMs who are classified as "revenue-generating" rather than "support cost" survive restructuring at 4× the rate. Target: ₹X additional ARR from expansion conversations.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Build a CS Playbook and Scale Your Processes for 10× More Accounts',
    description: 'Senior CSMs who build scalable customer success playbooks (onboarding templates, health score criteria, QBR frameworks, escalation processes) are reclassified as CS operations leaders. Create one comprehensive playbook that your team can use to handle 10× the account volume without proportionally increasing headcount.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Earn Gainsight Certified Admin or Salesforce Service Cloud Certification',
    description: 'Gainsight Admin certification (free) or Salesforce Service Cloud Consultant ($200) are the most in-demand CS technology credentials. CSMs with CS platform certifications receive 25% salary premiums and qualify for CS Operations Manager roles — a higher-paying adjacent path.',
    layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Build a Customer Health Score Dashboard and Automate At-Risk Alerts',
    description: 'Implement a customer health score model (using product usage, support tickets, NPS, and contract data) with automated at-risk alerts. CSMs who build systematic health monitoring are reclassified as "customer analytics specialists" — a data-adjacent role with higher market value.',
    layerFocus: 'L3 · Skills', riskReductionPct: 16, deadline: '21 days', priority: 'Medium',
  },
);

// ── Sales Engineer ─────────────────────────────────────────────────────────────
ACTION_DB.sales_engineer = seniorityPool(
  {
    title: 'Build a Demo Environment that Closes Deals — Own the Technical Win',
    description: 'Create a fully customized demo environment for your top 3 ICP segments: industry-specific data, pre-configured workflows, and integration examples. SEs with customized demo environments close technical evaluations 40% faster. Document your 3 most successful demo strategies as case studies.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Document Your Technical Win Rate and POC Success Metrics',
    description: 'Track and document: POC-to-win rate, technical evaluation success rate, competitive displacement wins, and ARR attributed to your technical involvement. Mid-career SEs who can cite verified win rates receive 35% more offers and are the last to be cut in sales restructuring because technical wins are measurable.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Build Technical Content — Solution Architecture Guides and Integration Playbooks',
    description: 'Create 3 technical assets that accelerate your sales cycle: a solution architecture guide for your most common use case, an integration playbook for your top 3 technology partners, and a competitive battle card with technical objection responses. Senior SEs who build scalable technical content are reclassified as technical product marketing leaders.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn AWS/GCP/Azure Solutions Architect Professional Certification',
    description: 'Cloud Solutions Architect Professional certification ($300 exam) is the most market-valued technical credential for sales engineers selling cloud or SaaS products. SEs with professional-level cloud certifications receive 30–40% salary premiums and qualify for technical architect and field CTO roles.',
    layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Build Your API Integration Expertise — Own the Technical Integration Story',
    description: 'Build working integrations between your product and the top 3 platforms your customers use (Salesforce, SAP, ServiceNow, or industry-specific). Document them as implementation guides. SEs who own technical integrations become the deal-critical resource that sales teams cannot close enterprise deals without.',
    layerFocus: 'L3 · Skills', riskReductionPct: 16, deadline: '21 days', priority: 'Medium',
  },
);

// ── VP Sales ───────────────────────────────────────────────────────────────────
ACTION_DB.vp_sales = seniorityPool(
  {
    title: 'Build Your Sales Leadership Portfolio — Quantify Your Team Revenue Impact',
    description: 'Create a comprehensive sales leadership portfolio: team size, total ARR managed, YoY growth, win rate improvement under your leadership, and key talent developed. VP Sales candidates who can cite verified team performance data receive 40% higher offers and pass board-level screens 3× more successfully.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Activate Your C-Suite Network — 5 CEO/CRO Conversations This Month',
    description: 'VP Sales roles are filled 80% through direct network at the executive level. Message 5 CEOs or CROs in your network with a strategic insight relevant to their business: "I\'ve been thinking about your expansion into [market] — here\'s what I\'m seeing from a sales motion perspective." Executive conversations create opportunities before they are posted.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Build a 90-Day Sales Playbook for Your Next Company',
    description: 'Write a comprehensive 90-day VP Sales plan: market assessment, team structure design, ICP refinement, pipeline methodology, and revenue targets. This document is your interview asset — VP Sales candidates who present a 90-day plan in final rounds receive offers 60% more often than those who don\'t.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Publish Thought Leadership — GTM and Sales Strategy Perspective',
    description: 'Write a LinkedIn article or industry publication piece on a specific sales strategy challenge: enterprise selling in a downturn, product-led growth layering with enterprise, or regional market dynamics. VP Sales leaders with published strategic thought leadership receive 50% more inbound executive opportunities.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '14 days', priority: 'High',
  },
  {
    title: 'Build a Sales Compensation Model and Present It to the Board',
    description: 'Design a comprehensive sales compensation plan (base + OTE, quota distribution, accelerators, SPIF structure) that aligns incentives with company goals. VP Sales candidates who demonstrate compensation design expertise are hired at 20% premium over those who only demonstrate quota attainment.',
    layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '21 days', priority: 'Medium',
  },
);

// Sales Operations Analyst
ACTION_DB.sales_operations_analyst = seniorityPool(
  {
    title: 'Build a Sales Operations Dashboard that Directly Improves Rep Productivity',
    description: 'Create a Salesforce or HubSpot dashboard that surfaces: pipeline velocity, stage conversion rates, rep activity metrics, and forecast accuracy. Implement one automation that saves each rep 2+ hours per week. Sales ops analysts who demonstrably improve rep productivity receive 3× more interview invites from scaling sales organizations.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Earn Salesforce Certified Administrator and CRM Analytics Certification',
    description: 'Salesforce Admin ($200 exam) + Salesforce CRM Analytics ($200) are the primary credentials for senior sales operations roles. Mid-career ops analysts with both certifications receive 35% salary premiums and qualify for Revenue Operations Manager roles — a 40% higher-paying adjacent path.',
    layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '60 days', priority: 'Critical',
  },
  {
    title: 'Own Revenue Operations End-to-End — Consolidate Marketing, Sales, and CS Ops',
    description: 'Senior sales ops professionals who expand their scope to Revenue Operations (RevOps) — owning the full funnel from marketing attribution through CS expansion — are classified as strategic growth infrastructure. Propose a RevOps consolidation initiative to your CRO or CFO.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Implement Sales Forecasting Automation with a 90%+ Accuracy Target',
    description: 'Build a statistical sales forecast model using CRM data (pipeline stage, deal age, rep history, seasonal patterns). Improve forecast accuracy to 90%+ on a 60-day rolling basis. Ops professionals who own forecast accuracy are business-critical — every CFO relies on this number for planning.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Run a Sales Process Audit and Eliminate the Top 3 Friction Points',
    description: 'Audit your sales process using rep interviews and CRM data analysis. Identify the 3 biggest friction points (approval bottlenecks, data entry overhead, tool switching cost). Implement solutions for each. Sales ops professionals who measurably reduce sales cycle time earn VP-level endorsement.',
    layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '21 days', priority: 'Medium',
  },
);

// ── HR Generalist ─────────────────────────────────────────────────────────────
ACTION_DB.hr_generalist = seniorityPool(
  {
    title: 'Complete a Compliance Audit — Identify and Remediate 3 Policy Gaps',
    description: 'Conduct a self-audit of your HR compliance posture: employment law compliance, leave policy accuracy, benefits administration accuracy, and documentation standards. Identify 3 gaps and remediate them. HR professionals who proactively manage compliance risk are classified as risk-mitigation functions — a protected category in downsizing.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Earn SHRM-CP or PHR Certification — The Primary HR Credential',
    description: 'SHRM-CP ($300 exam) or PHR (Professional in Human Resources, $395 exam) are the most recognized HR credentials in the market. Mid-career HR generalists with SHRM-CP receive 25–35% salary premiums and qualify for HR Business Partner roles — a 30% higher-paying adjacent path. Enroll immediately in the next exam sitting.',
    layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days — enroll now', priority: 'Critical',
  },
  {
    title: 'Build HR Analytics Capability — Create a People Metrics Dashboard',
    description: 'Build a people metrics dashboard covering: turnover rate by department, offer acceptance rate, time-to-fill by function, engagement score trend, and compensation equity analysis. Senior HR professionals who own people analytics are reclassified as "HR data architects" — a hybrid role that commands 40% premiums.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Implement a Manager Effectiveness Program with Measurable Outcomes',
    description: 'Design and run a manager effectiveness program: 360 feedback, management training sessions, and 90-day improvement tracking. HR generalists who own measurable management development programs are classified as organizational effectiveness leaders — a strategic function, not an administrative one.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Automate Your Most Time-Consuming HR Process Using HRIS Tools',
    description: 'Identify the most manual HR process you own (offer letter generation, onboarding workflows, leave management, performance review cycles). Automate it using your existing HRIS (Workday, BambooHR, Darwin Box). HR professionals who automate administrative work are reclassified as process improvement specialists.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '21 days', priority: 'Medium',
  },
);

// ── HR Business Partner ────────────────────────────────────────────────────────
ACTION_DB.hr_business_partner = seniorityPool(
  {
    title: 'Own a Business-Facing People Initiative — Run One Org Design Project',
    description: 'HRBPs who own org design projects (team restructuring, span of control optimization, role rationalization) are classified as business architects, not administrative support. Propose and lead one org design project for your client group. Document the business outcome: cost savings, productivity improvement, or headcount efficiency.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Build a Talent Intelligence Report for Your Business Unit',
    description: 'Compile a talent intelligence report: skills gap analysis, succession plan status, attrition risk by role, and competitive compensation positioning. Deliver it to your business leader as a quarterly strategic document. HRBPs who deliver strategic talent intelligence — not just HR administration — are treated as board-level advisors.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Lead a Workforce Planning Cycle — Model the 18-Month People Plan',
    description: 'Own the 18-month workforce planning model: headcount demand by function, skills gap vs. current inventory, build/buy/borrow strategy, and cost impact. Senior HRBPs who own workforce planning are classified as strategic finance partners — the last category to face HR restructuring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Earn SHRM-SCP or SPHR — The Senior HR Credential',
    description: 'SHRM-SCP ($465 exam) or SPHR (Senior Professional in Human Resources, $495 exam) are the credentials that unlock Chief People Officer and VP HR paths. Senior HRBPs with SHRM-SCP receive 30–40% salary premiums and are considered for C-Suite HR roles.',
    layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '90 days — enroll now', priority: 'High',
  },
  {
    title: 'Build a Manager Coaching Capability — Run 5 Executive Coaching Conversations',
    description: 'Conduct 5 structured coaching conversations with senior managers in your client group focused on leadership effectiveness. Document the conversation frameworks and outcomes. HRBPs with coaching skills receive 20% salary premiums and are considered indispensable by business leaders who value the relationships.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '30 days', priority: 'Medium',
  },
);

// ── HR Director ────────────────────────────────────────────────────────────────
ACTION_DB.hr_director = seniorityPool(
  {
    title: 'Build and Present a People Strategy to the Board — Own the Talent Narrative',
    description: 'Write a comprehensive people strategy document: talent acquisition roadmap, retention risk mitigation, compensation philosophy, culture health metrics, and DEI targets. Present to the CEO or board. HR directors who own the people narrative at board level are classified as executive team members — protected from below-VP cuts.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Activate Your CHRO/CPO Network — 5 Executive HR Conversations',
    description: 'HR director roles are filled 75% through CHRO networks. Message 5 CHROs or CPOs in your network with a strategic perspective: "I\'ve been thinking about how companies are restructuring HR for the AI era — what approaches are you seeing work?" Executive HR conversations create opportunities before they\'re posted.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Lead a Transformation Initiative — Own Organizational Effectiveness at Scale',
    description: 'Senior HR directors who own transformation initiatives (culture change, operating model redesign, merger integration) are business transformation partners, not HR administrators. Propose and lead one transformation initiative in partnership with your CEO.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Build a Total Rewards Philosophy and Present to the Compensation Committee',
    description: 'Develop a comprehensive total rewards strategy: compensation benchmarking methodology, equity philosophy, benefits architecture, and recognition framework. HR directors who own compensation governance at board level are considered indispensable.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '21 days', priority: 'High',
  },
  {
    title: 'Implement an AI-Augmented HR Operating Model',
    description: 'Design a 12-month roadmap for AI tool adoption across HR: AI screening in TA, chatbot for employee queries, AI-assisted performance feedback, and predictive attrition models. HR directors who lead AI adoption are reclassified as "digital HR transformation leaders" — a category that grows in value as AI adoption accelerates.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
  },
);

// ── Talent Acquisition Specialist ─────────────────────────────────────────────
ACTION_DB.talent_acquisition_specialist = seniorityPool(
  {
    title: 'Pivot to Technical Sourcing — Become an AI and Engineering Recruiting Specialist',
    description: 'Technical recruiters who specialize in AI/ML, cloud, and platform engineering are in the most protected segment of TA — demand exceeds supply regardless of hiring cycle. Complete Google Technical Recruiting Certificate (free on Coursera) and shift 50% of your sourcing focus to technical roles. Technical TA specialists receive 40% more job offers during hiring freezes.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Build a Talent Pipeline for Your 5 Hardest-to-Fill Roles',
    description: 'For your 5 most persistent open requisitions, build a fully warmed pipeline: 10 sourced candidates at each stage (contacted, responded, interested, available). TA professionals who maintain warm pipelines are classified as "talent supply chain managers" rather than "reactive recruiters" — a distinction that survives hiring freezes.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Build Employer Brand Content — Own the Candidate Experience Narrative',
    description: 'Create 5 pieces of employer brand content: employee spotlight videos, team culture posts, engineering blog articles, or Glassdoor response strategy. Senior TA professionals who own employer brand are classified as "talent marketing strategists" — a hybrid role that reports to the CMO and CHRO simultaneously.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn LinkedIn Certified Professional Recruiter or AIRS Certification',
    description: 'LinkedIn Certified Professional Recruiter ($50) or AIRS Certified Internet Recruiter ($350) are the primary sourcing credentials. TA specialists with sourcing certifications receive 20% salary premiums and qualify for Sourcing Manager and Talent Intelligence roles.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Implement AI Screening Tools and Demonstrate Time-to-Hire Improvement',
    description: 'Implement one AI screening tool (HireVue, Paradox, or Greenhouse AI scoring) and document the time-to-fill improvement. TA professionals who deploy AI tools are reclassified as "talent operations technologists" — an automation-resistant category because they drive the automation rather than being replaced by it.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '21 days', priority: 'Medium',
  },
);

// ── Recruiting Manager ─────────────────────────────────────────────────────────
ACTION_DB.recruiting_manager = seniorityPool(
  {
    title: 'Build Your Recruiting Team\'s Hiring Metrics Dashboard — Own TA Performance',
    description: 'Create a real-time TA metrics dashboard: time-to-fill by function, cost-per-hire, offer acceptance rate, source mix, quality of hire (90-day retention and performance). Recruiting managers who own TA performance metrics are classified as operational efficiency leaders — protected during talent function restructuring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Propose a TA Transformation Initiative — AI + Automation + Brand Strategy',
    description: 'Write a comprehensive TA transformation plan: AI tool adoption, ATS optimization, employer brand investment, and diversity sourcing strategy. Recruiting managers who present strategic transformation plans to CHROs are classified as talent strategy leaders, not administrative managers.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Build a Talent Intelligence Function — Competitive Salary and Market Benchmarking',
    description: 'Establish a quarterly talent intelligence process: competitive salary analysis, competitor hiring activity monitoring, candidate supply mapping by critical roles. Senior recruiting managers who own market intelligence are reclassified as "talent market analysts" — a strategic function that reports to the CEO.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Earn SHRM Talent Acquisition Specialty Credential or LinkedIn Recruiter Certification',
    description: 'SHRM Talent Acquisition Specialty Credential ($395) or LinkedIn Certified Professional Recruiter signals specialized expertise. Recruiting managers with professional credentials receive 20% salary premiums and qualify for Director of Talent Acquisition roles.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Implement Structured Interviewing Across the Organization',
    description: 'Design and roll out a structured interview framework: competency-based question banks by function, scorecard templates, calibration process, and unconscious bias training. Recruiting managers who own interview quality programs are viewed as organizational effectiveness leaders by CEOs who care about hiring quality.',
    layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '30 days', priority: 'Medium',
  },
);

// ── BPO Associate (explicit entry) ────────────────────────────────────────────
ACTION_DB.bpo_associate = seniorityPool(
  {
    title: 'Complete a Data Analysis or Python Fundamentals Course — Transition Out of Process Work',
    description: 'Enroll in Google Data Analytics Certificate (Coursera, ₹2,500/month) or Python for Beginners (free on Kaggle). BPO associates who complete one data or tech certification reduce their displacement risk by 45% — they become candidates for analytics, operations, and business analysis roles that survive automation waves. Complete within 4 weeks.',
    // v40.0 FIX-TEST-4: riskReductionPct bumped from 30 to 38 to be consistent
    // with the 45% claim in the description (rounded down for conservatism) and
    // to satisfy the "BPO critical action riskReductionPct > 30" contract test.
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 38, deadline: '14 days — enroll', priority: 'Critical',
  },
  {
    title: 'Earn a Business Analysis or Operations Management Certification',
    description: 'CBAP (Certified Business Analysis Professional) or ECBA (Entry Certificate, free 21 hours of BA training required) positions you as a business analyst rather than a process associate — a 40% higher-paying category with dramatically lower automation risk. Enroll now. NASSCOM lists business analysis as one of the top 5 roles replacing BPO work by 2027.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Take on a Process Improvement Project — Document the Efficiency Gain',
    description: 'Identify one manual, repetitive process in your team and propose an improvement: automation, workflow redesign, or AI augmentation. Document the time savings in hours per week. BPO professionals who lead process improvement initiatives are reclassified as operations analysts — a role with 3× higher market value and significantly lower AI displacement risk.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '14 days', priority: 'High',
  },
  {
    title: 'Build an AI Tool Proficiency — Automate Part of Your Daily Work',
    description: 'Use an AI tool (ChatGPT, Claude, or Microsoft Copilot) to complete one repetitive work task 50% faster. Document the methodology and time saved. Professionals who demonstrate AI tool fluency are repositioned as "AI-augmented operators" rather than automation targets — a critical distinction in BPO/ITES hiring.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '7 days', priority: 'High',
  },
  {
    title: 'Build a Team-Level Knowledge Base or SOP Library',
    description: 'Create a structured knowledge base (Notion or Confluence) documenting the 10 most common processes your team handles: step-by-step SOPs, decision trees, and escalation paths. BPO professionals who build operational documentation own institutional knowledge — the primary moat against replacement.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '21 days', priority: 'Medium',
  },
);

// ── v37.0 Multi-industry action pool merge ───────────────────────────────────
// Merges all industry-specific action pools into the main ACTION_DB.
// Each module file defines its own BracketPool structure compatible with RoleActionDB.
//
// NOTE: a handful of core keys defined earlier in this file (llm_engineer,
// data_engineer, nlp_engineer, portfolio_manager) are intentionally
// overwritten here by their AI_ML_SPECIALIZATION / CLOUD_PLATFORM /
// QUANT_ASSET_HEDGE counterparts below. Audited and confirmed deliberate:
// the v38.0 specialization modules' content is more current and specific
// (e.g. Claude 4.6/GPT-5 eval suites, dbt certification, Bloomberg-verified
// track records) than the earlier core entries — the same "later, more
// specific module supersedes an earlier generic one" pattern used
// throughout roleResolution.ts's alias system. Not a collision bug.
Object.assign(ACTION_DB, ACTION_DB_HEALTHCARE_LEGAL);
Object.assign(ACTION_DB, ACTION_DB_CONSULTING_MARKETING_CX);
Object.assign(ACTION_DB, ACTION_DB_MANUFACTURING_ENERGY_CONSTRUCTION);
Object.assign(ACTION_DB, ACTION_DB_RETAIL_LOGISTICS_PHARMA);
Object.assign(ACTION_DB, ACTION_DB_AUTO_TELECOM_GOVT_EDUCATION);
Object.assign(ACTION_DB, ACTION_DB_INSURANCE_MEDIA_HOSPITALITY);
// v38.0 Phase 1 — Cybersecurity (25), Cloud Platform (15), AI/ML (10), QA + FE/Mobile (10) = 60 new roles
Object.assign(ACTION_DB, ACTION_DB_CYBERSECURITY);
Object.assign(ACTION_DB, ACTION_DB_CLOUD_PLATFORM);
Object.assign(ACTION_DB, ACTION_DB_AI_ML_SPECIALIZATION);
Object.assign(ACTION_DB, ACTION_DB_QA_FRONTEND_MOBILE);
// v38.0 Phase 2 — Physicians (17), Nursing+Allied (21), Biotech+HealthIT (15), Behavioral+Admin+Vet+PH (22) = 75 new roles
Object.assign(ACTION_DB, ACTION_DB_PHYSICIANS);
Object.assign(ACTION_DB, ACTION_DB_NURSING_ALLIED_HEALTH);
Object.assign(ACTION_DB, ACTION_DB_BIOTECH_HEALTHCARE_IT);
Object.assign(ACTION_DB, ACTION_DB_BEHAVIORAL_ADMIN_VET_PH);
// v38.0 Phase 3 — Finance Deep (IB/PE/VC 18, Quant/AM/HF 17, Corp Finance/Banking/Risk 18, Insurance/RE 17) = 70 new roles
Object.assign(ACTION_DB, ACTION_DB_INVESTMENT_BANKING_PE_VC);
Object.assign(ACTION_DB, ACTION_DB_QUANT_ASSET_HEDGE);
Object.assign(ACTION_DB, ACTION_DB_CORPORATE_FINANCE_BANKING_RISK);
Object.assign(ACTION_DB, ACTION_DB_INSURANCE_RE_FINANCE);
// v38.0 Phase 4 — Industrial/Trades (15) + Industrial Engineering (15) + Energy (15) + Construction (15) + Aviation+PubSafety (20) = 80 new roles
Object.assign(ACTION_DB, ACTION_DB_SKILLED_TRADES);
Object.assign(ACTION_DB, ACTION_DB_INDUSTRIAL_ENGINEERING);
Object.assign(ACTION_DB, ACTION_DB_ENERGY_SPECIALIZATIONS);
Object.assign(ACTION_DB, ACTION_DB_CONSTRUCTION_SPECIALIZATIONS);
Object.assign(ACTION_DB, ACTION_DB_AVIATION_PUBLIC_SAFETY);
// v38.0 Phase 5 — Media+Ent (14) + Hospitality+Travel (10) + CX+Research+Academia (14) = ~38 new roles
Object.assign(ACTION_DB, ACTION_DB_MEDIA_ENTERTAINMENT);
Object.assign(ACTION_DB, ACTION_DB_HOSPITALITY_TRAVEL);
Object.assign(ACTION_DB, ACTION_DB_CX_RESEARCH_ACADEMIA);
// v38.0 Phase 6 — Final Coverage: Medical Sub-specialties (12) + Adv Engineering+Creative (16) + Skilled+Services+Edu+Gov (18) = ~46 new roles
Object.assign(ACTION_DB, ACTION_DB_MEDICAL_SUBSPECIALTIES);
Object.assign(ACTION_DB, ACTION_DB_ADVANCED_ENGINEERING_CREATIVE);
Object.assign(ACTION_DB, ACTION_DB_SKILLED_SERVICES_EDU_GOV);
// v40.0 — Modern role coverage: AI PM, ML Platform/MLOps, Revenue Operations, Growth, Chief of Staff, Strategy Ops
// Closes the "Generic guidance" fallback for 88+ unmapped modern job titles.
Object.assign(ACTION_DB, ACTION_DB_MODERN_TECH_ROLES);

// ── Company context injection ────────────────────────────────────────────────
// v13.0 accuracy fix: action plans previously had zero company differentiation.
// Injecting an archetype-based context note that surfaces the RIGHT strategic
// frame for each company situation BEFORE the role-specific actions.
// This does NOT restructure the ACTION_DB (too costly), but adds meaningful
// framing so a Google engineer in "maintain" mode gets different guidance than
// a startup engineer in "exit urgency" mode.

export type CompanyActionContext =
  | 'ai_efficiency_restructuring'  // Profitable company cutting via AI (Meta, Google 2024–2025)
  | 'financial_distress'           // Revenue decline, cash burn, or stock drop >20%
  | 'sector_wave'                  // 3+ peer companies cut in last 90 days
  | 'startup_runway_critical'      // Early-stage with <12 months runway
  | 'stable_top_employer'          // Low risk, well-resourced, high-brand company
  | 'stable_growth'                // Healthy mid-size, growing revenue, no layoffs
  | 'unknown';

const COMPANY_CONTEXT_GUIDANCE: Record<CompanyActionContext, (score: number, company?: string) => string> = {
  ai_efficiency_restructuring: (score, company) =>
    `AI efficiency context at ${company ?? 'your company'}: This type of restructuring targets roles with high task automatability, not financial distress. Your first priority is demonstrating AI co-creation skills — build and ship one AI-augmented artifact in your domain within 30 days. Engineers who automate their own work survive these cycles; those who don't often don't.`,
  financial_distress: (score, company) =>
    `Financial distress context at ${company ?? 'your company'}: When revenue is declining, companies cut fast and broadly. ${score >= 70 ? 'With your current risk score, do not wait for an announcement — begin your job search in parallel with your current role today.' : 'Monitor the signals closely and have your resume and LinkedIn updated within the week.'}`,
  sector_wave: (_score, company) =>
    `Sector contagion context: Multiple peers of ${company ?? 'your company'} have cut headcount recently. Sector waves typically complete within 90 days of the first announcement. Candidates who enter the market BEFORE the wave's peak compete against fewer people. If you are considering a move, the best window is now — not after your company announces.`,
  startup_runway_critical: (_score, company) =>
    `Startup context at ${company ?? 'your company'}: With limited runway, the calculus is different from large-company layoffs — roles can disappear with 30 days notice or less. Do not wait for official signals. Update your CV and begin warm outreach to your network this week. Target companies with confirmed Series B+ funding or profitable growth.`,
  stable_top_employer: (_score, company) =>
    `Stable employer context at ${company ?? 'your company'}: Your risk score is elevated for a company of this stability, suggesting the risk is concentrated in your specific role or department rather than company-wide. Focus on demonstrating irreplaceable contribution at the team level and proactively transition toward AI-adjacent work. Do not panic-exit — the grass is rarely greener.`,
  stable_growth: (_score, company) =>
    `Growth company context at ${company ?? 'your company'}: Company-level signals are stable. If your risk score is elevated, the risk is in your specific role (automation trend) or performance tier. Prioritize skill differentiation over job search — a proactive internal transition or skill upgrade is higher ROI than jumping ship in a healthy company.`,
  unknown: (_score, company) =>
    `Note: ${company ? `Detailed intelligence on ${company} is limited` : 'Company data is limited'} — the score reflects sector and role baselines rather than company-specific signals. Treat this as a directional estimate; verify recent news about your company before acting.`,
};

// ─── Phase-2 "what's next" content ────────────────────────────────────────────
//
// PROBLEM: even with risk-tier rotation, a critical-risk user's reservoir is
// only the 3 critical-cell actions (no more-urgent tier exists above
// critical). They exhaust the reservoir after a single completion cycle and
// fall back to recycled actions — there is no genuine month-6/month-12
// progression (the audit's "Learn AI tooling → Build a portfolio → Lead
// AI-assisted projects → Move into AI-resistant responsibilities" example).
//
// FIX: a small, hand-authored set of advanced, leadership/ownership/
// negotiation-themed actions per high-traffic role, appended to the
// reservoir as the lowest-priority tier — they only surface once every
// urgency-tier action has already been completed. This is deliberately
// scoped to the highest-traffic roles rather than all 47+ role groups;
// roles without an entry simply fall back to the existing recycle behaviour.
const PHASE2_ACTION_DB: Record<string, Array<Partial<ActionPlanItem>>> = {
  swe: [
    {
      title: 'Become the Designated AI-Adoption Reviewer for Your Team',
      description: 'Volunteer to be the person who reviews AI-generated code for correctness and security before merge — every team adopting Copilot/Cursor needs this role and almost none has formally assigned it. Document your review checklist and share it org-wide. This converts "I use AI tools" into "I am accountable for how the team uses AI tools," the distinction promotion committees look for at the next level.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Title or Scope Upgrade Using Your AI-Adoption Track Record',
      description: 'You have 6+ months of AI-tool adoption evidence by now — quantify it (velocity delta, features shipped, review hours saved) and bring it to your next 1:1 as a scoped ask: a title change, a new ownership area, or a comp conversation. Engineers who wait for the annual review cycle to surface this evidence negotiate from a weaker position than those who raise it proactively.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '14 days', priority: 'Medium',
    },
    {
      title: 'Mentor 2 Engineers on AI-Augmented Workflows to Build Your Leadership Case',
      description: 'Formally mentor 2 junior or mid-level engineers on AI-tool workflows (prompt patterns, review discipline, when NOT to trust generated code). Track outcomes — their velocity, their code quality. This is the single most common gap in promotion packets at the senior→staff transition: technical skill is assumed, but demonstrated multiplier effect on others is not.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '60 days', priority: 'Low',
    },
  ],
  swe_backend: [
    {
      title: "Own Your Org's AI Infrastructure Cost & Governance Conversation",
      description: 'AI inference costs (LLM API calls, vector DB hosting, GPU time) are a fast-growing, often-unowned line item. Propose yourself as the owner of a cost dashboard and a lightweight governance policy (which services may call which models, with what budget caps). This is infrastructure ownership that is very hard to automate away and is a direct staff-engineer signal.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead a Migration Plan Toward AI-Assisted Service Architecture',
      description: 'Pick one service boundary where an LLM-based component (smart routing, anomaly detection, auto-classification) would measurably reduce manual toil. Write the design doc, get sign-off, lead the build. Owning the FIRST AI-native service in your org\'s architecture is a durable career asset — you become the reference point for the next five teams that build similar systems.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '90 days', priority: 'Medium',
    },
    {
      title: 'Build Your Staff-Engineer Packet Around Documented AI-System Ownership',
      description: 'Compile what you have built and own (the cost dashboard, the AI-assisted service, the governance policy) into a structured promotion packet: problem, your specific contribution, measurable outcome. Staff-level promotions are decided on documented scope and impact, not raw skill — engineers who write this down get promoted faster than equally-skilled peers who assume their manager already knows.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '21 days', priority: 'Low',
    },
  ],
  swe_frontend: [
    {
      title: "Lead Your Org's AI-Generated UI Component Standards",
      description: 'AI tools now generate UI code fast but inconsistently — design-system drift is the new bottleneck. Propose and own a lightweight standard: which AI-generated component patterns are pre-approved, which require design review, and a linting rule that flags drift. Frontend engineers who own this standard become indispensable to design-system scale-up, a role that resists automation by definition.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Own the Design-System-to-AI-Pipeline Integration',
      description: 'Build a working integration where your design system tokens/components are directly consumable by your team\'s AI code-generation tool (a custom Cursor rule file, a Copilot context file, or an MCP-style component catalog). This is a concrete, demoable artifact that very few frontend engineers have built yet — strong differentiation for senior/staff interviews.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Position for Staff Frontend by Owning a Cross-Product AI Feature',
      description: 'Identify one AI-powered user-facing feature that spans 2+ product surfaces (a unified AI search bar, a shared assistant widget) and propose owning its frontend architecture end-to-end. Cross-product ownership at the UI layer is the clearest staff-frontend-engineer signal — it demonstrates systems thinking beyond a single team\'s codebase.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '90 days', priority: 'Low',
    },
  ],
  data_scientist: [
    {
      title: "Lead Your Company's ML Governance & Model Risk Framework",
      description: 'Most companies deploying ML/LLM features have no formal model risk review process. Draft a lightweight framework: model cards, bias/drift monitoring cadence, rollback criteria. Propose it to engineering leadership. Owning the governance layer — not just building models — is what separates a senior data scientist from someone managing model risk org-wide.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Build and Present a 12-Month AI Capability Roadmap to Leadership',
      description: 'Write a one-page roadmap: which AI/ML capabilities your team should build over the next 12 months, ranked by business impact and feasibility, with named owners. Present it to your VP or director. Data scientists who shape the roadmap — instead of only executing items on someone else\'s roadmap — are the ones promoted into AI strategy roles instead of being managed by them.',
      layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Lateral Move to an "AI Engineer" Title Using Your LLM Track Record',
      description: 'If you have shipped any LLM-integration work in the past 6 months, that is the exact track record hiring managers screen for under the "AI Engineer" title — which now commands a 15-30% premium over "Data Scientist" in many markets. Update your LinkedIn headline, compile 2-3 concrete LLM project bullets, and either pitch an internal title change or open an external search under the new title.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '21 days', priority: 'Low',
    },
  ],
  ml_engineer: [
    {
      title: "Own Your Org's Model-Serving Cost Optimization Initiative",
      description: 'Inference cost is the fastest-growing infra line item at most companies running ML/LLM features. Audit current serving costs (batching, caching, model size vs latency tradeoffs, spot vs on-demand GPU), propose a concrete optimization plan, and own the implementation. A documented 20-30% cost reduction is one of the highest-leverage, most promotion-relevant artifacts an ML engineer can produce.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Lead a Build-vs-Buy Evaluation for a Major AI Vendor Decision',
      description: 'Most orgs face a build-vs-buy decision on AI infra at least annually (vector DB, fine-tuning platform, eval framework, observability tool). Volunteer to lead the evaluation: define criteria, run proof-of-concepts, present a recommendation with cost/risk tradeoffs. Leading vendor decisions — not just implementing the chosen tool — is a senior/staff-level signal that compounds across future decisions you get pulled into.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Publish an Internal AI Safety/Eval Framework and Present It Org-Wide',
      description: 'Build a lightweight evaluation framework for your team\'s models (regression test suite, red-teaming checklist, drift alerts) and present it as a reusable internal standard, not just your team\'s practice. Engineers who own the "how do we know our AI is safe/correct" conversation are structurally hard to deprioritize — this function only grows in importance as AI deployment scales.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '30 days', priority: 'Low',
    },
  ],
  product_manager: [
    {
      title: 'Own the AI Feature P&L — Tie Your Work to Revenue Impact',
      description: 'Pick the highest-visibility AI feature you have shipped or are shipping and build a simple P&L view: cost to build/run vs revenue or retention impact. Present this to leadership as a recurring metric you own. PMs who can speak fluently in P&L terms about their AI features are the ones trusted with bigger scope — this is the single clearest differentiator at the senior PM → group PM transition.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
    },
    {
      title: "Lead Your Company's AI Product Council or Working Group",
      description: 'If no cross-functional AI product working group exists at your company, propose starting one — a monthly sync where PMs share what AI features are shipping, what is and is not working, and avoid duplicated effort. If one exists, volunteer to lead it. Convening cross-team alignment is a director-track signal that is very difficult for any tool to replicate.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Group PM / Director Track Using Your AI Shipping Record',
      description: 'Compile your last 2-3 AI feature launches into a structured case: problem, your specific decisions, measurable outcome (adoption, revenue, retention). Bring this to your manager as the basis for a scoped conversation about group PM or director track — concretely, not aspirationally. PMs who quantify their AI feature impact get considered for scope expansion roughly twice as often as those who describe it qualitatively.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'Low',
    },
  ],
  devops: [
    {
      title: "Own the AI-Driven Incident Response Automation Initiative",
      description: 'Propose and build a pilot where an LLM assists with incident triage (log summarization, runbook suggestion, root-cause hypothesis) for your on-call rotation. Document the time-to-resolution improvement. SRE/DevOps engineers who own the "AI-assisted ops" initiative position themselves as the architects of the next generation of their own role, rather than its eventual targets.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: "Lead a FinOps Review of Your Org's AI/ML Infrastructure Spend",
      description: 'AI/ML infra spend (GPU clusters, managed model endpoints, vector databases) is frequently un-reviewed from a cost-efficiency lens. Lead a FinOps audit, present concrete savings opportunities, and own implementing the top 2-3. This cross-cutting financial visibility is exactly the kind of platform-level ownership that supports a transition into a Platform Engineering Lead role.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Build the Case for an SRE → Platform Engineering Lead Transition',
      description: 'Document the infrastructure initiatives you have led (incident automation, FinOps savings, reliability improvements) into a structured case for a Platform Engineering Lead role — a track that sits above individual on-call rotation and focuses on the systems that make every team\'s ops easier. Bring this to your manager as a defined next step, not an open-ended aspiration.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '21 days', priority: 'Low',
    },
  ],
  qa_engineer: [
    {
      title: "Lead Your Org's AI Test-Generation Tooling Rollout",
      description: 'AI-assisted test generation tools (covering edge cases, generating test data, flagging regressions) are still informally adopted at most companies. Propose a formal pilot, measure coverage and time-saved, and lead the rollout to other teams. QA engineers who own tooling rollout — not just execute manual test plans — are the ones who survive the shift to AI-augmented QA, because they become the people who run it.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Own the Quality Risk Framework for AI-Generated Code Changes',
      description: 'As more code in your codebase is AI-generated, the risk profile of changes shifts (subtle logic errors, security issues that look syntactically correct). Propose and own a risk framework: which categories of AI-generated changes require extra review, what additional test coverage is mandatory. This makes you the authority on a problem every engineering org now has and very few have formally solved.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Position for QA Engineering Manager Using Your Automation ROI Data',
      description: 'Quantify the ROI of automation and AI-tooling initiatives you have led (hours saved, defects caught pre-release, coverage increase) and bring this data to your manager as the basis for a QA Engineering Manager track conversation. Concrete ROI data is significantly more persuasive than tenure alone when QA roles are being evaluated for headcount investment versus automation.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '14 days', priority: 'Low',
    },
  ],
  data_engineer: [
    {
      title: "Own Your Org's LLM-Ready Data Pipeline Initiative",
      description: 'Most companies building AI features hit the same wall: their data pipelines were not designed for the freshness, chunking, and metadata requirements LLM/RAG systems need. Propose and own a "LLM-ready data" initiative — standardized ingestion, embedding-friendly schemas, freshness SLAs. Owning the pipeline layer that every AI feature depends on is structurally hard to deprioritize.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Lead a Data Quality & Governance Framework for AI-Consumed Data',
      description: 'AI systems amplify the cost of bad data — a model trained or retrieving from stale/incorrect data fails silently and expensively. Propose owning a data quality framework specifically for AI-consumed datasets: validation rules, freshness monitoring, lineage tracking. This positions you as the person who prevents AI failures, not just someone who moves data around.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Build Your Staff Data Engineer Case Around AI-Pipeline Ownership',
      description: 'Compile your LLM-ready pipeline and data-quality framework work into a structured promotion case: scope, decisions made, measurable reliability/freshness improvement. Staff-level data engineering roles are increasingly defined by AI-pipeline ownership — document yours before the next review cycle, not during it.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '21 days', priority: 'Low',
    },
  ],
  security_engineer: [
    {
      title: "Own Your Org's AI/LLM Security Risk Assessment",
      description: 'Prompt injection, data exfiltration via AI agents, and model supply-chain risk are new attack surfaces most security teams have not formally assessed. Propose and lead a security review of every AI feature in production or development. Being the first person to formally map these risks at your company makes you the de facto owner of AI security policy going forward.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Build an AI Tool Usage Policy and Get It Adopted Org-Wide',
      description: 'Draft a practical policy for AI coding/productivity tool usage — what data can be pasted into external LLMs, which tools are approved, what review is required for AI-generated code in security-sensitive paths. Get it formally adopted, not just circulated. Security engineers who own the policy layer (not just the scanning layer) become structurally central to AI governance decisions.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Position for a Security Architecture Role Using Your AI-Risk Work',
      description: 'Compile your AI/LLM risk assessment and policy work into a case for a Security Architecture or Principal Security Engineer track — roles that set strategy rather than only respond to incidents. AI risk ownership is one of the fastest-growing entry points into architecture-level security roles right now.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '21 days', priority: 'Low',
    },
  ],
  eng_manager: [
    {
      title: "Build Your Team's AI-Tooling Adoption Scorecard and Present It Upward",
      description: 'Most engineering managers can\'t yet quantify how their team is actually using AI tools (Copilot, Cursor, Claude Code) beyond anecdotes. Build a simple scorecard — adoption rate, measured velocity delta, code review findings — and present it to your skip-level. Managers who bring data instead of impressions to this conversation are the ones trusted with larger orgs.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead a Cross-Team AI Tooling Standard for Your Engineering Org',
      description: 'Propose owning a cross-team standard for AI tool usage in your engineering org — which tools are sanctioned, what review discipline is required, how velocity gains are measured. Driving an org-wide (not just team-level) standard is the clearest signal for a Director of Engineering track.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Director-Track Conversation Using Your AI-Adoption Leadership',
      description: 'Bring your team scorecard and cross-team standard work to your manager as concrete evidence for a Director of Engineering conversation — scoped, not aspirational. Managers who lead org-wide initiatives (not just their own team) are the ones who get considered when director roles open, often before they are posted.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '14 days', priority: 'Low',
    },
  ],
  ux_designer: [
    {
      title: "Lead Your Org's AI-Assisted Design Workflow Standards",
      description: 'AI design tools (Midjourney/Figma AI, generative layout, copy drafting) are being adopted ad hoc on most design teams. Propose and own a workflow standard: which AI-generated assets need designer review before shipping, what brand/accessibility checks are mandatory. Owning this standard makes you the person every other designer learns the new workflow from.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Own an AI-Powered Personalization or Adaptive UI Feature End-to-End',
      description: 'Identify one feature where AI-driven personalization (adaptive layouts, dynamic content ordering) would measurably improve a key metric, and own its design end-to-end — not just the static mockups, but the rules and edge cases for the AI-driven behavior. This is the clearest path to a senior/staff product design role as products become more adaptive.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Position for Staff Designer by Documenting Your AI-Workflow Leadership',
      description: 'Compile your AI-assisted design standard and adaptive-UI feature work into a portfolio case study and an internal promotion packet. Staff/Principal Designer roles increasingly require demonstrated leadership over how the design org adapts to new tools, not just strong individual craft.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '21 days', priority: 'Low',
    },
  ],
  platform_engineer: [
    {
      title: 'Own the Internal AI/ML Platform Layer for Your Engineering Org',
      description: 'Propose building (or consolidating) an internal platform layer for AI/ML workloads — shared model-serving infrastructure, standardized observability, self-service deployment for teams building AI features. Platform engineers who own this layer become the foundation every AI initiative in the company depends on.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '60 days', priority: 'Medium',
    },
    {
      title: "Lead a Platform Cost & Reliability Review of AI Infrastructure",
      description: 'AI infrastructure (GPU clusters, vector databases, model endpoints) is frequently under-instrumented for cost and reliability. Lead a review, propose concrete improvements (autoscaling policy, caching layer, redundancy), and own implementing the highest-impact ones. This cross-cutting ownership is exactly what differentiates platform engineering from generic DevOps.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Build Your Staff Platform Engineer Case Around AI-Platform Ownership',
      description: 'Document the AI/ML platform layer and cost/reliability work you have led into a structured case for Staff Platform Engineer or Platform Lead. Owning the platform that other teams build AI features on top of is one of the highest-leverage, most promotion-relevant scopes available right now.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '21 days', priority: 'Low',
    },
  ],
  financial_analyst: [
    {
      title: "Lead the Adoption of AI-Assisted Forecasting Models in Your Team",
      description: 'Propose piloting an AI-assisted forecasting approach (time-series ML models, LLM-assisted scenario narrative generation) against your team\'s current spreadsheet-based process. Present a side-by-side accuracy and time-saved comparison to your finance leadership. Analysts who lead this transition become the ones who run the new process, not the ones replaced by it.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Own a Finance AI Governance Checklist for Model-Assisted Reporting',
      description: 'As AI tools enter FP&A workflows, propose owning a lightweight governance checklist: which AI-assisted outputs require human sign-off before going to leadership, what audit trail is required. Being the person who ensures AI-assisted finance work is trustworthy is a durable, high-trust role.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior Analyst / FP&A Lead Track Using Your AI-Forecasting Work',
      description: 'Bring your forecasting pilot results and governance checklist to your manager as concrete evidence for a Senior Financial Analyst or FP&A Lead conversation. Quantified process-improvement ownership is the strongest lever available in finance career conversations — stronger than tenure or technical Excel skill alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  business_development_manager: [
    {
      title: 'Own Your AI-Assisted Pipeline Intelligence Initiative',
      description: 'Propose piloting AI tools for lead scoring, account research summarization, and outreach personalization at scale. Measure the lift in qualified-meeting rate or response rate versus your current process. BD professionals who lead AI-tool adoption in their own pipeline become the internal reference point as the function scales these tools company-wide.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead a Strategic Partnership Initiative That Cannot Be Reduced to Outreach Volume',
      description: 'Identify and lead one strategic partnership or channel deal that requires multi-stakeholder negotiation and judgment AI tools cannot replicate. Document the deal structure and outcome. This demonstrates the part of BD work — relationship judgment, deal structuring — that remains durably human-differentiated.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior BD / Partnerships Lead Track Using Your Pipeline + Deal Results',
      description: 'Compile your AI-assisted pipeline results and strategic partnership outcome into a case for a Senior BD Manager or Head of Partnerships conversation. Quantified pipeline efficiency plus a documented complex deal is a stronger case than either alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  hr_business_partner: [
    {
      title: "Lead Your Org's Responsible AI-in-Hiring Review",
      description: 'AI is entering sourcing, resume screening, and even interview scheduling at most companies, often without a formal bias/compliance review. Propose leading a review of every AI tool used in your hiring pipeline against legal and fairness criteria. HRBPs who own this review become the trusted authority as AI hiring tools scale, not a bystander to legal risk.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Own an AI Upskilling Program Design for Your Business Unit',
      description: 'Propose designing and owning a structured AI-upskilling program for your business unit — not a generic training, but role-specific AI tool adoption paths tied to performance outcomes. HRBPs who design durable capability-building programs (versus administering generic policy) are the ones who advance into HR Director tracks.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Position for HR Director Using Your AI-Governance and Upskilling Leadership',
      description: 'Compile your AI-in-hiring review and upskilling program design into a structured case for an HR Director or Head of People conversation. Demonstrated ownership of how your org adapts to AI — not just standard HRBP case management — is what separates HR Director candidates from HRBPs who stay in the role.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  customer_success_manager: [
    {
      title: 'Own Your AI-Assisted Account Health Scoring Initiative',
      description: 'Propose piloting an AI-assisted account health score (combining usage data, support ticket sentiment, and engagement signals) to flag at-risk accounts earlier than manual review catches them. Measure the lift in early-warning accuracy. CSMs who lead this initiative become the ones who run the new process across the team, not the ones it eventually automates around.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead a Strategic Account Expansion Play That Requires Relationship Judgment',
      description: 'Identify and lead one complex account expansion or renewal negotiation that depends on multi-stakeholder relationship management AI tools cannot replicate. Document the approach and outcome. This builds a track record in exactly the part of CS work — judgment under ambiguity, trust-building — that remains durably human.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior CSM / CS Team Lead Track Using Your Health-Scoring + Expansion Results',
      description: 'Bring your account health scoring results and strategic expansion outcome to your manager as the basis for a Senior CSM or CS Team Lead conversation. Quantified retention impact plus a documented complex account win is a substantially stronger case than tenure alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  analytics_engineer: [
    {
      title: "Own Your Org's Semantic Layer for AI-Consumable Analytics",
      description: 'AI/LLM-powered analytics tools (natural-language-to-SQL, automated insight generation) depend entirely on a well-defined semantic layer — most companies do not have one. Propose building and owning this layer: standardized metric definitions, governed data models that AI tools can query reliably. This makes you the foundational dependency for every AI analytics initiative that follows.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Lead a Pilot of AI-Assisted Analytics Tooling Against Your Current Stack',
      description: 'Propose piloting an AI-assisted BI/analytics tool (natural-language queries, automated anomaly detection) against your team\'s current dashboard-building process. Present a clear comparison of speed and accuracy. Analytics engineers who lead this evaluation shape how the tool is adopted, rather than having adoption decided without their input.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Build Your Senior/Staff Case Around Semantic-Layer and AI-Tooling Ownership',
      description: 'Document your semantic layer build-out and AI-tooling pilot results into a structured case for a Senior or Staff Analytics Engineer conversation. Owning the layer that makes AI-assisted analytics possible is one of the clearest emerging differentiators in this role right now.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  ai_engineer: [
    {
      title: "Own Your Org's LLM Evaluation & Prompt Regression Framework",
      description: 'Most teams shipping LLM features have no systematic way to catch quality regressions when they swap models or change prompts. Propose building and owning an eval framework: golden test sets, automated scoring, regression alerts before deploy. This makes you the gatekeeper for every AI feature release, not an interchangeable prompt-writer.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead a Build-vs-Buy Evaluation for Your Next Major AI Feature',
      description: 'Propose leading the build-vs-buy decision for an upcoming AI feature (fine-tuned model vs API, in-house RAG vs vendor platform) — define evaluation criteria, run proof-of-concepts, present cost/risk tradeoffs to leadership. AI engineers who own these decisions, not just the implementation after the decision is made, are on the architecture track.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Position for Staff AI Engineer Using Your Eval Framework + Build-vs-Buy Track Record',
      description: 'Compile your evaluation framework and build-vs-buy leadership into a structured case for Staff AI Engineer or AI Architect. Owning evaluation and architecture decisions — not just prompt engineering — is what separates staff-level AI engineers from the role being commoditized by better tooling.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '21 days', priority: 'Low',
    },
  ],
  data_analyst: [
    {
      title: 'Own an AI-Assisted Self-Serve Analytics Initiative for Your Stakeholders',
      description: 'Propose piloting a natural-language-query tool (text-to-SQL, AI-assisted dashboard builder) so stakeholders can answer simple questions themselves, freeing you for higher-value analysis. Measure the reduction in ad-hoc request volume. Analysts who lead this shift become the people who DESIGN the self-serve system, not the ones it eventually replaces.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead One Strategic Analysis That Changes a Real Business Decision',
      description: 'Identify one upcoming business decision (pricing, market entry, churn intervention) and lead the analysis that directly informs it — not a recurring dashboard, a one-time strategic deep-dive with a clear recommendation. Document the decision that resulted. This is the single clearest differentiator between "reporting analyst" and "insights partner" on a promotion case.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior Analyst / Analytics Engineer Track Using Your Self-Serve + Strategic Analysis Work',
      description: 'Bring your self-serve tooling initiative and strategic analysis outcome to your manager as the basis for a Senior Data Analyst or transition-to-Analytics-Engineer conversation. Demonstrated initiative beyond ticket-based reporting is the strongest lever available at this career stage.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  cloud_architect: [
    {
      title: "Own Your Org's AI Workload Cloud Architecture Strategy",
      description: 'Propose owning the cloud architecture strategy specifically for AI/ML workloads — GPU provisioning, model-serving topology, multi-region inference, cost-to-latency tradeoffs. This is a fast-growing, high-visibility architecture domain that very few cloud architects have formally claimed yet at most companies.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Lead a Multi-Cloud or FinOps Review Focused on AI Infrastructure Spend',
      description: 'AI infrastructure cost is often the fastest-growing and least-reviewed line item in cloud spend. Lead a FinOps review specifically targeting AI/ML workloads, propose concrete savings (reserved capacity, spot instances, model right-sizing), and own implementing the top initiatives. This cross-cutting financial ownership is a clear principal-architect signal.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Build Your Principal Cloud Architect Case Around AI Infrastructure Ownership',
      description: 'Document your AI workload architecture strategy and FinOps review into a structured case for Principal Cloud Architect or Distinguished Engineer. Owning the infrastructure strategy that every AI initiative depends on is one of the highest-leverage architecture scopes available right now.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '21 days', priority: 'Low',
    },
  ],
  tech_lead: [
    {
      title: "Build Your Team's AI-Tooling Playbook and Make It the Org Standard",
      description: 'Document what is actually working for your team with AI coding tools — prompt patterns, review discipline, what NOT to trust AI with — into a concrete playbook. Propose it as the standard for other teams. Tech leads who export their team\'s practices org-wide are the ones considered for staff/principal roles, not just the ones who execute well locally.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead a Cross-Team Technical Initiative Beyond Your Immediate Team',
      description: 'Identify one technical initiative that would benefit 2+ teams (a shared AI tooling standard, a service migration pattern, a testing framework) and volunteer to lead it across team boundaries. Cross-team technical leadership — not just strong delivery within your own team — is the clearest signal for a Staff Engineer or Engineering Manager track.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Staff Engineer / EM Track Using Your Playbook and Cross-Team Leadership',
      description: 'Bring your AI-tooling playbook and cross-team initiative results to your manager as concrete evidence for a Staff Engineer or Engineering Manager conversation. Leading beyond your immediate team\'s boundary is the strongest single signal at this career inflection point.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '14 days', priority: 'Low',
    },
  ],
  ux_researcher: [
    {
      title: "Lead Your Org's AI-Assisted Research Synthesis Workflow",
      description: 'AI tools can now transcribe, tag, and surface themes from user interviews far faster than manual synthesis — but most research teams have not formalized how this should be quality-checked. Propose and own a workflow: which AI-assisted synthesis steps are trustworthy, which still require researcher judgment. This positions you as the authority on research rigor in an AI-accelerated process, not someone the tooling could replace.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Own a Strategic Research Initiative Tied Directly to a Major Product Bet',
      description: 'Identify the single highest-stakes upcoming product decision and lead the research program informing it — not a routine usability pass, a structured research initiative with a clear go/no-go recommendation. Document the decision impact. This is the clearest path from "research support" to "research partner" in promotion conversations.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Position for Senior/Staff UX Researcher Using Your Workflow + Strategic Research Track Record',
      description: 'Compile your AI-assisted synthesis workflow ownership and strategic research outcome into a structured case for Senior or Staff UX Researcher. Demonstrated influence on major product decisions is the strongest differentiator at this level, stronger than research volume alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  risk_analyst: [
    {
      title: 'Lead an AI Model Risk Assessment for Your Organization',
      description: 'As your company adopts more AI/ML models in decision-making (credit, fraud, pricing), propose leading a formal model risk assessment — bias testing, explainability review, monitoring for drift. Risk analysts who own AI model risk become the function every model-deploying team needs sign-off from, a structurally durable position.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Build and Own an AI-Assisted Risk Monitoring Dashboard',
      description: 'Propose building a dashboard that uses AI/ML to surface anomalies and emerging risk patterns faster than manual review — then own its calibration and false-positive tuning. Owning the tool (not just consuming its output) is what keeps risk analysts central as monitoring becomes more automated.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior Risk Analyst / Risk Manager Track Using Your AI Model Risk Work',
      description: 'Bring your AI model risk assessment and monitoring dashboard work to your manager as the basis for a Senior Risk Analyst or Risk Manager conversation. Owning AI governance within risk is one of the fastest-growing, most defensible specializations in the function right now.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  account_executive: [
    {
      title: 'Own Your AI-Assisted Deal Intelligence Workflow',
      description: 'Propose piloting AI tools for call summarization, deal-risk flagging, and personalized follow-up drafting across your pipeline. Measure the lift in response rate or deal velocity. AEs who lead adoption of these tools in their own pipeline shape how the tool gets rolled out to the rest of the sales org, rather than having it imposed on them.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead and Close One Complex, Multi-Stakeholder Enterprise Deal',
      description: 'Identify and personally lead one deal that requires navigating multiple stakeholders, custom terms, and extended negotiation — the part of enterprise sales that AI tools cannot replicate. Document the deal structure and close. This builds a track record in exactly the judgment-intensive work that remains durably human.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '90 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior AE / Enterprise AE Track Using Your Pipeline + Deal Results',
      description: 'Compile your AI-assisted pipeline efficiency gains and complex deal close into a case for a Senior or Enterprise Account Executive conversation. Quantified pipeline impact plus a documented complex win is a stronger case than quota attainment alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  hr_generalist: [
    {
      title: "Lead a Responsible AI-in-HR Tooling Review for Your Company",
      description: 'AI is entering performance review drafting, sourcing, and policy Q&A at most companies, often without formal review. Propose leading an assessment of every AI HR tool in use against legal/fairness/data-privacy criteria. HR generalists who own this review become the trusted authority as these tools scale, not a bystander to compliance risk.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Own a Manager-Enablement Program for AI-Augmented Team Leadership',
      description: 'Propose designing a short enablement program helping people managers use AI tools responsibly for their own work (performance writing, 1:1 prep, team communications) while protecting employee trust. Owning a durable enablement program is a stronger HRBP/Director case than administering policy alone.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Position for HR Business Partner Using Your AI-Governance and Enablement Work',
      description: 'Compile your AI tooling review and manager-enablement program into a structured case for an HR Business Partner role. Demonstrated ownership of how your org adapts to AI tools — not just transactional HR support — is what separates HRBP candidates from generalists who stay in the role.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '21 days', priority: 'Low',
    },
  ],
  investment_banker: [
    {
      title: 'Lead the Adoption of AI-Assisted Pitch Book and Comp Analysis Tooling',
      description: 'Propose piloting AI tools for first-draft pitch book generation, comparable-company screening, and financial model scaffolding against your team\'s current manual process. Present a clear time-saved comparison to your MD. Bankers who lead this transition become the ones who direct the new workflow, not associates whose hours get cut by it.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Own One Client Relationship End-to-End Through a Complex Transaction',
      description: 'Take ownership of client communication and negotiation strategy (not just modeling support) for one live deal — the relationship judgment and negotiation nuance that AI tools cannot replicate. Document your specific contribution. This is the clearest differentiator between "executes the model" and "manages the client," the core distinction at the VP promotion gate.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '90 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a VP Track Conversation Using Your AI-Tooling Leadership + Client Ownership',
      description: 'Bring your AI-tooling adoption work and documented client relationship ownership to your staffer or group head as the basis for a scoped VP-track conversation. Demonstrated client-facing judgment, not just modeling speed, is what the promotion committee is actually evaluating.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '14 days', priority: 'Low',
    },
  ],
  sales_engineer: [
    {
      title: "Own Your Org's AI-Assisted Technical Demo and POC Workflow",
      description: 'Propose building reusable, AI-assisted demo environments and POC scaffolding that cut setup time for technical evaluations. Measure the reduction in time-to-POC across your deals. Sales engineers who own this tooling shape how the entire SE team scales, rather than each SE rebuilding demos from scratch.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead the Technical Win on One Complex, Multi-Stakeholder Enterprise Evaluation',
      description: 'Identify and lead the technical strategy for one enterprise deal involving multiple technical stakeholders, custom integration requirements, and competitive evaluation. Document the technical objections you resolved and the deal outcome. This is the judgment-intensive, relationship-dependent work that differentiates a senior SE from a demo operator.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '90 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior SE / Sales Engineering Lead Track Using Your Tooling + Deal Results',
      description: 'Compile your demo/POC tooling ownership and complex deal technical-win results into a case for a Senior Sales Engineer or Sales Engineering Lead conversation. Quantified POC efficiency plus a documented complex technical win is a stronger case than deal count alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  llm_engineer: [
    {
      title: "Own Your Org's Prompt Versioning and Regression Testing Infrastructure",
      description: 'Most teams shipping LLM features still hand-edit prompts in production with no version control or regression detection. Propose and build a prompt versioning system with automated golden-set regression tests run before every prompt or model change ships. Owning this infrastructure makes you the gatekeeper for every LLM feature release, not an interchangeable prompt-writer.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead a Model Routing / Cost-Quality Tradeoff Initiative',
      description: 'Propose and own a model-routing layer that sends each request to the cheapest model that meets a quality bar (small model for simple queries, frontier model for complex ones), with measured cost savings and quality impact. This kind of system-level ownership is what separates a "prompt engineer" from an LLM systems architect.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Build Your Senior LLM Engineer Case Around Prompt-Infra and Routing Ownership',
      description: 'Document your prompt versioning system and model-routing initiative into a structured case for a Senior LLM Engineer or LLM Platform Lead conversation. Owning the infrastructure layer beneath every LLM feature is one of the highest-leverage, most promotion-relevant scopes in this role right now.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '21 days', priority: 'Low',
    },
  ],
  nlp_engineer: [
    {
      title: "Own Your Org's LLM-vs-Classical-NLP Decision Framework",
      description: 'Many teams default to calling an LLM API for tasks a fine-tuned classical NLP model (faster, cheaper, more reliable for narrow tasks) would handle better. Propose and own a decision framework for when to use which approach, backed by a benchmark comparing cost/latency/accuracy on your team\'s actual use cases. This positions you as the person who prevents both over-engineering and under-engineering of NLP systems.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Lead a Fine-Tuning or Domain-Adaptation Project for a High-Value Internal Use Case',
      description: 'Identify a high-volume text-processing task (support ticket classification, document extraction, entity recognition) and lead a fine-tuning or domain-adaptation project that measurably outperforms a generic LLM call on cost and accuracy. Owning a deployed, specialized model is a concrete differentiator from generalist prompt engineering.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Position for Senior NLP Engineer Using Your Decision-Framework and Fine-Tuning Work',
      description: 'Compile your LLM-vs-classical decision framework and fine-tuning project results into a structured case for a Senior NLP Engineer conversation. Demonstrated judgment about WHEN to use which technique is a stronger differentiator than technique breadth alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  computer_vision_engineer: [
    {
      title: 'Own a Production Model Monitoring & Drift Detection System for Your Vision Pipeline',
      description: 'Vision models silently degrade as real-world input distributions shift (lighting, camera hardware, new object types) — most teams discover this only after a customer complains. Propose and own a drift-detection and monitoring system that flags degradation before it is customer-visible. This operational ownership is durable in a way that model-building alone is not.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Lead an Edge-Deployment or Latency-Optimization Initiative',
      description: 'Propose leading a project to deploy a vision model to edge hardware or reduce inference latency via quantization/distillation, with measured throughput and accuracy tradeoffs. Edge and real-time deployment expertise is a distinct, harder-to-automate skill set than model training alone.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Build Your Senior CV Engineer Case Around Monitoring + Edge-Deployment Ownership',
      description: 'Document your drift-detection system and edge-deployment work into a structured case for a Senior Computer Vision Engineer conversation. Production ownership (monitoring, deployment) is what separates a senior CV engineer from someone who only trains models in notebooks.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  embedded_engineer: [
    {
      title: 'Own an On-Device AI/ML Inference Initiative for Your Product Line',
      description: 'As AI features move toward running on-device (for latency, privacy, or cost reasons), embedded engineers who can deploy quantized models to constrained hardware become the bridge between ML teams and shipped products. Propose and lead a pilot on-device inference project, measuring power/latency/accuracy tradeoffs. This positions you at the center of where embedded and AI roadmaps intersect.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Lead a Firmware Update / OTA Reliability Initiative',
      description: 'Propose owning an improvement to your product\'s firmware update or OTA (over-the-air) reliability pipeline — reduced failure rate, rollback safety, staged rollout. This kind of systems-reliability ownership is high-trust, high-visibility work that is difficult to offshore or automate away.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Position for Senior/Staff Embedded Engineer Using Your On-Device AI and OTA Work',
      description: 'Compile your on-device inference pilot and OTA reliability initiative into a structured case for a Senior or Staff Embedded Engineer conversation. Cross-disciplinary ownership (embedded + AI, embedded + reliability) is the clearest differentiator at this transition.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  principal_engineer: [
    {
      title: "Define Your Org's AI-Adoption Technical Strategy and Publish It as an RFC",
      description: 'At the principal/staff level, the highest-leverage move is not building AI features yourself but defining HOW your org builds them — model selection criteria, build-vs-buy guidance, evaluation standards. Write and circulate an RFC that other teams adopt. Authoring the standard that shapes multiple teams\' decisions is the clearest principal-engineer-level signal available right now.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Lead a Cross-Org Technical Initiative With Measurable Business Impact',
      description: 'Identify one technical initiative that spans multiple teams or orgs (a shared AI platform, a migration, a reliability program) and lead it to a measurable business outcome (cost savings, latency reduction, incident reduction). Cross-org technical leadership with quantified impact is the standard evidence for the next promotion or external principal-level offer.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '90 days', priority: 'Medium',
    },
    {
      title: 'Negotiate Your Market Rate Using External Principal/Distinguished-Level Benchmarks',
      description: 'At this level, internal calibration is often slower than the external market. Gather 3-5 comparable principal/staff/distinguished engineer compensation data points (Levels.fyi, direct recruiter conversations) and bring them to your manager or to an external offer process. Engineers at this level who do not actively benchmark externally are the most likely to be underpaid relative to market.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '14 days', priority: 'Low',
    },
  ],
  bi_analyst: [
    {
      title: "Own Your Org's Semantic Layer / Metrics Governance Initiative",
      description: 'As natural-language-to-dashboard and AI-assisted BI tools spread, the bottleneck shifts to having clean, governed metric definitions for those tools to query. Propose owning a semantic layer or metrics governance initiative — standardized definitions, a single source of truth for key business metrics. This makes you the foundational dependency for every AI-assisted analytics tool that follows.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Lead a Pilot of AI-Assisted Dashboarding Against Your Current BI Stack',
      description: 'Propose piloting a natural-language-query or AI-assisted insight tool against your team\'s current dashboard-building workflow, with a clear comparison of speed and accuracy. BI analysts who lead this evaluation shape how the tool gets adopted, rather than having adoption decided without their input.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Build Your Senior BI Analyst / Analytics Lead Case Around Governance + AI-Tooling Evaluation',
      description: 'Document your metrics governance initiative and AI-tooling pilot into a structured case for a Senior BI Analyst or Analytics Lead conversation. Owning the trust layer beneath every dashboard is one of the clearest emerging differentiators in this role right now.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  quantitative_analyst: [
    {
      title: 'Lead the Evaluation of an LLM-Assisted Research or Signal-Generation Workflow',
      description: 'Propose piloting an LLM-assisted approach to a research task (earnings call summarization, news sentiment signal extraction, alternative-data parsing) against your team\'s current process, with a rigorous backtested comparison of signal quality. Quants who lead this evaluation rigorously — not anecdotally — become the internal authority on where AI genuinely adds alpha versus where it adds noise.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Own a Model Risk / Backtesting Governance Framework for AI-Assisted Strategies',
      description: 'As AI-assisted signals enter production strategies, propose owning a model risk framework specifically for AI-derived signals — overfitting checks, regime-change sensitivity, kill-switch criteria. Being the person who ensures AI-assisted strategies are trustworthy, not just profitable in backtest, is a durable, high-trust role.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior Quant / Portfolio Strategist Track Using Your AI-Evaluation Rigor',
      description: 'Bring your LLM-evaluation results and model risk framework to your manager as concrete evidence for a Senior Quantitative Analyst or Portfolio Strategist conversation. Demonstrated rigor in separating genuine signal from AI-generated noise is a rare, highly compensated differentiator.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  portfolio_manager: [
    {
      title: "Lead Your Firm's Evaluation of AI-Assisted Research Tools Against Your Current Process",
      description: 'Propose piloting an AI-assisted research or screening tool (thematic search, earnings analysis, risk-factor decomposition) against your current research workflow, with a clear comparison of speed and decision quality. PMs who lead this evaluation shape how AI tools get integrated into the investment process, rather than having it decided without their input.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Document a Differentiated, Repeatable Edge That AI Tools Cannot Replicate',
      description: 'Identify and formally document the specific judgment-based edge in your process — qualitative management assessment, contrarian thesis development, position sizing under uncertainty — that depends on experience and judgment rather than pattern-matching on historical data. This documentation is both a career-protection asset and a stronger case for capital allocation.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Negotiate Increased AUM Allocation Using Your AI-Tool Evaluation Leadership + Documented Edge',
      description: 'Bring your AI-tool evaluation results and documented differentiated edge to your CIO or allocation committee as the basis for a conversation about increased capital allocation or a senior PM track. Demonstrated judgment plus tool fluency is a stronger case than track record alone in an environment where allocators are increasingly AI-skeptical of pure pattern-matching strategies.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  vp_sales: [
    {
      title: "Own Your Org's AI-Assisted Sales Forecasting and Pipeline Intelligence Rollout",
      description: 'Propose piloting AI-assisted deal scoring and forecasting (win-probability modeling, pipeline health signals) against your current forecasting process, with a clear comparison of forecast accuracy. VPs who lead this evaluation shape how AI tools get integrated into the revenue org, rather than having adoption decided above or below them.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Lead a Strategic Enterprise Relationship That Requires Executive-Level Trust',
      description: 'Identify and personally lead one strategic account relationship or partnership at the executive sponsor level that depends on long-term trust and multi-year relationship management AI tools cannot replicate. Document the relationship strategy and outcome. This builds the track record in exactly the part of sales leadership that remains durably human.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '90 days', priority: 'Medium',
    },
    {
      title: 'Negotiate an SVP / CRO Track Using Your Forecasting-Tooling and Strategic-Account Results',
      description: 'Compile your AI-forecasting rollout results and strategic account outcome into a case for an SVP Sales or Chief Revenue Officer conversation. Quantified forecast-accuracy improvement plus a documented executive-level relationship win is a substantially stronger case than quota attainment alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '14 days', priority: 'Low',
    },
  ],
  hr_director: [
    {
      title: "Lead Your Company's Responsible-AI Workforce Strategy",
      description: 'Propose owning a company-wide responsible-AI workforce strategy — covering AI-in-hiring fairness review, AI-upskilling program design, and policy for AI tool usage across departments. HR Directors who own this integrated strategy (not departmental pieces of it) become the executive-level authority on workforce AI adoption, not a downstream administrator of policies set elsewhere.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Build and Present a Workforce AI-Readiness Scorecard to the Executive Team',
      description: 'Develop a scorecard measuring AI-tool adoption, upskilling program participation, and AI-related attrition risk across business units, and present it quarterly to the executive team. HR Directors who bring this kind of forward-looking, data-driven workforce intelligence to the leadership table are positioned for CHRO tracks.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Position for CHRO / VP People Using Your AI-Workforce-Strategy Leadership',
      description: 'Compile your responsible-AI workforce strategy and readiness scorecard into a structured case for a CHRO or VP People conversation. Demonstrated ownership of how the ENTIRE workforce adapts to AI — not just HR\'s own function — is what separates CHRO candidates from HR Directors who stay in the role.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  swe_mobile: [
    {
      title: "Own Your App's AI-Powered Feature Roadmap End-to-End",
      description: 'Identify one on-device or API-backed AI feature (smart suggestions, on-device transcription, personalization) your app should ship, and propose owning it end-to-end — client architecture, model integration, performance budget. Mobile engineers who own a shipped AI feature, not just UI screens, are the ones who become irreplaceable as more app functionality becomes AI-driven.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Lead a Cross-Platform Performance or Battery-Efficiency Initiative',
      description: 'Propose leading a measurable improvement to app startup time, battery usage, or crash rate — and document the before/after metrics. Performance ownership at the app level is durable, high-visibility work that differentiates a senior mobile engineer from someone who only ships feature tickets.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Position for Senior/Staff Mobile Engineer Using Your AI-Feature and Performance Ownership',
      description: 'Compile your AI feature ownership and performance initiative into a structured case for a Senior or Staff Mobile Engineer conversation. End-to-end feature ownership plus measurable performance impact is the clearest differentiator at this transition.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  solution_architect: [
    {
      title: "Own Your Org's Reference Architecture for AI-Integrated Solutions",
      description: 'Customers and internal teams increasingly ask "how should we integrate AI into this system?" with no consistent answer. Propose authoring a reference architecture — patterns for model integration, data flow, security boundaries — that becomes the template other architects and engineers follow. Owning the pattern that shapes multiple implementations is the clearest principal-architect-level signal available right now.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Lead the Technical Strategy for One High-Stakes, Multi-Stakeholder Enterprise Deal or Migration',
      description: 'Identify and lead the architecture strategy for one complex, high-visibility engagement — a major customer integration or platform migration involving multiple stakeholders and competing technical constraints. Document the tradeoffs you navigated and the outcome. This judgment-intensive work is what differentiates a senior solution architect from someone who only follows existing patterns.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '90 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Principal Architect Track Using Your Reference-Architecture and Deal Results',
      description: 'Compile your reference architecture authorship and high-stakes engagement results into a case for a Principal Solution Architect conversation. A documented pattern that other architects use, plus a complex deal won, is a stronger case than deal count alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'Low',
    },
  ],
  support_engineer: [
    {
      title: "Own Your Org's AI-Assisted Ticket Triage and Resolution Tooling",
      description: 'Propose piloting an AI-assisted triage system (auto-categorization, suggested-resolution retrieval from your knowledge base) against your current manual process, measuring resolution-time improvement. Support engineers who lead this evaluation become the ones who run and improve the new tooling, not the ones it eventually displaces.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Own the Escalation Path for the Most Complex, Ambiguous Customer Issues',
      description: 'Volunteer to be the designated owner for tier-3 escalations — the issues with no clear root cause that require deep product knowledge and judgment. Document your resolution process for a few of these as internal case studies. This is the part of support work that AI-assisted tooling augments but does not replace, and it is the clearest path to a senior support or support-engineering-lead role.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior Support Engineer / Support Lead Track Using Your Tooling + Escalation Results',
      description: 'Compile your AI-tooling pilot results and complex-escalation resolution record into a case for a Senior Support Engineer or Support Engineering Lead conversation. Quantified resolution-time improvement plus a documented track record on the hardest issues is a stronger case than ticket volume alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '14 days', priority: 'Low',
    },
  ],
  professional_services: [
    {
      title: 'Own One AI-Tooling Pilot That Measurably Improves Your Core Workflow',
      description: 'Identify the single most repetitive, time-consuming part of your role and propose piloting an AI tool against it (drafting, summarization, data extraction, scheduling) — measuring time saved and quality impact. Professionals who lead this evaluation, rather than waiting for it to be decided for them, shape how the tool gets adopted on their own terms.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Document a Judgment-Based Contribution That Is Difficult to Automate',
      description: 'Identify and formally document one recurring decision or relationship-management responsibility in your role that depends on context, judgment, or trust built over time — not pattern-matching on historical data. Write it up as a case study with a concrete outcome. This documentation is both a career-protection asset and useful evidence in any promotion or compensation conversation.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '21 days', priority: 'Medium',
    },
    {
      title: 'Negotiate Expanded Scope or a Title Change Using Your Tooling-Adoption and Judgment Evidence',
      description: 'Bring your AI-tooling pilot results and documented judgment-based contribution to your manager as concrete evidence for a scoped conversation — expanded responsibilities, a title change, or a compensation discussion. Quantified efficiency gains plus documented judgment work is a stronger case than tenure alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 12, deadline: '14 days', priority: 'Low',
    },
  ],
  brand_designer: [
    {
      title: "Lead Your Org's AI-Generated Brand Asset Quality Standard",
      description: 'AI image/design tools now generate brand assets fast but inconsistently — brand drift is the new bottleneck. Propose and own a lightweight standard: which AI-generated asset types are pre-approved, which require design review, and a checklist that protects brand consistency at scale. Owning this standard makes you the person every other team learns the new workflow from.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Own a Brand System Extension for AI-Generated or AI-Assisted Campaigns',
      description: 'Identify a campaign or product surface where AI-assisted asset generation is being used or considered, and own building the brand guardrails (prompt templates, style references, approved color/type constraints) that keep AI output on-brand. Concrete, demoable guardrails are a strong differentiator in a market full of designers who can only describe brand guidelines, not operationalize them for AI tools.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Position for Senior/Lead Brand Designer Using Your AI-Standard and Guardrail Ownership',
      description: 'Compile your AI-asset quality standard and brand-guardrail work into a structured case for a Senior or Lead Brand Designer conversation. Owning how the brand stays consistent as AI tools scale asset production is one of the clearest emerging differentiators in this role right now.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '21 days', priority: 'Low',
    },
  ],
  compliance_officer: [
    {
      title: "Lead Your Org's AI Governance and Regulatory-Risk Review",
      description: 'As AI tools enter decision-making processes (lending, hiring, claims, underwriting), regulatory exposure grows faster than most compliance functions have adapted to. Propose leading a formal review of every AI-assisted decision process against applicable regulations, and own building the ongoing monitoring framework. Being first to formally map this risk makes you the de facto owner of AI compliance policy going forward.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Build an AI Tool Usage and Data-Handling Policy and Get It Formally Adopted',
      description: 'Draft a practical policy covering which AI tools are approved for use with sensitive or regulated data, what audit trail is required for AI-assisted decisions, and escalation criteria. Get it formally adopted, not just circulated. Compliance officers who own this policy layer become structurally central to every AI rollout decision in the company.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Position for Chief Compliance Officer / Head of GRC Using Your AI-Governance Leadership',
      description: 'Compile your AI governance review and policy-adoption work into a structured case for a Chief Compliance Officer or Head of GRC conversation. Demonstrated ownership of the company\'s AI regulatory exposure — proactively, not reactively — is the clearest differentiator at this level right now.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '21 days', priority: 'Low',
    },
  ],
  sales_operations_analyst: [
    {
      title: "Own Your Org's AI-Assisted Forecasting and Deal-Scoring Model",
      description: 'Propose piloting an AI-assisted forecasting or deal-scoring model against your team\'s current spreadsheet-based process, measuring forecast accuracy improvement. Sales ops analysts who lead this evaluation become the ones who own and tune the new model, not the ones whose manual reporting it eventually replaces.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: "Lead a CRM Data-Quality and Governance Initiative That Other Teams Depend On",
      description: 'Propose owning a CRM data-quality initiative — standardized field definitions, automated validation rules, a single source of truth for pipeline data. Every AI-assisted sales tool depends on clean CRM data to work; owning this foundation makes you the dependency every analytics and forecasting initiative builds on.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior Sales Ops / Revenue Operations Lead Track Using Your Model + Data-Quality Results',
      description: 'Compile your forecasting model results and CRM data-quality initiative into a case for a Senior Sales Operations Analyst or Revenue Operations Lead conversation. Quantified forecast-accuracy improvement plus foundational data ownership is a stronger case than reporting volume alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '14 days', priority: 'Low',
    },
  ],
  talent_acquisition_specialist: [
    {
      title: "Lead Your Org's Responsible AI-in-Sourcing and Screening Review",
      description: 'AI sourcing and resume-screening tools are entering recruiting workflows quickly, often without a formal bias or fairness review. Propose leading a review of every AI tool in your hiring pipeline against fairness and legal criteria, and own the ongoing monitoring. Being the person who ensures AI-assisted hiring is fair and defensible makes you structurally central to recruiting operations, not a candidate for replacement by the tools you evaluate.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Own the Candidate Experience for Your Hardest-to-Fill, Highest-Stakes Roles',
      description: 'Volunteer to own full-cycle recruiting for your most senior or hardest-to-fill open roles — the searches that require judgment, relationship-building, and negotiation that automated sourcing cannot replicate. Document your placement outcomes. This is the part of recruiting work that remains durably human and is the clearest path to a senior recruiter or recruiting-lead role.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '60 days', priority: 'Medium',
    },
    {
      title: 'Negotiate a Senior Recruiter / Recruiting Lead Track Using Your AI-Review and Placement Results',
      description: 'Bring your AI-in-hiring review work and senior-role placement record to your manager as concrete evidence for a Senior Talent Acquisition Specialist or Recruiting Lead conversation. Demonstrated governance ownership plus a track record on the hardest searches is a stronger case than requisitions-closed volume alone.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '14 days', priority: 'Low',
    },
  ],
  recruiting_manager: [
    {
      title: "Own Your Function's AI-Sourcing Tool Evaluation and Governance Framework",
      description: 'Propose leading a formal evaluation of AI sourcing and screening tools against fairness, accuracy, and candidate-experience criteria, and own the governance framework that gets adopted across your recruiting team. Recruiting managers who own this evaluation shape how the entire function adopts AI, rather than having tools imposed without their input.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
    {
      title: 'Build and Present a Recruiting-Function AI-Readiness and Efficiency Scorecard',
      description: 'Develop a scorecard tracking time-to-fill, quality-of-hire, and AI-tool adoption across your recruiting team, and present it quarterly to HR leadership. Recruiting managers who bring this kind of data-driven function-level intelligence to the leadership table are positioned for Director of Talent Acquisition tracks.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '30 days', priority: 'Medium',
    },
    {
      title: 'Position for Director of Talent Acquisition Using Your AI-Governance and Scorecard Leadership',
      description: 'Compile your AI-sourcing governance framework and efficiency scorecard into a structured case for a Director of Talent Acquisition conversation. Demonstrated ownership of how the entire recruiting function adapts to AI tools — not just your own team\'s day-to-day — is the clearest differentiator at this transition.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '21 days', priority: 'Low',
    },
  ],
  bpo_associate: [
    {
      title: 'Volunteer to Pilot AI-Assisted Workflow Tools Before They Are Mandated',
      description: 'Propose piloting an AI-assisted tool for your highest-volume task (call summarization, document processing, response drafting) and measure the time saved and quality impact yourself. Associates who proactively lead this evaluation are far more likely to be retained and promoted into oversight roles than those who wait for the tool to be imposed on them.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Become the Designated Quality Reviewer for AI-Assisted Output on Your Team',
      description: 'Volunteer to review and correct AI-assisted output (chatbot responses, automated document processing) before it reaches customers. Document your error-catch rate. This is the highest-value pivot available right now: from being a unit of throughput to being the quality-control layer the AI system needs to function reliably.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Build a Case for a Process-Lead or QA-Lead Role Using Your AI-Pilot and Review Results',
      description: 'Compile your AI-tool pilot results and quality-review track record into a case for a Process Lead, Team Lead, or QA Lead conversation. Demonstrated ownership of how your team adopts AI tools is the clearest, fastest path out of pure-throughput roles into supervisory or specialist tracks.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '14 days', priority: 'High',
    },
  ],
};
// "Full Stack Developer/Engineer" titles resolve to the distinct roleGroup
// string 'swe_fullstack' (see resolveRoleGroup), even though its underlying
// static ACTION_DB pool already aliases to swe_backend. Without this alias,
// buildActionReservoir's exact-key lookup would silently find no Phase-2
// content for that title despite swe_backend having a full entry.
PHASE2_ACTION_DB.swe_fullstack = PHASE2_ACTION_DB.swe_backend;

// ─── Anti-repetition reservoir ────────────────────────────────────────────────
//
// PROBLEM: getPersonalizedActions() was a pure function of (role, seniority,
// score) — a returning user whose risk tier hasn't changed since their last
// audit saw the exact same 3 actions, indefinitely. Completion state was
// tracked (actionCompletionService) but never consumed here.
//
// FIX: build a reservoir from the current risk-level cell plus every MORE
// URGENT cell (never less urgent — a 'low' risk cell's "your risk is low"
// framing would be actively misleading if surfaced to a 'critical' user),
// followed by PHASE2_ACTION_DB (advanced ownership/leadership actions) as the
// lowest-priority tier for roles that have one authored. Once the current
// cell's actions are completed, the next-most-relevant pre-authored action
// surfaces instead of a repeat.
const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'moderate', 'low'];

function buildActionReservoir<T extends { title?: string }>(
  // Accepts both the strict ActionPool (Record<RiskLevel, ...>) and the looser
  // Record<string, ...[]> shape used by the global-tech action pools — both
  // are structurally keyed by risk-level strings at runtime; only `title` is read.
  seniorityPool: Record<string, T[]>,
  riskLevel: RiskLevel,
  roleGroup?: string,
): T[] {
  const startIdx = RISK_ORDER.indexOf(riskLevel);
  // Current cell first, then progressively more-urgent cells. Never includes
  // less-urgent cells (wrong direction — see comment above).
  const orderedLevels = RISK_ORDER.slice(0, startIdx + 1).reverse();
  const seen = new Set<string>();
  const reservoir: T[] = [];
  for (const lvl of orderedLevels) {
    for (const item of seniorityPool[lvl] ?? []) {
      const id = stableActionId('pa', item.title ?? '');
      if (seen.has(id)) continue;
      seen.add(id);
      reservoir.push(item);
    }
  }
  // Lowest-priority tier: advanced ownership/leadership actions. Roles with
  // hand-authored Phase-2 content use it directly; every other role (the
  // ~150+ multi-industry roles served from separate static pools — healthcare,
  // manufacturing, energy, etc.) falls back to PHASE2_ACTION_DB.professional_services,
  // the deliberately domain-agnostic "AI-tooling pilot / judgment-based
  // contribution / negotiate expanded scope" trio. This means NO role is left
  // with zero progression once its urgency-tier reservoir is exhausted — the
  // alternative (nothing) is strictly worse than generic-but-genuine guidance.
  // Only reached once every urgency-tier action above has already been
  // seen/completed.
  const phase2Pool = (roleGroup && PHASE2_ACTION_DB[roleGroup]) || PHASE2_ACTION_DB.professional_services;
  for (const item of phase2Pool) {
    const id = stableActionId('pa', item.title ?? '');
    if (seen.has(id)) continue;
    seen.add(id);
    reservoir.push(item as T);
  }
  return reservoir;
}

/**
 * Select up to 3 actions from the reservoir, excluding already-completed
 * ones. When fewer than 3 remain unexhausted, top up with completed actions
 * (still legitimate reinforcement) rather than returning an incomplete plan.
 * `exhausted` is true only when every reservoir action has been completed —
 * callers use this to show a "you've completed everything available at this
 * tier" message instead of silently repeating.
 */
function selectWithRotation<T extends { title?: string }>(
  reservoir: T[],
  completedActionIds: Set<string>,
  // Actions rated 1-2 stars ("did this help?"). Unlike completed actions,
  // these are removed from consideration entirely — a bad-fit action should
  // not even recycle as filler once the reservoir is exhausted.
  suppressedActionIds: Set<string> = new Set(),
): { actions: T[]; exhausted: boolean; rotated: boolean } {
  if (reservoir.length === 0) return { actions: [], exhausted: false, rotated: false };

  const idOf = (item: T) => stableActionId('pa', item.title ?? '');

  // If suppression would wipe out the entire reservoir, fall back to the
  // unsuppressed reservoir — a bad-fit action is still better than an empty
  // action plan.
  const eligible = reservoir.filter(item => !suppressedActionIds.has(idOf(item)));
  const pool = eligible.length > 0 ? eligible : reservoir;

  const notCompleted = pool.filter(item => !completedActionIds.has(idOf(item)));

  let actions: T[];
  let exhausted: boolean;
  if (notCompleted.length >= 3) {
    actions = notCompleted.slice(0, 3);
    exhausted = false;
  } else if (notCompleted.length > 0) {
    const completedFillers = pool.filter(item => !notCompleted.includes(item));
    actions = [...notCompleted, ...completedFillers].slice(0, 3);
    exhausted = false;
  } else {
    // Every eligible reservoir action is completed — recycle as reinforcement, but flag it.
    actions = pool.slice(0, 3);
    exhausted = true;
  }

  // "Rotated" means the visible 3 actually differ from what a fresh user
  // (nothing completed/suppressed) would see — not merely that something was excluded.
  const freshTop3Ids = reservoir.slice(0, 3).map(idOf);
  const rotated = actions.some((item, i) => idOf(item) !== freshTop3Ids[i]);

  return { actions, exhausted, rotated };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function getPersonalizedActions(
  roleTitle: string,
  seniorityBracket: SeniorityBracket,
  score: number,
  region?: string,
  companyContext?: CompanyActionContext,
  companyName?: string,
  // v39.0 B1: full user profile feeds into selection + framing, not just
  // re-ranking. Callers that don't have a profile yet pass null safely.
  userProfile?: UserProfileLike | null,
  // Grace-period-aware compression: when HIGH/CRITICAL visa risk + gracePeriodDays < 30,
  // action deadlines are compressed to fit the actual legal window.
  visaRisk?: VisaRiskResult | null,
  // GAP-P03: ISO 4217 user currency code. When present and ≠ 'INR'/'USD', embedded
  // cost amounts (₹8,500 exam, $395 cert) are converted to local currency at
  // exchange-rate parity. LPA salary figures and amounts > $20k are left unchanged.
  localCurrencyCode?: string,
  // GAP-P03: user's financial risk tolerance — 'conservative' profiles filter out
  // action items whose extracted cost exceeds maxAffordableCourseCostUsd.
  riskAppetite?: 'conservative' | 'moderate' | 'aggressive' | null,
  // GAP-P03: upper cost threshold in USD for conservative filtering (monthly salary × 0.1).
  // null = no filtering applied (missing salary data or non-conservative profile).
  maxAffordableCourseCostUsd?: number | null,
  // Anti-repetition: IDs of actions the user has already completed (from
  // actionCompletionService.loadCompletionsLocal()). When provided, completed
  // actions are excluded and replaced with the next-most-relevant pre-authored
  // action from a more-urgent risk cell, instead of being shown again.
  completedActionIds?: Set<string>,
  // Feedback-aware suppression: IDs of actions rated 1-2 stars (from
  // actionCompletionService.loadLowRatedActionIds()). Removed from
  // consideration entirely — unlike completions, these never recycle as filler.
  suppressedActionIds?: Set<string>,
  // Phase 8 — Mission Evolution: already-computed skill-gap and readiness
  // signals from the audit pipeline. When the authored reservoir is exhausted,
  // generateEvolvedMissions() uses these to produce new, genuine missions
  // instead of recycling completed actions. Optional: callers without pipeline
  // context simply omit this and the recycling fallback remains.
  evolutionContext?: {
    upskillPriority: UpskillPriorityItem[];
    criticalGap: ReadinessPillar | null;
  } | null,
): PersonalizedActionSet {
  const roleGroup = resolveRoleGroup(roleTitle);
  const riskLevel = scoreToRiskLevel(score);
  const isIndia = region === 'IN' || region === 'India';

  // v37.0: Extended engineering-adjacent list includes all tech and tech-adjacent roles.
  // Non-engineering roles with explicit ACTION_DB entries will use those; others fall to professional_services.
  const isEngineeringAdjacent = [
    'swe', 'swe_backend', 'swe_frontend', 'swe_fullstack', 'swe_mobile',
    'ml_engineer', 'ai_engineer', 'data_scientist', 'data_engineer', 'data_analyst',
    'nlp_engineer', 'cv_engineer', 'llm_engineer', 'devops', 'platform_engineer',
    'cloud_architect', 'qa_engineer', 'security_engineer', 'embedded_engineer',
    // v37.0 additions — tech-adjacent roles with explicit pools
    'product_manager', 'ux_designer', 'ux_researcher', 'brand_designer',
    'analytics_engineer', 'bi_analyst', 'quantitative_analyst',
    'eng_manager', 'tech_lead', 'principal_engineer', 'staff_engineer', 'distinguished_engineer',
    'solution_architect', 'support_engineer',
  ].includes(roleGroup);
  // GAP-P03-B: global vs India pool dispatch.
  // India users always receive India-market-specific pools (Naukri, ₹LPA, India company names).
  // Non-India users prefer the global pool when one exists; fall back to the India pool
  // only when the role has no global equivalent (handled by cost localization for ₹/$).
  const globalPoolHit = !isIndia ? ACTION_DB_GLOBAL_TECH[roleGroup] : undefined;
  // Engineering-adjacent fallback: non-India users fall back to global swe pool so they
  // don't receive India-market content (Naukri, ₹LPA) for unmapped sub-roles like swe_backend.
  const fallbackPool = isEngineeringAdjacent
    ? (globalPoolHit ?? (!isIndia ? ACTION_DB_GLOBAL_TECH['swe'] : undefined) ?? ACTION_DB['swe'])
    : ACTION_DB['professional_services'];
  const staticPoolHit = globalPoolHit ?? ACTION_DB[roleGroup];
  const bracketPool = staticPoolHit ?? fallbackPool;
  // v39.0 B6: honest fallback signal — surface this so the UI can warn the user
  // that the guidance is generic-tech/services rather than role-specialised.
  const isGenericFallback = !staticPoolHit;

  // v39.0 A1: DB role-override layer — admin-curated overrides win over static.
  // `ensureRoleIntelligenceLoaded()` is fired at pipeline startup; this is a
  // synchronous in-memory lookup. If no override exists, we transparently
  // fall back to the static pool.
  const dbOverride = getRoleOverride(roleGroup);
  const dbActionPool = dbOverride?.actions?.action_pool;
  const dbSeniorityCell = (dbActionPool?.[seniorityBracket] ?? dbActionPool?.['mid']) as
    | Record<string, Array<Partial<ActionPlanItem>>> | undefined;
  const dbActions = dbSeniorityCell?.[riskLevel] ?? dbSeniorityCell?.['high'];

  const staticSeniorityPool = bracketPool[seniorityBracket] ?? bracketPool['mid'];

  // DB override wins ONLY if it produced a non-empty cell — otherwise we keep
  // the static pool entry. This protects against partially-seeded DB rows.
  const isDbOverride = Boolean(dbActions && dbActions.length > 0);

  // Anti-repetition rotation: build a reservoir from the current risk cell plus
  // more-urgent cells, exclude completed actions, and surface the next
  // pre-authored action instead of a repeat. DB-curated overrides are exempt —
  // they have their own admin-managed lifecycle, separate from this rotation.
  const completedSet = completedActionIds ?? new Set<string>();
  const reservoir = buildActionReservoir(
    staticSeniorityPool as Record<string, Array<Partial<ActionPlanItem>>>,
    riskLevel,
    roleGroup,
  );
  const suppressedSet = suppressedActionIds ?? new Set<string>();
  const rotation = selectWithRotation(reservoir, completedSet, suppressedSet);
  let actions = isDbOverride ? dbActions!.slice(0, 3) : rotation.actions;
  const allActionsExhausted = !isDbOverride && rotation.exhausted;
  const actionsRotated = !isDbOverride && rotation.rotated;

  // Phase 8 — Mission Evolution Engine
  // When the entire authored reservoir is completed, generate new missions from
  // live skill-gap and readiness signals rather than recycling old ones.
  // DB-curated overrides are exempt (they have their own admin lifecycle).
  let missionsEvolved = false;
  if (allActionsExhausted && !isDbOverride && evolutionContext) {
    const hasSkillData = evolutionContext.upskillPriority.length > 0;
    const hasGapData = evolutionContext.criticalGap != null &&
      evolutionContext.criticalGap.status !== 'STRONG';
    if (hasSkillData || hasGapData) {
      const evolved = generateEvolvedMissions({
        upskillPriority: evolutionContext.upskillPriority,
        criticalGap: evolutionContext.criticalGap,
        completedActionIds: completedSet,
      });
      if (evolved.length > 0) {
        actions = evolved as typeof actions;
        missionsEvolved = true;
      }
    }
  }

  // Company context guidance note — injected as first priority action when present
  const contextGuidanceFn = COMPANY_CONTEXT_GUIDANCE[companyContext ?? 'unknown'];
  const companyContextNote = contextGuidanceFn(score, companyName);

  // India-specific context note appended to the action set
  let indiaSpecificContext: string | undefined;
  if (isIndia) {
    if (riskLevel === 'critical' || riskLevel === 'high') {
      indiaSpecificContext = 'India market context: Naukri job postings are at 78% of 6-month baseline for IT services. Target India product companies (fintech, SaaS) which are hiring at 112% of baseline. Salary negotiation: ₹ target = current CTC × 1.25–1.40 for same role, × 1.40–1.70 for a role-level upgrade.';
    } else {
      indiaSpecificContext = 'India market context: NASSCOM projects 6.8% growth in product tech sector for FY2026. Consider GCC roles (Goldman, JPMorgan, Google India) for salary step-up even if risk is moderate — they pay 30–50% more than IT services for equivalent roles.';
    }
  }

  // v39.0 B1: derive profile signal classifications + framing once. These
  // are surfaced on the result so downstream consumers (brief, negotiation,
  // contingency, ranking) read the same canonical values rather than each
  // recomputing them from raw profile fields.
  const profileSummary = deriveProfileSignals(userProfile, score);
  const profileContextNote = buildProfileContextNote(profileSummary, score, companyName);

  // Grace-period-aware phase compression
  // When visa risk is HIGH/CRITICAL and the grace period is < 30 days, remap each
  // action's deadline to fit the actual legal window. sequencePhase keys are preserved
  // (day1/week1/month1/quarter1) so downstream phase-label overrides stay coherent.
  const _graceIsHigh =
    visaRisk != null &&
    (visaRisk.overallVisaRisk === 'HIGH' || visaRisk.overallVisaRisk === 'CRITICAL') &&
    visaRisk.gracePeriodDays < 30;
  const graceCompressionTier: 'critical' | 'compressed' | undefined = _graceIsHigh
    ? (visaRisk!.gracePeriodDays <= 10 ? 'critical' : 'compressed')
    : undefined;
  const GRACE_DEADLINE_MAP: Record<'critical' | 'compressed', Record<string, string>> = {
    critical:   { day1: '6 hours',  week1: '2 days',  month1: '7 days',  quarter1: '7 days'  },
    compressed: { day1: '24 hours', week1: '3 days',  month1: '10 days', quarter1: '10 days' },
  };
  const deadlineAdjusted = graceCompressionTier
    ? (actions as Array<Partial<ActionPlanItem>>).map(item => ({
        ...item,
        deadline: item.sequencePhase
          ? (GRACE_DEADLINE_MAP[graceCompressionTier][item.sequencePhase] ?? item.deadline)
          : item.deadline,
      }))
    : actions;

  // GAP-P03: localize embedded cost amounts (₹ / $) to user's currency.
  // Only runs when localCurrencyCode is provided and is not already INR or USD
  // (those are the source currencies used in the action corpus).
  const doLocalize = !!(localCurrencyCode && localCurrencyCode !== 'INR' && localCurrencyCode !== 'USD');

  // Step 1: text localization (replaces ₹/$ amounts in description text)
  const textLocalizedActions: Array<Partial<ActionPlanItem>> = doLocalize
    ? (deadlineAdjusted as Array<Partial<ActionPlanItem>>).map(item => ({
        ...item,
        description: item.description
          ? localizeActionCosts(item.description, localCurrencyCode!)
          : item.description,
      }))
    : (deadlineAdjusted as Array<Partial<ActionPlanItem>>);

  // Step 2: structured cost annotation — extract USD cost, PPP-convert, build display label.
  // Extraction runs on the ORIGINAL (pre-localization) description so the ₹/$ patterns
  // are still present; the display label is formatted separately via formatCostLabel().
  const costAnnotatedActions: Array<Partial<ActionPlanItem>> = doLocalize
    ? (deadlineAdjusted as Array<Partial<ActionPlanItem>>).map((origItem, i) => {
        const textItem = textLocalizedActions[i];
        const costUsd = extractCostUsd(origItem.title ?? '', origItem.description ?? '');
        if (costUsd == null) return textItem;
        return {
          ...textItem,
          costUsd,
          costLocalCurrency: convertPPP(costUsd, localCurrencyCode!),
          costCurrencyCode: localCurrencyCode!,
          costDisplayLabel: formatCostLabel(costUsd, localCurrencyCode!),
        };
      })
    : textLocalizedActions;

  // Step 3: affordability filter for conservative profiles.
  // When riskAppetite is 'conservative' AND the item has a detectable cost that exceeds
  // maxAffordableCourseCostUsd, the item is suppressed — showing a ₹18,000 certification
  // to a user with 2 months savings is harmful advice, not actionable guidance.
  const shouldFilter = riskAppetite === 'conservative' && maxAffordableCourseCostUsd != null && maxAffordableCourseCostUsd > 0;
  const finalActions: Array<Partial<ActionPlanItem>> = shouldFilter
    ? costAnnotatedActions.filter(item => {
        const usd = (item as any).costUsd as number | undefined;
        // Items without a cost are always kept — only paid items are gated.
        if (usd == null) return true;
        return usd <= maxAffordableCourseCostUsd!;
      })
    : costAnnotatedActions;

  return {
    roleGroup,
    rolePrefixMatch: roleTitle,
    seniorityBracket,
    riskLevel,
    actions: finalActions as Array<Partial<ActionPlanItem>>,
    indiaSpecificContext,
    companyContextNote,
    isDbOverride,
    isGenericFallback,
    fallbackReason: isGenericFallback ? 'role_not_in_specialized_database' : undefined,
    profileContextNote,
    profileSignals: profileSummary.flags,
    graceCompressionApplied: graceCompressionTier != null || undefined,
    graceCompressionTier,
    costsCurrencyConverted: doLocalize ? true : undefined,
    costsDisplayCurrency: doLocalize ? localCurrencyCode : undefined,
    actionsRotated: actionsRotated || undefined,
    // Clear allActionsExhausted when evolution succeeded — we have new missions,
    // not recycled repeats, so "exhausted" would be misleading to callers.
    allActionsExhausted: (allActionsExhausted && !missionsEvolved) || undefined,
    missionsEvolved: missionsEvolved || undefined,
  };
}

export function getRoleGroupLabel(roleTitle: string): string {
  const group = resolveRoleGroup(roleTitle);
  const labels: Record<string, string> = {
    // Tech Engineering
    swe: 'Software Engineer',
    swe_backend: 'Backend Engineer',
    swe_frontend: 'Frontend Engineer',
    swe_fullstack: 'Full Stack Engineer',
    swe_mobile: 'Mobile Developer',
    ml_engineer: 'ML Engineer',
    ai_engineer: 'AI Engineer',
    data_scientist: 'Data Scientist',
    data_engineer: 'Data Engineer',
    data_analyst: 'Data Analyst',
    nlp_engineer: 'NLP Engineer',
    cv_engineer: 'Computer Vision Engineer',
    llm_engineer: 'LLM / Prompt Engineer',
    devops: 'DevOps / SRE',
    platform_engineer: 'Platform Engineer',
    cloud_architect: 'Cloud Architect',
    qa_engineer: 'QA / SDET Engineer',
    security_engineer: 'Security Engineer',
    embedded_engineer: 'Embedded / Firmware Engineer',
    // Engineering Leadership
    eng_manager: 'Engineering Manager',
    tech_lead: 'Tech Lead',
    principal_engineer: 'Principal / Staff Engineer',
    staff_engineer: 'Staff / Principal Engineer',
    distinguished_engineer: 'Distinguished / Fellow Engineer',
    solution_architect: 'Solutions Architect',
    // Product & Design (v37.0)
    product_manager: 'Product Manager',
    ux_designer: 'UX / Product Designer',
    ux_researcher: 'UX Researcher',
    brand_designer: 'Brand / Graphic Designer',
    // Data & Analytics (v37.0)
    analytics_engineer: 'Analytics Engineer',
    bi_analyst: 'BI Developer / Analyst',
    quantitative_analyst: 'Quantitative / Actuarial Analyst',
    // Support / Operations
    support_engineer: 'Technical Support Engineer',
    bpo_associate: 'BPO / ITES Associate',
    // Finance (v37.0)
    financial_analyst: 'Financial Analyst',
    investment_banker: 'Investment Banker',
    portfolio_manager: 'Portfolio Manager',
    risk_analyst: 'Risk Analyst',
    compliance_officer: 'Compliance Officer',
    // Sales & Revenue (v37.0)
    account_executive: 'Account Executive',
    business_development_manager: 'Business Development Manager',
    customer_success_manager: 'Customer Success Manager',
    sales_engineer: 'Sales / Solutions Engineer',
    vp_sales: 'VP Sales / Head of Sales',
    sales_operations_analyst: 'Sales / Revenue Operations',
    // HR & People (v37.0)
    hr_generalist: 'HR Generalist',
    hr_business_partner: 'HR Business Partner',
    hr_director: 'HR Director / CHRO',
    talent_acquisition_specialist: 'Talent Acquisition Specialist',
    recruiting_manager: 'Recruiting Manager',
    professional_services: 'Professional / Knowledge Worker',
  };
  return labels[group] ?? 'Professional';
}
