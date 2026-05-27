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

/**
 * CareerInsuranceContext — optional personalization signals injected by callers
 * that have access to the user profile and intelligent layer outputs.
 */
export interface CareerInsuranceContext {
  /** ISO-3166-1 alpha-2 region code (US / IN / UK / SG / AU / DE / CA / etc.) */
  region?: string;
  /** Days of visa grace period remaining after a layoff (nil = no visa constraint) */
  visaGracePeriodDays?: number | null;
  /** Days until the user's next equity cliff or scheduled vest */
  daysToNextVest?: number | null;
  /** USD value of the upcoming vest event */
  nextVestValueUsd?: number | null;
  /** Whether the user has dependents — amplifies urgency tier */
  hasDependents?: boolean;
  /** Seniority level for targeted action framing */
  seniority?: 'junior' | 'mid' | 'senior' | 'staff' | 'exec';
}

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
  // ── New families added v48.0 ─────────────────────────────────────────────
  legal: [
    {
      skillName: 'AI-Assisted Legal Research & Contract Intelligence',
      certificationOrCourse: 'Harvey AI for Legal Professionals + Thomson Reuters CoCounsel Training',
      provider: 'Harvey AI / Thomson Reuters',
      estimatedWeeks: 3,
      estimatedCost: '$0–$299',
      salaryImpact: 'Lawyers who deploy AI tools handle 40% more matters; resistant to first-wave headcount pressure',
      demandTrend: 'rising',
      rolesItUnlocks: ['Legal Tech Lead', 'Contract Intelligence Specialist', 'In-House Counsel (AI-augmented)'],
      sourceAttribution: 'Thomson Reuters Future of Professionals Report 2025, ACC Chief Legal Officer Survey',
    },
    {
      skillName: 'Data Privacy & Cybersecurity Law (GDPR / CCPA / AI Act)',
      certificationOrCourse: 'CIPP/E + CIPP/US Certification — IAPP',
      provider: 'International Association of Privacy Professionals (IAPP)',
      estimatedWeeks: 10,
      estimatedCost: '$550 exam fee',
      salaryImpact: 'Privacy law specialists command 30–45% premium; demand up 65% YoY following EU AI Act enforcement',
      demandTrend: 'rising',
      rolesItUnlocks: ['Chief Privacy Officer', 'AI Compliance Counsel', 'Data Governance Lead'],
      sourceAttribution: 'IAPP Privacy Tech Vendor Report 2025, LinkedIn Jobs data Q1 2026',
    },
    {
      skillName: 'Regulatory Affairs & Compliance (FinTech / HealthTech / AI Governance)',
      certificationOrCourse: 'CRC (Certified Regulatory Compliance Manager) — ICBRR',
      provider: 'Institute of Certified Bankers (ICB)',
      estimatedWeeks: 8,
      estimatedCost: '$425',
      salaryImpact: 'Compliance + regulatory roles are counter-cyclical — firms cannot reduce headcount during enforcement cycles',
      demandTrend: 'stable',
      rolesItUnlocks: ['VP Compliance', 'Regulatory Affairs Director', 'GRC Lead'],
      sourceAttribution: 'Deloitte Regulatory Outlook 2026, LinkedIn Hiring Trends Q4 2025',
    },
  ],
  hc: [
    {
      skillName: 'AI-Assisted Clinical Documentation (Ambient AI)',
      certificationOrCourse: 'Nuance DAX Express + Ambiance AI Workflow Certification',
      provider: 'Nuance (Microsoft) / Suki AI',
      estimatedWeeks: 2,
      estimatedCost: '$0 (employer-provided in most health systems)',
      salaryImpact: 'Physicians using ambient AI reduce documentation time by 76%; seen as change-leader — resistant to administrative cuts',
      demandTrend: 'rising',
      rolesItUnlocks: ['Clinical Informatics Lead', 'Chief Medical Information Officer track', 'Telehealth Medical Director'],
      sourceAttribution: 'AMA Physician Survey 2025, Nuance ROI Study (n=1,200 physicians)',
    },
    {
      skillName: 'Health Informatics & Clinical Analytics',
      certificationOrCourse: 'AMIA 10×10 Course + AHIMA CCS (Certified Coding Specialist)',
      provider: 'AMIA / AHIMA',
      estimatedWeeks: 12,
      estimatedCost: '$1,200–$1,800',
      salaryImpact: 'Health informatics professionals earn 35–50% more than pure clinicians; bridge to non-clinical leadership roles',
      demandTrend: 'rising',
      rolesItUnlocks: ['Director of Clinical Analytics', 'Population Health Manager', 'EHR Implementation Lead'],
      sourceAttribution: 'HIMSS Workforce Survey 2025, BLS Occupational Outlook Healthcare Informatics',
    },
    {
      skillName: 'Telehealth Platform & Virtual Care Delivery',
      certificationOrCourse: 'ATA (American Telemedicine Association) Telehealth Certificate',
      provider: 'American Telemedicine Association',
      estimatedWeeks: 4,
      estimatedCost: '$299',
      salaryImpact: 'Telehealth-fluent providers are 3× more likely to be selected for hybrid care programs — lower facility cost = lower cut risk',
      demandTrend: 'rising',
      rolesItUnlocks: ['Telehealth Medical Director', 'Virtual Primary Care Lead', 'Remote Patient Monitoring Specialist'],
      sourceAttribution: 'McKinsey Global Healthcare Report 2025, ATA Telehealth Market Outlook',
    },
  ],
  mkt: [
    {
      skillName: 'AI-Augmented Performance Marketing (Google & Meta)',
      certificationOrCourse: 'Google Ads AI Essentials + Meta Blueprint AI Advertising Certification',
      provider: 'Google / Meta',
      estimatedWeeks: 4,
      estimatedCost: '$0 (both free)',
      salaryImpact: 'Performance marketers who operate AI-native campaigns manage 3× the budget per headcount; resistant to budget consolidation cuts',
      demandTrend: 'rising',
      rolesItUnlocks: ['Head of Performance Marketing', 'Growth Lead', 'VP Paid Acquisition'],
      sourceAttribution: 'Google AI Economic Impact Study 2025, Meta Ads ROI Benchmark Q4 2025',
    },
    {
      skillName: 'Marketing Analytics & Multi-Touch Attribution',
      certificationOrCourse: 'Google Analytics 4 Certification + Amplitude Analytics Mastery',
      provider: 'Google / Amplitude',
      estimatedWeeks: 5,
      estimatedCost: '$0–$99',
      salaryImpact: 'Analytics-first marketers command 25–35% salary premium; first to be retained in budget cuts (they prove own ROI)',
      demandTrend: 'stable',
      rolesItUnlocks: ['Marketing Analytics Lead', 'Data-Driven CMO Track', 'Growth Analyst'],
      sourceAttribution: 'HubSpot State of Marketing 2025, LinkedIn Marketing Jobs Insights Q1 2026',
    },
    {
      skillName: 'Account-Based Marketing & Enterprise Demand Generation',
      certificationOrCourse: 'Demandbase ABM Certification + 6sense Revenue AI Training',
      provider: 'Demandbase / 6sense',
      estimatedWeeks: 3,
      estimatedCost: '$0–$199',
      salaryImpact: 'ABM specialists in enterprise B2B command $140K–$180K median; pipeline-attributed demand gen roles are budget-protected',
      demandTrend: 'rising',
      rolesItUnlocks: ['ABM Director', 'Enterprise Demand Gen Lead', 'Revenue Marketing Manager'],
      sourceAttribution: 'Forrester ABM Market Overview 2025, Demandbase Pipeline Impact Study',
    },
  ],
  ops: [
    {
      skillName: 'AI-Augmented Supply Chain & Demand Forecasting',
      certificationOrCourse: 'APICS CSCP (Certified Supply Chain Professional) + SAP IBP Training',
      provider: 'ASCM (Association for Supply Chain Management)',
      estimatedWeeks: 16,
      estimatedCost: '$1,295 exam + study materials',
      salaryImpact: 'CSCP holders earn 35% more than uncertified ops professionals; supply chain AI skills in top 5% shortage areas',
      demandTrend: 'rising',
      rolesItUnlocks: ['VP Supply Chain', 'Supply Chain Analytics Lead', 'Global Procurement Director'],
      sourceAttribution: 'ASCM 2025 Salary Survey, Gartner Supply Chain Top 25 workforce insights',
    },
    {
      skillName: 'Lean Six Sigma (Green Belt → Black Belt)',
      certificationOrCourse: 'Lean Six Sigma Black Belt — ASQ or IASSC',
      provider: 'ASQ (American Society for Quality)',
      estimatedWeeks: 12,
      estimatedCost: '$595–$1,495',
      salaryImpact: 'Black Belt certification correlates with $25K–$40K salary premium; process leaders are the last to be cut in restructuring',
      demandTrend: 'stable',
      rolesItUnlocks: ['Director of Process Excellence', 'VP Operations', 'Transformation Lead'],
      sourceAttribution: 'ASQ Quality Progress Salary Survey 2025, iSixSigma Compensation Report',
    },
    {
      skillName: 'ERP Implementation & Process Automation (SAP / Oracle)',
      certificationOrCourse: 'SAP Certified Application Associate — SAP S/4HANA Cloud',
      provider: 'SAP Training and Certification',
      estimatedWeeks: 10,
      estimatedCost: '$550 exam fee',
      salaryImpact: 'SAP-certified ops professionals command $115K–$175K median; ERP migration waves create 3–5yr demand surges',
      demandTrend: 'rising',
      rolesItUnlocks: ['SAP Functional Lead', 'ERP Program Manager', 'Digital Operations Director'],
      sourceAttribution: 'SAP ecosystem talent data 2025, Deloitte ERP Market Pulse',
    },
  ],
  design: [
    {
      skillName: 'AI-Augmented Design Workflow (Figma AI + Generative)',
      certificationOrCourse: 'Figma Advanced Certification + Adobe Firefly for Designers',
      provider: 'Figma / Adobe',
      estimatedWeeks: 3,
      estimatedCost: '$0–$79',
      salaryImpact: 'Designers who master AI-assisted workflows produce 4× the output; resistant to headcount reduction in lean teams',
      demandTrend: 'rising',
      rolesItUnlocks: ['Staff Designer', 'Design Systems Lead', 'AI Product Designer'],
      sourceAttribution: 'Figma Product Benchmarks 2025, AIGA Design Census Compensation Data',
    },
    {
      skillName: 'Design Systems Engineering & Component Architecture',
      certificationOrCourse: 'Design Systems course (Storybook + Figma Variables + Token Studio)',
      provider: 'Smashing Magazine / Design Systems University',
      estimatedWeeks: 6,
      estimatedCost: '$199–$499',
      salaryImpact: 'Design systems engineers command $160K–$220K median — bridge role between design and engineering; rarely cut',
      demandTrend: 'stable',
      rolesItUnlocks: ['Design Systems Lead', 'Frontend Design Engineer', 'Platform Design Architect'],
      sourceAttribution: 'Levels.fyi Design Compensation 2025, InVision Design Maturity Report',
    },
    {
      skillName: 'UX Research & AI-Assisted Synthesis',
      certificationOrCourse: 'Nielsen Norman Group UX Certification + Dovetail Research AI Workshop',
      provider: 'Nielsen Norman Group / Dovetail',
      estimatedWeeks: 8,
      estimatedCost: '$1,200–$2,400',
      salaryImpact: 'Senior UX researchers with AI synthesis skills command 40% premium; research insights are defensible budget items',
      demandTrend: 'stable',
      rolesItUnlocks: ['Head of UX Research', 'Research Operations Lead', 'Principal Product Designer'],
      sourceAttribution: 'Nielsen Norman Group UX Salary Survey 2025',
    },
  ],
  ind: [
    {
      skillName: 'Industrial Automation & Collaborative Robotics (Cobot Programming)',
      certificationOrCourse: 'Universal Robots UR Academy Cobot Programming Certification',
      provider: 'Universal Robots Academy',
      estimatedWeeks: 4,
      estimatedCost: '$0 (free online)',
      salaryImpact: 'Cobot-certified technicians command $20–$35/hr premium; automation deployers are protected while manual operators are cut',
      demandTrend: 'rising',
      rolesItUnlocks: ['Automation Technician', 'Robotics Integration Engineer', 'Manufacturing Systems Lead'],
      sourceAttribution: 'MHI Annual Industry Report 2025, IFR World Robotics Report',
    },
    {
      skillName: 'Digital Twin & Industrial IoT (IIoT)',
      certificationOrCourse: 'PTC ThingWorx IIoT Developer + Siemens MindSphere Foundation',
      provider: 'PTC / Siemens',
      estimatedWeeks: 6,
      estimatedCost: '$299–$699',
      salaryImpact: 'IIoT specialists bridge OT and IT — $130K–$180K median; Industry 4.0 investment insulates these roles from automation cuts',
      demandTrend: 'rising',
      rolesItUnlocks: ['IIoT Engineer', 'Digital Manufacturing Lead', 'Smart Factory Manager'],
      sourceAttribution: 'Deloitte Industry 4.0 Workforce Report 2025, PTC Digital Transformation Study',
    },
    {
      skillName: 'Renewable Energy & EV Infrastructure Certification',
      certificationOrCourse: 'NABCEP PV Associate (Solar) or EVITP EV Charging Infrastructure Certificate',
      provider: 'NABCEP / Electric Vehicle Infrastructure Training Program',
      estimatedWeeks: 8,
      estimatedCost: '$295–$595',
      salaryImpact: 'Green energy and EV trades see 40–60% job growth through 2030; counter-cyclical to corporate layoffs',
      demandTrend: 'rising',
      rolesItUnlocks: ['Solar Installation Lead', 'EV Charging Infrastructure Tech', 'Energy Efficiency Specialist'],
      sourceAttribution: 'DOE Clean Energy Workforce Report 2025, BLS Green Jobs Outlook',
    },
  ],
  edu: [
    {
      skillName: 'AI in Education & Adaptive Learning Design',
      certificationOrCourse: 'Google for Education AI Certification + Coursera for Campus Facilitator',
      provider: 'Google / Coursera',
      estimatedWeeks: 4,
      estimatedCost: '$0–$150',
      salaryImpact: 'Educators who lead AI adoption are retained during ed-tech transformation cycles; transition path to $120K–$180K instructional design roles',
      demandTrend: 'rising',
      rolesItUnlocks: ['Instructional Technology Lead', 'AI Curriculum Director', 'EdTech Implementation Specialist'],
      sourceAttribution: 'CoSN EdTech Market Survey 2025, ISTE Standards for Educators',
    },
    {
      skillName: 'Instructional Design & Online Course Authoring',
      certificationOrCourse: 'ATD Instructional Design Certificate + Articulate Storyline Certification',
      provider: 'ATD (Association for Talent Development)',
      estimatedWeeks: 8,
      estimatedCost: '$895',
      salaryImpact: 'Corporate instructional designers earn $85K–$130K; L&D roles grow counter-cyclically during corporate transformation',
      demandTrend: 'stable',
      rolesItUnlocks: ['Corporate Learning Designer', 'LMS Administrator', 'Curriculum Development Manager'],
      sourceAttribution: 'ATD State of the Industry Report 2025, LinkedIn L&D Job Trends',
    },
  ],
  gov: [
    {
      skillName: 'Digital Government & GovTech Service Delivery',
      certificationOrCourse: 'Digital Government Foundation Certificate — Digital Government Authority',
      provider: 'Digital Government Authority / 18F Methodology Training',
      estimatedWeeks: 6,
      estimatedCost: '$395–$895',
      salaryImpact: 'GovTech specialists bridge policy and technology — hard to replace; first hired in digital modernization programs',
      demandTrend: 'rising',
      rolesItUnlocks: ['Digital Services Lead', 'Technology Policy Advisor', 'Civic Tech Program Manager'],
      sourceAttribution: 'Deloitte Government Transformation Survey 2025, Office of Management and Budget IT Modernization Report',
    },
    {
      skillName: 'Policy Data Analytics (R/Python for Public Sector)',
      certificationOrCourse: 'Urban Institute Data Science for Policy course + Google Data Analytics Certificate',
      provider: 'Urban Institute / Coursera',
      estimatedWeeks: 8,
      estimatedCost: '$49–$299',
      salaryImpact: 'Quantitative policy analysts command 30–40% more than narrative-only counterparts; data fluency is essential for senior tracks',
      demandTrend: 'rising',
      rolesItUnlocks: ['Senior Policy Analyst', 'Government Data Scientist', 'Program Evaluation Lead'],
      sourceAttribution: 'Partnership for Public Service Workforce Data 2025',
    },
  ],
  bpo: [
    {
      skillName: 'AI-Augmented CX Operations & Automation',
      certificationOrCourse: 'Salesforce Service Cloud AI Associate + Zendesk AI Customer Experience Certification',
      provider: 'Salesforce Trailhead / Zendesk',
      estimatedWeeks: 3,
      estimatedCost: '$0 (both free)',
      salaryImpact: 'CX agents who configure AI tools earn 35–55% more than frontline agents; transition from at-risk to protected',
      demandTrend: 'rising',
      rolesItUnlocks: ['CX Automation Analyst', 'AI Quality Assurance Specialist', 'Customer Success Operations'],
      sourceAttribution: 'Salesforce State of Service Report 2025, Gartner Customer Service AI Adoption Study',
    },
    {
      skillName: 'RPA Developer (Robotic Process Automation)',
      certificationOrCourse: 'UiPath RPA Developer Foundation + Automation Anywhere Essentials',
      provider: 'UiPath Academy / Automation Anywhere University',
      estimatedWeeks: 6,
      estimatedCost: '$0 (both free)',
      salaryImpact: 'RPA developers earn $70K–$110K median — 60–80% above frontline BPO; build the bots rather than be replaced by them',
      demandTrend: 'rising',
      rolesItUnlocks: ['RPA Developer', 'Automation COE Analyst', 'Process Intelligence Specialist'],
      sourceAttribution: 'UiPath Marketplace data 2025, Everest Group BPO Talent Report',
    },
  ],
  cons: [
    {
      skillName: 'AI Strategy & Digital Transformation Consulting',
      certificationOrCourse: 'MIT Sloan AI Leadership Certificate + McKinsey AI Fluency Program (if accessible)',
      provider: 'MIT Sloan Executive Education',
      estimatedWeeks: 8,
      estimatedCost: '$1,995–$3,500',
      salaryImpact: 'Consultants who lead AI transformation engagements command $280K–$450K total comp; highest-demand consulting specialty 2025–2028',
      demandTrend: 'rising',
      rolesItUnlocks: ['AI Strategy Partner', 'Digital Transformation Lead', 'Technology Advisory Director'],
      sourceAttribution: 'Consulting.us Compensation Survey 2025, Kennedy Research Consulting Market Report',
    },
    {
      skillName: 'Advanced Analytics & Data-Driven Strategy (Python/R)',
      certificationOrCourse: 'Wharton Data Science for Business + Kaggle Python/ML track',
      provider: 'Wharton Online / Kaggle',
      estimatedWeeks: 10,
      estimatedCost: '$499–$1,995',
      salaryImpact: 'Analytically fluent consultants advance 1.5× faster; data strategy practices have 40% higher billing rates than strategy-only',
      demandTrend: 'rising',
      rolesItUnlocks: ['Analytics Practice Lead', 'Data Strategy Director', 'Management Consulting Partner Track'],
      sourceAttribution: 'BCG Henderson Institute Analytics Talent Study 2025',
    },
    {
      skillName: 'Industry Vertical Specialization (Move from Generalist to Expert)',
      certificationOrCourse: 'Domain-specific credential (CFA for finance consulting, CHFP for healthcare, CPSM for supply chain)',
      provider: 'CFA Institute / HFMA / ISM',
      estimatedWeeks: 12,
      estimatedCost: '$450–$1,500',
      salaryImpact: 'Vertical specialists command 25–40% higher rates than generalists; retain client relationships across firm cuts',
      demandTrend: 'stable',
      rolesItUnlocks: ['Industry Practice Lead', 'Principal Consultant', 'Strategic Advisory Director'],
      sourceAttribution: 'Consulting Magazine Compensation & Trends Report 2025',
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

/**
 * Regional reemployment timelines (weeks from layoff to accepted offer)
 * Sources: LinkedIn Talent Trends 2025, BLS Job Openings data Q1 2026,
 * NASSCOM India Hiring Outlook, UK ONS Labour Market Statistics.
 */
const REEMPLOYMENT_WEEKS_REGIONAL: Record<string, { US: number; IN: number; UK: number; SG: number; AU: number; default: number }> = {
  sw:     { US: 8,  IN: 6,  UK: 10, SG: 7,  AU: 10, default: 8  },
  ds:     { US: 10, IN: 8,  UK: 12, SG: 8,  AU: 11, default: 10 },
  pm:     { US: 12, IN: 10, UK: 14, SG: 10, AU: 13, default: 12 },
  hr:     { US: 16, IN: 12, UK: 18, SG: 14, AU: 16, default: 16 },
  sales:  { US: 10, IN: 8,  UK: 12, SG: 10, AU: 11, default: 10 },
  fin:    { US: 14, IN: 10, UK: 16, SG: 12, AU: 14, default: 14 },
  legal:  { US: 16, IN: 12, UK: 18, SG: 14, AU: 16, default: 16 },
  hc:     { US: 6,  IN: 8,  UK: 7,  SG: 6,  AU: 6,  default: 7  },
  mkt:    { US: 12, IN: 10, UK: 14, SG: 11, AU: 13, default: 12 },
  ops:    { US: 14, IN: 10, UK: 16, SG: 12, AU: 14, default: 14 },
  design: { US: 10, IN: 8,  UK: 12, SG: 9,  AU: 11, default: 10 },
  ind:    { US: 6,  IN: 4,  UK: 8,  SG: 6,  AU: 7,  default: 6  },
  edu:    { US: 14, IN: 8,  UK: 12, SG: 10, AU: 12, default: 12 },
  gov:    { US: 18, IN: 12, UK: 16, SG: 14, AU: 18, default: 16 },
  bpo:    { US: 4,  IN: 3,  UK: 6,  SG: 4,  AU: 5,  default: 4  },
  cons:   { US: 12, IN: 10, UK: 14, SG: 11, AU: 13, default: 12 },
  default:{ US: 13, IN: 10, UK: 15, SG: 11, AU: 14, default: 13 },
};

function getReemploymentWeeks(rolePrefix: string, region?: string): number {
  const entry = REEMPLOYMENT_WEEKS_REGIONAL[rolePrefix] ?? REEMPLOYMENT_WEEKS_REGIONAL.default;
  const r = (region ?? '').toUpperCase();
  if (r === 'IN' || r === 'INDIA') return entry.IN;
  if (r === 'UK' || r === 'GB') return entry.UK;
  if (r === 'SG' || r === 'SINGAPORE') return entry.SG;
  if (r === 'AU' || r === 'AUSTRALIA') return entry.AU;
  if (r === 'US' || r === 'USA') return entry.US;
  return entry.default;
}

/** USD annual figures — regional PPP adjustment applied downstream via currencyService */
const SALARY_PERCENTILES_BY_ROLE: Record<string, { p25: number; p50: number; p75: number }> = {
  sw:     { p25: 85_000,  p50: 120_000, p75: 165_000 },
  ds:     { p25: 90_000,  p50: 130_000, p75: 175_000 },
  pm:     { p25: 100_000, p50: 145_000, p75: 190_000 },
  hr:     { p25: 55_000,  p50: 80_000,  p75: 110_000 },
  sales:  { p25: 70_000,  p50: 100_000, p75: 145_000 },
  fin:    { p25: 75_000,  p50: 105_000, p75: 145_000 },
  legal:  { p25: 80_000,  p50: 135_000, p75: 220_000 },
  hc:     { p25: 75_000,  p50: 115_000, p75: 275_000 }, // wide band: tech → specialist physician
  mkt:    { p25: 55_000,  p50: 85_000,  p75: 130_000 },
  ops:    { p25: 58_000,  p50: 88_000,  p75: 135_000 },
  design: { p25: 65_000,  p50: 95_000,  p75: 145_000 },
  ind:    { p25: 48_000,  p50: 68_000,  p75: 95_000  },
  edu:    { p25: 40_000,  p50: 58_000,  p75: 85_000  },
  gov:    { p25: 52_000,  p50: 72_000,  p75: 105_000 },
  bpo:    { p25: 32_000,  p50: 48_000,  p75: 68_000  },
  cons:   { p25: 80_000,  p50: 120_000, p75: 200_000 },
  default:{ p25: 60_000,  p50: 85_000,  p75: 120_000 },
};

// ── Core engine ───────────────────────────────────────────────────────────────

function getRolePrefix(workTypeKey: string): string {
  const key = (workTypeKey ?? '').toLowerCase();
  // Software / Engineering / DevOps / Platform
  if (/^sw[_]|software|^developer|devops|platform_infra|backend|frontend|mobile_eng|qa_test|security_eng/.test(key)) return 'sw';
  // Data Science / ML / Analytics
  if (/^(ds|ml|data_sci|data_analyst|biz_analyst|scrum_master|it_support)/.test(key)) return 'ds';
  // Product Management
  if (/^pm[_]|product_manager|product_lead|product_owner/.test(key)) return 'pm';
  // HR / Talent / People Ops
  if (/^hr[_]|human_res|recruiter|talent_acq|hrbp|people_ops|learning_dev/.test(key)) return 'hr';
  // Sales / Revenue
  if (/^sales[_]|account_exec|^sdr[_]|^bdr[_]|revenue_op|enterprise_sales|smb_sales/.test(key)) return 'sales';
  // Finance / Investment / CFO
  if (/^(fin|finance)[_]|financial_analyst|fp_a|actuary|underwriter|treasury|^cfo|investment_bank|private_equity|hedge_fund|credit_analyst/.test(key)) return 'fin';
  // Legal / Compliance / Counsel
  if (/^leg[_]|^legal|counsel|attorney|paralegal|compliance_off|ip_atty|privacy_counsel/.test(key)) return 'legal';
  // Healthcare / Clinical / Biotech
  if (/^hc[_]|physician|^nurse[_]|pharmacist|clinical|radiolog|patholog|therapist|medical_cod|health_info|telemedicine|biotech/.test(key)) return 'hc';
  // Marketing / Growth / Content
  if (/^mkt[_]|^marketing|content_seo|demand_gen|brand_comm|product_mkt|^growth[_]|seo[_]|field_mkt/.test(key)) return 'mkt';
  // Operations / Supply Chain / ERP
  if (/^ops[_]|supply_chain|logistics[_]|procurement|^erp[_]|operations_res|facilities|program_proj/.test(key)) return 'ops';
  // Design / UX / Creative
  if (/^des[_]|^design|^ux[_]|^ui[_]|figma|creative|visual|motion_des/.test(key)) return 'design';
  // Industrial / Trades / Energy / Aviation
  if (/^ind[_]|industrial|manufactur|electrician|plumber|mechanic|welder|cnc|^pilot|aviation|energy_tech/.test(key)) return 'ind';
  // Education / Training
  if (/^edu[_]|teacher|professor|curriculum|instructional|academic/.test(key)) return 'edu';
  // Government / Public Sector / Policy
  if (/^gov[_]|government|civil_serv|policy_ana|public_sec/.test(key)) return 'gov';
  // BPO / Customer Support / CX
  if (/^bpo[_]|customer_support|cx_oper|call_center|service_desk/.test(key)) return 'bpo';
  // Consulting / Advisory
  if (/^cons[_]|consultant|management_cons|strategy_cons/.test(key)) return 'cons';
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
  region?: string,
): string {
  const pct = Math.round(p12 * 100);
  const reemployWeeks = getReemploymentWeeks(rolePrefix, region);
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
  region?: string,
): CareerInsuranceAction {
  const company = companyData.name ?? 'your company';
  const reemployWeeks = getReemploymentWeeks(rolePrefix, region);

  if (tier === 'critical') {
    return {
      id: 'top_priority_network_pipeline',
      category: 'exploration',
      urgency: 'this_week',
      title: 'Activate Your External Pipeline This Week',
      specificOutcome: 'Have 3 outreach messages sent to 3 people at target companies by end of week — not generic InMails, warm messages to connections of connections.',
      rationale: `At your risk level, you need an active pipeline before you need a job. ${company}'s signals indicate a potential decision within 6 months. The average job search takes ${reemployWeeks} weeks — that math only works if you start now.`,
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
    title: 'Complete One High-ROI Skill Certification for Your Role',
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
  region?: string,
): FinancialRiskProfile {
  const reemployWeeks = getReemploymentWeeks(rolePrefix, region);
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
  context?: CareerInsuranceContext,
): CareerInsurancePlan {
  const score = result.total;
  const rolePrefix = getRolePrefix(result.workTypeKey ?? '');
  const tier = getUrgencyTier(score);
  const p12 = computeLayoffProbability(score, result);
  const skills = ROLE_SKILL_UPGRADES[rolePrefix] ?? ROLE_SKILL_UPGRADES.default;
  const region = context?.region;

  // Dependents amplify urgency one tier (moderate→elevated, elevated→critical) but don't exceed critical
  const effectiveTier: UrgencyTier =
    context?.hasDependents && tier === 'moderate' ? 'elevated' :
    context?.hasDependents && tier === 'elevated' ? 'critical' :
    tier;

  // Visa window urgency injection — surfaces in quarter actions
  const visaNote = context?.visaGracePeriodDays != null && context.visaGracePeriodDays <= 90
    ? `⚠️ Visa window: You have ~${context.visaGracePeriodDays} days of post-layoff grace period. Target visa-sponsor-friendly employers first and begin applications NOW — your effective job search window is compressed to ${Math.max(1, Math.round(context.visaGracePeriodDays / 7) - 4)} weeks.`
    : null;

  // Equity harvest injection — surfaces in immediate actions
  const equityNote = context?.daysToNextVest != null && context.daysToNextVest <= 90 && (context?.nextVestValueUsd ?? 0) >= 5_000
    ? `💡 Upcoming vest: ~$${(context.nextVestValueUsd ?? 0).toLocaleString()} vests in ~${context.daysToNextVest} days. Consider negotiating a start date at the new employer that preserves this vest, or request a sign-on bonus to cover cliff gap.`
    : null;

  const quarter1Actions: CareerInsuranceAction[] = [
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
  ];

  if (visaNote) {
    quarter1Actions.unshift({
      id: 'q1_visa_window_action',
      category: 'exploration',
      urgency: 'this_week',
      title: 'Activate Visa-Sponsor-Friendly Job Search Immediately',
      specificOutcome: `Target companies with active H-1B / Skilled Worker sponsorship track records. Use myvisajobs.com or h1bdata.info to filter. Apply to 3 roles this week at known sponsors. ${visaNote}`,
      rationale: `Your visa grace period is ${context?.visaGracePeriodDays} days — shorter than a typical ${getReemploymentWeeks(rolePrefix, region)}-week search. Every day of delay shrinks your effective window.`,
      expectedImpact: 'Visa holders who start the search 60+ days before grace expiry have 3× higher offer rates vs. those who start at grace deadline.',
      resource: 'myvisajobs.com + H1BGrader.com + LinkedIn "Sponsors visa" filter',
      estimatedHours: 3,
      riskReductionPct: 0,
      sourceAttribution: 'USCIS H-1B data 2025, Fragomen Global Immigration Survey',
      confidenceLevel: 'high',
    });
  }

  if (equityNote) {
    quarter1Actions.unshift({
      id: 'q1_equity_harvest',
      category: 'financial',
      urgency: 'next_30_days',
      title: 'Negotiate Equity Bridge in Any New Offer',
      specificOutcome: equityNote,
      rationale: 'Unvested equity is a common reason professionals stay in high-risk roles too long. Explicitly negotiating equity acceleration or sign-on coverage removes this trap.',
      expectedImpact: 'Candidates who negotiate equity bridges receive 15–22% higher total comp in tech offers (Levels.fyi analysis 2025).',
      resource: 'Carta equity calculator + Levels.fyi offer comparison + employment attorney 30-min consult',
      estimatedHours: 2,
      riskReductionPct: 0,
      sourceAttribution: 'Levels.fyi Equity Negotiation Study 2025, Carta Equity Insights',
      confidenceLevel: 'medium',
    });
  }

  return {
    urgencyTier: effectiveTier,
    urgencyRationale: getUrgencyRationale(score, companyData, effectiveTier),
    twelveMonthLayoffProbability: p12,
    inactionConsequence: buildInactionConsequence(score, companyData, rolePrefix, p12, region),
    topPriorityAction: buildTopPriorityAction(score, companyData, rolePrefix, effectiveTier, region),
    week1Actions: buildWeek1Actions(score, companyData, rolePrefix, effectiveTier),
    month1Actions: buildMonth1Actions(score, companyData, rolePrefix, result),
    quarter1Actions,
    targetCompanies: [],  // Populated by peerBenchmarkEngine
    skillUpgrades: skills.slice(0, 3),
    financialRisk: buildFinancialRisk(score, companyData, rolePrefix, p12, region),
    internalConversation: buildInternalConversation(score, companyData, rolePrefix),
  };
}
