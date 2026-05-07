// multi-model-analyze/index.ts
// Secure OpenRouter proxy — holds OPENROUTER_API_KEY server-side.
// The browser never receives the raw API key (security fix from v6.0 audit).
//
// Env vars required:
//   OPENROUTER_API_KEY — set in Supabase dashboard > Edge Functions > Secrets
//
// Deploy: supabase functions deploy multi-model-analyze
// Called by: src/services/ensemble/openRouterProxy.ts

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Models allowed through this proxy — prevents abuse if key leaks
const ALLOWED_MODELS = new Set([
  'mistralai/mistral-7b-instruct',
  'mistralai/mixtral-8x7b-instruct',
  'meta-llama/llama-3-8b-instruct',
  'meta-llama/llama-3-70b-instruct',
  'google/gemma-7b-it',
  'nousresearch/nous-hermes-2-mixtral-8x7b-dpo',
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku',
  'anthropic/claude-3-5-haiku',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterKey) {
    return new Response(
      JSON.stringify({ error: 'OPENROUTER_API_KEY not configured', content: null, success: false }),
      { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json();
    const { model, prompt, max_tokens = 400, temperature = 0.1, response_format = 'json_object' } = body;

    if (!model || !prompt) {
      return new Response(
        JSON.stringify({ error: 'model and prompt are required', content: null, success: false }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    if (!ALLOWED_MODELS.has(model)) {
      return new Response(
        JSON.stringify({ error: `Model not allowed: ${model}`, content: null, success: false }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const orBody: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens,
      temperature,
    };
    if (response_format === 'json_object') {
      orBody.response_format = { type: 'json_object' };
    }

    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${openRouterKey}`,
        'Content-Type':   'application/json',
        'HTTP-Referer':   'https://humanproof.app',
        'X-Title':        'HumanProof',
      },
      body: JSON.stringify(orBody),
      signal: AbortSignal.timeout(25000),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.error(`[multi-model-analyze] OpenRouter ${orRes.status}:`, errText);
      return new Response(
        JSON.stringify({ error: `OpenRouter error ${orRes.status}`, content: null, success: false }),
        { status: orRes.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const orData = await orRes.json();
    const content = orData?.choices?.[0]?.message?.content ?? null;

    return new Response(
      JSON.stringify({ content, success: content !== null, model }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[multi-model-analyze] Error:', err?.message);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Proxy error', content: null, success: false }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
