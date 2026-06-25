// AchievementGallery.tsx — P2 Retention + Phase 9 Career Title Ladder
//
// Shows the career title level at the top (Observer → Human-Proof Professional),
// then the flat badge grid below. The title panel is the primary focus — it
// gives users a sense of progression and a clear "next level" goal.

import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import {
  ACHIEVEMENT_DEFINITIONS,
  CAREER_TITLE_DEFS,
  getCurrentCareerTitle,
  getUnlockedAchievements,
  getAchievementProgress,
  type Achievement,
} from '../services/achievementService';
import { loadCompletionsLocal } from '../services/actionCompletionService';

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

// ── Career Title Panel ────────────────────────────────────────────────────────

const CareerTitlePanel: React.FC<{ completedActionCount: number }> = ({
  completedActionCount,
}) => {
  const unlocked = getUnlockedAchievements();
  const { current, next, compositeScore, progressToNext } = getCurrentCareerTitle(
    unlocked,
    completedActionCount,
  );

  const TitleIcon = current.icon;

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        background: `${current.color}0D`,
        border: `1px solid ${current.color}30`,
      }}
    >
      {/* Current title row */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${current.color}18`, border: `1px solid ${current.color}40` }}
        >
          <TitleIcon size={20} strokeWidth={1.6} style={{ color: current.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[9px] font-black tracking-[0.14em] uppercase mb-0.5"
            style={{ color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)' }}
          >
            CAREER LEVEL
          </p>
          <p className="text-[15px] font-bold leading-tight" style={{ color: current.color }}>
            {current.label}
          </p>
        </div>
        <div
          className="text-[9px] font-black tracking-[0.1em] uppercase px-2 py-1 rounded-lg"
          style={{ background: `${current.color}18`, color: current.color }}
        >
          {compositeScore}pts
        </div>
      </div>

      <p className="text-[10px] leading-relaxed mb-3" style={{ color: 'var(--alpha-text-45)' }}>
        {current.description}
      </p>

      {/* Progress to next title */}
      {next ? (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold" style={{ color: 'var(--alpha-text-35)' }}>
              Progress to {next.label}
            </span>
            <span className="text-[9px] font-bold" style={{ color: next.color }}>
              {progressToNext}%
            </span>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: 'var(--alpha-bg-06)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: next.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          {next.requiresGoldPlus && unlocked.every(a => a.tier !== 'gold' && a.tier !== 'platinum') && (
            <p className="text-[9px] mt-1.5" style={{ color: 'var(--alpha-text-25)' }}>
              Requires a gold badge
            </p>
          )}
          {next.requiresPlatinum && unlocked.every(a => a.tier !== 'platinum') && (
            <p className="text-[9px] mt-1.5" style={{ color: 'var(--alpha-text-25)' }}>
              Requires a platinum badge
            </p>
          )}
        </>
      ) : (
        <p className="text-[10px] font-bold" style={{ color: current.color }}>
          Maximum career level achieved.
        </p>
      )}

      {/* Title ladder — compact dots */}
      <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid var(--alpha-bg-06)' }}>
        {CAREER_TITLE_DEFS.map((t, i) => {
          const isCurrent = t.id === current.id;
          const isPast = CAREER_TITLE_DEFS.indexOf(current) > i;
          return (
            <React.Fragment key={t.id}>
              <div
                title={t.label}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: isCurrent ? current.color : isPast ? `${t.color}80` : 'rgba(255,255,255,0.10)',
                  boxShadow: isCurrent ? `0 0 8px ${current.color}60` : 'none',
                  transform: isCurrent ? 'scale(1.4)' : 'scale(1)',
                }}
              />
              {i < CAREER_TITLE_DEFS.length - 1 && (
                <div
                  className="flex-1 h-px"
                  style={{
                    background: isPast ? `${t.color}40` : 'rgba(255,255,255,0.06)',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ── Main gallery ─────────────────────────────────────────────────────────────

export const AchievementGallery: React.FC<{ className?: string }> = ({ className }) => {
  const unlocked = getUnlockedAchievements();
  const progress = getAchievementProgress();
  const unlockedIds = new Set(unlocked.map(a => a.id));

  // Derive completed action count from localStorage for title calculation
  const completedActionCount = loadCompletionsLocal().size;

  return (
    <div className={className}>
      {/* Career Title Panel — primary focus */}
      <CareerTitlePanel completedActionCount={completedActionCount} />

      {/* Badge section header */}
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[10px] font-black tracking-[0.14em] uppercase"
          style={{ color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)' }}
        >
          ACHIEVEMENTS
        </p>
        <span className="text-[10px] font-bold" style={{ color: 'var(--cyan)', opacity: 0.7 }}>
          {progress.unlocked}/{progress.total}
        </span>
      </div>

      {/* Badge progress bar */}
      <div
        className="h-1.5 rounded-full mb-4 overflow-hidden"
        style={{ background: 'var(--alpha-bg-06)' }}
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
              <span
                className="flex-shrink-0 mt-0.5"
                style={{ color: isUnlocked ? border : 'rgba(255,255,255,0.30)' }}
              >
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
                  <p
                    className="text-[8px] mt-1 uppercase tracking-wider font-bold"
                    style={{ color: border, opacity: 0.7 }}
                  >
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
