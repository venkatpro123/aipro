// roleProductivityTools.ts
// Role-specific AI productivity / adaptation tools.
//
// WHY THIS EXISTS: the Action Plan tab previously rendered a single hardcoded
// list of 4 tools (Claude, GitHub Copilot, Perplexity, Notion AI) for EVERY
// user — a nurse, a lawyer, an FP&A analyst, and a backend engineer all saw
// "GitHub Copilot · AI pair programming". That is the textbook template-based
// behaviour the product is meant to avoid: the tools you should learn to stay
// ahead of automation are entirely different per role.
//
// This file maps role FAMILIES (by prefix) to the AI tools that are actually
// reshaping that profession, plus a small universal set everyone benefits from.
// getProductivityToolsForRole() resolves a role key to its family list and
// blends in universal tools, de-duplicating and capping the result.
//
// Data is intentionally broad — 20+ role families — so that "AI Productivity
// Tools" reads as genuinely personalised across the role/industry spectrum the
// app supports. Each tool is a real product with a stable URL.

export interface ProductivityTool {
  name: string;
  /** One-line, role-relevant value proposition. */
  desc: string;
  url: string;
  /** Short uppercase capability tag shown as a chip. */
  tag: string;
}

// ── Universal tools — useful to almost every knowledge worker ─────────────────
// Kept short so role-specific tools dominate the list. Appended AFTER role tools.
const UNIVERSAL_TOOLS: ProductivityTool[] = [
  { name: "Claude (Anthropic)", desc: "Analysis, writing, and complex reasoning across any domain", url: "https://claude.ai", tag: "REASONING" },
  { name: "Perplexity Pro", desc: "Real-time research with citations", url: "https://www.perplexity.ai", tag: "RESEARCH" },
];

// ── Role-family → tools ───────────────────────────────────────────────────────
// Keyed by role-family prefix (the first segment of the work-type key, e.g.
// "sw_backend" → "sw"). Resolution also handles common aliases via FAMILY_ALIAS.

