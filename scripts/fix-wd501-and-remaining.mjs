// fix-wd501-and-remaining.mjs
// 1. Try Workday pod 501 (and other non-standard pods) for all remaining companies
// 2. Insert confirmed Check Point 181 after re-verifying
// 3. Investigate Noom, Certara, Align Technology, Alnylam, Vanguard career pages
// 4. Try Insulet, Masimo, Qlik with expanded discovery

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

async function tryWorkdayPod(tenant, site, podNum) {
  try {
    const url = `https://${tenant}.wd${podNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.total === "number" ? data.total : null;
  } catch { return null; }
}

// Try a tenant across ALL common pod numbers and multiple site names
async function discoverWorkday(tenant, sites) {
  const pods = ["1", "3", "5", "101", "201", "301", "401", "501", "601", "701", "2", "4", "6", "102", "502"];
  for (const pod of pods) {
    for (const site of sites) {
      const count = await tryWorkdayPod(tenant, site, pod);
      await sleep(200);
      if (count !== null) return { count, pod, site };
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

// Ashby
async function tryAshby(token) {
  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${token}`, {
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.jobPostings) ? data.jobPostings.length : null;
  } catch { return null; }
}

function extractWorkdayUrl(html) {
  const re = /https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/gi;
  const found = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    found.push({ tenant: m[1], pod: m[2], site: m[3], url: m[0] });
  }
  return found;
}

function extractJobCount(html) {
  const patterns = [
    /(\d+)\s+(?:open\s+)?(?:position|job|role|opening)/i,
    /"total"\s*:\s*(\d+)/,
    /"totalJobs"\s*:\s*(\d+)/,
    /"jobCount"\s*:\s*(\d+)/,
    /"num_active_postings"\s*:\s*(\d+)/,
    /(\d{1,4})\s+(?:current|active|available)\s+(?:job|position|opening)/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 0 && n < 100000) return { count: n, pattern: p.source };
    }
  }
  return null;
}

