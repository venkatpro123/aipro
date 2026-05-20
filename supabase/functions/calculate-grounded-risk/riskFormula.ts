// ════════════════════════════════════════════════════════════════
// riskFormula.ts — Core Risk Engine Calculation & Confidence Logic
// v4.0 — Data-First Career Intelligence Engine.
// D1-D6 calculation + career intelligence powered by careerIntelligenceDB
// Fallback uses modular roadmap blocks + skillsData for semi-specific output.
// ════════════════════════════════════════════════════════════════

/**
 * 3-Tier Confidence System
 */
export type ConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW';

export interface ScoreResult {
  total: number;
  dimensions: {
    label: string;
    key: string;
    score: number;
    weight: number;
  }[];
  confidence: ConfidenceLevel;
  dataQuality: 'DQ_FULL' | 'DQ_PARTIAL' | 'Limited';
  ai_risk_skills?: any;
  safer_career_paths?: any;
  roadmap?: any;
  inaction_scenario?: string;
  riskTrend?: any[];
  content_confidence?: number;
  isSeeded?: boolean;
}

import {
  TASK_AUTO, DISRUPTION_VELOCITY, AUGMENTATION,
  NETWORK_MOAT, INDUSTRY_KEY_MULT, D3_CURVE_EXPONENT,
  EXP_SENSITIVITY, EXP_RISK_BASE, COUNTRY_DATA,
} from './riskData';

import {
  getCareerIntelligence,
  getRoleRoadmap,
  getRoleCareerPaths,
  getRoleSkills,
  getInactionScenario,
  getRiskTrend,
  hasSeededData,
} from './careerIntelligenceDB';

import {
  selectRoadmapBlocks,
  mergeBlocksIntoRoadmap,
} from './roadmapBlocks';

import { DANGER_SKILLS, SAFE_SKILLS, TRANSITION_RECS } from './skillsData';

// ─── Score Regression Reference (do not delete) ──────────────────
// Role: Crisis Therapist / mental_health / mh_crisis / usa / 0-2yr  → target ~18
// Role: SEO Content Writer / content / cnt_seo_content / usa / 5-10yr → target ~93
// Role: Software Architect / it_software / sw_arch / germany / 10-20yr → target ~28
// Role: Data Entry Clerk / bpo / bpo_data_entry / india / 0-2yr → target ~95
// Role: Surgeon / healthcare / hc_surgeon / usa / 20+yr → target ~10
// ──────────────────────────────────────────────────────────────────

/**
 * Enhanced projectSafeScore with upskilling factor
 */
export const projectSafeScore = (
  currentScore: number,
  years: number,
  upskillingFactor: number = 0
): number => {
  const baseDecay = 0.05 * years;
  const mitigatedDecay = baseDecay * (1 - upskillingFactor);
  const projectedRisk = currentScore + (mitigatedDecay * 100);
  return Math.min(Math.max(projectedRisk, 0), 100);
};

// Required by old DisplacementForecast.tsx (Deprecated: replaced by backend forecast API)
export const projectScore = (baseRisk: number, decayRate: number, years: number): number => {
  if (baseRisk <= 0) return 0;
  const L = 100;
  const safeBase = Math.min(baseRisk, 99);
  const kMultipler = Math.max(decayRate / 15, 0.1); 
  const t0_implied = Math.log(100 / safeBase - 1) / kMultipler;
  const projected = L / (1 + Math.exp(-kMultipler * (years - t0_implied)));
  return Math.min(Math.max(Math.round(projected), 0), 100);
};

export const getConfidenceLevel = (dq: string): ConfidenceLevel => {
  if (dq === 'DQ_FULL') return 'HIGH';
  if (dq === 'DQ_PARTIAL') return 'MODERATE';
  return 'LOW';
};

export const calcDimensionScore = (base: number, volatility: number): number => {
  return Math.min(Math.max(base * volatility, 0), 100);
};

// ─── D1: Task Automatability ──────────────────────────────────────
// Higher = more automatable tasks in this role
export const calculateD1 = (wt: string, ind: string) => TASK_AUTO[ind]?.[wt] || TASK_AUTO['default']?.[wt] || 50;

