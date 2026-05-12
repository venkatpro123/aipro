import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

console.log("=== breaking_news_events columns ===");
const { rows: bne } = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='breaking_news_events'
  ORDER BY ordinal_position`);
for (const r of bne) console.log(" -", r.column_name, "·", r.data_type);

console.log("\n=== Sample company_intelligence.company_name values ===");
const { rows: ci } = await client.query(`SELECT company_name FROM public.company_intelligence ORDER BY company_name LIMIT 20`);
for (const r of ci) console.log(" -", r.company_name);

console.log("\n=== Total company_intelligence rows ===");
const { rows: cnt } = await client.query(`SELECT COUNT(*) AS n FROM public.company_intelligence`);
console.log("count:", cnt[0].n);

console.log("\n=== Sample for seed-keys (google/microsoft/apple/tcs/infosys) ===");
const { rows: seed } = await client.query(`SELECT company_name, github_org FROM public.company_intelligence WHERE company_name ILIKE ANY (ARRAY['%google%','%microsoft%','%apple%','%tcs%','%infosys%']) ORDER BY company_name`);
for (const r of seed) console.log(" -", r.company_name, "·", r.github_org ?? "(null)");

await client.end();
