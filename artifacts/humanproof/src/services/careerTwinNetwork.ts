// careerTwinNetwork.ts
// Career Twin Network — stores transitions + Euclidean distance matching.
// Spec: distance = sqrt( (role_similarity*0.35)^2 + (experience_delta*0.25)^2 +
//                        (risk_score_delta*0.20)^2 + (geography_match*0.20)^2 )

export interface CareerTransition {
  id: string;
  fromRole: string;
  fromIndustry: string;
  fromRiskScore: number;       // 0-100
  fromExperienceYears: number;
  fromCountry: string;
  toRole: string;
  toIndustry: string;
  incomeChangePct: number | null;  // % change (positive = increase)
  monthsToTransition: number;
  whatWorked: string;          // brief description
  addedAt: string;
  isVerified: boolean;         // user-confirmed post-transition
}

export interface CareerTwinMatch {
  twin: CareerTransition;
  distanceScore: number;       // 0 = perfect match, higher = less similar
  similarityPct: number;       // 0-100 (inverted distance, for display)
  matchReasons: string[];
  /** True when the twin is from a different labour-market region than the user.
   *  The UI should flag this so users know advice may not transfer directly. */
  isDifferentMarket: boolean;
  /** True when no same-region twin clears the quality threshold and this result
   *  is the best available across all markets. */
  isGeographicFallback: boolean;
}

const STORAGE_KEY = 'hp_career_twin_db';
const SUPABASE_TABLE = 'career_transitions';

// ── Seed data — real-world-inspired transitions for cold start ────────────────

