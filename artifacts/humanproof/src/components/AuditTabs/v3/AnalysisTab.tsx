// v3/AnalysisTab.tsx — v28.0 UX redesign
// "Risk Analysis" tab — the second tab in the 4-tab v3 dashboard.
// Shows the quantitative risk picture: dual gauge, risk dimensions, prediction, scenarios.
// The executive brief / score hero lives in SummaryTab (first tab).
//
// Layout (top → bottom):
//   1. Dual Gauge — Risk vs. Preparedness (hero for this tab)
//   2. Risk Dimensions — L1–L5 breakdown (always visible bar chart)
//   3. Prediction Horizon — 30d / 90d / 180d compact strip
//   4. Scenario Fan — bear / base / bull (collapsible)
//   5. Full score & confidence deep dive (collapsible → RiskBreakdownTab only, NOT OverviewTab)

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, ChevronDown, ChevronRight,
  Zap, AlertTriangle, CheckCircle2, Clock, BarChart2,
  Activity, Shield,
} from 'lucide-react';
import type { TabProps } from '../common/types';
import type { PredictionHorizonResult } from '../../../services/predictionHorizonService';
import type { ScenarioPlanResult } from '../../../services/scenarioPlanService';
import type { IntelligenceBriefResult } from '../../../services/intelligenceBriefService';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import { RiskBreakdownTab } from '../RiskBreakdownTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 55) return '#f97316';
  if (score >= 35) return '#f59e0b';
  return '#10b981';
}

function readinessColor(label: string): string {
  const map: Record<string, string> = {
    READY: '#10b981',
    MOSTLY_READY: '#22d3ee',
    PARTIAL: '#f59e0b',
    UNDERPREPARED: '#f97316',
    NOT_READY: '#dc2626',
  };
  return map[label] ?? '#f59e0b';
}

// ── Intelligence Brief ────────────────────────────────────────────────────────

interface IntelligenceBriefHeroProps {
  brief: IntelligenceBriefResult | null | undefined;
  urgencyLevel: string;
}

