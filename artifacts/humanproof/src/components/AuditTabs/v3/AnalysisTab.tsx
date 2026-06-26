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

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Zap, BarChart2, Activity, Compass, AlertOctagon, TrendingDown,
} from 'lucide-react';
import { PatternMatchCard } from '../../PatternMatchCard';
import { computeScoreSufficiency } from '../../../lib/scoreGate';
import type { TabProps } from '../common/types';
import type { PredictionHorizonResult } from '../../../services/predictionHorizonService';
import type { ScenarioPlanResult } from '../../../services/scenarioPlanService';
import type { IntelligenceBriefResult } from '../../../services/intelligenceBriefService';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import { RiskBreakdownTab } from '../RiskBreakdownTab';
import AdaptiveBlock from '../common/AdaptiveBlock';
import { ScoreSensitivityPanel } from '../common/ScoreSensitivityPanel';
import { AIReasoningPanel, buildDimensionsFromResult } from '../common/AIReasoningPanel';
import { ScenarioExplorer } from '../common/ScenarioExplorer';
import { SignalCorrelationInsight } from '../common/SignalCorrelationInsight';
import { DisplacementTrajectoryPanel } from '../../LayoffCalculator/DisplacementTrajectoryPanel';

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

// Wave 2.6 — Maps career years (numeric) to the experience band string that
// DisplacementTrajectoryEngine's EXPERIENCE_MODIFIER table expects.
function experienceBand(years: number | undefined): '0-2' | '2-5' | '5-10' | '10-15' | '15+' {
  if (years == null) return '5-10';
  if (years <= 2)  return '0-2';
  if (years <= 5)  return '2-5';
  if (years <= 10) return '5-10';
  if (years <= 15) return '10-15';
  return '15+';
}

// ── Intelligence Brief (compact, no duplication of Summary) ─────────────────

const EVIDENCE_FLOOR_PCT = 40;

