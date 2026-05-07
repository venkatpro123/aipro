// ═══════════════════════════════════════════════════════════════════════════════
// services_hr.ts — Human Resources, People Ops & L&D Intelligence
// Split from services.ts for modularity and lazy loading.
// Covers: hr_*, L&D adjacent roles + 15 new roles
// ═══════════════════════════════════════════════════════════════════════════════
import { CareerIntelligence } from './types.ts';

export const SERVICES_HR_INTELLIGENCE: Record<string, CareerIntelligence> = {
  // ── Existing Roles (migrated) ────────────────────────────────────────────────
  hr_recruit: {
    displayRole: 'Recruiter',
    summary: 'Moderate resilience in candidate relationship; extreme disruption in screening and sourcing.',
    skills: {
      obsolete: [
        { skill: 'Resume/CV screening', riskScore: 96, riskType: 'Automatable', horizon: '1yr', reason: 'AI screens resumes faster and removes human bias, as demanded by organisations.', aiReplacement: 'Full', aiTool: 'LinkedIn Recruiter AI, Greenhouse AI' },
        { skill: 'Boolean search sourcing', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI agents source candidates from multiple platforms simultaneously.', aiReplacement: 'Full' },
      ],
      at_risk: [{ skill: 'Standard interview scheduling', riskScore: 78, riskType: 'Automatable', horizon: '1yr', reason: 'AI scheduling tools manage the entire interview lifecycle.', aiReplacement: 'Full' }],
      safe: [
        { skill: 'Strategic Talent Intelligence', whySafe: 'Advising leaders on executive hiring and cultural fit at the leadership level.', longTermValue: 95, difficulty: 'High' },
        { skill: 'Complex Candidate Negotiation', whySafe: 'Closing senior executives with competing offers requires human intuition, influence, and trust.', longTermValue: 96, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Talent Intelligence Specialist', riskReduction: 55, skillGap: 'Market mapping, Competitive talent analytics', transitionDifficulty: 'Medium', industryMapping: ['Corporate HR'], salaryDelta: '+30-60%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
      { role: 'Executive Search Consultant', riskReduction: 50, skillGap: 'C-suite network development, Board advisory', transitionDifficulty: 'Hard', industryMapping: ['Executive Search Firms'], salaryDelta: '+50-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
      { role: 'TA Technology Lead (ATS)', riskReduction: 62, skillGap: 'AI recruiting tools, Data analytics', transitionDifficulty: 'Medium', industryMapping: ['Tech Companies'], salaryDelta: '+30-60%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
    ],
    roadmap: {
      '0-2': { phase_1: { timeline: '60 days', focus: 'AI Tool Mastery', actions: [{ action: 'Become the AI recruiting tool expert in your team', why: 'The recruiter who can evaluate AI tools is the recruiter who keeps their job.', outcome: 'Differentiated market position', tool: 'Greenhouse, Lever, LinkedIn Talent Insights' }] } },
      '5-10': { phase_1: { timeline: '90 days', focus: 'Market Specialization', actions: [{ action: 'Pick a 2-3 role specialization and build deep candidate network in that niche', why: 'Niche specialists are the last to be automated.', outcome: 'Premium placement rates and referral network' }] } },
    },
    inactionScenario: 'General recruiters who compete with AI on volume will lose. Executive search, niche specialization, and talent strategy are the survival paths.',
    riskTrend: [{ year: 2024, riskScore: 45, label: 'Now' }, { year: 2025, riskScore: 55, label: '+1yr' }, { year: 2026, riskScore: 65, label: '+2yr' }, { year: 2027, riskScore: 72, label: '+3yr' }, { year: 2028, riskScore: 78, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['hr-sector', 'high-risk', 'automation-zone', 'action-required'],
    evolutionHorizon: '2026',
  },
  hr_hrbp: {
    displayRole: 'HR Business Partner',
    summary: 'High resilience; translating human organizational complexity into strategic people interventions.',
    skills: {
      obsolete: [{ "skill": "Manual exit interview data compilation and theme summarisation", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI people analytics tools auto-theme exit interview responses and generate attrition insight reports.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard HR metrics reporting', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI HR dashboards auto-generate attrition, engagement, and DEI metrics.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Cultural Change Management', whySafe: 'Guiding organizations through mergers, AI adoption, and leadership transitions requires human empathy and political navigation.', longTermValue: 97, difficulty: 'High' },
        { skill: 'Difficult Performance Conversations', whySafe: 'Managing the human emotional complexity of PIPs, exits, and team conflicts is irreducibly human.', longTermValue: 96, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief People Officer', riskReduction: 45, skillGap: 'Board-level business strategy, P&L understanding', transitionDifficulty: 'Hard', industryMapping: ['Corporate'], salaryDelta: '+50-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
      { role: 'Organizational Design Consultant', riskReduction: 55, skillGap: 'Systems thinking, Process architecture', transitionDifficulty: 'Medium', industryMapping: ['Consulting'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
      { role: 'AI Change Management Lead', riskReduction: 62, skillGap: 'AI transformation methodology, Organizational behavior', transitionDifficulty: 'Medium', industryMapping: ['All sectors'], salaryDelta: '+40-80%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
    ],
    riskTrend: [{ year: 2024, riskScore: 25, label: 'Now' }, { year: 2025, riskScore: 28, label: '+1yr' }, { year: 2026, riskScore: 32, label: '+2yr' }, { year: 2027, riskScore: 38, label: '+3yr' }, { year: 2028, riskScore: 42, label: '+4yr' }],
    confidenceScore: 96,
    contextTags: ['hr-sector', 'ai-resilient', 'leadership-premium', 'change-management'],
    evolutionHorizon: '2028',
  },
  hr_comp: {
    displayRole: 'Compensation & Benefits Specialist',
    summary: 'High disruption in data analysis; resilience in executive incentive and equity design.',
    skills: {
      obsolete: [{ skill: 'Manual salary benchmarking surveys', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI analyzes real-time compensation data from hundreds of sources instantly.', aiReplacement: 'Full', aiTool: 'Radford AI, Mercer Benchmark AI' }],
      at_risk: [{ skill: 'Standard benefits administration', riskScore: 82, riskType: 'Automatable', horizon: '2yr', reason: 'Benefits platforms automate enrollment, claims, and compliance tracking.', aiReplacement: 'Full' }],
      safe: [
        { skill: 'Executive Incentive Design', whySafe: 'Designing performance triggers that align with long-term culture and Board expectations requires human strategic synthesis.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Equity Plan Architecture', whySafe: 'Structuring ESOP/RSU plans for pre-IPO companies requires legal, financial, and motivational human judgment.', longTermValue: 97, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Total Rewards Director', riskReduction: 58, skillGap: 'Global tax strategy, Executive compensation regulations', transitionDifficulty: 'Hard', industryMapping: ['Enterprise'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
      { role: 'Compensation Strategy Consultant', riskReduction: 62, skillGap: 'Consulting skills, Multi-client management', transitionDifficulty: 'Medium', industryMapping: ['Consulting'], salaryDelta: '+50-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 45, label: '+1yr' }, { year: 2026, riskScore: 55, label: '+2yr' }, { year: 2027, riskScore: 62, label: '+3yr' }, { year: 2028, riskScore: 68, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['hr-sector', 'moderate-risk', 'data-intensive', 'executive-comp'],
    evolutionHorizon: '2027',
  },

  // ── New HR Roles ──────────────────────────────────────────────────────────────
  hr_people_analytics: {
    displayRole: 'People Analytics Lead',
    summary: 'High growth; translating workforce data into strategic HR decisions — a uniquely human synthesis role.',
    skills: {
      obsolete: [{ "skill": "Manual HR metrics dashboard construction in spreadsheets", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI people analytics platforms auto-build and refresh HR dashboards from HRIS data feeds.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard dashboard report generation', riskScore: 80, riskType: 'Automatable', horizon: '2yr', reason: 'AI analytics platforms auto-generate people dashboards.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Workforce Risk Prediction Strategy', whySafe: 'Determining which attrition signals require intervention vs. healthy turnover requires human organizational context.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Ethical AI in HR Governance', whySafe: 'Ensuring algorithmic hiring and performance tools do not create discriminatory outcomes — a human accountability function.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Chief People Analytics Officer', riskReduction: 30, skillGap: 'Data science, Machine learning, R/Python', transitionDifficulty: 'Hard', industryMapping: ['Large Enterprise'], salaryDelta: '+80-180%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2026, riskScore: 20, label: '+2yr' }, { year: 2027, riskScore: 18, label: '+3yr' }, { year: 2028, riskScore: 17, label: '+4yr' }, { year: 2029, riskScore: 16, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['hr-sector', 'ai-resilient', 'data-intensive', 'emerging-role', 'leadership-premium'],
    evolutionHorizon: '2029',
  },
  hr_dei_director: {
    displayRole: 'DEI & Belonging Director',
    summary: 'High resilience; human cultural equity work requires embodied human judgment and community trust.',
    skills: {
      obsolete: [{ "skill": "Manual diversity representation report compilation from HR data extracts", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI DEI analytics platforms auto-generate representation reports from HRIS data.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'DEI survey data compilation', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'AI platforms auto-analyze DEI survey data and generate standard reports.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Systemic Bias Architecture Redesign', whySafe: 'Identifying and eliminating institutionally embedded bias requires deep human cultural and historical understanding.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Marginalized Community Trust Building', whySafe: 'Building authentic trust with historically excluded groups requires lived experience and personal accountability.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Diversity Officer', riskReduction: 35, skillGap: 'Board-level strategy, Organizational policy design', transitionDifficulty: 'Hard', industryMapping: ['Large Enterprise', 'Public Sector'], salaryDelta: '+50-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2026, riskScore: 18, label: '+2yr' }, { year: 2027, riskScore: 20, label: '+3yr' }, { year: 2028, riskScore: 22, label: '+4yr' }, { year: 2029, riskScore: 24, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['hr-sector', 'ai-resilient', 'human-touch', 'leadership-premium', 'social-impact'],
    evolutionHorizon: '2029',
  },
  hr_ai_change_mgr: {
    displayRole: 'AI Transformation & Change Manager',
    summary: 'Extremely high demand; companies need human guides to navigate AI adoption and reduce employee resistance.',
    skills: {
      obsolete: [{ "skill": "Manual training needs analysis survey administration and data aggregation", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI L&D platforms auto-administer adaptive skill assessments and aggregate results into priority reports.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard communication plan calendar maintenance for project phases", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI project tools auto-schedule and send stakeholder communications from project timeline data.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Human Resistance to AI Navigation', whySafe: 'Understanding the psychological and cultural barriers to AI adoption within organisations — and designing pathways through them.', longTermValue: 99, difficulty: 'High' },
        { skill: 'AI Skills Gap Program Design', whySafe: 'Designing company-wide AI upskilling programs requires deep understanding of adult learning, change management, and business context.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Transformation Officer', riskReduction: 25, skillGap: 'P&L management, Enterprise AI platform expertise', transitionDifficulty: 'Hard', industryMapping: ['Global Enterprise'], salaryDelta: '+80-200%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    inactionScenario: 'This is one of the most in-demand roles of 2024-2027. Every enterprise undergoing AI adoption needs a human who can manage the people side of the transition.',
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2026, riskScore: 10, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 15, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['hr-sector', 'ai-resilient', 'emerging-role', 'high-demand', 'leadership-premium'],
    evolutionHorizon: '2028',
  },
  hr_workforce_planner: {
    displayRole: 'Strategic Workforce Planner',
    summary: 'High resilience; modeling future talent needs in an AI-disrupted world is irreducibly complex.',
    skills: {
      obsolete: [{ "skill": "Manual headcount reconciliation between approved budget and current FTE count", "riskScore": 93, "riskType": "Automatable", "horizon": "1yr", "reason": "AI workforce planning tools auto-reconcile approved headcount against live HRIS data in real-time.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Historical headcount trending', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI models predict headcount from historical patterns with high accuracy.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'AI Displacement Scenario Modeling', whySafe: 'Understanding which human roles will be displaced by AI — and when — requires human synthesis of technology, economics, and organizational change.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Skills Taxonomy Architecture', whySafe: 'Building the organizational "skills ontology" that enables AI-powered internal mobility.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Future of Work Strategy Lead', riskReduction: 35, skillGap: 'AI literacy, Scenario planning methodology', transitionDifficulty: 'Medium', industryMapping: ['Large Enterprise', 'Consulting'], salaryDelta: '+50-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2026, riskScore: 16, label: '+2yr' }, { year: 2027, riskScore: 15, label: '+3yr' }, { year: 2028, riskScore: 14, label: '+4yr' }, { year: 2029, riskScore: 14, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['hr-sector', 'ai-resilient', 'strategy-moat', 'emerging-role', 'high-demand'],
    evolutionHorizon: '2029',
  },
  hr_payroll_ops: {
    displayRole: 'Payroll Operations Manager',
    summary: 'Moderate resilience; disruption in processing; resilience in complex cross-border and compliance edge cases.',
    skills: {
      obsolete: [{ skill: 'Manual payroll data entry and reconciliation', riskScore: 97, riskType: 'Automatable', horizon: '1yr', reason: 'AI payroll platforms process payroll with near-zero error rates.', aiReplacement: 'Full', aiTool: 'Rippling, ADP, Workday AI' }],
      at_risk: [{ "skill": "Standard payroll tax withholding calculation verification for routine payroll runs", "riskScore": 82, "riskType": "Automatable", "horizon": "1yr", "reason": "AI payroll systems auto-calculate and verify tax withholdings for routine payroll runs.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Multi-Country Payroll Regulatory Compliance', whySafe: 'Navigating conflicting labor laws across 30+ countries requires deep human expertise that AI systems frequently get wrong.', longTermValue: 96, difficulty: 'High' },
        { skill: 'Payroll Fraud Investigation', whySafe: 'Detecting intentional payroll fraud schemes requires human adversarial thinking.', longTermValue: 94, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Global Payroll Director', riskReduction: 45, skillGap: 'International employment law, HRIS architecture', transitionDifficulty: 'Hard', industryMapping: ['Multinational Enterprise'], salaryDelta: '+40-80%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 42, label: 'Now' }, { year: 2025, riskScore: 52, label: '+1yr' }, { year: 2026, riskScore: 62, label: '+2yr' }, { year: 2027, riskScore: 70, label: '+3yr' }, { year: 2028, riskScore: 76, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['hr-sector', 'moderate-risk', 'automation-zone', 'compliance-driven'],
    evolutionHorizon: '2026',
  },
  hr_employee_exp: {
    displayRole: 'Employee Experience Designer',
    summary: 'High growth; designing the human experience of work in an AI-augmented environment.',
    skills: {
      obsolete: [{ "skill": "Manual employee pulse survey distribution and reminder management", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI engagement platforms auto-deploy, remind, and close pulse surveys on automated schedules.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard engagement score benchmarking against industry norms", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI people analytics platforms auto-benchmark engagement scores against industry and peer data.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Human-Centered Workplace Design', whySafe: 'Designing physical and cultural environments that foster human psychological safety, creativity, and belonging — requires human empathy research.', longTermValue: 98, difficulty: 'High' },
        { skill: 'AI-Human Collaboration Experience Design', whySafe: 'Designing how humans and AI tools work together in a way that does not burn out or alienate employees is a frontier human design challenge.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'VP Employee Experience', riskReduction: 35, skillGap: 'Brand strategy, Architecture, Behavioral science', transitionDifficulty: 'Hard', industryMapping: ['Large Tech', 'Financial Services'], salaryDelta: '+60-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2026, riskScore: 13, label: '+2yr' }, { year: 2027, riskScore: 12, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 12, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['hr-sector', 'ai-resilient', 'human-touch', 'emerging-role', 'design-thinking'],
    evolutionHorizon: '2029',
  },
};
