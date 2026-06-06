// dynamicRoleIntelligence.ts — Deterministic dynamic role intelligence generator.
// Called when a user enters a free-text role not in the seeded database.
// No LLM call — 100% keyword + heuristic inference.

import type { CareerIntelligence, SafeSkill, SkillRisk, CareerPath } from '../data/intelligence/types';
import type { AutomationTimeline, TaskDetail, DriverNarrative } from '../data/automationTimelineData';
import { DANGER_SKILLS, SAFE_SKILLS, TRANSITION_RECS } from '../data/skillsData';
import { getCountryCluster } from '../data/intelligence/countryIntelligenceModifier';

export type RoleCategory =
  | 'traditional'
  | 'ai_augmented'
  | 'ai_native'
  | 'human_ai_orchestration'
  | 'emerging_unknown';

// ─── Keyword banks ────────────────────────────────────────────────────────────

const ORCHESTRATION_KEYWORDS = [
  'agent operations', 'ai governance', 'ai transformation', 'ai workforce',
  'human-ai', 'ai strategist', 'autonomous agent supervisor', 'ai operations manager',
  'ai ops manager', 'ai program manager', 'ai change', 'chief ai', 'caio',
  'ai transition', 'workforce strategist', 'ai coordinator',
];

const AI_NATIVE_KEYWORDS = [
  'prompt', 'llm', 'ai trainer', 'synthetic data', 'agent designer',
  'ai workflow', 'vibe cod', 'agentic', 'ai red team', 'adversarial ml',
  'robotics ai', 'spatial computing', 'digital human', 'climate ai',
  'carbon intelligence', 'ai architect', 'mlops', 'ml platform',
  'ai safety', 'ai ethics', 'responsible ai', 'ai product',
  'ai engineer', 'ai developer', 'ai researcher', 'genai', 'generative ai',
  'ai analyst', 'ai consultant', 'avatar', 'xr developer', 'ar developer',
  'vr developer', 'mixed reality',
];

const AUGMENTED_KEYWORDS = [
  'ai-assisted', 'ai-augmented', 'ai-enhanced', 'ai-first', 'ai assisted',
  'ai augmented', 'copilot', 'ai powered', 'machine learning enhanced',
];

// ─── Role family inference ────────────────────────────────────────────────────

const FAMILY_KEYWORD_MAP: [string[], string][] = [
  [['software', 'engineer', 'developer', 'coder', 'coding', 'fullstack', 'backend', 'frontend', 'swe', 'vibe cod'], 'swe'],
  [['data', 'analytics', 'analyst', 'business intelligence', 'bi', 'etl', 'pipeline'], 'data'],
  [['ml', 'machine learning', 'deep learning', 'neural', 'llm', 'nlp', 'ai researcher', 'mlops'], 'ml'],
  [['security', 'cybersecurity', 'infosec', 'soc', 'pen test', 'red team', 'blue team'], 'security'],
  [['devops', 'sre', 'cloud', 'infrastructure', 'kubernetes', 'terraform', 'platform engineer'], 'devops'],
  [['product manager', 'product management', 'product lead', 'pm ', 'ai product'], 'product'],
  [['design', 'ux', 'ui', 'user experience', 'user interface', 'figma', 'interaction design', 'human-ai'], 'design'],
  [['finance', 'financial', 'accounting', 'accountant', 'fp&a', 'controller', 'cfo', 'treasury'], 'finance'],
  [['marketing', 'content', 'seo', 'social media', 'brand', 'growth', 'demand generation'], 'marketing'],
  [['sales', 'account executive', 'account manager', 'business development', 'revenue', 'ae '], 'sales'],
  [['hr', 'human resources', 'recruiting', 'talent', 'people ops', 'workforce'], 'hr'],
  [['legal', 'lawyer', 'attorney', 'compliance', 'contract', 'paralegal', 'counsel'], 'legal'],
  [['healthcare', 'nurse', 'physician', 'doctor', 'clinical', 'medical', 'patient', 'hospital'], 'healthcare'],
  [['operations', 'ops', 'process', 'bpo', 'agent supervisor', 'operations manager'], 'operations'],
  [['consulting', 'consultant', 'strategy', 'transformation', 'advisory'], 'consulting'],
  [['supply chain', 'logistics', 'procurement', 'warehouse', 'inventory'], 'logistics'],
  [['education', 'teacher', 'trainer', 'instructor', 'curriculum'], 'education'],
  [['research', 'scientist', 'researcher', 'lab', 'r&d'], 'research'],
];

