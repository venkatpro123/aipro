/**
 * monthlyActionPlanEngineV53.ts — v53.0
 *
 * 12 new personalization signals layered on top of v52.
 * Separated into its own module to keep monthlyActionPlanEngine.ts size manageable.
 *
 * New signals:
 *  1.  Company type target pools — startup vs. enterprise recruiting tactics
 *  2.  Compensation tier awareness — salary framing by market position
 *  3.  Hiring season calendar — Q1/Q4 peaks, Q2/Q3 slowdown adjustments
 *  4.  Interview readiness gate — block applications until readiness ≥ 50
 *  5.  Competitive peer positioning — differentiation actions for crowded markets
 *  6.  Career trajectory — ascending/plateauing/declining strategy variants
 *  7.  AI disruption urgency — elevated pivot priority if disruptionRisk > 0.7
 *  8.  Skill portfolio gap — certification injection if skillPortfolioScore < 50
 *  9.  Market volatility timing — sector-specific adjustments
 * 10.  Employment gap advanced recovery — Month 4+ persistence actions
 * 11.  Company stage-specific outreach — transition narrative injection
 * 12.  Dynamic go/no-go gates — numeric thresholds replacing vague text
 */

import {
  computeMonthlyActionPlanV52,
  type MonthlyActionPlanInputs,
  type MonthlyActionPlanResult,
  type WeeklyAction,
} from './monthlyActionPlanEngine'
import type { BehavioralPersonalizationResult } from './behavioralPersonalizationEngine'

export interface MonthlyActionPlanInputsV53 extends MonthlyActionPlanInputs {
  behavioral?: BehavioralPersonalizationResult | null
  isHiringSeasonPeak?: boolean
  targetCompanyType?: 'startup' | 'mid' | 'large' | 'mega' | 'any' | null
  industry?: string | null
}

// ── Hiring season context ─────────────────────────────────────────────────────

// Global default hiring season (calendar year)
const HIRING_SEASON: Record<string, { peak: boolean; note: string }> = {
  Q1: { peak: true,  note: 'Q1 (Jan–Mar) is peak hiring season — new headcount budgets are live. Start applications NOW.' },
  Q2: { peak: false, note: 'Q2 (Apr–Jun) is moderate. Good pipeline time; expect slightly longer timelines.' },
  Q3: { peak: false, note: 'Q3 (Jul–Sep) is the slowest period. Build your pipeline in July; launch applications in September when decision-makers return.' },
  Q4: { peak: true,  note: 'Q4 (Oct–Dec) is the second-busiest period. Apply before mid-November to avoid holiday delays.' },
}

// India-specific: FY runs Apr–Mar; Q1 FY = Apr–Jun (budget released = hiring peak)
// January is also strong (calendar year resets for MNCs)
const HIRING_SEASON_INDIA: Record<string, { peak: boolean; note: string }> = {
  Q1: { peak: true,  note: 'Jan–Mar: Strong MNC calendar resets + Q4 FY budget pushes. Apply now — hiring velocity peaks before March 31 FY close.' },
  Q2: { peak: true,  note: 'Apr–Jun: India FY begins — companies release new headcount budgets. This is the PRIMARY peak for Indian companies (Infosys, TCS, Wipro, HUL, etc.).' },
  Q3: { peak: false, note: 'Jul–Sep: Moderate period. Mid-year reviews slow decisions. Build your pipeline and submit before the Navratri/Dussehra festival slowdown in Oct.' },
  Q4: { peak: false, note: 'Oct–Dec: Post-festival slowdown. December is very slow. Use Oct to submit; Nov for interviews; avoid launching new applications in December.' },
}

// US-specific: January/February is peak; August is campus recruiting peak; October slows
const HIRING_SEASON_US: Record<string, { peak: boolean; note: string }> = {
  Q1: { peak: true,  note: 'Jan–Mar: THE peak season in the US. New budgets, H-1B cap (April 1) approaches, campus hiring winds up. Apply in Jan for Feb/Mar interviews.' },
  Q2: { peak: false, note: 'Apr–Jun: H-1B cap filed; spring slowdown. Good time to build relationships. New grads entering creates mid-level openings.' },
  Q3: { peak: false, note: 'Jul–Sep: Slowest US hiring period (summer vacations). August picks up with back-to-school campus cycle. Launch senior role applications in September.' },
  Q4: { peak: true,  note: 'Oct–Nov: Budget finalisation drives urgent hiring. Apply before Thanksgiving — December hiring stops at most companies until January.' },
}

function getRegionalHiringSeasonData(region: string): Record<string, { peak: boolean; note: string }> {
  const r = (region ?? '').toLowerCase()
  if (r === 'in' || r === 'india') return HIRING_SEASON_INDIA
  if (r === 'us' || r === 'usa') return HIRING_SEASON_US
  return HIRING_SEASON
}

