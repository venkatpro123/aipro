// roleNarratives.ts — Role-specific intelligence: unique risks, opportunities, AI tools, human edge
// Prevents generic "all roles in same risk bracket get same text" problem.

export interface RoleIntelligence {
  uniqueRisks: string[];           // 2–3 role-specific AI threats
  uniqueOpportunities: string[];   // 2–3 role-specific growth levers
  aiToolsImpacting: string[];      // specific AI tools replacing tasks (named)
  humanEdge: string;               // what humans still do better in this role
  evolutionBy2030: string;         // one-sentence role evolution prediction
  growthRoles: string[];           // 2–3 adjacent roles this role can grow into
}

const ROLE_INTELLIGENCE: Record<string, RoleIntelligence> = {
  sw_frontend: {
    uniqueRisks: [
      'GitHub Copilot and Cursor can now generate production-ready React components from natural language descriptions — reducing the volume of manual component coding needed',
      'AI-powered design-to-code tools (Figma AI, Locofy, Builder.io) can convert designs directly to deployable frontend code, threatening pure implementation roles',
      'Low-code platforms (Webflow, Framer) are enabling non-developers to build complex frontends, narrowing the addressable work for traditional frontend roles',
    ],
    uniqueOpportunities: [
      'AI-augmented developers who can review, architect, and quality-assure AI-generated code are commanding 25–35% salary premiums over traditional developers',
      'Frontend performance engineering and Core Web Vitals optimization require deep systems understanding AI tools consistently miss — a growing specialization',
      'Accessibility engineering (WCAG compliance, ARIA patterns) is legally required and AI tools produce consistently non-compliant output — a durable human specialization',
    ],
    aiToolsImpacting: ['GitHub Copilot', 'Cursor', 'Vercel v0', 'Figma AI', 'Locofy', 'Builder.io', 'Claude (Anthropic)', 'ChatGPT'],
    humanEdge: 'System-level architectural decisions, cross-team communication about UX tradeoffs, performance debugging of complex interactions, and accessibility judgment that requires understanding lived human experience',
    evolutionBy2030: 'Frontend developers will shift from component implementation to AI output orchestration — reviewing, refactoring, and architecting AI-generated code rather than writing it from scratch',
    growthRoles: ['Frontend Architect', 'AI-Augmented Full-Stack Lead', 'Developer Experience (DX) Engineer'],
  },

  sw_backend: {
    uniqueRisks: [
      'AI tools can generate REST APIs, database schemas, and CRUD operations with high accuracy — the commodity layer of backend work is increasingly automated',
      'Cloud provider AI services (AWS Bedrock, Azure AI, GCP Vertex) are absorbing ML infrastructure work that previously required dedicated backend engineers',
      'No-code backend platforms (Supabase, Firebase, PocketBase) are enabling product teams to build backend services without traditional backend engineers',
    ],
    uniqueOpportunities: [
      'Distributed systems design, event-driven architecture, and multi-service orchestration remain complex human-judgment domains — demand is growing not shrinking',
      'Backend security engineering (threat modeling, secure API design, secrets management) is a critical gap AI tools consistently fail at — a growing premium specialization',
      'Database performance engineering and query optimization for large-scale systems require contextual understanding that AI tools lack for production environments',
    ],
    aiToolsImpacting: ['GitHub Copilot', 'Cursor', 'AWS CodeWhisperer', 'Tabnine', 'Codeium', 'Claude (Anthropic)'],
    humanEdge: 'System reliability engineering, distributed consensus reasoning, security threat modeling, and the institutional knowledge of why a particular architecture was chosen — context AI cannot recover from code alone',
    evolutionBy2030: 'Backend engineers will evolve toward platform engineering and AI infrastructure roles — managing AI tool integrations, orchestration pipelines, and reliability of AI-serving systems',
    growthRoles: ['Platform Engineer', 'Staff/Principal Engineer', 'Site Reliability Engineer (SRE)'],
  },

  sw_devops: {
    uniqueRisks: [
      'Infrastructure-as-code (Terraform, Pulumi) generation is increasingly AI-assisted — routine IaC authoring is being compressed',
      'AI observability tools (Datadog AI, Dynatrace Davis) are automating alert triage and root cause analysis that previously required senior SRE attention',
      'Deployment pipeline configuration (GitHub Actions, CircleCI) is an area where AI copilots can generate functional YAML from descriptions',
    ],
    uniqueOpportunities: [
      'AI infrastructure management itself is a growing discipline — running AI workloads at scale (GPU clusters, inference optimization) is a new DevOps specialization',
      'Security DevOps (DevSecOps) is a high-demand, undersupplied specialization where AI tool adoption is lowest due to regulatory requirements',
      'FinOps (cloud cost optimization) is growing as AI workloads dramatically increase cloud spend — a new specialization requiring both engineering and financial judgment',
    ],
    aiToolsImpacting: ['GitHub Copilot', 'Datadog AI', 'Dynatrace Davis', 'AWS CodeWhisperer', 'HashiCorp AI'],
    humanEdge: 'Production incident response requiring cross-team coordination, capacity planning with organizational context, change management across stakeholder groups, and judgment calls during high-stakes outages',
    evolutionBy2030: 'DevOps roles will bifurcate into AI infrastructure specialists (managing AI workload pipelines) and platform engineers (internal developer platforms) — with traditional CI/CD work largely automated',
    growthRoles: ['Platform Engineer', 'AI Infrastructure Engineer', 'DevSecOps Engineer'],
  },

  sw_cloud: {
    uniqueRisks: [
      'Cloud provider AI services are absorbing traditional cloud architect work — AWS/Azure/GCP native AI increasingly handles optimization that required manual configuration',
      'Multi-cloud management platforms with AI optimization (Spot.io, CloudHealth) are automating cost and performance tuning',
      'Cloud certification commoditization — basic cloud architect skills are increasingly common, compressing differentiation for mid-level practitioners',
    ],
    uniqueOpportunities: [
      'Cloud security architecture (zero trust, IAM design, compliance frameworks) is a critical high-value specialization with regulatory tailwinds',
      'AI cloud infrastructure (managing GPU clusters, LLM deployment, vector databases) is a new discipline with severe talent shortage',
      'Multi-cloud cost governance at enterprise scale requires architectural judgment and organizational influence that AI tools cannot substitute',
    ],
    aiToolsImpacting: ['AWS Trusted Advisor AI', 'Azure Advisor', 'GCP Recommender', 'Spot.io', 'CloudHealth'],
    humanEdge: 'Enterprise cloud strategy, vendor negotiation, compliance and security architecture design, and the organizational change management required for large-scale cloud migrations',
    evolutionBy2030: 'Cloud architects will increasingly specialize in AI infrastructure and governance — designing the environments where AI systems run, rather than traditional application workload hosting',
    growthRoles: ['Cloud Security Architect', 'AI Infrastructure Architect', 'Enterprise Cloud Strategy Lead'],
  },

  ml_engineer: {
    uniqueRisks: [
      'AutoML platforms (Google AutoML, H2O.ai, DataRobot) are automating model selection, hyperparameter tuning, and basic feature engineering',
      'Foundation models (GPT-4, Claude, Gemini) are replacing the need for training custom models for many common NLP and classification tasks',
      'AI model deployment infrastructure is being commoditized through managed services — MLOps tools are reducing the engineering depth required',
    ],
    uniqueOpportunities: [
      'ML engineers who understand production AI system reliability, latency optimization, and model drift monitoring are in acute shortage',
      'Fine-tuning and adaptation of foundation models for specialized domains requires deep ML understanding that AutoML cannot replicate',
      'AI safety, model evaluation, and red-teaming are growing fields with strong demand and almost no supply of qualified practitioners',
    ],
    aiToolsImpacting: ['AutoML platforms', 'Weights & Biases', 'MLflow', 'Google Vertex AI', 'AWS SageMaker'],
    humanEdge: 'Novel architecture design, identifying failure modes before production deployment, evaluating model behavior on distribution shifts, and making principled tradeoffs between performance and explainability',
    evolutionBy2030: 'ML engineers will focus increasingly on foundation model adaptation, AI system reliability, and evaluation infrastructure — the commodity model-training layer will largely be automated',
    growthRoles: ['AI Systems Engineer', 'ML Infrastructure Lead', 'AI Safety Researcher'],
  },

  data_eng: {
    uniqueRisks: [
      'AI-powered ETL tools (Fivetran, Airbyte with AI) are automating pipeline creation from natural language descriptions of desired data transformations',
      'Text-to-SQL AI (GitHub Copilot for SQL, DataGPT) is enabling non-engineers to query and transform data directly, reducing demand for pure SQL engineering',
      'Data mesh and data fabric platforms are moving toward self-service — reducing the number of engineers needed per data domain',
    ],
    uniqueOpportunities: [
      'Real-time streaming data infrastructure (Kafka, Flink) at scale remains a complex, high-value engineering discipline with growing demand',
      'Data quality and observability engineering is a growing specialization — AI systems require rigorous data pipelines that AI tools themselves cannot design',
      'AI training data infrastructure (data labeling pipelines, dataset curation, synthetic data) is a new discipline with significant investment',
    ],
    aiToolsImpacting: ['GitHub Copilot', 'Fivetran AI', 'DataGPT', 'Databricks AI', 'dbt AI', 'AWS Glue AI'],
    humanEdge: 'Data architecture decisions requiring business context, debugging complex pipeline failures across distributed systems, and data governance judgment that requires regulatory and organizational understanding',
    evolutionBy2030: 'Data engineers will shift toward AI data infrastructure — designing the pipelines, quality systems, and governance frameworks that AI models need to operate reliably at scale',
    growthRoles: ['Data Architect', 'AI Data Infrastructure Engineer', 'Data Platform Lead'],
  },

  fin_account: {
    uniqueRisks: [
      'AI accounting tools (Intuit AI, Sage AI, QuickBooks AI) are automating transaction categorization, reconciliation, and basic financial reporting',
      'Tax preparation AI (TurboTax AI, H&R Block AI) is absorbing standardized tax compliance work for most SMB clients',
      'Accounts payable and receivable automation (Tipalti, Bill.com AI) is eliminating large portions of traditional bookkeeping work',
    ],
    uniqueOpportunities: [
      'CFO advisory services — strategic financial counsel for growth-stage companies requires judgment and relationship trust AI cannot replicate',
      'M&A due diligence and financial forensics is a growing high-value service that requires investigative judgment and contextual expertise',
      'Sustainability accounting (ESG reporting, carbon accounting) is a new regulatory-driven specialization with almost no qualified practitioners',
    ],
    aiToolsImpacting: ['Intuit AI', 'Sage AI', 'QuickBooks AI', 'Tipalti', 'Bill.com', 'Workiva AI', 'OneStream'],
    humanEdge: 'Judgment calls in gray-area accounting standards, client relationship management for high-stakes financial decisions, complex tax planning requiring contextual business understanding, and fraud investigation requiring investigative intuition',
    evolutionBy2030: 'Accountants will shift from transaction processing to financial intelligence — interpreting AI-generated analyses, advising on strategy, and ensuring compliance in an increasingly complex regulatory environment',
    growthRoles: ['CFO Advisory Consultant', 'ESG/Sustainability Accountant', 'Forensic Accountant'],
  },

  fin_audit: {
    uniqueRisks: [
      'AI continuous monitoring systems (AuditBoard AI, Workiva) are automating transaction-level audit testing that previously required large audit teams',
      'Risk assessment algorithms are replacing the initial risk scoring that junior auditors typically performed',
      'Document review and exception detection automation is compressing the audit support role significantly',
    ],
    uniqueOpportunities: [
      'AI audit itself — auditing AI systems, models, and algorithms is a new regulatory requirement creating strong demand for specialized practitioners',
      'Enterprise risk management for AI-related business risks is a growing advisory service with few qualified practitioners',
      'Cybersecurity auditing is experiencing strong demand growth driven by regulatory requirements and AI-related attack surface expansion',
    ],
    aiToolsImpacting: ['AuditBoard AI', 'Workiva AI', 'EY Canvas', 'PwC Halo', 'Deloitte Argus'],
    humanEdge: 'Professional skepticism and fraud detection requiring pattern recognition built from experience, stakeholder interviews requiring human trust, complex accounting standard interpretation in novel situations, and regulatory interaction that demands human accountability',
    evolutionBy2030: 'Auditors will shift from testing transactions to auditing AI systems and complex risk frameworks — the transaction-level testing layer will be fully automated, with human auditors focused on systemic and strategic risk',
    growthRoles: ['AI Auditor', 'Chief Risk Officer (CRO) Track', 'Cybersecurity Audit Specialist'],
  },

  qa_manual: {
    uniqueRisks: [
      'AI-powered test generation tools (Testim, Mabl, Rainforest) can auto-generate test cases from user stories and automatically update them when UI changes',
      'Visual regression testing AI (Percy, Applitools) is replacing manual visual inspection across thousands of screen states',
      'Exploratory testing AI tools can now discover edge cases by simulating user behavior patterns — one of the last manual QA strongholds',
    ],
    uniqueOpportunities: [
      'QA engineering (automation, framework design) is a significantly stronger career position than manual testing — the transition is well-defined and achievable',
      'AI system testing is a new discipline requiring understanding of probabilistic outputs, hallucination detection, and safety evaluation — very few QA practitioners have these skills',
      'Performance and load testing engineering remains complex and human-directed, with AI tools assisting but not replacing architectural thinking',
    ],
    aiToolsImpacting: ['Testim', 'Mabl', 'Rainforest QA', 'Applitools', 'Percy', 'Functionize', 'Selenium AI extensions'],
    humanEdge: 'Exploratory testing requiring empathy for real user mental models, edge case discovery from domain knowledge, QA advocacy and communication with product teams, and judgment on acceptable risk levels for releases',
    evolutionBy2030: 'Manual QA roles will largely not exist in their current form — practitioners who have not transitioned to automation engineering or AI system evaluation will face direct displacement',
    growthRoles: ['QA Automation Engineer', 'AI/ML Testing Specialist', 'Quality Engineering Lead'],
  },

  bpo_inbound: {
    uniqueRisks: [
      'LLM-powered customer service AI (Intercom AI, Zendesk AI, Salesforce Einstein) now handles 40–60% of inbound customer queries without human intervention',
      'Voice AI systems (Google CCAI, Amazon Connect AI) are reaching human-parity for structured customer service calls — major BPO contracts are converting',
      'BPO companies are actively deploying AI to reduce headcount — the business model itself is shifting away from human-scale operations',
    ],
    uniqueOpportunities: [
      'Complex complaint escalation handling requiring regulatory knowledge and human empathy remains a valued specialization within customer service',
      'AI training and quality management — monitoring, evaluating, and improving AI customer service systems — is a new role emerging within BPO firms',
      'High-value customer relationship management (VIP accounts, enterprise clients) requires trust and relationship depth AI cannot replicate',
    ],
    aiToolsImpacting: ['Intercom AI', 'Zendesk AI', 'Salesforce Einstein', 'Google CCAI', 'Amazon Connect AI', 'Kore.ai', 'LivePerson AI'],
    humanEdge: 'De-escalation in emotionally charged situations requiring empathy and flexibility, complex multi-factor problem resolution requiring contextual judgment, and relationship management for high-value accounts where the human connection is part of the product',
    evolutionBy2030: 'Standard inbound customer service roles at scale will largely be handled by AI — human agents will be reserved for complex, high-stakes, or high-value customer interactions',
    growthRoles: ['Customer Success Manager', 'AI Quality Analyst (CX)', 'Enterprise Account Manager'],
  },

  des_ux: {
    uniqueRisks: [
      'Figma AI and Framer AI can generate design variations from text prompts — reducing the volume of exploratory design work needed from mid-level designers',
      'AI usability testing tools (Maze AI, UserZoom AI) are replacing some forms of basic usability research previously requiring researcher-led sessions',
      'Automated accessibility auditing AI is absorbing the compliance-checking layer of UX work',
    ],
    uniqueOpportunities: [
      'Strategic UX (product strategy, design leadership, design systems governance) is growing in importance — decisions that affect user experience at organizational level remain human-directed',
      'AI product design itself is a new UX challenge — designing AI-powered experiences that are trustworthy, transparent, and usable requires expertise no existing AI tool has',
      'Accessibility engineering beyond compliance (inclusive design, neurodiversity-aware UX) is a growing specialization driven by regulation and social awareness',
    ],
    aiToolsImpacting: ['Figma AI', 'Framer AI', 'Uizard', 'Galileo AI', 'Maze AI', 'Midjourney', 'DALL-E'],
    humanEdge: 'User research requiring genuine human empathy and contextual observation, design strategy requiring business acumen and stakeholder influence, facilitating design thinking workshops, and making values-based design decisions that require ethical judgment',
    evolutionBy2030: 'UX practitioners will shift from pixel execution to design intelligence — directing AI tools for visual work while focusing on research, strategy, systems thinking, and AI product experience design',
    growthRoles: ['Product Design Lead', 'AI UX Specialist', 'Design Systems Architect'],
  },

  hr_recruit: {
    uniqueRisks: [
      'AI sourcing tools (SeekOut, Beamery, Eightfold AI) can identify and screen candidates at 10x the speed of human recruiters — compressing volume recruiting roles',
      'AI interview tools (HireVue, Interviewing.io AI) are automating first-round screening interviews for many companies',
      'ATS AI (Greenhouse AI, Lever AI) is automating resume screening and initial candidate ranking',
    ],
    uniqueOpportunities: [
      'Executive search and strategic talent acquisition requiring market intelligence and relationship networks is AI-resistant — top candidates are not on job boards',
      'Employer brand and candidate experience strategy requires creative judgment and organizational understanding AI cannot provide',
      'DE&I-focused talent strategy is a growing specialization requiring human judgment about bias, fairness, and representation that AI systems consistently underperform on',
    ],
    aiToolsImpacting: ['SeekOut', 'Beamery', 'Eightfold AI', 'HireVue', 'LinkedIn Recruiter AI', 'Greenhouse AI', 'Paradox (Olivia)'],
    humanEdge: 'Relationship building with passive candidates, judgment calls on candidate fit beyond profile data, negotiation and offer management requiring human persuasion, and executive assessment requiring deep human evaluation',
    evolutionBy2030: 'High-volume recruiting will be largely AI-managed — human recruiters will focus on executive search, strategic talent planning, and managing the candidate experience for complex or sensitive hires',
    growthRoles: ['Talent Strategist', 'Executive Recruiter', 'People Analytics Lead'],
  },

  pm_product: {
    uniqueRisks: [
      'AI roadmapping tools (Productboard AI, Aha! AI) are automating requirements synthesis and prioritization scoring — reducing demand for junior PM execution work',
      'AI can now generate user story backlogs, acceptance criteria, and sprint plans from high-level feature descriptions — compressing PM documentation overhead significantly',
      'ChatGPT and Claude are enabling engineers and designers to bypass PM bottlenecks for routine prioritization — reducing perceived need for mid-level PMs',
    ],
    uniqueOpportunities: [
      'Strategic product leadership — defining market positioning, setting multi-year roadmaps, and aligning cross-functional teams is growing in value as execution becomes automated',
      'AI product strategy itself is a new specialization — PMs who deeply understand AI capabilities and limitations are needed to define the next generation of AI-native products',
      'Customer discovery and qualitative research requiring live empathetic conversation remains irreplaceable — PMs who invest in this become the organizational truth-tellers',
    ],
    aiToolsImpacting: ['Productboard AI', 'Aha! AI', 'Notion AI', 'Linear AI', 'Copilot', 'ChatGPT', 'Jira AI'],
    humanEdge: 'Defining what to build when the opportunity space is ambiguous, synthesizing conflicting stakeholder interests, building organizational trust to influence without authority, and making judgment calls on product bets with incomplete data',
    evolutionBy2030: 'Product managers will evolve from backlog managers to strategic product directors — using AI to handle execution coordination while focusing on discovery, vision, and organizational alignment',
    growthRoles: ['VP of Product', 'Chief Product Officer', 'AI Product Strategist'],
  },

  ds_analyst: {
    uniqueRisks: [
      'AI-powered analytics platforms (Tableau AI, Looker AI, Power BI Copilot) can auto-generate insights, dashboards, and narratives from raw data — reducing demand for standard reporting analysts',
      'Text-to-SQL tools (DataGPT, AI2sql, Copilot for SQL) are enabling business stakeholders to query data directly — bypassing data analyst intermediaries for standard queries',
      'AutoML platforms are democratizing predictive modeling — business users can now build and deploy ML models for common use cases without data science expertise',
    ],
    uniqueOpportunities: [
      'Causal inference and experimental design (A/B testing, quasi-experiments) remains a high-value specialization — statistical rigor in business decisions is growing not shrinking',
      'Analytics engineering (dbt, data modeling, metric layer governance) is an emerging critical role as data quality becomes the bottleneck for AI system quality',
      'AI system evaluation and monitoring is a new discipline — measuring whether AI products are working requires data science expertise AI tools cannot apply to themselves',
    ],
    aiToolsImpacting: ['Tableau AI', 'Power BI Copilot', 'Looker AI', 'DataGPT', 'AWS SageMaker', 'Google Analytics AI', 'Databricks AI'],
    humanEdge: 'Framing the right business question before any analysis begins, navigating organizational politics to ensure insights lead to action, communicating statistical nuance to non-technical stakeholders, and detecting when data quality problems invalidate conclusions',
    evolutionBy2030: 'Data analysts will bifurcate into AI-augmented analytics engineers (owning data infrastructure quality) and strategic insight consultants (translating AI output into business decisions) — pure reporting roles will be fully automated',
    growthRoles: ['Analytics Engineer', 'Senior Data Scientist', 'Head of Business Intelligence'],
  },

  mkt_digital: {
    uniqueRisks: [
      'AI creative generation (Jasper, Copy.ai, Midjourney, DALL-E) is dramatically reducing production costs for ad copy, social content, and creative assets — compressing volume execution roles',
      'Automated media buying and campaign optimization (Google Performance Max, Meta Advantage+) is absorbing the manual campaign management work that previously required specialist attention',
      'AI SEO and content strategy tools (Clearscope AI, Surfer SEO, MarketMuse) are automating keyword research, content briefs, and competitive analysis',
    ],
    uniqueOpportunities: [
      'Growth strategy and full-funnel marketing architecture requiring business acumen and experimental design remains AI-resistant — these skills are in higher demand as execution is automated',
      'Brand strategy and creative direction — the judgment layer above AI-generated creative — is a growing specialization as organizations realize AI content without human editorial direction produces mediocre results',
      'Marketing analytics and attribution modeling is becoming more complex as privacy regulations reduce tracking — practitioners who can navigate privacy-safe measurement are in acute shortage',
    ],
    aiToolsImpacting: ['Jasper AI', 'Copy.ai', 'Midjourney', 'Google Performance Max', 'Meta Advantage+', 'HubSpot AI', 'Clearscope', 'Surfer SEO'],
    humanEdge: 'Brand voice and cultural resonance judgment, creative direction that ensures AI content reflects company values, community management requiring authentic human presence, and growth experimentation requiring structured business intuition',
    evolutionBy2030: 'Digital marketers will split into AI orchestrators (directing AI tools for execution at scale) and brand strategists (protecting human-judgment work in positioning, culture, and creative direction)',
    growthRoles: ['Growth Marketing Lead', 'Brand Strategy Director', 'Marketing Analytics Manager'],
  },

  sales_ae: {
    uniqueRisks: [
      'AI SDR tools (Outreach AI, Salesloft AI, 6sense) are automating prospecting, qualification, and initial outreach — compressing the top-of-funnel AE workload',
      'AI proposal and contract generation (Pandadoc AI, Salesforce Einstein) is reducing the document preparation time that mid-level AEs spent on deal administration',
      'AI call coaching (Gong, Chorus) is providing real-time performance feedback that previously required senior sales manager involvement — reducing the value of experience accumulation',
    ],
    uniqueOpportunities: [
      'Enterprise complex sales requiring multi-stakeholder navigation, executive relationships, and long deal cycles grows in value as transactional sales is automated — experience premium increases',
      'Sales engineering and technical consulting for complex B2B products is a high-value specialization where AI augments but cannot replace the technical-commercial hybrid skill',
      'Customer success management (retention, expansion) is a growing role as companies shift from acquisition-focused to retention-focused revenue models — AI amplifies but cannot replace relationship management',
    ],
    aiToolsImpacting: ['Salesforce Einstein', 'Gong AI', 'Chorus AI', '6sense', 'Outreach AI', 'Salesloft AI', 'HubSpot AI', 'Pandadoc AI'],
    humanEdge: 'Complex negotiation requiring reading room dynamics and adjusting in real time, building executive trust relationships over multi-year deal cycles, navigating buying committee politics, and creative deal structuring that requires understanding both sides\' constraints',
    evolutionBy2030: 'Transactional and SMB sales will be largely AI-managed — human AEs will focus on strategic enterprise accounts, complex multi-stakeholder deals, and relationship-intensive segments where trust is the primary buying factor',
    growthRoles: ['Enterprise Account Executive', 'VP of Sales', 'Sales Engineer'],
  },

  ops_supply: {
    uniqueRisks: [
      'AI demand forecasting (Blue Yonder, o9 Solutions, Kinaxis) is automating the inventory and supply planning work that previously required large analyst teams',
      'Autonomous procurement AI is handling routine supplier negotiations and PO generation — compressing buyer roles for standard commodities',
      'Digital twin simulation platforms are automating the scenario modeling and what-if analysis previously performed by supply chain analysts',
    ],
    uniqueOpportunities: [
      'Resilience engineering and supply chain risk management is a growing priority — geopolitical disruptions, climate events, and pandemic risk have elevated this specialization significantly',
      'Sustainable supply chain design (carbon footprint, ESG compliance) is a new regulatory-driven specialization with almost no qualified practitioners',
      'Supplier relationship management for critical and sole-source suppliers remains deeply human — trust, flexibility, and long-term relationship investment cannot be automated',
    ],
    aiToolsImpacting: ['Blue Yonder AI', 'o9 Solutions', 'Kinaxis', 'SAP IBP AI', 'Coupa AI', 'Oracle SCM AI'],
    humanEdge: 'Navigating supply disruptions requiring real-time judgment and relationship leverage with suppliers, strategic sourcing negotiations requiring cultural intelligence and long-term positioning, and complex risk assessment that requires organizational context AI lacks',
    evolutionBy2030: 'Supply chain professionals will shift from operational execution to risk intelligence and resilience architecture — using AI to handle routine planning while focusing on strategic supplier relationships and disruption preparedness',
    growthRoles: ['Supply Chain Risk Manager', 'Procurement Strategist', 'Resilience & Sustainability Lead'],
  },

  nurse_rn: {
    uniqueRisks: [
      'AI diagnostic support tools (Sepsis AI, deterioration prediction models) are absorbing documentation and monitoring tasks that previously required constant human attention',
      'AI-powered nursing documentation (Ambient AI, Nuance DAX) is automating the charting burden — changing the time allocation of nursing work but not reducing headcount yet',
      'Remote patient monitoring AI is enabling hospital-at-home programs that reduce inpatient census, creating long-term structural headcount pressure at the ward level',
    ],
    uniqueOpportunities: [
      'Nursing is among the most structurally protected professions — physical, emotional, and licensed care roles have exceptionally strong regulatory and ethical barriers to AI substitution',
      'Advanced Practice Registered Nurses (APRNs, NPs) have significant clinical autonomy and scope expansion — a well-defined high-value evolution path from staff RN',
      'Care coordination and case management for complex patients is a growing high-value specialization as healthcare shifts toward value-based care models',
    ],
    aiToolsImpacting: ['Sepsis AI', 'Nuance DAX Ambient', 'Epic AI', 'Cerner AI', 'Remote monitoring AI'],
    humanEdge: 'Physical care requiring touch, movement assistance, and procedural skills AI cannot perform; therapeutic presence and empathy in patient distress; family communication requiring nuance and compassion; and clinical judgment in rapidly evolving patient states',
    evolutionBy2030: 'Nurses will use AI to reduce documentation burden and receive earlier warning signals on deterioration — their core care delivery role remains human-essential, though documentation and monitoring tasks will be substantially automated',
    growthRoles: ['Nurse Practitioner (NP)', 'Care Coordination Specialist', 'Clinical Informatics Nurse'],
  },

  teach_k12: {
    uniqueRisks: [
      'AI tutoring systems (Khan Academy Khanmigo, Duolingo AI, Synthesis) are providing personalized learning at scale — reducing the perceived need for one-size-fits-all instruction and potentially some specialist tutoring roles',
      'AI content generation (lesson plans, worksheets, assessments) is automating much of the preparation work teachers spend 30–40% of their time on',
      'Budget pressure from AI-efficiency arguments is increasing class sizes while reducing support staff, adding load to individual teachers',
    ],
    uniqueOpportunities: [
      'K-12 teaching is among the most protected professions — licensed, regulated, and requiring physical presence — with strong institutional and union protection',
      'Special education and individualized support requires adaptive human empathy that AI systems are explicitly designed not to fully replicate',
      'School leadership and curriculum design is a growing area as AI tools require expert human direction to be deployed responsibly in educational settings',
    ],
    aiToolsImpacting: ['Khan Academy Khanmigo', 'Duolingo AI', 'Google Classroom AI', 'Turnitin AI', 'Synthesis AI'],
    humanEdge: 'Classroom presence and relationship-building with individual students requiring genuine empathy, motivating students through obstacles using personal connection, managing group dynamics requiring social intelligence, and making ethical judgments about student wellbeing',
    evolutionBy2030: 'Teachers will use AI for differentiated content delivery and early identification of learning gaps — their core role will shift from content delivery toward coaching, mentorship, and social-emotional development as AI handles individualized instruction',
    growthRoles: ['Instructional Designer', 'EdTech Curriculum Specialist', 'School Administrator / Principal'],
  },

  eng_civil: {
    uniqueRisks: [
      'Generative design AI (Autodesk Generative Design, Spacemaker) is automating early-stage design exploration that previously required significant engineer time',
      'AI structural analysis tools are performing calculation verification and code compliance checks faster than human engineers — reducing the support work in large firms',
      'BIM automation and clash detection AI is compressing the coordination work that mid-level civil engineers traditionally performed on large projects',
    ],
    uniqueOpportunities: [
      'Infrastructure investment is at a multi-decade high globally (IRA, EU Green Deal, emerging market urbanization) — overall demand for civil engineers is growing faster than AI can compress roles',
      'Climate resilience engineering (flood defense, sea level rise, extreme weather infrastructure) is a growing specialization with almost no supply of experienced practitioners',
      'Project management and owner\'s representative roles — managing complex multi-stakeholder infrastructure projects — are growing in value as technical execution becomes more automated',
    ],
    aiToolsImpacting: ['Autodesk Generative Design', 'Spacemaker AI', 'Bentley AI', 'Civil 3D AI', 'Procore AI'],
    humanEdge: 'Site judgment requiring physical presence and contextual evaluation of ground conditions, stakeholder negotiation with government agencies and communities, project risk management requiring accountability that AI cannot legally bear, and licensed professional sign-off required by law',
    evolutionBy2030: 'Civil engineers will use AI to dramatically accelerate design iteration and analysis — their human value will concentrate in project leadership, stakeholder management, risk accountability, and the licensed sign-off that regulation requires',
    growthRoles: ['Infrastructure Project Director', 'Climate Resilience Engineer', 'Owner\'s Representative / PM'],
  },

  fin_analyst: {
    uniqueRisks: [
      'AI financial modeling tools (Runway AI, Cube, Vena AI) are automating the Excel-based modeling work that junior analysts spend 60%+ of their time on',
      'AI earnings analysis and research report generation is reaching publication-quality for standard coverage — compressing junior equity research roles at major firms',
      'Alternative data analysis AI is automating the signal extraction from satellite imagery, credit card data, and web scraping that previously required quant analyst teams',
    ],
    uniqueOpportunities: [
      'Investment judgment and portfolio positioning requires conviction and accountability — fund managers and senior analysts who can defend their thesis under pressure remain highly valued',
      'Relationship-driven capital markets roles (coverage banking, equity sales) depend on trusted human relationships with institutional clients — AI can support but cannot replace',
      'ESG integration and impact measurement is a growing specialization requiring both financial and sustainability domain expertise that AI tools cannot reliably provide',
    ],
    aiToolsImpacting: ['Bloomberg AI', 'Kensho AI', 'FactSet AI', 'Refinitiv AI', 'Runway AI', 'AlphaSense', 'Copilot for Finance'],
    humanEdge: 'Constructing conviction-based investment theses requiring judgment about qualitative factors, managing client relationships in high-stress market environments, synthesizing regulatory and political risk that is underrepresented in training data, and navigating complex M&A dynamics requiring negotiation judgment',
    evolutionBy2030: 'Financial analysts will shift from data compilation to insight synthesis — using AI to handle modeling and data extraction while focusing on investment thesis construction, client communication, and the judgment calls that require human accountability',
    growthRoles: ['Portfolio Manager', 'Investment Banking VP', 'Chief Investment Officer'],
  },

  sw_mobile: {
    uniqueRisks: [
      'AI code generation tools (Copilot, Cursor) now produce functional Swift and Kotlin code for standard UI components — compressing boilerplate-heavy mobile development',
      'No-code mobile platforms (Adalo, Glide, Thunkable) are enabling non-developers to build functional mobile apps, reducing total addressable market for junior mobile developers',
      'React Native and Flutter cross-platform frameworks with AI code generation are allowing web developers to produce mobile apps without native expertise — eroding the native developer specialization',
    ],
    uniqueOpportunities: [
      'Performance engineering for mobile — app startup time, memory management, battery optimization — remains deeply human-judgment-intensive and is increasingly a competitive differentiator',
      'Platform-specific capability integration (ARKit/ARCore, on-device ML, health sensors, biometrics) requires native expertise that AI tools cannot reliably generate correct code for',
      'Mobile security engineering (secure data storage, certificate pinning, runtime protection) is a growing specialization as mobile becomes the primary financial transaction surface',
    ],
    aiToolsImpacting: ['GitHub Copilot', 'Cursor', 'Xcode AI', 'Android Studio AI', 'Claude', 'ChatGPT'],
    humanEdge: 'Platform-specific UX judgment (iOS HIG vs Material Design), native API integration requiring contextual understanding of platform evolution, app store optimization and review management requiring human negotiation, and debugging hardware-specific issues that require physical device testing',
    evolutionBy2030: 'Mobile developers will shift from native UI implementation toward platform architecture, AI feature integration (on-device ML, computer vision), and the platform-specific engineering that AI code generators consistently get wrong',
    growthRoles: ['Mobile Platform Architect', 'iOS/Android Technical Lead', 'Mobile AI Features Engineer'],
  },

  leg_paralegal: {
    uniqueRisks: [
      'LegalZoom AI, Harvey AI, and Lexis+ AI can draft standard contracts, conduct legal research, and summarize case law at paralegal quality',
      'Document review and eDiscovery AI is eliminating large volumes of traditional paralegal document work',
      'Law firm AI copilots are enabling attorneys to perform tasks previously delegated to paralegals — compressing the role from above',
    ],
    uniqueOpportunities: [
      'Legal technology implementation and management within law firms — someone needs to evaluate, implement, and govern AI legal tools',
      'Compliance program management for AI and data privacy regulations is a growing specialization requiring both legal and technology understanding',
      'Litigation support and trial preparation — physical evidence management, court logistics, witness preparation — remains human-directed',
    ],
    aiToolsImpacting: ['Harvey AI', 'Lexis+ AI', 'Westlaw AI', 'LegalZoom AI', 'Casetext (Thomson Reuters)', 'Contract Pod Ai'],
    humanEdge: 'Client communication requiring empathy and trust, complex document assembly requiring contextual judgment, court procedure execution requiring physical presence and human accountability, and investigation work requiring interview skills',
    evolutionBy2030: 'Standard paralegal research and drafting will largely be handled by AI — practitioners will evolve toward legal technology management, compliance program administration, and high-judgment litigation support',
    growthRoles: ['Legal Technology Manager', 'Compliance Program Specialist', 'Contract Lifecycle Manager'],
  },
};

