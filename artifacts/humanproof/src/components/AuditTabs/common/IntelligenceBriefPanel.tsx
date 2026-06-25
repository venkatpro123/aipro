// IntelligenceBriefPanel.tsx — v41.0
// Renders the AI-generated strategic intelligence brief (Layer 52).
// Shows skeleton state when brief is loading (undefined), empty state when null.
// 3-paragraph card: Situation / Risk Factors / Recommended Actions.
//
// v41.0 evidence floor: the brief must not render when the underlying data
// is too thin to support specific claims. A fluent LLM paragraph generated
// from heuristic baselines is indistinguishable from one grounded in live
// data — that ambiguity is a trust violation. Two gates:
//
//   Gate 1 (hard): freshnessTier === 'heuristic'
//     → no live data was retrieved for this company at all. The brief would
//       be entirely pattern-matched from sector averages. Block it.
//
//   Gate 2 (soft): confidence < EVIDENCE_FLOOR_PCT
//     → too few signals resolved to write a reliable company-specific brief.
//       Show a degraded card explaining what we'd need to generate one.

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Clock, Zap, AlertTriangle, Shield, Database } from 'lucide-react';
import type { IntelligenceBriefResult } from '../../../services/intelligenceBriefService';

// Below this confidence level the brief is degraded — shown with a warning.
const EVIDENCE_FLOOR_PCT = 40;

interface Props {
  intelligenceBrief: IntelligenceBriefResult | null | undefined;
  /** Overall audit confidence 0–100. Used to decide whether brief is reliable. */
  confidence?: number;
  /** Freshness tier from freshnessUnifier. 'heuristic' blocks the brief entirely. */
  freshnessTier?: 'live' | 'mixed' | 'stale' | 'heuristic' | string;
  /** Company name — surfaces in the "what we need" message. */
  companyName?: string;
}

const URGENCY_CONFIG: Record<IntelligenceBriefResult['urgencyLevel'], {
  color: string; bg: string; border: string; label: string;
}> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)', label: 'CRITICAL URGENCY' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.09)', border: 'rgba(249,115,22,0.30)', label: 'HIGH URGENCY' },
  MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.28)', label: 'MODERATE URGENCY' },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', label: 'LOW URGENCY' },
};

const PARAGRAPH_ICONS = [Brain, AlertTriangle, Shield] as const;
const PARAGRAPH_LABELS = ['Situation Assessment', 'Risk Factors', 'Recommended Actions'] as const;

const SkeletonLine: React.FC<{ width?: string }> = ({ width = '100%' }) => (
  <div
    className="skeleton-panel"
    style={{ height: '11px', width, borderRadius: 4, marginBottom: '6px' }}
  />
);

const LoadingSkeleton: React.FC = () => (
  <div className="skeleton-panel" style={{ overflow: 'hidden' }}>
    <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <Brain className="w-4 h-4 animate-pulse" style={{ color: 'rgba(0,212,224,0.5)' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,212,224,0.5)' }}>
        AI Intelligence Brief
      </span>
      <div className="ml-auto flex items-center gap-1.5" style={{ color: 'var(--alpha-text-30)' }}>
        <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: 'var(--cyan)', opacity: 0.6 }} />
        <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}>GENERATING...</span>
      </div>
    </div>
    <div className="p-5 space-y-5">
      {[0, 1, 2].map(i => (
        <div key={i}>
          <SkeletonLine width="40%" />
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine width="75%" />
        </div>
      ))}
    </div>
  </div>
);

// ── Gate 1: Hard block — no live data at all ──────────────────────────────────

const HeuristicBlock: React.FC<{ companyName?: string }> = ({ companyName }) => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{ border: '1px solid rgba(148,163,184,0.22)', background: 'rgba(15,23,42,0.60)' }}
  >
    <div
      className="flex items-center gap-2 px-5 py-3"
      style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}
    >
      <Brain className="w-4 h-4" style={{ color: 'rgba(148,163,184,0.45)' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.45)' }}>
        AI Intelligence Brief
      </span>
      <span
        className="px-2 py-0.5 rounded text-[10px] font-black"
        style={{ background: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.28)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
      >
        NO LIVE DATA
      </span>
    </div>
    <div className="px-5 py-5 flex items-start gap-3.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.20)' }}
      >
        <Database className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
      </div>
      <div className="flex-1">
        <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--alpha-text-70)' }}>
          Not enough live data to generate a reliable brief
          {companyName ? ` for ${companyName}` : ''}.
        </p>
        <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--alpha-text-45)' }}>
          A company-specific intelligence brief requires at least one live data source — stock
          signals, news coverage, job postings, or a WARN filing — so the analysis is grounded
          in what is actually happening at this company right now, not in sector averages.
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-30)' }}>
          A brief will be generated automatically once live signals resolve. You can also
          find sector-level context in the Intelligence tab → Market Environment section.
        </p>
      </div>
    </div>
  </div>
);

// ── Gate 2: Soft degraded state — low confidence ──────────────────────────────