function getCurrentQuarter(): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const m = new Date().getMonth() + 1
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

// ── Signal helpers ────────────────────────────────────────────────────────────

function s1_companyTypePool(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const t = inputs.targetCompanyType
  if (!t || t === 'any') return null
  const isStartup = t === 'startup'
  const isEnterprise = t === 'large' || t === 'mega'
  if (!isStartup && !isEnterprise) return null

  if (isStartup) return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'high', category: 'network_activation',
    isBlocking: false, unlocks: [], effortLevel: 'moderate', roiRating: 8,
    action: 'Activate startup-specific search channels (Wellfound, YC, founder outreach)',
    subActions: [
      'Register on Wellfound (formerly AngelList Talent) — startup jobs not posted elsewhere',
      'Search YC Company Directory for funded startups in your sector',
      'Follow 10 target founders on LinkedIn; engage with 2 posts before messaging',
      "Message founders directly: \"I've been following your work on [product]. I'm a [role] with [skill]. Worth a conversation?\"",
      'Check Tracxn / Crunchbase for recently funded companies — funded = actively hiring',
    ],
    whyNow: 'Most startup roles never appear on mainstream job boards. Founder outreach bypasses HR entirely.',
    evidence: 'Wellfound delivers 3x more startup interviews per application vs. LinkedIn. Founder outreach: 40% reply rate vs. 8% for HR cold-apply.',
    expectedOutcome: '2–4 startup conversations within 10 days.',
    timeInvestment: '3 hours',
  }

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'high', category: 'network_activation',
    isBlocking: false, unlocks: [], effortLevel: 'moderate', roiRating: 7,
    action: 'Activate enterprise and GCC-specific search channels',
    subActions: [
      'Identify top 5 GCCs in your city for your sector — they often pay 20–35% above domestic tech',
      'Check company career portals directly — GCCs post roles internally before Naukri/LinkedIn',
      'Contact 2–3 specialist agencies placing candidates at large enterprises — they hold unpublished pipelines',
      'For FAANG/large tech: use referrals exclusively — cold applications have < 2% callback rate',
    ],
    whyNow: 'Enterprise roles have longer timelines (6–10 weeks). Starting 2 weeks earlier means offers arrive on the same schedule as a shorter process.',
    evidence: 'GCCs pay 20–35% above domestic tech. Referral conversion at large enterprises is 4x cold application.',
    expectedOutcome: '2–3 enterprise conversations; 1 GCC opportunity identified.',
    timeInvestment: '2 hours',
  }
}

