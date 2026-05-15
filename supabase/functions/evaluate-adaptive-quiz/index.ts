

// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from '../_shared/otel.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req) =>
  withRun('evaluate-adaptive-quiz', req, async (_run) => {
  try {
    const { roleKey, answers } = await req.json(); // answers is an array of { question, response, mode: 'mcq'|'text' }
    const gemmaKey = Deno.env.get("GEMMA_API_KEY");

    if (!gemmaKey) throw new Error("Missing GEMMA_API_KEY");

    const prompt = `You are an elite Human Irreplaceability Evaluator.
You are scoring an HII (Human Irreplaceability Index) assessment for the role of "${roleKey}".

The user has provided answers to adaptive questions. Some are Multiple Choice, others are detailed Text/Voice responses.
Your goal is to provide a highly accurate (90-98%) evaluation of their "Human Edge".

User Answers:
${JSON.stringify(answers)}

For each answer:
1. If "mode" is "text", perform deep semantic analysis. Check for empathy, complex reasoning, ethics, and nuance that AI lacks. 
2. Score each dimension on a 1-100 scale.
3. Provide a brief (2-sentence) professional justification for the score.

Respond ONLY with valid JSON matching this schema:
{
  "totalScore": number,
  "dimensions": {
    "empathic": number,
    "moral": number,
    "creative": number,
    "social": number,
    "contextual": number
  },
  "justification": "Overall summary of their human edge"
}
Do not include markdown.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemmaKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      }),
    });

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    const evaluation = JSON.parse(data.candidates[0].content.parts[0].text);

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
  }));
