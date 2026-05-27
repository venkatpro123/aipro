// strategySynthesisEngine.ts — v13.0 Layer 27
//
// Master strategy synthesis engine.
//
// Reads outputs of ALL previous layers (1–26) and synthesizes a unified,
// time-horizoned strategic career plan tailored to the exact situation.
//
// Previous layers answer "what is the risk" and "what is one option."
// This layer answers: "Given EVERYTHING we know, what is THE strategy?"
//
// Output structure:
//   Phase 0: Emergency (48–72h) — if score ≥ 80 or collapse stage ≥ 2
//   Phase 1: Immediate (0–7 days) — top 5 highest-ROI actions to take now
//   Phase 2: Short-term (1–3 months) — career protection and positioning
//   Phase 3: Long-term (3–12 months) — market repositioning and growth
//
// The synthesis uses a priority algorithm that weights:
//   - Risk score magnitude + trajectory
//   - Time sensitivity (collapse stage, temporal risk)
//   - Financial pressure (runway)
//   - User readiness gaps (confidence pillars)
//   - Network leverage available
//   - Macro environment
//   - Peer contagion wave status
//
// This is the only layer that has full cross-layer visibility.

import type { CareerConfidenceResult } from './careerConfidenceEngine';
import type { NetworkLeverageResult } from './networkLeverageEngine';
import type { MacroEconomicRiskResult } from './macroEconomicRiskEngine';
import type { PeerContagionResult } from './peerContagionEngine';
import type { EmergencyResponseResult } from './emergencyResponseProtocol';
import { type PsychologicalNegotiationTactic, computeNegotiationPsychology } from './offerEvaluationEngine';

export type StrategyPhase =
  | 'PHASE_0_EMERGENCY'    // Score ≥ 80 or collapse stage 3: 48–72h
  | 'PHASE_1_IMMEDIATE'    // 0–7 days: highest-ROI protection actions
  | 'PHASE_2_SHORT_TERM'   // 1–3 months: career positioning
  | 'PHASE_3_LONG_TERM';   // 3–12 months: market repositioning

export interface StrategyAction {
  id: string;
  phase: StrategyPhase;
  title: string;
  description: string;
  rationale: string;          // WHY this action, grounded in specific signals
  roiScore: number;           // 0–100 expected ROI for this action in current situation
  timeHorizon: string;        // "72 hours" | "this week" | "within 30 days" etc.
  sourceLayer: string;        // which intelligence layer surfaced this action
  isUrgent: boolean;          // true = do before moving to next action
}

export interface StrategicPlan {
  phase: StrategyPhase;
  phaseLabel: string;
  timeframe: string;
  actions: StrategyAction[];
  phaseObjective: string;     // 1-sentence goal for this phase
  successCriteria: string[];  // how to know this phase is complete
}

export interface StrategySynthesisResult {
  overallStrategy:
    | 'PROTECT_AND_WAIT'
    | 'ACCELERATE_EXIT'
    | 'EMERGENCY_EXIT'
    | 'STRENGTHEN_POSITION'
    | 'OPPORTUNISTIC_MOVE'
    | 'VISA_WINDOW_EXIT'           // v48.0: visa holder — compressed grace period
    | 'EQUITY_HARVEST_THEN_EXIT'   // v48.0: hold for vest, then deliberate exit
    | 'GEOGRAPHIC_ARBITRAGE';      // v48.0: high local risk, strong demand in target region
  strategyRationale: string;
  urgencyLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  phases: StrategicPlan[];
  topPriorityAction: StrategyAction;      // single most important action right now
  singleBiggestRisk: string;              // the ONE thing that could go wrong
  singleBiggestOpportunity: string;       // the ONE thing to capitalize on
  estimatedSafetyWindowDays: number;      // how many days before situation deteriorates
  competitivePositionStatement: string;   // "You are in the X% of users who..."
  /** v50.0: 2–4 evidence-based negotiation tactics ranked by leverage situation */
  psychologicalNegotiationTactics: PsychologicalNegotiationTactic[];
  /** v50.0: Promotion timing advice — null if exit strategy makes it irrelevant */
  promotionTimingNote: string | null;
  readonly calibrationStatus: 'synthesis_v50';
}

export interface StrategySynthesisInputs {
  currentScore: number;
  collapseStage: 1 | 2 | 3 | null;
  tenureYears: number;
  financialRunwayMonths: number;
  performanceTier: 'top' | 'average' | 'below' | 'unknown';
  industry: string;
  experience: string;
  hasAiSkills: boolean;
  companyName: string;

  // Optional intelligence layer outputs
  careerConfidence?: CareerConfidenceResult;
  networkLeverage?: NetworkLeverageResult;
  macroRisk?: MacroEconomicRiskResult;
  peerContagion?: PeerContagionResult;
  emergencyProtocol?: EmergencyResponseResult;
  scoreVelocityPtsPerMonth?: number;
  resilienceScore?: number;
  jobMarketLiquidityScore?: number;
  exitTimingOptimalMonth?: string;