// ─── D2: AI Tool Maturity ─────────────────────────────────────────
// Higher = more mature/reliable AI tools exist for this work type
export const calculateD2 = (wt: string) => DISRUPTION_VELOCITY[wt] ?? 50;

// ─── D3: Human Amplification (curved inversion) ───────────────────
// Higher augVal = AI amplifies human MORE = displacement risk is LOWER
// Curved inversion: augVal=50 → D3≈37 (protective, not neutral)
export const calculateD3 = (wt: string) => {
  const raw = AUGMENTATION[wt] ?? 50;
  return Math.round(100 * (1 - Math.pow(raw / 100, D3_CURVE_EXPONENT)));
};

// ─── D4: Experience Shield ────────────────────────────────────────
// BUG-C3 FIX: Was returning hardcoded 50. Now uses experience sensitivity data.
// Higher seniority in high-sensitivity roles = more protected.
// Output: lower D4 = more protected (consistent with other dimensions)
export const calculateD4 = (workType: string, experience: string = '5-10'): number => {
  const sensFactor = EXP_SENSITIVITY[workType] ?? 0.42;
  const baseRisk = EXP_RISK_BASE[experience] ?? 50;
  // sensFactor of 0.92 (e.g. surgeon) means very high protection at senior levels
  const shieldedRisk = baseRisk * (1 - sensFactor);
  return Math.min(Math.max(Math.round(shieldedRisk), 0), 100);
};

// ─── D5: Country Net AI Exposure ─────────────────────────────────
// BUG-C3 FIX: Was returning hardcoded 50. Now uses COUNTRY_DATA table.
// Formula: net exposure = (AI adoption - regulation * 0.6) / 1.4
// USA (adoption=90, reg=28) → ~54 (high exposure)
// Germany (adoption=72, reg=82) → ~16 (well regulated, low exposure)
export const calculateD5 = (country: string = 'usa'): number => {
  const key = country.toLowerCase().replace(/\s+/g, '_');
  const [adoption, regulation] = COUNTRY_DATA[key] ?? COUNTRY_DATA['other'] ?? [55, 40];
  const netExposure = (adoption - regulation * 0.6) / 1.4;
  return Math.min(Math.max(Math.round(netExposure), 0), 100);
};

// ─── D6: Social Capital Moat ─────────────────────────────────────
// Lower score = stronger professional network = more protected
export const calculateD6 = (workType: string): number => NETWORK_MOAT[workType] ?? 50;

// ─── UI Helpers ──────────────────────────────────────────────────
export const getScoreColor = (score: number) => {
  if (score < 25) return '#10b981';   // Emerald — AI-Resistant
  if (score < 50) return '#3b82f6';   // Blue — Resilient
  if (score < 70) return '#f59e0b';   // Amber — Exposed
  return '#ef4444';                   // Red — Critical Risk
};

export const getVerdict = (score: number) => {
  if (score < 25) return 'AI-Resistant';
  if (score < 50) return 'Resilient';
  if (score < 70) return 'Exposed';
  return 'Critical Risk';
};

export const getTimeline = (score: number) => {
  if (score < 25) return '8-12 Years';
  if (score < 50) return '5-8 Years';
  if (score < 70) return '2-4 Years';
  return 'Immediate (< 2 Years)';
};

export const getUrgency = (score: number) => {
  if (score < 25) return 'Low';
  if (score < 50) return 'Moderate';
  if (score < 70) return 'High';
  return 'Critical';
};

export const getConfidence = (_workType: string) => 'HIGH';
export const getAutomationExp = (_workType: string) => 'Expanding';

// ─── Grounded-risk formula weights ───────────────────────────────
// Named constants (not inline literals) so the assertion below can catch drift.
// Sum must remain exactly 1.00; any rebalance requires updating ALL six values.
export const GROUNDED_FORMULA_WEIGHTS = {
  D1_taskAutomatability: 0.26,
  D2_aiToolMaturity:     0.18,
  D3_humanAmplification: 0.20,
  D4_experienceShield:   0.16,
  D5_countryExposure:    0.09,
  D6_socialCapitalMoat:  0.11,
} as const;

