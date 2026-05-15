
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from '../_shared/otel.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve((req) =>
  withRun('analyze-signals', req, async (_run) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const gemmaKey = Deno.env.get("GEMMA_API_KEY");
    if (!gemmaKey) throw new Error("Missing GEMMA_API_KEY");

    const { roleKey } = await req.json();
    if (!roleKey) throw new Error("roleKey is required");

    // 1. Fetch raw signals for this role
    const { data: rawSignals, error: signalError } = await supabaseClient
      .from('live_signals')
      .select('*')
      .eq('role_key', roleKey);

    if (signalError) throw signalError;

    // 2. Triangulate with Gemma 4
    const prompt = `You are the HumanProof Trend Sentinel.
Analyze the following raw labor market signals for the role: "${roleKey}".
Triangulate these sources to produce a SINGLE "Validated Accuracy" score (98% reliability target).

Raw Signals:
${JSON.stringify(rawSignals)}

Calculate these dimensions (0-100):
- D1: Routine Automation Potential
- D2: Industry Disruption Velocity
- D3: Augmentation Synergy
- D4: Human-in-the-loop Necessity
- D5: Regional Economic Resilience
- D6: Skill Obsolescence Rate

Produce a Final HumanProof Score (3-97). 
Higher score = GREATER Human edge (LESS risk).
Respond ONLY with valid JSON:
{
  "d1": number, "d2": number, "d3": number, "d4": number, "d5": number, "d6": number,
  "finalScore": number,
  "confidencePct": number,
  "reasoning": "string"
}
Do not include markdown or preamble.`;

    // Use a real Google Generative Language API model. The previous code targeted
    // "gemma-4-31b-it" which does not exist on the v1beta endpoint, so every call
    // here was 404'ing in production. Gemma 2 9B-IT is the closest equivalent in
    // the public Gemma family that is actually served via this API surface.
    const GEMMA_MODEL = Deno.env.get("GEMMA_MODEL") || "gemma-2-9b-it";
    const gemmaResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent?key=${encodeURIComponent(gemmaKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!gemmaResp.ok) {
      const errBody = await gemmaResp.text();
      throw new Error(`Gemma ${GEMMA_MODEL} HTTP ${gemmaResp.status}: ${errBody.slice(0, 300)}`);
    }
    const aiData = await gemmaResp.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // ── Robust JSON cleaning ────────────────────────────────────────────────
    const extractJson = (raw: string) => {
      let cleaned = raw.replace(/```json\s?([\s\S]*?)```/g, '$1')
                       .replace(/```\s?([\s\S]*?)```/g, '$1')
                       .trim();
      if (!cleaned.startsWith('{')) {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
      }
      return cleaned;
    };

    const cleanedText = extractJson(rawText);
    let result;
    try {
      result = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Agent Parsing Error:", cleanedText);
      throw new Error("Trend Sentinel returned invalid data format");
    }

    // 3. Upsert into validated_scores
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // 30 day validity

    const dbPayload = {
      role_key: roleKey,
      d1: result.d1,
      d2: result.d2,
      d3: result.d3,
      d4: result.d4,
      d5: result.d5,
      d6: result.d6,
      final_score: result.finalScore,
      confidence_pct: result.confidencePct,
      computed_at: new Date().toISOString(),
      valid_until: validUntil.toISOString(),
      sources_used: rawSignals?.length ? [...new Set(rawSignals.map((s: { source_name: string }) => s.source_name))] : ['training_data']
    };

    const { data: validated, error: upsertError } = await supabaseClient
      .from('validated_scores')
      .upsert(dbPayload, { onConflict: 'role_key' })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({
      data: validated,
      reasoning: result.reasoning
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
  }));
