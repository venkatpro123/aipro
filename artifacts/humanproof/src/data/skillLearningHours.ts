// skillLearningHours.ts
// Intelligence Upgrade 4 — v4.0
// Weeks-to-proficiency data for every recommended skill.
//
// Four learning milestones per skill:
//   basic_familiarity:     can describe it coherently in conversation
//   useful_proficiency:    can apply it in a real work context
//   demonstrable_expertise: can show a proof point (project, post, demo)
//   interview_ready:       can discuss it confidently in a job interview
//
// Hours derived from:
// - Career twin network transition data (reported learning times)
// - LinkedIn Learning and Coursera completion statistics
// - Industry bootcamp outcome reports (2024–2025)

export interface SkillLearningHours {
  skill: string;
  basic_familiarity: number;      // hours
  useful_proficiency: number;     // hours
  demonstrable_expertise: number; // hours
  interview_ready: number;        // hours
}

// Compute weeks from hours given user's weekly capacity
export function weeksToMilestone(
  hours: number,
  weeklyHours: number,
): number {
  if (weeklyHours <= 0) return Infinity;
  return Math.ceil(hours / weeklyHours);
}

export function formatLearningTime(
  skill: string,
  weeklyHours: 2 | 8 | 20,
  milestone: keyof Omit<SkillLearningHours, 'skill'> = 'interview_ready',
): string {
  const data = SKILL_LEARNING_HOURS[skill] ?? SKILL_LEARNING_HOURS._default;
  const hours = data[milestone];
  const weeks = weeksToMilestone(hours, weeklyHours);
  const trackLabel = weeklyHours === 2 ? '2h/wk' : weeklyHours === 8 ? '8h/wk' : '20h/wk';
  return `${weeks}w at ${trackLabel}`;
}

// Returns a user-facing string: "interview ready in 4w at 8h/wk, 12w at 2h/wk"
export function getLearningTimeSummary(skill: string): string {
  const data = SKILL_LEARNING_HOURS[skill] ?? SKILL_LEARNING_HOURS._default;
  const h = data.interview_ready;
  const w2 = Math.ceil(h / 2);
  const w8 = Math.ceil(h / 8);
  const w20 = Math.ceil(h / 20);
  return `interview ready in ${w20}w at 20h/wk · ${w8}w at 8h/wk · ${w2}w at 2h/wk`;
}

