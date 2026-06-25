// achievementService.ts — P2 Retention
//
// Persistent achievement/badge system that tracks career maturity milestones.
// Badges unlock based on user actions, audit history, and progression.
// Stored in localStorage with optional Supabase sync.

import type { LucideIcon } from 'lucide-react';
import {
  Search, TrendingDown, Zap, Flame, Gem, Target, Rocket, ShieldCheck,
  Eye, Palmtree, Map, Compass, CalendarCheck, Trophy,
} from 'lucide-react';

const LS_KEY = 'hp.achievements';

export type AchievementId =
  | 'first_audit'
  | 'score_improver'
  | 'action_starter'
  | 'action_streak_3'
  | 'action_streak_10'
  | 'phase_1_complete'
  | 'phase_2_complete'
  | 'phase_3_complete'
  | 'multi_audit'
  | 'low_risk_achieved'
  | 'skill_mapper'
  | 'career_explorer'
  | 'weekly_checker'
  | 'resilience_builder';

export interface Achievement {
  id: AchievementId;
  label: string;
  description: string;
  icon: LucideIcon;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt?: string;
}

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  { id: 'first_audit', label: 'First Scan', description: 'Completed your first career risk audit', icon: Search, tier: 'bronze' },
  { id: 'score_improver', label: 'Risk Reducer', description: 'Lowered your risk score by 5+ points', icon: TrendingDown, tier: 'silver' },
  { id: 'action_starter', label: 'Action Taker', description: 'Completed your first recommended action', icon: Zap, tier: 'bronze' },
  { id: 'action_streak_3', label: 'Momentum Builder', description: 'Completed 3 actions in a row', icon: Flame, tier: 'silver' },
  { id: 'action_streak_10', label: 'Unstoppable', description: 'Completed 10 career protection actions', icon: Gem, tier: 'gold' },
  { id: 'phase_1_complete', label: 'Phase 1 Graduate', description: 'Completed all Phase 1 actions', icon: Target, tier: 'silver' },
  { id: 'phase_2_complete', label: 'Phase 2 Graduate', description: 'Completed all Phase 2 actions', icon: Rocket, tier: 'gold' },
  { id: 'phase_3_complete', label: 'Fully Protected', description: 'Completed all Phase 3 actions', icon: ShieldCheck, tier: 'platinum' },
  { id: 'multi_audit', label: 'Vigilant', description: 'Ran 3+ audits across different sessions', icon: Eye, tier: 'silver' },
  { id: 'low_risk_achieved', label: 'Safe Harbor', description: 'Achieved Low Risk status (score < 35)', icon: Palmtree, tier: 'gold' },
  { id: 'skill_mapper', label: 'Skill Mapper', description: 'Reviewed your skill resilience radar', icon: Map, tier: 'bronze' },
  { id: 'career_explorer', label: 'Path Finder', description: 'Explored career pivot options', icon: Compass, tier: 'bronze' },
  { id: 'weekly_checker', label: 'Weekly Guardian', description: 'Checked your risk score 4 weeks in a row', icon: CalendarCheck, tier: 'gold' },
  { id: 'resilience_builder', label: 'Resilience Master', description: 'Built career resilience across all dimensions', icon: Trophy, tier: 'platinum' },
];

interface AchievementStore {
  unlocked: Record<string, string>;
  version: number;
}

function loadStore(): AchievementStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { unlocked: {}, version: 1 };
}

function saveStore(store: AchievementStore): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {}
}

export function unlockAchievement(id: AchievementId): Achievement | null {
  const store = loadStore();
  if (store.unlocked[id]) return null;

  store.unlocked[id] = new Date().toISOString();
  saveStore(store);

  const def = ACHIEVEMENT_DEFINITIONS.find(a => a.id === id);
  if (!def) return null;

  try {
    window.dispatchEvent(new CustomEvent('hp.achievement.unlocked', {
      detail: { ...def, unlockedAt: store.unlocked[id] },
    }));
  } catch {}

  return { ...def, unlockedAt: store.unlocked[id] };
}

export function getUnlockedAchievements(): Achievement[] {
  const store = loadStore();
  return ACHIEVEMENT_DEFINITIONS
    .filter(a => store.unlocked[a.id])
    .map(a => ({ ...a, unlockedAt: store.unlocked[a.id] }));
}

export function getAchievementProgress(): { unlocked: number; total: number; percentage: number } {
  const store = loadStore();
  const unlocked = Object.keys(store.unlocked).length;
  const total = ACHIEVEMENT_DEFINITIONS.length;
  return { unlocked, total, percentage: Math.round((unlocked / total) * 100) };
}

export function isAchievementUnlocked(id: AchievementId): boolean {
  const store = loadStore();
  return !!store.unlocked[id];
}

export function checkAndUnlockAchievements(context: {
  auditCount?: number;
  currentScore?: number;
  previousScore?: number;
  completedActionCount?: number;
  phaseCompleted?: number;
  weeklyStreak?: number;
}): Achievement[] {
  const newly: Achievement[] = [];

  if (context.auditCount != null && context.auditCount >= 1) {
    const a = unlockAchievement('first_audit');
    if (a) newly.push(a);
  }

  if (context.auditCount != null && context.auditCount >= 3) {
    const a = unlockAchievement('multi_audit');
    if (a) newly.push(a);
  }

  if (context.currentScore != null && context.previousScore != null) {
    if (context.previousScore - context.currentScore >= 5) {
      const a = unlockAchievement('score_improver');
      if (a) newly.push(a);
    }
  }

  if (context.currentScore != null && context.currentScore < 35) {
    const a = unlockAchievement('low_risk_achieved');
    if (a) newly.push(a);
  }

  if (context.completedActionCount != null && context.completedActionCount >= 1) {
    const a = unlockAchievement('action_starter');
    if (a) newly.push(a);
  }

  if (context.completedActionCount != null && context.completedActionCount >= 3) {
    const a = unlockAchievement('action_streak_3');
    if (a) newly.push(a);
  }

  if (context.completedActionCount != null && context.completedActionCount >= 10) {
    const a = unlockAchievement('action_streak_10');
    if (a) newly.push(a);
  }

  if (context.phaseCompleted != null) {
    if (context.phaseCompleted >= 1) { const a = unlockAchievement('phase_1_complete'); if (a) newly.push(a); }
    if (context.phaseCompleted >= 2) { const a = unlockAchievement('phase_2_complete'); if (a) newly.push(a); }
    if (context.phaseCompleted >= 3) { const a = unlockAchievement('phase_3_complete'); if (a) newly.push(a); }
  }

  if (context.weeklyStreak != null && context.weeklyStreak >= 4) {
    const a = unlockAchievement('weekly_checker');
    if (a) newly.push(a);
  }

  return newly;
}
