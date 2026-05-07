// gemmaAgent.ts
// Agent 1: Gemma 3 27B (via OpenRouter) — OSINT & company signal extraction
// v6.0 Audit Fix: calls go through openRouterProxy (Edge Function) — key never in browser.

import { checkRateLimit } from '../rateLimit/apiRateLimiter';
import { callOpenRouterProxy } from './openRouterProxy';

const MODEL = 'google/gemma-3-27b-it:free';

export interface GemmaSignals {
  companyHealthSignal: number;      // 0–1, higher = more risk
  recentLayoffSignal: number;
  financialStressSignal: number;
  aiAdoptionThreat: number;
  roleSpecificRisk: number;
  confidence: number;               // 0–1
  keyRiskFactors: string[];
  protectiveFactors: string[];
  reasoning: string;
}

export interface GemmaResult {
  model: 'gemma-3-27b';
  success: boolean;
  signals: GemmaSignals | null;
  rawConfidence: number;
}

export const runGemmaOSINT = async (
  companyName: string,
  industry: string,
  roleTitle: string,
  swarmContext?: string
): Promise<GemmaResult> => {
  if (!checkRateLimit('openrouter')) return { model: 'gemma-3-27b', success: false, signals: null, rawConfidence: 0 };

  const swarmSection = swarmContext ? `\n\n${swarmContext}\n` : '';

  const prompt = `You are a corporate intelligence analyst specializing in workforce risk assessment.${swarmSection}

Analyze the following company and provide a structured risk assessment:

Company: ${companyName}
Industry: ${industry}
Role being assessed: ${roleTitle}

Respond with ONLY this JSON — no markdown, no explanation:

{
  "companyHealthSignal": <number 0.0-1.0, where 1.0 = highest layoff risk>,
  "recentLayoffSignal": <number 0.0-1.0>,
  "financialStressSignal": <number 0.0-1.0>,
  "aiAdoptionThreat": <number 0.0-1.0>,
  "roleSpecificRisk": <number 0.0-1.0>,
  "confidence": <number 0.0-1.0>,
  "keyRiskFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "protectiveFactors": ["<factor 1>", "<factor 2>"],
  "reasoning": "<2 sentence max explanation>"
}

Base analysis on known financial performance of ${companyName}, industry trends in ${industry}, and AI automation vulnerability of ${roleTitle} roles. If you have low confidence about ${companyName}, use industry-level signals and set confidence below 0.5.`;

  try {
    const proxyRes = await callOpenRouterProxy({ model: MODEL, prompt, maxTokens: 400, temperature: 0.1, responseFormat: 'json_object' });
    if (!proxyRes.success || !proxyRes.content) throw new Error(proxyRes.error ?? 'Proxy returned no content');
    const parsed: GemmaSignals = JSON.parse(proxyRes.content.replace(/```json|```/g, '').trim());
    return { model: 'gemma-3-27b', success: true, signals: parsed, rawConfidence: parsed.confidence ?? 0.5 };
  } catch (error: any) {
    console.warn('[GemmaAgent] Failed:', error.message);
    return { model: 'gemma-3-27b', success: false, signals: null, rawConfidence: 0 };
  }
};
