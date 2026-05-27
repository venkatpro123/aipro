// fix-round9-targeted.mjs
// KEY FINDS:
// - Noom: Greenhouse embed for=noomgrowth → direct API call
// - Alnylam: 133KB page with COUNTRY_CODE=US → deep JSON search
// - Vanguard: try careers.vanguard.com, jobs.vanguard.com
// - Masimo: try careers.masimo.com
// - Meituan: job.meituan.com Chinese careers
// - India: fresh URLs per company

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
  return rows[0]?.total_open_roles;
}
const isNull = async (cn) => (await getVal(cn)) === null;

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. NOOM — Greenhouse embed found: for=noomgrowth ─────────────────────
  console.log("=== Noom (Greenhouse noomgrowth) ===");
  if (await isNull("noom")) {
    // Found from page: https://boards.greenhouse.io/embed/job_board/js?for=noomgrowth
    const res = await fetchJson("https://boards-api.greenhouse.io/v1/boards/noomgrowth/jobs");
    await sleep(300);
    console.log(`  GH boards API → ${res.status}`);
    if (res.ok && Array.isArray(res.data?.jobs)) {
      console.log(`  → ${res.data.jobs.length} jobs`);
      const rc = await updateRoles("noom", res.data.jobs.length, "greenhouse_api_noomgrowth");
      updated += rc;
    } else {
      console.log(`  Raw: ${(res.text||'').slice(0, 200)}`);
      // Try with metadata=true (get more data)
      const res2 = await fetchJson("https://boards-api.greenhouse.io/v1/boards/noomgrowth/jobs?content=true");
      await sleep(300);
      console.log(`  GH boards API [content] → ${res2.status}`);
      if (res2.ok && Array.isArray(res2.data?.jobs)) {
        console.log(`  → ${res2.data.jobs.length} jobs`);
        const rc = await updateRoles("noom", res2.data.jobs.length, "greenhouse_api_noomgrowth");
        updated += rc;
      }
    }
  }
  if (await isNull("noom")) console.log("  → No data found");
  await sleep(600);

  // ── 2. ALNYLAM — Deep page JSON search ───────────────────────────────────
  console.log("\n=== Alnylam Pharmaceuticals ===");
  if (await isNull("alnylam pharmaceuticals")) {
    const { text, status } = await fetchText("https://jobs.alnylam.com/careers", {
      Cookie: "country_code=US; locale=en_US",
      "CF-IPCountry": "US",
      "X-Forwarded-For": "172.217.1.1",
    });
    await sleep(400);
    console.log(`  jobs.alnylam.com/careers → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      // Search for ALL patterns that might indicate total job count
      const searches = [
        [/"total_positions"\s*:\s*(\d+)/i, "total_positions"],
        [/"totalJobs"\s*:\s*(\d+)/i, "totalJobs"],
        [/"total"\s*:\s*(\d+)/i, "total"],
        [/"count"\s*:\s*(\d+)/i, "count"],
        [/"num_positions"\s*:\s*(\d+)/i, "num_positions"],
        [/"jobCount"\s*:\s*(\d+)/i, "jobCount"],
        [/"total_results"\s*:\s*(\d+)/i, "total_results"],
        [/"totalCount"\s*:\s*(\d+)/i, "totalCount"],
        [/"num_jobs"\s*:\s*(\d+)/i, "num_jobs"],
      ];
      for (const [pat, label] of searches) {
        const m = text.match(pat);
        if (m) console.log(`  [${label}] = ${m[1]}`);
      }
      // Find large JSON blobs that might contain job data
      const jsonBlobs = [...text.matchAll(/window\.\w+\s*=\s*(\{[\s\S]{50,3000}?\});/g)];
      if (jsonBlobs.length > 0) {
        console.log(`  Window JSON blobs: ${jsonBlobs.length}`);
        for (const b of jsonBlobs) {
          try {
            const obj = JSON.parse(b[1]);
            const keys = Object.keys(obj);
            console.log(`  Blob keys: ${keys.slice(0, 10).join(', ')}`);
          } catch {}
        }
      }
      // Extract all script src URLs to find the job data API
      const scriptSrcs = [...text.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(m => m[1]);
      console.log(`  Script srcs (${scriptSrcs.length}): ${scriptSrcs.slice(0,5).join(', ')}`);
      // Try common Eightfold API endpoints
      const efEndpoints = [
        "https://jobs.alnylam.com/api/apply/v2/jobs?num_jobs=1&query=&location=",
        "https://jobs.alnylam.com/api/jobs?limit=1&page=0",
        "https://jobs.alnylam.com/careers/api/jobs?limit=1",
        "https://jobs.alnylam.com/api/apply/v2/config",
      ];
      for (const ep of efEndpoints) {
        const res = await fetchJson(ep, {
          headers: {
            "Accept": "application/json",
            "Referer": "https://jobs.alnylam.com/careers",
            "Cookie": "country_code=US; locale=en_US",
            "CF-IPCountry": "US",
            "X-Forwarded-For": "172.217.1.1",
          }
        });
        await sleep(250);
        console.log(`  EP [${ep.slice(30, 70)}] → ${res.status}`);
        if (res.ok && res.data) {
          const total = res.data.num_positions ?? res.data.total ?? res.data.count ?? res.data.totalCount ?? res.data.total_results;
          if (typeof total === "number") {
            console.log(`  ✓ Count: ${total}`);
            const rc = await updateRoles("alnylam pharmaceuticals", total, "eightfold_api_us");
            updated += rc; break;
          }
          console.log(`  Data keys: ${Object.keys(res.data||{}).slice(0,10).join(', ')}`);
        } else if (res.status !== "err") {
          console.log(`  Resp: ${(res.text||'').slice(0, 150)}`);
        }
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 3. VANGUARD — Fresh domains and ATS attempts ─────────────────────────
  console.log("\n=== Vanguard ===");
  if (await isNull("vanguard")) {
    // Try Vanguard's actual dedicated job portal
    const vgDomains = [
      "https://jobs.vanguard.com",
      "https://careers.vanguard.com",
      "https://vanguardjobs.com",
      "https://www.vanguardjobs.com",
    ];
    for (const url of vgDomains) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} (final: ${finalUrl?.slice(0,60)})`);
      if (text && status === 200) {
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) {
          console.log(`  WD URLs: ${wdUrls.map(m=>m[0]).join(', ')}`);
          for (const wdMatch of wdUrls) {
            const [, t, p, s] = wdMatch;
            if (s.toLowerCase().includes('login')) continue;
            const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
            });
            await sleep(200);
            if (res.ok && typeof res.data?.total === "number") {
              console.log(`  ✓ WD: ${res.data.total}`);
              const rc = await updateRoles("vanguard", res.data.total, "workday_vanguard"); updated += rc;
            }
          }
        }
        const atsLinks = [...text.matchAll(/href="([^"]*(?:greenhouse|lever|icims|taleo|smartrecruiters|ashby)[^"]*)"/gi)].map(m=>m[1]);
        if (atsLinks.length > 0) console.log(`  ATS links: ${atsLinks.slice(0,5).join(', ')}`);
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 300)}`);
        if (!await isNull("vanguard")) break;
      }
    }
    // Vanguard uses their own career site - let's check main corporate site for career link
    if (await isNull("vanguard")) {
      const { text, status } = await fetchText("https://www.vanguard.com/us/portal/site-content/generic-content/careers-landing");
      await sleep(400);
      console.log(`  vanguard.com careers landing → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        console.log(`  WD URLs: ${wdUrls.map(m=>m[0]).join(', ')}`);
      }
    }
    // Try Lever
    if (await isNull("vanguard")) {
      for (const t of ["vanguard", "vanguardgroup", "thevanguardgroup"]) {
        const res = await fetchJson(`https://api.lever.co/v0/postings/${t}?mode=json`);
        await sleep(250);
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          console.log(`  Lever [${t}]: ${res.data.length}`);
          const rc = await updateRoles("vanguard", res.data.length, "lever_api"); updated += rc; break;
        }
      }
    }
    // Try Workday with corrected request body format
    if (await isNull("vanguard")) {
      const wdVariants = [
        ["vanguard", "1", "External_Vanguard_Careers"],
        ["vanguard", "1", "vanguard_careers"],
        ["vanguard", "1", "vanguard_career"],
        ["vanguard", "3", "External_Vanguard_Careers"],
        ["vanguard", "5", "External_Vanguard_Careers"],
        ["vanguard", "1", "campus_careers"],
        ["vanguard", "1", "experienced_careers"],
      ];
      for (const [t, p, s] of wdVariants) {
        const res = await fetchJson(
          `https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": UA },
            body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
          }
        );
        await sleep(150);
        if (res.ok && typeof res.data?.total === "number") {
          console.log(`  ✓ WD [${t}.wd${p}/${s}]: ${res.data.total}`);
          const rc = await updateRoles("vanguard", res.data.total, "workday_external"); updated += rc; break;
        }
      }
    }
  }
  if (await isNull("vanguard")) console.log("  → No data found");
  await sleep(600);

  // ── 4. MASIMO — Fresh domain attempts ────────────────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    const masimoDomains = [
      "https://careers.masimo.com",
      "https://jobs.masimo.com",
      "https://careers.masimosoundunited.com",
    ];
    for (const url of masimoDomains) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} (final: ${finalUrl?.slice(0, 70)})`);
      if (text && status === 200) {
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) {
          console.log(`  WD URLs: ${wdUrls.map(m=>m[0]).join(', ')}`);
          for (const wdMatch of wdUrls) {
            const [, t, p, s] = wdMatch;
            if (s.toLowerCase().includes('login')) continue;
            const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
            });
            await sleep(200);
            if (res.ok && typeof res.data?.total === "number") {
              console.log(`  ✓ WD: ${res.data.total}`);
              const rc = await updateRoles("masimo", res.data.total, "workday_masimo"); updated += rc;
            }
          }
        }
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 300)}`);
        const atsLinks = [...text.matchAll(/href="([^"]*(?:greenhouse|lever|workday|icims|taleo|ashby|jobvite)[^"]*)"/gi)].map(m=>m[1]);
        if (atsLinks.length > 0) console.log(`  ATS links: ${atsLinks.slice(0,5).join(', ')}`);
        const countMatch = plain.match(/(\d[\d,]+)\s*(?:job|position|opening|opportunit)/i);
        if (countMatch) console.log(`  Count hint: ${countMatch[0]}`);
        if (!await isNull("masimo")) break;
      }
    }
    // Try Adzuna for masimo
    if (await isNull("masimo")) {
      // Try all supported countries
      for (const country of ["us", "gb", "ca"]) {
        const res = await fetchJson(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=masimo&results_per_page=1`);
        await sleep(300);
        if (res.ok && typeof res.data?.count === "number" && res.data.count > 0) {
          console.log(`  Adzuna [${country}]: ${res.data.count}`);
          const rc = await updateRoles("masimo", res.data.count, `adzuna_api_${country}`); updated += rc; break;
        }
      }
    }
    // Try Workday for masimo
    if (await isNull("masimo")) {
      const wdVariants = [
        ["masimo", "5", "masimo"],
        ["masimo", "3", "masimo"],
        ["masimo", "1", "masimo"],
        ["masimo", "5", "External"],
        ["masimo", "5", "masimocareers"],
        ["soundunited", "5", "External"],
      ];
      for (const [t, p, s] of wdVariants) {
        const res = await fetchJson(
          `https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }) }
        );
        await sleep(150);
        if (res.ok && typeof res.data?.total === "number") {
          console.log(`  ✓ WD [${t}.wd${p}/${s}]: ${res.data.total}`);
          const rc = await updateRoles("masimo", res.data.total, "workday_masimo"); updated += rc; break;
        }
      }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");
  await sleep(600);

  // ── 5. MEITUAN — Chinese career sites ────────────────────────────────────
  console.log("\n=== Meituan ===");
  if (await isNull("meituan")) {
    const meituanUrls = [
      "https://zhaopin.meituan.com",
      "https://job.meituan.com",
      "https://careers.meituan.com",
      "https://campus.meituan.com",
    ];
    for (const url of meituanUrls) {
      const { text, status, finalUrl } = await fetchText(url, { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" });
      await sleep(400);
      console.log(`  ${url} → ${status} (final: ${finalUrl?.slice(0, 70)}) bytes=${text?.length}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        // Look for job count in page
        const countMatch = text.match(/"(?:total|count|totalCount|jobCount)"\s*:\s*(\d+)/i)
                         || text.match(/共\s*(\d+)\s*(?:个|条)/i)  // Chinese "total N items"
                         || text.match(/(\d+)\s*(?:个岗位|个职位|个招聘)/i);  // Chinese "N positions"
        if (countMatch) {
          console.log(`  Count: ${countMatch[1] || countMatch[0]}`);
          const n = parseInt(countMatch[1]);
          if (n > 0 && n < 100000) {
            const rc = await updateRoles("meituan", n, "meituan_career_page"); updated += rc; break;
          }
        }
        // Look for API calls
        const apiUrls = [...text.matchAll(/["']((?:https?:\/\/[\w.-]+)?\/api\/[^"'\s]{5,80})["']/gi)].map(m=>m[1]);
        if (apiUrls.length > 0) console.log(`  API URLs: ${apiUrls.slice(0,5).join(', ')}`);
      }
    }
    // Try fetching Meituan job search API directly
    if (await isNull("meituan")) {
      const apiAttempts = [
        "https://zhaopin.meituan.com/api/position/query?cityId=0&keyword=&pageSize=1&pageIndex=1",
        "https://job.meituan.com/api/positions?limit=1&offset=0",
        "https://careers.meituan.com/api/jobs?page=1&pageSize=1",
      ];
      for (const url of apiAttempts) {
        const res = await fetchJson(url, { headers: { "Accept": "application/json", "Referer": "https://zhaopin.meituan.com" } });
        await sleep(300);
        console.log(`  API ${url.slice(8, 60)} → ${res.status}`);
        if (res.ok && res.data) {
          const total = res.data.total ?? res.data.count ?? res.data.data?.total;
          if (typeof total === "number" && total > 0) {
            console.log(`  ✓ Count: ${total}`);
            const rc = await updateRoles("meituan", total, "meituan_api"); updated += rc; break;
          }
          console.log(`  Data: ${JSON.stringify(res.data).slice(0, 200)}`);
        }
      }
    }
  }
  if (await isNull("meituan")) console.log("  → No data found");
  await sleep(600);

  // ── 6. WNS GLOBAL — Try alternate approaches ──────────────────────────────
  console.log("\n=== WNS Global ===");
  if (await isNull("wns global")) {
    // Check if WNS uses a known ATS - try Workday, iCIMS, Taleo
    const wnsWdVariants = [
      ["wns", "5", "External"],
      ["wns", "3", "External"],
      ["wns", "1", "wns_careers"],
      ["wnsglobal", "5", "External"],
      ["wns", "5", "wns"],
    ];
    for (const [t, p, s] of wnsWdVariants) {
      const res = await fetchJson(
        `https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }) }
      );
      await sleep(150);
      if (res.ok && typeof res.data?.total === "number") {
        console.log(`  ✓ WD [${t}.wd${p}/${s}]: ${res.data.total}`);
        const rc = await updateRoles("wns global", res.data.total, "workday_wns"); updated += rc; break;
      }
    }
    // Try Greenhouse/Lever for WNS
    if (await isNull("wns global")) {
      for (const t of ["wns", "wnsglobal", "wns-global"]) {
        const ghRes = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`);
        await sleep(200);
        if (ghRes.ok && Array.isArray(ghRes.data?.jobs)) { console.log(`  GH [${t}]: ${ghRes.data.jobs.length}`); if (ghRes.data.jobs.length > 0) { const rc = await updateRoles("wns global", ghRes.data.jobs.length, "greenhouse_api"); updated += rc; break; } }
      }
    }
    // Try Naukri API for WNS
    if (await isNull("wns global")) {
      const { text, status } = await fetchText("https://www.naukri.com/wns-global-jobs", {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-IN,en;q=0.9",
      });
      await sleep(500);
      console.log(`  Naukri WNS page → ${status} (${text?.length} bytes)`);
      if (text && status === 200) {
        const countMatch = text.match(/"noOfJobs"\s*:\s*(\d+)/)
                        || text.match(/"jobCount"\s*:\s*(\d+)/)
                        || text.match(/"count"\s*:\s*(\d+)/)
                        || text.match(/(\d[\d,]+)\s+Jobs?\s+(?:in|at|for)/i);
        if (countMatch) {
          const n = parseInt((countMatch[1] || "").replace(/,/g, ""));
          console.log(`  Naukri count: ${n}`);
          if (n > 0 && n < 50000) { const rc = await updateRoles("wns global", n, "naukri_scrape"); updated += rc; }
        }
        // Show a snippet
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Naukri preview: ${plain.slice(0, 400)}`);
      }
    }
    // Try LinkedIn Careers (lite approach)
    if (await isNull("wns global")) {
      const { text, status } = await fetchText("https://www.linkedin.com/company/wns-global-services/jobs/", {
        "Accept-Language": "en-US,en;q=0.9",
      });
      await sleep(500);
      console.log(`  LinkedIn WNS → ${status} (${text?.length} bytes)`);
      if (text && status === 200) {
        const count = text.match(/"numResults"\s*:\s*(\d+)/i)
                    || text.match(/(\d+)\s+jobs?\s+at\s+WNS/i)
                    || text.match(/"jobCount"\s*:\s*(\d+)/i);
        if (count) { console.log(`  LinkedIn: ${count[1]}`); }
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 7. INDIA PSUs — targeted fresh attempts ───────────────────────────────
  console.log("\n=== India PSUs Final Pass ===");

  // VIJAYA DIAGNOSTIC — try the correct careers page
  if (await isNull("vijaya diagnostic")) {
    const urls = [
      "https://www.vijayadiagnostic.com/careers",
      "https://www.vijayadiagnostic.com/career",
      "https://vijayadiagnostic.com/careers",
    ];
    for (const url of urls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  Vijaya: ${url} → ${status} (final: ${finalUrl?.slice(0,60)})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        const count = plain.match(/(\d+)\s+(?:vacancy|vacancies|job|opening|position)/i);
        if (count) { console.log(`  Count: ${count[0]}`); const n = parseInt(count[1]); if (n > 0) { const rc = await updateRoles("vijaya diagnostic", n, "career_page_count"); updated += rc; break; } }
        // Look for job links
        const jobLinks = [...text.matchAll(/href="([^"]*(?:job|career|apply)[^"]*)"/gi)].map(m=>m[1]).filter(h => !h.includes('javascript') && h.length < 200);
        console.log(`  Job links: ${jobLinks.slice(0,5).join(', ')}`);
        break;
      }
    }
  }

  // PFC (Power Finance Corporation) — government PSU
  if (await isNull("pfc ltd")) {
    const urls = [
      "https://www.pfcindia.com/Home/CareerSection",
      "https://www.pfcindia.com/careers",
      "https://pfcindia.com/Home/CareerSection",
    ];
    for (const url of urls) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  PFC: ${url} → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        const vacancy = [...plain.matchAll(/(?:vacancy|vacancies|post|appointment|recruitment)\s*[\w\s,]*\s*:?\s*(\d+)/gi)];
        if (vacancy.length > 0) { console.log(`  Vacancy: ${vacancy.map(m=>m[0]).join(', ')}`); }
        const tableRows = [...text.matchAll(/<tr[^>]*>[\s\S]{20,500}?<\/tr>/gi)];
        console.log(`  Table rows: ${tableRows.length}`);
        // Count links that look like recruitment notices
        const noticeLinks = [...text.matchAll(/href="([^"]*(?:recruit|appoint|career|notification|advertisement)[^"]*)"/gi)].map(m=>m[1]);
        console.log(`  Notice links: ${noticeLinks.length} | ${noticeLinks.slice(0,5).join(', ')}`);
        break;
      }
    }
  }

  // STEEL AUTHORITY OF INDIA — SAIL
  if (await isNull("steel authority of india")) {
    const urls = [
      "https://www.sail.co.in/en/career",
      "https://www.sail.co.in/career",
      "https://sailcareers.com",
      "https://www.sail.co.in/en/recruitment",
    ];
    for (const url of urls) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  SAIL: ${url} → ${status} (${text?.length} bytes)`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        // Count job/vacancy items
        const items = [...text.matchAll(/<li[^>]*>[\s\S]{10,300}?(?:recruit|vacancy|post|appoint)[\s\S]{0,200}?<\/li>/gi)];
        console.log(`  List items with vacancy/recruit: ${items.length}`);
        break;
      }
    }
  }

  // USHA MARTIN — fresh attempt
  if (await isNull("usha martin")) {
    const { text, status } = await fetchText("https://www.ushamartin.com/join-us/");
    await sleep(400);
    console.log(`  Usha Martin join-us → ${status} (${text?.length} bytes)`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 500)}`);
      // Look for specific job items - not form elements
      const jobItems = [...text.matchAll(/<(?:article|div)[^>]*class="[^"]*(?:job|position|vacancy|opening)[^"]*"[^>]*>/gi)];
      console.log(`  Job item elements: ${jobItems.length}`);
      // Look for table rows in a careers table
      const tableRows = [...text.matchAll(/<tr[^>]*>[\s\S]{30,500}?<\/tr>/gi)].filter(m => m[0].includes('href') || m[0].includes('apply'));
      console.log(`  Clickable table rows: ${tableRows.length}`);
      if (tableRows.length > 0) {
        console.log(`  First row: ${tableRows[0][0].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,150)}`);
        const rc = await updateRoles("usha martin", tableRows.length, "career_page_rows"); updated += rc;
      }
    }
  }

  // GSPL — try parent GSPC and different variants
  if (await isNull("gspl")) {
    const urls = [
      "https://www.gspl.in/career",
      "https://gspl.co.in",
      "https://www.gspcgas.com/career",
      "https://www.gspcgas.com/careers",
    ];
    for (const url of urls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  GSPL: ${url} → ${status} (final: ${finalUrl?.slice(0,60)})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        break;
      }
    }
  }

  // BAYER CROPSCIENCE INDIA — fix 422 with correct WD body
  if (await isNull("bayer cropscience india")) {
    // 422 means invalid request body format — try different body formats
    const bodies = [
      JSON.stringify({ limit: 20, offset: 0, searchText: "", appliedFacets: {} }),
      JSON.stringify({ limit: 20, offset: 0, searchText: "", appliedFacets: {}, returnFacets: false }),
      JSON.stringify({ searchText: "", limit: 1, offset: 0, appliedFacets: {}, selectedFlexFieldFilters: {}, savedSearchID: null }),
    ];
    for (const body of bodies) {
      const res = await fetchJson("https://bayer.wd3.myworkdayjobs.com/wday/cxs/bayer/Bayer_Global/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA, "Accept": "application/json" },
        body,
      });
      await sleep(300);
      console.log(`  Bayer WD body attempt → ${res.status} | data: ${JSON.stringify(res.data||{}).slice(0,200)}`);
      if (res.ok && typeof res.data?.total === "number") {
        console.log(`  ✓ Bayer global total: ${res.data.total}`);
        // Now filter for India/CropScience
        const indiaSearch = await fetchJson("https://bayer.wd3.myworkdayjobs.com/wday/cxs/bayer/Bayer_Global/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": UA },
          body: JSON.stringify({ limit: 20, offset: 0, searchText: "India", appliedFacets: {}, returnFacets: false }),
        });
        await sleep(300);
        if (indiaSearch.ok && typeof indiaSearch.data?.total === "number") {
          console.log(`  Bayer India jobs: ${indiaSearch.data.total}`);
          const rc = await updateRoles("bayer cropscience india", indiaSearch.data.total, "workday_bayer_india_search"); updated += rc;
        }
        break;
      }
    }
    // Try Bayer CropScience India careers page directly
    if (await isNull("bayer cropscience india")) {
      const { text, status } = await fetchText("https://www.bayer.com/en/in/bayer-in-india");
      await sleep(400);
      console.log(`  bayer.com/en/in → ${status}`);
      if (text && status === 200) {
        const careerLinks = [...text.matchAll(/href="([^"]*(?:career|job|talent)[^"]*)"/gi)].map(m=>m[1]);
        console.log(`  Career links: ${careerLinks.slice(0,5).join(', ')}`);
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
