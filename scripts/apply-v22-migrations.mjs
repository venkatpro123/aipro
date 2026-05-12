// Apply the three v22 migrations directly to the Supabase Postgres instance.
// Idempotent: each migration uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
// This bypasses `supabase db push` because of unrelated migration drift between
// local and remote (22 remote-only migrations vs ~30 local-only April-May
// migrations) that would require an interactive repair pass to resolve.

import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL env var required");
  process.exit(2);
}

const MIGRATIONS = [
  "supabase/migrations/20260512000001_real_time_news_ingestion.sql",
  "supabase/migrations/20260512000002_career_page_snapshots.sql",
  "supabase/migrations/20260512000003_add_github_org.sql",
];

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log("Connected.");

  for (const rel of MIGRATIONS) {
    const abs = path.resolve(rel);
    const sql = await readFile(abs, "utf8");
    console.log(`\n--- Applying ${path.basename(rel)} (${sql.length} bytes) ---`);
    try {
      await client.query(sql);
      console.log(`✓ ${path.basename(rel)}`);
    } catch (e) {
      console.error(`✗ ${path.basename(rel)}: ${e.message}`);
      // Don't abort — try remaining migrations; some may already be partly applied.
    }
  }

  // Verification — check that the three v22 artifacts exist
  const checks = [
    { name: "ingestion_runs table", q: `SELECT to_regclass('public.ingestion_runs') IS NOT NULL AS exists` },
    { name: "career_page_snapshots table", q: `SELECT to_regclass('public.career_page_snapshots') IS NOT NULL AS exists` },
    { name: "company_intelligence.github_org column", q: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='company_intelligence' AND column_name='github_org') AS exists` },
    { name: "ingest_breaking_news function", q: `SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='ingest_breaking_news') AS exists` },
    { name: "pg_cron schedule (ingest-breaking-news)", q: `SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname='ingest-breaking-news') AS exists` },
  ];

  console.log("\n=== Post-apply verification ===");
  for (const c of checks) {
    try {
      const { rows } = await client.query(c.q);
      const ok = rows?.[0]?.exists === true;
      console.log(`${ok ? "✓" : "✗"} ${c.name}`);
    } catch (e) {
      console.log(`? ${c.name} — ${e.message}`);
    }
  }

  await client.end();
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
