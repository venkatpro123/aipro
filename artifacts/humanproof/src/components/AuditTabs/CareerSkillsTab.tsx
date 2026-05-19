// CareerSkillsTab.tsx
// Career trajectory and skills analysis — Answers "What should I focus on?"
// Displays: AI skill risk matrix, at-risk skills, human-durable skills, roadmap, simulator.

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AIRiskSkillMatrix from "@/components/AIRiskSkillMatrix";
import StrategicRoadmap from "@/components/StrategicRoadmap";
import { selectStrategyArchetypeFull, buildArchetypeRoadmap, applyCollapseCompression } from "@/services/strategyArchetypes";
import { CareerTwinSubmissionModal } from "@/components/CareerTwinSubmissionModal";
import { SectionHeader } from "./common/SectionHeader";
import { CollapsibleSection } from "./common/CollapsibleSection";
import { useAdaptiveSystem } from "@/hooks/useAdaptiveSystem";
import { getCareerIntelligence } from "@/data/intelligence";
import { LAYER_WEIGHTS } from "@/services/layoffScoreEngine";
import { getScoreColor } from "@/data/riskEngine";
import type { TabProps } from "./common/types";
import type { CareerIntelligence } from "@/data/intelligence/types";
import {
  overlaySkillDemand,
  getCompanySkillDemand,
  applyCompanySkillOverlay,
  stripDemandLive,
  type CompanySkillDemand,
  COMPANY_SKILL_CONTRACTING_THRESHOLD,
  COMPANY_SKILL_GROWING_THRESHOLD,
} from "@/services/skillDemandService";
import { SkillFreshnessLabel, SkillPanelStaticNotice } from "./SkillFreshnessLabel";
import { getCareerPathMarketSync, isMarketDataStale, marketDataAgeLabel, isMarketDataFreshWarning, marketDataAgeInline } from "@/services/careerPathMarket";
import { loadFinancialContext, deriveFinancialProfile } from "@/services/financialContextService";
import {
  Shield, AlertTriangle, TrendingUp, TrendingDown, Cpu,
  Brain, Heart, Lightbulb, Users, Zap, Target, ChevronRight,
  ArrowRight, BarChart3, Clock, UserCheck,
} from "lucide-react";
// v14.0 intelligence panels
import SkillPortfolioPanel from "./common/SkillPortfolioPanel";
import CareerVelocityPanel from "./common/CareerVelocityPanel";
// v16.0 intelligence panels
import RoleMarketDemandPanel from "./common/RoleMarketDemandPanel";
import UserFinancialRunwayPanel from "./common/UserFinancialRunwayPanel";
// v17.0 intelligence panels
import SkillGapIntelligencePanel from "./common/SkillGapIntelligencePanel";
import PersonalizedTimelinePanel from "./common/PersonalizedTimelinePanel";

// ---------------------------------------------------------------------------
// FALLBACK INTEL — used when role has no seeded data
// ---------------------------------------------------------------------------

const buildFallbackIntel = (roleKey: string, score: number): CareerIntelligence => {
  const isHighRisk = score >= 65;
  const isMedRisk = score >= 40 && score < 65;

  return {
    displayRole: roleKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    summary: isHighRisk
      ? `This role has significant AI displacement exposure. Many task categories are automatable with current enterprise AI platforms. Strategic upskilling is recommended within 6–12 months.`
      : isMedRisk
        ? `This role carries moderate AI exposure. Some repetitive tasks are automatable, but judgment, stakeholder management, and domain expertise create meaningful protection.`
        : `This role has strong structural resilience against AI displacement. The core value lies in human judgment, relationships, and cross-context reasoning.`,
    skills: {
      safe: [
        { skill: "Stakeholder Communication", whySafe: "Trust-based human relationships AI cannot replicate", longTermValue: 92, difficulty: "Medium" },
        { skill: "Strategic Decision Making", whySafe: "Requires contextual judgment + accountability", longTermValue: 90, difficulty: "High" },
        { skill: "Cross-functional Collaboration", whySafe: "Nuanced organizational dynamics are human-native", longTermValue: 88, difficulty: "Medium" },
        { skill: "Creative Problem Solving", whySafe: "Novel situation handling with incomplete information", longTermValue: 85, difficulty: "High" },
        { skill: "Emotional Intelligence", whySafe: "Empathy, rapport, and interpersonal trust are irreplaceable", longTermValue: 95, difficulty: "High" },
      ],
      at_risk: isHighRisk ? [
        { skill: "Routine Data Processing", riskScore: 88, riskType: "Automatable", horizon: "1-3yr", reason: "RPA and ML models process structured data 10-100x faster", aiReplacement: "Full", aiTool: "UiPath / Copilot" },
        { skill: "Template Report Generation", riskScore: 82, riskType: "Automatable", horizon: "1-3yr", reason: "AI generates reports from structured inputs with no human needed", aiReplacement: "Full", aiTool: "Claude / GPT-4o" },
        { skill: "Standard Research Compilation", riskScore: 75, riskType: "Augmented", horizon: "1-3yr", reason: "AI can do 80% of synthesis; human adds editorial judgment", aiReplacement: "Partial", aiTool: "Perplexity / NotebookLM" },
      ] : isMedRisk ? [
        { skill: "Routine Scheduling & Coordination", riskScore: 65, riskType: "Augmented", horizon: "3-5yr", reason: "AI agents handle calendaring and logistics", aiReplacement: "Partial", aiTool: "Reclaim AI / Copilot" },
        { skill: "Basic Email Drafting", riskScore: 60, riskType: "Augmented", horizon: "1-3yr", reason: "AI drafts most emails; human approves and personalizes", aiReplacement: "Partial", aiTool: "Claude / Gmail AI" },
      ] : [],
    },
    careerPaths: [
      { role: "AI Collaboration Specialist", riskReduction: 35, skillGap: "Prompt engineering, AI workflow design", transitionDifficulty: "Medium", industryMapping: ["Technology", "Consulting"], salaryDelta: "+15–25%", timeToTransition: "6-12 months" },
      { role: "Strategic Advisor", riskReduction: 45, skillGap: "Executive presence, board-level communication", transitionDifficulty: "Hard", industryMapping: ["Consulting", "Finance", "Any"], salaryDelta: "+25–40%", timeToTransition: "12-24 months" },
    ],
    riskTrend: [
      { year: 2025, riskScore: score, label: "Current" },
      { year: 2027, riskScore: Math.min(95, score + (isHighRisk ? 12 : 6)), label: "+2yr" },
      { year: 2030, riskScore: Math.min(97, score + (isHighRisk ? 22 : 10)), label: "+5yr" },
    ],
    contextTags: isHighRisk ? ["high-risk", "urgent-upskill"] : isMedRisk ? ["moderate-risk", "augment-first"] : ["resilient", "low-risk"],
    inactionScenario: isHighRisk
      ? `Without action, AI systems will automate 60–75% of your current task portfolio within 24 months. Roles will restructure; survivors will manage AI outputs, not produce them.`
      : `The risk is manageable but cumulative. Without strategic upskilling, gradual task erosion will reduce leverage and salary growth trajectory over 3–5 years.`,
  };
};

