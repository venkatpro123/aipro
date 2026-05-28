/**
 * behavioralPersonalizationEngine.ts — v50.0
 *
 * THE PROBLEM THIS SOLVES:
 *   Two users share the same role, seniority, and risk score. One has been at
 *   the same company for 7 years with no promotion, a 6-month employment gap
 *   in 2022, and is 22% below market compensation. The other has been promoted
 *   twice in 4 years, no gaps, and is 15% above market.
 *
 *   Previous engine: identical action plan for both.
 *   This engine: radically different plans based on career behavioral signals.
 *
 * WHAT THIS ENGINE ANALYSES:
 *   1. Employment gaps — narrative framing, recovery strategy, interview prep
 *   2. Career trajectory — ascending / plateauing / declining
 *   3. Compensation market position — under / at / over market
 *   4. Company type transition dynamics — startup→enterprise, enterprise→startup
 *   5. Interview readiness score — how ready is the user for active search?
 *   6. Competitive positioning — where they rank vs. peers applying to same roles
 *   7. Risk tolerance calibration — conservative / moderate / aggressive strategy
 *
 * OUTPUT:
 *   BehavioralPersonalizationResult — a rich signal object consumed by:
 *   - monthlyActionPlanEngine (action selection + ordering)
 *   - precision9090PlanEngine (weekly execution priorities)
 *   - negotiationIntelligenceService (leverage + script selection)
 *   - jobTargetingEngine (match scoring + approach strategy)
 *   - scenarioNarrativeEngine (brief tone + framing)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CareerTrajectory =
  | 'ascending'       // Promoted, increasing scope, salary growth > inflation
  | 'plateauing'      // Same title/scope 2+ years, below-inflation comp growth
  | 'declining'       // Reduced scope, lateral moves down, comp compression
  | 'resetting'       // Career change in progress (by choice or by force)
  | 'early'           // <2 years in field; trajectory not yet determinable

export type CompensationPosition =
  | 'significantly_under'  // >20% below market band for role+region+seniority
  | 'under_market'         // 10–20% below
  | 'at_market'            // ±10% of market midpoint
  | 'above_market'         // 10–25% above
  | 'significantly_above'  // >25% above market (retention risk signal)
  | 'unknown'

export type CompanyTypeDynamic =
  | 'enterprise_to_enterprise'   // Lateral complexity; culture fit emphasis
  | 'enterprise_to_startup'      // Risk/autonomy narrative required
  | 'startup_to_enterprise'      // Process maturity narrative required
  | 'startup_to_startup'         // Speed/ownership framing natural
  | 'consulting_to_industry'     // "Ownership" narrative required
  | 'industry_to_consulting'     // Client management framing required
  | 'unknown_transition'

export type InterviewReadinessLevel =
  | 'fully_ready'       // Resume updated, portfolio live, active practice
  | 'mostly_ready'      // Minor gaps in materials or recent practice
  | 'needs_preparation' // Significant gaps in materials or confidence
  | 'not_ready'         // Resume/portfolio outdated, no recent practice

export type RiskToleranceProfile =
  | 'conservative'   // Prioritise stability, known entities, lower-risk moves
  | 'moderate'       // Balanced between growth and security
  | 'aggressive'     // Willing to take stretch roles, salary risk, pivots

export interface EmploymentGapAnalysis {
  hasGap: boolean
  totalGapMonths: number
  mostRecentGapMonths: number  // most recent gap only
  gapSeverity: 'none' | 'minor' | 'moderate' | 'significant'
  // 'minor' = 1–3 months | 'moderate' = 3–6 months | 'significant' = >6 months
  narrativeFrame: string        // How to frame this in interviews
  recoveryActions: string[]     // Specific actions to address the gap
  interviewScript: string       // Exact language to use when asked
  timeToNeutralise: string      // "The gap becomes neutral after 2 strong recent roles"
  riskToSearch: 'low' | 'medium' | 'high'  // How much it affects hiring probability
}

export interface CareerTrajectoryAnalysis {
  trajectory: CareerTrajectory
  label: string                  // Human-readable label
  insight: string                // What this means for the job search
  urgentAction: string           // The one action that most improves trajectory signals
  positioningAdvice: string      // How to frame the trajectory in interviews/profile
  trajectoryScore: number        // 0–100: 100 = accelerating rocket, 0 = stalled
  yearsAtCurrentLevel: number    // How long without meaningful progression
  promotionVelocity: string      // "1 promotion per 2.3 years" or "No promotion in 4 years"
}

export interface CompensationIntelligence {
  position: CompensationPosition
  marketMidpoint: string         // "₹45L" or "$180K" for role+region+seniority
  estimatedCurrentBand: string   // Estimated band based on role inputs
  deltaPercent: number           // % above/below market (negative = below)
  searchImplication: string      // What this means for the job search approach
  negotiationImplication: string // How this affects negotiation leverage
  targetCompRange: string        // What to target in job search (10–20% above market)
  salaryJumpPotential: string    // "You could realistically target 25–35% increase"
}

export interface InterviewReadinessAssessment {
  level: InterviewReadinessLevel
  score: number                   // 0–100
  gapAreas: InterviewReadinessGap[]
  estimatedPrepTime: string       // "8–12 hours to get to ready"
  quickWins: string[]             // 2–3 things completable in < 1 hour each
  priorityGaps: string[]          // The 2 gaps that most affect hiring probability
}

export interface InterviewReadinessGap {
  area: 'resume' | 'linkedin' | 'portfolio' | 'technical_prep' | 'behavioural_prep' | 'references' | 'cover_letter'
  severity: 'minor' | 'moderate' | 'critical'
  specificAction: string  // Exactly what to do
  timeEstimate: string    // "30 minutes"
}

export interface CompetitivePeerPositioning {
  percentileEstimate: number     // 0–100: estimated ranking vs. peers applying to same roles
  strengthsVsPeers: string[]     // 2–3 genuine advantages
  weaknessesVsPeers: string[]    // 1–2 honest gaps
  differentiatorStatement: string // 1-sentence unique positioning for interviews
  competitiveThreat: string      // Main profile type competing against user
  winRateEstimate: string        // "You win ~1 in 4 final rounds at target companies"
}

export interface CompanyTransitionStrategy {
  dynamic: CompanyTypeDynamic
  narrativeRequired: string       // The story the user must tell in interviews
  potentialObjections: string[]   // What interviewers will push back on
  objectionResponses: string[]    // How to handle each objection
  cultureRiskWarning: string | null // "Startup speed may be jarring after 8yr at enterprise"
  targetCompanyScreenFilter: string // Which companies to prioritise given the transition
}

export interface BehavioralPersonalizationInputs {
  // Career basics
  tenureYears: number
  totalExperienceYears: number
  seniorityBracket: 'junior' | 'mid' | 'senior' | 'principal'
  workTypeKey: string
  rolePrefix: string
  industry: string
  region: string

  // Compensation signals
  currentMonthlySalaryLocal?: number | null
  localCurrencyCode?: string
  annualSalaryUsd?: number | null    // Used for market comparison if available

  // Career history signals
  employmentGapMonths?: number | null       // Total gap months in last 3 years
  yearsAtCurrentTitle?: number | null       // How long in current title without promotion
  numberOfJobsLast5Years?: number | null    // Job-hopping signal (>4 = flag)
  numberOfPromotionsLast5Years?: number | null

  // Company type signals
  currentCompanyType?: 'startup' | 'mid' | 'large' | 'mega' | null
  targetCompanyType?: 'startup' | 'mid' | 'large' | 'mega' | 'any' | null

  // Profile readiness signals (from user-reported or inferred)
  resumeLastUpdatedMonths?: number | null   // How many months since last update
  hasPortfolio?: boolean | null             // GitHub / design portfolio / case studies
  hasRecentInterviewPractice?: boolean | null  // Practiced in last 3 months
  linkedinCompletionPct?: number | null     // 0–100 LinkedIn profile completion

  // Contextual signals (from existing pipeline layers)
  compositeScore: number
  careerGoal?: 'stay_and_grow' | 'strategic_exit' | 'emergency_exit' | 'explore' | null
  aiDisruptionRisk?: number | null          // 0–1 from roleExposureData
  skillPortfolioScore?: number | null       // 0–100 from skillFusionEngine
  performanceTier?: 'top' | 'average' | 'below' | 'unknown'
  visaStatus?: string | null
  hasDependents?: boolean | null
  runwayMonths?: number | null
}

export interface BehavioralPersonalizationResult {
  employmentGap: EmploymentGapAnalysis
  careerTrajectory: CareerTrajectoryAnalysis
  compensationIntelligence: CompensationIntelligence
  interviewReadiness: InterviewReadinessAssessment
  competitivePositioning: CompetitivePeerPositioning
  companyTransition: CompanyTransitionStrategy
  riskTolerance: RiskToleranceProfile
  riskToleranceRationale: string

  // Synthesised signals for downstream consumers
  /** Primary narrative to inject into action plans — personalises the framing */
  openingNarrative: string
  /** The single most important thing this user needs to fix before starting search */
  topBlocker: string
  /** How many weeks before this user should be in active applications */
  weeksToSearchReady: number
  /** Concise profile of who this person is vs. the job market right now */
  profileSummary: string
}

