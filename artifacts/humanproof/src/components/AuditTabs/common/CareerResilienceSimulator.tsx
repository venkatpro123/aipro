// CareerResilienceSimulator.tsx — Beast Mode V3 Tab 3
//
// "If laid off tomorrow" scenario: weeks to reemployment, likely salary range,
// best escape path, market demand. Reframes the anxiety trigger into an actionable
// preparation target. Uses existing pipeline data — no new services needed.
// Sources:
//   result.jobMarketLiquidity    → reemploymentWeeks, demandTier
//   result.careerResilience      → pillars, overallResilienceScore
//   result.roleAdjacency         → best pivot roles
//   result.userFinancialRunway   → monthsOfRunway (urgency framing)
//   result.total (score)         → overall risk context

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, TrendingUp, Compass } from 'lucide-react';

interface CareerResilienceSimulatorProps {
  jobMarketLiquidity?: any;
  careerResilience?: any;
  roleAdjacency?: any;
  userFinancialRunway?: any;
  currentScore: number;
  currentRoleLabel?: string;
}

interface SimStat {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}

function weeksTierLabel(weeks: number): { label: string; color: string } {
  if (weeks <= 6)  return { label: 'Strong demand', color: 'var(--color-emerald500-text)' };
  if (weeks <= 12) return { label: 'Moderate',      color: 'var(--color-amber500-text)' };
  if (weeks <= 20) return { label: 'Slow market',   color: 'var(--color-orange500-text)' };
  return                   { label: 'Challenging',  color: 'var(--color-red600-text)' };
}

export const CareerResilienceSimulator: React.FC<CareerResilienceSimulatorProps> = ({
  jobMarketLiquidity,
  careerResilience,
  roleAdjacency,
  userFinancialRunway,
  currentScore,
  currentRoleLabel,
}) => {
  // Derive stats from available data
  const reemployWeeks: number | null = jobMarketLiquidity?.reemploymentWeeks ?? null;
  const resilienceScore: number | null = careerResilience?.overallResilienceScore ?? null;
  const runwayMonths: number | null = userFinancialRunway?.monthsOfRunway ?? null;

  const bestPivot = useMemo(() => {
    const roles: any[] = roleAdjacency?.adjacentRoles ?? [];
    const sorted = [...roles].sort((a, b) => (b.matchScore ?? b.score ?? 0) - (a.matchScore ?? a.score ?? 0));
    return sorted[0] ?? null;
  }, [roleAdjacency]);

  // Only render when we have at least 2 meaningful data points
  const hasData = (reemployWeeks != null) || (resilienceScore != null) || (bestPivot != null);
  if (!hasData) return null;

  const weeksInfo = reemployWeeks != null ? weeksTierLabel(reemployWeeks) : null;

  const stats: SimStat[] = [];

  if (reemployWeeks != null) {
    stats.push({
      icon: Clock,
      label: 'Time to Reemployment',
      value: reemployWeeks <= 26 ? `~${reemployWeeks} weeks` : '6+ months',
      sub: weeksInfo?.label ?? '',
      color: weeksInfo?.color ?? '#f59e0b',
    });
  }

  if (resilienceScore != null) {
    const rColor = resilienceScore >= 70 ? '#10b981' : resilienceScore >= 45 ? '#f59e0b' : '#f97316';
    const rLabel = resilienceScore >= 70 ? 'Strong resilience' : resilienceScore >= 45 ? 'Moderate resilience' : 'Build resilience';
    stats.push({
      icon: Shield,
      label: 'Career Resilience',
      value: `${Math.round(resilienceScore)}/100`,
      sub: rLabel,
      color: rColor,
    });
  }

  if (runwayMonths != null) {
    const rColor = runwayMonths >= 9 ? '#10b981' : runwayMonths >= 4 ? '#f59e0b' : '#dc2626';
    const rSub   = runwayMonths >= 9 ? 'Comfortable buffer' : runwayMonths >= 4 ? 'Adequate — build more' : 'Critical — act now';
    stats.push({
      icon: TrendingUp,
      label: 'Financial Buffer',
      value: `${runwayMonths} months`,
      sub: rSub,
      color: rColor,
    });
  }

  if (bestPivot) {
    const pivotRole = bestPivot.title ?? bestPivot.role ?? bestPivot.label ?? 'Adjacent role';
    const matchPct  = bestPivot.matchScore ?? bestPivot.score ?? null;
    stats.push({
      icon: Compass,
      label: 'Best Escape Path',
      value: pivotRole.length > 22 ? pivotRole.slice(0, 20) + '…' : pivotRole,
      sub: matchPct != null ? `${Math.round(matchPct)}% role fit` : 'Strongest adjacent role',
      color: 'var(--color-cyan-text)',
    });
  }

  // Urgency sentence
  const urgency = useMemo(() => {
    if (!reemployWeeks && !runwayMonths) return null;
    if (runwayMonths != null && runwayMonths < 4) {
      return `With ${runwayMonths} months of runway, you'd need a job within ${reemployWeeks ?? '?'} weeks — tighter than average.`;
    }
    if (reemployWeeks != null && reemployWeeks > 16) {
      return `This market takes ~${reemployWeeks} weeks to find the next role. Start your network now, before you need it.`;
    }
    if (reemployWeeks != null && reemployWeeks <= 8) {
      return `Strong demand: roles like yours typically re-land in ${reemployWeeks} weeks. Your buffer is in good shape.`;
    }
    return null;
  }, [reemployWeeks, runwayMonths]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--alpha-bg-06)' }}
      >
        <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-cyan-text)' }} />
        <div>
          <span className="text-[11px] font-black tracking-[0.08em] uppercase" style={{ color: 'var(--alpha-text-55)' }}>
            If Disruption Hits Tomorrow
          </span>
          {currentRoleLabel && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--alpha-text-30)' }}>
              as a {currentRoleLabel}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className={`px-4 py-3 grid gap-3 ${stats.length >= 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.06 }}
              className="rounded-xl p-3 flex flex-col gap-1.5"
              style={{
                background: stat.color + '08',
                border: `1px solid ${stat.color}22`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 flex-shrink-0" style={{ color: stat.color }} />
                <span className="text-[9px] font-black tracking-[0.10em] uppercase" style={{ color: stat.color + 'aa' }}>
                  {stat.label}
                </span>
              </div>
              <p className="text-[14px] font-black leading-none" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>
                {stat.sub}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Urgency sentence */}
      {urgency && (
        <div
          className="px-4 py-2.5"
          style={{ borderTop: '1px solid var(--alpha-bg-06)' }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
            {urgency}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default CareerResilienceSimulator;
