// revert-smartrecruiters.mjs
// SmartRecruiters API returns {totalFound:0} for ANY company ID (even fake ones)
// All SmartRecruiters data inserted was false zeros — revert to NULL

import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const toRevert = [
  "equinor", "check point", "bbva", "vanguard", "vertex pharmaceuticals",
  "align technology", "insulet", "masimo", "alnylam pharmaceuticals", "qlik", "certara"
];

for (const cn of toRevert) {
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence
     SET total_open_roles = NULL, hiring_source = NULL, hiring_verified_at = NULL,
         hiring_confidence = NULL, hiring_velocity_score = NULL, updated_at = NOW()
     WHERE canonical_name = $1 AND hiring_source = 'smartrecruiters_api'`,
    [cn]
  );
  console.log(`  Reverted: ${cn.padEnd(30)} [${rowCount} rows]`);
}

const { rows: s } = await db.query(`
  SELECT count(*) AS total, count(total_open_roles) AS has_roles,
    count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null
  FROM verified_company_intelligence
`);
await db.end();
console.log(`\nState: ${s[0].has_roles}/${s[0].total} filled, ${s[0].still_null} still NULL`);
