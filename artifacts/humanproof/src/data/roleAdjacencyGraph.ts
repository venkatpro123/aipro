/**
 * roleAdjacencyGraph.ts — v12.0
 *
 * Static adjacency graph for role transition modeling.
 *
 * Each node represents a canonical role oracle key. Edges represent
 * transitions with: overlap percentage (skills shared), transition weeks
 * (time to qualify), and skill gaps (what needs to be added).
 *
 * This is the data layer for roleAdjacencyEngine.ts.
 *
 * Source: Industry job posting analysis + O*NET skill similarity data (2024).
 * UNCALIBRATED — transition times are developer estimates, not empirical.
 */

export interface AdjacencyEdge {
  targetKey: string;
  targetLabel: string;
  /** % of current role's skills that transfer directly */
  overlapPercent: number;
  /** Weeks of focused upskilling needed to be job-market ready */
  transitionWeeks: number;
  /** Specific skills to add (not replace) */
  skillGapsRequired: string[];
  /** Market demand index for target role (0–100, higher = more open roles) */
  marketDemandScore: number;
  /** Estimated score at target role (lower = safer) */
  estimatedTargetScore: number;
}

export interface RoleAdjacencyNode {
  key: string;
  label: string;
  category: string;
  edges: AdjacencyEdge[];
}

