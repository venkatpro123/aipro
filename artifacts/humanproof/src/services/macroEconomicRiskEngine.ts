// macroEconomicRiskEngine.ts — v13.0 Layer 21
//
// Macro-economic context layer. Every competent analyst anchors risk analysis
// to the macro cycle FIRST. No previous layer does this.
//
// The thesis: identical company signals produce different outcomes depending on
// the macro regime. A 10% revenue decline during expansion (recoverable) vs.
// during contraction (accelerant) are fundamentally different risk events.
//
// This engine is ZERO API cost — it uses calibrated heuristic values reflecting
// the current macro environment (May 2026). Values are periodically updated
// in this file; real-time API integration is a Phase 2 enhancement.
//
// Macro Environment Snapshot (May 2026):
//   - Fed Funds Rate: 4.75–5.00% (elevated; plateau phase, cuts expected H2 2026)
//   - US GDP Growth: +2.1% YoY (moderate growth, no recession)
//   - Global PMI: 51.3 (slight expansion, above 50 line)
//   - Credit Spreads: 185 bps (elevated vs. 2021 lows of 90 bps, but not crisis)
//   - AI-driven displacement wave: Active (tech sector headcount contraction continues)
//   - India macro: +6.8% GDP growth, IT services slowdown on discretionary spend
//
// Sources: IMF World Economic Outlook Apr 2026, Fed FOMC May 2026, ISM PMI May 2026

export type MacroRegime =
  | 'expansion'          // GDP growth >3%, PMI >55, rates falling
  | 'moderate_growth'    // GDP +1–3%, PMI 50–55, rates stable/plateau
  | 'slowdown'           // GDP <1%, PMI 47–50, rates rising
  | 'contraction'        // GDP negative, PMI <47, credit stress
  | 'stagflation';       // High inflation + stagnant growth

export type RateCyclePhase =
  | 'cutting_fast'       // >75 bps cuts in last 6 months
  | 'cutting_slow'       // 25–50 bps cuts in last 6 months
  | 'plateau'            // stable rates 6+ months
  | 'hiking_slow'        // 25–50 bps hikes in last 6 months
  | 'hiking_fast';       // >75 bps hikes in last 6 months

export type CreditStressLevel = 'low' | 'moderate' | 'elevated' | 'stress' | 'crisis';

export type MacroRiskTier = 'BENIGN' | 'MODERATE' | 'ELEVATED' | 'STRESS' | 'CRISIS';

export interface MacroSectorExposure {
  sector: string;
  exposureMultiplier: number;   // 0.7–1.5 multiplier on the macro base risk
  reasoning: string;
}

export interface MacroEconomicRiskResult {
  // Core metrics
  regime: MacroRegime;
  rateCyclePhase: RateCyclePhase;
  creditStressLevel: CreditStressLevel;
  riskTier: MacroRiskTier;

  // Quantified impact
  macroRiskScore: number;           // 0–100 (macro contribution to layoff risk)
  scoreMultiplier: number;          // 0.75–1.40 applied to company-level score
  sectorExposure: MacroSectorExposure;

  // Interpretive outputs
  macroHeadline: string;            // One-line macro context
  regimeNarrative: string;          // 2-sentence macro interpretation
  keyMacroRisks: string[];          // Top 3 macro risks active now
  macroTailwinds: string[];         // Macro tailwinds (if any)

  // Forward guidance
  outlookHorizon: '3m' | '6m' | '12m';
  outlookDirection: 'improving' | 'stable' | 'deteriorating';
  outlookNarrative: string;

  // India-specific (populated when region = 'IN')
  indiaSpecific?: {
    gdpGrowth: number;
    itServicesOutlook: 'expanding' | 'stable' | 'contracting';
    gccDemand: 'surging' | 'stable' | 'slowing';
    rupeeStabilityRisk: 'low' | 'moderate' | 'high';
    narrative: string;
  };

  readonly calibrationStatus: 'heuristic_may2026';
  /** True when MACRO_DATA_DATE is more than 2 months in the past. */
  _macroDataStale?: boolean;
  _macroStaleMonths?: number;
}

export interface MacroEconomicRiskInputs {
  industry: string;
  region: string;     // 'US' | 'IN' | 'EU' | 'UK' | 'SG' | etc.
  companySize: number;
  currentScore: number;
}

// ── Staleness detection ───────────────────────────────────────────────────────
const MACRO_DATA_DATE = '2026-05-01';