// ─── Core functions ───────────────────────────────────────────────────────────

export function classifyRoleCategory(title: string): RoleCategory {
  const lower = title.toLowerCase();
  if (ORCHESTRATION_KEYWORDS.some((k) => lower.includes(k))) return 'human_ai_orchestration';
  if (AI_NATIVE_KEYWORDS.some((k) => lower.includes(k)))       return 'ai_native';
  if (AUGMENTED_KEYWORDS.some((k) => lower.includes(k)))       return 'ai_augmented';
  return 'traditional';
}

export function inferRoleFamily(title: string, industryKey: string): string {
  const lower = title.toLowerCase();
  for (const [keywords, family] of FAMILY_KEYWORD_MAP) {
    if (keywords.some((k) => lower.includes(k))) return family;
  }
  // Industry-based fallback
  const industryFamilyMap: Record<string, string> = {
    it_software: 'swe', it_web: 'swe', it_mobile: 'swe',
    it_ai_ml: 'ml', it_cybersec: 'security', it_devops: 'devops',
    it_saas: 'product', finance: 'finance', fintech: 'finance',
    investment: 'finance', marketing: 'marketing', design: 'design',
    hr: 'hr', legal: 'legal', healthcare: 'healthcare', nursing: 'healthcare',
    bpo: 'operations', consulting: 'consulting', logistics: 'logistics',
    education: 'education', ai_infra: 'ml', ai_safety_gov: 'security',
    autonomous_sys: 'ml', spatial_xr: 'design', climate_ai: 'research',
  };
  return industryFamilyMap[industryKey] ?? 'operations';
}

// ─── Task profile generation ──────────────────────────────────────────────────

