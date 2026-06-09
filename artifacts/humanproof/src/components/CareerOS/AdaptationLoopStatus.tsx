// AdaptationLoopStatus — Rule 11: visible 6-stage continuous adaptation loop (Phase 5)
// Shows the live state of each loop stage so users see the system is always working.
// Stages: MONITOR → DETECT → EXPLAIN → RECOMMEND → LEARN → REPEAT
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Radio, Eye, Lightbulb, Target, TrendingUp, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFeedbackSummary } from '../../services/feedbackEngine';
import type { HybridResult } from '../../types/hybridResult';
import type { PrimaryMove } from '../../services/orchestration/signalOrchestrator';

interface Props {
  scoreResult: HybridResult | null;
  primaryMove: PrimaryMove | null;
}

type StageStatus = 'active' | 'idle' | 'pending';

interface LoopStage {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  status: StageStatus;
  headline: string;
  detail: string | null;
  route: string | null;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 86_400_000);
}

function hoursSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 3_600_000);
}

function formatAge(iso: string | null | undefined): string {
  const h = hoursSince(iso);
  if (h == null) return 'unknown';
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function countActiveSignals(hr: HybridResult): number {
  let n = 0;
  const s = hr._stealthSignal;
  if (s?.confidence != null && s.confidence >= 0.4) n++;
  if (hr.executiveMovement?.departures?.length) n++;
  const waveIntensity = hr.peerContagion?.waveIntensity;
  if (waveIntensity === 'ACTIVE' || waveIntensity === 'PEAK' || waveIntensity === 'SPREADING') n++;
  if ((hr.dimensions?.find(d => d.key === 'D6')?.score ?? 0) > 50) n++; // tech obsolescence
  return n;
}

const STATUS_COLOR: Record<StageStatus, string> = {
  active:  'var(--cyan)',
  idle:    '#10b981',
  pending: 'rgba(255,255,255,0.2)',
};

const STATUS_BG: Record<StageStatus, string> = {
  active:  'rgba(0,245,255,0.08)',
  idle:    'rgba(16,185,129,0.06)',
  pending: 'rgba(255,255,255,0.02)',
};

// ── Stage row ─────────────────────────────────────────────────────────────────

function StageRow({ stage, index }: { stage: LoopStage; index: number }) {
  const navigate = useNavigate();
  const Icon = stage.icon;
  const color = STATUS_COLOR[stage.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '11px 14px', borderRadius: 9,
        background: STATUS_BG[stage.status],
        border: `1px solid ${stage.status === 'active' ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
        cursor: stage.route ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
      onClick={() => stage.route && navigate(stage.route)}
    >
      {/* Stage indicator dot */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: `${color}12`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={12} color={color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{
            fontSize: '0.62rem', fontWeight: 800, color, letterSpacing: '0.1em',
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            {stage.label}
          </span>
          {stage.status === 'active' && (
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: color,
              flexShrink: 0, animation: 'pulse 1.8s ease-in-out infinite',
            }} />
          )}
        </div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: stage.status === 'pending' ? 'rgba(255,255,255,0.25)' : 'var(--text)', lineHeight: 1.3 }}>
          {stage.headline}
        </div>
        {stage.detail && stage.status !== 'pending' && (
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 2, lineHeight: 1.4 }}>
            {stage.detail}
          </div>
        )}
      </div>

      {stage.route && stage.status !== 'pending' && (
        <ChevronRight size={13} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0, marginTop: 6 }} />
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdaptationLoopStatus({ scoreResult: hr, primaryMove }: Props) {
  const { user } = useAuth();
  const [lastMeasuredGain, setLastMeasuredGain] = useState<number | null>(null);
  const [actionsCompleted, setActionsCompleted] = useState(0);

  // LEARN stage: fetch last measured action gain from feedbackEngine
  useEffect(() => {
    if (!user) return;
    getFeedbackSummary(user.id)
      .then(summary => {
        setActionsCompleted(summary.actionsCompletedThisMonth);
        if (summary.estimatedScoreImpact != null) {
          // Convert risk reduction → readiness gain (inverted)
          setLastMeasuredGain(Math.round(summary.estimatedScoreImpact));
        }
        if (!summary.estimatedScoreImpact && summary.topEffectiveActions.length > 0) {
          const best = summary.topEffectiveActions[0];
          setLastMeasuredGain(Math.round(best.reduction ?? 0));
        }
      })
      .catch(() => {});
  }, [user]);

  if (!hr) return null;

  // ── Build the 6 stages from available data ──────────────────────────────────

  const signalCount = useMemo(() => countActiveSignals(hr), [hr]);
  const auditAge = daysSince(hr.calculatedAt) ?? null;
  const nextAuditDays = auditAge != null ? Math.max(0, 30 - auditAge) : null;
  const lastSignalAge = formatAge(hr.calculatedAt);

  const stages: LoopStage[] = [
    {
      id: 'monitor',
      label: 'MONITOR',
      icon: Radio,
      status: 'active',
      headline: `Last signal: ${lastSignalAge}`,
      detail: hr.calculatedAt ? `Company health, market demand, and peer signals — continuously tracked` : null,
      route: '/monitor',
    },
    {
      id: 'detect',
      label: 'DETECT',
      icon: Eye,
      status: signalCount > 0 ? 'active' : 'idle',
      headline: signalCount > 0
        ? `${signalCount} warning${signalCount > 1 ? 's' : ''} active`
        : 'No critical warnings',
      detail: signalCount > 0
        ? [
            hr._stealthSignal?.confidence && hr._stealthSignal.confidence >= 0.4 ? 'Stealth headcount signal' : null,
            hr.executiveMovement?.departures?.length ? `${hr.executiveMovement.departures.length} exec departure(s)` : null,
            hr.peerContagion?.waveIntensity !== 'NONE' ? `Peer wave: ${hr.peerContagion?.waveIntensity}` : null,
          ].filter(Boolean).join(' · ')
        : 'Signals clean — re-monitors on next audit',
      route: '/monitor',
    },
    {
      id: 'explain',
      label: 'EXPLAIN',
      icon: Lightbulb,
      status: 'idle',
      headline: primaryMove
        ? `Why it matters: ${(primaryMove.action.description ?? primaryMove.action.title).slice(0, 80)}`
        : 'Run audit to get personalized explanation',
      detail: primaryMove?.action.riskReductionPct
        ? `Est. ${primaryMove.action.riskReductionPct}% risk reduction if completed`
        : null,
      route: null,
    },
    {
      id: 'recommend',
      label: 'RECOMMEND',
      icon: Target,
      status: primaryMove ? 'active' : 'pending',
      headline: primaryMove
        ? primaryMove.action.title
        : 'No recommendation yet — run audit',
      detail: primaryMove
        ? `Effort: ${primaryMove.action.effortBadge ?? 'moderate'} · ${primaryMove.action.priority ?? 'High'} priority`
        : null,
      route: primaryMove ? '/os' : '/terminal',
    },
    {
      id: 'learn',
      label: 'LEARN',
      icon: TrendingUp,
      status: lastMeasuredGain != null && lastMeasuredGain > 0 ? 'idle'
             : actionsCompleted > 0 ? 'active'
             : 'pending',
      headline: lastMeasuredGain != null && lastMeasuredGain > 0
        ? `Last measured: +${lastMeasuredGain} readiness pts this month`
        : actionsCompleted > 0
        ? `${actionsCompleted} action${actionsCompleted > 1 ? 's' : ''} completed this month — measuring impact`
        : 'Complete your first action to start measuring',
      detail: actionsCompleted > 0
        ? 'Outcomes feed back into your cohort benchmark and future recommendations'
        : null,
      route: '/os',
    },
    {
      id: 'repeat',
      label: 'REPEAT',
      icon: RefreshCw,
      status: nextAuditDays != null && nextAuditDays <= 5 ? 'active'
             : nextAuditDays != null ? 'idle'
             : 'pending',
      headline: nextAuditDays != null
        ? nextAuditDays <= 0
          ? 'Audit overdue — signals may have shifted'
          : `Next audit recommended in ${nextAuditDays} day${nextAuditDays === 1 ? '' : 's'}`
        : 'Run your first audit to start the loop',
      detail: nextAuditDays != null && nextAuditDays <= 0
        ? 'Re-run now to update your readiness score with latest signals'
        : auditAge != null ? `Last audit: ${auditAge}d ago` : null,
      route: '/terminal',
    },
  ];

  return (
    <div style={{
      borderRadius: 14,
      background: 'rgba(0,245,255,0.02)',
      border: '1px solid rgba(0,245,255,0.1)',
      padding: '18px 20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', background: 'var(--cyan)',
          animation: 'pulse 1.8s ease-in-out infinite', flexShrink: 0,
        }} />
        <span style={{
          fontSize: '0.65rem', fontWeight: 800, color: 'var(--cyan)',
          letterSpacing: '0.12em', fontFamily: 'var(--font-mono, monospace)',
        }}>
          YOUR ADAPTATION LOOP
        </span>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>
          · click any stage to navigate
        </span>
      </div>

      {/* Stages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stages.map((stage, i) => (
          <StageRow key={stage.id} stage={stage} index={i} />
        ))}
      </div>
    </div>
  );
}
