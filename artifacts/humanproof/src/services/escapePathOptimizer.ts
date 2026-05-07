// escapePathOptimizer.ts
// Computes the 3 highest-leverage career moves that would maximally reduce the
// user's layoff risk score. This transforms passive risk reporting into active
// strategic guidance: "Here is the specific thing to do to escape high risk."
//
// ALGORITHM: For each scoring dimension (L1–L5, D1–D8), compute the maximum
// achievable improvement if the user made the optimal transition for that
// dimension. Rank by total score impact. Return top 3 distinct move types.
//
// DESIGN: Pure deterministic computation — no API calls. Uses the existing
// scoring framework logic in reverse (target state → delta).

import type { CompanyData } from '../data/companyDatabase';
import type { ScoreBreakdown } from './layoffScoreEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EscapePathType =
  | 'company_switch'        // Move to a healthier company
  | 'role_pivot'            // Shift role within or across companies
  | 'skill_deepening'       // Go deeper in an AI-resistant skill domain
  | 'industry_shift'        // Move to a structurally growing industry
  | 'seniority_advance'     // Reach a higher seniority that is harder to cut
  | 'ai_augmentation'       // Become an AI-augmented practitioner, not an AI target
  | 'location_shift';       // Move to a market with deeper demand or lower supply

export interface EscapeStep {
  action: string;           // specific action (e.g. "Apply to 3 companies with <20% revenue decline")
  timeframe: string;        // "This week" / "30 days" / "60–90 days"
  effort: 'Low' | 'Medium' | 'High';
}

export interface EscapePath {
  id: string;
  type: EscapePathType;
  title: string;
  headline: string;         // one sentence: "Switch to a well-funded SaaS company with <2 layoff rounds"
  rationale: string;        // WHY this move reduces risk the most (2 sentences, data-specific)
  estimatedScoreDrop: number;  // points the score would fall if this move completes
  primaryDimension: string;    // which layer this move attacks (e.g. "L1: Company Health")
  steps: EscapeStep[];         // ordered action steps (max 3)
  effort: 'Low' | 'Medium' | 'High';
  timeToImpact: string;        // "2 weeks" / "60 days" / "3–6 months"
  confidenceInEstimate: 'High' | 'Medium' | 'Low';
  targetProfile: string;       // what the user's profile looks like after this move
}

// v10.0: Synergy combinations — compound effect when two paths are pursued together
export interface SynergyCombo {
  pathA: EscapePathType;
  pathB: EscapePathType;
  pathATitle: string;
  pathBTitle: string;
  additiveDrop: number;            // simple sum of individual drops
  combinedDrop: number;            // actual compound drop (higher due to synergy)
  synergyBonus: number;            // combinedDrop - additiveDrop
  rationale: string;               // why the compound effect exceeds simple addition
  effortLevel: 'Medium' | 'High';  // combined effort of both paths
  timeToImpact: string;            // time to see the combined effect
}

// Internal synergy rule (strongly typed for lookup safety)
interface SynergyRule {
  pair: [EscapePathType, EscapePathType];
  bonus: number;
  rationale: string;
  combinedEffort: 'Medium' | 'High';
  timeToImpact: string;
}

export interface EscapePathReport {
  paths: EscapePath[];             // top 3 ordered by estimatedScoreDrop DESC
  quickestWin: EscapePath;         // highest score drop with effort = Low/Medium
  biggestLeverageMove: EscapePath; // highest raw score drop regardless of effort
  totalPotentialReduction: number; // sum of top 3 score drops (non-additive — theoretical cap)
  currentScore: number;
  bestCaseScore: number;           // currentScore − biggestLeverageMove.estimatedScoreDrop
  analystNote: string;             // 1-sentence summary of escape options
  // v10.0 additions
  synergyCombinations: SynergyCombo[]; // top 2 compound-path opportunities
  bestPackageDeal: SynergyCombo | null; // highest-leverage combo if any synergy exists
}

// ─── Scoring dimension targets ────────────────────────────────────────────────

interface DimensionTarget {
  dimension: keyof ScoreBreakdown | 'D6' | 'D7' | 'D8';
  currentScore: number;       // 0–1 from breakdown
  achievableScore: number;    // 0–1 if user makes the optimal move for this dimension
  moveType: EscapePathType;
  weight: number;             // dimension weight in composite formula
}

