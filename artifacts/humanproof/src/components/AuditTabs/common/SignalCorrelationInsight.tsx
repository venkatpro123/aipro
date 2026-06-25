// SignalCorrelationInsight.tsx — Wave 7.4
//
// Renders the ContradictionReport from signalContradictionEngine.ts,
// showing each conflicting signal pair, how the AI resolved it, and
// the resulting uncertainty range.
//
// Why this matters: Users see "score 67" but never understand that
// two competing signals are creating ±8 pts of genuine uncertainty.
// This component makes that ambiguity visible and trustworthy.
//
// Placed in AnalysisTab inside an AdaptiveBlock — only renders when
// contradictions exist AND overallTrustLevel !== 'HIGH'.

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  Scale,
  TrendingUp,
  TrendingDown,
  Zap,
} from 'lucide-react';

// ── Types (mirrors signalContradictionEngine.ts) ──────────────────────────────

interface ContradictionRecord {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  positiveSignal: string;
  negativeSignal: string;
  resolution: 'positive_wins' | 'negative_wins' | 'averaged' | 'flagged';
  userGuidance?: string;
  scoreUncertaintyRange?: number;
}

export interface ContradictionReport {
  contradictions: ContradictionRecord[];
  totalContradictions: number;
  netUncertaintyPoints: number;
  overallTrustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  hasMaterialUncertainty: boolean;
  trustSummary: string;
}

interface Props {
  report: ContradictionReport;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(severity: ContradictionRecord['severity']): string {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'high':     return '#f97316';
    case 'medium':   return '#f59e0b';
    case 'low':      return '#22d3ee';
    default:         return '#6b7280';
  }
}

function trustLevelColor(level: ContradictionReport['overallTrustLevel']): string {
  switch (level) {
    case 'HIGH':     return '#10b981';
    case 'MEDIUM':   return '#f59e0b';
    case 'LOW':      return '#f97316';
    case 'VERY_LOW': return '#ef4444';
    default:         return '#6b7280';
  }
}

function resolutionLabel(resolution: ContradictionRecord['resolution']): string {
  // Cast to string: the runtime produces both v1 ContradictionRecord values AND
  // v2 TrustResolution values; both are handled here so nothing leaks as a raw code.
  const r = resolution as string;
  switch (r) {
    case 'positive_wins':         return 'Positive prevailed';
    case 'negative_wins':         return 'Risk prevailed';
    case 'averaged':              return 'Signals averaged';
    case 'flagged':               return 'Flagged — unresolved';
    case 'trust_positive_signal': return 'Positive signal trusted';
    case 'trust_negative_signal': return 'Risk signal trusted';
    case 'weight_both_equally':   return 'Both signals weighted';
    case 'defer_to_temporal':     return 'Monitoring — time-sensitive';
    case 'user_input_required':   return 'Clarification needed';
    default:                      return 'Resolved';
  }
}

function ResolutionIcon({ resolution }: { resolution: ContradictionRecord['resolution'] }) {
  const cls = 'w-3 h-3 flex-shrink-0';
  const r = resolution as string;
  switch (r) {
    case 'positive_wins':
    case 'trust_positive_signal':  return <CheckCircle className={cls} style={{ color: '#10b981' }} />;
    case 'negative_wins':
    case 'trust_negative_signal':  return <AlertTriangle className={cls} style={{ color: '#f97316' }} />;
    case 'averaged':
    case 'weight_both_equally':    return <Scale className={cls} style={{ color: '#f59e0b' }} />;
    case 'flagged':
    case 'defer_to_temporal':      return <Zap className={cls} style={{ color: '#f59e0b' }} />;
    default:                       return <Scale className={cls} style={{ color: '#6b7280' }} />;
  }
}

function resolutionBg(resolution: ContradictionRecord['resolution']): string {
  switch (resolution) {
    case 'positive_wins': return 'rgba(16,185,129,0.08)';
    case 'negative_wins': return 'rgba(249,115,22,0.08)';
    case 'averaged':      return 'rgba(245,158,11,0.08)';
    case 'flagged':       return 'rgba(239,68,68,0.08)';
    default:              return 'rgba(107,114,128,0.08)';
  }
}

