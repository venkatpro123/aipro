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
  },
};
