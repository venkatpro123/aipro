// scoreSensitivityEngine.ts
// Intelligence Upgrade v10.0 — Score Sensitivity Analysis
//
// PROBLEM THIS SOLVES:
//   Escape paths tell users WHAT to do (career moves over months).
//   Sensitivity analysis tells users WHAT MOVES THE NEEDLE TODAY.
//   "If L1 improved 25 points, your score drops 4 pts — that's your highest leverage."
//   This is faster, more granular, and more motivating than career-move advice.
//
// DESIGN:
//   For each dimension, compute:
//     sensitivityDrop = if this dimension improved by 25 points (0-1 scale = 0.25),
//                       how many points would the final score drop?
//   = 0.25 × dimensionWeight × 100
//
//   Then for each dimension, identify the FASTEST single action that would
//   create a 25-point improvement in that dimension.
//
//   Output is sorted by sensitivity DESC — user sees "these 3 levers move the score most."
//
// USE CASE:
//   User sees their score is 68. They ask: "What single change has the biggest impact?"
//   Answer: "Switching to a financially healthier company reduces L1 by ~30 pts,
//             which drops your overall score by ~5 pts — more than any other single move."

import type { ScoreBreakdown } from './layoffScoreEngine';
// v39.0 E2: use the authoritative formula weights instead of the duplicated
// DIMENSION_CONFIG.weight values (which had drifted: L4 0.01 vs engine 0.00,
// D6 0.05 vs engine 0.04, D8 0.05 vs engine 0.09 then 0 when flag-gated).
import { getEffectiveFormulaWeights } from './layoffScoreEngine';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SensitivityLever {
  dimension: string;             // e.g. "L1", "L3", "D8"
  dimensionLabel: string;        // e.g. "Company Financial Health"
  currentScore: number;          // 0–100 (display)
  improvementTarget: number;     // 0–100 target (current − 25, floored at 0)
  scoreDropIfImproved: number;   // final score points dropped if 25pt improvement achieved
  percentOfTotalRisk: number;    // this lever's share of the current score
  fastestAction: string;         // single fastest action to move this dimension 25pts
  actionTimeframe: string;       // "Today" / "1 week" / "30 days" / "60–90 days"
  feasibility: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  confidenceInEstimate: 'High' | 'Medium' | 'Low';
}

export interface SensitivityCombo {
  levers: [string, string];      // two dimension keys
  combinedDrop: number;          // combined score drop if BOTH improved
  synergyBonus: number;          // extra drop from synergy (combinedDrop - sum of individual)
  rationale: string;
}

export interface ScoreSensitivityResult {
  // ── Per-dimension levers (sorted by scoreDropIfImproved DESC) ─────────────
  levers: SensitivityLever[];

  // ── Top insights (optional: undefined when levers array is empty) ──────────
  highestImpactLever: SensitivityLever | undefined;
  quickestImpactLever: SensitivityLever | undefined;
  mostActionableLever: SensitivityLever | undefined;

  // ── Synergy combos ─────────────────────────────────────────────────────────
  topSynergyCombos: SensitivityCombo[];       // top 2 dimension pairs that compound well

  // ── Score projections ─────────────────────────────────────────────────────
  currentScore: number;
  bestSingleLeverScore: number;               // score if only top lever is pulled
  bestTwoLeverScore: number;                  // score if top 2 levers are pulled
  bestThreeLeverScore: number;               // score if top 3 levers are pulled

  // ── Summary sentence ──────────────────────────────────────────────────────
  keySensitivityInsight: string;
}

// ─── Dimension configuration ───────────────────────────────────────────────────

/** Per-user context that personalises the lever action text. All fields optional
 *  so the engine degrades gracefully to the generic template when context is absent. */
export interface SensitivityContext {
  /** Human-readable role for action phrasing, e.g. "Backend Engineer", "Registered Nurse". */
  roleLabel?: string;
  /** Oracle role prefix family ('sw' | 'ds' | 'hc' | 'legal' | 'fin' | ...) for role-specific phrasing. */
  rolePrefix?: string;
  /** Current company name — referenced in company-switch levers (L1/L2/D7). */
  companyName?: string;
  /** Company industry / sector — referenced in L4 and AI-exposure framing. */
  industry?: string;
  /** ISO region code (US/IN/UK/...) — adjusts reemployment / job-search timeframe phrasing. */
  region?: string;
  /** Visa status — when employer-dependent, a company switch carries authorization risk. */
  visaStatus?: string | null;
}

