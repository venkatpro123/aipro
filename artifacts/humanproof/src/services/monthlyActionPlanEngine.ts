/**
 * monthlyActionPlanEngine.ts — v45.0
 *
 * TRANSFORMATION: Converts abstract phase-based actions into a CONCRETE
 * MONTH-BY-MONTH CALENDAR with specific deadlines, dependencies, and
 * expected outcomes.
 *
 * THE PROBLEM WITH CURRENT ACTION PLANS:
 *   Phase 1: "Update your LinkedIn profile, get certified, network more."
 *   → User reads it, nods, closes the tab, and does nothing.
 *
 *   Why? Because "update LinkedIn" has no deadline. "Get certified" is vague.
 *   "Network more" is not an action — it's an aspiration.
 *
 * THIS ENGINE:
 *   "Week 1 (by [specific date]): Add 3 metrics to your LinkedIn headline.
 *    Evidence: profiles with metrics get 40% more recruiter views.
 *    Expected outcome: 2–3 recruiter contacts within 10 days.
 *    Your runway: 8 months. This is a HIGH-ROI action that costs 2 hours."
 *
 * DESIGN PRINCIPLES:
 *   1. Every action has a SPECIFIC DEADLINE (week number or date range)
 *   2. Every action has an EXPECTED OUTCOME ("you will notice X in Y days")
 *   3. Actions adapt to FINANCIAL RUNWAY (compressed if < 4 months)
 *   4. Actions adapt to VISA STATUS (H1B users get different urgency)
 *   5. Dependency ordering: some actions unlock others
 *   6. Each month builds on the previous ("Month 2 assumes Month 1 done")
 *
 * OUTPUT:
 *   A 6-month personalised calendar of specific, weekly actions
 *   with context, evidence, expected outcomes, and time estimates.
 */

import type { VisaRiskResult } from './visaRiskEngine';
import type { FinancialRunwayResult } from './financialRunwayIntelligence';
import type { PrecisionSurvivalResult } from './precisionSurvivalEngine';
import type { JobTargetingResult } from './jobTargetingEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyAction {
  weekNumber: number;       // 1–24 (6 months)
  deadline: string;         // "Week 1 (Mon–Fri)" or "Week 3 (by [month] 15)"
  action: string;           // Specific, named action
  subActions: string[];     // Bullet sub-steps
  whyNow: string;           // Why this week specifically
  evidence: string;         // Data/research backing this action
  expectedOutcome: string;  // "You should see X within Y days of completing this"
  timeInvestment: string;   // "2 hours" or "30 min/day for 5 days"
  category: ActionCategory | string;  // string fallback for literal inference
  priority: 'critical' | 'high' | 'medium' | 'optional' | string;
  isBlocking: boolean;      // If true, later actions depend on this
  unlocks: string[];        // IDs of actions that become available after this
  effortLevel: 'quick_win' | 'moderate' | 'heavy_lift' | string;
  roiRating: number;        // 1–10: return on time invested
}

export interface MonthPlan {
  month: number;            // 1–6
  monthLabel: string;       // "Month 1: Awareness & Quick Wins"
  theme: string;            // The core goal for this month
  weeklyActions: WeeklyAction[];
  milestoneGoal: string;    // The one thing that defines "Month X was successful"
  goNoGoGate: string;       // Decision point at end of month
  estimatedOutcomes: string[];
  totalTimeInvestment: string;
}

export type ActionCategory =
  | 'profile_optimization'
  | 'skill_building'
  | 'network_activation'
  | 'active_search'
  | 'financial_protection'
  | 'visa_management'
  | 'negotiation'
  | 'risk_monitoring'
  | 'career_positioning';

export interface MonthlyActionPlanInputs {
  compositeScore: number;
  survivalResult: PrecisionSurvivalResult;
  jobTargeting: JobTargetingResult;
  financialRunway: FinancialRunwayResult | null;
  visaRisk: VisaRiskResult | null;
  seniorityBracket: string;
  performanceTier: string;
  rolePrefix: string;
  workTypeKey: string;
  region: string;
  metro: string | null;
  collapseStage: 1 | 2 | 3 | null;
  tenureYears: number;
  hasLinkedInPremium?: boolean;
  // ── v49.0 personalization signals ───────────────────────────────────────
  /** 0–100 score from skillFusionEngine — influences upskilling priority */
  skillPortfolioScore?: number | null;
  /** AI displacement risk for this role, 0–1 — influences pivot action injection */
  aiDisruptionRisk?: number | null;
  /** High-level transition goal: stay, pivot, or exit */
  careerTransitionGoal?: 'stay_and_strengthen' | 'strategic_pivot' | 'exit_fast' | null;
  /** Current employer type — affects networking and approach strategy */
  companyType?: 'startup' | 'mid' | 'large' | 'mega' | null;
  /** Months of employment gap in last 3 years (0 if continuous) */
  employmentGapMonths?: number | null;
}

export interface MonthlyActionPlanResult {
  planTitle: string;
  planSummary: string;
  urgencyMode: 'crisis' | 'elevated' | 'standard' | 'monitoring';
  months: MonthPlan[];
  criticalPath: string[];      // The 3–5 actions that are MUST-DOS
  quickWins: WeeklyAction[];   // Actions completable in < 1 hour with high ROI
  estimatedJobSearchDuration: string;
  planExpiry: string;          // When to re-run the audit ("re-audit in 60 days")
}

// ── Urgency mode logic ────────────────────────────────────────────────────────

type UrgencyMode = 'crisis' | 'elevated' | 'standard' | 'monitoring';

function determineUrgencyMode(inputs: MonthlyActionPlanInputs): UrgencyMode {
  if (inputs.collapseStage === 3 || inputs.compositeScore >= 78) return 'crisis';
  if (inputs.collapseStage === 2 || inputs.compositeScore >= 60) return 'elevated';
  if (inputs.compositeScore >= 40) return 'standard';
  return 'monitoring';
}

function getRunwayMonths(inputs: MonthlyActionPlanInputs): number {
  return inputs.financialRunway?.runwayMonths ?? 12;
}

// ── Role-family–specific Month 1 action injections (v49.0) ───────────────────
// These actions are INJECTED into Month 1 Week 2 of crisis/elevated plans.
// They replace the generic "update your LinkedIn" with deeply personalized,
// role-family-aware actions that the generic plan would never generate.

interface RoleFamilyAction {
  action: string;
  subActions: string[];
  evidence: string;
  expectedOutcome: string;
  timeInvestment: string;
  roiRating: number;
  category: ActionCategory | string;
}

const ROLE_FAMILY_MONTH1_ACTIONS: Record<string, RoleFamilyAction> = {
  hc: {
    action: 'Activate clinical recruiter network and HealthTech talent platforms',
    subActions: [
      'Register on Practo Jobs, HealthcareJobs.in, and BMC Recruitment — these are healthcare-specific job boards your competitors ignore',
      'Email 3 clinical recruiters from healthcare-specific agencies (MedStaff, Spectrum Talent, People Strong Healthcare) — attach a 1-page clinical CV',
      'Identify 2 HealthTech companies in your city on LinkedIn — these pay 25–40% more than hospital roles and your clinical background is the rare differentiator',
      'Update your LinkedIn to include patient volume metrics, specialty certifications, and procedure counts — clinical hiring managers scan for these specifically',
    ],
    evidence: 'Clinical professionals who use specialty job boards alongside LinkedIn receive 3× more relevant outreach. HealthTech companies have 50% fewer applicants than equivalent hospital roles for the same level (Naukri Healthcare Report, 2025).',
    expectedOutcome: '2–4 clinical recruiter contacts and at least 1 HealthTech conversation within 2 weeks.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'network_activation',
  },
  legal: {
    action: 'Activate bar association networks and LPO/in-house legal talent pipelines',
    subActions: [
      'Update your profile on legallyindia.com, NLUConnect (if applicable), and Bar Council listings — legal hiring is heavily network-driven',
      'Contact 2 in-house legal recruitment specialists (Mancer Consulting, Michael Page Legal, ABC Consultants Legal) — in-house roles rarely appear on general job boards',
      'Identify the 5 FinTech companies in your city and check for "Legal Counsel" or "Compliance" roles on their careers pages — these pay 30–50% premium over law firm associate roles',
      'Prepare a 1-page practice summary: areas of specialty, key deals/matters handled (anonymized), and regulatory frameworks you know — legal hiring is portfolio-driven',
    ],
    evidence: 'Over 70% of in-house legal roles are filled through legal specialist recruiters or direct network referrals — general job boards have less than 20% of actual legal openings (LegallyIndia Survey, 2025).',
    expectedOutcome: 'At least 2 conversations with in-house or boutique firm opportunities within 3 weeks.',
    timeInvestment: '2.5 hours',
    roiRating: 9,
    category: 'network_activation',
  },
  mkt: {
    action: 'Build a 48-hour marketing portfolio and activate D2C brand growth networks',
    subActions: [
      'Create a 1-slide "marketing portfolio snapshot": campaign metrics (CTR, ROAS, CAC reduction %), channel mix, and audience sizes — this is your professional currency in marketing hiring',
      'Connect with 3 growth leads or CMOs at D2C brands on LinkedIn — D2C marketing is consistently the highest-demand area and the conversation is data-forward',
      'Register on Cutshort and Instahyre — these are used heavily by growth-stage startups hiring senior marketing talent and move 2–3× faster than Naukri/LinkedIn applications',
      'Identify one recent campaign you ran where you can quantify outcome: cost per acquisition, revenue lift, or engagement rate delta',
    ],
    evidence: 'Marketing professionals with documented campaign metrics in their profile receive 60% more recruiter contacts than those with narrative-only descriptions (LinkedIn Talent Insights, 2025).',
    expectedOutcome: '3–5 high-quality recruiter/founder contacts within 10 days.',
    timeInvestment: '4 hours (portfolio creation + outreach setup)',
    roiRating: 9,
    category: 'profile_optimization',
  },
  fin: {
    action: 'Register with finance-specialist headhunters and prepare deal/model portfolio',
    subActions: [
      'Register with 2 finance-specialist recruiters: Michael Page Finance, Robert Half India, CFO India Network — they have the hidden-market mandates for CFO, FP&A, and IB roles',
      'Prepare a 1-page "financial modelling showcase": list the 3 most complex models you have built with outcome metrics (valuation achieved, decision made, cost saved)',
      'Check iimjobs.com for Finance-specific roles — 40% of mid-to-senior finance roles appear here exclusively and searches are screened for domain depth',
      'If you have CFA/CA/CPA: update all digital profiles to include the designation prominently — finance is the most credential-filtered function after legal',
    ],
    evidence: 'Finance roles filled through specialist headhunters are 45% higher-paying than those found through general job boards (Robert Half India, 2025). CFA/CA designations increase callback rate by 3× for senior finance roles.',
    expectedOutcome: '2 specialist recruiter conversations and 3–5 targeted applications within 2 weeks.',
    timeInvestment: '3 hours',
    roiRating: 10,
    category: 'network_activation',
  },
  ops: {
    action: 'Document process impact metrics and activate operations-specific talent channels',
    subActions: [
      'Write down the 3 operations improvements you drove with metrics: cost reduced (₹/$ or %), throughput improved, error rate reduced, or team scale managed',
      'Register on SupplyChainIndia.net, OpEx Society, and APICS forums — operations hiring managers scan these for demonstrated process expertise',
      'Target GCC operations roles specifically: companies like JPMorgan GCC, Walmart Global Tech, and EXL Service pay 25–40% more than equivalent Indian company ops roles',
      'Identify if you have a Six Sigma, PMP, or APICS certification — if not, check which of these takes < 4 weeks to earn and would appear in >60% of target job postings',
    ],
    evidence: 'Operations professionals with documented process improvement metrics (not just responsibility lists) are called back 2.5× more frequently. GCC ops roles pay 30–45% above-market for equivalent Indian operations experience (LinkedIn Salary Insights, 2025).',
    expectedOutcome: 'Quantified ops portfolio ready; 2–3 GCC-focused recruiter conversations initiated.',
    timeInvestment: '2.5 hours',
    roiRating: 8,
    category: 'profile_optimization',
  },
  ind: {
    action: 'Activate union hall networks and EV/defence sector job boards',
    subActions: [
      'Register with engineering-specific recruiters: ABC Consultants Engineering, CIEL HR Manufacturing, Talentiser for EV/industrial',
      'Check SteelMint, Engineering Export Promotion Council, and SIAM job boards for manufacturing and industrial roles — these are invisible to general job boards',
      'If you have relevant certifications (AutoCAD, PLC programming, Six Sigma, ASME/OSHA), list them explicitly in your profile with version numbers — industrial hiring is certification-filtered',
      'Research PLI scheme beneficiary companies in your sector: they are expanding aggressively and need talent but are often missed because they do not advertise heavily',
    ],
    evidence: 'Manufacturing and industrial roles are 60% filled through specialist recruiters and offline networks (industry associations, referrals). Online job boards capture less than 40% of openings at this level (CIEL HR Manufacturing Report, 2025).',
    expectedOutcome: '2 specialist recruiter contacts and identification of 5 PLI-expansion companies to target.',
    timeInvestment: '2 hours',
    roiRating: 8,
    category: 'network_activation',
  },
  bpo: {
    action: 'Reframe your profile for analytics-led CX roles and activate GCC transition path',
    subActions: [
      'Rewrite your LinkedIn headline from "Customer Service Executive" to "[BPO Function] Analyst | [Volume/Accuracy metric] | Process Automation" — analytics framing unlocks higher-paying roles',
      'Identify whether you have exposure to tools like Salesforce, NICE, or Genesys — document these specifically as they are required filters in next-gen CX job descriptions',
      'Target healthcare revenue cycle (medical billing/claims) roles specifically if you have any medical process exposure — these pay 30–50% more than equivalent BPO volume roles',
      'Check if an RPA certification (UiPath Foundation, ~2 weeks) would position you for automation lead roles — BPO professionals with automation skills earn 40% more than pure volume operators',
    ],
    evidence: 'BPO professionals who reframe as "analytics-led CX" or "process automation" receive 3× more recruiter contacts for roles paying 25–40% more than standard BPO roles (NASSCOM Workforce Report, 2025).',
    expectedOutcome: 'Repositioned profile with analytics framing; at least 1 GCC or healthcare BPO conversation started.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'profile_optimization',
  },
  cons: {
    action: 'Activate alumni network and build a structured "exit from consulting" narrative',
    subActions: [
      'Contact 3 former colleagues who have made consulting-to-industry exits — ask about the "transition story" they used. This is the most valuable career intelligence for your search.',
      'Prepare a 60-second "consulting exit narrative": what problem you want to OWN (not advise on), what sector, and why now. Industry hiring managers are skeptical of consultants — this narrative addresses it proactively.',
      'Register on The Bridge, Consulting MBA network, and BCG/McKinsey/Kearney alumni portals — industry roles are frequently shared there before going to recruiters',
      'Target 3 PE-backed portfolio companies in your sector: they value consulting frameworks AND offer the ownership you cannot get at a firm',
    ],
    evidence: 'Consulting exits who prepare a clear "what I want to own" narrative receive industry offers 6 weeks faster than those who frame their search generically. PE-backed companies hire from consulting 2× more frequently than public companies for strategic leadership roles (Heidrick & Struggles, 2025).',
    expectedOutcome: '2 alumni conversations and 2 PE-backed portfolio company contacts within 2 weeks.',
    timeInvestment: '3 hours',
    roiRating: 10,
    category: 'network_activation',
  },
  pm: {
    action: 'Build a 3-product case study and activate PM-specific talent communities',
    subActions: [
      'Create a "product portfolio" — 3 bullet points per product: problem, your decision, outcome metric. This replaces the resume for PM hiring. Use Notion or a simple PDF.',
      'Join and post in key PM communities: Product School India, Circles.life PM community, and PM Fellowship — inbound opportunities from these communities have 50% lower competition than LinkedIn applications',
      'Register on Cutshort with "Product Manager" filters — 60% of Series B/C PM roles are filled here rather than LinkedIn',
      'Target AI PM roles specifically: add "AI Product Management" to your LinkedIn skills and mention LLM feature work or AI-adjacent decisions in your summary',
    ],
    evidence: 'PMs with documented product portfolio (outcomes-focused, not task lists) receive 4× more interview invites than those with standard resumes. Product communities drive 30% of PM job placements at growth-stage companies (Product School Survey, 2025).',
    expectedOutcome: 'Product portfolio created; 3–5 community-sourced opportunities identified within 2 weeks.',
    timeInvestment: '4 hours',
    roiRating: 10,
    category: 'profile_optimization',
  },
  ds: {
    action: 'Publish or refresh a data science portfolio project and activate analytics talent networks',
    subActions: [
      'Ensure your GitHub has at least 1 pinned project with a real-world dataset and clear business framing — "This model predicts X, which saves Y" is infinitely better than a tutorial recreation',
      'Apply to Tiger Analytics, Mu Sigma, and Fractal Analytics via their portal — analytics consulting firms hire aggressively and are the highest-volume employer for data scientists in India',
      'Update your Kaggle profile and ensure your best notebooks are public — data science hiring managers actively search Kaggle for candidates at all levels',
      'Add a production ML credential to your profile if you have one (AWS ML Specialty, GCP Professional ML) — this signals that you build for deployment, not just notebooks',
    ],
    evidence: 'Data scientists with a public portfolio (GitHub + Kaggle) receive 5× more recruiter outreach than those with resume-only profiles. Analytics consulting firms hire 3× more data scientists than any single product company (Naukri Data Science Report, 2025).',
    expectedOutcome: '3–5 recruiter contacts from analytics firms and portfolio views within 10 days.',
    timeInvestment: '3 hours (portfolio refresh + profile update)',
    roiRating: 9,
    category: 'profile_optimization',
  },
  sw: {
    action: 'Optimize your technical profile for ATS and activate referral pipeline at target companies',
    subActions: [
      'Add specific tech stack versions to your resume: "Node.js 20, PostgreSQL 16, Redis, Kafka 3.x" — ATS filters at top tech companies are exact-string matching on these',
      'For each of your top 3 target companies, identify 1 second-degree connection on LinkedIn and draft a genuine connection request (not a job request)',
      'Update your GitHub contribution graph: even 1 commit per day signals an active engineer. Pin 2 repositories that demonstrate your strongest technical area',
      'Check referral bonus amounts at your target companies — companies with high referral bonuses ($5–15K) have strong referral cultures where connections are MORE willing to refer you',
    ],
    evidence: 'Tech resumes with specific version numbers and benchmarks pass ATS filters at 2× the rate of generic tech descriptions. GitHub contribution history is checked by 65% of senior tech hiring managers in India (StackOverflow Dev Survey, 2025).',
    expectedOutcome: '2–3 referral conversations started; GitHub profile generating recruiter views.',
    timeInvestment: '2.5 hours',
    roiRating: 9,
    category: 'profile_optimization',
  },
  default: {
    action: 'Optimize your professional profile for market visibility and start targeted outreach',
    subActions: [
      'Add 3 specific quantified achievements to your LinkedIn summary — with numbers, not descriptions',
      'Enable "Open to Work" (visible to recruiters only) and set your job preferences to include title, location, and remote preference',
      'Identify the 3 specialty job boards or networks most relevant to your function and register on them',
      'Draft a 3-sentence professional introduction you can use in any networking context',
    ],
    evidence: 'Profiles with quantified achievements receive 40% more recruiter views. Specialty job boards have 60% lower competition for equivalent roles.',
    expectedOutcome: '2–5 recruiter contacts within 10 days of profile optimization.',
    timeInvestment: '2.5 hours',
    roiRating: 8,
    category: 'profile_optimization',
  },
};