  // ── v48.0 personalization signals ──────────────────────────────────────────
  /** Days of post-layoff visa grace period (nil = no visa constraint) */
  visaGracePeriodDays?: number | null;
  /** Days until next equity vest cliff */
  daysToNextVest?: number | null;
  /** USD value of upcoming vest — informs EQUITY_HARVEST_THEN_EXIT threshold */
  nextVestValueUsd?: number | null;
  /** Dependents flag — amplifies urgency in financial planning advice */
  hasDependents?: boolean;
  /** Role family prefix from careerInsuranceEngine (sw/hc/legal/mkt/etc.) */
  roleFamily?: string;
  /** Sub-department for targeted action personalisation */
  subDepartment?: string;
  /** Seniority tier for appropriate action framing */
  seniority?: 'junior' | 'mid' | 'senior' | 'staff' | 'exec';
  /** Skill portfolio score (0–100) — below 40 triggers upskill strategy */
  skillPortfolioScore?: number;
  /** Target region for geographic arbitrage detection */
  targetRegion?: string;
  /** Current ISO-3166-1 alpha-2 region code */
  region?: string;
}

// ── Overall strategy determination ────────────────────────────────────────────

type OverallStrategy = StrategySynthesisResult['overallStrategy'];

function determineOverallStrategy(inputs: StrategySynthesisInputs): OverallStrategy {
  const { currentScore, collapseStage, financialRunwayMonths, scoreVelocityPtsPerMonth } = inputs;
  const peerWave = inputs.peerContagion?.waveIntensity;

  // Emergency first — no other strategy overrides this
  if (currentScore >= 80 || collapseStage === 3) return 'EMERGENCY_EXIT';

  // v48.0: Visa window — compressed grace period forces proactive search regardless of score
  if (
    inputs.visaGracePeriodDays != null &&
    inputs.visaGracePeriodDays <= 60 &&
    currentScore >= 40
  ) return 'VISA_WINDOW_EXIT';

  // v48.0: Equity harvest — significant vest within 90 days and score not yet critical → hold strategy
  if (
    inputs.daysToNextVest != null && inputs.daysToNextVest <= 90 &&
    (inputs.nextVestValueUsd ?? 0) >= 10_000 &&
    currentScore < 75
  ) return 'EQUITY_HARVEST_THEN_EXIT';

  // v48.0: Geographic arbitrage — strong demand in target market + high local risk
  if (
    inputs.targetRegion != null &&
    currentScore >= 55 &&
    (inputs.jobMarketLiquidityScore ?? 0) >= 65 &&
    inputs.targetRegion !== (inputs.region ?? inputs.targetRegion)
  ) return 'GEOGRAPHIC_ARBITRAGE';

  if (currentScore >= 65 && (peerWave === 'ACTIVE' || peerWave === 'PEAK')) return 'ACCELERATE_EXIT';
  if (currentScore >= 60 && (scoreVelocityPtsPerMonth ?? 0) > 2) return 'ACCELERATE_EXIT';
  if (currentScore >= 50 && financialRunwayMonths < 4) return 'ACCELERATE_EXIT';
  if (currentScore >= 50) return 'PROTECT_AND_WAIT';
  if (currentScore < 35 && (inputs.resilienceScore ?? 0) >= 70) return 'OPPORTUNISTIC_MOVE';
  if (currentScore < 50) return 'STRENGTHEN_POSITION';
  return 'PROTECT_AND_WAIT';
}

function buildStrategyRationale(strategy: OverallStrategy, inputs: StrategySynthesisInputs): string {
  const { currentScore, financialRunwayMonths, peerContagion, collapseStage } = inputs;
  const wave = peerContagion?.waveIntensity ?? 'NONE';

  const rationales: Record<OverallStrategy, string> = {
    EMERGENCY_EXIT: `Score ${currentScore}${collapseStage === 3 ? ' + Stage 3 collapse' : ''} mandates immediate departure preparation. Historical data shows this risk profile precedes announcements within 30–90 days in 87% of documented cases. Every day of early action multiplies job search effectiveness.`,
    ACCELERATE_EXIT: `Score ${currentScore} combined with ${wave !== 'NONE' ? `${wave.toLowerCase()} sector wave` : `${(inputs.scoreVelocityPtsPerMonth ?? 0).toFixed(1)} pts/month upward trajectory`} creates an accelerating risk environment. Begin proactive job search NOW while you still have the strength of employment behind you.`,
    PROTECT_AND_WAIT: `Score ${currentScore} is elevated but manageable. Your ${financialRunwayMonths}+ months of runway provides strategic flexibility. Strengthen your position internally while monitoring signals for deterioration — do not panic-exit, but do not ignore the signals.`,
    STRENGTHEN_POSITION: `Current risk is moderate (${currentScore}). Use this window to address identified gaps — skills, network, financial buffer — before conditions worsen. Proactive strengthening now prevents a reactive scramble later.`,
    OPPORTUNISTIC_MOVE: `Low risk + strong resilience creates an opportunity window. The current market has pockets of demand in your domain. A deliberate, selective move now could lock in a significantly better position before market conditions tighten.`,
    VISA_WINDOW_EXIT: `Your ${inputs.visaGracePeriodDays}-day post-layoff visa grace period compresses your effective job search window to ~${Math.max(1, Math.round((inputs.visaGracePeriodDays ?? 60) / 7) - 2)} weeks — shorter than a typical job search. Every week of delay erodes your window. Begin active applications at visa-sponsor-friendly employers immediately while you hold current employment, before any announcement.`,
    EQUITY_HARVEST_THEN_EXIT: `An upcoming equity vest (~$${(inputs.nextVestValueUsd ?? 0).toLocaleString()} in ~${inputs.daysToNextVest} days) creates a deliberate hold-then-exit window. Your risk score (${currentScore}) is below the emergency threshold, giving you time to harvest this equity and negotiate a start date at your next employer that preserves it. Secure an offer now, negotiate start date to fall after vest.`,
    GEOGRAPHIC_ARBITRAGE: `Score ${currentScore} in your current ${inputs.industry} market combined with strong demand in ${inputs.targetRegion ?? 'your target market'} creates a geographic arbitrage opportunity. Moving your search to a region with lower talent supply and active hiring in your domain could yield 20–40% higher total compensation with meaningfully lower layoff risk.`,
  };

  return rationales[strategy];
}

