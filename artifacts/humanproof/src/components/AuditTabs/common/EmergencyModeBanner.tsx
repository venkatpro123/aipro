// EmergencyModeBanner.tsx — v34.0 UX redesign
//
// Pinned banner shown at the top of the dashboard when:
//   • Active WARN filing detected, OR
//   • Layoff risk score ≥ 75, OR
//   • Any Tier-1 signal is "critical"
//
// One single, calm-but-urgent banner that:
//   1. Names the situation in one sentence
//   2. Routes the user to the Action Plan tab via a CTA
//
// No technical jargon. No data dumps. Just the verdict + a clear action.

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  result: HybridResult;
  onJumpToActions: () => void;
}

function buildHeadline(result: HybridResult): string {
  const r = result as any;
  if (r.warnSignal?.hasActiveWARN === true) {
    const notices = r.warnSignal?.recentNotices?.length ?? 0;
    return notices > 0
      ? `Active WARN filing detected — ${notices} recent notice${notices === 1 ? '' : 's'} on record.`
      : 'Active WARN filing detected for this company.';
  }
  if (result.total >= 85) return 'Layoff risk is critical — immediate action required.';
  if (result.total >= 75) return 'Layoff risk is elevated and trending up — start positioning this week.';
  return 'Multiple critical signals stacked — prioritise the action plan.';
}

export const EmergencyModeBanner: React.FC<Props> = ({ result, onJumpToActions }) => {
  const headline = buildHeadline(result);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, rgba(220,38,38,0.18), rgba(220,38,38,0.08))',
        border: '1px solid rgba(220,38,38,0.45)',
      }}
    >
      {/* Pulsing edge */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          boxShadow: 'inset 0 0 28px rgba(220,38,38,0.25)',
          borderRadius: 'inherit',
        }}
      />

      <div className="px-4 py-3 flex items-center gap-3 relative">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(220,38,38,0.20)', border: '1px solid rgba(220,38,38,0.40)' }}>
          <ShieldAlert className="w-4 h-4" style={{ color: '#fca5a5' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black tracking-[0.18em] mb-0.5" style={{ color: '#fca5a5' }}>
            EMERGENCY MODE
          </p>
          <p className="text-[12px] font-bold leading-snug truncate" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {headline}
          </p>
        </div>
        <button
          onClick={onJumpToActions}
          className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl flex-shrink-0 transition-all hover:scale-[1.02]"
          style={{
            background: 'rgba(220,38,38,0.30)',
            color: '#fecaca',
            border: '1px solid rgba(220,38,38,0.55)',
          }}
        >
          Plan <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

export default EmergencyModeBanner;
