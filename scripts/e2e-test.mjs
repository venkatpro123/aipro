// e2e-test.mjs — real-world end-to-end test of the v22 pipeline.
// Resets ingestion_runs, fires ingest-news, then verifies the data flow.

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF  = "ysenimczeasmaeojzlkt";

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// Reset idempotency for ingest-news
console.log("1) Resetting ingestion_runs[ingest-news] ...");
await client.query(`DELETE FROM public.ingestion_runs WHERE kind = 'ingest-news'`);

// Snapshot row count BEFORE
const before = await client.query(`SELECT COUNT(*) AS n FROM public.breaking_news_events`);
console.log(`2) breaking_news_events row count before: ${before.rows[0].n}`);

// Invoke ingest-news
console.log("3) Invoking ingest-news ...");
const start = Date.now();
const res = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/ingest-news`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ triggered_by: "e2e_test" }),
  signal: AbortSignal.timeout(180_000),
});
const ms = Date.now() - start;
const text = await res.text();
let json;
try { json = JSON.parse(text); } catch { json = { _raw: text }; }
console.log(`   HTTP ${res.status}  duration=${ms}ms`);
console.log(`   response:`, JSON.stringify(json, null, 2));

// Verify ingestion_runs was written
const after = await client.query(`SELECT * FROM public.ingestion_runs WHERE kind='ingest-news'`);
console.log(`\n4) ingestion_runs after invocation:`, after.rows[0]);

// Snapshot row count AFTER
const afterCount = await client.query(`SELECT COUNT(*) AS n FROM public.breaking_news_events`);
console.log(`\n5) breaking_news_events row count after: ${afterCount.rows[0].n}`);
console.log(`   delta: +${parseInt(afterCount.rows[0].n) - parseInt(before.rows[0].n)} rows`);

// Show most recent events
const recent = await client.query(`
  SELECT company_name, event_date, headline, percent_cut, affected_count, confidence, source, detected_at
  FROM public.breaking_news_events
  ORDER BY detected_at DESC
  LIMIT 5
`);
console.log(`\n6) 5 most recent breaking_news_events rows:`);
for (const r of recent.rows) {
  const ageMin = Math.round((Date.now() - new Date(r.detected_at).getTime()) / 60000);
  console.log(`   ${r.detected_at?.toISOString?.() ?? r.detected_at} (${ageMin}min ago)`);
  console.log(`     company=${r.company_name}  conf=${r.confidence}  source=${r.source}`);
  console.log(`     ${r.headline?.slice(0, 100)}`);
  console.log(`     pct=${r.percent_cut} affected=${r.affected_count}`);
  console.log();
}

await client.end();