function resolutionBorder(resolution: ContradictionRecord['resolution']): string {
  switch (resolution) {
    case 'positive_wins': return 'rgba(16,185,129,0.22)';
    case 'negative_wins': return 'rgba(249,115,22,0.22)';
    case 'averaged':      return 'rgba(245,158,11,0.22)';
    case 'flagged':       return 'rgba(239,68,68,0.22)';
    default:              return 'rgba(107,114,128,0.22)';
  }
}

// ── ContradictionRow ──────────────────────────────────────────────────────────

const ContradictionRow: React.FC<{ record: ContradictionRecord; index: number }> = ({
  record,
  index,
}) => {
  const color = severityColor(record.severity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.06 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${color}20`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-2">
        <div
          className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
        />
        <p className="text-[10px] font-semibold leading-snug flex-1" style={{ color: 'var(--alpha-text-70)' }}>
          {record.explanation}
        </p>
        {record.scoreUncertaintyRange != null && record.scoreUncertaintyRange > 0 && (
          <span
            className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${color}12`, color }}
          >
            ±{record.scoreUncertaintyRange} pts
          </span>
        )}
      </div>

      {/* Signal pair */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 px-3.5 pb-2.5">
        {/* Positive signal */}
        <div
          className="rounded-lg px-2.5 py-2"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}
        >
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#10b981' }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#10b981' }}>
              Positive signal
            </span>
          </div>
          <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-50)' }}>
            {record.positiveSignal}
          </p>
        </div>

        {/* Negative signal */}
        <div
          className="rounded-lg px-2.5 py-2"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)' }}
        >
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#f97316' }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#f97316' }}>
              Risk signal
            </span>
          </div>
          <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-50)' }}>
            {record.negativeSignal}
          </p>
        </div>
      </div>

      {/* Resolution badge + user guidance */}
      <div className="flex items-start gap-2 px-3.5 pb-2.5">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg flex-shrink-0"
          style={{
            background: resolutionBg(record.resolution),
            border: `1px solid ${resolutionBorder(record.resolution)}`,
          }}
        >
          <ResolutionIcon resolution={record.resolution} />
          <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: 'var(--alpha-text-55)' }}>
            {resolutionLabel(record.resolution)}
          </span>
        </div>

        {record.userGuidance && (
          <p className="flex-1 text-[10px] italic leading-snug pt-1" style={{ color: 'var(--alpha-text-35)' }}>
            {record.userGuidance}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const SignalCorrelationInsight: React.FC<Props> = ({ report }) => {
  if (!report || (report.contradictions?.length ?? 0) === 0) return null;

  const trustColor = trustLevelColor(report.overallTrustLevel);

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div
        className="rounded-xl px-3.5 py-3"
        style={{
          background: `${trustColor}06`,
          border: `1px solid ${trustColor}20`,
        }}
      >
        <div className="flex items-start gap-2.5">
          <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: trustColor }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-[10px] font-bold leading-snug" style={{ color: 'var(--alpha-text-85)' }}>
                {report.totalContradictions} signal tension{report.totalContradictions !== 1 ? 's' : ''} detected
              </p>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${trustColor}14`, color: trustColor }}
              >
                {report.overallTrustLevel.replace('_', ' ')} TRUST
              </span>
              {report.netUncertaintyPoints > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}
                >
                  ±{report.netUncertaintyPoints} pts total uncertainty
                </span>
              )}
            </div>
            <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-45)' }}>
              {report.trustSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Individual contradiction rows */}
      <div className="space-y-2.5">
        {report.contradictions.map((record, idx) => (
          <ContradictionRow key={`${record.type}-${idx}`} record={record} index={idx} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[10px] leading-relaxed px-0.5" style={{ color: 'var(--alpha-text-25)' }}>
        Signal tensions are resolved using a reliability hierarchy: SEC filings &gt; live hiring data &gt;
        news sentiment &gt; aggregated surveys. When two signals of equal weight conflict, the AI averages
        them and widens the confidence interval. Flagged tensions are shown at full uncertainty until
        additional data resolves the conflict.
      </p>
    </div>
  );
};

export default SignalCorrelationInsight;