function buildDynamicTaskProfile(
  family: string,
  category: RoleCategory,
  d1: number,
): TaskDetail[] {
  const isHighRisk = d1 > 65;
  const isAiNative = category === 'ai_native' || category === 'human_ai_orchestration';

  const baseTasks: Record<string, TaskDetail[]> = {
    swe: [
      { name: 'Code generation and boilerplate authoring', taskType: 'core', risk2026: isAiNative ? 35 : 65, risk2028: isAiNative ? 50 : 78, risk2030: isAiNative ? 60 : 88, humanAdvantageScore: isAiNative ? 55 : 20, aiCapabilityTrend: 'Rapid', displacementTimeline: isAiNative ? '4–6 years' : '2–3 years', confidence: 'High' },
      { name: 'System architecture and design decisions', taskType: 'strategic', risk2026: 12, risk2028: 20, risk2030: 30, humanAdvantageScore: 88, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'High' },
      { name: 'Code review and quality assurance', taskType: 'decision-making', risk2026: 28, risk2028: 42, risk2030: 55, humanAdvantageScore: 65, aiCapabilityTrend: 'Moderate', displacementTimeline: '4–6 years', confidence: 'Medium' },
      { name: 'Stakeholder requirements translation', taskType: 'human-interaction', risk2026: 10, risk2028: 18, risk2030: 25, humanAdvantageScore: 90, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'High' },
      { name: 'Debugging and incident resolution', taskType: 'core', risk2026: 32, risk2028: 48, risk2030: 62, humanAdvantageScore: 60, aiCapabilityTrend: 'Rapid', displacementTimeline: '4–6 years', confidence: 'Medium' },
    ],
    data: [
      { name: 'Report generation and dashboard creation', taskType: 'core', risk2026: 60, risk2028: 78, risk2030: 88, humanAdvantageScore: 18, aiCapabilityTrend: 'Rapid', displacementTimeline: '2–3 years', confidence: 'High' },
      { name: 'Data interpretation and business insight', taskType: 'decision-making', risk2026: 20, risk2028: 35, risk2030: 48, humanAdvantageScore: 78, aiCapabilityTrend: 'Moderate', displacementTimeline: '4–6 years', confidence: 'High' },
      { name: 'Stakeholder presentation and storytelling', taskType: 'human-interaction', risk2026: 12, risk2028: 20, risk2030: 28, humanAdvantageScore: 90, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'High' },
      { name: 'SQL query writing and data extraction', taskType: 'core', risk2026: 68, risk2028: 82, risk2030: 90, humanAdvantageScore: 15, aiCapabilityTrend: 'Rapid', displacementTimeline: 'Immediate', confidence: 'High' },
      { name: 'Experimental design and hypothesis testing', taskType: 'strategic', risk2026: 18, risk2028: 28, risk2030: 40, humanAdvantageScore: 82, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'Medium' },
    ],
    finance: [
      { name: 'Financial report preparation and formatting', taskType: 'core', risk2026: 72, risk2028: 85, risk2030: 92, humanAdvantageScore: 12, aiCapabilityTrend: 'Rapid', displacementTimeline: 'Immediate', confidence: 'High' },
      { name: 'Strategic financial analysis and judgment', taskType: 'decision-making', risk2026: 15, risk2028: 28, risk2030: 40, humanAdvantageScore: 85, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'High' },
      { name: 'Stakeholder and client relationship management', taskType: 'human-interaction', risk2026: 8, risk2028: 14, risk2030: 22, humanAdvantageScore: 92, aiCapabilityTrend: 'Plateau', displacementTimeline: '7+ years', confidence: 'High' },
      { name: 'Spreadsheet modeling and scenario building', taskType: 'core', risk2026: 62, risk2028: 78, risk2030: 88, humanAdvantageScore: 20, aiCapabilityTrend: 'Rapid', displacementTimeline: '2–3 years', confidence: 'High' },
      { name: 'Risk assessment and regulatory compliance', taskType: 'strategic', risk2026: 22, risk2028: 35, risk2030: 48, humanAdvantageScore: 78, aiCapabilityTrend: 'Moderate', displacementTimeline: '4–6 years', confidence: 'Medium' },
    ],
    operations: [
      { name: 'Routine data entry and processing', taskType: 'core', risk2026: 82, risk2028: 92, risk2030: 95, humanAdvantageScore: 8, aiCapabilityTrend: 'Rapid', displacementTimeline: 'Immediate', confidence: 'High' },
      { name: 'Complex case escalation and resolution', taskType: 'human-interaction', risk2026: 15, risk2028: 25, risk2030: 38, humanAdvantageScore: 88, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'High' },
      { name: 'Process improvement and workflow design', taskType: 'strategic', risk2026: 20, risk2028: 32, risk2030: 45, humanAdvantageScore: 80, aiCapabilityTrend: 'Moderate', displacementTimeline: '4–6 years', confidence: 'Medium' },
      { name: 'Quality monitoring and error detection', taskType: 'core', risk2026: 55, risk2028: 70, risk2030: 82, humanAdvantageScore: 28, aiCapabilityTrend: 'Rapid', displacementTimeline: '2–3 years', confidence: 'High' },
      { name: 'Stakeholder communication and reporting', taskType: 'administrative', risk2026: 40, risk2028: 58, risk2030: 70, humanAdvantageScore: 45, aiCapabilityTrend: 'Moderate', displacementTimeline: '4–6 years', confidence: 'Medium' },
    ],
  };

  // AI-native/orchestration override — these roles have fundamentally different risk profiles
  if (category === 'ai_native' || category === 'human_ai_orchestration') {
    return [
      { name: 'Designing AI system architecture and constraints', taskType: 'strategic', risk2026: 5, risk2028: 8, risk2030: 12, humanAdvantageScore: 98, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'High' },
      { name: 'Monitoring and correcting AI agent outputs', taskType: 'decision-making', risk2026: 8, risk2028: 12, risk2030: 18, humanAdvantageScore: 95, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'High' },
      { name: 'Stakeholder alignment on AI deployment strategy', taskType: 'human-interaction', risk2026: 3, risk2028: 5, risk2030: 8, humanAdvantageScore: 99, aiCapabilityTrend: 'Plateau', displacementTimeline: '7+ years', confidence: 'High' },
      { name: 'Prompt and workflow design for AI systems', taskType: 'core', risk2026: 22, risk2028: 35, risk2030: 50, humanAdvantageScore: 72, aiCapabilityTrend: 'Moderate', displacementTimeline: '4–6 years', confidence: 'Medium' },
      { name: 'AI failure mode analysis and remediation', taskType: 'decision-making', risk2026: 6, risk2028: 10, risk2030: 16, humanAdvantageScore: 96, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'High' },
    ];
  }

  // Return family-specific tasks if available, else generate from d1
  const familyTasks = baseTasks[family];
  if (familyTasks) return familyTasks;

  // Generic fallback — use d1 to modulate risk
  const coreRisk2026 = Math.min(90, Math.max(20, d1 * 0.85));
  const coreRisk2028 = Math.min(95, coreRisk2026 + 15);
  const coreRisk2030 = Math.min(95, coreRisk2028 + 12);

  return [
    { name: 'Routine execution tasks', taskType: 'core', risk2026: Math.round(coreRisk2026), risk2028: Math.round(coreRisk2028), risk2030: Math.round(coreRisk2030), humanAdvantageScore: Math.round(100 - coreRisk2026), aiCapabilityTrend: isHighRisk ? 'Rapid' : 'Moderate', displacementTimeline: isHighRisk ? '2–3 years' : '4–6 years', confidence: 'Medium' },
    { name: 'Judgment and decision-making tasks', taskType: 'decision-making', risk2026: Math.round(coreRisk2026 * 0.35), risk2028: Math.round(coreRisk2026 * 0.5), risk2030: Math.round(coreRisk2026 * 0.65), humanAdvantageScore: Math.round(100 - coreRisk2026 * 0.35), aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'Medium' },
    { name: 'Stakeholder interaction and communication', taskType: 'human-interaction', risk2026: 12, risk2028: 20, risk2030: 28, humanAdvantageScore: 88, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'Medium' },
    { name: 'Administrative and reporting tasks', taskType: 'administrative', risk2026: Math.round(coreRisk2026 * 0.7), risk2028: Math.round(coreRisk2026 * 0.88), risk2030: Math.round(coreRisk2026), humanAdvantageScore: Math.round(30 - coreRisk2026 * 0.2), aiCapabilityTrend: 'Rapid', displacementTimeline: '2–3 years', confidence: 'Medium' },
    { name: 'Strategic planning and domain expertise', taskType: 'strategic', risk2026: 10, risk2028: 18, risk2030: 28, humanAdvantageScore: 88, aiCapabilityTrend: 'Slow', displacementTimeline: '7+ years', confidence: 'Speculative' },
  ];
}

