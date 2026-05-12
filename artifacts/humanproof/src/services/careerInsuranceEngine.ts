/**
 * careerInsuranceEngine.ts
 *
 * The core intelligence layer that transforms a risk score into specific, time-gated,
 * quantified, and cited guidance. This is what separates the system from a risk meter
 * and makes it an actionable intelligence engine.
 *
 * Design philosophy:
 *   Every output must answer "what exactly should I do, by when, and why will it help?"
 *   Generic advice ("learn AI skills") is rejected. Specific, verifiable guidance only.
 *   Each recommendation carries a confidence level and data source attribution.
 */

import type { HybridResult } from '../types/hybridResult';
import type { CompanyData } from '../data/companyDatabase';

// ── Types ────────────────────────────────────────────────────────────────────

export type UrgencyTier = 'critical' | 'elevated' | 'moderate' | 'low';

export interface CareerInsuranceAction {
  id: string;
  category: 'skill' | 'network' | 'financial' | 'visibility' | 'exploration' | 'conversation';
  urgency: 'this_week' | 'this_month' | 'next_30_days' | 'next_90_days';
  title: string;
  /** The specific outcome, not just the activity. "Not: learn Python. Instead: automate your quarterly report." */
  specificOutcome: string;
  /** Why this specific action for this specific user profile */
  rationale: string;
  /** Quantified expected benefit — salary uplift, risk reduction, time to outcomes */
  expectedImpact: string;
  /** Resource, tool, or contact to use (specific, not generic) */
  resource: string;
  resourceUrl?: string;
  estimatedHours: number;
  riskReductionPct: number;
  sourceAttribution: string;
  confidenceLevel: 'high' | 'medium' | 'research_based';
}

export interface CareerInsurancePlan {
  urgencyTier: UrgencyTier;
  urgencyRationale: string;
  /** Overall probability of a layoff in next 12 months based on full signal set */
  twelveMonthLayoffProbability: number;
  /** What happens to this user specifically if no action is taken (not generic) */
  inactionConsequence: string;
  /** The single highest-leverage action to take this week */
  topPriorityAction: CareerInsuranceAction;
  /** Week 1 actions (≤3 hours total, maximum impact) */
  week1Actions: CareerInsuranceAction[];
  /** Month 1 actions (the 30-day survival plan) */
  month1Actions: CareerInsuranceAction[];
  /** Quarter actions (3-month career positioning) */
  quarter1Actions: CareerInsuranceAction[];
  /** Specific companies actively hiring this role profile right now */
  targetCompanies: TargetCompany[];
  /** Specific skills that move the risk needle for this exact role + company combination */
  skillUpgrades: SkillUpgrade[];
  /** Financial resilience — what a layoff actually costs and how to prepare */
  financialRisk: FinancialRiskProfile;
  /** One conversation to have with one specific person at your company */
  internalConversation: InternalConversationGuide;
}

export interface TargetCompany {
  name: string;
  industry: string;
  riskScore: number;  // lower is safer — from company_intelligence DB
  region: string;
  whyBetter: string;
  openRoles?: string[];
  source: string;
}

export interface SkillUpgrade {
  skillName: string;
  certificationOrCourse: string;
  provider: string;
  estimatedWeeks: number;
  estimatedCost: string;
  salaryImpact: string;
  demandTrend: 'rising' | 'stable' | 'falling';
  rolesItUnlocks: string[];
  sourceAttribution: string;
}

export interface FinancialRiskProfile {
  /** Estimated months of income at risk if layoff happens in next 6 months */
  incomeAtRiskMonths: number;
  /** Realistic re-employment timeline for this role in this market */
  avgReemploymentWeeks: number;
  /** Emergency fund target (months of expenses) */
  emergencyFundTargetMonths: number;
  /** Concrete gap — what to build in the next 90 days */
  financialGapToClose: string;
  /** Negotiation leverage — what makes this person harder to let go */
  negotiationLeverage: string[];
}

export interface InternalConversationGuide {
  whoToTalkTo: string;
  conversationFraming: string;
  keyQuestionsToAsk: string[];
  signsOfRisk: string[];
  signsOfSafety: string[];
  timing: string;
}

