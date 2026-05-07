import { CareerIntelligence } from './types.ts';

export const TECH_INTELLIGENCE: Record<string, CareerIntelligence> = {
  sw_software_engineer: {
    displayRole: 'Software Engineer',
    summary: 'Moderate-to-high disruption in commodity implementation work; resilience remains strongest in systems judgment, product-context tradeoffs, and AI-supervised delivery.',
    skills: {
      obsolete: [
        { skill: 'Routine feature boilerplate and CRUD implementation', riskScore: 90, riskType: 'Automatable', horizon: '1-2yr', reason: 'AI coding agents generate standard endpoints, tests, and wiring with high precision.', aiReplacement: 'Full', aiTool: 'GitHub Copilot, Cursor, Claude Code' },
      ],
      at_risk: [
        { skill: 'Standard refactors and framework migration chores', riskScore: 72, riskType: 'Augmented', horizon: '2-3yr', reason: 'AI assistants can execute repetitive refactors, but humans still validate architecture and regression risk.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'System Design Tradeoff Judgment', whySafe: 'Choosing the right boundaries, failure modes, and delivery tradeoffs for a specific product context still requires human engineering judgment.', longTermValue: 97, difficulty: 'High' },
        { skill: 'AI Output Review and Production Validation', whySafe: 'The highest-value engineer is increasingly the person who can prove AI-generated code is correct, secure, and maintainable in production.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'AI-First Engineering Lead', riskReduction: 48, skillGap: 'AI delivery workflows, review systems, architecture leadership', transitionDifficulty: 'Medium', industryMapping: ['Tech', 'Enterprise SaaS'], salaryDelta: '+30-70%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
      { role: 'Software Architect', riskReduction: 56, skillGap: 'Distributed systems, platform tradeoffs, architecture communication', transitionDifficulty: 'Hard', industryMapping: ['Enterprise', 'Scale-ups'], salaryDelta: '+40-90%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    inactionScenario: 'Software engineers who compete on raw output volume alone will be compressed by AI-assisted peers. Those who own architecture, validation, and product-context reasoning will pull ahead.',
    riskTrend: [{ year: 2024, riskScore: 34, label: 'Now' }, { year: 2025, riskScore: 41, label: '+1yr' }, { year: 2026, riskScore: 49, label: '+2yr' }, { year: 2027, riskScore: 56, label: '+3yr' }, { year: 2028, riskScore: 62, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['tech-sector', 'moderate-risk', 'software-core', 'ai-augmented', 'architecture-moat'],
    evolutionHorizon: '2027',
  },
  sw_backend: {
    displayRole: 'Backend Developer',
    summary: 'High resilience in architecture and integration; significant disruption in boilerplate and standard API logic.',
    skills: {
      obsolete: [{ skill: 'CRUD API boilerplate', riskScore: 92, riskType: 'Automatable', horizon: '1-2yr', reason: 'LLMs generate standard CRUD logic with high precision.', aiReplacement: 'Full', aiTool: 'Github Copilot, Cursor' }],
      at_risk: [{ skill: 'Performance optimization', riskScore: 65, riskType: 'Augmented', horizon: '3yr', reason: 'AI analyzes profiling data better than humans.', aiReplacement: 'Partial' }],
      safe: [{ skill: 'Distributed Systems Architecture', whySafe: 'Complex cross-service coordination requires high-level human synthesis.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'AI/LLM Systems Engineer', riskReduction: 65, skillGap: 'LangChain, Vector DBs, RAG', transitionDifficulty: 'Medium', industryMapping: ['Tech'], salaryDelta: '+40–70%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    roadmap: {
      '0-2': {
        phase_1: { timeline: '30 days', focus: 'AI-First Coding', actions: [{ action: 'Master Cursor and Copilot', why: '10x productivity baseline.', outcome: 'AI Mastery' }] },
      },
    },
    inactionScenario: 'Standard boilerplate developers will be replaced. Success requires moving toward architecture and AI integration.',
    riskTrend: [{ year: 2024, riskScore: 40, label: 'Now' }, { year: 2025, riskScore: 46, label: '+1yr' }, { year: 2026, riskScore: 53, label: '+2yr' }, { year: 2027, riskScore: 59, label: '+3yr' }, { year: 2028, riskScore: 65, label: '+4yr' }],
    confidenceScore: 92,
  },
  sw_frontend: {
    displayRole: 'Frontend Developer',
    summary: 'Moderate resilience in UX logic; high disruption in UI component generation.',
    skills: {
      obsolete: [{ skill: 'Figma to Code conversion', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'Tools like v0.dev generate production code from mockups.', aiReplacement: 'Full', aiTool: 'v0' }],
      at_risk: [{ skill: 'State management boilerplate', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'AI handles redundant state patterns.', aiReplacement: 'Partial' }],
      safe: [{ skill: 'Design System Architecture', whySafe: 'Tokenization and component reuse logic requires human foresight.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Design Systems Engineer', riskReduction: 55, skillGap: 'Token systems, Accessibility', transitionDifficulty: 'Medium', industryMapping: ['Tech'], salaryDelta: '+30–50%', timeToTransition: '9 months', months_to_first_income: 3, income_dip_months: 1 }],
    inactionScenario: 'Pure UI "painters" will be replaced. Success requires moving toward UX strategy and design systems.',
    riskTrend: [{ year: 2024, riskScore: 45, label: 'Now' }, { year: 2025, riskScore: 53, label: '+1yr' }, { year: 2026, riskScore: 60, label: '+2yr' }, { year: 2027, riskScore: 68, label: '+3yr' }, { year: 2028, riskScore: 75, label: '+4yr' }],
    confidenceScore: 92,
  },
  sw_cloud: {
    displayRole: 'Cloud Engineer',
    summary: 'High resilience in complex migrations; disruption in standard infra provisioning via IaC.',
    skills: {
      obsolete: [{ skill: 'Standard cloud provisioning', riskScore: 90, riskType: 'Automatable', horizon: '1-3yr', reason: 'AI generates Terraform/Pulumi code from diagrams.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard cost monitoring', riskScore: 75, riskType: 'Augmented', horizon: '1styr', reason: 'FinOps AI automates resizing.', aiReplacement: 'Full' }],
      safe: [{ skill: 'Multi-Cloud Governance', whySafe: 'Designing zero-trust architectures across diverse global regs requires human liability.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'FinOps Specialist', riskReduction: 55, skillGap: 'Financial literacy, Unit cost analysis', transitionDifficulty: 'Medium', industryMapping: ['Enterprise'], salaryDelta: '+30–60%', timeToTransition: '9 months', months_to_first_income: 3, income_dip_months: 1 }],
    inactionScenario: 'Standard "console-clickers" will be obsolete. Success requires moving toward High-scale Architecture and FinOps.',
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2025, riskScore: 32, label: '+1yr' }, { year: 2026, riskScore: 37, label: '+2yr' }, { year: 2027, riskScore: 41, label: '+3yr' }, { year: 2028, riskScore: 45, label: '+4yr' }],
    confidenceScore: 95,
  },
  it_cybersec: {
    displayRole: 'Cybersecurity Analyst',
    summary: 'High resilience due to the zero-sum game of offense/defense; AI augments threat detection.',
    skills: {
      obsolete: [{ skill: 'Standard log analysis', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI-SIEM platforms flag 99% of routine anomalies.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Signature-based malware detection (manual)", "riskScore": 82, "riskType": "Augmented", "horizon": "2yr", "reason": "AI-driven EDR platforms detect novel malware via behavioral anomalies at machine speed, reducing need for manual signature writing.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Novel Threat Hunting', whySafe: 'Responding to zero-day attacks requires non-linear human adversarial thinking.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'DevSecOps Engineer', riskReduction: 52, skillGap: 'CI/CD security, Policy-as-code', transitionDifficulty: 'Hard', industryMapping: ['Tech'], salaryDelta: '+40–80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 22, label: '+1yr' }, { year: 2026, riskScore: 27, label: '+2yr' }, { year: 2027, riskScore: 31, label: '+3yr' }, { year: 2028, riskScore: 35, label: '+4yr' }],
    confidenceScore: 98,
  },
  it_qa: {
    displayRole: 'QA Engineer',
    summary: 'High disruption in standard test case generation; resilience in strategic test planning.',
    skills: {
      obsolete: [{ skill: 'Standard test case execution', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI agents execute and self-heal tests.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Manual regression test execution", "riskScore": 85, "riskType": "Automatable", "horizon": "2yr", "reason": "AI test orchestration tools auto-run full regression suites and generate test cases from user stories.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Strategic Test Architecture', whySafe: 'Designing the "Quality Culture" and choosing what to test.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'QA Automation Lead (AI)', riskReduction: 55, skillGap: 'Self-healing scripts', transitionDifficulty: 'Medium', industryMapping: ['Tech'], salaryDelta: '+25–45%', timeToTransition: '9 months', months_to_first_income: 3, income_dip_months: 1 }],
    riskTrend: [{ year: 2024, riskScore: 55, label: 'Now' }, { year: 2025, riskScore: 63, label: '+1yr' }, { year: 2026, riskScore: 70, label: '+2yr' }, { year: 2027, riskScore: 78, label: '+3yr' }, { year: 2028, riskScore: 85, label: '+4yr' }],
    confidenceScore: 92,
  },
  mob_ios: {
    displayRole: 'iOS Developer',
    summary: 'Moderate resilience in hardware integration.',
    skills: {
      obsolete: [{ "skill": "Hand-coded UIKit boilerplate for standard navigation patterns", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI code generation creates complete UIKit navigation stacks from brief descriptions.", "aiReplacement": "Full", "aiTool": "GitHub Copilot, Cursor" }],
      at_risk: [{ "skill": "Standard UI layout and boilerplate code generation", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI coding assistants (GitHub Copilot, Cursor) generate standard SwiftUI layouts and boilerplate from design specs.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'On-device ML Integration', whySafe: 'Optimizing for local neural engines requires deep hardware intuition.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Mobile Platform Architect', riskReduction: 58, skillGap: 'CoreML', transitionDifficulty: 'Hard', industryMapping: ['Product'], salaryDelta: '+30–60%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 41, label: '+1yr' }, { year: 2026, riskScore: 48, label: '+2yr' }, { year: 2027, riskScore: 54, label: '+3yr' }, { year: 2028, riskScore: 60, label: '+4yr' }],
    confidenceScore: 94,
  },
  ds_scientist: {
    displayRole: 'Data Scientist',
    summary: 'High disruption in modeling; resilience in problem formulation.',
    skills: {
      obsolete: [{ "skill": "Manual exploratory data visualization using matplotlib defaults", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI data analysis tools auto-generate comprehensive EDA visualizations from raw datasets.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard exploratory data analysis (EDA) on clean datasets", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI AutoML platforms auto-run EDA, feature correlation, and outlier detection with minimal human input.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Strategic Problem Formulation', whySafe: 'Defining "what" to solve for the business.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'AI Strategy Consultant', riskReduction: 65, skillGap: 'Business strategy', transitionDifficulty: 'Medium', industryMapping: ['Consulting'], salaryDelta: '+50–100%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 40, label: 'Now' }, { year: 2025, riskScore: 48, label: '+1yr' }, { year: 2026, riskScore: 56, label: '+2yr' }, { year: 2027, riskScore: 64, label: '+3yr' }, { year: 2028, riskScore: 72, label: '+4yr' }],
    confidenceScore: 95,
  },
  ml_engineer: {
    displayRole: 'ML Engineer',
    summary: 'High resilience in architecture.',
    skills: {
      obsolete: [{ "skill": "Manual model training script setup from scratch for standard architectures", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI coding assistants generate complete training pipelines for standard model architectures from configuration specs.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard model hyperparameter tuning via grid search", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "Automated ML platforms (AutoML, Optuna) optimize hyperparameters far faster and more exhaustively than manual grid search.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'AI System Architecture (RAG)', whySafe: 'Designing multi-component AI systems at scale.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Chief AI Architect', riskReduction: 70, skillGap: 'Platform strategy', transitionDifficulty: 'Very Hard', industryMapping: ['Tech'], salaryDelta: '+100–300%', timeToTransition: '60 months', months_to_first_income: 14, income_dip_months: 8 }],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2025, riskScore: 28, label: '+1yr' }, { year: 2026, riskScore: 34, label: '+2yr' }, { year: 2027, riskScore: 39, label: '+3yr' }, { year: 2028, riskScore: 45, label: '+4yr' }],
    confidenceScore: 98,
  },
  sw_embedded: {
    displayRole: 'Embedded Developer',
    summary: 'Exremely high resilience.',
    skills: {
      obsolete: [{ "skill": "Manual peripheral register initialization for standard MCU peripherals", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI code generation and MCU configurator tools generate peripheral initialization code from graphical config.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard driver code generation for common peripherals", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI coding assistants generate boilerplate HAL and driver code for standard microcontroller peripherals.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Safety-Critical Design', whySafe: 'Developing firmware where failure is fatal.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Robotics Software Engineer', riskReduction: 45, skillGap: 'ROS', transitionDifficulty: 'Medium', industryMapping: ['IoT'], salaryDelta: '+30-60%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2025, riskScore: 15, label: '+1yr' }, { year: 2026, riskScore: 19, label: '+2yr' }, { year: 2027, riskScore: 22, label: '+3yr' }, { year: 2028, riskScore: 25, label: '+4yr' }],
    confidenceScore: 98,
  },
  sw_legacy: {
    displayRole: 'Legacy Systems (COBOL)',
    summary: 'High resilience.',
    skills: {
      obsolete: [{ "skill": "Manual COBOL report generation logic for standard output formats", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI translation tools convert standard COBOL report logic to modern languages automatically.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "COBOL-to-documentation routine translation", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI code translation tools generate documentation and partial modern language equivalents from COBOL source.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Legacy Knowledge Moat', whySafe: 'Understanding "why" a system was built 40 years ago.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Modernization Architect', riskReduction: 60, skillGap: 'Cloud patterns', transitionDifficulty: 'Hard', industryMapping: ['Banking'], salaryDelta: '+50-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 19, label: '+1yr' }, { year: 2026, riskScore: 23, label: '+2yr' }, { year: 2027, riskScore: 26, label: '+3yr' }, { year: 2028, riskScore: 30, label: '+4yr' }],
    confidenceScore: 96,
  },
  it_sre: {
    displayRole: 'SRE',
    summary: 'High resilience.',
    skills: {
      obsolete: [{ "skill": "Manual log parsing using grep/awk for known error pattern searches", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI log analysis tools semantically search and correlate log events without manual pattern writing.", "aiReplacement": "Full", "aiTool": "Elastic AI, Datadog AI" }],
      at_risk: [{ "skill": "Standard alert triage from known error patterns", "riskScore": 82, "riskType": "Augmented", "horizon": "2yr", "reason": "AIOps platforms auto-classify and route alerts from recurring patterns, reducing manual triage volume.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Novel Failure Diagnosis', whySafe: 'Solving "black swan" events in massive systems.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Platform Engineer', riskReduction: 55, skillGap: 'Developer experience', transitionDifficulty: 'Medium', industryMapping: ['Tech'], salaryDelta: '+30-60%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 20, label: 'Now' }, { year: 2025, riskScore: 25, label: '+1yr' }, { year: 2026, riskScore: 30, label: '+2yr' }, { year: 2027, riskScore: 35, label: '+3yr' }, { year: 2028, riskScore: 40, label: '+4yr' }],
    confidenceScore: 98,
  },
  data_eng: {
    displayRole: 'Data Engineer',
    summary: 'Moderate resilience.',
    skills: {
      obsolete: [{ "skill": "Manual data cleaning scripts for common format inconsistencies", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI data preparation tools auto-detect and resolve common data quality issues from profiling analysis.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Routine ETL pipeline scaffolding for standard source types", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI-assisted data integration tools auto-generate connector configs and transformation logic for standard data sources.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Data Quality Governance & Ethics', whySafe: 'Ensuring biased data doesn\'t poison AI models.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'AI Infrastructure Engineer', riskReduction: 65, skillGap: 'Vector DBs', transitionDifficulty: 'Medium', industryMapping: ['Tech'], salaryDelta: '+40-80%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2025, riskScore: 34, label: '+1yr' }, { year: 2026, riskScore: 40, label: '+2yr' }, { year: 2027, riskScore: 46, label: '+3yr' }, { year: 2028, riskScore: 52, label: '+4yr' }],
    confidenceScore: 97,
  },
  it_lead: {
    displayRole: 'Tech Lead',
    summary: 'High resilience.',
    skills: {
      obsolete: [{ "skill": "Manual weekly status report compilation from team updates", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI project tools auto-aggregate team updates and generate stakeholder status reports.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard sprint planning estimates for known task types", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI project management tools auto-estimate tickets based on historical velocity and task similarity.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'High-Stakes Mentorship', whySafe: 'Developing human talent.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'VP Engineering', riskReduction: 45, skillGap: 'Business strategy', transitionDifficulty: 'Hard', industryMapping: ['Enterprise'], salaryDelta: '+50-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 21, label: '+1yr' }, { year: 2026, riskScore: 23, label: '+2yr' }, { year: 2027, riskScore: 26, label: '+3yr' }, { year: 2028, riskScore: 28, label: '+4yr' }],
    confidenceScore: 98,
  },
  sw_devops: {
    displayRole: 'DevOps Engineer',
    summary: 'High resilience.',
    skills: {
      obsolete: [{ "skill": "Manual Dockerfile and docker-compose configuration for standard web apps", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI code generation creates production-ready container configurations from application tech stack descriptions.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard CI/CD pipeline configuration for common stacks", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "Platform engineering AI tools auto-generate CI/CD configuration from detected tech stack.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Zero-Trust Architecture Design', whySafe: 'Designing security perimeters across multi-cloud.', longTermValue: 99, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Platform Architect', riskReduction: 55, skillGap: 'IDP design', transitionDifficulty: 'Hard', industryMapping: ['Tech'], salaryDelta: '+40-80%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2025, riskScore: 25, label: '+1yr' }, { year: 2026, riskScore: 29, label: '+2yr' }, { year: 2027, riskScore: 32, label: '+3yr' }, { year: 2028, riskScore: 35, label: '+4yr' }],
    confidenceScore: 98,
  },
  sw_pm: {
    displayRole: 'Product Manager',
    summary: 'High resilience.',
    skills: {
      obsolete: [{ "skill": "Manual requirements traceability matrix maintenance in spreadsheets", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI product tools auto-maintain traceability links between requirements, test cases, and features.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard user story writing from feature requests", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI product tools auto-generate user stories, acceptance criteria, and test cases from product briefs.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Market Empathy & Vision Synthesis', whySafe: 'Identifying non-obvious human needs.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'CPO', riskReduction: 60, skillGap: 'Executive strategy', transitionDifficulty: 'Very Hard', industryMapping: ['Product'], salaryDelta: '+100-300%', timeToTransition: '48 months' }],
    riskTrend: [{ year: 2024, riskScore: 25, label: 'Now' }, { year: 2025, riskScore: 29, label: '+1yr' }, { year: 2026, riskScore: 33, label: '+2yr' }, { year: 2027, riskScore: 36, label: '+3yr' }, { year: 2028, riskScore: 40, label: '+4yr' }],
    confidenceScore: 97,
  },
  sw_agile: {
    displayRole: 'Scrum Master',
    summary: 'Moderate resilience.',
    skills: {
      obsolete: [{ "skill": "Manual sprint velocity tracking and burndown chart creation", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI project tools auto-generate velocity and burndown visualizations from story completion data.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard retrospective facilitation using documented templates", "riskScore": 70, "riskType": "Augmented", "horizon": "2yr", "reason": "AI facilitation tools auto-run structured retrospectives from pre-set formats, reducing the value-add of facilitation-only Scrum Masters.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Human-Centric Conflict Resolution', whySafe: 'Managing the emotional friction in teams.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Org Design Consultant', riskReduction: 52, skillGap: 'Systems thinking', transitionDifficulty: 'Medium', industryMapping: ['Enterprise'], salaryDelta: '+30-60%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 42, label: 'Now' }, { year: 2025, riskScore: 49, label: '+1yr' }, { year: 2026, riskScore: 55, label: '+2yr' }, { year: 2027, riskScore: 62, label: '+3yr' }, { year: 2028, riskScore: 68, label: '+4yr' }],
    confidenceScore: 94,
  },
  sw_security_arch: {
    displayRole: 'Security Architect',
    summary: 'Extremely high resilience.',
    skills: {
      obsolete: [{ "skill": "Manual threat modeling diagramming for standard application architectures", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI threat modeling tools auto-generate STRIDE assessments from architecture diagrams.", "aiReplacement": "Full", "aiTool": "IriusRisk, Microsoft Threat Modeling AI" }],
      at_risk: [{ "skill": "Standard security control mapping to known compliance frameworks", "riskScore": 76, "riskType": "Augmented", "horizon": "2yr", "reason": "AI GRC platforms auto-map security controls to compliance requirements (SOC2, ISO27001) from system documentation.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Threat Modeling for AI Vectors', whySafe: 'Designing defenses against unprecedented AI attacks.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'CISO', riskReduction: 45, skillGap: 'Board governance', transitionDifficulty: 'Very Hard', industryMapping: ['Enterprise'], salaryDelta: '+100-250%', timeToTransition: '60 months', months_to_first_income: 14, income_dip_months: 8 }],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2025, riskScore: 15, label: '+1yr' }, { year: 2026, riskScore: 17, label: '+2yr' }, { year: 2027, riskScore: 20, label: '+3yr' }, { year: 2028, riskScore: 22, label: '+4yr' }],
    confidenceScore: 99,
  },
  sw_game_dev: {
    displayRole: 'Game Developer',
    summary: 'Moderate resilience.',
    skills: {
      obsolete: [{ "skill": "Manual procedural NPC dialogue tree creation for non-critical characters", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI game dialogue tools generate contextually appropriate NPC dialogue from character and world description.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Routine level geometry blockout and asset placement", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI procedural generation tools create level blockouts and place ambient assets from design specifications.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Emergent Gameplay Design', whySafe: 'Designing complex, fun interactions.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Virtual Production Lead', riskReduction: 55, skillGap: 'Unreal Engine', transitionDifficulty: 'Medium', industryMapping: ['Film'], salaryDelta: '+30-60%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 41, label: '+1yr' }, { year: 2026, riskScore: 47, label: '+2yr' }, { year: 2027, riskScore: 52, label: '+3yr' }, { year: 2028, riskScore: 58, label: '+4yr' }],
    confidenceScore: 94,
  },
  sw_bioinformatics: {
    displayRole: 'Bioinformatics Engineer',
    summary: 'High resilience.',
    skills: {
      obsolete: [{ "skill": "Manual FASTQ quality trimming script setup for standard sequencing platforms", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI bioinformatics pipelines auto-configure quality trimming from sequencing platform metadata.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard variant annotation and filtering pipelines", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI genomic analysis platforms auto-annotate and filter variants using trained population databases.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Biological Signal Synthesis', whySafe: 'Developing novel hypotheses from multi-modal omics.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Precision Medicine Architect', riskReduction: 60, skillGap: 'Clinical informatics', transitionDifficulty: 'Hard', industryMapping: ['Biotech'], salaryDelta: '+40-80%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 18, label: '+1yr' }, { year: 2026, riskScore: 22, label: '+2yr' }, { year: 2027, riskScore: 25, label: '+3yr' }, { year: 2028, riskScore: 28, label: '+4yr' }],
    confidenceScore: 98,
  },
  sw_quantum: {
    displayRole: 'Quantum Scientist',
    summary: 'Extremely high resilience.',
    skills: {
      obsolete: [{ "skill": "Manual quantum gate decomposition for standard universal gate sets", "riskScore": 85, "riskType": "Automatable", "horizon": "2yr", "reason": "AI quantum compiler tools auto-decompose circuits into hardware-native gate sets.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard quantum circuit template optimization for known gate sets", "riskScore": 70, "riskType": "Augmented", "horizon": "3yr", "reason": "AI quantum compiler optimization tools auto-transpile circuits for specific hardware topology and noise profiles.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Error Mitigation Architecture', whySafe: 'Developing the logical bridge for NISQ hardware.', longTermValue: 99, difficulty: 'Extremely High' }],
    },
    careerPaths: [{ role: 'PQC Lead', riskReduction: 50, skillGap: 'Lattice-based crypto', transitionDifficulty: 'Hard', industryMapping: ['Gov'], salaryDelta: '+60-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2025, riskScore: 7, label: '+1yr' }, { year: 2026, riskScore: 9, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }],
    confidenceScore: 99,
  },
  sw_blockchain_arch: {
    displayRole: 'Blockchain Architect',
    summary: 'High resilience.',
    skills: {
      obsolete: [{ "skill": "Manual test coverage for standard ERC contract function paths", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI smart contract testing tools auto-generate test cases covering standard function paths and edge conditions.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard ERC-20/721 token contract scaffolding", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI code generation tools produce standard ERC token contracts with security checks from feature specifications.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Decentralized Incentive Synthesis', whySafe: 'Designing the balance of human incentives.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'DeFi Ecosystem Lead', riskReduction: 55, skillGap: 'Governance strategy', transitionDifficulty: 'Medium', industryMapping: ['Web3'], salaryDelta: '+40-100%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2025, riskScore: 25, label: '+1yr' }, { year: 2026, riskScore: 29, label: '+2yr' }, { year: 2027, riskScore: 32, label: '+3yr' }, { year: 2028, riskScore: 35, label: '+4yr' }],
    confidenceScore: 97,
  },
  sw_edge_ai_iot: {
    displayRole: 'Edge AI / IoT Systems Lead',
    summary: 'High resilience due to the convergence of hardware-constrained AI, real-time physical latency requirements, and distributed system complexity.',
    skills: {
      obsolete: [{ skill: 'Routine IoT dashboard and cloud-connector boilerplate', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI auto-generates standard MQTT-to-Cloud connectors and dashboard templates instantly.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard model quantization for known target hardware", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI compression tools auto-quantize models to target hardware constraints with minimal manual tuning.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Distributed Edge Inference Optimization', whySafe: 'Balancing model quantization, power constraints, and real-time physical response logic.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Industrial Autonomy Architect', riskReduction: 45, skillGap: 'Robotic sensing, safety-critical edge loops', transitionDifficulty: 'Hard', industryMapping: ['Manufacturing / Automotive'], salaryDelta: '+50-120%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2025, riskScore: 15, label: '+1yr' }, { year: 2026, riskScore: 19, label: '+2yr' }, { year: 2027, riskScore: 22, label: '+3yr' }, { year: 2028, riskScore: 25, label: '+4yr' }],
    confidenceScore: 99,
  },
  sw_simulation_finite: {
    displayRole: 'FEA / Computational Simulation Lead',
    summary: 'High resilience in high-stakes physical world failure prediction; disruption in routine mesh generation.',
    skills: {
      obsolete: [{ skill: 'Routine geometric mesh generation and cleanup', riskScore: 96, riskType: 'Automatable', horizon: '1styr', reason: 'AI auto-remeshes and optimizes standard geometries for simulation accuracy instantly.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard mesh generation for common structural geometries", "riskScore": 74, "riskType": "Augmented", "horizon": "2yr", "reason": "AI-assisted FEA tools auto-generate optimized meshes from CAD geometry with adaptive refinement.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Non-Linear Failure Mode Synthesis', whySafe: 'Predicting how novel materials and geometries fail in unprecedented high-stress physical environments.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Digital Twin Architect', riskReduction: 55, skillGap: 'IoT-to-Simulation loops, real-time physics engines', transitionDifficulty: 'Hard', industryMapping: ['Heavy Industry'], salaryDelta: '+30-60%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 21, label: '+1yr' }, { year: 2026, riskScore: 24, label: '+2yr' }, { year: 2027, riskScore: 27, label: '+3yr' }, { year: 2028, riskScore: 30, label: '+4yr' }],
    confidenceScore: 98,
  },
  // ══════════════════════════════════════════════════════════════════════════
  // NEW TECH ROLES — 40 unique roles (no data repeated from above)
  // ══════════════════════════════════════════════════════════════════════════

  it_platform_eng: {
    displayRole: 'Platform Engineer (IDP)',
    summary: 'High growth; building Internal Developer Platforms that make AI-augmented teams 10× more productive.',
    skills: {
      obsolete: [{ skill: 'Writing manual CI/CD pipeline YAML templates', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI tools like Copilot auto-generate pipeline YAML from natural language.', aiReplacement: 'Full', aiTool: 'GitHub Actions AI, Spacelift' }],
      at_risk: [{ skill: 'Standard Kubernetes cluster administration', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'Managed Kubernetes and AI ops tools reduce manual cluster management sharply.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Developer Experience Architecture (Golden Paths)', whySafe: 'Designing the platform abstractions that eliminate developer toil requires deep empathy for engineering workflows — an irreducibly human UX challenge.', longTermValue: 99, difficulty: 'High' },
        { skill: 'Platform Security Policy as Code', whySafe: 'Encoding security requirements into platform guardrails that developers cannot bypass — balancing security with productivity — requires human judgment.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Head of Engineering Productivity', riskReduction: 42, skillGap: 'Engineering leadership, Organizational design for developer orgs', transitionDifficulty: 'Hard', industryMapping: ['Large Tech'], salaryDelta: '+50-120%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 14, label: '+1yr' }, { year: 2026, riskScore: 13, label: '+2yr' }, { year: 2027, riskScore: 13, label: '+3yr' }, { year: 2028, riskScore: 14, label: '+4yr' }],
    confidenceScore: 98,
    contextTags: ['tech-sector', 'ai-resilient', 'developer-experience', 'platform-engineering'],
  },

  it_mlops: {
    displayRole: 'MLOps Engineer',
    summary: 'High resilience; operationalizing AI models at production scale is a distinct engineering discipline that does not automate itself.',
    skills: {
      obsolete: [{ skill: 'Manual ML experiment tracking in spreadsheets', riskScore: 99, riskType: 'Automatable', horizon: '1yr', reason: 'MLflow, Weights & Biases, and Comet auto-track all experiments.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard feature engineering pipelines', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'AutoML tools automate feature selection and transformation for standard datasets.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Production ML Reliability Engineering', whySafe: 'Diagnosing model drift, data quality failures, and inference performance degradation in production requires a unique blend of ML and SRE expertise.', longTermValue: 99, difficulty: 'High' },
        { skill: 'AI/ML Governance & Model Documentation', whySafe: 'Ensuring production models are auditable, explainable, and compliant with AI regulations requires human accountable engineering judgment.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Head of AI Infrastructure', riskReduction: 30, skillGap: 'Vector DB architecture, LLM serving, GPU cluster management', transitionDifficulty: 'Hard', industryMapping: ['Tech', 'Finance', 'Healthcare'], salaryDelta: '+60-150%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
      { role: 'AI Platform CTO', riskReduction: 25, skillGap: 'Business strategy, Product roadmap, Fundraising', transitionDifficulty: 'Very Hard', industryMapping: ['AI Startups'], salaryDelta: '+100-300%', timeToTransition: '60 months', months_to_first_income: 14, income_dip_months: 8 },
    ],
    roadmap: {
      '2-5': {
        phase_1: { timeline: '60 days', focus: 'LLMOps Foundation', actions: [
          { action: 'Deploy and monitor one LLM endpoint in production using LangSmith', why: 'LLM observability is the most in-demand MLOps skill of 2024-2026.', outcome: 'LLMOps portfolio proof', tool: 'LangSmith, Arize' },
        ]},
        phase_2: { timeline: '90 days', focus: 'Governance Layer', actions: [
          { action: 'Design a model card and drift detection pipeline for a production model', why: 'Regulators and enterprise risk teams are now requiring documented model governance.', outcome: 'Compliance-ready model governance portfolio' },
        ]},
      },
    },
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2025, riskScore: 11, label: '+1yr' }, { year: 2026, riskScore: 10, label: '+2yr' }, { year: 2027, riskScore: 11, label: '+3yr' }, { year: 2028, riskScore: 13, label: '+4yr' }],
    confidenceScore: 99,
    contextTags: ['tech-sector', 'ai-native', 'ai-resilient', 'mlops', 'production-ai'],
    evolutionHorizon: '2029',
  },

  it_llm_solutions_arch: {
    displayRole: 'LLM Solutions Architect',
    summary: 'Extremely high demand; bridging enterprise business problems and LLM capabilities requires technical depth and domain expertise simultaneously.',
    skills: {
      obsolete: [{ "skill": "Manual prompt template library management in spreadsheets", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI prompt management platforms version, test, and deploy prompt templates automatically.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Authoring basic RAG pipelines with default settings', riskScore: 65, riskType: 'Augmented', horizon: '2yr', reason: 'No-code LLM platforms abstract simple RAG setup for non-engineers.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Enterprise LLM Architecture (Latency/Cost/Quality Tradeoffs)', whySafe: 'Designing which model serves which use case — balancing token cost, latency SLA, and quality — across a large enterprise requires human systems judgment.', longTermValue: 99, difficulty: 'High' },
        { skill: 'AI Hallucination Risk Mitigation Architecture', whySafe: 'Designing the system guardrails (grounding, RLHF, retrieval, structured output enforcement) that make LLMs safe for enterprise deployment.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Multi-Agent Workflow Design', whySafe: 'Orchestrating specialized AI agents that collaborate on complex multi-step enterprise tasks requires architectural creativity AI cannot provide about itself.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'VP of AI Architecture', riskReduction: 20, skillGap: 'Technical leadership at VP level, Enterprise stakeholder management', transitionDifficulty: 'Hard', industryMapping: ['Cloud Providers', 'Enterprise SaaS', 'Consulting'], salaryDelta: '+80-200%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    inactionScenario: 'One of the fastest-growing technical roles of 2024-2027. Not entering this specialization means competing for commodity software engineering roles against AI tools.',
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 7, label: '+2yr' }, { year: 2027, riskScore: 7, label: '+3yr' }, { year: 2028, riskScore: 9, label: '+4yr' }, { year: 2029, riskScore: 12, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['tech-sector', 'ai-native', 'ai-resilient', 'frontier-skill', 'extreme-demand'],
    evolutionHorizon: '2028',
  },

  it_data_analyst: {
    displayRole: 'Data Analyst',
    summary: 'High disruption in standard reporting; resilience only in insight generation and business translation.',
    skills: {
      obsolete: [
        { skill: 'Building standard dashboards from pre-defined metrics', riskScore: 96, riskType: 'Automatable', horizon: '1yr', reason: 'AI BI tools (Tableau AI, Power BI Copilot) generate dashboards from natural language queries.', aiReplacement: 'Full', aiTool: 'Tableau AI, Power BI Copilot, Looker AI' },
        { skill: 'Ad-hoc SQL query writing for known questions', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'Text-to-SQL AI answers standard analytical questions directly from natural language.', aiReplacement: 'Full' },
      ],
      at_risk: [{ skill: 'Standard A/B test statistical analysis', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'Causal AI platforms automate experiment analysis and significance testing.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Business Question Formulation', whySafe: 'Determining "what should we measure and why" — translating fuzzy business ambiguity into precise analytical questions — requires human business intuition.', longTermValue: 97, difficulty: 'High' },
        { skill: 'Insight Narrative & Stakeholder Influence', whySafe: 'Transforming a correct analysis into an insight that changes a decision requires human communication and organizational political knowledge.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Analytics Engineer', riskReduction: 55, skillGap: 'dbt, data modelling, Semantic layer design', transitionDifficulty: 'Medium', industryMapping: ['Tech', 'Finance', 'Retail'], salaryDelta: '+30-70%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
      { role: 'Decision Science Lead', riskReduction: 62, skillGap: 'Causal inference, Bayesian modeling, Experimentation design', transitionDifficulty: 'Hard', industryMapping: ['Tech', 'Consulting'], salaryDelta: '+50-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    inactionScenario: 'Analysts who master "pulling and presenting data" will be replaced within 2 years. The survivors are those who master business question formulation and executive influence.',
    riskTrend: [{ year: 2024, riskScore: 48, label: 'Now' }, { year: 2025, riskScore: 58, label: '+1yr' }, { year: 2026, riskScore: 68, label: '+2yr' }, { year: 2027, riskScore: 76, label: '+3yr' }, { year: 2028, riskScore: 82, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['tech-sector', 'high-risk', 'action-required', 'automation-zone', 'pivot-window'],
    evolutionHorizon: '2026',
  },

  sw_dba: {
    displayRole: 'Database Administrator (DBA)',
    summary: 'High disruption in routine tuning; resilience in data architecture governance.',
    skills: {
      obsolete: [
        { skill: 'Manual index optimization and query plan analysis', riskScore: 93, riskType: 'Automatable', horizon: '1yr', reason: 'AI-powered database engines (Oracle Autonomous, Amazon Aurora AI) auto-tune indexes and query plans.', aiReplacement: 'Full' },
        { skill: 'Routine backup and recovery scheduling', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'Cloud-managed databases handle backup, replication, and PITR automatically.', aiReplacement: 'Full' },
      ],
      at_risk: [{ "skill": "Standard SQL query performance tuning via index analysis", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI database advisors auto-suggest index changes and query rewrites from execution plan analysis.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Multi-Modal Data Architecture (OLTP + OLAP + Vector + Graph)', whySafe: 'Designing data systems that serve simultaneous real-time, analytical, AI embedding, and graph traversal needs requires deep architectural synthesis.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Data Sovereignty & Cross-Border Compliance Architecture', whySafe: 'Ensuring data does not cross jurisdictional boundaries in violation of GDPR, China PIPL, or India PDPB requires human legal-technical synthesis.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Data Platform Architect', riskReduction: 55, skillGap: 'Lakehouse architecture, Delta Lake, Vector DB design', transitionDifficulty: 'Hard', industryMapping: ['Enterprise', 'Fintech', 'Healthcare'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    riskTrend: [{ year: 2024, riskScore: 38, label: 'Now' }, { year: 2025, riskScore: 48, label: '+1yr' }, { year: 2026, riskScore: 58, label: '+2yr' }, { year: 2027, riskScore: 66, label: '+3yr' }, { year: 2028, riskScore: 72, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['tech-sector', 'moderate-risk', 'data-intensive', 'automation-zone'],
    evolutionHorizon: '2026',
  },

  it_cto: {
    displayRole: 'Chief Technology Officer (CTO)',
    summary: 'Extremely high resilience; technology strategy, board trust, and organizational transformation are irreducibly human.',
    skills: {
      obsolete: [{ "skill": "Manual technology landscape scan report generation", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI competitive intelligence tools auto-generate technology trend and competitor capability reports.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Personal coding contribution', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'AI coding tools negate the need for CTO-level individual code contributions.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'AI Transformation Leadership', whySafe: 'Leading an organization through the fear, resistance, and cultural disruption of AI adoption requires irreducible human authority, empathy, and vision.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Board-Level Technology Risk Communication', whySafe: 'Translating complex technical risk into language boards can act on — and being personally accountable for the outcome — is irreducibly human.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Engineering Organization Design', whySafe: 'Structuring how hundreds of engineers collaborate, make decisions, and maintain alignment — team topology, incentive design, culture architecture.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Serial Technology Entrepreneur', riskReduction: 10, skillGap: 'Venture fundraising, Market creation, Go-to-market leadership', transitionDifficulty: 'Very Hard', industryMapping: ['Startup Ecosystem'], salaryDelta: '+Equity upside unlimited', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
      { role: 'Board Member / Technology Advisor', riskReduction: 15, skillGap: 'Portfolio company oversight, Governance expertise', transitionDifficulty: 'Hard', industryMapping: ['PE/VC Portfolio Companies', 'Public Boards'], salaryDelta: '+20-100% (fractional)', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 9, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 11, label: '+4yr' }, { year: 2029, riskScore: 12, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['tech-sector', 'ai-resilient', 'leadership-premium', 'executive', 'senior-moat'],
    evolutionHorizon: '2030',
  },

  sw_api_designer: {
    displayRole: 'API Architect / Designer',
    summary: 'Moderate resilience; design philosophy and cross-team contractual thinking survive AI; boilerplate dies rapidly.',
    skills: {
      obsolete: [{ skill: 'Writing standard OpenAPI specification boilerplate', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI generates complete OpenAPI specs from natural language API descriptions.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard REST endpoint implementation', riskScore: 82, riskType: 'Automatable', horizon: '1yr', reason: 'AI code generation handles routine CRUD REST endpoints end-to-end.', aiReplacement: 'Full' }],
      safe: [
        { skill: 'Cross-Domain API Governance Strategy', whySafe: 'Designing API contracts that survive organizational evolution — anticipating future consumers, deprecation paths, and versioning requirements — requires long-range human architectural thinking.', longTermValue: 97, difficulty: 'High' },
        { skill: 'Event-Driven Architecture Design', whySafe: 'Designing async communication patterns (event sourcing, CQRS, saga patterns) that maintain consistency across distributed systems requires deep distributed systems intuition.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Enterprise Integration Architect', riskReduction: 48, skillGap: 'Domain-driven design, AsyncAPI, Event-driven patterns', transitionDifficulty: 'Hard', industryMapping: ['Enterprise', 'Banking', 'Healthcare'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 45, label: '+1yr' }, { year: 2026, riskScore: 55, label: '+2yr' }, { year: 2027, riskScore: 62, label: '+3yr' }, { year: 2028, riskScore: 68, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['tech-sector', 'moderate-risk', 'architecture-moat', 'automation-zone'],
    evolutionHorizon: '2027',
  },

  sw_fullstack: {
    displayRole: 'Full-Stack Developer',
    summary: 'High disruption in standard feature development; resilience only in system architecture intelligence.',
    skills: {
      obsolete: [
        { skill: 'Writing standard React component boilerplate', riskScore: 97, riskType: 'Automatable', horizon: '1yr', reason: 'AI code tools generate complete component files from written specifications.', aiReplacement: 'Full', aiTool: 'Cursor, v0, Copilot' },
        { skill: 'Standard database query writing for known schemas', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'ORM with AI generation handles 90%+ of standard data access queries.', aiReplacement: 'Full' },
      ],
      at_risk: [{ skill: 'Basic Redux or state management patterns', riskScore: 80, riskType: 'Automatable', horizon: '2yr', reason: 'AI tools generate state management code from component descriptions.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'End-to-End System Tradeoff Architecture', whySafe: 'Choosing between architectural options (SSR vs CSR, serverless vs containers, REST vs GraphQL) in context of specific team skills, scale requirements, and business timelines.', longTermValue: 97, difficulty: 'High' },
        { skill: 'AI Output Quality Judgment & Code Review', whySafe: 'Evaluating whether AI-generated code is actually correct, secure, and maintainable — not just syntactically valid — requires deep engineering experience.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'AI-First Engineering Lead', riskReduction: 50, skillGap: 'AI tool selection, Prompt engineering for code generation, Code review AI output', transitionDifficulty: 'Medium', industryMapping: ['Startups', 'Scale-ups'], salaryDelta: '+30-70%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
      { role: 'Software Architect', riskReduction: 58, skillGap: 'System design, Non-functional requirements, Architecture decision records', transitionDifficulty: 'Hard', industryMapping: ['Enterprise', 'Scale-ups'], salaryDelta: '+40-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    inactionScenario: 'Full-stack developers who compete on raw feature output will be automated away. Those who evolve into system-level thinkers and AI orchestrators will see their value increase dramatically.',
    riskTrend: [{ year: 2024, riskScore: 45, label: 'Now' }, { year: 2025, riskScore: 57, label: '+1yr' }, { year: 2026, riskScore: 67, label: '+2yr' }, { year: 2027, riskScore: 74, label: '+3yr' }, { year: 2028, riskScore: 79, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['tech-sector', 'high-risk', 'action-required', 'automation-zone', 'pivot-window'],
    evolutionHorizon: '2026',
  },

  sw_vpeng: {
    displayRole: 'VP Engineering',
    summary: 'Extremely high resilience; human organizational leadership and engineering culture design are irreplaceable.',
    skills: {
      obsolete: [{ "skill": "Manual engineering hiring scorecard aggregation across interviewers", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI recruiting platforms auto-aggregate interviewer feedback and generate hire/no-hire recommendation summaries.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Hands-on technical architecture review', riskScore: 62, riskType: 'Augmented', horizon: '3yr', reason: 'AI architectural review and automated code quality tools reduce the need for VP-level technical deep dives.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Engineering Team Performance Coaching', whySafe: 'Developing engineers from individual contributors to technical leaders requires deep human developmental psychology and mentorship expertise.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Cross-Functional Delivery Leadership', whySafe: 'Setting technical strategy that aligns with business needs while managing the human complexity of cross-functional teams — irreducibly social and political.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Hiring Bar Definition & Defense', whySafe: 'Determining what "great" looks like for an engineering team — and maintaining that standard under hiring pressure — requires hard-won human judgment.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'CTO', riskReduction: 20, skillGap: 'P&L responsibility, Board-level communication, Technology strategy vs. execution shift', transitionDifficulty: 'Very Hard', industryMapping: ['Scale-ups', 'Enterprise'], salaryDelta: '+50-200%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 10, label: 'Now' }, { year: 2026, riskScore: 11, label: '+2yr' }, { year: 2027, riskScore: 12, label: '+3yr' }, { year: 2028, riskScore: 14, label: '+4yr' }, { year: 2029, riskScore: 15, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['tech-sector', 'ai-resilient', 'leadership-premium', 'senior-moat', 'executive'],
  },

  sw_ux_researcher: {
    displayRole: 'UX Researcher',
    summary: 'High resilience; understanding human behavior, intent, and unspoken needs is a definitively human research function.',
    skills: {
      obsolete: [{ skill: 'Manual survey result tabulation', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI survey platforms automatically analyze and visualize survey data.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard usability test facilitation scripts', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI-moderated usability platforms run basic walkthroughs automatically.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Ethnographic Field Research', whySafe: 'Observing users in their real environment — catching the unspoken frustrations, workarounds, and cultural contexts that users never put in survey responses.', longTermValue: 99, difficulty: 'High' },
        { skill: 'Research Synthesis & Strategic Insight Extraction', whySafe: 'Identifying the non-obvious pattern across diverse qualitative data that changes a product strategy — requires human abductive reasoning.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Head of Research / Design Strategy', riskReduction: 38, skillGap: 'Strategy communication, Quantitative research methods, Organizational influence', transitionDifficulty: 'Hard', industryMapping: ['Product Companies'], salaryDelta: '+40-90%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
      { role: 'AI Product Research Lead', riskReduction: 45, skillGap: 'AI mental models research, Prompt-driven user testing, Bias in AI evaluation', transitionDifficulty: 'Medium', industryMapping: ['AI Companies', 'Tech Platforms'], salaryDelta: '+30-70%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
    ],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2026, riskScore: 20, label: '+2yr' }, { year: 2027, riskScore: 22, label: '+3yr' }, { year: 2028, riskScore: 25, label: '+4yr' }, { year: 2029, riskScore: 27, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['tech-sector', 'ai-resilient', 'human-centric', 'design-thinking'],
  },

  sw_devsecops: {
    displayRole: 'DevSecOps Engineer',
    summary: 'High resilience; security remains an adversarial zero-sum game where human creativity is irreplaceable on both offense and defense.',
    skills: {
      obsolete: [{ skill: 'Manual SAST scan result review for known vulnerability patterns', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI security tools automatically triage and prioritize known vulnerability patterns from SAST results.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard secrets management configuration', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI-powered secrets scanning tools detect and rotate secrets automatically.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Adversarial Threat Modeling for AI Systems', whySafe: 'Modeling how attackers would exploit AI components (prompt injection, model extraction, data poisoning) requires creative adversarial human thinking.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Supply Chain Security Architecture', whySafe: 'Designing the end-to-end security posture for software supply chains (SBOMs, dependency verification, build provenance) is a deeply complex human systems engineering challenge.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Application Security Lead', riskReduction: 38, skillGap: 'Penetration testing, Bug bounty experience, Application threat modelling', transitionDifficulty: 'Hard', industryMapping: ['Tech', 'Finance', 'Defense'], salaryDelta: '+40-100%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2026, riskScore: 14, label: '+2yr' }, { year: 2027, riskScore: 13, label: '+3yr' }, { year: 2028, riskScore: 13, label: '+4yr' }, { year: 2029, riskScore: 14, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['tech-sector', 'ai-resilient', 'security', 'adversarial-moat'],
  },

  sw_ciso: {
    displayRole: 'Chief Information Security Officer (CISO)',
    summary: 'Extremely high resilience; cybersecurity leadership requires human accountability, board trust, and adversarial creative strategy.',
    skills: {
      obsolete: [{ "skill": "Manual vulnerability scan report compilation and executive summary writing", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI security platforms auto-generate vulnerability prioritisation reports and executive summaries from scan data.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard risk assessment questionnaire scoring", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI GRC platforms auto-score vendor risk assessments and generate standardized risk reports.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'AI-Specific Threat Landscape Communication', whySafe: 'Communicating the board-level implications of AI-specific threats (deepfake phishing, LLM prompt injection at enterprise scale, AI-powered ransomware) requires both technical depth and executive translation.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Incident Response Command (Cyber Crisis)', whySafe: 'Leading an organization through a live ransomware attack or nation-state breach — with legal, regulatory, reputational, and operational stakes simultaneously — is irreducibly human.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Security Culture Architecture', whySafe: 'Building a security-conscious organization where developers, finance, and ops all make secure-by-default decisions — requires human organizational psychology expertise.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Technology Board Director', riskReduction: 10, skillGap: 'Board governance, Fiduciary responsibility, PE/M&A technical due diligence', transitionDifficulty: 'Very Hard', industryMapping: ['Public Companies', 'PE Portfolio'], salaryDelta: '+50-200% (retainer)', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 5, label: '+2yr' }, { year: 2027, riskScore: 6, label: '+3yr' }, { year: 2028, riskScore: 7, label: '+4yr' }, { year: 2029, riskScore: 7, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['tech-sector', 'ai-resilient', 'leadership-premium', 'executive', 'irreplaceable'],
  },

  sw_tech_writer: {
    displayRole: 'Technical Writer (API/SDK Docs)',
    summary: 'Very high disruption in standard docs generation; resilience only in complex developer experience design.',
    skills: {
      obsolete: [
        { skill: 'Writing standard API reference documentation from OpenAPI spec', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI tools generate complete API reference docs from OpenAPI specs instantly.', aiReplacement: 'Full', aiTool: 'Mintlify AI, ReadMe AI, Swimm' },
        { skill: 'Standard conceptual overview article writing', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'LLMs write technical concept articles indistinguishable from average tech writers.', aiReplacement: 'Full' },
      ],
      at_risk: [{ "skill": "Standard API reference documentation from code comments", "riskScore": 85, "riskType": "Automatable", "horizon": "1yr", "reason": "AI documentation tools auto-generate complete API reference docs from OpenAPI specs and code annotations.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Developer Journey Architecture (Information Architecture)', whySafe: 'Designing the end-to-end developer learning curve for a complex platform — what to teach first, how to scaffold understanding, what mental models to build — requires pedagogical human expertise.', longTermValue: 95, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Developer Experience (DX) Lead', riskReduction: 55, skillGap: 'Coding proficiency, Developer advocacy, Feedback loop design', transitionDifficulty: 'Medium', industryMapping: ['API-first Companies', 'Developer Tools'], salaryDelta: '+30-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    inactionScenario: 'Standard tech writers focusing on generating documentation will be fully automated within 2 years. Pivot to developer experience strategy and product education design.',
    riskTrend: [{ year: 2024, riskScore: 55, label: 'Now' }, { year: 2025, riskScore: 68, label: '+1yr' }, { year: 2026, riskScore: 78, label: '+2yr' }, { year: 2027, riskScore: 85, label: '+3yr' }, { year: 2028, riskScore: 90, label: '+4yr' }],
    confidenceScore: 96,
    contextTags: ['tech-sector', 'high-risk', 'action-required', 'rapid-automation'],
  },

  sw_ai_safety_eng: {
    displayRole: 'AI Safety Engineer (Production)',
    summary: 'Extremely high demand and resilience; ensuring deployed AI systems do not cause harm at production scale.',
    skills: {
      obsolete: [{ "skill": "Manual jailbreak prompt cataloguing from public research papers", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI safety research tools auto-catalogue and classify jailbreak attempts from published research.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard red-teaming prompt injection probing for known attack classes", "riskScore": 68, "riskType": "Augmented", "horizon": "3yr", "reason": "AI safety testing tools auto-generate adversarial prompts from known attack taxonomies.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'LLM Output Policy Enforcement Architecture', whySafe: 'Designing the guardrail systems (content classifiers, output validators, constitutional AI methods) that make AI safe in high-stakes domains.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'AI System Failure Mode Documentation', whySafe: 'Systematically cataloguing and communicating how AI systems can fail — to regulators, safety boards, and engineering teams — is a boundary-setting human function.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Head of AI Trust & Safety', riskReduction: 10, skillGap: 'Policy writing, Regulatory engagement, Trust & Safety operations management', transitionDifficulty: 'Hard', industryMapping: ['AI Platforms', 'Social Media', 'Finance'], salaryDelta: '+60-150%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 4, label: '+2yr' }, { year: 2027, riskScore: 4, label: '+3yr' }, { year: 2028, riskScore: 5, label: '+4yr' }, { year: 2029, riskScore: 6, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['tech-sector', 'ai-native', 'ai-resilient', 'frontier-skill', 'safety-critical'],
    evolutionHorizon: '2030',
  },

  sw_vector_db_eng: {
    displayRole: 'Vector Database / Semantic Search Engineer',
    summary: 'High growth and strong resilience; designing the semantic memory layer of AI systems is a frontier engineering discipline.',
    skills: {
      obsolete: [{ "skill": "Standard embedding generation using off-the-shelf models for common text types", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI embedding APIs generate high-quality vectors with zero configuration for common text formats.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard vector database CRUD operations', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'Managed vector DB platforms abstract standard embedding insert/search operations.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Retrieval Quality Optimization Strategy', whySafe: 'Designing the chunking, embedding model selection, hybrid search, and re-ranking strategies that determine whether an AI retrieval system actually answers questions correctly.', longTermValue: 99, difficulty: 'High' },
        { skill: 'Semantic Data Architecture Design', whySafe: 'Structuring data and metadata so that AI systems can retrieve and reason over it effectively — a new human architectural discipline with no prior playbook.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'AI Infrastructure Architect', riskReduction: 25, skillGap: 'Multi-modal retrieval, Distributed vector search at scale, Embedding pipeline design', transitionDifficulty: 'Hard', industryMapping: ['AI-native Startups', 'Enterprise AI'], salaryDelta: '+60-150%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 7, label: '+2yr' }, { year: 2027, riskScore: 8, label: '+3yr' }, { year: 2028, riskScore: 10, label: '+4yr' }, { year: 2029, riskScore: 12, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['tech-sector', 'ai-native', 'ai-resilient', 'emerging-role', 'frontier-skill'],
    evolutionHorizon: '2028',
  },

  sw_finops: {
    displayRole: 'FinOps / Cloud Cost Engineer',
    summary: 'High growth; as cloud and AI API spending balloons, enterprises urgently need humans who can optimize the unit economics.',
    skills: {
      obsolete: [{ skill: 'Manual cloud cost tagging and allocation spreadsheets', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI-powered FinOps platforms auto-discover, tag, and allocate cloud spend.', aiReplacement: 'Full', aiTool: 'Apptio Cloudability AI, CloudHealth, AWS Cost Explorer AI' }],
      at_risk: [{ "skill": "Standard cloud cost anomaly detection from billing data", "riskScore": 80, "riskType": "Automatable", "horizon": "1yr", "reason": "AI cost management platforms (CloudHealth, Spot.io) auto-detect anomalies and rightsizing opportunities from billing APIs.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Unit Economic Architecture for AI Workloads', whySafe: 'Designing the cost structure for LLM API usage, GPU clusters, and training runs at optimal cost-quality-latency tradeoffs — this is a frontier financial-technical discipline.', longTermValue: 99, difficulty: 'High' },
        { skill: 'Organisational FinOps Culture Design', whySafe: 'Creating the accountability structures and engineering norms that make teams cost-aware — changing human engineer behavior — requires human change management expertise.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'VP of Cloud Economics', riskReduction: 35, skillGap: 'Board-level financial communication, P&L ownership, Procurement strategy', transitionDifficulty: 'Hard', industryMapping: ['Enterprise', 'Tech Platforms'], salaryDelta: '+50-120%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2026, riskScore: 16, label: '+2yr' }, { year: 2027, riskScore: 15, label: '+3yr' }, { year: 2028, riskScore: 15, label: '+4yr' }, { year: 2029, riskScore: 16, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['tech-sector', 'ai-resilient', 'finops', 'emerging-role', 'high-demand'],
    evolutionHorizon: '2028',
  },

  sw_graph_eng: {
    displayRole: 'Knowledge Graph Engineer',
    summary: 'High resilience; structuring real-world entity relationships for enterprise AI knowledge systems is a frontier data engineering discipline.',
    skills: {
      obsolete: [{ "skill": "Manual Cypher/SPARQL query writing for standard graph traversal patterns", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI-assisted graph query tools generate traversal queries from natural language descriptions.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard graph schema design for known entity relationships", "riskScore": 70, "riskType": "Augmented", "horizon": "2yr", "reason": "AI graph modeling tools suggest schema structures from natural language entity descriptions.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Enterprise Ontology Design', whySafe: 'Defining the entity types, relationships, and inference rules that encode how an organization\'s world works — for AI systems to reason over — requires deep domain-knowledge capture expertise.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Hybrid Graph + Vector Retrieval Architecture', whySafe: 'Combining structured graph traversal with semantic vector search — to give AI systems both relational and conceptual reasoning — is a frontier architecture discipline.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Enterprise AI Knowledge Architect', riskReduction: 20, skillGap: 'LLM grounding strategy, OWL/SHACL, Enterprise data modelling', transitionDifficulty: 'Hard', industryMapping: ['Enterprise', 'Pharma', 'Finance'], salaryDelta: '+60-140%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2026, riskScore: 10, label: '+2yr' }, { year: 2027, riskScore: 9, label: '+3yr' }, { year: 2028, riskScore: 9, label: '+4yr' }, { year: 2029, riskScore: 10, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['tech-sector', 'ai-resilient', 'ai-native', 'frontier-skill', 'data-intensive'],
  },

  sw_mobile_crossplatform: {
    displayRole: 'Cross-Platform Mobile Developer (Flutter/RN)',
    summary: 'Moderate resilience; disruption in UI code, resilience in native platform integration and performance architecture.',
    skills: {
      obsolete: [{ skill: 'Standard mobile UI component writing from Figma designs', riskScore: 94, riskType: 'Automatable', horizon: '1yr', reason: 'AI tools (Builder.io AI, Locofy) generate cross-platform mobile UI code from Figma designs.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard state management implementation (Riverpod/Redux)', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI code generation handles standard state management boilerplate reliably.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Native Platform Bridge Architecture (iOS/Android Specific)', whySafe: 'Writing native platform channels for complex iOS/Android features (AR, BluetoothLE, NFC, deep system APIs) requires deep platform knowledge AI tools lack.', longTermValue: 96, difficulty: 'High' },
        { skill: 'Mobile App Performance Profiling & Optimization', whySafe: 'Identifying and fixing frame drops, jank, memory leaks, and battery drain on diverse real devices requires hands-on diagnostic expertise.', longTermValue: 95, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Mobile Platform Architect', riskReduction: 52, skillGap: 'Native module development, App performance architecture, ML on-device integration', transitionDifficulty: 'Hard', industryMapping: ['Consumer Apps', 'FinTech', 'HealthTech'], salaryDelta: '+40-90%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 40, label: 'Now' }, { year: 2025, riskScore: 50, label: '+1yr' }, { year: 2026, riskScore: 60, label: '+2yr' }, { year: 2027, riskScore: 68, label: '+3yr' }, { year: 2028, riskScore: 74, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['tech-sector', 'moderate-risk', 'automation-zone', 'mobile'],
  },

  sw_ai_infra: {
    displayRole: 'AI Infrastructure Engineer (GPU/TPU)',
    summary: 'Extremely high demand; designing and operating the compute infrastructure for AI training and inference at scale.',
    skills: {
      obsolete: [{ "skill": "Manual GPU cluster utilisation monitoring from dashboard observation", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI infrastructure monitoring tools auto-detect underutilisation and suggest rightsizing recommendations.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard model serving config for known frameworks (TorchServe, TF Serving)", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI platform tools auto-generate serving configurations from model metadata and traffic requirements.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Distributed GPU Training Cluster Architecture', whySafe: 'Designing efficient multi-node, multi-GPU training infrastructure — managing NCCL communication, fault tolerance, and checkpoint strategy — requires frontier systems engineering.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Model Serving Latency-Cost Optimization', whySafe: 'Designing the inference stack (batching strategy, model compilation, hardware-software co-optimization) that balances response time, throughput, and AWS/GCP bill.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Head of AI Compute at Major Lab', riskReduction: 5, skillGap: 'CUDA programming, Distributed ML systems, Leadership at org scale', transitionDifficulty: 'Very Hard', industryMapping: ['AI Labs', 'Hyperscalers'], salaryDelta: '+100-400%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 5, label: '+2yr' }, { year: 2027, riskScore: 5, label: '+3yr' }, { year: 2028, riskScore: 6, label: '+4yr' }, { year: 2028, riskScore: 8, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['tech-sector', 'ai-native', 'ai-resilient', 'critical-undersupply', 'frontier-skill'],
    evolutionHorizon: '2030',
  },
};