// ─── Driver narratives ────────────────────────────────────────────────────────

function buildDynamicDriverNarratives(
  category: RoleCategory,
  family: string,
): DriverNarrative[] {
  if (category === 'ai_native' || category === 'human_ai_orchestration') {
    return [
      { driver: 'Agentic AI platforms (LangChain, AutoGPT, CrewAI)', currentImpact: 'High', futureImpact: 'Critical', reason: 'Agentic AI platforms are creating the environment in which this role operates — not displacing it. As agentic systems grow more complex, human oversight and design expertise becomes more valuable, not less.' },
      { driver: 'LLM capability improvements (GPT-5, Claude 4, Gemini Ultra)', currentImpact: 'Moderate', futureImpact: 'High', reason: 'More capable base models expand what AI systems can do autonomously, increasing both the opportunity and the responsibility of human orchestrators who design and supervise them.' },
      { driver: 'Enterprise AI adoption acceleration', currentImpact: 'High', futureImpact: 'Critical', reason: 'As enterprises deploy AI at scale, demand for humans who understand how to deploy, monitor, and govern these systems safely grows faster than AI capability advances.' },
    ];
  }

  if (category === 'ai_augmented') {
    return [
      { driver: 'AI co-pilot tools (Copilot, Claude, Gemini)', currentImpact: 'Moderate', futureImpact: 'High', reason: 'AI tools are augmenting this role — increasing output and reducing the need for routine execution — without yet eliminating the judgment and relationship components that define the role\'s core value.' },
      { driver: 'Workflow automation platforms (Zapier, Make, n8n)', currentImpact: 'Moderate', futureImpact: 'High', reason: 'Process automation tools are handling increasing proportions of the repetitive coordination and reporting tasks in this role, shifting human focus toward higher-judgment work.' },
      { driver: 'AI-generated content and analysis tools', currentImpact: 'High', futureImpact: 'High', reason: 'The routine deliverable layer of this role is being commoditized by AI generation tools, compressing the time required for standard outputs and raising the quality bar for uniquely human contributions.' },
    ];
  }

  // Traditional and emerging_unknown
  const familyDrivers: Record<string, DriverNarrative[]> = {
    swe: [
      { driver: 'AI coding assistants (GitHub Copilot, Claude Code, Cursor)', currentImpact: 'High', futureImpact: 'Critical', reason: 'AI coding tools are dramatically accelerating code generation for standard tasks, reducing the time and headcount required for implementation-heavy software engineering.' },
      { driver: 'Autonomous coding agents (Devin, Claude Agents)', currentImpact: 'Moderate', futureImpact: 'High', reason: 'Early agentic coding systems can now complete multi-step software tasks autonomously, signaling the trajectory toward greater automation of routine development work.' },
      { driver: 'No-code and low-code platform maturation', currentImpact: 'Moderate', futureImpact: 'High', reason: 'Platform tools increasingly allow non-technical stakeholders to build software products, reducing demand for purely implementation-focused engineering.' },
    ],
    data: [
      { driver: 'AI analytics and BI tools (Tableau AI, Power BI Copilot)', currentImpact: 'High', futureImpact: 'Critical', reason: 'AI-powered analytics platforms auto-generate insights, visualizations, and narratives from raw data, compressing demand for routine data analysis work.' },
      { driver: 'Natural language to SQL tools', currentImpact: 'High', futureImpact: 'Critical', reason: 'Text-to-SQL tools allow non-technical stakeholders to extract data without analyst involvement, reducing demand for routine query and reporting work.' },
      { driver: 'AutoML and AI-generated model selection', currentImpact: 'Moderate', futureImpact: 'High', reason: 'Automated machine learning platforms are reducing the data science skill required to build and deploy predictive models for standard use cases.' },
    ],
    operations: [
      { driver: 'Robotic Process Automation (UiPath, Automation Anywhere)', currentImpact: 'High', futureImpact: 'Critical', reason: 'RPA tools have already automated high volumes of rule-based operational tasks, and are increasingly extending into more complex semi-structured processes.' },
      { driver: 'AI agent platforms for customer and process automation', currentImpact: 'High', futureImpact: 'Critical', reason: 'AI agents can now handle increasing proportions of customer interaction, case management, and back-office processing — the core work of many operational roles.' },
      { driver: 'NLP and conversational AI maturation', currentImpact: 'High', futureImpact: 'Critical', reason: 'Improved natural language understanding allows AI systems to handle increasingly complex customer interactions without human intervention.' },
    ],
  };

  return familyDrivers[family] ?? [
    { driver: 'General-purpose AI tools (ChatGPT, Claude, Gemini)', currentImpact: 'Moderate', futureImpact: 'High', reason: 'General-purpose AI tools are augmenting many knowledge worker roles by handling routine information processing, writing, and analysis tasks.' },
    { driver: 'Workflow and process automation platforms', currentImpact: 'Moderate', futureImpact: 'High', reason: 'AI-driven automation is systematically compressing demand for routine process execution across industries.' },
    { driver: 'AI-generated content and document tools', currentImpact: 'Moderate', futureImpact: 'Moderate', reason: 'Document generation, summarization, and content automation tools are reducing the time required for standard administrative deliverables.' },
  ];
}