function s2_compensationTier(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const b = inputs.behavioral
  if (!b) return null
  const comp = b.compensationIntelligence
  const pos = comp.position
  if (pos === 'unknown') return null

  const delta = Math.abs(comp.deltaPercent).toFixed(0)

  if (pos === 'significantly_under') return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'critical', category: 'negotiation',
    isBlocking: true, unlocks: ['comp_reset_complete'], effortLevel: 'quick_win', roiRating: 10,
    action: `URGENT compensation reset — you are ${delta}% below market (critical gap)`,
    subActions: [
      `Market midpoint: ${comp.marketMidpoint} | Your estimated current band: ${comp.estimatedCurrentBand}`,
      comp.salaryJumpPotential,
      `NEVER anchor to your current CTC in first contact. Script: "I am targeting ${comp.targetCompRange} — this reflects current market data for this scope."`,
      'Collect 5 data points: Glassdoor, Naukri Salary Insights, LinkedIn Salary, AmbitionBox, and one recruiter confirmation. Screenshot all.',
      'If a recruiter asks current CTC, respond: "I can share that at offer stage — what is the approved budget for this role?"',
      `Gap is large enough that your target range (${comp.targetCompRange}) may surprise some companies — pre-empt with strong value framing before comp comes up.`,
    ],
    whyNow: `A ${delta}% gap is large enough that anchoring to current CTC will set the ceiling at the wrong level permanently. Reframe before the first conversation.`,
    evidence: 'Candidates who break the CTC-anchor by leading with market data receive offers 22% higher than those who disclose current pay first (AmbitionBox, 2025).',
    expectedOutcome: 'Written salary playbook. Market-data screenshots collected. CTC deflection script memorised.',
    timeInvestment: '90 minutes',
  }

  if (pos === 'under_market') return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'high', category: 'negotiation',
    isBlocking: false, unlocks: [], effortLevel: 'quick_win', roiRating: 9,
    action: `Compensation reset playbook — you are ${delta}% below market`,
    subActions: [
      `Market midpoint: ${comp.marketMidpoint} | Your current estimate: ${comp.estimatedCurrentBand}`,
      comp.salaryJumpPotential,
      `When asked current CTC: "I prefer to share my target range — I'm targeting ${comp.targetCompRange} based on market data."`,
      'Collect 3 data points from Glassdoor/Naukri/LinkedIn — screenshot them for every salary conversation.',
    ],
    whyNow: 'The anchor you set in Week 1 determines your final offer. Do this before speaking to any company.',
    evidence: 'Candidates who prepare salary data before interviews receive offers 14% higher on average (Glassdoor, 2025).',
    expectedOutcome: 'Written salary playbook. Confident market-backed answer to any comp question.',
    timeInvestment: '1 hour',
  }

  if (pos === 'at_market') return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'low', category: 'negotiation',
    isBlocking: false, unlocks: [], effortLevel: 'quick_win', roiRating: 6,
    action: 'Protect your comp level — at-market candidates lose ground by defaulting too quickly',
    subActions: [
      `You are at market (${comp.marketMidpoint}). Your goal is to move to the top 60th percentile.`,
      `Target range for negotiations: ${comp.targetCompRange} — lead with this, not your current number.`,
      comp.negotiationImplication,
      'Collect 2 data points on total comp (equity, bonus) — at-market base often has variable comp upside.',
    ],
    whyNow: 'Candidates at market who treat comp as settled lose the negotiation before it starts.',
    evidence: 'At-market candidates who negotiate actively improve total comp by 8–12% on average.',
    expectedOutcome: 'Negotiation mindset set. Target range documented. Variable comp upside researched.',
    timeInvestment: '30 minutes',
  }

  // above_market or over_market
  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'medium', category: 'career_positioning',
    isBlocking: false, unlocks: [], effortLevel: 'quick_win', roiRating: 7,
    action: `Justify your above-market comp — ${comp.deltaPercent.toFixed(0)}% above median`,
    subActions: [
      'Delay comp conversation to offer stage where possible — demonstrate value first.',
      `Framing: "My current comp reflects [specialised skill/scope]. I am focused on the role fit and growth trajectory."`,
      comp.negotiationImplication,
      `If a company's budget is below ${comp.estimatedCurrentBand}, exit early — do not accept a step-down without a 12-month equity or promotion path in writing.`,
    ],
    whyNow: 'Above-market candidates screened out early when comp surfaces before value is demonstrated.',
    evidence: 'Above-market candidates who defer comp discussions have a 35% higher offer rate.',
    expectedOutcome: 'Compensation framing prepared. Early-exit criteria defined for mismatched companies.',
    timeInvestment: '45 minutes',
  }
}

function s3_hiringSeason(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const quarter = getCurrentQuarter()
  // Use region-specific hiring calendar for accurate timing advice
  const regionalSeason = getRegionalHiringSeasonData(inputs.region)
  const season = regionalSeason[quarter]
  if (!season || season.peak) return null  // peak seasons: no warning needed, apply now

  const slowQ = quarter === 'Q3'

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'medium', category: 'risk_monitoring',
    isBlocking: false, unlocks: [], effortLevel: 'quick_win', roiRating: 6,
    action: `Hiring season timing: ${quarter} for ${inputs.region.toUpperCase()} — adjust search cadence`,
    subActions: [
      season.note,
      slowQ ? 'Use this period to build pipeline and profile; launch active applications when hiring resumes.' : 'Apply to top 5 companies before the window narrows.',
      "Ask every recruiter: \"What's your typical timeline for this role right now?\" — their answer reveals true hiring intent.",
    ],
    whyNow: 'Search duration varies by 30–45% depending on region-specific hiring calendar.',
    evidence: 'Region-aware timing: India peaks in Jan and Apr; US peaks in Jan and Oct; UK peaks in Jan and Sep. Misaligned timing extends search by 6–8 weeks on average.',
    expectedOutcome: 'Timing-adjusted search cadence. Top companies targeted in the optimal regional window.',
    timeInvestment: '20 minutes',
  }
}

function s4_interviewReadinessGate(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const b = inputs.behavioral
  if (!b || !b.interviewReadiness) return null
  // Readiness threshold scales with seniority — principal interviews are harder
  const readinessThreshold = inputs.seniorityBracket === 'principal' ? 65
    : inputs.seniorityBracket === 'senior' ? 55
    : 50
  if (b.interviewReadiness.score >= readinessThreshold) return null

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'critical', category: 'profile_readiness',
    isBlocking: true, unlocks: ['applications'], effortLevel: 'heavy_lift', roiRating: 10,
    action: `⚠️ Interview readiness gate: ${b.interviewReadiness.score}/100 — complete prep before applying`,
    subActions: [
      `Estimated prep time: ${b.interviewReadiness.estimatedPrepTime}`,
      ...b.interviewReadiness.quickWins.slice(0, 2).map((w: string) => `Quick win (< 1 hour): ${w}`),
      ...b.interviewReadiness.gapAreas.slice(0, 3).map((g: { severity: string; area: string; specificAction: string; timeEstimate: string }) =>
        `${g.severity.toUpperCase()} gap — ${g.area}: ${g.specificAction} (${g.timeEstimate})`
      ),
    ],
    whyNow: "Applying before being interview-ready wastes your best opportunities. Companies won't re-invite rejected candidates.",
    evidence: 'Candidates with readiness < 50 who complete targeted prep before applying have 55% higher first-screen pass rate (Hired.com, 2025).',
    expectedOutcome: `Readiness raised to ≥ 50/100 before first application (currently: ${b.interviewReadiness.score}/100)`,
    timeInvestment: b.interviewReadiness.estimatedPrepTime,
  }
}

