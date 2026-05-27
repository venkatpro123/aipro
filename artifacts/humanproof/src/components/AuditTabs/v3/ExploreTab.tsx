// v3/ExploreTab.tsx — V4 UX redesign
//
// TAB 3 of 3: "Explore"
//
// Decision-driven IA: answers "Why? Tell me more."
//   T1 HERO: IntelligenceBriefPanel — full width, first element, dominant
//   T2: PatternMatchCard (≥70% overlap) + ScenarioFan + DualGauge
//   T3: PeerContagion + MacroRisk + SignalContradictions + CohortClassification
//   T4: PredictionHorizon + ExecutiveDeparture + IndiaRisk + GeographicOptionality
//
// Tab-level freshness gate: dims label + shows callout when tier = 'heuristic'.

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Activity, Compass, AlertOctagon, BarChart2,
  TrendingUp, Map, Users, GitBranch, ShieldCheck, Award, Layers,
} from 'lucide-react';
import { PatternMatchCard } from '../../PatternMatchCard';
import { computeScoreSufficiency } from '../../../lib/scoreGate';
import type { TabProps } from '../common/types';
import type { PredictionHorizonResult } from '../../../services/predictionHorizonService';
import type { ScenarioPlanResult } from '../../../services/scenarioPlanService';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import { RiskBreakdownTab } from '../RiskBreakdownTab';
import AdaptiveBlock from '../common/AdaptiveBlock';
import IntelligenceBriefPanel from '../common/IntelligenceBriefPanel';
import PeerContagionPanel from '../common/PeerContagionPanel';
import MacroRiskPanel from '../common/MacroRiskPanel';
import PredictionHorizonPanel from '../common/PredictionHorizonPanel';
import ExecutiveDeparturePatternPanel from '../common/ExecutiveDeparturePatternPanel';
import PrecisionSurvivalPanel from '../common/PrecisionSurvivalPanel';
import CompetitivePositionPanel from '../common/CompetitivePositionPanel';
import SkillFusionPanel from '../common/SkillFusionPanel';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 55) return '#f97316';
  if (score >= 35) return '#f59e0b';
  return '#10b981';
}

function readinessColor(label: string): string {
  return ({ READY: '#10b981', MOSTLY_READY: '#22d3ee', PARTIAL: '#f59e0b', UNDERPREPARED: '#f97316', NOT_READY: '#dc2626' })[label] ?? '#f59e0b';
}

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

// ── Mini gauge for DualGauge ──────────────────────────────────────────────────

const MiniGauge: React.FC<{
  score: number; color: string; label: string; sublabel: string;
}> = ({ score, color, label, sublabel }) => {
  const size = 80;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6} />
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (score / 100) * circ }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
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

// ── Dual Gauge ────────────────────────────────────────────────────────────────

const DualGaugePanel: React.FC<{
  riskScore: number;
  preparedness: PreparednessResult | undefined;
  scoreSufficient?: boolean;
  ciLow?: number;
  ciHigh?: number;
}> = ({ riskScore, preparedness, scoreSufficient = true, ciLow = 0, ciHigh = 100 }) => {
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
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.40)' }}>
        RISK vs. READINESS
      </p>
      <div className="flex items-end justify-center gap-8 mb-3">
        {scoreSufficient
          ? <MiniGauge score={riskScore} color={rColor} label="Layoff Risk" sublabel="probability index" />
          : (
            <div className="flex flex-col items-center gap-1" style={{ width: 80 }}>
              <div className="w-18 h-8 flex items-center justify-center rounded-xl"
                style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.28)' }}>
                <span className="text-[11px] font-black" style={{ color: '#fbbf24' }}>{ciLow}–{ciHigh}</span>
              </div>
              <div className="flex items-center gap-1"><AlertOctagon className="w-3 h-3" style={{ color: '#fbbf24' }} /><span className="text-[8px] font-bold" style={{ color: '#fbbf24' }}>RANGE</span></div>
              <p className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.82)' }}>Layoff Risk</p>
              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.40)' }}>range — not a point</p>
            </div>
          )
        }
        <div className="pb-10 flex flex-col items-center">
          <span className="text-lg font-black" style={{ color: combo.color }}>VS</span>
        </div>
        <MiniGauge score={pScore} color={pColor} label="Preparedness" sublabel="readiness index" />
      </div>
      <div className="flex items-center gap-2 rounded-xl p-2.5"
        style={{ background: combo.color + '12', border: `1px solid ${combo.color}25` }}>
        <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ background: combo.color }} />
        <div>
          <p className="text-[11px] font-bold" style={{ color: combo.color }}>{combo.label}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{combo.desc}</p>
        </div>
      </div>
    </motion.div>
  );
};