interface DimensionConfig {
  label: string;
  weight: number;
  /** Action generator now also receives per-user context for personalised phrasing. */
  fastestAction: (currentScore: number, ctx: SensitivityContext) => string;
  actionTimeframe: (currentScore: number, ctx: SensitivityContext) => string;
  feasibility: (currentScore: number) => SensitivityLever['feasibility'];
  confidence: 'High' | 'Medium' | 'Low';
}

// ── Role-specific AI-oversight phrasing ──────────────────────────────────────
// L3 (role displacement) and D8 (AI efficiency) actions reference a concrete,
// role-appropriate AI workflow rather than the generic "AI oversight workflow".
const ROLE_AI_WORKFLOW: Record<string, string> = {
  sw:     'an AI code-review or test-generation workflow (e.g. Copilot-assisted PR validation)',
  ds:     'an LLM-evaluation or model-monitoring workflow you own end-to-end',
  pm:     'an AI-feature spec + success-metric framework for one shipped product surface',
  fin:    'an AI-assisted forecasting or variance-analysis workflow with documented accuracy gains',
  hr:     'an AI-assisted people-analytics or screening-audit workflow',
  mkt:    'an AI-native campaign workflow (generation + attribution) with measured ROI',
  legal:  'an AI contract-review or legal-research validation workflow (Harvey/CoCounsel oversight)',
  hc:     'an ambient-AI clinical-documentation review workflow you supervise',
  ops:    'an RPA / process-automation workflow you designed and monitor',
  design: 'an AI-assisted design-system or generative-asset workflow with quality gates',
  bpo:    'an AI quality-assurance / escalation-routing workflow you configured',
  sales:  'an AI revenue-intelligence workflow (call analysis + pipeline scoring)',
  cons:   'an AI-augmented analysis workflow you lead on a client engagement',
  default:'an AI oversight workflow where you validate AI output rather than be replaced by it',
};

// Map varied oracle key first-segments onto the canonical ROLE_AI_WORKFLOW families.
// e.g. 'data'/'ml'/'ai' → 'ds'; 'financial'/'finance' → 'fin'; 'nurse'/'physician' → 'hc'.
const PREFIX_FAMILY_ALIAS: Record<string, string> = {
  sw: 'sw', software: 'sw', backend: 'sw', frontend: 'sw', fullstack: 'sw',
  devops: 'sw', sre: 'sw', mobile: 'sw', qa: 'sw', security: 'sw', platform: 'sw',
  ds: 'ds', data: 'ds', ml: 'ds', ai: 'ds', analytics: 'ds', analyst: 'ds',
  pm: 'pm', product: 'pm',
  fin: 'fin', finance: 'fin', financial: 'fin', accounting: 'fin', accountant: 'fin',
  hr: 'hr', recruiter: 'hr', talent: 'hr', people: 'hr',
  mkt: 'mkt', marketing: 'mkt', growth: 'mkt', content: 'mkt', seo: 'mkt',
  legal: 'legal', counsel: 'legal', attorney: 'legal', paralegal: 'legal', compliance: 'legal',
  hc: 'hc', health: 'hc', nurse: 'hc', physician: 'hc', clinical: 'hc', medical: 'hc', pharmacist: 'hc',
  ops: 'ops', operations: 'ops', supply: 'ops', logistics: 'ops', procurement: 'ops',
  design: 'design', ux: 'design', ui: 'design', creative: 'design',
  bpo: 'bpo', support: 'bpo', cx: 'bpo',
  sales: 'sales', account: 'sales', sdr: 'sales', bdr: 'sales', revenue: 'sales',
  cons: 'cons', consultant: 'cons', consulting: 'cons', strategy: 'cons',
};

function roleAiWorkflow(ctx: SensitivityContext): string {
  const raw = (ctx.rolePrefix ?? '').toLowerCase();
  const family = PREFIX_FAMILY_ALIAS[raw] ?? 'default';
  return ROLE_AI_WORKFLOW[family] ?? ROLE_AI_WORKFLOW.default;
}

/** Company-switch phrasing that names the user's company and flags visa risk when relevant. */
function companySwitchSuffix(ctx: SensitivityContext): string {
  const visaDependent = !!ctx.visaStatus &&
    !/^(citizen|permanent_resident|pr|na|n\/a|none)$/i.test(ctx.visaStatus);
  return visaDependent
    ? ' Note: an employer change affects your work-authorisation timeline — prioritise sponsor-friendly targets.'
    : '';
}