// ── Compensation market benchmarks (role + region + seniority) ────────────────
// Midpoints derived from Naukri Salary Insights, LinkedIn Salary, Levels.fyi, Glassdoor
// Updated Q1 2026. Stored as annual USD-equivalent for normalisation.

interface CompBenchmark {
  junior: number   // USD/year
  mid: number
  senior: number
  principal: number
}

const COMP_BENCHMARKS_USD: Record<string, Record<string, CompBenchmark>> = {
  india: {
    sw:     { junior: 14000, mid: 26000, senior: 45000, principal: 80000 },
    sw_backend: { junior: 13000, mid: 24000, senior: 42000, principal: 75000 },
    ml_engineer: { junior: 18000, mid: 35000, senior: 65000, principal: 120000 },
    ds:     { junior: 12000, mid: 22000, senior: 40000, principal: 70000 },
    pm:     { junior: 11000, mid: 22000, senior: 42000, principal: 78000 },
    fin:    { junior: 9000,  mid: 18000, senior: 35000, principal: 65000 },
    hc:     { junior: 5000,  mid: 9000,  senior: 16000, principal: 28000 },
    legal:  { junior: 10000, mid: 20000, senior: 40000, principal: 75000 },
    mkt:    { junior: 7000,  mid: 14000, senior: 26000, principal: 50000 },
    ops:    { junior: 7000,  mid: 14000, senior: 26000, principal: 48000 },
    cons:   { junior: 12000, mid: 22000, senior: 40000, principal: 80000 },
    design: { junior: 8000,  mid: 15000, senior: 28000, principal: 55000 },
    bpo:    { junior: 4000,  mid: 7000,  senior: 12000, principal: 22000 },
    ind:    { junior: 6000,  mid: 11000, senior: 18000, principal: 32000 },
    sec_analyst: { junior: 12000, mid: 22000, senior: 40000, principal: 70000 },
    hr_analyst:  { junior: 6000,  mid: 12000, senior: 22000, principal: 40000 },
    default: { junior: 8000, mid: 16000, senior: 30000, principal: 55000 },
  },
  us: {
    sw:     { junior: 90000,  mid: 145000, senior: 210000, principal: 320000 },
    sw_backend: { junior: 85000, mid: 140000, senior: 200000, principal: 300000 },
    ml_engineer: { junior: 110000, mid: 175000, senior: 260000, principal: 400000 },
    ds:     { junior: 80000,  mid: 130000, senior: 190000, principal: 280000 },
    pm:     { junior: 80000,  mid: 135000, senior: 195000, principal: 290000 },
    fin:    { junior: 70000,  mid: 115000, senior: 170000, principal: 260000 },
    hc:     { junior: 60000,  mid: 90000,  senior: 130000, principal: 200000 },
    legal:  { junior: 85000,  mid: 140000, senior: 210000, principal: 340000 },
    mkt:    { junior: 55000,  mid: 88000,  senior: 130000, principal: 200000 },
    ops:    { junior: 55000,  mid: 88000,  senior: 130000, principal: 200000 },
    cons:   { junior: 90000,  mid: 150000, senior: 220000, principal: 380000 },
    design: { junior: 65000,  mid: 105000, senior: 155000, principal: 240000 },
    sec_analyst: { junior: 80000, mid: 130000, senior: 195000, principal: 290000 },
    default: { junior: 70000, mid: 115000, senior: 170000, principal: 260000 },
  },
  uk: {
    sw:     { junior: 45000, mid: 72000, senior: 105000, principal: 160000 },
    ml_engineer: { junior: 55000, mid: 90000, senior: 135000, principal: 200000 },
    ds:     { junior: 40000, mid: 65000, senior: 95000,  principal: 145000 },
    pm:     { junior: 42000, mid: 68000, senior: 100000, principal: 155000 },
    fin:    { junior: 45000, mid: 72000, senior: 110000, principal: 175000 },
    cons:   { junior: 50000, mid: 80000, senior: 120000, principal: 200000 },
    default: { junior: 38000, mid: 62000, senior: 92000, principal: 140000 },
  },
  singapore: {
    sw:     { junior: 48000, mid: 78000, senior: 115000, principal: 175000 },
    ml_engineer: { junior: 58000, mid: 95000, senior: 145000, principal: 220000 },
    fin:    { junior: 50000, mid: 85000, senior: 130000, principal: 210000 },
    default: { junior: 42000, mid: 70000, senior: 105000, principal: 165000 },
  },
  default: {
    default: { junior: 20000, mid: 38000, senior: 65000, principal: 110000 },
  },
}

// ── PPP-adjusted currency labels ───────────────────────────────────────────────
// Approximate annual equivalent in local currency for display
const CURRENCY_LABEL_MAP: Record<string, { symbol: string; usdFactor: number; unit: string }> = {
  INR: { symbol: '₹', usdFactor: 83.5, unit: 'L/yr' },    // divide by 100000 to get lakhs
  USD: { symbol: '$', usdFactor: 1.0,  unit: 'K/yr' },    // divide by 1000 to get K
  GBP: { symbol: '£', usdFactor: 0.79, unit: 'K/yr' },
  SGD: { symbol: 'S$', usdFactor: 1.35, unit: 'K/yr' },
  AUD: { symbol: 'A$', usdFactor: 1.52, unit: 'K/yr' },
  EUR: { symbol: '€', usdFactor: 0.92, unit: 'K/yr' },
  CAD: { symbol: 'CA$', usdFactor: 1.36, unit: 'K/yr' },
}

