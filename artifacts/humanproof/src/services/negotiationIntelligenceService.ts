/**
 * negotiationIntelligenceService.ts — v12.0
 *
 * Current employer leverage analysis and negotiation guidance.
 *
 * Most platforms tell users "find a new job." This service answers a different
 * question: "What leverage do I have at my CURRENT employer given my
 * competitive position, tenure, and runway situation?"
 *
 * Uses already-computed data:
 *   - competitiveIntelligenceEngine.ts: candidatesPerRole, marketTightness, negotiationLeverage
 *   - financialRunwayIntelligence.ts: recommendedStrategy, runwayTier, urgencyModifier
 *
 * UNCALIBRATED — tactic selection rules are developer estimates.
 */

import type { CompetitiveIntelligenceResult } from './competitiveIntelligenceEngine';
import type { FinancialRunwayResult } from './financialRunwayIntelligence';
// v37.0 multi-industry negotiation script additions
import { NEGOTIATION_ADDITIONS_HEALTHCARE_LEGAL } from "../data/actions/healthcare_legal_actions";
import { NEGOTIATION_ADDITIONS_CONSULTING_MARKETING_CX } from "../data/actions/consulting_marketing_cx_actions";
import { NEGOTIATION_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION } from "../data/actions/manufacturing_energy_construction_actions";
import { NEGOTIATION_ADDITIONS_RETAIL_LOGISTICS_PHARMA } from "../data/actions/retail_logistics_pharma_actions";
import { NEGOTIATION_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION } from "../data/actions/auto_telecom_govt_education_actions";
import { NEGOTIATION_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY } from "../data/actions/insurance_media_hospitality_actions";
// v38.0 Phase 1
import { NEGOTIATION_ADDITIONS_CYBERSECURITY } from "../data/actions/cybersecurity_actions";
import { NEGOTIATION_ADDITIONS_CLOUD_PLATFORM } from "../data/actions/cloud_platform_actions";
import { NEGOTIATION_ADDITIONS_AI_ML_SPECIALIZATION } from "../data/actions/ai_ml_specialization_actions";
import { NEGOTIATION_ADDITIONS_QA_FRONTEND_MOBILE } from "../data/actions/qa_frontend_mobile_actions";
// v38.0 Phase 2
import { NEGOTIATION_ADDITIONS_PHYSICIANS } from "../data/actions/physicians_actions";
import { NEGOTIATION_ADDITIONS_NURSING_ALLIED_HEALTH } from "../data/actions/nursing_allied_health_actions";
import { NEGOTIATION_ADDITIONS_BIOTECH_HEALTHCARE_IT } from "../data/actions/biotech_healthcare_it_actions";
import { NEGOTIATION_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH } from "../data/actions/behavioral_admin_vet_public_health_actions";
// v38.0 Phase 3
import { NEGOTIATION_ADDITIONS_INVESTMENT_BANKING_PE_VC } from "../data/actions/investment_banking_pe_vc_actions";
import { NEGOTIATION_ADDITIONS_QUANT_ASSET_HEDGE } from "../data/actions/quant_asset_hedge_actions";
import { NEGOTIATION_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK } from "../data/actions/corporate_finance_banking_risk_actions";
import { NEGOTIATION_ADDITIONS_INSURANCE_RE_FINANCE } from "../data/actions/insurance_real_estate_finance_actions";
// v38.0 Phase 4
import { NEGOTIATION_ADDITIONS_SKILLED_TRADES } from "../data/actions/skilled_trades_actions";
import { NEGOTIATION_ADDITIONS_INDUSTRIAL_ENGINEERING } from "../data/actions/industrial_engineering_actions";
import { NEGOTIATION_ADDITIONS_ENERGY_SPECIALIZATIONS } from "../data/actions/energy_specializations_actions";
import { NEGOTIATION_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS } from "../data/actions/construction_specializations_actions";
import { NEGOTIATION_ADDITIONS_AVIATION_PUBLIC_SAFETY } from "../data/actions/aviation_public_safety_actions";
// v38.0 Phase 5
import { NEGOTIATION_ADDITIONS_MEDIA_ENTERTAINMENT } from "../data/actions/media_entertainment_actions";
import { NEGOTIATION_ADDITIONS_HOSPITALITY_TRAVEL } from "../data/actions/hospitality_travel_actions";
import { NEGOTIATION_ADDITIONS_CX_RESEARCH_ACADEMIA } from "../data/actions/cx_research_academia_actions";
// v38.0 Phase 6
import { NEGOTIATION_ADDITIONS_MEDICAL_SUBSPECIALTIES } from "../data/actions/medical_subspecialties_actions";
import { NEGOTIATION_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE } from "../data/actions/advanced_engineering_creative_actions";
import { NEGOTIATION_ADDITIONS_SKILLED_SERVICES_EDU_GOV } from "../data/actions/skilled_services_education_government_actions";
// v39.0 A1: DB-backed role intelligence override layer
import { getRoleOverride } from "./roleIntelligenceClient";


export interface NegotiationIntelligenceInputs {
  competitiveIntelligence: CompetitiveIntelligenceResult;
  financialRunway: FinancialRunwayResult;
  currentScore: number;
  tenureYears: number;
  performanceTier: 'top' | 'average' | 'below' | 'unknown';
  industry: string;
  /** GAP J: role canonical key for role-specific negotiation scripts */
  workTypeKey?: string;
  /** v40.0: company name for personalised email body copy */
  companyName?: string;
  /**
   * v40.0: seniority bracket drives which script tier is used and whether
   * the knowledge transfer premium clause is injected.
   * junior/mid: relationship-first framing, no knowledge transfer clause
   * senior:     knowledge transfer premium injected
   * principal:  stronger knowledge transfer framing + directness
   */
  seniorityBracket?: 'junior' | 'mid' | 'senior' | 'principal' | null;
  /**
   * v39.0 B3: profile signals modulate urgency, walk-away framing, and risk
   * tolerance. Visa-dependent users surface timing pressure; family-anchored
   * users get stability-premium framing.
   */
  userProfile?: {
    visaStatus?: 'citizen' | 'permanent_resident' | 'h1b' | 'l1' | 'opt' | 'other' | 'na' | null;
    hasDependents?: boolean | null;
    dualIncomeHousehold?: boolean | null;
    priorLayoffSurvived?: boolean | null;
    hasEquityVesting?: boolean | null;
    equityVestMonths?: number | null;
  } | null;
}

export type NegotiationLeverageRating = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';

// ── Email script types ────────────────────────────────────────────────────────

/** Which optional profile clause was injected into an email script */
export type NegotiationClauseKey =
  | 'visa_grace_period'        // H1B/L1/OPT: 60-day post-termination window
  | 'family_stability'         // dependents + single income: stability framing
  | 'equity_acceleration'      // unvested equity ≤12 months: cliff offset ask
  | 'knowledge_transfer_premium'; // senior/principal: institutional knowledge cost

export const NEGOTIATION_CLAUSE_LABELS: Record<NegotiationClauseKey, string> = {
  visa_grace_period:            'Visa clause',
  family_stability:             'Family stability clause',
  equity_acceleration:          'Equity acceleration appendix',
  knowledge_transfer_premium:   'Knowledge transfer premium',
};

/**
 * A fully-composed, copy-pasteable email.
 *
 * Only irreducible placeholders remain:
 *   [First name]   — manager's first name (one-word substitution)
 *   [Your name]    — user's first name (one-word substitution)
 *   [target comp]  — the specific number the user wants (user's own data)
 *
 * All substantive data (company name, tenure, role leverage, visa type,
 * equity months, seniority framing) is filled in from profile signals.
 * The platform does the personalization work so the user does not have to.
 */
export interface NegotiationEmailScript {
  /** Short label for the UI toggle */
  label: string;
  /** Full email subject line */
  subject: string;
  /** Full email body — copy-paste into Gmail/Outlook, substitute 3 placeholders */
  body: string;
  /** Which profile clauses were injected — shown as badges in the UI */
  clausesInjected: NegotiationClauseKey[];
}

export interface NegotiationIntelligenceResult {
  leverageRating: NegotiationLeverageRating;
  /** 0–100 composite leverage score */
  leverageScore: number;
  /** Primary negotiation approach */
  recommendedTactic: string;
  /** What specifically to ask for */
  specificAsk: string;
  /** When to have the negotiation conversation */
  timingWindow: string;
  /** How strong is the outside option (BATNA)? */
  batnaStrength: string;
  /** Legacy short openers — kept for backward compat; prefer emailScripts */
  scripts: string[];
  /**
   * v40.0: fully-composed, copy-pasteable email scripts with clause injection.
   * [0] = opening email (to schedule the conversation)
   * [1] = counter email (to respond after an initial lowball) — present for STRONG/MODERATE
   */
  emailScripts: NegotiationEmailScript[];
  /** Risks of negotiating in this situation */
  risksToNegotiating: string[];
  /** Topics / demands that would backfire */
  redLines: string[];
  /** Whether to show this panel at all */
  shouldDisplay: boolean;
}

// Market tightness labels from competitiveIntelligenceEngine.ts
type MarketTightness = 'EXTREMELY_TIGHT' | 'TIGHT' | 'BALANCED' | 'LOOSE' | 'VERY_LOOSE';
type RunwayTier = 'critical' | 'elevated' | 'comfortable' | 'strong';

function computeLeverageScore(
  marketTightness: MarketTightness,
  runwayTier: RunwayTier,
  tenureYears: number,
  performanceTier: string,
  currentScore: number,
): number {
  let score = 50; // base

  // Market tightness: tight market = strong leverage
  const tightnessBonus: Record<MarketTightness, number> = {
    EXTREMELY_TIGHT: 30, TIGHT: 20, BALANCED: 0, LOOSE: -15, VERY_LOOSE: -25,
  };
  score += tightnessBonus[marketTightness] ?? 0;

  // Runway: more runway = more leverage (not desperate)
  const runwayBonus: Record<RunwayTier, number> = {
    strong: 20, comfortable: 10, elevated: -5, critical: -20,
  };
  score += runwayBonus[runwayTier] ?? 0;

  // Tenure: moderate tenure = more leverage (not new, not a cost-center)
  if (tenureYears >= 3 && tenureYears < 10) score += 10;
  else if (tenureYears >= 1.5) score += 5;
  else if (tenureYears < 0.5) score -= 15;

  // Performance
  if (performanceTier === 'top') score += 12;
  else if (performanceTier === 'below') score -= 15;

  // Risk score: high risk = lower leverage (employer may already plan cuts)
  if (currentScore >= 70) score -= 20;
  else if (currentScore >= 55) score -= 10;
  else if (currentScore <= 30) score += 8; // low risk = valued employee

  return Math.max(0, Math.min(100, score));
}

export function computeNegotiationIntelligence(
  inputs: NegotiationIntelligenceInputs,
): NegotiationIntelligenceResult {
  const {
    competitiveIntelligence,
    financialRunway,
    currentScore,
    tenureYears,
    performanceTier,
    industry,
  } = inputs;

  const marketTightness = competitiveIntelligence.marketTightness as MarketTightness;
  // BUG-FIX: FinancialRunwayResult.tier is a real typed field — removed unnecessary `as any` cast
  const runwayTier: RunwayTier = financialRunway.tier ?? 'comfortable';

  // When runway is critical, negotiation is NOT the right focus
  if (runwayTier === 'critical' || financialRunway.safeSearchMonths <= 1) {
    return {
      leverageRating: 'NONE',
      leverageScore: 0,
      recommendedTactic: '',
      specificAsk: '',
      timingWindow: '',
      batnaStrength: 'Too constrained to negotiate from strength',
      scripts: [],
      emailScripts: [],
      risksToNegotiating: ['Critical runway — any signal of job hunting or negotiation increases layoff risk'],
      redLines: [],
      shouldDisplay: false,
    };
  }

  const leverageScore = computeLeverageScore(marketTightness, runwayTier, tenureYears, performanceTier, currentScore);

  let leverageRating: NegotiationLeverageRating;
  if (leverageScore >= 65) leverageRating = 'STRONG';
  else if (leverageScore >= 45) leverageRating = 'MODERATE';
  else if (leverageScore >= 25) leverageRating = 'WEAK';
  else leverageRating = 'NONE';

  const batnaStrength = buildBatnaStrength(marketTightness, (competitiveIntelligence as any).estimatedWeeksToOffer ?? 8);
  const { tactic, specificAsk } = buildTacticAndAsk(leverageRating, marketTightness, runwayTier, performanceTier, industry, tenureYears);
  const timingWindow = buildTimingWindow(runwayTier, leverageRating, performanceTier);
  // GAP J: pass workTypeKey for role-specific scripts
  // v39.0 B3: thread userProfile into script building for visa/family/equity modulation
  const scripts = buildRoleSpecificScripts(
    leverageRating,
    specificAsk,
    marketTightness,
    tenureYears,
    inputs.workTypeKey ?? 'default',
    inputs.userProfile ?? null,
  );

  // v40.0: fully-composed, copy-pasteable email scripts with seniority + clause injection
  const seniorityBracket: 'junior' | 'mid' | 'senior' | 'principal' =
    inputs.seniorityBracket ?? (
      tenureYears >= 10 ? 'principal'
      : tenureYears >= 5 ? 'senior'
      : tenureYears >= 2 ? 'mid'
      : 'junior'
    );
  const emailScripts = buildEmailScripts(
    leverageRating,
    specificAsk,
    marketTightness,
    tenureYears,
    inputs.workTypeKey ?? 'default',
    inputs.userProfile ?? null,
    seniorityBracket,
    inputs.companyName ?? 'your company',
  );

  const { risks, redLines } = buildRisksAndRedLines(leverageRating, currentScore, runwayTier, inputs.userProfile ?? null);

  return {
    leverageRating,
    leverageScore,
    recommendedTactic: tactic,
    specificAsk,
    timingWindow,
    batnaStrength,
    scripts,
    emailScripts,
    risksToNegotiating: risks,
    redLines,
    shouldDisplay: leverageRating !== 'NONE',
  };
}