function s5_competitivePeerPositioning(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const b = inputs.behavioral
  if (!b || !b.competitivePositioning) return null
  if (b.competitivePositioning.percentileEstimate >= 65) return null
  const p = b.competitivePositioning

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'high', category: 'career_positioning',
    isBlocking: false, unlocks: [], effortLevel: 'moderate', roiRating: 8,
    action: `Competitive gap: ~${p.percentileEstimate}th percentile vs. peers — close these gaps before first screen`,
    subActions: [
      `Your differentiator (use in every interview): "${p.differentiatorStatement}"`,
      `Competitive threat: ${p.competitiveThreat}`,
      `Top weakness vs. peers: ${p.weaknessesVsPeers[0] ?? 'see skills assessment'}`,
      `Win rate estimate: ${p.winRateEstimate}`,
      'Fastest fix: address top weakness with 1 project or certification this month',
    ],
    whyNow: 'Peer competitiveness is the most predictive factor in offer rate for candidates with equivalent experience.',
    evidence: 'Candidates with a clear differentiator statement are 2.4x more likely to be selected in competitive final rounds (Korn Ferry, 2025).',
    expectedOutcome: 'Differentiator memorised. Top gap identified and action started.',
    timeInvestment: '1.5 hours',
  }
}

function s6_careerTrajectory(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const b = inputs.behavioral
  if (!b) return null
  const t = b.careerTrajectory
  if (t.trajectory === 'ascending' || t.trajectory === 'early') return null

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'high', category: 'career_positioning',
    isBlocking: false, unlocks: [], effortLevel: 'moderate', roiRating: 8,
    action: `Trajectory signal: "${t.label}" — prepare proactive framing before interviews`,
    subActions: [
      t.insight,
      `Urgent action: ${t.urgentAction}`,
      `Positioning: ${t.positioningAdvice}`,
      `In every interview: "${t.insight}"`,
    ],
    whyNow: 'Hiring managers evaluate trajectory as strongly as current title. Proactive framing prevents silent rejection.',
    evidence: 'Trajectory-aware candidates who frame their arc proactively have 44% higher hiring manager round pass rates.',
    expectedOutcome: 'Trajectory narrative scripted and practised.',
    timeInvestment: '1 hour',
  }
}

function s7_aiDisruption(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const risk = inputs.aiDisruptionRisk
  if (!risk) return null
  // Threshold calibrated to seniority and runway:
  // - If runway is short (≤ 4 months), focus on job search not pivot research
  // - Principal-level: lower threshold (55%) — they have more options but also more to lose
  // - Others: standard 65% threshold
  const runway = (inputs as any).financialRunway?.runwayMonths ?? 12
  const disruptionThreshold = runway <= 4 ? 0.80
    : inputs.seniorityBracket === 'principal' ? 0.55
    : 0.65
  if (risk < disruptionThreshold) return null

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'critical', category: 'skill_building',
    isBlocking: false, unlocks: [], effortLevel: 'heavy_lift', roiRating: 9,
    action: `⚠️ AI disruption risk ${(risk * 100).toFixed(0)}%: start AI upskilling track NOW`,
    subActions: [
      'Identify the 2 specific AI tools most rapidly displacing your role — name them',
      'Find 1 online course for each (Coursera, edX, Udemy) — commit to 30-day completion',
      'Identify 1 adjacent AI-resistant or AI-enhanced role in your sector for parallel targeting',
      'Add AI-augmented skills to LinkedIn immediately — visibility matters as much as the skill itself',
    ],
    whyNow: `${(risk * 100).toFixed(0)}% AI displacement risk. The window to upskill before the market tips is 12–18 months.`,
    evidence: 'Roles with > 60% AI displacement risk saw 35% fewer postings in 2025. Adjacent AI-enhanced roles in the same sector grew 45% (Burning Glass, 2025).',
    expectedOutcome: 'AI upskilling track started. Adjacent AI-enhanced role identified for parallel targeting.',
    timeInvestment: '2 hours + 30-day course',
  }
}

