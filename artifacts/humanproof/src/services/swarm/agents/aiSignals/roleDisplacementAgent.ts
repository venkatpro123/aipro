// roleDisplacementAgent.ts
// AI Signal — Consolidated role displacement risk.
//
// AUDIT FIX: The previous ai_displacement cluster contained four separate agents
// (automationPotentialAgent, displacementTimelineAgent, roleObsolescenceAgent,
// aiReplacementPatternAgent) that ALL pattern-matched against input.roleTitle using
// different keyword tables. Mean pairwise correlation ≈ 0.90.
// 1/√4 diversity weighting gave them combined weight 2.0, but their effective
// independent information was n_eff ≈ 1.08 — nearly one signal dressed as four.
//
// Fix: single agent, primary source = getCareerIntelligence() (the same
// intelligence database the deterministic engine already uses).
// This produces genuine independence from the engine's L3 calculation:
//   - Engine L3: uses roleExposureData[roleTitle].aiRisk (simple table)
//   - This agent: uses the full CareerIntelligence record (riskTrend, skill counts,
//     inaction scenario analysis) as a richer data source
//
// Heuristic fallback when no CareerIntelligence record exists.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';
import { getCareerIntelligence } from '../../../../data/intelligence/index';
// WS9 — fallback keyword table sourced from engine_calibration_constants.
import { getConstant } from '../../../calibration/calibrationConstants';

// Best single-table fallback (Oxford-derived + WEF 2025 update).
// WS9 — values pulled from engine_calibration_constants under
// 'roleDisplacementAgent.fallbackKeywordTable'. Bootstrap preserves
// legacy behaviour when DB row is absent.
const BOOTSTRAP_ROLE_DISPLACEMENT_FALLBACK: Record<string, number> = {
  'data entry':       0.97, 'cashier':          0.90, 'telemarketer':     0.88,
  'bookkeeper':       0.85, 'translator':       0.82, 'customer service': 0.75,
  'paralegal':        0.72, 'content writer':   0.72, 'copywriter':       0.68,
  'accountant':       0.74, 'financial analyst':0.58, 'analyst':          0.52,
  'recruiter':        0.65, 'hr ':              0.58, 'auditor':          0.62,
  'marketing':        0.55, 'sales':            0.48, 'software engineer':0.32,
  'developer':        0.35, 'programmer':       0.30, 'data scientist':   0.38,
  'ml engineer':      0.28, 'ai engineer':      0.18, 'product manager':  0.30,
  'designer':         0.42, 'ux ':              0.38, 'architect':        0.22,
  'manager':          0.35, 'director':         0.28, 'executive':        0.20,
  'nurse':            0.12, 'doctor':           0.10, 'therapist':        0.08,
  'teacher':          0.18, 'researcher':       0.35, 'scientist':        0.30,
  'default':          0.45,
};

const ROLE_DISPLACEMENT_FALLBACK: Record<string, number> = (() => {
  const r = getConstant<Record<string, number>>(
    'roleDisplacementAgent.fallbackKeywordTable',
    BOOTSTRAP_ROLE_DISPLACEMENT_FALLBACK,
  );
  return (r.value && typeof r.value === 'object')
    ? { ...BOOTSTRAP_ROLE_DISPLACEMENT_FALLBACK, ...r.value }
    : BOOTSTRAP_ROLE_DISPLACEMENT_FALLBACK;
})();

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  // ── Primary: CareerIntelligence record (richer than keyword table) ──────────
  const intel = getCareerIntelligence(input.roleTitle);

  if (intel) {
    // Derive signal from three intelligence dimensions:
    //  1. Obsolete skills ratio (highest-confidence signal)
    //  2. At-risk skill average riskScore
    //  3. Risk trend direction (from riskTrend array)

    const totalSkills =
      (intel.skills?.obsolete?.length ?? 0) +
      (intel.skills?.at_risk?.length ?? 0) +
      (intel.skills?.safe?.length ?? 0);

    const obsoleteRatio = totalSkills > 0
      ? (intel.skills?.obsolete?.length ?? 0) / totalSkills
      : 0;

    const avgAtRiskScore = intel.skills?.at_risk && intel.skills.at_risk.length > 0
      ? intel.skills.at_risk.reduce((s, sk) => s + (sk.riskScore ?? 50), 0) /
        intel.skills.at_risk.length / 100
      : 0.50;

    // Trend: is displacement risk rising or falling over riskTrend?
    let trendSignal = 0.50;
    if (intel.riskTrend && intel.riskTrend.length >= 2) {
      const scores = intel.riskTrend
        .map(t => typeof t.riskScore === 'number' ? t.riskScore : null)
        .filter((v): v is number => v !== null);
      if (scores.length >= 2) {
        const first = scores[0];
        const last  = scores[scores.length - 1];
        const delta = (last - first) / 100; // normalise
        trendSignal = clamp(0.50 + delta, 0.10, 0.90);
      }
    }

    // Blend: obsolete ratio most predictive, at-risk average secondary, trend tertiary
    const signal = clamp(
      obsoleteRatio * 0.50 +
      avgAtRiskScore * 0.30 +
      trendSignal   * 0.20,
    );

    return {
      agentId:    'roleDisplacementAgent',
      category:   'ai',
      signal,
      confidence: 0.82, // Higher confidence: uses full intelligence database
      sourceType: 'heuristic',
      ageInDays:  14,
      metadata:   {
        source: 'career_intelligence',
        roleKey: input.roleTitle,
        obsoleteRatio: obsoleteRatio.toFixed(3),
        avgAtRiskScore: avgAtRiskScore.toFixed(3),
        trendSignal: trendSignal.toFixed(3),
        totalSkills,
      },
    };
  }

  // ── Fallback: single keyword table (UNCALIBRATED) ────────────────────────
  const roleLower  = input.roleTitle.toLowerCase();
  const matchedKey = Object.keys(ROLE_DISPLACEMENT_FALLBACK).find(k => roleLower.includes(k)) ?? 'default';
  const signal     = ROLE_DISPLACEMENT_FALLBACK[matchedKey];

  return {
    agentId:    'roleDisplacementAgent',
    category:   'ai',
    signal,
    confidence: matchedKey !== 'default' ? 0.55 : 0.30,
    sourceType: 'heuristic',
    ageInDays:  30,
    metadata:   { source: 'keyword_fallback', matchedKey },
  };
};

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export const roleDisplacementAgent: AgentFn = { id: 'roleDisplacementAgent', run };
