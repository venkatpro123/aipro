import {
  buildPromptPackage,
  normalizeAnalyzeRequest,
  normalizeModelResponse,
  validateModelResponse,
} from './promptFramework.ts';
// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from '../_shared/otel.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Model cascade. The previous entry `google/gemini-flash-1.5-8b` was retired
// on OpenRouter (returns 404 "No endpoints found"). Replaced with the current
// equivalent. Order = cheapest-first; Promise.any in the risk_analysis path
// races them, and the news_entity_extraction path falls through one-by-one.
const MODELS = [
  'google/gemini-2.5-flash-lite',
  'mistralai/mistral-7b-instruct',
  'meta-llama/llama-3.1-8b-instruct',
];

async function callOpenRouter(
  apiKey: string,
  model: string,
  promptPackage: ReturnType<typeof buildPromptPackage>,
): Promise<{ text: string; model: string; tokensUsed: number }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://humanproof.ai',
      'X-Title': 'HumanProof Risk Analysis',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: promptPackage.systemPrompt },
        { role: 'user', content: promptPackage.userPrompt },
      ],
      temperature: 0.15,
      max_tokens: promptPackage.maxTokens,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status} (${model}): ${errText.slice(0, 240)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const tokensUsed = (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);

  if (!text) throw new Error(`Empty response from ${model}`);
  return { text, model, tokensUsed };
}

function parseJsonFromText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Continue to extraction.
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }

  throw new Error('Response did not contain parseable JSON');
}

// ── News-entity extraction (v22.0) ────────────────────────────────────────────
// Called by `ingest-news` for every headline that passes the regex pre-filter.
// Returns a structured extraction the ingestor uses to decide insert/skip and
// to canonicalise aliases.
interface NewsExtraction {
  isLayoff: boolean;
  companyName: string | null;
  aliases: string[];
  percentCut: number | null;
  affectedCount: number | null;
  confidence: 'high' | 'medium' | 'low';
  region: 'US' | 'IN' | 'EU' | 'other';
  eventDate: string | null;
  industry: string | null;
}

function buildNewsExtractionPrompt(headline: string, snippet: string): { systemPrompt: string; userPrompt: string; maxTokens: number } {
  const systemPrompt =
    `You are a precise news-entity extractor for a layoff-tracking system.\n` +
    `Given a single news headline and optional snippet, decide whether it describes a layoff/workforce-reduction event at a specific company, and extract structured fields.\n` +
    `Strict rules:\n` +
    `- isLayoff=true ONLY for confirmed/imminent reductions in headcount at a specific named company. False for product launches, financial reports, opinion pieces, market commentary, or rumors without attribution.\n` +
    `- companyName must be the SHORTEST recognisable form ("TCS" not "Tata Consultancy Services Limited", "Meta" not "Meta Platforms").\n` +
    `- aliases: 0-3 alternate spellings (legal names, common abbreviations). Empty if obvious.\n` +
    `- percentCut: workforce % cut as a number (e.g. 5 means 5%). null if not stated.\n` +
    `- affectedCount: absolute headcount affected as an integer. null if not stated.\n` +
    `- confidence: 'high' for SEC filings / company press releases / WARN notices; 'medium' for established business press; 'low' for social media / rumors / unattributed.\n` +
    `- region: best guess from the company HQ.\n` +
    `- eventDate: YYYY-MM-DD if explicitly stated; null otherwise (caller falls back to article pubDate).\n` +
    `- industry: short sector label (e.g. "Technology", "Finance", "Retail", "Healthcare", "Manufacturing"). null if unclear.\n` +
    `Return ONLY a JSON object matching the schema. No prose, no markdown.`;
  const userPrompt =
    `Headline: ${headline}\n` +
    (snippet ? `Snippet: ${snippet}\n` : '') +
    `\nReturn JSON: { "isLayoff": boolean, "companyName": string|null, "aliases": string[], "percentCut": number|null, "affectedCount": number|null, "confidence": "high"|"medium"|"low", "region": "US"|"IN"|"EU"|"other", "eventDate": "YYYY-MM-DD"|null, "industry": string|null }`;
  return { systemPrompt, userPrompt, maxTokens: 220 };
}

function validateNewsExtraction(raw: unknown): NewsExtraction | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.isLayoff !== 'boolean') return null;
  const allowedConfidence = ['high', 'medium', 'low'];
  const allowedRegion = ['US', 'IN', 'EU', 'other'];
  const confidence = typeof o.confidence === 'string' && allowedConfidence.includes(o.confidence)
    ? (o.confidence as NewsExtraction['confidence']) : 'low';
  const region = typeof o.region === 'string' && allowedRegion.includes(o.region)
    ? (o.region as NewsExtraction['region']) : 'other';
  const percentCut = typeof o.percentCut === 'number' && Number.isFinite(o.percentCut) && o.percentCut > 0 && o.percentCut <= 100
    ? o.percentCut : null;
  const affectedCount = typeof o.affectedCount === 'number' && Number.isFinite(o.affectedCount) && o.affectedCount > 0
    ? Math.round(o.affectedCount) : null;
  const eventDate = typeof o.eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.eventDate)
    ? o.eventDate : null;
  const industry = typeof o.industry === 'string' && o.industry.length > 1
    ? o.industry.slice(0, 80)
    : null;
  return {
    isLayoff: o.isLayoff,
    companyName: typeof o.companyName === 'string' && o.companyName.length > 1 ? o.companyName : null,
    aliases: Array.isArray(o.aliases)
      ? o.aliases.filter((a): a is string => typeof a === 'string' && a.length > 1).slice(0, 5)
      : [],
    percentCut,
    affectedCount,
    confidence,
    region,
    eventDate,
    industry,
  };
}

