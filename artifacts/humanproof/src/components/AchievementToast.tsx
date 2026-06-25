// AchievementToast.tsx — P2 Retention
//
// Listens for hp.achievement.unlocked events and shows a premium
// celebration toast with the badge icon, tier glow, and description.
// Auto-dismisses after 4s. Stacks up to 2 toasts.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award } from 'lucide-react';
import type { Achievement } from '../services/achievementService';

const TIER_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  bronze:   { bg: 'rgba(205,127,50,0.10)',  border: 'rgba(205,127,50,0.35)',  glow: 'rgba(205,127,50,0.15)' },
  silver:   { bg: 'rgba(192,192,192,0.10)', border: 'rgba(192,192,192,0.35)', glow: 'rgba(192,192,192,0.15)' },
  gold:     { bg: 'rgba(255,215,0,0.10)',   border: 'rgba(255,215,0,0.35)',   glow: 'rgba(255,215,0,0.20)' },
  platinum: { bg: 'rgba(0,212,224,0.10)',    border: 'rgba(0,212,224,0.35)',    glow: 'rgba(0,212,224,0.20)' },
};

interface ToastEntry {
  id: string;
  achievement: Achievement;
}

export const AchievementToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const addToast = useCallback((achievement: Achievement) => {
    const id = `${achievement.id}-${Date.now()}`;
    setToasts(prev => [...prev.slice(-1), { id, achievement }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Achievement;
      if (detail?.id) addToast(detail);
    };
    window.addEventListener('hp.achievement.unlocked', handler);
    return () => window.removeEventListener('hp.achievement.unlocked', handler);
  }, [addToast]);

  return (
    <div
      className="fixed z-[9998] left-1/2 -translate-x-1/2 flex flex-col gap-2 pointer-events-none"
      style={{ top: 16 }}
    >
      <AnimatePresence>
        {toasts.map(({ id, achievement }) => {
          const colors = TIER_COLORS[achievement.tier] ?? TIER_COLORS.bronze;
          const Icon = achievement.icon;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl px-4 py-3 pointer-events-auto"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 30px ${colors.glow}`,
                backdropFilter: 'blur(20px)',
                minWidth: 260,
                maxWidth: 360,
              }}
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0" style={{ color: colors.border }}>
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Award className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--cyan)', opacity: 0.6 }} />
                    <span className="text-[9px] font-black tracking-[0.12em] uppercase" style={{ color: 'var(--cyan)', opacity: 0.7 }}>
                      Achievement Unlocked
                    </span>
                  </div>
                  <p className="text-[12px] font-bold" style={{ color: 'var(--alpha-text-92)' }}>
                    {achievement.label}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>
                    {achievement.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AchievementToast;
