// test-adzuna-batch2.mjs — Fix AE endpoint, test Naukri headers

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
  // Try different Accept header formats
  for (const acceptHeader of [
    "*/*",
    "application/json, text/plain, */*",
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  ]) {
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "appid": "109",
          "systemid": "Naukri",
          "Accept": acceptHeader,
          "Referer": "https://www.naukri.com/",
        },
        signal: AbortSignal.timeout(10000),
      });
      const statusText = `HTTP ${res.status}`;
      if (!res.ok) {
        console.log(`    [${acceptHeader.substring(0,20)}] → ${statusText}`);
        await sleep(200);
        continue;
      }
      const data = await res.json();
      const count = data?.noOfJobs ?? data?.noOfResults ?? "no count field";
      console.log(`    [${acceptHeader.substring(0,20)}] → ${count} ✓`);
      return count;
    } catch (e) {
      console.log(`    [${acceptHeader.substring(0,20)}] → error: ${e.message}`);
    }
    await sleep(200);
  }
  return null;
}

console.log("=== Test AE/MENA alternative endpoints ===");
const aeTests = [
  { name: "Emirates NBD", country: "gb" },    // Try GB
  { name: "Check Point Software", country: "us" },  // IL → try US
  { name: "Check Point", country: "us" },
];
for (const t of aeTests) {
  const result = await fetchAdzuna(t.name, t.country);
  console.log(`  ${t.name.padEnd(30)} [${t.country}]: ${result}`);
  await sleep(500);
}

console.log("\n=== Test DE companies with simpler names ===");
const deTests = [
  { name: "BioNTech", country: "de" },
  { name: "BioNTech", country: "us" },  // fallback
  { name: "Adyen", country: "de" },
  { name: "Adyen", country: "gb" },     // fallback
  { name: "ASML", country: "de" },
  { name: "ASML", country: "gb" },      // fallback
  { name: "Equinor", country: "de" },
  { name: "Equinor", country: "gb" },   // fallback
  { name: "Klarna", country: "de" },
  { name: "Klarna", country: "gb" },    // fallback
];
for (const t of deTests) {
  const result = await fetchAdzuna(t.name, t.country);
  console.log(`  ${t.name.padEnd(25)} [${t.country}]: ${result}`);
  await sleep(400);
}

console.log("\n=== Test SG companies ===");
const sgTests = [
  { name: "DBS", country: "sg" },
  { name: "DBS Bank", country: "sg" },
  { name: "OCBC", country: "sg" },
  { name: "UOB", country: "sg" },
  { name: "DBS", country: "gb" },       // fallback
  { name: "Maybank", country: "sg" },
];
for (const t of sgTests) {
  const result = await fetchAdzuna(t.name, t.country);
  console.log(`  ${t.name.padEnd(25)} [${t.country}]: ${result}`);
  await sleep(400);
}

console.log("\n=== Test Canada companies ===");
const caTests = [
  { name: "Shopify", country: "ca" },
  { name: "Shopify", country: "us" },
  { name: "Royal Bank of Canada", country: "ca" },
  { name: "RBC", country: "ca" },
  { name: "TD Bank", country: "ca" },
  { name: "BMO", country: "ca" },
  { name: "BMO Financial", country: "us" },
];
for (const t of caTests) {
  const result = await fetchAdzuna(t.name, t.country);
  console.log(`  ${t.name.padEnd(30)} [${t.country}]: ${result}`);
  await sleep(400);
}

console.log("\n=== Test Naukri for India companies ===");
const indiaTests = ["Tata Steel", "Union Bank of India", "Steel Authority", "SAIL", "Phoenix Mills", "Vijaya Diagnostic"];
for (const name of indiaTests) {
  console.log(`  Testing: ${name}`);
  await fetchNaukri(name);
  await sleep(500);
}