// ── Cohort classification chip ────────────────────────────────────────────────

const CohortClassificationChip: React.FC<{ cohort: any }> = ({ cohort }) => {
  if (!cohort?.type) return null;
  const cfg: Record<string, { color: string; bg: string }> = {
    DISTRESS:   { color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
    EFFICIENCY: { color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
    WAVE:       { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    NONE:       { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  };
  const c = cfg[cohort.type] ?? cfg.NONE;
  return (
    <div className="rounded-xl p-3" style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
      <div className="flex items-center gap-2 mb-1.5">
        <GitBranch className="w-3.5 h-3.5" style={{ color: c.color }} />
        <span className="text-[10px] font-black tracking-wider" style={{ color: c.color }}>
          {cohort.type} COHORT
        </span>
        {cohort.confidence != null && (
          <span className="text-[9px] ml-auto" style={{ color: 'rgba(255,255,255,0.40)' }}>
            {Math.round(cohort.confidence * 100)}% confidence
          </span>
        )}
      </div>
      {cohort.reason && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{cohort.reason}</p>
      )}
    </div>
  );
};

// ── Signal contradictions inline block ────────────────────────────────────────

const SignalContradictionsBlock: React.FC<{ contradictions: any[] }> = ({ contradictions }) => {
  if (!contradictions?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {contradictions.slice(0, 3).map((c: any, i: number) => (
        <div key={i} className="rounded-xl p-3"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#f59e0b' }}>
            {c.signal1} vs {c.signal2}
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {c.description ?? c.explanation ?? 'Conflicting signals detected — treat score with extra caution.'}
          </p>
        </div>
      ))}
    </div>
  );
};

// ── Quorum progress bar ───────────────────────────────────────────────────────

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
        <p className="text-[10px] font-mono tracking-wide" style={{ color: 'rgba(0,212,224,0.55)' }}>{stageLabel}</p>
      )}
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div className="h-1 rounded-full"
          style={{ background: 'rgba(0,212,224,0.6)', width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: 'linear' }}
        />
      </div>
      <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.20)' }}>{pct}% · Intelligence pipeline running</p>
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const ExploreTab: React.FC<TabProps> = ({ result, companyData, auditStage, emergencyMode }) => {
  const r = result as any;

  const horizon: PredictionHorizonResult | undefined   = r.predictionHorizon;
  const scenario: ScenarioPlanResult | undefined       = r.scenarioPlan;
  const preparedness: PreparednessResult | undefined   = r.preparednessScore;
  const peerContagion = r.peerContagion;
  const macroRisk     = r.macroEconomicRisk;
  const contradictions: any[] = r.signalContradictions ?? [];
  const cohort = r.cohortClassification;
  const execDeparture = r.executiveMovement ?? r.executiveDeparture;
  const indiaEnrichment = r.indiaRiskEnrichment;
  const geoOptions = r.geographicOptionality;

  const precisionSurvival  = r.precisionSurvival;
  const competitivePosition = r.competitivePosition;
  const skillFusion         = r.skillFusion;

  const confPct = result.confidencePercent ?? Math.round(Number(result.confidence ?? 0.5) * 100);
  const freshnessierTier: string = result.unifiedFreshness?.tier ?? '';
  const companyNameForBrief: string = (companyData as any)?.name ?? '';
  const isHeuristic = freshnessierTier === 'heuristic';

  const scoreSufficiency = useMemo(
    () => computeScoreSufficiency(result.confidenceInterval, result.confidencePercent),
    [result.confidenceInterval, result.confidencePercent],
  );

  return (
    <div className="flex flex-col gap-3">

      {/* Freshness gate callout at tab level */}
      {isHeuristic && (
        <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
          style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.22)' }}>
          <Brain className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#94a3b8' }} />
          <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.60)' }}>
            <span className="font-semibold" style={{ color: '#94a3b8' }}>Limited intelligence · </span>
            live data unavailable for this company — analysis draws from sector heuristics only.
          </p>
        </div>
      )}

      {/* ── T1 HERO: Intelligence Brief — first element, full width ─────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-mono tracking-[0.16em] uppercase" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Analysis brief · Claude
          </span>
        </div>
        <IntelligenceBriefPanel
          intelligenceBrief={r.intelligenceBrief}
          confidence={confPct}
          freshnessierTier={freshnessierTier}
          companyName={companyNameForBrief}
        />
      </div>

      {/* ── T2: Precision survival horizon ─────────────────────────────────── */}
      {precisionSurvival && (
        <AdaptiveBlock
          title="Precision survival model"
          subtitle="Bayesian survival probability across 30 / 90 / 180-day horizons"
          icon={ShieldCheck}
          tier={2}
          accentColor="#10b981"
          defaultOpen={true}
        >
          <PrecisionSurvivalPanel survival={precisionSurvival} />
        </AdaptiveBlock>
      )}

      {/* ── T2: Pattern match — only when ≥ 70% overlap ────────────────────── */}
      {result.resolvedPattern && (result.patternMatchOverlapScore ?? 0) >= 0.70 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded"
              style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.28)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Verified Pattern
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Signal-matched · not AI-generated
            </span>
          </div>
          <PatternMatchCard
            pattern={result.resolvedPattern}
            overlapScore={result.patternMatchOverlapScore ?? undefined}
          />
        </motion.div>
      )}

      {/* ── T2: Scenario fan ─────────────────────────────────────────────────── */}
      {scenario && (
        <AdaptiveBlock
          title="6-month scenarios"
          subtitle="Bear / base / bull outcomes with key uncertainties"
          icon={Activity}
          tier={2}
          accentColor="#f59e0b"
          defaultOpen={true}
        >
          <ScenarioContent scenario={scenario} />
        </AdaptiveBlock>
      )}

      {/* ── T2: Dual gauge ───────────────────────────────────────────────────── */}
      <DualGaugePanel
        riskScore={result.total}
        preparedness={preparedness}
        scoreSufficient={scoreSufficiency.sufficient}
        ciLow={scoreSufficiency.ciLow}
        ciHigh={scoreSufficiency.ciHigh}
      />

      {/* ── T2: Competitive position intelligence ───────────────────────────── */}
      {competitivePosition && (
        <AdaptiveBlock
          title="Competitive position"
          subtitle="Your market standing vs. peers — skill gaps, salary delta, demand index"
          icon={Award}
          tier={2}
          accentColor="#a78bfa"
          defaultOpen={false}
        >
          <CompetitivePositionPanel position={competitivePosition} />
        </AdaptiveBlock>
      )}

      {/* ── T2: Risk dimensions (collapsed by default in Explore — detailed in My Risk) */}
      <AdaptiveBlock
        title="Risk dimensions breakdown"
        subtitle="All layers contributing to your score"
        icon={BarChart2}
        tier={2}
        accentColor="#22d3ee"
        defaultOpen={false}
      >
        <RiskBreakdownTab result={result} companyData={companyData} />
      </AdaptiveBlock>

      {/* ── T3: Skill fusion opportunities ──────────────────────────────────── */}
      {skillFusion && (
        <AdaptiveBlock
          title="Skill fusion opportunities"
          subtitle="Cross-discipline skill combinations that compound market value"
          icon={Layers}
          tier={3}
          accentColor="#f59e0b"
          defaultOpen={false}
        >
          <SkillFusionPanel fusion={skillFusion} />
        </AdaptiveBlock>
      )}

      {/* ── T3: Peer & macro signals ─────────────────────────────────────────── */}
      <AdaptiveBlock
        title="Peer & macro signals"
        subtitle="Sector contagion wave + macroeconomic risk"
        icon={TrendingUp}
        tier={3}
        accentColor="#f97316"
        defaultOpen={false}
        empty={!peerContagion && !macroRisk}
      >
        {peerContagion && <PeerContagionPanel contagion={peerContagion} />}
        {macroRisk     && <MacroRiskPanel macro={macroRisk} />}
      </AdaptiveBlock>

      {/* ── T3: Signal contradictions & cohort ───────────────────────────────── */}
      {(contradictions.length > 0 || cohort) && (
        <AdaptiveBlock
          title="Signal contradictions & cohort"
          subtitle="Where sources disagree and what pattern this company fits"
          icon={GitBranch}
          tier={3}
          accentColor="#7c3aed"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-3">
            {contradictions.length > 0 && <SignalContradictionsBlock contradictions={contradictions} />}
            {cohort && <CohortClassificationChip cohort={cohort} />}
          </div>
        </AdaptiveBlock>
      )}

      {/* ── T4: Prediction horizon ───────────────────────────────────────────── */}
      {horizon && (
        <AdaptiveBlock
          title="Prediction horizon"
          subtitle="30 / 90 / 180-day score forecasts with confidence intervals"
          icon={Compass}
          tier={4}
          accentColor="#f59e0b"
          defaultOpen={false}
          badge={horizon.groundTruthOverride ? 'WARN OVERRIDE' : undefined}
          badgeColor={horizon.groundTruthOverride ? '#dc2626' : undefined}
        >
          <PredictionHorizonPanel predictionHorizon={horizon} currentScore={result.total} />
        </AdaptiveBlock>
      )}

      {/* ── T4: Executive departure patterns ─────────────────────────────────── */}
      {execDeparture && (
        <AdaptiveBlock
          title="Executive departure patterns"
          subtitle="C-suite changes, destinations, replacement archetypes"
          icon={Users}
          tier={4}
          accentColor="#f97316"
          defaultOpen={false}
        >
          <ExecutiveDeparturePatternPanel executiveDeparturePattern={execDeparture} />
        </AdaptiveBlock>
      )}

      {/* ── T4: India sector risk ─────────────────────────────────────────────── */}
      {indiaEnrichment && (
        <AdaptiveBlock
          title="India sector risk"
          subtitle="GCC archetype, NASSCOM benchmark, Q1 seasonal window"
          icon={Map}
          tier={4}
          accentColor="#22d3ee"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-2">
            {indiaEnrichment.gccArchetype && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(0,212,224,0.06)', border: '1px solid rgba(0,212,224,0.18)' }}>
                <p className="text-[10px] font-bold tracking-wider mb-1" style={{ color: '#22d3ee' }}>GCC Archetype</p>
                <p className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {indiaEnrichment.gccArchetype}
                </p>
              </div>
            )}
            {indiaEnrichment.nasscombenchmark != null && (
              <div className="flex justify-between items-center px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>NASSCOM benchmark</span>
                <span className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {indiaEnrichment.nasscombenchmark}
                </span>
              </div>
            )}
            {indiaEnrichment.q1SeasonalRisk && (
              <div className="rounded-xl px-3 py-2"
                style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.22)' }}>
                <p className="text-[11px]" style={{ color: '#f97316' }}>Q1 seasonal risk window active</p>
              </div>
            )}
            {indiaEnrichment.description && (
              <p className="text-[11px] leading-relaxed px-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {indiaEnrichment.description}
              </p>
            )}
          </div>
        </AdaptiveBlock>
      )}

      {/* ── T4: Geographic options ───────────────────────────────────────────── */}
      {geoOptions && (
        <AdaptiveBlock
          title="Geographic options"
          subtitle="Location-based escape paths and market access"
          icon={Map}
          tier={4}
          accentColor="#10b981"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-2">
            {geoOptions.isRemoteFirst && (
              <div className="rounded-xl px-3 py-2"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
                <p className="text-[11px] font-semibold" style={{ color: '#10b981' }}>
                  Remote-first role — global market access
                </p>
              </div>
            )}
            {Array.isArray(geoOptions.relocationOptions) && geoOptions.relocationOptions.slice(0, 3).map((opt: any, i: number) => (
              <div key={i} className="flex justify-between items-center px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.70)' }}>
                  {opt.city ?? opt.location ?? `Option ${i + 1}`}
                </span>
                {opt.salaryPremiumPct != null && (
                  <span className="text-[11px] font-bold" style={{ color: '#10b981' }}>
                    +{opt.salaryPremiumPct}% salary
                  </span>
                )}
              </div>
            ))}
            {geoOptions.description && (
              <p className="text-[11px] leading-relaxed px-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {geoOptions.description}
              </p>
            )}
          </div>
        </AdaptiveBlock>
      )}

    </div>
  );
};

export default ExploreTab;
