// aiProxy.ts
// Secure AI proxy — DeepSeek (primary) → Gemini → Groq (fallbacks).
//
// All calls go through the Supabase Edge Function 'multi-model-analyze'
// which holds the API keys server-side. The browser never receives the keys.
//
// Architecture:
//   Browser → aiProxy.ts → multi-model-analyze EF → DeepSeek API (primary)
//                                                 ↘ Gemini API   (fallback 1)
//                                                 ↘ Groq API     (fallback 2, free tier)
//
// The EF handles the primary/fallback routing internally; this client just
// calls the EF and normalises the response.

import { invokeEdgeFunction } from '../../infrastructure/requestId';
import { recordApiDegradation, isRateLimitError } from '../apiDegradationMonitor';

export interface AiProxyRequest {
  prompt:          string;
  maxTokens?:      number;
  temperature?:    number;
  responseFormat?: 'json_object' | 'text';
}

export interface AiProxyResponse {
  content:  string | null;
  success:  boolean;
  model:    string;
  error?:   string;
  via:      'edge_function' | 'direct_dev';
}

/**
 * Call the AI proxy (DeepSeek→Gemini→Groq) via Supabase Edge Function.
 * Falls back to direct browser call ONLY in localhost dev when
 * VITE_DEEPSEEK_API_KEY / VITE_GEMINI_API_KEY / VITE_GROQ_API_KEY is set.
 */
export async function callAiProxy(req: AiProxyRequest): Promise<AiProxyResponse> {
  // ── Production path: Edge Function holds the keys ──────────────────────
  try {
    const { data, error } = await invokeEdgeFunction<any>('multi-model-analyze', {
      body: {
        prompt:          req.prompt,
        max_tokens:      req.maxTokens ?? 400,
        temperature:     req.temperature ?? 0.1,
        response_format: req.responseFormat ?? 'json_object',
      },
    });

    if (!error && data?.content) {
      return {
        content: data.content,
        success: true,
        model:   data.model ?? 'deepseek-chat',
        via:     'edge_function',
      };
    }

    if (error) {
      if (isRateLimitError(error)) recordApiDegradation('supabase_osint', 'rate_limited', error.message);
      else recordApiDegradation('supabase_osint', 'network_error', error.message);
    }
  } catch (efErr: any) {
    recordApiDegradation('supabase_osint', 'network_error', String(efErr?.message ?? efErr));
  }

  // ── Dev fallback: direct AI call (localhost only, 3-tier) ───────────────
  const devDeepSeekKey = (import.meta as any).env?.VITE_DEEPSEEK_API_KEY as string | undefined;
  const devGeminiKey   = (import.meta as any).env?.VITE_GEMINI_API_KEY   as string | undefined;
  const devGroqKey     = (import.meta as any).env?.VITE_GROQ_API_KEY     as string | undefined;
  const isLocalhost    = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocalhost && (devDeepSeekKey || devGeminiKey || devGroqKey)) {
    // Tier 1: DeepSeek (fast, cheap — requires credits)
    if (devDeepSeekKey) {
      try {
        const body: Record<string, unknown> = {
          model:       'deepseek-chat',
          messages:    [{ role: 'user', content: req.prompt }],
          temperature: req.temperature ?? 0.1,
          max_tokens:  req.maxTokens ?? 400,
        };
        if (req.responseFormat === 'json_object') {
          body.response_format = { type: 'json_object' };
        }

        const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${devDeepSeekKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
          signal:  AbortSignal.timeout(20_000),
        });

        if (res.ok) {
          const json    = await res.json();
          const content = json.choices?.[0]?.message?.content ?? null;
          if (content) return { content, success: true, model: 'deepseek-chat', via: 'direct_dev' };
        }
        console.warn('[aiProxy] Dev DeepSeek failed — trying Gemini');
      } catch (e: any) {
        console.warn('[aiProxy] Dev DeepSeek error:', e?.message);
      }
    }

    // Tier 2: Gemini (free 1500 req/day, resets daily)
    if (devGeminiKey) {
      try {
        const model   = 'gemini-2.0-flash';
        const url     = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${devGeminiKey}`;
        const genConf: Record<string, unknown> = {
          temperature:     req.temperature ?? 0.1,
          maxOutputTokens: req.maxTokens ?? 400,
        };
        if (req.responseFormat === 'json_object') genConf.responseMimeType = 'application/json';

        const res = await fetch(url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            contents:         [{ role: 'user', parts: [{ text: req.prompt }] }],
            generationConfig: genConf,
          }),
          signal: AbortSignal.timeout(20_000),
        });

        if (res.ok) {
          const json    = await res.json();
          const content = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
          if (content) return { content, success: true, model: `gemini/${model}`, via: 'direct_dev' };
        }
        console.warn('[aiProxy] Dev Gemini failed — trying Groq');
      } catch (e: any) {
        console.warn('[aiProxy] Dev Gemini error:', e?.message);
      }
    }

    // Tier 3: Groq (free 14400 req/day — reliable fallback)
    if (devGroqKey) {
      try {
        const body: Record<string, unknown> = {
          model:       'llama-3.1-8b-instant',
          messages:    [{ role: 'user', content: req.prompt }],
          temperature: req.temperature ?? 0.1,
          max_tokens:  req.maxTokens ?? 400,
        };
        if (req.responseFormat === 'json_object') {
          body.response_format = { type: 'json_object' };
        }

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${devGroqKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
          signal:  AbortSignal.timeout(15_000),
        });

        if (res.ok) {
          const json    = await res.json();
          const content = json.choices?.[0]?.message?.content ?? null;
          if (content) return { content, success: true, model: 'groq/llama-3.1-8b-instant', via: 'direct_dev' };
        }
      } catch (e: any) {
        console.warn('[aiProxy] Dev Groq error:', e?.message);
      }
    }
  }

  return {
    content: null,
    success: false,
    model:   'unavailable',
    error:   'AI proxy unavailable (no Edge Function + no dev key)',
    via:     'edge_function',
  };
}

// ── Backward-compat re-export ─────────────────────────────────────────────────
// Code that imported callOpenRouterProxy can do a one-line rename import.
// The type shapes are identical so callers only need to update the import path.
export type OpenRouterProxyRequest  = AiProxyRequest  & { model?: string };
export type OpenRouterProxyResponse = AiProxyResponse;

/** @deprecated Use callAiProxy instead */
export async function callOpenRouterProxy(req: OpenRouterProxyRequest): Promise<AiProxyResponse> {
  return callAiProxy(req);
}
