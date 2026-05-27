// discover-workday-urls.mjs
// Fetch company career pages to find embedded Workday URLs
// Then query the correct API with discovered tenant/site

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, finalUrl: res.url, text };
  } catch (e) { return { ok: false, status: "err", error: e.message, text: "" }; }
}

function extractWorkdayUrl(html) {
  // Look for Workday URLs in HTML: href, src, data-url, etc.
  const patterns = [
    /https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>]+)/gi,
    /https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com/gi,
  ];
  const found = new Set();
  for (const p of patterns) {
    let m;
    while ((m = p.exec(html)) !== null) {
      found.add(m[0]);
    }
  }
  return [...found];
}

function extractJobCount(html) {
  // Try multiple patterns to find job count in HTML
  const patterns = [
    /"total"\s*:\s*(\d+)/,
    /"totalJobs"\s*:\s*(\d+)/,
    /"jobCount"\s*:\s*(\d+)/,
    /"count"\s*:\s*(\d+)/,
    /"totalFound"\s*:\s*(\d+)/,
    /"total_count"\s*:\s*(\d+)/,
    /(\d{1,4})\s+(?:open\s+)?(?:job|position|opportunit|vacancyies|role|opening)/i,
    /(?:showing|found|view|browse)\s+(\d{1,4})\s+(?:job|position|opportunit)/i,
    /"num_active_postings"\s*:\s*(\d+)/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 0 && n < 100000) return n;  // sanity check
    }
  }
  return null;
}

async function tryWorkdayAPI(tenant, site, wdNum) {
  try {
    const url = `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { count: null, status: res.status };
    const data = await res.json();
    return { count: typeof data.total === "number" ? data.total : null, status: 200 };
  } catch { return { count: null, status: "err" }; }
}

const companies = [
  { name: "Vanguard",              urls: ["https://www.vanguardjobs.com", "https://careers.vanguard.com"] },
  { name: "Vertex Pharmaceuticals", urls: ["https://www.vrtx.com/en/company/careers", "https://careers.vrtx.com"] },
  { name: "Align Technology",      urls: ["https://www.aligntech.com/company/careers", "https://jobs.aligntech.com"] },
  { name: "Insulet",               urls: ["https://careers.insulet.com", "https://www.insulet.com/careers"] },
  { name: "Masimo",                urls: ["https://www.masimo.com/company/careers", "https://careers.masimo.com"] },
  { name: "Alnylam Pharmaceuticals", urls: ["https://www.alnylam.com/careers/", "https://careers.alnylam.com"] },
  { name: "Certara",               urls: ["https://www.certara.com/careers/", "https://careers.certara.com"] },
  { name: "Qlik",                  urls: ["https://www.qlik.com/us/company/careers", "https://careers.qlik.com"] },
  { name: "Equinor",               urls: ["https://www.equinor.com/careers", "https://careers.equinor.com"] },
  { name: "Check Point",           urls: ["https://jobs.checkpoint.com", "https://www.checkpoint.com/careers/"] },
  { name: "Penumbra",              urls: ["https://www.penumbrainc.com/about-us/careers/", "https://careers.penumbrainc.com"] },
  { name: "Noom",                  urls: ["https://www.noom.com/careers/", "https://jobs.noom.com"] },
];

for (const co of companies) {
  console.log(`\n=== ${co.name} ===`);
  let foundWorkday = null;
  let foundCount = null;

  for (const url of co.urls) {
    const { ok, status, finalUrl, text, error } = await fetchPage(url);
    console.log(`  Fetched: ${url} → HTTP ${status} (final: ${finalUrl?.slice(0, 80) || 'N/A'})`);
    if (error) { console.log(`  Error: ${error}`); continue; }
    if (!ok || !text) continue;

    // Look for Workday URLs
    const wdUrls = extractWorkdayUrl(text);
    if (wdUrls.length > 0) {
      console.log(`  Found Workday URLs: ${wdUrls.join(', ').slice(0, 200)}`);
      foundWorkday = wdUrls[0];
    }

    // Try to extract job count from HTML
    const count = extractJobCount(text);
    if (count !== null) {
      console.log(`  Found count in HTML: ${count}`);
      foundCount = count;
    }

    // Look for other ATS URLs
    const atsPatterns = [
      { name: "Greenhouse", re: /boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/g },
      { name: "Lever",      re: /jobs\.lever\.co\/([a-zA-Z0-9_-]+)/g },
      { name: "Ashby",      re: /jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/g },
      { name: "Comeet",     re: /comeet\.co\/jobs\/([a-zA-Z0-9_-]+)/g },
      { name: "iCIMS",      re: /careers-([a-zA-Z0-9_-]+)\.icims\.com/g },
      { name: "BambooHR",   re: /([a-zA-Z0-9_-]+)\.bamboohr\.com\/jobs/g },
      { name: "Teamtailor", re: /([a-zA-Z0-9_-]+)\.teamtailor\.com\/jobs/g },
    ];
    for (const { name, re } of atsPatterns) {
      let m;
      const found = new Set();
      while ((m = re.exec(text)) !== null) found.add(m[1]);
      if (found.size > 0) console.log(`  ${name} tokens found: ${[...found].join(', ')}`);
    }

    await sleep(400);
  }

  // If we found a Workday URL, try to parse tenant/site and query the API
  if (foundWorkday) {
    const wdMatch = foundWorkday.match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)?/i);
    if (wdMatch) {
      const [, tenant, wdNum, site] = wdMatch;
      if (site) {
        console.log(`  Trying Workday API: tenant=${tenant}, site=${site}, wd${wdNum}`);
        const { count, status } = await tryWorkdayAPI(tenant, site, wdNum);
        console.log(`  API result: ${count !== null ? count + ' jobs' : 'failed (HTTP ' + status + ')'}`);
        await sleep(500);
      }
    }
  }
}
