// update-vci-open-roles.mjs
// Fetches total_open_roles for all public companies in VCI
// Uses proxy-live-signals EF which has Adzuna API access from the Supabase edge.
// Processes one company at a time. Real job posting counts only.

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const SUPABASE_URL = "https://ysenimczeasmaeojzlkt.supabase.co";
const SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZW5pbWN6ZWFzbWFlb2p6bGt0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTAzNTI3NywiZXhwIjoyMDkwNjExMjc3fQ.4CVDY2tZZjhRqeQt_OGOH2QxPcMx3gZjobwtKEPnAc4";

// Maps country_code to hiring market for proxy-live-signals
const COUNTRY_TO_MARKET = {
  US: "us", GB: "uk", DE: "germany", SG: "singapore",
  AU: "australia", CA: "canada", BR: "latam", AE: "mena",
  IN: "india", MX: "latam", FR: "germany", NL: "germany",
  SE: "germany", DK: "germany", CH: "germany", JP: "us",
  HK: "us", CN: "us", KR: "us", MY: "singapore", TW: "us",
  NO: "germany", IL: "mena", ZA: "us", SA: "mena",
};

// Use a broad role title that covers any job posting
const BROAD_ROLES = ["", "engineer", "manager", "analyst"];

async function fetchOpenRoles(companyName, countryCode) {
  const market = COUNTRY_TO_MARKET[countryCode] ?? "us";

  // Try with multiple role titles and take the max
  let maxCount = null;

  for (const role of BROAD_ROLES) {
    try {
      const body = { action: "hiring", company: companyName, roleTitle: role, market };
      const res = await fetch(`${SUPABASE_URL}/functions/v1/proxy-live-signals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const estimated = data?.hiringData?.estimatedOpenings;
      if (typeof estimated === "number" && estimated > 0) {
        maxCount = Math.max(maxCount ?? 0, estimated);
        break; // Got a real count, no need to try other roles
      }
    } catch { /* continue */ }
    await new Promise(r => setTimeout(r, 200));
  }

  return maxCount;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");

  const { rows: companies } = await db.query(`
    SELECT canonical_name, display_name, country_code, is_public
    FROM verified_company_intelligence
    WHERE is_public = true
    ORDER BY canonical_name
  `);

  console.log(`Fetching total_open_roles for ${companies.length} public companies...\n`);
  console.log(`Note: Uses proxy-live-signals → Adzuna API (no India market, uses US for Asia)\n`);

  let updated = 0, withData = 0, noData = 0;

  for (let i = 0; i < companies.length; i++) {
    const co = companies[i];
    const displayName = co.display_name.replace(/\s*\([^)]*\)\s*$/, "").trim();
    process.stdout.write(`  [${String(i + 1).padStart(3)}/${companies.length}] ${displayName.padEnd(32)} `);

    const openRoles = await fetchOpenRoles(displayName, co.country_code);

    if (openRoles === null) {
      noData++;
      console.log(`— no data`);
    } else {
      withData++;
      const { rowCount } = await db.query(
        `UPDATE verified_company_intelligence
         SET total_open_roles = $2,
             hiring_source = 'adzuna_api',
             hiring_verified_at = NOW(),
             hiring_confidence = 0.80,
             hiring_velocity_score = CASE WHEN $2 > 1000 THEN 1.5 WHEN $2 > 500 THEN 1.0 WHEN $2 > 100 THEN 0.5 WHEN $2 > 0 THEN 0.1 ELSE -0.5 END,
             updated_at = NOW()
         WHERE canonical_name = $1`,
        [co.canonical_name, openRoles]
      );
      if (rowCount > 0) {
        updated++;
        console.log(`✓  open_roles=${openRoles}`);
      } else {
        console.log(`⚠  no row matched`);
      }
    }

    // 1.2s delay to be polite to Supabase EF + Adzuna
    await new Promise(r => setTimeout(r, 1200));
  }

  // Final summary
  const { rows: s } = await db.query(`
    SELECT
      count(*) AS total,
      count(total_open_roles) AS has_roles,
      sum(CASE WHEN total_open_roles > 0 THEN 1 ELSE 0 END) AS nonzero_roles,
      avg(total_open_roles) AS avg_roles
    FROM verified_company_intelligence
    WHERE is_public = true
  `);
  const c = s[0];
  await db.end();

  console.log(`
=== TOTAL OPEN ROLES UPDATE ===
Updated:      ${updated}
With data:    ${withData}
No data:      ${noData}

Public companies with total_open_roles: ${c.has_roles}
With non-zero count:                    ${c.nonzero_roles}
`);
}

main().catch(e => { console.error(e); process.exit(1); });