// ─── Evolution path ───────────────────────────────────────────────────────────

function buildDynamicEvolutionPath(
  title: string,
  category: RoleCategory,
  family: string,
): Array<{ label: string; timeframe: string; type: 'current' | 'augmented' | 'specialized' | 'transformed'; }> {
  const displayTitle = title.length > 32 ? title.slice(0, 32) + '...' : title;

  if (category === 'ai_native' || category === 'human_ai_orchestration') {
    return [
      { label: displayTitle, timeframe: '~2024–2026', type: 'current' },
      { label: `Senior ${displayTitle}`, timeframe: '~2026–2028', type: 'augmented' },
      { label: 'AI Systems Strategy Lead', timeframe: '~2028–2030', type: 'specialized' },
      { label: category === 'human_ai_orchestration' ? 'Head of AI Operations / CAiO' : 'AI Platform Architect / Research Lead', timeframe: '~2030+', type: 'transformed' },
    ];
  }

  const familyEvolution: Record<string, Array<{ label: string; timeframe: string; type: 'current' | 'augmented' | 'specialized' | 'transformed' }>> = {
    swe: [
      { label: displayTitle, timeframe: '~2024–2026', type: 'current' },
      { label: 'AI-Augmented Developer', timeframe: '~2026–2028', type: 'augmented' },
      { label: 'AI-Native Software Architect', timeframe: '~2028–2030', type: 'specialized' },
      { label: 'AI Systems / Agentic Platform Lead', timeframe: '~2030+', type: 'transformed' },
    ],
    data: [
      { label: displayTitle, timeframe: '~2024–2026', type: 'current' },
      { label: 'AI-Augmented Analyst', timeframe: '~2026–2028', type: 'augmented' },
      { label: 'Decision Intelligence Specialist', timeframe: '~2028–2030', type: 'specialized' },
      { label: 'AI Data Strategy Lead', timeframe: '~2030+', type: 'transformed' },
    ],
    finance: [
      { label: displayTitle, timeframe: '~2024–2026', type: 'current' },
      { label: 'AI-Augmented Finance Professional', timeframe: '~2026–2028', type: 'augmented' },
      { label: 'Strategic Finance / FP&A Lead', timeframe: '~2028–2030', type: 'specialized' },
      { label: 'AI-Era CFO / Finance Strategy Director', timeframe: '~2030+', type: 'transformed' },
    ],
    operations: [
      { label: displayTitle, timeframe: '~2024–2026', type: 'current' },
      { label: 'AI-Augmented Operations Specialist', timeframe: '~2026–2028', type: 'augmented' },
      { label: 'Agent Operations Manager', timeframe: '~2028–2030', type: 'specialized' },
      { label: 'AI Operations Director', timeframe: '~2030+', type: 'transformed' },
    ],
    healthcare: [
      { label: displayTitle, timeframe: '~2024–2026', type: 'current' },
      { label: 'AI-Assisted Healthcare Professional', timeframe: '~2026–2028', type: 'augmented' },
      { label: 'Clinical AI Champion / Specialist', timeframe: '~2028–2030', type: 'specialized' },
      { label: 'Healthcare AI Strategy Lead', timeframe: '~2030+', type: 'transformed' },
    ],
  };

  return familyEvolution[family] ?? [
    { label: displayTitle, timeframe: '~2024–2026', type: 'current' },
    { label: 'AI-Augmented Professional', timeframe: '~2026–2028', type: 'augmented' },
    { label: 'AI-Native Domain Specialist', timeframe: '~2028–2030', type: 'specialized' },
    { label: 'AI Strategy / Domain Leadership', timeframe: '~2030+', type: 'transformed' },
  ];
}