function buildBatnaStrength(tightness: MarketTightness, weeksToOffer: number): string {
  if (tightness === 'EXTREMELY_TIGHT' || tightness === 'TIGHT') {
    return `Strong outside option: ${Math.round(weeksToOffer)} weeks to offer in this market. Employers know this.`;
  }
  if (tightness === 'BALANCED') {
    return `Moderate outside option: ~${Math.round(weeksToOffer)} weeks to offer — credible but not urgent pressure.`;
  }
  return `Weak outside option: oversupplied market with ~${Math.round(weeksToOffer)} week search timeline. Don't bluff.`;
}

function buildTacticAndAsk(
  leverageRating: NegotiationLeverageRating,
  tightness: MarketTightness,
  runwayTier: RunwayTier,
  performanceTier: string,
  industry: string,
  tenureYears: number,
): { tactic: string; specificAsk: string } {
  if (leverageRating === 'STRONG') {
    if (tightness === 'EXTREMELY_TIGHT' || tightness === 'TIGHT') {
      return {
        tactic: 'Market correction ask',
        specificAsk: 'Request salary adjustment to market rate with data from your competitive intelligence (offer benchmarks). Frame as alignment, not threat.',
      };
    }
    if (performanceTier === 'top' && tenureYears >= 2) {
      return {
        tactic: 'Promotion + title upgrade',
        specificAsk: 'Request title promotion tied to documented contributions + market rate adjustment. Include 2–3 specific wins from the last 12 months.',
      };
    }
    return {
      tactic: 'Retention package negotiation',
      specificAsk: 'Request formal retention package: salary + equity refresh + clarified role scope. This signals the company sees you as at-risk of leaving.',
    };
  }

  if (leverageRating === 'MODERATE') {
    if (runwayTier === 'strong' || runwayTier === 'comfortable') {
      return {
        tactic: 'Scope expansion ask',
        specificAsk: 'Request expanded mandate, project ownership, or cross-team visibility before discussing compensation. Build the case for the comp ask.',
      };
    }
    return {
      tactic: 'Equity refresh or bonus ask',
      specificAsk: 'Request equity refresh grant (not salary increase) — easier for managers to approve, less visible to finance reviews.',
    };
  }

  // WEAK leverage
  return {
    tactic: 'Relationship-first positioning',
    specificAsk: 'Do NOT initiate formal negotiation. Instead: request 1-on-1 to understand career path clarity. Use that conversation to gauge safety before any ask.',
  };
}

function buildTimingWindow(runwayTier: RunwayTier, leverageRating: NegotiationLeverageRating, performanceTier: string): string {
  if (leverageRating === 'STRONG') {
    return 'Best window: 6–8 weeks before annual review cycle. Second-best: after a visible win or project delivery. Never during or after layoff announcements at peer companies.';
  }
  if (leverageRating === 'MODERATE') {
    return 'Best window: following performance review when trajectory is confirmed positive. Avoid Q1 (budget cycles) and earnings season.';
  }
  return 'Timing is secondary — build evidence first. Do not negotiate until you have 2+ documented wins in the past 3 months.';
}

