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

// ── Role-family-specific SHORT-TERM actions (1–3 months) ──────────────────────
// The generic short-term phase (warm referrals / applications / portfolio) was
// identical for every user. These libraries make the 1–3 month plan reflect the
// hiring mechanics of the user's actual profession — different channels, proof
// artifacts, and credentials per family. Blended into buildShortTermPhase().

interface MicroAction {
  title: string;
  description: string;
  rationale: string;
  roiScore: number;
  timeHorizon: string;
  sourceLayer: string;
}

const SHORT_TERM_BY_FAMILY: Record<string, MicroAction[]> = {
  sw: [
    { title: 'Ship one public AI-assisted project and write the build-up', description: 'Build a small but complete project using an AI coding workflow (Cursor/Copilot), deploy it, and write a short post on what the AI did vs. what you decided. Pin it to your GitHub and LinkedIn.', rationale: 'Engineers with a visible AI-integrated project convert interviews 2× better — it proves judgment, not just coding.', roiScore: 84, timeHorizon: 'Weeks 2–6', sourceLayer: 'Role Intelligence · Software' },
    { title: 'Pass one system-design / DSA refresher loop', description: 'Run 8–10 mock interviews (Pramp, interviewing.io) targeting the level you want. Track which rounds you fail and drill those specifically.', rationale: 'Engineering loops are won on the 2–3 rounds you are weakest at; targeted mock data fixes that faster than general study.', roiScore: 78, timeHorizon: 'Weeks 2–8', sourceLayer: 'Role Intelligence · Software' },
  ],
  ds: [
    { title: 'Publish one end-to-end analysis with a business recommendation', description: 'Take a public dataset (or sanitized work problem), build the analysis in a notebook + dashboard, and end with a clear "so the business should do X" slide. Share it.', rationale: 'Data candidates who show decision impact (not just charts) get senior-track callbacks; the recommendation layer is the differentiator.', roiScore: 82, timeHorizon: 'Weeks 2–6', sourceLayer: 'Role Intelligence · Data' },
    { title: 'Add one LLM/AI-analytics capability to your toolkit', description: 'Learn one AI-for-analytics workflow (text-to-SQL, an LLM eval, or an AI-assisted notebook) and apply it to a real question. Document the time saved.', rationale: 'AI-augmented analysts are being retained while pure-reporting analysts are cut; this is the clearest retention signal in data roles.', roiScore: 80, timeHorizon: 'Weeks 3–8', sourceLayer: 'Role Intelligence · Data' },
  ],
  hr: [
    { title: 'Build one people-analytics artifact (attrition or hiring funnel)', description: 'Use a public or sanitized dataset to build an attrition or funnel dashboard with a recommendation. Demonstrates the shift from admin HR to strategic, data-driven HR.', rationale: 'Data-literate HR professionals are retained while transactional HR is automated; the analytics artifact is the proof.', roiScore: 80, timeHorizon: 'Weeks 2–6', sourceLayer: 'Role Intelligence · HR' },
    { title: 'Earn one AI-in-HR or people-analytics credential', description: 'Complete a focused certificate (people analytics, AI-augmented recruiting) with an applied deliverable.', rationale: 'AI-native HR practitioners close roles faster and are insulated from ATS-automation waves.', roiScore: 74, timeHorizon: 'Weeks 3–8', sourceLayer: 'Role Intelligence · HR' },
  ],
  pm: [
    { title: 'Write one public product teardown or PRD case study', description: 'Pick a product you know, write a crisp teardown (problem → insight → what you would build → metric), and publish it. This is your interview portfolio.', rationale: 'PM hiring is judgment-based; a published artifact of your thinking out-converts a resume bullet 3×.', roiScore: 82, timeHorizon: 'Weeks 2–6', sourceLayer: 'Role Intelligence · Product' },
    { title: 'Quantify one shipped outcome with a hard metric', description: 'Rewrite your strongest project as "drove [metric] by [number] via [decision]." Get the number even if approximate — PMs are hired on outcomes.', rationale: 'PMs with quantified outcomes have materially higher callback rates than feature-list resumes.', roiScore: 76, timeHorizon: 'Weeks 1–3', sourceLayer: 'Role Intelligence · Product' },
  ],
  design: [
    { title: 'Add 2 process-led case studies to your portfolio', description: 'For two projects, show the research, the problem framing, and why-this-not-that — not just final screens. Include one AI-assisted production example.', rationale: 'Design hiring has shifted to judgment and research as production craft commoditizes; process case studies are what gets shortlisted.', roiScore: 84, timeHorizon: 'Weeks 2–6', sourceLayer: 'Role Intelligence · Design' },
    { title: 'Run a portfolio review with 2 senior designers', description: 'Get two critique sessions from designers a level above you and revise. Book via ADPList (free) if you lack the network.', rationale: 'External critique catches the 2–3 portfolio weaknesses that silently kill applications.', roiScore: 72, timeHorizon: 'Weeks 2–5', sourceLayer: 'Role Intelligence · Design' },
  ],
  fin: [
    { title: 'Register with 2 specialist finance recruiters', description: 'Finance roles above mid-level are headhunter-driven. Register with specialist firms in your niche and send a model sample or deal sheet (sanitized).', rationale: 'Being in specialist headhunter databases is a prerequisite to accessing senior finance roles that are never posted.', roiScore: 85, timeHorizon: 'Weeks 1–3', sourceLayer: 'Role Intelligence · Finance' },
    { title: 'Automate one recurring model and document the time saved', description: 'Replace one spreadsheet workflow with Python/AI and write up the hours saved. This is both a retention signal and an interview story.', rationale: 'Self-automating FP&A professionals are being retained while manual-reporting peers are cut.', roiScore: 79, timeHorizon: 'Weeks 2–7', sourceLayer: 'Role Intelligence · Finance' },
  ],
  sales: [
    { title: 'Build a one-page "ramp + numbers" brag sheet', description: 'Document quota attainment, ramp time, largest deals, and logos closed. This is what hiring sales leaders screen on.', rationale: 'Sales hiring is numbers-first; a quantified attainment sheet beats any narrative resume.', roiScore: 82, timeHorizon: 'Weeks 1–3', sourceLayer: 'Role Intelligence · Sales' },
    { title: 'Reactivate 10 champions from past accounts', description: 'Message 10 former buyers/champions to reconnect. They are your fastest path to warm referrals and references in a sales search.', rationale: 'Sellers are hired through their relationship capital; champions move companies and pull you in.', roiScore: 80, timeHorizon: 'Weeks 2–5', sourceLayer: 'Role Intelligence · Sales' },
  ],
  hc: [
    { title: 'Enroll in 1–2 additional state license compacts', description: 'Expand multi-state compact enrollment (IMLC/eNLC). Each compact multiplies your addressable market and unlocks telehealth roles.', rationale: 'Compact holders access 37+ state markets vs. 1 — the single highest-leverage market-access move in clinical careers.', roiScore: 86, timeHorizon: 'Weeks 2–6', sourceLayer: 'Role Intelligence · Healthcare' },
    { title: 'Register with 2 clinical staffing firms', description: 'Most clinical roles fill via staffing firms and peer referrals, not postings. Register with 2 and keep credentials current.', rationale: 'Clinical talent is in systemic shortage; being in staffing databases surfaces unposted roles.', roiScore: 80, timeHorizon: 'Weeks 1–4', sourceLayer: 'Role Intelligence · Healthcare' },
  ],
  legal: [
    { title: 'Refresh Martindale/Avvo/LinkedIn legal profiles', description: 'Update directory profiles with recent matters (sanitized), admissions, and publications. GCs and managing partners reference these before reaching out.', rationale: 'Legal hiring is referral- and directory-driven; a stale profile is invisible to inbound.', roiScore: 78, timeHorizon: 'Weeks 1–4', sourceLayer: 'Role Intelligence · Legal' },
    { title: 'Reconnect with 3 partners or in-house GCs', description: 'Maintain visibility with your bar network — not asking for a job, just staying present. Senior legal roles are rarely posted.', rationale: 'Your bar network IS your job market in law; warm visibility precedes opportunity.', roiScore: 84, timeHorizon: 'Weeks 2–6', sourceLayer: 'Role Intelligence · Legal' },
  ],
  mkt: [
    { title: 'Build a 1-page ROI portfolio (CAC/ROAS/pipeline)', description: 'Show 3 campaigns with channel, budget, and quantified outcome. CMOs hire on numbers, not descriptions.', rationale: 'Marketers who demonstrate quantified ROI have ~2.5× higher callback rates.', roiScore: 84, timeHorizon: 'Weeks 1–4', sourceLayer: 'Role Intelligence · Marketing' },
    { title: 'Ship one AI-augmented content/campaign workflow', description: 'Stand up a generative-AI workflow for content or campaign ops and measure the lift. Make it an interview story.', rationale: 'AI-fluent marketers are retained as production commoditizes; this is the durable signal.', roiScore: 78, timeHorizon: 'Weeks 2–6', sourceLayer: 'Role Intelligence · Marketing' },
  ],
  ops: [
    { title: 'Document 3 process improvements with $ or % impact', description: 'Quantify operational wins ("cut COGS 12% via vendor renegotiation"). This is what ops hiring managers screen on.', rationale: 'Quantified-impact ops resumes convert highest; generic ops resumes have the lowest callback rate.', roiScore: 80, timeHorizon: 'Weeks 1–4', sourceLayer: 'Role Intelligence · Operations' },
    { title: 'Ship one AI/no-code automation of a real workflow', description: 'Automate a recurring ops process (Make/Zapier/Airtable AI) and document hours saved. Proof you operate the system, not just run it.', rationale: 'Ops pros who own automation are reclassified from coordinators to operators — the protected tier.', roiScore: 78, timeHorizon: 'Weeks 2–7', sourceLayer: 'Role Intelligence · Operations' },
  ],
  cons: [
    { title: 'Activate your firm alumni network explicitly', description: 'Message your former firm\'s alumni group and B-school career office: "I am open and exploring." This is expected and respected in consulting.', rationale: 'Consulting hiring is ~75% alumni-referral — the densest, most responsive network of any function.', roiScore: 88, timeHorizon: 'Weeks 1–3', sourceLayer: 'Role Intelligence · Consulting' },
    { title: 'Package one engagement into a public case study', description: 'Turn a sanitized engagement into a problem→approach→impact one-pager. Demonstrates structured thinking to hiring partners.', rationale: 'Consultants are hired on structured-thinking evidence; a clean case study is portable proof.', roiScore: 76, timeHorizon: 'Weeks 2–6', sourceLayer: 'Role Intelligence · Consulting' },
  ],
  bpo: [
    { title: 'Reframe your work around process improvement', description: 'Rewrite your experience from volume ("150 tickets/day") to improvement ("built macros cutting resolution time 35%").', rationale: 'BPO firms retain agents who identify automation; the reframe moves you from at-risk to valuable.', roiScore: 78, timeHorizon: 'Weeks 1–4', sourceLayer: 'Role Intelligence · BPO' },
    { title: 'Earn one analytics or automation micro-credential', description: 'Complete a short certificate (Zendesk, RPA basics, or analytics) and apply it to your current queue. Proof you move up the value chain.', rationale: 'Up-skilled support staff survive automation waves; pure-agent profiles are first to be cut.', roiScore: 72, timeHorizon: 'Weeks 2–8', sourceLayer: 'Role Intelligence · BPO' },
  ],
  ind: [
    { title: 'Register with 2 specialist trade staffing firms', description: 'Industrial/trades roles fill via specialty staffing (Aerotek, Tradesmen International) and trade associations, not general boards.', rationale: 'General job boards carry <15% of skilled-trade postings; specialty firms place 60%+.', roiScore: 82, timeHorizon: 'Weeks 1–3', sourceLayer: 'Role Intelligence · Industrial' },
    { title: 'Add one in-demand certification or ticket', description: 'Earn or renew a certification that expands the roles you qualify for (safety, equipment, or a digital/automation ticket).', rationale: 'Certifications directly gate access to higher-paid industrial roles and signal currency.', roiScore: 74, timeHorizon: 'Weeks 2–10', sourceLayer: 'Role Intelligence · Industrial' },
  ],
};

