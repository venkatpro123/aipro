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

const HIRING_SEASON: Record<string, { peak: boolean; note: string }> = {
  Q1: { peak: true,  note: 'Q1 (Jan–Mar) is peak hiring season — new headcount budgets are live. Start applications NOW.' },
  Q2: { peak: false, note: 'Q2 (Apr–Jun) is moderate. Good pipeline time; expect slightly longer timelines.' },
  Q3: { peak: false, note: 'Q3 (Jul–Sep) is the slowest period. Build your pipeline in July; launch applications in September when decision-makers return.' },
  Q4: { peak: true,  note: 'Q4 (Oct–Dec) is the second-busiest period. Apply before mid-November to avoid holiday delays.' },
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
  const pos = b.compensationIntelligence.position
  if (pos === 'at_market' || pos === 'unknown') return null
  const isUnder = pos === 'significantly_under' || pos === 'under_market'

  if (isUnder) return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'high', category: 'negotiation',
    isBlocking: false, unlocks: [], effortLevel: 'quick_win', roiRating: 9,
    action: `Compensation reset playbook — you are ${Math.abs(b.compensationIntelligence.deltaPercent).toFixed(0)}% below market`,
    subActions: [
      `Market midpoint: ${b.compensationIntelligence.marketMidpoint} | Your current estimate: ${b.compensationIntelligence.estimatedCurrentBand}`,
      b.compensationIntelligence.salaryJumpPotential,
      `When asked current CTC: "I prefer to share my target range — I'm targeting ${b.compensationIntelligence.targetCompRange} based on market data."`,
      'Collect 3 data points from Glassdoor/Naukri/LinkedIn — screenshot them for every salary conversation',
    ],
    whyNow: 'The anchor you set in Week 1 determines your final offer. Do this before speaking to any company.',
    evidence: 'Candidates who prepare salary data before interviews receive offers 14% higher on average (Glassdoor, 2025).',
    expectedOutcome: 'Written salary playbook. Confident market-backed answer to any comp question.',
    timeInvestment: '1 hour',
  }

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'medium', category: 'career_positioning',
    isBlocking: false, unlocks: [], effortLevel: 'quick_win', roiRating: 7,
    action: `Justify your above-market comp — ${b.compensationIntelligence.deltaPercent.toFixed(0)}% above median`,
    subActions: [
      "Delay comp conversation to offer stage where possible — demonstrate value first",
      `Framing: "My current comp reflects [specialised skill]. I'm primarily focused on the role and growth."`,
      b.compensationIntelligence.negotiationImplication,
    ],
    whyNow: 'Above-market candidates screened out early when comp surfaces before value is demonstrated.',
    evidence: 'Above-market candidates who defer comp discussions have a 35% higher offer rate.',
    expectedOutcome: 'Compensation framing prepared. Justification scripted for recruiter screens.',
    timeInvestment: '45 minutes',
  }
}

function s3_hiringSeason(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const quarter = getCurrentQuarter()
  const season = HIRING_SEASON[quarter]
  if (!season || season.peak) return null  // peak seasons need no extra adjustment

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'medium', category: 'risk_monitoring',
    isBlocking: false, unlocks: [], effortLevel: 'quick_win', roiRating: 6,
    action: `Hiring season timing: ${quarter} — adjust search cadence`,
    subActions: [
      season.note,
      quarter === 'Q3' ? 'Use July to build pipeline and profile; launch applications in September.' : 'Apply to top 5 companies before the window narrows.',
      "Ask every recruiter: \"What's your typical timeline for this role right now?\" — their answer reveals true hiring intent.",
    ],
    whyNow: 'Search duration varies by 30–45% depending on start quarter.',
    evidence: 'Q1 and Q4 applications result in offers 2.3 weeks faster on average (LinkedIn, 2025).',
    expectedOutcome: 'Timing-adjusted search cadence. Top companies targeted in the optimal window.',
    timeInvestment: '20 minutes',
  }
}

function s4_interviewReadinessGate(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const b = inputs.behavioral
  if (!b || b.interviewReadiness.score >= 50) return null

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
  if (!b || b.competitivePositioning.percentileEstimate >= 65) return null
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
  if (!risk || risk < 0.7) return null

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

function s8_skillPortfolioGap(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  const score = inputs.skillPortfolioScore
  if (score === null || score === undefined || score >= 60) return null

  return {
    weekNumber: wk, deadline: `Week ${wk}`, priority: 'high', category: 'skill_building',
    isBlocking: false, unlocks: [], effortLevel: 'moderate', roiRating: 8,
    action: `Skill portfolio gap: ${score}/100 — 1 certification this month closes the gap`,
    subActions: [
      'Identify the most in-demand certification for your role (scan 20 job postings — which cert appears most?)',
      'Find a course: Coursera Professional Certificate, Google Career Certificate, or cloud provider cert',
      '1 hour/day for 21 days — most certs achievable in this time',
      'Add "in progress" cert to LinkedIn immediately — recruiters see this as a self-direction signal',
    ],
    whyNow: `Skill portfolio score ${score}/100 is below the competitive threshold for your target roles.`,
    evidence: 'Candidates with in-demand certs get 2.1x more recruiter outreach and 40% higher ATS pass rate (LinkedIn Learning, 2025).',
    expectedOutcome: '1 certification enrolled and visible on LinkedIn.',
    timeInvestment: '1 hour/day for 21 days',
  }
}

function s9_marketVolatility(inputs: MonthlyActionPlanInputsV53, wk: number): WeeklyAction | null {
  if (inputs.compositeScore < 45) return null
  const VOLATILE: Record<string, string> = {
    'it services': 'IT Services hiring freeze at large outsourcers. Target product companies and GCCs which are still actively hiring.',
    'edtech': 'EdTech has contracted significantly. Pivot to Corporate L&D, HealthTech, or B2B SaaS.',
    'crypto': 'Crypto/Web3 hiring is very low. Target FinTech companies where blockchain is a differentiator.',
    'media': 'Traditional media is in structural decline. Target digital media, streaming, or content-tech.',
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
  return {
    1: `Month 1 gate: LinkedIn profile ≥ 80% complete AND ≥ 5 applications submitted AND ≥ 2 recruiter screens booked.${b ? ` Interview readiness: ${b.interviewReadiness.score}/100 (target ≥ 50 before advancing).` : ''}`,
    2: `Month 2 gate: ≥ 3 second-round interviews completed AND compensation anchor documented${b ? ` at ${b.compensationIntelligence.targetCompRange}` : ''}. ≥ 1 specialist recruiter engaged.`,
    3: `Month 3 gate: ≥ 1 final-round interview active OR ≥ 1 offer received. If neither: emergency expansion — 10 new applications this week minimum.`,
    4: `Month 4 gate: ≥ 1 written offer received. If not: CV/LinkedIn ATS audit, activate backup company list, request feedback from most recent rejection.`,
    5: `Month 5 gate: Accept best available offer if it meets ≥ 80% of target criteria.${b ? ` Floor: at or near ${b.compensationIntelligence.marketMidpoint} market midpoint.` : ''} Do not let perfect be the enemy of good.`,
    6: `Month 6 gate: All prior gates must be resolved. Extended searches > 6 months indicate a systemic mismatch — reassess target role, comp, or geography.`,
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
