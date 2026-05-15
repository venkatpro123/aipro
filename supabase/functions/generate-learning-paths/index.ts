
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from "../_shared/otel.ts";

// Edge Function to automatically generate Learning Paths using OpenAI / LLM
Deno.serve((req: Request) =>
  withRun('generate-learning-paths', req, async (_run) => {

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gemmaKey = Deno.env.get("GEMMA_API_KEY");

    if (!gemmaKey) throw new Error("Missing GEMMA_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { roleKey } = await req.json();

    if (!roleKey) throw new Error("roleKey is required");

    // Fetch existing free resources so the LLM can construct the path from real DB objects
    const { data: resources } = await supabase.from('free_resources').select('id, title, provider, level');
    
    // Advanced AI Curriculum Generation Prompt
    const prompt = `You are an elite AI education architect and career transition strategist. 
A user with the target career role of "${roleKey}" is seeking to future-proof their skillset against AI disruption. 

I will provide you with a JSON array of carefully curated free learning resources. 
Your task is to analyze these resources and synthesize a highly effective, logical learning curriculum (a "Learning Path") tailored specifically to help the "${roleKey}" role evolve their skills.

Here are the available resources:
${JSON.stringify(resources?.slice(0, 80))}

Follow these strict constraints when designing the Learning Path:
1. Progression: Structure the resources to flow logically from foundational AI literacy to advanced role-specific augmentation.
2. Relevance: ONLY include resources that actually help future-proof this role. Do not blindly include unrelated resources. Match the resource IDs exactly.
3. Dimensions: Focus on addressing target dimension 'D1' (Automating Routine Tasks) or 'D3' (AI Augmentation).
4. Description: Write a compelling, 2-3 sentence description explaining exactly WHY this path matters for someone in the "${roleKey}" role moving into the AI era.

Respond ONLY with valid JSON strictly matching this schema:
{
  "title": "String - e.g., 'Mastering AI Augmentation for [Role]'",
  "description": "String - compelling explanation of value and relevance",
  "targetDimension": "String - 'D1', 'D2', 'D3', or 'general'",
  "difficultyLevel": "String - 'beginner', 'intermediate', or 'advanced'",
  "estimatedHours": Number - reasonable sum of resource durations,
  "resourceIds": ["uuid-1", "uuid-2", "uuid-3"] // Must match the provided IDs in a logical learning sequence
}
Do not include markdown blocks or any other commentary, just the JSON.`;

    // Pass 1: Generate initial curriculum
    const genResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${gemmaKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    if (!genResponse.ok) throw new Error(await genResponse.text());
    const genData = await genResponse.json();
    const initialPath = JSON.parse(genData.candidates[0].content.parts[0].text);

    // Pass 2: The Critic Audit
    const auditPrompt = `You are the HumanProof Quality Auditor. 
Audit the following AI-generated Learning Path for a "${roleKey}".

Proposed Path:
${JSON.stringify(initialPath)}

Available Resources for Verification:
${JSON.stringify(resources?.slice(0, 50))}

Verify:
1. Are resource IDs 100% accurate and present in the list?
2. Is the logical progression sound for a "${roleKey}"?
3. Is the description actually helpful and grounded?

If there are any errors, provide a REFINED version of the JSON. If it's perfect, return the original.
Only respond with the FINAL validated JSON.`;

    const auditResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${gemmaKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: auditPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    if (!auditResponse.ok) throw new Error(await auditResponse.text());
    const auditData = await auditResponse.json();
    const generatedPath = JSON.parse(auditData.candidates[0].content.parts[0].text);

    // Insert the Path
    const { data: newPath, error: pathError } = await supabase
      .from('learning_paths')
      .insert({
        title: generatedPath.title,
        description: generatedPath.description,
        target_role_key: roleKey,
        target_dimension: generatedPath.targetDimension,
        difficulty_level: generatedPath.difficultyLevel,
        estimated_hours: generatedPath.estimatedHours,
      })
      .select()
      .single();

    if (pathError) throw pathError;

    // Link Path Resources
    const pathResourcesData = generatedPath.resourceIds.map((id: string, index: number) => ({
      path_id: newPath.id,
      resource_id: id,
      order_index: index + 1,
      is_required: true,
    }));

    const { error: resourceError } = await supabase
      .from('path_resources')
      .insert(pathResourcesData);

    if (resourceError) throw resourceError;

    return new Response(JSON.stringify({ success: true, path: newPath }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
  }));