const SEED_TRANSITIONS: CareerTransition[] = [
  {
    id: 'seed-001',
    fromRole: 'QA Engineer',
    fromIndustry: 'IT Services',
    fromRiskScore: 74,
    fromExperienceYears: 7,
    fromCountry: 'India',
    toRole: 'AI Quality Strategist',
    toIndustry: 'Product',
    incomeChangePct: 80,
    monthsToTransition: 4,
    whatWorked: 'Built prompt evaluation frameworks, got certified in LLM testing, joined AI-first startup',
    addedAt: '2025-11-15',
    isVerified: true,
  },
  {
    id: 'seed-002',
    fromRole: 'Business Analyst',
    fromIndustry: 'Banking',
    fromRiskScore: 68,
    fromExperienceYears: 5,
    fromCountry: 'India',
    toRole: 'Product Manager',
    toIndustry: 'Fintech',
    incomeChangePct: 45,
    monthsToTransition: 6,
    whatWorked: 'Built 2 side projects demonstrating PM skills, got referral from LinkedIn connection',
    addedAt: '2025-09-20',
    isVerified: true,
  },
  {
    id: 'seed-003',
    fromRole: 'Data Analyst',
    fromIndustry: 'E-commerce',
    fromRiskScore: 62,
    fromExperienceYears: 4,
    fromCountry: 'India',
    toRole: 'Data Scientist',
    toIndustry: 'AI/ML',
    incomeChangePct: 55,
    monthsToTransition: 8,
    whatWorked: 'Completed fast.ai course, contributed to open-source ML project, got into an AI startup',
    addedAt: '2025-08-10',
    isVerified: true,
  },
  {
    id: 'seed-004',
    fromRole: 'Content Writer',
    fromIndustry: 'Media',
    fromRiskScore: 78,
    fromExperienceYears: 3,
    fromCountry: 'India',
    toRole: 'AI Content Strategist',
    toIndustry: 'SaaS',
    incomeChangePct: 70,
    monthsToTransition: 3,
    whatWorked: 'Learned to use Claude + Midjourney for content pipelines, showcased AI-augmented portfolio',
    addedAt: '2026-01-05',
    isVerified: true,
  },
  {
    id: 'seed-005',
    fromRole: 'Recruiter',
    fromIndustry: 'IT Services',
    fromRiskScore: 72,
    fromExperienceYears: 6,
    fromCountry: 'India',
    toRole: 'People Analytics Manager',
    toIndustry: 'HR Tech',
    incomeChangePct: 35,
    monthsToTransition: 9,
    whatWorked: 'Self-taught SQL and Tableau, built attrition prediction model using company data',
    addedAt: '2025-10-18',
    isVerified: true,
  },
  {
    id: 'seed-006',
    fromRole: 'Software Engineer',
    fromIndustry: 'IT Services',
    fromRiskScore: 45,
    fromExperienceYears: 8,
    fromCountry: 'India',
    toRole: 'AI Engineer',
    toIndustry: 'AI/ML',
    incomeChangePct: 90,
    monthsToTransition: 5,
    whatWorked: 'Fine-tuned open-source LLMs, built RAG system on GitHub, got referral from ex-colleague',
    addedAt: '2026-02-12',
    isVerified: true,
  },
  {
    id: 'seed-007',
    fromRole: 'Marketing Coordinator',
    fromIndustry: 'Retail',
    fromRiskScore: 71,
    fromExperienceYears: 3,
    fromCountry: 'India',
    toRole: 'Growth Manager',
    toIndustry: 'D2C',
    incomeChangePct: 40,
    monthsToTransition: 7,
    whatWorked: 'Ran performance marketing experiments on own budget (₹5K), documented results in case study',
    addedAt: '2025-12-03',
    isVerified: true,
  },
  // ── India — additional roles ─────────────────────────────────────────────
  {
    id: 'seed-008',
    fromRole: 'Software Engineer',
    fromIndustry: 'Product',
    fromRiskScore: 55,
    fromExperienceYears: 5,
    fromCountry: 'India',
    toRole: 'AI Engineer',
    toIndustry: 'AI/ML',
    incomeChangePct: 75,
    monthsToTransition: 4,
    whatWorked: 'Built a side RAG application on GitHub, contributed to LangChain issues, got LinkedIn inbound from AI startup',
    addedAt: '2026-03-12',
    isVerified: true,
  },
  {
    id: 'seed-009',
    fromRole: 'Frontend Developer',
    fromIndustry: 'IT Services',
    fromRiskScore: 61,
    fromExperienceYears: 4,
    fromCountry: 'India',
    toRole: 'AI Product Engineer',
    toIndustry: 'SaaS',
    incomeChangePct: 60,
    monthsToTransition: 5,
    whatWorked: 'Added AI chat widget to personal project using OpenAI API, documented the build process publicly, got referral from Twitter/X follower',
    addedAt: '2026-02-28',
    isVerified: true,
  },
  {
    id: 'seed-010',
    fromRole: 'Backend Developer',
    fromIndustry: 'E-commerce',
    fromRiskScore: 52,
    fromExperienceYears: 6,
    fromCountry: 'India',
    toRole: 'Platform Engineer',
    toIndustry: 'FinTech',
    incomeChangePct: 55,
    monthsToTransition: 3,
    whatWorked: 'Got AWS Solutions Architect cert, rewrote internal microservice using Kubernetes, used that as interview case study',
    addedAt: '2026-01-20',
    isVerified: true,
  },
  {
    id: 'seed-011',
    fromRole: 'Product Manager',
    fromIndustry: 'E-commerce',
    fromRiskScore: 58,
    fromExperienceYears: 5,
    fromCountry: 'India',
    toRole: 'AI Product Manager',
    toIndustry: 'AI/ML',
    incomeChangePct: 65,
    monthsToTransition: 6,
    whatWorked: 'Shipped one internal AI feature (LLM-based search), documented the 0-to-1 case study, positioned as AI PM on LinkedIn',
    addedAt: '2026-03-05',
    isVerified: true,
  },
  {
    id: 'seed-012',
    fromRole: 'DevOps Engineer',
    fromIndustry: 'IT Services',
    fromRiskScore: 42,
    fromExperienceYears: 7,
    fromCountry: 'India',
    toRole: 'AI Infrastructure Engineer',
    toIndustry: 'Cloud',
    incomeChangePct: 80,
    monthsToTransition: 4,
    whatWorked: 'Built MLflow + Kubernetes ML pipeline on own cloud account, wrote detailed Medium post, got hired by AI startup to build same infra at scale',
    addedAt: '2026-02-15',
    isVerified: true,
  },
  {
    id: 'seed-013',
    fromRole: 'UX Designer',
    fromIndustry: 'Product',
    fromRiskScore: 64,
    fromExperienceYears: 5,
    fromCountry: 'India',
    toRole: 'AI UX Lead',
    toIndustry: 'SaaS',
    incomeChangePct: 50,
    monthsToTransition: 7,
    whatWorked: 'Specialised in conversational UI design, built 3 Figma prototypes for AI chat interfaces, positioned as "AI-first designer" on portfolio',
    addedAt: '2026-01-08',
    isVerified: true,
  },
  {
    id: 'seed-014',
    fromRole: 'Sales Representative',
    fromIndustry: 'IT Services',
    fromRiskScore: 67,
    fromExperienceYears: 4,
    fromCountry: 'India',
    toRole: 'AI Solutions Consultant',
    toIndustry: 'Enterprise AI',
    incomeChangePct: 55,
    monthsToTransition: 8,
    whatWorked: 'Got Salesforce AI cert, learned to demo AI tools to enterprise clients, moved to AI solutions consulting role that combined sales + technical knowledge',
    addedAt: '2026-03-18',
    isVerified: true,
  },
  {
    id: 'seed-015',
    fromRole: 'Finance Manager',
    fromIndustry: 'Manufacturing',
    fromRiskScore: 71,
    fromExperienceYears: 8,
    fromCountry: 'India',
    toRole: 'Finance Transformation Lead',
    toIndustry: 'Consulting',
    incomeChangePct: 40,
    monthsToTransition: 10,
    whatWorked: 'Led ERP automation project in current role, documented 30% cost reduction, used that as consulting case study to get advisory role',
    addedAt: '2025-12-10',
    isVerified: true,
  },
  {
    id: 'seed-016',
    fromRole: 'Operations Manager',
    fromIndustry: 'Logistics',
    fromRiskScore: 66,
    fromExperienceYears: 9,
    fromCountry: 'India',
    toRole: 'AI Ops Lead',
    toIndustry: 'Supply Chain Tech',
    incomeChangePct: 42,
    monthsToTransition: 9,
    whatWorked: 'Automated 3 manual processes using RPA + Excel AI features, documented ROI, applied to SupplyChain AI startup as operational domain expert',
    addedAt: '2026-01-30',
    isVerified: true,
  },
  {
    id: 'seed-017',
    fromRole: 'Graphic Designer',
    fromIndustry: 'Advertising',
    fromRiskScore: 79,
    fromExperienceYears: 5,
    fromCountry: 'India',
    toRole: 'AI Creative Director',
    toIndustry: 'Media',
    incomeChangePct: 65,
    monthsToTransition: 4,
    whatWorked: 'Became proficient in Midjourney, DALL-E, and Adobe Firefly — built AI-first creative portfolio showing 5x output. Repositioned as "AI creative strategist" not "designer"',
    addedAt: '2026-02-20',
    isVerified: true,
  },
  {
    id: 'seed-018',
    fromRole: 'Project Manager',
    fromIndustry: 'IT Services',
    fromRiskScore: 63,
    fromExperienceYears: 8,
    fromCountry: 'India',
    toRole: 'AI Program Manager',
    toIndustry: 'Enterprise AI',
    incomeChangePct: 35,
    monthsToTransition: 6,
    whatWorked: 'Led AI pilot project internally, earned PMP + AI for Project Managers certification, moved to role specifically managing LLM deployment programs',
    addedAt: '2025-11-25',
    isVerified: true,
  },
  {
    id: 'seed-019',
    fromRole: 'Technical Writer',
    fromIndustry: 'SaaS',
    fromRiskScore: 76,
    fromExperienceYears: 4,
    fromCountry: 'India',
    toRole: 'AI Documentation Strategist',
    toIndustry: 'DevTools',
    incomeChangePct: 45,
    monthsToTransition: 5,
    whatWorked: 'Built expertise in LLM-assisted doc generation, created AI prompting guides as portfolio, pivoted to DevTools startup needing AI-native documentation',
    addedAt: '2026-03-01',
    isVerified: true,
  },
  {
    id: 'seed-020',
    fromRole: 'Customer Support Specialist',
    fromIndustry: 'E-commerce',
    fromRiskScore: 82,
    fromExperienceYears: 3,
    fromCountry: 'India',
    toRole: 'CX Operations Analyst',
    toIndustry: 'SaaS',
    incomeChangePct: 55,
    monthsToTransition: 6,
    whatWorked: 'Became power user of Zendesk AI and Freshdesk AI, built routing automation workflow, applied to SaaS companies as "AI CX specialist" — framed existing knowledge as AI expertise',
    addedAt: '2026-01-15',
    isVerified: true,
  },
  // ── Global / US / EU transitions ──────────────────────────────────────────
  {
    id: 'seed-g001',
    fromRole: 'Financial Analyst',
    fromIndustry: 'Banking',
    fromRiskScore: 73,
    fromExperienceYears: 6,
    fromCountry: 'USA',
    toRole: 'AI Finance Strategist',
    toIndustry: 'FinTech',
    incomeChangePct: 42,
    monthsToTransition: 6,
    whatWorked: 'Built Python-based forecasting models, earned CFA Level II, pivoted to a FinTech startup using AI for financial modeling',
    addedAt: '2026-01-10',
    isVerified: true,
  },
  {
    id: 'seed-g002',
    fromRole: 'Legal Associate',
    fromIndustry: 'Law',
    fromRiskScore: 65,
    fromExperienceYears: 5,
    fromCountry: 'UK',
    toRole: 'Legal Tech Consultant',
    toIndustry: 'LegalTech',
    incomeChangePct: 55,
    monthsToTransition: 8,
    whatWorked: 'Trained on contract AI platforms (Harvey, Lexis+), built automation demos, joined a legal AI startup',
    addedAt: '2026-02-20',
    isVerified: true,
  },
  {
    id: 'seed-g003',
    fromRole: 'Data Entry Specialist',
    fromIndustry: 'BPO',
    fromRiskScore: 91,
    fromExperienceYears: 4,
    fromCountry: 'Philippines',
    toRole: 'AI Workflow Auditor',
    toIndustry: 'Operations',
    incomeChangePct: 65,
    monthsToTransition: 5,
    whatWorked: 'Certified in RPA (UiPath), documented 40+ manual process flows and built automation case studies, got hired to validate AI outputs',
    addedAt: '2026-03-01',
    isVerified: true,
  },
  {
    id: 'seed-g004',
    fromRole: 'Journalist',
    fromIndustry: 'Media',
    fromRiskScore: 76,
    fromExperienceYears: 8,
    fromCountry: 'USA',
    toRole: 'AI Content Director',
    toIndustry: 'Media / SaaS',
    incomeChangePct: 60,
    monthsToTransition: 7,
    whatWorked: 'Built and monetized a newsletter using AI tools, demonstrated 300% productivity gain, recruited by a SaaS company as editorial AI lead',
    addedAt: '2026-01-25',
    isVerified: true,
  },
  {
    id: 'seed-g005',
    fromRole: 'HR Generalist',
    fromIndustry: 'Manufacturing',
    fromRiskScore: 69,
    fromExperienceYears: 7,
    fromCountry: 'Germany',
    toRole: 'People Analytics Lead',
    toIndustry: 'Consulting',
    incomeChangePct: 38,
    monthsToTransition: 10,
    whatWorked: 'Completed Google Data Analytics cert, built attrition prediction model for current employer, showcased ROI to secure internal promotion then external offer',
    addedAt: '2025-11-30',
    isVerified: true,
  },
  {
    id: 'seed-g006',
    fromRole: 'Software Developer',
    fromIndustry: 'IT Services',
    fromRiskScore: 48,
    fromExperienceYears: 9,
    fromCountry: 'USA',
    toRole: 'AI Platform Architect',
    toIndustry: 'Enterprise AI',
    incomeChangePct: 95,
    monthsToTransition: 4,
    whatWorked: 'Built production RAG system on top of company\'s internal knowledge base, presented at internal AI showcase, got poached by AWS AI team',
    addedAt: '2026-03-10',
    isVerified: true,
  },
  {
    id: 'seed-g007',
    fromRole: 'Accountant',
    fromIndustry: 'Finance',
    fromRiskScore: 82,
    fromExperienceYears: 10,
    fromCountry: 'Australia',
    toRole: 'Finance Transformation Lead',
    toIndustry: 'Consulting',
    incomeChangePct: 50,
    monthsToTransition: 12,
    whatWorked: 'Specialized in AI-powered accounting tools (Intuit, Dext), led ERP automation project, transitioned to advisory role for SMBs doing finance digitization',
    addedAt: '2025-09-15',
    isVerified: true,
  },
  {
    id: 'seed-g008',
    fromRole: 'Customer Support Specialist',
    fromIndustry: 'E-commerce',
    fromRiskScore: 84,
    fromExperienceYears: 3,
    fromCountry: 'global',
    toRole: 'CX Automation Manager',
    toIndustry: 'SaaS',
    incomeChangePct: 72,
    monthsToTransition: 5,
    whatWorked: 'Became expert user of Intercom AI and Zendesk AI, built routing and escalation workflows, moved to a B2B SaaS company to implement similar systems',
    addedAt: '2026-02-08',
    isVerified: true,
  },
  {
    id: 'seed-g009',
    fromRole: 'Software Engineer',
    fromIndustry: 'Banking',
    fromRiskScore: 56,
    fromExperienceYears: 7,
    fromCountry: 'UK',
    toRole: 'AI Platform Engineer',
    toIndustry: 'FinTech',
    incomeChangePct: 40,
    monthsToTransition: 5,
    whatWorked: 'Built internal ML model serving layer on AWS SageMaker, got GCP Professional ML cert, moved to FinTech startup as AI infrastructure lead',
    addedAt: '2026-02-14',
    isVerified: true,
  },
  {
    id: 'seed-g010',
    fromRole: 'Product Manager',
    fromIndustry: 'Enterprise Software',
    fromRiskScore: 52,
    fromExperienceYears: 6,
    fromCountry: 'USA',
    toRole: 'AI Product Lead',
    toIndustry: 'AI/ML',
    incomeChangePct: 35,
    monthsToTransition: 5,
    whatWorked: 'Launched one LLM-powered feature in current role (shipped → measurable outcome), wrote case study on LinkedIn, recruited for AI PM roles within 2 months',
    addedAt: '2026-03-08',
    isVerified: true,
  },
  {
    id: 'seed-g011',
    fromRole: 'Marketing Manager',
    fromIndustry: 'Retail',
    fromRiskScore: 68,
    fromExperienceYears: 6,
    fromCountry: 'Australia',
    toRole: 'AI Growth Strategist',
    toIndustry: 'D2C',
    incomeChangePct: 30,
    monthsToTransition: 7,
    whatWorked: 'Ran entire email campaign using AI personalisation stack, documented 220% open rate improvement, hired by a performance marketing agency as their "AI marketing lead"',
    addedAt: '2026-01-18',
    isVerified: true,
  },
  {
    id: 'seed-g012',
    fromRole: 'Data Entry Specialist',
    fromIndustry: 'BPO',
    fromRiskScore: 88,
    fromExperienceYears: 3,
    fromCountry: 'India',
    toRole: 'AI Data Operations Specialist',
    toIndustry: 'AI/ML',
    incomeChangePct: 70,
    monthsToTransition: 4,
    whatWorked: 'Got certified in RLHF data annotation (Scale AI, Surge AI), built expertise as AI trainer, now works on LLM evaluation teams — same data skills, higher leverage',
    addedAt: '2026-02-28',
    isVerified: true,
  },
  {
    id: 'seed-g013',
    fromRole: 'DevOps Engineer',
    fromIndustry: 'IT Services',
    fromRiskScore: 45,
    fromExperienceYears: 8,
    fromCountry: 'USA',
    toRole: 'MLOps Engineer',
    toIndustry: 'Enterprise AI',
    incomeChangePct: 55,
    monthsToTransition: 4,
    whatWorked: 'Adapted existing Kubernetes + CI/CD expertise to ML model deployment pipeline, got MLflow + Kubeflow certified, entire transition was infra → ML infra',
    addedAt: '2026-03-14',
    isVerified: true,
  },
  {
    id: 'seed-g014',
    fromRole: 'Business Analyst',
    fromIndustry: 'Insurance',
    fromRiskScore: 71,
    fromExperienceYears: 7,
    fromCountry: 'USA',
    toRole: 'AI Implementation Consultant',
    toIndustry: 'Consulting',
    incomeChangePct: 42,
    monthsToTransition: 8,
    whatWorked: 'Led process mining project using Celonis, documented 25% efficiency gain, pivoted to AI implementation consulting targeting insurance industry — used domain knowledge as differentiator',
    addedAt: '2025-12-20',
    isVerified: true,
  },
  {
    id: 'seed-g015',
    fromRole: 'UX Designer',
    fromIndustry: 'E-commerce',
    fromRiskScore: 60,
    fromExperienceYears: 6,
    fromCountry: 'USA',
    toRole: 'Conversational AI Designer',
    toIndustry: 'AI/ML',
    incomeChangePct: 38,
    monthsToTransition: 6,
    whatWorked: 'Specialised in voice UI and chatbot design patterns, built 5 case studies around AI conversation flows, landed a role at an AI assistant company as their lead dialogue designer',
    addedAt: '2026-01-22',
    isVerified: true,
  },
  {
    id: 'seed-g016',
    fromRole: 'Security Engineer',
    fromIndustry: 'Banking',
    fromRiskScore: 44,
    fromExperienceYears: 9,
    fromCountry: 'Singapore',
    toRole: 'AI Security Lead',
    toIndustry: 'Enterprise Security',
    incomeChangePct: 48,
    monthsToTransition: 5,
    whatWorked: 'Published research on LLM prompt injection vulnerabilities, presented at a local security conference, hired by security consultancy as their AI security specialist',
    addedAt: '2026-02-05',
    isVerified: true,
  },
  {
    id: 'seed-g017',
    fromRole: 'Accountant',
    fromIndustry: 'Professional Services',
    fromRiskScore: 77,
    fromExperienceYears: 6,
    fromCountry: 'UK',
    toRole: 'Finance AI Specialist',
    toIndustry: 'FinTech',
    incomeChangePct: 44,
    monthsToTransition: 9,
    whatWorked: 'Became early adopter of Copilot for Finance and AI bookkeeping tools, built case studies for 3 SMB clients showing 60% time reduction, hired by FinTech to train enterprise customers',
    addedAt: '2025-11-18',
    isVerified: true,
  },
  {
    id: 'seed-g018',
    fromRole: 'Telemarketer',
    fromIndustry: 'BPO',
    fromRiskScore: 93,
    fromExperienceYears: 4,
    fromCountry: 'Philippines',
    toRole: 'AI Sales Development Rep',
    toIndustry: 'SaaS',
    incomeChangePct: 85,
    monthsToTransition: 5,
    whatWorked: 'Learned to use Apollo.io AI, Clay.com, and AI call analysis tools — built personalised outreach sequences that 4x response rates, hired by SaaS startup to build their AI-powered SDR function',
    addedAt: '2026-03-20',
    isVerified: true,
  },
  {
    id: 'seed-g019',
    fromRole: 'Administrative Assistant',
    fromIndustry: 'Healthcare',
    fromRiskScore: 85,
    fromExperienceYears: 5,
    fromCountry: 'global',
    toRole: 'AI Operations Coordinator',
    toIndustry: 'HealthTech',
    incomeChangePct: 60,
    monthsToTransition: 6,
    whatWorked: 'Built AI-assisted scheduling and document management system using Notion AI + Make.com + GPT API, documented 40% time savings, moved to HealthTech startup to implement same system',
    addedAt: '2026-02-10',
    isVerified: true,
  },
  {
    id: 'seed-g020',
    fromRole: 'Project Manager',
    fromIndustry: 'Construction',
    fromRiskScore: 62,
    fromExperienceYears: 10,
    fromCountry: 'Australia',
    toRole: 'Digital Transformation Lead',
    toIndustry: 'PropTech',
    incomeChangePct: 32,
    monthsToTransition: 11,
    whatWorked: 'Led digitisation of site inspection process using AI and drone tech, reduced defect reporting time by 70%, transitioned to PropTech as implementation consultant for similar companies',
    addedAt: '2025-10-05',
    isVerified: true,
  },
];

