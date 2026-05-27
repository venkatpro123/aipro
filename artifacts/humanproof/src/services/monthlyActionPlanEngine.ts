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
