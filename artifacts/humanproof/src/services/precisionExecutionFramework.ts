/**
 * precisionExecutionFramework.ts — v49.0
 *
 * 30 / 60 / 90-DAY PRECISION EXECUTION PLAN
 *
 * The monthly roadmap tells you WHAT to do each month.
 * This engine tells you EXACTLY what to do on DAY 1, DAY 7, DAY 14...
 * with daily priorities, go/no-go checkpoints, and execution confidence scoring.
 *
 * PHILOSOPHY:
 *   Most career plans fail not because the advice is wrong but because:
 *   1. They don't tell you what to do on MONDAY MORNING
 *   2. They don't adapt when you miss a step
 *   3. They don't have emotional calibration (what if I'm terrified? exhausted? overconfident?)
 *   4. They treat a senior doctor the same as a junior analyst
 *
 * THIS ENGINE:
 *   → Generates Day 1-7 with SPECIFIC DAILY ACTIONS (not "this week" — TODAY)
 *   → Days 8-30 as weighted themes with daily check-in questions
 *   → Go/no-go gates with specific metrics ("if < X by Day 30, do Y immediately")
 *   → Emotional state calibration: scripts for fear, paralysis, overconfidence
 *   → Role-family-aware content: doctors get clinical network activation,
 *     lawyers get bar network protocol, engineers get portfolio/GitHub activation
 *   → Hiring season awareness: plans adapt to regional market cycles
 *   → Confidence scoring per horizon (how likely is this plan to yield the target outcome)
 */

import type { VisaRiskResult } from './visaRiskEngine';
import type { FinancialRunwayResult } from './financialRunwayIntelligence';

// ── Types ────────────────────────────────────────────────────────────────────

export type ExecutionUrgency = 'crisis' | 'elevated' | 'standard' | 'monitoring';
export type CareerTransitionGoal =
  | 'stay_and_protect'     // internal protection, not actively searching
  | 'parallel_search'      // searching while employed
  | 'active_job_search'    // primary focus is landing a new role
  | 'industry_switch'      // changing sectors, not just companies
  | 'role_elevation'       // targeting a level-up vs lateral move
  | 'retirement_prep';     // 3–7 years out, building financial independence

export type RoleFamily =
  | 'sw' | 'ds' | 'pm' | 'hr' | 'sales' | 'fin' | 'legal' | 'hc'
  | 'mkt' | 'ops' | 'design' | 'ind' | 'edu' | 'gov' | 'bpo' | 'cons'
  | 'default';

export interface DailyPriority {
  day: number;             // 1–90
  date?: string;           // ISO YYYY-MM-DD if today is known
  focus: string;           // "TODAY: Do this one thing before anything else"
  primaryAction: string;   // The single most important action today
  primaryDuration: string; // "30 min" | "2 hours"
  secondaryAction?: string;
  secondaryDuration?: string;
  endOfDayCheck: string;   // "By tonight, you should have [specific artifact]"
  motivationalFrame?: string;  // what this day's work actually means
}

export interface WeeklyMilestone {
  weekNumber: number;      // 1–12
  weekLabel: string;       // "Week 1: Foundation"
  byFridayGoal: string;    // specific, measurable outcome
  keyActions: string[];    // top 3 actions this week
  timeInvestment: string;  // "5 hours"
  goNoGoCheck: string;     // binary test — pass/fail
  failureRecovery: string; // "If you didn't complete this: do [X] on Saturday"
  confidenceBooster: string; // one action that boosts execution confidence
}

export interface HorizonPlan {
  horizon: '30-day' | '60-day' | '90-day';
  theme: string;
  themeSubtitle: string;
  keyObjective: string;           // single defining outcome for this period
  successDefinition: string;      // how to know you've succeeded
  failureDefinition: string;      // how to know the plan needs adjustment
  weeklyMilestones: WeeklyMilestone[];
  criticalDependencies: string[]; // prerequisites from previous horizon
  estimatedTimePerWeek: string;
  confidenceScore: number;        // 0–100: probability this horizon yields the objective
  marketTimingNote?: string;      // regional seasonality advice for this period
}

export interface EmotionalCalibration {
  stateId: 'fear_paralysis' | 'overconfidence' | 'exhaustion' | 'clarity';
  description: string;
  signYouAreHere: string;
  immediateIntervention: string;
  backOnTrackAction: string;
}

export interface PrecisionExecutionResult {
  overarchingNarrative: string;   // 2-sentence "here's your exact situation and plan"
  urgencyMode: ExecutionUrgency;
  roleFamily: RoleFamily;
  transitionGoal: CareerTransitionGoal;

  // Day-level precision (Days 1–14 in detail, Days 15–30 as themes)
  day1to7: DailyPriority[];
  day8to14: DailyPriority[];
  day15to30Theme: string;
  day15to30TopActions: string[];

  // Horizon plans
  horizon30: HorizonPlan;
  horizon60: HorizonPlan;
  horizon90: HorizonPlan;

  // Daily operating rhythm
  morningCheckInQuestion: string;   // ask yourself every morning
  weeklyReviewPrompt: string;        // Sunday evening reflection
  redFlags: string[];                // "If you notice X, escalate immediately"

  // Emotional calibration
  emotionalCalibration: EmotionalCalibration[];

  // Meta
  planCreatedDate: string;
  nextReauditDate: string;           // when to re-run this engine
  overallConfidence: number;         // 0–100 for entire 90-day plan
}

export interface PrecisionExecutionInputs {
  compositeScore: number;
  roleFamily: RoleFamily;
  workTypeKey: string;
  seniorityBracket: 'junior' | 'mid' | 'senior' | 'lead' | 'director' | 'executive';
  region: string;
  metro?: string | null;
  financialRunway: FinancialRunwayResult | null;
  visaRisk: VisaRiskResult | null;
  collapseStage: 1 | 2 | 3 | null;
  transitionGoal?: CareerTransitionGoal;
  skillPortfolioScore?: number;       // 0–100 from skillPortfolioFitEngine
  aiDisruptionRisk?: number;          // 0–1 from displacementTrajectory
  hasActiveInterviews?: boolean;      // user already has pipeline
  hasDependents?: boolean;
  today?: string;
}

// ── Utility helpers ──────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function determineUrgency(inputs: PrecisionExecutionInputs): ExecutionUrgency {
  if (inputs.collapseStage === 3 || inputs.compositeScore >= 78) return 'crisis';
  if (inputs.collapseStage === 2 || inputs.compositeScore >= 58) return 'elevated';
  if (inputs.compositeScore >= 38) return 'standard';
  return 'monitoring';
}

function determineTransitionGoal(inputs: PrecisionExecutionInputs, urgency: ExecutionUrgency): CareerTransitionGoal {
  if (inputs.transitionGoal) return inputs.transitionGoal;
  if (urgency === 'crisis') return 'active_job_search';
  if (urgency === 'elevated') return 'parallel_search';
  if (urgency === 'standard') return 'stay_and_protect';
  return 'stay_and_protect';
}

function getRunwayMonths(inputs: PrecisionExecutionInputs): number {
  return inputs.financialRunway?.runwayMonths ?? 12;
}

// ── Regional market timing intelligence ─────────────────────────────────────

