import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

console.log("=== All active pg_cron schedules ===");
const cron = await client.query(`SELECT jobname, schedule, active, command FROM cron.job ORDER BY jobname`);
for (const r of cron.rows) {
  console.log(`  '${r.jobname}'  schedule=${r.schedule}  active=${r.active}`);
  console.log(`    cmd: ${String(r.command).slice(0, 200)}`);
}

console.log("\n=== Sources currently producing false-positive (confidence=low) rows ===");
const fp = await client.query(`
  SELECT source, COUNT(*) AS n, MAX(detected_at) AS most_recent
  FROM public.breaking_news_events
  WHERE confidence = 'low'
  GROUP BY source
  ORDER BY n DESC
`);
for (const r of fp.rows) console.log(`  ${r.source}: ${r.n} rows, most recent ${r.most_recent?.toISOString?.()}`);

console.log("\n=== Sample low-confidence rows for inspection ===");
const sample = await client.query(`
  SELECT company_name, headline, source, source_url, detected_at
  FROM public.breaking_news_events
  WHERE confidence = 'low'
  ORDER BY detected_at DESC
  LIMIT 8
`);
for (const r of sample.rows) {
  console.log(`  [${r.detected_at?.toISOString?.()}] ${r.company_name} | ${r.source}`);
  console.log(`     "${r.headline}"`);
  console.log(`     ${r.source_url}\n`);
}

console.log("\n=== Total counts by confidence ===");
const counts = await client.query(`
  SELECT confidence, COUNT(*) AS n FROM public.breaking_news_events GROUP BY confidence ORDER BY n DESC
`);
for (const r of counts.rows) console.log(`  ${r.confidence}: ${r.n}`);

await client.end();