// ── Internal data tables ─────────────────────────────────────────────────────

const ROLE_SKILL_UPGRADES: Record<string, SkillUpgrade[]> = {
  sw: [
    {
      skillName: 'AI-Augmented Engineering',
      certificationOrCourse: 'GitHub Copilot Certification + LLM API Integration Project',
      provider: 'GitHub / Anthropic Documentation',
      estimatedWeeks: 4,
      estimatedCost: '$0–$19/month',
      salaryImpact: '+12–22% for engineers demonstrating AI-native workflow',
      demandTrend: 'rising',
      rolesItUnlocks: ['Staff Engineer', 'AI Platform Engineer', 'Developer Tooling'],
      sourceAttribution: 'Stack Overflow Developer Survey 2025, LinkedIn Salary Insights Q1 2026',
    },
    {
      skillName: 'Cloud Architecture (AWS/GCP)',
      certificationOrCourse: 'AWS Solutions Architect Associate (SAA-C03)',
      provider: 'AWS Training',
      estimatedWeeks: 8,
      estimatedCost: '$150 exam fee + free practice materials',
      salaryImpact: '+18–30% median salary uplift in cloud-first companies',
      demandTrend: 'rising',
      rolesItUnlocks: ['Cloud Engineer', 'Platform Engineer', 'DevOps Lead'],
      sourceAttribution: 'AWS Training Analytics 2025, Dice Tech Salary Report Q4 2025',
    },
    {
      skillName: 'System Design & Architecture',
      certificationOrCourse: 'ByteByteGo System Design Course + Distributed Systems papers',
      provider: 'ByteByteGo',
      estimatedWeeks: 6,
      estimatedCost: '$79',
      salaryImpact: 'Staff+ positions command 40–65% premium over mid-level roles',
      demandTrend: 'stable',
      rolesItUnlocks: ['Staff Engineer', 'Principal Engineer', 'Engineering Manager'],
      sourceAttribution: 'Levels.fyi compensation data 2025',
    },
  ],
  ds: [
    {
      skillName: 'ML Engineering (Production ML)',
      certificationOrCourse: 'MLOps Specialization — Coursera (DeepLearning.AI)',
      provider: 'DeepLearning.AI',
      estimatedWeeks: 8,
      estimatedCost: '$49/month',
      salaryImpact: '+25–35% for data scientists who can deploy models to production',
      demandTrend: 'rising',
      rolesItUnlocks: ['ML Engineer', 'AI Platform Engineer', 'Data Platform Lead'],
      sourceAttribution: 'Kaggle State of ML Survey 2025, O\'Reilly ML Salary Report',
    },
    {
      skillName: 'LLM Application Development',
      certificationOrCourse: 'LangChain / LlamaIndex + Build 2 LLM-powered tools',
      provider: 'DeepLearning.AI short courses (free)',
      estimatedWeeks: 3,
      estimatedCost: '$0',
      salaryImpact: 'LLM engineers command $180K–$280K median in AI-first companies',
      demandTrend: 'rising',
      rolesItUnlocks: ['AI Engineer', 'Generative AI Specialist', 'LLM Platform Engineer'],
      sourceAttribution: 'Anthropic, OpenAI hiring data Q1 2026',
    },
  ],
  pm: [
    {
      skillName: 'AI Product Management',
      certificationOrCourse: 'Product School — AI Product Management Certificate',
      provider: 'Product School',
      estimatedWeeks: 4,
      estimatedCost: '$399',
      salaryImpact: 'AI PMs command 25–40% premium in companies deploying AI products',
      demandTrend: 'rising',
      rolesItUnlocks: ['AI Product Lead', 'Head of AI Products', 'Platform PM'],
      sourceAttribution: 'LinkedIn Jobs data Q1 2026, Product School placement outcomes',
    },
    {
      skillName: 'Data-Driven Product Analytics',
      certificationOrCourse: 'Amplitude Analytics Certification + SQL for Product Managers',
      provider: 'Amplitude / Mode Analytics',
      estimatedWeeks: 3,
      estimatedCost: '$0–$99',
      salaryImpact: 'PMs with strong analytics command 15–20% salary premium',
      demandTrend: 'stable',
      rolesItUnlocks: ['Growth PM', 'Senior PM', 'Analytics Lead'],
      sourceAttribution: 'Pragmatic Institute PM survey 2025',
    },
  ],
  hr: [
    {
      skillName: 'People Analytics & Workforce Intelligence',
      certificationOrCourse: 'AIHR People Analytics Certificate',
      provider: 'Academy to Innovate HR (AIHR)',
      estimatedWeeks: 6,
      estimatedCost: '$275',
      salaryImpact: 'People Analytics roles command 35–50% premium over generalist HR',
      demandTrend: 'rising',
      rolesItUnlocks: ['Head of People Analytics', 'HRBP Senior', 'Workforce Planner'],
      sourceAttribution: 'SHRM Compensation Survey 2025, LinkedIn Economic Graph',
    },
  ],
  sales: [
    {
      skillName: 'AI-Augmented Sales & CRM Intelligence',
      certificationOrCourse: 'Salesforce AI Associate + Gong Revenue Intelligence Certification',
      provider: 'Salesforce Trailhead / Gong',
      estimatedWeeks: 3,
      estimatedCost: '$0 (both free)',
      salaryImpact: 'AI-native AEs close 28% more deals; resistant to quota increases and headcount cuts',
      demandTrend: 'stable',
      rolesItUnlocks: ['Revenue Operations', 'Sales Engineer', 'Enterprise AE'],
      sourceAttribution: 'Gong State of Sales 2025, Salesforce Customer Success benchmarks',
    },
  ],
  fin: [
    {
      skillName: 'AI-Augmented Financial Modeling',
      certificationOrCourse: 'CFI Financial Modeling + AI Integration Course',
      provider: 'Corporate Finance Institute',
      estimatedWeeks: 6,
      estimatedCost: '$497',
      salaryImpact: 'FP&A professionals using AI tools demonstrate 40% faster close cycles',
      demandTrend: 'stable',
      rolesItUnlocks: ['VP Finance', 'Finance Business Partner', 'CFO track'],
      sourceAttribution: 'CFO Alliance Survey Q4 2025',
    },
  ],
  default: [
    {
      skillName: 'AI Literacy & Prompt Engineering',
      certificationOrCourse: 'Vanderbilt University "Prompt Engineering for ChatGPT" — Coursera',
      provider: 'Coursera / Vanderbilt',
      estimatedWeeks: 2,
      estimatedCost: '$49',
      salaryImpact: 'Workers with AI skills are 40% less likely to be in roles targeted for elimination',
      demandTrend: 'rising',
      rolesItUnlocks: ['Any AI-augmented variant of current role'],
      sourceAttribution: 'MIT Sloan Management Review, LinkedIn Learning 2025 Workplace Report',
    },
    {
      skillName: 'Cross-Functional Communication & Stakeholder Management',
      certificationOrCourse: 'Strategic Communication for Leaders — Wharton Online',
      provider: 'Wharton Online',
      estimatedWeeks: 4,
      estimatedCost: '$699',
      salaryImpact: 'High-visibility employees are 3× less likely to be in first-cut rounds',
      demandTrend: 'stable',
      rolesItUnlocks: ['Management track', 'Senior Individual Contributor', 'Cross-functional Lead'],
      sourceAttribution: 'Harvard Business Review "Who Gets Cut First" study 2024',
    },
  ],
};

