// Store the pg_cron dispatch URL + service-role key in Supabase Vault, and
// rewrite the `ingest_breaking_news()` function to read from vault instead of
// from `app.*` settings (which require ALTER DATABASE permission we don't have).

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
await client.connect();

// Helper: upsert into vault.secrets by NAME (vault.create_secret() throws if name exists).
async function upsertSecret(name, secret, description) {
  const { rows } = await client.query(
    `SELECT id FROM vault.secrets WHERE name = $1`,
    [name],
  );
  if (rows.length > 0) {
    await client.query(
      `SELECT vault.update_secret($1, $2, $3, $4)`,
      [rows[0].id, secret, name, description],
    );
    console.log(`✓ updated vault secret "${name}"`);
  } else {
    await client.query(
      `SELECT vault.create_secret($1, $2, $3)`,
      [secret, name, description],
    );
    console.log(`✓ created vault secret "${name}"`);
  }
}

await upsertSecret(
  "ingest_news_url",
  ingestUrl,
  "URL of the ingest-news Edge Function — read by pg_cron job ingest-breaking-news every 10 minutes.",
);
await upsertSecret(
  "supabase_service_key",
  SERVICE_KEY,
  "Service-role JWT for authenticating pg_cron → Edge Function dispatch.",
);

// Rewrite the function to read from vault.
const fnSql = `
CREATE OR REPLACE FUNCTION public.ingest_breaking_news()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_edge_url TEXT;
  v_service_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_edge_url FROM vault.decrypted_secrets WHERE name = 'ingest_news_url' LIMIT 1;
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'supabase_service_key' LIMIT 1;

  IF v_edge_url IS NULL OR v_edge_url = '' THEN
    RAISE NOTICE '[IngestNews] vault secret "ingest_news_url" not set — skipping cron tick.';
    RETURN;
  END IF;
  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE '[IngestNews] vault secret "supabase_service_key" not set — skipping cron tick.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_edge_url,
    body    := jsonb_build_object('triggered_by', 'pg_cron'),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[IngestNews] Error dispatching cron tick: % — %', SQLSTATE, SQLERRM;
END;
$body$;
`;

console.log("\nRewriting ingest_breaking_news() to read from vault ...");
await client.query(fnSql);
console.log("✓ function updated");

// Test invoke
console.log("\nTest-firing ingest_breaking_news() once ...");
try {
  await client.query(`SELECT public.ingest_breaking_news()`);
  console.log("✓ function executed without error (HTTP dispatch is async; check ingestion_runs in ~30s)");
} catch (e) {
  console.error("✗ test invocation failed:", e.message);
}

await client.end();