// GAP J: Role-specific leverage context by canonical key. 15 categories.
// Used to inject role-specific language into negotiation scripts.
const ROLE_SCRIPT_VARIANTS: Record<string, {
  strongOpener: string;
  leverageContext: string;
  countersScript: string;
  walkAwayLine: string;
}> = {
  product_manager: {
    strongOpener:   '"My OKR ownership and roadmap execution have directly driven [X] in revenue / user growth this quarter."',
    leverageContext: 'Replacing a PM mid-roadmap costs 3–6 months in delivery momentum — Q3 goals would slip.',
    countersScript:  '"I appreciate the offer. To make this work without going outside, can we revisit the equity component or target bonus? I\'d like to bridge the gap that way rather than start comparing."',
    walkAwayLine:    '"I\'ve valued this conversation and I\'m committed to the mission here. If the comp structure can\'t move, I\'ll need to evaluate the full picture — I have one other conversation that\'s moved to the offer stage."',
  },
  swe: {
    strongOpener:   '"I own the [system] — migrating that knowledge takes a new engineer 3–6 months minimum."',
    leverageContext: 'System ownership and migration cost is concrete; name the specific service you own.',
    countersScript:  '"If base is constrained, is there flexibility on the signing bonus or RSU refresh? I\'d rather find a path here than restart externally — the ramp cost works both ways."',
    walkAwayLine:    '"I\'m at a decision point. If we can\'t align on [specific number], I\'ll need to move forward with the other offer. I\'d genuinely rather stay — what can you do?"',
  },
  data_scientist: {
    strongOpener:   '"The model I built and calibrate serves [X] decisions per week — that calibration knowledge has a 6-month transfer risk."',
    leverageContext: 'Model IP and calibration knowledge is hard to transfer; use this as the retention argument.',
    countersScript:  '"I\'m looking for [X]% adjustment or an accelerated RSU vesting. I\'ve been tracking what DS roles are clearing externally and there\'s a real gap — can we close part of it here?"',
    walkAwayLine:    '"I want to be direct: I\'ve been offered [X]. The model and pipeline I\'ve built here represent months of calibration. I\'d prefer to stay if the numbers can get closer — is there a path?"',
  },
  ml_engineer: {
    strongOpener:   '"Our inference pipeline and model serving layer — the institutional knowledge of its trade-offs — would take 4–6 months to reconstruct."',
    leverageContext: 'MLOps and serving infrastructure are complex; document your design decisions as leverage.',
    countersScript:  '"If base is at its ceiling, can we look at an equity refresh or accelerating the next performance review? ML infra knowledge doesn\'t transfer quickly — I\'d rather resolve this here."',
    walkAwayLine:    '"The serving layer decisions I\'ve made are undocumented in a way that takes months to transfer. I\'d rather not create that risk, but I need the comp to reflect the market. Can you make movement?"',
  },
  data_engineer: {
    strongOpener:   '"My pipeline handles [X]TB/day — an outage during transition would cost [Y] in downstream reporting delays."',
    leverageContext: 'Data pipeline reliability is your leverage; translate downtime into business cost.',
    countersScript:  '"I understand the budget constraints. Would it be possible to revisit in 90 days after the next quarter closes, with a defined target? I\'d prefer a clear commitment over an open-ended conversation."',
    walkAwayLine:    '"The pipeline reliability risk is real — any transition creates a 30-60 day vulnerability window. I want to stay, but I need [specific ask]. Can the company move on this?"',
  },
  devops: {
    strongOpener:   '"I maintain the CI/CD and infra config — an on-call gap during a transition creates production risk most teams underestimate."',
    leverageContext: 'Operational continuity is the key lever; frame it as risk reduction, not indispensability.',
    countersScript:  '"If the base number is firm, is there room on the on-call stipend or the infra tools budget? I\'d rather frame this as a retention investment than a salary negotiation."',
    walkAwayLine:    '"A DevOps transition during an active release cycle is the highest-risk scenario for the team. I\'m committed to avoiding that — but I need [number] to stay focused here rather than exploring other options."',
  },
  cloud_architect: {
    strongOpener:   '"The multi-cloud strategy and vendor contracts I negotiated lock in [X]% savings — replacing that institutional context risks renegotiation."',
    leverageContext: 'Architecture decisions and vendor relationships are your leverage asset.',
    countersScript:  '"The vendor relationships and architecture context I carry aren\'t easily transferred. If the base can\'t move, is there a path to an architecture bonus tied to the contract renewals? I want to stay invested in those outcomes."',
    walkAwayLine:    '"I\'ve received an offer that\'s [X]% above current. Given the vendor relationships I\'ve built, losing that continuity would cost more than the gap. Can we find a middle ground?"',
  },
  security_engineer: {
    strongOpener:   '"I own the audit readiness for SOC2/ISO27001 — any gap in that ownership delays certification and creates compliance exposure."',
    leverageContext: 'Compliance and audit readiness is non-negotiable for most companies; use it as framing.',
    countersScript:  '"Audit cycle timing is the window here — we\'re 60 days from the next SOC2 review. If comp can\'t move on base, can we lock in a retention bonus tied to the certification completion?"',
    walkAwayLine:    '"I\'m going to be direct: the certification timeline creates real transition risk. I want to see it through. But to do that with full focus, I need [number]. Is there a path?"',
  },
  ux_designer: {
    strongOpener:   '"The design system I maintain reduces engineering sprint time by ~20% — losing that continuity would fragment component consistency."',
    leverageContext: 'Design system ownership and user research continuity are your concrete leverage.',
    countersScript:  '"If base is constrained, could we revisit the design tools budget or a conference allocation? Staying current costs me more than most roles. Alternatively, an accelerated title review in 90 days would work."',
    walkAwayLine:    '"The design system is at a critical point — losing the context mid-build creates real fragmentation. I want to finish what I started, but I need [number] to make that the right call for me."',
  },
  qa_engineer: {
    strongOpener:   '"My test coverage gates prevent production regressions — the last 3 critical bugs caught were in my regression suite."',
    leverageContext: 'Quality gate ownership translates directly to risk prevention; quantify caught bugs.',
    countersScript:  '"If base is at its limit, could we look at a performance bonus tied to defect escape rate? That aligns my incentive directly with business outcomes and frames this as an investment."',
    walkAwayLine:    '"A gap in test coverage during a QA transition can take a quarter to rebuild. I\'d rather stay and own the quality gate through the next release. But I need [number] to commit to that."',
  },
  embedded_engineer: {
    strongOpener:   '"I have deep knowledge of the hardware abstraction layer — onboarding a replacement to this codebase takes 6–9 months given the hardware iteration cycles."',
    leverageContext: 'Long ramp time on embedded systems is a genuine constraint; document it.',
    countersScript:  '"Hardware iteration cycles mean any transition takes 6–9 months to reach my current productivity. If base can\'t move, a retention bonus through the next hardware revision would achieve the same outcome for the company."',
    walkAwayLine:    '"The hardware abstraction layer I own is the core dependency for the next revision. I want to see it through, but I need [number] to prioritise that over external options. Can we find a path?"',
  },
  platform_engineer: {
    strongOpener:   '"Developer productivity across [X] teams depends on the platform tooling I own — a gap here affects velocity org-wide."',
    leverageContext: 'Platform leverage scales with the number of dependent engineering teams; name them.',
    countersScript:  '"Platform continuity across [X] teams is the business case. If base is firm, could we revisit the infrastructure budget or a platform ownership bonus? I\'d rather stay invested in the outcomes I\'ve set up."',
    walkAwayLine:    '"The platform migration I\'m mid-way through would cost 3–4 months to hand off cleanly. I want to finish it — but I need [number] to make that the right decision."',
  },
  general_manager: {
    strongOpener:   '"I manage [X] direct reports and [Y] cross-functional dependencies — transition risk in this role directly delays [Z]."',
    leverageContext: 'People management continuity and cross-functional trust are your key leverage factors.',
    countersScript:  '"Team trust and cross-functional relationships take 6–12 months to rebuild. If base is constrained, is there a path to an accelerated review at 6 months with a defined target?"',
    walkAwayLine:    '"I\'m at a decision point. The team continuity argument is real — a leadership change mid-cycle costs the org. I\'d rather avoid that. But I need [number]. What can you do?"',
  },
  finance: {
    strongOpener:   '"I own the financial model and close process — any change to this ownership in Q3/Q4 creates reporting risk for the audit cycle."',
    leverageContext: 'Audit cycle timing and financial model ownership give you a natural leverage window.',
    countersScript:  '"The Q3/Q4 window is real — changing ownership before audit close creates reporting risk. If base can\'t move, a retention bonus through the audit completion would accomplish the same goal."',
    walkAwayLine:    '"I want to see the audit cycle through — changing hands mid-close is the highest-risk scenario. To commit to that, I need [number]. Is there room?"',
  },

  // ── v37.0: 30+ new role-specific negotiation scripts ─────────────────────────

  financial_analyst: {
    strongOpener:   '"My financial models directly drive the P&L decisions for [business unit] — replacing that institutional context mid-budget cycle creates reporting risk."',
    leverageContext: 'Budget cycle timing and financial model ownership are the natural leverage window for FP&A roles.',
    countersScript:  '"If base is constrained by the comp band, could we revisit the bonus target? My financial accuracy has saved [X] in variance budget this cycle — a performance-linked adjustment would reflect that."',
    walkAwayLine:    '"I\'ve been tracking the external market and the gap is real — [X]%. Changing ownership mid-budget cycle would cost more than the gap. I want to stay, but I need the numbers to work."',
  },

  investment_banker: {
    strongOpener:   '"I\'m mid-process on [deal type] for [client sector] — transitioning now would jeopardize the fee. My deal contribution this year totals [X] in mandates."',
    leverageContext: 'Live deal pipeline and client relationships are the strongest negotiation assets in banking.',
    countersScript:  '"The deal timeline makes this the right window for alignment. If base is at its band ceiling, can we structure a deal completion bonus for the current mandates? That keeps me focused and aligns incentives."',
    walkAwayLine:    '"I\'m at an inflection point. The [deal] I\'m working would clear a significant fee — but I need compensation clarity to stay fully committed. What can the firm do?"',
  },

  portfolio_manager: {
    strongOpener:   '"I manage [AUM] with a track record of [X]% alpha over [Y] years — replacing that PM relationship risk would cost the book significantly."',
    leverageContext: 'AUM relationship continuity and documented alpha are the primary PM negotiation levers.',
    countersScript:  '"If base is at the band limit, can we structure a performance fee participation or AUM growth bonus? My incentive should scale with the portfolio outcomes."',
    walkAwayLine:    '"I\'m receiving offers that reflect [X] AUM at [Y]% management fee — a significant improvement. I\'d prefer to keep the continuity here. What movement is possible?"',
  },

  risk_analyst: {
    strongOpener:   '"The credit risk models I own directly inform the bank\'s exposure limits — any gap in model ownership during a credit cycle creates regulatory reporting risk."',
    leverageContext: 'Regulatory continuity and model ownership are non-negotiable assets in risk — use them explicitly.',
    countersScript:  '"Regulatory examination timing is the key window. If base can\'t move, a retention bonus tied to the next exam clean pass would achieve the same outcome for both sides."',
    walkAwayLine:    '"The model ownership and regulatory context I hold would take 6 months to transfer cleanly. I want to see the next exam cycle through — but I need [number] to prioritise that."',
  },

  compliance_officer: {
    strongOpener:   '"I own the regulatory exam relationship and know every open item — any transition now creates a compliance gap the regulator would directly notice."',
    leverageContext: 'Regulatory examinations create natural, hard-deadline negotiation windows for compliance professionals.',
    countersScript:  '"The exam timing makes this the moment for alignment. If base is constrained, a retention bonus tied to clean exam completion would be straightforward to justify to the compensation committee."',
    walkAwayLine:    '"A compliance transition 60 days before examination is the highest-risk scenario. I want to avoid it — but I need [number] to commit to seeing this through."',
  },

  account_executive: {
    strongOpener:   '"My pipeline this quarter is [X] ARR with [Y] deals in late stage — those deals require relationship continuity to close. Replacing me now has a direct revenue cost."',
    leverageContext: 'Active pipeline value and late-stage deal risk are the strongest AE negotiation levers.',
    countersScript:  '"If base is at its band, can we revisit the OTE structure or accelerate the next quota period? A [X]% OTE increase with a clear attainment path would achieve the same outcome without base movement."',
    walkAwayLine:    '"I have [X] ARR in late-stage pipeline. If those deals close under my name, that\'s significant fee revenue. I\'d rather close them here — but I need [number] to make that the right choice."',
  },

  business_development_manager: {
    strongOpener:   '"The partner relationships I\'ve built generate [X] in referred pipeline — those relationships are personal, not institutional, and would require 12+ months to rebuild."',
    leverageContext: 'Partner relationship continuity and pipeline attribution are the core BDM negotiation assets.',
    countersScript:  '"If base is constrained, could we structure a partnership performance bonus tied to partner-sourced ARR? That aligns my incentive with the revenue outcomes I\'m generating."',
    walkAwayLine:    '"The [partner name] relationship took 18 months to build. That\'s not transferable quickly. I\'d rather keep the partnership momentum — but I need [number]. What can you do?"',
  },

  customer_success_manager: {
    strongOpener:   '"I hold [X] in ARR across my book — my health scores are 8.2/10 average. Transitioning now creates churn risk specifically in the accounts where I\'m the primary relationship."',
    leverageContext: 'NRR and churn prevention value are the strongest CSM negotiation assets — quantify the ARR at risk.',
    countersScript:  '"If base is at its band, can we revisit the expansion bonus structure? A higher commission rate on upsell would directly align with the revenue I\'m generating above retention targets."',
    walkAwayLine:    '"I manage [X] ARR with [Y]% NRR. The relationship continuity risk in my at-risk accounts is real. I want to stay committed — but I need [number] to make that easy."',
  },

  sales_engineer: {
    strongOpener:   '"My technical win rate is [X]% — I\'ve contributed to [Y] in ARR closed this year. The product demo environment I\'ve built is not easily transferable."',
    leverageContext: 'Technical win rate and POC-to-close conversion are the most measurable SE negotiation levers.',
    countersScript:  '"If base is constrained, could we revisit the technical win bonus or the cert reimbursement program? I\'m building product knowledge that directly accelerates close rates."',
    walkAwayLine:    '"My win rate and the technical relationships I hold in enterprise accounts create real continuity value. I want to stay — but I need [number] to commit to that."',
  },

  vp_sales: {
    strongOpener:   '"I\'ve built a team that generated [X] ARR in the last [Y] quarters with [Z]% YoY growth. Leadership transition at this stage of the sales cycle would reset momentum significantly."',
    leverageContext: 'Team revenue impact and GTM momentum are the core VP Sales negotiation assets.',
    countersScript:  '"If base is at the executive band ceiling, can we look at an equity refresh or an accelerated performance review with defined targets? My contribution should scale with the revenue we\'re generating."',
    walkAwayLine:    '"I\'m receiving offers at the [X] ARR scale — larger company, but I prefer the stage here. The team momentum I\'ve built has real value. I need [number] to stay committed to this trajectory."',
  },

  sales_operations_analyst: {
    strongOpener:   '"The CRM configuration and sales process automation I own are the operational backbone of the team\'s forecast accuracy — a gap here would take months to rebuild."',
    leverageContext: 'Forecast accuracy and CRM institutional knowledge are the RevOps negotiation anchor.',
    countersScript:  '"If base is at its band, could we discuss a systems ownership bonus or a defined path to Senior RevOps? The process IP I\'ve built has measurable value to the forecast cadence."',
    walkAwayLine:    '"The forecast model and CRM configuration I maintain is deeply institutional. Rebuilding it would take a new person 3–4 months. I want to stay invested — but I need [number]."',
  },

  hr_generalist: {
    strongOpener:   '"I own the employee relations cases, benefits administration, and compliance calendar — any gap creates direct legal and regulatory risk during open enrollment or performance review cycles."',
    leverageContext: 'Compliance cycle timing and employee relations continuity are the HR generalist negotiation window.',
    countersScript:  '"The open enrollment / performance review timing creates a natural window here. If base can\'t move, a retention bonus through the cycle completion would achieve the same outcome."',
    walkAwayLine:    '"HR transition during benefits enrollment or a performance cycle is the highest-risk period for the organization. I want to see it through — but I need [number] to commit to that."',
  },

  hr_business_partner: {
    strongOpener:   '"I hold the trust relationships with [business unit] leadership — a transition here resets 12–18 months of credibility-building that directly impacts their team\'s willingness to engage with HR."',
    leverageContext: 'HRBP effectiveness is built on leadership trust; quantify the business impact of your partnership.',
    countersScript:  '"The business leader trust I\'ve built takes time. If base is constrained, could we revisit at 6 months with a defined number? Or structure a retention bonus tied to the Q4 talent review cycle?"',
    walkAwayLine:    '"[Business leader name]\'s team engagement with HR has improved significantly under my partnership. That trust doesn\'t transfer. I\'d rather keep that momentum — but I need [number]."',
  },

  hr_director: {
    strongOpener:   '"I own the people strategy and executive team relationships — any leadership change in HR during a transformation initiative creates both cultural and legal risk."',
    leverageContext: 'Executive team trust and transformation ownership are the HR Director\'s highest negotiation assets.',
    countersScript:  '"If base is at the senior leadership band, can we revisit the LTIP or performance bonus target? The people strategy outcomes I\'m delivering have measurable revenue impact through retention and productivity."',
    walkAwayLine:    '"I\'m at a decision point. The transformation work I\'m leading has a 12-month window to deliver. I\'d rather see it through here — but I need [number] to commit to that with full focus."',
  },

  talent_acquisition_specialist: {
    strongOpener:   '"I currently hold [X] open requisitions in critical technical roles — a TA gap now would delay those hires by 3–4 months and cost significantly more in agency fees."',
    leverageContext: 'Open requisition continuity and agency fee avoidance are the TA negotiation anchor.',
    countersScript:  '"If base is at the band, could we look at a hiring success bonus tied to critical-role fills? That aligns my compensation directly with the business outcome of the team being complete."',
    walkAwayLine:    '"Replacing me now means [X] critical roles go to an agency at 20–25% fee — significantly more than the compensation gap. I want to close these roles for the team, but I need [number]."',
  },

  recruiting_manager: {
    strongOpener:   '"My team\'s time-to-fill is [X] days — [Y]% below industry average — and we\'ve avoided [Z] in agency fees this quarter. A leadership change resets that operational excellence."',
    leverageContext: 'TA team performance metrics and agency fee avoidance are the recruiting manager\'s measurable negotiation levers.',
    countersScript:  '"If base is constrained, can we look at a TA performance bonus tied to team metrics? My incentive should align with the cost efficiency I\'m driving."',
    walkAwayLine:    '"The TA process and sourcing infrastructure I\'ve built takes 6 months to recreate. I want to keep the team performing — but I need [number] to stay fully committed here."',
  },

  ux_researcher: {
    strongOpener:   '"The user research repository I\'ve built contains 24 months of longitudinal insights — that context is not recreatable without re-running the original studies."',
    leverageContext: 'Research repository depth and longitudinal user knowledge are the UX researcher\'s negotiation asset.',
    countersScript:  '"If base can\'t move, could we look at a conference and certification budget? Staying current in research methods costs me more than most roles. Or an accelerated review in 6 months with a defined target?"',
    walkAwayLine:    '"The longitudinal user research I\'ve conducted has direct product impact — recreating it would cost more than the comp gap. I want to stay invested in these users. What can you do?"',
  },

  brand_designer: {
    strongOpener:   '"I own the brand system — the design tokens, component library, and voice guidelines. Any gap in that ownership during a product launch creates visual inconsistency that harms brand equity."',
    leverageContext: 'Brand system ownership and launch timing are the designer\'s concrete negotiation window.',
    countersScript:  '"If base is at the band ceiling, could we revisit the tools budget or a launch bonus tied to the [campaign/product] release? I\'d rather stay focused on the launch than be distracted by comp conversations."',
    walkAwayLine:    '"The brand system I\'ve built is mid-evolution — a gap here would fragment 18 months of consistency work. I want to see the [launch] through. But I need [number] to commit to that."',
  },

  analytics_engineer: {
    strongOpener:   '"The dbt models and semantic layer I own serve every business dashboard in the company — a gap in ownership would break reporting continuity for multiple teams simultaneously."',
    leverageContext: 'Semantic layer and dbt model ownership is the analytics engineer\'s highest-leverage asset.',
    countersScript:  '"If base is constrained, can we look at a quarterly data quality bonus or an accelerated review? The dashboard reliability I\'m maintaining has direct business decision value."',
    walkAwayLine:    '"The metrics catalog and dbt transformation layer I\'ve built would take 4–6 months to transfer safely. I\'d rather keep that continuity — but I need [number]."',
  },

  bi_analyst: {
    strongOpener:   '"I own the executive dashboard suite and the financial reporting models — any gap creates a real data availability risk during the quarterly planning cycle."',
    leverageContext: 'Executive dashboard continuity and quarterly cycle timing are the BI analyst\'s negotiation window.',
    countersScript:  '"If base is at the band, could we revisit the data certification budget or an accelerated review? My dashboard ownership directly supports the leadership team\'s decision quality."',
    walkAwayLine:    '"Transitioning out before the Q3 planning cycle would leave the leadership team without their key decision dashboards for 60+ days. I want to avoid that — but I need [number]."',
  },

  quantitative_analyst: {
    strongOpener:   '"The models I\'ve built and calibrate govern [X] decisions per day — the calibration history and parameter choices have 6–12 months of documented reasoning that\'s not transferable quickly."',
    leverageContext: 'Model calibration history and documented parameter rationale are the quant\'s primary negotiation asset.',
    countersScript:  '"If base is at the comp band, can we look at a model performance bonus tied to backtested accuracy? That aligns my incentive directly with the model outcomes."',
    walkAwayLine:    '"The model calibration history represents years of documented decision-making. A gap here has direct P&L implications. I want to stay committed — but I need [number]."',
  },

  staff_engineer: {
    strongOpener:   '"The architecture decisions I\'ve made and documented represent 2+ years of domain context — transferring that takes 6–9 months of institutional knowledge transfer, minimum."',
    leverageContext: 'Architecture decision history and cross-team influence are the staff engineer\'s most concrete leverage.',
    countersScript:  '"If base is at the senior IC band ceiling, can we look at a scope expansion bonus or an equity refresh? My work is at the organizational level now — my comp should reflect that scope."',
    walkAwayLine:    '"I\'m having conversations at the [company] level — $[X] total comp, [Y] equity. I\'d rather apply my architectural knowledge here where I have context. But I need [number] to prioritise that."',
  },

  default: {
    strongOpener:   '"I\'ve benchmarked my role and I\'m seeing a gap of roughly [X]% versus market. I\'d like to align before I\'m comparing offers."',
    leverageContext: 'Market data is your baseline leverage; use specific salary benchmarks.',
    countersScript:  '"If base is at its limit, I\'d consider the same delta via signing bonus or an accelerated performance review in 6 months with a defined number attached."',
    walkAwayLine:    '"I want to stay — I\'ve been clear about that. But I need [specific number] to make that decision with confidence. If that\'s not possible, I\'ll need to move forward with the other option."',
  },
};