function formatCompAsLocal(usdAnnual: number, currencyCode: string): string {
  const info = CURRENCY_LABEL_MAP[currencyCode?.toUpperCase()]
  if (!info) return `$${Math.round(usdAnnual / 1000)}K`
  const local = usdAnnual * info.usdFactor
  if (info.unit === 'L/yr') {
    const lakhs = local / 100000
    return `${info.symbol}${lakhs.toFixed(1)}L`
  }
  return `${info.symbol}${Math.round(local / 1000)}K`
}

// ── Benchmark resolver ────────────────────────────────────────────────────────

function getBenchmarkUsd(inputs: BehavioralPersonalizationInputs): CompBenchmark | null {
  const regionKey = normaliseRegion(inputs.region)
  const regionBenchmarks = COMP_BENCHMARKS_USD[regionKey] ?? COMP_BENCHMARKS_USD['default']
  return (
    regionBenchmarks[inputs.workTypeKey]
    ?? regionBenchmarks[inputs.rolePrefix]
    ?? regionBenchmarks['default']
    ?? COMP_BENCHMARKS_USD['default']['default']
  )
}

function normaliseRegion(region: string): string {
  const r = (region ?? '').toLowerCase()
  if (r === 'in' || r === 'india') return 'india'
  if (r === 'us' || r === 'usa' || r === 'united states') return 'us'
  if (r === 'uk' || r === 'gb' || r === 'united kingdom') return 'uk'
  if (r === 'sg' || r === 'singapore') return 'singapore'
  return 'default'
}

function getSeniorityUsd(benchmark: CompBenchmark, seniority: BehavioralPersonalizationInputs['seniorityBracket']): number {
  switch (seniority) {
    case 'junior': return benchmark.junior
    case 'mid': return benchmark.mid
    case 'senior': return benchmark.senior
    case 'principal': return benchmark.principal
  }
}

// ── Employment Gap Analysis ───────────────────────────────────────────────────

function analyseEmploymentGap(inputs: BehavioralPersonalizationInputs): EmploymentGapAnalysis {
  const totalGapMonths = inputs.employmentGapMonths ?? 0
  const mostRecentGapMonths = Math.min(totalGapMonths, 12) // cap at 12 for display

  if (totalGapMonths === 0) {
    return {
      hasGap: false,
      totalGapMonths: 0,
      mostRecentGapMonths: 0,
      gapSeverity: 'none',
      narrativeFrame: 'Continuous employment — no gap narrative required.',
      recoveryActions: [],
      interviewScript: '',
      timeToNeutralise: 'N/A — no gap present.',
      riskToSearch: 'low',
    }
  }

  let gapSeverity: EmploymentGapAnalysis['gapSeverity']
  let narrativeFrame: string
  let recoveryActions: string[]
  let interviewScript: string
  let timeToNeutralise: string
  let riskToSearch: EmploymentGapAnalysis['riskToSearch']

  if (totalGapMonths <= 3) {
    gapSeverity = 'minor'
    narrativeFrame = 'A short gap (1–3 months) is entirely normal and rarely asked about by interviewers at the senior level. Frame as deliberate recharging or targeted search.'
    recoveryActions = [
      'Ensure LinkedIn shows your most recent role end date clearly — ambiguity is worse than transparency',
      'Add any consulting, freelance, or open-source work done during the gap to your LinkedIn (even 1 project removes the awkward blank)',
      'Prepare a 1-sentence response that is calm and confident — interviewers take their cue from your energy about gaps',
    ]
    interviewScript = '"After [X company], I took a short intentional break to [recharge / research the market thoroughly / spend time with family]. I used that time to [1 specific thing you did]. I\'m now focused and actively looking for the right role, which is why this opportunity is particularly interesting to me."'
    timeToNeutralise = 'Already minimal — 1 strong recent role makes this invisible.'
    riskToSearch = 'low'
  } else if (totalGapMonths <= 6) {
    gapSeverity = 'moderate'
    narrativeFrame = 'A 3–6 month gap requires a brief, confident explanation but is very manageable. Most interviewers accept it without pushback if the candidate is prepared and unbothered.'
    recoveryActions = [
      'Add 1 substantive activity during the gap to your LinkedIn: freelance consulting, volunteer work, online course (with certificate), or caregiving (which is widely understood and respected)',
      'If the gap was involuntary (layoff, health, family): be direct about it. Vagueness invites speculation. "I was laid off in a company restructuring" is entirely sufficient — interviewers hear this every day.',
      'Prepare a 2-sentence explanation that ends on forward momentum, not past justification',
      'Your references should be briefed — ensure they can speak to your performance and character without hesitation if called',
    ]
    interviewScript = '"After [X company], I spent [N months] [brief true explanation: targeted job search / family care / health recovery / freelancing / upskilling in X]. During that time I [1 tangible thing]. I\'m now fully focused on [type of role] and ready to bring [specific value] immediately."'
    timeToNeutralise = 'Landing the next role makes this gap history. After 12 months in a new role, it will not be mentioned in interviews.'
    riskToSearch = 'medium'
  } else {
    gapSeverity = 'significant'
    narrativeFrame = 'A gap over 6 months requires a prepared, confident narrative. Without one, ATS filters and first-round screeners will flag it. The key is proactive explanation + demonstrated activity during the gap.'
    recoveryActions = [
      'PRIORITY: Add a consulting or freelance entry on LinkedIn during the gap period — even "Independent Consultant" with 1–2 project descriptions removes the blank without being dishonest',
      'If you completed any course, certification, or project during the gap: display it prominently in your LinkedIn "Activity" and experience section',
      'Consider a referral-first search strategy: referred candidates face less ATS friction because a human vouches for them upfront',
      'Target companies that specifically value the thing that caused your gap: caregivers are highly valued in healthcare, health-related EdTech, and family-oriented companies',
      'Brief your references now — they need to know the gap narrative so their answers are consistent with yours',
      'Apply to roles where you would be a strong profile fit, not just any open role — a strong fit candidate with a gap beats a weak-fit candidate without one',
    ]
    interviewScript = '"I had an extended period between roles due to [brief true reason: personal health, family responsibilities, pursuing an independent project, a planned career transition period]. During that time, I [most substantive activity done]. I\'ve used the time to [specific thing that makes you stronger now], and I\'m now actively looking for [specific type of role] because [genuine reason this role is the right next step for you]."'
    timeToNeutralise = 'A strong next role in the right function neutralises this within 12 months. Two consecutive strong roles makes the gap invisible in background checks and interviews.'
    riskToSearch = 'high'
  }

  return {
    hasGap: true,
    totalGapMonths,
    mostRecentGapMonths,
    gapSeverity,
    narrativeFrame,
    recoveryActions,
    interviewScript,
    timeToNeutralise,
    riskToSearch,
  }
}

// ── Career Trajectory Analysis ────────────────────────────────────────────────

