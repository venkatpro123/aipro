// apply-vci-migration.mjs
// Applies 20260624000001_verified_company_intelligence.sql to production Supabase.
// Uses a direct pg connection (same pattern as apply-v22-migrations.mjs) because
// supabase db push would require an interactive drift repair.

import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL env var required");
  process.exit(2);
}

const MIGRATION = "supabase/migrations/20260624000001_verified_company_intelligence.sql";

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log("✓ Connected to Supabase Postgres");

  const abs = path.resolve(MIGRATION);
  const sql = await readFile(abs, "utf8");
  console.log(`\n--- Applying ${path.basename(abs)} (${sql.length} bytes) ---`);

  try {
    await client.query(sql);
    console.log("✓ Migration applied");
  } catch (e) {
    console.error(`✗ Migration failed: ${e.message}`);
    process.exit(1);
  }

  // ── Verification ────────────────────────────────────────────────────────────
  console.log("\n=== Post-apply verification ===");

  const checks = [
    {
      name: "verified_company_intelligence table",
      q: `SELECT to_regclass('public.verified_company_intelligence') IS NOT NULL AS exists`,
    },
    {
      name: "company_risk_overrides table",
      q: `SELECT to_regclass('public.company_risk_overrides') IS NOT NULL AS exists`,
    },
    {
      name: "company_migration_log table",
      q: `SELECT to_regclass('public.company_migration_log') IS NOT NULL AS exists`,
    },
    {
      name: "RLS enabled on verified_company_intelligence",
      q: `SELECT relrowsecurity AS exists FROM pg_class WHERE relname='verified_company_intelligence'`,
    },
    {
      name: "anon_read_vci policy",
      q: `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='verified_company_intelligence' AND policyname='anon_read_vci') AS exists`,
    },
    {
      name: "data_quality_tier check constraint",
      q: `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='verified_company_intelligence_data_quality_tier_check') AS exists`,
    },
    {
      name: "vci canonical_name unique index",
      q: `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='verified_company_intelligence' AND indexname='idx_vci_canonical_name') AS exists`,
    },
  ];

  let allPassed = true;
  for (const c of checks) {
    try {
      const { rows } = await client.query(c.q);
      const ok = rows?.[0]?.exists === true;
      console.log(`${ok ? "✓" : "✗"} ${c.name}`);
      if (!ok) allPassed = false;
    } catch (e) {
      console.log(`? ${c.name} — ${e.message}`);
      allPassed = false;
    }
  }

  await client.end();

  if (!allPassed) {
    console.error("\n❌ Some checks failed — review above");
    process.exit(1);
  }
  console.log("\n✅ All checks passed — VCI schema is live");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