// Assertion runs at module load (Deno top-level or Node require-time).
// Mirrors the pattern in layoffScoreEngine.ts (browser) and hybridScoringMath.ts (Deno EF).
const _groundedFormulaSum = Object.values(GROUNDED_FORMULA_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(_groundedFormulaSum - 1.0) > 0.001) {
  throw new Error('GROUNDED FORMULA WEIGHTS DO NOT SUM TO 1.0: ' + _groundedFormulaSum);
}

// ─── Master Calculation Function ─────────────────────────────────
export function calculateScore(
  workType: string,
  industry: string,
  experience: string = '5-10',
  country: string = 'usa'
): ScoreResult {
  const induMult = INDUSTRY_KEY_MULT[industry] || 1.0;

  // D1 — Task Automatability (industry-adjusted)
  const d1_raw = calculateD1(workType, industry);
  const d1 = Math.min(d1_raw * (induMult > 1 ? 1.1 : 0.9), 100);

  // D2 — AI Tool Maturity
  const d2 = calculateD2(workType);

  // D3 — Human Amplification (curved inversion)
  const d3 = calculateD3(workType);

  // D4 — Experience Shield
  const d4 = calculateD4(workType, experience);

  // D5 — Country Exposure
  const d5 = calculateD5(country);

  // D6 — Social Capital Moat
  const d6 = calculateD6(workType);

  const GW = GROUNDED_FORMULA_WEIGHTS;
  const total = Math.round(
    d1 * GW.D1_taskAutomatability +
    d2 * GW.D2_aiToolMaturity     +
    d3 * GW.D3_humanAmplification +
    d4 * GW.D4_experienceShield   +
    d5 * GW.D5_countryExposure    +
    d6 * GW.D6_socialCapitalMoat
  );

  // Determine data quality based on how many dimensions have real data
  const hasSpecificD1 = !!(TASK_AUTO[industry]?.[workType]);
  const hasSpecificD2 = !!(DISRUPTION_VELOCITY[workType]);
  const dataQuality = hasSpecificD1 && hasSpecificD2 ? 'DQ_FULL' : 'DQ_PARTIAL';

  return {
    total: Math.min(Math.max(total, 0), 100),
    dimensions: [
      { key: 'D1', label: 'Task Automatability', score: Math.round(d1), weight: Math.round(GW.D1_taskAutomatability * 100) },
      { key: 'D2', label: 'AI Tool Maturity',    score: Math.round(d2), weight: Math.round(GW.D2_aiToolMaturity     * 100) },
      { key: 'D3', label: 'Human Amplification', score: Math.round(d3), weight: Math.round(GW.D3_humanAmplification * 100) },
      { key: 'D4', label: 'Experience Shield',   score: Math.round(d4), weight: Math.round(GW.D4_experienceShield   * 100) },
      { key: 'D5', label: 'Country Exposure',    score: Math.round(d5), weight: Math.round(GW.D5_countryExposure    * 100) },
      { key: 'D6', label: 'Social Capital Moat', score: Math.round(d6), weight: Math.round(GW.D6_socialCapitalMoat  * 100) },
    ],
    confidence: dataQuality === 'DQ_FULL' ? 'HIGH' : 'MODERATE',
    dataQuality,
    ...generateStructuredFallbackRoadmap(d1, d2, d3, d4, d5, d6, workType, industry, experience, total),
  };
}

/**
 * Data-First Career Intelligence Generator
 *
 * Strategy:
 * 1. Check if careerIntelligenceDB has pre-seeded data for this role → use it
 * 2. Fall back to modular roadmap block engine (dimension-driven selection)
 * 3. Use DANGER_SKILLS + SAFE_SKILLS + TRANSITION_RECS for semi-specific skill data
 * 4. Generate contextual inaction scenario based on D1+D2 score
 */
