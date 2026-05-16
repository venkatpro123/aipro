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
  /** 2–3 specific conversation openers */
  scripts: string[];
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
  const { risks, redLines } = buildRisksAndRedLines(leverageRating, currentScore, runwayTier, inputs.userProfile ?? null);

  return {
    leverageRating,
    leverageScore,
    recommendedTactic: tactic,
    specificAsk,
    timingWindow,
    batnaStrength,
    scripts,
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
