// quickProfilerAgent.ts
// Agent: instantly discovers industry/size for unknown companies via AI.
// Calls multi-model-analyze EF (DeepSeek primary → Gemini fallback).
// Keys held server-side; browser never receives them.

import { checkRateLimit } from '../rateLimit/apiRateLimiter';
import { callAiProxy } from './aiProxy';

export interface CompanyProfile {
  industry:      string;
  isPublic:      boolean;
  employeeCount: number;
  region:        'US' | 'EU' | 'IN' | 'APAC' | 'GLOBAL';
  ticker?:       string;
  confidence:    number;
}

export const profileUnknownCompany = async (companyName: string): Promise<CompanyProfile | null> => {
  if (!checkRateLimit('supabase_osint')) return null;

  const prompt = `Quickly identify the basic profile for this company: "${companyName}".

Return ONLY this JSON — no markdown, no words:

{
  "industry": "<One of: Technology, E-commerce, Finance, Healthcare, Manufacturing, Media, Retail, Energy, Transportation, Services>",
  "isPublic": <boolean>,
  "employeeCount": <integer estimate, e.g. 50, 500, 10000>,
  "region": "<One of: US, EU, IN, APAC, GLOBAL>",
  "ticker": "<null or ticker string if public>",
  "confidence": <0.0 to 1.0>
}

If you are not sure, provide an industry average for a company of this name. If it sounds like a small local business, set employeeCount to 50 and isPublic to false.`;

  try {
    const proxyRes = await callAiProxy({
      prompt,
      maxTokens:      200,
      temperature:    0.1,
      responseFormat: 'json_object',
    });

    if (!proxyRes.success || !proxyRes.content) {
      console.warn('[QuickProfiler] AI proxy returned no content');
      return null;
    }

    const parsed: CompanyProfile = JSON.parse(
      proxyRes.content.replace(/```json|```/g, '').trim(),
    );
    return parsed;
  } catch (error: any) {
    console.warn('[QuickProfiler] Failed:', error.message);
    return null;
  }
};
