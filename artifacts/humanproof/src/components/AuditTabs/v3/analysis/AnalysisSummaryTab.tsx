// AnalysisSummaryTab.tsx — Analysis Mode Tab 1
//
// Executive briefing: What is happening? How serious? Why?
// All surfaces use CSS utility classes — no inline styles — so light/dark mode adapts.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Shield, ArrowUpRight, Compass } from 'lucide-react';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import { ScoreRingHero, TopDriversStrip, type DriverItem } from '../SummaryTab';
import { ReasoningSpineCard } from '../../common/ReasoningSpineCard';
import { VerdictReassurance } from '../../common/VerdictReassurance';
import { ScoreTrendStrip } from '../../common/ScoreTrendStrip';
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

// StatChip — dynamic accent colour injected as --chip-accent CSS variable on wrapper.
// All child elements reference it via classes; zero inline styles.
const StatChip: React.FC<{
  label: string; value: string; sub?: string;
  color?: string; icon: React.ElementType;
}> = ({ label, value, sub, color = 'rgba(0,212,224,0.8)', icon: Icon }) => (
  <div
    className="stat-chip"
    style={{ '--chip-accent': color } as React.CSSProperties}
  >
    <div className="stat-chip-header">
      <Icon className="w-3 h-3 stat-chip-icon" />
      <span className="stat-chip-label">{label}</span>
    </div>
    <span className="stat-chip-value">{value}</span>
    {sub && <span className="stat-chip-sub">{sub}</span>}
  </div>
);

