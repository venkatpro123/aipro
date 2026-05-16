// ActionPlanTab.tsx
// Actionable recommendations — Answers "What should I do about it?"
// Displays: Dynamic personalized action plan, progress tracking, career twin matches,
//           strategic resources with real links, and role-specific course recommendations.

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Circle, Filter, Download, Zap, ArrowRight,
  Search, BarChart, Shield, BookOpen, Users, TrendingUp,
  Clock, Target, Cpu, Brain, AlertTriangle, ChevronRight,
  Star, ExternalLink, DollarSign,
} from "lucide-react";
import { SectionHeader } from "./common/SectionHeader";
import { CollapsibleSection } from "./common/CollapsibleSection";
import { CareerTwinCard } from "@/components/CareerTwinCard";
import { ActionDependencyGraph, assignPhase } from "../../components/ActionDependencyGraph";
import { getCareerIntelligence } from "@/data/intelligence";
import { getCitiesForRole, formatSalaryPremium, getCityCompanyIntersection } from "@/data/cityOpportunities";
import { getActionLearningTime, getSkillLearningWeeks } from "@/data/skillLearningHours";
import { TimeAvailableTrack, TRACKS } from "../../components/TimeAvailableTrack";
import type { TrackType } from "../../components/TimeAvailableTrack";
import { FinancialContextInput } from "../../components/FinancialContextInput";
import { CareerCapitalAssessment } from "../../components/CareerCapitalAssessment";
import { PeerBenchmarkPanel } from "../../components/PeerBenchmarkPanel";
import {
  loadFinancialContext,
  loadCityKey,
  deriveFinancialProfile,
  getPerformanceCollapseStrategy,
  type FinancialProfile,
} from "@/services/financialContextService";
import {
  computeScoreVelocity,
  getUserReturnType,
} from "@/services/scoreDeltaService";
import {
  deriveSeniorityBracket,
  describeBracketSignals,
  getAdaptiveRoleActions,
  BRACKET_ORDER,
  BRACKET_LABELS,
  type SeniorityBracket,
} from "@/services/seniorityActionEngine";
import {
  getPersonalizedActions,
  getRoleGroupLabel,
  resolveRoleGroup,
  scoreToRiskLevel,
} from "@/services/actionPersonalizationEngine";
import { generateCareerInsurancePlan } from "@/services/careerInsuranceEngine";
import { generateTrajectoryProjection } from "@/services/trajectoryProjection";
import { getMarketDemandSignals } from "@/services/marketDemandSignals";
import { CareerInsuranceKit } from "@/components/CareerInsuranceKit";
import { FinancialImpactCalculator } from "@/components/FinancialImpactCalculator";
import { SeniorityBracketConfirmation } from "@/components/SeniorityBracketConfirmation";
import {
  getCareerPathMarket,
  getCareerPathMarketSync,
  formatDemandTrendLabel,
  formatSuccessRate,
  isMarketDataStale,
  marketDataAgeLabel,
  type CareerPathMarket,
} from "@/services/careerPathMarket";
import { useAdaptiveSystem } from "@/hooks/useAdaptiveSystem";
import { useHumanProof } from "@/context/HumanProofContext";
import { rankAndUnwrap } from "@/services/actionRankingService";
import type { TabProps } from "./common/types";
import type { ActionPlanItem } from "@/types/hybridResult";
// v12.0 panels
import { NegotiationIntelligencePanel } from "./common/NegotiationIntelligencePanel";
import CompensationRiskPanel from "./common/CompensationRiskPanel";

// ---------------------------------------------------------------------------
// Role-aware recommendation generator
// Produces specific, non-generic action items based on role, score, and company context.
// ---------------------------------------------------------------------------

const ROLE_SPECIFIC_ACTIONS: Record<string, Partial<ActionPlanItem>[]> = {
  // Software / Tech
  sw: [
    { title: "Ship an AI-Assisted Project to Production", description: "Build and deploy a feature using GitHub Copilot, Cursor, or similar AI coding assistant. Document the productivity gain. This is now the baseline expectation for senior engineers.", layerFocus: "L3 · Role Displacement", riskReductionPct: 18 },
    { title: "Build a Personal AI Evaluation Framework", description: "Create a documented process for reviewing, testing, and quality-checking AI-generated code. Engineers who can validate AI outputs command 30–50% salary premiums.", layerFocus: "L3 · Role Displacement", riskReductionPct: 22 },
  ],
  fin: [
    { title: "Automate One Financial Model with Python/AI", description: "Replace a spreadsheet-based workflow with Python (pandas + OpenAI API). Document the time savings. FP&A teams that self-automate are retaining headcount while others shrink.", layerFocus: "L3 · Role Displacement", riskReductionPct: 20 },
    { title: "Earn an AI + Finance Certification", description: "Complete Wharton's 'AI for Finance' or CFI's 'Financial Modeling & AI' course. Credentials signal proactive adaptation and differentiate you in the next round cut.", layerFocus: "L3 · Role Displacement", riskReductionPct: 15 },
  ],
  hr: [
    { title: "Build a People Analytics Dashboard", description: "Use public tools (Tableau Public, Google Looker Studio) to build a retention or attrition prediction model from freely available workforce data. Demonstrates transition from admin to strategic HR.", layerFocus: "L3 · Role Displacement", riskReductionPct: 25 },
    { title: "Get Certified in AI-Augmented Recruiting", description: "Complete LinkedIn's 'AI in HR' or SHRM's AI upskilling program. AI-native recruiters close roles 40% faster and are insulated from ATS automation waves.", layerFocus: "L3 · Role Displacement", riskReductionPct: 18 },
  ],
  leg: [
    { title: "Master Contract AI Tools (Harvey, Lexis+)", description: "Get proficient in AI legal research and contract review tools. Legal professionals who can validate and supervise AI legal outputs will handle 3–5x more matters.", layerFocus: "L3 · Role Displacement", riskReductionPct: 22 },
    { title: "Specialize in AI Governance or Compliance Law", description: "EU AI Act and US AI regulation is creating urgent demand for lawyers who understand AI systems. A 40-hour certification in AI governance opens an uncrowded niche.", layerFocus: "L3 · Role Displacement", riskReductionPct: 28 },
  ],
  hc: [
    { title: "Get Certified in Clinical AI Tools", description: "Complete training on AI-assisted diagnostics platforms (Aidoc, Viz.ai, Tempus). Clinicians who work alongside AI systems are more productive and less vulnerable to scope reduction.", layerFocus: "L3 · Role Displacement", riskReductionPct: 15 },
    { title: "Build Expertise in AI-Human Care Protocols", description: "Develop and document protocols for integrating AI triage or diagnostic outputs into patient care workflows. Care coordination expertise is structurally irreplaceable.", layerFocus: "L3 · Role Displacement", riskReductionPct: 12 },
  ],
  cnt: [
    { title: "Build an AI-Augmented Content Portfolio", description: "Create a 5-piece portfolio demonstrating AI + human collaboration: use Claude/GPT for draft, add expert editorial layer, track audience metrics. This is the new baseline for content roles.", layerFocus: "L3 · Role Displacement", riskReductionPct: 20 },
    { title: "Specialize in AI Content Auditing", description: "Develop expertise in detecting, reviewing, and improving AI-generated content. Brands need human curators — not just human creators — and are willing to pay premiums.", layerFocus: "L3 · Role Displacement", riskReductionPct: 25 },
  ],
};

const getPrefix = (roleKey: string) => roleKey.split('_')[0];

/** Adjust deadline string by urgency multiplier (e.g. "30 days" × 1.3 → "23 days") */
function adjustDeadline(deadline: string, multiplier: number): string {
  if (multiplier === 1.0) return deadline;
  const match = deadline.match(/^(\d+)\s*(day|days|week|weeks)/i);
  if (!match) return deadline;
  const isWeeks = /week/i.test(match[2]);
  const unit = parseInt(match[1], 10) * (isWeeks ? 7 : 1); // normalise to days
  const adjusted = Math.max(1, Math.round(unit / multiplier));
  return adjusted < 7 ? `${adjusted} days` : `${Math.round(adjusted / 7)} week${Math.round(adjusted / 7) !== 1 ? 's' : ''}`;
}

/** Escalate priority one level when urgency is high */
function escalatePriority(priority: ActionPlanItem['priority'], urgencyMultiplier: number): ActionPlanItem['priority'] {
  if (urgencyMultiplier < 1.3) return priority;
  if (priority === 'Medium') return 'High';
  if (priority === 'High') return 'Critical';
  return priority;
}

