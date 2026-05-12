// Configures app.* settings on the Supabase Postgres so the pg_cron job can
// dispatch HTTP calls to the ingest-news Edge Function. Without these, the
// cron tick fires but the plpgsql function exits early with a NOTICE.

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF  = "ysenimczeasmaeojzlkt";

if (!DATABASE_URL || !SERVICE_KEY) {
  console.error("DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}

const ingestUrl = `https://${PROJECT_REF}.supabase.co/functions/v1/ingest-news`;

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();

  // Database-level GUC for the cron functions. ALTER DATABASE does NOT accept
  // bind parameters — the value must be inlined. Use Postgres dollar-quoting
  // (no escaping needed for the JWT body) — both values are alphanumeric +
  // a few symbols (. / : - _) with no `$` characters.
  if (ingestUrl.includes("$") || SERVICE_KEY.includes("$")) {
    throw new Error("value contains a `$` — dollar-quote tag collision risk");
  }
  console.log("Setting app.ingest_news_url ...");
  await client.query(`ALTER DATABASE postgres SET app.ingest_news_url = $tag$${ingestUrl}$tag$`);

  console.log("Setting app.supabase_service_key ...");
  await client.query(`ALTER DATABASE postgres SET app.supabase_service_key = $tag$${SERVICE_KEY}$tag$`);

  // Verify
  const { rows } = await client.query(`
    SELECT name, setting FROM pg_db_role_setting drs
    JOIN pg_database d ON d.oid = drs.setdatabase
    WHERE d.datname = 'postgres' AND name IN ('app.ingest_news_url','app.supabase_service_key')
  `);
  for (const r of rows) {
    const preview = r.name === "app.supabase_service_key"
      ? `${String(r.setting).slice(0, 20)}...`
      : r.setting;
    console.log(`✓ ${r.name} = ${preview}`);
  }

  // The cron function reads via current_setting at execution time. Settings
  // set via ALTER DATABASE take effect on next connection — they don't apply
  // to in-flight connections. We can also set via session-local SET for testing,
  // but pg_cron starts a fresh connection per tick so the ALTER takes effect.

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
