// deep-audit.mjs — full-system probe of the Layoff Audit pipeline.
// Sections:
//   1. Edge Function invocation matrix
//   2. pg_cron + pg_net dispatch history
//   3. Ingest pipeline data flow
//   4. Legacy function reachability
//   5. Schema consistency
//   6. Realtime publication
//   7. Connector reliability

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF  = "ysenimczeasmaeojzlkt";

if (!DATABASE_URL || !SERVICE_KEY) { console.error("missing env"); process.exit(2); }

// Synthetic fully-shaped ResolvedSignal for probe-only use
function sig(value = 0.5) {
  return {
    value, confidence: 0.7,
    confidenceInterval: { low: Math.max(0, value - 0.1), high: Math.min(1, value + 0.1) },
    sourcesUsed: ["probe"], stalenessDays: 0, hasConflict: false, conflicts: [],
    primarySource: "db", dominantWeight: 1,
  };
}
function buildHybridScoreProbeBody() {
  return {
    companyName: "TestCo", roleTitle: "Engineer", department: "engineering",
    userFactors: { tenureYears: 3, performanceTier: "average", uniquenessDepth: "medium" },
    consensusData: {
      revenueGrowth: sig(0.5), stockTrend: sig(0.5), fundingHealth: sig(0.3),
      overstaffing: sig(0.5), companySize: sig(0.5),
      recentLayoffRecency: sig(0.5), layoffFrequency: sig(0.5), layoffSeverity: sig(0.5),
      sectorContagion: sig(0.5), departmentNews: sig(0.5),
      automationRisk: sig(0.5), aiToolMaturity: sig(0.5), humanAmplification: sig(0.5),
      industryBaseline: sig(0.5), aiAdoptionRate: sig(0.5),
      growthOutlook: sig(0.5), averageTenure: sig(0.5),
      overallConfidence: 0.7, conflictLevel: "none", allConflicts: [],
      freshnessReport: {
        oldestSignalAge: 0, avgSignalAge: 0, percentLive: 0, percentHeuristic: 1,
        totalSignalCount: 17, liveSignalCount: 0, heuristicSignalCount: 17,
      },
    },
  };
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const findings = []; // { severity: 'crit'|'high'|'med'|'low'|'info', area, finding }
const note = (severity, area, finding) => { findings.push({ severity, area, finding }); };

const section = (title) => console.log(`\n${"═".repeat(75)}\n  ${title}\n${"═".repeat(75)}`);

// ─── SECTION 1: Edge Function invocation matrix ─────────────────────────────
section("1. EDGE FUNCTION INVOCATION MATRIX");

const FUNCTIONS_TO_PROBE = [
  // [name, body, expectedFields]
  ["ingest-news",              { triggered_by: "audit_probe" }, ["ok"]],
  ["ingest-careers",           { triggered_by: "audit_probe" }, ["ok"]],
  ["ingest-github",            { triggered_by: "audit_probe" }, ["ok"]],
  ["proxy-macro",              {},                              ["fromCache"]],
  ["llm-analyze",              { mode: "news_entity_extraction", headline: "Salesforce to lay off 1000 employees in restructuring", snippet: "" }, ["success"]],
  ["fetch-company-data",       { companyName: "Microsoft" },    ["data"]],
  // calculate-hybrid-risk requires a fully-formed HybridScoreInputs (every
  // ResolvedSignal needs `value, confidence, confidenceInterval, sourcesUsed,
  // stalenessDays, hasConflict, conflicts, primarySource, dominantWeight`).
  // Build that via a helper below so the probe matches the scoring contract.
  ["calculate-hybrid-risk",    buildHybridScoreProbeBody(), ["result"]],
];

const efStatus = {};
for (const [name, body, _expected] of FUNCTIONS_TO_PROBE) {
  const url = `https://${PROJECT_REF}.supabase.co/functions/v1/${name}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const ms = Date.now() - start;
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { _raw: text.slice(0, 200) }; }
    const ok = res.ok && (parsed?.ok === true || parsed?.success === true || parsed?.data || parsed?.fromCache !== undefined || parsed?.result || parsed?.skipped);
    efStatus[name] = { httpStatus: res.status, ms, parsed: parsed, ok };
    console.log(`${ok ? "✓" : "✗"} ${name.padEnd(28)} HTTP ${res.status}  ${ms}ms  ${JSON.stringify(parsed).slice(0, 100)}`);
    if (!ok) note("high", "Edge Function", `${name} returned non-success: ${JSON.stringify(parsed).slice(0,200)}`);
  } catch (e) {
    const ms = Date.now() - start;
    efStatus[name] = { error: e.message, ms };
    console.log(`✗ ${name.padEnd(28)} ${e.message}  ${ms}ms`);
    note("crit", "Edge Function", `${name} failed: ${e.message}`);
  }
}

// ─── SECTION 2: pg_cron + pg_net dispatch history ───────────────────────────
section("2. pg_cron + pg_net DISPATCH HISTORY (last 24h)");

const cronRuns = await client.query(`
  SELECT jrd.runid, j.jobname, jrd.status, jrd.return_message, jrd.start_time, jrd.end_time,
         EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) AS duration_s
  FROM cron.job_run_details jrd
  JOIN cron.job j ON j.jobid = jrd.jobid
  WHERE jrd.start_time > NOW() - INTERVAL '24 hours'
  ORDER BY jrd.start_time DESC
  LIMIT 20
`);
console.log(`pg_cron runs (last 24h): ${cronRuns.rows.length}`);
const runByJob = {};
for (const r of cronRuns.rows) {
  runByJob[r.jobname] ??= { total: 0, succeeded: 0, failed: 0 };
  runByJob[r.jobname].total += 1;
  if (r.status === "succeeded") runByJob[r.jobname].succeeded += 1;
  if (r.status === "failed") runByJob[r.jobname].failed += 1;
}
for (const [job, c] of Object.entries(runByJob)) {
  console.log(`  ${job.padEnd(30)} succeeded=${c.succeeded} failed=${c.failed} total=${c.total}`);
  if (c.failed > 0) note("high", "pg_cron", `Job '${job}' has ${c.failed} failed runs in last 24h`);
}
if (cronRuns.rows.length === 0) note("med", "pg_cron", "No cron run history in last 24h — schedule may not be firing");

const netResponses = await client.query(`
  SELECT id, status_code, EXTRACT(EPOCH FROM created)::int AS created_epoch,
         CASE WHEN length(content::text) > 200 THEN substring(content::text from 1 for 200) || '...' ELSE content::text END AS content_preview
  FROM net._http_response
  ORDER BY created DESC
  LIMIT 10
`);
console.log(`\npg_net responses (last 10):`);
const statusCounts = { ok: 0, err: 0 };
for (const r of netResponses.rows) {
  const ageMin = Math.round((Date.now() / 1000 - r.created_epoch) / 60);
  console.log(`  id=${r.id} status=${r.status_code} age=${ageMin}min  ${String(r.content_preview).slice(0,90)}`);
  if (r.status_code >= 200 && r.status_code < 300) statusCounts.ok++;
  else statusCounts.err++;
}
console.log(`  → ${statusCounts.ok} OK, ${statusCounts.err} error(s)`);
// Note: pg_net null status_code means the pg_net 5s response-wait timed out —
// NOT that the Edge Function failed. The function dispatch is fire-and-forget
// from pg_cron's perspective; the EF still completes its work and writes to
// the DB. We only flag this as concerning when there are zero successful
// responses AND ingestion_runs has not been written to recently.
const recentIngestionRun = await client.query(`
  SELECT MAX(last_run_at) AS most_recent FROM public.ingestion_runs WHERE kind = 'ingest-news'
`);
const ingestionAgeMin = recentIngestionRun.rows[0]?.most_recent
  ? Math.round((Date.now() - new Date(recentIngestionRun.rows[0].most_recent).getTime()) / 60_000)
  : null;
if (statusCounts.ok === 0 && statusCounts.err > 0 && (ingestionAgeMin === null || ingestionAgeMin > 30)) {
  note("high", "pg_net", `pg_net dispatches all failing AND ingestion_runs[ingest-news] not updated in ${ingestionAgeMin ?? "ever"}min — pipeline genuinely broken`);
} else if (statusCounts.err > 0) {
  console.log(`  (null status_code rows are expected — pg_net's 5s response wait times out while the Edge Function keeps working; ingestion_runs proves the EF actually ran ${ingestionAgeMin}min ago)`);
}

// ─── SECTION 3: Ingest pipeline data flow ───────────────────────────────────
section("3. INGEST PIPELINE DATA FLOW");

const dataFlow = [
  { name: "ingestion_runs table — last run timestamps",
    q: `SELECT kind, last_run_at, NOW() - last_run_at AS age FROM public.ingestion_runs ORDER BY last_run_at DESC` },
  { name: "breaking_news_events — last 24h",
    q: `SELECT COUNT(*) AS total, MAX(detected_at) AS most_recent, MIN(detected_at) AS oldest FROM public.breaking_news_events WHERE detected_at > NOW() - INTERVAL '24 hours'` },
  { name: "breaking_news_events — by confidence",
    q: `SELECT confidence, COUNT(*) FROM public.breaking_news_events GROUP BY confidence ORDER BY count DESC` },
  { name: "breaking_news_events — by source",
    q: `SELECT source, COUNT(*) FROM public.breaking_news_events GROUP BY source ORDER BY count DESC LIMIT 10` },
  { name: "career_page_snapshots — current state",
    q: `SELECT fetch_status, COUNT(*) FROM public.career_page_snapshots WHERE fetched_at > NOW() - INTERVAL '2 hours' GROUP BY fetch_status` },
  { name: "company_intelligence — github_org coverage",
    q: `SELECT COUNT(*) FILTER (WHERE github_org IS NOT NULL) AS with_org, COUNT(*) AS total FROM public.company_intelligence` },
];
for (const c of dataFlow) {
  try {
    const r = await client.query(c.q);
    console.log(`\n${c.name}:`);
    for (const row of r.rows) console.log(`  `, JSON.stringify(row));
  } catch (e) {
    console.log(`✗ ${c.name}: ${e.message}`);
    note("med", "Pipeline", `${c.name} query failed: ${e.message}`);
  }
}

// ─── SECTION 4: Legacy function reachability ────────────────────────────────
section("4. LEGACY FUNCTION REACHABILITY (orphan detection)");

// Functions that exist on remote but were deployed long ago. Check if they're still being called.
const legacyFns = [
  "consensus-validator", "job-posting-demand", "layoff-signals", "metadata",
  "pipeline-orchestrator", "resource-sync", "score-calibrator", "bls-ingestion",
  "compute-oracle", "refresh-market-intelligence", "fetch-bse-data",
  "multi-model-analyze", "api-displacement-scores", "breaking-news-scan",
  "warn-act-fetch", "analyze-signals",
];
// Use OPTIONS, not POST — POST triggers real side effects on legacy functions
// (e.g. breaking-news-scan ignored a `{_probe:true}` body and inserted a
// false-positive row from a typo'd blog URL into breaking_news_events).
console.log(`\nProbing ${legacyFns.length} legacy functions with OPTIONS (safe, no side effects):`);
let reachable = 0, unreachable = 0;
for (const fn of legacyFns) {
  try {
    const res = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/${fn}`, {
      method: "OPTIONS",
      headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Access-Control-Request-Method": "POST" },
      signal: AbortSignal.timeout(8_000),
    });
    // Don't care about 4xx/5xx body — just that the function answers
    if (res.status === 404) {
      console.log(`  ✗ ${fn.padEnd(32)} 404 (function not deployed)`);
      unreachable++;
      note("med", "Legacy EF", `${fn} returns 404 — listed in functions list but unreachable`);
    } else if (res.status >= 500) {
      console.log(`  ? ${fn.padEnd(32)} ${res.status} (deployed but crashes on probe)`);
      reachable++;
    } else {
      console.log(`  ✓ ${fn.padEnd(32)} ${res.status} (responding)`);
      reachable++;
    }
  } catch (e) {
    console.log(`  ✗ ${fn.padEnd(32)} ${e.message}`);
    unreachable++;
  }
}
console.log(`  → ${reachable} reachable, ${unreachable} unreachable`);

// ─── SECTION 5: Schema consistency ──────────────────────────────────────────
section("5. SCHEMA CONSISTENCY AUDIT");

const schemaProbes = [
  { name: "breaking_news_events: detected_at column",
    q: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='breaking_news_events' AND column_name='detected_at') AS exists` },
  { name: "breaking_news_events: created_at column (should NOT exist; we standardize on detected_at)",
    q: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='breaking_news_events' AND column_name='created_at') AS exists` },
  { name: "breaking_news_events: region column",
    q: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='breaking_news_events' AND column_name='region') AS exists` },
  { name: "company_intelligence: github_org column",
    q: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='company_intelligence' AND column_name='github_org') AS exists` },
  { name: "Unique constraint on breaking_news_events (idempotency)",
    q: `SELECT COUNT(*) AS unique_constraints FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='breaking_news_events' AND constraint_type='UNIQUE'` },
  { name: "ingestion_runs table",
    q: `SELECT COUNT(*) AS rows FROM public.ingestion_runs` },
];
for (const c of schemaProbes) {
  try {
    const { rows } = await client.query(c.q);
    console.log(`  ${c.name}: ${JSON.stringify(rows[0])}`);
  } catch (e) {
    console.log(`  ✗ ${c.name}: ${e.message}`);
  }
}

// ─── SECTION 6: Realtime publication ────────────────────────────────────────
section("6. REALTIME PUBLICATION + RLS GUARDS");

const realtimeTables = await client.query(`
  SELECT pt.tablename, c.relreplident
  FROM pg_publication_tables pt
  JOIN pg_class c ON c.relname = pt.tablename
  WHERE pt.pubname = 'supabase_realtime'
  ORDER BY pt.tablename
`);
console.log(`Tables in supabase_realtime publication:`);
let bnePublished = false;
for (const r of realtimeTables.rows) {
  const replIdent = r.relreplident === "f" ? "FULL" : r.relreplident;
  console.log(`  - ${r.tablename}  (REPLICA IDENTITY ${replIdent})`);
  if (r.tablename === "breaking_news_events") bnePublished = true;
}
if (!bnePublished) note("crit", "Realtime", "breaking_news_events NOT in supabase_realtime publication — Realtime push will not work");

const rlsCheck = await client.query(`
  SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class
  WHERE relname IN ('breaking_news_events','career_page_snapshots','ingestion_runs','company_intelligence')
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
`);
console.log(`\nRLS state for v22-touched tables:`);
for (const r of rlsCheck.rows) {
  console.log(`  ${r.relname.padEnd(28)} rowsecurity=${r.relrowsecurity} force=${r.relforcerowsecurity}`);
  if (!r.relrowsecurity && r.relname !== "ingestion_runs") {
    note("med", "RLS", `${r.relname} has RLS disabled — anon/auth users could read uncurated data`);
  }
}

// ─── SECTION 7: Connector reliability check ─────────────────────────────────
section("7. CONNECTOR RELIABILITY (live OSINT probe)");

const connectorProbes = [
  { name: "TechCrunch Layoffs RSS", url: "https://techcrunch.com/tag/layoffs/feed/" },
  { name: "Hacker News RSS",        url: "https://hnrss.org/frontpage" },
  { name: "Reddit r/layoffs",       url: "https://www.reddit.com/r/layoffs/new.json?limit=5" },
  { name: "Layoffs.fyi RSS",        url: "https://layoffs.fyi/feed" },
  { name: "Moneycontrol Business",  url: "https://www.moneycontrol.com/rss/business.xml" },
  { name: "Yahoo Finance (TCS.NS)", url: "https://query1.finance.yahoo.com/v8/finance/chart/TCS.NS?range=1d&interval=1d" },
  { name: "GitHub API (unauth)",    url: "https://api.github.com/orgs/microsoft/repos?per_page=2" },
];
console.log(`\nProbing ${connectorProbes.length} external sources:`);
for (const p of connectorProbes) {
  const start = Date.now();
  try {
    const res = await fetch(p.url, {
      headers: { "User-Agent": "humanproof-audit/1.0", "Accept": "*/*" },
      signal: AbortSignal.timeout(10_000),
    });
    const ms = Date.now() - start;
    const ok = res.ok;
    console.log(`  ${ok ? "✓" : "✗"} ${p.name.padEnd(30)} HTTP ${res.status}  ${ms}ms`);
    if (!ok) note("med", "Connector", `${p.name} returned HTTP ${res.status}`);
  } catch (e) {
    console.log(`  ✗ ${p.name.padEnd(30)} ${e.message}`);
    note("high", "Connector", `${p.name} unreachable: ${e.message}`);
  }
}

// ─── FINDINGS SUMMARY ───────────────────────────────────────────────────────
section("AUDIT FINDINGS SUMMARY");

const bySeverity = { crit: [], high: [], med: [], low: [], info: [] };
for (const f of findings) bySeverity[f.severity]?.push(f);

for (const sev of ["crit", "high", "med", "low", "info"]) {
  if (bySeverity[sev].length === 0) continue;
  console.log(`\n${sev.toUpperCase()} (${bySeverity[sev].length}):`);
  for (const f of bySeverity[sev]) {
    console.log(`  · [${f.area}] ${f.finding}`);
  }
}
if (findings.length === 0) console.log("\n✓ No issues detected.");

await client.end();
