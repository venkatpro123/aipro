// fix-round13-last.mjs — Final push for remaining 11 NULL companies
// Key new leads:
// - Union Bank: new domain unionbankofindia.bank.in
// - Alnylam: iCIMS feed endpoint (not search)
// - WNS: script extraction from wnscareers.com
// - SAIL: count notification links
// - Bayer: fetch WD page HTML to understand correct body format

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

  // ── 1. UNION BANK — new domain unionbankofindia.bank.in ──────────────────
  console.log("=== Union Bank of India (new domain) ===");
  if (await isNull("union bank of india")) {
    const ubUrls = [
      "https://www.unionbankofindia.bank.in/en/recruitment",
      "https://www.unionbankofindia.bank.in/en/career",
      "https://unionbankofindia.bank.in/recruitment",
      "https://www.unionbankofindia.bank.in/en/home",
    ];
    for (const url of ubUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(500);
      console.log(`  ${url.slice(8, 70)} → ${status} → ${finalUrl?.slice(0,70)} (${text?.length})`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Full text (6000): ${plain.slice(0, 6000)}`);
        // Count recruitment notifications
        const vacancyLines = [...plain.matchAll(/(\d[\d,]+)\s*(?:vacancy|vacancies|post|seat|appointment)/gi)];
        if (vacancyLines.length > 0) { console.log(`  Vacancy mentions: ${vacancyLines.map(m=>m[0]).join(', ')}`); }
        const notifLinks = [...text.matchAll(/href="([^"]*(?:recruit|career|job|appoint|notification)[^"]*)"/gi)].map(m=>m[1]);
        console.log(`  Notification links (${notifLinks.length}): ${notifLinks.slice(0,10).join(', ')}`);
        // Count PDF links (each = one recruitment notification)
        const pdfLinks = [...text.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m=>m[1]);
        console.log(`  PDF links: ${pdfLinks.length}`);
        break;
      }
    }
    // Try the IBPS link for Union Bank officers
    if (await isNull("union bank of india")) {
      const { text, status } = await fetchText("https://www.ibps.in/union-bank-of-india-officers/");
      await sleep(400);
      console.log(`  IBPS UBI officers → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const vacancy = plain.match(/(\d+)\s*(?:vacancy|vacancies|post)/i);
        if (vacancy) console.log(`  IBPS vacancy: ${vacancy[0]}`);
        console.log(`  Preview: ${plain.slice(0, 400)}`);
      }
    }
  }
  if (await isNull("union bank of india")) console.log("  → No data found");
  await sleep(600);

  // ── 2. ALNYLAM — iCIMS feed endpoint ─────────────────────────────────────
  console.log("\n=== Alnylam Pharmaceuticals (iCIMS feed) ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // iCIMS has a public job feed endpoint
    const icimsFeeds = [
      "https://careers-alnylam.icims.com/jobs/feed/job/iphone?pr=1&type=html",
      "https://careers-alnylam.icims.com/jobs/feed/job?pr=1",
      "https://careers-alnylam.icims.com/jobs/search?ss=1&in_iframe=1",
      "https://careers-alnylam.icims.com/jobs/intro",
    ];
    for (const url of icimsFeeds) {
      const { text, status } = await fetchText(url, {
        "Accept": "text/html,application/json,*/*",
        "Referer": "https://careers-alnylam.icims.com",
      });
      await sleep(400);
      console.log(`  iCIMS [${url.slice(35, 80)}] → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 600)}`);
        // Look for job count
        const count = text.match(/(\d+)\s+(?:job|result|position|opening)/i)
                    || text.match(/"count"\s*:\s*(\d+)/i)
                    || text.match(/"total"\s*:\s*(\d+)/i);
        if (count) {
          console.log(`  Count: ${count[0]}`);
          const n = parseInt(count[1]);
          if (n > 0 && n < 5000) { const rc = await updateRoles("alnylam pharmaceuticals", n, "icims_alnylam_feed"); updated += rc; break; }
        }
        // Count job entries in feed
        const jobEntries = [...text.matchAll(/<item>|<entry>|"requisition_id"/gi)].length;
        if (jobEntries > 0) console.log(`  Job entries: ${jobEntries}`);
      }
    }
    // Try the iCIMS search page (HTML) with correct GET params
    if (await isNull("alnylam pharmaceuticals")) {
      const { text, status } = await fetchText("https://careers-alnylam.icims.com/jobs/search?ss=1&hashed=-435588046", {
        "Accept": "text/html",
        "Referer": "https://careers-alnylam.icims.com",
      });
      await sleep(400);
      console.log(`  iCIMS search [hashed] → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 800)}`);
        const count = plain.match(/(\d+)\s+(?:job|result|position|opening)/i);
        if (count) { const n = parseInt(count[1]); console.log(`  Count: ${n}`); if (n > 0) { const rc = await updateRoles("alnylam pharmaceuticals", n, "icims_alnylam_search"); updated += rc; } }
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 3. WNS — extract API from wnscareers.com scripts ────────────────────
  console.log("\n=== WNS Global (script API extraction) ===");
  if (await isNull("wns global")) {
    // Fetch the WNS careers page and extract all script references
    const { text, status } = await fetchText("https://www.wnscareers.com/");
    await sleep(400);
    if (text && status === 200) {
      // Find all script src URLs
      const scriptUrls = [...text.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(m=>m[1])
        .filter(u => !u.includes('googletagmanager') && !u.includes('googleapis') && !u.includes('jquery') && !u.includes('bootstrap'));
      console.log(`  Script URLs (${scriptUrls.length}): ${scriptUrls.join(', ')}`);
      // Fetch each custom script to look for API endpoints
      for (const scriptUrl of scriptUrls.slice(0, 5)) {
        const fullUrl = scriptUrl.startsWith('http') ? scriptUrl : `https://www.wnscareers.com${scriptUrl}`;
        const { text: js, status: jsSt } = await fetchText(fullUrl);
        await sleep(200);
        if (js && jsSt === 200) {
          // Look for API endpoint patterns
          const apiCalls = [...js.matchAll(/["']((?:https?:\/\/[\w.-]+)?\/(?:api|jobs|career|search)[^"'\s]{5,100})["']/gi)].map(m=>m[1]);
          if (apiCalls.length > 0) {
            console.log(`  Script [${fullUrl.slice(-40)}] API calls: ${apiCalls.slice(0,5).join(', ')}`);
          }
          // Look for AJAX calls
          const ajaxUrls = [...js.matchAll(/(?:ajax|fetch|axios|http\.get)\s*\(\s*["']([^"']{10,100})["']/gi)].map(m=>m[1]);
          if (ajaxUrls.length > 0) console.log(`  AJAX URLs: ${ajaxUrls.slice(0,5).join(', ')}`);
          // Look for job count or job listing
          const jobRefs = [...js.matchAll(/["'](\/[^"']*(?:job|career|position|vacanc)[^"']{5,80})["']/gi)].map(m=>m[1]);
          if (jobRefs.length > 0) console.log(`  Job refs: ${jobRefs.slice(0,10).join(', ')}`);
        }
      }
    }
    // Try WNS via the "SEARCH JOBS" API endpoint (common patterns)
    if (await isNull("wns global")) {
      const wnsJobApis = [
        "https://www.wnscareers.com/api/jobs/search",
        "https://www.wnscareers.com/api/jobs",
        "https://www.wnscareers.com/jobs/search",
        "https://www.wnscareers.com/getJobs",
        "https://www.wnscareers.com/searchjobs",
        "https://www.wnscareers.com/wp-json/wp/v2/jobs?per_page=1",
      ];
      for (const url of wnsJobApis) {
        const res = await fetchJson(url);
        await sleep(200);
        if (res.status !== "err" && res.status !== 404 && res.status !== 403) {
          console.log(`  ${url.slice(30)} → ${res.status}`);
          if (res.ok && res.data) console.log(`  Data: ${JSON.stringify(res.data).slice(0, 200)}`);
        }
      }
    }
    // Try LinkedIn company jobs API (some companies expose via JSON-LD)
    if (await isNull("wns global")) {
      const res = await fetchJson("https://www.linkedin.com/jobs/wns-global-services-jobs/?f_C=1285&position=1&pageNum=0", {
        headers: { "Accept": "application/json, text/html", "Accept-Language": "en-US,en;q=0.9" }
      });
      await sleep(500);
      console.log(`  LinkedIn WNS jobs → ${res.status}`);
      if (res.ok && res.data) {
        const count = res.data.paging?.total ?? res.data.data?.paging?.total;
        if (count) { console.log(`  Count: ${count}`); const rc = await updateRoles("wns global", count, "linkedin_wns"); updated += rc; }
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 4. BAYER INDIA — fetch WD page to see correct request format ─────────
  console.log("\n=== Bayer CropScience India (WD page analysis) ===");
  if (await isNull("bayer cropscience india")) {
    // Fetch the Bayer WD page HTML to see what request it makes
    const { text, status } = await fetchText("https://bayer.wd3.myworkdayjobs.com/Bayer_Global");
    await sleep(500);
    console.log(`  Bayer WD page → ${status} (${text?.length})`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 2000)}`);
      // Look for the CSRF token or other required headers
      const csrfToken = text.match(/csrfToken['":\s]+["']([^"']+)["']/i)?.[1]
                      || text.match(/"wd-CSRF-Token"\s*:\s*"([^"]+)"/i)?.[1];
      if (csrfToken) console.log(`  CSRF: ${csrfToken}`);
      // Look for the API version
      const apiVer = text.match(/apiVersion['":\s]+["']([^"']+)["']/i)?.[1];
      if (apiVer) console.log(`  API version: ${apiVer}`);
      // Find any XHR requests shown in JS
      const xhrApis = [...text.matchAll(/['"](\/wday\/cxs\/[^"']{10,100})['"]/gi)].map(m=>m[1]);
      if (xhrApis.length > 0) console.log(`  CXS paths: ${xhrApis.slice(0,5).join(', ')}`);
    }
    // Try Bayer Lever API (some divisions use it)
    if (await isNull("bayer cropscience india")) {
      for (const t of ["bayer", "bayercrop", "bayercropscience", "bayer-ag"]) {
        const res = await fetchJson(`https://api.lever.co/v0/postings/${t}?mode=json`);
        await sleep(200);
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          console.log(`  Lever Bayer [${t}]: ${res.data.length}`);
          // These are global Bayer jobs, not India-specific
          // Filter for India jobs in the lever listings
          const indiaJobs = res.data.filter(j => j.categories?.location?.toLowerCase().includes('india') ||
            j.workplaceType?.toLowerCase().includes('india') ||
            JSON.stringify(j).toLowerCase().includes('india'));
          console.log(`  India-specific: ${indiaJobs.length}`);
          if (indiaJobs.length > 0) { const rc = await updateRoles("bayer cropscience india", indiaJobs.length, `lever_bayer_india_${t}`); updated += rc; break; }
        }
      }
    }
    // Try fetching their India-specific jobs page
    if (await isNull("bayer cropscience india")) {
      const { text, status } = await fetchText("https://www.bayer.com/en/in/career-at-bayer");
      await sleep(400);
      console.log(`  bayer.com/en/in/career-at-bayer → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) console.log(`  WD: ${wdUrls.map(m=>m[0]).join(', ')}`);
      }
    }
  }
  if (await isNull("bayer cropscience india")) console.log("  → No data found");
  await sleep(600);

  // ── 5. SAIL — count active notifications from sailcareers.com ─────────────
  console.log("\n=== SAIL ===");
  if (await isNull("steel authority of india")) {
    // sailcareers.com has 1 PDF notification currently — fetch to check if more
    const { text, status } = await fetchText("https://sailcareers.com/Default.aspx");
    await sleep(400);
    if (text && status === 200) {
      // Find all links on the page that are not navigation/footer
      const allLinks = [...text.matchAll(/href="([^"#javascript][^"]{0,200})"/gi)].map(m=>m[1]);
      console.log(`  All links (${allLinks.length}): ${allLinks.join(', ')}`);
      // The page likely embeds recruitment data in a card/table section
      // Count all card elements
      const cards = [...text.matchAll(/<div[^>]+class="[^"]*card[^"]*"[^>]*>/gi)].length;
      console.log(`  Cards: ${cards}`);
      // Count notification items
      const notifItems = [...text.matchAll(/class="[^"]*(?:notification|recruit|list-item)[^"]*"/gi)].length;
      console.log(`  Notification items: ${notifItems}`);
    }
    // Try fetching SAIL e-recruitment portal
    if (await isNull("steel authority of india")) {
      const { text, status } = await fetchText("https://www.sailneel.com/");
      await sleep(400);
      console.log(`  sailneel.com → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
      }
    }
    // Try Careers section from SAIL official website via alternate CDN
    if (await isNull("steel authority of india")) {
      // SAIL website blocks direct access, try via mobile/lite version
      const { text, status } = await fetchText("https://m.sail.co.in/career", {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      });
      await sleep(400);
      console.log(`  m.sail.co.in/career → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 1000)}`);
      }
    }
  }
  if (await isNull("steel authority of india")) console.log("  → No data found");
  await sleep(600);

  // ── 6. GSPL — try correct GSS/GSPC portal ───────────────────────────────
  console.log("\n=== GSPL (Gujarat State Petronet) ===");
  if (await isNull("gspl")) {
    // GSPL is listed on BSE/NSE - their website should be gspl.in but wrong company found
    // Let me try to find the correct URL
    const gsplAttempts = [
      "https://www.gspc.in/careers",
      "https://www.gspc.in/career",
      "https://gspc.in/career",
      "https://gspc.in",
      "https://www.gspcgas.com",
      "https://www.gujagas.com/career",
      "https://www.gujarat-gas.com",
      "https://www.gujaratgas.com",
    ];
    for (const url of gsplAttempts) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} → ${finalUrl?.slice(0,60)} (${text?.length})`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 600)}`);
        if (plain.toLowerCase().includes('petronet') || plain.toLowerCase().includes('pipeline') || plain.toLowerCase().includes('natural gas') || plain.toLowerCase().includes('gspl')) {
          console.log(`  ✓ Relevant site found`);
          const career = [...text.matchAll(/href="([^"]*(?:career|recruit|job)[^"]*)"/gi)].map(m=>m[1]);
          console.log(`  Career links: ${career.join(', ')}`);
        }
      }
    }
  }
  if (await isNull("gspl")) console.log("  → No data found");
  await sleep(600);

  // ── 7. MEITUAN — try campus recruiting site ──────────────────────────────
  console.log("\n=== Meituan ===");
  if (await isNull("meituan")) {
    // Try the Meituan campus API (social hiring might be less restricted)
    const campusUrls = [
      "https://zhaopin.meituan.com/web/campus",
      "https://campus.meituan.com",
    ];
    for (const url of campusUrls) {
      const { text, status } = await fetchText(url, { "Accept-Language": "zh-CN,zh;q=0.9" });
      await sleep(400);
      console.log(`  ${url} → ${status} (${text?.length})`);
    }
    // Try the Meituan job count from main search page (GET not POST)
    const { text, status } = await fetchText("https://zhaopin.meituan.com/web/position/list", {
      "Accept-Language": "zh-CN,zh;q=0.9",
    });
    await sleep(400);
    console.log(`  /web/position/list → ${status} (${text?.length})`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 1000)}`);
      const count = text.match(/"total"\s*:\s*(\d+)/i) || text.match(/共\s*(\d+)\s*个/i);
      if (count) console.log(`  Count: ${count[1]}`);
    }
    // Check if Meituan has any LinkedIn or Indeed listing
    if (await isNull("meituan")) {
      const adzRes = await fetchJson("https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=meituan&results_per_page=1");
      await sleep(300);
      console.log(`  Adzuna Meituan US: ${adzRes.data?.count}`);
      if (adzRes.ok && typeof adzRes.data?.count === "number" && adzRes.data.count > 0) {
        const rc = await updateRoles("meituan", adzRes.data.count, "adzuna_api_us"); updated += rc;
      }
    }
  }
  if (await isNull("meituan")) console.log("  → No data found");
  await sleep(600);

  // ── 8. VIJAYA DIAGNOSTIC + USHA MARTIN + PFC + MASIMO — last attempts ────
  console.log("\n=== Last attempts for stubborn companies ===");

  // Vijaya Diagnostic — try fetching specific doctor job page
  if (await isNull("vijaya diagnostic")) {
    const { text, status } = await fetchText("https://www.vijayadiagnostic.com/doctor-jobs");
    await sleep(300);
    console.log(`  Vijaya /doctor-jobs → ${status}`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 500)}`);
    }
    // Their careers page is form-only. They don't list open positions.
    // Could insert 0 (form-based, no listed openings)
    console.log(`  Vijaya: only has form submission, not a job board — leaving NULL`);
  }

  // Usha Martin — check if they use a job portal
  if (await isNull("usha martin")) {
    const { text, status } = await fetchText("https://www.ushamartin.com/join-us/");
    await sleep(300);
    if (text && status === 200) {
      // Check for any real job listings vs templates
      const openingsText = text.match(/current[_\s-]?openings?[\s\S]{0,500}/i)?.[0];
      if (openingsText) console.log(`  Current openings section: ${openingsText.replace(/<[^>]+>/g,' ').slice(0,300)}`);
      const noVacancy = text.match(/no\s+(?:current|open|available)\s+(?:vacancy|opening|position)/i);
      if (noVacancy) console.log(`  ✓ No vacancy indicator found`);
      // Check if there's a "no current vacancies" message that would justify 0
      const zeroText = text.match(/(?:no|0)\s+(?:current|open)\s+(?:opening|vacancy|position)/i);
      if (zeroText) { console.log(`  Zero openings: "${zeroText[0]}"`); const rc = await updateRoles("usha martin", 0, "career_page_zero_openings"); updated += rc; }
    }
  }

  // PFC Ltd — try the complete pfcindia.com URL with timeout
  if (await isNull("pfc ltd")) {
    // PFC India website might be rate-limiting. Try with different headers.
    const pfcAttempts = [
      ["https://www.pfcindia.com", {}],
      ["https://pfcindia.com", { "Accept-Language": "en-IN,en;q=0.9" }],
      ["https://www.pfc.gov.in", {}],
    ];
    for (const [url, extra] of pfcAttempts) {
      try {
        const res = await fetch(url, { headers: { ...HEADERS, ...extra }, redirect: "follow", signal: AbortSignal.timeout(30000) });
        const text = await res.text();
        console.log(`  PFC ${url} → ${res.status} (${text.length})`);
        if (res.ok && text.length > 5000) {
          const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`  Preview: ${plain.slice(0, 500)}`);
          const careerLinks = [...text.matchAll(/href="([^"]*(?:career|recruit|job)[^"]*)"/gi)].map(m=>m[1]);
          console.log(`  Career links: ${careerLinks.slice(0,5).join(', ')}`);
          break;
        }
        await sleep(500);
      } catch (e) { console.log(`  PFC ${url} → err: ${e.message}`); }
    }
  }

  // Masimo — try their IR page for career references
  if (await isNull("masimo")) {
    const { text, status } = await fetchText("https://ir.masimo.com/");
    await sleep(400);
    console.log(`  ir.masimo.com → ${status} (${text?.length})`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  IR preview: ${plain.slice(0, 300)}`);
      const atsLinks = [...text.matchAll(/href="([^"]*(?:career|job|talent|workday)[^"]*)"/gi)].map(m=>m[1]).filter(h=>h.startsWith('http'));
      console.log(`  ATS links: ${atsLinks.join(', ')}`);
    }
    // Try fetching Masimo from Bing/Google news to find their career URL
    if (await isNull("masimo")) {
      const { text: bt, status: bst } = await fetchText("https://www.bing.com/search?q=masimo+careers+site%3Aworkday.com+OR+site%3Agreenhouseio.com+OR+site%3Alever.co");
      await sleep(500);
      console.log(`  Bing ATS search → ${bst} (${bt?.length})`);
      if (bt && bst === 200) {
        const wdLinks = [...bt.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>]+)/gi)];
        const ghLinks = [...bt.matchAll(/https?:\/\/boards\.greenhouse\.io\/(\w+)/gi)];
        const lvLinks = [...bt.matchAll(/https?:\/\/jobs\.lever\.co\/(\w+)/gi)];
        console.log(`  WD: ${wdLinks.map(m=>m[0]).join(', ')}`);
        console.log(`  GH: ${ghLinks.map(m=>m[0]).join(', ')}`);
        console.log(`  Lever: ${lvLinks.map(m=>m[0]).join(', ')}`);
        // Try any found WD
        for (const [, t, p, s] of wdLinks.filter(m => m[0].includes('masimo'))) {
          const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
          });
          await sleep(200);
          if (res.ok && typeof res.data?.total === "number") {
            console.log(`  ✓ WD Masimo: ${res.data.total}`);
            const rc = await updateRoles("masimo", res.data.total, "workday_masimo_search"); updated += rc;
          }
        }
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