const REGIONAL_HIRING_SEASONS: Record<string, {
  bestMonths: string;
  avoidMonths: string;
  currentAdvice: (today: string) => string;
}> = {
  IN: {
    bestMonths: 'January–March and July–September',
    avoidMonths: 'October–December (budget freeze) and April–June (Q1 wind-down)',
    currentAdvice: (today: string) => {
      const month = new Date(today).getMonth() + 1;
      if (month >= 1 && month <= 3) return 'PEAK SEASON: January–March is the best hiring window in India. Applications submitted now have 40% higher callback rates. Maximize outreach volume.';
      if (month >= 7 && month <= 9) return 'ACTIVE SEASON: July–September is a strong hiring period (post-appraisal, new budgets). Apply aggressively this window.';
      if (month >= 10 && month <= 12) return 'SLOW SEASON: Q4 in India is slower (budget planning, year-end freeze). Focus on relationship building rather than applications — convert in Q1.';
      return 'MODERATE SEASON: Q1 hiring wave is approaching. Begin outreach now so conversations are warm when budgets open in January.';
    },
  },
  US: {
    bestMonths: 'January–March (new budgets) and September–October (Q4 hiring push)',
    avoidMonths: 'Late November–December (holiday freeze)',
    currentAdvice: (today: string) => {
      const month = new Date(today).getMonth() + 1;
      if (month >= 1 && month <= 3) return 'PEAK SEASON: Q1 is historically the highest hiring velocity in US tech and finance. Budget headcount releases in January — apply now.';
      if (month >= 9 && month <= 10) return 'ACTIVE SEASON: September–October hiring push before year-end. Companies want roles filled before Q4 freeze.';
      if (month >= 11 && month <= 12) return 'SLOW SEASON: Companies entering holiday freeze. Excellent time to build relationships for January hiring wave — plant seeds now.';
      return 'MODERATE SEASON: Focus on applications at companies with active open headcount. Q1 wave is approaching.';
    },
  },
  UK: {
    bestMonths: 'September–November and January–February',
    avoidMonths: 'June–August (summer slowdown) and December',
    currentAdvice: (today: string) => {
      const month = new Date(today).getMonth() + 1;
      if (month >= 9 && month <= 11) return 'PEAK SEASON: September–November is UK\'s strongest hiring period. Apply aggressively.';
      if (month >= 6 && month <= 8) return 'SLOW SEASON: Summer slowdown. Decision makers on holiday. Focus on networking rather than applications.';
      return 'MODERATE SEASON: Standard hiring pace. Target companies with open headcount; avoid broad volume applications.';
    },
  },
  SG: {
    bestMonths: 'January–April and August–September',
    avoidMonths: 'Chinese New Year week (February) and end of year',
    currentAdvice: (today: string) => {
      const month = new Date(today).getMonth() + 1;
      if (month >= 1 && month <= 4) return 'ACTIVE SEASON: Post-Chinese New Year and Q1 budget releases drive strong Singapore hiring. Apply this window.';
      return 'MODERATE SEASON: Singapore hiring is year-round for tech roles. Focus on MNC GCCs and Singapore-headquartered tech companies.';
    },
  },
  DEFAULT: {
    bestMonths: 'January–March and Q3',
    avoidMonths: 'Major holiday periods',
    currentAdvice: (_: string) => 'Apply to companies with active open headcount. Market timing is moderate.',
  },
};

function getRegionalTiming(region: string, today: string): string {
  const key = (region ?? 'IN').toUpperCase().slice(0, 2);
  const data = REGIONAL_HIRING_SEASONS[key] ?? REGIONAL_HIRING_SEASONS.DEFAULT;
  return data.currentAdvice(today);
}

// ── Day-level content generators ─────────────────────────────────────────────

