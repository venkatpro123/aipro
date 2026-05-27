// fix-workday-careers.mjs
// Carefully find and query the correct ATS for each remaining company
// Strategy: try multiple Workday tenant/site combos, Comeet, iCIMS, career pages

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Workday CXS POST API — try multiple wd numbers and site names
async function tryWorkday(tenant, site, wdNum) {
  try {
    const url = `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.total === "number" ? data.total : null;
  } catch { return null; }
}

async function tryWorkdayAll(tenant, sites, wdNums = ["1", "3", "5"]) {
  for (const wdNum of wdNums) {
    for (const site of sites) {
      const count = await tryWorkday(tenant, site, wdNum);
      await sleep(300);
      if (count !== null) return { count, tenant, site, wdNum };
    }
  }
  return null;
}

// Greenhouse
async function tryGreenhouse(token) {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`, {
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.jobs) ? data.jobs.length : null;
  } catch { return null; }
}

// Lever
async function tryLever(token) {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${token}?mode=json`, {
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data.length : null;
  } catch { return null; }
}

// iCIMS jobs count
async function tryICIMS(slug) {
  // iCIMS returns XML/JSON job listings
  const urls = [
    `https://careers-${slug}.icims.com/jobs/search?ss=1&searchCategory=&searchLocation=`,
    `https://jobs-${slug}.icims.com/jobs/search?ss=1`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "text/html,application/xhtml+xml,*/*", "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      // iCIMS embeds count in JSON in the HTML: "totalCount":N or "count":N
      const m = text.match(/"totalCount"\s*:\s*(\d+)/) || text.match(/(\d+)\s+jobs?\s+found/i)
               || text.match(/"count"\s*:\s*(\d+)/);
      if (m) return parseInt(m[1], 10);
    } catch { continue; }
  }
  return null;
}

// Comeet (Check Point uses this)
async function tryComeet(token) {
  try {
    const res = await fetch(`https://www.comeet.com/jobs/${token}`, {
      headers: { Accept: "application/json, text/html", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Comeet embeds job data in JSON: "positions":N or count
    const m = text.match(/"positions_count"\s*:\s*(\d+)/) || text.match(/(\d+)\s+open\s+positions?/i);
    if (m) return parseInt(m[1], 10);
    return null;
  } catch { return null; }
}

// Generic career page HTML scrape — count job-like elements
async function scrapeCareerPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (!res.ok) return { status: res.status, count: null };
    const text = await res.text();
    // Look for common job count patterns
    const patterns = [
      /"total"\s*:\s*(\d+)/,
      /"totalJobs"\s*:\s*(\d+)/,
      /"jobCount"\s*:\s*(\d+)/,
      /"count"\s*:\s*(\d+)/,
      /(\d+)\s+(?:open\s+)?(?:job|position|opportunit|vacancies|role)/i,
      /(?:showing|found|view)\s+(\d+)\s+(?:job|position|opportunit)/i,
      /"totalFound"\s*:\s*(\d+)/,
      /"total_count"\s*:\s*(\d+)/,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m && parseInt(m[1], 10) > 0) {
        return { status: 200, count: parseInt(m[1], 10), url: res.url };
      }
    }
    return { status: 200, count: null, urlFinal: res.url, snippet: text.slice(0, 200) };
  } catch (e) { return { status: "err", count: null, error: e.message }; }
}

