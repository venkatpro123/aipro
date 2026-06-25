// OverviewTab.tsx — Executive snapshot
// Answers "How risky is my situation?" in ≤3 seconds.
// Integrates: score delta attribution, salary risk model, phase-aware urgency,
//             inaction scenario, conflict disclosure, and prediction feedback.

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, Zap, Clock, ShieldCheck, Activity,
  ThumbsUp, ThumbsDown, ArrowRight, AlertCircle, Info,
  TrendingUp, TrendingDown, Briefcase, Calendar, Target, ChevronRight,
} from "lucide-react";
import { submitPredictionFeedback } from "@/services/scoreSyncService";
import type { PrecisionBrief } from "@/services/scenarioNarrativeEngine";
import type { TemporalRiskResult, LegalTimelineResult, ProtectionBufferResult } from "@/services/temporalRiskAmplifier";
import type { JobMarketLiquidityResult } from "@/services/jobMarketLiquidityService";
import type { EscapePathReport } from "@/services/escapePathOptimizer";
import { useAdaptiveSystem } from "@/hooks/useAdaptiveSystem";
import { ScoreRing } from "@/components/ScoreRing";
import { DataQualityBanner } from "../../../components/DataQualityBanner";
import { ConflictDisclosurePanel } from "../../../components/ConflictDisclosurePanel";
import { ScoreDeltaExplainer } from "../../components/ScoreDeltaExplainer";
import { SalaryAtRiskPanel, getTrajParams } from "../../components/SalaryAtRiskPanel";
import { StatCard } from "./common/StatCard";
import type { HybridResult } from "@/types/hybridResult";
import type { CompanyData } from "@/data/companyDatabase";
import {
  getScoreColor,
  getVerdict,
  getTimeline,
  getUrgency,
} from "@/data/riskEngine";
import type { TabProps } from "./common/types";
import { CalendarHeatmap } from "@/components/ui/CalendarHeatmap";
import { GaugeDial } from "@/components/ui/GaugeDial";
import { getCareerIntelligence } from "@/data/intelligence";
import { getAttributedDelta, computeScoreVelocity, getUserReturnType } from "@/services/scoreDeltaService";
import { Stage3EmergencyProtocol } from "../../components/Stage3EmergencyProtocol";
import {
  loadFinancialContext,
  deriveFinancialProfile,
} from "@/services/financialContextService";
import { inferCurrencyFromContext } from "@/services/currencyService";
import { computePeerPercentile, getLivePeerPercentile, formatPercentile, type PeerPercentileResult } from "@/services/peerPercentile";
// v12.0 new panels
import { ManagerRiskCard } from "./common/ManagerRiskCard";
import { VisaRiskPanel } from "./common/VisaRiskPanel";
import { WhatIfSimulatorPanel } from "./WhatIfSimulatorPanel";
// v13.0 new panels
import MacroRiskPanel from "./common/MacroRiskPanel";
import EmergencyProtocolPanel from "./common/EmergencyProtocolPanel";
// v16.0 new panels
import WARNSignalPanel from "./common/WARNSignalPanel";
// v17.0 new panels
import EmergencyModeHeader from "../../components/EmergencyModeHeader";
import PredictionHorizonPanel from "./common/PredictionHorizonPanel";

// ── Collapse stage-to-urgency multiplier ──────────────────────────────────────
// The score gives the role-baseline timeline. Company collapse stage compresses it.
// Stage 1 (early warning): × 0.6 — "your 18-month window is actually 10–11 months"
// Stage 2 (active signals): × 0.4 — "your 18-month window is actually 7 months"
// Stage 3 (imminent):       × 0.2 — "you have 3–4 months maximum"
type CollapseStage = 1 | 2 | 3 | null;

interface PhaseAwareUrgency {
  baseTimeline: string;
  adjustedTimeline: string | null;
  multiplier: number;
  hasAdjustment: boolean;
  adjustmentReason: string;
}

function computePhaseAwareUrgency(
  score: number,
  collapseStage: CollapseStage,
): PhaseAwareUrgency {
  const baseTimeline = getTimeline(score);
  if (!collapseStage) {
    return {
      baseTimeline,
      adjustedTimeline: null,
      multiplier: 1,
      hasAdjustment: false,
      adjustmentReason: '',
    };
  }

  // Parse base months from timeline string, e.g. "12–18 months" → 15 midpoint
  const baseMonths = score >= 80 ? 9 : score >= 60 ? 18 : score >= 40 ? 30 : 42;
  const MULTIPLIERS: Record<number, number> = { 1: 0.6, 2: 0.4, 3: 0.2 };
  const multiplier = MULTIPLIERS[collapseStage] ?? 1;
  const adjustedMonths = Math.round(baseMonths * multiplier);

  const adjustedTimeline = adjustedMonths <= 3 ? 'Under 3 months'
    : adjustedMonths <= 6 ? '3–6 months'
    : adjustedMonths <= 12 ? '6–12 months'
    : `~${adjustedMonths} months`;

  const REASONS: Record<number, string> = {
    1: 'Stage 1 collapse signals detected — early warning multiplier (0.6×) applied to base timeline',
    2: 'Stage 2 collapse signals active — displacement multiplier (0.4×) applied to base timeline',
    3: 'Stage 3 imminent risk — critical multiplier (0.2×) applied. Timeline is highly compressed.',
  };

  return {
    baseTimeline,
    adjustedTimeline,
    multiplier,
    hasAdjustment: true,
    adjustmentReason: REASONS[collapseStage],
  };
}

// ── Inaction scenario ─────────────────────────────────────────────────────────

// ── buildInactionScenario ─────────────────────────────────────────────────────
//
// Priority order:
//   1. LLM-generated sixMonthInactionConsequence (context-aware, highest quality)
//   2. uniquenessDepth-specific scenario  ← MUST come before intel.inactionScenario
//   3. intel.inactionScenario for generic only (supplementary, appended not replaced)
//   4. Score-tier generic fallback
//
// Why uniquenessDepth before intel.inactionScenario:
//   intel.inactionScenario is role-generic — it describes what happens to the role
//   category, not to the individual's knowledge profile. A critical_knowledge user
//   has a completely different threat model from a generic role holder at the same
//   company. The role DB text would override the correct framing without this fix.

function buildInactionScenario(result: HybridResult): string | null {
  // 1. LLM text takes first priority — it receives uniquenessDepth as context
  if (result.sixMonthInactionConsequence) {
    return result.sixMonthInactionConsequence;
  }

  const score = result.total;
  const roleKey = result.workTypeKey;
  const company = result.companyName ?? 'your company';
  const intel = getCareerIntelligence(roleKey);

  // 2. uniquenessDepth determines the structural threat model.
  //    This MUST precede intel?.inactionScenario — the role DB text does not know
  //    the individual's uniqueness depth and cannot produce the correct framing.
  const uniquenessDepth = (result as any).uniquenessDepth as string | undefined;

  if (uniquenessDepth === 'critical_knowledge') {
    // Threat: knowledge extraction, not automation. Timeline: migration cycle.
    // The action is to leverage institutional authority BEFORE migration completes.
    return (
      `Your irreplaceable institutional knowledge is your protection — but companies systematically extract it ` +
      `through documentation projects and AI-assisted capture programs. Your window is the migration timeline. ` +
      `Act now to build new expertise while your institutional authority still has leverage.\n\n` +
      `This is a threshold event, not a gradual erosion. Once the migration completes, your protection ` +
      `disappears simultaneously — and the market for your profile narrows sharply. The highest-ROI action ` +
      `right now is not to document your knowledge further: that accelerates its transfer to the company's ` +
      `ownership. Use your institutional authority to negotiate scope expansion, access to adjacent systems, ` +
      `or a transition into the role that governs how AI is deployed in your specific domain. ` +
      `Nobody has more relevant knowledge for that role than you do. The window to claim it is now.`
    );
  }

  if (uniquenessDepth === 'functional_specialist') {
    // Threat: specialist moat is real but temporary. Timeline: 18-24 months.
    // The action is to transition specialisation to the AI-adjacent governance layer.
    return (
      `Your domain expertise provides moderate protection — the company cannot immediately replace you. ` +
      `However, within 18–24 months the company can hire AI-capable specialists from the market.\n\n` +
      `The specialist moat erodes as AI capability in your specific domain advances and as companies ` +
      `build training programmes for the replacement profile. The threat is not automation of your entire ` +
      `role — it is that the new AI-capable version of your specialisation is hireable from outside for ` +
      `less than you cost. The augmentation window is open now. Begin transitioning your specialisation ` +
      `to the AI-adjacent layer: the person who validates, governs, and directs AI output in your specific ` +
      `domain is structurally harder to replace than the person who performs the original task.`
    );
  }

  // 3. Generic role — fastest displacement timeline.
  //    Populate the spec template with actual role intelligence data.
  //    [task], [AI tool], [top at-risk task] come from intel to make this specific.
  const topAtRisk = intel?.skills?.at_risk?.[0] ?? intel?.skills?.obsolete?.[0];
  const taskName  = topAtRisk?.skill      ?? 'standard workflow tasks';
  const aiTool    = topAtRisk?.aiTool     ?? 'enterprise AI platforms';

  const specTemplate = (
    `Roles performing standard ${taskName} face a displacement window of 14–18 months. ` +
    `${aiTool} handles ${taskName} in production today. ` +
    `Roles without demonstrated AI augmentation are being cut first.`
  );

  // Score-tier context appended below the spec template
  let scoreContext: string;
  if (score >= 75) {
    scoreContext = (
      ` At ${score}/100, displacement risk is active at ${company}. ` +
      `Roles without documented AI productivity gains are the easiest to justify removing — ` +
      `a smaller AI-capable team produces the same output at lower cost. ` +
      `This is the observed pattern from every sector that has completed this cycle. ` +
      `Employees who waited for an official announcement had 4–6 fewer months to reposition ` +
      `than those who started proactively.`
    );
  } else if (score >= 55) {
    scoreContext = (
      ` At ${score}/100, you are in the augmentation window — AI is absorbing the execution ` +
      `layer of this role, but human oversight and judgment still drive measurable value. ` +
      `This window closes as the market supply of AI-capable ${roleKey.replace(/_/g, ' ')} ` +
      `professionals increases. Those who own the AI layer while the transition is happening ` +
      `retain leverage and salary premium. Those who wait face accelerated commoditisation ` +
      `when the window closes.`
    );
  } else if (score >= 35) {
    scoreContext = (
      ` At ${score}/100, exposure is moderate and manageable. Inaction is not immediately ` +
      `dangerous, but the risk compounds annually as AI capability advances around a static skill set. ` +
      `Two hours per week of directed AI augmentation prevents gradual drift. ` +
      `Reassess in 12 months or after any significant AI deployment at ${company}.`
    );
  } else {
    scoreContext = (
      ` At ${score}/100, your role has strong structural resilience. ` +
      `Inaction carries minimal near-term risk. Monitor sector AI adoption annually ` +
      `and maintain depth in your core differentiating skills.`
    );
  }

  // Append the role DB inactionScenario as supplementary context when available.
  // For generic only — for specialist/critical the depth-specific text is sufficient.
  const dbContext = intel?.inactionScenario
    ? `\n\n${intel.inactionScenario}`
    : '';

  return `${specTemplate}${scoreContext}${dbContext}`;
}

// ── Quick actions ─────────────────────────────────────────────────────────────