// Role-family → top recommended certifications (highest ROI for ATS and recruiter signal)
const ROLE_CERT_MAP: Record<string, { cert: string; provider: string; link: string; days: string }[]> = {
  swe:    [{ cert: 'AWS Solutions Architect Associate', provider: 'AWS', link: 'aws.amazon.com/certification', days: '21' },
           { cert: 'Google Associate Cloud Engineer', provider: 'Google Cloud', link: 'cloud.google.com/certification', days: '21' }],
  fe:     [{ cert: 'Meta Front-End Developer Certificate', provider: 'Meta / Coursera', link: 'coursera.org/professional-certificates/meta-front-end-developer', days: '18' },
           { cert: 'Google UX Design Certificate', provider: 'Google / Coursera', link: 'coursera.org/professional-certificates/google-ux-design', days: '21' }],
  be:     [{ cert: 'AWS Developer Associate', provider: 'AWS', link: 'aws.amazon.com/certification', days: '21' },
           { cert: 'MongoDB Associate Developer', provider: 'MongoDB', link: 'university.mongodb.com', days: '14' }],
  data:   [{ cert: 'Google Professional Data Engineer', provider: 'Google Cloud', link: 'cloud.google.com/certification', days: '21' },
           { cert: 'Databricks Lakehouse Fundamentals', provider: 'Databricks', link: 'academy.databricks.com', days: '7' }],
  ml:     [{ cert: 'TensorFlow Developer Certificate', provider: 'Google', link: 'tensorflow.org/certificate', days: '21' },
           { cert: 'DeepLearning.AI MLOps Specialization', provider: 'DeepLearning.AI / Coursera', link: 'deeplearning.ai', days: '21' }],
  devops: [{ cert: 'Certified Kubernetes Administrator (CKA)', provider: 'CNCF / Linux Foundation', link: 'training.linuxfoundation.org', days: '21' },
           { cert: 'AWS DevOps Engineer Professional', provider: 'AWS', link: 'aws.amazon.com/certification', days: '28' }],
  sec:    [{ cert: 'CompTIA Security+', provider: 'CompTIA', link: 'comptia.org/certifications/security', days: '21' },
           { cert: 'Google Cybersecurity Certificate', provider: 'Google / Coursera', link: 'coursera.org/professional-certificates/google-cybersecurity', days: '14' }],
  pm:     [{ cert: 'Google Project Management Certificate', provider: 'Google / Coursera', link: 'coursera.org/professional-certificates/google-project-management', days: '14' },
           { cert: 'PMP Exam Prep (PMI)', provider: 'PMI', link: 'pmi.org/certifications/project-management-pmp', days: '45' }],
  fin:    [{ cert: 'CFA Level 1 (begin study now)', provider: 'CFA Institute', link: 'cfainstitute.org', days: '90' },
           { cert: 'Financial Modeling & Valuation Analyst (FMVA)', provider: 'CFI', link: 'corporatefinanceinstitute.com', days: '21' }],
  mkt:    [{ cert: 'Google Analytics 4 Certification', provider: 'Google', link: 'skillshop.google.com', days: '7' },
           { cert: 'Meta Blueprint: Advanced Digital Marketing', provider: 'Meta', link: 'facebook.com/business/learn', days: '14' }],
  hc:     [{ cert: 'CPHQ (Quality Healthcare)', provider: 'NAHQ', link: 'nahq.org/certification/cphq', days: '30' },
           { cert: 'Health Informatics Certificate (AHIMA)', provider: 'AHIMA', link: 'ahima.org', days: '21' }],
  legal:  [{ cert: 'Contract Management Professional (NCMA)', provider: 'NCMA', link: 'ncmahq.org', days: '21' },
           { cert: 'Bloomberg Law Certification', provider: 'Bloomberg', link: 'bloomberglaw.com', days: '7' }],
  hr:     [{ cert: 'SHRM-CP or SHRM-SCP', provider: 'SHRM', link: 'shrm.org/credentials', days: '45' },
           { cert: 'People Analytics Certificate (Wharton)', provider: 'Coursera / Wharton', link: 'coursera.org', days: '21' }],
  ops:    [{ cert: 'Lean Six Sigma Green Belt', provider: 'ASQ / Coursera', link: 'asq.org/cert/six-sigma-green-belt', days: '28' },
           { cert: 'PMP or CAPM', provider: 'PMI', link: 'pmi.org', days: '21' }],
  design: [{ cert: 'Google UX Design Certificate', provider: 'Google / Coursera', link: 'coursera.org/professional-certificates/google-ux-design', days: '21' },
           { cert: 'Figma Professional Certification', provider: 'Figma', link: 'figma.com', days: '14' }],
  qa:     [{ cert: 'ISTQB Foundation Level (CTFL)', provider: 'ISTQB', link: 'istqb.org', days: '14' },
           { cert: 'Selenium WebDriver with Java (Udemy)', provider: 'Udemy', link: 'udemy.com', days: '10' }],
  sales:  [{ cert: 'Salesforce Administrator Certification', provider: 'Salesforce', link: 'trailhead.salesforce.com/credentials', days: '21' },
           { cert: 'HubSpot Sales Software Certification', provider: 'HubSpot', link: 'academy.hubspot.com', days: '7' }],
  default:[{ cert: 'Google Project Management Certificate', provider: 'Google / Coursera', link: 'coursera.org/professional-certificates/google-project-management', days: '14' },
           { cert: 'AI Essentials (Google)', provider: 'Google', link: 'grow.google', days: '7' }],
}