export function buildDynamicActions(
  result: TabProps["result"],
  companyName: string,
  financialProfile?: FinancialProfile | null,
  selectedTrack: TrackType = 'moderate',
  liveMarketData?: CareerPathMarket | null,
  bracketOverride?: SeniorityBracket,
  /** City key for getCityCompanyIntersection. Pass explicitly — do not read localStorage inside this function. */
  cityKey?: string | null,
): ActionPlanItem[] {
  const score = result.total;
  const roleKey = result.workTypeKey;
  const prefix = getPrefix(roleKey);
  const intel = getCareerIntelligence(roleKey);
  const actions: ActionPlanItem[] = [];

  // Derive seniority bracket for all downstream action calibration
  const tenureYears = (result as any).userFactors?.tenureYears ?? (result as any).tenureYears ?? 3;
  const careerYears = (result as any).userFactors?.careerYears ?? (result as any).experienceYears ?? tenureYears;
  const performanceTier = (result as any).userFactors?.performanceTier ?? (result as any).performanceTier ?? 'unknown';
  const uniquenessDepth = (result as any).uniquenessDepth ?? (result as any).userFactors?.uniquenessDepth ?? 'generic';
  const seniorityBracket = bracketOverride ?? deriveSeniorityBracket(tenureYears, performanceTier, uniquenessDepth, careerYears);

  // ── v8.0: Hyper-specific role-matched actions from actionPersonalizationEngine ──
  // Uses the 47-role prefix database with India-specific variants for region IN.
  // These are injected as the FIRST actions (highest priority) because they are
  // specific to this exact role, seniority, risk level, and region combination.
  const region = (result as any).region ?? (result as any).companyRegion;
  const roleTitle = (result as any).roleTitle ?? result.workTypeKey ?? '';
  // v39.0 B1: pull profile signals from userFactors. handleCalculate already
  // merges UserProfile into userFactors at audit time, so the live profile
  // is available here without an extra context lookup.
  const uf = (result as any).userFactors ?? {};
  const userProfileLike = {
    visaStatus:         uf.visaStatus ?? null,
    savingsMonthsRunway: uf.savingsMonthsRunway ?? null,
    hasDependents:      uf.hasDependents ?? null,
    dualIncomeHousehold: uf.dualIncomeHousehold ?? null,
    priorLayoffSurvived: uf.priorLayoffSurvived ?? null,
    hasEquityVesting:   uf.hasEquityVesting ?? null,
    equityVestMonths:   uf.equityVestMonths ?? null,
    metroArea:          uf.metroArea ?? null,
  };
  const personalizedSet = getPersonalizedActions(roleTitle, seniorityBracket, score, region, undefined, undefined, userProfileLike);
  const personalizedActions: ActionPlanItem[] = personalizedSet.actions.map((a, i) => ({
    id: `personalized_${i}`,
    title: a.title ?? 'Action',
    description: a.description ?? '',
    priority: (a.priority as ActionPlanItem['priority']) ?? (score >= 65 ? 'Critical' : 'High'),
    layerFocus: a.layerFocus ?? 'L3 · Role Displacement',
    riskReductionPct: a.riskReductionPct ?? 15,
    deadline: a.deadline ?? '30 days',
    evidence: [{
      signal: `Role: ${getRoleGroupLabel(roleTitle)} · ${seniorityBracket} bracket · ${scoreToRiskLevel(score)} risk`,
      source: 'actionPersonalizationEngine v8.0',
      confidence: 'high' as const,
    }],
  }));

  // v13.0: Company-type strategic context note — injected as top action when archetype is known
  // This is the key accuracy fix: different companies get different strategic framing
  if (personalizedSet.companyContextNote && !personalizedSet.companyContextNote.includes('limited')) {
    personalizedActions.unshift({
      id: 'company_context_strategy',
      title: 'Company-Type Strategic Context',
      description: personalizedSet.companyContextNote,
      priority: score >= 70 ? 'Critical' : score >= 50 ? 'High' : 'Medium',
      layerFocus: 'D7 · Company Health',
      riskReductionPct: 8,
      deadline: 'Read first',
      evidence: [{ signal: 'Scenario archetype detection', source: 'scenarioNarrativeEngine v13.0', confidence: 'medium' as const }],
    });
  }

  // India-specific context note as a visible action item when present
  if (personalizedSet.indiaSpecificContext && region === 'IN') {
    personalizedActions.push({
      id: 'india_market_context',
      title: 'India Market Context',
      description: personalizedSet.indiaSpecificContext,
      priority: 'Medium',
      layerFocus: 'L4 · Market Conditions',
      riskReductionPct: 5,
      deadline: 'Ongoing',
      evidence: [{ signal: 'India sector intelligence', source: 'indiaSectorIntelligence v8.0', confidence: 'medium' as const }],
    });
  }

  // Inject personalized actions at the top of the list
  actions.push(...personalizedActions);

  // v6.0 Fix 7: Department freeze score Phase 0 action — inserted BEFORE score-tier action.
  // When the user's department shows a freeze score ≥ 65 and stage ≥ 2, the department-level
  // signal is more specific and more urgent than the company-wide score.
  // This is Phase 0: unlocks immediately, displayed before all other phases.
  const departmentFreezeScore = (result as any).departmentFreezeScore as number | null | undefined;
  const collapseStageForDept = result.collapseStage ?? null;
  const userDepartment = (result as any).userFactors?.department ?? (result as any).department ?? '';
  if (
    departmentFreezeScore != null &&
    departmentFreezeScore >= 65 &&
    collapseStageForDept != null &&
    collapseStageForDept >= 2
  ) {
    const freezeLabel = departmentFreezeScore >= 80 ? 'Critical Freeze' : 'Freeze';
    const leadTimeWeeks = departmentFreezeScore >= 80 ? '8–10' : '6–8';
    actions.push({
      id: `dept-freeze-phase0-${roleKey}`,
      title: `[Phase 0] ${userDepartment || 'Your Department'} Shows ${freezeLabel} Signal — Act ${leadTimeWeeks} Weeks Earlier`,
      description: `Your department shows a ${departmentFreezeScore}% hiring freeze score at ${companyName}. Departments entering ${freezeLabel} status are cut ${leadTimeWeeks} weeks before company-wide announcements. Your individual risk score (${score}/100) reflects company-level signals, but your department-level signal is higher. Begin your transition timeline ${leadTimeWeeks} weeks earlier than the overall score suggests.\n\nImmediate action: Update your CV this week to be application-ready. Do not wait for the announcement — by then you will be one of hundreds of candidates from the same company applying simultaneously. The competitive advantage of being first is weeks, not days.`,
      priority: "Critical",
      layerFocus: "L2 · Layoff & Instability History",
      riskReductionPct: 25,
      deadline: "This week — pre-announcement window",
    });
  }

  // 1. Score-based urgent action — seniority-calibrated framing
  if (score >= 75) {
    const seniorityFraming: Record<typeof seniorityBracket, string> = {
      junior:    `At your career stage, pivoting is faster and less costly than for mid-career professionals. Now is the time to build the new skills BEFORE you need them.`,
      mid:       `Mid-career professionals have the highest opportunity cost of delay — enough experience to pivot credibly but limited runway before responsibilities narrow choices.`,
      senior:    `Senior professionals often underestimate displacement risk because of past success. The data shows: seniority protects against immediate cuts but accelerates responsibility for adaptation.`,
      principal: `At principal level, displacement risk manifests differently — it is existential role shrinkage and org re-classification, not a layoff notice. The window for proactive repositioning is 12–24 months.`,
    };
    actions.push({
      id: `dyn-urgent-${roleKey}`,
      title: `Initiate Role Transition Planning — ${Math.round(score)}% Displacement Risk`,
      description: `Your risk score of ${score}/100 puts you in the top quartile for AI displacement. ${seniorityFraming[seniorityBracket]} Begin mapping an adjacent role transition now — the best time to start is 18 months before you need to.`,
      priority: "Critical",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 30,
      deadline: "30 days — start research phase",
    });
  } else if (score >= 55) {
    actions.push({
      id: `dyn-strategic-${roleKey}`,
      title: `Start Strategic Upskilling — Moderate Exposure Detected`,
      description: `Your score of ${score}/100 indicates moderate displacement risk. You are in the augmentation window — AI will enhance rather than replace your role, but only if you actively develop AI-adjacent skills. For a ${seniorityBracket === 'junior' ? 'junior professional, this means building foundations' : seniorityBracket === 'mid' ? 'mid-level professional, this means owning tool integration decisions' : seniorityBracket === 'senior' ? 'senior professional, this means establishing governance frameworks' : 'principal, this means defining organizational AI strategy'}. Focus on the 1–2 actions that will most differentiate you in the next hiring cycle.`,
      priority: "High",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 20,
      deadline: "60 days",
    });
  }

  // 2. Seniority-adaptive role actions — replaces generic ROLE_SPECIFIC_ACTIONS
  const { actions: seniorityRoleActions } = getAdaptiveRoleActions(prefix, seniorityBracket);
  for (const action of seniorityRoleActions.slice(0, 2)) {
    actions.push({
      id: `role-${prefix}-${seniorityBracket}-${actions.length}`,
      priority: score >= 65 ? "High" : "Medium",
      deadline: score >= 75 ? "45 days" : "90 days",
      riskReductionPct: 15,
      ...action,
    } as ActionPlanItem);
  }

  // 3. Intelligence-based at-risk skill action
  const topAtRisk = intel?.skills?.at_risk?.[0];
  if (topAtRisk) {
    actions.push({
      id: `skill-atrisk-${topAtRisk.skill.replace(/\s/g, '-')}`,
      title: `Reduce Dependence on "${topAtRisk.skill}" (Risk: ${topAtRisk.riskScore}/100)`,
      description: `${topAtRisk.reason}. Transition to owning the strategy and validation layer for this skill rather than the execution layer. ${topAtRisk.aiTool ? `AI tools doing this today: ${topAtRisk.aiTool}.` : ""}`,
      priority: (topAtRisk.riskScore ?? 0) >= 80 ? "High" : "Medium",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 18,
      deadline: "90 days",
    });
  }

  // 4. Safe skill deepening — seniority calibrated
  const topSafe = intel?.skills?.safe?.[0];
  if (topSafe) {
    const safeSkillAction: Record<typeof seniorityBracket, string> = {
      junior:    `At your stage, depth beats breadth. Pick one project where this skill is the primary value add and ship it publicly — GitHub, blog, or a demo. Junior professionals with 1 visible proof of this skill are hired above more experienced candidates who cannot show it.`,
      mid:       `Move from practitioner to recognized practitioner. Write a LinkedIn post, internal tech talk, or case study documenting your most complex application of this skill. Mid-level professionals who publish domain expertise receive 3× more senior-role referrals from their own network.`,
      senior:    `Your depth in this skill is your most durable asset. The next step is not learning — it is multiplication: mentor 1–2 junior people in this skill, or write the framework for how your organization applies it. Senior experts who systematize their knowledge cannot be replaced, only succeeded.`,
      principal: `At principal level, your moat is not doing — it is defining. Write the authoritative resource (book chapter, industry white paper, conference talk) on this skill's application in your domain. This converts your expertise from valuable-to-your-employer into visible-to-the-market.`,
    };
    actions.push({
      id: `skill-safe-${topSafe.skill.replace(/\s/g, '-')}`,
      title: `Deepen "${topSafe.skill}" — Your Primary Human Moat (LTV: ${topSafe.longTermValue}/100)`,
      description: `${topSafe.whySafe} ${safeSkillAction[seniorityBracket]}`,
      priority: "Medium",
      layerFocus: "L5 · Personal Protection",
      riskReductionPct: 14,
      deadline: "Ongoing — 30 min/day minimum",
    });
  }

  // 5. Company-specific financial health action
  const financialRisk = result.breakdown?.L1 ?? 0;
  if (financialRisk > 0.65) {
    actions.push({
      id: `company-financial-${companyName.replace(/\s/g, '-')}`,
      title: `Update Emergency Fund — ${companyName} Financial Signals Elevated`,
      description: `Company financial health score: ${Math.round(financialRisk * 100)}/100. Industry-normalized analysis suggests elevated restructuring probability in the next 12 months. Ensure you have 6–9 months of expenses covered and your resume, LinkedIn, and portfolio are current.`,
      priority: financialRisk > 0.8 ? "Critical" : "High",
      layerFocus: "L1 · Financial Health",
      riskReductionPct: 10,
      deadline: "30 days",
    });
  }

  // 6. Layoff history action
  const layoffRisk = result.breakdown?.L2 ?? 0;
  if (layoffRisk > 0.6) {
    actions.push({
      id: `layoff-history-action`,
      title: "Activate Your Professional Network Proactively",
      description: `Layoff history signal is elevated (${Math.round(layoffRisk * 100)}/100). Reach out to 3 trusted colleagues or hiring managers this week — not to ask for jobs, but to reconnect. People hired in downturns overwhelmingly come from warm referrals, not cold applications.`,
      priority: "High",
      layerFocus: "L2 · Layoff History",
      riskReductionPct: 14,
      deadline: "7 days",
    });
  }

  // 7. Career Twin-based insight — market-grounded with city intersection (v6.0 Upgrade 4)
  if (intel?.careerPaths?.length) {
    const topPath = intel.careerPaths[0];
    // Use synchronous lookup inside the pure action builder.
    // The component-level useEffect below fetches the async (live Supabase) version
    // and stores it in liveMarketData — if available it overrides this result.
    const market = liveMarketData ?? getCareerPathMarketSync(topPath.role);
    // v7.0: cityKey is now an explicit parameter — no localStorage reads inside this function.
    // The city key must be normalised (lowercase, underscores) before being passed here.
    let cityIntersectionText = '';
    if (market) {
      if (cityKey) {
        // City provided — run intersection against CITY_OPPORTUNITIES
        const intersection = getCityCompanyIntersection(cityKey, prefix, market.topHiringCompaniesIndia);
        const cityLabel = cityKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (intersection.source === 'intersection' && intersection.companies.length > 0) {
          // Named employers confirmed in both city data AND national career path market
          cityIntersectionText = ` In ${cityLabel}, ${topPath.role} is actively hiring at: ${intersection.companies.join(', ')}. These employers appear in both the ${cityLabel} market and the national ${topPath.role} talent pool — prioritise these for applications.`;
        } else if (intersection.source === 'city_fallback' && intersection.companies.length > 0) {
          // City has data but not enough overlap — use city-specific list
          cityIntersectionText = ` Top ${cityLabel} employers for this function: ${intersection.companies.join(', ')}.`;
        } else if (intersection.source === 'national_fallback' && intersection.companies.length > 0) {
          // City not in CITY_OPPORTUNITIES — fall back to national data, say so explicitly
          cityIntersectionText = ` National hiring leaders for ${topPath.role}: ${intersection.companies.join(', ')} (city-specific data not available for ${cityLabel}; verify on Naukri/LinkedIn).`;
        }
      } else if (market.topHiringCompaniesIndia.length > 0) {
        // No city provided — name national employers directly rather than generic "the market"
        const topNational = market.topHiringCompaniesIndia.slice(0, 3);
        cityIntersectionText = ` Top national employers hiring for ${topPath.role} in India: ${topNational.join(', ')}. Add your city in the Financial Context section to see which of these hire locally.`;
      }
    }
    // Compute data age and staleness for the market opening count.
    // Opening counts are hardcoded integers — they do not refresh automatically.
    // If data is > 90 days old (MARKET_DATA_STALE_DAYS), add a live-verification caveat
    // so users do not make a career pivot decision on significantly out-of-date demand data.
    const stale     = market ? isMarketDataStale(market) : false;
    const ageLabel  = market ? marketDataAgeLabel(market) : '';
    const openingsDisplay = market
      ? `${market.indiaOpenings.toLocaleString()} (${ageLabel})`
      : '';
    const stalenessCaveat = stale
      ? ` Opening count is ${ageLabel} — verify current demand on LinkedIn/Naukri before committing to this transition.`
      : '';

    // Provenance prefix: live Supabase data vs research estimate
    const isLiveData = market?.dataSource?.startsWith('Live');
    const provenancePrefix = market
      ? (isLiveData ? '[🟢 Live]' : '[📅 Research est.]')
      : '';

    const marketContext = market
      ? ` ${provenancePrefix} Market reality: ${openingsDisplay} active openings in India (${formatDemandTrendLabel(market.demandTrend)}).${stalenessCaveat} Hiring bar: ${market.hiringBar} Success rate (12 months): ${formatSuccessRate(market.successRate12mPct)}. Median salary delta: +${market.medianSalaryDeltaPct}%.${cityIntersectionText}`
      : ` Key skill gap: ${topPath.skillGap}. Reach out to 2 people currently in this role on LinkedIn this week to verify market demand before investing.`;
    actions.push({
      id: `career-path-${topPath.role.replace(/\s/g, '-')}`,
      title: `Explore Adjacent Role: ${topPath.role}`,
      description: `This transition offers ${topPath.riskReduction}% risk reduction. Typical transition time: ${topPath.timeToTransition}.${marketContext}`,
      priority: score >= 70 ? "High" : "Medium",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: topPath.riskReduction,
      deadline: market ? `${market.weeksToFirstInterview} weeks to first interview` : topPath.timeToTransition,
    });
  }

  // 8. City opportunity action — when market headwinds are high (L4 > 0.60)
  // and the user is in a secondary city with limited options.
  const l4Score = result.breakdown?.L4 ?? 0;
  if (l4Score > 0.60) {
    const topCities = getCitiesForRole(prefix).slice(0, 2);
    if (topCities.length > 0) {
      const best = topCities[0];
      actions.push({
        id: `city-opportunity-${prefix}`,
        title: `Explore ${best.city} Market — ${best.opportunity.employer_count} Active Employers`,
        description: `Your current market shows elevated headwinds (L4: ${Math.round(l4Score * 100)}/100). ${best.city} has ${best.opportunity.employer_count} companies actively hiring for ${prefix} roles. Salary: ${formatSalaryPremium(best.opportunity.salary_premium_pct)}. Median placement time: ${best.opportunity.avg_placement_weeks} weeks. Remote adoption: ${Math.round(best.opportunity.remote_adoption_rate * 100)}%. Top employers: ${best.opportunity.top_5_hiring_companies.slice(0, 3).join(', ')}.`,
        priority: l4Score > 0.75 ? "High" : "Medium",
        layerFocus: "L4 · Market Headwinds",
        riskReductionPct: 12,
        deadline: "Research phase: 2 weeks",
      });
    }
  }

  // Fallback: ensure at least 3 items
  if (actions.length < 3) {
    actions.push(
      {
        id: "fallback-portfolio",
        title: "Build an AI-Integrated Project Portfolio",
        description: "Create 2–3 visible work samples that demonstrate you can work alongside AI tools effectively. Hiring managers and promotion committees are now explicitly evaluating AI integration capability.",
        priority: "High",
        layerFocus: "L3 · Role Displacement",
        riskReductionPct: 20,
        deadline: "60 days",
      },
      {
        id: "fallback-linkedin",
        title: "Optimize LinkedIn for AI-Era Roles",
        description: "Update your LinkedIn headline and summary to include AI-adjacent skills. Add specific examples of AI tool usage to your experience descriptions. Recruiters increasingly search for 'AI' + your role keywords.",
        priority: "Medium",
        layerFocus: "L1 · Market Positioning",
        riskReductionPct: 10,
        deadline: "2 weeks",
      },
    );
  }

  // Personalization 4: Conservative profile freelance track
  // When runway is tight, build parallel income instead of pivot
  if (financialProfile?.riskAppetite === 'conservative' && score >= 50) {
    actions.push({
      id: 'freelance-track-1',
      title: 'Identify One Freelance Service You Can Offer Today',
      description: `Conservative financial profile: instead of a role transition, build a parallel income stream while employed. Search Upwork and Toptal for your role category (${prefix.toUpperCase()}). Goal: not income replacement but proof of commercial viability. Even ₹1,000 per engagement transforms your CV from candidate to practitioner.`,
      priority: 'Medium',
      layerFocus: 'L5 · Personal Protection',
      riskReductionPct: 8,
      deadline: 'This week — identify 3 services',
    });
    actions.push({
      id: 'freelance-track-2',
      title: 'Complete One Paid Freelance Project This Month',
      description: 'One completed client project — regardless of size or pay — fundamentally changes how you describe your capabilities. "I work with clients on X" is a stronger credential than "I know how to do X". Any completed engagement counts.',
      priority: 'Medium',
      layerFocus: 'L5 · Personal Protection',
      riskReductionPct: 10,
      deadline: '30 days',
    });
  }

  // Attach multi-track weeks-to-proficiency to each action item once.
  // The data is stored on the item object; ActionItem highlights the active
  // track at render time — changing selectedTrack re-renders without recomputing.
  const annotatedActions = actions.map(item => {
    const learningWeeks = getSkillLearningWeeks(item.title);
    return learningWeeks ? { ...item, learningWeeks } : item;
  });

  // De-duplicate by id
  const seen = new Set<string>();
  let unique = annotatedActions.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });

  // Priority 4: Apply financial context — adjust urgency and filter expensive items
  if (financialProfile) {
    const { urgencyMultiplier, riskAppetite } = financialProfile;
    unique = unique.map(item => {
      const adjusted = item.deadline ? adjustDeadline(item.deadline, urgencyMultiplier) : item.deadline;
      return {
        ...item,
        // Preserve original deadline when urgency compression changed it so the
        // UI can show "urgency-adjusted from {original}" alongside the new value.
        originalDeadline: adjusted !== item.deadline ? item.deadline : undefined,
        deadline: adjusted,
        priority: escalatePriority(item.priority, urgencyMultiplier),
      };
    });
    // Conservative profile: suppress any action that implies long income gap
    if (riskAppetite === 'conservative') {
      unique = unique.filter(item =>
        !item.description.toLowerCase().includes('quit') &&
        !item.description.toLowerCase().includes('leave your job')
      );
    }
  }

  const priorityWeight = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return unique.sort((a, b) => (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2));
}