function analyseCareerTrajectory(inputs: BehavioralPersonalizationInputs): CareerTrajectoryAnalysis {
  const yearsAtLevel = inputs.yearsAtCurrentTitle ?? 0
  const promos = inputs.numberOfPromotionsLast5Years ?? null
  const jobs5yr = inputs.numberOfJobsLast5Years ?? null
  const exp = inputs.totalExperienceYears

  let trajectory: CareerTrajectory
  let trajectoryScore: number
  let label: string
  let insight: string
  let urgentAction: string
  let positioningAdvice: string
  let promotionVelocity: string

  // Early career — too little history to classify
  if (exp < 2) {
    return {
      trajectory: 'early',
      label: 'Early career',
      insight: 'You are still building your first strong professional record. The goal right now is depth in one area and strong measurable contributions, not breadth.',
      urgentAction: 'Focus on shipping one significant, measurable outcome at your current role before activating external search — it dramatically improves your narrative.',
      positioningAdvice: 'Emphasise learning velocity and early wins over experience length. Hiring managers at growth companies value high-potential over legacy tenure.',
      trajectoryScore: 60,
      yearsAtCurrentLevel: yearsAtLevel,
      promotionVelocity: 'N/A — early career',
    }
  }

  // Job hopping signal
  if (jobs5yr !== null && jobs5yr >= 5) {
    trajectory = 'resetting'
    trajectoryScore = 40
    label = 'High mobility — stability narrative needed'
    insight = `You have held ${jobs5yr} roles in 5 years. This signals either industry disruption, a deliberate reset, or poor role fit. Without a clear narrative, hiring managers will probe for "flight risk." The goal is to explain the pattern and demonstrate that THIS role is the right landing point.`
    urgentAction = 'Build a clear "why this role is right for me NOW" narrative that explains the pattern coherently — without it, every interview will spend 30% of the time on this question.'
    positioningAdvice = 'Frame the breadth as deliberate exploration followed by a clear landing conclusion. "I\'ve now found the intersection of X and Y that suits me — this role sits exactly at that intersection." Avoid mentioning company names; focus on what you learned.'
    promotionVelocity = `${jobs5yr} roles in 5 years (high mobility)`
    return { trajectory, label, insight, urgentAction, positioningAdvice, trajectoryScore, yearsAtCurrentLevel: yearsAtLevel, promotionVelocity }
  }

  // Promotion velocity calculation
  if (promos !== null && promos >= 2) {
    const avgPromoYears = 5 / promos
    promotionVelocity = `1 promotion per ${avgPromoYears.toFixed(1)} years (strong)`
    trajectory = 'ascending'
    trajectoryScore = 82 + Math.min(15, promos * 4)
    label = 'Ascending trajectory'
    insight = `You have been promoted ${promos} times in 5 years — this is a strong signal that employers assess you as a high-performer. Your profile will attract competitive attention. The risk is that interviewers will probe for "what comes next" — you need a clear answer.`
    urgentAction = 'Define your next title clearly and target companies where that title is a natural step — don\'t let the ambiguity of "what comes next" slow your search.'
    positioningAdvice = 'Lead with promotion velocity in your LinkedIn headline and resume summary. "Promoted 3× in 4 years at [Company]" is stronger than any skills list.'
  } else if (promos === 1 || (promos === null && yearsAtLevel < 3)) {
    promotionVelocity = promos === 1 ? '1 promotion in 5 years (moderate)' : 'Trajectory developing'
    trajectory = 'plateauing'
    trajectoryScore = 55
    label = 'Steady with plateauing risk'
    insight = `Your trajectory shows solid but not accelerating growth. At ${inputs.seniorityBracket} level with ${yearsAtLevel.toFixed(1)} years at current title, the market will ask "why not a promotion?" Be ready with an honest answer.`
    urgentAction = 'Identify and execute one high-visibility project at your current company before starting external search — a promotion or expanded scope in the next 3 months dramatically changes your market value.'
    positioningAdvice = 'Position yourself as a "builder" — you were in a stable role by choice (or describe the specific contribution you owned). Depth over breadth narrative works here.'
  } else if (yearsAtLevel >= 4 && (promos === 0 || promos === null)) {
    promotionVelocity = `No promotion in ${yearsAtLevel.toFixed(0)} years (plateaued)`
    trajectory = 'plateauing'
    trajectoryScore = 35
    label = 'Plateaued — urgency to exit'
    insight = `You have been at the same level for ${yearsAtLevel.toFixed(0)} years without promotion. This is the #1 signal interviewers use to probe "Were they not capable of growth, or was it the environment?" You need a compelling answer and ideally an external data point (certification, side project, public contribution) that signals active development.`
    urgentAction = 'Ship one visible external output — a GitHub project, a published article, a certification — that shows active growth independent of employer. This counteracts the plateau signal immediately.'
    positioningAdvice = 'Do NOT frame the lack of promotion as the company\'s fault. Instead: "I chose to go deep in [area] rather than pursue title progression — I have now built the depth I wanted and I am looking for the right environment to grow into [next level]."'
  } else {
    promotionVelocity = 'Within normal range for seniority'
    trajectory = 'ascending'
    trajectoryScore = 65
    label = 'Steady growth trajectory'
    insight = 'Your trajectory is within normal range for your seniority. No red flags — the focus is on positioning your strongest contributions effectively.'
    urgentAction = 'Quantify your 3 most impactful contributions with numbers before starting external search — this converts a "normal" trajectory into a "high-impact" one in hiring contexts.'
    positioningAdvice = 'Let the numbers tell the story. A steady trajectory + strong metrics is a more credible narrative than a rapid one with vague claims.'
  }

  return {
    trajectory,
    label,
    insight,
    urgentAction,
    positioningAdvice,
    trajectoryScore,
    yearsAtCurrentLevel: yearsAtLevel,
    promotionVelocity,
  }
}

// ── Compensation Intelligence ─────────────────────────────────────────────────

