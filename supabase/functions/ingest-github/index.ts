// ingest-github/index.ts — v22.0
//
// Weekly GitHub engineering-activity ingestor.
// For each company in company_intelligence with a populated `github_org`,
// fetches the org's recent repository activity from the GitHub REST API and
// computes commit-velocity. When recent 30-day activity drops >40% vs the
// 90-day baseline, emits a low-confidence `breaking_news_events` row signaling
// possible stealth hiring freeze / engineering team shrinkage.
//
// COST / RATE
// ───────────
// GitHub REST: 60 req/hour unauthenticated, 5000/hour with a token. Each org
// requires ~2 requests (repos list + per-repo /stats/commit_activity capped at
// top-N repos). With ~40 orgs and 5 repos each, we make ~200 requests per run.
// Set GITHUB_TOKEN secret to avoid hitting the unauthenticated cap.
//
// IDEMPOTENCY
// ───────────
// Same pattern as ingest-news. Skip if last run <6 days ago. Insert via
// ON CONFLICT DO NOTHING.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrgRepo {
  name: string;
  pushed_at: string;
  archived: boolean;
  fork: boolean;
}

const GITHUB_API = "https://api.github.com";
const REPOS_PER_ORG = 8; // top-8 repos by pushed_at — captures the actively maintained ones

async function ghFetch<T>(url: string, token: string | undefined): Promise<T | null> {
  const headers: Record<string, string> = {
    "User-Agent": "humanproof-ingest-github/22.0",
    "Accept": "application/vnd.github+json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });

    // Fix H-5: GitHub's /stats/commit_activity endpoint returns HTTP 202 Accepted
    // on the first request — stats are being computed asynchronously server-side.
    // Previously this was treated as a failure (non-200 → return null), so the
    // first weekly run always produced 0 results for every repo.
    // Fix: wait 3s and retry once. GitHub typically computes stats within seconds.
    if (res.status === 202) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      const retry = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
      if (!retry.ok) return null;
      return (await retry.json()) as T;
    }

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface RepoCommitWeek {
  total: number;
  week: number;
}

/**
 * Fetch up to `REPOS_PER_ORG` most-recently-pushed repos for an org, then
 * pull each repo's weekly commit-activity. Returns aggregated commit counts
 * for the most-recent 4 weeks (30d) vs the 13 weeks (90d) prior.
 */
async function fetchOrgVelocity(
  org: string,
  token: string | undefined,
): Promise<{ recent30d: number; prior90d: number; reposChecked: number } | null> {
  const repos = await ghFetch<OrgRepo[]>(
    `${GITHUB_API}/orgs/${encodeURIComponent(org)}/repos?per_page=${REPOS_PER_ORG}&sort=pushed&direction=desc&type=public`,
    token,
  );
  if (!repos || !Array.isArray(repos)) return null;

  const active = repos.filter((r) => !r.archived && !r.fork).slice(0, REPOS_PER_ORG);
  if (active.length === 0) return null;

  let recent30d = 0;
  let prior90d = 0;

  for (const r of active) {
    const weeks = await ghFetch<RepoCommitWeek[]>(
      `${GITHUB_API}/repos/${encodeURIComponent(org)}/${encodeURIComponent(r.name)}/stats/commit_activity`,
      token,
    );
    if (!Array.isArray(weeks) || weeks.length < 17) continue; // GitHub returns 52 weeks; need at least 17 for our window

    // Last 4 weeks (~30d). weeks[] is oldest→newest, so take from the tail.
    const len = weeks.length;
    for (let i = len - 4; i < len; i++) {
      recent30d += weeks[i]?.total ?? 0;
    }
    // The 13 weeks before the recent 4 (~90d prior baseline)
    for (let i = Math.max(0, len - 17); i < len - 4; i++) {
      prior90d += weeks[i]?.total ?? 0;
    }
  }

  return { recent30d, prior90d, reposChecked: active.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? undefined;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing_env", missing: [!SUPABASE_URL && "SUPABASE_URL", !SERVICE_KEY && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean) }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Idempotency — weekly cadence, allow re-run after 6 days
  try {
    const { data: lastRun } = await supabase
      .from("ingestion_runs")
      .select("last_run_at")
      .eq("kind", "ingest-github")
      .maybeSingle();
    if (lastRun?.last_run_at) {
      const ageMs = Date.now() - new Date(lastRun.last_run_at).getTime();
      if (ageMs < 6 * 24 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ ok: true, skipped: "too_soon", ageDays: Math.round(ageMs / 86_400_000) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch { /* table missing — fall through */ }

  // Pull companies with github_org populated
  const { data: companies, error: queryErr } = await supabase
    .from("company_intelligence")
    .select("company_name, github_org")
    .not("github_org", "is", null);

  if (queryErr || !companies) {
    return new Response(JSON.stringify({ ok: false, error: queryErr?.message ?? "query failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fix C-5: breaking_news_events has a `region` column (DEFAULT 'IN'). Pass
  // 'GLOBAL' for GitHub signals — engineering velocity is org-wide, not regional.
  const inserts: Array<{ company_name: string; event_date: string; headline: string; confidence: 'low'; source: string; source_url: string; region: string }> = [];
  let orgsChecked = 0;
  let orgsDecelerating = 0;

  for (const c of companies as { company_name: string; github_org: string }[]) {
    const velocity = await fetchOrgVelocity(c.github_org, GITHUB_TOKEN);
    if (!velocity) continue;
    orgsChecked += 1;

    const recentRate = velocity.recent30d / 4;        // commits/week, recent
    const baselineRate = velocity.prior90d / 13;       // commits/week, baseline
    if (baselineRate < 5) continue;                    // too small a baseline to be meaningful

    const deltaPct = ((recentRate - baselineRate) / baselineRate) * 100;
    if (deltaPct < -40) {
      orgsDecelerating += 1;
      inserts.push({
        company_name: c.company_name,
        event_date: new Date().toISOString().slice(0, 10),
        headline: `GitHub commit velocity dropped ${Math.round(deltaPct)}% (last 30d vs 90d baseline, ${velocity.reposChecked} repos) — possible engineering slowdown`,
        confidence: 'low',
        source: 'GitHub activity',
        source_url: `https://github.com/${c.github_org}`,
        region: 'GLOBAL',
      });
    }
  }

  let inserted = 0;
  if (inserts.length > 0) {
    const { data, error } = await supabase
      .from("breaking_news_events")
      .upsert(inserts, { onConflict: "company_name,event_date,source", ignoreDuplicates: true })
      .select("id");
    if (!error && data) inserted = data.length;
    if (error) console.warn("[ingest-github] insert failed:", error.message);
  }

  try {
    await supabase
      .from("ingestion_runs")
      .upsert({ kind: "ingest-github", last_run_at: new Date().toISOString() }, { onConflict: "kind" });
  } catch { /* non-fatal */ }

  return new Response(JSON.stringify({
    ok: true,
    companies_with_org: companies.length,
    orgs_checked: orgsChecked,
    orgs_decelerating: orgsDecelerating,
    rows_inserted: inserted,
    github_authenticated: Boolean(GITHUB_TOKEN),
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
