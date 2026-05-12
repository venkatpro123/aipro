// skillPortfolioFitEngine.ts — Layer 30
// v14.0 Intelligence Upgrade
//
// Scores the user's declared skill portfolio against current market demand.
// Identifies declining skills, emerging gaps, and calculates resume-market fit.
//
// This engine transforms D1 from a role-level automatability lookup into a
// skill-level differentiated signal: two engineers in the same role with
// different skill sets have fundamentally different risk profiles.
//
// Key insight: A Python/LLM engineer at Meta has very different displacement
// risk than a Java/COBOL engineer at Meta. D1 could not distinguish these.
// This engine provides the skill-level granularity D1 lacks.
//
// Calibration: skill demand data from Levels.fyi, LinkedIn Q1 2026,
//              Stack Overflow Developer Survey 2025, NASSCOM skills report 2026.

export type SkillDemandTrend = 'SURGING' | 'GROWING' | 'STABLE' | 'DECLINING' | 'OBSOLETE';

export interface SkillSignal {
  skill: string;
  demandScore: number;         // 0–100, current market demand
  trend: SkillDemandTrend;
  halfLifeYears: number;        // estimated years until < 50% demand
  automatabilityRisk: number;  // 0–1, AI displacement risk for this specific skill
  demandIn3Months: number;     // projected demand score 3mo forward
  demandIn12Months: number;    // projected demand score 12mo forward
  demandIn36Months: number;    // projected demand score 36mo forward
  marketInsight: string;       // 1-line market context
}

export interface SkillPortfolioFitResult {
  fitScore: number;              // 0–100 overall portfolio-market fit
  portfolioStrengthTier: 'ELITE' | 'STRONG' | 'ADEQUATE' | 'WEAK' | 'VULNERABLE';

  // Skill categorization
  surgingSkills: SkillSignal[];   // user has skills in high-growth demand
  stableSkills: SkillSignal[];    // solid baseline skills
  decliningSkills: SkillSignal[]; // user's skills losing market share
  missingHighValueSkills: string[]; // skills user should acquire

  // Differentiation from role-level D1
  portfolioVsRoleDelta: number;   // pts difference from role-level D1 (+ = better than role avg)
  d1AdjustedScore: number;        // portfolio-adjusted D1 score (replaces generic lookup)

  // Forward-looking
  skillDecayRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  primaryDecayThreat: string;     // main skill being displaced
  retoolPriority: string[];       // ordered list of skills to learn next

  // Insight strings
  portfolioInsight: string;
  fitRationale: string;

  calibrationStatus: 'market_data_2026q1';
}

