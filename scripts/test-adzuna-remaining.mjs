// test-adzuna-remaining.mjs — Test remaining companies that got "no data"

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

// Test the companies that showed "no data" to find working names
const tests = [
  // Canonical name fixes (name mismatches)
  { cn: "toronto dominion bank",       name: "TD",                  country: "ca" },
  { cn: "asml",                        name: "ASML",                country: "nl" },
  { cn: "wuxi apptec",                 name: "WuXi AppTec",         country: "us" },
  { cn: "nubank",                      name: "Nubank",              country: "br" },
  { cn: "nubank",                      name: "Nu Holdings",         country: "us" },
  { cn: "axa global",                  name: "AXA",                 country: "fr" },
  { cn: "bp plc",                      name: "BP",                  country: "gb" },
  { cn: "ubs",                         name: "UBS",                 country: "gb" },
  { cn: "dsv a s",                     name: "DSV",                 country: "de" },
  { cn: "dsv a s",                     name: "DSV",                 country: "gb" },
  { cn: "bbva",                        name: "BBVA",                country: "gb" },
  { cn: "associated british foods",    name: "Associated British Foods", country: "gb" },
  { cn: "associated british foods",    name: "AB Foods",            country: "gb" },
  { cn: "oura",                        name: "Oura",                country: "gb" },
  { cn: "oura",                        name: "Oura Health",         country: "us" },
  // US companies that returned "no data"
  { cn: "amerisourcebergen",           name: "Cencora",             country: "us" },
  { cn: "align technology",            name: "Align Technology",    country: "us" },
  { cn: "alnylam pharmaceuticals",     name: "Alnylam",             country: "us" },
  { cn: "american express",            name: "American Express",    country: "us" },
  { cn: "airtable",                    name: "Airtable",            country: "us" },
  { cn: "better com",                  name: "Better.com",          country: "us" },
  { cn: "biogen inc",                  name: "Biogen",              country: "us" },
  { cn: "bridgebio",                   name: "BridgeBio",           country: "us" },
  { cn: "calm",                        name: "Calm",                country: "us" },
  { cn: "cerebral",                    name: "Cerebral",            country: "us" },
  { cn: "certara",                     name: "Certara",             country: "us" },
  { cn: "confluent",                   name: "Confluent",           country: "us" },
  { cn: "cytiva",                      name: "Cytiva",              country: "us" },
  { cn: "fisker",                      name: "Fisker",              country: "us" },
  { cn: "forward health",              name: "Forward Health",      country: "us" },
  { cn: "ginkgo bioworks",             name: "Ginkgo Bioworks",     country: "us" },
  { cn: "hca healthcare",              name: "HCA Healthcare",      country: "us" },
  { cn: "hca healthcare",              name: "HCA",                 country: "us" },
  { cn: "insulet",                     name: "Insulet",             country: "us" },
  { cn: "invision",                    name: "InVision",            country: "us" },
  { cn: "invitae",                     name: "Invitae",             country: "us" },
  { cn: "karuna therapeutics",         name: "Karuna Therapeutics", country: "us" },
  { cn: "masimo",                      name: "Masimo",              country: "us" },
  { cn: "noom",                        name: "Noom",                country: "us" },
  { cn: "penumbra",                    name: "Penumbra",            country: "us" },
  { cn: "qlik",                        name: "Qlik",                country: "us" },
  { cn: "shockwave medical",           name: "Shockwave Medical",   country: "us" },
  { cn: "vanguard",                    name: "Vanguard",            country: "us" },
  { cn: "vertex pharmaceuticals",      name: "Vertex Pharmaceuticals", country: "us" },
  { cn: "vertex pharmaceuticals",      name: "Vertex",              country: "us" },
  { cn: "zimmer biomet",               name: "Zimmer Biomet",       country: "us" },
  { cn: "supabase",                    name: "Supabase",            country: "us" },
  { cn: "supabase",                    name: "Supabase",            country: "gb" },
];

console.log("Testing remaining companies...\n");
for (const t of tests) {
  const result = await fetchAdzuna(t.name, t.country);
  const status = result === 0 ? "0 ⚠️" : result;
  console.log(`  [${t.cn}] "${t.name}" [${t.country}]: ${status}`);
  await sleep(500);
}
