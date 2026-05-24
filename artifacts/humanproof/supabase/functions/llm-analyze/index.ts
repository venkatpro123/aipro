// llm-analyze/index.ts
//
// AI intelligence brief generator — DeepSeek (primary) → Gemini → Groq (fallbacks).
//
// Called by: src/services/intelligenceBriefService.ts (fetchIntelligenceBrief)
//            src/services/ensemble/ensembleOrchestrator.ts
//
// Env vars required (set at least one):
//   DEEPSEEK_API_KEY  — https://platform.deepseek.com  (paid, ~$0.14/M tokens)
//   GEMINI_API_KEY    — https://aistudio.google.com    (free tier: 1500 req/day)
//   GROQ_API_KEY      — https://console.groq.com       (free tier: 14400 req/day)
//   SUPABASE_URL, SUPABASE_ANON_KEY — set automatically by Supabase
//
// Architecture:
//   1. Try DeepSeek (deepseek-chat) — cheap, fast, excellent at structured JSON
//   2. On any failure → fall back to Gemini (gemini-2.0-flash)
//   3. On Gemini failure → fall back to Groq (llama-3.1-8b-instant, free tier)
//   All models use the same prompt; response schema is identical
//
// Returns JSON with fields:
//   primaryRiskDriver, synthesis, urgencyLevel, oneActionThisWeek,
//   whatChangesRiskMost, estimatedTimeline, model

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const errJson = (msg: string, status = 500) =>
  new Response(
    JSON.stringify({ error: msg }),
    { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );

// ── Auth ────────────────────────────────────────────────────────────────────
async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return errJson('Missing Authorization header', 401);
  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) return errJson('Invalid or expired token', 401);
  } catch {
    return errJson('Auth check failed', 401);
  }
  return null;
}

// ── DeepSeek call ───────────────────────────────────────────────────────────
// DeepSeek uses OpenAI-compatible API. Model: deepseek-chat (DeepSeek-V3).
async function callDeepSeek(
  apiKey: string,
  system: string,
  userMessage: string,
): Promise<{ text: string; model: string } | null> {
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'deepseek-chat',
        max_tokens:  700,
        temperature: 0.1,
        messages: [
          { role: 'system',  content: system      },
          { role: 'user',    content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[llm-analyze/deepseek] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data?.choices?.[0]?.message?.content ?? '';
    return text ? { text, model: 'deepseek-chat' } : null;
  } catch (e: any) {
    console.error('[llm-analyze/deepseek] Error:', e?.message);
    return null;
  }
}

// ── Gemini call ─────────────────────────────────────────────────────────────
// Gemini uses its own REST API format. Model: gemini-2.0-flash (fast + cheap).
async function callGemini(
  apiKey: string,
  system: string,
  userMessage: string,
): Promise<{ text: string; model: string } | null> {
  try {
    const model = 'gemini-2.0-flash';
    const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature:     0.1,
          maxOutputTokens: 700,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[llm-analyze/gemini] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return text ? { text, model: `gemini/${model}` } : null;
  } catch (e: any) {
    console.error('[llm-analyze/gemini] Error:', e?.message);
    return null;
  }
}

// ── Groq call (OpenAI-compatible, free tier: 14400 req/day) ─────────────────
async function callGroq(
  apiKey: string,
  system: string,
  userMessage: string,
): Promise<{ text: string; model: string } | null> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.1-8b-instant',
        max_tokens:  700,
        temperature: 0.1,
        messages: [
          { role: 'system', content: system      },
          { role: 'user',   content: userMessage },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[llm-analyze/groq] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data?.choices?.[0]?.message?.content ?? '';
    return text ? { text, model: 'groq/llama-3.1-8b-instant' } : null;
  } catch (e: any) {
    console.error('[llm-analyze/groq] Error:', e?.message);
    return null;
  }
}

