// SkillGapIntelligencePanel.tsx — v17.0
// Renders the skill gap analysis from Layer 48 (SkillGapIntelligence).
// Shows market-demand-scored gaps, upskill priorities, and existing strengths.
// Shows a "complete your profile" prompt when no skill data is available.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { SkillGapIntelligenceResult, UpskillPriorityItem } from '../../../services/skillGapIntelligenceService';

interface Props {
  skillGapIntelligence: SkillGapIntelligenceResult | null | undefined;
}

const URGENCY_COLORS: Record<string, { color: string; bg: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
  medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)' },
  low:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
};

const READINESS_COLOR = (pct: number) =>
  pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

const GapRow: React.FC<{ item: UpskillPriorityItem; index: number }> = ({ item, index }) => {
  const urg = URGENCY_COLORS[item.urgency] ?? URGENCY_COLORS.medium;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Urgency badge */}
      <span
        className="text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
        style={{ background: urg.bg, color: urg.color, border: `1px solid ${urg.color}30`, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
      >
        {item.urgency}
      </span>

      {/* Skill info */}
      <div className="flex-1 min-w-0">
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--alpha-text-85)' }}>
          {item.skill}
        </span>
        <p style={{ fontSize: '10px', color: 'var(--alpha-text-50)', lineHeight: 1.45 }}>
          {item.rationale}
        </p>
      </div>

      {/* Time to learn */}
      <div className="flex-shrink-0 text-right">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 900, color: urg.color }}>
          {item.estimatedWeeksToLearn}w
        </div>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
          to learn
        </div>
      </div>
    </motion.div>
  );
};

const EmptyPrompt: React.FC = () => (
  <div
    className="rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center py-10 px-6"
    style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.02)' }}
  >
    <Brain className="w-8 h-8 mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
      Add your skills to see what to improve
    </h3>
    <p style={{ fontSize: '11px', color: 'var(--alpha-text-35)', lineHeight: 1.55, maxWidth: '320px', marginBottom: '16px' }}>
      Add your current skills and the skills you want to your profile. We'll show you which ones are
      in demand and which ones to learn next.
    </p>
    <button
      onClick={() => {
        try {
          window.dispatchEvent(new CustomEvent('hp.profile.open', { detail: { step: 'skills' } }));
        } catch { /* SSR */ }
      }}
      style={{
        background: 'rgba(0,212,224,0.12)',
        border: '1px solid rgba(0,212,224,0.30)',
        borderRadius: '10px',
        color: '#00d4e0',
        fontSize: '11px',
        fontWeight: 700,
        padding: '8px 20px',
        cursor: 'pointer',
      }}
    >
      Add skills to profile →
    </button>
  </div>
);

const SkillGapIntelligencePanel: React.FC<Props> = ({ skillGapIntelligence }) => {
  const [showAll, setShowAll] = useState(false);

  if (!skillGapIntelligence) return <EmptyPrompt />;

  const {
    marketReadinessPct, upskillPriority, existingStrengths,
    criticalGaps, readinessLabel, narrativeSummary,
  } = skillGapIntelligence;

  const readinessColor = READINESS_COLOR(marketReadinessPct);
  const visibleGaps = showAll ? upskillPriority : upskillPriority.slice(0, 3);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.02)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Brain className="w-4 h-4" style={{ color: 'var(--cyan)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--cyan)' }}>
          Skills To Improve
        </span>
        <span
          className="ml-auto text-[10px] font-black px-2 py-0.5 rounded"
          style={{ background: `${readinessColor}15`, color: readinessColor, border: `1px solid ${readinessColor}30`, fontFamily: 'var(--font-mono)' }}
        >
          {readinessLabel}
        </span>
      </div>

      <div className="p-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Readiness score */}
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.04em', color: readinessColor }}>
              {marketReadinessPct}%
            </div>
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--alpha-text-35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Readiness Score
            </div>
          </div>

          {/* Skills to fix */}
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.04em', color: criticalGaps.length > 0 ? '#ef4444' : '#10b981' }}>
              {criticalGaps.length}
            </div>
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--alpha-text-35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Urgent Skills
            </div>
          </div>
        </div>

        {/* Narrative summary */}
        {narrativeSummary && (
          <div
            className="rounded-lg px-4 py-3 mb-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p style={{ fontSize: '11px', color: 'var(--alpha-text-55)', lineHeight: 1.55 }}>
              {narrativeSummary}
            </p>
          </div>
        )}

        {/* Existing strengths */}
        {existingStrengths.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#10b981' }}>
                Your Strengths
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {existingStrengths.map(skill => (
                <span
                  key={skill}
                  className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: 'rgba(16,185,129,0.10)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Upskill priorities */}
        {upskillPriority.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: '#f97316' }} />
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
                What To Learn First
              </span>
            </div>
            <div>
              {visibleGaps.map((item, i) => (
                <GapRow key={item.skill} item={item} index={i} />
              ))}
            </div>
            {upskillPriority.length > 3 && (
              <button
                onClick={() => setShowAll(s => !s)}
                className="flex items-center gap-1.5 mt-3 text-[10px] font-bold transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                {showAll ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> Show {upskillPriority.length - 3} more</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillGapIntelligencePanel;