const DAY_CONTENT_BY_URGENCY_ROLE: Record<ExecutionUrgency, Record<RoleFamily | 'default', DailyPriority[]>> = {
  crisis: {
    sw: [
      { day: 1, focus: 'UNLOCK ACTION — this is the single most time-sensitive step', primaryAction: 'Update LinkedIn: rewrite headline from job title to value delivery statement ("Builds payment APIs at scale | 8yr backend | FinTech")', primaryDuration: '90 min', secondaryAction: 'Enable "Open to Work" recruiter-only mode', secondaryDuration: '5 min', endOfDayCheck: 'LinkedIn headline rewritten, Open to Work enabled, profile photo professional', motivationalFrame: 'The recruiter who reaches out tomorrow needs to see your profile today.' },
      { day: 2, focus: 'Referral identification — your fastest path to interviews', primaryAction: 'Search LinkedIn for 2nd-degree connections at your top 3 target companies. List names + connection paths for 8–10 people.', primaryDuration: '1.5 hours', secondaryAction: 'Draft personalised outreach messages (not templates — reference their specific work)', secondaryDuration: '45 min', endOfDayCheck: '8+ referral contacts identified, 3 messages drafted and ready to send', motivationalFrame: 'Referred candidates interview at 4× the rate of cold applicants. Today you build that list.' },
      { day: 3, focus: 'Send 3 warm referral messages today — no delay', primaryAction: 'Send the 3 best referral messages. Not "I\'m looking for a job" — "I\'d love to hear what your team is working on"', primaryDuration: '30 min', secondaryAction: 'Quantify your top 3 engineering contributions (scale handled, reliability improved, revenue impact)', secondaryDuration: '1 hour', endOfDayCheck: '3 messages sent. 3 impact bullets written.', motivationalFrame: 'The conversations that start today will produce offers in 4–6 weeks.' },
      { day: 4, focus: 'Resume precision targeting', primaryAction: 'Tailor your resume for your top target company\'s stack and values. Remove anything not relevant to their JD language.', primaryDuration: '2 hours', endOfDayCheck: 'One targeted resume variant ready for your #1 target company', motivationalFrame: '' },
      { day: 5, focus: 'First application — do not wait for perfection', primaryAction: 'Apply to your #1 target. Use referral path if available. Write a 3-paragraph cover: Why them (specific product), Why you (specific metric), Why now.', primaryDuration: '1.5 hours', secondaryAction: 'Research interview format at target (Glassdoor, Blind, team blog)', secondaryDuration: '45 min', endOfDayCheck: '1 application submitted', motivationalFrame: 'An imperfect application submitted today beats a perfect one submitted in 2 weeks.' },
      { day: 7, focus: 'Financial clarity — remove fear from decision-making', primaryAction: 'Calculate: (1) Current savings ÷ monthly expenses = runway months. (2) Your "walk-away number" for any offer. (3) First 3 expenses to cut if needed. Write these down.', primaryDuration: '1 hour', endOfDayCheck: 'Financial runway number documented. Walk-away floor established.', motivationalFrame: 'Knowing your numbers transforms financial anxiety into strategic clarity.' },
    ],
    hc: [
      { day: 1, focus: 'Activate clinical recruiter network — your #1 search channel', primaryAction: 'Register with 2 clinical staffing firms (AMN Healthcare + Locum Tenens International). Send updated CV. Mark availability start date.', primaryDuration: '2 hours', secondaryAction: 'Verify your clinical license is in good standing (state medical board website)', secondaryDuration: '30 min', endOfDayCheck: '2 recruiter registrations submitted. License status confirmed.', motivationalFrame: 'Clinical roles are 70% filled through recruiters — this IS your job search.' },
      { day: 2, focus: 'Multi-state licensure expansion', primaryAction: 'Check IMLC (physicians) or eNLC (nurses) compact enrollment. Enroll in 2 additional states. This expands your market by 4–8× overnight.', primaryDuration: '1 hour', secondaryAction: 'Review your DEA registration status and renewal date', secondaryDuration: '30 min', endOfDayCheck: 'Compact enrollment applications submitted. DEA status verified.' },
      { day: 3, focus: 'Telehealth platform registration', primaryAction: 'Apply to 2 telehealth platforms (Teladoc, MDLive, or Amazon Clinic depending on specialty). Income bridge + pipeline diversification.', primaryDuration: '2 hours', endOfDayCheck: '2 telehealth applications submitted' },
      { day: 4, focus: 'Update CV and clinical portfolio', primaryAction: 'Add last 2 years of procedures, publications, and quality metrics. Quantify: case volume, complication rate, patient satisfaction scores.', primaryDuration: '2 hours', endOfDayCheck: 'Clinical CV updated with quantified metrics' },
      { day: 5, focus: 'Network activation — peer referrals are dominant in healthcare', primaryAction: 'Contact 3 clinical colleagues at different health systems. Not asking for jobs — "catching up and discussing what\'s happening in the market."', primaryDuration: '1 hour', endOfDayCheck: '3 messages sent to clinical peers', motivationalFrame: '' },
      { day: 7, focus: 'Credentialing timeline mapping', primaryAction: 'Map the credentialing timeline at your target health systems (typically 60–120 days). This defines your earliest possible start date and informs offer negotiation.', primaryDuration: '1.5 hours', endOfDayCheck: 'Credentialing timelines mapped for top 3 target employers' },
    ],
    legal: [
      { day: 1, focus: 'Bar association network activation — 85% of legal roles are filled by referral', primaryAction: 'Send messages to 3 bar association contacts. Not "I\'m looking" — "Catching up — would love to hear what you\'re working on and share what I\'ve been doing." Legal culture expects and respects this.', primaryDuration: '1.5 hours', secondaryAction: 'Update Martindale-Hubbell and Avvo profiles with recent matters', secondaryDuration: '1 hour', endOfDayCheck: '3 bar network messages sent. Legal directory profiles updated.' },
      { day: 2, focus: 'Specialty positioning — generalists lose, specialists win', primaryAction: 'Identify your 1–2 practice area specialisations and ensure they are prominently featured in your bio, Martindale profile, and LinkedIn. This is what gets you called.', primaryDuration: '1 hour', secondaryAction: 'Search for 5 target in-house legal roles or law firm opportunities matching your speciality', secondaryDuration: '1 hour', endOfDayCheck: 'Specialty positioning consistent across all profiles. 5 targets identified.' },
      { day: 3, focus: 'Register with legal recruitment specialists', primaryAction: 'Contact Major Lindsey & Africa, Lateral Link, or BCG Attorney Search depending on your position. Legal recruiting is exclusively specialist — general headhunters don\'t move legal talent.', primaryDuration: '1 hour', endOfDayCheck: 'Registered with 2+ legal search firms' },
      { day: 4, focus: 'Update CV with anonymised matters', primaryAction: 'Rewrite your legal CV/resume with specific transaction/matter descriptions (anonymised as needed): deal size, complexity, client type, outcome. This is what partners and GCs evaluate.', primaryDuration: '2 hours', endOfDayCheck: 'Legal CV with 3+ specific matter descriptions' },
      { day: 5, focus: 'Check bar disciplinary records and renew CLE', primaryAction: 'Confirm bar disciplinary record is clean (employment verification will reveal this). Check CLE compliance in all admission states. Resolve any deficiencies.', primaryDuration: '1 hour', endOfDayCheck: 'Bar records clean. CLE status verified.' },
      { day: 7, focus: 'Initial targets applied', primaryAction: 'Apply to 2 in-house roles or law firm positions via warm introductions from your Day 1 network activation. Lead with the referral.', primaryDuration: '2 hours', endOfDayCheck: '2 targeted applications submitted through warm channels' },
    ],
    fin: [
      { day: 1, focus: 'Specialist headhunter registration — finance hires through specialists, not generalists', primaryAction: 'Register with Selby Jennings, Options Group, or Michael Baker International based on your sub-specialty. Send updated CV with tombstones or modelling samples.', primaryDuration: '2 hours', secondaryAction: 'Update LinkedIn with specific deal/model descriptions (anonymised)', secondaryDuration: '1 hour', endOfDayCheck: '2 specialist recruiters engaged. LinkedIn updated.' },
      { day: 2, focus: 'Market rate anchoring — know your number before any conversation', primaryAction: 'Research compensation benchmarks: Wall Street Oasis (IB), Levels.fyi (FinTech), CFO Alliance (corporate finance). Document P25/P50/P90 for your level and metro.', primaryDuration: '1.5 hours', endOfDayCheck: 'Written compensation benchmarks for your function and seniority' },
      { day: 3, focus: 'Update financial models portfolio', primaryAction: 'Compile 2–3 modelling samples (anonymised, no confidential data) that demonstrate complexity: DCF with sensitivities, LBO, or budget variance analysis. Store in Google Drive for easy sharing.', primaryDuration: '3 hours', endOfDayCheck: '2+ portfolio samples ready to share on request' },
      { day: 4, focus: 'Network activation — alumni and former colleagues in finance', primaryAction: 'Contact 5 finance professionals from previous roles, business school, or CFA/CPA network. Finance is relationship-driven at senior levels.', primaryDuration: '1.5 hours', endOfDayCheck: '5 warm messages sent' },
      { day: 5, focus: 'Identify target companies by financial health', primaryAction: 'Identify 8 target companies NOT in sector distress. Use HumanProof risk scores. Prioritise profitable, growth-stage companies over declining revenue ones.', primaryDuration: '1 hour', endOfDayCheck: '8 target companies identified and ranked by financial health' },
      { day: 7, focus: 'First applications through warm channels', primaryAction: 'Apply to top 2 targets via referral introductions from Day 4 outreach.', primaryDuration: '2 hours', endOfDayCheck: '2 applications submitted through warm channels' },
    ],
    mkt: [
      { day: 1, focus: 'Portfolio documentation — your proof of performance is your #1 differentiator', primaryAction: 'Build a 1-page marketing portfolio PDF: 3 campaigns with channel, budget, CAC/ROAS/pipeline generated, outcome. This is what CMOs hire from.', primaryDuration: '3 hours', secondaryAction: 'Update LinkedIn with quantified marketing results in each role description', secondaryDuration: '1 hour', endOfDayCheck: 'Marketing portfolio PDF ready. LinkedIn outcomes quantified.' },
      { day: 2, focus: 'Category positioning — what specifically are you expert at?', primaryAction: 'Identify your 2 marketing specialisations (ABM, performance, content, demand gen, brand, growth). These should match the job postings at your target companies. Update your headline accordingly.', primaryDuration: '1 hour', endOfDayCheck: 'LinkedIn headline reflects your 2 specific marketing specialisations' },
      { day: 3, focus: 'Target identification — follow the hiring signals', primaryAction: 'Find 8 companies with recent Series B/C raises or product expansions — these are the growth-stage companies that need your skills urgently. Use Crunchbase or LinkedIn.', primaryDuration: '1.5 hours', endOfDayCheck: '8 target companies identified with growth signals' },
      { day: 4, focus: 'Network outreach — marketing is a relationship-intensive field', primaryAction: 'Contact 5 CMOs or marketing directors in your LinkedIn network. Not asking for jobs — sharing an insight or article that\'s relevant to their industry.', primaryDuration: '1.5 hours', endOfDayCheck: '5 warm messages sent' },
      { day: 5, focus: 'Apply to top 2 targets', primaryAction: 'Apply using referral path. Attach your marketing portfolio PDF. Your cover should lead with a specific number: "I grew organic pipeline by 180% at [Company] by [method]."', primaryDuration: '2 hours', endOfDayCheck: '2 applications submitted with portfolio' },
      { day: 7, focus: 'Content visibility — start publishing your expertise', primaryAction: 'Publish one LinkedIn post sharing a marketing insight or framework from your experience. This creates inbound interest from your target audience.', primaryDuration: '1 hour', endOfDayCheck: '1 thought leadership post published' },
    ],
    ops: [
      { day: 1, focus: 'Process improvement documentation — your ROI evidence', primaryAction: 'Document 3 operational improvements with specific numbers: "Reduced COGS by 12% through vendor renegotiation." "Cut order fulfillment time by 3 days." These ARE your interview answers.', primaryDuration: '2 hours', secondaryAction: 'Update LinkedIn with quantified operational metrics', secondaryDuration: '1 hour', endOfDayCheck: '3 operational impact bullets written. LinkedIn updated.' },
      { day: 2, focus: 'Target identification in stable sectors', primaryAction: 'Identify 8 operations roles at companies NOT in layoff wave. Focus on manufacturing, healthcare operations, and distribution — more stable than tech ops.', primaryDuration: '1.5 hours', endOfDayCheck: '8 stable-sector ops targets identified' },
      { day: 3, focus: 'Professional association network', primaryAction: 'Contact 5 people from APICS, ISM, or ASCM professional associations. Operations is credential + community driven.', primaryDuration: '1 hour', endOfDayCheck: '5 professional association messages sent' },
      { day: 4, focus: 'Specialty certifications check', primaryAction: 'Verify your CSCP, PMP, or Lean Six Sigma certification is current. Post any recent certifications to LinkedIn. These are decision-making criteria for ops roles.', primaryDuration: '45 min', endOfDayCheck: 'Certifications verified and posted' },
      { day: 5, focus: 'First applications', primaryAction: 'Apply to top 2 targets. Cover letter should lead with a specific process improvement: "I reduced operational costs by [X]% by [specific action]."', primaryDuration: '2 hours', endOfDayCheck: '2 applications submitted' },
      { day: 7, focus: 'Market intelligence gathering', primaryAction: 'Research which of your target companies are currently undergoing supply chain transformation. These companies create urgent needs for your skills.', primaryDuration: '1 hour', endOfDayCheck: '3 companies identified with active transformation initiatives' },
    ],
    cons: [
      { day: 1, focus: 'Alumni network activation — consulting is 75% alumni-referral hiring', primaryAction: 'Message 5 former colleagues from your consulting firm or business school alumni network. Be explicit: "I am exploring new opportunities." This is completely expected and respected in consulting culture.', primaryDuration: '1 hour', endOfDayCheck: '5 alumni messages sent' },
      { day: 2, focus: 'Specialty positioning', primaryAction: 'Identify your consulting specialty (digital transformation, strategy, operations, finance advisory). Update all profiles. Generalist consultants are fungible; specialists command premium rates.', primaryDuration: '1 hour', endOfDayCheck: 'Specialty positioning consistent across all profiles' },
      { day: 3, focus: 'Partner network outreach', primaryAction: 'Contact 3 partners or managing directors at target firms. Consulting relationships at the partner level open doors that ATS systems never can.', primaryDuration: '1 hour', endOfDayCheck: '3 partner-level messages sent' },
      { day: 4, focus: 'Thought leadership — consulting hiring requires proof of intellectual contribution', primaryAction: 'Publish a short LinkedIn article (500 words) on a specific insight from your recent engagements. This attracts inbound and demonstrates you have perspective worth paying for.', primaryDuration: '2 hours', endOfDayCheck: '1 thought leadership article published' },
      { day: 5, focus: 'Research firms by growth area', primaryAction: 'Identify 5 consulting firms growing in your specialty (check their case study pages, recent hires, and published content).', primaryDuration: '1 hour', endOfDayCheck: '5 high-potential target firms identified' },
      { day: 7, focus: 'First exploratory conversations', primaryAction: 'Convert Day 1 alumni outreach into 2+ exploratory calls. Ask about the firm\'s current focus areas and team needs — not a job ask, a market intelligence call.', primaryDuration: '2 hours', endOfDayCheck: '2+ calls scheduled' },
    ],
    default: [
      { day: 1, focus: 'Emergency profile update — your most time-sensitive unlock action', primaryAction: 'Rewrite your LinkedIn headline from "[Job Title] at [Company]" to "[What you deliver] | [Years] yr [function] | [Top skill]". Enable Open to Work (recruiter-only mode).', primaryDuration: '90 min', endOfDayCheck: 'New headline live. Open to Work enabled.', motivationalFrame: 'The recruiter who finds you in 48 hours will see this headline first.' },
      { day: 2, focus: 'Referral research — your fastest path to interviews', primaryAction: 'Identify 8–10 people at your top 3 target companies via LinkedIn 2nd-degree connections. List name, role, and connection path.', primaryDuration: '1.5 hours', endOfDayCheck: '8+ referral contacts identified' },
      { day: 3, focus: 'Send warm outreach messages', primaryAction: 'Send personalised messages to your top 3 referral contacts. Not a job ask — a genuine connection about their work.', primaryDuration: '45 min', endOfDayCheck: '3 warm messages sent' },
      { day: 4, focus: 'Quantify your contributions', primaryAction: 'Write 3 impact statements using: "I led [project] → [measurable outcome] impacting [metric] by [number]". These are your interview answers and your resume bullets.', primaryDuration: '1.5 hours', endOfDayCheck: '3 quantified impact statements written' },
      { day: 5, focus: 'First application', primaryAction: 'Apply to your #1 target company. Use referral path if available. Tailor the first 2 sentences of your cover to their specific mission.', primaryDuration: '1.5 hours', endOfDayCheck: '1 application submitted' },
      { day: 7, focus: 'Financial clarity session', primaryAction: 'Calculate your runway (savings ÷ monthly expenses), your walk-away number for any offer, and your financial bridge option if search extends. Write these down.', primaryDuration: '1 hour', endOfDayCheck: 'Financial runway and walk-away numbers documented' },
    ],
    // All other role families fall through to default in the engine
    ds: [], pm: [], hr: [], sales: [], design: [], ind: [], edu: [], gov: [], bpo: [],
  },
  elevated: {
    sw: [
      { day: 1, focus: 'Market intelligence — understand your exact position before acting', primaryAction: 'Research salary benchmarks at your level: check Levels.fyi, Glassdoor, LinkedIn Salary for your role in your metro. Document P25, P50, P75. This takes 1 hour and changes every subsequent conversation.', primaryDuration: '1 hour', endOfDayCheck: 'Market rate documented for your role + metro + seniority' },
      { day: 2, focus: 'LinkedIn optimisation — from "has a profile" to "attracting inbound"', primaryAction: 'Rewrite headline and summary with specific technologies, scale metrics, and impact numbers. Add 3 achievement bullets to your current role description.', primaryDuration: '2 hours', endOfDayCheck: 'Headline and summary updated. 3 achievement bullets added.' },
      { day: 4, focus: 'Target company list — be specific, not broad', primaryAction: 'Identify 8 target companies by combining: your sector affinity + actively hiring signals + NOT in contagion wave. Use LinkedIn Jobs + Glassdoor hiring trends.', primaryDuration: '1.5 hours', endOfDayCheck: '8 specific target companies in a ranked list' },
      { day: 7, focus: 'Warm network activation', primaryAction: 'Send 5 reconnection messages to former colleagues now at interesting companies. Not a job ask — a genuine catch-up.', primaryDuration: '1.5 hours', endOfDayCheck: '5 warm messages sent' },
    ],
    hc: [
      { day: 1, focus: 'Market awareness — understand your clinical market position', primaryAction: 'Research compensation benchmarks for your specialty in your region: MGMA Data, Medscape Physician Survey, Doximity Compensation Report. Document ranges.', primaryDuration: '1 hour', endOfDayCheck: 'Specialty compensation benchmarks documented' },
      { day: 3, focus: 'Clinical profile optimisation', primaryAction: 'Update your Doximity profile (the clinical equivalent of LinkedIn) with recent publications, clinical interests, and location preferences.', primaryDuration: '1 hour', endOfDayCheck: 'Doximity profile updated' },
      { day: 5, focus: 'Register with 1 clinical staffing firm', primaryAction: 'Proactively connect with 1 clinical recruiter (AMN, CHG, Medscape) to understand market demand for your specialty. Not actively searching — intelligence gathering.', primaryDuration: '1 hour', endOfDayCheck: '1 clinical recruiter conversation initiated' },
      { day: 7, focus: 'Peer network activation', primaryAction: 'Contact 3 clinical colleagues at other health systems. Share a relevant clinical insight. These relationships convert to opportunities at 5× the rate of cold applications.', primaryDuration: '45 min', endOfDayCheck: '3 peer messages sent' },
    ],
    default: [
      { day: 1, focus: 'Market benchmark — know your value before any conversation', primaryAction: 'Research your market rate using Glassdoor, LinkedIn Salary, and industry-specific salary surveys. Document P25/P50/P75 for your role + metro.', primaryDuration: '1 hour', endOfDayCheck: 'Market rate benchmarks documented' },
      { day: 3, focus: 'LinkedIn profile update', primaryAction: 'Rewrite your headline and add 3 quantified achievement bullets to your current role.', primaryDuration: '90 min', endOfDayCheck: 'Profile optimised with quantified achievements' },
      { day: 5, focus: 'Target company identification', primaryAction: 'Identify 8 companies actively hiring in your function that are NOT in your sector\'s layoff wave.', primaryDuration: '1 hour', endOfDayCheck: '8 specific targets listed' },
      { day: 7, focus: 'Warm network messages', primaryAction: 'Send 5 reconnection messages to former colleagues at interesting companies.', primaryDuration: '1 hour', endOfDayCheck: '5 messages sent' },
    ],
    // Stub rest for TypeScript
    ds: [], pm: [], hr: [], sales: [], fin: [], legal: [], mkt: [], ops: [], design: [], ind: [], edu: [], gov: [], bpo: [], cons: [],
  },
  standard: {
    default: [
      { day: 1, focus: 'Annual career health audit', primaryAction: 'In 2 hours: (1) research your market rate, (2) compare your current comp to P50, (3) identify the top 1 skill gap across 5 relevant job postings.', primaryDuration: '2 hours', endOfDayCheck: 'Market rate known. Top skill gap identified.' },
      { day: 7, focus: 'Investment in your most undervalued asset', primaryAction: 'Identify the one certification that appears most frequently in relevant job postings. Register for it. Commitment is the hardest part.', primaryDuration: '1 hour', endOfDayCheck: 'Course registered. Calendar blocked for 2hr/week.' },
    ],
    sw: [], ds: [], pm: [], hr: [], sales: [], fin: [], legal: [], hc: [], mkt: [], ops: [], design: [], ind: [], edu: [], gov: [], bpo: [], cons: [],
  },
  monitoring: {
    default: [
      { day: 1, focus: 'Annual market pulse', primaryAction: 'Set up 2 LinkedIn job alerts for your role to monitor market demand. This is passive intelligence — requires 10 min/week.', primaryDuration: '15 min', endOfDayCheck: '2 job alerts active' },
      { day: 14, focus: 'Proactive profile maintenance', primaryAction: 'Update LinkedIn with your most recent achievement (last 6 months). A stale profile costs you 30% of inbound visibility.', primaryDuration: '45 min', endOfDayCheck: 'Profile updated' },
    ],
    sw: [], ds: [], pm: [], hr: [], sales: [], fin: [], legal: [], hc: [], mkt: [], ops: [], design: [], ind: [], edu: [], gov: [], bpo: [], cons: [],
  },
};