const IntelligenceBriefBlock: React.FC<{
  brief: IntelligenceBriefResult | null | undefined;
  urgency: string;
  auditStage?: string;
  confidence?: number;
  freshnessierTier?: string;
  companyName?: string;
  /** Deterministic first-paint summary shown while the LLM brief is still being written. */
  interimSummary?: string;
}> = ({ brief, urgency, auditStage, confidence, freshnessierTier, companyName, interimSummary }) => {
  const [expanded, setExpanded] = useState(false);

  const uc = {
    CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.30)' },
    HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.28)' },
    MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  }[urgency] ?? { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' };

  // Gate 1 (hard): heuristic tier — no live data, brief would be sector-generic prose.
  if (freshnessierTier === 'heuristic') {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'rgba(15,23,42,0.60)', border: '1px solid rgba(148,163,184,0.22)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4" style={{ color: 'rgba(148,163,184,0.45)' }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(148,163,184,0.45)' }}>
            INTELLIGENCE BRIEF
          </span>
        </div>
        <p className="text-[11px] leading-relaxed mb-1" style={{ color: 'var(--alpha-text-50)' }}>
          No live signals were retrieved{companyName ? ` for ${companyName}` : ''}. A brief
          grounded in sector averages would look specific but wouldn't be — so we're not
          generating one. Live data is resolving in the background.
        </p>
        <p className="text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>
          Sector context is still available in Market Environment below.
        </p>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" style={{ color: 'rgba(0,212,224,0.6)' }} />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--alpha-text-35)' }}>
              INTELLIGENCE BRIEF
            </span>
          </div>
          {interimSummary && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ background: 'rgba(0,212,224,0.10)', color: '#22d3ee', border: '1px solid rgba(0,212,224,0.25)', fontFamily: 'var(--font-mono)' }}>
              SIGNAL SUMMARY
            </span>
          )}
        </div>
        {interimSummary ? (
          // Deterministic first paint — the user gets a real, signal-grounded read
          // immediately, instead of staring at a skeleton that may never resolve.
          <>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--alpha-text-85)' }}>
              {interimSummary}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 rounded-full border-2 border-[rgba(0,212,224,0.15)] border-t-[#22d3ee] animate-spin" />
              <p className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
                Refining into a full AI brief from live data…
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              {[70, 85, 60].map((w, i) => (
                <div key={i} className="h-3 rounded-full animate-pulse" style={{ width: `${w}%`, background: 'var(--alpha-bg-06)' }} />
              ))}
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--alpha-text-25)' }}>
              AI analysis generating…
            </p>
          </>
        )}
        <QuorumProgressBar stageLabel={auditStage} />
      </div>
    );
  }

  // Gate 2 (soft): low confidence — render with a warning banner.
  const confidencePct = confidence ?? 100;
  const showLowConfWarning = confidencePct < EVIDENCE_FLOOR_PCT;

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
          className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: uc.color + '22', color: uc.color, border: `1px solid ${uc.color}40` }}
        >
          {urgency}
        </span>
      </div>

      {showLowConfWarning && (
        <div
          className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)' }}
        >
          <span className="text-amber-400 text-[11px] font-semibold flex-shrink-0">⚠</span>
          <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-55)' }}>
            <span className="font-semibold text-amber-400">Low confidence ({confidencePct}%). </span>
            This analysis is directional — not enough live signals resolved to write a
            company-specific brief. Statements below reflect sector patterns more than
            this specific company's current situation.
          </p>
        </div>
      )}

      <p className="text-[12px] leading-relaxed" style={{ color: showLowConfWarning ? 'var(--alpha-text-55)' : 'var(--alpha-text-85)' }}>
        {first}
      </p>

      {expanded && rest.length > 0 && (
        <div className="space-y-2 mt-2">
          {rest.map((p, i) => (
            <p key={i} className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>
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
            <p className="text-[10px] font-bold tracking-wider mb-0.5" style={{ color: uc.color }}>
              TOP ACTION THIS WEEK
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-85)' }}>
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
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--alpha-bg-06)" strokeWidth={7} />
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
          <span className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>/100</span>
        </div>
      </div>
      <p className="text-[11px] font-bold text-center" style={{ color: 'var(--alpha-text-85)' }}>{label}</p>
      <p className="text-[10px] text-center" style={{ color: 'var(--alpha-text-45)' }}>{sublabel}</p>
    </div>
  );
};

// ── Mini Gauge Range (shown when score sufficiency gate fires) ────────────────
// The circular gauge is replaced by a horizontal range bar. Showing the
// circular gauge with a point (e.g. 58) when CI spans [8, 100] would give
// the false impression that 58 is a reliable location on the risk axis.

const MiniGaugeRange: React.FC<{
  ciLow: number;
  ciHigh: number;
  label: string;
  sublabel: string;
}> = ({ ciLow, ciHigh, label, sublabel }) => {
  const worstColor =
    ciHigh >= 75 ? '#dc2626' :
    ciHigh >= 55 ? '#f97316' :
    ciHigh >= 35 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: 80 }}>
      {/* Range bar replacing the circular gauge */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{ width: 72, height: 8, background: 'var(--alpha-bg-06)' }}
        aria-label={`Risk range ${ciLow} to ${ciHigh}`}
        role="img"
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${ciLow}%`,
            width: `${ciHigh - ciLow}%`,
            background: `linear-gradient(90deg, rgba(251,191,36,0.6), ${worstColor}80)`,
            borderRadius: 9999,
            transformOrigin: 'left center',
          }}
        />
      </div>
      {/* Show bounds, not a point */}
      <div className="flex items-center gap-0.5">
        <span className="text-[11px] font-black" style={{ color: 'var(--alpha-text-50)' }}>{ciLow}</span>
        <span className="text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>–</span>
        <span className="text-[11px] font-black" style={{ color: worstColor }}>{ciHigh}</span>
      </div>
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)' }}
      >
        <AlertOctagon className="w-2.5 h-2.5" style={{ color: '#fbbf24' }} />
        <span className="text-[10px] font-bold" style={{ color: '#fbbf24' }}>RANGE</span>
      </div>
      <p className="text-[11px] font-bold text-center" style={{ color: 'var(--alpha-text-85)' }}>{label}</p>
      <p className="text-[10px] text-center" style={{ color: 'var(--alpha-text-45)' }}>{sublabel}</p>
    </div>
  );
};

const DualGaugePanel: React.FC<{
  riskScore: number;
  preparedness: PreparednessResult | undefined;
  ciLow?: number;
  ciHigh?: number;
  scoreSufficient?: boolean;
}> = ({ riskScore, preparedness, ciLow = 0, ciHigh = 100, scoreSufficient = true }) => {
  const rColor = scoreColor(riskScore);
  const pColor = preparedness ? readinessColor(preparedness.readinessLabel) : '#f59e0b';
  // Use null instead of 0 when preparedness hasn't been computed — showing 0/100
  // was misleading because it implied the user is unprepared when the engine
  // simply didn't run yet.
  const pScore = preparedness?.overallScore ?? null;
  const pScoreDisplay = pScore ?? 0;

  // Expanded combo verdict table — the original only had 4 buckets; risk 45–64
  // with any readiness level fell into the generic "Monitor" catch-all, which
  // was the same verdict for everyone in the moderate band regardless of how
  // prepared they were. Now 6 distinct verdicts cover the full grid.
  const combo = (() => {
    if (riskScore >= 75 && (pScore ?? 0) < 40)
      return { label: 'Critical Gap',    color: '#dc2626', desc: 'High risk + very low readiness — immediate action this week required' };
    if (riskScore >= 65 && (pScore ?? 0) < 50)
      return { label: 'High Risk / Low Readiness', color: '#dc2626', desc: 'Elevated risk but limited preparation buffer — prioritise readiness actions now' };
    if (riskScore >= 65 && (pScore ?? 0) >= 50)
      return { label: 'High Risk / Prepared', color: '#f97316', desc: 'Significant risk but your preparation assets give you options — activate them' };
    if (riskScore >= 45 && (pScore ?? 0) < 45)
      return { label: 'Needs Attention', color: '#f59e0b', desc: 'Moderate risk and low readiness — close the readiness gap before risk escalates' };
    if (riskScore >= 45 && (pScore ?? 0) >= 65)
      return { label: 'Risk Offset',     color: '#22d3ee', desc: 'Moderate risk but high readiness offsets it — maintain your preparation edge' };
    if (riskScore < 45 && (pScore ?? 0) >= 65)
      return { label: 'Well Positioned', color: '#10b981', desc: 'Low risk + high readiness — leverage this window to grow' };
    if (riskScore < 35)
      return { label: 'Low Risk',        color: '#10b981', desc: 'Risk is low — continue monitoring and building career capital' };
    return { label: 'Monitor',           color: '#f59e0b', desc: 'Moderate risk — keep readiness high as a precaution' };
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
    >
      <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--alpha-text-45)' }}>
        RISK vs. READINESS
      </p>
      <div className="flex items-end justify-center gap-8 mb-3">
        {/* Risk gauge: point score when sufficient, range bar when not */}
        {scoreSufficient
          ? <MiniGauge score={riskScore} color={rColor} label="Layoff Risk" sublabel="probability index" />
          : <MiniGaugeRange ciLow={ciLow} ciHigh={ciHigh} label="Layoff Risk" sublabel="range — not a point" />
        }
        <div className="pb-10 flex flex-col items-center">
          <span className="text-lg font-black" style={{ color: combo.color }}>VS</span>
        </div>
        {/* Show 0 gauge only when preparedness was actually computed (pScore != null).
            If null, show a placeholder so "0/100 Readiness" doesn't appear when the
            engine simply didn't run. */}
        {pScore !== null
          ? <MiniGauge score={pScoreDisplay} color={pColor} label="Preparedness" sublabel="readiness index" />
          : (
            <div className="flex flex-col items-center gap-1" style={{ width: 80 }}>
              <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center" style={{ borderColor: 'var(--alpha-bg-08)' }}>
                <span className="text-[10px] text-center" style={{ color: 'var(--alpha-text-35)' }}>not<br/>assessed</span>
              </div>
              <p className="text-[11px] font-bold text-center" style={{ color: 'var(--alpha-text-85)' }}>Preparedness</p>
              <p className="text-[10px] text-center" style={{ color: 'var(--alpha-text-45)' }}>complete profile</p>
            </div>
          )
        }
      </div>
      <div
        className="flex items-center gap-2 rounded-xl p-2.5"
        style={{ background: combo.color + '12', border: `1px solid ${combo.color}25` }}
      >
        <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ background: combo.color }} />
        <div>
          <p className="text-[11px] font-bold" style={{ color: combo.color }}>{combo.label}</p>
          <p className="text-[10px]" style={{ color: 'var(--alpha-text-50)' }}>
            {scoreSufficient ? combo.desc : `Score range ${ciLow}–${ciHigh}: precise tier cannot be determined. ${combo.desc}`}
          </p>
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
      <span className="text-[10px] font-bold w-10 flex-shrink-0" style={{ color: 'var(--alpha-text-50)' }}>
        {label}
      </span>
      <div className="flex-1 relative">
        <div className="h-5 rounded-lg overflow-hidden" style={{ background: 'var(--alpha-bg-06)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-5 rounded-lg flex items-center pl-2"
            style={{ background: color + (isActive ? 'dd' : '88') }}
          >
            <span className="text-[10px] font-black" style={{ color: 'var(--text)' }}>{score}</span>
          </motion.div>
        </div>
      </div>
      <span className="text-[10px] w-12 text-right flex-shrink-0" style={{ color: 'var(--alpha-text-30)' }}>
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
    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
      {horizon.trajectoryNarrative}
    </p>
  </div>
);

// ── Quorum progress bar — shown inside brief skeleton during 45s wait ────────

const QuorumProgressBar: React.FC<{ stageLabel?: string }> = ({ stageLabel }) => {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const DURATION_MS = 45_000;
    const TICK_MS = 250;
    const startTime = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const next = Math.min(100, Math.round((elapsed / DURATION_MS) * 100));
      setPct(next);
      if (next >= 100) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-3 space-y-1.5">
      {stageLabel && (
        <p className="text-[10px] font-mono tracking-wide" style={{ color: 'rgba(0,212,224,0.55)' }}>
          {stageLabel}
        </p>
      )}
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--alpha-bg-08)' }}>
        <motion.div
          className="h-1 rounded-full"
          style={{ background: 'rgba(0,212,224,0.6)', width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: 'linear' }}
        />
      </div>
      <p className="text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>
        {pct}% · Intelligence pipeline running
      </p>
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const AnalysisTab: React.FC<TabProps> = ({ result, companyData, auditStage }) => {
  const r = result as any;

  const horizon: PredictionHorizonResult | undefined   = r.predictionHorizon;
  const scoreSensitivity = r.scoreSensitivity;
  const scenario: ScenarioPlanResult | undefined       = r.scenarioPlan;
  const preparedness: PreparednessResult | undefined   = r.preparednessScore;
  const brief: IntelligenceBriefResult | null | undefined = r.intelligenceBrief;
  const urgencyLevel = brief?.urgencyLevel ?? (result.total >= 75 ? 'HIGH' : result.total >= 55 ? 'MODERATE' : 'LOW');
  const confPct = result.confidencePercent ?? Math.round(Number(result.confidence ?? 0.5) * 100);
  const freshnessierTier: string = result.unifiedFreshness?.tier ?? '';
  const companyNameForBrief: string = (companyData as any)?.name ?? '';

  // Deterministic first-paint summary — shown immediately while the LLM brief is
  // still being written, so a late-night user always gets a real, signal-grounded
  // read instead of a skeleton that may not resolve before they leave. Built only
  // from data already on the result; replaced automatically when the brief lands.
  const interimBriefSummary = useMemo(() => {
    if (brief || freshnessierTier === 'heuristic') return undefined; // real brief (or honest no-data state) wins
    const score = Math.round(result.total ?? 0);
    const tierLabel = ((result.tier?.label as string | undefined) ?? (score >= 60 ? 'High' : score >= 40 ? 'Moderate' : 'Low'))
      .replace(/\s*risk\s*$/i, ''); // avoid "moderate risk layoff risk"
    const co = companyNameForBrief || 'This company';
    const dims = (Array.isArray(result.dimensions) ? [...result.dimensions] : [])
      .filter((d: any) => typeof d.score === 'number')
      .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
    const top2 = dims.slice(0, 2).map((d: any) => String(d.label)).filter(Boolean);
    const cd = companyData as any;
    const facts: string[] = [];
    const lr = Number(cd?.layoffRounds ?? (Array.isArray(r.layoffRounds) ? r.layoffRounds.length : r.layoffRounds) ?? 0) || 0;
    if (lr >= 1) facts.push(`${lr} recent layoff round${lr > 1 ? 's' : ''}`);
    if (typeof cd?.stock90DayChange === 'number') facts.push(`stock ${cd.stock90DayChange >= 0 ? '+' : ''}${cd.stock90DayChange}% over 90 days`);
    if (typeof cd?.revenueGrowthYoY === 'number') facts.push(`revenue ${cd.revenueGrowthYoY >= 0 ? '+' : ''}${cd.revenueGrowthYoY}% YoY`);
    const driverClause = top2.length ? ` The biggest factors are ${top2.join(' and ')}.` : '';
    const factClause = facts.length ? ` Live signals: ${facts.join(', ')}.` : '';
    return `${co} currently reads as ${tierLabel.toLowerCase()} layoff risk (${score}/100).${driverClause}${factClause}`;
  }, [brief, freshnessierTier, result, companyData, companyNameForBrief, r]);

  // AI reasoning dimensions — built from breakdown layers L1/L2/L3
  const aiReasoningDimensions = useMemo(() => buildDimensionsFromResult(result), [result]);

  // Wave 2.6 — Displacement trajectory props derived from result
  const displacementRoleKey: string  = result.workTypeKey ?? 'sw_backend';
  const displacementRoleTitle: string = (displacementRoleKey).replace(/_/g, ' ');
  const displacementExperience = experienceBand((r.userFactors?.careerYears as number | undefined) ?? (r.careerYears as number | undefined));
  const displacementCareerIntel = r.careerIntelligence ?? null;

  // Score sufficiency gate — passed to DualGaugePanel so the risk gauge
  // shows the CI range instead of a point estimate when insufficient.
  const scoreSufficiency = useMemo(
    () => computeScoreSufficiency(result.confidenceInterval, result.confidencePercent),
    [result.confidenceInterval, result.confidencePercent],
  );

  return (
    <div className="flex flex-col gap-3">

      {/* ── P1: AI Intelligence Brief — first answer: "What did the AI conclude?" */}
      <AdaptiveBlock
        title="AI intelligence brief"
        subtitle="Full AI-generated analysis of your company, role, and situation"
        icon={Brain}
        tier={2}
        accentColor={
          urgencyLevel === 'CRITICAL' ? '#dc2626'
          : urgencyLevel === 'HIGH' ? '#f97316'
          : '#22d3ee'
        }
        defaultOpen={result.total >= 35}
      >
        <IntelligenceBriefBlock
          brief={brief}
          urgency={urgencyLevel}
          auditStage={auditStage}
          confidence={confPct}
          freshnessierTier={freshnessierTier}
          companyName={companyNameForBrief}
          interimSummary={interimBriefSummary}
        />
      </AdaptiveBlock>

      {/* ── P1: Dual Gauge — Risk vs Readiness ── */}
      <AdaptiveBlock
        title="Risk vs. readiness"
        subtitle="Side-by-side comparison of your layoff risk score and career preparedness"
        icon={BarChart2}
        tier={2}
        accentColor="#22d3ee"
        defaultOpen={result.total >= 55}
      >
        <DualGaugePanel
          riskScore={result.total}
          preparedness={preparedness}
          scoreSufficient={scoreSufficiency.sufficient}
          ciLow={scoreSufficiency.ciLow}
          ciHigh={scoreSufficiency.ciHigh}
        />
      </AdaptiveBlock>

      {/* ── P1: Risk dimensions breakdown — open by default; this IS the tab's job */}
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

      {/* ── P2: Historical precedent match */}
      {result.resolvedPattern && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
              style={{
                background: 'rgba(245,158,11,0.10)',
                color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.28)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
              }}
            >
              Verified Pattern
            </span>
            <span className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
              Signal-matched against documented precedents — not AI-generated
            </span>
          </div>
          <PatternMatchCard
            pattern={result.resolvedPattern}
            overlapScore={result.patternMatchOverlapScore ?? undefined}
            userRegion={
              (r.userFactors?.region as string | undefined)
              ?? (r.userFactors?.citizenshipRegion as string | undefined)
              ?? ((companyData as any)?.region as string | undefined)
              ?? undefined
            }
            roleFit={(result as any).patternMatchRoleFit ?? undefined}
            userRoleTitle={
              (r.userFactors?.roleTitle as string | undefined)
              ?? result.workTypeKey?.replace(/_/g, ' ')
              ?? undefined
            }
          />
        </motion.div>
      )}

      {/* ── P2: AI Reasoning — chain of thought for the score */}
      {aiReasoningDimensions.length > 0 && (
        <AdaptiveBlock
          title="How we reached your score"
          subtitle="The top risk factors and reasoning chains that drive your result"
          icon={Brain}
          tier={2}
          accentColor="#22d3ee"
          defaultOpen={result.total >= 55}
        >
          <AIReasoningPanel
            dimensions={aiReasoningDimensions}
            finalScore={result.total}
            confidencePercent={confPct}
            primaryDataSources={
              r._liveDataCoverage?.overallSource === 'live'
                ? ['Yahoo Finance', 'Google News', 'Bing RSS']
                : r._liveDataCoverage?.overallSource === 'mixed'
                ? ['Google News', 'Bing RSS']
                : []
            }
          />
        </AdaptiveBlock>
      )}

      {/* ── P2: Signal Tensions — contradiction disclosure */}
      {r.signalContradictions && (r.signalContradictions.contradictions?.length ?? 0) > 0 && r.signalContradictions.overallTrustLevel !== 'HIGH' && (
        <AdaptiveBlock
          title="Signal tensions"
          subtitle="Competing signals detected — how the AI resolved them"
          icon={Zap}
          tier={2}
          accentColor='#f59e0b'
          defaultOpen={r.signalContradictions.overallTrustLevel === 'VERY_LOW' || r.signalContradictions.overallTrustLevel === 'LOW'}
          badge={r.signalContradictions.hasMaterialUncertainty ? `±${r.signalContradictions.netUncertaintyPoints} pts` : undefined}
          badgeColor={r.signalContradictions.overallTrustLevel === 'VERY_LOW' ? '#dc2626' : '#f97316'}
        >
          <SignalCorrelationInsight report={r.signalContradictions} />
        </AdaptiveBlock>
      )}

      {/* ── P2: Score sensitivity — what moves your score the most? */}
      {scoreSensitivity && (scoreSensitivity.levers?.filter((l: any) => l.scoreDropIfImproved > 0).length ?? 0) > 0 && (
        <AdaptiveBlock
          title="Score levers — what moves your risk the most?"
          subtitle="Ranked actions by score impact — fastest path to a safer position"
          icon={TrendingDown}
          tier={2}
          accentColor="#22d3ee"
          defaultOpen={result.total >= 55}
        >
          <ScoreSensitivityPanel scoreSensitivity={scoreSensitivity} liveScore={result.total} />
        </AdaptiveBlock>
      )}

      {/* ── P3: Prediction Horizon */}
      {horizon && (
        <AdaptiveBlock
          title="Prediction horizon"
          subtitle="30 / 90 / 180-day score forecasts with confidence intervals"
          icon={Compass}
          tier={3}
          accentColor='#f59e0b'
          defaultOpen={false}
          badge={horizon.groundTruthOverride ? 'WARN OVERRIDE' : undefined}
          badgeColor={horizon.groundTruthOverride ? '#dc2626' : undefined}
        >
          <HorizonContent horizon={horizon} />
        </AdaptiveBlock>
      )}

      {/* ── P3: Scenario Fan */}
      {scenario && (
        <AdaptiveBlock
          title="6-month scenarios"
          subtitle="Bear / base / bull outcomes — tap a scenario to see its recommended actions"
          icon={Activity}
          tier={3}
          accentColor='#f59e0b'
          defaultOpen={false}
        >
          <ScenarioExplorer
            scenario={scenario as any}
            currentScore={result.total}
          />
        </AdaptiveBlock>
      )}

      {/* ── P3: 6-Year AI Displacement Forecast */}
      <AdaptiveBlock
        title="6-year AI displacement forecast"
        subtitle="How AI adoption will likely affect your role over the next 6 years"
        icon={AlertOctagon}
        tier={3}
        accentColor='#f97316'
        defaultOpen={false}
      >
        <DisplacementTrajectoryPanel
          currentScore={result.total}
          oracleResult={null}
          roleTitle={displacementRoleTitle}
          roleKey={displacementRoleKey}
          experience={displacementExperience}
          careerIntelligence={displacementCareerIntel}
        />
      </AdaptiveBlock>

    </div>
  );
};

export default AnalysisTab;
