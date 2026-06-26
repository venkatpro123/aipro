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
import { getCitiesForRole, formatSalaryPremium, getCityCompanyIntersection, deriveTargetRolePrefix, joinWithAnd } from "@/data/cityOpportunities";
import { getActionLearningTime, getSkillLearningWeeks, getSkillLearningWeeksForRole } from "@/data/skillLearningHours";
import { getProductivityToolsForRole, familyDisplayLabel, type ProductivityTool } from "@/data/roleProductivityTools";
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
  type RunwayTier,
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
import { loadCompletionsLocal, markActionComplete, unmarkActionComplete } from "@/services/actionCompletionService";
import { loadEffectiveSuppressedActionIds } from "@/services/cohortFeedbackService";
import { stableActionId } from "@/services/actionIdUtil";
import { checkAndUnlockAchievements } from "@/services/achievementService";
import { generateCareerInsurancePlan } from "@/services/careerInsuranceEngine";
import { generateTrajectoryProjection } from "@/services/trajectoryProjection";
import { getMarketDemandSignals } from "@/services/marketDemandSignals";
import { CareerInsuranceKit } from "@/components/CareerInsuranceKit";
import { FinancialImpactCalculator } from "@/components/FinancialImpactCalculator";
import { NetworkIllustration } from "@/components/illustrations/AdditionalIllustrations";
import { SeniorityBracketConfirmation } from "@/components/SeniorityBracketConfirmation";
import {
  getCareerPathMarket,
  getCareerPathMarketSync,
  formatDemandTrendLabel,
  formatSuccessRate,
  isMarketDataStale,
  marketDataAgeLabel,
  resolveRegionalMarket,
  type CareerPathMarket,
} from "@/services/careerPathMarket";
import { useAdaptiveSystem } from "@/hooks/useAdaptiveSystem";
import { useHumanProof } from "@/context/HumanProofContext";
import { rankAndUnwrap, sortByROIWithinPhases } from "@/services/actionRankingService";
import { Stage3EmergencyProtocol } from "../../components/Stage3EmergencyProtocol";
import type { TabProps } from "./common/types";
import type { ActionPlanItem } from "@/types/hybridResult";
// v12.0 panels
import { NegotiationIntelligencePanel } from "./common/NegotiationIntelligencePanel";
import CompensationRiskPanel from "./common/CompensationRiskPanel";

// ---------------------------------------------------------------------------
// Role-aware recommendation generator
// Produces specific, non-generic action items based on role, score, and company context.
// ---------------------------------------------------------------------------

// NOTE: The former hardcoded ROLE_SPECIFIC_ACTIONS table (6 families × 2 generic
// actions) was removed in this pass. It was dead code — every call site had
// already migrated to getAdaptiveRoleActions() (seniority-calibrated, all role
// families) and getPersonalizedActions() (47-role engine with region + profile
// variants). Keeping the stale table around was the main "static template"
// smell in this file even though nothing rendered it.

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

/**
 * Parse the low end of a salary delta string like "+15–25%" or "-5–+10%".
 * Returns the numeric lower bound (can be negative).
 * Used to detect whether a career transition implies a salary decrease > threshold.
 */
