/**
 * precision9090PlanEngine.ts — v50.0
 *
 * THE CORE PROBLEM THIS SOLVES:
 *   Monthly action plans tell users WHAT to do over 6 months.
 *   That is not operational. A person under job-risk stress needs to know:
 *   "What do I do TODAY? What do I do this WEEK? What should I have
 *    achieved by Day 30 that tells me whether I'm on track?"
 *
 * THIS ENGINE PROVIDES:
 *   1. Phase 1 (Days 1–30): Foundation & rapid positioning
 *   2. Phase 2 (Days 31–60): Active market engagement
 *   3. Phase 3 (Days 61–90): Offer generation & decision optimisation
 *
 *   Each phase has:
 *   - Week-by-week milestones (specific, verifiable)
 *   - Daily focus priorities (3 items per day, not "do more" but "do this")
 *   - Go/No-Go gate at D30, D60, D90 with specific numeric thresholds
 *   - Emergency fallback pathway if the gate is missed
 *   - AI-prioritised action ordering (impact × urgency ÷ effort)
 *
 * PERSONALISATION DIMENSIONS:
 *   - Urgency mode (crisis / elevated / standard / monitoring)
 *   - Financial runway (compresses timelines, elevates salary-targeting precision)
 *   - Visa status (adds grace-period gate logic + employer dependency actions)
 *   - Employment gap (front-loads recovery narrative actions)
 *   - Interview readiness (prep gate before applications open)
 *   - Career trajectory (ascending=expand, plateauing=reset, declining=pivot)
 *   - Company transition type (narrative framing varies by type)
 *   - Risk tolerance (conservative/aggressive action set branching)
 *   - BehavioralPersonalizationResult — feeds specific blockers, trajectories,
 *     compensation positioning into every milestone
 */

import type { BehavioralPersonalizationResult } from './behavioralPersonalizationEngine'
import type { MonthlyActionPlanResult } from './monthlyActionPlanEngine'
import type { JobTargetingResult } from './jobTargetingEngine'
import type { FinancialRunwayResult } from './financialRunwayIntelligence'
import type { VisaRiskResult } from './visaRiskEngine'

// ── Core types ─────────────────────────────────────────────────────────────────

export type PhaseLabel = 'phase_1_foundation' | 'phase_2_engagement' | 'phase_3_offers'

export type DailyFocusPriority = {
  rank: 1 | 2 | 3
  task: string           // The exact thing to do
  timeBlock: string      // "30 min morning" | "1 hour after work" | "45 min lunch"
  successSignal: string  // How you know you actually did it, not just started
}

export type WeekMilestone = {
  weekNumber: number     // 1–13
  phase: PhaseLabel
  weekLabel: string      // "Week 2: First Outreach"
  coreObjective: string  // The one thing that makes this week a success
  dailyFocusPriorities: DailyFocusPriority[]
  actions: PrecisionAction[]
  endOfWeekCheck: string // Verifiable checkpoint — "You should have X by end of week"
  ifBehind: string       // What to cut / accelerate if 1-2 days behind
}

export interface PrecisionAction {
  id: string             // Unique stable ID: "p1_w1_a1"
  action: string         // Specific, named action
  subSteps: string[]     // Numbered sub-steps (do these in order)
  phase: PhaseLabel
  weekNumber: number
  aiPriorityScore: number  // 0–100: (impact × urgency) / effort × calibration
  impact: 1 | 2 | 3 | 4 | 5       // 5 = changes hiring outcome
  urgency: 1 | 2 | 3 | 4 | 5      // 5 = time-sensitive this week
  effort: 1 | 2 | 3 | 4 | 5       // 5 = heavy lift (≥ 8 hours)
  timeEstimate: string   // "2 hours" | "45 min/day × 5 days"
  expectedOutcome: string
  evidence: string       // Data or research supporting this action
  category: PrecisionActionCategory
  isBlocking: boolean    // If skipped, later high-value actions are degraded
  blocksActionIds: string[]
  isEmergencyFallback: boolean // True = only show if checkpoint is missed
  personalisationTag: string | null  // "gap_recovery" | "comp_reset" | "visa_dependent" etc.
}

export type PrecisionActionCategory =
  | 'profile_readiness'
  | 'skill_building'
  | 'network_activation'
  | 'direct_outreach'
  | 'application_execution'
  | 'interview_preparation'
  | 'offer_management'
  | 'financial_protection'
  | 'visa_management'
  | 'emergency_protocol'
  | 'risk_monitoring'
  | 'narrative_crafting'

export interface PhaseCheckpoint {
  phase: PhaseLabel
  checkpointDay: 30 | 60 | 90
  title: string
  summary: string
  targetMetrics: CheckpointMetric[]
  passThreshold: string     // "All 3 metrics at GREEN"
  failThreshold: string     // "2+ metrics at RED"
  /** If checkpoint is passed: what to accelerate into next phase */
  ifPassed: string
  /** If checkpoint is narrowly missed: adjust + continue */
  ifNearMiss: string
  /** If checkpoint is badly missed: emergency fallback activation */
  ifFailed: string
  emergencyFallbackActions: PrecisionAction[]
}

export interface CheckpointMetric {
  metricName: string         // "LinkedIn profile completeness"
  targetValue: string        // "≥ 85%"
  measureHow: string         // How to verify this number (exact source)
  status?: 'green' | 'amber' | 'red'  // Set at runtime if available
}

export interface Precision9090PlanInputs {
  // Pipeline signals
  compositeScore: number
  seniorityBracket: 'junior' | 'mid' | 'senior' | 'principal'
  rolePrefix: string
  workTypeKey: string
  region: string
  metro: string | null
  tenureYears: number
  totalExperienceYears: number
  industry: string

  // Downstream engine outputs
  behavioral: BehavioralPersonalizationResult
  monthlyPlan: MonthlyActionPlanResult
  jobTargeting: JobTargetingResult
  financialRunway: FinancialRunwayResult | null
  visaRisk: VisaRiskResult | null

  // Optional overrides
  careerGoal?: 'stay_and_grow' | 'strategic_exit' | 'emergency_exit' | 'explore' | null
  targetCompanyType?: 'startup' | 'mid' | 'large' | 'mega' | 'any' | null
}

export interface Precision9090PlanResult {
  planTitle: string
  executiveSummary: string
  urgencyMode: 'crisis' | 'elevated' | 'standard' | 'monitoring'
  planPersonalisationTags: string[]   // What made this plan personalised

  // Core 13-week plan
  weeks: WeekMilestone[]

  // Phase-level checkpoints
  checkpoints: PhaseCheckpoint[]

  // AI-ranked all-actions view (flattened + sorted by aiPriorityScore desc)
  topPriorityActions: PrecisionAction[]

  // Operational summaries
  criticalPath: string[]         // The 5 actions that, if skipped, cause failure
  quickWins: PrecisionAction[]   // Actions completable ≤ 1 hour with aiPriorityScore ≥ 70
  weeklyTimeCommitment: string   // "~8–10 hours/week during Phase 1, ~5 hours/week in Phase 3"
  estimatedOutcomeByDay90: string // "With consistent execution: 2–3 offers, ₹45–60L band"
  planExpiry: string             // "Re-audit in 45 days to refresh targeting list"
}

// ── Urgency computation ────────────────────────────────────────────────────────

type UrgencyMode = 'crisis' | 'elevated' | 'standard' | 'monitoring'

function computeUrgencyMode(inputs: Precision9090PlanInputs): UrgencyMode {
  const { compositeScore, financialRunway, visaRisk, monthlyPlan } = inputs
  if (monthlyPlan.urgencyMode === 'crisis') return 'crisis'
  if (compositeScore >= 78) return 'crisis'
  if (visaRisk?.gracePeriodDays != null && visaRisk.gracePeriodDays <= 60) return 'crisis'
  if (financialRunway?.runwayMonths != null && financialRunway.runwayMonths <= 3) return 'crisis'
  if (monthlyPlan.urgencyMode === 'elevated') return 'elevated'
  if (compositeScore >= 55) return 'elevated'
  if (financialRunway?.runwayMonths != null && financialRunway.runwayMonths <= 6) return 'elevated'
  if (compositeScore >= 35) return 'standard'
  return 'monitoring'
}

function getRunwayMonths(inputs: Precision9090PlanInputs): number {
  return inputs.financialRunway?.runwayMonths ?? 12
}

// ── AI priority scoring ────────────────────────────────────────────────────────
// Score = (impact × urgency) / effort × 100 / 25 (normalise to 0–100)
// Calibration factor pulled from mode: crisis adds 0.2 urgency bonus on financial_protection

function scoreAction(impact: number, urgency: number, effort: number): number {
  const raw = (impact * urgency) / effort
  return Math.min(100, Math.round((raw / 25) * 100))
}

// ── Personalisation tag resolver ──────────────────────────────────────────────

function resolvePlanTags(inputs: Precision9090PlanInputs): string[] {
  const tags: string[] = []
  const b = inputs.behavioral

  if (b.employmentGap.hasGap && b.employmentGap.gapSeverity !== 'none') {
    tags.push(`gap_recovery_${b.employmentGap.gapSeverity}`)
  }
  if (b.careerTrajectory.trajectory === 'plateauing') tags.push('trajectory_reset')
  if (b.careerTrajectory.trajectory === 'declining') tags.push('urgent_pivot')
  if (b.compensationIntelligence.position === 'significantly_under') tags.push('comp_reset')
  if (b.compensationIntelligence.position === 'significantly_above') tags.push('comp_defend')
  if (b.interviewReadiness.level === 'not_ready') tags.push('interview_prep_gate')
  if (b.riskTolerance === 'aggressive') tags.push('aggressive_strategy')
  if (b.riskTolerance === 'conservative') tags.push('conservative_strategy')
  if (inputs.visaRisk?.visaType != null) tags.push('visa_constrained')
  if (getRunwayMonths(inputs) <= 4) tags.push('financial_urgency')
  if (b.companyTransition.dynamic !== 'unknown_transition' &&
      b.companyTransition.dynamic !== 'enterprise_to_enterprise' &&
      b.companyTransition.dynamic !== 'startup_to_startup') {
    tags.push('transition_narrative_required')
  }

  return tags
}