// ── Oracle key → human-readable role name ────────────────────────────────────
// findCareerTwins() receives workTypeKey values like 'sw_backend', 'data_analyst',
// 'fin_fp_analyst'. These must be normalised before role similarity matching —
// 'data_analyst' with underscore does not match keyword 'data analyst' with space.

const ORACLE_KEY_TO_ROLE: Record<string, string> = {
  sw_backend:            'Software Engineer',
  sw_frontend:           'Frontend Developer',
  sw_fullstack:          'Full Stack Developer',
  sw_mobile:             'Mobile Developer',
  sw_devops:             'DevOps Engineer',
  sw_security:           'Security Engineer',
  sw_qa:                 'QA Engineer',
  sw_sre:                'Site Reliability Engineer',
  sw_platform:           'Platform Engineer',
  sw_staff:              'Staff Engineer',
  sw_arch:               'Solutions Architect',
  ml_engineer:           'AI Engineer',
  ai_engineer:           'AI Engineer',
  ai_llm:                'AI Engineer',
  data_scientist:        'Data Scientist',
  data_engineer:         'Data Engineer',
  data_analyst:          'Data Analyst',
  product_manager:       'Product Manager',
  product_designer:      'UX Designer',
  ux_designer:           'UX Designer',
  project_manager:       'Project Manager',
  business_analyst:      'Business Analyst',
  marketing_manager:     'Marketing Manager',
  growth_manager:        'Marketing Manager',
  content_writer:        'Content Writer',
  technical_writer:      'Technical Writer',
  recruiter:             'Recruiter',
  hrbp:                  'HR Business Partner',
  hr_generalist:         'HR Generalist',
  financial_analyst:     'Financial Analyst',
  accountant:            'Accountant',
  finance_manager:       'Finance Manager',
  fp_a_analyst:          'Financial Analyst',
  fin_fp_analyst:        'Financial Analyst',
  fin_account:           'Accountant',
  legal_associate:       'Legal Associate',
  legal_counsel:         'Legal Associate',
  customer_support:      'Customer Support Specialist',
  bpo_agent:             'Customer Support Specialist',
  sales_rep:             'Sales Representative',
  account_manager:       'Account Manager',
  operations_manager:    'Operations Manager',
  supply_chain:          'Operations Manager',
  graphic_designer:      'Graphic Designer',
  video_editor:          'Video Editor',
  teacher:               'Teacher',
  healthcare_admin:      'Healthcare Administrator',
  pharmacist:            'Pharmacist',
  clinical_nurse:        'Nurse',
  physician:             'Physician',
  qa_manual:             'QA Engineer',
  qa_automation:         'QA Engineer',
  data_entry:            'Data Entry Specialist',
  telemarketer:          'Telemarketer',
  admin_assistant:       'Administrative Assistant',
};