// ─── Skill profile ────────────────────────────────────────────────────────────

function buildDynamicSkillProfile(
  family: string,
  category: RoleCategory,
  d1: number,
): { obsolete: SkillRisk[]; at_risk: SkillRisk[]; safe: SafeSkill[] } {
  const dangerSkills = DANGER_SKILLS[family] ?? DANGER_SKILLS['default'] ?? [];
  const safeSkills   = SAFE_SKILLS[family]   ?? SAFE_SKILLS['default']   ?? [];

  const isAiNative = category === 'ai_native' || category === 'human_ai_orchestration';
  const riskPrefix = d1 > 70
    ? 'High AI tool maturity — this skill faces direct automation pressure. '
    : 'Moderate AI tool maturity — augmentation is underway. ';

  const obsolete: SkillRisk[] = isAiNative
    ? [{ skill: 'Manual execution of tasks now handled by AI tools', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI tools now automate the repetitive execution layer of this role, shifting human value to system design and oversight.', aiReplacement: 'Full' }]
    : dangerSkills.slice(0, 2).map((skill, i) => ({
        skill,
        riskScore: Math.round(d1 - i * 8),
        riskType: 'Automatable' as const,
        horizon: i === 0 ? '1-2 years' : '2-3 years',
        reason: `${riskPrefix}AI tools can handle this task type at scale without human intervention.`,
        aiReplacement: 'Full' as const,
      }));

  const at_risk: SkillRisk[] = isAiNative
    ? [{ skill: 'Prompt-only interactions without system-level thinking', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'As AI models improve, shallow prompt-level interactions are becoming table stakes rather than a differentiating skill.', aiReplacement: 'Partial' }]
    : dangerSkills.slice(2, 4).map((skill, i) => ({
        skill,
        riskScore: Math.round(d1 * 0.75 - i * 5),
        riskType: 'Augmented' as const,
        horizon: '2-4 years',
        reason: 'AI tools augment this skill — partial automation is underway, reducing the human effort required.',
        aiReplacement: 'Partial' as const,
      }));

  const safe: SafeSkill[] = isAiNative
    ? [
        { skill: 'AI System Design and Governance', whySafe: 'Designing and governing AI systems requires human accountability, systems thinking, and ethical judgment that AI cannot supply about itself.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Stakeholder Trust and Change Leadership', whySafe: 'Building organizational trust in AI systems and leading humans through AI-driven change requires irreducible human empathy and communication skill.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Domain Expertise + AI Integration', whySafe: 'Combining deep domain knowledge with AI capability to solve problems no AI can solve without human context is the highest-value skill in this role.', longTermValue: 97, difficulty: 'High' },
      ]
    : safeSkills.slice(0, 3).map((skill) => ({
        skill,
        whySafe: 'Complex human judgment, domain expertise, relationships, or contextual reasoning — AI can assist but not replicate at the quality level required for high-stakes decisions.',
        longTermValue: 88,
        difficulty: 'High' as const,
      }));

  return { obsolete, at_risk, safe };
}

// ─── Career paths ─────────────────────────────────────────────────────────────

function buildDynamicCareerPaths(
  family: string,
  category: RoleCategory,
): CareerPath[] {
  const transitionRecs = TRANSITION_RECS[family] ?? TRANSITION_RECS['default'] ?? [];

  if (category === 'ai_native' || category === 'human_ai_orchestration') {
    return [
      { role: 'AI Systems Strategy Lead', riskReduction: 5, skillGap: 'Systems architecture, organizational strategy, executive communication', transitionDifficulty: 'Hard', industryMapping: ['AI-Native Companies', 'Enterprise', 'Consulting'], salaryDelta: '+60-150%', timeToTransition: '24 months' },
      { role: 'AI Startup Founder / Operator', riskReduction: 10, skillGap: 'Business development, fundraising, product strategy', transitionDifficulty: 'Very Hard', industryMapping: ['Startup', 'VC-Backed'], salaryDelta: '+Equity upside', timeToTransition: '12 months' },
    ];
  }

  const paths: CareerPath[] = transitionRecs.slice(0, 2).map((rec, i) => {
    const [role, ...rest] = rec.split(' — ');
    return {
      role: role.trim(),
      riskReduction: [40, 30][i] ?? 35,
      skillGap: rest.join(' ').trim() || 'AI tool proficiency, domain specialization, strategic thinking',
      transitionDifficulty: (['Medium', 'Hard'][i] ?? 'Medium') as CareerPath['transitionDifficulty'],
      industryMapping: ['AI-Augmented Sector'],
      salaryDelta: ['+30-60%', '+40-80%'][i] ?? '+30-60%',
      timeToTransition: ['12 months', '18 months'][i] ?? '12 months',
    };
  });

  if (paths.length === 0) {
    paths.push({
      role: 'AI-Native Domain Specialist',
      riskReduction: 45,
      skillGap: 'AI tool proficiency, domain specialization, stakeholder communication',
      transitionDifficulty: 'Medium',
      industryMapping: ['Enterprise', 'Tech', 'Consulting'],
      salaryDelta: '+30-70%',
      timeToTransition: '12 months',
    });
  }

  return paths;
}

// ─── Displacement defaults by category ───────────────────────────────────────

const CATEGORY_DISPLACEMENT: Record<RoleCategory, AutomationTimeline['displacementByYear']> = {
  traditional:             { 2026: 0.05, 2028: 0.15, 2030: 0.28, 2032: 0.38 },
  ai_augmented:            { 2026: 0.08, 2028: 0.20, 2030: 0.30, 2032: 0.35 },
  ai_native:               { 2026: 0.02, 2028: 0.05, 2030: 0.10, 2032: 0.18 },
  human_ai_orchestration:  { 2026: 0.01, 2028: 0.03, 2030: 0.06, 2032: 0.12 },
  emerging_unknown:        { 2026: 0.04, 2028: 0.11, 2030: 0.18, 2032: 0.25 },
};

const CATEGORY_RISK_TIER: Record<RoleCategory, AutomationTimeline['riskTier']> = {
  traditional:             'moderate',
  ai_augmented:            'moderate',
  ai_native:               'very_low',
  human_ai_orchestration:  'very_low',
  emerging_unknown:        'low',
};

const CATEGORY_AUGMENTATION: Record<RoleCategory, number> = {
  traditional:             0.55,
  ai_augmented:            0.70,
  ai_native:               0.85,
  human_ai_orchestration:  0.90,
  emerging_unknown:        0.55,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateDynamicRoleIntelligence(
  roleTitle: string,
  industryKey: string,
  experience: string,
  countryKey: string,
  d1: number,
  d6: number,
): { intel: CareerIntelligence; timeline: AutomationTimeline } {
  const category = classifyRoleCategory(roleTitle);
  const family   = inferRoleFamily(roleTitle, industryKey);
  const cluster  = getCountryCluster(countryKey);

  const skillProfile  = buildDynamicSkillProfile(family, category, d1);
  const taskDetails   = buildDynamicTaskProfile(family, category, d1);
  const driverNarr    = buildDynamicDriverNarratives(category, family);
  const careerPaths   = buildDynamicCareerPaths(family, category);
  const displ         = CATEGORY_DISPLACEMENT[category];

  const categoryLabel: Record<RoleCategory, string> = {
    traditional:            'Traditional role with AI augmentation pressure',
    ai_augmented:           'AI-augmented role — AI tools reshape but preserve the function',
    ai_native:              'AI-native role — exists because AI exists',
    human_ai_orchestration: 'Human-AI orchestration role — humans manage AI systems',
    emerging_unknown:       'Emerging role — insufficient research data for high-confidence scoring',
  };

  const countryNote: Partial<Record<typeof cluster, string>> = {
    south_asia: 'India market: Naukri, LinkedIn India, and NASSCOM FutureSkills are primary platforms for this emerging role category.',
    north_america: 'North America market: LinkedIn and Levels.fyi track compensation for this role; demand is growing but definitions vary by employer.',
    europe: 'European market: EU AI Act and GDPR create unique demand for AI-governance-aware professionals in this role category.',
    gcc: 'GCC market: Saudi Vision 2030 and UAE AI Strategy are driving demand for AI-era roles across government and enterprise.',
  };

  const contextTags: string[] = ['dynamic-estimate', 'custom-role'];
  if (category !== 'traditional') contextTags.push('emerging-role');
  if (category === 'ai_native' || category === 'human_ai_orchestration') contextTags.push('ai-native', 'frontier-skill');

  const intel: CareerIntelligence = {
    displayRole: roleTitle,
    summary: `${categoryLabel[category]}. Risk profile estimated dynamically from role title and industry — confidence is limited (${category === 'emerging_unknown' ? 'no research data available' : 'role pattern matched'}). ${countryNote[cluster] ?? ''}`,
    skills: skillProfile,
    careerPaths,
    inactionScenario: category === 'ai_native' || category === 'human_ai_orchestration'
      ? 'This is an AI-era role — the primary risk is not displacement but missing the growth window. Early movers in AI-native and orchestration roles command significant premiums that will compress as the talent pool grows.'
      : `Your estimated displacement risk is ${Math.round(displ[2028] * 100)}% by 2028. Without developing AI-augmented capabilities, market value compression is likely as AI tools raise the baseline productivity expectation for this role.`,
    riskTrend: [
      { year: 2024, riskScore: Math.round(displ[2026] * 100 * 0.6), label: 'Now' },
      { year: 2026, riskScore: Math.round(displ[2026] * 100), label: '+2yr' },
      { year: 2027, riskScore: Math.round((displ[2026] + displ[2028]) / 2 * 100), label: '+3yr' },
      { year: 2028, riskScore: Math.round(displ[2028] * 100), label: '+4yr' },
      { year: 2029, riskScore: Math.round((displ[2028] + displ[2030]) / 2 * 100), label: '+5yr' },
    ],
    confidenceScore: 55,
    contextTags,
    evolutionHorizon: '2028',
    roleCategory: category,
  };

  const topTasksAtRisk = taskDetails
    .sort((a, b) => b.risk2028 - a.risk2028)
    .slice(0, 3)
    .map((t) => t.name);

  const humanEssentialTasks = taskDetails
    .filter((t) => t.humanAdvantageScore >= 75)
    .slice(0, 3)
    .map((t) => t.name);

  const automationDrivers = driverNarr.map((d) => d.driver);

  const timeline: AutomationTimeline = {
    roleKey: `__custom__${roleTitle.toLowerCase().replace(/\s+/g, '_').slice(0, 30)}`,
    augmentationProbability:    CATEGORY_AUGMENTATION[category],
    displacementProbability2032: displ[2032],
    displacementByYear:          displ,
    topTasksAtRisk,
    humanEssentialTasks,
    automationDrivers,
    impactTimeline:  category === 'ai_native' || category === 'human_ai_orchestration' ? 'long' : d1 > 65 ? 'short' : 'medium',
    riskTier:        CATEGORY_RISK_TIER[category],
    taskDetails,
    driverNarratives: driverNarr,
  };

  return { intel, timeline };
}
