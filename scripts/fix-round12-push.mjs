// fix-round12-push.mjs
// Remaining 12 NULL companies — targeted final push
// - Vanguard: CWS REST API + Workday with different URL format
// - WNS: TimesJobs, Shine, Instahyre, actual wnscareers API
// - Alnylam: Taleo, Ashby, Lever
// - Bayer India: CropScience-specific WD or bayer.com India jobs
// - SAIL: sail.co.in official site
// - GSPL: correct domain (Gujarat State Petronet Limited)
// - Union Bank: correct URL
// - Masimo: Taleo, other ATSes

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" };

async function fetchText(url, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, ...extraHeaders },
      redirect: "follow",
      signal: AbortSignal.timeout(25000)
    });
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text() };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function fetchJson(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, Accept: "application/json", ...opts.headers },
      signal: AbortSignal.timeout(20000),
      ...opts
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, text, data };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function updateRoles(cn, count, source) {
  const vel = count > 1000 ? 1.5 : count > 500 ? 1.0 : count > 100 ? 0.5 : count > 0 ? 0.1 : -0.5;
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence SET total_open_roles = $2, hiring_source = $3,
     hiring_verified_at = NOW(), hiring_confidence = 0.85, hiring_velocity_score = $4, updated_at = NOW()
     WHERE canonical_name = $1`,
    [cn, count, source, vel]
  );
  return rowCount ?? 0;
}

async function getVal(cn) {
  const { rows } = await db.query(`SELECT total_open_roles FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]);
  return rows[0];
}
const isNull = async (cn) => (await getVal(cn))?.total_open_roles === null;

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. VANGUARD — CWS REST API ────────────────────────────────────────────
  console.log("=== Vanguard (CWS REST API + fresh WD search) ===");
  if (await isNull("vanguard")) {
    // Try CWS autocomplete - might reveal job types or counts
    const cws = await fetchJson("https://www.vanguardjobs.com/wp-json/cws/autocomplete?term=");
    await sleep(300);
    console.log(`  CWS autocomplete → ${cws.status}`);
    if (cws.ok) console.log(`  Data: ${JSON.stringify(cws.data).slice(0, 300)}`);

    // Try full CWS namespace discovery
    const cwsRoot = await fetchJson("https://www.vanguardjobs.com/wp-json/cws");
    await sleep(300);
    console.log(`  CWS root → ${cwsRoot.status}`);
    if (cwsRoot.ok) console.log(`  Data: ${JSON.stringify(cwsRoot.data).slice(0, 500)}`);

    // Try fetching the page source - look for embedded job data in JS vars
    const { text, status } = await fetchText("https://www.vanguardjobs.com/");
    await sleep(400);
    if (text && status === 200) {
      // Look for job count in JS
      const jobCounts = [...text.matchAll(/(?:total|count|jobs?|positions?)\s*[=:]\s*(\d{2,6})/gi)]
        .filter(m => parseInt(m[1]) > 1 && parseInt(m[1]) < 100000);
      console.log(`  JS job counts: ${jobCounts.map(m=>m[0]).slice(0,10).join(', ')}`);
      // Look for PHP/AJAX data
      const ajaxData = text.match(/var\s+cws_data\s*=\s*(\{[\s\S]{20,2000}?\});/)?.[1]
                     || text.match(/var\s+jobSearch\s*=\s*(\{[\s\S]{20,2000}?\});/)?.[1]
                     || text.match(/wp_localize_script[\s\S]{0,200}?(\{[\s\S]{20,1000}?\})/)?.[1];
      if (ajaxData) { console.log(`  AJAX data: ${ajaxData.slice(0, 400)}`); }
      // Look for WD links more broadly (any matching URL pattern)
      const wdLinks = [...text.matchAll(/myworkdayjobs\.com[^"'\s]{0,100}/gi)];
      console.log(`  WD links: ${wdLinks.map(m=>m[0]).join(', ')}`);
      // Look for career platform links
      const atsLinks = [...text.matchAll(/(icims|taleo|greenhouse|lever|jobvite|brassring|successfactors|oracle|sap|smartrecruiters|workday)/gi)].map(m=>m[1]);
      console.log(`  ATS refs: ${[...new Set(atsLinks)].join(', ')}`);
    }

    // Adzuna for Vanguard
    if (await isNull("vanguard")) {
      const adzRes = await fetchJson("https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=vanguard&results_per_page=1");
      await sleep(300);
      console.log(`  Adzuna Vanguard US: ${adzRes.data?.count}`);
      if (adzRes.ok && typeof adzRes.data?.count === "number" && adzRes.data.count > 0) {
        const rc = await updateRoles("vanguard", adzRes.data.count, "adzuna_api_us"); updated += rc;
      }
    }

    // Try specific Workday patterns for financial services companies
    if (await isNull("vanguard")) {
      const wdFinancial = [
        ["vanguard", "1", "External_Career"],
        ["vanguard", "1", "Campus_Career"],
        ["vanguard", "5", "VGR_External"],
        ["vanguard", "3", "VGR_Careers"],
        ["vanguard", "1", "VGR_External_Careers"],
        ["vanguard", "5", "Vanguard_External"],
        ["vanguard", "5", "External_Careers"],
        ["vanguard", "3", "External_Careers"],
      ];
      for (const [t, p, s] of wdFinancial) {
        const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
          method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA },
          body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
        });
        await sleep(150);
        if (res.ok && typeof res.data?.total === "number") {
          console.log(`  ✓ WD [${t}.wd${p}/${s}]: ${res.data.total}`);
          const rc = await updateRoles("vanguard", res.data.total, "workday_vanguard_external"); updated += rc; break;
        }
      }
    }
  }
  if (await isNull("vanguard")) console.log("  → No data found");
  await sleep(600);

  // ── 2. WNS GLOBAL — TimesJobs, Shine, direct approach ───────────────────
  console.log("\n=== WNS Global ===");
  if (await isNull("wns global")) {
    // TimesJobs API
    const tjRes = await fetchJson("https://www.timesjobs.com/candidate/get-jobs.html?searchType=personalizedSearch&from=submit&txtKeywords=wns+global&txtLocation=&sequence=1&startPage=1", {
      headers: { Accept: "application/json", Referer: "https://www.timesjobs.com" }
    });
    await sleep(400);
    console.log(`  TimesJobs → ${tjRes.status}`);
    if (tjRes.ok && tjRes.data) console.log(`  Data: ${JSON.stringify(tjRes.data).slice(0, 300)}`);

    // Try Shine.com for WNS
    if (await isNull("wns global")) {
      const { text, status } = await fetchText("https://www.shine.com/jobs/wns-global-services-jobs/", {
        "Accept-Language": "en-IN,en;q=0.9",
      });
      await sleep(400);
      console.log(`  Shine.com WNS → ${status} (${text?.length})`);
      if (text && status === 200) {
        const count = text.match(/"totalCount"\s*:\s*(\d+)/i)
                    || text.match(/"total_jobs"\s*:\s*(\d+)/i)
                    || text.match(/(\d[\d,]+)\s+Jobs?\s+(?:by|from|at|for)\s+WNS/i);
        if (count) { console.log(`  Count: ${count[1]}`); const n = parseInt((count[1]||'').replace(/,/g,'')); if (n > 0) { const rc = await updateRoles("wns global", n, "shine_scrape"); updated += rc; } }
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
      }
    }

    // Try WNS directly via Instahyre (tech job site)
    if (await isNull("wns global")) {
      const res = await fetchJson("https://api.instahyre.com/api/v3/positions/search?query=WNS+Global&company=WNS&page=1&page_size=1", {
        headers: { Accept: "application/json", Referer: "https://www.instahyre.com" }
      });
      await sleep(400);
      console.log(`  Instahyre → ${res.status}`);
      if (res.ok && res.data) console.log(`  Data: ${JSON.stringify(res.data).slice(0, 300)}`);
    }

    // Try fetching the wnscareers.com job listings page directly
    if (await isNull("wns global")) {
      const { text, status } = await fetchText("https://www.wnscareers.com/jobs/", {
        "Accept": "text/html,application/xhtml+xml",
      });
      await sleep(400);
      console.log(`  wnscareers.com/jobs/ → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 1000)}`);
        const count = plain.match(/(\d[\d,]+)\s+(?:job|position|opening|result|opportunit)/i);
        if (count) { console.log(`  Count: ${count[0]}`); }
      }
    }

    // Fetch WNS job listing from their region-specific pages
    if (await isNull("wns global")) {
      const wnsRegionUrls = [
        "https://www.wnscareers.com/?ccode=IND",
        "https://www.wnscareers.com/jobs?location=india",
        "https://www.wnscareers.com/careers",
      ];
      for (const url of wnsRegionUrls) {
        const { text, status } = await fetchText(url);
        await sleep(400);
        console.log(`  ${url} → ${status} (${text?.length})`);
        if (text && status === 200) {
          const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`  Preview: ${plain.slice(0, 600)}`);
          // Look for job count
          const count = plain.match(/(\d[\d,]+)\s+(?:job|position|opening|result|opportunit)/i);
          if (count) { console.log(`  Count: ${count[0]}`); }
          // Look for job search API
          const apiUrls = [...text.matchAll(/["']((?:https?:\/\/[\w.-]+)?\/api\/[^"'\s]{5,100})["']/gi)].map(m=>m[1]);
          if (apiUrls.length > 0) console.log(`  APIs: ${apiUrls.slice(0,5).join(', ')}`);
          break;
        }
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 3. ALNYLAM — Taleo + Ashby + Lever ──────────────────────────────────
  console.log("\n=== Alnylam Pharmaceuticals ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // Try Taleo
    const taleoDomains = [
      "https://alnylam.taleo.net/careersection/2/jobsearch.ftl",
      "https://alnylam.taleo.net/careersection/external/jobsearch.ftl",
    ];
    for (const url of taleoDomains) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  Taleo [${url.slice(8, 50)}] → ${status} (${text?.length})`);
      if (text && status === 200) {
        const count = text.match(/(\d+)\s+(?:job|result|position)/i);
        if (count) { console.log(`  Count: ${count[0]}`); const n = parseInt(count[1]); if (n > 0) { const rc = await updateRoles("alnylam pharmaceuticals", n, "taleo_scrape"); updated += rc; break; } }
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 200)}`);
      }
    }
    // Try Ashby
    if (await isNull("alnylam pharmaceuticals")) {
      for (const t of ["alnylam", "alnylampharmaceuticals", "alnylam-pharmaceuticals"]) {
        const res = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${t}`);
        await sleep(200);
        if (res.ok && Array.isArray(res.data?.jobPostings)) {
          console.log(`  Ashby [${t}]: ${res.data.jobPostings.length}`);
          if (res.data.jobPostings.length > 0) { const rc = await updateRoles("alnylam pharmaceuticals", res.data.jobPostings.length, "ashby_api"); updated += rc; break; }
        }
      }
    }
    // Try Lever
    if (await isNull("alnylam pharmaceuticals")) {
      for (const t of ["alnylam", "alnylampharma"]) {
        const res = await fetchJson(`https://api.lever.co/v0/postings/${t}?mode=json`);
        await sleep(200);
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          console.log(`  Lever [${t}]: ${res.data.length}`);
          const rc = await updateRoles("alnylam pharmaceuticals", res.data.length, "lever_api"); updated += rc; break;
        }
      }
    }
    // Try iCIMS
    if (await isNull("alnylam pharmaceuticals")) {
      const icimsUrls = [
        "https://careers-alnylam.icims.com/jobs/search?ss=1&hashed=-435588046",
        "https://alnylam.icims.com/jobs/search",
      ];
      for (const url of icimsUrls) {
        const { text, status } = await fetchText(url); await sleep(300);
        console.log(`  iCIMS [${url.slice(8, 50)}] → ${status}`);
        if (text && status === 200) {
          const count = text.match(/(\d+)\s+(?:job|result|position)/i);
          if (count) { console.log(`  Count: ${count[0]}`); const n = parseInt(count[1]); if (n > 0) { const rc = await updateRoles("alnylam pharmaceuticals", n, "icims_scrape"); updated += rc; break; } }
        }
      }
    }
    // Try BrassRing (IBM Kenexa)
    if (await isNull("alnylam pharmaceuticals")) {
      const { text, status } = await fetchText("https://sjobs.brassring.com/TGnewUI/Search/home/HomeWithPreLoad?PageType=JobListing&partnerid=25921&siteid=5157&Codes=INTERNET");
      await sleep(400);
      console.log(`  BrassRing → ${status} (${text?.length})`);
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 4. MASIMO — comprehensive ATS scan ───────────────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    // Try all common ATS platforms
    const atsChecks = [
      ["Greenhouse", async () => {
        for (const t of ["masimo", "masimocorp", "masimo-corporation"]) {
          const res = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`);
          await sleep(200);
          if (res.ok && Array.isArray(res.data?.jobs) && res.data.jobs.length > 0) return { count: res.data.jobs.length, source: `greenhouse_${t}` };
        }
      }],
      ["Lever", async () => {
        for (const t of ["masimo", "masimocorp"]) {
          const res = await fetchJson(`https://api.lever.co/v0/postings/${t}?mode=json`);
          await sleep(200);
          if (res.ok && Array.isArray(res.data) && res.data.length > 0) return { count: res.data.length, source: `lever_${t}` };
        }
      }],
      ["Ashby", async () => {
        for (const t of ["masimo", "masimocorp", "masimo-corporation"]) {
          const res = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${t}`);
          await sleep(200);
          if (res.ok && Array.isArray(res.data?.jobPostings) && res.data.jobPostings.length > 0) return { count: res.data.jobPostings.length, source: `ashby_${t}` };
        }
      }],
      ["Workday", async () => {
        for (const [t, p, s] of [["masimo","5","External"],["masimo","3","External"],["masimo","1","External"],["masimo","5","masimo"],["masimocorp","5","External"]]) {
          const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
          });
          await sleep(200);
          if (res.ok && typeof res.data?.total === "number") return { count: res.data.total, source: `workday_${t}_${s}` };
        }
      }],
      ["Taleo", async () => {
        const { text, status } = await fetchText("https://masimo.taleo.net/careersection/2/jobsearch.ftl");
        await sleep(400);
        console.log(`  Taleo → ${status}`);
        if (text && status === 200) {
          const count = text.match(/(\d+)\s+(?:job|result|position)/i);
          if (count) return { count: parseInt(count[1]), source: "taleo_masimo" };
        }
      }],
      ["iCIMS", async () => {
        const { text, status } = await fetchText("https://careers-masimo.icims.com/jobs/search?ss=1");
        await sleep(300);
        console.log(`  iCIMS → ${status}`);
        if (text && status === 200) {
          const count = text.match(/(\d+)\s+(?:job|result|position)/i);
          if (count) return { count: parseInt(count[1]), source: "icims_masimo" };
        }
      }],
    ];
    for (const [name, fn] of atsChecks) {
      console.log(`  Trying ${name}...`);
      const result = await fn();
      if (result) {
        console.log(`  ✓ ${name}: ${result.count} (${result.source})`);
        const rc = await updateRoles("masimo", result.count, result.source); updated += rc; break;
      }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");
  await sleep(600);

  // ── 5. BAYER CROPSCIENCE INDIA — try bayer.com with India facet ──────────
  console.log("\n=== Bayer CropScience India ===");
  if (await isNull("bayer cropscience india")) {
    // Try Bayer's specific India WD site
    const bayerWdVariants = [
      // Try the WD3 with various body formats (422 issue)
      // 422 typically means the body has an extra/wrong field for this WD version
      ["bayer", "3", "Bayer_Global", `{"limit":1,"offset":0,"searchText":"","appliedFacets":{}}`],
      ["bayer", "3", "Bayer_Global", `{"limit":1,"offset":0,"searchText":"","appliedFacets":{},"returnFacets":false,"deviceFormFactor":"DESKTOP"}`],
      ["bayer", "3", "Bayer_Global", `{"appliedFacets":{},"limit":20,"searchText":"","returnFacets":false}`],
    ];
    for (const [t, p, s, body] of bayerWdVariants) {
      const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Origin": `https://${t}.wd${p}.myworkdayjobs.com`,
          "Referer": `https://${t}.wd${p}.myworkdayjobs.com/${s}`,
        },
        body
      });
      await sleep(300);
      console.log(`  Bayer WD body [${body.slice(0,60)}] → ${res.status}`);
      if (res.ok && typeof res.data?.total === "number") {
        console.log(`  ✓ Global total: ${res.data.total}`);
        // Search for India-specific jobs
        const indiaRes = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": UA },
          body: body.replace(/"searchText":""/, '"searchText":"India"')
        });
        await sleep(300);
        if (indiaRes.ok && typeof indiaRes.data?.total === "number") {
          console.log(`  India search: ${indiaRes.data.total}`);
          const rc = await updateRoles("bayer cropscience india", indiaRes.data.total, "workday_bayer_india_search");
          updated += rc;
        }
        break;
      }
    }

    // Try Bayer's Greenhouse (older pharma companies sometimes use both)
    if (await isNull("bayer cropscience india")) {
      for (const t of ["bayer", "bayercropscience", "bayer-cropscience-india"]) {
        const res = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`);
        await sleep(200);
        if (res.ok && Array.isArray(res.data?.jobs)) {
          console.log(`  GH Bayer [${t}]: ${res.data.jobs.length}`);
        }
      }
    }
  }
  if (await isNull("bayer cropscience india")) console.log("  → No data found");
  await sleep(600);

  // ── 6. SAIL — sail.co.in official site ───────────────────────────────────
  console.log("\n=== SAIL (sail.co.in official) ===");
  if (await isNull("steel authority of india")) {
    // Try various SAIL career URLs
    const sailUrls = [
      "https://www.sail.co.in/en/recruitment-notices",
      "https://www.sail.co.in/en/career-opportunity",
      "https://www.sail.co.in/en/career",
      "https://sail.co.in/recruitment",
    ];
    for (const url of sailUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(500);
      console.log(`  ${url} → ${status} (final: ${finalUrl?.slice(0,60)}) bytes=${text?.length}`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Full text (5000): ${plain.slice(0, 5000)}`);
        const vacList = [...plain.matchAll(/(\d+)\s*(?:vacancy|vacancies|post|appointment|seat)/gi)];
        if (vacList.length > 0) console.log(`  Vacancies: ${vacList.map(m=>m[0]).join(', ')}`);
        break;
      }
    }
  }
  if (await isNull("steel authority of india")) console.log("  → No data found");
  await sleep(600);

  // ── 7. GSPL — Gujarat State Petronet Limited (correct domain) ─────────────
  console.log("\n=== GSPL (Gujarat State Petronet Limited) ===");
  if (await isNull("gspl")) {
    // Find correct website for GSPL
    const gsplUrls = [
      "https://www.gspl.in/career",          // Different GSPL
      "https://www.gsplgas.com",              // Gas company?
      "https://gspl.gujarat.gov.in",          // Gujarat govt
      "https://www.gujaratgas.com/career",    // Gujarat Gas (parent of GSPL)
      "https://www.gujaratgas.com/careers",
      "https://www.gujagas.com",
      "https://gujpetroleum.com",
    ];
    for (const url of gsplUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} (${text?.length}) → ${finalUrl?.slice(0,70)}`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        if (plain.toLowerCase().includes('petronet') || plain.toLowerCase().includes('pipeline') || plain.toLowerCase().includes('natural gas')) {
          console.log(`  ✓ Appears to be the right GSPL`);
          const careerLinks = [...text.matchAll(/href="([^"]*(?:career|recruit|job)[^"]*)"/gi)].map(m=>m[1]);
          console.log(`  Career links: ${careerLinks.slice(0,10).join(', ')}`);
          break;
        }
      }
    }
  }
  if (await isNull("gspl")) console.log("  → No data found");
  await sleep(600);

  // ── 8. UNION BANK — try different endpoints ──────────────────────────────
  console.log("\n=== Union Bank of India ===");
  if (await isNull("union bank of india")) {
    const ubUrls = [
      "https://www.unionbankofindia.co.in/english/recruitment.aspx",
      "https://unionbankofindia.co.in/english/career.aspx",
      "https://www.unionbank.co.in/recruitment",
      "https://www.unionbankofindia.in/recruitment",
    ];
    for (const url of ubUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} → ${finalUrl?.slice(0,70)}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 1000)}`);
        const vacancies = [...plain.matchAll(/(\d[\d,]+)\s*(?:vacancy|vacancies|post|seat|appointment)/gi)];
        if (vacancies.length > 0) { console.log(`  Vacancies: ${vacancies.map(m=>m[0]).join(', ')}`); }
        break;
      }
    }
  }
  if (await isNull("union bank of india")) console.log("  → No data found");
  await sleep(600);

  // ── 9. PFC LTD — try alternative approaches ──────────────────────────────
  console.log("\n=== PFC Ltd ===");
  if (await isNull("pfc ltd")) {
    const pfcUrls = [
      "https://www.pfcindia.com/Home/CareerSection",
      "https://pfc.gov.in",
      "https://www.pfcl.co.in",
      "https://pfcindia.gov.in",
    ];
    for (const url of pfcUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} → ${finalUrl?.slice(0,70)}`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        break;
      }
    }
  }
  if (await isNull("pfc ltd")) console.log("  → No data found");

  // ── 10. MEITUAN — try different API paths ────────────────────────────────
  console.log("\n=== Meituan ===");
  if (await isNull("meituan")) {
    // Try the Meituan positions API with different endpoint structures
    const meituanApis = [
      "https://zhaopin.meituan.com/api/position/search?pageSize=1&pageIndex=1",
      "https://zhaopin.meituan.com/api/v1/positions?page=1&size=1",
      "https://zhaopin.meituan.com/web/position/list?pageSize=1&pageIndex=1",
    ];
    for (const url of meituanApis) {
      const res = await fetchJson(url, {
        headers: { "Accept": "application/json", "Referer": "https://zhaopin.meituan.com/web/home", "Accept-Language": "zh-CN,zh;q=0.9" }
      });
      await sleep(400);
      console.log(`  ${url.slice(40)} → ${res.status}`);
      if (res.ok && res.data) {
        console.log(`  Data: ${JSON.stringify(res.data).slice(0, 300)}`);
        const total = res.data?.data?.total ?? res.data?.total ?? res.data?.count;
        if (typeof total === "number" && total > 0) {
          console.log(`  ✓ Count: ${total}`);
          const rc = await updateRoles("meituan", total, "meituan_position_search"); updated += rc; break;
        }
      }
    }
  }
  if (await isNull("meituan")) console.log("  → No data found");

  // FINAL STATE
  const { rows: s } = await db.query(`SELECT count(*) AS total, count(total_open_roles) AS has_roles, count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null FROM verified_company_intelligence`);
  const { rows: nulls } = await db.query(`SELECT canonical_name, country_code FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
  await db.end();
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  if (nulls.length > 0) {
    console.log(`\nRemaining NULL (${nulls.length}):`);
    for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
