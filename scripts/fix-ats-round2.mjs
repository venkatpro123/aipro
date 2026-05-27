// fix-ats-round2.mjs
// Round 2: Ashby ATS, Lever (Nubank/BridgeBio/Better), iCIMS, SmartRecruiters
// Correct Workday tenants, company career pages for remaining 29 NULLs

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0", ...(opts.headers || {}) },
      signal: AbortSignal.timeout(12000),
      ...opts,
    });
    return { ok: res.ok, status: res.status, data: res.ok ? await res.json().catch(() => null) : null };
  } catch (e) { return { ok: false, status: "err", data: null }; }
}

async function post(url, body, opts = {}) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", ...(opts.headers || {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    return { ok: res.ok, status: res.status, data: res.ok ? await res.json().catch(() => null) : null };
  } catch (e) { return { ok: false, status: "err", data: null }; }
}

async function updateRoles(canonicalName, openRoles, source) {
  const velocityScore =
    openRoles > 1000 ? 1.5 : openRoles > 500 ? 1.0 : openRoles > 100 ? 0.5 : openRoles > 0 ? 0.1 : -0.5;
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence
     SET total_open_roles = $2, hiring_source = $3,
         hiring_verified_at = NOW(), hiring_confidence = 0.88,
         hiring_velocity_score = $4, updated_at = NOW()
     WHERE canonical_name = $1`,
    [canonicalName, openRoles, source, velocityScore]
  );
  return rowCount ?? 0;
}

async function isNull(cn) {
  const { rows } = await db.query(
    `SELECT total_open_roles FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]
  );
  return rows[0]?.total_open_roles === null || rows[0]?.total_open_roles === undefined;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. Ashby ATS (popular with tech startups) ─────────────────────────────
  // API: https://api.ashbyhq.com/posting-api/job-board/{orgId}
  // Returns { jobPostings: [...] }
  console.log("=== Ashby ATS ===");
  const ashbyTargets = [
    ["supabase",        ["supabase", "supabaseinc"]],
    ["airtable",        ["airtable"]],          // may already have Greenhouse data
    ["noom",            ["noom"]],
    ["oura",            ["ouraring", "oura"]],
    ["nubank",          ["nubank", "nu"]],
    ["certara",         ["certara"]],
    ["bridgebio",       ["bridgebio", "bridgebio-pharma"]],
  ];
  for (const [cn, tokens] of ashbyTargets) {
    if (!(await isNull(cn))) { console.log(`  ${cn.padEnd(25)} → already filled`); continue; }
    process.stdout.write(`  ${cn.padEnd(25)} `);
    let found = false;
    for (const token of tokens) {
      const { ok, data } = await get(`https://api.ashbyhq.com/posting-api/job-board/${token}`);
      await sleep(400);
      if (ok && data) {
        const count = Array.isArray(data.jobPostings) ? data.jobPostings.length
                    : Array.isArray(data.jobs) ? data.jobs.length : null;
        if (count !== null) {
          const rc = await updateRoles(cn, count, "ashby_api");
          updated += rc;
          console.log(`→ ${count} jobs [ashby:${token}] (${rc} updated)`);
          found = true;
          break;
        }
      }
    }
    if (!found) console.log(`→ no Ashby board`);
  }

  // ── 2. Greenhouse — more tokens ───────────────────────────────────────────
  console.log("\n=== Greenhouse ATS (round 2) ===");
  const greenhouse2 = [
    ["noom",            ["noom", "noomhealth"]],
    ["nubank",          ["nubank", "nu"]],
    ["oura",            ["ouraring", "oura", "ourahealth"]],
    ["check point",     ["checkpoint", "checkpointsoftware"]],
    ["bridgebio",       ["bridgebio", "bridgebiopharmainc", "bridgebiopharma"]],
    ["better com",      ["better", "betterdotcom", "bettercom"]],
    ["qlik",            ["qlik", "qliktech"]],
    ["equinor",         ["equinor", "equinorasaglobal"]],
    ["alnylam pharmaceuticals", ["alnylam", "alnylampharmaceuticals"]],
    ["bbva",            ["bbva", "bancobilbao"]],
    ["vanguard",        ["vanguard", "vanguardgroup"]],
  ];
  for (const [cn, tokens] of greenhouse2) {
    if (!(await isNull(cn))) { console.log(`  ${cn.padEnd(30)} → already filled`); continue; }
    process.stdout.write(`  ${cn.padEnd(30)} `);
    let found = false;
    for (const token of tokens) {
      const { ok, data } = await get(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
      await sleep(400);
      if (ok && data && Array.isArray(data.jobs)) {
        const count = data.jobs.length;
        const rc = await updateRoles(cn, count, "greenhouse_api");
        updated += rc;
        console.log(`→ ${count} jobs [greenhouse:${token}] (${rc} updated)`);
        found = true;
        break;
      }
    }
    if (!found) console.log(`→ no board`);
  }

  // ── 3. Lever ATS (round 2) ────────────────────────────────────────────────
  console.log("\n=== Lever ATS (round 2) ===");
  const lever2 = [
    ["nubank",          ["nubank", "nu-holdings", "nu"]],
    ["bridgebio",       ["bridgebio", "bridgebio-pharma", "bridgebio-pharma-inc"]],
    ["better com",      ["better", "better-com"]],
    ["oura",            ["oura", "ouraring"]],
    ["check point",     ["check-point-software-technologies", "checkpoint", "check-point"]],
    ["equinor",         ["equinor"]],
    ["bbva",            ["bbva"]],
    ["vanguard",        ["vanguard", "vanguard-group"]],
    ["qlik",            ["qlik"]],
    ["certara",         ["certara"]],
    ["supabase",        ["supabase"]],
    ["alnylam pharmaceuticals", ["alnylam", "alnylam-pharmaceuticals"]],
    ["align technology",        ["align-technology", "aligntech", "align"]],
    ["insulet",                 ["insulet", "insulet-corporation"]],
    ["masimo",                  ["masimo", "masimo-corporation"]],
    ["vertex pharmaceuticals",  ["vertex-pharmaceuticals", "vertex"]],
    ["penumbra",                ["penumbra", "penumbra-inc"]],
    ["noom",                    ["noom"]],
  ];
  for (const [cn, tokens] of lever2) {
    if (!(await isNull(cn))) { continue; }
    process.stdout.write(`  ${cn.padEnd(30)} `);
    let found = false;
    for (const token of tokens) {
      const { ok, data } = await get(`https://api.lever.co/v0/postings/${token}?mode=json`);
      await sleep(350);
      if (ok && Array.isArray(data)) {
        const rc = await updateRoles(cn, data.length, "lever_api");
        updated += rc;
        console.log(`→ ${data.length} jobs [lever:${token}] (${rc} updated)`);
        found = true;
        break;
      }
    }
    if (!found) console.log(`→ no board`);
  }

  // ── 4. SmartRecruiters ────────────────────────────────────────────────────
  // API: https://api.smartrecruiters.com/v1/companies/{company_id}/postings
  console.log("\n=== SmartRecruiters ===");
  const smartrTargets = [
    ["equinor",                 ["Equinor", "EquinorASA"]],
    ["check point",             ["CheckPointSoftware", "CheckPoint"]],
    ["bbva",                    ["BBVA", "BBVAGroup"]],
    ["vanguard",                ["VanguardGroup", "Vanguard"]],
    ["vertex pharmaceuticals",  ["VertexPharmaceuticals", "Vertex"]],
    ["align technology",        ["AlignTechnology"]],
    ["insulet",                 ["InsuletCorporation", "Insulet"]],
    ["masimo",                  ["Masimo"]],
    ["alnylam pharmaceuticals", ["Alnylam"]],
    ["nubank",                  ["Nubank"]],
    ["qlik",                    ["Qlik"]],
    ["certara",                 ["Certara"]],
  ];
  for (const [cn, ids] of smartrTargets) {
    if (!(await isNull(cn))) { continue; }
    process.stdout.write(`  ${cn.padEnd(30)} `);
    let found = false;
    for (const id of ids) {
      const { ok, data } = await get(
        `https://api.smartrecruiters.com/v1/companies/${id}/postings?status=PUBLISHED&limit=100`,
        { headers: { "Accept": "application/json" } }
      );
      await sleep(400);
      if (ok && data) {
        const count = data.totalFound ?? (Array.isArray(data.content) ? data.content.length : null);
        if (count !== null) {
          const rc = await updateRoles(cn, count, "smartrecruiters_api");
          updated += rc;
          console.log(`→ ${count} jobs [sr:${id}] (${rc} updated)`);
          found = true;
          break;
        }
      }
    }
    if (!found) console.log(`→ no board`);
  }

  // ── 5. Workday (correct tenant IDs) ──────────────────────────────────────
  // Try multiple wd numbers with correct site names
  console.log("\n=== Workday (corrected tenants) ===");
  // Format: [canonical, tenant, site, wd_number]
  const workdayCorrect = [
    ["vanguard",               "vanguard",      "VanguardInternational", "1"],
    ["vanguard",               "vanguard",      "VanguardCareers",       "1"],
    ["vanguard",               "vanguard",      "Vanguard_Careers",      "1"],
    ["vertex pharmaceuticals", "vrtx",          "vertex_careers",        "1"],
    ["vertex pharmaceuticals", "vrtx",          "vertex_careers",        "3"],
    ["align technology",       "aligntech",     "AlignTechnology",       "1"],
    ["align technology",       "aligntech",     "AlignTech",             "1"],
    ["alnylam pharmaceuticals","alnylam",       "Alnylam",               "1"],
    ["alnylam pharmaceuticals","alnylampharm",  "Alnylam",               "1"],
    ["insulet",                "insulet",       "Insulet",               "1"],
    ["insulet",                "insuletcorp",   "InsuletCorporation",    "1"],
    ["masimo",                 "masimo",        "Masimo",                "1"],
    ["masimo",                 "masimocorp",    "Masimo_Careers",        "1"],
    ["penumbra",               "penumbra",      "Penumbra",              "1"],
    ["certara",                "certara",       "Certara",               "1"],
    ["bridgebio",              "bridgebio",     "BridgeBio",             "1"],
  ];

  const seen = new Set();
  for (const [cn, tenant, site, wdNum] of workdayCorrect) {
    if (!(await isNull(cn))) { continue; }
    const key = `${cn}:${tenant}:${wdNum}`;
    if (seen.has(key)) continue;
    seen.add(key);

    process.stdout.write(`  ${cn.padEnd(30)} [${tenant}.wd${wdNum}/${site}] `);
    const { ok, status, data } = await post(
      `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
      { appliedFacets: {}, limit: 1, offset: 0, searchText: "" }
    );
    await sleep(600);
    if (ok && data && typeof data.total === "number") {
      const rc = await updateRoles(cn, data.total, "workday_careers");
      updated += rc;
      console.log(`→ ${data.total} jobs (${rc} updated)`);
    } else {
      console.log(`HTTP ${status}`);
    }
  }

  // ── 6. iCIMS (medical device / pharma companies) ─────────────────────────
  // API: https://careers-{company}.icims.com/jobs/search?ss=1&in_iframe=1
  console.log("\n=== iCIMS ATS ===");
  const icimsTargets = [
    ["insulet",       ["insulet", "insuletcorporation"]],
    ["masimo",        ["masimo"]],
    ["penumbra",      ["penumbra"]],
    ["align technology", ["aligntech", "align-technology"]],
  ];
  for (const [cn, slugs] of icimsTargets) {
    if (!(await isNull(cn))) { continue; }
    process.stdout.write(`  ${cn.padEnd(25)} `);
    let found = false;
    for (const slug of slugs) {
      // iCIMS API for job count
      const { ok, status, data } = await get(
        `https://careers-${slug}.icims.com/jobs/search?ss=1&searchCategory=&searchLocation=&in_iframe=1`,
        { headers: { "Accept": "application/json, text/html" } }
      );
      await sleep(500);
      if (ok && data) {
        const count = data.totalCount ?? data.total ?? null;
        if (count !== null) {
          const rc = await updateRoles(cn, count, "icims_api");
          updated += rc;
          console.log(`→ ${count} jobs [icims:${slug}] (${rc} updated)`);
          found = true;
          break;
        }
      }
    }
    if (!found) console.log(`→ no iCIMS board`);
  }

  // ── 7. Jobvite ────────────────────────────────────────────────────────────
  console.log("\n=== Jobvite ATS ===");
  const jobviteTargets = [
    ["masimo",        ["masimo"]],
    ["penumbra",      ["penumbra"]],
    ["vanguard",      ["vanguard"]],
    ["qlik",          ["qlik"]],
    ["certara",       ["certara"]],
  ];
  for (const [cn, slugs] of jobviteTargets) {
    if (!(await isNull(cn))) { continue; }
    process.stdout.write(`  ${cn.padEnd(25)} `);
    let found = false;
    for (const slug of slugs) {
      const { ok, data } = await get(
        `https://jobs.jobvite.com/api/job?c=${slug}`,
        { headers: { "Accept": "application/json" } }
      );
      await sleep(400);
      if (ok && data) {
        const count = data.count ?? (Array.isArray(data.requisitions) ? data.requisitions.length : null);
        if (count !== null) {
          const rc = await updateRoles(cn, count, "jobvite_api");
          updated += rc;
          console.log(`→ ${count} jobs [jobvite:${slug}] (${rc} updated)`);
          found = true;
          break;
        }
      }
    }
    if (!found) console.log(`→ no board`);
  }

  // Final state
  const { rows: s } = await db.query(`
    SELECT count(*) AS total, count(total_open_roles) AS has_roles,
      count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null
    FROM verified_company_intelligence
  `);
  const { rows: nulls } = await db.query(`
    SELECT canonical_name, country_code, display_name
    FROM verified_company_intelligence
    WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name
  `);
  await db.end();

  console.log(`\n=== STATE AFTER ROUND 2 ===`);
  console.log(`Updated this run: ${updated}`);
  console.log(`Has open_roles: ${s[0].has_roles} / ${s[0].total}`);
  console.log(`Still NULL: ${s[0].still_null}\n`);
  for (const r of nulls) {
    console.log(`  [${r.country_code}] ${r.canonical_name} — ${r.display_name}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
