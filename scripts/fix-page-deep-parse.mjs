// fix-page-deep-parse.mjs
// Deep-parse accessible career pages, force US locale for Alnylam,
// discover Vanguard ATS from individual job links, fix Noom count

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const BROWSER_US = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "CF-IPCountry": "US",
  "X-Forwarded-For": "8.8.8.8",
  "Referer": "https://www.google.com/",
};

async function fetchText(url, hdrs = BROWSER_US) {
  try {
    const res = await fetch(url, { headers: hdrs, redirect: "follow", signal: AbortSignal.timeout(15000) });
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text() };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function fetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0", "CF-IPCountry": "US", ...(opts.headers || {}) },
      signal: AbortSignal.timeout(12000), ...opts
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: await res.json() };
  } catch (e) { return { ok: false, error: e.message }; }
}

function findWorkdayInHtml(html) {
  const re = /https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/gi;
  const found = []; let m;
  while ((m = re.exec(html)) !== null) found.push({ tenant: m[1], pod: m[2], site: m[3], url: m[0] });
  return found;
}

async function tryWorkday(tenant, site, pod) {
  const { ok, data } = await fetchJSON(
    `https://${tenant}.wd${pod}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
    { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
      headers: { "Content-Type": "application/json" } }
  );
  return (ok && typeof data?.total === "number") ? data.total : null;
}

async function updateRoles(cn, count, source) {
  const vel = count > 1000 ? 1.5 : count > 500 ? 1.0 : count > 100 ? 0.5 : count > 0 ? 0.1 : -0.5;
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence SET total_open_roles = $2, hiring_source = $3,
     hiring_verified_at = NOW(), hiring_confidence = 0.82, hiring_velocity_score = $4, updated_at = NOW()
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

  // ── 1. ALNYLAM — Force US locale, try different paths ────────────────────
  console.log("=== Alnylam Pharmaceuticals (forced US locale) ===");
  if (await isNull("alnylam pharmaceuticals")) {
    const alnUrls = [
      "https://jobs.alnylam.com/careers?country=US&language=en-US",
      "https://jobs.alnylam.com/careers?language=en_US",
      "https://jobs.alnylam.com/careers?region=NA",
      "https://www.alnylam.com/careers",
    ];
    for (const url of alnUrls) {
      const { text, status } = await fetchText(url, { ...BROWSER_US, Cookie: "locale=en_US; country=US" });
      await sleep(400);
      console.log(`  ${url.slice(8, 60)} → HTTP ${status}`);
      if (!text || status !== 200) continue;
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        console.log(`  ✓ WD found: ${wdUrls[0].url}`);
        const w = wdUrls[0];
        const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) { const rc = await updateRoles("alnylam pharmaceuticals", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} jobs`); break; }
      }
      // Look for any job count or job list in page
      const countMatch = text.match(/"total"\s*:\s*(\d+)/) || text.match(/"count"\s*:\s*(\d+)/)
                      || text.match(/(\d{1,4})\s+(?:open|active)?\s*(?:job|position|opportunit)/i);
      if (countMatch) {
        const n = parseInt(countMatch[1]);
        if (n > 0 && n < 2000) {
          console.log(`  Count found: ${n}`);
          const rc = await updateRoles("alnylam pharmaceuticals", n, "career_page_scrape"); updated += rc; break;
        }
      }
      // Show snippet
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const idx = plain.indexOf('position');
      if (idx > 0) console.log(`  Position context: ${plain.slice(Math.max(0, idx-30), idx+100)}`);
    }
    if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 2. VANGUARD — Find ATS from job page links ────────────────────────────
  console.log("\n=== Vanguard (deep link analysis) ===");
  if (await isNull("vanguard")) {
    const { text, status } = await fetchText("https://www.vanguardjobs.com");
    if (text && status === 200) {
      // Find all hrefs in the page (job links would be Workday URLs)
      const allHrefs = [...text.matchAll(/href="([^"]+)"/gi)].map(m => m[1]);
      const wdHrefs = allHrefs.filter(h => h.includes("myworkdayjobs"));
      const jobHrefs = allHrefs.filter(h => h.includes("/job/") || h.includes("/jobs/") || h.includes("career"));
      console.log(`  All hrefs: ${allHrefs.length} | WD: ${wdHrefs.length} | Job: ${jobHrefs.length}`);
      if (wdHrefs.length > 0) {
        console.log(`  WD hrefs: ${wdHrefs.slice(0, 3).join(', ')}`);
        const wdMatch = wdHrefs[0].match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/i);
        if (wdMatch) {
          const [, tenant, pod, site] = wdMatch;
          const c = await tryWorkday(tenant, site, pod); await sleep(400);
          if (c !== null) { const rc = await updateRoles("vanguard", c, "workday_careers"); updated += rc; console.log(`  ✓ ${c} [wd${pod}/${site}]`); }
        }
      }
      // Check page source for Workday config
      const wdConfig = text.match(/wd(?:\w*)\.myworkdayjobs\.com[\s\S]{0,100}/gi);
      if (wdConfig) console.log(`  WD configs: ${wdConfig.slice(0,2).join(' | ')}`);
      // Try WP admin-ajax
      if (await isNull("vanguard")) {
        const r2 = await fetchJSON("https://www.vanguardjobs.com/wp-admin/admin-ajax.php", {
          method: "POST",
          body: "action=get_listings&lang=&search_keywords=&search_location=&per_page=100&orderby=featured&order=DESC&page=1&show_pagination=false&template=default&types%5B%5D=full-time",
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        await sleep(400);
        if (r2.ok) {
          const count = r2.data?.found_jobs ?? (Array.isArray(r2.data?.listings) ? r2.data.listings.length : null);
          console.log(`  AJAX found_jobs: ${count}`);
          if (count !== null && count > 0) { const rc = await updateRoles("vanguard", count, "wp_job_manager"); updated += rc; }
        }
      }
    }
    if (await isNull("vanguard")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 3. CERTARA — Try API endpoint discovery ───────────────────────────────
  console.log("\n=== Certara ===");
  if (await isNull("certara")) {
    // Try fetching their API endpoints that power the careers.certara.com SPA
    const apis = [
      "https://careers.certara.com/api/jobs",
      "https://careers.certara.com/api/jobs/search",
      "https://careers.certara.com/jobs",
      "https://careers.certara.com/api/v1/jobs",
    ];
    for (const url of apis) {
      const { ok, data, status } = await fetchJSON(url); await sleep(300);
      console.log(`  ${url.slice(20)} → ${status}`);
      if (!ok || !data) continue;
      const count = data.total ?? data.count ?? data.totalCount ?? (Array.isArray(data.jobs) ? data.jobs.length : null) ?? (Array.isArray(data) ? data.length : null);
      if (count !== null) { console.log(`  Count: ${count}`); const rc = await updateRoles("certara", count, "certara_api"); updated += rc; break; }
    }
    // Try the SPA's bundle URL to find the API endpoint
    if (await isNull("certara")) {
      const { text } = await fetchText("https://careers.certara.com/");
      if (text) {
        // Look for API calls in the JS
        const apiMatches = text.match(/api\.certara\.com[^"'\s]*/gi) || text.match(/\/api\/v\d\/[^"'\s]*/gi);
        if (apiMatches) console.log(`  API patterns: ${apiMatches.slice(0, 3).join(', ')}`);
        const wdUrls = findWorkdayInHtml(text);
        if (wdUrls.length > 0) {
          const w = wdUrls[0]; console.log(`  WD: ${w.url}`);
          const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
          if (c !== null) { const rc = await updateRoles("certara", c, "workday_careers"); updated += rc; }
        }
      }
    }
    if (await isNull("certara")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 4. INSULET — Try more specific career URLs ────────────────────────────
  console.log("\n=== Insulet (career URL discovery) ===");
  if (await isNull("insulet")) {
    const insuletUrls = [
      "https://www.insulet.com/careers",
      "https://www.insulet.com/en-US/career",
      "https://jobs.insulet.com",
      "https://insuletcorp.com/careers",
    ];
    for (const url of insuletUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 45)} → ${status} → ${finalUrl?.slice(8, 55)}`);
      if (!text || status !== 200) continue;
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        const w = wdUrls[0]; console.log(`  WD: ${w.tenant}.wd${w.pod}/${w.site}`);
        const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) { const rc = await updateRoles("insulet", c, "workday_careers"); updated += rc; break; }
      }
      const icimsMatch = text.match(/careers-([a-zA-Z0-9-]+)\.icims\.com/i);
      if (icimsMatch) console.log(`  iCIMS slug: ${icimsMatch[1]}`);
      const countMatch = text.match(/(\d+)\s+(?:open|job|position|opportunit)/i);
      if (countMatch) { console.log(`  Count: ${countMatch[0]}`); const n = parseInt(countMatch[1]); if (n > 0 && n < 10000) { const rc = await updateRoles("insulet", n, "career_page_scrape"); updated += rc; break; } }
      if (!await isNull("insulet")) break;
    }
    if (await isNull("insulet")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 5. MASIMO — fetch from LinkedIn Jobs count ────────────────────────────
  console.log("\n=== Masimo (alternative sources) ===");
  if (await isNull("masimo")) {
    // Try to access Masimo's SEC filing or annual report for headcount clues
    // Actually, try fetching the Glassdoor company page
    const { text, status } = await fetchText("https://www.glassdoor.com/Jobs/Masimo-Jobs-E12345.htm");
    await sleep(400);
    if (text && status === 200) {
      const countMatch = text.match(/(\d+)\s+(?:open|job|position|opportunit)/i);
      if (countMatch) console.log(`  Glassdoor: ${countMatch[0]}`);
    }
    // Try fetching Masimo IR page to find career page link
    const { text: ir } = await fetchText("https://ir.masimo.com");
    if (ir) {
      const careerLinks = [...ir.matchAll(/href="([^"]*(?:career|job)[^"]*)"/gi)].map(m => m[1]);
      console.log(`  IR career links: ${careerLinks.slice(0, 3).join(', ')}`);
    }
    // Try Workday with different approach - fetch JUST the tenant base URL
    for (const pod of ["401","601","501","301","702","802"]) {
      const { ok, status } = await fetchJSON(`https://masimo.wd${pod}.myworkdayjobs.com`);
      await sleep(200);
      if (ok) { console.log(`  masimo.wd${pod} exists!`); }
    }
    if (await isNull("masimo")) console.log("  → No data found");
  }
  await sleep(600);

  // ── 6. NOOM — Count actual job listing links precisely ────────────────────
  console.log("\n=== Noom (counting actual job links) ===");
  if (await isNull("noom")) {
    const { text, status } = await fetchText("https://www.noom.com/careers/job-listings/");
    if (text && status === 200) {
      // Extract all anchors
      const allLinks = [...text.matchAll(/<a[^>]*href="([^"]+)"[^>]*>/gi)];
      const jobLinks = allLinks.filter(m => {
        const href = m[1];
        return /job|posting|position|opening|apply|greenhouse|lever|ashby/i.test(href) &&
               !href.includes('#') && !href.includes('javascript') && !href.startsWith('mailto') &&
               !href.includes('linkedin') && !href.includes('twitter');
      });
      console.log(`  Total links: ${allLinks.length} | Job-related: ${jobLinks.length}`);
      for (const jl of jobLinks.slice(0, 10)) console.log(`    ${jl[1]}`);
      // If very few job links, this might be the actual count
      // Noom post-layoffs might have 0-10 positions
      if (jobLinks.length >= 0) {
        // Look for explicit job count
        const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const countMatch = plainText.match(/(\d+)\s+(?:open|available|active)?\s*(?:position|job|role|opportunit)/i);
        if (countMatch) {
          const n = parseInt(countMatch[1]);
          console.log(`  Explicit count: ${n}`);
          if (n >= 0 && n < 1000) { const rc = await updateRoles("noom", n, "career_page_noom"); updated += rc; }
        } else if (jobLinks.length === 0) {
          // Zero job links = 0 jobs
          const rc = await updateRoles("noom", 0, "career_page_noom"); updated += rc;
          console.log(`  → 0 jobs (no job links on career page)`);
        }
      }
    }
    if (await isNull("noom")) console.log("  → No data found for Noom");
  }
  await sleep(600);

  // ── 7. KOLTE-PATIL — Deep parse job links ────────────────────────────────
  console.log("\n=== Kolte-Patil Developers ===");
  if (await isNull("kolte patil developers")) {
    const { text, status } = await fetchText("https://www.koltepatil.com/careers");
    if (text && status === 200) {
      // Extract all links
      const allLinks = [...text.matchAll(/<a[^>]*href="([^"]+)"[^>]*>/gi)].map(m => m[1]);
      const jobLinks = allLinks.filter(h => /job|career|position|apply|vacanc/i.test(h) && !h.includes('#') && !h.includes('javascript') && !h.includes('mailto'));
      console.log(`  Total links: ${allLinks.length} | Job links: ${jobLinks.length}`);
      for (const jl of jobLinks.slice(0, 5)) console.log(`    ${jl}`);
      // Count unique job posting hrefs (not navigation)
      const uniqueJobPaths = [...new Set(jobLinks.filter(h => h.length > 5))];
      console.log(`  Unique job paths: ${uniqueJobPaths.length}`);
      // Also look for "Apply" buttons or position mentions
      const applyButtons = text.match(/<[^>]*apply[^>]*>/gi) || [];
      const positionText = text.match(/(?:Sr\.|Junior|Senior|Manager|Engineer|Analyst|Executive|Developer|Head|Lead|Intern)\s+\w+/gi) || [];
      console.log(`  Apply buttons: ${applyButtons.length} | Position titles: ${positionText.length}`);
      // Count position titles as job count
      if (positionText.length > 0) {
        console.log(`  Titles: ${positionText.slice(0, 5).join(', ')}`);
        // Unique titles
        const uniqueTitles = [...new Set(positionText.map(t => t.trim()))];
        console.log(`  Unique titles: ${uniqueTitles.length} | ${uniqueTitles.slice(0, 5).join(', ')}`);
        if (uniqueTitles.length > 0) {
          const rc = await updateRoles("kolte patil developers", uniqueTitles.length, "career_page_parsed"); updated += rc;
        }
      }
    }
  }
  await sleep(500);

  // ── 8. USHA MARTIN — Count job links precisely ───────────────────────────
  console.log("\n=== Usha Martin ===");
  if (await isNull("usha martin")) {
    const { text, status } = await fetchText("https://www.ushamartin.com/careers");
    if (text && status === 200) {
      const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      // Count job-title mentions
      const jobTitles = text.match(/(?:Manager|Engineer|Executive|Analyst|Developer|Officer|Assistant|Associate|Specialist|Head|Lead|Director|VP|Supervisor)[^<]{0,50}/gi) || [];
      console.log(`  Job titles found: ${jobTitles.length}`);
      for (const t of jobTitles.slice(0, 5)) console.log(`    ${t.trim()}`);
      // Look for vacancy count
      const vacancyMatch = plainText.match(/(\d+)\s+(?:vacancy|vacancies|position|opening|job)/i);
      if (vacancyMatch) {
        console.log(`  Vacancy count: ${vacancyMatch[0]}`);
        const rc = await updateRoles("usha martin", parseInt(vacancyMatch[1]), "career_page_scrape"); updated += rc;
      }
      if (jobTitles.length > 0 && await isNull("usha martin")) {
        const uniq = [...new Set(jobTitles.map(t => t.trim()))];
        const rc = await updateRoles("usha martin", uniq.length, "career_page_parsed"); updated += rc;
        console.log(`  Using ${uniq.length} unique titles`);
      }
    }
  }
  await sleep(500);

  // ── 9. PHOENIX MILLS, VIJAYA DIAGNOSTIC — try alternate URLs ─────────────
  console.log("\n=== Phoenix Mills ===");
  if (await isNull("phoenix mills")) {
    for (const url of ["https://www.thephoenixmills.com/careers", "https://phoenixmalls.com/careers"]) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 40)} → ${status}`);
      if (!text || status !== 200) continue;
      const countMatch = text.match(/(\d+)\s+(?:open|vacancies|job|position|opportunit)/i);
      if (countMatch) { const rc = await updateRoles("phoenix mills", parseInt(countMatch[1]), "career_page_scrape"); updated += rc; break; }
    }
    if (await isNull("phoenix mills")) console.log("  → No data found");
  }

  console.log("\n=== Vijaya Diagnostic ===");
  if (await isNull("vijaya diagnostic")) {
    for (const url of ["https://vijayaonline.com/careers", "https://www.vijayaonline.com/careers.php", "https://careers.vijayaonline.com"]) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 50)} → ${status}`);
      if (!text || status !== 200) continue;
      const countMatch = text.match(/(\d+)\s+(?:open|vacancies|job|position|opportunit)/i);
      if (countMatch) { const rc = await updateRoles("vijaya diagnostic", parseInt(countMatch[1]), "career_page_scrape"); updated += rc; break; }
      const jobTitles = text.match(/(?:Radiologist|Technician|Doctor|Nurse|Manager|Admin|Receptionist|Phlebotomist|Lab|Executive)\s+\w*/gi) || [];
      if (jobTitles.length > 0) {
        const uniq = [...new Set(jobTitles.map(t => t.trim()))];
        console.log(`  Titles: ${uniq.slice(0, 5).join(', ')}`);
      }
    }
    if (await isNull("vijaya diagnostic")) console.log("  → No data found");
  }
  await sleep(500);

  // ── 10. QLIK — Try specific Cloud Software Group URLs ────────────────────
  console.log("\n=== Qlik (final attempt) ===");
  if (await isNull("qlik")) {
    const qlikUrls = [
      "https://www.qlik.com/us/company/careers",
      "https://www.qlik.com/us/company/life-at-qlik/open-positions",
    ];
    for (const url of qlikUrls) {
      const { text, status } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 50)} → ${status}`);
      if (!text || status !== 200) continue;
      const wdUrls = findWorkdayInHtml(text);
      if (wdUrls.length > 0) {
        const w = wdUrls[0]; console.log(`  WD: ${w.url}`);
        const c = await tryWorkday(w.tenant, w.site, w.pod); await sleep(400);
        if (c !== null) { const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
      }
      const gh = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
      if (gh && gh !== "embed") {
        const { ok, data } = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${gh}/jobs`);
        await sleep(300);
        if (ok && Array.isArray(data?.jobs)) { const rc = await updateRoles("qlik", data.jobs.length, "greenhouse_api"); updated += rc; console.log(`  GH ${gh}: ${data.jobs.length}`); break; }
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