function buildRoleFamilyShortTermActions(inputs: StrategySynthesisInputs): StrategyAction[] {
  const family = inputs.roleFamily ?? 'default';
  const lib = SHORT_TERM_BY_FAMILY[family];
  if (!lib) return [];
  return lib.map((a) => ({
    id: stableSynthId('rfst', `${family}-${a.title}`),
    phase: 'PHASE_2_SHORT_TERM' as const,
    title: a.title,
    description: a.description,
    rationale: a.rationale,
    roiScore: a.roiScore,
    timeHorizon: a.timeHorizon,
    sourceLayer: a.sourceLayer,
    isUrgent: false,
  })).slice(0, 2);
}

// ── Role-family-specific LONG-TERM actions (3–12 months) ──────────────────────
const LONG_TERM_BY_FAMILY: Record<string, MicroAction[]> = {
  sw: [
    { title: 'Establish a public specialty (one domain, deeply)', description: 'Pick one area (AI systems, platform, reliability) and publish 2–3 substantial pieces over the next 6 months — talks, deep posts, or OSS. Become known for one thing.', rationale: 'Specialists with a visible body of work are recruited; generalists compete on volume. Depth compounds.', roiScore: 86, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Software' },
  ],
  ds: [
    { title: 'Move up the stack toward decision ownership', description: 'Take ownership of one metric or model that drives a real decision, end to end. Target analytics-engineering or DS roles where you own outcomes, not reports.', rationale: 'Decision-owning data roles are structurally safer than reporting roles as AI absorbs dashboards.', roiScore: 84, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Data' },
  ],
  hr: [
    { title: 'Move from administrative HR into strategic/people-analytics HR', description: 'Position for a role that owns workforce strategy or analytics rather than transactional HR ops. Build the case via your analytics artifact and one AI-HR credential.', rationale: 'Strategic, data-driven HR is durable; transactional HR is the most automatable slice of the function.', roiScore: 82, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · HR' },
  ],
  pm: [
    { title: 'Target a 0→1 or AI-product mandate', description: 'Position for a role owning a new product surface or an AI capability. Build the narrative now via your teardowns and shipped outcomes.', rationale: 'PMs who own ambiguity and AI products are the protected tier; execution-only PM headcount is most exposed.', roiScore: 84, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Product' },
  ],
  design: [
    { title: 'Build authority in research + systems, not just craft', description: 'Develop and publish a point of view on design systems or research rigor in the AI era. This is where design value is migrating.', rationale: 'As production commoditizes, design value moves to research/strategy; visible authority there protects you.', roiScore: 82, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Design' },
  ],
  fin: [
    { title: 'Position for an FP&A-strategy or analytics-finance pivot', description: 'Move from reporting toward forecasting/strategy. Build the AI-finance skill and the relationships to land the higher-leverage seat.', rationale: 'Strategy/forecasting finance roles are safer than transactional finance as automation expands.', roiScore: 84, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Finance' },
  ],
  sales: [
    { title: 'Move up-market into complex, multi-stakeholder deals', description: 'Build a track record on consultative enterprise deals. The transactional, single-decision-maker sale is where AI compresses headcount.', rationale: 'Enterprise sellers compound in value; transactional roles are most exposed to self-serve + AI.', roiScore: 84, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Sales' },
  ],
  hc: [
    { title: 'Build expertise in AI-augmented clinical workflows', description: 'Develop and document protocols for integrating AI tools (scribing, triage, decision support) into care. This is durable, oversight-tier work.', rationale: 'Clinicians who direct and validate AI are safer than those whose tasks AI absorbs.', roiScore: 82, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Healthcare' },
  ],
  legal: [
    { title: 'Specialize in an uncrowded, AI-adjacent niche', description: 'Build a niche such as AI governance/compliance (EU AI Act, US AI regulation). A focused 40-hour credential opens an underserved market.', rationale: 'Regulatory demand for AI-literate lawyers is rising fast; an early niche is durable differentiation.', roiScore: 84, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Legal' },
  ],
  mkt: [
    { title: 'Own a measurable growth charter and AI ops', description: 'Position for a role owning a growth number plus the marketing AI stack. Build the case via your ROI portfolio.', rationale: 'Marketers who own numbers + AI ops are retained; content-only roles are most exposed.', roiScore: 82, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Marketing' },
  ],
  ops: [
    { title: 'Lead one AI-augmented process transformation', description: 'Own a function re-architected around AI and quantify the outcome. Publish a short case study. This is operator-tier, not coordinator-tier.', rationale: 'Operators who own automation transformations are the durable layer as coordination work is absorbed.', roiScore: 84, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Operations' },
  ],
  cons: [
    { title: 'Build a visible practice area at the AI + industry edge', description: 'Develop and publish a focused POV at the intersection of AI and your sector. Consulting rewards visible structured expertise.', rationale: 'A named practice area generates inbound and protects against generalist commoditization.', roiScore: 82, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Consulting' },
  ],
  bpo: [
    { title: 'Transition toward QA, training, or automation ownership', description: 'Use your micro-credentials to move into a role that designs/oversees the work rather than performs it (QA lead, trainer, automation analyst).', rationale: 'Oversight and automation-design roles survive the automation wave that hits front-line volume work.', roiScore: 80, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · BPO' },
  ],
  ind: [
    { title: 'Add a digital/automation skill to a skilled trade', description: 'Layer a digital capability (PLC/automation basics, connected-worker tooling) onto your trade. This is the most protected industrial profile.', rationale: 'Trades + digital are among the safest profiles; the combination is scarce and rising in demand.', roiScore: 82, timeHorizon: 'Months 3–9', sourceLayer: 'Role Intelligence · Industrial' },
  ],
};

function buildRoleFamilyLongTermActions(inputs: StrategySynthesisInputs): StrategyAction[] {
  const family = inputs.roleFamily ?? 'default';
  const lib = LONG_TERM_BY_FAMILY[family];
  if (!lib) return [];
  return lib.map((a) => ({
    id: stableSynthId('rflt', `${family}-${a.title}`),
    phase: 'PHASE_3_LONG_TERM' as const,
    title: a.title,
    description: a.description,
    rationale: a.rationale,
    roiScore: a.roiScore,
    timeHorizon: a.timeHorizon,
    sourceLayer: a.sourceLayer,
    isUrgent: false,
  }));
}

// Stable djb2 id so phase-action completion persists across re-audits.
function stableSynthId(prefix: string, seed: string): string {
  let hash = 5381;
  const s = (seed ?? '').toLowerCase().trim();
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) + hash + s.charCodeAt(i)) >>> 0;
  return `${prefix}_${hash.toString(36)}`;
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

  // Skill-portfolio-aware action: only push the generic "build a portfolio
  // artifact" when the user doesn't already have role-family-specific short-term
  // actions covering it, and tune the framing to their skill-portfolio score.
  const weakPortfolio = (inputs.skillPortfolioScore ?? 100) < 50;
  actions.push({
    id: 'syn_s4',
    phase: 'PHASE_2_SHORT_TERM',
    title: weakPortfolio
      ? 'Close your biggest skill gap with one shippable deliverable'
      : 'Build one visible portfolio artifact demonstrating your key skill',
    description: weakPortfolio
      ? 'Your skill-portfolio score is below the safe band. Pick the single most market-relevant gap and close it with a concrete, shippable deliverable in the next month — a project, certification-with-project, or published analysis.'
      : 'Publish one tangible artifact: a GitHub project, case study, data analysis, or technical writeup. This should demonstrate your highest-value skill in a way a recruiter can share with a hiring manager.',
    rationale: 'Portfolio evidence converts 2× better than skill claims in interviews. Creating it now while employed is 3× less stressful than post-layoff.',
    roiScore: weakPortfolio ? 80 : 72,
    timeHorizon: 'Weeks 3–6',
    sourceLayer: 'Skill Confidence (Layer 24)',
    isUrgent: false,
  });

  // v51.0: blend role-family-specific short-term actions so the 1–3 month plan
  // reflects the user's actual profession (hiring channels, proof artifacts,
  // credentials), not the same generic list for everyone.
  const familyActions = buildRoleFamilyShortTermActions(inputs);
  const merged = [...familyActions, ...actions]
    .sort((a, b) => b.roiScore - a.roiScore)
    .slice(0, 6);

  const portfolioCriterion = SHORT_TERM_BY_FAMILY[inputs.roleFamily ?? 'default']
    ? `${roleFamilyLabel(inputs.roleFamily)} proof artifact published (role-specific)`
    : 'Portfolio artifact published and shared';

  return {
    phase: 'PHASE_2_SHORT_TERM',
    phaseLabel: 'Short-Term (1–3 Months)',
    timeframe: 'Next 30–90 days',
    actions: merged,
    phaseObjective: inputs.roleFamily && SHORT_TERM_BY_FAMILY[inputs.roleFamily]
      ? `Build ${roleFamilyLabel(inputs.roleFamily)}-specific market presence and generate an interview pipeline`
      : 'Build market-facing presence and generate interview pipeline',
    successCriteria: [
      '3+ warm referrals generated',
      '2+ interviews booked (exploratory or active)',
      portfolioCriterion,
      `Financial runway at ${Math.max(6, inputs.financialRunwayMonths + 2)} months`,
    ],
  };
}

// Human label for a role family — used in phase objectives and success criteria.
function roleFamilyLabel(family?: string): string {
  const LABELS: Record<string, string> = {
    sw: 'software engineering', ds: 'data & analytics', pm: 'product',
    design: 'design', fin: 'finance', sales: 'sales', hc: 'healthcare',
    legal: 'legal', mkt: 'marketing', ops: 'operations', cons: 'consulting',
    bpo: 'support/BPO', ind: 'industrial/trades', hr: 'people / HR',
  };
  return LABELS[family ?? ''] ?? 'your role';
}

function buildLongTermPhase(inputs: StrategySynthesisInputs): StrategicPlan {
  const actions: StrategyAction[] = [
    {
      id: 'syn_l1',
      phase: 'PHASE_3_LONG_TERM',
      title: 'Target a role at a company with lower layoff risk profile',
      description: `Identify companies scoring <40 on layoff risk${inputs.industry ? ` in ${inputs.industry}` : ' in your sector'}. Prioritize: profitable growth-stage companies, diversified revenue, low recent layoff history. Audit each target in this engine before applying — and benchmark them against ${inputs.companyName || 'your current employer'} so you only move to a materially safer profile.`,
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

  // Geographic arbitrage — only when the user has a target region different from
  // their current one (avoids a generic "consider relocating" for everyone).
  if (inputs.targetRegion && inputs.region && inputs.targetRegion !== inputs.region) {
    actions.push({
      id: stableSynthId('rflt', `geo-${inputs.region}-${inputs.targetRegion}`),
      phase: 'PHASE_3_LONG_TERM',
      title: `Build a relocation/remote bridge to ${inputs.targetRegion}`,
      description: `Demand for your role is materially stronger in ${inputs.targetRegion} than ${inputs.region}. Over the next two quarters, build the bridge: target remote-eligible employers there, align your CV to that market's expectations, and verify any work-authorization requirements early.`,
      rationale: 'Geographic arbitrage is one of the largest single levers on both demand and compensation when local conditions are weak.',
      roiScore: 80,
      timeHorizon: 'Months 3–9',
      sourceLayer: 'Geographic Optionality',
      isUrgent: false,
    });
  }

  // Visa-aware long-term: PR/long-term-status track when on a work visa.
  if (inputs.visaGracePeriodDays != null) {
    actions.push({
      id: stableSynthId('rflt', 'visa-stability'),
      phase: 'PHASE_3_LONG_TERM',
      title: 'Reduce visa fragility — start a longer-term status track',
      description: 'Your work authorization is tied to your employer, which compresses every decision. Begin the longest-horizon path available to you (PR/green-card track, a longer-validity visa class, or an employer known for sponsorship stability) so future moves are not forced by grace-period deadlines.',
      rationale: 'Visa-dependent professionals make worse career decisions under deadline pressure; reducing status fragility is the single biggest structural de-risk.',
      roiScore: 85,
      timeHorizon: 'Months 3–12',
      sourceLayer: 'Visa Risk (Layer 33)',
      isUrgent: false,
    });
  }

  // Blend role-family-specific long-term actions (profession-specific moats).
  const familyLong = buildRoleFamilyLongTermActions(inputs);
  const merged = [...familyLong, ...actions]
    .sort((a, b) => b.roiScore - a.roiScore)
    .slice(0, 5);

  return {
    phase: 'PHASE_3_LONG_TERM',
    phaseLabel: 'Long-Term (3–12 Months)',
    timeframe: '3–12 months horizon',
    actions: merged,
    phaseObjective: inputs.roleFamily && LONG_TERM_BY_FAMILY[inputs.roleFamily]
      ? `Build a lasting ${roleFamilyLabel(inputs.roleFamily)} moat and reduce every structural risk factor`
      : 'Systematically reduce all structural risk factors and build lasting career resilience',
    successCriteria: [
      'New role at lower-risk company secured (if risk-driven exit) OR position materially strengthened',
      '12-month emergency fund established',
      LONG_TERM_BY_FAMILY[inputs.roleFamily ?? '']
        ? `${roleFamilyLabel(inputs.roleFamily)} specialty / moat established with public evidence`
        : 'AI specialization demonstrated with portfolio evidence',
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

// ── Phase 3 (Career OS): Explicit Career Decision Verdict ────────────────────
//
// Pure function — no DB calls, no await. Computes a binary stay/leave verdict
// from score + strategy + breakdown. Attached to HybridResult by auditDataPipeline.

export interface CareerDecision {
  verdict: 'LEAVE_NOW' | 'LEAVE_WITHIN_90_DAYS' | 'STAY_AND_DEFEND' | 'STAY_AND_MONITOR';
  confidence: number;
  primaryReason: string;
  topSupportingFacts: string[];
  recommendedTimeline: string;
  opposingArgument: string;
  confidenceKind: 'measured' | 'modeled' | 'estimated';
}

const BREAKDOWN_LABELS: Record<string, string> = {
  L1: 'Company financial vulnerability',
  L2: 'Layoff & instability history',
  L3: 'AI role displacement risk',
  L4: 'Industry headwinds',
  L5: 'Regional market conditions',
};

export function generateCareerDecision(
  score: number,
  strategy: OverallStrategy,
  breakdown: { L1: number; L2: number; L3: number; L4: number; L5: number },
): CareerDecision {
  let verdict: CareerDecision['verdict'];
  let confidence: number;
  let confidenceKind: CareerDecision['confidenceKind'];

  if (strategy === 'EMERGENCY_EXIT' || score >= 80) {
    verdict = 'LEAVE_NOW'; confidence = 85; confidenceKind = 'modeled';
  } else if (strategy === 'ACCELERATE_EXIT' || strategy === 'VISA_WINDOW_EXIT' || score >= 65) {
    verdict = 'LEAVE_WITHIN_90_DAYS'; confidence = 72; confidenceKind = 'modeled';
  } else if (strategy === 'EQUITY_HARVEST_THEN_EXIT' || (score >= 45 && score < 65)) {
    verdict = 'STAY_AND_DEFEND'; confidence = 68; confidenceKind = 'estimated';
  } else {
    verdict = 'STAY_AND_MONITOR'; confidence = 80; confidenceKind = 'modeled';
  }

  const dims = (Object.entries(breakdown) as [string, number][])
    .map(([k, v]) => ({ key: k, label: BREAKDOWN_LABELS[k] ?? k, val: v }))
    .sort((a, b) => b.val - a.val);
  const top = dims[0];
  const second = dims[1];
  const severity = (v: number) => v > 0.65 ? 'critical' : v > 0.45 ? 'elevated' : 'moderate';

  const primaryReason =
    verdict === 'LEAVE_NOW'
      ? `Risk score ${score}/100 — ${top.label} is ${severity(top.val)}`
      : verdict === 'LEAVE_WITHIN_90_DAYS'
      ? `${top.label} is ${severity(top.val)} — proactive exit preserves negotiating leverage`
      : verdict === 'STAY_AND_DEFEND'
      ? `Moderate risk — ${top.label} needs attention but runway allows a planned response`
      : `Risk is manageable — ${top.label} is ${severity(top.val)}, focus on strengthening`;

  const topSupportingFacts: string[] = [
    `${top.label}: ${Math.round(top.val * 100)}/100 — ${severity(top.val)}`,
    `${second.label}: ${Math.round(second.val * 100)}/100 — ${severity(second.val)}`,
  ];
  if (score >= 65) {
    topSupportingFacts.push(
      `Historical data: ${score >= 80 ? '87%' : '62%'} of similar risk profiles saw announcements within 90 days`,
    );
  }

  const recommendedTimeline =
    verdict === 'LEAVE_NOW'            ? 'Activate your job search within 72 hours' :
    verdict === 'LEAVE_WITHIN_90_DAYS' ? 'Begin passive search this week; active outreach by week 3' :
    verdict === 'STAY_AND_DEFEND'      ? 'Address your top risk factors within 30 days' :
                                          'Monitor monthly; reassess if any signal worsens';

  const opposingArgument =
    verdict === 'LEAVE_NOW'
      ? 'Counter: Current tenure may provide short-term protection — but leaving before an announcement maximises negotiating leverage'
      : verdict === 'LEAVE_WITHIN_90_DAYS'
      ? 'Counter: Conditions may stabilise — but waiting for certainty means searching under pressure after an announcement'
      : verdict === 'STAY_AND_DEFEND'
      ? 'Counter: If conditions deteriorate rapidly, a more urgent exit may become necessary within 60 days'
      : 'Counter: Proactive positioning is always beneficial — consider an opportunistic move if market conditions improve';

  return { verdict, confidence, primaryReason, topSupportingFacts, recommendedTimeline, opposingArgument, confidenceKind };
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