/**
 * Normalise a role identifier to a human-readable name for similarity matching.
 * Handles oracle key underscores, camelCase oracle keys, and free-text inputs.
 */
export function normaliseRoleForMatching(rawRole: string): string {
  if (!rawRole) return 'Software Engineer';
  // 1. Direct oracle key lookup
  const lower = rawRole.toLowerCase().trim();
  if (ORACLE_KEY_TO_ROLE[lower]) return ORACLE_KEY_TO_ROLE[lower];
  // 2. Prefix match — e.g. 'sw_backend_java' → check 'sw_backend'
  const prefix2 = lower.split('_').slice(0, 2).join('_');
  if (ORACLE_KEY_TO_ROLE[prefix2]) return ORACLE_KEY_TO_ROLE[prefix2];
  const prefix1 = lower.split('_')[0];
  const prefixMap: Record<string, string> = {
    sw: 'Software Engineer', ml: 'AI Engineer', ai: 'AI Engineer',
    data: 'Data Analyst', fin: 'Financial Analyst', hr: 'HR Generalist',
    mkt: 'Marketing Manager', bpo: 'Customer Support Specialist',
    qa: 'QA Engineer', leg: 'Legal Associate', hc: 'Healthcare Administrator',
    ops: 'Operations Manager', des: 'UX Designer', cnt: 'Content Writer',
    sec: 'Security Engineer', ds: 'Data Scientist', pm: 'Product Manager',
  };
  if (prefixMap[prefix1]) return prefixMap[prefix1];
  // 3. Replace underscores with spaces and title-case — best effort for free-text oracle keys
  return lower.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Role similarity matrix (0-1, higher = more similar) ──────────────────────

const ROLE_GROUPS: Record<string, string[]> = {
  engineering:   ['software engineer', 'frontend', 'backend', 'full stack', 'developer', 'sde'],
  ai_ml:         ['ai engineer', 'ml engineer', 'data scientist', 'ai researcher', 'llm', 'prompt'],
  data:          ['data analyst', 'business analyst', 'data engineer', 'bi analyst'],
  qa:            ['qa engineer', 'quality assurance', 'test engineer', 'sdet'],
  product:       ['product manager', 'program manager', 'product owner', 'cpo'],
  design:        ['ux designer', 'ui designer', 'product designer', 'design lead'],
  content:       ['content writer', 'copywriter', 'technical writer', 'content strategist'],
  marketing:     ['marketing manager', 'growth manager', 'marketing coordinator', 'seo', 'performance'],
  hr:            ['recruiter', 'hr business partner', 'talent acquisition', 'people ops', 'people analytics'],
  finance:       ['financial analyst', 'accountant', 'finance manager', 'bookkeeper', 'cfo'],
  leadership:    ['manager', 'director', 'vp', 'head of', 'cto', 'ceo', 'executive'],
  ops:           ['operations manager', 'supply chain', 'project manager', 'program manager'],
};

function getRoleGroup(role: string): string {
  const lower = role.toLowerCase();
  for (const [group, keywords] of Object.entries(ROLE_GROUPS)) {
    if (keywords.some(kw => lower.includes(kw))) return group;
  }
  return 'other';
}

function roleSimilarity(roleA: string, roleB: string): number {
  if (roleA.toLowerCase() === roleB.toLowerCase()) return 1.0;
  const gA = getRoleGroup(roleA);
  const gB = getRoleGroup(roleB);
  if (gA === gB && gA !== 'other') return 0.7;
  // Adjacent groups (e.g. data → ai_ml)
  const adjacent: Record<string, string[]> = {
    data: ['ai_ml', 'engineering'],
    qa: ['engineering', 'ai_ml'],
    content: ['marketing'],
    hr: ['ops', 'leadership'],
    finance: ['data', 'ops'],
  };
  if (adjacent[gA]?.includes(gB) || adjacent[gB]?.includes(gA)) return 0.4;
  return 0.1;
}

// ── Soft geographic market similarity ────────────────────────────────────────
//
// geoMismatch values (used as the raw geo term before weighting):
//   0.0  — exact country match OR 'global' twin (market-agnostic advice)
//   0.4  — same labour-market region (e.g. India/Singapore — similar hiring
//           dynamics, adjacent salary bands, comparable tech ecosystem)
//   1.0  — different region (e.g. India/Germany — structurally different labour
//           markets; advice like "attend Berlin meetups" does not transfer)
//
// Regions are based on labour-market comparability, not geography.
// APAC_DEV: developing-market tech hubs with similar talent supply/demand dynamics.
// APAC_ADV: advanced APAC economies (AU/NZ/JP/KR) — higher salary bands.
// NA / WEST_EU / LATAM / MENA: self-explanatory regional clusters.
const GEO_REGION: Record<string, string> = {
  // Full names (seed data format)
  'india': 'apac_dev',    'singapore': 'apac_dev',  'philippines': 'apac_dev',
  'indonesia': 'apac_dev','malaysia': 'apac_dev',   'vietnam': 'apac_dev',
  'bangladesh': 'apac_dev','sri lanka': 'apac_dev', 'pakistan': 'apac_dev',
  'usa': 'na',            'canada': 'na',
  'uk': 'west_eu',        'germany': 'west_eu',     'france': 'west_eu',
  'netherlands': 'west_eu','sweden': 'west_eu',      'ireland': 'west_eu',
  'australia': 'apac_adv','new zealand': 'apac_adv','japan': 'apac_adv',
  'south korea': 'apac_adv',
  'brazil': 'latam',      'mexico': 'latam',        'argentina': 'latam',
  'colombia': 'latam',    'chile': 'latam',
  'uae': 'mena',          'saudi arabia': 'mena',   'egypt': 'mena',
  'nigeria': 'africa',    'kenya': 'africa',        'south africa': 'africa',
  'global': 'global',
  // ISO-2 short codes (pipeline passes countryKey like 'in', 'us', 'gb')
  'in': 'apac_dev',  'sg': 'apac_dev', 'ph': 'apac_dev', 'id': 'apac_dev',
  'my': 'apac_dev',  'vn': 'apac_dev', 'bd': 'apac_dev', 'lk': 'apac_dev',
  'us': 'na',        'ca': 'na',
  'gb': 'west_eu',   'de': 'west_eu',  'fr': 'west_eu',  'nl': 'west_eu',
  'se': 'west_eu',   'ie': 'west_eu',
  'au': 'apac_adv',  'nz': 'apac_adv', 'jp': 'apac_adv', 'kr': 'apac_adv',
  'br': 'latam',     'mx': 'latam',    'ar': 'latam',    'co': 'latam',
  'ae': 'mena',      'sa': 'mena',     'eg': 'mena',
  'ng': 'africa',    'ke': 'africa',   'za': 'africa',
};

function geoMismatch(userCountry: string, twinCountry: string): number {
  const u = userCountry.toLowerCase().trim();
  const t = twinCountry.toLowerCase().trim();
  if (u === t) return 0.0;
  if (t === 'global') return 0.0;   // global twins are universally applicable
  if (u === 'global') return 0.0;   // user with global context — no geo preference
  const rU = GEO_REGION[u];
  const rT = GEO_REGION[t];
  if (!rU || !rT) return 1.0;       // unknown country → treat as full mismatch
  if (rU === rT) return 0.4;        // same labour-market region — partial credit
  return 1.0;                       // different region — full mismatch
}

// ── Euclidean distance (spec-aligned) ────────────────────────────────────────

function computeDistance(
  userRole: string, userExp: number, userRisk: number, userCountry: string,
  twin: CareerTransition,
): number {
  const roleSim = roleSimilarity(userRole, twin.fromRole);
  const roleComponent = (1 - roleSim) * 0.35;

  const expDelta = Math.min(1, Math.abs(userExp - twin.fromExperienceYears) / 10);
  const expComponent = expDelta * 0.25;

  const riskDelta = Math.abs(userRisk - twin.fromRiskScore) / 100;
  const riskComponent = riskDelta * 0.20;

  const geoComponent = geoMismatch(userCountry, twin.fromCountry) * 0.20;

  return Math.sqrt(
    roleComponent ** 2 +
    expComponent ** 2 +
    riskComponent ** 2 +
    geoComponent ** 2,
  );
}

// Maximum distance a twin may have to be included in results.
// distance > MAX_MATCH_DISTANCE → similarity < ~29% → results are too dissimilar
// to be actionable. If no twin clears this bar, the best available is returned
// with isGeographicFallback = true so the UI can communicate the limitation.
const MAX_MATCH_DISTANCE = 0.72;

// ── Storage: localStorage + optional Supabase sync ───────────────────────────

function loadLocalDB(): CareerTransition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const local: CareerTransition[] = raw ? JSON.parse(raw) : [];
    // Merge with seeds (seeds are overridden if same id exists in local)
    const localIds = new Set(local.map(t => t.id));
    const seeds = SEED_TRANSITIONS.filter(s => !localIds.has(s.id));
    return [...seeds, ...local];
  } catch {
    return SEED_TRANSITIONS;
  }
}