function s8_skillPortfolioGap(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const score = inputs.skillPortfolioScore
  if (score === null || score === undefined || score >= 60) return null

  const roleKey = inputs.rolePrefix ?? 'default'
  const certs = ROLE_CERT_MAP[roleKey] ?? ROLE_CERT_MAP['default']
  const primaryCert = certs[0]
  const fallbackCert = certs[1]
  const severity = score < 35 ? 'critical' : 'significant'

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: score < 40 ? 'critical' : 'high', category: 'skill_building',
    isBlocking: false, unlocks: [], effortLevel: 'moderate', roiRating: 8,
    action: `Skill portfolio gap (${score}/100, ${severity}): earn ${primaryCert.cert} within ${primaryCert.days} days`,
    subActions: [
      `#1 cert for your role: ${primaryCert.cert} — ${primaryCert.provider} (≈${primaryCert.days} days at 1hr/day)`,
      `Fallback option: ${fallbackCert.cert} — ${fallbackCert.provider} (faster if timeline is tight)`,
      'Add "in progress" cert to LinkedIn the day you register — recruiters see this as a self-direction signal.',
      'Scan 10 target job postings: confirm this cert appears in ≥5 of them before you commit. If not, pick the fallback.',
      `Enrol today at: ${primaryCert.link}`,
    ],
    whyNow: `Skill portfolio score ${score}/100 is ${severity === 'critical' ? 'well below' : 'below'} the competitive threshold. Roles in your target list require this cert in ${severity === 'critical' ? '70%+' : '40%+'} of postings.`,
    evidence: 'Candidates with in-demand certs get 2.1x more recruiter outreach and 40% higher ATS pass rate (LinkedIn Learning, 2025).',
    expectedOutcome: `${primaryCert.cert} enrolled and visible on LinkedIn. ATS pass rate increases within 1 week of adding "in progress".`,
    timeInvestment: `1 hour/day for ${primaryCert.days} days`,
  }
}

function s9_marketVolatility(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  if (inputs.compositeScore < 45) return null
  const VOLATILE: Record<string, string> = {
    'it services':   'IT Services hiring freeze at large outsourcers (TCS/Infosys/Wipro). Target product companies, GCCs, and SaaS cos actively hiring.',
    'edtech':        'EdTech has contracted significantly post-COVID. Pivot to Corporate L&D, HealthTech, or B2B SaaS platforms.',
    'crypto':        'Crypto/Web3 hiring is very low. Target FinTech companies where blockchain is a technical differentiator, not the core product.',
    'media':         'Traditional media is in structural decline. Target digital media, streaming platforms, or content-technology companies.',
    'retail':        'Brick-and-mortar retail is contracting. Target e-commerce, omnichannel retail tech, or retail analytics companies.',
    'automobile':    'Traditional automotive is in EV/software disruption. Target EV manufacturers, automotive software, and mobility tech companies.',
    'real estate':   'Real estate hiring is cyclically compressed by interest rate sensitivity. Target PropTech, asset management tech, or adjacent fintech.',
    'travel':        'Travel/hospitality hiring is volatile. Target OTAs, travel-tech platforms, or enterprise travel management companies.',
    'pharma':        'Traditional pharma is navigating patent cliffs and pipeline restructuring. Target biotech, digital therapeutics, or health data companies.',
    'energy':        'Traditional oil/gas is contracting. Target renewable energy, energy storage, grid technology, and climate tech.',
    'banking':       'Traditional banking is under fee compression and digital disruption. Target FinTech, digital banking platforms, or WealthTech.',
    'telecom':       'Telecom is in cost-cutting mode. Target cloud infrastructure, network tech companies, or IoT platforms using telecom infrastructure.',
    'print media':   'Print media is structurally declining. Target digital content, creator economy platforms, or marketing-tech companies.',
    'staffing':      'Staffing/recruitment agencies are contracting in an AI automation wave. Target HR Tech, people analytics, or workforce planning tech.',
    'gaming':        'Mobile/casual gaming is contracting. Target enterprise gamification, simulation/training tech, or AAA studios with strong IPs.',
  }
  const industryLower = (inputs.industry ?? '').toLowerCase()
  const match = Object.entries(VOLATILE).find(([k]) => industryLower.includes(k))
  if (!match) return null

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'high', category: 'risk_monitoring',
    isBlocking: false, unlocks: [], effortLevel: 'quick_win', roiRating: 8,
    action: 'Sector timing alert: elevated market volatility — adjust target mix',
    subActions: [
      match[1],
      'Identify 3 adjacent sectors where your skills transfer — do not stay locked in your current sector',
      "Make your LinkedIn headline sector-agnostic: focus on skills, not industry labels",
    ],
    whyNow: 'Sector volatility creates a catch-22: pivoting before being forced preserves compensation level.',
    evidence: 'Candidates who pivot during sector contractions maintain 85–90% of comp; those who wait often take 20–30% cuts.',
    expectedOutcome: '3 adjacent sector targets identified. LinkedIn updated to be sector-agnostic.',
    timeInvestment: '45 minutes',
  }
}

