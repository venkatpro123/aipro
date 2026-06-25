// achievementService.ts — P2 Retention + Phase 9 Career Title Ladder
//
// Persistent achievement/badge system that tracks career maturity milestones.
// Badges unlock based on user actions, audit history, and progression.
// Stored in localStorage with optional Supabase sync.
//
// Phase 9 adds a 5-level career title progression on top of the flat badge
// system: Observer → Builder → Operator → Strategist → Human-Proof Professional.
// Title is derived from a composite of badge count + completed actions and
// persists separately so promotions can trigger celebration toasts.

import type { LucideIcon } from 'lucide-react';
import {
  Search, TrendingDown, Zap, Flame, Gem, Target, Rocket, ShieldCheck,
  Eye, Palmtree, Map, Compass, CalendarCheck, Trophy,
  Hammer, Settings, Brain, Crown,
} from 'lucide-react';

const LS_KEY = 'hp.achievements';
const TITLE_LS_KEY = 'hp.career.title';

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

  // Phase 9 — also check for career title promotion on every achievement event
  const promoted = checkCareerTitlePromotion(context.completedActionCount ?? 0);
  if (promoted) newly.push(promoted);

  return newly;
}

// ─── Phase 9: Career Title Ladder ────────────────────────────────────────────
//
// Five-level progression built on top of the flat badge system.
// Title is determined by a composite score: badge count + floor(actions / 3).
// Gold/platinum badge requirements gate the upper two tiers.
// Stored separately from badges (TITLE_LS_KEY) so promotions are detectable
// and can fire celebration toasts without polluting the badge progress count.

export type CareerTitleId =
  | 'observer'
  | 'builder'
  | 'operator'
  | 'strategist'
  | 'humanproof';

export interface CareerTitle {
  id: CareerTitleId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  color: string;
  requiresComposite: number;
  requiresGoldPlus: boolean;
  requiresPlatinum: boolean;
}

export const CAREER_TITLE_DEFS: CareerTitle[] = [
  {
    id: 'observer',
    label: 'Observer',
    shortLabel: 'Observer',
    description: 'You have mapped your career risk landscape.',
    icon: Eye,
    color: '#6B7280',
    requiresComposite: 0,
    requiresGoldPlus: false,
    requiresPlatinum: false,
  },
  {
    id: 'builder',
    label: 'Builder',
    shortLabel: 'Builder',
    description: 'You are actively strengthening your career position.',
    icon: Hammer,
    color: '#10B981',
    requiresComposite: 1,
    requiresGoldPlus: false,
    requiresPlatinum: false,
  },
  {
    id: 'operator',
    label: 'Operator',
    shortLabel: 'Operator',
    description: 'You operate with discipline and strategic awareness.',
    icon: Settings,
    color: '#3B82F6',
    requiresComposite: 4,
    requiresGoldPlus: false,
    requiresPlatinum: false,
  },
  {
    id: 'strategist',
    label: 'Strategist',
    shortLabel: 'Strategist',
    description: 'You think and act at the career system level.',
    icon: Brain,
    color: '#8B5CF6',
    requiresComposite: 8,
    requiresGoldPlus: true,
    requiresPlatinum: false,
  },
  {
    id: 'humanproof',
    label: 'Human-Proof Professional',
    shortLabel: 'HumanProof',
    description: 'You have built career resilience that AI cannot replace.',
    icon: Crown,
    color: '#06B6D4',
    requiresComposite: 12,
    requiresGoldPlus: true,
    requiresPlatinum: true,
  },
];

export interface CareerTitleResult {
  current: CareerTitle;
  next: CareerTitle | null;
  compositeScore: number;
  progressToNext: number;
}

/**
 * Derive the user's current career title from their achievement and action data.
 * Pure function — no side effects, safe to call on every render.
 */
export function getCurrentCareerTitle(
  unlockedAchievements: Achievement[],
  completedActionCount: number,
): CareerTitleResult {
  const badgeCount = unlockedAchievements.length;
  const hasGoldPlus = unlockedAchievements.some(
    a => a.tier === 'gold' || a.tier === 'platinum',
  );
  const hasPlatinum = unlockedAchievements.some(a => a.tier === 'platinum');
  const composite = badgeCount + Math.floor(completedActionCount / 3);

  // Walk from highest title down — first one whose requirements are met wins.
  let currentIdx = 0;
  for (let i = CAREER_TITLE_DEFS.length - 1; i >= 0; i--) {
    const t = CAREER_TITLE_DEFS[i];
    if (
      composite >= t.requiresComposite &&
      (!t.requiresGoldPlus || hasGoldPlus) &&
      (!t.requiresPlatinum || hasPlatinum)
    ) {
      currentIdx = i;
      break;
    }
  }

  const current = CAREER_TITLE_DEFS[currentIdx];
  const next = currentIdx < CAREER_TITLE_DEFS.length - 1
    ? CAREER_TITLE_DEFS[currentIdx + 1]
    : null;

  let progressToNext = 100;
  if (next) {
    const lo = current.requiresComposite;
    const hi = next.requiresComposite;
    progressToNext = hi > lo
      ? Math.min(99, Math.round(((composite - lo) / (hi - lo)) * 100))
      : 0;
  }

  return { current, next, compositeScore: composite, progressToNext };
}

/**
 * Compare the current earned title against what's stored in localStorage.
 * If the user has promoted to a new title, persist it and fire the
 * hp.achievement.unlocked toast event so the delight loop triggers.
 * Returns the title-as-Achievement if promoted, null otherwise.
 */
export function checkCareerTitlePromotion(
  completedActionCount: number,
): Achievement | null {
  const unlocked = getUnlockedAchievements();
  const { current } = getCurrentCareerTitle(unlocked, completedActionCount);

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(TITLE_LS_KEY);
  } catch {}

  if (stored === current.id) return null;

  try {
    localStorage.setItem(TITLE_LS_KEY, current.id);
  } catch {}

  // Only fire the promotion toast when going UP, not on first load (stored === null)
  if (stored === null) return null;

  // Build an Achievement-shaped object for the toast — not stored in ACHIEVEMENT_DEFINITIONS
  // (doesn't count toward badge progress), but compatible with AchievementToast rendering.
  const promotionAchievement: Achievement = {
    id: `title_${current.id}` as AchievementId,
    label: `Career Level: ${current.label}`,
    description: current.description,
    icon: current.icon,
    tier: 'platinum',
    unlockedAt: new Date().toISOString(),
  };

  try {
    window.dispatchEvent(new CustomEvent('hp.achievement.unlocked', {
      detail: promotionAchievement,
    }));
  } catch {}

  return promotionAchievement;
}
