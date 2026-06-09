// InactionWarningStrip.tsx — Rule 1 (Decision-first) + Rule 4 (Psychology-first)
//
// Thin amber strip shown below TodaysMissionWidget when score >= 50.
// Answers "what happens if I skip today's action?" with a concrete projected score.
// Pure render — all computation is in inactionConsequenceCalculator.ts.

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useLayoff } from '../../context/LayoffContext';
import type { HybridResult, ActionPlanItem } from '../../types/hybridResult';
import { computeInaction30Day } from '../../services/inactionConsequenceCalculator';

const LABEL_COLORS: Record<string, string> = {
  'Critical':  '#ef4444',
  'High Risk': '#f97316',
  'Elevated':  '#f59e0b',
  'Stable':    '#10b981',
};

export function InactionWarningStrip() {
  const { state } = useLayoff();
  const hr = state.scoreResult as HybridResult | null;
  if (!hr) return null;

  const score = hr.total ?? 0;
  if (score < 50) return null;

  // Pick the top (first uncompleted) action item
  const actions: ActionPlanItem[] | undefined = hr.actionItems ?? (hr as any).recommendations;
  if (!actions || actions.length === 0) return null;
  const topAction = actions[0];

  // Compute the 30-day inaction projection (null topSignal — calculator has safe default)
  const projection = computeInaction30Day(score, null, topAction);

  // Don't show if the projected score isn't meaningfully worse (< 2 pts delta)
  if (projection.projectedScore - score < 2) return null;

  const labelColor = LABEL_COLORS[projection.label] ?? '#f59e0b';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      style={{
        marginBottom: 20,
        padding: '9px 14px',
        borderRadius: 8,
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.78rem',
      }}
    >
      <TrendingUp size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
      <span style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
        If you skip today&apos;s action, your risk score is projected to rise to{' '}
        <span style={{ fontWeight: 700, color: labelColor }}>
          {projection.projectedScore}
        </span>{' '}
        <span style={{ color: 'rgba(255,255,255,0.35)' }}>({projection.label})</span>{' '}
        by {projection.targetDate}.
      </span>
    </motion.div>
  );
}
