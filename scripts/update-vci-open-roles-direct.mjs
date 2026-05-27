// update-vci-open-roles-direct.mjs
// Fetches total_open_roles for all VCI companies with NULL total_open_roles.
// Uses Adzuna API directly (works from any IP unlike job board scrapers).
// Adzuna supported countries: au, at, br, ca, de, fr, gb, in, nl, nz, pl, ru, sg, us, za
// India excluded (Adzuna /in/ returns HTTP 400).

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ADZUNA_APP_ID  = "a3715ff2";
const ADZUNA_APP_KEY = "18d8b4a8e1a20d0428d42920abfafe91";

// Country → primary Adzuna country code (null = skip Adzuna for this country)
const COUNTRY_TO_ADZUNA = {
  US: "us",
  GB: "gb",
  IE: "gb",
  DE: "de",
  NL: "nl",   // Netherlands has its own nl endpoint (not de!)
  FR: "fr",   // France has its own fr endpoint
  BE: "nl",
  CH: "gb",   // Switzerland → use GB as proxy
  AT: "de",   // Austria → de proxy
  DK: "gb",   // Denmark → gb proxy (de returns 0 for DSV)
  NO: "gb",   // Norway → gb proxy
  SE: "gb",   // Sweden → gb proxy
  FI: "gb",   // Finland → gb proxy
  ES: "gb",   // Spain → gb proxy (fr returns 400)
  PL: "pl",   // Poland has its own pl endpoint
  SG: "sg",
  MY: "sg",   // Malaysia → sg proxy
  AU: "au",
  NZ: "nz",
  CA: "ca",
  BR: "br",
  MX: "us",   // Mexico → us proxy
  AE: "gb",   // UAE → gb proxy (no ae endpoint in Adzuna)
  IL: "gb",   // Israel → gb proxy
  SA: "gb",   // Saudi Arabia → gb proxy
  ZA: "za",
  JP: "gb",   // Japan → gb proxy (Japanese companies often list UK roles)
  HK: "gb",   // Hong Kong → gb proxy
  CN: "us",   // China → us proxy (some CN companies list on US boards)
  KR: "us",   // Korea → us proxy
  TW: "us",   // Taiwan → us proxy
  IN: null,   // India: Adzuna /in/ returns HTTP 400 — skip
};

// Company-specific name overrides (canonical_name → Adzuna search name)
// Used when full display name doesn't match Adzuna's employer database
const NAME_OVERRIDES = {
  "toronto-dominion bank":            "TD",           // "TD" returns 488; "Toronto-Dominion" returns 400
  "royal bank of canada":             "RBC",          // RBC returns 1006; full name returns 0
  "bmo financial group":              "BMO Financial Group",
  "fast retailing":                   "Uniqlo",       // Fast Retailing trades as Uniqlo outside Japan
  "malayan banking berhad":           "Maybank",
  "dbs group holdings":               "DBS",          // Strip " Group Holdings"
  "united overseas bank":             "UOB",
  "associated british foods":         "AB Foods",
  "jpmorgan chase":                   "JPMorgan Chase",
  "nuvasive":                         "Globus Medical", // merged 2024
  "asml holding":                     "ASML",
  "merck kgaa":                       "Merck KGaA",
  "wuxiapptec":                       "WuXi AppTec",
  "check point software technologies": null, // consistently 400 in all markets — skip
  "equinor":                          null,  // consistently 400 — skip
  "biontech":                         null,  // consistently 400 — skip
  "emirates nbd bank":                null,  // no AE endpoint in Adzuna — skip
  "meituan":                          null,  // CN company, 400 on US — skip
};