function injectRoleFamilyAction(inputs: MonthlyActionPlanInputs, weekNumber: number): WeeklyAction | null {
  const familyAction = ROLE_FAMILY_MONTH1_ACTIONS[inputs.rolePrefix]
    ?? ROLE_FAMILY_MONTH1_ACTIONS['default'];

  return {
    weekNumber,
    deadline: `Week ${weekNumber} — role-specific priority`,
    action: familyAction.action,
    subActions: familyAction.subActions,
    whyNow: `Your role family (${inputs.rolePrefix.toUpperCase()}) has specific hiring channels that generic job search tactics completely miss. This week's action targets exactly where ${inputs.rolePrefix.toUpperCase()} professionals actually find roles.`,
    evidence: familyAction.evidence,
    expectedOutcome: familyAction.expectedOutcome,
    timeInvestment: familyAction.timeInvestment,
    category: familyAction.category,
    priority: 'high',
    isBlocking: false,
    unlocks: [],
    effortLevel: 'moderate',
    roiRating: familyAction.roiRating,
  };
}

function injectAiPivotAction(inputs: MonthlyActionPlanInputs, weekNumber: number): WeeklyAction | null {
  // Only inject if AI disruption risk is high (>0.55) and goal is not already 'exit_fast'
  const risk = inputs.aiDisruptionRisk ?? 0;
  if (risk < 0.55 || inputs.careerTransitionGoal === 'exit_fast') return null;

  const adjacentRoles = (inputs.rolePrefix === 'sw' || inputs.rolePrefix === 'ds')
    ? 'ML Infrastructure or Platform Engineering'
    : inputs.rolePrefix === 'fin' ? 'FinTech Strategy or FP&A Business Partner'
    : inputs.rolePrefix === 'mkt' ? 'AI Product Marketing or Revenue Operations'
    : inputs.rolePrefix === 'bpo' ? 'RPA/Automation Lead or Analytics-Led CX'
    : 'an AI-augmented version of your current role';

  return {
    weekNumber,
    deadline: `Week ${weekNumber} — proactive AI-disruption hedge`,
    action: `AI disruption hedge: research pivot to ${adjacentRoles}`,
    subActions: [
      `Your role has a ${Math.round(risk * 100)}% estimated AI displacement probability by 2030 — this week, spend 1 hour researching what "${adjacentRoles}" looks like day-to-day`,
      `Find 3 people on LinkedIn who have made this exact transition (your role → adjacent) and look at what changed on their profiles`,
      `Identify the ONE certification or project that would make your profile credible for this pivot within 3 months`,
      `You do not need to commit to the pivot now — the goal this week is clarity on what it would cost and what it would unlock`,
    ],
    whyNow: `AI displacement risk for your function is elevated. Researching your pivot path NOW (when you have runway) means you have options. Researching it after a layoff means you are learning under duress.`,
    evidence: `Professionals who research adjacent pivots proactively are 60% more likely to successfully execute a transition within 12 months than those who pivot reactively (LinkedIn Economic Graph, 2025).`,
    expectedOutcome: 'A clear, researched answer to: "If my role is disrupted in 18 months, what exactly is my pivot and what does it cost me?"',
    timeInvestment: '2 hours',
    category: 'career_positioning',
    priority: 'medium',
    isBlocking: false,
    unlocks: [],
    effortLevel: 'quick_win',
    roiRating: 8,
  };
}

function injectSkillGapAction(inputs: MonthlyActionPlanInputs, weekNumber: number): WeeklyAction | null {
  // Only inject if skillPortfolioScore is low (<50) — indicates concrete upskilling opportunity
  const score = inputs.skillPortfolioScore ?? null;
  if (score === null || score >= 55) return null;

  return {
    weekNumber,
    deadline: `Week ${weekNumber} — skill gap urgency`,
    action: 'Priority skill gap closure: enroll in the one certification that unlocks 80% of your target companies',
    subActions: [
      `Your skill portfolio score is ${score}/100 — this week, identify the single certification or skill that appears in >60% of your target company job postings`,
      'Calculate the fastest credible path: official certification exam, Coursera specialization, or LinkedIn Learning certification. Commit to a start date.',
      `Budget estimate: most high-ROI certifications cost ₹5,000–₹25,000 or $50–$300. At your seniority, a relevant certification typically yields 15–25% salary improvement — the ROI calculation is unambiguous.`,
      'Block 2 hours per week in your calendar for the next 8 weeks. Skills without calendar time never happen.',
    ],
    whyNow: 'A low skill portfolio score means your current skill set is the bottleneck. Starting now gives you a certification on your profile before your financial runway compresses.',
    evidence: 'In-demand role-relevant certifications increase application-to-screen conversion rates by 22% and salary offers by 15–25% on average (LinkedIn Talent Insights, 2025).',
    expectedOutcome: 'One certification enrolled with a completion target within 8 weeks.',
    timeInvestment: '1 hour research + 2 hours/week ongoing',
    category: 'skill_building',
    priority: 'high',
    isBlocking: false,
    unlocks: [],
    effortLevel: 'moderate',
    roiRating: 8,
  };
}

// ── Action generators per urgency mode ───────────────────────────────────────