// ─── v37.0 + v38.0 multi-industry negotiation script merge ─────────────────────
// Two shapes supported:
//   v37.0: { primaryLeverage, scriptTemplate, alternativeLeverage, leverageScore, bestTiming }
//   v38.0: { strongOpener, leverageContext, countersScript, walkAwayLine }
// We normalize both into the v38.0 (ROLE_SCRIPT_VARIANTS) shape.
type LegacyNegotiationAddition = {
  primaryLeverage?: string;
  scriptTemplate?: string;
  alternativeLeverage?: string[];
  leverageScore?: number;
  bestTiming?: string;
  // v38.0 fields
  strongOpener?: string;
  leverageContext?: string;
  countersScript?: string;
  walkAwayLine?: string;
};
(function mergeIndustryNegotiationScripts() {
  const asNA = (x: unknown) => x as Record<string, LegacyNegotiationAddition>;
  const allAdditions: Record<string, LegacyNegotiationAddition> = {
    ...asNA(NEGOTIATION_ADDITIONS_HEALTHCARE_LEGAL),
    ...asNA(NEGOTIATION_ADDITIONS_CONSULTING_MARKETING_CX),
    ...asNA(NEGOTIATION_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION),
    ...asNA(NEGOTIATION_ADDITIONS_RETAIL_LOGISTICS_PHARMA),
    ...asNA(NEGOTIATION_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION),
    ...asNA(NEGOTIATION_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY),
    // v38.0 Phase 1 — already in target shape
    ...asNA(NEGOTIATION_ADDITIONS_CYBERSECURITY),
    ...asNA(NEGOTIATION_ADDITIONS_CLOUD_PLATFORM),
    ...asNA(NEGOTIATION_ADDITIONS_AI_ML_SPECIALIZATION),
    ...asNA(NEGOTIATION_ADDITIONS_QA_FRONTEND_MOBILE),
    // v38.0 Phase 2 — already in target shape
    ...asNA(NEGOTIATION_ADDITIONS_PHYSICIANS),
    ...asNA(NEGOTIATION_ADDITIONS_NURSING_ALLIED_HEALTH),
    ...asNA(NEGOTIATION_ADDITIONS_BIOTECH_HEALTHCARE_IT),
    ...asNA(NEGOTIATION_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH),
    // v38.0 Phase 3
    ...asNA(NEGOTIATION_ADDITIONS_INVESTMENT_BANKING_PE_VC),
    ...asNA(NEGOTIATION_ADDITIONS_QUANT_ASSET_HEDGE),
    ...asNA(NEGOTIATION_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK),
    ...asNA(NEGOTIATION_ADDITIONS_INSURANCE_RE_FINANCE),
    // v38.0 Phase 4
    ...asNA(NEGOTIATION_ADDITIONS_SKILLED_TRADES),
    ...asNA(NEGOTIATION_ADDITIONS_INDUSTRIAL_ENGINEERING),
    ...asNA(NEGOTIATION_ADDITIONS_ENERGY_SPECIALIZATIONS),
    ...asNA(NEGOTIATION_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS),
    ...asNA(NEGOTIATION_ADDITIONS_AVIATION_PUBLIC_SAFETY),
    // v38.0 Phase 5
    ...asNA(NEGOTIATION_ADDITIONS_MEDIA_ENTERTAINMENT),
    ...asNA(NEGOTIATION_ADDITIONS_HOSPITALITY_TRAVEL),
    ...asNA(NEGOTIATION_ADDITIONS_CX_RESEARCH_ACADEMIA),
    // v38.0 Phase 6
    ...asNA(NEGOTIATION_ADDITIONS_MEDICAL_SUBSPECIALTIES),
    ...asNA(NEGOTIATION_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE),
    ...asNA(NEGOTIATION_ADDITIONS_SKILLED_SERVICES_EDU_GOV),
  };
  for (const [roleKey, n] of Object.entries(allAdditions)) {
    // If file already provides target shape (v38.0), use directly
    if (n.strongOpener && n.leverageContext && n.countersScript && n.walkAwayLine) {
      ROLE_SCRIPT_VARIANTS[roleKey] = {
        strongOpener: n.strongOpener,
        leverageContext: n.leverageContext,
        countersScript: n.countersScript,
        walkAwayLine: n.walkAwayLine,
      };
      continue;
    }
    // Otherwise map legacy shape → target shape
    const primaryLeverage = n.primaryLeverage ?? 'I want to discuss compensation alignment given my contributions';
    const altLevers = n.alternativeLeverage ?? [];
    ROLE_SCRIPT_VARIANTS[roleKey] = {
      strongOpener: `"${primaryLeverage} — and I'd like to discuss how we align on that value before I'm evaluating outside options."`,
      leverageContext: n.scriptTemplate ?? primaryLeverage,
      countersScript: altLevers.length > 0
        ? `"If the primary ask isn't achievable, consider: ${altLevers[0]}. I'd rather find alignment here than restart externally."`
        : `"I'd prefer to find a path here — can we explore what flexibility exists on the structure of the offer?"`,
      walkAwayLine: `"${n.bestTiming ?? 'Now'} is the right moment for this conversation. I want to stay — but I need the offer to reflect the leverage I've described. What can you do?"`,
    };
  }
})();

// ── Email script builder ──────────────────────────────────────────────────────
// Produces 1–2 fully-composed, copy-pasteable emails.
// Rule: fill in EVERY data point we have. Leave only [First name], [Your name],
// and [target comp] as placeholders. These are word-substitutions, not language
// composition tasks — the platform does the personalization work.

function buildEmailScripts(
  leverageRating: NegotiationLeverageRating,
  specificAsk: string,
  tightness: MarketTightness,
  tenureYears: number,
  workTypeKey: string,
  userProfile: NegotiationIntelligenceInputs['userProfile'],
  seniorityBracket: 'junior' | 'mid' | 'senior' | 'principal',
  companyName: string,
): NegotiationEmailScript[] {
  if (leverageRating === 'NONE') return [];

  const staticVariant  = ROLE_SCRIPT_VARIANTS[workTypeKey] ?? ROLE_SCRIPT_VARIANTS['default'];
  const dbNego         = getRoleOverride(workTypeKey)?.negotiation;
  const variant        = dbNego
    ? {
        strongOpener:    dbNego.strong_opener     ?? staticVariant.strongOpener,
        leverageContext: dbNego.leverage_context  ?? staticVariant.leverageContext,
        countersScript:  dbNego.counters_script   ?? staticVariant.countersScript,
        walkAwayLine:    dbNego.walk_away_line     ?? staticVariant.walkAwayLine,
      }
    : staticVariant;

  // ── Profile clause detection ────────────────────────────────────────────────
  const visaType      = userProfile?.visaStatus;
  const visaDependent = visaType === 'h1b' || visaType === 'l1' || visaType === 'opt';
  const familyAnchored = !!userProfile?.hasDependents && !userProfile?.dualIncomeHousehold;
  const equityMonths  = userProfile?.equityVestMonths ?? 0;
  const equityAnchor  = !!userProfile?.hasEquityVesting && equityMonths > 0 && equityMonths <= 12;
  const seniorLevel   = seniorityBracket === 'senior' || seniorityBracket === 'principal';

  const tenureDisplay = tenureYears < 1
    ? `${Math.round(tenureYears * 12)} months`
    : tenureYears === 1 ? '1 year'
    : `${Math.round(tenureYears)} years`;

  const visaLabel = visaType === 'h1b' ? 'H-1B' : visaType === 'l1' ? 'L-1' : 'OPT';

  // ── Clause paragraphs — each is a self-contained email paragraph ──────────

  const VISA_CLAUSE = visaDependent
    ? `\n\nOne piece of context I want to be transparent about: I'm on a ${visaLabel} visa. After employment ends, I have a 60-day window before I'm required to leave the country. I'm raising this conversation now — while I have good runway and no urgency — because I can't afford to have it in a distressed context. This isn't pressure. It's responsible planning on both our sides.`
    : '';

  const FAMILY_CLAUSE = familyAnchored && !visaDependent
    ? `\n\nOne thing I want you to understand about my situation: I'm the primary earner supporting dependents. That context doesn't change what I'm asking for, but it does mean that stability and predictability matter as much to me as the compensation number itself. A clear role-scope commitment or retention structure would be as valuable as a comp percentage increase.`
    : '';

  const EQUITY_CLAUSE = equityAnchor
    ? `\n\nThere's one additional factor I want to put on the table: I have ${equityMonths} months until my next significant vesting milestone at ${companyName}. That's real money I'd be forfeiting in any transition. If there's a path to either accelerating that cliff or bridging the gap with a sign-on component, it changes my calculus significantly — and it's cheaper for ${companyName} than the recruiting cost of replacing me at this point.`
    : '';

  const KNOWLEDGE_TRANSFER_CLAUSE = seniorLevel
    ? seniorityBracket === 'principal'
      ? `\n\nI want to put one point on the table directly: the institutional knowledge I carry — the architecture decisions, the team context, the vendor and customer relationships — has a real replacement cost. The average time-to-productivity for a principal-level hire in this market is 9–12 months. That's not a threat. It's shared context for what "alignment" means at this level. I'm raising this because I'd rather align here than in a position where I'm already mid-process elsewhere.`
      : `\n\nOne context point worth naming: the institutional knowledge I carry — design decisions, team history, external relationships — has a concrete replacement cost. A senior hire in this market typically takes 6–9 months to reach full productivity. I'm not invoking that as leverage. I'm flagging it as context for what the cost of misalignment is for both sides.`
    : '';

  // The primary profile clause is determined by priority order
  const primaryClause = VISA_CLAUSE || FAMILY_CLAUSE || EQUITY_CLAUSE || KNOWLEDGE_TRANSFER_CLAUSE;
  const injectedClauses: NegotiationClauseKey[] = [];
  if (VISA_CLAUSE)                   injectedClauses.push('visa_grace_period');
  if (FAMILY_CLAUSE)                 injectedClauses.push('family_stability');
  if (EQUITY_CLAUSE)                 injectedClauses.push('equity_acceleration');
  if (KNOWLEDGE_TRANSFER_CLAUSE)     injectedClauses.push('knowledge_transfer_premium');

  // ── Seniority-tier base opening ───────────────────────────────────────────

  const seniorityOpening = (() => {
    const leverageCtx = variant.leverageContext;
    switch (seniorityBracket) {
      case 'principal':
        return `I'd like to have a direct conversation about my compensation and long-term alignment at ${companyName}. I've spent ${tenureDisplay} here, and I want to be equally direct about both the value I provide and my expectations. ${leverageCtx}`;
      case 'senior':
        return `I'd like to schedule time for a compensation alignment discussion. I've been at ${companyName} for ${tenureDisplay}, and I think the context of that conversation is worth framing before we have it. ${leverageCtx}`;
      case 'mid':
        return `I wanted to reach out about a conversation I've been thinking through. I've been at ${companyName} for ${tenureDisplay} and I feel I've grown significantly in scope and impact. ${leverageCtx} I'd like to make sure my compensation reflects where I am, not where I was when I joined.`;
      default: // junior
        return `I wanted to flag a conversation I'd like to have. I've been at ${companyName} for ${tenureDisplay} and I think I've made meaningful progress in my role. I'd love to make sure my compensation path reflects that growth. ${leverageCtx}`;
    }
  })();

  const closing = seniorityBracket === 'principal' || seniorityBracket === 'senior'
    ? `This isn't an ultimatum. It's an alignment conversation. Could we find 30 minutes this week?`
    : `I'm not comparing offers right now — I'm planning to stay and grow here. Could we carve out 20 minutes this week?`;

  // ── Email 1: Opening email ────────────────────────────────────────────────

  const subjectOpener = seniorityBracket === 'principal'
    ? 'Long-term alignment conversation'
    : seniorityBracket === 'senior'
    ? `Compensation and scope alignment`
    : 'Compensation alignment — quick conversation request';

  const bodyOpener = [
    `Hi [First name],`,
    ``,
    seniorityOpening,
    primaryClause,
    ``,
    closing,
    ``,
    `[Your name]`,
  ].join('\n');

  const emails: NegotiationEmailScript[] = [
    {
      label: 'Opening email',
      subject: subjectOpener,
      body: bodyOpener,
      clausesInjected: injectedClauses,
    },
  ];

  // ── Email 2: Counter-offer email (STRONG or MODERATE only) ────────────────

  if (leverageRating === 'STRONG' || leverageRating === 'MODERATE') {
    const marketLine = (tightness === 'EXTREMELY_TIGHT' || tightness === 'TIGHT')
      ? `The market for this role is genuinely tight right now — I have data on that from active conversations. I'm not using that as a bluff; I'm sharing it as context.`
      : `I've been tracking the external market for my role, and there's a real gap between my current comp and what I'm seeing for comparable positions.`;

    const counterBody = [
      `Hi [First name],`,
      ``,
      `Thank you for the initial conversation. I want to be direct about where I am.`,
      ``,
      marketLine,
      ``,
      `${specificAsk} That's my specific ask, and I've thought carefully about it before raising it.`,
      equityAnchor ? EQUITY_CLAUSE.trim() : '',
      visaDependent ? VISA_CLAUSE.trim() : '',
      seniorLevel ? KNOWLEDGE_TRANSFER_CLAUSE.trim() : '',
      ``,
      `I'm genuinely committed to staying and continuing to build here. If we can find movement on [target comp], that commitment is easy to make. What can you do?`,
      ``,
      `[Your name]`,
    ].filter(Boolean).join('\n');

    emails.push({
      label: 'Counter-offer email',
      subject: `Re: Compensation discussion`,
      body: counterBody,
      clausesInjected: injectedClauses,
    });
  }

  return emails;
}

