// multi-model-analyze/index.ts
// Secure OpenRouter proxy — holds OPENROUTER_API_KEY server-side.
// The browser never receives the raw API key (security fix from v6.0 audit).
//
// Env vars required:
//   OPENROUTER_API_KEY — set in Supabase dashboard > Edge Functions > Secrets
//
// Deploy: supabase functions deploy multi-model-analyze
// Called by: src/services/ensemble/openRouterProxy.ts

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

// v40 hardening: require valid Supabase JWT. Without this, the EF is an
// open OpenRouter relay — anonymous callers can burn OPENROUTER_API_KEY
// credits and bypass any frontend rate limiting. 401 on bad auth.
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
  'anthropic/claude-haiku-4-5-20251001',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const authFail = await requireAuth(req);
  if (authFail) return authFail;

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
      return errJson('model and prompt are required', 400);
    }
    if (typeof model !== 'string' || typeof prompt !== 'string') {
      return errJson('model and prompt must be strings', 400);
    }
    if (prompt.length > 16_000) {
      return errJson('prompt too long (max 16 000 chars)', 413);
    }
    if (typeof max_tokens !== 'number' || max_tokens < 1 || max_tokens > 4096) {
      return errJson('max_tokens out of range (1-4096)', 400);
    }
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      return errJson('temperature out of range (0-2)', 400);
    }

    if (!ALLOWED_MODELS.has(model)) {
      return errJson(`Model not allowed: ${model}`, 400);
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
      // v40: do not propagate upstream status to caller — a 401 from
      // OpenRouter would look like a Supabase auth failure to the browser.
      // Always return 502 Bad Gateway and put the real status in the body.
      return new Response(
        JSON.stringify({
          error: 'upstream_error',
          upstream_status: orRes.status,
          content: null,
          success: false,
        }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const orData = await orRes.json();
    const content = orData?.choices?.[0]?.message?.content ?? null;

    return new Response(
      JSON.stringify({ content, success: content !== null, model }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    // v40: do not leak raw upstream / runtime error messages to clients —
    // they can contain stack traces, URLs, or fragments of API keys. Log
    // server-side and return a generic message.
    console.error('[multi-model-analyze] Error:', err?.message);
    return errJson('internal_error', 500);
  }
});
