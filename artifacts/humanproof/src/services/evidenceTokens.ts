// evidenceTokens.ts — Phase 2 (Rules 12 & 17): the user's real numbers, once.
//
// Rule 12: "never let generic advice exist." Advice must feel personally
// generated — so it must carry the user's actual numbers, not a template.
//
// This is the single extractor of typed evidence from the audit + profile. Each
// token is NULL when its source engine didn't run (honest — Rule 17: if we don't
// have it, we don't pretend). Advice producers append `evidenceSuffix(...)` to
// turn "Build your relationship moat" into "Build your relationship moat —
// because your network is functional (44/100) and demand for your role is rising
// (67/100)." `personalizationLevel(...)` lets a surface tag truly-generic advice.

import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';

export interface EvidenceToken {
  key: string;
  value: number | string;
  /** Short noun ("market demand", "runway"). */
  label: string;
  /** Ready-to-interpolate clause with the user's number. */
  phrase: string;
  /** true = favorable, false = unfavorable, null = neutral/context. */
  good: boolean | null;
}

export type EvidenceKey =
  | 'score' | 'demand' | 'fit' | 'gaps' | 'bridgeSkills' | 'runway'
  | 'network' | 'aiExposure' | 'compDelta' | 'velocity' | 'experience';

export interface EvidenceSet {
  tokens: Partial<Record<EvidenceKey, EvidenceToken>>;
  hasAny: boolean;
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export function extractEvidence(hr: HybridResult, profile: UserProfile | null): EvidenceSet {
  const anyHr = hr as any;
  const tokens: Partial<Record<EvidenceKey, EvidenceToken>> = {};

  // ── score ────────────────────────────────────────────────────────────────
  const score = num(hr.total);
  if (score != null) {
    tokens.score = { key: 'score', value: Math.round(score), label: 'risk score',
      phrase: `your risk score is ${Math.round(score)}/100${hr.tier?.label ? ` (${hr.tier.label})` : ''}`,
      good: score < 50 };
  }

  // ── market demand ──────────────────────────────────────────────────────────
  const demandIdx = num(anyHr.roleMarketDemand?.demandIndex);
  const demandTrend: string | undefined = anyHr.roleMarketDemand?.demandTrend;
  if (demandIdx != null) {
    const rising = demandTrend === 'rising' || demandTrend === 'surging';
    const falling = demandTrend === 'declining' || demandTrend === 'falling';
    tokens.demand = { key: 'demand', value: Math.round(demandIdx), label: 'market demand',
      phrase: `demand for your role is ${rising ? 'rising' : falling ? 'declining' : 'steady'} (${Math.round(demandIdx)}/100)`,
      good: rising ? true : falling ? false : null };
  }

  // ── skill-market fit ───────────────────────────────────────────────────────
  const fit = num(anyHr.skillPortfolioFit?.fitScore);
  if (fit != null) {
    tokens.fit = { key: 'fit', value: Math.round(fit), label: 'skill-market fit',
      phrase: `your skill-market fit is ${Math.round(fit)}/100`, good: fit >= 60 };
  }

  // ── critical skill gaps ────────────────────────────────────────────────────
  const gaps: string[] = anyHr.skillGapIntelligence?.criticalGaps ?? [];
  if (gaps.length) {
    tokens.gaps = { key: 'gaps', value: gaps.join(', '), label: 'skill gaps',
      phrase: `you're missing ${gaps[0]}${gaps.length > 1 ? ` and ${gaps.length - 1} more in-demand skill${gaps.length > 2 ? 's' : ''}` : ''}`,
      good: false };
  }

  // ── bridge skills (in-demand to learn) ─────────────────────────────────────
  const bridge: string[] = anyHr.techStackObsolescence?.bridgeSkillPriority ?? [];
  if (bridge.length) {
    tokens.bridgeSkills = { key: 'bridgeSkills', value: bridge.slice(0, 3).join(', '), label: 'bridge skills',
      phrase: `${bridge.slice(0, 2).join(' and ')} ${bridge.length > 1 ? 'are' : 'is'} in active demand for your role`,
      good: null };
  }

  // ── financial runway ───────────────────────────────────────────────────────
  const runway = num(profile?.savingsMonthsRunway) ?? num(anyHr.userFinancialRunway?.runwayMonths) ?? num(hr.financialRunwayMonths);
  if (runway != null) {
    tokens.runway = { key: 'runway', value: Math.round(runway * 10) / 10, label: 'runway',
      phrase: `you have ~${runway.toFixed(runway < 10 ? 1 : 0)} months of financial runway`,
      good: runway >= 6 };
  }

  // ── network ────────────────────────────────────────────────────────────────
  const net = num(anyHr.networkLeverage?.networkScore);
  const tier: string | undefined = anyHr.networkLeverage?.networkTier;
  if (net != null) {
    tokens.network = { key: 'network', value: Math.round(net), label: 'network',
      phrase: `your network is ${tier ? tier.toLowerCase() : 'functional'} (${Math.round(net)}/100)`,
      good: net >= 55 };
  }

  // ── AI exposure (D1) ───────────────────────────────────────────────────────
  const d1 = num(hr.dimensions?.find(d => d.key === 'D1')?.score);
  if (d1 != null) {
    tokens.aiExposure = { key: 'aiExposure', value: Math.round(d1), label: 'AI exposure',
      phrase: `AI targets ~${Math.round(d1)}% of your role's tasks`, good: d1 < 45 };
  }

  // ── compensation delta vs market ───────────────────────────────────────────
  const compDelta = num(anyHr.compensationRisk?.marketDeltaPct);
  if (compDelta != null && Math.abs(compDelta) >= 3) {
    tokens.compDelta = { key: 'compDelta', value: Math.round(compDelta), label: 'pay vs market',
      phrase: compDelta >= 0 ? `you're ${Math.round(compDelta)}% above market` : `you're ${Math.abs(Math.round(compDelta))}% below market`,
      good: compDelta >= 0 ? null : true /* below market = upside to negotiate */ };
  }

  // ── risk velocity ──────────────────────────────────────────────────────────
  const vel = num(anyHr.scoreTrajectory?.velocityPtsPerMonth);
  if (vel != null && Math.abs(vel) >= 0.5) {
    tokens.velocity = { key: 'velocity', value: Math.round(vel * 10) / 10, label: 'risk trend',
      phrase: vel > 0 ? `your risk is rising ${vel.toFixed(1)} pts/month` : `your risk is easing ${Math.abs(vel).toFixed(1)} pts/month`,
      good: vel <= 0 };
  }

  // ── experience ─────────────────────────────────────────────────────────────
  const _expM = String(hr.experience ?? '').match(/\d+/);
  const exp = (typeof profile?.yearsExperience === 'number' && Number.isFinite(profile.yearsExperience))
    ? profile.yearsExperience : (_expM ? parseInt(_expM[0], 10) : null);
  if (exp != null) {
    tokens.experience = { key: 'experience', value: exp, label: 'experience',
      phrase: `your ${exp} years of experience`, good: null };
  }

  return { tokens, hasAny: Object.keys(tokens).length > 0 };
}

// ── Consumption helpers ────────────────────────────────────────────────────────

/** Phrases for the requested keys that actually exist, in priority order. */
export function evidencePhrases(set: EvidenceSet, keys: EvidenceKey[], max = 2): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const t = set.tokens[k];
    if (t) out.push(t.phrase);
    if (out.length >= max) break;
  }
  return out;
}