async function updateRoles(canonicalName, openRoles, source) {
  const velocityScore = openRoles > 1000 ? 1.5 : openRoles > 500 ? 1.0 : openRoles > 100 ? 0.5 : openRoles > 0 ? 0.1 : -0.5;
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence
     SET total_open_roles = $2, hiring_source = $3,
         hiring_verified_at = NOW(), hiring_confidence = 0.88,
         hiring_velocity_score = $4, updated_at = NOW()
     WHERE canonical_name = $1`,
    [canonicalName, openRoles, source, velocityScore]
  );
  return rowCount ?? 0;
}

async function isNull(cn) {
  const { rows } = await db.query(
    `SELECT total_open_roles FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]
  );
  return rows[0]?.total_open_roles === null || rows[0]?.total_open_roles === undefined;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. Vanguard — Workday ──────────────────────────────────────────────────
  // One of largest US investment firms, 20,000+ employees, definitely hiring
  console.log("--- Vanguard ---");
  {
    const cn = "vanguard";
    // Known: vanguardjobs.com → Workday. Try multiple site names
    const result = await tryWorkdayAll("vanguard", [
      "VanguardCareers", "Vanguard_Careers", "VanguardInternational",
      "VanguardJobsSite", "external", "Vanguard", "VanguardGroup", "careers"
    ]);
    if (result) {
      const rc = await updateRoles(cn, result.count, "workday_careers");
      updated += rc;
      console.log(`  ✓ ${result.count} jobs [wd${result.wdNum}:${result.tenant}/${result.site}]`);
    } else {
      // Try scraping vanguardjobs.com
      const page = await scrapeCareerPage("https://www.vanguardjobs.com");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) {
        const rc = await updateRoles(cn, page.count, "career_page_scrape");
        updated += rc;
        console.log(`  ✓ ${page.count} jobs [career page]`);
      } else {
        console.log(`  Snippet: ${page.snippet || ''}`);
      }
    }
  }
  await sleep(700);

  // ── 2. Vertex Pharmaceuticals — Workday ───────────────────────────────────
  // 4,500+ employees, biotech, definitely hiring
  console.log("\n--- Vertex Pharmaceuticals ---");
  {
    const cn = "vertex pharmaceuticals";
    const result = await tryWorkdayAll("vrtx", [
      "vertex_careers", "Vertex_Careers", "VertexCareers", "vertex",
      "Vertex", "VertexPharmaceuticals", "external", "careers"
    ]);
    if (result) {
      const rc = await updateRoles(cn, result.count, "workday_careers");
      updated += rc;
      console.log(`  ✓ ${result.count} jobs [wd${result.wdNum}:${result.tenant}/${result.site}]`);
    } else {
      const page = await scrapeCareerPage("https://www.vrtx.com/careers");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles(cn, page.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // ── 3. Align Technology — Workday ─────────────────────────────────────────
  // 25,000+ employees, dental company (Invisalign)
  console.log("\n--- Align Technology ---");
  {
    const cn = "align technology";
    const result = await tryWorkdayAll("aligntech", [
      "AlignTechnology", "Align_Technology", "Align", "AlignTech",
      "external", "careers", "AlignTechnologyCareers"
    ]);
    if (result) {
      const rc = await updateRoles(cn, result.count, "workday_careers");
      updated += rc;
      console.log(`  ✓ ${result.count} jobs [wd${result.wdNum}:${result.tenant}/${result.site}]`);
    } else {
      const page = await scrapeCareerPage("https://www.aligntech.com/en/careers");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles(cn, page.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // ── 4. Insulet Corporation — Workday / iCIMS ──────────────────────────────
  // 5,500+ employees, OmniPod insulin pump maker
  console.log("\n--- Insulet ---");
  {
    const cn = "insulet";
    const result = await tryWorkdayAll("insulet", [
      "Insulet", "InsuletCorporation", "Insulet_Careers", "external", "careers"
    ]);
    if (result) {
      const rc = await updateRoles(cn, result.count, "workday_careers");
      updated += rc;
      console.log(`  ✓ ${result.count} jobs [workday]`);
    } else {
      // Try iCIMS
      for (const slug of ["insulet", "insuletcorporation", "insulet-corp"]) {
        const count = await tryICIMS(slug);
        await sleep(400);
        if (count !== null) {
          const rc = await updateRoles(cn, count, "icims_careers");
          updated += rc;
          console.log(`  ✓ ${count} jobs [icims:${slug}]`);
          break;
        }
      }
      const page = await scrapeCareerPage("https://www.insulet.com/careers");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles(cn, page.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // ── 5. Masimo — Workday ───────────────────────────────────────────────────
  // 7,900+ employees, medical device (pulse oximetry)
  console.log("\n--- Masimo ---");
  {
    const cn = "masimo";
    const result = await tryWorkdayAll("masimo", [
      "Masimo", "MasimoCorp", "Masimo_Careers", "MasimoCareers", "external", "careers"
    ]);
    if (result) {
      const rc = await updateRoles(cn, result.count, "workday_careers");
      updated += rc;
      console.log(`  ✓ ${result.count} jobs [workday]`);
    } else {
      const page = await scrapeCareerPage("https://jobs.masimo.com");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles(cn, page.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // ── 6. Alnylam Pharmaceuticals — Workday ──────────────────────────────────
  // 2,400+ employees, RNA therapeutics
  console.log("\n--- Alnylam Pharmaceuticals ---");
  {
    const cn = "alnylam pharmaceuticals";
    const result = await tryWorkdayAll("alnylam", [
      "Alnylam", "Alnylam_Careers", "AlnylamCareers",
      "Alnylam_Pharmaceuticals", "external", "careers"
    ]);
    if (result) {
      const rc = await updateRoles(cn, result.count, "workday_careers");
      updated += rc;
      console.log(`  ✓ ${result.count} jobs [workday]`);
    } else {
      const page = await scrapeCareerPage("https://www.alnylam.com/careers/");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles(cn, page.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // ── 7. Certara — Workday / Greenhouse ─────────────────────────────────────
  // 1,500+ employees, pharma software
  console.log("\n--- Certara ---");
  {
    const cn = "certara";
    const wdResult = await tryWorkdayAll("certara", [
      "Certara", "Certara_Careers", "CertaraCareers", "external", "careers"
    ]);
    if (wdResult) {
      const rc = await updateRoles(cn, wdResult.count, "workday_careers");
      updated += rc;
      console.log(`  ✓ ${wdResult.count} jobs [workday]`);
    } else {
      // Try Greenhouse
      for (const token of ["certara", "certarainc", "certara-inc"]) {
        const count = await tryGreenhouse(token);
        await sleep(400);
        if (count !== null) {
          const rc = await updateRoles(cn, count, "greenhouse_api");
          updated += rc;
          console.log(`  ✓ ${count} jobs [greenhouse:${token}]`);
          break;
        }
      }
    }
  }
  await sleep(700);

  // ── 8. Qlik — Greenhouse / Lever ──────────────────────────────────────────
  // 3,500+ employees, data analytics (acquired by Francisco Partners)
  console.log("\n--- Qlik ---");
  if (await isNull("qlik")) {
    for (const token of ["qlik", "qliktech", "qlik-technologies"]) {
      const count = await tryGreenhouse(token);
      await sleep(400);
      if (count !== null) {
        const rc = await updateRoles("qlik", count, "greenhouse_api");
        updated += rc;
        console.log(`  ✓ ${count} jobs [greenhouse:${token}]`);
        break;
      }
    }
    for (const token of ["qlik", "qliktech"]) {
      const c2 = await tryLever(token); await sleep(400);
      if (c2 !== null) {
        const rc = await updateRoles("qlik", c2, "lever_api"); updated += rc;
        console.log(`  ✓ ${c2} jobs [lever:${token}]`); break;
      }
    }
    // Try their Ashby board
    try {
      const res = await fetch("https://api.ashbyhq.com/posting-api/job-board/qlik", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data.jobPostings) ? data.jobPostings.length : null;
        if (count !== null) { const rc = await updateRoles("qlik", count, "ashby_api"); updated += rc; console.log(`  ✓ ${count} jobs [ashby:qlik]`); }
      }
    } catch {}
    // Try scraping
    const page = await scrapeCareerPage("https://www.qlik.com/us/company/careers");
    console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
    if (page.count !== null && await isNull("qlik")) {
      const rc = await updateRoles("qlik", page.count, "career_page_scrape"); updated += rc;
    }
  }
  await sleep(700);

  // ── 9. Equinor — Workday ──────────────────────────────────────────────────
  // 21,000+ employees, Norwegian oil & gas
  console.log("\n--- Equinor ---");
  {
    const cn = "equinor";
    const result = await tryWorkdayAll("equinor", [
      "Equinor", "EquinorCareers", "Equinor_Careers", "external",
      "EquinorASA", "Equinor_Jobs", "careers"
    ]);
    if (result) {
      const rc = await updateRoles(cn, result.count, "workday_careers");
      updated += rc;
      console.log(`  ✓ ${result.count} jobs [workday]`);
    } else {
      const page = await scrapeCareerPage("https://www.equinor.com/careers/vacancies");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles(cn, page.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // ── 10. Check Point Software — Comeet / career page ───────────────────────
  // 6,000+ employees, cybersecurity
  console.log("\n--- Check Point ---");
  if (await isNull("check point")) {
    // Check Point uses Comeet ATS (jobs.checkpoint.com)
    const comeetCount = await tryComeet("check-point");
    await sleep(400);
    if (comeetCount !== null) {
      const rc = await updateRoles("check point", comeetCount, "comeet_careers"); updated += rc;
      console.log(`  ✓ ${comeetCount} jobs [comeet]`);
    }
    // Try their Greenhouse
    for (const token of ["checkpoint", "check-point", "checkpointsoftware"]) {
      const c = await tryGreenhouse(token); await sleep(400);
      if (c !== null && await isNull("check point")) {
        const rc = await updateRoles("check point", c, "greenhouse_api"); updated += rc;
        console.log(`  ✓ ${c} jobs [greenhouse:${token}]`); break;
      }
    }
    // Try career page
    if (await isNull("check point")) {
      const page = await scrapeCareerPage("https://jobs.checkpoint.com");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles("check point", page.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // ── 11. BBVA — Workday / career page ──────────────────────────────────────
  // 80,000+ employees, global bank
  console.log("\n--- BBVA ---");
  if (await isNull("bbva")) {
    const result = await tryWorkdayAll("bbva", [
      "BBVA", "BBVACareers", "BBVA_Careers", "BBVAGlobalCareers", "external", "careers"
    ]);
    if (result) {
      const rc = await updateRoles("bbva", result.count, "workday_careers"); updated += rc;
      console.log(`  ✓ ${result.count} jobs [workday]`);
    }
    if (await isNull("bbva")) {
      const page = await scrapeCareerPage("https://www.bbvajobs.com");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles("bbva", page.count, "career_page_scrape"); updated += rc; }
    }
    if (await isNull("bbva")) {
      const page2 = await scrapeCareerPage("https://careers.bbva.com");
      console.log(`  BBVA careers: status=${page2.status} count=${page2.count} url=${page2.urlFinal || ''}`);
      if (page2.count !== null) { const rc = await updateRoles("bbva", page2.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // ── 12. Noom — Greenhouse / career page ───────────────────────────────────
  // Health app, had layoffs but still operating
  console.log("\n--- Noom ---");
  if (await isNull("noom")) {
    for (const token of ["noom", "noom-inc", "noomhealth", "noominc"]) {
      const c = await tryGreenhouse(token); await sleep(400);
      if (c !== null) { const rc = await updateRoles("noom", c, "greenhouse_api"); updated += rc; console.log(`  ✓ ${c} jobs [greenhouse:${token}]`); break; }
    }
    if (await isNull("noom")) {
      const wd = await tryWorkdayAll("noom", ["Noom", "NoomCareers", "external"]);
      if (wd) { const rc = await updateRoles("noom", wd.count, "workday_careers"); updated += rc; console.log(`  ✓ ${wd.count} jobs [workday]`); }
    }
    if (await isNull("noom")) {
      const page = await scrapeCareerPage("https://www.noom.com/careers/");
      console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles("noom", page.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // ── 13. Penumbra — Workday ─────────────────────────────────────────────────
  // Medical device (neurovascular) — 2,500+ employees
  console.log("\n--- Penumbra ---");
  if (await isNull("penumbra")) {
    const result = await tryWorkdayAll("penumbra", [
      "Penumbra", "PenumbraInc", "Penumbra_Inc", "PenumbraCareers",
      "Penumbra_Careers", "external", "careers"
    ]);
    if (result) {
      const rc = await updateRoles("penumbra", result.count, "workday_careers"); updated += rc;
      console.log(`  ✓ ${result.count} jobs [workday]`);
    } else {
      for (const token of ["penumbra", "penumbrainc", "penumbra-inc"]) {
        const c = await tryGreenhouse(token); await sleep(400);
        if (c !== null) { const rc = await updateRoles("penumbra", c, "greenhouse_api"); updated += rc; console.log(`  ✓ ${c} jobs [greenhouse:${token}]`); break; }
      }
      if (await isNull("penumbra")) {
        const page = await scrapeCareerPage("https://www.penumbrainc.com/careers");
        console.log(`  Career page: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
        if (page.count !== null) { const rc = await updateRoles("penumbra", page.count, "career_page_scrape"); updated += rc; }
      }
    }
  }
  await sleep(700);

  // ── 14. WNS Global — iCIMS ────────────────────────────────────────────────
  // 44,000+ employees, BPO company listed on NYSE
  console.log("\n--- WNS Global ---");
  if (await isNull("wns global")) {
    for (const slug of ["wns", "wns-global", "wnsglobal", "wns-holdings"]) {
      const c = await tryICIMS(slug); await sleep(500);
      if (c !== null) { const rc = await updateRoles("wns global", c, "icims_careers"); updated += rc; console.log(`  ✓ ${c} jobs [icims:${slug}]`); break; }
    }
    if (await isNull("wns global")) {
      // Try Greenhouse
      for (const token of ["wns", "wnsglobal"]) {
        const c = await tryGreenhouse(token); await sleep(400);
        if (c !== null) { const rc = await updateRoles("wns global", c, "greenhouse_api"); updated += rc; console.log(`  ✓ ${c} jobs [greenhouse:${token}]`); break; }
      }
    }
    if (await isNull("wns global")) {
      const page = await scrapeCareerPage("https://www.wns.com/careers");
      console.log(`  WNS career: status=${page.status} count=${page.count} url=${page.urlFinal || ''}`);
      if (page.count !== null) { const rc = await updateRoles("wns global", page.count, "career_page_scrape"); updated += rc; }
    }
  }
  await sleep(700);

  // Final summary
  const { rows: s } = await db.query(`
    SELECT count(*) AS total, count(total_open_roles) AS has_roles,
      count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null
    FROM verified_company_intelligence
  `);
  const { rows: nulls } = await db.query(`
    SELECT canonical_name, country_code, display_name
    FROM verified_company_intelligence
    WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name
  `);
  await db.end();

  console.log(`\n=== STATE AFTER WORKDAY/CAREERS ROUND ===`);
  console.log(`Updated: ${updated} | Has roles: ${s[0].has_roles}/${s[0].total} | NULL: ${s[0].still_null}\n`);
  for (const r of nulls) {
    console.log(`  [${r.country_code}] ${r.canonical_name} — ${r.display_name}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
