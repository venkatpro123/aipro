// fix-round10-deep.mjs
// KEY LEADS:
// - Usha Martin: 8 rows likely JS templates - must verify and potentially revert
// - SAIL: sailcareers.com returned 38KB - deep parse
// - Vanguard: vanguardjobs.com returned 200 - deep parse
// - Vijaya Diagnostic: vijayadiagnostic.com/careers returned 200 - deep parse
// - Meituan: /api/category/allData found - try it
// - WNS: try Naukri more carefully + iCIMS + Ashby
// - PFC: try alternative URLs
// - Union Bank: IBPS and direct recruitment page approaches

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

async function revert(cn) {
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence SET total_open_roles = NULL, hiring_source = NULL,
     hiring_verified_at = NULL, hiring_confidence = NULL, hiring_velocity_score = NULL, updated_at = NOW()
     WHERE canonical_name = $1`,
    [cn]
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

  // ── 0. VERIFY USHA MARTIN (8 rows — likely JS templates) ─────────────────
  console.log("=== Usha Martin (verify/revert if false) ===");
  {
    const cur = await getVal("usha martin");
    console.log(`  Current: ${cur?.total_open_roles} from ${cur?.hiring_source}`);
    if (cur?.total_open_roles !== null) {
      // Fetch the page and verify the 8 rows are real jobs
      const { text, status } = await fetchText("https://www.ushamartin.com/join-us/");
      await sleep(400);
      if (text && status === 200) {
        // The first row was: ' + item.tab_value + '  — this is a JavaScript template!
        const jsTemplateCheck = text.includes("item.tab_value") || text.includes("item.title") || text.includes("item.name");
        console.log(`  JS template detected: ${jsTemplateCheck}`);
        // Count truly-rendered anchor tags that link to actual job pages
        const realJobLinks = [...text.matchAll(/<a[^>]+href="([^"]*)"[^>]*>([^<]{10,100})<\/a>/gi)]
          .filter(m => !m[1].includes('javascript') && !m[1].startsWith('#') &&
                       !m[1].includes('tel:') && !m[1].includes('mailto:') &&
                       !m[2].includes('item.') && !m[2].includes('{') &&
                       (m[0].toLowerCase().includes('manager') || m[0].toLowerCase().includes('engineer') ||
                        m[0].toLowerCase().includes('officer') || m[0].toLowerCase().includes('analyst') ||
                        m[0].toLowerCase().includes('executive') || m[0].toLowerCase().includes('director') ||
                        m[0].toLowerCase().includes('head') || m[0].toLowerCase().includes('specialist')));
        console.log(`  Real job-titled links: ${realJobLinks.length}`);
        realJobLinks.forEach(m => console.log(`    "${m[2].trim().slice(0,80)}" → ${m[1].slice(0,60)}`));
        // Get the raw table rows with href links (what was counted as 8)
        const hrefRows = [...text.matchAll(/<tr[^>]*>[\s\S]{30,500}?<\/tr>/gi)]
          .filter(m => m[0].includes('href'));
        console.log(`  Href rows (${hrefRows.length}):`);
        hrefRows.forEach(m => {
          const plain = m[0].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
          console.log(`    "${plain}"`);
        });
        // If first row contains item.tab_value or similar - it's a JS template, revert
        const firstRow = hrefRows[0]?.[0] || '';
        if (jsTemplateCheck || firstRow.includes("item.") || firstRow.includes("+") || firstRow.includes("'")) {
          console.log(`  ⚠ JS template rows confirmed — REVERTING Usha Martin`);
          const rc = await revert("usha martin"); updated -= 1; // mark as reverted
          console.log(`  Reverted: ${rc} rows`);
        } else if (realJobLinks.length > 0) {
          console.log(`  ✓ Real job links confirmed: ${realJobLinks.length}`);
        } else {
          console.log(`  No real job data confirmed — REVERTING`);
          await revert("usha martin");
        }
      }
    }
  }
  await sleep(500);

  // ── 1. SAIL — sailcareers.com deep parse ──────────────────────────────────
  console.log("\n=== SAIL (sailcareers.com) ===");
  if (await isNull("steel authority of india")) {
    const { text, status } = await fetchText("https://sailcareers.com");
    await sleep(400);
    console.log(`  sailcareers.com → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      // Full content output
      console.log(`  Full text (5000 chars): ${plain.slice(0, 5000)}`);
      // Look for job count patterns
      const countMatch = plain.match(/(\d+)\s+(?:vacancy|vacancies|post|opening|position|job)/i);
      if (countMatch) console.log(`  Count match: ${countMatch[0]}`);
      // Look for links to SAIL job pages
      const jobLinks = [...text.matchAll(/href="([^"]+)"/gi)].map(m=>m[1]).filter(h => h.length > 3 && h !== '#');
      console.log(`  All links (${jobLinks.length}): ${jobLinks.slice(0,20).join(', ')}`);
    }
  }
  await sleep(600);

  // ── 2. VANGUARD — vanguardjobs.com deep parse ────────────────────────────
  console.log("\n=== Vanguard (vanguardjobs.com) ===");
  if (await isNull("vanguard")) {
    const { text, status } = await fetchText("https://www.vanguardjobs.com");
    await sleep(400);
    console.log(`  vanguardjobs.com → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Full text (5000 chars): ${plain.slice(0, 5000)}`);
      // Look for WD or other ATS links
      const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
      console.log(`  WD URLs: ${wdUrls.map(m=>m[0]).join(', ')}`);
      // Any count in the page
      const countMatch = plain.match(/(\d[\d,]+)\s+(?:job|position|career|opening|role)/i);
      if (countMatch) console.log(`  Count: ${countMatch[0]}`);
      // What scripts/APIs are loaded
      const scripts = [...text.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(m=>m[1]);
      console.log(`  Scripts: ${scripts.slice(0,5).join(', ')}`);
      // Look for all API calls
      const fetchUrls = [...text.matchAll(/["'](https?:\/\/[^"']*api[^"']{5,80})["']/gi)].map(m=>m[1]);
      console.log(`  API URLs: ${fetchUrls.slice(0,5).join(', ')}`);
    }
    // Try the career search page on vanguardjobs.com
    if (await isNull("vanguard")) {
      const pages = ["/search", "/search-jobs", "/jobs", "/opportunities"];
      for (const pg of pages) {
        const { text, status } = await fetchText(`https://www.vanguardjobs.com${pg}`);
        await sleep(300);
        console.log(`  vanguardjobs.com${pg} → ${status} (${text?.length} bytes)`);
        if (text && status === 200) {
          const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`  Preview: ${plain.slice(0, 500)}`);
          const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
          if (wdUrls.length > 0) {
            console.log(`  WD found: ${wdUrls.map(m=>m[0]).join(', ')}`);
            for (const [, t, p, s] of wdUrls) {
              if (s.toLowerCase().includes('login')) continue;
              const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
              });
              await sleep(200);
              if (res.ok && typeof res.data?.total === "number") {
                console.log(`  ✓ WD: ${res.data.total}`);
                const rc = await updateRoles("vanguard", res.data.total, "workday_vanguardjobs"); updated += rc;
              }
            }
          }
          if (!await isNull("vanguard")) break;
        }
      }
    }
  }
  await sleep(600);

  // ── 3. VIJAYA DIAGNOSTIC — deep parse careers page ───────────────────────
  console.log("\n=== Vijaya Diagnostic ===");
  if (await isNull("vijaya diagnostic")) {
    const { text, status } = await fetchText("https://www.vijayadiagnostic.com/careers");
    await sleep(400);
    console.log(`  vijayadiagnostic.com/careers → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      // Full content to look for job listings
      console.log(`  Full text (8000 chars): ${plain.slice(0, 8000)}`);
      // Look for job count
      const countMatch = plain.match(/(\d+)\s+(?:vacancy|job|opening|position|opportunit)/i);
      if (countMatch) console.log(`  Count: ${countMatch[0]}`);
      // Count real job listing elements
      const jobDivs = [...text.matchAll(/<(?:div|article|li|tr)[^>]*class="[^"]*(?:job|career|position|vacancy)[^"]*"[^>]*>/gi)];
      console.log(`  Job elements: ${jobDivs.length}`);
      // Count job title elements
      const jobTitles = [...text.matchAll(/<h[2-6][^>]*>([^<]{10,80})<\/h[2-6]>/gi)]
        .filter(m => !m[1].includes('{') && !m[1].includes('javascript'));
      console.log(`  Headings (${jobTitles.length}): ${jobTitles.map(m=>m[1].trim()).join(' | ')}`);
      // Look for API endpoints (Next.js)
      const nextData = text.match(/__NEXT_DATA__\s*=\s*(\{[\s\S]{50,5000}?\});/)?.[1];
      if (nextData) {
        console.log(`  __NEXT_DATA__: ${nextData.slice(0, 500)}`);
        try {
          const d = JSON.parse(nextData);
          console.log(`  PageProps keys: ${Object.keys(d.props?.pageProps || {}).join(', ')}`);
        } catch {}
      }
      // Look for any apply/job links
      const applyLinks = [...text.matchAll(/href="([^"]*(?:apply|job|career|current-opening)[^"]*)"/gi)].map(m=>m[1]);
      console.log(`  Apply links: ${applyLinks.length} | ${applyLinks.slice(0,10).join(', ')}`);
    }
    // Try their Next.js API routes
    if (await isNull("vijaya diagnostic")) {
      const apiUrls = [
        "https://www.vijayadiagnostic.com/api/careers",
        "https://www.vijayadiagnostic.com/api/jobs",
        "https://www.vijayadiagnostic.com/api/vacancies",
        "https://www.vijayadiagnostic.com/api/current-openings",
      ];
      for (const url of apiUrls) {
        const res = await fetchJson(url);
        await sleep(200);
        console.log(`  API ${url.slice(40)} → ${res.status}`);
        if (res.ok && res.data) {
          const count = res.data.count ?? res.data.total ?? (Array.isArray(res.data) ? res.data.length : null);
          if (count !== null) { console.log(`  → ${count}`); if (count > 0) { const rc = await updateRoles("vijaya diagnostic", count, "nextjs_api"); updated += rc; break; } }
        }
      }
    }
  }
  await sleep(600);

  // ── 4. MEITUAN — API category/allData ────────────────────────────────────
  console.log("\n=== Meituan ===");
  if (await isNull("meituan")) {
    // Found API: /api/category/allData - try it with Referer
    const catRes = await fetchJson("https://zhaopin.meituan.com/api/category/allData", {
      headers: {
        "Accept": "application/json",
        "Referer": "https://zhaopin.meituan.com/web/home",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      }
    });
    await sleep(400);
    console.log(`  /api/category/allData → ${catRes.status}`);
    if (catRes.ok && catRes.data) {
      console.log(`  Data: ${JSON.stringify(catRes.data).slice(0, 500)}`);
    } else {
      console.log(`  Raw: ${(catRes.text||'').slice(0, 300)}`);
    }
    // Try their job search API with session cookies
    const searchRes = await fetchJson("https://zhaopin.meituan.com/api/position/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": "https://zhaopin.meituan.com/web/home",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      body: JSON.stringify({ pageSize: 1, pageIndex: 1, cityId: 0, keyword: "" })
    });
    await sleep(400);
    console.log(`  POST /api/position/query → ${searchRes.status}`);
    if (searchRes.ok && searchRes.data) {
      console.log(`  Data: ${JSON.stringify(searchRes.data).slice(0, 500)}`);
    }
    // Try the position list page to see if any count is embedded
    const { text, status } = await fetchText("https://zhaopin.meituan.com/web/home", {
      "Accept-Language": "zh-CN,zh;q=0.9",
    });
    await sleep(400);
    console.log(`  /web/home → ${status} (${text?.length})`);
    if (text && status === 200) {
      // The page is just JS bundle with owl tracking
      // Look for __INITIAL_STATE__ or similar
      const initState = text.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]{20,3000}?\});/)?.[1]
                      || text.match(/window\.__APP_STATE__\s*=\s*(\{[\s\S]{20,3000}?\});/)?.[1];
      if (initState) console.log(`  InitState: ${initState.slice(0, 400)}`);
      // Numbers
      const nums = [...text.matchAll(/\b(\d{3,6})\b/g)].filter(m => parseInt(m[1]) > 100 && parseInt(m[1]) < 100000);
      console.log(`  Large numbers in page: ${nums.slice(0,10).map(m=>m[1]).join(', ')}`);
    }
    // Try fetching from Meituan's search with GET params
    const searchGet = await fetchJson("https://zhaopin.meituan.com/api/position/list?pageSize=1&pageIndex=1&cityCode=&keyword=", {
      headers: {
        "Accept": "application/json",
        "Referer": "https://zhaopin.meituan.com/web/home",
      }
    });
    await sleep(400);
    console.log(`  GET /api/position/list → ${searchGet.status}`);
    if (searchGet.ok && searchGet.data) console.log(`  Data: ${JSON.stringify(searchGet.data).slice(0, 300)}`);
  }
  await sleep(600);

  // ── 5. WNS GLOBAL — Naukri deep parse ────────────────────────────────────
  console.log("\n=== WNS Global ===");
  if (await isNull("wns global")) {
    // Naukri returned 200 (35KB) but count wasn't found — look more carefully
    const { text, status } = await fetchText("https://www.naukri.com/wns-global-jobs", {
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-IN,en;q=0.9",
    });
    await sleep(600);
    console.log(`  Naukri WNS → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      // Extract larger section
      console.log(`  Full page text (5000 chars):`);
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(plain.slice(0, 5000));
      // Look for job count patterns in raw HTML
      const patterns = [
        [/"noOfJobs"\s*:\s*(\d+)/, "noOfJobs"],
        [/"total"\s*:\s*(\d+)/, "total"],
        [/"count"\s*:\s*(\d+)/, "count"],
        [/"totalJobs"\s*:\s*(\d+)/, "totalJobs"],
        [/(\d[\d,]+)\s+Jobs?\s+in\s+WNS/i, "jobs in WNS"],
        [/WNS[^<]{0,30}(\d[\d,]+)\s+Jobs?/i, "WNS N jobs"],
        [/("jobCount"|"totalCount")\s*:\s*(\d+)/i, "jobCount"],
        [/jobs-in-(\d+)/i, "jobs-in-N"],
      ];
      for (const [pat, label] of patterns) {
        const m = text.match(pat);
        if (m) console.log(`  [${label}]: ${m[1] || m[0]}`);
      }
      // Try to parse JSON-LD or embedded JSON
      const jsonLds = [...text.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]+?)<\/script>/gi)];
      for (const j of jsonLds) {
        try {
          const d = JSON.parse(j[1]);
          if (d['@type'] === 'JobPosting' || d.numberOfItems) console.log(`  JSON-LD: ${JSON.stringify(d).slice(0, 200)}`);
        } catch {}
      }
    }
    // Try Naukri company profile API
    if (await isNull("wns global")) {
      const nkApi = await fetchJson("https://www.naukri.com/jobapi/v3/search?noOfResults=1&urlType=search_by_company&searchType=company&companyName=WNS+Global+Services", {
        headers: { "Accept": "application/json", "systemId": "Naukri", "Referer": "https://www.naukri.com" }
      });
      await sleep(400);
      console.log(`  Naukri API → ${nkApi.status}`);
      if (nkApi.ok && nkApi.data) {
        const count = nkApi.data.noOfJobs ?? nkApi.data.count ?? nkApi.data.total;
        console.log(`  Count: ${count}`);
        if (typeof count === "number" && count > 0) {
          const rc = await updateRoles("wns global", count, "naukri_company_api"); updated += rc;
        }
      }
    }
    // Try Ashby ATS for WNS
    if (await isNull("wns global")) {
      for (const t of ["wns", "wnsglobal", "wns-global-services"]) {
        const ashby = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${t}`);
        await sleep(200);
        if (ashby.ok && Array.isArray(ashby.data?.jobPostings)) {
          console.log(`  Ashby [${t}]: ${ashby.data.jobPostings.length}`);
          if (ashby.data.jobPostings.length > 0) { const rc = await updateRoles("wns global", ashby.data.jobPostings.length, "ashby_api"); updated += rc; break; }
        }
      }
    }
  }
  await sleep(600);

  // ── 6. PFC Ltd — try alternate URLs ─────────────────────────────────────
  console.log("\n=== PFC Ltd ===");
  if (await isNull("pfc ltd")) {
    const pfcUrls = [
      "https://www.pfcindia.com",
      "https://pfcindia.com",
      "https://www.pfcl.co.in/career",
      "https://www.pfcl.co.in",
    ];
    for (const url of pfcUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  PFC: ${url} → ${status} (final: ${finalUrl?.slice(0,60)}) bytes=${text?.length}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        const careerLinks = [...text.matchAll(/href="([^"]*(?:career|recruit|job)[^"]*)"/gi)].map(m=>m[1]).filter(h=>h.startsWith('http')||h.startsWith('/'));
        console.log(`  Career links: ${careerLinks.slice(0,10).join(', ')}`);
        break;
      }
    }
  }
  await sleep(600);

  // ── 7. UNION BANK — check actual recruitment count via IBPS/official site ──
  console.log("\n=== Union Bank of India ===");
  if (await isNull("union bank of india")) {
    // Their recruitment page has PDFs — count the "current" recruitment notifications
    const { text, status } = await fetchText("https://www.unionbankofindia.co.in/recruitment");
    await sleep(400);
    console.log(`  Union Bank recruitment → ${status}`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      // Full text to look for vacancy numbers
      console.log(`  Full text (10000 chars): ${plain.slice(0, 10000)}`);
      // Look for any recruitment notification titles with dates
      const notifTitles = [...text.matchAll(/<(?:td|li|a|p|h\d)[^>]*>([^<]{20,200}(?:recruit|vacancy|appoint|post|officer|clerk)[^<]{0,100})<\/(?:td|li|a|p|h\d)>/gi)]
        .map(m => m[1].trim().replace(/\s+/g, ' '));
      console.log(`  Notification titles (${notifTitles.length}):`);
      notifTitles.slice(0, 20).forEach(t => console.log(`    "${t.slice(0, 120)}"`));
    }
  }
  await sleep(600);

  // ── 8. BAYER INDIA — try direct India careers page ───────────────────────
  console.log("\n=== Bayer CropScience India ===");
  if (await isNull("bayer cropscience india")) {
    const bayerUrls = [
      "https://www.bayer.com/en/in/career",
      "https://www.bayer.com/en/in/jobs",
      "https://www.bayer.com/en/in/career-opportunities",
      "https://india.bayer.com/career",
      "https://www.bayer.co.in/careers",
    ];
    for (const url of bayerUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} (final: ${finalUrl?.slice(0,60)})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) {
          console.log(`  WD: ${wdUrls.map(m=>m[0]).join(', ')}`);
        }
        break;
      }
    }
    // Try fetching Bayer WD with required Accept-Language header (might fix 422)
    if (await isNull("bayer cropscience india")) {
      const res = await fetchJson("https://bayer.wd3.myworkdayjobs.com/wday/cxs/bayer/Bayer_Global/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": UA,
          "X-Requested-With": "XMLHttpRequest",
          "Referer": "https://bayer.wd3.myworkdayjobs.com/Bayer_Global",
          "Origin": "https://bayer.wd3.myworkdayjobs.com",
        },
        body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
      });
      await sleep(300);
      console.log(`  Bayer WD [with full headers] → ${res.status}`);
      console.log(`  Data: ${JSON.stringify(res.data||{}).slice(0, 300)}`);
      if (res.ok && typeof res.data?.total === "number") {
        console.log(`  ✓ Total: ${res.data.total} — now filter for India`);
        // Filter for India
        const indiaRes = await fetchJson("https://bayer.wd3.myworkdayjobs.com/wday/cxs/bayer/Bayer_Global/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": UA, "Referer": "https://bayer.wd3.myworkdayjobs.com/Bayer_Global" },
          body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "India" })
        });
        await sleep(300);
        if (indiaRes.ok && typeof indiaRes.data?.total === "number") {
          const rc = await updateRoles("bayer cropscience india", indiaRes.data.total, "workday_bayer_india"); updated += rc;
        }
      }
    }
    // Try Adzuna for Bayer India
    if (await isNull("bayer cropscience india")) {
      const res = await fetchJson("https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=bayer&results_per_page=1");
      await sleep(300);
      console.log(`  Adzuna Bayer: ${res.data?.count}`);
    }
  }
  await sleep(600);

  // ── 9. GSPL — try parent Gujarat Gas and GSPC ────────────────────────────
  console.log("\n=== GSPL ===");
  if (await isNull("gspl")) {
    const gsplUrls = [
      "https://www.gujaratgas.com/career",
      "https://www.gujaratgas.com/careers",
      "https://www.gspcgas.com/career",
      "https://www.gspcgas.com/careers",
      "https://gspc.co.in/careers",
    ];
    for (const url of gsplUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} (final: ${finalUrl?.slice(0,60)}) bytes=${text?.length}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 800)}`);
        const count = plain.match(/(\d+)\s+(?:vacancy|job|opening|position)/i);
        if (count) { console.log(`  Count: ${count[0]}`); }
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
