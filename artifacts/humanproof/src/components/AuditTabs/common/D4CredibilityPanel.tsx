// D4CredibilityPanel.tsx — v audit UX
//
// Surfaces performance credibility analysis from D4 of the scoring formula.
// Previously computed by analyzePerformanceCredibility() in layoffScoreEngine.ts
// and stored on HybridResult but never displayed in any UI panel.
//
// Answers: "Is your self-reported performance tier credible given the signals?"
//
// Only renders when:
//   - User has set a performance tier (not 'unknown' or null)
//   - The effective tier differs from the reported tier (an adjustment was made)
//   - OR contradicting signals exist
//
// Fields used: result.reportedPerformanceTier, result.performanceCredibilityScore,
//   result.d4ContradictingSignals, result.d4EffectivePerformanceTier

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';

interface ContradictingSignal {
  signal: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface D4CredibilityPanelProps {
  reportedPerformanceTier: string;
  effectivePerformanceTier: string;
  performanceCredibilityScore?: number;
  contradictingSignals?: ContradictingSignal[];
  regionThresholdLabel?: string;
}

const TIER_LABELS: Record<string, string> = {
  top:         'Top performer',
  above_avg:   'Above average',
  average:     'Average',
  below_avg:   'Below average',
  unknown:     'Not set',
};

const getTierLabel = (tier: string) => TIER_LABELS[tier] ?? tier;

export const D4CredibilityPanel: React.FC<D4CredibilityPanelProps> = ({
  reportedPerformanceTier,
  effectivePerformanceTier,
  performanceCredibilityScore,
  contradictingSignals = [],
  regionThresholdLabel,
}) => {
  const wasAdjusted = effectivePerformanceTier !== reportedPerformanceTier;
  const hasConflicts = contradictingSignals.length > 0;

  // Only render when there's something interesting to show
  if (!wasAdjusted && !hasConflicts) return null;

  const credibility = performanceCredibilityScore ?? 1;
  const credibilityPct = Math.round(credibility * 100);
  const credibilityLabel =
    credibility >= 0.8 ? 'High' :
    credibility >= 0.6 ? 'Moderate' :
    credibility >= 0.4 ? 'Low' : 'Very low';
  const credibilityColor =
    credibility >= 0.8 ? '#10b981' :
    credibility >= 0.6 ? '#22d3ee' :
    credibility >= 0.4 ? '#f59e0b' : '#f97316';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      style={{
        borderRadius: 14,
        background: wasAdjusted ? 'rgba(249,115,22,0.06)' : 'rgba(245,158,11,0.05)',
        border: `1px solid ${wasAdjusted ? 'rgba(249,115,22,0.22)' : 'rgba(245,158,11,0.18)'}`,
        padding: '13px 15px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {wasAdjusted
          ? <TrendingDown size={13} style={{ color: '#f97316', flexShrink: 0 }} />
          : <AlertCircle size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
        }
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: wasAdjusted ? '#f97316' : '#f59e0b', fontFamily: 'var(--font-mono)' }}>
            Performance Credibility
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: credibilityColor, fontFamily: 'var(--font-mono)' }}>
            {credibilityPct}% · {credibilityLabel}
          </span>
        </div>
      </div>

      {/* Adjustment disclosure */}
      {wasAdjusted && (
        <div style={{
          borderRadius: 10,
          background: 'rgba(249,115,22,0.08)',
          border: '1px solid rgba(249,115,22,0.18)',
          padding: '9px 11px',
          marginBottom: hasConflicts ? 8 : 0,
        }}>
          <p style={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.80)', margin: 0 }}>
            Your self-reported{' '}
            <strong style={{ color: '#f97316' }}>"{getTierLabel(reportedPerformanceTier)}"</strong>
            {' '}was adjusted to{' '}
            <strong style={{ color: '#10b981' }}>"{getTierLabel(effectivePerformanceTier)}"</strong>
            {' '}due to conflicting signals. The adjusted tier is used in your risk score.
          </p>
          {regionThresholdLabel && (
            <p style={{ fontSize: '0.68rem', color: 'var(--alpha-text-35)', marginTop: 4 }}>
              Region baseline: {regionThresholdLabel}
            </p>
          )}
        </div>
      )}

      {/* Contradicting signals list */}
      {hasConflicts && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {contradictingSignals.slice(0, 3).map((sig, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <AlertCircle
                size={11}
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                  color: sig.severity === 'high' ? '#f97316' : sig.severity === 'medium' ? '#f59e0b' : 'rgba(255,255,255,0.35)',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--alpha-text-70)', lineHeight: 1.3, marginBottom: 2 }}>
                  {sig.signal}
                </p>
                {sig.description && (
                  <p style={{ fontSize: '0.67rem', color: 'var(--alpha-text-45)', lineHeight: 1.45 }}>
                    {sig.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default D4CredibilityPanel;