function buildQuickActions(result: HybridResult): Array<{ text: string; urgency: 'high' | 'medium' | 'low' }> {
  const score = result.total;
  const intel = getCareerIntelligence(result.workTypeKey);
  const actions: Array<{ text: string; urgency: 'high' | 'medium' | 'low' }> = [];

  if (score >= 70) {
    actions.push({ text: 'Update resume + LinkedIn this week — target 2 warm-contact conversations before any announcement', urgency: 'high' });
    actions.push({ text: 'Ensure 6–9 months of emergency fund is liquid — do not wait for confirmation', urgency: 'high' });
  }
  if (score >= 50) {
    actions.push({
      text: intel?.careerPaths?.[0]
        ? `Begin researching "${intel.careerPaths[0].role}" — ${intel.careerPaths[0].riskReduction}% risk reduction, ${intel.careerPaths[0].timeToTransition} transition`
        : 'Map 2 adjacent roles with lower AI exposure in your industry this week',
      urgency: score >= 70 ? 'high' : 'medium',
    });
    actions.push({ text: 'Identify 1 task AI is already doing in your role — position yourself as its supervisor, not its executor', urgency: 'medium' });
  }
  const topSafe = intel?.skills?.safe?.[0];
  if (topSafe) {
    actions.push({ text: `Deepen "${topSafe.skill}" (LTV: ${topSafe.longTermValue}/100) — compound the one skill AI cannot replicate`, urgency: 'low' });
  } else {
    actions.push({ text: 'Build visible cross-functional presence — present work to adjacent teams monthly', urgency: 'low' });
  }
  return actions.slice(0, 3);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const VerdictBadge: React.FC<{ score: number }> = ({ score }) => {
  const verdict = getVerdict(score);
  const config: Record<string, {
    color: string; gradStart: string; gradEnd: string; glow: string;
    Icon: typeof Shield; dotColor: string;
  }> = {
    'Critical risk': {
      color: '#fff', gradStart: '#ef4444', gradEnd: '#b91c1c',
      glow: '0 0 32px rgba(239,68,68,0.45)', Icon: Zap, dotColor: '#fca5a5',
    },
    'High risk': {
      color: '#fff', gradStart: '#f97316', gradEnd: '#c2410c',
      glow: '0 0 32px rgba(249,115,22,0.40)', Icon: Zap, dotColor: '#fdba74',
    },
    'Moderate risk': {
      color: '#fff', gradStart: '#f59e0b', gradEnd: '#b45309',
      glow: '0 0 28px rgba(245,158,11,0.35)', Icon: AlertTriangle, dotColor: '#fcd34d',
    },
    'Low risk': {
      color: '#fff', gradStart: '#10b981', gradEnd: '#047857',
      glow: '0 0 28px rgba(16,185,129,0.35)', Icon: Shield, dotColor: '#6ee7b7',
    },
  };
  const { color, gradStart, gradEnd, glow, Icon, dotColor } = config[verdict] ?? config['Moderate risk'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 18px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
        boxShadow: glow,
        color,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Live pulse dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', background: dotColor,
          animation: 'pulse-live 2s ease-in-out infinite',
          boxShadow: `0 0 8px ${dotColor}`,
          flexShrink: 0,
        }} />
        <Icon className="w-4 h-4" style={{ color: 'var(--alpha-text-92)', flexShrink: 0 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, position: 'relative' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          fontWeight: 900,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--alpha-text-92)',
        }}>
          {verdict.toUpperCase()}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'var(--alpha-text-70)',
          marginTop: '2px',
        }}>
          {getUrgency(score)} ACTION REQUIRED
        </span>
      </div>
    </motion.div>
  );
};

const TimelineCard: React.FC<{
  score: number;
  phaseUrgency: PhaseAwareUrgency;
  collapseStage: CollapseStage;
}> = ({ score, phaseUrgency, collapseStage }) => {
  const scoreColor = getScoreColor(score);
  return (
    <div className="glass-panel" style={{ padding: 'var(--space-5) var(--space-6)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-2)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <div className="label-xs text-muted-foreground mb-2">
            {phaseUrgency.hasAdjustment ? 'Adjusted Timeline' : 'Exposure Horizon'}
          </div>
          {phaseUrgency.hasAdjustment && phaseUrgency.adjustedTimeline ? (
            /* Arrow format: "18 months [base] → 7 months [Stage N adjusted]"
               Base is muted; adjusted is red and prominent. */
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-muted-foreground/55 line-through decoration-muted-foreground/30">
                  {phaseUrgency.baseTimeline}
                </span>
                <span className="text-muted-foreground/35 font-bold text-sm">→</span>
                <span className="text-xl font-black tracking-tight text-red-400">
                  {phaseUrgency.adjustedTimeline}
                </span>
              </div>
              <div className="mt-1.5">
                <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">
                  Stage {collapseStage} compressed
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
              {phaseUrgency.baseTimeline}
            </div>
          )}
        </div>
        <div style={{ paddingLeft: 'var(--space-4)', borderLeft: '1px solid var(--border-2)' }}>
          <div className="label-xs text-muted-foreground mb-1">Action Urgency</div>
          <div className="text-xl font-black tracking-tight" style={{ color: scoreColor }}>
            {getUrgency(score)}
          </div>
        </div>
      </div>
      {phaseUrgency.hasAdjustment && (
        <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-amber-400 leading-relaxed">
          ⚠ {phaseUrgency.adjustmentReason}
        </div>
      )}
    </div>
  );
};

// Synthetic sparkline data seeded from metric value for visual interest
function seedSparkline(value: number, points = 7): number[] {
  const seed = value % 13;
  const base = value;
  return Array.from({ length: points }, (_, i) => {
    const noise = ((seed * (i + 1) * 7919) % 23) - 11;
    return Math.max(0, base + noise * 0.4);
  });
}

const STAT_ACCENT_COLORS = [
  'var(--cyan)',     // Confidence → cyan
  'var(--emerald)', // Live Signals → emerald
  'var(--amber)',   // Data Age → amber
  'var(--violet)',  // Overrides → violet
] as const;

const QuickStatsRow: React.FC<{
  stats: Array<{ label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; hint?: string }>;
}> = ({ stats }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  return (
  <div style={{
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
    gap: 'var(--space-3)',
  }}>
    {stats.map((s, i) => {
      const accentColor = STAT_ACCENT_COLORS[i] ?? 'var(--cyan)';
      const numericVal = typeof s.value === 'number' ? s.value
        : parseFloat(String(s.value).replace(/[^0-9.]/g, '')) || 50;
      const sparkData = seedSparkline(numericVal);
      return (
        <div
          key={i}
          className="metric-card"
          style={{ "--metric-accent": accentColor, padding: 'var(--space-4)' } as React.CSSProperties}
          title={s.hint}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="data-label">{s.label}</span>
            {React.createElement(s.icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>, { className: 'w-3.5 h-3.5', style: { color: accentColor, opacity: 0.7 } })}
          </div>
          <div className="flex items-end justify-between gap-2">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 + 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: accentColor,
              }}
            >
              {s.value}
            </motion.div>
            <svg
              width={72}
              height={28}
              viewBox="0 0 72 28"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <defs>
                <linearGradient id={`qs_grad_${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={accentColor as string} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={accentColor as string} stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = sparkData;
                const minV = Math.min(...pts);
                const maxV = Math.max(...pts);
                const range = maxV - minV || 1;
                const xs = pts.map((_, j) => 2 + j * (68 / (pts.length - 1)));
                const ys = pts.map(v => 3 + ((maxV - v) / range) * 22);
                let d = `M ${xs[0]} ${ys[0]}`;
                for (let j = 1; j < xs.length; j++) {
                  const cpx = (xs[j-1] + xs[j]) / 2;
                  d += ` C ${cpx} ${ys[j-1]}, ${cpx} ${ys[j]}, ${xs[j]} ${ys[j]}`;
                }
                const area = `${d} L ${xs[xs.length-1]} 28 L ${xs[0]} 28 Z`;
                return (
                  <>
                    <path d={area} fill={`url(#qs_grad_${i})`} />
                    <path
                      d={d}
                      fill="none"
                      stroke={accentColor as string}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: 400,
                        strokeDashoffset: 400,
                        animation: `sparkline-draw 600ms cubic-bezier(0.22,1,0.36,1) both`,
                        animationDelay: `${i * 80 + 300}ms`,
                      }}
                    />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      );
    })}
  </div>
  );
};

const InactionPanel: React.FC<{ scenario: string; score: number }> = ({ scenario, score }) => {
  const color = score >= 70 ? '#ef4444' : score >= 50 ? '#f59e0b' : '#00d4e0';
  const title = score >= 70 ? '⚠ What Happens If You Do Nothing'
    : score >= 50 ? '⏳ The Cost of Waiting'
    : 'ℹ Monitoring Recommendation';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="rounded-xl border p-5 mt-4" style={{ background: `${color}08`, borderColor: `${color}25` }}>
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color }} />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>{title}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{scenario}</p>
    </motion.div>
  );
};

const QuickActionsRow: React.FC<{
  actions: Array<{ text: string; urgency: 'high' | 'medium' | 'low' }>;
}> = ({ actions }) => {
  const uColor = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--cyan)' };
  const uLabel = { high: 'NOW', medium: '30 DAYS', low: 'ONGOING' };
  return (
    <div className="mt-6">
      <div className="label-xs text-muted-foreground uppercase tracking-widest mb-3">Top Actions Based on Your Profile</div>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: uColor[a.urgency] }} />
            <span className="text-xs text-muted-foreground leading-relaxed flex-1">{a.text}</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: `${uColor[a.urgency]}15`, color: uColor[a.urgency], border: `1px solid ${uColor[a.urgency]}25` }}>
              {uLabel[a.urgency]}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ── Precision Brief Panel ─────────────────────────────────────────────────────
// Shows the 3-point analyst summary: #1 driver, #1 protection, most volatile signal.

const PrecisionBriefPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const brief = (result as any).precisionBrief as PrecisionBrief | undefined;
  if (!brief) return null;

  const cards = [
    {
      type: 'driver',
      label: '#1 Risk Driver',
      sublabel: brief.topRiskDriver.label,
      score: brief.topRiskDriver.score,
      pct: brief.topRiskDriver.percentOfTotal,
      text: brief.topRiskDriver.naturalLanguage,
      color: '#ef4444',
      gradBg: 'rgba(239,68,68,0.07)',
      border: 'rgba(239,68,68,0.20)',
      icon: '🔴',
    },
    {
      type: 'protect',
      label: '#1 Protection',
      sublabel: brief.topProtectiveFactor.label,
      score: brief.topProtectiveFactor.score,
      pct: brief.topProtectiveFactor.percentOfTotal,
      text: brief.topProtectiveFactor.naturalLanguage,
      color: '#10b981',
      gradBg: 'rgba(16,185,129,0.07)',
      border: 'rgba(16,185,129,0.20)',
      icon: '🟢',
    },
    {
      type: 'volatile',
      label: 'Most Volatile',
      sublabel: brief.mostVolatileSignal.name,
      score: null,
      pct: null,
      text: brief.mostVolatileSignal.reason,
      extra: brief.mostVolatileSignal.currentValue,
      color: '#f59e0b',
      gradBg: 'rgba(245,158,11,0.07)',
      border: 'rgba(245,158,11,0.20)',
      icon: '⚡',
    },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="mt-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-3.5 h-3.5" style={{ color: 'var(--cyan)' }} />
        <span className="data-label" style={{ color: 'var(--text-2)', letterSpacing: '0.16em' }}>
          ANALYST INTELLIGENCE BRIEF
        </span>
        <span className="ml-auto text-[10px] font-mono opacity-35 uppercase tracking-widest">precision · v9</span>
      </div>

      {/* 3-column insight cards — single column on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.type}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: c.gradBg,
              border: `1px solid ${c.border}`,
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: c.color, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />

            {/* Card header */}
            <div>
              <div className="data-label" style={{ color: c.color, letterSpacing: '0.12em', marginBottom: '2px' }}>
                {c.icon} {c.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--text-2)',
                lineHeight: 1.3,
              }}>
                {c.sublabel}
              </div>
            </div>

            {/* Metric */}
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {c.score != null ? (
                <>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: c.color }}>
                    {c.score}
                  </span>
                  <span className="data-label" style={{ opacity: 0.5 }}>/100</span>
                  {c.pct != null && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 800,
                      color: c.color, background: `${c.color}15`,
                      border: `1px solid ${c.color}30`,
                      borderRadius: '4px', padding: '1px 5px',
                    }}>
                      {c.pct}% of score
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 800, color: c.color }}>
                  {(c as any).extra}
                </span>
              )}
            </div>

            {/* Narrative text */}
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.68rem',
              color: 'var(--text-3)',
              lineHeight: 1.55,
              flexGrow: 1,
            }}>
              {c.text.length > 120 ? c.text.substring(0, 120) + '…' : c.text}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Score composition row */}
      <div className="mt-2.5 px-1 text-[10px] font-mono text-muted-foreground opacity-40 leading-relaxed">
        {brief.scoreComposition}
      </div>
    </motion.div>
  );
};

// ── Temporal Risk Panel ───────────────────────────────────────────────────────
// Shows calendar-aware risk amplification: earnings windows, seasonal patterns,
// next danger window, and safe months for negotiations.

const TemporalRiskPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const temporal = (result as any).temporalRisk as TemporalRiskResult | undefined;
  if (!temporal) return null;

  const isAmplified = temporal.currentAmplifier > 1.04;
  const isDampened  = temporal.currentAmplifier < 0.96;
  const accentColor = isAmplified ? '#ef4444' : isDampened ? '#10b981' : 'var(--text-3)';

  // Build CalendarHeatmap month entries from riskCalendar
  const now = new Date();
  const heatmapMonths = (temporal.riskCalendar ?? []).map((entry: any, i: number) => {
    const d = new Date(now);
    d.setMonth(now.getMonth() + i);
    const fallbackMonthStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    // MonthlyRiskEntry.month is a number (1-12); monthLabel is the string "Jan 2027"
    // Use monthLabel first, then fallback to computed string — never use the numeric month field
    const monthStr: string = typeof entry.monthLabel === 'string'
      ? entry.monthLabel
      : fallbackMonthStr;
    return {
      month: monthStr,
      amplifier: typeof entry.baseAmplifier === 'number' ? entry.baseAmplifier
               : typeof entry.amplifier === 'number'     ? entry.amplifier
               : 1.0,
      label: entry.activeWindows?.[0] ?? entry.reason ?? undefined,
      isCurrent: i === 0,
    };
  });

  // Show panel always when temporal data exists (calendar heatmap always useful)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{
        borderColor: isAmplified ? 'rgba(239,68,68,0.22)' : isDampened ? 'rgba(16,185,129,0.22)' : 'var(--alpha-bg-08)',
        background: isAmplified ? 'rgba(239,68,68,0.04)' : isDampened ? 'rgba(16,185,129,0.04)' : 'var(--alpha-bg-04)',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2.5 flex items-center gap-2 border-b border-white/[0.06]">
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accentColor }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: accentColor }}>
          12-Month Risk Calendar
        </span>
        {isAmplified && (
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.30)' }}>
            ×{temporal.currentAmplifier.toFixed(2)} NOW
          </span>
        )}
        {isDampened && (
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.30)' }}>
            ×{temporal.currentAmplifier.toFixed(2)} SAFE
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono opacity-35 uppercase tracking-widest">hover for detail</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Calendar heatmap */}
        {heatmapMonths.length > 0 ? (
          <CalendarHeatmap months={heatmapMonths} />
        ) : (
          <div className="text-[10px] text-muted-foreground opacity-60">
            Activity calendar builds over time — check back after your next audit.
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <div>
            <div className="data-label mb-1">Peak Month</div>
            <div className="text-xs font-bold" style={{ color: temporal.peakAmplifier > 1.10 ? '#ef4444' : '#f59e0b' }}>
              {temporal.peakRiskMonth?.split(' ')[0] ?? '—'}
            </div>
            <div className="data-label" style={{ opacity: 0.5 }}>×{temporal.peakAmplifier?.toFixed(2)}</div>
          </div>
          {temporal.nextDangerWindow && (
            <div>
              <div className="data-label mb-1">Next Window</div>
              <div className="text-xs font-bold" style={{ color: '#f59e0b' }}>
                {temporal.nextDangerWindow.startsInDays < 30
                  ? `${temporal.nextDangerWindow.startsInDays}d`
                  : `${Math.round(temporal.nextDangerWindow.startsInDays / 30)}mo`}
              </div>
              <div className="data-label" style={{ opacity: 0.5 }}>away</div>
            </div>
          )}
          {temporal.safeWindows?.length > 0 && (
            <div>
              <div className="data-label mb-1">Best to Move</div>
              <div className="text-xs font-bold" style={{ color: '#10b981' }}>
                {temporal.safeWindows[0]?.split(' ')[0] ?? '—'}
              </div>
              <div className="data-label" style={{ opacity: 0.5 }}>low risk</div>
            </div>
          )}
        </div>

        {/* Employment protection buffer — always shown when material (>10% extension) */}
        {temporal.protectionBuffer?.isMateriallyProtected && (
          <ProtectionBufferCard buffer={temporal.protectionBuffer} />
        )}

        {/* Legal protection window — shown for non-US jurisdictions with meaningful protection */}
        {temporal.legalTimeline && temporal.legalTimeline.estimatedProtectionDays.min > 14 && (
          <LegalTimelineCard legal={temporal.legalTimeline} />
        )}
      </div>
    </motion.div>
  );
};

// ── Protection Buffer Card ────────────────────────────────────────────────────
// Surfaces EMPLOYMENT_PROTECTION_INDEX-derived timeline extension in a single
// scannable card. Spec: "Legal protection buffer: Germany employment law extends
// your effective timeline by ~45% vs the global baseline."
// Shown for all jurisdictions with protectionIndex > 0.20 (material protection).
const ProtectionBufferCard: React.FC<{ buffer: ProtectionBufferResult }> = ({ buffer }) => {
  const pct = buffer.timelineExtensionPct;

  // Visual accent: green gradient for high protection, amber for moderate
  const isHighProtection = pct >= 40;
  const accentColor    = isHighProtection ? '#10b981' : '#f59e0b';
  const accentBg       = isHighProtection ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.06)';
  const accentBorder   = isHighProtection ? 'rgba(16,185,129,0.22)' : 'rgba(245,158,11,0.20)';
  const accentBadgeBg  = isHighProtection ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.14)';

  // Bar width proportional to protection (0–80% scale → 100% bar width at 48%)
  const barWidth = Math.min(100, Math.round(pct / 48 * 100));
  const usBarWidth = Math.round(6 / 48 * 100); // US 6% baseline marker

  return (
    <div className="mt-3 rounded-lg border overflow-hidden"
      style={{ borderColor: accentBorder, background: accentBg }}>

      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: accentBorder }}>
        <Shield className="w-3 h-3 flex-shrink-0" style={{ color: accentColor }} />
        <span className="text-[9.5px] font-black uppercase tracking-[0.14em]" style={{ color: accentColor }}>
          Legal Protection Buffer
        </span>
        <span className="ml-auto text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase"
          style={{ background: accentBadgeBg, color: accentColor, border: `1px solid ${accentBorder}` }}>
          ESTIMATED
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-2">
        {/* Spec-exact disclosure line */}
        <p className="text-[10.5px] font-semibold leading-snug" style={{ color: accentColor }}>
          {buffer.protectionNarrative}
        </p>

        {/* Visual: protection bar vs US baseline */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8.5px] text-white/40">
            <span>At-will baseline (US, 6%)</span>
            <span className="font-mono">{buffer.countryCode} · +{pct}%</span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--alpha-bg-06)' }}>
            {/* Full protection bar */}
            <div className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{ width: `${barWidth}%`, background: accentColor, opacity: 0.75 }} />
            {/* US baseline marker */}
            <div className="absolute inset-y-0 rounded-full"
              style={{ left: `${usBarWidth}%`, width: '2px', background: 'var(--alpha-text-35)' }} />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 font-mono">
            <span>0%</span>
            <span>+{pct}% timeline multiplier ×{buffer.timelineMultiplier.toFixed(2)}</span>
          </div>
        </div>

        {/* Key fact */}
        <div className="flex items-center gap-1.5 text-[8.5px] text-white/50">
          <span style={{ color: accentColor }}>›</span>
          <span>
            Employment protection index: <span className="font-mono text-white/70">{buffer.protectionIndex.toFixed(2)}</span>
            {' '}(scale 0.10 at-will → 0.80 France PSE)
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Legal Timeline Card ───────────────────────────────────────────────────────
// Surfaces country-specific employment protection law. Shows the legal runway
// between layoff announcement and last working day — a DIFFERENT signal from
// the risk calendar (which shows announcement timing).
const LegalTimelineCard: React.FC<{ legal: LegalTimelineResult }> = ({ legal }) => {
  const hasExtension = legal.extensionVsUSBaselineDays.min > 14;
  const minDays = legal.estimatedProtectionDays.min;
  const maxDays = legal.estimatedProtectionDays.max;
  const minWeeks = Math.round(minDays / 7);
  const maxWeeks = Math.round(maxDays / 7);

  return (
    <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/[0.04] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-blue-500/10">
        <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />
        <span className="text-[9.5px] font-black uppercase tracking-[0.14em] text-blue-300">
          Employment Protection — {legal.flagEmoji} {legal.countryName}
        </span>
        <span className="ml-auto text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase"
          style={{ background: 'rgba(99,179,237,0.12)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.25)' }}>
          {legal.labeledAs}
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-2">
        {/* Key number */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black text-blue-200">
            {minWeeks}–{maxWeeks} weeks
          </span>
          <span className="text-[10px] text-blue-300/70 font-medium">
            announcement → last working day
          </span>
        </div>

        {/* Regime badge */}
        <div className="text-[10px] text-blue-300/60 font-mono leading-tight">
          {legal.regime}
        </div>

        {/* Timeline components */}
        <div className="space-y-1">
          {legal.components.map((comp, i) => {
            const compMinWeeks = Math.round(comp.daysMin / 7);
            const compMaxWeeks = Math.round(comp.daysMax / 7);
            const barWidth = Math.min(100, (comp.daysMax / maxDays) * 100);
            return (
              <div key={i} className="text-[10px]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-blue-200/70 truncate max-w-[75%]">{comp.label}</span>
                  <span className="text-blue-300/80 font-mono flex-shrink-0 ml-1">
                    {compMinWeeks === compMaxWeeks ? `${compMinWeeks}w` : `${compMinWeeks}–${compMaxWeeks}w`}
                  </span>
                </div>
                <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,179,237,0.1)' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${barWidth}%`,
                    background: comp.isOptional
                      ? 'rgba(99,179,237,0.35)'
                      : 'rgba(99,179,237,0.65)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Extension vs US baseline */}
        {hasExtension && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="text-[10px] text-emerald-400/80 font-medium">
              +{Math.round(legal.extensionVsUSBaselineDays.min / 7)}–
              {Math.round(legal.extensionVsUSBaselineDays.max / 7)} weeks
            </div>
            <div className="text-[10px] text-blue-300/50">vs US at-will baseline</div>
          </div>
        )}

        {/* Government approval flag */}
        {legal.isGovernmentApprovalRequired && (
          <div className="flex items-start gap-1.5 pt-0.5 p-1.5 rounded"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-[8.5px] text-amber-300/80 leading-tight">
              Government approval required before dismissals — adds uncertainty to the timeline.
            </span>
          </div>
        )}

        {/* Mandatory social plan flag */}
        {legal.hasMandatorySocialPlan && (
          <div className="text-[8.5px] text-emerald-400/70">
            ✓ Mandatory social plan (Sozialplan / PSE equivalent) — contains severance formula &amp; outplacement obligations
          </div>
        )}

        {/* Worker actions */}
        {legal.workerActions.length > 0 && (
          <div className="pt-1 border-t border-blue-500/10">
            <div className="text-[10px] text-blue-300/60 font-bold uppercase tracking-wide mb-1">
              Use this window to
            </div>
            <ul className="space-y-0.5">
              {legal.workerActions.slice(0, 3).map((action, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-blue-400/60 flex-shrink-0 mt-0.5">›</span>
                  <span className="text-[8.5px] text-blue-200/65 leading-tight">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Job Market Liquidity Panel ────────────────────────────────────────────────
// Shows re-employment velocity: "If laid off today, X months to comparable role."

const JobMarketLiquidityPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const liq = (result as any).jobMarketLiquidity as JobMarketLiquidityResult | undefined;
  if (!liq) return null;

  const tierColors = {
    Fast:       '#10b981',
    Moderate:   '#f59e0b',
    Slow:       '#f97316',
    'Very Slow':'#ef4444',
  } as Record<string, string>;
  const color = tierColors[liq.tier] ?? '#94a3b8';
  const trendIcon = liq.marketDemandTrend === 'rising'
    ? <TrendingUp className="w-3 h-3" />
    : liq.marketDemandTrend === 'falling'
    ? <TrendingDown className="w-3 h-3" />
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: `${color}25`, background: `${color}06` }}
    >
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b" style={{ borderColor: `${color}20` }}>
        <Briefcase className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color }}>
          Job Market Liquidity
        </span>
        <span className="ml-auto text-[10px] font-mono opacity-40 uppercase tracking-wider">if laid off today</span>
      </div>

      <div className="p-4">
        {/* Hero metric row */}
        <div className="flex items-end gap-4 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Re-employment Score</div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tabular-nums" style={{ color }}>{liq.score}</span>
              <span className="text-xs font-mono text-muted-foreground opacity-50">/100</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-bold" style={{ color }}>{liq.tier}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
                {liq.tier === 'Fast' ? '< 2 mo' : liq.tier === 'Moderate' ? '2–5 mo' : liq.tier === 'Slow' ? '5–9 mo' : '9+ mo'}
              </span>
            </div>
          </div>

          <div className="flex-1 pb-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Median Time-to-Offer</div>
            <div className="text-xl font-black" style={{ color }}>
              {liq.monthsToReemploy < 1
                ? `~${Math.round(liq.monthsToReemploy * 4)} weeks`
                : liq.monthsToReemploy === 1
                ? '~1 month'
                : `~${liq.monthsToReemploy} months`}
            </div>
            <div className="text-[10px] text-muted-foreground opacity-60 flex items-center gap-1">
              {trendIcon}
              <span>Market demand: {liq.marketDemandTrend}</span>
            </div>
          </div>

          <div className="pb-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Salary Preservation</div>
            <div className="text-xl font-black" style={{ color: liq.salaryPreservation >= 75 ? 'var(--emerald)' : 'var(--amber)' }}>
              {liq.salaryPreservation}%
            </div>
            <div className="text-[10px] text-muted-foreground opacity-60">comp preserved</div>
          </div>
        </div>

        {/* Key barriers and accelerators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-red-400/70 mb-1.5">Top Barriers</div>
            <div className="space-y-1">
              {liq.keyBarriers.slice(0, 2).map((b, i) => (
                <div key={i} className="text-[10px] text-muted-foreground leading-snug flex gap-1.5 items-start">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">▲</span>
                  <span className="line-clamp-2">{b.split(' — ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1.5">Top Accelerators</div>
            <div className="space-y-1">
              {liq.keyAccelerators.slice(0, 2).map((a, i) => (
                <div key={i} className="text-[10px] text-muted-foreground leading-snug flex gap-1.5 items-start">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">▼</span>
                  <span className="line-clamp-2">{a.split(' — ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {liq.confidenceNote && (
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] text-[10px] font-mono text-muted-foreground opacity-40 leading-relaxed">
            {liq.confidenceNote}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Escape Paths Panel ────────────────────────────────────────────────────────
// Shows top-3 career moves that maximally reduce the user's risk score.

const EscapePathsPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const report = (result as any).escapePaths as EscapePathReport | undefined;
  if (!report || report.paths.length === 0) return null;

  const effortColors = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
  const scoreColor = getScoreColor(result.total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--alpha-bg-08)', background: 'var(--alpha-bg-04)' }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/[0.07]">
        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: scoreColor }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: scoreColor }}>
          Escape Path Optimizer
        </span>
        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}25` }}>
          {result.total} → ~{report.bestCaseScore}
        </span>
        <span className="ml-auto text-[10px] font-mono opacity-40 uppercase tracking-wider">
          top {report.paths.length} moves
        </span>
      </div>

      {/* Analyst note */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">{report.analystNote}</p>
      </div>

      {/* Path cards */}
      <div className="px-4 pb-4 space-y-2">
        {report.paths.map((path, idx) => {
          const isOpen = expanded === path.id;
          const effortColor = effortColors[path.effort] ?? 'var(--text-3)';
          const isBest = idx === 0;
          const isQuick = path.id === report.quickestWin?.id;
          return (
            <div key={path.id}
              className="rounded-xl border overflow-hidden transition-colors"
              style={{
                borderColor: isBest ? `${scoreColor}30` : 'var(--alpha-bg-06)',
                background: isBest ? `${scoreColor}07` : 'var(--alpha-bg-04)',
              }}
            >
              {/* Path header — always visible */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : path.id)}
                className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
                  style={{ background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}30` }}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-xs font-bold text-foreground leading-tight">{path.title}</span>
                    {isBest && (
                      <span className="text-[10px] px-1 py-0.5 rounded font-black uppercase"
                        style={{ background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}25` }}>
                        Highest Impact
                      </span>
                    )}
                    {isQuick && !isBest && (
                      <span className="text-[10px] px-1 py-0.5 rounded font-black uppercase"
                        style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,0.25)' }}>
                        Quickest Win
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--emerald)' }}>
                      −{path.estimatedScoreDrop} pts
                    </span>
                    <span className="text-[10px] text-muted-foreground">{path.timeToImpact}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${effortColor}12`, color: effortColor, border: `1px solid ${effortColor}22` }}>
                      {path.effort} effort
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className="w-3.5 h-3.5 flex-shrink-0 mt-1 transition-transform"
                  style={{ color: 'var(--text-3)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-3 pb-3 border-t border-white/[0.05]">
                  <div className="pt-3 space-y-3">
                    {/* Rationale */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{path.rationale}</p>

                    {/* Step-by-step actions */}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Action Steps</div>
                      <div className="space-y-2">
                        {path.steps.map((step, si) => (
                          <div key={si} className="flex gap-2.5 items-start">
                            <span className="text-[10px] font-black font-mono flex-shrink-0 mt-0.5 w-4 text-center rounded"
                              style={{ color: scoreColor, background: `${scoreColor}15` }}>
                              {si + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{step.action}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-muted-foreground opacity-50">{step.timeframe}</span>
                                <span className="text-[10px] font-bold"
                                  style={{ color: effortColors[step.effort] ?? 'var(--text-3)' }}>
                                  {step.effort}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Target profile */}
                    <div className="text-[10px] font-mono text-muted-foreground opacity-50 leading-relaxed pt-1 border-t border-white/[0.05]">
                      Target: {path.targetProfile}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ── v10.0 Panels ─────────────────────────────────────────────────────────────

// Score Sensitivity Panel — "What single change moves my score the most?"
const ScoreSensitivityPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const sensitivity = (result as any).scoreSensitivity;
  if (!sensitivity || !sensitivity.levers || sensitivity.levers.length === 0) return null;
  if (!sensitivity.highestImpactLever) return null;
  const top3 = sensitivity.levers.slice(0, 3);
  const scoreColor = getScoreColor(result.total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--alpha-bg-08)', background: 'var(--alpha-bg-04)' }}
    >
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/[0.07]">
        <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: scoreColor }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: scoreColor }}>
          Score Leverage Analysis
        </span>
        <span className="ml-auto text-[10px] font-mono opacity-40 uppercase tracking-wider">
          if 25pt improvement
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-3 opacity-70">
          {sensitivity.keySensitivityInsight}
        </p>
        <div className="space-y-2">
          {top3.map((lever: any, idx: number) => {
            const barWidth = Math.min(100, (lever.scoreDropIfImproved / (top3[0].scoreDropIfImproved || 1)) * 100);
            const feasibilityColor = lever.feasibility === 'immediate' ? '#10b981'
              : lever.feasibility === 'short_term' ? '#f59e0b'
              : '#64748b';
            return (
              <div key={lever.dimension} className="rounded-lg border border-white/[0.06] p-2.5 bg-white/[0.01]">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black font-mono px-1 py-0.5 rounded"
                      style={{ background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}25` }}>
                      {lever.dimension}
                    </span>
                    <span className="text-[11px] font-semibold text-foreground">{lever.dimensionLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--emerald)' }}>
                      −{lever.scoreDropIfImproved}pts
                    </span>
                    <span className="text-[10px] px-1 py-0.5 rounded" style={{ color: feasibilityColor, background: `${feasibilityColor}12`, border: `1px solid ${feasibilityColor}22` }}>
                      {lever.actionTimeframe}
                    </span>
                  </div>
                </div>
                {/* Impact bar */}
                <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: idx === 0 ? scoreColor : `${scoreColor}60` }} />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{lever.fastestAction}</p>
              </div>
            );
          })}
        </div>
        {/* Best scenario projections */}
        <div className="mt-3 pt-3 border-t border-white/[0.05] grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: '1 lever', score: sensitivity.bestSingleLeverScore },
            { label: '2 levers', score: sensitivity.bestTwoLeverScore },
            { label: '3 levers', score: sensitivity.bestThreeLeverScore },
          ].map(item => (
            <div key={item.label} className="text-center rounded-lg bg-white/[0.02] border border-white/[0.05] p-2">
              <div className="text-xs font-bold" style={{ color: getScoreColor(item.score) }}>{item.score}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Department Risk Panel — "Is my department more or less exposed?"
const DepartmentRiskPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const deptRisk = (result as any).departmentRisk;
  if (!deptRisk || deptRisk.resolvedCategory === 'unknown') return null;

  const riskScore = deptRisk.D9ScoreDisplay;
  // Raw hex required for hex-alpha backgrounds/borders
  const riskColor = riskScore >= 70 ? '#ef4444'
    : riskScore >= 50 ? '#f59e0b'
    : riskScore >= 30 ? '#94a3b8'
    : '#10b981';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: `${riskColor}25`, background: `${riskColor}04` }}
    >
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/[0.07]">
        <Briefcase className="w-3.5 h-3.5 flex-shrink-0" style={{ color: riskColor }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: riskColor }}>
          Department Exposure
        </span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}25` }}>
          {deptRisk.riskLabel}
        </span>
        <span className="ml-auto font-mono text-xs font-bold" style={{ color: riskColor }}>
          {riskScore}/100
        </span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-muted-foreground leading-relaxed">{deptRisk.comparedToCompanyAverage}.</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{deptRisk.departmentInsight}</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed opacity-70">{deptRisk.historicalCutRate}</p>
        {deptRisk.exposureFactors.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-red-400/70 mb-1">Exposure Factors</div>
            {deptRisk.exposureFactors.slice(0, 2).map((f: string, i: number) => (
              <div key={i} className="text-[10px] text-muted-foreground flex gap-1.5 items-start mb-0.5">
                <span className="text-red-400 mt-0.5">▲</span><span>{f}</span>
              </div>
            ))}
          </div>
        )}
        {deptRisk.protectionFactors.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1">Protection Factors</div>
            {deptRisk.protectionFactors.slice(0, 2).map((f: string, i: number) => (
              <div key={i} className="text-[10px] text-muted-foreground flex gap-1.5 items-start mb-0.5">
                <span className="text-emerald-400 mt-0.5">▼</span><span>{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Survival Probability Panel ────────────────────────────────────────────────
// Converts abstract score to calibrated layoff probability (actuarial model).

const SurvivalProbabilityPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const sp = (result as any).survivalProbability;
  if (!sp) return null;

  const pct12m = Math.round(sp.probability12m * 100);
  const pct6m  = Math.round(sp.probability6m * 100);
  const pct1m  = Math.round(sp.probability1m * 100);

  const tierColors: Record<string, string> = {
    CRITICAL: '#ef4444', HIGH: '#f97316', ELEVATED: '#f59e0b',
    MODERATE: '#00d4e0', LOW: '#10b981', MINIMAL: '#6ee7b7',
  };
  const color = tierColors[sp.riskTier] ?? '#94a3b8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: `${color}28`, background: `${color}05` }}
    >
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/[0.07]">
        <Activity className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color }}>
          Layoff Probability Model
        </span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
          {sp.riskTier}
        </span>
        <span className="ml-auto text-[10px] font-mono opacity-40">grounded · 4,200+ events</span>
      </div>

      {/* Probability bars */}
      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {[
            { label: '1-Month', value: pct1m },
            { label: '6-Month', value: pct6m },
            { label: '12-Month', value: pct12m },
          ].map((item, i) => (
            <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
              <div className="text-xl font-black tracking-tight" style={{ color }}>{item.value}%</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{item.label} probability</div>
              {/* Mini progress bar */}
              <div className="mt-2 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{sp.probabilityNarrative}</p>

        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.07]">
            <span className="text-muted-foreground">Framed as:</span>{' '}
            <span className="font-semibold text-foreground">{sp.framedAs1InX}</span>
          </span>
          <span className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.07]">
            <span className="text-muted-foreground">Risk vs. workforce:</span>{' '}
            {sp.workforceRiskPercentile >= 60
              ? <span className="font-semibold" style={{ color }}>Top {100 - sp.workforceRiskPercentile}% most at-risk</span>
              : <span className="font-semibold text-emerald-400">Below-average risk ({sp.workforceRiskPercentile}th pct)</span>
            }
          </span>
          <span className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.07]">
            <span className="text-muted-foreground">If no action (12m):</span>{' '}
            <span className="font-semibold text-red-400">{Math.round(sp.inactionProbability12m * 100)}%</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ── Signal Contradiction Panel ────────────────────────────────────────────────
// Shows trust-calibrated interpretation when signals conflict.

const SignalContradictionPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const [expanded, setExpanded] = React.useState(false);
  const report = (result as any).signalContradictions;
  if (!report || report.totalContradictions === 0) return null;

  const trustColors: Record<string, string> = {
    HIGH: '#10b981', MEDIUM: '#f59e0b', LOW: '#f97316', VERY_LOW: '#ef4444',
  };
  const color = trustColors[report.overallTrustLevel] ?? '#f59e0b';
  const severityColors: Record<string, string> = {
    low: '#94a3b8', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: `${color}28`, background: `${color}04` }}
    >
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/[0.07]">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color }}>
          Signal Contradictions
        </span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
          {report.totalContradictions} detected
        </span>
        {report.hasMaterialUncertainty && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)' }}>
            ±{report.netUncertaintyPoints}pt uncertainty
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono opacity-40">trust: {report.overallTrustLevel}</span>
      </div>

      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{report.trustSummary}</p>

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 hover:opacity-100 transition-opacity"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {expanded ? 'Hide' : 'Show'} contradiction details
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {report.contradictions.map((c: any, i: number) => {
              const sc = severityColors[c.severity] ?? '#94a3b8';
              return (
                <div key={i} className="rounded-lg border border-white/[0.07] p-3 bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: `${sc}15`, color: sc, border: `1px solid ${sc}25` }}>
                      {c.severity}
                    </span>
                    <span className="text-[10px] font-semibold text-foreground">{c.type.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 line-clamp-3">{c.explanation}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <div className="text-[10px]">
                      <span className="text-emerald-400 font-bold">+ </span>
                      <span className="text-muted-foreground">{c.positiveSignal}</span>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-red-400 font-bold">− </span>
                      <span className="text-muted-foreground">{c.negativeSignal}</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold" style={{ color: sc }}>{c.userGuidance}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Hiring Signal Panel ───────────────────────────────────────────────────────
// Shows hiring velocity pattern and predictive implications.

const HiringSignalPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const hs = (result as any).hiringSignal;
  if (!hs || hs.riskPattern === 'NO_SIGNAL') return null;

  const riskColors: Record<string, string> = {
    CRITICAL: '#ef4444', HIGH: '#f97316', ELEVATED: '#f59e0b',
    MODERATE: '#00d4e0', LOW: '#10b981', POSITIVE: '#6ee7b7',
  };
  const color = riskColors[hs.riskLevel] ?? '#94a3b8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: `${color}28`, background: `${color}04` }}
    >
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/[0.07]">
        <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color }}>
          Hiring Signal Analysis
        </span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
          {hs.riskPattern.replace(/_/g, ' ')}
        </span>
        {hs.estimatedAnnouncementDays && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
            ~{hs.estimatedAnnouncementDays}d to announcement
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono opacity-40 capitalize">{hs.overallTrend}</span>
      </div>

      <div className="px-4 pt-3 pb-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3 line-clamp-4">{hs.interpretation}</p>

        {hs.userDeptIsFrozen && (
          <div className="mb-3 p-2.5 rounded-lg border border-red-500/25 bg-red-500/7 text-[10px] text-red-300 font-semibold">
            ⚠ Your department shows a hiring freeze — direct and personal risk signal
          </div>
        )}

        {hs.frozenDepartments.length > 0 && !hs.userDeptIsFrozen && (
          <div className="mb-3 text-[10px] text-muted-foreground">
            <span className="font-semibold text-amber-400">Frozen departments:</span>{' '}
            {hs.frozenDepartments.join(', ')}
          </div>
        )}

        {hs.actions.length > 0 && (
          <div className="space-y-1.5">
            {hs.actions.map((a: string, i: number) => (
              <div key={i} className="flex gap-2 items-start text-[10px] text-muted-foreground leading-snug">
                <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color }} />
                {a}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Career Resilience Panel ───────────────────────────────────────────────────
// Composite resilience across 5 pillars — orthogonal to risk score.

const CareerResiliencePanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const [expanded, setExpanded] = React.useState(false);
  const resilience = (result as any).careerResilience;
  if (!resilience) return null;

  const classColors: Record<string, string> = {
    FORTRESS: '#10b981', RESILIENT: '#00d4e0', ADEQUATE: '#f59e0b',
    FRAGILE: '#f97316', CRITICAL: '#ef4444',
  };
  const color = classColors[resilience.classification] ?? '#94a3b8';
  const statusColors: Record<string, string> = {
    STRONG: '#10b981', ADEQUATE: '#00d4e0', WEAK: '#f59e0b', CRITICAL: '#ef4444',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: `${color}28`, background: `${color}04` }}
    >
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/[0.07]">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color }}>
          Career Resilience Score
        </span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
          {resilience.compositeScore}/100 — {resilience.classification}
        </span>
        <span className="ml-auto text-[10px] font-mono opacity-40">{resilience.effectiveProtectionMonths}mo protection</span>
      </div>

      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
          {resilience.riskResilienceInterpretation}
        </p>

        {/* 5-pillar scores */}
        <div className="space-y-2 mb-3">
          {resilience.pillars.map((p: any, i: number) => {
            const pc = statusColors[p.status] ?? '#94a3b8';
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] w-28 flex-shrink-0 text-muted-foreground truncate">{p.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p.score}%` }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.06 }}
                    className="h-full rounded-full"
                    style={{ background: pc }}
                  />
                </div>
                <span className="text-[10px] font-bold w-8 text-right flex-shrink-0" style={{ color: pc }}>
                  {p.score}
                </span>
              </div>
            );
          })}
        </div>

        {/* Key insight row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2">
            <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Weakest Pillar</div>
            <div className="text-[10px] font-bold text-foreground">{resilience.criticalWeakness.name}</div>
            <div className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{resilience.criticalWeakness.topAction}</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2">
            <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-1">Strongest Pillar</div>
            <div className="text-[10px] font-bold text-foreground">{resilience.keyStrength.name}</div>
            <div className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{resilience.keyStrength.insight}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 hover:opacity-100 transition-opacity"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {expanded ? 'Hide' : 'Show'} improvement plan
        </button>

        {expanded && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Top 3 Resilience Actions</div>
            {resilience.resilienceImprovementPlan.map((action: string, i: number) => (
              <div key={i} className="flex gap-2 items-start text-[10px] text-muted-foreground leading-snug p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <span className="flex-shrink-0 font-black" style={{ color }}>{i + 1}</span>
                {action}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Exit Timing Panel ─────────────────────────────────────────────────────────
// Optimal proactive exit calendar — answers "WHEN is the best month to leave?"

const ExitTimingPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const [expanded, setExpanded] = React.useState(false);
  const et = (result as any).exitTiming;
  // Only show for elevated+ risk or golden handcuff scenarios
  if (!et || (result.total < 45 && !et.isGoldenHandcuffZone)) return null;

  const optimalColor = '#00d4e0';
  const worstColor = '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: 'rgba(0,212,224,0.22)', background: 'rgba(0,212,224,0.03)' }}
    >
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/[0.07]">
        <Briefcase className="w-3.5 h-3.5 flex-shrink-0" style={{ color: optimalColor }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: optimalColor }}>
          Exit Timing Optimizer
        </span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: 'rgba(0,212,224,0.12)', color: optimalColor, border: '1px solid rgba(0,212,224,0.22)' }}>
          Optimal: {et.optimalDepartureWindow.months[0]}
        </span>
        {et.isGoldenHandcuffZone && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/12 text-amber-400 border border-amber-500/22">
            Golden handcuff
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono opacity-40">
          {et.monthsUntilOptimalWindow === 0 ? 'now optimal' : `${et.monthsUntilOptimalWindow}mo away`}
        </span>
      </div>

      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{et.recommendation}</p>

        {/* 12-month mini calendar heatmap */}
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">12-Month Exit Calendar</div>
          <div className="flex gap-1 flex-wrap">
            {et.calendar.map((m: any, i: number) => {
              const cellColor = m.isOptimalWindow ? optimalColor
                : m.isHighRisk ? '#ef4444'
                : m.compositeScore >= 65 ? '#10b981'
                : m.compositeScore >= 45 ? '#f59e0b'
                : '#94a3b8';
              const shortMonth = m.month.split(' ')[0].slice(0, 3);
              return (
                <div
                  key={i}
                  title={`${m.month}: ${m.compositeScore}/100${m.notes.length ? '\n' + m.notes.join('\n') : ''}`}
                  style={{
                    background: `${cellColor}${m.isOptimalWindow ? '28' : '15'}`,
                    border: `1px solid ${cellColor}${m.isOptimalWindow ? '50' : '25'}`,
                    color: cellColor,
                  }}
                  className="rounded text-[10px] font-bold px-1.5 py-1 cursor-default"
                >
                  {shortMonth}
                </div>
              );
            })}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2 text-center">
            <div className="text-xs font-bold" style={{ color: optimalColor }}>
              {et.optimalDepartureWindow.compositeScore}/100
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Optimal window score</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2 text-center">
            <div className="text-xs font-bold text-amber-400">
              {et.unvestedIfImmediateExit > 0 ? `$${(et.unvestedIfImmediateExit / 1000).toFixed(0)}K` : 'N/A'}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Unvested if exit now</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2 text-center">
            <div className="text-xs font-bold" style={{ color: '#10b981' }}>
              {et.unvestedAtOptimalExit > 0 ? `$${(et.unvestedAtOptimalExit / 1000).toFixed(0)}K` : 'N/A'}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Unvested at optimal exit</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 hover:opacity-100 transition-opacity"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {expanded ? 'Hide' : 'Show'} staying risk analysis
        </button>

        {expanded && (
          <div className="mt-3 p-3 rounded-lg border border-white/[0.07] bg-white/[0.02]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Staying Risk Penalty</div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{et.stayingRiskPenalty}</p>
            {et.worstDepartureMonths.length > 0 && (
              <div className="mt-2 text-[10px]">
                <span className="text-red-400 font-semibold">Avoid departing in:</span>{' '}
                <span className="text-muted-foreground">{et.worstDepartureMonths.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Financial Runway Panel — "Given my savings, what's the optimal strategy?"
const FinancialRunwayPanel: React.FC<{ result: HybridResult }> = ({ result }) => {
  const [expanded, setExpanded] = React.useState(false);
  const runway = (result as any).financialRunway;
  const isDefaultRunway = !((result as any).financialRunwayMonths > 0); // true when user didn't provide runway
  if (!runway) return null;

  // Raw hex required — CSS variables can't be combined with hex-alpha suffixes
  const tierColors: Record<string, string> = {
    critical:    '#ef4444',
    elevated:    '#f97316',
    comfortable: '#00d4e0',
    strong:      '#10b981',
  };
  const color = tierColors[runway.tier] ?? '#94a3b8';
  const riskColor = getScoreColor(runway.runwayRiskScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: `${color}28`, background: `${color}04` }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/[0.07]">
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color }}>
          Financial Runway Strategy
        </span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
          {runway.tierLabel}
        </span>
        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: `${riskColor}12`, color: riskColor, border: `1px solid ${riskColor}22` }}>
          Combined risk: {runway.runwayRiskScore}/100
        </span>
      </div>

      {/* Core insight */}
      <div className="px-4 pt-3 pb-2">
        {isDefaultRunway && (
          <p className="text-[10px] font-mono text-muted-foreground opacity-50 mb-2 leading-relaxed">
            Runway not provided — using 6-month industry default. Analysis adjusts when you specify your actual savings buffer.
          </p>
        )}

        {/* MENA end-of-service gratuity breakdown — only when gratuity materially applies */}
        {runway.gratuityNarrative && runway.gratuityMonths > 0 && (
          <div
            className="rounded-lg px-3 py-2.5 mb-3"
            style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.20)' }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.30)' }}
              >
                MODELED
              </span>
              <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>
                End-of-Service Gratuity Included
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>
              {runway.gratuityNarrative}
            </p>
            {runway.savedRunwayMonths != null && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-45)' }}>
                  Savings: {runway.savedRunwayMonths}mo
                </span>
                <span className="text-[10px]" style={{ color: 'var(--alpha-text-30)' }}>+</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  Gratuity: {runway.gratuityMonths.toFixed(1)}mo
                </span>
                <span className="text-[10px]" style={{ color: 'var(--alpha-text-30)' }}>=</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>
                  Effective: {runway.runwayMonths.toFixed(1)}mo
                </span>
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{runway.keyInsight}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2 text-center">
            <div className="text-xs font-bold" style={{ color }}>{runway.safeSearchMonths}mo</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Safe search window</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2 text-center">
            <div className="text-xs font-bold capitalize" style={{ color: runway.salaryNegotiationLeverage === 'high' ? 'var(--emerald)' : runway.salaryNegotiationLeverage === 'medium' ? 'var(--amber)' : 'var(--red)' }}>
              {runway.salaryNegotiationLeverage}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Negotiating leverage</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2 text-center">
            <div className="text-[10px] font-bold leading-tight" style={{ color }}>{runway.strategyLabel}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Recommended strategy</div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed opacity-80 mb-2">{runway.strategyRationale}</p>
        <p className="text-[10px] font-semibold" style={{ color }}>{runway.effectiveSearchDeadline}.</p>
      </div>

      {/* Expandable: optimal move sequence */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
          {expanded ? 'Hide' : 'Show'} optimal move sequence ({runway.optimalSequence.length} steps)
        </span>
        <ChevronRight className={`w-3.5 h-3.5 opacity-40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 pt-2">
          {runway.optimalSequence.map((step: any) => {
            const priorityColor = step.priority === 'must_do' ? 'var(--red)'
              : step.priority === 'should_do' ? 'var(--amber)'
              : 'var(--text-3)';
            return (
              <div key={step.step} className="flex gap-2.5 items-start rounded-lg border border-white/[0.06] p-2.5 bg-white/[0.01]">
                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
                  style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                  {step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1 py-0.5 rounded"
                      style={{ background: `${priorityColor}12`, color: priorityColor, border: `1px solid ${priorityColor}22` }}>
                      {step.priority.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-muted-foreground opacity-60">{step.timeframe}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{step.action}</p>
                </div>
              </div>
            );
          })}
          {/* Feasibility note for infeasible paths */}
          {runway.pathConstraints?.filter((c: any) => !c.isFeasible).length > 0 && (
            <div className="mt-2 p-2.5 rounded-lg border border-red-500/20 bg-red-500/5">
              <div className="text-[10px] uppercase tracking-wider text-red-400/70 mb-1">Runway Constraints</div>
              {runway.pathConstraints.filter((c: any) => !c.isFeasible).map((c: any, i: number) => (
                <p key={i} className="text-[10px] text-muted-foreground leading-relaxed mb-0.5">
                  <span className="text-red-400 font-bold">{c.pathType.replace(/_/g, ' ')}:</span> {c.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────

export interface OverviewTabProps extends TabProps {}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  result,
  companyData,
  onDownload,
  onRecalculate,
}) => {
  const isMobile = useAdaptiveSystem().width < 768;

  // Guard: if the engine returned NaN/null for any reason, clamp to a safe
  // neutral value rather than rendering "NaN%" or crashing on downstream math.
  const safeTotal = (typeof result.total === 'number' && isFinite(result.total))
    ? Math.max(0, Math.min(100, result.total))
    : 50;
  const safeResult = safeTotal !== result.total ? { ...result, total: safeTotal } : result;

  // Guard: ensure recommendations is always an array for .map() / .filter() calls
  if (!Array.isArray(safeResult.recommendations)) {
    (safeResult as any).recommendations = [];
  }

  const scoreColor = getScoreColor(safeResult.total);
  const [feedbackSent, setFeedbackSent] = useState<'correct' | 'incorrect' | null>(null);

  const handleFeedback = (outcome: 'correct' | 'incorrect') => {
    if (feedbackSent) return;
    setFeedbackSent(outcome);
    submitPredictionFeedback({
      companyName: result.companyName,
      roleKey: result.workTypeKey,
      engineScore: result.total,
      swarmScore: result.total,
      outcome,
    });
  };

  // Phase-aware urgency: apply collapse stage multiplier to base timeline
  const collapseStage = (safeResult.collapseStage ?? null) as CollapseStage;
  const phaseUrgency = useMemo(
    () => computePhaseAwareUrgency(safeResult.total, collapseStage),
    [safeResult.total, collapseStage],
  );

  // Load financial context — passed to Stage3EmergencyProtocol to adapt its content
  const financialCtxForStage3 = useMemo(() => loadFinancialContext(), []);
  const financialProfileForStage3 = useMemo(
    () => financialCtxForStage3 ? deriveFinancialProfile(financialCtxForStage3, safeResult.total) : null,
    [financialCtxForStage3, safeResult.total],
  );

  // Score delta attribution for returning users.
  // currentSnapshot mirrors what recordScore() persists — this is the curr side
  // of the prev/curr comparison in explainDimensionDelta(). Without it, all
  // three spec-required dimensions (L1 stock, L2 recency, L3 AI signal) fall
  // back to generic text because the function cannot compare actual field values.
  const scoreDelta = useMemo(() => {
    const bd = result.breakdown as any;
    const currentSnapshot = companyData ? {
      stock90DayChange:  companyData.stock90DayChange  ?? null,
      revenueGrowthYoY:  companyData.revenueGrowthYoY  ?? null,
      layoffRounds:      companyData.layoffRounds      ?? 0,
      lastLayoffPercent: companyData.lastLayoffPercent ?? null,
      lastLayoffDate:    companyData.layoffsLast24Months?.[0]?.date ?? null,
      aiInvestmentSignal: companyData.aiInvestmentSignal ?? 'medium',
      employeeCount:     companyData.employeeCount,
      revenuePerEmployee: companyData.revenuePerEmployee,
    } : undefined;
    return getAttributedDelta(
      result.workTypeKey,
      result.total,
      { L1: bd.L1, L2: bd.L2, L3: bd.L3, L4: bd.L4, L5: bd.L5, D6: bd.D6, D7: bd.D7 },
      result.experience,
      result.countryKey,
      result.companyName,
      currentSnapshot,
    );
  }, [result, companyData]);

  // v7.0 Fix 2 + 5: Score velocity and return type for contextual display
  const scoreVelocity = useMemo(
    () => computeScoreVelocity(result.workTypeKey, result.total, result.experience ?? '5-10', result.countryKey ?? 'usa'),
    [result.workTypeKey, result.total, result.experience, result.countryKey],
  );
  const returnType = useMemo(
    () => getUserReturnType(result.workTypeKey, result.total, result.experience ?? '5-10', result.countryKey ?? 'usa'),
    [result.workTypeKey, result.total, result.experience, result.countryKey],
  );

  // v7.0 Fix 5: Compute specific calendar date for re-cut window
  const timingData = result.timing;
  const recutCalendarDate = useMemo((): string | null => {
    if (!timingData?.daysUntilWindow || timingData.daysUntilWindow <= 0) return null;
    if (timingData.daysUntilWindow > 120) return null; // only show when within 4 months
    const target = new Date(Date.now() + timingData.daysUntilWindow * 86_400_000);
    return target.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [timingData]);

  // v7.0 Fix 6: ±uncertainty display threshold
  const ciRange = result.confidenceInterval.high - result.confidenceInterval.low;
  const showUncertainty = ciRange > 20 && ciRange <= 50; // only when meaningful but not gate-triggering

  const inactionScenario = useMemo(() => buildInactionScenario(result), [result]);
  const quickActions = useMemo(() => buildQuickActions(result), [result]);

  // Peer percentile — replaces vague tier context with actual rank
  // Start with research estimate; upgrade to live Supabase data if available.
  const [peerPercentile, setPeerPercentile] = useState<PeerPercentileResult>(
    () => computePeerPercentile(result.total, result.workTypeKey, companyData?.industry),
  );
  useEffect(() => {
    getLivePeerPercentile(result.total, result.workTypeKey, companyData?.industry)
      .then(live => setPeerPercentile(live))
      .catch(() => {/* keep research estimate */});
  }, [result.total, result.workTypeKey, companyData?.industry]);

  const tierContext = useMemo(() => {
    const p = peerPercentile.percentile;
    const role = result.workTypeKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const qualifier = peerPercentile.isResearchEstimate ? 'est.' : 'verified';
    return `${formatPercentile(p)} percentile among ${role} professionals (n≈${peerPercentile.sampleSize.toLocaleString()} ${qualifier})`;
  }, [peerPercentile, result.workTypeKey]);

  // Inaction cost — derived from the same trajectory model used in SalaryAtRiskPanel.
  //
  // The "cost of inaction" is the cumulative income gap between the no-action path
  // and the full-transition path over 36 months, computed by trapezoid integration
  // using the canonical getTrajParams() function from SalaryAtRiskPanel.
  //
  // IMPORTANT: This panel previously maintained a separate hardcoded copy of the
  // noActionMultiplierM36 values (0.38 / 0.55 / 0.72 / 0.85). These have been
  // replaced with getTrajParams() to ensure both panels always use the same
  // empirically-grounded parameters. The old values cited "McKinsey 2021 Fig 5"
  // which was an incorrect source — see SalaryAtRiskPanel.tsx header for the
  // correction and proper citations [AER-2020, BLS-2024, ROW-2024, WEF-2025].
  //
  // Updated values: critical 0.52 (was 0.38), high 0.62 (was 0.55),
  //                 elevated 0.72 (unchanged), moderate 0.85 (unchanged).
  const inactionCostData = useMemo(() => {
    const DEFAULT_ANNUAL_INR = 1200000; // ₹12 LPA — disclosed when used as assumption
    try {
      const ctx = loadFinancialContext();
      const annualBase = ctx?.currentAnnualIncome ?? DEFAULT_ANNUAL_INR;
      const isAssumed = !ctx?.currentAnnualIncome;
      const monthly = Math.round(annualBase / 12);

      // Use the canonical getTrajParams() so this panel and SalaryAtRiskPanel
      // always stay in sync — no duplicated constants to drift.
      const p = getTrajParams(result.total);
      const noActionM36  = p.noActionMultiplierM36;
      const stableMonths = p.stableMonths;
      const fullM36      = p.transitionRecoveryM36;
      const fullDipFrac  = p.transitionDipFraction;
      const fullDipMonth = p.transitionDipMonth;
      const fullM24      = p.transitionRecoveryM24;

      // Trapezoid integration — 3-month intervals, same as SalaryAtRiskPanel
      let noActionTotal = 0;
      let fullTotal = 0;
      for (let m = 0; m <= 36; m += 3) {
        const weight = (m === 0 || m === 36) ? 1.5 : 3; // trapezoid weights × interval

        // No-action path
        const noA = m <= stableMonths
          ? monthly
          : monthly * (1 - (1 - noActionM36) * ((m - stableMonths) / (36 - stableMonths)));
        noActionTotal += noA * weight;

        // Full-transition path
        let full: number;
        if (m <= fullDipMonth) {
          full = monthly * (1 - (1 - fullDipFrac) * (m / fullDipMonth));
        } else if (m <= 24) {
          const rp = (m - fullDipMonth) / (24 - fullDipMonth);
          full = monthly * (fullDipFrac + (fullM24 - fullDipFrac) * rp);
        } else {
          const lp = (m - 24) / 12;
          full = monthly * (fullM24 + (fullM36 - fullM24) * lp);
        }
        fullTotal += full * weight;
      }

      // Income gap: acting (full path) outperforms inaction over 36 months
      const cost = Math.round(Math.max(0, fullTotal - noActionTotal));

      return { cost, annualBase, isAssumed };
    } catch { return null; }
  }, [result.total]);
  const inactionCostINR = inactionCostData?.cost ?? null;

  const quickStats = useMemo(() => [
    { label: 'Confidence', value: `${result.confidencePercent}%`, icon: ShieldCheck, hint: `Score reliable within ±${Math.round((result.confidenceInterval.high - result.confidenceInterval.low) / 2)} pts` },
    { label: 'Live Signals', value: result.signalQuality.liveSignals, icon: Activity, hint: `${result.signalQuality.heuristicSignals} heuristic signals also used` },
    { label: 'Data Age', value: `${result.dataFreshness.ageInDays}d`, icon: Clock, hint: result.dataFreshness.stalenessWarning ?? 'Data freshness within acceptable range' },
    { label: 'Overrides', value: result.consensusSnapshot?.overridesApplied.length || 0, icon: AlertTriangle, hint: 'Kill-switch safety overrides applied during scoring' },
  ], [result]);

  // Conflict-widened CI disclosure — shown inline near the score so the penalty
  // is visible to users who never open the Transparency tab.
  const conflictSummary = useMemo(() => {
    const conflicts = result.signalQuality.conflictingSignals ?? [];
    const highCount  = conflicts.filter(c => c.severity === 'high' || c.severity === 'critical').length;
    const medCount   = conflicts.filter(c => c.severity === 'medium').length;
    const total      = conflicts.length;
    const halfRange  = Math.round((result.confidenceInterval.high - result.confidenceInterval.low) / 2);
    const parts: string[] = [];
    if (highCount > 0) parts.push(`${highCount} High-severity`);
    if (medCount   > 0) parts.push(`${medCount} Medium-severity`);
    const label = total > 0
      ? `${parts.join(', ')} signal conflict${total !== 1 ? 's' : ''}`
      : '';
    return { total, highCount, medCount, label, halfRange };
  }, [result.signalQuality.conflictingSignals, result.confidenceInterval]);

  // Controls the inaction cost methodology note (hover on desktop, tap on mobile)
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // Minimum data quality threshold — the score is not safe to present as a
  // specific number when the confidence interval is wider than 50 points.
  // A score of 58 with CI [8, 108] (clamped to [8, 100]) is meaningless:
  // it could be anywhere from "Very Low Risk" to "High Risk" — the headline
  // number gives false precision. Show an explicit "insufficient data" state
  // rather than a number that implies accuracy the system cannot guarantee.
  //
  // Conditions for refusing to show score:
  // 1. CI range > 50 pts (score could span 5 tiers)
  // 2. confidencePercent < 20 (system itself says "don't trust this")
  // Both are additive — either condition alone triggers the gate.
  // NOTE: ciRange is defined above (v7.0 Fix 6) — used here and in showUncertainty.
  const scoreIsUnreliable = ciRange > 50 || result.confidencePercent < 20;

  return (
    <section aria-labelledby="overview-heading" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* v17.0: Emergency mode header — pulsing banner when score ≥ 80 */}
        <EmergencyModeHeader
          score={safeResult.total}
          onScrollToProtocol={() => {
            document.getElementById('emergency-protocol-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />

        {/* v6.0 Audit Fix: Null-data false precision warning.
            When both stock and revenue are null, L1 defaults to 0.5 — not a real signal.
            The score is still displayed but with explicit L1 null disclosure. */}
        {companyData?.revenueGrowthYoY == null && companyData?.stock90DayChange == null && !companyData?.source?.includes('Fallback') && (
          <div className="mb-4 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-200">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs opacity-80">
                <span className="font-semibold text-blue-300">Financial signals missing</span> — revenue growth and stock data are unavailable for this company.
                The financial health dimension (L1) uses a neutral default of 0.5.
                The score shown reflects role and sector risk more than company-specific financial health.
              </p>
            </div>
          </div>
        )}

        {/* [AUDIT FIX]: Renamed from "30 swarm agents" to "heuristic analysis modules" —
            accurate description of what these modules actually are (rule-based TypeScript,
            not independent AI agents). Also shows a prominent warning when the analysis
            layer is offline. */}
        {((result as any).swarmReport?.anomalies?.includes('All agents failed') ||
          ((result as any).swarmReport?.totalAgentsRun === 0 &&
           (result as any).swarmReport?.liveAgentsUsed === 0 &&
           (result as any).swarmReport !== undefined)) && (
          <div className="mb-4 p-3 rounded-xl border border-amber-500/25 bg-amber-500/6 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300 leading-snug">
                Heuristic analysis modules offline — score uses deterministic formula only.
              </p>
              <p className="text-[10px] text-amber-300/60 mt-1 leading-relaxed">
                The secondary analysis pipeline (scenario archetype, action recommendations, career path enrichment) could not run.
                Your risk score is unaffected — it is computed by the deterministic engine, not the analysis modules.
                Narrative sections may show generic defaults. Check the Transparency tab for details.
              </p>
            </div>
          </div>
        )}

        {/* Unknown company warning */}
        {companyData?.source?.includes('Fallback') && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-400">Limited Company Intelligence</h4>
                <p className="text-sm opacity-80 mt-1">
                  "{result.companyName}" was not found in our database. Score reflects role and sector risk only — not employer-specific signals. Accuracy bounds are ±25–30 pts. AI narrative has been replaced with honest scope framing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Quality Banner */}
        {result && (
          <DataQualityBanner
            freshnessReport={{ avgSignalAge: result.dataFreshness.ageInDays, oldestSignalAge: result.dataFreshness.ageInDays,
              // Denominator: total = live + heuristic (actual sum, not a hardcoded 17)
              percentLive: (result.signalQuality.liveSignals + result.signalQuality.heuristicSignals) > 0
                ? result.signalQuality.liveSignals / (result.signalQuality.liveSignals + result.signalQuality.heuristicSignals)
                : 0,
              percentHeuristic: (result.signalQuality.liveSignals + result.signalQuality.heuristicSignals) > 0
                ? result.signalQuality.heuristicSignals / (result.signalQuality.liveSignals + result.signalQuality.heuristicSignals)
                : 1,
            }}
            confidencePercent={result.confidencePercent}
            confidenceInterval={{ low: result.confidenceInterval.low, high: result.confidenceInterval.high }}
            hasConflicts={result.signalQuality.hasConflicts}
            conflictCount={result.signalQuality.conflictingSignals.length}
            primarySource={(result.consensusSnapshot?.primarySource as 'live' | 'db' | 'hybrid') || 'db'}
            overridesApplied={result.consensusSnapshot?.overridesApplied || []}
          />
        )}

        {/* Score Delta Explainer — only shown for returning users */}
        {scoreDelta && Math.abs(scoreDelta.delta) >= 1 && (
          <div className="mb-6">
            <ScoreDeltaExplainer
              delta={scoreDelta}
              companyName={result.companyName}
              daysAgo={scoreDelta.daysAgo}
            />
          </div>
        )}

        {/* Score Ring + Verdict — or Insufficient Data gate */}
        {scoreIsUnreliable ? (
          /* Minimum data quality threshold: CI > 50 pts or confidence < 20%.
             A number in this range would span 5 tiers and give false precision.
             Show an explicit "insufficient data" state rather than a misleading score. */
          <div className="mt-6 rounded-xl border border-white/15 bg-white/3 p-6 text-center">
            <div className="text-4xl mb-3 opacity-30">—</div>
            <div className="text-sm font-bold mb-2">Insufficient data for a reliable score</div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
              The confidence interval for this audit is ±{Math.round(ciRange / 2)} points
              ({result.confidencePercent}% confidence). A score in this range could span from
              {' '}<strong>Very Low Risk</strong> to <strong>High Risk</strong> — showing a
              specific number would be misleading. Add company financial data or try again
              when live signals are available.
            </p>
            <div className="mt-4 text-[10px] font-mono text-muted-foreground opacity-50">
              CI: [{result.confidenceInterval.low}, {result.confidenceInterval.high}] · {result.confidencePercent}% confidence
            </div>
          </div>
        ) : (
          <>
          {/* v20.0 Full-bleed score hero — ambient glow matches risk color */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 'var(--radius-xl)',
              padding: isMobile ? 'var(--space-6) var(--space-5)' : 'var(--space-10) var(--space-8)',
              background: 'var(--elevation-1)',
              border: '1px solid var(--alpha-bg-08)',
              boxShadow: 'var(--shadow-elev-2)',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '220px 1fr',
              gap: isMobile ? 'var(--space-6)' : 'var(--space-8)',
              alignItems: 'center',
              marginTop: 'var(--space-2)',
            }}
          >
            {/* Color-matched radial backdrop — lights ring from behind */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse 60% 80% at 15% 50%, ${scoreColor}12 0%, transparent 60%)`,
            }} />

            {/* Score ring — centered in its column */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <ScoreRing
                score={safeResult.total}
                color={scoreColor}
                size={isMobile ? 150 : 215}
                isMobile={isMobile}
                velocityPtsPerMonth={(result as any).scoreTrajectory?.velocityPtsPerMonth ?? null}
              />
              {/* ±N badge — shown when CI range is 20-50 pts (meaningful uncertainty, not gate-triggering) */}
              {showUncertainty && (
                <div
                  title={`Confidence interval: ${result.confidenceInterval.low}–${result.confidenceInterval.high}. This score could reasonably be ±${Math.round(ciRange / 2)} points.`}
                  style={{
                    position: 'absolute', bottom: 6, right: 6,
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)',
                    borderRadius: 6, padding: '2px 7px',
                    fontSize: '0.65rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                    color: 'var(--amber)', cursor: 'help', lineHeight: 1.4,
                  }}
                >
                  ±{Math.round(ciRange / 2)}
                </div>
              )}
            </div>

            {/* Verdict + Timeline meta */}
            <div style={{ position: 'relative', textAlign: isMobile ? 'center' : 'left', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <VerdictBadge score={result.total} />

              {/* v7.0 Fix 2: Score velocity badge — only shown for returning users with measurable velocity */}
              {scoreVelocity && returnType !== 'first_time' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700,
                    background: scoreVelocity.direction === 'accelerating'
                      ? 'rgba(239,68,68,0.12)' : scoreVelocity.direction === 'improving'
                        ? 'rgba(16,185,129,0.12)' : 'var(--alpha-bg-06)',
                    border: scoreVelocity.direction === 'accelerating'
                      ? '1px solid rgba(239,68,68,0.30)' : scoreVelocity.direction === 'improving'
                        ? '1px solid rgba(16,185,129,0.30)' : '1px solid var(--alpha-bg-08)',
                    color: scoreVelocity.direction === 'accelerating'
                      ? 'var(--red)' : scoreVelocity.direction === 'improving'
                        ? 'var(--emerald)' : 'var(--text-3)',
                  }}>
                    {scoreVelocity.direction === 'accelerating' && '▲'}
                    {scoreVelocity.direction === 'improving'    && '▼'}
                    {scoreVelocity.direction === 'stable'       && '—'}
                    {' '}
                    {scoreVelocity.delta30d != null
                      ? `${scoreVelocity.delta30d > 0 ? '+' : ''}${scoreVelocity.delta30d} in 30d`
                      : `${(scoreVelocity.delta90d ?? 0) > 0 ? '+' : ''}${scoreVelocity.delta90d ?? 0} in 90d`}
                  </span>
                  {scoreVelocity.direction === 'accelerating' && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--red)', opacity: 0.8 }}>
                      Rising faster than typical — tighten timeline
                    </span>
                  )}
                </div>
              )}

              <TimelineCard score={result.total} phaseUrgency={phaseUrgency} collapseStage={collapseStage} />
              <div className="text-xs text-muted-foreground font-mono opacity-60">{tierContext}</div>
            </div>
          </motion.div>

          {/* v7.0 Fix 5: Specific calendar date timing banner — only when re-cut window is approaching */}
          {recutCalendarDate && timingData && (timingData.windowStatus === 'approaching-window' || timingData.windowStatus === 'in-window') && (
            <div style={{
              marginTop: 12,
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '10px 14px', borderRadius: 10,
              background: timingData.windowStatus === 'in-window'
                ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
              border: timingData.windowStatus === 'in-window'
                ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(245,158,11,0.25)',
            }}>
              <AlertTriangle style={{
                width: 14, height: 14, flexShrink: 0, marginTop: 2,
                color: timingData.windowStatus === 'in-window' ? 'var(--red)' : 'var(--amber)',
              }} />
              <div>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 800,
                  color: timingData.windowStatus === 'in-window' ? 'var(--red)' : 'var(--amber)',
                  marginBottom: 2,
                }}>
                  {timingData.windowStatus === 'in-window'
                    ? `Inside ${result.companyName ?? 'your company'}'s typical re-cut window now`
                    : `Re-cut window opens ~${recutCalendarDate} — ${timingData.daysUntilWindow} days away`}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  {timingData.verdict}{' '}
                  <span style={{ opacity: 0.6 }}>
                    This is the historical pattern, not a prediction. See Action Plan for timing-adjusted guidance.
                  </span>
                </div>
              </div>
            </div>
          )}
          </>
        )}

        {/* v16.0: WARN Signal — highest-priority ground-truth signal, shown prominently after score ring */}
        {(result as any).warnSignal && (
          <div className="mt-4">
            <WARNSignalPanel warnSignal={(result as any).warnSignal} />
          </div>
        )}

        {/* Conflict-widened confidence disclosure
            Shown when ≥1 active conflict widened the CI in the engine.
            Surfaces the mechanical effect (± pts) inline so users who never
            visit the Transparency tab still see that uncertainty was increased. */}
        {conflictSummary.total > 0 && !scoreIsUnreliable && (
          <div
            className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-2.5"
            role="status"
            aria-label="Confidence interval widened due to signal conflicts"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-semibold text-amber-300">
                Score {result.total} ± {conflictSummary.halfRange} pts
              </span>
              <span className="text-muted-foreground mx-1.5">—</span>
              <span className="text-amber-200/70">
                {conflictSummary.label} detected; uncertainty bounds widened accordingly.
              </span>
              <span className="ml-1 text-amber-400/60">
                See Transparency tab for details.
              </span>
            </p>
          </div>
        )}

        {/* Peer Percentile Panel */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/3 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Peer Benchmark
            </div>
            {/* Provenance label — always "research estimate" until real platform data
                accumulates. The title tooltip exposes the full dataSource string so
                users who inspect it get the honest provenance, without cluttering the
                headline with a long disclaimer. The transition trigger is ≥100 opted-in
                audits per role in the peer_benchmarks Supabase table. */}
            <div
              className="text-[10px] text-muted-foreground opacity-50 cursor-help"
              title={peerPercentile.dataSource}
            >
              n≈{peerPercentile.sampleSize.toLocaleString()} · {peerPercentile.isResearchEstimate ? 'research est.' : 'verified'}
            </div>
          </div>
          {/* Percentile bar */}
          <div className="relative h-3 bg-white/5 rounded-full overflow-hidden mb-3">
            {/* Distribution shading: green 0-33, amber 33-66, red 66-100 */}
            <div className="absolute inset-y-0 left-0 w-1/3 bg-emerald-500/20 rounded-l-full" />
            <div className="absolute inset-y-0 left-1/3 w-1/3 bg-amber-500/20" />
            <div className="absolute inset-y-0 left-2/3 w-1/3 bg-red-500/20 rounded-r-full" />
            {/* User marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white"
              style={{ left: `${Math.min(98, Math.max(2, peerPercentile.percentile))}%` }}
            />
            <div
              className="absolute -top-1 w-2 h-2 rounded-full bg-white border border-black/50"
              style={{ left: `calc(${Math.min(98, Math.max(2, peerPercentile.percentile))}% - 4px)` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Bottom 25%', value: `<${peerPercentile.p25Score}`, color: 'text-emerald-400' },
              { label: 'Median', value: String(peerPercentile.p50Score), color: 'text-amber-400' },
              { label: 'Top 25%', value: `>${peerPercentile.p75Score}`, color: 'text-orange-400' },
              { label: 'Top 10%', value: `>${peerPercentile.p90Score}`, color: 'text-red-400' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className={`text-xs font-bold ${item.color}`}>{item.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-bold" style={{ color: scoreColor }}>
              You: {formatPercentile(peerPercentile.percentile)} percentile.
            </span>{' '}
            {peerPercentile.rankDescription}
          </p>
          {/* Provenance footnote — shown when data is still research estimates.
              Disappears automatically once real platform data replaces the estimates. */}
          {peerPercentile.isResearchEstimate && (
            <p className="text-[10px] text-muted-foreground opacity-40 mt-2 leading-relaxed">
              Distribution based on industry research estimates, not platform audit data.
              Updates to real benchmarks when ≥100 opted-in audits accumulate per role.
            </p>
          )}
        </div>

        {/* Inaction Cost Banner — monetary quantification of risk */}
        {inactionCostINR !== null && result.total >= 45 && (
          <div className="mt-4 rounded-xl border p-4 flex items-start gap-3"
            style={{ borderColor: `${scoreColor}30`, background: `${scoreColor}08` }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: scoreColor }} />
            <div className="flex-1 min-w-0">
              {/* Title row with info icon */}
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-sm font-bold">
                  Modelled Income Gap: ₹{(inactionCostINR / 100000).toFixed(1)}L over 36 months
                </span>
                {/* Info button — hover on desktop, tap on mobile — reveals methodology note */}
                <button
                  type="button"
                  aria-label="Show methodology note"
                  aria-expanded={methodologyOpen}
                  aria-controls="inaction-methodology-note"
                  onMouseEnter={() => setMethodologyOpen(true)}
                  onMouseLeave={() => setMethodologyOpen(false)}
                  onClick={() => setMethodologyOpen(o => !o)}
                  className="inline-flex items-center justify-center rounded-full transition-colors"
                  style={{
                    width: 18, height: 18, flexShrink: 0,
                    background: methodologyOpen ? `${scoreColor}20` : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: methodologyOpen ? scoreColor : 'var(--text-3)',
                  }}
                >
                  <Info style={{ width: 12, height: 12 }} />
                </button>
              </div>

              {/* Methodology note — shown on hover (desktop) or tap (mobile) */}
              {methodologyOpen && (
                <div
                  id="inaction-methodology-note"
                  role="note"
                  className="mt-2 mb-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-[11px] leading-relaxed text-muted-foreground"
                >
                  <p className="font-semibold text-[var(--text-2)] mb-1.5 text-xs">
                    How this estimate is calculated:
                  </p>
                  <ol className="space-y-1 list-none pl-0 mb-2">
                    <li className="flex gap-2">
                      <span className="font-mono text-[10px] font-bold shrink-0 mt-0.5" style={{ color: scoreColor }}>①</span>
                      <span>Probability of displacement at this risk score</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-[10px] font-bold shrink-0 mt-0.5" style={{ color: scoreColor }}>②</span>
                      <span>× expected income decline during the transition period</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-[10px] font-bold shrink-0 mt-0.5" style={{ color: scoreColor }}>③</span>
                      <span>× average re-employment timeline for this role category</span>
                    </li>
                  </ol>
                  <p className="border-t border-white/10 pt-2">
                    This is a{' '}
                    <span className="font-semibold text-[var(--text-2)]">directional estimate, not a precise forecast.</span>
                    {' '}Actual income impact depends on market conditions, individual circumstances,
                    and actions taken.
                  </p>
                </div>
              )}

              {/* Assumed income disclosure */}
              {inactionCostData?.isAssumed && (
                <p className="text-[10px] text-muted-foreground mt-1 opacity-60 italic">
                  Based on assumed income of ₹{((inactionCostData.annualBase)/100000).toFixed(0)}L/yr (default).
                  {' '}Enter your actual salary in Financial Context for a precise figure.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6"><QuickStatsRow stats={quickStats} /></div>

        {/* ── Intelligence Upgrade v9.0 ──────────────────────────────────────── */}

        {/* v11.0: Survival Probability — actuarial layoff probability (shown near top for impact) */}
        <SurvivalProbabilityPanel result={result} />

        {/* Precision Brief — analyst summary: #1 driver, #1 protection, volatile signal */}
        <PrecisionBriefPanel result={result} />

        {/* v11.0: Signal Contradictions — trust calibration when signals conflict */}
        <SignalContradictionPanel result={result} />

        {/* v13.0: Emergency Protocol — 72-hour crisis plan (score ≥ 80 or collapse stage ≥ 2) */}
        {(result as any).emergencyResponse?.isActive && (
          <div id="emergency-protocol-section">
            <EmergencyProtocolPanel emergency={(result as any).emergencyResponse} />
          </div>
        )}

        {/* v17.0: Prediction Horizons — 30d/90d/180d risk with horizon-appropriate weights */}
        {(result as any).predictionHorizon && (
          <PredictionHorizonPanel
            predictionHorizon={(result as any).predictionHorizon}
            currentScore={safeResult.total}
          />
        )}

        {/* v13.0: Macro-Economic Risk — always shown; provides systemic context */}
        {(result as any).macroEconomicRisk && (
          <MacroRiskPanel macro={(result as any).macroEconomicRisk} />
        )}

        {/* v12.0: Manager Risk — direct manager/skip-level departure signal */}
        {(result as any).managerRisk && (result as any).managerRisk.patternType !== 'clean' && (
          <ManagerRiskCard managerRisk={(result as any).managerRisk} />
        )}

        {/* v12.0: Visa Risk — work authorization dependency (critical for H1B/L1/OPT) */}
        {(result as any).visaRisk?.shouldDisplay && (
          <VisaRiskPanel
            visaRisk={(result as any).visaRisk}
            countryCode={companyData?.region}
            tenureYears={(result as any).tenureYears}
          />
        )}

        {/* v12.0: What-If Simulator — replaces read-only ScoreSensitivityPanel */}
        <WhatIfSimulatorPanel result={result} />

        {/* Temporal Risk — calendar amplifier: earnings windows, seasonal patterns */}
        <TemporalRiskPanel result={result} />

        {/* v11.0: Hiring Signal — velocity pattern analysis and predictive implications */}
        <HiringSignalPanel result={result} />

        {/* Job Market Liquidity — re-employment velocity if laid off today */}
        <JobMarketLiquidityPanel result={result} />

        {/* v10.0: Department Risk — department-level exposure vs company average */}
        <DepartmentRiskPanel result={result} />

        {/* v11.0: Career Resilience — 5-pillar composite resilience score */}
        <CareerResiliencePanel result={result} />

        {/* ──────────────────────────────────────────────────────────────────── */}

        {/* Inaction Scenario */}
        {inactionScenario && <InactionPanel scenario={inactionScenario} score={result.total} />}

        {/* Stage 3 Emergency Protocol — replaces generic quick actions when crisis detected */}
        {collapseStage === 3 ? (
          <div className="mt-4">
            <Stage3EmergencyProtocol
              companyName={result.companyName ?? 'your company'}
              roleKey={result.workTypeKey}
              score={result.total}
              financialProfile={financialProfileForStage3}
            />
          </div>
        ) : (
          /* Quick Actions — shown when NOT in Stage 3 */
          <QuickActionsRow actions={quickActions} />
        )}

        {/* Escape Path Optimizer — top-3 moves to maximally reduce risk score */}
        <EscapePathsPanel result={result} />

        {/* v10.0: Financial Runway Strategy — runway-constrained personalized guidance */}
        <FinancialRunwayPanel result={result} />

        {/* v11.0: Exit Timing Optimizer — optimal proactive departure calendar */}
        <ExitTimingPanel result={result} />

        {/* Live-data degradation banner — surfaces when fewer than 2 real API signals were used.
            Threshold: liveSignals < 2 means stock, revenue, and hiring are all heuristics.
            The L1 null-weight redistribution warning and layoffs.fyi unavailability are
            also propagated here from signalQuality.missingDataFallbacks. */}
        {result.signalQuality.liveSignals < 2 && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">
                Score based on {result.signalQuality.liveSignals} live signal{result.signalQuality.liveSignals === 1 ? '' : 's'}
                {' '}— {result.signalQuality.heuristicSignals} heuristic fallback{result.signalQuality.heuristicSignals === 1 ? '' : 's'} used
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Stock return, revenue growth, or hiring data could not be fetched from live APIs.
                Accuracy is reduced — see missing signals below. The score may shift by ±4–8 pts
                when live data becomes available.
              </p>
              {result.signalQuality.missingDataFallbacks.filter(m => m.startsWith('⚠')).map((msg, i) => (
                <p key={i} className="text-[11px] text-amber-400/80 mt-1 leading-relaxed">{msg}</p>
              ))}
            </div>
          </div>
        )}

        {/* Conflict Disclosure */}
        {result.signalQuality.hasConflicts && (
          <div className="mt-6">
            <ConflictDisclosurePanel
              conflicts={result.signalQuality.conflictingSignals}
              overrides={result.consensusSnapshot?.overridesApplied || []}
              overallImpact={result.consensusSnapshot?.overridesApplied?.length ? 'score_increased' : 'reduced_confidence'}
            />
          </div>
        )}

        {/* Salary at Risk — conversion feature
            Wires user city + region-derived currency so the full-transition
            recovery trajectory applies the correct city premium for global users
            (SF +45%, NYC +38%, London +28%, Singapore +40%, Sydney +25%,
            Zurich +55%, Toronto +20%) instead of falling back to national median. */}
        {(() => {
          const region = (companyData?.region ?? 'IN').toUpperCase();
          // Resolve user city from geographicOptionality (computed from userFactors.city)
          // or fall back to company HQ region for national defaults.
          const userCity =
            (result as any).geographicOptionality?.relocationOptions?.originCityName
            ?? (result as any)._engineResult?.companyData?._userCity
            ?? (companyData as any)?._userCity
            ?? undefined;
          // Use stored currency preference; fall back to context inference, then USD.
          const currency: string =
            loadFinancialContext()?.currency
            ?? inferCurrencyFromContext(userCity, undefined);
          return (
            <div className="mt-8">
              <SalaryAtRiskPanel
                riskScore={result.total}
                roleKey={result.workTypeKey}
                companyName={result.companyName}
                currency={currency}
                collapseStage={collapseStage ?? undefined}
                cityKey={userCity}
              />
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 flex-wrap">
          {onDownload && (
            <button className="btn btn-primary btn-sm" style={{ minHeight: '44px' }} onClick={onDownload}>
              Download Full Dossier
            </button>
          )}
          {onRecalculate && (
            <button className="btn btn-secondary btn-sm" style={{ minHeight: '44px' }} onClick={onRecalculate}>
              Pulse New Audit
            </button>
          )}
        </div>

        {/* Prediction Feedback */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <p className="text-xs text-muted-foreground mb-3 opacity-60 uppercase tracking-widest font-mono">
            Was this prediction accurate for your situation?
          </p>
          {feedbackSent ? (
            <p className="text-xs text-emerald-400 font-mono">
              ✓ Thanks — your feedback recalibrates future predictions for this role category.
            </p>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => handleFeedback('correct')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors text-xs font-semibold">
                <ThumbsUp className="w-3.5 h-3.5" /> Yes, accurate
              </button>
              <button onClick={() => handleFeedback('incorrect')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 transition-colors text-xs font-semibold">
                <ThumbsDown className="w-3.5 h-3.5" /> Off the mark
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default OverviewTab;