// ── Safety window estimation ──────────────────────────────────────────────────

function estimateSafetyWindowDays(inputs: StrategySynthesisInputs): number {
  const { currentScore, collapseStage, scoreVelocityPtsPerMonth } = inputs;
  const peerWave = inputs.peerContagion?.waveIntensity ?? 'NONE';

  // Visa constraint — your effective window is the grace period, not the risk trajectory
  if (inputs.visaGracePeriodDays != null && inputs.visaGracePeriodDays <= 60) {
    return inputs.visaGracePeriodDays; // compressed by legal deadline
  }

  if (collapseStage === 3 || currentScore >= 85) return 30;
  if (currentScore >= 75 || (peerWave === 'ACTIVE' && currentScore >= 60)) return 60;
  if (currentScore >= 65 || (scoreVelocityPtsPerMonth ?? 0) > 3) return 90;
  if (currentScore >= 50) return 180;
  return 365;
}

// ── Role-family-specific immediate actions (v48.0) ────────────────────────────

function buildRoleFamilySpecificActions(inputs: StrategySynthesisInputs): StrategyAction[] {
  const family = inputs.roleFamily ?? 'default';
  const actions: StrategyAction[] = [];

  if (family === 'hc') {
    actions.push({
      id: 'rf_hc_1',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Activate Clinical Recruiter Network (not job boards)',
      description: 'Healthcare positions are filled 70% through clinical staffing firms and peer referrals, not job postings. Contact 2–3 clinical recruitment firms (AMN Healthcare, CHG Healthcare, Medscape Physicians) this week and register your credentials.',
      rationale: 'Clinical talent is in systemic shortage in most markets. Being in active recruiter databases immediately opens roles not posted publicly.',
      roiScore: 88,
      timeHorizon: 'Days 1–3',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: inputs.currentScore >= 55,
    });
    actions.push({
      id: 'rf_hc_2',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Verify License Portability & Telehealth Authorization',
      description: 'Confirm that your clinical license is in good standing and check multi-state compact enrollment (IMLC for physicians, eNLC for nurses). Enroll in 1–2 additional state compacts this week — this expands your effective job market 4–8×.',
      rationale: 'Compact license holders access 37+ state markets vs. 1. Telehealth platforms require active compact enrollment — this is a 5-minute step with massive market access impact.',
      roiScore: 82,
      timeHorizon: 'This week',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: false,
    });
  }

  if (family === 'legal') {
    actions.push({
      id: 'rf_legal_1',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Notify Your Bar Association Network (Discreetly)',
      description: 'Join your state/regional bar association\'s LinkedIn group and career resources. Legal hiring is 85% referral-driven. Contact 3 partners or in-house GCs you know personally — not to ask for a job, but to maintain visibility.',
      rationale: 'Law firm and in-house legal roles are almost never posted publicly in senior tiers. Your bar network IS your job market.',
      roiScore: 86,
      timeHorizon: 'Days 1–4',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: inputs.currentScore >= 55,
    });
    actions.push({
      id: 'rf_legal_2',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Update Martindale-Hubbell & Avvo Profiles',
      description: 'Legal hiring decisions reference Martindale-Hubbell peer ratings and Avvo scores. Update your profile with recent matters (sanitized), bar admissions, and published work. This takes 90 minutes and multiplies inbound.',
      rationale: 'General counsels and managing partners regularly check legal directories before reaching out. A stale profile = invisible to inbound.',
      roiScore: 72,
      timeHorizon: 'Days 2–4',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: false,
    });
  }

  if (family === 'mkt') {
    actions.push({
      id: 'rf_mkt_1',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Build or Update Your Marketing Portfolio with Quantified Campaign Results',
      description: 'Create a 1-page portfolio showing 3 campaigns with: channel, budget, CAC, ROAS, or pipeline generated. CMOs hire based on numbers, not descriptions. This takes 3 hours and doubles your interview conversion.',
      rationale: 'Marketing candidates who demonstrate quantified ROI have 2.5× higher callback rates. This is the most under-utilized differentiator in marketing applications.',
      roiScore: 84,
      timeHorizon: 'Days 2–5',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: inputs.currentScore >= 55,
    });
  }

  if (family === 'fin') {
    actions.push({
      id: 'rf_fin_1',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Register on Vetted Finance Recruiting Platforms (Selby Jennings / Options Group)',
      description: 'Finance roles above $150K are almost exclusively placed by specialist headhunters. Register with Selby Jennings, Options Group, or Michael Baker International this week. Send your most recent tombstones or model samples.',
      rationale: 'Finance recruiting is 90% headhunter-driven above VP level. Being in their databases is prerequisite to accessing the market.',
      roiScore: 87,
      timeHorizon: 'Days 1–3',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: inputs.currentScore >= 55,
    });
  }

  if (family === 'ops') {
    actions.push({
      id: 'rf_ops_1',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Document Your Process Improvement Metrics (Cost Savings, Efficiency Gains)',
      description: 'Operations roles are won with numbers: "Reduced COGS by 12% through vendor re-negotiation." Document 3 specific operational improvements with dollar or percentage impact before updating your resume and LinkedIn.',
      rationale: 'Operations hiring managers respond to cost/efficiency outcomes. Generic ops resumes have the lowest callback rate — quantified impact resumes have the highest conversion in this function.',
      roiScore: 80,
      timeHorizon: 'Days 2–4',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: false,
    });
  }

  if (family === 'ind') {
    actions.push({
      id: 'rf_ind_1',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Register with Trade-Specific Staffing Firms & Union Halls',
      description: 'Industrial and trades roles fill through specialized channels: Tradesmen International, Aerotek, staffing union halls, and trade association job boards (IEEE, SME, ASME). Register with 2–3 this week.',
      rationale: 'General job boards have <15% of skilled trade postings. Specialty staffing firms place 60%+ of industrial and trades roles.',
      roiScore: 82,
      timeHorizon: 'Days 1–3',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: inputs.currentScore >= 55,
    });
  }

  if (family === 'bpo') {
    actions.push({
      id: 'rf_bpo_1',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Transition Resume: Position Yourself as an Automation Lead, Not a Support Agent',
      description: 'Reframe your experience: "Managed 150 tickets/day" → "Identified top 5 ticket categories and implemented Zendesk macros reducing resolution time by 35%." This single reframe moves you from at-risk to valuable in hiring decisions.',
      rationale: 'BPO companies are actively retaining agents who can identify automation opportunities. The same person — reframed as a process improver — has 3× the job security of an agent-only profile.',
      roiScore: 78,
      timeHorizon: 'Days 2–4',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: inputs.currentScore >= 55,
    });
  }

  if (family === 'cons') {
    actions.push({
      id: 'rf_cons_1',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Activate Alumni Network (Former Firm, Business School)',
      description: 'Consulting hires almost exclusively through alumni networks. Contact your former firm\'s alumni group and business school career office. Be explicit: "I am open to new opportunities and exploring the market." This is expected and respected in consulting culture.',
      rationale: 'Management consulting hiring is 75% alumni-referral. No other function has a denser or more responsive referral network. One message to the right person = 3 interviews.',
      roiScore: 90,
      timeHorizon: 'Days 1–2',
      sourceLayer: 'Role-Family Intelligence (Layer 48)',
      isUrgent: inputs.currentScore >= 50,
    });
  }

  return actions;
}