function analyseCompensation(inputs: BehavioralPersonalizationInputs): CompensationIntelligence {
  const benchmark = getBenchmarkUsd(inputs)
  const currencyCode = inputs.localCurrencyCode ?? (normaliseRegion(inputs.region) === 'india' ? 'INR' : 'USD')

  if (!benchmark) {
    return {
      position: 'unknown',
      marketMidpoint: 'Not available for this role/region',
      estimatedCurrentBand: 'Unknown',
      deltaPercent: 0,
      searchImplication: 'Salary data unavailable for your specific role/region combination. Use Naukri Salary Insights or Glassdoor to self-validate before negotiating.',
      negotiationImplication: 'Without a market reference, lead with your target number and let the employer respond.',
      targetCompRange: 'Set based on personal research from Naukri/Glassdoor/Levels.fyi',
      salaryJumpPotential: 'Research required before estimating',
    }
  }

  const midpointUsd = getSeniorityUsd(benchmark, inputs.seniorityBracket)
  const currencyInfo = CURRENCY_LABEL_MAP[currencyCode?.toUpperCase()] ?? CURRENCY_LABEL_MAP['USD']
  const midpointLocal = midpointUsd * currencyInfo.usdFactor
  const midpointLabel = formatCompAsLocal(midpointUsd, currencyCode)

  // Estimate current comp from monthly salary input
  let currentAnnualUsd: number | null = null
  if (inputs.currentMonthlySalaryLocal && currencyInfo) {
    const annualLocal = inputs.currentMonthlySalaryLocal * 12
    currentAnnualUsd = annualLocal / currencyInfo.usdFactor
  } else if (inputs.annualSalaryUsd) {
    currentAnnualUsd = inputs.annualSalaryUsd
  }

  let position: CompensationPosition
  let deltaPercent = 0
  let searchImplication: string
  let negotiationImplication: string
  let salaryJumpPotential: string

  if (currentAnnualUsd === null) {
    position = 'unknown'
    searchImplication = 'Share your current compensation in the profile to unlock personalised salary benchmarking.'
    negotiationImplication = 'Without your current salary, negotiation anchoring advice cannot be personalised.'
    salaryJumpPotential = 'Complete your salary profile to see jump potential.'
  } else {
    deltaPercent = ((currentAnnualUsd - midpointUsd) / midpointUsd) * 100

    if (deltaPercent < -20) {
      position = 'significantly_under'
      searchImplication = `You are approximately ${Math.abs(Math.round(deltaPercent))}% below market midpoint for ${inputs.seniorityBracket}-level ${inputs.rolePrefix.toUpperCase()} in ${inputs.region.toUpperCase()}. A job change is your fastest path to market rate — internal corrections of >20% are extremely rare. Start searching now.`
      negotiationImplication = 'At this delta, you have strong justification to target 30–40% above your current salary. Lead with your target number (market rate), not your current salary. Never volunteer current salary first.'
      salaryJumpPotential = `Realistic target: ${Math.round(Math.abs(deltaPercent) + 15)}–${Math.round(Math.abs(deltaPercent) + 25)}% salary increase via job change.`
    } else if (deltaPercent < -10) {
      position = 'under_market'
      searchImplication = `You are approximately ${Math.abs(Math.round(deltaPercent))}% below market. A job change targeting ${Math.round(Math.abs(deltaPercent) + 10)}–${Math.round(Math.abs(deltaPercent) + 15)}% above current salary is very achievable in this market.`
      negotiationImplication = 'You have room to be firm in negotiations — market data supports your ask. Lead with the midpoint: "Based on my research, the market rate for this role is [midpoint]. I\'m targeting [10% above midpoint]."'
      salaryJumpPotential = `Realistic target: ${Math.round(Math.abs(deltaPercent) + 10)}–${Math.round(Math.abs(deltaPercent) + 20)}% salary increase via job change.`
    } else if (deltaPercent <= 10) {
      position = 'at_market'
      searchImplication = 'You are at market rate. A job change can still yield 10–20% improvement if you target companies paying above midpoint or move to a higher-demand sub-specialisation.'
      negotiationImplication = 'At market rate, negotiate on equity, bonus, and scope of role — not base salary, where your leverage is moderate. A competing offer is the strongest lever you have.'
      salaryJumpPotential = 'Realistic target: 10–20% via job change with strong negotiation.'
    } else if (deltaPercent <= 25) {
      position = 'above_market'
      searchImplication = 'You are above market rate. Be selective in your search — target companies known to pay above-band (hyperscalers, VC-backed unicorns, international companies). A lateral move at your current rate requires a strong justification from the employer.'
      negotiationImplication = 'Do NOT lead with your current salary as a baseline — market rate is your anchor. Focus on total comp (equity, bonus). If pressed on current salary, respond: "I\'m targeting [target] based on the scope of this role."'
      salaryJumpPotential = '10–15% via job change is achievable at the right companies; lateral-at-rate is realistic at many.'
    } else {
      position = 'significantly_above'
      searchImplication = `You are approximately ${Math.round(deltaPercent)}% above market midpoint. This is a retention signal (your employer is paying to keep you), but it means job-change offers will often disappoint unless you target hyperscalers or international companies. Consider equity more carefully than base.`
      negotiationImplication = 'Emphasise total comp (TC) in all negotiations — equity upside at high-growth companies can justify a base reduction. Negotiate equity refreshes and acceleration clauses aggressively.'
      salaryJumpPotential = 'Focus on TC growth (equity, bonus) rather than base. Lateral move at current base + equity upside is likely the best outcome.'
    }
  }

  const lowerBand = formatCompAsLocal(midpointUsd * 0.85, currencyCode)
  const upperBand = formatCompAsLocal(midpointUsd * 1.20, currencyCode)
  const targetLow = formatCompAsLocal(midpointUsd * 1.10, currencyCode)
  const targetHigh = formatCompAsLocal(midpointUsd * 1.25, currencyCode)

  return {
    position,
    marketMidpoint: midpointLabel,
    estimatedCurrentBand: `${lowerBand} – ${upperBand}`,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
    searchImplication,
    negotiationImplication,
    targetCompRange: `${targetLow} – ${targetHigh} (target band for job search)`,
    salaryJumpPotential,
  }
}

// ── Interview Readiness Assessment ────────────────────────────────────────────

function assessInterviewReadiness(inputs: BehavioralPersonalizationInputs): InterviewReadinessAssessment {
  const gaps: InterviewReadinessGap[] = []
  let score = 100

  const resumeAge = inputs.resumeLastUpdatedMonths ?? 12
  if (resumeAge > 18) {
    score -= 25
    gaps.push({ area: 'resume', severity: 'critical', specificAction: 'Completely rewrite your resume — this is your single highest-ROI action before anything else. Add metrics to every role.', timeEstimate: '3–4 hours' })
  } else if (resumeAge > 6) {
    score -= 12
    gaps.push({ area: 'resume', severity: 'moderate', specificAction: 'Update your most recent role section with the 3 most impactful contributions and their measurable outcomes.', timeEstimate: '1–2 hours' })
  }

  const linkedinPct = inputs.linkedinCompletionPct ?? 70
  if (linkedinPct < 60) {
    score -= 20
    gaps.push({ area: 'linkedin', severity: 'critical', specificAction: 'Complete your LinkedIn profile to 100%: photo, headline with role+value+domain, summary with your top 3 achievements, and all roles with descriptions.', timeEstimate: '2 hours' })
  } else if (linkedinPct < 85) {
    score -= 8
    gaps.push({ area: 'linkedin', severity: 'moderate', specificAction: 'Add quantified achievements to your most recent 2 roles and update your headline to reflect the role you want, not the title you have.', timeEstimate: '45 minutes' })
  }

  const needsPortfolio = ['sw', 'sw_backend', 'ml_engineer', 'ds', 'design', 'pm', 'mkt'].includes(inputs.rolePrefix)
  if (needsPortfolio && !inputs.hasPortfolio) {
    score -= 18
    gaps.push({ area: 'portfolio', severity: 'critical', specificAction: `For ${inputs.rolePrefix.toUpperCase()} roles, a portfolio is a filter — not a bonus. Create one public project or case study that demonstrates your strongest skill area this week.`, timeEstimate: '3–5 hours' })
  }

  if (!inputs.hasRecentInterviewPractice) {
    score -= 15
    gaps.push({ area: 'behavioural_prep', severity: 'moderate', specificAction: 'Practice the 5 most common behavioral questions for your role using the STAR method. Record yourself once — watching the playback improves your delivery faster than any coach.', timeEstimate: '2 hours' })
  }

  const clampedScore = Math.max(0, Math.min(100, score))
  let level: InterviewReadinessLevel
  if (clampedScore >= 85) level = 'fully_ready'
  else if (clampedScore >= 65) level = 'mostly_ready'
  else if (clampedScore >= 40) level = 'needs_preparation'
  else level = 'not_ready'

  const totalPrepHours = gaps.reduce((acc, g) => {
    const h = parseFloat(g.timeEstimate.split('–')[0]) || 1
    return acc + h
  }, 0)

  const criticalGaps = gaps.filter(g => g.severity === 'critical')
  const quickWins = gaps
    .filter(g => g.timeEstimate.includes('min') || g.timeEstimate.startsWith('30') || g.timeEstimate.startsWith('45'))
    .map(g => g.specificAction)
    .slice(0, 3)

  return {
    level,
    score: clampedScore,
    gapAreas: gaps,
    estimatedPrepTime: totalPrepHours > 0 ? `${Math.round(totalPrepHours)}–${Math.round(totalPrepHours * 1.5)} hours to get fully ready` : 'You are interview-ready',
    quickWins: quickWins.length ? quickWins : ['You are in good shape — start outreach now'],
    priorityGaps: criticalGaps.map(g => g.specificAction).slice(0, 2),
  }
}

