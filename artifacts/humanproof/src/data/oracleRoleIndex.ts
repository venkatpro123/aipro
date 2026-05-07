// ═══════════════════════════════════════════════════════════════════════════
// oracleRoleIndex.ts — Oracle Role Search Index v1.0
//
// Bridges MASTER_CAREER_INTELLIGENCE (400+ roles) into a fast searchable
// index for the LayoffInputForm role search bar.
//
// Exposed APIs:
//   searchOracleRoles(query, limit?)  → OracleRoleEntry[]
//   getRoleEntryByKey(oracleKey)      → OracleRoleEntry | null
//   getAutoDeducedDepartment(key)     → string
//   ALL_ORACLE_ROLES                  → OracleRoleEntry[]  (full list)
// ═══════════════════════════════════════════════════════════════════════════

import {
  MASTER_CAREER_INTELLIGENCE,
  CareerIntelligence,
} from './intelligence/index';

// ── Types ──────────────────────────────────────────────────────────────────

export interface OracleRoleEntry {
  oracleKey: string;
  displayTitle: string;
  summary: string;
  currentRiskScore: number;  // from riskTrend[0].riskScore (0-100)
  confidenceScore: number;   // 0-100, from CareerIntelligence.confidenceScore
  contextTags: string[];
  topSafeSkill: string;      // first safe skill name
  topAtRiskSkill: string;    // first at-risk skill name (or 'None')
  riskTrend: { year: number; riskScore: number }[];
  riskDirection: 'rising' | 'stable' | 'falling';
}

// ── Department auto-derivation map ────────────────────────────────────────

const PREFIX_TO_DEPARTMENT: Record<string, string> = {
  sw:    'Engineering',
  ml:    'Engineering',
  sec:   'Engineering',
  dev:   'Engineering',
  bc:    'Engineering',
  qa:    'Engineering',
  it:    'Engineering',
  data:  'Engineering',
  saas:  'Engineering',
  web:   'Engineering',
  mob:   'Engineering',
  erp:   'Engineering',
  ds:    'Engineering',
  em:    'Engineering',
  fin:   'Finance',
  inv:   'Finance',
  ins:   'Finance',
  ft:    'Finance',
  hr:    'HR',
  leg:   'Legal',
  hc:    'Healthcare',
  nur:   'Healthcare',
  ph:    'Healthcare',
  mh:    'Healthcare',
  edu:   'Education',
  edt:   'Education',
  tr:    'Education',
  cnt:   'Marketing',
  mkt:   'Marketing',
  med:   'Creative',
  des:   'Design',
  adv:   'Marketing',
  photo: 'Creative',
  video: 'Creative',
  anim:  'Creative',
  mus:   'Creative',
  bpo:   'Operations',
  adm:   'Administration',
  log:   'Operations',
  ser:   'Operations',
  con:   'Operations',
  mfg:   'Operations',
  eng:   'Engineering',
  aero:  'Engineering',
  auto:  'Engineering',
  en:    'Engineering',
  ret:   'Sales',
  ec:    'Operations',
  fmcg:  'Sales',
  gov:   'Government',
  ngo:   'Government',
  agri:  'Operations',
  trd:   'Operations',
  hos:   'Operations',
  trav:  'Operations',
  env:   'Engineering',
  ag:    'Operations',
  inv2:  'Finance',
  urb:   'Engineering',
};

/** Derive department string from oracle key prefix. */
export const getAutoDeducedDepartment = (oracleKey: string): string => {
  const prefix = oracleKey.split('_')[0];
  return PREFIX_TO_DEPARTMENT[prefix] || 'Operations';
};

// ── Risk direction helper ────────────────────────────────────────────────

const computeRiskDirection = (
  trend: { year: number; riskScore: number }[]
): 'rising' | 'stable' | 'falling' => {
  if (!trend || trend.length < 2) return 'stable';
  const first = trend[0].riskScore;
  const last = trend[trend.length - 1].riskScore;
  const delta = last - first;
  if (delta > 5) return 'rising';
  if (delta < -5) return 'falling';
  return 'stable';
};

// ── Build the master index ────────────────────────────────────────────────

const buildOracleRoleIndex = (): OracleRoleEntry[] => {
  const entries: OracleRoleEntry[] = [];

  for (const [key, intel] of Object.entries(MASTER_CAREER_INTELLIGENCE)) {
    const trend = (intel.riskTrend ?? []).map(t => ({
      year: t.year,
      riskScore: t.riskScore,
    }));

    const currentRiskScore =
      trend.length > 0 ? Math.round(trend[0].riskScore) : 50;

    const safeSkill =
      intel.skills?.safe?.[0]?.skill ?? '';
    const atRiskSkill =
      intel.skills?.at_risk?.[0]?.skill ??
      intel.skills?.obsolete?.[0]?.skill ??
      'None identified';

    entries.push({
      oracleKey:        key,
      displayTitle:     intel.displayRole,
      summary:          intel.summary,
      currentRiskScore,
      confidenceScore:  intel.confidenceScore ?? 90,
      contextTags:      intel.contextTags ?? [],
      topSafeSkill:     safeSkill,
      topAtRiskSkill:   atRiskSkill,
      riskTrend:        trend,
      riskDirection:    computeRiskDirection(trend),
    });
  }

  // Sort: lower risk first (safer roles appear at top before filtering)
  return entries.sort((a, b) => a.currentRiskScore - b.currentRiskScore);
};