const IntelligenceBriefHero: React.FC<IntelligenceBriefHeroProps> = ({ brief, urgencyLevel }) => {
  const urgencyColors: Record<string, { color: string; bg: string; border: string }> = {
    CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.30)' },
    HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.28)' },
    MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  };
  const uc = urgencyColors[urgencyLevel] ?? urgencyColors.MODERATE;

  if (!brief) {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4" style={{ color: 'rgba(0,212,224,0.6)' }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
            INTELLIGENCE BRIEF
          </span>
        </div>
        <div className="space-y-2">
          {[70, 85, 60].map((w, i) => (
            <div key={i} className="h-3 rounded-full animate-pulse" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.06)' }} />
          ))}
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
          AI analysis generating…
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: uc.bg, border: `1px solid ${uc.border}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: uc.color }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: uc.color + 'cc' }}>
            INTELLIGENCE BRIEF
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: uc.color + '22', color: uc.color, border: `1px solid ${uc.color}40` }}
          >
            {urgencyLevel}
          </span>
          {brief.fromCache && (
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>cached</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {brief.paragraphs.map((paragraph, i) => (
          <p key={i} className="text-[12px] leading-relaxed" style={{ color: i === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.65)' }}>
            {paragraph}
          </p>
        ))}
      </div>

      {brief.topActionThisWeek && (
        <div
          className="mt-3 p-3 rounded-xl flex items-start gap-2"
          style={{ background: uc.color + '12', border: `1px solid ${uc.color}25` }}
        >
          <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: uc.color }} />
          <div>
            <p className="text-[9px] font-bold tracking-wider mb-0.5" style={{ color: uc.color }}>
              TOP ACTION THIS WEEK
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)' }}>
              {brief.topActionThisWeek}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ── Dual Gauge ────────────────────────────────────────────────────────────────

interface MiniGaugeProps {
  score: number;
  color: string;
  label: string;
  sublabel: string;
  size?: number;
}

const MiniGauge: React.FC<MiniGaugeProps> = ({ score, color, label, sublabel, size = 80 }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (score / 100) * circ }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black" style={{ color }}>{score}</span>
          <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.35)' }}>/100</span>
        </div>
      </div>
      <p className="text-[11px] font-bold text-center" style={{ color: 'rgba(255,255,255,0.82)' }}>{label}</p>
      <p className="text-[9px] text-center" style={{ color: 'rgba(255,255,255,0.40)' }}>{sublabel}</p>
    </div>
  );
};

interface DualGaugePanelProps {
  riskScore: number;
  preparedness: PreparednessResult | undefined;
  urgencyLevel: string;
}

const DualGaugePanel: React.FC<DualGaugePanelProps> = ({ riskScore, preparedness, urgencyLevel }) => {
  const rColor = scoreColor(riskScore);
  const pColor = preparedness ? readinessColor(preparedness.readinessLabel) : '#f59e0b';
  const pScore = preparedness?.overallScore ?? 0;

  // Interpretation of the combination
  const combo = riskScore >= 65 && pScore < 50
    ? { label: 'Critical Gap', color: '#dc2626', desc: 'High risk + low readiness — immediate action required' }
    : riskScore >= 65 && pScore >= 50
    ? { label: 'Manageable', color: '#f97316', desc: 'High risk but you have preparation assets to draw on' }
    : riskScore < 45 && pScore >= 65
    ? { label: 'Well Positioned', color: '#10b981', desc: 'Low risk + high readiness — build and grow' }
    : { label: 'Monitor', color: '#f59e0b', desc: 'Moderate risk — keep readiness high as a precaution' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
        RISK vs. READINESS
      </p>

      <div className="flex items-end justify-center gap-8 mb-3">
        <MiniGauge score={riskScore} color={rColor} label="Layoff Risk" sublabel="probability index" />
        <div className="pb-10 flex flex-col items-center">
          <span className="text-lg font-black" style={{ color: combo.color }}>VS</span>
        </div>
        <MiniGauge score={pScore} color={pColor} label="Preparedness" sublabel="readiness index" />
      </div>

      <div
        className="flex items-center gap-2 rounded-xl p-2.5"
        style={{ background: combo.color + '12', border: `1px solid ${combo.color}25` }}
      >
        <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ background: combo.color }} />
        <div>
          <p className="text-[11px] font-bold" style={{ color: combo.color }}>{combo.label}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{combo.desc}</p>
        </div>
      </div>
    </motion.div>
  );
};

// ── Prediction Horizon ────────────────────────────────────────────────────────

interface HorizonBarProps {
  label: string;
  score: number;
  confidence: number;
  dominantSignal: string;
  isActive?: boolean;
}

const HorizonBar: React.FC<HorizonBarProps> = ({ label, score, confidence, dominantSignal, isActive }) => {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold w-10 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.50)' }}>
        {label}
      </span>
      <div className="flex-1 relative">
        <div className="h-5 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="h-5 rounded-lg flex items-center pl-2"
            style={{ background: color + (isActive ? 'dd' : '88') }}
          >
            <span className="text-[9px] font-black" style={{ color: 'white' }}>{score}</span>
          </motion.div>
        </div>
      </div>
      <span className="text-[9px] w-12 text-right flex-shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }}>
        {Math.round(confidence * 100)}% CI
      </span>
    </div>
  );
};

interface PredictionHorizonPanelMiniProps {
  horizon: PredictionHorizonResult;
}

const PredictionHorizonPanelMini: React.FC<PredictionHorizonPanelMiniProps> = ({ horizon }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="rounded-2xl p-4"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
  >
    <div className="flex items-center gap-2 mb-3">
      <BarChart2 className="w-4 h-4" style={{ color: 'rgba(0,212,224,0.7)' }} />
      <p className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.40)' }}>
        PREDICTION HORIZON
      </p>
      {horizon.groundTruthOverride && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(220,38,38,0.20)', color: '#dc2626' }}>
          WARN OVERRIDE
        </span>
      )}
    </div>
    <div className="space-y-2 mb-3">
      <HorizonBar label="30d" score={horizon.horizon30d.score} confidence={horizon.horizon30d.confidence} dominantSignal={horizon.horizon30d.dominantSignal} isActive />
      <HorizonBar label="90d" score={horizon.horizon90d.score} confidence={horizon.horizon90d.confidence} dominantSignal={horizon.horizon90d.dominantSignal} />
      <HorizonBar label="180d" score={horizon.horizon180d.score} confidence={horizon.horizon180d.confidence} dominantSignal={horizon.horizon180d.dominantSignal} />
    </div>
    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
      {horizon.trajectoryNarrative}
    </p>
  </motion.div>
);

// ── Scenario Fan ──────────────────────────────────────────────────────────────

interface ScenarioFanProps {
  scenario: ScenarioPlanResult;
}

const ScenarioFan: React.FC<ScenarioFanProps> = ({ scenario }) => {
  const cases = [
    { label: 'Bear', score: scenario.worstCase.score, prob: scenario.worstCase.probability, color: '#dc2626', actions: scenario.worstCase.recommendedActions.slice(0, 2) },
    { label: 'Base', score: scenario.baseCase.score, prob: scenario.baseCase.probability, color: '#f59e0b', actions: scenario.baseCase.recommendedActions.slice(0, 2) },
    { label: 'Bull', score: scenario.bestCase.score, prob: scenario.bestCase.probability, color: '#10b981', actions: scenario.bestCase.recommendedActions.slice(0, 2) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4" style={{ color: 'rgba(245,158,11,0.7)' }} />
        <p className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.40)' }}>
          6-MONTH SCENARIOS
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {cases.map(({ label, score, prob, color }) => (
          <div
            key={label}
            className="rounded-xl p-2.5 text-center"
            style={{ background: color + '12', border: `1px solid ${color}28` }}
          >
            <p className="text-[9px] font-bold tracking-wider mb-1" style={{ color: color + 'cc' }}>{label.toUpperCase()}</p>
            <p className="text-xl font-black mb-0.5" style={{ color }}>{score}</p>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.40)' }}>{Math.round(prob * 100)}% likely</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-2.5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
          KEY UNCERTAINTY
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {scenario.dominantUncertainty}
        </p>
      </div>
    </motion.div>
  );
};

// ── Collapsible Section ───────────────────────────────────────────────────────

interface CollapsibleProps {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Collapsible: React.FC<CollapsibleProps> = ({ title, icon: Icon, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.40)' }} />
          <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>{title}</span>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.30)' }} />
          : <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.30)' }} />
        }
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
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const AnalysisTab: React.FC<TabProps> = ({ result, companyData }) => {
  const r = result as any;

  const horizon: PredictionHorizonResult | undefined   = r.predictionHorizon;
  const scenario: ScenarioPlanResult | undefined       = r.scenarioPlan;
  const preparedness: PreparednessResult | undefined   = r.preparednessScore;
  const brief: IntelligenceBriefResult | null | undefined = r.intelligenceBrief;
  const urgencyLevel = brief?.urgencyLevel ?? (result.total >= 75 ? 'HIGH' : result.total >= 55 ? 'MODERATE' : 'LOW');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)' }}>

      {/* 1. Dual Gauge — Risk vs. Readiness hero for this tab */}
      <DualGaugePanel
        riskScore={result.total}
        preparedness={preparedness}
        urgencyLevel={urgencyLevel}
      />

      {/* 2. Risk Dimensions — always visible; this IS the purpose of this tab */}
      <Collapsible title="Risk dimensions breakdown" icon={BarChart2} defaultOpen>
        <RiskBreakdownTab result={result} companyData={companyData} />
      </Collapsible>

      {/* 3. Prediction Horizon */}
      {horizon && <PredictionHorizonPanelMini horizon={horizon} />}

      {/* 4. Scenario Fan — collapsed by default; users expand when they want depth */}
      {scenario && (
        <Collapsible title="6-month scenario planning" icon={Activity}>
          <div className="p-4">
            <ScenarioFan scenario={scenario} />
          </div>
        </Collapsible>
      )}

    </div>
  );
};