const ROLE_TOOLS: Record<string, ProductivityTool[]> = {
  // ── Software / Engineering ─────────────────────────────────────────────────
  sw: [
    { name: "Cursor", desc: "AI-native code editor — multi-file edits, codebase chat", url: "https://cursor.com", tag: "CODING" },
    { name: "GitHub Copilot", desc: "Inline completion, PR summaries, code review", url: "https://github.com/features/copilot", tag: "CODING" },
    { name: "Claude Code", desc: "Agentic coding in the terminal — refactors, tests, fixes", url: "https://www.anthropic.com/claude-code", tag: "AGENTIC" },
    { name: "CodeRabbit", desc: "Automated AI code review on every pull request", url: "https://coderabbit.ai", tag: "REVIEW" },
  ],
  // ── Data / ML / Analytics ──────────────────────────────────────────────────
  data: [
    { name: "Hex / Hex Magic", desc: "AI-assisted SQL + Python notebooks and dashboards", url: "https://hex.tech", tag: "ANALYTICS" },
    { name: "Julius AI", desc: "Chat with your data — analysis, charts, modelling", url: "https://julius.ai", tag: "ANALYSIS" },
    { name: "GitHub Copilot", desc: "Notebook + SQL completion for pipelines", url: "https://github.com/features/copilot", tag: "CODING" },
  ],
  ml: [
    { name: "Weights & Biases", desc: "Experiment tracking, evals, and model monitoring", url: "https://wandb.ai", tag: "MLOPS" },
    { name: "LangSmith", desc: "Trace, evaluate, and debug LLM applications", url: "https://www.langchain.com/langsmith", tag: "LLMOPS" },
    { name: "Hugging Face", desc: "Models, datasets, and fine-tuning infrastructure", url: "https://huggingface.co", tag: "MODELS" },
  ],
  // ── Product / Program management ───────────────────────────────────────────
  pm: [
    { name: "Productboard", desc: "AI insight clustering from customer feedback", url: "https://www.productboard.com", tag: "DISCOVERY" },
    { name: "Notion AI", desc: "PRDs, specs, roadmaps, and meeting synthesis", url: "https://www.notion.so/product/ai", tag: "DOCS" },
    { name: "Dovetail", desc: "AI synthesis of user research and interviews", url: "https://dovetail.com", tag: "RESEARCH" },
  ],
  // ── Design / UX ────────────────────────────────────────────────────────────
  design: [
    { name: "Figma AI", desc: "First-draft layouts, content fill, prototype generation", url: "https://www.figma.com/ai/", tag: "DESIGN" },
    { name: "v0 by Vercel", desc: "Prompt-to-UI: production React/Tailwind from text", url: "https://v0.dev", tag: "UI-GEN" },
    { name: "Galileo AI", desc: "Generate editable, high-fidelity UI from a brief", url: "https://www.usegalileo.ai", tag: "UI-GEN" },
  ],
  // ── Finance / FP&A / Accounting ────────────────────────────────────────────
  fin: [
    { name: "Microsoft Copilot in Excel", desc: "Natural-language modelling, formula generation, analysis", url: "https://www.microsoft.com/microsoft-365/copilot", tag: "MODELLING" },
    { name: "Rogo / Daloopa", desc: "AI financial data extraction and model building", url: "https://rogo.ai", tag: "FP&A" },
    { name: "Python + pandas", desc: "Automate recurring models and reconciliations", url: "https://pandas.pydata.org", tag: "AUTOMATION" },
  ],
  // ── HR / Recruiting / People ───────────────────────────────────────────────
  hr: [
    { name: "Gem / hireEZ", desc: "AI sourcing, outreach, and pipeline automation", url: "https://www.gem.com", tag: "SOURCING" },
    { name: "Visier", desc: "People analytics — attrition and workforce modelling", url: "https://www.visier.com", tag: "ANALYTICS" },
    { name: "Notion AI", desc: "Policy drafting, JD writing, onboarding docs", url: "https://www.notion.so/product/ai", tag: "DOCS" },
  ],
  // ── Legal / Compliance ─────────────────────────────────────────────────────
  legal: [
    { name: "Harvey", desc: "Domain-specific AI for legal research and drafting", url: "https://www.harvey.ai", tag: "LEGAL-AI" },
    { name: "Spellbook", desc: "Contract drafting and review inside Word", url: "https://www.spellbook.legal", tag: "CONTRACTS" },
    { name: "Lexis+ AI", desc: "Grounded legal research with citations", url: "https://www.lexisnexis.com/en-us/products/lexis-plus-ai.page", tag: "RESEARCH" },
  ],
  // ── Healthcare / Clinical ──────────────────────────────────────────────────
  hc: [
    { name: "Abridge", desc: "Ambient AI clinical documentation from the visit", url: "https://www.abridge.com", tag: "SCRIBE" },
    { name: "OpenEvidence", desc: "Evidence-grounded clinical decision support", url: "https://www.openevidence.com", tag: "DECISION" },
    { name: "Nuance DAX", desc: "AI medical scribe and workflow automation", url: "https://www.nuance.com/healthcare/dragon-ai-clinical-solutions/dax-copilot.html", tag: "SCRIBE" },
  ],
  // ── Marketing / Content / Brand ────────────────────────────────────────────
  mkt: [
    { name: "Jasper", desc: "On-brand marketing copy at scale with guardrails", url: "https://www.jasper.ai", tag: "COPY" },
    { name: "HubSpot AI", desc: "Campaign content, segmentation, and reporting", url: "https://www.hubspot.com/products/artificial-intelligence", tag: "CAMPAIGNS" },
    { name: "Opus Clip / Descript", desc: "AI video repurposing and editing", url: "https://www.descript.com", tag: "VIDEO" },
  ],
  cnt: [
    { name: "Descript", desc: "Edit audio/video by editing the transcript", url: "https://www.descript.com", tag: "EDITING" },
    { name: "Jasper", desc: "Long-form drafting with brand voice control", url: "https://www.jasper.ai", tag: "WRITING" },
    { name: "ElevenLabs", desc: "AI voiceover and dubbing for content", url: "https://elevenlabs.io", tag: "AUDIO" },
  ],
  // ── Sales / Account management / BD ────────────────────────────────────────
  sales: [
    { name: "Clay", desc: "AI-enriched prospecting and personalised outreach", url: "https://www.clay.com", tag: "PROSPECTING" },
    { name: "Gong", desc: "Conversation intelligence and deal-risk scoring", url: "https://www.gong.io", tag: "REVENUE-AI" },
    { name: "Apollo.io", desc: "AI sequencing and pipeline automation", url: "https://www.apollo.io", tag: "OUTREACH" },
  ],
  // ── Operations / Program / BizOps ──────────────────────────────────────────
  ops: [
    { name: "Make / Zapier AI", desc: "No-code automation of repetitive workflows", url: "https://www.make.com", tag: "AUTOMATION" },
    { name: "Airtable AI", desc: "AI fields, summaries, and ops dashboards", url: "https://www.airtable.com/product/ai", tag: "OPS" },
    { name: "Notion AI", desc: "SOPs, status synthesis, and process docs", url: "https://www.notion.so/product/ai", tag: "DOCS" },
  ],
  // ── Customer support / Success ─────────────────────────────────────────────
  cs: [
    { name: "Intercom Fin", desc: "AI agent resolving front-line support tickets", url: "https://www.intercom.com/fin", tag: "SUPPORT-AI" },
    { name: "Zendesk AI", desc: "Triage, drafting, and macro suggestions", url: "https://www.zendesk.com/service/ai/", tag: "SUPPORT" },
    { name: "Gladly / Forethought", desc: "Automated resolution and agent assist", url: "https://forethought.ai", tag: "RESOLUTION" },
  ],
  // ── Consulting / Strategy ──────────────────────────────────────────────────
  cons: [
    { name: "Claude Projects", desc: "Synthesise decks, models, and research per engagement", url: "https://claude.ai", tag: "SYNTHESIS" },
    { name: "Gamma", desc: "AI-generated client decks and one-pagers", url: "https://gamma.app", tag: "DECKS" },
    { name: "Perplexity Pro", desc: "Cited market and competitor research", url: "https://www.perplexity.ai", tag: "RESEARCH" },
  ],
  // ── Education / Training ───────────────────────────────────────────────────
  edu: [
    { name: "Khanmigo", desc: "AI tutoring and lesson-planning assistant", url: "https://www.khanmigo.ai", tag: "TEACHING" },
    { name: "MagicSchool AI", desc: "Lesson plans, rubrics, and differentiation", url: "https://www.magicschool.ai", tag: "PLANNING" },
    { name: "Diffit", desc: "Level-adapted reading materials in seconds", url: "https://diffit.me", tag: "MATERIALS" },
  ],
  // ── Writing / Comms / PR ───────────────────────────────────────────────────
  writing: [
    { name: "Grammarly", desc: "Tone, clarity, and brand-voice editing", url: "https://www.grammarly.com", tag: "EDITING" },
    { name: "Jasper", desc: "Long-form drafting with style control", url: "https://www.jasper.ai", tag: "WRITING" },
  ],
  // ── Manufacturing / Industrial / Skilled trades ────────────────────────────
  ind: [
    { name: "Augmentir", desc: "AI-guided connected-worker instructions", url: "https://www.augmentir.com", tag: "FRONTLINE" },
    { name: "Tulip", desc: "No-code frontline operations apps", url: "https://tulip.co", tag: "OPS" },
    { name: "Claude", desc: "Troubleshooting, SOP drafting, and reporting", url: "https://claude.ai", tag: "ASSIST" },
  ],
  // ── Project management / Delivery ──────────────────────────────────────────
  proj: [
    { name: "Asana AI", desc: "Status roll-ups, risk flags, and workload balancing", url: "https://asana.com/product/ai", tag: "DELIVERY" },
    { name: "Notion AI", desc: "Plans, retros, and stakeholder updates", url: "https://www.notion.so/product/ai", tag: "DOCS" },
    { name: "Motion", desc: "AI scheduling and task prioritisation", url: "https://www.usemotion.com", tag: "PLANNING" },
  ],
};

