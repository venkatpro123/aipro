// SignalCorrelationInsight.tsx — Wave 7.4 Signal Contradiction Disclosure
//
// PROBLEM: signalContradictionEngine detects when signals conflict (e.g. hiring is
// active but financials are distressed) and adjusts score uncertainty. But users
// never see this reasoning — the score appears as a single authoritative number
// when in fact competing signals are pulling it in different directions.
//
// SOLUTION: Render each detected contradiction as a "signal tension" card showing
// what's conflicting, why, and how the AI resolved it. This builds trust and helps
// users understand uncertainty rather than treating the score as infallible.
//
// DATA SOURCE: result.signalContradictions (ContradictionReport from
// signalContradictionEngine.ts — already computed in the pipeline).

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';

// ── Types (mirrors signalContradictionEngine exports) ─────────────────────────

type ContradictionSeverity = 'low' | 'medium' | 'high' | 'critical';
type TrustResolution =
  | 'trust_positive_signal'
  | 'trust_negative_signal'
  | 'weight_both_equally'
  | 'defer_to_temporal'
  | 'user_input_required';

interface ContradictionRecord {
  type: string;
  severity: ContradictionSeverity;
  explanation: string;
  positiveSignal: string;
  negativeSignal: string;
  resolution: TrustResolution;
  userGuidance: string;
  scoreUncertaintyRange: number;
}

interface ContradictionReport {
  contradictions: ContradictionRecord[];
  totalContradictions: number;
  highestSeverity: ContradictionSeverity | null;
  hasMaterialUncertainty: boolean;
  netUncertaintyPoints: number;
  trustSummary: string;
  overallTrustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
}

interface Props {
  report: ContradictionReport;
}

// ── Config ────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<ContradictionSeverity, { color: string; label: string; bg: string; border: string }> = {
  low:      { color: '#94a3b8', label: 'Low',      bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.15)' },
  medium:   { color: '#f59e0b', label: 'Moderate', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.22)' },
  high:     { color: '#f97316', label: 'High',     bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
  critical: { color: '#dc2626', label: 'Critical', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.28)' },
};

const RESOLUTION_CONFIG: Record<TrustResolution, { label: string; color: string }> = {
  trust_positive_signal: { label: '→ Positive signal trusted',   color: '#10b981' },
  trust_negative_signal: { label: '→ Negative signal trusted',   color: '#f97316' },
  weight_both_equally:   { label: '→ Both signals weighted',     color: '#f59e0b' },
  defer_to_temporal:     { label: '→ Monitor — time-dependent', color: '#22d3ee' },
  user_input_required:   { label: '→ Needs your clarification', color: '#a78bfa' },
};

const TRUST_LEVEL_CONFIG = {
  HIGH:     { color: '#10b981', label: 'Signals agree',           border: 'rgba(16,185,129,0.25)' },
  MEDIUM:   { color: '#f59e0b', label: 'Minor tensions detected', border: 'rgba(245,158,11,0.25)' },
  LOW:      { color: '#f97316', label: 'Significant tensions',    border: 'rgba(249,115,22,0.28)' },
  VERY_LOW: { color: '#dc2626', label: 'Conflicting signals',     border: 'rgba(220,38,38,0.30)' },
};

// ── Contradiction Card ────────────────────────────────────────────────────────

const ContradictionCard: React.FC<{ c: ContradictionRecord; index: number }> = ({ c, index }) => {
  const [open, setOpen] = useState(index === 0 && c.severity !== 'low');
  const sev = SEVERITY_CONFIG[c.severity] ?? SEVERITY_CONFIG.medium;
  const res = RESOLUTION_CONFIG[c.resolution] ?? RESOLUTION_CONFIG.weight_both_equally;

  // Human-readable type label
  const typeLabel = c.type.replace(/_/g, ' ').replace(/\bvs\b/gi, 'vs.').toLowerCase()
    .replace(/^\w/, ch => ch.toUpperCase());

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${sev.border}` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
        style={{ background: sev.bg }}
      >
        {/* Severity dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: sev.color, boxShadow: `0 0 5px ${sev.color}80` }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.82)' }}>
            {typeLabel}
          </p>
          {!open && (
            <p className="text-[9px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {c.positiveSignal} vs. {c.negativeSignal}
            </p>
          )}
        </div>

        {/* Uncertainty range + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {c.scoreUncertaintyRange > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${sev.color}15`, color: sev.color, border: `1px solid ${sev.color}25` }}>
              ±{c.scoreUncertaintyRange} pts
            </span>
          )}
          {open
            ? <ChevronUp className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.30)' }} />
            : <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.30)' }} />
          }
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2" style={{ background: `${sev.bg.replace('0.07', '0.03')}` }}>
          {/* Signal pair */}
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <div className="rounded-lg px-2 py-1.5"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
              <p className="text-[8px] font-bold mb-0.5" style={{ color: 'rgba(16,185,129,0.55)' }}>POSITIVE SIGNAL</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{c.positiveSignal}</p>
            </div>
            <div className="rounded-lg px-2 py-1.5"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}>
              <p className="text-[8px] font-bold mb-0.5" style={{ color: 'rgba(220,38,38,0.55)' }}>NEGATIVE SIGNAL</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{c.negativeSignal}</p>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-[10px] leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.60)' }}>
            {c.explanation}
          </p>

          {/* Resolution + guidance */}
          <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-[10px] font-black flex-shrink-0 mt-0.5" style={{ color: res.color }}>⚡</span>
            <div>
              <p className="text-[9px] font-bold mb-0.5" style={{ color: res.color }}>{res.label}</p>
              <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>{c.userGuidance}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const SignalCorrelationInsight: React.FC<Props> = ({ report }) => {
  const { contradictions, trustSummary, overallTrustLevel, netUncertaintyPoints, hasMaterialUncertainty } = report;

  // Only render when there are actual contradictions
  if (!contradictions || contradictions.length === 0) return null;

  // Don't show for "HIGH" trust level (no contradictions worth surfacing)
  if (overallTrustLevel === 'HIGH') return null;

  const trustCfg = TRUST_LEVEL_CONFIG[overallTrustLevel] ?? TRUST_LEVEL_CONFIG.MEDIUM;

  // Sort by severity: critical → high → medium → low
  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...contradictions].sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {/* Header summary */}
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-3.5 h-3.5" style={{ color: trustCfg.color + 'aa' }} />
        <p className="text-[10px] font-black tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          SIGNAL TENSIONS DETECTED
        </p>
        {hasMaterialUncertainty && netUncertaintyPoints > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto"
            style={{ background: `${trustCfg.color}15`, color: trustCfg.color, border: `1px solid ${trustCfg.border}` }}>
            ±{netUncertaintyPoints} pts uncertainty
          </span>
        )}
      </div>

      {/* Trust summary pill */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: `${trustCfg.color}0c`, border: `1px solid ${trustCfg.border}` }}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: trustCfg.color, boxShadow: `0 0 6px ${trustCfg.color}60` }} />
        <p className="text-[10px] leading-snug flex-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {trustSummary}
        </p>
        <span className="text-[8px] font-black flex-shrink-0 px-1.5 py-0.5 rounded"
          style={{ background: `${trustCfg.color}18`, color: trustCfg.color }}>
          {trustCfg.label}
        </span>
      </div>

      {/* Individual contradictions */}
      <div className="space-y-1.5">
        {sorted.map((c, i) => (
          <ContradictionCard key={c.type + i} c={c} index={i} />
        ))}
      </div>
    </motion.div>
  );
};

export default SignalCorrelationInsight;