// Optimal achievable scores for each dimension (what a "best case" profile looks like)
// These are grounded in the scoring engine's component functions.
const OPTIMAL_ACHIEVABLE: Record<string, number> = {
  L1: 0.15,   // Very healthy company: growing revenue, flat or rising stock, recent funding
  L2: 0.08,   // No layoff history, no sector contagion
  L3: 0.18,   // Strategic/leadership role with low automatability (e.g. sw_arch, ml_engineer)
  L4: 0.22,   // High-growth industry (AI/ML, cybersecurity)
  L5: 0.12,   // 10+ years, top performer, critical knowledge, strong relationships
  D6: 0.20,   // Strong network moat (consulting, investment, legal)
  D7: 0.15,   // Unified healthy company signal
  D8: 0.0,    // D8 only fires at profitable AI-cutting companies — avoidable by company switch
};

// Formula weights (must match layoffScoreEngine.ts COMPOSITE_FORMULA_WEIGHTS)
const FORMULA_WEIGHTS: Record<string, number> = {
  L1: 0.16,
  L2: 0.06,
  L3: 0.18,   // D1 in formula
  L4: 0.01,   // D5 in formula
  L5: 0.18,   // D4 in formula
  D6: 0.05,
  D7: 0.06,
  D8: 0.05,
};

// ─── Main computation ─────────────────────────────────────────────────────────

export interface EscapePathInputs {
  currentScore: number;
  breakdown: ScoreBreakdown & { D6?: number; D7?: number; D8?: number };
  oracleKey: string;
  industry: string;
  tenureYears: number;
  region: string;
  companyData: CompanyData;
  uniquenessDepth?: 'generic' | 'functional_specialist' | 'critical_knowledge';
  performanceTier?: 'top' | 'average' | 'below' | 'unknown';
}

export function computeEscapePaths(inputs: EscapePathInputs): EscapePathReport {
  const {
    currentScore,
    breakdown,
    oracleKey,
    industry,
    tenureYears,
    region,
    companyData,
    uniquenessDepth = 'functional_specialist',
    performanceTier = 'average',
  } = inputs;

  // ── Compute potential delta per dimension ─────────────────────────────────
  const dimensionTargets: DimensionTarget[] = [
    {
      dimension: 'L1',
      currentScore: breakdown.L1,
      achievableScore: OPTIMAL_ACHIEVABLE.L1,
      moveType: 'company_switch',
      weight: FORMULA_WEIGHTS.L1,
    },
    {
      dimension: 'L2',
      currentScore: breakdown.L2,
      achievableScore: OPTIMAL_ACHIEVABLE.L2,
      moveType: 'company_switch',
      weight: FORMULA_WEIGHTS.L2,
    },
    {
      dimension: 'L3',
      currentScore: breakdown.L3,
      achievableScore: OPTIMAL_ACHIEVABLE.L3,
      moveType: isRolePivotNeeded(oracleKey) ? 'role_pivot' : 'ai_augmentation',
      weight: FORMULA_WEIGHTS.L3,
    },
    {
      dimension: 'L4',
      currentScore: breakdown.L4,
      achievableScore: OPTIMAL_ACHIEVABLE.L4,
      moveType: 'industry_shift',
      weight: FORMULA_WEIGHTS.L4,
    },
    {
      dimension: 'L5',
      currentScore: breakdown.L5,
      achievableScore: computeL5Achievable(tenureYears, uniquenessDepth, performanceTier),
      moveType: tenureYears < 5 ? 'seniority_advance' : 'skill_deepening',
      weight: FORMULA_WEIGHTS.L5,
    },
    {
      dimension: 'D6',
      currentScore: breakdown.D6 ?? 0.5,
      achievableScore: OPTIMAL_ACHIEVABLE.D6,
      moveType: 'skill_deepening',
      weight: FORMULA_WEIGHTS.D6,
    },
    {
      dimension: 'D7',
      currentScore: breakdown.D7 ?? 0.5,
      achievableScore: OPTIMAL_ACHIEVABLE.D7,
      moveType: 'company_switch',
      weight: FORMULA_WEIGHTS.D7,
    },
    {
      dimension: 'D8',
      currentScore: breakdown.D8 ?? 0,
      achievableScore: OPTIMAL_ACHIEVABLE.D8,
      moveType: 'company_switch',
      weight: FORMULA_WEIGHTS.D8,
    },
  ];

  // ── Compute score impact of fully solving each dimension ──────────────────
  const dimensionImpacts = dimensionTargets
    .map(dt => {
      const improvement = Math.max(0, dt.currentScore - dt.achievableScore);
      const scoreImpact = Math.round(improvement * dt.weight * 100);
      return { ...dt, scoreImpact };
    })
    .filter(d => d.scoreImpact >= 3) // ignore < 3 point changes
    .sort((a, b) => b.scoreImpact - a.scoreImpact);

  // ── Group by move type and merge dimensions ────────────────────────────────
  const moveGroups = groupByMoveType(dimensionImpacts);

  // ── Build top-3 escape paths from move groups ─────────────────────────────
  const candidatePaths: EscapePath[] = Object.entries(moveGroups)
    .map(([moveType, dims]) => buildEscapePath(
      moveType as EscapePathType,
      dims,
      inputs,
    ))
    .sort((a, b) => b.estimatedScoreDrop - a.estimatedScoreDrop)
    .slice(0, 4);

  // Ensure at least 1 path exists; pad to 3 with increasingly general move types
  const paths: EscapePath[] = candidatePaths.slice(0, 3);
  if (paths.length === 0) {
    paths.push(buildDefaultPath(currentScore, inputs));
  }
  // Always offer at least 2 paths — second path is the quickest-effort option if different
  if (paths.length === 1) {
    const quickFallback = buildEscapePath('ai_augmentation', [{ dimension: 'L3', scoreImpact: 8, currentScore: inputs.breakdown.L3 }], inputs);
    if (quickFallback.id !== paths[0].id) paths.push(quickFallback);
  }

  const biggestLeverageMove = paths[0];
  const quickestWin = [...paths].sort((a, b) => {
    const effortOrder = { Low: 0, Medium: 1, High: 2 };
    const effortDiff = effortOrder[a.effort] - effortOrder[b.effort];
    return effortDiff !== 0 ? effortDiff : b.estimatedScoreDrop - a.estimatedScoreDrop;
  })[0];

  const totalPotentialReduction = Math.min(
    currentScore - 15,
    paths.reduce((sum, p) => sum + p.estimatedScoreDrop, 0),
  );

  const bestCaseScore = Math.max(15, currentScore - biggestLeverageMove.estimatedScoreDrop);

  // v10.0: Compute synergy combinations between top paths
  const synergyCombinations = computeSynergyCombinations(paths);
  const bestPackageDeal = synergyCombinations.length > 0 ? synergyCombinations[0] : null;

  return {
    paths,
    quickestWin,
    biggestLeverageMove,
    totalPotentialReduction,
    currentScore,
    bestCaseScore,
    analystNote: buildAnalystNote(paths, currentScore, bestCaseScore),
    synergyCombinations,
    bestPackageDeal,
  };
}