function parseSalaryDeltaLow(delta: string | undefined): number {
  if (!delta) return 0;
  const match = delta.trim().match(/^([+-]?\d+)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Income-gap keywords for suppressing actions that imply voluntary employment gaps.
 * For CRITICAL runway tier these are suppressed entirely — a user with < 3 months
 * runway cannot survive even a 30-day gap, so showing these actions would be harmful.
 */
const INCOME_GAP_KEYWORDS = [
  'quit', 'leave your job', 'resign', 'take a gap', 'unpaid leave',
  'income gap', 'without income', 'between jobs', 'full transition',
  'aggressive pivot', '6-month career pivot', 'gap period',
  'extended transition', 'take time off', 'sabbatical',
];

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

  // ── Runway tier — extracted once for all downstream suppression/prepend logic ──
  const runwayTier: RunwayTier = financialProfile?.runwayTier ?? 'MODERATE';
  const runwayDisplay = financialProfile?.emergencyRunway ?? 'Unknown';

  // ── CRITICAL tier: prepend cash preservation actions FIRST ──────────────────
  // These actions appear before ALL others because a user with < 3 months runway
  // must address cash position before any other career action.
  // Showing them a 6-month pivot plan first would be harmful advice — they need
  // to extend runway tonight, not plan a strategic transition.
  if (runwayTier === 'CRITICAL') {
    actions.push({
      id: 'cash-preserve-1',
      title: 'Calculate Your Exact Monthly Burn Rate Tonight',
      description: `CRITICAL: ${runwayDisplay} of expenses covered. Open your last 3 bank statements and calculate: fixed EMIs + rent + utilities + groceries + subscriptions. This number is your minimum monthly survival spend. Write it down. Every rupee below this rate extends your search window by one day. You need this number to make every other decision.`,
      priority: 'Critical',
      layerFocus: 'L1 · Cash Preservation',
      riskReductionPct: 0,
      deadline: '24 hours',
    });
    actions.push({
      id: 'cash-preserve-2',
      title: 'Cancel or Pause All Non-Essential Subscriptions',
      description: `With ${runwayDisplay} runway, every subscription is runway burned. Cancel: OTT platforms, gym, premium apps, music services. Pause: anything that auto-renews monthly without immediate essential value. Target: reduce fixed costs by 15–25% within 48 hours. For most professionals this is ₹2,000–₹6,000/month. That is 1–3 extra days of runway per month, which adds up to weeks over a 4-month search.`,
      priority: 'Critical',
      layerFocus: 'L1 · Cash Preservation',
      riskReductionPct: 0,
      deadline: '48 hours',
    });
    actions.push({
      id: 'cash-preserve-3',
      title: 'Build an Emergency Income Bridge While Still Employed',
      description: `A typical job search at your level takes 6–12 weeks minimum. With ${runwayDisplay} runway, you cannot afford a gap. This week: identify one freelance service you can deliver within 7 days — your core skill applied to a smaller client. Platforms: Toptal, Upwork, direct LinkedIn outreach to former colleagues. Goal is not income replacement. Even one ₹15,000–₹40,000 engagement extends your runway by 2–4 weeks.`,
      priority: 'Critical',
      layerFocus: 'L5 · Personal Protection',
      riskReductionPct: 15,
      deadline: 'This week',
    });
  }

  // ── HIGH tier: prepend a job-search-now action FIRST ────────────────────────
  // 3–6 months runway is enough time to be strategic but not enough to wait.
  // The first action must be to start external conversations immediately.
  if (runwayTier === 'HIGH') {
    actions.push({
      id: 'job-search-begin-high',
      title: 'Begin Active Job Search This Week — Runway Is Finite',
      description: `With ${runwayDisplay} of financial runway, you have time to be strategic but not time to wait. Employed candidates receive 4× more callbacks than those applying after a layoff. This week: update your CV today (2 hours), send 3 warm-reconnection messages on LinkedIn (not asking for jobs — reconnecting), and apply to 2 roles you would genuinely accept. Do this while still employed. Your search window closes faster than it feels.`,
      priority: 'High',
      layerFocus: 'L5 · Personal Protection',
      riskReductionPct: 20,
      deadline: 'This week',
    });
  }

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
  // Phase 8 — Mission Evolution: pass already-computed pipeline signals so the
  // engine can generate new missions when the authored reservoir is exhausted.
  const _sg = (result as any).skillGapIntelligence;
  const _cc = (result as any).careerConfidence;
  const evolutionContext = (_sg || _cc)
    ? { upskillPriority: _sg?.upskillPriority ?? [], criticalGap: _cc?.criticalGap ?? null }
    : undefined;
  const personalizedSet = getPersonalizedActions(roleTitle, seniorityBracket, score, region, undefined, undefined, userProfileLike, undefined, uf.localCurrencyCode ?? undefined, undefined, undefined, loadCompletionsLocal(), loadEffectiveSuppressedActionIds(), evolutionContext);
  const actionEvidenceSource = personalizedSet.missionsEvolved
    ? 'missionEvolutionEngine v1.0'
    : 'actionPersonalizationEngine v8.0';
  const personalizedActions: ActionPlanItem[] = personalizedSet.actions.map((a) => ({
    // Match the pipeline's `pa_<hash>` / `evolved_<hash>` scheme so completion
    // state set here and in Action Progress refer to the same row.
    id: (a as any).id ?? stableActionId('pa', a.title ?? 'Action'),
    title: a.title ?? 'Action',
    description: a.description ?? '',
    priority: (a.priority as ActionPlanItem['priority']) ?? (score >= 65 ? 'Critical' : 'High'),
    layerFocus: a.layerFocus ?? 'L3 · Role Displacement',
    riskReductionPct: a.riskReductionPct ?? 15,
    deadline: a.deadline ?? '30 days',
    evidence: [{
      signal: `Role: ${getRoleGroupLabel(roleTitle)} · ${seniorityBracket} bracket · ${scoreToRiskLevel(score)} risk`,
      source: actionEvidenceSource,
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

  // Phase 8 — Mission Evolution state notices
  // When the authored reservoir is fully exhausted AND new evolved missions were
  // generated from live signals, prepend an explanatory card so the user
  // understands why these actions look different from the authored ones.
  if (personalizedSet.missionsEvolved) {
    personalizedActions.unshift({
      id: 'missions_evolved_notice',
      title: 'New Missions Generated from Your Live Risk Profile',
      description:
        "You've completed every pre-authored mission available for your role and tier — that's a significant milestone. " +
        "These new missions were generated from your live skill-gap and career readiness signals, " +
        "targeting the specific weaknesses detected in your current profile. " +
        "Complete them to keep your Career Confidence score rising and your protection layer active.",
      priority: 'Medium',
      layerFocus: 'L5 · Career Resilience — Mission Evolution',
      riskReductionPct: 0,
      deadline: 'Ongoing',
      evidence: [{ signal: 'All authored tier missions completed', source: 'missionEvolutionEngine v1.0', confidence: 'high' as const }],
    });
  }

  // When the reservoir is fully exhausted and no live signals were available to
  // generate evolved missions (rare: requires no skill gap data in the pipeline),
  // surface an explicit prompt to re-audit so fresh intelligence can unlock new missions.
  if (personalizedSet.allActionsExhausted && !personalizedSet.missionsEvolved) {
    personalizedActions.unshift({
      id: 'all_missions_mastered',
      title: 'All Tier Missions Complete — Re-Audit for New Intelligence',
      description:
        "You've completed every available mission for your current role and risk tier. " +
        "Run a new audit to refresh the intelligence layer: market conditions, risk signals, and mission " +
        "pools are updated continuously, and a re-audit may unlock a new tier or surface changed threats " +
        "that generate a fresh mission set tailored to your evolved profile.",
      priority: 'High',
      layerFocus: 'L5 · Career Resilience',
      riskReductionPct: 0,
      deadline: 'Re-audit when ready',
      evidence: [{ signal: 'Reservoir fully exhausted', source: 'actionPersonalizationEngine v8.0', confidence: 'high' as const }],
    });
  }

  // Inject personalized actions at the top of the list
  actions.push(...personalizedActions);

  // ── Phase 0: department freeze score timeline recalibration ─────────────────
  // Condition: departmentFreezeScore ≥ 65 AND collapseStage ≥ 2.
  // The department-level signal is more specific than the company-wide score.
  // Departments at Critical Freeze are historically cut 2–3 months before
  // company-wide announcements. This action recalibrates the user's timeline
  // — it does NOT reduce risk (riskReductionPct = 0) and is NOT an upskilling
  // action. It must appear before all other actions and gates Phase 1 unlock.
  const departmentFreezeScore = (result as any).departmentFreezeScore as number | null | undefined;
  const collapseStageForDept = result.collapseStage ?? null;
  const userDepartment = (result as any).userFactors?.department ?? (result as any).department ?? '';
  if (
    departmentFreezeScore != null &&
    departmentFreezeScore >= 65 &&
    collapseStageForDept != null &&
    collapseStageForDept >= 2
  ) {
    const freezeScore     = Math.round(departmentFreezeScore);
    const isCritical      = departmentFreezeScore >= 80;
    const freezeLabel     = isCritical ? 'Critical Freeze' : 'Freeze';
    const deptName        = userDepartment || 'Your department';

    // baseTimeline: what the overall score alone implies for transition urgency.
    const baseTimeline =
      score >= 75 ? '4–8 weeks'
      : score >= 55 ? '2–3 months'
      : score >= 40 ? '3–6 months'
      : '6–12 months';

    // adjustedTimeline: 6–8 weeks earlier than baseTimeline, reflecting the
    // department-level signal which fires before company-wide announcements.
    const adjustedTimeline =
      score >= 75 ? 'this week'
      : score >= 55 ? '2–4 weeks'
      : score >= 40 ? '6–10 weeks'
      : '3–6 months';

    // Prepend with unshift — Phase 0 must appear before all other actions.
    // The render loop also enforces this via assignPhase() === 0, but positional
    // prepending makes the intent explicit to future readers.
    actions.unshift({
      id:          `dept-freeze-phase0-${roleKey}`,
      title:       `[Phase 0] ${deptName} shows ${freezeScore}% hiring freeze at ${companyName} — timeline recalibration required`,
      description: [
        `Your department ${deptName} shows ${freezeScore}% hiring freeze at ${companyName}.`,
        `Departments at ${freezeLabel} are historically cut 2–3 months before company-wide announcements.`,
        `Your effective timeline is ${adjustedTimeline}, not ${baseTimeline}.`,
        `Begin transition 6–8 weeks earlier than the overall risk score suggests.`,
        ``,
        `This is a timeline recalibration, not an upskilling action. Do not start long-horizon skill-building (Phase 1) until you have read and understood this signal. The overall risk score (${Math.round(score)}/100) uses company-wide data — your department-level freeze score (${freezeScore}%) is a stronger, more specific leading indicator.`,
        ``,
        `Immediate step: acknowledge this signal and set a concrete start date for your job search, 6–8 weeks earlier than you would have based on the company-wide score alone.`,
      ].join('\n'),
      priority:         'Critical',
      layerFocus:       'L2 · Layoff & Instability History',
      // riskReductionPct = 0: this is a timeline recalibration, not a risk-reduction action.
      // Displaying a non-zero reduction would misrepresent what acknowledging this signal does.
      riskReductionPct: 0,
      deadline:         'Now — pre-announcement window',
      sequencePhase:    'phase0' as const,
    });
  }

  // ── Phase 0: Stage 3 emergency ───────────────────────────────────────────────
  // Only created when Stage 3 signals are active AND the dept-freeze Phase 0
  // wasn't already inserted (one Phase 0 action at a time to avoid overwhelm).
  // riskReductionPct = 0 for the same reason: this is an urgency recalibration,
  // not a skill or network action.
  if (
    (collapseStageForDept ?? 0) >= 3 &&
    !actions.some(a => a.id?.startsWith('dept-freeze-phase0'))
  ) {
    actions.unshift({
      id:          `stage3-emergency-phase0-${roleKey}`,
      title:       `[Phase 0] Stage 3 collapse signals active at ${companyName} — emergency timeline`,
      description: [
        `Stage 3 collapse signals are active at ${companyName}.`,
        `The combination of leadership instability, sustained negative coverage, and layoff history has crossed the threshold that historically precedes formal announcements by 4–8 weeks.`,
        `Your effective timeline is now, not the horizon implied by the overall score.`,
        `Begin transition 6–8 weeks earlier than the overall risk score suggests.`,
        ``,
        `This is not a "watch and wait" situation. Phase 1 actions are locked until you complete this step: treat your job search as a full-time parallel project this week. Schedule 3 targeted applications by end of week. Do not let the apparent stability of your current role delay this action.`,
      ].join('\n'),
      priority:         'Critical',
      layerFocus:       'L2 · Layoff & Instability History',
      riskReductionPct: 0,
      deadline:         'Now — 4–8 week pre-announcement window',
      sequencePhase:    'phase0' as const,
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
      // Content-hash ID (was `role-${prefix}-${bracket}-${actions.length}`, which
      // depended on array length at insertion time — completion state shifted
      // whenever an upstream action was added/removed). Hashing title+bracket
      // keeps the ID stable across re-audits while still distinguishing the same
      // role action calibrated for a different seniority bracket.
      id: stableActionId('role', `${action.title ?? ''}|${prefix}|${seniorityBracket}`),
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
  //
  // Income-dip gate (conservative + critical):
  // For users with < 6 months runway, suppress career path actions that imply
  // a salary decrease OR an income gap. Showing a "−10% salary, 3-month gap"
  // pivot to someone with 2 months runway is actionable harm, not advice.
  // When suppressed, the career path action is replaced by a targeted job-search
  // action (already added above for CRITICAL/HIGH tiers).
  if (intel?.careerPaths?.length) {
    const topPath = intel.careerPaths[0];

    // Income-dip suppression gate for conservative/critical runway profiles.
    // When active, the career path action is skipped — the CRITICAL cash
    // preservation actions and HIGH job-search-now action already cover the
    // correct immediate behavior for users who cannot survive an income gap.
    const isConservative = financialProfile?.riskAppetite === 'conservative';
    const deltaLow = parseSalaryDeltaLow(topPath.salaryDelta);
    const incomeDipMonths = topPath.income_dip_months ?? 0;
    const skipCareerPath = isConservative && (
      (runwayTier === 'CRITICAL' && (incomeDipMonths > 0 || deltaLow < 0)) ||
      (runwayTier === 'HIGH'     && (incomeDipMonths > 3 || deltaLow < -10))
    );

    if (!skipCareerPath) {
    // Use synchronous lookup inside the pure action builder.
    // The component-level useEffect below fetches the async (live Supabase) version
    // and stores it in liveMarketData — if available it overrides this result.
    const market = liveMarketData ?? getCareerPathMarketSync(topPath.role);
    // Resolve region-specific market data — avoids surfacing India Naukri numbers to
    // Philippines, UK, Singapore, etc. users. `region` is already derived above from
    // result.region ?? result.companyRegion.
    const resolvedMarket = market ? resolveRegionalMarket(market, region) : null;
    // v7.0: cityKey is now an explicit parameter — no localStorage reads inside this function.
    // The city key must be normalised (lowercase, underscores) before being passed here.
    let cityIntersectionText = '';
    if (market) {
      if (cityKey) {
        // Derive the target role's prefix for CITY_OPPORTUNITIES lookup.
        // CRITICAL: must use the TARGET role prefix, not the user's current role prefix.
        // An SW engineer exploring "Data Engineer" must see Hyderabad data engineering
        // employers — not Hyderabad SW employers intersected with national data companies.
        const targetPrefix = deriveTargetRolePrefix(topPath.role);
        // Pass BOTH India and Global hiring pools — getCityCompanyIntersection now
        // routes to globalCityEmployers.ts for non-India cities (Singapore, London,
        // Berlin, Amsterdam, Dublin, SF, NYC, etc.) and intersects with the global
        // pool instead of the India pool. Without this, a Singapore SWE pivoting to
        // ML Engineering received Indian companies as the fallback — non-actionable.
        const intersection = getCityCompanyIntersection(
          cityKey,
          targetPrefix,
          market.topHiringCompaniesIndia,
          market.topHiringCompaniesGlobal,
        );
        const cityLabel = cityKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        if (intersection.source === 'intersection' && intersection.companies.length > 0) {
          // Named employers from both city AND national/global pool.
          // "In Hyderabad, Data Engineering is actively hiring at Walmart Global Tech,
          //  MakeMyTrip, and Paytm — appearing in both the Hyderabad market and the
          //  national talent pool."
          cityIntersectionText =
            ` In ${cityLabel}, ${topPath.role} is actively hiring at ` +
            `${joinWithAnd(intersection.companies)} — ` +
            `appearing in both the ${cityLabel} market and the talent pool.`;
        } else if (intersection.source === 'city_fallback' && intersection.companies.length > 0) {
          // City has data but no overlap with national/global list — name city employers directly.
          // The actionable signal: these are the companies hiring in this city RIGHT NOW.
          // E.g., Singapore SWE → ML: "In Singapore, active employers for ML Engineer:
          //   Grab, Sea Limited, and Shopee."
          cityIntersectionText =
            ` In ${cityLabel}, active employers for ${topPath.role}: ` +
            `${joinWithAnd(intersection.companies)}.`;
        } else if (intersection.source === 'global_fallback' && intersection.companies.length > 0) {
          // City not in the global registry, but we have global hirers — name them
          // and prompt for live verification.
          cityIntersectionText =
            ` Global employers hiring for ${topPath.role}: ` +
            `${joinWithAnd(intersection.companies)}. ` +
            `City-specific data not available for ${cityLabel} — verify current openings on LinkedIn / local job boards.`;
        } else if (intersection.source === 'national_fallback' && intersection.companies.length > 0) {
          // City not in CITY_OPPORTUNITIES — name national employers, say city data is absent.
          cityIntersectionText =
            ` National employers hiring for ${topPath.role}: ` +
            `${joinWithAnd(intersection.companies)}. ` +
            `City-specific data not available for ${cityLabel} — verify current openings on Naukri/LinkedIn.`;
        } else if (intersection.source === 'unknown_city') {
          // Neither India nor global registries know this city — explicit prompt.
          cityIntersectionText =
            ` City data unavailable for ${cityLabel} for ${topPath.role}. ` +
            `Search LinkedIn / local job boards for current openings and add a recognised city in Financial Context.`;
        }
      } else if (resolvedMarket && resolvedMarket.hiringCompanies.length > 0) {
        // No city key — show region-specific employers (or global if no region data).
        // resolveRegionalMarket() already chose named fields / topHiringCompaniesByRegion[region]
        // first, then topHiringCompaniesGlobal — NEVER topHiringCompaniesIndia for non-India users.
        const topEmployers = resolvedMarket.hiringCompanies.slice(0, 5);
        const openingCount = resolvedMarket.isRegionSpecific
          ? `~${resolvedMarket.count.toLocaleString()} openings`
          : null;
        const employerScope = resolvedMarket.isHiringCompaniesRegionSpecific
          ? `in ${resolvedMarket.regionLabel}`
          : 'globally';
        cityIntersectionText =
          (openingCount ? ` ${resolvedMarket.regionLabel} market: ${openingCount}.` : '') +
          ` Top hirers ${employerScope}: ${joinWithAnd(topEmployers)}.` +
          ` Median ${resolvedMarket.weeksToFirstInterview} weeks to first interview.` +
          (resolvedMarket.isRegionSpecific ? '' : ' Add your city in Financial Context to see local opportunities.');
        // Append remote options when relevant (markets with limited local supply).
        if (resolvedMarket.remoteOpenings && resolvedMarket.topHiringCompaniesRemote.length > 0) {
          const remoteCount = resolvedMarket.remoteOpenings.toLocaleString();
          const topRemote   = resolvedMarket.topHiringCompaniesRemote.slice(0, 2);
          cityIntersectionText +=
            ` Remote-eligible openings: ~${remoteCount} globally (${joinWithAnd(topRemote)}).`;
        }
      }
    }
    // Compute data age and staleness for the market opening count.
    // Opening counts are hardcoded integers — they do not refresh automatically.
    // If data is > 90 days old (MARKET_DATA_STALE_DAYS), add a live-verification caveat
    // so users do not make a career pivot decision on significantly out-of-date demand data.
    const stale     = market ? isMarketDataStale(market) : false;
    const ageLabel  = market ? marketDataAgeLabel(market) : '';
    // Use resolved region count (e.g. Philippines 680 not India 12,000) with correct label.
    const resolvedCount   = resolvedMarket?.count ?? market?.globalOpenings ?? 0;
    const resolvedLabel   = resolvedMarket?.regionLabel ?? 'global';
    const primarySource   = resolvedMarket?.source ?? 'global aggregate';
    const openingsDisplay = market
      ? `${resolvedCount.toLocaleString()} (${ageLabel})`
      : '';
    const verifySource = resolvedMarket?.suggestedSources?.[0] ?? 'LinkedIn';
    const stalenessCaveat = stale
      ? ` Opening count is ${ageLabel} — verify current demand on ${verifySource} before committing to this transition.`
      : '';

    // Provenance prefix: live Supabase data vs research estimate
    const isLiveData = market?.dataSource?.startsWith('Live');
    const provenancePrefix = market
      ? (isLiveData ? '[🟢 Live]' : '[📅 Research est.]')
      : '';

    // For conservative profiles, omit the salary delta from the description
    // when the transition implies a salary decrease — showing "-5–+10%" to
    // someone with 3 months runway invites them to consider a pay cut they
    // cannot survive. The transition opportunity is still surfaced; the
    // risky salary context is suppressed.
    const regionDataNote = resolvedMarket && !resolvedMarket.isRegionSpecific
      ? ` (${resolvedLabel}-specific data unavailable — showing global estimate; verify on ${verifySource})`
      : '';
    const suppressSalaryContext = isConservative && deltaLow < 0;
    const marketContext = market
      ? ` ${provenancePrefix} Market reality: ${openingsDisplay} active openings in ${resolvedLabel}${regionDataNote} (${formatDemandTrendLabel(market.demandTrend)}).${stalenessCaveat} Hiring bar: ${market.hiringBar} Success rate (12 months): ${formatSuccessRate(market.successRate12mPct)}.${suppressSalaryContext ? '' : ` Median salary delta: +${market.medianSalaryDeltaPct}%.`}${cityIntersectionText}`
      : ` Key skill gap: ${topPath.skillGap}. Reach out to 2 people currently in this role on LinkedIn this week to verify market demand before investing.`;
    actions.push({
      id: `career-path-${topPath.role.replace(/\s/g, '-')}`,
      title: `Explore Adjacent Role: ${topPath.role}`,
      description: `This transition offers ${topPath.riskReduction}% risk reduction. Typical transition time: ${topPath.timeToTransition}.${marketContext}`,
      priority: score >= 70 ? "High" : "Medium",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: topPath.riskReduction,
      deadline: resolvedMarket
        ? `${resolvedMarket.weeksToFirstInterview} weeks to first interview`
        : market ? `${market.weeksToFirstInterview} weeks to first interview` : topPath.timeToTransition,
    });
    } // end if (!skipCareerPath)
  }

  // 8. City opportunity action — when market headwinds are high (L4 > 0.60)
  // and a higher-opportunity city has named employers actively hiring.
  //
  // The TITLE must name specific employers — "Explore [city] market" without
  // employer names is exactly the generic reference the spec forbids.
  const l4Score = result.breakdown?.L4 ?? 0;
  if (l4Score > 0.60) {
    const topCities = getCitiesForRole(prefix).slice(0, 2);
    if (topCities.length > 0) {
      const best = topCities[0];
      const namedEmployers   = best.opportunity.top_5_hiring_companies.slice(0, 2);
      const namedEmployerStr = namedEmployers.join(' & ');
      const otherCount       = Math.max(0, best.opportunity.employer_count - namedEmployers.length);
      actions.push({
        id: `city-opportunity-${prefix}`,
        // Title leads with specific company names + the residual count.
        // The user can recognise the brands instantly; the "+ N more" anchors scale.
        title: `${namedEmployerStr} + ${otherCount}+ in ${best.city} are actively hiring`,
        description:
          `Your current market shows elevated headwinds (L4: ${Math.round(l4Score * 100)}/100). ` +
          `${best.city} has ${best.opportunity.employer_count} companies actively hiring for ${prefix.toUpperCase()} roles: ` +
          `${joinWithAnd(best.opportunity.top_5_hiring_companies.slice(0, 3))}, among others. ` +
          `Salary: ${formatSalaryPremium(best.opportunity.salary_premium_pct)}. ` +
          `Median placement time: ${best.opportunity.avg_placement_weeks} weeks. ` +
          `Remote adoption: ${Math.round(best.opportunity.remote_adoption_rate * 100)}%.`,
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
  // Uses role-aware hours so Python = 40h for SW engineers vs 90h for finance
  // analysts — the same skill has a different learning curve depending on the
  // user's background. The data is stored on the item object; ActionItem
  // highlights the active track at render time without recomputing.
  const annotatedActions = actions.map(item => {
    const learningWeeks = getSkillLearningWeeksForRole(item.title, roleKey) ?? getSkillLearningWeeks(item.title);
    return learningWeeks ? { ...item, learningWeeks } : item;
  });

  // De-duplicate by id
  const seen = new Set<string>();
  let unique = annotatedActions.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });

  // Priority 4: Apply financial context — adjust urgency and filter dangerous actions
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

    // Income-gap suppression for conservative profiles.
    // CRITICAL tier: full keyword list — a user with < 3 months runway cannot
    // survive ANY voluntary income gap. Suppress any action that implies one.
    // HIGH/other conservative: keep the narrow filter (quit / leave your job).
    if (riskAppetite === 'conservative') {
      if (runwayTier === 'CRITICAL') {
        unique = unique.filter(item => {
          const text = (item.title + ' ' + (item.description ?? '')).toLowerCase();
          return !INCOME_GAP_KEYWORDS.some(kw => text.includes(kw));
        });
      } else {
        // HIGH and other conservative: narrow filter only
        unique = unique.filter(item => {
          const text = (item.description ?? '').toLowerCase();
          return !text.includes('quit') && !text.includes('leave your job');
        });
      }
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
  // ── Data / Analytics ───────────────────────────────────────────────────────
  data: [
    { title: "LLMs for Data Analysis", provider: "DeepLearning.AI", url: "https://www.deeplearning.ai/short-courses/", free: true, costINR: 0 },
    { title: "Advanced SQL for Analytics", provider: "Mode / Coursera", url: "https://mode.com/sql-tutorial/", free: true, costINR: 0 },
    { title: "Analytics Engineering with dbt", provider: "dbt Labs", url: "https://learn.getdbt.com/", free: true, costINR: 0 },
  ],
  // ── ML / AI Engineering ────────────────────────────────────────────────────
  ml: [
    { title: "LLM Apps: Building & Evaluating", provider: "DeepLearning.AI", url: "https://www.deeplearning.ai/short-courses/", free: true, costINR: 0 },
    { title: "Hugging Face NLP Course", provider: "Hugging Face", url: "https://huggingface.co/learn/nlp-course", free: true, costINR: 0 },
    { title: "Full Stack LLM Bootcamp", provider: "The Full Stack", url: "https://fullstackdeeplearning.com/llm-bootcamp/", free: true, costINR: 0 },
  ],
  // ── Product / Program Management ───────────────────────────────────────────
  pm: [
    { title: "AI for Product Managers", provider: "Coursera / Duke", url: "https://www.coursera.org/learn/ai-product-management-duke", free: false, costINR: 4500 },
    { title: "Continuous Discovery Habits", provider: "Product Talk", url: "https://www.producttalk.org/", free: true, costINR: 0 },
    { title: "Building AI Products", provider: "Reforge", url: "https://www.reforge.com/", free: false, costINR: 12000 },
  ],
  // ── Design / UX ────────────────────────────────────────────────────────────
  design: [
    { title: "AI for UX Designers", provider: "IxDF", url: "https://www.interaction-design.org/", free: false, costINR: 3500 },
    { title: "Figma AI & Generative Design", provider: "Figma Learn", url: "https://www.figma.com/resource-library/", free: true, costINR: 0 },
    { title: "Design Systems at Scale", provider: "DesignSystems.com", url: "https://www.designsystems.com/", free: true, costINR: 0 },
  ],
  // ── Sales / Account Management ─────────────────────────────────────────────
  sales: [
    { title: "AI for Sales Productivity", provider: "HubSpot Academy", url: "https://academy.hubspot.com/", free: true, costINR: 0 },
    { title: "Modern Outbound with AI Tools", provider: "Clay University", url: "https://www.clay.com/university", free: true, costINR: 0 },
    { title: "Consultative Enterprise Selling", provider: "LinkedIn Learning", url: "https://www.linkedin.com/learning/", free: false, costINR: 2500 },
  ],
  // ── Operations / BizOps ────────────────────────────────────────────────────
  ops: [
    { title: "No-Code Automation (Make)", provider: "Make Academy", url: "https://www.make.com/en/academy", free: true, costINR: 0 },
    { title: "Operations Analytics", provider: "Coursera / Wharton", url: "https://www.coursera.org/learn/wharton-operations", free: false, costINR: 4500 },
    { title: "Process Automation with AI", provider: "Zapier Learn", url: "https://zapier.com/learn/", free: true, costINR: 0 },
  ],
  // ── Marketing ──────────────────────────────────────────────────────────────
  mkt: [
    { title: "AI-Powered Performance Marketing", provider: "Google Skillshop", url: "https://skillshop.withgoogle.com/", free: true, costINR: 0 },
    { title: "Generative AI for Marketers", provider: "HubSpot Academy", url: "https://academy.hubspot.com/", free: true, costINR: 0 },
    { title: "Marketing Analytics", provider: "Meta Blueprint", url: "https://www.facebook.com/business/learn", free: true, costINR: 0 },
  ],
  // ── Customer Support / Success ─────────────────────────────────────────────
  cs: [
    { title: "AI in Customer Service", provider: "Zendesk", url: "https://training.zendesk.com/", free: true, costINR: 0 },
    { title: "Customer Success Foundations", provider: "LinkedIn Learning", url: "https://www.linkedin.com/learning/", free: false, costINR: 2500 },
    { title: "Conversation Design for Bots", provider: "Coursera", url: "https://www.coursera.org/", free: false, costINR: 3000 },
  ],
  // ── Consulting / Strategy ──────────────────────────────────────────────────
  cons: [
    { title: "Generative AI for Consultants", provider: "BCG / Coursera", url: "https://www.coursera.org/", free: false, costINR: 4500 },
    { title: "Storytelling with Data", provider: "storytellingwithdata", url: "https://www.storytellingwithdata.com/", free: true, costINR: 0 },
    { title: "AI Strategy & Transformation", provider: "MIT Sloan (edX)", url: "https://www.edx.org/", free: false, costINR: 9000 },
  ],
  // ── Education / Training ───────────────────────────────────────────────────
  edu: [
    { title: "AI for Educators", provider: "Code.org / Common Sense", url: "https://www.commonsense.org/education/", free: true, costINR: 0 },
    { title: "Teaching with AI Tools", provider: "MagicSchool AI", url: "https://www.magicschool.ai/", free: true, costINR: 0 },
    { title: "Learning Design Foundations", provider: "Coursera", url: "https://www.coursera.org/", free: false, costINR: 3000 },
  ],
  // ── Industrial / Skilled Trades ────────────────────────────────────────────
  ind: [
    { title: "Industry 4.0 & Smart Manufacturing", provider: "Coursera", url: "https://www.coursera.org/", free: false, costINR: 4000 },
    { title: "AI in Operations & Maintenance", provider: "edX", url: "https://www.edx.org/", free: false, costINR: 5000 },
    { title: "Frontline Digital Skills", provider: "Google Career Certificates", url: "https://grow.google/certificates/", free: true, costINR: 0 },
  ],
  // ── QA / Testing ───────────────────────────────────────────────────────────
  qa: [
    { title: "AI-Augmented Test Automation", provider: "Test Automation U", url: "https://testautomationu.applitools.com/", free: true, costINR: 0 },
    { title: "Playwright End-to-End Testing", provider: "Playwright", url: "https://playwright.dev/docs/intro", free: true, costINR: 0 },
    { title: "Quality Engineering in the AI Era", provider: "Ministry of Testing", url: "https://www.ministryoftesting.com/", free: false, costINR: 2500 },
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
    <div className="rounded-xl border border-[var(--alpha-bg-10)] p-4 mb-4 bg-[var(--alpha-bg-04)]">
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
                className="text-[10px] px-2.5 py-1 rounded border border-[var(--alpha-bg-12)] bg-[var(--alpha-bg-05)] hover:bg-[var(--alpha-bg-10)] text-muted-foreground hover:text-[var(--text)] transition-colors font-mono"
              >
                Reset to derived ({BRACKET_LABELS[derivedBracket]})
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground/50 font-mono">Actions wrong for your level?</span>
            )}
            {canGoDown && (
              <button
                onClick={() => onOverride(BRACKET_ORDER[idx - 1])}
                className="text-[10px] px-2.5 py-1 rounded border border-[var(--alpha-bg-12)] bg-[var(--alpha-bg-05)] hover:bg-[var(--alpha-bg-10)] text-muted-foreground hover:text-[var(--text)] transition-colors font-mono flex items-center gap-1"
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
  /** True when this action has the highest ROI (riskReductionPct ÷ hours) in its phase */
  isTopRoiInPhase?: boolean;
}

const ACTION_TRACK_CFG = [
  { track: 'minimal'   as TrackType, hours: 2,  key: 'w2'  as const },
  { track: 'moderate'  as TrackType, hours: 8,  key: 'w8'  as const },
  { track: 'intensive' as TrackType, hours: 20, key: 'w20' as const },
] as const;

// Priority color tokens for action items
const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  Critical: { color: 'var(--color-red-text)', bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.20)',  label: 'CRITICAL' },
  High:     { color: 'var(--color-orange-text)', bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.18)', label: 'HIGH' },
  Medium:   { color: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.16)', label: 'MEDIUM' },
  Low:      { color: 'var(--color-slate400-text)', bg: 'rgba(148,163,184,0.04)',border: 'rgba(148,163,184,0.14)',label: 'LOW' },
};

// Phase-based visual mapping — left border class + time horizon labels
const PHASE_CARD_CLASS: Record<string, string> = {
  Critical: 'action-card-phase-day1',
  High:     'action-card-phase-week1',
  Medium:   'action-card-phase-month1',
  Low:      'action-card-phase-quarter1',
};
const PHASE_LABEL: Record<string, string> = {
  Critical: 'TODAY',
  High:     'THIS WEEK',
  Medium:   'THIS MONTH',
  Low:      'LONG-TERM',
};
const PHASE_SUBTITLE: Record<string, string> = {
  Critical: '24–48 hours',
  High:     '7-day window',
  Medium:   '30-day horizon',
  Low:      '3+ months',
};

const ActionItem: React.FC<ActionItemProps> = ({ item, isCompleted, onToggle, index, isLocked = false, selectedTrack, isTopRoiInPhase = false }) => {
  const cfg = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.Medium;
  const phaseClass = PHASE_CARD_CLASS[item.priority] ?? 'action-card-phase-month1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className={`action-card ${phaseClass}${isLocked ? ' opacity-35 pointer-events-none' : ''}`}
      style={{ opacity: isCompleted ? 0.5 : 1 }}
    >
      {/* Checkbox */}
      <button
        onClick={isLocked ? undefined : onToggle}
        disabled={isLocked}
        className="flex-shrink-0 mt-0.5 focus:outline-none"
        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
        aria-checked={isCompleted}
        aria-disabled={isLocked}
        role="checkbox"
      >
        {isCompleted ? (
          <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-emerald-text)' }} />
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
                  background: 'rgba(16,185,129,0.12)', color: 'var(--color-emerald-text)',
                  border: '1px solid rgba(16,185,129,0.22)', letterSpacing: '0.08em',
                }}>
                  −{item.riskReductionPct}% RISK
                </span>
              )}
              {isTopRoiInPhase && !isCompleted && (
                <span
                  title={`Highest ROI in this phase: ${item.riskReductionPct}% risk reduction ÷ estimated hours`}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 900,
                    padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.06em',
                    background: 'rgba(245,158,11,0.14)', color: 'var(--color-amber500-text)',
                    border: '1px solid rgba(245,158,11,0.32)',
                    display: 'flex', alignItems: 'center', gap: '3px',
                  }}
                >
                  <Zap style={{ width: '9px', height: '9px', display: 'inline', flexShrink: 0 }} />
                  Highest impact per hour
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

          {/* Learning weeks ROI row — all three tracks simultaneously.
              The selected track is amber; others are dimmed.
              Computed once from skillLearningHours (role-aware); updates live
              on track change via React re-render — no API call. */}
          {item.learningWeeks && (
            <div className="flex items-center gap-2 flex-wrap mb-2.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>
              <Zap className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--amber)', opacity: 0.6 }} />
              {ACTION_TRACK_CFG.map(({ track, hours, key }, i) => {
                const weeks = item.learningWeeks![key];
                const sel = track === selectedTrack;
                return (
                  <React.Fragment key={track}>
                    {i > 0 && <span style={{ color: 'var(--alpha-text-25)' }}>·</span>}
                    <span style={{
                      color: sel ? 'var(--color-amber500-text)' : 'var(--text-3)',
                      fontWeight: sel ? 800 : 400,
                      opacity: sel ? 1 : 0.45,
                      letterSpacing: '0.06em',
                    }}>
                      {hours}h/wk: {weeks} {weeks === 1 ? 'week' : 'weeks'}
                    </span>
                  </React.Fragment>
                );
              })}
              <span style={{ color: 'var(--text-3)', opacity: 0.35 }}>to proficiency</span>
            </div>
          )}

          {/* Cost label — only when the engine extracted a cost and converted it */}
          {item.costDisplayLabel && (
            <div className="flex items-center gap-1.5 mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.60rem' }}>
              <DollarSign className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'var(--color-emerald-text)', opacity: 0.75 }} />
              <span style={{ color: 'var(--color-emerald-text)', fontWeight: 700 }}>{item.costDisplayLabel}</span>
              <span style={{ color: 'var(--alpha-text-25)', fontSize: '0.52rem', letterSpacing: '0.05em' }}>MODELED · 2024-Q2</span>
            </div>
          )}

          {/* Meta row — layer focus + deadline */}
          <div className="flex flex-wrap gap-2 items-center">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '3px 8px', borderRadius: '6px',
              background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)',
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
                background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)',
                fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)',
                letterSpacing: '0.06em',
              }}>
                <Clock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'var(--color-amber500-text)' }} />
                {/* When learningWeeks is present, the deadline annotation reflects
                    the selected track — updates live on track change, pure JS. */}
                {item.learningWeeks
                  ? (() => {
                      const trackMap = { minimal: 'w2', moderate: 'w8', intensive: 'w20' } as const;
                      const wks = item.learningWeeks[trackMap[selectedTrack]];
                      return `${wks} ${wks === 1 ? 'week' : 'weeks'} at current track`;
                    })()
                  : item.deadline}
                {item.originalDeadline && !item.learningWeeks && (
                  <span style={{ opacity: 0.5, fontSize: '0.52rem' }}>
                    (from {item.originalDeadline})
                  </span>
                )}
              </div>
            )}
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
  const color = pct < 30 ? 'var(--color-red-text)' : pct < 70 ? 'var(--color-orange-text)' : 'var(--color-emerald-text)';

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
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--alpha-bg-06)" strokeWidth={7} />
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
      <div className="w-full h-1.5 bg-[var(--alpha-bg-05)] rounded-full overflow-hidden">
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