/** Region-aware job-search timeframe. */
function jobSearchTimeframe(ctx: SensitivityContext): string {
  const r = (ctx.region ?? '').toUpperCase();
  if (r === 'IN' || r === 'INDIA') return '45–75 days (job search)';
  if (r === 'US' || r === 'USA')   return '60–90 days (job search)';
  if (r === 'UK' || r === 'GB')    return '70–100 days (job search)';
  return '60–90 days (job search)';
}

const DIMENSION_CONFIG: Record<string, DimensionConfig> = {
  L1: {
    label: 'Company Financial Health',
    weight: 0.16,
    fastestAction: (s, ctx) => {
      const co = ctx.companyName ?? 'your current company';
      return s >= 70
        ? `Move off ${co} to a company with >15% revenue growth and no documented layoff history in 24 months.${companySwitchSuffix(ctx)}`
        : `Monitor ${co}'s earnings closely — a positive guidance beat reduces L1 by 8–12 pts within days; a miss is your cue to start an external search.`;
    },
    actionTimeframe: (s, ctx) => s >= 70 ? jobSearchTimeframe(ctx) : '2–4 weeks (market wait)',
    feasibility: (s) => s >= 70 ? 'medium_term' : 'short_term',
    confidence: 'High',
  },
  L2: {
    label: 'Layoff History',
    weight: 0.06,
    fastestAction: (_s, ctx) => {
      const co = ctx.companyName ?? 'your company';
      return `${co} has documented layoff history. Switching to a company with zero layoff rounds in 24 months drops L2 to ~8/100 immediately on joining.${companySwitchSuffix(ctx)}`;
    },
    actionTimeframe: (_s, ctx) => jobSearchTimeframe(ctx),
    feasibility: () => 'medium_term',
    confidence: 'High',
  },
  L3: {
    label: 'Role Displacement Risk',
    weight: 0.18,
    fastestAction: (s, ctx) => {
      const role = ctx.roleLabel ?? 'your role';
      const wf = roleAiWorkflow(ctx);
      return s >= 70
        ? `Build and document ${wf} for your ${role} work — this repositions you from "automatable" to "AI-oversight" and is the single biggest lever on your displacement risk.`
        : `Ship one AI-augmented deliverable in your ${role} work this week using ${wf} — publicly visible evidence shifts the signal fast.`;
    },
    actionTimeframe: (s) => s >= 70 ? '30 days' : '1 week',
    feasibility: (s) => s >= 70 ? 'short_term' : 'immediate',
    confidence: 'Medium',
  },
  L4: {
    label: 'Industry / Sector Headwinds',
    // L4 maps to D5_countryContext = 0.00 in COMPOSITE_FORMULA_WEIGHTS.
    weight: 0.00,
    fastestAction: (_s, ctx) => {
      const sector = ctx.industry ?? 'your sector';
      return `${sector} headwinds enter your score via role AI-deployment rates (D1) and PPP-adjusted company health (L1), not as a standalone lever. Targeting a role in a growth-stage sector improves D1 and L3 together.`;
    },
    actionTimeframe: (_s, ctx) => jobSearchTimeframe(ctx),
    feasibility: () => 'medium_term',
    confidence: 'High',
  },
  L5: {
    label: 'Experience & Resilience Protection',
    weight: 0.18,
    fastestAction: (s, ctx) => {
      const role = ctx.roleLabel ?? 'your role';
      return s >= 65
        ? `Document one ${role} achievement with concrete numbers (revenue impact, users affected, efficiency %) and add it to LinkedIn + resume today — this shifts the "generic" signal immediately.`
        : `Request a formal 1-on-1 with your manager this week to understand your performance tier relative to the team — proactive visibility is the fastest L5 lever for a ${role}.`;
    },
    actionTimeframe: () => 'Today / 1 week',
    feasibility: () => 'immediate',
    confidence: 'Medium',
  },
  D6: {
    label: 'Network & Relationship Moat',
    weight: 0.05,
    fastestAction: (_s, ctx) => {
      const co = ctx.companyName ?? 'your company';
      return `Schedule 2 cross-functional relationship-building conversations at ${co} this week — D6 improvement needs sustained 30-day effort but the first two conversations start today.`;
    },
    actionTimeframe: () => '30–60 days',
    feasibility: () => 'short_term',
    confidence: 'Low',
  },
  D7: {
    label: 'Unified Company Health',
    weight: 0.06,
    fastestAction: (_s, ctx) => {
      const co = ctx.companyName ?? 'your current employer';
      return `Move off ${co} to a company with a healthier composite profile — D7 captures the combined financial + market + AI-investment signal that only a company change resolves.${companySwitchSuffix(ctx)}`;
    },
    actionTimeframe: (_s, ctx) => jobSearchTimeframe(ctx),
    feasibility: () => 'medium_term',
    confidence: 'High',
  },
  D8: {
    label: 'AI Efficiency Restructuring Risk',
    weight: 0.05,
    fastestAction: (_s, ctx) => {
      const wf = roleAiWorkflow(ctx);
      const role = ctx.roleLabel ?? 'your role';
      return `Build and document ${wf} in your ${role} work — frame yourself as the person who validates AI output, not the person AI replaces. This directly addresses D8.`;
    },
    actionTimeframe: () => '2 weeks',
    feasibility: () => 'short_term',
    confidence: 'Medium',
  },
};

