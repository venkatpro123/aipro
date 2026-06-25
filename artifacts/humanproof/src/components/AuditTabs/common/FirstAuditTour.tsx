// FirstAuditTour.tsx — Wave 3.5 Non-Blocking First-Audit Guided Tour
//
// PROBLEM: FirstAuditWelcomeModal (the previous approach) blocks the score
// ring behind a centered overlay. The user's first instinct is "what's my
// score?" — we should NEVER block that. The modal also shows all info at
// once (cognitive overload) rather than guiding attention step by step.
//
// SOLUTION: Replace with a 4-step non-blocking tour anchored to the bottom
// of the screen. Dashboard is fully interactive behind it. User progresses
// at their own pace. Score is always visible.
//
// Tour steps:
//   1. Score   — "This is your risk score. Here's what it means in practice."
//   2. Drivers — "Three factors drive your score most. Understanding them = focus."
//   3. Action  — "This is your highest-ROI action this week. Est. time X."
//   4. Company — "Your company shows [signal]. Check the Company tab for details."
//
// Rules:
//   • Appears 2s after `open` turns true (delay lets score ring finish animating)
//   • z-60 (above AICommentary z-50, below nothing critical)
//   • NOT a modal — no backdrop, no blocking, no focus trap
//   • Skip at any time — marks tour complete via markFirstAuditSeen()
//   • Progress pill dots animate width on active step
//   • Step content slides horizontally on step change (AnimatePresence mode="wait")
//   • `prefers-reduced-motion` respected via framer-motion defaults

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { markFirstAuditSeen } from '../../../hooks/useDashboardAdaptation';
import type { HybridResult } from '../../../types/hybridResult';
import { riskLabel, riskColor } from '../../../lib/riskTokens';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  result: HybridResult;
  open: boolean;
  onClose: () => void;
}

interface Step {
  id: string;
  headline: (r: HybridResult) => string;
  body: (r: HybridResult) => string;
}

// ── Tour step definitions ─────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 'score',
    headline: (r) => `Your risk score is ${r.total}/100`,
    body: (r) => {
      const score = r.total;
      if (score >= 75)
        return `That's ${riskLabel(score)} risk — but you're discovering it months before most people do. That advance warning is your biggest advantage.`;
      if (score >= 55)
        return `That's ${riskLabel(score)} risk. It's manageable if you act over the next 30 days. The driver cards below show exactly where to focus.`;
      if (score >= 35)
        return `That's ${riskLabel(score)} risk. The right strategic moves now can meaningfully improve your position within 60 days.`;
      return `That's ${riskLabel(score)} risk — a strong position. Use this time to build career capital so you're never caught off-guard.`;
    },
  },
  {
    id: 'drivers',
    headline: () => 'Three factors drive your score most',
    body: () =>
      "The driver cards below show exactly what's pushing your number. Understanding them tells you where to focus first — rather than trying to fix everything at once.",
  },
  {
    id: 'action',
    headline: (r) => {
      const rr = r as any;
      const title =
        rr.recommendations?.[0]?.title ??
        rr.immediateActions?.[0]?.title ??
        rr.actionPlan?.phase1?.[0]?.title ??
        'Your top action this week';
      return title.length > 52 ? title.slice(0, 51) + '…' : title;
    },
    body: (r) => {
      const rr = r as any;
      const timeEst =
        rr.recommendations?.[0]?.timeEstimate ??
        rr.immediateActions?.[0]?.timeEstimate ??
        rr.recommendations?.[0]?.effort;
      const base =
        'This is your highest-ROI action — the one with the biggest estimated score impact per hour invested. Start here before anything else.';
      return timeEst ? `${base} Est. ${timeEst}.` : base;
    },
  },
  {
    id: 'company',
    headline: (r) => {
      const rr = r as any;
      const co = rr.companyName ?? 'Your company';
      const freeze = rr.hiringSignal?.hiringFrozen === true;
      const rounds = rr.companyData?.layoffRounds ?? rr.layoffRounds ?? 0;
      if (freeze) return `${co}: hiring is currently frozen`;
      if (rounds > 0) return `${co}: ${rounds} layoff round${rounds > 1 ? 's' : ''} detected`;
      return `${co}: live signals are tracked`;
    },
    body: (r) => {
      const rr = r as any;
      const freeze = rr.hiringSignal?.hiringFrozen === true;
      const rounds = rr.companyData?.layoffRounds ?? rr.layoffRounds ?? 0;
      if (freeze)
        return 'A hiring freeze is one of the strongest early layoff signals the AI tracks. The Company tab has the full breakdown — worth checking next.';
      if (rounds > 0)
        return 'Multiple layoff rounds are a heavy risk signal. The Company tab shows exactly when they happened and what the data says now.';
      return 'The Company tab has live signals — WARN filings, hiring trends, news — updated as they change. Check it to see the ground truth behind your score.';
    },
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export const FirstAuditTour: React.FC<Props> = ({ result, open, onClose }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  // Appear 2s after `open` turns true — lets score ring animation finish first
  useEffect(() => {
    if (!open) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, [open]);

  const close = () => {
    markFirstAuditSeen();
    setVisible(false);
    // Allow exit animation before calling onClose
    setTimeout(onClose, 320);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      close();
    }
  };

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const scoreCol = riskColor(result.total);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="first-audit-tour"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.97 }}
          transition={{ duration: 0.30, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-1/2 z-[60] pointer-events-auto"
          style={{
            bottom: 'calc(72px + env(safe-area-inset-bottom, 12px))',
            transform: 'translateX(-50%)',
            maxWidth: 'min(400px, calc(100vw - 24px))',
            width: '100%',
          }}
          role="dialog"
          aria-label="First audit guided tour"
          aria-live="polite"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(8,15,30,0.97)',
              border: '1px solid rgba(34,211,238,0.28)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(34,211,238,0.06)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >

            {/* ── Header: progress dots + step counter + skip X ─────────── */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              {/* Pill-style progress dots — active pill expands */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width:      i === step ? 18 : 6,
                      background: i === step
                        ? 'rgba(34,211,238,0.85)'
                        : i < step
                          ? 'rgba(34,211,238,0.38)'
                          : 'rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-25)' }}>
                  {step + 1} of {STEPS.length}
                </span>
                <button
                  onClick={close}
                  className="p-1 rounded-lg transition-opacity hover:opacity-70"
                  style={{ color: 'var(--alpha-text-35)' }}
                  aria-label="Skip tour"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Step content — slides on step change ──────────────────── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16 }}
                className="px-4 pt-2 pb-3"
              >
                <p
                  className="text-[13px] font-bold leading-snug mb-1.5"
                  style={{ color: step === 0 ? scoreCol : 'rgba(255,255,255,0.90)' }}
                >
                  {current.headline(result)}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
                  {current.body(result)}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* ── Footer: skip (left) + next/done (right) ───────────────── */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={close}
                className="text-[10px] font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--alpha-text-25)' }}
              >
                Skip tour
              </button>
              <button
                onClick={next}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-opacity hover:opacity-80"
                style={{
                  background: 'rgba(34,211,238,0.12)',
                  border:     '1px solid rgba(34,211,238,0.30)',
                  color:      'rgba(34,211,238,0.92)',
                }}
              >
                {isLast ? 'Show me the dashboard' : 'Next'}
                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Swipe hint on step 1 only */}
          {step === 0 && (
            <p
              className="text-center text-[10px] mt-1.5"
              style={{ color: 'var(--alpha-text-25)' }}
            >
              Tap Next to walk through the dashboard
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FirstAuditTour;
