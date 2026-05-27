// fix-round6-final.mjs
// 1. Revert Vanguard (131 = career blog posts, not jobs)
// 2. Query careers.vanguard.com (real Vanguard careers site)
// 3. WNS api.wnscareers.com/jobs more carefully
// 4. Noom Eightfold public page extraction
// 5. Phoenix Mills Oracle HCM with correct params
// 6. Alnylam Eightfold public page extraction
// 7. India remaining companies

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchText(url, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, ...extraHeaders },
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
    return { ok: res.ok, status: res.status, text, data, ct: res.headers.get('content-type') || '' };
  } catch (e) { return { ok: false, status: 'err', error: e.message }; }
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
  const { rows } = await db.query(`SELECT total_open_roles FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]);
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
  console.log("=== Reverting false Vanguard data ===");
  const vr = await revertFalse("vanguard");
  console.log(`  Vanguard reverted: ${vr} rows (131 career blog posts was wrong)`);

  await sleep(300);

  // ── 1. VANGUARD — Try real careers site ──────────────────────────────────
  console.log("\n=== Vanguard ===");
  if (await isNull("vanguard")) {
    // Vanguard Financial Group careers page
    const vangUrls = [
      "https://careers.vanguard.com/",
      "https://www.vanguard.com/corporate-portal/content/corpsite/us/en/invest/careers.html",
    ];
    for (const url of vangUrls) {
      const { text, status, finalUrl } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 50)} → ${status} → ${(finalUrl||'').slice(8, 55)}`);
      if (!text || status !== 200) continue;
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 400)}`);
      // Look for Workday URL
      const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
      if (wdUrls.length > 0) {
        const [, t, p, s] = wdUrls[0];
        console.log(`  WD found: ${wdUrls[0][0]}`);
        const c = await tryWorkday(t, s, p); await sleep(300);
        if (c !== null) { console.log(`  ✓ ${c} jobs`); const rc = await updateRoles("vanguard", c, "workday_careers"); updated += rc; break; }
      }
    }
    // Try Vanguard Workday directly
    if (await isNull("vanguard")) {
      const vWd = [
        ["vanguard", "1", "vanguard_careers"],
        ["vanguard", "3", "vanguard_careers"],
        ["vanguard", "5", "vanguard_careers"],
        ["vanguard", "1", "Vanguard"],
        ["vanguard", "3", "Vanguard"],
        ["vanguardgroup", "1", "vanguard_careers"],
        ["vanguardgroup", "3", "vanguard_careers"],
      ];
      for (const [t, p, s] of vWd) {
        const c = await tryWorkday(t, s, p); await sleep(200);
        if (c !== null) { console.log(`  ✓ WD [${t}.wd${p}/${s}]: ${c}`); const rc = await updateRoles("vanguard", c, "workday_careers"); updated += rc; break; }
      }
    }
    // Try fetching vanguardjobs.com search page and count actual job listings
    if (await isNull("vanguard")) {
      const { text, status } = await fetchText("https://www.vanguardjobs.com/?s=");
      await sleep(400);
      console.log(`  vanguardjobs.com/?s= → ${status}`);
      if (text && status === 200) {
        // Count job listing post items (each job has its own post)
        const jobListingItems = [...text.matchAll(/class="[^"]*job[_-]listing[^"]*"/gi)].length;
        const postItems = [...text.matchAll(/class="[^"]*entry[^"]*"/gi)].length;
        console.log(`  job_listing items: ${jobListingItems} | entry items: ${postItems}`);
        // Try to count from the <article> elements
        const articles = [...text.matchAll(/<article[^>]*>/gi)].length;
        console.log(`  Articles: ${articles}`);
      }
    }
  }
  if (await isNull("vanguard")) console.log("  → No data found");
  await sleep(600);

  // ── 2. WNS GLOBAL — api.wnscareers.com/jobs ──────────────────────────────
  console.log("\n=== WNS Global ===");
  if (await isNull("wns global")) {
    // api.wnscareers.com/jobs returned "ok" but we didn't capture data
    const res = await fetchRaw("https://api.wnscareers.com/jobs", {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0", "Origin": "https://www.wnscareers.com" }
    });
    await sleep(400);
    console.log(`  api.wnscareers.com/jobs → ${res.status} | ct: ${res.ct}`);
    console.log(`  Raw (500 chars): ${(res.text || '').slice(0, 500)}`);
    if (res.ok && res.data) {
      const total = res.data.total ?? res.data.count ?? res.data.totalCount
                  ?? (Array.isArray(res.data.jobs) ? res.data.jobs.length : null)
                  ?? (Array.isArray(res.data) ? res.data.length : null);
      console.log(`  Total: ${total} | Keys: ${res.data && typeof res.data === 'object' ? Object.keys(res.data).slice(0, 8).join(', ') : 'array'}`);
      if (total !== null && total !== undefined) {
        const rc = await updateRoles("wns global", total, "wnscareers_api"); updated += rc;
      }
    }
    // Try WNS Workday
    if (await isNull("wns global")) {
      const wnsWd = [
        ["wns", "3", "wns_careers"], ["wns", "1", "wns_careers"],
        ["wnsglobal", "3", "wns_careers"], ["wnsholdings", "3", "wns_careers"],
        ["wns", "3", "WNS_Careers"], ["wns", "5", "wns_careers"],
      ];
      for (const [t, p, s] of wnsWd) {
        const c = await tryWorkday(t, s, p); await sleep(150);
        if (c !== null) { console.log(`  WD [${t}.wd${p}/${s}]: ${c}`); const rc = await updateRoles("wns global", c, "workday_careers"); updated += rc; break; }
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 3. NOOM — Extract from Eightfold public page ─────────────────────────
  console.log("\n=== Noom ===");
  if (await isNull("noom")) {
    // Noom uses Eightfold AI. The SPA at noom.com/careers (per the error message mentioning Sentry/Eightfold)
    // Try fetching the Eightfold career page
    const noomUrls = [
      "https://noom.eightfold.ai/careers",
      "https://www.noom.com/careers/",
      "https://www.noom.com/careers/job-listings/",
    ];
    for (const url of noomUrls) {
      const { text, status, finalUrl } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 50)} → ${status} → ${(finalUrl||'').slice(8, 55)}`);
      if (!text || status !== 200) continue;
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 300)}`);
      // Look for embedded job count
      const countMatch = text.match(/"num_positions"\s*:\s*(\d+)/)
                       || text.match(/"total"\s*:\s*(\d+)/)
                       || text.match(/"count"\s*:\s*(\d+)/)
                       || text.match(/(\d+)\s+(?:open\s+)?(?:position|job|opportunit|role)/i);
      if (countMatch) { console.log(`  Count: ${countMatch[1] || countMatch[0]}`); const n = parseInt(countMatch[1]); if (n >= 0 && n < 5000) { const rc = await updateRoles("noom", n, "career_page_noom"); updated += rc; break; } }
      // Look for initialData/initialProps
      const initData = text.match(/"positions"\s*:\s*\[([\s\S]{0,500})/i);
      if (initData) console.log(`  Positions data: ${initData[0].slice(0, 100)}`);
    }
    // Try Greenhouse for Noom (they might have moved back)
    if (await isNull("noom")) {
      const tokens = ["noom", "noomhealth", "noomapp", "noom-inc"];
      for (const t of tokens) {
        const res = await fetchRaw(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`); await sleep(200);
        if (res.ok && Array.isArray(res.data?.jobs)) {
          console.log(`  GH [${t}]: ${res.data.jobs.length}`);
          if (res.data.jobs.length >= 0) { const rc = await updateRoles("noom", res.data.jobs.length, "greenhouse_api"); updated += rc; break; }
        }
      }
    }
  }
  if (await isNull("noom")) console.log("  → No data found");
  await sleep(600);

  // ── 4. ALNYLAM — Eightfold public extraction ─────────────────────────────
  console.log("\n=== Alnylam Pharmaceuticals ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // Alnylam uses Eightfold AI (confirmed from SPA). Try the public career listing
    const alnUrls = [
      "https://alnylam.eightfold.ai/careers",
      "https://jobs.alnylam.com/careers/jobs",
    ];
    for (const url of alnUrls) {
      const { text, status } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 55)} → ${status}`);
      if (!text || status !== 200) continue;
      const countMatch = text.match(/"num_positions"\s*:\s*(\d+)/)
                       || text.match(/"total_results"\s*:\s*(\d+)/)
                       || text.match(/(\d+)\s+(?:open\s+)?(?:position|job|opportunit|role)/i);
      if (countMatch) { console.log(`  Count: ${countMatch[0]}`); const n = parseInt(countMatch[1]); if (n > 0) { const rc = await updateRoles("alnylam pharmaceuticals", n, "eightfold_page"); updated += rc; break; } }
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 200)}`);
    }
    // Try a different Eightfold URL pattern
    if (await isNull("alnylam pharmaceuticals")) {
      // Eightfold AI exposes a public search API
      const efSearch = await fetchRaw(
        "https://jobs.alnylam.com/api/apply/v2/jobs?num_jobs=1&query=&location=&department=&type=",
        { headers: { Accept: "application/json", Referer: "https://jobs.alnylam.com/" } }
      );
      await sleep(300);
      console.log(`  EF search API → ${efSearch.status} | ct: ${efSearch.ct}`);
      console.log(`  Raw: ${(efSearch.text || '').slice(0, 300)}`);
      if (efSearch.ok && efSearch.data) {
        const total = efSearch.data.num_positions ?? efSearch.data.total ?? efSearch.data.count;
        if (total !== undefined) { console.log(`  → ${total}`); if (total >= 0) { const rc = await updateRoles("alnylam pharmaceuticals", total, "eightfold_api"); updated += rc; } }
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 5. PHOENIX MILLS — Oracle HCM with proper params ─────────────────────
  console.log("\n=== Phoenix Mills (Oracle HCM) ===");
  if (await isNull("phoenix mills")) {
    // Oracle HCM CX (Career Experience) public REST API
    // Tenant is "egeg" on pod "em3"
    const oracleApis = [
      // Public job search for candidates - no auth required
      "https://egeg.fa.em3.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?expand=all&onlyData=true&limit=500&isPostedOnCareerSite=true",
      "https://egeg.fa.em3.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true",
      // Try without expand
      "https://egeg.fa.em3.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?limit=1",
      // Try the job search endpoint
      "https://egeg.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions?keyword=&location=",
    ];
    for (const url of oracleApis) {
      const res = await fetchRaw(url, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0",
          Origin: "https://careers.thephoenixmills.com",
          Referer: "https://careers.thephoenixmills.com/"
        }
      });
      await sleep(400);
      console.log(`  ${url.slice(8, 70)} → ${res.status}`);
      if (res.ok && res.data) {
        const total = res.data.totalResults ?? res.data.count ?? res.data.total ?? (Array.isArray(res.data.items) ? res.data.items.length : null);
        console.log(`  Total: ${total} | Keys: ${res.data && typeof res.data === 'object' ? Object.keys(res.data).slice(0, 6).join(', ') : 'n/a'}`);
        if (total !== null && total !== undefined) {
          console.log(`  ✓ ${total} Phoenix Mills jobs`);
          const rc = await updateRoles("phoenix mills", total, "oracle_hcm_api"); updated += rc; break;
        }
      }
      if (res.text) console.log(`  Raw: ${(res.text || '').slice(0, 200)}`);
    }
    // Try fetching the CX page directly with JavaScript rendering hints
    if (await isNull("phoenix mills")) {
      const res = await fetchRaw("https://egeg.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions", {
        headers: { ...HEADERS, Accept: "text/html,application/xhtml+xml,*/*;q=0.8" }
      });
      await sleep(400);
      console.log(`  CX requisitions page → ${res.status} (${res.text?.length} bytes)`);
      if (res.text) {
        // Look for window.__ORACLE_CX_DATA__ or similar
        const oracleData = res.text.match(/window\.__[A-Z_]+\s*=\s*({[\s\S]{0,1000}})/i);
        if (oracleData) console.log(`  Oracle data: ${oracleData[0].slice(0, 200)}`);
        const totalMatch = res.text.match(/"totalResults"\s*:\s*(\d+)/);
        if (totalMatch) { console.log(`  totalResults: ${totalMatch[1]}`); const rc = await updateRoles("phoenix mills", parseInt(totalMatch[1]), "oracle_hcm_page"); updated += rc; }
        const plain = res.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 300)}`);
      }
    }
  }
  if (await isNull("phoenix mills")) console.log("  → No data found");
  await sleep(600);

  // ── 6. MASIMO — Try careers.masimo.com ───────────────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    // Try a clean approach with careers.masimo.com (not their Cloudflare-protected main site)
    const masimoUrls = [
      "https://careers.masimo.com",
      "https://jobs.masimo.com",
      "https://masimo.com/careers",
      "https://www.masimo.com/careers",
    ];
    for (const url of masimoUrls) {
      const res = await fetchRaw(url, {
        headers: { ...HEADERS, "Accept-Language": "en-US,en;q=0.5" }
      });
      await sleep(400);
      console.log(`  ${url.slice(8, 40)} → ${res.status} (${res.text?.length} bytes)`);
      if (!res.ok || !res.text) continue;
      const plain = res.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 300)}`);
      // Look for WD URL
      const wdUrls = [...res.text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
      if (wdUrls.length > 0) {
        const [, t, p, s] = wdUrls[0];
        console.log(`  WD found: ${wdUrls[0][0]}`);
        const c = await tryWorkday(t, s, p); await sleep(300);
        if (c !== null) { console.log(`  ✓ ${c} jobs`); const rc = await updateRoles("masimo", c, "workday_careers"); updated += rc; break; }
      }
      const atsUrls = [...res.text.matchAll(/https?:\/\/[\w.-]+(?:greenhouse\.io|lever\.co|icims\.com|taleo\.net|jobvite\.com)[^"'\s<>]*/gi)];
      if (atsUrls.length > 0) console.log(`  ATS: ${atsUrls[0][0]}`);
      const count = res.text.match(/(\d+)\s+(?:job|position|result|opening)/i);
      if (count) console.log(`  Count hint: ${count[0]}`);
      break;
    }
    // Try Adzuna for Masimo (US, GB)
    if (await isNull("masimo")) {
      for (const country of ["us", "gb"]) {
        const res = await fetchRaw(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=masimo+corporation&results_per_page=1`);
        await sleep(400);
        console.log(`  Adzuna [${country}/masimo corporation]: ${res.data?.count ?? 'not found'}`);
        if (res.ok && typeof res.data?.count === "number" && res.data.count > 0) {
          const rc = await updateRoles("masimo", res.data.count, `adzuna_api_${country}`); updated += rc; break;
        }
      }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");
  await sleep(600);

  // ── 7. QLIK — Try all remaining approaches ────────────────────────────────
  console.log("\n=== Qlik ===");
  if (await isNull("qlik")) {
    // Try fetching Qlik's LinkedIn page for job count (if available)
    // Try fetching their press/about page that might link to careers ATS
    const qlikUrls = [
      "https://www.qlik.com/us/company/press-room/news",
      "https://www.qlik.com/sitemap.xml",
    ];
    for (const url of qlikUrls) {
      const { text, status } = await fetchText(url); await sleep(300);
      console.log(`  ${url.slice(8, 45)} → ${status}`);
      if (!text || status !== 200) continue;
      const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
      if (wdUrls.length > 0) {
        console.log(`  WD URL: ${wdUrls[0][0]}`);
        const [, t, p, s] = wdUrls[0];
        const c = await tryWorkday(t, s, p); await sleep(300);
        if (c !== null) { const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
      }
    }
    // Try comprehensive Workday search for Qlik
    if (await isNull("qlik")) {
      const qlikWd = [
        // Qlik's parent company Cloud Software Group
        ["cloudsoftwaregroup", "3", "Cloud_Software_Group"],
        ["cloudsoftwaregroup", "3", "CloudSoftwareGroup"],
        ["cloudsoftwaregroup", "1", "Cloud_Software_Group"],
        // Vista Equity Partners (Qlik's PE owner)
        ["vistaequitypartners", "3", "vista_careers"],
        // Qlik directly
        ["qlik", "3", "External"],
        ["qlik", "1", "External"],
        ["qliktech", "3", "External"],
        ["qliktech", "1", "qliktech_careers"],
      ];
      for (const [t, p, s] of qlikWd) {
        const c = await tryWorkday(t, s, p); await sleep(150);
        if (c !== null) { console.log(`  WD [${t}.wd${p}/${s}]: ${c}`); const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
      }
    }
    // Try Greenhouse for Qlik
    if (await isNull("qlik")) {
      for (const t of ["qlik", "qliktech", "qlik-tech", "cloudsoftware", "qlik-careers"]) {
        const res = await fetchRaw(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`); await sleep(150);
        if (res.ok && Array.isArray(res.data?.jobs)) {
          console.log(`  GH [${t}]: ${res.data.jobs.length}`);
          if (res.data.jobs.length > 0) { const rc = await updateRoles("qlik", res.data.jobs.length, "greenhouse_api"); updated += rc; break; }
        }
      }
    }
  }
  if (await isNull("qlik")) console.log("  → No data found");
  await sleep(600);

  // ── 8. INDIA COMPANIES — Additional attempts ──────────────────────────────
  console.log("\n=== India Government/PSU Companies ===");

  // SAIL: Try their SAIL career notification portal
  if (await isNull("steel authority of india")) {
    console.log("  [SAIL]");
    const sailUrls = [
      "https://sailcareers.co.in/en/career",
      "https://www.sail.co.in/career",
      "https://sailsteel.com/career",
    ];
    for (const url of sailUrls) {
      const res = await fetchRaw(url, { headers: HEADERS }); await sleep(500);
      console.log(`    ${url.slice(7, 45)} → ${res.status} (${res.text?.length || 0} bytes)`);
      if (res.ok && res.text && res.text.length > 1000) {
        const plain = res.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`    Preview: ${plain.slice(0, 200)}`);
        break;
      }
    }
  }

  // GSPL: Check if they're accessible now
  if (await isNull("gspl")) {
    console.log("  [GSPL]");
    const { text, status } = await fetchText("https://www.gspl.in");
    await sleep(400);
    console.log(`    www.gspl.in → ${status}`);
    if (text && status === 200) {
      // gspl.in is actually GSPL India (Gujarat State Petronet Ltd subsidiary)
      // The main GSPL career page might be at a different URL
      const careerLinks = [...text.matchAll(/href="([^"]*(?:career|job)[^"]*)"/gi)].map(m => m[1]);
      console.log(`    Career links: ${careerLinks.slice(0, 5).join(', ')}`);
      // Try career page
      const careerUrl = careerLinks[0];
      if (careerUrl) {
        const fullUrl = careerUrl.startsWith('http') ? careerUrl : `https://www.gspl.in${careerUrl}`;
        const { text: t2, status: s2 } = await fetchText(fullUrl);
        await sleep(300);
        console.log(`    ${fullUrl.slice(8, 45)} → ${s2}`);
        if (t2 && s2 === 200) {
          const plain = t2.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`    Preview: ${plain.slice(0, 200)}`);
          const v = plain.match(/(\d+)\s+(?:vacancy|vacancies|opening|position)/i);
          if (v) { const rc = await updateRoles("gspl", parseInt(v[1]), "career_page_scrape"); updated += rc; }
        }
      }
    }
  }

  // PFC Ltd
  if (await isNull("pfc ltd")) {
    console.log("  [PFC Ltd]");
    // PFC = Power Finance Corporation - government PSU
    const pfcUrls = [
      "https://www.pfcindia.com/Home/Career",
      "https://pfcindia.com/Home/Career",
    ];
    for (const url of pfcUrls) {
      const res = await fetchRaw(url, { headers: { ...HEADERS, "Accept-Encoding": "identity" } }); await sleep(500);
      console.log(`    ${url.slice(8, 40)} → ${res.status} (${res.text?.length || 0} bytes)`);
      if (res.ok && res.text && res.text.length > 1000) {
        const plain = res.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`    Preview: ${plain.slice(0, 200)}`);
        const v = plain.match(/(\d+)\s+(?:vacancy|vacancies|opening|position)/i);
        if (v) { const rc = await updateRoles("pfc ltd", parseInt(v[1]), "career_page_scrape"); updated += rc; break; }
        break;
      }
    }
  }

  // Union Bank of India
  if (await isNull("union bank of india")) {
    console.log("  [Union Bank of India]");
    // We found 6 job links earlier (Apply Online, APPLY NOW, etc.) + 2 notification links
    // Let's look more carefully at those 2 notification links
    const { text, status } = await fetchText("https://unionbankofindia.co.in/recruitment");
    await sleep(400);
    console.log(`    unionbankofindia.co.in/recruitment → ${status}`);
    if (text && status === 200) {
      // Extract all links with their text
      const allLinks = [...text.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gis)];
      const extLinks = allLinks.filter(m => m[1].startsWith('http') && (m[1].includes('recruit') || m[1].includes('apply') || m[1].includes('ibps')));
      console.log(`    External recruitment links: ${extLinks.length}`);
      for (const l of extLinks) {
        const text2 = l[2].replace(/<[^>]+>/g, '').trim();
        console.log(`    → "${text2.slice(0, 60)}" | ${l[1].slice(0, 70)}`);
      }
      // Count recruitment PDFs/notifications
      const pdfLinks = [...text.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)];
      console.log(`    PDF links: ${pdfLinks.length}`);
      // Look for any numbers in the page that indicate vacancies
      const vacancies = [...text.matchAll(/(\d[\d,]+)\s+(?:vacancy|vacancies|post|seat)/ig)];
      console.log(`    Vacancy numbers: ${vacancies.map(m => m[0]).join(', ')}`);
    }
  }

  // Vijaya Diagnostic - try their Next.js page routes
  if (await isNull("vijaya diagnostic")) {
    console.log("  [Vijaya Diagnostic]");
    // vijayadiagnostic.com/careers is a Next.js page (/_next/ static files detected)
    // Next.js fetches data from API routes. Try common patterns
    const vijApis = [
      "https://www.vijayadiagnostic.com/api/careers/jobs",
      "https://www.vijayadiagnostic.com/api/jobs",
      "https://www.vijayadiagnostic.com/careers/jobs",
    ];
    for (const url of vijApis) {
      const res = await fetchRaw(url, { headers: { Accept: "application/json" } }); await sleep(300);
      console.log(`    ${url.slice(8, 55)} → ${res.status}`);
      if (res.ok && res.data) {
        const total = res.data.total ?? res.data.count ?? (Array.isArray(res.data.jobs) ? res.data.jobs.length : null) ?? (Array.isArray(res.data) ? res.data.length : null);
        if (total !== null) { console.log(`    → ${total}`); const rc = await updateRoles("vijaya diagnostic", total, "vijayadiagnostic_api"); updated += rc; break; }
        console.log(`    Data: ${JSON.stringify(res.data).slice(0, 150)}`);
      }
    }
    // Try fetching Next.js server-side props for the careers page
    if (await isNull("vijaya diagnostic")) {
      const res = await fetchRaw("https://www.vijayadiagnostic.com/_next/data/buildId/careers.json", {
        headers: { Accept: "application/json" }
      });
      await sleep(300);
      console.log(`    _next/data → ${res.status}`);
      // This will fail with wrong buildId but might give us a hint
    }
    // Try their ATS tokens
    for (const t of ["vijayadiagnostic", "vijaya-diagnostic", "vijayaonline"]) {
      const res = await fetchRaw(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`); await sleep(150);
      if (res.ok && Array.isArray(res.data?.jobs)) {
        console.log(`    GH [${t}]: ${res.data.jobs.length}`);
        if (res.data.jobs.length >= 0) { const rc = await updateRoles("vijaya diagnostic", res.data.jobs.length, "greenhouse_api"); updated += rc; break; }
      }
    }
  }

  // Usha Martin - try their contact/career form
  if (await isNull("usha martin")) {
    console.log("  [Usha Martin]");
    // The career page has a single apply link and the page loads for HTTP GET
    // Their career form might submit to /submit-application. Count active jobs differently.
    // Let's check if they have any downloadable job list or PDF notifications
    const { text, status } = await fetchText("https://www.ushamartin.com/career/");
    await sleep(400);
    if (text && status === 200) {
      // Count distinct job title in form options/selects
      const options = [...text.matchAll(/<option[^>]*value="([^"]+)"[^>]*>/gi)].map(m => m[1]);
      const jobOptions = options.filter(o => o.length > 3 && !o.match(/^\d+$/) && !o.toLowerCase().match(/select|--/));
      console.log(`    Form options (non-default): ${jobOptions.length} → ${jobOptions.slice(0,5).join(', ')}`);
      if (jobOptions.length > 0) {
        console.log(`    → ${jobOptions.length} job options in form`);
        const rc = await updateRoles("usha martin", jobOptions.length, "career_form_options"); updated += rc;
      }
      // Also look for vacancy count hidden in the page
      const allText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`    Page text: ${allText.slice(0, 600)}`);
    }
  }

  // Bayer CropScience India
  if (await isNull("bayer cropscience india")) {
    console.log("  [Bayer CropScience India]");
    // Try Bayer's known global Workday tenant
    for (const [t, p, s] of [["bayer", "3", "Bayer"], ["bayer", "3", "BAG"], ["bayer", "3", "bayer_careers"]]) {
      const c = await tryWorkday(t, s, p); await sleep(200);
      if (c !== null) {
        console.log(`    Bayer global WD [${t}.wd${p}/${s}]: ${c} jobs`);
        // Now try to get India-specific via searchText
        const indiaRes = await fetchRaw(
          `https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "India" })
          }
        );
        await sleep(300);
        if (indiaRes.ok && typeof indiaRes.data?.total === "number") {
          console.log(`    Bayer "India" search: ${indiaRes.data.total}`);
          if (indiaRes.data.total > 0) {
            const rc = await updateRoles("bayer cropscience india", indiaRes.data.total, "workday_bayer_india"); updated += rc;
          }
        }
        // Also try "crop" search
        const cropRes = await fetchRaw(
          `https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "crop" })
          }
        );
        await sleep(300);
        if (cropRes.ok && typeof cropRes.data?.total === "number") {
          console.log(`    Bayer "crop" search: ${cropRes.data.total}`);
        }
        break;
      }
    }
  }

  // ── FINAL STATE ───────────────────────────────────────────────────────────
  const { rows: s } = await db.query(`SELECT count(*) AS total, count(total_open_roles) AS has_roles, count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null FROM verified_company_intelligence`);
  const { rows: nulls } = await db.query(`SELECT canonical_name, country_code FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
  await db.end();
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
}

main().catch(e => { console.error(e); process.exit(1); });