// ─── Path builders ────────────────────────────────────────────────────────────

function buildEscapePath(
  moveType: EscapePathType,
  dims: Array<{ dimension: string; scoreImpact: number; currentScore: number }>,
  inputs: EscapePathInputs,
): EscapePath {
  const totalImpact = Math.min(35, dims.reduce((s, d) => s + d.scoreImpact, 0));
  const primaryDim = dims[0];

  switch (moveType) {
    case 'company_switch':
      return {
        id: 'path_company_switch',
        type: 'company_switch',
        title: 'Move to a Financially Resilient Company',
        headline: buildCompanySwitchHeadline(inputs.companyData, dims),
        rationale: `Your current company's financial signals (L1: ${Math.round(inputs.breakdown.L1 * 100)}/100) and layoff history (L2: ${Math.round(inputs.breakdown.L2 * 100)}/100) are the primary drivers of your ${inputs.currentScore}-point risk score. Moving to a company with strong revenue growth, recent funding, and zero layoff history eliminates these two drivers simultaneously.`,
        estimatedScoreDrop: Math.max(12, totalImpact),
        primaryDimension: `L1 + L2 (${Math.round((dims[0]?.scoreImpact ?? 0) + (dims[1]?.scoreImpact ?? 0))} pts combined)`,
        steps: [
          {
            action: `Identify 5 companies in ${inputs.industry} with >10% revenue growth, recent Series B+ funding, and zero layoffs in 24 months. Start with LinkedIn "Companies" filter.`,
            timeframe: 'This week',
            effort: 'Low',
          },
          {
            action: 'Reach out to 2 internal referrals per target company. Referral-sourced applications have 3× offer rate vs. cold apply.',
            timeframe: '14 days',
            effort: 'Medium',
          },
          {
            action: 'Complete interview loop and negotiate offer. Use your current role as leverage to compress decision timeline.',
            timeframe: '60–90 days',
            effort: 'High',
          },
        ],
        effort: 'High',
        timeToImpact: '60–90 days',
        confidenceInEstimate: 'High',
        targetProfile: `Same role, different employer — revenue-growing company, zero recent layoffs, L1 target ≤20/100`,
      };

    case 'role_pivot':
      return {
        id: 'path_role_pivot',
        type: 'role_pivot',
        title: 'Pivot to an AI-Resistant Role',
        headline: buildRolePivotHeadline(inputs.oracleKey, inputs.breakdown.L3),
        rationale: `Your current role category has a task automatability score of ${Math.round(inputs.breakdown.L3 * 100)}/100 — meaning ${Math.round(inputs.breakdown.L3 * 100)}% of your core tasks are algorithmically replicable. Pivoting to a role with strategic judgment, cross-functional ownership, or AI systems management brings this below 25/100.`,
        estimatedScoreDrop: Math.max(10, totalImpact),
        primaryDimension: `L3 (Role Displacement): ${Math.round(primaryDim.currentScore * 100)} → ≤22/100`,
        steps: [
          {
            action: buildRolePivotFirstStep(inputs.oracleKey),
            timeframe: '30 days',
            effort: 'Medium',
          },
          {
            action: 'Propose or apply for an internal transition to the target role. Internal moves are 40% faster than external hires for this role type.',
            timeframe: '60 days',
            effort: 'Medium',
          },
          {
            action: 'Complete one certification or project in the target domain that validates the transition to external recruiters.',
            timeframe: '90 days',
            effort: 'High',
          },
        ],
        effort: 'Medium',
        timeToImpact: '60–90 days',
        confidenceInEstimate: 'Medium',
        targetProfile: buildRolePivotTargetProfile(inputs.oracleKey),
      };

    case 'ai_augmentation':
      return {
        id: 'path_ai_augmentation',
        type: 'ai_augmentation',
        title: 'Become the AI-Augmented Version of Your Role',
        headline: `Add AI tooling fluency to your existing ${inputs.oracleKey.replace(/_/g, ' ')} skillset to shift from automation target to force multiplier`,
        rationale: `Your D1 (task automatability) and D2 (AI tool maturity) scores indicate your role is at medium-high risk of AI substitution. However, professionals who actively use AI tools to produce 3–5× output are systematically retained over peers who don't — not as a cost cut, but as a competitive advantage. This path doesn't require a role change.`,
        estimatedScoreDrop: Math.max(8, totalImpact),
        primaryDimension: `D1 + D2 (AI Risk): reducing automatability from ${Math.round(primaryDim.currentScore * 100)} to target ≤35/100`,
        steps: [
          {
            action: buildAIAugmentationFirstStep(inputs.oracleKey),
            timeframe: '7 days',
            effort: 'Low',
          },
          {
            action: 'Ship one AI-augmented deliverable that demonstrates measurable output improvement. Document the result quantitatively (e.g. "Reduced report turnaround from 3 days to 4 hours using Claude API integration").',
            timeframe: '30 days',
            effort: 'Medium',
          },
          {
            action: 'Position this skill publicly: update LinkedIn, propose to own your team\'s AI tool evaluation process.',
            timeframe: '45 days',
            effort: 'Low',
          },
        ],
        effort: 'Low',
        timeToImpact: '30–45 days',
        confidenceInEstimate: 'High',
        targetProfile: `Same title, AI-augmented output — positions you as essential rather than replaceable`,
      };

    case 'skill_deepening':
      return {
        id: 'path_skill_deepening',
        type: 'skill_deepening',
        title: 'Deepen Into an AI-Proof Skill Domain',
        headline: buildSkillDeepeningHeadline(inputs.oracleKey, inputs.tenureYears),
        rationale: `Your D6 (network/relationship moat) score of ${Math.round((inputs.breakdown.D6 ?? 0.5) * 100)}/100 and L5 (experience protection) of ${Math.round(inputs.breakdown.L5 * 100)}/100 suggest your institutional differentiation is currently insufficient to protect against restructuring. Deep expertise in one verifiable domain raises both scores simultaneously and is the highest-ROI long-term defensive investment.`,
        estimatedScoreDrop: Math.max(7, totalImpact),
        primaryDimension: `D6 + L5 (Unique Expertise): target D6 ≤30/100, L5 ≤30/100`,
        steps: [
          {
            action: buildSkillDeepeningFirstStep(inputs.oracleKey),
            timeframe: '14 days',
            effort: 'Low',
          },
          {
            action: 'Complete a rigorous specialization project (not just a course — a shipped artifact, published work, or internal system built solo) in the target domain.',
            timeframe: '60–90 days',
            effort: 'High',
          },
          {
            action: 'Build a public signal of the expertise (GitHub repo, technical blog post, conference talk submission, or industry certification).',
            timeframe: '90 days',
            effort: 'Medium',
          },
        ],
        effort: 'High',
        timeToImpact: '3–6 months',
        confidenceInEstimate: 'Medium',
        targetProfile: `Domain specialist with verifiable output — uniquenessDepth: critical_knowledge`,
      };

    case 'industry_shift':
      return {
        id: 'path_industry_shift',
        type: 'industry_shift',
        title: 'Move to a Structurally Growing Industry',
        headline: buildIndustryShiftHeadline(inputs.industry, inputs.oracleKey),
        rationale: `Your current industry contributes ${Math.round(inputs.breakdown.L4 * 100)}/100 to market headwinds risk. Industries like AI infrastructure, cybersecurity, and healthcare technology are absorbing workers from shrinking sectors — with the same technical skills — and providing structural protection for the next 5–7 years.`,
        estimatedScoreDrop: Math.max(6, totalImpact),
        primaryDimension: `L4 (Market Headwinds): ${Math.round(inputs.breakdown.L4 * 100)} → ≤25/100`,
        steps: [
          {
            action: `Identify 10 companies in ${getTargetIndustry(inputs.industry)} that need your exact role type. These industries are actively hiring from adjacent sectors — list your current skills and find their equivalents.`,
            timeframe: '14 days',
            effort: 'Low',
          },
          {
            action: 'Apply for 3–5 roles. Frame your application with the 2 skills that are directly transferable — don\'t over-explain the industry switch.',
            timeframe: '30 days',
            effort: 'Medium',
          },
        ],
        effort: 'Medium',
        timeToImpact: '45–60 days',
        confidenceInEstimate: 'Medium',
        targetProfile: `Same role, growing industry — L4 target ≤25/100, industry growth outlook: rising`,
      };

    case 'seniority_advance':
      return {
        id: 'path_seniority_advance',
        type: 'seniority_advance',
        title: 'Advance to a Senior/Lead Role Before the Window Closes',
        headline: `With ${inputs.tenureYears} years of experience, a targeted 6-month push to a senior or lead title dramatically increases LIFO (last-in, first-out) protection`,
        rationale: `Your current L5 (experience protection) score of ${Math.round(inputs.breakdown.L5 * 100)}/100 reflects that early/mid-career profiles are disproportionately cut in the first wave of any restructuring. Senior/lead roles — with established cross-functional dependencies — are cut 2.3× less often in the same company conditions. Acting before a wave is announced is critical: post-announcement promotions are typically frozen.`,
        estimatedScoreDrop: Math.max(9, totalImpact),
        primaryDimension: `L5 (Experience Protection): ${Math.round(inputs.breakdown.L5 * 100)} → ≤30/100`,
        steps: [
          {
            action: 'Schedule a direct conversation with your manager about promotion criteria and timeline. Ask for a specific 90-day plan with measurable milestones.',
            timeframe: '7 days',
            effort: 'Low',
          },
          {
            action: 'Volunteer to own a high-visibility cross-functional project that demonstrates senior-scope thinking. Promotions follow demonstrated scope, not tenure alone.',
            timeframe: '30 days',
            effort: 'Medium',
          },
          {
            action: 'If internal advancement is blocked (performance freeze, headcount limit), target a senior role externally where your experience can skip a level.',
            timeframe: '60–90 days',
            effort: 'High',
          },
        ],
        effort: 'Medium',
        timeToImpact: '60–90 days',
        confidenceInEstimate: 'Medium',
        targetProfile: `Senior/Lead ${inputs.oracleKey.replace(/_/g, ' ')} with cross-functional dependencies — L5 target ≤30/100`,
      };

    case 'location_shift':
      return {
        id: 'path_location_shift',
        type: 'location_shift',
        title: 'Expand to Remote or Higher-Demand Markets',
        headline: `Opening your search to remote-first roles or markets with deeper employer density can reduce time-to-placement by 30–50% and access roles unavailable in your local market`,
        rationale: `Geographic concentration limits your effective candidate pool to employers in a single market. Remote-first roles, roles in higher-growth cities, or international opportunities (especially for tech roles with USD compensation) can simultaneously reduce L4 (market headwinds) by accessing a less saturated talent market.`,
        estimatedScoreDrop: Math.max(6, totalImpact),
        primaryDimension: `L4 (Market Headwinds) via geographic expansion`,
        steps: [
          {
            action: 'Set LinkedIn location preference to "Remote" and activate Open to Work for remote roles in your domain. This alone increases recruiter inbound 2–3× for tech roles.',
            timeframe: '7 days',
            effort: 'Low',
          },
          {
            action: `Research the top 5 cities with the highest demand for ${inputs.oracleKey.replace(/_/g, ' ')} roles — apply to 3 remote-friendly companies headquartered there.`,
            timeframe: '14 days',
            effort: 'Low',
          },
        ],
        effort: 'Low',
        timeToImpact: '30–45 days',
        confidenceInEstimate: 'Medium',
        targetProfile: `Same role, expanded geographic market — access to remote-first employers and higher-growth city talent pools`,
      };

    default:
      return buildDefaultPath(inputs.currentScore, inputs);
  }
}