// ── Weekly milestone generators ───────────────────────────────────────────────

function buildWeeklyMilestones(
  horizon: '30-day' | '60-day' | '90-day',
  urgency: ExecutionUrgency,
  role: RoleFamily,
  inputs: PrecisionExecutionInputs,
): WeeklyMilestone[] {
  const runway = getRunwayMonths(inputs);

  const milestones: Record<'30-day' | '60-day' | '90-day', WeeklyMilestone[]> = {
    '30-day': urgency === 'crisis' ? [
      {
        weekNumber: 1, weekLabel: 'Week 1: Emergency Launch',
        byFridayGoal: 'LinkedIn profile updated + Open to Work active + 3 warm referral messages sent + 1 application submitted',
        keyActions: ['LinkedIn profile crisis update (headline + achievements)', 'Identify referral contacts at top 3 targets', 'Submit first targeted application via warm channel'],
        timeInvestment: '6–8 hours',
        goNoGoCheck: 'PASS: LinkedIn updated + 1 application sent. FAIL: anything less → Saturday catch-up session required.',
        failureRecovery: 'If Week 1 incomplete: block 3 hours Saturday morning. Start with LinkedIn update — it unlocks everything else.',
        confidenceBooster: 'Send one warm referral message today. Even if no response, the action itself builds momentum.',
      },
      {
        weekNumber: 2, weekLabel: 'Week 2: Pipeline Building',
        byFridayGoal: '2+ applications submitted. 2+ recruiter conversations initiated.',
        keyActions: ['Apply to 2 more targets (applications 2 + 3)', 'Prepare salary anchor based on market research', 'Begin interview preparation for top target format'],
        timeInvestment: '7–9 hours',
        goNoGoCheck: 'PASS: 3 total applications sent, 2+ conversations started. FAIL: increase outreach volume.',
        failureRecovery: 'Apply to 2 more companies than planned and increase LinkedIn outreach to 5 new contacts per day.',
        confidenceBooster: 'One mock interview this week — even informal. Confidence comes from preparation.',
      },
      {
        weekNumber: 3, weekLabel: 'Week 3: Conversation Conversion',
        byFridayGoal: '1+ recruiter screen scheduled. Financial runway written down.',
        keyActions: ['Attend recruiter screens with prepared talking points', 'Salary anchor research completed', 'Financial runway calculated and documented'],
        timeInvestment: '5–7 hours',
        goNoGoCheck: 'PASS: 1 scheduled screen. FAIL: double outreach volume immediately.',
        failureRecovery: 'If no screens yet: something is wrong with your profile or message. Update LinkedIn one more time, focusing on the first sentence of your summary.',
        confidenceBooster: 'Calculate your market rate today — knowing your number creates grounded confidence in every conversation.',
      },
      {
        weekNumber: 4, weekLabel: 'Week 4: Month 1 Assessment',
        byFridayGoal: 'Active conversations with 2+ companies. Clear signal on search trajectory.',
        keyActions: ['Conduct Month 1 retrospective: what worked, what did not', 'Decision: escalate or maintain current pace', 'Plan Month 2 with specific target count and outreach volume'],
        timeInvestment: '4–6 hours',
        goNoGoCheck: `PASS: 2+ active conversations, 5+ applications sent. FAIL: call an employment coach this week — something structural needs to change.`,
        failureRecovery: 'Expand target company list by 5 companies. Lower selectivity threshold. Increase daily outreach to 3 messages.',
        confidenceBooster: 'Write down what\'s working. Even in crisis mode, some things are moving. Build on those.',
      },
    ] : urgency === 'elevated' ? [
      {
        weekNumber: 1, weekLabel: 'Week 1: Market Intelligence',
        byFridayGoal: 'Market rate benchmarked. LinkedIn updated. 5 warm messages sent.',
        keyActions: ['Research salary benchmarks (1 hour)', 'LinkedIn profile optimization (headline + achievements)', 'Send 5 warm reconnection messages to former colleagues'],
        timeInvestment: '4–5 hours',
        goNoGoCheck: 'PASS: LinkedIn updated + market rate documented + 5 messages sent.',
        failureRecovery: 'If incomplete: block 2 hours Sunday morning to catch up.',
        confidenceBooster: 'Check how many recruiter views your profile gets today vs. after the update. The number jumps immediately.',
      },
      {
        weekNumber: 2, weekLabel: 'Week 2: Target Company Research',
        byFridayGoal: '8 specific target companies identified with hiring signals confirmed.',
        keyActions: ['Deep research on top 3 targets (recent news, job postings, interview format)', 'Identify referral contacts at each target', 'Salary bands confirmed at each company'],
        timeInvestment: '3–4 hours',
        goNoGoCheck: 'PASS: 8 targets researched. FAIL: reduce to 5 well-researched targets rather than 8 superficially known ones.',
        failureRecovery: 'Prioritise quality over quantity — 3 companies you know deeply beat 10 companies you\'ve barely read about.',
        confidenceBooster: 'One target will stand out as clearly right. Apply to that one first — follow the energy.',
      },
      {
        weekNumber: 3, weekLabel: 'Week 3: First Applications',
        byFridayGoal: '3 targeted applications submitted via warm channels.',
        keyActions: ['Apply to top 3 companies using referral where available', 'Tailored cover letters for each application', 'Track application status in a spreadsheet'],
        timeInvestment: '4–5 hours',
        goNoGoCheck: 'PASS: 3 applications sent.',
        failureRecovery: 'If procrastinating: the first application is always hardest. Just submit one today — imperfect is fine.',
        confidenceBooster: 'Applying while employed gives you 2× negotiating power vs. searching post-layoff. This is your advantage.',
      },
      {
        weekNumber: 4, weekLabel: 'Week 4: Network Activation',
        byFridayGoal: '2+ positive responses from outreach. Job search spreadsheet active.',
        keyActions: ['Follow up on Week 1 reconnections — convert to coffee chats', 'Add 3 more companies to target list', 'Prepare interview answers for behavioral questions'],
        timeInvestment: '3–5 hours',
        goNoGoCheck: 'PASS: 2+ positive responses.',
        failureRecovery: 'If 0 responses: your messages may be too generic. Personalise each one — reference their specific work.',
        confidenceBooster: 'A coffee chat with someone at your target company is worth 10 cold applications. Convert every positive response.',
      },
    ] : [
      {
        weekNumber: 1, weekLabel: 'Week 1: Career Health Check',
        byFridayGoal: 'Market rate benchmarked. LinkedIn reviewed and updated.',
        keyActions: ['Research market rate (1 hour)', 'Review LinkedIn profile and update with recent achievements', 'Identify top 1 skill gap'],
        timeInvestment: '2–3 hours',
        goNoGoCheck: 'PASS: Market rate documented + profile updated.',
        failureRecovery: 'If skipped: do it Sunday. This is a 2-hour investment with multi-year ROI.',
        confidenceBooster: 'Knowing your market rate gives you leverage in your current role. This is valuable even if you never use it.',
      },
      {
        weekNumber: 2, weekLabel: 'Week 2: Skill Investment',
        byFridayGoal: 'One certification or skill project started.',
        keyActions: ['Register for highest-ROI certification', 'Block 2 hours/week in calendar for skill building', 'Identify 3 target companies for passive monitoring'],
        timeInvestment: '2–3 hours',
        goNoGoCheck: 'PASS: Certification registered and calendar blocked.',
        failureRecovery: 'A small commitment creates follow-through. Even 30 min/day compounds to 15 hours/month.',
        confidenceBooster: 'Adding one market-relevant skill shifts your risk profile more than any other action.',
      },
    ],
    '60-day': [
      {
        weekNumber: 5, weekLabel: 'Week 5: Momentum',
        byFridayGoal: urgency === 'crisis' ? '5+ applications sent. 2+ active conversations.' : '3+ companies researched. 1+ informal conversation started.',
        keyActions: urgency === 'crisis' ? ['Interview prep: role-specific practice (not random LeetCode)', 'Salary anchor confirmation', 'Third application submitted'] : ['Deeper research on top 3 targets', 'Skill certification progress (40% complete)', 'LinkedIn content post (builds visibility)'],
        timeInvestment: urgency === 'crisis' ? '6–8 hours' : '3–4 hours',
        goNoGoCheck: urgency === 'crisis' ? 'PASS: Active interview in progress OR 5+ applications sent.' : 'PASS: Skill course registered and in progress.',
        failureRecovery: 'Increase intensity: if behind in crisis mode, double outreach. In standard mode: check if the skill investment is the right one.',
        confidenceBooster: 'Progress compounds. Week 5 conversations started in Week 1–2 now return as interview invitations.',
      },
      {
        weekNumber: 6, weekLabel: 'Week 6: Interview Pipeline',
        byFridayGoal: urgency === 'crisis' ? '1+ technical interview scheduled.' : 'Passive application pipeline active.',
        keyActions: urgency === 'crisis' ? ['Complete domain-specific interview prep', 'Research interviewers on LinkedIn', 'Prepare specific examples using STAR method'] : ['Apply to 1 exploratory position', 'Network outreach: 3 more reconnections', 'Document current role wins for resume update'],
        timeInvestment: urgency === 'crisis' ? '7–9 hours' : '2–3 hours',
        goNoGoCheck: urgency === 'crisis' ? 'PASS: 1 interview scheduled. FAIL: analyze message conversion and iterate.' : 'PASS: 1 application sent.',
        failureRecovery: 'If no interviews yet: get specific feedback on why. Glassdoor reviews, a recruiter conversation, or a peer review of your profile.',
        confidenceBooster: 'Interviews are a skill. Each one makes the next one better.',
      },
      {
        weekNumber: 7, weekLabel: `Week 7: ${urgency === 'crisis' ? 'Offer Pipeline Building' : 'Market Intelligence'}`,
        byFridayGoal: urgency === 'crisis' ? 'Multiple interview processes active simultaneously' : 'Market positioning clearly understood',
        keyActions: urgency === 'crisis' ? ['Apply to companies 4 and 5', 'Build competing offer leverage', 'Evaluate all offers using weighted scorecard'] : ['Informational interview at 1 target company', 'Industry event or professional association participation', 'Annual bonus/review cycle timing research at target companies'],
        timeInvestment: urgency === 'crisis' ? '5–6 hours' : '2–3 hours',
        goNoGoCheck: urgency === 'crisis' ? 'PASS: 2+ active interview processes.' : 'PASS: 1 conversation started at a target company.',
        failureRecovery: urgency === 'crisis' ? 'If only 1 process: apply to 3 more companies this week. Offer negotiation requires alternatives.' : 'If not engaging: convert online research into a real conversation. Email beats LinkedIn message for informational requests.',
        confidenceBooster: urgency === 'crisis' ? 'Multiple options eliminate desperation. Build the pipeline before you need it.' : 'Informational interviews build relationships with zero pressure. The best conversations happen when neither person needs anything.',
      },
      {
        weekNumber: 8, weekLabel: 'Week 8: 60-Day Checkpoint',
        byFridayGoal: urgency === 'crisis' ? 'Offer received or final-round interview pending' : 'Clear picture of market options and trajectory',
        keyActions: ['Month 2 retrospective: what worked, what to change', 'Recalibrate target list based on response rates', 'Plan Month 3 strategy with specific adjustments'],
        timeInvestment: '3–4 hours',
        goNoGoCheck: urgency === 'crisis' ? 'PASS: 1 offer or final round in progress. FAIL: fundamentally reassess approach with external input.' : 'PASS: clear market data and 2+ warm conversations.',
        failureRecovery: 'If significantly behind: this is the moment to get external feedback — career coach, recruiter, or trusted advisor. Something structural needs adjustment.',
        confidenceBooster: 'You know significantly more than you did 60 days ago. Apply that knowledge to Month 3.',
      },
    ],
    '90-day': [
      {
        weekNumber: 9, weekLabel: 'Week 9: Decision and Negotiation',
        byFridayGoal: urgency === 'crisis' ? 'Offer in hand for evaluation OR alternative secured' : 'Long-term positioning strategy defined',
        keyActions: urgency === 'crisis' ? ['Evaluate all offers using multi-factor scorecard', 'Negotiate every element (not just base)', 'Maintain competing offers as leverage'] : ['Define 1-year career positioning plan', 'Invest in one medium-term skill (3–6 month horizon)', 'Build financial independence buffer'],
        timeInvestment: urgency === 'crisis' ? '4–5 hours' : '2–3 hours',
        goNoGoCheck: urgency === 'crisis' ? 'PASS: Signed offer or decision made with clear reasoning.' : 'PASS: 1-year plan written.',
        failureRecovery: urgency === 'crisis' ? 'If no offer: extend search to 8 more companies and get 1:1 interview coaching.' : 'A written plan beats an unwritten one. Even a rough draft makes intentions real.',
        confidenceBooster: urgency === 'crisis' ? 'Negotiation adds an average $7,000–$15,000 to initial offers. Every element is negotiable.' : 'Clarity about direction is itself a competitive advantage. Most people never write it down.',
      },
      {
        weekNumber: 10, weekLabel: 'Week 10: Transition or Strengthening',
        byFridayGoal: urgency === 'crisis' ? 'Notice period started or transition plan established' : 'One structural risk factor addressed',
        keyActions: urgency === 'crisis' ? ['Plan transition: knowledge transfer, handoff, relationships to maintain', 'Protect references and relationship capital', 'Set up for Day 1 success at new role'] : ['Financial runway check: are you at 3+ months buffer?', 'Continue skill investment (progress check)', 'Re-audit with HumanProof to confirm risk trajectory'],
        timeInvestment: '3–4 hours',
        goNoGoCheck: urgency === 'crisis' ? 'PASS: Decision made and transition plan in place.' : 'PASS: Financial runway confirmed, skill progress on track.',
        failureRecovery: urgency === 'crisis' ? 'If no clear path forward: expand search geographically or consider contract/consulting bridge roles.' : 'If financial runway < 3 months: prioritize this immediately above all other career actions.',
        confidenceBooster: urgency === 'crisis' ? 'Leaving on good terms is the cheapest investment with the longest ROI. Every relationship you maintain is a future reference, client, or collaborator.' : 'Building career resilience is a compounding investment. Done now, in a position of strength, it\'s 10× more effective than done in crisis.',
      },
    ],
  };

  return milestones[horizon] ?? [];
}