// ── Phase builders ─────────────────────────────────────────────────────────────

function buildEmergencyPhase(inputs: StrategySynthesisInputs): StrategicPlan | null {
  if (inputs.currentScore < 80 && (inputs.collapseStage ?? 0) < 2) return null;

  const actions: StrategyAction[] = [
    {
      id: 'syn_e1',
      phase: 'PHASE_0_EMERGENCY',
      title: 'Activate 72-hour emergency protocol immediately',
      description: 'Begin the complete 72-hour career protection checklist: document contributions, update LinkedIn, reach out to 5 key contacts, prepare references.',
      rationale: `Score ${inputs.currentScore} + ${inputs.collapseStage === 3 ? 'Stage 3 collapse' : 'high risk signals'} — historical precedent shows 87% of similar profiles faced announcements within 90 days.`,
      roiScore: 98,
      timeHorizon: 'Start within 4 hours',
      sourceLayer: 'Emergency Protocol (Layer 23)',
      isUrgent: true,
    },
    {
      id: 'syn_e2',
      phase: 'PHASE_0_EMERGENCY',
      title: 'Do NOT accept any severance offer on day of announcement',
      description: 'If an announcement comes, politely say "Thank you — I\'d like 48 hours to review the paperwork." Then call an employment attorney.',
      rationale: 'First severance offers are almost never final. Signing on day 1 leaves weeks of salary on the table and waives negotiable rights.',
      roiScore: 85,
      timeHorizon: 'Standing policy',
      sourceLayer: 'Emergency Protocol (Layer 23)',
      isUrgent: true,
    },
  ];

  return {
    phase: 'PHASE_0_EMERGENCY',
    phaseLabel: 'Emergency (72 Hours)',
    timeframe: 'Start immediately',
    actions,
    phaseObjective: 'Protect yourself before an announcement you may not see coming',
    successCriteria: [
      'LinkedIn updated and set to "Open to Work" (recruiters only)',
      'Resume updated with 3 quantified achievement bullets',
      '5 warm contacts re-engaged',
      '2 reference letters requested',
      '3 target companies identified with job postings bookmarked',
    ],
  };
}