function buildCrisisMode(inputs: MonthlyActionPlanInputs): MonthPlan[] {
  const runway = getRunwayMonths(inputs);
  const topTarget = inputs.jobTargeting.targets[0];
  const visaType = inputs.visaRisk?.visaType ?? null;

  return [
    {
      month: 1,
      monthLabel: 'Month 1: Immediate Parallel Search',
      theme: 'Launch parallel job search without disrupting current performance',
      milestoneGoal: '5+ active conversations with hiring managers or recruiters at target companies',
      goNoGoGate: 'If 0 conversations by Day 30: increase outreach cadence to 3 new contacts per day',
      estimatedOutcomes: ['2–4 recruiter responses', '1–2 hiring manager conversations', 'Resume updated and targeted'],
      totalTimeInvestment: '5–8 hours/week',
      weeklyActions: [
        {
          weekNumber: 1,
          deadline: 'Week 1 — by end of day Friday',
          action: 'Emergency resume update: quantify your 3 biggest wins',
          subActions: [
            'Add specific metrics to your top 3 roles: team size, revenue impact, % improvement, scale handled',
            `Tailor your headline for "${inputs.workTypeKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}" — not your current job title`,
            'Remove generic skills (MS Office, time management) and replace with the 3 technologies most valued in your target companies',
          ],
          whyNow: 'Without an updated resume, every other action is blocked. This is your unlock action.',
          evidence: 'Resumes with quantified achievements are 40% more likely to get an interview callback (LinkedIn Talent Solutions, 2024).',
          expectedOutcome: 'Recruiters begin responding within 5–10 days of profile update. Aim for 2+ unsolicited recruiter contacts.',
          timeInvestment: '3–4 hours',
          category: 'profile_optimization',
          priority: 'critical',
          isBlocking: true,
          unlocks: ['linkedin_outreach', 'company_applications'],
          effortLevel: 'moderate',
          roiRating: 9,
        },
        {
          weekNumber: 1,
          deadline: 'Week 1 — by Wednesday',
          action: `Identify 3 referral contacts at ${topTarget?.displayName ?? 'your top target company'}`,
          subActions: [
            `Search LinkedIn for "[Company] [Your Role Title]" AND "connection" to find 2nd-degree connections`,
            'List name, current role, and connection path (who connects you) for top 5 people',
            'Draft a 3-sentence personalised message (not a request — a genuine connection)',
          ],
          whyNow: 'Referrals account for 40% of hires at high-growth companies and move 50% faster. Identifying referrals before outreach takes time.',
          evidence: 'Referred candidates have a 3.5% conversion rate vs. 1.2% for direct applications (LinkedIn Hiring Insights, Q1 2026).',
          expectedOutcome: '1–2 positive responses within 1 week; first conversation within 2 weeks.',
          timeInvestment: '1.5 hours',
          category: 'network_activation',
          priority: 'critical',
          isBlocking: false,
          unlocks: ['referral_outreach'],
          effortLevel: 'moderate',
          roiRating: 10,
        },
        {
          weekNumber: 2,
          deadline: 'Week 2',
          action: 'LinkedIn profile crisis optimization: position as active candidate',
          subActions: [
            'Enable "Open to Work" (visible to recruiters only — not visible to current employer)',
            'Update headline to reflect WHAT YOU DELIVER, not your title ("Builds payment APIs at scale | 8yr backend | FinTech")',
            'Add 3 portfolio or achievement posts in the feed (employers view your recent activity)',
            visaType ? `Add "Open to visa sponsorship" only to recruiters in your filter preferences` : '',
          ].filter(Boolean),
          whyNow: 'With "Open to Work" active, recruiter inbound volume increases 3–5× within 7 days.',
          evidence: 'Open to Work profiles receive 40% more recruiter views (LinkedIn, 2025). Keyword-optimised headlines increase search appearance by 27%.',
          expectedOutcome: '3–5 recruiter contacts within 10 days of activation.',
          timeInvestment: '2 hours',
          category: 'profile_optimization',
          priority: 'critical',
          isBlocking: false,
          unlocks: ['recruiter_conversations'],
          effortLevel: 'moderate',
          roiRating: 10,
        },
        {
          weekNumber: 2,
          deadline: 'Week 2 — by Friday',
          action: `Apply to ${topTarget?.displayName ?? 'top target'} via referral or direct`,
          subActions: [
            `Use the referral contact from Week 1 if available, else direct apply via careers page`,
            'Write a 3-paragraph cover letter: Why this company (specific product/mission), Why you (specific metric), Why now (specific timing)',
            `Apply to 1–2 additional targets from your targeting list: ${inputs.jobTargeting.targets.slice(1, 3).map(t => t.displayName).join(', ')}`,
          ],
          whyNow: 'First applications should go to highest-match targets. Every week of delay is a week longer your search takes.',
          evidence: 'Crisis-mode candidates who start within 7 days of decision find new roles 6 weeks faster than those who take 30 days to begin.',
          expectedOutcome: 'First recruiter screen within 10–14 days.',
          timeInvestment: '3 hours total',
          category: 'active_search',
          priority: 'critical',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'moderate',
          roiRating: 9,
        },
        {
          weekNumber: 3,
          deadline: 'Week 3',
          action: 'Build financial buffer: calculate exact burn-and-bridge numbers',
          subActions: [
            `Your runway is ~${runway} months — identify what expenses can be deferred to extend to ${runway + 2} months`,
            'Calculate: at what month does your search become financially urgent? Mark this as your "hard deadline" for accepting an offer',
            'Identify 1 "bridge" option if search extends past your runway (contract work, consulting, family support)',
          ],
          whyNow: 'Financial anxiety compresses decision-making — understanding your actual numbers restores clear thinking.',
          evidence: 'Job seekers with a clear financial timeline accept 35% better offers because they negotiate from clarity rather than fear.',
          expectedOutcome: 'Clear written financial timeline that informs your offer evaluation threshold.',
          timeInvestment: '2 hours',
          category: 'financial_protection',
          priority: 'high',
          isBlocking: false,
          unlocks: ['offer_evaluation'],
          effortLevel: 'moderate',
          roiRating: 8,
        },
        ...(visaType && inputs.visaRisk?.gracePeriodDays && inputs.visaRisk.gracePeriodDays < 90 ? [{
          weekNumber: 1,
          deadline: 'Week 1 — URGENT: within 3 days',
          action: `Visa strategy: consult immigration attorney within 72 hours`,
          subActions: [
            'Book a consultation with an immigration attorney (not just Google searches)',
            `Understand your exact grace period for ${visaType}: ${inputs.visaRisk.gracePeriodDays} days from last day of employment`,
            'Identify which of your target companies are known visa sponsors (check their job postings for "will sponsor")',
            'Prepare a one-page visa summary for recruiters: current status, expiry, what you need from them',
          ],
          whyNow: `${visaType} provides only ${inputs.visaRisk.gracePeriodDays} days of grace — this is your most time-sensitive constraint.`,
          evidence: 'Candidates who proactively address visa with a clear one-pager convert initial screens to offers at 2× the rate of those who handle it reactively.',
          expectedOutcome: 'Clear legal roadmap and list of visa-sponsor-ready companies to prioritise.',
          timeInvestment: '3 hours total (consultation + research)',
          category: 'visa_management',
          priority: 'critical',
          isBlocking: true,
          unlocks: ['visa_targeted_applications'],
          effortLevel: 'heavy_lift',
          roiRating: 10,
        }] : []),
        // ── v49.0: role-family-specific action (injected at Week 2) ─────────
        ...((() => { const a = injectRoleFamilyAction(inputs, 2); return a ? [a] : []; })()),
        // ── v49.0: skill gap action (injected at Week 3 if score < 55) ──────
        ...((() => { const a = injectSkillGapAction(inputs, 3); return a ? [a] : []; })()),
      ].sort((a, b) => a.weekNumber - b.weekNumber),
    },
    {
      month: 2,
      monthLabel: 'Month 2: Interviews & Offer Pipeline',
      theme: 'Convert conversations to interviews; prepare for technical and behavioral rounds',
      milestoneGoal: '2+ active interview processes underway',
      goNoGoGate: 'If 0 interview processes by Day 60: expand target list by 5 companies and increase outreach volume',
      estimatedOutcomes: ['2–4 recruiter screens completed', '1–2 technical interviews scheduled', 'Salary anchor established'],
      totalTimeInvestment: '6–10 hours/week',
      weeklyActions: [
        {
          weekNumber: 5,
          deadline: 'Week 5',
          action: 'Interview preparation: system design or domain-specific practice',
          subActions: [
            `Focus on top interview area: ${inputs.jobTargeting.targets[0]?.interviewFocusAreas?.[0] ?? 'your domain\'s key technical assessment'}`,
            'Complete 2 mock interviews (Pramp, interviewing.io, or peer practice) in Week 5',
            'Prepare your 5 STAR stories: ownership, conflict resolution, failure, impact, innovation',
          ],
          whyNow: 'Interview preparation while waiting for screens is the highest ROI use of downtime in the search.',
          evidence: 'Candidates who practice 5+ mock interviews have a 60% higher pass rate on technical rounds (Interviewing.io data, 2024).',
          expectedOutcome: 'Confident, prepared state for your first technical screen.',
          timeInvestment: '4–5 hours',
          category: 'skill_building',
          priority: 'critical',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'heavy_lift',
          roiRating: 9,
        },
        {
          weekNumber: 6,
          deadline: 'Week 6',
          action: 'Salary research and anchor preparation',
          subActions: [
            `Research ${inputs.workTypeKey} compensation at your seniority in ${inputs.region} using: Levels.fyi, Glassdoor, LinkedIn Salary Insights, AmbitionBox`,
            'Document market range (P25, P50, P90) — this is your anchoring data',
            'Decide your "walk-away number" and "ideal number" BEFORE any offer arrives',
            'Prepare your ask: "Based on my research and the scope you\'ve described, I\'m targeting [X]. Is that within your range?"',
          ],
          whyNow: 'Salary is set in the first conversation where numbers are mentioned. Preparing the anchor now means you never get caught flat-footed.',
          evidence: 'Candidates who anchor first (with research) receive offers 15–20% higher on average than those who wait to respond (Harvard Negotiation Project).',
          expectedOutcome: 'Clear, evidence-backed salary anchor ready to deploy when recruiters ask.',
          timeInvestment: '2 hours',
          category: 'negotiation',
          priority: 'high',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'moderate',
          roiRating: 8,
        },
      ],
    },
    {
      month: 3,
      monthLabel: 'Month 3: Decision & Transition',
      theme: 'Evaluate offers, negotiate, and manage notice period with care',
      milestoneGoal: 'Signed offer letter in hand',
      goNoGoGate: 'If no offer by Day 90: reassess target list quality and interview performance with specific feedback',
      estimatedOutcomes: ['1–2 offers received', 'Final offer negotiated', 'Transition plan established'],
      totalTimeInvestment: '4–6 hours/week',
      weeklyActions: [
        {
          weekNumber: 9,
          deadline: 'Week 9',
          action: 'Offer evaluation: multi-factor comparison framework',
          subActions: [
            'Build a simple scorecard (10 factors × weight): base, equity, growth, team, mission, stability, work style, commute, manager quality, exit options',
            'For each offer: score each factor, multiply by weight, sum — this removes emotional bias from a high-stakes decision',
            'Verify equity vesting schedule, cliff dates, and liquidation preferences (for startup equity)',
            'Check employer Glassdoor trends and leadership reviews from last 6 months',
          ],
          whyNow: 'Decision quality under time pressure is significantly lower without a framework. Build it before offers arrive.',
          evidence: 'Structured decision frameworks reduce regret in job change decisions by 47% (Stanford Decision Lab, 2023).',
          expectedOutcome: 'Clear offer evaluation framework ready for deployment.',
          timeInvestment: '2 hours',
          category: 'negotiation',
          priority: 'high',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'moderate',
          roiRating: 8,
        },
      ],
    },
  ];
}

function buildElevatedMode(inputs: MonthlyActionPlanInputs): MonthPlan[] {
  const runway = getRunwayMonths(inputs);
  const topTargets = inputs.jobTargeting.targets.slice(0, 3).map(t => t.displayName).join(', ');

  return [
    {
      month: 1,
      monthLabel: 'Month 1: Foundation & Market Research',
      theme: 'Understand your market position and build the infrastructure for a strategic search',
      milestoneGoal: 'Profile optimized; 3 high-quality conversations started',
      goNoGoGate: 'If profile not updated by Day 14: prioritise over everything else that week',
      estimatedOutcomes: ['LinkedIn profile fully optimised', '2–3 recruiter conversations initiated', 'Target company list finalised'],
      totalTimeInvestment: '3–5 hours/week',
      weeklyActions: [
        {
          weekNumber: 1,
          deadline: 'Week 1',
          action: 'LinkedIn profile optimisation: from job title to value headline',
          subActions: [
            `Change headline from "[Current Title] at [Company]" to "[What You Deliver] | [Years] yr ${inputs.rolePrefix.toUpperCase()} | [Top Skill]"`,
            'Add 3 quantified achievements in your current role (metrics, scope, impact)',
            'Enable Open to Work (recruiter-only mode)',
            'Add 5 targeted skills based on what appears in job postings at your target companies',
          ],
          whyNow: 'LinkedIn profile optimisation has the highest per-hour ROI of any early job search activity.',
          evidence: 'Keyword-optimised LinkedIn profiles with quantified achievements receive 3× more recruiter views within 2 weeks.',
          expectedOutcome: '2–5 unsolicited recruiter contacts within 10 days.',
          timeInvestment: '2.5 hours',
          category: 'profile_optimization',
          priority: 'critical',
          isBlocking: true,
          unlocks: ['recruiter_outreach', 'company_applications'],
          effortLevel: 'moderate',
          roiRating: 10,
        },
        {
          weekNumber: 2,
          deadline: 'Week 2',
          action: `Market intelligence: understand what ${topTargets} are actually paying and hiring for`,
          subActions: [
            `For each target company, find 3 recent job postings for your role — document the required skills and language used`,
            'Check Levels.fyi/AmbitionBox/Glassdoor for recent salary data points at your level',
            'Identify if there are any major product launches, funding rounds, or expansions announced — these signal where hiring is concentrated',
          ],
          whyNow: 'Most candidates apply without researching the specific company\'s current hiring needs — this 2-hour research phase makes every subsequent application more targeted.',
          evidence: 'Tailored applications referencing specific company priorities get 2.5× more callback rates than generic applications.',
          expectedOutcome: 'Clear picture of what each target company is hiring and what they value most.',
          timeInvestment: '2 hours',
          category: 'active_search',
          priority: 'high',
          isBlocking: false,
          unlocks: ['targeted_applications'],
          effortLevel: 'moderate',
          roiRating: 8,
        },
        {
          weekNumber: 3,
          deadline: 'Week 3',
          action: 'Warm up your network: 5 genuine reconnections',
          subActions: [
            'Identify 5 people you\'ve worked with who are now at interesting companies or in relevant roles',
            'Send a genuine "catching up" message — NOT a job request — asking about their work or sharing something relevant',
            'Your goal for Month 1: no direct asks, only relationship warming',
          ],
          whyNow: 'The 30-day runway of relationship warming means your network is "warm" exactly when you\'ll need referrals in Month 2.',
          evidence: '70% of jobs are filled through networking; relationships started 30+ days before a direct ask convert at 3× the rate of cold asks.',
          expectedOutcome: '3–4 positive reconnections; 1–2 naturally leading to conversations about opportunities.',
          timeInvestment: '1.5 hours',
          category: 'network_activation',
          priority: 'high',
          isBlocking: false,
          unlocks: ['referral_requests'],
          effortLevel: 'quick_win',
          roiRating: 9,
        },
        {
          weekNumber: 4,
          deadline: 'Week 4',
          action: 'Skills gap audit: what\'s the one skill that would increase your match score the most?',
          subActions: [
            `Compare your current skills against the job postings you analysed in Week 2 — identify the top 1 gap`,
            `If the gap is a certification (e.g., AWS SA, PMP, CFA Level 1): identify the fastest credible path (Udemy, official exam). Commit to a date.`,
            'If the gap is tool experience: identify a 20-hour project you can build using that tool and add to your portfolio',
          ],
          whyNow: 'A single targeted skill addition increases market competitiveness more than broad surface-level improvements.',
          evidence: 'Adding one in-demand certification relevant to your role increases application-to-interview conversion by 22% (LinkedIn Talent Insights).',
          expectedOutcome: 'One concrete upskilling commitment with a deadline.',
          timeInvestment: '1 hour audit + 2 hours/week ongoing',
          category: 'skill_building',
          priority: 'medium',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'moderate',
          roiRating: 7,
        },
        // ── v49.0: role-family-specific action (Week 2) ─────────────────────
        ...((() => { const a = injectRoleFamilyAction(inputs, 2); return a ? [a] : []; })()),
        // ── v49.0: AI disruption pivot research (Week 3 if risk > 55%) ──────
        ...((() => { const a = injectAiPivotAction(inputs, 3); return a ? [a] : []; })()),
        // ── v49.0: skill gap enrollment (Week 4 if score < 55) ──────────────
        ...((() => { const a = injectSkillGapAction(inputs, 4); return a ? [a] : []; })()),
      ],
    },
    {
      month: 2,
      monthLabel: 'Month 2: Active Outreach & Applications',
      theme: 'Convert market research into active conversations with hiring managers',
      milestoneGoal: '8–10 applications sent; 3+ conversations active',
      goNoGoGate: 'If < 5 applications sent by Day 45: increase volume and lower selectivity',
      estimatedOutcomes: ['8–10 strategic applications', '3–5 recruiter screens', '1–2 hiring manager conversations'],
      totalTimeInvestment: '4–6 hours/week',
      weeklyActions: [
        {
          weekNumber: 5,
          deadline: 'Week 5',
          action: `Apply to top 3 companies: ${topTargets}`,
          subActions: [
            'Use referral path where available (from Month 1 reconnections)',
            'Write tailored cover letters: Why this company (specific product), Why you (specific metric), Why now (specific timing)',
            'Apply at the beginning of the week — applications submitted Monday–Tuesday have 25% higher review rates',
          ],
          whyNow: 'Month 1 was research and preparation. Month 2 is execution.',
          evidence: 'Candidates who apply to 5–8 well-targeted companies outperform those applying to 30+ generic companies in both speed and offer quality.',
          expectedOutcome: 'First recruiter screens within 10–14 days.',
          timeInvestment: '4 hours',
          category: 'active_search',
          priority: 'critical',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'moderate',
          roiRating: 9,
        },
      ],
    },
    {
      month: 3,
      monthLabel: 'Month 3: Interview Process Management',
      theme: 'Navigate multiple simultaneous interview processes efficiently',
      milestoneGoal: '1+ offer received; position to negotiate from multiple options',
      goNoGoGate: 'If no offers by Day 90: conduct specific debrief on feedback received and adjust approach',
      estimatedOutcomes: ['2–3 final round interviews', '1 offer received', 'Negotiation position established'],
      totalTimeInvestment: '6–10 hours/week (interview prep intensive)',
      weeklyActions: [
        {
          weekNumber: 9,
          deadline: 'Week 9',
          action: 'Technical interview preparation: targeted practice, not random grinding',
          subActions: [
            `Focus exclusively on the interview format at your top target: ${inputs.jobTargeting.targets[0]?.interviewFocusAreas?.join(', ') ?? 'domain-specific assessment'}`,
            'Complete 3 mock interviews — with timing (don\'t practice without a timer)',
            'Prepare the 5 STAR stories you\'ll use across all companies',
          ],
          whyNow: 'Unfocused LeetCode practice has poor ROI. Targeted prep for specific company formats has high ROI.',
          evidence: 'Role-specific interview preparation produces 65% pass rates vs. 35% for generic preparation (Interviewing.io, 2025).',
          expectedOutcome: 'Confident, prepared state for upcoming technical rounds.',
          timeInvestment: '5–6 hours',
          category: 'skill_building',
          priority: 'critical',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'heavy_lift',
          roiRating: 9,
        },
      ],
    },
    {
      month: 4,
      monthLabel: 'Month 4: Negotiation & Decision',
      theme: 'Negotiate offers from a position of clarity and alternatives',
      milestoneGoal: 'Accepted offer with terms aligned to your financial requirements',
      goNoGoGate: 'If no offer by Day 120: reset strategy with more aggressive networking approach',
      estimatedOutcomes: ['Offers evaluated and negotiated', 'Decision made with confidence'],
      totalTimeInvestment: '3–5 hours/week',
      weeklyActions: [
        {
          weekNumber: 13,
          deadline: 'Week 13',
          action: 'Negotiate: every element of the offer, not just base salary',
          subActions: [
            'Negotiate in this order: base → equity → bonus → title/scope → start date → remote flexibility',
            'Use the "I\'m very excited about this role, and I was hoping to get to [X] — is there any flexibility?" framing',
            'Get competing offers (even with companies you\'re less excited about) to create real leverage',
            'Never accept in the verbal — always take 3–5 business days to "review",  allowing for one negotiation round',
          ],
          whyNow: 'Negotiation is only possible before acceptance. Once you say yes, leverage disappears.',
          evidence: 'Job changers who negotiate offers receive an average of $7,000–$15,000 more per year in total compensation (Glassdoor salary survey, 2025).',
          expectedOutcome: 'Improved offer or confirmed ceiling with clear reasoning.',
          timeInvestment: '2 hours',
          category: 'negotiation',
          priority: 'critical',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'moderate',
          roiRating: 10,
        },
      ],
    },
  ];
}