// Aliases → canonical family. Keeps the map small while covering the work-type
// key variants the app emits.
const FAMILY_ALIAS: Record<string, string> = {
  ds:        'data',
  analytics: 'data',
  ml_eng:    'ml',
  ai:        'ml',
  dev:       'sw',
  swe:       'sw',
  eng:       'sw',
  qa:        'sw',
  prod:      'pm',
  product:   'pm',
  ux:        'design',
  ui:        'design',
  finance:   'fin',
  acct:      'fin',
  accounting:'fin',
  recruiting:'hr',
  people:    'hr',
  leg:       'legal',
  law:       'legal',
  health:    'hc',
  clinical:  'hc',
  marketing: 'mkt',
  content:   'cnt',
  media:     'cnt',
  bd:        'sales',
  account:   'sales',
  operations:'ops',
  bizops:    'ops',
  support:   'cs',
  success:   'cs',
  consulting:'cons',
  strategy:  'cons',
  teacher:   'edu',
  education: 'edu',
  comms:     'writing',
  pr:        'writing',
  manufacturing: 'ind',
  industrial:    'ind',
  trades:    'ind',
  pmo:       'proj',
  delivery:  'proj',
};

/** Extract the role family prefix from a work-type key (first underscore segment). */
function familyOf(workTypeKey: string): string {
  const raw = (workTypeKey ?? '').toLowerCase();
  const first = raw.split('_')[0];
  // Try the full first segment, then the alias map, then the raw key.
  if (ROLE_TOOLS[first]) return first;
  if (FAMILY_ALIAS[first]) return FAMILY_ALIAS[first];
  if (ROLE_TOOLS[raw]) return raw;
  if (FAMILY_ALIAS[raw]) return FAMILY_ALIAS[raw];
  return first;
}