// Lazily initialised: buildOracleRoleIndex() iterates all 371 role objects and
// sorts them — ~50ms CPU on a mid-range Android. Running it at module load would
// block the main thread during the initial parse burst. Instead it runs on the
// first call to searchOracleRoles / getRoleEntryByKey / getAllOracleRoles,
// which only happens when the user opens the Audit form (a lazy-loaded route).
let _cachedIndex: OracleRoleEntry[] | null = null;

function getOracleIndex(): OracleRoleEntry[] {
  if (!_cachedIndex) _cachedIndex = buildOracleRoleIndex();
  return _cachedIndex;
}

/**
 * Full pre-built index, materialised on first call.
 * Prefer searchOracleRoles() for search and getRoleEntryByKey() for lookups.
 * Use this only when you need the raw array (e.g. bulk iteration).
 */
export function getAllOracleRoles(): OracleRoleEntry[] {
  return getOracleIndex();
}

/**
 * @deprecated Use getAllOracleRoles() — this constant triggers eager construction
 * when destructured at import time in some bundler configurations.
 * Kept for backward compatibility; consumers inside the lazy audit route are fine.
 */
export const ALL_ORACLE_ROLES: OracleRoleEntry[] = getAllOracleRoles();

// ── Search API ────────────────────────────────────────────────────────────

// Seniority words that should not penalise a shorter-title match.
// "Senior Data Analyst" queried against "Data Analyst" should score the same
// word-overlap as against "Senior Data Analyst" — both share the domain tokens.
const SENIORITY_TOKENS = new Set(['senior', 'junior', 'lead', 'staff', 'principal', 'head', 'chief', 'associate', 'manager', 'director', 'vp', 'executive']);

/**
 * Count how many non-seniority query words appear in the entry's display title.
 * Higher count = semantically closer match regardless of title length.
 */
const domainWordOverlap = (entry: OracleRoleEntry, qWords: string[]): number => {
  const titleLow = entry.displayTitle.toLowerCase();
  return qWords.filter(w => !SENIORITY_TOKENS.has(w) && titleLow.includes(w)).length;
};

/**
 * Search oracle roles by display title or oracle key.
 * Returns top `limit` matches sorted by relevance (start-of-string first).
 *
 * Tiebreaker order within each group:
 *   1. Domain word overlap (non-seniority query tokens matched — more = better)
 *   2. Shorter title (more specific match)
 *   3. Higher risk score (actionable results surface first)
 *
 * This prevents "Senior Data Analyst" from ranking "Data Scientist" above
 * "Data Analyst" just because they have the same title length.
 */
export const searchOracleRoles = (
  query: string,
  limit = 8
): OracleRoleEntry[] => {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  const qWords = q.split(/\s+/).filter(w => w.length > 1);

  // Group 1: title/key starts with the query (exact prefix — most relevant)
  // Group 2: title/key contains the query anywhere (looser — secondary)
  const startsWith: OracleRoleEntry[] = [];
  const contains:   OracleRoleEntry[] = [];

  for (const entry of getOracleIndex()) {
    const titleLow = entry.displayTitle.toLowerCase();
    const keyLow   = entry.oracleKey.toLowerCase();
    if (titleLow.startsWith(q) || keyLow.startsWith(q)) {
      startsWith.push(entry);
    } else if (titleLow.includes(q) || keyLow.includes(q)) {
      contains.push(entry);
    }
    if (startsWith.length + contains.length >= limit * 4) break;
  }

  const sortGroup = (arr: OracleRoleEntry[]): OracleRoleEntry[] =>
    arr.sort((a, b) =>
      domainWordOverlap(b, qWords) - domainWordOverlap(a, qWords) ||  // more domain overlap wins
      a.displayTitle.length - b.displayTitle.length                 ||  // shorter title wins
      b.currentRiskScore - a.currentRiskScore                           // higher risk breaks tie
    );

  return [...sortGroup(startsWith), ...sortGroup(contains)].slice(0, limit);
};


/**
 * Get a single OracleRoleEntry by its oracle key (exact match).
 */
export const getRoleEntryByKey = (oracleKey: string): OracleRoleEntry | null => {
  return getOracleIndex().find(e => e.oracleKey === oracleKey) ?? null;
};

/**
 * Get risk score color token for a given score (0-100).
 */
export const riskScoreColor = (score: number): string => {
  if (score >= 70) return '#ef4444'; // red
  if (score >= 50) return '#f97316'; // orange
  if (score >= 30) return '#f59e0b'; // amber
  if (score >= 15) return '#10b981'; // green
  return '#00F5FF';                   // cyan — very safe
};

/**
 * Get risk label for a given score.
 */
export const riskScoreLabel = (score: number): string => {
  if (score >= 70) return 'High Risk';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Low-Moderate';
  if (score >= 15) return 'Low Risk';
  return 'Very Safe';
};