export const SKILL_LEARNING_HOURS: Record<string, SkillLearningHours> = {
  // ── AI / Automation tools ───────────────────────────────────────────────────
  'Prompt Engineering': {
    skill: 'Prompt Engineering',
    basic_familiarity: 4,
    useful_proficiency: 20,
    demonstrable_expertise: 35,
    interview_ready: 35,
  },
  'Playwright AI': {
    skill: 'Playwright AI',
    basic_familiarity: 4,
    useful_proficiency: 16,
    demonstrable_expertise: 24,
    interview_ready: 30,
  },
  'GitHub Copilot': {
    skill: 'GitHub Copilot',
    basic_familiarity: 2,
    useful_proficiency: 10,
    demonstrable_expertise: 20,
    interview_ready: 20,
  },
  'Harvey AI': {
    skill: 'Harvey AI',
    basic_familiarity: 4,
    useful_proficiency: 12,
    demonstrable_expertise: 18,
    interview_ready: 20,
  },
  'Claude API / Anthropic SDK': {
    skill: 'Claude API / Anthropic SDK',
    basic_familiarity: 6,
    useful_proficiency: 20,
    demonstrable_expertise: 35,
    interview_ready: 40,
  },
  'AI Workflow Design': {
    skill: 'AI Workflow Design',
    basic_familiarity: 8,
    useful_proficiency: 24,
    demonstrable_expertise: 40,
    interview_ready: 50,
  },
  'RAG Systems': {
    skill: 'RAG Systems',
    basic_familiarity: 10,
    useful_proficiency: 30,
    demonstrable_expertise: 50,
    interview_ready: 60,
  },
  'LLM Evaluation / Testing': {
    skill: 'LLM Evaluation / Testing',
    basic_familiarity: 8,
    useful_proficiency: 20,
    demonstrable_expertise: 32,
    interview_ready: 40,
  },
  // ── Programming skills ────────────────────────────────────────────────────
  'Python': {
    skill: 'Python',
    basic_familiarity: 10,
    useful_proficiency: 40,
    demonstrable_expertise: 70,
    interview_ready: 80,
  },
  'Python for Finance': {
    skill: 'Python for Finance',
    basic_familiarity: 16,
    useful_proficiency: 50,
    demonstrable_expertise: 80,
    interview_ready: 90,
  },
  'SQL': {
    skill: 'SQL',
    basic_familiarity: 8,
    useful_proficiency: 24,
    demonstrable_expertise: 40,
    interview_ready: 50,
  },
  'Data Analysis (Pandas)': {
    skill: 'Data Analysis (Pandas)',
    basic_familiarity: 12,
    useful_proficiency: 35,
    demonstrable_expertise: 55,
    interview_ready: 65,
  },
  // ── Domain certifications ───────────────────────────────────────────────────
  'AWS Cloud Practitioner': {
    skill: 'AWS Cloud Practitioner',
    basic_familiarity: 20,
    useful_proficiency: 40,
    demonstrable_expertise: 60,
    interview_ready: 60,
  },
  'Google Data Analytics Certificate': {
    skill: 'Google Data Analytics Certificate',
    basic_familiarity: 20,
    useful_proficiency: 60,
    demonstrable_expertise: 80,
    interview_ready: 80,
  },
  'People Analytics': {
    skill: 'People Analytics',
    basic_familiarity: 12,
    useful_proficiency: 35,
    demonstrable_expertise: 55,
    interview_ready: 60,
  },
  'AI in Healthcare': {
    skill: 'AI in Healthcare',
    basic_familiarity: 16,
    useful_proficiency: 40,
    demonstrable_expertise: 65,
    interview_ready: 70,
  },
  // ── Soft skills / Human-durable ─────────────────────────────────────────────
  'Stakeholder Communication': {
    skill: 'Stakeholder Communication',
    basic_familiarity: 8,
    useful_proficiency: 40,
    demonstrable_expertise: 100,
    interview_ready: 60,
  },
  'Strategic Decision Making': {
    skill: 'Strategic Decision Making',
    basic_familiarity: 16,
    useful_proficiency: 80,
    demonstrable_expertise: 160,
    interview_ready: 80,
  },
  'AI Governance / Ethics': {
    skill: 'AI Governance / Ethics',
    basic_familiarity: 12,
    useful_proficiency: 30,
    demonstrable_expertise: 50,
    interview_ready: 50,
  },
  'Contract AI Auditing': {
    skill: 'Contract AI Auditing',
    basic_familiarity: 16,
    useful_proficiency: 40,
    demonstrable_expertise: 65,
    interview_ready: 70,
  },
  'Clinical AI Validation': {
    skill: 'Clinical AI Validation',
    basic_familiarity: 20,
    useful_proficiency: 55,
    demonstrable_expertise: 90,
    interview_ready: 100,
  },
  // ── Default fallback ──────────────────────────────────────────────────────
  _default: {
    skill: '_default',
    basic_familiarity: 10,
    useful_proficiency: 30,
    demonstrable_expertise: 55,
    interview_ready: 60,
  },
};

/**
 * Given an action item's title, extract the skill name and return learning time.
 * Used in ActionPlanTab to annotate each action with time estimates.
 */
export function getActionLearningTime(
  actionTitle: string,
  weeklyHours: 2 | 8 | 20,
): string | null {
  // Try to match a known skill from the action title
  for (const key of Object.keys(SKILL_LEARNING_HOURS)) {
    if (key === '_default') continue;
    if (actionTitle.toLowerCase().includes(key.toLowerCase())) {
      return getLearningTimeSummary(key);
    }
  }
  return null;
}

/**
 * Returns weeks-to-proficiency for all three standard tracks simultaneously.
 * Intended for the ActionItem ROI block: store once on the item, highlight
 * the active track at render time without recomputation.
 * Returns null when no skill keyword matches the action title.
 */
export function getSkillLearningWeeks(
  actionTitle: string,
): { w2: number; w8: number; w20: number } | null {
  for (const key of Object.keys(SKILL_LEARNING_HOURS)) {
    if (key === '_default') continue;
    if (actionTitle.toLowerCase().includes(key.toLowerCase())) {
      const h = SKILL_LEARNING_HOURS[key].interview_ready;
      return {
        w2:  Math.ceil(h / 2),
        w8:  Math.ceil(h / 8),
        w20: Math.ceil(h / 20),
      };
    }
  }
  return null;
}