function computeMacroStaleMonths(): number {
  const dataMs = new Date(MACRO_DATA_DATE).getTime();
  const nowMs  = Date.now();
  return Math.floor((nowMs - dataMs) / (30 * 24 * 60 * 60 * 1000));
}

// ── Current Macro State (calibrated May 2026) ────────────────────────────────
// These constants represent the consensus macro view as of May 2026.
// Update quarterly as the macro environment shifts.

const CURRENT_REGIME: MacroRegime = 'moderate_growth';
const CURRENT_RATE_CYCLE: RateCyclePhase = 'plateau';
const CURRENT_CREDIT_STRESS: CreditStressLevel = 'elevated';
const CURRENT_GLOBAL_PMI = 51.3;
const CURRENT_US_GDP_GROWTH = 2.1;    // % YoY
const CURRENT_INDIA_GDP_GROWTH = 6.8; // % YoY
const CURRENT_CREDIT_SPREAD_BPS = 185; // Investment grade credit spreads

// Regime → base macro risk score
const REGIME_BASE_SCORE: Record<MacroRegime, number> = {
  expansion:      15,
  moderate_growth: 32,
  slowdown:       55,
  contraction:    75,
  stagflation:    82,
};

// Rate cycle → multiplier delta (additive to base multiplier of 1.0)
const RATE_CYCLE_MULTIPLIER_DELTA: Record<RateCyclePhase, number> = {
  cutting_fast:  -0.12,  // Rate cuts = relief for tech/growth — reduces risk
  cutting_slow:  -0.06,
  plateau:       +0.02,  // Sustained high rates = slight pressure
  hiking_slow:   +0.10,
  hiking_fast:   +0.20,  // Aggressive hikes = significant headcount pressure
};

// Credit stress → multiplier delta
const CREDIT_STRESS_MULTIPLIER_DELTA: Record<CreditStressLevel, number> = {
  low:       -0.05,
  moderate:   0.00,
  elevated:  +0.05,
  stress:    +0.12,
  crisis:    +0.25,
};

// Sector-specific macro sensitivity (how sensitive each industry is to macro cycles)
const SECTOR_MACRO_SENSITIVITY: Record<string, { multiplier: number; reasoning: string }> = {
  technology: {
    multiplier: 1.25,
    reasoning: 'Tech valuations and headcount are highly rate-sensitive; AI displacement amplifies macro layoff cycles',
  },
  'it services': {
    multiplier: 1.20,
    reasoning: 'Discretionary IT spend contracts faster than revenues — clients cut CAPEX first',
  },
  finance: {
    multiplier: 1.15,
    reasoning: 'Financial sector headcount contracts with credit tightening and M&A slowdown',
  },
  manufacturing: {
    multiplier: 1.10,
    reasoning: 'PMI below 50 directly translates to manufacturing headcount cuts within 60–90 days',
  },
  healthcare: {
    multiplier: 0.75,
    reasoning: 'Healthcare demand is relatively inelastic; defensive against economic cycles',
  },
  government: {
    multiplier: 0.70,
    reasoning: 'Public sector employment is counter-cyclical and policy-protected',
  },
  education: {
    multiplier: 0.80,
    reasoning: 'Education demand is relatively stable; edtech has higher macro sensitivity',
  },
  retail: {
    multiplier: 1.15,
    reasoning: 'Consumer discretionary spending contracts in slowdowns; retail headcount follows',
  },
  media: {
    multiplier: 1.20,
    reasoning: 'Ad markets contract sharply in economic slowdowns; media layoffs follow ad revenue',
  },
  real_estate: {
    multiplier: 1.30,
    reasoning: 'Rate-sensitive sector — elevated rates directly suppress transaction volume and headcount',
  },
  consulting: {
    multiplier: 1.25,
    reasoning: 'Advisory/consulting budgets are first cut; discretionary projects paused in downturns',
  },
};

const DEFAULT_SECTOR_SENSITIVITY = { multiplier: 1.05, reasoning: 'General macro sensitivity applied' };

// Macro headwinds and tailwinds active in May 2026
const ACTIVE_MACRO_RISKS: string[] = [
  'AI-driven white-collar displacement wave accelerating across tech, finance, and media sectors',
  'Elevated interest rates (4.75–5.00%) suppressing growth investment and tech valuations',
  'Global IT discretionary spending contraction — enterprise software and services budgets cut',
  'US regional banking stress creating credit tightening for mid-size company financing',
  'Geopolitical supply-chain fragmentation increasing operational costs for multinational firms',
];

