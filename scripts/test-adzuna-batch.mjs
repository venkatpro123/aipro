// test-adzuna-batch.mjs — Quick test of Adzuna for a sample of companies

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
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return `HTTP ${res.status}`;
    const data = await res.json();
    return data.count ?? "no count field";
  } catch (e) {
    return `error: ${e.message}`;
  }
}

async function fetchNaukri(companyName) {
  try {
    const params = new URLSearchParams({
      noOfResults: "1",
      urlType: "search_by_key_loc",
      searchType: "adv",
      src: "jobsearchDesk",
      key: companyName,
      location: "india",
      pageNo: "0",
    });
    const url = `https://www.naukri.com/jobapi/v3/search?${params}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "appid": "109", "systemid": "Naukri",
        "Accept": "application/json", "Referer": "https://www.naukri.com/",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return `HTTP ${res.status}`;
    const data = await res.json();
    return data?.noOfJobs ?? data?.noOfResults ?? "no count field";
  } catch (e) {
    return `error: ${e.message}`;
  }
}

const tests = [
  // US companies
  { name: "Amazon", country: "us" },
  { name: "BlackRock", country: "us" },
  { name: "Johnson & Johnson", country: "us" },
  { name: "JPMorgan Chase", country: "us" },
  { name: "Goldman Sachs", country: "us" },
  { name: "Palo Alto Networks", country: "us" },
  { name: "CVS Health", country: "us" },
  // GB companies
  { name: "BP", country: "gb" },
  { name: "Rolls-Royce", country: "gb" },
  { name: "Revolut", country: "gb" },
  // DE companies (includes FR, NL, SE, NO)
  { name: "SAP", country: "de" },
  { name: "Deutsche Bank", country: "de" },
  { name: "Allianz", country: "de" },
  { name: "BioNTech", country: "de" },
  { name: "Adyen", country: "de" },
  { name: "ASML", country: "de" },
  { name: "Equinor", country: "de" },
  { name: "BNP Paribas", country: "de" },
  { name: "AXA", country: "de" },
  // SG companies
  { name: "DBS Bank", country: "sg" },
  { name: "OCBC Bank", country: "sg" },
  // CA companies
  { name: "Shopify", country: "ca" },
  { name: "Royal Bank of Canada", country: "ca" },
  // AE (MENA)
  { name: "Emirates NBD", country: "ae" },
  // India (Naukri)
  { name: "Tata Steel", naukri: true },
  { name: "Steel Authority of India", naukri: true },
  { name: "Union Bank of India", naukri: true },
];

console.log("Testing Adzuna API for sample companies:\n");
for (const t of tests) {
  process.stdout.write(`  ${t.name.padEnd(35)} `);
  let result;
  if (t.naukri) {
    result = await fetchNaukri(t.name);
    console.log(`Naukri: ${result}`);
  } else {
    result = await fetchAdzuna(t.name, t.country);
    console.log(`Adzuna [${t.country}]: ${result}`);
  }
  await sleep(500);
}
