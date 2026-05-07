import {
  buildPromptPackage,
  normalizeAnalyzeRequest,
  normalizeModelResponse,
  validateModelResponse,
} from './promptFramework.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const MODELS = [
  'google/gemini-flash-1.5-8b',
  'mistralai/mistral-7b-instruct',
  'meta-llama/llama-3.1-8b-instruct',
];

async function callOpenRouter(
  apiKey: string,
  model: string,
  promptPackage: ReturnType<typeof buildPromptPackage>,
): Promise<{ text: string; model: string; tokensUsed: number }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://humanproof.ai',
      'X-Title': 'HumanProof Risk Analysis',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: promptPackage.systemPrompt },
        { role: 'user', content: promptPackage.userPrompt },
      ],
      temperature: 0.15,
      max_tokens: promptPackage.maxTokens,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status} (${model}): ${errText.slice(0, 240)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const tokensUsed = (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);

  if (!text) throw new Error(`Empty response from ${model}`);
  return { text, model, tokensUsed };
}

function parseJsonFromText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Continue to extraction.
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }

  throw new Error('Response did not contain parseable JSON');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const rawBody = await req.json();
    const normalizedRequest = normalizeAnalyzeRequest(rawBody);

    if (!normalizedRequest.companyName || !normalizedRequest.roleTitle) {
      return json({ error: 'companyName and roleTitle required' }, 400);
    }

    const openrouterKey = Deno.env.get('OPENROUTER_KEY');
    if (!openrouterKey) {
      console.warn('[llm-analyze] OPENROUTER_KEY not configured');
      return json({ success: false, fallback: true, error: 'OPENROUTER_KEY not configured' });
    }

    const promptPackage = buildPromptPackage(normalizedRequest);

    const modelRaces = MODELS.map((model) =>
      callOpenRouter(openrouterKey, model, promptPackage).then(({ text, tokensUsed }) => {
        const parsed = parseJsonFromText(text);
        const normalizedResponse = normalizeModelResponse(parsed, normalizedRequest);
        const validationFailures = validateModelResponse(normalizedResponse, normalizedRequest);
        if (validationFailures.length > 0) {
          throw new Error(`${model} validation failed: ${validationFailures.join(' | ')}`);
        }
        return { parsed: normalizedResponse, model, tokensUsed };
      })
    );

    let winner: { parsed: ReturnType<typeof normalizeModelResponse>; model: string; tokensUsed: number } | null = null;
    const errors: string[] = [];

    try {
      winner = await Promise.any(modelRaces);
    } catch (aggregateError: unknown) {
      const errorList = aggregateError instanceof AggregateError ? aggregateError.errors : [];
      for (const error of errorList) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (winner) {
      console.log(
        `[llm-analyze] accepted ${winner.model} | tokens ${winner.tokensUsed} | urgency ${winner.parsed.urgencyLevel}`,
      );
      return json({
        success: true,
        model: winner.model,
        tokensUsed: winner.tokensUsed,
        ...winner.parsed,
      });
    }

    console.error('[llm-analyze] All models failed:', errors.join(' | '));
    return json({
      success: false,
      fallback: true,
      error: errors.join(' | ') || 'No model returned a valid, instruction-compliant response',
      primaryRiskDriver: null,
      sixMonthInactionConsequence: null,
      oneActionThisWeek: null,
      whatChangesRiskMost: null,
      estimatedTimeline: null,
      keyProtectiveFactor: null,
      patternId: null,
      dominantRiskFactor: null,
      timeHorizon: null,
      urgencyLevel: null,
      synthesis: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[llm-analyze] Fatal:', message);
    return json({ success: false, fallback: true, error: message }, 500);
  }
});
