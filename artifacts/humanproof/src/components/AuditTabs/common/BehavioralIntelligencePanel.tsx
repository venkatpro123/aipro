// BehavioralIntelligencePanel.tsx — Wave 2.1 Intelligence Surfacing
//
// PROBLEM SOLVED: behavioralPersonalizationEngine.ts computes employment gap
// frame, interview readiness, career trajectory diagnosis, and compensation
// gap narrative for EVERY audit. NONE of these were visible to users.
//
// This panel surfaces all four in a clean, decision-driven layout.
// Each section answers a specific user question:
//   A. "Where am I in my career?" → Trajectory Diagnosis
//   B. "How do I explain my gap?" → Employment Gap Script
//   C. "Am I ready for interviews?" → Interview Readiness
//   D. "Am I being paid fairly?" → Compensation Gap
//
// Only renders sections that have non-trivial data. A user with no gap
// and ascending trajectory sees only the relevant sections.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Compass, BookOpen, Mic2, DollarSign, ChevronDown, ChevronUp,
  AlertTriangle, TrendingUp, CheckCircle, Clock,
} from 'lucide-react';
import type { BehavioralPersonalizationResult } from '../../../services/behavioralPersonalizationEngine';

interface Props {
  data: BehavioralPersonalizationResult;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '14px 16px',
  marginBottom: 10,
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: '0.16em',
  color: 'rgba(255,255,255,0.30)',
  marginBottom: 4,
};

// ── A. Career Trajectory Diagnosis ───────────────────────────────────────────

const trajectoryConfig: Record<string, { color: string; icon: React.ReactNode; badge: string }> = {
  ascending:   { color: '#10b981', icon: <TrendingUp className="w-4 h-4" />, badge: 'ASCENDING' },
  plateauing:  { color: '#f59e0b', icon: <AlertTriangle className="w-4 h-4" />, badge: 'PLATEAUING' },
  declining:   { color: '#ef4444', icon: <AlertTriangle className="w-4 h-4" />, badge: 'DECLINING' },
  resetting:   { color: '#a78bfa', icon: <Compass className="w-4 h-4" />, badge: 'RESETTING' },
  early:       { color: '#22d3ee', icon: <TrendingUp className="w-4 h-4" />, badge: 'EARLY CAREER' },
};

const TrajectorySection: React.FC<{ data: BehavioralPersonalizationResult['careerTrajectory'] }> = ({ data }) => {
  const cfg = trajectoryConfig[data.trajectory] ?? trajectoryConfig.early;

  return (
    <div style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, color: cfg.color }}>
          {cfg.icon}
        </div>
        <div>
          <p style={SECTION_LABEL}>CAREER TRAJECTORY</p>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
            >
              {cfg.badge}
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
              {data.promotionVelocity}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>
        {data.insight}
      </p>
      <div
        className="rounded-lg px-3 py-2"
        style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}
      >
        <p className="text-[9px] font-bold mb-0.5" style={{ color: `${cfg.color}80` }}>URGENT ACTION</p>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.75)' }}>{data.urgentAction}</p>
      </div>
    </div>
  );
};

// ── B. Employment Gap Script ──────────────────────────────────────────────────

const GapSection: React.FC<{ data: BehavioralPersonalizationResult['employmentGap'] }> = ({ data }) => {
  const [showScript, setShowScript] = useState(false);
  if (!data.hasGap || data.gapSeverity === 'none') return null;

  const color = data.gapSeverity === 'significant' ? '#f97316' : data.gapSeverity === 'moderate' ? '#f59e0b' : '#22d3ee';

  return (
    <div style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Clock className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div>
          <p style={SECTION_LABEL}>EMPLOYMENT GAP</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold" style={{ color }}>
              {data.mostRecentGapMonths}mo gap detected
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize"
              style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
              {data.gapSeverity} impact
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.68)' }}>
        {data.narrativeFrame}
      </p>
      <button
        onClick={() => setShowScript(s => !s)}
        className="flex items-center gap-1 text-[10px] font-semibold mb-2"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        {showScript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showScript ? 'Hide' : 'Show'} your interview script
      </button>
      {showScript && (
        <div
          className="rounded-lg px-3 py-2 mb-2"
          style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}
        >
          <p className="text-[9px] font-bold mb-1" style={{ color: 'rgba(34,211,238,0.60)' }}>
            <Mic2 className="w-3 h-3 inline mr-1" />YOUR 30-SECOND RESPONSE
          </p>
          <p className="text-[11px] leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.72)' }}>
            "{data.interviewScript}"
          </p>
        </div>
      )}
      <p className="text-[9px] italic" style={{ color: 'rgba(255,255,255,0.30)' }}>
        {data.timeToNeutralise}
      </p>
    </div>
  );
};