// ── Competitive Peer Positioning ──────────────────────────────────────────────

function assessCompetitivePositioning(inputs: BehavioralPersonalizationInputs): CompetitivePeerPositioning {
  const { seniorityBracket, rolePrefix, totalExperienceYears, aiDisruptionRisk, skillPortfolioScore, employmentGapMonths } = inputs

  let basePercentile = 55
  const strengths: string[] = []
  const weaknesses: string[] = []

  // Seniority premium for senior+
  if (seniorityBracket === 'principal') basePercentile += 10
  else if (seniorityBracket === 'senior') basePercentile += 5

  // Experience vs. typical applicant pool
  if (totalExperienceYears >= 10) { basePercentile += 8; strengths.push('Deep experience depth (10+ years) that most applicants at this level lack') }
  else if (totalExperienceYears >= 7) { basePercentile += 3 }

  // Skill portfolio
  if (skillPortfolioScore !== null && skillPortfolioScore !== undefined) {
    if (skillPortfolioScore >= 75) { basePercentile += 10; strengths.push('Strong skill alignment with current market demand') }
    else if (skillPortfolioScore <= 40) { basePercentile -= 10; weaknesses.push('Skill portfolio below market demand — upskilling is the fastest path to moving up') }
  }

  // AI disruption impact on positioning
  if (aiDisruptionRisk !== null && aiDisruptionRisk !== undefined) {
    if (aiDisruptionRisk <= 0.25) { basePercentile += 5; strengths.push('Low AI displacement risk — your role profile is defensible in the 2026 market') }
    else if (aiDisruptionRisk >= 0.65) { basePercentile -= 8; weaknesses.push('High AI displacement risk for your role — competitors who have AI-augmented versions of your skills will interview better') }
  }

  // Gap impact
  if ((employmentGapMonths ?? 0) > 6) { basePercentile -= 10; weaknesses.push('Employment gap > 6 months — ATS filters at large companies may deprioritise your application without a referral') }
  else if ((employmentGapMonths ?? 0) > 3) { basePercentile -= 4 }

  const percentile = Math.max(15, Math.min(92, basePercentile))

  // Differentiator statement (role-specific)
  const differentiatorMap: Record<string, string> = {
    sw: `${totalExperienceYears}+ years shipping production ${rolePrefix.toUpperCase()} systems at scale — not tutorial projects`,
    ml_engineer: 'Production ML deployment experience, not just notebook-level modelling',
    ds: 'Business-problem-first data science, not purely academic modelling',
    pm: 'Outcome-measured product decisions, not just feature delivery',
    fin: 'Business-partnering financial analysis, not just reporting and reconciliation',
    hc: 'Clinical + technology fluency — the rarest combination in HealthTech hiring',
    legal: 'Technology-forward legal expertise in an era of AI regulation and data privacy',
    mkt: 'Performance-measured marketing, where every campaign connects to revenue impact',
    cons: 'Strategy + execution: consulting frameworks applied with P&L accountability',
    design: 'Research-driven design connected to measurable user and business outcomes',
    bpo: 'Analytics-led operations, not just process-following volume management',
    ops: 'Data-driven operations improvement, not just day-to-day management',
    default: `${totalExperienceYears}+ years of specialized ${seniorityBracket}-level expertise in ${rolePrefix}`,
  }

  const competitiveThreatMap: Record<string, string> = {
    sw: 'Candidates with 2+ years at a hyperscaler (FAANG) or AI-native startup',
    ml_engineer: 'Candidates with open-source contributions to major ML frameworks or recent conference papers',
    ds: 'Candidates with both strong SQL + production Python + a public portfolio project',
    pm: 'Candidates who have shipped an AI-native feature with measurable user or revenue impact',
    fin: 'CA/CFA/MBA finance candidates with investment banking or Big 4 experience',
    hc: 'Dual-qualified candidates (clinical degree + management MBA or healthcare data certification)',
    legal: 'In-house lawyers with both tech and regulatory (GDPR/DPDP/AI Act) specialisation',
    mkt: 'Growth marketers with verified performance metrics and platform certifications (Meta, Google)',
    default: 'Candidates with a stronger portfolio, recent recognition, or cleaner career narrative',
  }

  const winRateMap: Record<number, string> = {
    85: 'You win approximately 1 in 2 final rounds — top-tier positioning',
    70: 'You win approximately 1 in 3 final rounds — strong positioning with targeted search',
    55: 'You win approximately 1 in 4–5 final rounds — solid but need 2–3 profile upgrades',
    40: 'You win approximately 1 in 6–8 final rounds — address the key gaps before starting broad search',
    25: 'You win approximately 1 in 10 rounds — referral-first strategy essential to bypass ATS filtering',
  }

  const winRateBracket = Object.keys(winRateMap)
    .map(Number)
    .filter(k => percentile >= k)
    .sort((a, b) => b - a)[0] ?? 25

  if (strengths.length === 0) strengths.push(`${totalExperienceYears}+ years of focused expertise in your function`)
  if (weaknesses.length === 0) weaknesses.push('Ensure your profile materials are as strong as your actual experience')

  return {
    percentileEstimate: percentile,
    strengthsVsPeers: strengths.slice(0, 3),
    weaknessesVsPeers: weaknesses.slice(0, 2),
    differentiatorStatement: differentiatorMap[inputs.workTypeKey] ?? differentiatorMap[rolePrefix] ?? differentiatorMap['default'],
    competitiveThreat: competitiveThreatMap[rolePrefix] ?? competitiveThreatMap['default'],
    winRateEstimate: winRateMap[winRateBracket] ?? winRateMap[25],
  }
}

// ── Company Transition Strategy ───────────────────────────────────────────────

