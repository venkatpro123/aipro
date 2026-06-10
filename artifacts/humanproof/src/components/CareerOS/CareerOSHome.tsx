// CareerOSHome.tsx — AI Career Command Center v2
// Monitor → Explain → Prioritize → Act
// 5 questions answered within 15 seconds:
//   1. Where am I?  2. Am I improving?  3. What changed?
//   4. What matters most?  5. What should I do next?

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLayoff } from "../../context/LayoffContext";
import { computeProfileCompleteness, completenessColor } from "../../services/profileCompletenessEngine";
import { fetchUserProfile } from "../../services/userProfileService";
import { getCareerMemorySummary } from "../../services/careerMemoryService";
import { useAuth } from "../../context/AuthContext";
import { MissionCard } from "./MissionCard";
import { CareerOSMemoryPanel } from "./CareerOSMemoryPanel";
import { CareerDecisionCard } from "./CareerDecisionCard";
import { ScoreExplainerPanel } from "../shared/ScoreExplainerPanel";
import { AdaptationVelocityBadge } from "./AdaptationVelocityBadge";
import { evaluateReEngagementTrigger } from "../../services/reEngagementService";
import { detectAdaptationTriggers, type AdaptationTrigger } from "../../services/adaptationTriggerService";
import { useAutopilotAlerts } from "../../hooks/useAutopilotAlerts";
import { syncTwinFromProfile } from "../../services/careerTwinService";
import { orchestrate } from "../../services/orchestration/signalOrchestrator";
import { getCohortOutcomeStats, tenureBandFromYears } from "../../services/cohortOutcomesAggregator";
import { getActionFeedbackBoosts } from "../../services/feedbackEngine";
import type { HybridResult, ActionPlanItem } from "../../types/hybridResult";
import type { PrimaryMove } from "../../services/orchestration/signalOrchestrator";
import type { UserProfile } from "../../services/userProfileService";

// ─── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Pure helpers ──────────────────────────────────────────────────────────────

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatLastUpdated(calcAt: string | null | undefined): string | null {
  if (!calcAt) return null;
  const ms = Date.now() - new Date(calcAt).getTime();
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor(ms / 60_000);
  if (d >= 2) return `${d} days ago`;
  if (d === 1) return "yesterday";
  if (h >= 1) return `${h}h ago`;
  if (m >= 2) return `${m}m ago`;
  return "just now";
}

// Derive 4 health dimensions + master score from HybridResult
function computeHealthModel(hr: HybridResult): {
  health: number; risk: number; readiness: number; opportunity: number; resilience: number;
  healthStatus: string; healthColor: string;
  trendDir: 'improving' | 'worsening' | 'stable'; trendDelta: number | null;
} {
  const risk = hr.total ?? 50;
  const readiness = ((hr.preparednessScore as any)?.total as number | undefined)
    ?? ((hr.preparednessScore as any)?.score as number | undefined)
    ?? Math.max(20, Math.round(92 - risk * 0.68));
  const resilience = ((hr.careerResilience as any)?.compositeScore as number | undefined)
    ?? ((hr.careerResilience as any)?.score as number | undefined)
    ?? Math.max(20, Math.round(88 - risk * 0.52));
  const escapeCount = Math.min((hr.escapePaths?.paths?.length ?? 0), 5);
  const internalScore = ((hr.internalMobility as any)?.viabilityScore as number | undefined) ?? 40;
  const marketIdx = ((hr.roleMarketDemand as any)?.demandIndex as number | undefined) ?? 50;
  const opportunity = Math.min(90, Math.max(10, Math.round(escapeCount * 8 + internalScore * 0.38 + marketIdx * 0.3)));

  const health = Math.round((100 - risk) * 0.35 + readiness * 0.30 + opportunity * 0.20 + resilience * 0.15);

  const healthStatus = health >= 72 ? 'Strong' : health >= 57 ? 'Good' : health >= 40 ? 'Needs Attention' : 'At Risk';
  const healthColor = health >= 72 ? '#10b981' : health >= 57 ? '#f59e0b' : health >= 40 ? '#f97316' : '#ef4444';

  const trendDir = hr.scoreDelta?.direction ?? 'stable';
  const trendDelta = hr.scoreDelta?.delta30d ?? null;

  return { health, risk, readiness, opportunity, resilience, healthStatus, healthColor, trendDir, trendDelta };
}

interface ToolRec { label: string; to: string; icon: string; reason: string; urgent: boolean; condition?: string }

