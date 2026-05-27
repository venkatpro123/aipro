// fix-round3-targeted.mjs
// Deep parse Phoenix Mills, Kolte-Patil, WNS, Bayer/Alnylam/Insulet/Qlik/Masimo/Vanguard

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
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

async function fetchJSON(url, opts = {}) {
  try {
    const headers = { Accept: "application/json", "User-Agent": "Mozilla/5.0", ...HEADERS, ...(opts.headers || {}) };
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000), ...opts });
    if (!res.ok) return { ok: false, status: res.status };
    const text = await res.text();
    try { return { ok: true, data: JSON.parse(text), raw: text }; }
    catch { return { ok: true, data: null, raw: text }; }
  } catch (e) { return { ok: false, error: e.message }; }
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

async function tryWorkday(tenant, site, pod) {
  const { ok, data } = await fetchJSON(
    `https://${tenant}.wd${pod}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
    { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
      headers: { "Content-Type": "application/json" } }
  );
  return (ok && typeof data?.total === "number") ? data.total : null;
}

async function tryGreenhouse(token) {
  const { ok, data } = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
  await sleep(300);
  return (ok && Array.isArray(data?.jobs)) ? data.jobs.length : null;
}

async function tryLever(token) {
  const { ok, data } = await fetchJSON(`https://api.lever.co/v0/postings/${token}?mode=json`);
  await sleep(300);
  return (ok && Array.isArray(data)) ? data.length : null;
}

async function tryAshby(token) {
  const { ok, data } = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${token}`);
  await sleep(300);
  return (ok && Array.isArray(data?.jobPostings)) ? data.jobPostings.length : null;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. PHOENIX MILLS — careers.thephoenixmills.com returned 200! ──────────
  console.log("=== Phoenix Mills ===");
  if (await isNull("phoenix mills")) {
    const { text, status } = await fetchText("https://careers.thephoenixmills.com");
    await sleep(400);
    console.log(`  careers.thephoenixmills.com → ${status}`);
    if (text && status === 200) {
      // Show first 1000 chars to understand page structure
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Content preview: ${plain.slice(0, 300)}`);

      // Count job-like patterns
      const vacCount = text.match(/(\d+)\s+(?:vacancy|vacancies|job|opening|position|career|role)/i);
      if (vacCount) { console.log(`  Explicit count: ${vacCount[0]}`); const n = parseInt(vacCount[1]); if (n > 0 && n < 5000) { const rc = await updateRoles("phoenix mills", n, "career_page_scrape"); updated += rc; } }

      // Count job listing items - divs or list items with job class
      const jobDivs = [...text.matchAll(/class="[^"]*(?:job|position|role|vacancy|career)[^"]*"/gi)].length;
      console.log(`  Job-class elements: ${jobDivs}`);

      // Count Apply links
      const applyLinks = [...text.matchAll(/(?:apply|apply-now|btn-apply)[^<]*apply/gi)].length;
      const applyBtn = [...text.matchAll(/<a[^>]*>(?:\s*)Apply(?:\s+Now)?(?:\s*)<\/a>/gi)].length;
      console.log(`  Apply links: ${applyLinks} | Apply buttons: ${applyBtn}`);

      // Look for JSON-LD
      const jsonLd = [...text.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
      for (const jl of jsonLd) {
        try {
          const d = JSON.parse(jl[1]);
          if (d['@type'] === 'JobPosting' || d['@graph']?.some(i => i['@type'] === 'JobPosting')) {
            console.log(`  JSON-LD JobPosting found!`);
          }
        } catch {}
      }

      // Check for ATS URLs
      const atsUrls = [...text.matchAll(/https?:\/\/[\w.-]+(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|icims\.com)[^"'\s<>]*/gi)];
      if (atsUrls.length > 0) { console.log(`  ATS URLs: ${atsUrls.slice(0, 3).map(m => m[0]).join(', ')}`); }

      // Count all <a> tags with different text/href patterns
      const allAs = [...text.matchAll(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gis)];
      const jobAs = allAs.filter(m => {
        const href = m[1], text = m[2].replace(/<[^>]+>/g, '').trim();
        return text.toLowerCase().includes('apply') || href.includes('job') || href.includes('career') || href.includes('position');
      });
      console.log(`  Total <a>: ${allAs.length} | Job-related <a>: ${jobAs.length}`);
      for (const a of jobAs.slice(0, 8)) {
        const txt = a[2].replace(/<[^>]+>/g, '').trim().slice(0, 50);
        console.log(`    → "${txt}" | href: ${a[1].slice(0, 60)}`);
      }

      if (await isNull("phoenix mills") && jobAs.length > 0 && jobAs.length < 200) {
        console.log(`  → Using ${jobAs.length} job-related links as job count`);
        // Only if these are clearly distinct job listings
      }
    }
  }
  await sleep(600);

  // ── 2. KOLTE-PATIL — Apply buttons = 5 potential jobs ────────────────────
  console.log("\n=== Kolte-Patil Developers (deep parse) ===");
  if (await isNull("kolte patil developers")) {
    const { text, status } = await fetchText("https://www.koltepatil.com/careers");
    await sleep(400);
    console.log(`  koltepatil.com/careers → ${status}`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Content preview: ${plain.slice(0, 300)}`);

      // Find all <a> elements that look like Apply buttons (precise matching)
      const applyAs = [...text.matchAll(/<a[^>]*>\s*(?:Apply|Apply Now|Apply Here|Apply Online)\s*<\/a>/gi)];
      console.log(`  Exact 'Apply' <a>: ${applyAs.length}`);
      for (const a of applyAs) console.log(`    ${a[0].slice(0, 100)}`);

      // Find vacancy/job count in text
      const vacText = plain.match(/(\d+)\s+(?:current\s+)?(?:open\s+)?(?:vacancy|vacancies|opening|position)/i);
      if (vacText) { console.log(`  → Vacancy text: "${vacText[0]}"`); }

      // Try to find job posting sections by their HR content
      const sections = [...text.matchAll(/(?:Department|Location|Experience|Qualification|Apply)[^<]{0,200}/gi)];
      console.log(`  Job-like sections: ${sections.length}`);

      // Count unique job posting containers by counting "View Details" or "Know More" CTAs near position titles
      const ctaLinks = [...text.matchAll(/(?:View Details|Know More|Apply Now|View Job)[^<]*<\/a>/gi)].length;
      console.log(`  CTA links: ${ctaLinks}`);

      // The "Apply" in HTML tags from last run was "<a...>Apply...</a>" links - count those precisely
      const applyBtns = [...text.matchAll(/(?:apply-btn|btn-apply|apply_btn|apply-now)/gi)].length;
      console.log(`  Apply-class elements: ${applyBtns}`);

      // If we found 5 apply buttons in previous run (using broader pattern), let's see the context
      const applyPattern = [...text.matchAll(/<[^>]*apply[^>]*>/gi)];
      console.log(`  All apply-tagged elements: ${applyPattern.length}`);
      // Show each unique one
      const uniqueApply = [...new Set(applyPattern.map(m => m[0].slice(0, 100)))];
      for (const u of uniqueApply.slice(0, 10)) console.log(`    ${u}`);
    }
  }
  await sleep(600);

  // ── 3. WNS GLOBAL — Deep parse career page ───────────────────────────────
  console.log("\n=== WNS Global (deep parse) ===");
  if (await isNull("wns global")) {
    const { text, status } = await fetchText("https://www.wns.com/careers");
    await sleep(400);
    console.log(`  wns.com/careers → ${status}`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Content preview: ${plain.slice(0, 500)}`);

      // Look for job count
      const countMatch = text.match(/(\d+)\s*(?:\+)?\s*(?:job|position|opportunit|opening|role|career)/i);
      if (countMatch) console.log(`  Count: ${countMatch[0]}`);

      // Look for ATS URLs
      const atsUrls = [...text.matchAll(/https?:\/\/[\w.-]+(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|icims\.com|smartrecruiters\.com)[^"'\s<>]*/gi)];
      if (atsUrls.length > 0) {
        console.log(`  ATS URLs found: ${atsUrls.slice(0,3).map(m=>m[0]).join(', ')}`);
      }

      // WNS has specific career subdomain
      const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/gi)];
      if (wdUrls.length > 0) console.log(`  WD URLs: ${wdUrls.map(m=>m[0]).join(', ')}`);

      // Try the WNS Workday with more tenant names
      if (wdUrls.length === 0) {
        for (const pod of ["1","3","5"]) {
          for (const tn of ["wns", "wnsglobal", "wnsholdings"]) {
            for (const site of ["wns_careers", "WNS", "WNS_Careers", "careers"]) {
              const c = await tryWorkday(tn, site, pod); await sleep(100);
              if (c !== null) { console.log(`  WD [${tn}.wd${pod}/${site}]: ${c}`); const rc = await updateRoles("wns global", c, "workday_careers"); updated += rc; break; }
            }
            if (!await isNull("wns global")) break;
          }
          if (!await isNull("wns global")) break;
        }
      }

      // Check for linked job search pages
      const jobLinks = [...text.matchAll(/href="([^"]*(?:job|career|position)[^"]*)"/gi)].map(m => m[1]);
      const extJobLinks = jobLinks.filter(h => h.startsWith('http'));
      console.log(`  External job links: ${extJobLinks.slice(0, 5).join(', ')}`);
    }
  }
  // Try WNS's actual job search if their main careers redirects somewhere
  if (await isNull("wns global")) {
    const { text, status } = await fetchText("https://jobs.wns.com");
    await sleep(400);
    console.log(`  jobs.wns.com → ${status}`);
    if (text && status === 200) {
      const countMatch = text.match(/(\d+)\s*(?:\+)?\s*(?:job|position|opportunit|opening)/i);
      if (countMatch) console.log(`  Count: ${countMatch[0]}`);
      const atsUrls = [...text.matchAll(/https?:\/\/[\w.-]+(?:greenhouse\.io|lever\.co|myworkdayjobs\.com|icims\.com)[^"'\s<>]*/gi)];
      if (atsUrls.length > 0) console.log(`  ATS: ${atsUrls[0][0]}`);
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 4. BAYER CROPSCIENCE INDIA — Bayer known Workday ─────────────────────
  console.log("\n=== Bayer CropScience India ===");
  if (await isNull("bayer cropscience india")) {
    // Bayer's known Workday: bayer.wd3.myworkdayjobs.com is confirmed by previous attempts
    // Try all Bayer Workday combinations
    const bayerCombos = [
      ["bayer", "3", "BAG"],
      ["bayer", "3", "Bayer"],
      ["bayer", "3", "CropScience"],
      ["bayer", "3", "Bayer_CropScience"],
      ["bayer", "1", "Bayer"],
      ["bayer", "1", "BAG"],
      ["bayer", "5", "Bayer"],
      ["bayercropscience", "3", "bcs_careers"],
      ["bayercropscience", "1", "bcs_careers"],
    ];
    let bayerGlobalCount = null;
    for (const [t, pod, s] of bayerCombos) {
      const c = await tryWorkday(t, s, pod); await sleep(200);
      if (c !== null) {
        console.log(`  ✓ Bayer WD [${t}.wd${pod}/${s}]: ${c} total jobs`);
        bayerGlobalCount = c;
        // Try to filter by India
        // Workday India location facet (try common location IDs)
        for (const locationId of ["India", "IN", "bc33aa3152ec42d4995f4791a106ed09", "9c6f44e0eb8501a51ecb1d4e016407ea"]) {
          const res = await fetchJSON(
            `https://${t}.wd${pod}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
            {
              method: "POST",
              body: JSON.stringify({ appliedFacets: { "Location_Country": [locationId] }, limit: 1, offset: 0, searchText: "" }),
              headers: { "Content-Type": "application/json" }
            }
          );
          await sleep(200);
          if (res.ok && typeof res.data?.total === "number" && res.data.total > 0) {
            console.log(`  India filter [${locationId}]: ${res.data.total} jobs`);
            const rc = await updateRoles("bayer cropscience india", res.data.total, `workday_india_filter`); updated += rc; break;
          }
        }
        // Also try searching for India in job text
        const indiaSearch = await fetchJSON(
          `https://${t}.wd${pod}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
          {
            method: "POST",
            body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "India" }),
            headers: { "Content-Type": "application/json" }
          }
        );
        await sleep(200);
        if (indiaSearch.ok && typeof indiaSearch.data?.total === "number") {
          console.log(`  "India" text search: ${indiaSearch.data.total} jobs`);
          if (indiaSearch.data.total > 0 && await isNull("bayer cropscience india")) {
            // Use India search as proxy for Bayer India jobs
            const rc = await updateRoles("bayer cropscience india", indiaSearch.data.total, `workday_india_search`);
            updated += rc;
          }
        }
        break;
      }
    }
    if (await isNull("bayer cropscience india")) {
      // Try fetching Bayer India careers page directly
      const { text, status } = await fetchText("https://www.bayer.com/en/in/careers");
      await sleep(400);
      console.log(`  bayer.com/en/in/careers → ${status}`);
      if (text && status === 200) {
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/gi)];
        if (wdUrls.length > 0) { console.log(`  WD URL: ${wdUrls[0][0]}`); }
        const countMatch = text.match(/(\d+)\s+(?:job|position|opportunit|opening)/i);
        if (countMatch) console.log(`  Count: ${countMatch[0]}`);
      }
    }
  }
  if (await isNull("bayer cropscience india")) console.log("  → No data found");
  await sleep(600);

  // ── 5. ALNYLAM — Try direct Workday URL from known pharma patterns ────────
  console.log("\n=== Alnylam Pharmaceuticals ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // Try fetching Alnylam's actual jobs listing API (the SPA fetches from somewhere)
    const alnApiUrls = [
      "https://jobs.alnylam.com/api/jobs",
      "https://jobs.alnylam.com/api/v1/jobs",
      "https://jobs.alnylam.com/careers/api/jobs",
      "https://alnylam.com/careers/api/jobs",
    ];
    for (const url of alnApiUrls) {
      const { ok, data, status } = await fetchJSON(url); await sleep(300);
      console.log(`  ${url.slice(8, 50)} → ${status ?? 'ok'}`);
      if (!ok || !data) continue;
      const c = data.total ?? data.count ?? data.totalCount ?? (Array.isArray(data.jobs) ? data.jobs.length : null) ?? (Array.isArray(data) ? data.length : null);
      if (c !== null) { console.log(`  → ${c} jobs`); const rc = await updateRoles("alnylam pharmaceuticals", c, "alnylam_api"); updated += rc; break; }
    }
    // Try specific pharma Workday tenants
    if (await isNull("alnylam pharmaceuticals")) {
      const alnWd = [
        ["alnylam", "1", "External"],
        ["alnylam", "1", "alnylam"],
        ["alnylam", "3", "External"],
        ["alnylam", "5", "External"],
        ["alnylampharmaceuticals", "1", "External"],
        ["alnylampharmaceuticals", "3", "External"],
      ];
      for (const [t, p, s] of alnWd) {
        const c = await tryWorkday(t, s, p); await sleep(200);
        if (c !== null) { console.log(`  WD [${t}.wd${p}/${s}]: ${c}`); const rc = await updateRoles("alnylam pharmaceuticals", c, "workday_careers"); updated += rc; break; }
      }
    }
    // Try fetching the jobs page with a JSON Accept header
    if (await isNull("alnylam pharmaceuticals")) {
      const { ok, data, raw, status } = await fetchJSON("https://jobs.alnylam.com/careers");
      await sleep(300);
      console.log(`  jobs.alnylam.com/careers [JSON] → ${status ?? 'ok'}`);
      if (ok && raw) {
        const countMatch = raw.match(/"total"\s*:\s*(\d+)/);
        if (countMatch) console.log(`  total in JSON: ${countMatch[1]}`);
        const apiUrl = raw.match(/['"](?:https?:\/\/[^'"]*\/api\/[^'"]*(?:job|position)[^'"]*)['"]/i)?.[1];
        if (apiUrl) console.log(`  API URL hint: ${apiUrl}`);
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 6. INSULET — Try Insulet iCIMS HTML page ─────────────────────────────
  console.log("\n=== Insulet ===");
  if (await isNull("insulet")) {
    // iCIMS returns 405 for all methods. Try fetching the main iCIMS search page as HTML
    // iCIMS job search page URL format differs - try the portal URL
    const insuletUrls = [
      "https://careers-insulet.icims.com/jobs/searchjobs/",
      "https://careers-insulet.icims.com",
      "https://careers-insulet.icims.com/jobs/intro",
      "https://careers-insulet.icims.com/jobs/searchjobs/?in_iframe=1",
    ];
    for (const url of insuletUrls) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 55)} → ${status}`);
      if (!text || status !== 200) continue;
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 200)}`);
      // iCIMS shows job count as "X Results" or "Showing X jobs"
      const countMatch = text.match(/(?:Showing|Found|Results?|Jobs?)\s*(\d+)/i)
                       || text.match(/(\d+)\s*(?:job|result|position|opening)/i)
                       || text.match(/iCIMS_JobsCount[^>]*>\s*(\d+)/i);
      if (countMatch) {
        const n = parseInt(countMatch[1]);
        console.log(`  → ${n} (${countMatch[0]})`);
        if (n > 0 && n < 5000) { const rc = await updateRoles("insulet", n, "icims_scrape"); updated += rc; break; }
      }
    }
    // Try Greenhouse/Lever for Insulet
    if (await isNull("insulet")) {
      for (const t of ["insulet", "insuletcorp", "insuletcorporation"]) {
        const c = await tryGreenhouse(t); console.log(`  GH [${t}]: ${c ?? 'not found'}`);
        if (c !== null) { const rc = await updateRoles("insulet", c, "greenhouse_api"); updated += rc; break; }
        const c2 = await tryLever(t); console.log(`  Lever [${t}]: ${c2 ?? 'not found'}`);
        if (c2 !== null) { const rc = await updateRoles("insulet", c2, "lever_api"); updated += rc; break; }
      }
    }
    // Try Adzuna for Insulet
    if (await isNull("insulet")) {
      for (const country of ["us", "gb"]) {
        const adzUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=insulet&results_per_page=1`;
        const { ok, data } = await fetchJSON(adzUrl); await sleep(500);
        if (ok && typeof data?.count === "number" && data.count > 0) {
          console.log(`  Adzuna [${country}]: ${data.count}`);
          const rc = await updateRoles("insulet", data.count, `adzuna_api_${country}`); updated += rc; break;
        } else { console.log(`  Adzuna [${country}]: ${data?.count ?? 'not found'}`); }
      }
    }
  }
  if (await isNull("insulet")) console.log("  → No data found");
  await sleep(600);

  // ── 7. MASIMO — Try Taleo/PageUp/ADP patterns ────────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    // Try Taleo (Oracle) - common at medical companies
    const taUrls = [
      "https://masimo.taleo.net/careersection/ex/jobsearch.ftl",
      "https://oraclecloud.masimo.com",
    ];
    for (const url of taUrls) {
      const { text, status } = await fetchText(url); await sleep(300);
      console.log(`  ${url.slice(8, 50)} → ${status}`);
      if (text && status === 200) {
        const countMatch = text.match(/(\d+)\s+(?:job|position|result|opening)/i);
        if (countMatch) console.log(`  Taleo count: ${countMatch[0]}`);
      }
    }
    // Try Jobvite (common for medical device companies)
    for (const token of ["masimo", "masimomedical", "masimocorp"]) {
      const { ok, data } = await fetchJSON(`https://api.jobvite.com/api/v2/job?api=masimocorporation&sc=true`); await sleep(300);
      if (ok && data) console.log(`  Jobvite data: ${JSON.stringify(data).slice(0, 100)}`);
    }
    // Try fetching Masimo's main website to find career link
    const { text, status } = await fetchText("https://www.masimo.com/company/careers/");
    await sleep(400);
    console.log(`  masimo.com/company/careers/ → ${status}`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 300)}`);
      const atsUrls = [...text.matchAll(/https?:\/\/[\w.-]+(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|icims\.com|taleo\.net|jobvite\.com|smartrecruiters\.com)[^"'\s<>]*/gi)];
      if (atsUrls.length > 0) { console.log(`  ATS URLs: ${atsUrls.slice(0,3).map(m=>m[0]).join(', ')}`); }
      const countMatch = text.match(/(\d+)\s+(?:job|position|result|opening|role)/i);
      if (countMatch) console.log(`  Count hint: ${countMatch[0]}`);
    }
    // Try Adzuna for Masimo
    if (await isNull("masimo")) {
      const adzUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=masimo&results_per_page=1`;
      const { ok, data } = await fetchJSON(adzUrl); await sleep(500);
      console.log(`  Adzuna [us]: ${data?.count ?? 'not found'}`);
      if (ok && typeof data?.count === "number" && data.count > 0) {
        const rc = await updateRoles("masimo", data.count, "adzuna_api_us"); updated += rc;
      }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");
  await sleep(600);

  // ── 8. QLIK/CLOUD SOFTWARE GROUP — Try more approaches ───────────────────
  console.log("\n=== Qlik ===");
  if (await isNull("qlik")) {
    // Try fetching their actual career page to find ATS
    const qlikUrls = [
      "https://www.qlik.com/us/company/careers",
      "https://careers.qlik.com",
      "https://jobs.qlik.com",
    ];
    for (const url of qlikUrls) {
      const { text, status, finalUrl } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 45)} → ${status} → ${finalUrl?.slice(8, 60)}`);
      if (!text || status !== 200) continue;
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 300)}`);
      const atsUrls = [...text.matchAll(/https?:\/\/[\w.-]+(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|icims\.com)[^"'\s<>]*/gi)];
      if (atsUrls.length > 0) {
        console.log(`  ATS URLs: ${atsUrls.slice(0,3).map(m=>m[0]).join(', ')}`);
        // Parse out WD URL
        const wdMatch = atsUrls[0][0].match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/i);
        if (wdMatch) {
          const c = await tryWorkday(wdMatch[1], wdMatch[3], wdMatch[2]); await sleep(300);
          if (c !== null) { console.log(`  WD: ${c}`); const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
        }
        const ghMatch = atsUrls[0][0].match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
        if (ghMatch) {
          const c = await tryGreenhouse(ghMatch); await sleep(300);
          if (c !== null) { console.log(`  GH [${ghMatch}]: ${c}`); const rc = await updateRoles("qlik", c, "greenhouse_api"); updated += rc; break; }
        }
      }
      const countMatch = text.match(/(\d+)\s+(?:job|position|result|opening|role)/i);
      if (countMatch) console.log(`  Count hint: ${countMatch[0]}`);
      break;
    }
    // Cloud Software Group Workday
    if (await isNull("qlik")) {
      const csgWd = [
        ["cloudsoftwaregroup", "3", "Cloud_Software_Group_Careers"],
        ["cloudsoftwaregroup", "3", "CSG_Careers"],
        ["cloudsoftwaregroup", "1", "Cloud_Software_Group_Careers"],
        ["cloudsoftwaregroup", "5", "Cloud_Software_Group_Careers"],
        ["vistaeq", "3", "vista_careers"],
        ["vista", "3", "vista_careers"],
      ];
      for (const [t, p, s] of csgWd) {
        const c = await tryWorkday(t, s, p); await sleep(200);
        if (c !== null) { console.log(`  WD [${t}.wd${p}/${s}]: ${c}`); const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
      }
    }
    // Try Adzuna for Qlik
    if (await isNull("qlik")) {
      const adzUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=qlik&results_per_page=1`;
      const { ok, data } = await fetchJSON(adzUrl); await sleep(500);
      console.log(`  Adzuna [us/qlik]: ${data?.count ?? 'not found'}`);
      if (ok && typeof data?.count === "number" && data.count > 0) {
        const rc = await updateRoles("qlik", data.count, "adzuna_api_us"); updated += rc;
      }
    }
  }
  if (await isNull("qlik")) console.log("  → No data found");
  await sleep(600);

  // ── 9. VANGUARD — Try WP namespaces and scrape job count ──────────────────
  console.log("\n=== Vanguard ===");
  if (await isNull("vanguard")) {
    // The WP site has "cws" namespace - might be a custom WP career plugin
    const vangUrls = [
      "https://www.vanguardjobs.com/wp-json/cws/v1/jobs",
      "https://www.vanguardjobs.com/wp-json/cws/v1/listings",
      "https://www.vanguardjobs.com/wp-json/wp/v2/position",
      "https://www.vanguardjobs.com/wp-json/wp/v2/careers",
    ];
    for (const url of vangUrls) {
      const { ok, data, status } = await fetchJSON(url); await sleep(300);
      console.log(`  ${url.slice(8, 55)} → ${status ?? 'ok'}`);
      if (!ok || !data) continue;
      if (Array.isArray(data)) { console.log(`  Array: ${data.length}`); if (data.length > 0 && data.length < 5000) { const rc = await updateRoles("vanguard", data.length, "wp_jobs_api"); updated += rc; break; } }
      else { console.log(`  Keys: ${Object.keys(data).slice(0, 5).join(', ')}`); }
    }
    // Fetch the actual search page to get count
    if (await isNull("vanguard")) {
      const { text, status } = await fetchText("https://www.vanguardjobs.com/?s=&search_keywords=&search_location=&post_type=job_listing");
      await sleep(400);
      console.log(`  vanguardjobs.com search → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        const countMatch = text.match(/(\d+)\s+(?:job|position|result|listing)/i);
        if (countMatch) console.log(`  Count: ${countMatch[0]}`);
        // Count job listing cards/divs
        const jobCards = [...text.matchAll(/class="[^"]*job[^"]*(?:listing|card|post|item)[^"]*"/gi)].length;
        console.log(`  Job cards: ${jobCards}`);
      }
    }
    // Try Vanguard Workday
    if (await isNull("vanguard")) {
      const vangWd = [
        ["vanguard", "3", "vanguard_careers"],
        ["vanguard", "1", "vanguard_careers"],
        ["vanguard", "3", "Vanguard"],
        ["vanguardgroup", "3", "vanguard_careers"],
      ];
      for (const [t, p, s] of vangWd) {
        const c = await tryWorkday(t, s, p); await sleep(200);
        if (c !== null) { console.log(`  WD [${t}.wd${p}/${s}]: ${c}`); const rc = await updateRoles("vanguard", c, "workday_careers"); updated += rc; break; }
      }
    }
    // Try Adzuna for Vanguard
    if (await isNull("vanguard")) {
      const adzUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=vanguard&results_per_page=1`;
      const { ok, data } = await fetchJSON(adzUrl); await sleep(500);
      console.log(`  Adzuna [us/vanguard]: ${data?.count ?? 'not found'}`);
      if (ok && typeof data?.count === "number" && data.count > 0) {
        const rc = await updateRoles("vanguard", data.count, "adzuna_api_us"); updated += rc;
      }
    }
  }
  if (await isNull("vanguard")) console.log("  → No data found");
  await sleep(600);

  // ── 10. NOOM — Try Adzuna US ──────────────────────────────────────────────
  console.log("\n=== Noom ===");
  if (await isNull("noom")) {
    const adzUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=noom&results_per_page=1`;
    const { ok, data } = await fetchJSON(adzUrl); await sleep(500);
    console.log(`  Adzuna [us/noom]: ${data?.count ?? 'not found'}`);
    if (ok && typeof data?.count === "number") {
      const rc = await updateRoles("noom", data.count, "adzuna_api_us"); updated += rc;
    }
    // Also try Adzuna GB
    if (await isNull("noom")) {
      const adzUrl2 = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=noom&results_per_page=1`;
      const { ok: ok2, data: data2 } = await fetchJSON(adzUrl2); await sleep(500);
      console.log(`  Adzuna [gb/noom]: ${data2?.count ?? 'not found'}`);
    }
  }
  if (await isNull("noom")) console.log("  → No data found");
  await sleep(600);

  // ── 11. MEITUAN — Try zhaopin page parsing ───────────────────────────────
  console.log("\n=== Meituan ===");
  if (await isNull("meituan")) {
    const { text, status } = await fetchText("https://zhaopin.meituan.com");
    await sleep(400);
    console.log(`  zhaopin.meituan.com → ${status}`);
    if (text && status === 200) {
      // Look for count in Chinese (职位数量) or English
      const cnCount = text.match(/["']total["']\s*:\s*(\d+)/i)
                   || text.match(/总计\s*(\d+)/i)
                   || text.match(/(\d+)\s*(?:职位|岗位)/i)
                   || text.match(/(\d+)\s*(?:positions?|jobs?)/i);
      if (cnCount) {
        const n = parseInt(cnCount[1]);
        console.log(`  → ${n} (${cnCount[0]})`);
        if (n > 0 && n < 100000) { const rc = await updateRoles("meituan", n, "meituan_career_page"); updated += rc; }
      } else {
        // Show more of the HTML
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Content (more): ${plain.slice(0, 800)}`);
      }
    }
    // Try Meituan API directly
    if (await isNull("meituan")) {
      const { ok, data } = await fetchJSON("https://zhaopin.meituan.com/api/job/list?page=1&size=1"); await sleep(400);
      if (ok && data) {
        const total = data.total ?? data.count ?? data.data?.total ?? data.data?.count;
        if (total !== undefined) { console.log(`  API total: ${total}`); if (total > 0) { const rc = await updateRoles("meituan", total, "meituan_api"); updated += rc; } }
        else console.log(`  API data: ${JSON.stringify(data).slice(0, 200)}`);
      }
    }
  }
  if (await isNull("meituan")) console.log("  → No data found (Chinese company - expected)");

  // ── INDIA GOVERNMENT/PSU — Retry with different domains ──────────────────
  console.log("\n=== India PSU/Government Retry ===");

  // SAIL - Try sail.co.in with longer timeout
  if (await isNull("steel authority of india")) {
    console.log("  SAIL:");
    for (const url of ["https://www.sail.co.in/en/career", "http://www.sail.co.in/en/career"]) {
      const { text, status } = await fetchText(url, { "Accept-Language": "en-IN,en;q=0.9" }); await sleep(600);
      console.log(`    ${url.slice(7, 40)} → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`    Preview: ${plain.slice(0, 200)}`);
        const v = text.match(/(\d+)\s+(?:vacancy|vacancies|post|position)/i);
        if (v) { const n = parseInt(v[1]); console.log(`    → ${n}`); if (n > 0 && n < 10000) { const rc = await updateRoles("steel authority of india", n, "career_page_scrape"); updated += rc; } }
      }
    }
  }

  // GSPL - Try different GSPL URLs
  if (await isNull("gspl")) {
    console.log("  GSPL:");
    for (const url of [
      "https://www.gspl.in/career.php",
      "https://www.gspcl.in/career",
      "https://www.guvnl.in/career",
      "https://gspc.in/careers",
    ]) {
      const { text, status } = await fetchText(url); await sleep(400);
      console.log(`    ${url.slice(8, 40)} → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`    Preview: ${plain.slice(0, 150)}`);
        const v = text.match(/(\d+)\s+(?:vacancy|vacancies|post|position)/i);
        if (v) { const n = parseInt(v[1]); console.log(`    → ${n}`); if (n > 0) { const rc = await updateRoles("gspl", n, "career_page_scrape"); updated += rc; } }
      }
    }
  }

  // Union Bank - try older-format URL
  if (await isNull("union bank of india")) {
    console.log("  Union Bank:");
    for (const url of [
      "https://www.unionbankofindia.co.in/english/recruitment.aspx",
      "https://unionbankofindia.co.in/recruitment",
    ]) {
      const { text, status } = await fetchText(url); await sleep(500);
      console.log(`    ${url.slice(8, 55)} → ${status}`);
      if (text && status === 200) {
        const v = text.match(/(\d+)\s+(?:vacancy|vacancies|post|seat)/i);
        if (v) console.log(`    → ${v[0]}`);
        const rows = [...text.matchAll(/<tr[^>]*>/gi)].length;
        console.log(`    Table rows: ${rows}`);
      }
    }
  }

  // FINAL STATE
  const { rows: s } = await db.query(`SELECT count(*) AS total, count(total_open_roles) AS has_roles, count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null FROM verified_company_intelligence`);
  const { rows: nulls } = await db.query(`SELECT canonical_name, country_code FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
  await db.end();
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
}

main().catch(e => { console.error(e); process.exit(1); });
