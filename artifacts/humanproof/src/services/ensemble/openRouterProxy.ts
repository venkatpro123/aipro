// openRouterProxy.ts
// @deprecated — OpenRouter replaced with DeepSeek (primary) + Gemini (fallback).
// This file now re-exports from aiProxy.ts for backward compatibility.
// All new code should import from './aiProxy' directly.

export {
  callAiProxy,
  callOpenRouterProxy,
  type AiProxyRequest  as OpenRouterProxyRequest,
  type AiProxyResponse as OpenRouterProxyResponse,
} from './aiProxy';

export type { AiProxyRequest, AiProxyResponse } from './aiProxy';
