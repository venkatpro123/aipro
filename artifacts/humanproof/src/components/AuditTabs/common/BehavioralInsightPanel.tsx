/**
 * BehavioralInsightPanel.tsx — v50.0
 *
 * Renders BehavioralPersonalizationResult — the 7-dimension career behavioural
 * analysis that makes action plans personalised rather than generic.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, TrendingUp, TrendingDown, Minus, DollarSign,
  Clock, Star, Briefcase, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Target, Zap,
} from 'lucide-react';
import type { BehavioralPersonalizationResult } from '@/services/behavioralPersonalizationEngine';

interface BehavioralInsightPanelProps {
  behavioral: BehavioralPersonalizationResult;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function trajectoryIcon(t: string) {
  if (t === 'ascending')  return <TrendingUp  className="w-3.5 h-3.5" style={{ color: '#10b981' }} />;
  if (t === 'declining')  return <TrendingDown className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />;
  return <Minus className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />;
}

function trajectoryColor(t: string) {
  if (t === 'ascending') return '#10b981';
  if (t === 'declining') return '#ef4444';
  return '#f59e0b';
}

function compPositionColor(p: string) {
  if (p === 'significantly_under' || p === 'under_market') return '#ef4444';
  if (p === 'at_market') return '#10b981';
  if (p === 'above_market' || p === 'significantly_above') return '#3b82f6';
  return '#94a3b8';
}

function compPositionLabel(p: string) {
  const map: Record<string, string> = {
    significantly_under: 'Significantly Under-Market',
    under_market: 'Under Market',
    at_market: 'At Market',
    above_market: 'Above Market',
    significantly_above: 'Significantly Above',
    unknown: 'Unknown',
  };
  return map[p] ?? p;
}

function readinessColor(score: number) {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--alpha-bg-08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Section: Employment Gap ─────────────────────────────────────────────────────

function GapSection({ gap }: { gap: BehavioralPersonalizationResult['employmentGap'] }) {
  const [open, setOpen] = useState(false);
  if (!gap.hasGap) return null;

  const sev = gap.gapSeverity;
  const color = sev === 'significant' ? '#ef4444' : sev === 'moderate' ? '#f59e0b' : '#94a3b8';

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--alpha-bg-06)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
          <span className="text-sm font-medium text-white/80">Employment Gap</span>
          <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
            style={{ color, background: `${color}18` }}>
            {sev.toUpperCase()} · {gap.totalGapMonths}mo
          </span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="p-3 rounded-lg" style={{ background: 'var(--alpha-bg-04)' }}>
                <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Interview framing</div>
                <p className="text-sm text-white/75 leading-relaxed">{gap.narrativeFrame}</p>
              </div>
              <div className="p-3 rounded-lg italic" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
                <div className="text-[10px] text-blue-400/70 uppercase tracking-wide mb-1">Interview script</div>
                <p className="text-sm text-white/70 leading-relaxed">&ldquo;{gap.interviewScript}&rdquo;</p>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1.5">Recovery actions</div>
                <ul className="space-y-1">
                  {gap.recoveryActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-400/60 mt-0.5">•</span>
                      <span className="text-xs text-white/65 leading-snug">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-white/35 leading-snug">{gap.timeToNeutralise}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section: Competitive Positioning ──────────────────────────────────────────

function CompetitiveSection({ cp }: { cp: BehavioralPersonalizationResult['competitivePositioning'] }) {
  const pct = cp.percentileEstimate;
  const color = pct >= 65 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-xl px-4 py-3.5 space-y-3" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-sm font-medium text-white/80">Competitive Position</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold" style={{ color }}>{pct}</span>
          <span className="text-xs text-white/40">/ 100 percentile</span>
        </div>
      </div>

      <p className="text-xs text-white/60 leading-snug italic">&ldquo;{cp.differentiatorStatement}&rdquo;</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-green-400/70 uppercase tracking-wide mb-1">Strengths vs peers</div>
          <ul className="space-y-0.5">
            {cp.strengthsVsPeers.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500/60 flex-shrink-0" />
                <span className="text-xs text-white/60 leading-snug">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1">Gaps vs peers</div>
          <ul className="space-y-0.5">
            {cp.weaknessesVsPeers.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 text-red-500/60 flex-shrink-0" />
                <span className="text-xs text-white/60 leading-snug">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-white/35">{cp.competitiveThreat}</span>
        <span className="text-white/50 font-medium">{cp.winRateEstimate}</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const BehavioralInsightPanel: React.FC<BehavioralInsightPanelProps> = ({ behavioral, className = '' }) => {
  const [showTransition, setShowTransition] = useState(false);

  const b = behavioral;
  const trajColor = trajectoryColor(b.careerTrajectory.trajectory);
  const compColor = compPositionColor(b.compensationIntelligence.position);
  const readColor = readinessColor(b.interviewReadiness.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--alpha-bg-08)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(139,92,246,0.15)' }}>
          <User className="w-4 h-4" style={{ color: '#a78bfa' }} />
        </div>
        <div>
          <div className="text-sm font-semibold text-white/90">Career Behavioural Analysis</div>
          <div className="text-xs text-white/40 mt-0.5">{b.profileSummary}</div>
        </div>
      </div>

      {/* Opening narrative */}
      <div className="mx-4 mb-4 p-3.5 rounded-xl" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.14)' }}>
        <p className="text-sm text-white/80 leading-relaxed">{b.openingNarrative}</p>
      </div>

      {/* 3-signal summary strip */}
      <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
        {/* Trajectory */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl" style={{ background: 'var(--alpha-bg-04)' }}>
          <div className="flex items-center gap-1.5">
            {trajectoryIcon(b.careerTrajectory.trajectory)}
            <span className="text-[10px] text-white/40 uppercase tracking-wide">Trajectory</span>
          </div>
          <div className="text-xs font-semibold" style={{ color: trajColor }}>{b.careerTrajectory.label}</div>
          <div className="text-[10px] text-white/35 leading-snug">{b.careerTrajectory.promotionVelocity}</div>
        </div>

        {/* Compensation */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl" style={{ background: 'var(--alpha-bg-04)' }}>
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" style={{ color: compColor }} />
            <span className="text-[10px] text-white/40 uppercase tracking-wide">Market Fit</span>
          </div>
          <div className="text-xs font-semibold" style={{ color: compColor }}>
            {compPositionLabel(b.compensationIntelligence.position)}
          </div>
          <div className="text-[10px] text-white/35 leading-snug">{b.compensationIntelligence.marketMidpoint} midpoint</div>
        </div>

        {/* Interview readiness */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl" style={{ background: 'var(--alpha-bg-04)' }}>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" style={{ color: readColor }} />
            <span className="text-[10px] text-white/40 uppercase tracking-wide">Readiness</span>
          </div>
          <div className="text-xs font-semibold" style={{ color: readColor }}>{b.interviewReadiness.score}/100</div>
          <div className="text-[10px] text-white/35 leading-snug">{b.interviewReadiness.estimatedPrepTime}</div>
        </div>
      </div>

      {/* Top blocker + weeks to ready */}
      <div className="mx-4 mb-4 flex flex-col gap-2">
        <div className="p-3 rounded-xl flex items-start gap-2.5"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.16)' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <div>
            <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wide mb-1">Top blocker — fix this first</div>
            <p className="text-sm text-white/80 leading-snug">{b.topBlocker}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl flex items-center justify-between"
          style={{ background: 'var(--alpha-bg-04)' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs text-white/55">Weeks to active search readiness</span>
          </div>
          <span className="text-sm font-bold" style={{ color: b.weeksToSearchReady <= 1 ? '#10b981' : b.weeksToSearchReady <= 3 ? '#f59e0b' : '#ef4444' }}>
            {b.weeksToSearchReady === 0 ? 'Ready now' : `${b.weeksToSearchReady} weeks`}
          </span>
        </div>
      </div>

      {/* Career trajectory detail */}
      <div className="mx-4 mb-3 space-y-2">
        <div className="text-[10px] text-white/40 uppercase tracking-wide px-1">Career trajectory</div>
        <div className="p-3.5 rounded-xl space-y-2.5" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ScoreBar score={b.careerTrajectory.trajectoryScore} color={trajColor} />
            </div>
          </div>
          <p className="text-xs text-white/60 leading-snug">{b.careerTrajectory.insight}</p>
          <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'var(--alpha-bg-04)' }}>
            <Zap className="w-3.5 h-3.5 mt-0.5 text-amber-400/70 flex-shrink-0" />
            <p className="text-xs text-white/70 leading-snug">{b.careerTrajectory.urgentAction}</p>
          </div>
        </div>
      </div>

      {/* Compensation detail */}
      <div className="mx-4 mb-3 space-y-2">
        <div className="text-[10px] text-white/40 uppercase tracking-wide px-1">Compensation intelligence</div>
        <div className="p-3.5 rounded-xl space-y-2" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Market midpoint</span>
            <span className="text-xs font-semibold text-white/80">{b.compensationIntelligence.marketMidpoint}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Your target range</span>
            <span className="text-xs font-semibold" style={{ color: compColor }}>{b.compensationIntelligence.targetCompRange}</span>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <p className="text-xs text-white/60 leading-snug">{b.compensationIntelligence.salaryJumpPotential}</p>
          <p className="text-xs text-white/40 leading-snug">{b.compensationIntelligence.negotiationImplication}</p>
        </div>
      </div>

      {/* Interview readiness gaps */}
      {b.interviewReadiness.priorityGaps.length > 0 && (
        <div className="mx-4 mb-3 space-y-2">
          <div className="text-[10px] text-white/40 uppercase tracking-wide px-1">Interview readiness gaps</div>
          <div className="space-y-1.5">
            {b.interviewReadiness.gapAreas.slice(0, 4).map((gap, i) => {
              const sevColor = gap.severity === 'critical' ? '#ef4444' : gap.severity === 'moderate' ? '#f59e0b' : '#94a3b8';
              return (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg"
                  style={{ background: 'var(--alpha-bg-04)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: sevColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-white/70 capitalize">{gap.area.replace(/_/g, ' ')}</span>
                      <span className="text-[10px]" style={{ color: sevColor }}>{gap.timeEstimate}</span>
                    </div>
                    <p className="text-xs text-white/45 leading-snug mt-0.5">{gap.specificAction}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Competitive positioning */}
      <div className="mx-4 mb-3">
        <CompetitiveSection cp={b.competitivePositioning} />
      </div>

      {/* Employment gap (if exists) */}
      <div className="mx-4 mb-3">
        <GapSection gap={b.employmentGap} />
      </div>

      {/* Company transition (collapsible) */}
      {b.companyTransition.dynamic !== 'unknown_transition' && (
        <div className="mx-4 mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--alpha-bg-06)' }}>
          <button
            onClick={() => setShowTransition(!showTransition)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-3.5 h-3.5 text-white/50" />
              <span className="text-sm font-medium text-white/70">Company transition strategy</span>
            </div>
            {showTransition ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
          </button>

          <AnimatePresence>
            {showTransition && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-xs text-white/65 leading-relaxed">{b.companyTransition.narrativeRequired}</p>
                  {b.companyTransition.cultureRiskWarning && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg"
                      style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.12)' }}>
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-400/70 flex-shrink-0" />
                      <p className="text-xs text-white/65 leading-snug">{b.companyTransition.cultureRiskWarning}</p>
                    </div>
                  )}
                  {b.companyTransition.potentialObjections.map((obj, i) => (
                    <div key={i} className="space-y-1">
                      <div className="text-[10px] text-red-400/60 uppercase tracking-wide">Objection {i + 1}</div>
                      <p className="text-xs text-white/50 leading-snug">{obj}</p>
                      {b.companyTransition.objectionResponses[i] && (
                        <p className="text-xs text-white/65 leading-snug italic pl-2 border-l border-green-500/30">
                          {b.companyTransition.objectionResponses[i]}
                        </p>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-white/35 leading-snug">{b.companyTransition.targetCompanyScreenFilter}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default BehavioralInsightPanel;