async function updateRoles(cn, count, source) {
  const vel = count > 1000 ? 1.5 : count > 500 ? 1.0 : count > 100 ? 0.5 : count > 0 ? 0.1 : -0.5;
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence
     SET total_open_roles = $2, hiring_source = $3,
         hiring_verified_at = NOW(), hiring_confidence = 0.88,
         hiring_velocity_score = $4, updated_at = NOW()
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

  // ── 1. Check Point — verify and insert 181 ────────────────────────────────
  // checkpoint.com/careers showed "181 job" in text (not from CSS)
  if (await isNull("check point")) {
    const { text, status } = await fetchText("https://www.checkpoint.com/careers/");
    console.log("Check Point career page: HTTP", status);
    if (text) {
      // Find all instances of "NNN job" or "NNN position"
      const jobMatches = [...text.matchAll(/(\d+)\s+(?:open\s+)?(?:position|job|role|opening)/gi)];
      console.log("  Job count mentions:", jobMatches.map(m => m[0]).join(", "));
      // Also try to find JSON job data
      const jsonMatch = text.match(/"count"\s*:\s*(\d+)/);
      if (jsonMatch) console.log("  JSON count:", jsonMatch[1]);
      // Try Workday in HTML
      const wdUrls = extractWorkdayUrl(text);
      if (wdUrls.length > 0) {
        console.log("  Workday URLs:", wdUrls.map(u => u.url).join(", "));
        const first = wdUrls[0];
        const wdCount = await tryWorkdayPod(first.tenant, first.site, first.pod);
        await sleep(400);
        if (wdCount !== null) {
          console.log(`  Workday API: ${wdCount} jobs`);
          const rc = await updateRoles("check point", wdCount, "workday_careers");
          updated += rc;
        }
      }
      // If not found via Workday, use the 181 if it's the only job count
      if (await isNull("check point") && jobMatches.length > 0) {
        const counts = jobMatches.map(m => parseInt(m[1])).filter(n => n > 0 && n < 10000);
        if (counts.length > 0) {
          const count = Math.max(...counts);
          console.log(`  Using career page count: ${count}`);
          const rc = await updateRoles("check point", count, "career_page_checkpoint");
          updated += rc;
        }
      }
    }
  }
  await sleep(600);

  // ── 2. Certara — scrape their career page properly ────────────────────────
  if (await isNull("certara")) {
    console.log("\nCertara:");
    const { text, status, finalUrl } = await fetchText("https://careers.certara.com/");
    console.log(`  careers.certara.com → HTTP ${status} → ${finalUrl}`);
    if (text) {
      // 3544 was from job ID 18013544 — not the job count
      // Look for actual job count patterns in a smarter way
      const wdUrls = extractWorkdayUrl(text);
      if (wdUrls.length > 0) {
        console.log("  Workday URLs:", wdUrls.map(u => u.url).join(", "));
        for (const wd of wdUrls) {
          const wdCount = await tryWorkdayPod(wd.tenant, wd.site, wd.pod);
          await sleep(400);
          if (wdCount !== null) {
            console.log(`  Workday API: ${wdCount} jobs`);
            const rc = await updateRoles("certara", wdCount, "workday_careers");
            updated += rc;
            break;
          }
        }
      }
      // Try extracting job count from the page
      const jobRef = extractJobCount(text);
      if (jobRef && await isNull("certara")) {
        console.log(`  Job count from page: ${jobRef.count} (pattern: ${jobRef.pattern})`);
        const rc = await updateRoles("certara", jobRef.count, "career_page_scrape");
        updated += rc;
      }
      // Check for ATS tokens
      const gh = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
      const lv = text.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/)?.[1];
      if (gh) { console.log(`  Greenhouse: ${gh}`); const c = await tryGreenhouse(gh); await sleep(300); if (c !== null && await isNull("certara")) { const rc = await updateRoles("certara", c, "greenhouse_api"); updated += rc; } }
      if (lv) { console.log(`  Lever: ${lv}`); const c = await tryLever(lv); await sleep(300); if (c !== null && await isNull("certara")) { const rc = await updateRoles("certara", c, "lever_api"); updated += rc; } }
    }
    // Try wd501 directly
    if (await isNull("certara")) {
      const result = await discoverWorkday("certara", ["Certara", "Certara_Careers", "CertaraCareers", "external", "careers"]);
      if (result) {
        console.log(`  Workday discovered [wd${result.pod}/${result.site}]: ${result.count}`);
        const rc = await updateRoles("certara", result.count, "workday_careers");
        updated += rc;
      }
    }
  }
  await sleep(600);

  // ── 3. Align Technology — extract Workday from jobs.aligntech.com ─────────
  if (await isNull("align technology")) {
    console.log("\nAlign Technology:");
    // The page loaded as JS app — need to look for script src or config that reveals ATS
    const { text, status } = await fetchText("https://jobs.aligntech.com");
    if (text && status === 200) {
      const wdUrls = extractWorkdayUrl(text);
      console.log(`  WD URLs: ${wdUrls.length > 0 ? wdUrls.map(u => u.url).join(', ') : 'none'}`);
      // Try to find any API base URL or tenant reference
      const tenantMatch = text.match(/["']tenant["']\s*:\s*["']([^"']+)["']/i)
                       || text.match(/tenantId\s*=\s*["']([^"']+)["']/i);
      if (tenantMatch) console.log(`  Tenant: ${tenantMatch[1]}`);
    }
    // Try discoverWorkday with multiple tenants
    for (const tenant of ["aligntech", "align", "aligntechnology"]) {
      const result = await discoverWorkday(tenant, ["AlignTechnology", "Align", "AlignTech", "external", "careers"]);
      if (result) {
        console.log(`  Workday [${tenant}.wd${result.pod}/${result.site}]: ${result.count}`);
        const rc = await updateRoles("align technology", result.count, "workday_careers");
        updated += rc;
        break;
      }
    }
    if (await isNull("align technology")) {
      // Try their Greenhouse/Lever
      for (const t of ["align-technology", "aligntechnology", "align"]) {
        const c = await tryGreenhouse(t); await sleep(300);
        if (c !== null) { const rc = await updateRoles("align technology", c, "greenhouse_api"); updated += rc; console.log(`  Greenhouse [${t}]: ${c}`); break; }
      }
    }
  }
  await sleep(600);

  // ── 4. Alnylam — fetch jobs.alnylam.com for ATS info ─────────────────────
  if (await isNull("alnylam pharmaceuticals")) {
    console.log("\nAlnylam Pharmaceuticals:");
    // Try fetching the jobs list page directly
    const { text, status, finalUrl } = await fetchText("https://jobs.alnylam.com/careers");
    console.log(`  HTTP ${status} → ${finalUrl}`);
    if (text && status === 200) {
      const wdUrls = extractWorkdayUrl(text);
      console.log(`  WD URLs: ${wdUrls.length > 0 ? wdUrls.map(u => u.url).join(', ') : 'none'}`);
      // Look for job count
      const jobRef = extractJobCount(text);
      if (jobRef) console.log(`  Count: ${jobRef.count} (${jobRef.pattern})`);
      // Look for ATS tokens
      const gh = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
      if (gh) { console.log(`  Greenhouse: ${gh}`); const c = await tryGreenhouse(gh); await sleep(300); if (c !== null) { const rc = await updateRoles("alnylam pharmaceuticals", c, "greenhouse_api"); updated += rc; } }
    }
    // Try Workday pod discovery
    if (await isNull("alnylam pharmaceuticals")) {
      const result = await discoverWorkday("alnylam", ["Alnylam", "Alnylam_Careers", "AlnylamCareers", "external", "careers"]);
      if (result) {
        console.log(`  Workday [wd${result.pod}/${result.site}]: ${result.count}`);
        const rc = await updateRoles("alnylam pharmaceuticals", result.count, "workday_careers");
        updated += rc;
      }
    }
    // Try Ashby, Lever, Greenhouse
    if (await isNull("alnylam pharmaceuticals")) {
      for (const fn of [
        () => tryAshby("alnylam").then(c => c !== null ? { c, src: "ashby" } : null),
        () => tryLever("alnylam").then(c => c !== null ? { c, src: "lever" } : null),
        () => tryLever("alnylam-pharmaceuticals").then(c => c !== null ? { c, src: "lever" } : null),
      ]) {
        const res = await fn(); await sleep(300);
        if (res) { const rc = await updateRoles("alnylam pharmaceuticals", res.c, res.src + "_api"); updated += rc; console.log(`  ${res.src}: ${res.c}`); break; }
      }
    }
  }
  await sleep(600);

  // ── 5. Vanguard — try wd501 and other pods ────────────────────────────────
  if (await isNull("vanguard")) {
    console.log("\nVanguard:");
    const result = await discoverWorkday("vanguard", [
      "VanguardCareers", "Vanguard_Careers", "VanguardInternational",
      "VanguardJobsSite", "external", "Vanguard", "VanguardGroup", "careers",
      "VanguardCareerSite", "vanguard_careers", "VanguardUS"
    ]);
    if (result) {
      console.log(`  Workday [wd${result.pod}/${result.site}]: ${result.count}`);
      const rc = await updateRoles("vanguard", result.count, "workday_careers");
      updated += rc;
    } else {
      // Try fetching their actual career page with different accept headers
      const { text, status } = await fetchText("https://www.vanguardjobs.com/search-jobs");
      console.log(`  /search-jobs: HTTP ${status}`);
      if (text && status === 200) {
        const jobRef = extractJobCount(text);
        if (jobRef) { console.log(`  Count: ${jobRef.count}`); const rc = await updateRoles("vanguard", jobRef.count, "career_page_vanguardjobs"); updated += rc; }
        const wdUrls = extractWorkdayUrl(text);
        if (wdUrls.length > 0) console.log(`  WD: ${wdUrls[0].url}`);
      }
    }
  }
  await sleep(600);

  // ── 6. Masimo — blocked by Cloudflare, try Workday discovery ─────────────
  if (await isNull("masimo")) {
    console.log("\nMasimo (Cloudflare-blocked career page, trying Workday):");
    const result = await discoverWorkday("masimo", [
      "Masimo", "MasimoCareers", "Masimo_Careers", "MasimoCorp", "external", "careers"
    ]);
    if (result) {
      console.log(`  Workday [wd${result.pod}/${result.site}]: ${result.count}`);
      const rc = await updateRoles("masimo", result.count, "workday_careers");
      updated += rc;
    }
    // Try ATS alternatives
    if (await isNull("masimo")) {
      for (const [fn, src] of [
        [() => tryGreenhouse("masimo"), "greenhouse"],
        [() => tryLever("masimo"), "lever"],
        [() => tryAshby("masimo"), "ashby"],
        [() => tryGreenhouse("masimo-corporation"), "greenhouse"],
        [() => tryLever("masimo-corporation"), "lever"],
      ]) {
        const c = await fn(); await sleep(300);
        if (c !== null) { const rc = await updateRoles("masimo", c, src + "_api"); updated += rc; console.log(`  ${src}: ${c}`); break; }
      }
    }
  }
  await sleep(600);

  // ── 7. Insulet — try all approaches ──────────────────────────────────────
  if (await isNull("insulet")) {
    console.log("\nInsulet:");
    const result = await discoverWorkday("insulet", [
      "Insulet", "InsuletCorporation", "Insulet_Careers", "InsuletCorp", "external", "careers", "insulet"
    ]);
    if (result) {
      console.log(`  Workday [wd${result.pod}/${result.site}]: ${result.count}`);
      const rc = await updateRoles("insulet", result.count, "workday_careers");
      updated += rc;
    }
    if (await isNull("insulet")) {
      // Try career page: omnipod.com parent, insulet brand
      for (const url of ["https://www.insulet.com/en-US/about-us/careers", "https://careers.insulet.com/us/en/home"]) {
        const { text, status } = await fetchText(url);
        console.log(`  ${url} → HTTP ${status}`);
        if (text && status === 200) {
          const wdUrls = extractWorkdayUrl(text);
          if (wdUrls.length > 0) {
            const w = wdUrls[0];
            const c = await tryWorkdayPod(w.tenant, w.site, w.pod);
            await sleep(400);
            if (c !== null) { const rc = await updateRoles("insulet", c, "workday_careers"); updated += rc; console.log(`  Workday: ${c}`); break; }
          }
        }
        await sleep(400);
      }
    }
    if (await isNull("insulet")) {
      for (const [fn, src, t] of [
        [() => tryGreenhouse("insulet"), "greenhouse", "insulet"],
        [() => tryLever("insulet"), "lever", "insulet"],
        [() => tryLever("insulet-corporation"), "lever", "insulet-corporation"],
        [() => tryAshby("insulet"), "ashby", "insulet"],
      ]) {
        const c = await fn(); await sleep(300);
        if (c !== null) { const rc = await updateRoles("insulet", c, src + "_api"); updated += rc; console.log(`  ${src}[${t}]: ${c}`); break; }
      }
    }
  }
  await sleep(600);

  // ── 8. Qlik — try with new company identity (Cloud Software Group) ────────
  if (await isNull("qlik")) {
    console.log("\nQlik (now part of Cloud Software Group):");
    // Qlik merged with Talend to become Cloud Software Group in 2023
    // They may use Workday under "cloudsoftwaregroup" or still "qlik"
    for (const tenant of ["qlik", "cloudsoftwaregroup", "talend", "qliktech"]) {
      const result = await discoverWorkday(tenant, ["Qlik", "CloudSoftwareGroup", "external", "careers"]);
      if (result) {
        console.log(`  Workday [${tenant}.wd${result.pod}/${result.site}]: ${result.count}`);
        const rc = await updateRoles("qlik", result.count, "workday_careers");
        updated += rc;
        break;
      }
    }
    if (await isNull("qlik")) {
      // Try their job boards
      const urls = [
        "https://jobs.qlik.com",
        "https://www.qlik.com/us/about-qlik/careers",
        "https://careers.cloudsoftwaregroup.com",
      ];
      for (const url of urls) {
        const { text, status, finalUrl } = await fetchText(url);
        console.log(`  ${url} → HTTP ${status} → ${finalUrl}`);
        if (text && status === 200) {
          const wdUrls = extractWorkdayUrl(text);
          if (wdUrls.length > 0) {
            const w = wdUrls[0];
            console.log(`  Found WD: ${w.url}`);
            const c = await tryWorkdayPod(w.tenant, w.site, w.pod);
            await sleep(400);
            if (c !== null) { const rc = await updateRoles("qlik", c, "workday_careers"); updated += rc; break; }
          }
          const jobRef = extractJobCount(text);
          if (jobRef && await isNull("qlik")) {
            console.log(`  Count: ${jobRef.count}`);
            const rc = await updateRoles("qlik", jobRef.count, "career_page_scrape"); updated += rc; break;
          }
          for (const [fn, src] of [[() => tryGreenhouse(text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1]), "greenhouse"]]) {
            const tok = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
            if (tok) { const c = await tryGreenhouse(tok); await sleep(300); if (c !== null && await isNull("qlik")) { const rc = await updateRoles("qlik", c, "greenhouse_api"); updated += rc; break; } }
          }
        }
        await sleep(400);
      }
    }
    // Last resort: Ashby, Lever
    if (await isNull("qlik")) {
      for (const [fn, src] of [
        [() => tryAshby("qlik"), "ashby"],
        [() => tryLever("qlik"), "lever"],
        [() => tryGreenhouse("qlik"), "greenhouse"],
      ]) {
        const c = await fn(); await sleep(300);
        if (c !== null) { const rc = await updateRoles("qlik", c, src + "_api"); updated += rc; console.log(`  ${src}: ${c}`); break; }
      }
    }
  }
  await sleep(600);

  // ── 9. Noom — investigate the "1 job" result ──────────────────────────────
  if (await isNull("noom")) {
    console.log("\nNoom:");
    const { text, status, finalUrl } = await fetchText("https://www.noom.com/careers/job-listings/");
    console.log(`  HTTP ${status} → ${finalUrl}`);
    if (text && status === 200) {
      // Show more context
      const wdUrls = extractWorkdayUrl(text);
      const ghTok = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
      const lvTok = text.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/)?.[1];
      const ashbyTok = text.match(/jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/)?.[1];
      console.log(`  WD: ${wdUrls.length} | GH: ${ghTok || 'none'} | LV: ${lvTok || 'none'} | Ashby: ${ashbyTok || 'none'}`);
      // All job count mentions
      const jobMatches = [...text.matchAll(/(\d+)\s+(?:open\s+)?(?:position|job|role|opening)/gi)];
      if (jobMatches.length > 0) console.log(`  Job mentions: ${jobMatches.map(m => m[0]).join(', ')}`);
      if (ghTok && ghTok !== 'embed') {
        const c = await tryGreenhouse(ghTok); await sleep(300);
        if (c !== null) { const rc = await updateRoles("noom", c, "greenhouse_api"); updated += rc; console.log(`  Greenhouse[${ghTok}]: ${c}`); }
      }
      // Show page snippet for manual review
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 500);
      console.log(`  Page text: ${plain}`);
    }
    // Try more Greenhouse tokens for Noom
    if (await isNull("noom")) {
      for (const tok of ["noom-inc", "noomhealth", "noom-health", "noominc", "noom-weight", "noomcorp"]) {
        const c = await tryGreenhouse(tok); await sleep(300);
        if (c !== null) { const rc = await updateRoles("noom", c, "greenhouse_api"); updated += rc; console.log(`  GH[${tok}]: ${c}`); break; }
      }
    }
    // Try Ashby
    if (await isNull("noom")) {
      const c = await tryAshby("noom"); await sleep(300);
      if (c !== null) { const rc = await updateRoles("noom", c, "ashby_api"); updated += rc; console.log(`  Ashby[noom]: ${c}`); }
    }
  }
  await sleep(600);

  // ── 10. WNS Global — deeper investigation ────────────────────────────────
  if (await isNull("wns global")) {
    console.log("\nWNS Global (BPO, 44k employees):");
    const result = await discoverWorkday("wns", ["WNS", "WNSGlobal", "WNS_Careers", "external", "careers"]);
    if (result) {
      console.log(`  Workday [wd${result.pod}/${result.site}]: ${result.count}`);
      const rc = await updateRoles("wns global", result.count, "workday_careers");
      updated += rc;
    }
    if (await isNull("wns global")) {
      // Try their career portal URL more carefully
      for (const url of ["https://www.wns.com/careers/open-positions", "https://careers.wns.com"]) {
        const { text, status, finalUrl } = await fetchText(url);
        console.log(`  ${url} → HTTP ${status} → ${finalUrl}`);
        if (!text || status !== 200) { await sleep(300); continue; }
        const wdUrls = extractWorkdayUrl(text);
        if (wdUrls.length > 0) {
          const w = wdUrls[0]; const c = await tryWorkdayPod(w.tenant, w.site, w.pod);
          await sleep(400);
          if (c !== null) { const rc = await updateRoles("wns global", c, "workday_careers"); updated += rc; break; }
        }
        const jobRef = extractJobCount(text);
        if (jobRef && await isNull("wns global")) { const rc = await updateRoles("wns global", jobRef.count, "career_page_scrape"); updated += rc; break; }
        await sleep(400);
      }
    }
    if (await isNull("wns global")) {
      for (const [fn, src] of [
        [() => tryGreenhouse("wns"), "greenhouse"],
        [() => tryGreenhouse("wnsglobal"), "greenhouse"],
        [() => tryLever("wns"), "lever"],
        [() => tryAshby("wns"), "ashby"],
      ]) {
        const c = await fn(); await sleep(300);
        if (c !== null) { const rc = await updateRoles("wns global", c, src + "_api"); updated += rc; console.log(`  ${src}: ${c}`); break; }
      }
    }
  }

  // Final summary
  const { rows: s } = await db.query(`SELECT count(*) AS total, count(total_open_roles) AS has_roles, count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null FROM verified_company_intelligence`);
  const { rows: nulls } = await db.query(`SELECT canonical_name, country_code, display_name FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
  await db.end();
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name} — ${r.display_name}`);
}

main().catch(e => { console.error(e); process.exit(1); });
