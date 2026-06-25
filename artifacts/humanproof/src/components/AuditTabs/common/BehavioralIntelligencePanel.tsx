// BehavioralIntelligencePanel.tsx — v2.0
//
// v2.0: surfaces all 7 engine dimensions — previously only 4 of 7 were shown.
// Added sections:
//   E. Competitive Positioning (percentile, win rate, differentiator, threat)
//   F. Company Transition Strategy (narrative, objections + responses)
//   G. Risk Profile + weeks-to-ready summary bar
// Also surfaces previously-hidden fields:
//   - positioningAdvice in trajectory
//   - recoveryActions[] in employment gap
//   - negotiationImplication in compensation
//   - riskToleranceRationale

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, BookOpen, Mic2, DollarSign, ChevronDown, ChevronUp,
  AlertTriangle, TrendingUp, CheckCircle, Clock, Users, Building2,
  Shield, Zap, Star,
} from 'lucide-react';
import type { BehavioralPersonalizationResult } from '../../../services/behavioralPersonalizationEngine';
import { InterviewIllustration } from '../../illustrations/AdditionalIllustrations';

interface Props {
  data: BehavioralPersonalizationResult;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--alpha-bg-04)',
  border: '1px solid var(--alpha-bg-08)',
  borderRadius: 16,
  padding: '14px 16px',
  marginBottom: 10,
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: '0.16em',
  color: 'var(--alpha-text-30)',
  marginBottom: 4,
};

// ── A. Career Trajectory ──────────────────────────────────────────────────────

const trajectoryConfig: Record<string, { color: string; icon: React.ReactNode; badge: string }> = {
  ascending:  { color: '#10b981', icon: <TrendingUp className="w-4 h-4" />, badge: 'ASCENDING' },
  plateauing: { color: '#f59e0b', icon: <AlertTriangle className="w-4 h-4" />, badge: 'PLATEAUING' },
  declining:  { color: '#ef4444', icon: <AlertTriangle className="w-4 h-4" />, badge: 'DECLINING' },
  resetting:  { color: '#a78bfa', icon: <Compass className="w-4 h-4" />, badge: 'RESETTING' },
  early:      { color: '#22d3ee', icon: <TrendingUp className="w-4 h-4" />, badge: 'EARLY CAREER' },
};