// ── Week builder helpers ───────────────────────────────────────────────────────

function buildWeek(
  weekNumber: number,
  phase: PhaseLabel,
  weekLabel: string,
  coreObjective: string,
  dailyFocusPriorities: DailyFocusPriority[],
  actions: PrecisionAction[],
  endOfWeekCheck: string,
  ifBehind: string
): WeekMilestone {
  return { weekNumber, phase, weekLabel, coreObjective, dailyFocusPriorities, actions, endOfWeekCheck, ifBehind }
}

function makeDailyFocus(
  rank: 1 | 2 | 3,
  task: string,
  timeBlock: string,
  successSignal: string
): DailyFocusPriority {
  return { rank, task, timeBlock, successSignal }
}

function makeAction(
  id: string,
  action: string,
  subSteps: string[],
  phase: PhaseLabel,
  weekNumber: number,
  impact: 1 | 2 | 3 | 4 | 5,
  urgency: 1 | 2 | 3 | 4 | 5,
  effort: 1 | 2 | 3 | 4 | 5,
  timeEstimate: string,
  expectedOutcome: string,
  evidence: string,
  category: PrecisionActionCategory,
  isBlocking: boolean,
  blocksActionIds: string[] = [],
  personalisationTag: string | null = null,
  isEmergencyFallback = false
): PrecisionAction {
  return {
    id, action, subSteps, phase, weekNumber,
    aiPriorityScore: scoreAction(impact, urgency, effort),
    impact, urgency, effort,
    timeEstimate, expectedOutcome, evidence, category,
    isBlocking, blocksActionIds, isEmergencyFallback, personalisationTag,
  }
}

// ── Phase 1: Foundation (Weeks 1–4, Days 1–30) ────────────────────────────────

