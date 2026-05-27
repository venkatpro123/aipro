// fix-targeted-final.mjs
// 1. Check/revert certara if false value inserted
// 2. Try WP REST API for Vanguard
// 3. iCIMS POST for Insulet
// 4. Examine WNS, Kolte-Patil, Usha Martin (returned HTTP 200)
// 5. Try Bayer AG global Workday for Bayer CropScience India
// 6. Try harder for Alnylam, Masimo, Qlik
// 7. Try Noom one final time

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const BROWSER_HDR = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchText(url) {
  try {
    const res = await fetch(url, { headers: BROWSER_HDR, redirect: "follow", signal: AbortSignal.timeout(15000) });
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text(), headers: res.headers };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function fetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0", ...(opts.headers || {}) },
      signal: AbortSignal.timeout(12000), ...opts
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: 200, data: await res.json(), headers: res.headers };
  } catch (e) { return { ok: false, status: "err", error: e.message }; }
}

async function tryWorkday(tenant, site, pod) {
  const { ok, data } = await fetchJSON(
    `https://${tenant}.wd${pod}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
    { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
      headers: { "Content-Type": "application/json" } }
  );
  return (ok && typeof data?.total === "number") ? data.total : null;
}

function findWorkdayInHtml(html) {
  const re = /https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/gi;
  const found = []; let m;
  while ((m = re.exec(html)) !== null) found.push({ tenant: m[1], pod: m[2], site: m[3] });
  return found;
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

  // ── 0. Check and revert Certara if false 3544 was inserted ────────────────
  {
    const { rows } = await db.query(`SELECT total_open_roles, hiring_source FROM verified_company_intelligence WHERE canonical_name = 'certara'`);
    console.log(`Certara in DB: ${rows[0]?.total_open_roles} [${rows[0]?.hiring_source}]`);
    if (rows[0]?.total_open_roles === 3544) {
      await db.query(`UPDATE verified_company_intelligence SET total_open_roles = NULL, hiring_source = NULL,
        hiring_verified_at = NULL, hiring_confidence = NULL, hiring_velocity_score = NULL, updated_at = NOW()
        WHERE canonical_name = 'certara'`);
      console.log("  Reverted certara (3544 was from job ID, not count)\n");
    }
  }

  // ── 1. VANGUARD — WP Job Manager REST API ────────────────────────────────
  console.log("=== Vanguard (WP REST API) ===");
  if (await isNull("vanguard")) {
    // WP Job Manager exposes: GET /wp-json/wp/v2/job_listing with X-WP-Total header
    const apis = [
      "https://www.vanguardjobs.com/wp-json/wp/v2/job_listing?per_page=1&_fields=id",
      "https://www.vanguardjobs.com/wp-json/jm-job-listing/v1/job_listing",
      "https://www.vanguardjobs.com/wp-json/wp/v2/jobs?per_page=1&_fields=id",
    ];
    for (const url of apis) {
      const { ok, status, data, headers } = await fetchJSON(url);
      await sleep(500);
      console.log(`  ${url.slice(30)} → ${status}`);
      if (!ok) continue;
      // WP REST paginates via X-WP-Total header
      const total = headers?.get ? parseInt(headers.get("X-WP-Total") || "0", 10) : null;
      const count = total > 0 ? total : Array.isArray(data) ? data.length : null;
      if (count !== null && count >= 0) {
        console.log(`  → ${count} jobs`);
        if (count > 0) { const rc = await updateRoles("vanguard", count, "wp_job_manager"); updated += rc; break; }
      }
    }
    // Try the actual WP search page (WordPress exposes job counts differently)
    if (await isNull("vanguard")) {
      const { ok, text } = await fetchText("https://www.vanguardjobs.com/?job_type=&search_keywords=&search_location=&filter_job_type%5B%5D=full-time");
      await sleep(400);
      if (ok && text) {
        // WP Job Manager shows job count
        const countMatch = text.match(/Showing\s+all\s+(\d+)\s+results/i)
                       || text.match(/(\d+)\s+(?:job|position|opening)/i)
                       || text.match(/"found_posts"\s*:\s*(\d+)/);
        if (countMatch) { console.log(`  WP count: "${countMatch[0]}"`); const n = parseInt(countMatch[1]); if (n > 0) { const rc = await updateRoles("vanguard", n, "wp_job_manager"); updated += rc; } }
      }
    }
    // Last attempt: try Vanguard's API endpoint
    if (await isNull("vanguard")) {
      const { ok, data } = await fetchJSON("https://www.vanguardjobs.com/wp-admin/admin-ajax.php", {
        method: "POST",
        body: new URLSearchParams({ action: "job_manager_get_listings", form_data: "search_keywords=&search_location=&filter_job_type%5B%5D=full-time&per_page=100" }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      await sleep(400);
      if (ok && data) {
        const count = data.found_jobs ?? data.total ?? null;
        console.log(`  AJAX: ${JSON.stringify(data).slice(0, 100)}`);
        if (count !== null) { const rc = await updateRoles("vanguard", count, "wp_job_manager"); updated += rc; }
      }
    }
    if (await isNull("vanguard")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 2. INSULET — iCIMS POST request ──────────────────────────────────────
  console.log("\n=== Insulet (iCIMS POST) ===");
  if (await isNull("insulet")) {
    // iCIMS search API uses POST for search
    const icimsUrls = [
      "https://careers-insulet.icims.com/jobs/search",
      "https://insulet.icims.com/jobs/search",
    ];
    for (const baseUrl of icimsUrls) {
      const { ok, text, status } = await fetchText(baseUrl + "?in_iframe=1&hashed=-625942270");
      await sleep(400);
      console.log(`  ${baseUrl.slice(8, 50)} → ${status}`);
      if (!ok || !text) continue;
      const countMatch = text.match(/(\d+)\s+(?:job|result|opportunit|position)/i)
                      || text.match(/"numFound"\s*:\s*(\d+)/)
                      || text.match(/"count"\s*:\s*(\d+)/);
      if (countMatch) {
        console.log(`  Count: ${countMatch[1]}`);
        const rc = await updateRoles("insulet", parseInt(countMatch[1]), "icims_careers"); updated += rc; break;
      }
      // Check for Workday URL in iCIMS redirect
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        const w = wdUrls[0]; const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) { const rc = await updateRoles("insulet", c, "workday_careers"); updated += rc; break; }
      }
    }
    // Try Workday with pod 501 specifically
    if (await isNull("insulet")) {
      for (const site of ["Insulet", "InsuletCorporation", "external"]) {
        const c = await tryWorkday("insulet", site, "501"); await sleep(200);
        if (c !== null) { const rc = await updateRoles("insulet", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} [wd501/${site}]`); break; }
      }
    }
    if (await isNull("insulet")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 3. WNS GLOBAL — examine the 200 page content ────────────────────────
  console.log("\n=== WNS Global (examining careers page) ===");
  if (await isNull("wns global")) {
    const { text, status } = await fetchText("https://www.wns.com/about-us/careers/job-opportunities");
    console.log(`  HTTP ${status}`);
    if (text && status === 200) {
      // Look for job count patterns
      const allNumbers = [...text.matchAll(/(\d+)\s+(?:open|available|active|current)?\s*(?:job|position|opportunit|opening|role)/gi)];
      console.log(`  Job mentions: ${allNumbers.slice(0,5).map(m => m[0]).join(', ')}`);
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        console.log(`  WD URLs: ${wdUrls.map(u => `${u.tenant}.wd${u.pod}/${u.site}`).join(', ')}`);
        const w = wdUrls[0];
        const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) { const rc = await updateRoles("wns global", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} [workday]`); }
      }
      // Look for any ATS link
      const icimsMatch = text.match(/careers-([a-zA-Z0-9-]+)\.icims\.com/i);
      const ghMatch = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/i);
      if (icimsMatch) console.log(`  iCIMS: ${icimsMatch[1]}`);
      if (ghMatch) console.log(`  Greenhouse: ${ghMatch[1]}`);
      // Look for job listings directly
      const jobItems = [...text.matchAll(/href="[^"]*\/job[^"]*"/gi)];
      console.log(`  Job links in HTML: ${jobItems.length}`);
      // Show text snippet
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const jobSection = plain.indexOf('job');
      if (jobSection > 0) console.log(`  Job section: "${plain.slice(Math.max(0, jobSection - 50), jobSection + 200)}"`);
    }
    // Try Workday for WNS
    if (await isNull("wns global")) {
      for (const pod of ["1","5","3","501","101"]) {
        for (const site of ["WNS","WNS_Careers","WNSGlobal","external","careers"]) {
          const c = await tryWorkday("wns", site, pod); await sleep(150);
          if (c !== null) { const rc = await updateRoles("wns global", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} [wns.wd${pod}/${site}]`); break; }
        }
        if (!await isNull("wns global")) break;
      }
    }
    if (await isNull("wns global")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 4. BAYER CROPSCIENCE INDIA — Bayer AG global Workday ─────────────────
  console.log("\n=== Bayer CropScience India (via Bayer AG Workday) ===");
  if (await isNull("bayer cropscience india")) {
    // Bayer AG has a global Workday instance; India jobs are part of it
    // Try discovering Bayer's Workday tenant
    const { text } = await fetchText("https://www.bayer.com/en/careers");
    await sleep(400);
    if (text) {
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        console.log(`  Bayer WD: ${wdUrls.map(u => `${u.tenant}.wd${u.pod}/${u.site}`).join(', ')}`);
        const w = wdUrls[0];
        // Bayer global Workday count (all India jobs included in global total)
        const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) {
          console.log(`  Bayer global: ${c} jobs`);
          // For Bayer CropScience India specifically, we'd want just India jobs
          // But we can't filter by country via public API
          // Use the global count as a proxy with low confidence
          // Actually - don't use global count, it's not specific to Bayer CropScience India
          console.log(`  (Not inserting global count — not specific to Bayer CropScience India)`);
        }
      } else {
        console.log(`  No WD URL found in Bayer careers page`);
      }
    }
    // Try Bayer India career page specifically
    const indiaPages = [
      "https://www.bayer.com/en/in/about-bayer/careers",
      "https://www.bayercropscience.in/careers.html",
      "https://cropscience.bayer.co.in/en/careers.html",
    ];
    for (const url of indiaPages) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 50)} → ${status}`);
      if (!text || status !== 200) continue;
      const wdUrls = findWorkdayInHtml(text);
      const countMatch = text.match(/(\d+)\s+(?:vacancies|open|job|position|opportunit)/i);
      if (wdUrls.length > 0) console.log(`  WD: ${wdUrls[0].tenant}.wd${wdUrls[0].pod}`);
      if (countMatch) { console.log(`  Count: ${countMatch[0]}`); const rc = await updateRoles("bayer cropscience india", parseInt(countMatch[1]), "career_page_scrape"); updated += rc; break; }
    }
    if (await isNull("bayer cropscience india")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 5. KOLTE-PATIL & USHA MARTIN — examine 200 pages ────────────────────
  console.log("\n=== Kolte-Patil Developers ===");
  if (await isNull("kolte patil developers")) {
    const { text, status } = await fetchText("https://www.koltepatil.com/careers");
    if (text && status === 200) {
      const countMatch = text.match(/(\d+)\s+(?:vacancies|open|job|position|opportunit|opening)/i);
      if (countMatch) {
        console.log(`  Count: "${countMatch[0]}"`);
        const rc = await updateRoles("kolte patil developers", parseInt(countMatch[1]), "career_page_scrape"); updated += rc;
      }
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) { const w = wdUrls[0]; const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(300); if (c !== null) { const rc = await updateRoles("kolte patil developers", c, "workday_careers"); updated += rc; } }
      // Count job links
      const jobLinks = [...text.matchAll(/href="[^"]*(?:job|career|position|vacanc)[^"]*"/gi)];
      console.log(`  Job links: ${jobLinks.length}`);
      // Show page content
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 500);
      console.log(`  Page text: ${plain}`);
    } else {
      console.log(`  HTTP ${status}`);
    }
  }
  await sleep(500);

  console.log("\n=== Usha Martin ===");
  if (await isNull("usha martin")) {
    const { text, status } = await fetchText("https://www.ushamartin.com/careers");
    if (text && status === 200) {
      const countMatch = text.match(/(\d+)\s+(?:vacancies|open|job|position|opportunit)/i);
      if (countMatch) { console.log(`  Count: "${countMatch[0]}"`); const rc = await updateRoles("usha martin", parseInt(countMatch[1]), "career_page_scrape"); updated += rc; }
      const jobLinks = [...text.matchAll(/href="[^"]*(?:job|career|position|vacanc)[^"]*"/gi)];
      console.log(`  Job links: ${jobLinks.length}`);
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 500);
      console.log(`  Page text: ${plain}`);
    } else {
      console.log(`  HTTP ${status}`);
    }
  }
  await sleep(500);

  // ── 6. ALNYLAM — Try fetching with different headers ─────────────────────
  console.log("\n=== Alnylam Pharmaceuticals ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // Try with US locale
    const { text, status } = await fetchText("https://jobs.alnylam.com/careers/search?location=United+States&language=en");
    console.log(`  Jobs search → HTTP ${status}`);
    if (text && status === 200) {
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) { const w = wdUrls[0]; const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400); if (c !== null) { const rc = await updateRoles("alnylam pharmaceuticals", c, "workday_careers"); updated += rc; } }
      const countMatch = text.match(/(\d+)\s+(?:open|available)?\s*(?:job|position|opportunit)/i);
      if (countMatch) { console.log(`  Count: ${countMatch[0]}`); const n = parseInt(countMatch[1]); if (n > 0 && await isNull("alnylam pharmaceuticals")) { const rc = await updateRoles("alnylam pharmaceuticals", n, "career_page_scrape"); updated += rc; } }
      // Show more of page
      const allTexts = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Snippet: ${allTexts.slice(0, 400)}`);
    }
    // Try Workday with different tenant names
    if (await isNull("alnylam pharmaceuticals")) {
      for (const tenant of ["alnylam","alnylampharm","alnylampharma"]) {
        for (const [pod, site] of [["501","Alnylam"],["1","Alnylam_Career"],["3","Alnylam_External"],["5","Alnylam"]]) {
          const c = await tryWorkday(tenant, site, pod); await sleep(150);
          if (c !== null) { const rc = await updateRoles("alnylam pharmaceuticals", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} [${tenant}.wd${pod}/${site}]`); break; }
        }
        if (!await isNull("alnylam pharmaceuticals")) break;
      }
    }
    if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 7. MASIMO — Try more Workday variations ───────────────────────────────
  console.log("\n=== Masimo (extended Workday search) ===");
  if (await isNull("masimo")) {
    // Masimo Corp's Workday might have an unusual tenant name
    const masimoPods = ["501","601","401","301","201","101","702","302","402","502","602"];
    for (const pod of masimoPods) {
      for (const site of ["Masimo","MasimoCareers","external","careers","MasimoJobs"]) {
        const c = await tryWorkday("masimo", site, pod); await sleep(150);
        if (c !== null) { const rc = await updateRoles("masimo", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} [masimo.wd${pod}/${site}]`); break; }
      }
      if (!await isNull("masimo")) break;
    }
    if (await isNull("masimo")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 8. NOOM — Fetch job listings page and count items ────────────────────
  console.log("\n=== Noom (job listing page analysis) ===");
  if (await isNull("noom")) {
    const { text, status } = await fetchText("https://www.noom.com/careers/job-listings/");
    console.log(`  HTTP ${status}`);
    if (text) {
      // Noom had major layoffs - they might genuinely have very few jobs
      // Look for any job-like content
      const allMentions = [...text.matchAll(/(?:job|position|opening|role|career)/gi)];
      const numericRefs = [...text.matchAll(/\b(\d{1,3})\b/g)];
      console.log(`  'job' mentions: ${allMentions.length}`);
      // Check if there are any links to job postings
      const jobLinks = [...text.matchAll(/<a[^>]*href="([^"]*(?:job|posting|career|apply)[^"]*)"[^>]*>/gi)];
      console.log(`  Job-related links: ${jobLinks.length}`);
      // Try to find JSON data blobs
      const jsonBlobs = text.match(/window\.__INITIAL_STATE__\s*=\s*({.{0,2000}})/s)
                     || text.match(/window\.__NUXT__\s*=\s*({.{0,2000}})/s)
                     || text.match(/"jobs"\s*:\s*\[(.{0,500})\]/s);
      if (jsonBlobs) console.log(`  JSON blob found: ${jsonBlobs[0].slice(0, 100)}`);
    }
    if (await isNull("noom")) console.log("  → No data found for Noom");
  }
  await sleep(500);

  // ── 9. QLIK — Try Cloud Software Group careers ───────────────────────────
  console.log("\n=== Qlik (Cloud Software Group) ===");
  if (await isNull("qlik")) {
    const urls = [
      "https://www.qlik.com/us/company/careers",
      "https://talend.com/about-us/careers",
    ];
    for (const url of urls) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 50)} → HTTP ${status}`);
      if (!text || status !== 200) continue;
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        const w = wdUrls[0]; console.log(`  WD: ${w.tenant}.wd${w.pod}/${w.site}`);
        const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) { const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
      }
      // Check for Greenhouse embed
      const ghTok = text.match(/boards\.greenhouse\.io\/embed\/job_board\?for=([a-zA-Z0-9_-]+)/)?.[1]
                 || text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
      if (ghTok && ghTok !== "embed") {
        const { ok, data } = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${ghTok}/jobs`);
        await sleep(300);
        if (ok && Array.isArray(data?.jobs)) {
          const rc = await updateRoles("qlik", data.jobs.length, "greenhouse_api"); updated += rc;
          console.log(`  ✓ ${data.jobs.length} [greenhouse:${ghTok}]`); break;
        }
      }
    }
    if (await isNull("qlik")) console.log("  → No data found");
  }

  // Final summary
  const { rows: s } = await db.query(`SELECT count(*) AS total, count(total_open_roles) AS has_roles, count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null FROM verified_company_intelligence`);
  const { rows: nulls } = await db.query(`SELECT canonical_name, country_code FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
  await db.end();
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
}

main().catch(e => { console.error(e); process.exit(1); });