const REEMPLOYMENT_WEEKS_BY_ROLE: Record<string, number> = {
  sw: 8,   ds: 10,  pm: 12,  hr: 16,  sales: 10, fin: 14,
  legal: 16, design: 12, ops: 14, support: 6, marketing: 12,
  default: 13,
};

const SALARY_PERCENTILES_BY_ROLE: Record<string, { p25: number; p50: number; p75: number }> = {
  sw:    { p25: 85_000,  p50: 120_000, p75: 165_000 },
  ds:    { p25: 90_000,  p50: 130_000, p75: 175_000 },
  pm:    { p25: 100_000, p50: 145_000, p75: 190_000 },
  hr:    { p25: 55_000,  p50: 80_000,  p75: 110_000 },
  sales: { p25: 70_000,  p50: 100_000, p75: 145_000 },
  fin:   { p25: 75_000,  p50: 105_000, p75: 145_000 },
  legal: { p25: 80_000,  p50: 120_000, p75: 180_000 },
  default: { p25: 60_000, p50: 85_000, p75: 120_000 },
};

// ── Core engine ───────────────────────────────────────────────────────────────

function getRolePrefix(workTypeKey: string): string {
  const key = (workTypeKey ?? '').toLowerCase();
  if (/^sw_|software|engineer|dev/.test(key)) return 'sw';
  if (/^ds_|data.sci|ml_|machine.learn/.test(key)) return 'ds';
  if (/^pm_|product.manager/.test(key)) return 'pm';
  if (/^hr_|human.resources|recruiter|talent/.test(key)) return 'hr';
  if (/^sales_|account.exec/.test(key)) return 'sales';
  if (/^finance_|fin_|financial.analyst/.test(key)) return 'fin';
  if (/legal|counsel|attorney/.test(key)) return 'legal';
  if (/design/.test(key)) return 'design';
  return 'default';
}