// Market overrides for specific companies (canonical_name → adzunaCountry override)
const MARKET_OVERRIDES = {
  "asml holding":   "nl",   // ASML on nl: 317 jobs
  "adyen":          "us",   // Adyen on us: 84 (better than de: 400 or gb: 5)
  "fast retailing": "gb",   // Uniqlo on gb: 39
  "wuxiapptec":     "us",   // WuXi AppTec on us: 32
  "merck kgaa":     "de",   // Merck KGaA on de: 32
  "ubs group":      "gb",   // UBS on gb: 2
  "shopify":        "us",   // Shopify on us better than ca: 0
  "klarna bank":    "gb",   // Klarna on gb (though 0)
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Call Adzuna API, return job count or null on failure
async function fetchAdzuna(companyName, adzunaCountry) {
  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: "1",
      company: companyName,
    });
    const url = `https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/1?${params}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "HumanProof/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      if (res.status === 429) {
        process.stdout.write(`[rate-limited, waiting 10s] `);
        await sleep(10000);
      }
      return null; // 400, 404, 429 all → null
    }
    const data = await res.json();
    return typeof data.count === "number" ? data.count : null;
  } catch {
    return null;
  }
}

// Clean display name for Adzuna matching: strip legal suffixes
function cleanDisplayName(displayName) {
  return displayName
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+(Inc\.|Ltd\.|PLC|N\.V\.|S\.A\.|AG|SE|Holdings|Corporation|Corp\.|Incorporated|Limited|plc|B\.V\.|GmbH|KGaA|ASA|AB|GmbH|KGaA|S\.p\.A\.|LLC|Co\.)\.?\s*$/, "")
    .replace(/\s+(Holdings Ltd\.|Holdings Inc\.|Holdings PLC|Holdings AG|Holdings N\.V\.|Holdings Corp\.)\.?\s*$/, "")
    .replace(/\s+(Group Holdings|Group Inc\.|Group PLC|Group Ltd\.|Group LLC)\.?\s*$/, "")
    .trim();
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");

  const { rows: companies } = await db.query(`
    SELECT canonical_name, display_name, country_code, is_public
    FROM verified_company_intelligence
    WHERE total_open_roles IS NULL
    ORDER BY country_code, canonical_name
  `);

  console.log(`Processing ${companies.length} companies with NULL total_open_roles...\n`);
  console.log(`Adzuna app_id: ${ADZUNA_APP_ID}\n`);

  let updated = 0, skippedNoMarket = 0, noData = 0;

  for (let i = 0; i < companies.length; i++) {
    const co = companies[i];
    const cn = co.canonical_name;

    process.stdout.write(`  [${String(i + 1).padStart(3)}/${companies.length}] ${co.display_name.substring(0,38).padEnd(38)} `);

    // Check if this company should be skipped entirely
    if (NAME_OVERRIDES[cn] === null) {
      console.log(`— skip (no Adzuna coverage)`);
      skippedNoMarket++;
      continue;
    }

    // Determine Adzuna market
    const marketOverride = MARKET_OVERRIDES[cn];
    const countryMarket = COUNTRY_TO_ADZUNA[co.country_code];
    const adzunaCountry = marketOverride ?? countryMarket ?? null;

    if (!adzunaCountry) {
      // India or unmapped country
      if (co.country_code === "IN") {
        console.log(`— skip (India, Adzuna not supported)`);
      } else {
        console.log(`— skip (no market for ${co.country_code})`);
      }
      skippedNoMarket++;
      continue;
    }

    // Determine search name
    const overrideName = NAME_OVERRIDES[cn];
    const searchName = overrideName !== undefined && overrideName !== null
      ? overrideName
      : cleanDisplayName(co.display_name);

    let openRoles = await fetchAdzuna(searchName, adzunaCountry);

    // If null (API error/no data), try with first-word-only as fallback
    if (openRoles === null) {
      const firstWord = searchName.split(/\s+/)[0];
      if (firstWord && firstWord.length > 3 && firstWord !== searchName) {
        await sleep(300);
        openRoles = await fetchAdzuna(firstWord, adzunaCountry);
        if (openRoles !== null) process.stdout.write(`[${firstWord}] `);
      }
    }

    if (openRoles === null) {
      noData++;
      console.log(`— no data [${adzunaCountry}]`);
    } else {
      // openRoles could be 0 (valid: company not on Adzuna in this market) or positive
      const velocityScore =
        openRoles > 1000 ? 1.5 :
        openRoles > 500  ? 1.0 :
        openRoles > 100  ? 0.5 :
        openRoles > 0    ? 0.1 : -0.5;

      const { rowCount } = await db.query(
        `UPDATE verified_company_intelligence
         SET total_open_roles      = $2,
             hiring_source         = 'adzuna_api',
             hiring_verified_at    = NOW(),
             hiring_confidence     = 0.82,
             hiring_velocity_score = $3,
             updated_at            = NOW()
         WHERE canonical_name = $1`,
        [cn, openRoles, velocityScore]
      );
      if ((rowCount ?? 0) > 0) {
        updated++;
        console.log(`✓  ${openRoles} jobs [${adzunaCountry}]`);
      } else {
        console.log(`⚠  no row matched`);
      }
    }

    await sleep(600);
  }

  // Final summary
  const { rows: s } = await db.query(`
    SELECT
      count(*) AS total,
      count(total_open_roles) AS has_roles,
      sum(CASE WHEN total_open_roles > 0 THEN 1 ELSE 0 END) AS nonzero_roles,
      count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null,
      max(total_open_roles) AS max_roles
    FROM verified_company_intelligence
  `);
  const c = s[0];
  await db.end();

  console.log(`
=== UPDATE COMPLETE ===
Updated rows:       ${updated}
Skipped (no market):${skippedNoMarket}
No API data:        ${noData}

DB state:
  Total:          ${c.total}
  Has open_roles: ${c.has_roles} / ${c.total}
  Non-zero:       ${c.nonzero_roles}
  Still NULL:     ${c.still_null}
  Max roles:      ${c.max_roles}
`);
}

main().catch(e => { console.error(e); process.exit(1); });