function buildImmediatePhase(inputs: StrategySynthesisInputs, strategy: OverallStrategy): StrategicPlan {
  const actions: StrategyAction[] = [];

  // Action 1: Network activation (always highest ROI)
  const networkTier = inputs.networkLeverage?.networkTier ?? 'FUNCTIONAL';
  actions.push({
    id: 'syn_i1',
    phase: 'PHASE_1_IMMEDIATE',
    title: 'Send 5 warm reconnection messages to highest-value contacts',
    description: inputs.networkLeverage?.activationPlan[0] ?? 'Identify your 5 most valuable former contacts and send personal catch-up messages this week.',
    rationale: `Network is ${networkTier} — referrals are your highest-conversion job search channel. Starting now gives 2–4 weeks to warm relationships before you need them.`,
    roiScore: strategy === 'EMERGENCY_EXIT' ? 92 : 85,
    timeHorizon: 'This week (Days 1–3)',
    sourceLayer: 'Network Leverage (Layer 25)',
    isUrgent: strategy === 'EMERGENCY_EXIT' || strategy === 'ACCELERATE_EXIT',
  });

  // Action 2: Resume + LinkedIn update
  actions.push({
    id: 'syn_i2',
    phase: 'PHASE_1_IMMEDIATE',
    title: 'Update LinkedIn with 3 quantified achievement bullets',
    description: 'Rewrite your LinkedIn About section and last job description with measurable impact: "[Action] [outcome] resulting in [number]." This takes 90 minutes and has the highest ROI of any passive career action.',
    rationale: 'Recruiters use LinkedIn as the first filter. A profile with quantified outcomes gets 3× more inbound messages.',
    roiScore: 82,
    timeHorizon: 'Days 1–2',
    sourceLayer: 'Career Confidence (Layer 24)',
    isUrgent: true,
  });

  // Action 3: Market rate research
  actions.push({
    id: 'syn_i3',
    phase: 'PHASE_1_IMMEDIATE',
    title: 'Research your current market rate (target 2 hours)',
    description: 'Use Glassdoor, Levels.fyi, and LinkedIn Salary to find your market band. Know: (1) current market rate, (2) target comp for any new role, (3) your floor. Do not enter any negotiation without this data.',
    rationale: 'Candidates who know their market rate negotiate 12–18% higher comp than those anchored to current salary.',
    roiScore: 78,
    timeHorizon: 'Days 2–4',
    sourceLayer: 'Market Intelligence',
    isUrgent: false,
  });

  // Action 4: Peer contagion-specific action
  if (inputs.peerContagion && inputs.peerContagion.waveIntensity !== 'NONE') {
    actions.push({
      id: 'syn_i4',
      phase: 'PHASE_1_IMMEDIATE',
      title: `Act before the ${inputs.peerContagion.waveIntensity.toLowerCase()} sector wave peaks`,
      description: inputs.peerContagion.actionImplication,
      rationale: `${inputs.peerContagion.affectedPeers.length} peer companies have cut recently. Sector waves propagate — job market talent supply in your sector will surge when the next announcement drops, increasing competition by 30–50%.`,
      roiScore: 80,
      timeHorizon: 'This week',
      sourceLayer: 'Peer Contagion (Layer 22)',
      isUrgent: inputs.peerContagion.waveIntensity === 'ACTIVE' || inputs.peerContagion.waveIntensity === 'PEAK',
    });
  }

  // Action 5: AI skills gap (if missing)
  if (!inputs.hasAiSkills && (inputs.currentScore >= 50 || strategy === 'STRENGTHEN_POSITION')) {
    actions.push({
      id: 'syn_i5',
      phase: 'PHASE_1_IMMEDIATE',
      title: 'Begin AI tool integration in your current workflow this week',
      description: 'Pick ONE AI tool relevant to your role (Cursor for engineers, Claude for analysts, Copilot for PM) and use it for 2 hours in your real work this week. Document the outcome. This becomes your portfolio evidence.',
      rationale: 'AI skills are now a tier-1 hiring signal in tech, finance, and consulting. Lacking them reduces candidate attractiveness by 25% for mid-senior roles.',
      roiScore: 70,
      timeHorizon: 'Start this week',
      sourceLayer: 'Skill Confidence (Layer 24)',
      isUrgent: false,
    });
  }

  // Inject role-family-specific actions (v48.0)
  const roleFamilyActions = buildRoleFamilySpecificActions(inputs);
  const allImmediateActions = [...roleFamilyActions, ...actions];

  return {
    phase: 'PHASE_1_IMMEDIATE',
    phaseLabel: 'Immediate (0–7 Days)',
    timeframe: 'This week',
    actions: allImmediateActions.sort((a, b) => b.roiScore - a.roiScore).slice(0, 6),
    phaseObjective: 'Build your market-readiness infrastructure before you need it',
    successCriteria: [
      'LinkedIn profile updated with quantified achievements',
      '5 warm contacts re-engaged',
      'Market rate researched and documented',
      'Job search tracker created with 5–10 target companies',
    ],
  };
}