function generateStructuredFallbackRoadmap(
  d1: number,
  d2: number,
  d3: number,
  d4: number,
  d5: number,
  d6: number,
  workType: string,
  industry: string,
  experience: string = '5-10',
  total: number = 50
) {
  // ── Path 1: Pre-seeded career intelligence ────────────────────────────
  if (hasSeededData(workType)) {
    const intel = getCareerIntelligence(workType)!;
    const expKey = experience as '0-2' | '2-5' | '5-10' | '10-20' | '20+';
    const roadmapData = getRoleRoadmap(workType, expKey);
    const skills = getRoleSkills(workType);
    const careerPaths = getRoleCareerPaths(workType);
    const inactionScenario = getInactionScenario(workType);
    const riskTrend = getRiskTrend(workType);

    // Map seeded skills to the AI edge function format
    const ai_risk_skills = skills ? {
      obsolete: skills.obsolete.map(s => ({
        skill: s.skill,
        reason: s.reason,
        timeline: s.horizon.replace('yr', ' years'),
        riskScore: s.riskScore,
      })),
      at_risk: skills.at_risk.map(s => ({
        skill: s.skill,
        reason: s.reason,
        timeline: s.horizon.replace('yr', ' years'),
        riskScore: s.riskScore,
      })),
      safe: skills.safe.map(s => ({
        skill: s.skill,
        reason: s.whySafe,
        timeline: '5+ years',
        longTermValue: s.longTermValue,
        resource: s.resource,
      })),
    } : { obsolete: [], at_risk: [], safe: [] };

    // Map seeded career paths to AI edge function format
    const safer_career_paths = careerPaths.map(p => ({
      role: p.role,
      risk_reduction_pct: p.riskReduction,
      skill_gap: p.skillGap,
      transition_difficulty: p.transitionDifficulty,
      salary_delta: p.salaryDelta,
      time_to_transition: p.timeToTransition,
    }));

    // Map seeded roadmap to AI edge function format
    const roadmap = roadmapData ? {
      phase_1: {
        timeline: roadmapData.phase_1.timeline,
        actions: roadmapData.phase_1.actions,
      },
      phase_2: {
        timeline: roadmapData.phase_2.timeline,
        actions: roadmapData.phase_2.actions,
      },
      phase_3: {
        timeline: roadmapData.phase_3.timeline,
        actions: roadmapData.phase_3.actions,
      },
    } : null;

    return {
      ai_risk_skills,
      safer_career_paths,
      roadmap: roadmap ?? generateModularFallbackRoadmap(d1, d2, d6, total, experience),
      inaction_scenario: inactionScenario ?? generateInactionScenario(workType, d1, d2, total),
      riskTrend,
      content_confidence: intel.confidenceScore,
      isSeeded: true,
    };
  }

  // ── Path 2: Modular block engine + skillsData semi-specific fallback ──
  return generateSemiSpecificFallback(d1, d2, d3, d4, d5, d6, workType, industry, experience, total);
}

/**
 * Modular block-based roadmap for un-seeded roles
 */
function generateModularFallbackRoadmap(
  d1: number,
  d2: number,
  d6: number,
  total: number,
  experience: string
) {
  const blocks = selectRoadmapBlocks({ d1, d2, d6, total, experience });
  const merged = mergeBlocksIntoRoadmap(blocks);

  if (!merged) {
    return {
      phase_1: { timeline: '0–30 days', actions: [{ action: 'Audit your automatable tasks', why: 'Know your risk surface', outcome: 'Clear automation risk log' }] },
      phase_2: { timeline: '1–3 months', actions: [{ action: 'Learn the AI tool most relevant to your field', why: 'AI-native professionals earn 30% more', outcome: 'New AI tool in daily workflow' }] },
      phase_3: { timeline: '3–12 months', actions: [{ action: 'Apply for strategy or oversight roles in your field', why: 'Strategic roles have 60% lower AI risk than execution roles', outcome: 'New role with higher AI resilience' }] },
    };
  }

  return merged;
}

/**
 * Semi-specific fallback using skillsData (DANGER_SKILLS, SAFE_SKILLS, TRANSITION_RECS)
 * This replaces the old 100% generic fallback with partial role-specificity
 */