// Synergy pairs: when two levers are improved together, the compound effect is larger
// than the sum of individual effects because the risks compound.
const SYNERGY_MATRIX: Array<{ pair: [string, string]; bonus: number; rationale: string }> = [
  {
    pair: ['L1', 'L2'],
    bonus: 1.5,
    rationale: 'Company switch eliminates BOTH L1 (unhealthy company) and L2 (layoff history) simultaneously — the joint improvement is more than additive because both are correlated with restructuring probability.',
  },
  {
    pair: ['L3', 'D8'],
    bonus: 1.2,
    rationale: 'AI oversight skills address both role displacement (L3) and AI efficiency restructuring (D8) simultaneously — the same skill investment reduces two independent risk dimensions.',
  },
  {
    pair: ['L5', 'D6'],
    bonus: 0.8,
    rationale: 'Personal resilience (L5) and network moat (D6) reinforce each other — visible achievements attract relationship opportunities, and strong relationships amplify the impact of demonstrated skills.',
  },
  {
    pair: ['L1', 'L4'],
    bonus: 0.5,
    rationale: 'Switching to a healthier company in a growing industry eliminates both financial risk (L1) and sector headwinds (L4) — job searches naturally target both simultaneously.',
  },
];

// ─── Main computation ──────────────────────────────────────────────────────────

export interface SensitivityInputs {
  currentScore: number;
  breakdown: ScoreBreakdown & { D6?: number; D7?: number; D8?: number };
  /** Optional per-user context for personalised lever action text. */
  context?: SensitivityContext;
}