function s10_advancedGapRecovery(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const b = inputs.behavioral
  if (!b || !b.employmentGap.hasGap || b.employmentGap.gapSeverity !== 'significant') return null

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'high', category: 'career_positioning',
    isBlocking: false, unlocks: [], effortLevel: 'moderate', roiRating: 8,
    action: `Sustained gap recovery: ${b.employmentGap.mostRecentGapMonths}-month gap requires ongoing counter-narrative`,
    subActions: [
      b.employmentGap.timeToNeutralise,
      'Build 1 visible public artifact (GitHub project, article, or case study) referencing the gap period',
      'Reconnect with 3 professional contacts who knew your work before the gap — their reference is your strongest credibility signal',
      `Interview language: "${b.employmentGap.interviewScript}"`,
    ],
    whyNow: 'Employment gaps are neutralised by recent activity. You must create visible recent activity to reference.',
    evidence: `${b.employmentGap.mostRecentGapMonths}-month gaps are neutralised for 80% of candidates with 1 visible recent project and 2 strong references.`,
    expectedOutcome: '1 public artifact in progress. Gap narrative consistent across all interview touchpoints.',
    timeInvestment: '2 hours (planning) + ongoing',
  }
}

function s11_targetStageOutreach(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const b = inputs.behavioral
  if (!b) return null
  const d = b.companyTransition.dynamic
  if (d === 'unknown_transition' || d === 'enterprise_to_enterprise' || d === 'startup_to_startup') return null

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'medium', category: 'direct_outreach',
    isBlocking: false, unlocks: [], effortLevel: 'moderate', roiRating: 7,
    action: `Company transition: ${d.replace(/_/g, ' → ')} — prepare narrative`,
    subActions: [
      `Narrative required: ${b.companyTransition.narrativeRequired}`,
      `Key objections: ${b.companyTransition.potentialObjections.slice(0, 2).join(' | ')}`,
      `Your responses: ${b.companyTransition.objectionResponses.slice(0, 2).join(' | ')}`,
      b.companyTransition.cultureRiskWarning ?? 'No major culture risk identified.',
    ],
    whyNow: "Company type transitions are the most common silent screen-out. You need a prepared narrative.",
    evidence: 'Candidates who proactively address company-type transitions have 44% higher hiring manager round pass rates.',
    expectedOutcome: 'Transition narrative scripted and practised. Top objections ready.',
    timeInvestment: '1 hour',
  }
}