// ---------------------------------------------------------------------------
// Course Resource Database — role-contextual learning links
// ---------------------------------------------------------------------------

// costINR: approximate monthly/one-time cost in Indian Rupees. 0 = free.
// Conservative profiles (< ₹3K) are filtered to free/affordable only.
export const COURSE_RESOURCES: Record<string, { title: string; provider: string; url: string; free: boolean; costINR: number }[]> = {
  sw: [
    { title: "GitHub Copilot Advanced Techniques", provider: "GitHub", url: "https://docs.github.com/en/copilot", free: true, costINR: 0 },
    { title: "AI-Powered Code Review Workflow", provider: "DeepLearning.AI", url: "https://www.deeplearning.ai/short-courses/", free: true, costINR: 0 },
    { title: "System Design with AI Components", provider: "Educative", url: "https://www.educative.io/", free: false, costINR: 2800 },
  ],
  fin: [
    { title: "Python for Financial Analysis", provider: "Coursera / Michigan", url: "https://www.coursera.org/learn/python-statistics-financial-analysis", free: false, costINR: 4500 },
    { title: "AI Tools for FP&A", provider: "CFI", url: "https://corporatefinanceinstitute.com/", free: false, costINR: 6000 },
    { title: "Excel to Python Migration", provider: "DataCamp", url: "https://www.datacamp.com/", free: false, costINR: 3200 },
  ],
  hr: [
    { title: "People Analytics (Google)", provider: "Coursera / Google", url: "https://www.coursera.org/learn/people-analytics", free: false, costINR: 4500 },
    { title: "AI in HR Certificate", provider: "LinkedIn Learning", url: "https://www.linkedin.com/learning/", free: false, costINR: 2500 },
    { title: "SHRM AI Upskilling Program", provider: "SHRM", url: "https://www.shrm.org/", free: false, costINR: 8000 },
  ],
  leg: [
    { title: "AI and the Legal System", provider: "Harvard (edX)", url: "https://www.edx.org/", free: false, costINR: 8000 },
    { title: "Contract AI Fundamentals (Harvey)", provider: "Harvey AI", url: "https://www.harvey.ai/", free: false, costINR: 5000 },
    { title: "EU AI Act Compliance Certificate", provider: "IAPP", url: "https://iapp.org/", free: false, costINR: 12000 },
  ],
  hc: [
    { title: "AI in Healthcare (Stanford)", provider: "Coursera / Stanford", url: "https://www.coursera.org/learn/ai-in-healthcare", free: false, costINR: 4500 },
    { title: "Clinical AI Validation Methods", provider: "MIT (edX)", url: "https://www.edx.org/", free: false, costINR: 7000 },
    { title: "Digital Health Leadership", provider: "ACHE", url: "https://www.ache.org/", free: false, costINR: 9000 },
  ],
  cnt: [
    { title: "AI-Augmented Content Strategy", provider: "HubSpot Academy", url: "https://academy.hubspot.com/", free: true, costINR: 0 },
    { title: "Prompt Engineering for Writers", provider: "DeepLearning.AI", url: "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/", free: true, costINR: 0 },
    { title: "Brand Story in the AI Era", provider: "Domestika", url: "https://www.domestika.org/", free: false, costINR: 1800 },
  ],
  default: [
    { title: "AI for Everyone (Non-Technical)", provider: "Coursera / DeepLearning.AI", url: "https://www.coursera.org/learn/ai-for-everyone", free: false, costINR: 4500 },
    { title: "AI Upskilling Fundamentals", provider: "Google", url: "https://grow.google/intl/en_us/guide-to-ai-upskilling/", free: true, costINR: 0 },
    { title: "ChatGPT Prompt Engineering", provider: "DeepLearning.AI", url: "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/", free: true, costINR: 0 },
  ],
};

