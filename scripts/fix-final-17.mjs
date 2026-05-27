// fix-final-17.mjs — Targeted final push for remaining 17 NULL companies
// Separate approach per company — no shotgun, targeted research per ATS

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
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text() };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function fetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0", ...(opts.headers || {}) },
      signal: AbortSignal.timeout(12000), ...opts
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json();
    return { ok: true, status: 200, data };
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

async function tryGreenhouse(token) {
  const { ok, data } = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
  return (ok && Array.isArray(data?.jobs)) ? data.jobs.length : null;
}

async function tryLever(token) {
  const { ok, data } = await fetchJSON(`https://api.lever.co/v0/postings/${token}?mode=json`);
  return (ok && Array.isArray(data)) ? data.length : null;
}

async function tryAshby(token) {
  const { ok, data } = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${token}`);
  if (!ok) return null;
  return Array.isArray(data?.jobPostings) ? data.jobPostings.length : (Array.isArray(data?.jobs) ? data.jobs.length : null);
}

function findWorkdayInHtml(html) {
  const re = /https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/gi;
  const found = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    found.push({ tenant: m[1], pod: m[2], site: m[3] });
  }
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

  // ── REVERT: Noom "1" was career_page false match ──────────────────────────
  await db.query(`UPDATE verified_company_intelligence SET total_open_roles = NULL,
    hiring_source = NULL, hiring_verified_at = NULL, hiring_confidence = NULL,
    hiring_velocity_score = NULL, updated_at = NOW()
    WHERE canonical_name = 'noom' AND hiring_source = 'career_page_scrape'`);
  console.log("Reverted noom (false career_page match)\n");

  // ── 1. NOOM — Multiple ATS attempts ──────────────────────────────────────
  // Noom had layoffs 2023 (4k→800), still operating, might use Greenhouse/Ashby
  console.log("=== Noom ===");
  const noomTokens = [
    ["greenhouse", "noom-inc"], ["greenhouse", "noom"], ["greenhouse", "noomhealth"],
    ["ashby", "noom"], ["ashby", "noom-inc"],
    ["lever", "noom-inc"], ["lever", "noom"],
    ["greenhouse", "noom-weight"], ["greenhouse", "noomcorporation"],
  ];
  for (const [type, token] of noomTokens) {
    let c = null;
    if (type === "greenhouse") c = await tryGreenhouse(token);
    else if (type === "ashby") c = await tryAshby(token);
    else c = await tryLever(token);
    await sleep(300);
    if (c !== null) {
      const rc = await updateRoles("noom", c, type + "_api"); updated += rc;
      console.log(`  ✓ ${c} jobs [${type}:${token}]`); break;
    }
  }
  if (await isNull("noom")) {
    // Try fetching the actual careers page and look for ATS embed
    const { text, status } = await fetchText("https://www.noom.com/careers/job-listings/");
    if (text) {
      // Look for any job count hints or ATS URLs
      const wdUrls = findWorkdayInHtml(text);
      const ashbyTok = text.match(/jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/)?.[1];
      const ghEmbed = text.match(/boards\.greenhouse\.io\/embed\/job_board\?for=([a-zA-Z0-9_-]+)/)?.[1];
      const ghTok2 = text.match(/app\.greenhouse\.io\/accounts\/(\d+)/)?.[1];
      console.log(`  Noom career page: WD=${wdUrls.length} Ashby=${ashbyTok} GH-embed=${ghEmbed} GH-id=${ghTok2}`);
      if (ghEmbed && ghEmbed !== 'embed') {
        const c = await tryGreenhouse(ghEmbed); await sleep(300);
        if (c !== null) { const rc = await updateRoles("noom", c, "greenhouse_api"); updated += rc; console.log(`  ✓ ${c} [gh:${ghEmbed}]`); }
      }
      // Count actual job postings in the HTML
      const jobLinks = [...text.matchAll(/href="[^"]*\/jobs?\/\d+[^"]*"/gi)];
      const jobListItems = [...text.matchAll(/<(li|article|div)[^>]*class="[^"]*job[^"]*"/gi)];
      console.log(`  Job links: ${jobLinks.length} | Job items: ${jobListItems.length}`);
    }
  }
  if (await isNull("noom")) console.log("  → No data found for Noom");

  // ── 2. VANGUARD — The Vanguard Group ─────────────────────────────────────
  // 21,000 employees, financial services. Uses Workday.
  console.log("\n=== Vanguard ===");
  // Their career site appears to be vanguardjobs.com but it's a JS app
  // Try Workday with extended pod range and more site names
  const vanguardSites = [
    "VanguardCareers", "Vanguard_Careers", "VanguardInternational",
    "external", "Vanguard", "VanguardGroup", "VanguardJobsSite",
    "VanguardCareerSite", "vanguard_careers", "VanguardUS",
    "VFIS_Careers", "VFI", "VanguardPhoenix",
  ];
  // Try extended pod list
  const extPods = ["1","3","5","101","201","301","401","501","601","701","102","502","103","203","402","502","602","702"];
  let foundVanguard = false;
  for (const pod of extPods.slice(0, 10)) {  // Try first 10 pods
    for (const site of vanguardSites.slice(0, 6)) {
      const c = await tryWorkday("vanguard", site, pod);
      await sleep(150);
      if (c !== null) {
        console.log(`  ✓ ${c} [vanguard.wd${pod}/${site}]`);
        const rc = await updateRoles("vanguard", c, "workday_careers"); updated += rc;
        foundVanguard = true; break;
      }
    }
    if (foundVanguard) break;
  }
  if (!foundVanguard) {
    // Try fetching their WordPress-powered job board for an API
    const { text } = await fetchText("https://www.vanguardjobs.com/?s=&post_type=job_listing");
    if (text) {
      const wdUrls = findWorkdayInHtml(text);
      console.log(`  WD in search page: ${wdUrls.length > 0 ? wdUrls[0].tenant + '.wd' + wdUrls[0].pod : 'none'}`);
      // Look for WP Job Manager API
      const { data } = await fetchJSON("https://www.vanguardjobs.com/wp-json/wp/v2/job_listing?per_page=1&_fields=id");
      if (data && Array.isArray(data)) {
        // Check total via headers
        const r2 = await fetch("https://www.vanguardjobs.com/wp-json/wp/v2/job_listing?per_page=1&_fields=id", {
          headers: BROWSER_HDR, signal: AbortSignal.timeout(10000) });
        await sleep(300);
        const total = parseInt(r2.headers.get("X-WP-Total") || "0", 10);
        if (total > 0) {
          console.log(`  ✓ ${total} [wp-job-manager]`);
          const rc = await updateRoles("vanguard", total, "wp_job_manager"); updated += rc;
          foundVanguard = true;
        }
      }
    }
    if (!foundVanguard) console.log("  → No data found for Vanguard");
  }

  // ── 3. ALNYLAM PHARMACEUTICALS ────────────────────────────────────────────
  // 2,400 employees, RNA therapeutics. Career page at jobs.alnylam.com
  console.log("\n=== Alnylam Pharmaceuticals ===");
  // Their career portal at jobs.alnylam.com appears to be Hirebridge or Taleo
  // Let me try fetching the main company career page and look for the embedded ATS
  const alnUrls = [
    "https://www.alnylam.com/careers/current-openings/",
    "https://www.alnylam.com/careers/job-listings/",
    "https://jobs.alnylam.com/jobs",
    "https://jobs.alnylam.com/careers/search",
  ];
  for (const url of alnUrls) {
    const { text, status, finalUrl } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(20)} → HTTP ${status} → ${finalUrl?.slice(20)}`);
    if (!text || status !== 200) continue;
    const wdUrls = findWorkdayInHtml(text);
    if (wdUrls.length > 0) {
      const w = wdUrls[0];
      console.log(`  Found WD: ${w.tenant}.wd${w.pod}/${w.site}`);
      const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
      if (c !== null) { const rc = await updateRoles("alnylam pharmaceuticals", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c}`); break; }
    }
    // Look for Taleo (Oracle) ATS
    const taleoMatch = text.match(/taleo\.net\/careersection\/([^\/]+)\/jobsearch\.ftl/i);
    if (taleoMatch) {
      console.log(`  Taleo: ${taleoMatch[1]}`);
      // Taleo doesn't have a simple count API - skip
    }
    // Look for icims
    const icimsMatch = text.match(/careers-([a-zA-Z0-9-]+)\.icims\.com/i);
    if (icimsMatch) console.log(`  iCIMS: ${icimsMatch[1]}`);
    // Look for job count in text
    const countMatch = text.match(/(\d+)\s+(?:open|available)?\s*(?:job|position|opportunit)/i);
    if (countMatch) {
      console.log(`  Count mention: "${countMatch[0]}"`);
      const n = parseInt(countMatch[1]);
      if (n > 0 && n < 5000 && await isNull("alnylam pharmaceuticals")) {
        const rc = await updateRoles("alnylam pharmaceuticals", n, "career_page_scrape"); updated += rc;
      }
    }
    if (!await isNull("alnylam pharmaceuticals")) break;
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");

  // ── 4. CERTARA — Confirm career page approach ─────────────────────────────
  // 1,500 employees, pharma simulation software
  console.log("\n=== Certara ===");
  const certUrls = [
    "https://www.certara.com/careers/open-positions/",
    "https://careers.certara.com/search",
    "https://careers.certara.com/jobs",
  ];
  for (const url of certUrls) {
    const { text, status } = await fetchText(url);
    await sleep(400);
    console.log(`  ${url.slice(20)} → HTTP ${status}`);
    if (!text || status !== 200) continue;
    const wdUrls = findWorkdayInHtml(text);
    if (wdUrls.length > 0) {
      const w = wdUrls[0];
      console.log(`  WD: ${w.tenant}.wd${w.pod}/${w.site}`);
      const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
      if (c !== null) { const rc = await updateRoles("certara", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c}`); break; }
    }
    // Try extracting job count (more carefully than before)
    const countMatch = text.match(/(\d{1,4})\s+(?:open|available|current|active)?\s*(?:job|position|opportunit|role)/i);
    if (countMatch) {
      const n = parseInt(countMatch[1]);
      if (n > 0 && n < 5000) {
        console.log(`  Count: "${countMatch[0]}"`);
        if (await isNull("certara")) {
          const rc = await updateRoles("certara", n, "career_page_scrape"); updated += rc;
        }
        break;
      }
    }
    if (!await isNull("certara")) break;
  }
  if (await isNull("certara")) {
    // Try their ATS tokens
    for (const [fn, src, tok] of [
      [() => tryAshby("certara"), "ashby", "certara"],
      [() => tryGreenhouse("certarainc"), "greenhouse", "certarainc"],
      [() => tryLever("certara-inc"), "lever", "certara-inc"],
    ]) {
      const c = await fn(); await sleep(300);
      if (c !== null) { const rc = await updateRoles("certara", c, src + "_api"); updated += rc; console.log(`  ✓ ${c} [${src}:${tok}]`); break; }
    }
  }
  if (await isNull("certara")) console.log("  → No data found");

  // ── 5. INSULET — OmniPod insulin pump manufacturer ───────────────────────
  // 5,500 employees, uses iCIMS (known)
  console.log("\n=== Insulet ===");
  // iCIMS URL patterns for Insulet
  const icimsUrls = [
    "https://careers-insulet.icims.com/jobs/search?ss=1",
    "https://jobs-insulet.icims.com/jobs/search?ss=1",
    "https://insulet.icims.com/jobs/search",
    "https://icims.com/career/Insulet",
  ];
  for (const url of icimsUrls) {
    const { text, status } = await fetchText(url);
    await sleep(500);
    console.log(`  ${url.slice(8, 60)} → HTTP ${status}`);
    if (!text || status !== 200) continue;
    // iCIMS returns job count in HTML
    const countMatch = text.match(/(\d+)\s+(?:job|position|opportunit)/i)
                    || text.match(/"count"\s*:\s*(\d+)/)
                    || text.match(/"totalCount"\s*:\s*(\d+)/);
    if (countMatch) {
      console.log(`  Count: ${countMatch[1]}`);
      const rc = await updateRoles("insulet", parseInt(countMatch[1]), "icims_careers"); updated += rc; break;
    }
    const wdUrls = findWorkdayInHtml(text);
    if (wdUrls.length > 0) {
      const w = wdUrls[0];
      const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
      if (c !== null) { const rc = await updateRoles("insulet", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c}`); break; }
    }
  }
  if (await isNull("insulet")) {
    // Try Workday with new site names
    for (const [pod, site] of [["1","Insulet"], ["5","Insulet"], ["501","Insulet"], ["1","InsuletCorp"], ["5","InsuletCorp"]]) {
      const c = await tryWorkday("insulet", site, pod); await sleep(200);
      if (c !== null) { const rc = await updateRoles("insulet", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} [wd${pod}/${site}]`); break; }
    }
  }
  if (await isNull("insulet")) {
    const { text } = await fetchText("https://www.insulet.com/en-US/about/insulet-corporation");
    if (text) {
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        const w = wdUrls[0]; console.log(`  Found WD in about page: ${w.tenant}.wd${w.pod}/${w.site}`);
        const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) { const rc = await updateRoles("insulet", c, "workday_careers"); updated += rc; }
      }
    }
  }
  if (await isNull("insulet")) console.log("  → No data found");

  // ── 6. MASIMO — Cloudflare blocks career page, try other paths ───────────
  // 7,900 employees, medical device (pulse oximetry)
  console.log("\n=== Masimo ===");
  // Try fetching Masimo with different approach (maybe through proxy path or different URL)
  const masimoUrls = [
    "https://masimo.wd5.myworkdayjobs.com/en-US/Masimo/jobs",  // direct Workday page
    "https://masimo.wd1.myworkdayjobs.com/en-US/Masimo/jobs",
    "https://masimo.wd3.myworkdayjobs.com/en-US/Masimo/jobs",
  ];
  // Since career page is Cloudflare-blocked, try Workday CXS API directly for more sites
  const masimoSites = ["Masimo", "MasimoCareers", "Masimo_Careers", "MasimoCorp", "external",
                       "Masimo_Corporate", "MasimoJobs", "careers", "masimo"];
  for (const pod of ["1","3","5","101","201","301","401","501","601","701"]) {
    let found = false;
    for (const site of masimoSites) {
      const c = await tryWorkday("masimo", site, pod); await sleep(150);
      if (c !== null) {
        console.log(`  ✓ ${c} [masimo.wd${pod}/${site}]`);
        const rc = await updateRoles("masimo", c, "workday_careers"); updated += rc;
        found = true; break;
      }
    }
    if (found) break;
  }
  // Also try different tenant name
  if (await isNull("masimo")) {
    for (const tenant of ["masimocorp", "masimohealthcare", "masimo-corp"]) {
      for (const site of ["Masimo", "external", "careers"]) {
        const c = await tryWorkday(tenant, site, "1"); await sleep(150);
        if (c !== null) { const rc = await updateRoles("masimo", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} [${tenant}.wd1/${site}]`); break; }
      }
    }
  }
  if (await isNull("masimo")) {
    // Try ATS alternatives
    for (const [fn, src, tok] of [
      [() => tryGreenhouse("masimo"), "greenhouse", "masimo"],
      [() => tryLever("masimo"), "lever", "masimo"],
      [() => tryAshby("masimo"), "ashby", "masimo"],
      [() => tryGreenhouse("masimocorp"), "greenhouse", "masimocorp"],
    ]) {
      const c = await fn(); await sleep(300);
      if (c !== null) { const rc = await updateRoles("masimo", c, src + "_api"); updated += rc; console.log(`  ✓ ${c} [${src}:${tok}]`); break; }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");

  // ── 7. QLIK — Now part of Cloud Software Group ────────────────────────────
  // 3,500 employees (Cloud Software Group: Qlik + Talend combined)
  console.log("\n=== Qlik (Cloud Software Group) ===");
  // Try various Workday tenants for Cloud Software Group
  for (const tenant of ["qlik", "cloudsoftwaregroup", "cloudsg", "qliktech"]) {
    const result_sites = ["Qlik", "CloudSoftwareGroup", "external", "careers", "QlikCareers"];
    for (const site of result_sites) {
      const c = await tryWorkday(tenant, site, "1"); await sleep(150);
      if (c !== null) { const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} [${tenant}.wd1/${site}]`); break; }
    }
    if (!await isNull("qlik")) break;
  }
  if (await isNull("qlik")) {
    // Try their job boards and ATS
    for (const url of ["https://www.qlik.com/us/company/life-at-qlik", "https://qlik.com/careers"]) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      if (!text || status !== 200) continue;
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        const w = wdUrls[0]; console.log(`  WD in ${url}: ${w.tenant}.wd${w.pod}/${w.site}`);
        const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) { const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
      }
      const gh = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
      if (gh && gh !== "embed") { const c = await tryGreenhouse(gh); await sleep(300); if (c !== null) { const rc = await updateRoles("qlik", c, "greenhouse_api"); updated += rc; break; } }
    }
  }
  if (await isNull("qlik")) console.log("  → No data found");

  // ── 8. India companies — targeted career page attempts ───────────────────
  console.log("\n=== India companies ===");

  // WNS Global (44,000 employees, NYSE-listed BPO)
  if (await isNull("wns global")) {
    const urls = [
      "https://www.wns.com/about-us/careers/job-opportunities",
      "https://www.wns.com/careers/open-positions/",
      "https://wns.wd5.myworkdayjobs.com/en-US/WNS_Careers",
    ];
    for (const url of urls) {
      const { text, status } = await fetchText(url);
      await sleep(500);
      console.log(`  WNS: ${url.slice(8, 55)} → HTTP ${status}`);
      if (!text || status !== 200) continue;
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        const w = wdUrls[0];
        const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) { const rc = await updateRoles("wns global", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c}`); break; }
      }
      const countMatch = text.match(/(\d+)\s+(?:open|available|active)?\s*(?:job|position|opportunit)/i);
      if (countMatch) {
        const n = parseInt(countMatch[1]);
        console.log(`  Count: "${countMatch[0]}"`);
        if (n > 0 && n < 50000) { const rc = await updateRoles("wns global", n, "career_page_scrape"); updated += rc; break; }
      }
    }
    // Try Workday for WNS
    if (await isNull("wns global")) {
      for (const [tenant, site] of [["wns","WNS"], ["wns","WNS_Careers"], ["wnsholdings","WNS"], ["wns","external"]]) {
        for (const pod of ["1","5","3","501"]) {
          const c = await tryWorkday(tenant, site, pod); await sleep(150);
          if (c !== null) { const rc = await updateRoles("wns global", c, "workday_careers"); updated += rc; console.log(`  ✓ WNS ${c} [wd${pod}]`); break; }
        }
        if (!await isNull("wns global")) break;
      }
    }
  }

  // Bayer CropScience India — uses Bayer AG's global Workday
  if (await isNull("bayer cropscience india")) {
    // Bayer AG uses Workday globally; India operations may be listed there
    // Try Bayer's Workday with India filter or just get global count for Bayer India
    for (const [tenant, pod] of [["bayer","3"],["bayer","5"],["bayer","1"]]) {
      for (const site of ["Bayer_India", "Bayer", "BayerCareers", "external"]) {
        const c = await tryWorkday(tenant, site, pod); await sleep(200);
        if (c !== null) {
          console.log(`  Bayer Workday [${tenant}.wd${pod}/${site}]: ${c}`);
          if (c > 0) { const rc = await updateRoles("bayer cropscience india", c, "workday_careers_bayer_global"); updated += rc; break; }
        }
      }
      if (!await isNull("bayer cropscience india")) break;
    }
    // Try Bayer's career page for India
    if (await isNull("bayer cropscience india")) {
      const { text, status } = await fetchText("https://www.bayer.com/en/in/careers");
      await sleep(400);
      console.log(`  Bayer India career: HTTP ${status}`);
      if (text && status === 200) {
        const wdUrls = findWorkdayInHtml(text);
        if (wdUrls.length > 0) {
          const w = wdUrls[0]; console.log(`  Bayer WD: ${w.url}`);
          const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
          if (c !== null) { const rc = await updateRoles("bayer cropscience india", c, "workday_careers"); updated += rc; }
        }
      }
    }
  }

  // Steel Authority of India (SAIL) — 65,000 employees, government
  if (await isNull("steel authority of india")) {
    const { text, status } = await fetchText("https://sail.co.in/en/career");
    console.log(`  SAIL career: HTTP ${status}`);
    if (text && status === 200) {
      const countMatch = text.match(/(\d+)\s+(?:vacancies|post|job|position|opportunit)/i);
      if (countMatch) { console.log(`  Count: "${countMatch[0]}"`); const rc = await updateRoles("steel authority of india", parseInt(countMatch[1]), "career_page_sail"); updated += rc; }
    }
  }

  // Union Bank of India — government bank
  if (await isNull("union bank of india")) {
    const { text, status } = await fetchText("https://www.unionbankofindia.co.in/english/career.aspx");
    await sleep(400);
    console.log(`  Union Bank career: HTTP ${status}`);
    if (text && status === 200) {
      const countMatch = text.match(/(\d+)\s+(?:vacancies|post|job|position|opening)/i);
      if (countMatch) { const rc = await updateRoles("union bank of india", parseInt(countMatch[1]), "career_page_ubi"); updated += rc; }
      // Check if any notifications are listed
      const notifMatch = text.match(/notification|advertisement|recruitment/gi);
      if (notifMatch) console.log(`  Found ${notifMatch.length} recruitment-related entries`);
    }
  }

  // Phoenix Mills — real estate group
  if (await isNull("phoenix mills")) {
    const { text, status } = await fetchText("https://www.phoenixmills.co.in/careers");
    await sleep(400);
    console.log(`  Phoenix Mills career: HTTP ${status}`);
    if (text && status === 200) {
      const wdUrls = findWorkdayInHtml(text);
      const countMatch = text.match(/(\d+)\s+(?:vacancies|post|job|position|opportunit)/i);
      if (countMatch) { const rc = await updateRoles("phoenix mills", parseInt(countMatch[1]), "career_page_scrape"); updated += rc; }
      if (wdUrls.length > 0) { const w = wdUrls[0]; const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400); if (c !== null) { const rc = await updateRoles("phoenix mills", c, "workday_careers"); updated += rc; } }
    }
  }

  // Vijaya Diagnostic — diagnostic company (IPO 2021)
  if (await isNull("vijaya diagnostic")) {
    const { text, status } = await fetchText("https://www.vijayaonline.com/careers");
    await sleep(400);
    console.log(`  Vijaya Diagnostic career: HTTP ${status}`);
    if (text && status === 200) {
      const countMatch = text.match(/(\d+)\s+(?:vacancies|post|job|position|opportunit)/i);
      if (countMatch) { const rc = await updateRoles("vijaya diagnostic", parseInt(countMatch[1]), "career_page_scrape"); updated += rc; }
    }
  }

  // PFC Ltd — Power Finance Corporation (government NBFC)
  if (await isNull("pfc ltd")) {
    const { text, status } = await fetchText("https://www.pfcindia.com/Home/career");
    await sleep(400);
    console.log(`  PFC career: HTTP ${status}`);
    if (text && status === 200) {
      const vacancyMatch = text.match(/(\d+)\s+(?:vacancy|vacancies|post|job|position)/gi);
      if (vacancyMatch) { console.log(`  PFC mentions: ${vacancyMatch.slice(0,3).join(', ')}`); }
    }
  }

  // Kolte-Patil Developers — real estate
  if (await isNull("kolte patil developers")) {
    const { text, status } = await fetchText("https://www.koltepatil.com/careers");
    await sleep(400);
    console.log(`  Kolte-Patil: HTTP ${status}`);
    if (text && status === 200) {
      const countMatch = text.match(/(\d+)\s+(?:vacancies|post|job|position|opportunit)/i);
      if (countMatch) { const rc = await updateRoles("kolte patil developers", parseInt(countMatch[1]), "career_page_scrape"); updated += rc; }
    }
  }

  // GSPL (Gujarat State Petronet) — utility company
  if (await isNull("gspl")) {
    const { text, status } = await fetchText("https://www.gspcgroup.com/careers");
    await sleep(400);
    console.log(`  GSPL career: HTTP ${status}`);
    // GSPL is small (~500 employees), likely has few jobs
  }

  // Usha Martin — steel wire manufacturer
  if (await isNull("usha martin")) {
    const { text, status } = await fetchText("https://www.ushamartin.com/careers");
    await sleep(400);
    console.log(`  Usha Martin career: HTTP ${status}`);
    if (text && status === 200) {
      const countMatch = text.match(/(\d+)\s+(?:vacancies|post|job|position|opportunit)/i);
      if (countMatch) { const rc = await updateRoles("usha martin", parseInt(countMatch[1]), "career_page_scrape"); updated += rc; }
    }
  }

  // Final summary
  const { rows: s } = await db.query(`
    SELECT count(*) AS total, count(total_open_roles) AS has_roles,
      count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null
    FROM verified_company_intelligence
  `);
  const { rows: nulls } = await db.query(`
    SELECT canonical_name, country_code FROM verified_company_intelligence
    WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name
  `);
  await db.end();

  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated this run: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
}

main().catch(e => { console.error(e); process.exit(1); });