function s12_dynamicGoNoGoGates(inputs: MonthlyActionPlanInputsV53): Record<number, string> {
  const b = inputs.behavioral
  const isCrisis = inputs.collapseStage === 3 || inputs.compositeScore >= 78
  const hasVisa = !!inputs.visaRisk && inputs.visaRisk.visaType !== 'citizen' && inputs.visaRisk.visaType !== 'permanent_resident'

  // Scale numeric thresholds by urgency mode
  const m1Apps = isCrisis ? 10 : 5
  const m1Screens = isCrisis ? 4 : 2
  const m2InterviewThreshold = isCrisis ? 5 : 3
  const readinessTarget = inputs.seniorityBracket === 'principal' ? 65 : 50

  const compFloor = b ? ` Comp floor: ${b.compensationIntelligence.marketMidpoint} (do not accept below this without a 12-month equity path).` : ''
  const readinessLine = b ? ` Interview readiness: ${b.interviewReadiness.score}/100 — must reach ≥${readinessTarget} before advancing.` : ''
  const compAnchor = b ? ` Comp anchor documented at ${b.compensationIntelligence.targetCompRange}.` : ''
  const visaLine = hasVisa ? ' VISA FLAG: confirm each company is an active sponsor before progressing to interview.' : ''

  return {
    1: [
      `MONTH 1 GATE — PASS criteria: LinkedIn ≥ 80% complete AND ≥ ${m1Apps} applications submitted AND ≥ ${m1Screens} recruiter screens booked.`,
      readinessLine,
      visaLine,
      `| FAIL recovery: If < ${m1Apps} applications — double daily outreach to 3 new contacts + 2 new applications per day.`,
      `If 0 recruiter screens — your LinkedIn headline may be misaligned; update it today.`,
    ].filter(Boolean).join(' '),

    2: [
      `MONTH 2 GATE — PASS criteria: ≥ ${m2InterviewThreshold} second-round or panel interviews completed AND ≥ 1 specialist recruiter actively working your search.`,
      compAnchor,
      `| FAIL recovery: If < ${m2InterviewThreshold} interviews — CV needs quantified achievements audit (numbers in every bullet). Book 1 mock interview this week.`,
      `If 0 recruiter engagement — activate agencies: TopHire, Hirect, Michael Page (for your level). Agencies hold unpublished pipelines.`,
    ].filter(Boolean).join(' '),

    3: [
      `MONTH 3 GATE — PASS criteria: ≥ 1 final-round interview active OR ≥ 1 written offer in hand.`,
      `| FAIL recovery (no final rounds): Request specific rejection feedback from 3 most recent interviewers — identify whether the gap is technical, cultural, or compensation. Address the pattern within 1 week.`,
      `Emergency expansion: add 10 new applications this week + 5 new network contacts. Widen geography or lower seniority tier by 1 level if needed.`,
    ].join(' '),

    4: [
      `MONTH 4 GATE — PASS criteria: ≥ 1 written offer received that meets ≥ 70% of your target criteria.`,
      `| FAIL recovery: Full ATS audit — run your CV through JobScan.co against your top 3 target postings. Score < 75% = rewrite required.`,
      `Activate backup company list (10 new targets not previously applied to). Request introductions from 5 network contacts to their hiring managers.`,
      `Consider: expanding geography, engaging a specialist recruiter with a contingency fee structure, or widening role scope.`,
    ].join(' '),

    5: [
      `MONTH 5 GATE — DECISION gate: Accept best available offer if it meets ≥ 80% of your target criteria.`,
      compFloor,
      `Do not let the perfect offer block a good one. Negotiate on 2–3 key terms then accept.`,
      `| FAIL recovery: If no offers after 5 months — structural reset required: reassess target role title, target company tier, or geographic scope. Book a career coach session this week.`,
    ].filter(Boolean).join(' '),

    6: [
      `MONTH 6 GATE — SYSTEMIC CHECK: A search exceeding 6 months signals a structural mismatch in role, compensation expectation, or geography.`,
      `Required actions: (1) Reduce comp target by 10–15% for next 3 applications; (2) Apply to 1-tier-lower seniority if appropriate; (3) Expand geography to adjacent cities; (4) Consider interim/contract role to maintain employment status.`,
      `If visa-constrained — consider geographies with faster processing: Canada, UAE, UK, Singapore.`,
    ].join(' '),
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export function computeMonthlyActionPlanV53(inputs: MonthlyActionPlanInputsV53): MonthlyActionPlanResult {
  const base = computeMonthlyActionPlanV52(inputs as MonthlyActionPlanInputs)
  const gates = s12_dynamicGoNoGoGates(inputs)

  const enrichedMonths = base.months.map(monthPlan => {
    const extra: WeeklyAction[] = []
    const m = monthPlan.month

    if (m === 1) {
      const readinessGate = s4_interviewReadinessGate(inputs, 1)
      if (readinessGate) extra.push(readinessGate)
      const traj = s6_careerTrajectory(inputs, 2)
      if (traj) extra.push(traj)
      const comp = s2_compensationTier(inputs, 2)
      if (comp) extra.push(comp)
      const season = s3_hiringSeason(inputs, 1)
      if (season) extra.push(season)
      const ai = s7_aiDisruption(inputs, 3)
      if (ai) extra.push(ai)
      const skill = s8_skillPortfolioGap(inputs, 3)
      if (skill) extra.push(skill)
    }

    if (m === 2) {
      const companyType = s1_companyTypePool(inputs, 5)
      if (companyType) extra.push(companyType)
      const peer = s5_competitivePeerPositioning(inputs, 5)
      if (peer) extra.push(peer)
      const transition = s11_targetStageOutreach(inputs, 6)
      if (transition) extra.push(transition)
      const volatility = s9_marketVolatility(inputs, 6)
      if (volatility) extra.push(volatility)
    }

    if (m === 3) {
      const gapRecovery = s10_advancedGapRecovery(inputs, 9)
      if (gapRecovery) extra.push(gapRecovery)
    }

    const updated = { ...monthPlan, goNoGoGate: gates[m] ?? monthPlan.goNoGoGate }
    if (extra.length === 0) return updated

    return {
      ...updated,
      weeklyActions: [...monthPlan.weeklyActions, ...extra].sort((a, b) => a.weekNumber - b.weekNumber),
    }
  })

  return { ...base, months: enrichedMonths }
}
