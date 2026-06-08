// copilotService.ts — Deterministic intent classification + LLM-powered answers
import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';
import { supabase } from '../utils/supabase';

export interface CopilotContext {
  hybridResult: HybridResult | null;
  userProfile: UserProfile | null;
}

export interface ToolCard {
  toolName: string;
  toolRoute: string;
  emoji: string;
}

export interface CopilotResponse {
  text: string;
  toolCard?: ToolCard;
  intent: string;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Intent definitions ────────────────────────────────────────────────────────
const INTENTS: Array<{
  id: string;
  keywords: string[];
  tool: ToolCard;
  answer: (ctx: CopilotContext, q: string) => string;
}> = [
  {
    id: 'layoff_risk',
    keywords: ['layoff', 'laid off', 'fired', 'lose my job', 'losing my job', 'at risk', 'risky', 'safe', 'risk score', 'chances', 'probability', 'am i safe', 'job secure', 'job security'],
    tool: { toolName: 'Layoff Defense Center', toolRoute: '/tools/layoff-defense', emoji: '🛡️' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Run your first audit to get a personalized layoff risk score. Go to Layoff Audit and enter your company and role.";
      const { total, tier, companyName, confidencePercent } = ctx.hybridResult;
      const tierWord = total >= 70 ? 'HIGH' : total >= 40 ? 'MODERATE' : 'LOW';
      const lead = total >= 70
        ? `Your current risk score is **${Math.round(total)}/100** — that's ${tierWord} risk. This warrants immediate action.`
        : total >= 40
        ? `Your current risk score is **${Math.round(total)}/100** — ${tierWord} risk. You have time to act, but should start preparing now.`
        : `Your current risk score is **${Math.round(total)}/100** — ${tierWord} risk. Your position looks relatively stable right now.`;
      const company = companyName ? ` at ${companyName}` : '';
      const conf = confidencePercent >= 70 ? 'high' : confidencePercent >= 45 ? 'moderate' : 'limited';
      return `${lead} This score is for your role${company} and is based on ${conf} signal coverage. The Layoff Defense Center shows exactly which risk levers you can pull to reduce it.`;
    },
  },
  {
    id: 'ai_displacement',
    keywords: ['ai', 'automation', 'replace', 'automated', 'chatgpt', 'llm', 'robot', 'displacement', 'future proof', 'obsolete', 'irreplaceable', 'ai exposure'],
    tool: { toolName: 'AI Career Defense', toolRoute: '/tools/ai-defense', emoji: '🤖' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Run an audit to get your AI displacement score. The AI Career Defense Center gives you a full breakdown of your role's automation exposure.";
      const d2 = ctx.hybridResult.dimensions?.find(d => d.key === 'D2');
      const score = d2?.score ?? null;
      if (score === null) return "Your audit didn't include a D2 AI displacement score yet. Re-run a full audit to get your AI exposure analysis, then check the AI Career Defense Center.";
      const risk = score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low';
      const msg = score >= 70
        ? `Your AI displacement score is **${Math.round(score)}/100** — that's a high exposure level. Key areas driving this risk are likely task automation and agentic AI encroachment on your role.`
        : score >= 40
        ? `Your AI displacement score is **${Math.round(score)}/100** — moderate exposure. Some tasks in your role are automatable, but your human judgment dimension likely provides a buffer.`
        : `Your AI displacement score is **${Math.round(score)}/100** — low exposure. Your role has strong human-irreplaceable characteristics that current AI systems cannot replicate.`;
      return `${msg} The AI Career Defense Center shows your full task-level exposure breakdown and a 90-day skill sprint to widen that gap.`;
    },
  },
  {
    id: 'salary_comp',
    keywords: ['salary', 'paid', 'underpaid', 'overpaid', 'market rate', 'raise', 'compensation', 'comp', 'offer', 'negotiate', 'negotiation', 'worth', 'pay', 'earn', 'income', 'market median'],
    tool: { toolName: 'Compensation Intelligence', toolRoute: '/tools/compensation', emoji: '💰' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Run an audit first to unlock your compensation intelligence. The Compensation Center benchmarks your salary against market data for your specific role and region.";
      const comp = ctx.hybridResult.compensationRisk;
      if (!comp) return "Your audit didn't include compensation data. Ensure you enter your salary when setting up your profile. The Compensation Center will then show your market position.";
      const { payPosition, payPositionLabel, estimatedMarketMedian, marketDeltaPct } = comp;
      const delta = Math.abs(Math.round(marketDeltaPct ?? 0));
      const direction = (marketDeltaPct ?? 0) < 0 ? 'below' : 'above';
      return `Based on your role and region, your pay is currently **${payPositionLabel ?? payPosition}** — you're approximately **${delta}% ${direction}** the market median of $${Math.round((estimatedMarketMedian ?? 0) / 1000)}K/year. The Compensation Intelligence Center breaks this down by percentile, shows your negotiation leverage score, and gives you exact email scripts to use in your next salary conversation.`;
    },
  },
  {
    id: 'leave_quit',
    keywords: ['quit', 'leave', 'resign', 'exit', 'move on', 'find new job', 'new job', 'job search', 'job hunting', 'transition', 'career change', 'pivot', 'switch', 'should i stay', 'should i go'],
    tool: { toolName: 'Career Strategy Studio', toolRoute: '/tools/strategy', emoji: '🧭' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Run an audit first to get a personalized stay-vs-exit recommendation. The Career Strategy Studio uses your risk score, runway, and escape paths to build your strategy.";
      const { total, escapePaths, financialRunway } = ctx.hybridResult;
      const topPath = escapePaths?.paths?.[0];
      const runway = financialRunway?.runwayMonths;
      const stayAdvice = total >= 70
        ? "Given your current HIGH risk score, exploring exit options is a priority."
        : total >= 40
        ? "Your MODERATE risk score suggests monitoring closely. An exit option takes time to build — start now while employed."
        : "Your LOW risk score means you're in a position of strength. Now is a great time to negotiate or explore proactively.";
      const pathMsg = topPath ? ` Your top escape path is **${topPath.title}** — estimated ${topPath.effort} effort with ${topPath.timeToImpact} to impact.` : '';
      const runwayMsg = runway ? ` You have approximately **${runway} months** of financial runway.` : '';
      return `${stayAdvice}${pathMsg}${runwayMsg} The Career Strategy Studio gives you a full Stay vs. Exit decision framework with 90-day action plans for each scenario.`;
    },
  },
  {
    id: 'upskill_learn',
    keywords: ['learn', 'skill', 'course', 'certification', 'upskill', 'training', 'study', 'portfolio', 'resume', 'improve', 'grow', 'develop', 'linkedin', 'github'],
    tool: { toolName: 'Career Readiness Center', toolRoute: '/tools/career-readiness', emoji: '📚' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Run an audit to get your personalized skill gap analysis. The Career Readiness Center shows exactly what to learn for your specific role.";
      const skills = ctx.hybridResult.skillPortfolioFit;
      if (!skills) return "Your audit didn't include a skill portfolio assessment. Run a full audit to unlock your personalized learning roadmap in the Career Readiness Center.";
      const topRetool = skills.retoolPriority?.slice(0, 3).join(', ') ?? 'AI-adjacent skills';
      const decayRisk = skills.skillDecayRisk;
      const riskMsg = decayRisk === 'HIGH' ? "Your skill decay risk is HIGH — some of your core skills are losing market value quickly." : decayRisk === 'MEDIUM' ? "Your skill decay risk is MEDIUM — some skills need refreshing." : "Your skill decay risk is LOW — your portfolio is in good shape.";
      return `${riskMsg} Your highest-priority skills to build right now: **${topRetool}**. The Career Readiness Center gives you a 90-day learning sprint, resume checklist, and interview preparation kit tuned to your role.`;
    },
  },
  {
    id: 'financial_runway',
    keywords: ['money', 'runway', 'savings', 'emergency fund', 'expenses', 'afford', 'survive', 'financial', 'budget', 'months', 'unemployed', 'severance', 'visa', 'grace period'],
    tool: { toolName: 'Career Insurance Center', toolRoute: '/tools/career-insurance', emoji: '🔐' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Run an audit to get your financial runway assessment. The Career Insurance Center calculates how long you can survive without income and what steps to take now.";
      const runway = ctx.hybridResult.financialRunway;
      if (!runway) return "Set up your financial profile (monthly salary and expenses) to unlock runway analysis. The Career Insurance Center will then show your full financial resilience picture.";
      const { runwayMonths, tierLabel } = runway;
      const urgency = runwayMonths < 3 ? "This is critically low — immediate action needed." : runwayMonths < 6 ? "This is below the recommended 6-month buffer — start building." : "This meets the minimum safety threshold. Keep building.";
      return `Your estimated financial runway is **${runwayMonths} months** (${tierLabel}). ${urgency} The Career Insurance Center has an interactive runway calculator, emergency fund targets, and scenario planning for best/base/worst case job loss scenarios.`;
    },
  },
  {
    id: 'job_search',
    keywords: ['apply', 'application', 'interview', 'job market', 'hiring', 'recruiter', 'jobs', 'linkedin', 'referral', 'network', 'connection', 'warm intro', 'cold apply', 'search'],
    tool: { toolName: 'Opportunity Radar', toolRoute: '/tools/opportunity-radar', emoji: '🎯' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Run an audit to get job market intelligence for your role. Opportunity Radar then scans for companies actively hiring in your sector.";
      const net = ctx.hybridResult.networkLeverage;
      const market = ctx.hybridResult.roleMarketDemand;
      const demandTrend = market?.snapshot?.demandTrend ?? 'stable';
      const networkMsg = net ? ` Your network tier is **${net.networkTier}** — targeting ${Math.round(net.applicationChannelSplit?.warmReferral ?? 30)}% warm applications will give you a 3× better offer rate than cold applying.` : '';
      return `The job market for your role category shows **${demandTrend}** demand.${networkMsg} Opportunity Radar scans live hiring signals from news and company data to surface companies actively growing their teams right now.`;
    },
  },
  {
    id: 'networking',
    keywords: ['networking', 'network', 'contacts', 'reach out', 'outreach', 'former manager', 'linkedin connect', 'referral', 'relationships', 'warm contact'],
    tool: { toolName: 'Networking OS', toolRoute: '/tools/networking', emoji: '🔗' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "The Networking OS helps you map your network, track contacts, and generate outreach templates — no audit needed. Just set up your profile first.";
      const net = ctx.hybridResult.networkLeverage;
      if (!net) return "Your audit didn't include a network assessment. The Networking OS can still help you track contacts, plan outreach, and build referral intelligence.";
      const warmPct = Math.round(net.applicationChannelSplit?.warmReferral ?? 30);
      return `Your network score is **${Math.round(net.networkScore)}/100** (${net.networkTier} tier). Referral-sourced applications have a 3× higher offer rate — you should target ${warmPct}% of your applications through warm introductions. The Networking OS has your weekly outreach plan ready with personalized message templates for each contact type.`;
    },
  },
  {
    id: 'promotion_internal',
    keywords: ['promotion', 'promoted', 'internal transfer', 'move teams', 'grow at', 'stay and grow', 'internal mobility', 'manager', 'leadership', 'level up', 'title change'],
    tool: { toolName: 'Career Strategy Studio', toolRoute: '/tools/strategy', emoji: '🧭' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Run an audit to get your internal mobility assessment. The Career Strategy Studio analyzes your internal transfer viability and promotion likelihood.";
      const mobility = ctx.hybridResult.internalMobility;
      if (!mobility) return "Your audit didn't include an internal mobility assessment. Re-run with your full profile to unlock the Promotion Strategy in the Career Strategy Studio.";
      const { internalTransferViability, viabilityScore, estimatedTransferTimelineWeeks, isGoldenWindow } = mobility;
      const windowMsg = isGoldenWindow ? " You're in a **golden window** for internal movement right now." : '';
      return `Your internal transfer viability is **${internalTransferViability}** (score: ${Math.round(viabilityScore)}/100). Estimated timeline to transfer: ${estimatedTransferTimelineWeeks} weeks.${windowMsg} The Promotion Strategy panel in the Career Strategy Studio shows your target departments, fit scores, and required skill gaps to get there.`;
    },
  },
  {
    id: 'market_intel',
    keywords: ['market', 'sector', 'industry trend', 'hiring freeze', 'economy', 'recession', 'macro', 'gdp', 'tech layoffs', 'wave', 'forecast', 'geographic', 'city', 'relocate'],
    tool: { toolName: 'Market Intelligence Center', toolRoute: '/tools/market-intel', emoji: '📊' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Run an audit to get macro and sector market intelligence. The Market Intelligence Center shows industry forecasts, geographic demand, and hiring trends.";
      const macro = ctx.hybridResult.macroEconomicRisk;
      const geo = ctx.hybridResult.geographicOptionality;
      const regimeMsg = macro?.regimeNarrative ?? 'Macro signals are mixed.';
      const geoMsg = geo?.highOpportunityMarkets?.slice(0, 2).join(', ');
      return `${regimeMsg}${geoMsg ? ` Top alternative markets for your role: **${geoMsg}**.` : ''} The Market Intelligence Center has a full 12-month sector forecast, geographic demand map, and real-time hiring trend scanner for your industry.`;
    },
  },
  {
    id: 'career_twin',
    keywords: ['profile', 'my data', 'career twin', 'goals', 'preferences', 'history', 'update profile', 'skills inventory', 'career goals'],
    tool: { toolName: 'Career Twin', toolRoute: '/tools/career-twin', emoji: '🤖' },
    answer: (ctx) => {
      const profile = ctx.userProfile;
      const hasProfile = profile && (profile.jobTitle || profile.yearsExperience);
      if (!hasProfile) return "Your Career Twin is your persistent career model. Start by filling in your profile — role, experience, location, and financial situation — to unlock personalized recommendations across all tools.";
      return `Your Career Twin stores your full career model: profile, skills inventory, goals, preferences, and history. The more complete it is, the more personalized every recommendation becomes across all 10 Career OS tools.`;
    },
  },
  {
    id: 'score_explain',
    keywords: ['how is score calculated', 'what is the score', 'explain score', 'score mean', 'methodology', 'how does it work', 'formula', 'dimensions', 'breakdown', 'what does my score'],
    tool: { toolName: 'Layoff Defense Center', toolRoute: '/tools/layoff-defense', emoji: '🛡️' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Your layoff risk score is a 0–100 composite index across 5 dimensions: Company Stability (L1), AI Displacement Risk (D2), Market Demand (L3), Personal Resilience (L4), and Financial Runway (L5). Run your first audit to see your scores.";
      const { total, dimensions, confidencePercent } = ctx.hybridResult;
      const topDim = [...(dimensions ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      const confWord = confidencePercent >= 70 ? 'high' : confidencePercent >= 45 ? 'moderate' : 'limited';
      return `Your score of **${Math.round(total)}/100** is a composite across ${dimensions?.length ?? 5} risk dimensions, computed with ${confWord} confidence (${Math.round(confidencePercent)}%). Your highest-scoring risk dimension is **${topDim?.label ?? topDim?.key ?? 'Company Stability'}** at ${Math.round(topDim?.score ?? 0)}/100. Lower scores are better — 0 means no risk detected on that dimension.`;
    },
  },
  {
    id: 'today_action',
    keywords: ['what should i do', 'today', 'right now', 'urgent', 'immediate', 'first step', 'start', 'action', 'priority', 'most important', 'where to begin'],
    tool: { toolName: 'Layoff Defense Center', toolRoute: '/tools/layoff-defense', emoji: '🛡️' },
    answer: (ctx) => {
      if (!ctx.hybridResult) return "Start with your first audit — enter your company name and job title at the Layoff Audit terminal. It takes about 60 seconds and gives you a full personalized risk picture.";
      const { total, recommendations } = ctx.hybridResult;
      const topRec = recommendations?.find(r => r.priority === 'Critical') ?? recommendations?.[0];
      if (!topRec) return `With a score of ${Math.round(total)}, open the Layoff Defense Center and work through the risk reduction planner — it shows exactly which actions move your score most.`;
      const effort = topRec.effortBadge ?? 'moderate effort';
      return `Your single highest-priority action right now: **${topRec.title}**. Effort: ${effort}. ${total >= 70 ? 'Given your HIGH risk score, do this today — do not wait.' : 'Starting this week puts you ahead of most people in your situation.'}`;
    },
  },
];

// ─── Fallback for unrecognized intent ─────────────────────────────────────────
const FALLBACK_RESPONSE = (q: string, ctx: CopilotContext): CopilotResponse => {
  const hasResult = ctx.hybridResult !== null;
  return {
    text: hasResult
      ? `I'm not sure I have a specific answer for "${q}", but I can help you analyze your career risk, compensation, networking strategy, or skill gaps. Try asking things like: "What's my layoff risk?", "Am I underpaid?", "What should I do today?", or "How does my score work?"`
      : `I don't have audit data to work from yet. Run your first audit at the Layoff Audit terminal, then come back — I'll be able to give you personalized answers about your risk, salary, strategy, and more.`,
    toolCard: hasResult ? undefined : { toolName: 'Layoff Audit', toolRoute: '/terminal', emoji: '⚡' },
    intent: 'fallback',
    confidence: 'low',
  };
};

// ─── Intent classifier ────────────────────────────────────────────────────────
function classifyIntent(question: string) {
  const q = question.toLowerCase();
  for (const intent of INTENTS) {
    const score = intent.keywords.filter(kw => q.includes(kw)).length;
    if (score > 0) return { intent, score };
  }
  return null;
}

// ─── Main service function ────────────────────────────────────────────────────
export function answerQuestion(question: string, ctx: CopilotContext): CopilotResponse {
  if (!question.trim()) return FALLBACK_RESPONSE(question, ctx);

  const match = classifyIntent(question);
  if (!match) return FALLBACK_RESPONSE(question, ctx);

  const { intent } = match;
  const text = intent.answer(ctx, question);
  const keywordHits = intent.keywords.filter(kw => question.toLowerCase().includes(kw)).length;

  return {
    text,
    toolCard: intent.tool,
    intent: intent.id,
    confidence: keywordHits >= 2 ? 'high' : 'medium',
  };
}

// ─── Contextual suggestion chips ─────────────────────────────────────────────
export function getSuggestedQuestions(ctx: CopilotContext): string[] {
  const score = ctx.hybridResult?.total ?? null;

  if (score === null) {
    return [
      "How does the risk score work?",
      "What tools are available?",
      "How do I get started?",
      "What is Career OS?",
      "How accurate is the score?",
    ];
  }

  if (score >= 70) {
    return [
      "What should I do today?",
      "How do I reduce my risk score?",
      "How much financial runway do I have?",
      "Should I start looking for a job?",
      "What's my best escape path?",
    ];
  }

  if (score >= 40) {
    return [
      "Am I underpaid for my role?",
      "How do I future-proof against AI?",
      "Should I ask for a raise?",
      "What skills should I build next?",
      "How's the job market for my role?",
    ];
  }

  return [
    "Should I ask for a raise now?",
    "What are my best career opportunities?",
    "How strong is my network?",
    "What should I learn next?",
    "How do I negotiate a promotion?",
  ];
}

// ─── LLM system prompt builder ────────────────────────────────────────────────
// Serialises HybridResult into a compact structured block for the LLM.
// Keeps token count low: top 3 dimensions, top action, escape path, key fields.
export function buildCopilotSystemPrompt(ctx: CopilotContext): string {
  const hr = ctx.hybridResult;
  const profile = ctx.userProfile;

  const lines: string[] = [
    'You are a Career Copilot embedded in HumanProof, an AI career protection system.',
    'The user is asking questions about their career situation.',
    'Answer specifically and concisely, citing actual numbers from their data.',
    'End every response with a relevant tool recommendation on a new line starting with "→ Tool:".',
    '',
    '=== USER CAREER DATA ===',
  ];

  if (hr) {
    lines.push(`Risk Score: ${Math.round(hr.total ?? 0)}/100 (${hr.total >= 70 ? 'HIGH' : hr.total >= 40 ? 'MODERATE' : 'LOW'} risk)`);
    if (hr.companyName) lines.push(`Company: ${hr.companyName}`);
    lines.push(`Confidence: ${Math.round((hr as any).confidencePercent ?? 0)}%`);

    const topDims = [...(hr.dimensions ?? [])]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);
    if (topDims.length) {
      lines.push(`Top Risk Dimensions: ${topDims.map(d => `${d.label ?? d.key} ${Math.round(d.score ?? 0)}/100`).join(', ')}`);
    }

    const topAction = (hr as any).actionItems?.[0] ?? (hr as any).immediateActions?.[0] ?? (hr as any).recommendations?.[0];
    if (topAction) {
      lines.push(`Top Action: ${topAction.title ?? topAction.action ?? 'See action plan'} (${topAction.effort ?? 'moderate'} effort)`);
    }

    const topPath = hr.escapePaths?.paths?.[0];
    if (topPath) {
      lines.push(`Top Escape Path: ${topPath.title} — ${topPath.effort} effort, ${topPath.timeToImpact} to impact`);
    }

    const runway = hr.financialRunway?.runwayMonths;
    if (runway != null) lines.push(`Financial Runway: ${runway} months`);

    const velocity = (hr as any).trajectoryPtsPerMonth ?? (hr as any).scoreTrajectory?.velocityPtsPerMonth;
    if (velocity != null) lines.push(`Score Velocity: ${velocity > 0 ? '+' : ''}${velocity.toFixed(1)} pts/month`);
  } else {
    lines.push('No audit data available yet — user has not run their first audit.');
  }

  if (profile) {
    const parts: string[] = [];
    if (profile.jobTitle) parts.push(`Role: ${profile.jobTitle}`);
    if (profile.yearsExperience) parts.push(`Experience: ${profile.yearsExperience} yrs`);
    if (profile.metro) parts.push(`Location: ${profile.metro}`);
    if (profile.visaStatus && profile.visaStatus !== 'citizen') parts.push(`Visa: ${profile.visaStatus}`);
    if (parts.length) lines.push(`Profile: ${parts.join(' | ')}`);
  }

  lines.push('=== END USER DATA ===');
  return lines.join('\n');
}

// ─── LLM-powered answer ───────────────────────────────────────────────────────
// Calls llm-analyze EF with copilotMode flag and conversation history.
// Falls back to deterministic answerQuestion() on any failure.
export async function answerWithLLM(
  messages: Array<{ role: 'user' | 'copilot'; text: string }>,
  ctx: CopilotContext,
  userId: string,
): Promise<CopilotResponse> {
  try {
    const systemContext = buildCopilotSystemPrompt(ctx);

    // Format conversation history for the LLM (last 8 turns max to stay within token budget)
    const history = messages.slice(-8).map(m => ({
      role: m.role === 'copilot' ? 'assistant' : 'user',
      content: m.text,
    }));

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('No auth token');

    const supabaseUrl = (supabase as any).supabaseUrl as string;
    const efUrl = `${supabaseUrl}/functions/v1/llm-analyze`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(efUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          copilotMode: true,
          systemContext,
          conversationHistory: history,
          userId,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) throw new Error(`EF HTTP ${res.status}`);
    const data = await res.json() as Record<string, unknown>;

    const reply = (data.reply as string) ?? (data.synthesis as string) ?? '';
    if (!reply) throw new Error('Empty reply from EF');

    // Detect which tool to recommend from the reply text
    const replyLower = reply.toLowerCase();
    const toolCard = replyLower.includes('layoff defense') ? { toolName: 'Layoff Defense Center', toolRoute: '/tools/layoff-defense', emoji: '🛡️' }
      : replyLower.includes('compensation') ? { toolName: 'Compensation Intelligence', toolRoute: '/tools/compensation', emoji: '💰' }
      : replyLower.includes('ai defense') || replyLower.includes('ai career') ? { toolName: 'AI Career Defense', toolRoute: '/tools/ai-defense', emoji: '🤖' }
      : replyLower.includes('strategy') ? { toolName: 'Career Strategy Studio', toolRoute: '/tools/strategy', emoji: '🧭' }
      : replyLower.includes('networking') ? { toolName: 'Networking OS', toolRoute: '/tools/networking', emoji: '🔗' }
      : replyLower.includes('career insurance') ? { toolName: 'Career Insurance Center', toolRoute: '/tools/career-insurance', emoji: '🔐' }
      : undefined;

    return {
      text: reply,
      toolCard,
      intent: 'llm',
      confidence: 'high',
    };
  } catch {
    // Deterministic fallback — always works, no network required
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    return answerQuestion(lastUserMsg?.text ?? '', ctx);
  }
}