export const AnalysisSummaryTab: React.FC<Props> = ({ result, companyData, emergencyMode }) => {
  const r = result as any;
  const score = result.total;
  const adaptation = useDashboardAdaptation(result, companyData);
  const canonicalConf = useMemo(() => computeCanonicalConfidence(result), [result]);
  const confPct = canonicalConf.score;
  const calibrationMode: string = r.modelCalibration?.calibrationMode ?? '';
  const liveCount = result.signalQuality?.liveSignals ?? 0;
  const dataAge   = result.dataFreshness?.ageInDays ?? 0;
  const preparedness = r.preparednessScore;
  const urgency = r.intelligenceBrief?.urgencyLevel
    ?? (score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW');

  const ciLow  = result.confidenceInterval?.low  ?? undefined;
  const ciHigh = result.confidenceInterval?.high ?? undefined;
  const trendDirection = r.scoreTrajectory?.trajectoryDirection ?? undefined;

  const scoreDeltaDir: string = r.scoreDelta?.direction ?? '';
  const scoreDelta30d: number = Math.abs(r.scoreDelta?.delta30d ?? 0);
  const velocityColor = scoreDeltaDir === 'worsening' ? '#dc2626'
    : scoreDeltaDir === 'improving' ? '#10b981' : 'rgba(255,255,255,0.35)';
  const VelocityIcon = scoreDeltaDir === 'worsening' ? TrendingUp
    : scoreDeltaDir === 'improving' ? TrendingDown : Minus;

  const pScore = preparedness?.overallScore ?? 0;
  const pColor = pScore >= 75 ? '#10b981' : pScore >= 55 ? '#22d3ee' : pScore >= 35 ? '#f59e0b' : '#f97316';

  // Strongest protection — precisionBrief (most specific) → keyProtectiveFactor (narrative)
  const strongestProtection: string | null = useMemo(() => {
    const src = r.precisionBrief?.topProtectiveFactor?.naturalLanguage ?? result.keyProtectiveFactor;
    if (!src) return null;
    const first = (src as string).match(/[^.!?]+[.!?]+/)?.[0]?.trim() ?? src;
    return first.length > 90 ? first.slice(0, 87) + '…' : first;
  }, [r.precisionBrief, result.keyProtectiveFactor]);

  const protectionLabel: string = r.precisionBrief?.topProtectiveFactor?.label ?? 'Strongest Shield';

  const futureRoleTitle: string | null = useMemo(() => {
    const chosen = result.escapePaths?.quickestWin ?? result.escapePaths?.paths?.[0] ?? null;
    if (!chosen) return null;
    return chosen.title.length > 52 ? chosen.title.slice(0, 49) + '…' : chosen.title;
  }, [result.escapePaths]);

  const futureRoleHeadline: string | null = useMemo(() => {
    const chosen = result.escapePaths?.quickestWin ?? result.escapePaths?.paths?.[0] ?? null;
    if (!chosen) return null;
    const h = chosen.headline ?? chosen.targetProfile ?? '';
    return h.length > 80 ? h.slice(0, 77) + '…' : h || null;
  }, [result.escapePaths]);

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

  const primaryRec = useMemo(() => {
    const recs: any[] = Array.isArray(result.recommendations) ? result.recommendations : [];
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return [...recs].sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4))[0] ?? null;
  }, [result]);

  const truncate1 = (text: string) => {
    if (!text) return '';
    const s = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    return s[0].trim();
  };

  // SituationBrief narrative — prefer LLM-generated executive summary, fall back to template
  const situationBrief = useMemo((): { headline: string; detail: string } | null => {
    const company = result.companyName || companyData?.name || '';
    // Prefer existing LLM-generated text
    const llmSummary: string =
      r.intelligenceBrief?.executiveSummary
      ?? r.precisionBrief?.briefSummary
      ?? r.narrative?.situationBrief
      ?? '';
    if (llmSummary && llmSummary.length > 20) {
      const headline = llmSummary.length > 140 ? llmSummary.slice(0, 137) + '…' : llmSummary;
      const detail = primaryRec ? `Priority action: ${primaryRec.title.length > 80 ? primaryRec.title.slice(0, 77) + '…' : primaryRec.title}` : '';
      return { headline, detail };
    }
    // Template fallback
    if (!company) return null;
    const situationLine = score >= 75
      ? `Your position at ${company} is at high risk — market signals suggest a 60–90 day action window.`
      : score >= 55
      ? `Elevated signals at ${company} indicate risk is building. Acting now creates 3–5× more protection than waiting.`
      : score >= 35
      ? `Moderate risk indicators at ${company}. Conditions are manageable today — build buffer before they compound.`
      : `Low risk detected at ${company}. Use this stability window to build differentiated skills and optionality.`;
    const detail = primaryRec ? `Priority action: ${primaryRec.title.length > 80 ? primaryRec.title.slice(0, 77) + '…' : primaryRec.title}` : '';
    return { headline: situationLine, detail };
  }, [result.companyName, companyData, r, score, primaryRec]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived CSS variable values for dynamic cards
  const heroVars = {
    '--hero-bg':     riskGradient(score),
    '--hero-border': `${riskColor(score)}30`,
  } as React.CSSProperties;

  const recVars = {
    '--rec-accent': riskColor(score),
    '--rec-bg':     `${riskColor(score)}10`,
    '--rec-border': `${riskColor(score)}30`,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col gap-4 py-2">

      {/* Situation Brief — plain-English narrative opener so user instantly
          understands their situation before interpreting the score ring */}
      {situationBrief && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.20 }}
          className="situation-brief"
          style={{ '--situation-accent': riskColor(score) } as React.CSSProperties}
        >
          <p className="situation-brief-label">SITUATION BRIEF</p>
          <p className="situation-brief-body">{situationBrief.headline}</p>
          {situationBrief.detail && (
            <p className="situation-brief-sub">{situationBrief.detail}</p>
          )}
        </motion.div>
      )}

      {/* Emergency card */}
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
                {r.warnSignal?.hasActiveWARN ? 'LEGAL NOTICE DETECTED' : `${riskLabel(score)} RISK · AHEAD OF 90%+ WHO FACE THIS`}
              </div>
              <p className="emergency-body">
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

      {/* Score Hero — inject dynamic background once as CSS variables */}
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
        <VerdictReassurance score={score} urgency={urgency} />
        {scoreDelta30d >= 1 && (
          <div
            className="score-hero-velocity"
            style={{ '--velocity-color': velocityColor } as React.CSSProperties}
          >
            <VelocityIcon className="w-3.5 h-3.5" />
            <span>{scoreDelta30d}pt {scoreDeltaDir} vs 30d ago</span>
          </div>
        )}
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none"
      >
        <StatChip
          label="Confidence"
          value={`${confPct}%`}
          sub={canonicalConf.userFacing.label.toLowerCase()}
          color={canonicalConf.userFacing.color}
          icon={Shield}
        />
        {liveCount > 0 && (
          <StatChip
            label="Live signals"
            value={String(liveCount)}
            sub={dataAge > 0 ? `${dataAge}d old` : 'fresh'}
            icon={Shield}
          />
        )}
        {preparedness && pScore > 0 && (
          <StatChip label="Preparedness" value={`${pScore}%`} color={pColor} icon={Shield} />
        )}
      </motion.div>

      {/* Intelligence Chips: Strongest Shield + Future Role */}
      {(strongestProtection || futureRoleTitle) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10 }}
          className="flex flex-col gap-2"
        >
          {strongestProtection && (
            <div className="intel-chip intel-chip--shield">
              <div className="intel-chip-icon intel-chip-icon--shield">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="intel-chip-label intel-chip-label--shield">{protectionLabel}</p>
                <p className="intel-chip-value">{strongestProtection}</p>
              </div>
            </div>
          )}
          {futureRoleTitle && (
            <div className="intel-chip intel-chip--escape">
              <div className="intel-chip-icon intel-chip-icon--escape">
                <Compass className="w-3.5 h-3.5 text-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="intel-chip-label intel-chip-label--escape">Your Escape Route</p>
                <p className="intel-chip-value intel-chip-value--bold">{futureRoleTitle}</p>
                {futureRoleHeadline && <p className="intel-chip-sub">{futureRoleHeadline}</p>}
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 mt-1 opacity-50 text-cyan" />
            </div>
          )}
        </motion.div>
      )}

      {/* Top Risk Drivers */}
      <TopDriversStrip drivers={topDrivers} />

      {/* Score Trend Strip */}
      {r.scoreTrajectory && (
        <ScoreTrendStrip scoreTrajectory={r.scoreTrajectory} currentScore={score} />
      )}

      {/* Primary recommendation — dynamic accent via CSS variables */}
      {primaryRec && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="primary-rec"
          style={recVars}
        >
          <p className="primary-rec-eyebrow">
            TOP PRIORITY · {primaryRec.priority?.toUpperCase()}
          </p>
          <p className="primary-rec-title">{primaryRec.title}</p>
          {primaryRec.description && (
            <p className="primary-rec-desc">{truncate1(primaryRec.description)}</p>
          )}
          <div className="primary-rec-badges">
            {typeof primaryRec.riskReductionPct === 'number' && primaryRec.riskReductionPct > 0 && (
              <span className="rec-badge-risk">-{primaryRec.riskReductionPct}% risk</span>
            )}
            {primaryRec.effortBadge && (
              <span className="rec-badge-effort">{primaryRec.effortBadge}</span>
            )}
            {primaryRec.deadline && (
              <span className="rec-badge-deadline">{primaryRec.deadline}</span>
            )}
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default AnalysisSummaryTab;
