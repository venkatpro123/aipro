// v3/AnalysisTab.tsx — v34.0 UX redesign
//
// INTELLIGENCE tab (the 5th tab in v34 IA). Lives at the end of the IA because
// it answers "tell me MORE" not "what do I do". Contains the deep risk math
// and transparency surfaces — all behind progressive disclosure.
//
// Render order (Tier-labeled, all collapsed by default except dimensions):
//   1. Intelligence Brief (T2)        ← AI-generated synthesis (was duplicated
//                                       in Summary v33 — now lives only here)
//   2. Dual Gauge: Risk vs Ready (T2)
//   3. Risk Dimensions breakdown (T2) ← open by default — this IS the tab's job
//   4. Prediction Horizon (T3)
//   5. Scenario Fan (T3)
//   6. Methodology & Transparency (T4)← data quality, calibration, provenance

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Zap, BarChart2, Activity, BookOpen, Compass,
} from 'lucide-react';
import type { TabProps } from '../common/types';
import type { PredictionHorizonResult } from '../../../services/predictionHorizonService';
import type { ScenarioPlanResult } from '../../../services/scenarioPlanService';
import type { IntelligenceBriefResult } from '../../../services/intelligenceBriefService';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import { RiskBreakdownTab } from '../RiskBreakdownTab';
import { TransparencyTab } from '../TransparencyTab';
import AdaptiveBlock from '../common/AdaptiveBlock';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 55) return '#f97316';
  if (score >= 35) return '#f59e0b';
  return '#10b981';
}

function readinessColor(label: string): string {
  return {
    READY: '#10b981',
    MOSTLY_READY: '#22d3ee',
    PARTIAL: '#f59e0b',
    UNDERPREPARED: '#f97316',
    NOT_READY: '#dc2626',
  }[label] ?? '#f59e0b';
}

// ── Intelligence Brief (compact, no duplication of Summary) ─────────────────

const IntelligenceBriefBlock: React.FC<{
  brief: IntelligenceBriefResult | null | undefined;
  urgency: string;
}> = ({ brief, urgency }) => {
  const [expanded, setExpanded] = useState(false);

  const uc = {
    CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.30)' },
    HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.28)' },
    MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  }[urgency] ?? { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' };

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

  const first = brief.paragraphs[0] ?? '';
  const rest  = brief.paragraphs.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
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
        <span
          className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: uc.color + '22', color: uc.color, border: `1px solid ${uc.color}40` }}
        >
          {urgency}
        </span>
      </div>

      <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {first}
      </p>

      {expanded && rest.length > 0 && (
        <div className="space-y-2 mt-2">
          {rest.map((p, i) => (
            <p key={i} className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {p}
            </p>
          ))}
        </div>
      )}

      {brief.topActionThisWeek && expanded && (
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

      {(rest.length > 0 || brief.topActionThisWeek) && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 text-[10px] font-semibold tracking-wide"
          style={{ color: uc.color + 'cc' }}
        >
          {expanded ? '↑ Show less' : '↓ Read full analysis'}
        </button>
      )}
    </motion.div>
  );
};

// ── Mini Gauge ───────────────────────────────────────────────────────────────

const MiniGauge: React.FC<{
  score: number; color: string; label: string; sublabel: string;
}> = ({ score, color, label, sublabel }) => {
  const size = 80;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={7} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (score / 100) * circ }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
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