function buildCompanyTransitionStrategy(inputs: BehavioralPersonalizationInputs): CompanyTransitionStrategy {
  const from = inputs.currentCompanyType ?? 'large'
  const to = inputs.targetCompanyType ?? 'any'

  let dynamic: CompanyTypeDynamic
  if (from === 'mega' || from === 'large') {
    if (to === 'startup' || to === 'mid') dynamic = 'enterprise_to_startup'
    else dynamic = 'enterprise_to_enterprise'
  } else if (from === 'startup') {
    if (to === 'large' || to === 'mega') dynamic = 'startup_to_enterprise'
    else dynamic = 'startup_to_startup'
  } else if (from === 'mid') {
    if (to === 'startup') dynamic = 'startup_to_startup'
    else if (to === 'large' || to === 'mega') dynamic = 'startup_to_enterprise'
    else dynamic = 'enterprise_to_enterprise'
  } else {
    dynamic = 'unknown_transition'
  }

  const strategies: Record<CompanyTypeDynamic, Omit<CompanyTransitionStrategy, 'dynamic'>> = {
    enterprise_to_startup: {
      narrativeRequired: '"I have built strong foundational skills at [large company] — I now want to own an outcome end-to-end, not just contribute to a process. Startup environments where I can see the direct impact of my work are what I am actively seeking."',
      potentialObjections: [
        '"Are you comfortable with ambiguity and lack of structure?"',
        '"Can you work at startup speed without the resources of a large company?"',
        '"Why are you leaving stability for early-stage risk?"',
      ],
      objectionResponses: [
        '"I\'ve been driving my own projects within the larger org — I\'ve actively sought unstructured problems because that\'s where I learn fastest. I want a whole environment that works this way."',
        '"I\'ve deliberately chosen smaller teams and ambiguous projects within [company] — I know how to create structure when needed and move without it when that\'s faster."',
        '"I\'ve reached a point where I understand what I want to own, not just contribute to. The opportunity at [startup] is specifically aligned with that."',
      ],
      cultureRiskWarning: 'Enterprise to startup is a significant culture shock. Decision-making speed, resource constraints, and role ambiguity are real adjustment areas. Know this going in.',
      targetCompanyScreenFilter: 'Target Series B/C startups (30–200 people) — large enough to have some process, small enough for real ownership. Avoid pre-seed unless you want founder-level ambiguity.',
    },
    enterprise_to_enterprise: {
      narrativeRequired: '"I\'ve built deep expertise in [area] at [company]. I\'m looking for an environment that allows me to apply this at [different scale / different domain / with more strategic influence]. [Target company] is the right fit because [specific product/team/problem]."',
      potentialObjections: [
        '"Why leave [prestigious company]?"',
        '"How will you adapt to our culture / tech stack / processes?"',
      ],
      objectionResponses: [
        '"[Company] gave me an excellent foundation. I\'m leaving because [honest, forward-looking reason]. I\'m not running from something — I\'m moving toward [specific opportunity at target]."',
        '"I\'ve adapted my approach across multiple internal platforms and teams — I know how to learn new environments quickly and contribute fast."',
      ],
      cultureRiskWarning: null,
      targetCompanyScreenFilter: 'Target companies with comparable or larger engineering/function scale. Avoid drastic step-downs in company prestige without a strong narrative.',
    },
    startup_to_enterprise: {
      narrativeRequired: '"I\'ve built and owned [outcome] end-to-end at [startup]. I\'m now looking for a platform that matches the scale of what I\'ve been building — [enterprise company] gives me the opportunity to apply that at [10x the scale / global reach / different industry]."',
      potentialObjections: [
        '"Will you be comfortable in a structured, process-driven environment?"',
        '"Your experience is in smaller-scale systems — can you operate at our scale?"',
        '"Startup equity → enterprise RSUs: are you financially comfortable with this transition?"',
      ],
      objectionResponses: [
        '"I\'ve actually put a lot of process in place at [startup] as we scaled — I\'ve both built process from scratch and operated within it. I\'m not allergic to structure; I understand its purpose."',
        '"I\'ve designed systems to scale beyond what we needed them to do — that\'s how startups survive. I\'m excited to operate systems already at the scale I\'ve been building toward."',
        '"I\'ve thought carefully about this transition. RSUs at a public company provide exactly the liquidity profile I want at this stage."',
      ],
      cultureRiskWarning: 'Startup to enterprise can feel bureaucratic. Large company hiring processes are slower and decisions are more consensus-driven. Know this going in and be patient.',
      targetCompanyScreenFilter: 'Target enterprise companies known for engineering culture and internal mobility — Google, Microsoft, Stripe, Atlassian — not bureaucracy-heavy incumbents where startup instincts die quickly.',
    },
    startup_to_startup: {
      narrativeRequired: '"I\'ve built [outcome] at [startup] and I\'m now looking for a role where I can apply that experience in [adjacent domain / different sector / next challenge]. [Target company] is the right move because [specific reason related to their stage / product / market]."',
      potentialObjections: [
        '"Why are you leaving [startup]?"',
        '"What did you learn from [startup\'s challenges]?"',
      ],
      objectionResponses: [
        '"[Company] has been an extraordinary learning environment. I\'m moving because [forward-looking reason, not criticism]. I have accomplished what I set out to do there."',
        '"Startup experience is always a mix of wins and hard lessons. The hardest lesson I learned was [specific one] — and it changed how I approach [relevant area] permanently."',
      ],
      cultureRiskWarning: null,
      targetCompanyScreenFilter: 'Focus on startups at the stage where your specific experience is most applicable. If you scaled 0→50, target Series A. If you scaled 50→500, target Series B/C.',
    },
    consulting_to_industry: {
      narrativeRequired: '"I have spent [N years] advising companies on [area]. I\'ve reached the point where I want to OWN the outcomes I\'ve been recommending — not advise on them. [Target company] is where I want to apply that expertise with full accountability."',
      potentialObjections: [
        '"Consultants are good at frameworks but not at execution — how do you prove you\'re different?"',
        '"You\'re used to moving between clients — can you commit to one organisation long-term?"',
        '"You won\'t have the team or resources of a consulting firm."',
      ],
      objectionResponses: [
        '"I\'ve driven implementation, not just recommendation, in [specific project]. I built [specific thing] and owned it through delivery. The consulting label is misleading — I\'ve been an operator."',
        '"I\'ve been deliberate about this transition for [timeframe]. I\'m not leaving consulting because I\'m bored — I\'m leaving because I want to build something that outlasts a project engagement."',
        '"That\'s the point. I want to see what I can achieve without a support structure. I\'m asking for the chance to prove it."',
      ],
      cultureRiskWarning: 'Consulting to industry is the most misunderstood transition. You\'ll face skepticism about execution capability. Prepare for this in every interview.',
      targetCompanyScreenFilter: 'Target PE-backed portfolio companies, strategy roles at high-growth companies, or companies who have hired ex-consultants before (check LinkedIn history of the hiring manager).',
    },
    industry_to_consulting: {
      narrativeRequired: '"After [N years] of building and operating at [company], I\'m looking to apply that operational expertise across multiple clients and challenges. I want the breadth and learning velocity that consulting provides while my domain knowledge is most fresh and valuable."',
      potentialObjections: [
        '"Do you understand the consulting lifestyle and pace?"',
        '"Can you switch contexts between multiple clients?"',
      ],
      objectionResponses: [
        '"I\'ve done my research and spoken to people in similar roles at this firm — I\'m clear on what the lifestyle involves and I\'m excited about the challenge, not naive about it."',
        '"I\'ve managed multiple workstreams and stakeholder groups simultaneously at [company]. Context switching within an organisation prepared me well for this."',
      ],
      cultureRiskWarning: 'Industry to consulting is a significant lifestyle shift. Travel, billing cycles, and client management dynamics are genuinely different. Shadow someone in the role first if possible.',
      targetCompanyScreenFilter: 'Target boutique or specialist consultancies in your domain rather than generalist firms — your operational depth is most valued where domain knowledge is scarce.',
    },
    unknown_transition: {
      narrativeRequired: 'Define your target company type first — the narrative should be tailored to the specific transition you are making.',
      potentialObjections: ['Unclear without a specific target type defined.'],
      objectionResponses: ['Complete your profile to unlock personalised transition coaching.'],
      cultureRiskWarning: null,
      targetCompanyScreenFilter: 'Define your target company type in your profile to unlock targeted company filtering.',
    },
  }

  return { dynamic, ...strategies[dynamic] }
}

