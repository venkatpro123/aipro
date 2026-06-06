// FirstAuditWelcome.tsx — v34.0 UX redesign
//
// Renders a calm, three-step welcome card *inline* in the Summary tab the
// first time a user lands on the dashboard. Goal: orient the user without
// teleporting them out of the experience or overwhelming them.
//
// "This platform understands my situation."
// "This data is live."
// "This analysis is actionable."
//
// Dismissable — closes for the rest of the session AND persists via the
// markFirstAuditSeen helper from useDashboardAdaptation.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Radio, Zap } from 'lucide-react';
import { markFirstAuditSeen } from '../../../hooks/useDashboardAdaptation';

interface Props {
  /** Live signal count — drives the "data is live" line. */
  liveSignalCount: number;
  /** Critical-actions count — drives the "actionable" line. */
  criticalActionCount: number;
  /**
   * v39.0 F3 — confidence percent for the welcome card. When < 60, the third
   * step changes copy to explicitly call out the lower-confidence read so
   * the user doesn't anchor on a falsely-precise framing.
   */
  confidencePercent?: number;
  /** v39.0 F3 — number of profile fields the user has filled (out of ~15). */
  profileFieldsFilled?: number;
  onDismiss?: () => void;
}

export const FirstAuditWelcome: React.FC<Props> = ({
  liveSignalCount, criticalActionCount, confidencePercent, profileFieldsFilled, onDismiss,
}) => {
  const [open, setOpen] = React.useState(true);

  const handleDismiss = () => {
    markFirstAuditSeen();
    setOpen(false);
    onDismiss?.();
  };

  // v39.0 F3 — step 1 subtitle now reflects how complete the user's profile
  // is, step 2 reflects live signals (existing), step 3 reflects confidence
  // OR action count (whichever is more useful right now).
  const profileSub = profileFieldsFilled != null
    ? profileFieldsFilled >= 10
      ? `Your profile (${profileFieldsFilled}/15 fields) gives us deep personalisation.`
      : profileFieldsFilled >= 5
        ? `We have ${profileFieldsFilled}/15 profile fields — useful, more accurate with all 15.`
        : `Only ${profileFieldsFilled}/15 profile fields filled — score is still directional. Update your profile for sharper analysis.`
    : 'We mixed your profile with company-specific risk signals.';

  const confidenceLabel = confidencePercent != null
    ? confidencePercent >= 75
      ? `${confidencePercent}% confidence · ${criticalActionCount > 0 ? `${criticalActionCount} priority action${criticalActionCount === 1 ? '' : 's'}` : 'No critical actions'}`
      : confidencePercent >= 50
        ? `${confidencePercent}% confidence · ${criticalActionCount > 0 ? `${criticalActionCount} priority action${criticalActionCount === 1 ? '' : 's'} (treat as directional)` : 'Directional read'}`
        : `${confidencePercent}% confidence · LOW — open Methodology tab for caveats`
    : criticalActionCount > 0
      ? `${criticalActionCount} priority action${criticalActionCount === 1 ? '' : 's'} this week`
      : 'Actionable, not just analytical';

  const steps: Array<{ icon: React.ElementType; label: string; sub: string; color: string }> = [
    {
      icon:  Brain,
      label: 'Tailored to your role',
      sub:   profileSub,
      color: '#22d3ee',
    },
    {
      icon:  Radio,
      label: liveSignalCount > 0 ? `${liveSignalCount} live signal${liveSignalCount === 1 ? '' : 's'} read just now` : 'Scanning live sources',
      sub:   'Hiring activity, news, government filings, and more.',
      color: '#10b981',
    },
    {
      icon:  Zap,
      label: confidenceLabel,
      sub:   'Every signal is paired with a concrete step you can take.',
      color: confidencePercent != null && confidencePercent < 50 ? '#f97316' : '#f59e0b',
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,224,0.08), rgba(139,92,246,0.04))',
            border: '1px solid rgba(0,212,224,0.20)',
          }}
        >
          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-white/5 transition-colors"
            aria-label="Dismiss welcome"
          >
            <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.40)' }} />
          </button>

          <p
            className="text-[10px] font-black tracking-[0.18em] mb-2"
            style={{ color: 'rgba(0,212,224,0.85)' }}
          >
            FIRST AUDIT · WHAT TO LOOK AT
          </p>
          <p className="text-[13px] font-bold leading-tight mb-3" style={{ color: 'rgba(255,255,255,0.92)' }}>
            Here's how to read this dashboard.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {steps.map(({ icon: Icon, label, sub, color }, i) => (
              <div
                key={i}
                className="rounded-xl p-2.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}25` }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                  <span className="text-[10px] font-black tracking-wider" style={{ color }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-[11px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {label}
                </p>
                <p className="text-[10px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {sub}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={handleDismiss}
            className="mt-3 text-[10px] font-bold tracking-wide opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'rgba(0,212,224,0.85)' }}
          >
            Got it — show me the dashboard →
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FirstAuditWelcome;
