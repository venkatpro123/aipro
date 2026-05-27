// test-adzuna-creative.mjs — Try keyword search (what=) for companies blocked on company filter

const ADZUNA_APP_ID  = "a3715ff2";
const ADZUNA_APP_KEY = "18d8b4a8e1a20d0428d42920abfafe91";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Try keyword-based search (what param only, no company filter)
async function fetchAdzunaKeyword(keyword, adzunaCountry) {
  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: "1",
      what: keyword,
      // No company filter - keyword search
    });
    const url = `https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/1?${params}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return `HTTP ${res.status}`;
    const data = await res.json();
    return data.count ?? "no count";
  } catch (e) { return `err`; }
}

// Try company filter with different approach
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
  } catch (e) { return `err`; }
}

// Test indirect approach: keyword-based company name search
// These are clearly-branded companies where "Equinor engineer" as keyword would work
const tests = [
  // Companies that failed company filter - try keyword search
  { name: "Equinor", country: "gb", mode: "keyword" },
  { name: "Equinor", country: "nl", mode: "keyword" },
  { name: "Equinor", country: "nl", mode: "company" },
  { name: "BioNTech", country: "us", mode: "keyword" },
  { name: "Check Point Software", country: "us", mode: "keyword" },
  { name: "Align Technology", country: "us", mode: "keyword" },
  { name: "Alnylam", country: "us", mode: "keyword" },
  { name: "Airtable", country: "us", mode: "keyword" },
  { name: "Vertex Pharmaceuticals", country: "us", mode: "keyword" },
  { name: "Nubank", country: "us", mode: "keyword" },
  { name: "BBVA", country: "us", mode: "keyword" },
  { name: "Oura", country: "us", mode: "keyword" },
  { name: "Certara", country: "us", mode: "keyword" },
  { name: "Insulet", country: "us", mode: "keyword" },
  { name: "Masimo", country: "us", mode: "keyword" },
  { name: "Penumbra", country: "us", mode: "keyword" },
  { name: "Supabase", country: "us", mode: "keyword" },
  { name: "Supabase", country: "gb", mode: "keyword" },
  { name: "Vanguard", country: "us", mode: "keyword" },
  { name: "Ginkgo Bioworks", country: "us", mode: "keyword" },
  // Bankrupt/shut down companies - verify truly 0
  { name: "Fisker", country: "us", mode: "keyword" },
  { name: "InVision", country: "us", mode: "keyword" },
  { name: "Invitae", country: "us", mode: "keyword" },
];

for (const t of tests) {
  let result;
  if (t.mode === "keyword") {
    result = await fetchAdzunaKeyword(t.name, t.country);
  } else {
    result = await fetchAdzuna(t.name, t.country);
  }
  console.log(`  [${t.mode.padEnd(7)}] "${t.name.padEnd(28)}" [${t.country}]: ${result}`);
  await sleep(500);
}

// Also test Indeed India via direct HTTP for Indian companies
console.log("\n=== Test Indeed India from local machine ===");
const indiaCompanies = [
  "Steel Authority of India",
  "Union Bank of India",
  "Phoenix Mills",
  "Vijaya Diagnostic",
  "Usha Martin",
  "Power Finance Corporation",
  "Gujarat State Petronet",
  "Bayer CropScience India",
  "Kolte Patil Developers",
  "WNS Global",
];
for (const name of indiaCompanies) {
  try {
    const q = encodeURIComponent(name);
    const url = `https://in.indeed.com/jobs?q=${q}&l=India&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-IN,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.log(`  "${name}" → HTTP ${res.status}`); await sleep(300); continue; }
    const html = await res.text();
    // Try to extract job count
    const m = html.match(/<title>[\s\S]*?(\d[\d,]+)\s+[\w\s]+jobs?\s+in/i)
           ?? html.match(/"totalResults"\s*:\s*(\d+)/)
           ?? html.match(/(\d[\d,]+)\s+(?:\w[\w\s]*?\s+)?jobs?\s+in\s+India/i);
    if (m) {
      const count = parseInt(m[1].replace(/,/g, ''), 10);
      console.log(`  "${name}" → Indeed India: ${count} jobs`);
    } else {
      // Check if page loaded correctly
      const hasContent = html.includes("jobsearch") || html.includes("indeed.com");
      console.log(`  "${name}" → Indeed India: no count (page loaded: ${hasContent})`);
    }
  } catch (e) {
    console.log(`  "${name}" → error: ${e.message}`);
  }
  await sleep(500);
}
