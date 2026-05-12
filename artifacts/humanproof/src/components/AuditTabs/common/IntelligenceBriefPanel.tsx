// IntelligenceBriefPanel.tsx — v17.0
// Renders the AI-generated strategic intelligence brief (Layer 52).
// Shows skeleton state when brief is loading (undefined), empty state when null.
// 3-paragraph card: Situation / Risk Factors / Recommended Actions.

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Clock, Zap, AlertTriangle, Shield } from 'lucide-react';
import type { IntelligenceBriefResult } from '../../../services/intelligenceBriefService';

interface Props {
  intelligenceBrief: IntelligenceBriefResult | null | undefined;
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
      <div className="ml-auto flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
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

const IntelligenceBriefPanel: React.FC<Props> = ({ intelligenceBrief }) => {
  if (intelligenceBrief === undefined) return <LoadingSkeleton />;
  if (intelligenceBrief === null) return null;

  const urgency = URGENCY_CONFIG[intelligenceBrief.urgencyLevel];
  const generatedDate = new Date(intelligenceBrief.generatedAt).toLocaleDateString('en-US', {
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
          className="px-2 py-0.5 rounded text-[9px] font-black"
          style={{ background: `${urgency.color}22`, color: urgency.color, border: `1px solid ${urgency.color}40`, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
        >
          {urgency.label}
        </span>

        {/* Freshness / cache indicator */}
        <div className="ml-auto flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
                  <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.45)' }} />
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)' }}>
                    {label}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, paddingLeft: '20px' }}>
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
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: urgency.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
              Top Action This Week
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
