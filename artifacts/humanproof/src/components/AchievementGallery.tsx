// AchievementGallery.tsx — P2 Retention
//
// Displays all achievements as a badge grid — unlocked are full color,
// locked are dimmed with "???" icon. Shows progress bar at top.
// Designed to be embedded in Settings or Profile pages.

import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import {
  ACHIEVEMENT_DEFINITIONS,
  getUnlockedAchievements,
  getAchievementProgress,
  type Achievement,
} from '../services/achievementService';

const TIER_BORDER: Record<string, string> = {
  bronze: 'rgba(205,127,50,0.35)',
  silver: 'rgba(192,192,192,0.35)',
  gold: 'rgba(255,215,0,0.40)',
  platinum: 'rgba(0,212,224,0.40)',
};

const TIER_BG: Record<string, string> = {
  bronze: 'rgba(205,127,50,0.08)',
  silver: 'rgba(192,192,192,0.08)',
  gold: 'rgba(255,215,0,0.08)',
  platinum: 'rgba(0,212,224,0.08)',
};

export const AchievementGallery: React.FC<{ className?: string }> = ({ className }) => {
  const unlocked = getUnlockedAchievements();
  const progress = getAchievementProgress();
  const unlockedIds = new Set(unlocked.map(a => a.id));

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[10px] font-black tracking-[0.14em] uppercase"
          style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}
        >
          ACHIEVEMENTS
        </p>
        <span className="text-[10px] font-bold" style={{ color: 'var(--cyan)', opacity: 0.7 }}>
          {progress.unlocked}/{progress.total}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full mb-4 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--cyan)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ACHIEVEMENT_DEFINITIONS.map((def, i) => {
          const isUnlocked = unlockedIds.has(def.id);
          const border = TIER_BORDER[def.tier] ?? TIER_BORDER.bronze;
          const bg = TIER_BG[def.tier] ?? TIER_BG.bronze;

          const Icon = def.icon;

          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
              style={{
                background: isUnlocked ? bg : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isUnlocked ? border : 'rgba(255,255,255,0.05)'}`,
                opacity: isUnlocked ? 1 : 0.45,
              }}
            >
              <span className="flex-shrink-0 mt-0.5" style={{ color: isUnlocked ? border : 'rgba(255,255,255,0.30)' }}>
                {isUnlocked ? <Icon size={18} strokeWidth={1.8} /> : <Lock size={18} strokeWidth={1.8} />}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-bold truncate"
                  style={{ color: isUnlocked ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}
                >
                  {def.label}
                </p>
                <p
                  className="text-[9px] leading-snug mt-0.5"
                  style={{ color: isUnlocked ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.20)' }}
                >
                  {isUnlocked ? def.description : '???'}
                </p>
                {isUnlocked && (
                  <p className="text-[8px] mt-1 uppercase tracking-wider font-bold" style={{ color: border, opacity: 0.7 }}>
                    {def.tier}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementGallery;
