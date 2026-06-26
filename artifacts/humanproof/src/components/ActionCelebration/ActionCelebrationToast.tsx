// ActionCelebrationToast.tsx — Wave 3.4 Action Completion Celebration
//
// Listens to 'hp.action.milestone' custom event fired by PhaseProgressSystem
// whenever 3 actions are completed. Slides in from the bottom-right for 3.5s.
//
// Also listens to 'hp.phase.complete' for phase-completion celebrations (bigger).
//
// Design:
//   - Single action: "✓ Action completed! N of total done"
//   - Milestone (every 3): "+ [N] actions! Your estimated risk impact: −2 to −5 pts"
//   - Phase complete: larger celebration + "Phase 2 unlocked!"
//
// Placement: rendered once at the root level in LayoffAuditDashboardV3.
// Self-contained — fires from events, no props needed.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, Zap } from 'lucide-react';
import { checkAndUnlockAchievements } from '../../services/achievementService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastState {
  id: number;
  type: 'action' | 'milestone' | 'phase';
  count?: number;
  total?: number;
  phaseNum?: number;
  nextPhase?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ActionCelebrationToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const idRef = React.useRef(0);

  const addToast = useCallback((toast: Omit<ToastState, 'id'>) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-2), { ...toast, id }]);
    // Haptic feedback for all celebration events
    try { if (navigator.vibrate) navigator.vibrate(toast.type === 'phase' ? [50, 30, 50] : 15); } catch {}
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    const onMilestone = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      const count: number = detail.count ?? 1;

      if (count % 3 === 0) {
        addToast({ type: 'milestone', count });
      } else {
        addToast({ type: 'action', count });
      }
      // Check for achievement unlocks on every action completion
      checkAndUnlockAchievements({ completedActionCount: count });
    };

    const onPhaseComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      addToast({
        type: 'phase',
        phaseNum: detail.phase,
        nextPhase: detail.nextPhase,
      });
      // Check phase achievements
      checkAndUnlockAchievements({ phaseCompleted: detail.phase });
    };

    window.addEventListener('hp.action.milestone', onMilestone);
    window.addEventListener('hp.phase.complete', onPhaseComplete);
    return () => {
      window.removeEventListener('hp.action.milestone', onMilestone);
      window.removeEventListener('hp.phase.complete', onPhaseComplete);
    };
  }, [addToast]);

  return (
    <div
      className="fixed z-[9999] flex flex-col gap-2"
      style={{
        bottom: 'calc(72px + env(safe-area-inset-bottom, 12px))',
        right: 12,
        pointerEvents: 'none',
        maxWidth: 280,
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-2xl px-4 py-3 flex items-start gap-2.5 shadow-lg"
            style={{
              background: toast.type === 'phase'
                ? 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(34,211,238,0.12))'
                : 'rgba(16,185,129,0.12)',
              border: `1px solid ${toast.type === 'phase' ? 'rgba(139,92,246,0.35)' : 'rgba(16,185,129,0.30)'}`,
              backdropFilter: 'blur(12px)',
              pointerEvents: 'auto',
            }}
          >
            {/* Icon */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: toast.type === 'phase'
                  ? 'rgba(139,92,246,0.20)'
                  : toast.type === 'milestone'
                  ? 'rgba(34,211,238,0.15)'
                  : 'rgba(16,185,129,0.18)',
              }}
            >
              {toast.type === 'phase'
                ? <Star className="w-3.5 h-3.5" style={{ color: 'var(--color-violet-text)' }} />
                : toast.type === 'milestone'
                ? <Zap className="w-3.5 h-3.5" style={{ color: 'var(--color-cyan-text)' }} />
                : <Check className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
              }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {toast.type === 'phase' ? (
                <>
                  <p className="text-[11px] font-black leading-tight" style={{ color: 'var(--color-violet-text)' }}>
                    Phase {toast.phaseNum} complete!
                  </p>
                  {toast.nextPhase && (
                    <p className="text-[9px] mt-0.5 leading-snug" style={{ color: 'var(--alpha-text-50)' }}>
                      Phase {toast.nextPhase} is now unlocked ↓
                    </p>
                  )}
                </>
              ) : toast.type === 'milestone' ? (
                <>
                  <p className="text-[11px] font-black leading-tight" style={{ color: 'var(--color-cyan-text)' }}>
                    {toast.count} actions complete!
                  </p>
                  <p className="text-[9px] mt-0.5 leading-snug" style={{ color: 'var(--alpha-text-50)' }}>
                    Est. risk impact: −2 to −5 pts on next audit
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-bold leading-tight" style={{ color: '#10b981' }}>
                    ✓ Action completed
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--alpha-text-45)' }}>
                    Keep going — every action reduces risk
                  </p>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ActionCelebrationToast;