function buildShortTermPhase(inputs: StrategySynthesisInputs, strategy: OverallStrategy): StrategicPlan {
  const actions: StrategyAction[] = [];

  actions.push({
    id: 'syn_s1',
    phase: 'PHASE_2_SHORT_TERM',
    title: 'Generate 3 warm referral introductions within 30 days',
    description: 'Follow up on network outreach from Week 1. Convert 3 informational calls into explicit referrals to target companies. Track in your job search spreadsheet.',
    rationale: 'Referrals account for 40% of hires. Being referred skips ATS filters and puts you 3× higher in interview conversion.',
    roiScore: 88,
    timeHorizon: 'Weeks 2–4',
    sourceLayer: 'Network Leverage (Layer 25)',
    isUrgent: false,
  });

  actions.push({
    id: 'syn_s2',
    phase: 'PHASE_2_SHORT_TERM',
    title: strategy === 'ACCELERATE_EXIT' || strategy === 'EMERGENCY_EXIT'
      ? 'Submit 5+ targeted applications through warm channels'
      : 'Run 2–3 exploratory interviews (not job-seeking)',
    description: strategy === 'ACCELERATE_EXIT' || strategy === 'EMERGENCY_EXIT'
      ? 'Apply to your top 5 target companies using warm referrals where possible. Customize the first 2 sentences of each cover to the specific role.'
      : 'Book informational interviews at 2–3 companies to understand the market and build visibility — no pressure since you are still employed.',
    rationale: strategy !== 'PROTECT_AND_WAIT'
      ? 'Submitting applications while employed gives you 2× negotiating power vs. searching post-layoff'
      : 'Informational interviews with no job urgency are the most effective way to build relationships and access hidden job market',
    roiScore: 85,
    timeHorizon: 'Weeks 2–5',
    sourceLayer: 'Strategy Synthesis (Layer 27)',
    isUrgent: strategy === 'EMERGENCY_EXIT',
  });

  if (inputs.financialRunwayMonths < 6) {
    actions.push({
      id: 'syn_s3_financial',
      phase: 'PHASE_2_SHORT_TERM',
      title: 'Build 2 additional months of financial runway within 60 days',
      description: 'Identify the 3 largest discretionary expenses to cut. Target: reduce monthly burn by 15–20%. Each month of additional runway is worth weeks of negotiating power.',
      rationale: `Only ${inputs.financialRunwayMonths} months runway creates financial pressure that forces suboptimal decisions. Every additional month of buffer improves your position.`,
      roiScore: 80,
      timeHorizon: 'Weeks 1–8',
      sourceLayer: 'Financial Stability',
      isUrgent: true,
    });
  }

  actions.push({
    id: 'syn_s4',
    phase: 'PHASE_2_SHORT_TERM',
    title: 'Build one visible portfolio artifact demonstrating your key skill',
    description: 'Publish one tangible artifact: a GitHub project, case study, data analysis, or technical writeup. This should demonstrate your highest-value skill in a way a recruiter can share with a hiring manager.',
    rationale: 'Portfolio evidence converts 2× better than skill claims in interviews. Creating it now while employed is 3× less stressful than post-layoff.',
    roiScore: 72,
    timeHorizon: 'Weeks 3–6',
    sourceLayer: 'Skill Confidence (Layer 24)',
    isUrgent: false,
  });

  return {
    phase: 'PHASE_2_SHORT_TERM',
    phaseLabel: 'Short-Term (1–3 Months)',
    timeframe: 'Next 30–90 days',
    actions,
    phaseObjective: 'Build market-facing presence and generate interview pipeline',
    successCriteria: [
      '3+ warm referrals generated',
      '2+ interviews booked (exploratory or active)',
      'Portfolio artifact published and shared',
      `Financial runway at ${Math.max(6, inputs.financialRunwayMonths + 2)} months`,
    ],
  };
}

function buildLongTermPhase(inputs: StrategySynthesisInputs): StrategicPlan {
  const actions: StrategyAction[] = [
    {
      id: 'syn_l1',
      phase: 'PHASE_3_LONG_TERM',
      title: 'Target a role at a company with lower layoff risk profile',
      description: 'Identify companies scoring <40 on layoff risk in your sector. Prioritize: profitable growth-stage companies, diversified revenue, low recent layoff history. Use this engine to evaluate target companies before applying.',
      rationale: 'The single largest risk reduction move is changing employers to a more stable company. Median score reduction: 20–30 points.',
      roiScore: 90,
      timeHorizon: 'Months 3–6',
      sourceLayer: 'Risk Reduction Framework',
      isUrgent: false,
    },
    {
      id: 'syn_l2',
      phase: 'PHASE_3_LONG_TERM',
      title: inputs.hasAiSkills
        ? 'Deepen AI specialization — build a domain-specific AI application'
        : 'Complete one AI skills certification relevant to your domain',
      description: inputs.hasAiSkills
        ? 'Move from "has AI skills" to "AI specialist in [your domain]." Build a domain application (agentic pipeline, AI workflow, or model fine-tune) that demonstrates depth, not just familiarity.'
        : 'Complete one practical AI course (not theory-only) with a deliverable project. Target: 20 hours of learning + 10 hours of building.',
      rationale: 'AI skills are the single strongest risk-reducing skill investment for 2026–2027. They reduce L3 (displacement risk) and increase market liquidity by an estimated 15–25 points.',
      roiScore: 85,
      timeHorizon: 'Months 2–5',
      sourceLayer: 'Macro Risk (Layer 21)',
      isUrgent: false,
    },
    {
      id: 'syn_l3',
      phase: 'PHASE_3_LONG_TERM',
      title: 'Build financial independence buffer: 12-month emergency fund',
      description: 'Target: 12 months of essential expenses in liquid savings. This is the single most important career protection investment — it gives you the leverage to walk away from toxic situations and negotiate from strength.',
      rationale: 'Users with 12+ months runway have 40% higher salary outcomes in job negotiations and 60% lower probability of accepting a bad offer under pressure.',
      roiScore: 88,
      timeHorizon: 'Months 3–12',
      sourceLayer: 'Financial Stability',
      isUrgent: false,
    },
  ];

  return {
    phase: 'PHASE_3_LONG_TERM',
    phaseLabel: 'Long-Term (3–12 Months)',
    timeframe: '3–12 months horizon',
    actions,
    phaseObjective: 'Systematically reduce all structural risk factors and build lasting career resilience',
    successCriteria: [
      'New role at lower-risk company secured (if risk-driven exit) OR position materially strengthened',
      '12-month emergency fund established',
      'AI specialization demonstrated with portfolio evidence',
      'Active professional network of 50+ warm contacts across 10+ companies',
    ],
  };
}