// ---------------------------------------------------------------------------
// SeniorityBracketCallout
// ---------------------------------------------------------------------------

interface SeniorityBracketCalloutProps {
  derivedBracket: SeniorityBracket;
  signals: string[];
  overrideBracket: SeniorityBracket | null;
  onOverride: (b: SeniorityBracket | null) => void;
}

const SeniorityBracketCallout: React.FC<SeniorityBracketCalloutProps> = ({
  derivedBracket,
  signals,
  overrideBracket,
  onOverride,
}) => {
  const effectiveBracket = overrideBracket ?? derivedBracket;
  const idx = BRACKET_ORDER.indexOf(effectiveBracket);
  const isOverridden = overrideBracket !== null;
  const canGoUp = idx < BRACKET_ORDER.length - 1;
  const canGoDown = idx > 0;

  return (
    <div className="rounded-xl border border-white/10 p-4 mb-4 bg-white/[0.03]">
      <div className="flex items-start gap-3">
        <Brain className="w-4 h-4 flex-shrink-0 mt-0.5 text-violet-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs text-muted-foreground">Actions calibrated for</span>
            <span className="text-xs font-black text-violet-300 bg-violet-500/15 border border-violet-500/25 px-2 py-0.5 rounded">
              {BRACKET_LABELS[effectiveBracket]}
            </span>
            {isOverridden && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                Adjusted
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            {isOverridden
              ? `Adjusted from ${BRACKET_LABELS[derivedBracket]} based on your input. Recommendations now reflect ${BRACKET_LABELS[effectiveBracket]} expectations.`
              : `Based on: ${signals.join(' · ')}`}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {isOverridden ? (
              <button
                onClick={() => onOverride(null)}
                className="text-[10px] px-2.5 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-[var(--text)] transition-colors font-mono"
              >
                Reset to derived ({BRACKET_LABELS[derivedBracket]})
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground/50 font-mono">Actions wrong for your level?</span>
            )}
            {canGoDown && (
              <button
                onClick={() => onOverride(BRACKET_ORDER[idx - 1])}
                className="text-[10px] px-2.5 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-[var(--text)] transition-colors font-mono flex items-center gap-1"
              >
                ▼ More junior
              </button>
            )}
            {canGoUp && (
              <button
                onClick={() => onOverride(BRACKET_ORDER[idx + 1])}
                className="text-[10px] px-2.5 py-1 rounded border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/15 text-violet-300 transition-colors font-mono flex items-center gap-1"
              >
                ▲ More senior
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ActionItem component
// ---------------------------------------------------------------------------

const PRIORITY_COLOR = {
  Critical: "var(--red)",
  High:     "var(--orange)",
  Medium:   "var(--amber)",
  Low:      "var(--cyan)",
};

interface ActionItemProps {
  item: ActionPlanItem;
  isCompleted: boolean;
  onToggle: () => void;
  index: number;
  isLocked?: boolean;
  selectedTrack: TrackType;
}

const ACTION_TRACK_CFG = [
  { track: 'minimal'   as TrackType, hours: 2,  key: 'w2'  as const },
  { track: 'moderate'  as TrackType, hours: 8,  key: 'w8'  as const },
  { track: 'intensive' as TrackType, hours: 20, key: 'w20' as const },
] as const;

// Priority color tokens for action items — richer than the old map
const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.20)',  label: 'CRITICAL' },
  High:     { color: '#f97316', bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.18)', label: 'HIGH' },
  Medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.16)', label: 'MEDIUM' },
  Low:      { color: '#94a3b8', bg: 'rgba(148,163,184,0.04)',border: 'rgba(148,163,184,0.14)',label: 'LOW' },
};

const ActionItem: React.FC<ActionItemProps> = ({ item, isCompleted, onToggle, index, isLocked = false, selectedTrack }) => {
  const cfg = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.Medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), ease: [0.34, 1.56, 0.64, 1] }}
      className={`group transition-all duration-250 ${isLocked ? 'opacity-35 pointer-events-none' : ''}`}
      style={{
        borderRadius: '12px',
        border: `1px solid ${cfg.border}`,
        background: isCompleted ? 'rgba(255,255,255,0.02)' : cfg.bg,
        overflow: 'hidden',
        opacity: isCompleted ? 0.55 : 1,
      }}
      whileHover={isLocked ? {} : { boxShadow: `0 4px 20px ${cfg.color}14` } as any}
    >
      {/* Top accent stripe */}
      <div style={{
        height: '2px',
        background: isCompleted ? 'rgba(255,255,255,0.08)' : `linear-gradient(90deg, ${cfg.color} 0%, ${cfg.color}40 100%)`,
        opacity: isCompleted ? 0.4 : 0.65,
      }} />

      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={isLocked ? undefined : onToggle}
          disabled={isLocked}
          className="flex-shrink-0 mt-0.5 focus:outline-none transition-transform"
          style={{ transform: 'scale(1)', cursor: isLocked ? 'not-allowed' : 'pointer' }}
          aria-checked={isCompleted}
          aria-disabled={isLocked}
          role="checkbox"
        >
          {isCompleted ? (
            <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
          ) : (
            <Circle className="w-5 h-5" style={{ color: cfg.color, opacity: 0.5 }} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title + badges row */}
          <div className="flex flex-wrap items-start gap-2 mb-2">
            <h4 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.88rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              color: isCompleted ? 'var(--text-3)' : 'var(--text)',
              textDecoration: isCompleted ? 'line-through' : 'none',
              flex: '1 1 200px',
            }}>
              {item.title}
            </h4>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
              {item.riskReductionPct > 0 && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 900,
                  padding: '2px 6px', borderRadius: '4px',
                  background: 'rgba(16,185,129,0.12)', color: '#10b981',
                  border: '1px solid rgba(16,185,129,0.22)', letterSpacing: '0.08em',
                }}>
                  −{item.riskReductionPct}% RISK
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.72rem',
            color: isCompleted ? 'var(--text-3)' : 'var(--text-3)',
            lineHeight: 1.6, marginBottom: '10px',
          }}>
            {item.description}
          </p>

          {/* Learning weeks ROI row */}
          {item.learningWeeks && (
            <div className="flex items-center gap-2 flex-wrap mb-2.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>
              <Zap className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--amber)', opacity: 0.6 }} />
              {ACTION_TRACK_CFG.map(({ track, hours, key }, i) => {
                const weeks = item.learningWeeks![key];
                const sel = track === selectedTrack;
                return (
                  <React.Fragment key={track}>
                    {i > 0 && <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>}
                    <span style={{
                      color: sel ? '#f59e0b' : 'var(--text-3)',
                      fontWeight: sel ? 800 : 400,
                      opacity: sel ? 1 : 0.45,
                      letterSpacing: '0.06em',
                    }}>
                      {hours}h/wk: {weeks}w
                    </span>
                  </React.Fragment>
                );
              })}
              <span style={{ color: 'var(--text-3)', opacity: 0.35 }}>to proficiency</span>
            </div>
          )}

          {/* Meta row — layer focus + deadline */}
          <div className="flex flex-wrap gap-2 items-center">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '3px 8px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)',
              letterSpacing: '0.06em',
            }}>
              <Target className="w-2.5 h-2.5" />
              {item.layerFocus}
            </div>
            {item.deadline && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '3px 8px', borderRadius: '6px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)',
                letterSpacing: '0.06em',
              }}>
                <Clock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                {item.deadline}
                {item.originalDeadline && (
                  <span style={{ opacity: 0.5, fontSize: '0.52rem' }}>
                    (from {item.originalDeadline})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// ProgressIndicator
// ---------------------------------------------------------------------------

const ProgressIndicator: React.FC<{ completed: number; total: number }> = ({ completed, total }) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color = pct < 30 ? "#ef4444" : pct < 70 ? "#f97316" : "#10b981";

  // SVG ring parameters
  const size = 64;
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div className="glass-panel-heavy rounded-2xl" style={{ padding: '20px 24px', minWidth: '220px' }}>
      <div className="flex items-center gap-4 mb-3">
        {/* Mini completion ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={7} />
            <motion.circle
              cx={size/2} cy={size/2} r={r}
              fill="none" stroke={color} strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 900,
            color, letterSpacing: '-0.03em',
          }}>
            {pct}%
          </div>
        </div>
        <div>
          <div className="data-label mb-1">ACTION PROGRESS</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-2)', fontWeight: 700 }}>
            {completed} of {total} complete
          </div>
        </div>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: "inherit", background: color, boxShadow: `0 0 10px ${color}66` }}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Course filtering — pure function, exported for testing
// ---------------------------------------------------------------------------

type CourseEntry = { title: string; provider: string; url: string; free: boolean; costINR: number };

/**
 * Filter a course list to options compatible with the user's financial profile.
 * Conservative profiles (< 2 months runway) see only free / ≤ ₹3,000 courses.
 * When no affordable course exists for a prefix, returns [] rather than falling
 * back to an expensive course — showing an ₹8K certification to a user with
 * no emergency fund is harmful advice.
 */
export function filterCoursesForProfile(
  courses: CourseEntry[],
  riskAppetite: 'conservative' | 'moderate' | 'aggressive' | null | undefined,
): CourseEntry[] {
  if (riskAppetite !== 'conservative') return courses;
  return courses.filter(c => c.free || c.costINR <= 3000);
}

// ---------------------------------------------------------------------------
// Course Resource Card
// ---------------------------------------------------------------------------

const CourseResourceCard: React.FC<{ rolePrefix: string; financialProfile?: FinancialProfile | null }> = ({ rolePrefix, financialProfile }) => {
  const allCourses = COURSE_RESOURCES[rolePrefix] ?? COURSE_RESOURCES.default;

  const courses = useMemo(
    () => filterCoursesForProfile(allCourses, financialProfile?.riskAppetite),
    [allCourses, financialProfile?.riskAppetite],
  );

  const conservativeFiltered = financialProfile?.riskAppetite === 'conservative' && courses.length < allCourses.length;

  return (
    <div className="glass-panel p-5 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <h4 className="font-bold text-sm">Recommended Learning</h4>
        <span className="ml-auto text-[9px] font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded">
          {conservativeFiltered ? 'FREE / ≤₹3K' : 'CURATED'}
        </span>
      </div>
      {conservativeFiltered && courses.length > 0 && (
        <p className="text-[10px] text-amber-400 mb-3 leading-relaxed">
          Showing free and affordable options based on your financial context.
        </p>
      )}
      {conservativeFiltered && courses.length === 0 && (
        <p className="text-[10px] text-amber-400 mb-3 leading-relaxed">
          No free or ≤₹3K courses available for this role right now.
          Search Coursera Audit, YouTube, and NPTEL for free alternatives.
        </p>
      )}
      <div className="space-y-3">
        {courses.map((c, i) => (
          <a
            key={i}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 hover:border-[var(--border-cyan)] transition-all group"
          >
            <div className="p-1.5 rounded-lg bg-white/5 flex-shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight group-hover:text-[var(--cyan)] transition-colors">{c.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.provider}</div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {c.free && (
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black">
                  FREE
                </span>
              )}
              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ActionPlanTab main component
// ---------------------------------------------------------------------------

export const ActionPlanTab: React.FC<TabProps> = ({ result, companyData }) => {
  const { width } = useAdaptiveSystem();
  const { userProfile } = useHumanProof();
  const rolePrefix = getPrefix(result.workTypeKey);

  // Priority 4: Load financial context from localStorage (set by FinancialContextInput)
  const financialCtx = useMemo(() => loadFinancialContext(), []);
  const financialProfile = useMemo(
    () => financialCtx ? deriveFinancialProfile(financialCtx, result.total) : null,
    [financialCtx, result.total],
  );

  // Priority 9: Performance tier + collapse override
  const performanceTier = (result as any).performanceTier as 'top' | 'average' | 'below' | 'unknown' | undefined ?? 'unknown';
  const collapseStageForOverride = (result.collapseStage ?? null) as 1 | 2 | 3 | null;
  const performanceOverride = useMemo(
    () => getPerformanceCollapseStrategy(performanceTier, collapseStageForOverride, result.total),
    [performanceTier, collapseStageForOverride, result.total],
  );

  // ── New intelligence engine state (component-scope, not IIFE) ────────────
  const insurancePlan = useMemo(
    () => generateCareerInsurancePlan(result, companyData),
    [result, companyData],
  );
  const [showInsurance, setShowInsurance] = useState(() => result.total >= 45);
  const [showFinancial, setShowFinancial] = useState(false);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // v7.0 Fix 3: Returning users see their completed actions hidden by default.
  // This prevents repeat recommendations for actions already taken.
  // First-time users default to showing all (nothing is completed yet).
  const returnType = useMemo(() => getUserReturnType(
    result.workTypeKey,
    result.total,
    result.experience ?? '5-10',
    result.countryKey ?? 'usa',
  ), [result.workTypeKey, result.total, result.experience, result.countryKey]);

  const isReturningUser = returnType !== 'first_time';
  const [hideCompleted, setHideCompleted] = useState<boolean>(isReturningUser);
  const [selectedTrack, setSelectedTrack] = useState<TrackType>(() =>
    result.total >= 70 ? "intensive" : result.total >= 45 ? "moderate" : "minimal"
  );
  // Driven by SeniorityBracketConfirmation — null until the user confirms or
  // overrides (first render uses derivedBracket directly in buildDynamicActions).
  const [confirmedBracket, setConfirmedBracket] = useState<SeniorityBracket | null>(null);

  const { derivedBracket, bracketSignals } = useMemo(() => {
    const tenureYears = (result as any).userFactors?.tenureYears ?? (result as any).tenureYears ?? 3;
    const careerYears = (result as any).userFactors?.careerYears ?? (result as any).experienceYears ?? tenureYears;
    const performanceTier = (result as any).userFactors?.performanceTier ?? (result as any).performanceTier ?? 'unknown';
    const uniquenessDepth = (result as any).uniquenessDepth ?? (result as any).userFactors?.uniquenessDepth ?? 'generic';
    return {
      derivedBracket: deriveSeniorityBracket(tenureYears, performanceTier, uniquenessDepth, careerYears),
      bracketSignals: describeBracketSignals(tenureYears, performanceTier, uniquenessDepth, careerYears),
    };
  }, [result]);

  // Live market data — fetched async from Supabase cache after initial render.
  // buildDynamicActions uses this when available; falls back to getCareerPathMarketSync().
  const [liveMarketData, setLiveMarketData] = useState<CareerPathMarket | null>(null);
  const _marketIntel = getCareerIntelligence(result.workTypeKey);
  const _topPathRole = _marketIntel?.careerPaths?.[0]?.role ?? '';
  useEffect(() => {
    if (!_topPathRole) return;
    let cancelled = false;
    getCareerPathMarket(_topPathRole).then(data => {
      if (!cancelled) setLiveMarketData(data ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [_topPathRole]);

  // Load cityKey once at component mount (normalised by loadCityKey).
  // Re-read when the component renders — FinancialContextInput may have just saved it.
  const cityKey = useMemo(() => loadCityKey(), []);

  // Merge server-side recs with dynamic role-specific ones, passing financial profile
  const allRecommendations = useMemo(() => {
    const dynamic = buildDynamicActions(
      result,
      result.companyName ?? companyData?.name ?? "your company",
      financialProfile,
      selectedTrack,
      liveMarketData,
      confirmedBracket ?? undefined,
      cityKey,
    );
    const serverRecs = result.recommendations ?? [];
    // Merge: prefer dynamic, append non-duplicate server recs
    const dynamicIds = new Set(dynamic.map(d => d.id));
    const serverExtra = serverRecs.filter(r => !dynamicIds.has(r.id));
    return [...dynamic, ...serverExtra];
  }, [result, companyData, financialProfile, selectedTrack, liveMarketData, confirmedBracket, cityKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("actionPlanCompleted");
      if (saved) setCompletedItems(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("actionPlanCompleted", JSON.stringify(completedItems));
    } catch { /* ignore */ }
  }, [completedItems]);

  const filteredItems = useMemo(() =>
    allRecommendations.filter(item => {
      if (filter !== "all" && item.priority.toLowerCase() !== filter) return false;
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()) &&
          !item.description.toLowerCase().includes(search.toLowerCase())) return false;
      // v7.0 Fix 3: hide completed items when toggle is active
      if (hideCompleted && completedItems[item.id]) return false;
      return true;
    }), [allRecommendations, filter, search, hideCompleted, completedItems]);

  const trackConfig = TRACKS[selectedTrack];
  const trackLimitedItems = useMemo(() => {
    let items = filteredItems.slice(0, trackConfig.maxActions);
    // Priority 9: suppress long-horizon upskilling when override is active
    if (performanceOverride?.suppressUpskilling) {
      items = items.filter(item =>
        !item.layerFocus?.toLowerCase().includes('l3') &&
        !item.layerFocus?.toLowerCase().includes('displacement') &&
        !item.title?.toLowerCase().includes('certif') &&
        !item.title?.toLowerCase().includes('roadmap') &&
        !item.deadline?.toLowerCase().includes('90 day')
      );
      if (items.length === 0) items = filteredItems.slice(0, 2); // always show at least 2
    }
    return items;
  }, [filteredItems, trackConfig.maxActions, performanceOverride]);

  const sortedItems = useMemo(() => {
    // v15.0: Within the pending group, rank by impact ÷ effort × profile
    // multipliers (salary band, visa, tenure). Completed items remain pinned
    // to the bottom so users see actionable work first.
    const pending = trackLimitedItems.filter((it) => !completedItems[it.id]);
    const completed = trackLimitedItems.filter((it) => completedItems[it.id]);
    const rankingContext = {
      hasDependents: userProfile?.hasDependents,
      runwaySituation: (result as any).userFinancialRunway?.runwaySituation ?? null,
      careerConfidenceScore: (result as any).careerConfidence?.overallScore ?? null,
    };
    const rankedPending = rankAndUnwrap(pending, userProfile, rankingContext) as ActionPlanItem[];
    return [...rankedPending, ...completed];
  }, [trackLimitedItems, completedItems, userProfile]);

  const completedCount = useMemo(
    () => sortedItems.filter(item => completedItems[item.id]).length,
    [sortedItems, completedItems],
  );

  // Phase lock state — mirrors ActionDependencyGraph logic so the flat list and
  // the dependency graph panel enforce the same threshold consistently.
  // Phase 2 locks until Phase 1 ≥50% complete; Phase 3 locks until Phase 2 ≥50%.
  // Items whose phase is locked have their checkbox disabled (not just visually dim).
  const { lockedPhases } = useMemo(() => {
    const byPhase: Record<1 | 2 | 3, ActionPlanItem[]> = { 1: [], 2: [], 3: [] };
    for (const item of sortedItems) {
      byPhase[assignPhase(item)].push(item);
    }
    const phasePct = (ph: 1 | 2 | 3): number => {
      const items = byPhase[ph];
      if (items.length === 0) return 100;
      const done = items.filter(i => completedItems[i.id]).length;
      return Math.round((done / items.length) * 100);
    };
    const p1 = phasePct(1);
    const p2 = phasePct(2);
    return {
      lockedPhases: new Set<1 | 2 | 3>([
        ...(p1 < 50 ? [2 as const] : []),
        ...(p2 < 50 ? [3 as const] : []),
      ]),
    };
  }, [sortedItems, completedItems]);

  const handleExport = () => {
    try {
      const text = [
        "# Personalized Action Plan\n",
        `Generated: ${new Date().toLocaleDateString()}\n`,
        `Role: ${result.workTypeKey} | Risk Score: ${result.total}/100 | Company: ${result.companyName ?? "Unknown"}\n`,
        ...sortedItems.map(item => [
          `## ${item.title} (${item.priority} Priority)`,
          `Status: ${completedItems[item.id] ? "✓ Completed" : "○ Pending"}`,
          item.description,
          `Focus: ${item.layerFocus}`,
          item.riskReductionPct ? `Est. Risk Reduction: -${item.riskReductionPct}pts` : "",
          item.deadline ? `Deadline: ${item.deadline}` : "",
          "\n",
        ].filter(Boolean).join("\n")),
      ].join("\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `action-plan-${result.workTypeKey}-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <section aria-labelledby="action-plan-heading" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* ── Intelligence Engines: Career Insurance + Financial Impact ──────── */}
        {/* These panels sit above the action list so users see the "why" before
            they see the "what." Each panel is independently collapsible to avoid
            overwhelming lower-risk users.
            insurancePlan, showInsurance, showFinancial are declared at component scope below. */}
        {true && (
            <div className="space-y-4 mb-6">
              {/* Career Insurance Kit */}
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  onClick={() => setShowInsurance(v => !v)}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    <div className="text-left">
                      <p className="text-sm font-black tracking-tight">Career Insurance Kit</p>
                      <p className="text-[10px] text-muted-foreground">
                        Specific 30-day survival plan · cited actions · week-by-week timeline
                      </p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      insurancePlan.urgencyTier === 'critical' ? 'bg-red-500/15 text-red-400 border-red-500/25' :
                      insurancePlan.urgencyTier === 'elevated' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
                      'bg-blue-500/15 text-blue-400 border-blue-500/25'
                    }`}>
                      {insurancePlan.urgencyTier}
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showInsurance ? 'rotate-90' : ''}`} />
                </button>
                {showInsurance && (
                  <div className="px-5 py-5 border-t border-white/6">
                    <CareerInsuranceKit plan={insurancePlan} companyName={companyData.name ?? ''} />
                  </div>
                )}
              </div>

              {/* Financial Impact Calculator */}
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  onClick={() => setShowFinancial(v => !v)}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-sm font-black tracking-tight">Financial Impact Calculator</p>
                      <p className="text-[10px] text-muted-foreground">
                        Actual cost of a layoff · emergency fund gap · negotiation leverage
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showFinancial ? 'rotate-90' : ''}`} />
                </button>
                {showFinancial && (
                  <div className="px-5 py-5 border-t border-white/6">
                    <FinancialImpactCalculator result={result} />
                  </div>
                )}
              </div>
            </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <SectionHeader
              title="Personalized Action Plan"
              description={`${sortedItems.length} actions tailored to ${result.workTypeKey.replace(/_/g, " ")} at risk score ${result.total}/100. Set your available hours to see only what's realistic for your schedule.`}
            />
            {/* v8.0: Role personalization badge — shows which role group was resolved */}
            {(() => {
              const roleTitle = (result as any).roleTitle ?? result.workTypeKey ?? '';
              const roleGroupLabel = getRoleGroupLabel(roleTitle);
              const roleGroup = resolveRoleGroup(roleTitle);
              const riskLevel = scoreToRiskLevel(result.total);
              const region = (result as any).region ?? (result as any).companyRegion;
              // v39.0 B1: profile-aware action selection
              const uf2 = (result as any).userFactors ?? {};
              const userProfileLike2 = {
                visaStatus:         uf2.visaStatus ?? null,
                savingsMonthsRunway: uf2.savingsMonthsRunway ?? null,
                hasDependents:      uf2.hasDependents ?? null,
                dualIncomeHousehold: uf2.dualIncomeHousehold ?? null,
                priorLayoffSurvived: uf2.priorLayoffSurvived ?? null,
              };
              const personalizedSet = getPersonalizedActions(roleTitle, derivedBracket, result.total, region, undefined, undefined, userProfileLike2);
              return (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Actions personalized for</span>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    {roleGroupLabel}
                  </span>
                  <span className="text-[10px] font-black bg-white/8 border border-white/10 px-2 py-0.5 rounded capitalize">
                    {derivedBracket}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded capitalize ${
                    riskLevel === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    riskLevel === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    riskLevel === 'moderate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>{riskLevel} risk</span>
                  {region === 'IN' && personalizedSet.indiaSpecificContext && (
                    <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      🇮🇳 India-specific
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          <ProgressIndicator completed={completedCount} total={sortedItems.length} />
        </div>

        {/* Priority 9: Performance + collapse override banner */}
        {performanceOverride?.isActive && (
          <div
            className="rounded-xl border p-4 mb-4"
            style={{
              background: performanceOverride.urgencyTier === 'immediate' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
              borderColor: performanceOverride.urgencyTier === 'immediate' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)',
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{ color: performanceOverride.urgencyTier === 'immediate' ? 'var(--red)' : 'var(--amber)' }}
              />
              <div>
                <div
                  className="text-sm font-black mb-1"
                  style={{ color: performanceOverride.urgencyTier === 'immediate' ? 'var(--red)' : 'var(--amber)' }}
                >
                  {performanceOverride.headline}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {performanceOverride.strategyOverride}
                </p>
                {performanceOverride.suppressUpskilling && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 opacity-70">
                    Long-horizon upskilling actions have been filtered from this plan. Focus on the exit actions below.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Seniority bracket confirmation — persisted across refreshes via localStorage,
            overrides logged to seniority_bracket_overrides for algorithm QA */}
        <SeniorityBracketConfirmation
          derivedBracket={derivedBracket}
          signals={bracketSignals}
          workTypeKey={result.workTypeKey}
          riskScore={result.total}
          onBracketResolved={setConfirmedBracket}
        />

        {/* Time-available track selector */}
        <TimeAvailableTrack
          selectedTrack={selectedTrack}
          onTrackChange={setSelectedTrack}
          riskScore={result.total}
        />

        {/* Search + Filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text" placeholder="Search action items…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="text-muted-foreground w-4 h-4" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {/* v7.0 Fix 3: hide-completed toggle — visible only when there are completed items */}
            {completedCount > 0 && (
              <button
                onClick={() => setHideCompleted(v => !v)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors"
                style={{
                  background:   hideCompleted ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.05)',
                  borderColor:  hideCompleted ? 'rgba(16,185,129,0.30)' : 'rgba(255,255,255,0.10)',
                  color:        hideCompleted ? 'var(--emerald)' : 'var(--text-3)',
                }}
                title={hideCompleted
                  ? `${completedCount} completed action${completedCount !== 1 ? 's' : ''} hidden — click to show`
                  : `Showing all actions including ${completedCount} completed`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {hideCompleted
                  ? `${completedCount} done · Show`
                  : `${completedCount} done · Hide`}
              </button>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-muted-foreground hover:text-[var(--text)]"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Returning-user context banner — shown when there are hidden completed actions */}
        {isReturningUser && hideCompleted && completedCount > 0 && (
          <div className="mb-4 px-4 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-300/80 leading-relaxed">
              <span className="font-semibold text-emerald-300">
                {completedCount} action{completedCount !== 1 ? 's' : ''} from previous sessions
              </span>{' '}
              hidden from the active plan. Your current plan shows only remaining actions.{' '}
              <button onClick={() => setHideCompleted(false)} className="underline hover:no-underline">
                Show all
              </button>
            </p>
          </div>
        )}

        {/* Action Items — priority-grouped with colored section headers */}
        <AnimatePresence>
          {sortedItems.length > 0 ? (
            <div className="space-y-6">
              {(['Critical', 'High', 'Medium', 'Low'] as const).map(priority => {
                const priorityItems = sortedItems.filter(item => item.priority === priority);
                if (priorityItems.length === 0) return null;
                const cfg = PRIORITY_CONFIG[priority];
                const completedCount = priorityItems.filter(item => completedItems[item.id]).length;
                return (
                  <div key={priority}>
                    {/* Section header */}
                    <div className="priority-section-header flex items-center gap-2 mb-3" style={{ '--priority-color': cfg.color } as React.CSSProperties}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: cfg.color, boxShadow: `0 0 8px ${cfg.color}`,
                        flexShrink: 0,
                        animation: priority === 'Critical' ? 'pulse-live 1.8s ease-in-out infinite' : 'none',
                      }} />
                      <span>{cfg.label} PRIORITY</span>
                      <span style={{
                        marginLeft: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                        fontWeight: 700, color: cfg.color, opacity: 0.6,
                      }}>
                        {completedCount}/{priorityItems.length}
                      </span>
                      {completedCount > 0 && (
                        <div style={{
                          marginLeft: 'auto',
                          height: '3px', width: `${Math.round((completedCount / priorityItems.length) * 60)}px`,
                          background: '#10b981', borderRadius: '2px',
                          boxShadow: '0 0 8px #10b98140',
                        }} />
                      )}
                    </div>

                    {/* Items in this priority group */}
                    <div className="space-y-2">
                      {priorityItems.map((item, i) => {
                        const itemPhase = assignPhase(item);
                        const itemIsLocked = lockedPhases.has(itemPhase as 2 | 3);
                        return (
                          <ActionItem
                            key={item.id}
                            item={item}
                            isCompleted={!!completedItems[item.id]}
                            onToggle={() => setCompletedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            index={i}
                            isLocked={itemIsLocked}
                            selectedTrack={selectedTrack}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-8 glass-panel rounded-xl">
              <p className="text-muted-foreground text-sm">
                {search || filter !== "all"
                  ? "No matching items — clear search or filter."
                  : "No action items available."}
              </p>
            </div>
          )}
        </AnimatePresence>

        {/* Resources Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {/* Recommended Courses */}
          <CourseResourceCard rolePrefix={rolePrefix} financialProfile={financialProfile} />

          {/* AI Adaptation Tools */}
          <div className="glass-panel p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-violet-400" />
              <h4 className="font-bold text-sm">AI Productivity Tools</h4>
            </div>
            <div className="space-y-2">
              {[
                { name: "Claude (Anthropic)", desc: "Best for analysis, writing, complex reasoning", url: "https://claude.ai", tag: "RECOMMENDED" },
                { name: "GitHub Copilot", desc: "AI pair programming, code review, documentation", url: "https://github.com/features/copilot", tag: "CODING" },
                { name: "Perplexity Pro", desc: "Real-time research with citations", url: "https://www.perplexity.ai", tag: "RESEARCH" },
                { name: "Notion AI", desc: "Docs, task management, knowledge base", url: "https://www.notion.so/product/ai", tag: "PRODUCTIVITY" },
              ].map((tool, i) => (
                <a key={i} href={tool.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-[var(--cyan)] transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">{tool.name}</div>
                    <div className="text-[10px] text-muted-foreground">{tool.desc}</div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20 font-black flex-shrink-0">
                    {tool.tag}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Priority 8: Phased Action Dependency Map */}
        <div className="mt-8">
          <CollapsibleSection title="Phased Action Plan — Dependency Sequence">
            <ActionDependencyGraph actions={sortedItems} completedItems={completedItems} />
          </CollapsibleSection>
        </div>

        {/* Career Twin Network */}
        <CareerTwinCard
          userRole={result.workTypeKey}
          userExperience={result.tenureYears ?? 5}
          userRiskScore={result.total}
          userCountry={result.countryKey ?? "global"}
          topN={3}
        />

        {/* Financial Context + Career Capital — deep personalization */}
        <div className="space-y-4 mt-6">
          <SectionHeader
            title="Personalise Your Strategy"
            description="Two optional assessments that significantly improve the accuracy of your action plan. Stored locally only — never transmitted."
          />
          <FinancialContextInput riskScore={result.total} currency="INR" />
          <CareerCapitalAssessment currentRiskScore={result.total} />
        </div>

        {/* Peer Benchmark */}
        <div className="mt-6">
          <PeerBenchmarkPanel
            roleKey={result.workTypeKey}
            industryKey={result.industryKey}
            score={result.total}
            experience={result.experience}
          />
        </div>

        {/* v12.0: Negotiation Intelligence — current employer leverage analysis */}
        {(result as any).negotiationIntelligence?.shouldDisplay && (
          <div className="mt-6">
            <NegotiationIntelligencePanel negotiation={(result as any).negotiationIntelligence} />
          </div>
        )}

        {/* v14.0: Compensation Risk — pay cascade stage and market position */}
        {(result as any).compensationRisk && (
          <div className="mt-6">
            <SectionHeader
              title="Compensation Risk Intelligence"
              description="Your pay position vs. market and the 5-stage pay-cut cascade model — salary freeze → contractor cuts → pay freeze → pay cut → layoff."
            />
            <CompensationRiskPanel compensation={(result as any).compensationRisk} />
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default ActionPlanTab;