const DualGaugePanel: React.FC<{
  riskScore: number;
  preparedness: PreparednessResult | undefined;
}> = ({ riskScore, preparedness }) => {
  const rColor = scoreColor(riskScore);
  const pColor = preparedness ? readinessColor(preparedness.readinessLabel) : '#f59e0b';
  const pScore = preparedness?.overallScore ?? 0;

  const combo = riskScore >= 65 && pScore < 50
    ? { label: 'Critical Gap', color: '#dc2626', desc: 'High risk + low readiness — immediate action required' }
    : riskScore >= 65 && pScore >= 50
    ? { label: 'Manageable', color: '#f97316', desc: 'High risk but you have preparation assets to draw on' }
    : riskScore < 45 && pScore >= 65
    ? { label: 'Well Positioned', color: '#10b981', desc: 'Low risk + high readiness — build and grow' }
    : { label: 'Monitor', color: '#f59e0b', desc: 'Moderate risk — keep readiness high as a precaution' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.40)' }}>
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

// ── Horizon (compact bars) ───────────────────────────────────────────────────

const HorizonBar: React.FC<{
  label: string; score: number; confidence: number; isActive?: boolean;
}> = ({ label, score, confidence, isActive }) => {
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
            transition={{ duration: 0.8, ease: 'easeOut' }}
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

const HorizonContent: React.FC<{ horizon: PredictionHorizonResult }> = ({ horizon }) => (
  <div>
    <div className="space-y-2 mb-3">
      <HorizonBar label="30d" score={horizon.horizon30d.score} confidence={horizon.horizon30d.confidence} isActive />
      <HorizonBar label="90d" score={horizon.horizon90d.score} confidence={horizon.horizon90d.confidence} />
      <HorizonBar label="180d" score={horizon.horizon180d.score} confidence={horizon.horizon180d.confidence} />
    </div>
    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
      {horizon.trajectoryNarrative}
    </p>
  </div>
);

// ── Scenario fan ──────────────────────────────────────────────────────────────

const ScenarioContent: React.FC<{ scenario: ScenarioPlanResult }> = ({ scenario }) => {
  const cases = [
    { label: 'Bear', score: scenario.worstCase.score, prob: scenario.worstCase.probability, color: '#dc2626' },
    { label: 'Base', score: scenario.baseCase.score,  prob: scenario.baseCase.probability,  color: '#f59e0b' },
    { label: 'Bull', score: scenario.bestCase.score,  prob: scenario.bestCase.probability,  color: '#10b981' },
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {cases.map(({ label, score, prob, color }) => (
          <div key={label} className="rounded-xl p-2.5 text-center"
            style={{ background: color + '12', border: `1px solid ${color}28` }}>
            <p className="text-[9px] font-bold tracking-wider mb-1" style={{ color: color + 'cc' }}>{label.toUpperCase()}</p>
            <p className="text-xl font-black mb-0.5" style={{ color }}>{score}</p>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.40)' }}>{Math.round(prob * 100)}% likely</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-2.5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
          KEY UNCERTAINTY
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {scenario.dominantUncertainty}
        </p>
      </div>
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
    <div className="flex flex-col gap-3">

      {/* ── T2: Intelligence Brief — full text lives here only ─────────────── */}
      <IntelligenceBriefBlock brief={brief} urgency={urgencyLevel} />

      {/* ── T2: Dual Gauge — Risk vs Readiness ─────────────────────────────── */}
      <DualGaugePanel riskScore={result.total} preparedness={preparedness} />

      {/* ── T2: Risk dimensions breakdown — open by default; this is the tab's job */}
      <AdaptiveBlock
        title="Risk dimensions breakdown"
        subtitle="How each L1–L54 layer contributes to your score"
        icon={BarChart2}
        tier={2}
        accentColor="#22d3ee"
        defaultOpen
      >
        <RiskBreakdownTab result={result} companyData={companyData} />
      </AdaptiveBlock>

      {/* ── T3: Prediction Horizon ─────────────────────────────────────────── */}
      {horizon && (
        <AdaptiveBlock
          title="Prediction horizon"
          subtitle="30 / 90 / 180-day score forecasts with confidence intervals"
          icon={Compass}
          tier={3}
          accentColor="#f59e0b"
          defaultOpen={false}
          badge={horizon.groundTruthOverride ? 'WARN OVERRIDE' : undefined}
          badgeColor={horizon.groundTruthOverride ? '#dc2626' : undefined}
        >
          <HorizonContent horizon={horizon} />
        </AdaptiveBlock>
      )}

      {/* ── T3: Scenario Fan ───────────────────────────────────────────────── */}
      {scenario && (
        <AdaptiveBlock
          title="6-month scenarios"
          subtitle="Bear / base / bull outcomes with key uncertainties"
          icon={Activity}
          tier={3}
          accentColor="#f59e0b"
          defaultOpen={false}
        >
          <ScenarioContent scenario={scenario} />
        </AdaptiveBlock>
      )}

      {/* ── T4: Methodology & Transparency ────────────────────────────────── */}
      <AdaptiveBlock
        title="Methodology & transparency"
        subtitle="Data quality, signal provenance, calibration, model agreement"
        icon={BookOpen}
        tier={4}
        accentColor="#94a3b8"
        defaultOpen={false}
      >
        <TransparencyTab result={result} companyData={companyData} />
      </AdaptiveBlock>

    </div>
  );
};

export default AnalysisTab;
