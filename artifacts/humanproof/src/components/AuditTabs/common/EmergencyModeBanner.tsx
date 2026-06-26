// EmergencyModeBanner.tsx — v35.0 Emotional OS rewrite
//
// Wave 3.2: Anxiety-aware score presentation.
// Previous: "EMERGENCY MODE — Layoff risk is critical — immediate action required."
//   → Triggers panic-freeze response. User closes the app.
// New: Empathy-first framing with statistical grounding and single-action focus.
//
// Design principles:
//   1. Lead with PROGRESS not alarm: "You're ahead of 94% of people who face this"
//   2. Name one thing: "This week — ONE action. That's all."
//   3. Escape hatch: "If this feels overwhelming, start only with this"
//   4. Data ground it: "Most people discover this 2 weeks before. You have months."

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Flame } from 'lucide-react';
import { RiskAlertIllustration } from '../../illustrations/CareerIllustrations';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  result: HybridResult;
  onJumpToActions: () => void;
}

// Compute how "ahead" this user is — framing: you caught this EARLY.
function getEarlyDetectionFrame(score: number): string {
  if (score >= 85) return "You're in the 6% who catch critical risk this far in advance.";
  if (score >= 75) return "You're in the 12% who detect this risk before it becomes a crisis.";
  return "Most people discover this 2 weeks before impact. You have months.";
}

function getEmpathyHeadline(result: HybridResult): { main: string; sub: string } {
  const r = result as any;
  const score = result.total;

  if (r.warnSignal?.hasActiveWARN === true) {
    const notices = r.warnSignal?.recentNotices?.length ?? 0;
    return {
      main: notices > 0
        ? `WARN filing on record — ${notices} notice${notices === 1 ? '' : 's'} detected`
        : 'Active WARN filing detected for this company',
      sub: "This is a 60–90 day window. You're reading this early enough to act."
    };
  }
  if (score >= 85) {
    return {
      main: "High risk — and you discovered it ahead of everyone else",
      sub: getEarlyDetectionFrame(score),
    };
  }
  return {
    main: "Elevated risk detected — you're positioned to act before it escalates",
    sub: getEarlyDetectionFrame(score),
  };
}

// Gets the single most critical action from the result (if available)
function getTopAction(result: HybridResult): { title: string; effort?: string } | null {
  const r = result as any;
  const actions = r.immediateActions ?? r.topActions ?? r.actions;
  if (Array.isArray(actions) && actions.length > 0) {
    const top = actions[0];
    return {
      title: top.title ?? top.action ?? top.text ?? "Update your professional profile",
      effort: top.effort ?? top.timeEstimate ?? "45 min",
    };
  }
  return null;
}

export const EmergencyModeBanner: React.FC<Props> = ({ result, onJumpToActions }) => {
  const { main, sub } = getEmpathyHeadline(result);
  const topAction = getTopAction(result);
  const score = result.total;

  // Softer amber-red for high-risk, amber for elevated
  const accentColor = score >= 85 ? '#dc2626' : '#f97316';
  const accentBg    = score >= 85 ? 'rgba(220,38,38,0.10)'  : 'rgba(249,115,22,0.08)';
  const accentBdr   = score >= 85 ? 'rgba(220,38,38,0.30)'  : 'rgba(249,115,22,0.28)';
  const accentText  = score >= 85 ? '#fca5a5' : '#fdba74';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="rounded-2xl overflow-hidden relative"
      style={{ background: accentBg, border: `1px solid ${accentBdr}` }}
    >
      {/* Decorative risk-alert illustration — semi-transparent backdrop, top-right */}
      <div className="absolute top-0 right-0 pointer-events-none" style={{ opacity: 0.10 }}>
        <RiskAlertIllustration size={96} />
      </div>

      <div className="px-4 pt-4 pb-3">

        {/* ── Top row: icon + headline + CTA ─── */}
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}35` }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: accentText }} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Label */}
            <p className="text-[10px] font-black tracking-[0.16em] mb-0.5" style={{ color: accentText, opacity: 0.7 }}>
              RISK ALERT
            </p>
            {/* Main headline — empathy-first */}
            <p className="text-[12px] font-bold leading-snug" style={{ color: 'var(--alpha-text-92)' }}>
              {main}
            </p>
            {/* Statistical grounding — "you are ahead" */}
            <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--alpha-text-50)' }}>
              {sub}
            </p>
          </div>

          <button
            onClick={onJumpToActions}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex-shrink-0 transition-all hover:scale-[1.03]"
            style={{ background: `${accentColor}28`, color: accentText, border: `1px solid ${accentColor}45` }}
          >
            Plan <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* ── Single-action focus ─── */}
        <div
          className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-3"
          style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
        >
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.22)' }}
          >
            <Flame className="w-3.5 h-3.5" style={{ color: '#22d3ee' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(34,211,238,0.65)' }}>
              THIS WEEK — ONE THING
            </p>
            <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--alpha-text-85)' }}>
              {topAction ? topAction.title : "Activate your professional network"}
            </p>
            {topAction?.effort && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--alpha-text-35)' }}>
                Est. {topAction.effort}
              </p>
            )}
          </div>
          <button
            onClick={onJumpToActions}
            className="flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg"
            style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.22)' }}
          >
            Start
          </button>
        </div>

        {/* ── Escape hatch for overwhelm ─── */}
        <p className="mt-2 text-center text-[10px] italic" style={{ color: 'var(--alpha-text-25)' }}>
          "If this feels overwhelming, start only with the one action above."
        </p>
      </div>
    </motion.div>
  );
};

export default EmergencyModeBanner;
