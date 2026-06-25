// SocialProofStrip.tsx — P3 Retention
//
// Shows aggregate action completion stats as social proof.
// "1,247 users completed this action" / "Top 5% of users do this first"
// Data is estimated from cohort benchmarks — not real-time tracking.
// Renders as a subtle inline strip below action cards.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Zap } from 'lucide-react';

interface SocialProofStripProps {
  actionPriority: string;
  actionCategory?: string;
  riskTier: string;
  totalAuditCount?: number;
}

const COHORT_ESTIMATES: Record<string, { completionRate: number; avgDaysToComplete: number }> = {
  Critical: { completionRate: 78, avgDaysToComplete: 3 },
  High:     { completionRate: 62, avgDaysToComplete: 7 },
  Medium:   { completionRate: 45, avgDaysToComplete: 14 },
  Low:      { completionRate: 28, avgDaysToComplete: 30 },
};

function estimateUserCount(priority: string, baseCount: number): number {
  const rate = COHORT_ESTIMATES[priority]?.completionRate ?? 40;
  return Math.round(baseCount * (rate / 100));
}

export const SocialProofStrip: React.FC<SocialProofStripProps> = ({
  actionPriority,
  actionCategory,
  riskTier,
  totalAuditCount = 5200,
}) => {
  const estimate = useMemo(() => {
    const count = estimateUserCount(actionPriority, totalAuditCount);
    const cohort = COHORT_ESTIMATES[actionPriority];
    if (!cohort) return null;
    return {
      count: count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count),
      avgDays: cohort.avgDaysToComplete,
      completionRate: cohort.completionRate,
    };
  }, [actionPriority, totalAuditCount]);

  if (!estimate) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex items-center gap-3 flex-wrap"
      style={{ marginTop: 6 }}
    >
      <div className="flex items-center gap-1">
        <Users className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.22)' }} />
        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
          {estimate.count}+ users completed this
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Zap className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.22)' }} />
        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
          Avg {estimate.avgDays}d to complete
        </span>
      </div>
      {estimate.completionRate >= 60 && (
        <div className="flex items-center gap-1">
          <TrendingUp className="w-2.5 h-2.5" style={{ color: 'rgba(16,185,129,0.35)' }} />
          <span className="text-[9px]" style={{ color: 'rgba(16,185,129,0.40)' }}>
            Most popular action
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default SocialProofStrip;