export function getRoleNarrative(roleKey: string): RoleIntelligence | null {
  return ROLE_INTELLIGENCE[roleKey] ?? null;
}

// Fallback for unmapped roles — generates generic narrative from score context
export function getGenericRoleNarrative(
  score: number,
  industry: string,
): RoleIntelligence {
  const isHighRisk = score >= 65;
  const isMedRisk  = score >= 40;

  return {
    uniqueRisks: isHighRisk ? [
      'Your role\'s core execution tasks are within reach of current AI automation tools',
      'AI tools in your sector are being adopted by peer organizations — the pressure is competitive, not theoretical',
    ] : isMedRisk ? [
      'AI tools are beginning to augment parts of your role\'s work — the execution layer is the most exposed',
      'The pace of AI adoption in your industry is accelerating — the window for proactive positioning is narrowing',
    ] : [
      'Your role has meaningful AI exposure in specific task categories, though your human judgment premium remains high',
    ],
    uniqueOpportunities: [
      'Professionals who can use AI tools to multiply their output are commanding significant salary premiums in your field',
      'AI governance, oversight, and quality management roles are emerging across all industries — a natural evolution path',
      'Specialist depth in your domain remains valuable — AI tools optimize for average, not for expert-level contextual judgment',
    ],
    aiToolsImpacting: ['AI copilots', 'Automation platforms', 'Large language models'],
    humanEdge: 'Complex judgment calls requiring contextual expertise, stakeholder relationships requiring trust, and creative problem-solving in novel situations AI tools have not been trained on',
    evolutionBy2030: 'Your role will evolve toward AI-augmented execution — using AI to handle routine work while focusing your expertise on higher-judgment, higher-value outputs',
    growthRoles: ['AI-Augmented Specialist', 'Domain Expert + AI Lead', 'Strategy and Advisory Role'],
  };
}