function generateSemiSpecificFallback(
  d1: number,
  d2: number,
  d3: number,
  d4: number,
  d5: number,
  d6: number,
  workType: string,
  industry: string,
  experience: string,
  total: number
) {
  // Fetch role-specific skills from existing skillsData
  const dangerSkills = DANGER_SKILLS[workType] ?? DANGER_SKILLS['default'] ?? [];
  const safeSkills = SAFE_SKILLS[workType] ?? SAFE_SKILLS['default'] ?? [];
  const transitionRecs = TRANSITION_RECS[workType] ?? TRANSITION_RECS['default'] ?? [];

  // Build skill matrix from skillsData
  const ai_risk_skills = {
    obsolete: dangerSkills.slice(0, 3).map((skill, i) => ({
      skill,
      reason: d1 > 70
        ? `High automatability (D1: ${Math.round(d1)}%) — AI tools now handle this task at scale.`
        : `Moderate-high AI tool maturity in this category — displacement risk is real.`,
      timeline: i === 0 ? '1-2 years' : i === 1 ? '2-3 years' : '3-5 years',
    })),
    at_risk: dangerSkills.slice(3, 6).map((skill, i) => ({
      skill,
      reason: `AI tools augment this skill — partial automation is underway with ${Math.round(d2)}% AI tool maturity.`,
      timeline: i === 0 ? '2-4 years' : '3-5 years',
    })),
    safe: safeSkills.slice(0, 3).map(skill => ({
      skill,
      reason: 'Complex human judgment, relationships, or contextual expertise — AI only partially replicates this.',
      timeline: '5+ years',
    })),
  };

  // Build career paths from transition recommendations
  const safer_career_paths = transitionRecs.slice(0, 3).map((rec, i) => {
    const [role, ...rest] = rec.split(' — ');
    return {
      role: role.trim(),
      risk_reduction_pct: [45, 35, 50][i] ?? 40,
      skill_gap: rest.join(' ').trim() || 'Develop strategic thinking, AI tool fluency, and domain expertise',
      transition_difficulty: ['Medium', 'Hard', 'Medium'][i] ?? 'Medium',
    };
  });

  // Generate modular roadmap from blocks
  const roadmap = generateModularFallbackRoadmap(d1, d2, d6, total, experience);

  return {
    ai_risk_skills,
    safer_career_paths,
    roadmap,
    inaction_scenario: generateInactionScenario(workType, d1, d2, total),
    riskTrend: [],
    content_confidence: 65,
    isSeeded: false,
  };
}

/**
 * Generate contextual inaction scenario based on risk dimensions
 */
function generateInactionScenario(workType: string, d1: number, d2: number, total: number): string {
  if (total >= 80) {
    return `Your role faces imminent automation pressure — AI tools have reached ${Math.round(d2)}% maturity in your field and ${Math.round(d1)}% of your tasks are automatable. Without pivoting to strategy, oversight, or an adjacent role within 12 months, you risk position elimination as companies find AI-first alternatives to your current function.`;
  } else if (total >= 60) {
    return `Your role is in the high-risk zone with ${Math.round(d1)}% task automatability. Companies are actively deploying AI tools in your function. Without developing AI-native skills, governance capabilities, or moving toward strategic work in the next 18-24 months, your market value will compress significantly.`;
  } else if (total >= 40) {
    return `You are in the AI augmentation zone — AI tools will reshape your role substantially over 3-5 years. Professionals who position themselves as AI-native practitioners now will capture the value. Those who don't will find their salaries stagnant as AI handles the execution layer.`;
  } else {
    return `Your role has relatively strong AI resilience today, but no function is permanently immune. Investing now in your human-only capabilities — relationship networks, strategic judgment, and novel problem-solving — ensures you remain ahead of the curve for the long term.`;
  }
}

// Legacy aliases for backward compatibility (used by DisplacementForecast, etc.)
export { calculateD4 as getExpRisk_v2 };
export { calculateD5 as getCountryRisk };
export { calculateD1 as getD1, calculateD2 as getD2, calculateD3 as getD3 };