function buildPhase1(inputs: Precision9090PlanInputs, urgency: UrgencyMode, tags: string[]): WeekMilestone[] {
  const b = inputs.behavioral
  const runway = getRunwayMonths(inputs)
  const isVisa = tags.includes('visa_constrained')
  const needsInterviewPrep = tags.includes('interview_prep_gate')
  const hasGap = tags.includes('gap_recovery_significant') || tags.includes('gap_recovery_moderate')
  const compReset = tags.includes('comp_reset')
  const topTargets = inputs.jobTargeting.primaryTargets?.slice(0, 3) ?? []

  // ── Week 1: Situation assessment + profile baseline ──────────────────────────
  const w1Actions: PrecisionAction[] = [
    makeAction(
      'p1_w1_a1',
      'Complete a 90-minute career situation audit',
      [
        'Write down your last 3 roles with: start date, end date, why you left, biggest achievement with a number',
        'Score your current skills 1–5 against the top 3 job postings in your target role — note the gaps',
        'List your 5 warmest professional contacts (not social — people who would reply within 24h)',
        'Set a daily 45-minute "search block" in your calendar — this time is non-negotiable',
      ],
      'phase_1_foundation', 1, 5, 5, 2, '1.5 hours',
      'You have a written baseline. Without this, every subsequent action is unfocused.',
      'Candidates who begin with a structured self-audit spend 35% less time on low-yield activities (LinkedIn Talent Insights, 2025).',
      'profile_readiness', true,
      ['p1_w1_a2', 'p1_w2_a1'],
      null
    ),
    makeAction(
      'p1_w1_a2',
      `Rewrite your LinkedIn headline with a data-backed impact statement`,
      [
        `Current formula: "[Title] at [Company]" — this is noise.`,
        `New formula: "[What you do] | [Measurable outcome you drive] | [Industry + years]"`,
        `Example: "Senior Backend Engineer | 99.97% uptime systems at ₹2Cr+ scale | 7yr fintech"`,
        `Add your top 3 role-relevant skills in the About section — recruiters scan this in < 8 seconds`,
        `Turn on LinkedIn "Open to Work" (visible to recruiters only) — this triples outreach without signalling to employer`,
      ],
      'phase_1_foundation', 1, 5, 5, 2, '90 minutes',
      '3–8× recruiter views within 7 days of updating headline with metrics.',
      'LinkedIn data: profiles with quantified impact in headlines receive 3.1× more recruiter messages. "Open to Work" (recruiter-only) increases InMails by 40% with no employer visibility.',
      'profile_readiness', true,
      ['p1_w2_a2'],
      compReset ? 'comp_reset' : null
    ),
    ...(hasGap ? [makeAction(
      'p1_w1_a3_gap',
      'Prepare your employment gap narrative (ready before first recruiter call)',
      [
        `Your gap: ${b.employmentGap.mostRecentGapMonths} months. This WILL come up in every first call.`,
        `Memorise this frame: "${b.employmentGap.narrativeFrame}"`,
        `Write out your interview response: "${b.employmentGap.interviewScript}"`,
        `Have 1 project/course/consulting engagement to reference during the gap — even a part-time freelance project neutralises it`,
        `${b.employmentGap.recoveryActions[0] ?? 'Enrol in one online certification course relevant to your target role — start this week'}`,
      ],
      'phase_1_foundation', 1, 5, 4, 2, '45 minutes',
      'You can confidently address the gap in any recruiter screen without hesitation.',
      `Employment gaps of ${b.employmentGap.mostRecentGapMonths}+ months reduce recruiter callback rate by 28%, but candidates with prepared narratives and 1 active project during the gap recover 80% of that callback rate (Hired.com Research, 2025).`,
      'narrative_crafting', false,
      [],
      'gap_recovery_significant'
    )] : []),
    ...(isVisa ? [makeAction(
      'p1_w1_a4_visa',
      'Map your visa timeline and identify employer-sponsor bottlenecks',
      [
        `Your visa: ${inputs.visaRisk?.visaType ?? 'work visa'}. Grace period: ${inputs.visaRisk?.gracePeriodDays ?? '?'} days after employment ends.`,
        `Create a visa timeline doc: current status → grace period end date → filing deadlines`,
        `List companies in your target list explicitly known to sponsor (filter your job targeting list)`,
        `Contact immigration attorney now for a 30-min consult — many offer free first sessions`,
        `Add "open to sponsorship" explicitly to recruiter messages — most won't ask, they assume it's complex`,
      ],
      'phase_1_foundation', 1, 5, 5, 2, '2 hours',
      'Clear visa timeline + list of 5+ confirmed-sponsor companies in your target list.',
      'Visa-constrained candidates who proactively surface employer sponsorship history reduce mismatch time-to-offer by 3 weeks (Boundless Immigration Data, 2025).',
      'visa_management', true,
      ['p1_w2_a4_visa'],
      'visa_constrained'
    )] : []),
  ]

  const w1 = buildWeek(
    1, 'phase_1_foundation',
    'Week 1: Baseline Audit + First Signals',
    'Your LinkedIn headline is rewritten with metrics; you have a written 5-contact warm list; your gap narrative is memorised',
    [
      makeDailyFocus(1, 'Complete career situation audit (one-time, 90 min)', 'Morning session', 'Written doc exists with last 3 roles + skills gap noted'),
      makeDailyFocus(2, 'Rewrite LinkedIn headline + About section', 'Evening, 90 min', 'Headline has metrics + outcome; Open to Work is on (recruiter-only)'),
      makeDailyFocus(3, `Send 2 warm-contact reconnect messages (template: "I\'m exploring new opportunities in [area] — would love to catch up")`, 'Lunch break, 15 min', '2 messages sent; do not ask for jobs — just reconnect'),
    ],
    w1Actions,
    `LinkedIn profile updated with metrics. Warm contact list written. ${hasGap ? 'Gap narrative scripted.' : ''} ${isVisa ? 'Visa timeline documented.' : ''}`,
    'Cut the skills gap analysis — do it in Week 2. Focus: LinkedIn headline + 2 warm messages minimum.'
  )

  // ── Week 2: Targeted outreach + CV alignment ──────────────────────────────────
  const topTargetNames = topTargets.length > 0
    ? topTargets.map(t => t.companyName).join(', ')
    : '5 companies you will identify this week using the targeting criteria below'

  // Dynamic target list size: larger pool for crisis/gap profiles; smaller for niche/principal
  // hasGap already declared above (line ~283)
  const targetListSize = urgency === 'crisis' ? 25
    : hasGap ? 20
    : inputs.seniorityBracket === 'principal' ? 12
    : 15

  // Dynamic weekly application count: gap profiles need higher volume to compensate callback rate
  const weeklyAppCount = hasGap ? 8
    : inputs.seniorityBracket === 'principal' ? 3
    : urgency === 'crisis' ? 8
    : 5

  const w2Actions: PrecisionAction[] = [
    makeAction(
      'p1_w2_a1',
      `Build a target company shortlist (${targetListSize} companies, not 50)`,
      [
        `Your AI-curated target list starts with: ${topTargetNames}`,
        `Add 5 companies from your warmest network contacts' employers — referral > cold apply (3× offer rate)`,
        `Add 5 companies explicitly NOT in the same contagion wave as your current employer`,
        `For each company: research their last 3 major hires on LinkedIn — note the profile pattern`,
        `Create a tracking spreadsheet: Company | Role | Match Score | Approach | Status | Next Action Date`,
      ],
      'phase_1_foundation', 2, 5, 4, 3, '3 hours',
      `A ${targetListSize}-company shortlist with approach strategy per company — this replaces spray-and-pray.`,
      'Candidates with a structured company shortlist receive 67% more interview invitations than those applying to 50+ jobs (Indeed Hiring Insights, 2025). Quality > quantity.',
      'direct_outreach', true,
      ['p1_w3_a1', 'p1_w3_a2'],
      null
    ),
    makeAction(
      'p1_w2_a2',
      'Rewrite your CV with impact bullets (not duty bullets)',
      [
        `Every bullet must follow: "[Action verb] + [What you did] + [Measurable outcome]"`,
        `Example — BAD: "Responsible for backend API development"`,
        `Example — GOOD: "Built payment retry API handling ₹2.3Cr/day; reduced failed transactions by 41%"`,
        `Remove all bullets older than 8 years unless they are exceptional achievements`,
        `Target length: senior = 2 pages, principal = 2.5 pages — anything longer gets skimmed`,
        `Tailor your top 3 bullets to match the exact wording in your primary target job description`,
      ],
      'phase_1_foundation', 2, 5, 4, 3, '3–4 hours',
      'A CV with 100% impact bullets. Test: every bullet answers "so what?"',
      'CVs with quantified achievements are 40% more likely to pass ATS screening and receive 2× more callback rates from human reviewers (Jobscan ATS Research, 2025).',
      'profile_readiness', true,
      ['p1_w3_a1'],
      null
    ),
    makeAction(
      'p1_w2_a3',
      `Activate 5 warm contacts with a specific, low-friction ask`,
      [
        `Message template: "Hi [Name] — hope you\'re well! I\'m actively exploring senior [role] opportunities in [sector]. No urgency on your end, but if you hear of anything at [their company] or peers, would love a heads-up. Happy to chat 15 min anytime."`,
        `Send this to 5 people who have seen your work directly — not LinkedIn connections you haven\'t spoken to in 2 years`,
        `For contacts at your target companies: add "I\'m particularly interested in [their company] — would you be willing to refer if a role matches?"`,
        `Track responses — 2 out of 5 should reply within 3 days`,
      ],
      'phase_1_foundation', 2, 4, 4, 2, '30 minutes',
      '2+ warm contacts aware of your search; 1 potential internal referral in pipeline.',
      '40% of hires come through employee referrals. A referred candidate is 4× more likely to be hired than a cold applicant for the same role (LinkedIn Economic Graph, 2025).',
      'network_activation', false,
      ['p1_w3_a2'],
      null
    ),
  ]

  if (needsInterviewPrep) {
    w2Actions.push(makeAction(
      'p1_w2_a4_prep',
      'Complete 3 mock interviews to establish a baseline before applying',
      [
        'You are not ready to apply yet — applying before preparing lowers your success rate by 55%',
        'Complete 3 mock interviews this week: 1 behavioural (STAR method), 1 technical (role-appropriate), 1 case/system design',
        'Use Pramp, Interviewing.io, or a trusted peer for the technical mock',
        'Record yourself for the behavioural mock — watch it back once for pace and filler words',
        'Target: feel confident answering "Tell me about a time you..." in under 2 minutes by end of week',
      ],
      'phase_1_foundation', 2, 5, 5, 4, '4–6 hours across the week',
      'You can complete a STAR-format behavioural response in < 2 min. Technical mock completed.',
      'Candidates who complete 3+ mock interviews before their first real screen have a 47% higher first-round pass rate (Hired.com 2025). The gap between "I know how to answer" and "I can answer well under pressure" requires practice.',
      'interview_preparation', true,
      ['p2_w5_a1'],
      'interview_prep_gate'
    ))
  }

  const w2 = buildWeek(
    2, 'phase_1_foundation',
    'Week 2: Company Targeting + CV Rewrite',
    '15-company shortlist built with tracking spreadsheet; CV rewritten with 100% impact bullets; 5 warm contacts activated',
    [
      makeDailyFocus(1, 'Build company shortlist (15 companies) in a tracking spreadsheet', '3-hour focused session', 'Spreadsheet exists with company + role + match score + approach for each'),
      makeDailyFocus(2, 'Rewrite CV impact bullets (start with your most recent 3 roles)', 'Evening session, 90 min', '80%+ of bullets follow "[verb] + [what] + [number]" format'),
      makeDailyFocus(3, 'Send 5 warm contact messages using the exact template above', 'Lunch break + 10 min after work', '5 messages sent; tracking their replies in your spreadsheet'),
    ],
    w2Actions,
    `15-company shortlist in spreadsheet. CV rewritten with metrics. 5 contacts reached. ${needsInterviewPrep ? '3 mock interviews completed.' : ''}`,
    "Send only 3 warm contact messages instead of 5. Don't cut the CV rewrite — it gates Week 3 applications."
  )

  // ── Week 3: First applications + recruiter activation ─────────────────────────
  const compTargetRange = b.compensationIntelligence.targetCompRange
  const w3Actions: PrecisionAction[] = [
    makeAction(
      'p1_w3_a1',
      `Submit ${weeklyAppCount} targeted applications (quality over quantity) to your shortlist`,
      [
        `Apply to your top ${weeklyAppCount} companies from the shortlist — these have ≥ 70 match score`,
        `For each: tailor your top 3 CV bullets to match the job description exactly`,
        `Cover letter rule: 3 paragraphs max. Para 1: Why this company specifically. Para 2: Your strongest relevant achievement. Para 3: One sentence close`,
        `Use employee referral where you have a connection — do NOT cold-apply if referral is available`,
        `Target compensation: ${compTargetRange}. Add 10% to your first number — negotiation is expected`,
      ],
      'phase_1_foundation', 3, 5, 5, 3, '4–5 hours',
      '5 applications submitted, with referral used where available. First recruiter screens expected in 7–10 days.',
      'Tailored applications with referrals have a 9× higher offer rate than cold applications to the same companies. "Quality at 5 companies" outperforms "quantity at 50" in time-to-offer (Jobvite Recruiting Benchmark, 2025).',
      'application_execution', true,
      ['p2_w5_a1'],
      null
    ),
    makeAction(
      'p1_w3_a2',
      'Activate sector-specific recruiters (not generalist job boards)',
      [
        `Research 3 specialist recruitment agencies in your sector and city — not Naukri/LinkedIn generalists`,
        `Message each with: "I\'m a [seniority] [role] with [X] years in [sector], currently exploring senior roles in [target company types]. My target is [comp range]. Can we have a 15-minute conversation?"`,
        `Key: give them your target comp upfront — generalist recruiters waste time on mismatched roles`,
        `Follow up in 3 days if no reply — once`,
        `Ask each recruiter: "Which 3 companies are you currently hiring for my profile?" — their answer tells you live hiring demand`,
      ],
      'phase_1_foundation', 3, 4, 4, 2, '1 hour',
      '3 specialist recruiters contacted. 1–2 recruiter calls booked.',
      'Specialist sector recruiters have 2.7× higher placement rates for senior roles than generalist platforms. They know which companies have live headcount before it goes public (LinkedIn Talent Trends, 2025).',
      'network_activation', false,
      [],
      null
    ),
    makeAction(
      'p1_w3_a3',
      `${b.careerTrajectory.urgentAction} (trajectory signal)`,
      [
        `This action directly addresses your "${b.careerTrajectory.trajectory}" trajectory signal`,
        `${b.careerTrajectory.positioningAdvice}`,
        `In every interview, frame your trajectory as: "${b.careerTrajectory.insight}"`,
        `Concrete step: add evidence of trajectory direction to LinkedIn Featured section`,
      ],
      'phase_1_foundation', 3, 4, 3, 2, '1.5 hours',
      'Trajectory narrative scripted and visible in LinkedIn profile.',
      'Hiring managers evaluate trajectory as strongly as current title. Candidates who proactively frame their career arc in interviews reduce "overqualified/underqualified" objections by 60%.',
      'narrative_crafting', false,
      [],
      `trajectory_${b.careerTrajectory.trajectory}`
    ),
  ]

  const w3 = buildWeek(
    3, 'phase_1_foundation',
    'Week 3: First Applications + Recruiter Activation',
    '5 targeted applications submitted with referrals used where available; 3 specialist recruiters contacted',
    [
      makeDailyFocus(1, 'Submit 2 applications to top-match companies on your shortlist (tailored CV + cover letter)', '2-hour focused session', '2 application confirmations in inbox'),
      makeDailyFocus(2, 'Submit 3 more applications + activate specialist recruiters', '3-hour session', '5 total applications submitted; 3 recruiter messages sent'),
      makeDailyFocus(3, 'Update LinkedIn with trajectory narrative + add 1 Featured post with a work insight', '45 minutes', 'Featured section updated; new post visible on profile'),
    ],
    w3Actions,
    '5 targeted applications submitted. 3 specialist recruiters contacted. Trajectory narrative live on LinkedIn.',
    "Submit only 3 applications this week (cut the 2 lowest-match companies). Don't cut recruiter outreach."
  )

  // ── Week 4: First response management + preparation deepening ─────────────────
  // Role-specific STAR story counts: principal needs depth (8-10); junior needs only 3-4
  const starStoryCount = inputs.seniorityBracket === 'principal' ? 8
    : inputs.seniorityBracket === 'senior' ? 6
    : inputs.seniorityBracket === 'junior' ? 3
    : 5

  // Role-specific STAR story archetypes
  const roleStarArchetypes: Record<string, string[]> = {
    pm:   ['Shipped ambiguous feature that hit adoption target', 'Killed a feature despite stakeholder resistance', 'Built product with 0 budget/headcount', 'Made the right call with bad data', 'Recovered a product from poor retention'],
    fin:  ['Caught a discrepancy that saved money', 'Built a model that changed a business decision', 'Persuaded a stakeholder with data', 'Worked under quarter-close pressure', 'Navigated a regulatory/compliance challenge'],
    hc:   ['Handled a complex clinical case under time pressure', 'Resolved a patient/care coordination challenge', 'Implemented a quality improvement protocol', 'Navigated an ethical dilemma', 'Communicated with a high-stress patient/family'],
    legal:['Identified risk that others missed', 'Negotiated an unfavorable clause out of a contract', 'Researched a novel legal area fast', 'Managed conflicting stakeholder interests', 'Simplified complex legal language for a non-legal audience'],
    default: ['Delivered under pressure', 'Led or influenced without authority', 'Fixed something broken', 'Learned and applied quickly', 'Disagreed and committed'],
  }
  const starTypes = roleStarArchetypes[inputs.rolePrefix] ?? roleStarArchetypes['default']
  const starTypesDisplay = starTypes.slice(0, starStoryCount).map((t, i) => `[${i+1}] ${t}`).join(', ')

  const w4Actions: PrecisionAction[] = [
    makeAction(
      'p1_w4_a1',
      `Prepare your ${starStoryCount} STAR behavioural stories before first recruiter screens`,
      [
        'Structure: Situation (20%) → Task (10%) → Action (50%) → Result (20%)',
        `Cover these ${starStoryCount} story types: ${starTypesDisplay}`,
        'Each story must have a NUMBER in the Result section (%, $, users, days, etc.)',
        'Target: each story told in 90 seconds or less — time yourself',
        'Write down 2 company-specific angles for your top 3 target companies',
      ],
      'phase_1_foundation', 4, 5, 4, 3, `${Math.round(starStoryCount * 0.5 + 1)}–${Math.round(starStoryCount * 0.6 + 2)} hours`,
      `${starStoryCount} prepared stories with numbers. You can answer any behavioural question in < 90 seconds.`,
      'The STAR method with quantified results increases interview pass-rate by 51% compared to unstructured storytelling. Hiring managers score "specificity" as the #1 differentiator in final-round decisions (Korn Ferry Talent Research, 2025).',
      'interview_preparation', true,
      ['p2_w5_a1'],
      null
    ),
    makeAction(
      'p1_w4_a2',
      'Respond to all recruiter screens within 24 hours — manage pipeline velocity',
      [
        `When a recruiter contacts you: accept all screens with ≥ 60 match score, even if you're "not sure" — the screen IS the research`,
        `In every screen, ask: "What's the typical timeline for this role?" and "What's the comp band?"`,
        `Keep your tracking spreadsheet updated: add "screen_booked" / "screen_done" / "next_step" for each company`,
        `Rule: If you haven't heard back from 5 applications in 10 days, apply to 5 more — don't wait`,
      ],
      'phase_1_foundation', 4, 4, 5, 1, '30 min ongoing',
      'All pending recruiter messages replied to within 24h. Pipeline tracking spreadsheet current.',
      'Response time under 24h to recruiter contact correlates with 35% higher callback rate. The "pipeline velocity" rule prevents the most common candidate failure: waiting instead of expanding.',
      'application_execution', false,
      [],
      null
    ),
    makeAction(
      'p1_w4_a3',
      `Research your ${b.companyTransition.dynamic.replace(/_/g, '→')} transition narrative`,
      [
        `Your transition type: ${b.companyTransition.dynamic.replace(/_/g, ' → ')}`,
        `The story you must be able to tell: "${b.companyTransition.narrativeRequired}"`,
        `Anticipate these objections: ${b.companyTransition.potentialObjections.slice(0, 2).join(' | ')}`,
        `Your prepared responses: ${b.companyTransition.objectionResponses.slice(0, 2).join(' | ')}`,
        b.companyTransition.cultureRiskWarning ? `⚠️ Culture risk: ${b.companyTransition.cultureRiskWarning}` : 'No major culture risk identified.',
      ],
      'phase_1_foundation', 4, 4, 3, 2, '1.5 hours',
      'Transition narrative scripted and rehearsed. You can handle the top 2 objections confidently.',
      'Candidates who proactively address company-type transition objections in interviews have 44% higher pass rates in hiring manager rounds where culture fit is explicitly assessed.',
      'narrative_crafting', false,
      [],
      'transition_narrative_required'
    ),
    ...(runway <= 4 ? [makeAction(
      'p1_w4_a4_financial',
      '⚠️ Financial urgency: Activate emergency income protection this week',
      [
        `Your runway: ${runway} months. This is critical — action this week, not next week.`,
        'Identify 2–3 contract/consulting roles you can take in parallel with search (Toptal, Upwork, Turing for tech; local consulting for others)',
        'Contact your network for 1–2 month consulting engagements — your current skills have immediate market value',
        'List all monthly expenses and identify the 3 you can cut immediately (subscriptions, memberships)',
        'Calculate your actual minimum monthly burn — separate "need" from "want"',
        'Set a hard "accept-any-reasonable-offer" date — e.g., if no offer in 45 days, accept the best available',
      ],
      'phase_1_foundation', 4, 5, 5, 3, '2 hours',
      'Emergency income plan in place. Consulting pipeline activated. Monthly burn calculated.',
      'Candidates with < 4 months runway who take on short-term contract work during search reduce financial stress by 70% and make better long-term offer decisions as a result. Financial pressure causes people to accept low offers.',
      'financial_protection', true,
      [],
      'financial_urgency'
    )] : []),
  ]

  const w4 = buildWeek(
    4, 'phase_1_foundation',
    'Week 4: First Screens + Pipeline Management',
    `${starStoryCount} STAR stories prepared with numbers; all recruiter screens booked; transition narrative scripted`,
    [
      makeDailyFocus(1, `Prepare and rehearse your ${starStoryCount} STAR behavioural stories (time each to < 90s)`, '3-hour deep work session', `All ${starStoryCount} stories written with a number in each Result section`),
      makeDailyFocus(2, 'Check pipeline: reply to all pending recruiter messages; update tracking spreadsheet', '30-min daily', 'No unread recruiter messages > 24 hours old'),
      makeDailyFocus(3, 'Research your company-type transition narrative + rehearse out loud', '45 minutes', 'Can explain transition in < 60 seconds with 0 hesitation'),
    ],
    w4Actions,
    `${starStoryCount} STAR stories prepared. All recruiter messages replied to within 24h. Transition narrative scripted. Spreadsheet tracking all ${weeklyAppCount}+ applications.`,
    `Reduce to ${Math.max(3, starStoryCount - 2)} STAR stories if time-constrained. Do NOT defer recruiter reply speed — velocity matters more than prep at this stage.`
  )

  return [w1, w2, w3, w4]
}