function getDynamicTools(hr: HybridResult, triggers: AdaptationTrigger[]): ToolRec[] {
  const tools: ToolRec[] = [];
  const risk = hr.total ?? 50;
  const d1 = ((hr as any).breakdown?.D1 as number | undefined) ?? 0;
  const hiringFreeze = (hr as any).hiringSignalResult?.hiringFreezeDetected === true;
  const stealthSev = (hr as any)._stealthSignal?.severity as string | undefined;
  const marketTrend = (hr as any).marketDemand?.demandTrend as string | undefined;
  const hasPeerSurge = triggers.some(t => t.type === 'peer_surge');

  if (risk >= 45 || (stealthSev && stealthSev !== 'STABLE')) {
    tools.push({
      label: 'Layoff Defense', to: '/tools/layoff-defense', icon: '🛡️',
      condition: risk >= 65 ? `Risk score ${risk} — elevated` : stealthSev && stealthSev !== 'STABLE' ? 'Company headcount pressure signals' : undefined,
      reason: risk >= 65 ? 'Risk is elevated — activate your full defense protocol now' : 'Monitor company signals and prepare contingency plans',
      urgent: risk >= 65,
    });
  }
  if (d1 > 0.45) {
    tools.push({
      label: 'AI Defense Center', to: '/tools/ai-defense', icon: '🤖',
      condition: `AI displacement risk ${Math.round(d1 * 100)}%`,
      reason: `AI targets ${Math.round(d1 * 100)}% of your role's tasks — build leverage before it peaks`,
      urgent: d1 > 0.65,
    });
  }
  if (hiringFreeze || marketTrend === 'declining' || hasPeerSurge) {
    tools.push({
      label: 'Market Intelligence', to: '/tools/market-intel', icon: '📊',
      condition: hiringFreeze ? 'Hiring freeze detected in your sector' : hasPeerSurge ? 'Industry layoff wave active' : 'Market demand shift detected',
      reason: hiringFreeze ? 'Understand your options before demand recovers' : 'Demand shifts require a positioning adjustment',
      urgent: false,
    });
  }
  if (tools.length < 2) {
    tools.push({
      label: 'Career Strategy', to: '/tools/strategy', icon: '🗺️',
      reason: risk < 35 ? 'Strong position — plan your next career milestone now' : 'Map your escape paths and growth options',
      urgent: false,
    });
  }
  return tools.slice(0, 3);
}

function buildOfficerBullets(
  hr: HybridResult,
  companyName: string | null,
  roleTitle: string | null,
  adaptationTriggers: AdaptationTrigger[],
  reEngageBanner: { headline: string; subtext: string } | null,
): string[] {
  const lines: string[] = [];
  const companyLabel = companyName ?? 'Your company';
  const roleLabel = roleTitle ?? 'your role';

  const stealthSev = (hr as any)._stealthSignal?.severity as string | undefined;
  const collapseStage = ((hr as any).collapseStage?.stage as number | undefined) ?? 0;
  if (stealthSev === 'SILENT_PURGE' || collapseStage >= 3) {
    lines.push(`${companyLabel}: Active workforce reduction signals detected.`);
  } else if (stealthSev && stealthSev !== 'STABLE') {
    lines.push(`${companyLabel}: Headcount pressure building — monitoring closely.`);
  } else {
    const rounds = ((hr as any).layoffRoundsSummary?.totalRounds as number | undefined) ?? 0;
    lines.push(rounds > 0
      ? `${companyLabel}: ${rounds} layoff round${rounds > 1 ? 's' : ''} in history. No new signals this week.`
      : `${companyLabel}: No active workforce reduction signals.`);
  }

  const d1 = ((hr as any).breakdown?.D1 as number | undefined) ?? 0;
  const hiringFreeze = (hr as any).hiringSignalResult?.hiringFreezeDetected === true;
  const marketTrend = (hr as any).marketDemand?.demandTrend as string | undefined;
  if (hiringFreeze) {
    lines.push(`Hiring freeze in your sector — external moves are harder right now.`);
  } else if (d1 > 0.65) {
    lines.push(`AI automation targets ${Math.round(d1 * 100)}% of tasks in ${roleLabel}. Upskilling is your highest-leverage move.`);
  } else if (marketTrend === 'declining') {
    lines.push(`Demand for ${roleLabel} is declining. Transition readiness is your key asset.`);
  } else if (marketTrend === 'rising') {
    lines.push(`Demand for ${roleLabel} is rising — strong window to negotiate or move up.`);
  } else {
    lines.push(`Market conditions for ${roleLabel} are stable.`);
  }

  if (reEngageBanner) {
    lines.push(reEngageBanner.headline + (reEngageBanner.subtext ? ` ${reEngageBanner.subtext}` : ''));
  } else {
    const scoreDelta = hr.scoreDelta?.delta30d ?? null;
    if (scoreDelta != null && Math.abs(scoreDelta) >= 3) {
      const dir = scoreDelta < 0 ? 'decreased' : 'increased';
      lines.push(`Risk score ${dir} ${Math.abs(Math.round(scoreDelta))} pts since your last audit.`);
    } else if (adaptationTriggers.length > 0) {
      lines.push(adaptationTriggers[0].message);
    } else {
      lines.push(`No significant changes since your last audit.`);
    }
  }
  return lines.slice(0, 3);
}