function buildRoleSpecificScripts(
  leverageRating: NegotiationLeverageRating,
  specificAsk: string,
  tightness: MarketTightness,
  tenureYears: number,
  workTypeKey: string,
  userProfile?: NegotiationIntelligenceInputs['userProfile'],
): string[] {
  const scripts: string[] = [];
  const staticVariant = ROLE_SCRIPT_VARIANTS[workTypeKey] ?? ROLE_SCRIPT_VARIANTS['default'];
  // v39.0 A1: DB role_negotiation_scripts override layer wins when present.
  // Admins can ship a refreshed leverage line / counter without code deploy.
  const dbNego = getRoleOverride(workTypeKey)?.negotiation;
  const variant = dbNego
    ? {
        strongOpener: dbNego.strong_opener ?? staticVariant.strongOpener,
        leverageContext: dbNego.leverage_context ?? staticVariant.leverageContext,
        countersScript: dbNego.counters_script ?? staticVariant.countersScript,
        walkAwayLine: dbNego.walk_away_line ?? staticVariant.walkAwayLine,
      }
    : staticVariant;

  // v39.0 B3: profile signal classifications drive optional appendices to
  // the role-specific scripts. We do NOT overwrite the role text; we add
  // a focused profile-specific line at the right place in the conversation.
  const visaDependent = userProfile?.visaStatus === 'h1b'
                     || userProfile?.visaStatus === 'l1'
                     || userProfile?.visaStatus === 'opt';
  const familyAnchored = !!userProfile?.hasDependents && !userProfile?.dualIncomeHousehold;
  const equityAnchor   = !!userProfile?.hasEquityVesting && (userProfile?.equityVestMonths ?? 0) > 0 && (userProfile?.equityVestMonths ?? 0) <= 12;

  if (leverageRating === 'STRONG') {
    scripts.push(variant.strongOpener);
    scripts.push(`"Context: ${variant.leverageContext} I'd like to discuss alignment before I'm in a position of comparing offers."`);
    // Role-specific counter and walk-away for STRONG leverage
    scripts.push(variant.countersScript);
    if (tightness === 'TIGHT' || tightness === 'EXTREMELY_TIGHT') {
      scripts.push(variant.walkAwayLine);
    }
  } else if (leverageRating === 'MODERATE') {
    scripts.push(`"I'd love to align on what a successful next 12 months looks like and make sure my scope and comp reflect that. ${variant.leverageContext}"`);
    scripts.push(`"Can we schedule time to map out the next milestone and what reaching it looks like in terms of title and compensation?"`);
    // Role-specific counter for MODERATE leverage
    scripts.push(variant.countersScript);
  } else {
    scripts.push(`"I'd love to understand what the path to [title] looks like here and the timeline. I want to make sure I'm building toward the right goal."`);
    // Even in WEAK leverage, role-specific counter is more useful than a generic fallback
    scripts.push(variant.countersScript);
  }

  // v39.0 B3: profile-aware appendix lines. We deliberately cap at 4 total
  // (3 core + 1 profile line) so the panel stays scannable.
  const baseSlice = scripts.slice(0, 3);
  if (visaDependent && leverageRating !== 'NONE') {
    baseSlice.push(`"For context: I'm on a visa that has a 60-day post-termination grace period, so I have to be deliberate about timing. I'm raising this conversation now rather than later to give us both room to align."`);
  } else if (familyAnchored && leverageRating !== 'NONE') {
    baseSlice.push(`"Outside of comp, the thing I value most is stability and predictability — I have family commitments that make timing certainty more important than the last 5% on the offer."`);
  } else if (equityAnchor && (leverageRating === 'STRONG' || leverageRating === 'MODERATE')) {
    baseSlice.push(`"I have a meaningful vesting milestone in the next year. If we can structure either an accelerator on that or a sign-on that offsets the cliff, it changes my calculus significantly."`);
  }
  return baseSlice.slice(0, 4);
}

function buildRisksAndRedLines(
  leverageRating: NegotiationLeverageRating,
  currentScore: number,
  runwayTier: RunwayTier,
  userProfile?: NegotiationIntelligenceInputs['userProfile'],
): { risks: string[]; redLines: string[] } {
  const risks: string[] = [];
  const redLines: string[] = [];

  if (currentScore >= 65) {
    risks.push('High risk score: asking for more at a company already considering cuts may accelerate your RIF inclusion');
  }
  if (leverageRating === 'WEAK') {
    risks.push('Low leverage environment: without a credible outside option, a "no" carries no consequence for the employer');
  }
  if (runwayTier === 'elevated') {
    risks.push('Limited runway: negotiation that signals you might leave + leave soon is less effective than being seen as a stable choice');
  }

  // v39.0 B3: profile-specific risk callouts
  const visaDependent = userProfile?.visaStatus === 'h1b'
                     || userProfile?.visaStatus === 'l1'
                     || userProfile?.visaStatus === 'opt';
  if (visaDependent && currentScore >= 55) {
    risks.push('Visa-dependent risk: an aggressive ask at a company already considering cuts shortens your runway from 60 days to 0 if it triggers an early termination. Soften the wording; keep stability framing primary.');
  }
  if (userProfile?.hasDependents && !userProfile?.dualIncomeHousehold && currentScore >= 55) {
    risks.push('Family-anchored risk: single-income household means the cost of a misjudged ask is amplified. Negotiate for stability or scope, not raw comp percentage.');
  }

  redLines.push('Do not mention competing offers unless they are real, written, and time-constrained');
  redLines.push('Do not escalate to HR without a manager champion — HR\'s job is company risk management, not your advocacy');
  if (currentScore >= 55) {
    redLines.push('Do not ask for anything that signals you are "checking out" (remote upgrade, reduced responsibility, part-time) at a company with high risk signals');
  }
  if (visaDependent) {
    redLines.push('Do not invoke "I can walk to another offer" framing without a written, sponsor-confirmed offer in hand — bluffing on a visa is a one-way door');
  }

  return { risks, redLines };
}

// ═══════════════════════════════════════════════════════════════════════════════
// v51.0 — Advanced Negotiation Intelligence Layer
// ═══════════════════════════════════════════════════════════════════════════════
// Five new intelligence modules beyond current-employer leverage:
//   1. Counter-offer analysis (new offer received — how to respond)
//   2. Layoff survival communication (what to say when cuts are happening)
//   3. Multi-offer comparison (structured framework for competing offers)
//   4. Resignation planning (when and how to resign given constraints)
//   5. Compensation playbook (real numbers by role + seniority + region)

import type { BehavioralPersonalizationResult } from './behavioralPersonalizationEngine';

// ── 1. Counter-Offer Analysis ─────────────────────────────────────────────────

export interface CounterOfferAnalysisInputs {
  /** The offer as received (formatted: "₹45L base + 10% bonus") */
  offeredPackage: string
  /** User's target comp range */
  targetRange: string
  /** % difference: negative = offer below target, positive = above */
  gapPercent: number
  companyName: string
  roleTitle: string
  /** Are there competing offers? */
  hasCompetingOffer: boolean
  competingOfferDetails?: string | null
  /** From BehavioralPersonalizationResult */
  runwayMonths: number
  leverageScore: number   // from computeNegotiationIntelligence
  seniorityBracket: 'junior' | 'mid' | 'senior' | 'principal'
  visaConstrained: boolean
  hasDependents: boolean
}

export interface CounterOfferAnalysisResult {
  recommendation: 'counter_immediately' | 'negotiate_holistically' | 'accept_with_conditions' | 'accept' | 'decline'
  recommendationRationale: string
  /** The specific counter number or range to state */
  counterNumber: string
  /** What to say — full counter email */
  counterEmailScript: string
  /** Non-salary items to negotiate as package components */
  packageItems: Array<{
    item: string
    rationale: string
    askAmount: string
  }>
  /** What "good enough" looks like — when to stop negotiating */
  acceptanceFloor: string
  /** Deadline management strategy */
  deadlineStrategy: string
  /** If competing offer exists — how to use it */
  competingOfferStrategy: string | null
  /** Risk of pushing too hard */
  pushbackRisk: 'low' | 'medium' | 'high'
  pushbackRiskExplanation: string
}

