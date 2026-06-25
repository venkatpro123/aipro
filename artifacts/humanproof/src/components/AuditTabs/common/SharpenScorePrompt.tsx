// SharpenScorePrompt.tsx — P4 of the platform transformation ("fold capture into the reveal")
//
// PROBLEM
// The cold-start moment was rendered as a passive amber CAVEAT ("Score reflects
// company & market risk only — add your profile →") that bounced the user to a
// different tab. It framed missing personalization as a deficiency and asked the
// frightened user to leave the screen that just calmed them down. Conversion was
// low because the ask read as a chore, not an upgrade.
//
// SOLUTION
// Reframe the same honest gap as an OPPORTUNITY the user can act on without
// leaving the page. Lead with the upside ("sharpen your score by ±8–25 pts"),
// then reveal the existing 3-question ProfileQuickCapture inline on tap. On
// completion we persist to the shared quick-capture key AND dispatch
// `hp.quickCapture.completed` so the dashboard recomputes the audit with the new
// personal signals — the score visibly moves, closing the loop.
//
// Honesty preserved: the same three factors (visa, runway, dependents) and the
// same ±8–25 pt framing as the prior caveat — we changed the posture, not the
// truth. Renders nothing once completed (24h TTL, shared with ActionsTab).
//
// Pure presentational + localStorage. SSR-safe. No Date.now in render output.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import ProfileQuickCapture from '../../ProfileQuickCapture';

// Shared with ActionsTab — completing capture in either place suppresses both.
const QC_KEY = 'hp.quickCapture.done';
const QC_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function alreadyCaptured(): boolean {
  try {
    const raw = localStorage.getItem(QC_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw) as { ts: number };
    return Date.now() - ts < QC_TTL_MS;
  } catch {
    return false;
  }
}

const ACCENT = '#22d3ee';

export const SharpenScorePrompt: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => alreadyCaptured());

  if (dismissed) return null;

  const handleComplete = () => {
    try { localStorage.setItem(QC_KEY, JSON.stringify({ ts: Date.now() })); } catch { /* swallow */ }
    // Let the dashboard re-run the audit with the new personal signals so the
    // score actually moves — the payoff that justifies the ask.
    try { window.dispatchEvent(new CustomEvent('hp.quickCapture.completed')); } catch { /* SSR */ }
    setDismissed(true);
  };

  return (
    <AnimatePresence mode="wait">
      {open ? (
        <motion.div
          key="capture"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
        >
          <ProfileQuickCapture onComplete={handleComplete} />
        </motion.div>
      ) : (
        <motion.button
          key="pitch"
          type="button"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl px-4 py-3 flex items-start gap-3 text-left transition-all"
          style={{
            background: `linear-gradient(135deg, ${ACCENT}14, rgba(255,255,255,0.02))`,
            border: `1px solid ${ACCENT}30`,
            cursor: 'pointer',
          }}
          aria-label="Personalize your score with three quick questions"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${ACCENT}1c`, border: `1px solid ${ACCENT}33` }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-[0.12em] uppercase mb-1" style={{ color: ACCENT }}>
              Make this your score
            </p>
            <p className="text-[13px] font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.90)' }}>
              Right now this is company &amp; market risk — not yet you
            </p>
            <p className="text-[11px] leading-snug mt-1" style={{ color: 'var(--alpha-text-50)' }}>
              Three questions — visa, runway, family — can move your score by{' '}
              <span style={{ color: ACCENT, fontWeight: 600 }}>±8–25 pts</span>. Takes 20 seconds, and
              the number updates live.
            </p>
            <span
              className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold"
              style={{ color: ACCENT }}
            >
              Sharpen my score
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default SharpenScorePrompt;