async function handleNewsExtraction(req: Request, openrouterKey: string): Promise<Response> {
  let body: { headline?: unknown; snippet?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }
  const headline = typeof body.headline === 'string' ? body.headline.slice(0, 500) : '';
  const snippet  = typeof body.snippet  === 'string' ? body.snippet.slice(0, 500) : '';
  if (!headline) return json({ error: 'headline required' }, 400);

  const prompt = buildNewsExtractionPrompt(headline, snippet);

  // News extraction is time-sensitive but a 404 on the primary model would make
  // every cron tick silently lose all candidates. Walk the cascade sequentially
  // so one retired/unavailable model doesn't kill the pipeline.
  const errors: string[] = [];
  for (const model of MODELS) {
    try {
      const { text, tokensUsed } = await callOpenRouter(openrouterKey, model, prompt);
      const parsed = parseJsonFromText(text);
      const validated = validateNewsExtraction(parsed);
      if (!validated) {
        errors.push(`${model}: validation failed`);
        continue;
      }
      return json({ success: true, model, tokensUsed, extraction: validated });
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return json({ success: false, error: errors.join(' | ') });
}

Deno.serve((req) =>
  withRun('llm-analyze', req, async (_run) => {
  // Branch on mode BEFORE consuming the body in the legacy path.
  // Note: we must peek without consuming, so clone the request.
  let mode: string | undefined;
  try {
    const peek = await req.clone().json();
    if (peek && typeof peek === 'object') mode = (peek as { mode?: string }).mode;
  } catch { /* malformed body — handled below */ }

  const openrouterKey = Deno.env.get('OPENROUTER_KEY');
  if (!openrouterKey) {
    console.warn('[llm-analyze] OPENROUTER_KEY not configured');
    return json({ success: false, fallback: true, error: 'OPENROUTER_KEY not configured' });
  }

  if (mode === 'news_entity_extraction') {
    return handleNewsExtraction(req, openrouterKey);
  }

  try {
    const rawBody = await req.json();
    const normalizedRequest = normalizeAnalyzeRequest(rawBody);

    if (!normalizedRequest.companyName || !normalizedRequest.roleTitle) {
      return json({ error: 'companyName and roleTitle required' }, 400);
    }

    const promptPackage = buildPromptPackage(normalizedRequest);

    const modelRaces = MODELS.map((model) =>
      callOpenRouter(openrouterKey, model, promptPackage).then(({ text, tokensUsed }) => {
        const parsed = parseJsonFromText(text);
        const normalizedResponse = normalizeModelResponse(parsed, normalizedRequest);
        const validationFailures = validateModelResponse(normalizedResponse, normalizedRequest);
        if (validationFailures.length > 0) {
          throw new Error(`${model} validation failed: ${validationFailures.join(' | ')}`);
        }
        return { parsed: normalizedResponse, model, tokensUsed };
      })
    );

    let winner: { parsed: ReturnType<typeof normalizeModelResponse>; model: string; tokensUsed: number } | null = null;
    const errors: string[] = [];

    try {
      winner = await Promise.any(modelRaces);
    } catch (aggregateError: unknown) {
      const errorList = aggregateError instanceof AggregateError ? aggregateError.errors : [];
      for (const error of errorList) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (winner) {
      console.log(
        `[llm-analyze] accepted ${winner.model} | tokens ${winner.tokensUsed} | urgency ${winner.parsed.urgencyLevel}`,
      );
      return json({
        success: true,
        model: winner.model,
        tokensUsed: winner.tokensUsed,
        ...winner.parsed,
      });
    }

    console.error('[llm-analyze] All models failed:', errors.join(' | '));
    return json({
      success: false,
      fallback: true,
      error: errors.join(' | ') || 'No model returned a valid, instruction-compliant response',
      primaryRiskDriver: null,
      sixMonthInactionConsequence: null,
      oneActionThisWeek: null,
      whatChangesRiskMost: null,
      estimatedTimeline: null,
      keyProtectiveFactor: null,
      patternId: null,
      dominantRiskFactor: null,
      timeHorizon: null,
      urgencyLevel: null,
      synthesis: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[llm-analyze] Fatal:', message);
    return json({ success: false, fallback: true, error: message }, 500);
  }
  }));
