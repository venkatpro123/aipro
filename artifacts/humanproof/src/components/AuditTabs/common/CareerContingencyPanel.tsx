// CareerContingencyPanel.tsx — v35.0
// Renders the 3-path career contingency plan (STAY / NEGOTIATE / TRANSITION).
// This is the most actionable output in the system — converts 54 intelligence
// layers into concrete, immediately-executable decision pathways.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, TrendingUp, ArrowRightLeft, ChevronDown, ChevronRight,
  AlertTriangle, Clock, CheckCircle2, XCircle, Zap,
} from 'lucide-react';
import type { CareerContingencyPlan, ContingencyPath, ContingencyPathId, ContingencyPathFinancialProjection } from '../../../services/careerContingencyPlanEngine';

// ── Config ────────────────────────────────────────────────────────────────────

const PATH_CONFIG: Record<ContingencyPathId, {
  Icon: React.ElementType;
  accentColor: string;
  borderColor: string;
  bgColor: string;
  badgeBg: string;
}> = {
  STAY: {
    Icon: Shield,
    accentColor: '#10b981',
    borderColor: 'rgba(16,185,129,0.30)',
    bgColor: 'rgba(16,185,129,0.06)',
    badgeBg: 'rgba(16,185,129,0.15)',
  },
  NEGOTIATE: {
    Icon: TrendingUp,
    accentColor: '#f59e0b',
    borderColor: 'rgba(245,158,11,0.30)',
    bgColor: 'rgba(245,158,11,0.06)',
    badgeBg: 'rgba(245,158,11,0.15)',
  },
  TRANSITION: {
    Icon: ArrowRightLeft,
    accentColor: '#00d4e0',
    borderColor: 'rgba(0,212,224,0.30)',
    bgColor: 'rgba(0,212,224,0.06)',
    badgeBg: 'rgba(0,212,224,0.15)',
  },
};

const URGENCY_COLORS: Record<string, string> = {
  IMMEDIATE: '#dc2626',
  URGENT:    '#f97316',
  PLANNED:   '#f59e0b',
  MONITOR:   '#10b981',
};

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#10b981',
};

// ── Sub-Components ────────────────────────────────────────────────────────────

interface FeasibilityBarProps {
  score: number;
  accentColor: string;
}

