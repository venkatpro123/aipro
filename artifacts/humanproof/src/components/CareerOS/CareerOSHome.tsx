// CareerOSHome.tsx — AI Career Command Center
// Architecture: OBSERVE → UNDERSTAND → DECIDE → ACT within 15 seconds
// Rule: Show what changed, not what is. Route to tools, never report.

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
import { AdaptationVelocityBadge } from "./AdaptationVelocityBadge";
import { evaluateReEngagementTrigger } from "../../services/reEngagementService";
import { detectAdaptationTriggers, type AdaptationTrigger } from "../../services/adaptationTriggerService";
import { useAutopilotAlerts } from "../../hooks/useAutopilotAlerts";
import { syncTwinFromProfile } from "../../services/careerTwinService";
import { orchestrate } from "../../services/orchestration/signalOrchestrator";
import { getCohortOutcomeStats, tenureBandFromYears } from "../../services/cohortOutcomesAggregator";
import { getActionFeedbackBoosts } from "../../services/feedbackEngine";
import type { HybridResult } from "../../types/hybridResult";
import type { UserProfile } from "../../services/userProfileService";

// ─── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32 } },
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
  if (d >= 2) return `${d} days ago`;
  if (d === 1) return "yesterday";
  if (h >= 1) return `${h}h ago`;
  return "just now";
}

interface ToolRec { label: string; to: string; icon: string; reason: string; urgent: boolean }