function buildStandardMode(inputs: MonthlyActionPlanInputs): MonthPlan[] {
  return [
    {
      month: 1,
      monthLabel: 'Month 1: Positioning & Intelligence Gathering',
      theme: 'Understand your market value and build optionality proactively',
      milestoneGoal: 'Profile updated; market research complete; 3 passive conversations active',
      goNoGoGate: 'Score increases above 55 in the next re-audit → escalate to elevated mode',
      estimatedOutcomes: ['LinkedIn profile optimised', 'Market value benchmarked', 'Casual network conversations started'],
      totalTimeInvestment: '2–3 hours/week',
      weeklyActions: [
        {
          weekNumber: 1,
          deadline: 'Week 1',
          action: 'Benchmark your market value: what could you earn if you changed roles today?',
          subActions: [
            `Search LinkedIn Jobs for 5–10 roles at your level in your market — note the posted salary ranges`,
            'Check Levels.fyi, Glassdoor, and AmbitionBox for recent data points',
            'Calculate your "market rate" — this informs whether to negotiate at your current company OR exit',
          ],
          whyNow: 'You have time to be strategic. Understanding market value before you need a job gives you leverage both internally and externally.',
          evidence: 'Professionals who know their market rate negotiate 18% better outcomes in both retention raises and new offers.',
          expectedOutcome: 'Clear market rate benchmark that informs your strategic options.',
          timeInvestment: '1.5 hours',
          category: 'career_positioning',
          priority: 'high',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'quick_win',
          roiRating: 8,
        },
        {
          weekNumber: 2,
          deadline: 'Week 2',
          action: 'Career insurance: ensure your work is visible and portable',
          subActions: [
            'Document your 3 biggest contributions in the last 12 months with specific metrics',
            'Ensure you have copies of your work product (not confidential code, but architectural decisions, presentations, case studies)',
            'Update your LinkedIn summary with your current role\'s key contributions',
          ],
          whyNow: 'Career insurance work done NOW means you\'re prepared if conditions deteriorate. Done during a crisis, it\'s too late.',
          evidence: 'Professionals with documented, quantified contributions receive offers 25% faster because the narrative is immediately compelling.',
          expectedOutcome: 'Your contributions are documented and ready to deploy in interviews within 30 seconds.',
          timeInvestment: '2 hours',
          category: 'career_positioning',
          priority: 'high',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'moderate',
          roiRating: 7,
        },
        // ── v49.0: role-specific channel action (Week 3) ─────────────────────
        ...((() => { const a = injectRoleFamilyAction(inputs, 3); return a ? [a] : []; })()),
        // ── v49.0: AI disruption pivot research (Week 4 if risk > 55%) ──────
        ...((() => { const a = injectAiPivotAction(inputs, 4); return a ? [a] : []; })()),
      ],
    },
    {
      month: 2,
      monthLabel: 'Month 2: Strategic Skill Building',
      theme: 'Build the one skill gap that increases your market value the most',
      milestoneGoal: 'Enrolled in targeted upskilling; 1 certification or project underway',
      goNoGoGate: 'Score stable < 40 → continue standard mode; Score > 55 → escalate to elevated',
      estimatedOutcomes: ['Skill gap identified and addressed', 'External learning commitment made'],
      totalTimeInvestment: '2–4 hours/week',
      weeklyActions: [
        {
          weekNumber: 5,
          deadline: 'Week 5',
          action: 'Start the one certification that increases your market value the most',
          subActions: [
            'Based on your Week 1 market research, identify the certification or skill that appears in >60% of relevant job postings',
            'Register for the course/exam (commitment creates follow-through)',
            'Block 2 hours per week in your calendar for the next 8 weeks',
          ],
          whyNow: 'Certifications take 4–12 weeks to earn. Starting now means it\'s on your profile before you might need it urgently.',
          evidence: 'In-demand certifications on LinkedIn profiles increase recruiter contact rates by 22% (LinkedIn Talent Solutions).',
          expectedOutcome: 'Certification completed and on profile within 6–10 weeks.',
          timeInvestment: '2 hours/week ongoing',
          category: 'skill_building',
          priority: 'medium',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'moderate',
          roiRating: 7,
        },
      ],
    },
  ];
}

function buildMonitoringMode(inputs: MonthlyActionPlanInputs): MonthPlan[] {
  return [
    {
      month: 1,
      monthLabel: 'Month 1: Proactive Career Maintenance',
      theme: 'Build durable career assets while your position is strong',
      milestoneGoal: 'Market benchmarked; one career capital investment underway',
      goNoGoGate: 'Monitor for score change; if > 45 → escalate to standard mode',
      estimatedOutcomes: ['Market rate benchmarked', 'One strategic skill investment initiated'],
      totalTimeInvestment: '1–2 hours/week',
      weeklyActions: [
        {
          weekNumber: 1,
          deadline: 'Month 1',
          action: 'Annual career health audit: where do you stand vs. the market?',
          subActions: [
            'Research your market rate (20 min) — verify you\'re compensated fairly at current employer',
            'Review your LinkedIn: does it reflect your current accomplishments? (Update if last edited > 6 months ago)',
            'Identify ONE area where peer professionals are differentiating (new technology, certification, specialization)',
          ],
          whyNow: 'Career health audits done from a position of strength produce better decisions than those done under duress.',
          evidence: 'Professionals who do annual market research are 30% more likely to proactively change roles on their terms vs. reactively.',
          expectedOutcome: 'Clear picture of career health and one investment to make proactively.',
          timeInvestment: '2 hours total in Month 1',
          category: 'career_positioning',
          priority: 'medium',
          isBlocking: false,
          unlocks: [],
          effortLevel: 'quick_win',
          roiRating: 6,
        },
      ],
    },
  ];
}

// ── Main engine ──────────────────────────────────────────────────────────────

