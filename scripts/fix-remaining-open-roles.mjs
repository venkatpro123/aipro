// fix-remaining-open-roles.mjs
// Insert confirmed Adzuna counts for companies with fixed names/markets.
// Also inserts 0 for companies recognized by Adzuna but with no current listings.

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ADZUNA_APP_ID  = "a3715ff2";
const ADZUNA_APP_KEY = "18d8b4a8e1a20d0428d42920abfafe91";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAdzuna(companyName, adzunaCountry) {
  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: "1",
      company: companyName,
    });
    const url = `https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/1?${params}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) { if (res.status === 429) { await sleep(10000); } return null; }
    const data = await res.json();
    return typeof data.count === "number" ? data.count : null;
  } catch { return null; }
}

async function updateRoles(db, canonicalName, openRoles, source) {
  const velocityScore =
    openRoles > 1000 ? 1.5 : openRoles > 500 ? 1.0 : openRoles > 100 ? 0.5 : openRoles > 0 ? 0.1 : -0.5;
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence
     SET total_open_roles = $2, hiring_source = $3,
         hiring_verified_at = NOW(), hiring_confidence = 0.82,
         hiring_velocity_score = $4, updated_at = NOW()
     WHERE canonical_name = $1`,
    [canonicalName, openRoles, source, velocityScore]
  );
  return rowCount ?? 0;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");

  let updated = 0;

  // ── Companies with confirmed Adzuna counts (name fix needed) ──────────────────
  const confirmed = [
    // [canonical_name, adzuna_name, adzuna_country]
    ["toronto dominion bank",    "TD",                 "ca"],   // 488
    ["asml",                     "ASML",               "nl"],   // 317
    ["wuxi apptec",              "WuXi AppTec",        "us"],   // 32
    ["bp plc",                   "BP",                 "gb"],   // 32
    ["ubs",                      "UBS",                "gb"],   // 2
    ["american express",         "American Express",   "us"],   // 415
    ["zimmer biomet",            "Zimmer Biomet",      "us"],   // 447
    ["associated british foods", "Associated British Foods", "gb"],  // may be 0, but real
    ["dsv a s",                  "DSV",                "de"],   // may be 0, but real
  ];

  console.log("=== Fetching confirmed companies ===");
  for (const [cn, name, country] of confirmed) {
    process.stdout.write(`  ${cn.padEnd(35)} [${country}] "${name}" → `);
    const count = await fetchAdzuna(name, country);
    if (count === null) {
      console.log(`no data`);
    } else {
      const rc = await updateRoles(db, cn, count, "adzuna_api");
      updated += rc;
      console.log(`✓  ${count} jobs (${rc} row updated)`);
    }
    await sleep(600);
  }

  // ── Additional companies to try with different names ─────────────────────────
  console.log("\n=== Additional companies with alternative names ===");
  const additionalTests = [
    // [canonical_name, names_to_try[], country]
    ["hca healthcare",   ["HCA", "HCA Healthcare Inc", "HCA Hospitals"],    "us"],
    ["nubank",           ["Nubank", "Nu Holdings"],                          "us"],
    ["nubank",           ["Nubank"],                                          "gb"],
    ["axa global",       ["AXA", "AXA Insurance"],                           "gb"],
    ["bbva",             ["BBVA", "Banco Bilbao"],                            "gb"],
    ["bbva",             ["BBVA", "BBVA USA"],                                "us"],
    ["amerisourcebergen",["AmerisourceBergen", "Cencora", "Amerisource"],    "us"],
    ["certara",          ["Certara"],                                          "gb"],
    ["vanguard",         ["Vanguard Group"],                                  "us"],
    ["biogen inc",       ["Biogen"],                                          "gb"],
    ["confluent",        ["Confluent"],                                       "gb"],
    ["cytiva",           ["Cytiva", "Danaher"],                              "us"],
  ];

  for (const [cn, names, country] of additionalTests) {
    process.stdout.write(`  ${cn.padEnd(25)} [${country}] `);
    let found = false;
    for (const name of names) {
      const count = await fetchAdzuna(name, country);
      await sleep(400);
      if (count !== null) {
        process.stdout.write(`"${name}" → ${count} `);
        const rc = await updateRoles(db, cn, count, "adzuna_api");
        updated += rc;
        console.log(`✓ (${rc} updated)`);
        found = true;
        break;
      }
    }
    if (!found) console.log(`— no data`);
    await sleep(400);
  }

  // ── India companies — try Tata Steel on GB (Tata has major UK steel operations) ─
  console.log("\n=== India companies with international presence ===");
  const indiaTests = [
    ["tata steel", "Tata Steel", "gb"],   // Tata Steel UK (former British Steel)
    ["tata steel", "Tata Steel", "de"],
  ];
  for (const [cn, name, country] of indiaTests) {
    process.stdout.write(`  ${cn} [${country}] "${name}" → `);
    const count = await fetchAdzuna(name, country);
    await sleep(600);
    if (count !== null) {
      const rc = await updateRoles(db, cn, count, "adzuna_api");
      updated += rc;
      console.log(`✓  ${count} jobs`);
    } else {
      console.log(`no data`);
    }
  }

  // Final summary
  const { rows: s } = await db.query(`
    SELECT
      count(*) AS total,
      count(total_open_roles) AS has_roles,
      sum(CASE WHEN total_open_roles > 0 THEN 1 ELSE 0 END) AS nonzero_roles,
      count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null
    FROM verified_company_intelligence
  `);
  const c = s[0];
  await db.end();

  console.log(`
=== FIX COMPLETE ===
Updated: ${updated}

DB state:
  Has open_roles: ${c.has_roles} / ${c.total}
  Non-zero:       ${c.nonzero_roles}
  Still NULL:     ${c.still_null}
`);
}

main().catch(e => { console.error(e); process.exit(1); });
