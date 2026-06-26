// ParentRiskCard.tsx — v audit UX
//
// Conditional card for the Company tab showing parent→subsidiary risk propagation.
// Renders only when result.parentPropagation is non-null.
//
// Previously computed by parentSubsidiaryPropagation.ts and stored on HybridResult
// but never surfaced in any UI (only visible in the deep TransparencyTab provenance section).
//
// Design: alert card with parent company name, propagation risk level,
//   lag timeline, protection + vulnerability factors, and key action.
//
// Data source: result.parentPropagation (ParentPropagationResult)

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, AlertTriangle, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface PropagationRiskLevel {
  level: 'negligible' | 'low' | 'moderate' | 'elevated' | 'high';
  color: 'green' | 'emerald' | 'yellow' | 'orange' | 'red';
}

export interface ParentRiskCardProps {
  parentPropagation: {
    parentName: string;
    parentCountry: string;
    officeFunctionLabel: string;
    propagationFactor: number;
    lagMonths: { min: number; max: number };
    propagationRisk: PropagationRiskLevel;
    propagationNarrative: string;
    protectionFactors: string[];
    vulnerabilityFactors: string[];
    priorityActions: string[];
    effectiveRunwayMonths?: { min: number; max: number };
  };
}

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  high:       { color: '#dc2626', bg: 'rgba(220,38,38,0.07)',  border: 'rgba(220,38,38,0.22)',  label: 'High propagation risk' },
  elevated:   { color: '#f97316', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.22)', label: 'Elevated propagation risk' },
  moderate:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.20)', label: 'Moderate propagation risk' },
  low:        { color: 'var(--color-cyan-text)', bg: 'rgba(34,211,238,0.05)', border: 'rgba(34,211,238,0.18)', label: 'Low propagation risk' },
  negligible: { color: '#10b981', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.18)', label: 'Negligible propagation risk' },
};

export const ParentRiskCard: React.FC<ParentRiskCardProps> = ({ parentPropagation: p }) => {
  const [expanded, setExpanded] = useState(false);

  if (!p) return null;

  // Only show when there's meaningful propagation risk
  if (p.propagationRisk.level === 'negligible') return null;

  const cfg = RISK_CONFIG[p.propagationRisk.level] ?? RISK_CONFIG.moderate;
  const factorPct = Math.round(p.propagationFactor * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      style={{
        borderRadius: 14,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Building2 size={14} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: cfg.color, fontFamily: 'var(--font-mono)' }}>
                Parent Company Risk
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {cfg.label}
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--alpha-text-85)', marginBottom: 3 }}>
              Your division is a subsidiary of <strong style={{ color: cfg.color }}>{p.parentName}</strong>
              {' '}({p.parentCountry})
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--alpha-text-50)', lineHeight: 1.45 }}>
              {p.propagationNarrative}
            </p>
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            style={{ flexShrink: 0, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--alpha-text-45)' }}
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Key stats row */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} style={{ color: 'var(--alpha-text-45)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--alpha-text-50)' }}>
              Lag: {p.lagMonths.min}–{p.lagMonths.max} months
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--alpha-text-45)' }}>
            {factorPct}% propagation factor
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--alpha-text-45)' }}>
            {p.officeFunctionLabel}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--alpha-bg-08)', padding: '12px 15px' }}>
          {p.vulnerabilityFactors?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--alpha-text-35)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
                Vulnerability factors
              </p>
              {p.vulnerabilityFactors.slice(0, 3).map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                  <AlertTriangle size={10} style={{ color: cfg.color, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--alpha-text-55)', lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
          )}
          {p.protectionFactors?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--alpha-text-35)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
                Protection factors
              </p>
              {p.protectionFactors.slice(0, 3).map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', flexShrink: 0 }}>+</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--alpha-text-55)', lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
          )}
          {p.priorityActions?.length > 0 && (
            <div style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--alpha-bg-04)',
              border: '1px solid var(--alpha-bg-08)',
            }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--alpha-text-35)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
                Recommended action
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--alpha-text-70)', lineHeight: 1.45 }}>
                {p.priorityActions[0]}
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ParentRiskCard;
