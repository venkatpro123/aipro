// deepseekAgent.ts
// Agent 2: DeepSeek-V3 (direct API via multi-model-analyze EF) — Financial signal analysis.
// Primary model: deepseek-chat. Automatic Gemini fallback handled server-side by the EF.

import { checkRateLimit } from '../rateLimit/apiRateLimiter';
import { LayoffRound } from '../../data/companyDatabase';
import { callAiProxy } from './aiProxy';

export interface DeepSeekSignals {
  financialPressureScore:  number;    // 0–1
  industryContagionRisk:   number;
  sectorHealthScore:       number;
  overstaffingRisk:        number;
  marketCycleRisk:         number;
  compositeFinancialRisk:  number;    // 0–1, main output
  confidence:              number;
  primaryRiskDriver:       string;
  timeHorizon:             '3months' | '6months' | '12months' | 'beyond12months';
  /**
   * v7.0: patternId from the HISTORICAL_PATTERNS database, or null.
   * The model selects from a pre-computed candidate list — it cannot invent patterns.
   * The ID is validated against HISTORICAL_PATTERNS before display.
   */
  patternMatch: string | null;
}

export interface DeepSeekResult {
  model: 'deepseek-v3';
  success: boolean;
  signals: DeepSeekSignals | null;
  rawConfidence: number;
}

export const runDeepSeekFinancial = async (
  companyName:   string,
  industry:      string,
  companySize:   number | string,
  layoffHistory: LayoffRound[],
  swarmContext?: string,
): Promise<DeepSeekResult> => {
  if (!checkRateLimit('supabase_osint')) {
    return { model: 'deepseek-v3', success: false, signals: null, rawConfidence: 0 };
  }

  const swarmSection = swarmContext ? `\n\n${swarmContext}\n` : '';

  const prompt = `You are a financial risk analyst specializing in corporate workforce restructuring patterns.${swarmSection}

Perform a financial risk assessment for layoff probability:

Company: ${companyName}
Industry: ${industry}
Company Size: ${companySize} employees
Known Layoff History: ${JSON.stringify(layoffHistory)}

Think step by step:
1. What financial pressure signals indicate upcoming layoffs for companies in ${industry}?
2. How does ${companyName}'s profile match historical pre-layoff patterns?
3. What is the sector health and contagion risk?

Return ONLY this JSON structure — no markdown or explanation:

{
  "financialPressureScore": <0.0-1.0>,
  "industryContagionRisk": <0.0-1.0>,
  "sectorHealthScore": <0.0-1.0>,
  "overstaffingRisk": <0.0-1.0>,
  "marketCycleRisk": <0.0-1.0>,
  "compositeFinancialRisk": <0.0-1.0>,
  "confidence": <0.0-1.0>,
  "primaryRiskDriver": "<one sentence>",
  "timeHorizon": "<3months|6months|12months|beyond12months>",
  "patternMatch": "<pattern-id or null>"
}`;

  try {
    const proxyRes = await callAiProxy({
      prompt,
      maxTokens:      350,
      temperature:    0.05,
      responseFormat: 'json_object',
    });
    if (!proxyRes.success || !proxyRes.content) {
      throw new Error(proxyRes.error ?? 'AI proxy returned no content');
    }
    const parsed: DeepSeekSignals = JSON.parse(
      proxyRes.content.replace(/```json|```/g, '').trim(),
    );
    return {
      model:         'deepseek-v3',
      success:       true,
      signals:       parsed,
      rawConfidence: parsed.confidence ?? 0.5,
    };
  } catch (error: any) {
    console.warn('[DeepSeekAgent] Failed:', error.message);
    return { model: 'deepseek-v3', success: false, signals: null, rawConfidence: 0 };
  }
};