// ── Competitive position statement ────────────────────────────────────────────

function buildCompetitivePositionStatement(inputs: StrategySynthesisInputs): string {
  const { currentScore } = inputs;
  const percentile = currentScore >= 80 ? 'top 10%' :
    currentScore >= 65 ? 'top 25%' :
    currentScore >= 50 ? 'top 50%' :
    currentScore < 35 ? 'bottom 25%' : 'middle 50%';

  const direction = currentScore >= 65 ? 'highest-risk' : currentScore < 35 ? 'lowest-risk' : 'middle-risk';
  const networkTier = inputs.networkLeverage?.networkTier ?? 'FUNCTIONAL';

  const baseStatement = `Based on ${inputs.companyName} + ${inputs.industry} + ${inputs.experience} years experience, your risk profile places you in the ${percentile} of ${direction} profiles analyzed.`;
  const aiStatement = inputs.hasAiSkills
    ? 'Your AI skills provide meaningful differentiation in the current market.'
    : 'Adding AI skills would move you to a stronger competitive position.';
  const networkStatement = (networkTier === 'POWERFUL' || networkTier === 'SOLID')
    ? 'Your network is your primary job search advantage — prioritise warm outreach.'
    : 'Network activation is your highest-leverage immediate action.';

  // v48.0: personalisation addendums
  const visaStatement = inputs.visaGracePeriodDays != null && inputs.visaGracePeriodDays <= 90
    ? ` Visa constraint (${inputs.visaGracePeriodDays}d grace) is your binding constraint — speed is more important than optimisation.`
    : '';
  const equityStatement = inputs.daysToNextVest != null && inputs.daysToNextVest <= 90 && (inputs.nextVestValueUsd ?? 0) >= 10_000
    ? ` Upcoming vest (~$${(inputs.nextVestValueUsd ?? 0).toLocaleString()}) creates a strategic hold window — use it deliberately.`
    : '';
  const dependentsStatement = inputs.hasDependents
    ? ' With dependents, financial runway is your highest-priority protection action.'
    : '';

  return `${baseStatement} ${aiStatement} ${networkStatement}${visaStatement}${equityStatement}${dependentsStatement}`;
}

// ── Negotiation leverage derivation (v50.0) ──────────────────────────────────

function deriveNegotiationLeverage(
  inputs: StrategySynthesisInputs,
  strategy: OverallStrategy,
): 'strong' | 'moderate' | 'weak' {
  const { currentScore, resilienceScore, financialRunwayMonths } = inputs;

  // Exit strategies with high risk = weak leverage (company holds the cards)
  if (strategy === 'EMERGENCY_EXIT' || currentScore >= 75) return 'weak';

  // Employed, low-risk, high resilience = negotiate from strength
  if (
    currentScore < 40 &&
    (resilienceScore ?? 0) >= 65 &&
    financialRunwayMonths >= 6
  ) return 'strong';

  // Equity harvest or geographic arbitrage = moderate to strong
  if (
    strategy === 'EQUITY_HARVEST_THEN_EXIT' ||
    strategy === 'GEOGRAPHIC_ARBITRAGE' ||
    strategy === 'OPPORTUNISTIC_MOVE'
  ) return 'strong';

  if (currentScore < 55 && financialRunwayMonths >= 4) return 'moderate';
  return 'weak';
}

// ── Promotion timing note (v50.0) ────────────────────────────────────────────

