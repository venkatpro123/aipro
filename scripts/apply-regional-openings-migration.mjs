// Apply migration 20260622000009_market_intelligence_regional_openings.sql
// v40.0 — adds regional_openings JSONB column to market_intelligence_cache so
// the LLM brief prompt can cite region-appropriate data (StepStone for Germany,
// Reed for UK, etc.) instead of defaulting to Naukri for every user.

import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

// Inline minimal .env loader — avoids dotenv dependency for one-off scripts.
try {
  const envText = await readFile(path.resolve(".env"), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/i);
    if (m && !process.env[m[1]]) {
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
} catch { /* .env optional */ }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL env var required");
  process.exit(2);
}

const MIGRATION = "supabase/migrations/20260622000009_market_intelligence_regional_openings.sql";

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log("Connected.");

  const abs = path.resolve(MIGRATION);
  const sql = await readFile(abs, "utf8");
  console.log(`\n--- Applying ${path.basename(MIGRATION)} (${sql.length} bytes) ---`);
  try {
    await client.query(sql);
    console.log(`OK  ${path.basename(MIGRATION)}`);
  } catch (e) {
    console.error(`FAIL ${path.basename(MIGRATION)}: ${e.message}`);
    process.exit(1);
  }

  // Verification: column + index + constraint exist
  const checks = [
    {
      name: "regional_openings column",
      q: `SELECT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='market_intelligence_cache'
              AND column_name='regional_openings') AS exists`,
    },
    {
      name: "idx_mic_regional_openings_gin",
      q: `SELECT EXISTS (SELECT 1 FROM pg_indexes
            WHERE schemaname='public' AND indexname='idx_mic_regional_openings_gin') AS exists`,
    },
    {
      name: "regional_openings_is_object constraint",
      q: `SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints
            WHERE table_schema='public' AND table_name='market_intelligence_cache'
              AND constraint_name='regional_openings_is_object') AS exists`,
    },
  ];

  console.log("\n--- Verification ---");
  let ok = true;
  for (const c of checks) {
    const { rows } = await client.query(c.q);
    const present = rows[0]?.exists === true;
    console.log(`${present ? "OK " : "MISS"}  ${c.name}`);
    if (!present) ok = false;
  }

  await client.end();
  if (!ok) {
    console.error("\nOne or more verification checks failed.");
    process.exit(1);
  }
  console.log("\nMigration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