export interface ResolvedToolSet {
  /** Resolved role family used for the recommendation (for the UI label). */
  family: string;
  /** Whether a role-specific list was found (false → universal-only fallback). */
  roleSpecific: boolean;
  tools: ProductivityTool[];
}

/**
 * Resolve a work-type key to a personalised tool set.
 *
 * @param workTypeKey  the audit's role key (e.g. "sw_backend", "fin_fp_analyst")
 * @param max          max tools to return (default 5)
 * @param extraTools   optional tools derived from the user's at-risk skills /
 *                     intelligence (prepended; they are the most personalised).
 */
export function getProductivityToolsForRole(
  workTypeKey: string,
  max = 5,
  extraTools: ProductivityTool[] = [],
): ResolvedToolSet {
  const family = familyOf(workTypeKey);
  const roleTools = ROLE_TOOLS[family] ?? [];
  const roleSpecific = roleTools.length > 0;

  // Order: skill-derived (most personalised) → role-family → universal.
  const merged = [...extraTools, ...roleTools, ...UNIVERSAL_TOOLS];

  // De-duplicate by name (case-insensitive), preserving first occurrence/order.
  const seen = new Set<string>();
  const deduped: ProductivityTool[] = [];
  for (const t of merged) {
    const key = t.name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(t);
  }

  return { family, roleSpecific, tools: deduped.slice(0, max) };
}

/** Human-readable label for a resolved family (for the card subtitle). */
export function familyDisplayLabel(family: string): string {
  const LABELS: Record<string, string> = {
    sw: 'Software Engineering', data: 'Data & Analytics', ml: 'ML / AI',
    pm: 'Product', design: 'Design / UX', fin: 'Finance', hr: 'People / HR',
    legal: 'Legal', hc: 'Healthcare', mkt: 'Marketing', cnt: 'Content / Media',
    sales: 'Sales', ops: 'Operations', cs: 'Customer Support', cons: 'Consulting',
    edu: 'Education', writing: 'Writing / Comms', ind: 'Industrial / Trades',
    proj: 'Project Delivery',
  };
  return LABELS[family] ?? 'Your Role';
}