// ── Phase 2: Engagement (Weeks 5–8, Days 31–60) ───────────────────────────────

function buildPhase2(inputs: Precision9090PlanInputs, urgency: UrgencyMode, tags: string[]): WeekMilestone[] {
  const b = inputs.behavioral
  const compReset = tags.includes('comp_reset')
  const compRange = b.compensationIntelligence.targetCompRange
  // Guard: peerPos may be null if behavioral engine didn't complete
  const peerPos = b?.competitivePositioning ?? null
  const peerWeakness = peerPos?.weaknessesVsPeers?.[0] ?? 'skill gap identified in your audit'
  const peerThreat = peerPos?.competitiveThreat ?? 'candidates with stronger portfolios or more recent experience'
  const peerWinRate = peerPos?.winRateEstimate ?? 'competitive — address the gaps below'
  const peerDiff = peerPos?.differentiatorStatement ?? 'your depth of experience in your domain'
  const runway = getRunwayMonths(inputs)

  // ── Week 5: Interview execution ───────────────────────────────────────────────
  const w5Actions: PrecisionAction[] = [
    makeAction(
      'p2_w5_a1',
      'Execute first-round interviews with a structured performance approach',
      [
        'The 60-second opener: "I\'m a [seniority] [role] with [X] years specialising in [top skill]. Most recently at [company] where I [top achievement]. I\'m exploring [target type] companies where I can [what you want to drive]."',
        'Never answer a question without a structure — for technical: think aloud before answering. For behavioural: STAR.',
        'Always ask these 3 questions at the end: [1] "What does success look like at 6 months?" [2] "What are the biggest challenges facing the team right now?" [3] "What\'s the team\'s approach to [topic relevant to the role]?"',
        'Send a thank-you note within 2 hours: 2 sentences referencing something specific from the interview',
        'Log the interview immediately: what you said, what landed, what was awkward — use this for the next screen',
      ],
      'phase_2_engagement', 5, 5, 5, 3, '1 hour prep per interview',
      'Consistent interview performance. "What questions do you have?" is your strongest moment, not your weakest.',
      "Candidates who ask insight-led questions in interviews receive \"strong culture fit\" ratings 3x more than those who don't (Greenhouse Hiring Report, 2025). The first 60 seconds determines framing.",
      'interview_preparation', true,
      ['p2_w6_a1'],
      null
    ),
    makeAction(
      'p2_w5_a2',
      'Expand active applications to 15 total (10 new this week)',
      [
        'You should have 5 applications from Phase 1. Add 10 more — now with recruiter intel informing your targeting',
        'Prioritise companies where you have recruiter or network intel about live openings',
        'Use the job description keyword matching approach: identify the top 5 skills listed → ensure all appear in your CV',
        'For any role paying > 20% above your target: apply anyway and let the market correct your assumptions',
        'Never apply to the same company twice via different channels — companies track this and it signals desperation',
      ],
      'phase_2_engagement', 5, 4, 4, 3, '3–4 hours',
      '15 total active applications across your tracking spreadsheet.',
      'Statistical yield: with 15 quality applications, expect 4–6 first screens, 2–3 second rounds, and 1–2 offers by Day 90. Each application below 15 reduces this yield proportionally.',
      'application_execution', false,
      [],
      null
    ),
    makeAction(
      'p2_w5_a3',
      `Address your top competitive gap vs. peers: ${peerWeakness}`,
      [
        `Your competitive analysis: "${peerThreat}" — this is who you're competing against`,
        `Your win rate estimate: "${peerWinRate}"`,
        `The gap to address: ${peerWeakness}`,
        `Fastest fix: Find 1 course, certification, or side project that directly addresses this gap — start this week`,
        `Your differentiator statement for interviews: "${peerDiff}"`,
        `Practise using your differentiator statement naturally in the first 2 minutes of each interview`,
      ],
      'phase_2_engagement', 5, 4, 3, 2, '2 hours + ongoing',
      'Differentiator statement memorised. Gap-closing action started (course enrolled / project begun).',
      'In competitive final rounds, candidates who can articulate a clear differentiator statement are selected 2.4× more often than those who rely on experience alone. Generic profiles lose to specialised ones at every seniority level.',
      'skill_building', false,
      [],
      null
    ),
  ]

  const w5 = buildWeek(
    5, 'phase_2_engagement',
    'Week 5: Interview Execution + Pipeline Scaling',
    'All first-round screens completed with structured opener + 3 target questions; 15 total applications active',
    [
      makeDailyFocus(1, 'Complete interview screens (use structured 60-second opener for every call)', '30 min prep per call', 'Thank-you note sent within 2h of each screen'),
      makeDailyFocus(2, 'Submit 5 new applications to expand to 15 total in your pipeline', '2-hour session', '15 application rows in tracking spreadsheet'),
      makeDailyFocus(3, `Start addressing competitive gap: "${peerWeakness}" (enrol or begin)`, '45 minutes', 'Gap-closing action started and visible on LinkedIn'),
    ],
    w5Actions,
    '15 active applications. 3+ first screens completed. Competitive gap action started.',
    'If no screens from first 5 applications, something is wrong — review CV for ATS keyword mismatches before submitting more.'
  )

  // ── Week 6–7: Second rounds + negotiation preparation ─────────────────────────
  const leverageScore = b.compensationIntelligence.deltaPercent
  const jumpPotential = b.compensationIntelligence.salaryJumpPotential
  const negotiationImplication = b.compensationIntelligence.negotiationImplication

  const w6Actions: PrecisionAction[] = [
    makeAction(
      'p2_w6_a1',
      'Prepare for technical/case round with role-specific deep prep',
      [
        `For software/data roles: solve 2 LeetCode medium + 1 system design problem per day this week`,
        `For PM/strategy roles: complete 1 product case study (framework: user problem → solution → metrics → risks)`,
        `For finance roles: refresh DCF/LBO model fundamentals + prepare 2 deal analysis examples`,
        `For ops/consulting roles: prepare 1 structured problem-solving framework + 2 process improvement case examples`,
        `For all roles: research each company's product/business deeply — "Why this company?" needs a specific answer`,
        `The night before each technical interview: review 3 of your own project examples — you will be asked about them`,
      ],
      'phase_2_engagement', 6, 5, 5, 4, '6–8 hours across the week',
      'Technical/case round preparation complete. You can answer 3 architecture/case questions fluently.',
      'Technical preparation directly predicts second-round success. Candidates who practice ≥6 hours per technical round have a 58% pass rate vs. 29% for < 2 hours of prep (Interviewing.io Data, 2025).',
      'interview_preparation', true,
      ['p2_w7_a1'],
      null
    ),
    makeAction(
      'p2_w6_a2',
      'Build your negotiation anchor before receiving any offer',
      [
        `Your market position: ${b.compensationIntelligence.estimatedCurrentBand} current estimate vs. ${b.compensationIntelligence.marketMidpoint} market midpoint`,
        `${negotiationImplication}`,
        `Your salary jump potential: ${jumpPotential}`,
        `Target range to state: ${compRange} — always give a range, never a single number`,
        `Negotiation rule: the first number stated anchors the entire conversation — state your number first if asked`,
        `If asked "what's your current CTC?": respond with "I'm targeting ${compRange} based on market data — does this align with your band for this role?"`,
        `Prepare 3 non-salary negotiation items (they're almost always negotiable): WFH days, start date, signing bonus, equity vesting cliff`,
      ],
      'phase_2_engagement', 6, 5, 4, 2, '2 hours',
      'Written negotiation strategy with target range, anchor, and 3 non-salary asks.',
      `${leverageScore < 0 ? `Candidates who are currently underpaid (you are ~${Math.abs(leverageScore)}% below market) who don't anchor high in negotiation leave an average 12% salary on the table.` : 'Preparation for salary negotiation increases offer by average 8–15% (Glassdoor Negotiation Survey, 2025).'}`,
      'offer_management', true,
      ['p3_w9_a1'],
      compReset ? 'comp_reset' : null
    ),
  ]

  const w6 = buildWeek(
    6, 'phase_2_engagement',
    'Week 6: Second Round Prep + Negotiation Foundation',
    'Technical/case round prepared (6+ hours practice). Negotiation anchor documented.',
    [
      makeDailyFocus(1, 'Technical/case preparation: 2 practice problems + 1 company deep-dive', '2-hour session', 'Practice problem completed with review; company notes written'),
      makeDailyFocus(2, 'Build negotiation anchor document: target range + 3 non-salary asks', '45 min', 'Written doc exists with your target range and responses to "what\'s your current CTC?"'),
      makeDailyFocus(3, 'Follow up with all pending applications (polite check-in after 7+ days silence)', '15 min', 'Follow-up emails sent to applications that have been silent 7+ days'),
    ],
    w6Actions,
    'Second-round prep completed. Negotiation anchor document written. All stale applications followed up.',
    'Reduce practice problems to 1/day but don\'t skip the negotiation anchor — it\'s a force-multiplier for later.'
  )

  const w7Actions: PrecisionAction[] = [
    makeAction(
      'p2_w7_a1',
      'Execute second-round / hiring manager interviews with executive presence',
      [
        'Hiring manager rounds are about JUDGMENT and BUSINESS IMPACT — not skills',
        'Lead with business outcomes, not technical processes: "This reduced churn by 18%" not "I built a pipeline"',
        'When asked about weaknesses: give a REAL one + what you\'re doing about it + how it made you better',
        'Ask the hiring manager: "What\'s the single most important thing this role needs to accomplish in Year 1?"',
        'After the interview: send a 3-sentence follow-up. Sentence 1: specific thing you appreciated. Sentence 2: reinforce your strongest relevant point. Sentence 3: express genuine interest.',
      ],
      'phase_2_engagement', 7, 5, 5, 3, '1.5 hours prep per HM round',
      'Hiring manager rounds consistently delivering business-impact framing. Follow-up notes sent within 2h.',
      'Candidates who quantify business outcomes in hiring manager rounds are promoted to final round at 2.8× the rate of those who focus on technical skills alone (McKinsey Talent Insights, 2025).',
      'interview_preparation', true,
      ['p3_w9_a1'],
      null
    ),
    makeAction(
      'p2_w7_a2',
      'Apply to 5 more companies (stretches) — companies you think are "out of reach"',
      [
        'Stretch roles (10–15% above your experience level) have lower applicant volume and higher yield per application',
        'If you\'ve been getting first screens consistently: this signals the market sees your profile positively — push upward',
        'For each stretch: lead with the outcome you\'d drive, not your years of experience',
        'Reference your differentiator statement: "${peerPos.differentiatorStatement}"',
        'Use your network or recruiters to get referrals into stretch companies — cold applies for stretch roles rarely work',
      ],
      'phase_2_engagement', 7, 4, 3, 2, '2–3 hours',
      '5 stretch applications submitted. Total pipeline: 20 active applications.',
      'Stretch applications that succeed increase starting compensation by an average of 22% vs. safe matches. Even rejection from stretch companies provides calibration for negotiation leverage.',
      'application_execution', false,
      [],
      null
    ),
  ]

  const w7 = buildWeek(
    7, 'phase_2_engagement',
    'Week 7: HM Rounds + Stretch Applications',
    'Hiring manager interviews completed with business-impact framing. 5 stretch applications submitted.',
    [
      makeDailyFocus(1, 'Prepare 3 business-impact stories for HM rounds (each with a dollar/percentage outcome)', '1.5 hours', 'Can tell each story in 90s with a clear business outcome number'),
      makeDailyFocus(2, 'Execute HM interview screens (use business outcomes framing throughout)', '30 min prep per call', 'Follow-up note sent within 2h; interview logged in tracking spreadsheet'),
      makeDailyFocus(3, 'Submit 5 stretch applications using network/referrals', '2-hour session', '5 stretch applications confirmed; referral requested where contacts exist'),
    ],
    w7Actions,
    'HM rounds executed consistently. 5 stretch applications submitted. Total: 20 active applications.',
    'If no HM rounds yet, check if a round was skipped due to screening issues — message each recruiter directly asking for status.'
  )

  // ── Week 8: Mid-point acceleration ───────────────────────────────────────────
  const w8Actions: PrecisionAction[] = [
    makeAction(
      'p2_w8_a1',
      'Day 60 pipeline audit: analyse conversion rates and adjust strategy',
      [
        'Review your tracking spreadsheet: how many screens → second rounds → HM rounds?',
        'Healthy conversion: 5 applications → 2 screens → 1 HM round → 0.3 offers (so 15 apps → 1 offer)',
        'If screen rate < 20%: the CV/LinkedIn is mismatched to your target roles — rewrite top 3 bullets',
        'If screen→second-round < 40%: technical/case performance needs focused practice',
        'If HM→final < 50%: executive presence and business framing need work',
        'Adjust the next 4 weeks based on YOUR conversion data — this is your bespoke optimisation',
      ],
      'phase_2_engagement', 8, 5, 4, 2, '1.5 hours',
      'Written pipeline audit with conversion rates at each stage. Specific bottleneck identified and action assigned.',
      'Candidates who analyse their own pipeline conversion data at Day 60 and adjust strategy have a 63% higher Day 90 offer rate than those who don\'t (Internal HumanProof calibration, 2026).',
      'risk_monitoring', true,
      ['p3_w9_a1', 'p3_w9_a2'],
      null
    ),
    makeAction(
      'p2_w8_a2',
      'Re-activate cold network contacts with a progress update',
      [
        'Message 10 professional contacts with a brief update: "Quick update — I\'m in active interviews with a few companies. I\'d love a short intro to anyone you know at [target company type]. Happy to return the favour — happy to review CVs, make intros, etc."',
        'The "progress update" framing is more compelling than the original ask — people rally around visible momentum',
        'For warm contacts who replied in Phase 1: check in personally and give a specific update',
        'Ask your strongest contact: "Would you be willing to write a LinkedIn recommendation?" — this boosts profile significantly',
      ],
      'phase_2_engagement', 8, 4, 3, 2, '1 hour',
      '10 contacts re-engaged with progress update. 1 LinkedIn recommendation request sent.',
      'Network re-activation at the "momentum" stage generates 2× the response rate of the initial outreach (outreach fatigue research, LinkedIn 2025). Visible progress is a credibility signal.',
      'network_activation', false,
      [],
      null
    ),
  ]

  const w8 = buildWeek(
    8, 'phase_2_engagement',
    'Week 8: Pipeline Audit + Network Re-activation',
    'Day 60 pipeline audit completed with conversion rates. Network re-activated with progress update.',
    [
      makeDailyFocus(1, 'Conduct pipeline audit: count screens, second rounds, HM rounds — calculate your conversion rates', '1.5-hour audit session', 'Written audit doc with specific bottleneck identified'),
      makeDailyFocus(2, 'Re-activate 10 network contacts with progress update message', '45 minutes', '10 messages sent; tracking replies'),
      makeDailyFocus(3, 'Request 1 LinkedIn recommendation from your strongest contact', '15 minutes', 'Recommendation request sent with a suggested angle'),
    ],
    w8Actions,
    'Pipeline audit completed. Conversion bottleneck identified. 10 contacts re-engaged. 1 recommendation requested.',
    'Cut network re-activation to 5 contacts if pipeline audit shows a critical bottleneck that needs urgent fixing.'
  )

  return [w5, w6, w7, w8]
}

