// fix-round7-cleanup.mjs
// 1. Revert Usha Martin (30 = department dropdown, not jobs)
// 2. Verify and handle Noom's "1" claim
// 3. WNS wnscareers.com SPA config extraction
// 4. Alnylam with US IP headers to bypass geolocation
// 5. Vanguard through WP API with correct post type

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
  "X-Real-IP": "172.217.1.1",
  "Forwarded": "for=172.217.1.1",
};

async function fetchText(url, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS_US, ...extraHeaders },
      redirect: "follow",
      signal: AbortSignal.timeout(20000)
    });
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text() };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function fetchRaw(url, opts = {}) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), ...opts });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, text, data, ct: res.headers.get('content-type') || '', headers: res.headers };
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

async function revertFalse(cn) {
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence SET total_open_roles = NULL, hiring_source = NULL,
     hiring_verified_at = NULL, hiring_confidence = NULL, hiring_velocity_score = NULL, updated_at = NOW()
     WHERE canonical_name = $1`,
    [cn]
  );
  return rowCount ?? 0;
}

async function isNull(cn) {
  const { rows } = await db.query(`SELECT total_open_roles, hiring_source FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]);
  return rows[0]?.total_open_roles === null || rows[0]?.total_open_roles === undefined;
}

async function tryWorkday(tenant, site, pod) {
  const res = await fetchRaw(
    `https://${tenant}.wd${pod}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
    }
  );
  return (res.ok && typeof res.data?.total === "number") ? res.data.total : null;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 0. REVERT FALSE DATA ─────────────────────────────────────────────────
  console.log("=== Reverting false Usha Martin data ===");
  // 30 was from form dropdown options (departments like Accounts, HR, IT...)
  // These are APPLICATION FORM departments, not job openings
  const ur = await revertFalse("usha martin");
  console.log(`  Usha Martin reverted: ${ur} rows (30 = department dropdown, not job listings)`);
  await sleep(300);

  // ── 1. NOOM — Verify the "1" count ───────────────────────────────────────
  console.log("\n=== Noom — Verifying count ===");
  const { text: noomText, status: noomStatus } = await fetchText("https://www.noom.com/careers/job-listings/");
  await sleep(400);
  console.log(`  noom.com/careers/job-listings/ → ${noomStatus}`);
  if (noomText && noomStatus === 200) {
    // Show more of the page to understand what "1" matched
    const plain = noomText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log(`  Full plain text (2000 chars): ${plain.slice(0, 2000)}`);
    // Check if there's structured job posting data
    const jsonLdBlocks = [...noomText.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const jl of jsonLdBlocks) {
      try {
        const d = JSON.parse(jl[1]);
        console.log(`  JSON-LD type: ${d['@type'] || JSON.stringify(d).slice(0, 100)}`);
        if (d['@graph']) {
          for (const item of d['@graph']) {
            console.log(`    Graph item: @type=${item['@type']}`);
          }
        }
      } catch (e) { console.log(`  JSON-LD parse error: ${e.message}`); }
    }
    // Check if there are actual job posting elements in the HTML
    const jobPostings = [...noomText.matchAll(/JobPosting|job-listing|job-card|gh-link|lever-job/gi)].length;
    console.log(`  Job posting indicators: ${jobPostings}`);
    // What matched "1"?
    const allMatches = [...noomText.matchAll(/(\d+)\s+(?:open\s+)?(?:position|job|opportunit|role)/gi)];
    console.log(`  All count matches: ${allMatches.map(m => `"${m[0]}"`).join(', ')}`);
    // The current DB value for Noom:
    const { rows } = await db.query(`SELECT total_open_roles, hiring_source FROM verified_company_intelligence WHERE canonical_name = 'noom'`);
    console.log(`  Current DB: ${rows[0]?.total_open_roles} | source: ${rows[0]?.hiring_source}`);
    // If the 1 was from "position":"1" in breadcrumb JSON-LD, we should revert
    // Check: does the plain text contain "1 position" or "1 job"?
    const realMatch = plain.match(/\b1\s+(?:open\s+)?(?:position|job|opportunit|role)\b/i);
    if (realMatch) {
      console.log(`  ✓ Real match found: "${realMatch[0]}" — keeping count=1`);
    } else {
      console.log(`  ✗ No real job count match — reverting Noom`);
      const nr = await revertFalse("noom");
      console.log(`  Noom reverted: ${nr} rows`);
    }
  }
  await sleep(600);

  // ── 2. WNS GLOBAL — SPA config extraction ────────────────────────────────
  console.log("\n=== WNS Global (SPA deep extract) ===");
  if (await isNull("wns global")) {
    const { text, status } = await fetchText("https://www.wnscareers.com/");
    await sleep(400);
    console.log(`  wnscareers.com → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      // Find script sources for job data
      const scriptSrcs = [...text.matchAll(/<script[^>]*src="([^"]+)"/gi)].map(m => m[1]);
      const apiHints = scriptSrcs.filter(s => s.includes('api') || s.includes('jobs') || s.includes('career'));
      console.log(`  API-related scripts: ${apiHints.join(', ')}`);
      // Look for embedded job data in __NEXT_DATA__ or similar
      const nextData = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i);
      if (nextData) {
        try {
          const d = JSON.parse(nextData[1]);
          console.log(`  Next.js data props: ${JSON.stringify(d?.props || {}).slice(0, 500)}`);
          // Look for job count in the data
          const jobCount = JSON.stringify(d).match(/"(?:total|count|totalJobs|totalCount)"\s*:\s*(\d+)/);
          if (jobCount) { console.log(`  → Jobs from Next data: ${jobCount[1]}`); const rc = await updateRoles("wns global", parseInt(jobCount[1]), "wnscareers_next_data"); updated += rc; }
        } catch {}
      }
      // Find any embedded config
      const configMatch = text.match(/window\.__(?:CONFIG|APP_CONFIG|INITIAL_STATE|DATA)__\s*=\s*({[\s\S]{0,2000}})/i);
      if (configMatch) { console.log(`  Config: ${configMatch[0].slice(0, 300)}`); }
      // Find API endpoints in inline scripts
      const inlineScripts = [...text.matchAll(/<script(?!.*src)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
      for (const script of inlineScripts) {
        const apiUrl = script.match(/(?:apiUrl|apiBase|jobsApi|careersApi)\s*[:=]\s*["']([^"']+)["']/i)?.[1];
        if (apiUrl) { console.log(`  API URL in script: ${apiUrl}`); break; }
        // Look for fetch/axios calls to job APIs
        const fetchCalls = [...script.matchAll(/fetch\s*\(\s*["']([^"']+jobs[^"']+)["']/gi)].map(m => m[1]);
        if (fetchCalls.length > 0) { console.log(`  Fetch calls: ${fetchCalls.join(', ')}`); break; }
      }
      // Try to extract count from visible text
      const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const countMatch = plainText.match(/(\d[\d,]+)\s+(?:job|position|opportunit|opening|result|role)/i);
      if (countMatch) {
        const n = parseInt(countMatch[1].replace(/,/g, ''));
        console.log(`  Count from text: ${n}`);
        if (n > 0 && n < 100000) { const rc = await updateRoles("wns global", n, "wnscareers_text"); updated += rc; }
      }
    }
    // Try WNS Ashby
    if (await isNull("wns global")) {
      for (const t of ["wns", "wnsglobal", "wns-global"]) {
        const r = await fetchRaw(`https://api.ashbyhq.com/posting-api/job-board/${t}`); await sleep(200);
        if (r.ok && Array.isArray(r.data?.jobPostings)) { console.log(`  Ashby [${t}]: ${r.data.jobPostings.length}`); const rc = await updateRoles("wns global", r.data.jobPostings.length, "ashby_api"); updated += rc; break; }
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 3. ALNYLAM — US IP headers to bypass geolocation ─────────────────────
  console.log("\n=== Alnylam Pharmaceuticals (US IP spoofing) ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // The career page shows window.COUNTRY_CODE = "IN" — geolocation is set server-side
    // Try with X-Forwarded-For and CF-IPCountry = US
    const { text, status } = await fetchText("https://jobs.alnylam.com/careers", {
      Cookie: "country_code=US; locale=en_US; geo_country=US",
      "CF-IPCountry": "US",
      "X-Forwarded-For": "172.217.1.1",
      "Accept-Language": "en-US,en;q=0.9"
    });
    await sleep(400);
    console.log(`  jobs.alnylam.com/careers [with US headers] → ${status}`);
    if (text && status === 200) {
      const countryCode = text.match(/window\.COUNTRY_CODE\s*=\s*["']([^"']+)["']/)?.[1];
      console.log(`  COUNTRY_CODE in response: ${countryCode}`);
      // Look for job count
      const countMatch = text.match(/"num_positions"\s*:\s*(\d+)/)
                        || text.match(/"total_results"\s*:\s*(\d+)/)
                        || text.match(/"total"\s*:\s*(\d+)/);
      if (countMatch) { console.log(`  Count: ${countMatch[1]}`); const rc = await updateRoles("alnylam pharmaceuticals", parseInt(countMatch[1]), "eightfold_us"); updated += rc; }
    }
    // Try the Eightfold API with US IP and CORS
    if (await isNull("alnylam pharmaceuticals")) {
      const efRes = await fetchRaw(
        "https://jobs.alnylam.com/api/apply/v2/jobs?num_jobs=1&query=&country=US",
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Referer: "https://jobs.alnylam.com/careers",
            "X-Forwarded-For": "172.217.1.1",
            "CF-IPCountry": "US",
            "Origin": "https://jobs.alnylam.com",
          }
        }
      );
      await sleep(300);
      console.log(`  EF API [country=US] → ${efRes.status}`);
      console.log(`  Raw: ${(efRes.text || '').slice(0, 300)}`);
      if (efRes.ok && efRes.data) {
        const total = efRes.data.num_positions ?? efRes.data.total ?? efRes.data.count;
        if (total !== undefined) { console.log(`  → ${total}`); const rc = await updateRoles("alnylam pharmaceuticals", total, "eightfold_api_us"); updated += rc; }
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 4. VANGUARD — Try WP REST API with correct post type ─────────────────
  console.log("\n=== Vanguard ===");
  if (await isNull("vanguard")) {
    // Try WP REST API with job_listing as the post type
    const wpPaths = [
      "https://www.vanguardjobs.com/wp-json/wp/v2/job_listing?per_page=100&_fields=id,title",
      "https://www.vanguardjobs.com/wp-json/wp/v2/job-listing?per_page=100&_fields=id",
    ];
    for (const url of wpPaths) {
      const res = await fetchRaw(url, { headers: { Accept: "application/json" } });
      await sleep(300);
      const total = res.headers.get?.("X-WP-Total");
      console.log(`  ${url.slice(8, 60)} → ${res.status} | X-WP-Total: ${total}`);
      if (total && parseInt(total) >= 0) { console.log(`  → ${total} job listings`); const rc = await updateRoles("vanguard", parseInt(total), "wp_job_listing_api"); updated += rc; break; }
      if (res.ok && Array.isArray(res.data)) { console.log(`  Array: ${res.data.length}`); if (res.data.length > 0) { const rc = await updateRoles("vanguard", res.data.length, "wp_job_listing_api"); updated += rc; break; } }
    }
    // The WP site's search page showed Job cards: 2 in a previous scan
    // Let's directly fetch /careers/ or /jobs/ page on vanguardjobs.com
    if (await isNull("vanguard")) {
      const { text, status } = await fetchText("https://www.vanguardjobs.com/jobs/");
      await sleep(300);
      console.log(`  vanguardjobs.com/jobs/ → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        const jobCards = [...text.matchAll(/class="[^"]*job[_-]listing[^"]*"/gi)].length;
        console.log(`  Job listing classes: ${jobCards}`);
      }
    }
    // Fetch Vanguard main jobs page (not blog)
    if (await isNull("vanguard")) {
      const { text, status } = await fetchText("https://www.vanguardjobs.com/"); await sleep(300);
      console.log(`  vanguardjobs.com/ → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        // Look for the actual job listing section
        const jobSection = plain.match(/\d+\s+(?:job|position|role|opening)/i);
        if (jobSection) console.log(`  Job count hint: ${jobSection[0]}`);
        // Count job listing HTML elements
        const jobItems = [...text.matchAll(/<div[^>]*class="[^"]*job[_-](?:listing|card|item)[^"]*"/gi)].length;
        console.log(`  Job listing divs: ${jobItems}`);
        if (jobItems > 0 && jobItems < 5000) { const rc = await updateRoles("vanguard", jobItems, "wp_job_listing_parse"); updated += rc; }
      }
    }
    // Vanguard might use iCIMS or Taleo
    if (await isNull("vanguard")) {
      const vangWd = [
        ["vanguard", "3", "External"], ["vanguard", "1", "External"],
        ["vanguardgroup", "1", "External"], ["vanguardgroup", "3", "External"],
        ["vanguard", "3", "vanguard_careers"], ["vanguard", "1", "vanguard_careers"],
      ];
      for (const [t, p, s] of vangWd) {
        const c = await tryWorkday(t, s, p); await sleep(200);
        if (c !== null) { console.log(`  WD [${t}.wd${p}/${s}]: ${c}`); const rc = await updateRoles("vanguard", c, "workday_careers"); updated += rc; break; }
      }
    }
  }
  if (await isNull("vanguard")) console.log("  → No data found");
  await sleep(600);

  // ── 5. USHA MARTIN — Try their current-openings page directly ────────────
  console.log("\n=== Usha Martin ===");
  if (await isNull("usha martin")) {
    // Try fetching their jobs via form submission or look for specific job section
    const { text, status } = await fetchText("https://www.ushamartin.com/career/");
    await sleep(400);
    if (text && status === 200) {
      // Look at all <select> elements to understand the form structure
      const selects = [...text.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)];
      console.log(`  Select elements: ${selects.length}`);
      for (const sel of selects) {
        const options = [...sel[2].matchAll(/<option[^>]*value="([^"]+)"[^>]*>([^<]*)<\/option>/gi)].map(m => `${m[1]}:${m[2].trim()}`);
        console.log(`  [${sel[1]}]: ${options.slice(0, 5).join(', ')}...`);
      }
      // Look for the actual job listing - maybe it's in a table
      const trs = [...text.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      const jobTrs = trs.filter(tr => {
        const content = tr[1].replace(/<[^>]+>/g, ' ').trim();
        return content.length > 20 && !content.toLowerCase().includes('th ') && !content.toLowerCase().includes('header');
      });
      console.log(`  Data table rows: ${jobTrs.length}`);
      for (const tr of jobTrs.slice(0, 5)) {
        console.log(`    ${tr[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)}`);
      }
      // Try the form submission to list current openings
      const formAction = text.match(/<form[^>]*action="([^"]+)"/i)?.[1];
      console.log(`  Form action: ${formAction}`);
    }
    // Try fetching with POST to get current openings
    if (await isNull("usha martin")) {
      const res = await fetchRaw("https://www.ushamartin.com/career/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...HEADERS_US },
        body: "category=&experience=&location=&submit=Search"
      });
      await sleep(400);
      console.log(`  POST /career/ → ${res.status}`);
      if (res.ok && res.text) {
        const plain = res.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  POST preview: ${plain.slice(0, 300)}`);
        const v = plain.match(/(\d+)\s+(?:vacancy|vacancies|job|opening|result)/i);
        if (v) { const n = parseInt(v[1]); if (n >= 0 && n < 1000) { const rc = await updateRoles("usha martin", n, "career_page_post"); updated += rc; } }
      }
    }
  }
  if (await isNull("usha martin")) console.log("  → No data found");
  await sleep(600);

  // ── 6. VIJAYA DIAGNOSTIC — Deep parse the SPA page ───────────────────────
  console.log("\n=== Vijaya Diagnostic ===");
  if (await isNull("vijaya diagnostic")) {
    const { text, status } = await fetchText("https://www.vijayadiagnostic.com/careers");
    await sleep(400);
    if (text && status === 200) {
      // This is a Next.js SPA. Look for __NEXT_DATA__ with actual build ID
      const buildId = text.match(/"buildId"\s*:\s*"([^"]+)"/)?.[1];
      console.log(`  Next.js buildId: ${buildId}`);
      if (buildId) {
        // Try fetching the page data with the correct build ID
        const nextDataUrl = `https://www.vijayadiagnostic.com/_next/data/${buildId}/careers.json`;
        const res = await fetchRaw(nextDataUrl, { headers: { Accept: "application/json" } });
        await sleep(300);
        console.log(`  Next data [${buildId}] → ${res.status}`);
        if (res.ok && res.data) {
          const jobs = res.data?.pageProps?.jobs ?? res.data?.pageProps?.openings ?? res.data?.pageProps?.careers;
          if (Array.isArray(jobs)) { console.log(`  Jobs: ${jobs.length}`); const rc = await updateRoles("vijaya diagnostic", jobs.length, "nextjs_page_data"); updated += rc; }
          else { console.log(`  PageProps: ${JSON.stringify(res.data?.pageProps || {}).slice(0, 300)}`); }
        }
      }
      // Look for inline job data
      const inlineData = text.match(/window\.__NEXT_DATA__\s*=\s*({[\s\S]+?})<\/script>/i)
                        || text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i);
      if (inlineData) {
        try {
          const d = JSON.parse(inlineData[1]);
          console.log(`  Inline Next data keys: ${Object.keys(d || {}).join(', ')}`);
          const props = d?.props?.pageProps;
          if (props) {
            console.log(`  PageProps keys: ${Object.keys(props).join(', ')}`);
            const count = props.total ?? props.count ?? props.totalJobs ?? (Array.isArray(props.jobs) ? props.jobs.length : null);
            if (count !== null && count !== undefined) { console.log(`  → ${count}`); const rc = await updateRoles("vijaya diagnostic", count, "nextjs_inline_data"); updated += rc; }
          }
        } catch (e) { console.log(`  JSON parse error: ${e.message}`); }
      }
    }
  }
  if (await isNull("vijaya diagnostic")) console.log("  → No data found");
  await sleep(600);

  // ── 7. MASIMO — Check sitemap for career URL ──────────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    // Masimo's main site blocks via Cloudflare. Try their sitemap to find career links.
    const { text, status } = await fetchText("https://www.masimo.com/sitemap.xml");
    await sleep(400);
    console.log(`  masimo.com/sitemap.xml → ${status}`);
    if (text && status === 200) {
      const careerUrls = [...text.matchAll(/<loc>([^<]*career[^<]*)<\/loc>/gi)].map(m => m[1]);
      console.log(`  Career URLs: ${careerUrls.join(', ')}`);
    }
    // Try their investor relations page
    const { text: ir, status: irStatus } = await fetchText("https://ir.masimo.com/overview/default.aspx");
    await sleep(400);
    console.log(`  ir.masimo.com → ${irStatus} (${ir?.length} bytes)`);
    if (ir && irStatus === 200) {
      const careerLinks = [...ir.matchAll(/href="([^"]*career[^"]*)"/gi)].map(m => m[1]);
      console.log(`  Career links in IR: ${careerLinks.slice(0, 3).join(', ')}`);
      const atsLinks = [...ir.matchAll(/href="([^"]*(?:greenhouse|lever|workday|icims|taleo)[^"]*)"/gi)].map(m => m[1]);
      console.log(`  ATS links in IR: ${atsLinks.slice(0, 3).join(', ')}`);
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");
  await sleep(600);

  // ── 8. QLIK — Try Cloud Software Group site directly ─────────────────────
  console.log("\n=== Qlik ===");
  if (await isNull("qlik")) {
    // Cloud Software Group (Qlik's parent after acquisition) might have careers
    const csgUrls = [
      "https://www.cloudsoftwaregroup.com",
      "https://cloudsoftwaregroup.com/careers",
      "https://careers.cloud.com", // might redirect
    ];
    for (const url of csgUrls) {
      const { text, status, finalUrl } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 45)} → ${status} → ${(finalUrl||'').slice(8, 60)}`);
      if (!text || status !== 200) continue;
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 300)}`);
      const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
      if (wdUrls.length > 0) {
        const [, t, p, s] = wdUrls[0];
        console.log(`  WD URL: ${wdUrls[0][0]}`);
        const c = await tryWorkday(t, s, p); await sleep(300);
        if (c !== null) { const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
      }
      const countMatch = text.match(/(\d+)\s+(?:job|position|role|opening)/i);
      if (countMatch) console.log(`  Count: ${countMatch[0]}`);
    }
    // Try direct Workday with CSG tenant names
    if (await isNull("qlik")) {
      for (const pod of ["1","3","5"]) {
        for (const [t, s] of [
          ["cloudsoftwaregroup", "External"],
          ["cloudsoftwaregroup", "CSG"],
          ["tibcosoftware", "External"],
          ["tibco", "External"],
        ]) {
          const c = await tryWorkday(t, s, pod); await sleep(150);
          if (c !== null) { console.log(`  WD [${t}.wd${pod}/${s}]: ${c}`); const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
        }
        if (!await isNull("qlik")) break;
      }
    }
  }
  if (await isNull("qlik")) console.log("  → No data found");

  // ── FINAL STATE ───────────────────────────────────────────────────────────
  const { rows: s } = await db.query(`SELECT count(*) AS total, count(total_open_roles) AS has_roles, count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null FROM verified_company_intelligence`);
  const { rows: nulls } = await db.query(`SELECT canonical_name, country_code FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
  const { rows: all } = await db.query(`SELECT canonical_name, total_open_roles, hiring_source FROM verified_company_intelligence ORDER BY canonical_name`);
  await db.end();
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  if (nulls.length > 0) {
    console.log(`\nRemaining NULL (${nulls.length}):`);
    for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
