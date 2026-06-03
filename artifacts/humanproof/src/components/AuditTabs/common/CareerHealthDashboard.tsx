// CareerHealthDashboard.tsx — Beast Mode V3
//
// Protection tab hero. Shows career resilience across 5 health dimensions.
// Framing: protection, not risk. "Career Health" not "Layoff Risk".
// Sources:
//   preparedness.pillars          → skills, marketability
//   jobMarketLiquidity             → market demand / reemployment weeks
//   userFinancialRunway            → financial buffer months
//   careerResilience.pillars       → mobility
//   careerVelocity                 → career velocity score
//
// Falls back gracefully when any dimension is unavailable.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';

interface CareerHealthDashboardProps {
  preparedness?: PreparednessResult;
  careerResilience?: any;
  skillGapIntelligence?: any;
  jobMarketLiquidity?: any;
  userFinancialRunway?: any;
  careerVelocity?: any;
  currentScore: number;
}

interface HealthDimension {
  label: string;
  score: number;         // 0–100
  valueLabel: string;
  color: string;
  available: boolean;
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

function dimensionColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#f97316';
}

export const CareerHealthDashboard: React.FC<CareerHealthDashboardProps> = ({
  preparedness,
  careerResilience,
  skillGapIntelligence,
  jobMarketLiquidity,
  userFinancialRunway,
  careerVelocity,
  currentScore,
}) => {
  const dimensions: HealthDimension[] = useMemo(() => {
    const dims: HealthDimension[] = [];

    // 1. Skills
    const skillScore = (() => {
      if (preparedness?.overallScore != null) return clamp(preparedness.overallScore, 0, 100);
      if (skillGapIntelligence?.overallGapScore != null) return clamp(100 - skillGapIntelligence.overallGapScore, 0, 100);
      return null;
    })();
    dims.push({
      label: 'Skills',
      score: skillScore ?? 50,
      valueLabel: skillScore != null
        ? (skillScore >= 70 ? 'Strong' : skillScore >= 45 ? 'Developing' : 'Gaps detected')
        : 'Unknown',
      color: dimensionColor(skillScore ?? 50),
      available: skillScore != null,
    });

    // 2. Market Demand
    const reemployWeeks = jobMarketLiquidity?.reemploymentWeeks ?? null;
    const marketScore = reemployWeeks != null
      ? clamp(Math.round(100 - (reemployWeeks / 26) * 100), 10, 100)
      : null;
    dims.push({
      label: 'Market Demand',
      score: marketScore ?? 50,
      valueLabel: reemployWeeks != null
        ? (reemployWeeks <= 8 ? 'High demand' : reemployWeeks <= 16 ? 'Moderate' : 'Slow market')
        : 'Unknown',
      color: dimensionColor(marketScore ?? 50),
      available: marketScore != null,
    });

    // 3. Financial Buffer
    const runwayMonths = userFinancialRunway?.monthsOfRunway ?? null;
    const financeScore = runwayMonths != null
      ? clamp(Math.round((runwayMonths / 12) * 100), 5, 100)
      : null;
    dims.push({
      label: 'Financial Buffer',
      score: financeScore ?? 50,
      valueLabel: runwayMonths != null
        ? (runwayMonths >= 9 ? `${runwayMonths}mo runway` : runwayMonths >= 4 ? `${runwayMonths}mo — build up` : `${runwayMonths}mo — critical`)
        : 'Unknown',
      color: dimensionColor(financeScore ?? 50),
      available: financeScore != null,
    });

    // 4. Mobility
    const mobilityPillar = careerResilience?.pillars?.find((p: any) => /mobility/i.test(p.name ?? p.label ?? ''));
    const mobilityScore = mobilityPillar?.score ?? null;
    dims.push({
      label: 'Mobility',
      score: mobilityScore ?? 50,
      valueLabel: mobilityScore != null
        ? (mobilityScore >= 70 ? 'Strong options' : mobilityScore >= 45 ? 'Some options' : 'Limited paths')
        : 'Unknown',
      color: dimensionColor(mobilityScore ?? 50),
      available: mobilityScore != null,
    });

    // 5. Career Velocity
    const velocityScore = careerVelocity?.velocityScore ?? null;
    dims.push({
      label: 'Career Velocity',
      score: velocityScore ?? 50,
      valueLabel: velocityScore != null
        ? (velocityScore >= 70 ? 'Accelerating' : velocityScore >= 45 ? 'On track' : 'Stalling')
        : 'Unknown',
      color: dimensionColor(velocityScore ?? 50),
      available: velocityScore != null,
    });

    return dims;
  }, [preparedness, careerResilience, skillGapIntelligence, jobMarketLiquidity, userFinancialRunway, careerVelocity]);

  const availableDims = dimensions.filter(d => d.available);
  const overallScore = availableDims.length > 0
    ? Math.round(availableDims.reduce((sum, d) => sum + d.score, 0) / availableDims.length)
    : 50;

  const strongCount = dimensions.filter(d => d.available && d.score >= 70).length;
  const gapCount = dimensions.filter(d => d.available && d.score < 45).length;

  const overallColor = overallScore >= 70 ? '#10b981' : overallScore >= 45 ? '#f59e0b' : '#f97316';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
            CAREER HEALTH
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
            {strongCount} factor{strongCount !== 1 ? 's' : ''} strong · {gapCount} gap{gapCount !== 1 ? 's' : ''} identified
          </p>
        </div>
        <div className="text-right">
          <span className="text-[28px] font-black leading-none" style={{ color: overallColor }}>
            {overallScore}
          </span>
          <p className="text-[9px]" style={{ color: overallColor + 'aa' }}>/100</p>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="flex flex-col gap-2.5">
        {dimensions.map((dim, i) => (
          <motion.div
            key={dim.label}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.08 + i * 0.05 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold" style={{ color: dim.available ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.35)' }}>
                {dim.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: dim.available ? dim.color : 'rgba(255,255,255,0.25)' }}>
                  {dim.valueLabel}
                </span>
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded"
                  style={{
                    background: dim.available ? dim.color + '18' : 'rgba(255,255,255,0.04)',
                    color: dim.available ? dim.color : 'rgba(255,255,255,0.25)',
                  }}
                >
                  {dim.score}
                </span>
              </div>
            </div>
            {/* Bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dim.score}%` }}
                transition={{ duration: 0.8, delay: 0.12 + i * 0.06, ease: 'easeOut' }}
                className="h-1.5 rounded-full"
                style={{
                  background: dim.available ? dim.color : 'rgba(255,255,255,0.12)',
                  opacity: dim.available ? 1 : 0.5,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default CareerHealthDashboard;
