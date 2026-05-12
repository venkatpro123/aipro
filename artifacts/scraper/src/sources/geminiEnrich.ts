// geminiEnrich.ts
// Calls Gemini Flash 2.0 to fuse raw multi-source rows into a single
// structured event. Returns null on any failure — caller falls back to
// rule-based composition.
//
// Why Flash 2.0 (not Pro): the task is bounded structured-extraction over
// ≤2k tokens of input; Flash is faster, ~10× cheaper, and well within the
// free tier for our volume (1.5k requests/day cap).

import { config } from '../lib/config.js';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SCHEMA = {
  type: 'object',
  required: ['eventType', 'confidence', 'headline'],
  properties: {
    eventType: {
      type: 'string',
      enum: ['layoff', 'hiring_freeze', 'hiring_surge', 'exec_departure',
             'restructuring', 'financial_stress', 'unknown'],
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    headline:   { type: 'string', maxLength: 240 },
    eventDate:  { type: 'string', description: 'ISO YYYY-MM-DD if known' },
    percentCut: { type: 'number', minimum: 0, maximum: 100 },
    affectedCount: { type: 'integer', minimum: 0 },
    reasoning:  { type: 'string', maxLength: 600 },
  },
} as const;

export interface ComposeInput {
  companyName: string;
  rawSignals: Array<{
    sourceName: string;
    sourceAuthority: number;          // 0–1
    snippet: string;
    sourceUrl?: string;
    observedAt: string;
  }>;
}

export interface ComposedEvent {
  eventType: 'layoff' | 'hiring_freeze' | 'hiring_surge' | 'exec_departure'
            | 'restructuring' | 'financial_stress' | 'unknown';
  confidence: number;
  headline: string;
  eventDate?: string;
  percentCut?: number;
  affectedCount?: number;
  reasoning?: string;
}

function buildPrompt(input: ComposeInput): string {
  const lines = input.rawSignals.slice(0, 12).map((s, i) =>
    `(${i + 1}) [${s.sourceName} authority=${s.sourceAuthority.toFixed(2)} at=${s.observedAt}]: ${s.snippet.slice(0, 400)}`,
  ).join('\n');
  return [
    `You are a workforce-intelligence analyst. Given multiple raw signals about ${input.companyName}, fuse them into a single structured event.`,
    ``,
    `Rules:`,
    `- Only set eventType="layoff" when ≥2 sources independently confirm. If a source uses negation language ("denies layoffs", "rumour", "no plans"), treat it as evidence AGAINST.`,
    `- confidence reflects how strongly the sources agree (1.0 = unambiguous, 0.3 = weak/conflicting).`,
    `- eventDate should be the earliest date a credible source reports the event (not today's date unless that's what the sources say).`,
    `- If sources strongly disagree, return eventType="unknown" with low confidence and explain in reasoning.`,
    ``,
    `Raw signals:`,
    lines,
    ``,
    `Return strictly the JSON object per the response schema. No commentary.`,
  ].join('\n');
}

export async function composeWithGemini(input: ComposeInput): Promise<ComposedEvent | null> {
  if (!config.gemini.apiKey) return null;
  if (input.rawSignals.length === 0) return null;

  const url = `${GEMINI_ENDPOINT}?key=${config.gemini.apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 600,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.info('[geminiEnrich] HTTP', res.status);
      return null;
    }
    const data: any = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (typeof parsed?.confidence !== 'number' || typeof parsed?.eventType !== 'string') return null;
    return parsed as ComposedEvent;
  } catch (err: any) {
    console.info('[geminiEnrich] failure:', err?.message);
    return null;
  }
}