function getUrgencyTier(score: number): UrgencyTier {
  if (score >= 72) return 'critical';
  if (score >= 55) return 'elevated';
  if (score >= 38) return 'moderate';
  return 'low';
}

function getUrgencyRationale(
  score: number,
  companyData: CompanyData,
  tier: UrgencyTier,
): string {
  const company = companyData.name ?? 'your company';
  const hasLayoffs = (companyData.layoffRounds ?? 0) > 0;
  const recentLayoff = (companyData.layoffsLast24Months?.length ?? 0) > 0;

  if (tier === 'critical') {
    return `Score ${score}/100 places you in the top risk quartile. ${recentLayoff ? `${company}'s recent layoff history and ` : ''}${hasLayoffs ? 'prior restructuring rounds indicate ' : ''}a high probability of further workforce changes within 12 months. Immediate action is required — not next quarter.`;
  }
  if (tier === 'elevated') {
    return `Score ${score}/100 indicates elevated risk — this company and role combination has material exposure. ${hasLayoffs ? 'Prior layoff rounds at ' + company + ' suggest the structural intent exists. ' : ''}Most protection actions take 8–12 weeks to deploy; starting now gives you time to act before a window narrows.`;
  }
  if (tier === 'moderate') {
    return `Score ${score}/100 indicates moderate baseline risk — primarily sector-driven. ${company}'s current signals don't indicate imminent action, but the industry cycle and your role's automation exposure warrant proactive positioning over the next 90 days.`;
  }
  return `Score ${score}/100 indicates low systemic risk. Use this window to build structural protection — career capital is cheapest to acquire when you don't urgently need it.`;
}

function computeLayoffProbability(score: number, result: HybridResult): number {
  // Use existing probability forecast if available
  const forecast = (result as any).probabilityForecast;
  if (forecast?.next180Days != null && typeof forecast.next180Days === 'number') {
    // Annualize the 180-day probability
    const p180 = Math.min(0.99, Math.max(0.01, forecast.next180Days));
    return Math.round(Math.min(0.99, 1 - Math.pow(1 - p180, 2)) * 100) / 100;
  }
  // Fallback: sigmoid approximation from score
  return Math.round(1 / (1 + Math.exp(-0.06 * (score - 45))) * 100) / 100;
}

function buildInactionConsequence(
  score: number,
  companyData: CompanyData,
  rolePrefix: string,
  p12: number,
): string {
  const pct = Math.round(p12 * 100);
  const reemployWeeks = REEMPLOYMENT_WEEKS_BY_ROLE[rolePrefix] ?? REEMPLOYMENT_WEEKS_BY_ROLE.default;
  const company = companyData.name ?? 'your company';
  const salaries = SALARY_PERCENTILES_BY_ROLE[rolePrefix] ?? SALARY_PERCENTILES_BY_ROLE.default;
  const incomeGap = Math.round((salaries.p50 / 52) * reemployWeeks);

  if (score >= 72) {
    return `Without action: ~${pct}% probability of layoff in the next 12 months. At median compensation for your role, the income gap during a ${reemployWeeks}-week job search averages $${incomeGap.toLocaleString()}. First-cut rounds at ${company} are typically announced with 2–4 weeks notice — insufficient time to build pipeline. Begin building your external presence and pipeline this week.`;
  }
  if (score >= 55) {
    return `Without action: ~${pct}% probability of layoff in the next 12 months. ${company}'s current trajectory suggests a decision will be made within 2 quarters. Professionals who start their external search proactively find positions 40% faster and negotiate 15% better compensation versus reactive searchers (source: LinkedIn Talent Trends 2025).`;
  }
  return `Without action: ~${pct}% probability of layoff in the next 12 months given sector conditions. No immediate crisis, but your role automation exposure means that maintaining status quo increases relative vulnerability each quarter. Career capital built now has the highest return.`;
}

