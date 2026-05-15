// openRouterProxy.ts
// v6.0 Audit Fix — API Key Security
//
// The audit identified: VITE_OPENROUTER_API_KEY is in the browser bundle,
// exposed to any user who inspects the JavaScript. This means:
//   1. Key can be extracted and used by others (quota exhaustion)
//   2. Rate limit abuse by malicious actors targeting HumanProof users
//
// Fix: all OpenRouter calls must go through the Supabase Edge Function
// 'multi-model-analyze' which holds the key server-side. The browser
// never sends the raw API key.
//
// The VITE_OPENROUTER_API_KEY env var is kept for localhost dev only —
// it must be REMOVED from production builds.

import { supabase } from '../../utils/supabase';
import { invokeEdgeFunction } from '../../infrastructure/requestId';
import { recordApiDegradation, isRateLimitError } from '../apiDegradationMonitor';

export interface OpenRouterProxyRequest {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface OpenRouterProxyResponse {
  content: string | null;
  success: boolean;
  model: string;
  error?: string;
  via: 'edge_function' | 'direct_dev';
}

/**
 * Call OpenRouter via Supabase Edge Function (production path).
 * Falls back to direct browser call ONLY in localhost dev when
 * VITE_OPENROUTER_API_KEY is set and no Edge Function is available.
 */
export async function callOpenRouterProxy(
  req: OpenRouterProxyRequest,
): Promise<OpenRouterProxyResponse> {
  // ── Production path: Edge Function holds the key ───────────────────────
  try {
    const { data, error } = await invokeEdgeFunction<any>('multi-model-analyze', {
      body: {
        model:          req.model,
        prompt:         req.prompt,
        max_tokens:     req.maxTokens ?? 400,
        temperature:    req.temperature ?? 0.1,
        response_format: req.responseFormat ?? 'json_object',
      },
    });

    if (!error && data?.content) {
      return { content: data.content, success: true, model: req.model, via: 'edge_function' };
    }

    if (error) {
      if (isRateLimitError(error)) recordApiDegradation('openrouter', 'rate_limited', error.message);
      else recordApiDegradation('openrouter', 'network_error', error.message);
    }
  } catch (efErr: any) {
    recordApiDegradation('openrouter', 'network_error', String(efErr?.message ?? efErr));
  }

  // ── Dev fallback: direct browser call (localhost only) ─────────────────
  const devKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (devKey && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${devKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://humanproof.app',
          'X-Title': 'HumanProof Dev',
        },
        body: JSON.stringify({
          model: req.model,
          messages: [{ role: 'user', content: req.prompt }],
          temperature: req.temperature ?? 0.1,
          max_tokens: req.maxTokens ?? 400,
          response_format: req.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        if (res.status === 429) recordApiDegradation('openrouter', 'rate_limited', `HTTP 429 from direct call`);
        return { content: null, success: false, model: req.model, error: `HTTP ${res.status}`, via: 'direct_dev' };
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? null;
      return { content, success: !!content, model: req.model, via: 'direct_dev' };
    } catch (devErr: any) {
      if (isRateLimitError(devErr)) recordApiDegradation('openrouter', 'rate_limited', String(devErr));
      return { content: null, success: false, model: req.model, error: String(devErr), via: 'direct_dev' };
    }
  }

  // Both paths unavailable
  return { content: null, success: false, model: req.model, error: 'OpenRouter unavailable (no Edge Function + no dev key)', via: 'edge_function' };
}