// ─── Skill Demand Database ────────────────────────────────────────────────────
// Source: LinkedIn Skills Insights Q1 2026, Stack Overflow Survey 2025,
//         NASSCOM India Skills Report 2026, Coursera Global Skills Report 2025.
// Format: { demand: 0-100, trend, halfLife: years, autoRisk: 0-1 }
const SKILL_SIGNALS: Record<string, Omit<SkillSignal, 'skill' | 'demandIn3Months' | 'demandIn12Months' | 'demandIn36Months' | 'marketInsight'>> = {
  // ── AI/ML Core ────────────────────────────────────────────────────────────
  'python':               { demandScore: 92, trend: 'SURGING',  halfLifeYears: 6.0, automatabilityRisk: 0.25 },
  'llm':                  { demandScore: 95, trend: 'SURGING',  halfLifeYears: 4.0, automatabilityRisk: 0.15 },
  'langchain':            { demandScore: 82, trend: 'SURGING',  halfLifeYears: 2.5, automatabilityRisk: 0.20 },
  'pytorch':              { demandScore: 88, trend: 'SURGING',  halfLifeYears: 3.5, automatabilityRisk: 0.18 },
  'tensorflow':           { demandScore: 75, trend: 'STABLE',   halfLifeYears: 3.0, automatabilityRisk: 0.20 },
  'machine learning':     { demandScore: 90, trend: 'GROWING',  halfLifeYears: 5.0, automatabilityRisk: 0.18 },
  'prompt engineering':   { demandScore: 78, trend: 'SURGING',  halfLifeYears: 1.5, automatabilityRisk: 0.30 },
  'rag':                  { demandScore: 85, trend: 'SURGING',  halfLifeYears: 2.5, automatabilityRisk: 0.15 },
  'fine-tuning':          { demandScore: 80, trend: 'SURGING',  halfLifeYears: 3.0, automatabilityRisk: 0.18 },
  'mlops':                { demandScore: 82, trend: 'SURGING',  halfLifeYears: 4.0, automatabilityRisk: 0.22 },
  'hugging face':         { demandScore: 80, trend: 'GROWING',  halfLifeYears: 3.0, automatabilityRisk: 0.18 },

  // ── Software Engineering ──────────────────────────────────────────────────
  'typescript':           { demandScore: 88, trend: 'GROWING',  halfLifeYears: 5.0, automatabilityRisk: 0.35 },
  'javascript':           { demandScore: 84, trend: 'STABLE',   halfLifeYears: 4.5, automatabilityRisk: 0.40 },
  'react':                { demandScore: 85, trend: 'STABLE',   halfLifeYears: 3.5, automatabilityRisk: 0.38 },
  'node.js':              { demandScore: 78, trend: 'STABLE',   halfLifeYears: 3.0, automatabilityRisk: 0.40 },
  'golang':               { demandScore: 80, trend: 'GROWING',  halfLifeYears: 5.5, automatabilityRisk: 0.32 },
  'rust':                 { demandScore: 76, trend: 'SURGING',  halfLifeYears: 7.0, automatabilityRisk: 0.28 },
  'java':                 { demandScore: 72, trend: 'STABLE',   halfLifeYears: 4.0, automatabilityRisk: 0.42 },
  'spring boot':          { demandScore: 68, trend: 'STABLE',   halfLifeYears: 3.5, automatabilityRisk: 0.45 },
  'kubernetes':           { demandScore: 83, trend: 'GROWING',  halfLifeYears: 5.0, automatabilityRisk: 0.30 },
  'docker':               { demandScore: 85, trend: 'STABLE',   halfLifeYears: 4.5, automatabilityRisk: 0.32 },
  'terraform':            { demandScore: 80, trend: 'GROWING',  halfLifeYears: 5.0, automatabilityRisk: 0.28 },
  'aws':                  { demandScore: 88, trend: 'GROWING',  halfLifeYears: 6.0, automatabilityRisk: 0.28 },
  'azure':                { demandScore: 82, trend: 'GROWING',  halfLifeYears: 5.5, automatabilityRisk: 0.30 },
  'gcp':                  { demandScore: 78, trend: 'GROWING',  halfLifeYears: 5.5, automatabilityRisk: 0.30 },

  // ── Data & Analytics ────────────────────────────────────────────────────
  'sql':                  { demandScore: 80, trend: 'STABLE',   halfLifeYears: 5.0, automatabilityRisk: 0.55 },
  'dbt':                  { demandScore: 78, trend: 'GROWING',  halfLifeYears: 4.0, automatabilityRisk: 0.35 },
  'spark':                { demandScore: 72, trend: 'STABLE',   halfLifeYears: 4.0, automatabilityRisk: 0.38 },
  'data engineering':     { demandScore: 82, trend: 'GROWING',  halfLifeYears: 4.5, automatabilityRisk: 0.32 },
  'tableau':              { demandScore: 65, trend: 'DECLINING', halfLifeYears: 2.5, automatabilityRisk: 0.65 },
  'power bi':             { demandScore: 70, trend: 'STABLE',   halfLifeYears: 3.5, automatabilityRisk: 0.60 },

  // ── Security ──────────────────────────────────────────────────────────
  'cybersecurity':        { demandScore: 88, trend: 'SURGING',  halfLifeYears: 6.0, automatabilityRisk: 0.20 },
  'soc':                  { demandScore: 80, trend: 'GROWING',  halfLifeYears: 5.0, automatabilityRisk: 0.30 },
  'cloud security':       { demandScore: 85, trend: 'SURGING',  halfLifeYears: 6.0, automatabilityRisk: 0.22 },
  'zero trust':           { demandScore: 82, trend: 'SURGING',  halfLifeYears: 5.5, automatabilityRisk: 0.20 },

  // ── Legacy / Declining ─────────────────────────────────────────────────
  'cobol':                { demandScore: 30, trend: 'DECLINING', halfLifeYears: 2.0, automatabilityRisk: 0.80 },
  'perl':                 { demandScore: 25, trend: 'OBSOLETE',  halfLifeYears: 1.5, automatabilityRisk: 0.85 },
  'visual basic':         { demandScore: 22, trend: 'OBSOLETE',  halfLifeYears: 1.2, automatabilityRisk: 0.88 },
  'mainframe':            { demandScore: 28, trend: 'DECLINING', halfLifeYears: 1.8, automatabilityRisk: 0.82 },
  'sap legacy':           { demandScore: 40, trend: 'DECLINING', halfLifeYears: 2.5, automatabilityRisk: 0.72 },
  'oracle forms':         { demandScore: 22, trend: 'OBSOLETE',  halfLifeYears: 1.0, automatabilityRisk: 0.90 },

  // ── BPO / Admin ─────────────────────────────────────────────────────────
  'data entry':           { demandScore: 30, trend: 'DECLINING', halfLifeYears: 1.5, automatabilityRisk: 0.92 },
  'manual testing':       { demandScore: 38, trend: 'DECLINING', halfLifeYears: 2.0, automatabilityRisk: 0.85 },
  'content moderation':   { demandScore: 42, trend: 'DECLINING', halfLifeYears: 2.5, automatabilityRisk: 0.80 },

  // ── Finance ─────────────────────────────────────────────────────────────
  'financial modeling':   { demandScore: 75, trend: 'STABLE',   halfLifeYears: 3.5, automatabilityRisk: 0.50 },
  'excel':                { demandScore: 68, trend: 'DECLINING', halfLifeYears: 2.5, automatabilityRisk: 0.72 },
  'python finance':       { demandScore: 82, trend: 'GROWING',  halfLifeYears: 5.0, automatabilityRisk: 0.30 },

  // ── Emerging High-Value ───────────────────────────────────────────────
  'ai safety':            { demandScore: 78, trend: 'SURGING',  halfLifeYears: 8.0, automatabilityRisk: 0.10 },
  'ai governance':        { demandScore: 75, trend: 'SURGING',  halfLifeYears: 7.0, automatabilityRisk: 0.12 },
  'platform engineering': { demandScore: 84, trend: 'SURGING',  halfLifeYears: 6.0, automatabilityRisk: 0.25 },
  'observability':        { demandScore: 80, trend: 'GROWING',  halfLifeYears: 5.5, automatabilityRisk: 0.28 },
  'vector database':      { demandScore: 82, trend: 'SURGING',  halfLifeYears: 3.0, automatabilityRisk: 0.20 },
  'agent framework':      { demandScore: 88, trend: 'SURGING',  halfLifeYears: 3.5, automatabilityRisk: 0.18 },
};

