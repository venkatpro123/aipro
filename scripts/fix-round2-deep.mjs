// fix-round2-deep.mjs
// 1. Revert Usha Martin (false HTML parse data)
// 2. Revert Noom (SPA - static parse unreliable)
// 3. Deep attempts for all remaining 15 NULL companies

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
      signal: AbortSignal.timeout(18000)
    });
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text() };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function fetchJSON(url, opts = {}) {
  try {
    const headers = { Accept: "application/json", "User-Agent": "Mozilla/5.0", ...HEADERS, ...(opts.headers || {}) };
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000), ...opts });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: await res.json() };
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

  // ── 0. REVERT FALSE DATA ─────────────────────────────────────────────────
  console.log("=== Reverting false data ===");
  // Usha Martin: 38 was from HTML fragments (Manager-->, head>, JS code) not real jobs
  const ur = await revertFalse("usha martin");
  console.log(`  Usha Martin reverted: ${ur} rows`);
  // Noom: 0 was from SPA static HTML parse - not reliable (SPA loads jobs via JS)
  const nr = await revertFalse("noom");
  console.log(`  Noom reverted: ${nr} rows`);

  await sleep(500);

  // ── 1. NOOM — Try ATS discovery properly ─────────────────────────────────
  console.log("\n=== Noom (ATS discovery) ===");
  // Noom uses Greenhouse
  const noomTokens = ["noom", "noomhealth", "noomteam", "noomdigital"];
  for (const t of noomTokens) {
    const c = await tryGreenhouse(t);
    console.log(`  Greenhouse [${t}]: ${c ?? 'not found'}`);
    if (c !== null) { const rc = await updateRoles("noom", c, "greenhouse_api"); updated += rc; break; }
  }
  // Try Lever
  if (await isNull("noom")) {
    for (const t of ["noom", "noomhealth"]) {
      const c = await tryLever(t);
      console.log(`  Lever [${t}]: ${c ?? 'not found'}`);
      if (c !== null) { const rc = await updateRoles("noom", c, "lever_api"); updated += rc; break; }
    }
  }
  // Try Ashby
  if (await isNull("noom")) {
    for (const t of ["noom", "noomhealth"]) {
      const c = await tryAshby(t);
      console.log(`  Ashby [${t}]: ${c ?? 'not found'}`);
      if (c !== null) { const rc = await updateRoles("noom", c, "ashby_api"); updated += rc; break; }
    }
  }
  // Try Workday
  if (await isNull("noom")) {
    for (const pod of ["1","3","5"]) {
      const c = await tryWorkday("noom", "noom_careers", pod);
      await sleep(200);
      if (c !== null) { const rc = await updateRoles("noom", c, "workday_careers"); updated += rc; console.log(`  Workday [wd${pod}]: ${c}`); break; }
    }
  }
  if (await isNull("noom")) console.log("  → No data found");

  await sleep(600);

  // ── 2. USHA MARTIN — try their actual job portal ─────────────────────────
  console.log("\n=== Usha Martin (job portal) ===");
  // Try the actual job listing page (not just the careers landing)
  const ushaUrls = [
    "https://www.ushamartin.com/career/",
    "https://www.ushamartin.com/career/current-openings/",
    "https://ushamartin.com/careers/current-openings",
    "https://jobs.ushamartin.com",
  ];
  for (const url of ushaUrls) {
    const { text, status } = await fetchText(url);
    await sleep(500);
    console.log(`  ${url.slice(8, 55)} → ${status}`);
    if (!text || status !== 200) continue;
    // Look for explicit vacancy count
    const vacCount = text.match(/(\d+)\s+(?:vacancy|vacancies|position|opening|job)/i);
    if (vacCount) {
      const n = parseInt(vacCount[1]);
      console.log(`  → Count found: ${n} (${vacCount[0]})`);
      if (n > 0 && n < 5000) { const rc = await updateRoles("usha martin", n, "career_page_scrape"); updated += rc; break; }
    }
    // Count `<tr>` rows in a table (job listing tables)
    const tableRows = [...text.matchAll(/<tr[^>]*>/gi)].length;
    // Count <li> items in specific job list sections
    const liItems = [...text.matchAll(/<li[^>]*class="[^"]*job[^"]*"[^>]*>/gi)].length;
    console.log(`  table rows: ${tableRows}, job <li>: ${liItems}`);
    if (liItems > 0) {
      const rc = await updateRoles("usha martin", liItems, "career_page_scrape"); updated += rc; break;
    }
  }
  // Try Greenhouse/Lever/Ashby for Usha Martin (unlikely but check)
  if (await isNull("usha martin")) {
    for (const t of ["ushamartin", "usha-martin", "ushawires"]) {
      const c = await tryGreenhouse(t);
      if (c !== null) { console.log(`  GH [${t}]: ${c}`); const rc = await updateRoles("usha martin", c, "greenhouse_api"); updated += rc; break; }
    }
  }
  if (await isNull("usha martin")) console.log("  → No data found");

  await sleep(600);

  // ── 3. WNS GLOBAL — ATS and career page ──────────────────────────────────
  console.log("\n=== WNS Global ===");
  // WNS is a large BPO - should have ATS
  // Try Greenhouse
  for (const t of ["wns", "wnsglobal", "wnsholdings", "wns-global"]) {
    const c = await tryGreenhouse(t);
    console.log(`  GH [${t}]: ${c ?? 'not found'}`);
    if (c !== null) { const rc = await updateRoles("wns global", c, "greenhouse_api"); updated += rc; break; }
  }
  if (await isNull("wns global")) {
    // Try Workday (WNS is large enough for Workday)
    for (const pod of ["1","3","5","2","4","6"]) {
      for (const site of ["wns_careers", "WNS_Careers", "wns", "WNS"]) {
        const c = await tryWorkday("wns", site, pod);
        await sleep(150);
        if (c !== null) { const rc = await updateRoles("wns global", c, "workday_careers"); updated += rc; console.log(`  WD [wd${pod}/${site}]: ${c}`); break; }
      }
      if (!await isNull("wns global")) break;
    }
  }
  if (await isNull("wns global")) {
    // Fetch career page
    const { text, status } = await fetchText("https://www.wns.com/careers");
    await sleep(400);
    console.log(`  wns.com/careers → ${status}`);
    if (text && status === 200) {
      const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/gi)];
      if (wdUrls.length > 0) {
        console.log(`  WD URL: ${wdUrls[0][0]}`);
        const c = await tryWorkday(wdUrls[0][1], wdUrls[0][3], wdUrls[0][2]);
        await sleep(300);
        if (c !== null) { const rc = await updateRoles("wns global", c, "workday_careers"); updated += rc; }
      }
      const jobCount = text.match(/(\d+)\s+(?:open|job|position|opportunit)/i);
      if (jobCount) console.log(`  Count: ${jobCount[0]}`);
      // Also search for GH/Lever in page source
      const ghToken = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
      if (ghToken && ghToken !== "embed") {
        console.log(`  GH token in page: ${ghToken}`);
        const c = await tryGreenhouse(ghToken);
        if (c !== null) { const rc = await updateRoles("wns global", c, "greenhouse_api"); updated += rc; }
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");

  await sleep(600);

  // ── 4. BAYER CROPSCIENCE INDIA — via Bayer global Workday ────────────────
  console.log("\n=== Bayer CropScience India ===");
  // Bayer uses Workday globally. Find India-filtered jobs.
  // Known Bayer Workday tenants
  const bayerTenants = [
    { tenant: "bayer", pod: "3", site: "Bayer" },
    { tenant: "bayer", pod: "3", site: "BAG" },
    { tenant: "bayer", pod: "1", site: "Bayer" },
    { tenant: "bayer", pod: "5", site: "Bayer" },
    { tenant: "bayerhealthcare", pod: "3", site: "Bayer" },
    { tenant: "bayercropscience", pod: "1", site: "BayerCropScience" },
    { tenant: "bayercropscience", pod: "3", site: "BayerCropScience" },
  ];
  for (const { tenant, pod, site } of bayerTenants) {
    const c = await tryWorkday(tenant, site, pod);
    await sleep(300);
    if (c !== null) {
      console.log(`  ✓ WD [${tenant}.wd${pod}/${site}]: ${c} total (Bayer global)`);
      // Now try to get India-specific count via location filter
      const indiaC = await fetchJSON(
        `https://${tenant}.wd${pod}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
        {
          method: "POST",
          body: JSON.stringify({ appliedFacets: { "Location_Country": ["bc33aa3152ec42d4995f4791a106ed09"] }, limit: 1, offset: 0, searchText: "" }),
          headers: { "Content-Type": "application/json" }
        }
      );
      await sleep(300);
      if (indiaC.ok && typeof indiaC.data?.total === "number") {
        console.log(`  India jobs: ${indiaC.data.total}`);
        if (indiaC.data.total > 0) { const rc = await updateRoles("bayer cropscience india", indiaC.data.total, "workday_careers_india"); updated += rc; break; }
      }
      // Also try searching for "CropScience" or "crop" in searchText
      const cropC = await fetchJSON(
        `https://${tenant}.wd${pod}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
        {
          method: "POST",
          body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: "crop science india" }),
          headers: { "Content-Type": "application/json" }
        }
      );
      await sleep(300);
      if (cropC.ok && typeof cropC.data?.total === "number") {
        console.log(`  Crop+India search: ${cropC.data.total}`);
      }
      // If no India-specific, store total global as reference with note
      // Actually we want India-specific only. Try fetching bayer.co.in
      break;
    }
  }
  // If Workday not found, try bayer.co.in career page
  if (await isNull("bayer cropscience india")) {
    const urls = [
      "https://www.bayer.com/en/us/careers",
      "https://www.bayer.com/en/in/careers",
      "https://career.bayer.com",
    ];
    for (const url of urls) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 40)} → ${status}`);
      if (!text || status !== 200) continue;
      const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/gi)];
      if (wdUrls.length > 0) {
        console.log(`  WD URL in page: ${wdUrls[0][0]}`);
        const c = await tryWorkday(wdUrls[0][1], wdUrls[0][3], wdUrls[0][2]);
        await sleep(300);
        if (c !== null) { console.log(`  Bayer global jobs: ${c}`); break; } // Still need India-specific
      }
      break;
    }
  }
  if (await isNull("bayer cropscience india")) console.log("  → No India-specific data found");

  await sleep(600);

  // ── 5. STEEL AUTHORITY OF INDIA (SAIL) ───────────────────────────────────
  console.log("\n=== Steel Authority of India (SAIL) ===");
  const sailUrls = [
    "https://www.sail.co.in/en/career",
    "https://www.sail.co.in/en/recruitment",
    "https://sail.co.in/recruitment",
    "https://sailcareers.co.in",
    "https://www.sail.co.in/en/current-vacancies",
  ];
  for (const url of sailUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(8, 50)} → ${status}`);
    if (!text || status !== 200) continue;
    const vacCount = text.match(/(\d+)\s+(?:vacancy|vacancies|post|position|opening)/i);
    if (vacCount) {
      const n = parseInt(vacCount[1]);
      console.log(`  → ${n} (${vacCount[0]})`);
      if (n > 0 && n < 5000) { const rc = await updateRoles("steel authority of india", n, "career_page_scrape"); updated += rc; break; }
    }
    // Count table rows or list items that look like job postings
    const posts = [...text.matchAll(/<(?:tr|li)[^>]*>/gi)].length;
    console.log(`  Posts/rows: ${posts}`);
    // Look for "Advt" or "Advertisement" — SAIL posts numbered vacancies
    const advts = [...text.matchAll(/Advt\.?\s*No\.?\s*[\d/]+/gi)].length;
    console.log(`  Advertisements: ${advts}`);
    if (advts > 0) {
      console.log(`  → Found ${advts} job advertisements`);
      const rc = await updateRoles("steel authority of india", advts, "career_page_scrape"); updated += rc; break;
    }
  }
  if (await isNull("steel authority of india")) console.log("  → No data found");

  await sleep(600);

  // ── 6. UNION BANK OF INDIA ────────────────────────────────────────────────
  console.log("\n=== Union Bank of India ===");
  const ubiUrls = [
    "https://www.unionbankofindia.co.in/english/Recruitment.aspx",
    "https://www.unionbankofindia.co.in/English/Recruitment.aspx",
    "https://ibpsonline.ibps.in/ubioct23/",
    "https://recruitment.unionbankofindia.co.in",
    "https://www.unionbankofindia.co.in/english/career-opportunity.aspx",
  ];
  for (const url of ubiUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(8, 55)} → ${status}`);
    if (!text || status !== 200) continue;
    const vacCount = text.match(/(\d+)\s+(?:vacancy|vacancies|post|position)/i);
    if (vacCount) {
      const n = parseInt(vacCount[1]);
      console.log(`  → ${n} (${vacCount[0]})`);
      if (n > 0 && n < 50000) { const rc = await updateRoles("union bank of india", n, "career_page_scrape"); updated += rc; break; }
    }
    // Count notification/advertisement rows
    const notifs = [...text.matchAll(/(?:notification|circular|advt|advertisement)/gi)].length;
    console.log(`  Notifications: ${notifs}`);
  }
  if (await isNull("union bank of india")) console.log("  → No data found");

  await sleep(600);

  // ── 7. PFC LTD ────────────────────────────────────────────────────────────
  console.log("\n=== PFC Ltd ===");
  const pfcUrls = [
    "https://www.pfcindia.com/Home/Career",
    "https://www.pfcindia.com/Home/Recruitment",
    "https://pfcindia.com/career",
    "https://recruitment.pfcindia.com",
    "https://www.pfcindia.com/Home/CurrentOpening",
  ];
  for (const url of pfcUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(8, 55)} → ${status}`);
    if (!text || status !== 200) continue;
    const vacCount = text.match(/(\d+)\s+(?:vacancy|vacancies|post|position|opening)/i);
    if (vacCount) {
      const n = parseInt(vacCount[1]);
      console.log(`  → ${n} (${vacCount[0]})`);
      if (n > 0 && n < 5000) { const rc = await updateRoles("pfc ltd", n, "career_page_scrape"); updated += rc; break; }
    }
    const jobRows = [...text.matchAll(/<tr[^>]*>/gi)].length;
    console.log(`  Table rows: ${jobRows}`);
    // Count links with "Job" or "post" patterns
    const jobLinks = [...text.matchAll(/href="[^"]*(?:career|job|recruit)[^"]*"/gi)].length;
    console.log(`  Job links: ${jobLinks}`);
  }
  if (await isNull("pfc ltd")) console.log("  → No data found");

  await sleep(600);

  // ── 8. PHOENIX MILLS ─────────────────────────────────────────────────────
  console.log("\n=== Phoenix Mills ===");
  const phxUrls = [
    "https://thephoenixmills.com/career",
    "https://thephoenixmills.com/careers",
    "https://careers.thephoenixmills.com",
    "https://www.thephoenixmills.com/career/",
    "https://thephoenixmills.com/join-us",
  ];
  for (const url of phxUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(8, 50)} → ${status}`);
    if (!text || status !== 200) continue;
    const vacCount = text.match(/(\d+)\s+(?:vacancy|vacancies|job|opening|position)/i);
    if (vacCount) {
      const n = parseInt(vacCount[1]);
      console.log(`  → ${n} (${vacCount[0]})`);
      if (n > 0 && n < 5000) { const rc = await updateRoles("phoenix mills", n, "career_page_scrape"); updated += rc; break; }
    }
    // Try ATS tokens from page source
    const ghToken = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
    if (ghToken) { const c = await tryGreenhouse(ghToken); if (c !== null) { const rc = await updateRoles("phoenix mills", c, "greenhouse_api"); updated += rc; break; } }
  }
  // Try ATS tokens directly
  if (await isNull("phoenix mills")) {
    for (const t of ["phoenixmills", "thephoenixmills", "phoenix-malls"]) {
      const c = await tryGreenhouse(t);
      console.log(`  GH [${t}]: ${c ?? 'not found'}`);
      if (c !== null) { const rc = await updateRoles("phoenix mills", c, "greenhouse_api"); updated += rc; break; }
    }
  }
  if (await isNull("phoenix mills")) console.log("  → No data found");

  await sleep(600);

  // ── 9. VIJAYA DIAGNOSTIC ─────────────────────────────────────────────────
  console.log("\n=== Vijaya Diagnostic ===");
  const vijUrls = [
    "https://www.vijayaonline.com/careers",
    "https://vijayadiagnostic.in/careers",
    "https://www.vijayadiagnostic.in/careers",
    "https://vijayaonline.com/careers-opportunities",
    "https://careers.vijayadiagnostic.com",
  ];
  for (const url of vijUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(8, 55)} → ${status}`);
    if (!text || status !== 200) continue;
    const vacCount = text.match(/(\d+)\s+(?:vacancy|vacancies|job|opening|position)/i);
    if (vacCount) {
      const n = parseInt(vacCount[1]);
      console.log(`  → ${n} (${vacCount[0]})`);
      if (n > 0 && n < 5000) { const rc = await updateRoles("vijaya diagnostic", n, "career_page_scrape"); updated += rc; break; }
    }
    // Look for job listing items
    const jobItems = [...text.matchAll(/(?:Radiologist|Technician|Phlebotomist|Lab|Nurse|Doctor|Manager|Admin|Executive|Receptionist)[^<]{0,30}/gi)];
    if (jobItems.length > 0) {
      console.log(`  Found ${jobItems.length} job-like items`);
      for (const j of jobItems.slice(0, 5)) console.log(`    ${j[0].trim()}`);
    }
    // Count actual apply links
    const applyLinks = [...text.matchAll(/href="[^"]*(?:apply|job)[^"]*"/gi)].length;
    console.log(`  Apply links: ${applyLinks}`);
  }
  if (await isNull("vijaya diagnostic")) console.log("  → No data found");

  await sleep(600);

  // ── 10. GSPL ─────────────────────────────────────────────────────────────
  console.log("\n=== GSPL ===");
  const gsplUrls = [
    "https://www.gspl.in/career",
    "https://gspl.in/career.aspx",
    "https://www.gspl.in/careers",
    "https://www.gspl.in/en/career",
    "https://careers.gspl.in",
    "https://www.gspl.in/career/current-openings",
  ];
  for (const url of gsplUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(8, 45)} → ${status}`);
    if (!text || status !== 200) continue;
    const vacCount = text.match(/(\d+)\s+(?:vacancy|vacancies|job|opening|position)/i);
    if (vacCount) {
      const n = parseInt(vacCount[1]);
      console.log(`  → ${n} (${vacCount[0]})`);
      if (n > 0 && n < 5000) { const rc = await updateRoles("gspl", n, "career_page_scrape"); updated += rc; break; }
    }
    const jobRows = [...text.matchAll(/<tr[^>]*>/gi)].length;
    console.log(`  Table rows: ${jobRows}`);
  }
  if (await isNull("gspl")) console.log("  → No data found");

  await sleep(600);

  // ── 11. KOLTE-PATIL DEVELOPERS ───────────────────────────────────────────
  console.log("\n=== Kolte-Patil Developers ===");
  const kpUrls = [
    "https://www.koltepatil.com/careers",
    "https://koltepatil.com/careers/current-openings",
    "https://careers.koltepatil.com",
  ];
  for (const url of kpUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(8, 50)} → ${status}`);
    if (!text || status !== 200) continue;
    // Count explicit job-specific <a> tags with unique hrefs for jobs
    const allLinks = [...text.matchAll(/href="([^"]+)"/gi)].map(m => m[1]);
    // Job links: unique paths containing /career/*/job-id pattern
    const jobDetailLinks = allLinks.filter(h =>
      (h.includes("/career/") || h.includes("/careers/") || h.includes("/job/")) &&
      !h.includes("#") && !h.includes("javascript") && !h.includes("mailto") &&
      h.length > 15
    );
    const uniqueJobLinks = [...new Set(jobDetailLinks)];
    console.log(`  All links: ${allLinks.length} | Unique job paths: ${uniqueJobLinks.length}`);
    for (const jl of uniqueJobLinks.slice(0, 5)) console.log(`    ${jl}`);

    // Count job title text patterns (only very specific ones: "Apply" button near title)
    const applyNear = [...text.matchAll(/Apply(?:\s+Now)?[^<]{0,200}/gi)].length;
    console.log(`  Apply buttons: ${applyNear}`);

    // Look for JSON-LD job postings
    const jsonLd = text.match(/"@type"\s*:\s*"JobPosting"/gi);
    if (jsonLd) {
      console.log(`  JSON-LD JobPosting: ${jsonLd.length}`);
      const rc = await updateRoles("kolte patil developers", jsonLd.length, "career_page_jsonld"); updated += rc; break;
    }

    // Check explicit vacancy count text
    const vacText = text.match(/(\d+)\s+(?:current\s+)?(?:open\s+)?(?:vacancy|vacancies|opening|position)/i);
    if (vacText) {
      const n = parseInt(vacText[1]);
      console.log(`  → Vacancy count: ${n}`);
      if (n >= 0 && n < 500) { const rc = await updateRoles("kolte patil developers", n, "career_page_scrape"); updated += rc; break; }
    }
  }
  if (await isNull("kolte patil developers")) console.log("  → No data found");

  await sleep(600);

  // ── 12. VANGUARD — try specific WP endpoints and Greenhouse ─────────────
  console.log("\n=== Vanguard ===");
  // Vanguard uses vanguardjobs.com (WP-based). Let's try to get the actual job count
  // from WP JSON endpoints that WP Job Manager exposes
  const vangApis = [
    "https://www.vanguardjobs.com/wp-json/wp/v2/job_listing?per_page=1&_fields=id",
    "https://www.vanguardjobs.com/wp-json/wp/v2/jobs?per_page=1&_fields=id",
    "https://www.vanguardjobs.com/wp-json/wp/v2/pages?per_page=1&search=job",
    "https://www.vanguardjobs.com/wp-json/",  // API discovery
  ];
  for (const url of vangApis) {
    const { ok, data, status } = await fetchJSON(url);
    await sleep(300);
    console.log(`  ${url.slice(8, 60)} → ${status ?? 'ok'}`);
    if (!ok || !data) continue;
    if (Array.isArray(data)) { console.log(`  Array length: ${data.length}`); }
    else if (data?.namespaces) { console.log(`  WP API namespaces: ${data.namespaces?.join(', ')}`); }
    else { console.log(`  Data keys: ${Object.keys(data).slice(0, 5).join(', ')}`); }
  }
  // WP Site also has X-WP-Total in response headers (but we don't get headers from fetchJSON)
  // Try fetching with header extraction
  if (await isNull("vanguard")) {
    try {
      const res = await fetch("https://www.vanguardjobs.com/wp-json/wp/v2/job_listing", {
        headers: { Accept: "application/json", ...HEADERS },
        signal: AbortSignal.timeout(15000)
      });
      const total = res.headers.get("X-WP-Total");
      const totalPages = res.headers.get("X-WP-TotalPages");
      console.log(`  X-WP-Total: ${total} | Pages: ${totalPages} | Status: ${res.status}`);
      if (total && parseInt(total) >= 0) {
        const n = parseInt(total);
        console.log(`  → ${n} job listings from WP header`);
        if (n > 0) { const rc = await updateRoles("vanguard", n, "wp_job_manager_api"); updated += rc; }
      }
      const data = await res.json().catch(() => null);
      if (data) console.log(`  Data type: ${Array.isArray(data) ? `array[${data.length}]` : typeof data} | sample: ${JSON.stringify(data).slice(0, 100)}`);
    } catch (e) { console.log(`  Error: ${e.message}`); }
  }
  // Try Greenhouse for Vanguard
  if (await isNull("vanguard")) {
    for (const t of ["vanguard", "vanguardfunds", "vanguardgroup"]) {
      const c = await tryGreenhouse(t);
      console.log(`  GH [${t}]: ${c ?? 'not found'}`);
      if (c !== null) { const rc = await updateRoles("vanguard", c, "greenhouse_api"); updated += rc; break; }
    }
  }
  if (await isNull("vanguard")) console.log("  → No data found");

  await sleep(600);

  // ── 13. ALNYLAM — Try Workday directly with common tenant names ───────────
  console.log("\n=== Alnylam Pharmaceuticals ===");
  // Try Workday tenant discovery (Alnylam is a Workday customer)
  const alnTenants = [
    { tenant: "alnylam", pod: "1", site: "alnylam_careers" },
    { tenant: "alnylam", pod: "1", site: "Alnylam" },
    { tenant: "alnylam", pod: "3", site: "alnylam_careers" },
    { tenant: "alnylam", pod: "3", site: "Alnylam" },
    { tenant: "alnylam", pod: "5", site: "alnylam_careers" },
    { tenant: "alnylam", pod: "5", site: "Alnylam" },
    { tenant: "alnylampharmaceuticals", pod: "1", site: "alnylam_careers" },
    { tenant: "alnylampharmaceuticals", pod: "3", site: "alnylam_careers" },
  ];
  for (const { tenant, pod, site } of alnTenants) {
    const c = await tryWorkday(tenant, site, pod);
    await sleep(200);
    if (c !== null) {
      console.log(`  ✓ WD [${tenant}.wd${pod}/${site}]: ${c}`);
      const rc = await updateRoles("alnylam pharmaceuticals", c, "workday_careers"); updated += rc; break;
    }
  }
  // Try Greenhouse/Lever for Alnylam
  if (await isNull("alnylam pharmaceuticals")) {
    for (const t of ["alnylam", "alnylampharmaceuticals"]) {
      const c = await tryGreenhouse(t);
      console.log(`  GH [${t}]: ${c ?? 'not found'}`);
      if (c !== null) { const rc = await updateRoles("alnylam pharmaceuticals", c, "greenhouse_api"); updated += rc; break; }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) {
    // Try the Alnylam career page with a different approach - look for the iframe source
    const { text, status } = await fetchText("https://jobs.alnylam.com/careers");
    await sleep(400);
    console.log(`  jobs.alnylam.com/careers → ${status}`);
    if (text && status === 200) {
      const iframes = [...text.matchAll(/src="([^"]*(?:workday|greenhouse|lever|ashby)[^"]*)"/gi)].map(m => m[1]);
      console.log(`  Iframe ATS sources: ${iframes.join(', ')}`);
      const apiBase = text.match(/apiUrl['"]\s*:\s*['"]([^'"]+)/i)?.[1];
      if (apiBase) console.log(`  API base: ${apiBase}`);
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");

  await sleep(600);

  // ── 14. INSULET — Try iCIMS properly and career page ────────────────────
  console.log("\n=== Insulet ===");
  // iCIMS search endpoint with GET
  const icimsUrls = [
    "https://careers-insulet.icims.com/jobs/search?ss=1&searchKeyword=",
    "https://careers-insulet.icims.com/jobs",
    "https://insulet.icims.com/jobs/search",
    "https://careers.insulet.com",
    "https://jobs.insulet.com/search",
  ];
  for (const url of icimsUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(8, 55)} → ${status}`);
    if (!text || status !== 200) continue;
    const jobCount = text.match(/(\d+)\s+(?:job|result|position|opportunit|opening)/i);
    if (jobCount) {
      const n = parseInt(jobCount[1]);
      console.log(`  → ${n} (${jobCount[0]})`);
      if (n > 0 && n < 5000) { const rc = await updateRoles("insulet", n, "career_page_scrape"); updated += rc; break; }
    }
    const icimsTotal = text.match(/class="iCIMS_JobsCount"[^>]*>(\d+)/i);
    if (icimsTotal) { const n = parseInt(icimsTotal[1]); console.log(`  iCIMS count: ${n}`); const rc = await updateRoles("insulet", n, "icims_scrape"); updated += rc; break; }
    // Check for WD links in page
    const wdLinks = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>/#]+)/gi)];
    if (wdLinks.length > 0) {
      const [, tenant, pod, site] = wdLinks[0];
      console.log(`  WD found: ${tenant}.wd${pod}/${site}`);
      const c = await tryWorkday(tenant, site, pod); await sleep(300);
      if (c !== null) { const rc = await updateRoles("insulet", c, "workday_careers"); updated += rc; break; }
    }
  }
  // Try Insulet Workday directly
  if (await isNull("insulet")) {
    const insuletWd = [
      { t: "insulet", p: "1", s: "insulet_careers" },
      { t: "insulet", p: "3", s: "insulet_careers" },
      { t: "insuletcorp", p: "1", s: "insulet_careers" },
      { t: "insulet", p: "5", s: "Insulet_Careers" },
    ];
    for (const { t, p, s } of insuletWd) {
      const c = await tryWorkday(t, s, p); await sleep(200);
      if (c !== null) { console.log(`  WD [${t}.wd${p}/${s}]: ${c}`); const rc = await updateRoles("insulet", c, "workday_careers"); updated += rc; break; }
    }
  }
  if (await isNull("insulet")) console.log("  → No data found");

  await sleep(600);

  // ── 15. MASIMO — Try extended Workday discovery ──────────────────────────
  console.log("\n=== Masimo ===");
  const masimoTenants = [
    { t: "masimo", s: "masimo_careers" },
    { t: "masimo", s: "Masimo" },
    { t: "masimocorporation", s: "masimo_careers" },
    { t: "masimomedical", s: "masimo_careers" },
    { t: "masimocorp", s: "masimo_careers" },
  ];
  for (const pod of ["1","3","5","2","4","6","101","201","301","401","501","601","701","801"]) {
    for (const { t, s } of masimoTenants) {
      const c = await tryWorkday(t, s, pod); await sleep(100);
      if (c !== null) { console.log(`  ✓ WD [${t}.wd${pod}/${s}]: ${c}`); const rc = await updateRoles("masimo", c, "workday_careers"); updated += rc; break; }
    }
    if (!await isNull("masimo")) break;
  }
  if (await isNull("masimo")) {
    for (const t of ["masimo", "masimomedical", "masimocorporation"]) {
      const c = await tryGreenhouse(t);
      console.log(`  GH [${t}]: ${c ?? 'not found'}`);
      if (c !== null) { const rc = await updateRoles("masimo", c, "greenhouse_api"); updated += rc; break; }
      const c2 = await tryLever(t);
      console.log(`  Lever [${t}]: ${c2 ?? 'not found'}`);
      if (c2 !== null) { const rc = await updateRoles("masimo", c2, "lever_api"); updated += rc; break; }
      const c3 = await tryAshby(t);
      console.log(`  Ashby [${t}]: ${c3 ?? 'not found'}`);
      if (c3 !== null) { const rc = await updateRoles("masimo", c3, "ashby_api"); updated += rc; break; }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");

  await sleep(600);

  // ── 16. QLIK — Now Cloud Software Group ──────────────────────────────────
  console.log("\n=== Qlik (Cloud Software Group) ===");
  // Qlik was acquired by Vista Equity Partners & merged with Tibco → Cloud Software Group
  const qlikTenants = [
    { t: "cloudsoftwaregroup", s: "Cloud_Software_Group_Careers", pod: "3" },
    { t: "cloudsoftwaregroup", s: "cloudsoftwaregroup", pod: "3" },
    { t: "cloudsoftwaregroup", s: "Cloud_Software_Group_Careers", pod: "1" },
    { t: "cloudsoftwaregroup", s: "Cloud_Software_Group_Careers", pod: "5" },
    { t: "qliktech", s: "qlik_careers", pod: "1" },
    { t: "qliktech", s: "Qlik", pod: "3" },
    { t: "qlik", s: "qlik_careers", pod: "1" },
    { t: "qlik", s: "Qlik", pod: "3" },
    { t: "vistaequity", s: "qlik", pod: "3" },
  ];
  for (const { t, s, pod } of qlikTenants) {
    const c = await tryWorkday(t, s, pod); await sleep(200);
    if (c !== null) { console.log(`  ✓ WD [${t}.wd${pod}/${s}]: ${c}`); const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
  }
  if (await isNull("qlik")) {
    for (const t of ["qlik", "qliktech", "cloudsoftwaregroup", "cloud-software-group"]) {
      const c = await tryGreenhouse(t);
      console.log(`  GH [${t}]: ${c ?? 'not found'}`);
      if (c !== null) { const rc = await updateRoles("qlik", c, "greenhouse_api"); updated += rc; break; }
    }
  }
  if (await isNull("qlik")) {
    // Try fetching Cloud Software Group career page
    const urls = [
      "https://www.cloudsoftwaregroup.com/careers",
      "https://careers.cloudsoftwaregroup.com",
      "https://www.tibco.com/company/careers",
    ];
    for (const url of urls) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 50)} → ${status}`);
      if (!text || status !== 200) continue;
      const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/gi)];
      if (wdUrls.length > 0) {
        console.log(`  WD URL: ${wdUrls[0][0]}`);
        const c = await tryWorkday(wdUrls[0][1], wdUrls[0][3], wdUrls[0][2]); await sleep(300);
        if (c !== null) { const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
      }
      const jobCount = text.match(/(\d+)\s+(?:job|result|position|opportunit|opening)/i);
      if (jobCount) console.log(`  Count: ${jobCount[0]}`);
    }
  }
  if (await isNull("qlik")) console.log("  → No data found");

  // ── MEITUAN [CN] — attempt via Chinese job boards ────────────────────────
  console.log("\n=== Meituan [CN] ===");
  // Meituan 美团 - Chinese tech giant. Try their official jobs page
  const meituanUrls = [
    "https://zhaopin.meituan.com",
    "https://about.meituan.com/careers",
    "https://www.meituan.com/joinus",
    "https://jobs.meituan.com",
  ];
  for (const url of meituanUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(8, 45)} → ${status}`);
    if (!text || status !== 200) continue;
    // Look for Chinese job count (职位) or English count
    const cnCount = text.match(/(\d+)\s*(?:职位|岗位|job|position)/i);
    if (cnCount) {
      const n = parseInt(cnCount[1]);
      console.log(`  → ${n} (${cnCount[0]})`);
      if (n > 0 && n < 50000) { const rc = await updateRoles("meituan", n, "meituan_career_page"); updated += rc; break; }
    }
    console.log(`  Page snippet: ${text.slice(0, 200).replace(/\s+/g, ' ')}`);
  }
  if (await isNull("meituan")) console.log("  → No data found (expected - Chinese company)");

  // ── FINAL STATE ───────────────────────────────────────────────────────────
  const { rows: s } = await db.query(`SELECT count(*) AS total, count(total_open_roles) AS has_roles, count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null FROM verified_company_intelligence`);
  const { rows: nulls } = await db.query(`SELECT canonical_name, country_code FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
  await db.end();
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
}

main().catch(e => { console.error(e); process.exit(1); });