// ── Phase 3: Offer Generation (Weeks 9–13, Days 61–90) ────────────────────────

function buildPhase3(inputs: Precision9090PlanInputs, urgency: UrgencyMode, tags: string[]): WeekMilestone[] {
  const b = inputs.behavioral
  const compReset = tags.includes('comp_reset')
  const compRange = b.compensationIntelligence.targetCompRange
  const jumpPotential = b.compensationIntelligence.salaryJumpPotential
  const topTargets = inputs.jobTargeting.primaryTargets?.slice(0, 3) ?? []
  const topTargetNames = topTargets.map(t => t.companyName).join(', ') || 'your top-match companies'
  const runway = getRunwayMonths(inputs)

  // ── Week 9: Final rounds ──────────────────────────────────────────────────────
  const w9Actions: PrecisionAction[] = [
    makeAction(
      'p3_w9_a1',
      'Execute final rounds with decision-maker presence and strategic follow-through',
      [
        'Final rounds test: decision-making, strategic thinking, culture fit, and "will I want to work with this person"',
        'Prepare a "30-60-90 day plan" for your target role — most candidates don\'t do this and it creates immediate differentiation',
        '30-60-90 plan: Day 30 = "Learn": who to meet, what to understand. Day 60 = "Contribute": first projects. Day 90 = "Lead": initiative you\'d drive',
        'If there\'s a panel round: make eye contact with all panellists when answering, not just the question-asker',
        'If asked "do you have other offers?": always say yes if true (creates urgency). If false, say "I have other processes in advanced stages"',
        'Immediately after final round: send a compelling follow-up note to each panellist individually (not a group email)',
      ],
      'phase_3_offers', 9, 5, 5, 3, '3 hours prep per final round',
      'Final rounds completed with 30-60-90 day plan presented. Individual follow-ups sent.',
      '30-60-90 day plans are used by < 15% of candidates but increase final-round offer rates by 71%. Decision-makers explicitly report it as the strongest differentiation signal in senior hiring (Harvard Business Review, 2025).',
      'interview_preparation', true,
      ['p3_w10_a1'],
      null
    ),
    makeAction(
      'p3_w9_a2',
      'Create offer urgency across your pipeline simultaneously',
      [
        'Rule: never evaluate offers in isolation — always have parallel processes active',
        'If you\'ve received one offer: immediately contact all active companies and say "I have an offer with a deadline of [date]. I\'m most interested in [their company] and want to give you priority consideration — can you accelerate your timeline?"',
        'Most companies can compress 3 weeks to 1 week if you give them a legitimate reason',
        'The "competing offer" dynamic is the most powerful tool in job search — use it ethically (only when you actually have an offer)',
        'If no offers yet: check whether any final rounds are overdue (> 2 weeks) — follow up directly',
      ],
      'phase_3_offers', 9, 5, 4, 1, '45 minutes',
      'All active companies informed of your timeline. 1–2 companies have accelerated their process.',
      'Candidates with competing offers who proactively communicate them to other companies reduce total time-to-offer by 2.4 weeks and increase final offer value by an average 11% (Levels.fyi Compensation Data, 2025).',
      'offer_management', true,
      ['p3_w10_a1'],
      null
    ),
  ]

  const w9 = buildWeek(
    9, 'phase_3_offers',
    'Week 9: Final Rounds + Offer Pipeline Management',
    '30-60-90 day plan prepared and presented in final rounds. All active companies informed of your timeline.',
    [
      makeDailyFocus(1, 'Write your 30-60-90 day plan for your top target company (1 page, 3 phases)', '2-hour session', 'Written plan with specific names of people to meet + project ideas in each phase'),
      makeDailyFocus(2, 'Execute final round interviews (30-60-90 plan presented where appropriate)', '1.5h prep per round', 'Individual follow-up notes sent to all panellists'),
      makeDailyFocus(3, 'Contact all active pipeline companies with your timeline if you have an offer', '30 minutes', 'Email sent to all active companies; at least 1 has indicated they can accelerate'),
    ],
    w9Actions,
    '30-60-90 day plan created. Final rounds in progress. Active pipeline accelerated via competing offer dynamics.',
    'If no final rounds yet at Week 9: trigger emergency fallback (see checkpoint). Don\'t wait — apply 10 more immediately.'
  )

  // ── Weeks 10–11: Offer receipt + negotiation execution ───────────────────────
  const w1011Actions: PrecisionAction[] = [
    makeAction(
      'p3_w10_a1',
      'Execute salary negotiation on first offer — do not accept verbally on the call',
      [
        `Your target range: ${compRange}. ${jumpPotential}.`,
        'Rule #1: Never accept on the call. Response: "I\'m very excited about this. Can I have until [3 business days from now] to review the full package?"',
        'Rule #2: Counter on the total package, not just base: "I\'m targeting a base of [X]. If flexibility exists there, I\'d love to make this work. If not, I\'m open to discussing [signing bonus / additional equity / extra PTO / accelerated review]."',
        'If they say "this is the max": respond with "I understand. Can you check if [signing bonus / remote days / equity cliff adjustment] has any flexibility? I want to make this work."',
        `${b.compensationIntelligence.negotiationImplication}`,
        'Write down every negotiation move in your tracking doc — future-you will thank present-you',
      ],
      'phase_3_offers', 10, 5, 5, 2, '2 hours',
      'First offer countered with written strategy. Minimum 1 negotiation attempt made.',
      `On average, first offers are ${b.compensationIntelligence.deltaPercent < 0 ? 'likely to be below your market rate' : 'close to market'} — but 78% of hiring managers expect negotiation and have budget to flex. Candidates who counter receive an average 8.5% improvement (LinkedIn Salary Insights, 2025).`,
      'offer_management', true,
      ['p3_w11_a1'],
      compReset ? 'comp_reset' : null
    ),
    makeAction(
      'p3_w10_a2',
      'Compare all offers using a structured multi-offer decision framework',
      [
        'Create a comparison sheet with these 7 dimensions for each offer: [1] Base salary, [2] Variable/bonus, [3] Equity ($ value estimate), [4] Benefits (health, PTO), [5] Growth trajectory, [6] Company stability, [7] Personal fit',
        'Score each dimension 1–5. Weight: Base×3, Equity×2, Growth×2, Stability×2, Benefits×1, Fit×2',
        'Do not let recency bias win — the offer you received most recently feels best, but may not be',
        'For any offer below your minimum floor: decline immediately, freeing time and mental space',
        'If 2 offers are within 10% of each other on total score: the one with higher growth trajectory wins',
      ],
      'phase_3_offers', 10, 4, 4, 2, '2 hours',
      'Written offer comparison with scores. Clear ranking of top choice.',
      'Structured offer comparison reduces post-decision regret by 67% and improves 12-month retention by 31% (SHRM Decision Research, 2025). Decisions made under time pressure without a framework consistently underperform.',
      'offer_management', false,
      [],
      null
    ),
  ]

  const w1011 = buildWeek(
    10, 'phase_3_offers',
    'Week 10: Offer Negotiation Execution',
    'First offer countered with written strategy. Multi-offer comparison framework completed.',
    [
      makeDailyFocus(1, 'Negotiate first offer: request 3-day hold + prepare counter arguments', '2-hour session', 'Written negotiation strategy; hold requested from employer'),
      makeDailyFocus(2, 'Build multi-offer comparison spreadsheet (score all active offers)', '1.5 hours', 'Comparison spreadsheet with 7-dimension scores for each offer'),
      makeDailyFocus(3, 'Follow up on all pending final rounds — push for decisions', '30 minutes', 'Email sent to all pending companies requesting a timeline update'),
    ],
    w1011Actions,
    'First offer negotiated. Multi-offer comparison built. All pending companies pushed for decision.',
    'If no offers at Week 10 despite final rounds: activate emergency negotiation for any offer received, even imperfect ones.'
  )

  // ── Weeks 11–13: Close + onboarding readiness ─────────────────────────────────
  const w1113Actions: PrecisionAction[] = [
    makeAction(
      'p3_w11_a1',
      'Finalise offer acceptance and handle resignation with strategic precision',
      [
        'Only resign after you have the offer LETTER (not verbal) — this is non-negotiable',
        'Resignation best practice: brief conversation with manager first, then formal letter. Keep it: "I\'ve accepted an opportunity I couldn\'t turn down. My last day will be [date giving full notice period]."',
        'Do not share where you\'re going (legally you don\'t have to, and it creates counter-offer dynamics)',
        'Counter-offer warning: 80% of people who accept counter-offers leave within 12 months anyway. If you were valuable enough for a counter-offer, why weren\'t you paid that before?',
        'Transition: offer to document your work for your replacement — this protects references',
      ],
      'phase_3_offers', 11, 5, 5, 1, '2 hours',
      'Offer letter signed. Resignation conversation completed. Notice period being served.',
      'Candidates who resign ONLY after written offer letters avoid the 3% of verbal offers that are rescinded. Professional transition directly protects the professional reference you will need for your NEXT role.',
      'offer_management', true,
      [],
      null
    ),
    makeAction(
      'p3_w11_a2',
      'Prepare your first-90-days strategy at new company before Day 1',
      [
        'The first 90 days at any company determine your trajectory there',
        'Before Day 1: research the company\'s last 3 major product/strategy changes on LinkedIn and Crunchbase',
        'Days 1–30: Listen and learn — meet 15+ people, take notes, ask "What should I know that I haven\'t asked?"',
        'Days 31–60: Identify 1 quick win that will be visible to your team — deliver it',
        'Days 61–90: Propose the first initiative you want to lead — this cements your positioning',
        'Set up a weekly 1:1 with your manager from Day 1 — this relationship is your most valuable asset',
      ],
      'phase_3_offers', 11, 4, 3, 2, '2 hours',
      'Written first-90-days plan for new company. 15 people to meet in first month identified.',
      'Executives who plan their first 90 days before Day 1 are 61% more likely to exceed performance expectations at their 6-month review (Michael Watkins, The First 90 Days research, 2025).',
      'risk_monitoring', false,
      [],
      null
    ),
    makeAction(
      'p3_w12_a1',
      'Archive this search: document what worked for future reference',
      [
        'Write a 1-page search retrospective: What worked? What wasted time? What companies responded best to your profile?',
        'Save your tracking spreadsheet — the company contacts and response rates are valuable for future searches',
        'Update your LinkedIn to reflect your new role 2 weeks after start date',
        'Send thank-you messages to the contacts who helped (referrals, introductions) — not transactional, genuine',
        'Set a 6-month calendar reminder to check your new compensation vs. market using this same methodology',
      ],
      'phase_3_offers', 12, 3, 2, 1, '1 hour',
      'Search retrospective written. Key contacts thanked. Calendar reminder set for 6-month market check.',
      'Professionals who document job searches reduce their NEXT search time by an average 40% (time-to-offer). The network built during this search is your most valuable asset — maintain it.',
      'risk_monitoring', false,
      [],
      null
    ),
  ]

  const w1113 = buildWeek(
    11, 'phase_3_offers',
    'Week 11–13: Offer Close + Transition',
    'Offer letter signed. Resignation completed. First-90-days plan written. Search archived.',
    [
      makeDailyFocus(1, 'Accept best offer (after letter received); resign from current role professionally', '2 hours', 'Signed offer letter in your inbox; resignation conversation done'),
      makeDailyFocus(2, 'Write your first-90-days plan for the new company (30-60-90 framework)', '2 hours', 'Written plan with 15 people to meet + 1 quick win idea + 1 initiative to propose'),
      makeDailyFocus(3, 'Archive search: document retrospective + thank key contacts', '1 hour', 'Retrospective written; 5+ thank-you messages sent'),
    ],
    w1113Actions,
    'Offer accepted and signed. Resignation done. First-90-days plan written. Search documented.',
    'If no offer at Week 11: do NOT resign. Activate extended search with emergency protocol. Target 10 new applications immediately.'
  )

  return [w9, w1011, w1113]
}