function buildTwinIntelligence(hr: HybridResult): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [];

  const d1 = ((hr as any).breakdown?.D1 as number | undefined) ?? 0;
  const collapseStage = hr.collapseStage ?? null;
  if (d1 > 0.55) {
    items.push({ label: 'Watching', value: `AI displacement signal at ${Math.round(d1 * 100)}% intensity in your role` });
  } else if (collapseStage && collapseStage >= 2) {
    items.push({ label: 'Watching', value: `Company collapse indicators — Stage ${collapseStage} signals active` });
  } else {
    const company = hr.companyName ?? 'your company';
    items.push({ label: 'Watching', value: `${company} stability + ${hr.workTypeKey || 'role'} market demand` });
  }

  const p12 = ((hr.precisionSurvival as any)?.probabilities?.twelveMonth as number | undefined) ?? null;
  const scoreDelta = hr.scoreDelta?.delta30d ?? null;
  if (p12 != null) {
    items.push({ label: 'Predicts', value: `${Math.round((1 - p12) * 100)}% role stability over the next 12 months at current trajectory` });
  } else if (scoreDelta != null && Math.abs(scoreDelta) >= 3) {
    const dir = scoreDelta < 0 ? 'improving' : 'worsening';
    items.push({ label: 'Predicts', value: `Trajectory is ${dir} — ${Math.abs(Math.round(scoreDelta))} pt shift in 30 days` });
  } else {
    const readiness = Math.round(100 - (hr.total ?? 50));
    items.push({ label: 'Predicts', value: `Stable trajectory — readiness at ${readiness}, no critical signals` });
  }

  const topAction = (hr.actionItems ?? hr.recommendations)?.[0];
  if (topAction?.title) {
    const effort = topAction.effortBadge ? ` · ${topAction.effortBadge}` : '';
    items.push({ label: 'Recommends', value: `${topAction.title}${effort}` });
  } else {
    items.push({ label: 'Recommends', value: 'Complete your profile to unlock personalized recommendations' });
  }
  return items;
}

