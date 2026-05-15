
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { TASK_AUTO, DISRUPTION_VELOCITY, AUGMENTATION, NETWORK_MOAT, EXP_SENSITIVITY, EXP_RISK_BASE, COUNTRY_DATA, INDUSTRY_KEY_MULT, D3_CURVE_EXPONENT } from './riskData.ts';
// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from '../_shared/otel.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve((req) =>
  withRun('calculate-grounded-risk', req, async (_run) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("Missing GEMINI_API_KEY environment variable");

    const { roleKey, industry, experience = '5-10', country = 'usa' } = await req.json();
    if (!roleKey) throw new Error("roleKey is required");

    // 1. Fetch grounded market data from database
    const { data: groundedData } = await supabase
      .from('grounded_market_data')
      .select('*')
      .eq('role_key', roleKey)
      .single();

    let groundedContext = "";
    if (groundedData) {
      groundedContext = `
Baseline Risk Consensus for ${roleKey}:
- Industry: ${groundedData.industry_sector}
- Automatability Score: ${groundedData.automatability_score}
- AI Tool Maturity: ${groundedData.ai_tool_maturity}
- Human Augmentation Potential: ${groundedData.human_augmentation_score}
- Safe Role Reference: ${groundedData.safe_alternative_role}

This baseline should inform your risk calculation.`;
    }
      const { data: modularIntel } = await supabase
      .from('career_intelligence')
      .select('skills, career_paths, summary, inaction_scenario')
      .eq('role_key', roleKey)
      .single();

    let seededCareerContext = "";
    if (modularIntel) {
      const skills = modularIntel.skills || {};
      const paths = modularIntel.career_paths || [];
      
      seededCareerContext = `
Pre-Validated Career Intelligence for ${roleKey} (Authoritative Baseline):
SUMMARY: ${modularIntel.summary}

VALIDATED SKILL RISK MATRIX:
- OBSOLETE: ${skills.obsolete?.map((s: any) => s.skill).join(', ') || 'None'}
- AT-RISK: ${skills.at_risk?.map((s: any) => s.skill).join(', ') || 'None'}
- SAFE/SHIELD: ${skills.safe?.map((s: any) => s.skill).join(', ') || 'None'}

VALIDATED CAREER PIVOTS:
${paths?.map((p: any) => `- ${p.role}: ${p.riskReduction || p.risk_pct}% risk reduction | Gap: ${p.skillGap || p.gap}`).join('\n') || 'None'}

INACTION SCENARIO: ${modularIntel.inaction_scenario}

INSTRUCTION: Use the above as your authoritative baseline. Personalize the reasoning for the user's specific industry, experience, and country. Do NOT contradict these validated data points.
`;
    }
    
    // --- 2. MULTIPLICATIVE SERVER-SIDE MATH ---
    // (Bypasses LLM hallucinations for the numerical values)
    const induMult = INDUSTRY_KEY_MULT[industry] || 1.0;
    const d1_raw = TASK_AUTO[industry]?.[roleKey] || TASK_AUTO['default']?.[roleKey] || 50;
    const calcD1 = Math.round(Math.min(d1_raw * (induMult > 1 ? 1.1 : 0.9), 100));
    
    const calcD2 = DISRUPTION_VELOCITY[roleKey] ?? 50;
    const d_core = (calcD1 + calcD2) / 2;

    const rawAug = AUGMENTATION[roleKey] ?? 50;
    const calcD3 = Math.round(100 * (1 - Math.pow(rawAug / 100, D3_CURVE_EXPONENT)));
    
    const sensFactor = EXP_SENSITIVITY[roleKey] ?? 0.42;
    const baseRisk = EXP_RISK_BASE[experience] ?? 50;
    const calcD4 = Math.round(baseRisk * (1 - sensFactor));
    
    const countryKey = country.toLowerCase().replace(/\s+/g, '_');
    const [adoption, regulation] = COUNTRY_DATA[countryKey] ?? COUNTRY_DATA['other'] ?? [55, 40];
    const calcD5 = Math.round((adoption - regulation * 0.6) / 1.4);
    
    const calcD6 = NETWORK_MOAT[roleKey] ?? 50;

    // Multiplicative Engine: Defense dampens Core risk
    const d_shield_avg = (calcD3 + calcD4 + calcD5 + calcD6) / 4;
    const calcTotal = Math.round(d_core * (d_shield_avg / 100));

    const prompt = `You are the HumanProof Grounded Risk Engine (Generator Agent).
Your task is to generate a personalized risk assessment based on pre-computed Multiplicative Oracle Scores.

User Profile:
- Role/Industry: ${roleKey} (${industry})
- Experience: ${experience}
- Country: ${country}

MANDATORY HARDCODED SCORES:
You MUST use these exact numerical values in your JSON response. Do not change them.
- "total": ${calcTotal}
- D1 Task Automatability: ${calcD1}
- D2 AI Tool Maturity: ${calcD2}
- D3 Human Amplification: ${calcD3}
- D4 Experience Shield: ${calcD4}
- D5 Country Exposure: ${calcD5}
- D6 Social Capital Moat: ${calcD6}

${groundedContext}
${seededCareerContext}

Instructions:
1. Conduct "Chain-of-Thought" reasoning for the qualitative data (reasons, roadmaps, skills). 
2. Ensure the justification for D4 and D5 heavily references the User's inputted Experience (${experience}) and Country (${country}).
3. For ai_risk_skills: Use ONLY the pre-validated skills provided.
4. Craft a tactical 3-phase strategic roadmap.
5. Provide the mandatory scores exactly as provided above.

Respond ONLY with valid JSON matching this schema:
{
  "total": number (3-97),
  "dimensions": [
    { "key": "D1", "label": "Task Automatability", "score": number, "reason": "string" },
    { "key": "D2", "label": "AI Tool Maturity", "score": number, "reason": "string" },
    { "key": "D3", "label": "Human Amplification", "score": number, "reason": "string" },
    { "key": "D4", "label": "Experience Shield", "score": number, "reason": "string" },
    { "key": "D5", "label": "Country Exposure", "score": number, "reason": "string" },
    { "key": "D6", "label": "Social Capital Moat", "score": number, "reason": "string" }
  ],
  "reasoning": "string (Overall synthesis)",
  "verdict": "AI-Resistant" | "Resilient" | "Exposed" | "Critical Risk",
  "urgency": "Low" | "Moderate" | "High" | "Critical",
  "timeline": "8-12 Years" | "5-8 Years" | "2-4 Years" | "Immediate (< 2 Years)"
}
Do not include markdown or preamble.`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        total: { type: "NUMBER", description: "Score from 3 to 97" },
        dimensions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              key: { type: "STRING" },
              label: { type: "STRING" },
              score: { type: "NUMBER" },
              reason: { type: "STRING" }
            },
            required: ["key", "label", "score", "reason"]
          }
        },
        reasoning: { type: "STRING", description: "Overall synthesis" },
        verdict: { type: "STRING", description: "AI-Resistant, Resilient, Exposed, or Critical Risk" },
        urgency: { type: "STRING", description: "Low, Moderate, High, or Critical" },
        timeline: { type: "STRING", description: "8-12 Years, 5-8 Years, 2-4 Years, Immediate (< 2 Years)" },
        ai_risk_skills: {
          type: "OBJECT",
          properties: {
            obsolete: {
              type: "ARRAY",
              items: { type: "OBJECT", properties: { skill: { type: "STRING" }, reason: { type: "STRING" }, timeline: { type: "STRING" } }, required: ["skill", "reason", "timeline"] }
            },
            at_risk: {
              type: "ARRAY",
              items: { type: "OBJECT", properties: { skill: { type: "STRING" }, reason: { type: "STRING" }, timeline: { type: "STRING" } }, required: ["skill", "reason", "timeline"] }
            },
            safe: {
              type: "ARRAY",
              items: { type: "OBJECT", properties: { skill: { type: "STRING" }, reason: { type: "STRING" }, timeline: { type: "STRING" } }, required: ["skill", "reason", "timeline"] }
            }
          },
          required: ["obsolete", "at_risk", "safe"]
        },
        safer_career_paths: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: { role: { type: "STRING" }, risk_reduction_pct: { type: "NUMBER" }, skill_gap: { type: "STRING" }, transition_difficulty: { type: "STRING" } },
            required: ["role", "risk_reduction_pct", "skill_gap", "transition_difficulty"]
          }
        },
        roadmap: {
          type: "OBJECT",
          properties: {
            phase_1: {
              type: "OBJECT",
              properties: {
                timeline: { type: "STRING" },
                actions: { type: "ARRAY", items: { type: "OBJECT", properties: { action: { type: "STRING" }, why: { type: "STRING" }, outcome: { type: "STRING" } }, required: ["action", "why", "outcome"] } }
              }, required: ["timeline", "actions"]
            },
            phase_2: {
              type: "OBJECT",
              properties: {
                timeline: { type: "STRING" },
                actions: { type: "ARRAY", items: { type: "OBJECT", properties: { action: { type: "STRING" }, why: { type: "STRING" }, outcome: { type: "STRING" } }, required: ["action", "why", "outcome"] } }
              }, required: ["timeline", "actions"]
            },
            phase_3: {
              type: "OBJECT",
              properties: {
                timeline: { type: "STRING" },
                actions: { type: "ARRAY", items: { type: "OBJECT", properties: { action: { type: "STRING" }, why: { type: "STRING" }, outcome: { type: "STRING" } }, required: ["action", "why", "outcome"] } }
              }, required: ["timeline", "actions"]
            }
          },
          required: ["phase_1", "phase_2", "phase_3"]
        },
        inaction_scenario: { type: "STRING", description: "The brutal outcome of doing nothing." }
      },
      required: ["total", "dimensions", "reasoning", "verdict", "urgency", "timeline", "ai_risk_skills", "safer_career_paths", "roadmap", "inaction_scenario"]
    };

    // ── Pass 1: Generation Agent ─────────────────────────────────────────────
    const genResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          responseSchema: responseSchema 
        }
      }),
    });

    if (!genResp.ok) throw new Error(await genResp.text());
    const genData = await genResp.json();
    const genText = genData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const initialResult = JSON.parse(genText);

    // ── Pass 2: Critic Agent (Verification) ───────────────────────────────────
    const criticPrompt = `You are the HumanProof Quality Critic. 
Review the following risk assessment generated by another agent. 
Cross-reference it with the Grounded Market Data and User Profile.

User Profile: ${roleKey} (${industry}), ${experience} in ${country}.
${groundedContext}

Candidate Assessment:
${JSON.stringify(initialResult, null, 2)}

Your Goal: 
1. Identify any hallucinations or scores that deviate wildly from grounded consensus without clear reason.
2. Ensure the "Experience Shield" (D4) and "Country Exposure" (D5) properly reflect the user context.
3. Refine the reasoning to be more professional and data-backed.

Respond with the final, validated version of the JSON assessment. 
Follow the exact same schema. Respond ONLY with JSON.`;

    const criticResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: criticPrompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      }),
    });

    let finalResult = initialResult;
    if (criticResp.ok) {
      const criticData = await criticResp.json();
      const criticText = criticData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      try {
        finalResult = JSON.parse(criticText);
      } catch (e) {
        console.warn("Critic Agent failed to produce valid JSON, falling back to Generator output.");
      }
    }

    // ── Schema Validation & Normalization ──────────────────────────────────────
    const requiredDims = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
    const validatedDimensions = requiredDims.map(key => {
      const existing = finalResult.dimensions?.find((d: any) => d.key === key);
      const labels: Record<string, string> = {
        D1: "Task Automatability",
        D2: "AI Tool Maturity",
        D3: "Human Amplification",
        D4: "Experience Shield",
        D5: "Country Exposure",
        D6: "Social Capital Moat"
      };
      return {
        key,
        label: existing?.label || labels[key],
        score: typeof existing?.score === 'number' ? Math.max(0, Math.min(100, existing.score)) : 50,
        reason: existing?.reason || "Analysis based on historical labor vectors and AI adoption trends."
      };
    });

    const total = typeof finalResult.total === 'number' ? finalResult.total : 50;
    const confidenceLabel: 'HIGH' | 'MEDIUM' = groundedData ? 'HIGH' : 'MEDIUM';

    // v15.0: Surface a structured confidence interval so the frontend can render
    // "{score} ±N" on the headline. No empirical residuals available in this
    // edge function; the band is derived heuristically from the confidence label.
    // method='heuristic_label_band' makes the provenance explicit so consumers
    // can choose to hide the band when stricter calibration is required.
    const ciDelta = confidenceLabel === 'HIGH' ? 5 : 10;
    const confidenceInterval = {
      pointEstimate: total,
      low: Math.max(0, total - ciDelta),
      high: Math.min(100, total + ciDelta),
      range: ciDelta * 2,
      method: 'heuristic_label_band' as const,
    };

    const finalOutput = {
      total,
      dimensions: validatedDimensions,
      reasoning: finalResult.reasoning || "Grounded analysis complete via multi-agent validation.",
      verdict: finalResult.verdict || "Resilient",
      urgency: finalResult.urgency || "Moderate",
      timeline: finalResult.timeline || "5-8 Years",
      ai_risk_skills: finalResult.ai_risk_skills || { obsolete: [], at_risk: [], safe: [] },
      safer_career_paths: finalResult.safer_career_paths || [],
      roadmap: finalResult.roadmap || { phase_1: { timeline: "0-30 days", actions: [] }, phase_2: { timeline: "1-3 months", actions: [] }, phase_3: { timeline: "3-12 months", actions: [] } },
      inaction_scenario: finalResult.inaction_scenario || "If you do not adapt, your role will face extreme pressure from rapid automation.",
      confidence: confidenceLabel,
      confidenceInterval,
      isGrounded: !!groundedData,
      agentChain: criticResp.ok ? 'Generator -> Critic' : 'Generator (Solo)'
    };

    return new Response(JSON.stringify(finalOutput), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Critical Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  }));