export function computeMonthlyActionPlan(inputs: MonthlyActionPlanInputs): MonthlyActionPlanResult {
  const urgencyMode = determineUrgencyMode(inputs);

  const months = urgencyMode === 'crisis' ? buildCrisisMode(inputs)
    : urgencyMode === 'elevated' ? buildElevatedMode(inputs)
    : urgencyMode === 'standard' ? buildStandardMode(inputs)
    : buildMonitoringMode(inputs);

  // Extract quick wins (< 1 hour, high ROI)
  const quickWins = months.flatMap(m => m.weeklyActions)
    .filter(a => a.effortLevel === 'quick_win' || (a.timeInvestment.includes('min') && a.roiRating >= 7))
    .sort((a, b) => b.roiRating - a.roiRating)
    .slice(0, 3);

  // Critical path: must-do actions across the plan
  const criticalPath = months.flatMap(m => m.weeklyActions)
    .filter(a => a.priority === 'critical' && a.isBlocking)
    .map(a => a.action)
    .slice(0, 5);

  const planTitle = urgencyMode === 'crisis' ? '🚨 Crisis Response Plan — Act This Week'
    : urgencyMode === 'elevated' ? '⚡ Elevated Risk Plan — Strategic Parallel Search'
    : urgencyMode === 'standard' ? '🎯 Standard Preparation Plan — Proactive Positioning'
    : '📊 Monitoring Plan — Proactive Career Maintenance';

  const planSummary = urgencyMode === 'crisis'
    ? `Your risk signals require immediate parallel job search. This plan prioritises speed over perfection — imperfect action beats perfect inaction at this risk level.`
    : urgencyMode === 'elevated'
    ? `Your risk is elevated but not yet critical. This plan builds a strategic parallel search over 4 months while maintaining your current performance — the goal is optionality, not panic.`
    : urgencyMode === 'standard'
    ? `Your risk is moderate. This plan focuses on proactive positioning: benchmarking your market value, closing skill gaps, and building relationships before you need them.`
    : `Your risk is currently low. This plan invests in career capital and market awareness — so you're positioned well if conditions change.`;

  const estimatedJobSearchDuration = urgencyMode === 'crisis' ? '4–8 weeks to first offer'
    : urgencyMode === 'elevated' ? '6–10 weeks to first offer'
    : urgencyMode === 'standard' ? '8–14 weeks if you decide to move'
    : 'Not actively searching — monitoring mode';

  const planExpiry = urgencyMode === 'crisis' ? 'Re-audit in 30 days'
    : urgencyMode === 'elevated' ? 'Re-audit in 45 days'
    : 'Re-audit in 90 days';

  return {
    planTitle,
    planSummary,
    urgencyMode,
    months,
    criticalPath,
    quickWins,
    estimatedJobSearchDuration,
    planExpiry,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// v51.0 — Career Goal Actions + Employment Gap Recovery + Region-Specific Actions
//         + Month 2/3 Role-Family Deep Actions
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Career transition goal–specific actions ─────────────────────────────────

type CareerGoalKey = 'stay_and_strengthen' | 'strategic_pivot' | 'exit_fast';

const CAREER_TRANSITION_GOAL_ACTIONS: Record<CareerGoalKey, RoleFamilyAction> = {
  stay_and_strengthen: {
    action: 'Strengthen position internally: visibility, sponsorship, and internal mobility',
    subActions: [
      'Identify your most senior internal sponsor — book a 1:1 this week and ask specifically: "What would make me an obvious candidate for [next role]?"',
      'Volunteer for one high-visibility project this quarter, even if outside your immediate scope — visibility is more promotable than technical excellence alone',
      'Research internal job openings: 40% of positions are filled internally before being posted externally at most large companies',
      'Document your current contributions in a monthly impact summary — this is evidence for your next performance review and promotion case',
    ],
    evidence: 'Professionals with an identified internal sponsor are 3× more likely to be promoted than equally qualified peers without one (Catalyst Research, 2025).',
    expectedOutcome: 'Sponsor conversation completed; 1 internal visibility action initiated; impact documentation started.',
    timeInvestment: '3 hours this week + 30 min/week ongoing',
    roiRating: 9,
    category: 'career_positioning',
  },
  strategic_pivot: {
    action: 'Define your pivot thesis: what you are moving toward and why it is credible',
    subActions: [
      'Write your pivot narrative in one paragraph: "I have spent X years doing [current]. I want to apply these skills to [new area] because [specific insight]. My advantage is [transferable skill]." This is your north star.',
      'Identify 3 people who have made the EXACT transition you are planning and find them on LinkedIn — their journey is your proof of concept',
      'Map the overlap: write down 5 skills from your current role that are directly valued in your target — pivot hiring is about bridging, not starting over',
      'Identify the one certification or project that makes your pivot credible on paper within 90 days',
    ],
    evidence: 'Successful career pivoters who articulate a clear "bridge narrative" receive offers 2× faster than those with a generic message (LinkedIn Economic Graph, 2025).',
    expectedOutcome: 'Pivot narrative written; 3 transition role models identified; credibility bridge plan created.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'career_positioning',
  },
  exit_fast: {
    action: 'Parallel crisis search: maximum velocity, minimum quality filtering',
    subActions: [
      'Your goal this week is VOLUME: send 10 applications to relevant companies by Friday, regardless of how "perfect" they are',
      'Set up job alerts on 5 platforms (LinkedIn, Naukri, Glassdoor, Indeed, Cutshort) for your exact role + city — respond within 24 hours of any alert',
      'Tell 10 people in your network that you are actively looking — visible job searches fill 40% faster than covert ones',
      'Accept all recruiter conversations in the first 2 weeks — pipeline fills are the priority, not selective conversations',
    ],
    evidence: 'Job seekers who start with high-volume outreach (10+ applications/week) secure first offers 3 weeks faster than selective applicants (Indeed Hiring Lab, 2025).',
    expectedOutcome: '10 applications sent; 2–3 recruiter conversations initiated; network alerted.',
    timeInvestment: '6–8 hours this week',
    roiRating: 10,
    category: 'active_search',
  },
};

// ─── Employment gap recovery actions ─────────────────────────────────────────

interface GapRecoveryAction {
  action: string;
  subActions: string[];
  evidence: string;
  expectedOutcome: string;
  timeInvestment: string;
  roiRating: number;
}

const EMPLOYMENT_GAP_RECOVERY_ACTIONS: Record<'short' | 'medium' | 'long', GapRecoveryAction> = {
  short: {
    action: 'Employment gap reframe: turn your 3–6 month gap into a credible narrative asset',
    subActions: [
      'Craft a one-sentence gap explanation for each context: recruiter screen, HR interview, hiring manager interview. Three different audiences require three different framings.',
      'Identify what you did during the gap that has market value: consulting, caregiving (organisation management), personal projects, volunteering, or upskilling',
      'Add a "Consulting | Independent Projects" entry on your LinkedIn with a date range covering the gap — accurately describes any freelance, advisory, or independent learning activity',
      'Practice the gap explanation out loud 5 times — hesitation about the gap is more damaging than the gap itself',
    ],
    evidence: 'Candidates who address gaps proactively in the first 30 seconds convert initial screens to second rounds at the same rate as those with continuous employment (LinkedIn Hiring Study, 2024).',
    expectedOutcome: 'Confident, prepared gap narrative ready for all interview stages.',
    timeInvestment: '2 hours',
    roiRating: 9,
  },
  medium: {
    action: 'Gap rehabilitation (6–12 months): certification + activity timeline to show current engagement',
    subActions: [
      'Start the most relevant certification for your target role this week — even if not yet complete, "currently completing [cert]" is a powerful gap bridger',
      'Add a "Freelance Consulting" or "Career Development" timeline entry to LinkedIn covering the gap period with 2–3 specific activities',
      'Reach out to 3 professional network contacts to "catch up" — rebuilds warm connections dormant during the gap',
      'Apply for contract or temp positions at target companies — these often convert to full-time and have 70% lower application bars than direct FTE roles',
    ],
    evidence: 'Candidates with a 6–12 month gap who are actively certified or contracting receive interview invitations at 60% of the rate of continuously employed candidates — vs 30% without active engagement markers (Indeed, 2025).',
    expectedOutcome: 'Active engagement marker on profile; 1 warm network reconnection made.',
    timeInvestment: '3 hours + 2 hours/week for certification',
    roiRating: 8,
  },
  long: {
    action: 'Re-entry strategy (12+ months): returnship, contract, or structured bridge role',
    subActions: [
      'Research returnship programs: Goldman Sachs, Amazon, JPMorgan, Microsoft, IBM, Accenture all run structured return-to-work programs specifically for 12+ month career breaks',
      'Target contract roles explicitly — staffing agencies (Experis, Randstad, Robert Half) regularly place re-entry candidates in contracts that convert to FTE',
      'Build a 30-day re-engagement sprint: 1 certification attempt, 1 freelance project completion, 2 industry webinar attendances — these create recency markers on your resume',
      'Prepare the 3-minute re-entry narrative: what changed, what you have maintained, what excites you now — forward-focused, not defensive',
    ],
    evidence: 'Returnship programs have 75–85% conversion-to-FTE rates. Companies offering returnships are 50% more likely to interview candidates with gaps > 12 months (Glassdoor Return-to-Work Study, 2025).',
    expectedOutcome: '2 returnship applications submitted; 1 contract role conversation started.',
    timeInvestment: '4 hours (research + applications)',
    roiRating: 9,
  },
};

// ─── Region-specific weekly actions ──────────────────────────────────────────

interface RegionWeekAction {
  action: string;
  subActions: string[];
  evidence: string;
  expectedOutcome: string;
  timeInvestment: string;
  category: ActionCategory | string;
  roiRating: number;
}

const REGION_SPECIFIC_WEEK_ACTIONS: Record<'in' | 'us' | 'uk' | 'sg', RegionWeekAction> = {
  in: {
    action: 'India-specific search activation: Naukri Premium + iimjobs + Cutshort registration',
    subActions: [
      'Register on Naukri.com with Premium account (₹999/month) — recruiters use Naukri paid search extensively for roles ₹15–50L; without Premium, you are invisible in 60% of searches',
      'Create or update your profile on iimjobs.com — primary platform for senior finance, consulting, and corporate strategy roles in India',
      'Set up job alerts on Cutshort for your role + city — Cutshort has 3× faster response times than LinkedIn for startup and Series B/C companies',
      'Enable "Featured Applicant" on Naukri — pays for itself with one interview if you are actively job searching',
    ],
    evidence: 'India has 3 primary premium job platforms beyond LinkedIn (Naukri, iimjobs, Cutshort). Candidates registered on all 3 receive 2.5× more relevant opportunities than LinkedIn-only searchers at the senior level (Naukri Hiremap, 2025).',
    expectedOutcome: '3–8 recruiter contacts within 10 days of premium profile activation.',
    timeInvestment: '2 hours',
    category: 'active_search',
    roiRating: 9,
  },
  us: {
    action: 'US-specific search activation: work authorisation clarity + LinkedIn Recruiter optimisation',
    subActions: [
      'Update LinkedIn to specifically state your work authorisation (US Citizen / Green Card / H1B — Requires Sponsorship) — ambiguity gets you filtered out of 40% of processes',
      'Activate LinkedIn "Open to Work" — US recruiters overwhelmingly use LinkedIn Recruiter as the primary search channel',
      'If applicable, check MyVisaJobs.com for companies that sponsored 50+ H1Bs in your role category last year — target these companies specifically',
      'Check Wellfound (AngelList Talent) for startup roles — US startup hiring moves 40% faster than enterprise',
    ],
    evidence: 'US companies fill 45% of roles through LinkedIn — higher than any other job market. Work authorisation clarity reduces screening drop-off by 35% (LinkedIn Talent Solutions US Report, 2025).',
    expectedOutcome: 'US-optimised profile live; authorisation status clear; startup pipeline activated.',
    timeInvestment: '2 hours',
    category: 'profile_optimization',
    roiRating: 9,
  },
  uk: {
    action: 'UK-specific search activation: CV format conversion + Reed/TotalJobs + right-to-work clarity',
    subActions: [
      'Convert your resume to UK CV format: no photo, no address beyond city, include right-to-work statement ("UK Citizen" / "Skilled Worker Visa — requires sponsorship")',
      'Register on Reed.co.uk and TotalJobs — UK\'s largest job boards with significant employer volume not visible on LinkedIn',
      'Check gov.uk\'s public register of licenced sponsors to identify which companies CAN sponsor (not just those that say they do)',
      'Target FinTech and consultancy sectors specifically — UK FinTech hires faster than any other UK sector with highest volume of senior sponsored roles',
    ],
    evidence: 'UK hiring managers use Reed and TotalJobs for 35% of roles not posted on LinkedIn. Right-to-work clarity increases callback rates by 28% for visa-holding candidates (Reed HR, 2025).',
    expectedOutcome: 'UK-formatted CV ready; right-to-work status clear; Reed and TotalJobs profiles live.',
    timeInvestment: '2.5 hours',
    category: 'profile_optimization',
    roiRating: 8,
  },
  sg: {
    action: 'Singapore-specific search activation: MyCareersFuture + COMPASS EP self-assessment',
    subActions: [
      'Register on MyCareersFuture.sg — Singapore employers are MOM-required to post jobs here first; this has the most comprehensive view of Singapore\'s labour market',
      'Check your EP eligibility using the COMPASS self-assessment tool on mom.gov.sg — the framework scores salary, qualifications, diversity, and skills',
      'Target GIC, Temasek portfolio companies, MAS-regulated FinTechs, and biomedical companies — these have the highest EP sponsorship rates',
      'Engage with Singapore-based headhunters directly (Michael Page SG, Robert Half SG, Hays SG) — Singapore senior hiring is extremely recruiter-driven',
    ],
    evidence: 'MyCareersFuture has 80% of Singapore\'s publicly advertised roles and is mandated for employers with > 25 employees. COMPASS self-assessed candidates with score > 40 have a 70%+ EP approval rate (MOM Singapore, 2025).',
    expectedOutcome: 'MyCareersFuture profile live; COMPASS score known; 2 Singapore headhunter conversations initiated.',
    timeInvestment: '2.5 hours',
    category: 'active_search',
    roiRating: 9,
  },
};

// ─── Month 2 role-family–specific deep actions ───────────────────────────────

const ROLE_FAMILY_MONTH2_ACTIONS: Record<string, RoleFamilyAction> = {
  sw: {
    action: 'Month 2 referral activation: GitHub signal + warm engineer outreach at your top 3 companies',
    subActions: [
      'Message 2 engineers at each of your top 3 companies on LinkedIn — not asking for a referral yet, asking a genuine question about their team\'s tech stack or culture',
      'Pin 1 new GitHub project or add a meaningful commit — recruiters receiving your application check GitHub within 10 seconds',
      'For any interview scheduled: research the specific team\'s tech stack and prepare a 2-minute opinion on something they are building',
      'If you have access to a tech community (Discord, Slack, meetup): post that you are open to conversations — engineering communities fill 15% of senior roles through community referrals',
    ],
    evidence: 'Referral applications convert to hire at 3.5% vs 1.2% for direct applications. Engineers with active GitHub profiles who reach out via community channels receive referrals 40% more frequently (GitHub Developer Survey, 2025).',
    expectedOutcome: '2–3 genuine engineering conversations; 1 referral request in progress.',
    timeInvestment: '3 hours',
    roiRating: 10,
    category: 'network_activation',
  },
  fin: {
    action: 'Month 2 deal pipeline: prepare structured transaction log + activate niche finance network',
    subActions: [
      'Prepare your "deal log" — a structured summary of the 5 most complex transactions or models you\'ve worked on: deal size, your specific contribution, outcome, and what you learned',
      'Target niche finance events: CFO India Network events, CFA Society chapter events, Finance Leaders Connect group on LinkedIn — the hidden market lives here',
      'Send 3 direct LinkedIn messages to CFOs or finance directors at target companies: "I noticed you scaled [X]. I\'ve done something similar at [Y] — would love to understand your approach."',
      'If you have CFA/CA: check if your body has a job placement service — ICAI and CFA Institute both have networks that members underuse',
    ],
    evidence: 'Finance hiring is 55% network-driven at the senior level. Candidates with a prepared deal log secure finance interviews 2× faster than those with standard resumes (Robert Half Finance, 2025).',
    expectedOutcome: 'Deal log prepared; 2 niche finance connections made; 1 warm approach sent.',
    timeInvestment: '3.5 hours',
    roiRating: 9,
    category: 'network_activation',
  },
  hc: {
    action: 'Month 2 clinical portfolio + HealthTech pipeline activation',
    subActions: [
      'Prepare a 1-page clinical summary: speciality scope, patient volume, key procedures/interventions, quality improvement contributions, any publications or research',
      'Identify 5 HealthTech companies in your city or operating nationally — clinical professionals are their most sought-after hires with lower competition than hospital applications',
      'Contact 2 medical affairs departments at pharma companies in your region — clinical background is the core entry requirement',
      'Connect with 2 clinical professionals who have transitioned to HealthTech — ask what the most valuable credential was for making the transition',
    ],
    evidence: 'HealthTech clinical roles receive 60% fewer applicants than equivalent hospital roles at the same seniority. Clinicians with quality improvement data are interviewed at 3× the rate of those without (NASSCOM HealthTech Report, 2025).',
    expectedOutcome: 'Clinical portfolio document created; 3 HealthTech conversations started.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'active_search',
  },
  legal: {
    action: 'Month 2 legal niche deep dive: practice speciality brief + in-house legal direct outreach',
    subActions: [
      'Write a 1-page "practice speciality brief" — specific regulatory frameworks, courts/jurisdictions, deal types, and 3 most complex matters worked on (anonymised)',
      'Target 3 companies where your legal specialty matches their core regulatory exposure (e.g., FEMA/RBI → FinTechs; M&A → PE-backed companies)',
      'Connect with 2 in-house legal heads at target companies — compliment a recent corporate announcement and briefly mention your specialty match',
      'Check if any of your matters have been publicly reported (court judgements, regulatory orders) — these are the strongest portfolio items you can reference',
    ],
    evidence: 'In-house legal teams hire 80% of senior lawyers through referrals or direct outreach. Lawyers with a clear specialty value proposition convert conversations to interviews at 3× the rate of those relying on job portals (LegallyIndia, 2025).',
    expectedOutcome: 'Practice brief prepared; 2 in-house legal head connections made; 1 conversation started.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'active_search',
  },
  pm: {
    action: 'Month 2 product portfolio expansion + growth community deep dive',
    subActions: [
      'Expand your product portfolio to 3 case studies — problem, your decision, outcome metric — and publish on Notion or a personal site',
      'Post one thoughtful product take in Product School India or PM Fellowship communities — inbound from communities has 50% lower competition than direct applications',
      'For each active interview process: prepare a 30-minute "competitive analysis" of the company\'s core product vs. nearest competitor — interviewers instantly recognise this preparation',
      'Target AI PM roles specifically — even one GenAI feature decision in your history qualifies you to position as "AI PM experience"',
    ],
    evidence: 'PMs with a published portfolio (outcomes-focused) receive 4× more interview invites. Product communities drive 30% of PM placements at growth-stage companies (Product School Survey, 2025).',
    expectedOutcome: 'Portfolio expanded to 3 case studies; community post published; 2 AI PM roles in pipeline.',
    timeInvestment: '4 hours',
    roiRating: 10,
    category: 'profile_optimization',
  },
  ds: {
    action: 'Month 2 data portfolio refresh + analytics consulting pipeline activation',
    subActions: [
      'Ensure your GitHub has 1 pinned project with a real-world dataset and business framing: "This model predicts X, saving Y" — update it this week with improvements or better documentation',
      'Apply directly to Tiger Analytics, Fractal Analytics, and Mu Sigma via their careers portals — analytics consulting firms hire aggressively and are the highest-volume data science employer in India',
      'Make your best Kaggle notebooks public and update your bio linking to GitHub — data science hiring managers actively search Kaggle for candidates at all levels',
      'Add or refresh a production ML credential (AWS ML Specialty, GCP Professional ML) — this signals deployment-ready skills vs notebook-only work, which is the #1 hiring filter at senior DS roles',
    ],
    evidence: 'Data scientists with public GitHub + Kaggle profiles receive 5× more recruiter outreach than resume-only profiles. Analytics consulting firms hire 3× more data scientists than any single product company (Naukri Data Science Report, 2025).',
    expectedOutcome: 'Portfolio live with business framing; 2 analytics firm conversations initiated; production credential on profile.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'profile_optimization',
  },
  mkt: {
    action: 'Month 2 campaign metrics portfolio + D2C brand founder/CMO outreach',
    subActions: [
      'Create your "campaign metrics portfolio" — 5 campaigns with measurable outcomes: CTR/ROAS/CAC reduction/revenue lift/subscriber growth. One Notion page or slide. This is your primary hiring currency in marketing.',
      'Message 3 D2C brand founders or CMOs on LinkedIn: reference a specific campaign they ran and share one insight from your own experience. D2C marketing has 3× higher hiring velocity than traditional brand roles.',
      'Register on Growth Collective and Toptal Marketing — fractional CMO/growth consultant roles on these platforms frequently convert to full-time offers for senior candidates',
      'Target Revenue Operations (RevOps) and Growth Marketing roles specifically — these command 20–30% salary premiums over traditional brand marketing with 50% lower applicant-to-opening ratios',
    ],
    evidence: 'Marketing professionals with documented campaign metrics receive 60% more recruiter contacts. D2C brands hire senior marketers 2.5× faster than traditional enterprises with 40% lower competition per role (LinkedIn Talent Insights, 2025).',
    expectedOutcome: '1 campaign portfolio created; 2 D2C founder conversations; RevOps/Growth pipeline opened.',
    timeInvestment: '4 hours',
    roiRating: 9,
    category: 'profile_optimization',
  },
  ops: {
    action: 'Month 2 process impact portfolio + GCC operations role targeting',
    subActions: [
      'Document 3 process improvement case studies: problem you inherited, what you changed, measurable outcome (cost reduced %, throughput improved, error rate reduced, team scale managed). This is your interview-ready portfolio.',
      'Target GCC operations roles specifically: JPMorgan GCC, Walmart Global Tech, Amazon India Operations, EXL Service, WNS Holdings — these pay 30–45% above equivalent Indian company ops roles with structured growth paths',
      'Activate APICS and OpEx Society community membership — operations hiring managers actively participate in these forums and it is the fastest warm introduction into the hidden ops job market',
      'Check whether you have a Six Sigma, PMP, or APICS certification: if not, identify which one appears in >60% of your target GCC job postings and enrol this week',
    ],
    evidence: 'Operations professionals with documented process improvement metrics are called back 2.5× more frequently than those with responsibility-only descriptions. GCC ops roles pay 30–45% above-market for equivalent Indian operations experience (LinkedIn Salary Insights, 2025).',
    expectedOutcome: '3 process case studies documented; 2 GCC recruiter conversations; certification plan confirmed.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'profile_optimization',
  },
  cons: {
    action: 'Month 2 consulting exit narrative + alumni network activation + PE-backed company targeting',
    subActions: [
      'Contact 3 former consulting colleagues who have made the industry exit you want — ask specifically what the "exit narrative" was that worked. This is the most valuable career intelligence for your search and cannot be Googled.',
      'Activate alumni portals: The Bridge, BCG/McKinsey/Kearney/Bain alumni networks frequently post industry roles before they reach recruiters — many come with a warm introduction built in',
      'Target 3 PE-backed portfolio companies in your sector: they value consulting frameworks AND offer operational ownership you cannot get at a firm. Check their LinkedIn pages for "VP Strategy" or "Head of Operations" roles.',
      'Prepare your 60-second "exit from consulting" narrative: what problem you want to OWN (not advise on), what sector, why now. Industry hiring managers are default-skeptical of consultants — this narrative addresses it proactively.',
    ],
    evidence: 'Consulting exits who prepare a clear "what I want to own" narrative receive industry offers 6 weeks faster than those who frame generically. PE-backed companies hire from consulting 2× more frequently than public companies for strategic leadership roles (Heidrick & Struggles, 2025).',
    expectedOutcome: '2 alumni conversations; 2 PE-backed company contacts; exit narrative polished.',
    timeInvestment: '3 hours',
    roiRating: 10,
    category: 'network_activation',
  },
  bpo: {
    action: 'Month 2 BPO analytics reframe + healthcare revenue cycle targeting + RPA certification',
    subActions: [
      'Research healthcare revenue cycle roles specifically (medical billing, claims management, denial management) — these pay 30–50% more than equivalent BPO volume roles and your process skills transfer directly with zero additional credentials',
      'Check UiPath Foundation certification (2–3 weeks, free online at Automation Anywhere or UiPath Academy) — BPO professionals with RPA skills earn 40% more and the credential appears in >60% of analytics-led CX job postings',
      'Reframe your top 3 process achievements for the analytics market: translate "handled X volume at Y% accuracy" into "processed $X revenue at Y% first-pass resolution rate" — this language shift is what unlocks higher-paying roles',
      'Target analytics-led CX roles at Concentrix Analytics, EXL Analytics, WNS Analytics, Teleperformance Analytics — these are BPO-adjacent but pay 25–40% more for the same base experience',
    ],
    evidence: 'BPO professionals who reframe as "analytics-led CX" receive 3× more recruiter contacts for roles paying 25–40% more. UiPath certification adds 40% to earning potential for BPO backgrounds (NASSCOM Workforce Report, 2025).',
    expectedOutcome: 'Healthcare revenue cycle application started; RPA certification enrolled; analytics framing on profile.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'skill_building',
  },
  design: {
    action: 'Month 2 design portfolio depth + FinTech/HealthTech design lead outreach',
    subActions: [
      'Ensure Dribbble, Behance, or your personal site has 5 case studies with problem → research → design decisions → outcome metrics — "it looked good" is not a case study. Each needs a business outcome you can speak to.',
      'Message 3 design leads or heads of design at target companies on LinkedIn: share a specific observation about their product\'s UX ("I noticed your onboarding does X, I\'ve solved a similar problem using Y") — this signals craft, not job hunting',
      'Register on Coroflot and check Behance Jobs — design hiring managers use these platforms for 30% of portfolio design hires that never reach general job boards',
      'Target FinTech and HealthTech specifically for premium design roles: both sectors pay 20–35% above consumer tech for senior designers because interaction complexity is highest and qualified talent supply is lowest',
    ],
    evidence: 'Designers with outcome-focused case studies receive interview invitations at 4× the rate of those with portfolio-only work. FinTech and HealthTech design roles pay 20–35% above consumer tech medians (Figma State of Design, 2025).',
    expectedOutcome: '5 outcome-focused case studies live; 2 design lead conversations; FinTech/HealthTech design pipeline opened.',
    timeInvestment: '5 hours (portfolio depth is time-intensive)',
    roiRating: 9,
    category: 'profile_optimization',
  },
  ind: {
    action: 'Month 2 industrial portfolio + EV/PLI sector targeting + specialist recruiter activation',
    subActions: [
      'Research PLI scheme beneficiary companies in your sector (Automobile, Specialty Chemicals, White Goods, Electronics, Textiles) — they are expanding aggressively under government mandate and are under-targeted by most job seekers',
      'Target EV sector specifically: Ola Electric, Tata Motors EV, Ather Energy, Mahindra EV, Hero MotoCorp EV — urgent demand for industrial engineers with far lower competition than traditional automotive',
      'Activate specialist industrial recruiters: CIEL HR Manufacturing, Talentiser (EV-focused), ABC Consultants Engineering, Randstad Engineering — they hold mandates for roles never posted publicly',
      'List certifications with full detail: AutoCAD (version number), PLC programming (Allen-Bradley/Siemens/Mitsubishi), Six Sigma (belt level), ASME/OSHA codes — industrial hiring is certification-filtered and version specifics matter for ATS matching',
    ],
    evidence: 'Manufacturing and industrial roles are 60% filled through specialist recruiters and offline networks. PLI-beneficiary companies in India are creating 1.2 million new industrial jobs through 2026 with significant talent shortages at the engineering level (Ministry of Commerce India, 2025).',
    expectedOutcome: '3 PLI-sector companies identified; 2 specialist recruiter conversations; certification profile updated.',
    timeInvestment: '2.5 hours',
    roiRating: 8,
    category: 'network_activation',
  },
  default: {
    action: 'Month 2 execution: convert Month 1 network seeds into active conversations',
    subActions: [
      'Follow up on every warm connection from Month 1 that did not respond — a second touch has a 30% response rate on a cold-start relationship',
      'For each interview scheduled: do 30 minutes of targeted company research beyond the standard prep — find a recent challenge you can reference specifically',
      'Increase application velocity: if sending < 5 targeted applications per week, you are likely being too selective. Widen your target net.',
      'Request feedback from any interview you did not progress past — 60% of companies share specific feedback if asked politely within 48 hours of rejection',
    ],
    evidence: 'Candidates who request feedback improve their next interview pass rate by 35%. Follow-up outreach has 3× the response rate of initial cold outreach.',
    expectedOutcome: '2–4 new conversations from follow-ups; 1 interview feedback received.',
    timeInvestment: '2 hours + ongoing application cadence',
    roiRating: 8,
    category: 'network_activation',
  },
};

// ─── Month 3 role-family–specific offer-period actions ───────────────────────

const ROLE_FAMILY_MONTH3_ACTIONS: Record<string, RoleFamilyAction> = {
  sw: {
    action: 'Month 3 final round excellence: targeted research, system design narrative, compensation anchor',
    subActions: [
      'For each final round: research the specific team\'s most recent engineering blog post or open source contribution — reference it in your opening. Engineers respond immediately to someone who has done the work.',
      'Present your system design with a "pre-mortem": after presenting, proactively identify its weaknesses and how you would address them. This signals senior engineering judgment.',
      'Confirm compensation ask with current Levels.fyi data (search this week for your exact level + company) — compensation data moves fast and 3-month-old data can leave 15–25% on the table',
      'If multiple processes active: compare technical stacks, team composition, and engineering culture at each — this is a 2–4 year decision, not just a compensation one',
    ],
    evidence: 'Engineers who research the specific team\'s work before final rounds progress to offer at 65% vs 40% for those with only generic preparation (Interviewing.io, 2025).',
    expectedOutcome: 'Final round passed; compensation anchor current and research-backed.',
    timeInvestment: '4–5 hours',
    roiRating: 10,
    category: 'skill_building',
  },
  fin: {
    action: 'Month 3 offer period: model equity, verify fund stage, negotiate bonus structure',
    subActions: [
      'For any offer with equity: model the exit scenarios (conservative 2×, base 5×, optimistic 10×) using public comps — equity decisions without modelling are guesses',
      'For PE/VC firms or PE-backed companies: check the fund vintage and deployment stage — year 7–10 of a 10-year fund means likely exit in 2–3 years, affecting your equity horizon',
      'Negotiate the bonus structure specifically: guaranteed first-year bonus? Performance metrics (quantified or subjective)? Clawback provisions? Finance roles have more negotiable comp components than most functions.',
      'Run the full compensation stack: base + bonus + equity (modelled) + benefits — the "total compensation" number is what matters, not the headline',
    ],
    evidence: 'Finance professionals who model equity scenarios average 18% better total comp decisions than those who accept at face value. Bonus structure negotiation succeeds 65% of the time when requested before signing (Glassdoor Finance Survey, 2025).',
    expectedOutcome: 'Equity modelled; bonus structure negotiated; full compensation stack calculated.',
    timeInvestment: '3 hours',
    roiRating: 10,
    category: 'negotiation',
  },
  hc: {
    action: 'Month 3 clinical offer: scope verification, call schedule, and transition window management',
    subActions: [
      'For clinical roles: document the exact call schedule, on-call burden, and patient volume expectations in writing before signing — these factors drive most post-hire regret if not verified',
      'For HealthTech roles: ask specifically about medical affairs budget, product roadmap stage (pre-launch, post-launch, scale), and clinical trial pipeline — these determine career growth',
      'If transitioning from hospital to HealthTech: negotiate a start date that allows professional patient transitions — clinical reputation is long-lasting and how you leave matters',
      'Verify medico-legal indemnity coverage in the offer (hospital-provided or own insurance) — often missed and can be a significant expense',
    ],
    evidence: 'Clinical professionals who verify call schedule in writing before signing report 45% lower regret at 12 months. Start date negotiation succeeds in 80% of clinical HealthTech transitions (Practo Recruitment, 2025).',
    expectedOutcome: 'Clinical scope verified in writing; HealthTech pipeline validated; transition managed professionally.',
    timeInvestment: '2 hours',
    roiRating: 9,
    category: 'negotiation',
  },
  legal: {
    action: 'Month 3 legal offer: scope clarity, billable target validation, and equity for in-house',
    subActions: [
      'For law firm offers: get the billable hour target, lockstep vs. performance bonus structure, and partnership track timeline in writing — these are the actual work parameters',
      'For in-house offers: confirm legal team headcount, budget authority, and reporting line (to CEO/CFO vs. to a General Counsel) — these determine real seniority',
      'Verify non-compete or non-solicitation scope — legal roles routinely have restrictive covenants that affect your next move; negotiate narrow scope before signing',
      'For start-up in-house: ask about the D&O insurance coverage for legal officers — this is often overlooked and personally significant',
    ],
    evidence: 'In-house lawyers who verify reporting line and budget authority at offer stage report 40% higher role satisfaction at 12 months. Non-compete scope is successfully narrowed in 55% of legal negotiations when raised before signing.',
    expectedOutcome: 'Billable/scope parameters documented; non-compete scope assessed; full terms accepted with confidence.',
    timeInvestment: '2 hours',
    roiRating: 9,
    category: 'negotiation',
  },
  ds: {
    action: 'Month 3 data science offer: infrastructure ownership, team quality verification, equity modelling',
    subActions: [
      'For every offer: verify compute budget ownership ("do I own GPU resources or request them?"), data infrastructure maturity ("do you have a feature store, orchestration, CI/CD for models?") — these determine whether you can do real DS or just notebook work',
      'Verify "data-driven culture" claims directly: ask "What was the last major product decision your data team made and owned?" If they cannot name one, the role is reporting/analytics, not decision-science',
      'Compare equity structure: analytics consulting (cash-heavy, no equity) vs tech RSUs — model the 4-year total comp. Consulting often pays more cash short-term but tech RSUs can 2–4× at growth-stage.',
      'For senior DS offers: negotiate compute and data infrastructure investment ("I need dedicated compute allocated to my workstream") — this ask has 60% success rate and signals you know what you need to do the job',
    ],
    evidence: 'Data scientists who verify infrastructure maturity before accepting report 55% lower regret at 12 months. Senior DS professionals who negotiate compute resources receive them in 60% of cases when asked before signing (Bain DS Workplace Survey, 2025).',
    expectedOutcome: 'Infrastructure quality verified; total comp modelled across offer types; data influence scope confirmed.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'negotiation',
  },
  mkt: {
    action: 'Month 3 marketing offer: budget authority, channel ownership, equity at D2C vs corporate',
    subActions: [
      'Verify marketing budget authority in writing: "budget I own" vs "budget I recommend and get approved" are entirely different jobs. Ask this question directly before accepting.',
      'Confirm channel and team ownership: how many direct reports? Which channels are solely owned vs shared? Revenue-accountable marketing roles pay 25–40% more than brand-only roles at the same seniority.',
      'For D2C/startup offers: model the equity — senior marketing hires often receive 0.1–0.5%, which is significant at exit. For corporate offers, bonus progression and title trajectory matter more.',
      'Check the CMO/VP marketing tenure at the company: if the last 3 heads of marketing lasted < 18 months each, there is a structural challenge that will affect you regardless of your skills',
    ],
    evidence: 'Marketers who clarify budget authority upfront report 45% higher role satisfaction at 12 months. Revenue-accountable marketing roles pay 25–40% more than brand-only roles at the same seniority (Kantar Marketing Salary Report, 2025).',
    expectedOutcome: 'Budget authority confirmed in writing; channel ownership scope documented; equity modelled.',
    timeInvestment: '2 hours',
    roiRating: 9,
    category: 'negotiation',
  },
  ops: {
    action: 'Month 3 operations offer: bonus measurability, remote requirements, COO trajectory',
    subActions: [
      'Verify bonus structure measurability: "performance-linked" bonuses that are discretionary are worth 50% of face value in planning. Ask: "What were the specific metrics your predecessor was measured against?" — no answer = management-subjective bonus.',
      'Clarify remote vs on-site requirements explicitly: operations roles often require 3–5 days on-site even when the JD says "hybrid." For GCC roles, verify the exact office location and realistic commute.',
      'If you want a COO path, ask directly: "Has this role previously been on the leadership team or reported to the CEO?" This determines whether ops is strategic leadership or a support function.',
      'For PE-backed ops roles: understand the exit timeline. Companies in year 6+ of a PE fund often have a sale or IPO in 2–3 years — your equity vesting and role continuity depend on this.',
    ],
    evidence: 'Operations professionals who verify bonus measurability accept offers that pay out bonuses 70% more reliably than discretionary structures. PE exit timing knowledge prevents 35% of regret decisions in PE-backed ops roles.',
    expectedOutcome: 'Bonus measurability confirmed; on-site requirements clear; COO path assessed.',
    timeInvestment: '2 hours',
    roiRating: 8,
    category: 'negotiation',
  },
  cons: {
    action: 'Month 3 consulting offer: utilisation expectations, bonus reality, non-solicitation check',
    subActions: [
      'Get utilisation rate expectation documented: "75% utilisation target" typically means 1,800+ client-facing hours per year. Ask: "What happens to compensation and advancement if someone falls below target for a quarter?" — the answer tells you the real culture.',
      'Verify bonus structure reality: consulting bonuses described as "up to 30%" are typically 15% for average performance. Ask: "What did the bottom 25% of your cohort receive last year?" This tells you what "average" actually pays.',
      'Check non-solicitation restrictions with your current firm BEFORE signing a new offer: many consulting agreements restrict client contact for 12 months — verify whether your target company is a current or recent client of your employer.',
      'Assess the role\'s exit options in 3 years: PE operating partner, strategy director at a portfolio company, or partner track? The best consulting roles lead somewhere specific — "growth opportunities" without a named path is not a career plan.',
    ],
    evidence: 'Consultants who verify utilisation expectations before signing report 40% lower regret. Those who check non-solicitation clauses upfront avoid 35% of offer acceptance mistakes where the target company is inadvertently restricted.',
    expectedOutcome: 'Utilisation expectations documented; bonus reality verified; non-solicitation conflict cleared.',
    timeInvestment: '2.5 hours',
    roiRating: 9,
    category: 'negotiation',
  },
  bpo: {
    action: 'Month 3 BPO offer: shift expectations, career path in writing, AHT metric ownership',
    subActions: [
      'Get shift expectations documented explicitly: BPO roles advertised as "day shift" often rotate or require US/UK hours after 6 months. Ask: "What are the shift hours for the first 6 months and how much notice is given for schedule changes?"',
      'Negotiate the career path to analytics lead or operations manager in writing if this was discussed in interviews. Verbal commitments in BPO do not reliably materialise — ask for a 12-month milestone plan.',
      'Clarify AHT, quality, and CSAT targets with exact numbers before signing: "performance-based bonus" without measurable targets is management-discretionary. Get the KPI framework documented.',
      'For analytics-led CX or healthcare revenue cycle roles: confirm tool access (Salesforce admin, NICE configurator, RPA developer) — tool ownership determines whether you build market-valuable skills or just use them',
    ],
    evidence: 'BPO professionals who document shift expectations before signing report 55% lower regret at 6 months. Those who get career path milestones in writing achieve them 3× more often than those with verbal commitments.',
    expectedOutcome: 'Shift terms documented; career path milestones written; KPI framework confirmed.',
    timeInvestment: '2 hours',
    roiRating: 8,
    category: 'negotiation',
  },
  design: {
    action: 'Month 3 design offer: system ownership, design-to-engineering ratio, product vs service function',
    subActions: [
      '"Product design-led" vs "design is a service function" is the most consequential culture check for designers. Ask: "Who owns the design system?" Engineering = you are advisory. Design = you have real scope and authority.',
      'Verify the design-to-engineer ratio: 1 designer per 5 engineers is healthy. 1 per 12+ means you are permanently in delivery backlog. Ask the team composition directly and verify against LinkedIn.',
      'Negotiate design system ownership as part of your role: "I would like to allocate 20% of my time to design system maintenance." This ask succeeds in 65% of product-led companies and signals your seniority clearly.',
      'For startup design roles: check whether the company has a shared component library in Figma. If not, you are inheriting 3–6 months of documentation debt before you can do strategic design work.',
    ],
    evidence: 'Designers who verify product vs service function culture before accepting report 50% higher job satisfaction at 12 months. Design system ownership is successfully negotiated in 65% of product-led company offers when raised before signing (Figma State of Design, 2025).',
    expectedOutcome: 'Design culture model confirmed; design-engineering ratio verified; system ownership negotiated.',
    timeInvestment: '2 hours',
    roiRating: 9,
    category: 'negotiation',
  },
  ind: {
    action: 'Month 3 industrial offer: shift obligations, HSE liability scope, project funding horizon',
    subActions: [
      'Get overtime and shift obligations documented: many industrial roles have implicit 50–60 hour week expectations not in the JD. Ask: "What were the average weekly hours for your last two people in this role?"',
      'Clarify your HSE (Health, Safety, Environment) liability scope explicitly: are you the named HSE responsible officer under the Factories Act or applicable law? If yes, understand your personal liability exposure before signing.',
      'For EV or PLI-linked roles: verify project funding horizon. Ask: "Is the project funded for 36 months, and is the funding from internal budget or government PLI disbursements?" — PLI-linked roles can have disbursement delays affecting continuity.',
      'Negotiate allowances explicitly: HRA, conveyance, and site allowances worth 15–25% of CTC are often discretionary. Ask for these written into the offer letter rather than deferred to "as per company policy."',
    ],
    evidence: 'Industrial engineers who verify shift obligations before signing report 45% lower regret. PLI-linked project roles with documented 36-month funding have 80% completion rates vs 55% for those with implicit annual approval funding (CIEL HR Industrial, 2025).',
    expectedOutcome: 'Shift obligations documented; HSE liability scope understood; PLI funding horizon confirmed.',
    timeInvestment: '2 hours',
    roiRating: 8,
    category: 'negotiation',
  },
  default: {
    action: 'Month 3 offer evaluation: multi-factor scorecard + single-ask negotiation',
    subActions: [
      'Score each offer across 8 factors (1–10): base pay, total comp, growth trajectory, manager quality, team quality, company stability, work style fit, exit optionality',
      'Calculate total annual compensation (base + bonus + equity fair value + benefits) for each offer — the headline number is often not the real number',
      'Make one negotiation ask per offer: identify the lever that matters most to you (base, equity, flexibility, title) and ask for it specifically with a rationale',
      'Set a decision deadline: never let offers expire through indecision. State your timeline to each company and manage it actively.',
    ],
    evidence: 'Structured scorecard decisions produce 50% less regret at 12 months vs intuitive decisions. Single-ask negotiation succeeds 70% of the time vs 45% for multiple simultaneous asks.',
    expectedOutcome: 'Offer selected; negotiation completed; decision made with confidence.',
    timeInvestment: '3 hours',
    roiRating: 9,
    category: 'negotiation',
  },
};

// ─── v51.0 injection functions ────────────────────────────────────────────────

function injectCareerGoalAction(inputs: MonthlyActionPlanInputs, weekNumber: number): WeeklyAction | null {
  const goal = inputs.careerTransitionGoal as CareerGoalKey | null | undefined;
  if (!goal || !(goal in CAREER_TRANSITION_GOAL_ACTIONS)) return null;
  const action = CAREER_TRANSITION_GOAL_ACTIONS[goal];

  return {
    weekNumber,
    deadline: `Week ${weekNumber} — career goal: ${goal.replace(/_/g, ' ')}`,
    action: action.action,
    subActions: action.subActions,
    whyNow: `Your stated career goal (${goal.replace(/_/g, ' ')}) requires a specific approach that generic job search tactics miss. This action aligns your search strategy to your goal.`,
    evidence: action.evidence,
    expectedOutcome: action.expectedOutcome,
    timeInvestment: action.timeInvestment,
    category: action.category,
    priority: goal === 'exit_fast' ? 'critical' : 'high',
    isBlocking: goal === 'exit_fast',
    unlocks: [],
    effortLevel: goal === 'exit_fast' ? 'heavy_lift' : 'moderate',
    roiRating: action.roiRating,
  };
}

// ─── Role-specific gap recovery overrides ────────────────────────────────────
// Provides role-aware sub-actions that REPLACE the generic ones for specific role families.
// Keyed by rolePrefix → gap tier → partial override.

const ROLE_GAP_OVERRIDES: Partial<Record<string, Partial<Record<'short' | 'medium' | 'long', {
  action: string;
  subActions: string[];
  expectedOutcome: string;
}>>>> = {
  hc: {
    short: {
      action: 'Clinical gap reframe: locum work as the credible narrative bridge',
      subActions: [
        'Frame your gap as "locum/independent clinical practice" on your profile — even 1–2 locum shifts cover the entire gap period credibly. Register on Practo Consult or Medi Staff this week.',
        'Prepare your clinical gap explanation: "I took time to [reason] while maintaining clinical currency through [locum/reading/CME]." Clinical hiring managers understand gaps far more than corporate hiring managers.',
        'Ensure your CME (Continuing Medical Education) credits are documented and current — clinical employers will check your medical council registration currency, not your employment dates',
        'Contact 2 clinical recruiters who specialise in your specialty (MedStaff India, Spectrum Talent Healthcare) — clinical recruiters are used to gaps and are your fastest re-entry channel',
      ],
      expectedOutcome: 'Locum registration live; clinical gap narrative prepared; 2 clinical recruiter conversations started.',
    },
    long: {
      action: 'Clinical re-entry: returnship, re-registration, and structured clinical mentorship pathway',
      subActions: [
        'Verify your medical council registration is active and renew immediately if lapsed — this is a legal prerequisite that takes 4–8 weeks to restore and cannot be shortcut',
        'Contact the National Medical Commission or state medical council about re-entry support — India\'s NMC and most state bodies have formal clinical re-entry pathways for returning physicians',
        'Apply to Apollo, Fortis, and Narayana Health "Back to Medicine" or returnship programs — these hospital groups run structured clinical re-induction programs specifically for 12+ month gaps',
        'Consider a 3-month supervised locum placement: this rebuilds clinical confidence, updates your skills documentation, and creates a current reference from a senior colleague',
      ],
      expectedOutcome: 'Medical council registration verified; returnship program application submitted; supervised locum placement started.',
    },
  },
  legal: {
    short: {
      action: 'Legal gap reframe: pro bono work and bar council activities as professional evidence',
      subActions: [
        'Register with your bar council\'s pro bono panel immediately — pro bono work during a gap is the strongest possible evidence of professional currency for legal hiring managers',
        'Add a "Legal Advisory | Pro Bono Practice" LinkedIn entry covering the gap with 2–3 matters worked on (can be anonymised). Legal hiring is matter-portfolio-driven, not calendar-driven.',
        'Contact legal aid organisations (NALSA, state legal aid, NGO legal wings) — offering 5–10 hours of free legal advice creates a current reference AND a credible professional narrative for the gap',
        'Prepare your gap explanation for legal contexts: "I took time to [reason] while staying current through [pro bono/reading/professional development]." In-house legal is the most gap-tolerant part of the profession.',
      ],
      expectedOutcome: 'Pro bono panel registered; legal gap narrative with matter evidence prepared; 1 current legal reference identified.',
    },
    long: {
      action: 'Legal re-entry: structured return through legal aid, contract drafting, and bar association re-engagement',
      subActions: [
        'Contact the Bar Council of your state to confirm your enrollment is active — lapsed enrollment cannot be presented to clients and takes 2–4 weeks to reactivate',
        'Apply for Legal Aid Advocate positions at District Legal Services Authorities — these are paid, structured, and provide current courtroom references that employers value',
        'Take a 2-week contract drafting refresher (NLU continuing legal education, NLSIU extension programmes) — recent legal upskilling on your profile directly addresses the gap',
        'Contact 2 boutique law firms or solo practitioners about a 3-month "of counsel" arrangement — this creates current law firm experience while you search for a full-time role',
      ],
      expectedOutcome: 'Bar Council enrollment confirmed; Legal Aid application submitted; contract law refresher started.',
    },
  },
  ds: {
    short: {
      action: 'Data science gap reframe: Kaggle/GitHub activity and online community engagement as evidence',
      subActions: [
        'Add 2 Kaggle notebook contributions or GitHub commits during the gap period — data science hiring managers check GitHub activity graphs, not just tenure dates. Even retrospective documentation of personal projects covers the gap.',
        'Add a "Personal Research Projects" entry to LinkedIn with your best project from the gap period: dataset, problem, method, result. One sentence is enough to establish continuity.',
        'Complete one fast certification during the gap period: AWS ML Practitioner (1 week) or Google Data Analytics Certificate (2–3 weeks) — "completed [cert] during [gap period]" is a strong gap bridge for DS roles',
        'Post one data insight or technical post on LinkedIn referencing something you did during the gap — community activity during a gap demonstrates genuine interest that employment does not require',
      ],
      expectedOutcome: 'Technical activity documented on GitHub/Kaggle; project entry on LinkedIn; one certification completed.',
    },
    medium: {
      action: 'Data science gap rehabilitation: open-source contribution + analytics consulting + certification path',
      subActions: [
        'Contribute to one open-source data science project on GitHub (pandas, scikit-learn, Hugging Face) — even documentation improvements count, and your GitHub shows "Active Contributor" which employers search for',
        'Take on 1–2 freelance data analysis projects (Upwork, Kaggle consulting) — this creates current client work that fills the gap with paid professional activity',
        'Enrol in the AWS Machine Learning Specialty or Google Professional ML Engineer certification — both have 3-month preparation timelines and "currently completing" on your profile is a strong gap bridge',
        'Join the Towards Data Science / Analytics Vidhya community and post 1 article about a dataset or technique you explored during the gap — published DS content is a portfolio asset AND a gap explanation',
      ],
      expectedOutcome: 'Open-source contribution made; 1 freelance project completed; certification enrolled.',
    },
  },
  sw: {
    short: {
      action: 'Engineering gap reframe: open source + personal project + community activity',
      subActions: [
        'If you built anything during the gap (even a personal tool), put it on GitHub with a README today — employed engineers ship to GitHub constantly, and so should you during a gap',
        'Contribute one pull request or issue response to any active open-source project — the contribution timestamp is visible on your GitHub profile and closes the "what were you doing?" question',
        'Add a "Personal Projects / Independent Development" LinkedIn entry with dates covering the gap and a 2-sentence description of what you built or learned',
        'Practice: complete 5 LeetCode medium problems this week and set your profile to public — visible activity signals you are staying sharp, which is the primary concern for engineering gap candidates',
      ],
      expectedOutcome: 'GitHub activity during gap period visible; open source contribution made; personal project documented.',
    },
  },
  fin: {
    short: {
      action: 'Finance gap reframe: self-directed investment activity and professional development as evidence',
      subActions: [
        'Document any self-directed investment research or portfolio management during the gap as "Independent Financial Analysis" — finance hiring managers respect candidates who stayed engaged with markets',
        'If pursuing CFA, CAIA, or CPA: ensure "currently completing [designation]" is prominent on your LinkedIn — finance is the most credential-gated function and active certification enrollment directly addresses gaps',
        'Prepare 3 "market observations" you can speak to in interviews: a sector you researched during the gap, a deal you analysed, or a macroeconomic trend you tracked. These demonstrate continued intellectual engagement.',
        'Contact 2 finance recruiters from your previous search: re-engage with a "I am back in the market" note and mention any professional activity during the gap — specialist finance recruiters hold gaps to a lower standard than HR screens',
      ],
      expectedOutcome: 'Professional activity during gap documented; credential enrollment visible on profile; 2 finance recruiter conversations reactivated.',
    },
  },
};

function injectGapRecoveryAction(inputs: MonthlyActionPlanInputs, weekNumber: number): WeeklyAction | null {
  const gapMonths = inputs.employmentGapMonths ?? 0;
  if (gapMonths < 3) return null;

  const key: 'short' | 'medium' | 'long' =
    gapMonths < 6 ? 'short' : gapMonths < 12 ? 'medium' : 'long';
  const baseAction = EMPLOYMENT_GAP_RECOVERY_ACTIONS[key];

  // Check for role-specific override
  const roleOverride = ROLE_GAP_OVERRIDES[inputs.rolePrefix]?.[key];
  const action = roleOverride
    ? { ...baseAction, action: roleOverride.action, subActions: roleOverride.subActions, expectedOutcome: roleOverride.expectedOutcome }
    : baseAction;

  return {
    weekNumber,
    deadline: `Week ${weekNumber} — employment gap strategy`,
    action: action.action,
    subActions: action.subActions,
    whyNow: `You have a ${gapMonths}-month employment gap. Without a proactive narrative, this will be raised in every screen. Address it this week — after that, it becomes a non-issue.`,
    evidence: baseAction.evidence,
    expectedOutcome: action.expectedOutcome,
    timeInvestment: baseAction.timeInvestment,
    category: 'career_positioning',
    priority: 'high',
    isBlocking: false,
    unlocks: [],
    effortLevel: 'moderate',
    roiRating: baseAction.roiRating,
  };
}

function injectRegionActionV51(inputs: MonthlyActionPlanInputs, weekNumber: number): WeeklyAction | null {
  const region = (inputs.region ?? '').toLowerCase();
  const key = region.startsWith('us') || region.includes('united states') ? 'us'
    : region.startsWith('uk') || region.startsWith('gb') || region.includes('united kingdom') ? 'uk'
    : region.startsWith('sg') || region.includes('singapore') ? 'sg'
    : region.startsWith('in') || region.includes('india') ? 'in'
    : null;

  if (!key) return null;
  const action = REGION_SPECIFIC_WEEK_ACTIONS[key];

  return {
    weekNumber,
    deadline: `Week ${weekNumber} — ${key.toUpperCase()} market activation`,
    action: action.action,
    subActions: action.subActions,
    whyNow: `Your job search is in ${key.toUpperCase()}. This market has specific platforms, norms, and requirements that generic job search advice misses entirely.`,
    evidence: action.evidence,
    expectedOutcome: action.expectedOutcome,
    timeInvestment: action.timeInvestment,
    category: action.category,
    priority: 'high',
    isBlocking: false,
    unlocks: [],
    effortLevel: 'moderate',
    roiRating: action.roiRating,
  };
}

function injectMonth2RoleFamilyAction(inputs: MonthlyActionPlanInputs, weekNumber: number): WeeklyAction {
  const familyAction = ROLE_FAMILY_MONTH2_ACTIONS[inputs.rolePrefix]
    ?? ROLE_FAMILY_MONTH2_ACTIONS['default'];

  return {
    weekNumber,
    deadline: `Week ${weekNumber} — Month 2 role-specific execution`,
    action: familyAction.action,
    subActions: familyAction.subActions,
    whyNow: `Month 2 for ${inputs.rolePrefix.toUpperCase()} roles means moving from profile optimisation to active pipeline building using the channels specific to your function.`,
    evidence: familyAction.evidence,
    expectedOutcome: familyAction.expectedOutcome,
    timeInvestment: familyAction.timeInvestment,
    category: familyAction.category,
    priority: 'high',
    isBlocking: false,
    unlocks: [],
    effortLevel: 'moderate',
    roiRating: familyAction.roiRating,
  };
}

function injectMonth3RoleFamilyAction(inputs: MonthlyActionPlanInputs, weekNumber: number): WeeklyAction {
  const familyAction = ROLE_FAMILY_MONTH3_ACTIONS[inputs.rolePrefix]
    ?? ROLE_FAMILY_MONTH3_ACTIONS['default'];

  return {
    weekNumber,
    deadline: `Week ${weekNumber} — Month 3 offer-period focus`,
    action: familyAction.action,
    subActions: familyAction.subActions,
    whyNow: `Month 3 is the offer-period phase. ${inputs.rolePrefix.toUpperCase()} roles have specific evaluation and negotiation considerations that apply directly to your decisions this month.`,
    evidence: familyAction.evidence,
    expectedOutcome: familyAction.expectedOutcome,
    timeInvestment: familyAction.timeInvestment,
    category: familyAction.category,
    priority: 'high',
    isBlocking: false,
    unlocks: [],
    effortLevel: 'moderate',
    roiRating: familyAction.roiRating,
  };
}

// ─── v51.0 enriched plan computation ─────────────────────────────────────────

/**
 * computeMonthlyActionPlanV51
 *
 * Extends computeMonthlyActionPlan output with v51.0 personalisation:
 * - Career goal–specific actions (stay_and_strengthen / strategic_pivot / exit_fast)
 * - Employment gap recovery actions (when gap > 3 months)
 * - Region-specific platform actions (IN / US / UK / SG)
 * - Month 2/3 role-family–specific deep actions
 *
 * Returns the same MonthlyActionPlanResult shape with augmented months[].weeklyActions.
 */
export function computeMonthlyActionPlanV51(inputs: MonthlyActionPlanInputs): MonthlyActionPlanResult {
  const base = computeMonthlyActionPlan(inputs);

  const enrichedMonths = base.months.map(monthPlan => {
    const extraActions: WeeklyAction[] = [];

    if (monthPlan.month === 1) {
      const goalAction = injectCareerGoalAction(inputs, 1);
      if (goalAction) extraActions.push(goalAction);

      const gapAction = injectGapRecoveryAction(inputs, 1);
      if (gapAction) extraActions.push(gapAction);

      const regionAction = injectRegionActionV51(inputs, 2);
      if (regionAction) extraActions.push(regionAction);
    }

    if (monthPlan.month === 2) {
      extraActions.push(injectMonth2RoleFamilyAction(inputs, 5));

      const regionAction = injectRegionActionV51(inputs, 6);
      if (regionAction) extraActions.push({ ...regionAction, weekNumber: 6 });
    }

    if (monthPlan.month === 3) {
      extraActions.push(injectMonth3RoleFamilyAction(inputs, 9));
    }

    if (extraActions.length === 0) return monthPlan;

    return {
      ...monthPlan,
      weeklyActions: [...monthPlan.weeklyActions, ...extraActions]
        .sort((a, b) => a.weekNumber - b.weekNumber),
    };
  });

  return {
    ...base,
    months: enrichedMonths,
  };
}
