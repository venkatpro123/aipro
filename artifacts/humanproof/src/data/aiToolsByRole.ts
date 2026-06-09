// aiToolsByRole.ts — curated AI amplification tools per role family (Rule 14)
// Static lookup: 30 role families × 5 tools each.
// Used by AIAmplificationRoadmap and AIAmplificationWidget.

export type RoleFamily =
  | 'software' | 'data' | 'product' | 'marketing' | 'finance' | 'hr'
  | 'sales' | 'operations' | 'healthcare' | 'legal' | 'design' | 'education'
  | 'accounting' | 'cybersecurity' | 'cloud' | 'research' | 'supply_chain'
  | 'real_estate' | 'media' | 'customer_success' | 'default';

export interface AITool {
  name: string;
  useCase: string;
  timeImpact: string;
  aiReadinessBoost: number;       // 0–20 — pts added to AI readiness score
  category: 'automation' | 'amplification' | 'research' | 'creation';
}

export const AI_TOOLS_BY_ROLE: Record<RoleFamily, AITool[]> = {
  software: [
    { name: 'GitHub Copilot',     useCase: 'Autocomplete, boilerplate, unit tests — skip the repetitive 40%', timeImpact: '2–4 hrs/day saved', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Cursor IDE',         useCase: 'AI-native IDE — refactor, debug, explain unfamiliar codebases',    timeImpact: '30–50% faster refactors', aiReadinessBoost: 16, category: 'amplification' },
    { name: 'Claude / GPT-4',    useCase: 'Code review, PR descriptions, architecture trade-off analysis',     timeImpact: 'Ship cleaner code faster', aiReadinessBoost: 14, category: 'amplification' },
    { name: 'Codeium',            useCase: 'Free Copilot alternative with multi-language context',             timeImpact: '1–2 hrs/day saved', aiReadinessBoost: 12, category: 'automation' },
    { name: 'Warp Terminal',      useCase: 'AI-powered terminal — explain errors, suggest commands',           timeImpact: 'Cut debug time 40%', aiReadinessBoost: 10, category: 'amplification' },
  ],
  data: [
    { name: 'Julius AI',         useCase: 'Natural language → data analysis, charts, SQL — cut query time 70%', timeImpact: '3 hrs/day back', aiReadinessBoost: 18, category: 'automation' },
    { name: 'NotebookLM',        useCase: 'Synthesize research papers, reports, internal docs in minutes',     timeImpact: 'Read 10× more content', aiReadinessBoost: 14, category: 'research' },
    { name: 'Claude / GPT-4',   useCase: 'Insight narratives, executive summaries, hypothesis generation',    timeImpact: 'Ship analyses 5× faster', aiReadinessBoost: 14, category: 'amplification' },
    { name: 'Hex AI',            useCase: 'AI-assisted notebook — SQL + Python with AI code completion',       timeImpact: '40% faster analysis', aiReadinessBoost: 12, category: 'amplification' },
    { name: 'Perplexity',        useCase: 'Real-time market and sector research with citations',               timeImpact: 'Stay ahead of domain shifts', aiReadinessBoost: 10, category: 'research' },
  ],
  product: [
    { name: 'Claude / GPT-4',   useCase: 'PRD drafts, user story generation, competitive analysis memos',     timeImpact: '10× faster documentation', aiReadinessBoost: 18, category: 'amplification' },
    { name: 'Perplexity',        useCase: 'Real-time competitor and user research with cited sources',         timeImpact: 'Better-informed decisions', aiReadinessBoost: 14, category: 'research' },
    { name: 'Notion AI',         useCase: 'Roadmap synthesis, stakeholder update drafting, meeting notes',     timeImpact: 'Reclaim 5+ hrs/week', aiReadinessBoost: 12, category: 'automation' },
    { name: 'Dovetail AI',       useCase: 'Auto-tag user research themes, generate insight summaries',         timeImpact: '3× faster synthesis', aiReadinessBoost: 12, category: 'automation' },
    { name: 'Aha! Roadmaps AI',  useCase: 'AI-assisted roadmap prioritization and strategy documentation',    timeImpact: 'Align stakeholders faster', aiReadinessBoost: 8, category: 'amplification' },
  ],
  marketing: [
    { name: 'Claude / GPT-4',   useCase: 'Content strategy, copy variants, A/B test ideas at scale',         timeImpact: '10× content throughput', aiReadinessBoost: 18, category: 'creation' },
    { name: 'Perplexity',        useCase: 'Competitor and trend research in real-time with citations',         timeImpact: 'Stay ahead of shifts', aiReadinessBoost: 14, category: 'research' },
    { name: 'Midjourney / DALL·E', useCase: 'Visual content creation — no designer dependency',              timeImpact: 'Launch campaigns faster', aiReadinessBoost: 14, category: 'creation' },
    { name: 'Runway ML',         useCase: 'AI video editing and generation for content teams',                timeImpact: 'Video production at 5× speed', aiReadinessBoost: 12, category: 'creation' },
    { name: 'HubSpot AI',        useCase: 'Personalized email sequences, SEO content briefing',              timeImpact: '30% lift in open rates', aiReadinessBoost: 10, category: 'automation' },
  ],
  finance: [
    { name: 'Claude / GPT-4',   useCase: 'Financial model explanations, earnings call summaries, memos',     timeImpact: 'Communicate insights faster', aiReadinessBoost: 18, category: 'amplification' },
    { name: 'Julius AI',         useCase: 'Automate Excel/Python analysis with natural language',             timeImpact: 'Cut model build time 60%', aiReadinessBoost: 16, category: 'automation' },
    { name: 'Perplexity',        useCase: 'Earnings call synthesis, sector news, M&A intelligence',           timeImpact: 'Broader coverage, same hours', aiReadinessBoost: 12, category: 'research' },
    { name: 'Visible Alpha',     useCase: 'AI consensus estimates and scenario analysis visualization',       timeImpact: 'Better fundamental analysis', aiReadinessBoost: 10, category: 'amplification' },
    { name: 'Copilot in Excel',  useCase: 'Formula generation, pivot analysis, anomaly detection',           timeImpact: '1–2 hrs/day saved', aiReadinessBoost: 10, category: 'automation' },
  ],
  hr: [
    { name: 'Claude / GPT-4',   useCase: 'Job descriptions, performance review drafts, policy summaries',    timeImpact: '3× faster documentation', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Beamery AI',        useCase: 'AI-driven talent acquisition and matching',                        timeImpact: '40% faster screening', aiReadinessBoost: 14, category: 'automation' },
    { name: 'Lattice AI',        useCase: 'Performance review assistance and sentiment analysis',             timeImpact: 'Reduce review cycle time', aiReadinessBoost: 12, category: 'amplification' },
    { name: 'Notion AI',         useCase: 'Policy documentation, onboarding guides, meeting summaries',      timeImpact: 'Standardize docs 5× faster', aiReadinessBoost: 10, category: 'automation' },
    { name: 'Glean',             useCase: 'Enterprise search — find people, docs, policies instantly',       timeImpact: 'Eliminate 30min/day search', aiReadinessBoost: 8, category: 'amplification' },
  ],
  sales: [
    { name: 'Claude / GPT-4',   useCase: 'Personalized outreach, proposal drafting, objection handling',     timeImpact: 'Response rate +30%', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Gong AI',           useCase: 'Call analysis, coaching insights, deal risk signals',              timeImpact: 'Improve close rate', aiReadinessBoost: 16, category: 'amplification' },
    { name: 'Apollo AI',         useCase: 'AI-powered prospecting and sequence automation',                   timeImpact: '3× more pipeline', aiReadinessBoost: 14, category: 'automation' },
    { name: 'Perplexity',        useCase: 'Pre-call research on prospects and competitors in minutes',        timeImpact: 'Walk in 10× more prepared', aiReadinessBoost: 10, category: 'research' },
    { name: 'Lavender',          useCase: 'AI email coach — real-time suggestions for cold outreach',        timeImpact: 'Cut outreach time 50%', aiReadinessBoost: 10, category: 'automation' },
  ],
  operations: [
    { name: 'Claude / GPT-4',   useCase: 'SOP writing, process documentation, incident RCAs',                timeImpact: 'Documentation 10× faster', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Zapier AI',         useCase: 'No-code automation of repetitive cross-tool workflows',            timeImpact: 'Automate 5 hrs/week', aiReadinessBoost: 16, category: 'automation' },
    { name: 'Notion AI',         useCase: 'Runbook generation, knowledge base maintenance',                   timeImpact: 'Cut onboarding time 40%', aiReadinessBoost: 12, category: 'automation' },
    { name: 'Perplexity',        useCase: 'Vendor research, benchmarking, process best-practices',           timeImpact: 'Better-informed decisions', aiReadinessBoost: 10, category: 'research' },
    { name: 'Tableau Pulse AI',  useCase: 'Natural language business intelligence and anomaly alerts',       timeImpact: 'Spot issues before they escalate', aiReadinessBoost: 10, category: 'amplification' },
  ],
  healthcare: [
    { name: 'Nuance DAX',        useCase: 'AI ambient clinical documentation — dictation and note-drafting', timeImpact: '45% less documentation time', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Claude / GPT-4',   useCase: 'Research synthesis, patient communication drafting, admin',        timeImpact: '2 hrs/day saved', aiReadinessBoost: 14, category: 'automation' },
    { name: 'Viz.ai',            useCase: 'AI-assisted imaging triage and time-sensitive alerts',             timeImpact: 'Faster critical findings', aiReadinessBoost: 12, category: 'amplification' },
    { name: 'Abridge',           useCase: 'Clinical conversation summarization for EHR documentation',       timeImpact: 'Cut charting time 50%', aiReadinessBoost: 12, category: 'automation' },
    { name: 'NotebookLM',        useCase: 'Synthesize clinical guidelines, research papers at speed',        timeImpact: 'Stay current 10× faster', aiReadinessBoost: 10, category: 'research' },
  ],
  legal: [
    { name: 'Harvey AI',         useCase: 'Legal research, contract analysis, due diligence automation',     timeImpact: '50% faster research', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Claude / GPT-4',   useCase: 'Contract drafting, memo writing, client communication',            timeImpact: '5× faster first drafts', aiReadinessBoost: 16, category: 'creation' },
    { name: 'Casetext CoCounsel', useCase: 'AI legal research assistant with citation accuracy',             timeImpact: 'Cut research time 60%', aiReadinessBoost: 14, category: 'research' },
    { name: 'Luminance',         useCase: 'AI-powered contract review and comparison at scale',              timeImpact: '80% faster contract review', aiReadinessBoost: 12, category: 'automation' },
    { name: 'Perplexity',        useCase: 'Regulatory news and case law monitoring with citations',          timeImpact: 'Stay current with less effort', aiReadinessBoost: 10, category: 'research' },
  ],
  design: [
    { name: 'Midjourney',        useCase: 'Concept art, mood boards, visual exploration in minutes',         timeImpact: '10× faster ideation', aiReadinessBoost: 18, category: 'creation' },
    { name: 'Figma AI',          useCase: 'Auto-layout suggestions, component generation, accessibility',    timeImpact: '30% faster UI production', aiReadinessBoost: 16, category: 'automation' },
    { name: 'Adobe Firefly',     useCase: 'Generative fill, background removal, style transfer',             timeImpact: 'Cut production time 50%', aiReadinessBoost: 14, category: 'creation' },
    { name: 'Framer AI',         useCase: 'AI-generated web components and interactions from prompts',       timeImpact: 'Prototype 5× faster', aiReadinessBoost: 12, category: 'creation' },
    { name: 'Claude / GPT-4',   useCase: 'UX copy, user story generation, design brief writing',            timeImpact: 'Focus more on design, less writing', aiReadinessBoost: 10, category: 'amplification' },
  ],
  education: [
    { name: 'Claude / GPT-4',   useCase: 'Lesson planning, rubric generation, personalized feedback drafts', timeImpact: '3 hrs/week saved on admin', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Khanmigo',          useCase: 'AI tutoring system — delegate Socratic coaching to AI',           timeImpact: 'Scale 1:1 support', aiReadinessBoost: 14, category: 'amplification' },
    { name: 'NotebookLM',        useCase: 'Synthesize textbooks, papers, curriculum docs instantly',         timeImpact: 'Curriculum prep 5× faster', aiReadinessBoost: 12, category: 'research' },
    { name: 'MagicSchool AI',    useCase: 'AI tools for educators: IEPs, differentiation, parent comms',    timeImpact: 'Admin time cut 50%', aiReadinessBoost: 12, category: 'automation' },
    { name: 'Perplexity',        useCase: 'Current events, research, fact-checking with citations',          timeImpact: 'Better-sourced lessons', aiReadinessBoost: 8, category: 'research' },
  ],
  accounting: [
    { name: 'Claude / GPT-4',   useCase: 'Financial narrative drafting, memo writing, client emails',       timeImpact: '4× faster written work', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Copilot in Excel',  useCase: 'Formula generation, reconciliation checks, anomaly detection',    timeImpact: '2 hrs/day saved', aiReadinessBoost: 16, category: 'automation' },
    { name: 'TaxJar AI',         useCase: 'Automated compliance monitoring and filing preparation',           timeImpact: 'Cut compliance risk', aiReadinessBoost: 12, category: 'automation' },
    { name: 'Perplexity',        useCase: 'Tax code changes, regulatory updates with source citations',      timeImpact: 'Stay current without hours of reading', aiReadinessBoost: 10, category: 'research' },
    { name: 'Glean',             useCase: 'Find documents, policies, prior client work instantly',           timeImpact: 'Eliminate search overhead', aiReadinessBoost: 8, category: 'amplification' },
  ],
  cybersecurity: [
    { name: 'Claude / GPT-4',   useCase: 'Threat report writing, policy documentation, incident RCAs',      timeImpact: '3× faster reporting', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Microsoft Copilot for Security', useCase: 'AI-assisted threat investigation and alert triage', timeImpact: '40% faster incident response', aiReadinessBoost: 18, category: 'amplification' },
    { name: 'Darktrace AI',      useCase: 'Autonomous threat detection and response in your environment',    timeImpact: 'Catch what humans miss', aiReadinessBoost: 14, category: 'amplification' },
    { name: 'Perplexity',        useCase: 'CVE research, threat intelligence, vendor security news',         timeImpact: 'Stay ahead of threats', aiReadinessBoost: 10, category: 'research' },
    { name: 'GitHub Copilot',    useCase: 'Secure code suggestions, SAST-aware completions',                timeImpact: 'Reduce vulnerabilities in dev', aiReadinessBoost: 10, category: 'amplification' },
  ],
  cloud: [
    { name: 'GitHub Copilot',    useCase: 'IaC templates, config generation, pipeline scripts',              timeImpact: '50% faster infrastructure code', aiReadinessBoost: 18, category: 'automation' },
    { name: 'AWS Bedrock / Azure AI', useCase: 'Build and deploy AI workloads on your existing cloud stack', timeImpact: 'Own the AI platform layer', aiReadinessBoost: 16, category: 'amplification' },
    { name: 'Warp Terminal',     useCase: 'AI-powered CLI — explain commands, debug output, suggest fixes',  timeImpact: 'Cut debugging time 40%', aiReadinessBoost: 14, category: 'amplification' },
    { name: 'Claude / GPT-4',   useCase: 'Architecture decisions, runbook writing, incident post-mortems',  timeImpact: 'Documentation 10× faster', aiReadinessBoost: 12, category: 'automation' },
    { name: 'Pulumi AI',         useCase: 'Natural language → infrastructure as code generation',            timeImpact: 'Provision 3× faster', aiReadinessBoost: 12, category: 'automation' },
  ],
  research: [
    { name: 'NotebookLM',        useCase: 'Synthesize papers, reports, datasets — interactive Q&A over sources', timeImpact: 'Read 10× more content', aiReadinessBoost: 18, category: 'research' },
    { name: 'Perplexity',        useCase: 'Real-time literature review with source citations',                timeImpact: 'Cut search time 70%', aiReadinessBoost: 14, category: 'research' },
    { name: 'Claude / GPT-4',   useCase: 'Research synthesis, grant writing, technical writing assistance',  timeImpact: '5× faster first drafts', aiReadinessBoost: 14, category: 'creation' },
    { name: 'Elicit AI',         useCase: 'AI research assistant — find and summarize academic papers',      timeImpact: 'Literature review in hours', aiReadinessBoost: 12, category: 'research' },
    { name: 'Julius AI',         useCase: 'Data analysis with natural language — no code required',          timeImpact: 'Cut analysis time 60%', aiReadinessBoost: 10, category: 'automation' },
  ],
  supply_chain: [
    { name: 'Claude / GPT-4',   useCase: 'Supplier analysis, risk reports, procurement memos',              timeImpact: '3× faster reporting', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Llamasoft AI',      useCase: 'AI demand forecasting and supply chain simulation',               timeImpact: 'Better inventory decisions', aiReadinessBoost: 16, category: 'amplification' },
    { name: 'Perplexity',        useCase: 'Supplier news, commodity markets, geopolitical risk monitoring',  timeImpact: 'Spot risks before they hit', aiReadinessBoost: 12, category: 'research' },
    { name: 'Copilot in Excel',  useCase: 'Inventory analysis, cost modeling, scenario planning',            timeImpact: '2 hrs/day saved', aiReadinessBoost: 10, category: 'automation' },
    { name: 'Zapier AI',         useCase: 'Automate supplier communication and order updates',               timeImpact: 'Cut manual follow-up 60%', aiReadinessBoost: 8, category: 'automation' },
  ],
  real_estate: [
    { name: 'Claude / GPT-4',   useCase: 'Listing copy, offer letters, market analysis summaries',          timeImpact: '5× faster content creation', aiReadinessBoost: 18, category: 'creation' },
    { name: 'Perplexity',        useCase: 'Real-time market data, neighborhood trends, comp research',       timeImpact: 'Better-informed client advice', aiReadinessBoost: 14, category: 'research' },
    { name: 'Midjourney / DALL·E', useCase: 'Staging visualizations, exterior renders for listings',       timeImpact: 'Sell faster with better visuals', aiReadinessBoost: 12, category: 'creation' },
    { name: 'HubSpot AI',        useCase: 'Personalized follow-up sequences, pipeline management',          timeImpact: 'Close 30% more leads', aiReadinessBoost: 10, category: 'automation' },
    { name: 'Otter.ai',          useCase: 'Meeting transcription and client call summaries',                timeImpact: 'Never miss a client detail', aiReadinessBoost: 8, category: 'automation' },
  ],
  media: [
    { name: 'Claude / GPT-4',   useCase: 'Script drafts, article outlines, show notes, caption writing',   timeImpact: '10× content throughput', aiReadinessBoost: 18, category: 'creation' },
    { name: 'Runway ML',         useCase: 'AI video editing, background replacement, motion graphics',      timeImpact: 'Video production 5× faster', aiReadinessBoost: 16, category: 'creation' },
    { name: 'Descript',          useCase: 'Podcast editing via text — cut, splice, remove filler words',    timeImpact: 'Cut edit time 70%', aiReadinessBoost: 14, category: 'automation' },
    { name: 'ElevenLabs',        useCase: 'Voice cloning, multilingual narration, audio content scaling',   timeImpact: 'Expand reach without recording', aiReadinessBoost: 12, category: 'creation' },
    { name: 'Perplexity',        useCase: 'Research and fact-checking for content with live citations',     timeImpact: 'Better sourced content faster', aiReadinessBoost: 10, category: 'research' },
  ],
  customer_success: [
    { name: 'Claude / GPT-4',   useCase: 'Personalized check-in emails, QBR prep, success plans',          timeImpact: '5× faster customer comms', aiReadinessBoost: 18, category: 'automation' },
    { name: 'Gong AI',           useCase: 'Customer call analysis, risk signals, coaching insights',         timeImpact: 'Catch churn signals earlier', aiReadinessBoost: 16, category: 'amplification' },
    { name: 'Intercom AI',       useCase: 'AI-assisted support — deflect tickets, escalation routing',      timeImpact: '50% faster resolution', aiReadinessBoost: 12, category: 'automation' },
    { name: 'Notion AI',         useCase: 'Customer docs, playbooks, knowledge base maintenance',            timeImpact: 'Onboard customers 3× faster', aiReadinessBoost: 10, category: 'automation' },
    { name: 'Perplexity',        useCase: 'Research on customer industry trends to add strategic value',    timeImpact: 'Become a strategic partner', aiReadinessBoost: 8, category: 'research' },
  ],
  default: [
    { name: 'Claude / GPT-4',   useCase: 'Automate writing, summarization, and research tasks in your role', timeImpact: 'Reclaim 5–10 hrs/week', aiReadinessBoost: 18, category: 'amplification' },
    { name: 'Perplexity',        useCase: 'Real-time research with citations — replace 80% of search time',  timeImpact: 'Faster, better-sourced decisions', aiReadinessBoost: 14, category: 'research' },
    { name: 'NotebookLM',        useCase: 'Synthesize long documents, reports, and transcripts in minutes',  timeImpact: 'Read 10× more in the same time', aiReadinessBoost: 12, category: 'research' },
    { name: 'Notion AI',         useCase: 'Meeting notes, documentation, and process writing at speed',      timeImpact: 'Eliminate writing overhead', aiReadinessBoost: 10, category: 'automation' },
    { name: 'Zapier AI',         useCase: 'Automate repetitive cross-tool workflows without coding',         timeImpact: 'Save 3–5 hrs/week on manual tasks', aiReadinessBoost: 8, category: 'automation' },
  ],
};

/**
 * Detect role family from role title string.
 * Uses keyword matching — matches the pattern in AIAmplificationWidget.
 */
export function detectRoleFamily(roleTitle: string): RoleFamily {
  const r = roleTitle.toLowerCase();
  if (/engineer|dev|software|backend|frontend|fullstack|sre|devops|ml\b|ai\b|data.sci|architect/.test(r)) return 'software';
  if (/data|analyst|bi\b|analytics|scientist|etl|pipeline/.test(r)) return 'data';
  if (/product|pm\b|program manager|scrum/.test(r)) return 'product';
  if (/market|growth|content|brand|seo|demand|campaign/.test(r)) return 'marketing';
  if (/financ|fp&a|invest|banking|quant|capital|portfolio/.test(r)) return 'finance';
  if (/\bhr\b|human.res|people|talent|recruiting|compensation/.test(r)) return 'hr';
  if (/sales|account exec|ae\b|bdr|sdr|revenue|business dev/.test(r)) return 'sales';
  if (/operat|supply.chain|logistics|procurement|warehouse/.test(r)) return 'operations';
  if (/doctor|physician|nurse|clinical|medical|health|hospital/.test(r)) return 'healthcare';
  if (/legal|attorney|lawyer|paralegal|compliance|counsel/.test(r)) return 'legal';
  if (/design|ux|ui\b|creative|brand design|illustrat/.test(r)) return 'design';
  if (/teach|professor|instructor|educator|curriculum/.test(r)) return 'education';
  if (/account|bookkeep|cpa|auditor|tax/.test(r)) return 'accounting';
  if (/security|cyber|soc\b|pentest|infosec|devsecops/.test(r)) return 'cybersecurity';
  if (/cloud|devops|infra|sre\b|platform|kubernetes|aws|azure|gcp/.test(r)) return 'cloud';
  if (/research|scientist|r&d|lab|phd/.test(r)) return 'research';
  if (/supply|logistics|procurement|warehouse|distribution/.test(r)) return 'supply_chain';
  if (/real.estate|realt|broker|property/.test(r)) return 'real_estate';
  if (/media|journal|editor|producer|content|broadcast/.test(r)) return 'media';
  if (/customer.success|csm|account manag|client/.test(r)) return 'customer_success';
  return 'default';
}

/** Compute an AI readiness boost score (0–100) from the user's adopted tools */
export function computeAIReadinessBoost(adoptedToolNames: string[], roleFamily: RoleFamily): number {
  const tools = AI_TOOLS_BY_ROLE[roleFamily] ?? AI_TOOLS_BY_ROLE.default;
  const adopted = new Set(adoptedToolNames.map(t => t.toLowerCase()));
  return tools.reduce((sum, t) => (adopted.has(t.name.toLowerCase()) ? sum + t.aiReadinessBoost : sum), 0);
}