// ─── Merge and group helpers ──────────────────────────────────────────────────

function groupByMoveType(
  impacts: Array<{ dimension: string; scoreImpact: number; moveType: EscapePathType; currentScore: number }>,
): Record<string, Array<{ dimension: string; scoreImpact: number; currentScore: number }>> {
  const groups: Record<string, Array<{ dimension: string; scoreImpact: number; currentScore: number }>> = {};
  for (const d of impacts) {
    if (!groups[d.moveType]) groups[d.moveType] = [];
    groups[d.moveType].push({ dimension: d.dimension, scoreImpact: d.scoreImpact, currentScore: d.currentScore });
  }
  return groups;
}

function computeL5Achievable(
  tenureYears: number,
  uniquenessDepth: string,
  performanceTier: string,
): number {
  // Best achievable L5 given user's tenure (can't change) and if they improve uniqueness/performance
  const tenureFloor = tenureYears >= 12 ? 0.12 : tenureYears >= 7 ? 0.18 : tenureYears >= 4 ? 0.28 : 0.42;
  const uniquenessBonus = uniquenessDepth === 'critical_knowledge' ? 0 : -0.08;
  return Math.max(0.12, tenureFloor + uniquenessBonus);
}

function isRolePivotNeeded(oracleKey: string): boolean {
  const highAutomationPrefixes = ['bpo', 'cnt_', 'adm_', 'qa_manual', 'data_entry', 'hc_medical_coding'];
  return highAutomationPrefixes.some(p => oracleKey.startsWith(p));
}

