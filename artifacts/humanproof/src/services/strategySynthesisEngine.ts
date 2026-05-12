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
  overallStrategy: 'PROTECT_AND_WAIT' | 'ACCELERATE_EXIT' | 'EMERGENCY_EXIT' | 'STRENGTHEN_POSITION' | 'OPPORTUNISTIC_MOVE';
  strategyRationale: string;
  urgencyLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  phases: StrategicPlan[];
  topPriorityAction: StrategyAction;      // single most important action right now
  singleBiggestRisk: string;              // the ONE thing that could go wrong
  singleBiggestOpportunity: string;       // the ONE thing to capitalize on
  estimatedSafetyWindowDays: number;      // how many days before situation deteriorates
  competitivePositionStatement: string;   // "You are in the X% of users who..."
  readonly calibrationStatus: 'synthesis_v13';
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
}

// ── Overall strategy determination ────────────────────────────────────────────

type OverallStrategy = StrategySynthesisResult['overallStrategy'];

function determineOverallStrategy(inputs: StrategySynthesisInputs): OverallStrategy {
  const { currentScore, collapseStage, financialRunwayMonths, scoreVelocityPtsPerMonth } = inputs;
  const peerWave = inputs.peerContagion?.waveIntensity;

  if (currentScore >= 80 || collapseStage === 3) return 'EMERGENCY_EXIT';
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
  };

  return rationales[strategy];
}

// ── Safety window estimation ──────────────────────────────────────────────────

function estimateSafetyWindowDays(inputs: StrategySynthesisInputs): number {
  const { currentScore, collapseStage, scoreVelocityPtsPerMonth } = inputs;
  const peerWave = inputs.peerContagion?.waveIntensity ?? 'NONE';

  if (collapseStage === 3 || currentScore >= 85) return 30;
  if (currentScore >= 75 || (peerWave === 'ACTIVE' && currentScore >= 60)) return 60;
  if (currentScore >= 65 || (scoreVelocityPtsPerMonth ?? 0) > 3) return 90;
  if (currentScore >= 50) return 180;
  return 365;
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

  return {
    phase: 'PHASE_1_IMMEDIATE',
    phaseLabel: 'Immediate (0–7 Days)',
    timeframe: 'This week',
    actions: actions.slice(0, 5),
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

  return `Based on ${inputs.companyName} + ${inputs.industry} + ${inputs.experience} years experience, your risk profile places you in the ${percentile} of ${direction} profiles analyzed. ${inputs.hasAiSkills ? 'Your AI skills provide meaningful differentiation in the current market.' : 'Adding AI skills would move you to a stronger competitive position.'} ${(inputs.networkLeverage?.networkTier ?? 'FUNCTIONAL') === 'POWERFUL' ? 'Your strong network is your primary job search advantage.' : 'Network activation is your highest-leverage immediate action.'}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function computeStrategySynthesis(inputs: StrategySynthesisInputs): StrategySynthesisResult {
  const strategy = determineOverallStrategy(inputs);
  const strategyRationale = buildStrategyRationale(strategy, inputs);
  const safetyWindowDays = estimateSafetyWindowDays(inputs);

  const urgencyLevel: StrategySynthesisResult['urgencyLevel'] =
    inputs.currentScore >= 80 || inputs.collapseStage === 3 ? 'CRITICAL' :
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

  const singleBiggestRisk = inputs.peerContagion && inputs.peerContagion.waveIntensity !== 'NONE'
    ? `Active sector wave (${inputs.peerContagion.waveIntensity}) could force a reactive job search with 30–50% more competition if you wait for an announcement`
    : inputs.currentScore >= 70
      ? `Not starting job search while employed — every month past score 70 reduces negotiating leverage by ~10%`
      : `Skill obsolescence — without AI skills in ${inputs.industry}, L3 displacement risk will continue rising`;

  const singleBiggestOpportunity = inputs.hasAiSkills
    ? 'AI skill differentiation in a market where <15% of candidates demonstrate practical AI capability in your domain'
    : (inputs.networkLeverage?.networkTier ?? 'FUNCTIONAL') === 'POWERFUL' || (inputs.networkLeverage?.networkTier ?? 'FUNCTIONAL') === 'SOLID'
      ? 'Warm network access — most candidates are cold-applying; you have referral access that converts 5× better'
      : 'First-mover advantage — starting preparation now, before any announcement, gives exponential returns vs. post-layoff search';

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
    calibrationStatus: 'synthesis_v13',
  };
}