// ── Clean & parse JSON ──────────────────────────────────────────────────────
function parseJsonResponse(raw: string): Record<string, string> | null {
  // Strip markdown code fences if the model added them despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ── Main handler ────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const authFail = await requireAuth(req);
  if (authFail) return authFail;

  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
  const geminiKey   = Deno.env.get('GEMINI_API_KEY');
  const groqKey     = Deno.env.get('GROQ_API_KEY');

  if (!deepseekKey && !geminiKey && !groqKey) {
    return errJson('No AI provider keys configured (DEEPSEEK_API_KEY / GEMINI_API_KEY / GROQ_API_KEY)', 503);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return errJson('Invalid JSON body', 400); }

  const {
    companyName        = 'Unknown company',
    roleTitle          = 'Unknown role',
    engineScore        = 0,
    engineBreakdown    = '',
    signalContext      = '',
    structuredContext  = '',
    userProfileContext = '',
    analysisInstructions = '',
    careerMarketContext  = '',
    regionalMarketContext = '',
  } = body as Record<string, string | number>;

  // ── System prompt ──────────────────────────────────────────────────────────
  const system = `You are a career intelligence analyst specialising in tech-sector layoff risk. \
You produce concise, evidence-based briefs for individual employees. \
Rules you must NEVER break:
1. Do NOT fabricate statistics, dates, or numbers not present in the provided data.
2. Do NOT use vague phrases ("multiple factors", "various risks", "consider upskilling").
3. Cite specific signals by name, not category.
4. The "oneActionThisWeek" field MUST reference at least one concrete number from \
the career market context when provided. A response like "build a project in your target field" \
is unacceptable. A response like "Build a production dbt transformation pipeline and push to \
GitHub — Data Engineering has 12,000 active openings in India and this is the hiring bar" is acceptable.
5. Format: respond with ONLY valid JSON matching the schema below. No markdown, no prose outside JSON.

Response schema:
{
  "primaryRiskDriver": "1–2 sentence specific risk driver citing actual signal names",
  "synthesis":         "2–3 sentence situation summary with specific numbers from structuredContext",
  "urgencyLevel":      "CRITICAL | HIGH | MODERATE | LOW",
  "oneActionThisWeek": "1 concrete action this week, citing at least one market number when available",
  "whatChangesRiskMost": "What single signal change would most shift the score, and by how much",
  "estimatedTimeline": "If trajectory continues unchanged, what happens in 30/60/90 days"
}`;

  // ── User message ───────────────────────────────────────────────────────────
  const userParts: string[] = [];
  userParts.push(`COMPANY: ${companyName}  |  ROLE: ${roleTitle}  |  RISK SCORE: ${engineScore}/100`);
  if (engineBreakdown)       userParts.push(`ENGINE BREAKDOWN:\n${engineBreakdown}`);
  if (signalContext)         userParts.push(`SIGNAL CONTEXT:\n${signalContext}`);
  if (structuredContext)     userParts.push(`GROUND TRUTH SIGNALS (cite these, do not invent alternatives):\n${structuredContext}`);
  if (userProfileContext)    userParts.push(`USER PROFILE (frame the brief around this person's situation):\n${userProfileContext}`);
  if (regionalMarketContext) userParts.push(`REGIONAL MARKET CONTEXT:\n${regionalMarketContext}`);

  if (careerMarketContext) {
    userParts.push(
      `CAREER MARKET CONTEXT (you MUST cite at least one of these numbers in oneActionThisWeek):\n` +
      careerMarketContext,
    );
    userParts.push(
      `INSTRUCTION FOR oneActionThisWeek: In oneActionThisWeek, cite at least one number from ` +
      `the market context above. Example: ` +
      `"[Target role] has [count] active openings. The hiring bar is [hiringBar]. ` +
      `Build [proofOfCompetency] this week."`,
    );
  } else {
    userParts.push(
      `INSTRUCTION FOR oneActionThisWeek: Give one specific, concrete action. ` +
      `Include at least one number. Do NOT use generic advice like "build a project".`,
    );
  }

  if (analysisInstructions) userParts.push(`ADDITIONAL INSTRUCTIONS:\n${analysisInstructions}`);
  userParts.push('Respond with ONLY valid JSON. No markdown fences, no prose.');

  const userMessage = userParts.join('\n\n---\n\n');

  // ── Fallback chain: DeepSeek → Gemini → Groq ───────────────────────────────
  let rawResult: { text: string; model: string } | null = null;

  if (deepseekKey) {
    rawResult = await callDeepSeek(deepseekKey, system, userMessage);
    if (!rawResult) console.info('[llm-analyze] DeepSeek failed — trying Gemini');
  }

  if (!rawResult && geminiKey) {
    rawResult = await callGemini(geminiKey, system, userMessage);
    if (!rawResult) console.info('[llm-analyze] Gemini failed — trying Groq');
  }

  if (!rawResult && groqKey) {
    rawResult = await callGroq(groqKey, system, userMessage);
  }

  if (!rawResult) {
    return errJson('All AI providers failed', 502);
  }

  const parsed = parseJsonResponse(rawResult.text);

  if (!parsed) {
    console.error(`[llm-analyze] JSON parse failure (${rawResult.model}). Preview: ${rawResult.text.slice(0, 200)}`);
    return new Response(
      JSON.stringify({
        fallback:       true,
        fallbackReason: 'json_parse_failure',
        model:          rawResult.model,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ ...parsed, model: rawResult.model }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );
});