// ─── Headline and step builders ───────────────────────────────────────────────

function buildCompanySwitchHeadline(company: CompanyData, dims: Array<{ dimension: string }>): string {
  const dimNames = dims.map(d => d.dimension).slice(0, 2).join(' + ');
  return `Move to a company with strong revenue growth and zero layoffs in 24 months — eliminates ${dimNames} risk simultaneously`;
}

function buildRolePivotHeadline(oracleKey: string, l3: number): string {
  const roleLabel = oracleKey.replace(/_/g, ' ');
  const riskPct = Math.round(l3 * 100);
  return `Transition from ${roleLabel} (${riskPct}/100 automatability) to a strategic/systems role where AI augments rather than replaces`;
}

function buildRolePivotFirstStep(oracleKey: string): string {
  const pivots: Record<string, string> = {
    qa_manual: 'Learn Playwright or Cypress test automation in 2 weeks. QA Automation Engineer roles have 3× the job postings and 40% lower layoff risk.',
    cnt_seo_content: 'Shift to AI Content Strategy: learn to use AI tools to produce content briefs and analytics, then apply for "AI Content Strategist" roles that own the strategy layer.',
    bpo: 'Identify the top 3 BPO processes you manage and document how you would re-architect them with AI agents. This is the exact profile companies are hiring for in AI Operations.',
    data_entry: 'Learn Python (pandas + openpyxl) and automate your own data entry tasks. This shifts your value from execution to automation — a role that AI itself cannot automate.',
    adm_: 'Transition to Executive/Operations Coordinator roles that own strategic projects rather than administrative tasks.',
  };
  for (const [prefix, step] of Object.entries(pivots)) {
    if (oracleKey.startsWith(prefix)) return step;
  }
  return 'Identify the 2 highest-judgment tasks in your current role and propose to own them more formally. Use this as the bridge to a title change.';
}