// ── C. Interview Readiness ────────────────────────────────────────────────────

const ReadinessSection: React.FC<{ data: BehavioralPersonalizationResult['interviewReadiness'] }> = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  const score = data.score;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f97316';
  const label = score >= 75 ? 'READY' : score >= 50 ? 'MOSTLY READY' : 'PREPARATION NEEDED';

  return (
    <div style={CARD_STYLE}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            <Mic2 className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <div>
            <p style={SECTION_LABEL}>INTERVIEW READINESS</p>
            <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-black" style={{ color }}>{score}</p>
          <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.30)' }}>/100</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>

      <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.50)' }}>
        {data.estimatedPrepTime} to reach 75/100 readiness.
      </p>

      {/* Quick wins */}
      {data.quickWins.length > 0 && (
        <div className="mb-2">
          <p className="text-[9px] font-bold tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
            QUICK WINS (&lt;1 HR EACH)
          </p>
          {data.quickWins.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 mb-0.5">
              <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#10b981', opacity: 0.6 }} />
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.60)' }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Expandable: gap areas */}
      {data.gapAreas.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[9px] font-semibold"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide' : 'Show'} gap areas ({data.gapAreas.length})
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {data.gapAreas.map((gap, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[8px] px-1 py-0.5 rounded capitalize ${
                      gap.severity === 'critical' ? 'bg-red-500/15 text-red-400' :
                      gap.severity === 'moderate' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-slate-500/15 text-slate-400'
                    }`}>
                      {gap.severity}
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {gap.specificAction}
                    </span>
                  </div>
                  <span className="text-[9px] flex-shrink-0 ml-2" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    {gap.timeEstimate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── D. Compensation Gap ───────────────────────────────────────────────────────

const CompensationSection: React.FC<{ data: BehavioralPersonalizationResult['compensationIntelligence'] }> = ({ data }) => {
  // Only render if meaningfully under market (> 15% below)
  if (data.deltaPercent > -15) return null;

  const isSignificant = data.deltaPercent < -20;
  const color = isSignificant ? '#f97316' : '#f59e0b';
  const absDelta = Math.abs(data.deltaPercent);

  // Lifetime cost estimate: assume 20yr career, 5% growth
  const annualGap = data.deltaPercent / 100; // negative
  // We don't have the salary, so surface the jump potential instead.

  return (
    <div style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <DollarSign className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div>
          <p style={SECTION_LABEL}>COMPENSATION GAP</p>
          <span className="text-[10px] font-bold" style={{ color }}>
            ~{absDelta.toFixed(0)}% below market
          </span>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.68)' }}>
        {data.searchImplication}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[8px] mb-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>MARKET MIDPOINT</p>
          <p className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.80)' }}>{data.marketMidpoint}</p>
        </div>
        <div className="rounded-lg p-2" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
          <p className="text-[8px] mb-0.5" style={{ color: `${color}70` }}>SEARCH TARGET</p>
          <p className="text-[12px] font-bold" style={{ color }}>{data.targetCompRange}</p>
        </div>
      </div>
      {data.salaryJumpPotential && (
        <p className="text-[10px] mt-2 italic" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {data.salaryJumpPotential}
        </p>
      )}
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const BehavioralIntelligencePanel: React.FC<Props> = ({ data }) => {
  // Determine which sections have substantive content
  const hasTrajectory = data.careerTrajectory.trajectory !== 'early' ||
    data.careerTrajectory.trajectoryScore < 80;
  const hasGap = data.employmentGap.hasGap && data.employmentGap.gapSeverity !== 'none';
  const hasReadiness = data.interviewReadiness.score < 90;
  const hasComp = data.compensationIntelligence.deltaPercent < -15;

  if (!hasTrajectory && !hasGap && !hasReadiness && !hasComp) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Opening narrative */}
      {data.openingNarrative && (
        <p className="text-[11px] leading-relaxed italic mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {data.openingNarrative}
        </p>
      )}

      {hasTrajectory && <TrajectorySection data={data.careerTrajectory} />}
      {hasGap && <GapSection data={data.employmentGap} />}
      {hasReadiness && <ReadinessSection data={data.interviewReadiness} />}
      {hasComp && <CompensationSection data={data.compensationIntelligence} />}

      {/* Top blocker */}
      {data.topBlocker && (
        <div
          className="rounded-xl px-3 py-2.5 mt-1"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)' }}
        >
          <p className="text-[9px] font-bold tracking-widest mb-1" style={{ color: '#a78bfa80' }}>
            <BookOpen className="w-3 h-3 inline mr-1" />YOUR TOP BLOCKER
          </p>
          <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {data.topBlocker}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default BehavioralIntelligencePanel;
