// FirstAuditWelcomeModal.tsx — v audit UX
//
// Modal overlay wrapper for the FirstAuditWelcome card.
//
// Previously the welcome card rendered INLINE at the top of SummaryTab,
// blocking the score ring until the user dismissed it. This was a UX bug:
// the user's first question is "Am I safe?" — the score should be the very
// first thing they see, with the welcome as a secondary onboarding layer.
//
// This component renders the welcome card as a centered modal overlay using
// a React portal so the score ring (and the full dashboard) is always visible
// behind it. The backdrop is 60% opacity — enough to focus on the card
// while letting the user see the score ring in the background.
//
// Auto-dismisses on backdrop click. Calls markFirstAuditSeen() on close
// so the modal never reappears.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Radio, Zap } from 'lucide-react';
import { markFirstAuditSeen } from '../../../hooks/useDashboardAdaptation';

interface Props {
  open: boolean;
  liveSignalCount: number;
  criticalActionCount: number;
  confidencePercent?: number;
  profileFieldsFilled?: number;
  onClose: () => void;
}

export const FirstAuditWelcomeModal: React.FC<Props> = ({
  open,
  liveSignalCount,
  criticalActionCount,
  confidencePercent,
  profileFieldsFilled,
  onClose,
}) => {
  const handleClose = () => {
    markFirstAuditSeen();
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // v39.0 F3 step labels
  const profileSub = profileFieldsFilled != null
    ? profileFieldsFilled >= 10
      ? `Your profile (${profileFieldsFilled}/15 fields) gives us deep personalisation.`
      : profileFieldsFilled >= 5
        ? `We have ${profileFieldsFilled}/15 profile fields — more accurate with all 15.`
        : `Only ${profileFieldsFilled}/15 profile fields filled — update your profile for a sharper score.`
    : 'We mixed your profile with company-specific risk signals.';

  const confidenceLabel = confidencePercent != null
    ? confidencePercent >= 75
      ? `${confidencePercent}% confidence · ${criticalActionCount > 0 ? `${criticalActionCount} priority action${criticalActionCount === 1 ? '' : 's'}` : 'No critical actions'}`
      : confidencePercent >= 50
        ? `${confidencePercent}% confidence · ${criticalActionCount > 0 ? `${criticalActionCount} action${criticalActionCount === 1 ? '' : 's'} (treat as directional)` : 'Directional read'}`
        : `${confidencePercent}% confidence · LOW — see Methodology tab for caveats`
    : criticalActionCount > 0
      ? `${criticalActionCount} priority action${criticalActionCount === 1 ? '' : 's'} this week`
      : 'Actionable, not just analytical';

  const steps: Array<{ icon: React.ElementType; label: string; sub: string; color: string }> = [
    {
      icon:  Brain,
      label: 'Tailored to your role',
      sub:   profileSub,
      color: 'var(--color-cyan-text)',
    },
    {
      icon:  Radio,
      label: liveSignalCount > 0 ? `${liveSignalCount} live signal${liveSignalCount === 1 ? '' : 's'} read just now` : 'Scanning live sources',
      sub:   'WARN filings, hiring trends, SEC filings, news, and more.',
      color: '#10b981',
    },
    {
      icon:  Zap,
      label: confidenceLabel,
      sub:   'Every signal is paired with a concrete step you can take.',
      color: confidencePercent != null && confidencePercent < 50 ? '#f97316' : '#f59e0b',
    },
  ];

  const portal = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="faw-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(8,15,30,0.72)',
              backdropFilter: 'blur(2px)',
            }}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            key="faw-card"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to HumanProof — first audit"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                pointerEvents: 'auto',
                width: '100%',
                maxWidth: 480,
                borderRadius: 20,
                padding: '20px',
                position: 'relative',
                background: 'linear-gradient(135deg, rgba(8,20,42,0.98), rgba(12,28,56,0.98))',
                border: '1px solid rgba(0,212,224,0.28)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.70), 0 0 0 1px rgba(0,212,224,0.08)',
              }}
            >
              {/* Dismiss button */}
              <button
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  padding: 6,
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--alpha-text-45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Dismiss welcome"
              >
                <X size={14} />
              </button>

              <p style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(0,212,224,0.85)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                FIRST AUDIT · WHAT TO LOOK AT
              </p>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.35, color: 'var(--alpha-text-92)', marginBottom: 14 }}>
                Here's how to read this dashboard.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 14 }}>
                {steps.map(({ icon: Icon, label, sub, color }, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: 12,
                      padding: '10px 12px',
                      background: 'var(--alpha-bg-04)',
                      border: `1px solid ${color}28`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 2 }}>
                      <Icon size={14} style={{ color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color, letterSpacing: '0.08em' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.35, color: 'var(--alpha-text-85)', marginBottom: 2 }}>
                        {label}
                      </p>
                      <p style={{ fontSize: '0.7rem', lineHeight: 1.45, color: 'var(--alpha-text-45)' }}>
                        {sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: 'rgba(0,212,224,0.12)',
                  border: '1px solid rgba(0,212,224,0.28)',
                  color: 'rgba(0,212,224,0.90)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                Got it — show me the dashboard →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(portal, document.body);
};

export default FirstAuditWelcomeModal;
