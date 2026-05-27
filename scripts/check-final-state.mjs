// check-final-state.mjs
import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

// Fix: revert Cytiva (1485 is Danaher's count, not Cytiva's)
// Cytiva is a brand subsidiary - using parent company's count is inaccurate
await db.query(`
  UPDATE verified_company_intelligence
  SET total_open_roles = NULL, hiring_source = NULL, hiring_verified_at = NULL,
      hiring_confidence = NULL, hiring_velocity_score = NULL, updated_at = NOW()
  WHERE canonical_name = 'cytiva'
`);
console.log("✓ Reverted cytiva (Danaher count was wrong — not Cytiva-specific)");

// Check current state
const { rows: s } = await db.query(`
  SELECT
    count(*) AS total,
    count(total_open_roles) AS has_roles,
    sum(CASE WHEN total_open_roles > 0 THEN 1 ELSE 0 END) AS nonzero,
    count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null,
    max(total_open_roles) AS max_roles
  FROM verified_company_intelligence
`);
const c = s[0];
console.log(`\nDB state:`);
console.log(`  Has open_roles: ${c.has_roles} / ${c.total}`);
console.log(`  Non-zero:       ${c.nonzero}`);
console.log(`  Still NULL:     ${c.still_null}`);
console.log(`  Max open_roles: ${c.max_roles}`);

// List remaining NULLs
const { rows: nulls } = await db.query(`
  SELECT canonical_name, display_name, country_code, is_public
  FROM verified_company_intelligence
  WHERE total_open_roles IS NULL
  ORDER BY country_code, canonical_name
`);

console.log(`\nRemaining ${nulls.length} companies with NULL total_open_roles:`);
for (const r of nulls) {
  const pub = r.is_public ? "[PUB]" : "[PVT]";
  console.log(`  ${pub} [${r.country_code}] "${r.canonical_name}" — ${r.display_name}`);
}

await db.end();