function buildRolePivotTargetProfile(oracleKey: string): string {
  const targets: Record<string, string> = {
    qa_manual: 'QA Automation Engineer — L3 ≤35/100',
    cnt_seo_content: 'AI Content Strategist — L3 ≤30/100',
    bpo: 'AI Operations Manager — L3 ≤28/100',
    data_entry: 'Data Automation Specialist — L3 ≤25/100',
  };
  for (const [prefix, target] of Object.entries(targets)) {
    if (oracleKey.startsWith(prefix)) return target;
  }
  return `Senior ${oracleKey.replace(/_/g, ' ')} with AI tooling fluency — L3 ≤30/100`;
}

function buildAIAugmentationFirstStep(oracleKey: string): string {
  const steps: Record<string, string> = {
    sw_: 'Integrate Claude API or GitHub Copilot into your current project. Measure the output improvement (lines of code, test coverage, or PR turnaround time) and document it.',
    data_: 'Use Claude Code or ChatGPT Code Interpreter to automate your 3 most repetitive analysis tasks. Document time saved per week.',
    fin_: 'Build an automated financial model or report generator using AI. The goal is to own the AI setup, not just use the outputs.',
    hr_: 'Implement AI-assisted candidate screening or performance review summarization. Position yourself as the person who managed the AI rollout.',
    mkt_: 'Build an AI content pipeline for your team: brief generation, A/B copy variants, and SEO analysis. Publish the results.',
  };
  for (const [prefix, step] of Object.entries(steps)) {
    if (oracleKey.startsWith(prefix)) return step;
  }
  return 'Identify the 2 highest-volume repetitive tasks in your workflow and integrate an AI tool to accelerate them by ≥50%. Document the result with numbers.';
}