export function computeScoreSensitivity(inputs: SensitivityInputs): ScoreSensitivityResult {
  const { currentScore, breakdown } = inputs;
  const ctx: SensitivityContext = inputs.context ?? {};

  const dimEntries: Array<{ key: string; rawScore: number }> = [
    { key: 'L1', rawScore: breakdown.L1 ?? 0 },
    { key: 'L2', rawScore: breakdown.L2 ?? 0 },
    { key: 'L3', rawScore: breakdown.L3 ?? 0 },
    { key: 'L4', rawScore: breakdown.L4 ?? 0 },
    { key: 'L5', rawScore: breakdown.L5 ?? 0.5 },
    { key: 'D6', rawScore: breakdown.D6 ?? 0.5 },
    { key: 'D7', rawScore: breakdown.D7 ?? 0.5 },
    { key: 'D8', rawScore: breakdown.D8 ?? 0 },
  ].filter(d => d.rawScore > 0.05); // skip dimensions with effectively zero contribution

  // Guard: if all dimensions are below the 0.05 threshold (extreme low-score edge case),
  // return a minimal valid result rather than crashing on levers[0] access below.
  if (dimEntries.length === 0) {
    return {
      levers: [],
      highestImpactLever: undefined,
      quickestImpactLever: undefined,
      mostActionableLever: undefined,
      topSynergyCombos: [],
      currentScore,
      bestSingleLeverScore: currentScore,
      bestTwoLeverScore: currentScore,
      bestThreeLeverScore: currentScore,
      keySensitivityInsight: 'Insufficient dimensional data to compute sensitivity analysis.',
    };
  }

  // v39.0 E2: pull the AUTHORITATIVE weights from the score engine so the
  // displayed score-drop matches what would actually happen if the user
  // moved that dimension. Falls back to DIMENSION_CONFIG.weight only if a
  // dimension isn't in the engine's keys (e.g. a UI-only display field).
  const effectiveWeights = getEffectiveFormulaWeights();

  // ── Compute levers ─────────────────────────────────────────────────────────
  const levers: SensitivityLever[] = dimEntries
    .map(({ key, rawScore }) => {
      const cfg = DIMENSION_CONFIG[key];
      if (!cfg) return null;

      const displayScore = Math.round(rawScore * 100);
      const improvementTarget = Math.max(0, displayScore - 25);
      // If current score is already below 25, improvement is bounded by the score itself
      const actualImprovement = Math.min(0.25, rawScore);
      // v39.0 E2: gradient = effective formula weight; drop = ΔL × weight × 100
      const weight = effectiveWeights[key] ?? cfg.weight;
      const scoreDropIfImproved = Math.round(actualImprovement * weight * 100 * 10) / 10;
      const percentOfTotalRisk = Math.round((rawScore * weight * 100 / Math.max(1, currentScore)) * 100);

      return {
        dimension: key,
        dimensionLabel: cfg.label,
        currentScore: displayScore,
        improvementTarget,
        scoreDropIfImproved,
        percentOfTotalRisk,
        fastestAction: cfg.fastestAction(displayScore, ctx),
        actionTimeframe: cfg.actionTimeframe(displayScore, ctx),
        feasibility: cfg.feasibility(displayScore),
        confidenceInEstimate: cfg.confidence,
      } satisfies SensitivityLever;
    })
    .filter((l): l is SensitivityLever => l !== null)
    .sort((a, b) => b.scoreDropIfImproved - a.scoreDropIfImproved);

  const highestImpactLever = levers[0];
  const quickestImpactLever = levers
    .filter(l => l.feasibility === 'immediate' || l.feasibility === 'short_term')
    .sort((a, b) => b.scoreDropIfImproved - a.scoreDropIfImproved)[0] ?? levers[0];
  const mostActionableLever = levers
    .filter(l => l.feasibility === 'immediate')
    .sort((a, b) => b.scoreDropIfImproved - a.scoreDropIfImproved)[0] ?? quickestImpactLever;

  // ── Synergy combos ─────────────────────────────────────────────────────────
  const leverMap = new Map(levers.map(l => [l.dimension, l]));
  const topSynergyCombos: SensitivityCombo[] = SYNERGY_MATRIX
    .filter(s => leverMap.has(s.pair[0]) && leverMap.has(s.pair[1]))
    .map(s => {
      const a = leverMap.get(s.pair[0])!;
      const b = leverMap.get(s.pair[1])!;
      const additive = a.scoreDropIfImproved + b.scoreDropIfImproved;
      const combined = additive + s.bonus;
      return {
        levers: s.pair,
        combinedDrop: Math.round(combined * 10) / 10,
        synergyBonus: Math.round(s.bonus * 10) / 10,
        rationale: s.rationale,
      } satisfies SensitivityCombo;
    })
    .sort((a, b) => b.combinedDrop - a.combinedDrop)
    .slice(0, 2);

  // ── Score projections ──────────────────────────────────────────────────────
  const top3Drops = levers.slice(0, 3).map(l => l.scoreDropIfImproved);
  const bestSingleLeverScore = Math.max(10, Math.round(currentScore - (top3Drops[0] ?? 0)));
  const bestTwoLeverScore = Math.max(10, Math.round(currentScore - (top3Drops[0] ?? 0) - (top3Drops[1] ?? 0)));
  const bestThreeLeverScore = Math.max(10, Math.round(currentScore - top3Drops.reduce((s, d) => s + d, 0)));

  const keySensitivityInsight = highestImpactLever
    ? `Your highest-leverage single action is improving ${highestImpactLever.dimensionLabel} (currently ${highestImpactLever.currentScore}/100) — a 25-point improvement drops your overall score by ~${highestImpactLever.scoreDropIfImproved} pts. ${highestImpactLever.fastestAction.split('.')[0]}.`
    : `Improve any dimension by 25 points to meaningfully shift your overall risk score.`;

  return {
    levers,
    highestImpactLever,
    quickestImpactLever,
    mostActionableLever,
    topSynergyCombos,
    currentScore,
    bestSingleLeverScore,
    bestTwoLeverScore,
    bestThreeLeverScore,
    keySensitivityInsight,
  };
}
