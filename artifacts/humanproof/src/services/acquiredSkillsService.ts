// acquiredSkillsService.ts — Skill acquisition tracker
//
// Records which skills the user has acquired by completing action items.
// Extracts skill keywords from action titles using pattern matching.
// Mirrors the localStorage + Supabase architecture of actionCompletionService.ts.
//
// Table: user_acquired_skills
// Schema: (id, user_id, skill_key, skill_label, source_action_id, acquired_at)

import { supabase } from '../utils/supabase';
import type { ActionPlanItem } from '../types/hybridResult';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AcquiredSkill {
  skillKey: string;       // normalized lowercase slug, e.g. "linkedin_presence"
  skillLabel: string;     // human-readable, e.g. "LinkedIn Presence"
  sourceActionId: string; // which action produced this skill
  acquiredAt: string;     // ISO timestamp
}

// ── localStorage ──────────────────────────────────────────────────────────────

const LS_KEY = 'hp.skills.acquired';
const TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export function loadSkillsLocal(): Map<string, AcquiredSkill> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Map();
    const { skills, ts } = JSON.parse(raw) as { skills: AcquiredSkill[]; ts: number };
    if (Date.now() - ts > TTL_MS) { localStorage.removeItem(LS_KEY); return new Map(); }
    return new Map(skills.map(s => [s.skillKey, s]));
  } catch { return new Map(); }
}

function saveSkillsLocal(skills: Map<string, AcquiredSkill>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      skills: Array.from(skills.values()),
      ts: Date.now(),
    }));
  } catch { /* quota */ }
}

// ── Skill extraction ──────────────────────────────────────────────────────────

const SKILL_PATTERNS: Array<{ re: RegExp; extract: (m: RegExpMatchArray) => string }> = [
  { re: /\b(?:learn|learning|study|master)\s+(.+?)(?:\s+for\b|\s+skills?\b|$)/i, extract: m => m[1] },
  { re: /\b(?:get|earn|complete|finish|obtain)\s+(?:a\s+)?(?:cert(?:ification|ified)?\s+in|course\s+in|training\s+in)\s+(.+)/i, extract: m => m[1] },
  { re: /\bbuild(?:ing)?\s+(.+?)\s+(?:profile|presence|portfolio|skills?|expertise)/i, extract: m => m[1] },
  { re: /\b(?:develop|improve|strengthen)\s+(?:your\s+)?(.+?)\s+skills?/i, extract: m => m[1] },
  { re: /\b(?:become|be(?:come)?)\s+(?:a\s+|an\s+)?(.+?)\s+(?:practitioner|specialist|expert)/i, extract: m => m[1] },
  { re: /\bintegrate\s+(.+?)\s+(?:into|in)\s+/i, extract: m => m[1] + ' integration' },
  { re: /\b(?:obtain|get)\s+(?:an?\s+)?(.+?)\s+certification/i, extract: m => m[1] },
];

const LAYER_TO_SKILL: Record<string, string> = {
  D1: 'AI Fluency',
  D2: 'Automation Awareness',
  L3: 'Network Building',
  L4: 'Skill Differentiation',
  L5: 'External Market Positioning',
};

function toSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase()).replace(/\bAi\b/g, 'AI');
}

export function extractSkillsFromAction(item: ActionPlanItem): AcquiredSkill[] {
  const found: AcquiredSkill[] = [];
  const now = new Date().toISOString();

  // Try title patterns
  for (const { re, extract } of SKILL_PATTERNS) {
    const m = item.title.match(re);
    if (m) {
      const raw = extract(m).trim().replace(/\.$/, '');
      if (raw.length >= 3 && raw.length <= 60) {
        const label = toTitleCase(raw);
        found.push({ skillKey: toSlug(raw), skillLabel: label, sourceActionId: item.id, acquiredAt: now });
        break; // one skill per action is enough
      }
    }
  }

  // Fallback: layer focus → skill label
  if (found.length === 0 && LAYER_TO_SKILL[item.layerFocus]) {
    const label = LAYER_TO_SKILL[item.layerFocus];
    found.push({ skillKey: toSlug(label), skillLabel: label, sourceActionId: item.id, acquiredAt: now });
  }

  return found;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Record skills extracted from a completed action.
 * Call this after markActionComplete() in any component.
 */
export async function recordSkillFromAction(item: ActionPlanItem): Promise<void> {
  const skills = extractSkillsFromAction(item);
  if (skills.length === 0) return;

  const local = loadSkillsLocal();
  for (const s of skills) {
    if (!local.has(s.skillKey)) local.set(s.skillKey, s);
  }
  saveSkillsLocal(local);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_acquired_skills').upsert(
      skills.map(s => ({
        user_id:          user.id,
        skill_key:        s.skillKey,
        skill_label:      s.skillLabel,
        source_action_id: s.sourceActionId,
        acquired_at:      s.acquiredAt,
      })),
      { onConflict: 'user_id,skill_key' },
    );
  } catch { /* non-fatal */ }
}

/** Synchronous read — returns all skills from localStorage. */
export function getAcquiredSkills(): AcquiredSkill[] {
  return Array.from(loadSkillsLocal().values()).sort(
    (a, b) => b.acquiredAt.localeCompare(a.acquiredAt),
  );
}

/** Returns just the skill labels for quick display. */
export function getAcquiredSkillLabels(): string[] {
  return getAcquiredSkills().map(s => s.skillLabel);
}

/** Sync server state down; server wins on conflicts. */
export async function syncSkillsFromServer(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('user_acquired_skills')
      .select('*')
      .eq('user_id', user.id);
    if (error || !data) return;
    const local = loadSkillsLocal();
    for (const row of data) {
      const key = row.skill_key as string;
      if (!local.has(key)) {
        local.set(key, {
          skillKey:       key,
          skillLabel:     row.skill_label as string,
          sourceActionId: row.source_action_id as string,
          acquiredAt:     row.acquired_at as string,
        });
      }
    }
    saveSkillsLocal(local);
  } catch { /* non-fatal */ }
}