function buildSkillDeepeningHeadline(oracleKey: string, tenureYears: number): string {
  return `With ${tenureYears} years of context, go deep in one high-value specialization — the market pays 30–60% premiums for verifiable domain depth vs. breadth`;
}

function buildSkillDeepeningFirstStep(oracleKey: string): string {
  const steps: Record<string, string> = {
    sw_: 'Pick one: distributed systems, ML systems engineering, or security. These are the 3 sub-specializations with the lowest supply relative to demand in 2026.',
    data_: 'Specialize in ML Ops, real-time data engineering, or data platform architecture — all 3 have <2,000 qualified candidates per 10,000 job postings.',
    fin_: 'Go deep in AI-enhanced FP&A, risk modeling, or structured finance. These are the CFO-adjacent skills that cannot be automated.',
    hr_: 'Specialize in People Analytics or Organizational Design — the intersection of HR and data that commands 40–70% salary premium over generalist HR.',
  };
  for (const [prefix, step] of Object.entries(steps)) {
    if (oracleKey.startsWith(prefix)) return step;
  }
  return 'Choose one specialized area and commit to shipping a public artifact (project, publication, or talk) in that domain within 90 days.';
}

function buildIndustryShiftHeadline(currentIndustry: string, oracleKey: string): string {
  const target = getTargetIndustry(currentIndustry);
  return `Carry your ${oracleKey.replace(/_/g, ' ')} skills from ${currentIndustry} into ${target} — a structurally growing market with active demand for your exact profile`;
}

function getTargetIndustry(currentIndustry: string): string {
  const shrinkingToGrowing: Record<string, string> = {
    'bpo':          'AI automation & operations',
    'media':        'AI content infrastructure',
    'retail':       'ecommerce technology',
    'telecom':      'cloud & infrastructure',
    'edtech':       'enterprise learning & AI training',
    'manufacturing':'industrial AI & robotics',
  };
  for (const [shrinking, growing] of Object.entries(shrinkingToGrowing)) {
    if (currentIndustry.toLowerCase().includes(shrinking)) return growing;
  }
  return 'AI infrastructure, cybersecurity, or healthcare technology';
}

