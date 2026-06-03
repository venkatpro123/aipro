// AnalysisSummaryTab.tsx — Analysis Mode Tab 1
//
// Executive briefing: What is happening? How serious? Why?
// Reuses ScoreRingHero + TopDriversStrip from SummaryTab (named exports).
// No Tilt3D, no ScoreSignalOrbit, no density stats — those are Beast Mode depth markers.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Shield, Signal, Clock } from 'lucide-react';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import { ScoreRingHero, TopDriversStrip, type DriverItem } from '../SummaryTab';
import { ReasoningSpineCard } from '../../common/ReasoningSpineCard';
import { VerdictReassurance } from '../../common/VerdictReassurance';
import { ScoreTrendStrip } from '../../common/ScoreTrendStrip';
import { TimeToSafetyStrip } from '../../common/TimeToSafetyStrip';
import { ConfidenceDisclosure } from '../../common/ConfidenceDisclosure';
import { useDashboardAdaptation } from '../../../../hooks/useDashboardAdaptation';
import { riskColor, riskLabel, riskGradient } from '../../../../lib/riskTokens';
import { computeCanonicalConfidence } from '../../../../services/canonicalConfidence';
import { explainDriver } from '../driverEvidence';

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  onSwitchToBeast: () => void;
}

// Inline StatChip (not exported from SummaryTab)
const StatChip: React.FC<{
  label: string; value: string; sub?: string;
  color?: string; icon: React.ElementType;
}> = ({ label, value, sub, color = 'rgba(0,212,224,0.8)', icon: Icon }) => (
  <div
    className="flex-1 min-w-0 rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
  >
    <div className="flex items-center gap-1 mb-0.5">
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <span className="text-[10px] font-bold tracking-wider uppercase truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
    </div>
    <span className="text-[15px] font-black leading-none" style={{ color }}>{value}</span>
    {sub && <span className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</span>}
  </div>
);