const ACTIVE_MACRO_TAILWINDS: string[] = [
  'US GDP growth remains positive (+2.1%) — no recession baseline as of May 2026',
  'Fed rate cuts expected H2 2026 — forward guidance suggests relief for growth stocks',
  'AI infrastructure investment creating net-new demand for AI/ML and data engineering roles',
  'India IT services benefiting from GCC (Global Capability Center) expansion wave',
];

const INDIA_MACRO_CONTEXT = {
  gdpGrowth: CURRENT_INDIA_GDP_GROWTH,
  itServicesOutlook: 'stable' as const,
  gccDemand: 'surging' as const,
  rupeeStabilityRisk: 'low' as const,
  narrative: `India's GDP growth (${CURRENT_INDIA_GDP_GROWTH}%) provides a stable macro floor. GCC expansion is creating net-new demand for technology and finance roles. However, traditional IT services (TCS, Infosys, Wipro) face headcount pressure from AI automation displacing junior-layer work and discretionary spend contraction from US/EU clients.`,
};

// ── Core Engine ──────────────────────────────────────────────────────────────

function resolveSectorKey(industry: string): string {
  const lower = industry.toLowerCase();
  if (lower.includes('tech') || lower.includes('software') || lower.includes('saas')) return 'technology';
  if (lower.includes('it service') || lower.includes('outsourc') || lower.includes('consulting')) return 'it services';
  if (lower.includes('financ') || lower.includes('bank') || lower.includes('insur')) return 'finance';
  if (lower.includes('manufactur') || lower.includes('industrial')) return 'manufacturing';
  if (lower.includes('health') || lower.includes('pharma') || lower.includes('biotech')) return 'healthcare';
  if (lower.includes('govern') || lower.includes('public sector')) return 'government';
  if (lower.includes('education') || lower.includes('edtech')) return 'education';
  if (lower.includes('retail') || lower.includes('ecommerce')) return 'retail';
  if (lower.includes('media') || lower.includes('entertainment') || lower.includes('gaming')) return 'media';
  if (lower.includes('real estate') || lower.includes('proptech')) return 'real_estate';
  if (lower.includes('consult')) return 'consulting';
  return 'general';
}

function computeMacroRiskTier(score: number): MacroRiskTier {
  if (score >= 75) return 'CRISIS';
  if (score >= 60) return 'STRESS';
  if (score >= 42) return 'ELEVATED';
  if (score >= 25) return 'MODERATE';
  return 'BENIGN';
}

function buildRegimeNarrative(regime: MacroRegime, rateCycle: RateCyclePhase): string {
  const regimeText: Record<MacroRegime, string> = {
    expansion: 'The macro environment is in expansion mode with positive growth momentum and easing financial conditions.',
    moderate_growth: 'The macro environment reflects moderate growth — positive but below trend, with financial conditions remaining restrictive.',
    slowdown: 'The macro environment shows clear slowdown signals with sub-trend growth and tightening financial conditions.',
    contraction: 'The macro environment is in contraction — GDP declining, credit tightening, and layoff cycles accelerating across most sectors.',
    stagflation: 'Stagflation conditions persist — growth is stagnant while inflation remains elevated, creating unusually harsh conditions for corporate headcount.',
  };
  const rateText: Record<RateCyclePhase, string> = {
    cutting_fast: 'Aggressive rate cuts are providing significant financial relief, historically preceding a recovery in hiring activity.',
    cutting_slow: 'Gradual rate cuts are reducing financial pressure, though the effect on hiring lags by 6–9 months.',
    plateau: 'Rates are at a sustained plateau — no immediate relief or additional pressure, but elevated rates continue to compress growth investment.',
    hiking_slow: 'Gradual rate hikes are increasing financial costs and suppressing corporate investment, with layoff risk elevated for leveraged companies.',
    hiking_fast: 'Aggressive rate hikes are creating significant financial stress — this historically precedes broad-based corporate headcount reduction within 6–12 months.',
  };
  return `${regimeText[regime]} ${rateText[rateCycle]}`;
}