// ── Risk Tolerance Calibration ────────────────────────────────────────────────

function calibrateRiskTolerance(inputs: BehavioralPersonalizationInputs): { profile: RiskToleranceProfile; rationale: string } {
  let conservativeSignals = 0
  let aggressiveSignals = 0

  if (inputs.hasDependents) conservativeSignals += 2
  if ((inputs.runwayMonths ?? 12) < 4) conservativeSignals += 2
  if (inputs.visaStatus && !['citizen', 'permanent_resident', 'na'].includes(inputs.visaStatus)) conservativeSignals += 1
  if (inputs.compositeScore >= 65) aggressiveSignals += 1  // need to move fast
  if (inputs.careerGoal === 'emergency_exit') aggressiveSignals += 2
  if (inputs.careerGoal === 'strategic_exit') aggressiveSignals += 1
  if ((inputs.runwayMonths ?? 12) >= 12) aggressiveSignals += 1
  if ((inputs.employmentGapMonths ?? 0) === 0) aggressiveSignals += 1

  let profile: RiskToleranceProfile
  let rationale: string

  if (conservativeSignals >= 3) {
    profile = 'conservative'
    rationale = 'Your profile has multiple stability constraints (dependents, short runway, visa dependency, or limited safety net). Conservative search strategy: prioritise stable employers, negotiate hard only when you have an offer in hand, and avoid gap-creating moves.'
  } else if (aggressiveSignals >= 3) {
    profile = 'aggressive'
    rationale = 'Your profile allows for an aggressive search strategy — strong runway, no pressing dependents or visa constraints, and clear urgency signal. Target stretch roles, negotiate firmly from the start, and accept that some applications may over-reach.'
  } else {
    profile = 'moderate'
    rationale = 'Balanced risk profile — you have some constraints but also some flexibility. Moderate strategy: target 70% high-probability roles and 30% stretch opportunities. Negotiate with data (market rates) rather than ultimatums.'
  }

  return { profile, rationale }
}

// ── Synthesis Functions ───────────────────────────────────────────────────────

function buildOpeningNarrative(
  gap: EmploymentGapAnalysis,
  trajectory: CareerTrajectoryAnalysis,
  comp: CompensationIntelligence,
  readiness: InterviewReadinessAssessment,
  inputs: BehavioralPersonalizationInputs,
): string {
  const parts: string[] = []

  if (gap.gapSeverity === 'significant') {
    parts.push('Before starting outreach, your top priority is preparing your gap narrative — this will come up in 100% of interviews.')
  } else if (trajectory.trajectory === 'plateauing' && trajectory.yearsAtCurrentLevel >= 3) {
    parts.push(`After ${trajectory.yearsAtCurrentLevel.toFixed(0)} years at the same level, your narrative needs a "why now and why this" story — interviewers will probe for it.`)
  }

  if (comp.position === 'significantly_under' || comp.position === 'under_market') {
    parts.push(`You are below market rate — a job change is your fastest path to correction. Target ${comp.targetCompRange}.`)
  }

  if (readiness.level === 'not_ready' || readiness.level === 'needs_preparation') {
    parts.push(`Spend ${readiness.estimatedPrepTime} on profile preparation before starting outreach — recruiters will see your profile before they see your application.`)
  }

  if (parts.length === 0) {
    parts.push(`You are well-positioned for an active search at the ${inputs.seniorityBracket} level. Start outreach this week.`)
  }

  return parts.join(' ')
}

function identifyTopBlocker(
  gap: EmploymentGapAnalysis,
  readiness: InterviewReadinessAssessment,
  trajectory: CareerTrajectoryAnalysis,
  comp: CompensationIntelligence,
): string {
  if (readiness.priorityGaps.length > 0) return readiness.priorityGaps[0]
  if (gap.gapSeverity === 'significant') return `Prepare your employment gap narrative: ${gap.interviewScript.slice(0, 120)}...`
  if (trajectory.trajectory === 'plateauing' && trajectory.trajectoryScore < 45) return trajectory.urgentAction
  if (comp.position === 'unknown') return 'Complete your salary profile to unlock compensation benchmarking and negotiation intelligence.'
  return 'No critical blockers detected — start outreach this week.'
}

function estimateWeeksToReady(readiness: InterviewReadinessAssessment, gap: EmploymentGapAnalysis): number {
  if (readiness.level === 'fully_ready' && gap.gapSeverity === 'none') return 0
  if (readiness.level === 'mostly_ready') return 1
  if (readiness.level === 'needs_preparation') return 2
  if (gap.gapSeverity === 'significant') return Math.max(2, readiness.level === 'not_ready' ? 3 : 2)
  return readiness.level === 'not_ready' ? 3 : 2
}

// ── Main compute function ─────────────────────────────────────────────────────

export function computeBehavioralPersonalization(
  inputs: BehavioralPersonalizationInputs,
): BehavioralPersonalizationResult {
  const employmentGap = analyseEmploymentGap(inputs)
  const careerTrajectory = analyseCareerTrajectory(inputs)
  const compensationIntelligence = analyseCompensation(inputs)
  const interviewReadiness = assessInterviewReadiness(inputs)
  const competitivePositioning = assessCompetitivePositioning(inputs)
  const companyTransition = buildCompanyTransitionStrategy(inputs)
  const { profile: riskTolerance, rationale: riskToleranceRationale } = calibrateRiskTolerance(inputs)

  const openingNarrative = buildOpeningNarrative(
    employmentGap, careerTrajectory, compensationIntelligence, interviewReadiness, inputs
  )
  const topBlocker = identifyTopBlocker(employmentGap, interviewReadiness, careerTrajectory, compensationIntelligence)
  const weeksToSearchReady = estimateWeeksToReady(interviewReadiness, employmentGap)

  const profileSummary = [
    `${inputs.seniorityBracket.charAt(0).toUpperCase() + inputs.seniorityBracket.slice(1)}-level ${inputs.rolePrefix.toUpperCase()} professional`,
    `${inputs.totalExperienceYears}yr experience`,
    careerTrajectory.label,
    compensationIntelligence.position !== 'unknown'
      ? `${compensationIntelligence.position.replace(/_/g, ' ')} compensation`
      : null,
    employmentGap.gapSeverity !== 'none' ? `${employmentGap.totalGapMonths}mo gap in profile` : null,
  ].filter(Boolean).join(' · ')

  return {
    employmentGap,
    careerTrajectory,
    compensationIntelligence,
    interviewReadiness,
    competitivePositioning,
    companyTransition,
    riskTolerance,
    riskToleranceRationale,
    openingNarrative,
    topBlocker,
    weeksToSearchReady,
    profileSummary,
  }
}