export function computeCounterOfferAnalysis(
  inputs: CounterOfferAnalysisInputs,
): CounterOfferAnalysisResult {
  const { gapPercent, leverageScore, runwayMonths, visaConstrained, hasDependents, seniorityBracket, hasCompetingOffer, companyName, roleTitle } = inputs

  // Determine recommendation
  let recommendation: CounterOfferAnalysisResult['recommendation']
  let pushbackRisk: CounterOfferAnalysisResult['pushbackRisk']

  if (gapPercent <= -20 && leverageScore >= 60) {
    recommendation = 'counter_immediately'
    pushbackRisk = 'low'
  } else if (gapPercent <= -10 && leverageScore >= 40) {
    recommendation = 'negotiate_holistically'
    pushbackRisk = 'low'
  } else if (gapPercent <= -5) {
    recommendation = runwayMonths <= 3 ? 'accept_with_conditions' : 'negotiate_holistically'
    pushbackRisk = 'medium'
  } else if (gapPercent > 0) {
    recommendation = 'accept'
    pushbackRisk = 'low'
  } else {
    recommendation = 'accept_with_conditions'
    pushbackRisk = 'low'
  }

  // Financial urgency override
  if (runwayMonths <= 2) recommendation = 'accept_with_conditions'

  const absGap = Math.abs(gapPercent)
  const counterNumber = gapPercent < 0
    ? `Ask for your target range: ${inputs.targetRange} — this is ${absGap.toFixed(0)}% above the current offer but within market range for this role`
    : `Offer is at/above your target. No counter required on base.`

  const packageItems: CounterOfferAnalysisResult['packageItems'] = []

  // Always negotiate joining bonus if base gap > 10%
  if (gapPercent < -10) {
    packageItems.push({
      item: 'Joining / signing bonus',
      rationale: 'Bridges the gap without changing comp bands that affect future raises',
      askAmount: `${Math.abs(gapPercent * 0.5).toFixed(0)}% of annual base (one-time)`
    })
  }

  // Visa-constrained: avoid asking for conditions that delay start date
  if (!visaConstrained) {
    packageItems.push({
      item: 'Remote flexibility',
      rationale: '2 remote days/week is standard at most companies and significantly improves work-life quality',
      askAmount: '2 days WFH per week (or "flexibility as needed")'
    })
  }

  if (seniorityBracket === 'senior' || seniorityBracket === 'principal') {
    packageItems.push({
      item: 'Accelerated performance review',
      rationale: 'Ask for a 6-month rather than 12-month first review — signals confidence in your ability to add value fast',
      askAmount: '6-month performance review with comp reassessment'
    })
    packageItems.push({
      item: 'Additional equity / RSU grant',
      rationale: 'Equity bridges the gap long-term without increasing the annual cash burn for the employer',
      askAmount: 'Additional RSU grant equivalent to 1 year of the base gap'
    })
  }

  const urgencyFlag = runwayMonths <= 4
    ? 'Note: given your financial runway, do not let negotiation delay your start date by more than 5 business days.'
    : ''

  const counterEmailScript = buildCounterOfferEmail(inputs, recommendation, counterNumber, packageItems, urgencyFlag)

  const competingOfferStrategy = hasCompetingOffer
    ? `You have leverage. State: "I'm excited about ${companyName} specifically, and I have another offer at [amount] with a [date] deadline. I want to give you the opportunity to match before I decide." Do this in a phone call, not email.`
    : null

  const deadlineStrategy = runwayMonths <= 3
    ? 'Request 3 business days maximum. Accept within that window regardless — do not let negotiation collapse a strong offer.'
    : 'Request 5 business days to "review the full package carefully." This is standard and will not be refused.'

  const acceptanceFloor = `If ${companyName} reaches ${inputs.targetRange} or within 8% of it, plus at least 1 of the package items, accept immediately.`

  const pushbackRiskExplanation = pushbackRisk === 'low'
    ? 'Low pushback risk: at your experience level and leverage, a professional counter is universally expected. No well-run company rescinds an offer for a polite, reasonable counter.'
    : pushbackRisk === 'medium'
      ? 'Medium pushback risk: the offer is not far below market, so a large counter may signal misalignment. Keep your counter to a single number and one package item.'
      : 'High pushback risk: multiple factors suggest the company has limited flexibility. Counter once, professionally, and accept the best response.'

  return {
    recommendation,
    recommendationRationale: buildCounterRecommendationRationale(inputs, recommendation),
    counterNumber,
    counterEmailScript,
    packageItems,
    acceptanceFloor,
    deadlineStrategy,
    competingOfferStrategy,
    pushbackRisk,
    pushbackRiskExplanation,
  }
}

function buildCounterOfferEmail(
  inputs: CounterOfferAnalysisInputs,
  recommendation: CounterOfferAnalysisResult['recommendation'],
  counterNumber: string,
  packageItems: CounterOfferAnalysisResult['packageItems'],
  urgencyFlag: string,
): string {
  if (recommendation === 'accept') {
    return `Subject: Offer Acceptance — ${inputs.roleTitle} at ${inputs.companyName}\n\nDear [Hiring Manager Name],\n\nThank you for extending the offer for the ${inputs.roleTitle} role. I'm pleased to formally accept the offer as presented.\n\nI'm excited to join ${inputs.companyName} and contribute to [specific team goal]. Please share the next steps and any documentation required.\n\nLooking forward to starting.\n\nBest,\n[Your Name]`
  }

  const packageLine = packageItems.length > 0
    ? `\n\nIn addition to the base compensation, I'd like to explore whether there is flexibility on: ${packageItems.map(p => `(a) ${p.item} — ${p.askAmount}`).join('; ')}.`
    : ''

  return `Subject: Re: ${inputs.roleTitle} Offer — Follow-up on Compensation\n\nDear [Hiring Manager Name],\n\nThank you for the offer to join ${inputs.companyName} as ${inputs.roleTitle} — I'm genuinely excited about the opportunity and the team.\n\nI've reviewed the offer carefully. Based on my research into the market for this role, seniority, and region, I was expecting a range of ${inputs.targetRange}. The current offer of ${inputs.offeredPackage} represents a ${Math.abs(inputs.gapPercent).toFixed(0)}% gap from my target.${packageLine}\n\nI'm confident in the value I'll bring to ${inputs.companyName} and I'd like to find a way to make this work. Would you be open to a brief call this week to discuss?\n\n${urgencyFlag ? urgencyFlag + '\n\n' : ''}Thank you again — I'm committed to finding a resolution and excited about the role.\n\nBest,\n[Your Name]`
}

function buildCounterRecommendationRationale(
  inputs: CounterOfferAnalysisInputs,
  rec: CounterOfferAnalysisResult['recommendation'],
): string {
  if (rec === 'counter_immediately') {
    return `The offer is ${Math.abs(inputs.gapPercent).toFixed(0)}% below your target and your leverage score is strong. Counter immediately and professionally — you have negotiating room.`
  }
  if (rec === 'negotiate_holistically') {
    return `The base gap is meaningful but not extreme. Negotiate the full package (base + equity + signing + flexibility) rather than a large base jump. You're more likely to succeed on total package than a large single-item ask.`
  }
  if (rec === 'accept_with_conditions') {
    return `Your financial runway (${inputs.runwayMonths} months) limits your negotiating power. Accept the offer with 1–2 small, low-risk asks (remote days, accelerated review). Do not push on base.`
  }
  if (rec === 'accept') {
    return `The offer meets or exceeds your target. Accept promptly — delays signal hesitation and may create friction before you start.`
  }
  return `Declining is warranted if the total package — after negotiation — cannot come within 15% of your target AND this company is the only offer.`
}

// ── 2. Layoff Survival Communication ─────────────────────────────────────────

export interface LayoffSurvivalCommunicationInputs {
  situation: 'rumours_only' | 'pip_issued' | 'layoff_announced' | 'in_rif_window' | 'post_termination'
  compositeScore: number
  seniorityBracket: 'junior' | 'mid' | 'senior' | 'principal'
  tenureYears: number
  visaConstrained: boolean
  runwayMonths: number
  hasPeerBeenLaidOff: boolean
  hasPackageInfo: boolean
}

export interface LayoffSurvivalCommunicationResult {
  situationSummary: string
  immediateActions: string[]
  whatToSayToManager: string
  whatNOTToSay: string[]
  documentationChecklist: string[]
  severanceNegotiationScript: string | null
  referenceProtectionScript: string
  legalConsiderationNote: string
}

export function computeLayoffSurvivalCommunication(
  inputs: LayoffSurvivalCommunicationInputs,
): LayoffSurvivalCommunicationResult {
  const { situation, compositeScore, seniorityBracket, tenureYears, visaConstrained, runwayMonths } = inputs

  const immediateActions: string[] = []
  let whatToSayToManager = ''
  let severanceNegotiationScript: string | null = null

  if (situation === 'rumours_only') {
    immediateActions.push('Do NOT ask HR or your manager directly — it signals you are tracking exits and may make you a more convenient cut')
    immediateActions.push('Start your parallel job search TODAY — do not wait for confirmation')
    immediateActions.push('Back up all personal files, contacts, and work samples to personal devices (only items you are legally permitted to retain)')
    immediateActions.push('Ensure your work is well-documented and your manager knows your current projects\' status — visibility protects you')
    whatToSayToManager = 'Nothing about the rumours. Instead, schedule a 1:1 and say: "I wanted to give you a project update and make sure my priorities align with what the team needs most right now." Demonstrate value, not anxiety.'
  }

  if (situation === 'pip_issued') {
    immediateActions.push('Request the PIP in writing if not already provided — verbal PIPs have limited legal standing')
    immediateActions.push('Review the PIP criteria carefully — every target must be specific and measurable; vague PIPs are challengeable')
    immediateActions.push('Begin job search immediately — PIP completion rates at companies reducing headcount are very low regardless of performance')
    immediateActions.push('Document all communications with your manager and HR from this point forward — date-stamped emails, not verbal conversations')
    whatToSayToManager = '"Thank you for being direct. I want to understand the specific metrics that will demonstrate improvement. Can we review each criterion together and agree on how success will be measured?" This is professional and creates a paper trail.'
    severanceNegotiationScript = `"I'd like to discuss an alternative arrangement. Given my ${tenureYears} years of service, would ${companyName_placeholder} consider a mutual separation with a severance package rather than proceeding through the PIP process? This saves both parties significant time and maintains a positive relationship."`
  }

  if (situation === 'layoff_announced') {
    immediateActions.push('Get the layoff notice in writing BEFORE signing anything')
    immediateActions.push('Do NOT sign a separation agreement on the day it is presented — you have time to review')
    immediateActions.push(`Severance is negotiable — especially at ${seniorityBracket === 'senior' || seniorityBracket === 'principal' ? 'your seniority level' : 'any level'}`)
    if (visaConstrained) {
      immediateActions.push('Contact an immigration attorney TODAY — your visa status and grace period starts from termination date, not when you find out')
    }
    whatToSayToManager = '"Thank you for telling me directly. I\'d appreciate a few days to review the separation agreement carefully before responding. Can we schedule a follow-up call on [specific date]?" This is professional and buys you time.'
    severanceNegotiationScript = buildSeveranceScript(inputs)
  }

  if (situation === 'in_rif_window') {
    immediateActions.push('Act normally — do not tip off that you are in active search; it may accelerate your inclusion in the next round')
    immediateActions.push('Increase your value-demonstration: complete a visible piece of work before the next leadership review')
    immediateActions.push('Strengthen relationships with the decision-makers — the people deciding cuts value people they know and trust')
    whatToSayToManager = '"I wanted to check in on how the team is navigating the current changes. Is there anything I can take off your plate or prioritise differently to be most useful right now?"'
  }

  if (situation === 'post_termination') {
    immediateActions.push('File for unemployment benefits on Day 1 — do not wait; the claim period starts from termination date')
    immediateActions.push('Understand your health insurance continuation rights (COBRA in US; NHS in UK) and timelines')
    immediateActions.push('Review your separation agreement for non-compete and non-solicitation clauses — most are unenforceable for individual contributors')
    if (visaConstrained) {
      immediateActions.push(`You are now in your ${inputs.visaConstrained ? '60-day' : 'grace'} period — contact an immigration attorney today`)
    }
    whatToSayToManager = 'Send a brief email: "Thank you for the opportunity to work together. I\'ve valued the experience and the team. I\'ll complete all transition steps professionally. Please keep me in mind for references." Keep it brief, professional, and non-emotional.'
  }

  const referenceProtectionScript = `When asking for references:\n"Hi [Manager Name], I'm beginning my next search. You've seen my work closely and I'd love to list you as a reference. Would you be comfortable providing a strong reference for [specific skills/achievements]?"\n\nAlways ask explicitly and early — never assume references are positive. If a manager hesitates, they are telling you something. Do not list them.`

  const documentationChecklist = [
    'Save your performance reviews (last 3 years) to a personal device',
    'Save your employment contract and any written promises made (bonus, equity, promotion)',
    'Save the separation agreement with the exact date you received it',
    'Record the names of HR representative and manager present at the termination meeting',
    'Note your last working day and any paid notice period provisions',
    tenureYears >= 3 ? 'Calculate your accrued but unused PTO — it should be paid out in most jurisdictions' : 'Verify PTO payout policy',
    'Save equity/stock vesting schedule — unvested equity vesting accelerates in some separation agreements',
  ]

  const legalConsiderationNote = runwayMonths <= 3
    ? `Legal review is strongly recommended given your short runway. A 30-minute consultation with an employment attorney (most offer free first consultations) can identify whether your severance is negotiable and flag any issues in the separation agreement.`
    : `If you were laid off with a non-standard separation agreement or after a PIP, a 30-minute consultation with an employment attorney is worth the cost. Many agreements have unenforceable clauses candidates unknowingly sign away rights to.`

  return {
    situationSummary: buildSituationSummary(situation, compositeScore, runwayMonths),
    immediateActions,
    whatToSayToManager,
    whatNOTToSay: buildWhatNotToSay(situation, visaConstrained),
    documentationChecklist,
    severanceNegotiationScript,
    referenceProtectionScript,
    legalConsiderationNote,
  }
}

const companyName_placeholder = '[company name]'

function buildSeveranceScript(inputs: LayoffSurvivalCommunicationInputs): string {
  const { tenureYears, seniorityBracket, runwayMonths } = inputs
  const base = tenureYears >= 5
    ? `Given my ${tenureYears} years of service and the institutional knowledge I hold, I'd like to discuss whether the standard severance package can be enhanced. Specifically, I'd like to ask for [X additional weeks], continuation of health benefits through [date], and a reference letter confirming my departure was due to company restructuring, not performance.`
    : `I'd appreciate a conversation about the separation terms. While I understand the company's constraints, I'd like to ask about extending the severance by [2–4 weeks] and confirming my departure as "company restructuring" in any reference inquiries.`

  const urgency = runwayMonths <= 2
    ? ` Additionally, given my financial situation, I'd like to negotiate an accelerated payout of the severance rather than payment over the notice period.`
    : ''

  return `"${base}${urgency}"\n\nDelivery: Request this conversation in a written email first, then follow up by phone. HR negotiates severance regularly — your ask will not surprise them and most companies have discretionary budget for this.`
}