/** A grammatical "— because X and Y" suffix, or "" when no evidence applies. */
export function evidenceSuffix(set: EvidenceSet, keys: EvidenceKey[], max = 2): string {
  const phrases = evidencePhrases(set, keys, max);
  if (phrases.length === 0) return '';
  const joined = phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
  return ` — because ${joined}`;
}

/** Whether any of the relevant evidence keys exist (Rule 12 honesty gate). */
export function personalizationLevel(set: EvidenceSet, keys: EvidenceKey[]): 'personalized' | 'generic' {
  return keys.some(k => set.tokens[k]) ? 'personalized' : 'generic';
}

// Map an action's domain to the evidence keys that make its advice specific.
const CATEGORY_EVIDENCE: Record<string, EvidenceKey[]> = {
  resume:    ['fit', 'gaps', 'demand'],
  skills:    ['bridgeSkills', 'gaps', 'aiExposure', 'demand'],
  network:   ['network', 'demand'],
  negotiate: ['compDelta', 'score'],
  ai:        ['aiExposure', 'bridgeSkills'],
  financial: ['runway', 'score'],
  default:   ['demand', 'score', 'fit'],
};

const CATEGORY_PATTERNS: Array<[RegExp, keyof typeof CATEGORY_EVIDENCE]> = [
  [/resume|cv\b|linkedin|profile|headline|portfolio|github|project/i, 'resume'],
  [/skill|learn|course|certif|train|bootcamp/i, 'skills'],
  [/network|connect|reach out|referral|recruiter|coffee/i, 'network'],
  [/negotiat|salary|compens|pay|raise|equity|retention/i, 'negotiate'],
  [/\bai\b|automat|prompt|llm|gpt|rag|copilot|cursor/i, 'ai'],
  [/financial|saving|fund|emergency|runway|budget/i, 'financial'],
];

/** Evidence keys most relevant to a free-text action title/description. */
export function evidenceKeysForText(text: string): EvidenceKey[] {
  for (const [re, cat] of CATEGORY_PATTERNS) if (re.test(text)) return CATEGORY_EVIDENCE[cat];
  return CATEGORY_EVIDENCE.default;
}
