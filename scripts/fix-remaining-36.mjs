// fix-remaining-36.mjs
// Final push: try remaining 36 NULL companies with alternative names/markets
// India companies (10) are skipped — no accessible job board

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ADZUNA_APP_ID  = "a3715ff2";
const ADZUNA_APP_KEY = "18d8b4a8e1a20d0428d42920abfafe91";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAdzuna(companyName, country) {
  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: "1",
      company: companyName,
    });
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) {
      if (res.status === 429) { await sleep(10000); }
      return { count: null, status: res.status };
    }
    const data = await res.json();
    return { count: typeof data.count === "number" ? data.count : null, status: 200 };
  } catch (e) { return { count: null, status: "err" }; }
}

async function updateRoles(canonicalName, openRoles, source) {
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

async function tryCompany(canonicalName, tries) {
  // tries: array of [name, country]
  for (const [name, country] of tries) {
    const { count, status } = await fetchAdzuna(name, country);
    await sleep(600);
    if (count !== null) {
      return { name, country, count };
    }
    // 400 = not in DB, try next; 429 = already waited
  }
  return null;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");

  let updated = 0;

  // ── Non-India, Non-US NULL companies ──────────────────────────────────────
  // BR: Nubank — try Brazil market
  // DE: BioNTech — try Germany
  // ES: BBVA — Spain not supported, try gb as proxy (major UK ops)
  // FI: Oura — Finland not supported, try gb or us
  // IL: Check Point — Israel not supported, try us (major US presence)
  // NO: Equinor — Norway not supported, try gb (North Sea ops)
  // CN: Meituan — China, no Adzuna support

  const nonUSCandidates = [
    // [canonical, display, tries[]]
    ["nubank",      "Nu Holdings",       [["Nubank", "br"], ["Nu Holdings", "us"], ["Nubank", "us"], ["Nubank", "gb"]]],
    ["biontech",    "BioNTech SE",       [["BioNTech", "de"], ["BioNTech", "gb"], ["BioNTech SE", "de"], ["BioNTech", "us"]]],
    ["bbva",        "BBVA",              [["BBVA", "gb"], ["BBVA", "us"], ["Banco Bilbao", "gb"]]],
    ["oura",        "Oura Health",       [["Oura", "gb"], ["Oura Health", "us"], ["Oura", "us"], ["Oura Ring", "gb"]]],
    ["check point", "Check Point",       [["Check Point", "us"], ["Check Point Software", "us"], ["Check Point", "gb"]]],
    ["equinor",     "Equinor ASA",       [["Equinor", "gb"], ["Equinor", "nl"], ["Equinor", "de"]]],
    // CN: Meituan — skip, no Adzuna support for CN
  ];

  console.log("=== Non-India international companies ===");
  for (const [cn, label, tries] of nonUSCandidates) {
    process.stdout.write(`  ${cn.padEnd(20)} (${label}) `);
    const result = await tryCompany(cn, tries);
    if (result) {
      const rc = await updateRoles(cn, result.count, "adzuna_api");
      updated += rc;
      console.log(`→ ${result.count} jobs [${result.name}/${result.country}] (${rc} updated)`);
    } else {
      console.log(`→ no data (all attempts failed)`);
    }
  }

  // ── US companies that previously returned 400 ────────────────────────────
  // Try alternative name variations for each
  const usCandidates = [
    // [canonical, tries[]]
    ["airtable",               [["Airtable", "us"], ["Airtable Inc", "us"]]],
    ["align technology",       [["Align Technology", "us"], ["Align Technology Inc", "us"], ["Invisalign", "us"]]],
    ["alnylam pharmaceuticals",[["Alnylam", "us"], ["Alnylam Pharmaceuticals", "us"]]],
    ["better com",             [["Better.com", "us"], ["Better Mortgage", "us"], ["Better", "us"]]],
    ["bridgebio",              [["BridgeBio", "us"], ["BridgeBio Pharma", "us"]]],
    ["calm",                   [["Calm", "us"], ["Calm.com", "us"]]],
    ["cerebral",               [["Cerebral", "us"], ["Cerebral Inc", "us"]]],
    ["certara",                [["Certara", "us"], ["Certara Inc", "us"]]],
    ["cytiva",                 [["Cytiva", "us"], ["Cytiva Life Sciences", "us"], ["Cytiva", "gb"]]],
    ["forward health",         [["Forward Health", "us"], ["Forward", "us"]]],
    ["ginkgo bioworks",        [["Ginkgo Bioworks", "us"], ["Ginkgo", "us"]]],
    ["insulet",                [["Insulet", "us"], ["Insulet Corporation", "us"], ["OmniPod", "us"]]],
    ["masimo",                 [["Masimo", "us"], ["Masimo Corporation", "us"]]],
    ["noom",                   [["Noom", "us"], ["Noom Inc", "us"]]],
    ["penumbra",               [["Penumbra", "us"], ["Penumbra Inc", "us"]]],
    ["qlik",                   [["Qlik", "us"], ["Qlik Technologies", "us"], ["QlikTech", "us"]]],
    ["supabase",               [["Supabase", "us"], ["Supabase Inc", "us"]]],
    ["vanguard",               [["Vanguard", "us"], ["Vanguard Group", "us"], ["The Vanguard Group", "us"]]],
    ["vertex pharmaceuticals", [["Vertex Pharmaceuticals", "us"], ["Vertex", "us"]]],
  ];

  console.log("\n=== US companies (alternative name attempts) ===");
  for (const [cn, tries] of usCandidates) {
    process.stdout.write(`  ${cn.padEnd(30)} `);
    const result = await tryCompany(cn, tries);
    if (result) {
      const rc = await updateRoles(cn, result.count, "adzuna_api");
      updated += rc;
      console.log(`→ ${result.count} jobs [${result.name}] (${rc} updated)`);
    } else {
      console.log(`→ no data`);
    }
  }

  // Final summary
  const { rows: s } = await db.query(`
    SELECT
      count(*) AS total,
      count(total_open_roles) AS has_roles,
      count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null,
      count(CASE WHEN total_open_roles = 0 THEN 1 END) AS zeros
    FROM verified_company_intelligence
  `);
  const c = s[0];
  await db.end();

  console.log(`
=== FINAL STATE ===
Updated this run: ${updated}
Has open_roles: ${c.has_roles} / ${c.total}
Zeros (confirmed 0): ${c.zeros}
Still NULL: ${c.still_null}
`);
}

main().catch(e => { console.error(e); process.exit(1); });
