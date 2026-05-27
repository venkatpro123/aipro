// test-adzuna-batch3.mjs — Test edge cases

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
    if (!res.ok) return `HTTP ${res.status}`;
    const data = await res.json();
    return data.count ?? "no count";
  } catch (e) { return `err: ${e.message}`; }
}

const tests = [
  // Check Point variations
  { name: "Check Point", country: "us" },
  { name: "Check Point Software", country: "us" },
  { name: "CheckPoint", country: "us" },
  { name: "Check Point", country: "gb" },
  // ASML variations
  { name: "ASML", country: "us" },
  { name: "ASML", country: "nl" },
  { name: "ASML Holding", country: "us" },
  // Equinor
  { name: "Equinor", country: "us" },
  { name: "Equinor", country: "nl" },
  // BioNTech
  { name: "BioNTech", country: "gb" },
  { name: "BioNTech", country: "us" },
  // Emirates NBD
  { name: "Emirates NBD", country: "gb" },
  { name: "Emirates NBD", country: "za" },  // South Africa endpoint
  // More CA tests
  { name: "BMO", country: "ca" },
  { name: "TD", country: "ca" },
  { name: "Toronto-Dominion", country: "ca" },
  // Japan
  { name: "Fast Retailing", country: "us" },
  { name: "Uniqlo", country: "us" },
  { name: "Uniqlo", country: "gb" },
  // CN
  { name: "Meituan", country: "us" },
  { name: "WuXi AppTec", country: "us" },
  { name: "WuXi", country: "us" },
  // SG banks
  { name: "DBS", country: "sg" },
  { name: "DBS Bank", country: "gb" },
  { name: "United Overseas Bank", country: "gb" },
  { name: "UOB", country: "gb" },
  // My (Maybank)
  { name: "Maybank", country: "gb" },
  { name: "Maybank", country: "us" },
  // EU companies
  { name: "DSV", country: "de" },     // DK
  { name: "DSV", country: "gb" },
  { name: "UBS", country: "gb" },
  { name: "UBS", country: "de" },
  { name: "Zurich Insurance", country: "de" },
  { name: "Zurich", country: "gb" },
  { name: "Merck", country: "de" },
  { name: "Merck KGaA", country: "de" },
  { name: "Klarna", country: "us" },
  { name: "Klarna", country: "gb" },
  // Adyen
  { name: "Adyen", country: "gb" },   // got 5 before - confirm
  { name: "Adyen", country: "us" },
];

for (const t of tests) {
  const result = await fetchAdzuna(t.name, t.country);
  console.log(`  ${t.name.padEnd(30)} [${t.country}]: ${result}`);
  await sleep(400);
}
