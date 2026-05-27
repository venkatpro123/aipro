import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const { rows: stats } = await db.query(`
  SELECT
    count(*) AS total,
    count(total_open_roles) AS has_roles,
    count(recent_layoff_count) AS has_layoff_count,
    count(layoff_last_event_at) AS has_layoff_date,
    count(hiring_velocity_score) AS has_hiring_velocity,
    count(largest_layoff_pct) AS has_layoff_pct
  FROM verified_company_intelligence
`);
const s = stats[0];
console.log(`\n=== VCI Fields Status ===`);
console.log(`total_open_roles:      ${s.has_roles} / ${s.total}`);
console.log(`recent_layoff_count:   ${s.has_layoff_count} / ${s.total}`);
console.log(`layoff_last_event_at:  ${s.has_layoff_date} / ${s.total}`);
console.log(`largest_layoff_pct:    ${s.has_layoff_pct} / ${s.total}`);
console.log(`hiring_velocity_score: ${s.has_hiring_velocity} / ${s.total}`);

// Companies with recent layoffs
const { rows: layoffs } = await db.query(`
  SELECT canonical_name, recent_layoff_count, largest_layoff_pct, layoff_last_event_at
  FROM verified_company_intelligence
  WHERE recent_layoff_count > 0
  ORDER BY recent_layoff_count DESC
  LIMIT 10
`);
console.log(`\nTop 10 companies by layoff count:`);
layoffs.forEach(r => {
  const dt = r.layoff_last_event_at ? new Date(r.layoff_last_event_at).toLocaleDateString() : '—';
  console.log(`  ${r.canonical_name.padEnd(32)} count=${r.recent_layoff_count} pct=${r.largest_layoff_pct}% last=${dt}`);
});

await db.end();