function buildOutlookNarrative(regime: MacroRegime, rateCycle: RateCyclePhase): {
  direction: 'improving' | 'stable' | 'deteriorating';
  horizon: '3m' | '6m' | '12m';
  narrative: string;
} {
  // Current outlook: plateau regime, cuts expected H2 2026
  return {
    direction: 'improving',
    horizon: '6m',
    narrative: 'The 6-month macro outlook is cautiously improving. Fed rate cuts expected in H2 2026 should reduce financial pressure on tech and growth companies. AI investment continues to create net-new demand in infrastructure and AI/ML roles. Near-term risk remains elevated from AI-driven displacement, but macro conditions do not suggest a recession-driven mass layoff event.',
  };
}

export function computeMacroEconomicRisk(inputs: MacroEconomicRiskInputs): MacroEconomicRiskResult {
  const sectorKey = resolveSectorKey(inputs.industry);
  const sectorConfig = SECTOR_MACRO_SENSITIVITY[sectorKey] ?? DEFAULT_SECTOR_SENSITIVITY;

  // Base macro risk score from regime
  const baseScore = REGIME_BASE_SCORE[CURRENT_REGIME];

  // Adjust for credit spreads (baseline 90 bps = neutral; 185 = elevated)
  const creditAdjustment = Math.max(0, (CURRENT_CREDIT_SPREAD_BPS - 90) / 25); // +3.8 pts

  // Apply rate cycle pressure
  const rateAdjustment = RATE_CYCLE_MULTIPLIER_DELTA[CURRENT_RATE_CYCLE] * 40; // scale to score pts

  const macroRawScore = Math.min(100, Math.max(0,
    baseScore + creditAdjustment + rateAdjustment
  ));

  // Sector-adjusted macro score
  const macroRiskScore = Math.min(100, Math.round(macroRawScore * sectorConfig.multiplier));

  // Score multiplier for the main score
  const baseMultiplier = 1.0
    + RATE_CYCLE_MULTIPLIER_DELTA[CURRENT_RATE_CYCLE]
    + CREDIT_STRESS_MULTIPLIER_DELTA[CURRENT_CREDIT_STRESS];
  const sectorMultiplier = 1 + ((sectorConfig.multiplier - 1) * 0.5); // half-weight sector effect
  const scoreMultiplier = Math.min(1.40, Math.max(0.75, +(baseMultiplier * sectorMultiplier).toFixed(3)));

  const riskTier = computeMacroRiskTier(macroRiskScore);
  const { direction, horizon, narrative: outlookNarrative } = buildOutlookNarrative(CURRENT_REGIME, CURRENT_RATE_CYCLE);

  const macroHeadlines: Record<MacroRiskTier, string> = {
    BENIGN: 'Macro environment is supportive — low systemic headcount pressure',
    MODERATE: 'Macro conditions are neutral — moderate systemic headcount pressure in your sector',
    ELEVATED: 'Macro headwinds are active — your sector faces above-average systemic risk',
    STRESS: 'Macro stress conditions — sector-wide headcount contraction highly probable',
    CRISIS: 'Macro crisis conditions — systemic layoff wave likely across most sectors',
  };

  const result: MacroEconomicRiskResult = {
    regime: CURRENT_REGIME,
    rateCyclePhase: CURRENT_RATE_CYCLE,
    creditStressLevel: CURRENT_CREDIT_STRESS,
    riskTier,
    macroRiskScore,
    scoreMultiplier,
    sectorExposure: {
      sector: sectorKey,
      exposureMultiplier: sectorConfig.multiplier,
      reasoning: sectorConfig.reasoning,
    },
    macroHeadline: macroHeadlines[riskTier],
    regimeNarrative: buildRegimeNarrative(CURRENT_REGIME, CURRENT_RATE_CYCLE),
    keyMacroRisks: ACTIVE_MACRO_RISKS.slice(0, 3),
    macroTailwinds: ACTIVE_MACRO_TAILWINDS.slice(0, 2),
    outlookHorizon: horizon,
    outlookDirection: direction,
    outlookNarrative,
    calibrationStatus: 'heuristic_may2026',
  };

  // India-specific enrichment
  if (inputs.region === 'IN' || inputs.region === 'India' || inputs.region?.toLowerCase().includes('india')) {
    result.indiaSpecific = INDIA_MACRO_CONTEXT;
  }

  // Staleness flag — surfaces a warning in the UI when the snapshot is > 2 months old.
  const staleMonths = computeMacroStaleMonths();
  if (staleMonths > 2) {
    result._macroDataStale = true;
    result._macroStaleMonths = staleMonths;
  }

  return result;
}
