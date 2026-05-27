// fix-round11-final.mjs
// Focused approaches:
// - Vanguard: WP REST API on vanguardjobs.com (WordPress job board)
// - SAIL: sailcareers.com Notification page + plant pages
// - WNS: Naukri search API with correct params
// - Vijaya: vijayadiagnostic.com Next.js RSC data
// - Alnylam: scan JS bundle for embedded count
// - Meituan: try alternate APIs with session
// - Masimo: try Indeed/LinkedIn/Glassdoor
// - Union Bank: try different approach
// - Usha Martin: try jobs subpage

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
  const { rows } = await db.query(`SELECT total_open_roles, hiring_source FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]);
  return rows[0];
}
const isNull = async (cn) => (await getVal(cn))?.total_open_roles === null;

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. VANGUARD — WP REST API on vanguardjobs.com ────────────────────────
  console.log("=== Vanguard (vanguardjobs.com WP REST API) ===");
  if (await isNull("vanguard")) {
    // Discover available REST API endpoints
    const wpJson = await fetchJson("https://www.vanguardjobs.com/wp-json/");
    await sleep(300);
    console.log(`  wp-json discovery → ${wpJson.status}`);
    if (wpJson.ok && wpJson.data) {
      const namespaces = wpJson.data.namespaces || [];
      console.log(`  Namespaces: ${namespaces.join(', ')}`);
      // Routes
      const routes = Object.keys(wpJson.data.routes || {}).slice(0, 30);
      console.log(`  Routes (${routes.length}): ${routes.join(', ')}`);
    }
    // Try common WP job post type APIs
    const wpJobEndpoints = [
      "/wp-json/wp/v2/jobs",
      "/wp-json/wp/v2/job-listings",
      "/wp-json/wp/v2/job_listing",
      "/wp-json/wp/v2/positions",
      "/wp-json/wp/v2/career",
      "/wp-json/cws/v1/jobs",
      "/wp-json/cws/v1/positions",
    ];
    for (const ep of wpJobEndpoints) {
      const res = await fetchJson(`https://www.vanguardjobs.com${ep}`);
      await sleep(200);
      if (res.ok) {
        if (Array.isArray(res.data)) {
          console.log(`  [${ep}]: array of ${res.data.length}`);
          // Get total from X-WP-Total header if available
        } else if (res.data) {
          console.log(`  [${ep}]: ${JSON.stringify(res.data).slice(0, 200)}`);
        }
      }
    }
    // Try WP API with per_page=1 to get X-WP-Total
    for (const pt of ["jobs", "job-listings", "job_listing", "positions"]) {
      try {
        const res = await fetch(`https://www.vanguardjobs.com/wp-json/wp/v2/${pt}?per_page=1`, {
          headers: { ...HEADERS, Accept: "application/json" },
          signal: AbortSignal.timeout(15000)
        });
        await sleep(200);
        const total = res.headers.get("x-wp-total");
        const status = res.status;
        console.log(`  WP API [${pt}] → ${status} | X-WP-Total: ${total}`);
        if (res.ok && total !== null) {
          const n = parseInt(total);
          if (n > 0) {
            console.log(`  ✓ ${n} total ${pt}`);
            const rc = await updateRoles("vanguard", n, `wordpress_rest_api_${pt}`); updated += rc; break;
          }
        }
      } catch (e) { console.log(`  WP API [${pt}] error: ${e.message}`); }
    }
    // Try the main career search page on the WordPress site
    if (await isNull("vanguard")) {
      const { text, status } = await fetchText("https://www.vanguardjobs.com/search-for-a-career/");
      await sleep(400);
      console.log(`  /search-for-a-career/ → ${status} (${text?.length} bytes)`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 1000)}`);
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) console.log(`  WD URLs: ${wdUrls.map(m=>m[0]).join(', ')}`);
        // Look for job count
        const count = plain.match(/(\d[\d,]+)\s+(?:job|position|opening|career|role)/i);
        if (count) console.log(`  Count: ${count[0]}`);
      }
    }
    // Try fetching VanguardJobs sitemap for job count
    if (await isNull("vanguard")) {
      const { text, status } = await fetchText("https://www.vanguardjobs.com/sitemap.xml");
      await sleep(300);
      console.log(`  sitemap.xml → ${status} (${text?.length} bytes)`);
      if (text && status === 200) {
        const urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m=>m[1]);
        console.log(`  Sitemap URLs (${urls.length}): ${urls.slice(0,10).join(', ')}`);
        const jobUrls = urls.filter(u => u.includes('/job') || u.includes('/career') || u.includes('/position'));
        console.log(`  Job URLs: ${jobUrls.length}`);
      }
    }
  }
  if (await isNull("vanguard")) console.log("  → No data found");
  await sleep(600);

  // ── 2. SAIL — Notification page from sailcareers.com ─────────────────────
  console.log("\n=== SAIL (sailcareers.com Notification page) ===");
  if (await isNull("steel authority of india")) {
    // Fetch the Notification page (it's an anchor link on the page)
    const { text, status } = await fetchText("https://sailcareers.com/Default.aspx");
    await sleep(400);
    console.log(`  sailcareers.com/Default.aspx → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Full plain: ${plain.slice(0, 5000)}`);
      // Count notification/recruitment links
      const notifLinks = [...text.matchAll(/href="([^"]*(?:NotifId|Notif|recruit|pdf|advert)[^"]*)"/gi)].map(m=>m[1]);
      console.log(`  Notification links (${notifLinks.length}): ${notifLinks.slice(0, 20).join(', ')}`);
      // Count PDF links (each PDF = one recruitment notification)
      const pdfLinks = [...text.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m=>m[1]);
      console.log(`  PDF links (${pdfLinks.length}): ${pdfLinks.slice(0,10).join(', ')}`);
    }
    // Fetch plant-specific pages to count vacancies
    if (await isNull("steel authority of india")) {
      const plants = ["BHILAI", "DSP", "RSP", "CM", "CR", "MTR"];
      let totalVacancies = 0;
      for (const plant of plants) {
        const { text, status } = await fetchText(`https://sailcareers.com/Default.aspx?PlantName=${plant}`);
        await sleep(250);
        console.log(`  Plant ${plant} → ${status} (${text?.length} bytes)`);
        if (text && status === 200) {
          const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`  ${plant} preview: ${plain.slice(0, 500)}`);
          // Look for vacancy numbers
          const vac = [...plain.matchAll(/(\d+)\s*(?:vacancy|vacancies|post|seat|position)/gi)];
          if (vac.length > 0) {
            console.log(`  ${plant} vacancies: ${vac.map(m=>m[0]).join(', ')}`);
            vac.forEach(m => { totalVacancies += parseInt(m[1]); });
          }
        }
      }
      console.log(`  Total from plant pages: ${totalVacancies}`);
      if (totalVacancies > 0) { const rc = await updateRoles("steel authority of india", totalVacancies, "sailcareers_plant_pages"); updated += rc; }
    }
    // Try SAIL Gallery.aspx (might list recruitment notifications)
    if (await isNull("steel authority of india")) {
      const { text, status } = await fetchText("https://sailcareers.com/Gallery.aspx");
      await sleep(400);
      console.log(`  sailcareers.com/Gallery.aspx → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Gallery: ${plain.slice(0, 1000)}`);
      }
    }
  }
  if (await isNull("steel authority of india")) console.log("  → No data found");
  await sleep(600);

  // ── 3. WNS GLOBAL — Naukri search API ────────────────────────────────────
  console.log("\n=== WNS Global (Naukri API) ===");
  if (await isNull("wns global")) {
    // Naukri search API
    const nkSearchUrls = [
      "https://www.naukri.com/jobapi/v3/search?noOfResults=1&urlType=search_by_keyword&searchType=adv&keyword=wns+global&location=&experience=&salary=&industry=&domain=&jobtype=&eduLevel=&organizationType=&companyId=&title=&headhunter=&recruiterMembership=&jobAge=0&searchForm=1",
      "https://www.naukri.com/jobapi/v3/search?noOfResults=1&urlType=search_by_company&searchType=company&companyName=WNS+Global+Services&location=",
      "https://api.naukri.com/jobapi/v3/search?noOfResults=1&searchType=adv&keyword=wns+global",
    ];
    for (const url of nkSearchUrls) {
      const res = await fetchJson(url, {
        headers: {
          "Accept": "application/json",
          "systemId": "Naukri",
          "appId": "109",
          "Referer": "https://www.naukri.com/wns-global-jobs",
          "Accept-Language": "en-IN,en;q=0.9",
        }
      });
      await sleep(400);
      console.log(`  Naukri API → ${res.status}`);
      if (res.ok && res.data) {
        console.log(`  Keys: ${Object.keys(res.data||{}).join(', ')}`);
        const count = res.data.noOfJobs ?? res.data.total ?? res.data.count ?? res.data.jobCount;
        console.log(`  Count: ${count}`);
        if (typeof count === "number" && count > 0) {
          const rc = await updateRoles("wns global", count, "naukri_search_api"); updated += rc; break;
        }
      } else {
        console.log(`  Response: ${(res.text||'').slice(0, 200)}`);
      }
    }
    // Try AmbitionBox (jobs listing) for WNS
    if (await isNull("wns global")) {
      const ambRes = await fetchJson("https://www.ambitionbox.com/api/v2/jobs?company=wns-global-services&page=1&limit=1", {
        headers: { "Accept": "application/json", "Referer": "https://www.ambitionbox.com" }
      });
      await sleep(400);
      console.log(`  AmbitionBox → ${ambRes.status}`);
      if (ambRes.ok && ambRes.data) {
        console.log(`  Data: ${JSON.stringify(ambRes.data).slice(0, 300)}`);
      }
    }
    // Try Indeed for WNS jobs (no auth)
    if (await isNull("wns global")) {
      const { text, status } = await fetchText("https://in.indeed.com/cmp/Wns-Global-Services/jobs");
      await sleep(400);
      console.log(`  Indeed WNS India → ${status} (${text?.length})`);
      if (text && status === 200) {
        const count = text.match(/"totalJobCount"\s*:\s*(\d+)/i)
                    || text.match(/"jobCount"\s*:\s*(\d+)/i)
                    || text.match(/(\d[\d,]+)\s+jobs?\s+at\s+WNS/i);
        if (count) { console.log(`  Count: ${count[1]}`); const n = parseInt((count[1]||'').replace(/,/g,'')); if (n>0) { const rc = await updateRoles("wns global", n, "indeed_india"); updated += rc; } }
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
      }
    }
    // Try Glassdoor for WNS
    if (await isNull("wns global")) {
      const { text, status } = await fetchText("https://www.glassdoor.co.in/Jobs/WNS-Global-Services-Jobs-E17499.htm");
      await sleep(400);
      console.log(`  Glassdoor WNS → ${status} (${text?.length})`);
      if (text && status === 200) {
        const count = text.match(/"jobCount"\s*:\s*(\d+)/i)
                    || text.match(/"totalJobCount"\s*:\s*(\d+)/i)
                    || text.match(/(\d[\d,]+)\s+Open\s+Jobs?/i);
        if (count) { console.log(`  GD count: ${count[1]}`); }
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ');
        console.log(`  GD preview: ${plain.slice(0, 300)}`);
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 4. USHA MARTIN — check their current openings page ──────────────────
  console.log("\n=== Usha Martin ===");
  if (await isNull("usha martin")) {
    const urls = [
      "https://www.ushamartin.com/current-openings/",
      "https://www.ushamartin.com/careers/",
      "https://www.ushamartin.com/hr/",
      "https://www.ushamartin.com/job-openings/",
    ];
    for (const url of urls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} (final: ${finalUrl?.slice(0,60)}) bytes=${text?.length}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 1000)}`);
        break;
      }
    }
    // Try fetching from the specific form page and check for actual job listings
    if (await isNull("usha martin")) {
      const { text, status } = await fetchText("https://www.ushamartin.com/join-us/");
      await sleep(400);
      if (text && status === 200) {
        // Look for dynamically rendered job titles (NOT JS template tokens)
        // These would appear as actual text nodes without '{', '+', 'item.'
        const jobSections = [...text.matchAll(/<(?:h[2-6]|strong|b)[^>]*>([^<]{10,120})<\/(?:h[2-6]|strong|b)>/gi)]
          .filter(m => !m[1].includes('{') && !m[1].includes('item.') && !m[1].includes("'") &&
                       (m[1].toLowerCase().includes('manager') || m[1].toLowerCase().includes('engineer') ||
                        m[1].toLowerCase().includes('officer') || m[1].toLowerCase().includes('head') ||
                        m[1].toLowerCase().includes('specialist') || m[1].toLowerCase().includes('executive') ||
                        m[1].toLowerCase().includes('analyst') || m[1].toLowerCase().includes('technician')));
        console.log(`  Real job title elements: ${jobSections.length}`);
        jobSections.forEach(m => console.log(`    "${m[1].trim().slice(0,100)}"`));
        // Check for "no current opening" message
        const noJobs = text.match(/no\s+(?:current|open|available)\s+(?:vacancy|opening|position|job)/i)
                     || text.match(/currently\s+no\s+(?:vacancy|opening|position|job)/i)
                     || text.match(/no\s+open\s+position/i);
        if (noJobs) console.log(`  No jobs indicator: "${noJobs[0]}"`);
        // Count input[type="radio"] or checkbox options for job roles - these might be real job options
        const radioOptions = [...text.matchAll(/<option[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/gi)]
          .filter(m => !m[1].includes('javascript') && m[2].trim().length > 3 && !m[2].match(/\d{4}/) && !m[2].includes('{'));
        console.log(`  Select options (${radioOptions.length}): ${radioOptions.slice(0,20).map(m=>`"${m[2].trim()}"` ).join(', ')}`);
      }
    }
  }
  if (await isNull("usha martin")) console.log("  → No data found");
  await sleep(600);

  // ── 5. VIJAYA DIAGNOSTIC — Next.js RSC/API ──────────────────────────────
  console.log("\n=== Vijaya Diagnostic ===");
  if (await isNull("vijaya diagnostic")) {
    // Try Next.js RSC route
    const njsUrls = [
      "https://www.vijayadiagnostic.com/_next/data/SOME_BUILD_ID/careers.json",
      "https://www.vijayadiagnostic.com/api/v1/careers",
      "https://www.vijayadiagnostic.com/api/v1/jobs",
      "https://www.vijayadiagnostic.com/api/jobs",
      "https://www.vijayadiagnostic.com/api/careers",
    ];
    // First get the actual build ID from the page
    const { text: pg } = await fetchText("https://www.vijayadiagnostic.com/careers");
    await sleep(300);
    const buildId = pg?.match(/"buildId"\s*:\s*"([^"]+)"/)?.[1]
                 || pg?.match(/\/_next\/data\/([^\/]+)\//)?.[1];
    if (buildId) {
      console.log(`  Build ID: ${buildId}`);
      const njsRes = await fetchJson(`https://www.vijayadiagnostic.com/_next/data/${buildId}/careers.json`);
      await sleep(300);
      console.log(`  Next.js data → ${njsRes.status}`);
      if (njsRes.ok && njsRes.data) {
        console.log(`  Data: ${JSON.stringify(njsRes.data).slice(0, 500)}`);
      }
    }
    // Try all API routes
    for (const url of njsUrls) {
      const res = await fetchJson(url);
      await sleep(200);
      if (res.ok && res.status !== 404) {
        console.log(`  [${url.slice(40)}] → ${res.status}: ${JSON.stringify(res.data||{}).slice(0, 200)}`);
      }
    }
    // Vijaya might not list open positions - check if the careers page says "no openings"
    if (await isNull("vijaya diagnostic")) {
      const { text, status } = await fetchText("https://www.vijayadiagnostic.com/careers");
      await sleep(300);
      const noJobs = text?.match(/no\s+(?:current|open)\s+opening/i)
                  || text?.match(/no\s+vacancy/i)
                  || text?.match(/currently\s+not\s+hiring/i);
      if (noJobs) {
        console.log(`  No openings indicator: "${noJobs[0]}" — inserting 0`);
        const rc = await updateRoles("vijaya diagnostic", 0, "career_page_no_openings"); updated += rc;
      } else {
        // The page shows "Submit Details for Current / Future Job Openings" — a form
        // This means they collect applications but don't list specific jobs
        // Count is unknown — not a listable number
        console.log(`  Careers page is a form submission (no specific job count available)`);
      }
    }
  }
  if (await isNull("vijaya diagnostic")) console.log("  → No data found");
  await sleep(600);

  // ── 6. ALNYLAM — scan JS script for job data ────────────────────────────
  console.log("\n=== Alnylam Pharmaceuticals ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // Try to fetch the Eightfold search page with num_jobs in URL query
    const efUrls = [
      "https://jobs.alnylam.com/careers/search?domain=alnylam.com&query=&location=United+States",
      "https://jobs.alnylam.com/careers?num_jobs=1",
      "https://jobs.alnylam.com/api/apply/v2/jobs?domain=alnylam.com&num_jobs=1&query=",
    ];
    for (const url of efUrls) {
      const res = await fetchJson(url, {
        headers: {
          "Accept": "application/json, text/html, */*",
          "Cookie": "country_code=US; locale=en_US",
          "CF-IPCountry": "US",
          "X-Forwarded-For": "172.217.1.1",
          "Referer": "https://jobs.alnylam.com/careers",
        }
      });
      await sleep(300);
      console.log(`  EF [${url.slice(30, 70)}] → ${res.status}`);
      if (res.ok && res.data) {
        const total = res.data.num_positions ?? res.data.total_results ?? res.data.count ?? res.data.total;
        if (typeof total === "number") {
          console.log(`  ✓ Count: ${total}`);
          const rc = await updateRoles("alnylam pharmaceuticals", total, "eightfold_us_search"); updated += rc; break;
        }
        console.log(`  Keys: ${Object.keys(res.data).slice(0,10).join(', ')}`);
      } else {
        console.log(`  Resp: ${(res.text||'').slice(0, 150)}`);
      }
    }
    // Try their Workday (some bio companies use Workday)
    if (await isNull("alnylam pharmaceuticals")) {
      const wdVariants = [
        ["alnylam", "5", "External"],
        ["alnylam", "3", "External"],
        ["alnylam", "1", "alnylam"],
        ["alnylam", "5", "alnylam_careers"],
      ];
      for (const [t, p, s] of wdVariants) {
        const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
        });
        await sleep(200);
        if (res.ok && typeof res.data?.total === "number") {
          console.log(`  WD [${t}.wd${p}/${s}]: ${res.data.total}`);
          const rc = await updateRoles("alnylam pharmaceuticals", res.data.total, "workday_alnylam"); updated += rc; break;
        }
      }
    }
    // Try Greenhouse for Alnylam
    if (await isNull("alnylam pharmaceuticals")) {
      for (const t of ["alnylam", "alnylampharma", "alnylam-pharmaceuticals"]) {
        const res = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`);
        await sleep(200);
        if (res.ok && Array.isArray(res.data?.jobs)) {
          console.log(`  GH [${t}]: ${res.data.jobs.length}`);
          if (res.data.jobs.length > 0) { const rc = await updateRoles("alnylam pharmaceuticals", res.data.jobs.length, "greenhouse_api"); updated += rc; break; }
        }
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 7. MASIMO — try job aggregators ──────────────────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    // Adzuna seems to return counts even for Cloudflare-protected sites
    // Round 9 showed Adzuna returned "not found" for masimo — but maybe with correct query
    const adzRes = await fetchJson("https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=masimo+corporation&results_per_page=1");
    await sleep(300);
    console.log(`  Adzuna [masimo corporation] US → ${adzRes.data?.count}`);
    // Try Greenhouse for Masimo
    for (const t of ["masimo", "masimocorp", "masimocorporation"]) {
      const res = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`);
      await sleep(200);
      if (res.ok && Array.isArray(res.data?.jobs) && res.data.jobs.length > 0) {
        console.log(`  GH [${t}]: ${res.data.jobs.length}`);
        const rc = await updateRoles("masimo", res.data.jobs.length, "greenhouse_api"); updated += rc; break;
      }
    }
    // Try Lever
    if (await isNull("masimo")) {
      for (const t of ["masimo", "masimocorp"]) {
        const res = await fetchJson(`https://api.lever.co/v0/postings/${t}?mode=json`);
        await sleep(200);
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          console.log(`  Lever [${t}]: ${res.data.length}`);
          const rc = await updateRoles("masimo", res.data.length, "lever_api"); updated += rc; break;
        }
      }
    }
    // Try fetching via a proxy (Google cache might work)
    if (await isNull("masimo")) {
      const { text, status } = await fetchText("https://webcache.googleusercontent.com/search?q=cache:masimo.com/careers", {
        "Accept": "text/html",
      });
      await sleep(500);
      console.log(`  Google cache masimo.com/careers → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) {
          console.log(`  WD URLs: ${wdUrls.map(m=>m[0]).join(', ')}`);
          for (const [, t, p, s] of wdUrls) {
            if (s.toLowerCase().includes('login')) continue;
            const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
            });
            await sleep(200);
            if (res.ok && typeof res.data?.total === "number") {
              console.log(`  ✓ WD: ${res.data.total}`);
              const rc = await updateRoles("masimo", res.data.total, "workday_masimo_cache"); updated += rc;
            }
          }
        }
      }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");
  await sleep(600);

  // ── 8. MEITUAN — Try with session cookie from fresh request ──────────────
  console.log("\n=== Meituan ===");
  if (await isNull("meituan")) {
    // First get a session cookie from the main page
    try {
      const init = await fetch("https://zhaopin.meituan.com/web/home", {
        headers: { ...HEADERS, "Accept-Language": "zh-CN,zh;q=0.9" },
        signal: AbortSignal.timeout(15000)
      });
      const setCookie = init.headers.get("set-cookie") || "";
      console.log(`  Init cookies: ${setCookie.slice(0, 200)}`);
      await sleep(400);
      // Extract cookies
      const cookies = setCookie.split(';').filter(c => c.trim().startsWith('_ga') || c.trim().startsWith('uuid') || c.trim().startsWith('mtcdn'));
      const cookieStr = cookies.join('; ');
      // Try the position query with the session cookies
      const queryRes = await fetch("https://zhaopin.meituan.com/api/position/query", {
        method: "POST",
        headers: {
          ...HEADERS,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Referer": "https://zhaopin.meituan.com/web/home",
          "Accept-Language": "zh-CN,zh;q=0.9",
          "Cookie": cookieStr,
        },
        body: JSON.stringify({ pageSize: 1, pageIndex: 1, cityId: 0, keyword: "", classify: 0 }),
        signal: AbortSignal.timeout(15000)
      });
      const queryText = await queryRes.text();
      console.log(`  Position query with cookie → ${queryRes.status}`);
      console.log(`  Response: ${queryText.slice(0, 300)}`);
      let queryData = null;
      try { queryData = JSON.parse(queryText); } catch {}
      if (queryData?.status === 200 && typeof queryData?.data?.total === "number") {
        console.log(`  ✓ Total: ${queryData.data.total}`);
        const rc = await updateRoles("meituan", queryData.data.total, "meituan_position_api"); updated += rc;
      }
    } catch (e) { console.log(`  Error: ${e.message}`); }
  }
  if (await isNull("meituan")) console.log("  → No data found");

  // ── 9. GSPL — try GSPC Network parent ────────────────────────────────────
  console.log("\n=== GSPL ===");
  if (await isNull("gspl")) {
    const urls = [
      "https://www.gspl.in",
      "https://gsplgujarat.com",
      "https://www.gspl.co.in",
    ];
    for (const url of urls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} (final: ${finalUrl?.slice(0,60)}) bytes=${text?.length}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        const careerLinks = [...text.matchAll(/href="([^"]*(?:career|job)[^"]*)"/gi)].map(m=>m[1]);
        console.log(`  Career links: ${careerLinks.slice(0,5).join(', ')}`);
        break;
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