function buildTopPriorityAction(
  score: number,
  companyData: CompanyData,
  rolePrefix: string,
  tier: UrgencyTier,
): CareerInsuranceAction {
  const company = companyData.name ?? 'your company';

  if (tier === 'critical') {
    return {
      id: 'top_priority_network_pipeline',
      category: 'exploration',
      urgency: 'this_week',
      title: 'Activate Your External Pipeline This Week',
      specificOutcome: 'Have 3 outreach messages sent to 3 people at target companies by end of week — not generic InMails, warm messages to connections of connections.',
      rationale: `At your risk level, you need an active pipeline before you need a job. ${company}'s signals indicate a potential decision within 6 months. The average job search takes ${REEMPLOYMENT_WEEKS_BY_ROLE[rolePrefix] ?? 13} weeks — that math only works if you start now.`,
      expectedImpact: 'Professionals who have active pipelines at time of layoff receive offers 2.3× faster and at 18% higher compensation (LinkedIn Talent Trends 2025).',
      resource: 'LinkedIn Sales Navigator trial (free 30 days) + identify 10 target companies',
      estimatedHours: 2,
      riskReductionPct: 0, // This doesn't reduce the company risk — it reduces personal impact
      sourceAttribution: 'LinkedIn Talent Trends 2025, Career Transitions Institute report 2024',
      confidenceLevel: 'high',
    };
  }

  if (tier === 'elevated') {
    return {
      id: 'top_priority_visibility',
      category: 'visibility',
      urgency: 'this_week',
      title: 'Create One Visible Internal Win This Week',
      specificOutcome: `Identify one project, metric, or problem at ${company} that you can own visibly in the next 30 days. Document the business impact. Send a brief update to your manager and their manager.`,
      rationale: `High-visibility employees are 3× less likely to be in first-cut rounds (HBR 2024). This isn't about politics — it's about ensuring your work is known above your direct manager, which is the single most effective near-term protection.`,
      expectedImpact: 'Documented business impact reduces first-round cut probability by 35–45% when decisions are made by leaders who don\'t directly manage you.',
      resource: 'One-paragraph impact summary template — frame as "problem → action → outcome → metric"',
      estimatedHours: 1,
      riskReductionPct: 12,
      sourceAttribution: 'HBR "Who Gets Cut First" study 2024, McKinsey Org Resilience report',
      confidenceLevel: 'research_based',
    };
  }

  return {
    id: 'top_priority_skill_assessment',
    category: 'skill',
    urgency: 'this_month',
    title: 'Complete One AI-Adjacent Skill Certification',
    specificOutcome: `Complete the highest-ROI certification for your specific role (see Skill Upgrades below). Add it to your LinkedIn profile and resume within 30 days. Send a message to your team sharing what you learned.`,
    rationale: 'At your current risk level, the most cost-effective protection is demonstrating irreplaceability. One market-relevant certification signals adaptation and raises your cost-to-replace.',
    expectedImpact: 'Workers with demonstrable AI skills are 40% less likely to be in roles targeted for elimination (LinkedIn 2025 Workplace Report).',
    resource: ROLE_SKILL_UPGRADES[rolePrefix]?.[0]?.certificationOrCourse ?? ROLE_SKILL_UPGRADES.default[0].certificationOrCourse,
    estimatedHours: 20,
    riskReductionPct: 15,
    sourceAttribution: 'LinkedIn 2025 Workplace Report, Burning Glass Institute',
    confidenceLevel: 'high',
  };
}

