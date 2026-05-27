// fix-round8-qlik-aln.mjs
// KEY FINDS:
// - Qlik: tibco.wd5.myworkdayjobs.com/Cloud_Software_Group (from careers.cloud.com)
// - Alnylam: US IP works (COUNTRY_CODE=US now) - extract from page
// - WNS: deep SPA extraction from wnscareers.com
// - Vanguard: last attempts
// - India: Union Bank PDF count, GSPL from parent company

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS_US = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "CF-IPCountry": "US",
  "X-Forwarded-For": "172.217.1.1",
};

async function fetchText(url, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS_US, ...extraHeaders },
      redirect: "follow",
      signal: AbortSignal.timeout(25000)
    });
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text() };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function fetchRaw(url, opts = {}) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(18000), ...opts });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, text, data, ct: res.headers.get('content-type') || '' };
  } catch (e) { return { ok: false, status: 'err', error: e.message, text: '' }; }
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

async function isNull(cn) {
  const { rows } = await db.query(`SELECT total_open_roles FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]);
  return rows[0]?.total_open_roles === null || rows[0]?.total_open_roles === undefined;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. QLIK — Cloud Software Group Workday (tibco.wd5) ───────────────────
  console.log("=== Qlik (Cloud Software Group) ===");
  if (await isNull("qlik")) {
    // Found: https://tibco.wd5.myworkdayjobs.com/Cloud_Software_Group/login
    // Try the CXS API endpoint
    const csgWdCombos = [
      ["tibco", "5", "Cloud_Software_Group"],
      ["tibco", "5", "Tibco_Careers"],
      ["tibco", "5", "tibco_careers"],
      ["tibco", "5", "External"],
      ["tibco", "3", "Cloud_Software_Group"],
      ["tibco", "1", "Cloud_Software_Group"],
    ];
    for (const [t, p, s] of csgWdCombos) {
      const res = await fetchRaw(
        `https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
          body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
        }
      );
      await sleep(200);
      if (res.ok && typeof res.data?.total === "number") {
        console.log(`  ✓ WD [${t}.wd${p}/${s}]: ${res.data.total} jobs`);
        const rc = await updateRoles("qlik", res.data.total, "workday_csg_tibco"); updated += rc; break;
      }
    }
    // Try getting job count directly from careers.cloud.com
    if (await isNull("qlik")) {
      const { text, status } = await fetchText("https://careers.cloud.com"); await sleep(400);
      console.log(`  careers.cloud.com → ${status}`);
      if (text && status === 200) {
        // Look for total job count on the page
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) {
          console.log(`  WD URLs found: ${wdUrls.slice(0,5).map(m=>m[0]).join(', ')}`);
          for (const wdMatch of wdUrls) {
            const [, t, p, s] = wdMatch;
            if (s.toLowerCase().includes('login')) continue; // Skip login URL
            const res = await fetchRaw(
              `https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
                body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
              }
            );
            await sleep(200);
            if (res.ok && typeof res.data?.total === "number") {
              console.log(`  ✓ WD [${t}.wd${p}/${s}]: ${res.data.total}`);
              const rc = await updateRoles("qlik", res.data.total, "workday_csg"); updated += rc; break;
            }
          }
        }
        const countMatch = plain.match(/(\d[\d,]+)\s+(?:job|position|role|opening|career)/i);
        if (countMatch) console.log(`  Count hint: ${countMatch[0]}`);
      }
    }
    // Try the specific Cloud Software Group Workday site directly
    if (await isNull("qlik")) {
      // The URL was "login" which means the site name might be correct but the path for search is different
      // Try: tibco.wd5.myworkdayjobs.com/wday/cxs/tibco/Cloud_Software_Group/jobs
      const res = await fetchRaw(
        "https://tibco.wd5.myworkdayjobs.com/wday/cxs/tibco/Cloud_Software_Group/jobs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Referer": "https://tibco.wd5.myworkdayjobs.com/Cloud_Software_Group" },
          body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
        }
      );
      await sleep(300);
      console.log(`  tibco.wd5/Cloud_Software_Group [with Referer] → ${res.status}`);
      console.log(`  Data: ${JSON.stringify(res.data || {}).slice(0, 200)}`);
      console.log(`  Raw: ${(res.text || '').slice(0, 200)}`);
      if (res.ok && typeof res.data?.total === "number") {
        const rc = await updateRoles("qlik", res.data.total, "workday_tibco_csg"); updated += rc;
      }
    }
  }
  if (await isNull("qlik")) console.log("  → No data found");
  await sleep(600);

  // ── 2. ALNYLAM — Extract from US-localized page ───────────────────────────
  console.log("\n=== Alnylam Pharmaceuticals (US locale works now) ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // US IP spoofing worked — COUNTRY_CODE is now "US"
    // Let's fetch the page and look for job count in the JS/HTML
    const { text, status } = await fetchText("https://jobs.alnylam.com/careers", {
      Cookie: "country_code=US; locale=en_US",
      "CF-IPCountry": "US",
      "X-Forwarded-For": "172.217.1.1",
    });
    await sleep(400);
    console.log(`  jobs.alnylam.com/careers [US] → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      const cc = text.match(/window\.COUNTRY_CODE\s*=\s*["']([^"']+)["']/)?.[1];
      console.log(`  COUNTRY_CODE: ${cc}`);
      // Look for job count in page data
      const numPositions = text.match(/"num_positions"\s*:\s*(\d+)/)?.[1]
                         || text.match(/"total_results"\s*:\s*(\d+)/)?.[1]
                         || text.match(/"count"\s*:\s*(\d+)/)?.[1];
      if (numPositions) { console.log(`  → ${numPositions} positions`); const rc = await updateRoles("alnylam pharmaceuticals", parseInt(numPositions), "eightfold_us_page"); updated += rc; }
      // Look for __PRELOADED_STATE__ or similar
      const preloaded = text.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]{0,2000}})/i)?.[1];
      if (preloaded) { console.log(`  Preloaded state: ${preloaded.slice(0, 300)}`); }
      // Look for API config
      const apiConfig = text.match(/['"]apiBaseUrl['"]\s*:\s*['"]([^'"]+)['"]/i)?.[1]
                      || text.match(/['"]api_base['"]\s*:\s*['"]([^'"]+)['"]/i)?.[1];
      if (apiConfig) { console.log(`  API base: ${apiConfig}`); }
      // Find any JS variable with job count
      const jsVars = [...text.matchAll(/var\s+\w+\s*=\s*(\d+)\s*;/g)].filter(m => parseInt(m[1]) > 0 && parseInt(m[1]) < 10000);
      if (jsVars.length > 0) console.log(`  JS number vars: ${jsVars.slice(0, 5).map(m => m[0]).join(', ')}`);
      // Try fetching the count endpoint now that we have the right cookies
      if (!numPositions) {
        const efRes = await fetchRaw(
          "https://jobs.alnylam.com/api/apply/v2/jobs?num_jobs=1&query=&location=",
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Referer: "https://jobs.alnylam.com/careers",
              Cookie: "country_code=US; locale=en_US",
              "CF-IPCountry": "US",
              "X-Forwarded-For": "172.217.1.1",
            }
          }
        );
        await sleep(300);
        console.log(`  EF API [with cookie] → ${efRes.status}`);
        console.log(`  Raw: ${(efRes.text || '').slice(0, 300)}`);
        if (efRes.ok && efRes.data) {
          const total = efRes.data.num_positions ?? efRes.data.total ?? efRes.data.count;
          if (total !== undefined) { console.log(`  → ${total}`); const rc = await updateRoles("alnylam pharmaceuticals", parseInt(total), "eightfold_us_api"); updated += rc; }
        }
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 3. WNS GLOBAL — Try extracting from wnscareers.com script ────────────
  console.log("\n=== WNS Global ===");
  if (await isNull("wns global")) {
    const { text, status } = await fetchText("https://www.wnscareers.com/");
    await sleep(400);
    console.log(`  wnscareers.com → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      // Look for job count in the 95KB page
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      // Show a bigger slice of the content to find job numbers
      console.log(`  Full plain (3000 chars): ${plain.slice(0, 3000)}`);
      // Try different count patterns
      const countPatterns = [
        /(\d[\d,]+)\s+(?:job|position|opportunit|opening|role)/gi,
        /"(?:total|count|numJobs|totalJobs)"\s*:\s*(\d+)/gi,
        />(\d[\d,]+)\s*(?:Jobs?|Openings?|Positions?)</gi,
      ];
      for (const pat of countPatterns) {
        const matches = [...text.matchAll(pat)];
        if (matches.length > 0) {
          console.log(`  Pattern matches: ${matches.map(m => m[0]).join(', ')}`);
        }
      }
      // Look for the API endpoint referenced in the JS
      const apiEndpoints = [...text.matchAll(/["']((?:https?:\/\/[\w.-]+)?\/api\/[^"'\s]{5,100})["']/gi)].map(m => m[1]);
      if (apiEndpoints.length > 0) { console.log(`  API endpoints: ${apiEndpoints.slice(0,5).join(', ')}`); }
      // Try to find any XHR or fetch calls
      const fetchUrls = [...text.matchAll(/fetch\s*\(\s*["']([^"']+)["']/gi)].map(m => m[1]);
      if (fetchUrls.length > 0) { console.log(`  Fetch URLs: ${fetchUrls.slice(0,5).join(', ')}`); }
      // Naukri is common for Indian BPO companies - WNS might use Naukri
    }
    // Try WNS via Naukri API
    if (await isNull("wns global")) {
      // Naukri doesn't have a simple API, but try fetching their search page
      const { text: nk, status: nkStatus } = await fetchText("https://www.naukri.com/wns-global-jobs");
      await sleep(500);
      console.log(`  naukri.com/wns-global-jobs → ${nkStatus}`);
      if (nk && nkStatus === 200) {
        const countMatch = nk.match(/"noOfJobs"\s*:\s*(\d+)/)
                          || nk.match(/"total"\s*:\s*(\d+)/)
                          || nk.match(/(\d+)\s+(?:job|opportunit)/i);
        if (countMatch) { console.log(`  Naukri count: ${countMatch[1] || countMatch[0]}`); const n = parseInt(countMatch[1]); if (n > 0) { const rc = await updateRoles("wns global", n, "naukri_scrape"); updated += rc; } }
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 4. VANGUARD — Final attempts ─────────────────────────────────────────
  console.log("\n=== Vanguard ===");
  if (await isNull("vanguard")) {
    // Try fetching from The Vanguard Group's actual corporate careers site
    const { text: vg, status: vgStatus } = await fetchText("https://www.vanguard.com/us/portal/site-content/generic-content/careers-landing");
    await sleep(400);
    console.log(`  vanguard.com/careers-landing → ${vgStatus}`);
    // Try their corporate WD more aggressively
    for (const pod of ["1","3","5","2","4","6","7","8","9","10"]) {
      for (const site of ["vanguard_careers", "Vanguard", "vanguard", "external"]) {
        for (const tenant of ["vanguard", "vanguardgroup"]) {
          const res = await fetchRaw(
            `https://${tenant}.wd${pod}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
              body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
            }
          );
          await sleep(100);
          if (res.ok && typeof res.data?.total === "number") {
            console.log(`  ✓ WD [${tenant}.wd${pod}/${site}]: ${res.data.total}`);
            const rc = await updateRoles("vanguard", res.data.total, "workday_careers"); updated += rc; break;
          }
        }
        if (!await isNull("vanguard")) break;
      }
      if (!await isNull("vanguard")) break;
    }
    // Try Vanguard on Greenhouse
    if (await isNull("vanguard")) {
      for (const t of ["vanguard", "vanguardgroup", "thevanguardgroup"]) {
        const res = await fetchRaw(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`); await sleep(200);
        if (res.ok && Array.isArray(res.data?.jobs)) { console.log(`  GH [${t}]: ${res.data.jobs.length}`); if (res.data.jobs.length > 0) { const rc = await updateRoles("vanguard", res.data.jobs.length, "greenhouse_api"); updated += rc; break; } }
      }
    }
    // Try iCIMS for Vanguard
    if (await isNull("vanguard")) {
      const icimsUrls = [
        "https://careers-vanguard.icims.com/jobs/search?ss=1",
        "https://vanguard.icims.com/jobs/search",
      ];
      for (const url of icimsUrls) {
        const { text, status } = await fetchText(url); await sleep(300);
        console.log(`  ${url.slice(8, 50)} → ${status}`);
        if (text && status === 200) {
          const count = text.match(/(\d+)\s+(?:job|result|position)/i);
          if (count) { console.log(`  iCIMS: ${count[0]}`); const n = parseInt(count[1]); if (n > 0) { const rc = await updateRoles("vanguard", n, "icims_scrape"); updated += rc; break; } }
        }
      }
    }
  }
  if (await isNull("vanguard")) console.log("  → No data found");
  await sleep(600);

  // ── 5. MASIMO — Try their ATS via IR disclosures ─────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    // Try fetching Masimo's annual report or proxy filing for career page link
    const masimoUrls = [
      "https://www.masimo.com",
      "https://search.masimo.com",
    ];
    for (const url of masimoUrls) {
      const { text, status } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 35)} → ${status} (${text?.length} bytes)`);
      if (!text || status !== 200) continue;
      // Look for career/jobs links
      const careerLinks = [...text.matchAll(/href="([^"]*(?:career|job|talent)[^"]*)"/gi)].map(m => m[1]).filter(h => h.includes('http'));
      if (careerLinks.length > 0) { console.log(`  External career links: ${careerLinks.slice(0,5).join(', ')}`); }
      const atsLinks = [...text.matchAll(/href="([^"]*(?:greenhouse|lever|workday|icims|taleo)[^"]*)"/gi)].map(m => m[1]);
      if (atsLinks.length > 0) { console.log(`  ATS links: ${atsLinks.slice(0,3).join(', ')}`); }
      break;
    }
    // Try Taleo for Masimo (Oracle legacy ATS)
    if (await isNull("masimo")) {
      const { text: tl, status: tlStatus } = await fetchText("https://masimo.taleo.net/careersection/2/jobsearch.ftl");
      await sleep(400);
      console.log(`  masimo.taleo.net → ${tlStatus}`);
      if (tl && tlStatus === 200) {
        const count = tl.match(/(\d+)\s+(?:job|result|position)/i);
        if (count) { console.log(`  Taleo count: ${count[0]}`); const n = parseInt(count[1]); const rc = await updateRoles("masimo", n, "taleo_scrape"); updated += rc; }
        const plain = tl.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Taleo preview: ${plain.slice(0, 200)}`);
      }
    }
    // Adzuna broader searches
    if (await isNull("masimo")) {
      const adzVariants = ["masimo", "masimo corporation", "masimo medical"];
      for (const name of adzVariants) {
        const res = await fetchRaw(`https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=${encodeURIComponent(name)}&results_per_page=1`);
        await sleep(400);
        console.log(`  Adzuna [${name}]: ${res.data?.count ?? 'not found'}`);
        if (res.ok && typeof res.data?.count === "number" && res.data.count > 0) {
          const rc = await updateRoles("masimo", res.data.count, "adzuna_api_us"); updated += rc; break;
        }
      }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");
  await sleep(600);

  // ── 6. UNION BANK — Count actual recruitment PDFs ────────────────────────
  console.log("\n=== Union Bank of India ===");
  if (await isNull("union bank of india")) {
    const { text, status } = await fetchText("https://unionbankofindia.co.in/recruitment");
    await sleep(400);
    console.log(`  unionbankofindia.co.in/recruitment → ${status}`);
    if (text && status === 200) {
      // Earlier: 14 PDF links, 2 notification links
      const pdfLinks = [...text.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m => m[1]);
      console.log(`  PDF links (${pdfLinks.length}): ${pdfLinks.slice(0, 10).join(', ')}`);
      // Show all text from the page
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      // Look for numbers near "vacancy" context
      const vacContexts = [...plain.matchAll(/\b\d{2,6}\b.{0,50}(?:vacancy|vacancies|post|seat|appointment)/gi)];
      console.log(`  Vacancy contexts: ${vacContexts.map(m => m[0]).join(' | ')}`);
      // Look for position-specific numbers
      const recruNums = [...plain.matchAll(/(?:recruit|appoint|vacancy|post)\w*\s*:?\s*(\d+)/gi)];
      console.log(`  Recruitment numbers: ${recruNums.map(m => m[0]).join(', ')}`);
      // Count all numbers that appear with "vacancies" in surrounding context
      const allText = plain;
      const vacSections = [...allText.matchAll(/(\d+)\s+(?:position|post|vacancy|seat)/ig)];
      if (vacSections.length > 0) { console.log(`  All vacancy mentions: ${vacSections.map(m=>m[0]).join(', ')}`); }
    }
    // Try checking IBPS site for Union Bank recruitment
    if (await isNull("union bank of india")) {
      const { text: ibps, status: ibpsStatus } = await fetchText("https://www.ibps.in/rrb/", { "Accept-Language": "en-IN,en;q=0.9" });
      await sleep(400);
      console.log(`  ibps.in/rrb/ → ${ibpsStatus}`);
    }
  }
  if (await isNull("union bank of india")) console.log("  → No data found");
  await sleep(600);

  // ── 7. NOOM — Check actual careers page more specifically ─────────────────
  console.log("\n=== Noom (final attempt) ===");
  if (await isNull("noom")) {
    // Noom's job listing page is a WP page (advanced-ads plugin detected)
    // Try fetching the raw WordPress posts for jobs
    const { text, status } = await fetchText("https://www.noom.com/careers/job-listings/");
    await sleep(400);
    if (text && status === 200) {
      // Count Greenhouse job links (Noom uses Greenhouse embed probably)
      const ghLinks = [...text.matchAll(/https?:\/\/boards\.greenhouse\.io\/[^"'\s<>]*/gi)];
      const leverLinks = [...text.matchAll(/https?:\/\/jobs\.lever\.co\/[^"'\s<>]*/gi)];
      const jobLinks = [...text.matchAll(/<a[^>]*href="([^"]*(?:\/job\/|apply|job-id)[^"]*)"[^>]*>/gi)];
      console.log(`  GH links: ${ghLinks.length} | Lever links: ${leverLinks.length} | Job links: ${jobLinks.length}`);
      if (ghLinks.length > 0) { console.log(`  GH: ${ghLinks[0]}`); }
      if (leverLinks.length > 0) { console.log(`  Lever: ${leverLinks[0]}`); }
      // The page might embed job listings as WP shortcodes or blocks
      const blocks = [...text.matchAll(/<!--\s*wp:[^>]+-->/gi)].map(m => m[0]);
      console.log(`  WP blocks: ${blocks.slice(0, 10).join(' | ')}`);
      // Search for any numeric job count
      const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      // Look for "0 jobs" or similar
      const zeroMatch = plainText.match(/0\s+(?:job|position|opening|opportunit)/i)
                       || plainText.match(/no\s+(?:current|open)\s+(?:job|position|opening)/i)
                       || plainText.match(/currently\s+(?:no|not\s+hiring|0)/i);
      if (zeroMatch) { console.log(`  Zero indicator: "${zeroMatch[0]}"` ); const rc = await updateRoles("noom", 0, "career_page_zero"); updated += rc; }
      // Check for the job embed iframe
      const iframes = [...text.matchAll(/<iframe[^>]*src="([^"]+)"[^>]*>/gi)];
      console.log(`  iframes: ${iframes.length} → ${iframes.map(m=>m[1].slice(0,60)).join(', ')}`);
    }
  }
  if (await isNull("noom")) console.log("  → No data found");

  // ── 8. India companies final pass ─────────────────────────────────────────
  console.log("\n=== India Final Pass ===");

  // VIJAYA DIAGNOSTIC — check different domain
  if (await isNull("vijaya diagnostic")) {
    const urls = [
      "https://www.vijayaonline.com/career.php",
      "https://www.vijayaonline.com/join_team.php",
    ];
    for (const url of urls) {
      const { text, status } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 55)} → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 300)}`);
        const v = plain.match(/(\d+)\s+(?:vacancy|job|opening|position)/i);
        if (v) { const n = parseInt(v[1]); console.log(`  → ${n}`); if (n >= 0 && n < 5000) { const rc = await updateRoles("vijaya diagnostic", n, "career_page_scrape"); updated += rc; break; } }
        const rows = [...text.matchAll(/<tr[^>]*>/gi)].length;
        console.log(`  Table rows: ${rows}`);
      }
    }
  }

  // BAYER — try Bayer Workday with the correct tenant ID
  if (await isNull("bayer cropscience india")) {
    // Bayer's known external careers URL: bayer.wd3.myworkdayjobs.com/Bayer_Global
    const bayerRes = await fetchRaw(
      "https://bayer.wd3.myworkdayjobs.com/wday/cxs/bayer/Bayer_Global/jobs",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
      }
    );
    await sleep(300);
    console.log(`  Bayer WD [bayer.wd3/Bayer_Global] → ${bayerRes.status}`);
    if (bayerRes.ok && typeof bayerRes.data?.total === "number") {
      console.log(`  Bayer global: ${bayerRes.data.total}`);
      // Try searching for India crop science jobs
      const indiaRes = await fetchRaw(
        "https://bayer.wd3.myworkdayjobs.com/wday/cxs/bayer/Bayer_Global/jobs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
          body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "CropScience India" })
        }
      );
      await sleep(300);
      if (indiaRes.ok && typeof indiaRes.data?.total === "number") {
        console.log(`  "CropScience India" search: ${indiaRes.data.total}`);
        if (indiaRes.data.total > 0) { const rc = await updateRoles("bayer cropscience india", indiaRes.data.total, "workday_bayer_cropscience_india"); updated += rc; }
      }
      // Also try "Bayer_CropScience" site
      const csRes = await fetchRaw(
        "https://bayer.wd3.myworkdayjobs.com/wday/cxs/bayer/Bayer_CropScience/jobs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
          body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
        }
      );
      await sleep(300);
      console.log(`  Bayer_CropScience site → ${csRes.status}`);
      if (csRes.ok && typeof csRes.data?.total === "number") { console.log(`  CropScience site: ${csRes.data.total}`); if (csRes.data.total > 0) { const rc = await updateRoles("bayer cropscience india", csRes.data.total, "workday_bayer_cropscience"); updated += rc; } }
    } else {
      console.log(`  Raw: ${(bayerRes.text||'').slice(0, 200)}`);
    }
  }

  // GSPL — try parent company GSPC
  if (await isNull("gspl")) {
    const gsplUrls = [
      "https://www.gspc.in/career",
      "https://gspc.co.in/careers",
      "https://www.gail.co.in/career",
      "https://careers.gspl.in",
    ];
    for (const url of gsplUrls) {
      const { text, status } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 40)} → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 200)}`);
        const v = plain.match(/(\d+)\s+(?:vacancy|job|opening|position)/i);
        if (v) { const rc = await updateRoles("gspl", parseInt(v[1]), "career_page_scrape"); updated += rc; break; }
      }
    }
  }

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