const FeasibilityBar: React.FC<FeasibilityBarProps & { isEstimate?: boolean }> = ({ score, accentColor, isEstimate }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>
          FEASIBILITY
        </span>
        {/* MED-8: show estimate indicator when feasibility is model-estimated */}
        {isEstimate && (
          <span
            title="Feasibility score is model-estimated — pending outcome calibration"
            className="text-[8px] font-bold px-1 py-0.5 rounded cursor-help"
            style={{ background: 'rgba(245,158,11,0.15)', color: 'rgba(245,158,11,0.75)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            est.
          </span>
        )}
      </div>
      <span className="text-[11px] font-black" style={{ color: accentColor }}>{score}%</span>
    </div>
    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-1.5 rounded-full"
        style={{ background: accentColor }}
      />
    </div>
  </div>
);

// GAP G: inline financial grounding row beneath the feasibility bar
const FinancialProjectionRow: React.FC<{
  projection: ContingencyPathFinancialProjection;
  pathId: ContingencyPathId;
  accentColor: string;
}> = ({ projection, pathId, accentColor }) => {
  const chips: { label: string; value: string; color?: string }[] = [];

  if (projection.estimatedWeeksToHire != null) {
    chips.push({ label: 'Search', value: `~${projection.estimatedWeeksToHire}w`, color: accentColor });
  }
  if (projection.estimatedNewSalaryPct != null) {
    const pct = projection.estimatedNewSalaryPct;
    chips.push({
      label: 'Salary',
      value: pct > 0 ? `+${pct}%` : pct < 0 ? `${pct}%` : 'flat',
      color: pct >= 0 ? '#10b981' : '#f97316',
    });
  }
  if (projection.runwayExhaustionDate) {
    const months = Math.max(0, Math.round(
      (new Date(projection.runwayExhaustionDate).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000),
    ));
    chips.push({
      label: pathId === 'TRANSITION' ? 'Post-search runway' : 'Runway',
      value: `${months}mo`,
      color: months < 3 ? '#dc2626' : months < 6 ? '#f97316' : '#10b981',
    });
  }
  if (projection.costOfLivingAdjustment != null) {
    chips.push({ label: 'CoL', value: `${projection.costOfLivingAdjustment.toFixed(1)}×` });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {chips.map((chip, i) => (
        <div key={i} className="flex items-center gap-1">
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {chip.label}
          </span>
          <span
            className="text-[10px] font-black px-1.5 py-0.5 rounded"
            style={{
              background: (chip.color ?? accentColor) + '15',
              color: chip.color ?? accentColor,
              border: `1px solid ${chip.color ?? accentColor}30`,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {chip.value}
          </span>
        </div>
      ))}
    </div>
  );
};

interface ActionListProps {
  title: string;
  actions: string[];
  accentColor: string;
  urgent?: boolean;
}

const ActionList: React.FC<ActionListProps> = ({ title, actions, accentColor, urgent }) => (
  <div className="mb-3">
    <div className="flex items-center gap-1.5 mb-2">
      {urgent ? <Zap className="w-3 h-3" style={{ color: accentColor }} /> : <CheckCircle2 className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.35)' }} />}
      <span className="text-[10px] font-semibold tracking-wider" style={{ color: urgent ? accentColor : 'rgba(255,255,255,0.45)' }}>
        {title}
      </span>
    </div>
    <div className="space-y-1.5">
      {actions.map((action, i) => (
        <div key={i} className="flex items-start gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
            style={{ background: urgent ? accentColor : 'rgba(255,255,255,0.25)' }}
          />
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {action}
          </p>
        </div>
      ))}
    </div>
  </div>
);

interface PathCardProps {
  path: ContingencyPath;
  isRecommended: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

const PathCard: React.FC<PathCardProps> = ({ path, isRecommended, isExpanded, onToggle }) => {
  const config = PATH_CONFIG[path.pathId];
  const { Icon, accentColor, borderColor, bgColor, badgeBg } = config;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden panel-hover"
      style={{
        background: bgColor,
        border: `1px solid ${isRecommended ? accentColor + '60' : borderColor}`,
        boxShadow: isRecommended
          ? `0 0 20px ${accentColor}15, var(--shadow-elev-2)`
          : 'var(--shadow-elev-1)',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: badgeBg }}
            >
              <Icon className="w-4 h-4" style={{ color: accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {path.label}
                </span>
                {isRecommended && (
                  <span
                    className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: accentColor + '25', color: accentColor, border: `1px solid ${accentColor}50` }}
                  >
                    RECOMMENDED
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {path.tagline}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: RISK_COLORS[path.riskLevel] + '20',
                color: RISK_COLORS[path.riskLevel],
                border: `1px solid ${RISK_COLORS[path.riskLevel]}35`,
              }}
            >
              {path.riskLevel}
            </span>
            {isExpanded
              ? <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
              : <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
            }
          </div>
        </div>

        {/* Feasibility bar */}
        <div className="mt-3">
          <FeasibilityBar score={path.feasibilityScore} accentColor={accentColor} isEstimate={path.feasibilityCalibrationStatus === 'developer_estimate'} />
          {path.financialProjection && (
            <FinancialProjectionRow
              projection={path.financialProjection}
              pathId={path.pathId}
              accentColor={accentColor}
            />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4"
              style={{ borderTop: `1px solid ${borderColor}` }}
            >
              <div className="pt-3 space-y-1">
                {/* Actions */}
                <ActionList
                  title="NEXT 7 DAYS"
                  actions={path.immediateActions}
                  accentColor={accentColor}
                  urgent
                />
                <ActionList
                  title="NEXT 1–3 MONTHS"
                  actions={path.shortTermActions}
                  accentColor={accentColor}
                />

                {/* Success indicators */}
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-3 h-3" style={{ color: '#10b981' }} />
                    <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      SUCCESS LOOKS LIKE
                    </span>
                  </div>
                  <div className="space-y-1">
                    {path.successIndicators.map((s, i) => (
                      <p key={i} className="text-[11px]" style={{ color: 'rgba(255,255,255,0.60)' }}>
                        ✓ {s}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Key risks */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <XCircle className="w-3 h-3" style={{ color: '#f97316' }} />
                    <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      KEY RISKS
                    </span>
                  </div>
                  <div className="space-y-1">
                    {path.keyRisks.map((r, i) => (
                      <p key={i} className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        ⚠ {r}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

interface CareerContingencyPanelProps {
  contingencyPlan: CareerContingencyPlan;
}

const CareerContingencyPanel: React.FC<CareerContingencyPanelProps> = ({ contingencyPlan }) => {
  const [expandedPath, setExpandedPath] = useState<ContingencyPathId | null>(contingencyPlan.recommendedPath);

  const urgencyColor = URGENCY_COLORS[contingencyPlan.urgencyLevel] ?? '#f59e0b';

  const paths: ContingencyPath[] = [
    contingencyPlan.stayPath,
    contingencyPlan.negotiatePath,
    contingencyPlan.transitionPath,
  ];

  const togglePath = (id: ContingencyPathId) => {
    setExpandedPath(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.92)' }}>
              Career Contingency Plan
            </h3>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.50)' }}>
              3 executable paths — decide, prepare, or combine
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
              style={{ background: urgencyColor + '18', border: `1px solid ${urgencyColor}35` }}
            >
              {contingencyPlan.urgencyLevel === 'IMMEDIATE' && <AlertTriangle className="w-3 h-3" style={{ color: urgencyColor }} />}
              {contingencyPlan.urgencyLevel !== 'IMMEDIATE' && <Clock className="w-3 h-3" style={{ color: urgencyColor }} />}
              <span className="text-[10px] font-black tracking-wider" style={{ color: urgencyColor }}>
                {contingencyPlan.urgencyLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Synthesis narrative */}
        <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.68)' }}>
          {contingencyPlan.synthesisNarrative}
        </p>

        {/* Decision framework */}
        <div
          className="mt-3 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[11px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Why {contingencyPlan.recommendedPath} is recommended ({Math.round(contingencyPlan.pathConfidence * 100)}% confidence)
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {contingencyPlan.decisionFramework}
          </p>
        </div>

        {/* Critical decision date */}
        <div className="flex items-center gap-2 mt-3">
          <Clock className="w-3 h-3" style={{ color: urgencyColor }} />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Critical decision date:{' '}
            <span className="font-semibold" style={{ color: urgencyColor }}>
              {new Date(contingencyPlan.criticalDecisionDate).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
          </span>
        </div>
      </div>

      {/* Path cards */}
      <div className="space-y-3">
        {paths.map((path) => (
          <PathCard
            key={path.pathId}
            path={path}
            isRecommended={path.pathId === contingencyPlan.recommendedPath}
            isExpanded={expandedPath === path.pathId}
            onToggle={() => togglePath(path.pathId)}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-center px-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Paths are not mutually exclusive — you can prepare for TRANSITION while pursuing STAY or NEGOTIATE.
      </p>
    </div>
  );
};

export default CareerContingencyPanel;
