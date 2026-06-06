// ═══════════════════════════════════════════════════════════════════════════════
// emerging.ts — AI-Era & Future-of-Work Roles Intelligence
// 55 brand-new roles that didn't exist (or were tiny niches) pre-2022.
// These are the roles CREATED by the AI disruption, not destroyed by it.
// ═══════════════════════════════════════════════════════════════════════════════
import { CareerIntelligence } from './types.ts';

export const EMERGING_INTELLIGENCE: Record<string, CareerIntelligence> = {
  em_ai_safety: {
    displayRole: 'AI Safety Researcher',
    summary: 'Critically underserved; designing the alignment, interpretability, and containment of advanced AI systems is the most consequential research frontier of this decade.',
    skills: {
      obsolete: [{ "skill": "Manual red-team prompt collection and manual jailbreak catalogue maintenance", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI safety tooling platforms auto-catalogue and classify known jailbreak attempts from research paper feeds.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard NIST AI RMF framework mapping for defined system categories", "riskScore": 70, "riskType": "Augmented", "horizon": "2yr", "reason": "AI governance tools auto-map system characteristics to NIST AI RMF framework categories.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'AI Alignment Protocol Design', whySafe: 'Ensuring AI systems pursue human-intended goals — not just specified goals — requires deep philosophical and mathematical human synthesis that no AI can perform on itself.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Red-Teaming Novel AI Vulnerabilities', whySafe: 'Finding adversarial failure modes in AI systems requires creative adversarial thinking that exceeds current AI self-evaluation.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Interpretability Research (Mechanistic)', whySafe: 'Reverse-engineering how neural networks make decisions is a frontier research problem that requires novel mathematical and empirical human creativity.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Head of AI Safety at Major Lab', riskReduction: 5, skillGap: 'PhD-level ML, RLHF, Constitutional AI', transitionDifficulty: 'Very Hard', industryMapping: ['OpenAI', 'Anthropic', 'DeepMind', 'Government'], salaryDelta: '+200-500%', timeToTransition: '48 months' },
      { role: 'Government AI Policy Director', riskReduction: 10, skillGap: 'Policy writing, Political communication', transitionDifficulty: 'Hard', industryMapping: ['Government', 'International Bodies'], salaryDelta: '+50-150%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'This is one of the most critically undersupplied roles of the decade. Not entering this field is the opportunity cost risk, not displacement risk.',
    riskTrend: [{ year: 2024, riskScore: 3, label: 'Now' }, { year: 2026, riskScore: 2, label: '+2yr' }, { year: 2027, riskScore: 2, label: '+3yr' }, { year: 2028, riskScore: 2, label: '+4yr' }, { year: 2029, riskScore: 2, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'ai-native', 'frontier-skill', 'ai-resilient', 'critical-undersupply'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },
  em_llm_engineer: {
    displayRole: 'LLM Systems & Inference Engineer',
    summary: 'Extremely high demand; building and optimizing the infrastructure that runs AI at production scale.',
    skills: {
      obsolete: [{ "skill": "Manual token budget calculation across standard context window configurations", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI development tools auto-calculate token budgets and suggest chunking strategies from content specifications.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard API wrapper development', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'No-code AI integration tools reduce the need for custom API wrappers.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Inference Optimization (Quantization, Batching)', whySafe: 'Optimizing LLMs to run efficiently at scale — reducing cost and latency — requires deep systems engineering intuition.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Multi-Model Orchestration Architecture', whySafe: 'Designing agentic systems that route tasks across multiple specialized models requires architectural judgment AI lacks about itself.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'AI Evaluation & Benchmarking', whySafe: 'Designing meaningful benchmarks to measure AI performance on domain-specific tasks requires human judgment about "what actually matters".', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'AI Platform Lead', riskReduction: 15, skillGap: 'Distributed systems, CUDA optimization', transitionDifficulty: 'Very Hard', industryMapping: ['AI Labs', 'Enterprise AI'], salaryDelta: '+80-200%', timeToTransition: '24 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 10, label: '+2yr' }, { year: 2027, riskScore: 14, label: '+3yr' }, { year: 2028, riskScore: 18, label: '+4yr' }, { year: 2029, riskScore: 22, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'ai-native', 'tech-sector', 'extreme-demand', 'frontier-skill'],
    evolutionHorizon: '2028',
    roleCategory: 'ai_native',
  },
  em_prompt_engineer: {
    displayRole: 'Enterprise Prompt Engineer',
    summary: 'High near-term demand; medium-term evolution toward AI System Architect as prompting expands to agentic system design.',
    skills: {
      obsolete: [{ "skill": "Manual few-shot example selection by reading through large example sets", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI semantic search tools auto-retrieve the most effective few-shot examples from vector databases.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Basic zero-shot prompting', riskScore: 85, riskType: 'Augmented', horizon: '2yr', reason: 'Improved base models require less human prompting skill for common tasks.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Agentic Workflow Architecture', whySafe: 'Designing multi-step AI agent pipelines for complex business processes — the evolution of prompting into systems design.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Domain-Specific LLM Fine-Tuning Strategy', whySafe: 'Determining when to prompt vs. RAG vs. fine-tune requires deep understanding of both AI capability and business cost-benefit.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'AI Product Manager', riskReduction: 30, skillGap: 'Product strategy, User research, A/B testing', transitionDifficulty: 'Medium', industryMapping: ['Tech Companies', 'Startups'], salaryDelta: '+30-80%', timeToTransition: '12 months' },
      { role: 'AI Solutions Architect', riskReduction: 25, skillGap: 'System design, RAG pipelines, Enterprise integration', transitionDifficulty: 'Hard', industryMapping: ['Consulting', 'Enterprise Tech'], salaryDelta: '+40-100%', timeToTransition: '18 months' },
    ],
    inactionScenario: 'Pure "prompt writers" will be disrupted by better base models. Evolve toward agentic systems design and AI orchestration before this window closes (est. 2026).',
    riskTrend: [{ year: 2024, riskScore: 25, label: 'Now' }, { year: 2025, riskScore: 30, label: '+1yr' }, { year: 2026, riskScore: 38, label: '+2yr' }, { year: 2027, riskScore: 45, label: '+3yr' }, { year: 2028, riskScore: 50, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['emerging-role', 'ai-native', 'tech-sector', 'pivot-window', 'moderate-risk'],
    evolutionHorizon: '2026',
    roleCategory: 'ai_native',
  },
  em_ai_product_mgr: {
    displayRole: 'AI Product Manager',
    summary: 'Extremely high demand; bridging AI capability with human product strategy and user needs.',
    skills: {
      obsolete: [{ "skill": "Manual AI feature A/B test result extraction from analytics dashboards", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI product analytics platforms auto-extract, summarise, and surface A/B test results with statistical significance flags.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard product analytics dashboard setup for known KPI frameworks", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI analytics tools auto-configure dashboards and generate insight narratives from product data.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'AI Capability-to-User Value Mapping', whySafe: 'Determining which AI capabilities solve real human problems — and which are AI-for-AI\'s sake — requires irreducible human empathy and market judgment.', longTermValue: 99, difficulty: 'High' },
        { skill: 'AI Product Ethics & Responsible Deployment', whySafe: 'Deciding when NOT to deploy an AI feature due to trust, fairness, or safety concerns is a definitively human accountability judgment.', longTermValue: 99, difficulty: 'High' },
        { skill: 'Probabilistic Output UX Design', whySafe: 'Designing user interfaces for AI systems that sometimes fail — managing trust, transparency, and error recovery — is a novel human design challenge.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'VP of AI Products', riskReduction: 20, skillGap: 'ML infrastructure understanding, Business strategy', transitionDifficulty: 'Hard', industryMapping: ['Tech Companies'], salaryDelta: '+80-200%', timeToTransition: '36 months' },
      { role: 'AI Startup Founder/CPO', riskReduction: 10, skillGap: 'Fundraising, Technical co-founder skills', transitionDifficulty: 'Very Hard', industryMapping: ['Startup'], salaryDelta: '+Equity upside', timeToTransition: '12 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 8, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 14, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'ai-native', 'tech-sector', 'ai-resilient', 'frontier-skill'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },
  em_ai_ethics: {
    displayRole: 'AI Ethics Officer',
    summary: 'High resilience and growing demand; auditing algorithmic bias and ensuring responsible AI deployment requires institutional human accountability.',
    skills: {
      obsolete: [{ "skill": "Manual fairness audit checklist completion from model card documentation", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI governance tools auto-complete fairness audit checklists from model card data.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard algorithmic impact assessment documentation for known use-case types", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI governance platforms generate draft algorithmic impact assessments from use-case descriptions.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Algorithmic Bias Auditing', whySafe: 'Identifying and adjudicating discriminatory outcomes in AI systems requires human cultural competency, legal knowledge, and moral reasoning AI systems lack.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Responsible AI Policy Governance', whySafe: 'Writing and enforcing AI usage policies that balance innovation and safety requires human ethical reasoning and organizational authority.', longTermValue: 99, difficulty: 'High' },
        { skill: 'AI Impact Assessment (Sociotechnical)', whySafe: 'Evaluating how AI deployments affect communities — including historically marginalized groups — requires lived human empathy and sociological expertise.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Chief AI Ethics Officer (CAEO)', riskReduction: 15, skillGap: 'Executive board communication, Policy writing, Technical AI understanding', transitionDifficulty: 'Hard', industryMapping: ['Big Tech', 'Finance', 'Healthcare', 'Government'], salaryDelta: '+80-200%', timeToTransition: '24 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 6, label: '+2yr' }, { year: 2027, riskScore: 5, label: '+3yr' }, { year: 2028, riskScore: 5, label: '+4yr' }, { year: 2029, riskScore: 5, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'ai-native', 'frontier-skill', 'ai-resilient', 'regulatory-driven', 'social-impact'],
    evolutionHorizon: '2030',
    roleCategory: 'human_ai_orchestration',
  },
  em_digital_twin_arch: {
    displayRole: 'Digital Twin Architect',
    summary: 'High resilience; designing real-time simulation models of physical world systems for Industry 4.0.',
    skills: {
      obsolete: [{ "skill": "Manual IoT protocol documentation review for system integration planning", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI integration platforms auto-discover and document IoT protocol capabilities from device specifications.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard sensor data normalization for common industrial protocol formats", "riskScore": 74, "riskType": "Augmented", "horizon": "2yr", "reason": "AI IoT platforms auto-normalize sensor data from standard industrial protocols without manual mapping.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Physical-to-Digital Fidelity Design', whySafe: 'Determining how to model complex physical systems (factories, cities, bodies) in software — deciding what to simplify and what to preserve — is an irreducibly human engineering judgment.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Multi-Physics Simulation Strategy', whySafe: 'Integrating thermal, structural, fluidic, and electromagnetic simulation domains into unified operational models.', longTermValue: 98, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Smart City Technology Director', riskReduction: 35, skillGap: 'Urban planning, IoT platforms, GIS', transitionDifficulty: 'Hard', industryMapping: ['Government', 'Smart Infrastructure'], salaryDelta: '+50-120%', timeToTransition: '24 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 10, label: 'Now' }, { year: 2026, riskScore: 8, label: '+2yr' }, { year: 2027, riskScore: 7, label: '+3yr' }, { year: 2028, riskScore: 7, label: '+4yr' }, { year: 2029, riskScore: 7, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['emerging-role', 'industrial-sector', 'ai-resilient', 'frontier-skill', 'industry-4-0'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },
  em_climate_tech: {
    displayRole: 'Climate Tech Solutions Analyst',
    summary: 'High growth and strong resilience; modeling carbon markets, climate adaptation strategies, and clean energy systems.',
    skills: {
      obsolete: [{ "skill": "Manual IPCC scenario data extraction from assessment report annexes", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI climate data tools auto-extract and structure scenario parameters from IPCC report databases.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard Levelized Cost of Energy (LCOE) sensitivity analysis across known project types", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI energy finance tools auto-run LCOE sensitivities from project parameter inputs.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Carbon Credit Modeling & Verification', whySafe: 'Ensuring carbon offset integrity across complex physical and economic ecosystems requires human scientific and economic synthesis.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Climate Risk Financial Modeling', whySafe: 'Translating physical climate scenarios into financial risk — for institutional investors — requires multi-domain human synthesis.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Climate Policy & Regulatory Navigation', whySafe: 'Navigating rapidly evolving global climate regulation requires human legal-political-scientific synthesis.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Sustainability Officer', riskReduction: 30, skillGap: 'Executive communication, ESG reporting frameworks', transitionDifficulty: 'Hard', industryMapping: ['Finance', 'Energy', 'Consulting'], salaryDelta: '+60-150%', timeToTransition: '36 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 10, label: 'Now' }, { year: 2026, riskScore: 8, label: '+2yr' }, { year: 2027, riskScore: 7, label: '+3yr' }, { year: 2028, riskScore: 6, label: '+4yr' }, { year: 2029, riskScore: 5, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['emerging-role', 'ai-resilient', 'frontier-skill', 'climate-tech', 'regulatory-driven'],
    evolutionHorizon: '2030',
    roleCategory: 'traditional',
  },
  em_spatial_computing: {
    displayRole: 'Spatial Computing Experience Designer (AR/VR)',
    summary: 'High growth; designing immersive human experiences for Apple Vision Pro, Quest, and emerging spatial platforms.',
    skills: {
      obsolete: [{ skill: 'Flat 2D UI design for spatial interfaces', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'Flat UI design tools generate spatial adaptations of 2D designs automatically.', aiReplacement: 'Partial' }],
      at_risk: [{ "skill": "Standard plane detection and anchor placement configuration for known XR environments", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI spatial computing frameworks auto-configure plane detection for standard physical environment types.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Embodied Interaction Design', whySafe: 'Designing for physical bodily presence, depth perception, and spatial memory — cognition dimensions that have no parallel in 2D design or AI-generated 3D.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Presence Engineering', whySafe: 'Creating the psychological sense of "being there" in virtual space — understanding the human perceptual system well enough to create convincing presence — is frontier human design science.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'XR Technology Director', riskReduction: 25, skillGap: 'Vision Pro development, visionOS SDK, WebXR', transitionDifficulty: 'Hard', industryMapping: ['Tech', 'Entertainment', 'Healthcare'], salaryDelta: '+60-150%', timeToTransition: '18 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2026, riskScore: 15, label: '+2yr' }, { year: 2027, riskScore: 12, label: '+3yr' }, { year: 2028, riskScore: 10, label: '+4yr' }, { year: 2029, riskScore: 9, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['emerging-role', 'creative-sector', 'ai-resilient', 'frontier-skill', 'spatial-computing'],
    evolutionHorizon: '2028',
    roleCategory: 'ai_native',
  },
  em_robotics_sw: {
    displayRole: 'Humanoid Robotics Software Engineer',
    summary: 'Extremely high demand and resilience; programming the next generation of physical AI systems.',
    skills: {
      obsolete: [{ "skill": "Manual ROS package dependency graph documentation for standard builds", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI ROS tools auto-generate dependency graphs and package documentation from build files.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard robot simulation environment setup for known robot models in Gazebo/Isaac", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI sim tools auto-configure simulation environments from robot model URDF files.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Dexterous Manipulation Control Systems', whySafe: 'Teaching robots to interact with unstructured physical world environments — the "last 10%" of robotics that remains unsolved and requires human creativity.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Human-Robot Interaction Safety Architecture', whySafe: 'Designing the safety-critical systems that prevent robots from harming humans requires human ethical judgment and physical world understanding.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Robotics Platform Lead (Figure, 1X, Boston Dynamics)', riskReduction: 10, skillGap: 'ROS2, SLAM, Deep RL for locomotion', transitionDifficulty: 'Very Hard', industryMapping: ['Robotics', 'Manufacturing', 'Healthcare'], salaryDelta: '+100-300%', timeToTransition: '36 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 5, label: '+2yr' }, { year: 2027, riskScore: 5, label: '+3yr' }, { year: 2028, riskScore: 6, label: '+4yr' }, { year: 2029, riskScore: 8, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'ai-native', 'tech-sector', 'frontier-skill', 'critical-undersupply'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },
  em_synthetic_bio: {
    displayRole: 'Synthetic Biology Engineer',
    summary: 'Extreme resilience and growth; engineering biological systems — programming life — at the intersection of AI and biology.',
    skills: {
      obsolete: [{ "skill": "Manual BioBrick registry search for standard genetic parts", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI genetic parts databases auto-search and rank parts by function from natural language descriptions.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard codon optimization for common expression systems", "riskScore": 74, "riskType": "Augmented", "horizon": "2yr", "reason": "AI codon optimization tools auto-optimize sequences for expression in standard host organisms.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Genetic Circuit Design (CRISPR-Enabling)', whySafe: 'Designing biological genetic circuits for therapeutic, agricultural, or industrial purposes requires interdisciplinary creativity at the frontier of human knowledge.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'AI-Accelerated Drug Discovery Strategy', whySafe: 'Designing experiments to validate AI-predicted molecular targets requires biological intuition about why wet lab results succeed or fail.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Science Officer (Biotech)', riskReduction: 10, skillGap: 'Protein engineering, Gene therapy regulatory pathway, IND experience', transitionDifficulty: 'Very Hard', industryMapping: ['Biotech', 'Pharma', 'AgriTech'], salaryDelta: '+100-400%', timeToTransition: '60 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 4, label: 'Now' }, { year: 2026, riskScore: 3, label: '+2yr' }, { year: 2027, riskScore: 3, label: '+3yr' }, { year: 2028, riskScore: 3, label: '+4yr' }, { year: 2029, riskScore: 3, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'biotech', 'ai-resilient', 'frontier-skill', 'critical-undersupply'],
    evolutionHorizon: '2030',
    roleCategory: 'traditional',
  },
  em_longevity_sci: {
    displayRole: 'Longevity Scientist / Anti-Aging Researcher',
    summary: 'Extreme growth frontier; the convergence of AI drug discovery and longevity biology creates unprecedented demand.',
    skills: {
      obsolete: [{ "skill": "Manual aging biomarker literature review and data extraction", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI biomedical research tools auto-extract aging biomarker data from published literature.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard biological age clock calculation from methylation data", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI epigenetic platforms auto-calculate biological age clocks from methylation sequencing data.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Aging Pathway Hypothesis Generation', whySafe: 'Developing original hypotheses about the causal mechanisms of aging — connecting senescence, epigenetics, inflammation, and metabolism — requires frontier scientific creativity.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Longevity Trial Design', whySafe: 'Designing clinical trials for aging endpoints — where outcomes take decades to observe — requires deep biostatistical and regulatory human expertise.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'CSO / Founder at Longevity Biotech', riskReduction: 5, skillGap: 'Geroscience, CRO management, FDA IND pathway', transitionDifficulty: 'Very Hard', industryMapping: ['Biotech', 'Pharma', 'VC'], salaryDelta: '+100-500%+', timeToTransition: '60 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 3, label: 'Now' }, { year: 2026, riskScore: 2, label: '+2yr' }, { year: 2027, riskScore: 2, label: '+3yr' }, { year: 2028, riskScore: 2, label: '+4yr' }, { year: 2029, riskScore: 2, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'biotech', 'ai-resilient', 'frontier-skill', 'critical-undersupply'],
    evolutionHorizon: '2030',
    roleCategory: 'traditional',
  },
  em_web3_protocol: {
    displayRole: 'Web3 Protocol Architect',
    summary: 'High resilience in core protocol design; high disruption in routine smart contract development.',
    skills: {
      obsolete: [{ skill: 'Standard ERC-20/ERC-721 smart contract deployment', riskScore: 88, riskType: 'Automatable', horizon: '2yr', reason: 'AI code generation tools can produce standard NFT/token contracts with minimal human input.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard smart contract audit scope preparation from code repository analysis", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI code analysis tools auto-scope audit focus areas from smart contract repository complexity metrics.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Decentralized Incentive Mechanism Design (Tokenomics)', whySafe: 'Designing the balance of economic incentives that sustain a decentralized protocol — preventing game-theoretic attacks and sustaining participation — is a frontier human economic design.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Zero-Knowledge Proof System Architecture', whySafe: 'Designing ZK circuits for privacy-preserving applications requires deep cryptographic expertise at the frontier of applied mathematics.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'DeFi Protocol Lead / Cofounder', riskReduction: 20, skillGap: 'DAO governance, Multi-sig security, Cross-chain architecture', transitionDifficulty: 'Very Hard', industryMapping: ['Web3', 'DeFi'], salaryDelta: '+100-Unlimited (Token)', timeToTransition: '24 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2026, riskScore: 25, label: '+2yr' }, { year: 2027, riskScore: 28, label: '+3yr' }, { year: 2028, riskScore: 30, label: '+4yr' }, { year: 2029, riskScore: 32, label: '+5yr' }],
    confidenceScore: 92,
    contextTags: ['emerging-role', 'tech-sector', 'web3', 'cryptography-moat', 'frontier-skill'],
    evolutionHorizon: '2027',
    roleCategory: 'ai_augmented',
  },
  em_ai_red_team: {
    displayRole: 'AI Red Team Lead',
    summary: 'Very high demand; proactively finding vulnerabilities in AI systems before they are exploited in production.',
    skills: {
      obsolete: [{ "skill": "Manual attack vector documentation from published CVE and security advisories", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI security intelligence platforms auto-aggregate and classify attack vectors from CVE feeds.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard prompt injection test generation for known injection taxonomy categories", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI red-team automation tools generate injection test cases from known attack taxonomies.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Adversarial Prompt Attack Design', whySafe: 'Designing novel attack vectors that bypass AI safety guardrails requires human creativity that exceeds current automated red-teaming tools.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'AI System Vulnerability Assessment', whySafe: 'Evaluating AI systems for data poisoning, model theft, and output manipulation requires the mindset of a creative adversary — irreducibly human.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'AI Security Director', riskReduction: 20, skillGap: 'ML security, Threat modeling, Penetration testing certs', transitionDifficulty: 'Hard', industryMapping: ['Tech', 'Defense', 'Finance'], salaryDelta: '+80-200%', timeToTransition: '24 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 6, label: '+2yr' }, { year: 2027, riskScore: 5, label: '+3yr' }, { year: 2028, riskScore: 5, label: '+4yr' }, { year: 2029, riskScore: 5, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'ai-native', 'security', 'frontier-skill', 'ai-resilient'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },
  em_autonomous_vehicle: {
    displayRole: 'Autonomous Vehicle Systems Engineer',
    summary: 'High resilience; safety-critical embedded AI systems require extreme rigor that exceeds current AI self-development capability.',
    skills: {
      obsolete: [{ "skill": "Manual scenario log file labelling for common driving event categories", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI annotation platforms auto-label AV scenario logs for common event categories at scale.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard simulation test suite execution for regulatory compliance scenarios", "riskScore": 74, "riskType": "Augmented", "horizon": "2yr", "reason": "AI AV test platforms auto-run simulation suites for regulatory scenario libraries.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Safety-Critical Failure Mode Analysis (FMEA/FTA)', whySafe: 'Defining exhaustive failure mode trees for systems where software errors can kill humans — accountability that requires human engineering judgment.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Sensor Fusion Architecture Design', whySafe: 'Designing the fusion algorithm that reconciles conflicting inputs from LIDAR, cameras, radar, and IMU — in all edge cases — is frontier engineering.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'AV Safety Lead at Waymo/Mobileye', riskReduction: 15, skillGap: 'ISO 26262, AUTOSAR, V2X communication', transitionDifficulty: 'Very Hard', industryMapping: ['Automotive', 'Tech', 'Defense'], salaryDelta: '+80-200%', timeToTransition: '36 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 7, label: '+2yr' }, { year: 2027, riskScore: 6, label: '+3yr' }, { year: 2028, riskScore: 6, label: '+4yr' }, { year: 2029, riskScore: 7, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['emerging-role', 'ai-native', 'tech-sector', 'safety-critical', 'ai-resilient'],
    evolutionHorizon: '2029',
    roleCategory: 'ai_native',
  },
  em_neurotech: {
    displayRole: 'Neurotech Interface Engineer',
    summary: 'Frontier growth; designing Brain-Computer Interface (BCI) systems for therapeutic, assistive, and enhancement applications.',
    skills: {
      obsolete: [{ "skill": "Manual EEG electrode impedance check logging from impedance meter readings", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI BCI systems auto-measure and log electrode impedance across all channels continuously.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard neural signal noise filtering using established frequency band methods", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI signal processing libraries auto-apply validated filtering pipelines to neural recordings.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Neural Signal Decoding Algorithm Design', whySafe: 'Designing algorithms that accurately interpret complex neural electrical signals — highly variable across individuals and conditions — requires frontier neuroscience-engineering synthesis.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'BCI Therapeutic Application Design', whySafe: 'Balancing efficacy, safety, invasiveness, and patient quality of life in medical BCI — requires clinical, engineering, and ethical human expertise simultaneously.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Principal Neurotech Researcher (Neuralink, Synchron)', riskReduction: 5, skillGap: 'Ph.D Neuroscience + Electrical Engineering + FDA regulatory pathway', transitionDifficulty: 'Very Hard', industryMapping: ['Biotech', 'Medical Devices', 'Defense'], salaryDelta: '+100-300%', timeToTransition: '60 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 3, label: 'Now' }, { year: 2026, riskScore: 3, label: '+2yr' }, { year: 2027, riskScore: 3, label: '+3yr' }, { year: 2028, riskScore: 3, label: '+4yr' }, { year: 2029, riskScore: 3, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'biotech', 'ai-resilient', 'frontier-skill', 'critical-undersupply'],
    evolutionHorizon: '2035',
    roleCategory: 'traditional',
  },
  em_quantum_sw: {
    displayRole: 'Quantum Software Architect',
    summary: 'Extreme resilience and growing demand; bridging quantum hardware reality and classical software needs.',
    skills: {
      obsolete: [{ "skill": "Manual qubit error rate benchmark documentation from hardware provider spec sheets", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI quantum benchmarking tools auto-collect and compare error rates across quantum hardware platforms.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard variational quantum eigensolver (VQE) parameter setup for known molecular Hamiltonians", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI quantum chemistry tools auto-configure VQE ansatz and parameter bounds from molecular input.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Quantum Error Mitigation Strategy', whySafe: 'Developing algorithms that extract useful computation from noisy NISQ quantum hardware — the critical bridge problem of quantum computing — requires frontier mathematical creativity.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Post-Quantum Cryptography Migration', whySafe: 'Designing the transition of enterprise systems to PQC-safe algorithms before quantum computers break RSA — a time-critical, high-stakes human project management challenge.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Quantum Research Lead (IBM, Google, IonQ)', riskReduction: 5, skillGap: 'Quantum information theory, Qiskit/Cirq, Linear algebra at PhD level', transitionDifficulty: 'Very Hard', industryMapping: ['Quantum Labs', 'Finance', 'Government'], salaryDelta: '+100-400%', timeToTransition: '60 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 4, label: 'Now' }, { year: 2026, riskScore: 3, label: '+2yr' }, { year: 2027, riskScore: 3, label: '+3yr' }, { year: 2028, riskScore: 4, label: '+4yr' }, { year: 2029, riskScore: 5, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['emerging-role', 'ai-resilient', 'frontier-skill', 'critical-undersupply', 'quantum'],
    evolutionHorizon: '2030',
    roleCategory: 'traditional',
  },
  em_ai_npc_designer: {
    displayRole: 'AI Game NPC Designer (Generative AI)',
    summary: 'High growth; designing emotionally coherent, non-repetitive AI-driven characters for next-generation games.',
    skills: {
      obsolete: [{ "skill": "Standard NPC backstory template writing for secondary world-building characters", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI game writing tools generate consistent NPC backstories from world-building parameter inputs.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard behavior tree node setup for common NPC activity patterns", "riskScore": 76, "riskType": "Augmented", "horizon": "2yr", "reason": "AI game AI tools generate behavior tree configurations for common NPC archetypes.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Emotional Coherence Architecture for AI Characters', whySafe: 'Designing AI NPCs whose behavior feels psychologically consistent and emotionally authentic — without scripting every response — requires deep narrative and human psychology expertise.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Player Trust Calibration', whySafe: 'Managing how much players trust and emotionally invest in AI characters — a new design challenge unique to generative AI games.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'AI Game Director', riskReduction: 20, skillGap: 'LLM game integration, Unity/Unreal AI, Narrative design', transitionDifficulty: 'Hard', industryMapping: ['AAA Games', 'Indie', 'Interactive Entertainment'], salaryDelta: '+50-150%', timeToTransition: '24 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2026, riskScore: 12, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 9, label: '+4yr' }, { year: 2029, riskScore: 9, label: '+5yr' }],
    confidenceScore: 95,
    contextTags: ['emerging-role', 'creative-sector', 'ai-native', 'game-design', 'high-demand'],
    evolutionHorizon: '2028',
    roleCategory: 'ai_native',
  },
  em_supply_chain_ai: {
    displayRole: 'AI Supply Chain Strategist',
    summary: 'High resilience; using AI to design resilient global supply networks — the strategic layer AI cannot replace.',
    skills: {
      obsolete: [{ skill: 'Manual demand forecasting spreadsheets', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI forecasting models outperform humans by 30-40% on standard demand signals.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard ML model feature importance analysis for demand forecasting models", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI model explainability tools auto-generate feature importance reports from trained forecasting models.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Geopolitical Supply Disruption Modeling', whySafe: 'Modeling the impact of tariffs, conflicts, and political events on supply chains requires human geopolitical intelligence AI lacks.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'AI Model Output Validation Strategy', whySafe: 'Knowing when to override AI supply chain recommendations — and when to trust them — requires human operational wisdom and accountability.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Supply Chain Officer', riskReduction: 30, skillGap: 'Executive leadership, P&L, Multi-region ops', transitionDifficulty: 'Very Hard', industryMapping: ['Retail', 'Manufacturing', 'Pharma'], salaryDelta: '+100-300%', timeToTransition: '48 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2026, riskScore: 13, label: '+2yr' }, { year: 2027, riskScore: 12, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 13, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['emerging-role', 'ai-native', 'supply-chain', 'ai-resilient', 'strategy-moat'],
    evolutionHorizon: '2029',
    roleCategory: 'ai_augmented',
  },
  em_fintech_engineer: {
    displayRole: 'FinTech Platform Engineer',
    summary: 'High resilience in core financial system design; disruption in commodity fintech feature development.',
    skills: {
      obsolete: [{ skill: 'Standard payment API integration', riskScore: 85, riskType: 'Automatable', horizon: '2yr', reason: 'Low-code fintech platforms (Stripe, Plaid) make standard integrations near-zero-code.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard payment API integration testing for common gateway configurations", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI API testing platforms auto-generate test suites for payment gateway integrations from API specifications.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Real-Time Settlement Architecture', whySafe: 'Designing systems that must achieve 99.999% uptime while processing trillions in transactions — where failure means regulatory sanctions — is safety-critical systems engineering.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Regulatory Technology (RegTech) Integration', whySafe: 'Building systems that comply with AML, PSD2, MiCA, and Basel III simultaneously requires human legal-engineering synthesis.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Technology Officer (FinTech Startup)', riskReduction: 25, skillGap: 'Leadership, Fundraising literacy, Compliance architecture', transitionDifficulty: 'Hard', industryMapping: ['FinTech', 'Banking'], salaryDelta: '+80-250%', timeToTransition: '36 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2026, riskScore: 20, label: '+2yr' }, { year: 2027, riskScore: 22, label: '+3yr' }, { year: 2028, riskScore: 25, label: '+4yr' }, { year: 2029, riskScore: 28, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['emerging-role', 'fintech', 'tech-sector', 'ai-resilient', 'regulatory-driven'],
    evolutionHorizon: '2028',
    roleCategory: 'ai_augmented',
  },
  em_creator_economy: {
    displayRole: 'Creator Economy Strategist',
    summary: 'High resilience; building the business infrastructure behind digital-first human creator brands.',
    skills: {
      obsolete: [{ "skill": "Manual analytics dashboard screenshot compilation for brand partnership reports", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI creator platforms auto-generate branded analytics reports from connected platform APIs.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard social media content calendar management', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI tools generate and schedule content from brief prompts.', aiReplacement: 'Full' }],
      safe: [
        { skill: 'Authentic Creator Brand Architecture', whySafe: 'Building sustainable parasocial trust between a human creator and their audience — the invisible architecture of creator success — is irreducibly human work.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Creator IP Monetization Strategy', whySafe: 'Designing the multi-stream revenue model (courses, products, licensing, brand deals) specific to an individual creator\'s unique human strengths.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Creator Economy Venture Partner', riskReduction: 35, skillGap: 'Investment analysis, Startup ecosystem access', transitionDifficulty: 'Very Hard', industryMapping: ['VC', 'Media', 'Talent Agencies'], salaryDelta: '+100-500%', timeToTransition: '36 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 20, label: 'Now' }, { year: 2026, riskScore: 18, label: '+2yr' }, { year: 2027, riskScore: 16, label: '+3yr' }, { year: 2028, riskScore: 15, label: '+4yr' }, { year: 2029, riskScore: 15, label: '+5yr' }],
    confidenceScore: 93,
    contextTags: ['emerging-role', 'creative-sector', 'ai-resilient', 'creator-economy', 'human-brand'],
    evolutionHorizon: '2028',
    roleCategory: 'traditional',
  },

  // ── v40.0: Modern role intelligence additions ────────────────────────────────
  ai_pm: {
    displayRole: 'AI Product Manager',
    summary: 'Rapidly professionalizing; AI PMs who combine classic PM rigor with LLM product design, evaluation frameworks, and responsible AI governance are in extreme demand at AI-native companies.',
    skills: {
      obsolete: [{ skill: 'Manual user interview scheduling and note-taking', riskScore: 78, riskType: 'Automatable', horizon: '1yr', reason: 'AI note-taking and interview synthesis tools auto-transcribe and surface themes.', aiReplacement: 'Partial' }],
      at_risk: [{ skill: 'A/B test result interpretation (basic)', riskScore: 65, riskType: 'Augmented', horizon: '2yr', reason: 'Statistical significance and impact calculation increasingly automated by experimentation platforms.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'LLM Product Evaluation Design', whySafe: 'Designing eval suites that measure what actually matters for a business use case — beyond BLEU scores — requires deep domain + AI understanding no AI can self-supply.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Responsible AI Product Strategy', whySafe: 'Navigating EU AI Act, NIST AI RMF, and company policy in a way that enables innovation without regulatory risk requires human judgment across technical and legal domains.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'AI Product Roadmap Prioritization', whySafe: 'Deciding what AI capability to build next requires deep understanding of user need, model capability, and competitive dynamics that AI assistants cannot synthesize.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'VP Product at AI-Native Company', riskReduction: 15, skillGap: 'Team management, revenue ownership', transitionDifficulty: 'Hard', industryMapping: ['AI Labs', 'Enterprise SaaS'], salaryDelta: '+80-180%', timeToTransition: '24 months' },
      { role: 'Chief Product Officer', riskReduction: 10, skillGap: 'Board-level communication, P&L ownership', transitionDifficulty: 'Very Hard', industryMapping: ['SaaS', 'AI Platforms'], salaryDelta: '+150-400%', timeToTransition: '48 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 10, label: 'Now' }, { year: 2026, riskScore: 12, label: '+2yr' }, { year: 2027, riskScore: 18, label: '+3yr' }, { year: 2028, riskScore: 25, label: '+4yr' }, { year: 2029, riskScore: 30, label: '+5yr' }],
    confidenceScore: 94,
    contextTags: ['emerging-role', 'ai-native', 'high-demand', 'product-leadership'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },

  ml_platform: {
    displayRole: 'MLOps / ML Platform Engineer',
    summary: 'Strong demand; the infrastructure layer for AI at scale is a growing function with a clear specialization track distinct from generic DevOps.',
    skills: {
      obsolete: [{ skill: 'Manual model deployment scripts without orchestration', riskScore: 82, riskType: 'Automatable', horizon: '1yr', reason: 'MLOps platforms auto-generate deployment pipelines from model registry metadata.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Basic Docker + Kubernetes deployment (generic)', riskScore: 60, riskType: 'Augmented', horizon: '2yr', reason: 'ML-specific deployment tools abstract away container orchestration for standard model types.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'ML Pipeline Architecture (Feature Store + Training + Serving)', whySafe: 'Designing end-to-end ML platforms that balance cost, latency, freshness, and reliability requires systems thinking no tool can fully automate.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Model Observability and Drift Detection', whySafe: 'Monitoring production model performance and detecting when retraining is needed requires understanding of both ML and production system reliability.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Head of ML Infrastructure', riskReduction: 20, skillGap: 'Team leadership, budget ownership', transitionDifficulty: 'Hard', industryMapping: ['AI Labs', 'Tech'], salaryDelta: '+60-140%', timeToTransition: '18 months' },
      { role: 'Staff / Principal ML Engineer', riskReduction: 15, skillGap: 'Technical depth, cross-org influence', transitionDifficulty: 'Very Hard', industryMapping: ['FAANG', 'Hyperscalers'], salaryDelta: '+40-100%', timeToTransition: '24 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2026, riskScore: 18, label: '+2yr' }, { year: 2027, riskScore: 22, label: '+3yr' }, { year: 2028, riskScore: 28, label: '+4yr' }, { year: 2029, riskScore: 35, label: '+5yr' }],
    confidenceScore: 92,
    contextTags: ['emerging-role', 'ai-infrastructure', 'high-demand', 'tech-sector'],
    evolutionHorizon: '2029',
    roleCategory: 'ai_native',
  },

  rev_ops: {
    displayRole: 'Revenue Operations Manager',
    summary: 'Growing function at Series A–D companies; RevOps professionals who own the GTM tech stack and drive data-driven sales process design are among the most defensible roles in commercial organizations.',
    skills: {
      obsolete: [{ skill: 'Manual CRM data entry and cleanup', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI CRM enrichment tools auto-update contact data from first-party signals and third-party databases.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Basic Salesforce report building', riskScore: 62, riskType: 'Augmented', horizon: '2yr', reason: 'Natural language querying tools allow sales reps to self-serve standard reports without RevOps.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Revenue Process Architecture', whySafe: 'Designing end-to-end GTM processes that align marketing, sales, and CS around a shared revenue model requires deep cross-functional business judgment.', longTermValue: 97, difficulty: 'High' },
        { skill: 'GTM Tech Stack Strategy', whySafe: 'Deciding which tools to consolidate, which to build, and how to integrate them for a specific company stage requires judgment across cost, capability, and org dynamics.', longTermValue: 96, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'VP Revenue Operations', riskReduction: 20, skillGap: 'Team management, executive presence', transitionDifficulty: 'Hard', industryMapping: ['SaaS', 'B2B Tech'], salaryDelta: '+80-160%', timeToTransition: '24 months' },
      { role: 'CRO or VP Sales', riskReduction: 25, skillGap: 'Sales closing, quota ownership', transitionDifficulty: 'Very Hard', industryMapping: ['SaaS', 'Enterprise'], salaryDelta: '+120-300%', timeToTransition: '36 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 20, label: 'Now' }, { year: 2026, riskScore: 25, label: '+2yr' }, { year: 2027, riskScore: 30, label: '+3yr' }, { year: 2028, riskScore: 38, label: '+4yr' }, { year: 2029, riskScore: 44, label: '+5yr' }],
    confidenceScore: 90,
    contextTags: ['commercial-role', 'saas', 'high-demand', 'gtm-function'],
    evolutionHorizon: '2029',
    roleCategory: 'traditional',
  },

  growth: {
    displayRole: 'Head of Growth / Growth Lead',
    summary: 'Highly valued at consumer and PLG SaaS companies; experienced growth leaders who can own a channel from 0→scale are scarce and command strong comp.',
    skills: {
      obsolete: [{ skill: 'Manual attribution model building in Excel', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'Multi-touch attribution platforms auto-build and update attribution models from first-party data.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Basic SEO keyword research and on-page optimization', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI content optimization tools auto-generate keyword-optimized drafts from topic briefs.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Growth Loop Architecture', whySafe: 'Designing viral and retention loops that compound over time — viral coefficients, referral mechanics, habit formation — requires deep understanding of user psychology and product mechanics.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Experimentation Culture and Methodology', whySafe: 'Building the systems and culture that run 10+ valid experiments per month requires organizational design, statistical rigor, and leadership skills AI cannot substitute.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'VP Growth or CMO', riskReduction: 20, skillGap: 'Brand strategy, board communication', transitionDifficulty: 'Hard', industryMapping: ['Consumer', 'PLG SaaS'], salaryDelta: '+80-200%', timeToTransition: '24 months' },
      { role: 'Founder / Co-Founder', riskReduction: 30, skillGap: 'Fundraising, team building, product vision', transitionDifficulty: 'Extremely Hard', industryMapping: ['Startups'], salaryDelta: 'Variable (+200% upside)', timeToTransition: '12 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2026, riskScore: 28, label: '+2yr' }, { year: 2027, riskScore: 34, label: '+3yr' }, { year: 2028, riskScore: 40, label: '+4yr' }, { year: 2029, riskScore: 46, label: '+5yr' }],
    confidenceScore: 89,
    contextTags: ['commercial-role', 'consumer', 'plg', 'high-demand', 'founder-adjacent'],
    evolutionHorizon: '2029',
    roleCategory: 'traditional',
  },

  chief_of_staff: {
    displayRole: 'Chief of Staff',
    summary: 'Fixed-tenure role (18–30 months) designed as a launchpad to VP Ops, COO, or functional leadership; success depends entirely on exec sponsor quality and initiative ownership.',
    skills: {
      obsolete: [{ skill: 'Manual meeting scheduling and agenda preparation', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI executive assistants auto-schedule, prep agendas, and distribute pre-reads from calendar context.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard financial model templates (monthly variance reports)', riskScore: 68, riskType: 'Augmented', horizon: '2yr', reason: 'FP&A AI tools auto-generate variance commentary and flag anomalies without manual analysis.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Organizational Diagnosis and Process Design', whySafe: 'Diagnosing why a cross-functional process is breaking and designing the fix requires political intelligence and systems thinking no AI has.', longTermValue: 97, difficulty: 'High' },
        { skill: 'Executive Communication and Narrative Building', whySafe: 'Translating complex business situations into clear narratives for board, investors, and leadership requires judgment about what the audience needs that AI cannot substitute.', longTermValue: 96, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'VP Operations', riskReduction: 25, skillGap: 'P&L ownership, team management', transitionDifficulty: 'Moderate', industryMapping: ['SaaS', 'Tech', 'Enterprise'], salaryDelta: '+80-200%', timeToTransition: '18 months' },
      { role: 'COO', riskReduction: 20, skillGap: 'Revenue ownership, board experience', transitionDifficulty: 'Very Hard', industryMapping: ['Tech', 'SaaS'], salaryDelta: '+200-500%', timeToTransition: '48 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2026, riskScore: 22, label: '+2yr' }, { year: 2027, riskScore: 26, label: '+3yr' }, { year: 2028, riskScore: 32, label: '+4yr' }, { year: 2029, riskScore: 38, label: '+5yr' }],
    confidenceScore: 91,
    contextTags: ['operational-role', 'executive-adjacency', 'launchpad-role', 'tenure-bounded'],
    evolutionHorizon: '2030',
    roleCategory: 'traditional',
  },

  strategy_ops: {
    displayRole: 'Strategy and Operations',
    summary: 'Strong demand at Series B–D companies and consulting firms; professionals who combine structured analytical rigor with cross-functional execution ownership are highly valued.',
    skills: {
      obsolete: [{ skill: 'Manual data extraction from PDF reports and spreadsheets', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI document parsing tools extract and normalize structured data from unstructured reports in seconds.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard three-statement financial model building', riskScore: 65, riskType: 'Augmented', horizon: '2yr', reason: 'AI FP&A tools auto-populate standard models from data inputs with minimal analyst intervention.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Strategic Problem Structuring', whySafe: 'Defining the right question — what is actually the business problem? — and structuring the analysis to answer it requires judgment no AI can supply without a human setting the frame.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Cross-Functional Alignment and Change Management', whySafe: 'Getting sales, engineering, finance, and leadership to agree on a strategic direction and execute against it requires human political intelligence and relationship capital.', longTermValue: 98, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'VP Strategy or General Manager', riskReduction: 25, skillGap: 'P&L ownership, revenue accountability', transitionDifficulty: 'Hard', industryMapping: ['SaaS', 'Tech', 'Consulting'], salaryDelta: '+100-250%', timeToTransition: '24 months' },
      { role: 'Management Consulting Senior Manager', riskReduction: 20, skillGap: 'Client development, project management', transitionDifficulty: 'Moderate', industryMapping: ['McKinsey', 'BCG', 'Bain', 'Big 4'], salaryDelta: '+40-100%', timeToTransition: '12 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 20, label: 'Now' }, { year: 2026, riskScore: 25, label: '+2yr' }, { year: 2027, riskScore: 32, label: '+3yr' }, { year: 2028, riskScore: 40, label: '+4yr' }, { year: 2029, riskScore: 46, label: '+5yr' }],
    confidenceScore: 90,
    contextTags: ['operational-role', 'analytical', 'high-demand', 'cross-functional'],
    evolutionHorizon: '2030',
    roleCategory: 'traditional',
  },

  // ── v50.0: AI-Native & Human-AI Orchestration Roles ─────────────────────────

  em_vibe_coder: {
    displayRole: 'Vibe Coding Developer',
    summary: 'High near-term demand; building software products by directing AI coding systems rather than writing code manually. Most exposed at junior level; most resilient at architecture/product layer.',
    skills: {
      obsolete: [{ skill: 'Manual line-by-line code authoring for standard CRUD operations', riskScore: 96, riskType: 'Automatable', horizon: '1yr', reason: 'AI coding systems like Claude Code, Cursor, and Copilot generate boilerplate and standard patterns without human keystroke input.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard debugging of AI-generated code without architectural context', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI-assisted debugging tools increasingly identify and fix common errors in generated code.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Product Intent Translation to AI Systems', whySafe: 'Converting fuzzy business goals into precise multi-step AI coding directives — knowing when to trust output and when to override — requires human product judgment AI cannot supply.', longTermValue: 98, difficulty: 'High' },
        { skill: 'AI Output Architecture Review', whySafe: 'Evaluating whether AI-generated code is structurally sound for scale, security, and maintainability requires systems thinking beyond syntax correctness.', longTermValue: 97, difficulty: 'Very High' },
        { skill: 'Prompt Engineering for Complex Software Systems', whySafe: 'Composing multi-file, multi-context AI coding sessions that produce coherent systems — not just isolated functions — is a distinct engineering skill.', longTermValue: 96, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'AI Systems Architect', riskReduction: 35, skillGap: 'System design, scalability patterns, security', transitionDifficulty: 'Hard', industryMapping: ['SaaS', 'AI Startups', 'Enterprise Tech'], salaryDelta: '+40-100%', timeToTransition: '18 months' },
      { role: 'AI-Native Product Builder / Founder', riskReduction: 20, skillGap: 'Product strategy, GTM, fundraising', transitionDifficulty: 'Hard', industryMapping: ['Startup', 'Indie Hacker'], salaryDelta: '+Equity upside', timeToTransition: '6 months' },
    ],
    inactionScenario: 'Vibe coding is the new baseline for building software products rapidly. Those who learn to direct AI systems effectively will outproduce traditional developers 5-10x. Those who do not adapt will find their output speed increasingly uncompetitive.',
    riskTrend: [{ year: 2024, riskScore: 30, label: 'Now' }, { year: 2026, riskScore: 35, label: '+2yr' }, { year: 2027, riskScore: 42, label: '+3yr' }, { year: 2028, riskScore: 50, label: '+4yr' }, { year: 2029, riskScore: 55, label: '+5yr' }],
    confidenceScore: 85,
    contextTags: ['emerging-role', 'ai-native', 'tech-sector', 'high-demand', 'pivot-window'],
    evolutionHorizon: '2028',
    roleCategory: 'ai_native',
  },

  em_agent_ops_mgr: {
    displayRole: 'Agent Operations Manager',
    summary: 'Critically undersupplied 2025-2028; managing, monitoring, and optimizing networks of autonomous AI agents running business processes end-to-end.',
    skills: {
      obsolete: [{ skill: 'Manual step-by-step workflow documentation for human-executed processes', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI process documentation tools auto-map workflows from execution logs and screen recordings.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard SLA monitoring for rule-based automation pipelines', riskScore: 68, riskType: 'Augmented', horizon: '2yr', reason: 'Observability platforms auto-detect SLA violations and generate root-cause hypotheses for agentic pipelines.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Agentic Failure Mode Analysis', whySafe: 'Identifying why an autonomous AI agent made an incorrect decision — and redesigning the task decomposition or guardrails to prevent recurrence — requires human systems thinking AI cannot perform on itself.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Human-Agent Escalation Protocol Design', whySafe: 'Deciding which decisions require human judgment versus agent autonomy — and designing escalation thresholds that are safe and practical — is irreducibly human organizational design work.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Multi-Agent Orchestration Strategy', whySafe: 'Architecting which agents handle which tasks, how they hand off, and how errors propagate requires systems architecture judgment no AI can supply about its own network.', longTermValue: 98, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Head of AI Operations', riskReduction: 10, skillGap: 'Team leadership, P&L accountability, enterprise AI governance', transitionDifficulty: 'Hard', industryMapping: ['Enterprise Tech', 'Financial Services', 'Consulting'], salaryDelta: '+80-180%', timeToTransition: '18 months' },
      { role: 'AI Transformation Director', riskReduction: 8, skillGap: 'Change management, stakeholder alignment, vendor management', transitionDifficulty: 'Hard', industryMapping: ['Enterprise', 'Government', 'Healthcare'], salaryDelta: '+60-150%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'This is one of the most critically undersupplied emerging roles of 2025-2028. Companies are deploying AI agents without people qualified to operate them. Not entering this field is the opportunity cost risk.',
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 4, label: '+2yr' }, { year: 2027, riskScore: 4, label: '+3yr' }, { year: 2028, riskScore: 5, label: '+4yr' }, { year: 2029, riskScore: 6, label: '+5yr' }],
    confidenceScore: 90,
    contextTags: ['emerging-role', 'human-ai-orchestration', 'frontier-skill', 'critical-undersupply', 'ai-resilient'],
    evolutionHorizon: '2030',
    roleCategory: 'human_ai_orchestration',
  },

  em_ai_workflow_arch: {
    displayRole: 'AI Workflow Architect',
    summary: 'High demand at enterprises deploying AI at scale; designing end-to-end AI-augmented business processes that combine LLMs, tools, human touchpoints, and data pipelines.',
    skills: {
      obsolete: [{ skill: 'Manual business process mapping using static flowchart tools', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI process mining tools auto-generate workflow maps from system logs.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard API integration for fixed two-system workflows', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'No-code integration platforms handle standard API connections without architectural design.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'AI + Human Handoff Design', whySafe: 'Determining exactly where in a business process AI should stop and a human should take over — and designing the interface between them — is organizational design work requiring human accountability judgment.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Multi-Modal AI Pipeline Architecture', whySafe: 'Composing workflows that combine text, image, voice, and structured data AI systems into coherent business processes requires cross-domain systems thinking.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'AI Workflow Failure Recovery Design', whySafe: 'Designing graceful degradation when AI components fail in production — maintaining business continuity and human trust — requires human risk and systems engineering judgment.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Enterprise AI Architecture Lead', riskReduction: 15, skillGap: 'Enterprise architecture, cloud systems, vendor governance', transitionDifficulty: 'Hard', industryMapping: ['Consulting', 'Financial Services', 'Healthcare'], salaryDelta: '+60-140%', timeToTransition: '18 months' },
      { role: 'AI Solutions Architect (Vendor)', riskReduction: 20, skillGap: 'Sales engineering, customer success', transitionDifficulty: 'Moderate', industryMapping: ['Microsoft', 'Salesforce', 'ServiceNow', 'AI Startups'], salaryDelta: '+40-100%', timeToTransition: '12 months' },
    ],
    inactionScenario: 'As enterprises move from AI pilot to AI production, AI Workflow Architects become the critical connective tissue between AI capability and business value. Early movers will command significant premiums.',
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 7, label: '+2yr' }, { year: 2027, riskScore: 8, label: '+3yr' }, { year: 2028, riskScore: 10, label: '+4yr' }, { year: 2029, riskScore: 13, label: '+5yr' }],
    confidenceScore: 88,
    contextTags: ['emerging-role', 'human-ai-orchestration', 'enterprise', 'high-demand', 'frontier-skill'],
    evolutionHorizon: '2030',
    roleCategory: 'human_ai_orchestration',
  },

  em_ai_workforce_strategist: {
    displayRole: 'AI Workforce Strategist',
    summary: 'Growing enterprise function; advising organizations on how to restructure teams, redefine roles, and reskill people as AI changes the composition of work.',
    skills: {
      obsolete: [{ skill: 'Static headcount planning based on historical growth ratios', riskScore: 85, riskType: 'Automatable', horizon: '1yr', reason: 'AI workforce analytics tools generate headcount projections from productivity and automation data.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard competency framework design from job family templates', riskScore: 65, riskType: 'Augmented', horizon: '2yr', reason: 'AI HR tools generate competency frameworks from role descriptions and industry benchmarks.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'AI Displacement Impact Assessment', whySafe: 'Evaluating which human roles will be partially vs. fully displaced by AI — and communicating that assessment with honesty and care — requires human empathy, organizational knowledge, and ethical responsibility.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Workforce Transition Program Design', whySafe: 'Designing reskilling programs that actually change behavior — not just deliver content — requires deep human learning psychology and organizational change expertise.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Human-AI Role Redesign', whySafe: 'Redefining what humans do in an AI-augmented organization — preserving meaning and human contribution while eliminating pure automation — is a definitively human organizational design challenge.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Chief People Officer (AI-Era)', riskReduction: 10, skillGap: 'C-suite communication, board relations, total rewards', transitionDifficulty: 'Very Hard', industryMapping: ['Enterprise', 'Consulting', 'Financial Services'], salaryDelta: '+100-300%', timeToTransition: '36 months' },
      { role: 'Future of Work Consulting Partner', riskReduction: 15, skillGap: 'Client development, consulting methodology, practice building', transitionDifficulty: 'Hard', industryMapping: ['McKinsey', 'Deloitte', 'Mercer', 'WEF'], salaryDelta: '+60-150%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'Organizations without AI workforce strategists are making multimillion-dollar decisions about automation and restructuring without specialized guidance. This function is nascent but growing rapidly.',
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 6, label: '+2yr' }, { year: 2027, riskScore: 5, label: '+3yr' }, { year: 2028, riskScore: 5, label: '+4yr' }, { year: 2029, riskScore: 5, label: '+5yr' }],
    confidenceScore: 85,
    contextTags: ['emerging-role', 'human-ai-orchestration', 'hr-function', 'consulting', 'ai-resilient'],
    evolutionHorizon: '2030',
    roleCategory: 'human_ai_orchestration',
  },

  em_ai_governance_lead: {
    displayRole: 'AI Governance Lead',
    summary: 'Regulatory-driven demand surge; ensuring AI systems deployed in organizations comply with EU AI Act, NIST AI RMF, and internal responsible AI policies.',
    skills: {
      obsolete: [{ skill: 'Manual AI system inventory tracking via spreadsheets', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI governance platforms auto-discover and catalog AI systems from infrastructure logs and vendor contracts.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard risk classification of AI systems using published frameworks', riskScore: 68, riskType: 'Augmented', horizon: '2yr', reason: 'AI governance tools auto-classify system risk using regulatory framework rules from system descriptions.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'AI Regulatory Interpretation and Application', whySafe: 'Interpreting how emerging regulations (EU AI Act, NIST AI RMF, ISO 42001) apply to specific organizational AI deployments requires legal + technical + ethical synthesis no AI can reliably perform.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'AI Incident Response and Accountability', whySafe: 'When an AI system causes harm, determining organizational accountability, remediating the system, and communicating to regulators requires human judgment and legal authority.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Responsible AI Policy Writing', whySafe: 'Drafting internal AI use policies that are both practically enforceable and ethically sound requires deep human legal, organizational, and ethical expertise.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief AI Officer / CAiO', riskReduction: 5, skillGap: 'Board-level communication, strategic AI deployment, P&L ownership', transitionDifficulty: 'Very Hard', industryMapping: ['Financial Services', 'Healthcare', 'Government', 'Enterprise Tech'], salaryDelta: '+150-400%', timeToTransition: '36 months' },
      { role: 'AI Policy Director (Government)', riskReduction: 8, skillGap: 'Policy writing, political communication, stakeholder management', transitionDifficulty: 'Hard', industryMapping: ['Government', 'International Bodies', 'Think Tanks'], salaryDelta: '+30-100%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'EU AI Act and emerging global AI regulations are creating mandatory AI governance functions in organizations with high-risk AI systems. This is a regulatory compliance function that will grow regardless of AI capability trends.',
    riskTrend: [{ year: 2024, riskScore: 6, label: 'Now' }, { year: 2026, riskScore: 5, label: '+2yr' }, { year: 2027, riskScore: 4, label: '+3yr' }, { year: 2028, riskScore: 4, label: '+4yr' }, { year: 2029, riskScore: 4, label: '+5yr' }],
    confidenceScore: 92,
    contextTags: ['emerging-role', 'human-ai-orchestration', 'regulatory-driven', 'frontier-skill', 'ai-resilient'],
    evolutionHorizon: '2030',
    roleCategory: 'human_ai_orchestration',
  },

  em_autonomous_agent_supervisor: {
    displayRole: 'Autonomous Agent Supervisor',
    summary: 'Frontline role in AI-native operations; monitoring agent pipelines in real time, catching errors, and maintaining quality standards across automated workflows.',
    skills: {
      obsolete: [{ skill: 'Manual queue management and ticket routing in human support pipelines', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'Agent orchestration platforms route tasks automatically based on classification and priority rules.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard quality sampling from agent output batches', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'AI quality assurance tools auto-sample and score agent outputs against rubrics.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Agent Behavioral Anomaly Detection', whySafe: 'Recognizing when an agent is behaving unusually — within specification but producing wrong business outcomes — requires human business judgment the agent cannot apply to its own outputs.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Edge Case Escalation Judgment', whySafe: 'Deciding whether an unusual agent output should be overridden, escalated, or used as-is requires human authority and contextual wisdom.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Agent Training Feedback Loop Management', whySafe: 'Curating which agent errors become training examples — and which are acceptable exceptions — requires human judgment about business intent and risk.', longTermValue: 97, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Agent Operations Manager', riskReduction: 30, skillGap: 'Systems thinking, team leadership, process design', transitionDifficulty: 'Moderate', industryMapping: ['BPO', 'Financial Services', 'Enterprise Tech', 'E-commerce'], salaryDelta: '+40-80%', timeToTransition: '12 months' },
      { role: 'AI Quality Assurance Lead', riskReduction: 25, skillGap: 'Evaluation design, metrics, compliance', transitionDifficulty: 'Moderate', industryMapping: ['Enterprise AI', 'AI Labs', 'Consulting'], salaryDelta: '+30-70%', timeToTransition: '12 months' },
    ],
    inactionScenario: 'As BPO, financial, and operational processes are increasingly handled by AI agents, human supervisors become the accountability layer. This role will expand significantly before automation catches up to oversight itself.',
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2026, riskScore: 10, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 15, label: '+5yr' }],
    confidenceScore: 85,
    contextTags: ['emerging-role', 'human-ai-orchestration', 'operations', 'ai-resilient', 'growth-role'],
    evolutionHorizon: '2029',
    roleCategory: 'human_ai_orchestration',
  },

  em_human_ai_collab_designer: {
    displayRole: 'Human-AI Collaboration Designer',
    summary: 'Emerging at the intersection of UX, organizational design, and AI; designing workflows, interfaces, and experiences where humans and AI systems work together effectively.',
    skills: {
      obsolete: [{ skill: 'Standard user interface wireframing for purely human-operated software', riskScore: 82, riskType: 'Automatable', horizon: '1yr', reason: 'AI design tools generate standard UI wireframes from feature descriptions without manual effort.', aiReplacement: 'Partial' }],
      at_risk: [{ skill: 'Usability heuristic evaluation using published Nielsen heuristics', riskScore: 68, riskType: 'Augmented', horizon: '2yr', reason: 'AI UX tools auto-apply standard usability heuristics to screen recordings and prototypes.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'AI Trust Calibration UX Design', whySafe: 'Designing interfaces that help users appropriately trust AI outputs — not too much, not too little — requires deep human psychological and domain understanding.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Human Cognitive Load Optimization in AI Workflows', whySafe: 'Ensuring human oversight in AI-assisted workflows does not create unmanageable cognitive burden requires human ergonomics and systems design expertise.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Organizational Behavior Design for AI-Augmented Teams', whySafe: 'Designing how teams of humans and AI agents collaborate — including role boundaries, accountability structures, and failure modes — is human organizational design work.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Head of Human-Centered AI Design', riskReduction: 15, skillGap: 'Research leadership, organizational design, AI product strategy', transitionDifficulty: 'Hard', industryMapping: ['Big Tech', 'AI Labs', 'Enterprise SaaS'], salaryDelta: '+60-150%', timeToTransition: '24 months' },
      { role: 'AI UX Research Lead', riskReduction: 20, skillGap: 'Research methods, quantitative analysis', transitionDifficulty: 'Moderate', industryMapping: ['AI Product Companies', 'Consulting'], salaryDelta: '+30-80%', timeToTransition: '12 months' },
    ],
    inactionScenario: 'As AI systems proliferate, the quality of human-AI interaction design will determine whether AI actually improves human productivity or creates new failure modes. Early specialists will command significant premiums.',
    riskTrend: [{ year: 2024, riskScore: 10, label: 'Now' }, { year: 2026, riskScore: 8, label: '+2yr' }, { year: 2027, riskScore: 7, label: '+3yr' }, { year: 2028, riskScore: 8, label: '+4yr' }, { year: 2029, riskScore: 10, label: '+5yr' }],
    confidenceScore: 82,
    contextTags: ['emerging-role', 'ai-native', 'ux-design', 'frontier-skill', 'ai-resilient'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },

  em_synthetic_data_eng: {
    displayRole: 'Synthetic Data Engineer',
    summary: 'Strong demand driven by privacy regulations and AI training data scarcity; generating, validating, and curating synthetic datasets that enable AI model training without real-world privacy exposure.',
    skills: {
      obsolete: [{ skill: 'Manual data anonymization via row-by-row spreadsheet editing', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI anonymization tools auto-detect and mask PII fields across large datasets.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard synthetic data validation using summary statistics', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'AI data quality tools auto-run statistical fidelity checks and distribution comparisons.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Domain-Specific Synthetic Data Fidelity Design', whySafe: 'Determining what properties synthetic medical, financial, or industrial data must preserve to be useful for AI training requires deep domain expertise no generalist AI can supply.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Privacy Leakage Audit for Generative Models', whySafe: 'Testing whether generative models memorize and reproduce training data — and designing mitigation strategies — requires human adversarial thinking and privacy law expertise.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Rare Event Augmentation Strategy', whySafe: 'Designing synthetic data generation strategies for rare but critical events (fraud patterns, disease states, edge cases) that preserve realism requires domain judgment and statistical creativity.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'AI Data Strategy Lead', riskReduction: 20, skillGap: 'Data governance, privacy law, model evaluation', transitionDifficulty: 'Hard', industryMapping: ['Healthcare AI', 'Financial AI', 'Autonomous Vehicles', 'Enterprise AI'], salaryDelta: '+50-120%', timeToTransition: '18 months' },
      { role: 'MLOps / Data Platform Lead', riskReduction: 25, skillGap: 'Infrastructure, orchestration, feature stores', transitionDifficulty: 'Moderate', industryMapping: ['AI Labs', 'Enterprise ML Teams'], salaryDelta: '+40-100%', timeToTransition: '12 months' },
    ],
    inactionScenario: 'GDPR, HIPAA, and emerging AI data regulations are driving enterprise demand for synthetic data at scale. This is a regulatory-driven function that will grow regardless of AI capability trends.',
    riskTrend: [{ year: 2024, riskScore: 10, label: 'Now' }, { year: 2026, riskScore: 8, label: '+2yr' }, { year: 2027, riskScore: 8, label: '+3yr' }, { year: 2028, riskScore: 10, label: '+4yr' }, { year: 2029, riskScore: 12, label: '+5yr' }],
    confidenceScore: 88,
    contextTags: ['emerging-role', 'ai-native', 'data-engineering', 'regulatory-driven', 'frontier-skill'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },

  em_ai_red_teamer: {
    displayRole: 'AI Red Teamer / Adversarial ML Specialist',
    summary: 'Critical and undersupplied; systematically attacking AI systems to find vulnerabilities, bias, and failure modes before malicious actors or real-world incidents do.',
    skills: {
      obsolete: [{ skill: 'Manual jailbreak attempt logging from known public datasets', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI red-teaming platforms auto-generate and test adversarial prompts from known attack taxonomy databases.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard prompt injection testing using published attack patterns', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'Automated security scanners run standard injection attack patterns without manual execution.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Novel Attack Vector Discovery', whySafe: 'Finding new, previously unknown ways to compromise AI systems — beyond known patterns — requires human adversarial creativity and systems thinking that exceeds automated scanners.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Sociotechnical Vulnerability Analysis', whySafe: 'Identifying how AI system failures interact with human behavior, organizational processes, and societal norms to create harm requires human social and systems thinking.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'AI Bias and Fairness Adversarial Testing', whySafe: 'Designing tests that surface discriminatory AI behavior across protected attributes — including subtle intersectional bias — requires human cultural competency and domain knowledge.', longTermValue: 98, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Head of AI Security / Red Team Lead', riskReduction: 5, skillGap: 'Team leadership, security research publication, executive communication', transitionDifficulty: 'Hard', industryMapping: ['AI Labs', 'Government', 'Financial Services', 'Defense'], salaryDelta: '+80-200%', timeToTransition: '24 months' },
      { role: 'AI Safety Researcher', riskReduction: 8, skillGap: 'ML research methods, academic publishing, interpretability', transitionDifficulty: 'Very Hard', industryMapping: ['Anthropic', 'OpenAI', 'DeepMind', 'Government'], salaryDelta: '+50-150%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'This is one of the most critically undersupplied specializations in AI safety. Organizations deploying AI at scale have almost no red team capacity. Early entrants will command exceptional premiums.',
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 4, label: '+2yr' }, { year: 2027, riskScore: 4, label: '+3yr' }, { year: 2028, riskScore: 4, label: '+4yr' }, { year: 2029, riskScore: 5, label: '+5yr' }],
    confidenceScore: 92,
    contextTags: ['emerging-role', 'ai-native', 'security', 'frontier-skill', 'critical-undersupply', 'ai-resilient'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },

  em_robotics_ai_trainer: {
    displayRole: 'Robotics AI Trainer',
    summary: 'Rapidly growing with manufacturing and logistics automation; training robot systems through demonstration, feedback, and environment design to perform physical tasks reliably.',
    skills: {
      obsolete: [{ skill: 'Manual robot programming via teach pendant for fixed-path movements', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI-based robot programming tools generate motion paths from task demonstrations without manual pendant programming.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard simulation environment setup for known task categories', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'AI simulation platforms auto-generate environments from task descriptions and physical specifications.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Physical Task Decomposition for Robot Learning', whySafe: 'Breaking down complex physical tasks into learnable sub-tasks that a robot can master — knowing what the robot can and cannot generalize — requires human physical intuition and robot learning expertise.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Robot Failure Mode Identification and Remediation', whySafe: 'Identifying why a robot is failing at a task in a physical environment — and designing targeted training interventions — requires hands-on physical judgment and robotics expertise.', longTermValue: 97, difficulty: 'Very High' },
        { skill: 'Human Demonstration Curation for Imitation Learning', whySafe: 'Selecting which human demonstrations of a physical task best teach a robot — balancing skill level, variation, and edge case coverage — requires human pedagogical judgment.', longTermValue: 96, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Robotics AI Platform Lead', riskReduction: 20, skillGap: 'ML research, hardware integration, team leadership', transitionDifficulty: 'Hard', industryMapping: ['Logistics', 'Manufacturing', 'Autonomous Systems', 'AgriTech'], salaryDelta: '+60-150%', timeToTransition: '24 months' },
      { role: 'Autonomous Systems Engineer', riskReduction: 25, skillGap: 'Control systems, computer vision, embedded AI', transitionDifficulty: 'Hard', industryMapping: ['Robotics Companies', 'Defense', 'Aerospace'], salaryDelta: '+50-130%', timeToTransition: '18 months' },
    ],
    inactionScenario: 'As manufacturing and logistics automation accelerates, the bottleneck will not be robot hardware but human expertise in training those systems. Early entrants will find exceptional demand across automotive, logistics, and agriculture.',
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 7, label: '+2yr' }, { year: 2027, riskScore: 7, label: '+3yr' }, { year: 2028, riskScore: 8, label: '+4yr' }, { year: 2029, riskScore: 10, label: '+5yr' }],
    confidenceScore: 88,
    contextTags: ['emerging-role', 'ai-native', 'robotics', 'frontier-skill', 'manufacturing', 'ai-resilient'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },

  em_spatial_computing_dev: {
    displayRole: 'Spatial Computing Developer',
    summary: 'Growing with Vision Pro, Meta Quest, and industrial XR adoption; building applications that blend digital and physical worlds through augmented and mixed reality.',
    skills: {
      obsolete: [{ skill: 'Standard mobile UI layout for 2D screen interfaces', riskScore: 80, riskType: 'Augmented', horizon: '1yr', reason: 'AI UI generation tools create standard 2D interface layouts from design specs.', aiReplacement: 'Partial' }],
      at_risk: [{ skill: 'Basic 3D object placement and anchor management in known XR frameworks', riskScore: 65, riskType: 'Augmented', horizon: '2yr', reason: 'Spatial computing frameworks automate common 3D placement patterns.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Spatial UX Design for Human Perception', whySafe: 'Designing 3D interfaces that align with human depth perception, attention, and physical comfort requires human embodied experience and perceptual psychology expertise that AI lacks.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Physical-Digital Fusion Architecture', whySafe: 'Designing systems that blend digital overlays with real-world physical environments in real time — handling occlusion, lighting, and semantic understanding — requires novel systems thinking.', longTermValue: 97, difficulty: 'Very High' },
        { skill: 'Spatial AI Integration (Vision + LLM + Sensor)', whySafe: 'Orchestrating computer vision, language models, and physical sensors into coherent spatial experiences requires cross-domain AI engineering judgment.', longTermValue: 96, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'XR Platform Lead / Spatial Computing Architect', riskReduction: 20, skillGap: 'Platform SDK expertise, team leadership, enterprise integration', transitionDifficulty: 'Hard', industryMapping: ['Apple', 'Meta', 'Microsoft', 'Industrial Enterprise'], salaryDelta: '+60-150%', timeToTransition: '18 months' },
      { role: 'Spatial AI Systems Designer', riskReduction: 25, skillGap: 'Computer vision, multi-modal AI, 3D graphics', transitionDifficulty: 'Very Hard', industryMapping: ['AI Labs', 'Defense', 'Healthcare', 'Manufacturing'], salaryDelta: '+80-200%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'Spatial computing is transitioning from consumer novelty to industrial productivity platform. Early developers who build spatial AI expertise will have first-mover advantage in a market with severe talent scarcity.',
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2026, riskScore: 10, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 15, label: '+5yr' }],
    confidenceScore: 82,
    contextTags: ['emerging-role', 'ai-native', 'spatial-computing', 'frontier-skill', 'high-demand'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },

  em_climate_ai_analyst: {
    displayRole: 'Climate AI / Carbon Intelligence Analyst',
    summary: 'Regulatory-driven demand; using AI to model carbon footprints, optimize decarbonization strategies, and verify emissions claims across supply chains.',
    skills: {
      obsolete: [{ skill: 'Manual Scope 3 emissions data collection from supplier surveys', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI supply chain platforms auto-extract emissions data from supplier databases and shipping records.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard GHG Protocol emissions calculation for known activity categories', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'AI carbon accounting tools auto-calculate emissions factors from activity data inputs.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'AI-Generated Emissions Forecast Validation', whySafe: 'Critically evaluating AI-generated climate projections — identifying when model assumptions diverge from physical reality — requires deep climate science and domain expertise.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Decarbonization Strategy Design', whySafe: 'Designing cost-effective pathways to net-zero for specific industrial or organizational contexts requires synthesis of technical, economic, and stakeholder factors no AI can reliably integrate.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Carbon Credit Integrity Verification', whySafe: 'Determining whether a carbon offset actually represents real, additional, and permanent emissions reduction — including local community and biodiversity impacts — requires on-the-ground expertise and scientific judgment.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Head of Climate Intelligence / Chief Sustainability Officer', riskReduction: 10, skillGap: 'Board communication, regulatory expertise, strategy', transitionDifficulty: 'Hard', industryMapping: ['Financial Services', 'Energy', 'Manufacturing', 'Government'], salaryDelta: '+80-200%', timeToTransition: '24 months' },
      { role: 'Climate Risk Quantitative Analyst', riskReduction: 15, skillGap: 'Quantitative methods, financial modeling, regulatory frameworks', transitionDifficulty: 'Hard', industryMapping: ['Banks', 'Insurance', 'Asset Management'], salaryDelta: '+50-120%', timeToTransition: '18 months' },
    ],
    inactionScenario: 'CSRD, SEC climate disclosure, and ISSB reporting requirements are creating mandatory climate intelligence functions in large organizations. Demand will continue regardless of political headwinds as regulatory pressure increases.',
    riskTrend: [{ year: 2024, riskScore: 10, label: 'Now' }, { year: 2026, riskScore: 8, label: '+2yr' }, { year: 2027, riskScore: 7, label: '+3yr' }, { year: 2028, riskScore: 7, label: '+4yr' }, { year: 2029, riskScore: 7, label: '+5yr' }],
    confidenceScore: 88,
    contextTags: ['emerging-role', 'ai-native', 'climate-tech', 'regulatory-driven', 'ai-resilient', 'frontier-skill'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },

  em_agentic_sys_designer: {
    displayRole: 'Agentic Systems Designer',
    summary: 'Frontier role at the intersection of software architecture and AI; designing the structure, guardrails, and interaction patterns of multi-agent AI systems that accomplish complex goals autonomously.',
    skills: {
      obsolete: [{ skill: 'Single-agent LLM prompt optimization for isolated tasks', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'Automated prompt optimization tools tune single-agent prompts from evaluation metrics without manual iteration.', aiReplacement: 'Partial' }],
      at_risk: [{ skill: 'Standard agent memory and context management using published patterns', riskScore: 68, riskType: 'Augmented', horizon: '2yr', reason: 'Agent frameworks auto-manage context windows and memory retrieval using standard implementations.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Multi-Agent Coordination Protocol Design', whySafe: 'Designing how multiple specialized AI agents share information, divide tasks, and resolve conflicts requires systems architecture judgment that no agent can perform about its own network.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Agentic Failure Mode Anticipation', whySafe: 'Identifying how a multi-agent system could fail in unexpected ways — including emergent failure modes from agent interactions — requires human adversarial systems thinking.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Agent Safety Constraint Architecture', whySafe: 'Designing the guardrails that prevent autonomous agents from taking harmful real-world actions — while preserving their utility — is a foundational AI safety engineering challenge requiring human judgment.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'AI Systems Architect / Principal AI Engineer', riskReduction: 10, skillGap: 'Distributed systems, formal verification, enterprise architecture', transitionDifficulty: 'Very Hard', industryMapping: ['AI Labs', 'Enterprise AI Platforms', 'Defense', 'Financial Services'], salaryDelta: '+80-200%', timeToTransition: '24 months' },
      { role: 'AI Research Engineer (Agentic Systems)', riskReduction: 8, skillGap: 'ML research, reinforcement learning, academic publishing', transitionDifficulty: 'Very Hard', industryMapping: ['Anthropic', 'OpenAI', 'DeepMind', 'Research Labs'], salaryDelta: '+100-300%', timeToTransition: '36 months' },
    ],
    inactionScenario: 'Agentic systems design is the most advanced and undersupplied AI engineering skill of 2025-2028. As AI agent deployment scales, the demand for people who can design reliable, safe, multi-agent architectures will far exceed supply.',
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 4, label: '+2yr' }, { year: 2027, riskScore: 4, label: '+3yr' }, { year: 2028, riskScore: 5, label: '+4yr' }, { year: 2029, riskScore: 6, label: '+5yr' }],
    confidenceScore: 88,
    contextTags: ['emerging-role', 'ai-native', 'frontier-skill', 'critical-undersupply', 'ai-resilient'],
    evolutionHorizon: '2032',
    roleCategory: 'ai_native',
  },

  em_ai_transformation_lead: {
    displayRole: 'AI Transformation Lead',
    summary: 'High enterprise demand; leading the organizational change, technology deployment, and culture shift required to make a traditional company AI-capable.',
    skills: {
      obsolete: [{ skill: 'Static digital transformation roadmap documentation using generic frameworks', riskScore: 85, riskType: 'Automatable', horizon: '1yr', reason: 'AI strategy tools generate transformation roadmaps from organizational data and industry benchmarks.', aiReplacement: 'Partial' }],
      at_risk: [{ skill: 'Standard change management communication plan creation', riskScore: 65, riskType: 'Augmented', horizon: '2yr', reason: 'AI communication tools generate change management content from stakeholder analysis inputs.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Executive AI Literacy and Alignment', whySafe: 'Helping C-suite leaders accurately understand AI capability, risk, and organizational implications — without hype or fear — requires human trust, credibility, and communication skill no AI can replicate.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'AI Resistance and Culture Change Navigation', whySafe: 'Identifying and addressing the human fears, political dynamics, and organizational inertia that block AI adoption requires human empathy, organizational psychology, and political intelligence.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'AI ROI Measurement Design', whySafe: 'Designing metrics that accurately capture the business value of AI transformation — including productivity gains, quality improvements, and risk reduction — requires human business judgment and organizational knowledge.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief AI Officer / Chief Digital Officer', riskReduction: 8, skillGap: 'P&L ownership, board relations, technology strategy', transitionDifficulty: 'Very Hard', industryMapping: ['Financial Services', 'Healthcare', 'Manufacturing', 'Government'], salaryDelta: '+100-300%', timeToTransition: '36 months' },
      { role: 'AI Transformation Partner (Big 4 / Consulting)', riskReduction: 12, skillGap: 'Client development, practice building, research publication', transitionDifficulty: 'Hard', industryMapping: ['McKinsey', 'Deloitte', 'BCG', 'Accenture'], salaryDelta: '+60-150%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'Organizations that fail to transform for AI will lose competitive position to AI-native competitors. The role of AI Transformation Lead is the organizational bridge between AI capability and business value capture.',
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 6, label: '+2yr' }, { year: 2027, riskScore: 6, label: '+3yr' }, { year: 2028, riskScore: 7, label: '+4yr' }, { year: 2029, riskScore: 8, label: '+5yr' }],
    confidenceScore: 88,
    contextTags: ['emerging-role', 'human-ai-orchestration', 'enterprise', 'consulting', 'ai-resilient'],
    evolutionHorizon: '2030',
    roleCategory: 'human_ai_orchestration',
  },

  em_digital_human_designer: {
    displayRole: 'Digital Human & Avatar Systems Designer',
    summary: 'Growing with virtual assistants, metaverse, and enterprise avatar use cases; designing AI-driven digital humans that communicate, emote, and interact believably with real people.',
    skills: {
      obsolete: [{ skill: 'Static character rig animation using manual keyframe workflows', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI animation tools generate motion from text or audio prompts without manual keyframe work.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard lip-sync implementation using published audio-to-animation libraries', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI-driven lip sync platforms auto-generate speech animation from audio input.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Uncanny Valley Navigation and Trust Design', whySafe: 'Designing digital humans that feel trustworthy and comfortable to interact with — avoiding the uncanny valley while achieving emotional authenticity — requires deep human perceptual psychology.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Behavioral AI Personality Architecture', whySafe: 'Defining the personality, emotional range, and behavioral boundaries of an AI-driven digital human character — including how it handles edge cases and sensitive interactions — requires human ethical and psychological design.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Cross-Cultural Embodiment Design', whySafe: 'Designing digital human appearances, communication styles, and behaviors that are appropriate and trustworthy across different cultural contexts requires irreducible human cultural competency.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Digital Human Experience Director', riskReduction: 15, skillGap: 'Product leadership, enterprise sales, technical vision', transitionDifficulty: 'Hard', industryMapping: ['Customer Experience', 'Healthcare AI', 'Media', 'Enterprise SaaS'], salaryDelta: '+60-150%', timeToTransition: '18 months' },
      { role: 'AI Character Systems Lead (Entertainment)', riskReduction: 20, skillGap: 'Game AI, narrative design, real-time rendering', transitionDifficulty: 'Hard', industryMapping: ['Gaming', 'Film', 'Theme Parks', 'VR/AR'], salaryDelta: '+50-130%', timeToTransition: '18 months' },
    ],
    inactionScenario: 'Digital humans are becoming the primary interface for AI customer service, healthcare, and enterprise applications. Designers who can make these characters trustworthy and effective will find growing demand across industries.',
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2026, riskScore: 12, label: '+2yr' }, { year: 2027, riskScore: 12, label: '+3yr' }, { year: 2028, riskScore: 14, label: '+4yr' }, { year: 2029, riskScore: 18, label: '+5yr' }],
    confidenceScore: 80,
    contextTags: ['emerging-role', 'ai-native', 'creative-sector', 'frontier-skill', 'spatial-computing'],
    evolutionHorizon: '2030',
    roleCategory: 'ai_native',
  },
};