// ---------------------------------------------------------------------------
// CompanySkillDemandBanner — shown when company-specific data supersedes
// industry averages. Tells the user exactly what the data is and what
// confidence level it carries.
// ---------------------------------------------------------------------------

interface CompanySkillDemandBannerProps {
  companyDemand: CompanySkillDemand;
  companyDisplayName: string;
}

const CompanySkillDemandBanner: React.FC<CompanySkillDemandBannerProps> = ({
  companyDemand,
  companyDisplayName,
}) => {
  const delta = companyDemand.delta90dPct;
  const contracting = delta !== null && delta < COMPANY_SKILL_CONTRACTING_THRESHOLD;
  const growing     = delta !== null && delta > COMPANY_SKILL_GROWING_THRESHOLD;

  const signalColor = contracting ? 'var(--orange, #f97316)'
    : growing ? '#10b981'
    : 'rgba(0,212,224,0.80)';

  const signalText = contracting
    ? `Role demand at ${companyDisplayName} has contracted ${Math.abs(delta!).toFixed(0)}% vs prior period — skill risk elevated`
    : growing
    ? `Role demand at ${companyDisplayName} is up ${delta!.toFixed(0)}% vs prior period — demand rising signals active`
    : delta === null
    ? `First scrape for ${companyDisplayName} — trend comparison available after next weekly refresh`
    : `Role demand at ${companyDisplayName} is stable (${delta > 0 ? '+' : ''}${delta.toFixed(0)}% vs prior period)`;

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-4"
      style={{ background: `${signalColor}10`, border: `1px solid ${signalColor}30` }}
    >
      <span className="text-[11px] flex-shrink-0" style={{ color: signalColor }}>🏢</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold leading-tight mb-0.5" style={{ color: signalColor }}>
          Skill demand specific to {companyDisplayName}
          <span className="ml-1.5 font-normal" style={{ color: 'rgba(255,255,255,0.40)' }}>
            · updated {companyDemand.ageInDays === 0 ? 'today' : `${companyDemand.ageInDays}d ago`}
          </span>
        </p>
        <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {signalText}. Industry averages hidden — they represent a different confidence level.
        </p>
      </div>
      {companyDemand.currentOpenings != null && (
        <div className="flex-shrink-0 text-right">
          <p className="text-[13px] font-black" style={{ color: signalColor }}>
            {companyDemand.currentOpenings.toLocaleString()}
          </p>
          <p className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.30)' }}>
            openings
          </p>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// CompanySkillBadge — inline badge on individual skill cards when company
// data is present. Never shown alongside SkillFreshnessLabel (they are
// mutually exclusive — different confidence levels).
// ---------------------------------------------------------------------------

interface CompanySkillBadgeProps {
  companyDemand: import('@/data/intelligence/types').CompanySkillDemandLive;
}

const CompanySkillBadge: React.FC<CompanySkillBadgeProps> = ({ companyDemand }) => {
  const delta = companyDemand.delta90dPct;
  if (delta === null) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(0,212,224,0.10)', color: 'rgba(0,212,224,0.70)', border: '1px solid rgba(0,212,224,0.25)' }}
        title={`${companyDemand.companyName} hiring data available — trend comparison pending next refresh`}
      >
        🏢 {companyDemand.companyName} · no trend yet
      </span>
    );
  }

  const contracting = delta < COMPANY_SKILL_CONTRACTING_THRESHOLD;
  const growing     = delta > COMPANY_SKILL_GROWING_THRESHOLD;

  if (contracting) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.30)' }}
        title={`${companyDemand.companyName}: demand contracted ${Math.abs(delta).toFixed(0)}% vs prior period. Data: ${companyDemand.ageInDays}d ago.`}
      >
        🏢 ↓{Math.abs(delta).toFixed(0)}% at {companyDemand.companyName}
      </span>
    );
  }

  if (growing) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.28)' }}
        title={`${companyDemand.companyName}: demand up ${delta.toFixed(0)}% vs prior period. Data: ${companyDemand.ageInDays}d ago.`}
      >
        🏢 ↑{delta.toFixed(0)}% at {companyDemand.companyName} · demand rising
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded"
      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.12)' }}
      title={`${companyDemand.companyName}: demand stable (${delta > 0 ? '+' : ''}${delta.toFixed(0)}%). Data: ${companyDemand.ageInDays}d ago.`}
    >
      🏢 {delta > 0 ? '+' : ''}{delta.toFixed(0)}% at {companyDemand.companyName}
    </span>
  );
};

// ---------------------------------------------------------------------------
// SkillRiskGauge - Circular gauge showing resilience
// ---------------------------------------------------------------------------

interface SkillRiskGaugeProps {
  score: number;
  safeCriticalSkills: number;
  atRiskSkills: number;
  obsoleteSkills: number;
}