const TrajectorySection: React.FC<{ data: BehavioralPersonalizationResult['careerTrajectory'] }> = ({ data }) => {
  const [showPositioning, setShowPositioning] = useState(false);
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
              {cfg.badge}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>
              {data.promotionVelocity}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--alpha-text-70)' }}>
        {data.insight}
      </p>

      <div className="rounded-lg px-3 py-2 mb-2"
        style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}>
        <p className="text-[10px] font-bold mb-0.5" style={{ color: `${cfg.color}80` }}>URGENT ACTION</p>
        <p className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>{data.urgentAction}</p>
      </div>

      {/* positioningAdvice — previously hidden */}
      {data.positioningAdvice && (
        <>
          <button
            type="button"
            onClick={() => setShowPositioning(s => !s)}
            className="flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: 'var(--alpha-text-30)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showPositioning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showPositioning ? 'Hide' : 'Show'} interview positioning advice
          </button>
          <AnimatePresence initial={false}>
            {showPositioning && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="rounded-lg px-3 py-2 mt-2"
                  style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)' }}>
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(167,139,250,0.60)' }}>
                    HOW TO FRAME THIS IN INTERVIEWS
                  </p>
                  <p className="text-[11px] leading-relaxed italic" style={{ color: 'var(--alpha-text-55)' }}>
                    {data.positioningAdvice}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

// ── B. Employment Gap ─────────────────────────────────────────────────────────

const GapSection: React.FC<{ data: BehavioralPersonalizationResult['employmentGap'] }> = ({ data }) => {
  const [showScript, setShowScript] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold" style={{ color }}>
              {data.mostRecentGapMonths}mo gap detected
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
              style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
              {data.gapSeverity} impact
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--alpha-text-55)' }}>
        {data.narrativeFrame}
      </p>

      <div className="flex gap-2 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowScript(s => !s)}
          className="flex items-center gap-1 text-[10px] font-semibold"
          style={{ color: 'var(--alpha-text-35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {showScript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showScript ? 'Hide' : 'Show'} your interview script
        </button>
        {(data.recoveryActions ?? []).length > 0 && (
          <button
            type="button"
            onClick={() => setShowRecovery(s => !s)}
            className="flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: 'var(--alpha-text-35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showRecovery ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showRecovery ? 'Hide' : `Show ${data.recoveryActions.length} recovery actions`}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showScript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}
          >
            <div className="rounded-lg px-3 py-2 mb-2"
              style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}>
              <p className="text-[10px] font-bold mb-1" style={{ color: 'rgba(34,211,238,0.60)' }}>
                <Mic2 className="w-3 h-3 inline mr-1" />YOUR 30-SECOND RESPONSE
              </p>
              <p className="text-[11px] leading-relaxed italic" style={{ color: 'var(--alpha-text-70)' }}>
                "{data.interviewScript}"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* recoveryActions — previously hidden */}
      <AnimatePresence initial={false}>
        {showRecovery && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}
          >
            <div className="rounded-lg px-3 py-2 mb-2"
              style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)' }}>
              <p className="text-[10px] font-bold mb-1.5" style={{ color: 'rgba(249,115,22,0.65)' }}>
                RECOVERY ACTIONS
              </p>
              {data.recoveryActions.map((action, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1">
                  <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#f97316' }}>▸</span>
                  <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-55)' }}>{action}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] italic" style={{ color: 'var(--alpha-text-30)' }}>
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
      {score < 75 && (
        <div className="flex justify-center mb-3">
          <InterviewIllustration size={56} className="opacity-75" />
        </div>
      )}
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
          <p className="text-[10px]" style={{ color: 'var(--alpha-text-30)' }}>/100</p>
        </div>
      </div>

      <div className="h-1.5 rounded-full mb-2" style={{ background: 'var(--alpha-bg-08)' }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>

      <p className="text-[10px] mb-2" style={{ color: 'var(--alpha-text-50)' }}>
        {data.estimatedPrepTime} to reach 75/100 readiness.
      </p>

      {data.quickWins.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'var(--alpha-text-25)' }}>
            QUICK WINS (&lt;1 HR EACH)
          </p>
          {data.quickWins.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 mb-0.5">
              <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#10b981', opacity: 0.6 }} />
              <p className="text-[10px]" style={{ color: 'var(--alpha-text-55)' }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {data.gapAreas.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: 'var(--alpha-text-30)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide' : 'Show'} gap areas ({data.gapAreas.length})
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}
              >
                <div className="mt-2 space-y-1.5">
                  {data.gapAreas.map((gap, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-[10px] px-1 py-0.5 rounded capitalize ${
                          gap.severity === 'critical' ? 'bg-red-500/15 text-red-400' :
                          gap.severity === 'moderate' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-slate-500/15 text-slate-400'
                        }`}>
                          {gap.severity}
                        </span>
                        <span className="text-[10px] truncate" style={{ color: 'var(--alpha-text-50)' }}>
                          {gap.specificAction}
                        </span>
                      </div>
                      <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--alpha-text-25)' }}>
                        {gap.timeEstimate}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

// ── D. Compensation ───────────────────────────────────────────────────────────

const CompensationSection: React.FC<{ data: BehavioralPersonalizationResult['compensationIntelligence'] }> = ({ data }) => {
  const [showNegotiation, setShowNegotiation] = useState(false);
  if (data.deltaPercent > -15) return null;

  const isSignificant = data.deltaPercent < -20;
  const color = isSignificant ? '#f97316' : '#f59e0b';
  const absDelta = Math.abs(data.deltaPercent);

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

      <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--alpha-text-55)' }}>
        {data.searchImplication}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <div className="rounded-lg p-2" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
          <p className="text-[10px] mb-0.5" style={{ color: 'var(--alpha-text-25)' }}>MARKET MIDPOINT</p>
          <p className="text-[12px] font-bold" style={{ color: 'var(--alpha-text-85)' }}>{data.marketMidpoint}</p>
        </div>
        <div className="rounded-lg p-2" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
          <p className="text-[10px] mb-0.5" style={{ color: `${color}70` }}>SEARCH TARGET</p>
          <p className="text-[12px] font-bold" style={{ color }}>{data.targetCompRange}</p>
        </div>
      </div>

      {data.salaryJumpPotential && (
        <p className="text-[10px] mb-2 italic" style={{ color: 'var(--alpha-text-45)' }}>
          {data.salaryJumpPotential}
        </p>
      )}

      {/* negotiationImplication — previously hidden */}
      {data.negotiationImplication && (
        <>
          <button
            type="button"
            onClick={() => setShowNegotiation(s => !s)}
            className="flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: 'var(--alpha-text-30)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showNegotiation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showNegotiation ? 'Hide' : 'Show'} negotiation strategy
          </button>
          <AnimatePresence initial={false}>
            {showNegotiation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}
              >
                <div className="rounded-lg px-3 py-2 mt-2"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: 'rgba(16,185,129,0.65)' }}>
                    NEGOTIATION LEVERAGE
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-70)' }}>
                    {data.negotiationImplication}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

// ── E. Competitive Positioning — previously never shown ───────────────────────

const CompetitiveSection: React.FC<{ data: BehavioralPersonalizationResult['competitivePositioning'] }> = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  const pct = data.percentileEstimate;
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#22d3ee' : pct >= 35 ? '#f59e0b' : '#f97316';

  return (
    <div style={CARD_STYLE}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            <Users className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <div>
            <p style={SECTION_LABEL}>COMPETITIVE POSITION</p>
            <span className="text-[10px] font-bold" style={{ color }}>
              {pct}th percentile vs peers
            </span>
          </div>
        </div>
        <p className="text-[22px] font-black flex-shrink-0" style={{ color }}>{pct}</p>
      </div>

      {/* Percentile bar */}
      <div className="relative h-1.5 rounded-full mb-2" style={{ background: 'var(--alpha-bg-08)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        <div className="absolute top-0 h-full w-px" style={{ left: '50%', background: 'var(--alpha-text-25)' }} />
      </div>

      {/* Differentiator */}
      {data.differentiatorStatement && (
        <div className="rounded-lg px-3 py-2 mb-2"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)' }}>
          <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(167,139,250,0.60)' }}>
            <Star className="w-3 h-3 inline mr-1" />YOUR DIFFERENTIATOR
          </p>
          <p className="text-[11px] italic leading-snug" style={{ color: 'var(--alpha-text-70)' }}>
            "{data.differentiatorStatement}"
          </p>
        </div>
      )}

      {data.winRateEstimate && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--alpha-text-50)' }}>
          {data.winRateEstimate}
        </p>
      )}

      {/* Expandable: strengths, weaknesses, main threat */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-[10px] font-semibold"
        style={{ color: 'var(--alpha-text-30)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide' : 'Show'} peer analysis
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}
          >
            <div className="mt-2 space-y-2">
              {data.strengthsVsPeers.length > 0 && (
                <div className="rounded-lg px-2.5 py-2"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: 'rgba(16,185,129,0.65)' }}>YOU LEAD</p>
                  {data.strengthsVsPeers.map((s, i) => (
                    <p key={i} className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-55)' }}>· {s}</p>
                  ))}
                </div>
              )}
              {data.weaknessesVsPeers.length > 0 && (
                <div className="rounded-lg px-2.5 py-2"
                  style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)' }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: 'rgba(249,115,22,0.65)' }}>YOU LAG</p>
                  {data.weaknessesVsPeers.map((w, i) => (
                    <p key={i} className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-55)' }}>· {w}</p>
                  ))}
                </div>
              )}
              {data.competitiveThreat && (
                <p className="text-[10px] italic px-1" style={{ color: 'var(--alpha-text-35)' }}>
                  Main competitor: {data.competitiveThreat}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── F. Company Transition Strategy — previously never shown ──────────────────

const TransitionSection: React.FC<{ data: BehavioralPersonalizationResult['companyTransition'] }> = ({ data }) => {
  const [showObjections, setShowObjections] = useState(false);
  if (data.dynamic === 'unknown_transition') return null;

  const dynamicLabel = data.dynamic.replace(/_/g, ' → ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)' }}>
          <Building2 className="w-3.5 h-3.5" style={{ color: '#22d3ee' }} />
        </div>
        <div>
          <p style={SECTION_LABEL}>COMPANY TRANSITION</p>
          <span className="text-[10px] font-bold" style={{ color: '#22d3ee' }}>{dynamicLabel}</span>
        </div>
      </div>

      <div className="rounded-lg px-3 py-2 mb-2"
        style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}>
        <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(34,211,238,0.60)' }}>YOUR NARRATIVE</p>
        <p className="text-[11px] leading-relaxed italic" style={{ color: 'var(--alpha-text-70)' }}>
          {data.narrativeRequired}
        </p>
      </div>

      {data.targetCompanyScreenFilter && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--alpha-text-45)' }}>
          <span style={{ color: 'var(--alpha-text-25)', fontWeight: 700 }}>Target: </span>
          {data.targetCompanyScreenFilter}
        </p>
      )}

      {data.cultureRiskWarning && (
        <div className="rounded-lg px-2.5 py-2 mb-2 flex items-start gap-1.5"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)' }}>
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-55)' }}>
            {data.cultureRiskWarning}
          </p>
        </div>
      )}

      {(data.potentialObjections ?? []).length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowObjections(s => !s)}
            className="flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: 'var(--alpha-text-30)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showObjections ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showObjections ? 'Hide' : `Show ${data.potentialObjections.length} objections + responses`}
          </button>
          <AnimatePresence initial={false}>
            {showObjections && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}
              >
                <div className="mt-2 space-y-2">
                  {data.potentialObjections.map((obj, i) => (
                    <div key={i} className="rounded-lg px-2.5 py-2"
                      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--alpha-text-50)' }}>
                        ❓ {obj}
                      </p>
                      {data.objectionResponses?.[i] && (
                        <p className="text-[10px] leading-snug italic" style={{ color: 'var(--alpha-text-70)' }}>
                          💬 {data.objectionResponses[i]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

// ── G. Risk Profile — previously never shown ──────────────────────────────────

const RiskProfileBar: React.FC<{
  riskTolerance: string;
  rationale: string;
  weeksToReady: number;
  profileSummary: string;
}> = ({ riskTolerance, rationale, weeksToReady, profileSummary }) => {
  const riskColor = riskTolerance === 'aggressive' ? '#10b981' : riskTolerance === 'conservative' ? '#f97316' : '#22d3ee';
  const riskLabel = riskTolerance === 'aggressive' ? 'AGGRESSIVE' : riskTolerance === 'conservative' ? 'CONSERVATIVE' : 'MODERATE';

  return (
    <div className="rounded-xl px-3 py-2.5 mb-2"
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
      {/* Profile summary */}
      {profileSummary && (
        <p className="text-[10px] mb-2 pb-2" style={{ color: 'var(--alpha-text-35)', borderBottom: '1px solid var(--alpha-bg-06)' }}>
          {profileSummary}
        </p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3" style={{ color: riskColor }} />
          <span className="text-[10px] font-black" style={{ color: riskColor }}>{riskLabel} STRATEGY</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3" style={{ color: weeksToReady === 0 ? '#10b981' : '#f59e0b' }} />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-50)' }}>
            {weeksToReady === 0 ? 'Search-ready now' : `~${weeksToReady}w prep needed`}
          </span>
        </div>
      </div>
      <p className="text-[10px] mt-1.5 leading-snug" style={{ color: 'var(--alpha-text-45)' }}>
        {rationale}
      </p>
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const BehavioralIntelligencePanel: React.FC<Props> = ({ data }) => {
  const hasTrajectory = data.careerTrajectory.trajectory !== 'early' || data.careerTrajectory.trajectoryScore < 80;
  const hasGap = data.employmentGap.hasGap && data.employmentGap.gapSeverity !== 'none';
  const hasReadiness = data.interviewReadiness.score < 90;
  const hasComp = data.compensationIntelligence.deltaPercent < -15;
  const hasCompetitive = (data.competitivePositioning?.percentileEstimate ?? 100) < 85;
  const hasTransition = data.companyTransition?.dynamic && data.companyTransition.dynamic !== 'unknown_transition';

  if (!hasTrajectory && !hasGap && !hasReadiness && !hasComp && !hasCompetitive && !hasTransition) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Risk profile summary bar */}
      {data.riskTolerance && (
        <RiskProfileBar
          riskTolerance={data.riskTolerance}
          rationale={data.riskToleranceRationale}
          weeksToReady={data.weeksToSearchReady}
          profileSummary={data.profileSummary}
        />
      )}

      {/* Opening narrative */}
      {data.openingNarrative && (
        <p className="text-[11px] leading-relaxed italic mb-3" style={{ color: 'var(--alpha-text-45)' }}>
          {data.openingNarrative}
        </p>
      )}

      {hasTrajectory && <TrajectorySection data={data.careerTrajectory} />}
      {hasGap && <GapSection data={data.employmentGap} />}
      {hasReadiness && <ReadinessSection data={data.interviewReadiness} />}
      {hasComp && <CompensationSection data={data.compensationIntelligence} />}
      {hasCompetitive && data.competitivePositioning && (
        <CompetitiveSection data={data.competitivePositioning} />
      )}
      {hasTransition && data.companyTransition && (
        <TransitionSection data={data.companyTransition} />
      )}

      {/* Top blocker */}
      {data.topBlocker && (
        <div className="rounded-xl px-3 py-2.5 mt-1"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)' }}>
          <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: '#a78bfa80' }}>
            <BookOpen className="w-3 h-3 inline mr-1" />YOUR TOP BLOCKER
          </p>
          <p className="text-[11px] leading-snug" style={{ color: 'var(--alpha-text-70)' }}>
            {data.topBlocker}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default BehavioralIntelligencePanel;
