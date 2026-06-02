// CareerVelocityPanel.tsx — v2.0
// Career trajectory score, plateau risk, internal visibility, seniority.
// v2.0: surfaces velocityActions, compensationGrowthNote, replaceabilityNote —
// previously computed but silently discarded. Fixes confusing score label.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, TrendingUp, Minus, TrendingDown, Eye,
  DollarSign, ChevronDown, ChevronUp, Zap, Clock, Calendar,
} from 'lucide-react';
import type { CareerVelocityResult, CareerTrajectory } from '../../../services/careerVelocityEngine';

interface CareerVelocityPanelProps {
  velocity: CareerVelocityResult;
}

const TRAJECTORY_CONFIG: Record<CareerTrajectory, { icon: React.ReactNode; label: string; color: string }> = {
  ACCELERATING: { icon: <TrendingUp className="w-4 h-4" />,    label: 'Accelerating',  color: '#10b981' },
  STEADY:       { icon: <TrendingUp className="w-4 h-4" />,    label: 'Steady',         color: '#3b82f6' },
  PLATEAUED:    { icon: <Minus className="w-4 h-4" />,         label: 'Plateaued',      color: '#f59e0b' },
  DECLINING:    { icon: <TrendingDown className="w-4 h-4" />,  label: 'Declining',      color: '#ef4444' },
  UNKNOWN:      { icon: <Minus className="w-4 h-4" />,         label: 'Unknown',        color: 'rgba(255,255,255,0.40)' },
};