const SkillRiskGauge: React.FC<SkillRiskGaugeProps> = ({
  score,
  safeCriticalSkills,
  atRiskSkills,
  obsoleteSkills,
}) => {
  const resilience = Math.max(100 - score, 20);
  const scoreColor = getScoreColor(score);

  return (
    <div className="skill-risk-gauge glass-panel-heavy p-[var(--space-6)] flex flex-col items-center">
      <div className="relative w-full aspect-square" style={{ maxWidth: "180px" }}>
        <svg viewBox="0 0 100 100" className="drop-shadow-2xl">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="44" fill="none" stroke={scoreColor}
            strokeWidth="8" strokeLinecap="round" strokeDasharray="276.5"
            initial={{ strokeDashoffset: 276.5 }}
            animate={{ strokeDashoffset: 276.5 * (1 - resilience / 100) }}
            transition={{ duration: 2, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center", filter: `drop-shadow(0 0 12px ${scoreColor}44)` }}
          />
          <circle cx="50" cy="50" r="40" fill={scoreColor} fillOpacity="0.03" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-black tracking-tighter"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ color: scoreColor }}
          >
            {resilience.toFixed(0)}%
          </motion.span>
          <span className="label-xs text-muted-foreground opacity-50 font-black" style={{ fontSize: '8px' }}>
            RESILIENCE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full mt-6 pt-4 border-t border-white/5">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-black tracking-tight text-[var(--emerald)]">{safeCriticalSkills}</span>
          <span className="label-xs text-muted-foreground opacity-60">IMMUNE</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-black tracking-tight text-[var(--amber)]">{atRiskSkills}</span>
          <span className="label-xs text-muted-foreground opacity-60">EXPOSED</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-black tracking-tight text-[var(--red)]">{obsoleteSkills}</span>
          <span className="label-xs text-muted-foreground opacity-60">CRITICAL</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AtRiskSkillsPanel — detailed at-risk skills with AI replacement context
// ---------------------------------------------------------------------------

const AtRiskSkillsPanel: React.FC<{
  intel: CareerIntelligence;
  hasCompanyOverlay: boolean;
}> = ({ intel, hasCompanyOverlay }) => {
  const atRisk = intel.skills.at_risk ?? [];
  const obsolete = intel.skills.obsolete ?? [];
  const combined = [...obsolete, ...atRisk].slice(0, 8);
  // hasCompanyOverlay=true means company badges show; industry demandLive is stripped.
  // hasCompanyOverlay=false means fall back to SkillFreshnessLabel (industry baseline).
  const hasAnyLive = !hasCompanyOverlay && combined.some(s => s.demandLive != null);

  if (combined.length === 0) {
    return (
      <div className="glass-panel p-5 text-center text-sm text-muted-foreground">
        <Shield className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-50" />
        No high-risk skills flagged for this role profile.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Panel-level static notice — shown when no skills have live demand data */}
      {!hasAnyLive && <SkillPanelStaticNotice />}
      {combined.map((s, i) => {
        const risk = s.riskScore ?? 70;
        const color = risk >= 80 ? "var(--red)" : risk >= 60 ? "var(--orange)" : "var(--amber)";
        const isObsolete = obsolete.includes(s as any);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel p-4 rounded-xl"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-bold">{s.skill}</span>
                  {isObsolete && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                      style={{ background: `${color}22`, color }}>
                      OBSOLETING
                    </span>
                  )}
                  {s.aiTool && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/10">
                      <Cpu className="w-2.5 h-2.5 inline mr-0.5" />{s.aiTool}
                    </span>
                  )}
                  {/* Company badge supersedes industry freshness label — they are mutually exclusive */}
                  {s.companyDemand
                    ? <CompanySkillBadge companyDemand={s.companyDemand} />
                    : <SkillFreshnessLabel demandLive={s.demandLive} showCount={false} />
                  }
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.reason}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted-foreground flex-wrap">
                  <span><Clock className="w-2.5 h-2.5 inline mr-1" />{s.horizon ?? "1-3yr"}</span>
                  <span>Replacement: <span style={{ color }} className="font-bold">{s.aiReplacement ?? "Partial"}</span></span>
                  {/* Demand count inline when live data available */}
                  {s.demandLive?.liveJobCount != null && (
                    <span className="text-emerald-400/70">
                      {s.demandLive.liveJobCount.toLocaleString()} India roles
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-xl font-black" style={{ color }}>{risk}</div>
                <div className="text-[9px] text-muted-foreground font-mono">RISK</div>
                <div className="mt-1 w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div style={{ width: `${risk}%`, background: color }} className="h-full rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// HumanDurableSkillsPanel — skills that resist AI displacement
// ---------------------------------------------------------------------------

const SKILL_ICONS: Record<string, React.ReactNode> = {
  empathy: <Heart className="w-3.5 h-3.5 text-pink-400" />,
  leadership: <Users className="w-3.5 h-3.5 text-violet-400" />,
  strategy: <Target className="w-3.5 h-3.5 text-cyan-400" />,
  creative: <Lightbulb className="w-3.5 h-3.5 text-amber-400" />,
  judgment: <Brain className="w-3.5 h-3.5 text-emerald-400" />,
};

const getSkillIcon = (skill: string): React.ReactNode => {
  const lower = skill.toLowerCase();
  for (const [key, icon] of Object.entries(SKILL_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
};

const getDifficultyColor = (diff: string) => {
  if (diff === "Low") return "text-emerald-400";
  if (diff === "Medium") return "text-amber-400";
  if (diff === "High") return "text-orange-400";
  return "text-red-400";
};

const HumanDurableSkillsPanel: React.FC<{
  intel: CareerIntelligence;
  hasCompanyOverlay: boolean;
}> = ({ intel, hasCompanyOverlay }) => {
  const safe = intel.skills.safe.slice(0, 8);
  const hasAnyLive = !hasCompanyOverlay && safe.some(s => s.demandLive != null);

  return (
    <div className="grid grid-cols-1 gap-3">
      {/* Only show the static notice when there's no company overlay and no industry live data */}
      {!hasCompanyOverlay && !hasAnyLive && <SkillPanelStaticNotice />}
      {safe.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="glass-panel p-4 rounded-xl hover:border-[var(--border-cyan)] transition-colors"
          style={{ borderLeft: "3px solid var(--emerald)" }}
        >
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 flex-shrink-0 mt-0.5">
              {getSkillIcon(s.skill)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-bold">{s.skill}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  HUMAN-DURABLE
                </span>
                {s.companyDemand
                  ? <CompanySkillBadge companyDemand={s.companyDemand} />
                  : <SkillFreshnessLabel demandLive={s.demandLive} showCount={false} />
                }
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.whySafe}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px]">
                <span className="text-muted-foreground">Long-term value:</span>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${s.longTermValue}%`, background: 'var(--emerald)' }}
                      className="h-full rounded-full"
                    />
                  </div>
                  <span className="font-bold text-emerald-400 font-mono">{s.longTermValue}%</span>
                </div>
                {s.difficulty && (
                  <span className={`font-mono font-bold text-[10px] ${getDifficultyColor(s.difficulty)}`}>
                    {s.difficulty} to master
                  </span>
                )}
              </div>
              {s.resource && (
                <div className="mt-1.5 text-[10px] text-cyan-400 font-mono">
                  <ArrowRight className="w-2.5 h-2.5 inline mr-1" />
                  {s.resource}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// WhatIfSkillSimulator - Enhanced with realistic delta display
// ---------------------------------------------------------------------------

interface SkillAdjustment {
  skill: string;
  proficiency: number;
  impact: number;
  isSafe: boolean;
  baselineProf: number;
}

const WhatIfSkillSimulator: React.FC<{
  intel: CareerIntelligence;
  baseScore: number;
  /** Full breakdown (0–1 per layer) from HybridResult — used to recompose score
   *  using actual engine layer weights instead of static developer estimates. */
  breakdown?: Record<string, number>;
  onScoreChange: (newScore: number) => void;
}> = ({ intel, baseScore, breakdown, onScoreChange }) => {
  const initialSkills = useMemo<SkillAdjustment[]>(() => {
    const safeSkills = (intel.skills.safe ?? []).slice(0, 3).map(s => ({
      skill: s.skill,
      proficiency: 40,
      baselineProf: 40,
      impact: -(s.longTermValue / 200),
      isSafe: true,
    }));
    const atRiskSkills = (intel.skills.at_risk ?? []).slice(0, 3).map(s => ({
      skill: s.skill,
      proficiency: 70,
      baselineProf: 70,
      impact: (s.riskScore ?? 60) / 600,
      isSafe: false,
    }));
    return [...safeSkills, ...atRiskSkills];
  }, [intel]);

  const [skills, setSkills] = useState<SkillAdjustment[]>(initialSkills);

  /**
   * Priority 2 FIX: Engine-grounded score recomposition.
   * When `breakdown` (0–1 layer values) is available, we:
   * 1. Compute the L3 delta from slider proficiency changes (safe skills reduce L3,
   *    reducing at-risk skill dependence also reduces L3)
   * 2. Apply the adjusted L3 back into the composite using real LAYER_WEIGHTS
   *    instead of the previously-hardcoded baseScore ± static delta.
   * This means a user building Python (LTV=80) actually sees the L3-driven impact
   * at its true 20% engine weight — not a developer-guessed flat number.
   */
  const calculateEngineSimulatedScore = useCallback((s: SkillAdjustment[]): number => {
    if (!breakdown) {
      // Fallback: original static-delta path (no breakdown available)
      let delta = 0;
      for (const skill of s) {
        const profDiff = skill.proficiency - skill.baselineProf;
        delta += skill.isSafe ? skill.impact * profDiff : skill.impact * (-profDiff);
      }
      return Math.max(3, Math.min(98, Math.round(baseScore + delta * 100)));
    }

    // Compute cumulative L3 adjustment from all skill sliders
    let l3Delta = 0;
    for (const skill of s) {
      const profDiff = skill.proficiency - skill.baselineProf; // positive = more proficiency
      if (skill.isSafe) {
        // More safe skill proficiency → reduces L3 (human factor strengthens)
        l3Delta -= skill.impact * profDiff * 0.01;
      } else {
        // Reducing at-risk skill dependence → reduces L3 exposure
        l3Delta += skill.impact * (-profDiff) * 0.01;
      }
    }

    const bd = breakdown;
    const adjustedL3 = Math.max(0, Math.min(1, (bd.L3 ?? 0.5) - l3Delta));

    // Recompose using LAYER_WEIGHTS (sum = 1.10, WhatIf-only sensitivity weights).
    //
    // LAYER_WEIGHTS ≠ COMPOSITE_FORMULA_WEIGHTS. Do not substitute one for the other.
    //   COMPOSITE_FORMULA_WEIGHTS (9 terms, sum = 1.00) — lives in layoffScoreEngine.ts,
    //     used only inside calculateLayoffScore(), requires NO normalization.
    //   LAYER_WEIGHTS (7 entries, sum = 1.10) — used HERE only, ALWAYS requires:
    //     recomposed = rawComposed / weightSum * 100
    //
    // Omitting the division inflates every simulated score by ≈10 pts.
    // A module-load assertion in layoffScoreEngine.ts enforces both sums.
    const weightSum = (Object.values(LAYER_WEIGHTS) as number[]).reduce((s, w) => s + w, 0);
    // weightSum is always 1.10 (enforced by layoffScoreEngine.ts assertion at startup).
    const rawComposed = (
      (bd.L1 ?? 0.5) * LAYER_WEIGHTS.L1 +
      (bd.L2 ?? 0.5) * LAYER_WEIGHTS.L2 +
      adjustedL3      * LAYER_WEIGHTS.L3 +
      (bd.L4 ?? 0.5) * LAYER_WEIGHTS.L4 +
      (bd.L5 ?? 0.5) * LAYER_WEIGHTS.L5 +
      (bd.D6 ?? 0.5) * LAYER_WEIGHTS.D6 +
      (bd.D7 ?? 0.5) * LAYER_WEIGHTS.D7
    );
    const recomposed = (rawComposed / weightSum) * 100; // divide by 1.10 — mandatory

    return Math.max(3, Math.min(98, Math.round(recomposed)));
  }, [baseScore, breakdown]);

  const handleSkillChange = (index: number, value: number) => {
    const updated = [...skills];
    updated[index].proficiency = value;
    setSkills(updated);
    onScoreChange(calculateEngineSimulatedScore(updated));
  };

  const simulatedScore = calculateEngineSimulatedScore(skills);
  const delta = simulatedScore - baseScore;
  const deltaColor = delta < 0 ? "var(--emerald)" : delta > 0 ? "var(--red)" : "var(--text-3)";

  if (skills.length === 0) {
    return (
      <div className="glass-panel p-6 text-center text-sm text-muted-foreground">
        No skill simulation data available for this role.
      </div>
    );
  }

  return (
    <div className="what-if-simulator glass-panel p-[var(--space-6)] shadow-inner">
      {/* Delta display */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Simulated Risk Change
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter" style={{ color: deltaColor }}>
            {delta > 0 ? "+" : ""}{delta} pts
          </span>
          {delta < 0 && <TrendingDown className="w-4 h-4 text-emerald-400" />}
          {delta > 0 && <TrendingUp className="w-4 h-4 text-red-400" />}
        </div>
      </div>

      <div className="space-y-5">
        {skills.map((skill, index) => {
          const sliderColor = skill.isSafe ? "var(--emerald)" : "var(--red)";
          const label = skill.isSafe
            ? `${skill.proficiency}% — Build this ↑`
            : `${skill.proficiency}% — Reduce reliance ↓`;
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  {skill.isSafe
                    ? <Shield className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    : <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                  <span className="text-xs font-bold opacity-80">{skill.skill}</span>
                </div>
                <span
                  className="font-mono text-[10px] font-black px-2 py-0.5 rounded"
                  style={{ background: `${sliderColor}15`, color: sliderColor }}
                >
                  {label}
                </span>
              </div>
              <div className="relative p-1 bg-white/5 rounded-full">
                <input
                  type="range" min="0" max="100" value={skill.proficiency}
                  onChange={(e) => handleSkillChange(index, parseInt(e.target.value))}
                  className="premium-range w-full"
                  style={{ accentColor: sliderColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground opacity-40">
          Live Resilience Simulator
        </span>
        <button
          onClick={() => {
            setSkills(initialSkills);
            onScoreChange(baseScore);
          }}
          className="text-[10px] text-muted-foreground hover:text-[var(--cyan)] transition-colors font-mono"
        >
          RESET
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CareerSkillsTab main component
// ---------------------------------------------------------------------------

export const CareerSkillsTab: React.FC<TabProps> = ({
  result,
  companyData,
}) => {
  const { width } = useAdaptiveSystem();
  const isMobile = width < 768;
  const scoreColor = getScoreColor(result.total);

  const rawIntel = useMemo(() => getCareerIntelligence(result.workTypeKey), [result.workTypeKey]);
  const baseIntel = useMemo(
    () => rawIntel ?? buildFallbackIntel(result.workTypeKey, result.total),
    [rawIntel, result.workTypeKey, result.total],
  );

  // Two-phase skill demand overlay:
  //
  //   Phase 1 (company-specific, 7-day freshness gate):
  //     Query company_skill_demand_cache for this company × workTypeKey.
  //     When found: apply company overlay, STRIP industry demandLive, show banner.
  //     When not found: fall through to phase 2.
  //
  //   Phase 2 (industry/role-level baseline):
  //     Query market_intelligence_cache for this workTypeKey (role-level averages).
  //     Shown only when phase 1 produced no result.
  //
  // CRITICAL RULE: never show industry averages and a live company badge
  // simultaneously. They are different confidence levels. Phase 1 completely
  // supersedes phase 2 when company data is present.
  const companyName: string = (companyData as any)?.name ?? '';
  const [intel, setIntel] = useState<CareerIntelligence>(baseIntel);
  const [companyDemand, setCompanyDemand] = useState<CompanySkillDemand | null>(null);

  useEffect(() => {
    setIntel(baseIntel);
    setCompanyDemand(null);

    Promise.all([
      overlaySkillDemand(baseIntel, result.workTypeKey),
      companyName ? getCompanySkillDemand(companyName, result.workTypeKey) : Promise.resolve(null),
    ]).then(([industryEnriched, companyData]) => {
      if (companyData) {
        // Company-specific data is available and fresh (≤7 days).
        // Strip the industry-level demandLive from all skills first — the two
        // confidence levels must never appear in the same panel simultaneously.
        const stripped = stripDemandLive(industryEnriched);
        setIntel(applyCompanySkillOverlay(stripped, companyData, result.workTypeKey));
        setCompanyDemand(companyData);
      } else {
        // No company data: show industry-level overlay as-is.
        setIntel(industryEnriched);
      }
    }).catch(() => { setIntel(baseIntel); });
  }, [baseIntel, result.workTypeKey, companyName]);

  // v6.0: Derive uniqueness depth at component level for career path filtering
  const uniquenessDepth = (result as any).uniquenessDepth ?? (result as any).userFactors?.uniquenessDepth ?? 'generic';

  // Financial profile for income-continuity filtering of career paths.
  // Uses deriveFinancialProfile (same function as ActionPlanTab) so thresholds
  // and RunwayTier are consistent across the whole tab set.
  // Must be derived at component level so the career path section can access it.
  const financialProfile = useMemo(() => {
    const ctx = loadFinancialContext();
    if (!ctx) return null;
    return deriveFinancialProfile(ctx, result.total);
  }, [result.total]);

  const fpIsConservative = financialProfile?.riskAppetite === 'conservative';
  const fpRunwayMonths   = financialProfile?.runwayMonths ?? null;

  const safeCount = intel.skills.safe?.length ?? 0;
  const atRiskCount = intel.skills.at_risk?.length ?? 0;
  const obsoleteCount = intel.skills.obsolete?.length ?? 0;

  const [simulatedScore, setSimulatedScore] = useState<number>(result.total);
  const simulatedDelta = simulatedScore - result.total;

  // Strategy view toggle — defaults to 'primary' when a hybrid roadmap is available.
  // The toggle is rendered inside the Strategic Roadmap section ONLY when both
  // archetypes qualify. When a user qualifies for only one, this state has no effect.
  const [strategyView, setStrategyView] = useState<'primary' | 'hybrid'>('primary');

  // v4.0 Intelligence Upgrade 3: Check if experience + capital data triggers an archetype
  // Capital data is optional — only available if user has completed CareerCapitalAssessment
  const capitalTotal = (() => {
    try {
      const stored = localStorage.getItem('hp_career_capital');
      if (!stored) return 0;
      const data = JSON.parse(stored);
      return (data.productsShippedEndToEnd ?? 0) * 2 + (data.teamSizePeak ?? 0) + (data.networkStrengthScore ?? 0) * 2;
    } catch { return 0; }
  })();
  const capitalPillars = (() => {
    try {
      const stored = localStorage.getItem('hp_career_capital');
      if (!stored) return { networkCapital: 0, knowledgeCapital: 0, deliveryCapital: 0, influenceCapital: 0 };
      const d = JSON.parse(stored);
      return {
        networkCapital: Math.min(25, Math.round((d.clientAccountsOwned ?? 0) * 3 + Math.min(10, (d.clientAccountValueLakh ?? 0) * 0.05) + (d.networkStrengthScore ?? 5) * 1.5)),
        knowledgeCapital: Math.min(25, Math.round((d.patentsOrPublications ?? 0) * 5 + (d.certifications ?? 0) * 2 + (d.domainDepthScore ?? 5) * 2)),
        deliveryCapital: Math.min(25, Math.round((d.productsShippedEndToEnd ?? 0) * 8 + Math.min(12, (d.teamSizePeak ?? 0) * 0.8))),
        influenceCapital: Math.min(25, Math.round((d.speakingEngagements ?? 0) * 4 + Math.min(10, (d.certifications ?? 0) * 1.5))),
      };
    } catch { return { networkCapital: 0, knowledgeCapital: 0, deliveryCapital: 0, influenceCapital: 0 }; }
  })();
  const expYears = (result as any).experienceYears ?? parseInt(result.experience?.split('-')[0] ?? '5', 10) ?? 5;
  // D3 augmentation risk: lower value = higher augmentation potential
  const augmentationRisk = result.breakdown?.L3 ?? 0.5;
  const archetypeSelection = useMemo(
    () => selectStrategyArchetypeFull(expYears, capitalPillars, capitalTotal, augmentationRisk),
    [expYears, capitalPillars, capitalTotal, augmentationRisk],
  );
  const archetype = archetypeSelection.primary;
  const archetypeRoadmap = useMemo(() => {
    if (!archetype) return null;
    const base = buildArchetypeRoadmap(archetype, intel.displayRole, capitalPillars, expYears);
    const stage = result.collapseStage ?? null;
    if (stage && stage >= 1) return applyCollapseCompression(base, stage as 1 | 2 | 3);
    return base;
  }, [archetype, intel.displayRole, capitalPillars, expYears, result.collapseStage]);

  const [showTwinModal, setShowTwinModal] = useState(false);
  const [twinSubmitted, setTwinSubmitted] = useState(() => {
    try { return localStorage.getItem('hp_twin_submitted') === '1'; } catch { return false; }
  });

  return (
    <section aria-labelledby="career-skills-heading" className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ── AI Risk to Skill Analysis ── */}
        <div className="mb-6">
          <SectionHeader
            title="AI Risk to Skill Analysis"
            description="Granular analysis of every skill in your profile — which are automatable, augmented, or structurally irreplaceable."
          />
          <AIRiskSkillMatrix intel={intel} scoreColor={scoreColor} roleKey={result.workTypeKey} />
        </div>

        {/* ── Company skill demand banner — shown only when company data supersedes industry baseline ── */}
        {companyDemand && (
          <CompanySkillDemandBanner
            companyDemand={companyDemand}
            companyDisplayName={companyName || companyDemand.companyName}
          />
        )}

        {/* ── At-Risk Skills + Human-Durable Skills ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <SectionHeader
              title="At-Risk Skills"
              description="Skills facing AI displacement within 1–5 years. Reducing dependence on these or transitioning to their AI-management layer lowers your risk."
            />
            <AtRiskSkillsPanel intel={intel} hasCompanyOverlay={companyDemand !== null} />
          </div>
          <div>
            <SectionHeader
              title="Human-Durable Skills"
              description="Skills that AI cannot replicate due to trust, empathy, contextual judgment, or physical presence. Prioritize building depth in these."
            />
            <HumanDurableSkillsPanel intel={intel} hasCompanyOverlay={companyDemand !== null} />
          </div>
        </div>

        {/* ── Resilience Gauge + What-If Simulator ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <SectionHeader
              title="Skill Resilience Score"
              description="Overall measure of how future-proof your current skill portfolio is against AI disruption trajectories."
            />
            <div className="glass-panel p-5 rounded-xl">
              <SkillRiskGauge
                score={result.total}
                safeCriticalSkills={safeCount}
                atRiskSkills={atRiskCount}
                obsoleteSkills={obsoleteCount}
              />
              <div className="mt-4 text-center space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Current Resilience: </span>
                  <span style={{ color: scoreColor, fontWeight: "bold" }}>
                    {(100 - result.total).toFixed(0)}%
                  </span>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {result.total < 40
                    ? "Strong skill moat. Focus on deepening uniquely human capabilities."
                    : result.total < 65
                      ? "Moderate exposure. Shift effort toward AI-adjacent and human-only skills."
                      : "High vulnerability. Immediate portfolio restructuring recommended."}
                </p>
              </div>
            </div>
          </div>

          <div>
            <SectionHeader
              title="What-If Skill Simulator"
              description="Adjust proficiency sliders to model how upskilling safe skills or reducing reliance on at-risk skills changes your overall risk score."
            />
            <WhatIfSkillSimulator
              intel={intel}
              baseScore={result.total}
              breakdown={result.breakdown as unknown as Record<string, number>}
              onScoreChange={setSimulatedScore}
            />
            <div className="mt-3 rounded-xl border border-white/10 p-4 glass-panel">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-muted-foreground">Simulated Resilience:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" style={{ color: getScoreColor(simulatedScore) }}>
                    {(100 - simulatedScore).toFixed(0)}%
                  </span>
                  {simulatedDelta !== 0 && (
                    <span
                      className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: simulatedDelta < 0 ? "var(--emerald)" : "var(--red)",
                        background: simulatedDelta < 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      }}
                    >
                      {simulatedDelta < 0 ? "▼" : "▲"} {Math.abs(simulatedDelta)} pts risk
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <AnimatePresence>
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${100 - simulatedScore}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    style={{ backgroundColor: getScoreColor(simulatedScore) }}
                  />
                </AnimatePresence>
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>HIGH RISK</span>
                <span>LOW RISK</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Career Paths — uniqueness-filtered + income-continuity-filtered ── */}
        {(() => {
          if (!intel.careerPaths || intel.careerPaths.length === 0) return null;
          const ud = uniquenessDepth as 'generic' | 'functional_specialist' | 'critical_knowledge';

          // Step 1: filter by uniqueness depth (existing logic preserved)
          const filteredByUniqueness = intel.careerPaths.filter(p => {
            const f = p.uniquenessDepthFilter ?? 'all';
            if (f === 'all') return true;
            if (ud === 'critical_knowledge') return f === 'critical_only' || f === 'specialist_and_critical';
            if (ud === 'functional_specialist') return f === 'generic_and_specialist' || f === 'specialist_and_critical';
            return f === 'generic_and_specialist';
          });

          // Step 2: income-continuity filter for conservative profiles.
          //
          // A path is COMPATIBLE when:
          //   - not a conservative profile, OR
          //   - runway is unknown (cannot filter without it), OR
          //   - months_to_first_income ≤ runwayMonths / 2
          //
          // A path is INCOMPATIBLE (goes to hidden section) when ALL of:
          //   - conservative profile is active (riskAppetite === 'conservative')
          //   - runwayMonths is known
          //   - months_to_first_income exceeds runwayMonths / 2 OR is missing entirely
          //
          // Paths with missing months_to_first_income are treated as incompatible
          // for conservative profiles: "never show a conservative profile user a path
          // that would exhaust their emergency fund before first paycheck without
          // explicit disclosure." An unknown gap cannot be verified as safe.

          const visiblePaths = filteredByUniqueness.filter(p => {
            if (!fpIsConservative || fpRunwayMonths == null) return true;
            if (p.months_to_first_income == null) return false;  // unknown gap → hidden section
            return p.months_to_first_income <= fpRunwayMonths / 2;
          });
          const hiddenPaths = filteredByUniqueness.filter(p => !visiblePaths.includes(p));

          // Spec disclosure note: "[N] additional paths available — these require a
          // [X]-month income gap not compatible with your current financial runway."
          // [X] = minimum months_to_first_income across hidden paths (or "unknown")
          const knownGaps = hiddenPaths
            .map(p => p.months_to_first_income)
            .filter((m): m is number => m != null);
          const minGapMonths = knownGaps.length > 0 ? Math.min(...knownGaps) : null;
          const hasUnknownGaps = hiddenPaths.some(p => p.months_to_first_income == null);
          const gapLabel = hasUnknownGaps && minGapMonths == null
            ? 'unknown income gap'
            : minGapMonths != null
            ? `${minGapMonths}-month income gap`
            : 'income gap';

          // Helper: render a single career path card (used for both visible and hidden sections)
          const renderPathCard = (path: typeof filteredByUniqueness[0], idx: number, dimmed = false) => {
            const pathRoleKey = path.role
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '');
            const market = getCareerPathMarketSync(pathRoleKey);
            const marketStale      = market ? isMarketDataStale(market)       : false;
            const marketFreshWarn  = market ? isMarketDataFreshWarning(market) : false;
            const marketAge        = market ? marketDataAgeLabel(market)       : null;
            const marketAgeInline_ = market ? marketDataAgeInline(market)      : null;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="glass-panel p-4 rounded-xl hover:border-[var(--border-cyan)] transition-colors"
                style={dimmed ? { opacity: 0.7 } : undefined}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 flex-shrink-0">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold">{path.role}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        -{path.riskReduction}% RISK
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground">{path.salaryDelta}</span>
                      {market && (
                        <span
                          className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                            marketStale     ? 'text-amber-400/70 bg-amber-500/10' :
                            marketFreshWarn ? 'text-amber-300/60 bg-amber-500/8'  :
                                              'text-cyan-400/80 bg-cyan-500/10'
                          }`}
                          title={marketAge ?? undefined}
                        >
                          {market.indiaOpenings != null ? `${market.indiaOpenings.toLocaleString()} India openings` : ''}
                          {marketAgeInline_ ? ` · ${marketAgeInline_}` : ''}
                        </span>
                      )}
                      {/* Income gap badge — shown on all path cards when conservative */}
                      {fpIsConservative && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/12 text-amber-400 border border-amber-500/25">
                          {path.months_to_first_income != null
                            ? `${path.months_to_first_income}mo to first pay`
                            : 'income gap unknown'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Gap: {path.skillGap}</p>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
                      <span><Clock className="w-2.5 h-2.5 inline mr-1" />{path.timeToTransition}</span>
                      <span>Difficulty: <span className="text-amber-400">{path.transitionDifficulty}</span></span>
                      {path.months_to_first_income != null && !fpIsConservative && (
                        <span className="text-emerald-400">First pay: ~{path.months_to_first_income}mo</span>
                      )}
                      {market?.hiringBar && (
                        <span className="text-muted-foreground">Bar: {market.hiringBar}</span>
                      )}
                    </div>
                    {market?.successRate12mPct != null && (
                      <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                        <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${market.successRate12mPct}%` }} />
                        </div>
                        <span className="text-emerald-400/70">{market.successRate12mPct}% 12-mo success rate</span>
                      </div>
                    )}
                    {/* Income dip disclosure — shown when conservative + income data is present */}
                    {fpIsConservative && path.income_dip_months != null && path.income_dip_months > 0 && (
                      <p className="text-[9px] text-amber-400/70 mt-1">
                        Income reduced for ~{path.income_dip_months} months during transition
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </motion.div>
            );
          };

          return (
            <div className="mb-6">
              <SectionHeader
                title="Recommended Pivot Paths"
                description="Adjacent roles you can transition into that offer lower AI risk and comparable or higher earning potential."
              />

              {visiblePaths.length === 0 && hiddenPaths.length === 0 && (
                <p className="text-xs text-muted-foreground p-4 rounded-xl border border-white/10">
                  No transition paths available for this role profile.
                </p>
              )}

              {visiblePaths.length === 0 && hiddenPaths.length > 0 && (
                <p className="text-xs text-muted-foreground p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 mb-4">
                  All available transition paths require an income gap longer than half your current runway. See the section below for details.
                </p>
              )}

              {/* Visible paths */}
              {visiblePaths.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {visiblePaths.slice(0, 4).map((path, i) => renderPathCard(path, i))}
                </div>
              )}

              {/* Hidden paths — collapsed section with spec disclosure note.
                  The spec requires: "[N] additional paths available — these require a
                  [X]-month income gap not compatible with your current financial runway."
                  Never show these to a conservative profile user without this explicit
                  disclosure framing. Expanding requires an active decision by the user. */}
              {hiddenPaths.length > 0 && (
                <CollapsibleSection
                  title={`${hiddenPaths.length} additional path${hiddenPaths.length > 1 ? 's' : ''} available — income gap required`}
                  defaultOpen={false}
                >
                  {/* Spec-exact disclosure note */}
                  <div
                    className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-4"
                    style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                      <span className="font-semibold text-amber-400">
                        {hiddenPaths.length} additional path{hiddenPaths.length > 1 ? 's' : ''} available
                      </span>
                      {' '}— these require a{' '}
                      <span className="font-semibold text-amber-400">{gapLabel}</span>
                      {' '}not compatible with your current financial runway.
                      {fpRunwayMonths != null && (
                        ` Your runway (${fpRunwayMonths.toFixed(1)} months) covers less than half the income gap these transitions require.`
                      )}
                      {' '}Increase your emergency fund before pursuing these paths.
                    </p>
                  </div>

                  {/* Hidden path cards — rendered at reduced opacity with income gap warning */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {hiddenPaths.slice(0, 4).map((path, i) => renderPathCard(path, i, /* dimmed */ true))}
                  </div>
                </CollapsibleSection>
              )}
            </div>
          );
        })()}

        {/* ── Upskilling Roadmap — v4.0 archetype-aware ── */}
        <CollapsibleSection title="Strategic Transformation Roadmap">
          <div className="space-y-4">
            {archetypeRoadmap ? (
              /* v4.0/v6.0: Archetype roadmap with collapse compression support */
              <div className="space-y-4">

                {/* v6.0 Upgrade 5: Compression banner — shows urgency-adjusted timeline */}
                {archetypeRoadmap.compressionApplied && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">
                      <span className="font-bold">Timeline compressed:</span>{' '}
                      {archetypeRoadmap.compressionApplied.bannerText}
                    </p>
                  </div>
                )}

                {/* Toggle between Primary and Hybrid strategy views.
                    Shown ONLY when archetypeSelection.hybridRoadmap exists (i.e. user
                    qualifies for both archetypes within 3 points of trigger).
                    This is a TOGGLE, not a dropdown — both paths are recommended,
                    and the user can switch views without losing the other. */}
                {archetypeSelection.hybridRoadmap && (
                  <div
                    className="flex gap-2 p-1 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    role="tablist"
                    aria-label="Strategy view"
                  >
                    {(['primary', 'hybrid'] as const).map(view => {
                      const isActive = strategyView === view;
                      return (
                        <button
                          key={view}
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setStrategyView(view)}
                          className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
                          style={{
                            background: isActive ? 'rgba(0,212,224,0.18)' : 'transparent',
                            color: isActive ? '#22d3ee' : 'rgba(255,255,255,0.55)',
                            border: isActive ? '1px solid rgba(0,212,224,0.40)' : '1px solid transparent',
                          }}
                        >
                          {view === 'primary'
                            ? `Primary: ${archetypeSelection.primary}`
                            : `Hybrid: ${archetypeSelection.primary} + ${archetypeSelection.secondary}`}
                        </button>
                      );
                    })}
                  </div>
                )}

                {strategyView === 'hybrid' && archetypeSelection.hybridRoadmap ? (
                  // ── Hybrid view: Phase 0/1/2 sequenced roadmap ─────────────
                  <div className="space-y-4">
                    <div className="rounded-xl border border-purple-500/25 bg-purple-500/6 p-4">
                      <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">
                        Hybrid Strategy: {archetypeSelection.hybridRoadmap.primary} + {archetypeSelection.hybridRoadmap.secondary}
                      </div>
                      <p className="text-sm font-semibold mb-2">{archetypeSelection.hybridRoadmap.headline}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{archetypeSelection.hybridRoadmap.rationale}</p>
                    </div>

                    {archetypeSelection.hybridRoadmap.phases.map((phase) => {
                      const phaseColors = ['#f59e0b', '#3b82f6', '#8b5cf6'];
                      const c = phaseColors[phase.phase] ?? '#3b82f6';
                      return (
                        <div key={phase.phase} className="rounded-xl border p-4" style={{ borderColor: `${c}30`, background: `${c}06` }}>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: c }}>
                              Phase {phase.phase} — {phase.timeRange}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {phase.fromArchetypes.join(' + ')}
                            </span>
                          </div>
                          <p className="text-sm font-bold mb-2">{phase.title}</p>
                          {/* Phase 2 momentum note — spec-exact: "your primary archetype actions are creating momentum — now layer in secondary." */}
                          {phase.note && (
                            <div
                              className="mb-3 rounded-lg p-2.5 flex items-start gap-2"
                              style={{ background: `${c}10`, border: `1px solid ${c}25` }}
                            >
                              <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: c }} />
                              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
                                {phase.note}
                              </p>
                            </div>
                          )}
                          <div className="space-y-1 mb-2">
                            {phase.actions.map((a, j) => (
                              <p key={j} className="text-xs text-muted-foreground flex gap-2">
                                <span style={{ color: c }} className="flex-shrink-0">{j + 1}.</span>{a}
                              </p>
                            ))}
                          </div>
                          <p className="text-[10px] font-bold" style={{ color: c }}>Milestone: {phase.milestone}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // ── Primary view: standard archetype roadmap ───────────────
                  <>
                <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/6 p-4">
                  <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">
                    {archetypeRoadmap.archetype} Strategy Activated
                  </div>
                  <p className="text-sm font-semibold mb-2">{archetypeRoadmap.headline}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{archetypeRoadmap.whyThisArchetype}</p>
                </div>

                {/* Hybrid sequence text shown ONLY when no structured hybridRoadmap exists
                    (e.g. AUGMENT+LEVERAGE case has a hybridSequence string but no structured phases). */}
                {archetypeSelection.hybridSequence && archetypeSelection.secondary && !archetypeSelection.hybridRoadmap && (
                  <div className="rounded-xl border border-purple-500/25 bg-purple-500/6 p-4">
                    <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">
                      Hybrid Strategy: {archetypeSelection.primary} + {archetypeSelection.secondary}
                    </div>
                    {archetypeSelection.hybridSequence.split('\n\n').map((para, i) => (
                      <p key={i} className="text-xs text-muted-foreground leading-relaxed mb-2 last:mb-0">{para}</p>
                    ))}
                  </div>
                )}

                {archetypeRoadmap.phase0 && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4">
                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">
                      Phase 0 —{' '}
                      <span>{archetypeRoadmap.phase0.weekRange}</span>
                      {archetypeRoadmap.phase0.originalWeekRange && archetypeRoadmap.phase0.originalWeekRange !== archetypeRoadmap.phase0.weekRange && (
                        <span className="text-amber-400/55 ml-1 font-normal normal-case tracking-normal">
                          (compressed from {archetypeRoadmap.phase0.originalWeekRange})
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold mb-2">{archetypeRoadmap.phase0.title}</p>
                    <div className="space-y-1 mb-2">
                      {archetypeRoadmap.phase0.actions.map((a, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-amber-400 flex-shrink-0">{i + 1}.</span>{a}
                        </p>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-400 font-bold">Milestone: {archetypeRoadmap.phase0.milestone}</p>
                  </div>
                )}

                {archetypeRoadmap.phases.map((phase, i) => {
                  const phaseColors = ['#3b82f6', '#8b5cf6', '#10b981'];
                  const c = phaseColors[i] ?? scoreColor;
                  return (
                    <div key={phase.phase} className="rounded-xl border p-4" style={{ borderColor: `${c}30`, background: `${c}06` }}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: c }}>
                          Phase {phase.phase} — {phase.weekRange}
                          {phase.originalWeekRange && phase.originalWeekRange !== phase.weekRange && (
                            <span className="ml-1 font-normal normal-case tracking-normal opacity-60">
                              (compressed from {phase.originalWeekRange})
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">{phase.focus}</span>
                      </div>
                      <p className="text-sm font-bold mb-2">{phase.title}</p>
                      <div className="space-y-1 mb-2">
                        {phase.actions.map((a, j) => (
                          <p key={j} className="text-xs text-muted-foreground flex gap-2">
                            <span style={{ color: c }} className="flex-shrink-0">{j + 1}.</span>{a}
                          </p>
                        ))}
                      </div>
                      <p className="text-[10px] font-bold" style={{ color: c }}>Milestone: {phase.milestone}</p>
                    </div>
                  );
                })}
                  </>
                )}
              </div>
            ) : (
              /* Standard bracket-based roadmap when no archetype is triggered */
              <StrategicRoadmap
                intel={intel}
                scoreColor={scoreColor}
                score={result.total}
                experience={result.experience}
              />
            )}
          </div>
        </CollapsibleSection>

        {/* v14.0: Skill Portfolio Fit — shown when user has declared skills */}
        {(result as any).skillPortfolioFit && (
          <div className="mt-6">
            <SectionHeader
              title="Skill Portfolio Intelligence"
              description="Your declared skills scored against 2026 Q1 market demand — identifies surging, stable, and declining skills with forward-looking decay projections."
            />
            <SkillPortfolioPanel portfolio={(result as any).skillPortfolioFit} />
          </div>
        )}

        {/* v14.0: Career Velocity — always shown */}
        {(result as any).careerVelocity && (
          <div className="mt-6">
            <SectionHeader
              title="Career Velocity Intelligence"
              description="Promotion velocity, plateau risk, and internal visibility scoring — research shows plateaued performers are first-cut candidates in any restructuring."
            />
            <CareerVelocityPanel velocity={(result as any).careerVelocity} />
          </div>
        )}

        {/* v16.0: Role market demand and personal financial runway */}
        <div className="mt-6 space-y-3">
          <RoleMarketDemandPanel roleMarketDemand={(result as any).roleMarketDemand} />
          <UserFinancialRunwayPanel userFinancialRunway={(result as any).userFinancialRunway} />
        </div>

        {/* v17.0: Skill Gap Intelligence — market-demand-scored gap analysis */}
        <div className="mt-6">
          <SkillGapIntelligencePanel skillGapIntelligence={(result as any).skillGapIntelligence} />
        </div>

        {/* v17.0: Personalized Timeline — critical date countdown and milestones */}
        {(result as any).personalizedTimeline && (
          <div className="mt-4">
            <PersonalizedTimelinePanel personalizedTimeline={(result as any).personalizedTimeline} />
          </div>
        )}

        {/* ── Career Twin Contribution CTA ── */}
        <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <div className="flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold mb-1">Help others in your role — share your transition story</div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                When professionals like you contribute verified transition data, the Career Twin matching engine becomes
                dramatically more accurate. Every submission improves predictions for everyone in the same role category.
                As a thank you, you receive a <span className="text-cyan-400 font-semibold">Transition Verified</span> badge
                that reduces your displayed risk score by 2 pts.
              </p>
              {twinSubmitted ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <UserCheck className="w-3.5 h-3.5" />
                  Transition story submitted — thank you for contributing.
                </div>
              ) : (
                <button
                  onClick={() => setShowTwinModal(true)}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Share My Transition Story
                </button>
              )}
            </div>
          </div>
        </div>

      </motion.div>

      {/* Career Twin Submission Modal */}
      <AnimatePresence>
        {showTwinModal && (
          <CareerTwinSubmissionModal
            fromRole={intel.displayRole}
            fromRiskScore={result.total}
            onClose={() => setShowTwinModal(false)}
            onSuccess={() => {
              localStorage.setItem('hp_twin_submitted', '1');
              setTwinSubmitted(true);
              setShowTwinModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

export default CareerSkillsTab;