function extractNextStep(action: ActionPlanItem): string {
  const desc = (action.description ?? '').trim();
  const first = desc.split('.')[0].trim();
  if (first && first.length >= 8 && first.length <= 80) return first;
  const title = action.title ?? '';
  const verbs = ['Complete', 'Build', 'Learn', 'Write', 'Schedule', 'Update', 'Create', 'Prepare', 'Research', 'Apply'];
  if (verbs.some(v => title.startsWith(v))) return title;
  return title ? `Begin: ${title}` : 'Start your mission';
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <span style={{
        fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.27)",
        letterSpacing: "0.13em", textTransform: "uppercase" as const,
        whiteSpace: "nowrap" as const, fontFamily: "var(--font-mono, monospace)",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

// ─── Section 1: Career Health Indicator ───────────────────────────────────────

function CareerHealthIndicator({ hr }: { hr: HybridResult }) {
  const [showExplainer, setShowExplainer] = useState(false);
  const { health, risk, readiness, opportunity, resilience, healthStatus, healthColor, trendDir, trendDelta } = computeHealthModel(hr);

  const trendColor = trendDir === 'improving' ? '#10b981' : trendDir === 'worsening' ? '#ef4444' : 'rgba(255,255,255,0.38)';
  const trendLabel = trendDir === 'improving'
    ? `↑ improved ${Math.abs(Math.round(trendDelta ?? 0))} pts this month`
    : trendDir === 'worsening'
    ? `↓ declined ${Math.abs(Math.round(trendDelta ?? 0))} pts this month`
    : 'Stable this month';

  const dims = [
    { label: 'Risk', value: risk, invert: true },
    { label: 'Readiness', value: readiness, invert: false },
    { label: 'Opportunity', value: opportunity, invert: false },
    { label: 'Resilience', value: resilience, invert: false },
  ];

  const dimColor = (v: number, invert: boolean) => {
    const hi = invert ? v >= 65 : v < 35;
    const lo = invert ? v < 35 : v >= 65;
    return hi ? '#ef4444' : lo ? '#10b981' : '#f59e0b';
  };

  const dimDesc = (v: number, invert: boolean) => {
    if (invert) return v >= 65 ? 'High' : v >= 45 ? 'Moderate' : 'Low';
    return v >= 65 ? 'Strong' : v >= 45 ? 'Fair' : 'Low';
  };

  const biggestThreat = (hr.primaryRiskDriver ?? hr.tier?.advice ?? null);
  const topOpportunity = hr.escapePaths?.paths?.[0]?.title ?? hr.keyProtectiveFactor ?? null;

  return (
    <motion.div variants={itemVariants} style={{ marginBottom: 14 }}>
      <div style={{
        padding: '20px 22px', borderRadius: 14,
        background: `linear-gradient(135deg, ${healthColor}06 0%, rgba(255,255,255,0.01) 100%)`,
        border: `1px solid ${healthColor}1e`,
      }}>
        {/* Master score + threat/opportunity */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.27)', letterSpacing: '0.13em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)', marginBottom: 8 }}>
              CAREER HEALTH
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 800, color: healthColor, fontFamily: 'var(--font-display, inherit)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                {health}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono, monospace)' }}>/100</span>
              <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, color: healthColor, background: `${healthColor}14`, border: `1px solid ${healthColor}2e` }}>
                {healthStatus}
              </span>
              <button
                type="button"
                onClick={() => setShowExplainer(v => !v)}
                style={{
                  padding: '2px 9px', borderRadius: 6, fontSize: '0.67rem', fontWeight: 700,
                  background: showExplainer ? `${healthColor}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${showExplainer ? healthColor + '35' : 'rgba(255,255,255,0.1)'}`,
                  color: showExplainer ? healthColor : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {showExplainer ? 'Hide ▲' : 'Why? ▾'}
              </button>
            </div>
            <div style={{ marginTop: 7, fontSize: '0.71rem', color: trendColor, fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
              {trendLabel}
            </div>
          </div>

          {/* Biggest threat + top opportunity */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {biggestThreat && (
              <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)', maxWidth: 170 }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'rgba(239,68,68,0.65)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)', marginBottom: 4 }}>Biggest Threat</div>
                <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.4 }}>{biggestThreat.slice(0, 65)}{biggestThreat.length > 65 ? '…' : ''}</div>
              </div>
            )}
            {topOpportunity && (
              <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.14)', maxWidth: 170 }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'rgba(16,185,129,0.65)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)', marginBottom: 4 }}>Top Opportunity</div>
                <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.4 }}>{topOpportunity.slice(0, 65)}{topOpportunity.length > 65 ? '…' : ''}</div>
              </div>
            )}
          </div>
        </div>

        {/* 4-dimension grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {dims.map(dim => {
            const c = dimColor(dim.value, dim.invert);
            return (
              <div key={dim.label} style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.26)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)', marginBottom: 5 }}>
                  {dim.label}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1, marginBottom: 3 }}>
                  {dim.value}
                </div>
                <div style={{ fontSize: '0.61rem', color: 'rgba(255,255,255,0.26)', fontWeight: 600 }}>
                  {dimDesc(dim.value, dim.invert)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Score explainer — shown when "Why?" is toggled */}
        {showExplainer && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <ScoreExplainerPanel scoreResult={hr} accentColor={healthColor} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section 2: Active Monitoring Panel ───────────────────────────────────────

function ActiveMonitoringPanel({ hr }: { hr: HybridResult }) {
  const liveCount = hr.signalQuality.liveSignals + hr.signalQuality.heuristicSignals;
  const signalCount = liveCount > 0 ? liveCount : (hr.meta?.liveSignalCount ?? 200);
  const lastScan = formatLastUpdated(hr.calculatedAt) ?? 'recently';

  const criticalAlerts = (hr.collapseStage ?? 0) >= 2 ? 1 : 0;
  const newOpportunities = hr.escapePaths?.paths?.length ?? 0;

  const monitors = ['Company', 'Role', 'Market', 'AI', 'Compensation'];

  const stats = [
    { label: 'Last scan', value: lastScan, kind: 'neutral' },
    { label: 'Signals', value: signalCount.toString(), kind: 'neutral' },
    { label: 'Alerts', value: criticalAlerts.toString(), kind: criticalAlerts > 0 ? 'urgent' : 'neutral' },
    { label: 'Opportunities', value: newOpportunities.toString(), kind: newOpportunities > 0 ? 'positive' : 'neutral' },
  ] as const;

  return (
    <motion.div variants={itemVariants} style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px 18px', alignItems: 'center',
        padding: '9px 16px', borderRadius: 9,
        background: 'rgba(0,245,255,0.02)', border: '1px solid rgba(0,245,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)' }}>
            MONITORING
          </span>
        </div>
        <span style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono, monospace)' }}>
          {monitors.join(' · ')}
        </span>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {stats.map(stat => (
            <div key={stat.label} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono, monospace)' }}>{stat.label}:</span>
              <span style={{
                fontSize: '0.71rem', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)',
                color: stat.kind === 'urgent' ? '#ef4444' : stat.kind === 'positive' ? '#10b981' : 'rgba(255,255,255,0.52)',
              }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section 3: AI Career Officer Brief ───────────────────────────────────────

interface OfficerBriefProps {
  hr: HybridResult; companyName: string | null; roleTitle: string | null;
  adaptationTriggers: AdaptationTrigger[]; reEngageBanner: { headline: string; subtext: string } | null;
  onJumpToMission: () => void;
}

function AICareerOfficerBrief({ hr, companyName, roleTitle, adaptationTriggers, reEngageBanner, onJumpToMission }: OfficerBriefProps) {
  const riskScore = hr.total ?? 50;
  const status = riskScore >= 65 ? 'ACTION REQUIRED' : riskScore >= 50 ? 'ELEVATED' : riskScore >= 35 ? 'MONITOR' : 'STRONG';
  const statusColor = riskScore >= 65 ? '#ef4444' : riskScore >= 50 ? '#f97316' : riskScore >= 35 ? '#f59e0b' : '#10b981';
  const bullets = buildOfficerBullets(hr, companyName, roleTitle, adaptationTriggers, reEngageBanner);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div variants={itemVariants} style={{ marginBottom: 14 }}>
      <div style={{
        padding: '20px 22px', borderRadius: 12,
        background: `linear-gradient(135deg, ${statusColor}06 0%, rgba(255,255,255,0.01) 100%)`,
        border: `1px solid ${statusColor}1e`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.27)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)' }}>
              AI CAREER OFFICER
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 9px', borderRadius: 5,
              background: `${statusColor}16`, border: `1px solid ${statusColor}30`,
              fontSize: '0.6rem', fontWeight: 800, color: statusColor,
              letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)',
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: statusColor, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
              {status}
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono, monospace)' }}>
            {formatLastUpdated(hr.calculatedAt) ? `Updated ${formatLastUpdated(hr.calculatedAt)}` : ''}
          </span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>{greeting}.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {bullets.map((line, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ flexShrink: 0, marginTop: 7, width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.28)', display: 'inline-block' }} />
              <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>{line}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.3)' }}>Your highest-leverage action is ready below.</span>
          <button type="button" onClick={onJumpToMission} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: statusColor, color: riskScore < 35 ? '#000' : '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: '0.79rem', fontWeight: 700, cursor: 'pointer', transition: 'opacity 150ms' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
            See Mission <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section 4: What Changed ──────────────────────────────────────────────────

function WhatChangedStrip({ hr, adaptationTriggers }: { hr: HybridResult; adaptationTriggers: AdaptationTrigger[] }) {
  const changes: Array<{ label: string; kind: 'positive' | 'negative' | 'neutral' }> = [];

  const delta = hr.scoreDelta?.delta30d ?? null;
  if (delta != null && Math.abs(delta) >= 3) {
    changes.push({ label: delta > 0 ? `Risk +${Math.round(delta)} pts` : `Risk −${Math.abs(Math.round(delta))} pts`, kind: delta > 0 ? 'negative' : 'positive' });
  }
  const stealthSev = (hr as any)._stealthSignal?.severity as string | undefined;
  if (stealthSev && stealthSev !== 'STABLE') changes.push({ label: 'Company signals active', kind: 'negative' });
  const marketTrend = (hr as any).marketDemand?.demandTrend as string | undefined;
  if (marketTrend === 'declining') changes.push({ label: 'Market demand declining', kind: 'negative' });
  if (marketTrend === 'rising') changes.push({ label: 'Market demand rising', kind: 'positive' });
  if ((hr as any).hiringSignalResult?.hiringFreezeDetected === true) changes.push({ label: 'Hiring freeze active', kind: 'negative' });
  if (adaptationTriggers.some(t => t.type === 'peer_surge')) changes.push({ label: 'Industry layoffs detected', kind: 'negative' });

  return (
    <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14, padding: '8px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.26)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)', flexShrink: 0 }}>
        WHAT CHANGED
      </span>
      {changes.length === 0 ? (
        <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.28)' }}>No significant changes since your last audit.</span>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {changes.map((c, i) => (
            <span key={i} style={{
              padding: '2px 9px', borderRadius: 5, fontSize: '0.71rem', fontWeight: 600,
              background: c.kind === 'positive' ? 'rgba(16,185,129,0.1)' : c.kind === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${c.kind === 'positive' ? 'rgba(16,185,129,0.24)' : c.kind === 'negative' ? 'rgba(239,68,68,0.24)' : 'rgba(255,255,255,0.1)'}`,
              color: c.kind === 'positive' ? '#10b981' : c.kind === 'negative' ? '#ef4444' : 'rgba(255,255,255,0.48)',
            }}>
              {c.kind === 'positive' ? '↑ ' : c.kind === 'negative' ? '↓ ' : ''}{c.label}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Section 5: Micro Mission Card ────────────────────────────────────────────

interface MicroMissionProps {
  primaryMove: PrimaryMove; riskScore: number;
  peerBenchmark: { n: number; avgPtsGain: number } | null;
  onHelp: () => void; onSkip: () => void;
}

function MicroMissionCard({ primaryMove, riskScore, peerBenchmark, onHelp, onSkip }: MicroMissionProps) {
  const [expanded, setExpanded] = useState(false);
  const nextStep = extractNextStep(primaryMove.action);
  const effort = primaryMove.action.effortBadge ?? '~30 min';
  const impact = primaryMove.action.riskReductionPct ?? 4;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionLabel label="Active Mission" />
        {expanded && (
          <button type="button" onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.72rem', padding: '0 0 12px 0' }}>
            ↑ Collapse
          </button>
        )}
      </div>

      {!expanded ? (
        <motion.div variants={itemVariants}>
          <div style={{ padding: '18px 20px', borderRadius: 12, border: '1px solid rgba(0,245,255,0.16)', background: 'rgba(0,245,255,0.025)' }}>
            <div style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.32)', marginBottom: 7, fontFamily: 'var(--font-mono, monospace)' }}>
              Mission: "{primaryMove.moveLabel}"
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 12, lineHeight: 1.4 }}>
              Next step: {nextStep}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ padding: '2px 9px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.18)', color: 'var(--cyan)' }}>
                ⏱ {effort}
              </span>
              <span style={{ padding: '2px 9px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', color: '#10b981' }}>
                +{impact} pts health estimated
              </span>
              {peerBenchmark && peerBenchmark.n >= 5 && (
                <span style={{ padding: '2px 9px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.44)' }}>
                  {peerBenchmark.n} peers → avg +{peerBenchmark.avgPtsGain} pts
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setExpanded(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', transition: 'opacity 150ms' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                Start Now <ArrowRight size={13} />
              </button>
              <button type="button" onClick={() => setExpanded(true)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, padding: '9px 14px', cursor: 'pointer', transition: 'all 150ms' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.11)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}>
                See Full Mission
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <MissionCard primaryMove={primaryMove} riskScore={riskScore} peerBenchmark={peerBenchmark} onHelp={onHelp} onSkip={onSkip} />
      )}
    </div>
  );
}

// ─── Section 6: Condition-Driven Tool Recommendations ─────────────────────────

function DynamicToolRow({ hr, adaptationTriggers }: { hr: HybridResult; adaptationTriggers: AdaptationTrigger[] }) {
  const navigate = useNavigate();
  const tools = getDynamicTools(hr, adaptationTriggers);

  return (
    <motion.div variants={itemVariants} style={{ marginBottom: 20 }}>
      <SectionLabel label="Recommended For You" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tools.map(tool => (
          <button key={tool.to} type="button" onClick={() => navigate(tool.to)} style={{ display: 'flex', alignItems: 'flex-start', gap: 13, background: tool.urgent ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)', border: `1px solid ${tool.urgent ? 'rgba(239,68,68,0.17)' : 'var(--border)'}`, borderRadius: 10, padding: '13px 15px', cursor: 'pointer', transition: 'all 150ms', textAlign: 'left' as const, width: '100%' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,245,255,0.025)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = tool.urgent ? 'rgba(239,68,68,0.17)' : 'var(--border)'; (e.currentTarget as HTMLElement).style.background = tool.urgent ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)'; }}>
            <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{tool.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {tool.condition && (
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: tool.urgent ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.32)', letterSpacing: '0.08em', marginBottom: 3, fontFamily: 'var(--font-mono, monospace)' }}>
                  DETECTED: {tool.condition}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text)' }}>{tool.label}</span>
                {tool.urgent && <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#ef4444', padding: '1px 6px', background: 'rgba(239,68,68,0.11)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 4, letterSpacing: '0.06em', fontFamily: 'var(--font-mono, monospace)' }}>ACTION NEEDED</span>}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>{tool.reason}</div>
            </div>
            <ArrowRight size={13} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.24)', marginTop: 3 }} />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Section 7: Career Twin Intelligence ──────────────────────────────────────

function CareerTwinIntelligence({ hr, completenessScore }: { hr: HybridResult | null; completenessScore: number | null }) {
  const navigate = useNavigate();
  const score = completenessScore ?? 0;
  const color = completenessColor(score);

  return (
    <motion.div variants={itemVariants} style={{ marginBottom: 20 }}>
      <div style={{ padding: '18px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hr ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.27)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)' }}>CAREER TWIN</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color, fontFamily: 'var(--font-mono, monospace)' }}>{score}%</span>
            <span style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.26)' }}>confidence</span>
          </div>
          <button type="button" onClick={() => navigate('/tools/career-twin')} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'rgba(255,255,255,0.36)', fontSize: '0.71rem', fontWeight: 600, padding: '4px 10px', cursor: 'pointer', transition: 'all 150ms' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)'; (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.36)'; }}>
            View Twin <ArrowRight size={10} />
          </button>
        </div>
        {hr ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {buildTwinIntelligence(hr).map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: '0.63rem', fontWeight: 800, color: 'rgba(255,255,255,0.26)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)', flexShrink: 0, paddingTop: 1, minWidth: 85 }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.54)', lineHeight: 1.47 }}>{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', paddingTop: 10 }}>
            Run an audit to activate your Career Twin intelligence.
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── New user entry card ───────────────────────────────────────────────────────

function StartHereCard() {
  const navigate = useNavigate();
  return (
    <motion.div variants={itemVariants}>
      <div style={{ padding: '52px 36px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,245,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(0,245,255,0.17)', borderRadius: 16, marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 13px', borderRadius: 6, marginBottom: 22, background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.25)', fontSize: '0.62rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.12em', fontFamily: 'var(--font-mono, monospace)' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block', animation: 'pulse 1.8s ease-in-out infinite' }} />
          AI CAREER OFFICER · READY
        </div>
        <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 1.9rem)', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
          Your AI Career OS is standing by.
        </h2>
        <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.45)', margin: '0 auto 32px', maxWidth: 420, lineHeight: 1.65 }}>
          Run a 90-second audit. Your AI career officer will monitor your position 24/7 and tell you exactly what to do next — without asking you to read reports.
        </p>
        <button type="button" onClick={() => navigate('/terminal', { state: { newAudit: true } })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--cyan)', color: '#000', fontWeight: 800, fontSize: '0.95rem', padding: '14px 32px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'opacity 150ms' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
          Run Career Audit <ArrowRight size={16} />
        </button>
        <div style={{ marginTop: 22, fontSize: '0.7rem', color: 'rgba(255,255,255,0.17)', fontFamily: 'var(--font-mono, monospace)' }}>
          90 seconds · 5,208+ companies tracked · 412 role profiles
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CareerOSHome() {
  const { state } = useLayoff();
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasResult = state.scoreResult !== null;

  const [isAwaitingRestore, setIsAwaitingRestore] = useState(() => {
    if (hasResult) return false;
    try {
      const hasSession = !!sessionStorage.getItem('hp_last_score_session');
      if (hasSession) return false;
      return localStorage.getItem('hp_has_prior_audit') === '1';
    } catch { return false; }
  });
  useEffect(() => {
    if (hasResult) { setIsAwaitingRestore(false); return; }
    if (!isAwaitingRestore) return;
    const t = setTimeout(() => setIsAwaitingRestore(false), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResult]);

  const [reEngageBanner, setReEngageBanner] = useState<{ headline: string; subtext: string } | null>(null);
  const [completenessScore, setCompletenessScore] = useState<number | null>(null);
  const [adaptationTriggers, setAdaptationTriggers] = useState<AdaptationTrigger[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [peerBenchmark, setPeerBenchmark] = useState<{ n: number; avgPtsGain: number } | null>(null);
  const { unreadCount: autopilotUnreadCount } = useAutopilotAlerts();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([fetchUserProfile(), getCareerMemorySummary(user.id)]).then(([profile, summary]) => {
      if (cancelled) return;
      setUserProfile(profile);
      const { score } = computeProfileCompleteness(profile, summary, !!state.companyName && !!state.roleTitle);
      setCompletenessScore(score);
      const hr = state.scoreResult as HybridResult | null;
      if (profile && hr && hr.total != null) void syncTwinFromProfile(profile, hr);
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state.companyName, state.roleTitle, state.scoreResult]);

  useEffect(() => {
    if (!state.companyName || !state.scoreResult) return;
    const score = (state.scoreResult as any)?.total ?? null;
    if (score === null) return;
    try {
      const result = evaluateReEngagementTrigger(state.companyName, score);
      if (result && result.type !== 'none') setReEngageBanner({ headline: result.headline, subtext: result.subtext });
    } catch { /* offline */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.companyName]);

  useEffect(() => {
    if (!state.scoreResult) { setAdaptationTriggers([]); return; }
    const hr = state.scoreResult as HybridResult;
    const completedIds: string[] = [];
    try { const raw = sessionStorage.getItem('hp_completed_actions'); if (raw) completedIds.push(...JSON.parse(raw)); } catch { /* */ }
    setAdaptationTriggers(detectAdaptationTriggers(hr, completedIds, hr.calculatedAt ?? null, []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scoreResult]);

  const [feedbackBoosts, setFeedbackBoosts] = useState<Map<string, number>>(new Map());
  const [patternBoosts, setPatternBoosts] = useState<{ hasInaction: boolean; hasPlateauPattern: boolean }>({ hasInaction: false, hasPlateauPattern: false });
  useEffect(() => {
    if (!user?.id || !state.scoreResult) return;
    const hr = state.scoreResult as HybridResult;
    const actionIds = (hr.actionItems ?? hr.recommendations ?? []).map(r => r.id ?? (r as any).title).filter((id): id is string => typeof id === 'string');
    if (actionIds.length === 0) return;
    getActionFeedbackBoosts(user.id, actionIds).then(boosts => { if (boosts.size > 0) setFeedbackBoosts(boosts); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, state.scoreResult]);

  const orchestratedFeed = useMemo(() => {
    if (!state.scoreResult) return null;
    try { return orchestrate(state.scoreResult as HybridResult, undefined, userProfile, { feedbackBoosts, patternBoosts }); }
    catch { return null; }
  }, [state.scoreResult, userProfile, feedbackBoosts, patternBoosts]);

  const primaryMove = orchestratedFeed?.primaryMove ?? null;
  const primaryMoveActionId = primaryMove?.action.id ?? primaryMove?.action.title ?? null;

  useEffect(() => {
    if (!state.scoreResult || !primaryMoveActionId) return;
    const hr = state.scoreResult as HybridResult;
    const roleKey = (hr as any)?.roleKey ?? (hr as any)?.role ?? 'unknown';
    const band = tenureBandFromYears(userProfile?.yearsExperience ?? 5);
    getCohortOutcomeStats(roleKey, band, primaryMoveActionId)
      .then(stats => { if (stats && stats.count >= 5) setPeerBenchmark({ n: stats.count, avgPtsGain: Math.round(stats.avgRiskReduction) }); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryMoveActionId, userProfile?.yearsExperience]);

  const hr = state.scoreResult as HybridResult | null;
  const riskScore = hr?.total ?? 0;
  const readiness = 100 - riskScore;

  // Outcome-based navigation
  const outcomes = [
    { label: 'Reduce My Risk', path: '/tools/layoff-defense', newAudit: false },
    { label: 'Build AI Skills', path: '/tools/ai-defense', newAudit: false },
    { label: 'Explore Roles', path: '/tools/market-intel', newAudit: false },
    { label: 'Career Strategy', path: '/tools/strategy', newAudit: false },
    { label: 'New Audit', path: '/terminal', newAudit: true },
    { label: 'Monitor', path: '/monitor', newAudit: false, badge: autopilotUnreadCount },
  ] as const;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>

      {/* GPS Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ padding: "22px 0 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "clamp(1.3rem, 4vw, 1.8rem)", fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>HumanProof</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 6, background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.25)", fontSize: "0.66rem", fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.1em", fontFamily: "var(--font-mono, monospace)" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--cyan)", display: "inline-block", animation: "pulse 1.8s ease-in-out infinite", flexShrink: 0 }} />
              CAREER OS
            </div>
          </div>
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono, monospace)", alignSelf: "center" }}>{formatTodayDate()}</div>
        </div>
        {hasResult && hr && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: "3px 14px", fontSize: "0.7rem", fontFamily: "var(--font-mono, monospace)", alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.26)", fontWeight: 600 }}>YOU ARE</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{state.roleTitle ? `${state.roleTitle} ` : ''}{state.companyName ? `@ ${state.companyName}` : 'your current role'}</span>
            <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.26)", fontWeight: 600 }}>READINESS</span>
            <span style={{ fontWeight: 800, color: readiness >= 60 ? '#10b981' : readiness >= 40 ? '#f59e0b' : '#ef4444' }}>{readiness}</span>
            <AdaptationVelocityBadge scoreResult={hr} compact />
          </div>
        )}
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          COMMAND CENTER
      ══════════════════════════════════════════════════════ */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">

        {!hasResult ? (
          isAwaitingRestore ? (
            <motion.div variants={itemVariants}>
              <div style={{ padding: '44px 36px', textAlign: 'center', borderRadius: 16, background: 'rgba(0,245,255,0.02)', border: '1px solid rgba(0,245,255,0.07)', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div className="spinner" style={{ width: 26, height: 26 }} />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', fontFamily: 'var(--font-mono, monospace)' }}>Restoring your career audit…</span>
              </div>
            </motion.div>
          ) : (
            <StartHereCard />
          )
        ) : (
          <>
            {/* Partial restore banner: shown when score is restored from a legacy row
                (full_result = NULL in DB). Intelligence panels are empty; nudge re-audit. */}
            {hr && (hr as any)._isPartialRestore && (
              <div style={{
                marginBottom: 16, padding: '11px 16px', borderRadius: 10,
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 2 }}>
                      Score restored from your last audit
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                      Run a new audit to unlock full intelligence — action plan, escape paths, and sensitivity levers.
                    </div>
                  </div>
                </div>
                <a href="/terminal" style={{
                  padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                  color: '#f59e0b', textDecoration: 'none', cursor: 'pointer',
                }}>
                  Re-audit →
                </a>
              </div>
            )}

            {/* 0. Career Memory — SYSTEM REMEMBERS */}
            {hr && (
              <CareerOSMemoryPanel
                onPatternsDetected={(hasInaction, hasPlateau) =>
                  setPatternBoosts({ hasInaction, hasPlateauPattern: hasPlateau })
                }
              />
            )}

            {/* 0b. Decision Verdict — WHAT SHOULD I DO? (Phase 3: explicit stay/leave) */}
            {hr && <CareerDecisionCard hr={hr} />}

            {/* 1. Career Health Indicator — WHERE AM I? */}
            {hr && <CareerHealthIndicator hr={hr} />}

            {/* 2. Active Monitoring — SYSTEM IS ALIVE */}
            {hr && <ActiveMonitoringPanel hr={hr} />}

            {/* 3. AI Career Officer Brief — WHAT MATTERS MOST? */}
            {hr && (
              <AICareerOfficerBrief
                hr={hr} companyName={state.companyName} roleTitle={state.roleTitle}
                adaptationTriggers={adaptationTriggers} reEngageBanner={reEngageBanner}
                onJumpToMission={() => document.getElementById('active-mission')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
            )}

            {/* 4. What Changed — AM I IMPROVING? */}
            {hr && <WhatChangedStrip hr={hr} adaptationTriggers={adaptationTriggers} />}

            {/* 5. Mission — WHAT SHOULD I DO? */}
            <div id="active-mission">
              {primaryMove ? (
                <MicroMissionCard
                  primaryMove={primaryMove} riskScore={riskScore} peerBenchmark={peerBenchmark}
                  onHelp={() => navigate('/tools/strategy')} onSkip={() => navigate('/monitor')}
                />
              ) : (
                <motion.div variants={itemVariants} style={{ marginBottom: 22 }}>
                  <SectionLabel label="Active Mission" />
                  <div className="card-premium" style={{ padding: '24px 28px', textAlign: 'center', border: '1px solid rgba(0,245,255,0.14)', background: 'rgba(0,245,255,0.02)' }}>
                    <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>Computing your weekly mission…</div>
                    <button type="button" onClick={() => navigate('/terminal', { state: { newAudit: true } })} style={{ background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer' }}>Run New Audit →</button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* 6. Condition-Driven Tools — ACT */}
            {hr && <DynamicToolRow hr={hr} adaptationTriggers={adaptationTriggers} />}

            {/* 7. Career Twin Intelligence */}
            <CareerTwinIntelligence hr={hr} completenessScore={completenessScore} />
          </>
        )}

        {/* Outcome-based navigation */}
        <motion.div variants={itemVariants} style={{ marginTop: 20 }}>
          <SectionLabel label="I want to" />
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {outcomes.map(link => (
              <button
                key={link.path}
                type="button"
                onClick={() => navigate(link.path, link.newAudit ? { state: { newAudit: true } } : undefined)}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: 'rgba(255,255,255,0.4)', fontSize: '0.77rem', fontWeight: 600, padding: '6px 13px', cursor: 'pointer', transition: 'all 150ms', outline: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)'; (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
              >
                {link.label}
                {'badge' in link && link.badge > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800 }}>
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                )}
                {' →'}
              </button>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