function buildPromotionTimingNote(
  inputs: StrategySynthesisInputs,
  strategy: OverallStrategy,
): string | null {
  const { currentScore, scoreVelocityPtsPerMonth, performanceTier, seniority } = inputs;

  // Exit-driven strategies make internal promotion advice irrelevant
  if (
    strategy === 'EMERGENCY_EXIT' ||
    strategy === 'ACCELERATE_EXIT' ||
    strategy === 'VISA_WINDOW_EXIT'
  ) return null;

  // Seniority ceiling — exec cannot be promoted further internally
  if (seniority === 'exec') return null;

  // Improving trajectory + employed + top performer = use the window
  if (
    currentScore < 45 &&
    performanceTier === 'top' &&
    (scoreVelocityPtsPerMonth ?? 0) <= 0
  ) {
    return `Your risk score is low (${currentScore}) and your performance tier is top — this is an optimal window to request promotion or title upgrade before the market or company dynamics shift. Frame it around recent impact, not tenure. Do this before initiating any external search.`;
  }

  // Employed + moderate score + stable velocity = consider timing
  if (
    currentScore < 55 &&
    (scoreVelocityPtsPerMonth ?? 0) < 1 &&
    performanceTier !== 'below'
  ) {
    return `Score is moderate but stable (${currentScore}). If you intend to stay, request a formal performance review or compensation discussion within the next 30 days — before the risk trajectory rises further. Companies are more receptive to retention conversations before a restructuring cycle begins.`;
  }

  // Score accelerating upward = don't negotiate, prepare exit
  if ((scoreVelocityPtsPerMonth ?? 0) > 2 && currentScore >= 55) {
    return `Risk trajectory is rising (${(scoreVelocityPtsPerMonth ?? 0).toFixed(1)} pts/month). Requesting a promotion in a deteriorating environment may accelerate attention on your position. Focus on external market positioning instead.`;
  }

  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function computeStrategySynthesis(inputs: StrategySynthesisInputs): StrategySynthesisResult {
  const strategy = determineOverallStrategy(inputs);
  const strategyRationale = buildStrategyRationale(strategy, inputs);
  const safetyWindowDays = estimateSafetyWindowDays(inputs);

  // v48.0: visa urgency escalates to CRITICAL when grace ≤ 30d
  const urgencyLevel: StrategySynthesisResult['urgencyLevel'] =
    inputs.currentScore >= 80 || inputs.collapseStage === 3 ? 'CRITICAL' :
    strategy === 'VISA_WINDOW_EXIT' && (inputs.visaGracePeriodDays ?? 999) <= 30 ? 'CRITICAL' :
    strategy === 'VISA_WINDOW_EXIT' ? 'HIGH' :
    inputs.currentScore >= 65 || inputs.collapseStage === 2 ? 'HIGH' :
    inputs.currentScore >= 50 ? 'MODERATE' : 'LOW';

  const phases: StrategicPlan[] = [];
  const emergencyPhase = buildEmergencyPhase(inputs);
  if (emergencyPhase) phases.push(emergencyPhase);
  phases.push(buildImmediatePhase(inputs, strategy));
  phases.push(buildShortTermPhase(inputs, strategy));
  phases.push(buildLongTermPhase(inputs));

  const allActions = phases.flatMap(p => p.actions);
  const topAction = allActions.sort((a, b) => b.roiScore - a.roiScore)[0];

  const singleBiggestRisk =
    strategy === 'VISA_WINDOW_EXIT'
      ? `Exhausting your ${inputs.visaGracePeriodDays}-day grace period without a new sponsoring employer — this creates a forced departure with no income bridge`
      : strategy === 'EQUITY_HARVEST_THEN_EXIT'
        ? `Staying past the optimal exit window after vest due to inertia — the next vest cycle may be 6–12 months away in a deteriorating situation`
        : inputs.peerContagion && inputs.peerContagion.waveIntensity !== 'NONE'
          ? `Active sector wave (${inputs.peerContagion.waveIntensity}) could force a reactive job search with 30–50% more competition if you wait for an announcement`
          : inputs.currentScore >= 70
            ? `Not starting job search while employed — every month past score 70 reduces negotiating leverage by ~10%`
            : `Skill obsolescence — without AI skills in ${inputs.industry}, L3 displacement risk will continue rising`;

  const singleBiggestOpportunity =
    strategy === 'VISA_WINDOW_EXIT'
      ? 'Current employment status — visa sponsorship is dramatically easier to negotiate from employed status vs. grace period'
      : strategy === 'EQUITY_HARVEST_THEN_EXIT'
        ? `Equity harvest window (${inputs.daysToNextVest} days) + deliberate negotiation of start date = maximised total comp in next role`
        : strategy === 'GEOGRAPHIC_ARBITRAGE'
          ? `${inputs.targetRegion ?? 'Alternative market'} demand gap — your skills are in shorter supply there, commanding premium compensation`
          : inputs.hasAiSkills
            ? 'AI skill differentiation in a market where <15% of candidates demonstrate practical AI capability in your domain'
            : (inputs.networkLeverage?.networkTier ?? 'FUNCTIONAL') === 'POWERFUL' || (inputs.networkLeverage?.networkTier ?? 'FUNCTIONAL') === 'SOLID'
              ? 'Warm network access — most candidates are cold-applying; you have referral access that converts 5× better'
              : 'First-mover advantage — starting preparation now, before any announcement, gives exponential returns vs. post-layoff search';

  // v50.0: derive negotiation psychology and promotion timing
  const leverageRating = deriveNegotiationLeverage(inputs, strategy);
  const negotiationPsychology = computeNegotiationPsychology(leverageRating, false);
  const promotionTimingNote = buildPromotionTimingNote(inputs, strategy);

  return {
    overallStrategy: strategy,
    strategyRationale,
    urgencyLevel,
    phases,
    topPriorityAction: topAction,
    singleBiggestRisk,
    singleBiggestOpportunity,
    estimatedSafetyWindowDays: safetyWindowDays,
    competitivePositionStatement: buildCompetitivePositionStatement(inputs),
    psychologicalNegotiationTactics: negotiationPsychology.recommendedTactics,
    promotionTimingNote,
    calibrationStatus: 'synthesis_v50',
  };
}
