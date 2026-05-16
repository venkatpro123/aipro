// crossIndustryTransitionMap.ts — v37.0 Phase 4
// Maps (sourceRole, targetIndustry) → transition difficulty, skill gap, and timeline.
//
// This is role-specific (not just role-family), covering the most common career pivots.
// It answers: "I am a petroleum engineer — can I move into renewable energy?"
// with specific skill gaps and a calibrated timeline.
//
// Difficulty scale:
//   'easy'      — 0–6 months, high portability, skill overlap is strong
//   'moderate'  — 6–18 months, achievable with focused upskilling
//   'hard'      — 18–36 months, significant credential or skill gap
//   'very_hard' — 36+ months, near-restart required

export type TransitionDifficulty = 'easy' | 'moderate' | 'hard' | 'very_hard';

export interface CrossIndustryTransition {
  sourceRole: string;
  targetIndustry: string;
  difficulty: TransitionDifficulty;
  /** Estimated weeks to achieve a successful transition */
  timelineWeeks: number;
  /** Ordered by urgency — learn these first */
  skillGaps: string[];
  /** Assets from the current role that accelerate the transition */
  transferableStrengths: string[];
  /** Specific roles in the target industry that are the best entry points */
  targetRoleSuggestions: string[];
  note: string;
}

// Key: `${sourceRole}::${targetIndustry}`
const TRANSITION_MAP: Record<string, CrossIndustryTransition> = {

  // ─── Petroleum / Reservoir Engineers → Renewables ────────────────────────
  'petroleum_engineer::renewable_energy': {
    sourceRole: 'petroleum_engineer',
    targetIndustry: 'renewable_energy',
    difficulty: 'moderate',
    timelineWeeks: 32,
    skillGaps: ['PV systems fundamentals', 'Wind turbine engineering basics', 'Battery storage + BESS design', 'GIS for site assessment', 'Carbon accounting (Scope 1/2/3)'],
    transferableStrengths: ['Reservoir simulation → geological modeling for geothermal', 'Drilling expertise → geothermal well design', 'HSE management', 'Project finance and CapEx modeling', 'Regulatory compliance experience'],
    targetRoleSuggestions: ['Geothermal Reservoir Engineer', 'Subsurface Energy Storage Engineer', 'Energy Transition Project Manager', 'Renewables Project Developer'],
    note: 'Petroleum engineers are the single best-positioned group for the energy transition. Reservoir simulation skills map directly to geothermal and underground hydrogen storage.',
  },

  'petroleum_engineer::consulting': {
    sourceRole: 'petroleum_engineer',
    targetIndustry: 'consulting',
    difficulty: 'moderate',
    timelineWeeks: 24,
    skillGaps: ['Strategy framework literacy (McKinsey 7S, Porter)', 'Client presentation skills', 'Excel financial modeling beyond DCF', 'Case interview methodology'],
    transferableStrengths: ['Quantitative rigor', 'CapEx/OpEx optimization track record', 'Field operations knowledge', 'Cross-functional project leadership'],
    targetRoleSuggestions: ['Energy Transition Consultant', 'Operations/Asset Management Consultant', 'Strategy Analyst at energy advisory firm'],
    note: 'Energy and O&G consulting practices actively recruit petroleum engineers. The case interview is the main barrier.',
  },

  // ─── Clinical Nurse → Related ─────────────────────────────────────────────
  'registered_nurse::healthcare_admin': {
    sourceRole: 'registered_nurse',
    targetIndustry: 'healthcare_admin',
    difficulty: 'easy',
    timelineWeeks: 12,
    skillGaps: ['Healthcare administration fundamentals (MHA or certificate)', 'Budgeting and P&L basics', 'Healthcare policy and reimbursement literacy'],
    transferableStrengths: ['Patient care workflow knowledge', 'Clinical staff management', 'Quality improvement experience', 'Regulatory (CMS/Joint Commission) familiarity'],
    targetRoleSuggestions: ['Nurse Manager', 'Clinical Operations Manager', 'Patient Experience Director', 'Quality and Patient Safety Coordinator'],
    note: 'The most natural transition for experienced nurses — direct patient care experience is uniquely valued in admin roles that manage clinical teams.',
  },

  'registered_nurse::pharma_biotech': {
    sourceRole: 'registered_nurse',
    targetIndustry: 'pharma_biotech',
    difficulty: 'easy',
    timelineWeeks: 16,
    skillGaps: ['GCP (Good Clinical Practice) certification', 'ICH guidelines basics', 'Clinical data management systems (Medidata, Oracle Clinical)', 'Regulatory submission overview'],
    transferableStrengths: ['Patient assessment and adverse event recognition', 'Protocol adherence and documentation discipline', 'Informed consent experience', 'Cross-functional coordination in clinical settings'],
    targetRoleSuggestions: ['Clinical Research Associate (CRA)', 'Clinical Research Coordinator', 'Medical Science Liaison', 'Drug Safety Associate'],
    note: 'CRAs are almost always required to have clinical experience. GCP certification is the key unlock.',
  },

  'registered_nurse::consulting': {
    sourceRole: 'registered_nurse',
    targetIndustry: 'consulting',
    difficulty: 'moderate',
    timelineWeeks: 36,
    skillGaps: ['Business case development', 'Healthcare economics and ROI frameworks', 'Client advisory positioning', 'PowerPoint executive narratives', 'Process mapping (Lean/Six Sigma basics)'],
    transferableStrengths: ['Clinical credibility in healthcare consulting mandates', 'Protocol compliance rigor', 'Team coordination in high-stakes environments', 'Patient outcome focus'],
    targetRoleSuggestions: ['Clinical Advisor at healthcare consulting firm', 'Healthcare IT Implementation Consultant', 'Value-Based Care Consultant'],
    note: 'Healthcare consulting firms (Huron, Sg2, Advisory Board) specifically hire clinical talent. The bridge is business communication and case framing.',
  },

  // ─── Corporate Attorney → Related ─────────────────────────────────────────
  'corporate_attorney::consulting': {
    sourceRole: 'corporate_attorney',
    targetIndustry: 'consulting',
    difficulty: 'easy',
    timelineWeeks: 16,
    skillGaps: ['Strategy frameworks (BCG matrix, value chain)', 'Client relationship advisory vs. adversarial positioning', 'PowerPoint narrative structure', 'Revenue accountability exposure'],
    transferableStrengths: ['Due diligence and risk analysis', 'Regulatory expertise (compliance consulting)', 'Contract negotiation and drafting', 'Structured written communication', 'M&A process knowledge'],
    targetRoleSuggestions: ['Legal Operations Consultant', 'Regulatory Affairs Consultant', 'M&A Strategy Consultant', 'Compliance Advisory Manager'],
    note: 'Corporate attorneys are highly valued in risk, compliance, and M&A consulting. The shift is from adversarial to advisory framing.',
  },

  'corporate_attorney::finance': {
    sourceRole: 'corporate_attorney',
    targetIndustry: 'finance',
    difficulty: 'moderate',
    timelineWeeks: 28,
    skillGaps: ['Financial modeling (DCF, LBO, precedent transaction analysis)', 'CFA Level 1 (optional but accelerating)', 'Deal underwriting process', 'Pitch deck construction for deals'],
    transferableStrengths: ['M&A deal structure and documentation', 'Regulatory risk assessment', 'Due diligence discipline', 'Negotiation and term sheet mechanics'],
    targetRoleSuggestions: ['Investment Banking Associate (M&A)', 'Private Equity Legal Counsel → Transition to Deal Team', 'Corporate Development Analyst/Manager'],
    note: 'M&A attorneys are the most natural finance pipeline. Most top law firms have alumni who have made this pivot successfully.',
  },

  // ─── Management Consultant → Related ─────────────────────────────────────
  'management_consultant::tech': {
    sourceRole: 'management_consultant',
    targetIndustry: 'tech',
    difficulty: 'moderate',
    timelineWeeks: 24,
    skillGaps: ['Technical product execution (sprint planning, backlog management)', 'Agile/Scrum methodology', 'Data analysis tools (SQL, Python basics)', 'Customer discovery and user research'],
    transferableStrengths: ['Structured problem solving', 'Executive stakeholder management', 'Go-to-market strategy', 'Cross-functional project delivery', 'Presentation and narrative'],
    targetRoleSuggestions: ['Product Manager (Enterprise/B2B)', 'Strategy & Operations Manager', 'Business Operations Lead', 'Chief of Staff'],
    note: 'Ex-consultants are overrepresented in strategy/ops and PM roles at tech companies. SQL proficiency is the clearest accelerant.',
  },

  'management_consultant::finance': {
    sourceRole: 'management_consultant',
    targetIndustry: 'finance',
    difficulty: 'moderate',
    timelineWeeks: 20,
    skillGaps: ['Financial modeling (LBO, DCF, M&A comps)', 'CFA or MBA as signal', 'Industry-specific financial analysis depth'],
    transferableStrengths: ['Deal due diligence', 'Executive stakeholder management', 'Industry knowledge across verticals', 'Quantitative analysis'],
    targetRoleSuggestions: ['Private Equity Associate', 'Corporate Development', 'Investment Banking (Associate level)'],
    note: 'MBB alumni dominate PE Associate classes. Financial modeling is the primary skill to add.',
  },

  // ─── Software Engineer → Related ──────────────────────────────────────────
  'swe::product': {
    sourceRole: 'swe',
    targetIndustry: 'product_management',
    difficulty: 'moderate',
    timelineWeeks: 20,
    skillGaps: ['Product strategy and roadmap ownership', 'User research and customer discovery', 'Go-to-market collaboration', 'OKR and business metric framing', 'Stakeholder influence without authority'],
    transferableStrengths: ['Technical feasibility assessment', 'Engineering team credibility', 'System design thinking', 'Data-driven decision-making'],
    targetRoleSuggestions: ['Associate Product Manager', 'Technical Product Manager', 'Platform Product Manager'],
    note: 'Strongest SWE → PM pipeline: internal transfer, APM programs (Google, Meta, LinkedIn), or going to a startup where PM roles are less credential-gated.',
  },

  'swe::fintech': {
    sourceRole: 'swe',
    targetIndustry: 'fintech',
    difficulty: 'easy',
    timelineWeeks: 8,
    skillGaps: ['Financial products domain knowledge (payments, lending, trading basics)', 'PCI-DSS and financial regulatory basics', 'High-reliability system design for financial transactions'],
    transferableStrengths: ['Backend engineering skills transfer directly', 'System design at scale', 'API development', 'Security practices'],
    targetRoleSuggestions: ['Backend Engineer (Payments)', 'Platform Engineer (FinTech)', 'API Platform Engineer'],
    note: 'One of the easiest SWE transitions — fintech companies value engineering talent and most backend skills transfer directly.',
  },

  'swe::pharma_biotech': {
    sourceRole: 'swe',
    targetIndustry: 'pharma_biotech',
    difficulty: 'moderate',
    timelineWeeks: 24,
    skillGaps: ['Bioinformatics fundamentals (or clinical data management)', 'GxP validation requirements for software', 'HIPAA/21 CFR Part 11 compliance basics', 'R or Python for biological data analysis'],
    transferableStrengths: ['Software development skills for CTMS, EDC, or LIMS systems', 'Data pipeline engineering', 'Systems integration experience'],
    targetRoleSuggestions: ['Clinical Systems Engineer', 'Bioinformatics Software Engineer', 'Healthcare IT Engineer', 'Digital Health Platform Engineer'],
    note: 'Pharma tech and digital health are strong growth areas. GxP software validation is the unique domain knowledge to acquire.',
  },

  // ─── Data Scientist → Related ─────────────────────────────────────────────
  'data_scientist::pharma_biotech': {
    sourceRole: 'data_scientist',
    targetIndustry: 'pharma_biotech',
    difficulty: 'easy',
    timelineWeeks: 12,
    skillGaps: ['Clinical trial data standards (CDISC, SDTM, ADaM)', 'Survival analysis and time-to-event modeling', 'Regulatory submission data packages (ISS/ISE)', 'Bioinformatics workflows'],
    transferableStrengths: ['Statistical modeling expertise', 'Python/R proficiency', 'Large dataset analysis', 'Experimental design knowledge'],
    targetRoleSuggestions: ['Biostatistician', 'Statistical Programmer', 'Clinical Data Scientist', 'Computational Biologist'],
    note: 'Pharma actively recruits data scientists for statistical programming and biostatistics. CDISC standards are the primary domain knowledge to acquire.',
  },

  'data_scientist::finance': {
    sourceRole: 'data_scientist',
    targetIndustry: 'finance',
    difficulty: 'easy',
    timelineWeeks: 16,
    skillGaps: ['Financial data structures and time-series analysis', 'Risk modeling frameworks (VaR, CVaR)', 'Regulatory constraints on model deployment', 'Bloomberg/Refinitiv data familiarity'],
    transferableStrengths: ['Quantitative modeling', 'Python/R proficiency', 'Statistical rigor', 'Machine learning for pattern detection'],
    targetRoleSuggestions: ['Quantitative Analyst', 'Risk Data Scientist', 'Algorithmic Trading Researcher', 'Credit Risk Model Developer'],
    note: 'Quantitative finance is one of the highest-compensation destinations for data scientists. Risk and quant roles are the natural entry points.',
  },

  // ─── Financial Analyst → Related ──────────────────────────────────────────
  'financial_analyst::fintech': {
    sourceRole: 'financial_analyst',
    targetIndustry: 'fintech',
    difficulty: 'easy',
    timelineWeeks: 12,
    skillGaps: ['Product economics and unit economics framing', 'Fintech regulatory landscape (BaaS, payments, lending)', 'Startup equity and cap table analysis'],
    transferableStrengths: ['Financial modeling and DCF analysis', 'Metric-driven decision-making', 'Excel and data tools proficiency', 'Risk assessment'],
    targetRoleSuggestions: ['FP&A Manager at Fintech', 'Financial Analyst (Payments/Lending)', 'Corporate Finance Analyst'],
    note: 'Traditional finance analysts are highly valued in fintech for their modeling depth. The culture shift from large bank to startup is the main adjustment.',
  },

  'financial_analyst::consulting': {
    sourceRole: 'financial_analyst',
    targetIndustry: 'consulting',
    difficulty: 'easy',
    timelineWeeks: 16,
    skillGaps: ['Strategy framework proficiency', 'Client advisory communication', 'PowerPoint executive storytelling', 'Case problem-solving methodology'],
    transferableStrengths: ['Financial modeling depth', 'Industry analysis', 'Data-driven argumentation', 'Due diligence skills'],
    targetRoleSuggestions: ['Financial Advisory Consultant', 'Transaction Services Associate', 'Strategy Consultant (Financial Services practice)'],
    note: 'Financial analysts with Big 4 experience often move into strategy consulting directly. The FP&A-to-corporate-strategy path is also common.',
  },

  // ─── Manufacturing Engineer → Related ─────────────────────────────────────
  'manufacturing_engineer::automotive': {
    sourceRole: 'manufacturing_engineer',
    targetIndustry: 'automotive',
    difficulty: 'easy',
    timelineWeeks: 12,
    skillGaps: ['APQP/PPAP automotive quality processes', 'IATF 16949 quality management system', 'Automotive production systems (Toyota Production System)', 'EV manufacturing process differences (battery cell assembly, BMS)'],
    transferableStrengths: ['Process engineering fundamentals', 'Quality management system experience', 'Lean/Six Sigma tools', 'Supply chain coordination'],
    targetRoleSuggestions: ['Manufacturing Engineer (Automotive)', 'Quality Engineer (OEM or Tier 1)', 'EV Manufacturing Process Engineer', 'Production Systems Engineer'],
    note: 'Direct skill transfer — automotive manufacturing is a specialized extension of general manufacturing engineering.',
  },

  'manufacturing_engineer::consulting': {
    sourceRole: 'manufacturing_engineer',
    targetIndustry: 'consulting',
    difficulty: 'moderate',
    timelineWeeks: 28,
    skillGaps: ['Operations strategy framing for non-technical clients', 'Client relationship management', 'Financial impact quantification', 'Executive presentation skills'],
    transferableStrengths: ['Lean/Six Sigma implementation track record', 'CapEx project management', 'Quality systems expertise', 'Process optimization methodology'],
    targetRoleSuggestions: ['Operations Consultant (Manufacturing practice)', 'Supply Chain Consultant', 'Lean/Six Sigma Consultant'],
    note: 'Consulting firms with industrial practices (McKinsey Operations, Bain Manufacturing, Deloitte Operations) actively recruit Six Sigma-certified engineers.',
  },

  // ─── HR Business Partner → Related ───────────────────────────────────────
  'hr_business_partner::consulting': {
    sourceRole: 'hr_business_partner',
    targetIndustry: 'consulting',
    difficulty: 'moderate',
    timelineWeeks: 24,
    skillGaps: ['Organizational diagnostics and change management frameworks', 'Client advisory and business development basics', 'ROI framing for people initiatives', 'Executive stakeholder management beyond HRBP level'],
    transferableStrengths: ['Organizational development expertise', 'Change management facilitation', 'Workforce analytics', 'Leadership coaching', 'Employee relations and conflict resolution'],
    targetRoleSuggestions: ['HR Transformation Consultant', 'Organizational Development Consultant', 'Change Management Specialist', 'Workforce Strategy Advisor'],
    note: 'HR consulting is the most natural transition. Firms like Mercer, Korn Ferry, and Aon actively hire experienced HRBPs.',
  },

  // ─── Marketing Manager → Related ──────────────────────────────────────────
  'digital_marketing_manager::product': {
    sourceRole: 'digital_marketing_manager',
    targetIndustry: 'product_management',
    difficulty: 'moderate',
    timelineWeeks: 24,
    skillGaps: ['Product roadmap ownership and prioritization', 'Technical feasibility and engineering collaboration', 'Agile/Scrum execution', 'User research methods beyond campaign testing'],
    transferableStrengths: ['Audience segmentation and persona development', 'A/B testing and experimentation discipline', 'Funnel analytics and conversion optimization', 'Go-to-market execution'],
    targetRoleSuggestions: ['Product Marketing Manager → PM', 'Growth PM', 'Consumer Insights PM'],
    note: 'Growth product management is the most accessible entry: it values marketing analytics fluency directly.',
  },

  // ─── Account Executive → Related ─────────────────────────────────────────
  'account_executive::product': {
    sourceRole: 'account_executive',
    targetIndustry: 'product_management',
    difficulty: 'hard',
    timelineWeeks: 40,
    skillGaps: ['Technical product development lifecycle', 'Engineering collaboration and feasibility assessment', 'User research methodology', 'Roadmap prioritization frameworks', 'SQL and data analysis basics'],
    transferableStrengths: ['Customer problem articulation', 'Revenue and business impact framing', 'Stakeholder communication', 'Market and competitive intelligence'],
    targetRoleSuggestions: ['Solutions Engineer → PM', 'Product Operations Manager', 'Customer Success → PM'],
    note: 'Sales → PM is possible but harder without an intermediate technical bridge role. Solutions engineering or customer success are the recommended stepping stones.',
  },

  'account_executive::consulting': {
    sourceRole: 'account_executive',
    targetIndustry: 'consulting',
    difficulty: 'moderate',
    timelineWeeks: 28,
    skillGaps: ['Strategy framework methodology', 'Analytical problem decomposition (MECE, issue trees)', 'Hypothesis-driven analysis', 'Academic or analytical credentialing (MBA helps)'],
    transferableStrengths: ['Client relationship and advisory skills', 'Revenue and deal complexity management', 'Stakeholder negotiation', 'Quota accountability'],
    targetRoleSuggestions: ['Sales Effectiveness Consultant', 'Revenue Operations Consultant', 'Commercial Excellence Advisor'],
    note: 'Top AEs with enterprise SaaS experience are valued in B2B GTM consulting. Revenue operations consulting is the most accessible entry.',
  },

  // ─── University Professor → Related ──────────────────────────────────────
  'university_professor::consulting': {
    sourceRole: 'university_professor',
    targetIndustry: 'consulting',
    difficulty: 'moderate',
    timelineWeeks: 32,
    skillGaps: ['Client advisory framing (vs academic lecture framing)', 'Commercial problem structuring', 'Business impact quantification', 'Rapid project delivery cadence (weeks vs semesters)'],
    transferableStrengths: ['Domain expertise and analytical rigor', 'Research and evidence synthesis', 'Complex communication and explanation', 'Long-form writing and technical documentation'],
    targetRoleSuggestions: ['Policy Research Consultant', 'Think Tank Fellow', 'Industry Research Director', 'Executive Education Facilitator'],
    note: 'Academic-to-consulting transitions are most successful in domain-aligned practices (e.g., economics professor → economic consulting, medical professor → healthcare consulting).',
  },

  'university_professor::tech': {
    sourceRole: 'university_professor',
    targetIndustry: 'tech',
    difficulty: 'moderate',
    timelineWeeks: 24,
    skillGaps: ['Production software development practices', 'Agile/Scrum team collaboration', 'Engineering management and roadmap ownership', 'Customer-driven product iteration (vs publication-driven research)'],
    transferableStrengths: ['Research methodology and experimental rigor', 'ML/AI research foundation (for CS/STEM professors)', 'Long-form technical communication', 'Mentoring and team development'],
    targetRoleSuggestions: ['Research Scientist (industry AI labs)', 'ML Engineer', 'Developer Advocate', 'Technical Curriculum Lead'],
    note: 'CS/ML professors are in extremely high demand at AI research labs (Google DeepMind, Anthropic, Meta AI, OpenAI). Publication record is the key asset.',
  },

  // ─── Government Policy Analyst → Related ─────────────────────────────────
  'government_policy_analyst::consulting': {
    sourceRole: 'government_policy_analyst',
    targetIndustry: 'consulting',
    difficulty: 'easy',
    timelineWeeks: 16,
    skillGaps: ['Client engagement and revenue framing', 'Business development exposure', 'Commercial problem structuring', 'Project timeline compression (government pace vs. consulting pace)'],
    transferableStrengths: ['Policy analysis and regulatory expertise', 'Stakeholder coordination across complex organizations', 'Written communication for senior audiences', 'Government procurement process knowledge'],
    targetRoleSuggestions: ['Public Sector Consultant', 'Government Advisory Practice', 'Policy Research Analyst at think tank', 'Regulatory Affairs Consultant'],
    note: 'Government analysts are highly valued in consulting practices that serve public sector clients. Security clearances are a significant differentiator.',
  },

  // ─── Hotel General Manager → Related ─────────────────────────────────────
  'hotel_general_manager::consulting': {
    sourceRole: 'hotel_general_manager',
    targetIndustry: 'consulting',
    difficulty: 'hard',
    timelineWeeks: 40,
    skillGaps: ['Strategy framework methodology', 'Financial modeling and P&L analysis beyond hotel operating budgets', 'Case structuring and analytical problem decomposition', 'MBA as credentialing signal'],
    transferableStrengths: ['Multi-stakeholder operational leadership', 'Revenue management and yield optimization', 'Brand standards and service delivery', 'Crisis management and operational resilience'],
    targetRoleSuggestions: ['Hospitality Consulting Specialist', 'Real Estate Asset Management Consultant', 'Operations Turnaround Consultant'],
    note: 'Hospitality consulting (HVS, STR, hotel investment advisory) directly values GM experience. Traditional strategy consulting requires MBA as a bridge.',
  },

  // ─── Journalist → Related ────────────────────────────────────────────────
  'journalist_reporter::marketing': {
    sourceRole: 'journalist_reporter',
    targetIndustry: 'marketing',
    difficulty: 'easy',
    timelineWeeks: 12,
    skillGaps: ['Marketing funnel metrics and attribution', 'SEO and content distribution strategy', 'Brand positioning and messaging frameworks', 'Campaign performance analysis tools (GA4, HubSpot)'],
    transferableStrengths: ['Storytelling and audience understanding', 'Research and fact verification rigor', 'Deadline discipline and content velocity', 'Interview and source development skills'],
    targetRoleSuggestions: ['Content Marketing Manager', 'Brand Journalist / Content Strategist', 'Communications Manager', 'PR and Media Relations Manager'],
    note: 'Content marketing is the natural first pivot — journalists bring storytelling rigor that most marketers lack. The bridge is metrics literacy.',
  },

  'journalist_reporter::tech': {
    sourceRole: 'journalist_reporter',
    targetIndustry: 'tech',
    difficulty: 'moderate',
    timelineWeeks: 24,
    skillGaps: ['Technical product knowledge (varies by beat)', 'Developer documentation methodology', 'Code literacy basics (enough to understand what engineers build)', 'Community building and developer relations'],
    transferableStrengths: ['Clear technical communication', 'Audience empathy and explanation skills', 'Research depth', 'Ability to simplify complex topics'],
    targetRoleSuggestions: ['Technical Writer', 'Developer Advocate / Developer Relations', 'Product Marketing Manager (Technical Products)', 'Tech Policy Researcher'],
    note: 'Tech journalists who covered a specific beat (AI, cybersecurity, SaaS) often become Developer Advocates or technical communicators in that domain.',
  },

  // ─── Pharmaceutical Scientist → Related ──────────────────────────────────
  'pharmaceutical_scientist::consulting': {
    sourceRole: 'pharmaceutical_scientist',
    targetIndustry: 'consulting',
    difficulty: 'easy',
    timelineWeeks: 16,
    skillGaps: ['Client advisory and business communication', 'Commercial strategy framing', 'Market access and pricing economics', 'PowerPoint narrative for non-scientific audiences'],
    transferableStrengths: ['Deep scientific credibility in pharma mandates', 'Regulatory pathway expertise', 'Clinical development process knowledge', 'Publication and data analysis rigor'],
    targetRoleSuggestions: ['Life Sciences Consultant', 'Medical Affairs Consultant', 'Drug Development Strategy Advisor', 'Regulatory Affairs Consultant'],
    note: 'Life sciences consulting firms (L.E.K., ZS Associates, Putnam Associates, IQVIA) specifically require PhD pharma scientists. Scientific credibility is the key competitive advantage.',
  },

  'pharmaceutical_scientist::finance': {
    sourceRole: 'pharmaceutical_scientist',
    targetIndustry: 'finance',
    difficulty: 'moderate',
    timelineWeeks: 28,
    skillGaps: ['Biotech equity research methodology', 'Clinical risk assessment for investors', 'Financial modeling for drug development programs (probability-weighted NPV)', 'CFA Level 1 (recommended)'],
    transferableStrengths: ['Scientific evaluation of drug pipelines', 'Clinical trial data interpretation', 'Competitive landscape analysis in pharma', 'Regulatory risk assessment'],
    targetRoleSuggestions: ['Biotech Equity Research Analyst', 'Venture Capital Analyst (Healthcare/Biotech)', 'Healthcare Investment Banking', 'Life Sciences Corporate Development'],
    note: 'Biotech equity research is one of the most valued exits for pharma scientists. The ability to evaluate Phase 1-3 trial data is the competitive moat.',
  },

};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get transition data for a specific source role → target industry pair.
 * Returns null if the pair is not mapped (fallback to rolePortabilityMatrix for family-level data).
 */
export function getCrossIndustryTransition(
  sourceRole: string,
  targetIndustry: string,
): CrossIndustryTransition | null {
  const key = `${sourceRole}::${targetIndustry}`;
  return TRANSITION_MAP[key] ?? null;
}

/**
 * Get all mapped transitions for a source role.
 * Useful for showing "where can I go from here?" recommendations.
 */
export function getTransitionsFromRole(sourceRole: string): CrossIndustryTransition[] {
  return Object.values(TRANSITION_MAP).filter(t => t.sourceRole === sourceRole);
}

/**
 * Get all mapped transitions into a target industry.
 * Useful for "who is most likely to transition into this industry?" analysis.
 */
export function getTransitionsToIndustry(targetIndustry: string): CrossIndustryTransition[] {
  return Object.values(TRANSITION_MAP).filter(t => t.targetIndustry === targetIndustry);
}

/** List all source roles that have transition data. */
export function listMappedSourceRoles(): string[] {
  return [...new Set(Object.values(TRANSITION_MAP).map(t => t.sourceRole))];
}
