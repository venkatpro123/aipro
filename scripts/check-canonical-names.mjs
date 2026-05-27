// check-canonical-names.mjs — Show canonical names of specific companies
import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const { rows } = await db.query(`
  SELECT canonical_name, display_name, country_code, total_open_roles
  FROM verified_company_intelligence
  ORDER BY canonical_name
`);

// Show companies that had issues in the script
const interesting = [
  "toronto", "td bank", "rbc", "bmo", "asml", "wuxi", "check point",
  "ubsgroup", "ubs", "equinor", "nubank", "nu holdings", "nuholdings",
  "bp", "axa", "bba", "santander", "american express", "amex",
  "airtable", "align", "alnylam", "cencora",
  "biogen", "bridgebio", "calm", "cerebral", "certara",
  "confluent", "cytiva", "fisker", "forward", "ginkgo",
  "hca", "huntington", "insulet", "invision", "invitae",
  "karuna", "masimo", "noom", "penumbra", "qlik", "shockwave",
  "vanguard", "varian", "vertex", "zimmer", "rolls-royce",
  "klarna", "shopify", "klarna",
];

console.log("Canonical names in DB:\n");
for (const row of rows) {
  const cn = row.canonical_name;
  const match = interesting.some(kw => cn.includes(kw));
  if (match || row.total_open_roles === null) {
    const status = row.total_open_roles !== null ? `roles=${row.total_open_roles}` : "NULL";
    console.log(`  "${cn}"  [${row.country_code}] (${row.display_name.substring(0,30)}) → ${status}`);
  }
}

await db.end();
