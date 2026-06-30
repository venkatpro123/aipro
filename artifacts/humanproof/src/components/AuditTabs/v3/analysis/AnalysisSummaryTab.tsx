// AnalysisSummaryTab.tsx — Analysis Mode Tab 1
//
// Executive briefing: What is happening? How serious? Why?
// All surfaces use CSS utility classes — no inline styles — so light/dark mode adapts.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import { ScoreRingHero, type DriverItem } from '../SummaryTab';
import { ThreatLevelGauge } from '../../common/ThreatLevelGauge';
import { VisualRiskDriversMap } from '../../common/VisualRiskDriversMap';
import { ScoreTrendStrip } from '../../common/ScoreTrendStrip';
import { riskColor, riskGradient } from '../../../../lib/riskTokens';
import { computeCanonicalConfidence } from '../../../../services/canonicalConfidence';
import { explainDriver } from '../driverEvidence';

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  onSwitchToBeast: () => void;
}

export const AnalysisSummaryTab: React.FC<Props> = ({ result, companyData, emergencyMode }) => {
  const r = result as any;
  const score = result.total;
  const canonicalConf = useMemo(() => computeCanonicalConfidence(result), [result]);
  const confPct = canonicalConf.score;
  const calibrationMode: string = r.modelCalibration?.calibrationMode ?? '';
  const urgency = r.intelligenceBrief?.urgencyLevel
    ?? (score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW');

  const ciLow  = result.confidenceInterval?.low  ?? undefined;
  const ciHigh = result.confidenceInterval?.high ?? undefined;
  const trendDirection = r.scoreTrajectory?.trajectoryDirection ?? undefined;

  const scoreDeltaDir: string = r.scoreDelta?.direction ?? '';
  const scoreDelta30d: number = Math.abs(r.scoreDelta?.delta30d ?? 0);
  const velocityColor = scoreDeltaDir === 'worsening' ? '#dc2626'
    : scoreDeltaDir === 'improving' ? 'var(--color-emerald-text)' : 'var(--alpha-text-35)';
  const VelocityIcon = scoreDeltaDir === 'worsening' ? TrendingUp
    : scoreDeltaDir === 'improving' ? TrendingDown : Minus;

  const strongestProtection: string | null = useMemo(() => {
    const src = r.precisionBrief?.topProtectiveFactor?.naturalLanguage ?? result.keyProtectiveFactor;
    if (!src) return null;
    const first = (src as string).match(/[^.!?]+[.!?]+/)?.[0]?.trim() ?? src;
    return first.length > 90 ? first.slice(0, 87) + '…' : first;
  }, [r.precisionBrief, result.keyProtectiveFactor]);

  const verdictLine = (s: number): string => {
    if (s >= 75) return 'High risk — months of lead time. Use it.';
    if (s >= 55) return 'Elevated risk. 30-day action window is open.';
    if (s >= 35) return 'Moderate signals. Build buffer while conditions are stable.';
    return 'Low risk. Time to build career capital and leverage.';
  };

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

  const heroVars = {
    '--hero-bg':     riskGradient(score),
    '--hero-border': `${riskColor(score)}30`,
  } as React.CSSProperties;

  // Top threat text for ThreatLevelGauge
  const topThreatText = useMemo(() => {
    const src = r.precisionBrief?.topRiskFactor?.naturalLanguage ?? r.keyRiskDriver ?? null;
    if (!src) return undefined;
    const first = (src as string).match(/[^.!?]+[.!?]+/)?.[0]?.trim() ?? src;
    return first.length > 90 ? first.slice(0, 87) + '…' : first;
  }, [r.precisionBrief, r.keyRiskDriver]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4 py-2">

      {/* 1 — Threat level gauge: score + urgency + top threat + strongest shield.
          This is the ONLY place these appear — all duplicate chips/cards removed. */}
      <ThreatLevelGauge
        score={score}
        urgency={urgency}
        companyName={result.companyName || companyData?.name || undefined}
        topThreat={topThreatText}
        strongestShield={strongestProtection ?? undefined}
        scoreColor={riskColor(score)}
      />

      {/* 2 — Emergency override (WARN Act / critical only) */}
      {emergencyMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`emergency-card${r.warnSignal?.hasActiveWARN ? ' emergency-card--warn' : ''}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="emergency-label">
                {r.warnSignal?.hasActiveWARN ? 'LEGAL NOTICE ON FILE' : 'YOU FOUND THIS EARLY'}
              </div>
              <p className="emergency-body">
                {r.warnSignal?.hasActiveWARN
                  ? 'A WARN Act filing is confirmed — your company must give 60 days notice.'
                  : "Most people find out 2 weeks before a layoff. You have months. Use them."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3 — Score ring: precise number + 30-day velocity + confidence interval arc */}
      <motion.div
        key={`analysis-score-${score}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="score-hero"
        style={heroVars}
      >
        <ScoreRingHero
          score={score}
          confidence={confPct}
          calibrationMode={calibrationMode}
          ciLow={ciLow}
          ciHigh={ciHigh}
          trendDirection={trendDirection}
        />
        <p className="score-hero-verdict mt-3">{verdictLine(score)}</p>
        {scoreDelta30d >= 1 && (
          <div
            className="score-hero-velocity"
            style={{ '--velocity-color': velocityColor } as React.CSSProperties}
          >
            <VelocityIcon className="w-3.5 h-3.5" />
            <span>{scoreDelta30d} points {scoreDeltaDir === 'worsening' ? 'higher risk' : 'lower risk'} vs 30 days ago</span>
          </div>
        )}
      </motion.div>

      {/* 4 — What's driving the risk: visual stacked bar + expandable driver nodes */}
      <VisualRiskDriversMap drivers={topDrivers} />

      {/* 5 — Where risk is heading */}
      {r.scoreTrajectory && (
        <ScoreTrendStrip scoreTrajectory={r.scoreTrajectory} currentScore={score} />
      )}


</div>
  );
};

export default AnalysisSummaryTab;