export const ROLE_ADJACENCY_GRAPH: Record<string, RoleAdjacencyNode> = {
  // ── Software Engineering ─────────────────────────────────────────────────────
  software_engineer: {
    key: 'software_engineer', label: 'Software Engineer', category: 'engineering',
    edges: [
      { targetKey: 'ai_ml_engineer', targetLabel: 'AI/ML Engineer', overlapPercent: 60, transitionWeeks: 16, skillGapsRequired: ['Python ML libraries (PyTorch/JAX)', 'Model evaluation + fine-tuning', 'ML ops (MLflow/W&B)'], marketDemandScore: 92, estimatedTargetScore: 38 },
      { targetKey: 'platform_engineer', targetLabel: 'Platform/SRE Engineer', overlapPercent: 70, transitionWeeks: 10, skillGapsRequired: ['Kubernetes / Helm', 'Terraform / Pulumi', 'Observability stack (Datadog/Grafana)'], marketDemandScore: 88, estimatedTargetScore: 32 },
      { targetKey: 'security_engineer', targetLabel: 'Security Engineer', overlapPercent: 55, transitionWeeks: 14, skillGapsRequired: ['OWASP top-10 mitigations', 'Threat modeling', 'Pen testing fundamentals (CEH or OSCP)'], marketDemandScore: 85, estimatedTargetScore: 28 },
      { targetKey: 'prompt_engineer', targetLabel: 'Prompt Engineer / AI Integration', overlapPercent: 75, transitionWeeks: 6, skillGapsRequired: ['LLM prompt patterns', 'Claude / OpenAI API', 'RAG pipeline basics'], marketDemandScore: 78, estimatedTargetScore: 35 },
      { targetKey: 'technical_pm', targetLabel: 'Technical Product Manager', overlapPercent: 45, transitionWeeks: 20, skillGapsRequired: ['PRD writing', 'User research methods', 'Roadmap prioritization frameworks'], marketDemandScore: 72, estimatedTargetScore: 40 },
    ],
  },

  frontend_engineer: {
    key: 'frontend_engineer', label: 'Frontend Engineer', category: 'engineering',
    edges: [
      { targetKey: 'prompt_engineer', targetLabel: 'Prompt Engineer / AI Integration', overlapPercent: 70, transitionWeeks: 6, skillGapsRequired: ['LLM API integration (Claude, GPT-4)', 'Streaming UI patterns', 'AI UX principles'], marketDemandScore: 78, estimatedTargetScore: 35 },
      { targetKey: 'design_engineer', targetLabel: 'Design Engineer', overlapPercent: 80, transitionWeeks: 8, skillGapsRequired: ['Design system contribution', 'Figma → code workflow', 'Accessibility audit tooling'], marketDemandScore: 68, estimatedTargetScore: 38 },
      { targetKey: 'full_stack_engineer', targetLabel: 'Full-Stack Engineer', overlapPercent: 65, transitionWeeks: 10, skillGapsRequired: ['Node.js / Deno server-side', 'Database fundamentals (SQL + NoSQL)', 'REST/GraphQL API design'], marketDemandScore: 85, estimatedTargetScore: 36 },
    ],
  },

  backend_engineer: {
    key: 'backend_engineer', label: 'Backend Engineer', category: 'engineering',
    edges: [
      { targetKey: 'platform_engineer', targetLabel: 'Platform/SRE Engineer', overlapPercent: 68, transitionWeeks: 12, skillGapsRequired: ['Kubernetes operations', 'CI/CD pipeline design', 'On-call + incident response'], marketDemandScore: 88, estimatedTargetScore: 32 },
      { targetKey: 'ai_ml_engineer', targetLabel: 'AI/ML Engineer', overlapPercent: 58, transitionWeeks: 16, skillGapsRequired: ['ML fundamentals (supervised/unsupervised)', 'Data pipeline construction', 'Vector databases'], marketDemandScore: 92, estimatedTargetScore: 38 },
      { targetKey: 'security_engineer', targetLabel: 'Security Engineer', overlapPercent: 60, transitionWeeks: 14, skillGapsRequired: ['API security patterns', 'Auth systems (OAuth2, SAML)', 'Security scanning tools'], marketDemandScore: 85, estimatedTargetScore: 28 },
    ],
  },

  // ── AI / ML ──────────────────────────────────────────────────────────────────
  ai_ml_engineer: {
    key: 'ai_ml_engineer', label: 'AI/ML Engineer', category: 'ai',
    edges: [
      { targetKey: 'research_engineer', targetLabel: 'Research Engineer', overlapPercent: 72, transitionWeeks: 12, skillGapsRequired: ['Academic paper reading/replication', 'Experiment design', 'Research infrastructure'], marketDemandScore: 82, estimatedTargetScore: 28 },
      { targetKey: 'ai_product_manager', targetLabel: 'AI Product Manager', overlapPercent: 50, transitionWeeks: 14, skillGapsRequired: ['Product discovery methods', 'Stakeholder communication', 'AI capability/limitation framing for non-technical audiences'], marketDemandScore: 76, estimatedTargetScore: 36 },
      { targetKey: 'data_scientist', targetLabel: 'Data Scientist', overlapPercent: 75, transitionWeeks: 8, skillGapsRequired: ['Causal inference methods', 'Experiment design (A/B testing)', 'Business analytics framing'], marketDemandScore: 80, estimatedTargetScore: 40 },
    ],
  },

  prompt_engineer: {
    key: 'prompt_engineer', label: 'Prompt Engineer', category: 'ai',
    edges: [
      { targetKey: 'ai_product_manager', targetLabel: 'AI Product Manager', overlapPercent: 65, transitionWeeks: 12, skillGapsRequired: ['Product roadmap frameworks', 'User research', 'Metrics definition'], marketDemandScore: 76, estimatedTargetScore: 36 },
      { targetKey: 'ai_ml_engineer', targetLabel: 'AI/ML Engineer', overlapPercent: 55, transitionWeeks: 14, skillGapsRequired: ['Python ML stack', 'Fine-tuning workflows', 'Evaluation harness design'], marketDemandScore: 92, estimatedTargetScore: 38 },
    ],
  },

  // ── Data ─────────────────────────────────────────────────────────────────────
  data_analyst: {
    key: 'data_analyst', label: 'Data Analyst', category: 'data',
    edges: [
      { targetKey: 'data_scientist', targetLabel: 'Data Scientist', overlapPercent: 65, transitionWeeks: 16, skillGapsRequired: ['Python (pandas + sklearn)', 'Statistical modeling', 'ML experiment pipelines'], marketDemandScore: 80, estimatedTargetScore: 40 },
      { targetKey: 'analytics_engineer', targetLabel: 'Analytics Engineer', overlapPercent: 72, transitionWeeks: 10, skillGapsRequired: ['dbt fundamentals', 'Data modeling patterns (star schema)', 'Version-controlled SQL'], marketDemandScore: 78, estimatedTargetScore: 38 },
      { targetKey: 'product_analyst', targetLabel: 'Product Analyst', overlapPercent: 80, transitionWeeks: 6, skillGapsRequired: ['A/B testing design', 'Product metrics frameworks (north star, HEART)', 'Cohort analysis'], marketDemandScore: 74, estimatedTargetScore: 42 },
    ],
  },

  data_scientist: {
    key: 'data_scientist', label: 'Data Scientist', category: 'data',
    edges: [
      { targetKey: 'ai_ml_engineer', targetLabel: 'AI/ML Engineer', overlapPercent: 72, transitionWeeks: 12, skillGapsRequired: ['MLOps stack (MLflow, Kubeflow)', 'Production deployment patterns', 'LLM fine-tuning'], marketDemandScore: 92, estimatedTargetScore: 38 },
      { targetKey: 'analytics_engineer', targetLabel: 'Analytics Engineer', overlapPercent: 68, transitionWeeks: 8, skillGapsRequired: ['dbt + data warehousing', 'CI for data pipelines', 'Data contracts'], marketDemandScore: 78, estimatedTargetScore: 38 },
    ],
  },

  // ── Product ──────────────────────────────────────────────────────────────────
  product_manager: {
    key: 'product_manager', label: 'Product Manager', category: 'product',
    edges: [
      { targetKey: 'ai_product_manager', targetLabel: 'AI Product Manager', overlapPercent: 78, transitionWeeks: 8, skillGapsRequired: ['LLM capability assessment', 'AI product failure modes', 'Responsible AI product principles'], marketDemandScore: 76, estimatedTargetScore: 36 },
      { targetKey: 'product_operations', targetLabel: 'Product Operations', overlapPercent: 70, transitionWeeks: 6, skillGapsRequired: ['Tool configuration (Jira, Linear, Amplitude)', 'Process documentation', 'Tooling ROI analysis'], marketDemandScore: 65, estimatedTargetScore: 44 },
    ],
  },

  ai_product_manager: {
    key: 'ai_product_manager', label: 'AI Product Manager', category: 'product',
    edges: [
      { targetKey: 'product_manager', targetLabel: 'Product Manager (Platform)', overlapPercent: 80, transitionWeeks: 4, skillGapsRequired: ['Platform-specific domain knowledge'], marketDemandScore: 72, estimatedTargetScore: 40 },
      { targetKey: 'ai_ml_engineer', targetLabel: 'AI/ML Engineer (bridge)', overlapPercent: 45, transitionWeeks: 20, skillGapsRequired: ['Python coding proficiency', 'ML fundamentals', 'Model evaluation'], marketDemandScore: 92, estimatedTargetScore: 38 },
    ],
  },

  // ── Design ───────────────────────────────────────────────────────────────────
  ux_designer: {
    key: 'ux_designer', label: 'UX Designer', category: 'design',
    edges: [
      { targetKey: 'design_engineer', targetLabel: 'Design Engineer', overlapPercent: 60, transitionWeeks: 12, skillGapsRequired: ['React / component library building', 'CSS-in-JS and design tokens', 'Storybook'], marketDemandScore: 68, estimatedTargetScore: 38 },
      { targetKey: 'product_manager', targetLabel: 'Product Manager', overlapPercent: 55, transitionWeeks: 16, skillGapsRequired: ['Metrics definition', 'Technical feasibility assessment', 'Roadmap prioritization'], marketDemandScore: 72, estimatedTargetScore: 40 },
      { targetKey: 'ai_ux_researcher', targetLabel: 'AI UX Researcher', overlapPercent: 72, transitionWeeks: 8, skillGapsRequired: ['LLM interaction patterns', 'AI output evaluation', 'Conversational UX principles'], marketDemandScore: 70, estimatedTargetScore: 36 },
    ],
  },

  // ── Infrastructure / Security ────────────────────────────────────────────────
  platform_engineer: {
    key: 'platform_engineer', label: 'Platform/SRE Engineer', category: 'infrastructure',
    edges: [
      { targetKey: 'security_engineer', targetLabel: 'Security Engineer', overlapPercent: 60, transitionWeeks: 12, skillGapsRequired: ['Cloud security posture management', 'SIEM/SOAR tooling', 'Vulnerability management'], marketDemandScore: 85, estimatedTargetScore: 28 },
      { targetKey: 'software_architect', targetLabel: 'Software Architect', overlapPercent: 65, transitionWeeks: 14, skillGapsRequired: ['System design documentation', 'Architecture decision records (ADRs)', 'Cross-team technical leadership'], marketDemandScore: 72, estimatedTargetScore: 28 },
    ],
  },

  security_engineer: {
    key: 'security_engineer', label: 'Security Engineer', category: 'infrastructure',
    edges: [
      { targetKey: 'grc_analyst', targetLabel: 'GRC / Compliance Analyst', overlapPercent: 55, transitionWeeks: 10, skillGapsRequired: ['ISO 27001 / SOC 2 controls', 'Risk register management', 'Audit facilitation'], marketDemandScore: 75, estimatedTargetScore: 32 },
      { targetKey: 'platform_engineer', targetLabel: 'Platform Engineer (Security focus)', overlapPercent: 68, transitionWeeks: 10, skillGapsRequired: ['Kubernetes security hardening', 'Cloud IAM design', 'Supply chain security (SBOM)'], marketDemandScore: 88, estimatedTargetScore: 32 },
    ],
  },

  // ── QA / Testing ─────────────────────────────────────────────────────────────
  qa_engineer: {
    key: 'qa_engineer', label: 'QA Engineer', category: 'qa',
    edges: [
      { targetKey: 'software_engineer', targetLabel: 'Software Engineer (SDiT)', overlapPercent: 55, transitionWeeks: 18, skillGapsRequired: ['Full-stack development (beyond test code)', 'System design patterns', 'Production debugging'], marketDemandScore: 88, estimatedTargetScore: 45 },
      { targetKey: 'platform_engineer', targetLabel: 'Platform/Quality Reliability', overlapPercent: 60, transitionWeeks: 14, skillGapsRequired: ['Chaos engineering (LitmusChaos)', 'Observability stack', 'CI/CD pipeline ownership'], marketDemandScore: 88, estimatedTargetScore: 38 },
      { targetKey: 'ai_qa_engineer', targetLabel: 'AI QA / Evals Engineer', overlapPercent: 72, transitionWeeks: 8, skillGapsRequired: ['LLM evaluation harness (Braintrust, Evals SDK)', 'Prompt regression testing', 'AI output taxonomy'], marketDemandScore: 80, estimatedTargetScore: 36 },
    ],
  },

  // ── Sales / Marketing ────────────────────────────────────────────────────────
  sales_executive: {
    key: 'sales_executive', label: 'Account Executive', category: 'sales',
    edges: [
      { targetKey: 'solutions_engineer', targetLabel: 'Solutions/Sales Engineer', overlapPercent: 55, transitionWeeks: 16, skillGapsRequired: ['Technical product depth', 'Demo environment management', 'Integration / API basics'], marketDemandScore: 76, estimatedTargetScore: 38 },
      { targetKey: 'customer_success', targetLabel: 'Customer Success Manager', overlapPercent: 72, transitionWeeks: 6, skillGapsRequired: ['QBR frameworks', 'Renewal motion playbooks', 'Health scoring methodologies'], marketDemandScore: 68, estimatedTargetScore: 45 },
    ],
  },

  marketing_manager: {
    key: 'marketing_manager', label: 'Marketing Manager', category: 'marketing',
    edges: [
      { targetKey: 'product_marketing', targetLabel: 'Product Marketing Manager', overlapPercent: 68, transitionWeeks: 8, skillGapsRequired: ['Competitive positioning frameworks', 'Launch playbook design', 'Win/loss analysis'], marketDemandScore: 70, estimatedTargetScore: 44 },
      { targetKey: 'growth_analyst', targetLabel: 'Growth Analyst', overlapPercent: 58, transitionWeeks: 12, skillGapsRequired: ['SQL for marketing data', 'Attribution modeling', 'Experimentation statistics'], marketDemandScore: 72, estimatedTargetScore: 42 },
    ],
  },

  // ── Finance / Legal ──────────────────────────────────────────────────────────
  financial_analyst: {
    key: 'financial_analyst', label: 'Financial Analyst', category: 'finance',
    edges: [
      { targetKey: 'fp_a_analyst', targetLabel: 'FP&A Analyst', overlapPercent: 80, transitionWeeks: 6, skillGapsRequired: ['Variance analysis presentation', 'Board-level financial storytelling', 'Rolling forecast models'], marketDemandScore: 70, estimatedTargetScore: 42 },
      { targetKey: 'data_analyst', targetLabel: 'Data Analyst (Finance)', overlapPercent: 65, transitionWeeks: 10, skillGapsRequired: ['SQL proficiency', 'BI tools (Tableau/Looker)', 'Python for financial analysis'], marketDemandScore: 78, estimatedTargetScore: 40 },
    ],
  },

  // ── HR / People Ops ──────────────────────────────────────────────────────────
  hr_recruiter: {
    key: 'hr_recruiter', label: 'HR / Recruiter', category: 'hr',
    edges: [
      { targetKey: 'people_ops', targetLabel: 'People Operations Manager', overlapPercent: 65, transitionWeeks: 8, skillGapsRequired: ['HRIS system ownership (Workday/BambooHR)', 'Compensation benchmarking', 'People analytics basics'], marketDemandScore: 62, estimatedTargetScore: 50 },
      { targetKey: 'project_manager', targetLabel: 'Project Manager', overlapPercent: 55, transitionWeeks: 12, skillGapsRequired: ['PMP or CAPM certification', 'Risk register management', 'Gantt / dependency tracking'], marketDemandScore: 68, estimatedTargetScore: 48 },
    ],
  },

  // ── Generic fallback ─────────────────────────────────────────────────────────
  generic: {
    key: 'generic', label: 'Professional', category: 'general',
    edges: [
      { targetKey: 'project_manager', targetLabel: 'Project Manager', overlapPercent: 50, transitionWeeks: 12, skillGapsRequired: ['PMP fundamentals', 'Risk and dependency management', 'Stakeholder reporting'], marketDemandScore: 68, estimatedTargetScore: 48 },
      { targetKey: 'product_operations', targetLabel: 'Product Operations', overlapPercent: 55, transitionWeeks: 10, skillGapsRequired: ['Tool configuration and automation', 'Process documentation', 'Cross-functional coordination'], marketDemandScore: 65, estimatedTargetScore: 44 },
    ],
  },
};