// ── Emotional calibration library ────────────────────────────────────────────

const EMOTIONAL_CALIBRATION: EmotionalCalibration[] = [
  {
    stateId: 'fear_paralysis',
    description: 'You know what to do but find yourself unable to start. You re-read the plan but don\'t act.',
    signYouAreHere: 'You open LinkedIn but close it without making any changes. You\'ve "almost" sent messages for 3+ days.',
    immediateIntervention: 'Set a 15-minute timer. Do EXACTLY ONE THING on this plan — the smallest possible action. Send one message. Update one bullet. This breaks the spell.',
    backOnTrackAction: 'Compress the week\'s tasks into 2 hours on one day. Momentum, once started, continues.',
  },
  {
    stateId: 'overconfidence',
    description: 'Risk score feels theoretical. You\'re not worried. You\'ll "get around to it."',
    signYouAreHere: 'You haven\'t started the plan. You think "it won\'t happen to me." You\'re deferring Week 1 actions to "next week."',
    immediateIntervention: 'Read the specific signal that drove your risk score. Understand exactly WHY the risk is elevated. It\'s based on company-specific data, not general stats.',
    backOnTrackAction: 'Complete the single highest-ROI action in this plan (LinkedIn update or referral mapping). Even if it doesn\'t feel urgent, it\'s a 2-hour investment with potentially multi-year ROI.',
  },
  {
    stateId: 'exhaustion',
    description: 'You\'re managing current job stress AND trying to execute this plan. The energy isn\'t there.',
    signYouAreHere: 'You started but stopped. Each week you push tasks to the next week. The plan feels too heavy.',
    immediateIntervention: 'Cut this plan to 3 actions per week — only the ones marked "critical." Quality over completeness.',
    backOnTrackAction: 'Block a 30-minute "career session" every Tuesday and Thursday morning before the workday starts. Protect these slots like a standing meeting.',
  },
  {
    stateId: 'clarity',
    description: 'You\'re executing well. Actions feel purposeful. You\'re building momentum.',
    signYouAreHere: 'You\'ve completed most Week 1 actions. You have at least 1 active conversation. The plan feels workable.',
    immediateIntervention: 'You\'re in the right state. Double down on what\'s working. The metric that\'s improving most — amplify it.',
    backOnTrackAction: 'This week, do the one action you\'ve been avoiding. In clarity mode, you have the energy to tackle it.',
  },
];