export function addTransition(transition: Omit<CareerTransition, 'id' | 'addedAt' | 'isVerified'>): CareerTransition {
  const record: CareerTransition = {
    ...transition,
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: new Date().toISOString(),
    isVerified: false,
  };

  // 1. Persist to localStorage for immediate same-session reads
  const all = loadLocalDB();
  all.push(record);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(t => !t.id.startsWith('seed-'))));
  } catch { /* quota exceeded */ }

  // 2. Fire-and-forget Supabase write so transitions persist across devices/sessions.
  // Non-blocking — localStorage is the authoritative local store; Supabase is the
  // durable store. Failure here is silent; the record is already in localStorage.
  try {
    import('../utils/supabase').then(({ supabase }) => {
      supabase
        .from(SUPABASE_TABLE)
        .insert({
          id:                    record.id,
          from_role:             record.fromRole,
          from_industry:         record.fromIndustry,
          from_risk_score:       record.fromRiskScore,
          from_experience_years: record.fromExperienceYears,
          from_country:          record.fromCountry,
          to_role:               record.toRole,
          to_industry:           record.toIndustry,
          income_change_pct:     record.incomeChangePct,
          months_to_transition:  record.monthsToTransition,
          what_worked:           record.whatWorked,
          added_at:              record.addedAt,
          is_verified:           false,
        })
        .then(({ error }) => {
          if (error) console.warn('[CareerTwinNetwork] Supabase write failed (non-critical):', error.message);
        });
    }).catch(() => { /* module not available */ });
  } catch { /* non-critical */ }

  window.dispatchEvent(new CustomEvent('twin-network-updated', { detail: record }));
  return record;
}