function buildSituationSummary(situation: LayoffSurvivalCommunicationInputs['situation'], score: number, runway: number): string {
  if (situation === 'post_termination') {
    return `You have been terminated. Runway: ${runway} months. Immediate priority: unemployment filing, visa timeline (if applicable), and reference protection. Your score of ${score} accurately predicted this — the intelligence signals were correct.`
  }
  if (situation === 'layoff_announced') {
    return `A layoff has been announced. Risk score: ${score}. Do not sign anything today. Severance negotiation and reference protection are your two most important immediate actions.`
  }
  return `Risk score of ${score} indicates ${score >= 65 ? 'high' : score >= 45 ? 'elevated' : 'moderate'} exposure. Runway: ${runway} months. Start parallel search now — waiting for confirmation reduces your options.`
}

function buildWhatNotToSay(
  situation: LayoffSurvivalCommunicationInputs['situation'],
  visaConstrained: boolean,
): string[] {
  const list = [
    'Do not say "I know I\'m on the list" — never confirm you have intelligence about your own status',
    'Do not say "I have another offer" unless you are prepared to act on it immediately',
    'Do not express anger or resentment — it ends reference relationships permanently',
    'Do not share your financial situation or desperation — it weakens every negotiation position',
  ]
  if (situation === 'pip_issued') {
    list.push('Do not say "I don\'t agree with this PIP" on the spot — respond in writing after careful review')
    list.push('Do not sign the PIP acknowledgement during the meeting — ask for 24 hours to review')
  }
  if (visaConstrained) {
    list.push('Do not say "I need this job for my visa" — it removes all negotiating leverage immediately')
  }
  return list
}

// ── 3. Multi-Offer Comparison ─────────────────────────────────────────────────

export interface OfferForComparison {
  companyName: string
  roleTitle: string
  baseSalary: number           // in user's local currency
  bonus: number                // annual target, same currency
  equityAnnualValue: number    // estimated annual RSU/option value, same currency
  signingBonus: number
  ptoDays: number
  remoteDaysPerWeek: number
  companyStage: 'startup' | 'growth' | 'mature' | 'enterprise'
  offerDeadline: string        // "2026-06-05"
  growthPotential: 1 | 2 | 3 | 4 | 5
  jobSatisfactionFit: 1 | 2 | 3 | 4 | 5
  managerQuality: 1 | 2 | 3 | 4 | 5
  companyStability: 1 | 2 | 3 | 4 | 5
}

export interface MultiOfferComparisonResult {
  winnerCompanyName: string
  winnerRationale: string
  offerScores: Array<{
    companyName: string
    totalScore: number
    totalCompensation: number
    rank: number
    strengths: string[]
    weaknesses: string[]
    redFlags: string[]
  }>
  decisionMatrix: Array<{
    dimension: string
    weight: number
    scores: Record<string, number>  // companyName → score
  }>
  negotiationOpportunity: string
  /** What good enough looks like across all offers */
  acceptanceThreshold: string
}

export function computeMultiOfferComparison(
  offers: OfferForComparison[],
  userPriority: 'stability' | 'growth' | 'compensation' | 'balance',
): MultiOfferComparisonResult {
  if (offers.length === 0) {
    return { winnerCompanyName: '', winnerRationale: 'No offers to compare.', offerScores: [], decisionMatrix: [], negotiationOpportunity: '', acceptanceThreshold: '' }
  }

  // Weights depend on user priority
  const WEIGHT_SETS: Record<typeof userPriority, Record<string, number>> = {
    stability:     { comp: 2, equity: 1, growth: 2, satisfaction: 2, manager: 2, stability: 4, remote: 1 },
    growth:        { comp: 2, equity: 3, growth: 4, satisfaction: 2, manager: 2, stability: 1, remote: 1 },
    compensation:  { comp: 4, equity: 3, growth: 2, satisfaction: 1, manager: 1, stability: 2, remote: 1 },
    balance:       { comp: 2, equity: 2, growth: 2, satisfaction: 3, manager: 2, stability: 2, remote: 2 },
  }
  const weights = WEIGHT_SETS[userPriority]

  const offerScores = offers.map(offer => {
    const totalComp = offer.baseSalary + offer.bonus + offer.equityAnnualValue + (offer.signingBonus / 4)
    // Normalize each dimension 1–5 relative to all offers
    const compScore = normalizeAmong(totalComp, offers.map(o => o.baseSalary + o.bonus + o.equityAnnualValue))
    const equityScore = normalizeAmong(offer.equityAnnualValue, offers.map(o => o.equityAnnualValue))
    const growthScore = offer.growthPotential
    const satisfactionScore = offer.jobSatisfactionFit
    const managerScore = offer.managerQuality
    const stabilityScore = offer.companyStability
    const remoteScore = Math.min(5, offer.remoteDaysPerWeek + 1)

    const totalScore =
      compScore * weights.comp +
      equityScore * weights.equity +
      growthScore * weights.growth +
      satisfactionScore * weights.satisfaction +
      managerScore * weights.manager +
      stabilityScore * weights.stability +
      remoteScore * weights.remote

    const strengths: string[] = []
    const weaknesses: string[] = []
    const redFlags: string[] = []

    if (compScore >= 4) strengths.push('Top-quartile total compensation')
    if (offer.growthPotential >= 4) strengths.push('High growth potential')
    if (offer.managerQuality >= 4) strengths.push('Strong manager quality')
    if (offer.companyStability >= 4) strengths.push('High company stability')
    if (offer.remoteDaysPerWeek >= 3) strengths.push(`${offer.remoteDaysPerWeek}d/week remote`)

    if (compScore <= 2) weaknesses.push('Below-median total compensation')
    if (offer.growthPotential <= 2) weaknesses.push('Limited growth visibility')
    if (offer.managerQuality <= 2) weaknesses.push('Manager quality concerns flagged')

    if (offer.companyStage === 'startup' && offer.equityAnnualValue === 0) redFlags.push('Startup offering no meaningful equity is a significant red flag')
    if (offer.companyStability <= 1) redFlags.push('Company stability score is very low — verify financial health before accepting')

    return { companyName: offer.companyName, totalScore, totalCompensation: totalComp, strengths, weaknesses, redFlags, rank: 0 }
  }).sort((a, b) => b.totalScore - a.totalScore).map((o, i) => ({ ...o, rank: i + 1 }))

  const winner = offerScores[0]

  // Negotiation opportunity: if #1 and #2 are within 8% of each other, use #2 as leverage against #1
  const runnerUp = offerScores[1]
  const negotiationOpportunity = runnerUp
    ? `${winner.companyName} leads by ${((winner.totalScore - runnerUp.totalScore) / runnerUp.totalScore * 100).toFixed(0)}%. If the gap is < 15%, inform ${winner.companyName} that you have a competing offer from ${runnerUp.companyName} to see if they can improve their package before you decide.`
    : 'Only one offer — negotiate from current benchmarks rather than a competing offer.'

  const decisionMatrix = [
    { dimension: 'Total Compensation', weight: weights.comp, scores: Object.fromEntries(offers.map(o => [o.companyName, normalizeAmong(o.baseSalary + o.bonus + o.equityAnnualValue, offers.map(x => x.baseSalary + x.bonus + x.equityAnnualValue))])) },
    { dimension: 'Growth Potential', weight: weights.growth, scores: Object.fromEntries(offers.map(o => [o.companyName, o.growthPotential])) },
    { dimension: 'Job Satisfaction Fit', weight: weights.satisfaction, scores: Object.fromEntries(offers.map(o => [o.companyName, o.jobSatisfactionFit])) },
    { dimension: 'Manager Quality', weight: weights.manager, scores: Object.fromEntries(offers.map(o => [o.companyName, o.managerQuality])) },
    { dimension: 'Company Stability', weight: weights.stability, scores: Object.fromEntries(offers.map(o => [o.companyName, o.companyStability])) },
  ]

  return {
    winnerCompanyName: winner.companyName,
    winnerRationale: `${winner.companyName} ranks #1 on a weighted ${userPriority} priority matrix. ${winner.strengths.slice(0, 2).join(' and ')} are the key differentiators.`,
    offerScores,
    decisionMatrix,
    negotiationOpportunity,
    acceptanceThreshold: `Accept if ${winner.companyName} maintains or improves their current offer. If they reduce any component, compare total score against #2 (${runnerUp?.companyName ?? 'next best'}) again.`,
  }
}

function normalizeAmong(value: number, allValues: number[]): number {
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  if (max === min) return 3
  return 1 + ((value - min) / (max - min)) * 4
}

// ── 4. Risk-Aware Resignation Planning ───────────────────────────────────────

export interface ResignationPlanInputs {
  runwayMonths: number
  visaConstrained: boolean
  visaGracePeriodDays: number
  unvestedEquityMonths: number  // how many months until next vesting cliff
  noticePeriodMonths: number
  currentRiskScore: number
  hasDependents: boolean
  newCompanyStartDate: string   // ISO date
  offerLetterReceived: boolean  // MUST be true before any resignation advice
}

export interface ResignationPlanResult {
  readyToResign: boolean
  notReadyReason: string | null
  optimalResignationDate: string
  resignationEmailScript: string
  counterOfferResponseScript: string
  noticePeriodStrategy: string
  equityProtectionNote: string
  visaTransitionNote: string | null
  referenceStrategy: string
}

export function computeResignationPlan(
  inputs: ResignationPlanInputs,
): ResignationPlanResult {
  const {
    offerLetterReceived,
    unvestedEquityMonths,
    visaConstrained,
    visaGracePeriodDays,
    noticePeriodMonths,
    currentRiskScore,
    hasDependents,
    newCompanyStartDate,
  } = inputs

  if (!offerLetterReceived) {
    return {
      readyToResign: false,
      notReadyReason: 'You do not yet have a written offer letter. NEVER resign based on a verbal offer — 3% of verbal offers are rescinded before paperwork is issued. Wait for the letter.',
      optimalResignationDate: '',
      resignationEmailScript: '',
      counterOfferResponseScript: '',
      noticePeriodStrategy: '',
      equityProtectionNote: '',
      visaTransitionNote: null,
      referenceStrategy: '',
    }
  }

  // Check equity cliff — if vesting in < 4 weeks, delay resignation by up to 4 weeks
  const equityProtectionNote = unvestedEquityMonths <= 1
    ? `⚠️ You have a vesting cliff within 1 month. Delay your resignation by ${unvestedEquityMonths * 30} days if possible to capture the next vest. Contact your new company to delay the start date by 2–3 weeks.`
    : `Your next equity vest is in ${unvestedEquityMonths} months — resignation now does not cost you a cliff.`

  const visaTransitionNote = visaConstrained
    ? `Your visa grace period is ${visaGracePeriodDays} days after employment ends. Ensure your new company has confirmed your visa transfer/sponsorship IN WRITING before you resign. Do not rely on verbal assurances.`
    : null

  const optimalResignationDate = `Resign immediately after receiving the offer letter. Your last day = today + ${noticePeriodMonths} months (as per your contract).`

  const resignationEmailScript = buildResignationEmail(noticePeriodMonths)

  const counterOfferResponseScript = `When your manager makes a counter-offer (they likely will): "I appreciate the offer and I'm genuinely grateful for everything I've learned here. This is a decision I've made carefully and I'm committed to it. I want to ensure the smoothest possible transition for the team." Do NOT negotiate on the counter. 80% of people who accept counter-offers leave within 12 months — the underlying reasons for leaving don't change with a pay raise.`

  const noticePeriodStrategy = currentRiskScore >= 65
    ? `Your risk score is ${currentRiskScore} — the company may already be considering your position. Give full notice professionally, but do not share sensitive information about your new role. The company may opt to release you early (with or without pay depending on your contract) — this is fine.`
    : `Serve your full notice period professionally. Use it to: document your work, transfer knowledge to your replacement, and strengthen the relationships that will become your references.`

  const referenceStrategy = `In your last 2 weeks: ask your manager and 2 senior colleagues directly for a LinkedIn recommendation. Frame it as: "As I transition, I'd love a recommendation reflecting [specific project or skill]. It would mean a lot coming from you." Getting this done before you leave is vastly easier than asking after departure.`

  return {
    readyToResign: true,
    notReadyReason: null,
    optimalResignationDate,
    resignationEmailScript,
    counterOfferResponseScript,
    noticePeriodStrategy,
    equityProtectionNote,
    visaTransitionNote,
    referenceStrategy,
  }
}

