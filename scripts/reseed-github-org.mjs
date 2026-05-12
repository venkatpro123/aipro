// Re-seed company_intelligence.github_org using ILIKE patterns that match the
// actual remote company_name strings (e.g. "Alphabet (Google)", "Microsoft",
// "TCS (Tata Consultancy Services)") rather than internal canonical keys.

import pg from "pg";

const SEED = [
  // [github_org, ...ILIKE pattern alternatives matching display names]
  ["google",         ["%google%", "%alphabet%"]],
  ["microsoft",      ["%microsoft%"]],
  ["aws",            ["%amazon%"]],
  ["facebook",       ["%meta%", "%facebook%"]],
  ["apple",          ["%apple inc%", "Apple"]],
  ["Netflix",        ["%netflix%"]],
  ["NVIDIA",         ["%nvidia%"]],
  ["openai",         ["%openai%"]],
  ["anthropics",     ["%anthropic%"]],
  ["salesforce",     ["%salesforce%"]],
  ["oracle",         ["%oracle%"]],
  ["IBM",            ["%ibm%"]],
  ["intel",          ["%intel%"]],
  ["cisco",          ["%cisco%"]],
  ["adobe",          ["%adobe%"]],
  ["snowflakedb",    ["%snowflake%"]],
  ["databricks",     ["%databricks%"]],
  ["stripe",         ["%stripe%"]],
  ["Shopify",        ["%shopify%"]],
  ["uber",           ["%uber%"]],
  ["airbnb",         ["%airbnb%"]],
  ["atlassian",      ["%atlassian%"]],
  ["twilio",         ["%twilio%"]],
  ["dropbox",        ["%dropbox%"]],
  ["cloudflare",     ["%cloudflare%"]],
  ["DataDog",        ["%datadog%"]],
  ["palantir",       ["%palantir%"]],
  ["spotify",        ["%spotify%"]],
  ["figma",          ["%figma%"]],
  ["vercel",         ["%vercel%"]],
  ["github",         ["%github%"]],
  ["tcs-cto-office", ["%tcs%", "%tata consultancy%"]],
  ["Infosys",        ["%infosys%"]],
  ["wipro-opensource", ["%wipro%"]],
  ["hcl-tech",       ["%hcl%"]],
  ["cognizant",      ["%cognizant%"]],
  ["Accenture",      ["%accenture%"]],
  ["Capgemini",      ["%capgemini%"]],
  ["SAP",            ["%sap%"]],
  ["teslamotors",    ["%tesla%"]],
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

let totalSeeded = 0;
for (const [org, patterns] of SEED) {
  // OR-clause across patterns
  const orClauses = patterns.map((_, i) => `company_name ILIKE $${i + 2}`).join(" OR ");
  const sql = `
    UPDATE public.company_intelligence
    SET github_org = $1
    WHERE github_org IS NULL
      AND (${orClauses})
  `;
  const res = await client.query(sql, [org, ...patterns]);
  if (res.rowCount && res.rowCount > 0) {
    console.log(`  ${org.padEnd(22)} → ${res.rowCount} rows`);
    totalSeeded += res.rowCount;
  } else {
    console.log(`  ${org.padEnd(22)} → 0 rows (no match)`);
  }
}

// Final count
const { rows } = await client.query(`SELECT COUNT(*) AS n FROM public.company_intelligence WHERE github_org IS NOT NULL`);
console.log(`\nTotal rows with github_org populated: ${rows[0].n}  (this run added ${totalSeeded})`);

await client.end();
