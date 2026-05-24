// multi-model-analyze/index.ts
// Secure AI proxy — DeepSeek (primary) → Gemini → Groq (fallbacks).
// Keys are held server-side; the browser never receives them.
//
// Env vars required (set at least one):
//   DEEPSEEK_API_KEY  — https://platform.deepseek.com  (paid, ~$0.14/M tokens)
//   GEMINI_API_KEY    — https://aistudio.google.com    (free tier: 1500 req/day)
//   GROQ_API_KEY      — https://console.groq.com       (free tier: 14400 req/day)
//
// Fallback chain: DeepSeek → Gemini → Groq
// Deploy: supabase functions deploy multi-model-analyze
// Called by: src/services/ensemble/aiProxy.ts

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const errJson = (msg: string, status: number) =>
  new Response(
    JSON.stringify({ error: msg, content: null, success: false }),
    { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );

// ── Auth ─────────────────────────────────────────────────────────────────────
async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return errJson('Missing Authorization header', 401);
  }
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return errJson('Invalid or expired token', 401);
  } catch {
    return errJson('Auth check failed', 401);
  }
  return null;
}

// ── DeepSeek (OpenAI-compatible API) ─────────────────────────────────────────
async function callDeepSeek(
  apiKey: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  wantJson: boolean,
): Promise<string | null> {
  try {
    const body: Record<string, unknown> = {
      model:       'deepseek-chat',
      max_tokens:  maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    };
    if (wantJson) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[multi-model/deepseek] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e: any) {
    console.error('[multi-model/deepseek] Error:', e?.message);
    return null;
  }
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function callGemini(
  apiKey: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  wantJson: boolean,
): Promise<string | null> {
  try {
    const model  = 'gemini-2.0-flash';
    const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const genConfig: Record<string, unknown> = {
      temperature,
      maxOutputTokens: maxTokens,
    };
    if (wantJson) genConfig.responseMimeType = 'application/json';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: genConfig,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[multi-model/gemini] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (e: any) {
    console.error('[multi-model/gemini] Error:', e?.message);
    return null;
  }
}

// ── Groq (OpenAI-compatible, free tier: 14400 req/day) ───────────────────────
async function callGroq(
  apiKey: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  wantJson: boolean,
): Promise<string | null> {
  try {
    const body: Record<string, unknown> = {
      model:       'llama-3.1-8b-instant',   // fast, free, good at JSON
      max_tokens:  maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    };
    if (wantJson) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[multi-model/groq] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e: any) {
    console.error('[multi-model/groq] Error:', e?.message);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const authFail = await requireAuth(req);
  if (authFail) return authFail;

  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
  const geminiKey   = Deno.env.get('GEMINI_API_KEY');
  const groqKey     = Deno.env.get('GROQ_API_KEY');

  if (!deepseekKey && !geminiKey && !groqKey) {
    return errJson('No AI provider keys configured', 503);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return errJson('Invalid JSON body', 400); }

  const { prompt, max_tokens = 400, temperature = 0.1, response_format = 'json_object' } = body;

  if (!prompt || typeof prompt !== 'string') {
    return errJson('prompt is required and must be a string', 400);
  }
  if ((prompt as string).length > 16_000) {
    return errJson('prompt too long (max 16 000 chars)', 413);
  }
  if (typeof max_tokens !== 'number' || max_tokens < 1 || max_tokens > 4096) {
    return errJson('max_tokens out of range (1–4096)', 400);
  }
  if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
    return errJson('temperature out of range (0–2)', 400);
  }

  const wantJson = response_format === 'json_object';

  // ── Fallback chain: DeepSeek → Gemini → Groq ────────────────────────────
  let content: string | null = null;
  let modelUsed = 'unknown';

  if (deepseekKey) {
    content = await callDeepSeek(deepseekKey, prompt as string, max_tokens as number, temperature as number, wantJson);
    if (content) {
      modelUsed = 'deepseek-chat';
    } else {
      console.info('[multi-model-analyze] DeepSeek failed — trying Gemini');
    }
  }

  if (!content && geminiKey) {
    content = await callGemini(geminiKey, prompt as string, max_tokens as number, temperature as number, wantJson);
    if (content) {
      modelUsed = 'gemini/gemini-2.0-flash';
    } else {
      console.info('[multi-model-analyze] Gemini failed — trying Groq');
    }
  }

  if (!content && groqKey) {
    content = await callGroq(groqKey, prompt as string, max_tokens as number, temperature as number, wantJson);
    if (content) modelUsed = 'groq/llama-3.1-8b-instant';
  }

  if (!content) {
    return new Response(
      JSON.stringify({ error: 'all_providers_failed', content: null, success: false }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ content, success: true, model: modelUsed }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );
});