function buildResignationEmail(noticePeriodMonths: number): string {
  const lastDayNote = noticePeriodMonths === 1
    ? 'My last working day will be [date — exactly 1 month from today].'
    : `My last working day will be [date — ${noticePeriodMonths} months from today].`

  return `Subject: Resignation — [Your Full Name]\n\nDear [Manager First Name],\n\nI am writing to formally notify you of my resignation from my position at [Company Name].\n\n${lastDayNote}\n\nI want to express my sincere gratitude for the opportunities I've had here. I've grown significantly in my role and valued the experience of working with you and the team.\n\nI am fully committed to ensuring a smooth transition. Please let me know how I can best support the handover process during my notice period.\n\nThank you again for everything.\n\nBest regards,\n[Your Name]`
}

// ── 5. Compensation Playbook ──────────────────────────────────────────────────

export interface CompensationPlaybookInputs {
  rolePrefix: string
  seniorityBracket: 'junior' | 'mid' | 'senior' | 'principal'
  region: 'india' | 'us' | 'uk' | 'sg' | 'default'
  currentAnnualSalaryUsd: number
  targetCompanyStage: 'startup' | 'growth' | 'mature' | 'enterprise'
}

export interface CompensationPlaybook {
  marketPosition: 'significantly_under' | 'under' | 'at' | 'above' | 'significantly_above'
  marketMidpointUsd: number
  marketRangeFormatted: string
  percentileEstimate: number   // where user sits in market distribution
  /** Exact numbers to quote in each negotiation scenario */
  negotiationScripts: {
    whatAmIWorth: string       // When asked "what are you worth?"
    whatAmILooking: string     // When asked "what are you looking for?"
    currentCTCResponse: string // When asked current CTC
    counterToLowball: string   // When first offer is 20%+ below target
  }
  equityExpectations: string
  bonusExpectations: string
  benchmarkSources: string[]
}

// Reuse SALARY_BENCHMARKS structure via cross-reference to jobTargetingEngine
// (inline data here for independence from jobTargetingEngine import cycle)
const COMP_PLAYBOOK_DATA: Record<string, Record<string, Record<string, { minUsd: number; medianUsd: number; maxUsd: number }>>> = {
  sw: {
    india: { junior: { minUsd: 9600, medianUsd: 14500, maxUsd: 22000 }, mid: { minUsd: 18000, medianUsd: 28000, maxUsd: 48000 }, senior: { minUsd: 36000, medianUsd: 54000, maxUsd: 84000 }, principal: { minUsd: 60000, medianUsd: 90000, maxUsd: 144000 } },
    us:    { junior: { minUsd: 90000, medianUsd: 115000, maxUsd: 150000 }, mid: { minUsd: 140000, medianUsd: 175000, maxUsd: 230000 }, senior: { minUsd: 180000, medianUsd: 240000, maxUsd: 360000 }, principal: { minUsd: 250000, medianUsd: 340000, maxUsd: 520000 } },
    uk:    { junior: { minUsd: 48000, medianUsd: 62000, maxUsd: 85000 }, mid: { minUsd: 72000, medianUsd: 96000, maxUsd: 135000 }, senior: { minUsd: 100000, medianUsd: 135000, maxUsd: 190000 }, principal: { minUsd: 140000, medianUsd: 185000, maxUsd: 260000 } },
    sg:    { junior: { minUsd: 42000, medianUsd: 54000, maxUsd: 75000 }, mid: { minUsd: 66000, medianUsd: 90000, maxUsd: 125000 }, senior: { minUsd: 96000, medianUsd: 130000, maxUsd: 180000 }, principal: { minUsd: 130000, medianUsd: 175000, maxUsd: 240000 } },
    default: { junior: { minUsd: 9600, medianUsd: 14500, maxUsd: 22000 }, mid: { minUsd: 18000, medianUsd: 28000, maxUsd: 48000 }, senior: { minUsd: 36000, medianUsd: 54000, maxUsd: 84000 }, principal: { minUsd: 60000, medianUsd: 90000, maxUsd: 144000 } },
  },
  fin: {
    india: { junior: { minUsd: 7200, medianUsd: 12000, maxUsd: 20000 }, mid: { minUsd: 14400, medianUsd: 24000, maxUsd: 42000 }, senior: { minUsd: 28000, medianUsd: 48000, maxUsd: 84000 }, principal: { minUsd: 60000, medianUsd: 96000, maxUsd: 168000 } },
    us:    { junior: { minUsd: 75000, medianUsd: 95000, maxUsd: 130000 }, mid: { minUsd: 110000, medianUsd: 150000, maxUsd: 220000 }, senior: { minUsd: 160000, medianUsd: 230000, maxUsd: 380000 }, principal: { minUsd: 230000, medianUsd: 350000, maxUsd: 600000 } },
    uk:    { junior: { minUsd: 44000, medianUsd: 58000, maxUsd: 82000 }, mid: { minUsd: 64000, medianUsd: 90000, maxUsd: 140000 }, senior: { minUsd: 96000, medianUsd: 145000, maxUsd: 240000 }, principal: { minUsd: 140000, medianUsd: 210000, maxUsd: 400000 } },
    sg:    { junior: { minUsd: 38000, medianUsd: 52000, maxUsd: 75000 }, mid: { minUsd: 58000, medianUsd: 84000, maxUsd: 130000 }, senior: { minUsd: 90000, medianUsd: 130000, maxUsd: 200000 }, principal: { minUsd: 130000, medianUsd: 190000, maxUsd: 320000 } },
    default: { junior: { minUsd: 7200, medianUsd: 12000, maxUsd: 20000 }, mid: { minUsd: 14400, medianUsd: 24000, maxUsd: 42000 }, senior: { minUsd: 28000, medianUsd: 48000, maxUsd: 84000 }, principal: { minUsd: 60000, medianUsd: 96000, maxUsd: 168000 } },
  },
  pm: {
    india: { junior: { minUsd: 9600, medianUsd: 14400, maxUsd: 21600 }, mid: { minUsd: 18000, medianUsd: 28800, maxUsd: 42000 }, senior: { minUsd: 30000, medianUsd: 50000, maxUsd: 72000 }, principal: { minUsd: 48000, medianUsd: 80000, maxUsd: 108000 } },
    us:    { junior: { minUsd: 100000, medianUsd: 130000, maxUsd: 160000 }, mid: { minUsd: 150000, medianUsd: 190000, maxUsd: 240000 }, senior: { minUsd: 210000, medianUsd: 275000, maxUsd: 350000 }, principal: { minUsd: 280000, medianUsd: 380000, maxUsd: 480000 } },
    uk:    { junior: { minUsd: 56000, medianUsd: 72000, maxUsd: 100000 }, mid: { minUsd: 88000, medianUsd: 112000, maxUsd: 150000 }, senior: { minUsd: 125000, medianUsd: 160000, maxUsd: 213000 }, principal: { minUsd: 175000, medianUsd: 220000, maxUsd: 300000 } },
    sg:    { junior: { minUsd: 45000, medianUsd: 56000, maxUsd: 75000 }, mid: { minUsd: 68000, medianUsd: 88000, maxUsd: 113000 }, senior: { minUsd: 98000, medianUsd: 130000, maxUsd: 165000 }, principal: { minUsd: 135000, medianUsd: 180000, maxUsd: 225000 } },
    default: { junior: { minUsd: 9600, medianUsd: 14400, maxUsd: 21600 }, mid: { minUsd: 18000, medianUsd: 28800, maxUsd: 42000 }, senior: { minUsd: 30000, medianUsd: 50000, maxUsd: 72000 }, principal: { minUsd: 48000, medianUsd: 80000, maxUsd: 108000 } },
  },
  default: {
    default: { junior: { minUsd: 8000, medianUsd: 14000, maxUsd: 22000 }, mid: { minUsd: 16000, medianUsd: 26000, maxUsd: 44000 }, senior: { minUsd: 28000, medianUsd: 46000, maxUsd: 78000 }, principal: { minUsd: 50000, medianUsd: 80000, maxUsd: 130000 } },
  },
}

function formatPlaybookComp(usd: number, region: string): string {
  if (region === 'india') {
    const lakhs = Math.round(usd * 83.5 / 100000)
    return `₹${lakhs}L`
  }
  if (region === 'us') return `$${Math.round(usd / 1000)}K`
  if (region === 'uk') return `£${Math.round(usd * 0.79 / 1000)}K`
  if (region === 'sg') return `S$${Math.round(usd * 1.35 / 1000)}K`
  return `$${Math.round(usd / 1000)}K`
}

export function computeCompensationPlaybook(inputs: CompensationPlaybookInputs): CompensationPlaybook {
  const { rolePrefix, seniorityBracket, region, currentAnnualSalaryUsd, targetCompanyStage } = inputs

  const roleData = COMP_PLAYBOOK_DATA[rolePrefix] ?? COMP_PLAYBOOK_DATA['default']
  const regionData = roleData[region] ?? roleData['default'] ?? COMP_PLAYBOOK_DATA['default']['default']
  const benchmark = regionData[seniorityBracket] ?? regionData['senior']

  const { minUsd, medianUsd, maxUsd } = benchmark

  const deltaPercent = ((currentAnnualSalaryUsd - medianUsd) / medianUsd) * 100

  let marketPosition: CompensationPlaybook['marketPosition']
  if (deltaPercent < -20) marketPosition = 'significantly_under'
  else if (deltaPercent < -8) marketPosition = 'under'
  else if (deltaPercent <= 8) marketPosition = 'at'
  else if (deltaPercent <= 25) marketPosition = 'above'
  else marketPosition = 'significantly_above'

  const percentileEstimate = Math.max(5, Math.min(95, Math.round(50 + (deltaPercent * 1.5))))

  // Target range = median + 10–20% (position above market midpoint)
  const targetMin = formatPlaybookComp(medianUsd * 1.05, region)
  const targetMax = formatPlaybookComp(Math.min(maxUsd, medianUsd * 1.25), region)
  const marketRangeFormatted = `${formatPlaybookComp(minUsd, region)} – ${formatPlaybookComp(maxUsd, region)}`

  // Stage-specific premium
  const stagePremium = targetCompanyStage === 'startup' ? '+ meaningful equity (ESOPs/options)'
    : targetCompanyStage === 'growth' ? '+ ESOPs or RSUs at pre-IPO valuation'
    : targetCompanyStage === 'enterprise' ? '+ RSUs (predictable liquidity)'
    : ''

  const negotiationScripts = {
    whatAmIWorth: `"Based on my ${seniorityBracket} experience in ${rolePrefix.toUpperCase()} and market data for ${region} (Levels.fyi, LinkedIn Salary Insights, Glassdoor Q1 2026), the market range for this role is ${marketRangeFormatted}. I'm targeting ${targetMin}–${targetMax} ${stagePremium}."`,
    whatAmILooking: `"I'm targeting ${targetMin}–${targetMax} in base, ${stagePremium}. I'm flexible on the structure — total package is what matters to me."`,
    currentCTCResponse: `"I'd prefer to share my target range rather than anchoring to a past number — the role and company context matter more. I'm targeting ${targetMin}–${targetMax}. Does that align with your band?"`,
    counterToLowball: `"Thank you for the offer. I've reviewed it carefully and I was expecting ${targetMin}–${targetMax} based on market data and the scope of this role. The current offer is ${Math.abs(deltaPercent).toFixed(0)}% below that range. Can we explore how to close the gap — whether through base, signing bonus, or equity?"`,
  }

  const equityExpectations = targetCompanyStage === 'startup'
    ? 'Expect 0.1–0.5% equity for senior, 0.5–2% for principal. Verify: (a) preferred vs. common shares, (b) 409A valuation, (c) vesting cliff and schedule.'
    : targetCompanyStage === 'growth'
      ? 'RSUs or pre-IPO options: ask for the annual grant value in USD equivalent. At a Series D+ company, expect $20K–$100K/yr at senior level.'
      : 'Public company RSUs: ask for the number of shares and current share price to calculate annual value. Expect 4-year vesting with 1-year cliff.'

  const bonusExpectations = rolePrefix === 'fin' || rolePrefix === 'cons'
    ? 'Finance/consulting roles: 20–100% variable is standard. Verify: target vs. maximum, discretionary vs. formulaic, bonus clawback provisions.'
    : 'For most tech roles: 10–20% annual target bonus. Verify: individual vs. company target, when it pays out, and whether it pro-rates in year 1.'

  return {
    marketPosition,
    marketMidpointUsd: medianUsd,
    marketRangeFormatted,
    percentileEstimate,
    negotiationScripts,
    equityExpectations,
    bonusExpectations,
    benchmarkSources: ['Levels.fyi Q1 2026', 'LinkedIn Salary Insights', 'Glassdoor Salary Intelligence', 'Naukri Salary Insights (India)', 'HumanProof Calibration Dataset'],
  }
}