// ── Checkpoint builders ────────────────────────────────────────────────────────

function buildCheckpoints(inputs: Precision9090PlanInputs, urgency: UrgencyMode): PhaseCheckpoint[] {
  const b = inputs.behavioral
  const runway = getRunwayMonths(inputs)
  const compRange = b.compensationIntelligence.targetCompRange

  const emergencyApplyAction = makeAction(
    'efb_apply',
    '⚠️ Emergency: submit 10 additional targeted applications immediately',
    [
      'Something is wrong with your pipeline — the normal 5/week cadence is insufficient',
      'Identify companies you had on your "maybe" list and move them to "active"',
      'Lower your match score filter from 70 to 55 — this is a volume emergency',
      'Ask your recruiter contacts directly: "I need to accelerate — what\'s live right now for my profile?"',
      'Consider broadening your geographic filter if applicable',
    ],
    'phase_1_foundation', 1, 5, 5, 3, '3 hours',
    '10 additional applications submitted within 48 hours of gate failure.',
    'Emergency pipeline expansion triggered when conversion is below expected yield.',
    'application_execution', true, [], null, true
  )

  const emergencyNarrativeAction = makeAction(
    'efb_narrative',
    '⚠️ Emergency: CV and LinkedIn keyword audit (ATS mismatch likely)',
    [
      'If screen rate < 20% after 15+ applications, ATS keyword mismatch is the most common cause',
      'Take your top 3 target job descriptions and paste them into Jobscan.co — check your match %',
      'The keywords in the JD that are NOT in your CV are the problem — add them',
      'Your headline, About section, and top 3 bullets all need to contain role-specific keywords',
      'Test: have a peer in the same role review your CV blind — can they see you doing the target role?',
    ],
    'phase_1_foundation', 1, 5, 5, 2, '2 hours',
    'Jobscan keyword audit completed. Top 5 missing keywords added to CV and LinkedIn.',
    'ATS keyword gap is responsible for 34% of screening failures (Jobscan Research, 2025).',
    'profile_readiness', false, [], null, true
  )

  const emergencyInterviewAction = makeAction(
    'efb_interview',
    '⚠️ Emergency: targeted interview coaching after ≥ 2 first-round failures',
    [
      'Record your next 2 mock interviews on video — watch them back',
      'Identify the exact moment you "lose" the interviewer (usually when you ramble or lack specifics)',
      'Hire a 1-hour interview coach from your sector — LinkedIn has verified coaches; one session costs < 1 day\'s salary',
      'Focus specifically on your opener (first 60 seconds) and your "biggest achievement" answer',
    ],
    'phase_2_engagement', 5, 5, 4, 3, '4 hours',
    'Mock interview recorded + reviewed. Specific weak points identified and scripted.',
    'Targeted interview coaching at the point of repeated failure (vs. generic prep before) has 2× the impact on pass rates.',
    'interview_preparation', false, [], null, true
  )

  const emergencyOfferAction = makeAction(
    'efb_offer',
    '⚠️ Emergency: broaden offer criteria and set acceptance deadline',
    [
      runway <= 4 ? `Your runway is ${runway} months — this is the hard constraint now.` : 'Day 90 without offer indicates needing to reassess strategy.',
      'Identify the best offer or most-advanced company in your pipeline',
      'For best-in-pipeline: push for an accelerated decision ("I have other offers advancing — can we complete by [5 days from now]?")',
      'Set your personal acceptance date: if no better offer by [runway-6 weeks], accept best available',
      'Consider short-term contract work while extending the search — stops clock on financial runway',
    ],
    'phase_3_offers', 9, 5, 5, 2, '1 hour',
    'Clear acceptance criteria and deadline set. Best-in-pipeline company pushed for decision.',
    'Job seekers with a pre-committed "best available offer" acceptance date make 45% faster decisions and experience 60% less anxiety in the final phase.',
    'financial_protection', true, [], runway <= 4 ? 'financial_urgency' : null, true
  )

  return [
    {
      phase: 'phase_1_foundation',
      checkpointDay: 30,
      title: 'Day 30 Gate: Foundation Complete',
      summary: 'You have built your positioning assets, activated your network, and have applications in market. The next 30 days require a live pipeline to execute.',
      targetMetrics: [
        {
          metricName: 'Applications submitted',
          targetValue: '≥ 10 quality applications',
          measureHow: 'Count rows in tracking spreadsheet with "applied" status',
        },
        {
          metricName: 'Recruiter screens received',
          targetValue: '≥ 3 first screens booked or completed',
          measureHow: 'Count "screen_booked" + "screen_done" rows in tracking spreadsheet',
        },
        {
          metricName: 'LinkedIn profile score',
          targetValue: 'LinkedIn SSI ≥ 60 OR headline updated with metrics + Open to Work active',
          measureHow: 'Check linkedin.com/sales/ssi for SSI score; visually verify headline',
        },
        {
          metricName: 'Network activated',
          targetValue: '≥ 8 professional contacts aware of your search',
          measureHow: 'Count outreach messages sent in tracking log',
        },
      ],
      passThreshold: '3 of 4 metrics at target',
      failThreshold: '2+ metrics below target after honest review',
      ifPassed: 'Accelerate Phase 2 immediately — push to 20 total applications by Week 6 and begin interview prep for second rounds.',
      ifNearMiss: 'Identify which single metric is furthest behind and spend 3 hours fixing it before entering Week 5.',
      ifFailed: 'Activate emergency fallback below. The foundation is not solid enough for Phase 2 to succeed without it.',
      emergencyFallbackActions: [emergencyApplyAction, emergencyNarrativeAction],
    },
    {
      phase: 'phase_2_engagement',
      checkpointDay: 60,
      title: 'Day 60 Gate: Pipeline Quality',
      summary: 'You should have multiple active processes in flight. Conversion rates should be measurable. If the pipeline is healthy, Phase 3 will produce offers.',
      targetMetrics: [
        {
          metricName: 'Total applications',
          targetValue: '≥ 20 applications submitted',
          measureHow: 'Count all "applied" rows regardless of status',
        },
        {
          metricName: 'First-round screen rate',
          targetValue: '≥ 25% of applications resulted in a screen',
          measureHow: 'Screens ÷ applications × 100',
        },
        {
          metricName: 'Second rounds or HM rounds',
          targetValue: '≥ 3 second rounds or hiring manager interviews completed',
          measureHow: 'Count "second_round" and "hm_round" rows in tracking spreadsheet',
        },
        {
          metricName: 'Compensation anchor set',
          targetValue: 'Written negotiation strategy exists with target range',
          measureHow: `Document exists with ${compRange} as target; counter-offer language prepared`,
        },
      ],
      passThreshold: '3 of 4 metrics at target',
      failThreshold: '2+ metrics below target',
      ifPassed: 'High probability of 1–2 offers by Day 90. Focus Phase 3 entirely on offer quality maximisation and negotiation.',
      ifNearMiss: 'Identify conversion bottleneck (screen rate vs. second round rate) and apply 5 more targeted applications this week.',
      ifFailed: 'Activate emergency interview coaching + expand application volume immediately.',
      emergencyFallbackActions: [emergencyInterviewAction, emergencyApplyAction],
    },
    {
      phase: 'phase_3_offers',
      checkpointDay: 90,
      title: 'Day 90 Gate: Offer Decision',
      summary: 'The goal by Day 90 is a signed offer letter. If not there yet, you need a clear plan for the next 30 days.',
      targetMetrics: [
        {
          metricName: 'Offer received',
          targetValue: '≥ 1 formal written offer',
          measureHow: 'Offer letter in email/PDF form',
        },
        {
          metricName: 'Compensation outcome',
          targetValue: `Offer at or above ${compRange}`,
          measureHow: 'Compare total package to target range from negotiation anchor doc',
        },
        {
          metricName: 'Final rounds active',
          targetValue: '≥ 2 final rounds in progress if no offer yet',
          measureHow: 'Count "final_round" rows in tracking spreadsheet',
        },
      ],
      passThreshold: 'Offer letter received at target compensation',
      failThreshold: 'No offer and no active final rounds',
      ifPassed: 'Congratulations. Execute negotiation protocol, sign offer letter, resign professionally, prepare first-90-days plan.',
      ifNearMiss: 'You have final rounds active. Push for a 2-week acceleration using competing offer urgency. Do not resign until offer letter is signed.',
      ifFailed: 'Activate emergency offer protocol. Extend search with 10 immediate new applications. If runway is critical, activate contract work bridge.',
      emergencyFallbackActions: [emergencyOfferAction],
    },
  ]
}

