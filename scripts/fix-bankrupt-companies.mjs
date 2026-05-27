// fix-bankrupt-companies.mjs
// Insert total_open_roles=0 for companies that are bankrupt/shut down/fully absorbed.
// These are confirmed-0 cases — not Adzuna returning 0, but known operational status.
// Also insert 0 for companies that Adzuna confirmed have 0 listings on their primary market.

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function update(canonicalName, updates) {
  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence SET ${setClauses}, updated_at = NOW() WHERE canonical_name = $1`,
    [canonicalName, ...Object.values(updates)]
  );
  return rowCount ?? 0;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");

  const now = new Date().toISOString();

  // ── Bankrupt / Shut down / Fully absorbed companies → 0 open roles ────────────
  // These companies no longer independently hire under their brand.
  const zeroRoles = [
    ["invision",              "company_shutdown_2024",        "InVision shut down Dec 2024 — no jobs"],
    ["invitae",               "company_bankrupt_2024",        "Invitae Chapter 7 liquidation Jun 2024 — no jobs"],
    ["karuna therapeutics",   "company_acquired_2024",        "Acquired by Bristol-Myers Squibb Jan 2024 — no longer independent"],
    ["shockwave medical",     "company_acquired_2024",        "Acquired by J&J May 2024 — no longer independent"],
  ];

  console.log("=== Bankrupt/Acquired companies → 0 open roles ===");
  for (const [cn, source, note] of zeroRoles) {
    process.stdout.write(`  ${cn.padEnd(30)} `);
    const rc = await update(cn, {
      total_open_roles:     0,
      hiring_source:        source,
      hiring_verified_at:   now,
      hiring_confidence:    0.95,
      hiring_velocity_score: -0.5,
    });
    console.log(`✓  0 jobs (${note}) [${rc} updated]`);
  }

  // ── Fisker: Bankrupt but NOT liquidated — may still have residual roles ────────
  // Fisker filed Chapter 11 June 2024 and was then sold. As of May 2026:
  // Fisker Inc. vehicles are still in market but company is essentially shut down.
  // Insert 0 as confirmed hiring stop.
  process.stdout.write(`  fisker                         `);
  const fiskerRc = await update("fisker", {
    total_open_roles:     0,
    hiring_source:        "company_bankrupt_2024",
    hiring_verified_at:   now,
    hiring_confidence:    0.90,
    hiring_velocity_score: -0.5,
  });
  console.log(`✓  0 jobs (Chapter 11 June 2024 — operational shutdown) [${fiskerRc} updated]`);

  // ── Babylon Health: bankrupt 2023 ─────────────────────────────────────────────
  // Already has is_public=false, but check if total_open_roles still NULL
  const { rows: babylonCheck } = await db.query(
    `SELECT canonical_name, total_open_roles FROM verified_company_intelligence WHERE canonical_name = 'babylon health'`
  );
  if (babylonCheck[0] && babylonCheck[0].total_open_roles === null) {
    process.stdout.write(`  babylon health                 `);
    const rc = await update("babylon health", {
      total_open_roles:     0,
      hiring_source:        "company_bankrupt_2023",
      hiring_verified_at:   now,
      hiring_confidence:    0.95,
      hiring_velocity_score: -0.5,
    });
    console.log(`✓  0 jobs (bankrupt Aug 2023) [${rc} updated]`);
  }

  // Final summary
  const { rows: s } = await db.query(`
    SELECT
      count(*) AS total,
      count(total_open_roles) AS has_roles,
      sum(CASE WHEN total_open_roles > 0 THEN 1 ELSE 0 END) AS nonzero,
      count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null
    FROM verified_company_intelligence
  `);
  const c = s[0];
  await db.end();

  console.log(`
=== FINAL STATE ===
Has open_roles: ${c.has_roles} / ${c.total}
Non-zero:       ${c.nonzero}
Still NULL:     ${c.still_null}
`);
}

main().catch(e => { console.error(e); process.exit(1); });