// Trend growth rates for forward projection (demand change per quarter)
const TREND_QUARTERLY_DELTA: Record<SkillDemandTrend, number> = {
  SURGING:   +4.5,
  GROWING:   +2.0,
  STABLE:    +0.2,
  DECLINING: -3.5,
  OBSOLETE:  -6.0,
};

const MARKET_INSIGHTS: Record<SkillDemandTrend, string> = {
  SURGING:   'Demand growing rapidly — 90th percentile of market signal strength.',
  GROWING:   'Solid upward trajectory — demand growing steadily in this market.',
  STABLE:    'Steady demand — reliable foundation but limited differentiation.',
  DECLINING: 'Market share shrinking — AI tools are partially replacing this skill.',
  OBSOLETE:  'Near-sunset — less than 2-year market relevance; transition urgently.',
};

// ─── High-value missing skills by role type ───────────────────────────────────
const MISSING_SKILLS_BY_ROLE: Record<string, string[]> = {
  sw:    ['llm', 'agent framework', 'vector database', 'platform engineering'],
  ml:    ['mlops', 'rag', 'fine-tuning', 'ai safety', 'observability'],
  data:  ['dbt', 'python', 'data engineering', 'mlops'],
  fin:   ['python finance', 'sql', 'financial modeling', 'risk modeling'],
  bpo:   ['python', 'rpa', 'process automation', 'sql'],
  sec:   ['cloud security', 'zero trust', 'ai governance', 'soc'],
  _default: ['python', 'llm', 'cloud computing', 'data analysis'],
};

function normalizeSkillKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/[^a-z0-9 .-]/g, '');
}

function projectDemand(current: number, trend: SkillDemandTrend, quarters: number): number {
  const delta = TREND_QUARTERLY_DELTA[trend] * quarters;
  return Math.max(0, Math.min(100, Math.round(current + delta)));
}

function enrichSkillSignal(rawKey: string): SkillSignal | null {
  const key = normalizeSkillKey(rawKey);
  const base = SKILL_SIGNALS[key];
  if (!base) return null;

  return {
    skill: rawKey,
    ...base,
    demandIn3Months:  projectDemand(base.demandScore, base.trend, 1),
    demandIn12Months: projectDemand(base.demandScore, base.trend, 4),
    demandIn36Months: projectDemand(base.demandScore, base.trend, 12),
    marketInsight: MARKET_INSIGHTS[base.trend],
  };
}

function getRolePrefix(workTypeKey: string): string {
  const prefix = workTypeKey.split('_')[0];
  return ['sw', 'ml', 'data', 'ds', 'fin', 'bpo', 'sec'].includes(prefix) ? prefix : '_default';
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export interface SkillPortfolioInput {
  userSkills: string[];      // user's declared skills (e.g. ["Python", "React", "SQL"])
  workTypeKey: string;
  experience: string;
  roleD1Score: number;       // current role-level D1 score (to compute delta)
}

export function computeSkillPortfolioFit(
  input: SkillPortfolioInput,
): SkillPortfolioFitResult {
  try {
    const { userSkills, workTypeKey, experience, roleD1Score } = input;

    if (!userSkills || userSkills.length === 0) {
      return buildFallback(roleD1Score, workTypeKey);
    }

    const resolved: SkillSignal[] = [];
    const unresolved: string[] = [];

    for (const skill of userSkills) {
      const signal = enrichSkillSignal(skill);
      if (signal) resolved.push(signal);
      else unresolved.push(skill);
    }

    const surging    = resolved.filter(s => s.trend === 'SURGING');
    const growing    = resolved.filter(s => s.trend === 'GROWING');
    const stable     = resolved.filter(s => s.trend === 'STABLE');
    const declining  = resolved.filter(s => s.trend === 'DECLINING' || s.trend === 'OBSOLETE');

    // Portfolio fit: weighted average demand score, penalizing declining skills
    let fitScore = 50; // default if nothing resolved
    if (resolved.length > 0) {
      const weightedDemand = resolved.reduce((sum, s) => {
        const trendMultiplier = s.trend === 'SURGING' ? 1.20
          : s.trend === 'GROWING' ? 1.08
          : s.trend === 'STABLE' ? 1.00
          : s.trend === 'DECLINING' ? 0.75
          : 0.50; // OBSOLETE
        return sum + s.demandScore * trendMultiplier;
      }, 0) / resolved.length;

      // Apply coverage bonus: more resolved skills = higher confidence
      const coverageBonus = Math.min(10, resolved.length * 1.5);
      fitScore = Math.min(100, Math.round(weightedDemand * 0.85 + coverageBonus));
    }

    // Portfolio strength tier
    const tier: SkillPortfolioFitResult['portfolioStrengthTier'] =
      fitScore >= 82 ? 'ELITE'
      : fitScore >= 68 ? 'STRONG'
      : fitScore >= 52 ? 'ADEQUATE'
      : fitScore >= 38 ? 'WEAK'
      : 'VULNERABLE';

    // D1 adjustment: portfolio fit vs. role-level D1
    // Better portfolio = lower automatability risk (negative delta = good)
    const portfolioAutomatabilityScore = resolved.length > 0
      ? Math.round(resolved.reduce((sum, s) => sum + s.automatabilityRisk * 100, 0) / resolved.length)
      : roleD1Score;
    const portfolioVsRoleDelta = portfolioAutomatabilityScore - roleD1Score;
    const d1AdjustedScore = Math.max(5, Math.min(100, portfolioAutomatabilityScore));

    // Skill decay risk
    const decayingCount = declining.length;
    const skillDecayRisk: SkillPortfolioFitResult['skillDecayRisk'] =
      decayingCount >= 3 ? 'HIGH'
      : decayingCount >= 1 ? 'MEDIUM'
      : 'LOW';

    const primaryDecayThreat = declining.length > 0
      ? declining.sort((a, b) => a.halfLifeYears - b.halfLifeYears)[0].skill
      : 'None identified';

    // Missing high-value skills
    const rolePrefix = getRolePrefix(workTypeKey);
    const targetSkills = MISSING_SKILLS_BY_ROLE[rolePrefix] ?? MISSING_SKILLS_BY_ROLE._default;
    const userSkillNormalized = new Set(userSkills.map(normalizeSkillKey));
    const missingHighValueSkills = targetSkills.filter(s => !userSkillNormalized.has(s));

    // Retool priority: combine missing high-value + skills to replace declining
    const retoolPriority = [
      ...missingHighValueSkills.slice(0, 3),
      ...declining.filter(s => s.trend === 'OBSOLETE').map(s => `Replace: ${s.skill}`),
    ].slice(0, 5);

    const portfolioInsight = surging.length > 0
      ? `${surging.length} of your skills are in surging demand (${surging.map(s => s.skill).join(', ')}).`
      : growing.length > 0
      ? `${growing.length} growing-demand skills in portfolio. Add AI/LLM skills to move into surge territory.`
      : declining.length > 0
      ? `${declining.length} of your skills are declining. Transition priority: ${primaryDecayThreat}.`
      : 'Portfolio assessed against market signal database.';

    const fitRationale = resolved.length === 0
      ? 'Skills not found in market database — role-level D1 used as proxy.'
      : `Portfolio of ${resolved.length} skills analyzed against 2026 Q1 market data. ` +
        `Surging: ${surging.length}, Stable: ${stable.length + growing.length}, Declining: ${declining.length}.`;

    return {
      fitScore,
      portfolioStrengthTier: tier,
      surgingSkills: surging,
      stableSkills: [...growing, ...stable],
      decliningSkills: declining,
      missingHighValueSkills,
      portfolioVsRoleDelta,
      d1AdjustedScore,
      skillDecayRisk,
      primaryDecayThreat,
      retoolPriority,
      portfolioInsight,
      fitRationale,
      calibrationStatus: 'market_data_2026q1',
    };
  } catch {
    return buildFallback(input.roleD1Score, input.workTypeKey);
  }
}

function buildFallback(roleD1Score: number, workTypeKey: string): SkillPortfolioFitResult {
  const rolePrefix = getRolePrefix(workTypeKey);
  const suggestions = MISSING_SKILLS_BY_ROLE[rolePrefix] ?? MISSING_SKILLS_BY_ROLE._default;
  return {
    fitScore: 50,
    portfolioStrengthTier: 'ADEQUATE',
    surgingSkills: [],
    stableSkills: [],
    decliningSkills: [],
    missingHighValueSkills: suggestions,
    portfolioVsRoleDelta: 0,
    d1AdjustedScore: roleD1Score,
    skillDecayRisk: 'MEDIUM',
    primaryDecayThreat: 'Unknown — skills not provided',
    retoolPriority: suggestions.slice(0, 3),
    portfolioInsight: 'Add your top 5–15 skills to unlock personalized portfolio intelligence.',
    fitRationale: 'Skill inventory not provided — role-level D1 used as proxy.',
    calibrationStatus: 'market_data_2026q1',
  };
}