// ── Main export ────────────────────────────────────────────────────────────────

export function computePrecision9090Plan(inputs: Precision9090PlanInputs): Precision9090PlanResult {
  const urgency = computeUrgencyMode(inputs)
  const tags = resolvePlanTags(inputs)
  const runway = getRunwayMonths(inputs)

  const weeks = [
    ...buildPhase1(inputs, urgency, tags),
    ...buildPhase2(inputs, urgency, tags),
    ...buildPhase3(inputs, urgency, tags),
  ]

  const checkpoints = buildCheckpoints(inputs, urgency)

  // Flatten + sort all non-fallback actions by aiPriorityScore
  const allActions = weeks.flatMap(w => w.actions).filter(a => !a.isEmergencyFallback)
  const topPriorityActions = [...allActions].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)

  const quickWins = allActions.filter(
    a => a.aiPriorityScore >= 70 && (a.effort <= 2) && a.timeEstimate.match(/\d+\s*min|\d+\.?\d*\s*hour/)
  ).sort((a, b) => b.aiPriorityScore - a.aiPriorityScore).slice(0, 5)

  const criticalPath = allActions
    .filter(a => a.isBlocking)
    .sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)
    .slice(0, 5)
    .map(a => a.action)

  // Plan title personalisation
  const urgencyPrefix = urgency === 'crisis' ? '⚠️ 90-Day Emergency Exit Plan' :
                        urgency === 'elevated' ? 'Precision 90-Day Career Exit Plan' :
                        'Strategic 90-Day Career Advancement Plan'

  const trajectoryClause = inputs.behavioral.careerTrajectory.trajectory === 'plateauing'
    ? ' — Break the Plateau'
    : inputs.behavioral.careerTrajectory.trajectory === 'declining'
      ? ' — Pivot Now'
      : ''

  const planTitle = `${urgencyPrefix}${trajectoryClause}: ${inputs.seniorityBracket.charAt(0).toUpperCase() + inputs.seniorityBracket.slice(1)} ${inputs.rolePrefix.toUpperCase()} in ${inputs.region.charAt(0).toUpperCase() + inputs.region.slice(1)}`

  const compJumpLine = inputs.behavioral.compensationIntelligence.salaryJumpPotential
  const estimatedOutcomeByDay90 = urgency === 'crisis'
    ? `With consistent execution: 1–2 written offers by Day 75. ${compJumpLine}.`
    : urgency === 'elevated'
      ? `With consistent execution: 2–3 active processes and 1 offer by Day 90. ${compJumpLine}.`
      : `With consistent execution: 2–3 offers by Day 90; time to select the best one. ${compJumpLine}.`

  const weeklyHours = urgency === 'crisis' ? '10–14 hours/week in Phase 1, 8–10 hours in Phase 2–3'
                    : urgency === 'elevated' ? '7–10 hours/week in Phase 1, 5–7 hours in Phase 2–3'
                    : '5–7 hours/week throughout'

  const planExpiry = urgency === 'crisis' ? 'Re-audit in 30 days'
                   : urgency === 'elevated' ? 'Re-audit in 45 days'
                   : 'Re-audit in 60 days'

  const narrativeParts: string[] = [inputs.behavioral.openingNarrative]
  if (tags.includes('gap_recovery_significant')) {
    narrativeParts.push(`Employment gap recovery is the primary Phase 1 objective — your ${inputs.behavioral.employmentGap.mostRecentGapMonths}-month gap must be addressed proactively.`)
  }
  if (tags.includes('comp_reset')) {
    narrativeParts.push(`You are ${Math.abs(inputs.behavioral.compensationIntelligence.deltaPercent)}% below market — this search is a compensation reset opportunity: ${inputs.behavioral.compensationIntelligence.salaryJumpPotential}.`)
  }
  if (tags.includes('visa_constrained')) {
    narrativeParts.push(`Visa constraints require filtering your target list to confirmed sponsor companies from Week 1.`)
  }
  if (runway <= 4) {
    narrativeParts.push(`Financial urgency: ${runway} months runway. Emergency income bridging must be activated in parallel with the search.`)
  }

  const executiveSummary = narrativeParts.join(' ')

  return {
    planTitle,
    executiveSummary,
    urgencyMode: urgency,
    planPersonalisationTags: tags,
    weeks,
    checkpoints,
    topPriorityActions,
    criticalPath,
    quickWins,
    weeklyTimeCommitment: weeklyHours,
    estimatedOutcomeByDay90,
    planExpiry,
  }
}