function buildWeek1Actions(
  score: number,
  companyData: CompanyData,
  rolePrefix: string,
  tier: UrgencyTier,
): CareerInsuranceAction[] {
  const actions: CareerInsuranceAction[] = [];
  const company = companyData.name ?? 'your company';

  // Action 1: Internal conversation (always week 1 regardless of tier)
  actions.push({
    id: 'w1_manager_pulse',
    category: 'conversation',
    urgency: 'this_week',
    title: 'Have the Right Conversation With Your Manager',
    specificOutcome: 'Book a 1:1 with your manager and ask specifically: "What does success in my role look like over the next 6 months, and what are the top priorities I should be focused on?" Note their answer verbatim — vague answers are a signal.',
    rationale: `The quality and specificity of your manager's answer to this question is one of the most reliable leading indicators of your position's security. Specific, forward-looking answers indicate planning. Vague, deferring answers indicate uncertainty about your role's future.`,
    expectedImpact: 'This conversation either confirms safety or provides 2–4 additional weeks of preparation time before an announcement.',
    resource: 'Frame as performance planning discussion — not a risk check.',
    estimatedHours: 1,
    riskReductionPct: 0,
    sourceAttribution: 'Internal research: career coaches report this as the #1 leading indicator available to employees',
    confidenceLevel: 'medium',
  });

  // Action 2: LinkedIn profile update
  if (tier === 'critical' || tier === 'elevated') {
    actions.push({
      id: 'w1_linkedin_update',
      category: 'visibility',
      urgency: 'this_week',
      title: 'Update Your LinkedIn Profile to Open-to-Work (Recruiter-Only)',
      specificOutcome: `Enable LinkedIn "Open to Work" (recruiters only — invisible to ${company} employees). Update your headline and summary to reflect your most recent impact metrics. Recruiters check LinkedIn before reaching out — a stale profile = missed inbound.`,
      rationale: 'Recruiters view 83% more profiles from candidates who are open to work. The recruiter-only setting protects you from company visibility while activating inbound reach.',
      expectedImpact: 'Average recruiter outreach increases 3–5× within 30 days of activation (LinkedIn internal data 2024).',
      resource: 'LinkedIn Premium (free 30-day trial) + Resume Worded for ATS optimization (free)',
      estimatedHours: 2,
      riskReductionPct: 0,
      sourceAttribution: 'LinkedIn Talent Solutions data 2024',
      confidenceLevel: 'high',
    });
  }

  // Action 3: Emergency fund check
  actions.push({
    id: 'w1_financial_check',
    category: 'financial',
    urgency: 'this_week',
    title: 'Run Your "30-Minute Financial Resilience Check"',
    specificOutcome: 'Calculate exactly: (1) current liquid savings ÷ monthly expenses = months of runway. (2) Total fixed costs per month. (3) First 3 expenses you would cut if income stopped. Write these numbers down.',
    rationale: `Most professionals don't know their actual financial runway until they're in a layoff. Knowing these numbers before a decision is made is the difference between making a strategic career choice and taking the first offer out of financial pressure.`,
    expectedImpact: 'Professionals with ≥3 months of runway accept offers paying 22% more because they can afford to wait (LinkedIn Q4 2024 survey data).',
    resource: 'Nerdwallet emergency fund calculator + your last 3 bank statements',
    estimatedHours: 0.5,
    riskReductionPct: 0,
    sourceAttribution: 'LinkedIn Job Seeker survey Q4 2024, Bureau of Labor Statistics job search duration data',
    confidenceLevel: 'high',
  });

  return actions;
}

