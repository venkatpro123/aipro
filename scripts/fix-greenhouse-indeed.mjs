// fix-greenhouse-indeed.mjs
// Try Greenhouse public API (no auth) for startups + Indeed US for larger companies

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Greenhouse public boards API — no auth required
// https://boards-api.greenhouse.io/v1/boards/{token}/jobs
async function fetchGreenhouse(token) {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { count: null, status: res.status };
    const data = await res.json();
    const count = Array.isArray(data.jobs) ? data.jobs.length : null;
    return { count, status: 200 };
  } catch (e) { return { count: null, status: "err" }; }
}

// Lever public jobs API — no auth required
// https://api.lever.co/v0/postings/{company_token}?mode=json
async function fetchLever(token) {
  try {
    const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { count: null, status: res.status };
    const data = await res.json();
    const count = Array.isArray(data) ? data.length : null;
    return { count, status: 200 };
  } catch (e) { return { count: null, status: "err" }; }
}

async function updateRoles(db, canonicalName, openRoles, source) {
  const velocityScore =
    openRoles > 1000 ? 1.5 : openRoles > 500 ? 1.0 : openRoles > 100 ? 0.5 : openRoles > 0 ? 0.1 : -0.5;
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence
     SET total_open_roles = $2, hiring_source = $3,
         hiring_verified_at = NOW(), hiring_confidence = 0.85,
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

  // ── Greenhouse tokens for tech startups ──────────────────────────────────
  // Try both the canonical token and common variations
  const greenhouseTargets = [
    // [canonical_name, display, tokens_to_try[]]
    ["airtable",         "Airtable",           ["airtable", "airtableinc"]],
    ["calm",             "Calm",               ["calm", "calmdotcom"]],
    ["cerebral",         "Cerebral",           ["cerebral", "cerebralinc"]],
    ["forward health",   "Forward Health",     ["forward", "forwardhealth", "forwardhealthgroup"]],
    ["ginkgo bioworks",  "Ginkgo Bioworks",    ["ginkgobioworks", "ginkgo"]],
    ["noom",             "Noom",               ["noom"]],
    ["supabase",         "Supabase",           ["supabase"]],
    ["vanguard",         "Vanguard",           ["vanguard"]],
  ];

  console.log("=== Greenhouse ATS ===");
  for (const [cn, display, tokens] of greenhouseTargets) {
    process.stdout.write(`  ${cn.padEnd(25)} `);
    let found = false;
    for (const token of tokens) {
      const { count, status } = await fetchGreenhouse(token);
      await sleep(400);
      if (count !== null) {
        const rc = await updateRoles(db, cn, count, "greenhouse_api");
        updated += rc;
        console.log(`→ ${count} jobs [greenhouse:${token}] (${rc} updated)`);
        found = true;
        break;
      }
      // 404 = token doesn't exist, try next
    }
    if (!found) console.log(`→ no Greenhouse board found`);
  }

  // ── Lever ATS ─────────────────────────────────────────────────────────────
  const leverTargets = [
    ["airtable",         ["airtable"]],
    ["certara",          ["certara"]],
    ["ginkgo bioworks",  ["ginkgo-bioworks", "ginkgobioworks"]],
    ["supabase",         ["supabase"]],
    ["qlik",             ["qlik"]],
  ];

  console.log("\n=== Lever ATS ===");
  for (const [cn, tokens] of leverTargets) {
    // skip if already updated
    const { rows: check } = await db.query(
      `SELECT total_open_roles FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]
    );
    if (check[0]?.total_open_roles !== null) {
      console.log(`  ${cn.padEnd(25)} → already has data, skipping`);
      continue;
    }

    process.stdout.write(`  ${cn.padEnd(25)} `);
    let found = false;
    for (const token of tokens) {
      const { count, status } = await fetchLever(token);
      await sleep(400);
      if (count !== null) {
        const rc = await updateRoles(db, cn, count, "lever_api");
        updated += rc;
        console.log(`→ ${count} jobs [lever:${token}] (${rc} updated)`);
        found = true;
        break;
      }
    }
    if (!found) console.log(`→ no Lever board found`);
  }

  // ── Workday scrape for large companies ────────────────────────────────────
  // Vanguard, Vertex, Insulet, Masimo, Align Technology, Alnylam use Workday
  // Format: https://{company}.wd5.myworkdayjobs.com/en-US/{company_career_site}/jobs
  // Workday returns JSON from API: /wday/cxs/{tenant}/{site}/jobs
  const workdayTargets = [
    // [canonical_name, workday_tenant, career_site]
    ["vanguard",              "vanguard",        "Vanguard_Careers"],
    ["vertex pharmaceuticals","vrtx",            "vertex_careers"],
    ["align technology",      "aligntech",       "AlignTechnology"],
    ["alnylam pharmaceuticals","alnylam",         "Alnylam"],
    ["insulet",               "insulet",         "Insulet_Careers"],
    ["masimo",                "masimo",          "Masimo_Careers"],
    ["penumbra",              "penumbra",        "Penumbra"],
    ["certara",               "certara",         "Certara"],
  ];

  console.log("\n=== Workday career pages ===");
  for (const [cn, tenant, site] of workdayTargets) {
    // skip if already updated
    const { rows: check } = await db.query(
      `SELECT total_open_roles FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]
    );
    if (check[0]?.total_open_roles !== null) {
      console.log(`  ${cn.padEnd(30)} → already has data, skipping`);
      continue;
    }

    process.stdout.write(`  ${cn.padEnd(30)} `);
    try {
      // Workday public API endpoint (no auth)
      const url = `https://${tenant}.wd5.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 1, offset: 0, searchText: "", appliedFacets: {} }),
        signal: AbortSignal.timeout(12000),
      });
      await sleep(600);
      if (!res.ok) {
        console.log(`→ HTTP ${res.status} (${tenant}.wd5)`);
        continue;
      }
      const data = await res.json();
      const count = data.total ?? null;
      if (count !== null) {
        const rc = await updateRoles(db, cn, count, "workday_careers");
        updated += rc;
        console.log(`→ ${count} jobs [workday:${tenant}] (${rc} updated)`);
      } else {
        console.log(`→ no count in response`);
      }
    } catch (e) {
      console.log(`→ error: ${e.message?.slice(0,50)}`);
    }
  }

  // Final summary
  const { rows: s } = await db.query(`
    SELECT count(*) AS total, count(total_open_roles) AS has_roles,
      count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null
    FROM verified_company_intelligence
  `);
  const c = s[0];

  const { rows: nulls } = await db.query(`
    SELECT canonical_name, country_code FROM verified_company_intelligence
    WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name
  `);
  await db.end();

  console.log(`
=== FINAL STATE ===
Updated this run: ${updated}
Has open_roles: ${c.has_roles} / ${c.total}
Still NULL: ${c.still_null}

Remaining NULLs:`);
  for (const r of nulls) {
    console.log(`  [${r.country_code}] ${r.canonical_name}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
