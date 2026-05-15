

// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from '../_shared/otel.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req) =>
  withRun('generate-adaptive-quiz', req, async (_run) => {
  try {
    const { roleKey, mode } = await req.json();
    const gemmaKey = Deno.env.get("GEMMA_API_KEY");

    if (!gemmaKey) throw new Error("Missing GEMMA_API_KEY");

    const prompt = `You are an elite Human Resource Psychologist and AI Disruption Strategist. 
Your task is to generate an "Adaptive Human Irreplaceability Index" (HII) quiz for a user with the role: "${roleKey}".

The goal is to assess skills that are extremely difficult for AI to replicate (Empathy, Moral Judgment, Creative Problem Solving, Social Intelligence, and Contextual Awareness).

Generate 5 high-quality, role-specific "Interview Style" questions.
Each question must include:
1. "question": A scenario or question tailored to a ${roleKey}.
2. "dimension": The human dimension it targets.
3. "options": An array of 4 multiple-choice options (text + score from 1-5).
4. "idealKeywords": A list of 5-8 keywords that a high-scoring (5/5) Text/Voice response would include.

Respond ONLY with valid JSON strictly matching this schema:
{
  "questions": [
    {
      "id": "uuid or number",
      "question": "string",
      "dimension": "string",
      "options": [
        { "text": "string", "score": number }
      ],
      "idealKeywords": ["string"]
    }
  ]
}
Do not include markdown or other text.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${gemmaKey}`, {
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
    const questions = JSON.parse(data.candidates[0].content.parts[0].text);

    return new Response(JSON.stringify(questions), {
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