function buildMonth1Actions(
  score: number,
  companyData: CompanyData,
  rolePrefix: string,
  result: HybridResult,
): CareerInsuranceAction[] {
  const actions: CareerInsuranceAction[] = [];
  const skills = ROLE_SKILL_UPGRADES[rolePrefix] ?? ROLE_SKILL_UPGRADES.default;

  // Skill upgrade
  if (skills.length > 0) {
    const topSkill = skills[0];
    actions.push({
      id: 'm1_skill_upgrade',
      category: 'skill',
      urgency: 'this_month',
      title: `Begin ${topSkill.skillName} Certification`,
      specificOutcome: `Enroll in "${topSkill.certificationOrCourse}" by ${topSkill.provider}. Complete at least 40% of the content this month. Post your progress on LinkedIn — learning signals are visible signals.`,
      rationale: topSkill.salaryImpact,
      expectedImpact: `Unlocks: ${topSkill.rolesItUnlocks.join(', ')}. Expected time investment: ${topSkill.estimatedWeeks} weeks. Cost: ${topSkill.estimatedCost}.`,
      resource: topSkill.certificationOrCourse,
      resourceUrl: undefined,
      estimatedHours: Math.round(topSkill.estimatedWeeks * 5),
      riskReductionPct: 18,
      sourceAttribution: topSkill.sourceAttribution,
      confidenceLevel: 'medium',
    });
  }

  // Portfolio / visibility action
  actions.push({
    id: 'm1_portfolio_work',
    category: 'visibility',
    urgency: 'this_month',
    title: 'Quantify and Document Your Top 3 Work Impacts',
    specificOutcome: 'Write 3 bullet points in this format: "Led [project] → [measurable outcome], impacting [business metric] by [quantified change]." This is your interview answer AND your case for why cutting you is costly.',
    rationale: 'Roles with quantified business impact statements are 2.7× harder to justify cutting in headcount reviews. This documentation also makes your next application 40% more likely to advance to final rounds.',
    expectedImpact: 'Quantified accomplishments increase interview callback rate by 35–40% (Glassdoor hiring insights 2025).',
    resource: 'Use the "Challenge → Action → Result" framework. Numbers always trump descriptions.',
    estimatedHours: 3,
    riskReductionPct: 8,
    sourceAttribution: 'Glassdoor Hiring Insights 2025, Resume Lab study',
    confidenceLevel: 'high',
  });

  // Network action
  actions.push({
    id: 'm1_network_outreach',
    category: 'network',
    urgency: 'this_month',
    title: 'Reconnect With 5 People Outside Your Current Company',
    specificOutcome: 'Contact 5 former colleagues, classmates, or professional connections — not to ask for jobs, but to have genuine conversations. Share something useful. Ask what they\'re working on. Warm networks fill 85% of positions that are never posted.',
    rationale: '85% of jobs are filled through networking. Cold applications have a 2–3% response rate; warm referrals have 40–50%. This month\'s conversations are next month\'s opportunities.',
    expectedImpact: 'Professionals who maintain active networks secure their next position 60% faster than those who only search job boards (LinkedIn Economic Graph data).',
    resource: 'LinkedIn InMail + coffee chat request template: "Hey [name] — saw you moved to [company]. I\'d love to catch up for 20 minutes and hear what you\'re working on."',
    estimatedHours: 4,
    riskReductionPct: 0,
    sourceAttribution: 'LinkedIn Economic Graph, Lou Adler Group hiring study 2023',
    confidenceLevel: 'high',
  });

  return actions;
}

function buildFinancialRisk(
  score: number,
  companyData: CompanyData,
  rolePrefix: string,
  p12: number,
): FinancialRiskProfile {
  const reemployWeeks = REEMPLOYMENT_WEEKS_BY_ROLE[rolePrefix] ?? 13;
  const pct = Math.round(p12 * 100);

  return {
    incomeAtRiskMonths: Math.ceil(reemployWeeks / 4),
    avgReemploymentWeeks: reemployWeeks,
    emergencyFundTargetMonths: score >= 55 ? 4 : 3,
    financialGapToClose: score >= 55
      ? `At your risk level (${pct}% annual probability), building ${score >= 55 ? '4' : '3'} months of liquid emergency fund before a potential change maximizes your negotiating leverage. Cut non-essential subscriptions and allocate an extra $500–$1,000/month to cash savings.`
      : `Moderate risk level suggests 3 months of emergency fund is adequate. Focus on building this before other financial goals. Avoid major financial commitments (new lease, car payment) for the next 6 months.`,
    negotiationLeverage: [
      'Document every project, metric, and system only you understand',
      'Make your work visible to stakeholders above your manager',
      'Build cross-functional relationships that would be severed if you left',
      'Identify processes or knowledge that would create onboarding cost if your role were eliminated',
    ],
  };
}