// ── Matching ──────────────────────────────────────────────────────────────────

export function findCareerTwins(
  userRole: string,
  userExperience: number,
  userRiskScore: number,
  userCountry: string,
  topN = 5,
): CareerTwinMatch[] {
  const db = loadLocalDB();
  // Normalise the oracle key to a human-readable role before matching.
  // 'sw_backend' → 'Software Engineer', 'data_analyst' → 'Data Analyst', etc.
  const normalisedUserRole = normaliseRoleForMatching(userRole);
  const userRegion = GEO_REGION[userCountry.toLowerCase().trim()] ?? null;

  const scored = db.map(twin => {
    const dist = computeDistance(normalisedUserRole, userExperience, userRiskScore, userCountry, twin);
    const similarityPct = Math.round(Math.max(0, (1 - dist) * 100));
    const mismatch = geoMismatch(userCountry, twin.fromCountry);
    const twinRegion = GEO_REGION[twin.fromCountry.toLowerCase().trim()] ?? null;
    const isDifferentMarket = mismatch > 0 && twin.fromCountry.toLowerCase() !== 'global';

    const reasons: string[] = [];
    const roleSim = roleSimilarity(normalisedUserRole, twin.fromRole);
    if (roleSim > 0.6) {
      reasons.push(
        normalisedUserRole.toLowerCase() === twin.fromRole.toLowerCase()
          ? `Same role: ${twin.fromRole}`
          : `Related role: ${twin.fromRole}`
      );
    }
    if (Math.abs(userExperience - twin.fromExperienceYears) <= 2) {
      reasons.push(`Matched experience: ${twin.fromExperienceYears}yr`);
    }
    if (Math.abs(userRiskScore - twin.fromRiskScore) <= 15) {
      reasons.push(`Similar risk level (${twin.fromRiskScore}/100)`);
    }
    if (!isDifferentMarket) {
      reasons.push(twin.fromCountry === 'global' ? 'Market-agnostic transition' : `Same market: ${twin.fromCountry}`);
    } else if (userRegion && twinRegion && userRegion === twinRegion) {
      reasons.push(`Same region (${twin.fromCountry})`);
    }

    return {
      twin,
      distanceScore: dist,
      similarityPct,
      matchReasons: reasons,
      isDifferentMarket,
      isGeographicFallback: false, // set below after threshold check
    };
  });

  scored.sort((a, b) => a.distanceScore - b.distanceScore);

  // Apply quality threshold — only include twins within MAX_MATCH_DISTANCE.
  // If the filtered set is large enough, use it; otherwise fall back to top-N
  // across all matches but flag them as geographic fallbacks.
  const withinThreshold = scored.filter(s => s.distanceScore <= MAX_MATCH_DISTANCE);
  const useAll = withinThreshold.length < Math.ceil(topN / 2);

  const candidates = useAll ? scored : withinThreshold;
  const results = candidates.slice(0, topN);

  if (useAll) {
    results.forEach(r => { r.isGeographicFallback = true; });
  }

  return results;
}

export function getTransitionStats(): {
  totalTransitions: number;
  avgIncomeChange: number;
  avgMonthsToTransition: number;
  topDestinationRoles: string[];
} {
  const db = loadLocalDB();
  const verified = db.filter(t => t.isVerified);

  const incomeChanges = verified.filter(t => t.incomeChangePct !== null).map(t => t.incomeChangePct!);
  const avgIncome = incomeChanges.length
    ? Math.round(incomeChanges.reduce((a, b) => a + b, 0) / incomeChanges.length)
    : 0;

  const avgMonths = verified.length
    ? Math.round(verified.reduce((a, t) => a + t.monthsToTransition, 0) / verified.length)
    : 0;

  const roleCounts: Record<string, number> = {};
  verified.forEach(t => { roleCounts[t.toRole] = (roleCounts[t.toRole] ?? 0) + 1; });
  const topRoles = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([role]) => role);

  return {
    totalTransitions: db.length,
    avgIncomeChange: avgIncome,
    avgMonthsToTransition: avgMonths,
    topDestinationRoles: topRoles,
  };
}
