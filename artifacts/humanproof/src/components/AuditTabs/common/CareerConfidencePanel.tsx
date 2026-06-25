// CareerConfidencePanel.tsx — v13.0
// 5-pillar career readiness visualization. Shown in StrategyTab.

import React from "react";
import { motion } from "framer-motion";
import { Brain, CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";
import type { CareerConfidenceResult, ReadinessPillar } from "@/services/careerConfidenceEngine";

interface CareerConfidencePanelProps {
  confidence: CareerConfidenceResult;
}

const TIER_STYLE: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  READY:        { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', icon: <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} /> },
  MOSTLY_READY: { color: '#00d4e0', bg: 'rgba(0,212,224,0.08)',   border: 'rgba(0,212,224,0.22)',  icon: <CheckCircle className="w-4 h-4" style={{ color: '#00d4e0' }} /> },
  PREPARING:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)', icon: <Clock className="w-4 h-4" style={{ color: '#f59e0b' }} /> },
  UNREADY:      { color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)', icon: <AlertCircle className="w-4 h-4" style={{ color: '#f97316' }} /> },
  VULNERABLE:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.30)',  icon: <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} /> },
};

const pillarBarColor = (score: number) =>
  score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

const PillarRow: React.FC<{ pillar: ReadinessPillar; index: number }> = ({ pillar, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.06 }}
    className="group"
  >
    <div className="flex items-center gap-3 mb-0.5">
      <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--alpha-text-55)' }}>
        {pillar.name}
      </span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--alpha-bg-06)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${pillarBarColor(pillar.score)}, ${pillarBarColor(pillar.score)}bb)` }}
          initial={{ width: 0 }}
          animate={{ width: `${pillar.score}%` }}
          transition={{ duration: 0.6, delay: index * 0.08 }}
        />
      </div>
      <span className="text-xs w-7 text-right font-semibold flex-shrink-0" style={{ color: pillarBarColor(pillar.score) }}>
        {pillar.score}
      </span>
    </div>
    <p className="text-[10px] ml-28 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ color: 'var(--alpha-text-45)' }}>
      {pillar.topAction.slice(0, 80)}…
    </p>
  </motion.div>
);

const CareerConfidencePanel: React.FC<CareerConfidencePanelProps> = ({ confidence }) => {
  const tier = TIER_STYLE[confidence.confidenceTier] ?? TIER_STYLE.PREPARING;

  return (
    <div className="rounded-2xl p-4" style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: tier.color }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--alpha-text-85)' }}>Job-Search Readiness</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black" style={{ color: tier.color }}>
            {confidence.compositeScore}
          </span>
          <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${tier.color}15`, color: tier.color, border: `1px solid ${tier.color}28` }}>
            {confidence.confidenceTier.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Headline */}
      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>
        {confidence.readinessHeadline}
      </p>

      {/* Pillar bars */}
      <div className="space-y-3 mb-4">
        {confidence.pillars.map((pillar, i) => (
          <PillarRow key={pillar.id} pillar={pillar} index={i} />
        ))}
      </div>

      {/* Critical gap */}
      {confidence.criticalGap && (
        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
          <p className="text-[10px] font-bold tracking-wider mb-1" style={{ color: '#ef4444' }}>CRITICAL GAP</p>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--alpha-text-85)' }}>
            {confidence.criticalGap.name}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
            {confidence.criticalGap.topAction}
          </p>
          <p className="text-[10px] mt-1.5 opacity-50">Fix time: {confidence.criticalGap.timeToFix}</p>
        </div>
      )}

      {/* Key strength */}
      {confidence.keyStrength && (
        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
          <p className="text-[10px] font-bold tracking-wider mb-1" style={{ color: '#10b981' }}>KEY STRENGTH</p>
          <p className="text-xs" style={{ color: 'var(--alpha-text-70)' }}>
            <span className="font-semibold">{confidence.keyStrength.name}: </span>
            {confidence.keyStrength.topAction.slice(0, 120)}
          </p>
        </div>
      )}

      {/* Risk-confidence interpretation */}
      <div className="rounded-lg p-3" style={{ background: 'var(--alpha-bg-04)' }}>
        <p className="text-[10px] font-bold tracking-wider mb-1.5" style={{ color: 'var(--alpha-text-30)' }}>
          RISK × READINESS
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
          {confidence.riskConfidenceInterpretation}
        </p>
      </div>

      <p className="text-[10px] mt-2 text-right" style={{ color: 'var(--alpha-text-25)' }}>
        Ready in ~{confidence.estimatedReadyInDays} days with focused action
      </p>
    </div>
  );
};

export default CareerConfidencePanel;