// ── Core engine ──────────────────────────────────────────────────────────────

export function computePrecisionExecutionPlan(inputs: PrecisionExecutionInputs): PrecisionExecutionResult {
  const today = inputs.today ?? new Date().toISOString().slice(0, 10);
  const urgency = determineUrgency(inputs);
  const transitionGoal = determineTransitionGoal(inputs, urgency);
  const runway = getRunwayMonths(inputs);
  const regionTiming = getRegionalTiming(inputs.region, today);

  // Day 1–7 content: role-specific if available, else default
  const familyContent = DAY_CONTENT_BY_URGENCY_ROLE[urgency];
  const roleDays = (familyContent[inputs.roleFamily]?.length ? familyContent[inputs.roleFamily] : familyContent.default) ?? [];
  const day1to7 = roleDays.filter(d => d.day >= 1 && d.day <= 7)
    .map(d => ({ ...d, date: addDays(today, d.day - 1) }));

  const day8to14 = roleDays.filter(d => d.day >= 8 && d.day <= 14)
    .map(d => ({ ...d, date: addDays(today, d.day - 1) }));

  // Day 15–30 themes by urgency
  const day15to30Theme = urgency === 'crisis'
    ? 'Deep interview pipeline: 2–3 simultaneous interview processes, salary anchor confirmed, financial bridge identified'
    : urgency === 'elevated'
    ? 'Convert warm conversations to informational interviews and first applications; establish your salary floor'
    : 'Skill investment momentum: certification progress + one networking event or professional association activity';

  const day15to30TopActions = urgency === 'crisis'
    ? ['Submit applications 4–6 to expand pipeline', 'Complete domain-specific interview prep (technical + behavioral)', 'Financial runway calculated and documented', 'Salary anchor confirmed with research', 'Reference list updated and references notified']
    : urgency === 'elevated'
    ? ['Apply to top 3 targets (all via warm channel if possible)', 'Salary benchmarks researched and documented', 'Professional association or industry event attendance', 'Skills gap: enrol in highest-ROI certification']
    : ['Certification: complete 40% of enrolled course', 'Market intelligence: subscribe to job alerts at target companies', 'Annual contribution review: update LinkedIn with last 6 months'];

  // Build horizon plans
  const horizon30: HorizonPlan = {
    horizon: '30-day',
    theme: urgency === 'crisis' ? 'Launch. Activate. Apply.' : urgency === 'elevated' ? 'Position. Research. Warm.' : 'Assess. Invest. Monitor.',
    themeSubtitle: urgency === 'crisis' ? 'First interviews and active pipeline by Day 30' : urgency === 'elevated' ? 'Market intelligence, profile, and 3 warm conversations' : 'Know your value and protect it proactively',
    keyObjective: urgency === 'crisis' ? '5+ applications sent, 2+ active conversations, 1 scheduled interview' : urgency === 'elevated' ? 'Market benchmarked, profile updated, 3+ warm conversations, 2+ applications' : 'Market rate known, top skill gap identified and addressed',
    successDefinition: urgency === 'crisis' ? 'You have at least 1 recruiter screen or hiring manager call scheduled' : urgency === 'elevated' ? 'You have 2+ genuine conversations at target companies' : 'You have enrolled in 1 skill investment and updated your LinkedIn',
    failureDefinition: urgency === 'crisis' ? '0 conversations after 30 days — the profile or message isn\'t landing. Get external feedback immediately.' : urgency === 'elevated' ? 'No responses to 10+ outreach messages — something structural needs fixing.' : 'Still haven\'t started the skill investment — this means the commitment isn\'t there. Revisit why.',
    weeklyMilestones: buildWeeklyMilestones('30-day', urgency, inputs.roleFamily, inputs),
    criticalDependencies: ['LinkedIn profile must be updated before any outreach (Day 1)', 'Market rate must be researched before any salary conversations'],
    estimatedTimePerWeek: urgency === 'crisis' ? '6–8 hours' : urgency === 'elevated' ? '4–5 hours' : '2–3 hours',
    confidenceScore: urgency === 'crisis' ? 82 : urgency === 'elevated' ? 85 : 78,
    marketTimingNote: regionTiming,
  };

  const horizon60: HorizonPlan = {
    horizon: '60-day',
    theme: urgency === 'crisis' ? 'Interview. Pipeline. Offer.' : urgency === 'elevated' ? 'Apply. Interview. Decide.' : 'Skill. Network. Position.',
    themeSubtitle: urgency === 'crisis' ? 'First offer received or final round in progress by Day 60' : urgency === 'elevated' ? 'First formal interview scheduled by Day 60' : 'One certification complete, passive network warm',
    keyObjective: urgency === 'crisis' ? 'At least 1 offer or final-round interview' : urgency === 'elevated' ? '5+ applications, 1+ interview scheduled' : 'Certification 80% complete, 3 passive conversations',
    successDefinition: urgency === 'crisis' ? 'You have 2+ competing interview processes — giving you negotiating leverage' : urgency === 'elevated' ? 'You have an active interview process at a target company' : 'You have made measurable progress on a market-relevant skill',
    failureDefinition: urgency === 'crisis' ? 'No interviews by Day 60 means something is wrong at the application → screen conversion step. Get a recruiter to review your profile.' : 'No response to 15+ applications means ATS or profile quality issue.',
    weeklyMilestones: buildWeeklyMilestones('60-day', urgency, inputs.roleFamily, inputs),
    criticalDependencies: ['Day 30 applications must be sent before Day 60 conversions are possible', 'Interview prep must happen before Day 60 screens'],
    estimatedTimePerWeek: urgency === 'crisis' ? '7–9 hours' : urgency === 'elevated' ? '5–6 hours' : '2–3 hours',
    confidenceScore: urgency === 'crisis' ? 75 : urgency === 'elevated' ? 80 : 72,
  };

  const horizon90: HorizonPlan = {
    horizon: '90-day',
    theme: urgency === 'crisis' ? 'Decide. Negotiate. Transition.' : urgency === 'elevated' ? 'Convert. Negotiate. Strengthen.' : 'Strengthen. Build. Protect.',
    themeSubtitle: urgency === 'crisis' ? 'Signed offer by Day 90' : urgency === 'elevated' ? 'Offer signed or decision to stay with clear next trigger' : 'Structural career resilience built for next 12 months',
    keyObjective: urgency === 'crisis' ? `Signed offer with compensation > current or start date confirmed — within ${runway < 4 ? 'your financial window' : '90 days'}` : urgency === 'elevated' ? 'Decision made: new role accepted OR specific criteria set for staying' : '3-month emergency fund progress, one skill certification complete',
    successDefinition: urgency === 'crisis' ? 'Signed offer letter with start date within 4 weeks, compensation negotiated' : urgency === 'elevated' ? 'Clear optionality — you have choices rather than being subject to one company\'s decision' : 'Career resilience score improved: financial buffer extended, skill portfolio upgraded',
    failureDefinition: urgency === 'crisis' ? 'Still searching at Day 90 without offers — requires fundamental strategy change: geography, seniority targeting, or pivot to contract work' : 'Risk score increased without action taken — urgency should have escalated.',
    weeklyMilestones: buildWeeklyMilestones('90-day', urgency, inputs.roleFamily, inputs),
    criticalDependencies: ['Day 60 pipeline must exist for Day 90 decisions to be possible', 'Financial runway must be documented to negotiate from strength'],
    estimatedTimePerWeek: urgency === 'crisis' ? '4–6 hours' : urgency === 'elevated' ? '3–5 hours' : '1–2 hours',
    confidenceScore: urgency === 'crisis' ? 68 : urgency === 'elevated' ? 74 : 70,
  };

  // Morning check-in question by urgency
  const morningCheckInQuestion = urgency === 'crisis'
    ? 'Did I do something yesterday that moves me closer to an offer? If not — what\'s the ONE thing I do today?'
    : urgency === 'elevated'
    ? 'Am I maintaining my current performance while building my external options? What\'s one thing I can do in 30 minutes today?'
    : 'Am I building career capital, or just maintaining the status quo? What\'s one small action that compounds over time?';

  const weeklyReviewPrompt = urgency === 'crisis'
    ? 'Sunday: (1) How many applications did I send this week? (2) How many conversations are active? (3) What\'s NOT working and what specifically am I changing next week?'
    : 'Sunday: (1) Did I complete the week\'s priority action? (2) What signal from the market told me something useful? (3) What does my energy level suggest about my pace?';

  const redFlags = urgency === 'crisis'
    ? [
        'Zero recruiter responses after 10 applications in 2 weeks → profile needs external review',
        'Manager starts excluding you from meetings or stops sharing context → announcement imminent',
        'Financial runway drops below 2 months → accept any reasonable offer immediately',
        `If visa grace < ${inputs.visaRisk?.gracePeriodDays ?? '60'} days → prioritise visa-sponsor-ready companies ONLY`,
      ]
    : urgency === 'elevated'
    ? [
        'Risk score increases above 70 on re-audit → escalate to crisis plan immediately',
        'You\'ve been passed over for 15+ applications with no screens → get external feedback on profile or messaging',
        'New management or restructuring announced → activate crisis protocol this week',
      ]
    : [
        'Risk score increases above 55 → escalate to standard plan immediately',
        'Market is creating departures on your team → monitor closely and escalate',
      ];

  const overarchingNarrative = urgency === 'crisis'
    ? `Your ${inputs.compositeScore}/100 risk score places you in a high-probability window for workforce action. This 90-day precision plan assumes you are working a parallel job search this week — not next month. The plan is compressed because your window may be. Every week of delay costs you leverage.`
    : urgency === 'elevated'
    ? `Your ${inputs.compositeScore}/100 score is elevated — signals suggest conditions could deteriorate within 2–3 quarters. This plan builds your external optionality while you maintain current role performance. The goal is to have choices, not to be forced into a decision.`
    : `Your ${inputs.compositeScore}/100 score indicates moderate risk — primarily sector-driven rather than company-specific. This plan builds career resilience while conditions are still favorable. Career capital is always cheaper to build when you don't urgently need it.`;

  const overallConfidence = urgency === 'crisis' ? 73 : urgency === 'elevated' ? 79 : 74;

  return {
    overarchingNarrative,
    urgencyMode: urgency,
    roleFamily: inputs.roleFamily,
    transitionGoal,
    day1to7,
    day8to14,
    day15to30Theme,
    day15to30TopActions,
    horizon30,
    horizon60,
    horizon90,
    morningCheckInQuestion,
    weeklyReviewPrompt,
    redFlags,
    emotionalCalibration: EMOTIONAL_CALIBRATION,
    planCreatedDate: today,
    nextReauditDate: addDays(today, urgency === 'crisis' ? 30 : urgency === 'elevated' ? 45 : 90),
    overallConfidence,
  };
}