/**
 * Fuzzy-match an oracle key to the nearest graph node.
 * Returns the exact key if found; otherwise tries substring/partial matches;
 * falls back to 'generic'.
 */
export function findNearestAdjacencyKey(oracleKey: string): string {
  if (ROLE_ADJACENCY_GRAPH[oracleKey]) return oracleKey;

  const lower = oracleKey.toLowerCase();
  const keys = Object.keys(ROLE_ADJACENCY_GRAPH);

  // Try direct substring matches
  for (const key of keys) {
    if (lower.includes(key.replace(/_/g, ' ')) || key.replace(/_/g, ' ').includes(lower)) {
      return key;
    }
  }

  // Category-level fuzzy matching
  if (/\b(ml|machine.?learning|deep.?learning|model)\b/i.test(lower)) return 'ai_ml_engineer';
  if (/\b(prompt|llm|genai|openai|anthropic|langchain)\b/i.test(lower)) return 'prompt_engineer';
  if (/\b(sre|devops|infra|platform|cloud.ops|site.reliability)\b/i.test(lower)) return 'platform_engineer';
  if (/\b(security|appsec|infosec|pentest|soc)\b/i.test(lower)) return 'security_engineer';
  if (/\b(qa|quality|test|automation.?test)\b/i.test(lower)) return 'qa_engineer';
  if (/\b(data.?sci|research.?sci|statistician)\b/i.test(lower)) return 'data_scientist';
  if (/\b(data.?analyst|bi.?analyst|analytics)\b/i.test(lower)) return 'data_analyst';
  if (/\b(product.?man|pm|product.?own)\b/i.test(lower)) return 'product_manager';
  if (/\b(frontend|react|vue|angular|ui.dev)\b/i.test(lower)) return 'frontend_engineer';
  if (/\b(backend|api|server.?side|microservice)\b/i.test(lower)) return 'backend_engineer';
  if (/\b(software|swe|dev|engineer)\b/i.test(lower)) return 'software_engineer';
  if (/\b(ux|design|ui.ux|designer)\b/i.test(lower)) return 'ux_designer';
  if (/\b(financial|finance|analyst)\b/i.test(lower)) return 'financial_analyst';
  if (/\b(hr|recruit|talent|people.ops)\b/i.test(lower)) return 'hr_recruiter';
  if (/\b(sales|ae|account.exec|bdr|sdr)\b/i.test(lower)) return 'sales_executive';
  if (/\b(market|campaign|seo|content)\b/i.test(lower)) return 'marketing_manager';

  return 'generic';
}