export const AnalysisSummaryTab: React.FC<Props> = ({ result, companyData, emergencyMode, onSwitchToBeast }) => {
  const r = result as any;
  const score = result.total;
  const adaptation = useDashboardAdaptation(result, companyData);
  const canonicalConf = useMemo(() => computeCanonicalConfidence(result), [result]);
  const confPct = canonicalConf.score;
  const calibrationMode: string = r.modelCalibration?.calibrationMode ?? '';
  const liveCount = result.signalQuality?.liveSignals ?? 0;
  const dataAge   = result.dataFreshness?.ageInDays ?? 0;
  const preparedness = r.preparednessScore;
  const scoreSensitivity = r.scoreSensitivity;
  const urgency = r.intelligenceBrief?.urgencyLevel ?? (score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW');

  const ciLow  = result.confidenceInterval?.low  ?? undefined;
  const ciHigh = result.confidenceInterval?.high ?? undefined;
  const trendDirection = r.scoreTrajectory?.trajectoryDirection ?? undefined;

  const velocityIcon = r.scoreDelta?.direction === 'worsening'
    ? TrendingUp : r.scoreDelta?.direction === 'improving'
    ? TrendingDown : Minus;
  const velocityColor = r.scoreDelta?.direction === 'worsening'
    ? '#dc2626' : r.scoreDelta?.direction === 'improving'
    ? '#10b981' : 'rgba(255,255,255,0.35)';

  const pScore = preparedness?.overallScore ?? 0;
  const pColor = pScore >= 75 ? '#10b981' : pScore >= 55 ? '#22d3ee' : pScore >= 35 ? '#f59e0b' : '#f97316';

  const verdictLine = (s: number): string => {
    if (s >= 75) return 'High risk — months of lead time. Use it.';
    if (s >= 55) return 'Elevated risk. 30-day action window is open.';
    if (s >= 35) return 'Moderate signals. Build buffer while conditions are stable.';
    return 'Low risk. Time to build career capital and leverage.';
  };

  // Top 5 drivers
  const topDrivers: DriverItem[] = useMemo(() => {
    const dimensions: any[] = Array.isArray(result.dimensions) ? result.dimensions : [];
    return dimensions
      .filter(d => typeof d.score === 'number' && d.score >= 15)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5)
      .map(d => ({
        key:   String(d.key ?? d.label ?? 'driver'),
        label: String(d.label ?? d.key ?? 'Risk dimension'),
        score: Math.round(d.score ?? 0),
        why:   String(d.reason ?? d.rationale ?? d.evidenceSummary ?? d.summary ?? explainDriver(d, result, companyData)),
      }));
  }, [result, companyData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Primary recommendation (single highest-priority)
  const primaryRec = useMemo(() => {
    const recs: any[] = Array.isArray(result.recommendations) ? result.recommendations : [];
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return [...recs].sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4))[0] ?? null;
  }, [result]);

  const truncate1Sentence = (text: string) => {
    if (!text) return '';
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    return sentences[0].trim();
  };

  const lowDataWarning = result.signalQuality?.lowDataWarning as any;
  const conflictCount  = result.signalQuality?.conflictingSignals?.length ?? 0;
  const hardFailures   = [...(result.signalQuality?.hardFailures ?? [])];
  const dagDegraded    = r._dagDegradedLayerCount ?? 0;
  if (dagDegraded > 2) hardFailures.push(`${dagDegraded} intelligence modules degraded`);

  return (
    <div className="flex flex-col gap-4 py-2">

      {/* Emergency card */}
      {emergencyMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl px-4 py-3"
          style={{
            background: r.warnSignal?.hasActiveWARN
              ? 'linear-gradient(135deg, rgba(220,38,38,0.10), rgba(153,27,27,0.06))'
              : 'rgba(220,38,38,0.07)',
            border: '1px solid rgba(220,38,38,0.28)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="audit-step-dot active" style={{ width: 8, height: 8, marginTop: 5, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--red,#dc2626)', marginBottom: 4, fontWeight: 800 }}>
                {r.warnSignal?.hasActiveWARN ? 'LEGAL NOTICE DETECTED' : `${riskLabel(score)} RISK · AHEAD OF 90%+ WHO FACE THIS`}
              </div>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.5, color: 'var(--text-2,rgba(255,255,255,0.75))', marginBottom: 8 }}>
                {r.warnSignal?.hasActiveWARN
                  ? 'A WARN Act filing is confirmed — a legal 60-day advance notice for your company.'
                  : "You're discovering this risk months early. That gap is your advantage."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reasoning spine */}
      {adaptation.feed && <ReasoningSpineCard feed={adaptation.feed} />}

      {/* Score Hero */}
      <motion.div
        key={`analysis-score-${score}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 sm:p-5 flex flex-col items-center text-center relative overflow-hidden"
        style={{ background: riskGradient(score), border: `1px solid ${riskColor(score)}30` }}
      >
        <ScoreRingHero
          score={score}
          confidence={confPct}
          calibrationMode={calibrationMode}
          ciLow={ciLow}
          ciHigh={ciHigh}
          trendDirection={trendDirection}
        />
        <p className="mt-3 text-[12px] leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.70)' }}>
          {verdictLine(score)}
        </p>
        <VerdictReassurance score={score} urgency={urgency} />
        {r.scoreDelta && Math.abs(r.scoreDelta.delta30d ?? 0) >= 1 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: velocityColor }}>
            {React.createElement(velocityIcon, { className: 'w-3.5 h-3.5' })}
            <span>{Math.abs(r.scoreDelta.delta30d ?? 0)}pt {r.scoreDelta.direction} vs 30d ago</span>
          </div>
        )}
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="flex gap-2 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        <StatChip label="Confidence" value={`${confPct}%`} sub={canonicalConf.userFacing.label.toLowerCase()} color={canonicalConf.userFacing.color} icon={Shield} />
        <StatChip label="Readiness" value={`${pScore}`} sub={preparedness?.readinessLabel ?? '—'} color={pColor} icon={Shield} />
        <StatChip label="Live Signals" value={`${liveCount}`} sub={liveCount >= 4 ? 'full live' : liveCount >= 2 ? 'partial' : 'heuristic'} color={liveCount >= 4 ? '#10b981' : liveCount >= 2 ? '#22d3ee' : '#f59e0b'} icon={Signal} />
        <StatChip label="Data Age" value={`${dataAge}d`} sub={dataAge <= 1 ? 'fresh' : dataAge <= 7 ? 'recent' : 'stale'} color={dataAge <= 1 ? '#10b981' : dataAge <= 7 ? '#22d3ee' : '#f97316'} icon={Clock} />
      </motion.div>

      {/* Top Risk Drivers */}
      <TopDriversStrip drivers={topDrivers} />

      {/* Score Trend Strip */}
      {r.scoreTrajectory && (
        <ScoreTrendStrip scoreTrajectory={r.scoreTrajectory} currentScore={score} />
      )}

      {/* Time to Safety */}
      {score > 35 && scoreSensitivity && (
        <TimeToSafetyStrip currentScore={score} scoreSensitivity={scoreSensitivity} financialRunwayMonths={r.userFinancialRunway?.runwayMonths} />
      )}

      {/* Confidence Disclosure */}
      <ConfidenceDisclosure
        confPct={confPct}
        confidenceLabel={canonicalConf.userFacing.label}
        confidenceColor={canonicalConf.userFacing.color}
        primarySource={canonicalConf.primarySource}
        calibrationMode={calibrationMode}
        lowDataWarning={lowDataWarning}
        conflictCount={conflictCount}
        hardFailures={hardFailures}
        freshnessTier={result.unifiedFreshness?.tier}
        calibrationLimitationReason={null}
      />

      {/* Primary recommendation */}
      {primaryRec && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          style={{
            borderLeft: `3px solid ${riskColor(score)}`,
            background: `${riskColor(score)}10`,
            border: `1px solid ${riskColor(score)}30`,
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: riskColor(score), margin: '0 0 6px' }}>
            TOP PRIORITY · {primaryRec.priority?.toUpperCase()}
          </p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: '0 0 6px', lineHeight: 1.4 }}>
            {primaryRec.title}
          </p>
          {primaryRec.description && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0 0 8px', lineHeight: 1.5 }}>
              {truncate1Sentence(primaryRec.description)}
            </p>
          )}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {typeof primaryRec.riskReductionPct === 'number' && primaryRec.riskReductionPct > 0 && (
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', padding: '1px 6px', background: 'rgba(16,185,129,0.12)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.25)' }}>
                -{primaryRec.riskReductionPct}% risk
              </span>
            )}
            {primaryRec.effortBadge && (
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', padding: '1px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                {primaryRec.effortBadge}
              </span>
            )}
            {primaryRec.deadline && (
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', padding: '1px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                {primaryRec.deadline}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Depth invite */}
      <div className="text-center pt-2 pb-2">
        <button
          type="button"
          onClick={onSwitchToBeast}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
        >
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.32)' }}>Explore full intelligence </span>
          <span style={{ fontSize: '12px', color: '#00d4e0', fontWeight: 600 }}>→</span>
        </button>
      </div>

    </div>
  );
};

export default AnalysisSummaryTab;