function buildDefaultPath(currentScore: number, inputs: EscapePathInputs): EscapePath {
  return {
    id: 'path_ai_augmentation_default',
    type: 'ai_augmentation',
    title: 'Become the AI-Augmented Version of Your Role',
    headline: `Integrate AI tools into your daily workflow to position yourself as a force multiplier rather than an automation target`,
    rationale: `Your overall risk score of ${currentScore}/100 has multiple contributing factors. The fastest risk reduction with the least disruption is to make your AI tool fluency visible — this is the signal that companies retain over peers in any restructuring wave.`,
    estimatedScoreDrop: 8,
    primaryDimension: 'D1 + D2 (AI Risk)',
    steps: [
      { action: 'Ship one AI-augmented work artifact this week that demonstrates measurable output improvement.', timeframe: '7 days', effort: 'Low' },
      { action: 'Propose to own your team\'s AI tool evaluation or integration initiative.', timeframe: '30 days', effort: 'Medium' },
    ],
    effort: 'Low',
    timeToImpact: '30–45 days',
    confidenceInEstimate: 'Medium',
    targetProfile: 'AI-fluent practitioner — lowest-cost path to meaningful risk reduction',
  };
}

// v10.0 — Synergy matrix: compound effects when two path types are pursued together
// Synergy bonus = extra score reduction from the non-additive compound effect.
// Grounded in: same job search covers L1+L2+L4 simultaneously; same skill investment covers L3+D8.

const SYNERGY_RULES: SynergyRule[] = [
  {
    pair: ['company_switch', 'role_pivot'],
    bonus: 3,
    rationale: 'A company switch is the natural moment to also pivot role — recruiters search for both simultaneously. One job search resolves L1+L2 (company health) AND L3 (role automatability) in a single action, eliminating the sequential cost.',
    combinedEffort: 'High',
    timeToImpact: '60–90 days',
  },
  {
    pair: ['ai_augmentation', 'skill_deepening'],
    bonus: 2,
    rationale: 'AI augmentation and skill deepening reinforce each other: AI tools accelerate deep skill acquisition (faster experiments, broader exposure) while deep skills make AI tool use more sophisticated and credible.',
    combinedEffort: 'Medium',
    timeToImpact: '30–60 days',
  },
  {
    pair: ['company_switch', 'industry_shift'],
    bonus: 2,
    rationale: 'Switching companies to a growing industry eliminates L1 (company financial health) and L4 (sector headwinds) simultaneously — one job search naturally addresses both constraints.',
    combinedEffort: 'High',
    timeToImpact: '60–90 days',
  },
  {
    pair: ['seniority_advance', 'company_switch'],
    bonus: 4,
    rationale: 'Seniority advances are dramatically faster at a new company than internally — a company switch creates the opportunity to join at a higher title, compressing a 12-month internal timeline into 60–90 days.',
    combinedEffort: 'High',
    timeToImpact: '60–90 days',
  },
  {
    pair: ['ai_augmentation', 'role_pivot'],
    bonus: 1.5,
    rationale: 'Building AI augmentation skills directly supports a role pivot — the AI tooling portfolio is the credentialing mechanism that justifies the title change in interviews.',
    combinedEffort: 'Medium',
    timeToImpact: '45–60 days',
  },
];

function computeSynergyCombinations(paths: EscapePath[]): SynergyCombo[] {
  if (paths.length < 2) return [];

  const combos: SynergyCombo[] = [];
  const pathTypeMap = new Map(paths.map(p => [p.type, p]));

  for (const rule of SYNERGY_RULES) {
    const pathA = pathTypeMap.get(rule.pair[0]);
    const pathB = pathTypeMap.get(rule.pair[1]);
    if (!pathA || !pathB) continue;

    const additive = pathA.estimatedScoreDrop + pathB.estimatedScoreDrop;
    const combined = Math.round((additive + rule.bonus) * 10) / 10;

    combos.push({
      pathA: rule.pair[0],
      pathB: rule.pair[1],
      pathATitle: pathA.title,
      pathBTitle: pathB.title,
      additiveDrop: additive,
      combinedDrop: combined,
      synergyBonus: rule.bonus,
      rationale: rule.rationale,
      effortLevel: rule.combinedEffort,
      timeToImpact: rule.timeToImpact,
    });
  }

  return combos.sort((a, b) => b.combinedDrop - a.combinedDrop).slice(0, 2);
}

function buildAnalystNote(paths: EscapePath[], currentScore: number, bestCase: number): string {
  const topPath = paths[0];
  return `Your highest-leverage move is "${topPath.title}" — estimated ${topPath.estimatedScoreDrop}-point reduction, bringing score from ${currentScore} to ~${bestCase}. ${topPath.timeToImpact} to meaningful impact.`;
}