const LowConfidenceBrief: React.FC<{
  confidencePct: number;
  brief: IntelligenceBriefResult;
}> = ({ confidencePct, brief }) => {
  const urgency = URGENCY_CONFIG[brief.urgencyLevel];
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${urgency.border}`, background: urgency.bg }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderBottom: `1px solid ${urgency.border}` }}
      >
        <Brain className="w-4 h-4" style={{ color: urgency.color }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: urgency.color }}>
          AI Intelligence Brief
        </span>
        <span
          className="px-2 py-0.5 rounded text-[10px] font-black"
          style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
        >
          LOW CONFIDENCE
        </span>
      </div>
      {/* Warning banner */}
      <div
        className="mx-4 mt-4 mb-1 flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
        style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)' }}
      >
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
        <p className="text-[11px] leading-snug" style={{ color: 'var(--alpha-text-70)' }}>
          <span className="font-semibold text-amber-400">Low data confidence ({confidencePct}%). </span>
          This brief was generated from partial signals. Statements below are directionally
          correct but may not reflect conditions specific to this company. Add profile data
          or wait for live signals to resolve to improve accuracy.
        </p>
      </div>
      {/* Brief content at reduced opacity to signal degraded state */}
      <div className="p-5 opacity-75">
        <p className="text-[11px] font-semibold mb-3" style={{ color: urgency.color }}>
          {brief.keyRiskDriver}
        </p>
        {brief.paragraphs.map((para, i) => (
          <p
            key={i}
            className="text-[11px] leading-relaxed mb-3"
            style={{ color: 'var(--alpha-text-55)', paddingLeft: '4px', borderLeft: `2px solid ${urgency.color}30` }}
          >
            {para}
          </p>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const IntelligenceBriefPanel: React.FC<Props> = ({
  intelligenceBrief,
  confidence,
  freshnessTier,
  companyName,
}) => {
  if (intelligenceBrief === undefined) return <LoadingSkeleton />;

  // Gate 1 (hard): no live data retrieved — block the brief entirely.
  // A heuristic-tier audit means every signal is from sector averages; the
  // LLM would generate plausible-sounding but company-unspecific prose.
  if (freshnessTier === 'heuristic') {
    return <HeuristicBlock companyName={companyName} />;
  }

  if (intelligenceBrief === null) return null;

  // Gate 2 (soft): confidence below evidence floor — show degraded state.
  const confidencePct = confidence ?? 100;
  if (confidencePct < EVIDENCE_FLOOR_PCT) {
    return <LowConfidenceBrief confidencePct={confidencePct} brief={intelligenceBrief} />;
  }

  const urgency = URGENCY_CONFIG[intelligenceBrief.urgencyLevel];
  // v40.0 i18n: respect user's browser locale (German users see "Jan.", not "January")
  const userLocale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  const generatedDate = new Date(intelligenceBrief.generatedAt).toLocaleDateString(userLocale, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden panel-hover"
      style={{
        border: `1px solid ${urgency.border}`,
        background: urgency.bg,
        boxShadow: 'var(--shadow-elev-2)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderBottom: `1px solid ${urgency.border}`, background: `${urgency.bg}` }}
      >
        <Brain className="w-4 h-4" style={{ color: urgency.color }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: urgency.color }}>
          AI Intelligence Brief
        </span>

        {/* Urgency badge */}
        <span
          className="px-2 py-0.5 rounded text-[10px] font-black"
          style={{ background: `${urgency.color}22`, color: urgency.color, border: `1px solid ${urgency.color}40`, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
        >
          {urgency.label}
        </span>

        {/* Freshness / cache indicator */}
        <div className="ml-auto flex items-center gap-1" style={{ color: 'var(--alpha-text-35)' }}>
          <Clock className="w-3 h-3" />
          <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}>
            {intelligenceBrief.fromCache ? 'CACHED · ' : ''}{generatedDate}
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Key risk driver highlight */}
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
          style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${urgency.border}` }}
        >
          <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: urgency.color }} />
          <div>
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: urgency.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
              Primary Risk Driver
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, fontWeight: 600 }}>
              {intelligenceBrief.keyRiskDriver}
            </p>
          </div>
        </div>

        {/* 3-paragraph sections */}
        <div className="space-y-4">
          {intelligenceBrief.paragraphs.map((para, i) => {
            const Icon = PARAGRAPH_ICONS[i];
            const label = PARAGRAPH_LABELS[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: 'var(--alpha-text-45)' }} />
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--alpha-text-45)' }}>
                    {label}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--alpha-text-70)', lineHeight: 1.65, paddingLeft: '20px' }}>
                  {para}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Top action callout */}
        <div
          className="mt-5 rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ background: `${urgency.color}10`, border: `1px solid ${urgency.color}30` }}
        >
          <div
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: `${urgency.color}25`, border: `1px solid ${urgency.color}40` }}
          >
            <span style={{ fontSize: '10px' }}>1</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: urgency.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Top Action This Week
              </div>
              {/* Market-grounded badge — shown when action cites real market data numbers */}
              {intelligenceBrief.marketGrounded ? (
                <span
                  title="This action references real market data: opening counts, hiring bar, and success rates from career market research."
                  style={{
                    fontSize: '8px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                    padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.06em',
                    background: 'rgba(16,185,129,0.10)', color: '#34d399',
                    border: '1px solid rgba(16,185,129,0.22)', cursor: 'help',
                  }}
                >
                  market data ✓
                </span>
              ) : (
                <span
                  title="Market context unavailable for this role — action is based on general guidance."
                  style={{
                    fontSize: '8px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                    padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.06em',
                    background: 'rgba(107,114,128,0.10)', color: '#9ca3af',
                    border: '1px solid rgba(107,114,128,0.22)', cursor: 'help',
                  }}
                >
                  general guidance
                </span>
              )}
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, fontWeight: 600 }}>
              {intelligenceBrief.topActionThisWeek}
            </p>
          </div>
        </div>

        {/* Model footnote */}
        <div className="mt-4 flex items-center justify-between">
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
            Model: {intelligenceBrief.modelUsed}
          </span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
            Refreshes when score shifts &gt;5pts or after 24h
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default IntelligenceBriefPanel;