// A course entry with an optional "why" — populated when the course is matched
// to one of the user's specific at-risk skills (skill-derived personalisation).
type RankedCourse = CourseEntry & { reason?: string };

/**
 * Build a skill-targeted "search this skill" learning entry for each of the
 * user's top at-risk skills. Two people in the same role with different skill
 * gaps get different entries here — this is what makes the section per-user,
 * not just per-role. Uses a vendor-neutral course-search deep link so the
 * suggestion is always live and specific to THEIR skill, not a static title.
 */
function buildSkillTargetedCourses(roleKey: string): RankedCourse[] {
  const intel = getCareerIntelligence(roleKey);
  const atRisk = intel?.skills?.at_risk ?? [];
  return atRisk
    .slice(0, 2)
    .map((s): RankedCourse => {
      const q = encodeURIComponent(`${s.skill} AI automation`);
      return {
        title: `Stay ahead on "${s.skill}" (risk ${s.riskScore}/100)`,
        provider: s.aiTool ? `Move to the oversight layer — AI doing this: ${s.aiTool}` : 'Reposition above the automatable layer',
        url: `https://www.coursera.org/search?query=${q}`,
        free: true,
        costINR: 0,
        reason: 'Targeted to your highest-risk skill',
      };
    });
}

const CourseResourceCard: React.FC<{ rolePrefix: string; roleKey: string; financialProfile?: FinancialProfile | null }> = ({ rolePrefix, roleKey, financialProfile }) => {
  const conservative = financialProfile?.riskAppetite === 'conservative';

  // Personalised composition (most-specific first):
  //   1. skill-targeted entries from the user's own at-risk skills
  //   2. role-family curated courses (now covering 20+ families, not 6)
  // De-duplicated by title, then conservative-filtered to free/≤₹3K when needed.
  const { courses, baseCount, conservativeFiltered } = useMemo(() => {
    const skillCourses = buildSkillTargetedCourses(roleKey);
    const roleCourses: RankedCourse[] = (COURSE_RESOURCES[rolePrefix] ?? COURSE_RESOURCES.default).map(c => ({ ...c }));
    const merged: RankedCourse[] = [...skillCourses, ...roleCourses];
    // de-dup by title
    const seen = new Set<string>();
    const unique = merged.filter(c => {
      const k = c.title.toLowerCase().trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const filtered = conservative ? unique.filter(c => c.free || c.costINR <= 3000) : unique;
    return {
      courses: filtered,
      baseCount: unique.length,
      conservativeFiltered: conservative && filtered.length < unique.length,
    };
  }, [rolePrefix, roleKey, conservative]);

  return (
    <div className="glass-panel p-5 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <h4 className="font-bold text-sm">Recommended Learning</h4>
        <span className="ml-auto text-[10px] font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded">
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
            className="flex items-start gap-3 p-3 bg-[var(--alpha-bg-05)] rounded-lg border border-[var(--alpha-bg-05)] hover:bg-[var(--alpha-bg-10)] hover:border-[var(--border-cyan)] transition-all group"
          >
            <div className="p-1.5 rounded-lg bg-[var(--alpha-bg-05)] flex-shrink-0">
              <Star className={`w-3.5 h-3.5 ${c.reason ? 'text-cyan-400' : 'text-amber-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight group-hover:text-[var(--cyan)] transition-colors">{c.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.provider}</div>
              {c.reason && (
                <div className="text-[10px] text-cyan-400/80 mt-1 font-semibold">{c.reason}</div>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {c.free && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black">
                  FREE
                </span>
              )}
              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>
      {baseCount > 0 && (
        <p className="text-[9px] text-muted-foreground mt-3">
          Tailored to your role and your highest-risk skills. Costs are approximate; check provider for current pricing.
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Productivity Tools Card — role-specific AI tools (replaces the old single
// hardcoded list of 4 tools shown to every user regardless of profession).
// ---------------------------------------------------------------------------

const ProductivityToolsCard: React.FC<{ roleKey: string }> = ({ roleKey }) => {
  // Derive extra tools from the user's OWN at-risk skills: when the
  // intelligence corpus names the AI tool already doing one of their skills,
  // surface it directly so they learn the exact thing displacing them. This is
  // the most personalised entry — two users in the same role with different
  // skill gaps see different leading tools.
  const skillDerived: ProductivityTool[] = useMemo(() => {
    const intel = getCareerIntelligence(roleKey);
    const atRisk = intel?.skills?.at_risk ?? [];
    const out: ProductivityTool[] = [];
    for (const s of atRisk) {
      if (s.aiTool && out.length < 2) {
        // aiTool may be a comma-separated list — take the first named product.
        const first = s.aiTool.split(/[,/]/)[0].trim();
        if (first) {
          out.push({
            name: first,
            desc: `Now automating "${s.skill}" — learn to direct and audit it`,
            url: `https://www.google.com/search?q=${encodeURIComponent(first)}`,
            tag: 'YOUR RISK',
          });
        }
      }
    }
    return out;
  }, [roleKey]);

  const { family, roleSpecific, tools } = useMemo(
    () => getProductivityToolsForRole(roleKey, 5, skillDerived),
    [roleKey, skillDerived],
  );

  return (
    <div className="glass-panel p-5 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-4 h-4 text-violet-400" />
        <h4 className="font-bold text-sm">AI Productivity Tools</h4>
        <span className="ml-auto text-[10px] font-black bg-violet-500/15 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded">
          {roleSpecific ? familyDisplayLabel(family).toUpperCase() : 'GENERAL'}
        </span>
      </div>
      <div className="space-y-2">
        {tools.map((tool, i) => (
          <a key={i} href={tool.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-2.5 bg-[var(--alpha-bg-05)] rounded-lg hover:bg-[var(--alpha-bg-10)] transition-colors group"
          >
            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-[var(--cyan)] transition-colors flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold">{tool.name}</div>
              <div className="text-[10px] text-muted-foreground">{tool.desc}</div>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black flex-shrink-0 border ${
              tool.tag === 'YOUR RISK'
                ? 'bg-red-500/15 text-red-400 border-red-500/20'
                : 'bg-violet-500/15 text-violet-400 border-violet-500/20'
            }`}>
              {tool.tag}
            </span>
          </a>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground mt-3">
        {roleSpecific
          ? `Selected for ${familyDisplayLabel(family)} roles — the tools actively reshaping your profession.`
          : 'General-purpose tools — add your role for profession-specific picks.'}
      </p>
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
  // financialCtxVersion bumps when the user saves their context inline (via the
  // "Personalise Your Strategy" form below). Without this, financialCtx was read
  // ONCE at mount with an empty-deps useMemo, so saving the form changed nothing
  // on the page — no re-derived profile, no re-urgency'd deadlines, no updated
  // Financial Impact Calculator. The bump forces every downstream memo to recompute.
  const [financialCtxVersion, setFinancialCtxVersion] = useState(0);
  const financialCtx = useMemo(() => loadFinancialContext(), [financialCtxVersion]);
  // Pass the visa amplifier so urgencyMultiplier = financialUrgency × visaAmplifier.
  // An H1B holder at score 68 with 3 months runway gets 1.3 × 1.35 = 1.755×.
  // Their "6 months" action plan becomes ~3.4 months — correct, because they
  // cannot use a citizen's transition timeline with a 60-day grace period.
  const visaAmplifier = (result as any).visaRisk?.scoreAmplifier as number | undefined;
  const financialProfile = useMemo(
    () => financialCtx ? deriveFinancialProfile(financialCtx, result.total, visaAmplifier) : null,
    [financialCtx, result.total, visaAmplifier],
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

  // Toggling here must also feed actionCompletionService so the rotation
  // engine (actionPersonalizationEngine's selectWithRotation) sees this
  // completion — this view previously kept its own separate "actionPlanCompleted"
  // localStorage key with no link to that engine, so actions completed here
  // never stopped recurring in future personalized recommendations.
  const toggleItemCompletion = (itemId: string, wasCompleted: boolean) => {
    const updatedItems = { ...completedItems, [itemId]: !wasCompleted };
    setCompletedItems(updatedItems);
    if (wasCompleted) {
      unmarkActionComplete(itemId).catch(() => {});
    } else {
      markActionComplete(itemId, { scoreAtCompletion: result.total }).catch(() => {});
      // Phase 8 delight loop — fire achievement check immediately on completion
      // so toasts appear without waiting for a re-audit.
      const completedCount = Object.values(updatedItems).filter(Boolean).length;
      checkAndUnlockAchievements({ completedActionCount: completedCount, currentScore: result.total });
    }
  };

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
    // v40.0: Sort within each dependency phase by ROI = riskReductionPct ÷ estimated_hours.
    // This preserves phase ordering (Phase 1 before Phase 2 before Phase 3) while
    // ensuring the highest-value action per hour floats to the top of its phase.
    // The top-ROI item in each phase receives _topRoiInPhase=true for the badge.
    //
    // Note: selectedTrack is included in the dependency array so the sort
    // re-runs when the track changes (role-aware hours may differ per track).
    // No API call needed — all data is in client memory.
    const pending   = trackLimitedItems.filter((it) => !completedItems[it.id]);
    const completed = trackLimitedItems.filter((it) => completedItems[it.id]);
    const roiSorted = sortByROIWithinPhases(pending as ActionPlanItem[], assignPhase);
    return [...roiSorted, ...completed];
  }, [trackLimitedItems, completedItems, selectedTrack]);

  const completedCount = useMemo(
    () => sortedItems.filter(item => completedItems[item.id]).length,
    [sortedItems, completedItems],
  );

  // Phase lock state — mirrors ActionDependencyGraph exactly.
  //
  // Phase 0: never locked (it IS the emergency gate).
  // Phase 1: locked when Phase 0 items exist AND Phase 0 is not 100% complete.
  // Phase 2: locked when Phase 1 < 50% complete.
  // Phase 3: locked when Phase 2 < 50% complete.
  //
  // The lock is enforced: pointer-events disabled + aria-disabled on the checkbox.
  // A user who skips Phase 0 and jumps directly to long-horizon upskilling has
  // made a worse decision than if the platform had never intervened.
  const { lockedPhases, phase0Items } = useMemo(() => {
    const byPhase: Record<0 | 1 | 2 | 3, ActionPlanItem[]> = { 0: [], 1: [], 2: [], 3: [] };
    for (const item of sortedItems) {
      byPhase[assignPhase(item)].push(item);
    }
    const phasePct = (ph: 0 | 1 | 2 | 3): number => {
      const items = byPhase[ph];
      if (items.length === 0) return 100; // empty phase = satisfied
      const done = items.filter(i => completedItems[i.id]).length;
      return Math.round((done / items.length) * 100);
    };
    const p0 = phasePct(0);
    const p1 = phasePct(1);
    const p2 = phasePct(2);
    const hasPhase0 = byPhase[0].length > 0;
    return {
      phase0Items: byPhase[0],
      lockedPhases: new Set<1 | 2 | 3>([
        // Phase 1 locks when Phase 0 emergency action is not yet completed
        ...(hasPhase0 && p0 < 100 ? [1 as const] : []),
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
              <div className="rounded-2xl border border-[var(--alpha-bg-10)] overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 bg-[var(--alpha-bg-02)] hover:bg-[var(--alpha-bg-04)] transition-colors"
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
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
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
                  <div className="px-5 py-5 border-t border-[var(--alpha-bg-06)]">
                    <CareerInsuranceKit plan={insurancePlan} companyName={companyData.name ?? ''} />
                  </div>
                )}
              </div>

              {/* Financial Impact Calculator */}
              <div className="rounded-2xl border border-[var(--alpha-bg-10)] overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 bg-[var(--alpha-bg-02)] hover:bg-[var(--alpha-bg-04)] transition-colors"
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
                  <div className="px-5 py-5 border-t border-[var(--alpha-bg-06)]">
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
              description={`${sortedItems.length} actions tailored to ${
                (result as any).roleTitle ??
                (result as any).userProfile?.roleTitle ??
                result.workTypeKey.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
              } at risk score ${result.total}/100. Set your available hours to see only what's realistic for your schedule.`}
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
              const personalizedSet = getPersonalizedActions(roleTitle, derivedBracket, result.total, region, undefined, undefined, userProfileLike2, undefined, uf2.localCurrencyCode ?? undefined, undefined, undefined, loadCompletionsLocal(), loadEffectiveSuppressedActionIds());
              return (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Actions personalized for</span>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    {roleGroupLabel}
                  </span>
                  <span className="text-[10px] font-black bg-[var(--alpha-bg-08)] border border-[var(--alpha-bg-10)] px-2 py-0.5 rounded capitalize">
                    {derivedBracket}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded capitalize ${
                    riskLevel === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    riskLevel === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    riskLevel === 'moderate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>{riskLevel} risk</span>
                  {region === 'IN' && personalizedSet.indiaSpecificContext && (
                    <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
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
              className="w-full pl-10 py-2 px-3 bg-[var(--alpha-bg-05)] border border-[var(--alpha-bg-10)] rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="text-muted-foreground w-4 h-4" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="py-2 px-3 bg-[var(--alpha-bg-05)] border border-[var(--alpha-bg-10)] rounded-lg text-sm focus:outline-none"
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
                  background:   hideCompleted ? 'rgba(16,185,129,0.10)' : 'var(--alpha-bg-06)',
                  borderColor:  hideCompleted ? 'rgba(16,185,129,0.30)' : 'var(--alpha-bg-08)',
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
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[var(--alpha-bg-05)] border border-[var(--alpha-bg-10)] hover:bg-[var(--alpha-bg-10)] transition-colors text-muted-foreground hover:text-[var(--text)]"
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

        {/* Stage 3: replace the generic action list with the week-by-week protocol.
            The Phase 0 timeline recalibration (above) still renders — it acknowledges the
            signal. Stage3EmergencyProtocol gives the user exactly what to DO, week by week.
            Generic priority-grouped items are suppressed entirely at Stage 3: presenting
            a "Medium priority: build a portfolio project" action alongside an imminent
            collapse signal actively misleads the user about their situation. */}
        {collapseStageForOverride === 3 && (
          <div className="mb-6">
            <Stage3EmergencyProtocol
              companyName={companyData?.name ?? result.companyName ?? 'your company'}
              roleKey={result.workTypeKey ?? ''}
              score={result.total}
              financialProfile={financialProfile}
            />
          </div>
        )}

        {/* Action Items — Phase 0 emergency section first, then priority-grouped.
            Suppressed entirely when Stage 3 is active — the protocol above replaces them. */}
        <AnimatePresence>
          {collapseStageForOverride !== 3 && sortedItems.length > 0 ? (
            <div className="space-y-6">

              {/* Phase 0: emergency section — rendered before ALL other actions.
                  When this section is present and incomplete, Phase 1/2/3 are locked.
                  The lock is enforced at the checkbox level (pointer-events disabled). */}
              {phase0Items.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#dc2626', boxShadow: '0 0 8px #dc2626',
                      flexShrink: 0, animation: 'pulse-live 1.8s ease-in-out infinite',
                    }} />
                    <span className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--color-red600-text)', fontFamily: 'var(--font-mono)' }}>
                      ⚡ PHASE 0 — EMERGENCY
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      Complete before Phase 1 unlocks
                    </span>
                    <span className="text-xs text-muted-foreground font-mono ml-auto">
                      {phase0Items.filter(i => completedItems[i.id]).length}/{phase0Items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {phase0Items.map((item, i) => (
                      <ActionItem
                        key={item.id}
                        item={item}
                        isCompleted={!!completedItems[item.id]}
                        onToggle={() => toggleItemCompletion(item.id, !!completedItems[item.id])}
                        index={i}
                        isLocked={false}
                        selectedTrack={selectedTrack}
                        isTopRoiInPhase={false}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(['Critical', 'High', 'Medium', 'Low'] as const).map(priority => {
                // Exclude Phase 0 items from priority groups (they have their own section above)
                const priorityItems = sortedItems.filter(
                  item => item.priority === priority && assignPhase(item) !== 0
                );
                if (priorityItems.length === 0) return null;
                const cfg = PRIORITY_CONFIG[priority];
                const sectionCompleted = priorityItems.filter(item => completedItems[item.id]).length;
                return (
                  <div key={priority}>
                    {/* Section header — time-based phase label */}
                    <div className="audit-section-head" style={{ marginBottom: 'var(--space-3)' }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: cfg.color, boxShadow: `0 0 8px ${cfg.color}`,
                          flexShrink: 0,
                          animation: priority === 'Critical' ? 'pulse-live 1.8s ease-in-out infinite' : 'none',
                        }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.1em', color: cfg.color }}>
                          {PHASE_LABEL[priority]}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', fontWeight: 600 }}>
                          {PHASE_SUBTITLE[priority]}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, color: cfg.color, opacity: 0.5 }}>
                          · {sectionCompleted}/{priorityItems.length}
                        </span>
                      </div>
                      {sectionCompleted > 0 && (
                        <div style={{
                          height: '3px', width: `${Math.round((sectionCompleted / priorityItems.length) * 60)}px`,
                          background: 'var(--color-emerald-text)', borderRadius: '2px', boxShadow: '0 0 8px #10b98140',
                        }} />
                      )}
                    </div>

                    {/* Items in this phase group */}
                    <div className="space-y-2">
                      {priorityItems.map((item, i) => {
                        const itemPhase = assignPhase(item);
                        const itemIsLocked = itemPhase >= 1 && lockedPhases.has(itemPhase as 1 | 2 | 3);
                        return (
                          <ActionItem
                            key={item.id}
                            item={item}
                            isCompleted={!!completedItems[item.id]}
                            onToggle={() => toggleItemCompletion(item.id, !!completedItems[item.id])}
                            index={i}
                            isLocked={itemIsLocked}
                            selectedTrack={selectedTrack}
                            isTopRoiInPhase={!!(item as any)._topRoiInPhase}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : collapseStageForOverride !== 3 ? (
            <div className="text-center p-8 glass-panel rounded-xl">
              <p className="text-muted-foreground text-sm">
                {search || filter !== "all"
                  ? "No matching items — clear search or filter."
                  : "No action items available."}
              </p>
            </div>
          ) : null}
        </AnimatePresence>

        {/* Resources Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {/* Recommended Courses — role-family + at-risk-skill targeted */}
          <CourseResourceCard rolePrefix={rolePrefix} roleKey={result.workTypeKey} financialProfile={financialProfile} />

          {/* AI Adaptation Tools — role-specific, no longer a single hardcoded list */}
          <ProductivityToolsCard roleKey={result.workTypeKey} />
        </div>

        {/* Priority 8: Phased Action Dependency Map */}
        <div className="mt-8">
          <CollapsibleSection title="Phased Action Plan — Dependency Sequence">
            <ActionDependencyGraph actions={sortedItems} completedItems={completedItems} />
          </CollapsibleSection>
        </div>

        {/* Career Twin Network */}
        <div className="flex items-center gap-3 mb-3 mt-8">
          <NetworkIllustration size={48} className="flex-shrink-0 opacity-80" />
          <div>
            <p className="text-[10px] font-black tracking-[0.14em] uppercase" style={{ color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)' }}>PROFESSIONAL NETWORK</p>
            <p className="text-[13px] font-bold" style={{ color: 'var(--alpha-text-78)' }}>Career Twin Intelligence</p>
          </div>
        </div>
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
          <FinancialContextInput
            riskScore={result.total}
            currency={financialCtx?.currency ?? 'USD'}
            visaAmplifier={visaAmplifier}
            onProfileDerived={() => setFinancialCtxVersion(v => v + 1)}
          />
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