// ── Role-aware hour overrides ─────────────────────────────────────────────────
// Different role backgrounds reach interview-ready at different speeds for the
// same skill. A software engineer learning Python already knows programming
// patterns (loops, functions, types) — they need 40h to reach interview-ready.
// A finance analyst learning Python starts with no programming background —
// they need 90h (the separate "Python for Finance" entry covers this path,
// but the override ensures action-title matching uses the right hours).
//
// Key format: roleCategory → skillKeyword → interview_ready_hours override.
// roleCategory is derived from result.workTypeKey (first segment before '_').
const ROLE_SKILL_HOUR_OVERRIDES: Record<string, Record<string, number>> = {
  // Software / engineering roles — faster on programming; slower on domain skills
  sw:     { 'Python': 40, 'SQL': 30, 'Data Analysis (Pandas)': 40 },
  eng:    { 'Python': 40, 'SQL': 30, 'Data Analysis (Pandas)': 40 },
  dev:    { 'Python': 40, 'SQL': 30, 'Data Analysis (Pandas)': 40 },
  ml:     { 'Python': 35, 'SQL': 25, 'RAG Systems': 45, 'LLM Evaluation / Testing': 30 },
  data:   { 'Python': 45, 'SQL': 25, 'Data Analysis (Pandas)': 35 },
  cloud:  { 'Python': 45, 'AWS Cloud Practitioner': 45 },
  cyber:  { 'Python': 45 },
  qa:     { 'Python': 50, 'Playwright AI': 20 },
  // Finance / business roles — slower on programming; faster on domain content
  fin:    { 'Python': 90, 'SQL': 55, 'Data Analysis (Pandas)': 70, 'People Analytics': 40 },
  bank:   { 'Python': 90, 'SQL': 55 },
  quant:  { 'Python': 50, 'SQL': 35 },
  fp:     { 'Python': 90, 'SQL': 55, 'Google Data Analytics Certificate': 70 },
  account:{ 'Python': 95, 'SQL': 60 },
  // HR / people roles
  hr:     { 'Python': 100, 'People Analytics': 45, 'SQL': 60 },
  // Healthcare roles
  health: { 'Python': 100, 'AI in Healthcare': 55, 'Clinical AI Validation': 80 },
  // Legal roles
  leg:    { 'Python': 110, 'Harvey AI': 15, 'Contract AI Auditing': 55 },
};

/**
 * Extract the role category prefix from a workTypeKey.
 * "sw_backend" → "sw", "fin_fp_analyst" → "fin", "ml_engineer" → "ml"
 */
export function roleCategory(workTypeKey: string | null | undefined): string {
  if (!workTypeKey) return '';
  return workTypeKey.toLowerCase().split('_')[0];
}

/**
 * Role-aware variant of getSkillLearningWeeks.
 * Uses ROLE_SKILL_HOUR_OVERRIDES when available for the given role category,
 * falling back to the universal SKILL_LEARNING_HOURS.interview_ready value.
 *
 * Example: actionTitle="Master Python for automation", workTypeKey="fin_fp_analyst"
 *   → roleCategory="fin" → override: Python=90h
 *   → { w2: 45, w8: 12, w20: 5 }
 *
 * vs. same action for workTypeKey="sw_backend"
 *   → roleCategory="sw" → override: Python=40h
 *   → { w2: 20, w8: 5, w20: 2 }
 */
export function getSkillLearningWeeksForRole(
  actionTitle: string,
  workTypeKey: string | null | undefined,
): { w2: number; w8: number; w20: number } | null {
  const cat = roleCategory(workTypeKey);
  const roleOverrides = ROLE_SKILL_HOUR_OVERRIDES[cat] ?? {};

  for (const key of Object.keys(SKILL_LEARNING_HOURS)) {
    if (key === '_default') continue;
    if (actionTitle.toLowerCase().includes(key.toLowerCase())) {
      // Use role-specific override when available; fall back to universal value
      const h = roleOverrides[key] ?? SKILL_LEARNING_HOURS[key].interview_ready;
      return {
        w2:  Math.ceil(h / 2),
        w8:  Math.ceil(h / 8),
        w20: Math.ceil(h / 20),
      };
    }
  }
  return null;
}
