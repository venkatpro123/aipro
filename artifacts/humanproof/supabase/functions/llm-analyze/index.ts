// llm-analyze/index.ts
//
// Anthropic-backed Edge Function — generates the AI intelligence brief for
// the HumanProof layoff risk dashboard.
//
// Called by: src/services/intelligenceBriefService.ts (fetchIntelligenceBrief)
//            src/services/ensemble/ensembleOrchestrator.ts
//
// Env vars required:
//   ANTHROPIC_API_KEY — set in Supabase dashboard > Edge Functions > Secrets
//   SUPABASE_URL, SUPABASE_ANON_KEY — set automatically by Supabase
//
// Returns JSON with fields:
//   primaryRiskDriver, synthesis, urgencyLevel, oneActionThisWeek,
//   whatChangesRiskMost, estimatedTimeline, model

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const errJson = (msg: string, status = 500) =>
  new Response(
    JSON.stringify({ error: msg }),
    { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );

// Require valid Supabase JWT so the Edge Function is not an open Anthropic relay.
async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return errJson('Missing Authorization header', 401);
  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) return errJson('Invalid or expired token', 401);
  } catch {
    return errJson('Auth check failed', 401);
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const authFail = await requireAuth(req);
  if (authFail) return authFail;

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) return errJson('ANTHROPIC_API_KEY not configured', 503);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return errJson('Invalid JSON body', 400); }

  const {
    companyName        = 'Unknown company',
    roleTitle          = 'Unknown role',
    engineScore        = 0,
    engineBreakdown    = '',
    signalContext      = '',
    structuredContext  = '',
    userProfileContext = '',
    analysisInstructions = '',
    // v40.0 NEW: structured career market context injected by intelligenceBriefService
    careerMarketContext = '',
  } = body as Record<string, string | number>;

  // ── System prompt ───────────────────────────────────────────────────────────
  // The system prompt establishes Claude's role and the strict honesty rules.
  const system = `You are a career intelligence analyst specialising in tech-sector layoff risk. \
You produce concise, evidence-based briefs for individual employees. \
Rules you must NEVER break:
1. Do NOT fabricate statistics, dates, or numbers not present in the provided data.
2. Do NOT use vague phrases ("multiple factors", "various risks", "consider upskilling").
3. Cite specific signals by name, not category.
4. The "oneActionThisWeek" field MUST reference at least one concrete number from \
the career market context when provided. A response like "build a project in your target field" \
is unacceptable. A response like "Build a production dbt transformation pipeline and push to \
GitHub — Data Engineering has 12,000 active openings in India and this is the hiring bar" is acceptable.
5. Format: respond with ONLY valid JSON matching the schema below. No markdown, no prose outside JSON.

Response schema:
{
  "primaryRiskDriver": "1–2 sentence specific risk driver citing actual signal names",
  "synthesis":         "2–3 sentence situation summary with specific numbers from structuredContext",
  "urgencyLevel":      "CRITICAL | HIGH | MODERATE | LOW",
  "oneActionThisWeek": "1 concrete action this week, citing at least one market number when available",
  "whatChangesRiskMost": "What single signal change would most shift the score, and by how much",
  "estimatedTimeline": "If trajectory continues unchanged, what happens in 30/60/90 days"
}`;

  // ── User message ────────────────────────────────────────────────────────────
  // All signal sections are labelled so Claude can reference them precisely.
  const userParts: string[] = [];

  userParts.push(`COMPANY: ${companyName}  |  ROLE: ${roleTitle}  |  RISK SCORE: ${engineScore}/100`);

  if (engineBreakdown)   userParts.push(`ENGINE BREAKDOWN:\n${engineBreakdown}`);
  if (signalContext)     userParts.push(`SIGNAL CONTEXT:\n${signalContext}`);
  if (structuredContext) userParts.push(`GROUND TRUTH SIGNALS (cite these, do not invent alternatives):\n${structuredContext}`);
  if (userProfileContext) userParts.push(`USER PROFILE (frame the brief around this person's situation):\n${userProfileContext}`);

  // Career market context — this drives the oneActionThisWeek instruction
  if (careerMarketContext) {
    userParts.push(
      `CAREER MARKET CONTEXT (you MUST cite at least one of these numbers in oneActionThisWeek):\n` +
      careerMarketContext,
    );
    userParts.push(
      `INSTRUCTION FOR oneActionThisWeek: In oneActionThisWeek, cite at least one number from ` +
      `the market context above. Example pattern: ` +
      `"[Target role] has [indiaOpenings] active openings in India. ` +
      `The hiring bar is [hiringBar] — not a tutorial. ` +
      `Build [proofOfCompetency] this week."`,
    );
  } else {
    userParts.push(
      `INSTRUCTION FOR oneActionThisWeek: Give one specific, concrete action. ` +
      `Include at least one number (even from the engine breakdown above). ` +
      `Do NOT use generic advice like "build a project" or "update your resume".`,
    );
  }

  if (analysisInstructions) userParts.push(`ADDITIONAL INSTRUCTIONS:\n${analysisInstructions}`);

  userParts.push('Respond with ONLY valid JSON. No markdown fences, no prose.');

  const userMessage = userParts.join('\n\n---\n\n');

  // ── Anthropic API call ──────────────────────────────────────────────────────
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return errJson(`Anthropic API error ${res.status}: ${text}`, 502);
    }

    const anthropicResponse = await res.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const rawText = anthropicResponse.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('');

    // Strip markdown code fences if Claude added them despite instructions
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // If JSON parsing fails, return the raw text as the synthesis field
      // so the service can still display something useful.
      return new Response(
        JSON.stringify({
          synthesis:         rawText.slice(0, 400),
          primaryRiskDriver: 'Unable to parse structured response.',
          urgencyLevel:      'MODERATE',
          oneActionThisWeek: '',
          model:             'claude-haiku-4-5-20251001',
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ...parsed, model: 'claude-haiku-4-5-20251001' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return errJson(`Request failed: ${String(e)}`, 502);
  }
});