function getDynamicTools(hr: HybridResult, triggers: AdaptationTrigger[]): ToolRec[] {
  const tools: ToolRec[] = [];
  const riskScore = hr.total ?? 50;
  const d1 = ((hr as any).breakdown?.D1 as number | undefined) ?? 0;
  const hiringFreeze = (hr as any).hiringSignalResult?.hiringFreezeDetected === true;
  const stealthSev = (hr as any)._stealthSignal?.severity as string | undefined;
  const marketTrend = (hr as any).marketDemand?.demandTrend as string | undefined;
  const hasPeerSurge = triggers.some(t => t.type === 'peer_surge');

  if (riskScore >= 45 || (stealthSev && stealthSev !== 'STABLE')) {
    tools.push({
      label: 'Layoff Defense', to: '/tools/layoff-defense', icon: '🛡️',
      reason: riskScore >= 65
        ? 'Risk is elevated — activate your full defense protocol'
        : 'Monitor company signals and prepare contingency plans',
      urgent: riskScore >= 65,
    });
  }

  if (d1 > 0.45) {
    tools.push({
      label: 'AI Defense Center', to: '/tools/ai-defense', icon: '🤖',
      reason: `AI targets ${Math.round(d1 * 100)}% of your role's tasks — build leverage before it peaks`,
      urgent: d1 > 0.65,
    });
  }

  if (hiringFreeze || marketTrend === 'declining' || hasPeerSurge) {
    tools.push({
      label: 'Market Intelligence', to: '/tools/market-intel', icon: '📊',
      reason: hiringFreeze
        ? 'Hiring freeze detected — understand your options before demand recovers'
        : 'Demand shifts in your sector require a positioning adjustment',
      urgent: false,
    });
  }

  if (tools.length < 2) {
    tools.push({
      label: 'Career Strategy', to: '/tools/strategy', icon: '🗺️',
      reason: riskScore < 35
        ? 'Strong position — plan your next career milestone now'
        : 'Map your escape paths and growth options',
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

  // Bullet 1: Company signal
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
      : `${companyLabel}: No active workforce reduction signals.`
    );
  }

  // Bullet 2: Market / role signal
  const d1 = ((hr as any).breakdown?.D1 as number | undefined) ?? 0;
  const hiringFreeze = (hr as any).hiringSignalResult?.hiringFreezeDetected === true;
  const marketTrend = (hr as any).marketDemand?.demandTrend as string | undefined;
  if (hiringFreeze) {
    lines.push(`Hiring freeze detected in your sector — external moves are harder right now.`);
  } else if (d1 > 0.65) {
    lines.push(`AI automation targets ${Math.round(d1 * 100)}% of tasks in ${roleLabel}. Upskilling is your highest-leverage move.`);
  } else if (marketTrend === 'declining') {
    lines.push(`Demand for ${roleLabel} is declining. Transition readiness is your key asset.`);
  } else if (marketTrend === 'rising') {
    lines.push(`Demand for ${roleLabel} is rising — strong window to negotiate or move up.`);
  } else {
    lines.push(`Market conditions for ${roleLabel} are stable.`);
  }

  // Bullet 3: Score change or re-engagement signal or trigger
  if (reEngageBanner) {
    lines.push(reEngageBanner.headline + (reEngageBanner.subtext ? ` ${reEngageBanner.subtext}` : ''));
  } else {
    const scoreDelta = (hr as any).scoreDelta as number | null | undefined;
    if (scoreDelta != null && Math.abs(scoreDelta) >= 3) {
      const dir = scoreDelta > 0 ? 'increased' : 'decreased';
      lines.push(`Risk score ${dir} ${Math.abs(Math.round(scoreDelta))} pts since your last audit.`);
    } else if (adaptationTriggers.length > 0) {
      lines.push(adaptationTriggers[0].message);
    } else {
      lines.push(`No significant changes since your last audit.`);
    }
  }

  return lines.slice(0, 3);
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <span style={{
        fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.28)",
        letterSpacing: "0.13em", textTransform: "uppercase" as const,
        whiteSpace: "nowrap" as const, fontFamily: "var(--font-mono, monospace)",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

// ─── Section 1: AI Career Officer Brief ───────────────────────────────────────

interface OfficerBriefProps {
  hr: HybridResult;
  companyName: string | null;
  roleTitle: string | null;
  adaptationTriggers: AdaptationTrigger[];
  reEngageBanner: { headline: string; subtext: string } | null;
  onJumpToMission: () => void;
}

function AICareerOfficerBrief({
  hr, companyName, roleTitle, adaptationTriggers, reEngageBanner, onJumpToMission,
}: OfficerBriefProps) {
  const riskScore = hr.total ?? 50;
  const status = riskScore >= 65 ? 'ACTION REQUIRED' : riskScore >= 50 ? 'ELEVATED' : riskScore >= 35 ? 'MONITOR' : 'STRONG';
  const statusColor = riskScore >= 65 ? '#ef4444' : riskScore >= 50 ? '#f97316' : riskScore >= 35 ? '#f59e0b' : '#10b981';
  const textOnStatus = riskScore < 35 ? '#000' : '#fff';

  const bullets = buildOfficerBullets(hr, companyName, roleTitle, adaptationTriggers, reEngageBanner);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const lastUpdated = formatLastUpdated(hr.calculatedAt);

  return (
    <motion.div
      variants={itemVariants}
      style={{
        marginBottom: 16, padding: '22px 24px', borderRadius: 14,
        background: `linear-gradient(135deg, ${statusColor}07 0%, rgba(255,255,255,0.01) 100%)`,
        border: `1px solid ${statusColor}22`,
      }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            AI CAREER OFFICER
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 9px', borderRadius: 5,
            background: `${statusColor}18`, border: `1px solid ${statusColor}35`,
            fontSize: '0.62rem', fontWeight: 800, color: statusColor,
            letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: statusColor,
              display: 'inline-block', animation: 'pulse 2s ease-in-out infinite', flexShrink: 0,
            }} />
            {status}
          </span>
        </div>
        {lastUpdated && (
          <span style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono, monospace)' }}>
            Updated {lastUpdated}
          </span>
        )}
      </div>

      {/* Greeting */}
      <p style={{ margin: '0 0 14px', fontSize: '0.97rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
        {greeting}.
      </p>

      {/* Intelligence bullets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
        {bullets.map((line, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{
              flexShrink: 0, marginTop: 7, width: 4, height: 4, borderRadius: '50%',
              background: 'rgba(255,255,255,0.3)', display: 'inline-block',
            }} />
            <span style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.56 }}>
              {line}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)' }}>
          Your highest-leverage action is ready below.
        </span>
        <button
          type="button"
          onClick={onJumpToMission}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: statusColor, color: textOnStatus,
            border: 'none', borderRadius: 8,
            padding: '8px 18px', fontSize: '0.8rem', fontWeight: 700,
            cursor: 'pointer', transition: 'opacity 150ms',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        >
          See Mission <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Section 2: What Changed ──────────────────────────────────────────────────

interface ChangeItem { label: string; kind: 'positive' | 'negative' | 'neutral' }

function WhatChangedStrip({ hr, adaptationTriggers }: { hr: HybridResult; adaptationTriggers: AdaptationTrigger[] }) {
  const changes: ChangeItem[] = [];

  const scoreDelta = (hr as any).scoreDelta as number | null | undefined;
  if (scoreDelta != null && Math.abs(scoreDelta) >= 3) {
    const pts = Math.abs(Math.round(scoreDelta));
    changes.push({ label: scoreDelta > 0 ? `Risk +${pts} pts` : `Risk −${pts} pts`, kind: scoreDelta > 0 ? 'negative' : 'positive' });
  }

  const stealthSev = (hr as any)._stealthSignal?.severity as string | undefined;
  if (stealthSev && stealthSev !== 'STABLE') changes.push({ label: 'Company signals active', kind: 'negative' });

  const marketTrend = (hr as any).marketDemand?.demandTrend as string | undefined;
  if (marketTrend === 'declining') changes.push({ label: 'Market demand declining', kind: 'negative' });
  if (marketTrend === 'rising') changes.push({ label: 'Market demand rising', kind: 'positive' });

  if ((hr as any).hiringSignalResult?.hiringFreezeDetected === true) changes.push({ label: 'Hiring freeze active', kind: 'negative' });
  if (adaptationTriggers.some(t => t.type === 'peer_surge')) changes.push({ label: 'Industry layoffs detected', kind: 'negative' });

  return (
    <motion.div
      variants={itemVariants}
      style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        marginBottom: 16, padding: '9px 14px', borderRadius: 9,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span style={{
        fontSize: '0.61rem', fontWeight: 800, color: 'rgba(255,255,255,0.28)',
        letterSpacing: '0.12em', textTransform: 'uppercase' as const,
        fontFamily: 'var(--font-mono, monospace)', flexShrink: 0,
      }}>
        WHAT CHANGED
      </span>
      {changes.length === 0 ? (
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
          No significant changes since your last audit.
        </span>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {changes.map((c, i) => (
            <span key={i} style={{
              padding: '2px 9px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600,
              background: c.kind === 'positive' ? 'rgba(16,185,129,0.1)' : c.kind === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${c.kind === 'positive' ? 'rgba(16,185,129,0.25)' : c.kind === 'negative' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)'}`,
              color: c.kind === 'positive' ? '#10b981' : c.kind === 'negative' ? '#ef4444' : 'rgba(255,255,255,0.5)',
            }}>
              {c.kind === 'positive' ? '↑ ' : c.kind === 'negative' ? '↓ ' : ''}{c.label}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Section 4: Dynamic Tool Recommendations ──────────────────────────────────

function DynamicToolRow({ hr, adaptationTriggers }: { hr: HybridResult; adaptationTriggers: AdaptationTrigger[] }) {
  const navigate = useNavigate();
  const tools = getDynamicTools(hr, adaptationTriggers);

  return (
    <motion.div variants={itemVariants} style={{ marginBottom: 20 }}>
      <SectionLabel label="Recommended For You" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tools.map(tool => (
          <button
            key={tool.to}
            type="button"
            onClick={() => navigate(tool.to)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: tool.urgent ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${tool.urgent ? 'rgba(239,68,68,0.18)' : 'var(--border)'}`,
              borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
              transition: 'all 150ms', textAlign: 'left' as const, width: '100%',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,245,255,0.03)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = tool.urgent ? 'rgba(239,68,68,0.18)' : 'var(--border)';
              (e.currentTarget as HTMLElement).style.background = tool.urgent ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)';
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{tool.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.87rem', color: 'var(--text)' }}>{tool.label}</span>
                {tool.urgent && (
                  <span style={{
                    fontSize: '0.59rem', fontWeight: 800, color: '#ef4444',
                    padding: '1px 6px', background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4,
                    letterSpacing: '0.06em', fontFamily: 'var(--font-mono, monospace)',
                  }}>
                    ACTION NEEDED
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.45 }}>
                {tool.reason}
              </div>
            </div>
            <ArrowRight size={14} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.25)' }} />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Section 5: Career Twin Status ────────────────────────────────────────────

function CareerTwinStatus({ completenessScore }: { completenessScore: number | null }) {
  const navigate = useNavigate();
  const score = completenessScore ?? 0;
  const color = completenessColor(score);

  return (
    <motion.div
      variants={itemVariants}
      style={{
        padding: '16px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 20,
      }}
    >
      <div>
        <div style={{
          fontSize: '0.61rem', fontWeight: 800, color: 'rgba(255,255,255,0.28)',
          letterSpacing: '0.12em', textTransform: 'uppercase' as const,
          fontFamily: 'var(--font-mono, monospace)', marginBottom: 7,
        }}>
          CAREER TWIN STATUS
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
            {score}%
          </span>
          <span style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.28)' }}>Confidence</span>
          <span style={{ color: 'rgba(255,255,255,0.14)', fontSize: '0.7rem' }}>·</span>
          <span style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.28)' }}>
            Monitoring: Company · Role · Market · AI · Compensation
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('/tools/career-twin')}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          background: 'none', border: '1px solid var(--border)', borderRadius: 7,
          color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600,
          padding: '6px 12px', cursor: 'pointer', transition: 'all 150ms',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)';
          (e.currentTarget as HTMLElement).style.color = 'var(--cyan)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
        }}
      >
        View Twin <ArrowRight size={11} />
      </button>
    </motion.div>
  );
}

// ─── New user entry card ───────────────────────────────────────────────────────

function StartHereCard() {
  const navigate = useNavigate();
  return (
    <motion.div variants={itemVariants}>
      <div style={{
        padding: '52px 36px', textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(0,245,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(0,245,255,0.18)', borderRadius: 16, marginBottom: 24,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 13px', borderRadius: 6, marginBottom: 22,
          background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.25)',
          fontSize: '0.63rem', fontWeight: 800, color: 'var(--cyan)',
          letterSpacing: '0.12em', fontFamily: 'var(--font-mono, monospace)',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)',
            display: 'inline-block', animation: 'pulse 1.8s ease-in-out infinite',
          }} />
          AI CAREER OFFICER · READY
        </div>

        <h2 style={{
          fontSize: 'clamp(1.4rem, 3.5vw, 1.9rem)', fontFamily: 'var(--font-display)',
          fontWeight: 800, color: 'var(--text)', margin: '0 0 14px', letterSpacing: '-0.02em',
        }}>
          Your AI Career OS is standing by.
        </h2>
        <p style={{
          fontSize: '0.93rem', color: 'rgba(255,255,255,0.46)', margin: '0 auto 32px',
          maxWidth: 420, lineHeight: 1.65,
        }}>
          Run a 90-second audit. Your AI career officer will monitor your position 24/7 and tell you exactly what to do next — without asking you to read reports.
        </p>

        <button
          type="button"
          onClick={() => navigate('/terminal', { state: { newAudit: true } })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--cyan)', color: '#000', fontWeight: 800,
            fontSize: '0.95rem', padding: '14px 32px', borderRadius: 10,
            border: 'none', cursor: 'pointer', transition: 'opacity 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        >
          Run Career Audit <ArrowRight size={16} />
        </button>

        <div style={{
          marginTop: 22, fontSize: '0.71rem', color: 'rgba(255,255,255,0.18)',
          fontFamily: 'var(--font-mono, monospace)',
        }}>
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

  // Restore skeleton while useAuditPersistence fetches from DB
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

  // Profile + memory + twin sync
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

  // Re-engagement signal (folded into officer brief)
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

  // Adaptation triggers
  useEffect(() => {
    if (!state.scoreResult) { setAdaptationTriggers([]); return; }
    const hr = state.scoreResult as HybridResult;
    const completedIds: string[] = [];
    try {
      const raw = sessionStorage.getItem('hp_completed_actions');
      if (raw) completedIds.push(...JSON.parse(raw));
    } catch { /* ignore */ }
    setAdaptationTriggers(detectAdaptationTriggers(hr, completedIds, hr.calculatedAt ?? null, []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scoreResult]);

  // Feedback boost map for action ranking
  const [feedbackBoosts, setFeedbackBoosts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    if (!user?.id || !state.scoreResult) return;
    const hr = state.scoreResult as HybridResult;
    const actionIds = (hr.actionItems ?? hr.recommendations ?? [])
      .map(r => r.id ?? (r as any).title)
      .filter((id): id is string => typeof id === 'string');
    if (actionIds.length === 0) return;
    getActionFeedbackBoosts(user.id, actionIds)
      .then(boosts => { if (boosts.size > 0) setFeedbackBoosts(boosts); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, state.scoreResult]);

  // Primary move (weekly mission)
  const orchestratedFeed = useMemo(() => {
    if (!state.scoreResult) return null;
    try { return orchestrate(state.scoreResult as HybridResult, undefined, userProfile, { feedbackBoosts }); }
    catch { return null; }
  }, [state.scoreResult, userProfile, feedbackBoosts]);

  const primaryMove = orchestratedFeed?.primaryMove ?? null;
  const primaryMoveActionId = primaryMove?.action.id ?? primaryMove?.action.title ?? null;

  // Peer benchmark for MissionCard
  useEffect(() => {
    if (!state.scoreResult || !primaryMoveActionId) return;
    const hr = state.scoreResult as HybridResult;
    const roleKey = (hr as any)?.roleKey ?? (hr as any)?.role ?? 'unknown';
    const band = tenureBandFromYears(userProfile?.yearsExperience ?? 5);
    getCohortOutcomeStats(roleKey, band, primaryMoveActionId)
      .then(stats => {
        if (stats && stats.count >= 5) setPeerBenchmark({ n: stats.count, avgPtsGain: Math.round(stats.avgRiskReduction) });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryMoveActionId, userProfile?.yearsExperience]);

  const hr = state.scoreResult as HybridResult | null;
  const riskScore = hr?.total ?? 0;
  const readiness = 100 - riskScore;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>

      {/* ── GPS Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ padding: "24px 0 16px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{
              fontSize: "clamp(1.3rem, 4vw, 1.8rem)", fontFamily: "var(--font-display)",
              fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em",
            }}>
              HumanProof
            </h1>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 6,
              background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.25)",
              fontSize: "0.67rem", fontWeight: 700, color: "var(--cyan)",
              letterSpacing: "0.1em", fontFamily: "var(--font-mono, monospace)",
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%", background: "var(--cyan)",
                display: "inline-block", animation: "pulse 1.8s ease-in-out infinite", flexShrink: 0,
              }} />
              CAREER OS
            </div>
          </div>
          <div style={{
            fontSize: "0.71rem", fontWeight: 500, color: "rgba(255,255,255,0.22)",
            fontFamily: "var(--font-mono, monospace)", alignSelf: "center",
          }}>
            {formatTodayDate()}
          </div>
        </div>

        {/* GPS status line — shows only when result is available */}
        {hasResult && hr && (
          <div style={{
            marginTop: 12, display: "flex", flexWrap: "wrap",
            gap: "3px 14px", fontSize: "0.71rem", fontFamily: "var(--font-mono, monospace)",
            alignItems: "center",
          }}>
            <span style={{ color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>YOU ARE</span>
            <span style={{ color: "rgba(255,255,255,0.52)", fontWeight: 600 }}>
              {state.roleTitle ? `${state.roleTitle} ` : ''}
              {state.companyName ? `@ ${state.companyName}` : 'your current role'}
            </span>
            <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>READINESS</span>
            <span style={{
              fontWeight: 800,
              color: readiness >= 60 ? '#10b981' : readiness >= 40 ? '#f59e0b' : '#ef4444',
            }}>
              {readiness}
            </span>
            <AdaptationVelocityBadge scoreResult={hr} compact />
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          COMMAND CENTER CONTENT
      ═══════════════════════════════════════════════════ */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">

        {!hasResult ? (
          /* ── No audit yet ── */
          isAwaitingRestore ? (
            <motion.div variants={itemVariants}>
              <div style={{
                padding: '44px 36px', textAlign: 'center', borderRadius: 16,
                background: 'rgba(0,245,255,0.02)', border: '1px solid rgba(0,245,255,0.08)',
                marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              }}>
                <div className="spinner" style={{ width: 26, height: 26 }} />
                <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: '0.82rem', fontFamily: 'var(--font-mono, monospace)' }}>
                  Restoring your career audit…
                </span>
              </div>
            </motion.div>
          ) : (
            <StartHereCard />
          )
        ) : (
          <>
            {/* ── 1. AI Career Officer Brief (OBSERVE) ── */}
            {hr && (
              <AICareerOfficerBrief
                hr={hr}
                companyName={state.companyName}
                roleTitle={state.roleTitle}
                adaptationTriggers={adaptationTriggers}
                reEngageBanner={reEngageBanner}
                onJumpToMission={() =>
                  document.getElementById('active-mission')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              />
            )}

            {/* ── 2. What Changed (UNDERSTAND) ── */}
            {hr && <WhatChangedStrip hr={hr} adaptationTriggers={adaptationTriggers} />}

            {/* ── 3. Active Mission (DECIDE) ── */}
            <motion.div
              variants={itemVariants}
              id="active-mission"
              style={{ marginBottom: 22 }}
            >
              <SectionLabel label="Active Mission" />
              {primaryMove ? (
                <MissionCard
                  primaryMove={primaryMove}
                  riskScore={riskScore}
                  peerBenchmark={peerBenchmark}
                  onHelp={() => navigate('/tools/strategy')}
                  onSkip={() => navigate('/monitor')}
                />
              ) : (
                <div className="card-premium" style={{
                  padding: '24px 28px', textAlign: 'center',
                  border: '1px solid rgba(0,245,255,0.15)',
                  background: 'rgba(0,245,255,0.02)',
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.38)', marginBottom: 14 }}>
                    Computing your weekly mission…
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/terminal', { state: { newAudit: true } })}
                    style={{
                      background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 8,
                      padding: '9px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Run New Audit →
                  </button>
                </div>
              )}
            </motion.div>

            {/* ── 4. Recommended Tools (ACT) ── */}
            {hr && <DynamicToolRow hr={hr} adaptationTriggers={adaptationTriggers} />}

            {/* ── 5. Career Twin Status ── */}
            <CareerTwinStatus completenessScore={completenessScore} />
          </>
        )}

        {/* ── Bottom nav ── */}
        <motion.div variants={itemVariants} style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            { label: 'New Audit', path: '/terminal', newAudit: true, badge: 0 },
            { label: 'Monitor Signals', path: '/monitor', newAudit: false, badge: autopilotUnreadCount },
            { label: 'All Tools', path: '/tools', newAudit: false, badge: 0 },
            { label: 'Settings', path: '/settings', newAudit: false, badge: 0 },
          ] as const).map(link => (
            <button
              key={link.path}
              type="button"
              onClick={() => navigate(link.path, link.newAudit ? { state: { newAudit: true } } : undefined)}
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8,
                color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: 600,
                padding: '6px 14px', cursor: 'pointer', transition: 'all 150ms', outline: 'none',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)';
                (e.currentTarget as HTMLElement).style.color = 'var(--cyan)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
              }}
            >
              {link.label}
              {link.badge > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 15, height: 15, borderRadius: '50%',
                  background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800,
                }}>
                  {link.badge > 9 ? '9+' : link.badge}
                </span>
              )}
              {' →'}
            </button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
