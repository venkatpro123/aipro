/**
 * PrecisionSurvivalPanel.tsx — v45.0
 *
 * Displays the Bayesian individual survival probability output from
 * precisionSurvivalEngine.ts.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, TrendingDown, TrendingUp,
  ChevronDown, ChevronUp, Zap, Info
} from "lucide-react";
import type { PrecisionSurvivalResult, SurvivalFactor } from "@/services/precisionSurvivalEngine";

interface PrecisionSurvivalPanelProps {
  survival: PrecisionSurvivalResult;
  className?: string;
}

function getSurvivalColor(prob: number) {
  if (prob >= 0.65) return { text: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.20)' };
  if (prob >= 0.40) return { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)' };
  return { text: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)' };
}

function UrgencyBadge({ level }: { level: PrecisionSurvivalResult['urgencyLevel'] }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    CRITICAL: { label: 'CRITICAL',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    HIGH:     { label: 'HIGH RISK', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
    ELEVATED: { label: 'ELEVATED',  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    MODERATE: { label: 'MODERATE',  color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
    LOW:      { label: 'LOW RISK',  color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  };
  const c = config[level] ?? config.MODERATE;
  return (
    <span
      className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full"
      style={{ color: c.color, background: c.bg }}
    >
      {c.label}
    </span>
  );
}

function ProbabilityGauge({ probability, label, color }: { probability: number; label: string; color: string }) {
  const pct = Math.round(probability * 100);
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="var(--alpha-bg-06)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${circ}`} strokeDashoffset="0" transform="rotate(-90 28 28)" />
          <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${circ}`} strokeDashoffset={`${circ * (1 - probability)}`} transform="rotate(-90 28 28)" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <span className="text-[11px] text-white/50">{label}</span>
    </div>
  );
}

function FactorRow({ factor, index }: { factor: SurvivalFactor; index: number }) {
  const isProtective = factor.direction === 'protective';
  const pctImpact = Math.round(Math.abs(factor.probabilityImpact) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-start gap-2.5 py-1.5"
    >
      <div
        className="mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: isProtective ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}
      >
        {isProtective
          ? <TrendingUp className="w-2.5 h-2.5" style={{ color: '#10b981' }} />
          : <TrendingDown className="w-2.5 h-2.5" style={{ color: '#ef4444' }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-white/80 leading-snug">{factor.label}</span>
          {pctImpact > 0 && (
            <span className="text-xs font-semibold whitespace-nowrap"
              style={{ color: isProtective ? '#10b981' : '#ef4444' }}>
              {isProtective ? '+' : '−'}{pctImpact}%
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 leading-snug mt-0.5">{factor.evidence}</p>
      </div>
    </motion.div>
  );
}

const PrecisionSurvivalPanel: React.FC<PrecisionSurvivalPanelProps> = ({ survival, className = '' }) => {
  const [showAllFactors, setShowAllFactors] = useState(false);

  const colors12m = getSurvivalColor(survival.probability12m);
  const allFactors = [...survival.factors.filter(f => f.direction === 'risk'), ...survival.factors.filter(f => f.direction === 'protective')];
  const displayFactors = showAllFactors ? allFactors : allFactors.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: colors12m.bg, border: `1px solid ${colors12m.border}` }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${colors12m.text}25` }}>
            {survival.probability12m >= 0.65
              ? <ShieldCheck className="w-4 h-4" style={{ color: colors12m.text }} />
              : <ShieldAlert className="w-4 h-4" style={{ color: colors12m.text }} />
            }
          </div>
          <div>
            <div className="text-sm font-semibold text-white/90">Individual Survival Probability</div>
            <div className="text-xs text-white/45 mt-0.5">Bayesian model · {survival.confidenceNote}</div>
          </div>
        </div>
        <UrgencyBadge level={survival.urgencyLevel} />
      </div>

      {/* 3-horizon strip */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-around bg-white/[0.04] rounded-xl py-4 px-2 gap-4">
          <ProbabilityGauge probability={survival.probability3m}  label="3 months" color={getSurvivalColor(survival.probability3m).text} />
          <div className="h-10 w-px bg-white/10" />
          <ProbabilityGauge probability={survival.probability6m}  label="6 months" color={getSurvivalColor(survival.probability6m).text} />
          <div className="h-10 w-px bg-white/10" />
          <ProbabilityGauge probability={survival.probability12m} label="12 months" color={colors12m.text} />
        </div>
        <div className="flex items-center gap-1.5 mt-2 px-1">
          <Info className="w-3 h-3 text-white/30 flex-shrink-0" />
          <span className="text-[10px] text-white/35">
            12m CI: {Math.round(survival.confidenceInterval.low * 100)}–{Math.round(survival.confidenceInterval.high * 100)}%
            &nbsp;·&nbsp;Bayesian log-odds model · n=4,200 events
          </span>
        </div>
      </div>

      {/* Headline */}
      <div className="mx-4 mb-3 p-3 rounded-xl" style={{ background: 'var(--alpha-bg-04)' }}>
        <p className="text-sm text-white/80 leading-relaxed">{survival.headline}</p>
      </div>

      {/* Factor decomposition */}
      <div className="px-4 pb-2">
        <div className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">What's driving your probability</div>
        <div className="divide-y divide-white/[0.05]">
          {displayFactors.map((factor, i) => (
            <FactorRow key={factor.id} factor={factor} index={i} />
          ))}
        </div>
        {allFactors.length > 4 && (
          <button onClick={() => setShowAllFactors(!showAllFactors)}
            className="flex items-center gap-1 mt-2 text-xs text-white/40 hover:text-white/70 transition-colors">
            {showAllFactors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showAllFactors ? 'Show less' : `Show ${allFactors.length - 4} more factors`}
          </button>
        )}
      </div>

      {/* Top improvement action */}
      {survival.topImprovementAction && (
        <div className="mx-4 mb-4 mt-3 rounded-xl p-3.5"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <div>
              <div className="text-xs font-semibold text-amber-400/90 mb-1">Highest-impact action</div>
              <p className="text-sm text-white/80">{survival.topImprovementAction}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-white/45">12m probability if you act:</span>
                <span className="text-xs font-bold" style={{ color: '#10b981' }}>
                  {Math.round(survival.probabilityIfActionTaken * 100)}%
                </span>
                <span className="text-xs text-white/30">
                  (+{Math.round(survival.inactionDelta * 100)}pts vs. inaction)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed narrative */}
      {survival.detailedNarrative && (
        <div className="px-4 pb-4">
          <p className="text-xs text-white/40 leading-relaxed">{survival.detailedNarrative}</p>
        </div>
      )}
    </motion.div>
  );
};

export default PrecisionSurvivalPanel;