const PLATEAU_COLORS: Record<string, { text: string; bg: string }> = {
  HIGH:   { text: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  MEDIUM: { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  LOW:    { text: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  NONE:   { text: '#10b981', bg: 'rgba(16,185,129,0.06)' },
};

const COMP_SIGNAL_COLORS: Record<string, string> = {
  STRONG:   '#10b981',
  ADEQUATE: '#3b82f6',
  LAGGING:  '#f59e0b',
  STAGNANT: '#ef4444',
  UNKNOWN:  'rgba(255,255,255,0.35)',
};

const URGENCY_CONFIG = {
  immediate:    { label: 'This week',  color: '#ef4444', icon: Zap },
  within_30d:   { label: '30 days',   color: '#f97316', icon: Calendar },
  within_90d:   { label: '90 days',   color: '#f59e0b', icon: Clock },
};

const CareerVelocityPanel: React.FC<CareerVelocityPanelProps> = ({ velocity }) => {
  const [showActions, setShowActions] = useState(
    // Auto-open when there are immediate actions
    (velocity.velocityActions ?? []).some(a => a.urgency === 'immediate'),
  );
  const [showCompDetails, setShowCompDetails] = useState(false);

  const traj = TRAJECTORY_CONFIG[velocity.trajectory] ?? TRAJECTORY_CONFIG.UNKNOWN;
  const plateau = PLATEAU_COLORS[velocity.plateauRisk] ?? PLATEAU_COLORS.MEDIUM;
  const mainColor = traj.color;

  // Panel background tracks trajectory severity
  const bgColor = velocity.trajectory === 'ACCELERATING'  ? 'rgba(16,185,129,0.06)'
    : velocity.trajectory === 'STEADY'                    ? 'rgba(59,130,246,0.06)'
    : velocity.trajectory === 'PLATEAUED'                 ? 'rgba(245,158,11,0.07)'
    : velocity.trajectory === 'DECLINING'                 ? 'rgba(239,68,68,0.07)'
    : 'rgba(255,255,255,0.03)';

  const borderColor = velocity.trajectory === 'ACCELERATING' ? 'rgba(16,185,129,0.20)'
    : velocity.trajectory === 'STEADY'                       ? 'rgba(59,130,246,0.20)'
    : velocity.trajectory === 'PLATEAUED'                    ? 'rgba(245,158,11,0.22)'
    : velocity.trajectory === 'DECLINING'                    ? 'rgba(239,68,68,0.22)'
    : 'rgba(255,255,255,0.08)';

  const compColor = COMP_SIGNAL_COLORS[velocity.compensationGrowthSignal] ?? COMP_SIGNAL_COLORS.UNKNOWN;
  const actions = velocity.velocityActions ?? [];
  const immediateActions = actions.filter(a => a.urgency === 'immediate');
  const otherActions = actions.filter(a => a.urgency !== 'immediate');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4" style={{ color: mainColor }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Career Velocity
          </span>
        </div>
        {/* v2.0: replaced confusing "RISK N/100" label with the trajectory label */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${mainColor}18`, color: mainColor, border: `1px solid ${mainColor}30` }}
          >
            {traj.label.toUpperCase()}
          </span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
            risk {velocity.velocityScore}/100
          </span>
        </div>
      </div>

      {/* ── Seniority + trajectory ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5" style={{ color: traj.color }}>
          {traj.icon}
          <span className="text-sm font-bold">{traj.label}</span>
        </div>
        <div
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
        >
          {velocity.careerStageProfile.seniorityLabel}
        </div>
        <div
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{
            background: velocity.careerStageProfile.optionality === 'HIGH'
              ? 'rgba(16,185,129,0.10)' : velocity.careerStageProfile.optionality === 'MEDIUM'
              ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)',
            color: velocity.careerStageProfile.optionality === 'HIGH'
              ? '#10b981' : velocity.careerStageProfile.optionality === 'MEDIUM'
              ? '#f59e0b' : '#ef4444',
          }}
        >
          {velocity.careerStageProfile.optionality} optionality
        </div>
      </div>

      {/* ── Key metrics grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2 text-center" style={{ background: plateau.bg }}>
          <div className="text-[10px] font-bold" style={{ color: plateau.text }}>
            {velocity.plateauRisk}
          </div>
          <div className="text-[10px] opacity-40 mt-0.5">Plateau Risk</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="text-sm font-bold"
            style={{ color: velocity.internalVisibilityScore >= 60 ? '#10b981' : velocity.internalVisibilityScore >= 40 ? '#f59e0b' : '#f97316' }}
          >
            {velocity.internalVisibilityScore}
          </div>
          <div className="text-[10px] opacity-40 mt-0.5">Visibility</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="text-[10px] font-bold"
            style={{
              color: velocity.replaceabilityEstimate === 'RARE_SPECIALIST' ? '#10b981'
                : velocity.replaceabilityEstimate === 'COMMODITY' ? '#ef4444' : 'rgba(255,255,255,0.75)',
            }}
          >
            {velocity.replaceabilityEstimate === 'RARE_SPECIALIST' ? 'Rare'
              : velocity.replaceabilityEstimate === 'SKILLED_GENERALIST' ? 'Skilled'
              : velocity.replaceabilityEstimate === 'COMMODITY' ? 'Commodity'
              : '?'}
          </div>
          <div className="text-[10px] opacity-40 mt-0.5">Position</div>
        </div>
      </div>

      {/* ── Replaceability note — v2.0: now shown ─────────────────────────── */}
      {velocity.replaceabilityNote && velocity.replaceabilityEstimate !== 'UNKNOWN' && (
        <div
          className="rounded-lg px-2.5 py-2 mb-2.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
            {velocity.replaceabilityNote}
          </p>
        </div>
      )}

      {/* ── Promotion note — now uses industry+role benchmark when available ─ */}
      <div className="rounded-lg px-2.5 py-2 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {velocity.promotionNote}
        </p>
      </div>

      {/* ── Role tenure ────────────────────────────────────────────────────── */}
      <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>ROLE TENURE</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{
              background: velocity.currentRoleTenureRisk === 'OPTIMAL' ? 'rgba(16,185,129,0.15)' :
                velocity.currentRoleTenureRisk === 'HIGH' ? 'rgba(239,68,68,0.15)' :
                velocity.currentRoleTenureRisk === 'TOO_EARLY' ? 'rgba(245,158,11,0.15)' :
                'rgba(59,130,246,0.15)',
              color: velocity.currentRoleTenureRisk === 'OPTIMAL' ? '#10b981' :
                velocity.currentRoleTenureRisk === 'HIGH' ? '#ef4444' :
                velocity.currentRoleTenureRisk === 'TOO_EARLY' ? '#f59e0b' :
                '#3b82f6',
            }}
          >
            {velocity.currentRoleTenureRisk.replace('_', ' ')}
          </span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
          {velocity.currentRoleTenureNote}
        </p>
      </div>

      {/* ── Internal visibility ────────────────────────────────────────────── */}
      <div className="flex items-start gap-1.5 mb-2.5">
        <Eye
          className="w-3 h-3 mt-0.5 flex-shrink-0"
          style={{ color: velocity.internalVisibilityScore >= 60 ? '#10b981' : velocity.internalVisibilityScore >= 40 ? '#f59e0b' : 'rgba(255,255,255,0.35)' }}
        />
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
          {velocity.internalVisibilityNote}
        </p>
      </div>

      {/* ── Compensation growth — v2.0: now shown ─────────────────────────── */}
      {velocity.compensationGrowthSignal !== 'UNKNOWN' && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => setShowCompDetails(c => !c)}
            className="flex items-center gap-1.5 w-full text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <DollarSign className="w-3 h-3 flex-shrink-0" style={{ color: compColor }} />
            <span className="text-[10px] font-bold flex-1" style={{ color: compColor }}>
              Comp Growth: {velocity.compensationGrowthSignal}
            </span>
            {showCompDetails
              ? <ChevronUp className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.28)' }} />
              : <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.28)' }} />}
          </button>
          <AnimatePresence initial={false}>
            {showCompDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <p className="text-[10px] leading-relaxed mt-1.5" style={{ color: 'rgba(255,255,255,0.50)' }}>
                  {velocity.compensationGrowthNote}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Velocity actions — v2.0: now shown, was completely hidden ─────── */}
      {actions.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
          <button
            type="button"
            onClick={() => setShowActions(a => !a)}
            className="flex items-center gap-1.5 w-full text-left mb-1"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Zap className="w-3 h-3 flex-shrink-0" style={{ color: immediateActions.length > 0 ? '#ef4444' : '#f59e0b' }} />
            <span
              className="text-[10px] font-bold flex-1"
              style={{ color: immediateActions.length > 0 ? '#ef4444' : '#f59e0b' }}
            >
              {immediateActions.length > 0
                ? `${immediateActions.length} immediate action${immediateActions.length !== 1 ? 's' : ''}`
                : `${actions.length} recommended action${actions.length !== 1 ? 's' : ''}`}
            </span>
            {showActions
              ? <ChevronUp className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.28)' }} />
              : <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.28)' }} />}
          </button>

          <AnimatePresence initial={false}>
            {showActions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="space-y-2 mt-1">
                  {actions.map((act, i) => {
                    const urg = URGENCY_CONFIG[act.urgency] ?? URGENCY_CONFIG.within_90d;
                    const UrgIcon = urg.icon;
                    return (
                      <div
                        key={i}
                        className="rounded-xl px-3 py-2.5"
                        style={{ background: `${urg.color}08`, border: `1px solid ${urg.color}22` }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <UrgIcon className="w-3 h-3 flex-shrink-0" style={{ color: urg.color }} />
                          <span className="text-[9px] font-black tracking-wide uppercase" style={{ color: urg.color }}>
                            {urg.label}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold leading-snug mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {act.action}
                        </p>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
                          {act.why}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default CareerVelocityPanel;