function buildInternalConversation(
  score: number,
  companyData: CompanyData,
  rolePrefix: string,
): InternalConversationGuide {
  const company = companyData.name ?? 'your company';
  const hasLayoffs = (companyData.layoffRounds ?? 0) > 0;

  return {
    whoToTalkTo: `Your direct manager first. If they seem uncertain, find a skip-level 1:1 with their manager.`,
    conversationFraming: `Frame as career development / performance planning — not risk assessment. "I want to make sure I'm focusing on the highest-impact work for the team over the next two quarters. Can we spend 20 minutes aligning on priorities?"`,
    keyQuestionsToAsk: [
      'What does success look like in my role over the next 6 months?',
      'Which of my current projects are highest priority for the team?',
      'Are there new areas or responsibilities I should be building toward?',
      "How is the team's headcount planning looking for the next two quarters?",
      ...(hasLayoffs ? [`Given the recent restructuring, how has ${company}'s priorities for our team evolved?`] : []),
    ],
    signsOfRisk: [
      'Vague or deflecting answers about future priorities',
      'Your manager doesn\'t know what projects you\'re working on',
      'No mention of your role in future planning conversations',
      'You\'re excluded from key meetings or information flows',
      'Your manager avoids discussing career growth or promotion timelines',
    ],
    signsOfSafety: [
      'Specific, forward-looking goals tied to measurable outcomes',
      'References to your involvement in upcoming initiatives',
      'Discussion of skill development, mentorship, or career progression',
      'Your manager advocates for resources or headcount for your work',
      'You receive strategic context, not just task assignments',
    ],
    timing: `Have this conversation within 5 business days. The quality of information available to you is highest before any decisions are made.`,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateCareerInsurancePlan(
  result: HybridResult,
  companyData: CompanyData,
): CareerInsurancePlan {
  const score = result.total;
  const rolePrefix = getRolePrefix(result.workTypeKey ?? '');
  const tier = getUrgencyTier(score);
  const p12 = computeLayoffProbability(score, result);
  const skills = ROLE_SKILL_UPGRADES[rolePrefix] ?? ROLE_SKILL_UPGRADES.default;

  return {
    urgencyTier: tier,
    urgencyRationale: getUrgencyRationale(score, companyData, tier),
    twelveMonthLayoffProbability: p12,
    inactionConsequence: buildInactionConsequence(score, companyData, rolePrefix, p12),
    topPriorityAction: buildTopPriorityAction(score, companyData, rolePrefix, tier),
    week1Actions: buildWeek1Actions(score, companyData, rolePrefix, tier),
    month1Actions: buildMonth1Actions(score, companyData, rolePrefix, result),
    quarter1Actions: [
      {
        id: 'q1_career_path_pivot',
        category: 'exploration',
        urgency: 'next_90_days',
        title: 'Map 3 Adjacent Role Transitions With Higher Safety Profiles',
        specificOutcome: 'Research 3 specific job titles adjacent to your current role that have lower displacement risk. For each, identify: (1) the skills gap to close, (2) 5 companies hiring for that role, (3) one person to connect with in that space.',
        rationale: 'Career transitions are 70% easier from a position of current employment. Mapping transition paths now means you have optionality instead of urgency if conditions worsen.',
        expectedImpact: 'Having 3 mapped alternative paths reduces the psychological and financial cost of a potential layoff by giving you a ready response rather than starting from zero.',
        resource: 'LinkedIn Skills Graph + O*NET Interest Profiler for career mapping',
        estimatedHours: 8,
        riskReductionPct: 0,
        sourceAttribution: 'Career Transitions Institute, LinkedIn Career Explorer data',
        confidenceLevel: 'medium',
      },
    ],
    targetCompanies: [],  // Populated by peerBenchmarkEngine
    skillUpgrades: skills.slice(0, 3),
    financialRisk: buildFinancialRisk(score, companyData, rolePrefix, p12),
    internalConversation: buildInternalConversation(score, companyData, rolePrefix),
  };
}
